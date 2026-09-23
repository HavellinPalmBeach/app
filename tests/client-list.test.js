'use strict';
// SIX FILTERS AND A SORTABLE LIST (2026-09-23).
//
// Anthony, off a screenshot of the Client Dashboard: *"there are far too many sort items … I just
// don't think we need to sort, certainly by job type. The sort should be … all … active, pending
// approval, unassigned TC, closed and lost, and then be able to sort by the service column, which
// wipes out the need for all of the big job type buttons."*
//
// ⚠⚠ THE POINT OF THIS FILE IS THAT NOTHING THE OLD BUTTONS FOUND IS NOW UNREACHABLE. Fourteen
// buttons became six, and eight went: New, RE Potential and six service types. Each of those is
// a column now — Status, RE, Service — and every data column sorts, so the clients each removed
// button found are one press on a heading away. The last group drives exactly that, button by
// button, rather than asserting it.

const { sandbox, source, fn, domStub } = require('./harness');

const LIST_FNS = ['renderJobs', 'fmt', 'jobIsSettled', 'stagePaidTotal', 'jobPayments',
  'houseFlagSummary', 'activeHouseFlags', 'houseFlagsOf', 'svcLabelOf',
  'maybeStartJobsWatch', 'stopJobsWatch',
  'sortJobsForList', 'jobsHeadHtml', '_jobStatusCell', 'esc', 'jobsUnread', 'jobsUnreadNotice',
  'renderWinLoss', 'winLossBlockHtml', 'winLossFigures', 'winLossListHtml', '_wlClientCell',
  'isJobWon', 'secCaret', 'fmtDate2', 'setJobSort', 'setFilter'];
const LIST_VARS = ['currentFilter', 'HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC', 'SVC_LABELS', 'SVC_ORDER', '_jobsWatch',
  '_jobsState', '_jobSort', '_wlOpen', 'JOB_SORTS', 'JOB_LIST_COLS', 'JOB_STATUS_ORDER',
  'JOB_STATUS_LABELS', 'JOB_STATUS_DOT', 'WON_METHOD_LABELS'];

const JOBS = [
  { id: 11, name: 'Ashby',    svc: 'probate',     status: 'active',  won: true, tc: 'Ashley Jerome', havellinEst: 31000, totalEst: 36000, start: '2026-10-12', re: 'yes' },
  { id: 12, name: 'Butler',   svc: 'cleanout',    status: 'won',     won: true, tc: '',              havellinEst: 19940, totalEst: 22000, start: '2026-10-05', re: 'no' },
  { id: 13, name: 'Carrow',   svc: 'prep',        status: 'new',                tc: 'Anthony Graziano',                                       start: '',           re: '' },
  { id: 14, name: 'Dunmore',  svc: 'downsizing',  status: 'pending',            tc: 'Ashley Jerome', havellinEst: 12050, totalEst: 12050, start: '2026-11-02', re: 'yes' },
  { id: 15, name: 'Ellery',   svc: 'cleanout',    status: 'closed',  won: true, tc: 'Anthony Graziano', havellinEst: 24000, totalEst: 26000, start: '2026-08-01', re: 'no', deliveredOn: '2026-09-01' },
  { id: 16, name: 'Farrell',  svc: 'home_cleanout', status: 'closed_retained', won: true, tc: '', havellinEst: 9000, totalEst: 9000, start: '2026-09-01', re: '',
    depositReceived: true, payments: [{ stage: 'deposit', amount: 4500 }] },
  { id: 17, name: 'Gault',    svc: 'contested_probate', status: 'lost', won: false, tc: 'Ashley Jerome', havellinEst: 40000, lostReason: 'price', lostAt: '2026-07-01T12:00:00Z' },
  { id: 18, name: 'Hadley',   svc: 'downsizing_move', status: 'approved', tc: 'Anthony Graziano', havellinEst: 14250, totalEst: 15000, start: '2026-10-20', re: 'yes' },
];

// Drive the REAL renderJobs into a DOM stub and read the list back as a person would.
function list(opts) {
  opts = opts || {};
  const d = domStub({});
  // No sync URL: a Pending Approval client would otherwise arm the 15-second poll from inside a test.
  const s = sandbox({ fns: LIST_FNS, vars: LIST_VARS, stubs: { document: d, SHEETS_SYNC_URL: '' } });
  s.jobs = (opts.jobs || JOBS).map((j) => Object.assign({}, j));
  s._jobsState = opts.state || 'ready';
  s.currentFilter = opts.filter || 'all';
  if (opts.sort) s._jobSort = opts.sort;
  s.renderJobs();
  const body = d.getElementById('jobs-body').innerHTML;
  const names = [...body.matchAll(/<div style="font-weight:600;">([^<]+)/g)].map((m) => m[1]);
  return { s, d, body, names, head: d.getElementById('jobs-head').innerHTML };
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const live = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  const listView = src.slice(src.indexOf('<div id="clients-list-view">'), src.indexOf('<div id="client-dashboard-view"'));

  // ───────────────────────────────────────────────────────────────────────────
  group('the filters: six, in Anthony\'s order, and nothing else');
  {
    const btns = [...listView.matchAll(/<button class="fb[^"]*" onclick="setFilter\('([a-z_]+)',this\)">([^<]+)<\/button>/g)];
    eq(btns.map((m) => m[2]).join(' · '), 'All · Active · Pending Approval · Unassigned TC · Closed · Lost',
      '"it starts with all, and then goes active, pending approval, unassigned TC, closed and lost"');
    eq(btns.map((m) => m[1]).join(','), 'all,active,pending,unassigned,closed,lost', 'each keyed as renderJobs reads it');
    eq((listView.match(/class="fb active"/g) || []).length, 1, 'exactly one starts lit');
    ok(/class="fb active" onclick="setFilter\('all'/.test(listView), 'and it is All');

    // The eight that went, by label and by key. A retired button left in the markup is how one
    // comes back; a retired CASE left in the switch is dead code that still compiles.
    ['New', 'RE Potential', 'Home Editing / Transition', 'Home Cleanout', 'Estate Settlement',
     'Probate', 'Contested Probate', 'Home Prep'].forEach((l) =>
      lacks(listView, '>' + l + '</button>', 'no "' + l + '" filter button'));
    const rj = fn('renderJobs');
    ['new', 're', 'downsizing', 'home_cleanout', 'cleanout', 'probate', 'contested_probate', 'prep'].forEach((k) =>
      lacks(rj, "case '" + k + "':", 'no dead "' + k + '" case left in the filter'));
    btns.filter((m) => m[1] !== 'all').forEach((m) =>
      has(rj, "case '" + m[1] + "':", 'the ' + m[2] + ' button has its case'));
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('each filter shows what it says, driven through the real renderJobs');
  {
    eq(list({ filter: 'all' }).names.join(','), 'Ashby,Butler,Carrow,Dunmore,Ellery,Farrell,Hadley',
      'All is every client except the lost — archived under Lost, as before');
    eq(list({ filter: 'active' }).names.join(','), 'Ashby', 'Active is the jobs actually running');
    eq(list({ filter: 'pending' }).names.join(','), 'Dunmore', 'Pending Approval is the manager\'s queue');
    eq(list({ filter: 'unassigned' }).names.join(','), 'Butler,Farrell', 'Unassigned TC is every live client with no concierge');
    // ⚠ A CHANGE, AND A FIX: "Closed — Deposit Retained" is closed, and says so — but the old
    // Closed button tested status === 'closed' alone, so it was reachable only through All.
    eq(list({ filter: 'closed' }).names.join(','), 'Ellery,Farrell',
      '⚠ Closed now includes Closed — Deposit Retained, which its own label says it is');
    eq(list({ filter: 'lost' }).names.join(','), 'Gault', 'Lost is where the lost live');
    has(list({ filter: 'lost', jobs: [JOBS[0]] }).body, 'No jobs match this filter.',
      'an empty FILTER still says so — a different answer from an empty list');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ sortJobsForList — the rule, driven on real jobs');
  {
    const s = sandbox({ fns: ['sortJobsForList', 'svcLabelOf'], vars: ['SVC_LABELS', 'SVC_ORDER', 'JOB_STATUS_ORDER', 'JOB_SORTS'] });
    const by = (key, dir, jobs) => s.sortJobsForList(jobs || JOBS, key, dir).map((j) => j.name).join(',');
    const before = JOBS.map((j) => j.name).join(',');

    // ⚠⚠ SERVICE SORTS IN CATALOGUE ORDER, NOT A→Z. A→Z by label put Contested Probate FIRST and
    // Probate LAST — the two probate types at opposite ends — and wedged Home Prep between Home
    // Editing and Home Transition. Found working out these very expectations by hand, before the
    // code was run: the whole reason this column replaced six buttons is to keep each kind together.
    eq(by('svc', 'asc'), 'Carrow,Dunmore,Hadley,Farrell,Butler,Ellery,Ashby,Gault',
      'Service: Home Prep, Home Editing, Home Transition, Home Cleanout, Estate Settlement ×2, Probate, Contested');
    eq(by('svc', 'desc'), 'Gault,Ashby,Butler,Ellery,Farrell,Hadley,Dunmore,Carrow',
      'reversed puts the decedent work first — and ties still keep the list\'s own order (Butler above Ellery)');
    eq(JOBS.map((j) => j.name).join(','), before, 'the input is never mutated');

    // ⚠ A BLANK IS A GAP, NOT THE SMALLEST VALUE — last whichever way the column runs.
    const tcAsc = by('tc', 'asc').split(','), tcDesc = by('tc', 'desc').split(',');
    eq(tcAsc.join(','), 'Carrow,Ellery,Hadley,Ashby,Dunmore,Gault,Butler,Farrell',
      'TC A→Z — Anthony, then Ashley, newest-first inside each');
    eq(tcAsc.slice(-2).join(','), 'Butler,Farrell', '⚠ unassigned concierges sort LAST A→Z');
    eq(tcDesc.slice(-2).join(','), 'Butler,Farrell', '⚠ …and LAST Z→A — reversing never brings the gaps to the top');
    eq(by('hav', 'desc'), 'Gault,Ashby,Ellery,Butler,Hadley,Dunmore,Farrell,Carrow',
      'Havellin Est. largest first, and the unpriced job last');
    eq(by('hav', 'asc').split(',').pop(), 'Carrow', '⚠ …and still last the other way — never read as $0');
    eq(by('start', 'asc'), 'Ellery,Farrell,Butler,Ashby,Hadley,Dunmore,Carrow,Gault',
      'Start Date soonest first, the two with no date last');
    eq(by('status', 'asc'), 'Carrow,Dunmore,Hadley,Butler,Ashby,Ellery,Farrell,Gault',
      'Status in LIFECYCLE order — new, pending, approved, won, active, closed, deposit retained, lost — not A→Z');
    eq(by('re', 'desc'), 'Ashby,Dunmore,Hadley,Carrow,Farrell,Gault,Butler,Ellery',
      'RE with the ★ clients first, the unanswered next, the no\'s last');
    // A column whose fixture already happens to be in order proves nothing — the client names ARE
    // alphabetical in the list's own order — so the name sort is driven the other way round too.
    eq(by('client', 'desc'), 'Hadley,Gault,Farrell,Ellery,Dunmore,Carrow,Butler,Ashby', 'Client Z→A');
    eq(by('client', 'asc', JOBS.slice().reverse()), 'Ashby,Butler,Carrow,Dunmore,Ellery,Farrell,Gault,Hadley',
      'Client A→Z from a list in the opposite order');
    // No sort is the list's own order, untouched.
    eq(by('', ''), before, 'no key is the list as it stands');
    eq(by('nonsense', 'asc'), before, 'an unknown key sorts nothing');
    eq(by('svc', 'sideways'), before, 'nor does an unknown direction');
    ok(s.sortJobsForList(JOBS, '', '') !== JOBS, 'and it still hands back a copy, never the list itself');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('setJobSort — first press, reverse, clear, driven through the real list');
  {
    const L = list();
    const names = () => [...L.d.getElementById('jobs-body').innerHTML.matchAll(/<div style="font-weight:600;">([^<]+)/g)].map((m) => m[1]).join(',');
    const st = () => L.s._jobSort.key + ':' + L.s._jobSort.dir;
    const def = names();
    L.s.setJobSort('svc');
    eq(st(), 'svc:asc', 'the first press sorts Service in its natural direction');
    eq(names(), 'Carrow,Dunmore,Hadley,Farrell,Butler,Ellery,Ashby', 'and the list really re-renders in that order (Gault is lost, under Lost)');
    L.s.setJobSort('svc');
    eq(st(), 'svc:desc', 'the second press reverses it');
    L.s.setJobSort('svc');
    eq(st(), ':', 'the third clears it');
    eq(names(), def, '⚠ …back to the list\'s own order, newest client first — a sort that could not be undone would hide it for the session');
    L.s.setJobSort('hav');
    eq(st(), 'hav:desc', 'money starts largest first');
    L.s.setJobSort('svc');
    eq(st(), 'svc:asc', 'pressing another heading starts THAT column fresh');
    // Called inside a try: without the guard `setJobSort` throws on `col.first`, and an unguarded
    // call here crashed the whole file at check 57 in the revert sweep — every assertion below it
    // then never ran, which reads as one failure rather than as what it is.
    let threw = '';
    try { L.s.setJobSort('nonsense'); } catch (err) { threw = String(err && err.message || err); }
    eq(threw, '', 'an unknown heading does not throw');
    eq(st(), 'svc:asc', 'an unknown heading changes nothing');
    // Session state, like the filter: never written anywhere.
    const body = fn('setJobSort');
    lacks(body, 'localStorage', 'the sort is not remembered on this device');
    lacks(body, 'saveJobs', 'nor written to a job');
    // It re-renders through the one list render, never a second copy of it.
    has(body, 'renderJobs()', 'it repaints through renderJobs');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the header row — buttons, aria-sort, and arrows that are not the fold caret');
  {
    const s = sandbox({ fns: ['jobsHeadHtml'], vars: ['JOB_SORTS', 'JOB_LIST_COLS', '_jobSort'] });
    const h = s.jobsHeadHtml();
    eq((h.match(/<th/g) || []).length, 9, 'nine headings, one per column');
    // ⚠ `class="th-sort` alone also matches the arrow's `th-sort-ind` span — sixteen, not eight.
    eq((h.match(/class="th-sort[" ]/g) || []).length, 8, 'eight of them sort');
    ok(/<th>Actions<\/th><\/tr>$/.test(h), 'Actions is the ninth and does not');
    eq([...h.matchAll(/onclick="setJobSort\('([a-z]+)'\)"/g)].map((m) => m[1]).join(','),
      'client,svc,tc,hav,tot,start,status,re', 'in table order');
    eq((h.match(/aria-sort="none"/g) || []).length, 8, 'nothing claims to be sorted before anything is');
    has(h, '>Service<span class="th-sort-ind">↕</span>', 'an unsorted heading carries a faint ↕');

    s._jobSort = { key: 'svc', dir: 'asc' };
    const a = s.jobsHeadHtml();
    has(a, 'aria-sort="ascending"><button type="button" class="th-sort on" onclick="setJobSort(\'svc\')" title="Press again to reverse">Service<span class="th-sort-ind">↑</span>',
      'the sorted heading says ascending, is lit, and says what the next press does');
    s._jobSort = { key: 'svc', dir: 'desc' };
    has(s.jobsHeadHtml(), 'title="Press again to clear the sort">Service<span class="th-sort-ind">↓</span>',
      'reversed: ↓, and the next press clears');
    s._jobSort = { key: 'hav', dir: 'desc' };
    has(s.jobsHeadHtml(), 'title="Press again to reverse">Havellin Est.<span class="th-sort-ind">↓</span>',
      '⚠ a column whose natural direction is descending says "reverse" on ↓ — the tip follows the column, not the arrow');

    // ⚠ NOT THE FOLD CARET. The triangles belong to secCaret — the fold-consistency net forbids them
    // anywhere else — and a triangle on a heading would read as something that expands.
    ['▸', '▾', '▼', '▶', '▲'].forEach((g) =>
      lacks(s.jobsHeadHtml() + a + h, g, 'no triangle glyph ' + JSON.stringify(g) + ' on a sort heading'));
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ the columns and the headings cannot drift apart');
  {
    const s = sandbox({ fns: [], vars: ['JOB_SORTS', 'JOB_LIST_COLS'] });
    const cols = s.JOB_LIST_COLS.filter(Boolean);
    eq(cols.slice().sort().join(','), Object.keys(s.JOB_SORTS).sort().join(','),
      'every sortable column has a rule, and every rule has a column');
    eq(s.JOB_LIST_COLS.length, 9, 'nine columns in all');
    // Driven: the row renderJobs writes has one cell per column, in the heading's order.
    const L = list({ jobs: [JOBS[0]] });
    const row = L.body.slice(L.body.indexOf('<tr'), L.body.indexOf('</tr>'));
    const cells = row.split('<td').slice(1);
    eq(cells.length, 9, 'each row writes nine cells');
    has(cells[1], 'Probate Estate Settlement', 'the second cell is the Service, under the Service heading');
    has(cells[6], 'Active', 'the seventh is the Status, under Status');
    has(cells[7], '★', 'the eighth is RE, under RE');
    has(L.head, 'Client / Property', 'and the header row is painted by the same render');
    has(src, '<thead id="jobs-head"></thead>', 'from markup that holds no second copy of the headings');
    lacks(listView, '<th>Service</th>', 'no hand-written heading survives beside it');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the real renderJobs: header, sort, the Win / Loss row and the unread state');
  {
    const L = list({ sort: { key: 'svc', dir: 'asc' } });
    has(L.head, 'aria-sort="ascending"', 'the painted header shows the sort in force');
    eq(L.names.join(','), 'Carrow,Dunmore,Hadley,Farrell,Butler,Ellery,Ashby', 'and the body is in that order');
    has(L.d.getElementById('wl-block').innerHTML, 'id="wl-tile-won"', '⚠ the same render paints the Win / Loss row');
    eq(L.d.getElementById('m-tot').textContent, 8, 'Total Jobs counts every client');

    // ⚠ THE UNREAD RULE REACHES THE TOP ROW. The Win / Loss tiles under it read an unread list as
    // an em dash; four zeros above four dashes would be the two rows disagreeing about whether the
    // list has been read at all.
    const cold = list({ jobs: [], state: 'loading' });
    eq(['m-tot', 'm-act', 'm-pip', 'm-re'].map((id) => cold.d.getElementById(id).textContent).join(' '), '— — — —',
      '⚠ a cold cache reads as dashes across the top row too');
    has(cold.body, 'Loading clients', 'and the list says it is loading');
    const off = list({ jobs: [], state: 'offline' });
    has(off.body, 'Could not reach the client list',
      '⚠ an unreachable sheet says so in the list — it used to read "Loading clients…" there forever');
    // ⚠ DRIVEN, NOT A SOURCE INDEX. The report is about the whole pipeline and never the filter, so a
    // filter that matches nobody — which returns early — must still have painted it.
    const none = list({ filter: 'pending', jobs: [JOBS[0], JOBS[4]] });
    has(none.body, 'No jobs match this filter.', 'a filter that matches nobody…');
    has(none.d.getElementById('wl-block').innerHTML, 'id="wl-tile-won"', '⚠ …still paints the Win / Loss row above it');
    eq((none.d.getElementById('wl-block').innerHTML.match(/class="metric-val"[^>]*>([^<]*)</) || [])[1], '2',
      '…counting the whole pipeline, not the empty filter');
    const empty = list({ jobs: [], state: 'ready' });
    eq(empty.d.getElementById('m-tot').textContent, 0, 'a READ and empty book is an honest zero');
    has(empty.body, 'No clients yet. Press + Add New Client to add the first.', 'and says where clients come from');
    // ⚠ THE HEADINGS ARE PAINTED BEFORE THE EARLY RETURN. The markup holds an empty <thead> now, so
    // a list with nothing in it — a cold cache, an empty filter, a new book — would otherwise be a
    // table with no headings at all, and the sort would be unreachable until a client existed.
    has(cold.head, 'Client / Property', '⚠ a cold list still has its headings');
    has(none.head, 'setJobSort(\'svc\')', '⚠ …and so does a filter that matches nobody, sort and all');
    has(empty.head, 'Client / Property', '…and an empty book');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ the client list escapes free text — the same names are on the Win / Loss lists above it');
  {
    const L = list({ jobs: [Object.assign({}, JOBS[0], { name: 'Maeve O\'Hara & Co <b>', addr: '1 <i>Ocean</i> Way, Palm Beach', tc: '<Ash> Jerome' })] });
    has(L.body, 'Maeve O&#39;Hara &amp; Co &lt;b&gt;', 'the name is escaped with the real esc');
    lacks(L.body, '<b>', 'no markup gets through from a name');
    lacks(L.body, '<i>', 'nor from an address');
    has(L.body, '&lt;Ash&gt;', 'nor from a concierge');
    // The initials are cut from the same typed name, so they are free text too — '<' is a first letter.
    has(L.body, '<div class="avatar">&lt;J</div>', 'nor from the initials cut out of it');
    // ⚠ A retired service key prints the label STORED on the job at intake (svcLabelOf), which is
    // typed text from another build — the catalogue's own labels are constants, that one is not.
    const R = list({ jobs: [Object.assign({}, JOBS[0], { svc: 'retired_svc', svcLabel: 'Old <u>Service</u>' })] });
    has(R.body, 'Old &lt;u&gt;Service&lt;/u&gt;', 'nor from a stored service label');
    lacks(R.body, '<u>', 'which prints as text, never as markup');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ ONE status vocabulary — the client list and the Won list read the same words');
  {
    const rj = fn('renderJobs');
    lacks(rj, 'var slabel', 'renderJobs no longer holds its own status map');
    lacks(rj, 'var sdot', 'nor its own dot map');
    has(rj, '_jobStatusCell(j)', 'it asks the shared cell');
    has(fn('winLossListHtml'), '_jobStatusCell(j)', 'and so does the Won list');
    const s = sandbox({ fns: ['_jobStatusCell', 'esc'], vars: ['JOB_STATUS_LABELS', 'JOB_STATUS_DOT', 'JOB_STATUS_ORDER'] });
    s.JOB_STATUS_ORDER.forEach((st) => ok(!!s.JOB_STATUS_LABELS[st], st + ' has a label'));
    has(s._jobStatusCell({ status: 'closed_retained' }), 'Closed — Deposit Retained', 'the deposit-retained wording');
    has(s._jobStatusCell({ status: 'pending' }), '<strong style="color:#7a4f00;">Pending Approval</strong>', 'pending keeps its amber emphasis');
    has(s._jobStatusCell({ status: '<x>' }), '&lt;x&gt;', 'and an unknown status is printed escaped, never raw');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ the stylesheet rules this build depends on — no test read CSS until one was deleted');
  {
    // The 368-line stylesheet deletion of 2026-09-10 went unseen because nothing read the CSS.
    // Each of these is invisible to every JS check if it goes, so each is asserted here.
    const css = src.slice(src.indexOf('<style'), src.indexOf('</style>'));
    const rule = (sel) => (css.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{[^}]*\\}')) || [''])[0];
    const btn = rule('.th-sort');
    has(btn, 'background:none', 'a sortable heading drops the button look…');
    has(btn, 'text-transform:inherit', '…and keeps the heading\'s uppercase');
    has(btn, 'cursor:pointer', 'and reads as pressable');
    const tile = rule('.mc-toggle');
    has(tile, 'cursor:pointer', 'a Won / Lost tile reads as pressable');
    has(tile, 'text-align:left', '…and keeps the tile\'s left-aligned figures rather than a button\'s centring');
    has(rule('.mc-caret'), 'color:var(--bronze)',
      '⚠ the tile caret is bronze — .sec-caret is tan for the dark fold bar and would vanish on a tan tile');
    has(css, '.mc-toggle[aria-expanded="true"]{', 'an open tile is marked as open');

    // ⚠ EIGHT TILES READ AS ONE BLOCK OF FIGURES. The rule, not today's numbers: the top row sits one
    // grid gap above the Win / Loss row — the gap between the tiles inside either row — so the two
    // rows read as one; an open list sits the same gap below the row it belongs to; and whatever is
    // last before the filters keeps the spacing the top row had on its own before 2026-09-23.
    const gap = (rule('.grid4').match(/gap:([^;}]+)/) || [])[1];
    ok(!!gap, 'the tile grid declares a gap');
    const topRow = listView.match(/<div class="grid4" style="margin-bottom:([^;"]+);?">/);
    eq(topRow && topRow[1], gap, 'the top row sits exactly one tile gap above the Win / Loss row');
    eq((css.match(/\.wl-row\.wl-row-open\{margin-bottom:([^;}]+)/) || [])[1], gap,
      'an open list sits the same gap below the row it opens from');
    const before = (css.match(/\.wl-row\{margin-bottom:([^;}]+)/) || [])[1];
    ok(!!before, 'a shut row keeps a margin before the filters');
    eq((css.match(/\.wl-lists\{margin-bottom:([^;}]+)/) || [])[1], before,
      'and an open list hands the filters exactly the same space');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ WALK EVERY BUTTON THAT WENT — each one\'s clients are a heading away');
  {
    // The rule this project records for any control that moves: walk every state in which it
    // used to be reachable. Eight buttons went; each is checked against what it used to return.
    // ⚠ The shared fixture's only Contested Probate client is LOST, so the old button returned
    // nobody and a contiguity check over nobody proves nothing. This walk adds a live one.
    const WALK = JOBS.concat([{ id: 19, name: 'Isling', svc: 'contested_probate', status: 'active', won: true,
      tc: 'Ashley Jerome', havellinEst: 52000, totalEst: 55000, start: '2026-09-15', re: 'no' }]);
    const L = list({ jobs: WALK });
    const sorted = (key) => { L.s._jobSort = { key, dir: L.s.JOB_SORTS[key].first }; L.s.renderJobs();
      return [...L.d.getElementById('jobs-body').innerHTML.matchAll(/<div style="font-weight:600;">([^<]+)/g)].map((m) => m[1]); };
    const live = WALK.filter((j) => j.status !== 'lost');
    const contiguous = (order, names) => {
      const at = names.map((n) => order.indexOf(n)).sort((a, b) => a - b);
      return at.length > 0 && at[0] >= 0 && at[at.length - 1] - at[0] === at.length - 1;
    };

    // New → the Status heading: the new clients come first.
    const byStatus = sorted('status');
    eq(byStatus[0], 'Carrow', '"New" is the top of a Status sort');

    // RE Potential → the RE heading: the old filter's clients are exactly the top of the sort.
    const oldRe = live.filter((j) => j.re === 'yes').map((j) => j.name);
    eq(sorted('re').slice(0, oldRe.length).sort().join(','), oldRe.sort().join(','),
      '"RE Potential" is the top of an RE sort — the same clients the button returned');

    // The six service buttons → the Service heading: each one's clients sit together.
    const bySvc = sorted('svc');
    const oldBtn = {
      'Home Editing / Transition': (j) => j.svc === 'downsizing' || j.svc === 'downsizing_move',
      'Home Cleanout': (j) => j.svc === 'home_cleanout', 'Estate Settlement': (j) => j.svc === 'cleanout',
      'Probate': (j) => j.svc === 'probate', 'Contested Probate': (j) => j.svc === 'contested_probate',
      'Home Prep': (j) => j.svc === 'prep',
    };
    Object.keys(oldBtn).forEach((b) => {
      const names = live.filter(oldBtn[b]).map((j) => j.name);
      ok(names.length > 0, '"' + b + '" had clients to find in this fixture');
      ok(contiguous(bySvc, names), '"' + b + '" — its clients sit together under a Service sort (' + names.join(', ') + ')');
    });
    // ⚠ AND THE OLD COMBINED BUTTON'S TWO SERVICES STAY SIDE BY SIDE — which A→Z by label would not
    // do, because Home Prep for Sale sorts between Home Editing and Home Transition.
    ok(contiguous(bySvc, ['Dunmore', 'Hadley']), '⚠ Home Editing and Home Transition are adjacent, as their one button was');
    eq(bySvc.slice(-2).join(','), 'Ashby,Isling',
      '⚠ and Probate and Contested Probate are the last two, side by side — A→Z would have put them at opposite ends');
  }
};
