'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P2 (the desk audit of 2026-10-27, RT-01 and RT-24): ONLY HAVELLIN'S DEVICES REACH THE DATA.
//   · The jobs Apps Script answered anybody who held its /exec URL: every client, every inventory and door code, a share
//     of any folder with any address, a trash of any file, a DocuSign envelope from the firm's account.
//   · Now every action and type but the version probe asks for the device key first (HAVELLIN_DEVICE_KEY in Script
//     Properties; the check is OFF while it is unset, and the probe says so); a share or revoke goes only to a folder inside
//     that client's own, a share only to an address recorded on that client; a trash only to a file inside the jobs folder,
//     never a folder; the release request through DocuSign only to the client's recorded fiduciaries; each is logged.
//   · The app sends the key it was given in Settings on every request to that Apps Script (one road, _withDeviceKey), never
//     anywhere else, never on screen; a refusal for the key is its own kind, held and never retried by itself.
// The server half drives the REAL main-sync.gs code over a fake sheet and a fake Drive; the app half the real havellin.html.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { sandbox, matchBrace, source, fn, decl, domStub } = require('./harness');

const ROOT = path.join(__dirname, '..');
const GS = fs.readFileSync(path.join(ROOT, 'apps-script', 'main-sync.gs'), 'utf8');

function gsFn(name) {
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(GS);
  if (!m) throw new Error('not in .gs: ' + name);
  const start = m.index + (m[1] ? m[1].length : 0);
  const open = GS.indexOf('{', re.lastIndex);
  return GS.slice(start, matchBrace(GS, open) + 1);
}
function gsVar(name) {
  const m = GS.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[^;]*;)'));
  if (!m) throw new Error('var not in .gs: ' + name);
  return m[2];
}
const GS_FNS = new Set((GS.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const noComments = (t) => String(t).split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

// ── A fake spreadsheet (rows of cells, 1-based ranges) and a fake Drive tree ─────────────────────────
function fakeSheet(name, header) {
  const rows = header ? [header.slice()] : [];
  return {
    _rows: rows,
    getName: () => name,
    getLastRow: () => rows.length,
    getLastColumn: () => rows.reduce((m, r) => Math.max(m, r.length), 0),
    appendRow(r) { rows.push(r.slice()); },
    getDataRange() { return { getValues: () => rows.map((r) => r.slice()) }; },
    getRange(r, c, nr, nc) {
      return {
        getValues() {
          const out = [];
          for (let i = 0; i < nr; i++) { const row = rows[r - 1 + i] || []; const cells = []; for (let j = 0; j < nc; j++) cells.push(row[c - 1 + j] === undefined ? '' : row[c - 1 + j]); out.push(cells); }
          return out;
        },
        setValues(v) { v.forEach((cells, i) => { while (rows.length < r + i) rows.push([]); cells.forEach((cell, j) => { rows[r - 1 + i][c - 1 + j] = cell; }); }); },
      };
    },
  };
}
const JOBS_HDR = ['ID', 'HVL ID', 'Name', 'Email', 'Phone', 'Address', 'City', 'Zip', 'Service', 'Status', 'Created', 'Data JSON'];
function jobsSheet(jobs) {
  const sh = fakeSheet('Jobs', JOBS_HDR);
  jobs.forEach((j) => sh.appendRow([j.id, j.hvlId || '', j.name || '', '', '', '', '', '', j.svc || '', '', '', JSON.stringify(j)]));
  return sh;
}
// Drive: root ─ F1 (client 7) ─ F1a (Estate Inventory) ─ p1.jpg; F1 ─ F1b (As-Found Record); root ─ F2 (client 8) ─ F2a ─ p2.jpg;
// X (outside the jobs folder) ─ x1.pdf. Every item answers getParents; a folder asked for as a file answers as a folder.
function fakeDrive() {
  const items = {};
  const shares = [], revokes = [], trashed = [];
  const mk = (id, name, parent, folder, mime) => {
    const it = {
      id, name, parent, folder, trashed: false,
      getId: () => id, getName: () => name, getUrl: () => 'https://drive.google.com/drive/folders/' + id,
      getMimeType: () => (folder ? 'application/vnd.google-apps.folder' : (mime || 'image/jpeg')),
      getParents: () => { const l = parent ? [items[parent]] : []; return { hasNext: () => l.length > 0, next: () => l.shift() }; },
      addViewer: (e) => { shares.push(id + ' ' + e); },
      removeViewer: (e) => { revokes.push(id + ' ' + e); },
      setTrashed: (v) => { it.trashed = v; trashed.push(id); },
    };
    items[id] = it;
    return it;
  };
  mk('root', 'Havellin Jobs', null, true);
  mk('F1', 'Ellison - HVL-0007', 'root', true); mk('F1a', 'Estate Inventory', 'F1', true); mk('F1b', 'As-Found Record', 'F1', true);
  mk('p1', 'HVL-0007_INV_1.jpg', 'F1a', false);
  mk('F2', 'Hale - HVL-0008', 'root', true); mk('F2a', 'Estate Inventory', 'F2', true); mk('p2', 'HVL-0008_INV_1.jpg', 'F2a', false);
  mk('X', 'Somebody else', null, true); mk('x1', 'contract.pdf', 'X', false, 'application/pdf');
  const DriveApp = {
    getFolderById: (id) => { const f = items[id]; if (!f || !f.folder) throw new Error('No item with the given ID could be found'); return f; },
    getFileById: (id) => { const f = items[id]; if (!f) throw new Error('No item with the given ID could be found'); return f; },
  };
  return { items, shares, revokes, trashed, DriveApp };
}
const JOB7 = { id: 7, hvlId: 'HVL-0007', name: 'Estate of Walter Ellison', svc: 'probate', addr: '120 Via Bellaria, Palm Beach, FL',
  executor: 'Thomas Ellison', executorEmail: 'tom@ellison.example', probateAttyEmail: 'ann@lowe.law', email: '',
  driveFolder: 'https://drive.google.com/drive/folders/F1',
  coFiduciaries: [{ id: 'cf1', name: 'Catherine Ellison-Reyes', email: 'Cat@Ellison.example' },
                  { id: 'cf2', name: 'Old Trustee', email: 'old@trust.example', voidedAt: 5 },
                  { id: 'cf3', name: ' THOMAS ELLISON', email: 'tom2@ellison.example' }] };
const JOB8 = { id: 8, hvlId: 'HVL-0008', name: 'Margaret Hale', svc: 'downsizing_move', addr: '9 Ocean Blvd', email: 'meg@hale.example',
  driveFolder: 'https://drive.google.com/drive/folders/F2' };
const JOB9 = { id: 9, hvlId: 'HVL-0009', name: 'Estate of No Folder', svc: 'cleanout', executor: 'Ruth Adler', executorEmail: 'ruth@adler.example' };

// The server, with what it needs lifted and the rest named as spies (the dispatch test lifts only the routers and the key).
const KEY_FNS = ['doGet', 'doPost', 'jsonOut', '_okWithDrops', '_deviceKeyNorm', '_deviceKeyState', '_deviceKeyRefusal'];
const KEY_VARS = ['BACKEND_VERSION', 'BACKEND_ACTIONS', 'BACKEND_TYPES', 'DEVICE_KEY_PROP', 'DEVICE_KEY_PARAM', 'DEVICE_KEY_MIN', 'DEVICE_KEY_REFUSED'];
function server(opts = {}) {
  const props = { HAVELLIN_DEVICE_KEY: opts.key == null ? null : opts.key };
  const logs = [], calls = [], setProps = [];
  const drive = fakeDrive();
  const sheets = { Jobs: jobsSheet(opts.jobs || [JOB7, JOB8, JOB9]) };
  if (opts.accessLog) sheets.AccessLog = opts.accessLog;
  const ctx = {
    console, JSON, Math, Date, String, Number, Object, Array, RegExp,
    Logger: { log: (s) => logs.push(String(s)) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (k) => { if (opts.propsThrow) throw new Error('Service invoked too many times'); return Object.prototype.hasOwnProperty.call(props, k) ? props[k] : null; },
      setProperty: (k, v) => { setProps.push(k); props[k] = v; } }) },
    Utilities: { DigestAlgorithm: { SHA_256: 'SHA_256' },
      computeDigest: (alg, s) => Array.from(crypto.createHash('sha256').update(String(s)).digest()).map((b) => (b > 127 ? b - 256 : b)),
      getUuid: () => crypto.randomUUID() },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => ({ setMimeType() { return this; }, getContent: () => s }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: (n) => sheets[n] || null, insertSheet(n) { sheets[n] = fakeSheet(n); return sheets[n]; } }) },
    DriveApp: drive.DriveApp,
    __sheets: sheets, __props: props,
  };
  const lift = opts.fns || KEY_FNS;
  const vars = opts.vars || KEY_VARS;
  // Every other function the routers name is a spy: a refused request must reach none of them.
  if (!opts.fns) {
    const body = noComments(gsFn('doGet') + gsFn('doPost'));
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) {
      const n = m[1];
      if (GS_FNS.has(n) && lift.indexOf(n) < 0 && !ctx[n]) ctx[n] = function () { calls.push(n); return { ok: true, spied: n }; };
    }
  }
  Object.assign(ctx, opts.stubs || {});
  vm.createContext(ctx);
  vm.runInContext([...vars.map(gsVar), ...lift.map(gsFn)].join('\n\n'), ctx, { filename: 'main-sync.gs (extracted)' });
  if (vars.indexOf('ROOT_FOLDER_ID') >= 0) ctx.ROOT_FOLDER_ID = 'root';
  const read = (out) => (out && typeof out.getContent === 'function') ? JSON.parse(out.getContent()) : out;
  return {
    ctx, logs, calls, setProps, drive, sheets, props,
    post: (body, key, raw) => read(ctx.doPost({ parameter: key == null ? {} : { deviceKey: key }, postData: { contents: raw != null ? raw : JSON.stringify(body) } })),
    get: (action, key, extra) => read(ctx.doGet({ parameter: Object.assign(action == null ? {} : { action }, key == null ? {} : { deviceKey: key }, extra || {}) })),
    logRows: () => (sheets.AccessLog ? sheets.AccessLog._rows.slice() : []),
  };
}
const KEY = 'K7QM-3XWP-9TRA-HC4N-2ZBE';

module.exports = function ({ group, ok, eq, has, lacks }) {
  const G = (name, body) => { group(name); try { body(); } catch (e) { ok(false, name + ' — threw: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); } };
  const S0 = server();
  const ACTIONS = S0.ctx.BACKEND_ACTIONS.slice(), TYPES = S0.ctx.BACKEND_TYPES.slice();
  const GET_ACTIONS = [...noComments(gsFn('doGet')).matchAll(/action === '([A-Za-z]+)'/g)].map((m) => m[1]).filter((a) => a !== 'version');
  const REFUSED = S0.ctx.DEVICE_KEY_REFUSED;

  // ═══════════════════════════════════════════════════════════════════════════
  G('A · every action and type but the version probe asks for the key first, derived from the dispatch', () => {
    ok(ACTIONS.length >= 18 && TYPES.length >= 12 && GET_ACTIONS.length >= 8, 'the dispatch lists were read (' + ACTIONS.length + ' actions, ' + TYPES.length + ' types, ' + GET_ACTIONS.length + ' GET actions)');
    // OFF: no key in Script Properties. Everything is answered as before, and the probe says the check is off.
    let s = server();
    const offPosts = ACTIONS.map((a) => s.post({ action: a })).concat(TYPES.map((t) => s.post({ type: t, payload: {} })));
    ok(offPosts.every((r) => !(r && r.deviceKey)), '⚠ with no key set, no request is refused for the key: the redeploy breaks nothing');
    ok(s.calls.length >= ACTIONS.length, 'and every action reached its handler (' + s.calls.length + ')');
    eq(s.get('version').deviceKey, 'off', 'the version probe says the check is off');
    ok(s.get('loadJobs').spied || s.calls.indexOf('getJobsFromSheet') >= 0, 'a GET is answered too');
    // ON, no key sent: refused, every one, and NOTHING behind the check runs.
    s = server({ key: KEY });
    const noKey = ACTIONS.map((a) => [a, s.post({ action: a })]).concat(TYPES.map((t) => [t, s.post({ type: t, payload: {} })]))
      .concat(GET_ACTIONS.map((a) => ['GET ' + a, s.get(a)]));
    eq(noKey.filter(([, r]) => !(r && r.ok === false && r.deviceKey === 'missing' && r.error === REFUSED.missing)).map(([a]) => a), [],
       '⚠⚠ every POST action, every POST type and every GET action is refused without the key');
    eq(s.calls, [], '⚠⚠ and nothing behind the check was called: not one handler, not the sheet');
    const garbled = s.post(null, null, 'not json at all');
    eq([garbled.deviceKey, garbled.error], ['missing', REFUSED.missing], 'the key is checked before the body is parsed (a body that is not JSON is refused for the key, not for its JSON)');
    // ON, wrong key: refused the same way, with its own words.
    const wrong = ACTIONS.map((a) => s.post({ action: a }, 'K7QM-3XWP-9TRA-HC4N-2ZBF')).concat(GET_ACTIONS.map((a) => s.get(a, 'nope')));
    ok(wrong.every((r) => r.ok === false && r.deviceKey === 'wrong' && r.error === REFUSED.wrong), 'a wrong key is refused, every one');
    eq(s.calls, [], 'still nothing reached');
    // ON, the right key: through, to the handler the dispatch names.
    const right = ACTIONS.map((a) => s.post({ action: a }, KEY)).concat(TYPES.map((t) => s.post({ type: t, payload: {} }, KEY)));
    ok(right.every((r) => !(r && r.deviceKey)), 'the right key passes for every action and type');
    ok(s.calls.length >= ACTIONS.length, 'and each reached its handler');
    // The four that act on who can see or keep a file, or send from the firm's DocuSign, reach their scoped forms.
    const reached = (body) => { const t = server({ key: KEY }); t.post(body, KEY); return t.calls; };
    eq([reached({ action: 'trashFile' }), reached({ action: 'shareFolder' }), reached({ action: 'unshareFolder' }), reached({ action: 'esignSendRequest' })],
       [['trashFileUnderRoot'], ['shareFolderForJob'], ['unshareFolderForJob'], ['esignSendRequestForJob']],
       '⚠⚠ a trash, a share, a revoke and the DocuSign request reach their scoped forms, never the unscoped primitives');
    // The version probe answers without the key, and says where this device stands. It reads nothing.
    s = server({ key: KEY });
    eq([s.get('version').ok, s.get('version').deviceKey, s.get('version', KEY).deviceKey, s.get('version', 'x').deviceKey], [true, 'missing', 'ok', 'wrong'],
       'the probe answers with no key (missing), the key (ok) and a wrong one (wrong)');
    eq(s.calls, [], 'and the probe calls nothing behind it');
    // No action at all is still "Unknown action": a POST redirected into a bare GET keeps its own diagnosis (the app's 'route').
    eq([s.get(null).error, s.get(null, KEY).error], ['Unknown action', 'Unknown action'], 'a GET with no action is answered "Unknown action" either way');
  });

  G('A2 · the key as it is typed: case, spaces and dashes aside; several keys; a blank property is off; a properties failure never opens the door', () => {
    let s = server({ key: KEY });
    eq(s.get('version', 'k7qm 3xwp 9tra hc4n 2zbe').deviceKey, 'ok', 'lower case and spaces in place of dashes still match (a phone keyboard)');
    eq(s.get('version', 'K7QM3XWP9TRAHC4N2ZB').deviceKey, 'wrong', 'one character short does not');
    s = server({ key: 'AAAA-BBBB-CCCC-DDDD-EEEE, FFFF-GGGG-HHHH-JJJJ-KKKK\nLLLL-MMMM-NNNN-PPPP-QQQQ' });
    eq(['AAAABBBBCCCCDDDDEEEE', 'ffff-gggg-hhhh-jjjj-kkkk', 'LLLL MMMM NNNN PPPP QQQQ'].map((k) => s.get('version', k).deviceKey), ['ok', 'ok', 'ok'],
       'several keys, separated by commas or new lines: each device its own');
    s.props.HAVELLIN_DEVICE_KEY = 'FFFF-GGGG-HHHH-JJJJ-KKKK';
    eq([s.get('version', 'AAAABBBBCCCCDDDDEEEE').deviceKey, s.get('version', 'FFFFGGGGHHHHJJJJKKKK').deviceKey], ['wrong', 'ok'],
       '⚠ removing one key locks out that device alone');
    s = server({ key: '  \n , ' });
    eq(s.get('version').deviceKey, 'off', 'a property holding only spaces and commas is no key: the check is off');
    s = server({ key: KEY, propsThrow: true });
    const r = s.post({ action: 'trashFile' }, KEY);
    ok(r.ok === false && !r.deviceKey && /too many times/.test(r.error), '⚠⚠ a Script Properties read that fails refuses the request (the app retries it): it never passes with the check off');
    eq(s.calls, [], 'and reaches nothing');
    eq(s.get('version').deviceKey, 'unknown', 'the probe still answers, saying it could not tell');
  });

  G('A3 · the key is never echoed or logged, and the editor helper sets nothing', () => {
    let s = server({ key: KEY });
    const answers = [s.post({ action: 'shareFolder' }, 'SECRET-GUESS-1234'), s.get('loadJobs', 'SECRET-GUESS-1234'), s.get('version', 'SECRET-GUESS-1234'), s.get('version', KEY)];
    ok(answers.every((a) => JSON.stringify(a).indexOf('SECRET') < 0 && JSON.stringify(a).indexOf('K7QM') < 0), 'no answer carries a key, sent or set');
    ok(s.logs.length >= 2 && s.logs.every((l) => l.indexOf('SECRET') < 0 && l.indexOf('K7QM') < 0), 'the refusals are logged, and no log line carries a key');
    has(s.logs.join('\n'), 'device key wrong', 'each refusal names its state');
    // suggestDeviceKey: editor only, sets nothing, never prints a key that is set, flags a short one, prints a fresh one.
    s = server({ key: 'SHORT1, ' + KEY, fns: ['suggestDeviceKey', '_deviceKeyNorm'], vars: ['DEVICE_KEY_PROP', 'DEVICE_KEY_MIN'] });
    s.ctx.suggestDeviceKey();
    const out = s.logs.join('\n');
    has(out, 'The device key check is ON: 2 keys in Script Properties (HAVELLIN_DEVICE_KEY).', 'it says the check is on and how many keys');
    has(out, 'Key 1 is only 6 characters', 'it names a key shorter than the minimum, by position');
    ok(out.indexOf('SHORT1') < 0 && out.indexOf('K7QM') < 0, '⚠ and never prints a key that is set');
    const fresh = (out.match(/nothing has been set\): ([A-Z0-9-]+)/) || [])[1] || '';
    ok(/^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){4}$/.test(fresh), 'the fresh key is twenty letters and digits with no 0, O, 1 or I, in groups of four (' + fresh + ')');
    eq(s.setProps, [], '⚠ it sets nothing: a new key is put in Script Properties by hand');
    s = server({ fns: ['suggestDeviceKey', '_deviceKeyNorm'], vars: ['DEVICE_KEY_PROP', 'DEVICE_KEY_MIN'] });
    s.ctx.suggestDeviceKey();
    has(s.logs.join('\n'), 'The device key check is OFF', 'with no key it says the check is off');
    const routers = noComments(gsFn('doGet') + gsFn('doPost'));
    lacks(routers, 'suggestDeviceKey', 'it is reachable from neither router');
    ok(ACTIONS.concat(TYPES).indexOf('suggestDeviceKey') < 0, 'and is no action or type');
    lacks(GS, "setProperty(DEVICE_KEY_PROP", 'nothing in the file writes the key');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  const DRIVE_FNS = ['_accessLog', '_jobOnSheet', 'getJobsFromSheet', '_jobFolderIdGs', '_jobListLiveGs', '_jobRecordedEmails', '_driveParentIds',
    '_driveIsUnder', '_shareScope', 'shareFolderForJob', 'unshareFolderForJob', '_driveMime', 'trashFileUnderRoot', 'trashDriveFile', 'shareFolder', 'unshareFolder'];
  const DRIVE_VARS = ['SHEET_ID', 'ROOT_FOLDER_ID', 'ACCESS_LOG_TAB', 'ACCESS_LOG_HEADER', 'DRIVE_FOLDER_MIME', 'DRIVE_UNDER_MAX_DEPTH'];
  const driveServer = (o) => server(Object.assign({ fns: DRIVE_FNS, vars: DRIVE_VARS }, o || {}));
  G('B · a share goes only to a folder inside that client\'s own, and only to an address recorded on that client; a revoke to any address there', () => {
    const s = driveServer();
    const share = (o) => s.ctx.shareFolderForJob(Object.assign({ folderId: 'F1a', email: 'ann@lowe.law', jobId: 7, by: 'Ashley Jerome' }, o));
    const r1 = share();
    eq([r1.ok, s.drive.shares], [true, ['F1a ann@lowe.law']], 'the estate attorney recorded on the client: shared');
    eq(share({ email: 'cat@ellison.example', folderId: 'F1b' }).ok, true, 'a live co-representative (any case): shared');
    eq(share({ email: 'tom@ellison.example', folderId: 'F1' }).ok, true, 'the representative, on the client\'s own folder itself: shared');
    const r2 = share({ email: 'stranger@gmail.com' });
    eq(r2.ok, false, '⚠⚠ an address recorded on no client: refused');
    has(r2.error, 'stranger@gmail.com is not an email recorded on this client, so nothing was shared', 'by name, saying nothing was shared');
    eq(share({ email: 'old@trust.example' }).ok, false, 'a voided co-representative\'s address is not recorded: refused');
    const r3 = share({ folderId: 'F2a' });
    eq([r3.ok, r3.error], [false, 'That folder is not inside this client’s Drive folder, so nothing was changed.'], '⚠⚠ another client\'s folder: refused');
    eq(share({ folderId: 'X' }).ok, false, 'a folder outside the jobs folder: refused');
    eq(share({ email: 'meg@hale.example', folderId: 'F2a', jobId: 8 }).ok, true, 'a living client\'s own email, on their own folder: shared');
    eq(share({ email: 'meg@hale.example', folderId: 'F1a', jobId: 8 }).ok, false, 'that client\'s email on the estate\'s folder: refused');
    has(share({ jobId: undefined }).error, 'The request names no client', 'no client named: refused (an older copy of the app is open)');
    has(share({ jobId: 99 }).error, 'This client is not on the sheet', 'a client the sheet does not hold: refused');
    has(share({ jobId: 9, email: 'ruth@adler.example' }).error, 'no Drive folder recorded on the sheet', 'a client with no folder: refused');
    eq(s.drive.shares, ['F1a ann@lowe.law', 'F1b cat@ellison.example', 'F1 tom@ellison.example', 'F2a meg@hale.example'], '⚠ and only the four allowed shares reached Drive');
    // A revoke: inside the client's folder, for ANY address (taking access from somebody no longer recorded is what it is for).
    const v1 = s.ctx.unshareFolderForJob({ folderId: 'F1a', email: 'former@counsel.example', jobId: 7 });
    eq([v1.ok, s.drive.revokes], [true, ['F1a former@counsel.example']], 'a revoke for an address no longer recorded goes through');
    eq(s.ctx.unshareFolderForJob({ folderId: 'F2a', email: 'ann@lowe.law', jobId: 7 }).ok, false, 'but not on another client\'s folder');
    // Every one of them logged, refusals included, with the device's user.
    const rows = s.logRows();
    eq(rows[0], s.ctx.ACCESS_LOG_HEADER, 'the AccessLog tab is made with its header');
    eq(rows.length - 1, 14, 'one row for every share, refusal and revoke (14)');
    const col = (h) => rows[0].indexOf(h);
    eq([rows[1][col('Action')], rows[1][col('Result')], rows[1][col('Job ID')], rows[1][col('HVL ID')], rows[1][col('Folder or file ID')], rows[1][col('Name')], rows[1][col('Email')], rows[1][col('Device user')]],
       ['share', 'shared', '7', 'HVL-0007', 'F1a', 'Estate Inventory', 'ann@lowe.law', 'Ashley Jerome'], 'a share\'s row: what, its result, the client, the folder by id and name, the address, who');
    ok(rows.some((r) => r[col('Action')] === 'share' && /^refused: stranger@gmail.com/.test(r[col('Result')])), 'a refusal is logged with its reason');
    ok(rows.some((r) => r[col('Action')] === 'revoke' && r[col('Result')] === 'revoked'), 'a revoke is logged');
  });

  G('B2 · a trash goes only to a file inside the jobs folder, never a folder; logged', () => {
    const s = driveServer();
    const t = (id) => s.ctx.trashFileUnderRoot({ fileId: id, jobId: 7, by: 'Ashley Jerome' });
    eq(t('p1').ok, true, 'a photograph in a client\'s folder: trashed');
    eq(t('p2').ok, true, 'any client\'s, inside the jobs folder');
    const out = t('x1');
    eq([out.ok, out.error], [false, 'That file is not inside the Havellin jobs folder, so it was not trashed.'], '⚠⚠ a file outside the jobs folder: refused');
    const fold = t('F1');
    eq([fold.ok, /folder/.test(fold.error)], [false, true], '⚠⚠ a whole client folder: refused (only a file is ever trashed from the app)');
    eq(t('root').ok, false, 'the jobs folder itself: refused');
    eq(t('').ok, false, 'no id: refused');
    eq(s.drive.trashed, ['p1', 'p2'], 'only the two files went to the bin');
    const rows = s.logRows(), col = (h) => rows[0].indexOf(h);
    eq(rows.slice(1).map((r) => r[col('Action')] + ':' + String(r[col('Result')]).split(':')[0]), ['trash:trashed', 'trash:trashed', 'trash:refused', 'trash:refused', 'trash:refused', 'trash:refused'],
       'every trash and refusal logged');
    eq(rows[1][col('Name')], 'HVL-0007_INV_1.jpg', 'with the file\'s name');
    // The editor's sweeps keep the unscoped primitive.
    has(gsFn('dedupeFolderConfirm'), 'trashDriveFile(', 'the editor-only folder sweep still trashes through trashDriveFile');
  });

  G('B3 · the log finds its columns by header; a row it cannot write never stops the act', () => {
    const moved = fakeSheet('AccessLog', ['Email', 'When', 'Note by hand', 'Action', 'Result']);
    const s = driveServer({ accessLog: moved });
    s.ctx.trashFileUnderRoot({ fileId: 'p1', jobId: 7, by: 'Anthony Graziano' });
    const rows = moved._rows;
    ok(rows[0].slice(0, 5).join('|') === 'Email|When|Note by hand|Action|Result' && rows[0].indexOf('Device user') >= 5, 'the missing columns are added after the ones there');
    const r = rows[1], at = (h) => r[rows[0].indexOf(h)];
    eq([at('Action'), at('Result'), at('Note by hand'), at('Device user'), at('Email')], ['trash', 'trashed', '', 'Anthony Graziano', ''], 'each value under its own header, a column added by hand left blank');
    const broken = driveServer();
    broken.ctx.SpreadsheetApp = { openById: () => { throw new Error('Sheets down'); } };
    eq([broken.ctx.trashFileUnderRoot({ fileId: 'p1', jobId: 7 }).ok, broken.drive.trashed], [true, ['p1']], 'with the sheet unreachable the trash still goes (the log never stops the act it records)…');
    ok(broken.logs.some((l) => /AccessLog row not written \(Error: Sheets down\)/.test(l) && /"Folder or file ID":"p1"/.test(l)), '…and its row goes to the execution log instead');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  const ESIGN_FNS = ['esignSendRequestForJob', 'esignSendRequestEnvelope', '_dsRequestAnchor', '_dsTabs', '_jobFiduciariesGs', '_gsSameName',
    '_approvalRequestSubjectGs', '_jobOnSheet', 'getJobsFromSheet', '_jobListLiveGs', '_accessLog'];
  const ESIGN_VARS = ['SHEET_ID', 'ACCESS_LOG_TAB', 'ACCESS_LOG_HEADER', '_GS_DECEDENT_SERVICES', 'AGREEMENTS_EMAIL', 'DS_REQUEST_ANCHOR', 'DS_TAB_Y_OFFSET', 'DS_REQUEST_INIT_Y_OFFSET'];
  const esignServer = () => {
    const sent = [];
    const s = server({ fns: ESIGN_FNS, vars: ESIGN_VARS, stubs: { _dsApi: (m, p, env) => { sent.push(env); return { ok: true, body: { envelopeId: 'env-1', status: 'sent' } }; } } });
    s.sent = sent;
    return s;
  };
  const SIGNERS = [{ name: 'Thomas Ellison', email: 'tom@ellison.example', anchors: ['reqInit1', 'reqSig1', 'reqDate1'] },
                   { name: 'Catherine Ellison-Reyes', email: 'cat@ellison.example', anchors: ['reqInit2', 'reqSig2', 'reqDate2'] }];
  const REQ = (o) => Object.assign({ jobId: 7, by: 'Ashley Jerome', pdfBase64: 'JVBERi0xLjQK', filename: 'Release Approval Request – HVL-0007.pdf',
    subject: 'Release Approval Request', hvlId: 'HVL-0007', signers: SIGNERS, cc: ['ann@lowe.law', 'agreements@havellinpalmbeach.com'] }, o || {});
  G('C · the release request through DocuSign goes only to the client\'s recorded fiduciaries, copied only to agreements@ and the attorney', () => {
    let s = esignServer();
    const r = s.ctx.esignSendRequestForJob(REQ({ subject: 'URGENT: wire the funds', fileCopyEmail: 'thief@evil.example', blurb: 'click here' }));
    eq([r.ok, r.envelopeId, s.sent.length], [true, 'env-1', 1], 'the recorded fiduciaries in order, copies allowed: sent');
    const env = s.sent[0] || { recipients: { signers: [], carbonCopies: [] } };
    eq(env.recipients.signers.map((x) => [x.name, x.email, x.recipientId]), [['Thomas Ellison', 'tom@ellison.example', '1'], ['Catherine Ellison-Reyes', 'Cat@Ellison.example', '2']],
       'the names and addresses on the envelope are the sheet\'s');
    eq(env.recipients.carbonCopies.map((x) => x.email), ['agreements@havellinpalmbeach.com', 'ann@lowe.law'], 'copied to agreements@ and the estate attorney, never the caller\'s copy address');
    eq([env.emailSubject, env.emailBlurb], ['Havellin Palm Beach — Release Approval Request for 120 Via Bellaria', ''], '⚠⚠ the subject is built from the client, never the caller\'s; no blurb from the caller');
    const refusals = [
      ['a stranger in a signer\'s place', REQ({ signers: [SIGNERS[0], { name: 'Mallory', email: 'mallory@evil.example', anchors: ['reqSig2', 'reqDate2'] }] }), 'does not match the fiduciaries recorded'],
      ['the two signers swapped', REQ({ signers: [SIGNERS[1], SIGNERS[0]] }), 'does not match'],
      ['a recorded fiduciary left off', REQ({ signers: [SIGNERS[0]] }), 'Catherine Ellison-Reyes (recorded, not on the request)'],
      ['a fiduciary added on a device and not yet on the sheet', REQ({ signers: SIGNERS.concat([{ name: 'New Trustee', email: 'new@x.example', anchors: ['reqSig3', 'reqDate3'] }]) }), 'let the change save'],
      ['a copy to an address not recorded', REQ({ cc: ['ann@lowe.law', 'someone@else.example'] }), 'someone@else.example is not recorded on this client'],
      ['no client named', REQ({ jobId: '' }), 'The request names no client'],
      ['a client the sheet does not hold', REQ({ jobId: 99 }), 'This client is not on the sheet'],
      ['a living client', REQ({ jobId: 8 }), 'estate’s release request only'],
      ['a document that is not a PDF', REQ({ pdfBase64: 'PGh0bWw+' }), 'not a PDF'],
    ];
    refusals.forEach(([what, req, words]) => {
      s = esignServer();
      const out = s.ctx.esignSendRequestForJob(req);
      ok(out.ok === false && String(out.error).indexOf(words) >= 0 && s.sent.length === 0, '⚠ ' + what + ': refused by name, nothing sent (' + String(out.error).slice(0, 90) + ')');
    });
    s = esignServer();
    s.sheets.Jobs = jobsSheet([Object.assign({}, JOB7, { executorEmail: '' })]);
    has(s.ctx.esignSendRequestForJob(REQ()).error, 'Thomas Ellison has no email recorded on the sheet', 'a recorded fiduciary with no email: refused by name');
    // Logged: the send with its envelope, a refusal with its reason.
    s = esignServer();
    s.ctx.esignSendRequestForJob(REQ());
    s.ctx.esignSendRequestForJob(REQ({ cc: ['x@y.z'] }));
    const rows = s.logRows(), col = (h) => rows[0].indexOf(h);
    eq(rows.slice(1).map((x) => [x[col('Action')], String(x[col('Result')]).split(':')[0]]), [['esignSendRequest', 'sent'], ['esignSendRequest', 'refused']], 'each send and refusal is logged');
    has(rows[1][col('Result')], 'envelope env-1', 'with the envelope');
    has(rows[1][col('Email')], 'tom@ellison.example', 'and who it went to');
    // Dispatched through the wrapper, the unscoped sender kept for it.
    const post = noComments(gsFn('doPost'));
    has(post, "if (data.action === 'esignSendRequest') { return jsonOut(esignSendRequestForJob(data)); }", 'doPost sends the request through the client-bound wrapper');
    has(post, "if (data.action === 'trashFile')      { return jsonOut(trashFileUnderRoot(data)); }", 'a trash through its scoped form');
    has(post, "if (data.action === 'shareFolder')   { return jsonOut(shareFolderForJob(data)); }", 'a share through its scoped form');
    has(post, "if (data.action === 'unshareFolder') { return jsonOut(unshareFolderForJob(data)); }", 'a revoke through its scoped form');
    lacks(post, 'jsonOut(esignSendRequestEnvelope(', 'the unbound sender is reachable from no router');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('D · the server\'s copies of the app\'s rules are held equal: the estate services, the fiduciaries, the recorded addresses, the subject', () => {
    const A = sandbox({ fns: ['jobFiduciaries', 'invFiduciaryMode', 'isDecedentJob', 'jobListEntries', 'samePerson', 'canonPersonName', 'approvalRequestSubject', 'jobRecordedEmails'],
      vars: ['DECEDENT_SERVICES', 'PERSON_NAME_ALIASES', 'APPROVAL_REQ_TITLE'] });
    const s = server({ fns: ['_jobFiduciariesGs', '_gsSameName', '_jobListLiveGs', '_approvalRequestSubjectGs', '_jobRecordedEmails'], vars: ['_GS_DECEDENT_SERVICES'] });
    eq(Object.keys(s.ctx._GS_DECEDENT_SERVICES).sort(), Object.keys(A.DECEDENT_SERVICES).sort(), 'the estate services are the app\'s DECEDENT_SERVICES');
    const fixtures = [JOB7, JOB8, JOB9,
      { id: 10, svc: 'contested_probate', executor: '  Ruth   Adler ', executorEmail: ' ruth@a.example ', coFiduciaries: [{ id: 'a', name: 'ruth adler', email: 'dup@x' }, { id: '', name: 'No Id', email: 'n@x' }, { id: 'b', name: 'Daniel Adler', email: '' }] },
      { id: 11, serviceType: 'cleanout', executor: '', coFiduciaries: [{ id: 'a', name: 'Only Co', email: 'co@x' }] },
      { id: 12, svc: 'downsizing', executor: 'Not A Fiduciary', executorEmail: 'n@x', email: 'client@x' },
      { id: 13, svc: 'probate', addr: '', name: 'Estate of Quinn' }, { id: 14, svc: 'probate' }];
    fixtures.forEach((j) => {
      eq(JSON.parse(JSON.stringify(s.ctx._jobFiduciariesGs(j))), A.jobFiduciaries(j).map((f) => ({ name: f.name, email: String(f.email || '').trim() })), 'fiduciaries agree on client ' + j.id);
      eq(s.ctx._approvalRequestSubjectGs(j), A.approvalRequestSubject(j), 'the subject agrees on client ' + j.id);
      eq(JSON.parse(JSON.stringify(s.ctx._jobRecordedEmails(j))), A.jobRecordedEmails(j), 'the recorded addresses agree on client ' + j.id);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  const SRC = source();
  const LIVE = noComments(SRC);
  G('E · every request to the jobs backend carries the key, through one road; nothing else gets it', () => {
    const calls = [...LIVE.matchAll(/\bfetch\(\s*([^,)]*)/g)].map((m) => m[1].trim());
    const toJobs = calls.filter((a) => /SHEETS_SYNC_URL|^url$|_withDeviceKey/.test(a));
    eq(toJobs.filter((a) => a.indexOf('_withDeviceKey(') !== 0), [], '⚠⚠ no fetch reaches the jobs backend except through _withDeviceKey');
    // 27 since the merge with P1 (2026-10-27): P1's snapshot store added a GET reader, loadSnapshotLines, written before the key.
    eq(toJobs.length, 27, 'and there are 27 of them (every GET reader, P1\'s loadSnapshots among them, every POST, postSyncTo and _appsScriptPost)');
    const others = calls.filter((a) => toJobs.indexOf(a) < 0);
    ok(others.every((a) => /googleapis\.com|VENDOR_SYNC_URL|REFERRAL_SYNC_URL|^url$/.test(a) || a === ''), 'every other fetch goes to Gmail, Google sign-in or a directory backend (' + others.length + ')');
    lacks(LIVE.replace(/function _withDeviceKey[\s\S]*?\n}\n/, ''), "'deviceKey=", 'the parameter is spelled in one place');
    has(gsVar('DEVICE_KEY_PARAM'), "'deviceKey'", 'and the server reads it under the same name');
    // The road itself.
    const W = sandbox({ fns: ['_withDeviceKey', 'deviceKey'], stubs: { SHEETS_SYNC_URL: 'https://script.google.com/macros/s/AKf/exec' } });
    const U = 'https://script.google.com/macros/s/AKf/exec';
    eq(W._withDeviceKey(U + '?action=loadJobs'), U + '?action=loadJobs', 'no key on the device: the URL goes as it was');
    W.localStorage.setItem('hav_device_key', ' ab c&d ');
    eq([W._withDeviceKey(U + '?action=loadJobs'), W._withDeviceKey(U)], [U + '?action=loadJobs&deviceKey=ab%20c%26d', U + '?deviceKey=ab%20c%26d'], 'with one: added once, trimmed and escaped, after ? or &');
    eq([W._withDeviceKey('https://script.google.com/macros/s/VENDOR/exec'), W._withDeviceKey('https://gmail.googleapis.com/gmail/v1/users/me/drafts')],
       ['https://script.google.com/macros/s/VENDOR/exec', 'https://gmail.googleapis.com/gmail/v1/users/me/drafts'], '⚠ another URL never gets it (a directory backend, Gmail)');
    W.SHEETS_SYNC_URL = '';
    eq(W._withDeviceKey(U), U, 'and with no jobs URL set, nothing is a jobs URL');
    // Driven: the real requests, as they leave.
    const seen = [];
    const fakeFetch = (url, opts) => { seen.push({ url: String(url), body: opts && opts.body ? JSON.parse(opts.body) : null }); return { then() { return { then() { return { catch() { return { then() {} }; } }; }, catch() { return { then() {} }; } }; } }; };
    const D = sandbox({ fns: ['_withDeviceKey', 'deviceKey', 'postSyncTo', '_readAppsScriptJson', '_targetUrl', '_appsScriptPost', 'driveTrashFile', '_invShareEach', 'checkBackendVersion', 'loadJobs', 'refreshJobsFromCloud', '_syncWritesOutstanding', 'deviceUser'],
      vars: ['SYNC_TARGETS'], stubs: { SHEETS_SYNC_URL: U, VENDOR_SYNC_URL: 'https://script.google.com/macros/s/VENDOR/exec', REFERRAL_SYNC_URL: '', fetch: fakeFetch, document: domStub({}), migrateRetiredNames: (x) => x, _syncWriteSeq: 0 } });
    D.localStorage.setItem('hav_device_key', KEY);
    D.localStorage.setItem('hav_device_user', 'Ashley Jerome');
    D.postSyncTo('main', { type: 'saveAllJobs', payload: [] }); D.postSyncTo('vendor', { type: 'updateVendor' });
    D._appsScriptPost(U, { action: 'htmlToPdf' }, () => {}); D._appsScriptPost('https://script.google.com/macros/s/VENDOR/exec', { type: 'addVendor' }, () => {});
    D.driveTrashFile('p1', () => {}, 7); D._invShareEach(['F1a'], 'shareFolder', 'ann@lowe.law', () => {}, 7);
    D.checkBackendVersion(); D.loadJobs(); D.refreshJobsFromCloud();
    const enc = encodeURIComponent(KEY);
    const jobsUrls = seen.filter((x) => x.url.indexOf(U) === 0).map((x) => x.url);
    eq(jobsUrls.length, 7, 'seven requests to the jobs backend left (the two posters, a trash, a share, the probe and two reads of the client list)');
    ok(jobsUrls.every((u) => u.split('deviceKey=').length === 2 && u.endsWith('deviceKey=' + enc)), '⚠⚠ each carries the key exactly once');
    ok(seen.filter((x) => x.url.indexOf('VENDOR') >= 0).every((x) => x.url.indexOf('deviceKey') < 0), '⚠ the vendor directory\'s requests carry nothing');
    ok(seen.every((x) => !x.body || JSON.stringify(x.body).indexOf(KEY) < 0), 'and no body carries it');
    const trash = seen.find((x) => x.body && x.body.action === 'trashFile'), share = seen.find((x) => x.body && x.body.action === 'shareFolder');
    eq([trash && trash.body.jobId, trash && trash.body.by, share && share.body.jobId, share && share.body.by], [7, 'Ashley Jerome', 7, 'Ashley Jerome'], 'a trash and a share name the client and the device\'s user, for the server\'s rule and its log');
    has(fn('approvalRequestSendEsign'), "jobId: job.id, by: (typeof deviceUser === 'function') ? deviceUser() : ''", 'the DocuSign request names the client too');
  });

  G('E2 · the key is kept through a device clear, never shown, never in a notice', () => {
    const K = sandbox({ vars: ['LOCAL_JOB_DATA_KEYS', 'LOCAL_KEEP_KEYS'] });
    ok(K.LOCAL_KEEP_KEYS.test('hav_device_key') && !K.LOCAL_JOB_DATA_KEYS.test('hav_device_key'), '⚠ hav_device_key survives Clear this device, like the URL it unlocks');
    has(fn('saveSettings'), "localStorage.setItem('hav_device_key'", 'saveSettings writes it by the one literal');
    has(SRC, '<input type="password" id="set-device-key" autocomplete="off" autocapitalize="off" spellcheck="false">', 'Settings takes it in a masked box, never auto-capitalised or checked');
    const lines = LIVE.split('\n').filter((l) => /deviceKey\(\)/.test(l));
    eq(lines.filter((l) => /console\.|showSyncBadge\(|alert\(|_docNotice\(|innerHTML|textContent|Logger/.test(l)).map((l) => l.trim()), [], '⚠⚠ no line that shows or logs anything reads the key');
    const W = sandbox({ fns: ['deviceKeyBannerHtml', 'deviceKeyStatusText', '_pendingChipCopy', 'deviceKeyRefusedAs'], vars: ['SYNC_STUCK_TRIES'], stubs: { _pendingWrites: { a: { kind: 'key', lastError: REFUSED.missing, tries: 1 } } } });
    W.localStorage.setItem('hav_device_key', KEY);
    const shown = ['missing', 'wrong'].map((a) => W.deviceKeyBannerHtml(a)).concat(['ok', 'off', 'missing', 'wrong', 'old', 'unknown', ''].map((a) => W.deviceKeyStatusText(a, true)))
      .concat([JSON.stringify(W._pendingChipCopy())]);
    ok(shown.every((t) => t.indexOf('K7QM') < 0), 'no banner, status line or chip carries it');
    has(W.deviceKeyBannerHtml('missing'), 'This device has no key: ask Anthony', 'the banner says the device has no key');
    has(W.deviceKeyBannerHtml('wrong'), 'The key on this device is wrong: ask Anthony', 'or that its key is wrong');
    has(W.deviceKeyBannerHtml('missing'), 'onclick="openSettings()">Open Settings</button>', 'with the way to Settings');
    eq(['ok', 'off', 'old', '', 'unknown'].map((a) => W.deviceKeyBannerHtml(a)), ['', '', '', '', ''], 'and nothing while the device is let in, or the check is off, or not yet asked');
  });

  G('E3 · a refusal for the key is its own kind: held, never retried by itself, named on the chip and the banner', () => {
    const K = sandbox({ fns: ['_backendErrorKind', 'deviceKeyRefusedAs'] });
    eq([K._backendErrorKind(REFUSED.missing, true, { type: 'saveAllJobs' }), K._backendErrorKind(REFUSED.wrong, true, { action: 'htmlToPdf' })], ['key', 'key'], '⚠⚠ both of the server\'s refusals read as the key, on a write and on an action');
    eq([K.deviceKeyRefusedAs(REFUSED.missing), K.deviceKeyRefusedAs(REFUSED.wrong), K.deviceKeyRefusedAs('Unknown type: x')], ['missing', 'wrong', ''], 'and which one');
    eq(K._backendErrorKind(REFUSED.missing, false), '', 'only words the server sent can say so');
    eq([K._backendErrorKind('Unknown action', true, { type: 'saveAllJobs' }), K._backendErrorKind('Unknown type: saveMedia', true)], ['route', 'stale'], 'the other kinds are as they were');
    // Through the real queue.
    const timers = [], noted = [];
    const Q = sandbox({ fns: ['_enqueueWrite', '_backendErrorKind', '_writeKey', '_pendingChipCopy', 'deviceKeyRefusedAs', '_noteDeviceKeyRefusal', '_writeKindHolds'],
      vars: ['SYNC_STUCK_TRIES', '_pendingWrites'], stubs: { showSyncBadge() {}, updatePendingIndicator() {}, _scheduleRetry() { timers.push('retry'); }, _noteDeviceKeyAnswer: (a) => noted.push(a) } });
    Q._enqueueWrite('main', { type: 'saveAllJobs', payload: [] }, 'ok', 'Sync failed', REFUSED.missing, null, true);
    const w = Q._pendingWrites['main/saveAllJobs'];
    eq([w && w.kind, w && w.blocked, timers.length], ['key', true, 0], '⚠⚠ held, and no retry scheduled: the same request is refused the same way until the key is typed');
    const chip = Q._pendingChipCopy();
    eq(chip.head, '⚠ 1 change not saved — this device has no key: ask Anthony', 'the chip says so, first');
    has(chip.note, 'type it in Settings (Device key, under the Apps Script URL) and press Save Settings', 'and what to do');
    has(chip.note, 'do not close or reload it', 'and that the work is only in this tab until then');
    eq(noted, ['missing'], 'the banner is told');
    Q._enqueueWrite('main', { type: 'job', payload: { id: 7 } }, 'ok', 'Sync failed', REFUSED.wrong, null, true);
    has(Q._pendingChipCopy().head, 'the key on this device is wrong: ask Anthony', 'a wrong key reads as wrong');
    has(fn('retryPendingWrites'), "_pendingWrites[k].blocked = false", 'a deliberate retry (Save Settings with the key) sends what was held');
  });

  G('E4 · a read the Apps Script refuses is not a read: the cache stays, the state is unreachable, the banner says why', () => {
    const noted = [];
    let answer = null;
    const thenable = (v) => ({ then(f) { const r = f(v); return thenable(r); }, catch() { return thenable(v); } });
    const L = sandbox({ fns: ['loadJobs', '_withDeviceKey', 'deviceKey', '_noteDeviceKeyRefusal', 'deviceKeyRefusedAs', 'loadJobsVerdict', 'sheetVerdictRefusal', '_setSheetNotice', 'sheetNoticeHtml', 'sheetDropsTaken', '_sheetKeptOnce', 'sheetKeptText'], vars: ['_jobsState', 'SHEET_NO_CLIENTS_TXT', '_sheetNotice', '_sheetKeptSaid'],
      stubs: { SHEETS_SYNC_URL: 'https://s/exec', DRIVE_FOLDER_ID: '', document: domStub({}), migrateRetiredNames: (x) => x, rebuildDropdowns() {}, showSyncBadge() {},
        _purgeLocalJobRecords() {}, _jobsLanded() {}, _noteDeviceKeyAnswer: (a) => noted.push(a), fetch: () => thenable({ json: () => answer }) } });
    L.localStorage.setItem('havellin_jobs_v3', JSON.stringify([{ id: 7, name: 'Ellison' }]));
    answer = { ok: false, success: false, deviceKey: 'missing', error: REFUSED.missing };
    L.loadJobs();
    eq([L.jobs.length, L._jobsState, JSON.parse(L.localStorage.getItem('havellin_jobs_v3')).length], [1, 'offline', 1], '⚠⚠ refused: the cached client stays, and the list reads as unreachable, never as the sheet\'s word');
    eq(noted, ['missing'], 'and the banner is told why');
    answer = { ok: true, jobs: [{ id: 7 }, { id: 8 }], deletedJobs: [] };
    L.loadJobs();
    eq([L.jobs.length, L._jobsState], [2, 'ready'], 'an answer with the list is read as before');
    const E = sandbox({ fns: ['loadEstimateState', '_withDeviceKey', 'deviceKey'], vars: ['_estStoreState'],
      stubs: { SHEETS_SYNC_URL: 'https://s/exec', document: domStub({}), migrateRetiredNames: (x) => x, rebuildDropdowns() {}, showSyncBadge() {}, _estStoreLanded() {}, fetch: () => thenable({ json: () => answer }) } });
    answer = { ok: false, error: REFUSED.wrong };
    try { E.loadEstimateState(); } catch (e) {}
    eq(E._estStoreState, 'offline', 'the estimates likewise: refused is unreachable');
    has(fn('refreshJobsFromCloud'), "_noteDeviceKeyRefusal(data.error)", 'and the client list\'s refresh tells the banner when the key is turned away mid-session');
  });

  G('E5 · the probe says where the device stands; a key typed in Settings is sent at once, and an accepted one offers the reload, never fires it', () => {
    const noted = [];
    const P = sandbox({ fns: ['checkBackendVersion', '_withDeviceKey', 'deviceKey'], vars: ['BACKEND_NEEDS', 'BACKEND_NEEDS_TYPES', 'BACKEND_MIN_VERSION', '_backendVersion', '_backendActions'],
      stubs: { SHEETS_SYNC_URL: 'https://s/exec', _showBackendStaleBanner() {}, _noteDeviceKeyAnswer: (a) => noted.push(a),
        fetch: () => ({ then(f) { const r = f({ json: () => P.__answer }); return { then(g) { g(r); return { catch() {} }; } }; } }) } });
    P.__answer = { ok: true, version: '2026-10-27b', actions: [], types: [], deviceKey: 'missing' }; P.checkBackendVersion();
    P.__answer = { ok: true, version: '2026-10-26c', actions: [], types: [] }; P.checkBackendVersion();
    eq(noted, ['missing', 'old'], 'the probe\'s answer, and "old" for a deployment that checks no key');
    // Settings: the masked box holds the stored key; Save stores a changed one and asks again; an unchanged one asks nothing.
    const changed = [];
    const dom = domStub({ 'set-sheets-url': 'https://s/exec', 'set-device-key': '', 'set-drive-id': '', 'set-device-user': '' });
    const S = sandbox({ fns: ['saveSettings', 'openSettings', 'deviceKey', '_paintDeviceKeyStatus', 'deviceKeyStatusText'], vars: ['COST_RATES_DEFAULT', 'COST_RATE_FIELDS', 'COST_RATES', '_deviceKeyAnswer'],
      stubs: { document: dom, SHEETS_SYNC_URL: '', DRIVE_FOLDER_ID: '', VENDOR_SYNC_URL: '', REFERRAL_SYNC_URL: '', GMAIL_CLIENT_ID: '', GMAIL_CLIENT_ID_DEFAULT: 'x', REQUIRE_WALKTHROUGH_NOTES: false,
        TC_ONSITE_ALPHA: 0.5, calcAll() {}, _paintDeviceUserNote() {}, showSyncBadge() {}, loadVendorDirectory() {}, loadReferralDirectory() {}, setVendorDirStatus() {}, setReferralDirStatus() {},
        vendorDirectory: [], referralDirectory: [], deviceUser: () => '', deviceUserOptionsHtml: () => '', esignProviderKey: () => 'docusign', _deviceKeyChanged: () => changed.push(1) } });
    dom.getElementById('set-device-key').value = '  ' + KEY + ' ';
    S.saveSettings();
    eq([S.localStorage.getItem('hav_device_key'), changed.length], [KEY, 1], 'a key typed is stored, trimmed, and the Apps Script asked again');
    S.saveSettings();
    eq(changed.length, 1, 'saving again with the same key asks nothing');
    dom.getElementById('set-device-key').value = 'other';
    S.openSettings();
    eq(dom.getElementById('set-device-key').value, KEY, 'opening Settings fills the masked box with the key held, so Save keeps it');
    eq(dom.getElementById('set-device-key-status').textContent, 'Not checked yet: saved on this device.', 'and the line under it says what the Apps Script last said');
    // ⚠⚠ The answer after a key typed: refused before, accepted now. THE PAGE NEVER RELOADS ITSELF (P2's review, 2026-10-27): the
    // banner turns green and offers Reload from the sheet, the person presses it, and the press refuses by name while a reload
    // would throw anything away (the queue, a debounced inventory save, a DocuSign send out, an agent at work).
    const reloads = [], retried = [], badges = [];
    const rdom = domStub({});
    const R = sandbox({ fns: ['_noteDeviceKeyAnswer', '_deviceKeyChanged', 'deviceKeyReloadNow', 'deviceKeyReloadBusy', '_paintDeviceKeyBanner', '_paintDeviceKeyStatus', 'deviceKeyBannerHtml', 'deviceKeyStatusText', 'deviceKey'],
      vars: ['_deviceKeyAnswer', '_deviceKeyRecheck', '_deviceKeyReloadOwed'], stubs: { document: rdom, showSyncBadge: (m) => badges.push(m), checkBackendVersion() {},
        retryPendingWrites: () => retried.push(1), _pendingCount: () => R.__pending || 0, _syncWritesOutstanding: () => (R.__pending || 0) > 0,
        _invSyncTimer: {}, _approvalEsignOut: {}, _agRun: {}, _arRun: {}, _avRun: {},
        setTimeout: (f) => f(), location: { reload: () => reloads.push(1) } } });
    const banner = () => String(rdom.getElementById('device-key-banner').innerHTML || '');
    const why = () => String(rdom.getElementById('device-key-reload-why').textContent || '');
    R._noteDeviceKeyAnswer('missing');
    R._deviceKeyChanged();
    R._noteDeviceKeyAnswer('ok');
    eq([reloads.length, R._deviceKeyReloadOwed], [0, true], '⚠⚠ refused before, accepted now: the reload is owed and NOT fired');
    has(banner(), 'Key accepted ✓', 'the banner says the key is accepted');
    has(banner(), 'onclick="deviceKeyReloadNow()">Reload from the sheet</button>', 'and offers the reload as a press');
    has(String(rdom.getElementById('device-key-banner').style.cssText || ''), 'var(--ok-tx)', 'in green, not the refusal\'s red');
    has(badges[badges.length - 1], 'press Reload from the sheet', 'the badge points at it');
    R.__pending = 2;
    eq([R.deviceKeyReloadNow(), reloads.length], [false, 0], '⚠⚠ pressed with changes still on their way: refused, nothing reloaded');
    has(why(), 'Not reloaded: changes made here have not reached the sheet yet', 'and the banner says why');
    R.__pending = 0;
    R._invSyncTimer[7] = 41;
    eq([R.deviceKeyReloadNow(), reloads.length], [false, 0], '⚠ a debounced inventory save waiting: refused');
    has(why(), 'an inventory change is about to be sent', 'named');
    R._invSyncTimer[7] = 0;
    R._approvalEsignOut[7] = true;
    eq([R.deviceKeyReloadNow(), reloads.length], [false, 0], '⚠ a DocuSign request waiting on its answer (its envelope is recorded only in the answer): refused');
    has(why(), 'waiting on its answer', 'named');
    delete R._approvalEsignOut[7];
    ['_agRun', '_arRun', '_avRun'].forEach((m) => {
      R[m][7] = { running: true };
      eq([R.deviceKeyReloadNow(), reloads.length], [false, 0], 'an agent at work (' + m + '): refused');
      R[m][7] = { running: false };
    });
    eq([R.deviceKeyReloadNow(), reloads.length, R._deviceKeyReloadOwed], [true, 1, false], 'nothing in flight: the press reloads, once');
    R.__pending = 2;
    R._noteDeviceKeyAnswer('wrong'); R._deviceKeyChanged(); R._noteDeviceKeyAnswer('ok');
    eq(retried.length, 1, 'with changes held, a key typed sends them with the new key');
    eq([reloads.length, R._deviceKeyReloadOwed], [1, true], 'and the reload is owed again, not fired');
    has(R.deviceKeyBannerHtml('wrong', true), 'The key on this device is wrong', 'a refusal after it turns the banner red again, whatever is owed');
    R.__pending = 0; R.deviceKeyReloadNow();
    R._noteDeviceKeyAnswer('ok'); R._deviceKeyChanged(); R._noteDeviceKeyAnswer('ok');
    eq([reloads.length, R._deviceKeyReloadOwed, R.deviceKeyBannerHtml('ok', R._deviceKeyReloadOwed)], [2, false, ''], 'a key changed on a device that was never refused owes nothing and draws no banner');
  });

  G('E5b · the review\'s sequence on the real queue: a write in the outbox when the key is accepted, an unrelated retry hours later; nothing reloads by itself', () => {
    // A synchronous thenable that unwraps like a resolved or rejected promise (the harness's rule for a thenable).
    class SyncP {
      constructor(ok, v) { this.ok = ok; this.v = v; }
      static resolve(v) { return new SyncP(true, v); }
      static reject(e) { return new SyncP(false, e); }
      then(f, r) { try { if (this.ok) return f ? SyncP.resolve(f(this.v)) : this; return r ? SyncP.resolve(r(this.v)) : this; } catch (e) { return SyncP.reject(e); } }
      catch(r) { return this.then(null, r); }
    }
    const timers = [], answers = [], badges = [];
    let reloads = 0;
    const Q = sandbox({
      fns: ['_noteDeviceKeyAnswer', '_deviceKeyChanged', '_syncWritesOutstanding', '_flushOutbox', 'queuedPostSync', '_writeKey', 'flushPendingWrites',
            '_enqueueWrite', '_backendErrorKind', '_noteDeviceKeyRefusal', 'deviceKeyRefusedAs', '_pendingCount', 'retryPendingWrites',
            'deviceKeyReloadNow', 'deviceKeyReloadBusy', 'deviceKeyBannerHtml', '_paintDeviceKeyBanner', '_writeKindHolds'],
      vars: ['_pendingWrites', '_retryStep', '_flushing', '_outbox', '_outboxTimer', '_outboxSending', '_OUTBOX_WINDOW', '_syncWriteSeq',
             '_deviceKeyAnswer', '_deviceKeyRecheck', '_deviceKeyReloadOwed'],
      stubs: {
        SHEETS_SYNC_URL: 'https://script.google.com/macros/s/X/exec', document: domStub({}),
        setTimeout: (f) => { timers.push(f); return timers.length; }, clearTimeout: () => {},
        location: { reload: () => { reloads++; } }, showSyncBadge: (m) => badges.push(m), updatePendingIndicator: () => {},
        _paintDeviceKeyStatus: () => {}, checkBackendVersion: () => {},
        _retrySoon: () => {}, _scheduleRetry: () => {}, _applyDroppedJobs: () => {},
        postSyncTo: () => (answers.shift() || 'ok') === 'ok' ? SyncP.resolve({ ok: true }) : SyncP.reject(new Error('Failed to fetch')),
      },
    });
    const runTimers = () => { let n = 0; while (timers.length && n++ < 50) timers.shift()(); };
    Q._noteDeviceKeyAnswer('missing');
    Q._deviceKeyChanged();
    Q.queuedPostSync({ type: 'saveAllJobs', payload: [] }, 'Synced', 'Sync failed');
    Q._noteDeviceKeyAnswer('ok');
    eq([reloads, Q._deviceKeyReloadOwed], [0, true], 'the key accepted with a write in the outbox: owed, nothing reloaded');
    answers.push('ok'); runTimers();
    eq([reloads, Q._syncWritesOutstanding()], [0, false], '⚠⚠ the outbox write lands: still nothing reloads by itself');
    answers.push('throw');
    Q.queuedPostSync({ type: 'saveAllJobPlans', payload: {} }, 'Saved', 'Not saved');
    runTimers();
    ok(Q._pendingCount() >= 1, 'hours later a write fails on a dropped connection and waits to be retried');
    eq(Q.deviceKeyReloadNow(), false, 'the press is refused while it waits');
    answers.push('ok'); Q.flushPendingWrites(); runTimers();
    eq([Q._pendingCount(), reloads], [0, 0], '⚠⚠ the retry lands: the page is NOT reloaded under whoever is working (the first build reloaded here)');
    eq([Q.deviceKeyReloadNow(), reloads], [true, 1], 'and the person\'s own press reloads it, once nothing is on its way');
    // The source: the one reload the key owes is the press's; neither queue asks the key about anything.
    ['flushPendingWrites', '_flushOutbox', '_noteDeviceKeyAnswer', '_deviceKeyChanged'].forEach((n) => lacks(noComments(fn(n)), 'location.reload', n + ' reloads nothing'));
    ['flushPendingWrites', '_flushOutbox'].forEach((n) => lacks(noComments(fn(n)), 'deviceKey', n + ' asks nothing about the key'));
    has(noComments(fn('deviceKeyReloadNow')), 'location.reload()', 'the press is the one that reloads');
  });

  G('E6 · Share w/ Counsel asks the recorded-address rule before it posts', () => {
    const posted = [], alerts = [];
    const C = sandbox({ fns: ['shareInventoryWithCounsel', 'jobRecordedEmails', 'jobListEntries'],
      stubs: { jobs: [JOB7], SHEETS_SYNC_URL: 'https://s/exec', window: { prompt: () => C.__typed }, alert: (m) => alerts.push(m),
        _invShareFolders: (job, cb) => cb(['F1a']), _invShareEach: (ids, a, e) => posted.push(e) } });
    C.__typed = 'stranger@gmail.com';
    C.shareInventoryWithCounsel(7);
    eq(posted, [], '⚠ an address recorded on no part of the client is never posted');
    has(alerts[0] || '', 'stranger@gmail.com is not an email recorded on this client, so nothing was shared', 'and says so, with where to add it');
    C.__typed = ' CAT@ellison.example ';
    C.shareInventoryWithCounsel(7);
    eq(posted, ['CAT@ellison.example'], 'a co-representative\'s address goes');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // The merge with P1 (2026-10-27): the two packs change the same request helpers. Every read P1 added rides the key, a key refusal
  // and a record too large for the sheet are each their own kind, the chip names the key first (its writes live in the open tab),
  // and a record too large, which the chip says is safe to reload over, never holds the key's Reload from the sheet for good.
  G('M · merged with P1: the snapshot read rides the key; the key and the too-large record each their own kind; neither blocks the other', () => {
    const thenable = (v) => ({ then(f) { const r = f(v); return thenable(r); }, catch() { return thenable(v); } });
    const urls = [], noted = [];
    let answer = null;
    const S = sandbox({ fns: ['loadSnapshotLines', '_snapLinesOf', '_snapLinesPut', '_withDeviceKey', 'deviceKey', '_noteDeviceKeyRefusal', 'deviceKeyRefusedAs'], vars: ['_snapLines'],
      stubs: { SHEETS_SYNC_URL: 'https://script.google.com/macros/s/AKf/exec', _noteDeviceKeyAnswer: (a) => noted.push(a), fetch: (u) => { urls.push(u); return thenable({ json: () => answer }); } } });
    S.localStorage.setItem('hav_device_key', 'ABCD-EFGH-JKLM-NPQR');
    answer = { ok: false, success: false, deviceKey: 'wrong', error: REFUSED.wrong };
    let got = null;
    S.loadSnapshotLines(7, (ok_) => { got = ok_; });
    ok(/[?&]deviceKey=ABCD-EFGH-JKLM-NPQR/.test(urls[0] || ''), '⚠⚠ P1\'s snapshot read carries the key (' + (urls[0] || 'none') + ')');
    eq([got, noted], [false, ['wrong']], 'and a refusal for the key is told to the banner as one, the read failing');
    answer = { ok: true, snapshots: { 111: { items: [{ itemNo: 1 }] } } };
    S.loadSnapshotLines(7, (ok_) => { got = ok_; });
    eq([got, (S._snapLinesOf(7, 111) || []).length], [true, 1], 'an answer with the lines is read as before');

    const K = sandbox({ fns: ['_backendErrorKind'] });
    eq([K._backendErrorKind(REFUSED.missing, true), K._backendErrorKind(REFUSED.wrong, true), K._backendErrorKind('TOO_LARGE: Ellison Estate is 81,554 characters', true),
        K._backendErrorKind('JOBS_TAB_EMPTY: the Jobs tab is empty', true)], ['key', 'key', 'toolarge', 'empty'], 'a key refusal, a record too large and an empty tab: each its own kind');

    const C = sandbox({ fns: ['_pendingChipCopy', '_tooLargeWords'], vars: ['_pendingWrites'] });
    C._pendingWrites['saveAllJobs|main'] = { kind: 'toolarge', body: { type: 'job', payload: { id: 1, name: 'Ellison Estate', hvlId: 'HVL-260' } }, lastError: 'TOO_LARGE: Ellison Estate (HVL-260) is 81554 characters' };
    has(C._pendingChipCopy().head, 'too large for the sheet', 'a record too large alone: the chip names it');
    C._pendingWrites['saveAllLogs|main'] = { kind: 'key', body: { type: 'saveAllLogs' }, lastError: REFUSED.missing };
    const both = C._pendingChipCopy();
    has(both.head, 'this device has no key: ask Anthony', '⚠⚠ with a write held for the key beside it, the chip names the key first');
    has(both.note, 'do not close or reload it', 'and keeps its "do not close or reload", never the too-large record\'s "reloading is safe"');

    const B = sandbox({ fns: ['deviceKeyReloadBusy', '_syncWritesOutstanding'], vars: ['_pendingWrites', '_outbox', '_outboxSending', '_flushing'],
      stubs: { _invSyncTimer: {}, _approvalEsignOut: {}, _agRun: {}, _arRun: {}, _avRun: {} } });
    eq(B.deviceKeyReloadBusy(), '', 'nothing queued: the reload may go');
    B._pendingWrites['saveAllJobs|main'] = { kind: 'toolarge', blocked: true, body: { type: 'saveAllJobs' } };
    eq(B.deviceKeyReloadBusy(), '', '⚠⚠ only a record too large for the sheet (never sent again, safe to reload over): it never holds the key\'s reload');
    B._pendingWrites['saveAllLogs|main'] = { kind: 'key', blocked: true, body: { type: 'saveAllLogs' } };
    has(B.deviceKeyReloadBusy(), 'have not reached the sheet yet', 'but a write held for the key beside it does');
    delete B._pendingWrites['saveAllLogs|main'];
    B._outbox['saveAllLogs|main'] = { type: 'saveAllLogs' };
    has(B.deviceKeyReloadBusy(), 'have not reached the sheet yet', 'and so does a write still in the outbox');

    const R = fn('refreshJobsFromCloud');
    ok(R.indexOf('_noteDeviceKeyRefusal(data.error)') > R.indexOf('loadJobsVerdict(data, jobs'), 'the jobs refresh asks P1\'s verdict first and tells the banner of a key refusal in the branch with no list');
    has(fn('loadJobsVerdict'), '/JOBS_TAB_EMPTY/', 'and the verdict reads only the empty tab as the sheet\'s notice, never a key refusal');
  });

  G('F · the deployment, the banner, the documents and the statement', () => {
    // RESTATED on the merge with P1 (2026-10-27): P2's deployment is 2026-10-27c, carrying P1's 2026-10-27b. RESTATED again on the
    // merge with P5: its 2026-10-27d carries this one, its own gap leads the line, and the open URL follows at once under 2026-10-27c.
    ok(((GS.match(/var BACKEND_VERSION = '([^']+)'/) || [])[1] || '') >= '2026-10-27c', 'main-sync.gs is 2026-10-27c or later');
    const B = sandbox({ vars: ['BACKEND_MIN_VERSION', 'BACKEND_FEATURE_COST'] });
    ok(B.BACKEND_MIN_VERSION >= '2026-10-27c', 'the app relies on it: an older deployment draws the banner');
    const _v = B.BACKEND_FEATURE_COST.version, _open = '; on a deployment older than 2026-10-27c, anyone who holds the Apps Script URL can read every client';
    // RESTATED again for P7 (2026-10-27e): its gap leads, P5's follows under 2026-10-27d, and the open URL at once after that.
    const _d = _v.indexOf('; on a deployment older than 2026-10-27d, ');
    ok(_v.indexOf(_open) > 0 && (_v.indexOf(_open) === _v.indexOf('; on a deployment older than ') || (_d >= 0 && _v.indexOf('; on a deployment older than ', _d + 1) === _v.indexOf(_open))),
      'which names the open URL first after the newer gaps, by consequence and by its vintage');
    const docs = ['manual.html', 'MANUAL.md', 'concierge-guide.html', 'CONCIERGE_GUIDE.md'].map((f) => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]);
    docs.forEach(([f, t]) => { has(t, 'This device has no key: ask Anthony', f + ' names the refusal as the app words it'); has(t, 'Device key', f + ' names the box'); });
    docs.slice(0, 2).forEach(([f, t]) => { has(t, 'HAVELLIN_DEVICE_KEY', f + ' names the Script Property'); has(t, 'AccessLog', f + ' names the log'); has(t, 'suggestDeviceKey', f + ' names the editor helper'); });
    // P2's review: the page never reloads itself (the docs name the press), and the key is typed on every device before it is switched
    // on, in the words Settings prints while the check is off.
    docs.forEach(([f, t]) => { has(t, 'Reload from the sheet', f + ' names the reload press'); lacks(t, 'reloads from the sheet by itself', f + ' never says the page reloads by itself'); });
    const offTyped = sandbox({ fns: ['deviceKeyStatusText'] }).deviceKeyStatusText('off', true);
    docs.slice(0, 2).forEach(([f, t]) => {
      const typed = t.indexOf(offTyped.replace(/\.$/, '')), on = t.indexOf('Switch it on last');
      ok(typed > 0 && on > typed, f + ' types the key on every device (Settings: "' + offTyped + '") before the property is set');
    });
    const st = fs.readFileSync(path.join(ROOT, 'legal', 'Havellin_Data_Handling_Statement_v1.0.md'), 'utf8');
    let bundle_ = '';
    has(st, 'Drafted, not reviewed', 'the data-handling statement says it is a draft');
    ok(/Anthropic[\s\S]{0,1400}\[To be confirmed: Anthropic's commercial terms on retention/.test(st), '⚠ and marks the Anthropic API\'s retention terms as to be confirmed, never stated');
    // ⚠ Two claims the first draft made that the code did not bear out (P2's review): every file removed from Drive logged, and no
    // client name sent to Anthropic. Each sentence now held to the code that makes it true.
    lacks(st, 'each file removed from Drive is written to an access log', '⚠ the statement no longer claims every removal is logged');
    ok(/_accessLog\(/.test(noComments(gsFn('trashFileUnderRoot'))), 'the code: a photograph a person bins is logged');
    ok(!/_accessLog\(/.test(noComments(gsFn('_fileBlobByName'))) && /setTrashed\(true\)|trashDriveFile\(/.test(noComments(gsFn('_fileBlobByName'))), 'the code: a re-filing trashes its older copy unlogged');
    has(st, 'A photograph a person removes from a room in the application is written to the same log', 'and the statement says the first');
    has(st, 'goes to Drive\'s bin without an entry in the log', 'and the second');
    lacks(st, 'No client name, address or contact detail is sent', '⚠ the statement no longer claims no name is ever sent');
    has(noComments(fn('_agContext')), 'mustFind:', 'the code: Agent One is sent the must-find list');
    has(st, 'the list of items the family asked us to find', 'and the statement names it among what is sent');
    has(st, 'that name goes with it', 'and says a note, a description or the list goes as written, a person\'s name included');
    has(bundle_ = fs.readFileSync(path.join(ROOT, 'COUNSEL_REVIEW_BUNDLE.md'), 'utf8'), 'Corrected on review the same day', 'the counsel bundle says what was corrected');
    lacks(st, 'insured and bonded', 'it claims no coverage that is still being placed');
    has(bundle_, 'legal/Havellin_Data_Handling_Statement_v1.0.md', 'the counsel bundle lists it');
  });
};
