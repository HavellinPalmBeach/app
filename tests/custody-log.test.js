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

const { sandbox, source, fn } = require('./harness');

const VARS = ['_photoUidSeq'];
const FNS = ['addCustodyEvent', 'removeCustodyEvent', 'custodyEvents', '_renderCustodyList',
             '_custodyEventId', 'mergeCustodyLogs', '_getPhotoRef', '_setPhotoRef',
             '_invTouch', '_photoUid', 'esc', 'fmtDate2', '_custodyHandle', '_custodyUnhandle'];

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
    eq((noComments(src).match(/var nC = custodyEvents\(ref\)\.length;/g) || []).length, 2,
       'both count sites read the live list');

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
            '_invTouch', 'moneyToNumber', '_invHasVal', 'invStickyValue'],
      vars: ['INV_STICKY_FIELDS'],
      stubs: { _invRefreshSummary() {}, _invRefreshGuardrail() {}, _scheduleInventorySync() {},
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
