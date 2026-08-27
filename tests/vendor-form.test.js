'use strict';
// Two things reported off the Add Vendor form on 2026-08-27.
//
// 1. "slight formatting error here with the boxes way below where they should be" —
//    COI on file and Reciprocity drew their selects an inch under their own labels.
//    The Category cell carried a five-line note UNDER its input; every cell in a grid
//    row stretches to the tallest one, and .vform .fld pushes its control to the bottom
//    of that height, so the two neighbours were shoved down to the note's baseline.
//    The Last contacted cell was made full-width to escape this exact trap once
//    already, so the fix is the same one: a multi-line note goes in its own row.
//
// 2. "when i saved a new vendor the card never cleared (it said saving and never
//    appeared to save), so i hit save again and two versions of the same vendor were
//    saved." An addVendor is deliberately never queued and never auto-retried, because
//    a re-send could append the row twice — which means NOTHING downstream catches a
//    second press. The button was the only guard and it did not exist.

const fs = require('fs');
const path = require('path');
const { sandbox, fn } = require('./harness');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');

// The Add Vendor form's grid, markup only.
function vformBlock() {
  const start = SRC.indexOf('<div class="vform">');
  const end = SRC.indexOf('<div class="divider"></div>', start);
  if (start === -1 || end === -1) throw new Error('vendor form markup not found');
  return SRC.slice(start, end);
}

// Split the grid into its cells: each direct child opens at six-space indent.
function vformCells() {
  const lines = vformBlock().split('\n');
  const cells = [];
  let cur = null;
  for (const line of lines) {
    if (/^ {6}<div /.test(line)) {
      if (cur) cells.push(cur);
      cur = { open: line, body: [line] };
    } else if (cur) {
      cur.body.push(line);
      if (/^ {6}<\/div>/.test(line)) { cells.push(cur); cur = null; }
    }
  }
  if (cur) cells.push(cur);
  return cells.map((c) => ({ open: c.open, html: c.body.join('\n') }));
}

module.exports = function ({ group, ok, eq, has, lacks }) {

  group('a control is never pushed away from its own label');
  {
    const cells = vformCells();
    ok(cells.length > 15, 'the vendor form cells parse out of the markup');

    // THE RULE: a plain .fld shares its grid row with two neighbours, so anything it
    // carries UNDER its control makes the row taller and drops their controls with it.
    // Full-width cells own their row and are free to.
    const offenders = [];
    cells.forEach(function (c) {
      if (!/class="fld"/.test(c.open)) return;             // .fld-wide owns its row
      const ctrl = Math.max(
        c.html.lastIndexOf('<input'), c.html.lastIndexOf('<select'), c.html.lastIndexOf('<textarea'));
      if (ctrl === -1) return;                             // read-only cell, no control
      // A datalist is display:none, so it is not laid out and cannot stretch anything.
      const after = c.html.slice(ctrl).replace(/<datalist[\s\S]*?<\/datalist>/g, '');
      if (/<div|<p |<span/.test(after)) offenders.push(c.open.trim());
    });
    eq(offenders, [], 'no .fld cell carries rendered content after its control');
  }

  group('the category guidance moved to its own full-width row');
  {
    const block = vformBlock();
    has(block, 'class="fld-note"', 'the note is a full-width row of its own');
    has(block, 'a firm that does two things is <strong>one</strong> vendor',
        'and it still says the thing that stops a second row being added');
    // It sits under the row it explains, so it must name the field it belongs to.
    has(block, '<strong>Category:</strong>', 'the note names its field, since it no longer sits in the cell');
    has(SRC, '.vform .fld-note{grid-column:1/-1;', 'the class spans the whole grid');
    // The COI / Reciprocity selects must still be ordinary cells in that row.
    has(block, '<select id="v-coi">', 'COI on file is still on the row');
    has(block, '<select id="v-recip">', 'and so is Reciprocity');
  }

  group('a vendor name resolves case- and whitespace-insensitively');
  {
    const ctx = sandbox({
      fns: ['_vendorNameKey', '_vendorByName'],
      stubs: { vendorDirectory: [
        { _row: 4, vendor_name: 'James & Jeffrey', category: 'Estate Sale Company' },
        { _row: 9, vendor_name: "O'Hara Landscape & Pest Control" },
      ] },
    });

    ok(!!ctx._vendorByName('James & Jeffrey'), 'an exact name is found');
    ok(!!ctx._vendorByName('james & jeffrey'), 'case does not hide it');
    ok(!!ctx._vendorByName('  James   &  Jeffrey '), 'nor does stray whitespace — the second entry is typed, not pasted');
    eq(ctx._vendorByName('James & Jeffrey')._row, 4, 'and it returns the row, so the message can name its category');
    ok(!ctx._vendorByName('James & Jeffries'), 'a genuinely different name is not a duplicate');
    ok(!ctx._vendorByName(''), 'an empty name matches nothing');
    ok(!ctx._vendorByName(null), 'and null does not throw');
  }

  group('one append per press');
  {
    const body = fn('saveVendor');

    has(body, 'if (_vendorSaveBusy) return;', 'a save in flight refuses a second press');
    has(body, '_setVendorSaveBusy(true);', 'the button goes busy before the write leaves');
    has(body, '_armVendorSaveWatchdog();', 'and a request that never settles re-enables it rather than sticking');
    // Both callbacks must release it, or a failed save locks the form for good.
    const releases = body.match(/_setVendorSaveBusy\(false\)/g) || [];
    ok(releases.length >= 2, 'every callback releases the busy state (add and update)');

    // The duplicate check is an ADD concern only — an edit legitimately keeps its name.
    const dupAt = body.indexOf('_vendorByName(name)');
    ok(dupAt > -1, 'an add checks the name against the directory first');
    const guardAt = body.indexOf('if (!editId) {');
    ok(guardAt > -1 && guardAt < dupAt, 'and the check is inside the !editId branch, so saving an edit never trips it');

    // A failed append must not read as a clean failure — the row may be on the sheet.
    has(body, 'may still have reached the sheet',
        'a failed append says the row may have landed, instead of inviting the press that duplicates it');
  }

  group('an append is still never auto-retried');
  {
    // The whole reason a second press duplicates is that this write is not idempotent.
    // Anyone "fixing" a failed save by queuing it would duplicate rows automatically,
    // without a person to blame it on.
    const map = SRC.slice(SRC.indexOf('var IDEMPOTENT_DIR_WRITES = {'));
    const decl = map.slice(0, map.indexOf('};') + 2);
    has(decl, 'updateVendor: 1', 'updates are idempotent and stay queued');
    lacks(decl, 'addVendor', 'addVendor is NOT queued — a retry would append the row twice');
    lacks(decl, 'addPartner', 'and neither is addPartner, for the same reason');

    has(SRC, 'id="v-save-btn"', 'the Save button carries the id the busy state repaints');
  }
};
