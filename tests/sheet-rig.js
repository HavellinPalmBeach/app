'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// The main sheet, as deployed, over a fake spreadsheet that refuses a cell over 50,000 characters (P1 of the desk audit,
// 2026-10-27). Shared by tests/p1-nothing-lost.test.js, tests/p6-two-devices.test.js, tests/deferred-writes.test.js and browser
// step 117, so the vm tests and the real page drive the same server.
//
// The WHOLE of apps-script/main-sync.gs and saveInventory.gs is evaluated as Apps Script would evaluate it (one project, one
// global scope), over stubs for the services they touch at load. The fake sheet keeps rows of cells with 1-based ranges and a
// header row.
//
// ⚠⚠ WHAT SHEETS DOES WITH A WRITE (probeClearThenOversizeWrite, run by Anthony in the editor on 2026-10-28: DEFERRED). Variant
// 'D' (the default since 2026-10-28) is what Sheets does: writes are queued and applied in order at a flush, a read or the end of
// the request; the refused cell and everything after it are not written, and the error is raised there, never at the call. 'DE'
// empties the refused cell where 'D' keeps it, since the probe could not tell which (its cell had been cleared first). 'A' and
// 'B' throw at the call and write nothing of the range (B also rolls back the request's clears): no deployment does either, and
// they are kept only for the tests built on them.
//
// The deferred model, piece by piece (variants D and DE):
//   · each srv.exec (one HTTP request) and each srv.run (one editor run) is an execution with its own write queue: setValues,
//     clearContent, appendRow and deleteRow(s) go into it, never onto the sheet at the call;
//   · the queue is applied at SpreadsheetApp.flush(), at any read (getLastRow, getLastColumn, getValues: the default,
//     opt.reads 'flush'), and after doPost or doGet returns; with opt.reads 'none' a read does not flush (the worst case: a read
//     sees only what is committed);
//   · it is applied write by write, row by row, cell by cell, the cap checked per cell: at a refused cell D leaves the cell as it
//     was, DE empties it, the rest of the queue is dropped, and the error is raised by whatever applied it (flush(), the read, or
//     the end of the request, where it goes to srv.lateErr: the answer stays what doPost returned, or an error page with
//     opt.end 'html', since whether the web app still delivers that answer is not known);
//   · srv.failNext(name) and srv.failClear(name) fail a write when it is applied (a timeout at commit), not at the call;
//   · another execution never sees a queue not yet applied: srv.onRelease(fn) runs fn (another request, with its own queue)
//     inside the next releaseLock, which is where Google's own Lock reference says a flush belongs;
//   · srv.locks counts the lock acquisitions (waitLock, tryLock) of every execution;
//   · opt.typed models what setValues does with a string as typed: a cell starting with = reads back #ERROR!, a leading ' is
//     dropped as the text prefix, and a lone half of a surrogate pair reads back as U+FFFD (S2, 2026-10-28).
// A call made outside srv.exec and srv.run (a test seeding the sheet, or calling an editor function directly) is applied at once.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
const GS_INV = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'saveInventory.gs'), 'utf8');
// The deployment live until the redeploy, as it stood at 7abc836 (2026-10-26c; the job ledger is the same on every deployment
// older than 2026-10-27b): its batch clears the Jobs tab before the write, an id seen and absent is deleted, and a store save
// sweeps such an id once the tab holds any client. Kept as a fixture, never deployed, so the app is driven against the server
// it meets until Anthony redeploys (P1's review, 2026-10-27). server(variant, OLD) evaluates it.
const OLD = {
  GS: fs.readFileSync(path.join(__dirname, 'old-backend', 'main-sync.7abc836.gs'), 'utf8'),
  GS_INV: fs.readFileSync(path.join(__dirname, 'old-backend', 'saveInventory.7abc836.gs'), 'utf8'),
};
const CELL_MAX = 50000;
const CELL_ERR = 'Exception: Your input contains more than the maximum of 50000 characters in a single cell.';
const TIMEOUT_ERR = 'Exception: Service Spreadsheets timed out while accessing document';
// An error as Apps Script raises one: String(e) is 'Exception: …', as the probe logged it.
const sheetsError = (text) => { const e = new Error(String(text).replace(/^Exception: /, '')); e.name = 'Exception'; return e; };
const QUIET = { log() {}, warn() {}, error() {} };
const VARIANTS = ['A', 'B', 'D', 'DE'];

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

// What a string reads back as once Sheets has taken it as typed (opt.typed): =… is a formula, and a 45,000-character one is an
// error; a leading ' is the text prefix and is not part of the value; a lone half of a surrogate pair is not text.
function typedCell(cell) {
  if (typeof cell !== 'string' || !cell) return cell;
  if (cell.charAt(0) === '=') return '#ERROR!';
  let s = cell.charAt(0) === "'" ? cell.slice(1) : cell;
  let out = '', bad = false;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xD800 && c <= 0xDBFF) {
      const d = s.charCodeAt(i + 1);
      if (d >= 0xDC00 && d <= 0xDFFF) { out += s.charAt(i) + s.charAt(i + 1); i++; continue; }
      out += String.fromCharCode(0xFFFD); bad = true; continue;
    }
    if (c >= 0xDC00 && c <= 0xDFFF) { out += String.fromCharCode(0xFFFD); bad = true; continue; }
    out += s.charAt(i);
  }
  return bad ? out : s;
}

function fakeSheet(name, header, srv) {
  const rows = header ? [header.slice()] : [];
  const cap = (cell) => { if (String(cell).length > CELL_MAX) { srv.cellThrows++; srv.onThrow(); throw sheetsError(CELL_ERR); } };
  const put = (cell) => (srv.opt.typed ? typedCell(cell) : cell);
  // One cell of a deferred write, as Sheets applies it: refused over the cap (D leaves the cell, DE empties it), else written.
  const cellD = (row, j, cell) => {
    if (String(cell).length > CELL_MAX) { srv.cellThrows++; if (srv.variant === 'DE') row[j] = ''; throw sheetsError(CELL_ERR); }
    row[j] = put(cell);
  };
  return {
    getName: () => name,
    _rows: rows,
    // A real sheet's last row is the last row with content in it.
    getLastRow: () => { srv.rf(); let n = rows.length; while (n > 1 && rows[n - 1].every((x) => x === '' || x === undefined)) n--; return n; },
    getLastColumn: () => { srv.rf(); return rows.reduce((m, r) => Math.max(m, r.length), 0); },
    appendRow(r) {
      if (srv.deferred) { const cp = r.slice(); srv.write(() => { rows.push([]); const row = rows[rows.length - 1]; cp.forEach((cell, j) => cellD(row, j, cell)); }); return; }
      r.forEach(cap); rows.push(r.slice());
    },
    deleteRow(n) { if (srv.deferred) { srv.write(() => { rows.splice(n - 1, 1); }); return; } rows.splice(n - 1, 1); },
    deleteRows(n, k) { if (srv.deferred) { srv.write(() => { rows.splice(n - 1, k); }); return; } rows.splice(n - 1, k); },
    getDataRange() { return { getValues: () => { srv.rf(); return rows.map((r) => r.slice()); } }; },
    getRange(r, c, nr, nc) {
      return {
        getValues() {
          srv.rf();
          const out = [];
          for (let i = 0; i < nr; i++) { const row = rows[r - 1 + i] || []; const cells = []; for (let j = 0; j < nc; j++) cells.push(row[c - 1 + j] === undefined ? '' : row[c - 1 + j]); out.push(cells); }
          return out;
        },
        setValues(v) {
          if (srv.deferred) {
            const vals = v.map((cells) => cells.slice());
            srv.write(() => {
              if (srv.failNext && srv.failNext(name)) throw sheetsError(TIMEOUT_ERR);
              vals.forEach((cells, i) => { while (rows.length < r + i) rows.push([]); const row = rows[r - 1 + i]; cells.forEach((cell, j) => cellD(row, c - 1 + j, cell)); });
            });
            return;
          }
          if (srv.failNext && srv.failNext(name)) throw sheetsError(TIMEOUT_ERR);
          v.forEach((cells) => cells.forEach(cap));
          v.forEach((cells, i) => { while (rows.length < r + i) rows.push([]); const row = rows[r - 1 + i]; cells.forEach((cell, j) => { row[c - 1 + j] = put(cell); }); });
        },
        clearContent() {
          const clear = () => {
            if (srv.failClear && srv.failClear(name)) throw sheetsError(TIMEOUT_ERR);
            srv.clears.push(name + ' rows ' + r + '..' + (r + nr - 1));
            for (let i = 0; i < nr; i++) { const row = rows[r - 1 + i]; if (!row) continue; for (let j = 0; j < nc; j++) row[c - 1 + j] = ''; }
          };
          if (srv.deferred) { srv.write(clear); return; }
          clear();
        },
      };
    },
  };
}

// server(variant, src, opt): variant 'D' (the default), 'DE', 'A' or 'B'; src OLD for the deployment live until the redeploy;
// opt { reads: 'flush' | 'none', end: 'html', typed: true }.
function server(variant, src, opt) {
  const V = variant || 'D';
  if (VARIANTS.indexOf(V) < 0) throw new Error('sheet-rig: no variant ' + V);
  const sheets = {}, log = [];
  const srv = {
    console: QUIET,
    Logger: { log: (s) => log.push(String(s)) },
    LockService: { getScriptLock: () => ({
      waitLock() { srv.locks++; }, tryLock() { srv.locks++; return true; },
      // Another request waiting on the lock gets it here (srv.onRelease), before this execution's own queue is applied unless it
      // flushed first.
      releaseLock() { const f = srv._onRelease.shift(); if (f) f(); } }) },
    ContentService: { MimeType: { JSON: 'application/json' }, createTextOutput: (t) => ({ setMimeType: () => ({ __text: t }) }) },
    SpreadsheetApp: {
      openById: () => ({ getName: () => 'fake', getSheetByName: (n) => sheets[n] || null, insertSheet(n) { sheets[n] = fakeSheet(n, null, srv); return sheets[n]; } }),
      flush() { srv.applyNow(); },
    },
    // Script Properties hold nothing unless a test sets one (srv.props): the device key's check is off (P2, merged 2026-10-27), as
    // on the deployment until Anthony sets HAVELLIN_DEVICE_KEY. An object with no getScriptProperties made every request fail.
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (Object.prototype.hasOwnProperty.call(srv.props, k) ? srv.props[k] : null),
      setProperty: (k, v) => { srv.props[k] = String(v); }, deleteProperty: (k) => { delete srv.props[k]; } }) },
    DriveApp: {}, CacheService: {}, UrlFetchApp: {}, Utilities: {}, Session: {}, props: {},
    sheets, log, clears: [], cellThrows: 0, variant: V, deferred: V === 'D' || V === 'DE', opt: opt || {},
    checkpoint: null, failNext: null, failClear: null,
    locks: 0, lateErr: null, lateErrs: [], _onRelease: [], _execs: [],
    onThrow() {
      if (srv.variant !== 'B' || !srv.checkpoint) return;
      Object.keys(sheets).forEach((n) => { const s = srv.checkpoint[n]; const rows = sheets[n]._rows; rows.splice(0, rows.length, ...(s ? s.map((r) => r.slice()) : [])); });
    },
  };
  // The execution running now (the innermost), or null outside any.
  srv.cur = () => srv._execs[srv._execs.length - 1] || null;
  // A deferred write: queued on the execution running now, applied at once outside any.
  srv.write = (f) => { const ex = srv.cur(); if (ex) ex.q.push(f); else f(); };
  // Apply an execution's queue in order; the write that fails raises its error here, and the rest of the queue is dropped.
  srv.apply = (ex) => {
    if (!ex) return;
    const q = ex.q.splice(0);
    for (let i = 0; i < q.length; i++) {
      try { q[i](); } catch (e) { ex.dropped = (ex.dropped || 0) + q.length - i - 1; throw e; }
    }
  };
  srv.applyNow = () => { if (srv.deferred) srv.apply(srv.cur()); };
  // A read applies the reading execution's own queue first, unless opt.reads is 'none'.
  srv.rf = () => { if (srv.deferred && srv.opt.reads !== 'none') srv.apply(srv.cur()); };
  srv.onRelease = (f) => { srv._onRelease.push(f); };
  vm.createContext(srv);
  vm.runInContext(((src && src.GS) || GS) + '\n\n' + ((src && src.GS_INV) || GS_INV), srv, { filename: 'apps-script (whole)' });
  // One execution: its own queue, applied when it ends (an error there goes to srv.lateErr).
  const execution = (body) => {
    const ex = { q: [] };
    srv._execs.push(ex);
    let out, late = null;
    try { out = body(); }
    finally {
      if (srv.deferred) { try { srv.apply(ex); } catch (err) { late = err; srv.lateErr = String(err); srv.lateErrs.push(String(err)); } }
      srv._execs.pop();
    }
    return { out, late };
  };
  // One HTTP request is one execution: checkpoint the sheets so variant B can roll it back.
  srv.exec = (kind, e) => {
    const cp = {};
    Object.keys(sheets).forEach((n) => { cp[n] = sheets[n]._rows.map((r) => r.slice()); });
    const before = srv.checkpoint;
    srv.checkpoint = cp;
    let r;
    try { r = execution(() => (kind === 'POST' ? srv.doPost(e) : srv.doGet(e))); }
    finally { srv.checkpoint = before; }
    if (r.late && srv.opt.end === 'html') return '<!DOCTYPE html><html><head><title>Error</title></head><body>' + String(r.late) + '</body></html>';
    return r.out.__text;
  };
  // One editor run (an editor-only function, the Run menu): its own queue, applied when it ends. Answers what the function returned.
  srv.run = (f) => execution(f).out;
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

module.exports = { server, fakeSheet, typedCell, mk, SP, CELL_MAX, CELL_ERR, TIMEOUT_ERR, GS, GS_INV, OLD, VARIANTS };
