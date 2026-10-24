'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// KEYS AND ACCESS ITEMS: THE CUSTODY LOG (2026-10-16; KEY_CUSTODY_SPEC.md; Anthony's answers Q72 to Q74).
//   · Two record lists on the job (accessItems written once, accessEvents append only), merged entry by entry on the sheet.
//   · Who holds an item is derived from its latest live event; a voided event re-derives it. Nothing edits an event.
//   · Refused only what would leave no holder or no explanation; a return to a stranger or a handoff from the wrong hand is
//     flagged, never refused.
//   · Close job refuses while an item is held (jobCloseBlockers); Mark lost / Deposit Retained flag it (Q73).
//   · A lost item is a red line on the card, Close-out, the desk and the dashboard; the app sends nothing (Q74).
//   · The code lives on the item (Q72), is wiped as the job closes, and no printed record carries the digits.
//   · The record rides the Disposition Ledger, the Contents Record and the package record, and files on its own at close.
// Driven through the real catalogue, the real dialog handlers and the real builders; the boundaries (the store saves,
// the sync, the badge, the print dialog) are stubbed by name. Today is always an argument or a stub, never the clock.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sandbox, domStub, source, fn, matchBrace } = require('./harness');

const SRC = source();
const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
function gsFn(name) {
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(GS);
  if (!m) throw new Error('not in .gs: ' + name);
  const start = m.index + (m[1] ? m[1].length : 0);
  const close = matchBrace(GS, GS.indexOf('{', re.lastIndex));
  return GS.slice(start, close + 1);
}
function gsVar(name) {
  const m = GS.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[^;]*;)'));
  if (!m) throw new Error('not in .gs: var ' + name);
  return m[2];
}
// Live source of one function: comment lines stripped (a needle must not match the comment that explains it).
const live = (name) => fn(name).split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n');

const ACCESS_FNS = ['accessItemsOf', 'accessEventsOf', 'accessItemLabel', 'accessItemState', 'accessItemOpen', 'accessStateText', 'accessTeamNames',
  'accessClientParties', 'accessDefaultHolder', 'accessDefaultReturnee', 'accessRefusal', 'accessEventFlags', 'accessLines', 'accessHeldItems', 'accessCloseBlocker',
  'accessTerminalFlag', 'accessClearCodes', '_accessEventLineHtml', '_accessItemRowHtml', 'accessCardHtml', '_repaintAccessCard', 'goToAccessCard',
  'accessDashHtml', '_accessRowHtml', 'accessAddRow', 'openAccessDialog', 'closeAccessDialog', 'saveAccessDialog', 'voidAccessEvent', 'voidAccessItem',
  'accessCustodyRecordHtml', 'printAccessRecord', 'fileAccessRecord'];
const BASE_FNS = ['jobListEntries', 'jobListGet', 'jobListPut', 'jobListRemove', 'jobListVoid', 'newJobListId', '_saveJobEdit', '_jobTouch',
  'samePerson', 'canonPersonName', 'isCrewPlaceholder', '_andJoin', 'deviceUser', '_actor', '_invStampBy', 'isDecedentJob', 'fmtDate2', '_todayStr',
  '_ymdLocal', 'derivedLinesHtml', 'esc', '_invJob', 'docState'];
const VARS = ['JOB_RECORD_LISTS', 'ACCESS_ITEM_KINDS', 'ACCESS_EVENT_KINDS', 'ACCESS_DOC_KEY', 'ACCESS_RECORD_TITLE', '_accessFiling',
  'DECEDENT_SERVICES', 'PERSON_NAME_ALIASES', 'CONTRACTOR_TC_NAME', 'LOG_PLACEHOLDER_NAMES'];
const TODAY = '2026-10-20';

function mk(extra) {
  const badges = [], fbs = [], notices = [];
  const S = sandbox({
    fns: ACCESS_FNS.concat(BASE_FNS).concat((extra && extra.fns) || []),
    vars: VARS.concat((extra && extra.vars) || []),
    stubs: Object.assign({
      saveJobs: () => { S.__saves = (S.__saves || 0) + 1; }, syncJobToSheets: () => { S.__syncs = (S.__syncs || 0) + 1; },
      showSyncBadge: (m, err) => badges.push({ m: String(m), err: !!err }), showFB: (id, type, m) => fbs.push({ id, type, m: String(m) }),
      _docNotice: (type, m) => notices.push({ type, m: String(m) }), _dashRedraw: () => false, openJobPlanFor: () => false,
      sectionHdr: (t) => '<div class="sec">' + t + '</div>', _invDocHead: (job, title, extra) => '<h2>' + title + '</h2><div>' + (extra || '') + '</div>',
      _invDocName: (job, title) => 'Havellin ' + title, _invDocDriveName: (job, title) => 'HVL - Havellin ' + title + '.html',
      _exportDoc: (t, h) => '<html>' + h + '</html>', _armFiling: (map, key) => { map[key] = 1; return () => { delete map[key]; return true; }; },
      FILING_WATCHDOG_MS: 120000, SHEETS_SYNC_URL: '', _jobRootFolderId: (job) => (job && job.driveFolder ? 'root1' : null),
      uploadHtmlToDrive: () => {}, jobs: [], estimateStore: {},
    }, (extra && extra.stubs) || {}),
  });
  S.__badges = badges; S.__fbs = fbs; S.__notices = notices;
  return S;
}
function JOB(over) {
  return Object.assign({ id: 7, name: 'Ruth Adler', svc: 'downsizing_move', tc: 'Ashley Jerome', status: 'active', at: {}, driveFolder: 'https://drive.google.com/drive/folders/abc' }, over || {});
}
// The recorder, through the real list writers: an item and its receipt, as saveAccessDialog writes them.
function receive(S, job, label, from, to, on, over) {
  const it = S.jobListPut(job, 'accessItems', Object.assign({ kind: 'key', label, qty: 1, receivedOn: on, receivedFrom: from, recordedBy: to, recordedAt: 1 }, over || {}));
  S.jobListPut(job, 'accessEvents', { itemId: String(it.id), kind: 'received', on, from, to, recordedBy: to, recordedAt: 1 });
  return it;
}
function act(S, job, it, kind, on, from, to, note, at) {
  return S.jobListPut(job, 'accessEvents', { itemId: String(it.id), kind, on, from: from || '', to: to || '', note: note || '', recordedBy: 'Ashley Jerome', recordedAt: at || Date.now() });
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  // ── 1 ─────────────────────────────────────────────────────────────────────
  group('The two lists are record lists on the job, and the sheet merges each entry by entry (app and server level)');
  {
    const S = mk();
    ok(S.JOB_RECORD_LISTS.indexOf('accessItems') >= 0, 'accessItems is a record list (written through jobListPut, voided never removed)');
    ok(S.JOB_RECORD_LISTS.indexOf('accessEvents') >= 0, 'accessEvents is a record list');
    const ctx = vm.createContext({ console });
    vm.runInContext([gsVar('JOB_KEYED_LISTS'), gsVar('JOB_KEYED_MAPS'), gsVar('JOB_LIST_KEY'), gsVar('JOB_PAYMENT_STICKY'),
      gsFn('_paymentSticky'), gsFn('_jobStamp'), gsFn('_jobListKey'), gsFn('_mergeJobKeyed'), gsFn('_mergeJobRecord'),
      'this.G = { JOB_KEYED_LISTS: JOB_KEYED_LISTS, JOB_LIST_KEY: JOB_LIST_KEY, merge: _mergeJobRecord };'].join('\n\n'), ctx);
    const G = ctx.G;
    ['accessItems', 'accessEvents'].forEach((k) => {
      ok(G.JOB_KEYED_LISTS.indexOf(k) >= 0, k + ' is on the backend\'s per-entry list');
      eq(G.JOB_LIST_KEY[k], 'id', k + ' is keyed on id on the server');
    });
    // A receipt recorded on the desk and a handoff recorded in the field, each on the morning copy: both survive.
    const desk = { id: 7, updatedAt: 100, accessEvents: [{ id: 'e1', itemId: 'k1', kind: 'received', on: '2026-10-20', to: 'Ashley Jerome' }], at: { 'accessEvents:e1': 100 } };
    const field = { id: 7, updatedAt: 200, accessEvents: [{ id: 'e2', itemId: 'k1', kind: 'handoff', on: '2026-10-21', to: 'Anthony Graziano Jr' }], at: { 'accessEvents:e2': 200 } };
    const m = G.merge(desk, field);
    eq((m.accessEvents || []).map((e) => e.id).sort(), ['e1', 'e2'], '⚠⚠ two devices\' events both survive the merge: neither drops the other\'s');
    const vcheck = SRC.match(/var BACKEND_MIN_VERSION = '([^']+)'/);
    ok(vcheck && vcheck[1] >= '2026-10-16', 'BACKEND_MIN_VERSION names the deployment that merges the two lists (' + (vcheck && vcheck[1]) + ')');
    const cost = SRC.slice(SRC.indexOf('var BACKEND_FEATURE_COST')).match(/\n  version:\s+'([^']*)'/);
    // 2026-10-19's inventory reset leads the line now; this gap is named by its vintage after it.
    has(cost ? cost[1] : '', 'on a deployment older than 2026-10-16, an incident reported on one device, or a key or fob received there', 'and the stale-deployment banner names the consequence by its vintage');
    has(cost ? cost[1] : '', 'Keys & access', '…naming the Keys & access card');
  }

  // ── 2 ─────────────────────────────────────────────────────────────────────
  group('Who holds it is derived from the latest live event, never stored');
  {
    const S = mk();
    const job = JOB(); S.jobs.push(job);
    const key = receive(S, job, 'front door', 'Ruth Adler', 'Ashley Jerome', '2026-10-20');
    let st = S.accessItemState(job, key);
    eq([st.state, st.holder], ['held', 'Ashley Jerome'], 'received: held by the person who took it');
    ok(S.accessItemOpen(st), 'and the job cannot close on it');
    const h = act(S, job, key, 'handoff', '2026-10-21', 'Ashley Jerome', 'Anthony Graziano Jr', '', 10);
    st = S.accessItemState(job, key);
    eq([st.state, st.holder], ['held', 'Anthony Graziano Jr'], 'handoff: the new hand holds it');
    S.jobListVoid(job, 'accessEvents', h.id, 'wrong person', 'Ashley Jerome');
    st = S.accessItemState(job, key);
    eq(st.holder, 'Ashley Jerome', '⚠⚠ voiding the handoff re-derives the holder: the record is corrected by entries, never edited');
    eq(S.accessEventsOf(job, key.id, true).length, 2, 'and the voided entry stays on the full history');
    eq(S.accessEventsOf(job, key.id).length, 1, 'off the live one');
    act(S, job, key, 'returned', '2026-10-25', 'Ashley Jerome', 'Ruth Adler', '', 20);
    st = S.accessItemState(job, key);
    eq([st.state, st.to], ['returned', 'Ruth Adler'], 'returned: to whom');
    ok(!S.accessItemOpen(st), 'a returned item no longer holds the close');
    has(S.accessStateText(st), 'returned to Ruth Adler on Oct 25, 2026', 'read as a sentence, with the day');
    // The order is the day it HAPPENED, then the moment recorded: a handoff logged the next morning still sorts where it belongs.
    const fob = receive(S, job, 'gate fob', 'Ruth Adler', 'Ashley Jerome', '2026-10-20');
    act(S, job, fob, 'handoff', '2026-10-22', 'Ashley Jerome', 'Carla Reyes', '', 900);
    act(S, job, fob, 'handoff', '2026-10-21', 'Ashley Jerome', 'Anthony Graziano Jr', '', 950);   // recorded later, happened earlier
    eq(S.accessItemState(job, fob).holder, 'Carla Reyes', 'events sort by the day they happened, not the order recorded');
    const lostIt = receive(S, job, 'garage remote', 'Ruth Adler', 'Ashley Jerome', '2026-10-20');
    act(S, job, lostIt, 'lost', '2026-10-23', 'Ashley Jerome', '', 'left on the truck', 30);
    st = S.accessItemState(job, lostIt);
    eq([st.state, st.why, st.from], ['lost', 'left on the truck', 'Ashley Jerome'], 'lost: with the explanation and whose hands it left');
    ok(!S.accessItemOpen(st), 'a lost item with its explanation does not hold the close');
    act(S, job, lostIt, 'recovered', '2026-10-24', '', 'Ashley Jerome', '', 40);
    eq(S.accessItemState(job, lostIt).state, 'held', 'recovered: held again');
    eq(S.accessItemLabel({ kind: 'key', label: 'front door', qty: 2 }), 'front door ×2', 'the label with its quantity');
    eq(S.accessItemLabel({ kind: 'remote', qty: 1 }), 'Garage remote', 'the kind\'s own name where no label was typed');
  }

  // ── 3 ─────────────────────────────────────────────────────────────────────
  group('Refused only where there would be no holder or no explanation; everything else is flagged');
  {
    const S = mk();
    const job = JOB({ executor: '', coFiduciaries: [] }); S.jobs.push(job);
    const key = receive(S, job, 'front door', 'Ruth Adler', 'Ashley Jerome', '2026-10-20');
    const r = (ev, it) => S.accessRefusal(job, Object.assign({ on: TODAY }, ev), it || key, TODAY);
    has(r({ kind: 'received', from: 'Ruth Adler', to: '' }, { id: 'new', kind: 'key', label: 'x' }), 'who took it for Havellin', 'a receipt with nobody taking it is refused by name');
    has(r({ kind: 'received', from: '', to: 'Ashley Jerome' }, { id: 'new', kind: 'key', label: 'x' }), 'who handed it over', 'and with nobody handing it over');
    eq(r({ kind: 'received', from: 'Ruth Adler', to: 'Ashley Jerome' }, { id: 'new', kind: 'key', label: 'x' }), '', 'a receipt of a new item passes');
    has(r({ kind: 'received', from: 'Ruth Adler', to: 'Ashley Jerome' }), 'already held by Ashley Jerome', 'receiving an item Havellin already holds is refused: record a handoff');
    has(r({ kind: 'handoff', to: '' }), 'who has it now', 'a handoff to nobody is refused');
    has(r({ kind: 'handoff', to: 'Ashley Jerome' }), 'already holds', 'a handoff to the person who holds it is refused');
    eq(r({ kind: 'handoff', from: 'Ashley Jerome', to: 'Anthony Graziano Jr' }), '', 'a handoff to another hand passes');
    has(r({ kind: 'lost', note: '' }), 'what happened', '⚠ lost needs the explanation');
    eq(r({ kind: 'lost', note: 'left on the truck' }), '', 'and passes with one');
    has(r({ kind: 'handoff', to: 'Carla Reyes', on: '2026-10-21' }), 'cannot be after today', 'a day after today is refused: the log records what has happened');
    has(r({ kind: 'handoff', to: 'Carla Reyes', on: '' }), 'the day', 'and no day at all');
    has(r({ kind: 'recovered', to: 'Ashley Jerome' }), 'Only a lost item is recovered', 'recovered on a held item is refused');
    has(r({ kind: 'bogus', to: 'x' }), 'not something the Keys & access card records', 'an unknown act');
    act(S, job, key, 'returned', '2026-10-21', 'Ashley Jerome', 'Ruth Adler', '', 5);
    has(r({ kind: 'handoff', to: 'Carla Reyes' }), 'cannot be handed off', 'a returned item cannot be handed off');
    has(r({ kind: 'lost', note: 'x' }), 'cannot be marked lost', 'nor marked lost');
    eq(r({ kind: 'received', from: 'Ruth Adler', to: 'Ashley Jerome' }), '', 'but the client can hand it over again: a fresh receipt, the old history kept');
    has(r({ kind: 'handoff', to: 'x' }, Object.assign({}, key, { voidedAt: 1 })), 'no longer on this job', 'a voided item takes no event');
    // Flags. A return to a stranger, and a handoff from a hand the log did not record, are recorded and named.
    const fob = receive(S, job, 'fob', 'Ruth Adler', 'Ashley Jerome', '2026-10-20');
    const toStranger = act(S, job, fob, 'returned', '2026-10-21', 'Ashley Jerome', 'Some Neighbour', '', 6);
    const flags = S.accessEventFlags(job, fob);
    has(flags[String(toStranger.id)], 'not recorded as the client or a party on this job', 'a return to somebody not on the job is flagged');
    eq(S.accessRefusal(job, { kind: 'returned', on: TODAY, to: 'Some Neighbour' }, receive(S, job, 'card', 'Ruth Adler', 'Ashley Jerome', '2026-10-20'), TODAY), '', 'and never refused');
    const card = receive(S, job, 'gate card', 'Ruth Adler', 'Ashley Jerome', '2026-10-20');
    const wrongHand = act(S, job, card, 'handoff', '2026-10-21', 'Carla Reyes', 'Anthony Graziano Jr', '', 7);
    has(S.accessEventFlags(job, card)[String(wrongHand.id)], 'recorded from Carla Reyes, the log held Ashley Jerome', 'a handoff from the wrong hand names the gap');
    const toClient = act(S, job, receive(S, job, 'remote', 'Ruth Adler', 'Ashley Jerome', '2026-10-20'), 'returned', '2026-10-21', 'Ashley Jerome', 'Ruth Adler', '', 8);
    eq(S.accessEventFlags(job, S.jobListGet(job, 'accessItems', toClient.itemId))[String(toClient.id)], undefined, 'a return to the client carries no flag');
    // The client's side on an estate: the representative and every co-representative, counsel, the referral partner; never the decedent.
    const est = JOB({ svc: 'probate', name: 'Harold Brennan', executor: 'Michael Brennan', coFiduciaries: [{ id: 'c1', name: 'Dana Brennan' }], probateAttyName: 'Lee Counsel', refPartnerName: 'Pat Realtor' });
    const parties = S.accessClientParties(est);
    eq(parties, ['Michael Brennan', 'Dana Brennan', 'Lee Counsel', 'Pat Realtor'], 'the estate\'s parties: the representative, the co-representative, counsel and the partner');
    eq(S.accessDefaultReturnee(est), 'Michael Brennan', 'a return on an estate goes to the representative by default');
    eq(S.accessDefaultReturnee(job), 'Ruth Adler', 'and to the client on living work');
  }

  // ── 4 ─────────────────────────────────────────────────────────────────────
  group('The lines: the count, red for a lost item (Q74), and the close gate (one refusal) and the terminal flag (Q73)');
  {
    const S = mk({ fns: ['jobCloseBlockers'], stubs: { unratedVendorsForJob: () => [] } });
    const job = JOB(); S.jobs.push(job);
    eq(S.accessLines(job, TODAY), [], 'no lines with nothing recorded');
    eq(S.accessCloseBlocker(job), '', 'and no blocker');
    eq(S.jobCloseBlockers(job), [], 'the close gate is silent');
    const key = receive(S, job, 'front door', 'Ruth Adler', 'Ashley Jerome', '2026-10-20');
    const fob = receive(S, job, 'gate fob', 'Ruth Adler', 'Ashley Jerome', '2026-10-20');
    const remote = receive(S, job, 'garage remote', 'Ruth Adler', 'Anthony Graziano Jr', '2026-10-20');
    let lines = S.accessLines(job, TODAY);
    eq(lines.length, 1, 'one line while nothing is lost');
    eq(lines[0].ok, false, 'open while anything is held');
    has(lines[0].detail, '3 received', 'the count');
    has(lines[0].detail, '3 held by Ashley Jerome, Anthony Graziano Jr', 'who holds what is still out');
    const blockers = S.jobCloseBlockers(job);
    eq(blockers.length, 1, '⚠⚠ Close job is refused while an item is held');
    has(blockers[0], 'front door: held by Ashley Jerome', 'naming each item and its holder');
    has(blockers[0], 'garage remote: held by Anthony Graziano Jr', 'every one');
    has(blockers[0], 'Keys & access card', 'and where to record the return');
    has(S.accessTerminalFlag(job), 'still holds 3 access items', 'Mark lost / Deposit Retained get the flag');
    has(S.accessTerminalFlag(job), 'dashboard stays red', 'which says the line stays red');
    act(S, job, key, 'returned', '2026-10-25', 'Ashley Jerome', 'Ruth Adler', '', 1);
    act(S, job, fob, 'returned', '2026-10-25', 'Ashley Jerome', 'Ruth Adler', '', 2);
    act(S, job, remote, 'lost', '2026-10-23', 'Anthony Graziano Jr', '', 'left on the truck', 3);
    lines = S.accessLines(job, TODAY);
    eq(lines.length, 2, 'a lost item is its own line');
    eq([lines[0].red, lines[0].ok], [true, false], '⚠⚠ RED (Q74: red on every device, no message)');
    has(lines[0].label, 'Access item lost: garage remote', 'naming the item');
    has(lines[0].detail, 'while held by Anthony Graziano Jr', 'whose hands it left');
    has(lines[0].detail, 'left on the truck', 'and what happened');
    eq(lines[1].ok, true, 'the count line is done: nothing is held');
    has(lines[1].detail, '2 returned to the client', 'two back');
    has(lines[1].detail, '1 lost', 'one lost');
    eq(S.jobCloseBlockers(job), [], '⚠ a lost item with its explanation does not block the close');
    eq(S.accessTerminalFlag(job), '', 'nor flag the terminal status');
    // The handler asks the gate, and the gate asks us: the button cannot be reached around.
    has(live('applyJobTransition'), 'jobCloseBlockers(j)', 'applyJobTransition asks jobCloseBlockers in the handler');
    has(live('jobCloseBlockers'), 'accessCloseBlocker(j)', 'and jobCloseBlockers asks the access blocker');
    has(live('openCloseoutModal'), 'accessTerminalFlag(j)', 'the close-out dialog shows the flag (Q73), and nothing there refuses');
    lacks(live('openCloseoutModal').split('accessTerminalFlag')[2] || '', 'return;', 'the flag does not stop the dialog');
    // Source-level, by name (the dialog reads the whole close-out and is driven in the browser step): the flag is drawn.
    has(live('openCloseoutModal'), "sub.innerHTML += '<div class=\"fos-flag\"", 'and is drawn under the dialog\'s summary');
    has(live('renderClientDashboard'), 'accessDashHtml(job)', 'the dashboard draws the card (browser step 81 reads it)');
    has(live('planDerivedLines'), "call: 'goToAccessCard(' + jobId + ')'", 'an open line on Close-out and the desk carries the way to the card');
    const html = S.derivedLinesHtml(lines, 'x');
    has(html, 'pl-red', 'the markup paints the lost line red');
    const dash = S.accessDashHtml(job);
    has(dash, 'Keys &amp; access', 'the dashboard card');
    has(dash, 'pl-red', 'red there too');
    has(dash, 'goToAccessCard(7)', 'with the way to the card');
    eq(S.accessDashHtml(JOB({ id: 8 })), '', 'and nothing on a job with no item recorded');
  }

  // ── 5 ─────────────────────────────────────────────────────────────────────
  group('The dialog, through the real handlers: a batch received, a handoff, a return, lost, a code; refusals say so in the dialog');
  {
    const doc = domStub({ 'acc-rows': { insertAdjacentHTML() {} } });
    const S = mk({ stubs: { document: doc } });
    S.localStorage.setItem('hav_device_user', 'Ashley Jerome');
    const job = JOB(); S.jobs.push(job);
    const el = (id) => doc.getElementById(id);
    const set = (id, v) => { el(id).value = v; };
    ok(S.openAccessDialog(7, 'receive'), 'the receipt dialog opens');
    eq(el('acc-to').value, 'Ashley Jerome', 'taken by: the device\'s user');
    eq(el('acc-on').value, S._todayStr(), 'today');
    eq(el('acc-rows').getAttribute('data-rows'), '1', 'one item row to start');
    S.accessAddRow();
    set('acc-from', 'Ruth Adler');
    set('acc-kind-1', 'key'); set('acc-label-1', 'front door'); set('acc-qty-1', '2'); set('acc-code-1', '');
    set('acc-kind-2', 'code'); set('acc-label-2', 'alarm'); set('acc-qty-2', '1'); set('acc-code-2', '4521');
    set('acc-to', '');
    ok(S.saveAccessDialog() === false, 'with nobody taking them the save is refused');
    has(S.__fbs[S.__fbs.length - 1].m, 'who took it for Havellin', 'in the dialog, by name');
    eq(S.accessItemsOf(job).length, 0, 'and nothing was written');
    set('acc-to', 'Ashley Jerome');
    ok(S.saveAccessDialog() === true, 'the batch saves');
    const items = S.accessItemsOf(job);
    eq(items.length, 2, 'two items from one paper');
    eq(items.map((i) => S.accessItemLabel(i)), ['front door ×2', 'alarm'], 'as typed');
    eq(items[1].code, '4521', '⚠ Q72: the code is on its item');
    eq(items.map((i) => S.accessItemState(job, i).holder), ['Ashley Jerome', 'Ashley Jerome'], 'both in one person\'s hands');
    eq(S.jobListEntries(job, 'accessEvents').every((e) => e.kind === 'received' && e.from === 'Ruth Adler'), true, 'one receipt event each, from the client');
    has(S.__badges[S.__badges.length - 1].m, '2 items received, held by Ashley Jerome', 'and the badge says so');
    // Hand off: the items held by the device's user are pre-ticked; the one ticked goes.
    const key = items[0], alarm = items[1];
    ok(S.openAccessDialog(7, 'handoff'), 'the handoff dialog opens');
    has(el('acc-ticks').innerHTML, 'acc-tick-' + key.id + '" style="width:auto;" checked', 'what the device\'s user holds is pre-ticked');
    el('acc-tick-' + key.id).checked = true; el('acc-tick-' + alarm.id).checked = false;
    set('acc-to', 'Anthony Graziano Jr');
    ok(S.saveAccessDialog() === true, 'saves');
    eq(S.accessItemState(job, key).holder, 'Anthony Graziano Jr', 'the key changed hands');
    eq(S.accessItemState(job, alarm).holder, 'Ashley Jerome', 'the alarm code did not');
    // Return, to a stranger: flagged in the badge, never refused.
    ok(S.openAccessDialog(7, 'return'), 'the return dialog opens');
    eq(el('acc-to').value, 'Ruth Adler', 'to the client by default');
    el('acc-tick-' + key.id).checked = true; el('acc-tick-' + alarm.id).checked = false;
    set('acc-to', 'Some Neighbour');
    ok(S.saveAccessDialog() === true, 'a return to somebody not on the job saves');
    has(S.__badges[S.__badges.length - 1].m, 'Flagged: front door ×2: not recorded as the client or a party on this job', 'and is flagged in the badge');
    eq(S.__badges[S.__badges.length - 1].err, true, 'amber');
    eq(S.accessItemState(job, key).state, 'returned', 'the key is returned');
    // Lost, without the explanation, then with it.
    ok(S.openAccessDialog(7, 'lost', alarm.id), 'the lost dialog opens on one item');
    set('acc-note', '');
    ok(S.saveAccessDialog() === false, 'refused without what happened');
    has(S.__fbs[S.__fbs.length - 1].m, 'what happened', 'by name');
    set('acc-note', 'written on a card that went in the shredding');
    ok(S.saveAccessDialog() === true, 'saves with it');
    eq(S.accessItemState(job, alarm).state, 'lost', 'lost');
    has(S.__badges[S.__badges.length - 1].m, 'reads red on every device', 'the badge says what happens (Q74)');
    ok(S.openAccessDialog(7, 'handoff') === false, 'with nothing held the handoff dialog refuses to open');
    has(S.__badges[S.__badges.length - 1].m, 'Nothing is held', 'and says why');
    // Recovered, then the code changed on it.
    ok(S.openAccessDialog(7, 'recovered', alarm.id), 'recovered opens');
    set('acc-to', 'Ashley Jerome');
    ok(S.saveAccessDialog() === true, 'saves');
    eq(S.accessItemState(job, alarm).holder, 'Ashley Jerome', 'held again');
    ok(S.openAccessDialog(7, 'code', alarm.id), 'the code dialog opens');
    eq(el('acc-code').value, '4521', 'with the current code');
    set('acc-code', '7788');
    ok(S.saveAccessDialog() === true, 'saves');
    eq(S.jobListGet(job, 'accessItems', alarm.id).code, '7788', 'the code moved');
    eq(S.accessItemState(job, alarm).holder, 'Ashley Jerome', 'the holder did not');
    const codeEv = S.jobListEntries(job, 'accessEvents').filter((e) => e.kind === 'code_set');
    eq(codeEv.length, 1, 'a code change is an entry on the history');
    lacks(JSON.stringify(codeEv), '7788', '⚠ which carries no digits');
    // Void an event through the handler: a reason is required, the entry stays.
    const ret = S.jobListEntries(job, 'accessEvents').filter((e) => e.kind === 'returned')[0];
    S.window.prompt = () => '';
    ok(S.voidAccessEvent(7, ret.id) === false, 'no reason, no void');
    S.window.prompt = () => 'wrong person';
    ok(S.voidAccessEvent(7, ret.id) === true, 'voided with the reason');
    eq(S.accessItemState(job, key).state, 'held', 'and the key reads held again (by the hand before the return)');
    eq(S.jobListGet(job, 'accessEvents', ret.id).voidReason, 'wrong person', 'the entry stays, with the reason');
    const card = S.accessCardHtml(7, job, {});
    has(card, 'id="plan-access-7"', 'the card');
    has(card, 'Code: <strong>7788</strong>', 'the card shows the code to the concierges (Q72)');
    has(card, '<s><strong>Returned to the client</strong>', 'the voided return struck through on the history');
    has(card, 'void: wrong person', 'with its reason');
    has(card, 'Record what we received', 'the acts');
    has(card, 'Print the custody record', 'and the record');
    ok(S.__saves > 0 && S.__syncs > 0, 'every write went through the list writers: saved and synced as a person\'s edit');
  }

  // ── 6 ─────────────────────────────────────────────────────────────────────
  group('The record: no digits, voided rows struck through, read by the ledger, the Contents Record and the package record; filed at close');
  {
    const S = mk({ fns: ['activateOrCycle'], stubs: { applyJobTransition: (j) => { j.status = 'closed'; return true; }, fileDispositionLedger: () => {}, fileContentsRecord: () => {},
      renderClientDashboard: () => {}, _dashRedraw: () => true } });
    const job = JOB(); S.jobs.push(job);
    eq(S.accessCustodyRecordHtml(job), '', 'no section with nothing recorded');
    eq(S.printAccessRecord(7, { asHtml: true }).why, 'no key or access item is recorded on this job', 'and the page refuses by name');
    const key = receive(S, job, 'front door', 'Ruth Adler', 'Ashley Jerome', '2026-10-20');
    const alarm = receive(S, job, 'alarm', 'Ruth Adler', 'Ashley Jerome', '2026-10-20', { kind: 'code', code: '4521', codeSetAt: 1, codeSetBy: 'Ashley Jerome' });
    const bad = act(S, job, key, 'handoff', '2026-10-21', 'Ashley Jerome', 'Nobody Real', '', 2);
    S.jobListVoid(job, 'accessEvents', bad.id, 'typo', 'Ashley Jerome');
    act(S, job, key, 'returned', '2026-10-25', 'Ashley Jerome', 'Ruth Adler', '', 3);
    const rec = S.accessCustodyRecordHtml(job);
    has(rec, 'Keys and access items', 'the items table');
    has(rec, 'Custody history', 'the history table');
    lacks(rec, '4521', '⚠⚠ the record never carries the digits');
    has(rec, '>held<', 'a code reads held');
    has(rec, 'text-decoration:line-through', 'the voided entry is struck through');
    has(rec, 'void: typo (Ashley Jerome)', 'with its reason and who voided it');
    has(rec, 'returned to Ruth Adler on Oct 25, 2026', 'where the key is now');
    has(rec, 'Ashley Jerome', 'recorded by');
    const page = S.printAccessRecord(7, { asHtml: true });
    has(page.html, 'IN PROGRESS &mdash; 1 of 2 still held', 'the page is stamped in progress while anything is held');
    eq(page.title, 'Havellin Key and Access Custody Record', 'its title');
    ['printDispositionLedger', 'printContentsRecord', 'probatePackageRecordHtml'].forEach((f) => {
      has(live(f), 'accessCustodyRecordHtml(job)', f + ' prints the record');
    });
    ok(live('printDispositionLedger').indexOf('accessCustodyRecordHtml(job)') < live('printDispositionLedger').indexOf('+ signoff'), 'the ledger prints it before the sign-off');
    ok(live('printContentsRecord').indexOf('accessCustodyRecordHtml(job)') < live('printContentsRecord').indexOf('contentsRecordSignoff(job, rec)'), 'the Contents Record too');
    // Closing wipes the codes (Q72) and files the record, then the papers.
    let filed = 0; const realFile = S.fileAccessRecord; S.fileAccessRecord = () => { filed++; return true; };
    S.activateOrCycle(7);
    S.fileAccessRecord = realFile;
    eq(job.status, 'closed', 'closed');
    eq(S.jobListGet(job, 'accessItems', alarm.id).code, '', '⚠⚠ Q72: the digits are gone when the job closes');
    ok(S.jobListGet(job, 'accessItems', alarm.id).codeClearedAt > 0, 'and the item says when');
    eq(S.jobListEntries(job, 'accessEvents').filter((e) => e.kind === 'code_cleared').length, 1, 'with an entry on the history');
    eq(filed, 1, 'the record was filed as the job closed');
    has(S.accessCustodyRecordHtml(job), 'cleared at close', 'and now reads cleared at close');
    eq(S.accessClearCodes(job), 0, 'a second close clears nothing more');
    // The filing refuses by name, and records on its own docState key.
    S.SHEETS_SYNC_URL = '';
    const S2 = S;
    eq(S2.fileAccessRecord(7), false, 'no URL: not filed');
    has(S2.__notices[S2.__notices.length - 1].m, 'no Apps Script URL', 'and says so');
    S2.SHEETS_SYNC_URL = 'https://x/exec';
    let up = null; S2.uploadHtmlToDrive = (folder, name, html, cb) => { up = { folder, name, html }; cb(true, 'https://drive/f1', { fileId: 'f1' }); };
    eq(S2.fileAccessRecord(7), true, 'with a URL and a folder it files');
    eq(up.folder, 'root1', 'to the client\'s folder');
    eq(up.name, 'HVL - Havellin Key and Access Custody Record.html', 'under its undated name, so a re-file replaces');
    lacks(up.html, '4521', 'no digits in Drive');
    eq(job.docState.accessRecord.filedUrl, 'https://drive/f1', 'recorded on docState.accessRecord');
    eq(job.docState.accessRecord.filedHow, 'card', 'from the card');
    eq(S2.ACCESS_DOC_KEY, 'accessRecord', 'the stored key');
  }

  // ── 7 ─────────────────────────────────────────────────────────────────────
  group('Intake no longer invites a code into free text (Q72), and the card is on every plan');
  {
    const S = sandbox({ vars: ['HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC'] });
    const acc = S.HOUSE_FLAGS.filter((f) => f.key === 'access')[0];
    ok(!!acc, 'the Access & security row');
    lacks(acc.ask.toLowerCase(), 'codes, contact', 'no longer asks for the codes');
    has(acc.ask, 'Keys & access card', 'and says where a code goes');
    lacks(acc.detail.toLowerCase(), 'codes', 'the detail line names no codes');
    // RESTATED 2026-10-23 (Anthony: blank boxes, nothing in them): the walkthrough note's box has no placeholder at all,
    // so it suggests nothing, a lockbox code included.
    const tag = (SRC.match(/<textarea id="notes-modal-text"[^>]*>/) || [''])[0];
    ok(tag.length > 20, 'the walkthrough note box was read');
    lacks(tag, 'placeholder', '⚠ the box suggests nothing, a lockbox code included');
    const plan = live('renderJobPlan');
    eq((plan.match(/accessCardHtml\(jobId, job, est\)/g) || []).length, 2, 'the card is drawn on the thread\'s Before Day 1 and on the Home Prep plan');
    has(live('planDerivedLines'), "phase === 'access' || phase === 'p4' || phase === 'admin'", 'the lines reach the card, Close-out and the desk');
    lacks(live('planGateChipsHtml'), 'accessLines', 'and never the gate chips');
  }
};
