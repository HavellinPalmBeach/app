'use strict';
// Q92 · THE CLOSE-OUT CARD'S VENDOR SCORECARD: GREY UNTIL THE CLOSE, RED AT IT (2026-10-23).
//
// Found reviewing the desk build (F8): the Close-out card painted "N of M rated" and every vendor's "Not rated — required to
// close the job" red from the day a vendor was confirmed, on the Job Plan's Close-out stage and inside the desk's Closing the
// job bar, whose own line is grey before the close. Anthony was asked, on 2026-10-23: "The Close-out card's vendor ratings
// show 'Not rated — required to close the job' in red from day one, mid-job, on the Job Plan and inside the Closing bar. How
// should they look before the close?" He chose: *"Grey until the close (Recommended): Mid-job they read 'Not rated yet' in
// grey; they turn red ('required to close the job') once the job reaches the close. Close job still refuses until every
// vendor is rated."*
//
// So: ONE answer for "the job has reached the close", jobAtClose (the Close-out stage, the work handed over, a closed,
// deposit-retained or lost job), read by the scorecard, the card's header count and the desk's Closing bar; before it the
// rows read "Not rated yet" and the count is grey; at it, red, as before; Close job refuses on an unrated vendor either way.
// Everything here runs the real renderer and the real plan stage, lifted by the functions they reach.

const { sandbox, source, fn, decl, domStub } = require('./harness');

const SRC = source();
const code = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n');
const bare = (t) => code(t).replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
// The functions and vars `roots` reach, `stop` naming what the test supplies (desk-layout.test.js's walk).
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
// Every function whose live body calls `name` (comments and strings off).
function callersOf(name) {
  const out = new Set();
  const re = new RegExp('\\b' + name + '\\(', 'g');
  let m;
  while ((m = re.exec(SRC))) {
    const def = SRC.lastIndexOf('\nfunction ', m.index);
    if (def < 0) continue;
    const f = /^\nfunction\s+([A-Za-z0-9_$]+)\s*\(/.exec(SRC.slice(def, def + 120));
    if (!f || f[1] === name) continue;
    let body = '';
    try { body = bare(fn(f[1])); } catch (e) { continue; }
    if (new RegExp('\\b' + name + '\\(').test(body)) out.add(f[1]);
  }
  return [...out].sort();
}
// A call that may throw on a reverted rule: the revert fails its assertions, never the file.
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }

// A probate estate with two vendors confirmed on the Job Plan; two rooms on the estimate.
const VENDORS = [{ _row: 2, vendor_name: 'Ace Movers' }, { _row: 3, vendor_name: 'Bee Haulers' }];
const JOB = (o) => Object.assign({ id: 7, hvlId: 'HVL-0007', svc: 'probate', name: 'Ashworth', addr: '14 Seaspray Ave', status: 'active', won: true,
  matterType: 'probate', executor: 'Ruth Adler', executorEmail: 'ruth@adler.example', docState: {}, at: {}, payments: [],
  vendorSourcing: { m: { vendorId: 2, vendorName: 'Ace Movers', status: 'Confirmed' }, n: { vendorId: 3, vendorName: 'Bee Haulers', status: 'Confirmed' } } }, o || {});
const MID_PAID = [{ uid: 'p1', stage: 'midpoint', amount: 5000, method: 'wire', receivedOn: '2026-10-15' }];
const EST = { 7: { estimate: { svc: 'probate', rooms: [{ idx: 0, name: 'Study' }, { idx: 1, name: 'Kitchen' }] } } };
const PLAN_MID = { 7: { rooms: { 0: { status: 'locked' }, 1: { status: 'cleared' } } } };     // a room still to clear
const PLAN_CLEARED = { 7: { rooms: { 0: { status: 'cleared' }, 1: { status: 'cleared' } } } };
// The states the card is read in, with what each is: mid-job, or the close.
const STATES = [
  ['mid-job: a room still to clear', JOB(), PLAN_MID, false],
  ['every room cleared, the midpoint unpaid (the plan holds at Midpoint & pickups)', JOB(), PLAN_CLEARED, false],
  ['the Close-out stage: every room cleared and the midpoint paid', JOB({ payments: MID_PAID }), PLAN_CLEARED, true],
  ['the work handed over', JOB({ deliveredOn: '2026-10-20', status: 'closed' }), PLAN_MID, true],
  ['closed with the deposit retained', JOB({ status: 'closed_retained' }), PLAN_MID, true],
  ['lost', JOB({ status: 'lost', won: false }), PLAN_MID, true],
];

const CARD_STATE = ['jobs', '_photoRefs', 'estimateStore', 'jobPlanStore', 'vendorDirectory', 'document', 'VENDOR_SYNC_URL',
  '_saveJobEdit', '_writeVendorScore', '_deskFoldHeadsRepaint'];
let _cardCl = null;
function card(job, plan, est) {
  _cardCl = _cardCl || closure(['renderCloseoutCard', 'renderCloseoutBody', 'closeoutMeta', 'jobAtClose', '_repaintCloseout', 'setVendorRating',
    'jobCloseBlockers'], CARD_STATE);
  const heads = [];
  const C = sandbox({ fns: _cardCl.fns, vars: _cardCl.vars, stubs: {
    jobs: [job], _photoRefs: { 7: [] }, estimateStore: est || EST, jobPlanStore: plan, vendorDirectory: VENDORS, document: domStub({}),
    VENDOR_SYNC_URL: '', _saveJobEdit() {}, _writeVendorScore() {}, _deskFoldHeadsRepaint(id) { heads.push(id); },
  } });
  C.heads = heads;
  return C;
}
const BARS_STATE = ['jobs', '_photoRefs', 'estimateStore', 'jobPlanStore', 'vendorDirectory', 'SHEETS_SYNC_URL', '_invCloudSeen', '_invCloudFailed', 'document'];
let _barsCl = null;
function closingBar(job, plan) {
  _barsCl = _barsCl || closure(['deskFoldState', 'jobCloseBlockers'], BARS_STATE);
  const C = sandbox({ fns: _barsCl.fns, vars: _barsCl.vars, stubs: {
    jobs: [job], _photoRefs: { 7: [] }, estimateStore: EST, jobPlanStore: plan, vendorDirectory: VENDORS,
    SHEETS_SYNC_URL: '', _invCloudSeen: {}, _invCloudFailed: {}, document: domStub({}),
  } });
  const r = attempt(() => C.deskFoldState(7, job, 'closing', [], '2026-10-23'));
  return Object.assign(r.ok ? r.val : { show: null, openByDefault: null, bits: [], err: r.err }, { C });
}
// The unrated vendor rows of a rendered scorecard, each with its own words and border.
const rows = (h) => String(h).split('<div class="co-vendor"').slice(1).map((r) => r.slice(0, r.indexOf('Close-out note')));
const GREY_ROW = '<span style="color:var(--gray);">Not rated yet</span>';
const RED_ROW = '<span style="color:var(--err-tx);font-weight:600;">Not rated — required to close the job</span>';

module.exports = function ({ group, ok, eq, has, lacks }) {
  // ═══ THE ONE ANSWER ═══
  group('jobAtClose: the Close-out stage, the work handed over, a closed, deposit-retained or lost job, and nothing before');
  {
    STATES.forEach(([what, job, plan, want]) => {
      const C = card(job, plan);
      const r = attempt(() => C.jobAtClose(7, job));
      eq(r.ok ? r.val : r.err, want, what + ': ' + (want ? 'the close' : 'not yet'));
    });
    const C = card(JOB(), PLAN_MID);
    eq(attempt(() => C.jobAtClose(7, null)).val, false, 'no job: not at the close (and no throw)');
    const won = JOB({ status: 'won' });
    eq(attempt(() => card(won, {}).jobAtClose(7, won)).val, false, 'won and not started: not at the close');
    // A plan with no rooms (Home Prep): only handed over is the close.
    const noRooms = { 7: { estimate: { svc: 'prep', rooms: [] } } };
    const prep = JOB({ svc: 'prep', payments: MID_PAID });
    eq(attempt(() => card(prep, {}, noRooms).jobAtClose(7, prep)).val, false, 'Home Prep, active, midpoint paid: not yet (no rooms, no Close-out stage)');
    const prepDone = JOB({ svc: 'prep', deliveredOn: '2026-10-20', status: 'closed' });
    eq(attempt(() => card(prepDone, {}, noRooms).jobAtClose(7, prepDone)).val, true, 'Home Prep handed over: the close');
  }

  group('⚠⚠ ONE DEFINITION: the scorecard, the card\'s count and the Closing bar ask jobAtClose, and nobody keeps a copy');
  {
    eq(callersOf('jobAtClose'), ['closeoutState', 'deskFoldState', 'renderVendorScorecard'],
      'read by the close-out state (the header count and the scorecard\'s heading), the scorecard\'s rows and the desk\'s Closing bar');
    const body = bare(fn('deskFoldState'));
    ok(/var atClose = jobAtClose\(jobId, job\);/.test(code(fn('deskFoldState'))), 'the Closing bar\'s close is jobAtClose');
    ok(!/\bplanCurrentStage\(/.test(body), '⚠ and the bar no longer works the close out itself from the plan\'s stage');
    eq((SRC.match(/\['closed', 'closed_retained', 'lost'\]/g) || []).length, 1, 'the closing statuses are listed once, in jobAtClose');
    eq((code(SRC).match(/planCurrentStage\([^)]*\) === 'p4'/g) || []).length, 1, 'and the Close-out stage is asked as the close once');
    has(code(fn('jobAtClose')), "['closed', 'closed_retained', 'lost'].indexOf(job.status)", 'jobAtClose holds the statuses');
    has(code(fn('jobAtClose')), 'job.deliveredOn', '…the handover');
    has(code(fn('jobAtClose')), "planCurrentStage(jobId, job, est) === 'p4'", '…and the Close-out stage');
    // The bar's other openers stay where they were: a refused Close job, a statement that disagrees.
    has(code(fn('applyJobTransition')), 'deskFoldOpen(', 'a refused Close job still opens the Closing bar');
    has(code(fn('deskFoldState')), "if (R && R.disagree) { st.openByDefault = true;", 'and so does a statement that disagrees');
  }

  // ═══ THE CARD, ON BOTH HOSTS ═══
  group('mid-job, on the Job Plan and on the desk: "Not rated yet" in grey, the count grey, the requirement plain information');
  {
    STATES.filter((s) => !s[3]).forEach(([what, job, plan]) => {
      ['plan', 'admin'].forEach((host) => {
        const C = card(job, plan);
        const r = attempt(() => C.renderCloseoutCard(7, job, host));
        const h = r.ok ? r.val : '';
        ok(r.ok, what + ' · ' + host + ': the card renders (' + (r.err || 'ok') + ')');
        has(h, 'id="closeout-' + host + '-7"', what + ' · ' + host + ': the host\'s own copy');
        const rs = rows(h);
        eq(rs.length, 2, what + ' · ' + host + ': both vendors on the scorecard');
        eq(rs.map((x) => x.indexOf(GREY_ROW) >= 0), [true, true], what + ' · ' + host + ': ⚠⚠ each unrated vendor reads "Not rated yet" in grey');
        lacks(h, 'required to close the job', what + ' · ' + host + ': ⚠ and never "required to close the job" before the close');
        lacks(h, 'var(--err-tx)', what + ' · ' + host + ': ⚠ nothing on the card is red: no row, no border, no count');
        eq(rs.map((x) => /border:1px solid var\(--border\);/.test(x)), [true, true], what + ' · ' + host + ': each row in the plain border');
        has(h, '<span style="color:var(--gray);font-weight:600;">0 of 2 rated</span> &middot; required before the job can close',
          what + ' · ' + host + ': the count grey, and the card\'s own line that ratings are required to close stays, as plain information');
        has(h, '<span class="co-hd-m" id="closeout-meta-' + host + '-7">0 of 3 done &middot; 0 of 2 vendors rated</span>',
          what + ' · ' + host + ': the header count in the header\'s own grey');
      });
    });
  }

  group('at the close, on the Job Plan and on the desk: red, "required to close the job", as it always was');
  {
    STATES.filter((s) => s[3]).forEach(([what, job, plan]) => {
      ['plan', 'admin'].forEach((host) => {
        const C = card(job, plan);
        const r = attempt(() => C.renderCloseoutCard(7, job, host));
        const h = r.ok ? r.val : '';
        const rs = rows(h);
        eq(rs.map((x) => x.indexOf(RED_ROW) >= 0), [true, true], what + ' · ' + host + ': ⚠⚠ each unrated vendor reads "Not rated — required to close the job" in red');
        lacks(h, 'Not rated yet', what + ' · ' + host + ': and not the mid-job words');
        eq(rs.map((x) => /border:1px solid var\(--err-tx\);/.test(x)), [true, true], what + ' · ' + host + ': each row in the red border');
        has(h, '<span style="color:var(--err-tx);font-weight:600;">0 of 2 rated</span> &middot; required before the job can close', what + ' · ' + host + ': the count red');
        has(h, '<span style="color:var(--err-tx);font-weight:600;">0 of 2 vendors rated</span>', what + ' · ' + host + ': ⚠ and the header count agrees, red');
      });
    });
  }

  group('a rated vendor reads as it always did, before the close and at it; all rated reads green');
  {
    [[STATES[0], false], [STATES[2], true]].forEach(([[what, job0, plan], atClose]) => {
      const job = Object.assign({}, job0, { vendorRatings: { 2: { rating: 4, writtenAt: '2026-10-21T15:00:00Z' } } });
      const C = card(job, plan);
      const h = attempt(() => C.renderCloseoutCard(7, job, 'admin')).val || '';
      const rs = rows(h);
      has(rs[0] || '', '&#10003; Saved to the Vendor Directory', what + ': the rated vendor\'s row unchanged');
      ok(/border:1px solid var\(--border\);/.test(rs[0] || ''), what + ': in the plain border');
      has(rs[1] || '', atClose ? RED_ROW : GREY_ROW, what + ': the other in the tone of the moment');
      has(h, '<span style="color:' + (atClose ? 'var(--err-tx)' : 'var(--gray)') + ';font-weight:600;">1 of 2 rated</span>', what + ': one of two, ' + (atClose ? 'red' : 'grey'));
      const all = Object.assign({}, job, { vendorRatings: { 2: { rating: 4, writtenAt: 'x' }, 3: { rating: 5, writtenAt: 'x' } } });
      const ha = attempt(() => card(all, plan).renderCloseoutCard(7, all, 'admin')).val || '';
      has(ha, '<span style="color:var(--ok-tx);font-weight:600;">2 of 2 rated</span>', what + ': every vendor rated reads green');
      has(ha, 'id="closeout-meta-admin-7">0 of 3 done &middot; 2 of 2 vendors rated</span>', what + ': and the header count plain');
      lacks(ha, 'var(--err-tx)', what + ': nothing red');
    });
  }

  group('⚠ the Job Plan\'s Close-out stage draws the same body, so it reads the same rule');
  {
    has(code(fn('renderJobPlan')), "'<div id=\"closeout-plan-' + jobId + '\">' + renderCloseoutBody(jobId, job) + '</div>'",
      'the stage\'s card is renderCloseoutBody, the one renderer');
    has(code(fn('renderPrepJobPlan')).replace(/\s+/g, ' '), "renderCloseoutCard(jobId, job, 'plan')", 'and Home Prep\'s plan carries the whole card');
  }

  group('⚠⚠ A STAR PRESS SAVES ITSELF AND REPAINTS: both hosts keep the right tone');
  {
    [[STATES[0], false], [STATES[2], true]].forEach(([[what, job0, plan], atClose]) => {
      const job = JSON.parse(JSON.stringify(job0));
      const C = card(job, plan);
      const r = attempt(() => C.setVendorRating(7, 2, 5));
      ok(r.ok, what + ': the press runs (' + (r.err || 'ok') + ')');
      ['plan', 'admin'].forEach((host) => {
        const body = C.document.getElementById('closeout-' + host + '-7').innerHTML;
        const meta = C.document.getElementById('closeout-meta-' + host + '-7').innerHTML;
        const rs = rows(body);
        has(rs[0] || '', 'Saving to the Vendor Directory', what + ' · ' + host + ': the vendor just rated says it is saving');
        has(rs[1] || '', atClose ? RED_ROW : GREY_ROW, what + ' · ' + host + ': ⚠ the one still unrated, ' + (atClose ? 'red at the close' : 'still grey mid-job'));
        if (atClose) has(meta, '<span style="color:var(--err-tx);font-weight:600;">1 of 2 vendors rated</span>', what + ' · ' + host + ': the header count red');
        else eq(meta, '0 of 3 done &middot; 1 of 2 vendors rated', what + ' · ' + host + ': the header count plain grey');
        if (!atClose) lacks(body + meta, 'var(--err-tx)', what + ' · ' + host + ': nothing red after the press');
      });
      eq(C.heads, [7], what + ': and the desk\'s bar lines follow (_deskFoldHeadsRepaint)');
    });
  }

  // ═══ THE DESK'S CLOSING BAR AGREES ═══
  group('the Closing bar agrees: mid-job nothing about the ratings and all grey; at the close the vendors named in red');
  {
    STATES.forEach(([what, job, plan, atClose]) => {
      const B = closingBar(job, plan);
      ok(!B.err, what + ': the bar answers (' + (B.err || 'ok') + ')');
      eq(B.openByDefault, atClose, what + ': ' + (atClose ? 'opens by itself' : 'shut'));
      const v = B.bits.filter((b) => /not yet rated/.test(b.text));
      if (atClose) eq(v.map((b) => [b.text, b.tone]), [['2 vendors not yet rated', 'red']], what + ': ⚠⚠ the vendors named in red, as the scorecard is');
      else {
        eq(v.length, 0, what + ': ⚠ no vendor named before the close');
        eq([...new Set(B.bits.map((b) => b.tone))], ['grey'], what + ': every part grey, as the scorecard is');
      }
    });
    // A key held at the close stays amber: only the vendors follow the scorecard.
    const j = JOB({ deliveredOn: '2026-10-20', status: 'closed', accessItems: [{ id: 'k1', kind: 'key', label: 'Front door', qty: 1 }] });
    const B = closingBar(j, PLAN_MID);
    eq(B.bits.slice(0, 2).map((b) => [b.text, b.tone]), [['2 vendors not yet rated', 'red'], ['1 key or access item still held', 'amber']],
      'the vendors red, the key amber, in the refusal\'s order');
  }

  // ═══ CLOSE JOB STILL REFUSES ═══
  group('Close job still refuses until every vendor used is rated, before the close and at it');
  {
    STATES.forEach(([what, job, plan]) => {
      const C = card(job, plan);
      const r = attempt(() => C.jobCloseBlockers(job));
      eq((r.val || []).length, 1, what + ': one refusal');
      has((r.val || [])[0] || '', 'Rate every vendor used on this job — 2 not yet rated (Ace Movers, Bee Haulers)', what + ': naming both vendors, as before');
    });
    const done = JOB({ vendorRatings: { 2: { rating: 4 }, 3: { rating: 3 } } });
    eq(attempt(() => card(done, PLAN_MID).jobCloseBlockers(done)).val, [], 'every vendor rated: nothing to refuse');
    has(code(fn('jobCloseBlockers')), 'var un = unratedVendorsForJob(j);', 'the refusal reads the one list of who is outstanding');
    ok(!/jobAtClose\(/.test(bare(fn('jobCloseBlockers'))), '⚠ and never the close: the refusal does not wait on the stage');
  }
};
