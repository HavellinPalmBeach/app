'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// The main sheet, as deployed, over a fake spreadsheet that holds a cell to 50,000 characters (P1 of the desk audit,
// 2026-10-27). Shared by tests/p1-nothing-lost.test.js and browser step 115, so the vm tests and the real page drive the
// same server.
//
// The WHOLE of apps-script/main-sync.gs and saveInventory.gs is evaluated as Apps Script would evaluate it (one project, one
// global scope), over stubs for the services they touch at load. The fake sheet keeps rows of cells with 1-based ranges, a
// header row, and the cell cap: setValues validates the whole range before writing any of it, as Apps Script does, and
// throws the Sheets error on a cell over 50,000 characters.
//
// `variant` 'A' or 'B' is the one thing nobody outside Google can say (the editor-only probe asks it): when a setValues
// throws, does a clearContent run earlier in the same execution STAY (A) or roll back with it (B)? Each request is one
// execution, checkpointed, and B restores the checkpoint on the throw.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
const GS_INV = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'saveInventory.gs'), 'utf8');
const CELL_MAX = 50000;
const CELL_ERR = 'Exception: Your input contains more than the maximum of 50000 characters in a single cell.';
const QUIET = { log() {}, warn() {}, error() {} };

// A synchronous promise (the test runner is synchronous), unwrapping a returned thenable like a real one.
function mk() {
  let state = 'pending', value;
  const queue = [];
  const settle = (st, v) => { if (state !== 'pending') return; state = st; value = v; queue.splice(0).forEach((f) => f()); };
  const self = {
    then(onOk, onErr) {
      const nxt = mk();
      const run = () => {
        try {
          const h = state === 'ok' ? onOk : onErr;
          if (!h) { (state === 'ok' ? nxt.resolve : nxt.reject)(value); return; }
          const out = h(value);
          if (out && typeof out.then === 'function') out.then(nxt.resolve, nxt.reject); else nxt.resolve(out);
        } catch (e) { nxt.reject(e); }
      };
      if (state === 'pending') queue.push(run); else run();
      return nxt.promise;
    },
    catch(onErr) { return self.then(null, onErr); },
  };
  return { promise: self, resolve: (v) => settle('ok', v), reject: (e) => settle('err', e) };
}
const SP = { resolve: (v) => { const d = mk(); d.resolve(v); return d.promise; }, reject: (e) => { const d = mk(); d.reject(e); return d.promise; } };

function fakeSheet(name, header, srv) {
  const rows = header ? [header.slice()] : [];
  const cap = (cell) => { if (String(cell).length > CELL_MAX) { srv.cellThrows++; srv.onThrow(); throw new Error(CELL_ERR); } };
  return {
    getName: () => name,
    _rows: rows,
    // A real sheet's last row is the last row with content in it.
    getLastRow: () => { let n = rows.length; while (n > 1 && rows[n - 1].every((x) => x === '' || x === undefined)) n--; return n; },
    getLastColumn: () => rows.reduce((m, r) => Math.max(m, r.length), 0),
    appendRow(r) { r.forEach(cap); rows.push(r.slice()); },
    deleteRow(n) { rows.splice(n - 1, 1); },
    deleteRows(n, k) { rows.splice(n - 1, k); },
    getDataRange() { return { getValues: () => rows.map((r) => r.slice()) }; },
    getRange(r, c, nr, nc) {
      return {
        getValues() {
          const out = [];
          for (let i = 0; i < nr; i++) { const row = rows[r - 1 + i] || []; const cells = []; for (let j = 0; j < nc; j++) cells.push(row[c - 1 + j] === undefined ? '' : row[c - 1 + j]); out.push(cells); }
          return out;
        },
        setValues(v) {
          if (srv.failNext && srv.failNext(name)) throw new Error('Service Spreadsheets timed out while accessing document');
          v.forEach((cells) => cells.forEach(cap));
          v.forEach((cells, i) => { while (rows.length < r + i) rows.push([]); const row = rows[r - 1 + i]; cells.forEach((cell, j) => { row[c - 1 + j] = cell; }); });
        },
        clearContent() {
          if (srv.failClear && srv.failClear(name)) throw new Error('Service Spreadsheets timed out while accessing document');
          srv.clears.push(name + ' rows ' + r + '..' + (r + nr - 1));
          for (let i = 0; i < nr; i++) { const row = rows[r - 1 + i]; if (!row) continue; for (let j = 0; j < nc; j++) row[c - 1 + j] = ''; }
        },
      };
    },
  };
}

function server(variant) {
  const sheets = {}, log = [];
  const srv = {
    console: QUIET,
    Logger: { log: (s) => log.push(String(s)) },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock() { return true; }, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: 'application/json' }, createTextOutput: (t) => ({ setMimeType: () => ({ __text: t }) }) },
    SpreadsheetApp: {
      openById: () => ({ getName: () => 'fake', getSheetByName: (n) => sheets[n] || null, insertSheet(n) { sheets[n] = fakeSheet(n, null, srv); return sheets[n]; } }),
      flush() {},
    },
    DriveApp: {}, PropertiesService: {}, CacheService: {}, UrlFetchApp: {}, Utilities: {}, Session: {},
    sheets, log, clears: [], cellThrows: 0, variant: variant || 'A', checkpoint: null, failNext: null, failClear: null,
    onThrow() {
      if (srv.variant !== 'B' || !srv.checkpoint) return;
      Object.keys(sheets).forEach((n) => { const s = srv.checkpoint[n]; const rows = sheets[n]._rows; rows.splice(0, rows.length, ...(s ? s.map((r) => r.slice()) : [])); });
    },
  };
  vm.createContext(srv);
  vm.runInContext(GS + '\n\n' + GS_INV, srv, { filename: 'apps-script (whole)' });
  // One HTTP request is one execution: checkpoint the sheets so variant B can roll it back.
  srv.exec = (kind, e) => {
    srv.checkpoint = {};
    Object.keys(sheets).forEach((n) => { srv.checkpoint[n] = sheets[n]._rows.map((r) => r.slice()); });
    const out = kind === 'POST' ? srv.doPost(e) : srv.doGet(e);
    srv.checkpoint = null;
    return out.__text;
  };
  srv.post = (o) => JSON.parse(srv.exec('POST', { postData: { contents: JSON.stringify(o) } }));
  srv.get = (q) => JSON.parse(srv.exec('GET', { parameter: q }));
  srv.jobsRows = () => (sheets.Jobs ? sheets.Jobs.getLastRow() - 1 : 0);
  srv.jobIds = () => (sheets.Jobs ? sheets.Jobs._rows.slice(1).filter((r) => r[11]).map((r) => String(r[0])) : []);
  srv.rowOf = (id) => (sheets.Jobs ? (sheets.Jobs._rows.slice(1).find((r) => String(r[0]) === String(id)) || null) : null);
  srv.store = (n) => { try { return srv._readStoreBlob(n, null); } catch (e) { return 'UNREADABLE'; } };
  srv.keys = (n) => { const s = srv.store(n); if (!s || s === 'UNREADABLE') return []; return Array.isArray(s) ? s.map((c) => String(c.jobId)) : Object.keys(s); };
  srv.ledger = () => srv._readStoreBlob('JobLedger', null);
  srv.state = () => ({ jobs: srv.jobsRows(), est: srv.keys('EstimateStore').length, plan: srv.keys('JobPlanStore').length, log: srv.keys('LogStore').length,
    media: srv.keys('MediaStore').length, co: srv.keys('ChangeOrderStore').length });
  return srv;
}

module.exports = { server, fakeSheet, mk, SP, CELL_MAX, CELL_ERR, GS, GS_INV };
