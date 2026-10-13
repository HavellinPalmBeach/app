'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// THE TRIAGE BAR, 2026-10-13: ten items the job-flow audit (2026-10-08) and the core-jobs run (2026-10-10) found and left
// open, each built because it needs no call from Anthony.
//
//   T1  File signed copy had no watchdog: an upload that never answered refused every later press as "being filed now".
//   T2  A walkaway's terminal row said the whole sum received was *retained* while a refund was due under it.
//   T3  The dashboard kept its own list of estate services beside isDecedentJob.
//   T4  The desk's More ▾ menu closed on every redraw.
//   T5  The Court Inventory and the Trust Schedule printed a dash for a basis the report prints *not stated*.
//   T6  The Net column went on the wire as "Net to Estate" after the deployment that reads either name was live.
//   T7  Hours could be logged on a future date.
//   T8  A fee-only Home Prep's Build Estimate summary showed three $0 rows.
//   T9  A Home Prep second invoice sent before the vendors were booked said nothing about it.
//   T10 The midpoint invoice's due date was described two ways (the band's halfway, the plan's every room locked).
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source, fn, decl, domStub, driveCalcAll } = require('./harness');

const SRC = source();
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
const noComments = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
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
  return { fns: [...fns], vars: [...vars] };
}
function lift(roots, stop, stubs) {
  const c = closure(roots, (stop || []).concat(Object.keys(stubs || {})));
  return sandbox({ fns: c.fns, vars: c.vars, stubs: stubs || {} });
}
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }
function timers() {
  const q = [];
  return { q, setTimeout: (f, ms) => { q.push({ f, ms, live: true }); return q.length; }, clearTimeout: (i) => { if (i && q[i - 1]) q[i - 1].live = false; },
           fire() { q.forEach((t) => { if (t.live) { t.live = false; t.f(); } }); } };
}
const inEastern = (body) => { const prev = process.env.TZ; process.env.TZ = 'America/New_York'; try { return body(); } finally { process.env.TZ = prev; } };
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&middot;/g, '·').replace(/\s+/g, ' ');

const LIST_FNS = ['jobListEntries', 'jobListGet', 'jobListPut', 'jobListRemove', 'jobListVoid', 'newJobListId', '_saveJobEdit', '_jobTouch'];
const ROOMS = [{ idx: 1, name: 'Study', st: 'in' }, { idx: 4, name: 'Kitchen', st: 'in' }];
const LINE = (id, over) => Object.assign({
  stableId: id, label: 'inventory', collId: null, roomIdx: 1, seq: 1, status: 'uploaded',
  objectName: 'Sideboard', category: 'Furniture', ts: 100, updatedAt: 100,
  driveFileId: 'f' + id, driveFileUrl: 'https://drive.google.com/file/d/f' + id + '/view',
}, over || {});
const ESTATE = (o) => Object.assign({
  id: 7, name: 'Walter Ellsworth', hvlId: 'HVL-0007', svc: 'probate', addr: '69 Beach Blvd', status: 'active', won: true, approved: true,
  executor: 'Rex Hale', executorRole: 'Personal Representative', deathDate: '2026-08-01', tc: 'Ashley Jerome',
  matterType: 'probate', docTier: 'values', driveFolder: 'https://drive.google.com/drive/folders/ROOT7',
  driveSubfolders: { 'Estate Inventory': 'INV7', 'As-Found Record': 'AF7', 'Signed Records': 'SR7' },
  docState: {}, at: {}, payments: [],
}, o || {});

module.exports = function ({ group, ok, eq, has, lacks }) {
  const G = (name, body) => { group(name); try { inEastern(body); } catch (e) { ok(false, name + ' — threw: ' + String(e && e.stack || e).split('\n').slice(0, 4).join(' | ')); } };

  // ═════════════════════════════════════════════════════════════════
  G('T1 · File signed copy: an upload that never answers lets go after the watchdog, and says so', () => {
    const t = timers();
    const log = { uploads: [], said: [] };
    const job = { id: 41, hvlId: 'HVL-2610-ABCD', name: 'Estate of Adler', svc: 'cleanout', tc: 'Ashley Jerome',
      driveFolder: 'https://drive.google.com/drive/folders/ROOT41', at: {} };
    const S = sandbox({
      fns: ['fileSignedCopy', '_signedCopyName', 'signedRecordsOf', '_jobRootFolderId', '_ymdLocal', '_actor', '_invStampBy', 'deviceUser', '_armFiling'].concat(LIST_FNS),
      vars: ['SIGNED_RECORD_KINDS', 'SIGNED_COPY_MAX_BYTES', '_signedFiling', 'SIGNED_RECORDS_SUBFOLDER', 'JOB_RECORD_LISTS', 'FILING_WATCHDOG_MS'],
      stubs: {
        SHEETS_SYNC_URL: 'https://script.google.com/macros/s/X/exec', saveJobs() {}, syncJobToSheets() {},
        setTimeout: t.setTimeout, clearTimeout: t.clearTimeout,
        resolveSubfolderId(j, name, cb) { cb('SUBSIGNED'); },
        uploadToDrive(folderId, filename, dataUrl, cb) { log.uploads.push({ folderId, filename, cb }); },
        FileReader: function () { const self = this; self.readAsDataURL = function (file) { self.result = 'data:' + file.type + ';base64,QUJD'; if (self.onload) self.onload(); }; },
      },
    });
    S.jobs = [job];
    const PDF = { name: 'Release approval signed.pdf', type: 'application/pdf', size: 250000 };
    const cb = (ok2, msg, rec) => { log.said.push({ ok: ok2, msg, rec }); };
    const meta = { ref: 'ap-1', stableIds: ['3'], signedBy: 'Ruth Adler', signedOn: '2026-10-02' };

    ok(S.fileSignedCopy(41, 'approval', meta, PDF, cb), 'a filing starts');
    eq(log.uploads.length, 1, 'and the upload is out');
    eq(Object.keys(S._signedFiling), ['41|approval|ap-1'], 'the paper is marked as being filed');
    eq(t.q.length, 1, 'with one watchdog armed');
    eq(t.q[0].ms, S.FILING_WATCHDOG_MS, 'at the one figure every filing uses');
    eq(S.fileSignedCopy(41, 'approval', meta, PDF, cb), false, 'a second press while it is out is refused');
    has(log.said[0].msg, 'being filed now', '…as "being filed now"');
    t.fire();
    eq(Object.keys(S._signedFiling), [], '⚠⚠ no answer: the watchdog clears the mark');
    const w = log.said[1];
    ok(w && w.ok === false, 'and the callback is told');
    has(w.msg, 'Signed release approval: no answer from Drive after 2 minutes', 'naming the paper and the wait');
    has(w.msg, 'Signed Records folder', 'and where to look before filing it again');
    ok(S.fileSignedCopy(41, 'approval', meta, PDF, cb), '⚠⚠ the next press is not refused');
    eq(log.uploads.length, 2, 'a second upload goes out');
    // The first, late, answer: a copy that landed is recorded; a failure already reported is not reported twice.
    const before = log.said.length;
    log.uploads[0].cb(false);
    eq(log.said.length, before, 'a late failure stays silent (the watchdog already spoke)');
    eq(Object.keys(S._signedFiling), ['41|approval|ap-1'], 'and never clears the newer press\'s mark');
    log.uploads[0].cb(true, 'https://drive.google.com/file/d/F1/view', 'F1');
    eq((job.signedRecords || []).length, 1, 'a late success still records the copy that landed');
    ok(!!S._signedFiling['41|approval|ap-1'], 'and the newer press keeps its mark');
    log.uploads[1].cb(true, 'https://drive.google.com/file/d/F2/view', 'F2');
    eq(Object.keys(S._signedFiling), [], 'which its own answer clears');
    eq((job.signedRecords || []).length, 2, 'both copies are on the record (the filings replace by name in Drive)');
    // Every exit lets go through release(): nothing deletes the mark by hand any more.
    const body = noComments(fn('fileSignedCopy'));
    lacks(body, 'delete _signedFiling[key]', 'no exit deletes the mark by hand');
    lacks(body, '_signedFiling[key] = true', 'and none sets it without the watchdog');
    has(body, '_armFiling(_signedFiling, key,', 'the one watchdog');
  });

  // ═════════════════════════════════════════════════════════════════
  G('T2 · the walkaway\'s terminal row names what is kept and the refund due, never the whole sum as retained', () => {
    const PAY = (stage, amount) => ({ uid: 'p' + stage, stage, amount, receivedOn: '2026-09-20', method: 'wire', clearedAt: '2026-09-20' });
    const job = { id: 1, name: 'Sofia Ricci', svc: 'downsizing', status: 'closed_retained', won: true, approved: true, tc: 'Ashley Jerome',
      lostReasonLabel: 'Family withdrew', lostAt: '2026-10-01T15:00:00Z', payments: [PAY('deposit', 2000), PAY('midpoint', 500)], docState: {}, at: {} };
    const rec = { estimate: { rooms: [], havellinTotal: 4000, total: 4000 }, approved: true };
    const R = lift(['jobTimeline'], [], { _todayStr: () => '2026-10-13', jobs: [job], estimateStore: { 1: rec }, changeOrders: [], jobPlanStore: {}, Intl: global.Intl });
    const row = (settle) => R.jobTimeline(job, rec, [], [], null, settle)[0];
    const due = row({ basis: 'hourly', received: 2500, refunded: 0, held: 2500, deposit: 2000, work: 1200, earned: 2000, due: 500, owed: 0, retained: 2000 });
    eq(due.key, 'terminal', 'the one row of a dead job');
    has(due.sub, 'Family withdrew · $2,000 retained · $500 refund due', '⚠⚠ with a refund due the row names what is kept and what goes back');
    lacks(due.sub, '$2,500 retained', 'never the whole sum received as retained');
    const unk = row({ basis: 'unknown', received: 2500, refunded: 0, held: 2500, wait: 'its hours log', due: 0, retained: 2500 });
    has(unk.sub, '$2,500 held · the settlement waits on its hours log', 'an unknown settlement holds the money, and says what it waits on');
    lacks(unk.sub, 'retained', '…and claims nothing retained');
    const fixed = row({ basis: 'fixed', received: 2500, refunded: 0, held: 2500, earned: 2500, due: 0, retained: 2500 });
    has(fixed.sub, '$2,500 retained', 'a fixed price with nothing due reads as before');
    const settled = row({ basis: 'hourly', held: 2500, deposit: 2000, work: 3000, earned: 3000, due: 0, owed: 500, retained: 2500 });
    has(settled.sub, '$2,500 retained', 'so does an hourly job whose work exceeds what came in');
    has(row(null).sub, '$2,500 retained', 'and a rail handed no settlement');
    // Once the refund is recorded the net kept is named (P22), unchanged.
    const paidBack = Object.assign({}, job, { payments: job.payments.concat([{ uid: 'r1', stage: 'refund', amount: 500, refundedOn: '2026-10-05', method: 'wire' }]) });
    const back = R.jobTimeline(paidBack, rec, [], [], null, { basis: 'hourly', held: 2000, due: 0, retained: 2000 })[0];
    has(back.sub, '$2,000 retained', 'after the refund the row names what is kept');
    // The join: both dashboard renders hand the rail the real settlement on a retained job, and nothing else.
    const calls = [fn('jobProgressBlockHtml'), fn('renderClientDashboard')].map(noComments);
    has(calls[0], "jobTimeline(job, estRec, logs, cos, sched, job.status === 'closed_retained' ? walkawaySettlement(job) : null)", 'the progress block hands in walkawaySettlement on a retained job');
    has(calls[1], "jobTimeline(job, estRec, logs, cos, _jtSched, job.status === 'closed_retained' ? walkawaySettlement(job) : null)", 'and so does the dashboard');
    eq(SRC.split('jobTimeline(job, estRec, logs, cos, ').length - 1, 3, 'the definition and the rail\'s two callers, no other');
    // The shape the row reads is the settlement's own: basis, held, due, retained, wait.
    const W = lift(['walkawaySettlement'], [], { estimateStore: {}, jobs: [job], hoursLogReady: () => false, invoiceHtml: () => null, Intl: global.Intl });
    const s = W.walkawaySettlement(job);
    eq([s.basis, s.held, s.due, s.retained, s.wait], ['unknown', 2500, 0, 2500, 'its estimate'], 'walkawaySettlement answers basis, held, due, retained and wait (no estimate: unknown)');
  });

  // ═════════════════════════════════════════════════════════════════
  G('T3 · the dashboard asks isDecedentJob, and keeps no estate list of its own', () => {
    const body = noComments(fn('renderClientDashboard'));
    has(body, 'var isEstateDash = isDecedentJob(job);', 'one rule');
    lacks(body, "job.svc === 'cleanout' || job.svc === 'probate'", 'the hard-coded list is gone');
    const D = sandbox({ fns: ['isDecedentJob'], vars: ['DECEDENT_SERVICES'] });
    eq(['cleanout', 'probate', 'contested_probate'].map((s) => D.isDecedentJob({ svc: s })), [true, true, true], 'which answers the three estate services');
    eq(['downsizing', 'downsizing_move', 'home_cleanout', 'prep'].map((s) => D.isDecedentJob({ svc: s })), [false, false, false, false], 'and no living one');
  });

  // ═════════════════════════════════════════════════════════════════
  G('T4 · the desk\'s More ▾ menu keeps its state across a redraw', () => {
    const bar = (seed) => {
      const job = ESTATE();
      const s = lift(['_renderInvWorkbar'], [], {
        jobs: [job], _photoRefs: { 7: [LINE('a')] }, estimateStore: { 7: { estimate: { rooms: ROOMS } } }, document: domStub(seed || {}),
      });
      return s._renderInvWorkbar(job, s._jobInvRefs(7));
    };
    const closed = bar({});
    has(closed, '<details id="inv-more" style="position:relative;"><summary', 'with no menu on screen the menu draws closed');
    const open = bar({ 'inv-more': { open: true } });
    has(open, '<details id="inv-more" style="position:relative;" open><summary', '⚠⚠ a menu open on screen is drawn open again');
    eq(open.split('<details').length - 1, 1, 'one menu');
    const shut = bar({ 'inv-more': { open: false } });
    has(shut, '<details id="inv-more" style="position:relative;"><summary', 'and one closed by hand stays closed');
  });

  // ═════════════════════════════════════════════════════════════════
  G('T5 · the schedule table prints *not stated* for a line with no basis, as the report does', () => {
    const s = lift(['_invScheduleSection'], [], {});
    const rows = (list) => s._invScheduleSection('Furniture', list).html;
    const none = rows([{ objectName: 'Sideboard', qty: 1, fmv: 1200, valSource: '' }]);
    has(none, '<span style="color:#A32D2D;">not stated</span>', '⚠⚠ a valued line with no basis reads not stated, in red');
    lacks(text(none), '—', 'never a dash');
    const named = rows([{ objectName: 'Sideboard', qty: 1, fmv: 1200, valSource: 'Appraisal' }]);
    has(named, '>appraisal</td>', 'a basis prints its word');
    lacks(named, 'not stated', '…and nothing else');
    eq(noComments(fn('printEstateInventoryReport')).split('<span style="color:#A32D2D;">not stated</span>').length - 1, 1, 'the report prints the same words');
  });

  // ═════════════════════════════════════════════════════════════════
  G('T6 · the Net column goes on the wire, into the CSV and onto the desk under one name', () => {
    const c = sandbox({ vars: ['INVENTORY_COLUMNS'] });
    const net = c.INVENTORY_COLUMNS.filter((x) => x.key === 'net')[0] || {};
    eq(net.header, 'Net Proceeds', 'Net Proceeds');
    eq(net.sheetHeader, undefined, '⚠⚠ no second name for the wire');
    ok(!c.INVENTORY_COLUMNS.some((x) => x.sheetHeader), 'no column carries one');
    const job = ESTATE();
    const p = lift(['buildInventoryPayload', 'buildInventoryCSV'], ['savePhotoRefs'], { savePhotoRefs() {}, document: domStub({}),
      jobs: [job], _photoRefs: { 7: [LINE('a', { itemNo: 1, disposition: 'Auction', channel: 'Kodner', gross: 1000, fees: 250 })] }, estimateStore: {}, jobPlanStore: {} });
    p.jobs = [job]; p._photoRefs = { 7: [LINE('a', { itemNo: 1, disposition: 'Auction', channel: 'Kodner', gross: 1000, fees: 250 })] };
    const cols = p.buildInventoryPayload(7).columns;
    ok(cols.indexOf('Net Proceeds') > 0, 'the payload names the column Net Proceeds');
    eq(cols.indexOf('Net to Estate'), -1, '⚠⚠ and never Net to Estate');
    const csv = p.buildInventoryCSV(7).split('\r\n');
    eq(csv[0], cols.join(','), 'the CSV\'s header row is the payload\'s own column list');
    eq(csv.length, 2, 'one line');
    lacks(noComments(fn('buildInventoryPayload')), 'sheetHeader', 'the payload reads header alone');
    lacks(noComments(fn('buildInventoryCSV')), 'INVENTORY_COLUMNS', 'the CSV keeps no header list of its own');
    // The script finds the column under the one name (2026-10-03, live).
    const gs = require('fs').readFileSync(require('path').join(__dirname, '..', 'apps-script', 'saveInventory.gs'), 'utf8');
    has(gs, "idx('Net Proceeds')", 'saveInventory.gs resolves the Net formula by Net Proceeds');
  });

  // ═════════════════════════════════════════════════════════════════
  G('T7 · hours on a day after today are refused by name, and nothing is written', () => {
    const rig = (date) => {
      const said = [];
      const dom = domStub({ 'log-job': { value: '21' }, 'log-date': { value: date }, 'log-activity': { value: 'Packing' },
        'log-m0-name': { value: 'Ashley Jerome' }, 'log-m0-hrs': { value: '1' } });
      const S = sandbox({ fns: ['saveLogEntry'], stubs: {
        document: dom, jobs: [{ id: 21, status: 'active' }], _todayStr: () => '2026-10-13',
        getJobCrew: () => ({ confirmed: true }), isJobFunded: () => true, depositTargetFor: () => 1000, depositPaidTotal: () => 1000, fmt: (n) => '$' + n,
        buildLogTeamRows() {}, showFB: (id, type, msg) => said.push({ id, type, msg }),
        isHalfHours() { throw new Error('reached the rows'); },
      } });
      return { said, run: attempt(() => S.saveLogEntry()) };
    };
    const future = rig('2026-10-14');
    ok(future.run.ok, 'tomorrow: the handler returns');
    eq(future.said.map((s) => s.type + ': ' + s.msg), ['warn: That date is after today. Hours are logged for days already worked.'], '⚠⚠ refused by name');
    const today = rig('2026-10-13');
    eq(today.run.ok, false, 'today is not refused: the handler goes on to the rows');
    has(today.run.err, 'reached the rows', '…');
    eq(today.said, [], 'and says nothing about the date');
    const past = rig('2026-10-12');
    has(past.run.err || '', 'reached the rows', 'nor is yesterday');
    has(noComments(fn('saveLogEntry')), 'if (date > _todayStr())', 'local calendar days compared as text, never the clock');
  });

  // ═════════════════════════════════════════════════════════════════
  G('T8 · a fee-only Home Prep hides the three $0 rows the fixed-price reset re-showed', () => {
    const disp = (d, id) => d.doc.getElementById(id).style.display;
    const feeOnly = driveCalcAll({ svc: 'prep', sqft: 3500, rooms: [] });
    eq(['s-tc-fee-row', 's-ps-fee-row', 's-pkg-row'].map((id) => disp(feeOnly, id)), ['none', 'none', 'none'], '⚠⚠ no concierge fee, specialist fee or materials row on a fee-only estimate');
    eq(disp(feeOnly, 's-fixed-row'), 'none', 'and no fixed fee row (the box is hidden on Home Prep)');
    const declutter = driveCalcAll({ svc: 'prep', sqft: 3500, rooms: [], seed: { 'e-declutter-hrs': '2' } });
    eq(['s-tc-fee-row', 's-ps-fee-row', 's-pkg-row'].map((id) => disp(declutter, id)), ['', 'none', 'none'], 'declutter hours put the concierge fee row back, and only it');
    const hourly = driveCalcAll({ svc: 'downsizing_move', sqft: 3500, rooms: ['Kitchen'] });
    eq(['s-tc-fee-row', 's-ps-fee-row', 's-pkg-row'].map((id) => disp(hourly, id)), ['', '', ''], 'an hourly job shows all three');
    const fixed = driveCalcAll({ svc: 'cleanout', sqft: 3500, rooms: ['Kitchen'], seed: { 'e-fixed': true, 'e-fixed-amount': '$20,000' } });
    eq(['s-tc-fee-row', 's-ps-fee-row', 's-pkg-row'].map((id) => disp(fixed, id)), ['none', 'none', 'none'], 'a fixed price hides them for the fee, as before');
    eq(disp(fixed, 's-fixed-row'), '', '…and shows the fee');
  });

  // ═════════════════════════════════════════════════════════════════
  G('T9 · a Home Prep second invoice sent before every vendor is booked says so, and is never refused', () => {
    const est = { svc: 'prep', prepEnabled: true, prepItems: [{ lid: 'a', type: 'Painting', cost: 4000 }, { lid: 'b', type: 'Staging', cost: 6000 }, { lid: 'c', type: 'Landscaping', cost: 1500 }] };
    const job = { id: 9, svc: 'prep', status: 'active', prepSourcing: { La: { status: 'Confirmed' } }, docState: {}, at: {} };
    const S = lift(['paymentStageWord', 'prepVendorsConfirmed'], [], { approvedEstimateFor: () => est, changeOrders: [], jobs: [job] });
    const D = sandbox({ vars: ['DOC_ACTIONS'], stubs: { paymentStageWord: S.paymentStageWord, prepVendorsConfirmed: S.prepVendorsConfirmed, approvedEstimateFor: () => est } });
    const note = (j, stage) => D.DOC_ACTIONS.invoice.sentNote({ job: j, stage, kind: 'invoice' });
    eq(note(job, 'midpoint'), 'Sent before every preparation vendor is booked: 1 of 3 confirmed on the Job Plan.', '⚠⚠ the second invoice names the vendors still unbooked');
    eq(note(job, 'final'), '', 'the final says nothing');
    eq(note(job, 'deposit'), '', 'nor the deposit');
    const booked = Object.assign({}, job, { prepSourcing: { La: { status: 'Confirmed' }, Lb: { status: 'Confirmed' }, Lc: { status: 'Confirmed' } } });
    eq(note(booked, 'midpoint'), '', 'every vendor booked: nothing to say');
    eq(note(Object.assign({}, job, { svc: 'downsizing_move' }), 'midpoint'), '', 'a midpoint invoice on any other service is not a second invoice');
    ok(typeof D.DOC_ACTIONS.agreement.sentNote !== 'function' && typeof D.DOC_ACTIONS.estimate.sentNote !== 'function', 'no other document carries the hook');
    // The join: docSend reads the hook after the draft is made, into the notice, and the blocker never asks it.
    const send = noComments(fn('docSend'));
    has(send, "var _sentNote = (spec.cfg && typeof spec.cfg.sentNote === 'function') ? spec.cfg.sentNote(spec) : '';", 'docSend asks the document\'s hook');
    has(send, "if (_sentNote) msg = msg.replace(/\\s+$/, '') + ' \\u26a0 ' + _sentNote;", 'and appends it to the notice');
    ok(send.indexOf('msg = lead + msg;') < send.indexOf('var _sentNote'), 'after the notice is built');
    ok(send.indexOf('var _sentNote') < send.indexOf('docRecordSent(spec, {'), 'and before the send is recorded');
    lacks(noComments(decl('DOC_ACTIONS')).split('sentNote: function')[0].split('invoice: {')[1] || '', 'prepVendorsConfirmed', 'the invoice blocker never asks it: a flag, not a refusal');
  });

  // ═════════════════════════════════════════════════════════════════
  G('T10 · one sentence for when the midpoint invoice falls due', () => {
    const body = noComments(fn('jobTimeline'));
    has(body, "'Do the work \\u2014 the midpoint invoice is due at the halfway point, or sooner once half the work is done or every room is locked'",
        '⚠⚠ the band names all three readings the rule holds (jobSchedule: the halfway, half the work, every room locked)');
    eq(body.split('is due at the halfway point').length - 1, 1, 'once');
    const notYet = /var _midNotYet = !!\(([^;]+)\);/.exec(body);
    ok(!!notYet, 'fixture: the not-yet rule is one expression');
    has(notYet ? notYet[1] : '', '_sc.today < _sc.halfway', 'the halfway reading');
    has(notYet ? notYet[1] : '', '_sc.workPct >= 0.5 || _sc.roomsLocked', 'half the work, every room locked');
  });
};
