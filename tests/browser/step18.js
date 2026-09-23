// Step 18 — Win / Loss leaves the nav for a row of tiles on the Client Dashboard, the client list
// goes from fourteen filters to six, and every data column sorts (2026-09-23). Anthony:
//
//   "do we really need a standalone win-loss report or should we just fold that into the top of
//    the client dashboard? … if we can expand like on lost jobs … or won jobs … to see the list of
//    jobs … why don't we just have those with expandable carets? … The sort should be … all …
//    active, pending approval, unassigned TC, closed and lost, and then be able to sort by the
//    service column, which wipes out the need for all of the big job type buttons."
//
// Drives the REAL page: the real nav, real clicks on the Won and Lost tiles, real clicks on the
// filter buttons and the column headings, a real row into a client and back, and a keyboard press.
// ⚠ Only the browser proves these are reachable — a tile rendered as a button in a string and a
//   person being able to press it are two claims, and the gap between them is where defects live.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step18.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' (got ' + JSON.stringify(a) + ')');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));

const JOBS = [
  { id: 801, name: 'Ashby',   addr: '1 Ocean Blvd, Palm Beach', svc: 'probate', status: 'active', won: true, tc: 'Ashley Jerome',
    havellinEst: 31000, totalEst: 36000, start: '2026-10-12', re: 'yes', wonAt: '2026-09-01', wonMethod: 'email',
    agrSigned: true, depositReceived: true, payments: [{ stage: 'deposit', amount: 15500 }] },
  { id: 802, name: 'Butler',  addr: '2 Worth Ave, Palm Beach', svc: 'cleanout', status: 'won', won: true, tc: '',
    havellinEst: 19940, totalEst: 22000, start: '2026-10-05', re: 'no', wonAt: '2026-09-20', wonMethod: 'call' },
  { id: 803, name: 'Carrow',  addr: '3 Royal Palm Way', svc: 'prep', status: 'new', tc: 'Anthony Graziano', re: '' },
  { id: 804, name: 'Dunmore', addr: '4 Seaview Ave', svc: 'downsizing', status: 'pending', tc: 'Ashley Jerome',
    havellinEst: 12050, totalEst: 12050, start: '2026-11-02', re: 'yes' },
  { id: 805, name: 'Ellery',  addr: '5 Jungle Rd', svc: 'cleanout', status: 'closed', won: true, tc: 'Anthony Graziano',
    havellinEst: 24000, totalEst: 26000, start: '2026-08-01', re: 'no', deliveredOn: '2026-09-01', wonAt: '2026-07-10', wonMethod: 'in_person' },
  { id: 806, name: 'Farrell', addr: '6 El Bravo Way', svc: 'home_cleanout', status: 'closed_retained', won: true, tc: '',
    havellinEst: 9000, totalEst: 9000, start: '2026-09-01', re: '', depositReceived: true, payments: [{ stage: 'deposit', amount: 4500 }] },
  { id: 807, name: 'Gault',   addr: '7 Via Bethesda', svc: 'contested_probate', status: 'lost', won: false, tc: 'Ashley Jerome',
    havellinEst: 40000, lostEst: 40000, lostReason: 'price', lostReasonLabel: 'Price / estimate too high',
    lostNote: 'Went with a cheaper firm', lostAt: '2026-07-01T12:00:00Z' },
  { id: 808, name: 'Hadley',  addr: '8 Arabian Rd', svc: 'downsizing_move', status: 'approved', tc: 'Anthony Graziano',
    havellinEst: 14250, totalEst: 15000, start: '2026-10-20', re: 'yes' },
  { id: 809, name: 'Isling',  addr: '9 Clarendon Ave', svc: 'cleanout', status: 'lost', won: false, tc: '',
    havellinEst: 8400, lostEst: 8400, lostReason: 'timing', lostReasonLabel: 'Timing — client not ready yet',
    lostAt: '2026-08-15T12:00:00Z' },
];

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('dialog', (d) => d.accept());
  await p.goto(APP); await p.waitForTimeout(1500);

  const overflow = () => p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  const names = () => p.evaluate(() => Array.from(document.querySelectorAll('#jobs-body tr'))
    .map((r) => (r.querySelector('td div') || {}).textContent || '').filter(Boolean));
  const tiles = () => p.evaluate(() => Array.from(document.querySelectorAll('#wl-block .metric-val')).map((x) => x.textContent.trim()));

  console.log('\n=== ON LOAD, BEFORE ANY CLIENT ===');
  // ⚠ INIT paints the list from what is in hand — the headings and the report included. It used to
  // wait for the fetch, and the markup holds an empty <thead> now.
  const load = await p.evaluate(() => ({
    ths: document.querySelectorAll('#jobs-head th').length,
    body: document.getElementById('jobs-body').textContent.trim(),
    tiles: Array.from(document.querySelectorAll('#wl-block .metric-val')).map((x) => x.textContent.trim()),
    state: _jobsState,
  }));
  eq(load.ths, 9, 'the header row is painted on load, nine headings');
  ok(/No clients yet|Loading clients/.test(load.body), 'the list says what is true on an empty device (' + load.body.slice(0, 60) + ')');
  eq(load.tiles.length, 4, 'and the Win / Loss row is painted too');

  console.log('\n=== THE NAV ===');
  const nav = await p.evaluate(() => {
    const bs = Array.from(document.querySelectorAll('.nav .nb')).map((x) => ({ t: x.textContent.trim(), l: Math.round(x.getBoundingClientRect().left), r: Math.round(x.getBoundingClientRect().right) }));
    return { bs, gapW: Math.round(document.querySelector('.nav-gap').getBoundingClientRect().width),
      panel: !!document.getElementById('panel-winloss') };
  });
  eq(nav.bs.map((x) => x.t), ['Client Dashboard', 'Job Plan', 'Job Admin & Inv', 'Contractors', 'Vendors', 'Referral Partners'],
    'six tabs — no Win / Loss');
  eq(nav.panel, false, 'and no Win / Loss panel left in the page');
  ok(Math.abs((nav.bs[3].l - nav.bs[2].r) - nav.gapW) <= 1, 'the gap still sits between Job Admin and Contractors (' + nav.gapW + 'px)');
  console.log('  (nav gap at 1440: ' + nav.gapW + 'px)');

  // Seed a real pipeline and paint it with the real renderer.
  await p.evaluate((J) => {
    jobs.length = 0; J.forEach((j) => jobs.push(JSON.parse(JSON.stringify(j))));
    _jobsState = 'ready';
    showPanel('jobs', document.querySelector('.nb'));
    renderJobs();
  }, JOBS);
  await p.waitForTimeout(150);

  console.log('\n=== THE WIN / LOSS ROW ===');
  eq(await tiles(), ['4', '2', '67%', '$48,400'], 'Won · Lost · Conversion · Lost revenue — the retained deposit counts as won');
  const geo = await p.evaluate(() => {
    const top = document.querySelector('#clients-list-view .grid4').getBoundingClientRect();
    const row = document.querySelector('#wl-block .wl-row').getBoundingClientRect();
    const topCards = Array.from(document.querySelectorAll('#clients-list-view > .grid4 .metric-card, #clients-list-view .grid4:not(.wl-row) .metric-card')).slice(0, 4).map((x) => Math.round(x.getBoundingClientRect().left));
    const rowCards = Array.from(document.querySelectorAll('#wl-block .wl-row > *')).map((x) => Math.round(x.getBoundingClientRect().left));
    const size = (els) => els.map((x) => Math.round(x.getBoundingClientRect().width) + 'x' + Math.round(x.getBoundingClientRect().height));
    const topSize = size(Array.from(document.querySelectorAll('#clients-list-view .grid4:not(.wl-row) .metric-card')).slice(0, 4));
    const rowSize = size(Array.from(document.querySelectorAll('#wl-block .wl-row > *')));
    const filters = document.querySelector('#clients-list-view .fb').getBoundingClientRect();
    const won = document.getElementById('wl-tile-won');
    return { gap: Math.round(row.top - top.bottom), topCards, rowCards, topSize, rowSize, belowFilters: filters.top > row.bottom,
      tag: won.tagName, caret: won.querySelector('.mc-caret').textContent, exp: won.getAttribute('aria-expanded'),
      cursor: getComputedStyle(won).cursor, caretColor: getComputedStyle(won.querySelector('.mc-caret')).color };
  });
  eq(geo.gap, 10, '⚠ the row sits one tile gap under Total Jobs — eight tiles, one block of figures');
  ok(geo.topCards.length === 4, 'four tiles on the top row');
  eq(geo.rowCards, geo.topCards, 'and its four tiles line up with the four above');
  eq(geo.rowSize, geo.topSize, '⚠ …at the same size — two of them are buttons, and a button brings its own padding and line height ('
    + geo.rowSize.join(' ') + ')');
  ok(geo.belowFilters, 'above the filters');
  eq(geo.tag, 'BUTTON', 'Won is a real button');
  eq([geo.caret, geo.exp], ['▸', 'false'], 'shut, with the fold caret');
  eq(geo.cursor, 'pointer', 'and reads as pressable');
  eq(geo.caretColor, 'rgb(166, 124, 69)', 'the caret is bronze on the tan tile');

  console.log('\n=== OPENING WON ===');
  await p.click('#wl-tile-won'); await p.waitForTimeout(150);
  const won = await p.evaluate(() => {
    const t = document.getElementById('wl-tile-won');
    const list = document.getElementById('wl-list-won');
    const row = document.querySelector('#wl-block .wl-row').getBoundingClientRect();
    return { exp: t.getAttribute('aria-expanded'), caret: t.querySelector('.mc-caret').textContent,
      rows: list ? Array.from(list.querySelectorAll('tbody tr')).map((r) => r.querySelector('td div').textContent) : [],
      text: list ? list.textContent : '', gap: list ? Math.round(list.getBoundingClientRect().top - row.bottom) : null };
  });
  eq([won.exp, won.caret], ['true', '▾'], 'pressing Won opens it, and the caret turns');
  eq(won.rows, ['Butler', 'Ashby', 'Ellery', 'Farrell'], 'newest acceptance first, and the one with no recorded acceptance date last');
  ok(/Closed — Deposit Retained/.test(won.text), '⚠ the retained deposit is on the Won list, named as one');
  ok(/4 clients · \$83,940/.test(won.text), 'the list heading counts them and what they are worth');
  eq(won.gap, 10, 'the list sits one gap under the row it opened from');

  console.log('\n=== A ROW OPENS ITS CLIENT, AND THE LIST IS STILL OPEN ON THE WAY BACK ===');
  await p.click('#wl-list-won tbody tr:first-child'); await p.waitForTimeout(250);
  const inClient = await p.evaluate(() => ({ dash: document.getElementById('client-dashboard-view').style.display,
    list: document.getElementById('clients-list-view').style.display,
    name: (document.getElementById('client-dashboard-view').textContent.match(/Butler/) || [''])[0] }));
  eq([inClient.dash, inClient.name], ['block', 'Butler'], 'pressing the Butler row opens Butler');
  await p.evaluate(() => closeClientDashboard()); await p.waitForTimeout(200);
  const back = await p.evaluate(() => ({ open: !!document.getElementById('wl-list-won'), exp: document.getElementById('wl-tile-won').getAttribute('aria-expanded') }));
  eq([back.open, back.exp], [true, 'true'], '⚠ back on the list, Won is still open — session state, not lost on a trip');

  console.log('\n=== LOST, BY KEYBOARD ===');
  await p.focus('#wl-tile-lost'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
  const lost = await p.evaluate(() => {
    const l = document.getElementById('wl-list-lost');
    const w = document.getElementById('wl-list-won');
    return { open: !!l, below: l && w ? l.getBoundingClientRect().top > w.getBoundingClientRect().bottom : false,
      reasons: l ? Array.from(l.querySelectorAll('.wl-reasons tbody tr td:first-child')).map((x) => x.textContent) : [],
      prospects: l ? Array.from(l.querySelectorAll('table:not(.wl-reasons) tbody tr')).map((r) => r.querySelector('td div').textContent) : [],
      scroll: l ? Array.from(l.querySelectorAll('.tbl-scroll')).length : 0 };
  });
  ok(lost.open, 'Enter on the focused Lost tile opens it — a keyboard reaches it');
  ok(lost.below, 'Won above Lost, in tile order');
  eq(lost.reasons.sort(), ['Price / estimate too high', 'Timing — client not ready yet'], 'the loss reasons break out, named');
  eq(lost.prospects, ['Isling', 'Gault'], 'the prospects newest loss first');
  eq(lost.scroll, 2, 'both tables scroll inside their own containers');
  await p.click('#wl-tile-lost'); await p.waitForTimeout(120);
  eq(await p.evaluate(() => !!document.getElementById('wl-list-lost')), false, 'pressing Lost again shuts it');

  console.log('\n=== THE SIX FILTERS ===');
  const btns = await p.evaluate(() => Array.from(document.querySelectorAll('#clients-list-view .fb')).map((x) => x.textContent.trim()));
  eq(btns, ['All', 'Active', 'Pending Approval', 'Unassigned TC', 'Closed', 'Lost'], 'All · Active · Pending Approval · Unassigned TC · Closed · Lost');
  const want = { 'All': ['Ashby', 'Butler', 'Carrow', 'Dunmore', 'Ellery', 'Farrell', 'Hadley'], 'Active': ['Ashby'],
    'Pending Approval': ['Dunmore'], 'Unassigned TC': ['Butler', 'Farrell'], 'Closed': ['Ellery', 'Farrell'], 'Lost': ['Gault', 'Isling'] };
  for (const label of btns) {
    await p.click('#clients-list-view .fb >> text="' + label + '"'); await p.waitForTimeout(80);
    eq(await names(), want[label], label + ' shows what it says');
  }
  eq(await tiles(), ['4', '2', '67%', '$48,400'], '⚠ the Win / Loss row counts the whole pipeline whatever the filter');
  await p.click('#clients-list-view .fb >> text="All"'); await p.waitForTimeout(80);

  console.log('\n=== SORTING BY A HEADING ===');
  const hdr = (k) => '#jobs-head button[onclick="setJobSort(\'' + k + '\')"]';
  await p.click(hdr('svc')); await p.waitForTimeout(80);
  eq(await names(), ['Carrow', 'Dunmore', 'Hadley', 'Farrell', 'Butler', 'Ellery', 'Ashby'],
    'Service sorts in catalogue order — Home Prep, Editing, Transition, Cleanout, Estate Settlement ×2, Probate');
  let h = await p.evaluate(() => { const th = document.querySelector('#jobs-head button[onclick="setJobSort(\'svc\')"]').parentElement;
    return { aria: th.getAttribute('aria-sort'), ind: th.querySelector('.th-sort-ind').textContent, color: getComputedStyle(th.querySelector('.th-sort-ind')).color }; });
  eq([h.aria, h.ind], ['ascending', '↑'], 'the heading says so, with an arrow');
  eq(h.color, 'rgb(166, 124, 69)', 'lit bronze');
  await p.click(hdr('svc')); await p.waitForTimeout(80);
  eq((await names())[0], 'Ashby', 'a second press reverses it');
  await p.click(hdr('svc')); await p.waitForTimeout(80);
  eq(await names(), want.All, 'a third clears it — back to the list\'s own order');
  h = await p.evaluate(() => document.querySelector('#jobs-head button[onclick="setJobSort(\'svc\')"]').parentElement.getAttribute('aria-sort'));
  eq(h, 'none', 'and the heading says nothing is sorted');
  await p.click(hdr('re')); await p.waitForTimeout(80);
  eq((await names()).slice(0, 3).sort(), ['Ashby', 'Dunmore', 'Hadley'], '"RE Potential" is the top of an RE sort');
  await p.click(hdr('status')); await p.waitForTimeout(80);
  eq((await names())[0], 'Carrow', '"New" is the top of a Status sort');
  await p.click(hdr('status')); await p.click(hdr('status')); await p.waitForTimeout(80);
  const glyphs = await p.evaluate(() => document.getElementById('jobs-head').textContent);
  ok(!/[▸▾▼▶▲]/.test(glyphs), 'no fold caret on a heading');

  console.log('\n=== A COLD DEVICE ===');
  const cold = await p.evaluate(() => {
    const keep = jobs.slice(); jobs.length = 0; _jobsState = 'loading'; renderJobs();
    const r = { top: ['m-tot', 'm-act', 'm-re'].map((id) => document.getElementById(id).textContent),
      tiles: Array.from(document.querySelectorAll('#wl-block .metric-val')).map((x) => x.textContent.trim()),
      body: document.getElementById('jobs-body').textContent.trim(), ths: document.querySelectorAll('#jobs-head th').length };
    _jobsState = 'offline'; renderJobs();
    r.off = document.getElementById('jobs-body').textContent.trim();
    keep.forEach((j) => jobs.push(j)); _jobsState = 'ready'; renderJobs();
    return r;
  });
  eq(cold.top, ['—', '—', '—'], 'an unread list reads dashes across the top row');
  eq(cold.tiles, ['—', '—', '—', '—'], 'and across the Win / Loss row');
  ok(/Loading clients/.test(cold.body), 'the list says it is loading');
  eq(cold.ths, 9, 'with its headings still there');
  ok(/Could not reach the client list/.test(cold.off) && /reload the page/.test(cold.off), 'an unreachable sheet says so, and says to reload');

  console.log('\n=== FIELD MODE ===');
  await p.evaluate(() => setFieldMode(true)); await p.waitForTimeout(150);
  const fm = await p.evaluate(() => ({ wl: document.getElementById('wl-block').getClientRects().length,
    tabs: Array.from(document.querySelectorAll('.nav .nb')).filter((x) => x.getClientRects().length).length,
    title: document.getElementById('field-toggle').title }));
  eq(fm.wl, 0, 'the Win / Loss row is not on the phone\'s field screen — it never was a field tab');
  eq(fm.tabs, 3, 'three tabs in the bottom bar');
  ok(/six tabs/.test(fm.title), 'the toggle promises six tabs back (' + fm.title + ')');
  await p.evaluate(() => setFieldMode(false)); await p.waitForTimeout(150);

  console.log('\n=== WIDTHS ===');
  await p.evaluate(() => { _wlOpen.won = true; _wlOpen.lost = true; renderJobs(); });
  eq(await overflow(), 0, 'no horizontal overflow at 1440 with both lists open');
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(250);
  const ph = await p.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('#wl-block .wl-row > *')).map((x) => Math.round(x.getBoundingClientRect().left));
    const t = document.querySelector('#wl-list-lost table:not(.wl-reasons)');
    const sc = t ? t.closest('.tbl-scroll') : null;
    return { cols: new Set(cards).size, scrolls: sc ? sc.scrollWidth > sc.clientWidth : false };
  });
  eq(ph.cols, 2, 'at 390 the row runs two tiles across, as the top row does');
  eq(await overflow(), 0, 'no horizontal overflow at 390 with both lists open');
  console.log('  (the lost-prospects table ' + (ph.scrolls ? 'scrolls inside its own box' : 'fits') + ' at 390)');
  await p.evaluate(() => { _wlOpen.won = false; _wlOpen.lost = false; renderJobs(); });

  eq(errs.length, 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log('\nstep18: ' + pass + ' passed, ' + fail + ' failed, ' + errs.length + ' page errors');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
