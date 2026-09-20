'use strict';
// HOURS ON EVERY JOB — DECIDED 2026-09-20 — AND PROVING THE PLUMBING FOUND TWO LEAKS.
//
// Anthony: "I think we should log hours for every job. So I want all that functionality in the job
// plan and I'm gonna make it mandatory for transition concierges. Nothing for you to change as long
// as all that plumbing is still wired in there and works." Driving the REAL hours form on a
// fixed-price job in a browser, rather than reading the source, found two things on that path:
//
// 1. `rebuildLogDropdowns` held its OWN copy of what a specialist select offers — "None / every
//    specialist / Other" — and `loadJobPlanTab` calls it straight after `buildLogTeamRows`, so on
//    every plan open every specialist select lost "Contractor TBD" (the placeholder the team
//    sign-off itself tells you to pick), regained every name in every slot (undoing the
//    one-person-one-slot rule), and gained "Other", which stores the literal word as a crew
//    member. With today's roster (one active specialist) a job priced for two could not be
//    confirmed from the form as first drawn. One builder now, `_logSelectOptionsHtml`, read by both.
//
// 2. `saveLogEntry` repainted the summary, the history and the projection — all inside the log
//    section — and never the two readouts that live OUTSIDE it: the count on the Hours fold and the
//    schedule strip on the header. So the fold went on shouting "no hours logged today" in amber
//    over the entry that had just cleared it, until the next redraw. `_repaintHoursReadouts` moves
//    both in place, never by redrawing the plan (which destroys the form under the person typing).
//
// And the answer to the question itself, pinned in group 3: nothing on the hours path — the form,
// the save, the fold — holds an opinion about fixed price. The team gate and the deposit gate are
// the only refusals, on every billing basis alike.

const { sandbox, fn, domStub } = require('./harness');

const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

const TC = ['Anthony Graziano', 'Ashley Jerome'];
const PS = ['Anthony Graziano Jr'];
const crewOf = (o) => Object.assign({
  tc: { name: 'Ashley Jerome', locked: false }, tc2: { name: '', locked: false },
  ps: [{ name: 'Anthony Graziano Jr', locked: false }, { name: 'Contractor TBD', locked: false }],
  confirmed: false,
}, o || {});

const OPTS_FNS = ['_logSelectOptionsHtml', '_logOptList', '_logCrewTaken', 'isCrewPlaceholder'];
const OPTS_VARS = ['CONTRACTOR_TC_NAME', 'LOG_PLACEHOLDER_NAMES'];

module.exports = function ({ group, ok, eq, has, lacks }) {
  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ ONE DEFINITION OF WHAT A LOG-FORM SELECT OFFERS — the builder, case by case');
  {
    const c = sandbox({ fns: OPTS_FNS, vars: OPTS_VARS });
    const crew = crewOf();
    const ps1 = c._logSelectOptionsHtml('ps', crew, 'Contractor TBD', 1, false, TC, PS);
    ok(ps1.indexOf('<option value="">Select specialist</option>') === 0, 'before sign-off an empty specialist slot reads Select specialist');
    has(ps1, '<option value="Contractor TBD" selected>Contractor TBD</option>', '⚠ Contractor TBD is on the list, and selected when it is the answer');
    lacks(ps1, 'Anthony Graziano Jr', 'a specialist taken by another slot is not offered here — one person, one slot');
    lacks(ps1, '>Other<', '⚠ no "Other": a name nothing else in the app knows is not a crew member');
    lacks(ps1, '>None<', '…and no bare "None"');

    const ps0 = c._logSelectOptionsHtml('ps', crew, 'Anthony Graziano Jr', 0, false, TC, PS);
    has(ps0, '<option selected>Anthony Graziano Jr</option>', 'the slot that holds a name still offers it, selected');
    has(ps0, '<option value="Contractor TBD">Contractor TBD</option>', 'the placeholder is offered in every slot');

    const psOK = c._logSelectOptionsHtml('ps', crewOf({ confirmed: true }), '', 0, true, TC, PS);
    ok(psOK.indexOf('<option value="">Not on site</option>') === 0, 'after sign-off an empty slot means absent today');

    const twoTBD = c._logSelectOptionsHtml('ps', crewOf({ ps: [{ name: 'Contractor TBD' }, { name: 'Contractor TBD' }] }), 'Contractor TBD', 1, false, TC, PS);
    // ⚠ True because the TBD option is APPENDED regardless of what the other slots hold, not because of
    // _logCrewTaken's placeholder guard — placeholders are never in the roster list that guard filters, so
    // the guard is belt-and-braces and reverting it is green by construction (recorded in CLAUDE.md).
    has(twoTBD, 'Contractor TBD" selected', 'a placeholder may repeat — it stands for nobody yet, not a person');

    const retired = c._logSelectOptionsHtml('ps', crewOf({ ps: [{ name: 'Zed Quill' }, { name: '' }] }), 'Zed Quill', 0, false, TC, PS);
    has(retired, '<option selected>Zed Quill</option>', 'a name assigned before it left the active roster is preserved, selected');

    const tc = c._logSelectOptionsHtml('tc', crewOf({ tc2: { name: 'Anthony Graziano' } }), 'Ashley Jerome', 0, false, TC, PS);
    ok(tc.indexOf('<option value="">Select TC</option>') === 0, 'the concierge row opens on Select TC');
    has(tc, '<option selected>Ashley Jerome</option>', 'and offers the assigned concierge');
    lacks(tc, 'Anthony Graziano</option>', 'but not the one the second-concierge slot holds');
    has(tc, '>' + c.CONTRACTOR_TC_NAME + '</option>', 'the unnamed outside concierge is always offered');
    const tc2 = c._logSelectOptionsHtml('tc2', crewOf(), c.CONTRACTOR_TC_NAME, 0, false, TC, PS);
    ok(tc2.indexOf('<option value="">Not on site</option>') === 0, 'the second concierge row opens on Not on site');
    has(tc2, '<option selected>' + c.CONTRACTOR_TC_NAME + '</option>', 'and selects the placeholder when that is the answer');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ BOTH RENDERERS READ THAT BUILDER — the rows as drawn, and the rebuild that runs over them');
  {
    // The rows, drawn through the real buildLogTeamRows into a stub screen.
    const seedDom = () => domStub({ 'log-job': { value: '21' } });
    const mk = (dom, crew) => sandbox({
      fns: ['buildLogTeamRows', 'rebuildLogDropdowns'].concat(OPTS_FNS),
      vars: OPTS_VARS.concat(['_logExtraPSSlots']),
      stubs: {
        document: dom, jobs: [{ id: 21, status: 'active' }], estimateStore: { 21: { estimate: { psCount: 2 } } },
        getJobCrew: () => crew, getAllActiveTC: () => TC.map((n) => ({ name: n })), getAllActivePS: () => PS.map((n) => ({ name: n })),
        isJobFunded: () => true, plannedPSCount: () => 2, unfilledPlannedPS: () => [], depositTargetFor: () => 11500, depositPaidTotal: () => 11500,
        fmt: (n) => '$' + n,
      },
    });
    const dom = seedDom(); const crew = crewOf(); const c = mk(dom, crew);
    c.buildLogTeamRows();
    const rows = dom.getElementById('log-team-rows').innerHTML;
    ok(rows.length > 500, 'the roster rendered');
    const expectPs1 = c._logSelectOptionsHtml('ps', crew, 'Contractor TBD', 1, false, TC, PS);
    const expectPs0 = c._logSelectOptionsHtml('ps', crew, 'Anthony Graziano Jr', 0, false, TC, PS);
    const expectTc  = c._logSelectOptionsHtml('tc', crew, 'Ashley Jerome', 0, false, TC, PS);
    has(rows, '<select id="log-m2-name" onchange="setCrewPS(21,1,this.value)">' + expectPs1 + '</select>', 'specialist 2 is drawn byte for byte from the shared builder');
    has(rows, '<select id="log-m1-name" onchange="setCrewPS(21,0,this.value)">' + expectPs0 + '</select>', 'so is specialist 1');
    has(rows, 'onchange="setCrewTC(21,this.value)" style="margin-top:4px;">' + expectTc + '</select>', 'and the concierge');
    const b = noComments(fn('buildLogTeamRows'));
    lacks(b, 'function optList', 'buildLogTeamRows keeps no private option list');
    lacks(b, 'function takenBy', '…nor its own taken-names rule');
    lacks(b, 'Contractor TBD', '…nor the placeholder literal — the builder owns it');

    // The rebuild, run over selects that already hold the answers, the way loadJobPlanTab runs it
    // one line after buildLogTeamRows and the way a contractor-directory reload runs it mid-entry.
    const dom2 = domStub({ 'log-job': { value: '21' }, 'log-m0-name': { value: 'Ashley Jerome' },
      'log-m1-name': { value: 'Anthony Graziano Jr' }, 'log-m2-name': { value: 'Contractor TBD' } });
    const c2 = mk(dom2, crew);
    c2.rebuildLogDropdowns(TC.map((n) => ({ name: n })), PS.map((n) => ({ name: n })));
    eq(dom2.getElementById('log-m2-name').innerHTML, expectPs1, '⚠ the rebuild writes the SAME options the rows were drawn with — Contractor TBD survives a plan open');
    eq(dom2.getElementById('log-m1-name').innerHTML, expectPs0, '…on every slot');
    eq(dom2.getElementById('log-m0-name').innerHTML, expectTc, '…and on the concierge row');
    eq(dom2.getElementById('log-m2-name').value, 'Contractor TBD', 'the value is kept');
    eq(dom2.getElementById('log-m1-name').value, 'Anthony Graziano Jr', 'on every select');
    const r = noComments(fn('rebuildLogDropdowns'));
    has(r, '_logSelectOptionsHtml(', 'it reads the shared builder');
    lacks(r, "'Other'", '⚠ and holds no list of its own (Other)');
    lacks(r, 'None</option>', '⚠ (None)');
    lacks(r, 'innerHTML +=', '⚠ (no hand-built option run)');
    lacks(r, 'buildLogTeamRows(', '⚠ it rewrites OPTIONS in place and never re-renders the rows — a directory reload landing mid-entry must not destroy the hours being typed');
    // The sequence that produced the defect is still the sequence; that is fine now, and pinned so a
    // later "tidy" that swaps the order does not reintroduce a window where the two disagree.
    const l = noComments(fn('loadJobPlanTab'));
    ok(l.indexOf('buildLogTeamRows();') > 0 && l.indexOf('buildLogTeamRows();') < l.indexOf('rebuildDropdowns();'), 'loadJobPlanTab draws the rows and then runs the rebuild over them');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ THE FOLD COUNT AND THE STRIP MOVE WHEN HOURS LAND — in place, never by redrawing the plan');
  {
    const s = noComments(fn('saveLogEntry')), d = noComments(fn('deleteLogEntry'));
    has(s, '_repaintHoursReadouts(jobId)', 'a save repaints the readouts');
    has(d, '_repaintHoursReadouts(jobId)', 'so does a void — a removed line moves the count too');
    const rp = noComments(fn('_repaintHoursReadouts'));
    ['loadJobPlanTab(', '_repaintPlan(', 'renderJobPlan(', 'job-plan-content', 'getJobPlan('].forEach((n) =>
      lacks(rp, n, `⚠ it never redraws the plan or mints a plan (${n})`));
    has(rp, "getElementById('stage-meta-hours')", 'the fold count, by id');
    has(rp, "getElementById('plan-sched')", 'the header strip, by id');
    has(fn('planPhaseWrap'), 'id="stage-meta-\' + id + \'"', 'planPhaseWrap gives the count that id');
    has(fn('planScheduleHtml'), '<div class="plan-sched" id="plan-sched">', 'planScheduleHtml gives the strip that id');

    // Driven: a fixed-price job, active, 60 hours on the estimate, nothing logged — then a day lands.
    let logs = [];
    const seen = [];
    const dom = domStub({ 'plan-job': { value: '21' }, 'stage-meta-hours': { innerHTML: 'STALE' }, 'plan-sched': { innerHTML: 'STALE' } });
    const est = { fixedPrice: true, fixedAmount: 23000, totTC: 20, totPS: 40 };
    const c = sandbox({
      fns: ['_repaintHoursReadouts', 'planHoursMetaHtml', 'planHoursMeta', '_hrsTxt', '_planScheduleStrip'],
      stubs: {
        document: dom, jobs: [{ id: 21, status: 'active', start: '2026-09-20' }], estimateStore: { 21: { estimate: est, approved: true } },
        jobLogEntries: () => logs, _todayStr: () => '2026-09-20', approvedEstimateFor: () => est, jobPlanStore: {},
        jobProgress: (e, plan, l) => { const h = l.reduce((t, x) => t + x.members.reduce((u, m) => u + m.hours, 0), 0); seen.push(h); return { actHrs: h }; },
        jobSchedule: (job, e, today, prog) => ({ prog }), jtScheduleHtml: (sch) => 'STRIP hrs=' + sch.prog.actHrs,
      },
    });
    c._repaintHoursReadouts(21);
    eq(dom.getElementById('stage-meta-hours').innerHTML, '<span class="stage-warn">no hours logged today</span> &middot; 0 of 60 logged', 'nothing logged: the amber nag, 0 of 60');
    eq(dom.getElementById('plan-sched').innerHTML, 'STRIP hrs=0', 'the strip is rebuilt off the log');
    logs = [{ date: '2026-09-20', members: [{ role: 'TC', hours: 7 }, { role: 'PS', hours: 7 }, { role: 'PS', hours: 7 }] }];
    c._repaintHoursReadouts(21);
    eq(dom.getElementById('stage-meta-hours').innerHTML, 'today 21 hrs &middot; 21 of 60 logged', '⚠ the day lands and the fold reads it at once — no redraw');
    eq(dom.getElementById('plan-sched').innerHTML, 'STRIP hrs=21', '…and the strip carries the new hours to the pace reading');
    eq(seen.join(','), '0,21', 'the progress was measured off the live log both times');
    // A different job on the picker: nothing on screen is about this job, so nothing is written.
    dom.getElementById('plan-job').value = '8';
    logs = [];
    c._repaintHoursReadouts(21);
    eq(dom.getElementById('stage-meta-hours').innerHTML, 'today 21 hrs &middot; 21 of 60 logged', 'another job on the picker: the readouts are left alone');
    // A job with no estimate: nothing to measure against, no throw.
    dom.getElementById('plan-job').value = '22';
    c.jobs.push({ id: 22, status: 'active' });
    let threw = false; try { c._repaintHoursReadouts(22); } catch (e) { threw = true; }
    ok(!threw, 'a job with no estimate is a no-op, not an error');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ THE ANSWER TO THE QUESTION: nothing on the hours path holds an opinion about fixed price');
  {
    ['saveLogEntry', 'buildLogTeamRows', 'rebuildLogDropdowns', 'planHoursMeta', '_repaintHoursReadouts', 'deleteLogEntry'].forEach((f) => {
      const b = noComments(fn(f));
      ['fixedPrice', 'isFixedAgr', '_fixedBasis', 'fixedAmount', '_fixed'].forEach((n) => lacks(b, n, `${f} never branches on the billing basis (${n})`));
    });
    // Driven through the real save on a fixed-price job: the team gate and the deposit gate are the
    // only refusals; past them the entry lands and the readouts are repainted.
    const dom = domStub({ 'log-job': { value: '21' }, 'log-date': { value: '2026-09-20' }, 'log-activity': { value: 'Kitchen sort' },
      'log-m0-name': { value: 'Ashley Jerome' }, 'log-m0-hrs': { value: '7' },
      'log-m1-name': { value: 'Anthony Graziano Jr' }, 'log-m1-hrs': { value: '7' },
      'log-m2-name': { value: 'Contractor TBD' }, 'log-m2-hrs': { value: '7' } });
    const calls = [];
    let crew = crewOf({ confirmed: true });
    let funded = true;
    const c = sandbox({
      fns: ['saveLogEntry', 'isCrewPlaceholder'], vars: ['CONTRACTOR_TC_NAME', 'LOG_PLACEHOLDER_NAMES', 'jobLogs'],
      stubs: {
        document: dom, jobs: [{ id: 21, status: 'active', payments: [{ stage: 'deposit', amount: 11500 }] }],
        getJobCrew: () => crew, isJobFunded: () => funded, depositTargetFor: () => 11500, depositPaidTotal: () => 0, fmt: (n) => '$' + n,
        showFB: (id, kind, msg) => calls.push(kind + ':' + msg.slice(0, 40)), saveLogData: () => calls.push('saveLogData'),
        lockAssignedCrew: () => calls.push('lock'), clearLogEntry: () => calls.push('clear'), buildLogTeamRows: () => calls.push('rows'),
        updateLogSummary: () => {}, renderLogHistory: () => {}, renderProjection: () => {},
        _repaintHoursReadouts: (id) => calls.push('repaint:' + id), Date: Date,
      },
    });
    c.saveLogEntry();
    eq((c.jobLogs[21] || []).length, 1, 'the entry lands on a fixed-price job');
    eq(c.jobLogs[21][0].members.map((m) => m.role + ':' + m.hours).join(' '), 'TC:7 PS:7 PS:7', 'TC 7 · PS 7 · PS 7 — the TBD slot logs like any other');
    ok(calls.indexOf('saveLogData') >= 0 && calls.indexOf('repaint:21') > calls.indexOf('saveLogData'), 'persisted, then the readouts repainted');
    ok(calls.some((x) => x.indexOf('ok:Hours entry saved') === 0), 'and the form says so');
    // The two real gates, on the same job.
    crew = crewOf({ confirmed: false }); c.jobLogs[21] = [];
    c.saveLogEntry();
    eq(c.jobLogs[21].length, 0, 'an unconfirmed team is refused');
    ok(calls.some((x) => x.indexOf('err:The job team has not been confirmed') === 0), 'and says which gate');
    crew = crewOf({ confirmed: true }); funded = false;
    c.saveLogEntry();
    eq(c.jobLogs[21].length, 0, 'an unpaid deposit is refused — the one gate with no override');
    ok(calls.some((x) => x.indexOf('err:The deposit has not been received') === 0), 'and says so');
  }
};
