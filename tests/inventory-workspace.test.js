'use strict';
// The Inventory tab as the concierge's evening review surface.
//
// Anthony, 2026-09-01: "after working on a job all day and using the job plan tab in each
// room … the transition concierge will be at home or in the office, and they will
// transition from the job plan, which is what they use in the field, to reviewing the
// inventory tab … maybe it should be grouped by disposition channel. And then within
// that, by room."
//
// What it replaced: a 29-column table with a row of buttons above it that swapped which
// slice was on screen. "I don't really understand what happens at the bottom with all
// these squares or rectangles you tick."

const fs = require('fs');
const path = require('path');
const { sandbox } = require('./harness');

const APP = () => fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');

module.exports = function ({ group, ok, eq, has, lacks }) {

  group('grouping — disposition first, undecided at the top, rooms in walkthrough order');
  {
    const ctx = sandbox({
      fns: ['_invDispLabel', '_invGroupItems'],
      vars: ['INV_GROUP_ORDER', 'INV_UNDECIDED'],
      stubs: { _invRoomName: (jobId, idx) => (idx == null ? 'Unassigned / estate-wide' : 'Room ' + idx) },
    });
    const job = { id: 1 };
    const item = (o) => Object.assign({ stableId: 's' + Math.random(), roomIdx: 1 }, o);
    const items = [
      item({ disposition: 'Junk', roomIdx: 9, fmv: 100 }),
      item({ disposition: '', roomIdx: 4 }),
      item({ disposition: 'Auction', roomIdx: 9, fmv: 4200, reviewed: true }),
      item({ disposition: 'Keep', roomIdx: 1 }),
      item({ disposition: 'Auction', roomIdx: 1, fmv: 1800 }),
      item({ disposition: 'Auction', roomIdx: null }),
    ];
    const g = ctx._invGroupItems(job, items);

    eq(g.map((x) => x.key), ['', 'Keep', 'Auction', 'Junk'],
       'undecided leads, then the order decisions are actually made in — not alphabetical');
    eq(g[0].label, 'Not yet decided', 'the empty bucket is named, not left blank');

    const auction = g.filter((x) => x.key === 'Auction')[0];
    eq(auction.rooms.map((r) => r.key), ['1', '9', '~'],
       'rooms run in walkthrough order and the unassigned room sorts last');
    eq(auction.fmv, 6000, 'the section subtotals its own FMV');
    eq(auction.reviewed, 1, 'and counts what has been reviewed');

    // A disposition typed straight into the sheet must still appear. Dropping it would
    // hide real property from the person reviewing the estate.
    const odd = ctx._invGroupItems(job, [item({ disposition: 'Escheat' })]);
    eq(odd.map((x) => x.key), ['Escheat'], 'an unrecognised disposition still renders');
  }

  group('review state gates nothing and locks nothing');
  {
    const ctx = sandbox({ fns: ['_invReviewStats', '_invProgressStamp'] });

    eq(ctx._invReviewStats([{ reviewed: true }, {}, {}]), { done: 1, total: 3, complete: false },
       'progress is counted');
    eq(ctx._invReviewStats([]).complete, false, 'an empty inventory is not "complete"');
    eq(ctx._invReviewStats([{ reviewed: true }]).complete, true, 'a fully ticked one is');

    // THE DECISION THIS PROTECTS. Anthony: "we may want to show in-progress work to
    // clients during an engagement so this should not be locked until complete." The
    // document is stamped, never withheld — so the stamp has to actually be there.
    const partial = ctx._invProgressStamp([{ reviewed: true }, {}, {}]);
    has(partial, 'IN PROGRESS', 'an unfinished review stamps the document');
    has(partial, '1 of 3', 'and says exactly how far along it is');
    has(partial, 'may still change', 'and warns which lines are provisional');

    const done = ctx._invProgressStamp([{ reviewed: true }, { reviewed: true }]);
    has(done, 'REVIEWED', 'a finished review says so');
    lacks(done, 'IN PROGRESS', 'and drops the stamp');

    // No caller may refuse to produce a document because the review is unfinished.
    const src = APP();
    ['printEstateInventoryReport', 'exportInventoryCSV', 'printApprovalRequest'].forEach((fn) => {
      const at = src.indexOf('function ' + fn + '(');
      const body = src.slice(at, src.indexOf('\nfunction ', at + 10));
      lacks(body, '_invReviewStats(', fn + ' does not consult the review state to decide whether to run');
    });
  }

  group('release approval — the document that stands between an item and the door');
  {
    const ctx = sandbox({
      fns: ['_invAwaitingApproval'],
      vars: ['INV_RELEASE_DISPOSITIONS'],
      stubs: { _jobInvRefs: () => ctx.__rows },
    });
    ctx.__rows = [
      { stableId: 'a', disposition: 'Auction' },
      { stableId: 'b', disposition: 'Keep' },
      { stableId: 'c', disposition: 'Hold' },
      { stableId: 'd', disposition: 'Donate' },
      { stableId: 'e', disposition: 'Sell', approvalDate: '2026-08-01' },
      { stableId: 'f', disposition: '' },
    ];
    eq(ctx._invAwaitingApproval(1).map((r) => r.stableId), ['a', 'd'],
       'only property actually leaving the property, and only what is not yet approved');

    // Keep and Hold are excluded BY DEFINITION — nothing is leaving, so there is nothing
    // to ask permission for. An undecided item is not a request either.
    eq(ctx.INV_RELEASE_DISPOSITIONS.indexOf('Keep'), -1, 'Keep is not a release');
    eq(ctx.INV_RELEASE_DISPOSITIONS.indexOf('Hold'), -1, 'nor is Hold');

    const src = APP();
    const at = src.indexOf('function printApprovalRequest(');
    const body = src.slice(at, src.indexOf('\n// The other half', at));
    has(body, 'Verbal approval is not accepted',
        'the published promise is on the document, not just on the website');
    has(body, 'until this request is returned signed', 'and it says what is being withheld');
    has(body, 'Initial', 'the representative initials line by line, as promised');
    has(body, 'invIsFirearm', 'a firearm on the list carries its own custody note');

    // The signed copy has to come back onto the items in ONE action.
    const rec = src.slice(src.indexOf('function invRecordApproval('));
    const recBody = rec.slice(0, rec.indexOf('\n}\n'));
    has(recBody, 'ref.authBy = who', 'recording a signed approval writes who signed');
    has(recBody, 'ref.approvalDate = when', 'and when');
  }

  group('CSV — same rows as the workbook, quoted so a spreadsheet can read it');
  {
    const ctx = sandbox({ fns: ['_csvCell'] });
    eq(ctx._csvCell('plain'), 'plain', 'an ordinary value is bare');
    eq(ctx._csvCell('Tiffany lamp, signed'), '"Tiffany lamp, signed"', 'a comma forces quotes');
    eq(ctx._csvCell('a "signed" piece'), '"a ""signed"" piece"', 'a quote is doubled');
    eq(ctx._csvCell('line one\nline two'), '"line one\nline two"', 'a newline forces quotes');
    eq(ctx._csvCell(''), '', 'blank stays blank');
    eq(ctx._csvCell(null), '', 'and null does not print "null"');
    eq(ctx._csvCell(0), '0', 'zero is a value, not a blank');

    const src = APP();
    const at = src.indexOf('function buildInventoryCSV(');
    const body = src.slice(at, src.indexOf('\nfunction ', at + 10));
    // Built off the SAME payload the Drive workbook is written from, so the file the
    // concierge emails an attorney cannot disagree with the workbook shared with counsel.
    has(body, 'buildInventoryPayload(jobId)', 'the CSV is built off the workbook payload');
  }

  group('the Excel BOM, because an attorney opening a mangled § is our problem');
  {
    const src = APP();
    const at = src.indexOf('function exportInventoryCSV(');
    const body = src.slice(at, src.indexOf('\n}\n', at));
    // Without it Excel reads a UTF-8 CSV as Windows-1252 and every § and é arrives broken.
    has(body, '﻿', 'the CSV is written with a byte-order mark');
    has(body, "charset=utf-8", 'and declares its charset');
  }

  group('a Drive file id is recoverable for photos taken before it was stored');
  {
    const ctx = sandbox({ fns: ['_invFileId'] });
    eq(ctx._invFileId({ driveFileId: 'abc123' }), 'abc123', 'the stored id wins');
    eq(ctx._invFileId({ driveFileUrl: 'https://drive.google.com/file/d/1A_b-C9xyzQWERTY/view?usp=drivesdk' }),
       '1A_b-C9xyzQWERTY',
       'and an older row falls back to the id inside the URL it did store');
    eq(ctx._invFileId({}), '', 'a manual line item has neither, and that is not an error');
    eq(ctx._invFileId(null), '', 'and null does not throw');
  }

  group('thumbnails never come straight from drive.google.com');
  {
    const src = APP();
    // shareInventoryWithCounsel grants access with addViewer(email) — named viewers only —
    // so an <img> at drive.google.com needs an authenticated session. This app is served
    // from GitHub Pages, so that is cross-site, and Safari blocks third-party cookies:
    // it would render on desktop Chrome and fail on the iPad the work is done on.
    // The phrase is allowed to appear in a comment — that comment is the whole point. It
    // must never appear in code, which is where it would become an <img src>.
    const inCode = src.split('\n')
      .filter((l) => l.includes('drive.google.com/thumbnail'))
      .filter((l) => !l.trim().startsWith('//'));
    eq(inCode, [], 'the direct Drive thumbnail URL survives only as a warning, never as code');
    const at = src.indexOf('function _invEnsureThumbs(');
    const body = src.slice(at, src.indexOf('\n// Paint into', at));
    has(body, "action: 'getThumbnails'", 'they are fetched through the Apps Script instead');
    has(body, '_invThumbTried[id] = 1', 'and a failed batch is not re-fired on every render');

    // The row markup must NOT inline base64 — this tab re-renders on every review tick.
    const th = src.slice(src.indexOf('function _invThumbHTML('));
    const thBody = th.slice(0, th.indexOf('\n}\n'));
    lacks(thBody, 'background-image', 'the row placeholder carries no inlined image');
    has(thBody, 'data-thumb-id', 'it is painted in afterwards by id');
    has(thBody, 'INV_CAT_GLYPH', 'and an unresolved photo shows a category glyph');
    lacks(thBody, '<img', 'never an <img> that could render broken in front of a client');
  }

  group('the new fields survive a save');
  {
    const src = APP();
    const at = src.indexOf('function savePhotoRefs(');
    const body = src.slice(at, src.indexOf('\n}\n', at));
    // savePhotoRefs is a WHITELIST. A field missing from it is dropped silently on the
    // next save — which is how a whole column of work disappears without an error.
    ['reviewed', 'reviewedAt', 'reviewedBy', 'valNote', 'driveFileId'].forEach((k) => {
      has(body, k + ':r.' + k, k + ' is on the save whitelist');
    });
  }

  group('the appraiser roster records expected turnaround');
  {
    const src = APP();
    // "which appraiser is engaged for each, and expected turnaround" — the deliverables
    // page promises it and nothing in the app recorded it.
    const add = src.slice(src.indexOf('function addAppraiser('));
    has(add.slice(0, add.indexOf('\n}\n')), "dueDate: g('appr-duedate')", 'a due date is captured');
    const rep = src.slice(src.indexOf('function printEstateInventoryReport('));
    has(rep.slice(0, rep.indexOf('\n// ── CSV')), 'a.dueDate', 'and printed on the appraisal flag list');
  }

  group('the report carves out what is not in the probate estate');
  {
    const src = APP();
    const at = src.indexOf('function printEstateInventoryReport(');
    const body = src.slice(at, src.indexOf('\n// ── CSV', at));
    // "Homestead, exempt, and non-probate property identified and carved out."
    has(body, 'r.flagExempt || !_invIsProbateAsset(r)', 'exempt and non-probate are separated out');
    has(body, 'carved out of the probate estate', 'and the section says so plainly');
    // A value with no stated source is what the published promise exists to prevent.
    has(body, 'not stated', 'a missing valuation source is called out, not left blank');
  }
};
