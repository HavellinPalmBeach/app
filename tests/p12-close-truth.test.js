'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P12 of the desk audit (2026-10-28): THE CLOSE AND THE LEDGER TELL THE WHOLE TRUTH.
// audits/2026-10-27-desk/PLAN.md, P12; findings VAL-14, NEW-04, EST-14, REL-08, DOC-11, LIV-13, VAL-26, DOC-12, LIV-21, EST-13,
// DOC-13, LIV-11, DOC-27. Anthony's answers: Ask 12 (the sign-off reads "approved as the record to date" while the paper is IN
// PROGRESS, "the final record" once every flagged line is checked and the list read) and Ask 13 (an estate line that left before
// every fiduciary signed prints the gap, and a sentence above the ledger's sign-off says the signature ratifies it).
//
//   A  One DOM-free list of what the close leaves open (closeReadiness), in the plan's order, each entry with its count and its
//      first item numbers; read by Close job's question, the Closing bar at the close and the Close-out card (readers counted).
//   B  Close job's question names it all, flags only: the refusals are jobCloseBlockers' as before; it reads the inventory first.
//   C  The Disposition Ledger: Authorized by reads "ratification owed" or "signed so far by …; still to sign: …", gap lines above
//      the table, "left the property" only for what has left, the sign-off's words by the stamp's state, the ratification sentence.
//   D  Signed copies record who signed, and go green only when every fiduciary has.
//   E  Each signer in their own role; a schedule still DRAFT says so on the Closing bar.
//   F  The Contents Record: Hold has no destination yet, "left" only for what left, its sign-off's words, its no-values stamp.
//   G  The package's Release Approvals record lists what the ledger lists.
//   R  P12's review (2026-10-28): Close job reads first on every press, names the client, is never asked over another client and
//      says a failed read; the ledger's signers and Ask 13's sentence in a capacity (the schedules' card too); "the final record"
//      never under the page's own "not yet complete"; the package's record carries the ledger's second sentence.
// Driven through the real functions, lifted with their call graph from the source; only the boundaries are stubbed.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source, fn, decl, domStub, matchBrace } = require('./harness');

const SRC = source();
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
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
const STATE = ['jobs', '_photoRefs', 'estimateStore', 'jobPlanStore', 'changeOrders', 'jobLogs', '_invCloudSeen', '_invCloudFailed', 'vendorDirectory'];
function lift(roots, stop, stubs) {
  // P6: every act across the inventory reads the sheet first; these checks are of the papers, so the read has landed.
  stubs = Object.assign({ invReadFirst: () => false }, stubs || {});
  const c = closure(roots, (stop || []).concat(Object.keys(stubs), STATE, ['_printDocument']));
  return sandbox({ fns: c.fns, vars: c.vars, stubs });
}
const inEastern = (body) => { const prev = process.env.TZ; process.env.TZ = 'America/New_York'; try { return body(); } finally { process.env.TZ = prev; } };
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.stack || e).split('\n').slice(0, 3).join(' | ') }; } }
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&middot;/g, '·').replace(/&rsquo;/g, '’')
  .replace(/&mdash;/g, '—').replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”').replace(/&#10003;/g, '✓').replace(/&#9888;/g, '⚠')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/\s+/g, ' ').replace(/ ([:;,.)])/g, '$1').trim();
const count = (h, n) => String(h).split(n).length - 1;
// Live code only: comments stripped line by line, held to most of the file (CLAUDE.md, Testing).
const LIVE = SRC.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
const BODIES = (() => {
  const out = {};
  const re = /(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g;
  let m;
  while ((m = re.exec(SRC))) {
    const open = SRC.indexOf('{', re.lastIndex);
    const close = matchBrace(SRC, open);
    if (close > open && !out[m[2]]) out[m[2]] = codeOnly(SRC.slice(m.index, close + 1));
  }
  return out;
})();
const callers = (name) => Object.keys(BODIES).filter((k) => k !== name && new RegExp('\\b' + name + '\\s*\\(').test(BODIES[k])).sort();

// ── Fixtures ────────────────────────────────────────────────────────────────
const SYNC = 'https://script.google.com/macros/s/P12CLOSE/exec';
const T0 = Date.parse('2026-10-20T15:00:00Z');
const ESTATE = (o) => Object.assign({
  id: 7, hvlId: 'HVL-0007', name: 'Margaret Ashworth', svc: 'cleanout', status: 'active', won: true, approved: true,
  addr: '12 Ocean Blvd', city: 'Palm Beach', tc: 'Ashley Jerome', agrApprovedBy: 'Anthony Graziano',
  matterType: 'probate', docTier: 'values', deathDate: '2026-08-01',
  executor: 'Thomas Ashworth', executorRole: 'Personal Representative', executorEmail: 'thomas@ashworth.example',
  coFiduciaries: [{ id: 'c1', name: 'Nora Ashworth', role: 'Co-Personal Representative', email: 'nora@ashworth.example' }],
  driveFolder: 'https://drive.google.com/drive/folders/ROOT7', driveSubfolders: { 'Estate Inventory': 'INV7', 'Signed Records': 'SR7' },
  docState: {}, at: {}, updatedAt: T0, payments: [{ uid: 'd1', stage: 'deposit', amount: 5000, receivedOn: '2026-10-01', method: 'wire' },
    { uid: 'm1', stage: 'midpoint', amount: 2500, receivedOn: '2026-10-10', method: 'wire' }],
}, o || {});
const LIVING = (o) => ESTATE(Object.assign({ name: 'Robert Hale', svc: 'home_cleanout', matterType: '', docTier: '', deathDate: '',
  executor: '', executorRole: '', executorEmail: '', coFiduciaries: [] }, o || {}));
const ROW = (id, over) => Object.assign({
  stableId: id, label: 'inventory', collId: null, roomIdx: 1, status: 'uploaded', ts: T0, updatedAt: T0, driveFileId: 'F' + id,
  objectName: 'Sideboard', category: 'Furniture', qty: 1, condition: 'Good', fmv: '', namedBy: 'desk',
}, over || {});
const BOTH = 'Thomas Ashworth; Nora Ashworth';
// The audit's Ashworth shape: a sale both signed for and gone; lamps donated with no approval (ratification owed); a clock nobody
// decided; a rug only Thomas has signed for; a shotgun to a dealer unapproved; a bookcase to charity with nobody named, still in
// the house; a photograph not yet named; a Bible kept.
const LINES = (o) => {
  const opt = Object.assign({ undecided: true }, o || {});
  const rows = [
    ROW('a', { itemNo: 1, objectName: 'Sargent portrait', category: 'Art', fmv: 900, disposition: 'Auction', channel: 'Kodner Galleries', gross: 1000, fees: 250, dispDate: '2026-10-18', authBy: BOTH, approvalDate: '2026-10-15' }),
    ROW('b', { itemNo: 2, objectName: 'Pair of brass table lamps', fmv: 80, disposition: 'Donate', channel: 'Goodwill Palm Beach', dispDate: '2026-10-18' }),
    ROW('d', { itemNo: 4, objectName: 'Tabriz rug', fmv: 400, disposition: 'Consign', channel: 'Palm Consign', authBy: 'Thomas Ashworth', approvalDate: '2026-10-21' }),
    ROW('e', { itemNo: 5, objectName: 'Remington 870 shotgun', category: 'Firearms', fmv: 300, disposition: 'Sell', channel: 'Gulfstream Firearms', namedBy: 'agent' }),
    ROW('f', { itemNo: 6, objectName: 'Oak bookcase', fmv: 60, disposition: 'Donate', channel: '' }),
    ROW('h', { itemNo: 8, objectName: 'Family Bible', fmv: 20, disposition: 'Keep', channel: '' }),
  ];
  if (opt.undecided) {
    rows.push(ROW('c', { itemNo: 3, objectName: 'Mantel clock', fmv: 40, disposition: '' }));
    rows.push(ROW('g', { itemNo: 7, objectName: '', namedBy: '', fmv: '', disposition: '' }));
  }
  return rows;
};

module.exports = function ({ group, ok, eq, has, lacks }) {
  const G = (name, body) => { group(name); try { inEastern(body); } catch (e) { ok(false, name + ' — threw: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); } };

  const ROOTS = ['closeReadiness', 'closeOpenWorkFlag', 'applyJobTransition', 'activateOrCycle', 'printDispositionLedger', 'probatePackageRecordHtml',
    'printContentsRecord', 'dispositionRecord', 'deskFoldState', '_renderLedgerCard', '_renderSignedSchedulesCard', '_renderContentsCard', 'signedCopyControlHtml',
    'fileSignedCopyFromInput', 'scheduleSignLines', 'renderCloseoutBody', 'closeReadinessHtml', '_closeReadyRepaint', 'ledgerDerivedLines', 'ledgerCloseFlag',
    'contentsCloseFlag', 'signedScheduleRows', 'scheduleDraftState', 'invAuthorityText', 'invStampReviewed', 'signedCopySignState', 'agreementCoSignState',
    'fiduciaryCapacity', 'invListSeen'];
  function rig(job, rows, extra) {
    const log = { asked: [], badges: [], filed: [], reads: [], saves: 0 };
    const c = lift(ROOTS, ['savePhotoRefs', 'saveJobs', 'syncJobToSheets', 'showSyncBadge', '_docNotice', 'renderInventoryTab', 'fileSignedCopy',
      'fileDispositionLedger', 'fileContentsRecord', 'fileIncidentRecord', 'fileAccessRecord', 'openJobPlanFor', '_dashRedraw', 'renderClientDashboard',
      'invReadQuiet', 'loadPhotoRefs', 'renderVendorScorecard'], Object.assign({
        savePhotoRefs() {}, saveJobs() { log.saves++; }, syncJobToSheets() {}, showSyncBadge(m) { log.badges.push(String(m)); }, _docNotice() {},
        renderInventoryTab() {}, fileSignedCopy(jid, kind, meta, file, cb) { log.filed.push({ kind, meta }); if (cb) cb(true, 'ok', {}); return true; },
        fileDispositionLedger() {}, fileContentsRecord() {}, fileIncidentRecord() {}, fileAccessRecord() {}, openJobPlanFor() { return false; },
        _dashRedraw() { return true; }, renderClientDashboard() {}, loadPhotoRefs() {}, renderVendorScorecard: () => '<div class="vsc"></div>',
        invReadQuiet(jid, go, failed) { log.reads.push({ go, failed }); return true; },
        confirm(m) { log.asked.push(String(m)); return true; }, alert() {}, _todayStr: () => '2026-10-28',
        SHEETS_SYNC_URL: SYNC, document: domStub({}), jobs: [job], _photoRefs: { 7: rows }, estimateStore: {}, jobPlanStore: {},
        _invCloudSeen: { 7: true }, _invCloudFailed: {}, vendorDirectory: [],
      }, extra || {}));
    c.jobs = [job]; c._photoRefs = { 7: rows }; c._invCloudSeen = { 7: true }; c._invCloudFailed = {};
    if (extra && extra.estimateStore) c.estimateStore = extra.estimateStore;
    if (extra && extra._invCloudSeen) c._invCloudSeen = extra._invCloudSeen;
    return { c, log, job, rows };
  }
  const keys = (CR) => CR.items.map((x) => x.key);
  const item = (CR, k) => CR.items.filter((x) => x.key === k)[0] || {};

  // ── A ────────────────────────────────────────────────────────────────────
  G('A · one list of what the close leaves open, in the plan\'s order, each with its count and first item numbers', () => {
    const r = rig(ESTATE(), LINES());
    const got = attempt(() => r.c.closeReadiness(7, r.job));
    ok(got.ok, 'closeReadiness answers (' + (got.err || 'ok') + ')');
    const CR = got.val || { items: [] };
    eq(CR.unread, false, 'fixture: the inventory is read');
    // The plan's order: no disposition, not named, nobody named, approvals (firearms first), ratifications, receipts, donations,
    // signed approvals not filed, sold lines and statements, appraisals, schedules, the ledger, the hours, the read.
    const order = ['undecided', 'unnamed', 'norecip', 'approval', 'ratify', 'receipt', 'donation', 'apprfile', 'sold_disagree', 'sold_unlisted',
      'stmt_unfiled', 'sold_twice', 'appr_pending', 'appr_report', 'appr_out', 'schedule', 'signed', 'hours', 'read'];
    const ks = keys(CR).filter((k) => k !== 'rooms');
    eq(ks.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b)), ks, '⚠⚠ the entries come in the plan\'s order: ' + ks.join(', '));
    ['undecided', 'unnamed', 'norecip', 'approval', 'ratify', 'donation', 'apprfile', 'sold_unlisted', 'schedule', 'signed'].forEach((k) =>
      ok(ks.indexOf(k) >= 0, 'the Ashworth shape names: ' + k));
    eq([item(CR, 'undecided').n, item(CR, 'undecided').short], [2, '2 lines with no disposition (#3, #7)'], 'two lines with no disposition, by number');
    eq(item(CR, 'unnamed').short, '1 line not yet named (#7)', 'the photograph not yet named');
    eq(item(CR, 'norecip').short, '1 line leaving with nobody named (#6)', 'the bookcase with nobody named');
    eq(item(CR, 'approval').short, '3 items leaving without the written approval needed (#5 (a firearm), #4, #6)', '⚠⚠ approvals owed, the firearm first');
    eq(item(CR, 'ratify').short, '1 ratification owed (#2)', '⚠⚠ the lamps that left with no written approval');
    has(item(CR, 'ratify').long, '1 item left the property before its written approval was complete: a ratification is owed (#2).', '…in the question\'s words');
    eq(item(CR, 'donation').short, '2 donated lines with no charity receipt (#2, #6)', 'donations not receipted');
    eq(item(CR, 'apprfile').long, '2 signed release approvals are not filed to Drive (Oct 21, 2026 by Thomas Ashworth; Oct 15, 2026 by Thomas Ashworth and Nora Ashworth).',
      'the signed approvals not filed, by day and signer');
    eq(item(CR, 'sold_unlisted').short, '3 sold lines on no statement (#1, #4, #5)', 'sold lines on no statement');
    has(item(CR, 'schedule').short, 'Court Inventory still a draft (', '⚠ VAL-26: the schedule is said to be a draft, not "not filed yet"');
    has(item(CR, 'schedule').short, 'not yet valued', '…with the page\'s own reasons (scheduleDraftState)');
    lacks(keys(CR).join(), 'unread', 'nothing is said to be unread');
    eq(item(CR, 'signed').short, 'Disposition Ledger not signed yet', 'the ledger unsigned');
    ok(CR.items.every((x) => typeof x.long === 'string' && x.long.length > 10 && /[.]$/.test(x.long)), 'every entry has a sentence for the question');
    // More than four: the first four numbers, then the count.
    const many = rig(ESTATE(), LINES().concat([3, 4, 5, 6, 7].map((i) => ROW('u' + i, { itemNo: 20 + i, objectName: 'Box ' + i, disposition: '' }))));
    eq(item(many.c.closeReadiness(7, many.job), 'undecided').short, '7 lines with no disposition (#3, #7, #23, #24 and 3 more)', 'the first four item numbers, then how many more');
    // Unread: one entry says so, never "nothing open"; the bar asks for this device's copy anyway (evenUnread).
    const cold = rig(ESTATE(), LINES(), { _invCloudSeen: {} });
    const CC = cold.c.closeReadiness(7, cold.job);
    eq([CC.unread, keys(CC)], [true, ['unread', 'signed']], '⚠ a device that has not read the inventory says so, and still names the ledger (a fact of the job)');
    ok(keys(cold.c.closeReadiness(7, cold.job, null, { evenUnread: true })).indexOf('ratify') >= 0, 'evenUnread: this device\'s copy is named');
    // Nothing open: nothing said.
    const clean = rig(ESTATE({ signedRecords: [{ id: 's1', kind: 'ledger', ref: 'ledger', signedBy: BOTH, filedAt: T0 }], docTier: 'contents' }),
      [ROW('h', { itemNo: 8, objectName: 'Family Bible', disposition: 'Keep' })]);
    eq(keys(clean.c.closeReadiness(7, clean.job)), [], 'a kept Bible and a signed ledger: nothing open');
  });

  G('A · living work: the shotgun, the Hold line, the hours and the Contents Record', () => {
    const rows = [
      ROW('l1', { itemNo: 1, objectName: 'Remington 870 shotgun', category: 'Firearms', disposition: 'Distribute', channel: 'Susan Hale' }),
      ROW('l2', { itemNo: 2, objectName: 'Drop-leaf side table', disposition: 'Hold' }),
      ROW('l3', { itemNo: 3, objectName: 'Desk lamp', disposition: '' }),
      ROW('l4', { itemNo: 4, objectName: 'Armchair', disposition: 'Keep' }),
    ];
    const est = { 7: { estimate: { svc: 'home_cleanout', fixedPrice: false, totTC: 10, totPS: 20 } } };
    const r = rig(LIVING(), rows, { estimateStore: est, jobLogEntries: () => [], hoursLogReady: () => true });
    const CR = r.c.closeReadiness(7, r.job);
    eq(item(CR, 'undecided').short, '2 items with no destination (#2, #3)', '⚠ LIV-11: a line on Hold has no destination yet on living work');
    has(item(CR, 'undecided').long, '1 of them on Hold', '…and the sentence says so');
    has(item(CR, 'undecided').long, 'so the Contents Record’s sign-off is withheld', '…and what it holds');
    eq(item(CR, 'approval').short, '1 item leaving without the written approval needed (#1 (a firearm))', '⚠⚠ NEW-04: the shotgun with no written authority');
    has(item(CR, 'signed').long, 'The Contents Record has no signed copy on file.', '⚠ LIV-13: the Contents Record unsigned, the ledger\'s twin');
    eq(item(CR, 'hours').short, 'no hours logged', '⚠ an hourly job with no hours logged');
    // A fixed price waits on no hours; an estimate not on this device, or a log not loaded, claims nothing.
    eq(keys(rig(LIVING(), rows, { estimateStore: { 7: { estimate: { fixedPrice: true } } }, jobLogEntries: () => [], hoursLogReady: () => true }).c.closeReadiness(7, LIVING())).indexOf('hours'), -1, 'a fixed price: no hours item');
    eq(keys(rig(LIVING(), rows, { jobLogEntries: () => [], hoursLogReady: () => true }).c.closeReadiness(7, LIVING())).indexOf('hours'), -1, 'no estimate on this device: nothing claimed');
    eq(keys(rig(LIVING(), rows, { estimateStore: est, jobLogEntries: () => [], hoursLogReady: () => false }).c.closeReadiness(7, LIVING())).indexOf('hours'), -1, 'the log not loaded: nothing claimed');
    // An estate keeps Hold as a disposition; the read is asked last where a line stands as the agents left it.
    const est2 = rig(ESTATE(), [ROW('k', { itemNo: 1, objectName: 'Settee', disposition: 'Hold' })]);
    eq(keys(est2.c.closeReadiness(7, est2.job)).indexOf('undecided'), -1, 'an estate\'s Hold is a disposition (the plan: Hold counted on living work)');
    const agent = rig(LIVING(), [ROW('v', { itemNo: 1, objectName: 'Wicker chair', disposition: 'Keep', fmv: 40, valuedBy: 'agent', valConf: 'high', valSource: 'General estimate', namedBy: 'agent' })],
      { estimateStore: est, jobLogEntries: () => [], hoursLogReady: () => true });
    const AK = keys(agent.c.closeReadiness(7, agent.job));
    eq(AK.slice(-2), ['hours', 'read'], '⚠ the list not yet read comes last, after the hours (the plan\'s order)');
    has(item(agent.c.closeReadiness(7, agent.job), 'read').long, 'The list has not been read: 1 line stands as the agents left it.', 'in its sentence');
  });

  G('A · one reader, read by the question, the Closing bar and the Close-out card (counted)', () => {
    ok(LIVE.length > SRC.length * 0.5, 'fixture: the comment-stripped source is most of the file');
    eq(callers('closeReadiness'), ['_closeReadyInner', 'closeOpenWorkFlag', 'deskFoldState'], '⚠⚠ closeReadiness: three readers, no second copy');
    eq(callers('closeOpenWorkFlag'), ['applyJobTransition'], 'the question reads it through closeOpenWorkFlag');
    eq(callers('closeReadinessHtml'), ['renderCloseoutBody'], 'the Close-out card draws it');
    eq(callers('ledgerCloseFlag'), ['applyJobTransition', 'closeReadiness'], 'the ledger\'s sentence: in the list, and the fallback of a sandbox without it');
    eq(callers('scheduleDraftState'), ['printCourtInventory', 'printTrustSchedule', 'signedScheduleRows'], '⚠ the DRAFT reasons: one answer, both printers and the list');
    eq(callers('invAuthorityText'), ['printDispositionLedger', 'probatePackageRecordHtml'], 'Authorized by: one answer, the ledger and the package\'s record');
    eq(callers('signedCopySignState').sort(), ['ledgerSignState', 'signedScheduleRows'], 'who signed: one answer, the ledger and the schedules');
    eq(callers('signedByNames').sort(), ['agreementCoSignState', 'signedCopySignState'], 'the one parser of a copy\'s signers');
    eq(callers('_invStampIsReviewed').sort(), ['_invProgressStamp', 'invStampReviewed'], 'REVIEWED: one answer, the stamp and the sign-offs');
    const jt = BODIES.applyJobTransition || '';
    has(jt, 'closeOpenWorkFlag(j)', 'the question asks the list');
    lacks(jt, "finish the rooms and name the recipients", '⚠ NEW-04: never "finish the rooms and name the recipients" whatever was open');
  });

  // ── B ────────────────────────────────────────────────────────────────────
  G('B · Close job\'s question names everything still open, and closes on OK: flags only', () => {
    const r = rig(ESTATE(), LINES());
    r.c.jobCloseBlockers = () => [];
    const done = attempt(() => r.c.applyJobTransition(r.job));
    ok(done.ok, 'the transition answers (' + (done.err || 'ok') + ')');
    eq(r.log.asked.length, 1, 'one question');
    const q = r.log.asked[0] || '';
    has(q, 'Still open:\n• 2 lines have no disposition (#3, #7), so the Disposition Ledger’s sign-off is withheld.', '⚠⚠ the undecided lines, by number');
    has(q, '• 1 item left the property before its written approval was complete: a ratification is owed (#2).', 'the ratification');
    has(q, '• 3 items leaving the property do not have the written approval they need (#5 (a firearm), #4, #6).', 'the approvals, the firearm first');
    has(q, '• The Disposition Ledger has no signed copy on file. It is filed to Drive as the job closes; have Thomas Ashworth and Nora Ashworth each sign it,', 'the ledger, each signer named');
    has(q, 'Closing does not change any of these: finish them, or close now.', 'and that closing changes none of them');
    eq([done.val, r.job.status], [true, 'closed'], '⚠ OK closes the job: a flag, never a refusal');
    // The refusals are jobCloseBlockers' alone, as before.
    const r2 = rig(ESTATE(), LINES());
    r2.c.jobCloseBlockers = () => ['Rate every vendor used on this job'];
    eq(r2.c.applyJobTransition(r2.job), false, 'a vendor unrated: refused, as before');
    eq(r2.log.asked.length, 0, '…before any question');
  });

  G('B · Close job reads the inventory first, quietly, where this device has not; the question follows either way', () => {
    const r = rig(ESTATE(), LINES(), { _invCloudSeen: {} });
    r.c.jobCloseBlockers = () => [];
    r.c.activateOrCycle(7);
    eq([r.log.reads.length, r.log.asked.length, r.job.status], [1, 0, 'active'], '⚠ unread: the press reads the sheet first and asks nothing yet');
    has(r.log.badges.join(' | '), 'Reading the inventory from the sheet first', 'and the toast says why');
    r.c.activateOrCycle(7);
    eq(r.log.reads.length, 1, 'a second press while the read is out does not read again');
    r.c._invCloudSeen[7] = true;
    (r.log.reads[0] || { go() {} }).go(null);
    eq(r.log.asked.length, 1, 'once it lands, the question is asked');
    has(r.log.asked[0] || '', '(#3, #7)', '…naming the lines the read brought');
    const f = rig(ESTATE(), LINES(), { _invCloudSeen: {} });
    f.c.jobCloseBlockers = () => [];
    f.c.activateOrCycle(7);
    (f.log.reads[0] || { failed() {} }).failed();
    has(f.log.asked[0] || '', 'The inventory has not been read from the sheet on this device yet', '⚠ a read that fails is said in the question, never a refusal');
    // RESTATED (P12's review, 2026-10-28): read already, it reads again (a copy read in the morning answered the evening's close);
    // group R holds the rest of the review.
    const w = rig(ESTATE(), LINES());
    w.c.jobCloseBlockers = () => [];
    w.c.activateOrCycle(7);
    eq([w.log.reads.length, w.log.asked.length], [1, 0], 'read already: it reads again first, and asks nothing yet');
    (w.log.reads[0] || { go() {} }).go(null);
    eq(w.log.asked.length, 1, '…then the question');
  });

  // ── C ────────────────────────────────────────────────────────────────────
  G('C · the ledger: Authorized by says what is owed, and the gaps above the table say it in full', () => {
    const r = rig(ESTATE(), LINES());
    const page = attempt(() => r.c.printDispositionLedger(7, { asHtml: true }));
    ok(page.ok && page.val && page.val.html, 'the page is built (' + (page.err || 'ok') + ')');
    const html = (page.val && page.val.html) || '', t = text(html);
    has(t, '2 Pair of brass table lamps Donate Goodwill Palm Beach ratification owed Oct 18, 2026', '⚠⚠ DOC-11: the lamps read "ratification owed", never "—"');
    has(t, '4 Tabriz rug Consign Palm Consign signed so far by Thomas Ashworth (Oct 21, 2026); still to sign: Nora Ashworth', '⚠⚠ REL-08: one of two signed, and who is still to sign');
    has(t, '1 Sargent portrait Auction Kodner Galleries Thomas Ashworth; Nora Ashworth (Oct 15, 2026)', 'a complete approval prints as it was signed');
    has(t, '1 item left the property before its written approval was complete (ratification owed): #2 Pair of brass table lamps.', 'the ratification gap above the table');
    has(t, '3 items leaving the property do not yet have the written approval of every signer below: #4 Tabriz rug, #5 Remington 870 shotgun, #6 Oak bookcase.', 'and the lines short of it');
    ok(html.indexOf('ratification owed)') < html.indexOf('>Item #<'), '…above the table, before anyone signs');
    // "Left the property" only for what has left (DOC-12).
    lacks(t, 'left the property with no recipient recorded: #6', '⚠⚠ DOC-12: the bookcase still in the house is never said to have left');
    has(t, '1 item waits for somebody to be named to take it: #6 Oak bookcase.', '…it waits for a taker, the Releases card\'s words');
    const gone = rig(ESTATE(), LINES().map((x) => x.stableId === 'f' ? Object.assign({}, x, { dispDate: '2026-10-19' }) : x));
    has(text(gone.c.printDispositionLedger(7, { asHtml: true }).html), '1 item left the property with no recipient recorded: #6 Oak bookcase.', 'gone with nobody named: that it left');
  });

  G('C · the ledger\'s sign-off: the record to date while IN PROGRESS, the final record once read (Ask 12); the ratification sentence (Ask 13)', () => {
    const r = rig(ESTATE(), LINES({ undecided: false }));
    const t = text(r.c.printDispositionLedger(7, { asHtml: true }).html);
    has(t, 'Reviewed and approved as the record to date of the disposition of the property listed above.', '⚠⚠ Ask 12: the record to date while the stamp reads IN PROGRESS');
    has(t, 'IN PROGRESS', 'fixture: the stamp reads IN PROGRESS (the shotgun and the rug still need a look)');
    lacks(t, 'as the final record of the disposition', '⚠ never "the final record" under a working copy (DOC-27)');
    has(t, 'By signing below, each signer also ratifies the release of the item marked ratification owed above (#2), which left the property before every signer’s written approval was recorded.',
      '⚠⚠ Ask 13: the ratification sentence above the sign-off');
    ok(t.indexOf('By signing below') < t.indexOf('Sign-off'), '…above the sign-off');
    // Every line checked, nothing standing: the final record.
    // RESTATED (P12's review, 2026-10-28): "the final record" also needs the page's own gap block empty, and a sold line on no proceeds
    // statement is a gap there, so the sale's statement is recorded (STMT, agreeing with the line).
    const all = [ROW('a', { itemNo: 1, objectName: 'Sargent portrait', disposition: 'Auction', channel: 'Kodner Galleries', gross: 1000, fees: 250, dispDate: '2026-10-18', authBy: BOTH, approvalDate: '2026-10-15' }),
      ROW('h', { itemNo: 8, objectName: 'Family Bible', disposition: 'Keep' })];
    const STMT = () => [{ id: 'ps1', vendor: 'Kodner Galleries', statementDate: '2026-10-20', lines: [{ stableId: 'a', itemNo: 1 }], gross: 1000, fees: 250, netPaid: 750 }];
    const fin = rig(ESTATE({ docTier: 'contents', proceedsStatements: STMT() }), all);
    const ft = text(fin.c.printDispositionLedger(7, { asHtml: true }).html);
    has(ft, 'REVIEWED', 'fixture: every line checked');
    has(ft, 'Reviewed and approved as the final record of the disposition of the property listed above.', 'REVIEWED: the final record');
    lacks(ft, 'ratifies', 'nothing left early: no ratification sentence');
    // A line standing as the agents left it: the final record only once the list is read (current).
    const stand = all.concat([ROW('s', { itemNo: 9, objectName: 'Wicker chair', disposition: 'Keep', fmv: 40, valuedBy: 'agent', valConf: 'high', valSource: 'General estimate', namedBy: 'agent' })]);
    const sr = rig(ESTATE({ docTier: 'contents', proceedsStatements: STMT() }), stand);
    has(text(sr.c.printDispositionLedger(7, { asHtml: true }).html), 'as the record to date', 'a line standing, the list unread: the record to date');
    sr.job.invRead = { at: T0, by: 'Anthony Graziano', seen: sr.c.invListSeen(7) };
    has(text(sr.c.printDispositionLedger(7, { asHtml: true }).html), 'as the final record', '…read since it last changed: the final record');
    eq(sr.c.invStampReviewed(stand, { namesOnly: true, fc: sr.c.invAcceptCtx(sr.job) }), true, 'invStampReviewed answers as the stamp reads');
    // One signer: the sentence names their role; every number, never "and N more".
    const many = LINES({ undecided: false }).concat([10, 11, 12, 13, 14, 15, 16].map((i) => ROW('x' + i, { itemNo: i, objectName: 'Box ' + i, disposition: 'Junk', channel: 'Hauler', dispDate: '2026-10-19' })));
    const one = rig(ESTATE({ coFiduciaries: [] }), many);
    const ot = text(one.c.printDispositionLedger(7, { asHtml: true }).html);
    has(ot, 'By signing below, the Personal Representative also ratifies the release of the 8 items marked ratification owed above (#2, #10, #11, #12, #13, #14, #15 and #16), which left the property before their written approval was recorded.',
      '⚠ one signer by role, and every item numbered');
  });

  // ── D ────────────────────────────────────────────────────────────────────
  G('D · signed copies record who signed, and go green only when every fiduciary has', () => {
    const job = ESTATE({ signedRecords: [{ id: 's1', kind: 'ledger', ref: 'ledger', signedBy: 'Thomas Ashworth', filedAt: T0, label: 'Signed Disposition Ledger' }] });
    const r = rig(job, LINES({ undecided: false }));
    const S = r.c.ledgerSignState(job);
    eq([S.complete, S.owed.map((x) => x.name)], [false, ['Nora Ashworth']], '⚠⚠ EST-13: one of two signed is not the ledger signed');
    const line = r.c.ledgerDerivedLines(7, job, 'p4')[0] || {};
    eq(line.ok, false, 'the derived line stays open');
    has(line.detail || '', 'still to sign: Nora Ashworth', 'and names who is still to sign');
    has(line.label || '', 'Disposition Ledger signed by each of Thomas Ashworth and Nora Ashworth', 'its label names each signer');
    has(r.c.ledgerCloseFlag(job), 'The Disposition Ledger on file is not signed by Nora Ashworth.', 'the close\'s sentence names her');
    const card = r.c._renderLedgerCard(job, r.rows);
    has(text(card), '✓ Thomas Ashworth, Personal Representative — signed copy filed', 'the card: the representative on the copy filed');
    has(text(card), '⚠ Nora Ashworth, Co-Personal Representative — not signed on a copy filed yet', '…the co-representative still to sign');
    has(card, '>File the copy signed by Nora Ashworth<', 'and the press for her copy');
    job.signedRecords.push({ id: 's2', kind: 'ledger', ref: 'ledger', signedBy: 'Nora Ashworth', filedAt: T0 + 5, label: 'Signed Disposition Ledger' });
    eq(r.c.ledgerSignState(job).complete, true, 'both on copies filed: signed');
    eq((r.c.ledgerDerivedLines(7, job, 'p4')[0] || {}).ok, true, '…and the line goes green');
    eq(r.c.ledgerCloseFlag(job), '', '…and the close asks nothing about it');
    const done = r.c._renderLedgerCard(job, r.rows);
    lacks(done, 'File the copy signed by', 'nothing left to file');
    // A fresh copy may still be filed (a better scan), as the card offered before it named its signers: recorded as signed by both.
    has(done, '>File another copy<', 'another copy is still offered');
    const di = [...done.matchAll(/fileSignedCopyFromInput\(this,(\d+)\)/g)].map((m) => Number(m[1]));
    eq(di.length, 1, '…one press');
    r.c.fileSignedCopyFromInput({ files: [{ name: 'x.pdf', type: 'application/pdf', size: 10 }], value: '' }, di[0]);
    eq((r.log.filed[r.log.filed.length - 1] || { meta: {} }).meta.signedBy, 'Thomas Ashworth; Nora Ashworth', '…recorded as signed by them both');
    // Two still to sign: a press for both, and one each; every press files with its own signers.
    const j2 = ESTATE();
    const r2 = rig(j2, LINES({ undecided: false }));
    const c2 = r2.c._renderLedgerCard(j2, r2.rows);
    ['>File the copy Thomas Ashworth signed<', '>File the copy Nora Ashworth signed<', '>File the copy signed by Thomas Ashworth and Nora Ashworth<'].forEach((w) => has(c2, w, 'the card offers ' + w));
    const idx = [...c2.matchAll(/fileSignedCopyFromInput\(this,(\d+)\)/g)].map((m) => Number(m[1]));
    eq(new Set(idx).size, 3, '⚠ three presses, three specs (who signed is part of the press)');
    idx.forEach((i) => r2.c.fileSignedCopyFromInput({ files: [{ name: 'x.pdf', type: 'application/pdf', size: 10 }], value: '' }, i));
    eq(r2.log.filed.map((f) => f.meta.signedBy).sort(), ['Nora Ashworth', 'Thomas Ashworth', 'Thomas Ashworth; Nora Ashworth'], '⚠⚠ each press files its own signers (signedBy)');
    eq(r2.log.filed.every((f) => f.kind === 'ledger' && f.meta.ref === 'ledger'), true, 'each as the ledger\'s signed copy');
    // Nobody recorded: the one blank line; any copy is the signature.
    const j3 = ESTATE({ executor: '', executorRole: '', coFiduciaries: [], signedRecords: [{ id: 's1', kind: 'ledger', ref: 'ledger', filedAt: T0 }] });
    eq(rig(j3, LINES({ undecided: false })).c.ledgerSignState(j3).complete, true, 'nobody recorded: any copy is the signature');
    // The agreement's co-signed page reads the same parser.
    const ag = rig(ESTATE(), []);
    eq(ag.c.signedByNames({ signedBy: ' Nora Ashworth ; Thomas Ashworth;' }), ['Nora Ashworth', 'Thomas Ashworth'], 'signedByNames: trimmed, empties dropped');
  });

  G('D · the signed schedules: each signer named, a draft said as one', () => {
    const job = ESTATE({ signedRecords: [{ id: 's1', kind: 'schedule', ref: 'Court Inventory', signedBy: 'Thomas Ashworth', filedAt: T0, label: 'Adopted Court Inventory' }] });
    const r = rig(job, LINES());
    const rows = r.c.signedScheduleRows(job, r.rows, true);
    eq(rows.map((x) => x.ref), ['Court Inventory'], 'fixture: the probate track\'s Court Inventory');
    ok((rows[0] || {}).draft.length > 0, 'the page is still a draft (unvalued lines)');
    eq(((rows[0] || {}).signs || {}).owed.map((x) => x.name), ['Nora Ashworth'], 'its copy on file lacks Nora');
    const card = text(r.c._renderSignedSchedulesCard(job, r.rows));
    has(card, 'Still a draft (', 'the card says it is still a draft');
    has(card, '⚠ Nora Ashworth, Co-Personal Representative — not signed on a copy filed yet', 'and who is still to sign');
  });

  // ── E ────────────────────────────────────────────────────────────────────
  G('E · each signer prints in their own role (DOC-13)', () => {
    const r = rig(ESTATE(), []);
    // RESTATED (P12's review, 2026-10-28): the lines take the paper's kind ('court', 'trustee') and read its words off one answer,
    // scheduleSignerCapacity, which the signed schedules' card reads too.
    const h = text(r.c.scheduleSignLines([{ name: 'Daniel Price', role: 'Successor Trustee' }, { name: 'Ruth Price', role: 'Co-Trustee' }, { name: 'Ann Lee', role: '' },
      { name: 'Bo Lee', role: 'Other' }], 'Received for the trust&rsquo;s records by', 'trustee'));
    has(h, 'Ruth Price · Co-Trustee', '⚠⚠ a Co-Trustee signs as a Co-Trustee, never "Successor Trustee"');
    has(h, 'Daniel Price · Successor Trustee', 'the successor trustee as recorded');
    has(h, 'Ann Lee · Successor Trustee', 'no role recorded: the paper\'s word');
    has(h, 'Bo Lee · Successor Trustee', '"Other" names no capacity: the paper\'s word');
    const h2 = text(r.c.scheduleSignLines([{ name: 'Ruth Adler', role: 'Family Member' }, { name: 'Paul Adler', role: 'Co-Personal Representative' }, { name: 'Tess Lee', role: 'Trustee' }],
      'Reviewed and adopted by', 'court'));
    has(h2, 'Ruth Adler · Personal Representative / authorized fiduciary', '⚠ a role that is no capacity on the paper (Family Member): the paper\'s word');
    has(h2, 'Paul Adler · Co-Personal Representative', 'a co-personal representative adopts the Court Inventory as one');
    has(h2, 'Tess Lee · Personal Representative / authorized fiduciary', '⚠ a trustee\'s role is no capacity on the Court Inventory');
    has(text(r.c.scheduleSignLines([{ name: 'Ann Lee', role: 'Personal Representative' }], 'Received for the trust&rsquo;s records by', 'trustee')),
      'Ann Lee · Successor Trustee', '…nor a personal representative\'s on the Trust Schedule');
    eq(r.c.fiduciaryCapacity({ role: 'Co-Personal Representative' }, 'x'), 'Co-Personal Representative', 'fiduciaryCapacity: the recorded role');
    eq(r.c.ledgerSigners(ESTATE()).map((x) => x.role), ['Personal Representative', 'Co-Personal Representative'], 'the ledger\'s signers through the same rule');
    // "Other" names no capacity on the ledger either (it printed "Nora Ashworth, Other" under her line).
    // RESTATED (P12's review, 2026-10-28): she signs as the matter's co-representative, never as the "Personal Representative" (the
    // matter's approver, the representative's capacity: DOC-13's mix-up again).
    const oth = r.c.ledgerSigners(ESTATE({ coFiduciaries: [{ id: 'c1', name: 'Nora Ashworth', role: 'Other' }] })).map((x) => x.role);
    eq(oth[1], 'Co-Personal Representative', '⚠ a co-representative recorded as Other signs the ledger as the matter\'s co-representative');
    ok(oth[1] !== 'Other', '…never as "Other"');
  });

  G('E · the Closing bar at the close: the refusals, then the list; a draft schedule said as one (VAL-26)', () => {
    const job = ESTATE({ deliveredOn: '2026-10-28' });
    const r = rig(job, LINES(), { jobCloseBlockers: (j, form) => form === 'bits' ? [{ text: '1 vendor not yet rated', tone: 'red' }] : ['x'] });
    const st = attempt(() => r.c.deskFoldState(7, job, 'closing', r.rows));
    ok(st.ok, 'the bar answers (' + (st.err || 'ok') + ')');
    const bits = (st.val && st.val.bits) || [];
    const line = bits.map((b) => b.text).join(' · ');
    eq((bits[0] || {}).text, '1 vendor not yet rated', 'the refusal first');
    has(line, '2 lines with no disposition (#3, #7)', '⚠⚠ VAL-14: the undecided lines, by number');
    has(line, '1 ratification owed (#2)', 'the ratification');
    has(line, '3 sold lines on no statement (#1, #4, #5)', 'the sold lines');
    has(line, 'Court Inventory still a draft (', '⚠ VAL-26: the draft said as one');
    lacks(line, 'Adopted Court Inventory not filed yet', '…never "not filed yet" while the page withholds its signature block');
    has(line, 'Disposition Ledger not signed yet', 'the ledger');
    eq(count(line, 'on no statement'), 1, 'said once: the grey count of sold lines is not repeated at the close');
    // A statement that disagrees with its lines: said once, red, at the close as before it.
    const dj = ESTATE({ deliveredOn: '2026-10-28', proceedsStatements: [{ id: 'ps1', vendor: 'Kodner Galleries', statementDate: '2026-10-20',
      lines: [{ stableId: 'a', itemNo: 1 }], gross: 1250, fees: 250, netPaid: 1000 }] });
    const dr = rig(dj, LINES(), { jobCloseBlockers: () => [] });
    const dbits = dr.c.deskFoldState(7, dj, 'closing', dr.rows).bits.filter((x) => /disagree/.test(x.text));
    eq(dbits.map((x) => [x.text, x.tone]), [['1 proceeds statement disagrees with its lines', 'red']], '⚠ a disagreeing statement: one line, red');
    // The card carries the same list.
    const co = attempt(() => r.c.closeReadinessHtml(7, job, 'admin'));
    ok(co.ok, 'the Close-out card\'s list answers (' + (co.err || 'ok') + ')');
    has(co.val || '', 'id="close-ready-admin-7"', 'its own id per host');
    has(text(co.val), 'Before you close', 'headed');
    has(text(co.val), '1 item left the property before its written approval was complete: a ratification is owed (#2).', 'the question\'s own sentences');
    has(text(co.val), 'None of it stops the close', 'and that none of it is a refusal');
  });

  G('E · the Close-out card draws the list on both hosts, and the desk\'s repaints carry it, once a burst has settled', () => {
    const job = ESTATE({ deliveredOn: '2026-10-28' });
    const r = rig(job, LINES());
    const body = attempt(() => r.c.renderCloseoutBody(7, job, 'plan'));
    ok(body.ok, 'the card\'s body answers (' + (body.err || 'ok') + ')');
    has(body.val || '', 'id="close-ready-plan-7"', '⚠ the card\'s fifth step, with its host in its id');
    has(text(body.val), 'Before you close', 'headed');
    // The repaint: by id, after CLOSE_READY_REPAINT_MS; a burst schedules one paint.
    const timers = [];
    r.c.setTimeout = (f, ms) => { timers.push([f, ms]); return timers.length; };
    const el = r.c.document.getElementById('close-ready-admin-7');
    el.innerHTML = 'stale';
    r.c._closeReadyRepaint(7); r.c._closeReadyRepaint(7); r.c._closeReadyRepaint(7);
    eq([timers.length, (timers[0] || [])[1]], [1, 250], 'three repaints in a burst: one paint scheduled, a quarter of a second later');
    eq(el.innerHTML, 'stale', '…nothing painted yet');
    (timers[0] || [() => {}])[0]();
    has(text(el.innerHTML), 'a ratification is owed (#2)', 'then the list is painted by id');
    r.c._closeReadyRepaint(7);
    eq(timers.length, 2, 'and the next edit schedules the next');
    has(BODIES._deskFoldHeadsRepaint || '', '_closeReadyRepaint(jobId)', 'the desk\'s by-id repaints carry it');
  });

  // ── F ────────────────────────────────────────────────────────────────────
  G('F · the Contents Record: Hold has no destination yet, "left" only for what left, its sign-off\'s words, its stamp', () => {
    const rows = [
      ROW('l2', { itemNo: 2, objectName: 'Drop-leaf side table', disposition: 'Hold' }),
      ROW('l5', { itemNo: 5, objectName: 'Kitchen drawer of utensils', disposition: 'Donate', channel: '' }),
      ROW('l4', { itemNo: 4, objectName: 'Armchair', disposition: 'Keep' }),
    ];
    const r = rig(LIVING(), rows);
    const page = attempt(() => r.c.printContentsRecord(7, { asHtml: true }));
    ok(page.ok && page.val && page.val.html, 'the page is built (' + (page.err || 'ok') + ')');
    const t = text((page.val || {}).html);
    has(t, '1 item held back with no destination yet — listed under “Hold”', '⚠⚠ LIV-11: a held line is a gap');
    has(t, 'held back for now: no destination yet', 'and its heading says what Hold means');
    has(t, 'The sign-off is withheld. 1 item has no destination recorded yet (1 on Hold).', '…the sign-off waits for it');
    has(t, '1 item waits for somebody to be named to take it', '⚠ LIV-21: a line still in the house waits for a taker');
    lacks(t, 'left the property with no recipient recorded', '…and is never said to have left');
    lacks(t, 'Values and dispositions', 'its stamp never speaks of values (it states none)');
    // Decided: the record to date while IN PROGRESS, the final record once REVIEWED.
    const dec = rig(LIVING(), [ROW('l4', { itemNo: 4, objectName: 'Armchair', disposition: 'Keep' }),
      ROW('l6', { itemNo: 6, objectName: 'Wicker chair', disposition: 'Keep', fmv: 40, valuedBy: 'agent', valConf: 'high', valSource: 'General estimate', namedBy: 'agent' })]);
    has(text(dec.c.printContentsRecord(7, { asHtml: true }).html), 'Reviewed and accepted as the record to date of what stayed and what left the property', '⚠⚠ Ask 12: the record to date');
    dec.job.invRead = { at: T0, by: 'Ashley Jerome', seen: dec.c.invListSeen(7) };
    has(text(dec.c.printContentsRecord(7, { asHtml: true }).html), 'Reviewed and accepted as the final record of what stayed and what left the property', '…and the final record once read');
    // The Contents Record card counts a held line too.
    has(text(r.c._renderContentsCard(LIVING(), rows)), '1 item has no destination yet', 'the card counts the held line');
  });

  // ── G ────────────────────────────────────────────────────────────────────
  G('G · the package\'s Release Approvals record lists what the ledger lists', () => {
    const r = rig(ESTATE(), LINES());
    const t = text(attempt(() => r.c.probatePackageRecordHtml(7)).val);
    has(t, '1 item left the property before its written approval was complete (ratification owed): #2 Pair of brass table lamps.', '⚠⚠ DOC-11: the lamps are named');
    has(t, '2 Pair of brass table lamps Donate Goodwill Palm Beach ratification owed', '…and listed, reading as the ledger does');
    has(t, 'Tabriz rug Consign Palm Consign signed so far by Thomas Ashworth (Oct 21, 2026); still to sign: Nora Ashworth', 'a partial approval in the ledger\'s words');
    lacks(t, 'Not complete: no approval recorded from', 'the old sub-line is gone (one wording)');
  });

  // ── R · P12's review (2026-10-28) ─────────────────────────────────────────
  G('R1 · Close job reads first on every press, names the client, and is never asked over another client', () => {
    // On screen: the band host is this client's until the test moves it.
    const on = { jobId: 7 };
    const r = rig(ESTATE(), LINES());
    r.c.jobCloseBlockers = () => [];
    r.c._jobBandHost = () => on.jobId ? { kind: 'admin', jobId: on.jobId, fb: 'jband-fb-admin' } : null;
    r.c.activateOrCycle(7);
    eq([r.log.reads.length, r.log.asked.length], [1, 0], '⚠⚠ read already on this device: it reads the sheet again before it asks');
    r.c.activateOrCycle(7);
    eq(r.log.reads.length, 1, 'a second press while the read is out does not read again');
    eq(r.log.badges.filter((b) => /Reading the inventory from the sheet first/.test(b)).length, 2, '⚠ …but says the toast again (it did nothing)');
    (r.log.reads[0] || { go() {} }).go(null);
    eq(r.log.asked.length, 1, 'the read lands on the same client: the question');
    ok(/^Close Margaret Ashworth's job now\?/.test(r.log.asked[0] || ''), '⚠⚠ the question names the client: ' + JSON.stringify((r.log.asked[0] || '').slice(0, 40)));
    eq(r.job.status, 'closed', 'OK closes it');
    // Pressed on this client, another on screen when the read lands: not asked, not closed, and the toast says so.
    const m = rig(ESTATE(), LINES());
    m.c.jobCloseBlockers = () => [];
    m.c._jobBandHost = () => on.jobId ? { kind: 'admin', jobId: on.jobId, fb: 'jband-fb-admin' } : null;
    on.jobId = 7;
    m.c.activateOrCycle(7);
    on.jobId = 13002;
    (m.log.reads[0] || { go() {} }).go(null);
    eq([m.log.asked.length, m.job.status], [0, 'active'], '⚠⚠ another client on screen when the read lands: nothing asked, nothing closed');
    has(m.log.badges.join(' | '), 'Close job was not asked: another screen is showing now. Open Margaret Ashworth and press Close job again.', '…and the toast says so');
    m.c.activateOrCycle(7);
    eq(m.log.reads.length, 2, 'the next press reads again (the first one let go)');
    // No band anywhere when pressed (a call from elsewhere): asked, with the name.
    const n = rig(ESTATE(), LINES());
    n.c.jobCloseBlockers = () => [];
    n.c._jobBandHost = () => null;
    n.c.activateOrCycle(7);
    (n.log.reads[0] || { go() {} }).go(null);
    eq(n.log.asked.length, 1, 'pressed with no band showing: asked once the read lands');
    // A Home Prep has no inventory: no read. A re-open (closed → active) is not a close: no read.
    const prep = rig(ESTATE({ svc: 'prep', matterType: '', executor: '', coFiduciaries: [] }), []);
    prep.c.jobCloseBlockers = () => [];
    prep.c.activateOrCycle(7);
    eq(prep.log.reads.length, 0, 'Home Prep: nothing to read');
  });

  G('R1 · a read that did not land is said in the question: this device\'s copy', () => {
    const r = rig(ESTATE({ payments: ESTATE().payments }), [ROW('h', { itemNo: 8, objectName: 'Family Bible', disposition: 'Keep' })],
      { signedRecords: undefined });
    r.job.signedRecords = [{ id: 's1', kind: 'ledger', ref: 'ledger', signedBy: BOTH, filedAt: T0 }];
    r.job.docTier = 'contents';
    r.c.jobCloseBlockers = () => [];
    eq(r.c.closeOpenWorkFlag(r.job), '', 'fixture: nothing open on this device\'s copy, the midpoint paid');
    r.c.activateOrCycle(7);
    (r.log.reads[0] || { failed() {} }).failed();
    eq(r.log.asked.length, 1, '⚠⚠ the sheet did not answer: the question is asked though nothing else is open');
    has(r.log.asked[0] || '', 'The sheet did not answer just now, so what is open on the inventory is read off this device’s copy, which may be behind.',
      '…and says the list is this device\'s copy');
    // It lands: nothing to ask, nothing said.
    const ok2 = rig(ESTATE(), [ROW('h', { itemNo: 8, objectName: 'Family Bible', disposition: 'Keep' })]);
    ok2.job.signedRecords = [{ id: 's1', kind: 'ledger', ref: 'ledger', signedBy: BOTH, filedAt: T0 }];
    ok2.job.docTier = 'contents';
    ok2.c.jobCloseBlockers = () => [];
    ok2.c.activateOrCycle(7);
    (ok2.log.reads[0] || { go() {} }).go(null);
    eq([ok2.log.asked.length, ok2.job.status], [0, 'closed'], 'the read lands, nothing open: closed with nothing asked');
    // Never read on this device, and the read fails: the list's own unread entry says it; no copy sentence (there is no copy).
    const cold = rig(ESTATE(), LINES(), { _invCloudSeen: {} });
    cold.c.jobCloseBlockers = () => [];
    cold.c.activateOrCycle(7);
    (cold.log.reads[0] || { failed() {} }).failed();
    has(cold.log.asked[0] || '', 'The inventory has not been read from the sheet on this device yet', 'never read: the list says so');
    lacks(cold.log.asked[0] || '', 'this device’s copy, which may be behind', '…and claims no copy');
    // Every other caller of the transition asks as before (no `how`).
    const plain = rig(ESTATE(), LINES());
    plain.c.jobCloseBlockers = () => [];
    plain.c.applyJobTransition(plain.job);
    lacks(plain.log.asked[0] || '', 'did not answer', 'applyJobTransition alone: no copy sentence');
  });

  G('R2 · the ledger\'s signers and Ask 13\'s sentence in a capacity, never a relationship or a profession', () => {
    const sentence = (job) => { const t = text(rig(job, LINES({ undecided: false })).c.printDispositionLedger(7, { asHtml: true }).html); const i = t.indexOf('By signing below'); return i < 0 ? '' : t.slice(i, i + 70); };
    const sigLine = (job) => { const t = text(rig(job, LINES({ undecided: false })).c.printDispositionLedger(7, { asHtml: true }).html); const i = t.indexOf('Signature:'); return i < 0 ? '' : t.slice(i, i + 110); };
    ['Family Member', 'Estate Attorney', 'Other', '', 'Guardian ad litem'].forEach((role) => {
      const j = ESTATE({ coFiduciaries: [], executorRole: role });
      has(sentence(j), 'By signing below, the Personal Representative also ratifies', '⚠⚠ recorded as "' + role + '": the sentence names the capacity');
      has(sigLine(j), 'Thomas Ashworth, Personal Representative', '…and so does the signature line');
    });
    lacks(sentence(ESTATE({ coFiduciaries: [], executorRole: 'Family Member' })), 'Family Member', '⚠ never "the Family Member also ratifies"');
    has(sentence(ESTATE({ coFiduciaries: [], executorRole: 'Executor' })), 'the Executor also ratifies', 'a role that is a capacity prints as recorded');
    has(sentence(ESTATE({ coFiduciaries: [], executorRole: 'Family Member', matterType: 'trust' })), 'the successor trustee also ratifies', 'a trust: the matter\'s approver');
    has(sentence(ESTATE({ coFiduciaries: [], executorRole: 'Trustee', matterType: 'trust' })), 'the Trustee also ratifies', 'a trustee\'s role as recorded');
    // The gap sentence reads the same signer.
    const g = text(rig(ESTATE({ coFiduciaries: [], executorRole: 'Family Member' }), LINES({ undecided: false })).c.printDispositionLedger(7, { asHtml: true }).html);
    has(g, 'do not yet have the written approval of the Personal Representative:', '…and the gap above the table');
    // A co-representative recorded with no capacity signs as the matter's co-representative.
    const co = (mt) => rig(ESTATE({ matterType: mt, coFiduciaries: [{ id: 'c1', name: 'Nora Ashworth', role: 'Other' }] }), []).c.ledgerSigners(ESTATE({ matterType: mt, coFiduciaries: [{ id: 'c1', name: 'Nora Ashworth', role: 'Other' }] })).map((x) => x.role);
    eq(co('probate')[1], 'Co-Personal Representative', '⚠ probate: Co-Personal Representative');
    eq(co('trust')[1], 'Co-Trustee', 'trust: Co-Trustee');
    eq(co('both')[1], 'Co-Personal Representative or Co-Trustee', 'both: either');
    eq(co('neither')[1], 'Co-Representative', 'neither a court nor a trust: Co-Representative');
    eq(co('')[1], 'Co-Personal Representative', 'unanswered: read as probate');
    eq(rig(ESTATE(), []).c.ledgerSigners(ESTATE({ coFiduciaries: [{ id: 'c1', name: 'Nora Ashworth', role: 'Co-Trustee' }] })).map((x) => x.role)[1], 'Co-Trustee', 'a co-trustee as recorded');
    // One pair of role patterns, read by the ledger and the schedules.
    eq(callers('ledgerSignerRole'), ['ledgerSigners'], 'the ledger\'s role: one answer');
    eq(callers('scheduleSignerCapacity').sort(), ['scheduleSignLines', 'signedScheduleRows'], 'the schedules\' role: one answer, the lines and the card');
  });

  G('R2 · the schedules: a co-representative with no capacity, on the page and on the card', () => {
    const r = rig(ESTATE(), []);
    const ci = text(r.c.scheduleSignLines([{ name: 'Thomas Ashworth', role: 'Family Member', primary: true }, { name: 'Nora Ashworth', role: 'Other', primary: false }], 'Reviewed and adopted by', 'court'));
    has(ci, 'Thomas Ashworth · Personal Representative / authorized fiduciary', 'the representative: the paper\'s word');
    has(ci, 'Nora Ashworth · Co-Personal Representative', '⚠⚠ the co-representative recorded as Other adopts it as a Co-Personal Representative');
    const ts = text(r.c.scheduleSignLines([{ name: 'Ruth Gale', role: 'Family Member', primary: true }, { name: 'Ann Gale', role: '', primary: false }], 'Received for the trust&rsquo;s records by', 'trustee'));
    has(ts, 'Ruth Gale · Successor Trustee', 'the trust\'s representative: Successor Trustee');
    has(ts, 'Ann Gale · Co-Trustee', '…and her co-trustee: Co-Trustee');
    // The card names each signer as the paper prints them, never the raw role recorded.
    const job = ESTATE({ executorRole: 'Family Member', coFiduciaries: [{ id: 'c1', name: 'Nora Ashworth', role: 'Other' }],
      signedRecords: [{ id: 's1', kind: 'schedule', ref: 'Court Inventory', signedBy: 'Thomas Ashworth', filedAt: T0, label: 'Adopted Court Inventory' }] });
    const cr = rig(job, LINES());
    const card = text(cr.c._renderSignedSchedulesCard(job, cr.rows));
    has(card, 'Thomas Ashworth, Personal Representative / authorized fiduciary', '⚠ the card: the representative in the paper\'s capacity');
    has(card, 'Nora Ashworth, Co-Personal Representative', '…the co-representative as one');
    lacks(card, 'Family Member', '…never the raw role recorded');
  });

  G('R3 · "the final record" never under the page\'s own "not yet complete"', () => {
    // REVIEWED (every line desk-named and decided, the contents tier), and still: a line leaving with no approval, a sale with no proceeds.
    const rows = [
      ROW('a', { itemNo: 1, objectName: 'Sargent portrait', disposition: 'Auction', channel: 'Kodner Galleries', dispDate: '2026-10-18', authBy: BOTH, approvalDate: '2026-10-15' }),
      ROW('b', { itemNo: 2, objectName: 'Oak bookcase', disposition: 'Donate', channel: 'Goodwill Palm Beach' }),
      ROW('h', { itemNo: 8, objectName: 'Family Bible', disposition: 'Keep' }),
    ];
    const r = rig(ESTATE({ docTier: 'contents' }), rows);
    const t = text(r.c.printDispositionLedger(7, { asHtml: true }).html);
    has(t, 'REVIEWED', 'fixture: the stamp reads REVIEWED');
    has(t, 'This ledger is not yet complete.', 'fixture: …and the page says it is not complete');
    has(t, 'Reviewed and approved as the record to date of the disposition of the property listed above.', '⚠⚠ the record to date, under its own gaps');
    lacks(t, 'as the final record of the disposition', '…never the final record');
    // The gaps closed (approved, proceeds in): the final record.
    const done = [
      ROW('a', { itemNo: 1, objectName: 'Sargent portrait', disposition: 'Auction', channel: 'Kodner Galleries', gross: 1000, fees: 250, dispDate: '2026-10-18', authBy: BOTH, approvalDate: '2026-10-15' }),
      ROW('h', { itemNo: 8, objectName: 'Family Bible', disposition: 'Keep' }),
    ];
    const d = rig(ESTATE({ docTier: 'contents', proceedsStatements: [{ id: 'ps1', vendor: 'Kodner Galleries', statementDate: '2026-10-20',
      lines: [{ stableId: 'a', itemNo: 1 }], gross: 1000, fees: 250, netPaid: 750 }] }), done);
    const dt = text(d.c.printDispositionLedger(7, { asHtml: true }).html);
    if (dt.indexOf('not yet complete') < 0) has(dt, 'Reviewed and approved as the final record of the disposition', 'no gaps, REVIEWED: the final record');
    else ok(false, 'fixture: the closed ledger still lists a gap: ' + dt.slice(dt.indexOf('not yet complete'), dt.indexOf('not yet complete') + 200));
    // The Contents Record the same: REVIEWED, every line decided, one waiting for a taker.
    const lr = rig(LIVING(), [ROW('l4', { itemNo: 4, objectName: 'Armchair', disposition: 'Keep' }), ROW('l5', { itemNo: 5, objectName: 'Bookcase', disposition: 'Donate', channel: '' })]);
    const lt = text(lr.c.printContentsRecord(7, { asHtml: true }).html);
    has(lt, 'This record is not yet complete.', 'fixture: the Contents Record lists a gap (a line waiting for a taker)');
    has(lt, 'Reviewed and accepted as the record to date of what stayed and what left the property', '⚠⚠ the Contents Record: the record to date under its own gaps');
    const lf = rig(LIVING(), [ROW('l4', { itemNo: 4, objectName: 'Armchair', disposition: 'Keep' })]);
    has(text(lf.c.printContentsRecord(7, { asHtml: true }).html), 'Reviewed and accepted as the final record of what stayed and what left the property', 'no gaps: the final record');
  });

  G('R4 · the package\'s record carries the ledger\'s second sentence, naming the same lines', () => {
    const r = rig(ESTATE(), LINES());
    const rec = text(r.c.probatePackageRecordHtml(7));
    has(rec, '3 items leaving the property do not yet have the written approval of each of Thomas Ashworth and Nora Ashworth: #4 Tabriz rug, #5 Remington 870 shotgun, #6 Oak bookcase.',
      '⚠⚠ the lines short of a complete approval, named as the ledger names them');
    const led = text(r.c.printDispositionLedger(7, { asHtml: true }).html);
    has(led, 'do not yet have the written approval of every signer below: #4 Tabriz rug, #5 Remington 870 shotgun, #6 Oak bookcase.', '…the ledger\'s own words, over its signature lines');
    const one = rig(ESTATE({ coFiduciaries: [], executorRole: 'Family Member' }), LINES());
    has(text(one.c.probatePackageRecordHtml(7)), 'do not yet have the written approval of the Personal Representative:', 'one representative: by capacity');
  });
};
