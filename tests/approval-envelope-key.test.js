'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// ⚠⚠ THE RELEASE REQUEST'S ENVELOPE IS ITS OWN RECORD (2026-11-02; Anthony chose the fix of the 2026-10-26c finding).
// Until then the envelope an estate's release request went out in lived inside the request's record
// (`docState.approvalRequest.req.envelope`), and the sheet merges docState one key at a time on that key's stamp. So a device
// holding the morning's copy of the client could send a request by email, tap I've sent it on an older draft or press Discard
// draft, and its stamped approvalRequest won the merge: the envelope was gone from every device, the lines it carried read as
// never asked for, and nothing recorded the trustees' signatures once DocuSign said they had all signed. The other way round, a
// completion recorded on a stale copy stamped the request's key too and put back the request before the newest one.
//   · The envelope is `docState['approvalEnv:<envelopeId>']` (APPROVAL_ENV_PREFIX), carrying the lines and terms it went with;
//     the request holds only its id (`req.envelopeId`), so the paper is stored once and read through approvalReqView.
//   · Completion, the lines applied and the copy filed stamp only the envelope's key; a pending check stamps nothing.
//   · The signed copy's link is read off its durable esr_ records too (approvalEnvelopeFiledUrl), so a filing that loses the
//     envelope's key to an apply on another device still reads as filed.
//   · On an estate the send reads the client from the sheet first (approvalRecordFromSheet, then approvalRecordAdopt, the
//     sheet's own per-key rule) and refuses by name past an envelope another device sent.
// Two devices, each the real app lifted by closure, write to one fake Jobs tab that runs the real saveAllJobsToSheet,
// saveJobToSheet, getJobsFromSheet and _mergeJobRecord from main-sync.gs; what a device reads back comes through the app's own
// load path (loadJobsVerdict, refreshJobsFromCloud and _mergeCloudJobs). The server's refusals are p2-device-key.test.js's.
// ─────────────────────────────────────────────────────────────────────────────
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { sandbox, source, fn, decl, domStub, matchBrace } = require('./harness');

const SRC = source();
// Where each top-level function and var first appears in the source, found in one pass: the harness's fn() and decl() search
// the whole 4 MB file for each name, and a device here lifts several hundred functions. The text lifted is the same (the first
// declaration, its body closed by the harness's own matchBrace; a var through decl itself), and each is read once.
const FN_AT = new Map(), VAR_AT = new Map();
for (const m of SRC.matchAll(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g)) if (!FN_AT.has(m[2])) FN_AT.set(m[2], { at: m.index + m[1].length, end: m.index + m[0].length });
for (const m of SRC.matchAll(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g)) if (!VAR_AT.has(m[2])) VAR_AT.set(m[2], m.index + m[1].length);
const ALL_FNS = new Set(FN_AT.keys()), ALL_VARS = new Set(VAR_AT.keys());
const _fnText = {}, _varText = {};
function fnText(name) {
  if (_fnText[name] !== undefined) return _fnText[name];
  const p = FN_AT.get(name);
  if (!p) return fn(name);   // the harness's own error, by name
  const close = matchBrace(SRC, SRC.indexOf('{', p.end));
  if (close === -1) return fn(name);
  return (_fnText[name] = SRC.slice(p.at, close + 1));
}
function varText(name) { return _varText[name] !== undefined ? _varText[name] : (_varText[name] = decl(name)); }
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
const noComments = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
const _closures = {};
function closure(roots, stop) {
  const memo = JSON.stringify([roots, stop]);
  if (_closures[memo]) return _closures[memo];
  const stopSet = new Set(stop || []);
  const fns = new Set(), vars = new Set();
  const queue = roots.map((r) => ['f', r]);
  while (queue.length) {
    const [k, name] = queue.shift();
    if (stopSet.has(name)) continue;
    let body;
    if (k === 'f') { if (fns.has(name)) continue; fns.add(name); try { body = codeOnly(fnText(name)); } catch (e) { continue; } }
    else { if (vars.has(name)) continue; vars.add(name); try { body = codeOnly(varText(name)); } catch (e) { continue; } }
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/[(,]\s*([A-Za-z_$][\w$]*)\s*[,)]/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) if (ALL_VARS.has(m[1]) && !stopSet.has(m[1])) queue.push(['v', m[1]]);
  }
  // The vars in source order, as the harness's sandbox() emits them (several are built from earlier ones).
  const ordered = [...vars].sort((a, b) => VAR_AT.get(a) - VAR_AT.get(b));
  return (_closures[memo] = { fns: [...fns], vars: ordered, code: ordered.map(varText).concat([...fns].map(fnText)).join('\n\n') });
}
// The harness's context (its localStorage, esc and the rest) with the lifted code run in it. Roots the source no longer holds
// are left out, so a build without one fails its assertions rather than the whole rig.
function lift(roots, stop, stubs) {
  const c = closure(roots.filter((n) => ALL_FNS.has(n)), (stop || []).concat(Object.keys(stubs || {})));
  const ctx = sandbox({ stubs: stubs || {} });
  vm.runInContext(c.code, ctx, { filename: 'havellin.html (extracted)' });
  return ctx;
}
// A call that may throw on a build without the change: it must fail its assertions, not end the group.
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }
const inEastern = (body) => { const prev = process.env.TZ; process.env.TZ = 'America/New_York'; try { return body(); } finally { process.env.TZ = prev; } };
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

// A synchronous, already-settled promise (the runner is synchronous).
function sp(v) {
  if (v && v.__sync) return v;
  return { __sync: true,
    then(f) { try { return sp(f ? f(v) : v); } catch (e) { return sr(e); } },
    catch() { return this; }, finally(f) { if (f) f(); return this; } };
}
function sr(e) {
  return { __sync: true,
    then(f, g) { if (!g) return this; try { return sp(g(e)); } catch (e2) { return sr(e2); } },
    catch(h) { try { return sp(h(e)); } catch (e2) { return sr(e2); } }, finally(f) { if (f) f(); return this; } };
}
const res = (obj, status) => ({ ok: (status || 200) < 300, status: status || 200, json: () => sp(obj), text: () => sp(JSON.stringify(obj)) });

// ── The Jobs tab: the real save and load paths from main-sync.gs on an in-memory sheet (job-record-merge.test.js's) ──
const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
function gsFn(name) {
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(GS);
  if (!m) throw new Error('not in .gs: ' + name);
  const start = m.index + (m[1] ? m[1].length : 0);
  const close = matchBrace(GS, GS.indexOf('{', re.lastIndex));
  if (close === -1) throw new Error('unbalanced: ' + name);
  return GS.slice(start, close + 1);
}
function gsVar(name) {
  const m = GS.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[^;]*;)'));
  if (!m) throw new Error('not in .gs: var ' + name);
  return m[2];
}
function fakeSheet(name, header) {
  const rows = header ? [header.slice()] : [];
  return {
    getName: () => name, _rows: rows,
    getLastRow: () => rows.length,
    getLastColumn: () => rows.reduce((m, r) => Math.max(m, r.length), 0),
    appendRow(r) { rows.push(r.slice()); },
    getDataRange() { return { getValues: () => rows.map((r) => r.slice()) }; },
    getRange(r, c, nr, nc) {
      return {
        getValues() {
          const out = [];
          for (let i = 0; i < nr; i++) {
            const row = rows[r - 1 + i] || [], cells = [];
            for (let j = 0; j < nc; j++) cells.push(row[c - 1 + j] === undefined ? '' : row[c - 1 + j]);
            out.push(cells);
          }
          return out;
        },
        setValues(v) {
          v.forEach((cells, i) => {
            while (rows.length < r + i) rows.push([]);
            const row = rows[r - 1 + i];
            cells.forEach((cell, j) => { row[c - 1 + j] = cell; });
          });
        },
        clearContent() {
          for (let i = 0; i < nr; i++) {
            const row = rows[r - 1 + i];
            if (!row) continue;
            for (let j = 0; j < nc; j++) row[c - 1 + j] = '';
          }
          while (rows.length > 1 && rows[rows.length - 1].every((x) => x === '' || x === undefined)) rows.pop();
        },
      };
    },
  };
}
const HDR = ['ID', 'HVL ID', 'Name', 'Email', 'Phone', 'Address', 'City', 'Zip', 'Service', 'Status', 'Created', 'Data JSON'];
const GS_NAMES = ['getJobsFromSheet', 'saveAllJobsToSheet', 'saveJobToSheet', '_jobStamp', '_jobListKey', '_mergeJobKeyed', '_mergeJobRecord',
  '_paymentSticky', '_lockOrBusy', '_jobsTabUnread', '_recordedDeletes', '_jobDeletionRecorded', '_jobRowOf', '_jobRowTooLarge', '_commas'];
function sheetOf(seed) {
  const sheets = { Jobs: fakeSheet('Jobs', HDR) };
  const ctx = {
    console, Logger: { log() {} }, Date,
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock() { return true; }, releaseLock() {} }) },
    SpreadsheetApp: { flush() {}, openById: () => ({ getSheetByName: (n) => sheets[n] || null, insertSheet(n) { sheets[n] = fakeSheet(n); return sheets[n]; } }) },
    // The job ledger and the deleted-job refusal have their own suites; out of the way, so a failure here is about the merge.
    _jobRefusal: () => null, _presentJobIds: () => ({}), getJobLedger: () => ({ seen: {}, since: 0 }), _ledgerMarkSeen: () => {},
  };
  vm.createContext(ctx);
  vm.runInContext([gsVar('SHEET_ID'), gsVar('SHEET_CELL_MAX'), gsVar('JOB_KEYED_LISTS'), gsVar('JOB_KEYED_MAPS'), gsVar('JOB_LIST_KEY'),
    gsVar('JOB_PAYMENT_STICKY'), ...GS_NAMES.map(gsFn)].join('\n\n'), ctx, { filename: 'main-sync.gs (extracted)' });
  ctx.saveAllJobsToSheet(clone(seed || []));
  const S = {
    gs: ctx, posts: [],
    // The loadJobs answer (doGet), as the app reads it.
    loadJobs: () => clone({ ok: true, success: true, jobs: ctx.getJobsFromSheet(), deletedJobs: [], recorded: [] }),
    job: (id) => clone(ctx.getJobsFromSheet().filter((j) => j && String(j.id) === String(id))[0] || null),
    // One write as doPost routes it: 'job' (syncJobToSheets) to saveJobToSheet, 'saveAllJobs' (saveJobs) to saveAllJobsToSheet.
    post(body) {
      const p = clone(body.payload);
      S.posts.push(body.type);
      if (body.type === 'job') ctx.saveJobToSheet(p);
      else if (body.type === 'saveAllJobs') ctx.saveAllJobsToSheet(p);
      else throw new Error('the sheet was sent ' + body.type);
    },
  };
  return S;
}

// ── The fake network for everything else: the Apps Script /exec, Google's userinfo and Gmail's drafts ──
const SYNC = 'https://script.google.com/macros/s/APPROVALENVKEY/exec';
const BOX = 'anthony@havellinpalmbeach.com';
function net(opts) {
  const o = Object.assign({ media: null }, opts || {});
  const log = { posts: [], uploads: [], pdfs: [], drafts: [], gets: [], esign: [], status: [], archive: [] };
  let n = 0;
  const fetch = (url, init) => {
    const u = String(url);
    if (init && init.method === 'POST' && u.indexOf(SYNC) === 0) {
      const body = JSON.parse(init.body || '{}');
      log.posts.push(body.action || body.type);
      if (body.action === 'uploadHtml') {
        n++;
        log.uploads.push({ filename: body.filename });
        return sp(res({ ok: true, fileUrl: 'https://drive.google.com/file/d/up' + n + '/view', fileId: 'up' + n }));
      }
      if (body.action === 'getSubfolders') return sp(res({ ok: true, subfolders: null }));
      if (body.action === 'esignSendRequest') {
        log.esign.push(body);
        return sp(res(o.esignSend || { ok: true, envelopeId: 'env-r1', status: 'sent',
          signers: (body.signers || []).map((s, i) => ({ name: s.name, email: s.email, recipientId: String(i + 1), n: i + 1 })) }));
      }
      if (body.action === 'esignStatus') {
        log.status.push(body);
        return sp(res(typeof o.esignStatus === 'function' ? o.esignStatus(body) : (o.esignStatus || { ok: true, envelopeId: body.envelopeId, status: 'sent', signers: [] })));
      }
      if (body.action === 'esignArchive') {
        log.archive.push(body);
        return sp(res(o.esignArchive || { ok: true, signedUrl: 'https://drive.google.com/file/d/signed1/view', signedId: 'signed1', certUrl: 'https://drive.google.com/file/d/cert1/view' }));
      }
      if (body.action === 'htmlToPdf') {
        log.pdfs.push(body.html);
        return sp(res({ ok: true, base64: Buffer.from('%PDF-1.4 ' + 'x'.repeat(150) + ' #' + log.pdfs.length).toString('base64') }));
      }
      return sp(res({ ok: true }));
    }
    if (u.indexOf(SYNC) === 0) {
      log.gets.push(u);
      if (/action=loadMedia/.test(u)) return sp(res(o.media ? { ok: true, media: o.media } : { ok: false, error: 'offline' }));
      return sp(res({ ok: false }));
    }
    if (u === 'https://www.googleapis.com/oauth2/v3/userinfo') return sp(res({ email: BOX }));
    if (u === 'https://gmail.googleapis.com/gmail/v1/users/me/drafts') {
      log.drafts.push(init.body);
      return sp(res({ id: 'r-' + log.drafts.length, message: { id: 'm-' + log.drafts.length } }));
    }
    return sr(new TypeError('Failed to fetch ' + u));
  };
  return { fetch, log, opts: o };
}
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&middot;/g, '·').replace(/&rsquo;/g, '’')
  .replace(/&mdash;/g, '—').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

// ── Fixtures: the Ellison trust, two trustees with emails (approval-esign.test.js's) ──
const NOW = Date.parse('2026-10-17T15:00:00Z');   // Oct 17, 11:00 Eastern
const T0 = Date.parse('2026-10-10T15:00:00Z');
const MIN = 60000;
const FixedDate = (t) => class extends Date { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } };
const TWO = (o) => Object.assign({
  id: 7, hvlId: 'HVL-0007', name: 'Harold Brennan', svc: 'cleanout', status: 'active', won: true, approved: true,
  addr: '14 Seaspray Ave', city: 'Palm Beach', tc: 'Ashley Jerome', agrApprovedBy: 'Anthony Graziano',
  matterType: 'trust', docTier: 'values', deathDate: '2026-08-01', executorAuth: 'received',
  executor: 'Thomas Ellison', executorRole: 'Trustee', executorEmail: 'tom@ellison.example', executorPhone: '(561) 555-0101',
  coFiduciaries: [{ id: 'c1', name: 'Catherine Ellison-Reyes', role: 'Co-Trustee', email: 'cat@ellison.example', phone: '' }],
  probateAttyName: 'Ann Lowe', probateAttyFirm: 'Lowe & Co', probateAttyEmail: 'ann@lowe.law', probateAttyPhone: '(561) 555-0102',
  driveFolder: 'https://drive.google.com/drive/folders/ROOT7',
  driveSubfolders: { 'Estate Inventory': 'INV7', 'As-Found Record': 'AF7', 'Signed Records': 'SR7' },
  created: '2026-10-01T14:00:00Z', docState: { estimate: { sentAt: '2026-10-02T14:00:00Z' } }, at: {}, updatedAt: T0, payments: [],
}, o || {});
const LIVING = (o) => Object.assign({
  id: 7, hvlId: 'HVL-0007', name: 'Margaret Ellis', fname: 'Margaret', email: 'meg@ellis.example', svc: 'downsizing_move', status: 'active', won: true, approved: true,
  addr: '9 Dunbar Rd', city: 'Palm Beach', tc: 'Ashley Jerome', agrApprovedBy: 'Anthony Graziano', docTier: 'contents',
  driveFolder: 'https://drive.google.com/drive/folders/ROOT7', driveSubfolders: { 'Estate Inventory': 'INV7' },
  created: '2026-10-01T14:00:00Z', docState: {}, at: {}, updatedAt: T0, payments: [],
}, o || {});
const EST = () => ({ approved: true, estimate: { jobId: 7, svc: 'cleanout', havellinTotal: 24000, rooms: [{ idx: 1, name: 'Study', st: 'in', vol: 3, cplx: 3 }], vendors: [] } });
const ROW = (id, over) => Object.assign({
  stableId: id, label: 'inventory', collId: null, roomIdx: 1, status: 'uploaded', ts: T0, updatedAt: T0,
  objectName: 'Sideboard', category: 'Furniture', qty: 1, condition: 'Good', fmv: 1200, valSource: 'Comparable sales',
  // Checked on the desk (2026-11-02: a line still flagged for a look is not asked for, invReleaseChecked).
  reviewed: true, reviewedBy: 'Anthony Graziano',
  driveFileId: 'f' + id, driveFileUrl: 'https://drive.google.com/file/d/f' + id + '/view',
}, over || {});
// Three lines waiting on the trustees' written approval (a sale, a donation, a gift) and one kept, never on a request.
const ROWS = () => [
  ROW('a', { itemNo: 1, objectName: 'Sargent portrait', category: 'Art & Décor', fmv: 48000, valSource: 'Appraisal', disposition: 'Auction', channel: 'Christie’s' }),
  ROW('b', { itemNo: 2, objectName: 'Dining chairs (8)', qty: 8, fmv: 400, disposition: 'Donate', channel: 'Habitat ReStore' }),
  ROW('c', { itemNo: 3, objectName: 'Grandfather clock', fmv: 2500, disposition: 'Keep' }),
  ROW('d', { itemNo: 4, objectName: 'Silver tea service', fmv: 1800, disposition: 'Distribute', channel: 'Dana Hale' }),
];
const BOTH = 'Thomas Ellison; Catherine Ellison-Reyes';
// DocuSign's answer for an envelope: each signer as [recipientId, status, signedAt].
const STATUS = (envelopeId, status, rows) => ({ ok: true, envelopeId, status, completedAt: status === 'completed' ? '2026-10-19T15:00:00Z' : '',
  signers: rows.map(([id, st, at]) => ({ recipientId: id, name: id === '1' ? 'Thomas Ellison' : 'Catherine Ellison-Reyes', email: '', status: st, signedAt: at || '', declinedReason: '' })) });
const SIGNED = (id) => STATUS(id, 'completed', [['1', 'completed', '2026-10-18T14:00:00Z'], ['2', 'completed', '2026-10-19T15:00:00Z']]);
const ENV = (id) => 'approvalEnv:' + id;
const OUT_TXT = 'A request is out for signature in DocuSign';
const READ_FAIL_TXT = 'The client could not be read from the sheet';

// The app on one device: the send, the card, the arrival checks and the load path, lifted by closure from the real code, with
// the boundaries stubbed by name. Every save goes into this device's outbox, as the real queue holds it, and reaches the sheet
// only when the test lands it (`land`), so the order two devices' writes arrive in is the test's to choose.
const ROOTS = ['sendApprovalRequest', 'sendApprovalRequestEsign', 'invMarkRequestSent', 'discardApprovalRequestDraft', 'markDocSent',
  '_renderInvReleasesCard', '_jobInvRefs', 'printApprovalRequest', '_invAwaitingApproval', 'draftOutstanding',
  'approvalRequestState', 'approvalRequestChanged', 'approvalRequestOvertaken', 'approvalRequestLastSent', 'invApprovalDateEarly',
  'approvalRequestSendBlocker', 'approvalRequestEsignRefusal', 'approvalEnvelopeBlocking', 'approvalEnvelopeFiledUrl', 'approvalEnvelopes',
  'approvalEnvelopeRefresh', 'approvalEnvelopeCheckNow', 'approvalEnvelopeFile', 'approvalEnvelopeApply', 'approvalEnvelopeRecords',
  'approvalRecordFromSheet', 'approvalRecordAdopt', 'invRecordApproval', 'invRecordRequestApproval', 'invApprovalComplete',
  'refreshJobsFromCloud', 'loadJobsVerdict', '_mergeCloudJobs', 'saveJobs', 'syncJobToSheets', 'refreshPhotoRefs',
  'approvalRequestRecordRefusal', 'approvalRequestDashHtml', 'deskFoldState', 'approvalEnvelopesShown'];
const STOP = ['_docNotice', '_dashSendState', 'showSyncBadge', 'dashNotice', '_dashRedraw', 'gmailAuth', 'savePhotoRefs', '_primeAgreementFor',
  '_primeEstimateFor', 'markAgreementSent', 'markEstimateSent', 'loadPhotoRefs', '_printDocument'];
function device(sheet, o) {
  o = o || {};
  const rows = o.rows || ROWS();
  const N = net({ media: { 7: { items: clone(rows) } } });
  const outbox = [], posted = [], notices = [], badges = [], alerts = [], H = { loadJobs: 0, read: o.read || 'sheet' };
  const fetch = (u, init) => {
    const s = String(u);
    // `o.onPost(what, r)`: a test's hook as a write leaves this device, before it is answered (the Apps Script's action, or
    // 'gmailDraft'), so a refresh of the client list can land in the middle of a send, as the real one can.
    if (o.onPost && init && init.method === 'POST') {
      let what = '';
      if (s.indexOf(SYNC) === 0) { try { const b = JSON.parse(init.body || '{}'); what = b.action || b.type || ''; } catch (e) {} }
      else if (/gmail\/v1\/users\/me\/drafts/.test(s)) what = 'gmailDraft';
      o.onPost(what, r);
    }
    if (!(init && init.method === 'POST') && s.indexOf(SYNC) === 0 && /action=loadJobs/.test(s)) {
      H.loadJobs++;
      if (H.read === 'fail') return sr(new TypeError('Failed to fetch'));
      if (H.read === 'error') return sp(res({ ok: false, error: 'DEVICE_KEY: this device is not recognised. Ask Anthony for the key (Settings).' }));
      if (H.read === 'missing') return sp(res({ ok: true, success: true, jobs: [TWO({ id: 8, hvlId: 'HVL-0008' })], deletedJobs: [] }));
      return sp(res(sheet.loadJobs()));
    }
    return N.fetch(u, init);
  };
  const stubs = Object.assign({
    jobs: [], estimateStore: { 7: EST() }, jobPlanStore: {}, _photoRefs: { 7: clone(rows) }, changeOrders: [], contractors: [], vendorDirectory: [],
    SHEETS_SYNC_URL: SYNC, fetch, document: domStub({}), setTimeout: () => 0, clearTimeout() {}, Date: FixedDate(NOW),
    window: { open() {}, location: { set href(v) {}, get href() { return ''; } } },
    gmailAuth: (cb) => cb('tok-req'), loadPhotoRefs() {}, savePhotoRefs() {}, _printDocument() { return false; }, _dashRedraw() {},
    _docNotice: (t, m) => notices.push({ t, m: String(m) }), dashNotice: (t, m) => notices.push({ t, m: String(m) }),
    _dashSendState() {}, showSyncBadge: (m) => badges.push(String(m)), confirm: () => true, alert: (m) => alerts.push(String(m)),
    // P6's read gate for the selection bar, as a read that landed with nothing moved (p6-two-devices.test.js holds the gate).
    invReadFirst: () => false,
    // The write queue's edge: what saveJobs and syncJobToSheets hand to the outbox. The batch's payload is read when it is sent.
    postSyncBadge: (body) => { outbox.push(body); posted.push(body.type); },
    _holdTooLargeJobs() {}, _syncWritesOutstanding: () => outbox.length > 0, _syncWritesHeld: () => false,
    _applyDroppedJobs() {}, _setSheetNotice() {}, _sheetNotice: '', _noteDeviceKeyRefusal() {},
  }, o.noRead ? { approvalRecordFromSheet: (id, cb) => cb(true) } : {}, o.stubs || {});
  const c = lift(ROOTS, STOP, stubs);
  c._invCloudSeen = { 7: true };
  c._backendActions = ['esignSendRequest'];
  // A page load: the sheet's answer through the app's own verdict, unless the test hands the copy this device has held since.
  c.jobs = o.start ? [clone(o.start)] : (attempt(() => c.loadJobsVerdict(sheet.loadJobs(), [], false).jobs).val || []);
  const r = {
    c, N, H, notices, badges, alerts, outbox, posted,
    job: () => (c.jobs || []).filter((j) => j && j.id === 7)[0] || {},
    st: () => ((r.job().docState || {}).approvalRequest) || {},
    env: (id) => ((r.job().docState || {})[ENV(id)]) || null,
    last: () => (notices[notices.length - 1] || { m: '' }),
    card: () => String(attempt(() => c._renderInvReleasesCard(r.job(), c._jobInvRefs(7))).val || ''),
    row: (id) => (c._photoRefs[7] || []).filter((x) => x.stableId === id)[0] || {},
    at: (t) => { c.Date = FixedDate(t); },
    edit: (id, f) => [c._photoRefs[7], N.opts.media && N.opts.media[7] && N.opts.media[7].items].forEach((list) => (list || []).filter((x) => x.stableId === id).forEach(f)),
    syncs: () => posted.filter((t) => t === 'job').length,
    // The outbox onto the sheet, in the order it was queued; landOn sends the same writes to another sheet and keeps them.
    land: () => { let k = 0; while (outbox.length) { sheet.post(outbox.shift()); k++; } return k; },
    landOn: (other) => { outbox.forEach((b) => other.post(b)); return outbox.length; },
    // A read of the client list on this device: the app's own refresh, which stands down while this device owes the sheet a write.
    reload: () => { let done = false; attempt(() => c.refreshJobsFromCloud(() => { done = true; })); return done; },
    blocker: () => String(attempt(() => c.approvalRequestSendBlocker(r.job())).val || ''),
    // A refresh of the client list landing now, as jobsWatchTick's every 15 s: what this device owes the sheet lands first, then the
    // app's own refresh puts the sheet's copy of the client in place of the object it held (a tie goes to the sheet). Answers whether
    // the object was replaced.
    swap: () => { r.land(); const before = r.job(); r.reload(); return r.job() !== before && !!r.job().id; },
    dash: () => String(attempt(() => c.approvalRequestDashHtml(r.job())).val || ''),
    bar: () => (attempt(() => c.deskFoldState(7, r.job(), 'releases', c._jobInvRefs(7), '2026-10-17')).val || { bits: [] }),
    barLine: () => ((r.bar().bits || []).map((b) => b.text + (b.tone ? ' [' + b.tone + ']' : '')).join(' · ')),
    stored: () => (attempt(() => JSON.parse(c.localStorage.getItem('havellin_jobs_v3')).filter((j) => j && j.id === 7)[0]).val || {}),
  };
  return r;
}
// The stamps two copies of a client's `at` disagree on, by key.
const keysMoved = (a, b) => [...new Set(Object.keys(a || {}).concat(Object.keys(b || {})))].filter((k) => (a || {})[k] !== (b || {})[k]).sort();
// The sheet still holds env-r1 exactly as it was landed (never trivially: an envelope that was never on the sheet does not survive).
const survives = (ds, env) => !!(env && env.id === 'env-r1' && ds && ds[ENV('env-r1')] && JSON.stringify(ds[ENV('env-r1')]) === JSON.stringify(env));

// The source net (comment lines stripped, as CLAUDE.md asks): each match on a line that is not a comment, named by the top-level
// function (or var) it sits in, the function's own text bounding it. Built once, on first use.
let _net = null;
function sourceNet() {
  if (_net) return _net;
  const lines = SRC.split('\n');
  const starts = [0];
  for (let i = SRC.indexOf('\n'); i >= 0; i = SRC.indexOf('\n', i + 1)) starts.push(i + 1);
  const lineAt = (pos) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= pos) lo = mid; else hi = mid - 1; } return lines[lo] || ''; };
  const fnStarts = [...FN_AT.entries()].map(([n, p]) => ({ n, at: p.at })).sort((a, b) => a.at - b.at);
  const varStarts = [...VAR_AT.entries()].map(([n, at]) => ({ n, at })).sort((a, b) => a.at - b.at);
  const before = (list, pos) => { let lo = 0, hi = list.length - 1, best = null; while (lo <= hi) { const mid = (lo + hi) >> 1; if (list[mid].at <= pos) { best = list[mid]; lo = mid + 1; } else hi = mid - 1; } return best; };
  const holders = (re) => {
    const out = {};
    for (const m of SRC.matchAll(re)) {
      if (lineAt(m.index).trim().startsWith('//')) continue;
      const f = before(fnStarts, m.index), ft = f ? (attempt(() => fnText(f.n)).val || '') : '';
      let who = 'outside any function';
      if (f && f.at + ft.length > m.index) who = f.n;
      else { const v = before(varStarts, m.index), vt = v ? (attempt(() => varText(v.n)).val || '') : ''; if (v && v.at + vt.length > m.index) who = 'var ' + v.n; }
      out[who] = (out[who] || 0) + 1;
    }
    return sortKeys(out);
  };
  return (_net = { stripped: noComments(SRC), lineAt, holders });
}
const sortKeys = (o) => { const x = {}; Object.keys(o || {}).sort().forEach((k) => { x[k] = o[k]; }); return x; };

module.exports = function ({ group, ok, eq, has, lacks }) {
  const G = (name, body) => { group(name); try { inEastern(body); } catch (e) { ok(false, name + ' — threw: ' + String(e && e.message || e).split('\n')[0]); } };

  // A morning on the sheet, and device A's envelope sent and landed on it. Answers {S, A, env}: env is the sheet's copy.
  function envelopeOut(seed) {
    const S = sheetOf([seed || TWO()]);
    const A = device(S);
    A.at(NOW);
    const sent = attempt(() => A.c.sendApprovalRequestEsign(7));
    A.land();
    return { S, A, sent, env: clone(((S.job(7) || {}).docState || {})[ENV('env-r1')] || null) };
  }

  // ═══════════════════════════════════════════════════════════════════════
  G('A · a device on the morning\'s copy sends by email, taps I\'ve sent it or discards a draft: the envelope another device sent stays on the sheet', () => {
    // A1: no request yet that morning. A sends through DocuSign; B, never reloaded, sends by email.
    {
      const { S, A, sent, env } = envelopeOut();
      const morning = TWO();
      eq([sent.val, (A.N.log.esign || []).length], [true, 1], 'A sends through DocuSign');
      eq([env && env.id, env && env.status, env && env.stableIds], ['env-r1', 'sent', ['a', 'b', 'd']], 'the sheet holds the envelope on its own key, with the lines it carried');
      const B = device(S, { start: morning, noRead: true });
      B.at(NOW + 5 * MIN);
      eq(attempt(() => B.c.sendApprovalRequest(7)).val, true, 'B, on the morning\'s copy, sends by email');
      eq(B.N.log.drafts.length, 1, 'a Gmail draft');
      B.land();
      const sj = S.job(7) || {}, ds = sj.docState || {};
      eq(survives(ds, env), true, '⚠⚠ the envelope survives B\'s request landing on the sheet, unchanged');
      eq([(ds.approvalRequest || {}).provider, !!(ds.approvalRequest || {}).draftedAt], ['gmail', true], 'and the request on the sheet is B\'s draft');
      ok(A.reload(), 'A reads the client list');
      eq(attempt(() => A.c.sendApprovalRequest(7)).val, false, '⚠⚠ A refuses a new request by email…');
      has(A.last().m, OUT_TXT, 'naming the envelope out for signature');
      eq(attempt(() => A.c.sendApprovalRequestEsign(7)).val, false, '…and through DocuSign');
      eq(A.N.log.esign.length, 1, 'one envelope, ever');
      has(text(A.card()), 'Out for signature in DocuSign since Oct 17 to Thomas Ellison and Catherine Ellison-Reyes, 3 lines', '⚠ A\'s card reads the envelope beside B\'s draft');
      has(A.card(), 'onclick="approvalEnvelopeCheckNow(7)"', 'with Check DocuSign');
    }
    // A2 and A3: the morning held a draft by email, waiting. A taps I've sent it and then sends through DocuSign; B, holding
    // the morning's copy, taps I've sent it on that older draft (A2), or presses Discard draft on it (A3).
    [['A2 · I\'ve sent it on the older draft', (B) => B.c.invMarkRequestSent(7)],
     ['A3 · Discard draft', (B) => B.c.discardApprovalRequestDraft(7)]].forEach(([name, press]) => {
      const S = sheetOf([TWO()]);
      const M = device(S);
      M.at(NOW - 60 * MIN);
      eq(attempt(() => M.c.sendApprovalRequest(7)).val, true, name + ': the morning\'s request drafted in Gmail');
      M.land();
      const morning = S.job(7) || {};
      eq([!!((morning.docState || {}).approvalRequest || {}).draftedAt, ((morning.docState || {}).approvalRequest || {}).sentAt], [true, undefined], name + ': waiting on its tap');
      const A = device(S, { start: morning });
      A.at(NOW - 30 * MIN);
      eq(attempt(() => A.c.invMarkRequestSent(7)).val, true, name + ': A taps I\'ve sent it');
      A.at(NOW);
      eq(attempt(() => A.c.sendApprovalRequestEsign(7)).val, true, name + ': and sends through DocuSign');
      A.land();
      const env = clone((((S.job(7) || {}).docState || {})[ENV('env-r1')]) || null);
      eq([env && env.id, env && env.status], ['env-r1', 'sent'], name + ': the envelope on the sheet');
      const B = device(S, { start: morning, noRead: true });
      B.at(NOW + 5 * MIN);
      eq(attempt(() => press(B)).val, true, name + ': B presses on the morning\'s copy');
      B.land();
      const ds = (S.job(7) || {}).docState || {};
      eq(survives(ds, env), true, '⚠⚠ ' + name + ': the envelope survives, unchanged');
      eq((((S.job(7) || {}).at) || {})['docState:approvalRequest'], NOW + 5 * MIN, name + ': and the request\'s record on the sheet is B\'s');
      ok(A.reload(), name + ': A reads the client list');
      eq(attempt(() => A.c.sendApprovalRequest(7)).val, false, '⚠⚠ ' + name + ': A refuses a new request');
      has(A.last().m, OUT_TXT, name + ': by name');
      has(text(A.card()), 'Out for signature in DocuSign since Oct 17', name + ': and A\'s card reads the envelope');
      has(A.card(), 'onclick="approvalEnvelopeCheckNow(7)"', name + ': with Check DocuSign');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('B · the reverse: a completion recorded on a stale copy never puts back the request before the newest one, whichever lands first', () => {
    [['B lands first', false], ['the stale completion lands first', true]].forEach(([order, staleFirst]) => {
      const { S, A } = envelopeOut();
      // B reads the client after A's send, finds the envelope signed, records it on the lines, files it, and sends the next request.
      const B = device(S);
      B.at(NOW + 21 * MIN);
      B.N.opts.esignStatus = SIGNED('env-r1');
      attempt(() => B.c.approvalEnvelopeRefresh({ jobId: 7 }));
      const e1 = B.env('env-r1') || {};
      eq([e1.status, !!e1.appliedAt, !!e1.filedUrl], ['completed', true, true], order + ': B records the completion, the lines and the signed copy');
      eq(B.blocker(), '', order + ': so the next request may go');
      B.edit('c', (x) => { x.disposition = 'Donate'; x.channel = 'Habitat ReStore'; });
      B.N.opts.esignSend = { ok: true, envelopeId: 'env-r2', status: 'sent', signers: [
        { name: 'Thomas Ellison', email: 'tom@ellison.example', recipientId: '1', n: 1 },
        { name: 'Catherine Ellison-Reyes', email: 'cat@ellison.example', recipientId: '2', n: 2 }] };
      B.at(NOW + 30 * MIN);
      eq(attempt(() => B.c.sendApprovalRequestEsign(7)).val, true, order + ': B sends the clock through DocuSign');
      eq([(B.st().req || {}).envelopeId, (B.env('env-r2') || {}).stableIds], ['env-r2', ['c']], order + ': the second envelope, carrying the clock');
      // A never reloaded: it checks DocuSign later on its copy from the send, and records the same completion.
      A.at(NOW + 40 * MIN);
      A.N.opts.esignStatus = SIGNED('env-r1');
      attempt(() => A.c.approvalEnvelopeRefresh({ jobId: 7 }));
      eq((A.env('env-r1') || {}).status, 'completed', order + ': A records the completion on its stale copy');
      eq((A.job().at || {})['docState:approvalRequest'], NOW, order + ': and leaves the request\'s stamp where its send put it');
      if (staleFirst) { A.land(); B.land(); } else { B.land(); A.land(); }
      const ds = (S.job(7) || {}).docState || {};
      eq(((ds.approvalRequest || {}).req || {}).envelopeId, 'env-r2', '⚠⚠ ' + order + ': the sheet keeps the newer request');
      eq([(ds[ENV('env-r1')] || {}).status, (ds[ENV('env-r2')] || {}).status], ['completed', 'sent'], '⚠⚠ ' + order + ': both envelopes, the first one\'s completion included');
      // Read back on a third device, through the load path: the second envelope holds every request back.
      const R = device(S);
      has(R.blocker(), 'out for signature in DocuSign', order + ': a device reading the sheet finds the second envelope out');
      has(text(R.card()), 'Out for signature in DocuSign since Oct 17 to Thomas Ellison and Catherine Ellison-Reyes, 1 line', order + ': and its card says so');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('C · on an estate the send reads the client from the sheet first: a device on an older copy is refused by name before anything is built', () => {
    const { S, env } = envelopeOut();
    const sheetStamp = ((S.job(7) || {}).at || {})['docState:approvalRequest'];
    eq(sheetStamp, NOW, 'fixture: the sheet\'s request stamped by A\'s send');
    [['Send request', (B) => B.c.sendApprovalRequest(7)], ['Send through DocuSign', (B) => B.c.sendApprovalRequestEsign(7)]].forEach(([name, press]) => {
      const B = device(S, { start: TWO() });
      B.at(NOW + 5 * MIN);
      const upd0 = B.job().updatedAt;
      eq(B.blocker(), '', name + ': B\'s own copy predates the envelope, so it shows nothing out');
      eq(attempt(() => press(B)).val, true, name + ': the press starts');
      eq(B.H.loadJobs, 1, name + ': and reads the client from the sheet');
      has(B.last().m, OUT_TXT, '⚠⚠ ' + name + ': refused by name, past the envelope another device sent');
      eq([B.N.log.uploads.length, B.N.log.pdfs.length, B.N.log.drafts.length, B.N.log.esign.length], [0, 0, 0, 0],
        '⚠⚠ ' + name + ': nothing filed to Drive, made into a PDF, drafted in Gmail or sent to DocuSign');
      eq((B.job().at || {})['docState:approvalRequest'], sheetStamp, name + ': no new stamp on the request\'s record: the sheet\'s, taken as it was');
      eq(B.job().updatedAt, upd0, name + ': the client\'s own clock unmoved');
      eq([B.syncs(), B.posted.filter((t) => t === 'saveAllJobs').length], [0, 1], name + ': saved once, bare (_saveArrivalCheck), never as a person\'s edit');
      has(text(B.card()), 'Out for signature in DocuSign since Oct 17', name + ': B\'s card now reads the envelope');
      has(B.card(), 'onclick="approvalEnvelopeCheckNow(7)"', name + ': with Check DocuSign');
      B.land();
      eq(survives((S.job(7) || {}).docState, env), true, name + ': and what B saves changes nothing on the sheet');
      eq(((S.job(7) || {}).at || {})['docState:approvalRequest'], sheetStamp, name + ': the request\'s stamp included');
    });
    [['the read failed', 'fail'], ['the sheet turned the device away', 'error'], ['the sheet\'s list lacks the client', 'missing']].forEach(([name, how]) => {
      const B = device(S, { start: TWO(), read: how });
      B.at(NOW + 5 * MIN);
      eq(attempt(() => B.c.sendApprovalRequest(7)).val, true, name + ': the press starts');
      has(B.last().m, READ_FAIL_TXT, '⚠⚠ ' + name + ': refused, saying the client could not be read');
      eq([B.N.log.uploads.length, B.N.log.pdfs.length, B.N.log.drafts.length, B.N.log.esign.length, B.posted.length], [0, 0, 0, 0, 0],
        name + ': nothing filed, built, drafted, sent or saved');
    });
    // A client's own home holds no envelope: the send never asks the sheet for the client list.
    const L = device(sheetOf([LIVING()]), { rows: ROWS().slice(0, 2).map((x) => Object.assign(x, { category: 'Firearms' })) });
    eq(attempt(() => L.c.sendApprovalRequest(7)).val, true, 'living work: the send goes');
    eq([L.H.loadJobs, L.N.log.drafts.length], [0, 1], 'with no read of the client list, and drafts');

    // ⚠⚠ THE ADOPTION IS THE SHEET'S OWN RULE: for the request's key and an envelope's, every mix of presence, stamp and record
    // clock, what approvalRecordAdopt leaves on the device equals what the real _mergeJobKeyed keeps with the sheet's copy as the one
    // it holds and the device's as the one coming in, and the stamp equals the one the real _mergeJobRecord keeps.
    const g = sheetOf([]).gs;
    let saves = 0;
    const AD = lift(['approvalRecordAdopt'], [], { _saveArrivalCheck: () => { saves++; } });
    const bad = [], seen = { taken: 0, kept: 0, removed: 0, ties: 0 };
    ['approvalRequest', ENV('env-x')].forEach((k) => {
      [[1, 1], [1, 0], [0, 1]].forEach(([pA, pB]) => {
        [null, 100, 200].forEach((sA) => [null, 100, 200].forEach((sB) => {
          [[1000, 2000], [2000, 1000], [1500, 1500]].forEach(([uA, uB]) => {
            const mk = (p, s, u, who) => {
              const j = { id: 7, updatedAt: u, docState: { estimate: { sentAt: who } }, at: { 'docState:estimate': 50 } };
              if (p) j.docState[k] = { id: 'env-x', status: who, req: { to: [who + '@x.example'] } };
              if (s !== null) j.at['docState:' + k] = s;
              return j;
            };
            const sheetJob = mk(pA, sA, uA, 'sheet'), dev = mk(pB, sB, uB, 'device');
            const want = g._mergeJobKeyed(clone(sheetJob), clone(dev), 'docState', clone(sheetJob.docState), clone(dev.docState), uB >= uA);
            const wantAt = (g._mergeJobRecord(clone(sheetJob), clone(dev)).at || {})['docState:' + k];
            const before = clone(dev);
            saves = 0;
            const moved = attempt(() => AD.approvalRecordAdopt(dev, clone(sheetJob)));
            const has_ = Object.prototype.hasOwnProperty.call(dev.docState, k), wantHas = Object.prototype.hasOwnProperty.call(want, k);
            const label = k + ' sheet ' + (pA ? 'has' : 'lacks') + '@' + sA + ' device ' + (pB ? 'has' : 'lacks') + '@' + sB + ' clocks ' + uA + '/' + uB;
            if (!moved.ok) { bad.push(label + ': threw ' + moved.err); return; }
            if (has_ !== wantHas || (has_ && JSON.stringify(dev.docState[k]) !== JSON.stringify(want[k]))) bad.push(label + ': value ' + JSON.stringify(dev.docState[k]) + ' want ' + JSON.stringify(want[k]));
            if ((dev.at || {})['docState:' + k] !== wantAt) bad.push(label + ': stamp ' + (dev.at || {})['docState:' + k] + ' want ' + wantAt);
            if (dev.updatedAt !== uB || JSON.stringify(dev.docState.estimate) !== JSON.stringify(before.docState.estimate) || dev.at['docState:estimate'] !== 50) bad.push(label + ': moved something else');
            const changed = JSON.stringify(dev) !== JSON.stringify(before);
            if (saves !== (changed ? 1 : 0) || !!moved.val !== changed) bad.push(label + ': saved ' + saves + ' answered ' + moved.val + ' for ' + (changed ? 'a change' : 'no change'));
            if (!wantHas && pB) seen.removed++; else if (changed) seen.taken++; else seen.kept++;
            if (pA && pB && ((sA !== null && sA === sB) || (sA === null && sB === null && uA === uB))) seen.ties++;
          });
        }));
      });
    });
    eq(bad, [], '⚠⚠ approvalRecordAdopt keeps what the sheet\'s merge keeps, value and stamp, over 162 cases, and moves nothing else');
    ok(seen.taken > 0 && seen.kept > 0 && seen.removed > 0 && seen.ties >= 6, 'the table takes the sheet\'s copy, keeps the device\'s, follows a stamped removal and breaks ties (' + JSON.stringify(seen) + ')');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('D · the request holds a pointer and the paper is stored once on the envelope; every reader of the request\'s lines reads them through it', () => {
    const r = device(sheetOf([TWO()]));
    r.at(NOW);
    eq(attempt(() => r.c.sendApprovalRequestEsign(7)).val, true, 'sent through DocuSign');
    const req = r.st().req || {};
    eq(req.envelopeId, 'env-r1', 'the request records its envelope\'s id');
    eq(['envelope', 'stableIds', 'terms'].filter((k) => k in req), [], '⚠⚠ and never the envelope, its lines or its terms');
    const e = r.env('env-r1') || {};
    eq([e.stableIds, typeof e.terms, (e.terms || '').length > 10], [['a', 'b', 'd'], 'string', true], 'the envelope carries the lines, in the paper\'s order, and their terms');
    eq((JSON.stringify(r.job()).match(/"terms"/g) || []).length, 1, 'the terms are stored once on the client');
    const state = () => attempt(() => r.c.approvalRequestState(r.job(), r.c._jobInvRefs(7))).val || {};
    const S0 = state();
    eq([S0.carried, (S0.open || []).map((x) => x.stableId), (S0.changed || []).length], [3, ['a', 'b', 'd'], 0], '⚠⚠ approvalRequestState reads what it carried and what still waits off the envelope');
    has(r.c.invApprovalDateEarly ? String(attempt(() => r.c.invApprovalDateEarly(r.job(), '2026-10-01', '', [r.row('a')])).val || '') : '', 'is before the request went',
      'invApprovalDateEarly knows a line the envelope carried, and flags a signature dated before it went');
    eq(attempt(() => r.c.invApprovalDateEarly(r.job(), '2026-10-01', '', [r.row('c')])).val, '', 'and says nothing of a line it never carried');
    r.edit('b', (x) => { x.channel = 'Goodwill'; x.updatedAt = NOW + MIN; });
    eq(((state().changed) || []).map((x) => x.stableId), ['b'], 'a line moved after it went: changed, off the envelope\'s terms');
    eq(attempt(() => r.c.approvalRequestChanged(r.job(), r.st())).val, ['b'], 'approvalRequestChanged reads the same');
    eq(attempt(() => r.c.approvalRequestOvertaken(r.job(), r.st())).val, false, 'not overtaken while its lines wait');
    ['a', 'b', 'd'].forEach((id) => r.edit(id, (x) => { x.authBy = BOTH; x.approvalDate = '2026-10-19'; }));
    eq(attempt(() => r.c.approvalRequestOvertaken(r.job(), r.st())).val, true, 'approvalRequestOvertaken: every line the envelope carried approved since');

    // The bulk bar's Record approval reads the last request that went through the same view: an envelope declined in DocuSign,
    // and a line moved since, which the dialog then lists unticked.
    const q = device(sheetOf([TWO()]));
    q.at(NOW);
    attempt(() => q.c.sendApprovalRequestEsign(7));
    q.at(NOW + 21 * MIN);
    q.N.opts.esignStatus = STATUS('env-r1', 'declined', [['1', 'completed', '2026-10-18T14:00:00Z'], ['2', 'declined']]);
    attempt(() => q.c.approvalEnvelopeRefresh({ jobId: 7 }));
    eq((q.env('env-r1') || {}).status, 'declined', 'fixture: the envelope declined');
    q.edit('b', (x) => { x.channel = 'Goodwill'; x.updatedAt = NOW + 22 * MIN; });
    q.c._invPick = { a: 1, b: 1 };
    eq(attempt(() => q.c.invRecordApproval(7)).val, true, 'the bulk bar\'s Record approval opens on the selection');
    eq((q.c._invRecordCtx || {}).moved, ['b'], '⚠ and lists the line moved since the envelope went unticked, read off the envelope\'s terms');

    // A displaced envelope: B's copy predated A's envelope, and its request by email went (I've sent it). Read back, B holds both:
    // its own request is the one in force, the envelope still out beside it, and nothing on that envelope is recorded by hand.
    const { S } = envelopeOut();
    const B = device(S, { start: TWO(), noRead: true });
    B.at(NOW + 5 * MIN);
    attempt(() => B.c.sendApprovalRequest(7));
    B.at(NOW + 6 * MIN);
    attempt(() => B.c.invMarkRequestSent(7));
    B.land();
    ok(B.reload(), 'B reads the client list');
    const SB = attempt(() => B.c.approvalRequestState(B.job(), B.c._jobInvRefs(7))).val || {};
    eq([(SB.req || {}).envelopeId, SB.carried, !!(B.env('env-r1') || {}).id], [undefined, 3, true], 'fixture: B\'s request by email in force, the envelope out beside it');
    // RESTATED 2026-11-02 (the review): the card's press is refused by approvalRequestRecordRefusal, which the card asks before offering
    // it, and the dialog's own refusal on the request's road is asked of the same lines directly (belt and braces behind it).
    eq(attempt(() => B.c.invRecordRequestApproval(7)).val, false, '⚠⚠ Record the signed request refuses lines that are on the envelope still out');
    has(B.last().m, 'Its lines are out for signature in DocuSign on another envelope', 'naming why');
    const SB2 = attempt(() => B.c.approvalRequestState(B.job(), B.c._jobInvRefs(7))).val || {};
    eq(attempt(() => B.c.invRecordApproval(7, { stableIds: ['a', 'b', 'd'], sentAt: (SB2.st || {}).sentAt, req: SB2.req })).val, false,
      '⚠⚠ and the dialog, on the request\'s road, refuses lines that are on the envelope still out');
    has(B.alerts.join(' | '), '#1, #2, #4 are out for signature in DocuSign', 'naming them');
    has(text(B.card()), 'Out for signature in DocuSign since Oct 17', 'and B\'s card shows the envelope beside its request');
    // The readers, counted on the source: five call sites, one each, and approvalReqView's own definition aside.
    const views = sourceNet().holders(/\bapprovalReqView\(/g);
    delete views.approvalReqView;
    eq(views, sortKeys({ approvalRequestState: 1, approvalRequestChanged: 1, approvalRequestOvertaken: 1, invApprovalDateEarly: 1, invRecordApproval: 1 }),
      '⚠ every reader of a request\'s lines reads them through approvalReqView: five call sites');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('E · the stamps: a completion, the lines applied and the copy filed stamp the envelope\'s key and never the request\'s; a pending check stamps nothing', () => {
    const r = device(sheetOf([TWO()]));
    r.at(NOW);
    attempt(() => r.c.sendApprovalRequestEsign(7));
    const K = 'docState:' + ENV('env-r1'), RQ = 'docState:approvalRequest';
    const at0 = clone(r.job().at || {});
    eq([at0[K], at0[RQ]], [NOW, NOW], 'the send stamps both: the envelope\'s key and the request\'s pointer');
    // Pending: who has signed so far is noted, bare.
    r.at(NOW + 21 * MIN);
    const upd0 = r.job().updatedAt, sync0 = r.syncs();
    r.N.opts.esignStatus = STATUS('env-r1', 'sent', [['1', 'completed', '2026-10-18T14:00:00Z'], ['2', 'sent']]);
    attempt(() => r.c.approvalEnvelopeRefresh({ jobId: 7 }));
    eq([r.N.log.status.length, (r.env('env-r1') || {}).signedSoFar], [1, ['Thomas Ellison']], 'a pending check notes who has signed so far');
    eq(keysMoved(at0, r.job().at), [], '⚠ and moves no stamp');
    eq([r.job().updatedAt, r.syncs()], [upd0, sync0], '⚠ nor the client\'s clock, and syncs nothing');
    // Complete, with the inventory unreadable and Drive refusing the filing: the completion alone is recorded.
    r.at(NOW + 45 * MIN);
    const media = r.N.opts.media;
    r.N.opts.media = null;
    r.N.opts.esignArchive = { ok: false, error: 'Drive is busy' };
    r.N.opts.esignStatus = SIGNED('env-r1');
    attempt(() => r.c.approvalEnvelopeRefresh({ jobId: 7 }));
    const e1 = r.env('env-r1') || {};
    eq([e1.status, e1.appliedAt, e1.filedUrl], ['completed', undefined, undefined], 'fixture: completed, not yet applied or filed');
    const at1 = clone(r.job().at || {});
    eq([at1[K] > at0[K], at1[K]], [true, NOW + 45 * MIN], '⚠⚠ the completion moves the envelope\'s stamp past the one the send took');
    eq(at1[RQ], at0[RQ], '⚠⚠ and leaves the request\'s stamp exactly as the send left it');
    eq(keysMoved(at0, at1), [K], 'no other stamp moves');
    // The lines applied once the inventory is read: the envelope's key alone.
    r.at(NOW + 46 * MIN);
    r.N.opts.media = media;
    attempt(() => r.c.refreshPhotoRefs(7, () => {}));
    eq(attempt(() => r.c.approvalEnvelopeApply(7)).val, 3, 'the read lands: the three lines recorded');
    const at2 = clone(r.job().at || {});
    eq(keysMoved(at1, at2), [K], '⚠ applying stamps the envelope\'s key alone');
    // Filed by hand once DocuSign's floor from the failed ask has passed: the envelope's key and its signed records, never the request's.
    r.at(NOW + 67 * MIN);
    r.N.opts.esignArchive = null;
    attempt(() => r.c.approvalEnvelopeFile(7));
    eq((r.env('env-r1') || {}).filedUrl, 'https://drive.google.com/file/d/signed1/view', 'filed');
    const at3 = clone(r.job().at || {});
    eq(keysMoved(at2, at3), [K, 'signedRecords:esr_env-r1_2026-10-18', 'signedRecords:esr_env-r1_2026-10-19'], '⚠ filing stamps the envelope\'s key and the signed copy\'s records');
    eq(at3[RQ], at0[RQ], '⚠⚠ the request\'s stamp is still the send\'s');
    // Once: a second apply, file or check moves nothing.
    r.at(NOW + 90 * MIN);
    const upd3 = r.job().updatedAt, posted3 = r.posted.length, rows3 = JSON.stringify(r.c._photoRefs[7]);
    eq(attempt(() => r.c.approvalEnvelopeApply(7)).val, 0, 'a second apply records nothing');
    attempt(() => r.c.approvalEnvelopeFile(7));
    attempt(() => r.c.approvalEnvelopeFile(7, { auto: true }));
    attempt(() => r.c.approvalEnvelopeRefresh({ jobId: 7 }));
    eq([keysMoved(at3, r.job().at), r.job().updatedAt, r.posted.length, JSON.stringify(r.c._photoRefs[7]) === rows3], [[], upd3, posted3, true],
      '⚠ and a second apply, file or check moves no stamp, no clock, no line and sends nothing');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('F · two devices inside one envelope\'s key: whichever of the apply and the filing loses the merge, the request is not held back for good', () => {
    // One completed copy: completed, neither applied nor filed (the inventory unread and Drive refusing on the device that saw it).
    const { S } = envelopeOut();
    const X = device(S);
    X.at(NOW + 21 * MIN);
    X.N.opts.media = null;
    X.N.opts.esignArchive = { ok: false, error: 'Drive is busy' };
    X.N.opts.esignStatus = SIGNED('env-r1');
    attempt(() => X.c.approvalEnvelopeRefresh({ jobId: 7 }));
    X.land();
    const base = S.job(7);
    const e0 = ((base || {}).docState || {})[ENV('env-r1')] || {};
    eq([e0.status, e0.appliedAt, e0.filedUrl], ['completed', undefined, undefined], 'fixture: the sheet holds it completed, neither applied nor filed');
    // P applies and Q files, each from that copy; which one's stamp is later decides the envelope's key on the sheet.
    [['the filing is later, so the apply loses', 44, 45], ['the apply is later, so the filing loses', 45, 44]].forEach(([name, tP, tQ]) => {
      const P = device(S, { start: base });
      P.at(NOW + tP * MIN);
      P.c._invReadAt = { 7: NOW + tP * MIN };
      eq(attempt(() => P.c.approvalEnvelopeApply(7)).val, 3, name + ': P records the three lines');
      const Q = device(S, { start: base });
      Q.at(NOW + tQ * MIN);
      attempt(() => Q.c.approvalEnvelopeFile(7));
      eq((Q.env('env-r1') || {}).filedUrl, 'https://drive.google.com/file/d/signed1/view', name + ': Q files the signed copy');
      const sheets = [sheetOf([base]), sheetOf([base])];
      P.landOn(sheets[0]); Q.landOn(sheets[0]);
      Q.landOn(sheets[1]); P.landOn(sheets[1]);
      const envs = sheets.map((s) => ((s.job(7) || {}).docState || {})[ENV('env-r1')] || {});
      eq(JSON.stringify(envs[0]), JSON.stringify(envs[1]), name + ': the same on the sheet in either landing order');
      sheets.forEach((s, i) => {
        const tag = name + (i ? ' (Q landed first)' : ' (P landed first)') + ': ';
        // A device reading the sheet, holding the manifest P saved (its lines already approved).
        const R = device(s, { rows: clone(P.c._photoRefs[7]) });
        R.at(NOW + 50 * MIN);
        const ev = R.env('env-r1') || {};
        if (tP > tQ) {
          eq([!!ev.appliedAt, ev.filedUrl], [true, undefined], tag + 'the envelope\'s key is P\'s: applied, its link lost');
          eq(attempt(() => R.c.approvalEnvelopeFiledUrl(R.job(), ev)).val, 'https://drive.google.com/file/d/signed1/view', '⚠⚠ ' + tag + 'the link read off its signed records');
          eq(R.blocker(), '', '⚠⚠ ' + tag + 'so nothing holds the next request back');
        } else {
          eq([ev.appliedAt, ev.filedUrl], [undefined, 'https://drive.google.com/file/d/signed1/view'], tag + 'the envelope\'s key is Q\'s: filed, the apply lost');
          has(R.blocker(), 'not yet recorded on its items', tag + 'the next request waits for the lines…');
          R.c._invReadAt = { 7: NOW + 50 * MIN };
          const rows0 = JSON.stringify(R.c._photoRefs[7]);
          eq(attempt(() => R.c.approvalEnvelopeApply(7)).val, 0, tag + '…and the next apply writes nothing more on them');
          eq([JSON.stringify(R.c._photoRefs[7]) === rows0, !!(R.env('env-r1') || {}).appliedAt], [true, true], tag + 'the lines as P left them, the apply recorded again');
          eq(R.blocker(), '', '⚠⚠ ' + tag + 'and nothing holds the next request back');
        }
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('G · the net, on the source with comment lines stripped: the request carries no envelope, and only the named writers stamp an envelope\'s key', () => {
    const N = sourceNet();
    ok(N.stripped.length > SRC.length * 0.5, 'the stripped source is still most of the file (' + Math.round(N.stripped.length / SRC.length * 100) + '%)');
    // The needles find what is there: an empty answer below is an absence, not a needle that matches nothing.
    const live = N.holders(/\bapprovalEnvelopes\(/g);
    ok(Object.keys(live).length >= 6 && live.approvalEnvelopeBlocking === 1 && live.approvalEnvelopeApply === 1, 'the net places a live call in its function (' + Object.keys(live).length + ' readers of approvalEnvelopes)');
    eq(N.holders(/\breq\.envelope\b/g), {}, '⚠⚠ no live read or write of req.envelope');
    eq(N.holders(/\bapprovalEnvelope\(/g), {}, 'approvalEnvelope( is gone');
    eq(N.holders(/\bapprovalEnvelopeOut\(/g), {}, 'approvalEnvelopeOut( is gone');
    // Every request literal: none carries an envelope.
    const lits = [];
    for (const m of SRC.matchAll(/\breq\s*:\s*\{/g)) {
      if (N.lineAt(m.index).trim().startsWith('//')) continue;
      const open = SRC.indexOf('{', m.index), close = matchBrace(SRC, open);
      if (close > open) lits.push(SRC.slice(open, close + 1));
    }
    ok(lits.length >= 2 && lits.some((l) => /\benvelopeId\s*:/.test(l)), 'the request literals are found (' + lits.length + '), the DocuSign one carrying envelopeId');
    eq(lits.filter((l) => /\benvelope\s*:/.test(codeOnly(l))), [], '⚠⚠ and none carries an envelope');
    eq(N.holders(/\bAPPROVAL_ENV_PREFIX\b/g), sortKeys({ 'var APPROVAL_ENV_PREFIX': 1, approvalEnvelopeKey: 1, approvalEnvelopes: 1 }),
      'APPROVAL_ENV_PREFIX is read by approvalEnvelopeKey and approvalEnvelopes alone');
    eq(N.holders(/\bdocState\(\s*[\w$.]+\s*,\s*approvalEnvelopeKey\(/g),
      sortKeys({ approvalRequestSendEsign: 1, applyApprovalEnvelopeStatus: 1, approvalEnvelopeApply: 1, approvalEnvelopeFile: 1 }),
      '⚠⚠ an envelope\'s key is stamped by the send, the status written, the lines applied and the copy filed, and nothing else');
    eq(N.holders(/\bdocStateBare\(\s*[\w$.]+\s*,\s*approvalEnvelopeKey\(/g), sortKeys({ applyApprovalEnvelopeStatus: 1, approvalEnvelopeFile: 1 }),
      'and written bare only by the pending check and the filing\'s ask');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // FOUND ON REVIEW (2026-11-02): the send takes ten to thirty seconds, none of it through the write queue, so a refresh of the client
  // list (jobsWatchTick, every 15 s while any estimate waits on a manager) can land in the middle and put the sheet's copy of the client
  // in place of the object the press began with. Every write after the answer went to that object, which nothing held any more.
  G('H · a refresh of the client list during a send or a filing: the envelope, the draft and the signed copy land on the client the device now holds', () => {
    // H1: through DocuSign, the refresh landing as the envelope is asked for.
    {
      const S = sheetOf([TWO()]);
      let swapped = null;
      const A = device(S, { onPost: (what, r) => { if (what === 'esignSendRequest' && swapped === null) swapped = r.swap(); } });
      A.at(NOW);
      eq(attempt(() => A.c.sendApprovalRequestEsign(7)).val, true, 'H1: A sends through DocuSign');
      eq(swapped, true, 'fixture: the refresh put the sheet\'s copy of the client in place of the one the press began with');
      const e = A.env('env-r1') || {};
      eq([e.id, e.status, e.stableIds], ['env-r1', 'sent', ['a', 'b', 'd']], '⚠⚠ H1: the envelope is on the client the device holds');
      eq((A.st().req || {}).envelopeId, 'env-r1', '⚠⚠ H1: and so is the request pointing at it');
      eq(!!((A.stored().docState || {})[ENV('env-r1')]), true, 'H1: the copy saved on this device holds it too');
      has(A.blocker(), OUT_TXT, '⚠⚠ H1: so a send is refused on this device at once');
      has(text(A.card()), 'Out for signature in DocuSign since Oct 17', 'H1: the card reads the envelope');
      lacks(A.card(), 'sendApprovalRequestEsign(7)', 'H1: and offers no send');
      eq(attempt(() => A.c.sendApprovalRequestEsign(7)).val, false, '⚠⚠ H1: a second press before the write lands is refused');
      eq(A.N.log.esign.length, 1, '⚠⚠ H1: one envelope');
      A.land();
      eq([(((S.job(7) || {}).docState || {})[ENV('env-r1')] || {}).id, ((((S.job(7) || {}).docState || {}).approvalRequest || {}).req || {}).envelopeId], ['env-r1', 'env-r1'],
        'H1: and the sheet holds both once the write lands');
    }
    // H2: by email, the refresh landing as the Gmail draft is made.
    {
      const S = sheetOf([TWO()]);
      let swapped = null;
      const A = device(S, { onPost: (what, r) => { if (what === 'gmailDraft' && swapped === null) swapped = r.swap(); } });
      A.at(NOW);
      eq(attempt(() => A.c.sendApprovalRequest(7)).val, true, 'H2: A sends by email');
      eq(swapped, true, 'fixture: the refresh landed while the draft was being made');
      eq([A.st().provider, !!A.st().draftedAt, ((A.st().req || {}).stableIds || []).length], ['gmail', true, 3], '⚠⚠ H2: the draft is recorded on the client the device holds');
      has(A.card(), 'onclick="invMarkRequestSent(7)"', '⚠⚠ H2: the card offers I\'ve sent it');
      lacks(A.card(), 'onclick="sendApprovalRequest(7)"', 'H2: and no second send');
    }
    // H3: the signed copy filed, the refresh landing as DocuSign is asked for it.
    {
      const { S } = envelopeOut();
      let swapped = null;
      const R = device(S, { onPost: (what, r) => { if (what === 'esignArchive' && swapped === null) swapped = r.swap(); } });
      R.at(NOW + 21 * MIN);
      R.N.opts.esignStatus = SIGNED('env-r1');
      attempt(() => R.c.approvalEnvelopeRefresh({ jobId: 7 }));
      eq(swapped, true, 'fixture: the refresh landed while the signed copy was being fetched');
      const e = R.env('env-r1') || {};
      eq([e.status, e.filedUrl], ['completed', 'https://drive.google.com/file/d/signed1/view'], '⚠⚠ H3: the filed link is on the client the device holds');
      eq(attempt(() => R.c.jobListEntries(R.job(), 'signedRecords').map((x) => x.id).sort()).val, ['esr_env-r1_2026-10-18', 'esr_env-r1_2026-10-19'],
        '⚠⚠ H3: and the signed copy is listed once per signing day');
      eq(R.blocker(), '', 'H3: so nothing holds the next request back');
      lacks(R.card(), 'approvalEnvelopeFile(7)', 'H3: and the card no longer offers File signed copy');
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // FOUND ON REVIEW (2026-11-02): a device holding the morning's copy taps I've sent it on the morning's draft after another device's
  // envelope went: the morning's request is the one on record, the envelope beside it. Declined, voided, or signed with a line left
  // unrecorded and then filed, the envelope held nothing back, so the card, the dashboard and the Releases bar said nothing of it.
  const REASON = 'I object to selling the portrait';
  const ENDED = (status) => {
    const d = STATUS('env-r1', status, [['1', 'completed', '2026-10-18T14:00:00Z'], ['2', status === 'declined' ? 'declined' : 'sent']]);
    if (status === 'declined') d.signers[1].declinedReason = REASON;
    if (status === 'voided') d.voidedReason = 'Wrong items';
    return d;
  };
  // The morning's draft (by email) on the sheet; A taps I've sent it and sends env-r1 through DocuSign; B, on the morning's copy, taps
  // I've sent it on the older draft; A reads the client list. `morningRows`: the lines the morning's draft was built over.
  function rolledBack(morningRows) {
    const S = sheetOf([TWO()]);
    const M = device(S, { rows: morningRows || ROWS() });
    M.at(NOW - 60 * MIN);
    const drafted = attempt(() => M.c.sendApprovalRequest(7)).val;
    M.land();
    const morning = S.job(7);
    const A = device(S, { start: morning });
    A.at(NOW - 30 * MIN);
    const tapped = attempt(() => A.c.invMarkRequestSent(7)).val;
    A.at(NOW);
    const sent = attempt(() => A.c.sendApprovalRequestEsign(7)).val;
    A.land();
    const B = device(S, { start: morning, noRead: true });
    B.at(NOW + 5 * MIN);
    const stale = attempt(() => B.c.invMarkRequestSent(7)).val;
    B.land();
    const read = A.reload();
    return { S, A, ok: [drafted, tapped, sent, stale, read, (A.st().req || {}).envelopeId, !!A.env('env-r1')] };
  }
  G('I · an envelope a roll-back displaced is still drawn once it is declined, voided, or signed with a line left unrecorded', () => {
    [['declined', 'Declined in DocuSign by Catherine Ellison-Reyes (“' + REASON + '”). Nothing was recorded', 'Declined in DocuSign: send a fresh request'],
     ['voided', 'Voided in DocuSign (“Wrong items”). Nothing was recorded', 'Voided in DocuSign: send a fresh request']].forEach(([status, words, bit]) => {
      const { A, ok: steps } = rolledBack();
      eq(steps, [true, true, true, true, true, undefined, true], status + ': fixture: the morning\'s request back on record, the envelope beside it');
      A.at(NOW + 21 * MIN);
      A.N.opts.esignStatus = ENDED(status);
      attempt(() => A.c.approvalEnvelopeRefresh({ jobId: 7 }));
      eq((A.env('env-r1') || {}).status, status, status + ': fixture: recorded on the envelope');
      has(text(A.card()), words, '⚠⚠ ' + status + ': the card says so, with the reason');
      has(text(A.dash()), words, '⚠⚠ ' + status + ': and so does the dashboard');
      const b = A.bar();
      ok((b.bits || []).some((x) => x.text === bit && x.tone === 'red'), '⚠⚠ ' + status + ': the Releases bar is red (' + A.barLine() + ')');
      eq(b.openByDefault, true, status + ': and opens by itself');
    });
    // Signed, a line moved after it went: recorded on the rest, filed, and the line left unrecorded named.
    {
      const { A } = rolledBack();
      A.edit('b', (x) => { x.channel = 'Goodwill'; x.updatedAt = NOW + MIN; });
      A.at(NOW + 21 * MIN);
      A.N.opts.esignStatus = SIGNED('env-r1');
      attempt(() => A.c.approvalEnvelopeRefresh({ jobId: 7 }));
      const e = A.env('env-r1') || {};
      eq([e.status, !!e.appliedAt, e.changed, !!e.filedUrl], ['completed', true, ['b'], true], 'signed: fixture: applied, the moved line left unrecorded, filed');
      eq(A.blocker(), '', 'signed: it holds nothing back');
      has(text(A.card()), '1 line changed where it goes, who takes it or its value after the envelope went, so its signatures were not recorded: send a fresh request for it.',
        '⚠⚠ signed: the card still names the line left unrecorded');
    }
    // A fresh request drafted after the envelope puts it away, as it always did: no screen keeps an old envelope for good.
    {
      const r = device(sheetOf([TWO()]));
      r.at(NOW);
      attempt(() => r.c.sendApprovalRequestEsign(7));
      r.at(NOW + 21 * MIN);
      r.N.opts.esignStatus = ENDED('declined');
      attempt(() => r.c.approvalEnvelopeRefresh({ jobId: 7 }));
      has(text(r.card()), 'Declined in DocuSign by Catherine Ellison-Reyes', 'its own request\'s envelope declined: said');
      r.at(NOW + 30 * MIN);
      eq(attempt(() => r.c.sendApprovalRequest(7)).val, true, 'a fresh request by email');
      lacks(text(r.card()), 'Declined in DocuSign', 'the declined envelope is no longer drawn once a request drafted after it is on record');
      eq((r.bar().bits || []).filter((x) => x.tone === 'red').length, 0, 'and the bar is not red');
      // Sent, then a later draft let go: Discard draft keeps no draft day, and the request on record is the one that went, sent after
      // the envelope, so the envelope stays put away.
      r.at(NOW + 31 * MIN);
      eq(attempt(() => r.c.invMarkRequestSent(7)).val, true, 'the fresh request sent');
      r.edit('c', (x) => { x.disposition = 'Donate'; x.channel = 'Habitat ReStore'; });
      r.at(NOW + 40 * MIN);
      eq(attempt(() => r.c.sendApprovalRequest(7)).val, true, 'a later request drafted');
      r.at(NOW + 41 * MIN);
      eq([attempt(() => r.c.discardApprovalRequestDraft(7)).val, r.st().draftedAt, !!r.st().sentAt], [true, undefined, true], 'fixture: and discarded: no draft day, the sent one back');
      lacks(text(r.card()), 'Declined in DocuSign', '⚠ the declined envelope stays put away after Discard draft (the day the request on record went)');
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // FOUND ON REVIEW (2026-11-02): the morning's draft carried one line; the envelope carried it and two more. Rolled back, the card
  // called the two "not on it", the bar opened on them, and Record the signed request was offered and could only ever be refused.
  G('J · lines out on another envelope are never owed a fresh request, and Record the signed request is withheld while its lines are out', () => {
    const morningRows = ROWS().map((x) => { if (x.stableId === 'b' || x.stableId === 'd') { delete x.disposition; delete x.channel; } return x; });
    const { A, ok: steps } = rolledBack(morningRows);
    eq(steps, [true, true, true, true, true, undefined, true], 'fixture: the morning\'s request (one line) back on record, the envelope (three) beside it');
    eq((A.env('env-r1') || {}).stableIds, ['a', 'b', 'd'], 'fixture: the envelope carried all three');
    const S = attempt(() => A.c.approvalRequestState(A.job(), A.c._jobInvRefs(7))).val || {};
    eq([(S.open || []).map((x) => x.stableId), (S.fresh || []).map((x) => x.stableId), (S.onEnvelope || []).map((x) => x.stableId)], [['a'], [], ['b', 'd']],
      '⚠⚠ the two lines on the envelope alone are out for signature, never owed a fresh request');
    const card = text(A.card());
    has(card, 'Out for signature in DocuSign since Oct 17 to Thomas Ellison and Catherine Ellison-Reyes, 3 lines', 'the card reads the envelope');
    lacks(card, 'not on it', '⚠⚠ and never calls its lines "not on it"');
    lacks(A.card(), 'invRecordRequestApproval(7)', '⚠⚠ Record the signed request is withheld');
    has(String(attempt(() => A.c.approvalRequestRecordRefusal(A.job(), S)).val || ''), 'Its line is out for signature in DocuSign on another envelope',
      'the one answer says why');
    eq(attempt(() => A.c.invRecordRequestApproval(7)).val, false, 'a press from a card drawn before is refused');
    eq(A.alerts, [], 'by name, without the dialog\'s alert');
    const b = A.bar();
    lacks(A.barLine(), 'more item', '⚠⚠ the Releases bar asks no fresh request for them');
    has(A.barLine(), '3 out for signature in DocuSign', 'it counts them out for signature');
    eq(b.openByDefault, false, '⚠ and does not open by itself on them');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // FOUND ON REVIEW (2026-11-02): one device applied the signed envelope, another filed it; both stamp its key, so the sheet's key can
  // hold no filed link while the filing's esr_ records sit on the sheet's list. The read before a send took the key and not the records.
  G('K · the read before a send takes the envelope\'s signed records too, so an envelope another device filed is never refused as unfiled', () => {
    const { S } = envelopeOut();
    const X = device(S);
    X.at(NOW + 21 * MIN);
    X.N.opts.media = null;
    X.N.opts.esignArchive = { ok: false, error: 'Drive is busy' };
    X.N.opts.esignStatus = SIGNED('env-r1');
    attempt(() => X.c.approvalEnvelopeRefresh({ jobId: 7 }));
    X.land();
    const base = S.job(7);
    const P = device(S, { start: base });
    P.at(NOW + 45 * MIN);
    P.c._invReadAt = { 7: NOW + 45 * MIN };
    eq(attempt(() => P.c.approvalEnvelopeApply(7)).val, 3, 'fixture: P records the three lines');
    const Q = device(S, { start: base });
    Q.at(NOW + 44 * MIN);
    attempt(() => Q.c.approvalEnvelopeFile(7));
    Q.land(); P.land();
    const sj = S.job(7) || {}, se = ((sj.docState || {})[ENV('env-r1')]) || {};
    eq([!!se.appliedAt, se.filedUrl, (sj.signedRecords || []).map((x) => x.id).sort()], [true, undefined, ['esr_env-r1_2026-10-18', 'esr_env-r1_2026-10-19']],
      'fixture: the sheet\'s key is P\'s (applied, no link), the filing\'s records on its list');
    // A line decided since, waiting: each device presses Send request.
    const approved = clone(P.c._photoRefs[7]).map((x) => { if (x.stableId === 'c') { x.disposition = 'Donate'; x.channel = 'Habitat ReStore'; } return x; });
    {
      const D = device(S, { rows: approved, start: TWO() });
      D.at(NOW + 50 * MIN);
      eq(D.blocker(), '', 'fixture: a device on the morning\'s copy holds no envelope');
      eq(attempt(() => D.c.sendApprovalRequest(7)).val, true, 'it presses Send request');
      lacks(D.notices.map((x) => x.m).join(' | '), 'not yet filed to Drive', '⚠⚠ never refused as unfiled');
      eq(D.N.log.drafts.length, 1, '⚠⚠ the request is drafted');
      eq(attempt(() => D.c.jobListEntries(D.job(), 'signedRecords').map((x) => x.id).sort()).val, ['esr_env-r1_2026-10-18', 'esr_env-r1_2026-10-19'],
        'the signed records taken from the sheet with the envelope');
      eq(D.N.log.archive.length, 0, 'and DocuSign never asked for the paper again');
    }
    // P, holding the key it won and none of the records: its own copy reads unfiled, and the card's File signed copy reads the sheet first.
    {
      const D = device(S, { rows: approved, start: P.job() });
      D.at(NOW + 50 * MIN);
      has(D.blocker(), 'not yet filed to Drive', 'fixture: P\'s own copy reads unfiled');
      has(D.card(), 'onclick="approvalEnvelopeFile(7)"', 'fixture: its card offers File signed copy');
      attempt(() => D.c.approvalEnvelopeFile(7));
      eq([D.H.loadJobs, D.N.log.archive.length], [1, 0], '⚠⚠ the press reads the client from the sheet, and DocuSign is not asked for the paper again');
      has(D.last().m, 'The signed request is already filed to Drive.', 'it says the copy is filed');
      eq(D.blocker(), '', '⚠⚠ and nothing holds the next request back');
      lacks(D.card(), 'onclick="approvalEnvelopeFile(7)"', 'the card no longer offers the press');
    }
    // The records are taken by the sheet's own rule for its list, entry by entry: what approvalRecordAdopt leaves equals what the real
    // _mergeJobRecord keeps, the sheet's copy as the one it holds, over every mix of presence, stamp and record clock.
    const g = sheetOf([]).gs;
    const AD = lift(['approvalRecordAdopt'], [], { _saveArrivalCheck() {} });
    const bad = [];
    let n = 0;
    [[1, 1], [1, 0], [0, 1]].forEach(([pA, pB]) => [null, 100, 200].forEach((sA) => [null, 100, 200].forEach((sB) => [[1000, 2000], [2000, 1000], [1500, 1500]].forEach(([uA, uB]) => {
      const mk = (p, st, u, who) => {
        const j = { id: 7, updatedAt: u, docState: {}, at: { 'signedRecords:sr_other': 5 }, signedRecords: [{ id: 'sr_other', kind: 'receipt', who: who }] };
        if (p) j.signedRecords.push({ id: 'esr_e_2026-10-18', fileUrl: 'u-' + who, signedBy: who });
        if (st !== null) j.at['signedRecords:esr_e_2026-10-18'] = st;
        return j;
      };
      const sheetJob = mk(pA, sA, uA, 'sheet'), dev = mk(pB, sB, uB, 'device');
      const want = g._mergeJobRecord(clone(sheetJob), clone(dev));
      const wantRec = (want.signedRecords || []).filter((x) => x.id === 'esr_e_2026-10-18')[0] || null;
      const r1 = attempt(() => AD.approvalRecordAdopt(dev, clone(sheetJob)));
      const got = (dev.signedRecords || []).filter((x) => x.id === 'esr_e_2026-10-18')[0] || null;
      const label = 'sheet ' + (pA ? 'has' : 'lacks') + '@' + sA + ' device ' + (pB ? 'has' : 'lacks') + '@' + sB + ' clocks ' + uA + '/' + uB;
      n++;
      if (!r1.ok) { bad.push(label + ': threw ' + r1.err); return; }
      if (JSON.stringify(got) !== JSON.stringify(wantRec)) bad.push(label + ': ' + JSON.stringify(got) + ' want ' + JSON.stringify(wantRec));
      if ((dev.at || {})['signedRecords:esr_e_2026-10-18'] !== (want.at || {})['signedRecords:esr_e_2026-10-18']) bad.push(label + ': stamp');
      if (JSON.stringify((dev.signedRecords || []).filter((x) => x.id === 'sr_other')) !== JSON.stringify([{ id: 'sr_other', kind: 'receipt', who: 'device' }])) bad.push(label + ': another record moved');
    }))));
    eq([bad, n], [[], 81], '⚠⚠ an envelope\'s signed record is taken as the sheet\'s merge keeps it, value and stamp, over 81 cases; no other record moves');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // FOUND ON REVIEW (2026-11-02): the Apps Script's refusal of a second envelope reached the person as "DocuSign did not take the
  // request", with a doubled full stop and advice to email the same lines, over a card still offering both sends.
  G('L · the Apps Script\'s refusal is said as its own; refused a second envelope, the device reads the client again and the card shows it', () => {
    const OUT_ERR = 'The envelope was not created: a release request for this client is already out for signature in DocuSign (sent October 17, 2026). '
      + 'Reload the app to see it; if it has just been signed or voided, open the client so the app checks DocuSign, then send again.';
    {
      const S = sheetOf([TWO()]);
      const A = device(S);
      A.at(NOW);
      attempt(() => A.c.sendApprovalRequestEsign(7));   // A's envelope, not yet on the sheet
      const B = device(S, { onPost: (what) => { if (what === 'esignSendRequest') A.land(); } });
      B.N.opts.esignSend = { ok: false, error: OUT_ERR, refused: 'out' };
      B.at(NOW + MIN);
      eq(attempt(() => B.c.sendApprovalRequestEsign(7)).val, true, 'B presses within the seconds before A\'s envelope reaches the sheet');
      eq(B.H.loadJobs, 2, '⚠ refused, B reads the client again');
      const m = B.last().m;
      eq(m, 'Not sent: a release request for this client is already out for signature in DocuSign (sent Oct 17). It is on the Releases card now; '
        + 'no new request goes until it is complete in DocuSign, or voided there.', '⚠⚠ said as the Apps Script\'s refusal of a second envelope');
      ok(!/DocuSign did not take|\.\.|Send request to email it/.test(m), '⚠⚠ never DocuSign\'s answer, never a doubled stop, never "email it"');
      has(text(B.card()), 'Out for signature in DocuSign since Oct 17', '⚠⚠ B\'s card shows the envelope at once');
      lacks(B.card(), 'sendApprovalRequestEsign(7)', 'and offers no send');
      has(B.blocker(), OUT_TXT, 'and a send is refused on B');
    }
    // Any other refusal: the Apps Script's words, once, and nothing asked again.
    {
      const B = device(sheetOf([TWO()]));
      B.N.opts.esignSend = { ok: false, error: 'The envelope was not created: the document sent is not a PDF.', refused: 'refused' };
      B.at(NOW);
      attempt(() => B.c.sendApprovalRequestEsign(7));
      eq(B.last().m, 'The Apps Script refused it, so DocuSign was never asked. The envelope was not created: the document sent is not a PDF.', '⚠ another refusal: its own words, one stop');
      eq(B.H.loadJobs, 1, 'and the client is not read again');
    }
    // DocuSign's own failure keeps its words, without the doubled stop.
    {
      const B = device(sheetOf([TWO()]));
      B.N.opts.esignSend = { ok: false, error: 'DocuSign refused the envelope (HTTP 400): ANCHOR_TAB_STRING_NOT_FOUND.' };
      B.at(NOW);
      attempt(() => B.c.sendApprovalRequestEsign(7));
      eq(B.last().m, 'DocuSign did not take the request — DocuSign refused the envelope (HTTP 400): ANCHOR_TAB_STRING_NOT_FOUND. Nothing went out: press Send through DocuSign again, or Send request to email it.',
        'DocuSign\'s failure: said as DocuSign\'s, one stop');
    }
  });

  // The sweep found nothing held the app to the deployment that refuses a second envelope (2026-11-02j): on one older, the banner
  // must say so, and the gap leads its version line.
  G('M · the app asks for the deployment that refuses a second envelope, and the banner names the gap first', () => {
    const B = sandbox({ vars: ['BACKEND_MIN_VERSION', 'BACKEND_FEATURE_COST'] });
    const gsv = (GS.match(/var BACKEND_VERSION = '([^']+)';/) || [])[1] || '';
    ok(B.BACKEND_MIN_VERSION >= '2026-11-02c', '⚠⚠ BACKEND_MIN_VERSION is 2026-11-02c or later (it carries both 2026-11-02b builds) (' + B.BACKEND_MIN_VERSION + ')');
    ok(gsv >= B.BACKEND_MIN_VERSION, 'main-sync.gs is at least what the app asks for (' + gsv + ')');
    // RESTATED on the merge with P13 (both named 2026-11-02b; 2026-11-02c carries both), and again on merging P15 (2026-11-02d, which
    // carries 2026-11-02c): P15's gap leads, and 2026-11-02c's envelope follows it at once.
    const _vl = String(B.BACKEND_FEATURE_COST.version || ''), _vi = '; on a deployment older than ';
    ok(_vl.indexOf('on a deployment older than 2026-11-02d, Agent Two values every basis') === 0 && _vl.indexOf(_vi) === _vl.indexOf(_vi + '2026-11-02c, a copy of the app that has not been reloaded'), '⚠ the banner\'s version line names the envelope\'s gap first after P15\'s');
  });
};
