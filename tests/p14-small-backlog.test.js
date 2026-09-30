'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P14 · THE SMALL BACKLOG (2026-09-30, workflow audit "Other" lows; every item approved by Anthony).
//
//   1. The Drive links in the document tray and the strip name their document ("Filed estimate",
//      "File deposit invoice to Drive"), through the namer View and Print already use (`docWord`).
//   2. "File to Drive" is not offered on a document the tray shows view-only: an estimate sent, never
//      filed, then sent back for approval offered it, and the estimate's own gate refused the press.
//   3. The Job active step carries its date (`activatedOn`) and the name the stamp records.
//   4. Deleting a contractor takes the manager PIN, and one named on any job is refused and steered to
//      Inactive — asked by the ✕ and again behind the PIN.
//   5. Splitting a photo repaints what the split changed, not the whole tab (1,420 ms at 3,000 rows).
//   6. Person-entered names are escaped in the notices and the dropdowns that took them raw.
//   7. `activatedBy` / `deliveredBy` carry the assigned concierge (Anthony's answer), else what they did.
//   8. `agrApprovalWithdrawn` says only "send a fresh packet" once the estimate is approved again.
//   9. A Home Prep final heads its total with what it is made of (Anthony's wording).
//  10. The page-level agrApproved / agrApprovedBy / agrApprovedAt are deleted; the banner reads the job.
//  11. The agreements read the ±tolerance from EST_TOLERANCE_PCT, and the SMF label from SMF_PCT.
//
// Everything is DRIVEN through the real functions. Each sandbox is the root's own call graph, derived
// from the source (comments and string literals stripped first, so an onclick naming a function is not
// a call), with the screen's unrelated panels stubbed at named boundaries — never the rule under test.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source, fn, decl, domStub } = require('./harness');

const SRC = source();
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
const noComments = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

// The functions and top-level vars `roots` reach. `stop` names what the test supplies itself: a stub
// for a boundary, or state (a var listed here is not lifted, so its initialiser cannot overwrite the stub).
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
function lift(roots, stop, stubs, extraVars) {
  const c = closure(roots, stop);
  return sandbox({ fns: c.fns, vars: c.vars.concat(extraVars || []), stubs: stubs || {} });
}
// A call that may throw on the unfixed code: a revert must fail its assertions, not end the file.
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }

// A DOM that holds one container's markup as a STRING, so a partial repaint can be compared byte for byte
// with a full one. Elements inside it are found by id and support what the repaint uses (outerHTML,
// innerHTML, insertAdjacentHTML); an id that is not in the markup is null, as in a browser.
function stringDom(selectedJobId) {
  let html = '';
  const escId = (id) => String(id).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const span = (id) => {
    const at = html.indexOf('id="' + escId(id) + '"');
    if (at < 0) return null;
    const start = html.lastIndexOf('<', at);
    const tag = /^<([a-zA-Z]+)/.exec(html.slice(start))[1];
    const re = new RegExp('<' + tag + '[\\s>]|</' + tag + '>', 'g');
    re.lastIndex = start;
    let depth = 0, m, end = -1;
    while ((m = re.exec(html))) { if (m[0][1] === '/') { depth--; if (!depth) { end = m.index + m[0].length; break; } } else depth++; }
    if (end < 0) throw new Error('stringDom: unbalanced markup around #' + id);
    return { start, end, openEnd: html.indexOf('>', start) + 1, closeStart: end - ('</' + tag + '>').length };
  };
  const el = (id) => (span(id) ? {
    id, style: {},
    get outerHTML() { const r = span(id); return html.slice(r.start, r.end); },
    set outerHTML(v) { const r = span(id); html = html.slice(0, r.start) + v + html.slice(r.end); },
    get innerHTML() { const r = span(id); return html.slice(r.openEnd, r.closeStart); },
    set innerHTML(v) { const r = span(id); html = html.slice(0, r.openEnd) + v + html.slice(r.closeStart); },
    insertAdjacentHTML(pos, v) {
      const r = span(id);
      const at = { beforebegin: r.start, afterbegin: r.openEnd, beforeend: r.closeStart, afterend: r.end }[pos];
      html = html.slice(0, at) + v + html.slice(at);
    },
    querySelectorAll() { return []; },
  } : null);
  const cont = { get innerHTML() { return html; }, set innerHTML(v) { html = String(v); }, querySelectorAll() { return []; }, style: {} };
  const sel = { value: String(selectedJobId) };
  return {
    getElementById(id) { if (id === 'inventory-content') return cont; if (id === 'inv-job') return sel; return el(String(id)); },
    querySelectorAll() { return []; },
    get html() { return html; },
    select(id) { sel.value = String(id); },
  };
}

// Markup → the text a reader sees.
const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&mdash;': '—', '&middot;': '·', '&nbsp;': ' ', '&rarr;': '→' };
const decode = (s) => String(s).replace(/&[a-z#0-9]+;/gi, (m) => (ENT[m] !== undefined ? ENT[m] : m));
const textOf = (h) => decode(String(h).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// The name every escaping check uses: an apostrophe, a tag, an ampersand and a double quote.
const NAME = 'O\'Hara <b>& "Sons"';
const NAME_HTML = 'O&#39;Hara &lt;b&gt;&amp; &quot;Sons&quot;';

module.exports = function ({ group, ok, eq, has, lacks }) {
  const prevTZ = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    run({ group, ok, eq, has, lacks });
  } finally {
    process.env.TZ = prevTZ;
  }
};

function run({ group, ok, eq, has, lacks }) {
  const icon = (l) => String(l || '').replace(/^&#\d+;\s*/, '');

  // ═══ 1 · THE DRIVE LINKS NAME THEIR DOCUMENT ════════════════════════════════
  group('1 · the Drive links name their document, through the one namer');
  {
    const L = lift(['_jtDriveLink'], []);
    const FILED = { sentAt: 't', filedAt: 't', filedUrl: 'https://drive/x' };
    const job = (svc) => ({ id: 7, svc, docState: { estimate: FILED, agreement: FILED, 'invoice:deposit': FILED,
      'invoice:midpoint': FILED, 'invoice:final': FILED } });
    const lbl = (j, k, st) => icon((L._jtDriveLink(7, j, k, st)[0] || {}).label);
    const five = (j) => [lbl(j, 'estimate', ''), lbl(j, 'agreement', ''), lbl(j, 'invoice', 'deposit'),
                         lbl(j, 'invoice', 'midpoint'), lbl(j, 'invoice', 'final')];
    eq(five(job('cleanout')), ['Filed estimate', 'Filed packet', 'Filed deposit invoice', 'Filed midpoint invoice', 'Filed final invoice'],
       '⚠⚠ every filed copy names its document — five bare "Filed copy" buttons sat in one strip');
    eq(lbl(job('prep'), 'invoice', 'midpoint'), 'Filed second invoice', 'Home Prep\'s middle invoice is its second, as everywhere else');
    eq(new Set(five(job('cleanout'))).size, 5, 'no two of them read the same');
    const sent = { id: 7, svc: 'cleanout', docState: { estimate: { sentAt: 't' }, 'invoice:deposit': { sentAt: 't' } } };
    eq([lbl(sent, 'estimate', ''), lbl(sent, 'invoice', 'deposit')], ['File estimate to Drive', 'File deposit invoice to Drive'],
       'the retry names what it will file');
    // The same namer as View and Print, never a second copy of the words.
    const body = noComments(fn('_jtDriveLink'));
    has(body, 'docWord(kind, stage, job)', 'it reads docWord, the namer _jtDocViews reads');
    lacks(body, "'&#128193; Filed copy'", 'and carries no bare label any more');
  }

  // ═══ 2 · NO "FILE TO DRIVE" THE GATE WOULD REFUSE ═══════════════════════════
  group('2 · File to Drive is not offered on a view-only document — the tray and the gate agree');
  {
    const R = lift(['jobTimeline', 'jobTimelineNext', 'jobTimelineActions', '_jtDocSecondaries', 'docReadiness', 'docDraftOnly', 'finalCrewOnlyWarn'],
      ['DOC_ACTIONS', 'jobs', 'estimateStore', 'jobLogs'],
      { jobs: [], estimateStore: {}, jobLogs: {}, Intl: global.Intl, _todayStr: () => '2026-09-30', REQUIRE_WALKTHROUGH_NOTES: false },
      ['DOC_ACTIONS']);
    const EST = { svc: 'home_cleanout', havellinTotal: 11750, totTC: 20, totPS: 30, docTier: 'contents',
      rooms: [{ idx: 0, name: 'Kitchen', vol: 3, cplx: 3, note: 'seen' }], collections: [] };
    // Sent to the client on the 20th, never filed; then a discount sent it back to the manager.
    const JOB = (o) => Object.assign({ id: 7, name: 'Butler', svc: 'home_cleanout', status: 'pending', created: 'Sep 8, 2026',
      walkthrough: '2020-01-01', estimateSentDate: 'September 20, 2026', approved: false,
      docState: { estimate: { draftedAt: '2026-09-20T14:00:00.000Z', sentAt: '2026-09-20T14:05:00.000Z', provider: 'gmail' } } }, o || {});
    const state = (job, rec) => {
      R.jobs = [job]; R.estimateStore = { 7: rec };
      const rows = R.jobTimeline(job, rec, [], []);
      const offered = [];
      rows.forEach((r) => {
        const a = R.jobTimelineActions(r, job, rec);
        [a.primary].concat(a.secondary || [], (a.doc && a.doc.acts) || []).filter(Boolean).forEach((x) => offered.push(x));
        offered.push(...R._jtDocSecondaries(7, job, rec, r.key));
      });
      return { rows, offered, files: offered.filter((x) => /'estimate','file'/.test(x.call)) };
    };
    const back = state(JOB(), { estimate: EST, approved: false, submitted: true, savedAt: 1 });
    ok(back.rows.some((r) => r.key === 'estimate_approved' && (r.state === 'current' || r.state === 'blocked')),
       'fixture: the lit step is the estimate waiting on the manager');
    ok(back.offered.some((x) => /'estimate','view'/.test(x.call)), 'fixture: the estimate is still readable from the tray');
    eq(back.files.length, 0, '⚠⚠ and File to Drive is offered NOWHERE while it waits — the press would be refused');
    const blocked = R.DOC_ACTIONS.estimate.blocker({ job: R.jobs[0] }, 'file');
    ok(!!blocked, 'fixture: the estimate\'s gate does refuse a file in this state ("' + blocked + '")');

    const again = state(JOB({ status: 'approved', approved: true }), { estimate: EST, approved: true, submitted: false, savedAt: 1,
      approvedBy: 'Anthony Graziano', approvedAt: 'September 21, 2026' });
    ok(again.files.length > 0, 'the converse: approved again, sent and never filed — the retry is offered');
    ok(again.files.every((x) => icon(x.label) === 'File estimate to Drive'), 'under its own name');
    eq(R.DOC_ACTIONS.estimate.blocker({ job: R.jobs[0] }, 'file'), '', 'and the gate lets that press through');

    // ⚠ THE JOIN, over every state: nothing offered to file is a press the gate refuses.
    const bad = [];
    [false, true].forEach((approved) => [false, true].forEach((filed) => {
      const ds = { estimate: Object.assign({ sentAt: '2026-09-20T14:05:00.000Z' }, filed ? { filedAt: 't', filedUrl: 'https://drive/e' } : {}) };
      const s = state(JOB({ approved, docState: ds }), { estimate: EST, approved, submitted: !approved, savedAt: 1 });
      const why = R.DOC_ACTIONS.estimate.blocker({ job: R.jobs[0] }, 'file');
      if (s.files.length && why) bad.push('approved=' + approved + ' filed=' + filed + ': offered, and refused ("' + why + '")');
    }));
    eq(bad, [], '⚠ every File to Drive the rail offers is one the estimate\'s gate accepts');
    has(noComments(fn('_jtDocSecondaries')), '_jtDriveLink(id, job, d.kind, d.stage, viewOnly)', 'the tray hands its own view-only answer on');
  }

  // ═══ 3 · THE JOB ACTIVE STEP SHOWS ITS DATE ═════════════════════════════════
  group('3 · the Job active step shows the day it started, on the rail and on the track');
  {
    const T = lift(['jobTimeline', 'jtRailHtml', 'jtTrackHtml', 'finalCrewOnlyWarn'], ['jobs', 'estimateStore', 'jobLogs'],
      { jobs: [], estimateStore: {}, jobLogs: {}, Intl: global.Intl, _todayStr: () => '2026-09-30' });
    const EST = { svc: 'cleanout', havellinTotal: 20000, totTC: 10, totPS: 20, days: 6,
      rooms: [{ idx: 0, name: 'Kitchen', vol: 3, cplx: 3, note: 'seen' }] };
    const JOB = (o) => Object.assign({ id: 7, name: 'Ellsworth', svc: 'cleanout', status: 'active', won: true, wonAt: '2026-09-10',
      approved: true, agrApproved: true, agrSent: true, agrSigned: true, created: 'Sep 8, 2026', walkthrough: '2020-01-01',
      estimateSentDate: 'September 9, 2026', start: '2026-09-23', activatedOn: '2026-09-23', activatedBy: 'Carla Mendes',
      depositReceived: true, depositReceivedAt: '2026-09-19',
      payments: [{ uid: 'p1', stage: 'deposit', amount: 10000, date: '2026-09-19', method: 'wire', clearedOn: '2026-09-19' }] }, o || {});
    const rows = T.jobTimeline(JOB(), { estimate: EST, approved: true, savedAt: 1 }, [], []);
    const act = rows.filter((r) => r.key === 'job_active')[0] || {};
    eq([act.done, act.at, act.atKind, act.by], [true, '2026-09-23', 'date', 'Carla Mendes'],
       '⚠⚠ the row carries activatedOn as a date, and the name the stamp records');
    const rail = T.jtRailHtml(rows);
    const railRow = (rail.split('<div class="jt-row').filter((x) => x.indexOf('>Job active<') >= 0)[0]) || '';
    has(textOf(railRow), 'Sep 23, 2026', 'the rail prints it, formatted like every other date');
    has(textOf(railRow), 'Carla Mendes', 'with the name');
    const track = T.jtTrackHtml(rows);
    const step = (track.split('<div class="jt-step').filter((x) => x.indexOf('>Active<') >= 0 || x.indexOf('>Job active<') >= 0)[0]) || '';
    has(textOf(step), 'Sep 23, 2026', 'and so does the track, under the step');
    const waiting = T.jobTimeline(JOB({ status: 'won', activatedOn: '', activatedBy: '' }), { estimate: EST, approved: true, savedAt: 1 }, [], []);
    eq((waiting.filter((r) => r.key === 'job_active')[0] || {}).at, '', 'a job not yet active has no date to show');
  }

  // ═══ 4 · DELETING A CONTRACTOR: THE PIN, AND RETIRE RATHER THAN DELETE ═══════
  {
    const calls = { saves: 0, posts: [], alerts: [], renders: 0 };
    const doc = domStub({});
    const C = lift(['deleteContractor', 'checkDirDeletePin', 'hardDeleteContractor', 'closeDirDeletePinModal', 'contractorJobRefs'],
      ['jobs', 'estimateStore', 'jobLogs', 'contractors', 'DEFAULT_CONTRACTORS', '_jobsState', 'SHEETS_SYNC_URL',
       'hardDeleteVendor', 'hardDeleteReferral', 'saveContractors', 'renderContractors', 'rebuildDropdowns', 'postSyncBadge'],
      { document: doc, jobs: [], estimateStore: {}, jobLogs: {}, contractors: [], DEFAULT_CONTRACTORS: [{ id: 'default-1', name: 'Anthony Graziano', role: 'TC', status: 'active' }],
        _jobsState: 'ready', SHEETS_SYNC_URL: 'https://script.example/exec',
        hardDeleteVendor() { throw new Error('vendor path reached'); }, hardDeleteReferral() { throw new Error('referral path reached'); },
        saveContractors() { calls.saves++; }, renderContractors() { calls.renders++; }, rebuildDropdowns() {},
        postSyncBadge(p) { calls.posts.push(p); }, alert(m) { calls.alerts.push(String(m)); }, confirm() { return true; } });
    const modal = () => doc.getElementById('dir-delete-pin-modal').style.display || '';
    const pin = (v) => { doc.getElementById('dir-delete-pin-input').value = v; return attempt(() => C.checkDirDeletePin()); };
    const reset = (jobs, logs, est) => {
      C.contractors = [{ id: 'c1', name: 'Carla Mendes', role: 'TC', status: 'active' }, { id: 'c2', name: 'Dana Ruiz', role: 'PS', status: 'active' }];
      C.jobs = jobs || []; C.jobLogs = logs || {}; C.estimateStore = est || {}; C._jobsState = 'ready';
      calls.saves = 0; calls.posts = []; calls.alerts = [];
      doc.getElementById('dir-delete-pin-modal').style.display = 'none';
      doc.getElementById('dir-delete-pin-fb').innerHTML = '';
      C._dirDeleteTarget = null;
    };
    const has1 = (id) => C.contractors.some((c) => c.id === id);

    group('4a · a contractor with no history: the manager PIN, then the delete');
    reset([{ id: 7, name: 'Butler', tc: 'Anthony Graziano' }]);
    const r0 = attempt(() => C.deleteContractor('c1'));
    ok(r0.ok, 'the ✕ handler runs (' + (r0.err || 'ok') + ')');
    eq(modal(), 'flex', '⚠⚠ the ✕ opens the manager PIN — it used to be a bare "Remove this contractor?"');
    ok(has1('c1'), '⚠ and nothing is deleted before the PIN');
    has(doc.getElementById('dir-delete-sub').innerHTML, 'Carla Mendes', 'the PIN dialog names who is being deleted');
    eq(calls.alerts, [], 'nothing refused: she is named on no job');
    pin('0000');
    has(doc.getElementById('dir-delete-pin-fb').innerHTML, 'Incorrect PIN', 'a wrong PIN is refused');
    ok(has1('c1'), 'and deletes nothing');
    pin('3010');
    ok(!has1('c1'), 'the manager PIN deletes her');
    ok(has1('c2'), 'and only her');
    eq(calls.saves, 1, 'the roster is saved once');
    eq(calls.posts.map((p) => p.type + ':' + (p.payload || {}).id), ['deleteContractor:c1'], 'and the sheet is told, so she does not come back on the next load');
    eq(modal(), 'none', 'the dialog closes');

    group('4b · a contractor named on a job is refused and steered to Inactive, wherever the job names them');
    const CASES = [
      ['the assigned concierge', { tc: 'Carla Mendes' }],
      ['the assigned concierge, spelled differently', { tc: '  carla mendes ' }],
      ['the site visit', { siteVisitBy: 'Carla Mendes' }],
      ['the crew concierge', { crew: { tc: { name: 'Carla Mendes' }, tc2: { name: '' }, ps: [] } }],
      ['the second concierge', { crew: { tc: { name: 'Anthony Graziano' }, tc2: { name: 'Carla Mendes' }, ps: [] } }],
      ['a specialist slot', { crew: { tc: { name: 'Anthony Graziano' }, ps: [{ name: 'Carla Mendes' }] } }],
      ['a lost job', { status: 'lost', tc: 'Carla Mendes' }],
    ];
    CASES.forEach(([what, o]) => {
      reset([Object.assign({ id: 7, name: 'Butler', tc: 'Anthony Graziano' }, o)]);
      attempt(() => C.deleteContractor('c1'));
      ok(has1('c1') && modal() !== 'flex', '⚠⚠ ' + what + ': refused before the PIN, and nothing deleted');
      has(calls.alerts[0] || '', 'Inactive', what + ': the refusal names the way out');
    });
    reset([{ id: 7, name: 'Butler', tc: 'Anthony Graziano' }], { 7: [{ id: 1, date: '2026-09-24', members: [{ name: 'Carla Mendes', role: 'PS', hours: 6 }] }] });
    attempt(() => C.deleteContractor('c1'));
    ok(has1('c1') && modal() !== 'flex', '⚠ an hours entry is history too');
    reset([{ id: 7, name: 'Butler', tc: 'Anthony Graziano' }], { 7: [{ id: 1, deletedAt: 5 }] });
    attempt(() => C.deleteContractor('c1'));
    eq(modal(), 'flex', 'a voided hours entry names nobody');
    reset([{ id: 7, name: 'Butler', tc: '' }], {}, { 7: { estimate: { preparedBy: 'Carla Mendes' } } });
    attempt(() => C.deleteContractor('c1'));
    ok(has1('c1') && modal() !== 'flex', '⚠ so is the walkthrough on an estimate — the documents look the preparer up by name');
    has(calls.alerts[0] || '', 'Butler', 'and the refusal names the job');
    reset([{ id: 7, name: 'Butler', tc: 'Carla Mendes' }, { id: 8, name: 'Vance', tc: 'Carla Mendes' }, { id: 9, name: 'Ortiz', siteVisitBy: 'Carla Mendes' },
           { id: 10, name: 'Lowe', crew: { tc: { name: 'Carla Mendes' }, ps: [] } }]);
    eq(C.contractorJobRefs('Carla Mendes').map((j) => j.id), [7, 8, 9, 10], 'contractorJobRefs finds every job');
    attempt(() => C.deleteContractor('c1'));
    has(calls.alerts[0] || '', 'is named on 4 jobs (Butler, Vance, Ortiz and 1 more)', 'the refusal counts them and names three');

    group('4c · an unread client list proves nothing, and the handler behind the PIN asks again');
    reset([]);
    C._jobsState = 'loading';
    attempt(() => C.deleteContractor('c1'));
    ok(has1('c1') && modal() !== 'flex', '⚠ with the client list not loaded, nobody is deleted');
    has(calls.alerts[0] || '', 'has not loaded', 'and it says why');
    reset([{ id: 7, name: 'Butler', tc: 'Anthony Graziano' }]);
    attempt(() => C.deleteContractor('c1'));
    eq(modal(), 'flex', 'fixture: the PIN is open for a contractor with no history');
    C.jobs[0].crew = { tc: { name: 'Anthony Graziano' }, ps: [{ name: 'Carla Mendes' }] };   // staffed on the other device meanwhile
    pin('3010');
    ok(has1('c1'), '⚠⚠ the delete behind the PIN asks the same question as the ✕, and refuses');
    has(calls.alerts[0] || '', 'Inactive', 'saying so');
    eq(calls.posts, [], 'and nothing reaches the sheet');
    reset([]);
    const beforeDefaults = JSON.stringify(C.DEFAULT_CONTRACTORS);
    attempt(() => C.deleteContractor('default-1'));
    ok(modal() !== 'flex' && JSON.stringify(C.DEFAULT_CONTRACTORS) === beforeDefaults, 'the built-in team cannot be reached from here');
  }

  // ═══ 5 · A SPLIT REPAINTS WHAT IT CHANGED ═══════════════════════════════════
  {
    const STUBBED = ['jobInfoHeaderHtml', 'jobProgressBlockHtml', 'renderCloseoutCard', '_sfHost', 'renderJobAdmin',
      '_renderInventoryImportPanel', '_renderAppraiserRoster', '_renderRemovedRows', '_renderInventorySnapshots',
      '_renderDuplicateImportNotice', '_invEnsureThumbs', '_invEnsureLoaded', 'savePhotoRefs', '_scheduleInventorySync', '_invThumbCache'];
    const CL = closure(['renderInventoryTab', 'invSplitItemClick'], STUBBED.concat(['jobs', '_photoRefs', 'estimateStore']));
    const SHOT = (id, o) => Object.assign({ stableId: id, roomIdx: 1, label: 'inventory', collId: null, seq: 1,
      filename: id + '.jpg', driveFileUrl: 'https://drive/' + id, driveFileId: 'F' + id, status: 'uploaded', ts: 1000,
      objectName: '', category: 'General/Household', disposition: '', itemNo: 0 }, o || {});
    function rig(refs, jobO) {
      const dom = stringDom(7);
      const counts = { full: 0 };
      const ctx = sandbox({ fns: CL.fns, vars: CL.vars, stubs: {
        document: dom, alert: (m) => { counts.alert = String(m); }, setTimeout: () => 0,
        jobs: [Object.assign({ id: 7, name: 'Butler', hvlId: 'HVL-0007', svc: 'cleanout' }, jobO || {})],
        _photoRefs: { 7: refs }, estimateStore: {},
        jobInfoHeaderHtml: () => '<div id="hdr">Butler</div>', jobProgressBlockHtml: () => '<div>band</div>', renderCloseoutCard: () => '',
        _sfHost: () => '', renderJobAdmin: () => '', _renderInventoryImportPanel: () => '<div>import</div>', _renderAppraiserRoster: () => '',
        _renderRemovedRows: () => '', _renderInventorySnapshots: () => '', _renderDuplicateImportNotice: () => '',
        _invEnsureThumbs() {}, _invEnsureLoaded() {}, savePhotoRefs() {}, _scheduleInventorySync() {}, _invThumbCache: () => ({}) } });
      const real = ctx.renderInventoryTab;
      ctx.renderInventoryTab = function () { counts.full++; return real.apply(this, arguments); };
      ctx.renderInventoryTab();
      counts.full = 0;
      return { ctx, dom, counts, real };
    }
    // Split, then hold what the split left on screen against what a full render draws from the same data.
    function split(r, sid) {
      const before = r.counts.full;
      const res = attempt(() => r.ctx.invSplitItemClick(7, sid));
      const partial = r.dom.html;
      const fulls = r.counts.full - before;
      r.real();
      return { res, partial, fulls, full: r.dom.html, same: partial === r.dom.html };
    }
    const newest = (r) => { const a = r.ctx._photoRefs[7]; return a[a.length - 1]; };
    const house = () => {
      const refs = [];
      for (let i = 0; i < 12; i++) refs.push(SHOT('s' + i, { ts: 1000 + i, roomIdx: i % 3, itemNo: i + 1,
        objectName: i % 2 ? 'Thing ' + i : '', disposition: i % 4 === 0 ? 'Keep' : '' }));
      refs[5].objectName = 'Bar console';
      return refs;
    };

    group('5a · the split draws the new line in place, and the screen is exactly what a full render draws');
    {
      const r = rig(house());
      r.ctx._invOpen.s5 = 1; r.real();          // the button is in the open row's panel
      has(r.dom.html, 'id="inv-row-s5"', 'fixture: the rows are on screen by id');
      const s = split(r, 's5');
      ok(s.res.ok, 'the split runs (' + (s.res.err || 'ok') + ')');
      eq(s.fulls, 0, '⚠⚠ no full-tab render — it rebuilt every row, 1,420 ms at 3,000 rows');
      const n = newest(r);
      ok(!!n && n.derivedFrom === 's5', 'fixture: the new line was minted off the photograph');
      has(s.partial, 'id="inv-row-' + n.stableId + '"', 'the new line is on screen');
      ok(s.same, '⚠⚠ and the tab is byte for byte what a full render draws (' + s.partial.length + ' / ' + s.full.length + ')');
      has(textOf(s.partial), '1 of 2 in this photo', 'the rows sharing the frame say so');
      const again = split(r, 's5');
      eq(again.fulls, 0, 'a second split: still no full render');
      ok(again.same, 'and still identical to a full render');
      has(textOf(again.partial), '1 of 3 in this photo', 'every line in the frame now reads 1 of 3');
    }

    group('5b · a line that starts a room, or the whole Not-yet-decided group, is drawn beside its neighbours');
    {
      const refs = house();
      refs[4].disposition = 'Keep'; refs[4].objectName = 'Hutch';   // room 1: s4 Keep; s1, s7 undecided
      refs[1].disposition = 'Sell'; refs[7].disposition = 'Sell'; refs[10].disposition = 'Sell';   // room 1 has no undecided line left
      const r = rig(refs);
      ok(r.dom.html.indexOf('id="inv-rm-1|"') < 0, 'fixture: the Not-yet-decided group has no block for room 1');
      const s = split(r, 's4');
      eq(s.fulls, 0, 'no full render');
      ok(s.same, '⚠ the room block is created in the right place — identical to a full render');
      const all = house().map((x) => Object.assign(x, { disposition: 'Keep' }));
      const r2 = rig(all);
      ok(r2.dom.html.indexOf('id="inv-grp-"') < 0, 'fixture: nothing on the job is undecided, so the group is not drawn');
      const s2 = split(r2, 's3');
      eq(s2.fulls, 0, 'no full render');
      ok(s2.same, '⚠ the Not-yet-decided group is created, first, as a full render draws it');
    }

    group('5c · folded groups, filters and the rollups repaint as a full render would');
    {
      const r = rig(house());
      r.ctx._invFold[''] = 1; r.real();
      const s = split(r, 's5');
      ok(s.fulls === 0 && s.same, 'a folded group: its heading counts the new line and nothing else is drawn');
      const q = rig(house());
      q.ctx._invFilter.q = 'Bar console'; q.real();
      const sq = split(q, 's5');
      ok(sq.fulls === 0 && sq.same, 'a search the new blank line does not match: it is not drawn, and the counts still move');
      const roll = rig(house());
      roll.ctx._invShowRoll = true; roll.real();
      const sr = split(roll, 's5');
      ok(sr.fulls === 0 && sr.same, 'with the summary open, the rollups are repainted too');
    }

    group('5d · what cannot be placed falls back to the full render');
    {
      const q = rig(house());
      q.ctx._invFilter.q = 'nothing matches this'; q.real();
      const s = split(q, 's5');
      ok(s.res.ok && s.fulls === 1 && s.same, 'filtered to nothing: the "see all N items" card moved, so the tab is redrawn');
      const other = rig(house());
      other.dom.select(8);
      const so = split(other, 's5');
      eq(so.fulls, 1, 'another client on the tab: redrawn, as before');
      const prep = rig(house(), { svc: 'prep' });
      eq(split(prep, 's5').fulls, 1, 'a prep job: redrawn, as before');
      const refused = rig([SHOT('u1', { status: 'uploading', driveFileId: '', driveFileUrl: '' })]);
      const su = split(refused, 'u1');
      ok(su.fulls === 0 && /Retry/.test(refused.counts.alert || ''), 'a refused split repaints nothing and says why');
    }
  }

  // ═══ 6 · PERSON-ENTERED NAMES ARE TEXT ══════════════════════════════════════
  // Rendered, then read back: the markup carries the escaped form, and the text a reader (or a <select>)
  // gets back is the name exactly as it was typed.
  const optionsOf = (h) => [...String(h).matchAll(/<option(?: value="([^"]*)")?[^>]*>([^<]*)<\/option>/g)].map((m) => ({ value: m[1] === undefined ? null : decode(m[1]), text: decode(m[2]) }));
  group('6a · the concierge dropdowns hold a name with a quote, a tag and an ampersand');
  {
    const doc = domStub({});
    const D = lift(['rebuildDropdowns', 'populateIntakeTCDropdown'], ['rebuildLogDropdowns', 'contractors', 'DEFAULT_CONTRACTORS'],
      { document: doc, rebuildLogDropdowns() {}, DEFAULT_CONTRACTORS: [], contractors: [{ id: 'c1', name: NAME, role: 'TC', status: 'active' }] });
    const r = attempt(() => D.rebuildDropdowns());
    ok(r.ok, 'rebuildDropdowns runs (' + (r.err || 'ok') + ')');
    ['i-tc', 'i-site-visit-by', 'e-prepared-by'].forEach((id) => {
      const h = doc.getElementById(id).innerHTML;
      has(h, '<option value="' + NAME_HTML + '">' + NAME_HTML + '</option>', id + ': escaped in the value and the label');
      lacks(h, '<b>', id + ': no markup from the name');
      const o = optionsOf(h).filter((x) => x.text === NAME)[0] || {};
      eq(o.value, NAME, '⚠ ' + id + ': the option\'s value reads back as the name — a quote used to cut it short');
    });
    doc.getElementById('i-tc').innerHTML = '';
    attempt(() => D.populateIntakeTCDropdown());
    has(doc.getElementById('i-tc').innerHTML, '<option value="' + NAME_HTML + '">' + NAME_HTML + '</option>', 'populateIntakeTCDropdown too');
    const Lg = lift(['_logSelectOptionsHtml'], []);
    const h = String((attempt(() => Lg._logSelectOptionsHtml('tc', { tc: { name: NAME }, ps: [] }, NAME, 0, true, [NAME], [])).val) || '');
    has(h, '>' + NAME_HTML + '</option>', 'the Job Plan team select, which has no value attribute, escapes the label its value comes from');
    ok(optionsOf(h).some((x) => x.text === NAME), 'and reads back as the name');
    const kept = String((attempt(() => Lg._logSelectOptionsHtml('tc', { tc: { name: NAME }, ps: [] }, NAME, 0, true, ['Anthony Graziano'], [])).val) || '');
    has(kept, '<option selected>' + NAME_HTML + '</option>', 'and so does a name kept after it left the roster');
  }

  group('6b · the notices that name a person escape the name');
  {
    // saveContractor: added, updated, and the rename refusal.
    const doc = domStub({ 'c-firstname': 'O\'Hara <b>&', 'c-lastname': '"Sons"', 'c-role': 'TC', 'c-status': 'active', 'c-rate': '60' });
    doc.getElementById('add-contractor-card').dataset.editId = '';
    let confirmAnswer = true;
    const S = lift(['saveContractor'], ['contractors', 'DEFAULT_CONTRACTORS', 'saveContractors', 'renderContractors', 'rebuildDropdowns'],
      { document: doc, contractors: [], DEFAULT_CONTRACTORS: [], saveContractors() {}, renderContractors() {}, rebuildDropdowns() {},
        setTimeout: () => 0, confirm: () => confirmAnswer });
    attempt(() => S.saveContractor());
    const fb = () => doc.getElementById('c-fb').innerHTML;
    has(fb(), NAME_HTML + ' added.', 'added: the name is escaped');
    lacks(fb(), '<b>', 'and renders no markup');
    doc.getElementById('add-contractor-card').dataset.editId = S.contractors[0] ? S.contractors[0].id : 'x';
    attempt(() => S.saveContractor());
    has(fb(), NAME_HTML + ' updated.', 'updated: the same');
    S.contractors.push({ id: 'c9', name: 'Pat Lee', role: 'TC', status: 'active' });
    doc.getElementById('add-contractor-card').dataset.editId = 'c9';
    confirmAnswer = false;
    attempt(() => S.saveContractor());
    has(fb(), 'to enter ' + NAME_HTML + ' as a new person', 'the rename refusal: the same');

    // The estimate-denied notice names the concierge it went back to.
    const dd = domStub({ 'deny-reason': 'Price the garage', 'deny-pin': '3010' });
    const Dn = lift(['submitDeny'], ['jobs', 'currentEstimate', 'saveJobs', 'syncJobToSheets', 'saveEstimateState', 'closeDenyModal',
      'renderClientEstimate', 'updateApprovalUI', 'notifyTCOfDecision'],
      { document: dd, setTimeout: () => 0, jobs: [{ id: 7, name: 'Butler', tc: NAME, status: 'pending' }],
        currentEstimate: { jobId: 7 }, saveJobs() {}, syncJobToSheets() {}, saveEstimateState() {}, closeDenyModal() {},
        renderClientEstimate() {}, updateApprovalUI() {}, notifyTCOfDecision() {} });
    const dr = attempt(() => Dn.submitDeny());
    ok(dr.ok, 'submitDeny runs (' + (dr.err || 'ok') + ')');
    has(dd.getElementById('ce-fb').innerHTML, 'sent back to ' + NAME_HTML + '.', 'the denied notice escapes the concierge');

    // Quick-add partner from intake.
    const dq = domStub({ 'qp-fname': 'O\'Hara <b>&', 'qp-lname': '"Sons"', 'i-src': 'Estate attorney', 'qp-firm': '', 'qp-phone': '', 'qp-email': '' });
    const Q = lift(['saveQuickPartner'], ['referralDirectory', 'postReferralWrite', 'populateReferralPicker', 'renderReferralsTab'],
      { document: dq, setTimeout: () => 0, referralDirectory: [], populateReferralPicker() {}, renderReferralsTab() {},
        postReferralWrite(type, payload, cb) { cb(true, { uid: 'u-1', _row: 9 }); } });
    const qr = attempt(() => Q.saveQuickPartner());
    ok(qr.ok, 'saveQuickPartner runs (' + (qr.err || 'ok') + ')');
    has(dq.getElementById('i-fb').innerHTML, NAME_HTML + ' added to Referral Partners', 'the quick-add notice escapes the partner');

    // "Estimate loaded for job:" names the client.
    const de = domStub({ 'e-job': '7' });
    const E = lift(['applyOpenedEstimate'], ['currentEstimate', 'loadEstimateForJob', 'estimateHasContent', 'restoreEstimateToUI', 'updateApprovalUI'],
      { document: de, setTimeout: () => 0, currentEstimate: { jobId: 7, rooms: [{}] }, loadEstimateForJob: () => true,
        estimateHasContent: () => true, restoreEstimateToUI() {}, updateApprovalUI() {} });
    const er = attempt(() => E.applyOpenedEstimate(7, { id: 7, name: NAME }, 'ok'));
    ok(er.ok, 'applyOpenedEstimate runs (' + (er.err || 'ok') + ')');
    has(de.getElementById('e-fb').innerHTML, 'Estimate loaded for job: ' + NAME_HTML, 'the loaded notice escapes the client');
  }

  // ═══ 7 · THE HANDOVER STAMPS CARRY THE ASSIGNED CONCIERGE ═══════════════════
  group('7 · activatedBy and deliveredBy carry the assigned concierge; every other _actor stamp is unchanged');
  {
    const said = [];
    const A = lift(['applyJobTransition', '_actor'], ['jobs', 'estimateStore', 'jobActivationBlockers', 'jobCloseBlockers', 'saveJobs', 'syncJobToSheets'],
      { jobs: [], estimateStore: {}, jobActivationBlockers: () => [], jobCloseBlockers: () => [], saveJobs() {}, syncJobToSheets() {},
        _todayStr: () => '2026-09-30', confirm: () => true, alert: (m) => said.push(String(m)) });
    const j = { id: 7, name: 'Butler', svc: 'cleanout', status: 'won', tc: 'Carla Mendes', agrApprovedBy: 'Anthony Graziano',
      payments: [{ uid: 'p1', stage: 'midpoint', amount: 100, date: '2026-09-29' }] };
    ok((attempt(() => A.applyJobTransition(j)).val) === true, 'fixture: the job activates');
    eq(j.activatedBy, 'Carla Mendes', '⚠⚠ activated under the assigned concierge — it recorded the price\'s approver');
    ok((attempt(() => A.applyJobTransition(j)).val) === true, 'fixture: and closes');
    eq(j.deliveredBy, 'Carla Mendes', '⚠⚠ handed over under the assigned concierge');
    eq(A._actor(j), 'Anthony Graziano', '_actor itself is unchanged: the approver, for its other callers');
    ok((attempt(() => A.applyJobTransition(j)).val) === true, 'fixture: a re-open');
    const ro = (j.reopens || [])[0] || {};
    eq([ro.closedBy, ro.reopenedBy], ['Carla Mendes', 'Anthony Graziano'], 'the re-open keeps the close\'s name and still stamps _actor');
    j.tc = 'Dana Ruiz';
    attempt(() => A.applyJobTransition(j));
    eq(j.activatedBy, 'Carla Mendes', 'write-once: a reassigned concierge does not rewrite who started it');
    const bare = { id: 8, status: 'won', tc: '  ', agrApprovedBy: 'Ashley Jerome' };
    attempt(() => A.applyJobTransition(bare));
    eq(bare.activatedBy, 'Ashley Jerome', 'nobody assigned: what it recorded before, the approver');
    const none = { id: 9, status: 'won' };
    attempt(() => A.applyJobTransition(none));
    eq(none.activatedBy, '', 'and with no approver either, nobody');
    eq(said, [], 'fixture: nothing refused');
  }

  // ═══ 8 · THE WITHDRAWN PACKET, ONCE THE ESTIMATE IS APPROVED AGAIN ══════════
  group('8 · agrApprovalWithdrawn stops saying "re-approve" once the estimate is approved again');
  {
    const W = lift(['agrApprovalWithdrawn'], ['estimateStore'], { estimateStore: {} });
    const job = (o) => Object.assign({ id: 7, agrApproved: false, agrRevokedBy: 'discount-revised', approved: false }, o || {});
    eq(W.agrApprovalWithdrawn(job(), { approved: false }),
       'A discount changed the price after this was prepared — re-approve the estimate and send a fresh packet', 'waiting on the manager: both halves');
    eq(W.agrApprovalWithdrawn(job(), { approved: true }),
       'A discount changed the price after this was prepared — send a fresh packet', '⚠⚠ approved again: only what is left to do');
    eq(W.agrApprovalWithdrawn(job({ agrRevokedBy: 'estimate-edited' }), { approved: true }),
       'The estimate was edited after this was prepared — send a fresh packet', 'the edit arm too');
    eq(W.agrApprovalWithdrawn(job({ agrRevokedBy: 'estimate-edited' }), { approved: false }),
       'The estimate was edited after this was prepared — re-approve it and send a fresh packet', 'and its waiting wording is unchanged');
    W.estimateStore = { 7: { approved: true } };
    eq(W.agrApprovalWithdrawn(job()), 'A discount changed the price after this was prepared — send a fresh packet',
       'with no record handed in, it reads the store, as the rest of the code does');
    W.estimateStore = {};
    eq(W.agrApprovalWithdrawn(job({ approved: true })), 'A discount changed the price after this was prepared — send a fresh packet',
       'or the job\'s own mirror of the approval');
    eq(W.agrApprovalWithdrawn(job({ agrApproved: true }), { approved: true }), '', 'a packet approved again after the send says nothing');
    // Through the real rail: the packet row of a job re-approved after a discount. ⚠ The job's own mirror is
    // still false here (another device's record, say): the row reads the record it is handed, the one the
    // Estimate approved row above it reads, and not only the store or the mirror.
    const T = lift(['jobTimeline'], ['jobs', 'estimateStore', 'jobLogs'], { jobs: [], estimateStore: {}, jobLogs: {}, Intl: global.Intl, _todayStr: () => '2026-09-30' });
    const J = { id: 7, name: 'Butler', svc: 'home_cleanout', status: 'won', won: true, wonAt: '2026-09-10', approved: false,
      created: 'Sep 8, 2026', walkthrough: '2020-01-01', estimateSentDate: 'September 9, 2026', agrApproved: false, agrRevokedBy: 'discount-revised' };
    const rec = { estimate: { svc: 'home_cleanout', havellinTotal: 11000, totTC: 20, totPS: 30, rooms: [{ idx: 0, name: 'Kitchen', vol: 3, cplx: 3 }] },
      approved: true, savedAt: 1 };
    const row = (T.jobTimeline(J, rec, [], []).filter((r) => r.key === 'agreement_sent')[0]) || {};
    eq(row.sub, 'A discount changed the price after this was prepared — send a fresh packet', '⚠ the packet row on the timeline says so');
  }

  // ═══ 9 · THE HOME PREP FINAL'S TOTAL SAYS WHAT IT IS ════════════════════════
  const INV = lift(['invoiceHtml'], ['jobs', 'estimateStore', 'jobLogs', 'changeOrders', 'contractors', 'currentEstimate', 'currentInvStage'],
    { jobs: [], estimateStore: {}, jobLogs: {}, changeOrders: [], contractors: [], currentEstimate: null, currentInvStage: 'final', vendorDirectory: [] });
  const PREP_EST = (hrs) => ({ jobId: 7, svc: 'prep', totTC: hrs, totPS: 0, tcRate: 150, psRate: 100, tcFee: hrs * 150, psFee: 0,
    declutterTCHrs: hrs, prepEnabled: true, prepItems: [{ id: 'p1', type: 'Painter', cost: 10000 }], prepCost: 10000, prepFee: 3000,
    havellinTotal: 3000 + hrs * 150, pkgCost: 0, smf: 0, vendors: [], discountPct: 0, rush: false, fixedPrice: false });
  const invoice = (job, est, logs, stage) => {
    INV.jobs = [job]; INV.estimateStore = { 7: { estimate: est, approved: true } }; INV.jobLogs = { 7: logs || [] };
    return attempt(() => INV.invoiceHtml(job, stage || 'final'));
  };
  const finalRow = (h) => {
    const m = /<tr style="border-top:2px solid var\(--border-md\);"><td colspan="2">([^<]*)<\/td><td class="r"><strong>([^<]*)<\/strong>/.exec(String(h));
    return m ? { label: decode(m[1]), amount: m[2] } : { label: '', amount: '' };
  };
  group('9 · a Home Prep final heads its total with what it is made of — Anthony\'s wording');
  {
    const PJ = { id: 7, name: 'Butler', hvlId: 'HVL-0007', svc: 'prep', tc: 'Anthony Graziano', status: 'active', won: true, payments: [] };
    const withHrs = invoice(PJ, PREP_EST(8), [{ id: 1, date: '2026-09-24', members: [{ name: 'Anthony Graziano', role: 'TC', hours: 6 }] }]);
    ok(withHrs.ok && withHrs.val && !withHrs.val.blocked, 'fixture: a prep final with concierge hours logged renders (' + (withHrs.err || 'ok') + ')');
    eq(finalRow(withHrs.val && withHrs.val.html).label, 'Services total (site management fee on actual vendor spend + logged concierge hours)',
       '⚠⚠ with hours logged: the fee and the hours, in those words');
    eq(finalRow(withHrs.val && withHrs.val.html).amount, '$3,900', 'over the figure it bills — $3,000 on the painter plus 6 hours at $150');
    const feeOnly = invoice(PJ, PREP_EST(0), []);
    ok(feeOnly.ok && feeOnly.val && !feeOnly.val.blocked, 'fixture: a fee-only prep final renders');
    eq(finalRow(feeOnly.val && feeOnly.val.html).label, 'Services total (site management fee on actual vendor spend)',
       '⚠⚠ with no hours logged: the fee alone');
    lacks(textOf(feeOnly.val && feeOnly.val.html), 'logged hours + actual fees', 'and never "logged hours" on a job that logged none');
    const CJ = { id: 7, name: 'Ellsworth', hvlId: 'HVL-0008', svc: 'cleanout', tc: 'Anthony Graziano', status: 'active', won: true, payments: [] };
    const CE = { jobId: 7, svc: 'cleanout', totTC: 10, totPS: 20, tcRate: 150, psRate: 100, tcFee: 1500, psFee: 2000, havellinTotal: 3500,
      pkgCost: 0, smf: 0, vendors: [], prepItems: [], discountPct: 0, rush: false, fixedPrice: false };
    const hourly = invoice(CJ, CE, [{ id: 1, date: '2026-09-24', members: [{ name: 'Anthony Graziano', role: 'TC', hours: 10 }, { name: 'Dana Ruiz', role: 'PS', hours: 20 }] }]);
    eq(finalRow(hourly.val && hourly.val.html).label, 'Actual Havellin services total (logged hours + actual fees)', 'every other service keeps its heading');
  }

  // ═══ 10 · THE PAGE-LEVEL AGREEMENT APPROVAL IS GONE ═════════════════════════
  group('10 · agrApproved / agrApprovedBy / agrApprovedAt are deleted, and the Agreement tab reads the job');
  {
    ['agrApproved', 'agrApprovedBy', 'agrApprovedAt'].forEach((v) => ok(!attempt(() => decl(v)).ok, v + ' is no longer declared'));
    const doc = domStub({});
    const U = lift(['updateAgrUI'], ['jobs', 'estimateStore', 'currentAgrJobId'],
      { document: doc, estimateStore: { 1: { estimate: { havellinTotal: 12000 }, approved: true } },
        jobs: [{ id: 1, name: 'Alder', status: 'won', won: true, approved: true, agrApproved: true, agrApprovedBy: 'Anthony Graziano', agrApprovedAt: 'September 1, 2026' },
               { id: 2, name: 'Birch', status: 'won', won: true, approved: true, agrApproved: true, agrApprovedBy: 'Ashley Jerome', agrApprovedAt: 'September 29, 2026' }],
        currentAgrJobId: 1 });
    U.agrApprovedBy = 'Mallory'; U.agrApprovedAt = 'January 1, 2020';   // whatever a global of that name holds
    const r = attempt(() => U.updateAgrUI());
    ok(r.ok, '⚠ updateAgrUI runs without the page globals (' + (r.err || 'ok') + ')');
    const banner = textOf(doc.getElementById('agr-banner-wrap').innerHTML);
    has(banner, 'Agreement approved — Anthony Graziano · September 1, 2026', '⚠⚠ the banner names the approval on the job it paints');
    lacks(banner, 'Mallory', 'never a page variable');
  }

  // ═══ 11 · THE ±TOLERANCE AND THE SMF LABEL READ THEIR CONSTANTS ═════════════
  group('11 · both agreements read EST_TOLERANCE_PCT, and read exactly as before at 15%');
  {
    const G = lift(['agreementHtml', 'probateAgreementHtml'], ['jobs', 'estimateStore'], { jobs: [], estimateStore: {}, contractors: [] });
    const AEST = { svc: 'downsizing', tcRate: 150, psRate: 100, totTC: 40, totPS: 60, tcFee: 6000, psFee: 6000, havellinTotal: 12000,
      fixedPrice: false, rush: false, rushAmt: 0, rushPct: 0.20, discountPct: 0, discountAmt: 0, pkgCost: 0, pkgLabel: 'None — $0', prepItems: [], docScope: 'full' };
    const AJOB = (svc) => ({ id: 3, name: 'Butler', svc, addr: '69 Beach Blvd', tc: 'Anthony Graziano', status: 'won', won: true,
      executor: 'Tripp Butler', executorRole: 'Personal Representative', matterType: 'probate' });
    const std = () => textOf((attempt(() => G.agreementHtml(AJOB('downsizing'), AEST)).val) || '');
    const est = () => textOf((attempt(() => G.probateAgreementHtml(AJOB('probate'), Object.assign({}, AEST, { svc: 'probate' }))).val) || '');
    eq(G.EST_TOLERANCE_PCT, 0.15, 'fixture: the tolerance is 15%');
    has(std(), '3.8 Adjustment to Estimate. If actual conditions require additional work reasonably projected to exceed the Estimate by more than 15%, Contractor will notify Client in writing before proceeding.',
        '⚠ the standard form\'s §3.8, word for word as it read');
    has(est(), 'If actual hours are projected to exceed the estimate by more than 15%, Havellin will notify the Client and obtain written approval before continuing.',
        '⚠ the estate form\'s billing clause, word for word');
    has(est(), 'Actual hours projected to exceed estimate by more than 15%', 'and its change-order list item');
    G.EST_TOLERANCE_PCT = 0.2;
    ok(std().indexOf('more than 20%') >= 0 && std().indexOf('more than 15%') < 0, '⚠⚠ the standard form follows the constant');
    eq((est().match(/more than 20%/g) || []).length, 2, '⚠⚠ both estate-form sentences follow it');
    lacks(est(), 'more than 15%', 'and no literal is left behind');
    G.EST_TOLERANCE_PCT = 0.15;
  }

  group('11 · the Service Management Fee label derives its percentage from SMF_PCT');
  {
    const CJ = { id: 7, name: 'Ellsworth', hvlId: 'HVL-0008', svc: 'cleanout', tc: 'Anthony Graziano', status: 'active', won: true, payments: [] };
    const CE = { jobId: 7, svc: 'cleanout', totTC: 10, totPS: 20, tcRate: 150, psRate: 100, tcFee: 1500, psFee: 2000, havellinTotal: 4000,
      pkgCost: 0, smf: 500, vendors: [{ id: 'v1', type: 'Movers', cost: 5000 }], prepItems: [], discountPct: 0, rush: false, fixedPrice: false };
    const LOGS = [{ id: 1, date: '2026-09-24', members: [{ name: 'Anthony Graziano', role: 'TC', hours: 10 }, { name: 'Dana Ruiz', role: 'PS', hours: 20 }] }];
    eq(INV.SMF_PCT, 0, 'fixture: SMF_PCT is 0 today, so the row cannot render');
    INV.SMF_PCT = 0.10;
    const fin = invoice(CJ, CE, LOGS, 'final'), dep = invoice(CJ, CE, LOGS, 'deposit'), mid = invoice(CJ, CE, LOGS, 'midpoint');
    INV.SMF_PCT = 0;
    [['final', fin], ['deposit', dep], ['midpoint', mid]].forEach(([st, r]) => {
      const t = textOf((r.val && r.val.html) || '');
      has(t, 'Service Management Fee (10% — vendor coordination)', '⚠ the ' + st + ' invoice prints the fee it charges');
      lacks(t, '(15% — vendor coordination)', 'not a hard-coded 15% — ' + st);
    });
  }
}
