'use strict';
// CLIENT INTAKE AND BUILD ESTIMATE LEAVE THE NAV — THEY ARE SCREENS OFF THE DASHBOARD (2026-09-23).
//
// Anthony: *"doing away with client intake tab and build estimate tabs. client dashboard needs a
// 'Add New Client' button at the top that launches the client intake … same idea with 'Build
// Estimate'. it should be a brown button above the job timeline just the way the other job
// functions appear as you go along the timeline. then, for cosmetics lets separate the top
// navigation … client facing tabs to the left, contact tabs to the right."* And then: *"the build
// estimate and client intake can launch the way a client does in the dashboard. not as a popup,
// but as another full screen."*
//
// ⚠⚠ THE POINT OF THIS FILE IS THAT NOTHING WAS LOST. Removing a tab strands whoever needs what
// was only on it — that is the audit Slice 7 had to do, and it applies here twice over:
//   · a new client can only be created from + Add New Client now;
//   · the estimate can only be opened from the client's timeline now — and on the morning of a
//     walkthrough the band was lit on "Change the walkthrough date", with no Build Estimate
//     anywhere on the screen.
// Both doors are driven below, and so are the two ways back out.

const { sandbox, source, fn, domStub } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const css = src.slice(src.indexOf('<style>'), src.indexOf('</style>'));
  // Line-based comment strip: a /\*…\*\/ regex eats ~170KB of this file because of
  // accept="image/*" (CLAUDE.md records it), so block comments are left in and only //-lines
  // and HTML comments are removed — which is enough for the user-facing-string checks below.
  const live = src.replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  ok(live.length > src.length * 0.5, 'the comment strip did not eat the file');

  const navAt = src.indexOf('<div class="nav">');
  const nav = src.slice(navAt, src.indexOf('</div>', navAt));

  // ───────────────────────────────────────────────────────────────────────────
  group('the nav: client tabs left, contact tabs right, white space between');
  {
    const at = (t) => nav.indexOf("showPanel('" + t + "',this)");
    const gap = nav.indexOf('class="nav-gap"');
    ok(gap > 0, 'there is a gap element in the nav');
    ['jobs', 'job-plan', 'inventory'].forEach((t) =>
      ok(at(t) > 0 && at(t) < gap, t + ' is LEFT of the gap — a client-facing tab'));
    // ⚠ RESTATED 2026-09-23: Win / Loss left the nav for a row of tiles on the Client Dashboard
    // (tests/win-loss.test.js carries the row). The left group is the three that remain.
    eq(at('winloss'), -1, 'Win / Loss has no nav button — it is a row on the Client Dashboard');
    ['contractors', 'vendors', 'referrals'].forEach((t) =>
      ok(at(t) > gap, t + ' is RIGHT of the gap — a directory of people we call'));
    ok(at('jobs') < at('job-plan') && at('job-plan') < at('inventory'),
      'left group in Anthony\'s order: Client Dashboard, Job Plan, Job Admin');
    ok(at('contractors') < at('vendors') && at('vendors') < at('referrals'),
      'right group: Contractors, Vendors, Referral Partners');
    eq((nav.match(/class="nav-gap"/g) || []).length, 1, 'exactly one gap — two groups, not three');
    has(nav, 'aria-hidden="true"', 'the gap is presentation only, never announced');

    // The gap GROWS, so the right group sits flush right on a desk — and field mode drops it, or
    // the bottom bar's even thirds would be pushed apart by a slot nobody can see.
    ok(/\.nav-gap\{flex:1 1 auto;min-width:\d+px;\}/.test(css), 'the gap grows to fill the row, with a floor');
    has(css, 'body.field-mode .nav-gap{display:none;}', 'field mode drops the gap');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ DOOR 1: + ADD NEW CLIENT is the first thing on the Client Dashboard');
  {
    const listAt = src.indexOf('<div id="clients-list-view">');
    const btnAt = src.indexOf('id="btn-add-client"');
    const metricsAt = src.indexOf('<div class="grid4"', listAt);
    ok(listAt > 0 && btnAt > listAt, 'the button is on the client list');
    ok(btnAt < metricsAt, 'and ABOVE the metric tiles — "at the top"');
    const btn = src.slice(src.lastIndexOf('<button', btnAt), src.indexOf('</button>', btnAt));
    has(btn, 'onclick="openIntakeScreen()"', 'it opens the intake screen');
    has(btn, '+ Add New Client', 'and says so in Anthony\'s words');
    // The one place a person creates a client from an empty app says where to go.
    has(src, 'No clients yet. Press + Add New Client to add the first.', 'the empty list names the button');
    lacks(live, 'Use Client Intake to add the first job', 'not a tab that no longer exists');
    // ⚠ And the renderer tells an empty LIST from an empty FILTER, and an unread list from both.
    const rj = fn('renderJobs');
    has(rj, "jobs.length ? 'No jobs match this filter.'", 'a filter that matches nothing still says so');
    has(rj, 'jobsUnread()', 'and a cold cache is not reported as a business with no clients');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // A fake page with the real panel ids and the real nav, enough to drive the switching code.
  function page(opts) {
    opts = opts || {};
    const d = domStub(opts.seed || {});
    const panelIds = ['panel-jobs', 'panel-intake', 'panel-estimate', 'panel-job-plan', 'panel-inventory', 'panel-vendors'];
    const panels = panelIds.map((id) => { const el = d.getElementById(id); el.className = 'panel'; return el; });
    // domStub mints any id it is asked for; a real page answers null for a panel it has not got.
    const _get = d.getElementById.bind(d);
    d.getElementById = (id) => (/^panel-/.test(String(id)) && panelIds.indexOf(id) === -1) ? null : _get(id);
    panels[0].classList.add('active');
    const navCalls = ['jobs', 'job-plan', 'inventory', 'contractors', 'vendors', 'referrals'];
    const clicks = [];
    const nbs = navCalls.map((t) => {
      const b = d.createElement('button');
      b.setAttribute('onclick', "showPanel('" + t + "',this)");
      b.click = () => clicks.push(t);
      return b;
    });
    if (!opts.noJobsTab) nbs[0].classList.add('active'); else nbs.splice(0, 1);
    d.querySelectorAll = (sel) => sel === '.panel' ? panels : sel === '.nb' ? nbs : [];
    d.querySelector = (sel) => {
      const m = /^\.nb\[onclick\*="showPanel\('([a-z-]+)'"\]$/.exec(sel);
      if (m) return nbs.filter((b) => b.getAttribute('onclick').indexOf("showPanel('" + m[1] + "'") === 0)[0] || null;
      return null;
    };
    return { d, panels, nbs, clicks, active: () => panels.filter((p) => p.classList.contains('active')).map((p) => p.id),
             lit: () => nbs.filter((b) => b.classList.contains('active')).map((b) => /showPanel\('([a-z-]+)'/.exec(b.getAttribute('onclick'))[1]) };
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('a screen off the dashboard: one panel shown, the Client Dashboard tab stays lit');
  {
    const pg = page();
    const log = [];
    const c = sandbox({
      fns: ['_showDashScreen', '_navJobsBtn', 'openIntakeScreen'],
      stubs: { document: pg.d, window: { scrollTo: () => log.push('scroll') },
               closeClientDashboard: () => log.push('closeDash'), stopPlanWatch: () => log.push('stopPlan') },
    });
    eq(c.openIntakeScreen(), true, 'the intake screen opens');
    eq(pg.active(), ['panel-intake'], 'exactly one panel is up, and it is the intake form');
    eq(pg.lit(), ['jobs'], '⚠ the Client Dashboard tab stays lit — that is where you came from and where back returns');
    ok(log.indexOf('closeDash') > -1, 'the drilldown is put away first, so it cannot answer for a screen it is behind');
    ok(log.indexOf('stopPlan') > -1, 'the Job Plan watch stops, as showPanel stops it on every other exit');
    ok(log.indexOf('scroll') > -1, 'and the screen opens at the top');
    eq(pg.clicks, [], 'no tab was clicked to get here — there is no tab');

    const pg2 = page();
    const c2 = sandbox({ fns: ['_showDashScreen', '_navJobsBtn'],
      stubs: { document: pg2.d, window: { scrollTo() {} }, closeClientDashboard() {}, stopPlanWatch() {} } });
    eq(c2._showDashScreen('panel-nope'), false, 'an unknown panel changes nothing');
    eq(pg2.active(), ['panel-jobs'], 'the dashboard is still up');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the way back: the tab first, then the client, then the message');
  {
    const order = [];
    const pg = page();
    pg.nbs[0].click = () => order.push('tab');
    const c = sandbox({
      fns: ['goToClientDashboard', '_navJobsBtn', 'closeIntakeScreen'],
      stubs: { document: pg.d, window: { scrollTo() {} }, jobs: [{ id: 7 }],
               openClientDashboard: (id) => order.push('open:' + id),
               dashNotice: (k, m) => order.push('notice:' + k + ':' + m),
               _dashRedraw: (id) => order.push('redraw:' + id) },
    });
    eq(c.goToClientDashboard(7, 'ok', 'Client created: Tripp Butler.'), true, 'it lands');
    eq(order, ['tab', 'open:7', 'notice:ok:Client created: Tripp Butler.', 'redraw:7'],
      '⚠ NAV FIRST, DRILLDOWN SECOND, NOTICE LAST — the tab resets to the list, and openClientDashboard nulls any earlier notice');
    order.length = 0;
    c.goToClientDashboard(999);
    eq(order, ['tab'], 'a job that is not in the list lands on the list, never on a blank drilldown');
    order.length = 0;
    c.closeIntakeScreen();
    eq(order, ['tab'], '← Clients from the intake screen returns to the list');

    const pg2 = page({ noJobsTab: true });
    const c2 = sandbox({ fns: ['goToClientDashboard', '_navJobsBtn'],
      stubs: { document: pg2.d, window: { scrollTo() {} }, jobs: [], openClientDashboard() {}, dashNotice() {}, _dashRedraw() {} } });
    eq(c2.goToClientDashboard(7), false, 'no dashboard tab, no navigation — and nothing half-done');
    lacks(fn('goToClientDashboard'), "showPanel('jobs')", 'never the one-argument showPanel that throws');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ SAVE CLIENT lands on the NEW client\'s own dashboard, at once');
  {
    const d = domStub({
      'i-svc': 'downsizing', 'i-fname': 'Tripp', 'i-lname': 'Butler', 'i-phone': '(561) 555-0100',
      'i-email': 'tb@example.com', 'i-addr': '69 Beach Blvd', 'i-city': 'Palm Beach', 'i-zip': '33480',
      'i-sqft': '3500', 'i-ptype': 'Estate', 'i-src': 'Attorney', 'i-start': '2026-10-01',
    });
    const said = [], landed = [], timers = [];
    const c = sandbox({
      fns: ['saveIntake', 'intakeAsksHouseContents', 'houseFlagsOf', 'resolveExecutorAuth', 'docTierScope', 'docTierScopeMirror', 'docTierDef'],
      vars: ['EXECUTOR_AUTH_OPTIONS', 'SVC_LABELS', 'DOC_TIERS'],
      stubs: { document: d, jobs: [], showFB: (el, k, m) => said.push({ el, k, m }),
               saveJobs() {}, syncJobToSheets() {}, createDriveJobFolder() {},
               clearIntakeForm() {}, populateAgrSelect: null, showPanel() {},
               generateHvlId: () => 'HVL-0007', readHouseFlagInputs: () => ({}),
               lookupReferralById: () => null, setTimeout: (f, ms) => timers.push(ms),
               goToClientDashboard: (id, k, m) => landed.push({ id, k, m }) },
    });
    c.saveIntake();
    eq(c.jobs.length, 1, 'the client is created');
    eq(landed.length, 1, 'and the screen lands exactly once');
    eq(landed[0] && landed[0].id, c.jobs[0] && c.jobs[0].id, '⚠ on THAT client — the one just created, whose timeline carries the next step');
    eq(landed[0] && landed[0].k, 'ok', 'with a success notice');
    has((landed[0] || {}).m || '', 'Client created: Tripp Butler.', 'naming them');
    lacks((landed[0] || {}).m || '', '&amp;', 'plain text — the dashboard escapes it when it paints');
    ok(timers.indexOf(800) === -1, '⚠ NO 800ms TIMER — the redirect that yanked a quick script (or person) back off whatever came next');
    eq(said.filter((x) => x.k === 'ok').length, 0, 'the success line is not printed onto the intake screen it has just left');
    const body = fn('saveIntake');
    lacks(body, "document.querySelectorAll('.nb')", 'it no longer hunts through the nav for a tab by its text');
    lacks(body, 'Find them in the Clients tab', 'nor tells you to go and look for the client');
    lacks(body, 'pick them from the job list', 'nor points at a Build Estimate picker that screen no longer shows');

    // ⚠ The name travels as PLAIN TEXT. The dashboard escapes the notice when it paints it, so a
    // notice escaped here too prints "O&#39;Hara &amp; Co" on the client's screen — the &amp;amp;
    // defect this file records once already. "Tripp Butler" above cannot tell the two apart, so
    // this case carries an apostrophe and an ampersand, and lifts the REAL esc (the harness stub
    // does not escape apostrophes).
    const d3 = domStub({
      'i-svc': 'downsizing', 'i-fname': 'Maeve', 'i-lname': "O'Hara & Co", 'i-phone': '(561) 555-0100',
      'i-email': 'mo@example.com', 'i-addr': '12 Ocean Dr', 'i-city': 'Palm Beach', 'i-zip': '33480',
      'i-sqft': '3500', 'i-ptype': 'Estate', 'i-src': 'Attorney', 'i-start': '2026-10-01',
    });
    const landed3 = [];
    const c3 = sandbox({
      fns: ['saveIntake', 'intakeAsksHouseContents', 'houseFlagsOf', 'resolveExecutorAuth', 'docTierScope', 'docTierScopeMirror', 'docTierDef', 'esc'],
      vars: ['EXECUTOR_AUTH_OPTIONS', 'SVC_LABELS', 'DOC_TIERS'],
      stubs: { document: d3, jobs: [], showFB() {}, saveJobs() {}, syncJobToSheets() {}, createDriveJobFolder() {},
               clearIntakeForm() {}, populateAgrSelect: null, showPanel() {}, generateHvlId: () => 'HVL-0009',
               readHouseFlagInputs: () => ({}), lookupReferralById: () => null, setTimeout() {},
               goToClientDashboard: (id, k, m) => landed3.push({ id, k, m }) },
    });
    c3.saveIntake();
    const m3 = (landed3[0] || {}).m || '';
    has(m3, "Maeve O'Hara & Co", '⚠ an apostrophe and an ampersand reach the dashboard as typed');
    lacks(m3, '&#39;', 'never pre-escaped — the dashboard is what escapes it');
    lacks(m3, '&amp;', 'and no &amp; for the dashboard to escape a second time');

    // A refusal stays put, on the screen where the fix is.
    const d2 = domStub({ 'i-svc': 'downsizing', 'i-fname': 'Tripp' });
    const landed2 = [];
    const c2 = sandbox({
      fns: ['saveIntake', 'intakeAsksHouseContents', 'houseFlagsOf', 'resolveExecutorAuth', 'docTierScope', 'docTierScopeMirror', 'docTierDef'],
      vars: ['EXECUTOR_AUTH_OPTIONS', 'SVC_LABELS', 'DOC_TIERS'],
      stubs: { document: d2, jobs: [], showFB() {}, saveJobs() {}, syncJobToSheets() {}, createDriveJobFolder() {},
               clearIntakeForm() {}, populateAgrSelect: null, showPanel() {}, generateHvlId: () => 'HVL-0008',
               readHouseFlagInputs: () => ({}), lookupReferralById: () => null, setTimeout() {},
               goToClientDashboard: (id) => landed2.push(id) },
    });
    c2.saveIntake();
    eq(c2.jobs.length, 0, 'an incomplete intake is refused');
    eq(landed2, [], 'and it does NOT navigate away from the fields it just named');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ DOOR 2: BUILD ESTIMATE opens from the timeline — resume when it is the same client');
  {
    const run = (o) => {
      const d = domStub({ 'e-job': { value: String(o.bound || '') },
                          'est-loading-bar': { style: { display: o.loading ? 'block' : 'none' } } });
      const log = [];
      const c = sandbox({
        fns: ['openEstimateScreen'],
        stubs: { document: d, currentEstimate: o.cur === undefined ? null : o.cur,
                 _showDashScreen: (id) => log.push('show:' + id), calcAll: () => log.push('calc'),
                 applyEstimateLock: () => log.push('lock'), editEstimateForJob: (id) => log.push('open:' + id) },
      });
      return { r: c.openEstimateScreen(o.jobId), log };
    };
    const resumed = run({ jobId: 7, bound: 7, cur: { jobId: 7 } });
    eq(resumed.r, 'resumed', '⚠ the same client, form still bound to them — the walkthrough is picked up where it was');
    eq(resumed.log, ['show:panel-estimate', 'calc', 'lock'],
      'shown, recomputed off the form, and the lock re-read — a manager may have approved it meanwhile');
    eq(run({ jobId: 8, bound: 7, cur: { jobId: 7 } }).log, ['open:8'], 'another client takes the cloud-authoritative open');
    eq(run({ jobId: 7, bound: 7, cur: { jobId: 8 } }).log, ['open:7'],
      '⚠ a working copy primed for ANOTHER client (a Submit pressed on their dashboard) is never shown under this one');
    eq(run({ jobId: 7, bound: 7, cur: null }).log, ['open:7'], 'nothing in memory — open it');
    eq(run({ jobId: 7, bound: 0, cur: { jobId: 7 } }).log, ['open:7'], 'a form bound to nobody (after a save) — open it');
    eq(run({ jobId: 7, bound: 7, cur: { jobId: 7 }, loading: true }).log, ['open:7'],
      'an open still in flight is not a form that is theirs yet');

    // The band's button is the only door now, and it no longer needs the 100ms hop.
    const go = fn('dashGoEstimate');
    has(go, 'openEstimateScreen(jobId)', 'the timeline button opens the screen');
    lacks(go, 'setTimeout', 'with no hop — _showDashScreen puts the drilldown away itself');
    const ed = fn('editEstimateForJob');
    has(ed, "_showDashScreen('panel-estimate')", 'the full open lands on the same screen');
    const edLive = ed.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    lacks(edLive, '.nb[onclick*="estimate"]', 'and no longer hunts for a nav button that is not there');
    lacks(fn('showPanel'), "id==='estimate'", 'the retired tab\'s branch is gone, not left compiling');
    lacks(live, "showPanel('estimate'", 'nothing navigates to the retired tab');
    lacks(live, "showPanel('intake'", 'or to the other one');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('back from Build Estimate returns to the client the FORM is for');
  {
    const d = domStub({ 'e-job': { value: '7' } });
    const went = [];
    const c = sandbox({ fns: ['closeEstimateScreen'], stubs: { document: d, goToClientDashboard: (id) => went.push(id) } });
    c.closeEstimateScreen();
    eq(went, [7], 'it reads the bound client off the form, not a copy kept beside it');
    d.getElementById('e-job').value = '';
    c.closeEstimateScreen();
    eq(went, [7, 0], 'and a form bound to nobody returns to the list');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the screen says which client it is for — and the back button is named after them');
  {
    const d = domStub();
    const c = sandbox({ fns: ['paintEstimateScreenHead', 'esc', 'svcLabelOf'], vars: ['SVC_LABELS'], stubs: { document: d } });
    c.paintEstimateScreenHead({ id: 7, name: 'Smith & Sons', addr: '69 Beach Blvd, Palm Beach', svc: 'cleanout' });
    has(d.getElementById('est-back').innerHTML, '&larr; Smith &amp; Sons', 'the way back is named after the client, escaped');
    eq(d.getElementById('est-screen-client').textContent, 'Smith & Sons · 69 Beach Blvd · Estate Settlement',
      'the bar names the client, the street and the service');
    eq(d.getElementById('e-job-name').textContent, 'Smith & Sons · 69 Beach Blvd', 'and so does the Job card, where the picker was');
    c.paintEstimateScreenHead(null);
    has(d.getElementById('est-back').innerHTML, 'Clients', 'cleared, the way back is to the list');
    eq(d.getElementById('est-screen-client').textContent, '', 'and nobody is named');
    // ⚠ Painted from renderJobRefStrip because BOTH open paths call it — a fresh build and a
    // reopened saved estimate. The strip itself once vanished on every reopen for missing that.
    has(fn('renderJobRefStrip'), 'paintEstimateScreenHead(job)', 'both open paths paint it');
    has(fn('clearEstimateTab'), 'paintEstimateScreenHead(null)', 'and clearing unpaints it');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the picker is hidden, never deleted; Clear became Start over, on the same client');
  {
    const at = src.indexOf('<select id="e-job"');
    ok(at > 0, 'the job select is still in the page — fifteen reads bind the form through it');
    ok(/<select id="e-job"[^>]*style="display:none;"/.test(src), 'and it is hidden, so the screen cannot swap clients under its own back bar');
    has(src, 'onclick="startEstimateOver()"', 'Start over is on the Job card');
    lacks(src, 'onclick="clearEstimateTab()"', 'and the Clear that unbound the client is gone');

    const run = (jid, answer) => {
      const d = domStub({ 'e-job': { value: String(jid || '') } });
      const log = [];
      const c = sandbox({ fns: ['startEstimateOver'], stubs: { document: d, window: {}, confirm: () => answer,
        clearEstimateTab: () => { log.push('clear'); d.getElementById('e-job').value = ''; },
        populateJobSelect: (id) => log.push('populate:' + id), loadJobIntoEstimate: () => log.push('load:' + d.getElementById('e-job').value) } });
      c.startEstimateOver();
      return log;
    };
    eq(run(7, false), [], 'cancelled, nothing is cleared');
    eq(run(7, true), ['clear', 'populate:7', 'load:7'],
      '⚠ confirmed, it clears and REBINDS the same client — the list is repopulated with its option first, or the select refuses the value');
    eq(run(0, true), ['clear'], 'with no client bound it is the plain clear it always was');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ a locked estimate still has a way out');
  {
    const els = ['e-job', 'e-sqft', 'est-back'].map((id) => {
      const el = { id, disabled: false, __a: {}, classList: { contains: (k) => id === 'est-back' && k === 'screen-back' } };
      el.setAttribute = (k, v) => { el.__a[k] = v; }; el.removeAttribute = (k) => { delete el.__a[k]; };
      return el;
    });
    const d = domStub();
    d.getElementById('panel-estimate').querySelectorAll = () => els;
    const c = sandbox({ fns: ['applyEstimateLock'],
      stubs: { document: d, estimateApproved: false, estimateSubmitted: true, jobs: [], currentEstimate: null,
               startApprovalWatch() {}, stopApprovalWatch() {} } });
    c.applyEstimateLock();
    eq(els[1].disabled, true, 'a submitted estimate locks the form');
    eq(els[0].disabled, false, 'the picker stays live, as it always did');
    eq(els[2].disabled, false, '⚠ and the back button is NOT disabled — with no tab to click away to, a locked way out is a screen nobody can leave');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE TIMELINE CARRIES BUILD ESTIMATE WHEREVER THE WALKTHROUGH IS NEXT');
  {
    const ctx = sandbox({
      fns: ['jobTimelineActions', 'jobStageDoc', 'docReadiness', 'docDraftOnly', 'docTitle', 'docWord', '_jtDocSecondaries',
            'agreementReady', 'isJobWon', 'docSentAt', 'docDraftedAt', 'docKeyFor', '_jtSendAction', '_jtDocViews',
            '_jtDraftLink', '_jtDriveLink', 'isAgreementSent', 'esignAvailable', 'esignProviderKey', 'esignJobWatches',
            'agreementSignature', 'isAgreementSigned'],
      vars: ['JT_ROW_DOC', 'DOC_READY_WHY', 'DOC_KIND_WORD', 'DOC_STAGE_WORD', 'DOC_ACTIONS', 'ESIGN_PROVIDERS',
             'ESIGN_PROVIDER_KEY', 'AGR_SIG_METHODS'],
      stubs: { SHEETS_SYNC_URL: '' },
    });
    const act = (key, job) => ctx.jobTimelineActions({ key, state: 'current' }, Object.assign({ id: 7, status: 'new' }, job), null);

    // The morning of a walkthrough: the row stays lit until noon on the date, so the band opens
    // HERE. Its only button used to be "Change the walkthrough date" — and with the tab gone,
    // that is the door locked from outside.
    const booked = act('walkthrough', { walkthrough: '2026-09-25' });
    eq(booked.primary && booked.primary.label, 'Build estimate', '⚠ a booked walkthrough\'s brown button IS the estimate');
    eq(booked.primary && booked.primary.call, 'dashGoEstimate(7)', 'and it opens the screen');
    eq(booked.secondary.map((s) => s.call), ['dashEditClient(7)'], 'moving the date is the outline button beside it');
    has(booked.secondary[0].label, 'Change the walkthrough date', 'named for what it does');

    const unbooked = act('walkthrough', { walkthrough: '' });
    eq(unbooked.primary && unbooked.primary.label, 'Set the walkthrough date', 'with no date booked, booking one comes first');
    eq(unbooked.secondary.map((s) => s.call), ['dashGoEstimate(7)'], 'and the estimate is still one tap away');

    const built = act('estimate_built', {});
    eq(built.primary && built.primary.label, 'Build estimate', 'past the walkthrough, the brown button is the estimate');
    eq(built.primary && built.primary.call, 'dashGoEstimate(7)', 'on the same screen');

    // Not lit: nothing offered from these rows at all, so no control renders twice.
    const idle = ctx.jobTimelineActions({ key: 'walkthrough', state: 'done' }, { id: 7, walkthrough: '2026-09-01' }, null);
    eq(idle.primary, null, 'a finished walkthrough offers no button');
    eq(idle.secondary, [], 'and no secondary to duplicate the band\'s');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('no message sends anybody to a tab that is gone');
  {
    // The intake form only CREATES clients, and now it is not even a tab — a refusal naming it
    // for an existing client is the defect CLAUDE.md records twice ("a refusal is only as good
    // as the route it names").
    // (Needles are the messages themselves: a CSS comment describing "every select on Client
    // Intake" is a note about the stylesheet, not a route anybody is sent down.)
    ['in Client Intake', 'Change that on Client Intake', 'Build Estimate tab', 'Find them in the Clients tab',
     'Set in Client Intake'].forEach((n) => lacks(live, n, 'no live line says "' + n + '"'));
    has(live, 'add one with Edit Client first', 'a missing client email names the form that can add it');
    has(live, 'Set on the client &mdash; Edit Client', 'the start date on the estimate names where it is set');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('field mode: the Client Dashboard is the landing, the screens keep it lit');
  {
    const body = fn('setFieldMode');
    has(body, ".nb[data-field-default]", 'entering field mode from a hidden tab lands on the default');
    lacks(body, 'Land on Build Estimate', 'which is no longer Build Estimate');
    // ⚠ The screen-bar is sticky under the topbar, whose height field mode changes — the
    // re-measure that already runs on the toggle is what keeps it from tucking underneath.
    has(body, 'setTopbarHeight()', 'the topbar is re-measured on the toggle');
    has(css, '.screen-bar{position:sticky;top:var(--topbar-h,0px);', 'and the back bar sits just beneath it');
  }
};
