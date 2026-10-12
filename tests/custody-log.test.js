'use strict';
// THE CHAIN-OF-CUSTODY LOG (2026-09-11).
//
// ⚠⚠ AN UNRELATED EDIT TO ANY FIELD ON THE ROW DESTROYED IT. The per-item manifest merge
// resolves by taking the whole newer RECORD — correct for a scalar, categorically wrong for
// an append-only log. Measured on the real merge: Ashley logs "Released · Sotheby's ·
// receipt SBY-4471" on the laptop, Anthony corrects the same item's FMV on the iPad without
// having synced, his record is newer, and the custody log comes back []. The estate
// agreement promises chain-of-custody tracking on every item of value.
//
// The merge union itself is tested in media-merge.test.js, against BOTH implementations.
// This file is the other half: the log has to be built so a union is possible at all —
// events need identity, removal has to tombstone rather than splice, and what a reader sees
// has to be ordered by when the event happened rather than by which device synced last.

const { sandbox, source, fn, decl } = require('./harness');

const VARS = ['_photoUidSeq'];
// 2026-10-12: an event records who logged it (`by`, off `_invStampBy`: the device's user, else the job's concierge).
const FNS = ['addCustodyEvent', 'removeCustodyEvent', 'custodyEvents', '_renderCustodyList',
             '_custodyEventId', 'mergeCustodyLogs', '_getPhotoRef', '_setPhotoRef',
             '_invTouch', '_photoUid', 'esc', 'fmtDate2', '_custodyHandle', '_custodyUnhandle',
             '_invJob', '_invStampBy', 'deviceUser'];

// The root's own call graph, derived from the source (as device-user.test.js lifts), for the package record.
const SRC = source();
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n');
const liveOnly = (t) => codeOnly(t).replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
function closure(roots, stop) {
  const stopSet = new Set(stop || []);
  const fns = new Set(), vars = new Set();
  const queue = roots.map((r) => ['f', r]);
  while (queue.length) {
    const [k, name] = queue.shift();
    if (stopSet.has(name)) continue;
    let body;
    if (k === 'f') { if (fns.has(name)) continue; fns.add(name); try { body = liveOnly(fn(name)); } catch (e) { continue; } }
    else { if (vars.has(name)) continue; vars.add(name); try { body = liveOnly(decl(name)); } catch (e) { continue; } }
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/[(,]\s*([A-Za-z_$][\w$]*)\s*[,)]/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) {
      if (stopSet.has(m[1])) continue;
      if (ALL_VARS.has(m[1])) queue.push(['v', m[1]]);
      else if (ALL_FNS.has(m[1])) queue.push(['f', m[1]]);
    }
  }
  return { fns: [...fns], vars: [...vars] };
}
function lift(roots, stubs) {
  const c = closure(roots, Object.keys(stubs || {}));
  return sandbox({ fns: c.fns, vars: c.vars, stubs: stubs || {} });
}
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();

function ctx(log, form) {
  const el = {};
  const fields = Object.assign({ 'cust-action': 'Released', 'cust-party': "Sotheby's",
    'cust-date': '2026-09-10', 'cust-method': 'Collected on site',
    'cust-receipt': 'SBY-4471' }, form || {});
  Object.keys(fields).forEach((k) => { el[k] = { value: fields[k] }; });
  el['custody-list'] = { innerHTML: '' };
  const state = { alerted: '', saved: 0, synced: 0, redrawn: 0 };
  const s = sandbox({
    fns: FNS, vars: VARS,
    stubs: {
      _custodyCtx: { jobId: 1, stableId: 'b' },
      jobs: [{ id: 1, tc: 'Ashley Jerome' }],
      _photoRefs: { 1: [{ stableId: 'b', label: 'inventory', objectName: 'Sargent portrait',
                          ts: 1, updatedAt: 1, custodyLog: log }] },
      document: { getElementById: (id) => el[id] || null },
      alert(m) { state.alerted = String(m); },
      savePhotoRefs() { state.saved++; },
      _scheduleInventorySync() { state.synced++; },
      renderInventoryTab() { state.redrawn++; },
    },
  });
  s.__el = el; s.__state = state;
  s.__ref = () => s._photoRefs[1][0];
  return s;
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ AN EVENT GETS AN IDENTITY WHEN IT IS RECORDED — that is what makes a union exact');
  {
    const s = ctx([]);
    s.addCustodyEvent();
    const log = s.__ref().custodyLog;
    eq(log.length, 1, 'the event is recorded');
    ok(log[0].cid, '⚠ and carries a cid — without it two devices’ events can only be keyed '
       + 'by value, and two genuine handovers to the same party on the same day collapse into one');
    ok(log[0].at > 0, 'and when it was RECORDED');
    eq(log[0].date, '2026-09-10', 'which is not the same field as when it HAPPENED');
    eq(log[0].receipt, 'SBY-4471', 'with the receipt it was given');
    eq(s.__state.saved, 1, 'it is persisted');
    eq(s.__state.synced, 1, 'and pushed');

    // ⚠ THE FORM IS CLEARED AFTER A SAVE, which is correct — a party left in the box is how
    // the next event gets logged against the wrong one — so the second entry is re-typed here
    // exactly as a person would.
    eq(s.__el['cust-party'].value, '', 'the party box is emptied after recording');
    eq(s.__el['cust-receipt'].value, '', 'and so is the receipt');

    // Two events recorded back to back are two events, even if identical.
    const t = ctx([]);
    const retype = () => { t.__el['cust-party'].value = "Sotheby's";
                           t.__el['cust-date'].value = '2026-09-10'; };
    t.addCustodyEvent(); retype(); t.addCustodyEvent();
    const two = t.__ref().custodyLog;
    eq(two.length, 2, 'two identical handovers are two events');
    ok(two[0].cid !== two[1].cid, '⚠ and their ids differ, so the merge cannot collapse them');
    eq(t.mergeCustodyLogs(two, two).length, 2,
       'driven through the real union: merging the log with itself changes nothing');

    // A blank party is refused — a custody event with no party names nobody.
    const u = ctx([], { 'cust-party': '  ' });
    u.addCustodyEvent();
    eq((u.__ref().custodyLog || []).length, 0, 'a blank party records nothing');
    has(u.__state.alerted, 'party', 'and says why');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ REMOVAL TOMBSTONES, IT DOES NOT SPLICE — and keys on the id, not the index');
  {
    const log = [
      { cid: 'e1', action: 'Moved to storage', party: 'Havellin store', date: '2026-09-08' },
      { cid: 'e2', action: 'Released', party: "Sotheby's", date: '2026-09-10' },
    ];
    const s = ctx(log);
    s.removeCustodyEvent(s._custodyHandle(log[0]));
    const after = s.__ref().custodyLog;
    eq(after.length, 2,
       '⚠ the row is still there. A spliced event is simply re-added by the next merge from a '
       + 'device that still holds it — the same reason item removal writes deletedAt');
    ok(after[0].deletedAt, 'it is marked removed');
    ok(!after[1].deletedAt, 'and the other event is untouched');
    eq(s.custodyEvents(s.__ref()).map((e) => e.cid), ['e2'],
       'so a reader sees only the live one');

    // ⚠ An index would point at whatever moved into that slot: the merge reorders the array.
    lacks(noComments(fn('removeCustodyEvent')), '.splice(',
          'removal never splices the log');
    has(noComments(fn('removeCustodyEvent')), '_custodyEventId(e) === cid',
        'and resolves the event by its identity');
    has(noComments(fn('_renderCustodyList')), '_custodyHandle(e)',
        'the list hands out that identity rather than a row number');

    // Removing something already removed, or something that is not there, is a no-op.
    const before = JSON.stringify(s.__ref().custodyLog);
    s.removeCustodyEvent(s._custodyHandle(log[0]));
    s.removeCustodyEvent(s._custodyHandle({ cid: 'nope' }));
    eq(JSON.stringify(s.__ref().custodyLog), before, 'neither re-stamps anything');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ WHAT A READER SEES IS ORDERED BY WHEN IT HAPPENED, not by which device synced last');
  {
    const s = ctx([]);
    const out = s.custodyEvents({ custodyLog: [
      { cid: 'c', action: 'Released', date: '2026-09-10', at: 10 },
      { cid: 'a', action: 'Collected', date: '2026-09-02', at: 90 },
      { cid: 'b', action: 'Moved', date: '2026-09-08', at: 50 },
    ] });
    eq(out.map((e) => e.cid), ['a', 'b', 'c'],
       '⚠ chronological. A union interleaves two devices’ events by arrival, which on a chain '
       + 'of custody reads as the object moving backwards in time');
    eq(s.custodyEvents({ custodyLog: [
      { cid: 'y', date: '2026-09-08', at: 200 },
      { cid: 'x', date: '2026-09-08', at: 100 },
    ] }).map((e) => e.cid), ['x', 'y'], 'same-day events fall back to when they were recorded');
    eq(s.custodyEvents({ custodyLog: [{ cid: 'z', deletedAt: 1 }] }).length, 0,
       'and a removed event is not shown');
    eq(s.custodyEvents(null).length, 0, 'no item is no events, not a throw');

    // ⚠ IT DOES NOT MUTATE THE STORED LOG. The sort is a reading order, and reordering the
    // record itself would make every device's array differ from every other device's.
    const ref = { custodyLog: [{ cid: 'c', date: '2026-09-10' }, { cid: 'a', date: '2026-09-02' }] };
    s.custodyEvents(ref);
    eq(ref.custodyLog.map((e) => e.cid), ['c', 'a'], 'the stored order is untouched');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE COUNT BADGE AND THE LIST BOTH READ custodyEvents — a tombstone is not an event');
  {
    const s = ctx([{ cid: 'e1', action: 'Released', party: 'X', date: '2026-09-10' },
                   { cid: 'e2', action: 'Moved', party: 'Y', date: '2026-09-08', deletedAt: 9 }]);
    s._renderCustodyList();
    const html = s.__el['custody-list'].innerHTML;
    has(html, 'Released', 'the live event renders');
    lacks(html, 'Moved', '⚠ and the removed one does not');
    has(html, "removeCustodyEvent('" + s._custodyHandle({ cid: 'e1' }) + "')",
        'with its own identity on the remove control, not its position');

    // ⚠ THE HANDLE IS ATTRIBUTE-SAFE AND ROUND-TRIPS. A legacy event has no cid, so its
    // identity is a value key built from FREE TEXT joined on a NUL — an apostrophe in a party
    // name would otherwise break out of the JS string inside the onclick.
    const ohara = { action: 'Released', party: "O'Hara & Sons", date: '2026-09-10' };
    eq(s._custodyUnhandle(s._custodyHandle(ohara)), s._custodyEventId(ohara),
       'a legacy event with an apostrophe and an ampersand round-trips exactly');
    ok(/^[A-Za-z0-9+/=]*$/.test(s._custodyHandle(ohara)),
       'and the handle itself carries nothing an HTML attribute or a JS string can choke on');
    const legacy = ctx([ohara]);
    legacy._renderCustodyList();
    const lh = legacy.__el['custody-list'].innerHTML;
    lacks(lh, "removeCustodyEvent('v:", 'the raw value key never reaches the markup');
    legacy.removeCustodyEvent(s._custodyHandle(ohara));
    ok(legacy.__ref().custodyLog[0].deletedAt,
       '⚠ and removing it still works — driven end to end through the rendered handle');

    // The per-item link badge counts the same thing the modal lists.
    has(noComments(src), 'var nC = custodyEvents(ref).length;',
        '⚠ the count badge excludes tombstones — a badge reading 2 over a modal showing 1 is '
        + 'two opinions of one fact');
    // ⚠ THERE ARE TWO COUNT SITES — the row link and the expanded item panel — and the first
    // pass fixed one. The test found the other, which is the whole reason it asserts the
    // ABSENCE of the raw read across the file rather than the presence of the fixed one.
    lacks(noComments(src), 'var nC = (ref.custodyLog || []).length;',
          'no raw-length read survives anywhere');
    // RESTATED P22: the old table's site (`_invCell`'s `seq` branch) was unreachable and is deleted; the panel's is the one.
    eq((noComments(src).match(/var nC = custodyEvents\(ref\)\.length;/g) || []).length, 1,
       'the count site reads the live list');

    const empty = ctx([]);
    empty._renderCustodyList();
    has(empty.__el['custody-list'].innerHTML, 'No custody events logged yet',
        'an empty log says so');
    const allVoid = ctx([{ cid: 'e1', action: 'Released', deletedAt: 1 }]);
    allVoid._renderCustodyList();
    has(allVoid.__el['custody-list'].innerHTML, 'No custody events logged yet',
        'and so does one whose only event was removed');
  }

  group('⚠ EMPTYING A STICKY FIELD IS STAMPED, so the merge can tell it from never having one');
  {
    const m = sandbox({
      fns: ['_invEdit', '_getPhotoRef', '_setPhotoRef', 'savePhotoRefs', '_warnPhotoStoreFull',
            '_invTouch', 'moneyToNumber', '_invHasVal', 'invStickyValue',
            // P22: the Authorized By box saves the stored form (invApprovalBoxToStored), asked of the job.
            'invApprovalBoxToStored', 'invApprovalBoxText', 'invApprovalSigners', 'invApprovalSignedText', 'invRecipientName',
            '_invReadableDay', '_invJob'],
      vars: ['INV_STICKY_FIELDS'],
      stubs: { jobs: [], fmtDate2: (d) => String(d || ''), _invRefreshSummary() {}, _invRefreshGuardrail() {}, _invRefreshFlagStrip() {}, _invRefreshRecords() {}, _scheduleInventorySync() {},
               _invNetDisplay: () => '', renderInventoryTab() {} },
    });
    m._photoRefs[3] = [{ stableId: 'a', label: 'inventory', collId: null }];
    const ref = () => m._photoRefs[3][0];

    m._invEdit(3, 'a', 'authBy', { value: 'Tripp Butler' });
    eq(ref().authBy, 'Tripp Butler', 'recording an approver writes it');
    ok(!(ref().clearedAt && ref().clearedAt.authBy), 'and stamps nothing');

    m._invEdit(3, 'a', 'authBy', { value: '' });
    eq(ref().authBy, '', 'emptying it empties it');
    ok(ref().clearedAt.authBy > 0,
       '⚠⚠ and stamps WHY it is empty — without this the field could never be cleared across '
       + 'two devices: the stale copy would restore it on every sync, forever');

    m._invEdit(3, 'a', 'authBy', { value: 'Ashley Jerome' });
    ok(!ref().clearedAt.authBy,
       '⚠ and filling it again withdraws the stamp, or a later clear-by-accident would stick');

    // A field that is not sticky is not stamped — the map is not a general edit log.
    m._invEdit(3, 'a', 'condition', { value: '' });
    ok(!(ref().clearedAt && ref().clearedAt.condition), 'an ordinary field records nothing');

    // ⚠ AND THE STAMP HAS TO SURVIVE A SAVE. savePhotoRefs is a WHITELIST — a field missing
    // from it is dropped silently on every write, which would leave the clear unexplained and
    // the value restored on the next merge.
    m._invEdit(3, 'a', 'authBy', { value: '' });
    m.savePhotoRefs(3);
    const saved = JSON.parse(m.localStorage.getItem('hav_media_3'))[0];
    ok(saved.clearedAt && saved.clearedAt.authBy > 0, 'clearedAt is on the whitelist');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ WHO RECORDED IT (2026-10-12): the event carries the device\'s user, else the job\'s concierge, and the readers print it');
  {
    // The party, the date, the method and the receipt said what left and to whom; nothing said who at Havellin
    // logged it, so the package's *Release Approvals and Chain of Custody* record could not name the releasing
    // person to a trust officer. Found building Q59; Anthony, 2026-10-12: build it now.
    const d = ctx([]);
    d.localStorage.setItem('hav_device_user', 'Anthony Graziano');
    d.addCustodyEvent();
    eq(d.__ref().custodyLog[0].by, 'Anthony Graziano',
       '⚠⚠ the event names the device\'s user, as every desk stamp does (_invStampBy), not the job\'s concierge');
    const c = ctx([]);
    c.addCustodyEvent();
    eq(c.__ref().custodyLog[0].by, 'Ashley Jerome', 'with no device user set, the job\'s concierge');
    const n = ctx([]);
    n.jobs[0].tc = '';
    n.addCustodyEvent();
    eq(n.__ref().custodyLog[0].by, '', 'nobody on the device and no concierge records nobody, never a guess');
    ok(n.__ref().custodyLog[0].cid, 'and the event is still recorded');

    // The dialog's list says who, and says nothing on an event with nobody.
    const l = ctx([{ cid: 'e1', action: 'Released', party: "Sotheby's", date: '2026-09-10', by: 'Ashley Jerome' },
                   { cid: 'e0', action: 'Received', party: 'Storage', date: '2026-09-01' }]);
    l._renderCustodyList();
    const lh = l.__el['custody-list'].innerHTML;
    has(lh, 'recorded by Ashley Jerome', 'the list prints who recorded the event');
    eq((lh.match(/recorded by/g) || []).length, 1, 'and nothing on the event that carries nobody');
    const x = ctx([{ cid: 'e2', action: 'Released', party: 'X', date: '2026-09-10', by: '<b>Ash</b>' }]);
    x._renderCustodyList();
    has(x.__el['custody-list'].innerHTML, 'recorded by &lt;b&gt;Ash&lt;/b&gt;', 'escaped: the name is text');

    // The pickup list's Released event (pickupRecordCustody) stamps the same rule: read as source here, driven in
    // p22-group-e (E7), where the whole filing runs.
    const live = codeOnly(SRC);
    const writers = (live.match(/custodyLog\.push\(\{[\s\S]{0,600}?\}\);/g) || []);
    eq(writers.length, 2, 'fixture: two custody writers in the file (the dialog and the pickup list)');
    writers.forEach((w) => has(w, 'by: _invStampBy(', '⚠ each custody writer stamps who through _invStampBy'));
    lacks(codeOnly(fn('addCustodyEvent')), 'job.tc', 'the dialog never reads the concierge on its own');
    lacks(codeOnly(fn('pickupRecordCustody')), 'job.tc', 'nor does the pickup list');

    // The package's record: a *Recorded by* column, the name on the event, a dash on an event with nobody.
    const job = { id: 7, hvlId: 'HVL-0007', name: 'Estate of Harold Adler', fname: 'Harold', lname: 'Adler', svc: 'probate', matterType: 'probate',
      probateCase: '50-2026-CP-004412', executor: 'Ruth Adler', executorRole: 'Personal Representative', deathDate: '2026-04-02',
      won: true, status: 'active', tc: 'Ashley Jerome', updatedAt: 1, signedRecords: [], at: {} };
    const lines = [{ stableId: 'a', itemNo: 1, label: 'inventory', collId: null, objectName: 'Sargent portrait', disposition: 'Auction', ts: 1, updatedAt: 1,
      custodyLog: [{ cid: 'e1', action: 'Released', party: "Sotheby's", date: '2026-09-10', method: 'Collected on site', receipt: 'SBY-4471', by: 'Ashley Jerome' },
                   { cid: 'e0', action: 'Received', party: 'Havellin storage', date: '2026-09-01', method: 'Hand-carry', receipt: '' }] }];
    const R = lift(['probatePackageRecordHtml'], { jobs: [job], _photoRefs: { 7: lines }, estimateStore: {}, contractors: [], vendorDirectory: [],
      jobPlanStore: {}, changeOrders: [], savePhotoRefs() {}, _scheduleInventorySync() {} });
    let rec = '';
    try { rec = text(R.probatePackageRecordHtml(7)); } catch (e) { rec = 'threw: ' + e.message; }
    has(rec, 'Receipt / reference Recorded by', '⚠⚠ the record\'s custody table has a Recorded by column, after the receipt');
    has(rec, 'Sep 10, 2026 Released Sotheby\'s Collected on site SBY-4471 Ashley Jerome', '⚠⚠ and each event names who at Havellin recorded it' + (rec.indexOf('SBY-4471') < 0 ? ' [' + rec.slice(0, 400) + ']' : ''));
    has(rec, 'Sep 1, 2026 Received Havellin storage Hand-carry —', 'an event with nobody recorded prints a dash, never a name the app did not witness');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('one rule, stated once');
  {
    // ⚠ THE SAME UNION EXISTS TWICE, in havellin.html and saveInventory.gs, and
    // media-merge.test.js drives both and asserts they agree. What is asserted HERE is that
    // the app's merge actually calls it — a union written beside a merge that does not read
    // it is the shape this project records more often than any other.
    has(noComments(fn('mergeMediaItems')), 'mergeCustodyLogs(win.custodyLog, lose.custodyLog)',
        'the item merge unions the logs rather than taking the winner’s');
    lacks(noComments(fn('mergeMediaItems')), 'if (a >= b) byId[it.stableId] = it;',
          '⚠ the whole-record-wins line IS the defect — it must not survive');
    has(noComments(fn('_renderCustodyList')), 'custodyEvents(ref)', 'the modal reads the live list');
    has(noComments(fn('addCustodyEvent')), '_photoUid()',
        'and a new event is given the same kind of id the photo refs use');
  }
};
