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

// Match the app's category/disposition labels exactly (used for Summary rollups).
var INV_CATEGORIES_GS   = ['Art & Décor','Collectibles','Electronics & Appliances','Furniture','General/Household','Jewelry & Watches'];
var INV_DISPOSITIONS_GS = ['Keep','Sell','Donate','Junk','Hold'];

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

  put(12,1,'ESTATE TOTALS'); bold(12,1);
  put(13,1,'Total Items');              sh.getRange(13,2).setFormula('=COUNTIF(Inventory!B2:B,">0")');
  put(14,1,'Total Estimated FMV');      sh.getRange(14,2).setFormula('=SUM(Inventory!L2:L)').setNumberFormat('$#,##0');
  put(15,1,'Items Awaiting Valuation'); sh.getRange(15,2).setFormula('=COUNTIFS(Inventory!B2:B,">0",Inventory!L2:L,"")');

  put(17,1,'FLAGS'); bold(17,1);
  put(18,1,'Exempt §732.402');   sh.getRange(18,2).setFormula('=COUNTIF(Inventory!P2:P,"Yes")');
  put(19,1,'Specific Bequests'); sh.getRange(19,2).setFormula('=COUNTIF(Inventory!Q2:Q,"Yes")');
  put(20,1,'Disputed / Hold');   sh.getRange(20,2).setFormula('=COUNTIF(Inventory!R2:R,"Yes")+COUNTIF(Inventory!F2:F,"Hold")');

  put(22,1,'PROCEEDS (reconciliation)'); bold(22,1);
  put(23,1,'Gross');         sh.getRange(23,2).setFormula('=SUM(Inventory!V2:V)').setNumberFormat('$#,##0');
  put(24,1,'Fees');          sh.getRange(24,2).setFormula('=SUM(Inventory!W2:W)').setNumberFormat('$#,##0');
  put(25,1,'Net to Estate'); sh.getRange(25,2).setFormula('=SUM(Inventory!X2:X)').setNumberFormat('$#,##0');

  put(2,4,'FMV BY CATEGORY'); bold(2,4);
  put(2,5,'FMV'); put(2,6,'Count');
  for (var i = 0; i < INV_CATEGORIES_GS.length; i++) {
    var rr = 3 + i, cat = INV_CATEGORIES_GS[i];
    put(rr,4,cat);
    sh.getRange(rr,5).setFormula('=SUMIF(Inventory!E2:E,"' + cat + '",Inventory!L2:L)').setNumberFormat('$#,##0');
    sh.getRange(rr,6).setFormula('=COUNTIF(Inventory!E2:E,"' + cat + '")');
  }

  put(11,4,'DISPOSITION'); bold(11,4); put(11,5,'Count');
  for (var j = 0; j < INV_DISPOSITIONS_GS.length; j++) {
    var dr = 12 + j, disp = INV_DISPOSITIONS_GS[j];
    put(dr,4,disp);
    sh.getRange(dr,5).setFormula('=COUNTIF(Inventory!F2:F,"' + disp + '")');
  }

  put(19,4,'Tangible personal property only. The §733.604 court inventory (real property, accounts, securities, business interests) is the PR’s filing, prepared with counsel.');
  sh.autoResizeColumns(1, 6);
}
