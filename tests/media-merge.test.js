'use strict';
// The per-item manifest merge (2026-08-24). This is the function standing between the
// estate record and two people editing it on two devices, so it is tested harder than
// anything else in here: a bug is silent, and what it loses is the court record.
//
// The same logic exists twice on purpose — mergeMediaItems in havellin.html and
// _mergeMediaItems in apps-script/saveInventory.gs. The last group below drives BOTH
// off their real source and asserts they agree, because two copies of a merge rule
// that drift is exactly how the workbook rollups got six categories against thirteen.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sandbox, fn } = require('./harness');

function it(id, over) {
  return Object.assign({ stableId: id, label: 'inventory', collId: null, ts: 1000 }, over);
}
const ids = (list) => list.map((r) => r.stableId);
// 1-based column number → spreadsheet letter (AA, AB … now that the manifest is 30 wide).
function _letter(n) { let out = ''; while (n > 0) { out = String.fromCharCode(65 + ((n - 1) % 26)) + out; n = Math.floor((n - 1) / 26); } return out; }

module.exports = function ({ group, ok, eq, has, lacks }) {
  const ctx = sandbox({ fns: ['mergeMediaItems'] });
  const merge = ctx.mergeMediaItems;

  group('merge: union, never loss');
  {
    eq(ids(merge([it('a')], [it('b')])), ['a', 'b'],
       'items present on only one side survive from both sides');
    eq(ids(merge([], [it('a')])), ['a'], 'an empty local side takes everything remote');
    eq(ids(merge([it('a')], [])), ['a'],
       'an EMPTY REMOTE MUST NOT WIPE LOCAL — the first sync of a device that has data');
    eq(ids(merge(null, null)), [], 'null on both sides is empty, not a throw');
    eq(ids(merge(undefined, [it('a')])), ['a'], 'undefined local is tolerated');
  }

  group('merge: newer updatedAt wins per item');
  {
    const local  = [it('a', { fmv: '100', updatedAt: 200 }), it('b', { fmv: '5', updatedAt: 500 })];
    const remote = [it('a', { fmv: '999', updatedAt: 900 }), it('b', { fmv: '7', updatedAt: 100 })];
    const out = merge(local, remote);
    const byId = Object.fromEntries(out.map((r) => [r.stableId, r]));
    eq(byId.a.fmv, '999', 'remote wins where remote is newer');
    eq(byId.b.fmv, '5',   'local wins where local is newer');
    eq(out.length, 2, 'and nothing is duplicated');
  }

  group('merge: this is the bug that made it necessary');
  {
    // Two devices, one estate, DIFFERENT items edited on each. A per-job merge keeps
    // whichever job blob is newer and silently discards the other person's work. A
    // per-item merge keeps both. This is the whole reason the function exists.
    const anthony = [it('a', { fmv: '100', updatedAt: 300 }), it('b', { updatedAt: 100 })];
    const ashley  = [it('a', { updatedAt: 100 }), it('b', { fmv: '250', updatedAt: 400 })];
    const byId = Object.fromEntries(merge(anthony, ashley).map((r) => [r.stableId, r]));
    eq(byId.a.fmv, '100', "Anthony's valuation of item a survives");
    eq(byId.b.fmv, '250', "Ashley's valuation of item b survives — a per-JOB merge loses this");
  }

  group('merge: tombstones');
  {
    // Removal writes deletedAt instead of splicing. Splicing made the row absent, and
    // absence is indistinguishable from "not seen yet", so the next merge resurrected it.
    const local  = [it('a', { updatedAt: 100 })];
    const remote = [it('a', { updatedAt: 900, deletedAt: 900 })];
    const out = merge(local, remote);
    eq(out.length, 1, 'the tombstone is carried, not dropped');
    ok(!!out[0].deletedAt, 'and it wins, so the deletion propagates to this device');

    // The reverse: a stale tombstone must not beat a later undelete/edit.
    const revived = merge([it('a', { updatedAt: 900, fmv: '50' })], [it('a', { updatedAt: 100, deletedAt: 100 })]);
    ok(!revived[0].deletedAt, 'a newer live edit beats an older tombstone');
    eq(revived[0].fmv, '50', 'and keeps its value');
  }

  group('merge: hygiene');
  {
    eq(ids(merge([it('a'), it('a', { fmv: '9', updatedAt: 5 })], [])),
       ['a'], 'a duplicated id within one side collapses to one row');
    eq(ids(merge([{ noId: true }, it('a')], [null, undefined])),
       ['a'], 'items with no stableId are dropped rather than crashing the merge');

    // ts is the fallback clock for anything captured before updatedAt existed.
    const byTs = merge([it('a', { ts: 100, fmv: 'old' })], [it('a', { ts: 900, fmv: 'new' })]);
    eq(byTs[0].fmv, 'new', 'falls back to ts when updatedAt is absent on both sides');

    // A tie must be deterministic, not order-of-evaluation luck.
    const tie = merge([it('a', { updatedAt: 500, fmv: 'local' })], [it('a', { updatedAt: 500, fmv: 'remote' })]);
    eq(tie[0].fmv, 'remote', 'on an exact tie the incoming side wins, deterministically');
  }

  group('merge: order is stable');
  {
    const out = merge([it('a'), it('b'), it('c')], [it('c'), it('d')]);
    eq(ids(out), ['a', 'b', 'c', 'd'],
       'existing order is preserved and new items append — the manifest does not reshuffle');
  }

  // ── The two implementations must agree ──────────────────────────────────────
  group('merge: app and Apps Script agree');
  {
    // Lift the server-side copy out of the .gs file and drive it beside the app's.
    const gs = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'saveInventory.gs'), 'utf8');
    const m = gs.match(/function _mergeMediaItems\(existing, incoming\) \{[\s\S]*?\n\}/);
    ok(!!m, '_mergeMediaItems is present in apps-script/saveInventory.gs');
    const gctx = { };
    vm.createContext(gctx);
    vm.runInContext(m[0], gctx, { filename: 'saveInventory.gs (extracted)' });
    const gmerge = gctx._mergeMediaItems;

    const cases = [
      [[it('a', { updatedAt: 1 })], [it('a', { updatedAt: 2, fmv: 'x' })]],
      [[it('a', { updatedAt: 5 })], [it('a', { updatedAt: 5, fmv: 'tie' })]],
      [[it('a'), it('b')], [it('b', { updatedAt: 9 }), it('c')]],
      [[it('a', { updatedAt: 9 })], [it('a', { updatedAt: 1, deletedAt: 1 })]],
      [[], [it('z', { ts: 3 })]],
      [[it('q', { ts: 700 })], [it('q', { ts: 100, fmv: 'older' })]],
    ];
    let agree = 0;
    cases.forEach((pair, i) => {
      const a = JSON.stringify(merge(pair[0], pair[1]));
      const b = JSON.stringify(gmerge(pair[0], pair[1]));
      if (a === b) { agree++; return; }
      eq(a, b, `case ${i}: the two implementations must produce identical output`);
    });
    eq(agree, cases.length, 'every case agrees between havellin.html and saveInventory.gs');
  }

  // ── The payload the server is actually given ────────────────────────────────
  group('payload: the manifest carries the internals the workbook does not');
  {
    const p = sandbox({ fns: ['buildMediaPayload'] });
    p._photoRefs[7] = [it('a', { custodyLog: [{ action: 'Released' }], apprWaiveReason: 'PR waived' })];
    const out = p.buildMediaPayload(7);
    eq(out.jobId, '7', 'jobId is a string key, matching the store');
    ok(out.savedAt > 0, 'and it is stamped');
    ok(!!out.items[0].custodyLog, 'the custody log rides along — the workbook has no column for it');
    eq(out.items[0].apprWaiveReason, 'PR waived', 'so does the waiver reason');
  }

  group('workbook rollups cannot drift from the app again');
  {
    // The Apps Script held its own hardcoded copies of these lists — 6 categories
    // against the app's 13, 5 dispositions against 7 — with a comment asserting they
    // matched. The client's "FMV by Category" therefore dropped the seven categories an
    // estate's value actually sits in, and the rows did not sum to the total above them.
    const p2 = sandbox({
      fns: ['buildInventoryPayload', '_invAssignItemNos', '_jobInvRefs', '_invTouch',
            '_invExportValue', '_invRoomName', '_invItemNo', 'savePhotoRefs',
            '_warnPhotoStoreFull', 'resolveValBasis', 'estateValueDate', '_avdDate',
            'invIsFirearm', 'invIsMAIV', 'invMAIVCategory', 'invMAIVDefaultCat'],
      vars: ['INVENTORY_COLUMNS', 'INV_CATEGORIES', 'INV_TAXONOMY', 'INV_DISPOSITIONS',
             'INV_VAL_BASES', 'MAIV_OTHER', 'MAIV_BY_CATEGORY'],
    });
    p2.jobs.push({ id: 3, name: 'Estate', hvlId: 'HVL-3' });
    p2._photoRefs[3] = [it('a', { label: 'inventory', category: 'Firearms', fmv: '100' })];
    const payload = p2.buildInventoryPayload(3);

    eq(payload.categories.length, 13, 'the payload carries all 13 app categories');
    eq(payload.dispositions.length, 7, 'and all 7 dispositions');
    ok(payload.categories.indexOf('Silver & Precious Metal') >= 0,
       'including the ones the old hardcoded list dropped');
    ok(payload.dispositions.indexOf('Auction') >= 0, 'and Auction, which it also dropped');

    // The server must PREFER the payload and only fall back for an old app build.
    const gs = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'saveInventory.gs'), 'utf8');
    has(gs, 'payload.categories', 'the Apps Script reads the payload lists');
    has(gs, 'INV_CATEGORIES_FALLBACK', 'and keeps literals only as a labelled fallback');
    lacks(gs, 'INV_CATEGORIES_GS', 'the stale hardcoded list is gone');

    // Column letters are looked up by header, so inserting a column cannot repoint a
    // formula at the wrong data — which is live risk now that flagNFA was inserted.
    has(gs, '_invColLetter(cols,', 'summary formulas resolve columns by header name');
  }

  group('the workbook writes its formulas at the columns the app actually sent');
  {
    // THIS IS THE BUG THAT MOTIVATED THE TEST. _writeSummarySheet was converted to
    // header lookup on 2026-08-24; _writeInventorySheet was not, and kept literal column
    // numbers. The moment flagNFA was inserted, the Net formula was being written into
    // the FEES column and the currency formats landed on Approval Date. The workbook is
    // the document that goes to the attorney, so this drives the real .gs function
    // against the real app column list — if either side moves, this fails.
    const gs = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'saveInventory.gs'), 'utf8');
    const pick = (name) => {
      const m = gs.match(new RegExp('function ' + name + '\\([\\s\\S]*?\\n\\}'));
      ok(!!m, name + ' is present in saveInventory.gs');
      return m[0];
    };
    const gctx = {};
    vm.createContext(gctx);
    vm.runInContext(pick('_invColLetter') + '\n' + pick('_writeInventorySheet'), gctx,
                    { filename: 'saveInventory.gs (extracted)' });

    const cap = { formulas: [], formats: [], values: [] };
    const sheet = {
      clear() {}, setFrozenRows() {}, autoResizeColumns() {},
      getRange(r, c) {
        return {
          setValues(v) { cap.values.push({ r, c, v }); return this; },
          setFormulas(f) { cap.formulas.push({ r, c, f }); return this; },
          setNumberFormat(f) { cap.formats.push({ r, c, f }); return this; },
          setFontWeight() { return this; }, setBackground() { return this; },
        };
      },
    };
    const ss = { getSheetByName: () => sheet, insertSheet: () => sheet };

    // The real header list, straight out of the app.
    const p3 = sandbox({ vars: ['INVENTORY_COLUMNS'] });
    const columns = ['Job ID'].concat(p3.INVENTORY_COLUMNS.map((c) => c.header));
    const col = (h) => columns.indexOf(h) + 1;
    gctx._writeInventorySheet(ss, { columns, rows: [columns.map(() => '')] });

    eq(cap.formulas.length, 1, 'exactly one block of formulas is written');
    eq(cap.formulas[0].c, col('Net to Estate'),
       'and it lands on Net to Estate — not on whatever column happens to sit at index 24');
    has(cap.formulas[0].f[0][0], _letter(col('Gross Proceeds')) + '2',
        'the formula reads the Gross Proceeds column');
    has(cap.formulas[0].f[0][0], _letter(col('Fees')) + '2', 'and the Fees column');

    const moneyCols = cap.formats.filter((f) => f.f === '$#,##0').map((f) => f.c).sort((a, b) => a - b);
    eq(moneyCols, [col('Estimated FMV'), col('Gross Proceeds'), col('Fees'), col('Net to Estate')].sort((a, b) => a - b),
       'the currency formats land on the four money columns and nothing else');

    lacks(pick('_writeInventorySheet'), 'getRange(2, 24',
          'no literal column index survives in the inventory writer');
    lacks(pick('_writeInventorySheet'), 'getRange(2, 22', 'nor the currency-format one');
  }

  group('the manifest must not reach the folder shared with counsel');
  {
    // shareInventoryWithCounsel grants read-only access to the whole Estate Inventory
    // folder. The workbook belongs there; the raw manifest does not, because it carries
    // custody logs, waiver reasons and upload state. Assert the store is written to the
    // main spreadsheet instead — a regression here is a disclosure, not a bug.
    const gs = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'saveInventory.gs'), 'utf8');
    has(gs, "_writeStoreBlob('MediaStore'", 'the manifest goes to the main sheet blob store');
    const saveFn = gs.slice(gs.indexOf('function saveMediaStore'));
    lacks(saveFn.slice(0, saveFn.indexOf('\n}\n')), 'DriveApp',
          'saveMediaStore never touches Drive');
  }
};
