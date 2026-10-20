'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// ONE CLIENT'S INVENTORY RESET (2026-10-19). Anthony, the first Ellison run: the drawers were photographed as hundreds
// of lines, so he deleted the rows in the client's Drive workbook and the Estate Inventory photographs — and the desk
// still showed every line, Agent Two's 25 notices included. Neither is the record: the record is the job's MediaStore
// entry, cached on every device and merged as a union, so lines taken off by hand come back from the first device
// that saves. The build: an editor-only pair in main-sync.gs (`previewResetInventory` / `resetInventoryConfirm`) takes
// the Items pass off ONE job's entry and stamps it `invResetAt`; one predicate (`_invResetDrops` on the server,
// `invResetDrops` in the app, held equal here) says which copy of a line is from before the reset; saveMediaStore reads
// it on every later save and refreshPhotoRefs when the entry comes back, so a device still holding the old lines
// drops them and cannot merge them back. Anthony chose to keep the as-found shots ("Yes, but keep the as-found shots").
//
// The server half drives the REAL .gs functions over a fake spreadsheet (the chunked blob reader and writer among
// them); the app half the real havellin.html functions.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sandbox, matchBrace, source } = require('./harness');

const ROOT = path.join(__dirname, '..');
const GS = fs.readFileSync(path.join(ROOT, 'apps-script', 'main-sync.gs'), 'utf8');
const GS_INV = fs.readFileSync(path.join(ROOT, 'apps-script', 'saveInventory.gs'), 'utf8');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

function gsFn(src, name) {
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(src);
  if (!m) throw new Error('not in .gs: ' + name);
  const start = m.index + (m[1] ? m[1].length : 0);
  const open = src.indexOf('{', re.lastIndex);
  return src.slice(start, matchBrace(src, open) + 1);
}
function gsVar(src, name) {
  const m = src.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[^;]*;)'));
  if (!m) throw new Error('var not in .gs: ' + name);
  return m[2];
}
// A minimal in-memory Sheet (rows of cells, 1-based ranges), enough for the real chunked blob code.
function fakeSheet(name, header) {
  const rows = header ? [header.slice()] : [];
  return {
    getName: () => name, _rows: rows,
    getLastRow: () => rows.length,
    appendRow(r) { rows.push(r.slice()); },
    getDataRange() { return { getValues: () => rows.map((r) => r.slice()) }; },
    getRange(r, c, nr, nc) {
      return {
        getValues() {
          const out = [];
          for (let i = 0; i < nr; i++) {
            const row = rows[r - 1 + i] || [];
            const cells = [];
            for (let j = 0; j < nc; j++) cells.push(row[c - 1 + j] === undefined ? '' : row[c - 1 + j]);
            out.push(cells);
          }
          return out;
        },
        setValues(v) {
          v.forEach((cells, i) => {
            while (rows.length < r + i) rows.push([]);
            cells.forEach((cell, j) => { rows[r - 1 + i][c - 1 + j] = cell; });
          });
        },
        clearContent() {
          for (let i = 0; i < nr; i++) { const row = rows[r - 1 + i]; if (row) for (let j = 0; j < nc; j++) row[c - 1 + j] = ''; }
          while (rows.length > 1 && rows[rows.length - 1].every((x) => x === '' || x === undefined)) rows.pop();
        },
      };
    },
  };
}

// ⚠ NEVER THE CLOCK: the server stamps the reset with `new Date().getTime()`, so the sandbox's Date is pinned.
const RESET_AT = 1760000000000;   // the instant of the reset
const BEFORE = RESET_AT - 86400000;
const AFTER = RESET_AT + 60000;
class PinnedDate extends Date {
  constructor(...a) { super(...(a.length ? a : [RESET_AT])); }
  static now() { return RESET_AT; }
}

function gsServer() {
  const sheets = {};
  const logs = [];
  const ctx = {
    console, JSON, Date: PinnedDate,
    Logger: { log(s) { logs.push(String(s)); } },
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock() {}, releaseLock() {} }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: (n) => sheets[n] || null,
      insertSheet(n) { sheets[n] = fakeSheet(n); return sheets[n]; } }) },
    __sheets: sheets, __logs: logs,
  };
  vm.createContext(ctx);
  const names = ['_readStoreBlob', '_writeStoreBlob', '_lockOrBusy', 'getJobLedger', '_jobRefusal', '_presentJobIds', '_deletedJobIds',
    '_ledgerMarkSeen', 'getJobsFromSheet', '_jobRefusalCtx', '_sweepDeletedJobKeys',
    'previewResetInventory', 'resetInventoryConfirm', '_invResetPlan', '_invResetLog'];
  const invNames = ['saveMediaStore', 'getMediaStore', 'getMediaForJob', '_invResetDrops', '_invApprovalEntries', '_invApprovalSetAt',
    '_invMergeApprovals', '_mergeMediaItems', '_mergeCustodyLogs', '_custodyEventId', '_invStickyValue', '_invHasVal'];
  const code = [gsVar(GS, 'SHEET_ID'), gsVar(GS, '_BLOB_CHUNK'), gsVar(GS, 'JOB_LEDGER_STORE'), gsVar(GS, 'BACKEND_VERSION'),
    (GS_INV.match(/var INV_STICKY_FIELDS = \[[\s\S]*?\];/) || [''])[0],
    ...names.map((n) => gsFn(GS, n)), ...invNames.map((n) => gsFn(GS_INV, n))].join('\n\n');
  vm.runInContext(code, ctx, { filename: 'apps-script (extracted)' });
  // The Jobs sheet, as getJobsFromSheet reads it: the record JSON in column 12.
  const jobsSheet = fakeSheet('Jobs', ['ID', 'HVL ID', 'Name', 'Email', 'Phone', 'Address', 'City', 'Zip', 'Service', 'Status', 'Created', 'Data JSON']);
  const jobRow = (j) => [j.id, j.hvlId, j.name, '', '', '', '', '', j.svc, 'active', '2026-09-10', JSON.stringify(j)];
  jobsSheet.appendRow(jobRow({ id: 7, hvlId: 'HVL-2610-E007', name: 'Ruth Ellison', svc: 'cleanout' }));
  jobsSheet.appendRow(jobRow({ id: 8, hvlId: 'HVL-2610-W008', name: 'Harold Whitcombe', svc: 'probate' }));
  sheets.Jobs = jobsSheet;
  return ctx;
}
const snapshot = (ctx, except) => JSON.stringify(Object.keys(ctx.__sheets).sort().filter((n) => n !== except).map((n) => [n, ctx.__sheets[n]._rows]));
const ids = (list) => (list || []).map((r) => r.stableId).sort();
const syncOk = (v) => ({ then(f) { const o = f(v); return (o && typeof o.then === 'function') ? o : syncOk(o); }, catch() { return this; } });

// ── The fixture: one job's manifest the moment before the reset ───────────────────────────
// A line is `L(id, over)`: an uploaded Items line with a photograph in Drive.
const L = (id, o) => Object.assign({ stableId: id, label: 'inventory', collId: null, roomIdx: 1, seq: 1, status: 'uploaded', qty: '1',
  ts: BEFORE, updatedAt: BEFORE, driveFileId: 'f-' + id, driveFileUrl: 'https://drive.google.com/file/d/f-' + id + '/view', filename: id + '.jpg' }, o);
const NO_PHOTO = { driveFileId: undefined, driveFileUrl: null, filename: '' };
const COLL_UNSHOT = 1700000000000, COLL_SHOT = 1700000000001;
function fixture() {
  return [
    L('k1', { itemNo: 1, objectName: 'Sideboard', fmv: '900', valuedBy: 'agent', valNotices: ['worth a look'], valConf: 'medium' }),  // live, valued by Agent Two
    L('k2', { itemNo: 2, objectName: 'Hall mirror', deletedAt: BEFORE + 5, deletedBy: 'Ashley Jerome' }),                         // removed at the desk
    L('m1', Object.assign({ itemNo: 3, objectName: 'Typed line', manual: true, status: 'manual' }, NO_PHOTO)),                     // a manual line
    L('s1', { itemNo: 4, objectName: 'Second vase', derivedFrom: 'k1' }),                                                        // split off k1's frame
    L('e1', { itemNo: 5, objectName: 'Lamp', updatedAt: AFTER }),                                      // an old line EDITED after the reset on a stale device
    { stableId: 'd1', label: 'detail', groupId: 'k1', roomIdx: 1, status: 'uploaded', ts: BEFORE, updatedAt: BEFORE, driveFileId: 'f-d1' },   // k1's close-up
    { stableId: 'b1', label: 'before', roomIdx: 1, status: 'uploaded', ts: BEFORE, updatedAt: BEFORE, driveFileId: 'f-b1', filename: 'b1.jpg' },   // the as-found pass
    { stableId: 'a1', label: 'after', roomIdx: 1, status: 'uploaded', ts: BEFORE, updatedAt: BEFORE, driveFileId: 'f-a1' },
    { stableId: 'cd1', label: 'collection', collId: '77', docKind: 'appraisal', status: 'uploaded', ts: BEFORE, driveFileUrl: 'https://drive.google.com/file/d/cd1/view' },
    { stableId: 'ap1', label: 'appraisal', collId: '77', status: 'uploaded', ts: BEFORE, driveFileUrl: 'https://drive.google.com/file/d/ap1/view' },
    L('c-unshot', Object.assign({ stableId: '7_col_' + COLL_UNSHOT, itemNo: 6, objectName: 'Silver', sourceCollId: COLL_UNSHOT, ts: COLL_UNSHOT, updatedAt: 1 }, NO_PHOTO)),   // the walkthrough's line, not yet photographed
    L('c-shot', { stableId: '7_col_' + COLL_SHOT, itemNo: 7, objectName: 'Books', sourceCollId: COLL_SHOT, ts: COLL_SHOT }),   // the walkthrough's line, photographed
  ];
}
const DROPS = ['k1', 'k2', 'm1', 's1', 'e1', 'd1', '7_col_' + COLL_SHOT].sort();
const KEEPS = ['b1', 'a1', 'cd1', 'ap1', '7_col_' + COLL_UNSHOT].sort();
// Two records made after the reset: a new shot and its close-up.
const NEW_LINE = () => L('n1', { itemNo: 1, objectName: 'Clock', ts: AFTER, updatedAt: AFTER });
const NEW_DETAIL = () => ({ stableId: 'nd1', label: 'detail', groupId: 'n1', roomIdx: 1, status: 'uploaded', ts: AFTER, updatedAt: AFTER, driveFileId: 'f-nd1' });

// The app's refresh, lifted with everything the reset touches on the device: the merge, the thumbnail cache and the retry bytes.
const APP_FNS = ['refreshPhotoRefs', 'loadMediaStore', '_stableJson', '_invApplyReset', 'invResetDrops', '_invDropShotCaches', '_invThumbCache', '_invThumbKey',
  '_invSaveThumbCache', '_invFileId', '_savePendingPhotoData', '_pendingPhotoKey', 'mergeMediaItems', 'invMergeApprovals', '_invApprovalEntries',
  '_invApprovalSetAt', 'mergeCustodyLogs', '_custodyEventId', 'invStickyValue', '_invHasVal'];
const APP_VARS = ['_invThumbs', 'INV_THUMB_CACHE_MAX', 'INV_STICKY_FIELDS', '_localShotThumbs', '_photoRetryData'];
function appRig(entry, local) {
  const saved = [];
  const S = sandbox({ fns: APP_FNS, vars: APP_VARS, stubs: {
    SHEETS_SYNC_URL: 'https://script.google.com/macros/s/AAA/exec',
    _photoRefs: { 7: local },
    _invCloudSeen: {},
    savePhotoRefs: (j) => saved.push(j),
    fetch: () => syncOk({ json: () => syncOk({ ok: true, media: entry === undefined ? {} : { 7: entry } }) }),
  } });
  S.__saved = saved;
  return S;
}
// The caches a device holds beside its manifest: k1's thumbnail and retry bytes, and b1's.
function seedCaches(S) {
  S._invThumbs[7] = { 'f-k1': 'data:image/jpeg;base64,K1', 'f-b1': 'data:image/jpeg;base64,B1' };
  S._invSaveThumbCache(7);
  S._photoRefs[7].forEach((r) => { if (r.stableId === 'k1' || r.stableId === 'b1') r.status = 'failed'; });
  S._photoRetryData.k1 = 'data:image/jpeg;base64,K1FULL';
  S._photoRetryData.b1 = 'data:image/jpeg;base64,B1FULL';
  S._localShotThumbs.k1 = 'data:k1small';
  S._savePendingPhotoData(7);
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ═══ 1 · THE PREDICATE, ONE RULE ON BOTH ENDS ═══
  group('1 · which copy of a line is from before the reset: the Items pass and its close-ups go, the house\'s record stays, on both ends');
  {
    const A = sandbox({ fns: ['invResetDrops'] });
    const g = {}; vm.createContext(g);
    vm.runInContext(gsFn(GS_INV, '_invResetDrops'), g, { filename: 'saveInventory.gs (extracted)' });
    const want = {};
    DROPS.forEach((id) => { want[id] = true; }); KEEPS.forEach((id) => { want[id] = false; });
    fixture().forEach((r) => {
      eq(A.invResetDrops(r, RESET_AT), want[r.stableId], 'app: ' + r.stableId + ' (' + r.label + (r.deletedAt ? ', removed' : '') + (r.manual ? ', manual' : '') + (r.sourceCollId ? ', a collection\'s' : '') + ')');
      eq(g._invResetDrops(r, RESET_AT), want[r.stableId], 'server: ' + r.stableId);
    });
    eq(fixture().filter((r) => A.invResetDrops(r, RESET_AT)).length, DROPS.length, 'the drops are exactly the seven');
    // After the reset, nothing made after it is touched.
    eq(A.invResetDrops(NEW_LINE(), RESET_AT), false, 'a line photographed after the reset stays');
    eq(A.invResetDrops(NEW_DETAIL(), RESET_AT), false, 'and so does its close-up');
    eq(A.invResetDrops(L('x', { ts: RESET_AT, updatedAt: RESET_AT }), RESET_AT), false, 'a line born at the very instant stays (before means before)');
    eq(A.invResetDrops(L('x', { ts: undefined, updatedAt: AFTER }), RESET_AT), false, 'with no ts, updatedAt answers');
    eq(A.invResetDrops(L('x', { ts: undefined, updatedAt: BEFORE }), RESET_AT), true, '…either way');
    // No stamp, nothing drops: the ordinary job.
    eq(fixture().some((r) => A.invResetDrops(r, 0)), false, 'no stamp: nothing drops (the ordinary job)');
    eq(fixture().some((r) => A.invResetDrops(r, undefined)), false, '…nor on undefined');
    eq(A.invResetDrops(L('x'), String(RESET_AT)), true, 'a stamp read back as text still counts');
    eq(A.invResetDrops(null, RESET_AT), false, 'a null record is nothing');
    // ⚠ The walkthrough's unphotographed line: its ts is the collection's (collectionLinesEnsure), always before any reset.
    const unshot = fixture().find((r) => r.sourceCollId === COLL_UNSHOT);
    ok(unshot.ts < RESET_AT && unshot.updatedAt === 1, '(the fixture\'s unshot collection line carries the walkthrough\'s stamps, as collectionLinesEnsure writes them)');
    eq(A.invResetDrops(unshot, RESET_AT), false, '⚠⚠ it stays, or every device would drop it on every read and remake it');
    eq(A.invResetDrops(Object.assign({}, unshot, { driveFileId: 'f-x' }), RESET_AT), true, 'photographed, the same line goes: the collection needs its photograph again');
    // The two copies are the same rule written twice.
    has(gsFn(GS_INV, 'saveMediaStore'), '_invResetDrops(r, resetAt)', 'the server reads it on every save');
    has(gsFn(GS, '_invResetPlan'), '_invResetDrops(r, at)', 'and the reset itself decides by it');
    const appBody = src.slice(src.indexOf('function invResetDrops('), src.indexOf('function _invApplyReset('));
    eq((appBody.match(/ref\.label/g) || []).length, 3, 'the app\'s copy reads the label as the server\'s does (3 reads)');
  }

  // ═══ 2 · THE EDITOR PAIR ═══
  group('2 · previewResetInventory / resetInventoryConfirm: editor-only, one job, the Items pass off, the stamp on, nothing else touched');
  {
    const S = gsServer();
    S._writeStoreBlob('MediaStore', { 7: { savedAt: 1, items: fixture() }, 8: { savedAt: 1, items: [L('o1', { itemNo: 1, objectName: 'Other client\'s line' })] } });
    const before = snapshot(S);
    // With no argument (the Run menu passes none): the jobs are listed and nothing changes.
    S.previewResetInventory();
    has(S.__logs.join('\n'), '7  HVL-2610-E007  Ruth Ellison  — 6 live line(s), 12 record(s) in all', 'with no id, the jobs are listed with their live lines (six: the collection lines among them; the removed line and the close-ups counted in the records only)');
    has(S.__logs.join('\n'), '8  HVL-2610-W008  Harold Whitcombe  — 1 live line(s)', '…every job');
    eq(snapshot(S), before, 'and nothing was written');
    S.__logs.length = 0;
    S.resetInventoryConfirm();
    has(S.__logs.join('\n'), 'resetInventoryConfirm needs the job', 'the confirm with no id does the same');
    eq(snapshot(S), before, '…and writes nothing');
    // A job the sheet does not hold.
    S.__logs.length = 0;
    S.resetInventoryConfirm(999);
    has(S.__logs.join('\n'), 'No job 999 on the Jobs sheet. Nothing done.', 'a job not on the Jobs sheet is refused by name');
    eq(snapshot(S), before, '…and nothing is written');
    // The preview of job 7.
    S.__logs.length = 0;
    S.previewResetInventory(7);
    const prev = S.__logs.join('\n');
    has(prev, 'This is a PREVIEW. Nothing has been changed.', 'the preview says it is one');
    has(prev, 'Inventory of Ruth Ellison (HVL-2610-E007): 12 record(s) on MediaStore', 'it names the client and counts the records');
    has(prev, 'OFF: 5 live line(s), 1 removed line(s), 1 close-up(s)', 'what goes: the live lines (the manual, the split, the edited-later and the photographed collection line among them), the removed line, the close-up');
    has(prev, 'KEPT: 1 as-found shot(s), 1 after shot(s), 1 walkthrough collection line(s) not yet photographed, 2 other record(s)', 'what stays: the as-found pass, the after shot, the unshot collection line, the two documents');
    has(prev, 'To go ahead: run resetInventoryConfirm(7).', 'and how to go ahead');
    eq(snapshot(S), before, '⚠⚠ the preview writes nothing');
    // The reset.
    S.__logs.length = 0;
    S.resetInventoryConfirm(7);
    const done = S.__logs.join('\n');
    const store = S.getMediaStore();
    eq(ids(store[7].items), KEEPS, '⚠⚠ job 7 keeps exactly the house\'s record: the as-found and after shots, the two documents, the unshot collection line');
    eq(store[7].invResetAt, RESET_AT, 'the entry is stamped with the instant of the reset');
    eq(store[7].savedAt, RESET_AT, '…and saved then');
    eq(ids(store[8].items), ['o1'], 'the other client\'s inventory is untouched');
    eq(store[8].invResetAt, undefined, '…and unstamped');
    eq(snapshot(S, 'MediaStore'), snapshot(gsServer(), 'MediaStore'), 'no other tab is written (the Jobs sheet as it was)');
    has(done, 'Done on the sheet: 7 record(s) off the inventory of Ruth Ellison (HVL-2610-E007); the entry is stamped invResetAt=' + RESET_AT, 'the log says what went');
    has(done, 'On every device: reload the app and reopen the client', 'and names the device step');
    has(done, 'on an older one it merges them back, so reload every device before anybody photographs or edits a line', '…and the risk on an older deployment');
    has(done, 'inventory workbook in Drive is rebuilt from the record on the next edit', '…and that the workbook follows');
    eq(S.getMediaForJob(7)[7].invResetAt, RESET_AT, 'getMediaForJob hands the stamp to the app with the entry');
    // A second reset says it was reset before, and keeps the same set.
    S.__logs.length = 0;
    S.previewResetInventory(7);
    has(S.__logs.join('\n'), 'reset before on 2025-10-09T', 'a job reset before says so (the ISO day of the pinned clock)');
    has(S.__logs.join('\n'), 'OFF: 0 live line(s), 0 removed line(s), 0 close-up(s)', '…and has nothing more to drop');
    // Editor-only: no road from the web app.
    const dispatch = gsFn(GS, 'doPost') + gsFn(GS, 'doGet');
    lacks(dispatch, 'resetInventory', 'neither doPost nor doGet reaches the reset');
    lacks(gsVar(GS, 'BACKEND_ACTIONS') + (GS.match(/var BACKEND_TYPES = \[[\s\S]*?\];/) || [''])[0], 'resetInventory', 'and it is no action or type');
    has(gsFn(GS, 'resetInventoryConfirm'), '_lockOrBusy(lock)', 'the confirm takes the script lock like every store save');
  }

  // ═══ 3 · THE SERVER AFTER THE RESET ═══
  group('3 · saveMediaStore after the reset: a stale device\'s lines are refused one by one, a new shot is kept, the stamp survives, and a copy an old deployment let back in is swept');
  {
    const S = gsServer();
    S._writeStoreBlob('MediaStore', { 7: { savedAt: 1, items: fixture() } });
    S.resetInventoryConfirm(7);
    // The iPad that photographed the drawers saves again: everything it holds, plus the shot it has just taken.
    const stale = fixture().map((r) => Object.assign({}, r, r.stableId === 'k1' ? { objectName: 'Sideboard, edited later', updatedAt: AFTER + 5 } : {}));
    const r1 = S.saveMediaStore({ jobId: 7, savedAt: AFTER + 10, items: stale.concat([NEW_LINE(), NEW_DETAIL()]) });
    const after1 = S.getMediaStore()[7];
    eq(ids(after1.items), KEEPS.concat(['n1', 'nd1']).sort(), '⚠⚠ the old lines do not come back, the new shot and its close-up do');
    eq(after1.invResetAt, RESET_AT, '⚠⚠ the stamp survives the save (the entry is rebuilt on every save)');
    eq(r1.ok && r1.resetDropped, DROPS.length, 'the answer counts what it refused (' + r1.resetDropped + ')');
    eq(r1.invResetAt, RESET_AT, '…and carries the stamp');
    eq(after1.items.find((r) => r.stableId === 'b1').driveFileId, 'f-b1', 'the as-found shot is merged as before');
    // An older deployment, which knows no stamp, merged k1 straight back in and kept the stamp only by luck of the
    // entry shape: the first save on this deployment sweeps it out again.
    const st = S.getMediaStore();
    st[7].items.push(stale[0]);
    S._writeStoreBlob('MediaStore', st);
    eq(ids(S.getMediaStore()[7].items).indexOf('k1') >= 0, true, '(k1 is back on the sheet, as an old deployment would leave it)');
    const r2 = S.saveMediaStore({ jobId: 7, savedAt: AFTER + 20, items: [] });
    eq(ids(S.getMediaStore()[7].items).indexOf('k1'), -1, '⚠⚠ an empty save sweeps the stale copy an old deployment let back in');
    eq(r2.resetDropped, 1, '…and says so');
    // A job never reset is saved exactly as before.
    const r3 = S.saveMediaStore({ jobId: 8, savedAt: AFTER, items: [L('o1'), L('o2', { ts: BEFORE - 5 })] });
    eq(ids(S.getMediaStore()[8].items), ['o1', 'o2'], 'a job never reset merges every line, however old');
    eq(S.getMediaStore()[8].invResetAt, undefined, '…and gains no stamp');
    eq(Object.prototype.hasOwnProperty.call(r3, 'resetDropped'), false, '…and its answer says nothing of a reset');
  }

  // ═══ 4 · THE APP READS THE STAMP ═══
  group('4 · refreshPhotoRefs: the entry\'s stamp takes the old lines, their thumbnails and their retry bytes off this device, reports the change once, and leaves a stampless job alone');
  {
    // (a) The sheet after the reset holds the as-found shot alone, stamped.
    const S = appRig({ items: [fixture().find((r) => r.stableId === 'b1')], invResetAt: RESET_AT }, fixture());
    seedCaches(S);
    let changed = null;
    S.refreshPhotoRefs(7, (c) => { changed = c; });
    eq(changed, true, '⚠⚠ the reset reads as a change, so the screen redraws');
    eq(ids(S._photoRefs[7]), KEEPS, '⚠⚠ the device keeps exactly what the sheet keeps');
    eq(S.__saved, [7], 'and saves the manifest once');
    eq(S._invCloudSeen[7], true, 'the sheet counts as read');
    const thumbs = JSON.parse(S.localStorage.getItem('hav_media_thumb_7'));
    eq(Object.keys(thumbs).sort(), ['f-b1'], '⚠ the dropped line\'s thumbnail is gone from the device, the as-found shot\'s stays');
    eq(Object.keys(S._invThumbs[7]).sort(), ['f-b1'], '…in memory too');
    eq(Object.keys(S._photoRetryData).sort(), ['b1'], 'the bytes held to retry the dropped line are gone, the as-found shot\'s stay');
    eq(Object.keys(JSON.parse(S.localStorage.getItem('hav_media_pending_7'))).sort(), ['b1'], '…on the device too');
    eq(S._localShotThumbs.k1, undefined, 'and the session\'s own small copy');
    // (b) The same entry again: nothing more to drop, and no change reported (the render-loop guard of 2026-10-08 holds).
    changed = null;
    S.refreshPhotoRefs(7, (c) => { changed = c; });
    eq(changed, false, '⚠⚠ a second read of the same entry is no change: no render loop');
    eq(ids(S._photoRefs[7]), KEEPS, '…and drops nothing more');
    // (c) The sheet holds nothing at all for the job, stamped: the lines still go.
    const S2 = appRig({ items: [], invResetAt: RESET_AT }, fixture());
    changed = null;
    S2.refreshPhotoRefs(7, (c) => { changed = c; });
    eq(changed, true, '⚠⚠ an entry with no items but a stamp still drops the lines (the empty-remote return used to come first)');
    eq(ids(S2._photoRefs[7]), KEEPS, '…the same set');
    eq(S2.__saved, [7], '…and saves');
    // (d) A stampless entry: the ordinary job, untouched.
    const S3 = appRig({ items: [fixture().find((r) => r.stableId === 'k1')] }, fixture());
    changed = null;
    S3.refreshPhotoRefs(7, (c) => { changed = c; });
    eq(ids(S3._photoRefs[7]), ids(fixture()), 'no stamp: every line stays');
    eq(changed, false, '…and the same items in another copy read as no change, as before');
    // (e) No entry for the job at all.
    const S4 = appRig(undefined, fixture());
    changed = null;
    S4.refreshPhotoRefs(7, (c) => { changed = c; });
    eq([changed, ids(S4._photoRefs[7]).length, S4.__saved.length], [false, 12, 0], 'no entry: nothing read, nothing dropped, nothing saved');
    // (f) A new shot taken on this device after the reset, before it read the stamp, is kept with its close-up.
    const S5 = appRig({ items: [], invResetAt: RESET_AT }, fixture().concat([NEW_LINE(), NEW_DETAIL()]));
    S5.refreshPhotoRefs(7, () => {});
    eq(ids(S5._photoRefs[7]), KEEPS.concat(['n1', 'nd1']).sort(), 'a shot taken after the reset survives the read');
    // _invApplyReset alone, as the accordion rig lifts it: no stamp, no touch, false.
    const refs = fixture();
    const A = sandbox({ fns: ['_invApplyReset', 'invResetDrops'], stubs: { _photoRefs: { 7: refs } } });
    eq(A._invApplyReset(7, { items: [] }), false, '_invApplyReset with no stamp answers false…');
    eq(A._photoRefs[7], refs, '…and touches nothing (the same array)');
  }

  group('5 · loadMediaStore reads the stamp the same way');
  {
    const S = appRig({ items: [], invResetAt: RESET_AT }, fixture());
    let got = null;
    S.loadMediaStore((okk, n) => { got = [okk, n]; });
    eq(got, [true, 1], 'the job counts as merged');
    eq(ids(S._photoRefs[7]), KEEPS, 'and holds what the sheet keeps');
    eq(S.__saved, ['7'], 'saved once (under the key as the sheet spells it)');
    const S2 = appRig({ items: [] }, fixture());
    S2.loadMediaStore(() => {});
    eq([ids(S2._photoRefs[7]).length, S2.__saved.length], [12, 0], 'an empty, unstamped entry is skipped as before');
  }

  // ═══ 6 · THE NUMBERS AFTER A RESET ═══
  group('6 · item numbers after the reset: the next line numbers on from the highest number still on the entry');
  {
    const N = sandbox({ fns: ['_invAssignItemNos', '_jobInvRefs', '_invTouch'], stubs: { _photoRefs: {}, savePhotoRefs: () => {}, _scheduleInventorySync: () => {} } });
    // The unshot collection line keeps its number, so the next shot is one above it.
    const kept = fixture().filter((r) => KEEPS.indexOf(r.stableId) >= 0);
    N._photoRefs[7] = kept.concat([L('n1', { ts: AFTER, updatedAt: AFTER })]);
    N._invAssignItemNos(7);
    eq(N._photoRefs[7].find((r) => r.stableId === 'n1').itemNo, 7, 'with the walkthrough\'s line still #6, the first new shot is #7 (its number is never reissued)');
    // With no inventory line left, the count starts again.
    N._photoRefs[7] = kept.filter((r) => r.label !== 'inventory').concat([L('n1', { ts: AFTER, updatedAt: AFTER })]);
    N._invAssignItemNos(7);
    eq(N._photoRefs[7].find((r) => r.stableId === 'n1').itemNo, 1, 'with no line left on the entry, the first new shot is #1');
  }

  // ═══ 7 · THE DEPLOYMENT ═══
  group('7 · the backend version, the app\'s minimum and the banner');
  {
    const bv = /var BACKEND_VERSION = '([^']+)'/.exec(GS)[1];
    const B = sandbox({ vars: ['BACKEND_MIN_VERSION', 'BACKEND_FEATURE_COST'] });
    eq(bv, '2026-10-19b', 'main-sync.gs is 2026-10-19b (b: main\'s Agent One build took 2026-10-19 the same evening)');
    eq(B.BACKEND_MIN_VERSION, '2026-10-19b', 'the app relies on it: an older deployment merges the old lines back');
    ok(B.BACKEND_FEATURE_COST.version.indexOf('a client\u2019s inventory reset in the Apps Script editor (resetInventoryConfirm) is undone by the first device that saves a line from before it') === 0,
       'the banner names the newest gap first, by consequence');
    has(B.BACKEND_FEATURE_COST.version, 'on a deployment older than 2026-10-16, an incident reported', '…and the 2026-10-16 gap by its vintage after it');
  }

  // ═══ 8 · THE DOCUMENTS ═══
  group('8 · the manual says how, in both copies; the playbook names the symptom without the script');
  {
    const man = read('manual.html'), md = read('MANUAL.md'), pb = read('concierge-guide.html'), pbmd = read('CONCIERGE_GUIDE.md');
    [['manual.html', man], ['MANUAL.md', md]].forEach(([n, t]) => {
      has(t, 'previewResetInventory(', n + ' names the preview');
      has(t, 'resetInventoryConfirm(', n + ' names the confirm');
      has(t, 'invResetAt', n + ' names the stamp');
      has(t, 'REQUIRES AN APPS SCRIPT REDEPLOY', n + ' carries a redeploy note');
      has(t, '2026-10-19', n + ' …for 2026-10-19');
      has(t, 'as-found', n + ' says the as-found pass stays');
      has(t, 'Clear', n + ' names the device step');
      has(t, n === 'manual.html' ? 'Resetting one client&rsquo;s inventory' : 'Resetting one client\'s inventory', n + ' carries the note under the title the playbook points at');
    });
    [['concierge-guide.html', pb], ['CONCIERGE_GUIDE.md', pbmd]].forEach(([n, t]) => {
      has(t, 'still on the desk', n + ' has the symptom row');
      has(t, 'Operations Manual', n + ' points at the manual for the how');
      lacks(t, 'resetInventoryConfirm', n + ' keeps the script out of the playbook');
    });
  }
};
