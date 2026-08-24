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
 *     columns: [26 header strings, col A..Z],
 *     rows:    [ [26 cell values], ... ] }     // Net (col X) sent blank — written as a formula
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
  var nCol = cols.length;            // 26

  sh.getRange(1, 1, 1, nCol).setValues([cols]).setFontWeight('bold').setBackground('#efe9dd');
  sh.setFrozenRows(1);

  if (rows.length) {
    sh.getRange(2, 1, rows.length, nCol).setValues(rows);
    // Net (col X = 24) = Gross (V=22) − Fees (W=23); blank when both empty.
    var netFormulas = [];
    for (var r = 0; r < rows.length; r++) {
      var rr = r + 2;
      netFormulas.push(['=IF(AND(V' + rr + '="",W' + rr + '=""),"",N(V' + rr + ')-N(W' + rr + '))']);
    }
    sh.getRange(2, 24, rows.length, 1).setFormulas(netFormulas);
    sh.getRange(2, 12, rows.length, 1).setNumberFormat('$#,##0');   // L Estimated FMV
    sh.getRange(2, 22, rows.length, 3).setNumberFormat('$#,##0');   // V,W,X Gross/Fees/Net
  }
  sh.autoResizeColumns(1, Math.min(nCol, 9));
}

function _writeSummarySheet(ss, payload) {
  var sh = ss.getSheetByName('Summary');
  if (!sh) sh = ss.insertSheet('Summary');
  sh.clear();

  var put  = function(r, c, v) { sh.getRange(r, c).setValue(v); };
  var bold = function(r, c) { sh.getRange(r, c).setFontWeight('bold'); };

  put(1,1,'ESTATE INVENTORY — SUMMARY'); bold(1,1);
  put(3,1,'Client / Estate');  put(3,2, payload.estate || '');
  put(4,1,'Job ID');           put(4,2, payload.hvlId || '');
  put(5,1,'Property Address');  put(5,2, payload.address || '');
  put(6,1,'Date of Death');    put(6,2, payload.deathDate || '');
  put(7,1,'Letters Issued');   put(7,2, payload.lettersDate || '');
  put(8,1,'§733.604 Inventory Deadline'); put(8,2, payload.deadline || '');
  put(9,1,'Prepared By');      put(9,2, payload.preparedBy || 'Havellin Palm Beach, LLC');
  put(10,1,'Last Updated');    put(10,2, payload.lastUpdated || new Date().toISOString());

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

  put(12,1,'ESTATE TOTALS'); bold(12,1);
  put(13,1,'Total Items');              sh.getRange(13,2).setFormula('=COUNTIF(' + rng(C.item) + ',">0")');
  put(14,1,'Total Estimated FMV');      sh.getRange(14,2).setFormula('=SUM(' + rng(C.fmv) + ')').setNumberFormat('$#,##0');
  put(15,1,'Items Awaiting Valuation'); sh.getRange(15,2).setFormula('=COUNTIFS(' + rng(C.item) + ',">0",' + rng(C.fmv) + ',"")');

  put(17,1,'FLAGS'); bold(17,1);
  put(18,1,'Exempt §732.402');   sh.getRange(18,2).setFormula('=COUNTIF(' + rng(C.exmt) + ',"Yes")');
  put(19,1,'Specific Bequests'); sh.getRange(19,2).setFormula('=COUNTIF(' + rng(C.beq) + ',"Yes")');
  put(20,1,'Disputed / Hold');   sh.getRange(20,2).setFormula('=COUNTIF(' + rng(C.disp2) + ',"Yes")+COUNTIF(' + rng(C.disp) + ',"Hold")');

  put(22,1,'PROCEEDS (reconciliation)'); bold(22,1);
  put(23,1,'Gross');         sh.getRange(23,2).setFormula('=SUM(' + rng(C.gross) + ')').setNumberFormat('$#,##0');
  put(24,1,'Fees');          sh.getRange(24,2).setFormula('=SUM(' + rng(C.fees) + ')').setNumberFormat('$#,##0');
  put(25,1,'Net to Estate'); sh.getRange(25,2).setFormula('=SUM(' + rng(C.net) + ')').setNumberFormat('$#,##0');

  // The app sends its own lists; the fallbacks only catch a pre-2026-08-24 payload.
  var cats  = (payload.categories   && payload.categories.length)   ? payload.categories   : INV_CATEGORIES_FALLBACK;
  var disps = (payload.dispositions && payload.dispositions.length) ? payload.dispositions : INV_DISPOSITIONS_FALLBACK;

  // Both blocks are laid out SEQUENTIALLY. They used to start at fixed rows 3 and 12,
  // which was only safe while the category list was six long; at thirteen the category
  // rows would have run straight through the disposition heading.
  var r = 2;
  put(r,4,'FMV BY CATEGORY'); bold(r,4); put(r,5,'FMV'); put(r,6,'Count');
  r++;
  for (var i = 0; i < cats.length; i++, r++) {
    put(r,4,cats[i]);
    sh.getRange(r,5).setFormula('=SUMIF(' + rng(C.cat) + ',$D' + r + ',' + rng(C.fmv) + ')').setNumberFormat('$#,##0');
    sh.getRange(r,6).setFormula('=COUNTIF(' + rng(C.cat) + ',$D' + r + ')');
  }
  // A total under the category rows, so a reader can see at a glance that the breakdown
  // reconciles to Total Estimated FMV. When it did not, nothing on the sheet said so.
  put(r,4,'Total (should equal B14)'); bold(r,4);
  sh.getRange(r,5).setFormula('=SUM(E3:E' + (r - 1) + ')').setNumberFormat('$#,##0');
  sh.getRange(r,6).setFormula('=SUM(F3:F' + (r - 1) + ')');
  r += 2;

  put(r,4,'DISPOSITION'); bold(r,4); put(r,5,'Count');
  r++;
  for (var j = 0; j < disps.length; j++, r++) {
    put(r,4,disps[j]);
    sh.getRange(r,5).setFormula('=COUNTIF(' + rng(C.disp) + ',$D' + r + ')');
  }
  r++;

  put(r,4,'Tangible personal property only. The §733.604 court inventory (real property, accounts, securities, business interests) is the PR’s filing, prepared with counsel.');
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
function _mergeMediaItems(existing, incoming) {
  var byId = {}, order = [];
  var take = function(list) {
    for (var i = 0; i < (list || []).length; i++) {
      var it = list[i];
      if (!it || !it.stableId) continue;
      var cur = byId[it.stableId];
      if (!cur) { order.push(it.stableId); byId[it.stableId] = it; continue; }
      var a = Number(it.updatedAt || it.ts || 0);
      var b = Number(cur.updatedAt || cur.ts || 0);
      if (a >= b) byId[it.stableId] = it;
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
      var store = getMediaStore();
      var key = String(payload.jobId);
      var cur = store[key] && store[key].items ? store[key].items : [];
      store[key] = {
        savedAt: Number(payload.savedAt) || new Date().getTime(),
        items: _mergeMediaItems(cur, payload.items || [])
      };
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
