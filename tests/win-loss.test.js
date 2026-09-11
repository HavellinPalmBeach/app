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

const { sandbox, source, fn } = require('./harness');

// A DOM just large enough to drive the real renderer: three write targets and a panel
// whose active/inactive state is the thing _jobsLanded actually branches on.
function dom(activePanels) {
  const els = {};
  const mk = (id) => (els[id] = {
    id, innerHTML: '',
    classList: { contains: (c) => c === 'active' && (activePanels || []).indexOf(id) >= 0 },
  });
  ['wl-metrics', 'wl-reason-wrap', 'wl-table-wrap', 'panel-winloss', 'panel-jobs'].forEach(mk);
  return { els, document: { getElementById: (id) => els[id] || null } };
}

const JOBS = [
  { id: 101, name: 'Butler Estate', svc: 'cleanout',   status: 'won',    won: true,  havellinEst: 19940 },
  { id: 102, name: 'Ellsworth',     svc: 'downsizing', status: 'active', won: true,  havellinEst: 12050 },
  { id: 103, name: 'Kravitz',       svc: 'probate',    status: 'closed', won: true,  havellinEst: 31000 },
  { id: 104, name: 'Marsh',  addr: '9 Palm Way', svc: 'cleanout', status: 'lost', won: false,
    lostEst: 8400, lostReason: 'price',  lostReasonLabel: 'Price / estimate too high', lostAt: '2026-07-20T12:00:00Z' },
  { id: 105, name: 'Ogden',  addr: '3 Bay Rd',   svc: 'prep',     status: 'lost', won: false,
    lostEst: 4200, lostReason: 'timing', lostReasonLabel: 'Timing — client not ready yet', lostAt: '2026-07-25T12:00:00Z' },
  { id: 106, name: 'Pending Prospect', svc: 'cleanout', status: 'pending' },
];

function wl(state, jobs, activePanels) {
  const d = dom(activePanels || ['panel-winloss']);
  const s = sandbox({
    fns: ['jobsUnread', 'jobsUnreadNotice', 'renderWinLoss', 'isJobWon'],
    vars: ['SVC_LABELS'],
    stubs: { document: d.document },
  });
  s.jobs = jobs.map((j) => Object.assign({}, j));
  s._jobsState = state;
  s.renderWinLoss();
  return {
    s,
    metrics: d.els['wl-metrics'].innerHTML,
    reasons: d.els['wl-reason-wrap'].innerHTML,
    table: d.els['wl-table-wrap'].innerHTML,
    vals: [...d.els['wl-metrics'].innerHTML.matchAll(/class="metric-val"[^>]*>([^<]*)</g)]
      .map((m) => m[1]),
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

    const cold = wl('loading', []);
    eq(cold.vals.join(' · '), '— · — · — · —',
       '⚠⚠ unread reports em dashes, never the four zeros that read as a finished count');
    lacks(cold.metrics, '0%', 'no conversion rate is claimed over a list nobody has read');

    // ⚠ THIS IS THE SENTENCE THAT MADE IT WORSE THAN A BLANK.
    lacks(cold.table, "good sign",
      '⚠⚠ "No lost prospects yet — that\'s a good sign" never prints over an unread list');
    has(cold.table, 'Loading clients', 'it says what is actually true instead');
    eq(cold.reasons, '', 'and breaks nothing down, having nothing to break down');

    const off = wl('offline', []);
    has(off.table, 'Could not reach the client list', 'the unreachable case names the cause');
    has(off.table, 'Refresh', '…and carries the fix, the way every blocker panel here does');
    has(off.table, 'Sheets Sync URL', '…naming the setting to check');
    has(off.table, 'safe in the sheet', '…and says nothing is lost, because nothing is');
    lacks(off.table, 'good sign', 'the reassurance is absent here too');

    // A genuinely empty, genuinely read pipeline keeps the old sentence, because there it
    // is simply true. Removing it would be its own silent omission.
    const empty = wl('ready', []);
    has(empty.table, 'good sign', '⚠ a READ and empty pipeline still gets the cheerful line');
    eq(empty.vals.join(' · '), '0 · 0 · 0% · $0', '…and its honest zeros');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('THE REPORT ITSELF STILL READS THE RIGHT JOBS');
  {
    const r = wl('ready', JOBS);
    has(r.table, 'Marsh',  'a lost prospect is listed');
    has(r.table, 'Ogden',  '…and so is the other one');
    lacks(r.table, 'Butler Estate', 'a WON job is not on the lost table');
    lacks(r.table, 'Pending Prospect', 'and neither is one still out with the client');
    eq((r.reasons.match(/<tr style="background:var\(--(cream|white)\);">/g) || []).length, 2,
       'two loss reasons break out');
    has(r.reasons, 'Price / estimate too high', '…named, not coded');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ `_jobsLanded` IS THE ONE DEFINITION OF "THE JOBS ARRIVED — REPAINT"');
  {
    const seen = [];
    const d = dom(['panel-winloss']);
    const s = sandbox({
      fns: ['_jobsLanded'],
      vars: [],
      stubs: {
        document: d.document,
        renderJobs: () => seen.push('jobs'),
        _dashRedraw: () => seen.push('dash'),
        renderWinLoss: () => seen.push('winloss'),
        refreshReferralsTabIfActive: () => seen.push('referrals'),
      },
    });
    s._jobsLanded();
    ok(seen.indexOf('jobs') >= 0, 'the client list is repainted');
    ok(seen.indexOf('dash') >= 0, 'so is the open drilldown (it self-guards)');
    ok(seen.indexOf('winloss') >= 0, '⚠⚠ and the Win/Loss report — the surface nobody remembered');
    ok(seen.indexOf('referrals') >= 0,
       '⚠ and the referral leaderboard, which rendered ZERO BYTES on a cold cache');

    // The Win/Loss render is expensive-ish and its own tab re-renders on entry, so it is
    // gated on being on screen. A gate that never opens is the defect wearing a hat, so
    // both directions are pinned.
    const seen2 = [];
    const d2 = dom([]);
    const s2 = sandbox({
      fns: ['_jobsLanded'], vars: [],
      stubs: { document: d2.document,
        renderJobs: () => seen2.push('jobs'), _dashRedraw: () => {},
        renderWinLoss: () => seen2.push('winloss'),
        refreshReferralsTabIfActive: () => seen2.push('referrals') },
    });
    s2._jobsLanded();
    eq(seen2.indexOf('winloss'), -1, 'a Win/Loss tab that is not on screen is not repainted');
    ok(seen2.indexOf('jobs') >= 0, '⚠ but the client list always is — that is what loadJobs did');

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
    // Eight columns, two of them free text (the reason and the note), so there is no width
    // it reflows to. Measured at 557px against a 390px phone: 178px of DOCUMENT overflow,
    // which renders as the cut-off header with a blank gap beside it — the symptom the
    // .tbl-scroll rule was written for. Zero at 390, 768 and 1024 now, and the container
    // really scrolls (clientWidth 368 against scrollWidth 557).
    const r = wl('ready', JOBS);
    const i = r.table.indexOf('<table');
    ok(i > -1, 'the table renders');
    has(r.table.slice(0, i), 'class="tbl-scroll"',
       '⚠ and the scroll container OPENS before it — a container after the table is not one');
    ok(r.table.indexOf('</table>') < r.table.indexOf('</div>', r.table.indexOf('</table>')),
       'and closes after it');

    // The empty states are plain text and must NOT be wrapped — an overflow container round
    // one sentence is a scrollbar with nothing to scroll.
    lacks(wl('ready', []).table, 'tbl-scroll', 'a pipeline with no losses wraps nothing');
    lacks(wl('loading', []).table, 'tbl-scroll', 'nor does the unread notice');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE REPORT IS STILL REACHABLE THE THREE WAYS IT ALWAYS WAS');
  {
    // The button and showPanel are what a person presses; _jobsLanded is what the data
    // does on its own. Losing any one of them is a different bug from the one fixed here.
    has(src, 'onclick="renderWinLoss()"', 'the ↺ Refresh button still calls it');
    has(src, "if (id==='winloss') renderWinLoss();", 'opening the tab still renders it');
    eq((src.match(/renderWinLoss\(\)/g) || []).length, 4,
       'four references now — the button, showPanel, _jobsLanded, and the definition\'s own guard');
  }
};
