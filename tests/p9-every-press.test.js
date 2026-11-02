'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P9 OF THE DESK AUDIT (2026-10-28): EVERY PRESS LANDS, AND EMPTY PHOTOGRAPHS LEAVE THE LIST.
//
//   EST-09, LIV-08, DOC-19, INV-08, ROW-17, AGT-01: a photograph Agent One found nothing in (`agentConf: 'none'`) sat in Unnamed
//     shots beside photographs never read, in Select all, and on every paper as a blank numbered line, taken off one ▾ at a time.
//     It has its own chip (Nothing to list N, invLineNothingToList), Select all skips it, and the work bar's one press, Remove the
//     N with nothing to list (invRemoveNothingToList), takes them all off after reading the sheet, photographs kept.
//   AGT-02: a frame too dark to read came back empty with a note and read *nothing to list*; it is `'unread'` now, reads *could
//     not be read: <the note>* with + Close-up, is never swept away, and a close-up landing sends it back to Agent One.
//   ROW-01, NEW-01, AGT-01: Mark reviewed wrote a stuck tick onto blank lines and took a too-dark note off the list; it leaves a
//     line with no name alone, and a note on an unnamed line stays on the list (agentNoticeQuiet asks for a name).
//   ROW-08: under Not reviewed or Unsure a ticked row is held in place, greyed, its box shut, with Undo (_invHeld).
//   ROW-05: one box per value: the record has no name box, and no Who takes it box where the row carries one.
//   LIV-02: the selection clears after each bulk action and each filter change, and a press over picks off screen asks first.
//   INV-07, NEW-07: the package's question counts every gap the desk counts, and the walkthrough's own collection line is not
//     the inventory.
//   ROW-03, ROW-04, SYN-12: the search, the row and the by-id repaints patch in place (_invPatch), so a box keeps its focus and
//     a press straight after an edit lands on the button pressed. Browser step 131 drives each of these through the real page.
// ─────────────────────────────────────────────────────────────────────────────
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
  return { fns: [...fns], vars: [...vars] };
}
function lift(roots, stop, stubs) {
  const c = closure(roots, (stop || []).concat(Object.keys(stubs || {})));
  return sandbox({ fns: c.fns, vars: c.vars, stubs: stubs || {} });
}
const attempt = (f) => { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } };
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&middot;/g, '·').replace(/&rsquo;/g, '’')
  .replace(/&mdash;/g, '—').replace(/&#10003;/g, '✓').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();
const count = (h, needle) => String(h || '').split(needle).length - 1;

const JOB = () => ({ id: 7, name: 'Ruth Calder', hvlId: 'HVL-0009', svc: 'cleanout', matterType: 'trust', executor: 'Daniel Calder', deathDate: '2026-08-14',
  trustName: 'Calder Family Trust', won: true, status: 'active', activatedOn: '2026-10-10', tc: 'Ashley Jerome', docTier: 'values', at: {} });
const ROOMS = [{ idx: 2, name: 'Kitchen', st: 'in' }, { idx: 3, name: 'Living Room', st: 'in' }, { idx: 4, name: 'Dining Room', st: 'in' }];
const LINE = (id, over) => Object.assign({ stableId: id, label: 'inventory', collId: null, roomIdx: 3, seq: 1, status: 'uploaded', objectName: 'Sideboard',
  category: 'Furniture', qty: 1, ts: 100, updatedAt: 100, driveFileId: 'f' + id, driveFileUrl: 'https://drive.google.com/file/d/f' + id + '/view' }, over || {});
const NOTHING = (id, over) => LINE(id, Object.assign({ objectName: '', agentAt: 50, agentConf: 'none' }, over || {}));
const DARK = 'Too dark to tell what is on the shelf: photograph it again';
const UNREAD = (id, over) => LINE(id, Object.assign({ objectName: '', agentAt: 50, agentConf: 'unread', agentNotices: [{ kind: 'other', text: DARK }] }, over || {}));

module.exports = function ({ group, ok, eq, has, lacks }) {
  const G = (name, body) => { group(name); try { body(); } catch (e) { ok(false, name + ' threw: ' + (e && e.message || e)); } };

  // ═══ A. ONE PREDICATE, ITS OWN CHIP ═══
  G('A · a photograph Agent One found nothing in is its own pile, and Unnamed shots leaves it out', () => {
    const s = sandbox({ fns: ['invLineNothingToList', 'invLineUnread', '_invNeedsValue', 'invWorkFlags', 'invFiduciaryMode', 'isDecedentJob', '_renderInvFlagStrip'],
      vars: ['INV_WORK_FLAGS', 'DECEDENT_SERVICES'],
      stubs: { _invFilter: { flag: '' }, invLineReviewed: () => false, invLineUnsure: () => false, _invAcceptCtxOf: () => null, maivFilingApplies: () => false,
        invNeedsAppraisal: () => false, invReceiptOwed: () => false, invIsFirearm: () => false, invReleaseBlocked: () => false, INV_RELEASE_DISPOSITIONS: ['Donate'] } });
    const n = NOTHING('n'), u = UNREAD('u'), b = LINE('b', { objectName: '' }), named = LINE('m');
    eq([s.invLineNothingToList(n), s.invLineNothingToList(u), s.invLineNothingToList(b), s.invLineNothingToList(named)], [true, false, false, false],
      'invLineNothingToList: the stamp none and no name, nothing else');
    eq(s.invLineNothingToList(Object.assign({}, n, { objectName: 'Socks' })), false, 'a name typed over one makes it a line again');
    eq(s.invLineNothingToList(Object.assign({}, n, { deletedAt: 9 })), false, 'a removed one is no pile');
    eq([s.invLineUnread(u), s.invLineUnread(n)], [true, false], 'invLineUnread: the could-not-be-read stamp');
    const F = (k) => s.INV_WORK_FLAGS.filter((f) => f.key === k)[0];
    eq([F('unnamed').test(n), F('unnamed').test(u), F('unnamed').test(b)], [false, true, true], '⚠⚠ Unnamed shots leaves out what Agent One found nothing in (LIV-08), keeps the rest');
    eq([F('nothing').test(n), F('nothing').test(u)], [true, false], '⚠⚠ Nothing to list gathers them, and never a frame it could not read');
    eq(s.INV_WORK_FLAGS.slice(0, 3).map((f) => f.key), ['unnamed', 'unreviewed', 'unsure'], 'the first three chips are as they were');
    eq(s.INV_WORK_FLAGS[3].key, 'nothing', 'Nothing to list is fourth');
    const job = JOB();
    const strip0 = s._renderInvFlagStrip(job, [named, u]);
    lacks(strip0, "setInvFlag('nothing')", '⚠ with none, the chip is not drawn (a cleanup pile)');
    has(strip0, "setInvFlag('unnamed')", 'the other chips are, at zero too');
    has(text(s._renderInvFlagStrip(job, [named, n, NOTHING('n2')])), 'Nothing to list 2', 'with two, Nothing to list 2');
    s._invFilter.flag = 'nothing';
    has(s._renderInvFlagStrip(job, [named]), "setInvFlag('nothing')", 'pressed, it stays drawn at zero so it can be pressed off');
  });

  // ═══ B. AN EMPTY ANSWER WITH A NOTE IS NOT NOTHING TO LIST ═══
  G('B · agentApplyResult: an empty answer stamps none, an empty answer with a note stamps unread; neither is sent again', () => {
    const mk = () => lift(['agentApplyResult', 'agentNameableRefs'], ['_invFileId', '_jobInvRefs'], {
      _photoRefs: { 7: [LINE('p1', { objectName: '' }), LINE('p2', { objectName: '' }), LINE('p3', { objectName: '' })] },
      jobs: [JOB()], _invTouch: (r) => { r.updatedAt = (r.updatedAt || 0) + 1; return r; }, _invFileId: (r) => r.driveFileId,
      _jobInvRefs(j) { return (this._photoRefs[j] || []).filter((r) => !r.deletedAt); },
    });
    const s = mk();
    s._jobInvRefs = (j) => s._photoRefs[j].filter((r) => !r.deletedAt);
    const st = s._agState(7);
    s.agentApplyResult(7, { srcId: 'p1', rows: ['p1'] }, { objects: [], notices: [] });
    s.agentApplyResult(7, { srcId: 'p2', rows: ['p2'] }, { objects: [], notices: [{ kind: 'other', text: DARK }] });
    eq([s._getPhotoRef(7, 'p1').agentConf, s._getPhotoRef(7, 'p2').agentConf], ['none', 'unread'], '⚠⚠ nothing in it reads none; a note and nothing named reads unread (AGT-02)');
    eq((s._getPhotoRef(7, 'p2').agentNotices || []).map((x) => x.text), [DARK], 'the note is kept on the photograph');
    eq([st.empty, st.unread], [1, 1], 'the run counts each');
    eq(s.agentNameableRefs(7).map((r) => r.stableId), ['p3'], '⚠ Name shots sends neither again');
    s.agentApplyResult(7, { srcId: 'p3', rows: ['p3'] }, { objects: [], notices: [{ kind: 'firearm', text: 'A long gun case behind the door' }] });
    eq(s._getPhotoRef(7, 'p3').agentConf, 'unread', '⚠ any note: a Firearm over a frame with nothing listed is never swept away with nothing to list');
    // The naming line says so once the run is over (the sweep's R34: counted and never said).
    const SH = attempt(() => { const h = lift(['_agStateHtml'], [], { _agRun: { 7: { running: false, total: 3, done: 3, named: 0, split: 0, empty: 1, unread: 2,
      failed: 0, skipped: 0, again: 0, failures: {}, error: '' } }, jobs: [JOB()], _photoRefs: { 7: [] } }); return text(h._agStateHtml(7)); });
    has(SH.ok ? SH.val : SH.err, '2 not named: Agent One left a note instead', '⚠ the naming line counts the photographs Agent One left a note on');
    // ⚠⚠ P9's review: a line split off a photograph (Another item in this photo) is unread only for a NEW note. The gun cabinet's blank
    // line came back empty with the first reading's Firearm note again, and read *could not be read* for good.
    const R = mk();
    R._jobInvRefs = (j) => R._photoRefs[j].filter((r) => !r.deletedAt);
    const GUN = 'Long guns visible behind the glass door';
    R._photoRefs[7] = [LINE('g', { objectName: 'Oak gun cabinet, glazed door', agentNotices: [{ kind: 'firearm', text: GUN }] }),
      LINE('s1', { objectName: '', derivedFrom: 'g' }), LINE('s2', { objectName: '', derivedFrom: 'g' }),
      LINE('o', { objectName: '', agentNotices: [{ kind: 'other', text: DARK }] })];
    R.agentApplyResult(7, { srcId: 'g', rows: ['s1'] }, { objects: [], notices: [{ kind: 'firearm', text: GUN }] });
    eq(R._getPhotoRef(7, 's1').agentConf, 'none', '⚠⚠ the split line, answered with the photograph\'s own note again: nothing else in it, nothing to list');
    eq(R._getPhotoRef(7, 'g').agentNotices.length, 1, 'and the note is not added twice');
    R.agentApplyResult(7, { srcId: 'g', rows: ['s2'] }, { objects: [], notices: [{ kind: 'other', text: 'Something at the back too dark to make out' }] });
    eq(R._getPhotoRef(7, 's2').agentConf, 'unread', '⚠ a note the photograph did not have yet: the split line could not be read');
    R.agentApplyResult(7, { srcId: 'o', rows: ['o'] }, { objects: [], notices: [{ kind: 'other', text: DARK }] });
    eq(R._getPhotoRef(7, 'o').agentConf, 'unread', '⚠ the photograph\'s own line read again (after a close-up) with the same note: still could not be read');
  });

  // ═══ C. THE ONE PRESS ═══
  G('C · Remove the N with nothing to list: read first, one question, tombstones with who, photographs kept', () => {
    const asked = [], alerts = [], badges = [], reads = [];
    let answer = true, saved = 0;
    const mk = () => lift(['invRemoveNothingToList', '_invNothingLineHtml', '_getPhotoRef'], ['invReadFirst', 'savePhotoRefs', 'renderInventoryTab', '_scheduleInventorySync'], {
      jobs: [JOB()],
      _photoRefs: { 7: [LINE('m', { itemNo: 1 }), NOTHING('n13', { itemNo: 13, roomIdx: 4 }), NOTHING('n14', { itemNo: 14, roomIdx: 2, fieldNote: 'all of this to charity' }),
        UNREAD('d15', { itemNo: 15 })] },
      estimateStore: { 7: { estimate: { rooms: ROOMS } } },
      invReadFirst: (j, what, go, opt) => { reads.push([what, opt && opt.key]); go({ gone: [], changed: [], added: [], held: false }); return true; },
      savePhotoRefs() { saved++; }, renderInventoryTab() {}, _scheduleInventorySync() {},
      _invTouch: (r) => { r.updatedAt = 999; return r; }, showSyncBadge: (m) => badges.push(m), alert: (m) => alerts.push(m),
      window: { confirm: (m) => { asked.push(m); return answer; } }, deviceUser: () => 'Ashley Jerome',
      _invFilter: { when: 'all', room: '', q: '', flag: 'nothing' }, _invPick: { n13: 1, m: 1 },
    });
    const s = mk();
    const bar = text(s._invNothingLineHtml(JOB(), s._photoRefs[7]));
    has(bar, 'Agent One found nothing to list in 2 photographs', 'the work bar says how many');
    has(bar, 'Remove the 2 with nothing to list', '⚠⚠ and offers the one press');
    eq(text(s._invNothingLineHtml(JOB(), [LINE('m')])), '', 'with none, nothing is drawn (the host stays)');
    // The work bar itself draws it (the sweep's R08: a line built and never drawn passed everything above).
    const W = attempt(() => {
      const w = lift(['_renderInvWorkbar'], [], { jobs: [JOB()], _photoRefs: { 7: [LINE('m'), NOTHING('n13'), NOTHING('n14')] },
        estimateStore: { 7: { estimate: { rooms: ROOMS } } }, document: domStub({}), _invCloudSeen: { 7: true }, _invCloudFailed: {} });
      return text(w._renderInvWorkbar(JOB(), w._photoRefs[7]));
    });
    ok(W.ok, 'the work bar draws' + (W.ok ? '' : ': ' + W.err));
    has(W.ok ? W.val : '', 'Remove the 2 with nothing to list', '⚠⚠ the work bar carries the press');
    answer = false;
    const r0 = attempt(() => s.invRemoveNothingToList(7));
    ok(r0.ok, 'the press runs' + (r0.ok ? '' : ': ' + r0.err));
    eq(reads.map((x) => x[0]), ['Remove the lines with nothing to list'], '⚠ it reads the sheet first (P6\'s gate)');
    const q = asked[0] || '';
    has(q, 'Remove the 2 lines Agent One found nothing to list in?', 'one question');
    has(q, '#13 (Dining Room)', 'naming each by number and room');
    has(q, '#14 (Kitchen)', 'both');
    has(q, 'No photograph is deleted: each stays in Google Drive, as the record of what was there.', 'saying where the photographs stay');
    lacks(q, 'in its room', '⚠⚠ and never in its room: the room\'s strip draws a photograph\'s own line, so a removed one leaves it (P9\'s review)');
    lacks(s._invNothingLineHtml(JOB(), s._photoRefs[7]), 'in their rooms', '⚠ nor the press\'s title');
    lacks(noComments(fn('invBulkRemove')), 'in its room', '⚠ nor Remove lines\' question, which said it first');
    has(noComments(fn('invBulkRemove')), 'No photograph is deleted: each stays in Google Drive, ', 'which says Google Drive');
    has(text(s._invNothingLineHtml(JOB(), s._photoRefs[7])), '(the photographs stay in Google Drive)', 'which says Google Drive');
    has(q, '#14 (Kitchen): note “all of this to charity”', '⚠ flagging, not refusing, a line the field said something over');
    ok(!s._getPhotoRef(7, 'n13').deletedAt, 'Cancel changes nothing');
    answer = true;
    s.invRemoveNothingToList(7);
    const a = s._getPhotoRef(7, 'n13'), b = s._getPhotoRef(7, 'n14');
    ok(!!a.deletedAt && !!b.deletedAt, '⚠⚠ OK takes both off');
    eq([a.deletedBy, a.driveFileId, b.driveFileId], ['Ashley Jerome', 'fn13', 'fn14'], 'tombstones with who, the photographs untouched');
    ok(!s._getPhotoRef(7, 'd15').deletedAt && !s._getPhotoRef(7, 'm').deletedAt, '⚠⚠ never the too-dark frame, never a named line');
    eq(saved, 1, 'the manifest is saved once');
    eq(Object.keys(s._invPick), ['m'], 'a removed line leaves the selection; the rest of it stays');
    eq(s._invFilter.flag, '', 'the pile emptied: its chip lets the list go');
    has(badges[badges.length - 1], '2 lines with nothing to list removed, the photographs kept in Google Drive', 'the toast says what was done, and where the photographs are');
    // A line named on another device meanwhile is left alone.
    const t = mk();
    t.invReadFirst = (j, what, go) => { t._getPhotoRef(7, 'n13').objectName = 'Cutlery tray'; t._getPhotoRef(7, 'n14').deletedAt = 5;
      go({ gone: ['n14'], changed: ['n13'], added: [], held: false }); return true; };
    t.invRemoveNothingToList(7);
    ok(!t._getPhotoRef(7, 'n13').deletedAt, '⚠ a line named on another device meanwhile is left alone');
    ok(alerts.some((m) => /1 line removed on another device was left alone/.test(m)), 'and the read says what it found removed');
  });

  // ═══ D. MARK REVIEWED LEAVES A LINE WITH NO NAME ALONE ═══
  G('D · Mark reviewed: a line with no name is not written, named; all unnamed writes nothing; the selection clears', () => {
    const badges = [];
    const mk = (refs, pick) => {
      const s = lift(['_invBulkApply', '_invPickedAsked', '_renderInvBulk'], ['savePhotoRefs', 'renderInventoryTab', '_scheduleInventorySync', 'invReadFirst', '_avStampReviewed',
        'agentNotices', 'agentValueNotices', '_invFirearmsSkippedText'], {
        jobs: [JOB()], _photoRefs: { 7: refs }, estimateStore: { 7: { estimate: { rooms: ROOMS } } },
        savePhotoRefs() {}, renderInventoryTab() {}, _scheduleInventorySync() {}, invReadFirst: () => false, _avStampReviewed() {},
        agentNotices: () => [], agentValueNotices: () => [], _invFirearmsSkippedText: () => '',
        _invTouch: (r) => { r.updatedAt = 999; return r; }, showSyncBadge: (m) => badges.push(m), deviceUser: () => 'Ashley Jerome',
        _invFilter: { when: 'all', room: '', q: '', flag: '' }, _invFold: {}, _avRun: {},
      });
      s._invPick = pick;
      return s;
    };
    const s = mk([LINE('a', { itemNo: 1, disposition: 'Donate' }), UNREAD('d', { itemNo: 15 }), NOTHING('n', { itemNo: 13 })], { a: 1, d: 1, n: 1 });
    const r = attempt(() => s._invBulkApply(7, 'reviewed', 1));
    ok(r.ok, 'the sweep runs' + (r.ok ? '' : ': ' + r.err));
    eq(s._getPhotoRef(7, 'a').reviewed, true, 'the named line is ticked');
    eq([s._getPhotoRef(7, 'd').reviewed, s._getPhotoRef(7, 'n').reviewed], [undefined, undefined], '⚠⚠ the lines with no name are left alone (ROW-01, AGT-01)');
    eq([s._getPhotoRef(7, 'd').updatedAt, s._getPhotoRef(7, 'n').updatedAt], [100, 100], '⚠ not even their clock moves');
    const msg = badges[badges.length - 1] || '';
    has(msg, '2 have no name, so they were left alone: #15, #13', '⚠ the confirmation names them');
    has(msg, 'Remove the 1 with nothing to list', 'and what settles the one Agent One found nothing in');
    eq(Object.keys(s._invPick), [], '⚠⚠ the selection is cleared (LIV-02)');
    eq([s._invBulkLast && s._invBulkLast.done, s._invBulkLast && s._invBulkLast.job], [true, 7], 'the bar keeps the confirmation');
    const barH = text(s._renderInvBulk(JOB()));
    has(barH, 'The selection is cleared.', '⚠ the bar says what was done and that the selection is cleared');
    has(s._renderInvBulk(JOB()), '_invBulkDismiss()', 'with an OK');
    const t = mk([UNREAD('d', { itemNo: 15 })], { d: 1 });
    t._invBulkApply(7, 'reviewed', 1);
    eq(t._getPhotoRef(7, 'd').reviewed, undefined, 'a selection of nothing but unnamed lines ticks nothing');
    has(badges[badges.length - 1], 'Nothing was marked reviewed.', 'and says so');
    // The selection clears after every other sweep too.
    const u = mk([LINE('a', { itemNo: 1 }), LINE('b', { itemNo: 2 })], { a: 1, b: 1 });
    u._invBulkApply(7, 'condition', 'Good');
    eq([u._getPhotoRef(7, 'a').condition, u._getPhotoRef(7, 'b').condition, Object.keys(u._invPick).length], ['Good', 'Good', 0], '⚠⚠ Set condition writes both, then the selection is cleared');
    // ⚠⚠ Two sweeps pressed while one read is out (P6's review): the first clears the selection as it ends, and the second still
    // acts on the lines that were picked when it was pressed (_invPickedAsked; browser step 121 found the condition dropped).
    const q = mk([LINE('a', { itemNo: 1, category: 'Art & Décor' }), LINE('b', { itemNo: 2, category: 'Art & Décor' }), LINE('c', { itemNo: 3, category: 'Art & Décor' })], { a: 1, b: 1 });
    const waiting = [];
    q.invReadFirst = (j, what, go) => { waiting.push(go); return true; };
    q._invBulkApply(7, 'category', 'Furniture');
    q._invBulkApply(7, 'condition', 'Fair');
    eq(waiting.length, 2, 'fixture: both presses wait on the read');
    waiting.forEach((go) => go({ gone: [], changed: [], added: [], held: false }));
    eq(['a', 'b', 'c'].map((id) => [q._getPhotoRef(7, id).category, q._getPhotoRef(7, id).condition]),
      [['Furniture', 'Fair'], ['Furniture', 'Fair'], ['Art & Décor', undefined]],
      '⚠⚠ both sweeps land on the two lines picked, and on nothing else');
    eq(Object.keys(q._invPick).length, 0, 'and the selection is cleared once both have gone');
    // Clear, and OK, let the line go (the sweep's R33: Clear left the confirmation of an earlier press on the bar).
    const CP = sandbox({ fns: ['_invClearPicks', '_invBulkDismiss'], stubs: { _invPick: { a: 1 }, _invBulkLast: { msg: 'x', done: true, job: 7 }, renderInventoryTab() {} } });
    CP._invClearPicks();
    eq([Object.keys(CP._invPick).length, CP._invBulkLast], [0, null], '⚠ Clear takes the picks and the confirmation off the bar');
    CP._invBulkLast = { msg: 'x', done: true, job: 7 };
    CP._invBulkDismiss();
    eq(CP._invBulkLast, null, 'and so does OK');
  });

  // ═══ E. A NOTE ON AN UNNAMED LINE STAYS ON THE LIST ═══
  G('E · agentNoticeQuiet: a tick on a line with no name never takes its note off the list', () => {
    const s = sandbox({ fns: ['agentNoticeQuiet'], stubs: { invLineReviewed: (r) => !!(r && r.reviewed), _invPhotoSiblings: () => [], mustFindAllFound: () => false } });
    eq(s.agentNoticeQuiet('other', UNREAD('d', { reviewed: true }), null), false, '⚠⚠ ticked, unnamed: the note stays (AGT-02)');
    eq(s.agentNoticeQuiet('other', LINE('a', { reviewed: true }), null), true, 'ticked and named: quiet, as Q90 has it');
    eq(s.agentNoticeQuiet('other', LINE('a', { reviewed: false }), null), false, 'unticked: on the list');
    const t = sandbox({ fns: ['agentNoticeQuiet'], stubs: { invLineReviewed: (r) => !!(r && r.reviewed), mustFindAllFound: () => false,
      _invPhotoSiblings: () => [LINE('p', { reviewed: true }), UNREAD('q', { reviewed: true })] } });
    eq(t.agentNoticeQuiet('other', LINE('p', { reviewed: true }), { id: 7 }), false, 'a photograph with one unnamed line off it keeps its note on the list');
  });

  // ═══ F. SELECT ALL ═══
  G('F · Select all picks only lines with a name, except under Unnamed shots and Nothing to list', () => {
    const s = lift(['_invPickGroup'], ['renderInventoryTab', '_invMatchesFilter'], {
      jobs: [JOB()], _photoRefs: { 7: [LINE('a', { disposition: '' }), NOTHING('n'), UNREAD('d'), LINE('b', { objectName: '  ' })] }, renderInventoryTab() {},
      _invMatchesFilter: () => true, _invFilter: { when: 'all', room: '', q: '', flag: '' }, _invPick: {},
    });
    s._invPickGroup(7, '', true);
    eq(Object.keys(s._invPick).sort(), ['a'], '⚠⚠ Select all picks the named line: never the empty photograph (EST-09), nor the too-dark frame or a photograph never read (P9\'s review: Donate, then Set recipient, put #15 on the trustee\'s request)');
    s._invPick = {}; s._invFilter.flag = 'nothing';
    s._invPickGroup(7, '', true);
    ok(!!s._invPick.n, 'under the Nothing to list chip, Select all picks the pile on screen');
    s._invPick = {}; s._invFilter.flag = 'unnamed';
    s._invPickGroup(7, '', true);
    ok(!!s._invPick.d && !!s._invPick.b, 'under Unnamed shots, Select all picks the lines waiting for a name (Remove lines over a drawer\'s photographs)');
    s._invPick = { a: 1, d: 1 }; s._invFilter.flag = '';
    s._invPickGroup(7, '', false);
    eq(Object.keys(s._invPick), [], 'and unpicking takes every line of the group off, named or not');
    has(fn('_renderInvGroupHead'), 'A line with no name yet is left out', 'the button says so');
  });

  // ═══ G. A FILTER CHANGED CLEARS THE SELECTION ═══
  G('G · every filter change clears the selection and the rows held; the search keeps what was typed', () => {
    let opt = null;
    const s = sandbox({ fns: ['setInvWhen', 'setInvRoom', 'setInvQuery', 'setInvFlag', 'invClearFilters', '_invFilterChanged'], vars: ['_invQRaw'],
      stubs: { renderInventoryTab(o) { opt = o; }, _invFilter: { when: 'all', room: '', q: '', flag: '' }, _invPick: {}, _invHeld: {}, _invBulkLast: null } });
    const set = (name, arg) => { s._invPick = { a: 1 }; s._invHeld = { a: 7 }; s._invBulkLast = { msg: 'x' }; s[name](arg); return [Object.keys(s._invPick).length, Object.keys(s._invHeld).length, s._invBulkLast]; };
    eq(set('setInvWhen', 'today'), [0, 0, null], '⚠⚠ When');
    eq(set('setInvRoom', '3'), [0, 0, null], '⚠⚠ the room');
    eq(set('setInvFlag', 'unnamed'), [0, 0, null], '⚠⚠ a chip');
    eq(set('setInvQuery', 'oak'), [0, 0, null], '⚠⚠ the search');
    eq(s._invFilter.q, 'oak', 'fixture: the search is set');
    eq(set('setInvQuery', 'oak '), [1, 1, { msg: 'x' }], 'a space that filters nothing new clears nothing');
    eq([s._invQRaw, s._invFilter.q], ['oak ', 'oak'], '⚠ the box keeps the space typed (ROW-03); the filter reads it trimmed');
    eq(opt, { morph: true }, '⚠⚠ the search redraws in place (the box keeps its focus and the iPad keyboard)');
    opt = null;
    s.setInvRoom('2');
    eq(opt, { morph: true }, 'and so does the room picker');
    // Another client starts its own desk: the typed search and the rows held go (the sweep's R38).
    const AW = attempt(() => { const w = lift(['_invApplyWhenDefault'], ['_invCapturedToday'], { _invCapturedToday: () => false, _invWhenJob: 7,
      _invFilter: { when: 'all', room: '', q: 'oak', flag: 'unreviewed' }, _invQRaw: 'oak ', _invHeld: { a: 7 } }); w._invApplyWhenDefault(8, []); return [w._invQRaw, Object.keys(w._invHeld).length, w._invFilter.flag]; });
    eq(AW.ok ? AW.val : AW.err, ['', 0, ''], '⚠ another client: the search box\'s text and the held rows go with the filter');
    eq(set('invClearFilters'), [0, 0, null], 'Clear filters');
    eq(s._invQRaw, '', 'and the search box with it');
    // The box is drawn with what was typed, the space included, while it is the search on screen (the sweep's R25: the raw text
    // was kept and never drawn). A search set elsewhere (another client, Clear filters) draws the filter's own words.
    const FR = (raw, q) => attempt(() => {
      const f = lift(['_renderInvFilterRow'], ['_invEarlierHintHtml'], { _invEarlierHintHtml: () => '', _invRoomName: () => 'Kitchen',
        _invFilter: { when: 'all', room: '', q: q, flag: '' }, _invQRaw: raw });
      return f._renderInvFilterRow(JOB(), [LINE('a')]);
    });
    const v = (r) => { const m = /<input type="search"[^>]*value="([^"]*)"/.exec(r.ok ? r.val : ''); return m ? m[1] : null; };
    eq(v(FR('harbor ', 'harbor')), 'harbor ', '⚠⚠ the box is drawn with the space typed under the caret (ROW-03)');
    eq(v(FR('oak', 'harbor')), 'harbor', 'a search the box did not type draws the filter\'s words');
    has(FR('', '').ok ? FR('', '').val : '', '<select id="inv-room-pick"', 'the room picker carries the id a full redraw gives the focus back by');
  });

  // ═══ H. PICKS OFF SCREEN ═══
  G('H · a press over selected lines not on screen asks first; OK goes on with those on screen', () => {
    const asked = [], alerts = [];
    let answer = true;
    const s = lift(['_invAskOffScreen', 'invBulkRemove', '_invPickedAsked', '_getPhotoRef'], ['renderInventoryTab', 'invReadFirst', 'savePhotoRefs', '_scheduleInventorySync', '_invMatchesFilter'], {
      jobs: [JOB()], _photoRefs: { 7: [LINE('m4', { itemNo: 4, objectName: 'Tufted linen sofa', disposition: 'Move' }), LINE('m5', { itemNo: 5, disposition: 'Move' }),
        LINE('k', { itemNo: 3, objectName: 'Brass candlesticks', disposition: 'Keep' })] },
      renderInventoryTab() {}, invReadFirst: () => false, savePhotoRefs() {}, _scheduleInventorySync() {},
      _invMatchesFilter: () => true, _invFold: { Move: 1 }, _invTouch: (r) => r, showSyncBadge() {}, deviceUser: () => 'Ashley Jerome',
      alert: (m) => alerts.push(m), window: { confirm: (m) => { asked.push(m); return answer; } }, _invPick: {},
    });
    s._invPick = { m4: 1, m5: 1, k: 1 };
    answer = false;
    eq(s._invAskOffScreen(7), false, 'Cancel: nothing goes on');
    has(asked[0], '2 of the 3 selected lines are not on screen', '⚠⚠ it counts what is off screen');
    has(asked[0], '#4 Tufted linen sofa', 'and names it');
    eq(Object.keys(s._invPick).length, 3, 'Cancel changes nothing');
    answer = true;
    s.invBulkRemove(7);
    ok(!s._getPhotoRef(7, 'm4').deletedAt && !s._getPhotoRef(7, 'm5').deletedAt, '⚠⚠ Remove lines leaves the folded lines (LIV-02)');
    ok(!!s._getPhotoRef(7, 'k').deletedAt, 'and removes the one on screen');
    s._invPick = { m4: 1 };
    eq(s._invAskOffScreen(7), false, 'none on screen: nothing goes on');
    has(alerts[alerts.length - 1], 'None of the 1 selected line is on screen', 'and it says so');
    s._invFold = {};
    eq(s._invAskOffScreen(7), true, 'every pick on screen: nothing to ask');
    const src = noComments(fn('_invBulkApply')) + noComments(fn('invBulkRevalue')) + noComments(fn('invRecordApproval')) + noComments(fn('printApprovalRequest')) + noComments(fn('sendApprovalRequest'));
    eq(count(src, '_invAskOffScreen(jobId)'), 5, 'every other press on the selection bar asks it too: the sweeps, Re-value, Record approval, the request printed and sent');
  });

  // ═══ I. A TICKED ROW STAYS WHERE IT WAS ═══
  G('I · a row ticked under Not reviewed or Unsure is held in place, greyed, shut, with Undo', () => {
    const refsI = { 7: [LINE('a', { disposition: '' })] };
    const s = sandbox({ fns: ['_invSetReviewed', '_invMatchesFilter', '_invHeldShown', '_invUndoHeld', '_invStampLineReviewed', '_invFilterChanged'],
      stubs: { _invFilter: { when: 'all', room: '', q: '', flag: 'unreviewed' }, _invHeld: {}, _invPick: {}, _invBulkLast: null,
        _photoRefs: refsI, jobs: [JOB()],
        _getPhotoRef: (j, id) => refsI[j].find((r) => r.stableId === id), _invJob: () => JOB(), _setPhotoRef() {}, _invTouch: (r) => r,
        savePhotoRefs() {}, _scheduleInventorySync() {}, renderInventoryTab() {}, _invStampBy: () => 'Ashley Jerome', _avHasFigure: () => false,
        _invFilterHides: (r) => (r.reviewed ? ['flag'] : []) } });
    const a = () => s._photoRefs[7][0];
    s._invSetReviewed(7, 'a', true);
    eq(s._invHeld.a, 7, '⚠⚠ ticked under Not reviewed: held');
    eq(s._invMatchesFilter(a(), JOB()), true, '⚠⚠ so it stays on screen though the chip no longer matches it (ROW-08)');
    s._invFilterHides = () => ['flag', 'room'];
    eq(s._invMatchesFilter(a(), JOB()), false, 'anything else that hides it still does');
    s._invFilterHides = (r) => (r.reviewed ? ['flag'] : []);
    s._invFilter.flag = 'undecided';
    eq(s._invHeldShown(a(), JOB()), false, 'only under Not reviewed or Unsure');
    s._invFilter.flag = 'unsure';
    eq(s._invHeldShown(a(), JOB()), true, 'Unsure too');
    s._invUndoHeld(7, 'a');
    eq([a().reviewed, s._invHeld.a], [false, undefined], 'Undo unticks it and lets it go');
    s._invSetReviewed(7, 'a', true);
    s._invFilterChanged();
    eq(Object.keys(s._invHeld), [], 'the view changed: nothing held');
    // The row as drawn.
    const r = lift(['_renderInvRow'], ['_invInput', '_invThumbHTML', 'custodyEvents', '_invPanelCols', '_renderInvPanel'], {
      jobs: [JOB()], _photoRefs: { 7: [LINE('a', { itemNo: 1, reviewed: true, reviewedBy: 'Ashley Jerome', disposition: '' })] },
      _invInput: () => '', _invThumbHTML: () => '<div></div>', custodyEvents: () => [], _invPanelCols: () => [], _renderInvPanel: () => '',
      estimateStore: { 7: { estimate: { rooms: ROOMS } } }, _invFilter: { when: 'all', room: '', q: '', flag: 'unreviewed' }, _invHeld: { a: 7 },
    });
    r._agDupSet = {};
    const h = attempt(() => r._renderInvRow(JOB(), r._getPhotoRef(7, 'a')));
    ok(h.ok, 'the row draws' + (h.ok ? '' : ': ' + h.err));
    const html = h.ok ? h.val : '';
    has(html, 'class="inv-row-held"', '⚠⚠ greyed');
    has(html, "_invUndoHeld(7,'a')", 'with Undo');
    has(text(html), '✓ Reviewed by Ashley Jerome', 'saying what was done');
    ok(/<input type="checkbox"[^>]*\bdisabled\b[^>]*_invSetReviewed/.test(html), '⚠⚠ its box shut to a second press');
  });

  // ═══ J. ONE BOX PER VALUE ═══
  G('J · the record has no name box, and no Who takes it box where the row carries one', () => {
    const s = sandbox({ fns: ['_invPanelCols', '_invPanelColsFor', '_invColOnJob', 'invFiduciaryMode', 'isDecedentJob', '_invRowHasWho'],
      vars: ['INVENTORY_COLUMNS', 'DECEDENT_SERVICES', 'INV_RELEASE_DISPOSITIONS'] });
    const keys = (d) => s._invPanelColsFor(JOB(), LINE('a', { disposition: d })).map((c) => c.key);
    ok(s._invPanelCols(JOB()).every((c) => c.key !== 'objectName'), '⚠⚠ no second name box (ROW-05)');
    ok(keys('Donate').indexOf('channel') < 0 && keys('Move').indexOf('channel') < 0, '⚠⚠ no second Who takes it box on Donate or Move');
    ok(keys('Keep').indexOf('channel') >= 0 && keys('').indexOf('channel') >= 0, 'where the row has none (Keep, Undecided) the record keeps it');
    has(fn('_renderInvPanel'), '_invPanelColsFor(job, ref)', 'the record reads it');
  });

  // ═══ K. THE PACKAGE'S QUESTION ═══
  G('K · the package\'s question counts every gap the desk counts; an unshot collection line is not the inventory', () => {
    const lines = [LINE('a', { disposition: 'Auction', fmv: 100, valuedBy: 'desk' }), LINE('b', { objectName: '' }), LINE('c', { objectName: '' }),
      NOTHING('n'), LINE('u', { disposition: '' }), LINE('f', { disposition: 'Auction', fmv: 200, valuedBy: 'desk', flagBequest: true })];
    const s = lift(['probatePackageGaps', 'probatePackageInventoryBlocker'], ['_planRooms', '_planRoomStatus', 'invDoubleCounts', 'invListRead', 'estatePackageRoute', 'collectionLineUnshot'], {
      jobs: [JOB()], _photoRefs: { 7: lines }, _planRooms: () => ({ rooms: [] }), _planRoomStatus: () => 'locked', invDoubleCounts: () => null, invListRead: () => null,
      estatePackageRoute: () => ({ name: 'trust package' }), collectionLineUnshot: (r) => !!r.collUnshot, estimateStore: {},
    });
    const g = attempt(() => s.probatePackageGaps(7));
    ok(g.ok, 'it runs' + (g.ok ? '' : ': ' + g.err));
    const gaps = g.ok ? g.val : [];
    ok(gaps.indexOf('2 photographs not yet named') >= 0, '⚠⚠ the photographs not yet named (INV-07): ' + JSON.stringify(gaps));
    ok(gaps.indexOf('1 photograph Agent One found nothing in, not yet taken off the list') >= 0, '⚠ the one with nothing to list');
    ok(gaps.indexOf('4 lines with no disposition') >= 0, '⚠ every line with no destination, named or not, as the desk counts (NEW-07)');
    ok(gaps.indexOf('4 lines with no value') >= 0, 'every line with no value, on a tier that states values');
    ok(gaps.indexOf('1 line flagged for a look and not yet ticked') >= 0, '⚠⚠ the lines the app flags that nobody has ticked (a bequest), not the ones said above');
    const t = lift(['probatePackageInventoryBlocker'], ['estatePackageRoute', 'collectionLineUnshot'], {
      estatePackageRoute: () => ({ name: 'trust package' }), collectionLineUnshot: (r) => !!r.collUnshot });
    has(t.probatePackageInventoryBlocker(JOB(), [LINE('col', { collUnshot: true }), LINE('b', { objectName: '' })]), 'the inventory holds no named line',
      '⚠⚠ the walkthrough\'s own collection line, never photographed, is not the inventory (INV-07)');
    eq(t.probatePackageInventoryBlocker(JOB(), [LINE('col', { collUnshot: true }), LINE('a')]), '', 'a named photographed line is');
  });

  // ═══ L. THE PATCH IN PLACE ═══
  G('L · _invPatch keeps what is the same, changes what differs, and falls back to assignment where it cannot parse', () => {
    // A hand-built DOM: enough of Node to run the real morph over two trees built by hand (the harness's stub parses nothing).
    let active = null;
    const mk = (tag, attrs, kids) => {
      const el = { nodeType: 1, tagName: tag, attributes: [], childNodes: [], value: '', checked: false, disabled: false,
        get id() { return this.getAttribute('id') || ''; }, get type() { return this.getAttribute('type') || 'text'; },
        hasAttribute(k) { return this.attributes.some((a) => a.name === k); },
        getAttribute(k) { const a = this.attributes.find((x) => x.name === k); return a ? a.value : null; },
        setAttribute(k, v) { const a = this.attributes.find((x) => x.name === k); if (a) a.value = String(v); else this.attributes.push({ name: k, value: String(v) }); },
        removeAttribute(k) { this.attributes = this.attributes.filter((a) => a.name !== k); },
        appendChild(c) { this.childNodes.push(c); c.parentNode = this; return c; },
        removeChild(c) { this.childNodes = this.childNodes.filter((x) => x !== c); return c; },
        replaceChild(n, o) { const i = this.childNodes.indexOf(o); this.childNodes[i] = n; n.parentNode = this; return o; },
        insertBefore(n, ref) { const i = ref ? this.childNodes.indexOf(ref) : -1; if (i < 0) this.childNodes.push(n); else this.childNodes.splice(i, 0, n); n.parentNode = this; return n; },
        querySelector() { let hit = null; const walk = (n) => (n.childNodes || []).some((c) => { if (c.nodeType !== 1) return false;
          if (['onclick', 'onchange', 'oninput', 'for', 'href'].some((k) => c.hasAttribute(k))) { hit = c; return true; } return walk(c); }); walk(this); return hit; },
        querySelectorAll(sel) { const out = []; const walk = (n) => (n.childNodes || []).forEach((c) => { if (c.nodeType === 1 && c.tagName.toLowerCase() === sel) out.push(c); walk(c); }); walk(this); return out; },
        get firstElementChild() { return this.childNodes.find((c) => c.nodeType === 1) || null; },
        get textContent() { return this.childNodes.map((c) => (c.nodeType === 3 ? c.nodeValue : c.textContent)).join(''); } };
      Object.keys(attrs || {}).forEach((k) => el.setAttribute(k, attrs[k]));
      (kids || []).forEach((c) => el.appendChild(c));
      return el;
    };
    const tx = (v) => ({ nodeType: 3, nodeValue: v });
    const s = sandbox({ fns: ['_invPatch', '_invMorphNode', '_invMorphKids', '_invMorphKey', '_invMorphAct'], stubs: { document: { get activeElement() { return active; } } } });
    const btn = mk('BUTTON', { class: 'btn-s', onclick: "setInvFlag('noval')" }, [tx('No value yet '), mk('STRONG', {}, [tx('3')])]);
    const box = mk('INPUT', { type: 'text', id: 'inv-fmv-a', value: '$350' }); box.value = '50';
    const a = mk('DIV', { id: 'inv-flagstrip' }, [btn, box, mk('SPAN', { id: 'x' }, [tx('old')])]);
    const b = mk('DIV', { id: 'inv-flagstrip' }, [mk('BUTTON', { class: 'btn-s', onclick: "setInvFlag('noval')", style: 'opacity:.45;' }, [tx('No value yet '), mk('STRONG', {}, [tx('2')])]),
      mk('INPUT', { type: 'text', id: 'inv-fmv-a', value: '$500.00' }), mk('SPAN', { id: 'y' }, [tx('new')]), mk('EM', {}, [tx('added')])]);
    active = box;
    s._invMorphNode(a, b);
    ok(a.childNodes[0] === btn, '⚠⚠ the button under the pointer is the same element after the repaint (SYN-12)');
    eq([btn.getAttribute('style'), btn.textContent], ['opacity:.45;', 'No value yet 2'], 'its attributes and its count brought up to date');
    ok(a.childNodes[1] === box && box.value === '50', '⚠⚠ the box with the focus is kept, and keeps what is typed in it (ROW-03, ROW-04)');
    eq(box.getAttribute('value'), '$500.00', 'its attribute follows the markup');
    eq([a.childNodes[2].getAttribute('id'), a.childNodes[2].textContent], ['y', 'new'], 'an element of another id is replaced');
    eq([a.childNodes.length, a.childNodes[3].tagName], [4, 'EM'], 'one more in the markup is added');
    active = null;
    const c = mk('DIV', {}, [mk('INPUT', { type: 'checkbox', checked: '' }), mk('INPUT', { type: 'text', value: 'x' }), tx('a'), mk('B', {}, [])]);
    c.childNodes[0].checked = true; c.childNodes[1].value = 'typed';
    s._invMorphKids(c, mk('DIV', {}, [mk('INPUT', { type: 'checkbox', disabled: '' }), mk('INPUT', { type: 'text', value: 'y' })]));
    eq([c.childNodes[0].checked, c.childNodes[0].disabled, c.childNodes[1].value, c.childNodes.length], [false, true, 'y', 2],
      'a tick, a shut box and a value follow the markup where nobody is in the box; what the markup lacks goes');
    // ⚠⚠ NEVER BY PLACE ALONE (P9's review, 2026-10-28): a repaint that takes a control away before the one pressed. The first build kept
    // the element at each place and gave it the next one's action: the Estate Inventory PDF pressed ran the CSV.
    const val = mk('BUTTON', { class: 'btn-s', onclick: 'agentValueRun(7)' }, [tx('Value 1 line')]);
    const pdf = mk('BUTTON', { class: 'btn-s', onclick: 'printEstateInventoryReport(7)' }, [tx('Estate Inventory PDF')]);
    const csv = mk('BUTTON', { class: 'btn-s', onclick: 'exportInventoryCSV(7)' }, [tx('CSV')]);
    const bar = mk('DIV', {}, [val, tx(' '), pdf, tx(' '), csv]);
    s._invMorphKids(bar, mk('DIV', {}, [mk('BUTTON', { class: 'btn-s', onclick: 'printEstateInventoryReport(7)' }, [tx('Estate Inventory PDF')]), tx(' '),
      mk('BUTTON', { class: 'btn-s', onclick: 'exportInventoryCSV(7)' }, [tx('CSV')])]));
    const kids = bar.childNodes.filter((n) => n.nodeType === 1);
    ok(kids[0] === pdf && kids[1] === csv, '⚠⚠ Value 1 line goes, and the Estate Inventory PDF and the CSV are the same buttons as before');
    eq(kids.map((k) => [k.getAttribute('onclick'), k.textContent]), [['printEstateInventoryReport(7)', 'Estate Inventory PDF'], ['exportInventoryCSV(7)', 'CSV']],
      '⚠⚠ each still does what it did: no button takes its neighbour\'s action or label');
    eq([val.getAttribute('onclick'), val.textContent], ['agentValueRun(7)', 'Value 1 line'], 'the button taken away was taken away, never re-pointed');
    // One added before it: kept too.
    s._invMorphKids(bar, mk('DIV', {}, [mk('BUTTON', { class: 'btn-s', onclick: 'agentRoomCheckRun(7)' }, [tx('Check 2 rooms')]), tx(' '),
      mk('BUTTON', { class: 'btn-s', onclick: 'printEstateInventoryReport(7)' }, [tx('Estate Inventory PDF')])]));
    ok(bar.childNodes.filter((n) => n.nodeType === 1)[1] === pdf, '⚠ and a button added before it leaves it where it is');
    // A note's block has no id and no action of its own: it is matched by the action inside it (the notes' Show the item).
    const note = (id) => mk('DIV', { class: 'ag-note' }, [mk('SPAN', {}, [tx('Look at the papers in ' + id)]), mk('BUTTON', { class: 'desk-show', onclick: "deskShowLine(7,'" + id + "')" }, [tx('Show the item')])]);
    const n1 = note('o1'), n2 = note('o2'), n3 = note('o3'), list = mk('DIV', { id: 'inv-agent-notices' }, [n1, n2, n3]);
    const show2 = n2.childNodes[1];
    s._invMorphKids(list, mk('DIV', {}, [note('o2'), note('o3')]));
    ok(list.childNodes[0] === n2 && n2.childNodes[1] === show2, '⚠⚠ the first note quietened: the second note, and its Show the item, are the same elements');
    eq(show2.getAttribute('onclick'), "deskShowLine(7,'o2')", '⚠⚠ and Show the item on #o2 still shows #o2 (it showed #o3)');
    // A control whose own action changed is replaced: at worst a press is lost, never sent somewhere else.
    const was = mk('BUTTON', { onclick: 'a()' }, [tx('A')]), box2 = mk('DIV', {}, [was]);
    s._invMorphKids(box2, mk('DIV', {}, [mk('BUTTON', { onclick: 'b()' }, [tx('B')])]));
    ok(box2.childNodes[0] !== was && was.getAttribute('onclick') === 'a()', '⚠ a button whose action changed is a new button; the old one is never re-pointed');
    eq(s._invMorphKey(mk('INPUT', { id: 'inv-fmv-a', onchange: "_invEdit(7,'a','fmv',this)" })), "INPUT#inv-fmv-a~|onchange=_invEdit(7,'a','fmv',this)", 'the key: tag, id, data-k and the action');
    // Only an element with elements inside it is searched for the action inside it: a 600-line desk is mostly options, spans and
    // boxes, and searching each took the key from 100 ms to 650 ms of a whole-tab patch (measured in the browser, 20,348 elements).
    const leaf = mk('SPAN', { class: 'x' }, [tx('just text')]); let searched = 0; leaf.querySelector = () => { searched++; return null; };
    const wrap = mk('DIV', {}, [mk('BUTTON', { onclick: 'w()' }, [tx('W')])]);
    eq([s._invMorphKey(leaf), searched, s._invMorphKey(wrap)], ['SPAN#~', 0, 'DIV#~>BUTTON|onclick=w()'], 'a leaf is never searched; a wrapper takes the action inside it');
    // Every handler it carries is part of what it does, in name order (a bar's head carries onkeydown beside onclick).
    eq(s._invMorphKey(mk('DIV', { onkeydown: 'k()', class: 'sec-hdr', onclick: 'c()', title: 't' })), 'DIV#~|onclick=c()|onkeydown=k()', '⚠ the key holds every handler, onkeydown too, in name order');
    const kd = mk('DIV', { onclick: 'c()', onkeydown: 'k1()' }, [tx('Releases')]), box3 = mk('DIV', {}, [kd]);
    s._invMorphKids(box3, mk('DIV', {}, [mk('DIV', { onclick: 'c()', onkeydown: 'k2()' }, [tx('Releases')])]));
    ok(box3.childNodes[0] !== kd && kd.getAttribute('onkeydown') === 'k1()', '⚠ a control whose key handler changed is a new control too: no handler is ever re-pointed');
    // _invPatch itself, where the page can parse markup (a <template>): it morphs, never assigns (the sweep's R24: the morph
    // functions alone passed with _invPatch assigning every time). The template's parse is the hand-built tree for that markup.
    const TREES = {};
    const P = sandbox({ fns: ['_invPatch', '_invMorphNode', '_invMorphKids', '_invMorphKey', '_invMorphAct'], stubs: { document: { get activeElement() { return active; },
      createElement: () => { const t = { content: { childNodes: [] } }; Object.defineProperty(t, 'innerHTML', { set(h) { t.content = mk('FRAG', {}, TREES[h] ? TREES[h]() : []); } }); return t; } } } });
    const btn2 = mk('BUTTON', { class: 'btn-s' }, [tx('Estate Inventory PDF')]);
    const wb = mk('DIV', { id: 'inv-workbar' }, [btn2, mk('SPAN', {}, [tx('3 of 9 reviewed')])]);
    TREES.outer = () => [mk('DIV', { id: 'inv-workbar', 'data-rk': 'k2' }, [mk('BUTTON', { class: 'btn-s', title: 'now' }, [tx('Estate Inventory PDF')]), mk('SPAN', {}, [tx('4 of 9 reviewed')])])];
    P._invPatch(wb, 'outer');
    ok(wb.childNodes[0] === btn2, '⚠⚠ _invPatch keeps the button under the pointer (the work bar repainted straight after a name typed)');
    eq([wb.getAttribute('data-rk'), btn2.getAttribute('title'), wb.textContent], ['k2', 'now', 'Estate Inventory PDF4 of 9 reviewed'], '…and brings the bar up to date');
    const host = mk('DIV', { id: 'inv-flagstrip' }, [btn2]);
    TREES.inner = () => [mk('BUTTON', { class: 'btn-s', title: 'chip' }, [tx('No value yet 2')])];
    P._invPatch(host, 'inner', true);
    eq([host.childNodes[0] === btn2, btn2.getAttribute('title'), host.textContent], [true, 'chip', 'No value yet 2'], '⚠ and the inner form patches the host\'s children');
    TREES.other = () => [mk('SECTION', { id: 'inv-workbar' }, [])];
    P._invPatch(wb, 'other');
    eq(wb.outerHTML, 'other', 'a different tag is replaced whole');
    // The tests' DOM stub cannot parse markup: the patch assigns, as the repaints always did.
    const d = sandbox({ fns: ['_invPatch'], stubs: { document: domStub({}) } });
    const el = d.document.getElementById('inv-workbar');
    d._invPatch(el, '<div id="inv-workbar">x</div>');
    eq(el.outerHTML, '<div id="inv-workbar">x</div>', 'where it cannot parse, the outer repaint assigns');
    d._invPatch(el, '<b>y</b>', true);
    eq(el.innerHTML, '<b>y</b>', 'and the inner one');
  });

  // ═══ M. EVERY REPAINT A PRESS CAN MEET GOES THROUGH IT ═══
  G('M · the repaints an edit makes, and the search, patch in place', () => {
    const body = (n) => noComments(fn(n));
    const sites = {
      _invEdit: ['_invPatch(_wbEl, _renderInvWorkbar(', '_invPatch(_rowEl, _renderInvRow(', '_invPatch(_bbEl, _renderInvBulk(', '_invPatch(_noteEl, _avNoticesHtml('],
      _invReviewRepaint: ['_invPatch(rb, _invRevBoxHtml(', '_invPatch(head, _renderInvGroupHead(', '_invPatch(wb, _renderInvWorkbar('],
      _invReadLineRepaint: ['_invPatch(wb, _renderInvWorkbar('],
      _invRefreshFlagStrip: ['_invPatch(el, _renderInvFlagStrip(', '_invPatch(hint, _invEarlierHintHtml('],
      _invRefreshReleases: ['_invPatch(el, html || INV_RELEASES_HOST_EMPTY)'],
      _invRefreshRecords: ['_invPatch(el, _renderLedgerCards('],
      _invRefreshGuardrail: ['_invPatch(el, _renderAppraisalGuardrail('],
      _invRefreshAgentNotices: ['_invPatch(el, _agNoticesHtml('],
      _deskNowRepaint: ['_invPatch(a, deskAlertsHtml('],
      invMarkListRead: ['_invPatch(wb, _renderInvWorkbar('],
    };
    Object.keys(sites).forEach((f) => {
      const b = body(f);
      sites[f].forEach((n) => eq(count(b, n), 1, f + ': ' + n.replace(/\($/, '') + ' in place'));
      eq(count(b, '.outerHTML = _renderInvWorkbar(') + count(b, 'rb.outerHTML') + count(b, '_rowEl.outerHTML'), 0, f + ': no repaint left that replaces the controls');
    });
    has(body('renderInventoryTab'), 'if (opt && opt.morph) _invPatch(cont, _html, true);', 'renderInventoryTab patches in place when asked');
    has(body('renderInventoryTab'), '_kel.focus();', 'and puts back the search\'s or the room picker\'s focus after any redraw');
  });

  // ═══ N. THE ROW'S WORDS ═══
  G('N · a too-dark frame says why on its row, with + Close-up; an empty photograph says nothing to list', () => {
    const s = lift(['_renderInvRow'], ['_invInput', '_invThumbHTML', 'custodyEvents', '_invPanelCols', '_renderInvPanel'], {
      jobs: [JOB()], _photoRefs: { 7: [UNREAD('d', { itemNo: 15 }), NOTHING('n', { itemNo: 13 }), UNREAD('sp', { itemNo: 16, derivedFrom: 'd', agentNotices: [] })] },
      _invInput: () => '', _invThumbHTML: () => '<div></div>', custodyEvents: () => [], _invPanelCols: () => [], _renderInvPanel: () => '',
      estimateStore: { 7: { estimate: { rooms: ROOMS } } }, _invFilter: { when: 'all', room: '', q: '', flag: '' }, _invHeld: {},
    });
    s._agDupSet = {};
    const d = attempt(() => s._renderInvRow(JOB(), s._getPhotoRef(7, 'd'))), n = attempt(() => s._renderInvRow(JOB(), s._getPhotoRef(7, 'n')));
    ok(d.ok && n.ok, 'both rows draw' + (d.ok ? '' : ': ' + d.err) + (n.ok ? '' : ': ' + n.err));
    has(text(d.ok ? d.val : ''), 'could not be read: ' + DARK, '⚠⚠ the too-dark frame says why (AGT-02)');
    lacks(text(d.ok ? d.val : ''), 'nothing to list', '⚠ never nothing to list');
    has(d.ok ? d.val : '', "invAddCloseUp(7,'d',this)", '⚠ + Close-up on its row');
    has(text(n.ok ? n.val : ''), 'nothing to list', 'the empty photograph says nothing to list');
    has(n.ok ? n.val : '', 'Remove the N with nothing to list, on the Inventory Review bar', 'its title names the one press');
    s._invOpen = { d: 1 };
    eq(count(s._renderInvRow(JOB(), s._getPhotoRef(7, 'd')), "invAddCloseUp(7,'d',this)"), 0, 'with its record open, the record\'s + Close-up is the one (no control twice)');
    // ⚠ P9's review: a line split off a photograph is offered no + Close-up for it (Agent One reads the photograph's own close-ups).
    const sp = attempt(() => s._renderInvRow(JOB(), s._getPhotoRef(7, 'sp')));
    has(text(sp.ok ? sp.val : sp.err), 'could not be read: ' + DARK, 'a split line Agent One could not read says why, with the photograph\'s note');
    eq(count(sp.ok ? sp.val : '', 'invAddCloseUp('), 0, '⚠⚠ and offers no + Close-up, which would change nothing');
    has(sp.ok ? sp.val : '', 'Type the name, or Remove line in its record if nothing else is there.', 'its words say what settles it');
  });

  // ═══ O. A CLOSE-UP LANDS ON A FRAME AGENT ONE COULD NOT READ ═══
  G('O · a close-up in Drive on a frame Agent One could not read sends it back to Name shots', () => {
    const badges = [];
    const s = lift(['invCloseUpLanded', 'agentUnreadNote'], ['savePhotoRefs', '_scheduleInventorySync', '_renderInvWorkbar', '_invPatch'], {
      jobs: [JOB()], _photoRefs: { 7: [UNREAD('d', { itemNo: 15 }), UNREAD('s', { itemNo: 16, derivedFrom: 'p', agentNotices: [] }),
        LINE('p', { itemNo: 9, agentNotices: [{ kind: 'other', text: 'A mark too small to read' }] }), LINE('a', { itemNo: 1 })] },
      savePhotoRefs() {}, _scheduleInventorySync() {}, _renderInvWorkbar: () => '', _invPatch() {}, _invTouch: (r) => r, showSyncBadge: (m) => badges.push(m),
      document: domStub({}),
    });
    eq(s.agentUnreadNote(7, s._getPhotoRef(7, 'd')), DARK, 'the note is the line\'s own');
    eq(s.agentUnreadNote(7, s._getPhotoRef(7, 's')), 'A mark too small to read', 'or, split off a photograph, the photograph\'s');
    eq(s.invCloseUpLanded(7, 'd'), true, 'the photograph\'s own line: the stamp comes off');
    eq(s._getPhotoRef(7, 'd').agentConf, undefined, '⚠⚠ so Name shots reads it again, with the close-up');
    has(badges[0], 'Press Name shots and Agent One reads the photograph again with it', 'and says so');
    eq(s.invCloseUpLanded(7, 's'), false, 'a split line keeps it: Agent One would read the photograph\'s close-ups, not this one');
    eq(s.invCloseUpLanded(7, 'a'), false, 'a named line is never touched');
    has(noComments(fn('invAddCloseUp')), 'invCloseUpLanded(jobId, stableId)', 'the upload calls it once the file is in Drive');
    has(noComments(fn('invRetryCloseUp')), 'invCloseUpLanded(jobId, d.groupId)', 'and so does a retried one');
  });

  // ═══ P. REMOVE LINE NAMES AGENT ONE'S NOTE ═══
  G('P · Remove line names the note Agent One left on the line', () => {
    const asked = [];
    const s = lift(['invRemoveLine'], ['renderInventoryTab', '_scheduleInventorySync', 'savePhotoRefs', 'agentNoticesOn'], {
      jobs: [JOB()], _photoRefs: { 7: [UNREAD('d', { itemNo: 15 })] }, renderInventoryTab() {}, _scheduleInventorySync() {}, savePhotoRefs() {},
      agentNoticesOn: (j, r) => (r.agentNotices || []).map((n) => ({ n: n, carried: false })), _invTouch: (r) => r, deviceUser: () => 'Ashley Jerome',
      window: { confirm: (m) => { asked.push(m); return false; } },
    });
    s.invRemoveLine(7, 'd');
    has(asked[0], 'Agent One noted on it: ' + DARK, '⚠ the confirm names the note (AGT-02)');
  });

  // ═══ R. NOTHING THE DESK DRAWS MOVES UNDER A PRESS (P9's review) ═══
  G('R · from a mousedown to its click the desk draws nothing; then what was held is drawn, as it was asked for', () => {
    const listeners = {}, timers = [], drawn = [];
    const inDesk = { id: 'inv-workbar', innerHTML: 'old', outerHTML: 'old' }, elsewhere = { id: 'plan-x', innerHTML: 'old', outerHTML: 'old' };
    const host = { contains: (el) => el === inDesk };
    const doc = { getElementById: (id) => (id === 'inventory-content' ? host : null),
      addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); } };
    const fire = (t, e) => (listeners[t] || []).forEach((f) => f(e || {}));
    const S = sandbox({ fns: ['_invPressStart', '_invPressEnd', '_invPressFlush', '_invPressHolds', '_invPressInDesk', '_invPressTrack', '_invPatch', '_invPressLater', '_invPressFn'],
      vars: ['INV_PRESS_MAX_MS', '_invPressDown', '_invPressRedraw', '_invPressTimer', '_invPressTracked', '_invPressQ', '_invPressEpoch', '_invPressOwed', '_invPressSince'],
      stubs: { document: doc, window: { addEventListener: (t, f) => { (listeners['w:' + t] = listeners['w:' + t] || []).push(f); } },
        setTimeout: (f, ms) => { timers.push({ f, ms }); return timers.length; }, clearTimeout() {}, renderInventoryTab: (o) => drawn.push(o) } });
    S._invPressTrack(); S._invPressTrack();
    eq((listeners.mousedown || []).length, 1, 'the tracker is installed once');
    S._invPatch(inDesk, '<div id="inv-workbar">new</div>');
    eq(inDesk.outerHTML, '<div id="inv-workbar">new</div>', 'with no press, a repaint is drawn at once');
    inDesk.outerHTML = 'old';
    fire('mousedown', { button: 0 });
    ok(S._invPressDown === true, 'a mousedown with the main button starts a press');
    eq(timers[timers.length - 1].ms, S.INV_PRESS_MAX_MS, 'and arms the watchdog for a release the page never hears');
    S._invPatch(inDesk, '<div id="inv-workbar">new</div>');
    eq(inDesk.outerHTML, 'old', '⚠⚠ during the press a repaint on the desk draws nothing (the button pressed stays where it was)');
    eq([S._invPressQ.length, S._invPressRedraw], [1, false], 'it is held, as it was asked for, and no whole redraw is owed');
    S._invPatch(elsewhere, 'new');
    eq(elsewhere.outerHTML, 'new', 'a repaint off the desk is never held');
    fire('mouseup', {});
    ok(S._invPressDown === false, 'the mouseup ends the press');
    eq(inDesk.outerHTML, 'old', '⚠ nothing is drawn before the click (the click runs in the mouseup\'s task)');
    const after = timers.filter((t) => t.ms === 0);
    eq(after.length, 1, 'the held repaint is a timer of 0 after the mouseup, so after the click');
    after.forEach((t) => t.f());
    eq(inDesk.outerHTML, '<div id="inv-workbar">new</div>', '⚠⚠ then the held repaint is drawn');
    eq(drawn, [], '⚠⚠ and never turned into a whole redraw (which would apply the filters: a line named under Unnamed shots would leave the view)');
    // A repaint the click itself made since is newer: the held one is not drawn over it (the name typed, then the Reviewed box ticked).
    const rb = { id: 'inv-rev-a', outerHTML: 'unticked' };
    host.contains = (el) => el === inDesk || el === rb;
    fire('mousedown', { button: 0 });
    S._invPatch(rb, 'unticked, as the name left it');
    fire('mouseup', {});
    S._invPatch(rb, 'ticked, by the click');
    timers.filter((t) => t.ms === 0).slice(-1).forEach((t) => t.f());
    eq(rb.outerHTML, 'ticked, by the click', '⚠⚠ a repaint the click made since wins: the held one is dropped');
    // The tab drawn since: the held repaint is dropped too (that draw covers it).
    fire('mousedown', { button: 0 });
    S._invPatch(rb, 'held');
    S._invPressEpoch++;
    fire('mouseup', {});
    timers.filter((t) => t.ms === 0).slice(-1).forEach((t) => t.f());
    eq(rb.outerHTML, 'ticked, by the click', 'a repaint held before the tab was drawn is dropped');
    // ⚠⚠ IN THE ORDER ASKED (the fix of P9's review): a held repaint was worked out before the click, so where it covers one the click
    // made inside it (the row held for the figure typed, its box repainted by the press), the click's is drawn again after it.
    const log = [];
    const mkEl = (id) => { const e = { id, _h: 'old' }; Object.defineProperty(e, 'outerHTML', { get() { return this._h; }, set(v) { this._h = v; log.push(id + '=' + v); } }); return e; };
    const row = mkEl('inv-row-a'), rbox = mkEl('inv-rev-a');
    host.contains = (el) => [inDesk, rb, row, rbox].indexOf(el) >= 0;
    fire('mousedown', { button: 0 });
    S._invPatch(row, 'row as the figure left it, box unticked');
    fire('mouseup', {});
    S._invPatch(rbox, 'box ticked by the click');
    timers.filter((t) => t.ms === 0).slice(-1).forEach((t) => t.f());
    eq(log, ['inv-rev-a=box ticked by the click', 'inv-row-a=row as the figure left it, box unticked', 'inv-rev-a=box ticked by the click'],
      '⚠⚠ the held row is drawn, then the click\'s box again over it: the desk ends as it would have with nothing held');
    eq(S._invPressSince, [], 'and the record of the click\'s repaints is let go');
    log.length = 0;
    fire('mousedown', { button: 0 });
    S._invPatch(rbox, 'held box');
    fire('mouseup', {});
    S._invPatch(rbox, 'the click\'s box');
    timers.filter((t) => t.ms === 0).slice(-1).forEach((t) => t.f());
    eq(log, ['inv-rev-a=the click\'s box'], 'nothing held drawn (superseded): nothing drawn twice');
    log.length = 0;
    fire('mousedown', { button: 0 });
    S._invPatch(row, 'held row'); row.isConnected = false;
    fire('mouseup', {});
    timers.filter((t) => t.ms === 0).slice(-1).forEach((t) => t.f());
    eq(log, [], '⚠ a held repaint of an element the click took off the page is dropped');
    delete row.isConnected;
    S._invPatch(row, 'no press');
    eq(S._invPressSince, [], 'with no press ending, nothing is recorded');
    // A second press before the first one's held repaints are drawn: nothing is drawn under it, and they wait for its click, still in
    // the order asked (the first click's own repaint after the first press's held one).
    log.length = 0;
    const firstFlush = () => timers.filter((t) => t.ms === 0).slice(-1)[0];
    fire('mousedown', { button: 0 }); S._invPatch(row, 'first press, held'); fire('mouseup', {});
    const pending = firstFlush();
    S._invPatch(rbox, 'first click\'s box');
    fire('mousedown', { button: 0 });
    pending.f();
    eq(log, ['inv-rev-a=first click\'s box'], '⚠ the next press draws nothing of the last one\'s under it, its flush landing mid-press included');
    fire('mouseup', {}); firstFlush().f();
    eq(log, ['inv-rev-a=first click\'s box', 'inv-row-a=first press, held', 'inv-rev-a=first click\'s box'], '⚠ then the held row and the first click\'s box over it, in the order asked');
    // And where the second press holds a newer repaint over the first click's (the row again), the newer is drawn last.
    log.length = 0;
    fire('mousedown', { button: 0 }); S._invPatch(row, 'row, first press'); fire('mouseup', {});
    S._invPatch(rbox, 'box, first click');
    fire('mousedown', { button: 0 }); S._invPatch(row, 'row, second press'); fire('mouseup', {});
    timers.filter((t) => t.ms === 0).slice(-2).forEach((t) => t.f());
    eq(log[log.length - 1], 'inv-row-a=row, second press', '⚠⚠ the second press\'s row is drawn after the first click\'s box, never under it');
    // A whole redraw asked for during the press: drawn instead, in place, and it covers every held repaint.
    fire('mousedown', { button: 0 });
    S._invPatch(rb, 'held again'); S._invPressRedraw = true;
    fire('mouseup', {});
    timers.filter((t) => t.ms === 0).slice(-1).forEach((t) => t.f());
    eq([drawn, rb.outerHTML], [[{ morph: true }], 'ticked, by the click'], '⚠⚠ a whole redraw owed is drawn once, in place, and the held repaint with it');
    // Releases the page never heard: a mousemove with no button down, a select's own change, the window losing the focus.
    fire('mousedown', { button: 0 }); fire('mousemove', { buttons: 1 });
    ok(S._invPressDown === true, 'a mousemove with the button still down is the same press');
    fire('mousemove', { buttons: 0 });
    ok(S._invPressDown === false, 'a mousemove with no button down ends it');
    fire('mousedown', { button: 0 }); fire('change', { target: { tagName: 'INPUT' } });
    ok(S._invPressDown === true, '⚠ a box\'s change on the way out (the very case) does not end it');
    fire('change', { target: { tagName: 'SELECT' } });
    ok(S._invPressDown === false, 'a select\'s change (its list closed) does');
    fire('mousedown', { button: 2 });
    ok(S._invPressDown === false, 'a right click is no press');
    fire('mousedown', { button: 0 }); fire('w:blur', {});
    ok(S._invPressDown === false, 'the window losing the focus ends it');
    fire('mousedown', { button: 0 }); fire('keydown', { key: 'a' });
    ok(S._invPressDown === false, 'a key pressed ends it (a question asked on the mousedown swallows its mouseup)');
    // renderInventoryTab waits for the press, and is drawn then.
    const RT = sandbox({ fns: ['renderInventoryTab', '_invPressHolds'], vars: ['_invPressDown', '_invPressRedraw', '_invPressEpoch'],
      stubs: { document: { getElementById: () => { throw new Error('drawn during the press'); } } } });
    RT._invPressDown = true;
    const r = attempt(() => RT.renderInventoryTab());
    ok(r.ok, '⚠⚠ renderInventoryTab asked for during a press draws nothing' + (r.ok ? '' : ': ' + r.err));
    ok(RT._invPressRedraw === true, 'and leaves the desk owed its redraw');
    const RT2 = sandbox({ fns: ['renderInventoryTab', '_invPressHolds'], vars: ['_invPressDown', '_invPressRedraw', '_invPressEpoch'],
      stubs: { document: { getElementById: () => null } } });
    RT2._invPressRedraw = true;
    const ep = RT2._invPressEpoch;
    RT2.renderInventoryTab();
    eq([RT2._invPressEpoch, RT2._invPressRedraw], [ep + 1, false], '⚠ a draw of the tab moves the epoch (so a repaint held before it is dropped) and settles a whole redraw owed');
    // The bars' lines, repainted by id after a card's repaint, wait too (they are drawn with the desk once the press lands).
    let asked = 0;
    const FH = sandbox({ fns: ['_deskFoldHeadsRepaint', '_invPressHolds', '_invPressFn', '_invPressFlush'], vars: ['_invPressDown', '_invPressRedraw', '_invPressQ', '_invPressSince', '_invPressOwed', '_invPressEpoch'],
      stubs: { document: { getElementById: () => { asked++; return null; } } } });
    FH._invPressDown = true;
    eq([FH._deskFoldHeadsRepaint(7), FH._deskFoldHeadsRepaint(7), asked, FH._invPressQ.length], [false, false, 0, 1], '⚠ during a press the bars\' lines are not repainted: held, once');
    FH._invPressDown = false; FH._invPressFlush();
    eq([asked > 0, FH._invPressQ.length], [true, 0], 'and worked out and drawn once the press has landed');
    // _invRenderWhenIdle: the redraw held for a box is drawn in place once the box is left (the press then holds it, above).
    let lis = null; const box = { tagName: 'INPUT', type: 'search', addEventListener: (t, f) => { lis = f; }, removeEventListener() {} }, chip = { tagName: 'BUTTON' };
    const panel = { contains: () => true };
    const idleDoc = { activeElement: box, getElementById: (id) => (id === 'panel-inventory' ? panel : null) };
    const idleT = [], idleDrawn = [];
    const W = sandbox({ fns: ['_invRenderWhenIdle'], vars: ['_invRenderOwed'], stubs: { document: idleDoc, renderInventoryTab: (o) => idleDrawn.push(o === undefined ? 'whole' : o),
      setTimeout: (f) => { idleT.push(f); return 0; } } });
    W._invRenderWhenIdle();
    eq(idleDrawn, [], 'fixture: held while the search box has the focus');
    idleDoc.activeElement = chip; lis(); idleT.splice(0).forEach((f) => f());
    eq(idleDrawn, [{ morph: true }], '⚠⚠ the box left by the next press: the owed redraw patches the tab in place (it rewrote it under the chip)');
    W._invRenderWhenIdle();
    eq(idleDrawn[1], 'whole', 'a redraw asked for with nobody in a box is the whole tab, as before');
    has(SRC, "\n_invPressTrack();", 'the page installs the tracker as it loads');
  });

  // ═══ Q. THE PAGES SAY IT, EACH SENTENCE HELD TO THE CODE ═══
  G('Q · The Evening Desk, the manual and the playbook say what the desk now does', () => {
    const fs = require('fs'), path = require('path');
    const read = (n) => fs.readFileSync(path.join(__dirname, '..', n), 'utf8');
    const NAMED = { nbsp: ' ', amp: '&', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', middot: '·', mdash: '—', hellip: '…', lt: '<', gt: '>', quot: '"' };
    const page = (h) => String(h).replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
      .replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n)).replace(/&([a-z]+);/g, (m, n) => (NAMED[n] != null ? NAMED[n] : m))
      .replace(/\s+/g, ' ').replace(/\s+([,.;:)])/g, '$1').trim();
    const desk = page(read('evening-desk-guide.html'));
    has(desk, 'A photo with nothing worth listing goes under Nothing to list: Remove the N with nothing to list takes them all off, photos kept in Drive. One too dark to read says why: add a close-up.',
      'The Evening Desk says the pile, the press and the too-dark frame');
    has(desk, 'The ticks clear after each press.', 'and that the selection clears');
    // Each held to the code it describes.
    has(decl('INV_WORK_FLAGS'), "label:'Nothing to list'", '…the chip\'s name');
    has(fn('_invNothingLineHtml'), "'Remove the ' + n + ' with nothing to list</button>", '…the press, with its count where the page says N');
    has(fn('_renderInvRow'), ">could not be read' + (_unN ? ': ' + esc(_unN) : '')", '…the too-dark frame\'s words');
    has(noComments(fn('_invBulkApply')), '_invBulkDone(jobId, what, hidden);', '…and the selection clearing after each press on the bar');
    const man = page(read('manual.html')), md = read('MANUAL.md'), pb = page(read('concierge-guide.html')), pbmd = read('CONCIERGE_GUIDE.md');
    has(man, 'Since 2026-10-28 (P9 of the desk audit) they leave the list in one press.', 'the manual has it');
    has(md, '**Since 2026-10-28 (P9 of the desk audit) they leave the list in one press.**', 'and its markdown copy');
    has(man, 'The selection clears after every action on the bar and every change of filter', 'the manual says the selection clears');
    has(md, '**The selection clears after every action on the bar and every change of filter**', 'and its markdown copy');
    has(pb, 'Since 2026-10-28 they leave the list in one press:', 'the playbook has it');
    has(pbmd, '**Since 2026-10-28 they leave the list in one press:**', 'and its markdown copy');
    has(pb, 'Under Not reviewed or Unsure a row you tick stays put, greyed, with Undo, until you change the view', 'the playbook says a ticked row stays put');
    has(pbmd, 'Under **Not reviewed** or **Unsure** a row you tick stays put, greyed, with **Undo**, until you change the view', 'and its markdown copy');
    lacks(pb, 'press Remove line in its ▾, or type a name), or a shot still waiting', '⚠ the playbook no longer sends a person to each ▾ for them');
    has(fn('_invHeldShown'), "(_invFilter.flag === 'unreviewed' || _invFilter.flag === 'unsure')", '…a row is held under Not reviewed and Unsure, as the pages say');
    // P9's review: the manual says a press lands on the button pressed and nothing is drawn under it, a tap too; held to the code.
    const PRESS = 'never hands the press to its neighbour';
    has(man, PRESS, 'the manual says a press is never handed to the button beside it');
    has(md, PRESS, 'and its markdown copy');
    const DRAWN = 'nothing on the desk is drawn between the press going down and coming up, a click or a tap on the iPad: what the edit, or a redraw that waited for you to leave a box, would draw is drawn once the press has landed, and what the press itself drew is drawn again after it';
    has(man, DRAWN, 'the manual says nothing is drawn under a press, a tap too, and in what order');
    has(md, DRAWN, 'and its markdown copy, word for word');
    has(noComments(fn('_invMorphKey')), "n.tagName + '#' + id + '~' + k + act", '…a control is its tag, id and what it does, never its place');
    has(noComments(fn('_invPressTrack')), "document.addEventListener('mousedown'", '…the press is the mousedown to its click, which a tap sends too');
    has(noComments(fn('_invPressFlush')), 'since.forEach', '…and what the press drew is drawn again after the held repaints');
    for (const [name, doc] of [['the manual', man], ['the playbook', pb], ['The Evening Desk', desk]]) lacks(doc, 'in their rooms as the record', '⚠ ' + name + ' never says the photographs stay in their rooms');
    has(pb, 'every such line comes off in one press and the photos stay in Google Drive as the record', 'the playbook says Google Drive');
    has(pbmd, 'every such line comes off in one press and the photos stay in Google Drive as the record', 'and its markdown copy');
  });
};
