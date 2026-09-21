'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// THE AS-FOUND RECORD, AND THE FOLDER IT LIVES IN (2026-09-20).
//
// ⚠⚠ THE AS-FOUND PASS REACHED NO DOCUMENT AT ALL. Every one of those photographs was in
// Drive and the manifest carried a row for each, and the personal representative — the one
// person who will ever need them — had no index. `_jobInvRefs` filters to
// `label === 'inventory'` by design (an as-found shot is evidence and never an inventory
// line), so all six inventory documents stepped straight past them. The question the pass
// exists to answer, "there was a gold Rolex in my father's desk drawer", was answerable
// only by somebody who already knew the filename convention.
//
// The three rules this file pins, in the order they matter:
//
//   1. IT NAMES THE ROOMS THAT WERE NOT SHOT. A record listing only what WAS photographed
//      answers "what do we hold" and never "is this complete". Same rule the Court
//      Inventory follows on an unvalued line: state the gap and refuse to read as complete.
//   2. ATTRIBUTION IS THE ROOM'S ATTESTATION, NEVER A PER-SHOT FIELD. A photo ref carries
//      no `by`; printing the job's current concierge against each shot would be a claim
//      the record cannot support and would go false on the next reassignment.
//   3. ONE DEFINITION OF WHICH FOLDER A SHOT GOES TO, read by the capture AND by the retry.
//      Two copies is how a re-sent as-found shot lands back in the folder it was moved out
//      of, with nothing on any screen saying so — the upload succeeds either way.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { sandbox, source, domStub, fn } = require('./harness');

// A synchronous thenable, the shape drive-folder.test.js establishes: the runner's
// assertions are flat and synchronous, so a real Promise would resolve on a later
// microtask and every check would run before the code under test did — green, and
// proving nothing. It must UNWRAP, or `.then(r => r.json())` hands the next `.then`
// the thenable rather than the parsed body.
function syncOk(value) {
  return {
    then(onOk) {
      const out = onOk(value);
      return (out && typeof out.then === 'function') ? out : syncOk(out);
    },
    catch() { return this; },
  };
}

// Line-based, for the reason every recent suite records: the usual /\/\*[\s\S]*?\*\//
// stripper pairs the `/*` inside `accept="image/*"` with a distant `*/` and eats ~170KB.
const liveLines = (s) => String(s).split('\n')
  .filter((l) => { const t = l.trim(); return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')); })
  .join('\n');

const JOB = { id: 7, name: 'Butler Estate', hvlId: 'HVL-0007', svc: 'probate',
              addr: '69 Beach Blvd, Palm Beach', won: true, status: 'won', tc: 'Ashley Jerome' };

// Three rooms in scope, one excluded — the shape of a real prep-heavy estate.
const ROOMS = [
  { idx: 1, name: 'Entry & Living', st: 'in' },
  { idx: 4, name: 'Kitchen', st: 'in' },
  { idx: 9, name: 'Study', st: 'in' },
  { idx: 12, name: 'Guest Bath', st: 'in', excluded: true, note: 'homeowner is handling' },
];

const SHOT = (roomIdx, label, n, over) => Object.assign({
  stableId: 'r' + roomIdx + '_' + label + '_' + n, roomIdx, label, seq: n, collId: null,
  filename: 'HVL-0007_Room_' + label + '_' + n + '.jpg',
  driveFileUrl: 'https://drive.google.com/file/d/f' + roomIdx + n + '/view',
  driveFileId: 'f' + roomIdx + n, status: 'uploaded',
  ts: Date.UTC(2026, 8, 18, 14, n * 3),
}, over || {});

function rig(over) {
  over = over || {};
  const printed = [];
  const ctx = sandbox({
    fns: ['asFoundRecord', '_planRooms', '_slotRefs', '_roomFoundAttest', '_roomFoundDone',
          '_afTime', '_afDate', '_asFoundRows', 'printAsFoundRecord', '_invDocName',
          '_invDocHead', '_invPrintThumb', 'resolveValBasis', 'estateValueDate', '_avdDate',
          'buildInventoryPayload', '_invAssignItemNos', '_jobInvRefs', '_invTouch',
          'invFiduciaryMode', 'isDecedentJob',
          '_invExportValue', '_invRoomName', '_invItemNo', 'savePhotoRefs', '_warnPhotoStoreFull',
          'invIsFirearm', 'invIsMAIV', 'invMAIVCategory', 'invMAIVDefaultCat'],
    vars: ['jobPlanStore', 'estimateStore', 'AS_FOUND_COLUMNS', 'INVENTORY_COLUMNS', 'DECEDENT_SERVICES',
           'INV_CATEGORIES', 'INV_TAXONOMY', 'INV_DISPOSITIONS', 'INV_VAL_BASES',
           'MAIV_OTHER', 'MAIV_BY_CATEGORY', 'INV_CAT_GLYPH'],
    stubs: {
      jobs: [Object.assign({}, JOB, over.job || {})],
      _photoRefs: { 7: over.refs || [] },
      esc: (x) => String(x == null ? '' : x),
      fmtDate2: (d) => String(d || ''),
      _invThumbCache: () => ({}),
      _invFileId: (r) => r.driveFileId || '',
      _invMoney: (v) => '$' + (v || 0),
      _printDocument: (html, title) => { printed.push({ html, title }); return true; },
      alert: (m) => printed.push({ alert: m }),
      document: domStub({}),
    },
  });
  ctx.estimateStore[7] = { estimate: { rooms: (over.rooms || ROOMS).map((r) => Object.assign({}, r)) } };
  ctx.jobPlanStore[7] = { rooms: over.plan || {} };
  return { ctx, printed };
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const live = liveLines(src);

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE RECORD NAMES THE ROOMS THAT WERE NOT SHOT');
  {
    const { ctx } = rig({ refs: [SHOT(1, 'before', 1), SHOT(1, 'before', 2), SHOT(4, 'before', 1)] });
    const rec = ctx.asFoundRecord(7);

    eq(rec.rooms.length, 3, 'three rooms in scope');
    eq(rec.total, 3, 'three as-found photographs');
    eq(rec.shotRooms.map((r) => r.name).join(' · '), 'Entry & Living · Kitchen',
       'the rooms that were shot, in walkthrough order');
    eq(rec.missing.map((r) => r.name).join(', '), 'Study',
       '⚠ and the room that was NOT — the half a list of what exists can never say');
    eq(rec.excluded.map((r) => r.name).join(', '), 'Guest Bath',
       'an excluded room is in neither list: it was never in scope, so it is not a gap');

    // The converse, or the rule would "pass" on a build that reported every room missing.
    const all = rig({ refs: [SHOT(1, 'before', 1), SHOT(4, 'before', 1), SHOT(9, 'before', 1)] });
    eq(all.ctx.asFoundRecord(7).missing.length, 0, 'a fully shot job reports no gap');

    // An INVENTORY shot in a room is not an as-found shot, which is the whole distinction.
    const wrong = rig({ refs: [SHOT(9, 'inventory', 1), SHOT(9, 'after', 1), SHOT(9, 'detail', 1)] });
    const wr = wrong.ctx.asFoundRecord(7);
    eq(wr.total, 0, 'item, detail and after shots are not as-found shots');
    eq(wr.missing.length, 3, 'so a room full of them still reads as never shot as found');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ ATTRIBUTION IS THE ROOM\'S ATTESTATION, NEVER THE JOB\'S CONCIERGE');
  {
    const { ctx } = rig({
      refs: [SHOT(1, 'before', 1), SHOT(4, 'before', 1)],
      plan: { 1: { foundDone: { at: '2026-09-18', by: 'Ashley Jerome' } } },
    });
    const rec = ctx.asFoundRecord(7);
    const byName = {};
    rec.rooms.forEach((r) => { byName[r.name] = r; });

    eq(byName['Entry & Living'].attestedBy, 'Ashley Jerome', 'the attested room names who confirmed it');
    eq(byName['Entry & Living'].attestedAt, '2026-09-18', 'and when');
    eq(byName.Kitchen.attestedBy, '',
       '⚠ a room with shots and no tick borrows nobody — the job carries tc "Ashley Jerome" and it is not used');
    eq(rec.unattested.map((r) => r.name).join(', '), 'Kitchen',
       'it is reported as photographed but not confirmed complete');

    // Pinned at source, because the tempting "fix" is a fallback to the assigned concierge.
    lacks(liveLines(fn('asFoundRecord')), 'job.tc',
          '⚠ the derivation never reads the job\'s concierge — a name on a record nobody put there is a false claim');
    lacks(liveLines(fn('asFoundRecord')), 'getJobPlan',
          'and never mints a plan: this runs on a document render, and getJobPlan WRITES');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('A SHOT THAT NEVER REACHED DRIVE IS COUNTED AND SAID OUT LOUD');
  {
    const { ctx } = rig({ refs: [SHOT(1, 'before', 1), SHOT(1, 'before', 2, { status: 'failed', driveFileUrl: null })] });
    const rec = ctx.asFoundRecord(7);
    eq(rec.unsaved, 1, 'the unsaved shot is counted');
    eq(rec.rooms[0].count, 2, 'and still listed — it was taken, and a reader must see the row');
    eq(rec.total, 2, 'it counts toward the total too');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE DOCUMENT PUTS THE GAP ABOVE THE INDEX, NOT UNDER IT');
  {
    const { ctx, printed } = rig({
      refs: [SHOT(1, 'before', 1), SHOT(1, 'before', 2), SHOT(4, 'before', 1)],
      plan: { 1: { foundDone: { at: '2026-09-18', by: 'Ashley Jerome' } } },
    });
    ctx.printAsFoundRecord(7);
    eq(printed.length, 1, 'the document printed');
    const h = printed[0].html;

    has(h, 'no as-found photographs', 'the gap block renders');
    has(h, 'Study', 'and names the room');
    ok(h.indexOf('no as-found photographs') < h.indexOf('Entry &amp; Living') ||
       h.indexOf('no as-found photographs') < h.indexOf('Entry & Living'),
       '⚠ ABOVE the first room heading — a reader works down this page, and a caveat printed '
       + 'under the index has arrived after they took it as complete');
    has(h, 'not a complete account of the property', 'and it refuses to read as complete');

    has(h, 'Ashley Jerome', 'the attested room carries its name');
    has(h, 'Pass not confirmed complete', 'and the unattested one says so instead of borrowing one');
    has(h, 'drive.google.com/file/d/f11', 'every shot links to its file — the whole value of the index');
    has(h, 'deliberately not inventory lines', 'it states that these are evidence and not a schedule');
    has(h, 'Guest Bath', 'the excluded room is listed as out of scope rather than silently absent');

    // The filename. Chrome names a Save-as-PDF after document.title, and not one inventory
    // printer passed one until today.
    has(printed[0].title, 'Havellin As-Found Record', 'the PDF is named after the document');
    has(printed[0].title, '69 Beach Blvd', 'and the property');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('THE DOCUMENT REFUSES RATHER THAN PRINTING AN EMPTY INDEX');
  {
    const none = rig({ refs: [] });
    none.ctx.printAsFoundRecord(7);
    eq(none.printed.filter((p) => p.html).length, 0, 'nothing prints when no shot has been taken');
    has(none.printed[0].alert, 'No as-found photographs', 'and it says why');

    const noRooms = rig({ refs: [], rooms: [] });
    noRooms.ctx.printAsFoundRecord(7);
    has(noRooms.printed[0].alert, 'no rooms priced', 'a job with no priced rooms says that instead');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE WORKBOOK TAB CARRIES THE GAP ROW TOO');
  {
    const { ctx } = rig({
      refs: [SHOT(1, 'before', 1), SHOT(4, 'before', 1, { status: 'failed', driveFileUrl: null })],
      plan: { 1: { foundDone: { at: '2026-09-18', by: 'Ashley Jerome' } } },
    });
    const rows = ctx._asFoundRows(7);
    eq(rows.length, 3, 'two shots and one gap row');
    eq(rows[0][0], 'Entry & Living', 'rooms in walkthrough order');
    eq(rows[0][7], 'Ashley Jerome', 'the attestation rides each row');
    eq(rows[2][0], 'Study', 'the unshot room is last, in its own walkthrough position');
    eq(rows[2][4], 'NO AS-FOUND PHOTOGRAPHS',
       '⚠ and it is a ROW, not an omission — the one thing the sheet can say that the folder cannot');
    eq(rows[1][5], 'NOT SAVED TO DRIVE', 'a shot with no link says so rather than leaving the cell blank');

    const payload = ctx.buildInventoryPayload(7);
    eq(payload.asFound.length, 3, 'the rows ride the inventory payload');
    eq(payload.asFoundColumns.length, ctx.AS_FOUND_COLUMNS.length, 'and so do the columns');
    // The lesson the category lists already paid for: the server must not hold a copy.
    const gs = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'saveInventory.gs'), 'utf8');
    has(gs, 'payload.asFoundColumns', 'the Apps Script reads the columns off the payload');
    has(gs, '_writeAsFoundSheet(ss, payload)', 'and the tab is actually written');
    has(gs, "if (!payload.asFoundColumns) return;",
        '⚠ a payload from an older app leaves the tab alone rather than blanking it — an old app '
        + 'is not a statement that the record is empty');
    has(gs, 'NO AS-FOUND PHOTOGRAPHS', 'the gap row is coloured in the sheet, not left to be skimmed');
    lacks(gs, "'Room', '#', 'Date'", 'and the server holds no copy of the column list');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ ONE DEFINITION OF WHICH FOLDER A SHOT GOES TO');
  {
    const { ctx } = rig({});
    const f = sandbox({ fns: ['photoSubfolder'], vars: ['AS_FOUND_SUBFOLDER', 'PHOTO_SUBFOLDER'] });
    eq(f.photoSubfolder('before'), 'As-Found Record', 'an as-found shot files to its own folder');
    ['inventory', 'detail', 'after', 'collection', 'appraisal'].forEach((l) => {
      eq(f.photoSubfolder(l), 'Estate Inventory', l + ' stays in the inventory folder');
    });
    eq(f.photoSubfolder(undefined), 'Estate Inventory', 'and an unknown label degrades to the old behaviour');

    // ⚠ BOTH WRITERS GO THROUGH IT. The retry is the one that would silently diverge: a
    // re-sent as-found shot landing in the inventory folder succeeds, and nothing says so.
    has(liveLines(fn('_captureShot')), 'photoSubfolder(label)', 'the capture routes through the rule');
    lacks(liveLines(fn('_captureShot')), "'Estate Inventory'", 'and holds no literal of its own');
    has(liveLines(fn('retryPhotoUpload')), 'photoSubfolder(ref.label)', 'and so does the retry');
    lacks(liveLines(fn('retryPhotoUpload')), "'Estate Inventory'", 'with no literal of its own either');

    // ⚠ THE ALIAS IS WHAT KEEPS AN EXISTING JOB WORKING. Without it every as-found upload on
    // a job folder created before the split fails outright — on the one pass whose order can
    // never be reversed.
    const al = liveLines(fn('resolveSubfolderId'));
    has(al, "'As-Found Record': ['Estate Inventory'", 'an older job folder falls back to the folder it has');
    has(liveLines(fn('createDriveJobFolder')), "'As-Found Record'", 'and a new job gets the folder itself');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE COUNSEL SHARE FOLLOWS THE SPLIT, OR THE DOCUMENT\'S LINKS 404 FOR ITS READER');
  {
    const asked = [];
    const s = sandbox({
      fns: ['_invShareFolders', '_invShareEach', 'shareInventoryWithCounsel', 'unshareInventory'],
      vars: ['AS_FOUND_SUBFOLDER'],
      stubs: {
        jobs: [Object.assign({}, JOB, { driveFolder: 'https://drive.google.com/drive/folders/PARENT' })],
        SHEETS_SYNC_URL: 'https://script.example/exec',
        resolveSubfolderId: (job, name, cb) => cb(name === 'Estate Inventory' ? 'INV' : 'AF'),
        fetch: (url, opt) => { asked.push(JSON.parse(opt.body)); return syncOk({ json: () => ({ ok: true }) }); },
        window: { prompt: () => 'counsel@firm.com' },
        alert: () => {},
      },
    });
    s.shareInventoryWithCounsel(7);
    eq(asked.length, 2, 'both folders are shared');
    eq(asked.map((a) => a.folderId).sort().join(','), 'AF,INV', 'the inventory set AND the as-found set');
    asked.forEach((a) => eq(a.action, 'shareFolder', 'as a named-viewer share'));

    // ⚠ ON AN OLD JOB BOTH NAMES RESOLVE TO ONE ID, and claiming two shares would be a false
    // statement about what counsel can now reach.
    const asked2 = [];
    const s2 = sandbox({
      fns: ['_invShareFolders', '_invShareEach', 'shareInventoryWithCounsel'],
      vars: ['AS_FOUND_SUBFOLDER'],
      stubs: {
        jobs: [Object.assign({}, JOB, { driveFolder: 'https://drive.google.com/drive/folders/PARENT' })],
        SHEETS_SYNC_URL: 'https://script.example/exec',
        resolveSubfolderId: (job, name, cb) => cb('INV'),
        fetch: (url, opt) => { asked2.push(JSON.parse(opt.body)); return syncOk({ json: () => ({ ok: true }) }); },
        window: { prompt: () => 'counsel@firm.com' },
        alert: () => {},
      },
    });
    s2.shareInventoryWithCounsel(7);
    eq(asked2.length, 1, 'a pre-split job shares its one folder once, not twice');

    // Revoke must cover at least as much as the grant, or an address keeps reading the
    // estate's photographs after somebody believed they had taken it away.
    has(liveLines(fn('unshareInventory')), '_invShareFolders',
        '⚠ revoke sweeps both folders through the same resolver the share uses');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ EVERY INVENTORY DOCUMENT IS NAMED, AND NONE WAS');
  {
    const n = sandbox({ fns: ['_invDocName'] });
    const name = n._invDocName(JOB, 'Court Inventory');
    has(name, 'Havellin Court Inventory', 'the document says what it is');
    has(name, '69 Beach Blvd', 'and which property');
    lacks(name, 'Palm Beach,', 'the street only — the whole address is not a filename');
    eq(n._invDocName({}, 'Estate Inventory').indexOf('Havellin Estate Inventory'), 0,
       'a job with no address still names the document');

    // The net, not a list of today's printers: a generated document that does not name
    // itself arrives in an attorney's downloads called after the app's browser tab.
    const printers = ['printEstateInventoryReport', 'printApprovalRequest', 'printCourtInventory',
                      'printDispositionLedger', 'printAppraisalWorklist', 'printInventorySnapshot',
                      'printAsFoundRecord'];
    printers.forEach((p) => {
      const body = liveLines(fn(p));
      has(body, '_invDocName(job,', p + ' passes a filename to _printDocument');
    });
    // And the namer is deliberately NOT the DOC_ACTIONS registry, whose `file` verb writes
    // into the CLIENT'S own Drive folder — which is how an internal worksheet reached a
    // client on 2026-09-08.
    lacks(liveLines(fn('_invDocName')), 'DOC_ACTIONS', 'it joins no registry that carries a file verb');
    printers.forEach((p) => lacks(liveLines(fn(p)), 'docNames(job',
      p + ' is not in the send/file registry'));
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE RECORD IS MEANINGFUL ON A LIVING JOB, AND STOPS SAYING "the estate"');
  {
    // lockFlag FLAGS and never REFUSES on a living job, deliberately — the owner is alive and
    // can say what was in the drawer — so the shots exist there, unevenly. The document is
    // worth having either way; what it must not do is describe an estate that does not exist.
    // ⚠ ONE PRINTER WITH BRANCHED STRINGS, NOT A SECOND ONE: the spine is identical on both
    // sides (rooms → shots → file links) and the columns are identical. That is the test this
    // whole build applies — branch when the spine is shared, fork when it differs, which is
    // why the Contents Record IS a second printer and this is not.
    const { ctx, printed } = rig({
      job: { svc: 'downsizing_move', name: 'Margaret Ellsworth', executor: '', deathDate: '' },
      refs: [SHOT(1, 'before', 1), SHOT(4, 'before', 1)],
    });
    ctx.printAsFoundRecord(7);
    const h = (printed[printed.length - 1] || {}).html || '';
    has(h, 'in this job\u2019s Drive folder', '⚠ it points at the job\u2019s folder');
    lacks(h, 'in the estate\u2019s Drive folder', 'and never at an estate\u2019s');
    // The half that must survive on both: these are evidence, never inventory lines.
    has(h, 'evidence of the state of the property', 'the claim the document exists to make is unchanged');
    has(h, 'nothing here is valued', 'and it still refuses to be read as an inventory');

    // The converse, on the estate arm.
    const e = rig({ refs: [SHOT(1, 'before', 1)] });
    e.ctx.printAsFoundRecord(7);
    const eh = (e.printed[e.printed.length - 1] || {}).html || '';
    has(eh, 'in the estate\u2019s Drive folder', 'the estate arm still says the estate\u2019s folder');
  }
};
