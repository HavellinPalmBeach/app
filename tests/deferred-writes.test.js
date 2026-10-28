'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// What the cell-cap probe found (2026-10-28): Sheets holds a write until it is applied (DEFERRED), and backend 2026-10-28's
// answer to it. probeClearThenOversizeWrite, run by Anthony in the editor that day: a setValues holding a cell over 50,000
// characters did not throw at the call; the flush did ("Your input contains more than the maximum of 50000 characters in a
// single cell."); the clearContent before it stayed; the batch was applied in order up to the refused cell. A nine-agent audit
// checked every sheet write against that; its verified fix plan is what this file holds to the code:
//   S1 · every locked writer applies its writes before it lets go of the lock (SpreadsheetApp.flush()): _writeStoreBlob's end
//        (every store save), saveJobToSheet, saveAllJobsToSheet and the editor's reset. Without it the next save waiting on the
//        lock read the old state and wrote over the first, both devices told "saved"; and a write that failed as it was applied
//        did so after doPost had answered ok.
//   S2 · _writeStoreBlob never cuts so that a chunk starts with = + - @ or ' or a surrogate pair is split: setValues reads a cell
//        as typed, so a chunk starting with = became a formula and the store unreadable, and a leading ' was dropped.
//   S3 · deleteJobFromSheet runs under the lock, records the deletion first with no catch (a ledger that will not write answers
//        ok:false, the row left in place), finds the row again under the lock, and flushes.
//   S5 · suggestDeviceKey's log gives the order the manual does: devices first, Script Properties last.
// Driven on the WHOLE of main-sync.gs and saveInventory.gs over tests/sheet-rig.js's deferred model (variant D: a write is
// applied at a flush, a read or the end of the request; srv.onRelease runs another request inside releaseLock, where Google's
// Lock reference puts the flush).
// ─────────────────────────────────────────────────────────────────────────────
const { server, CELL_MAX } = require('./sheet-rig');

const NOW = 1790000000000;
const J = NOW - 3 * 86400000, K = NOW - 2 * 86400000, L = NOW - 86400000;
const job = (id, name, o) => Object.assign({ id, hvlId: 'HVL-' + String(id).slice(-4), name, svc: 'probate', status: 'active',
  created: new Date(id).toISOString(), updatedAt: id + 1000, notes: '', payments: [{ uid: 'p' + id, stage: 'deposit', amount: 5000 }] }, o || {});
// A sheet as two devices saving normally leave it: the ledger born a month before the clients, three clients on the Jobs tab.
function seeded(variant, opt) {
  const srv = server(variant || 'D', null, opt);
  srv._writeStoreBlob('JobLedger', { since: NOW - 30 * 86400000, seen: {}, restore: {} });
  const r = srv.post({ type: 'saveAllJobs', payload: [job(J, 'Ellison Estate'), job(K, 'Ashworth Estate'), job(L, 'Hale Home')] });
  if (!r.ok) throw new Error('fixture: the seed did not land: ' + r.error);
  return srv;
}
const recOf = (srv, id) => { try { return JSON.parse((srv.rowOf(id) || [])[11] || 'null'); } catch (e) { return null; } };
const line = (jobId, k, o) => Object.assign({ stableId: 'L' + jobId + '_' + k, label: 'inventory', ts: NOW + k, updatedAt: NOW + k, itemNo: k + 1,
  objectName: 'Line ' + k + ' of ' + jobId, driveFileUrl: 'https://drive.google.com/file/d/f' + jobId + k + '/view?usp=drivesdk' }, o || {});
const itemsOf = (srv, id) => { const s = srv.store('MediaStore'); return s && s !== 'UNREADABLE' && s[String(id)] ? s[String(id)].items.map((x) => x.stableId) : s; };

module.exports = function ({ group, ok, eq, has, lacks }) {
  // A failure in one group must not leave the rest unrun (a revert fails its assertions, never the file).
  const guard = (name, body) => { group(name); try { body(); } catch (e) { ok(false, name + ' threw: ' + (e && e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); } };

  // ───────────────────────────────────────────────────────────────────────────
  guard('the rig: a deferred write is applied at a flush, a read or the end of the request, never at the call (the probe, 2026-10-28)', () => {
    const srv = server('D');
    ok(srv.deferred && srv.variant === 'D', 'fixture: variant D is the default');
    const big = new Array(CELL_MAX + 2).join('x');
    // An execution writes a long cell after a short one: nothing throws at the call; the end of the request raises it.
    srv.run(() => {
      const sh = srv.SpreadsheetApp.openById().insertSheet('T');
      sh.getRange(1, 1, 3, 1).setValues([['a'], [big], ['c']]);
      eq(sh._rows.length, 0, 'nothing is on the sheet at the call');
    });
    eq(srv.sheets.T._rows.map((r) => String(r[0] === undefined ? '' : r[0]).length), [1, 0], '⚠ applied in order up to the refused cell: it and the row after it are not written');
    has(String(srv.lateErr), 'maximum of 50000 characters in a single cell', 'and the error is raised when the request ends');
    const d = server('DE');
    d.run(() => { const sh = d.SpreadsheetApp.openById().insertSheet('T'); sh.getRange(1, 1, 1, 2).setValues([['old', 'old']]); d.SpreadsheetApp.flush(); sh.getRange(1, 1, 1, 2).setValues([['new', big]]); });
    eq(d.sheets.T._rows[0], ['new', ''], 'DE empties the refused cell');
    const k = server('D');
    k.run(() => { const sh = k.SpreadsheetApp.openById().insertSheet('T'); sh.getRange(1, 1, 1, 2).setValues([['old', 'old']]); k.SpreadsheetApp.flush(); sh.getRange(1, 1, 1, 2).setValues([['new', big]]); });
    eq(k.sheets.T._rows[0], ['new', 'old'], 'D leaves it as it was');
    // A read flushes (the default); with reads 'none' it sees only what is committed.
    const r = server('D', null, { reads: 'none' });
    let seen = -1;
    r.run(() => { const sh = r.SpreadsheetApp.openById().insertSheet('T'); sh.appendRow(['x']); seen = sh.getLastRow(); });
    eq([seen, r.sheets.T.getLastRow()], [0, 1], 'reads "none": the read saw nothing, and the end of the request applied the row');
    const f = server('D');
    f.run(() => { const sh = f.SpreadsheetApp.openById().insertSheet('T'); sh.appendRow(['x']); seen = sh.getLastRow(); });
    eq(seen, 1, 'a read applies the execution\'s own writes first');
    // Another execution never sees a queue not yet applied.
    const o = server('D');
    let other = -1;
    o.run(() => {
      const sh = o.SpreadsheetApp.openById().insertSheet('T');
      sh.appendRow(['x']);
      o.onRelease(() => { other = o.run(() => o.sheets.T.getLastRow()); });
      o.LockService.getScriptLock().releaseLock();
    });
    eq(other, 0, 'a request run inside releaseLock reads the sheet without the first one\'s unapplied writes');
    eq(o.locks, 0, 'fixture: no lock was taken');
  });

  // ───────────────────────────────────────────────────────────────────────────
  guard('⚠⚠ S1a · two inventory saves at once: both clients\' lines end up on the sheet (_writeStoreBlob flushes before the lock goes)', () => {
    const srv = seeded('D');
    srv.post({ type: 'saveMedia', payload: { jobId: J, savedAt: 1, items: [line(J, 0)] } });
    srv.post({ type: 'saveMedia', payload: { jobId: K, savedAt: 1, items: [line(K, 0)] } });
    eq([itemsOf(srv, J), itemsOf(srv, K)], [['L' + J + '_0'], ['L' + K + '_0']], 'fixture: two clients\' inventories on the sheet');
    // The field iPad saves J; the desk laptop's save of K was waiting on the lock and gets it as the iPad lets go.
    let r2 = null;
    srv.onRelease(() => { r2 = srv.post({ type: 'saveMedia', payload: { jobId: K, savedAt: 2, items: [line(K, 0), line(K, 1)] } }); });
    const r1 = srv.post({ type: 'saveMedia', payload: { jobId: J, savedAt: 2, items: [line(J, 0), line(J, 1)] } });
    eq([r1.ok, r2 && r2.ok], [true, true], 'fixture: both devices were told saved');
    eq(itemsOf(srv, J), ['L' + J + '_0', 'L' + J + '_1'], 'the iPad\'s new line is on the sheet');
    eq(itemsOf(srv, K), ['L' + K + '_0', 'L' + K + '_1'], '⚠⚠ and so is the laptop\'s (the iPad\'s late write landed over it)');
    eq(srv.lateErrs, [], 'and nothing was left to apply after either answer');
  });

  // ───────────────────────────────────────────────────────────────────────────
  guard('⚠⚠ S1a · a store write that fails as it is applied answers ok:false, never ok', () => {
    const srv = seeded('D');
    srv.post({ type: 'saveAllEstimates', payload: { [J]: { savedAt: 1, estimate: { jobId: J } } } });
    let once = true;
    srv.failNext = (n) => { if (n === 'EstimateStore' && once) { once = false; return true; } return false; };
    const r = srv.post({ type: 'saveAllEstimates', payload: { [K]: { savedAt: 2, estimate: { jobId: K } } } });
    eq(r.ok, false, '⚠⚠ the save says it failed (it answered ok, and the app recorded a write that never landed)');
    has(String(r.error), 'timed out', 'with what went wrong');
    eq(srv.keys('EstimateStore'), [String(J)], 'and the store is as it was');
    eq(srv.post({ type: 'saveAllEstimates', payload: { [K]: { savedAt: 2, estimate: { jobId: K } } } }).ok, true, 'the app\'s retry lands');
    eq(srv.keys('EstimateStore').sort(), [J, K].map(String).sort(), 'both estimates on the sheet');
  });

  // ───────────────────────────────────────────────────────────────────────────
  guard('⚠⚠ S1b · a client\'s own edit and another device\'s save of the list at once: both changes are kept (saveJobToSheet flushes)', () => {
    const srv = seeded('D');
    // The desk adds a note to Ellison (its own write); the iPad's list carries Ellison with a cheque it recorded, from its older copy.
    const note = job(J, 'Ellison Estate', { notes: 'called the attorney', updatedAt: NOW + 5000 });
    const iPad = job(J, 'Ellison Estate', { updatedAt: NOW + 2000, payments: [{ uid: 'p' + J, stage: 'deposit', amount: 5000 }, { uid: 'chq1', stage: 'midpoint', amount: 2500 }] });
    let rAll = null;
    srv.onRelease(() => { rAll = srv.post({ type: 'saveAllJobs', payload: [iPad, job(K, 'Ashworth Estate'), job(L, 'Hale Home')] }); });
    const rOne = srv.post({ type: 'job', payload: note });
    eq([rOne.ok, rAll && rAll.ok], [true, true], 'fixture: both were told saved');
    const rec = recOf(srv, J) || {};
    eq(rec.notes, 'called the attorney', 'the note is on the sheet');
    eq((rec.payments || []).map((p) => p.uid).sort(), ['chq1', 'p' + J].sort(), '⚠⚠ and so is the cheque (the note\'s late write landed over it)');
    eq(srv.jobIds().length, 3, 'every client still on the tab');
  });

  // ───────────────────────────────────────────────────────────────────────────
  guard('⚠⚠ S1c · a stale device\'s save of the list and a client\'s own edit at once: the edit is kept (saveAllJobsToSheet flushes)', () => {
    const srv = seeded('D');
    // A device holding Ashworth as it was saves the list; the desk's rename of Ashworth was waiting on the lock.
    const stale = [job(J, 'Ellison Estate'), job(K, 'Ashworth Estate'), job(L, 'Hale Home')];
    const edit = job(K, 'Ashworth Estate', { notes: 'keys handed to the realtor', updatedAt: NOW + 9000 });
    let rOne = null;
    srv.onRelease(() => { rOne = srv.post({ type: 'job', payload: edit }); });
    const rAll = srv.post({ type: 'saveAllJobs', payload: stale });
    eq([rAll.ok, rOne && rOne.ok], [true, true], 'fixture: both were told saved');
    eq((recOf(srv, K) || {}).notes, 'keys handed to the realtor', '⚠⚠ the edit is on the sheet (the stale list\'s late write landed over it)');
    eq(srv.jobIds().length, 3, 'every client still on the tab');
  });

  // ───────────────────────────────────────────────────────────────────────────
  guard('S1d · the editor\'s reset: a save waiting on the lock reads the tab as the reset left it', () => {
    const srv = seeded('D');
    // No store tab on this sheet, so nothing after the rows' deletion flushes but the reset's own last statement.
    eq(Object.keys(srv.sheets).sort(), ['JobLedger', 'Jobs'], 'fixture: the Jobs tab and the ledger only');
    let r = null;
    srv.onRelease(() => { r = srv.post({ type: 'saveAllJobs', payload: [job(J, 'Ellison Estate'), job(K, 'Ashworth Estate'), job(L, 'Hale Home')] }); });
    srv.run(() => srv.resetAllJobDataConfirm());
    eq(srv.jobsRows(), 0, 'the reset emptied the tab');
    eq(((r && r.dropped) || []).map(String).sort(), [J, K, L].map(String).sort(), '⚠ a stale device saving the moment the reset let go is refused every client (it was told they were saved)');
    eq(((r && r.recorded) || []).length, 3, 'each refusal a recorded deletion, which the device applies');
  });

  // ───────────────────────────────────────────────────────────────────────────
  guard('⚠⚠ S2 · a store cut across cells never starts a cell with = or \', and never splits a surrogate pair (setValues reads a cell as typed)', () => {
    // A MediaStore whose JSON has the = of a photograph's ?usp= at offset 45,000: under opt.typed a chunk starting there would be a
    // formula and read back #ERROR!, the store STORE_UNREADABLE and every inventory save refused.
    const srv = seeded('D', { typed: true });
    const store = (pad) => ({ [J]: { savedAt: 1, items: [{ stableId: 'a', label: 'inventory', note: 'n'.repeat(pad), driveFileUrl: 'https://drive.google.com/file/d/abc/view?usp=drivesdk' }] } });
    let pad = 44000;
    const at = (o) => JSON.stringify(o).indexOf('usp=') + 3;
    pad += 45000 - at(store(pad));
    const s1 = store(pad);
    eq(JSON.stringify(s1).charAt(45000), '=', 'fixture: the store\'s JSON has its = at offset 45,000');
    srv._writeStoreBlob('MediaStore', s1);
    eq(srv.store('MediaStore'), s1, '⚠⚠ it reads back whole (it read back as STORE_UNREADABLE)');
    const r = srv.post({ type: 'saveMedia', payload: { jobId: K, savedAt: 2, items: [line(K, 0)] } });
    eq(r.ok, true, '⚠⚠ and the next inventory save lands (every one was refused until the tab was restored)');
    eq(itemsOf(srv, J), ['a'], 'the first client\'s line is still there');
    // A leading ' is the text prefix: dropped, a character gone from another client's text.
    const q = (pad2) => ({ [J]: { savedAt: 1, items: [{ stableId: 'b', note: 'n'.repeat(pad2) + "O'Brien" }] } });
    let p2 = 44000; p2 += 45000 - JSON.stringify(q(p2)).indexOf("'");
    eq(JSON.stringify(q(p2)).charAt(45000), "'", 'fixture: an apostrophe at offset 45,000');
    srv._writeStoreBlob('Probe', q(p2));
    eq(srv.store('Probe'), q(p2), '⚠ it reads back with its apostrophe (O\'Brien read back OBrien)');
    // An emoji typed in a note, its two halves either side of offset 45,000.
    const emoji = String.fromCharCode(0xD83D, 0xDE00);
    const e = (pad3) => ({ [J]: { savedAt: 1, items: [{ stableId: 'c', note: 'n'.repeat(pad3) + emoji + ' a happy client' }] } });
    let p3 = 44000; p3 += 44999 - JSON.stringify(e(p3)).indexOf(emoji);
    eq(JSON.stringify(e(p3)).charCodeAt(44999), 0xD83D, 'fixture: an emoji\'s first half at offset 44,999, its second at 45,000');
    srv._writeStoreBlob('Probe', e(p3));
    eq(srv.store('Probe'), e(p3), '⚠ it reads back whole (two broken halves before)');
  });

  guard('S2 · every chunk written raw: at most 45,000, none starting with = + - @ or \', none ending on a high surrogate, joined they are the JSON', () => {
    const srv = server('D');
    const emoji = String.fromCharCode(0xD83D, 0xDE00);
    const parts = ['a=b', '+c', '-d', '@e', "f'g", emoji, 'hij', '=', "'", '-', emoji + emoji];
    let note = '';
    for (let i = 0; note.length < 400000; i++) note += parts[i % parts.length];
    const obj = { notes: note };
    const json = JSON.stringify(obj);
    srv._writeStoreBlob('Probe', obj);
    const cells = srv.sheets.Probe._rows.slice(1).map((r) => String(r[1] || '')).filter(Boolean);
    ok(cells.length >= 9, 'fixture: the blob runs over ' + cells.length + ' chunks');
    eq(cells.join(''), json, 'joined, the chunks are the JSON (the reader is unchanged)');
    eq(cells.filter((c) => c.length > 45000).length, 0, 'none is over 45,000 characters');
    eq(cells.filter((c) => /^[=+\-@']/.test(c)).map((c) => c.charAt(0)), [], '⚠⚠ none starts with = + - @ or \'');
    eq(cells.filter((c) => { const h = c.charCodeAt(c.length - 1); return h >= 0xD800 && h <= 0xDBFF; }).length, 0, '⚠⚠ none ends on the first half of a surrogate pair');
    ok(cells.slice(0, -1).every((c) => c.length >= 44990), 'and each cut moved back only a few characters');
    eq(srv.store('Probe'), obj, 'it reads back whole');
    // A run of 20,000 = signs across the cut: the walk stops 5,000 back and cuts there (no real store holds one).
    const run = { x: 'y'.repeat(30000) + '='.repeat(20000) + 'z'.repeat(20000) };
    srv._writeStoreBlob('Run', run);
    const rc = srv.sheets.Run._rows.slice(1).map((r) => String(r[1] || '')).filter(Boolean);
    eq(rc[0].length, 40000, 'the walk is bounded at 5,000: the cut is made where it stopped');
    eq(srv.store('Run'), run, 'and the blob still reads back whole');
  });

  // ───────────────────────────────────────────────────────────────────────────
  guard('⚠⚠ S3 · deleteJob takes the lock, and a ledger that will not write leaves the row in place and says so', () => {
    const srv = seeded('D');
    srv.post({ type: 'saveAllEstimates', payload: { [L]: { savedAt: 1, estimate: { jobId: L } } } });
    const locks = srv.locks;
    let once = true;
    srv.failNext = (n) => { if (n === 'JobLedger' && once) { once = false; return true; } return false; };
    const r = srv.post({ type: 'deleteJob', payload: { id: L } });
    ok(srv.locks > locks, '⚠⚠ the delete took the script lock (it took none)');
    eq(r.ok, false, '⚠⚠ the ledger would not write: the delete says it failed (it answered ok)');
    eq(srv.jobIds().indexOf(String(L)) >= 0, true, '⚠⚠ and the client\'s row is still on the tab (it was gone, its deletion unrecorded)');
    ok(!((srv.ledger().deleted || {})[String(L)]), 'nothing recorded');
    eq(srv.keys('EstimateStore'), [String(L)], 'and its records are where they were');
    // The app sends it again (it is idempotent): now it lands.
    const r2 = srv.post({ type: 'deleteJob', payload: { id: L } });
    eq(r2.ok, true, 'the retry lands');
    eq(srv.jobIds().sort(), [J, K].map(String).sort(), 'the row is gone');
    ok(!!(srv.ledger().deleted || {})[String(L)], 'the deletion recorded');
    eq(srv.keys('EstimateStore'), [], 'and its records purged');
    eq(srv.lateErrs, [], 'nothing applied after an answer');
    // Under the lock, a save waiting on it reads the tab without the deleted row.
    const s2 = seeded('D');
    let w = null;
    s2.onRelease(() => { w = s2.post({ type: 'saveAllJobs', payload: [job(J, 'Ellison Estate'), job(K, 'Ashworth Estate'), job(L, 'Hale Home')] }); });
    eq(s2.post({ type: 'deleteJob', payload: { id: K } }).ok, true, 'fixture: a client deleted');
    eq([(w && w.dropped) || [], (w && w.recorded) || []].map((x) => x.map(String)), [[String(K)], [String(K)]], '⚠ a stale device saving the moment the delete let go is refused it, the deletion recorded');
    eq(s2.jobIds().sort(), [J, L].map(String).sort(), 'and the row stays gone');
  });

  // ───────────────────────────────────────────────────────────────────────────
  guard('S5 · suggestDeviceKey says to type the key on every device first and to set Script Properties last', () => {
    const srv = server('D');
    srv.Utilities = { computeDigest: () => Array.from({ length: 32 }, (_, i) => i * 7), getUuid: () => 'u', DigestAlgorithm: { SHA_256: 'sha' } };
    srv.run(() => srv.suggestDeviceKey());
    const how = srv.log.filter((l) => /^To use it:/.test(l))[0] || '';
    const dev = how.indexOf('every device'), props = how.indexOf('Script Properties');
    ok(dev > 0 && props > dev, '⚠ the devices come before Script Properties (' + how.slice(0, 90) + '…)');
    has(how, 'last, Project Settings, Script Properties, HAVELLIN_DEVICE_KEY = the key, which switches the check on', 'and Script Properties is the last step, the one that switches it on');
    lacks(how, 'the same day', 'and never the reverse order it gave before');
  });

  // ───────────────────────────────────────────────────────────────────────────
  guard('every locked writer flushes before its lock goes, and the deployment says 2026-10-28', () => {
    const { GS } = require('./sheet-rig');
    const body = (name) => { const i = GS.indexOf('\nfunction ' + name + '('); if (i < 0) return ''; const j = GS.indexOf('\n}\n', i); return GS.slice(i, j + 2); };
    ['_writeStoreBlob', 'saveAllJobsToSheet', 'saveJobToSheet', 'resetAllJobDataConfirm', 'deleteJobFromSheet'].forEach((f) => {
      const b = body(f);
      ok(b.length > 200, 'fixture: ' + f + ' read (' + b.length + ')');
      const code = b.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
      const flush = code.lastIndexOf('SpreadsheetApp.flush();'), release = code.indexOf('releaseLock');
      ok(flush > 0 && (release < 0 || flush < code.lastIndexOf('finally')), f + ' flushes, inside its try');
    });
    eq((GS.match(/var BACKEND_VERSION = '([^']+)';/) || [])[1], '2026-10-28', 'BACKEND_VERSION is 2026-10-28');
  });
};
