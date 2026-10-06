'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P22 · GROUP C · THE DESK'S KNOWN DEFECTS (2026-10-05), from CLAUDE.md's "Known, not fixed".
//
//   1  A firearm moved off Distribute kept the person's name in Channel / Recipient, which then cleared the `dealer` arm.
//   2  Removed items showed the twelve most recent only; Restore gave back the line without the detail shots the bin took.
//   3  The firearm block named Anthony Graziano; `_invCell`'s `seq` branch and `removeInventoryManualItem` were dead.
//   4  `renderLogHistory` put crew names and the activity into innerHTML unescaped.
//   5  A living client's Approval Request printed "Prepared by … · <date>" twice.
//   6  A filed receipt whose signer no longer has a line dropped off the card.
//   7  The desk's Summary summed money with `+=`; the workbook's Summary formatted it to the whole dollar.
//   8  `_renderLedgerCard` read the ledger by id; living work's signed ledger was asked for nowhere.
//   9  The P20 approvals bullet: commas in a fiduciary's name, an estate line already going to a Havellin person, a
//      charity's receipt or a statement not counting as gone, the Authorized By box in ISO, one gap for every open line,
//      the worklist's pointer, the request's number agreement, and the bulk bar's "N items updated".
//  10  Two devices recording different signers on one line kept only the newer device's (app and server merge).
//
// Everything is DRIVEN through the real functions, each sandbox the root's own call graph derived from the source,
// with the boundaries (the network, the printer, the store saves, the repaint) stubbed by name.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sandbox, source, fn, decl, domStub } = require('./harness');

const SRC = source();
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
const noComments = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

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
  return { fns: [...fns].filter((n) => ALL_FNS.has(n)), vars: [...vars] };
}
const BOUNDARY = ['jobs', '_photoRefs', 'estimateStore', 'contractors', 'showSyncBadge', 'renderInventoryTab', '_scheduleInventorySync',
  'saveJobs', 'syncJobToSheets', '_printDocument', 'alert', 'document', '_invPrintThumb', '_invThumbHTML', '_signedCopyRepaint',
  'uploadToDrive', 'resolveSubfolderId', 'FileReader', 'SHEETS_SYNC_URL', '_invPick', '_invFilter', '_invBulkLast', 'jobPlanStore',
  'changeOrders', '_invOpen', '_agDupSet', '_invThumbFailed', '_invRefreshSummary', '_invRefreshGuardrail', '_invRefreshFlagStrip',
  '_invRefreshRecords', '_trashShotFiles', '_fieldCam', '_updatePhotoStatusEl', '_invSaveThumbCache', '_savePendingPhotoData',
  '_photoRetryData', '_localShotThumbs', '_invThumbCache', 'jobLogEntries', 'savePhotoRefs', '_invRemovedAll', 'logStore'];
function lift(roots, stubs) {
  const c = closure(roots, BOUNDARY.concat(Object.keys(stubs || {})));
  return sandbox({ fns: c.fns, vars: c.vars, stubs: stubs || {} });
}
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&middot;/g, '·').replace(/&#39;/g, "'")
  .replace(/&rsquo;/g, '’').replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”').replace(/&mdash;/g, '—')
  .replace(/&#9888;/g, '⚠').replace(/&#10003;/g, '✓').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
const flat = (h) => text(String(h || '').replace(/<[^>]+>/g, ''));
const count = (h, needle) => String(h || '').split(needle).length - 1;

const TRUST = (over) => Object.assign({ id: 7, name: 'Walter Ellsworth', hvlId: 'HVL-0007', svc: 'cleanout', matterType: 'trust', docTier: 'values',
  trustName: 'Ellsworth Family Trust', addr: '69 Beach Blvd', city: 'Palm Beach', executor: 'Ruth Adler', executorRole: 'Trustee',
  deathDate: '2026-04-02', won: true, status: 'active', tc: 'Ashley Jerome', updatedAt: 1,
  coFiduciaries: [{ id: 'cf1', name: 'Daniel Adler', role: 'Co-trustee' }] }, over || {});
const PROBATE = (over) => Object.assign({ id: 8, name: 'Tripp Butler Sr', hvlId: 'HVL-0008', svc: 'probate', matterType: 'probate', docTier: 'values',
  addr: '12 Ocean Way', executor: 'Tripp Butler', deathDate: '2026-03-01', won: true, status: 'active', tc: 'Ashley Jerome', updatedAt: 1 }, over || {});
const LIVING = (over) => Object.assign({ id: 2, name: 'Margaret Ellsworth', hvlId: 'HVL-0002', svc: 'downsizing_move', addr: '14 Coconut Row',
  destAddr: '801 Sunset Ave', won: true, status: 'won', tc: 'Ashley Jerome', updatedAt: 1 }, over || {});
const LINE = (id, n, over) => Object.assign({
  stableId: id, label: 'inventory', collId: null, roomIdx: 1, itemNo: n, status: 'uploaded', qty: 1,
  objectName: 'Line ' + n, category: 'Furniture', condition: 'Good', ts: 100 + n, updatedAt: 100 + n,
}, over || {});
const GUN = (id, n, over) => LINE(id, n, Object.assign({ objectName: 'Shotgun', category: 'Firearms', serial: 'SN-1',
  authBy: 'Tripp Butler', approvalDate: '2026-09-10' }, over || {}));

module.exports = function ({ group, ok, eq, has, lacks }) {
  const G = (name, body) => { group(name); try { body(); } catch (e) { ok(false, name + ' — threw: ' + String(e && e.message || e).split('\n')[0]); } };

  function desk(roots, job, lines, extra) {
    const log = { alerts: [], badges: [], printed: [], renders: 0, syncs: 0, saves: 0, trashed: [] };
    const doc = domStub({});
    const stubs = Object.assign({
      jobs: [job], _photoRefs: { [job.id]: lines || [] }, estimateStore: {}, contractors: [],
      showSyncBadge(m, err) { log.badges.push({ m: String(m), err: !!err }); },
      renderInventoryTab() { log.renders++; }, _scheduleInventorySync() { log.syncs++; },
      saveJobs() { log.saves++; }, syncJobToSheets() {}, savePhotoRefs() { log.saves++; },
      _printDocument(h, t) { log.printed.push({ html: h, title: t }); return true; },
      alert(m) { log.alerts.push(String(m)); },
      document: doc, _invPrintThumb() { return ''; }, _invThumbHTML() { return '<div></div>'; },
      _signedCopyRepaint() {}, _invPick: {}, _invFilter: { when: 'all', room: '', q: '', flag: '' }, _invBulkLast: null,
      jobPlanStore: {}, changeOrders: [], _invOpen: {}, _agDupSet: {}, _invThumbFailed: {},
      _invRefreshSummary() {}, _invRefreshGuardrail() {}, _invRefreshFlagStrip() {}, _invRefreshRecords() {},
      SHEETS_SYNC_URL: 'https://script.google.com/macros/s/P22C/exec',
      _trashShotFiles(ids) { log.trashed.push(...ids); }, _fieldCam: { open: false }, _updatePhotoStatusEl() {},
      _invSaveThumbCache() {}, _savePendingPhotoData() {}, _photoRetryData: {}, _localShotThumbs: {}, _invThumbCache() { return {}; },
      _invRemovedAll: false,
    }, extra || {});
    const S = lift(roots, stubs);
    S.window.confirm = () => true;
    S.confirm = () => true;
    S.__log = log; S.__doc = doc;
    return S;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  G('1 · a firearm moved off To a person: the leftover name is flagged, never cleared, and never read as the dealer', () => {
    const job = PROBATE();
    const S = desk(['_invEdit', '_invBulkApply', 'invTransportBlocked', 'invTransportReason', 'invKeepChannel', '_renderInvRow', '_renderInvPanel'], job,
      [GUN('g', 1, { disposition: 'Distribute', channel: 'Marie Delgado (daughter)' }), GUN('h', 2, { disposition: 'Distribute', channel: 'Sam Delgado', serial: 'SN-2' }),
       LINE('k', 3, { disposition: 'Distribute', channel: 'Ann Lee' }), LINE('m', 4, { disposition: 'Donate', channel: 'Goodwill' })]);
    const g = () => S._getPhotoRef(8, 'g');
    eq(S.invTransportBlocked(g(), S.jobs[0]), 'beneficiary', 'fixture: going to the daughter with no dealer route, the beneficiary arm holds it');
    const r = attempt(() => S._invEdit(8, 'g', 'disposition', { value: 'Sell', type: 'select-one' }));
    ok(r.ok, 'the disposition changes' + (r.ok ? '' : ': ' + r.err));
    eq(g().channel, 'Marie Delgado (daughter)', '⚠⚠ the person\'s name stays in Channel / Recipient: nothing clears a person\'s typing');
    eq(S.invTransportBlocked(g(), S.jobs[0]), 'dealer', '⚠⚠ and it is not read as the receiving dealer: the dealer arm holds the firearm');
    has(S.invTransportReason(g(), S.jobs[0]), 'still names Marie Delgado (daughter), the person this line was going to', 'the reason names the leftover name');
    has(S.__log.badges.map((b) => b.m).join('\n'), 'Channel / Recipient still names Marie Delgado (daughter)', 'and the change says so at once');
    // The row and the record flag it; Keep the name takes the mark off and keeps the channel.
    has(text(S._renderInvRow(S.jobs[0], g(), {})), 'still names Marie Delgado (daughter)', 'the desk row flags it');
    const panel = S._renderInvPanel(S.jobs[0], g());
    has(panel, "invKeepChannel(8,'g')", 'the record offers Keep the name, wired to the real handler');
    eq(S.invKeepChannel(8, 'g'), true, 'Keep the name');
    eq([g().channel, S.invTransportBlocked(g(), S.jobs[0])], ['Marie Delgado (daughter)', ''], 'the name is kept and now read as the dealer, because a person said so');
    // Retyping the channel retires the flag too; moving back onto Distribute clears it (the name is the recipient again).
    S._invEdit(8, 'g', 'disposition', { value: 'Distribute' });
    S._invEdit(8, 'g', 'disposition', { value: 'Consign' });
    eq(S.invTransportBlocked(g(), S.jobs[0]), 'dealer', 'off Distribute again: held again');
    S._invEdit(8, 'g', 'channel', { value: 'Palm Beach Arms (FFL)' });
    eq([S.invTransportBlocked(g(), S.jobs[0]), g().channelLeftover], ['', undefined], 'a dealer typed in: cleared, and the mark is gone');
    // A line moved off Distribute with no name, or a line never on it, is not flagged.
    S._invEdit(8, 'm', 'disposition', { value: 'Sell' });
    eq(S._getPhotoRef(8, 'm').channelLeftover, undefined, 'a line that was not going to a person is never flagged');
    // The bulk bar: the same writer, and its confirmation names them.
    S._invPick['h'] = 1; S._invPick['k'] = 1;
    S._invBulkApply(8, 'disposition', 'Consign');
    const said = S.__log.badges.map((b) => b.m).pop() || '';
    has(said, '2 of them still name the person they were going to in Channel / Recipient', '⚠ the sweep says so');
    has(said, '#2 Shotgun (Sam Delgado)', 'naming each line and the name');
    eq(S.invTransportBlocked(S._getPhotoRef(8, 'h'), S.jobs[0]), 'dealer', '⚠⚠ a firearm swept off Distribute is held too');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('2 · Removed items offers every removal; Restore gives back the detail shots the bin took with the item', () => {
    const job = PROBATE();
    const removed = [];
    for (let i = 1; i <= 14; i++) removed.push(LINE('r' + i, 20 + i, { deletedAt: 1000 + i, objectName: 'Removed ' + i }));
    const S = desk(['_renderRemovedRows', '_invToggleRemovedAll', 'restoreInventoryItem', 'discardShot'], job, removed.concat([
      LINE('p', 1, { objectName: 'Bar console', driveFileId: 'fp' }),
      { stableId: 'd1', roomIdx: 1, label: 'detail', groupId: 'p', seq: 1, status: 'uploaded', driveFileId: 'fd1', ts: 11 },
      { stableId: 'd2', roomIdx: 1, label: 'detail', groupId: 'p', seq: 2, status: 'uploaded', driveFileId: 'fd2', ts: 12 },
      // Binned on its own, earlier: it stays gone when the item comes back.
      { stableId: 'd3', roomIdx: 1, label: 'detail', groupId: 'p', seq: 3, status: 'uploaded', driveFileId: 'fd3', ts: 13, deletedAt: 500 },
    ]), { _invMoney: (v) => '$' + v, fmtDate2: (d) => String(d || '—') });
    let panel = text(S._renderRemovedRows(8));
    has(panel, 'Removed 14', 'the newest removal is listed');
    lacks(panel, 'Removed 2 ', 'the twelve most recent first');
    has(panel, 'Show all 14', '⚠ and a press shows the rest');
    S._invToggleRemovedAll();
    panel = text(S._renderRemovedRows(8));
    has(panel, 'Removed 1 ', '⚠⚠ every removal has its Restore on screen');
    has(panel, 'Show the 12 most recent', 'and the press goes back');
    // The bin: the photograph and its two live detail shots go together.
    eq(S.discardShot(8, 'p'), true, 'the item shot is binned with its detail shots');
    ok(S._getPhotoRef(8, 'd1').deletedAt && S._getPhotoRef(8, 'd2').deletedAt, 'fixture: both details went with it');
    eq([S._getPhotoRef(8, 'd1').deletedWith, S._getPhotoRef(8, 'd3').deletedWith], ['p', undefined], 'each says what it went with');
    has(text(S._renderRemovedRows(8)), '2 detail shots removed with it', 'Removed items says so');
    S.restoreInventoryItem(8, 'p');
    ok(!S._getPhotoRef(8, 'p').deletedAt, 'Restore gives the item back');
    ok(!S._getPhotoRef(8, 'd1').deletedAt && !S._getPhotoRef(8, 'd2').deletedAt, '⚠⚠ and the detail shots the bin took with it');
    eq(S._getPhotoRef(8, 'd3').deletedAt, 500, '⚠ never one binned on its own');
    // An item binned before P22 (no deletedWith): the details tombstoned in the same press come back.
    const T = desk(['restoreInventoryItem'], job, [
      LINE('q', 1, { deletedAt: 5000 }),
      { stableId: 'e1', label: 'detail', groupId: 'q', deletedAt: 5001 },
      { stableId: 'e2', label: 'detail', groupId: 'q', deletedAt: 1000 }]);
    T.restoreInventoryItem(8, 'q');
    eq([!!T._getPhotoRef(8, 'e1').deletedAt, !!T._getPhotoRef(8, 'e2').deletedAt], [false, true], 'an older bin: the same press only');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('3 · the firearm block names the role; the dead seq branch and the alias are gone', () => {
    const S = desk(['_invFirearmPanelHtml', '_getPhotoRef'], PROBATE(), [GUN('c', 1, { disposition: 'Consign', channel: 'Palm Beach Arms (FFL)' })]);
    const h = text(S._invFirearmPanelHtml(S.jobs[0], S._getPhotoRef(8, 'c')));
    has(h, 'Cleared to carry. Havellin’s named principal alone takes it to Palm Beach Arms (FFL)', 'the named principal, as every other firearm text says');
    lacks(h, 'Anthony Graziano', 'no person named');
    lacks(noComments(fn('_invCell')), "col.key === 'seq'", 'the unreachable seq branch is gone');
    eq(count(SRC, 'removeInventoryManualItem'), 0, 'and the alias with it');
    lacks(noComments(fn('_invPanelCols')).replace(/\s/g, ''), "returnc.key!=='fmv'", 'fixture: the record still never draws the item number');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('4 · the hours log escapes what people typed', () => {
    const doc = domStub({});
    const S = sandbox({ fns: ['renderLogHistory', 'esc', 'fmtHrs'], stubs: { document: doc,
      jobLogEntries: () => [{ id: 1, date: '2026-10-01', activity: '<img src=x onerror=alert(1)>Sorting', members: [{ name: '<b>Eve</b>', role: 'PS', hours: 2 }] }] } });
    S.renderLogHistory(2);
    const h = doc.getElementById('log-history-wrap').innerHTML;
    has(h, '&lt;b&gt;Eve&lt;/b&gt;', '⚠⚠ a crew name is text');
    has(h, '&lt;img src=x onerror=alert(1)&gt;Sorting', '⚠⚠ and so is the activity');
    lacks(h, '<img', 'no markup reaches the page');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('5 · a living client\'s release request says who prepared it once', () => {
    const S = desk(['printApprovalRequest'], LIVING(), [LINE('a', 1, { disposition: 'Donate', channel: 'Goodwill' })]);
    S.printApprovalRequest(2);
    const h = (S.__log.printed[0] || {}).html || '';
    eq(count(h, 'Prepared by Havellin Palm Beach, LLC'), 1, '⚠⚠ once, not twice');
    has(flat(h), 'Everything leaving the property, for your sign-off · Prepared by Havellin Palm Beach, LLC', 'the living head');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('6 · receipts group by the name however typed; a receipt whose signer has no line now stays listed', () => {
    const job = PROBATE({ signedRecords: [{ id: 's1', kind: 'receipt', ref: 'Sam Jones', stableIds: ['gone'], filedAt: 1, fileUrl: 'https://x/s1' }] });
    const S = desk(['invReceiptGroups', '_renderInvReleasesCard'], job, [
      LINE('a', 1, { disposition: 'Distribute', channel: 'Marie Delgado', dispDate: '2026-10-01' }),
      LINE('b', 2, { disposition: 'Distribute', channel: '  marie   DELGADO ', dispDate: '2026-10-01' })]);
    const gs = S.invReceiptGroups(S.jobs[0], S._photoRefs[8]);
    eq(gs.filter((g) => !g.orphan).map((g) => [g.name, g.released.length]), [['Marie Delgado', 2]], 'two spellings, one recipient, the first spelling kept');
    const orphan = gs.filter((g) => g.orphan)[0] || {};
    eq([orphan.name, (orphan.filed || []).length], ['Sam Jones', 1], '⚠⚠ the receipt Sam Jones signed is a group of its own');
    has(text(S._renderInvReleasesCard(S.jobs[0], S._photoRefs[8])), 'Sam Jones No line on the inventory goes to them now; the receipt they signed stays here and in Drive.',
        'and the card lists it, labelled');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('7 · the desk\'s Summary adds money to the cent; the workbook prints cents', () => {
    const job = PROBATE();
    const lines = [1, 2, 3].map((n) => LINE('s' + n, n, { disposition: 'Sell', gross: 0.004, fees: 0.004, fmv: 0.004 }));
    const S = desk(['_renderInventorySummary', 'dispositionLedger'], job, lines, { _invShowRoll: true });
    const h = text(S._renderInventorySummary(S.jobs[0], lines));
    const L = S.dispositionLedger(8, lines);
    eq(L.gross, 0, 'fixture: the ledger adds the same lines to $0');
    has(h, 'Gross Proceeds $0 ', '⚠⚠ the Summary agrees with the ledger (it read $0.01 off the raw floats)');
    has(h, 'Fees $0 ', 'and the fees');
    const gs = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'saveInventory.gs'), 'utf8');
    eq(count(gs, "'$#,##0'"), 0, '⚠ the workbook never formats money to the whole dollar');
    ok(count(gs, "setNumberFormat('$#,##0.00')") >= 7, 'every money format carries cents (the columns and the Summary)');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('8 · the ledger card reads the job it is given; living work asks for the client\'s signed ledger', () => {
    const onFile = PROBATE();
    const S = desk(['_renderLedgerCard', 'ledgerDerivedLines'], onFile, [LINE('a', 1, { disposition: 'Sell', gross: 100 })]);
    const handed = PROBATE({ matterType: 'trust' });
    has(text(S._renderLedgerCard(handed, S._photoRefs[8])), 'Net to the trust', '⚠⚠ the figures answer from the job handed over, as the rest of the card does');
    const V = desk(['ledgerDerivedLines'], LIVING(), [LINE('a', 1, { disposition: 'Donate' })]);
    const l = V.ledgerDerivedLines(2, V.jobs[0], 'p4').filter((x) => x.key === 'ledger_signed')[0] || {};
    eq([l.ok, l.label], [false, 'Disposition Ledger signed by the client'], '⚠⚠ living work asks for the client\'s signed copy');
    has(l.detail, 'have the client sign it', 'worded for the client');
    V.jobs[0].signedRecords = [{ id: 'x', kind: 'ledger', ref: 'ledger', filedAt: Date.UTC(2026, 9, 2, 16), filedBy: 'Ashley Jerome' }];
    eq((V.ledgerDerivedLines(2, V.jobs[0], 'p4').filter((x) => x.key === 'ledger_signed')[0] || {}).ok, true, 'and is satisfied by the filed copy');
    const E = desk(['ledgerDerivedLines'], LIVING(), []);
    eq(E.ledgerDerivedLines(2, E.jobs[0], 'p4').map((x) => x.key), [], 'no inventory, no ledger to sign: no line');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('9a · a recorded fiduciary\'s name with a comma in it is one signer', () => {
    const job = TRUST({ executor: 'Smith, John', coFiduciaries: [{ id: 'c1', name: 'Jane Counsel, Esq.', role: 'Co-trustee' }] });
    const S = desk(['invApprovalSigners', 'invApprovalComplete', 'invApprovalSignedText', 'invApprovalMissing'], job, []);
    const ref = { authBy: 'Smith, John; Jane Counsel, Esq.', approvalDate: '2026-10-01' };
    eq(S.invApprovalSigners(ref, S.jobs[0]).map((s) => s.name), ['Smith, John', 'Jane Counsel, Esq.'], '⚠⚠ each recorded name is matched whole');
    eq(S.invApprovalComplete(ref, S.jobs[0]), true, '⚠⚠ so the approval can be complete');
    eq(S.invApprovalSigners({ authBy: 'Smith, John (2026-10-01); Jane Counsel, Esq. (2026-10-08)', approvalDate: '2026-10-08' }, S.jobs[0]).map((s) => [s.name, s.date]),
       [['Smith, John', '2026-10-01'], ['Jane Counsel, Esq.', '2026-10-08']], 'with each signer\'s own day');
    eq(ref.authBy, 'Smith, John; Jane Counsel, Esq.', 'what is stored is untouched');
    eq(S.invApprovalSigners(ref).map((s) => s.name).length, 4, 'fixture: without the job, the rule P20 wrote (split on the commas)');
    eq(S.invApprovalSigners({ authBy: 'Ruth Adler, Daniel Adler' }, TRUST()).map((s) => s.name), ['Ruth Adler', 'Daniel Adler'], 'names with no separator in them split as before');
  });

  G('9b · an estate line already going to one of Havellin\'s people is flagged on the row, the record and the request', () => {
    const S = desk(['invReleaseCautions', '_renderInvRow', '_renderInvPanel', 'printApprovalRequest', '_getPhotoRef'], PROBATE(),
      [LINE('a', 1, { disposition: 'Distribute', channel: 'Ashley Jerome' })]);
    const a = S._getPhotoRef(8, 'a');
    eq(S.invReleaseCautions(a, 8).map((c) => c.key), ['staffEstate'], '⚠⚠ the estate mirror, through the one rule');
    has(text(S._renderInvRow(S.jobs[0], a, {})), 'Ashley Jerome works with Havellin', 'the desk row');
    has(text(S._renderInvPanel(S.jobs[0], a)), 'Cannot go to Havellin’s people.', 'the line\'s record');
    S.printApprovalRequest(8);
    const t = flat((S.__log.printed[0] || {}).html);
    has(t, 'Property recorded as going to someone who works with Havellin', '⚠⚠ the request names it above the table');
    has(t, 'GOING TO ASHLEY JEROME, WHO WORKS WITH HAVELLIN', 'and on the line');
    const V = desk(['invReleaseCautions', '_getPhotoRef'], LIVING(), [LINE('a', 1, { disposition: 'Distribute', channel: 'Ashley Jerome' })]);
    eq(V.invReleaseCautions(V._getPhotoRef(2, 'a'), 2).map((c) => c.key), ['staffRecipient'], 'a living client keeps its own caution, not the estate\'s');
  });

  G('9c · a charity\'s receipt or a filed statement covering a line records it as gone', () => {
    const base = { disposition: 'Donate', channel: 'Goodwill', authBy: 'Ruth Adler', approvalDate: '2026-10-01' };
    const J = (recs, stmts) => TRUST({ signedRecords: recs || [], proceedsStatements: stmts || [] });
    const S = desk(['invRecordedGone', 'invRatificationOwed', 'invGoneText', '_getPhotoRef'], J(), [LINE('a', 1, base)]);
    const a = S._getPhotoRef(7, 'a');
    eq(S.invRecordedGone(a, J()), false, 'fixture: nothing filed, not gone');
    const don = J([{ id: 'r1', kind: 'donation', ref: 'Goodwill', stableIds: ['a'], filedAt: 1 }]);
    eq(S.invRecordedGone(a, don), true, '⚠⚠ a charity\'s receipt covering it');
    eq(S.invRatificationOwed(a, don), true, 'so a line Daniel never approved owes ratification');
    has(S.invGoneText(a, don), 'Goodwill’s receipt is on file', 'and says how it went');
    const sold = Object.assign({}, a, { disposition: 'Sell' });
    const st = { id: 'ps1', vendor: 'Kodner Galleries', lines: [{ stableId: 'a' }], gross: 100, fees: 0, netPaid: 100 };
    eq(S.invRecordedGone(sold, J([], [st])), false, 'a statement not filed is not yet the partner\'s paper');
    const filed = J([{ id: 'r2', kind: 'statement', ref: 'ps1', filedAt: 1 }], [st]);
    eq(S.invRecordedGone(sold, filed), true, '⚠⚠ a filed statement listing the line');
    eq(S.invRecordedGone(sold, J([{ id: 'r2', kind: 'statement', ref: 'ps1', filedAt: 1 }], [Object.assign({}, st, { voidedAt: 5 })])), false, 'never a voided one');
  });

  G('9d · the Authorized By box reads like a person and saves the stored form', () => {
    const TWO = 'Ruth Adler (2026-10-01); Daniel Adler (2026-10-08)';
    const S = desk(['_invInput', '_invEdit', '_getPhotoRef'], TRUST(), [LINE('a', 1, { authBy: TWO, approvalDate: '2026-10-08' })]);
    const col = { key: 'authBy', header: 'Authorized By', kind: 'manage', edit: 'text', group: 'disp' };
    has(decl('INVENTORY_COLUMNS'), "{key:'authBy',       header:'Authorized By',       kind:'manage',  edit:'text'", 'fixture: the column as the app defines it');
    const box = S._invInput(7, S._getPhotoRef(7, 'a'), col, S.jobs[0]);
    has(box, 'value="Ruth Adler (Oct 1, 2026); Daniel Adler (Oct 8, 2026)"', '⚠⚠ the box shows each day as a reader writes it');
    S._invEdit(7, 'a', 'authBy', { value: 'Ruth Adler (Oct 1, 2026); Daniel Adler (Oct 8, 2026)' });
    eq(S._getPhotoRef(7, 'a').authBy, TWO, '⚠ saved as shown: the stored form is kept exactly');
    S._invEdit(7, 'a', 'authBy', { value: 'Ruth Adler (Oct 1, 2026); Daniel Adler (Oct 9, 2026)' });
    eq(S._getPhotoRef(7, 'a').authBy, 'Ruth Adler (2026-10-01); Daniel Adler (2026-10-09)', '⚠⚠ a corrected day is stored as an ISO day');
    ok(S._getPhotoRef(7, 'a').authBySetAt > 0, 'a hand edit stamps the list (for the merge)');
    const P = desk(['_invInput', '_getPhotoRef'], TRUST(), [LINE('b', 2, { authBy: 'Ruth Adler; Daniel Adler', approvalDate: '2026-10-02' })]);
    has(P._invInput(7, P._getPhotoRef(7, 'b'), col, P.jobs[0]), 'value="Ruth Adler; Daniel Adler"', 'the plain form shows as stored (the date has its own box)');
  });

  G('9e · a signing act whose open lines miss different people says each line\'s own gap', () => {
    const job = TRUST({ coFiduciaries: [{ id: 'cf1', name: 'Daniel Adler', role: 'Co-trustee' }, { id: 'cf2', name: 'Sam Adler', role: 'Co-trustee' }] });
    const S = desk(['_renderInvReleasesCard'], job, [
      LINE('a', 1, { disposition: 'Sell', authBy: 'Ruth Adler; Daniel Adler', approvalDate: '2026-10-01' }),
      LINE('b', 2, { disposition: 'Sell', authBy: 'Ruth Adler', approvalDate: '2026-10-01' })]);
    const t = text(S._renderInvReleasesCard(S.jobs[0], S._photoRefs[7]));
    has(t, '#1: Sam Adler has not approved it', '⚠⚠ the first line names its own missing signer');
    has(t, '#2: Daniel Adler and Sam Adler have not approved it', '⚠⚠ and the second its own');
    const U = desk(['_renderInvReleasesCard'], job, [
      LINE('a', 1, { disposition: 'Sell', authBy: 'Ruth Adler', approvalDate: '2026-10-01' }),
      LINE('b', 2, { disposition: 'Sell', authBy: 'Ruth Adler', approvalDate: '2026-10-01' })]);
    lacks(text(U._renderInvReleasesCard(U.jobs[0], U._photoRefs[7])), '#1:', 'lines missing the same people keep the one sentence');
  });

  G('9f · the worklist points at Record approval; the request agrees with its count', () => {
    const w = noComments(fn('printAppraisalWorklist'));
    has(w, 'Record approval</strong> on Job Admin', '⚠ the withheld-firearms block names the control');
    lacks(w, 'Authorized By and Approval Date', 'not the raw boxes');
    const S = desk(['printApprovalRequest'], PROBATE(), [LINE('a', 1, { disposition: 'Sell', channel: 'Kodner' })]);
    S.printApprovalRequest(8);
    const t = flat((S.__log.printed[0] || {}).html);
    has(t, 'the item listed below is ready to be released from the property.', '⚠ one line: singular');
    const R = desk(['printApprovalRequest'], PROBATE(), [LINE('a', 1, { disposition: 'Sell', channel: 'Kodner' }),
      LINE('b', 2, { disposition: 'Sell', dispDate: '2026-10-02' })]);
    R.printApprovalRequest(8);
    const rt = flat((R.__log.printed[0] || {}).html);
    has(rt, 'This item left the property before the Personal Representative had approved its release in writing. It is listed apart from the item above, for the signature of Tripp Butler, which ratifies the release; nothing is undone.',
        '⚠ one line gone, one asked: singular throughout');
  });

  G('9g · the bulk bar says what changed: Keep, Move, Hold and Mark reviewed', () => {
    const S = desk(['_invBulkApply'], PROBATE(), [LINE('a', 1), LINE('b', 2)]);
    S._invPick.a = 1; S._invPick.b = 1;
    S._invBulkApply(8, 'disposition', 'Keep');
    has(S.__log.badges.map((b) => b.m).pop(), 'Keep set on 2 items', '⚠⚠ Keep is named, never "2 items updated"');
    S._invBulkApply(8, 'disposition', 'Hold');
    has(S.__log.badges.map((b) => b.m).pop(), 'Hold set on 2 items', 'Hold too');
    S._invBulkApply(8, 'reviewed', true);
    eq(S.__log.badges.map((b) => b.m).pop(), '2 items marked reviewed.', '⚠⚠ Mark reviewed says so');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('10 · two devices recording different signers keep both, on the app and on the server alike', () => {
    const A = sandbox({ fns: ['mergeMediaItems', 'mergeCustodyLogs', '_custodyEventId', 'invStickyValue', '_invHasVal',
      'invMergeApprovals', '_invApprovalEntries', '_invApprovalSetAt'], vars: ['INV_STICKY_FIELDS'] });
    const gs = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'saveInventory.gs'), 'utf8');
    const grab = (name) => (gs.match(new RegExp('function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}')) || [''])[0];
    const gctx = {};
    vm.createContext(gctx);
    vm.runInContext([(gs.match(/var INV_STICKY_FIELDS = \[[\s\S]*?\];/) || [''])[0], grab('_invHasVal'), grab('_invStickyValue'),
      grab('_custodyEventId'), grab('_mergeCustodyLogs'), grab('_invApprovalEntries'), grab('_invApprovalSetAt'), grab('_invMergeApprovals'),
      grab('_mergeMediaItems')].join('\n\n'), gctx);
    const it = (over) => Object.assign({ stableId: 'a', label: 'inventory' }, over);
    const both = (x, y) => {
      const a = attempt(() => A.mergeMediaItems([x], [y])[0]), g = attempt(() => gctx._mergeMediaItems([x], [y])[0]);
      eq(JSON.stringify(a.val), JSON.stringify(g.val), 'the app and the server agree');
      return a.val || {};
    };
    let m = both(it({ updatedAt: 10, authBy: 'Ruth Adler', approvalDate: '2026-10-01', authAdds: { 'ruth adler': 10 } }),
                 it({ updatedAt: 20, authBy: 'Daniel Adler', approvalDate: '2026-10-08', authAdds: { 'daniel adler': 20 } }));
    eq([m.authBy, m.approvalDate], ['Daniel Adler (2026-10-08); Ruth Adler (2026-10-01)', '2026-10-08'], '⚠⚠ both co-trustees\' signatures survive, each with their day');
    m = both(it({ updatedAt: 20, authBy: 'Daniel Adler', approvalDate: '2026-10-01' }), it({ updatedAt: 10, authBy: 'Ruth Adler', approvalDate: '2026-10-01' }));
    eq(m.authBy, 'Daniel Adler; Ruth Adler', 'the same day: written plainly (and records with no stamps union too)');
    // A correction by hand is not undone by a stale copy, whichever is newer overall.
    m = both(it({ updatedAt: 30, authBy: 'Ruth Adler', approvalDate: '2026-10-01', authBySetAt: 30 }), it({ updatedAt: 10, authBy: 'Rut Adler', approvalDate: '2026-10-01' }));
    eq(m.authBy, 'Ruth Adler', '⚠⚠ a hand correction stands against an older copy');
    m = both(it({ updatedAt: 40, condition: 'Good', authBy: 'Rut Adler', approvalDate: '2026-10-01' }), it({ updatedAt: 30, authBy: 'Ruth Adler', approvalDate: '2026-10-01', authBySetAt: 30 }));
    eq(m.authBy, 'Ruth Adler', '⚠⚠ and against a stale copy that won the item on another field');
    eq(m.condition, 'Good', 'which keeps its own edit');
    m = both(it({ updatedAt: 30, authBy: 'Ruth Adler', approvalDate: '2026-10-01', authBySetAt: 30 }),
             it({ updatedAt: 35, authBy: 'Rut Adler; Daniel Adler (2026-10-09)', approvalDate: '2026-10-09', authAdds: { 'daniel adler': 35 } }));
    eq(m.authBy, 'Ruth Adler (2026-10-01); Daniel Adler (2026-10-09)', '⚠ a signature recorded after the correction is kept beside it; the corrected name is not');
    m = both(it({ updatedAt: 30, authBy: '', clearedAt: { authBy: 30 } }), it({ updatedAt: 10, authBy: 'Ruth Adler', approvalDate: '2026-10-01' }));
    eq(m.authBy, '', 'a deliberate clear still wins over an older copy');
    m = both(it({ updatedAt: 2, condition: 'Good' }), it({ updatedAt: 1, authBy: 'Tripp Butler', approvalDate: '2026-09-10' }));
    eq([m.authBy, m.approvalDate], ['Tripp Butler', '2026-09-10'], 'the sticky rule still fills a blank');
    m = both(it({ updatedAt: 2, authBy: 'Smith, John', approvalDate: '2026-10-01' }), it({ updatedAt: 1, authBy: 'Smith, John', approvalDate: '2026-10-01' }));
    eq(m.authBy, 'Smith, John', 'a comma inside a name is never split by the merge');
    has(noComments(fn('invSaveApproval')), 'ref.authAdds[e.key] = _now', 'Record approval stamps each name it adds');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('11 · every field P22 writes on a line survives a reload (savePhotoRefs is a whitelist)', () => {
    const c = closure(['loadPhotoRefs', 'savePhotoRefs'], ['_warnPhotoStoreFull']);
    const m = sandbox({ fns: c.fns, vars: c.vars, stubs: { _warnPhotoStoreFull: () => {} } });
    m._photoRefs[7] = [LINE('q', 1, { channelLeftover: 'Marie Delgado', authBySetAt: 30, authAdds: { 'ruth adler': 20 } }),
                       { stableId: 'd', label: 'detail', groupId: 'q', deletedAt: 5, deletedWith: 'q' }];
    m.savePhotoRefs(7); m._photoRefs[7] = []; m.loadPhotoRefs(7);
    const q = (m._photoRefs[7] || [])[0] || {}, d = (m._photoRefs[7] || [])[1] || {};
    eq([q.channelLeftover, q.authBySetAt, q.authAdds && q.authAdds['ruth adler'], d.deletedWith], ['Marie Delgado', 30, 20, 'q'],
       '⚠⚠ the leftover name, the merge\'s stamps and what a detail shot was binned with are all kept');
  });
};
