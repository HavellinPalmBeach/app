'use strict';
// THE WIN/LOSS REPORT READ ZERO AND STAYED THERE (2026-09-11).
//
// ⚠⚠ `renderWinLoss` had exactly THREE references in the whole 1.74 MB file: the ↺
// Refresh button, its own definition, and `showPanel`. Nothing else. `loadJobs` hydrates
// `jobs` from localStorage synchronously and then fetches from the sheet — and its cloud
// callback called `renderJobs()` and nothing else. So on a device whose cache is cold —
// a new iPad, cleared data, Safari evicting storage for a site not visited in a week —
// the tab painted against `jobs = []` and NEVER corrected itself.
//
// Measured in a browser against a pipeline of three won and two lost worth $12,600:
//
//   Won 0 · Lost 0 · Conversion Rate 0% · Lost Revenue $0
//   "No lost prospects yet — that's a good sign."
//
// ⚠ THE SENTENCE IS THE HALF THAT MATTERS. A blank reads as "nothing here yet"; that
// reads as GOOD NEWS, over two prospects we lost. Pressing ↺ Refresh was the only way
// to see the truth, and nothing on screen suggested it was needed.
//
// ⚠ AND IT WAS NOT THE ONLY SURFACE. The referral leaderboard is built from the same
// array — measured on the same cold cache it rendered ZERO BYTES, so the section that
// says which estate attorney sends the most business was absent rather than merely wrong.

// ⚠⚠ AND SINCE 2026-09-23 THE REPORT IS NOT A TAB AT ALL. Anthony: *"do we really need a standalone
// win-loss report or should we just fold that into the top of the client dashboard? … if we can
// expand like on lost jobs … or won jobs … to see the list of jobs that fall into the win-loss
// categories … why don't we just have those with expandable carets?"* It is a row of four tiles
// under Total Jobs, painted by renderJobs, with a caret on Won and on Lost. Every requirement this
// file pinned against the tab is restated here against the row — none deleted — and the cold-cache
// defect it was written for is now closed by construction: there is no separate surface for a
// repaint hook to forget.

const { sandbox, source, fn, domStub } = require('./harness');

const WL_FNS = ['jobsUnread', 'jobsUnreadNotice', 'renderWinLoss', 'winLossBlockHtml', 'winLossFigures',
  'winLossListHtml', '_wlClientCell', '_jobStatusCell', 'toggleWinLossList', 'isJobWon', 'secCaret',
  'esc', 'fmtDate2', 'svcLabelOf'];
const WL_VARS = ['SVC_LABELS', 'JOB_STATUS_LABELS', 'JOB_STATUS_DOT', 'WON_METHOD_LABELS', '_wlOpen'];

const JOBS = [
  { id: 101, name: 'Butler Estate', svc: 'cleanout',   status: 'won',    won: true,  havellinEst: 19940,
    wonAt: '2026-09-20', wonMethod: 'call' },
  { id: 102, name: 'Ellsworth',     svc: 'downsizing', status: 'active', won: true,  havellinEst: 12050,
    wonAt: '2026-08-01', wonMethod: 'email' },
  { id: 103, name: 'Kravitz',       svc: 'probate',    status: 'closed', won: true,  havellinEst: 31000 },
  { id: 104, name: 'Marsh',  addr: '9 Palm Way', svc: 'cleanout', status: 'lost', won: false,
    lostEst: 8400, lostReason: 'price',  lostReasonLabel: 'Price / estimate too high', lostAt: '2026-07-20T12:00:00Z' },
  { id: 105, name: 'Ogden',  addr: '3 Bay Rd',   svc: 'prep',     status: 'lost', won: false,
    lostEst: 4200, lostReason: 'timing', lostReasonLabel: 'Timing — client not ready yet', lostAt: '2026-07-25T12:00:00Z' },
  { id: 106, name: 'Pending Prospect', svc: 'cleanout', status: 'pending' },
];

// Drive the REAL renderer into a DOM stub and read the block back, the way a person would.
function wl(state, jobs, open) {
  const d = domStub({});
  const s = sandbox({ fns: WL_FNS, vars: WL_VARS, stubs: { document: d } });
  s.jobs = jobs.map((j) => Object.assign({}, j));
  s._jobsState = state;
  s._wlOpen = Object.assign({ won: false, lost: false }, open || {});
  s.renderWinLoss();
  const html = d.getElementById('wl-block').innerHTML;
  const at = (k) => html.indexOf('id="wl-list-' + k + '"');
  return {
    s, d, html,
    tiles: html.slice(0, html.indexOf('</div>', html.lastIndexOf('Lost Revenue')) + 6),
    vals: [...html.matchAll(/class="metric-val"[^>]*>([^<]*)</g)].map((m) => m[1]),
    won: at('won') > -1 ? html.slice(at('won'), at('lost') > at('won') ? at('lost') : html.length) : '',
    lost: at('lost') > -1 ? html.slice(at('lost')) : '',
  };
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ AN EMPTY `jobs` HAS TWO MEANINGS AND THE REPORT ASSERTED THE CHEERFUL ONE');
  {
    const s = sandbox({ fns: ['jobsUnread'], vars: [] });
    const un = (state, n) => { s._jobsState = state; s.jobs = new Array(n).fill({}); return s.jobsUnread(); };

    eq(un('loading', 0), true,  'empty and still fetching — the outcomes are UNREAD, not zero');
    eq(un('offline', 0), true,  'empty and the sheet could not be reached — also unread');
    eq(un('ready',   0), false, '⚠ empty AFTER a successful read really is "no outcomes yet"');

    // The converse, and it is the half that keeps the fix from being a downgrade: a device
    // holding a warm cache is reporting on real clients while the fetch is in flight. Going
    // quiet there would replace a correct answer with an em dash.
    eq(un('loading', 3), false, '⚠ a warm cache reports its figures rather than waiting');
    eq(un('offline', 3), false, '⚠ and keeps reporting them when the sheet is unreachable');
    eq(un('ready',   3), false, 'the ordinary case');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE MEASURED DEFECT — 0 · 0 · 0% · $0 OVER A REAL PIPELINE');
  {
    const read = wl('ready', JOBS);
    eq(read.vals.join(' · '), '3 · 2 · 60% · $12,600',
       'the figures this pipeline actually has — three won, two lost, $12,600 lost');

    const cold = wl('loading', [], { won: true, lost: true });
    eq(cold.vals.join(' · '), '— · — · — · —',
       '⚠⚠ unread reports em dashes, never the four zeros that read as a finished count');
    lacks(cold.tiles, '0%', 'no conversion rate is claimed over a list nobody has read');

    // ⚠ THIS IS THE SENTENCE THAT MADE IT WORSE THAN A BLANK — and a caret can open the list on a
    // cold cache just as the tab once could.
    lacks(cold.lost, 'good sign',
      '⚠⚠ "No lost prospects yet — that\'s a good sign" never prints over an unread list');
    has(cold.lost, 'Loading clients', 'it says what is actually true instead');
    has(cold.won, 'Loading clients', '…on the Won list too');
    lacks(cold.won, 'No clients won yet', 'which does not claim an empty pipeline either');
    lacks(cold.won, '0 clients', '⚠ nor puts a count in the list\'s own heading — "0 clients · $0" is the same claim again');
    lacks(cold.lost, 'estimated', '…on either list');
    lacks(cold.lost, 'Loss reasons', 'and breaks nothing down, having nothing to break down');

    const off = wl('offline', [], { lost: true });
    has(off.lost, 'Could not reach the client list', 'the unreachable case names the cause');
    // ⚠ RESTATED 2026-09-23. It named "↺ Refresh", a button on the retired tab — and that button
    // only ever re-drew from memory, so it could not have fixed an unreachable sheet anyway.
    has(off.lost, 'reload the page', '…and carries the fix that actually refetches');
    lacks(off.lost, 'Refresh', '…not a button that no longer exists');
    has(off.lost, 'Sheets Sync URL', '…naming the setting to check');
    has(off.lost, 'safe in the sheet', '…and says nothing is lost, because nothing is');
    lacks(off.lost, 'good sign', 'the reassurance is absent here too');

    // A genuinely empty, genuinely read pipeline keeps the old sentence, because there it is
    // simply true. Removing it would be its own silent omission.
    const empty = wl('ready', [], { won: true, lost: true });
    has(empty.lost, 'good sign', '⚠ a READ and empty pipeline still gets the cheerful line');
    has(empty.won, 'No clients won yet', '…and the Won list says so plainly');
    // ⚠⚠ RESTATED 2026-09-23 — this pinned "0 · 0 · 0% · $0" as "its honest zeros". The zeros are
    // honest; the 0% is not. It is 0 won of 0 DECIDED — not a rate at all — and with one undecided
    // client on the books it read as "we have converted nobody". A dash until someone is decided.
    eq(empty.vals.join(' · '), '0 · 0 · — · $0', '…and its honest zeros, with no rate over nothing');
    const undecided = wl('ready', [JOBS[5]]);
    eq(undecided.vals[2], '—', 'a pipeline with nobody won or lost yet has no conversion rate');
    eq(wl('ready', [JOBS[0]]).vals[2], '100%', 'one won and nobody lost is 100%');
    eq(wl('ready', [JOBS[3]]).vals[2], '0%', '⚠ and one LOST with nobody won really is 0% — that zero is kept');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('THE REPORT ITSELF STILL READS THE RIGHT JOBS — now behind a caret each');
  {
    const r = wl('ready', JOBS, { lost: true });
    has(r.lost, 'Marsh',  'a lost prospect is listed');
    has(r.lost, 'Ogden',  '…and so is the other one');
    lacks(r.lost, 'Butler Estate', 'a WON job is not on the lost list');
    lacks(r.lost, 'Pending Prospect', 'and neither is one still out with the client');
    const reasonsTbl = r.lost.slice(r.lost.indexOf('wl-reasons'), r.lost.indexOf('</table>', r.lost.indexOf('wl-reasons')));
    eq((reasonsTbl.match(/<tr><td>/g) || []).length, 2, 'two loss reasons break out');
    has(r.lost, 'Price / estimate too high', '…named, not coded');
    has(r.lost, '2 clients · $12,600 estimated', 'the list says how many and what they were worth');
    ok(r.lost.indexOf('Ogden') < r.lost.lastIndexOf('Marsh'),
       'the newest loss first — Ogden (25 Jul) above Marsh (20 Jul) in the prospects table');

    const w = wl('ready', JOBS, { won: true });
    ['Butler Estate', 'Ellsworth', 'Kravitz'].forEach((n) => has(w.won, n, n + ' is on the Won list'));
    lacks(w.won, 'Marsh', 'a lost prospect is not');
    lacks(w.won, 'Pending Prospect', 'nor one still with the client');
    has(w.won, '3 clients · $62,990', 'the Won list says how many and what they are worth');
    ok(w.won.indexOf('Butler Estate') < w.won.indexOf('Ellsworth') && w.won.indexOf('Ellsworth') < w.won.indexOf('Kravitz'),
       'newest acceptance first, and a job won before the decision was recorded falls to the end');
    has(w.won, 'Phone call', 'how the client said yes, in the Won modal\'s own words');
    has(w.won, 'Email reply', '…for each of them');
    has(w.won, '>Active<', 'and where the job is now — Ellsworth is running');
    has(w.won, '>Closed<', '…Kravitz is done');

    // ⚠ CLOSED — DEPOSIT RETAINED IS A WIN, AND THE LIST SAYS WHICH KIND. confirmMarkLost keeps
    // won=true on a job that walked after paying; the tile counts it, so the list must show it —
    // with its own status, not folded silently in among jobs that ran to the end.
    const ret = wl('ready', [Object.assign({}, JOBS[0], { id: 107, name: 'Walked', status: 'closed_retained' })], { won: true });
    has(ret.won, 'Closed — Deposit Retained', '⚠ a deposit-retained job is on the Won list, named as one');
    eq(ret.vals[0], '1', 'and the tile counts it');
    has(ret.won, '1 client · $19,940</span>', 'one client is "1 client", not "1 clients"');
    // What was lost is an ESTIMATE of work that never happened; what was won is the price the client
    // accepted. The word goes on the Lost list and only there.
    lacks(w.won, 'estimated', 'the Won list\'s value is not called an estimate');

    // Each row opens its client, as every row of the client list does.
    has(w.won, 'onclick="openClientDashboard(101)"', 'a Won row opens that client');
    has(r.lost, 'onclick="openClientDashboard(104)"', 'so does a Lost one');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE CARETS — Won and Lost are buttons that open their list, and the rest are not');
  {
    const shut = wl('ready', JOBS);
    eq((shut.html.match(/class="metric-card mc-toggle"/g) || []).length, 2, 'exactly two tiles open a list');
    has(shut.html, 'id="wl-tile-won" aria-expanded="false"', 'Won starts shut');
    has(shut.html, 'id="wl-tile-lost" aria-expanded="false"', 'and so does Lost');
    lacks(shut.html, 'wl-list', 'with no list rendered under the row');
    has(shut.html, 'onclick="toggleWinLossList(\'won\')"', 'Won toggles its own list');
    has(shut.html, 'onclick="toggleWinLossList(\'lost\')"', 'Lost toggles its own');
    ok(/<button type="button" class="metric-card mc-toggle"/.test(shut.html),
       'they are real buttons — a keyboard reaches them and a screen reader hears the state');
    // ⚠ THE ONE CARET. secCaret is the only writer of the fold glyph in the whole file (the
    // fold-consistency net enforces it); the tile reads it rather than carrying its own.
    has(shut.html, '<span class="mc-caret">▸</span> Won', 'a shut tile wears secCaret\'s shut glyph');
    has(fn('winLossBlockHtml'), 'secCaret(open)', 'read from the one definition');

    const open = wl('ready', JOBS, { won: true });
    has(open.html, 'id="wl-tile-won" aria-expanded="true"', 'opening Won says so');
    has(open.html, '<span class="mc-caret">▾</span> Won', 'and turns its caret');
    has(open.html, 'id="wl-list-won"', 'and the list renders');
    lacks(open.html, 'id="wl-list-lost"', 'without opening the other one');
    ok(open.html.indexOf('id="wl-list-won"') > open.html.indexOf('Lost Revenue'),
       'the list sits BELOW the row, not inside a tile');

    const both = wl('ready', JOBS, { won: true, lost: true });
    ok(both.html.indexOf('id="wl-list-won"') > -1 && both.html.indexOf('id="wl-list-lost"') > both.html.indexOf('id="wl-list-won"'),
       'both can be open at once, Won above Lost, in tile order');
    // The spacing belongs to the row and the lists as a group, so it is keyed on what is OPEN, not
    // on which list: an open row closes up to its list, and the lists share one wrapper that carries
    // the space before the filters.
    has(open.html, 'class="grid4 wl-row wl-row-open"', 'an open row closes up to the list under it');
    has(shut.html, 'class="grid4 wl-row"', 'a shut one keeps its space before the filters');
    lacks(shut.html, 'wl-row-open', '…and does not claim to be open');
    eq((both.html.match(/class="wl-lists"/g) || []).length, 1, 'two open lists sit in ONE wrapper');
    ok(both.html.indexOf('class="wl-lists"') < both.html.indexOf('id="wl-list-won"')
       && both.html.lastIndexOf('</div>') > both.html.indexOf('id="wl-list-lost"'), 'around both of them');
    lacks(shut.html, 'wl-lists', 'and a shut row renders no empty wrapper to take up space');

    // DRIVEN: the real toggle flips the real state and repaints.
    const t = wl('ready', JOBS);
    t.s.toggleWinLossList('lost');
    has(t.d.getElementById('wl-block').innerHTML, 'id="wl-list-lost"', 'pressing Lost opens it');
    t.s.toggleWinLossList('lost');
    lacks(t.d.getElementById('wl-block').innerHTML, 'id="wl-list-lost"', 'pressing it again shuts it');
    t.s.toggleWinLossList('nonsense');
    eq(Object.keys(t.s._wlOpen).sort().join(','), 'lost,won', 'an unknown key opens nothing and adds nothing');

    // ⚠ SESSION STATE, NEVER A RECORD — the rule _planOpenPhases follows. Which list somebody has
    // open is nobody else's business; syncing it would open it on the other device.
    const tog = noComments(fn('toggleWinLossList'));
    lacks(tog, 'localStorage', 'the open state is not written to this device\'s storage');
    lacks(tog, 'saveJobs', 'nor to the job record');
    lacks(tog, 'syncJobToSheets', 'nor to the sheet');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ FREE TEXT IS ESCAPED — a name or a note is typed, and a "<" would take a row apart');
  {
    // The REAL esc is lifted, not the harness stub: the stub does not escape apostrophes, and a
    // case whose names carry nothing to escape proves nothing (this project has paid for that once).
    const bad = { id: 108, name: 'Maeve O\'Hara & Co <b>', addr: '1 <i>Ocean</i> Way', svc: 'cleanout',
      status: 'lost', won: false, lostEst: 5000, lostReason: 'other', lostReasonLabel: 'Other',
      lostNote: '<script>alert(1)</script>', tc: 'Ashley <Jerome>', lostAt: '2026-07-01T12:00:00Z' };
    const r = wl('ready', [bad], { lost: true });
    has(r.lost, 'Maeve O&#39;Hara &amp; Co &lt;b&gt;', 'the name is escaped');
    lacks(r.lost, '<b>', 'no markup gets through from a name');
    has(r.lost, '&lt;script&gt;', 'the note is escaped');
    lacks(r.lost, '<script>', 'no script gets through from a note');
    lacks(r.lost, '<i>', 'nor from an address');
    has(r.lost, 'Ashley &lt;Jerome&gt;', 'nor from a concierge\'s name');
    const w = wl('ready', [Object.assign({}, bad, { status: 'won', won: true })], { won: true });
    lacks(w.won, '<b>', 'the Won list escapes the same way');
    // ⚠ Each cell is its own chance to forget, so each is driven — a case carrying markup in the
    // name alone passes with every other cell printed raw. The reason label is written by the
    // close-out modal today, but a record synced from another build carries whatever it carried.
    const odd = Object.assign({}, bad, { svc: 'retired_svc', svcLabel: 'Old <u>Service</u>',
      lostReasonLabel: 'Other <em>see note</em>', lostAt: '<s>July</s>' });
    const r2 = wl('ready', [odd], { lost: true });
    lacks(r2.lost, '<em>', 'the loss reason is escaped, in the reasons table and the prospects table');
    has(r2.lost, 'Other &lt;em&gt;see note&lt;/em&gt;', '…printed as text');
    lacks(r2.lost, '<u>', 'a stored service label is escaped on the Lost list');
    lacks(r2.lost, '<s>', 'and so is a date that is not a date');
    const w2 = wl('ready', [Object.assign({}, odd, { status: 'won', won: true, wonMethod: '<q>fax</q>', wonAt: '<s>Sep</s>' })], { won: true });
    has(w2.won, 'Ashley &lt;Jerome&gt;', 'the Won list escapes the concierge');
    lacks(w2.won, '<Jerome>', '…never raw');
    lacks(w2.won, '<u>', 'the stored service label');
    lacks(w2.won, '<q>', 'a method the Won modal never offered, stored by another build');
    lacks(w2.won, '<s>', 'and the acceptance date');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ `_jobsLanded` IS THE ONE DEFINITION OF "THE JOBS ARRIVED — REPAINT"');
  {
    const seen = [];
    const s = sandbox({
      fns: ['_jobsLanded'],
      vars: [],
      stubs: {
        document: { getElementById: () => null },
        renderJobs: () => seen.push('jobs'),
        _dashRedraw: () => seen.push('dash'),
        refreshReferralsTabIfActive: () => seen.push('referrals'),
      },
    });
    s._jobsLanded();
    ok(seen.indexOf('jobs') >= 0, 'the client list is repainted');
    ok(seen.indexOf('dash') >= 0, 'so is the open drilldown (it self-guards)');
    ok(seen.indexOf('referrals') >= 0,
       '⚠ and the referral leaderboard, which rendered ZERO BYTES on a cold cache');

    // ⚠⚠ RESTATED 2026-09-23 — THE REPORT RIDES THE CLIENT LIST NOW. This group pinned a separate
    // `renderWinLoss()` branch gated on the Win/Loss tab being on screen. The tab is gone and the
    // report is a row renderJobs paints, so the requirement is that renderJobs carries it — and
    // that there is no second, gated copy left here to forget.
    const lj = noComments(fn('_jobsLanded'));
    lacks(lj, 'panel-winloss', 'no gate on a tab that no longer exists');
    lacks(lj, 'renderWinLoss', 'no second repaint of the report beside the one renderJobs does');
    has(fn('renderJobs'), 'renderWinLoss()', '⚠⚠ renderJobs paints the report — every list repaint reaches it');
    const rj = fn('renderJobs');
    ok(rj.indexOf('renderWinLoss()') < rj.indexOf('if (filtered.length === 0)'),
       '⚠ BEFORE the empty-filter return — a filter that matches nothing must not blank the report, '
       + 'which is about the whole pipeline and never the filter');

    // Called from four sites on three different paths; a throw in any one of them must not
    // take the other three with it, or one broken surface silences the rest.
    const s3 = sandbox({ fns: ['_jobsLanded'], vars: [],
      stubs: { document: { getElementById: () => null } } });
    eq(typeof s3._jobsLanded(), 'undefined', 'with every surface absent it does nothing and does not throw');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ NOBODY KEEPS THEIR OWN PARTIAL COPY OF THE REPAINT');
  {
    const tick = noComments(fn('jobsWatchTick'));
    lacks(tick, 'renderClientDashboard(',
      '⚠ jobsWatchTick no longer holds its own two-surface copy — that narrower copy is why '
      + 'a job won on the other device left this one\'s report showing the old outcome');
    lacks(tick, "getElementById('panel-jobs')", '…nor its own panel test');
    has(tick, '_jobsLanded()', '…it asks the one definition');

    const drop = noComments(fn('_applyDroppedJobs'));
    has(drop, '_jobsLanded()',
      '⚠ a client deleted on the other device leaves this one\'s lost-prospect row standing '
      + 'until something redraws it');

    const lj = noComments(fn('loadJobs'));
    eq((lj.match(/_jobsLanded\(\)/g) || []).length, 2,
       '⚠ BOTH arms of the fetch land it — a failed fetch that resolved nothing would leave '
       + 'the report saying "Loading clients…" forever');
    lacks(lj, '\n          renderJobs();',
      'loadJobs no longer calls renderJobs directly; that is what _jobsLanded is for');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ DRIVEN: THE REAL `loadJobs`, ON ALL THREE ARMS');
  {
    // A hand-rolled thenable runs the whole fetch chain SYNCHRONOUSLY, so the real
    // function can be driven here rather than only in a browser. The three arms are the
    // three ways an empty `jobs` can be sitting on screen, and each resolves differently.
    const thenable = (mode, data) => {
      const t = {
        then(a, b) {
          if (mode === 'reject') { if (b) b(new Error('offline')); return t; }
          return a ? thenable(mode, a(data)) : t;
        },
        catch(c) { if (mode === 'reject') c(new Error('offline')); return t; },
      };
      return t;
    };
    const drive = (url, mode, data) => {
      let landed = 0;
      const ctx = sandbox({
        fns: ['loadJobs'], vars: [],
        stubs: {
          document: { getElementById: () => ({ textContent: '' }) },
          SHEETS_SYNC_URL: url,
          DRIVE_FOLDER_ID: '',
          fetch: () => thenable(mode, { json: () => data }),
          migrateRetiredNames: (x) => x,
          _purgeLocalJobRecords() {},
          rebuildDropdowns() {},
          showSyncBadge() {},
          _jobsLanded() { landed++; },
        },
      });
      ctx._jobsState = 'loading';
      ctx.loadJobs();
      return { state: ctx._jobsState, landed, n: ctx.jobs.length };
    };

    const ok1 = drive('https://x/exec', 'resolve', { jobs: [{ id: 1, status: 'won', won: true }] });
    eq(ok1.state, 'ready', 'a landed fetch resolves the flag');
    eq(ok1.n, 1, '…and the jobs are in memory');
    eq(ok1.landed, 1, '⚠⚠ …and it tells the screen, which is the whole defect');

    const off = drive('https://x/exec', 'reject', null);
    eq(off.state, 'offline', 'a failed fetch resolves to its OWN state, never back to ready');
    eq(off.landed, 1,
       '⚠ …and still tells the screen, or the report says "Loading clients…" forever on a '
       + 'device that is never going to hear back');

    const none = drive('', 'resolve', null);
    eq(none.state, 'ready',
       '⚠ no sync URL configured resolves to ready — the local cache IS the truth for that '
       + 'device, and leaving it at "loading" reports a pipeline it can already see as unread');
    eq(none.landed, 0, '…with nothing to announce, because nothing arrived');

    // An error payload from a live backend is not new data, but it IS an answer.
    const err = drive('https://x/exec', 'resolve', { error: 'Unknown action' });
    eq(err.state, 'ready', 'a backend error still resolves the flag');
    eq(err.n, 0, '…without overwriting the jobs with nothing');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE STATE FLAG RESOLVES ON EVERY PATH, INCLUDING NO SYNC URL AT ALL');
  {
    const lj = noComments(fn('loadJobs'));
    has(lj, "_jobsState = 'ready'",   'a landed fetch resolves it');
    has(lj, "_jobsState = 'offline'", 'a failed fetch resolves it too, as its own state');
    // A device with no Sheets URL configured never fetches. Leaving the flag at 'loading'
    // there would make the report say "Loading clients…" on a device that is never going
    // to hear anything — the local cache IS the truth for it.
    eq((lj.match(/_jobsState = 'ready'/g) || []).length, 2,
       '⚠ …and so does having no sync URL at all, where the local cache is all there is');
    has(src, "var _jobsState = 'loading';", 'it starts as unread rather than as ready');

    const notice = noComments(fn('jobsUnreadNotice'));
    has(notice, "_jobsState === 'offline'", 'the notice tells the two apart');
    // "Loading" and "unreachable" prescribe different things; collapsing them would send
    // somebody to Settings over a fetch that was about to land.
    lacks(fn('jobsUnread'), 'getElementById',
      '⚠ the predicate is DOM-free, so the tests read the real rule rather than rendered HTML');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE LOST-PROSPECTS TABLE SCROLLS, THE PAGE DOES NOT');
  {
    // Seven columns, two of them free text (the reason and the note), so there is no width
    // it reflows to. Measured on the old tab at 557px against a 390px phone: 178px of DOCUMENT
    // overflow, which renders as the cut-off header with a blank gap beside it — the symptom
    // the .tbl-scroll rule was written for.
    const r = wl('ready', JOBS, { lost: true });
    const prospects = r.lost.slice(r.lost.indexOf('Lost prospects'));
    const i = prospects.indexOf('<table');
    ok(i > -1, 'the table renders');
    has(prospects.slice(0, i), 'class="tbl-scroll"',
       '⚠ and the scroll container OPENS before it — a container after the table is not one');
    ok(prospects.indexOf('</table>') < prospects.indexOf('</div>', prospects.indexOf('</table>')),
       'and closes after it');
    const w = wl('ready', JOBS, { won: true });
    has(w.won.slice(0, w.won.indexOf('<table')), 'class="tbl-scroll"', 'the Won table scrolls the same way');

    // The empty states are plain text and must NOT be wrapped — an overflow container round
    // one sentence is a scrollbar with nothing to scroll.
    lacks(wl('ready', [], { lost: true }).lost, 'tbl-scroll', 'a pipeline with no losses wraps nothing');
    lacks(wl('loading', [], { lost: true }).lost, 'tbl-scroll', 'nor does the unread notice');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ WHERE THE REPORT LIVES NOW — and the two ways it used to be reached are gone');
  {
    // ⚠ RESTATED 2026-09-23. This pinned the ↺ Refresh button, showPanel's winloss branch and a
    // reference count of four. The tab is retired; what has to be true now is that the report is
    // on the Client Dashboard, painted by the list's own render, and painted on page load.
    lacks(src, 'onclick="renderWinLoss()"', 'the ↺ Refresh button went with the tab');
    lacks(src, "if (id==='winloss')", 'and showPanel has no winloss branch');
    has(src, '<div id="wl-block"></div>', 'the report has a home on the client list');
    const markup = src.slice(src.indexOf('<div id="clients-list-view">'), src.indexOf('id="jobs-body"'));
    ok(markup.indexOf('id="m-tot"') < markup.indexOf('id="wl-block"'),
       'UNDER the Total Jobs row — "why don\'t we have the win-loss stuff underneath that?"');
    ok(markup.indexOf('id="wl-block"') < markup.indexOf("setFilter('all',this)"),
       'and ABOVE the filters, so an open list sits between the figures and the client list');
    // Four references: the definition, renderJobs, the caret toggle — and the comment-free count
    // is what matters, so the note in the markup does not count.
    const liveJs = noComments(src);
    eq((liveJs.match(/renderWinLoss\(\);/g) || []).length, 2,
       'two live callers — renderJobs and the caret toggle — and no third door');
    // And the list is painted when the page loads, not only when the fetch lands: waiting left the
    // table without its header row and the report without its tiles for a cold start's worth of
    // seconds, over a warm cache that had the answer all along.
    const init = src.slice(src.indexOf('// ─── INIT ───'));
    ok(init.indexOf('renderJobs();') > init.indexOf('loadJobs();') && init.indexOf('renderJobs();') < init.indexOf('loadEstimateState();'),
       '⚠ INIT paints the list, and the report with it, straight after loadJobs reads the cache');

    // Field mode: the report was never a field tab, and it does not become one by moving.
    const css = src.slice(src.indexOf('<style'), src.indexOf('</style>'));
    has(css, 'body.field-mode #wl-block{display:none;}', 'field mode drops the row, as it never had the tab');
  }
};
