'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P6 of the desk audit (2026-10-27): TWO DEVICES, STOP THE LOSSES NOW. audits/2026-10-27-desk/PLAN.md, P6; findings SYN-10,
// SYN-06, SYN-18, SYN-05, SYN-16, and SYN-01 and SYN-02 contained until the merge itself is fixed (P18).
//
// What the audit drove on two real pages over one sheet whose manifest merges through the real server merge: a stale Qty
// edit on the iPad wiped Anthony's typed name, his $1,250 dealer quote, his grade and his tick (SYN-01); a stale Name 24
// shots brought back eight lines the other device had removed, named and valued (SYN-02); a Court Inventory printed off this
// device's copy missed the other device's $275 while the sends read the sheet first (SYN-10); a name typed one second before a
// reload never reached the sheet, and a failed write was never sent again after a reload (SYN-06); the chip said "1 unsaved
// change" for any number of edits (SYN-18); and the desk redrew on a timer and after every edit while the sheet was slow,
// cutting a name mid-word, saving it and sending it to Agent Two (SYN-05).
//
// The two-device groups below are that rig turned into tests: the WHOLE of saveInventory.gs and main-sync.gs evaluated as
// deployed over the fake sheet (tests/sheet-rig.js), and two desks built from the real code in havellin.html (the sync queue,
// the manifest's read and merge, the read-first gate, the agents' naming run, the bulk bar), their fetch answered by the
// server's real doGet and doPost through a synchronous promise and a virtual clock. Agent One's answer is the one thing
// stubbed (by photograph, as the audit's harness answered it). Browser step 121 drives the same on two real pages.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sandbox, source, fn, decl, domStub } = require('./harness');
const { server, SP, mk } = require('./sheet-rig');

const SRC = source();
const ROOT = path.join(__dirname, '..');
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
const live = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
// Every top-level function and var a set of roots reaches, short of the boundaries (approval-pinned.test.js's lifter).
function closure(roots, stop) {
  const stopSet = new Set(stop || []);
  const fns = new Set(), vars = new Set();
  const queue = roots.map((r) => ['f', r]);
  while (queue.length) {
    const [k, name] = queue.shift();
    if (stopSet.has(name)) continue;
    let body;
    if (k === 'f') { if (fns.has(name)) continue; fns.add(name); try { body = codeOnly(fn(name)); } catch (e) { continue; } }
    else { if (vars.has(name)) continue; vars.add(name); try { body = codeOnly(decl(name)); } catch (e) { continue; } }
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/[(,]\s*([A-Za-z_$][\w$]*)\s*[,)]/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) if (ALL_VARS.has(m[1]) && !stopSet.has(m[1])) queue.push(['v', m[1]]);
  }
  return { fns: [...fns].filter((n) => ALL_FNS.has(n)), vars: [...vars] };
}
function lift(roots, stop, stubs) {
  const c = closure(roots, (stop || []).concat(Object.keys(stubs || {})));
  return sandbox({ fns: c.fns, vars: c.vars, stubs: stubs || {} });
}
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.stack || e).split('\n').slice(0, 3).join(' | ') }; } }

// ── The clock: one for both devices and the server, a millisecond further on every read, timers fired by run(ms) ──
const NOW = 1790000000000;
function clockOf() {
  const c = { t: NOW, timers: [] };
  c.Date = class extends Date { constructor(...a) { if (a.length) super(...a); else super(c.t); } static now() { return c.t++; } };
  c.setTimeout = (f, ms) => { const t = { at: c.t + (ms || 0), f, id: c.timers.length + 1 }; c.timers.push(t); return t.id; };
  c.clearTimeout = (id) => { const t = c.timers.find((x) => x.id === id); if (t) t.dead = true; };
  c.run = (ms) => {
    const end = c.t + (ms || 0);
    for (let guard = 0; guard < 20000; guard++) {
      const due = c.timers.filter((t) => !t.dead && !t.done && t.at <= end).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      c.t = Math.max(c.t, due.at); due.done = true; due.f();
    }
    c.t = Math.max(c.t, end);
  };
  return c;
}

// ── Fixtures: a trust estate, 24 Items photographs straight off the field, none named ──
const J = NOW - 86400000;
const SYNC = 'https://sync.example.test/exec';
const JOB = () => ({ id: J, hvlId: 'HVL-2610-A9700', name: 'Estate of Walter Price', svc: 'cleanout', matterType: 'trust', status: 'active',
  won: true, docTier: 'values', executor: 'Daniel Price', executorRole: 'Successor Trustee', executorEmail: 'dan@example.com',
  trustName: 'Price Family Trust', deathDate: '2026-06-01', tc: 'Ashley Jerome', updatedAt: J + 1000, at: {} });
const ROOMS = ['Living Room', 'Dining Room', 'Kitchen', 'Primary Bedroom', 'Guest Bedroom', 'Garage'];
const T = NOW - 3 * 3600000;
function shots(n) {
  const out = [];
  for (let k = 0; k < n; k++) out.push({ stableId: 's' + k, label: 'inventory', roomIdx: k % ROOMS.length, seq: k + 1, itemNo: k + 1, status: 'uploaded',
    category: '', disposition: '', objectName: '', ts: T + k * 30000, updatedAt: T + k * 30000, filename: 'HVL_9700_INV_' + k + '.jpg',
    driveFileId: 'fileid' + String(k).padStart(6, '0'), driveFileUrl: 'https://drive.google.com/file/d/fileid' + String(k).padStart(6, '0') + '/view' });
  return out;
}
// What Agent One answers, by photograph, as the audit's harness answered it.
const CATALOGUE = [
  { name: 'Tufted linen three-seat sofa', category: 'Furniture', qty: 1 },
  { name: 'Pair of brass table lamps with pleated shades', category: 'General/Household', qty: 2 },
  { name: 'White porcelain dinner plates', category: 'General/Household', qty: 8 },
  { name: 'Box of hardcover novels', category: 'Books & Media', qty: 1 },
  { name: 'Sterling silver candlesticks, Gorham', category: 'Silver & Precious Metal', qty: 2 },
  { name: 'Wool area rug, Persian style, about 8 x 10', category: 'Rugs & Textiles', qty: 1 },
];
function identify(body) {
  const results = {};
  (body.shots || []).forEach((sh) => {
    const n = parseInt(String(sh.stableId).replace(/\D/g, ''), 10) || 0;
    const o = CATALOGUE[n % CATALOGUE.length];
    results[sh.stableId] = { objects: [{ name: o.name, category: o.category, qty: o.qty, confidence: 'high', basis: 'Seen in the photograph.' }], notices: [], model: 'claude-fable-5-1' };
  });
  return { ok: true, results, done: Object.keys(results), failed: {}, remaining: 0 };
}
function seedSheet(srv, n) {
  srv._writeStoreBlob('JobLedger', { since: NOW - 30 * 86400000, seen: {}, restore: {} });
  srv.post({ type: 'saveAllJobs', payload: [JOB()] });
  srv.post({ type: 'saveMedia', payload: { jobId: J, savedAt: 1, items: shots(n || 24) } });
}
const sheetItems = (srv) => ((srv.get({ action: 'loadMedia', jobId: String(J) }).media || {})[String(J)] || {}).items || [];
const sheetLine = (srv, id) => sheetItems(srv).find((r) => r.stableId === id) || {};

// The boundaries a desk device does not draw or ask: the screen, the agents after the naming, the workbook.
const BOUNDARY = ['renderInventoryTab', '_invRenderWhenIdle', 'showSyncBadge', 'updatePendingIndicator', '_agRepaint', '_arRepaint', '_avRepaint',
  'agentRoomCheckRun', 'agentValueAuto', '_invRefreshFromCloud', '_invReadLineRepaint', '_deskFoldHeadsRepaint',
  '_invRefreshReleases', '_invRefreshSummary', '_invRefreshGuardrail', '_invRefreshFlagStrip', '_invRefreshRecords', '_invRefreshAgentNotices',
  '_invReviewRepaint', '_applyDroppedJobs', '_noteDeviceKeyRefusal', 'alert', '_warnPhotoStoreFull', '_warnPhotoRetryUnsaved', '_invPaintFigures',
  '_invColdRepaint', 'approvalEnvelopeApply', 'approvalEnvelopeRefresh', 'saveJobs', 'syncJobToSheets', 'deskFoldOpen', '_snapFilePage'];
const ROOTS = ['refreshPhotoRefs', '_invEnsureLoaded', 'loadPhotoRefs', 'savePhotoRefs', '_scheduleInventorySync', '_invSyncNow', 'buildMediaPayload',
  'queuedPostSync', '_flushOutbox', 'flushPendingWrites', 'retryPendingWrites', '_pendingChipCopy', '_pendingChangeWords', '_invResendOwed', 'invReadFirst',
  'invReadQuiet', 'agentNameShots', '_agSendNext', '_agFinish', '_agStateHtml', 'invBulkRemove', '_invBulkApply', '_syncFlushNow', '_syncOwedOnUnload',
  'invSheetChangeWords', '_invUnsentCount', '_invManifestLanded', '_invOwedRead', '_invTombstoneLine', '_invPicked', '_jobInvRefs', '_getPhotoRef',
  'exportInventoryCSV', '_invResendSoon', '_invManifestEvictable', '_invReclaimSpace'];

// `extra.roots`: more of the real code a group drives (the Record approval dialog, P6's review).
function desk(name, srv, clock, persisted, extra) {
  extra = extra || {};
  const net = [], badges = [], alerts = [], asks = [], idle = { n: 0 }, full = { n: 0 };
  const dev = { name, net, badges, alerts, asks, idle, full, offline: false, dropMedia: false, confirmAnswer: true };
  const fetchStub = (url, opts) => {
    if (dev.offline) return SP.reject(new TypeError('Failed to fetch'));
    const isPost = opts && opts.method === 'POST';
    let text;
    if (isPost) {
      const body = JSON.parse(opts.body);
      const what = body.type || body.action;
      if (what === 'saveMedia' && dev.dropMedia) { net.push({ t: clock.t, m: 'POST', what, lost: true }); return SP.reject(new TypeError('Failed to fetch')); }
      // Something done on this device while the write is on its way (the body has already been sent).
      if (what === 'saveMedia' && typeof dev.beforeSave === 'function') dev.beforeSave();
      net.push({ t: clock.t, m: 'POST', what, n: what === 'agentIdentify' ? (body.shots || []).length : (body.payload && body.payload.items ? body.payload.items.length : undefined), keepalive: !!opts.keepalive });
      text = what === 'agentIdentify' ? JSON.stringify(identify(body)) : srv.exec('POST', { postData: { contents: opts.body } });
    } else {
      const q = {};
      String(url).split('?')[1].split('&').forEach((kv) => { const [k, v] = kv.split('='); q[k] = decodeURIComponent(v || ''); });
      net.push({ t: clock.t, m: 'GET', what: q.action });
      if (dev.readDown) return SP.reject(new TypeError('Failed to fetch'));
      // A read held on the way (`holdReads`): answered by release(), as the sheet stands then; or never (`hangReads`).
      if (dev.hangReads) return mk().promise;
      if (dev.holdReads) {
        const d = mk();
        dev.held.push(() => { const t = srv.exec('GET', { parameter: q }); d.resolve({ text: () => SP.resolve(t), json: () => SP.resolve(JSON.parse(t)) }); });
        return d.promise;
      }
      text = srv.exec('GET', { parameter: q });
    }
    return SP.resolve({ text: () => SP.resolve(text), json: () => SP.resolve(JSON.parse(text)) });
  };
  const ctx = lift(ROOTS.concat(extra.roots || []), BOUNDARY, {
    console: { log() {}, warn() {}, error() {} },
    Date: clock.Date, setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout,
    document: domStub({}),
    window: { prompt: () => 'Filed with court', confirm: (m) => { asks.push(String(m)); return dev.confirmAnswer; }, addEventListener() {} },
    confirm: (m) => { asks.push(String(m)); return dev.confirmAnswer; },
    fetch: fetchStub, alert: (m) => alerts.push(String(m)),
    SHEETS_SYNC_URL: SYNC, VENDOR_SYNC_URL: '', REFERRAL_SYNC_URL: '',
    jobs: [JOB()], estimateStore: { [J]: { estimate: { jobId: J, rooms: ROOMS.map((nm, i) => ({ idx: i, name: nm, note: '' })) } } }, jobPlanStore: {},
    _photoRefs: {}, _invCloudSeen: {}, _invPick: {}, _invFilter: { when: 'all', room: '', q: '', flag: '' }, _invBulkLast: null,
    showSyncBadge: (m, err) => badges.push((err ? '[err] ' : '') + m), updatePendingIndicator() {},
    renderInventoryTab: () => { full.n++; }, _invRenderWhenIdle: () => { idle.n++; },
    _agRepaint() {}, _arRepaint() {}, _avRepaint() {}, agentRoomCheckRun: () => false, agentValueAuto: () => false,
    _invRefreshFromCloud() {}, _invReadLineRepaint() {}, _deskFoldHeadsRepaint() {}, _invRefreshReleases() {}, _invRefreshSummary() {},
    _invRefreshGuardrail() {}, _invRefreshFlagStrip() {}, _invRefreshRecords() {}, _invRefreshAgentNotices() {}, _invReviewRepaint() {},
    _applyDroppedJobs() {}, _noteDeviceKeyRefusal() {}, _warnPhotoStoreFull() {}, _warnPhotoRetryUnsaved() {}, _invPaintFigures() {},
    _invColdRepaint() {}, approvalEnvelopeApply: () => 0, approvalEnvelopeRefresh() {}, saveJobs() {}, syncJobToSheets() {}, deskFoldOpen() {},
    _snapFilePage: () => true,
    mustFindItems: () => [], deviceUser: () => name,
  });
  if (persisted) Object.keys(persisted).forEach((k) => ctx.localStorage.setItem(k, persisted[k]));
  dev.held = [];
  Object.assign(dev, {
    ctx,
    release() { const h = dev.held.splice(0); h.forEach((f) => f()); return h.length; },
    stored() { const o = {}; Object.keys(ctx.__store).forEach((k) => { o[k] = ctx.__store[k]; }); return o; },
    line(id) { return (ctx._photoRefs[J] || []).find((r) => r.stableId === id) || {}; },
    sent(what) { return net.filter((x) => x.what === what && !x.lost); },
    // A person's edit of one line, as the row's box makes it: the field, the clock, the local copy, the debounced write.
    edit(id, fields) { const r = ctx._getPhotoRef(J, id); Object.assign(r, fields); r.updatedAt = clock.Date.now(); ctx.savePhotoRefs(J); ctx._scheduleInventorySync(J); return r; },
    pick(ids) { ctx._invPick = {}; ids.forEach((id) => { ctx._invPick[id] = 1; }); },
    // The desk opened on the client: the read the tab makes.
    open() { ctx._invEnsureLoaded(J); let got = null; ctx.refreshPhotoRefs(J, (c, ok) => { got = { c, ok }; }); return got; },
  });
  return dev;
}
const liveIds = (items) => items.filter((r) => r.label === 'inventory' && !r.deletedAt).map((r) => r.stableId);

module.exports = function ({ group, ok, eq, has, lacks }) {
  const guard = (name, body) => { group(name); try { body(); } catch (e) { ok(false, name + ' threw: ' + String(e && e.stack || e).split('\n').slice(0, 4).join(' | ')); } };

  // ═══════════════════════════════════════════════════════════════════════
  guard('B · ⚠⚠ SYN-02: a stale Name 24 shots reads the sheet first, names the 16 left and leaves the 8 the other device removed', () => {
    const clock = clockOf(), srv = server('A');
    seedSheet(srv, 24);
    const A = desk('Anthony Graziano', srv, clock), B = desk('Ashley Jerome', srv, clock);
    eq([A.open(), B.open()].map((x) => x && x.ok), [true, true], 'fixture: both desks read the client from the sheet');
    eq([liveIds(A.ctx._photoRefs[J]).length, liveIds(B.ctx._photoRefs[J]).length], [24, 24], 'fixture: both hold the 24 photographs');
    // A takes 8 drawer shots off through the bulk bar's Remove lines.
    const gone = ['s0', 's1', 's2', 's3', 's4', 's5', 's6', 's7'];
    A.pick(gone);
    const removed = A.ctx.invBulkRemove(J);
    clock.run(3000);
    ok(removed === true || removed === 8, 'fixture: Remove lines ran on A (' + removed + ')');
    clock.run(3000);
    eq(liveIds(sheetItems(srv)).length, 16, 'fixture: the sheet holds 16 live lines once A\'s removal lands');
    eq(gone.filter((id) => sheetLine(srv, id).deletedAt).length, 8, 'fixture: and the 8 removed');
    eq(liveIds(B.ctx._photoRefs[J]).length, 24, 'fixture: B has not read the sheet since, so its copy still holds 24');
    // B presses Name 24 shots.
    const before = B.sent('loadMedia').length;
    B.ctx.agentNameShots(J);
    clock.run(5000);
    ok(B.sent('loadMedia').length > before, '⚠⚠ the press read the sheet first');
    const named = B.sent('agentIdentify').reduce((n, x) => n + x.n, 0);
    eq(named, 16, '⚠⚠ Agent One was sent the 16 photographs still on the inventory, never the 8 removed (24 before P6)');
    clock.run(6000);
    eq(gone.filter((id) => sheetLine(srv, id).deletedAt).length, 8, '⚠⚠ the 8 stay removed on the sheet (all 8 came back live, named and valued, before P6)');
    eq(liveIds(sheetItems(srv)).length, 16, 'and the sheet holds 16 live lines (26 before P6)');
    eq(liveIds(sheetItems(srv)).filter((id) => sheetLine(srv, id).objectName).length, 16, 'every one of them named');
    has(B.asks.join('\n'), 'The sheet was read first: 8 removed on another device were left alone.', 'the confirm says what the read left alone');
    has(B.ctx._agStateHtml(J), '16 named', 'the run says it named 16');
    has(B.ctx._agStateHtml(J), '8 removed on another device were left alone', '⚠ and names the 8 it left alone (the plan\'s "Named 16 of 16; 8 removed on the other device were left alone")');
  });

  guard('B2 · the defect reproduces without the read: the same press on a copy that never reads the sheet resurrects the 8', () => {
    const clock = clockOf(), srv = server('A');
    seedSheet(srv, 24);
    const A = desk('Anthony Graziano', srv, clock), B = desk('Ashley Jerome', srv, clock);
    A.open(); B.open();
    A.pick(['s0', 's1', 's2', 's3', 's4', 's5', 's6', 's7']); A.ctx.invBulkRemove(J); clock.run(6000);
    vm.runInContext('invReadFirst = function () { return false; };', B.ctx);   // the press as it was: no read
    B.ctx.agentNameShots(J); clock.run(11000);
    eq(B.sent('agentIdentify').reduce((n, x) => n + x.n, 0), 24, 'fixture: without the read all 24 go to Agent One');
    eq(liveIds(sheetItems(srv)).length, 24, 'fixture: and the 8 removed lines are live again on the sheet (the audit measured 26 with its splits)');
  });
  guard('C · ⚠⚠ SYN-01 contained: a stale Mark reviewed reads the sheet first, so the other device\'s typed name and $1,250 stand', () => {
    const clock = clockOf(), srv = server('A');
    seedSheet(srv, 12);
    const A = desk('Anthony Graziano', srv, clock), B = desk('Ashley Jerome', srv, clock);
    A.open(); B.open();
    // A names #11 by hand and records a dealer's figure; B's copy never sees it.
    A.edit('s10', { objectName: 'Henredon walnut dresser, nine drawers', namedBy: 'desk', category: 'Furniture', fmv: '1250', valSource: 'Dealer quote', condition: 'Excellent', condBy: 'desk', disposition: 'Sell' });
    clock.run(3000);
    eq(sheetLine(srv, 's10').objectName, 'Henredon walnut dresser, nine drawers', 'fixture: A\'s name is on the sheet');
    eq(B.line('s10').objectName, '', 'fixture: B\'s copy still reads the photograph unnamed');
    // B ticks #11 and #12 and presses Mark reviewed on the bulk bar.
    B.pick(['s10', 's11']);
    B.ctx._invBulkApply(J, 'reviewed', 1);
    clock.run(4000);
    const L = sheetLine(srv, 's10');
    eq([L.objectName, L.fmv, L.valSource, L.condition], ['Henredon walnut dresser, nine drawers', '1250', 'Dealer quote', 'Excellent'],
      '⚠⚠ A\'s name, figure, source and grade stand on the sheet (B\'s old copy carried them away before P6)');
    ok(!!L.reviewed, 'and B\'s tick is recorded on the line as the sheet holds it');
    eq(B.line('s10').objectName, 'Henredon walnut dresser, nine drawers', 'B\'s desk shows the name it read');
    ok(B.idle.n > 0 && B.full.n >= 0, 'the read that moved a line was drawn once nobody is in a box (_invRenderWhenIdle)');
    has(B.badges.join('\n'), 'From the sheet: another device changed 1 line on this client. The desk shows them now.', '⚠ and says what another device changed');
  });

  guard('C2 · the defect reproduces without the read: the stale sweep writes the old copy over A\'s work', () => {
    const clock = clockOf(), srv = server('A');
    seedSheet(srv, 12);
    const A = desk('Anthony Graziano', srv, clock), B = desk('Ashley Jerome', srv, clock);
    A.open(); B.open();
    A.edit('s10', { objectName: 'Henredon walnut dresser, nine drawers', namedBy: 'desk', fmv: '1250' });
    clock.run(3000);
    vm.runInContext('invReadFirst = function () { return false; };', B.ctx);
    B.pick(['s10']); B.ctx._invBulkApply(J, 'reviewed', 1); clock.run(4000);
    eq([sheetLine(srv, 's10').objectName, sheetLine(srv, 's10').fmv], ['', undefined], 'fixture: without the read A\'s name and figure are gone from the sheet');
  });

  guard('C3 · a sweep across lines the other device removed leaves them alone and says so', () => {
    const clock = clockOf(), srv = server('A');
    seedSheet(srv, 6);
    const A = desk('Anthony Graziano', srv, clock), B = desk('Ashley Jerome', srv, clock);
    A.open(); B.open();
    A.pick(['s0', 's1']); A.ctx.invBulkRemove(J); clock.run(6000);
    B.pick(['s0', 's1', 's2']);
    B.ctx._invBulkApply(J, 'condition', 'Fair');
    clock.run(4000);
    eq(['s0', 's1'].map((id) => !!sheetLine(srv, id).deletedAt), [true, true], '⚠⚠ the two A removed stay removed');
    eq(sheetLine(srv, 's2').condition, 'Fair', 'the line still there takes the sweep');
    has(B.badges.join('\n'), '2 lines removed on another device were left alone.', 'and the confirmation names the two left alone');
    // Remove lines the same way: A removes #5 after B's last read, and B picks #4 and #5.
    A.pick(['s4']); A.ctx.invBulkRemove(J); clock.run(6000);
    B.pick(['s3', 's4']);
    B.ctx.invBulkRemove(J); clock.run(6000);
    has(B.asks.join('\n'), 'The sheet was read first: 1 line removed on another device was left alone.', 'Remove lines asks about the one still there and names the one gone');
    eq([!!sheetLine(srv, 's3').deletedAt, sheetLine(srv, 's4').deletedBy], [true, 'Anthony Graziano'], 'the one still there is removed, and the one A removed keeps A\'s removal');
  });

  guard('C4 · a press whose read does not land refuses by name and changes nothing', () => {
    const clock = clockOf(), srv = server('A');
    seedSheet(srv, 6);
    const B = desk('Ashley Jerome', srv, clock);
    B.open();
    B.readDown = true;
    const writes = () => B.sent('saveMedia').length + B.sent('agentIdentify').length;
    const w0 = writes();
    B.ctx.agentNameShots(J); clock.run(4000);
    B.pick(['s0']); B.ctx._invBulkApply(J, 'reviewed', 1); clock.run(4000);
    B.pick(['s1']); B.ctx.invBulkRemove(J); clock.run(4000);
    eq(writes(), w0, '⚠⚠ nothing was named, swept or removed, and nothing written');
    eq(B.alerts.filter((m) => m.indexOf('reads the inventory from the sheet first') >= 0).length, 3, 'each press said why, by name');
    has(B.alerts[0], 'Not done: Name shots reads the inventory from the sheet first, so that nothing acts on a copy another device has moved past, and the sheet did not answer. Nothing was changed.', 'in these words');
    eq([B.line('s0').reviewed, B.line('s1').deletedAt], [undefined, undefined], 'and this device\'s copy is untouched');
  });

  guard('E · ⚠⚠ SYN-06: a write that failed before a reload is sent again from the copy kept on the device', () => {
    const clock = clockOf(), srv = server('A');
    seedSheet(srv, 6);
    const A1 = desk('Anthony Graziano', srv, clock);
    A1.open();
    A1.dropMedia = true;   // a dead spot: every inventory write is lost on the way
    A1.edit('s4', { objectName: 'Mahogany secretary desk, glazed top', namedBy: 'desk' });
    A1.edit('s2', { fmv: '140' });
    clock.run(3000);
    eq(sheetLine(srv, 's4').objectName, '', 'fixture: the write was lost; the sheet does not hold the name');
    const kept = A1.stored();
    ok(String(kept['hav_media_' + J] || '').indexOf('Mahogany secretary desk, glazed top') >= 0, 'fixture: this device\'s copy holds it (hav_media_<id>)');
    ok(!!JSON.parse(kept.hav_inv_owed || '{}')[String(J)], '⚠ and the client is marked as owed to the sheet (hav_inv_owed), which is no copy of the lines');
    // The tab is reloaded: a new page, the same localStorage, an empty retry queue (Decided: never persisted).
    const A2 = desk('Anthony Graziano', srv, clock, kept);
    eq(Object.keys(A2.ctx._pendingWrites).length, 0, 'fixture: the reloaded page holds no queue');
    const n = A2.ctx._invResendOwed();
    eq(n, 1, 'at start-up the one client owed is read');
    clock.run(4000);
    eq(sheetLine(srv, 's4').objectName, 'Mahogany secretary desk, glazed top', '⚠⚠ the name reached the sheet (it sat on the laptop for good before P6)');
    eq(sheetLine(srv, 's2').fmv, '140', 'and the figure');
    ok(!JSON.parse(A2.stored().hav_inv_owed || '{}')[String(J)], 'and once it has landed nothing is owed');
  });

  guard('E2 · without the mark, opening the client reads the sheet and sends what it lacks', () => {
    const clock = clockOf(), srv = server('A');
    seedSheet(srv, 6);
    const A1 = desk('Anthony Graziano', srv, clock);
    A1.open(); A1.dropMedia = true;
    A1.edit('s3', { objectName: 'Nightstand, mahogany, one drawer', namedBy: 'desk' });
    clock.run(3000);
    const kept = A1.stored(); delete kept.hav_inv_owed;
    const A2 = desk('Anthony Graziano', srv, clock, kept);
    eq(A2.ctx._invResendOwed(), 0, 'fixture: no client marked');
    A2.open(); clock.run(4000);
    eq(sheetLine(srv, 's3').objectName, 'Nightstand, mahogany, one drawer', '⚠ the read that opened the desk found the sheet lacking it, and sent it');
  });

  guard('E3 · a read that finds the sheet holding everything sends nothing', () => {
    const clock = clockOf(), srv = server('A');
    seedSheet(srv, 6);
    const A = desk('Anthony Graziano', srv, clock);
    A.open(); clock.run(4000);
    A.open(); clock.run(4000);
    eq(A.sent('saveMedia').length, 0, 'two reads of a copy equal to the sheet\'s post nothing');
  });

  guard('F · ⚠ SYN-18: the chip counts the lines not yet on the sheet, never "1 unsaved change" for an evening', () => {
    const clock = clockOf(), srv = server('A');
    seedSheet(srv, 6);
    const A = desk('Anthony Graziano', srv, clock);
    A.open();
    A.dropMedia = true;
    A.edit('s1', { objectName: 'Mahogany secretary desk, glazed top', namedBy: 'desk' });
    A.edit('s2', { fmv: '275' });
    A.edit('s3', { objectName: 'Nightstand, one drawer', namedBy: 'desk' });
    A.edit('s3', { fmv: '140' });
    clock.run(3000);
    const head = A.ctx._pendingChipCopy().head;
    eq(head, '⚠ 3 inventory lines not yet on the sheet — retrying…', '⚠ three lines changed, three counted (it read "1 unsaved change")');
    has(A.ctx._pendingChipCopy().note, 'go again by themselves', 'and the note says they are kept and go again');
    // Another kind of write waiting beside it.
    A.ctx._pendingWrites['main/job:' + J] = { target: 'main', body: { type: 'job', payload: { id: J } }, tries: 1, kind: '' };
    eq(A.ctx._pendingChipCopy().head, '⚠ 3 inventory lines and another change not yet on the sheet — retrying…', 'with another change beside them');
    delete A.ctx._pendingWrites['main/job:' + J];
    // Once the signal is back the queue lands, and the count goes.
    A.dropMedia = false;
    A.ctx.retryPendingWrites(); clock.run(1000);
    eq(Object.keys(A.ctx._pendingWrites).length, 0, 'the write lands');
    eq(A.ctx._invUnsentCount(J), 0, 'and nothing is left unsent');
    // A device that has read nothing of the client yet counts what it knows: one change.
    const B = desk('Ashley Jerome', srv, clock);
    B.ctx._pendingWrites['main/saveMedia:' + J] = { target: 'main', body: { type: 'saveMedia' }, tries: 1, kind: '' };
    eq(B.ctx._pendingChipCopy().head, '⚠ 1 unsaved change — retrying…', 'a client this device knows nothing of on the sheet reads as one change');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // The open desk, on its own: the tab's read, the minute's re-read, the redraw that waits for the box to be left.
  function deskScreen(over) {
    over = over || {};
    const clock = clockOf();
    const log = { reads: 0, idle: 0, full: 0, heads: 0, badges: [], answer: over.answer || { changed: false, ok: true, diff: null } };
    const dom = domStub({ 'inv-job': String(J) });
    const box = dom.getElementById('inv-name-s1'); box.tagName = 'TEXTAREA';
    dom.__seed('panel-inventory', { contains: (el) => el === box });
    dom.getElementById('panel-inventory').classList.add('active');
    dom.activeElement = dom.body;
    dom.hidden = false;
    const ctx = sandbox({
      fns: ['_invRefreshFromCloud', '_invRereadArm', '_invRereadTick', '_invDeskShows', '_invCloudRetryArm', 'invSheetChangeWords',
        '_invManifestUnread'],
      vars: ['INV_DESK_REREAD_MS', 'INV_CLOUD_RETRY_MS', '_invReread', '_invCloudRetry', 'INV_READ_WATCHDOG_MS'],
      stubs: {
        document: dom, Date: clock.Date, setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout,
        SHEETS_SYNC_URL: SYNC, _invCloudSeen: { [J]: true }, _invCloudFailed: {},
        refreshPhotoRefs: (id, cb) => { log.reads++; if (log.hang) return; const a = log.answer; cb(a.changed, a.ok, a.diff); },
        collectionLinesEnsure: () => 0, approvalEnvelopeApply: () => 0, approvalEnvelopeRefresh() {},
        _invRenderWhenIdle: () => { log.idle++; }, renderInventoryTab: () => { log.full++; },
        _deskFoldHeadsRepaint: () => { log.heads++; }, _invRefreshReleases() {}, _invReadLineRepaint() {}, _invColdRepaint() {},
        showSyncBadge: (m) => log.badges.push(String(m)),
      },
    });
    return { ctx, clock, dom, box, log };
  }

  guard('D · ⚠⚠ the open desk reads the sheet again every minute while nobody is typing, and names what another device changed', () => {
    const D = deskScreen();
    eq(D.ctx.INV_DESK_REREAD_MS, 60000, 'every 60 seconds');
    D.ctx._invRefreshFromCloud();
    eq(D.log.reads, 1, 'fixture: the tab\'s read');
    D.clock.run(59000);
    eq(D.log.reads, 1, 'nothing within the minute');
    D.clock.run(1500);
    eq(D.log.reads, 2, '⚠⚠ a minute on, the desk reads the sheet again by itself (it read only on a tab opened or a client picked)');
    D.clock.run(60500);
    eq(D.log.reads, 3, 'and every minute after');
    // Somebody in a box: the read still comes (a read only merges; the box keeps its text), and what it brings waits (below).
    D.dom.activeElement = D.box;
    D.clock.run(60500);
    eq(D.log.reads, 4, '⚠ it reads while somebody is in a box (after a name and Tab the focus rests in the next one, so it would hardly ever read)');
    D.dom.activeElement = D.dom.body;
    // The page hidden (the iPad put down): skipped, asked again.
    D.dom.hidden = true;
    D.clock.run(60500);
    eq(D.log.reads, 4, 'never while the page is hidden');
    D.dom.hidden = false;
    D.clock.run(60500);
    eq(D.log.reads, 5, 'and again once it is back');
    // A read that moved lines: drawn once nobody is typing, never by a redraw of the tab under the box, and said.
    D.log.answer = { changed: true, ok: true, diff: { held: true, gone: ['s0', 's1'], changed: ['s4', 's5', 's6'], added: [] } };
    D.clock.run(60500);
    eq([D.log.idle, D.log.full], [1, 0], '⚠⚠ the redraw waits for the box to be left (_invRenderWhenIdle); renderInventoryTab is never called from a read');
    has(D.log.badges.join('\n'), 'From the sheet: another device changed 3 lines and removed 2 lines on this client. The desk shows them now.', '⚠ and it says what another device changed');
    // Leaving the tab, or picking another client, stops it; opening it again reads at once.
    D.dom.getElementById('panel-inventory').classList.remove('active');
    const r0 = D.log.reads;
    D.clock.run(180000);
    eq(D.log.reads, r0, 'never on another tab');
    D.dom.getElementById('panel-inventory').classList.add('active');
    D.dom.getElementById('inv-job').value = '1234';
    D.clock.run(180000);
    eq(D.log.reads, r0, 'nor for a client no longer on screen');
  });

  guard('D2 · a read desk whose re-read fails keeps asking every minute; an unread one every 15 seconds, as before', () => {
    const D = deskScreen({ answer: { changed: false, ok: false, diff: null } });
    D.ctx._invRefreshFromCloud();
    D.clock.run(61000);
    eq(D.log.reads, 2, 'a read desk asks again the next minute');
    const U = deskScreen({ answer: { changed: false, ok: false, diff: null } });
    U.ctx._invCloudSeen = {}; U.ctx._invCloudFailed = { [J]: true };
    U.ctx._invRefreshFromCloud();
    U.clock.run(16000);
    eq(U.log.reads, 2, 'an unread desk whose read failed asks again in 15 seconds (_invCloudRetryArm)');
  });

  guard('D3 · what another device changed, in one sentence; nothing on a first read or a read that moved nothing', () => {
    const C = sandbox({ fns: ['invSheetChangeWords'] });
    eq(C.invSheetChangeWords({ held: true, gone: [], changed: ['a'], added: [] }), 'From the sheet: another device changed 1 line on this client. The desk shows them now.', 'one line');
    eq(C.invSheetChangeWords({ held: true, gone: ['a'], changed: ['b', 'c'], added: ['d'] }),
      'From the sheet: another device changed 2 lines, removed 1 line and added 1 line on this client. The desk shows them now.', 'all three');
    eq(C.invSheetChangeWords({ held: false, gone: [], changed: [], added: ['a', 'b'] }), '', 'a device that held nothing of the client says nothing of its first read');
    eq(C.invSheetChangeWords({ held: true, gone: [], changed: [], added: [] }), '', 'nor of a read that moved nothing');
    eq(C.invSheetChangeWords(null), '', 'nor of no answer');
  });

  guard('D4 · refreshPhotoRefs says whether the read landed and what it moved', () => {
    let scheduled = 0;
    const mk = (fetch, refs) => lift(['refreshPhotoRefs', 'invSheetDiff', '_invLinesById', '_invSheetAnswered', 'invUnsentLines'], ['savePhotoRefs', '_scheduleInventorySync', '_invOwedMark'], {
      SHEETS_SYNC_URL: SYNC, fetch, _photoRefs: { [J]: refs }, _invCloudSeen: {}, _invCloudFailed: {}, _invReadAt: {}, _invSheetKnown: {}, _invSyncTimer: {},
      savePhotoRefs() {}, _scheduleInventorySync() { scheduled++; }, _invOwedMark() {}, _withDeviceKey: (u) => u,
    });
    const answer = (items) => () => SP.resolve({ json: () => SP.resolve({ ok: true, media: { [String(J)]: { items } } }) });
    const L = (id, o) => Object.assign({ stableId: id, label: 'inventory', ts: 10, updatedAt: 10, objectName: '' }, o || {});
    let got = null;
    mk(answer([L('a', { updatedAt: 20, objectName: 'Sofa' }), L('b', { deletedAt: 30, updatedAt: 30 }), L('c')]), [L('a'), L('b'), L('c'), L('d', { updatedAt: 40 })])
      .refreshPhotoRefs(J, (c, ok, diff) => { got = { c, ok, diff }; });
    eq([got && got.c, got && got.ok], [true, true], 'a read that landed and moved lines: changed, ok');
    eq(got && [got.diff.changed, got.diff.gone, got.diff.held], [['a'], ['b'], true], 'the diff names the line changed and the line removed');
    eq(scheduled, 1, '⚠⚠ a line the sheet lacks (#d, made here) is sent again: the inventory write is scheduled');
    got = null;
    mk(() => SP.reject(new TypeError('Failed to fetch')), [L('a')]).refreshPhotoRefs(J, (c, ok) => { got = { c, ok }; });
    eq(got && [got.c, got.ok], [false, false], '⚠ a read that never answered is no read');
    got = null;
    mk(() => SP.resolve({ json: () => SP.resolve({ ok: false, error: 'This device has no key' }) }), [L('a')]).refreshPhotoRefs(J, (c, ok) => { got = { c, ok }; });
    eq(got && [got.c, got.ok], [false, false], 'nor one the sheet refused');
    scheduled = 0;
    mk(answer([L('a'), L('c')]), [L('a'), L('c')]).refreshPhotoRefs(J, () => {});
    eq(scheduled, 0, 'a copy equal to the sheet\'s sends nothing');
    const C = sandbox({ fns: ['invUnsentLines', '_invLineClock'] });
    eq(C.invUnsentLines([L('a', { updatedAt: 50 }), L('b'), L('c')], { a: 40, b: 10 }), ['a', 'c'], 'unsent: newer here, or missing there');
  });

  guard('G · ⚠⚠ SYN-06: an edit made just before the tab closes is sent at once, and the close is challenged while it is unanswered', () => {
    const clock = clockOf(), srv = server('A');
    seedSheet(srv, 6);
    const A = desk('Anthony Graziano', srv, clock);
    A.open();
    // The beforeunload listener as registered, run against the real queue.
    const at = SRC.indexOf("window.addEventListener('beforeunload'");
    const snippet = SRC.slice(at, SRC.indexOf('\n});\n', at) + 5);
    const handlers = {};
    A.ctx.window = { addEventListener(ev, f) { handlers[ev] = f; } };
    vm.runInContext(snippet, A.ctx, { filename: 'havellin.html (beforeunload)' });
    const ev = () => ({ prevented: false, returnValue: undefined, preventDefault() { this.prevented = true; } });
    const quiet = ev(); handlers.beforeunload(quiet);
    eq(quiet.prevented, false, 'nothing owed: the tab closes without a word');
    A.edit('s3', { objectName: 'Mahogany secretary desk, glazed top', namedBy: 'desk' });
    eq(A.sent('saveMedia').length, 0, 'fixture: the edit waits its 2.5 s before it is sent');
    const going = ev(); handlers.beforeunload(going);
    eq(A.sent('saveMedia').length, 1, '⚠⚠ the page going sends it at once (before P6 nothing went: 0 in 20 s after a reload a second later)');
    eq(A.sent('saveMedia').map((x) => x.keepalive), [true], 'a small write goes with keepalive as the page goes, so it can finish after the tab has closed');
    clock.run(500);
    eq(sheetLine(srv, 's3').objectName, 'Mahogany secretary desk, glazed top', 'the edit is on the sheet');
    const after = ev(); handlers.beforeunload(after);
    eq(after.prevented, false, 'and once it has landed the tab closes without a word');
    // _syncOwedOnUnload, DOM-free: what waits, what is in the outbox or in flight, a failed write; never one too large alone.
    const O = A.ctx;
    O._invSyncTimer[J] = 99; ok(O._syncOwedOnUnload(), '⚠ a debounced inventory write is owed (the guard asked only failed writes)'); O._invSyncTimer[J] = 0;
    O._outbox['main/x'] = {}; ok(O._syncOwedOnUnload(), 'an outbox entry is owed'); delete O._outbox['main/x'];
    O._outboxSending = true; ok(O._syncOwedOnUnload(), 'a write in flight is owed'); O._outboxSending = false;
    O._pendingWrites['main/job:1'] = { kind: 'toolarge' }; ok(!O._syncOwedOnUnload(), 'a record too large for the sheet alone is not (P1: reloading is safe)');
    O._pendingWrites['main/job:2'] = { kind: '' }; ok(O._syncOwedOnUnload(), 'any other failed write is');
    // The guard itself challenges while a write is in flight (the outbox sends one at a time; held here mid-send).
    O._pendingWrites = {}; O._outboxSending = true;
    const mid = ev(); handlers.beforeunload(mid);
    ok(mid.prevented, '⚠ the close is challenged while a write is out');
    O._outboxSending = false;
  });

  guard('G2 · pagehide and a hidden page send what waits, and a page back in view reads the open desk', () => {
    has(live(SRC), "window.addEventListener('pagehide', function () { _syncPageGoing = true; _syncFlushNow(); });", 'pagehide sends what waits');
    const vis = live(SRC).slice(live(SRC).indexOf("document.addEventListener('visibilitychange', function(){"));
    has(vis.slice(0, 900), 'if (document.hidden) { _syncPageGoing = true; _syncFlushNow(); return; }', 'a page hidden sends what waits');
    has(vis.slice(0, 900), "_invRereadTick(jid, 'visible')", 'and a page back in view reads the open desk at once, as an arrival (DocuSign may be asked then)');
  });
  // ═══════════════════════════════════════════════════════════════════════
  guard('H · ⚠⚠ SYN-10: every desk paper, the CSV and Snapshot read the sheet first, as the sends do', () => {
    // Each one, lifted alone: it reaches the gate, asks the sheet under its own name and builds nothing until the read lands; once
    // it has (opt.read), it does not ask again.
    const PAPERS = [
      ['printContentsList', (c) => c.printContentsList(J), 'The Contents List'],
      ['printEstateInventoryReport', (c) => c.printEstateInventoryReport(J), 'The Estate Inventory PDF'],
      ['exportInventoryCSV', (c) => c.exportInventoryCSV(J), 'The CSV'],
      ['printApprovalRequest', (c) => c.printApprovalRequest(J), 'The release approval request'],
      ['printBeneficiaryReceipt', (c) => c.printBeneficiaryReceipt(J, 'Daniel Price'), 'The receipt'],
      ['printCourtInventory', (c) => c.printCourtInventory(J), 'The Court Inventory'],
      ['printTrustSchedule', (c) => c.printTrustSchedule(J), 'The Trust Schedule'],
      ['printDispositionLedger', (c) => c.printDispositionLedger(J), 'The Disposition Ledger'],
      ['printDonationRecord', (c) => c.printDonationRecord(J, 's1'), 'The Donation Record'],
      ['printAppraisalWorklist', (c) => c.printAppraisalWorklist(J), 'The Appraisal Worklist'],
      ['printContentsRecord', (c) => c.printContentsRecord(J), 'The Contents Record'],
      ['printAsFoundRecord', (c) => c.printAsFoundRecord(J), 'The As-Found Record'],
      ['printSnapshotComparison', (c) => c.printSnapshotComparison(J, 111, 'now'), 'Compare with now'],
      ['takeInventorySnapshot', (c) => c.takeInventorySnapshot(J), 'Snapshot'],
    ];
    PAPERS.forEach(([name, press, what]) => {
      const asked = [];
      const c = sandbox({ fns: [name, '_invReadOpt'], stubs: {
        jobs: [Object.assign(JOB(), { invSnapshots: [{ ts: 111, label: 'Filed', count: 3 }] })], _invJob: () => Object.assign(JOB(), { invSnapshots: [{ ts: 111, label: 'Filed', count: 3 }] }),
        invColdRefusal: () => '', invDocContractBlock: () => '', snapshotRefusal: () => '', dispositionRecord: () => ({ job: JOB() }),
        _snapPrevLive: () => null, alert: (m) => asked.push('alert: ' + m), SHEETS_SYNC_URL: SYNC,
        invReadFirst: (jobId, w, go, opt) => { asked.push([w, !!(opt && opt.read)]); c.__go = go; return !(opt && opt.read); },
      } });
      const r = attempt(() => press(c));
      eq(asked[0], [what, false], '⚠⚠ ' + what + ' asks the sheet first, by its own name (it built off this device\'s copy before P6)');
      eq(c.__printed, '', 'and builds nothing until the read lands (' + name + ')');
      ok(r.ok, name + ' returns cleanly while the read is out' + (r.ok ? '' : ': ' + r.err));
      // The read lands: the press goes on, told it has read.
      let again = null;
      c[name] = function () { again = Array.prototype.slice.call(arguments); };
      attempt(() => c.__go({ gone: [], changed: [], added: [], held: true }));
      const told = again && again.some((a) => a && typeof a === 'object' && (a.read === true || Array.isArray(a.gone)));
      ok(told, name + ' is called again told the sheet was read (' + JSON.stringify(again && again.slice(1)) + ')');
    });
  });

  guard('H2 · a paper whose read does not land refuses by name and opens nothing', () => {
    const alerts = [], printed = [];
    const c = lift(['invReadFirst', 'invReadFirstRefusal'], [], {
      SHEETS_SYNC_URL: SYNC, _invCloudSeen: { [J]: true }, showSyncBadge() {}, alert: (m) => alerts.push(String(m)), _invEnsureLoaded() {},
      refreshPhotoRefs: (id, cb) => cb(false, false, null), _invRenderWhenIdle() {}, invSheetChangeWords: () => '',
    });
    const started = c.invReadFirst(J, 'The Court Inventory', () => printed.push(1));
    eq([started, printed.length], [true, 0], '⚠ the press asked the sheet and opened nothing');
    eq(alerts, ['Not done: The Court Inventory reads the inventory from the sheet first, so that nothing acts on a copy another device has moved past, and the sheet did not answer. Nothing was changed. Check the connection, then try again.'],
      'and says why, by name');
    eq(c.invReadFirst(J, 'x', () => printed.push(2), { asHtml: true }), false, 'a page built for a send or a filing goes on: its caller has read the sheet');
    eq(c.invReadFirst(J, 'x', () => printed.push(3), { read: true }), false, 'and a press told the sheet was read goes on');
    c.SHEETS_SYNC_URL = '';
    eq(c.invReadFirst(J, 'x', () => printed.push(4)), false, 'with no Apps Script URL this device\'s copy is the record, and it goes on');
    // A press repeated while its read is out waits on that read.
    let held = null;
    c.SHEETS_SYNC_URL = SYNC; c.refreshPhotoRefs = (id, cb) => { held = cb; };
    c.invReadFirst(J, 'The CSV', () => printed.push(5));
    c.invReadFirst(J, 'The CSV', () => printed.push(6));
    held(false, true, null);
    eq(printed, [5], 'the same press twice while its read is out is one: one read, one answer');
    // ⚠⚠ Different presses made while one read is out each go once it lands, in the order pressed (P6's review: Set category
    // then Set condition shared one label, and the second was dropped with no word).
    printed.length = 0; let reads = 0;
    c.refreshPhotoRefs = (id, cb) => { reads++; held = cb; };
    c.invReadFirst(J, 'The change across the selection', () => printed.push('category'), { key: 'bulk|category|Furniture' });
    c.invReadFirst(J, 'The change across the selection', () => printed.push('condition'), { key: 'bulk|condition|Good' });
    c.invReadFirst(J, 'The CSV', () => printed.push('csv'));
    c.invReadFirst(J, 'The change across the selection', () => printed.push('condition again'), { key: 'bulk|condition|Good' });
    held(false, true, null);
    eq([reads, printed], [1, ['category', 'condition', 'csv']], '⚠⚠ one read; the two sweeps and the CSV each go, in order, and the same sweep twice is one');
    // A read that fails refuses every press waiting on it, in one sentence.
    alerts.length = 0; printed.length = 0;
    c.invReadFirst(J, 'Remove lines', () => printed.push('remove'));
    c.invReadFirst(J, 'The CSV', () => printed.push('csv'));
    held(false, false, null);
    eq([printed, alerts], [[], ['Not done: Remove lines and The CSV read the inventory from the sheet first, so that nothing acts on a copy another device has moved past, and the sheet did not answer. Nothing was changed. Check the connection, then try again.']],
      'a read that does not land refuses both, by name, in one sentence');
  });

  guard('H3 · ⚠⚠ the CSV printed on a stale device carries the other device\'s $275 (the audit\'s Court Inventory press did not)', () => {
    const clock = clockOf(), srv = server('A');
    seedSheet(srv, 6);
    const A = desk('Anthony Graziano', srv, clock), B = desk('Ashley Jerome', srv, clock);
    A.open(); B.open();
    A.edit('s4', { objectName: 'Le Creuset Dutch oven', namedBy: 'desk', category: 'General/Household', fmv: '275' });
    clock.run(3000);
    eq(B.line('s4').fmv, undefined, 'fixture: B\'s copy lacks the $275');
    const parts = [];
    B.ctx.Blob = class { constructor(p) { parts.push(p.join('')); } };
    B.ctx.URL = { createObjectURL: () => 'blob:x', revokeObjectURL() {} };
    B.ctx.exportInventoryCSV(J);
    clock.run(3000);
    ok(parts.length === 1, 'fixture: the CSV was built (' + B.badges.concat(B.alerts).slice(-3).join(' | ') + ')');
    has(parts[0] || '', 'Le Creuset Dutch oven', '⚠⚠ it carries the line as the sheet holds it');
    has(parts[0] || '', '275', 'and its $275');
  });

  guard('I · ⚠⚠ SYN-05: nothing the app does on its own redraws the desk under somebody typing', () => {
    // The desk's read: a read that moved anything, made a collection's line, or recorded a DocuSign signature waits for the box.
    [['changed', { changed: true }], ['made', { made: 1 }], ['signedIn', { signed: 1 }]].forEach(([why, o]) => {
      const D = deskScreen({ answer: { changed: !!o.changed, ok: true, diff: null } });
      D.ctx.collectionLinesEnsure = () => o.made || 0;
      D.ctx.approvalEnvelopeApply = () => o.signed || 0;
      D.ctx._invRefreshFromCloud();
      eq([D.log.idle, D.log.full], [1, 0], '⚠⚠ ' + why + ': drawn through _invRenderWhenIdle, never renderInventoryTab (the 15 s retry cut "Mahogany secretary desk with glazed bo")');
    });
    // The held workbook's read: once per client every 15 s, never one per edit, and drawn as the desk's own read draws it.
    const clock = clockOf();
    const dom = domStub({ 'inv-job': String(J) });
    let reads = 0, deskReads = 0, renders = 0, idle = 0; const whys = [];
    const W = sandbox({ fns: ['_scheduleInventorySync', '_invSyncNow'], vars: ['_invSyncTimer', '_invSyncIds', '_invHeldReadAt', 'INV_CLOUD_RETRY_MS'], stubs: {
      SHEETS_SYNC_URL: SYNC, jobs: [Object.assign(JOB(), { driveFolder: 'https://drive.google.com/drive/folders/R' })], _invCloudSeen: {}, document: dom,
      Date: clock.Date, setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout,
      postSyncBadge() {}, buildMediaPayload: () => ({}), buildInventoryPayload: () => ({}), showSyncBadge() {}, _invOwedMark() {},
      _invRefreshFromCloud: (why) => { deskReads++; whys.push(why); }, refreshPhotoRefs: (id, cb) => { reads++; cb(true, true, null); },
      renderInventoryTab: () => { renders++; }, _invRenderWhenIdle: () => { idle++; },
    } });
    W._scheduleInventorySync(J); clock.run(2600);
    W._scheduleInventorySync(J); clock.run(2600);
    W._scheduleInventorySync(J); clock.run(2600);
    eq(deskReads, 1, '⚠ three edits on a desk that has not read the sheet: one read, not three');
    clock.run(15000);
    W._scheduleInventorySync(J); clock.run(2600);
    eq(deskReads, 2, 'and another once 15 s have passed');
    eq(whys, ['held', 'held'], 'each asked as a read nobody pressed (\'held\'), so it never asks DocuSign (P6\'s review)');
    eq(renders, 0, '⚠⚠ and none of them redrew the tab by itself (it redrew whatever the read answered, under the next row being typed)');
    dom.getElementById('inv-job').value = '99';
    clock.run(16000);
    W._scheduleInventorySync(J); clock.run(2600);
    eq([reads, renders, idle], [1, 0, 0], 'another client\'s held workbook reads its copy and draws nothing');
    // Data landing and a filing answering: the desk waits for the box.
    const E = lift(['_estStoreLanded'], [], { document: (() => { const d = domStub({}); d.getElementById('panel-inventory').classList.add('active'); return d; })(),
      _asBackgroundRedraw: (f) => f(), loadJobPlanTab() {}, _dashRedraw() {}, renderInventoryTab: () => { E.full = (E.full || 0) + 1; }, _invRenderWhenIdle: () => { E.idle = (E.idle || 0) + 1; } });
    E._estStoreLanded();
    eq([E.idle || 0, E.full || 0], [1, 0], 'the estimate store landing waits for the box');
    const S = lift(['_signedCopyRepaint'], [], { _jobBandHost: () => ({ kind: 'admin', jobId: J }), renderInventoryTab: () => { S.full = (S.full || 0) + 1; },
      _invRenderWhenIdle: () => { S.idle = (S.idle || 0) + 1; }, loadJobPlanTab() {}, _dashRedraw() {}, _repaintSiteFinds() {} });
    S._signedCopyRepaint(J, 'approval');
    eq([S.idle || 0, S.full || 0], [1, 0], 'a signed copy\'s filing answering waits for the box');
    // The DocuSign arrival: a completed request recorded on the lines is drawn once nobody is typing.
    const shows = { v: true };
    const R = lift(['approvalEnvelopeRefresh'], [], {
      jobs: [Object.assign(JOB(), { docState: { approvalRequest: { req: { envelope: { id: 'E1' } } } } })], SHEETS_SYNC_URL: SYNC, APPROVAL_REQ_KEY: 'approvalRequest',
      approvalEnvelopeOut: () => true, approvalEnvelopeDue: () => true, approvalEnvelope: (r) => r.envelope, _approvalEnvChecking: {}, _approvalEnvAskedAt: {},
      _appsScriptPost: (u, b, cb) => cb(true, { ok: true, status: 'completed' }), applyApprovalEnvelopeStatus: () => 'completed', approvalEnvelopeFile() {},
      _invEnsureLoaded() {}, refreshPhotoRefs: (id, cb) => cb(true, true, null), approvalEnvelopeApply: () => 2,
      _invDeskShows: () => shows.v, _invRenderWhenIdle: () => { R.idle = (R.idle || 0) + 1; }, renderInventoryTab: () => { R.full = (R.full || 0) + 1; },
      _invRefreshReleases: () => { R.byId = (R.byId || 0) + 1; }, _docNotice() {},
    });
    R.approvalEnvelopeRefresh({}, () => {});
    eq([R.idle || 0, R.full || 0], [1, 0], '⚠ the DocuSign arrival\'s redraw (26 October) waits for the box too');
    shows.v = false;
    R.approvalEnvelopeRefresh({}, () => {});
    eq([R.idle || 0, R.byId || 0], [1, 1], 'and with the desk on another client only the Releases card is repainted, by id');
    // Only a box a person types into holds the redraw: a file chooser keeps the focus after the file is picked, so a signed
    // copy's filing waited for a click elsewhere before it was listed (browser step 99, building P6).
    let held = 0, drawn = 0;
    const el = (tag, type) => ({ tagName: tag, type, addEventListener() { held++; }, removeEventListener() {} });
    const doc = { activeElement: null, getElementById: () => ({ contains: () => true }) };
    const IW = sandbox({ fns: ['_invRenderWhenIdle'], vars: ['_invRenderOwed'], stubs: { document: doc, renderInventoryTab: () => { drawn++; }, setTimeout: () => 0 } });
    const after = (tag, type) => { held = 0; drawn = 0; doc.activeElement = el(tag, type); IW._invRenderWhenIdle(); return [held, drawn]; };
    eq([after('INPUT', 'file'), after('INPUT', 'checkbox'), after('INPUT', 'radio'), after('BUTTON')], [[0, 1], [0, 1], [0, 1], [0, 1]],
      '⚠ a file chooser, a tick, a radio or a button holds nothing: drawn at once');
    eq([after('INPUT', 'text'), after('INPUT', undefined), after('INPUT', 'number'), after('TEXTAREA'), after('SELECT')], [[1, 0], [1, 0], [1, 0], [1, 0], [1, 0]],
      'a box a person types in, or a picker, holds the redraw until it is left');
  });

  guard('J · the inventory write carries the copy as it stands when it goes, never as it stood when it was queued', () => {
    const c = sandbox({ fns: ['buildMediaPayload'], stubs: { _photoRefs: { [J]: [{ stableId: 'a', objectName: '' }] } } });
    const p = c.buildMediaPayload(J);
    c._photoRefs[J] = [{ stableId: 'a', objectName: 'Sofa' }, { stableId: 'b', objectName: 'Lamp' }];   // a read merged in meanwhile
    const sent = JSON.parse(JSON.stringify(p));
    eq(sent.items.map((r) => r.objectName), ['Sofa', 'Lamp'], '⚠ a retry sends the merged copy and what was edited after it');
    eq(sent.jobId, String(J), 'keyed on the client');
    ok(sent.savedAt > 0, 'and stamped as it goes');
  });

  guard('K · the mark of a client owed to the sheet is job data: cleared with it, never kept', () => {
    const c = sandbox({ vars: ['LOCAL_JOB_DATA_KEYS', 'LOCAL_KEEP_KEYS'] });
    ok(c.LOCAL_JOB_DATA_KEYS.test('hav_inv_owed'), 'hav_inv_owed is cleared with the job data');
    ok(!c.LOCAL_KEEP_KEYS.test('hav_inv_owed'), 'and not kept');
    // And it never looks like a client's manifest to the space reclaimer (it walks hav_media_*).
    ok('hav_inv_owed'.indexOf('hav_media_') !== 0, 'it is not under hav_media_, which the space reclaimer walks as manifests');
  });
  // ═══════════════════════════════════════════════════════════════════════
  guard('F2 · an edit made while a write is on its way is still counted, through the outbox and through the retry', () => {
    const clock = clockOf(), srv = server('A');
    seedSheet(srv, 6);
    const A = desk('Anthony Graziano', srv, clock);
    A.open();
    A.edit('s1', { objectName: 'Sofa, linen', namedBy: 'desk' });
    // The write leaves; before it lands, another box is changed (the request is already on its way, without it).
    A.beforeSave = () => { A.beforeSave = null; A.edit('s2', { objectName: 'Lamp, brass', namedBy: 'desk' }); clock.timers.forEach((t) => { if (!t.done) t.dead = true; }); };
    clock.run(3000);
    eq(sheetLine(srv, 's1').objectName, 'Sofa, linen', 'fixture: the first edit landed');
    eq(sheetLine(srv, 's2').objectName, '', 'fixture: the second, made while it was out, did not go with it');
    eq(A.ctx._invUnsentCount(J), 1, '⚠ and is still counted as not on the sheet (the write\'s send time, not its landing, decides)');
    // Through the retry: the write fails, then lands from the queue with another edit made while it is out.
    A.dropMedia = true;
    A.ctx._scheduleInventorySync(J); clock.run(3000);
    eq(Object.keys(A.ctx._pendingWrites), ['main/saveMedia:' + J], 'fixture: the write waits in the retry queue');
    A.dropMedia = false;
    A.beforeSave = () => { A.beforeSave = null; A.edit('s3', { objectName: 'Rug, wool', namedBy: 'desk' }); clock.timers.forEach((t) => { if (!t.done) t.dead = true; }); };
    A.ctx.retryPendingWrites();
    eq([sheetLine(srv, 's2').objectName, sheetLine(srv, 's3').objectName], ['Lamp, brass', ''], 'fixture: the retry carried the second edit, not the third');
    eq(A.ctx._invUnsentCount(J), 1, '⚠ the third is still counted');
  });

  guard('H4 · the agents\' presses ask the sheet first: Value lines, Re-value (the record\'s and the selection\'s), Check rooms', () => {
    const asked = [];
    const stubs = {
      SHEETS_SYNC_URL: SYNC, _invJob: () => JOB(), jobs: [JOB()], _avState: () => ({ running: false }), _arState: () => ({ running: false }),
      _getPhotoRef: () => ({ stableId: 's1', objectName: 'Sofa' }), _invPicked: () => [{ stableId: 's1', objectName: 'Sofa' }],
      _avHasFigure: () => false, alert: (m) => asked.push('alert: ' + m),
      invReadFirst: (jobId, what) => { asked.push(what); return true; },
    };
    const C = sandbox({ fns: ['agentValueRun', 'agentRevalue', 'invBulkRevalue', 'agentRoomCheckRun'], stubs: Object.assign({ agentValueableRefs: () => [{ stableId: 's1' }], agentRoomsToCheck: () => [] }, stubs) });
    C.agentValueRun(J); C.agentRevalue(J, 's1'); C.invBulkRevalue(J); C.agentRoomCheckRun(J, {});
    eq(asked, ['Value lines', 'Re-value', 'Re-value', 'Check rooms'], '⚠⚠ each asks the sheet first, by its own name');
    asked.length = 0;
    C.agentRoomCheckRun(J, { auto: true });
    eq(asked, [], 'the automatic room check does not ask here: its hand-off has just read the sheet (H5)');
  });

  guard('H5 · the agents\' hand-offs read the sheet again first, and where it does not answer nothing follows and the line says so', () => {
    const calls = [];
    let quiet = null;
    const mk = () => lift(['_agFinish', '_arFinish', '_agStateHtml', '_arStateHtml'], [], {
      _agRun: {}, _arRun: {}, savePhotoRefs() {}, _scheduleInventorySync() {}, _invRenderWhenIdle() {},
      agentRoomCheckRun: () => { calls.push('room check'); return false; }, agentValueAuto: () => { calls.push('Agent Two'); return true; },
      invReadQuiet: (jobId, go, failed) => { quiet = { go, failed }; return true; }, _agRepaint() {}, _arRepaint() {},
    });
    const C = mk();
    C._agState(J).total = 4; C._agState(J).named = 4;
    C._agFinish(J);
    eq(calls, [], '⚠ the naming\'s hand-off waits on its read');
    quiet.go(null);
    eq(calls, ['room check', 'Agent Two'], 'and hands on once it lands (no room to check, so Agent Two)');
    calls.length = 0;
    C._agFinish(J); quiet.failed();
    eq(calls, [], 'a read that does not land: nothing follows');
    has(C._agStateHtml(J), 'the room check and Agent Two did not follow: the sheet did not answer after the naming', 'and the naming\'s line says so');
    C._arState(J).total = 2; C._arState(J).done = 2;
    C._arFinish(J); quiet.failed();
    eq(calls, [], 'the room check\'s hand-off the same');
    has(C._arStateHtml(J), 'Agent Two did not follow: the sheet did not answer after the room check', 'and its line says so');
    C._arFinish(J); quiet.go(null);
    eq(calls, ['Agent Two'], 'and Agent Two follows once it lands');
  });

  guard('H6 · the sends refuse a read that failed this time, not only a device that never read the sheet', () => {
    // A desk read an hour ago (_invCloudSeen) whose read now fails: the release request, the package and the close-out filings stop.
    const notices = [];
    const base = {
      SHEETS_SYNC_URL: SYNC, _invCloudSeen: { [J]: true }, jobs: [JOB()], _invJob: () => JOB(), _docNotice: (t, m) => notices.push(String(m)),
      _invEnsureLoaded() {}, refreshPhotoRefs: (id, cb) => cb(false, false, null), setTimeout: () => 1, clearTimeout() {}, _dashSendState() {},
      deskFoldOpen() {}, showSyncBadge: (m) => notices.push(String(m)), _docBusy: null,
    };
    let built = 0;
    const R = sandbox({ fns: ['sendApprovalRequest'], vars: ['APPROVAL_REQ_KEY', 'APPROVAL_REQ_WATCHDOG_MS'], stubs: Object.assign({
      approvalRequestBlocker: () => '', approvalRequestSendBlocker: () => '', approvalRequestEsignRefusal: () => '', _invAwaitingApproval: () => [{ stableId: 's1' }],
      invFiduciaryMode: () => true, approvalRequestRecipients: () => ({ to: 'dan@example.com' }), printApprovalRequest: () => { built++; return { html: 'x' }; },
    }, base) });
    R.sendApprovalRequest(J);
    eq(built, 0, '⚠⚠ the release request is not built off this device\'s copy');
    has(notices.join('\n'), 'The inventory could not be read from the sheet, so the request could ask for lines another device has already had approved.', 'and says why');
    notices.length = 0;
    const F = sandbox({ fns: ['_fileCloseoutPaper', '_cpWhere'], vars: ['FILING_WATCHDOG_MS', 'PHOTO_SUBFOLDER'], stubs: Object.assign({
      _armFiling: () => () => true, _jobInvRefs: () => { built++; return [{}]; },
    }, base, { jobs: [Object.assign(JOB(), { driveFolder: 'https://drive.google.com/drive/folders/R' })], _invJob: () => Object.assign(JOB(), { driveFolder: 'https://drive.google.com/drive/folders/R' }) }) });
    built = 0;
    F._fileCloseoutPaper(J, {}, { name: 'Disposition Ledger', card: 'Disposition Ledger card', flight: {}, build: () => { built++; return { html: 'x' }; } });
    eq(built, 0, '⚠⚠ a close-out paper is not filed off this device\'s copy');
    has(notices.join('\n'), 'the inventory could not be read from the sheet', 'and says why');
    has(live(fn('sendProbatePackage')), "refreshPhotoRefs(jobId, function (_changed, ok) {\n    if (over) return;\n    // THIS read, never an earlier one (P6): a read that failed on a desk read an hour ago left it sending the hour-old copy.\n    if (ok === false || !_invCloudSeen[jobId]) {".replace(/\n    \/\/[^\n]*/, ''), 'and the inventory package asks the same of its read');
  });

  guard('S · a read copy whose read fails says so under the count, and the work bar is repainted when that changes', () => {
    const at = Date.parse('2026-10-27T01:42:00Z');   // 9:42 PM Eastern
    const prev = process.env.TZ; process.env.TZ = 'America/New_York';
    try {
      const C = sandbox({ fns: ['invSheetStaleWords', '_invManifestUnread'], stubs: { SHEETS_SYNC_URL: SYNC, _invCloudSeen: { [J]: true }, _invCloudFailed: { [J]: true }, _invReadAt: { [J]: at } } });
      eq(C.invSheetStaleWords(J), 'sheet not answering since 9:42 PM: this device’s copy', '⚠ in these words, with the time of the last read that landed');
      C._invCloudFailed = {};
      eq(C.invSheetStaleWords(J), '', 'nothing while the last read landed');
      C._invCloudFailed = { [J]: true }; C._invCloudSeen = {};
      eq(C.invSheetStaleWords(J), '', 'nor on a copy that has never read the sheet (invColdWords says that)');
    } finally { process.env.TZ = prev; }
    // A read that fails after one landed is recorded as failed (it was only before the first read).
    const failed = {};
    const R = lift(['refreshPhotoRefs'], [], { SHEETS_SYNC_URL: SYNC, _invCloudSeen: { [J]: true }, _invCloudFailed: failed, _photoRefs: { [J]: [] }, savePhotoRefs() {},
      fetch: () => SP.reject(new TypeError('Failed to fetch')), _withDeviceKey: (u) => u });
    R.refreshPhotoRefs(J, () => {});
    eq(failed[J], true, '⚠ a read desk whose read fails is marked failed');
    // The work bar is drawn again when the words move.
    let drawn = 0;
    const W = sandbox({ fns: ['_invColdRepaint'], stubs: { _invColdShown: { [J]: { bar: '', stale: '' } }, invColdWords: () => '', invSheetStaleWords: () => 'sheet not answering since 9:42 PM: this device’s copy',
      _invJob: () => JOB(), _jobInvRefs: () => [], _renderInvWorkbar: () => { drawn++; return '<div id="inv-workbar"></div>'; }, document: domStub({}), _invRenderWhenIdle() {} } });
    W._invColdRepaint(J);
    eq(drawn, 1, '⚠ the work bar is repainted by id when the stale words appear');
  });

  guard('D5 · refreshPhotoRefs answers once: a caller that throws is never told the read failed', () => {
    const calls = [];
    const R = lift(['refreshPhotoRefs'], [], { SHEETS_SYNC_URL: SYNC, _invCloudSeen: {}, _invCloudFailed: {}, _photoRefs: { [J]: [] }, savePhotoRefs() {},
      fetch: () => SP.resolve({ json: () => SP.resolve({ ok: true, media: {} }) }), _withDeviceKey: (u) => u, console: { error() {}, log() {}, warn() {} } });
    R.refreshPhotoRefs(J, (c, ok) => { calls.push(ok); throw new Error('the act threw'); });
    eq(calls, [true], '⚠ answered once, as landed (a second answer said the sheet had not answered, over an act that had read it)');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // P6's review (2026-10-27): what the first build left open, each driven as the review drove it.
  guard('H7 · ⚠⚠ two different sweeps pressed while one read is out both go, in the order pressed (the second was dropped with no word)', () => {
    const clock = clockOf(), srv = server('A');
    seedSheet(srv, 6);
    const B = desk('Ashley Jerome', srv, clock);
    B.open();
    B.pick(['s0', 's1', 's2']);
    B.holdReads = true;
    B.ctx._invBulkApply(J, 'category', 'Furniture');   // Set category… Furniture
    B.ctx._invBulkApply(J, 'condition', 'Good');       // Set condition… Good, a second later, the first read still out
    B.ctx._invBulkApply(J, 'condition', 'Good');       // and the same press again
    B.holdReads = false;
    eq(B.release(), 1, 'one read for the three presses');
    clock.run(4000);
    eq(['s0', 's1', 's2'].map((id) => [B.line(id).category, B.line(id).condition]), [['Furniture', 'Good'], ['Furniture', 'Good'], ['Furniture', 'Good']],
      '⚠⚠ both sweeps are on the lines (the condition was lost: ["Furniture", null])');
    eq(['s0', 's1', 's2'].map((id) => [sheetLine(srv, id).category, sheetLine(srv, id).condition]), [['Furniture', 'Good'], ['Furniture', 'Good'], ['Furniture', 'Good']],
      'and on the sheet');
    eq(B.alerts, [], 'nothing refused');
  });

  guard('H10 · two papers of one kind for two different parties, pressed while one read is out, each go (they shared one label)', () => {
    let held = null, reads = 0; const ran = [];
    const gets = [];
    const c = lift(['printBeneficiaryReceipt', 'printDonationRecord', 'printApprovalRequest', 'printSnapshotComparison', 'agentRevalue', 'invReadFirst', 'invReadFirstRefusal', '_invReadOpt'], [], {
      SHEETS_SYNC_URL: SYNC, _invCloudSeen: { [J]: true }, showSyncBadge() {}, alert() {}, _invEnsureLoaded() {}, _invRenderWhenIdle() {},
      invSheetChangeWords: () => '', refreshPhotoRefs: (id, cb) => { reads++; held = cb; },
      _invJob: () => JOB(), invColdRefusal: () => '', invFiduciaryMode: () => true, _invAssignItemNos: () => [], invReceiptGroups: () => [],
      invRecipientName: (n) => { ran.push('receipt ' + n); return n; }, samePerson: () => false,
      donationGroups: () => { ran.push('donation'); return []; },
      jobs: [JOB()], invWrittenReleasePicked: () => { ran.push('request: the selection'); return []; }, _invAwaitingApproval: () => { ran.push('request: all'); return []; },
      invWrittenReleaseNoneText: () => 'none', _snapLinesOf: (j, ts) => { ran.push('compare ' + ts); return null; }, _withSnapLines() {}, _snapPrevLive: () => null,
      _avState: () => ({ running: false }), _getPhotoRef: (j, id) => { gets.push(id); return { stableId: id, deletedAt: 1 }; },
    });
    c._invJob = () => Object.assign(JOB(), { invSnapshots: [{ ts: 111, label: 'Filed' }, { ts: 222, label: 'Later' }] });
    c.printBeneficiaryReceipt(J, 'Daniel Price');
    c.printBeneficiaryReceipt(J, 'Nora Price');
    c.printBeneficiaryReceipt(J, 'Nora Price');
    c.printDonationRecord(J, 's1');
    c.printDonationRecord(J, 's7');
    c.printApprovalRequest(J, false);
    c.printApprovalRequest(J, true);
    c.printSnapshotComparison(J, 111, 'now');
    c.printSnapshotComparison(J, 222, 'now');
    c.agentRevalue(J, 's1');
    c.agentRevalue(J, 's2');
    eq([reads, ran, gets], [1, [], ['s1', 's2']], 'fixture: one read out, nothing built yet');
    gets.length = 0;
    held(false, true, null);
    eq(ran, ['receipt Daniel Price', 'receipt Nora Price', 'donation', 'donation', 'request: all', 'request: the selection', 'compare 111', 'compare 222'],
      '⚠ each person\'s receipt, each charity\'s record, the request for all and for the selection, and each snapshot\'s comparison goes once the read lands, the same one twice going once (the second of each was dropped)');
    eq(gets, ['s1', 's1', 's2', 's2'], '⚠ and the record\'s Re-value on two lines each goes, keyed on its line (the second was dropped)');
  });

  guard('H8 · ⚠ a read that never answers lets go: the presses waiting on it are refused by name after 30 s, and the next press reads afresh', () => {
    const clock = clockOf(), srv = server('A');
    seedSheet(srv, 6);
    const B = desk('Ashley Jerome', srv, clock);
    B.open();
    B.hangReads = true;   // a connected but dead link: the read never answers, and fetch has no timeout
    B.pick(['s1']);
    B.ctx.invBulkRemove(J);
    B.ctx.exportInventoryCSV(J);
    clock.run(29000);
    eq(B.alerts, [], 'fixture: nothing said within the 30 s');
    clock.run(2000);
    eq(B.alerts, ['Not done: Remove lines and The CSV read the inventory from the sheet first, so that nothing acts on a copy another device has moved past, and the sheet did not answer. Nothing was changed. Check the connection, then try again.'],
      '⚠⚠ both presses are refused by name (one toast, then every later press did nothing until the request died)');
    eq(B.ctx.INV_READ_WATCHDOG_MS, 30000, 'after INV_READ_WATCHDOG_MS, 30 s');
    B.hangReads = false;
    const reads = B.sent('loadMedia').length;
    B.ctx.invBulkRemove(J);
    clock.run(6000);
    eq(B.sent('loadMedia').length, reads + 1, '⚠ the signal back, the next press asks the sheet afresh (it waited on the dead read for good)');
    eq(B.asks.length, 1, 'and goes on to its question');
    ok(!!sheetLine(srv, 's1').deletedAt, 'and the line is removed');
    // The gate lifted alone, on the clock: an answer that comes after the watchdog is drawn and acts on nothing.
    let lateG = null, wentG = 0, drawnG = 0; const saidG = [];
    const G = lift(['invReadFirst', 'invReadFirstRefusal'], [], { SHEETS_SYNC_URL: SYNC, _invCloudSeen: { [J]: true }, setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout,
      showSyncBadge() {}, alert: (m) => saidG.push(String(m)), _invEnsureLoaded() {}, invSheetChangeWords: () => '',
      refreshPhotoRefs: (id, cb) => { lateG = cb; }, _invRenderWhenIdle: () => { drawnG++; } });
    G.invReadFirst(J, 'The CSV', () => { wentG++; });
    clock.run(31000);
    eq([saidG.length, wentG], [1, 0], 'fixture: the gate\'s read let go, refused by name');
    lateG(true, true, null);
    eq([wentG, drawnG, saidG.length], [0, 1, 1], '⚠ and its answer, coming after, is drawn and acts on nothing (the CSV would have downloaded after the refusal)');
    // The agents' hand-off read lets go the same way: nothing follows, and the run's line says why.
    let late = null, failed = 0, went = 0, drawn = 0;
    const Q = lift(['invReadQuiet'], [], { SHEETS_SYNC_URL: SYNC, _invCloudSeen: { [J]: true }, setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout,
      refreshPhotoRefs: (id, cb) => { late = cb; }, _invRenderWhenIdle: () => { drawn++; } });
    Q.invReadQuiet(J, () => { went++; }, () => { failed++; });
    clock.run(31000);
    eq([failed, went], [1, 0], '⚠ the hand-off\'s read that never answers fails after 30 s: nothing follows');
    late(true, true, null);
    eq([failed, went, drawn], [1, 0, 1], 'and an answer after that is drawn and acts on nothing');
    // The open desk's own read: a read that hangs no longer stops the minute's re-read for good.
    const D = deskScreen();
    D.log.hang = true;
    D.ctx._invRefreshFromCloud();
    D.clock.run(30000 + 60000 + 500);
    eq(D.log.reads, 2, '⚠ a read that never answered: the desk reads again a minute after the watchdog (it was re-armed only in the answer)');
    const U = deskScreen();
    U.log.hang = true; U.ctx._invCloudSeen = {};
    U.ctx._invRefreshFromCloud();
    U.clock.run(30000 + 15500);
    eq(U.log.reads, 2, 'and a desk that has not read the client asks again in 15 s');
  });

  guard('H9 · ⚠⚠ the minute\'s re-read never asks DocuSign: one status check an hour on a desk left open, as on arrival (Decided: never on a timer)', () => {
    const clock = clockOf();
    const dom = domStub({ 'inv-job': String(J) });
    dom.getElementById('panel-inventory').classList.add('active');
    dom.hidden = false;
    const calls = [];
    const job = Object.assign(JOB(), { docState: { approvalRequest: { sentAt: '2026-10-27T20:00:00Z', req: { envelope: { id: 'ENV1', signers: [{ recipientId: '1', name: 'Daniel Price' }] } } } } });
    const C = sandbox({
      fns: ['_invRefreshFromCloud', '_invRereadArm', '_invRereadTick', '_invDeskShows', '_invCloudRetryArm', 'invSheetChangeWords', '_invManifestUnread',
        'approvalEnvelopeRefresh', 'approvalEnvelopeDue', 'approvalEnvelopeOut', 'approvalEnvelope', 'applyApprovalEnvelopeStatus', 'docStateBare'],
      vars: ['INV_DESK_REREAD_MS', 'INV_CLOUD_RETRY_MS', '_invReread', '_invCloudRetry', 'INV_READ_WATCHDOG_MS', 'ESIGN_RECHECK_MINS', 'APPROVAL_REQ_KEY',
        'APPROVAL_ENV_DONE', '_approvalEnvChecking', '_approvalEnvAskedAt'],
      stubs: {
        document: dom, Date: clock.Date, setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout,
        SHEETS_SYNC_URL: SYNC, _invCloudSeen: { [J]: true }, _invCloudFailed: {}, jobs: [job],
        refreshPhotoRefs: (id, cb) => cb(false, true, null), collectionLinesEnsure: () => 0, approvalEnvelopeApply: () => 0,
        _invRenderWhenIdle() {}, renderInventoryTab() {}, _deskFoldHeadsRepaint() {}, _invRefreshReleases() {}, _invReadLineRepaint() {}, _invColdRepaint() {},
        showSyncBadge() {}, _saveArrivalCheck() {}, _docNotice() {},
        _appsScriptPost: (u, b, cb) => { calls.push({ t: clock.t, action: b.action }); cb(true, { ok: true, envelopeId: 'ENV1', status: 'sent', signers: [{ recipientId: '1', status: 'sent' }] }); },
      },
    });
    C._invRefreshFromCloud();   // the desk opened on the client: an arrival
    eq(calls.length, 1, 'fixture: the desk opened asks DocuSign once');
    clock.run(3600 * 1000);
    eq(calls.length, 1, '⚠⚠ an hour with the desk left open: no other status check (it asked at 20, 40 and 60 minutes)');
    C._invRereadTick(J, 'visible');   // the page back in view is an arrival
    eq(calls.length, 2, 'the page back in view, past the floor, asks again');
    C._invRefreshFromCloud('retry'); C._invRefreshFromCloud('held');
    clock.run(25 * 60 * 1000);
    eq(calls.length, 2, 'and neither the 15 s retry nor a held workbook\'s read ever asks');
    // The retry as its timer makes it: a desk whose read failed, asking again every 15 s for half an hour.
    C._invCloudSeen = {}; C._invCloudFailed = { [J]: true };
    C._invCloudRetryArm(J);
    clock.run(30 * 60 * 1000);
    eq(calls.length, 2, '⚠ the 15 s retry, run by its own timer for half an hour, never asks DocuSign');
  });

  guard('Q · ⚠⚠ the space reclaimer never drops the copy of a client this device still owes the sheet (the stranded edit was lost for good)', () => {
    const clock = clockOf(), srv = server('A');
    seedSheet(srv, 6);
    const A1 = desk('Anthony Graziano', srv, clock);
    A1.open();
    A1.dropMedia = true;
    A1.edit('s4', { objectName: 'Mahogany secretary desk', namedBy: 'desk' });
    clock.run(4000);
    eq(sheetLine(srv, 's4').objectName, '', 'fixture: the write was lost');
    // The tab reloaded in the dead spot: the queue is empty. Before the start-up resend has run (2.5 s after load), and while its
    // read is out, the owed mark is all that says the sheet lacks this client's lines.
    const A2 = desk('Anthony Graziano', srv, clock, A1.stored());
    A2.offline = true;
    eq([Object.keys(A2.ctx._pendingWrites).length, A2.ctx._invUnsentCount(J)], [0, null], 'fixture: nothing queued, nothing learned of the sheet yet');
    eq(A2.ctx._invManifestEvictable(String(J), 'other-job'), false, '⚠⚠ an owed client\'s copy is not one the sheet can hand back');
    const freed = A2.ctx._invReclaimSpace('other-job', 2);
    eq(freed.jobs, [], 'the reclaim\'s second tier leaves it');
    ok(Object.prototype.hasOwnProperty.call(A2.stored(), 'hav_media_' + J), 'and the copy is still stored');
    // The start-up read fails: still kept.
    A2.ctx._invResendOwed();
    clock.run(5000);
    eq(A2.ctx._invManifestEvictable(String(J), 'other-job'), false, 'and once the start-up read has failed');
    // The next start-up, the signal back: the edit reaches the sheet.
    const A3 = desk('Anthony Graziano', srv, clock, A2.stored());
    A3.ctx._invResendOwed();
    clock.run(6000);
    eq(sheetLine(srv, 's4').objectName, 'Mahogany secretary desk', '⚠⚠ the stranded edit reaches the sheet (it stayed "" for good)');
    // Lines this session knows are not on the sheet keep the copy too, mark or no mark.
    const B = desk('Ashley Jerome', srv, clock);
    B.open();
    B.dropMedia = true;
    B.edit('s2', { objectName: 'Brass floor lamp', namedBy: 'desk' });
    clock.run(4000);
    B.ctx.localStorage.removeItem('hav_inv_owed');
    vm.runInContext('_pendingWrites = {}; _invSyncTimer = {};', B.ctx);
    eq(B.ctx._invUnsentCount(J), 1, 'fixture: one line this session knows is not on the sheet, nothing queued and no mark');
    eq(B.ctx._invManifestEvictable(String(J), 'other-job'), false, 'and its copy is kept');
  });

  guard('E4 · ⚠⚠ after a reload with the sheet still down, the copy waits in the queue: the chip names it, the close is challenged, and it goes once the signal is back', () => {
    const clock = clockOf(), srv = server('A');
    seedSheet(srv, 6);
    const A1 = desk('Anthony Graziano', srv, clock);
    A1.open();
    A1.dropMedia = true;
    A1.edit('s4', { objectName: 'Mahogany secretary desk', namedBy: 'desk' });
    A1.edit('s5', { fmv: '140' });
    clock.run(4000);
    const A2 = desk('Anthony Graziano', srv, clock, A1.stored());
    A2.offline = true;
    A2.ctx._invResendOwed();
    clock.run(60000);
    eq(Object.keys(A2.ctx._pendingWrites), ['main/saveMedia:' + J], '⚠⚠ the start-up read failed, so the copy waits in the retry queue (the queue was empty and nothing was ever sent)');
    eq(A2.ctx._pendingChipCopy().head, '⚠ Inventory changes for 1 client not yet on the sheet — retrying…', '⚠ the chip names it (it read "⚠ 0 unsaved change")');
    has(A2.ctx._pendingChipCopy().note, 'go again by themselves', 'and says it goes by itself');
    ok(A2.ctx._syncOwedOnUnload(), '⚠ and the close is challenged (it was not)');
    eq(A2.ctx._invResendSoon(), 0, 'a reconnect while the write waits in the queue asks nothing more (the queue sends it)');
    // The signal comes back later in the session: the queue sends it.
    A2.offline = false;
    A2.ctx.retryPendingWrites();
    clock.run(2000);
    eq([sheetLine(srv, 's4').objectName, sheetLine(srv, 's5').fmv], ['Mahogany secretary desk', '140'], '⚠⚠ the lines reach the sheet');
    ok(!JSON.parse(A2.stored().hav_inv_owed || '{}')[String(J)], 'and nothing is owed once it lands');
    eq(Object.keys(A2.ctx._pendingWrites), [], 'and the chip goes');
    // A mark standing with nothing waiting (the read that failed came back after a reconnect): asked again.
    const A3 = desk('Anthony Graziano', srv, clock, { hav_inv_owed: JSON.stringify({ [String(J)]: 1 }), ['hav_media_' + J]: A1.stored()['hav_media_' + J] });
    const r0 = A3.sent('loadMedia').length;
    eq(A3.ctx._invResendSoon(), 1, 'a reconnect or the page back in view, a mark standing and nothing waiting: the client is asked again');
    eq(A3.sent('loadMedia').length, r0 + 1, 'by a read of the sheet');
  });

  guard('E5 · the owed mark: a read that finds nothing owed takes it off with no write; a mark with no copy behind it is taken off and said', () => {
    const clock = clockOf(), srv = server('A');
    seedSheet(srv, 6);
    const A = desk('Anthony Graziano', srv, clock);
    A.open(); clock.run(4000);
    A.ctx._invOwedMark(J, true);   // a mark from an earlier session whose write did land
    ok(!!JSON.parse(A.stored().hav_inv_owed || '{}')[String(J)], 'fixture: the client is marked owed');
    const posts = A.sent('saveMedia').length;
    A.open(); clock.run(4000);
    ok(!JSON.parse(A.stored().hav_inv_owed || '{}')[String(J)], '⚠ a read that finds the sheet holding every line takes the mark off');
    eq(A.sent('saveMedia').length, posts, 'with no write');
    // A mark whose copy is gone from the device: taken off, and said.
    const B = desk('Anthony Graziano', srv, clock, { hav_inv_owed: JSON.stringify({ [String(J)]: 1 }) });
    eq(B.ctx._invResendOwed(), 1, 'fixture: one client marked');
    ok(!JSON.parse(B.stored().hav_inv_owed || '{}')[String(J)], 'the mark is taken off');
    has(B.badges.join('\n'), 'Inventory changes for HVL-2610-A9700 were waiting to reach the sheet, but this device holds no copy of that inventory now, so nothing could be sent.',
      '⚠ and said, by client (it was cleared in silence)');
    eq(B.sent('loadMedia').length, 0, 'nothing read for it');
    // One start-up read per client at a time: a reconnect while the first is still out asks nothing more.
    const C = desk('Anthony Graziano', srv, clock, { hav_inv_owed: JSON.stringify({ [String(J)]: 1 }), ['hav_media_' + J]: A.stored()['hav_media_' + J] });
    C.holdReads = true;
    C.ctx._invResendOwed();
    C.ctx._invResendSoon();
    C.ctx._invResendOwed();
    eq(C.sent('loadMedia').length, 1, '⚠ one read for the client while its start-up read is out (_invResending)');
    C.holdReads = false; C.release(); clock.run(4000);
    ok(!JSON.parse(C.stored().hav_inv_owed || '{}')[String(J)], 'and once it lands with nothing owed the mark comes off');
  });

  guard('G3 · ⚠ a page put down and picked up again sends its next write as ever, never with keepalive (browsers cap keepalive at 64 KB in flight)', () => {
    const clock = clockOf(), srv = server('A');
    seedSheet(srv, 6);
    const A = desk('Anthony Graziano', srv, clock);
    A.open();
    const at = SRC.indexOf("window.addEventListener('beforeunload'");
    const vis = SRC.indexOf("document.addEventListener('visibilitychange'", at);
    const snippet = SRC.slice(at, SRC.indexOf('\n});\n', vis) + 5);
    ok(at > 0 && vis > at && snippet.indexOf("'pageshow'") > 0 && snippet.indexOf("'online'") > 0, 'fixture: the listeners as registered');
    const wh = {}, dh = {};
    A.ctx.window = { addEventListener(ev, f) { wh[ev] = f; } };
    const doc = A.ctx.document; doc.hidden = false; doc.addEventListener = (ev, f) => { dh[ev] = f; };
    vm.runInContext(snippet, A.ctx, { filename: 'havellin.html (page listeners)' });
    ok(typeof dh.visibilitychange === 'function' && typeof wh.pageshow === 'function', 'fixture: registered');
    doc.hidden = true; dh.visibilitychange();
    eq(A.ctx._syncPageGoing, true, 'fixture: a page hidden counts as going');
    doc.hidden = false; dh.visibilitychange();
    eq(A.ctx._syncPageGoing, false, 'and back in view it does not');
    A.edit('s1', { objectName: 'Sofa, linen', namedBy: 'desk' }); clock.run(3000);
    eq(A.sent('saveMedia').map((x) => x.keepalive), [false], '⚠ a write after the page came back goes without keepalive');
    wh.pagehide();
    eq(A.ctx._syncPageGoing, true, 'fixture: a page left counts as going');
    wh.pageshow();
    A.edit('s2', { objectName: 'Lamp, brass', namedBy: 'desk' }); clock.run(3000);
    eq(A.sent('saveMedia').map((x) => x.keepalive), [false, false], '⚠ and after the page is shown again from the back-forward cache');
    // The reconnect, and the page back in view, ask again for a client still owed.
    A.ctx._invOwedMark(J, true);
    vm.runInContext('_pendingWrites = {}; _invSyncTimer = {};', A.ctx);
    const r0 = A.sent('loadMedia').length;
    wh.online();
    eq(A.sent('loadMedia').length, r0 + 1, 'a reconnect reads the sheet for a client still owed');
    A.ctx._invOwedMark(J, true);
    doc.hidden = true; dh.visibilitychange(); doc.hidden = false; dh.visibilitychange();
    eq(A.sent('loadMedia').length, r0 + 2, 'and so does the page back in view');
  });

  guard('R · ⚠⚠ Record approval on the selection reads the sheet first, and a read under its open dialog never records a signature against terms the dialog did not show (EST-01)', () => {
    const clock = clockOf(), srv = server('A');
    seedSheet(srv, 6);
    const A = desk('Anthony Graziano', srv, clock);
    const B = desk('Ashley Jerome', srv, clock, null, { roots: ['invRecordApproval', 'invSaveApproval', 'closeInvApproval', 'invApprovalComplete'] });
    A.open(); B.open();
    const art = { namedBy: 'desk', category: 'Art & Décor', disposition: 'Auction', channel: 'Kodner Galleries', valSource: 'Dealer quote' };
    A.edit('s3', Object.assign({ objectName: 'Oil on canvas, harbour scene, signed', fmv: '2400' }, art));
    A.edit('s4', Object.assign({ objectName: 'Pair of Chinese export vases', fmv: '1800' }, art));
    A.edit('s5', Object.assign({ objectName: 'Georgian silver tea service', fmv: '2200' }, art));
    clock.run(3000);
    B.open();
    eq([B.line('s3').channel, B.line('s4').channel], ['Kodner Galleries', 'Kodner Galleries'], 'fixture: B holds both leaving to Kodner Galleries');
    // A sends #5 to another auction house after B's last read.
    A.edit('s4', { channel: 'Leslie Hindman Auctioneers' });
    clock.run(3000);
    B.pick(['s3', 's4']);
    const reads = B.sent('loadMedia').length;
    const opened = B.ctx.invRecordApproval(J);
    ok(opened === true, 'fixture: the dialog opened (' + opened + ')');
    eq(B.sent('loadMedia').length, reads + 1, '⚠⚠ the press read the sheet first (it was the one press on the selection bar that did not)');
    const sel = B.ctx.document.getElementById('ia-body').innerHTML;
    has(sel, 'Leslie Hindman Auctioneers', 'and the dialog lists the line as the sheet holds it');
    // While the dialog is open, A retypes #4 as a $24,000 gift to a cousin and puts $100 on #5, and B's minute read lands under
    // the dialog.
    A.edit('s3', { disposition: 'Distribute', channel: 'Cousin Pete', fmv: '24000' });
    A.edit('s4', { fmv: '1900' });
    clock.run(3000);
    B.open();
    eq([B.line('s3').disposition, B.line('s3').channel], ['Distribute', 'Cousin Pete'], 'fixture: the read merged the gift in under the open dialog');
    B.ctx.document.getElementById('ia-fid-0').checked = true;
    B.ctx.document.getElementById('ia-date').value = B.ctx._todayStr();
    B.ctx.invSaveApproval();
    clock.run(3000);
    ok(!String(B.line('s3').authBy || '').trim(), '⚠⚠ the gift is not recorded as approved (it took the signature given for the $2,400 consignment)');
    eq(B.ctx.invApprovalComplete(B.line('s3'), B.ctx._invJob(J)), false, '⚠⚠ and is not cleared to leave');
    ok(!String(sheetLine(srv, 's3').authBy || '').trim(), 'nor on the sheet');
    has(B.ctx.document.getElementById('ia-body').innerHTML, 'Oil on canvas, harbour scene, signed, changed since this dialog opened', '⚠ and the dialog names it');
    eq([B.line('s4').authBy, B.line('s4').authFor && B.line('s4').authFor.channel, B.line('s4').authFor && B.line('s4').authFor.fmv],
      ['Daniel Price', 'Leslie Hindman Auctioneers', 1800], 'the line whose terms stand (a $100 rise is inside Ask 5) is recorded, pinned to what the dialog showed');
    eq(sheetLine(srv, 's4').authBy, 'Daniel Price', 'and on the sheet');
    // Every line moved: nothing recorded, and the dialog says to press Record approval again.
    B.pick(['s5']);
    ok(B.ctx.invRecordApproval(J) === true, 'fixture: a second dialog opened');
    A.edit('s5', { channel: 'Doyle Auctioneers' }); clock.run(3000); B.open();
    B.ctx.document.getElementById('ia-fid-0').checked = true;
    B.ctx.document.getElementById('ia-date').value = B.ctx._todayStr();
    eq(B.ctx.invSaveApproval(), false, 'a dialog whose every line moved records nothing');
    has(B.ctx.document.getElementById('ia-fb').innerHTML, 'changed since this dialog opened. Close it and press Record approval again.', 'and names the press to make again');
  });

  guard('R2 · ⚠⚠ a sign-out records only the lines its signed sheet carries: a ticked line a read moved off the taker stops the filing, on both routes', () => {
    const L1 = { stableId: 's1', objectName: 'Sofa', itemNo: 1 }, L2 = { stableId: 's2', objectName: 'Brass lamps', itemNo: 2 }, L3 = { stableId: 's3', objectName: 'Wool rug', itemNo: 3 };
    // The person ticked #1 and #2 and left #3 unticked.
    let g = { kind: 'pickup', taker: 'Kodner Galleries', lines: [L1, L2, L3], ready: [L1, L2, L3], done: [], waiting: [] };
    const filed = [], fbs = [], pdfs = [];
    const dom = domStub({});
    const C = lift(['signoutFileFromPad', 'pickupFileFromDialog', '_signoutStill', '_signoutMovedRefusal', '_signoutBodyHtml'], [], {
      _pickupCtx: { jobId: J, kind: 'pickup', key: 'k', vendor: 'Kodner Galleries', taker: 'Kodner Galleries' },
      _invJob: () => JOB(), signoutGroupFor: () => g, _signoutTicked: () => ['s1', 's2'], signPadSigned: () => true, signPadDataUrl: () => 'data:',
      SHEETS_SYNC_URL: SYNC, document: dom, showFB: (id, t, m) => fbs.push(String(m)),
      signoutSheetHtml: (job, gg, lines) => lines.map((r) => r.stableId).join(','),
      _signoutPdf: (job, t, html, cb) => { pdfs.push(html); cb({ name: 'x.pdf' }); },
      fileSignedCopy: (jid, kind, meta) => { filed.push(meta); return true; },
      _invStampBy: () => 'Ashley Jerome', _todayStr: () => '2026-10-27',
      SIGNED_RECORD_KINDS: { pickup: { label: 'The vendor pickup list' } }, SIGNOUT_KINDS: { pickup: { title: 'Pickup' } },
      _getPhotoRef: (j, id) => [L1, L2, L3].find((r) => r.stableId === id), _invNamed: (r) => '#' + r.itemNo + ' ' + r.objectName, _invItemNo: (r) => r.itemNo,
    });
    dom.getElementById('ip-signer').value = 'Joe Kodner';
    g = Object.assign({}, g, { lines: [L1, L3], ready: [L1, L3] });   // a read under the open dialog moved #2 to another taker
    C.signoutFileFromPad();
    eq([filed.length, pdfs.length], [0, 0], '⚠⚠ nothing is filed (#2 was recorded as released to Kodner, with a custody event, though the signed PDF did not carry it)');
    has(fbs.join('\n'), 'Not filed: #2 Brass lamps has changed since this dialog opened', 'and the line is named');
    has(dom.getElementById('ip-body').innerHTML, 'data-sid="s1" checked', 'the lines are drawn again as they read now, the other tick kept');
    has(dom.getElementById('ip-body').innerHTML, 'data-sid="s3"', 'the line left unticked still listed');
    lacks(dom.getElementById('ip-body').innerHTML, 'data-sid="s3" checked', '⚠ and still unticked (drawn again, every ready line came back ticked)');
    lacks(dom.getElementById('ip-body').innerHTML, 'data-sid="s2"', 'without the line moved off');
    C.pickupFileFromDialog({ files: [{ name: 'sheet.jpg' }], value: 'x' });
    eq(filed.length, 0, 'the photographed sheet\'s route stops the same way');
    C._signoutTicked = () => ['s1'];
    C.signoutFileFromPad();
    eq([filed.map((m) => m.stableIds), pdfs], [[['s1']], ['s1']], 'ticked as the lines read now, it files what the sheet printed');
  });

  guard('R3 · ⚠⚠ a proceeds statement writes only the lot boxes a person changed, never a prefill a read has moved past', () => {
    const lines = [{ stableId: 's1', label: 'inventory', disposition: 'Auction', channel: 'Kodner Galleries', gross: 250, fees: 60, itemNo: 1 },
      { stableId: 's2', label: 'inventory', disposition: 'Auction', channel: 'Kodner Galleries', gross: 100, fees: 20, itemNo: 2 }];
    const box = (cls, sid, was, v) => ({ className: cls, value: v, checked: true, getAttribute: (k) => ({ 'data-sid': sid, 'data-was': was })[k] });
    // The dialog opened with #1's gross at $100 (another device has since typed $250, which a read merged in) and #2's at $100,
    // which the person typed over with $120.
    const els = { cb: [box('', 's1'), box('', 's2')], g: [box('ps-lot-g', 's1', '100', '100'), box('ps-lot-g', 's2', '100', '120')],
      f: [box('ps-lot-f', 's1', '50', '50'), box('ps-lot-f', 's2', '20', '20')] };
    const dom = domStub({ 'ps-job': String(J), 'ps-vendor': 'Kodner Galleries', 'ps-date': '2026-10-20', 'ps-gross': '370', 'ps-fees': '70', 'ps-net': '300' });
    dom.__seed('ps-lines', { querySelectorAll: (q) => (q.indexOf('checkbox') >= 0 ? els.cb : q.indexOf('ps-lot-g') >= 0 ? els.g : els.f) });
    const C = lift(['saveProceedsStatement'], [], {
      document: dom, _invJob: () => JOB(), _jobInvRefs: () => lines, _setPhotoRef() {}, _invTouch: (r) => r, savePhotoRefs() {}, _scheduleInventorySync() {},
      jobListPut: (job, list, rec) => rec, proceedsReconciliation: () => ({ statements: [] }), closeProceedsStatement() {}, showSyncBadge() {}, renderInventoryTab() {},
      _actor: () => 'Anthony Graziano',
    });
    ok(C.saveProceedsStatement(), 'fixture: the statement saved');
    eq([lines[0].gross, lines[0].fees], [250, 60], '⚠⚠ #1 keeps the $250 and $60 the read brought (the boxes\' stale $100 and $50 prefills were written over them)');
    eq(lines[1].gross, 120, 'and #2 takes the $120 typed');
  });
};
