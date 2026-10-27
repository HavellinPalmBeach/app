'use strict';
// The Evening Desk (2026-10-23; Anthony, 2026-10-22: "let's write a 'how to use the admin/inventory tab best practices
// document' (with a better name LOL) so ashley and I know how to use it. and embed a link at the top of the tab like the
// photography field guide"; he chose the name). `evening-desk-guide.html`, for Anthony and Ashley at a laptop in the evening,
// in the field guides' shape (Reporting an Incident's tokens and theme, a pocket card, plain words), linked at the top of the
// Job Admin & Inv tab through the one opener (openGuidePage, over the app, never a new tab) on every service and with no client
// chosen, and from the manual and the playbook.
//
// Each sentence on the page that the app makes true is held here to the code that makes it true (the photography guide's
// rule): the bars' titles off DESK_FOLDS, each bar's open rule and line driven through the real deskFoldState on the real
// readers, the Urgent strip's placements through deskNowLine, the earlier-days note, the phone's selection bar, Record the
// signed request, and every button the page names read from the source. A change to a desk label or rule goes red until the
// page is updated in the same commit. The shorthand group nets the build's words out of the page, as the other guides' do.

const fs = require('fs');
const path = require('path');
const { sandbox, source, fn, decl, domStub } = require('./harness');

const ROOT = path.join(__dirname, '..');
const PAGE = 'evening-desk-guide.html';
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SRC = source();
const count = (hay, needle) => String(hay).split(needle).length - 1;
// Comments off, strings kept: for the labels a person reads, which live in strings.
const code = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n');
// Comments off and strings blanked: for walking which functions and vars a function reaches.
const bare = (t) => code(t).replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
const NAMED = { nbsp: ' ', amp: '&', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', middot: '·', sect: '§', mdash: '—', ndash: '–', hellip: '…', rarr: '→', lt: '<', gt: '>', quot: '"' };
const decode = (s) => String(s).replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n)).replace(/&([a-z]+);/g, (m, n) => (NAMED[n] != null ? NAMED[n] : m));
const text = (html) => decode(String(html)
  .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' '))
  .replace(/\s+/g, ' ').replace(/\s+([,.;:)])/g, '$1').replace(/\(\s+/g, '(').trim();

// The functions and vars `roots` reach, `stop` naming what the test supplies (desk-layout.test.js's walk, so the readers a bar
// asks are the real ones, never a stub of a rule).
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
function closure(roots, stop) {
  const stopSet = new Set(stop || []);
  const fns = new Set(), vars = new Set();
  const queue = roots.map((r) => ['f', r]);
  while (queue.length) {
    const [k, name] = queue.shift();
    if (stopSet.has(name)) continue;
    let body;
    if (k === 'f') { if (fns.has(name)) continue; fns.add(name); try { body = bare(fn(name)); } catch (e) { continue; } }
    else { if (vars.has(name)) continue; vars.add(name); try { body = bare(decl(name)); } catch (e) { continue; } }
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
// A call that may throw on a reverted rule: the revert fails its assertions, never the file.
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }

// The four bars on the real deskFoldState and the real readers behind it, as desk-layout.test.js runs them.
const TODAY = '2026-10-23';
const T0 = Date.parse('2026-10-20T16:00:00Z');
const LINE = (id, o) => Object.assign({ stableId: id, label: 'inventory', collId: null, roomIdx: 0, status: 'uploaded', ts: T0, updatedAt: T0,
  objectName: 'Thing ' + id, category: 'Furniture', qty: 1 }, o || {});
const ESTATE = (o) => Object.assign({ id: 7, hvlId: 'HVL-0007', name: 'Ashworth', addr: '14 Seaspray Ave', svc: 'probate', status: 'active', won: true,
  matterType: 'probate', executor: 'Ruth Adler', executorEmail: 'ruth@adler.example', driveFolder: 'https://drive.google.com/drive/folders/R7',
  docState: {}, at: {}, payments: [] }, o || {});
const LIVING = (o) => Object.assign({ id: 7, hvlId: 'HVL-0007', name: 'Margaret Ellis', addr: '9 Dunbar Rd', svc: 'downsizing_move', status: 'active', won: true,
  email: 'meg@ellis.example', docTier: 'contents', driveFolder: 'https://drive.google.com/drive/folders/R7', docState: {}, at: {}, payments: [] }, o || {});
const BARS_STATE = ['jobs', '_photoRefs', 'estimateStore', 'jobPlanStore', 'vendorDirectory', 'SHEETS_SYNC_URL', '_invCloudSeen', '_invCloudFailed', 'document'];
let _barsCl = null;
function bars(job, rows, o) {
  o = o || {};
  _barsCl = _barsCl || closure(['deskFoldState', 'jobCloseBlockers'], BARS_STATE);
  const C = sandbox({ fns: _barsCl.fns, vars: _barsCl.vars, stubs: {
    jobs: [job], _photoRefs: { 7: rows }, estimateStore: { 7: { estimate: { svc: job.svc, rooms: [] } } }, jobPlanStore: {},
    vendorDirectory: [], SHEETS_SYNC_URL: o.url || '', _invCloudSeen: o.seen || {}, _invCloudFailed: o.failed || {}, document: domStub({}),
  } });
  const all = rows.filter((r) => !r.deletedAt);
  const at = (f) => { const r = attempt(() => C.deskFoldState(7, job, f, all, TODAY)); return r.ok ? r.val : { show: null, openByDefault: null, bits: [], err: r.err }; };
  const out = { releases: at('releases'), values: at('values'), closing: at('closing'), history: at('history') };
  out.line = (f) => out[f].bits.map((b) => b.text).join(' · ');
  out.tones = (f) => out[f].bits.map((b) => b.tone);
  return out;
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const html = read(PAGE), t = text(html);
  // The section of the page under one h2, as text and as markup.
  const sectionHtml = (h2) => { const a = html.indexOf('<h2>' + h2 + '</h2>'); return a < 0 ? '' : html.slice(a, html.indexOf('</section>', a)); };
  const sec = (h2) => text(sectionHtml(h2));

  // ═══ THE PAGE ═══
  group('the page: a guide in the field guides’ shape and theme, short, with a pocket card, naming its neighbours');
  {
    has(html, '<title>The Evening Desk &middot; Havellin Palm Beach</title>', 'titled');
    has(html, '<h1>The Evening Desk</h1>', 'headed');
    has(html, '<div class="wrap">', 'the field guides’ page column');
    has(html, 'class="eyebrow">Havellin Palm Beach &middot; Desk Guide</p>', 'a Desk Guide: it is read at the laptop, not in the house');
    has(html, 'Pocket card &middot; keep it by the laptop', 'ends with a pocket card');
    eq(count(html, '<section class="card">'), 1, 'one card');
    ok(count(html, '<h2>') >= 10, 'at least ten sections (' + count(html, '<h2>') + ')');
    // Under 2,750 words of text, masthead and footer included (Anthony's rule for these pages: short). 2,500 until 2026-10-26b,
    // when he asked for the day's changes (condition graded, whole dollars, Re-value, Another item) to be on the page; 2,650
    // until the release request's letter, its hold for a taker and Discard draft, the same day (he asked for the session's
    // changes to the process to be on it).
    const words = t.split(/\s+/).length;
    ok(words < 2750, 'short: ' + words + ' words');
    ['photography-guide.html', 'incident-guide.html', 'sorting-guide.html', 'packing-guide.html', 'move-day-guide.html', 'first-night-guide.html',
     'firearms-protocol.html', 'concierge-guide.html'].forEach((f) => has(html, '<a href="' + f + '">', 'names ' + f));
    has(t, 'Linked from the top of the Job Admin & Inv tab.', 'and says where the app links it');
    has(t, 'For Anthony and Ashley, at the laptop', 'the masthead says whom it is for');
    eq(count(html, 'type="checkbox"'), 0, '⚠ nothing to tick on the page');
    lacks(html, 'target="_blank"', 'and nothing on it opens a new tab');
    // The theme is the field guides’ own: the same tokens, redefined for dark in both forms, on an explicit page background.
    const css = (s) => s.slice(s.indexOf('<style>'), s.indexOf('</style>'));
    const tokens = (s) => css(s).slice(0, css(s).indexOf('*{box-sizing'));
    eq(tokens(html), tokens(read('incident-guide.html')), 'the colour and type tokens are Reporting an Incident’s, light and dark, byte for byte');
    has(css(html), '@media (prefers-color-scheme: dark){\n  :root:not([data-theme="light"]){', 'dark mode by the reader’s setting');
    has(css(html), ':root[data-theme="dark"]{', 'and by the theme attribute');
    has(css(html), 'body{\n  margin:0;\n  background:var(--paper);', 'the body has its own background');
    // ⚠ The phone block is scoped to the screen (Chrome lays Letter out at about 739 px): every max-width rule is one.
    has(css(html), '@media screen and (max-width:820px){', 'the phone block is @media screen and (max-width:820px)');
    eq((css(html).match(/@media[^{]*max-width/g) || []).filter((m) => m.indexOf('screen and') < 0), [], '⚠ and no unscoped width rule reaches the printed page');
    // In print: notes and table rows kept whole, never a list; the pocket card on its own page.
    const avoid = (css(html).match(/([^{}]+)\{[^{}]*break-inside:avoid/g) || []).join(' ');
    ok(/\.stage/.test(avoid) && /\.tbl tr/.test(avoid), 'in print a stage and a table row are kept whole');
    ok(!/(^|[\s,])(ul|ol|li)\b/.test(avoid.replace(/\.card/g, '')), '⚠ never a list that can outrun a page');
    has(css(html), '.card{page-break-before:always;break-before:page;', 'the pocket card prints on its own page');
  }

  // ═══ THE LINK IN THE APP ═══
  group('the app links it at the top of Job Admin & Inv, on every service and with no client, through the one opener');
  {
    eq(decl('DESK_GUIDE_DOC').trim(), "var DESK_GUIDE_DOC = 'evening-desk-guide.html';", 'one constant names the page');
    ok(SRC.indexOf("var INCIDENT_GUIDE_DOC = ") < SRC.indexOf("var DESK_GUIDE_DOC = ") && SRC.indexOf("var DESK_GUIDE_DOC = ") - SRC.indexOf("var INCIDENT_GUIDE_DOC = ") < 400,
      'beside the other guides’ constants');
    ok(fs.existsSync(path.join(ROOT, PAGE)), 'which exists');
    const c = sandbox({ vars: ['DESK_GUIDE_DOC'], fns: ['guideLinkHtml', 'openGuidePage', 'closeGuidePage', 'esc'] });
    const want = c.guideLinkHtml(c.DESK_GUIDE_DOC, 'Read The Evening Desk');
    eq(want, '<a href="evening-desk-guide.html" rel="noopener" onclick="return openGuidePage(event, this.getAttribute(\'href\'), this.textContent)">Read The Evening Desk &rarr;</a>',
      'the opener’s markup for the constant');
    // The panel's static header card: drawn before any client is picked and on every service, because renderInventoryTab
    // writes only #inventory-content under it.
    const at = SRC.indexOf('<div class="panel" id="panel-inventory">');
    const panel = SRC.slice(at, SRC.indexOf('<div id="inventory-content"></div>', at));
    ok(at > 0 && panel.length > 200 && panel.length < 3000, 'the panel’s static markup was found (' + panel.length + ' characters)');
    eq(count(panel, want), 1, '⚠⚠ the static link is the opener’s markup for DESK_GUIDE_DOC, byte for byte: its href the constant, its click openGuidePage');
    eq(count(SRC, 'evening-desk-guide.html'), 2, 'the file is named twice in the app: the constant, and the link that a test holds to it');
    const iTitle = panel.indexOf('Job Admin &amp; Inventory</div>'), iLink = panel.indexOf(want), iClient = panel.indexOf('>CLIENT<');
    ok(iTitle > 0 && iTitle < iLink && iLink < iClient, 'at the top: under the tab’s title and subtitle, in the header card, before the client picker (' + [iTitle, iLink, iClient].join(', ') + ')');
    const div = panel.slice(panel.lastIndexOf('<div', iLink), panel.indexOf('</div>', iLink));
    has(div, 'id="inv-guide-link"', 'in its own line');
    lacks(div, 'gray-dk', '⚠ no dark fill: browser step 6 takes the first such control in the panel as the primary document');
    lacks(div, '<button', 'a link, never a button');
    eq(count(SRC, 'inv-guide-link'), 1, 'nothing repaints or removes it: its id is written once, in the markup');
    const render = code(fn('renderInventoryTab'));
    eq([...new Set((render.match(/([A-Za-z_$][\w$]*)\.innerHTML\s*=/g) || []).map((m) => m.split('.')[0]))], ['cont'], 'renderInventoryTab writes only the content under the card…');
    has(render, "var cont = document.getElementById('inventory-content');", '…which is #inventory-content');
    has(render, "if (!jobId) { cont.innerHTML = ", 'so with no client chosen the link is still there');
    has(render, "if (job.svc === 'prep') {\n    cont.innerHTML = ", 'and on Home Prep');
    // Pressed: the panel over the app, headed by the page's name, the page in the frame, Close emptying it.
    const dom = domStub({});
    const p = sandbox({ vars: ['DESK_GUIDE_DOC'], fns: ['openGuidePage', 'closeGuidePage'], stubs: { document: dom } });
    const ev = { prevented: 0, preventDefault() { this.prevented++; } };
    eq(p.openGuidePage(ev, 'evening-desk-guide.html', 'Read The Evening Desk →'), false, 'the click is taken by the panel');
    eq(ev.prevented, 1, '…never followed as a link');
    eq(dom.getElementById('guide-title').textContent, 'The Evening Desk', 'headed The Evening Desk');
    eq(dom.getElementById('guide-frame').getAttribute('src'), 'evening-desk-guide.html', 'the page in the frame');
    eq(dom.getElementById('guide-open').getAttribute('href'), 'evening-desk-guide.html', 'Open in its own tab points at it');
    eq(dom.getElementById('guide-modal').style.display, 'flex', 'the panel shown');
    p.closeGuidePage();
    eq(dom.getElementById('guide-frame').getAttribute('src'), 'about:blank', 'Close empties the frame');
    has(SRC, '<div class="modal-overlay" id="guide-modal"', 'the panel is in the page');
  }

  // ═══ THE ORDER AND THE BARS ═══
  group('the order of the tab and the four bars, by the catalogue’s titles');
  {
    has(t, 'The tab runs in the order of an evening: what is urgent and the money step at the top, tonight’s items in the middle, four bars at the foot.', 'the page’s one-line map');
    const body = code(fn('renderInventoryTab'));
    const pos = ['jobInfoHeaderHtml(job)', 'deskAlertsHtml(jobId, job)', "jobProgressBlockHtml(jobId, 'admin')", "_sfHost('sf-host-desk', job)\n    + renderJobAdmin(jobId, job)",
      '_renderInvWorkbar(job, all)', "fold('releases'", "fold('values'", "fold('closing'", "fold('history'", "'<div id=\"inv-summary\">'"].map((n) => body.indexOf(n));
    ok(pos.every((x) => x > -1), 'fixture: the render’s blocks were found (' + pos.join(', ') + ')');
    ok(pos.every((x, i) => !i || pos[i - 1] < x), 'the schedule, the strip, the band, the must-finds and Job Admin, the items, the four bars, the totals last: the render’s order');
    const D = sandbox({ vars: ['DESK_FOLDS'] }).DESK_FOLDS;
    eq(Object.keys(D).length, 4, 'four bars');
    // The page's four headings under "The four bars" are the catalogue's titles, in its order.
    const h3 = (sectionHtml('4. The four bars').match(/<h3>([^<]+)<\/h3>/g) || []).map((h) => decode(h.replace(/<\/?h3>/g, '')));
    eq(h3, Object.keys(D).map((k) => D[k].title), '⚠⚠ the page’s bar headings are DESK_FOLDS’ titles, in the catalogue’s order');
    has(t, 'Work down Closing the job', 'the closing evening names the bar by its title');
    has(t, 'Closing the job opens by itself', 'as does its heading');
    // A pointer to a card inside a bar names the bar by its title (the app's own rule); the page's pointers say "under Releases".
    has(t, 'Handing it over is a sign-out, under Releases.', 'the hand-off is pointed to Releases');
    has(code(fn('deskFoldState')), "' ready to hand to ' + g.taker + ' (under ' + DESK_FOLDS.releases.title + ')'", '…as the Values line points at it');
    has(t, 'They are in the bars under the last item. Tap a bar to open it.', 'where the bars are');
    has(code(fn('_deskFold')), 'onclick="toggleDeskFold(', 'a bar opens by a press of its header');
  }

  group('each bar says in a few words whether it needs you, opens by itself when its work is due and never shuts by itself');
  {
    has(t, 'Each bar says in a few words whether anything inside needs you. It opens by itself when its work is due and never shuts by itself; what you open or shut stays that way until you reload.', 'the page says so');
    const s = sandbox({ fns: ['_deskFoldIsOpen', '_deskKey'], vars: ['_deskOpen'] });
    eq(s._deskFoldIsOpen(7, 'values', { openByDefault: true }), true, 'its rule opens it');
    eq(s._deskFoldIsOpen(7, 'values', { openByDefault: false }), true, '⚠⚠ and the work done, it stays open: an open default is written down');
    s._deskOpen['7:releases'] = false;
    eq(s._deskFoldIsOpen(7, 'releases', { openByDefault: true }), false, 'a person’s shut beats its rule');
    eq(decl('_deskOpen').trim().split('//')[0].trim(), 'var _deskOpen = {};', 'held in memory for the session: a reload starts afresh');
    ['_deskFoldIsOpen', 'toggleDeskFold', 'deskFoldOpen', '_deskFoldPaint'].forEach((f) => lacks(code(fn(f)), 'localStorage', f + ' saves nothing'));
    const T = sandbox({ vars: ['DESK_FOLD_TONES'] }).DESK_FOLD_TONES;
    eq(Object.keys(T).sort(), ['amber', 'grey', 'ok', 'red'], 'a bar’s line comes in four tones…');
    ['Grey for your information', 'Amber needs you', 'Red needs you now', '✓ Green all done'].forEach((w) => has(t, w, '…which the page names: ' + w));
    has(t, 'Amber needs you tonight; red needs you now. Grey is for your information.', 'Rule 3');
  }

  group('Releases & signed papers: opens when a request is owed, in the line’s own words (Q89)');
  {
    has(t, 'Opens by itself when items wait for written approval that no request has carried (3 items need written approval: send a request), when a drafted request waits for I’ve sent it, or when a signed approval has no copy filed.', 'the page’s rule');
    const decided = [LINE('a', { disposition: 'Sell', channel: 'Sotheby’s' }), LINE('b', { disposition: 'Donate', channel: 'Goodwill' }), LINE('c', { disposition: 'Junk', channel: 'Haul-It' })];
    let B = bars(ESTATE(), decided);
    ok(!B.releases.err, 'the bar answers (' + (B.releases.err || 'ok') + ')');
    eq([B.releases.openByDefault, B.line('releases').split(' · ')[0], B.tones('releases')[0]], [true, '3 items need written approval: send a request', 'amber'],
      '⚠⚠ three items decided and no request: open, in the words the page quotes, amber');
    const req = { to: ['ruth@adler.example'], cc: [], noEmail: [], stableIds: ['a', 'b', 'c'], asked: 3, ratify: 0 };
    B = bars(ESTATE({ docState: { approvalRequest: { draftedAt: '2026-10-21T20:00:00.000Z', provider: 'gmail', req } } }), decided);
    eq([B.releases.openByDefault, B.line('releases').split(' · ')[0]], [true, 'Request drafted: tap I’ve sent it'], 'a drafted request waiting for I’ve sent it: open');
    B = bars(ESTATE({ docState: { approvalRequest: { draftedAt: '2026-10-21T20:00:00.000Z', sentAt: '2026-10-21T21:00:00.000Z', req } } }), decided);
    eq([B.releases.openByDefault, B.tones('releases')[0]], [false, 'grey'], 'sent and waiting on the signatures: shut, grey (for your information)');
    const signed = (o) => Object.assign({ authBy: 'Ruth Adler', approvalDate: '2026-10-21' }, o);
    B = bars(ESTATE(), [LINE('a', signed({ disposition: 'Sell', channel: 'Sotheby’s' }))]);
    eq([B.releases.openByDefault, B.line('releases').split(' · ')[0]], [true, '1 signed approval not filed to Drive'], 'a signed approval with no copy filed: open');
  }

  group('Values & appraisals: opens while an item waiting on an appraisal has no appraiser linked; red on a Formal job, amber otherwise');
  {
    has(t, 'Opens by itself when an item needs an appraisal and has no appraiser linked. Red on a Formal job, whose record is not complete without it; amber otherwise.', 'the page’s rule');
    const art = (o) => LINE('a', Object.assign({ objectName: 'Oil on canvas', category: 'Art & Décor', fmv: 9000 }, o));
    let B = bars(ESTATE({ docLevel: 'formal' }), [art()]);
    ok(!B.values.err, 'the bar answers (' + (B.values.err || 'ok') + ')');
    eq([B.values.openByDefault, B.tones('values')[0]], [true, 'red'], '⚠⚠ Formal, nobody linked: open, red');
    B = bars(ESTATE({ gate706: 'no' }), [art()]);
    eq([B.values.openByDefault, B.tones('values')[0]], [true, 'amber'], 'Standard: open, amber');
    B = bars(ESTATE({ gate706: 'no', appraisers: [{ id: 1, name: 'Jane Smith', credential: 'ASA' }] }), [art({ apprId: 1 })]);
    eq(B.values.openByDefault, false, 'an appraiser linked: it does not open by itself');
  }

  group('Closing the job: grey before the close; amber where a paper is owed; opens at the close, on a refusal or a statement that disagrees');
  {
    has(t, 'Grey before the close; amber mid-job only when something has left with its paper owed (a donated item with no receipt, a sold item on no statement) or a statement waits to be filed.', 'the page’s tones');
    has(t, 'Opens by itself at the close (the Job Plan at Close-out, the work handed over, the job closed or lost), when Close job refuses, or when a proceeds statement disagrees with its items (red).', 'the page’s open rule');
    let B = bars(ESTATE(), [LINE('a', { disposition: 'Keep' })]);
    ok(!B.closing.err, 'the bar answers (' + (B.closing.err || 'ok') + ')');
    eq([B.closing.openByDefault, [...new Set(B.tones('closing'))]], [false, ['grey']], '⚠ mid-job: shut, every part grey');
    const gone = [LINE('a', { disposition: 'Sell', channel: 'Sotheby’s', gross: 500, fees: 50, dispDate: '2026-10-18' }), LINE('b', { disposition: 'Donate', channel: 'Goodwill', dispDate: '2026-10-15' })];
    B = bars(ESTATE(), gone);
    eq([B.closing.openByDefault, B.tones('closing').slice(0, 2)], [false, ['amber', 'amber']], 'a donated item gone with no receipt and a sold item gone on no statement: amber, still shut');
    const st = { id: 'ps1', vendor: 'Sotheby’s', gross: 500, fees: 50, netPaid: 450, lines: [{ stableId: 'a', itemNo: 1 }] };
    B = bars(ESTATE({ proceedsStatements: [st] }), [gone[0]]);
    has(B.line('closing'), '1 statement not filed to Drive', 'a statement recorded and not filed is named');
    eq(B.tones('closing')[B.closing.bits.findIndex((b) => b.text === '1 statement not filed to Drive')], 'amber', '…in amber');
    B = bars(ESTATE({ proceedsStatements: [Object.assign({}, st, { gross: 900, netPaid: 850 })] }), [gone[0]]);
    eq([B.closing.openByDefault, B.tones('closing')[0]], [true, 'red'], 'a statement that disagrees with its items: open, red');
    [['the work handed over', ESTATE({ deliveredOn: '2026-10-20', status: 'closed' })], ['closed, the deposit retained', ESTATE({ status: 'closed_retained' })],
     ['lost', ESTATE({ status: 'lost', won: false })]].forEach(([what, j]) => eq(bars(j, [LINE('a')]).closing.openByDefault, true, what + ': open'));
    // RESTATED BY Q92 (2026-10-23): the close is one answer, jobAtClose, shared with the Close-out card's scorecard.
    has(code(fn('deskFoldState')), 'var atClose = jobAtClose(jobId, job);', 'the close opens it (jobAtClose)…');
    has(code(fn('jobAtClose')), "planCurrentStage(jobId, job, est) === 'p4'", '…and the Job Plan at Close-out is the close');
    has(code(fn('applyJobTransition')), "deskFoldOpen(", 'and a refused Close job opens it');
  }

  group('Removed items & snapshots: opens by itself only when a snapshot is taken; the totals last');
  {
    has(t, 'Opens by itself only when you take a snapshot.', 'the page’s rule');
    const B = bars(ESTATE({ status: 'closed', deliveredOn: '2026-10-20', invSnapshots: [{ ts: 1 }] }), [LINE('a'), LINE('x', { deletedAt: T0 })]);
    eq([B.history.show, B.history.openByDefault], [true, false], 'never by itself, even at the close');
    has(code(fn('takeInventorySnapshot')), "deskFoldOpen(jobId, 'history')", 'a snapshot taken opens it');
    has(SRC, ">Restore</button>", 'Restore');
    has(SRC, ">Compare with now</button>", 'Compare with now');
    has(code(fn('_renderInvWorkbar')), "(fid ? btn('takeInventorySnapshot(' + jid + ')', 'Snapshot'", 'the Snapshot, in More ▾, on an estate');
    has(code(fn('_renderInvWorkbar')), "(_invShowRoll ? 'Hide' : 'Show') + ' summary &amp; rollups'", 'Show summary & rollups, in More ▾');
    has(t, 'The totals (Show summary & rollups, in More ▾) appear under this bar, at the very foot.', 'the page says where the totals land');
  }

  group('loading… and an unreachable sheet: the bars claim nothing off this device’s copy');
  {
    has(t, 'A bar says loading… This device has not yet read the client’s items from the sheet, and the bar claims nothing until it has.', 'the page explains loading…');
    has(t, 'A bar says sheet unreachable: this device’s copy The sheet did not answer: the bar shows what this device holds and opens nothing by itself, and the tab asks again every 15 seconds.', 'and the unreachable sheet');
    const decided = [LINE('a', { disposition: 'Sell', channel: 'Sotheby’s' })];
    const URL = 'https://sync.example.test/exec';
    let B = bars(ESTATE(), decided, { url: URL, seen: {} });
    ['releases', 'values', 'history'].forEach((f) => eq([B.line(f), B.tones(f), B[f].openByDefault], ['loading…', ['grey'], false], f + ': “loading…” in grey, opening nothing'));
    B = bars(ESTATE(), decided, { url: URL, seen: {}, failed: { 7: true } });
    eq([B.releases.bits[0].text, B.releases.bits[0].tone, B.releases.openByDefault], ['sheet unreachable: this device’s copy', 'amber', false],
      '⚠⚠ a read that failed: the words the page quotes, in amber, opening nothing (read, Releases would open)');
    eq(sandbox({ vars: ['INV_CLOUD_RETRY_MS'] }).INV_CLOUD_RETRY_MS, 15000, 'asked again every 15 seconds');
  }

  // ═══ THE TOP OF THE PAGE ═══
  group('the top of the page: the schedule, the Urgent strip by its one rule, the band, the must-finds');
  {
    has(t, 'The schedule says where the job stands: Working day 6 of 14 · 40% of the work done.', 'the schedule');
    has(SRC, "'% of the work done'", 'which the strip prints');
    // "each saying what to do", never "each with its button" (guide review, 2026-10-24): the matter type line has no button and
    // points at Edit Client in its words, and an incident line drops its Open Incidents while the banner above offers one.
    has(t, 'Under it, only when something cannot wait, a strip of warnings, each saying what to do. Each goes once it is dealt with.', 'the strip');
    lacks(t, 'each with its button', '⚠ and never that each carries a button');
    // deskNowLine, rule by rule: what the page lists goes to the strip; a line done never does.
    const N = sandbox({ fns: ['deskNowLine'], vars: ['DESK_NOW_KEY_RE'], stubs: { incidentBannerState: () => ({ owed: [] }) } });
    const at = (l) => N.deskNowLine(l, { id: 7 });
    eq([at({ key: 'will_held_w1', red: true }), at({ key: 'cash_held_c1', red: true })], ['strip', 'strip'], 'an original will or cash Havellin holds');
    eq([at({ key: 'will_receipt_w1', ok: false }), at({ key: 'cash_receipt_c1', ok: false })], ['strip', 'strip'], 'handed over, its signed receipt not yet filed: amber, still in the strip');
    eq(at({ key: 'will_deposit_w1', ok: false }), 'strip', '⚠⚠ a will handed over and receipted but not yet deposited with the clerk: in the strip, amber, before its day');
    eq([at({ key: 'will_receipt_w1', ok: true }), at({ key: 'will_deposit_w1', ok: true }), at({ key: 'cash_receipt_c1', ok: true })], ['admin', 'admin', 'admin'], '…and each goes once it is done');
    // The join: the real siteFindLines for a will handed to counsel with its signed receipt filed and no deposit recorded, each
    // line placed by the real deskNowLine. The strip keeps the deposit line until the deposit is recorded (§732.901).
    {
      const SF = lift(['siteFindLines', 'deskNowLine'], { incidentBannerState: () => ({ owed: [] }) });
      const find = (o) => Object.assign({ id: 'w1', kind: 'will', foundOn: '2026-10-19', where: 'the study desk', foundBy: 'Ashley Jerome',
        handedOn: '2026-10-20', handedTo: 'Ann Lowe' }, o || {});
      const job = (f) => ESTATE({ siteFinds: [f], signedRecords: [{ id: 's1', kind: 'will', ref: 'w1', url: 'https://drive.google.com/file/d/S1' }] });
      const place = (j, today) => { const r = attempt(() => SF.siteFindLines(j, today).map((l) => [l.key, !!l.ok, !!l.red, SF.deskNowLine(l, j)])); return r.ok ? r.val : r.err; };
      eq(place(job(find()), '2026-10-23'), [['will_receipt_w1', true, false, 'admin'], ['will_deposit_w1', false, false, 'strip']],
        '⚠⚠ receipted and not deposited, before the tenth day: the receipt line in Job Admin, the deposit line in the strip (amber)');
      eq(place(job(find()), '2026-11-02'), [['will_receipt_w1', true, false, 'admin'], ['will_deposit_w1', false, true, 'strip']], '…red once its day has passed');
      eq(place(job(find({ depositedOn: '2026-10-24', depositConfirmedBy: 'Ann Lowe' })), '2026-11-02'), [['will_receipt_w1', true, false, 'admin'], ['will_deposit_w1', true, false, 'admin']],
        '…and gone from the strip once the deposit is recorded');
    }
    has(t, 'An original will or cash found on site, until it is handed over and receipted, and a will until it is deposited with the clerk: Open Found on site.', 'as the page says');
    eq(at({ key: 'access_lost_k1', red: true }), 'strip', 'a key marked lost');
    eq(at({ key: 'inc_client_i1' }), 'strip', 'an incident still owing a promise');
    eq(at({ key: 'matter_type', ok: false }), 'strip', 'an estate with no matter type');
    eq([at({ key: 'will_w1', ok: true }), at({ key: 'matter_type', ok: true })], ['admin', 'admin'], 'each goes from the strip once it is dealt with');
    eq(at({ key: 'rooms_cleared' }), 'admin', 'the rest stays in Job Admin');
    has(code(fn('deskAlertsHtml')), 'if (!c.red) c.amber = true;', 'a strip line that is not red is amber');
    const pdl = code(fn('planDerivedLines'));
    [["label: 'Open Found on site'", 'Open Found on site'], ["label: 'Open Keys &amp; access'", 'Open Keys & access'], ["label: 'Open Incidents'", 'Open Incidents']]
      .forEach(([c, w]) => { has(pdl, c, 'the strip line’s button: ' + w); has(t, w, '…which the page names'); });
    has(pdl, "key: 'matter_type', ok: !!mdf, label: 'Matter type recorded'", 'the matter type line');
    has(pdl, 'are withheld until it is. Edit Client', '…pointing at Edit Client');
    const mtLine = pdl.slice(pdl.indexOf("key: 'matter_type'"), pdl.indexOf('});', pdl.indexOf("key: 'matter_type'")));
    ok(mtLine.length > 40 && mtLine.length < 600, 'fixture: the matter type line’s push was found (' + mtLine.length + ' characters)');
    lacks(mtLine, 'action', '…which carries no button: its words say what to do');
    // An incident line drops its Open Incidents while the banner is up; every banner and chip carries one.
    has(code(fn('deskAlertsHtml')), "if (banner && String(c.key || '').indexOf('inc_') === 0 && c.action && String(c.action.call).indexOf('goToIncidents(') === 0) c.action = null;",
      'an incident line gives up its button while the banner is up…');
    eq(count(code(fn('incidentHeaderHtml')), 'onclick="goToIncidents(\' + job.id + \')">Open Incidents</button>'), 3, '…and the banner, red or amber, carries Open Incidents in each of its three forms');
    has(t, 'In amber, an estate with no matter type recorded: set it in Edit Client.', 'as the page says');
    has(t, 'An incident still owing one of its promises, red once its day has passed: Open Incidents.', 'the incident promises');
    // The call to Anthony and the incident banner, the desk's own copy at the top of the strip.
    const da = code(fn('deskAlertsHtml'));
    has(da, "incidentHeaderHtml(job, 'desk')", 'the strip carries the incident banner');
    has(da, 'firearmsWorkspaceLine(job)', 'and the firearms line');
    const ih = code(fn('incidentHeaderHtml'));
    has(ih, 'CALL ANTHONY IMMEDIATELY', 'the banner’s words');
    has(ih, '>I called Anthony</button>', 'and its button');
    has(t, 'CALL ANTHONY IMMEDIATELY after an injury, a missing item or a worry about an older person: make the call, then press I called Anthony', 'as the page says');
    const K = sandbox({ vars: ['INCIDENT_KINDS', 'INCIDENT_KIND_ORDER'] });
    eq(K.INCIDENT_KIND_ORDER.filter((k) => K.INCIDENT_KINDS[k].alert), ['injury', 'missing', 'vulnerable'], 'the three kinds that owe the call');
    has(code(fn('incidentBannerState')), "r.kind === 'injury' || r.kind === 'hazard'", 'an open injury or hazard is red…');
    has(ih, 'alert a-warn inc-chip', '…any other open incident amber');
    has(t, 'An open injury or hazard stays red until resolved; other open incidents show in amber.', 'as the page says');
    // The firearms line is red (the protocol's colour), and the page lists it as a red point.
    const F = sandbox({ fns: ['firearmsWorkspaceLine', 'firearmsFlaggedAtIntake', '_firearmsRow', 'houseFlagsOf', 'guideLinkHtml', 'esc'], vars: ['FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS'] });
    const fl = attempt(() => F.firearmsWorkspaceLine({ id: 7, svc: 'probate', houseFlags: { firearms: { on: true } } }));
    ok(fl.ok, 'the firearms line draws (' + (fl.err || 'ok') + ')');
    has(fl.ok ? decode(fl.val) : '', 'Firearms flagged on this job — photograph in place, nothing moves.', 'in its words');
    has(fl.ok ? fl.val : '', 'Protocol', 'with the Protocol linked');
    has(SRC, '.fa-line{background:#8b1e1e;', 'on a red bar');
    const li = html.slice(html.lastIndexOf('<li', html.indexOf('Firearms flagged on this job')), html.indexOf('Firearms flagged on this job'));
    has(li, '<li class="crit">', '⚠ which the page lists in red, never grey');
    has(t, 'Firearms flagged on this job — photograph in place, nothing moves, where intake flagged firearms, with a link to the Protocol.', 'in the line’s own words');
    // The band and its answers.
    has(code(fn('_jtSendAction')), "label: '&#9993; Send ' + what", 'the band’s send, such as ✉ Send midpoint invoice');
    has(t, 'One step and one filled button, such as ✉ Send midpoint invoice.', 'as the page says');
    has(code(fn('_jobBandHost')), 'jband-fb-admin', 'on this tab a notice lands in the band');
    has(t, 'The answer to a send or a filing appears in the band, so look up after you press.', 'as the page says');
    // The must-finds.
    const sf = code(fn('standingFlagsBlock'));
    has(sf, "'All ' + nMf + ' must-finds found'", 'every must-find found: one green line');
    has(sf, "'Show found'", '…with Show found');
    has(code(fn('_sfRowHtml')), 'Found it', 'each must-find’s Found it');
    has(t, 'Press Found it as the photos turn each one up. Once all are found the list shrinks to ✓ All 3 must-finds found; Show found brings it back.', 'as the page says');
  }

  group('Job Admin — desk paperwork: shut mid-job with its urgent lines in the strip, open on Home Prep');
  {
    has(code(fn('renderJobAdmin')), '<span>Job Admin — desk paperwork</span>', 'the bar’s title');
    has(t, 'Job Admin — desk paperwork is the closing checklist. Leave it shut mid-job: anything urgent in it is already in the strip above.', 'as the page names it');
    has(code(fn('renderJobAdmin')), 'derivedLinesHtml(parts.admin,', 'Job Admin draws only what the strip does not');
    has(code(fn('_jobAdminIsOpen')), "!!(job && job.svc === 'prep')", 'shut by default, open on Home Prep');
    has(t, 'On Home Prep it starts open.', 'as the page says');
    const pdl = code(fn('planDerivedLines'));
    ["'All rooms cleared'", "'Hours logged'", "'Final invoice sent'"].forEach((l) => has(pdl, l, 'Job Admin lists what the app recorded: ' + l));
    has(t, 'it lists what the app recorded by itself (rooms cleared, hours, the final invoice, the signed papers) and the few boxes only a person ticks.', 'as the page says');
  }

  // ═══ TONIGHT'S ITEMS ═══
  group('tonight’s items: the Inventory Review bar in the order of the work, the notes, the review, the selection, the earlier days');
  {
    const wb = code(fn('_renderInvWorkbar'));
    has(wb, '>Inventory Review</div>', 'the bar’s title');
    has(t, 'Always open. The Inventory Review bar carries the buttons in the order you press them.', 'as the page names it');
    has(code(fn('_invApplyWhenDefault')), "when: _invCapturedToday(all) ? 'today' : 'all'", 'the list opens on Today when something was photographed today');
    has(t, 'The list opens on Today when something was photographed today.', 'as the page says');
    const iName = wb.indexOf(">Name ' + _agNameables"), iCheck = wb.indexOf('_arCheckButtonHtml(job)'), iValue = wb.indexOf('_avValueButtonHtml(job)');
    ok(iName > 0 && iName < iCheck && iCheck < iValue, 'Name N shots, then Check N rooms, then Value N lines (' + [iName, iCheck, iValue].join(', ') + ')');
    has(wb, "' shot' + (_agNameables === 1 ? '' : 's') + '</button>'", 'Name N shots');
    has(code(fn('_arCheckButtonHtml')), ">Check ' + n + ' room' + (n === 1 ? '' : 's') + '</button>'", 'Check N rooms');
    has(code(fn('_avValueButtonHtml')), ">Value ' + n", 'Value N lines');
    ['Name N shots', 'Check N rooms', 'Value N lines'].forEach((b) => has(t, b, 'the page names ' + b));
    has(code(fn('_agFinish')), 'agentRoomCheckRun(jobId, { auto: true })', 'the room check follows a naming run by itself');
    has(t, 'The room check follows by itself and flags anything photographed twice in a room; Check N rooms runs it again.', 'as the page says');
    // Agent One's notes and Anthony's Q90 answer: Look at this quiet once reviewed; must-find, firearm and NFA stay, a must-find
    // quiet once every must-find is found.
    const AK = sandbox({ vars: ['AGENT_NOTICE_KINDS'] }).AGENT_NOTICE_KINDS;
    eq(AK.map((k) => [k.label, k.cls]), [['Must find', 'a-err'], ['Possible NFA item', 'a-err'], ['Firearm', 'a-err'], ['Look at this', 'a-warn']], 'three notes in red, Look at this in amber');
    has(code(fn('_agNoticesHtml')), "'Agent One raised '", 'under Agent One raised N things to look at');
    const Q = sandbox({ fns: ['agentNoticeQuiet'], stubs: { invLineReviewed: (r) => !!(r && r.rev), mustFindAllFound: (j) => !!(j && j.allFound) } });
    eq([Q.agentNoticeQuiet('other', { rev: false }, {}), Q.agentNoticeQuiet('other', { rev: true }, {})], [false, true], 'Look at this: gone once the item is reviewed');
    eq([Q.agentNoticeQuiet('mustfind', { rev: true }, { allFound: false }), Q.agentNoticeQuiet('mustfind', {}, { allFound: true })], [false, true], 'a Must find: stays until every must-find is found');
    eq([Q.agentNoticeQuiet('firearm', { rev: true }, { allFound: true }), Q.agentNoticeQuiet('nfa', { rev: true }, { allFound: true })], [false, false], 'Firearm and Possible NFA item: always stay');
    // 2026-10-26: Agent One keeps a photograph's notes on the photograph's own line, whichever thing they are about, so a Look at
    // this goes quiet once every line off that photograph is reviewed (the real sibling walk, on a photograph split three ways).
    const sibRefs = [{ stableId: 'p', rev: true }, { stableId: 'p2', derivedFrom: 'p', rev: true, ts: 2 }, { stableId: 'p3', derivedFrom: 'p', rev: false, ts: 3 }];
    const QS = sandbox({ fns: ['agentNoticeQuiet', '_invPhotoSiblings', '_invPhotoSource', '_invDerivedRefs', '_getPhotoRef'],
      stubs: { _photoRefs: { 7: sibRefs }, invLineReviewed: (r) => !!(r && r.rev), mustFindAllFound: () => false } });
    const quietOn = (refs) => { QS._photoRefs[7] = refs; return QS.agentNoticeQuiet('other', refs[0], { id: 7 }); };
    eq(quietOn(sibRefs), false, '⚠ a Look at this on a reviewed photograph line stays while another item off its photo is unreviewed');
    eq(quietOn(sibRefs.map((r) => Object.assign({}, r, { rev: true }))), true, '…and goes once every item off its photo is reviewed');
    has(t, 'Must find, Firearm and Possible NFA item in red, and they stay (a Must find goes quiet once every must-find is found); Look at this in amber, gone once every item in its photo is reviewed. A removed item’s notes move to the next item from its photo. Quiet notes stay in the item’s record.', 'as the page says (a removed item’s notes riding, driven with the review below)');
    // Since main's 2026-10-26 every note a removed photograph line carried rides on the first line still listed off it
    // (agentNoticesOn), so the page no longer says only a Firearm note outlives its item (the round-three agentNoticeLoud is gone).
    lacks(t, 'a Firearm note outlives the item it was raised on', '⚠ never that only a Firearm note outlives its item: every note rides');
    has(code(fn('agentApplyResult')), 'var src = _getPhotoRef(jobId, group.srcId);', 'Agent One writes a photograph’s notes on the photograph’s own line (the item a removal takes them from)');
    has(code(fn('_agRecordNoticesHtml')), 'off the list above the rows', 'a quiet note is still read in the item’s record');
    has(SRC, '>Show the item</button>', 'Show the item');
    has(t, 'Show the item jumps to it and opens it.', 'as the page says');
    const dup = code(fn('_agDupHtml'));
    ['Possible duplicates', "'Remove</button>", '>Not duplicates</button>'].forEach((w) => has(dup, w, 'the duplicates block: ' + w));
    has(t, 'Possible duplicates. Compare the photos, then Remove the extra, or Not duplicates if they really are two things. Renaming one does not settle it.', 'as the page says (the rename, and the tick the paragraph below names, driven below)');
    // 2026-10-25b (Anthony: "one review. not a multi tiered review"): the values follow the naming and the room check by
    // themselves, Agent Two correcting Agent One's unreviewed names, and Value N lines is for what is left. The row's Accept
    // value is gone (the page said "Each figure stays unreviewed until you press Accept value").
    has(code(fn('_agFinish')), 'agentValueAuto(jobId)', 'Agent Two follows a naming run with no room to check…');
    has(code(fn('_arFinish')), 'if (!st.error) agentValueAuto(jobId);', '…and the room check that did not fail, by itself');
    has(code(fn('agentValueAuto')), '_invHasPhoto(r)', '…every photographed item (Value N lines does the rest)');
    has(code(fn('_avRename')), '_avNameIsAgents(ref)', '…correcting a name only while it is Agent One’s and unreviewed');
    has(t, 'The values follow by themselves, Agent Two correcting Agent One’s guesses; Value N lines does the rest.', 'as the page says');
    lacks(t, 'Accept value', 'and the page names no Accept value');
    // Reviewed, read off the line (2026-10-26, Q106; it replaced Q99's $100 line of the day before; Anthony: "this is our job at
    // night … we go over the list and we make sure it makes sense. And we verify it with what we saw on site"): an item with its
    // name, destination and value and nothing flagged stands with no tick, whatever its value; a flagged one takes the one tick
    // for its name, count and value. The page's sentences on the real rule, with a real context (invAcceptCtx: the job and the
    // open duplicate groups), each flag the page names, and the box it describes. review-flagged.test.js holds the rule whole.
    const RV = lift(['invLineAccepted', 'invLineHold', 'invAcceptCtx', 'invLineReviewed', 'invLineUnsure', '_invRevBoxHtml', '_invProgressStamp',
      '_avUnreviewedStamp', 'invMarkListRead', 'invListRead', 'invListSeen', 'invListReadRefusal', '_invListReadHtml', 'agentNotices', 'agentDuplicateGroups'],
      { jobs: [], _photoRefs: {}, estimateStore: {}, vendors: [], vendorDirectory: [], contractors: [], document: { getElementById: () => null },
        jobPlanStore: {}, SHEETS_SYNC_URL: '', _invCloudSeen: {}, _invCloudFailed: {}, alert(m) { RV.__alerts = (RV.__alerts || []).concat([String(m)]); },
        _saveJobEdit(job) { RV.__saved = (RV.__saved || 0) + 1; RV.__savedJob = job; }, _renderInvWorkbar: () => '' });
    const EST = (o) => Object.assign({ id: 7, hvlId: 'HVL-0007', name: 'Butler Estate', svc: 'cleanout', matterType: 'probate', docTier: 'values',
      deathDate: '2026-06-14', executor: 'Tripp Butler', tc: 'Ashley Jerome', won: true, status: 'won' }, o || {});
    // Agent One's name and Agent Two's figure, both fairly sure, a destination chosen, nothing flagged: the cutlery drawer. Each
    // flag below is this line with one thing changed, so every step before it passes.
    const ITEM = (o) => { const n = (o && o.objectName) || 'Kitchen utensils, drawer'; return Object.assign({ stableId: 'k1', label: 'inventory',
      roomIdx: 1, ts: 1, objectName: n, valNameAt: n, namedBy: 'agent', agentConf: 'medium', category: 'General/Household', qty: 1,
      disposition: 'Donate', driveFileId: 'Fk1', valuedBy: 'agent', fmv: 40, valLow: 20, valHigh: 60, valConf: 'medium' }, o || {}); };
    // The line as the desk reads it: on `job`, with `others` beside it on the job's list.
    const look = (job, o, others) => {
      const line = ITEM(o), all = [line].concat(others || []);
      RV.jobs.length = 0; RV.jobs.push(job); RV._photoRefs[job.id] = all;
      const r = attempt(() => { const fc = RV.invAcceptCtx(job, all);
        return { stands: RV.invLineAccepted(line, fc), reviewed: RV.invLineReviewed(line, fc), unsure: RV.invLineUnsure(line, job),
          box: RV._invRevBoxHtml(job.id, line, fc) }; });
      return r.ok ? r.val : { err: r.err };
    };
    const base = look(EST());
    eq([base.stands, base.reviewed], [true, true], '⚠⚠ "Nothing flagged? No tick": the $40 drawer, named, valued and decided, stands with nobody ticking it' + (base.err ? ' (' + base.err + ')' : ''));
    eq(look(EST(), { objectName: 'Mahogany dining table, six chairs', category: 'Furniture', disposition: 'Sell', fmv: 2400, valLow: 2000, valHigh: 2900 }).stands, true,
      '⚠⚠ "whatever its value": a $2,400 table stands too (the $100 line of 2026-10-25 is gone)');
    eq(look(EST(), { objectName: 'Oil on canvas, harbour scene', category: 'Art & Décor', fmv: 300, valLow: 200, valHigh: 450 }).stands, true,
      '…and art is no flag of its own');
    has(base.box || '', ' checked', '"the box is ticked…"');
    has(base.box || '', 'accent-color:var(--gray)', '"…in grey"');
    lacks(base.box || '', ' disabled', 'and it can still be pressed, to record a look');
    has(base.box || '', 'Nothing flagged: the agents’ name and value stand as they are.', 'its tooltip says why');
    // "Correct the name and count, choose where it goes … check the value": until it has them the line is not done.
    [['no destination yet', { disposition: '' }], ['Not yet decided', { disposition: 'Undecided' }], ['no value yet', { fmv: '', valLow: undefined, valHigh: undefined }]]
      .forEach(([w, o]) => eq(look(EST(), o).reviewed, false, 'until it is decided and valued it is not done: ' + w));
    // "Flagged? One Reviewed tick covers it: a note, a firearm or ammunition, an appraisal not yet in or waived, a bequest, a
    // dispute, both agents unsure." Each holds the line; a possible duplicate holds it too, and a tick does not settle that.
    const TWIN = ITEM({ stableId: 'k2', driveFileId: 'Fk2', ts: 2 });
    [['a note (Agent One’s)', { agentNotices: [{ kind: 'other', text: 'a mark under the base' }] }],
     ['a note (Agent Two’s)', { valNotices: [{ kind: 'specialist', text: 'a maker worth a look' }] }],
     ['a possible duplicate (the same name off another photo in the room)', {}, [TWIN]],
     ['a firearm', { category: 'Firearms', objectName: 'Remington pump shotgun' }],
     ['ammunition, whatever its category', { objectName: 'Box of 20 gauge target loads' }],
     ['an appraisal: ticked for one', { needsAppr: true }],
     ['an appraisal: linked to an appraiser', { apprId: 'a1' }],
     ['an appraisal: worth $3,000 or more, in any category, not yet waived', { objectName: 'Leather sofa, Restoration Hardware', category: 'Furniture', fmv: 3200, valLow: 2800, valHigh: 3600 }],
     ['a bequest', { flagBequest: true }],
     ['a dispute', { flagDisputed: true }],
     ['both agents unsure', { agentConf: 'low', valConf: 'low' }]]
      .forEach(([w, o, others]) => { const l = look(EST(), o, others); eq([l.stands, l.reviewed], [false, false], '⚠ flagged, it waits for the tick: ' + w + (l.err ? ' (' + l.err + ')' : '')); });
    eq(look(EST(), {}, [ITEM({ stableId: 'k2', driveFileId: 'Fk2', ts: 2, objectName: 'Brass table lamp' })]).stands, true, '…the duplicate\'s control: another thing in the room, the drawer stands');
    eq(look(EST(), { objectName: 'Leather sofa, Restoration Hardware', category: 'Furniture', fmv: 3200, valLow: 2800, valHigh: 3600, apprWaived: true }).stands, true,
      '⚠ "an appraisal not yet in or waived": once waived, the sofa stands');
    eq([look(EST(), { valConf: 'low' }).stands, look(EST(), { agentConf: 'low' }).stands], [true, true], '"both": either agent alone unsure, the line stands');
    eq(look(EST(), { agentConf: 'low', valConf: 'low' }).unsure, true, 'both unsure, the row reads unsure');
    // "Hover the box for every reason." A line that wants a tick names every reason in the box's tooltip (_invLineHolds,
    // INV_HOLD_WORDS); one a tick does not settle says so (INV_OPEN_HOLDS).
    const why = (l) => { const m = /title="([^"]*)"/.exec(l.box || ''); return m ? decode(m[1]) : ''; };
    eq(why(look(EST(), { agentNotices: [{ kind: 'other', text: 'a mark under the base' }] })), 'Needs a look: Agent One’s note on it. Tick it once checked.', '⚠ "Hover the box for every reason": a note');
    eq(why(look(EST(), { agentConf: 'low', valConf: 'low' })), 'Needs a look: both agents were guessing. Tick it once checked.', '…both guessing');
    eq(why(look(EST(), { agentConf: 'low', valConf: 'low', agentNotices: [{ kind: 'other', text: 'a mark under the base' }] })), 'Needs a look: both agents were guessing; Agent One’s note on it. Tick it once checked.', '⚠⚠ …every reason, not the first alone');
    eq(why(look(EST(), {}, [TWIN])), 'Still open: a possible duplicate: Remove one or press Not duplicates, under Possible duplicates. A tick does not settle it.', '…a possible duplicate, which a tick does not settle');
    // "A tick never settles … a possible duplicate": both halves ticked, the pair is still a group and still held; Not duplicates settles it.
    const ticked = { reviewed: true, reviewedBy: 'Ashley Jerome', valReviewed: true };
    const pairHeld = (o) => { const a = ITEM(Object.assign({}, ticked, o)), b = ITEM(Object.assign({ stableId: 'k2', driveFileId: 'Fk2', ts: 2 }, ticked, o));
      RV.jobs.length = 0; RV.jobs.push(EST()); RV._photoRefs[7] = [a, b];
      const r = attempt(() => { const fc = RV.invAcceptCtx(RV.jobs[0], [a, b]); return [!!fc.dup.k1, RV.invLineHold(a, fc)]; }); return r.ok ? r.val : r.err; };
    eq(pairHeld({}), [true, 'duplicate'], '⚠⚠ "A tick never settles … a possible duplicate": both halves ticked, the pair stays a possible duplicate');
    eq(pairHeld({ dupOK: true }), [false, ''], '…Not duplicates does');
    {
      // "Renaming one does not settle it": a pair Agent One named alike stays a pair through a name corrected on the desk (agentName).
      const A = ITEM({ agentName: 'Kitchen utensils, drawer', objectName: 'Henckels kitchen knives', valNameAt: 'Henckels kitchen knives', namedBy: 'desk' });
      const B = ITEM({ stableId: 'k2', driveFileId: 'Fk2', ts: 2, agentName: 'Kitchen utensils, drawer' });
      RV.jobs.length = 0; RV.jobs.push(EST()); RV._photoRefs[7] = [A, B];
      const r = attempt(() => { const fc = RV.invAcceptCtx(RV.jobs[0], [A, B]); return [!!fc.dup.k1, RV.invLineHold(A, fc)]; });
      eq(r.ok ? r.val : r.err, [true, 'duplicate'], '⚠⚠ "Renaming one does not settle it": the renamed half is still a possible duplicate');
      // "(the box turns bronze)": both halves ticked, each box ticked in bronze, and neither counts as checked.
      const T1 = ITEM(Object.assign({}, ticked)), T2 = ITEM(Object.assign({ stableId: 'k2', driveFileId: 'Fk2', ts: 2 }, ticked));
      RV._photoRefs[7] = [T1, T2];
      const b = attempt(() => { const fc = RV.invAcceptCtx(RV.jobs[0], [T1, T2]); return [RV._invRevBoxHtml(7, T1, fc), RV.invLineReviewed(T1, fc)]; });
      ok(b.ok && / checked/.test(b.val[0]) && /accent-color:var\(--bronze\)/.test(b.val[0]), '⚠⚠ "the box turns bronze": ticked, in bronze');
      eq(b.ok ? b.val[1] : b.err, false, '…and not checked');
      const N = ITEM(Object.assign({ objectName: '', valNameAt: '' }, ticked));
      RV._photoRefs[7] = [N];
      eq(attempt(() => RV.invLineReviewed(N, RV.invAcceptCtx(RV.jobs[0], [N]))).val, false, '⚠ "an item with no name": a tick does not settle it either');
    }
    // "On a disputed estate every item either agent named or valued takes it": a line named and decided on the desk is
    // reviewed by that act; one Agent Two valued, or Agent One named, waits for the tick.
    const DIS = EST({ gateDispute: 'yes' });
    eq([look(DIS).reviewed, look(DIS, { namedBy: 'desk' }).reviewed, look(DIS, { namedBy: 'desk', valuedBy: 'desk', valLow: undefined, valHigh: undefined, valConf: undefined }).reviewed],
      [false, false, true], '⚠ "every item either agent named or valued": Agent One\'s name, Agent Two\'s value, and the desk\'s own line reviewed by its act');
    // "Bronze unsure marks a guess, even on a grey tick" (Q108, Anthony: "Show it, no tick"; never Agent Two's range where counsel
    // values, main's 2026-10-26, held below): on a line that stands, either
    // agent's guess still shows; the tick takes it.
    const g2 = look(EST(), { valConf: 'low' }), g1 = look(EST(), { agentConf: 'low', valuedBy: 'desk', valLow: undefined, valHigh: undefined, valConf: undefined });
    eq([g2.stands, g2.unsure], [true, true], '⚠⚠ "even on a grey tick": Agent Two guessing alone, the line stands and reads unsure');
    eq([g1.stands, g1.unsure], [true, false], '⚠⚠ "until your tick or a value you type": Agent One\'s guess under a figure typed: stands, settled (the second review)');
    eq(look(EST(), { valConf: 'low', valuedBy: 'desk', valLow: undefined, valHigh: undefined }).unsure, false, '…and Agent Two\'s guess under a figure typed');
    eq(look(EST(), Object.assign({ valConf: 'low' }, ticked)).unsure, false, '…until the tick');
    // "On a disputed estate every item takes it."
    eq([look(EST({ gateDispute: 'yes' })).stands, look(EST({ svc: 'contested_probate' })).stands], [false, false],
      '⚠ on a disputed estate, or a contested probate, even the drawer waits for the tick');
    // The tick itself: one look for the name, the count and the value.
    has(code(fn('_invStampLineReviewed')), '_avStampReviewed(ref, job)', 'the tick accepts Agent Two’s figure with the line');
    has(code(fn('_renderInvRow')), '_invRevBoxHtml(jid, ref, _ac)', 'the row draws its Reviewed box…');
    has(code(fn('_invRevBoxHtml')), '>Reviewed</label>', '…the row’s Reviewed box');
    has(code(fn('_renderInvRow')), 'if (invLineUnsure(ref, job))', 'unsure on the row where the agents were guessing');
    has(code(fn('_renderInvRow')), '>unsure</span>', '…in those words');
    has(code(fn('_invEdit')), "if (key === 'objectName') agentValueAfterRename(jobId, stableId);", 'a name changed is valued again by itself');
    // "press Unsure first" (main, 2026-10-26): the Needs you strip carries an Unsure count, third, whose test is the row's own hint
    // (invLineUnsure, the real rule, handed the job). It gathers the guessed items and ticks nothing: a filter, never a review.
    const U = lift(['invLineUnsure'], {});
    const WF = sandbox({ vars: ['INV_WORK_FLAGS'], stubs: { invLineUnsure: (r, j) => U.invLineUnsure(r, j) } }).INV_WORK_FLAGS || [];
    const unsureFlag = WF.filter((f) => f.key === 'unsure')[0];
    eq(WF.slice(0, 3).map((f) => f.key), ['unnamed', 'unreviewed', 'unsure'], 'Needs you: Unnamed shots, Not reviewed, then Unsure');
    eq(unsureFlag && unsureFlag.label, 'Unsure', 'the count reads Unsure');
    const guess = { stableId: 'g', namedBy: 'agent', objectName: 'Vase, likely Murano', agentConf: 'low', disposition: '' };
    const lowFig = { stableId: 'f', namedBy: 'desk', objectName: 'Mirror', disposition: '', valuedBy: 'agent', valLow: 20, valHigh: 60, valConf: 'low' };
    ok(!!unsureFlag && unsureFlag.test(guess, LIVING()) === true, 'it counts Agent One’s guess at a name');
    ok(!!unsureFlag && unsureFlag.test(Object.assign({}, guess, { reviewed: 1 }), LIVING()) === false, '…until the line is reviewed');
    ok(!!unsureFlag && unsureFlag.test(Object.assign({ fmv: 40 }, lowFig), LIVING()) === true, 'it counts Agent Two’s low-confidence figure');
    ok(!!unsureFlag && unsureFlag.test(lowFig, ESTATE({ docTier: 'contents' })) === false, '…never where counsel values: the job reaches the rule');
    // "even on a grey tick" (Q108): an item standing as the agents left it, Agent Two guessing, is gathered too; a tick takes it.
    const standing = ITEM({ valConf: 'low' });
    eq([look(EST(), { valConf: 'low' }).stands, !!unsureFlag && unsureFlag.test(standing, EST()), !!unsureFlag && unsureFlag.test(Object.assign({}, standing, ticked), EST())],
      [true, true, false], '⚠⚠ Unsure gathers an item standing on a grey tick where Agent Two guessed, and lets it go once ticked');
    // "ticking nothing": pressing it sets the filter (every day) and writes nothing on an item.
    const FL = sandbox({ fns: ['setInvFlag'], stubs: { _invFilter: { flag: '', when: 'today' }, renderInventoryTab: () => {} } });
    const before = JSON.stringify(standing);
    attempt(() => FL.setInvFlag('unsure'));
    eq([FL._invFilter.flag, FL._invFilter.when], ['unsure', 'all'], 'pressing Unsure shows the guessed items, every day');
    eq(attempt(() => { unsureFlag.test(standing, EST()); return JSON.stringify(standing) === before; }).val, true, '…and its test writes nothing on the item: a filter, never a tick');
    has(t, 'Correct the name and count, choose where it goes, type who takes it if it leaves, check the value against what you saw. Nothing flagged? No tick, whatever its value: a grey tick. Flagged? One Reviewed tick covers it: a note on it or its photo, a firearm or ammunition, an appraisal not yet in or waived, a bequest, a dispute, both agents unsure. Hover the box for every reason. A tick never settles an item with no name or a possible duplicate (the box turns bronze): name it, or Remove or Not duplicates. On a disputed estate every item either agent named or valued takes it. Bronze unsure marks a guess, even on a grey tick, until your tick or a value you type. Press Unsure first and read them hardest. A maker added to the name reprices it.', 'as the page says');
    lacks(t, 'One Reviewed tick covers it all: a note, a possible duplicate', '⚠ never that a tick covers a possible duplicate (the second review)');
    has(t, 'Not yet decided, room by room: name, where it goes, who takes it, value; tick what is flagged.', 'and the pocket card');
    lacks(t, 'On a disputed estate every item takes it.', '⚠ never every item: a line named and decided on the desk is reviewed by that act');
    lacks(t, '$100 needs no tick', '⚠ the $100 line is gone from the page');
    lacks(t, 'counts as reviewed until Agent Two values it', '…and so is the name typed that waited for a tick once valued (main’s sentence, which the flagged-only rule makes untrue)');
    // "Papers print marked IN PROGRESS until every item is decided, valued and, where flagged, ticked", on the real stamp.
    const stamp = (items, job) => { RV.jobs.length = 0; RV.jobs.push(job); RV._photoRefs[job.id] = items;
      const r = attempt(() => RV._invProgressStamp(items, { fc: RV.invAcceptCtx(job, items) })); return r.ok ? decode(r.val.replace(/<[^>]+>/g, ' ')) : 'threw: ' + r.err; };
    const two = (o) => [ITEM(), ITEM(Object.assign({ stableId: 'k3', driveFileId: 'Fk3', ts: 3, objectName: 'Brass table lamp' }, o || {}))];
    // Q107 (Anthony: "One 'List read' press"): where Agent Two's values stand unticked, REVIEWED waits for the list read since
    // its last change, and names it. A fixed day (noon Eastern), never the clock.
    const AT = Date.UTC(2026, 9, 26, 16, 0);
    const eastern = (f) => { const prev = process.env.TZ; process.env.TZ = 'America/New_York'; try { return f(); } finally { process.env.TZ = prev; } };
    // A read is the fingerprint of the list it saw (invListSeen), recorded as the press records it: `items` as the list.
    const READ_OF = (items) => { RV._photoRefs[7] = items; return { invRead: { at: AT, by: 'Anthony Graziano', seen: RV.invListSeen(7) } }; };
    has(stamp(two(), EST()), 'IN PROGRESS — 2 accepted as valued; the list not yet read', '⚠⚠ every item decided, valued and nothing flagged, the list not read: IN PROGRESS');
    { const L = two(); has(eastern(() => stamp(L, EST(READ_OF(L)))), 'REVIEWED — read by Anthony Graziano, October 26, 2026; 2 accepted as valued', '…and read: REVIEWED, naming the read'); }
    { const L = two(), R = READ_OF(L); L[1].fmv = 55; has(eastern(() => stamp(L, EST(R))), 'IN PROGRESS — 2 accepted as valued; the list not yet read since it last changed', '⚠ a change after the read: IN PROGRESS again'); }
    has(stamp(two(ticked).map((r) => Object.assign(r, ticked)), EST()), 'REVIEWED — all 2 items', 'every value ticked, no value standing unticked: REVIEWED with no read');
    const many = [];
    for (let i = 0; i < 42; i++) many.push(ITEM(Object.assign({ stableId: 'c' + i, driveFileId: 'Fc' + i, ts: 10 + i, objectName: 'Checked thing ' + i }, ticked)));
    for (let i = 0; i < 158; i++) many.push(ITEM({ stableId: 's' + i, driveFileId: 'Fs' + i, ts: 100 + i, objectName: 'Standing thing ' + i }));
    has(eastern(() => stamp(many, EST(READ_OF(many)))), 'REVIEWED — read by Anthony Graziano, October 26, 2026; 42 items checked; 158 accepted as valued', '⚠⚠ the stamp the page quotes, word for word');
    has(t, 'Where an Agent Two value stands unticked, they also wait for the list to be read, then print REVIEWED with who read it and when.', 'as the page says');
    has(stamp(two({ disposition: 'Undecided' }), EST()), 'IN PROGRESS', 'one item undecided: IN PROGRESS');
    has(stamp(two({ fmv: '', valLow: undefined, valHigh: undefined }), EST()), 'IN PROGRESS', 'one item not valued: IN PROGRESS');
    has(stamp(two({ flagDisputed: true }), EST()), 'IN PROGRESS', 'one flagged and unticked: IN PROGRESS');
    { const L = two({ flagDisputed: true, reviewed: true, reviewedBy: 'Ashley Jerome', valReviewed: true }); has(eastern(() => stamp(L, EST(READ_OF(L)))), 'REVIEWED', '…and ticked, the list read: REVIEWED'); }
    // "The Court Inventory and the Trust Schedule stay FINAL; their count of Agent Two's values is bronze until the list is read" (Q109).
    const pill = (items, job) => { RV.jobs.length = 0; RV.jobs.push(job); RV._photoRefs[7] = items;
      const r = attempt(() => RV._avUnreviewedStamp(items, { fc: RV.invAcceptCtx(job, items) })); return r.ok ? r.val : 'threw: ' + r.err; };
    { const L = two(); has(pill(L, EST()), 'background:#8a6d3b', '⚠⚠ "bronze until the list is read"');
      has(decode(pill(L, EST())), '2 values as Agent Two left them; list not yet read by Havellin', '…in its words');
      const R = READ_OF(L); has(pill(L, EST(R)), 'background:#6b6b6b', '…grey once it is'); }
    ['printCourtInventory', 'printTrustSchedule'].forEach((p) => lacks(code(fn(p)), 'invListRead', '"stay FINAL": the read never decides ' + p + '\'s status'));
    // "Last, read the whole list against what you saw and press ✓ I've read the list on the Inventory Review bar: it records who
    // and when, for the list as it stood. Change a name, category, count, value, destination, recipient, condition or room
    // after, or remove an item, on any device, and it says changed since: press it again. A tick changes nothing. While the
    // list is loading or the sheet is unreachable, the press waits." The read is the list's fingerprint (invListSeen).
    has(code(fn('_renderInvWorkbar')), '_invListReadHtml(job, st)', 'the press is on the Inventory Review bar');
    const RJ = EST();
    RV.jobs.length = 0; RV.jobs.push(RJ); RV._photoRefs[7] = two();
    // The line is drawn only where an item stands as Agent Two left it (`accepted`): a list a person checked asks no read.
    const fresh = attempt(() => decode(RV._invListReadHtml(RJ, { total: 2, accepted: 2, complete: true }).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim());
    eq(attempt(() => decode(RV._invListReadHtml(RJ, { total: 2, accepted: 0, complete: true }).replace(/<[^>]+>/g, ' ')).trim()).val, '', '…and nothing where every item was checked by a person');
    eq(fresh.ok ? fresh.val : fresh.err, 'List not read yet · ✓ I’ve read the list', 'unread: the line and the press, in its words');
    RV.localStorage.setItem('hav_device_user', 'Anthony Graziano');
    RV.__saved = 0;
    const pressed = attempt(() => RV.invMarkListRead(7));
    ok(pressed.ok, 'the press runs (' + (pressed.err || 'ok') + ')');
    eq([RJ.invRead && RJ.invRead.by, typeof (RJ.invRead && RJ.invRead.at), RV.__saved, RV.__savedJob === RJ], ['Anthony Graziano', 'number', 1, true],
      '⚠⚠ "it records who and when": the device\'s user and the time, on the job, saved as a person\'s edit');
    eq(RJ.invRead && RJ.invRead.seen, attempt(() => RV.invListSeen(7)).val, '⚠⚠ "for the list as it stood": the list\'s fingerprint, recorded with it');
    RJ.invRead = { at: AT, by: 'Anthony Graziano', seen: RV.invListSeen(7) };
    const lineNow = () => eastern(() => { const r = attempt(() => decode(RV._invListReadHtml(RJ, { total: 2, accepted: 2, complete: true }).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()); return r.ok ? r.val : r.err; });
    eq(lineNow(), '✓ List read by Anthony Graziano, October 26, 2026', 'read: green, naming who and when, with no press');
    // "Change a name, category, count, value, destination, recipient, condition or room after, or remove an item, on any device":
    // each unreads it; "A tick changes nothing".
    const base2 = RV._photoRefs[7];
    const changed = (mutate) => { const L = base2.map((r) => Object.assign({}, r)); mutate(L); RV._photoRefs[7] = L; const r = attempt(() => RV.invListRead(RJ).current); RV._photoRefs[7] = base2; return r.ok ? r.val : r.err; };
    [['a name', (L) => { L[1].objectName = 'Brass candlestick'; }], ['a category', (L) => { L[1].category = 'Lighting'; }], ['a count', (L) => { L[1].qty = 3; }],
     ['a value', (L) => { L[1].fmv = 55; }], ['a destination', (L) => { L[1].disposition = 'Sell'; }], ['a recipient', (L) => { L[1].channel = 'Goodwill'; }],
     ['a condition', (L) => { L[1].condition = 'Fair'; }], ['a room', (L) => { L[1].roomIdx = 2; }], ['an item removed', (L) => { L[1].deletedAt = AT + 1; }],
     ['⚠ "on any device": a change merged from another device with an older clock', (L) => { L[1].disposition = 'Junk'; L[1].updatedAt = AT - 3600000; }]]
      .forEach(([w, m]) => eq(changed(m), false, '⚠ "changed since" after ' + w));
    eq(changed((L) => { Object.assign(L[0], ticked, { updatedAt: AT + 60000 }); }), true, '⚠⚠ "A tick changes nothing" (the second review: it unread the list)');
    RV._photoRefs[7] = base2.map((r, i) => (i === 1 ? Object.assign({}, r, { fmv: 55 }) : r));
    eq(lineNow(), 'List read by Anthony Graziano, October 26, 2026 · changed since · ✓ I’ve read the list', '⚠ a change after it: "changed since", and the press again');
    RV._photoRefs[7] = base2;
    // "While the list is loading or the sheet is unreachable, the press waits."
    RV.SHEETS_SYNC_URL = 'https://sync.example.test/exec'; RV.__saved = 0; delete RJ.invRead;
    const waits = eastern(() => attempt(() => decode(RV._invListReadHtml(RJ, { total: 2, accepted: 2, complete: true }).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()));
    eq(waits.ok ? waits.val : waits.err, 'List not read yet · the list is still loading from the sheet: the press waits for it', '⚠⚠ "the press waits": while the list is loading');
    attempt(() => RV.invMarkListRead(7));
    eq([RJ.invRead, RV.__saved], [undefined, 0], '…and a press records nothing');
    RV._invCloudSeen[7] = true; RV._invCloudFailed[7] = true;
    eq(attempt(() => RV.invListReadRefusal(7)).val, 'the sheet is unreachable: this is this device’s copy', '…or while the sheet is unreachable');
    RV.SHEETS_SYNC_URL = ''; delete RV._invCloudFailed[7];
    has(t, 'Last, read the whole list against what you saw and press ✓ I’ve read the list on the Inventory Review bar: it records who and when, for the list as it stood. Change anything printed about an item after, or remove one, anywhere, and it says changed since: press it again. A tick changes nothing. While the list is loading, the sheet is unreachable or Agent One or Agent Two is at work, the press waits.', 'as the page says');
    eq(sandbox({ vars: ['INV_READ_FIELDS'] }).INV_READ_FIELDS.join(','), 'objectName,category,qty,fmv,valLow,valHigh,valSource,disposition,channel,condition,roomIdx,valNote,valDate,apprId,apprDoc,assetTrack,flagExempt,serial',
      '…"anything printed about an item": what the press reads is what the papers print of a line (the merge\'s review added the basis, the date, the appraiser, the track, the exempt mark and the serial)');
    RV._agRun = { 7: { running: true } };
    eq(attempt(() => RV.invListReadRefusal(7)).val, 'the agents are still at work on this list', '…and while Agent One or Agent Two is at work, as the page says');
    RV._agRun = {};
    // "A removed item's notes move to the next item from its photo" and "a note on it or its photo" (Agent One's notes, above),
    // driven: main's rule (agentNoticesOn, 2026-10-26) carries every note a removed photograph line held, a Look at this as much
    // as a Firearm, to the first item still listed off the photograph; each holds the items off it (photonote) while it is open.
    {
      const shelf = (o2, o3) => [ITEM({ stableId: 'p1', driveFileId: 'Fp1', objectName: 'Closet shelf', valNameAt: 'Closet shelf', deletedAt: 9,
          agentNotices: [{ kind: 'firearm', text: 'a rifle case' }, { kind: 'other', text: 'a mark on the box' }] }),
        ITEM(Object.assign({ stableId: 'p2', driveFileId: 'Fp1', derivedFrom: 'p1', ts: 2, objectName: 'Hard rifle case', valNameAt: 'Hard rifle case' }, o2 || {})),
        ITEM(Object.assign({ stableId: 'p3', driveFileId: 'Fp1', derivedFrom: 'p1', ts: 3, objectName: 'Wooden box', valNameAt: 'Wooden box' }, o3 || {}))];
      const read = (S) => { RV.jobs.length = 0; RV.jobs.push(EST()); RV._photoRefs[7] = S;
        const r = attempt(() => { const fc = RV.invAcceptCtx(RV.jobs[0], S);
          return [RV.agentNotices(7, [S[1], S[2]]).map((n) => [n.kind, n.ref && n.ref.stableId]), RV.invLineHold(S[1], fc), RV.invLineHold(S[2], fc)]; });
        return r.ok ? r.val : r.err; };
      eq(read(shelf()), [[['firearm', 'p2'], ['other', 'p2']], 'photonote', 'photonote'],
        '⚠⚠ the shelf removed, its Firearm note and its Look at this both ride on the next item from the photo, and hold every item off it');
      eq(read(shelf(ticked, ticked)), [[['firearm', 'p2']], 'photonote', 'photonote'],
        '⚠ every item off the photo reviewed: the Look at this goes quiet, the Firearm stays on the list');
      { const S = shelf(ticked, ticked); read(S);
        eq(attempt(() => [S[1], S[2]].map((r) => RV.invLineReviewed(r, RV.invAcceptCtx(RV.jobs[0], S)))).val, [true, true],
          '…and a ticked item off it is reviewed (the tick settles the note on its photo)'); }
      RV._photoRefs[7] = [];
    }
    has(t, 'Read the whole list, then I’ve read the list.', 'and the pocket card');
    // The selection.
    has(code(fn('_renderInvGroupHead')), '>Select all</button>', 'Select all on the group');
    const bulk = code(fn('_renderInvBulk'));
    has(bulk, "menu('disposition', 'Set disposition…'", 'Set disposition…');
    has(bulk, '>Remove lines</button>', 'Remove lines');
    has(t, 'Remove lines takes them off the list and keeps the photos; Set disposition… gives them all one destination, such as Donate.', 'as the page says');
    // The Needs you counts and the earlier days.
    has(code(fn('setInvFlag')), "if (_invFilter.flag) _invFilter.when = 'all';", 'a Needs you count covers every day: pressing one shows every day');
    has(code(fn('_renderInvFlagStrip')), '>Needs you</span>', 'the Needs you row');
    const E = sandbox({ fns: ['_invEarlierHintHtml'], stubs: { _invEarlierUndecided: () => 1 } });
    eq(E._invEarlierHintHtml({ id: 7 }, []), '1 from earlier days still undecided: press All', 'the earlier-days note, in its words');
    has(t, 'While Today is on, the filter row names what earlier days left undecided (1 from earlier days still undecided: press All): press All and finish them.', '⚠ the page quotes it exactly');
    has(code(fn('_renderInvFilterRow')), '_invEarlierHintHtml(job, all)', 'in the filter row');
  }

  group('the row and its record');
  {
    const FD = sandbox({ vars: ['FIELD_DISPOSITIONS'] }).FIELD_DISPOSITIONS;
    const map = {}; FD.forEach((d) => { map[d.label] = d.disposition; });
    eq([map['New home'], map['To a person'], map.Remove], ['Move', 'Distribute', 'Junk'], 'the camera’s three renamed words');
    has(t, 'The camera’s words, three renamed (New home is Move, To a person is Distribute, Remove is Junk), plus Auction and Consign, other ways to sell, and Hold, kept back for now.', 'as the page says');
    // The row's select offers the camera's words and three more the camera does not (guide review, 2026-10-24: the page named
    // only the camera's, and Auction, Consign and Hold sat on every row unexplained).
    has(code(fn('_invInput')), "_invDispOptions(job, v).map(", 'the row’s Where it goes is _invDispOptions');
    const DO = sandbox({ fns: ['_invDispOptions', '_jobHasDestination'], vars: ['INV_DISPOSITIONS'] });
    const offered = attempt(() => DO._invDispOptions({ id: 7, svc: 'downsizing_move', destAddr: '1 Ocean Blvd' }, ''));
    ok(offered.ok, 'the options answer (' + (offered.err || 'ok') + ')');
    const cam = FD.map((d) => d.disposition).filter(Boolean);
    eq(offered.ok ? offered.val.filter((d) => cam.indexOf(d) < 0) : null, ['Auction', 'Consign', 'Hold'], '⚠⚠ beyond the camera’s words the row offers exactly Auction, Consign and Hold…');
    eq(offered.ok ? cam.filter((d) => offered.val.indexOf(d) < 0) : null, [], '…and every camera word');
    eq(sandbox({ vars: ['INV_SALE_DISPOSITIONS'] }).INV_SALE_DISPOSITIONS.slice().sort(), ['Auction', 'Consign', 'Sell'], 'Auction and Consign sell, as Sell does');
    eq(Object.keys(sandbox({ vars: ['INV_PLAN_CHANNEL_KINDS'] }).INV_PLAN_CHANNEL_KINDS), ['Donate', 'Junk', 'Auction', 'Sell'], 'the kinds that fill themselves in from the one confirmed vendor');
    has(t, 'With one vendor of that kind confirmed on the Job Plan, it fills itself in.', 'as the page says');
    // 2026-10-24: + Close-up, a close-up missed in the house, is a label over the record's chooser (closeup-later.test.js).
    ['&#10133; Another item in this photo</button>', '&#10133; Close-up</label>', 'Remove line</button>', '_invPhotoOpenHtml(jid, ref, 240)'].forEach((w) => has(code(fn('_renderInvPanel')), w, 'the record carries ' + decode(w.replace(/<[^>]+>/g, ''))));
    // 2026-10-26b (Anthony: "maybe we just need a little link under each photo"): the record's photograph and each close-up open in Drive.
    has(code(fn('_invPhotoOpenHtml')), '>Open in Drive &#8599;</a>', 'each photograph in a record carries a small Open in Drive link');
    has(code(fn('_invCloseUpTileHtml')), '_invPhotoOpenHtml(jobId, d, 120)', 'a close-up\'s tile too');
    has(t, 'Opens it in Drive. So do the record’s photos.', 'as the page says');
    // 2026-10-26b, on the page at Anthony's ask ("update the evening desk with any relevant changes"): each held to its code.
    has(t, 'Each photo is graded Excellent, Good, Fair or Poor. If it is wrong, change it in the ▾ record; yours is never written over. Blank means the photo could not show it.', 'condition, as the page says');
    eq(sandbox({ vars: ['AGENT_CONDITIONS'] }).AGENT_CONDITIONS, ['Excellent', 'Good', 'Fair', 'Poor'], '…the grades the agents give');
    has(code(fn('_invEdit')), "if (key === 'condition') ref.condBy = 'desk';", '…and a grade typed in the record is never written over');
    has(t, 'Seven plates at $75 read $11 each, $77; under a dollar each keeps its cents. A value you type stays as typed. A value well under what dealers ask is not wrong: asking is not selling; a close-up of a maker’s mark moves it.', 'whole dollars each, as the page says');
    const W = sandbox({ fns: ['agentValueWhole', 'roundCents'] });
    eq([W.agentValueWhole(75, 7), W.agentValueWhole(45, 60)], [77, 45], '…$11 × 7 = $77; sixty at 75¢ stay $45');
    has(t, 'Tick its rows and press Re-value on the selection bar. Values you or an appraiser typed are left alone.', 'Re-value on the selection bar, as the page says');
    has(code(fn('_renderInvBulk')), '>Re-value</button>', '…the selection bar carries it');
    has(code(fn('invBulkRevalue')), "r.valuedBy !== 'agent'", '…and leaves a figure a person or an appraiser recorded');
    has(t, 'Another item in this photo (a blank row for something else in the same photo; it never opens the camera)', 'Another item, as the page says');
    has(code(fn('invSplitItemClick')), 'added for another thing in this photograph', '…the toast says what it added');
    has(code(fn('_renderInvWorkbar')), "'every flagged item is checked'", 'papers print marked IN PROGRESS until every flagged item is checked (the work bar, 2026-10-26)');
    has(code(fn('_renderInvWorkbar')), '&mdash; they are never withheld.', '…never withheld');
    has(t, 'Papers print marked IN PROGRESS until every flagged item is checked; they are never held back.', 'as the page says (the stamp itself is driven above)');
    lacks(t, 'until every item is decided, valued and, where flagged, ticked', '⚠ never that every item must be decided and valued (a ticked Undecided item counts; the second review)');
    has(t, 'The Court Inventory and the Trust Schedule stay FINAL; their count of Agent Two’s values is bronze until the list is read.', 'and the schedules (Q109, driven above)');
    has(code(fn('_renderInvWorkbar')), "'+ Add line item'", '+ Add line item');
    const imp = code(fn('_renderInventoryImportPanel'));
    has(imp, 'From the Estimate Walkthrough', 'the vehicles still to bring in…');
    has(imp, '>Add &rarr;</button>', '…each with Add →');
    has(code(fn('renderInventoryTab')), '_renderInvWorkbar(job, all)\n    + _renderInventoryImportPanel(jobId)', '…under the Inventory Review bar');
    has(t, 'A car or boat from the walkthrough waits under the Inventory Review bar (From the Estimate Walkthrough) until you press Add →.', 'as the page says');
    const order = sandbox({ vars: ['INV_GROUP_ORDER', 'INV_UNDECIDED'] });
    eq([order.INV_GROUP_ORDER[0], order.INV_UNDECIDED], ['', 'Not yet decided'], 'Not yet decided is the first group');
    has(t, 'Keep working Not yet decided from the top; it shrinks as you go.', 'as the page says');
  }

  // ═══ THE BARS' CARDS ═══
  group('inside Releases: the request, Record the signed request, the sign-out rows, the signed approvals, the bequests');
  {
    const rc = code(fn('_renderInvReleasesCard'));
    const heads = ["head('Approval request')", "head('Leaving the property &middot; sign out on the iPad')", "head('Signed release approvals')"].map((h) => rc.indexOf(h));
    ok(heads.every((x) => x > 0) && heads[0] < heads[1] && heads[1] < heads[2], 'the card’s three sections, in that order (' + heads.join(', ') + ')');
    const g = sectionHtml('4. The four bars');
    const gi = ['<strong>Approval request.</strong>', '<strong>Leaving the property &middot; sign out on the iPad.</strong>', '<strong>Signed release approvals.</strong>'].map((h) => g.indexOf(h));
    ok(gi.every((x) => x > 0) && gi[0] < gi[1] && gi[1] < gi[2], '⚠ the page names them by their headings, in the same order (' + gi.join(', ') + ')');
    const card = code(fn('approvalRequestCardHtml'));
    has(card, '&#128231; Send request', 'Send request');
    has(card, '&#10003; I&rsquo;ve sent it', 'I’ve sent it');
    has(card, "'Record the signed request'", 'Record the signed request');
    // The recipients, on the real rule.
    const P = lift(['approvalRequestRecipients'], {});
    const est = attempt(() => P.approvalRequestRecipients(ESTATE({ probateAttyEmail: 'ann@lowe.law', coFiduciaries: [{ id: 'c1', name: 'Nora Adler', email: 'nora@adler.example' }] })));
    ok(est.ok, 'the recipients answer (' + (est.err || 'ok') + ')');
    eq(est.ok ? [est.val.to, est.val.cc.slice(0, 1)] : null, [['ruth@adler.example', 'nora@adler.example'], ['ann@lowe.law']], 'to every representative with an email, the estate attorney copied');
    const liv = attempt(() => P.approvalRequestRecipients(LIVING()));
    eq(liv.ok ? liv.val.to : null, ['meg@ellis.example'], 'to the client on living work');
    has(t, 'Send request makes a Gmail draft with the request as a PDF: to every representative with an email, the estate attorney copied, or to the client on living work.', 'as the page says');
    // DocuSign on an estate (2026-10-26c): the card's own label, and the signatures recorded by the arrival check, not a press.
    has(card, "'&#9997;&#65039; Send through DocuSign'", 'Send through DocuSign is the card\'s label');
    has(code(fn('approvalEnvelopeApply')), 'invApplyApproval(', '…and its signatures are written on the lines by themselves');
    has(t, 'On an estate Send through DocuSign leads: everyone initials and signs on screen, and the signatures record themselves.', 'as the page says');
    // What a living request carries (2026-10-26; Anthony: "Drop it, firearms aside"), on the real rule.
    const W = lift(['invWrittenReleaseNeeded'], {});
    const need = (o) => attempt(() => W.invWrittenReleaseNeeded(Object.assign({ stableId: 'x', label: 'inventory' }, o), LIVING({ tc: 'Ashley Jerome' }))).val;
    eq([need({ disposition: 'Donate', channel: 'Goodwill' }), need({ disposition: 'Distribute', channel: 'Tom', category: 'Firearms' }),
      need({ disposition: 'Sell', channel: 'Ashley Jerome' })], [false, true, true], 'living: the client’s word for a donation; a firearm and an item to the concierge on a request');
    has(t, 'The client’s word approves what leaves. Only a firearm, or an item going to someone who works with Havellin, goes on a request for them to sign.', 'as the page says');
    // Record the signed request: offered once the request has gone; opens on that request's items still unsigned, each ticked.
    has(card, "var recBtn = !approvalRequestRecordRefusal(job, S) ?", 'offered by its one rule');
    has(code(fn('approvalRequestRecordRefusal')), "'The request has not gone yet: send the draft and tap I’ve sent it first.'", '…once the request has gone');
    has(code(fn('invRecordRequestApproval')), 'S.req.stableIds.map(String).filter(function(id){ return open.indexOf(id) >= 0; })', 'it opens on the items the request carried that still wait for a signature');
    const dlg = code(fn('invRecordApproval'));
    has(dlg, 'id="ia-line-\' + i + \'" checked', 'each ticked');
    eq(sandbox({ vars: ['INV_REQ_UNTICK_TXT'] }).INV_REQ_UNTICK_TXT, 'Untick any line the signed copy struck out.', 'the dialog says to untick what the signed copy struck out');
    has(dlg, 'Date of the signed approval', 'the date on the paper');
    has(dlg, '>Record approval</button>', 'Record approval');
    has(code(fn('invSaveApproval')), "'File the signed request'", 'then File the signed request');
    has(t, 'From then on Record the signed request waits here for the signed copy.', 'the page says where it waits');
    has(t, 'Record the signed request opens on the items that request carried and that still wait for a signature, each ticked. Untick any the signed copy struck out, tick who signed, set the date on the paper, press Record approval, then File the signed request.', 'and what it does');
    // A partial approval is recorded and the rest stay on the next request.
    has(dlg, 'the lines stay on the next request until all', 'one representative’s signature is kept, the items stay on the next request');
    has(t, 'Only one of two representatives signed? Record it anyway. Those items stay on the next request until everyone has signed.', 'as the page says');
    // More ▾'s papers on screen first (2026-10-26): the viewer, its Print / Save PDF.
    has(code(fn('printAsFoundRecord')), '{ view: true, job: job, label: ', 'a More ▾ paper opens in the viewer');
    has(SRC, 'onclick="printDocViewer()">&#128424; Print / Save PDF</button>', 'its Print / Save PDF');
    has(t, 'Those under More ▾ open on screen first: Print / Save PDF from there.', 'as the page says');
    // The letter, the hold for a taker and Discard draft (2026-10-26): each sentence on the code that makes it true.
    eq(sandbox({ vars: ['INV_LINE_INITIAL_MIN'] }).INV_LINE_INITIAL_MIN, 500, 'one initial per group under $500');
    has(code(fn('printApprovalRequest')), '!invReleaseRecipientNamed(r) && !invRatificationOwed(r, job)', 'an item with nobody to take it is held off the request');
    has(card, "' for somebody to be named to take '", 'and the card counts them');
    has(card, "'Discard draft'", 'Discard draft');
    has(card, 'changed after it was made (where it goes, who takes it or its value). Not sent yet? Discard draft, then send a fresh request.', 'a draft whose item changed: the card says so');
    has(t, 'It reads as a letter, one initial per group under $500. Items with nobody in Who takes it wait off it, and the card counts them. Changed an item before sending? The card says so: press Discard draft, delete it in Gmail and send again.', 'as the page says');
    // The sign-out rows.
    const row = code(fn('_leavingRowHtml'));
    has(row, "'Sign out ' + g.ready.length + ' to ' + g.taker", 'Sign out N to …');
    has(row, "'Check ' + g.ready.length + ' back in from ' + g.taker", 'Check N back in from …');
    has(row, "'Print receipt'", 'Print receipt');
    has(SRC, 'onclick="signoutFileFromPad()">Sign and file</button>', 'the sheet’s Sign and file');
    has(SRC, '>Photograph a signed sheet instead', 'and Photograph a signed sheet instead');
    has(t, 'Sign out N to … opens the sheet; they sign with a finger and Sign and file puts it in Drive. Back from an appraiser: Check N back in from …. On an estate, Print receipt prints a paper receipt for a person instead.', 'as the page says');
    // Who has a row (guide review, 2026-10-24: the page said every person and vendor): a vendor selling the item, a named charity,
    // an appraiser; a person only on an estate; never a hauler taking the junk. On the real signoutLineKind.
    {
      const SK = lift(['signoutLineKind'], {});
      const kind = (j, o) => { const r = attempt(() => SK.signoutLineKind(LINE('a', o), j)); return r.ok ? r.val : r.err; };
      eq(['Sell', 'Auction', 'Consign'].map((d) => kind(ESTATE(), { disposition: d, channel: 'Sotheby’s' })), ['pickup', 'pickup', 'pickup'], 'a selling vendor has a row');
      eq([kind(ESTATE(), { disposition: 'Donate', channel: 'Goodwill' }), kind(LIVING(), { disposition: 'Donate', channel: 'Goodwill' })], ['donation', 'donation'], 'a named charity has a row, on either');
      eq([kind(ESTATE(), { disposition: 'Distribute', channel: 'Susan Hale' }), kind(LIVING(), { disposition: 'Distribute', channel: 'Susan Hale' })], ['receipt', ''],
        '⚠⚠ a person: a row on an estate, none on living work');
      eq(kind(ESTATE(), { disposition: 'Junk', channel: 'Haul-It' }), '', 'a hauler taking the junk: none');
      has(code(fn('signoutGroups')), "put(invOutForAppraisal(r, job) ? 'appraisal_back' : 'appraisal_out', String(a.name).trim(), r, 'ready')", 'an appraiser: a row for the hand-off and the return');
    }
    has(t, 'One row for each selling vendor, charity or appraiser taking things away, and on an estate each person, with the item numbers.', 'as the page says');
    has(t, 'No receipts from a person, no bequests.', 'living work: no receipt from a person (a charity’s receipt is still filed)');
    lacks(t, 'No receipts, no bequests.', '⚠ never that living work has no receipts at all');
    has(code(fn('signoutLineKind')), 'if (!ref || ref.deletedAt || invIsFirearm(ref)) return \'\';', 'a firearm never goes on a sheet');
    has(t, 'On an estate only items with everyone’s written approval are offered. A firearm never goes on a sheet.', 'as the page says');
    has(code(fn('signedCopyControlHtml')), "esc(label || 'File signed copy')", 'File signed copy');
    const bq = code(fn('_renderInvBequestCard'));
    ['>Beneficiaries &amp; specific bequests</div>', "'+ Add a beneficiary'", "'+ Add a specific bequest'", '>Match</button>'].forEach((w) => has(bq, w, 'the bequests card: ' + decode(w.replace(/<[^>]+>|'/g, ''))));
  }

  group('inside Values and Closing the job, and Close job');
  {
    const ro = code(fn('_renderAppraiserRoster'));
    has(ro, '>+ Add an appraiser</button>', '+ Add an appraiser');
    has(code(fn('_renderAppraisalGuardrail')), '>Waive</button>', 'Waive');
    has(code(fn('waiveAppraisal')), 'prompt(', 'Waive asks who decided, and why');
    has(code(fn('invAppraised')), "'Appraisal'", 'appraised means the report’s figure with the source Appraisal');
    has(SRC, 'Appraisal in progress', 'Appraisal in progress');
    // Q93 (2026-10-24; Anthony: the appraiser an item is sent to is its source on every job, the figure typed is the appraisal, and
    // the report goes to Drive). The page's three sentences, each held to the code that makes it true.
    has(t, 'On every job the appraiser is then its source: Appraisal · their name · pending.', 'as the page says: the appraiser is the source from the link');
    has(code(fn('invAppraisalSourceText')), "' · pending'", '…the line reads "Appraisal · <appraiser> · pending" (invAppraisalSourceText)');
    ok(!/invFiduciaryMode/.test(code(fn('invAppraisalSourceText'))) && !/invFiduciaryMode/.test(code(fn('_avTakeValue'))), '…on every job: neither the namer nor the owner rule asks whether it is an estate');
    has(t, 'When the report comes back, type its figure in Total: that is the appraisal, and the item leaves this list.', 'as the page says: the figure typed is the appraisal');
    has(code(fn('_avTakeValue')), "(figure && linked)", '…a figure typed on a linked line is the appraisal (_avTakeValue)');
    has(code(fn('_avTakeValue')), "var figure = how === 'typed' && _invHasValue(ref);", '…a figure: a blank typed is none (the Q93 review)');
    has(t, 'Then File the report on the appraiser’s row (a PDF or a photo, to the client’s Drive). Until then the row says report not filed.', 'as the page says: File the report');
    has(code(fn('_apprReportCellHtml')), "'File the report'", '…the appraiser’s row carries File the report');
    has(code(fn('_apprReportCellHtml')), 'report not filed: ', '…and names a line owed one');
    lacks(t, 'with the valuation source Appraisal', '⚠ never that the source must be set by hand (an estate’s rule until Q93)');
    const vs = code(fn('_renderValueSettings'));
    has(vs, 'invStatesEstateValues(job)', 'the valuation settings on an estate whose papers state values');
    has(vs, 'setValBasis(', 'the basis');
    has(vs, 'setEstateAVD(', 'and the date values are as of');
    has(t, 'On an estate whose papers state values: the valuation basis and the date values are as of.', 'as the page says');
    const co = code(fn('renderCloseoutBody'));
    ['a call, not a text', 'Referral ask'].forEach((w) => has(co, w, 'the close-out card: ' + w));
    has(SRC, '&#9993; Draft review request</button>', '✉ Draft review request');
    has(t, 'The satisfaction call (a call, not a text), ✉ Draft review request, the referral ask, and stars for every vendor used.', 'as the page says');
    lacks(code(fn('_renderContentsCard')), '>Print<', 'the Contents Record card has no Print…');
    has(code(fn('invPrimaryDoc')), 'contents', '…it prints from the Inventory Review bar, as the living job’s main paper');
    has(code(fn('_renderLedgerCards')), '_renderSignedSchedulesCard(job, all)', 'the signed Court Inventory or Trust Schedule beside the ledger');
    has(SRC, ">+ Record a statement</button>", '+ Record a statement');
    has(SRC, "'File the statement'", 'File the statement');
    has(SRC, "'File charity receipt'", 'File charity receipt');
    const cb = code(fn('jobCloseBlockers'));
    ['unratedVendorsForJob(j)', 'accessCloseBlocker(j)', 'openIncidents(j)'].forEach((w) => has(cb, w, 'Close job refuses on ' + w));
    has(t, 'Close job, in the band, refuses until every vendor used is rated, every key is returned or recorded lost, and no incident is open.', 'as the page says');
    const tr = code(fn('applyJobTransition'));
    ['ledgerCloseFlag(', 'closeOpenWorkFlag('].forEach((w) => has(tr, w, 'and names, without refusing: ' + w));
    has(code(fn('activateOrCycle')), 'fileDispositionLedger(jobId, { auto: true }); fileContentsRecord(jobId, { auto: true });', 'closing files the closing papers by itself');
    has(t, 'Closing files the closing papers to Drive by itself.', 'as the page says');
  }

  group('Home Prep, before you sit down, the phone, the rules');
  {
    has(code(fn('jobTimelineActions')), "label: '&#9654; Book the vendors'", 'Home Prep’s band: ▶ Book the vendors');
    has(code(fn('renderInventoryTab')), "cont.innerHTML = top + _sfHost('sf-host-desk', job) + renderJobAdmin(jobId, job) + closeout;", 'Home Prep: no items and no bars, Job Admin and the close-out');
    has(t, 'No items and no bars: the top of the page (the band says ▶ Book the vendors until every vendor is confirmed), Job Admin open, and the close-out under it.', 'as the page says');
    has(code(fn('_roomShotStripHtml')), '&#9888; not saved', 'a room card’s ⚠ not saved…');
    has(code(fn('_roomShotStripHtml')), '>Retry</button>', '…with Retry');
    has(SRC, "tog.innerHTML = on ? 'Field &middot; exit'", 'Field · exit');
    has(SRC, 'body.field-mode .nb:not([data-field]){display:none;}', 'field mode hides a tab without data-field…');
    has(SRC, '<button class="nb" onclick="showPanel(\'inventory\',this)">Job Admin &amp; Inv</button>', '…and this tab has none');
    has(t, 'Leave field mode (Field · exit): it hides this tab.', 'as the page says');
    // The phone: the band's timeline folds on this tab only; the selection bar is one line.
    const df = code(fn('_jtDeskFold'));
    has(df, "if (host !== 'admin') return inner;", 'the timeline folds on this tab only');
    has(df, "'<span>Timeline &middot; ' + ln.done + ' of ' + ln.total + ' done'", 'to Timeline · N of M done');
    const bulk = code(fn('_renderInvBulk'));
    has(bulk, "n + ' selected</strong>'", 'the selection bar: N selected');
    has(bulk, '>Actions &#9662;</button>', 'Actions ▾');
    has(bulk, '>Clear</button>', 'Clear');
    has(SRC, '.inv-bulk-tog{display:none;}', 'Actions shows on a phone only');
    has(t, 'On a phone the timeline under the brown band folds to one summary (Timeline · 3 of 8 done); tap it to open. The selection bar shrinks to 2 selected, Actions ▾ and Clear, its buttons under Actions.', 'as the page says');
    // The rules that never bend.
    has(code(fn('_invEdit')), 'invStaffRefused(', 'a sale or gift to a Havellin person is refused on an estate');
    has(decl('INV_RELEASE_CAUTIONS'), "{ key: 'staffRecipient', living: true,", 'and flagged on living work');
    has(code(fn('invRemoveLine')), '_invTombstoneLine(', 'Remove line keeps the photo');
    has(code(fn('voidSignedRecord')), 'prompt(', 'a paper filed in error is voided with a reason');
    // Items and papers, never "nothing" (guide review, 2026-10-24): the room's bin sends a photograph other than an as-found one to
    // the Drive bin, and the desk's Removed items says so.
    has(code(fn('discardShot')), "if (ref.label === 'before') {", 'an as-found photograph stays…');
    has(code(fn('discardShot')), "'the Drive bin for 30 days.'", '…any other can go to the Drive bin from the room…');
    has(code(fn('discardShot')), '_trashShotFiles(', '…and does');
    has(t, 'No item or paper is deleted. Remove line keeps the photo; a paper filed in error is voided with a reason.', '…so the page says items and papers');
    lacks(t, 'Nothing is deleted', '⚠ never that nothing is deleted');
    has(code(fn('invTransportBlocked')), "'nfa'", 'an NFA item never travels');
  }

  // 2026-10-24 (Anthony, off the desk): the row is columns under headings, the count and the photograph's link on it, and an
  // item split off a photo starts with that photo's destination (his pick: "Take the destination").
  group('the row’s photo and count, and a split item’s destination');
  {
    const row = code(fn('_renderInvRow')), photo = code(fn('_invRowPhotoHtml'));
    has(row, '_invRowPhotoHtml(jid, ref)', 'the row draws its photograph through the link');
    has(photo, '\'<a class="inv-c-photo inv-photo-link" href="\' + esc(ref.driveFileUrl) + \'" target="_blank"', '…a link to its file in Drive');
    has(photo, '_invThumbHTML(jid, ref, 72)', '…round the photo box, whether or not its thumbnail came');
    has(t, 'Photo Opens it in Drive.', 'as the page says');
    has(t, 'No thumbnails Nothing is lost. Reload, or tap the box for Drive.', '…and its tricky spot');
    has(row, "+ '\\',\\'qty\\',this)\">", 'the count is a box on the row, written through the one writer');
    has(t, 'Correct the name and count, choose where it goes, type who takes it if it leaves, check the value against what you saw.', 'as the page says');
    // Each and Total (2026-10-25b): one article's value and the count's, under their own headings.
    const head = code(fn('_renderInvColHead'));
    has(head, '<span class="inv-c-each">Each</span><span class="inv-c-val">Total</span>', 'the row’s Each and Total, headed');
    has(t, 'Each, Total Fair market value of one, and of all; on an estate, as of the date of death.', 'as the page says');
    has(code(fn('_invEdit')), "if (key === 'fmv' || key === 'unitVal') _avTakeValue(ref, 'typed', _invJob(jobId));", 'a figure typed in either is the desk’s, or the appraisal’s on a linked item');
    const S = sandbox({ fns: ['invSplitItemN', '_invSplitSource', '_invPhotoSource', '_getPhotoRef', '_setPhotoRef', '_invFileId', '_photoUid'],
      vars: ['_photoUidSeq', 'INV_DEFAULT_CATEGORY', 'INV_SPLIT_MAX'],
      stubs: { _photoRefs: { 7: [{ stableId: 'p', label: 'inventory', roomIdx: 1, ts: 1, driveFileId: 'F', driveFileUrl: 'u', disposition: 'Donate', channel: 'Habitat for Humanity' }] },
        savePhotoRefs() {}, _invTouch(r) { return r; }, _scheduleInventorySync() {} } });
    const made = attempt(() => S.invSplitItemN(7, 'p', 1));
    eq(made.ok && made.val[0] ? [made.val[0].disposition, made.val[0].channel] : made.err, ['Donate', 'Habitat for Humanity'], 'an item split off a photo starts with that photo’s destination');
    has(t, 'Items split off one photo start with its destination.', 'as the page says');
  }

  // ═══ THE SHORTHAND ═══
  group('the build’s shorthand stays off the page (the photography guide’s rule)');
  {
    // The button labels that carry the word "line" are the app's, and allowed by name.
    const words = t.replace(/\+ Add line item|Remove lines?|Value N lines/g, ' ');
    [['the desk', /\bthe desk\b/i], ['"line" for an item', /\blines?\b/i], ['"lot" for a group', /\blots?\b/i], ['"chip" for a destination', /\bchips?\b/i],
     ['"frame" for a photo', /\bframes?\b(?!d)/i], ['"manifest"', /\bmanifest\b/i], ['"stableId"', /stableId/], ['a function name', /\b[a-z]+[A-Z][A-Za-z]+\(/],
     ['"docState"', /docState/], ['"the agent"', /\bthe agents?\b/i], ['"fiduciary"', /\bfiduciar/i], ['"tombstone"', /tombstone/i]]
      .forEach(([what, re]) => { const m = words.match(re); ok(!m, 'no ' + what + (m ? ' ("…' + words.slice(Math.max(0, m.index - 30), m.index + 30) + '…")' : '')); });
    // Agent One and Agent Two are named because the tab names them on screen.
    has(code(fn('_agNoticesHtml')), "'Agent One raised '", 'the tab says Agent One…');
    has(code(fn('_avNoticesHtml')), "'Agent Two noted '", '…and Agent Two (its heading counts lines since 2026-10-25)');
  }

  // ═══ THE OTHER GUIDES ═══
  group('the other guides name it in their footers, as they name each other');
  {
    ['photography-guide.html', 'incident-guide.html', 'sorting-guide.html', 'packing-guide.html', 'move-day-guide.html', 'first-night-guide.html'].forEach((f) => {
      const s = read(f), foot = s.slice(s.indexOf('<footer>'), s.indexOf('</footer>'));
      has(foot, '<a href="evening-desk-guide.html">The Evening Desk</a>', f + ' names The Evening Desk in its footer');
    });
  }

  // ═══ THE DOCUMENTS ═══
  group('the manual and the playbook name the page, both copies alike');
  {
    [['concierge-guide.html', read('concierge-guide.html')], ['CONCIERGE_GUIDE.md', read('CONCIERGE_GUIDE.md')]].forEach(([f, g]) => {
      has(text(g), 'The Evening Desk', f + ' names the page');
      has(text(g), 'Read The Evening Desk', '…and the link at the top of the tab');
      has(g, 'evening-desk-guide.html', '…and links it');
      // The playbook's list of the pages says which carry a pocket card, and the pages bear it out (guide review, 2026-10-24: it
      // said every one did, the Firearms Protocol included).
      has(text(g), 'Every one but the Firearms Protocol ends with a pocket card.', f + ': every page but the protocol has a pocket card');
      lacks(text(g), 'Each is one routine in plain words, with a pocket card', '⚠ ' + f + ': never that every page has one');
    });
    ['photography-guide.html', 'sorting-guide.html', 'packing-guide.html', 'move-day-guide.html', 'first-night-guide.html', 'incident-guide.html', PAGE]
      .forEach((f) => ok(/pocket card/i.test(read(f)), f + ' has its pocket card'));
    ok(!/pocket card/i.test(read('firearms-protocol.html')), 'the Firearms Protocol has none');
    [['manual.html', read('manual.html')], ['MANUAL.md', read('MANUAL.md')]].forEach(([f, m]) => {
      has(text(m), 'The Evening Desk', f + ' names the page');
      has(m, 'evening-desk-guide.html', '…the file');
      has(m, 'DESK_GUIDE_DOC', '…the constant');
      has(m, 'tests/evening-desk-guide.test.js', '…and this test');
    });
  }
};
