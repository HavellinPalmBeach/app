/**
 * Havellin — saveInventory action  (Build 3)  —  tailored to your existing Apps Script
 * ──────────────────────────────────────────────────────────────────────────────
 * Writes/refreshes a per-client estate inventory WORKBOOK in that client's Drive
 * folder (inside "Asset Documentation" so it travels with the diligence share).
 * The app (havellin.html) is the only writer; this regenerates the workbook each
 * time inventory data changes.
 *
 * INSTALL (matches your current script)
 * 1. Paste this whole file into the same Apps Script project that has doGet/doPost.
 *    It reuses your existing jsonOut(); no other helpers needed.
 * 2. In your doPost, in the `type` if/else chain (next to saveAllJobs etc.), add:
 *
 *        else if (type === 'saveInventory')  { return jsonOut(saveInventory(payload)); }
 *
 *    Put it BEFORE the final `else { return jsonOut({ ok:false, ... }) }`. Returning
 *    here (instead of a void handler) surfaces the real { ok, url } / error to the app.
 * 3. Re-deploy: Deploy ▸ Manage deployments ▸ Edit (pencil) ▸ Version: New version ▸
 *    Deploy. The web-app URL stays the same, so no app Settings change is needed.
 *
 * PAYLOAD (from buildInventoryPayload in havellin.html)
 *   { jobId, hvlId, estate, address, deathDate, lettersDate, deadline,
 *     preparedBy, driveFolder, lastUpdated,
 *     columns: [header strings, one per manifest column, col A onwards],
 *     rows:    [ [one cell value per column], ... ] }   // Net sent blank — written as a formula
 *
 * The column COUNT is not fixed and must never be assumed. Resolve positions with
 * _invColLetter / indexOf against payload.columns.
 */

// ── Summary rollup labels ─────────────────────────────────────────────────────
// These used to be hardcoded copies of the app's lists, with a comment asserting they
// matched. They did not: 6 categories against the app's 13, and 5 dispositions against
// 7. The workbook's "FMV by Category" therefore dropped Antiques, Silver & Precious
// Metal, Rugs & Carpets, Firearms, Wine & Spirits, Musical Instruments and Vehicles &
// Watercraft — the seven an estate's value actually sits in — and the category rows
// silently failed to sum to the Total FMV printed directly above them, on the document
// that goes to the attorney.
//
// The app now SENDS its lists in the payload, so they cannot drift again. The literals
// below are a last-resort fallback for a payload from an app build older than
// 2026-08-24; a current payload never reaches them.
var INV_CATEGORIES_FALLBACK = ['Antiques','Art & Décor','Collectibles','Electronics & Appliances',
  'Firearms','Furniture','General/Household','Jewelry & Watches','Musical Instruments',
  'Rugs & Carpets','Silver & Precious Metal','Vehicles & Watercraft','Wine & Spirits'];
var INV_DISPOSITIONS_FALLBACK = ['Auction','Consign','Donate','Hold','Junk','Keep','Sell'];

// Column letter for a header name, so the Summary formulas survive a column being
// inserted or reordered in INVENTORY_COLUMNS. Returns '' when the header is absent.
function _invColLetter(columns, header) {
  var i = (columns || []).indexOf(header);
  if (i < 0) return '';
  var n = i + 1, out = '';
  while (n > 0) { var r = (n - 1) % 26; out = String.fromCharCode(65 + r) + out; n = Math.floor((n - 1) / 26); }
  return out;
}

function _folderIdFromUrl(url) {
  if (!url) return '';
  var m = String(url).match(/[-\w]{25,}/);   // Drive folder/file IDs are 25+ chars
  return m ? m[0] : '';
}

function saveInventory(payload) {
  try {
    if (!payload) return { ok: false, success: false, error: 'No payload' };
    var folderId = _folderIdFromUrl(payload.driveFolder);
    if (!folderId) return { ok: false, success: false, error: 'Could not resolve client Drive folder from driveFolder URL' };

    var clientFolder = DriveApp.getFolderById(folderId);

    // Ship the workbook inside the shareable "Estate Inventory" subfolder (falling back
    // to the older "Asset Documentation" folder for jobs created before the merge, then
    // to the client root if neither exists).
    // ⚠ THE WORKBOOK STAYS IN 'Estate Inventory' AND MUST NOT FOLLOW THE 2026-09-20 FOLDER
    // SPLIT. Only the as-found PHOTOGRAPHS moved; the workbook is the schedule, its As-Found
    // Record tab is an index of files that live elsewhere, and moving it would change the
    // path under every link counsel has already been given.
    var target = clientFolder;
    var subs = clientFolder.getFoldersByName('Estate Inventory');
    if (!subs.hasNext()) subs = clientFolder.getFoldersByName('Asset Documentation');
    if (subs.hasNext()) target = subs.next();

    var name = 'Estate Inventory — ' + (payload.hvlId || payload.jobId);
    var ss, it = target.getFilesByName(name);
    if (it.hasNext()) {
      ss = SpreadsheetApp.open(it.next());
    } else {
      ss = SpreadsheetApp.create(name);
      var file = DriveApp.getFileById(ss.getId());
      target.addFile(file);
      try { DriveApp.getRootFolder().removeFile(file); } catch (e) {}  // keep My Drive clean
    }

    _writeInventorySheet(ss, payload);
    _writeSummarySheet(ss, payload);
    _writeAsFoundSheet(ss, payload);
    SpreadsheetApp.flush();
    return { ok: true, success: true, url: ss.getUrl(), rows: (payload.rows || []).length };
  } catch (err) {
    return { ok: false, success: false, error: String(err) };
  }
}

function _writeInventorySheet(ss, payload) {
  var sh = ss.getSheetByName('Inventory');
  if (!sh) sh = ss.insertSheet('Inventory', 0);
  sh.clear();

  var cols = payload.columns || [];
  var rows = payload.rows || [];
  var nCol = cols.length;

  sh.getRange(1, 1, 1, nCol).setValues([cols]).setFontWeight('bold').setBackground('#efe9dd');
  sh.setFrozenRows(1);

  // ⚠ THESE WERE HARDCODED COLUMN NUMBERS AND THEY WENT WRONG THE MOMENT A COLUMN WAS
  // INSERTED. The Summary sheet below was converted to header lookup on 2026-08-24 and
  // this function was not, so when flagNFA was added the Net formula was written into
  // the Fees column and the currency formats landed on Approval Date / Gross / Fees.
  // The client's workbook is the document that goes to the attorney; a formula sitting
  // on top of a field that records who authorised a firearms release is not a cosmetic
  // defect. Resolve by HEADER NAME here too, and never reintroduce a literal index.
  var idx = function(header) { var i = cols.indexOf(header); return i < 0 ? 0 : i + 1; };
  var cFmv   = idx('Estimated FMV');
  var cGross = idx('Gross Proceeds');
  var cFees  = idx('Fees');
  var cNet   = idx('Net to Estate');

  if (rows.length) {
    sh.getRange(2, 1, rows.length, nCol).setValues(rows);
    if (cNet && cGross && cFees) {
      var gL = _invColLetter(cols, 'Gross Proceeds');
      var fL = _invColLetter(cols, 'Fees');
      var netFormulas = [];
      for (var r = 0; r < rows.length; r++) {
        var rr = r + 2;
        netFormulas.push(['=IF(AND(' + gL + rr + '="",' + fL + rr + '=""),"",N(' + gL + rr + ')-N(' + fL + rr + '))']);
      }
      sh.getRange(2, cNet, rows.length, 1).setFormulas(netFormulas);
    }
    [cFmv, cGross, cFees, cNet].forEach(function(c) {
      if (c) sh.getRange(2, c, rows.length, 1).setNumberFormat('$#,##0');
    });
  }
  sh.autoResizeColumns(1, Math.min(nCol, 9));
}

// The as-found index, in the same workbook the representative already has.
//
// ⚠⚠ IT IS WRITTEN EVEN WHEN THERE IS NOTHING TO WRITE, and that is deliberate. An absent
// tab reads as a feature the workbook does not have; an empty one with its heading reads as
// a pass nobody has shot yet. Those are different facts and only one of them is true, so the
// sheet says which.
//
// ⚠ THE COLUMNS COME FROM THE PAYLOAD. This file used to hold its own copies of the category
// and disposition lists and they drifted to 6-against-13 and 5-against-7, so the client's
// Summary silently dropped seven categories. One definition, in the app, sent on the wire.
// A payload from a build older than 2026-09-20 carries neither `asFound` nor
// `asFoundColumns`; the tab is then left exactly as it is rather than blanked, because an
// older app is not a statement that the record is empty.
function _writeAsFoundSheet(ss, payload) {
  if (!payload.asFoundColumns) return;
  var sh = ss.getSheetByName('As-Found Record');
  if (!sh) sh = ss.insertSheet('As-Found Record');
  sh.clear();

  var cols = payload.asFoundColumns;
  var rows = payload.asFound || [];
  var nCol = cols.length;

  sh.getRange(1, 1, 1, 1).setValue('As-Found Record \u2014 the property as it was found, before anything was moved')
    .setFontWeight('bold').setFontSize(12);
  sh.getRange(2, 1, 1, 1).setValue('Photographed before any item was handled. These are evidence of the state of the '
    + 'property and are not inventory lines \u2014 nothing here is valued, dispositioned or proposed for release.')
    .setFontColor('#666666');
  sh.getRange(4, 1, 1, nCol).setValues([cols]).setFontWeight('bold').setBackground('#efe9dd');
  sh.setFrozenRows(4);

  if (!rows.length) {
    sh.getRange(5, 1).setValue('No as-found photographs have been taken on this job yet.').setFontColor('#A32D2D');
    sh.autoResizeColumns(1, nCol);
    return;
  }
  sh.getRange(5, 1, rows.length, nCol).setValues(rows);

  // A gap row and an unsaved link are the two things a reader must not skim past, so they
  // are coloured rather than left to read as ordinary rows. Resolve the columns by HEADER,
  // never by a literal index — the Inventory sheet's hardcoded numbers wrote a formula over
  // the field recording who authorised a firearms release the moment a column was inserted.
  var cLink = cols.indexOf('Link') + 1;
  var cFile = cols.indexOf('File') + 1;
  for (var r = 0; r < rows.length; r++) {
    if (cFile && rows[r][cFile - 1] === 'NO AS-FOUND PHOTOGRAPHS') {
      sh.getRange(r + 5, 1, 1, nCol).setFontColor('#A32D2D').setFontWeight('bold');
    } else if (cLink && rows[r][cLink - 1] === 'NOT SAVED TO DRIVE') {
      sh.getRange(r + 5, cLink).setFontColor('#A32D2D');
    }
  }
  sh.autoResizeColumns(1, nCol);
}

function _writeSummarySheet(ss, payload) {
  var sh = ss.getSheetByName('Summary');
  if (!sh) sh = ss.insertSheet('Summary');
  sh.clear();

  var put  = function(r, c, v) { sh.getRange(r, c).setValue(v); };
  var bold = function(r, c) { sh.getRange(r, c).setFontWeight('bold'); };

  // ⚠⚠ THIS SHEET ASSERTED THAT SOMEBODY HAD DIED, ON EVERY JOB (fixed 2026-09-21). The
  // room-by-room inventory runs on all six labour services, so a Home Editing client's own
  // workbook opened with "Date of Death", "Letters Issued" and "§733.604 Inventory Deadline"
  // over three empty cells, then counted "Items Awaiting Valuation" on an engagement that
  // does not value anything and "Exempt §732.402" against a statute that needs a decedent.
  // Anthony, on the FILE name: *"i think 'estate' inventory is fine. could be a fancy name
  // for a big house. not always a dead persons estate."* A fancy name is a fancy name; a
  // statutory court deadline is a claim. Only the claims come off.
  //
  // ⚠⚠ AN ABSENT `docSet` MEANS ESTATE, AND DEFAULTING THE OTHER WAY WOULD BE THE BAD
  // FAILURE. A payload from an app build older than 2026-09-21 carries no flag at all, and
  // every sheet it has ever written was the estate layout — so an old tab left open must
  // render exactly what it rendered yesterday rather than stripping the §733.604 deadline
  // off a live probate matter on its first write. Same rule `_writeAsFoundSheet` follows on
  // a payload with no `asFoundColumns`: an older app is not a statement about the record.
  var fid = String(payload.docSet || 'estate') === 'estate';

  // ⚠⚠ AND IT ASSERTED A COURT ON A TRUST MATTER (fixed 2026-09-21). Anthony: "most homes will
  // be in trust. so we need to get this right." Letters of Administration are issued by a
  // probate court, §733.604 is a filing deadline in that proceeding, and the §732.402 exempt
  // allowance is petitioned for in it — so a successor trustee's workbook opened with a
  // statutory deadline over an empty cell. The valuation block is NOT probate-specific and
  // stays: date-of-death FMV is the §1014 basis, the Form 706 figure and the §736.08135
  // carrying value alike, and the step-up reaches revocable trust assets.
  //
  // ⚠⚠ ABSENT MEANS TRUE, same direction `docSet` takes. An app build older than 2026-09-21b
  // sends no flag, and every job recorded before the matter type existed answers '' — stripping
  // a court deadline off a live probate matter on the strength of an unasked question is the
  // bad failure. Only an explicit false withholds, and the app only sends false on `trust` or
  // `neither`. Compared as a STRING so a boolean and a stringified boolean read alike.
  var pr = fid && String(payload.onProbate) !== 'false';

  // ⚠ THE FILE NAME AND THE FOLDER STAY 'Estate Inventory' ON BOTH SIDES — Anthony's call,
  // and `saveInventory` looks the workbook up BY NAME, so a branched name would not rename
  // the existing file, it would create a second workbook beside it and leave every link
  // already given to a client pointing at the stale one.
  put(1,1,'ESTATE INVENTORY — SUMMARY'); bold(1,1);

  // The header block is laid out SEQUENTIALLY rather than at fixed rows, for the reason the
  // category block below already carries: rows 6-8 only came off cleanly because nothing
  // underneath was addressed by number. Three rows disappearing must not leave a hole.
  var h = 3;
  put(h,1, fid ? 'Client / Estate' : 'Client'); put(h,2, payload.estate || ''); h++;
  put(h,1,'Job ID');            put(h,2, payload.hvlId || '');   h++;
  put(h,1,'Property Address');  put(h,2, payload.address || ''); h++;
  if (fid) { put(h,1,'Date of Death'); put(h,2, payload.deathDate || ''); h++; }
  if (pr) {
    put(h,1,'Letters Issued');  put(h,2, payload.lettersDate || ''); h++;
    put(h,1,'§733.604 Inventory Deadline'); put(h,2, payload.deadline || ''); h++;
  }
  put(h,1,'Prepared By');       put(h,2, payload.preparedBy || 'Havellin Palm Beach, LLC'); h++;
  put(h,1,'Last Updated');      put(h,2, payload.lastUpdated || new Date().toISOString());  h++;

  // Column letters are looked up by HEADER, not hardcoded, so inserting a column in
  // INVENTORY_COLUMNS cannot silently repoint a formula at the wrong data.
  var cols = payload.columns || [];
  var C = {
    item:  _invColLetter(cols, 'Item #')          || 'B',
    cat:   _invColLetter(cols, 'Category')        || 'E',
    disp:  _invColLetter(cols, 'Disposition')     || 'F',
    fmv:   _invColLetter(cols, 'Estimated FMV')   || 'L',
    exmt:  _invColLetter(cols, 'Exempt §732.402') || 'P',
    beq:   _invColLetter(cols, 'Specific Bequest')|| 'Q',
    disp2: _invColLetter(cols, 'Disputed')        || 'R',
    gross: _invColLetter(cols, 'Gross Proceeds')  || 'V',
    fees:  _invColLetter(cols, 'Fees')            || 'W',
    net:   _invColLetter(cols, 'Net to Estate')   || 'X'
  };
  var rng = function(letter) { return 'Inventory!' + letter + '2:' + letter; };

  var t = h + 1;
  put(t,1, fid ? 'ESTATE TOTALS' : 'TOTALS'); bold(t,1); t++;
  put(t,1,'Total Items'); sh.getRange(t,2).setFormula('=COUNTIF(' + rng(C.item) + ',">0")'); t++;
  // ⚠ "Items Awaiting Valuation" IS THE ONE THAT WOULD HAVE READ AS AN OUTSTANDING TASK
  // FOREVER. Nobody enters a value on a living-client job — Anthony ruled valuation out of
  // them — so the count would equal the item count on every write and never fall, which is
  // how a reader learns to skip the whole block.
  var fmvRow = 0;
  if (fid) {
    fmvRow = t;
    put(t,1,'Total Estimated FMV');      sh.getRange(t,2).setFormula('=SUM(' + rng(C.fmv) + ')').setNumberFormat('$#,##0'); t++;
    put(t,1,'Items Awaiting Valuation'); sh.getRange(t,2).setFormula('=COUNTIFS(' + rng(C.item) + ',">0",' + rng(C.fmv) + ',"")'); t++;
  }
  t++;

  put(t,1,'FLAGS'); bold(t,1); t++;
  // ⚠ THE EXEMPT COUNT GOES WITH THE COURT AND THE BEQUEST COUNT DOES NOT. §732.402 is a right
  // claimed against an administration; a will's specific gift is directed by the instrument
  // whether or not anything probates, and the column it counts is literally headed "Specific
  // Bequest" — renaming the rollup would make the Summary disagree with the sheet beside it.
  if (pr) { put(t,1,'Exempt §732.402'); sh.getRange(t,2).setFormula('=COUNTIF(' + rng(C.exmt) + ',"Yes")'); t++; }
  if (fid) {
    put(t,1,'Specific Bequests'); sh.getRange(t,2).setFormula('=COUNTIF(' + rng(C.beq) + ',"Yes")');  t++;
  } else {
    // The flag itself survives and only its NAME changes, the wording the on-screen summary
    // already uses: a bequest is a will term, and the living-client fact underneath it is
    // that the owner has promised the thing to somebody.
    put(t,1,'Promised to someone'); sh.getRange(t,2).setFormula('=COUNTIF(' + rng(C.beq) + ',"Yes")'); t++;
  }
  put(t,1,'Disputed / Hold'); sh.getRange(t,2).setFormula('=COUNTIF(' + rng(C.disp2) + ',"Yes")+COUNTIF(' + rng(C.disp) + ',"Hold")'); t++;
  t++;

  // ⚠ GROSS / FEES / NET STAY ON BOTH SIDES. A figure actually received from a consignment
  // or an auction is a RECORDED ACTUAL rather than an estimate, and it is the first thing a
  // family asks about the dining table — the same reason the printed Contents Record keeps
  // these three while carrying no FMV at all.
  put(t,1, fid ? 'PROCEEDS (reconciliation)' : 'PROCEEDS RECEIVED'); bold(t,1); t++;
  put(t,1,'Gross'); sh.getRange(t,2).setFormula('=SUM(' + rng(C.gross) + ')').setNumberFormat('$#,##0'); t++;
  put(t,1,'Fees');  sh.getRange(t,2).setFormula('=SUM(' + rng(C.fees) + ')').setNumberFormat('$#,##0');  t++;
  put(t,1, fid ? 'Net to Estate' : 'Net received');
  sh.getRange(t,2).setFormula('=SUM(' + rng(C.net) + ')').setNumberFormat('$#,##0'); t++;

  // The app sends its own lists; the fallbacks only catch a pre-2026-08-24 payload.
  var cats  = (payload.categories   && payload.categories.length)   ? payload.categories   : INV_CATEGORIES_FALLBACK;
  var disps = (payload.dispositions && payload.dispositions.length) ? payload.dispositions : INV_DISPOSITIONS_FALLBACK;

  // Both blocks are laid out SEQUENTIALLY. They used to start at fixed rows 3 and 12,
  // which was only safe while the category list was six long; at thirteen the category
  // rows would have run straight through the disposition heading.
  var r = 2, first;
  if (fid) {
    put(r,4,'FMV BY CATEGORY'); bold(r,4); put(r,5,'FMV'); put(r,6,'Count');
    r++; first = r;
    for (var i = 0; i < cats.length; i++, r++) {
      put(r,4,cats[i]);
      sh.getRange(r,5).setFormula('=SUMIF(' + rng(C.cat) + ',$D' + r + ',' + rng(C.fmv) + ')').setNumberFormat('$#,##0');
      sh.getRange(r,6).setFormula('=COUNTIF(' + rng(C.cat) + ',$D' + r + ')');
    }
    // A total under the category rows, so a reader can see at a glance that the breakdown
    // reconciles to Total Estimated FMV. When it did not, nothing on the sheet said so.
    put(r,4,'Total (should equal B' + fmvRow + ')'); bold(r,4);
    sh.getRange(r,5).setFormula('=SUM(E' + first + ':E' + (r - 1) + ')').setNumberFormat('$#,##0');
    sh.getRange(r,6).setFormula('=SUM(F' + first + ':F' + (r - 1) + ')');
  } else {
    // Counts, not money. A column headed FMV over an engagement that prices nothing is an
    // invitation to read the blanks as zeroes and the total as a valuation of the house.
    put(r,4,'ITEMS BY CATEGORY'); bold(r,4); put(r,5,'Count');
    r++; first = r;
    for (var k = 0; k < cats.length; k++, r++) {
      put(r,4,cats[k]);
      sh.getRange(r,5).setFormula('=COUNTIF(' + rng(C.cat) + ',$D' + r + ')');
    }
    put(r,4,'Total'); bold(r,4);
    sh.getRange(r,5).setFormula('=SUM(E' + first + ':E' + (r - 1) + ')');
  }
  r += 2;

  put(r,4,'DISPOSITION'); bold(r,4); put(r,5,'Count');
  r++;
  for (var j = 0; j < disps.length; j++, r++) {
    put(r,4,disps[j]);
    sh.getRange(r,5).setFormula('=COUNTIF(' + rng(C.disp) + ',$D' + r + ')');
  }
  r++;

  // ⚠ THE FOOTER'S WHOLE SUBJECT IS WHAT COUNSEL FILES INSTEAD, so it has no living-client
  // counterpart and is REPLACED rather than reworded. What the family's copy needs stated is
  // the opposite thing: that this is a record of where property went and not a valuation of
  // it — the same disclaimer the agreement's Project Records clause carries.
  // ⚠ THE TRUST FOOTER NAMES WHAT IS OUT AND CITES NOTHING. It is deliberately NOT the trustee's
  // schedule — Chapter 736 citations, a successor-trustee signature block and the line stating
  // this SUPPORTS rather than constitutes a §736.08135 accounting are a separate build, and
  // half-building them here is how Havellin drifts into fiduciary accounting work.
  put(r,4, !fid
    ? 'A record of the contents documented on this engagement and where each item went. It is not an appraisal or a statement of value, and it does not evidence ownership or the legal effect of any transfer.'
    : (pr
      ? 'Tangible personal property only. The §733.604 court inventory (real property, accounts, securities, business interests) is the PR’s filing, prepared with counsel.'
      : 'Tangible personal property only. Real property, accounts, securities and business interests are administered under the trust instrument and are not part of this schedule.'));
  sh.autoResizeColumns(1, 6);
}


// ══════════════════════════════════════════════════════════════════════════════
//  MEDIA / INVENTORY MANIFEST STORE  —  the durable copy of the item record
// ══════════════════════════════════════════════════════════════════════════════
//  Until 2026-08-24 the manifest lived ONLY in one browser's localStorage. The
//  workbook write above was one-way and nothing ever read back, so two people on
//  two devices held two different manifests of the same estate and whichever
//  synced last overwrote the other wholesale; clearing site data destroyed the
//  record outright (the photos survive in Drive, the account of what they are
//  did not).
//
//  This store is the fix. Two things about it are deliberate:
//
//  1. It lives in the MAIN spreadsheet, not in the client's Drive folder. The
//     Estate Inventory folder is shared read-only with counsel by
//     shareInventoryWithCounsel, and the manifest carries internals counsel has
//     no business reading — custody logs, appraisal-waiver reasons, upload state.
//
//  2. The merge is PER ITEM, not per job. _mergeStoreByKey keeps the newer whole
//     entry, which for an inventory means two people editing different items on
//     the same job still clobber each other. Every mutation in the app stamps
//     updatedAt; this resolves item by item against it.
//
//  Requires _readStoreBlob / _writeStoreBlob from main-sync.gs. Apps Script shares
//  global scope across a project's files, so they resolve at run time.

function getMediaStore() {
  return _readStoreBlob('MediaStore', {});
}

// Union by stableId; per item the newer updatedAt wins. Absence is NOT deletion —
// an item missing from one side is one that side has not seen yet, which is why the
// app writes a `deletedAt` tombstone instead of removing the row. Without tombstones
// a union merge resurrects everything anyone has ever deleted, on the next sync.
// ⚠⚠ A CHAIN-OF-CUSTODY EVENT IS APPEND-ONLY, AND "THE NEWER RECORD WINS" DESTROYED IT.
// Resolving an item by taking the whole newer RECORD is right for a scalar and categorically
// wrong for a LOG: one device logs "Released · Sotheby's · receipt SBY-4471", another corrects
// the same item's value without having seen it, and the correction wins whole — the log comes
// back empty. So the log is UNIONED by event identity rather than won.
// ⚠ THIS IS THE SAME RULE AS mergeCustodyLogs / _custodyEventId IN havellin.html AND
// tests/media-merge.test.js DRIVES BOTH AND ASSERTS THEY AGREE. Change one, change the other.
// ⚠⚠ A SCALAR ONE DEVICE HAS AND THE OTHER DOES NOT WAS SIMPLY LOST. Measured on the real
// merge: Ashley records `authBy: 'Tripp Butler', approvalDate: '2026-09-10'` at updatedAt 10;
// Anthony sets the same item's Condition at 20 without having seen it; his record wins whole
// and the merge returns just the condition. The representative's written authority is gone,
// and the item walks back onto the next release approval request as though nobody signed.
// ⚠ SAME LIST AND SAME RULE AS INV_STICKY_FIELDS / invStickyValue IN havellin.html, and
// tests/media-merge.test.js drives BOTH and asserts they agree. Change one, change the other.
var INV_STICKY_FIELDS = ['itemNo', 'authBy', 'approvalDate', 'dispDate', 'receiptDoc',
                         'driveFileId', 'driveFileUrl', 'filename', 'sourceCollId', 'sourceVehId'];
function _invHasVal(v) { return v !== undefined && v !== null && v !== ''; }
// "Never saw a value" and "deliberately emptied it" are different answers: without telling
// them apart a sticky field could never be cleared at all, because the stale device would
// restore it on the next sync. The app stamps clearedAt[key] when a person empties one.
function _invStickyValue(win, lose, key) {
  if (_invHasVal(win[key])) return win[key];
  if (win.clearedAt && win.clearedAt[key]) return win[key];
  return _invHasVal(lose[key]) ? lose[key] : win[key];
}

function _custodyEventId(e) {
  if (!e) return '';
  if (e.cid) return 'id:' + e.cid;
  var parts = [e.action, e.party, e.date, e.method, e.receipt];
  for (var i = 0; i < parts.length; i++) parts[i] = String(parts[i] == null ? '' : parts[i]);
  return 'v:' + parts.join('\u0000');
}
// A void wins over a live copy, or the union resurrects anything either side removed.
function _mergeCustodyLogs(a, b) {
  var out = [], at = {};
  var take = function(list) {
    for (var i = 0; i < (list || []).length; i++) {
      var e = list[i];
      if (!e) continue;
      var id = _custodyEventId(e);
      if (at[id] !== undefined) {
        if (e.deletedAt && !out[at[id]].deletedAt) out[at[id]] = e;
        continue;
      }
      at[id] = out.length;
      out.push(e);
    }
  };
  take(a); take(b);
  return out;
}

function _mergeMediaItems(existing, incoming) {
  var byId = {}, order = [];
  // The winner is COPIED, never mutated — `existing` is the store blob this function was
  // handed, and writing the merged log onto it would edit the store as a side effect.
  var resolve = function(win, lose) {
    var log = _mergeCustodyLogs(win.custodyLog, lose.custodyLog);
    // The sticky fields, of which the item number is one: permanent, and only the losing side
    // may have seen it assigned — a winner without one is sent back through the app's backfill
    // to be issued a NEW number, silently renumbering an object a receipt already cites.
    // ⚠ NO SHORT-CIRCUIT. The first cut returned `win` untouched when the merged log was
    // the same LENGTH — which is not the same as unchanged: a void on the losing side
    // REPLACES an event without adding one, so the tombstone was computed and then thrown
    // away, and a removal made on one device was silently undone by the other. Found by
    // reverting the tombstone rule and watching the test fail with the rule still in place.
    // A contested item is copied, always; an uncontested one never reaches here.
    var out = {};
    for (var k in win) if (Object.prototype.hasOwnProperty.call(win, k)) out[k] = win[k];
    if (log.length) out.custodyLog = log;
    for (var si = 0; si < INV_STICKY_FIELDS.length; si++) {
      var key = INV_STICKY_FIELDS[si];
      var v = _invStickyValue(win, lose, key);
      if (v !== undefined) out[key] = v;
    }
    return out;
  };
  var take = function(list) {
    for (var i = 0; i < (list || []).length; i++) {
      var it = list[i];
      if (!it || !it.stableId) continue;
      var cur = byId[it.stableId];
      if (!cur) { order.push(it.stableId); byId[it.stableId] = it; continue; }
      var a = Number(it.updatedAt || it.ts || 0);
      var b = Number(cur.updatedAt || cur.ts || 0);
      byId[it.stableId] = (a >= b) ? resolve(it, cur) : resolve(cur, it);
    }
  };
  take(existing);
  take(incoming);
  var out = [];
  for (var k = 0; k < order.length; k++) out.push(byId[order[k]]);
  return out;
}

// Payload: { jobId, savedAt, items:[...] } for ONE job. Scoped to one job on purpose —
// a whole-store write from a device holding a partial view would be a much bigger blast
// radius, and the app only ever edits one job at a time.
function saveMediaStore(payload) {
  try {
    if (!payload || payload.jobId == null) return { ok: false, success: false, error: 'No jobId' };
    var lock = LockService.getScriptLock();
    try { lock.waitLock(20000); } catch (e) {}
    try {
      var key = String(payload.jobId);
      // A manifest for a job the sheet has seen and no longer holds (see JOB LEDGER in
      // main-sync.gs) is refused, not merged — the same rule as every other job-keyed store.
      var ctx = _jobRefusalCtx();
      if (_jobRefusal(key, null, ctx.present, ctx.ledger)) {
        Logger.log('saveMedia refused deleted job ' + key);
        return { ok: true, success: true, jobId: key, count: 0, dropped: [key] };
      }
      var store = getMediaStore();
      var cur = store[key] && store[key].items ? store[key].items : [];
      store[key] = {
        savedAt: Number(payload.savedAt) || new Date().getTime(),
        items: _mergeMediaItems(cur, payload.items || [])
      };
      // And the same standing sweep the other stores got on 2026-09-09: a manifest left
      // behind when its job row was deleted by hand had nothing to remove it. Carries the
      // whole photo list, so an orphan here is the largest of the five by a distance.
      _sweepDeletedJobKeys(store, ctx.present, ctx.ledger);
      _writeStoreBlob('MediaStore', store);
      return { ok: true, success: true, jobId: key, count: store[key].items.length };
    } finally {
      try { lock.releaseLock(); } catch (e) {}
    }
  } catch (err) {
    return { ok: false, success: false, error: String(err) };
  }
}

// Whole store, or one job when jobId is given (the common case — the app asks for the
// job it is opening, and a full store read grows with every estate ever worked).
function getMediaForJob(jobId) {
  var store = getMediaStore();
  if (jobId == null || jobId === '') return store;
  var key = String(jobId);
  var out = {};
  if (store[key]) out[key] = store[key];
  return out;
}
