'use strict';
// ─────────────────────────────────────────────────────────────────
// WHO USES THIS DEVICE (2026-10-12; Anthony's answer to Q59, the core-jobs run's third question). The app has no
// sign-in, so two questions get two answers, each one rule:
//
//   WHO IS RESPONSIBLE TO THE CLIENT: the job's concierge. `docConciergeName` on every client paper and `_handoverBy`
//   on the activation and the handover. Never the person at the device. Anthony: a client whose concierge is Ashley
//   must never read Anthony's name on their job because he reviewed a line at night.
//
//   WHO DID IT, on every internal stamp: the device's user as Settings records it (`deviceUser`, one pick per phone
//   or laptop, kept through a device clear), else the job's concierge, else this job's agreement approver. `_actor`
//   for the lifecycle stamps (a document drafted or sent, a payment recorded, cleared or voided, a signature, a filed
//   copy, a re-open), `_invStampBy` for the desk and the rooms (a line reviewed, a value accepted, the as-found and
//   must-find ticks), which stops at the concierge.
//
//   A. the two rules, the chain, and the client's papers that never read the device
//   B. every stamp writer reads one of the two rules (source), and the old `job.tc` stamps are gone
//   C. driven: a payment cleared, a line reviewed, a value accepted, a must-find tick, an as-found tick
//   D. Settings: the pick, the save, the stored key kept through a clear, the amber note until it is set
//
// Each sandbox is the root's own call graph, derived from the source, with state supplied at named boundaries.
// ─────────────────────────────────────────────────────────────────

const { sandbox, source, fn, decl, domStub } = require('./harness');

const SRC = source();
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n');
const liveOnly = (t) => codeOnly(t).replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
function closure(roots, stop) {
  const stopSet = new Set(stop || []);
  const fns = new Set(), vars = new Set();
  const queue = roots.map((r) => ['f', r]);
  while (queue.length) {
    const [k, name] = queue.shift();
    if (stopSet.has(name)) continue;
    let body;
    if (k === 'f') { if (fns.has(name)) continue; fns.add(name); try { body = liveOnly(fn(name)); } catch (e) { continue; } }
    else { if (vars.has(name)) continue; vars.add(name); try { body = liveOnly(decl(name)); } catch (e) { continue; } }
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/[(,]\s*([A-Za-z_$][\w$]*)\s*[,)]/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) {
      if (stopSet.has(m[1])) continue;
      if (ALL_VARS.has(m[1])) queue.push(['v', m[1]]);
      else if (ALL_FNS.has(m[1])) queue.push(['f', m[1]]);
    }
  }
  return { fns: [...fns], vars: [...vars] };
}
function lift(roots, stop, stubs) {
  const c = closure(roots, stop);
  return sandbox({ fns: c.fns, vars: c.vars, stubs: stubs || {} });
}
const attempt = (f) => { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } };
const KEY = 'hav_device_user';
const STATE = ['jobs', 'estimateStore', 'jobLogs', 'changeOrders', 'jobPlanStore', 'mediaStore', '_photoRefs', 'contractors', 'vendorDirectory',
  'referralDirectory', 'currentEstimate', 'SHEETS_SYNC_URL', 'DRIVE_FOLDER_ID', 'VENDOR_SYNC_URL', 'GMAIL_CLIENT_ID', 'REFERRAL_SYNC_URL',
  'REQUIRE_WALKTHROUGH_NOTES', 'TC_ONSITE_ALPHA', 'COST_RATES', '_roomWs'];
const BASE = () => ({ jobs: [], estimateStore: {}, jobLogs: {}, changeOrders: [], jobPlanStore: {}, mediaStore: {}, _photoRefs: {}, contractors: [],
  vendorDirectory: [], referralDirectory: [], currentEstimate: null, SHEETS_SYNC_URL: '', DRIVE_FOLDER_ID: '', VENDOR_SYNC_URL: '', GMAIL_CLIENT_ID: '',
  REFERRAL_SYNC_URL: '', REQUIRE_WALKTHROUGH_NOTES: false, TC_ONSITE_ALPHA: 0.5, COST_RATES: {}, _roomWs: { open: false }, Intl: global.Intl,
  document: domStub({}), setTimeout: () => 0, clearTimeout: () => {}, saveJobs: () => {}, syncJobToSheets: () => {}, saveJobPlan: () => {},
  savePhotoRefs: () => {}, _scheduleInventorySync: () => {}, renderInventoryTab: () => {}, _paintRoomWorkspace: () => {}, _repaintPlan: () => {},
  dashNotice: () => {}, _dashRedraw: () => {}, renderClientDashboard: () => {}, showSyncBadge: () => {}, calcAll: () => {}, loadVendorDirectory: () => {},
  loadReferralDirectory: () => {}, setVendorDirStatus: () => {}, setReferralDirStatus: () => {}, renderJobs: () => {}, _repaintStandingFlags: () => {},
  confirm: () => true, alert: () => {} });
const STOP = STATE.concat(['saveJobs', 'syncJobToSheets', 'saveJobPlan', 'savePhotoRefs', '_scheduleInventorySync', 'renderInventoryTab', '_paintRoomWorkspace',
  '_repaintPlan', 'dashNotice', '_dashRedraw', 'renderClientDashboard', 'showSyncBadge', 'calcAll', 'loadVendorDirectory', 'loadReferralDirectory',
  'setVendorDirStatus', 'setReferralDirStatus', 'renderJobs', '_repaintStandingFlags']);

module.exports = function ({ group, ok, eq, has, lacks }) {
  const prevTZ = process.env.TZ;
  process.env.TZ = 'America/New_York';

  const JOB = (o) => Object.assign({ id: 7, hvlId: 'HVL-0007', name: 'Harold Brennan', svc: 'probate', tc: 'Ashley Jerome', agrApprovedBy: 'Anthony Graziano',
    status: 'active', won: true, payments: [], docState: {}, at: {} }, o || {});

  // ═══ A · THE TWO RULES ════════════════════════════════════════════════════
  group('A · deviceUser reads the device once; _invStampBy and _actor read it first, the concierge next, and only _actor reaches the approver');
  {
    const ctx = sandbox({ fns: ['deviceUser', '_invStampBy', '_actor', '_handoverBy'] });
    const J = JOB({ tc: 'Anthony Graziano Jr' });
    eq(ctx.deviceUser(), '', 'nothing set: blank');
    eq(ctx._invStampBy(J), 'Anthony Graziano Jr', 'unset: the desk stamps the job\'s concierge');
    eq(ctx._actor(J), 'Anthony Graziano Jr', 'and so does every lifecycle stamp, before the approver');
    eq(ctx._actor(JOB({ tc: '' })), 'Anthony Graziano', 'no concierge: the approver');
    eq(ctx._invStampBy(JOB({ tc: '' })), '', '⚠ the desk never reaches the approver: they approved a price, not a line');
    eq([ctx._actor(null), ctx._actor(undefined), ctx._invStampBy(null)], ['', '', ''], 'no job: nobody');
    ctx.localStorage.setItem(KEY, '  Ashley Jerome ');
    eq(ctx.deviceUser(), 'Ashley Jerome', 'set: the name, trimmed');
    eq(ctx._invStampBy(J), 'Ashley Jerome', '⚠⚠ the desk stamps the person at the device, not the job\'s concierge');
    eq(ctx._actor(J), 'Ashley Jerome', '⚠⚠ and so does every lifecycle stamp, whoever approved the price');
    eq(ctx._handoverBy(J), 'Anthony Graziano Jr', '⚠⚠ the activation and the handover stay the job\'s concierge: whose job it was, not who pressed');
    eq(ctx._handoverBy(JOB({ tc: '' })), 'Ashley Jerome', 'with nobody assigned they fall to who did it, as before they fell to the approver');
    ctx.localStorage.setItem(KEY, '   ');
    eq(ctx.deviceUser(), '', 'blank is not set');
    const thrown = sandbox({ fns: ['deviceUser'], stubs: { localStorage: { getItem() { throw new Error('storage blocked'); } } } });
    eq(attempt(() => thrown.deviceUser()), { ok: true, val: '' }, 'a browser refusing storage reads as not set, never a throw');
    // The rule, verbatim: one chain, read everywhere.
    has(codeOnly(fn('_actor')), "return _invStampBy(job) || (job && job.agrApprovedBy) || '';", '_actor is the desk\'s answer, then this job\'s approver');
    has(codeOnly(fn('_invStampBy')), 'return deviceUser() || tc;', '_invStampBy is the device, then the concierge');
    eq(ctx._invStampBy(JOB({ tc: '  ' })), '', 'a blank concierge is nobody (trimmed, as _handoverBy trims)');
    has(codeOnly(fn('deviceUser')), "localStorage.getItem('" + KEY + "')", 'deviceUser reads the one key');
    has(codeOnly(fn('saveSettings')), "localStorage.setItem('" + KEY + "'", 'that saveSettings writes, by the same literal');
    eq((liveOnly(SRC).match(/localStorage\.getItem\('hav_device_user'\)/g) || []).length, 0, 'fixture: the string net is live code only')
    eq((codeOnly(SRC).match(/localStorage\.getItem\('hav_device_user'\)/g) || []).length, 1, '⚠ one reader of the key in the whole app');
  }

  group('A · the client\'s papers never read the device: docConciergeName and the five client builders');
  {
    const ctx = lift(['docConciergeName', 'deviceUser'], STOP, BASE());
    ctx.localStorage.setItem(KEY, 'Anthony Graziano');
    eq(ctx.docConciergeName(JOB({ tc: 'Ashley Jerome' }), { preparedBy: 'Anthony Graziano Jr' }), 'Ashley Jerome',
       '⚠⚠ the paper names the job\'s concierge though Anthony is at the device');
    eq(ctx.docConciergeName(JOB({ tc: '' }), { preparedBy: 'Anthony Graziano Jr' }), 'Anthony Graziano Jr', 'with nobody assigned, the estimate\'s preparer, never the device');
    ['docConciergeName', 'clientEstimateHtml', 'invoiceHtml', 'agreementHtml', 'probateAgreementHtml', 'signingPacketHtml', '_handoverBy'].forEach((n) => {
      const b = liveOnly(fn(n));
      lacks(b, 'deviceUser(', n + ' never asks who is at the device');
      if (n !== '_handoverBy') { lacks(b, '_actor(', n + ' never asks _actor'); lacks(b, '_invStampBy(', n + ' never asks _invStampBy'); }
    });
    has(codeOnly(fn('_handoverBy')), 'return tc || _actor(job);', '_handoverBy: the concierge first, who did it only with nobody assigned');
  }

  // ═══ B · EVERY WRITER READS THE RULE ═══════════════════════════════════════
  group('B · every stamp writer reads _invStampBy or _actor, and no `job.tc` stamp is left');
  {
    const want = {
      _invSetReviewed: "ref.reviewedBy = on ? _invStampBy(job) : ''",
      _invBulkApply: 'ref.reviewedBy = _invStampBy(job)',
      _avStampReviewed: 'ref.valReviewedBy = _invStampBy(job)',
      setRoomFoundDone: 'by: _invStampBy(_invJob(jobId))',
      toggleMustFound: 'by: _invStampBy(job)',
      markPaymentCleared: 'p.clearedBy = _actor(job)',
      _invTombstoneLine: '_invStampBy(',
      invSetDealerRoute: 'ref.viaDealerBy = _invStampBy(job)',
      markShotLost: 'ref.lostBy = _invStampBy(_invJob(jobId))',
    };
    Object.keys(want).forEach((n) => has(codeOnly(fn(n)), want[n], n + ' stamps through the rule'));
    const live = codeOnly(SRC);
    eq((live.match(/By\s*[:=]\s*(?:on\s*\?\s*)?\(*\s*job\s*&&\s*job\.tc/g) || []).length, 0, '⚠ no stamp reads (job && job.tc) on its own any more');
    eq((live.match(/By\s*[:=]\s*job\.tc\b/g) || []).length, 0, 'nor job.tc bare');
    eq((live.match(/\(_invJob\(jobId\) \|\| \{\}\)\.tc/g) || []).length, 0, 'nor the room tick\'s old form');
    const actors = (live.match(/_actor\(/g) || []).length - 1, desk = (live.match(/_invStampBy\(/g) || []).length - 1;
    ok(actors >= 22, '_actor has its callers (' + actors + ')');
    ok(desk >= 11, '_invStampBy has its callers (' + desk + '): the five it had, the five stamps moved onto it, and _actor');
    has(codeOnly(fn('_invTombstoneLine')) + codeOnly(fn('invRemoveLine')), '_invStampBy(', 'fixture: the removal writer is among them');
  }

  // ═══ C · DRIVEN ════════════════════════════════════════════════════════════
  group('C · a payment cleared is stamped with the device\'s user; with none set, the job\'s concierge');
  {
    const run = (device) => {
      const stubs = BASE();
      const C = lift(['markPaymentCleared', 'deviceUser'], STOP, stubs);
      const j = JOB({ payments: [{ uid: 'p1', stage: 'deposit', amount: 24500, receivedOn: '2026-10-01', method: 'check', recordedBy: 'Anthony Graziano' }] });
      C.jobs = [j];
      if (device) C.localStorage.setItem(KEY, device);
      const r = attempt(() => C.markPaymentCleared(7, C._paymentKey(j.payments[0])));
      ok(r.ok, 'Mark cleared runs: ' + (r.err || ''));
      return j.payments[0];
    };
    const p = run('Ashley Jerome');
    ok(/^\d{4}-\d{2}-\d{2}$/.test(p.clearedOn || ''), 'cleared today');
    eq(p.clearedBy, 'Ashley Jerome', '⚠⚠ clearedBy is the device\'s user, not the approver who recorded it');
    eq(run('').clearedBy, 'Ashley Jerome', 'unset device: the job\'s concierge (Ashley is the concierge too)');
    const stubs = BASE();
    const C = lift(['markPaymentCleared', 'deviceUser'], STOP, stubs);
    const j = JOB({ tc: 'Anthony Graziano Jr', payments: [{ uid: 'p1', stage: 'deposit', amount: 100, receivedOn: '2026-10-01', method: 'check' }] });
    C.jobs = [j];
    C.markPaymentCleared(7, C._paymentKey(j.payments[0]));
    eq(j.payments[0].clearedBy, 'Anthony Graziano Jr', 'unset device, another concierge: theirs, never the approver\'s');
  }

  group('C · the desk: a line reviewed and a value accepted are stamped with the device\'s user');
  {
    const stubs = BASE();
    const C = lift(['_invSetReviewed', '_avStampReviewed', 'deviceUser'], STOP, stubs);
    C.jobs = [JOB()];
    C._photoRefs = { 7: [{ stableId: 'a1', label: 'inventory', objectName: 'Walnut desk', updatedAt: 1 }] };
    C.localStorage.setItem(KEY, 'Anthony Graziano');
    C._invSetReviewed(7, 'a1', true);
    eq(C._photoRefs[7][0].reviewedBy, 'Anthony Graziano', '⚠⚠ reviewed by the person at the device (Anthony, at night), not the job\'s concierge');
    ok(C._photoRefs[7][0].reviewed === true && C._photoRefs[7][0].reviewedAt > 0, 'the tick and its time');
    const r = { stableId: 'a2', fmv: 640, valuedBy: 'agent' };
    C._avStampReviewed(r, C.jobs[0]);
    eq(r.valReviewedBy, 'Anthony Graziano', 'a value accepted: the same person');
    C.localStorage.setItem(KEY, '');
    C._invSetReviewed(7, 'a1', false); C._invSetReviewed(7, 'a1', true);
    eq(C._photoRefs[7][0].reviewedBy, 'Ashley Jerome', 'unset device: the job\'s concierge, as before');
    C._invSetReviewed(7, 'a1', false);
    eq(C._photoRefs[7][0].reviewedBy, '', 'unticked: nobody');
  }

  group('C · the rooms: a must-find tick and an as-found tick are stamped with the device\'s user');
  {
    const j = JOB({ mustFind: 'The ring\nThe deeds', updatedAt: 1000 });
    const dom = domStub({ 'sf-host-plan': { attrs: { 'data-job': '7' } } });
    const stubs = Object.assign(BASE(), { document: dom, jobPlanStore: { 7: { rooms: [{ name: 'Study' }] } } });
    const C = lift(['toggleMustFound', '_mfHandle', 'setRoomFoundDone', 'deviceUser'], STOP, stubs);
    C.jobs = [j];
    C.localStorage.setItem(KEY, 'Anthony Graziano Jr');
    C.toggleMustFound(7, C._mfHandle('the ring'));
    eq((j.mustFound['the ring'] || {}).by, 'Anthony Graziano Jr', '⚠⚠ Found it: the person at the device, not the concierge');
    ok(/^\d{4}-\d{2}-\d{2}$/.test((j.mustFound['the ring'] || {}).at || ''), 'dated off the local calendar');
    C.setRoomFoundDone(7, 0, true);
    eq((C.jobPlanStore[7].rooms[0].foundDone || {}).by, 'Anthony Graziano Jr', '⚠⚠ As-found pass complete: the person who ticked it');
    C.localStorage.setItem(KEY, '');
    C.setRoomFoundDone(7, 0, false); C.setRoomFoundDone(7, 0, true);
    eq((C.jobPlanStore[7].rooms[0].foundDone || {}).by, 'Ashley Jerome', 'unset device: the job\'s concierge, as before');
    C.toggleMustFound(7, C._mfHandle('the ring')); C.toggleMustFound(7, C._mfHandle('the ring'));
    eq((j.mustFound['the ring'] || {}).by, 'Ashley Jerome', 'and the must-find the same');
  }

  // ═══ D · SETTINGS ══════════════════════════════════════════════════════════
  group('D · Settings offers the roster and the managers once each, marks the stored pick, and keeps a pick that left the roster');
  {
    const stubs = BASE();
    const C = lift(['openSettings', 'deviceUserOptionsHtml', 'deviceUser'], STOP, stubs);
    const ph = (C.LOG_PLACEHOLDER_NAMES || [])[0] || 'Transition Concierge 2';
    C.contractors = [{ name: 'anthony graziano', role: 'TC', status: 'active' }, { name: ph, role: 'TC', status: 'active' },
      { name: 'Carla Ortiz', role: 'PS', status: 'inactive' }, { name: 'Maria Lopez', role: 'PS', status: 'active' }];
    const opts = (h) => [...String(h).matchAll(/<option value="([^"]*)"( selected)?>([^<]*)<\/option>/g)].map((m) => [m[1], !!m[2], m[3]]);
    const o1 = opts(C.deviceUserOptionsHtml(''));
    eq(o1[0], ['', false, 'Not set'], 'the first choice is not set');
    eq(o1.slice(1).map((x) => x[0]), ['Anthony Graziano', 'Anthony Graziano Jr', 'Ashley Jerome', 'Maria Lopez'],
       '⚠ the active roster, concierges and specialists, and the managers, once each (a lower-case duplicate folded), sorted; no placeholder, nobody inactive');
    eq(o1.filter((x) => x[1]).length, 0, 'nothing marked with no pick');
    const o2 = opts(C.deviceUserOptionsHtml('ashley jerome'));
    eq(o2.filter((x) => x[1]).map((x) => x[0]), ['Ashley Jerome'], 'the stored pick marked, matched as a person');
    const o3 = opts(C.deviceUserOptionsHtml('Carla Ortiz'));
    eq(o3[o3.length - 1], ['Carla Ortiz', true, 'Carla Ortiz (not on the active roster)'], 'a pick that left the roster is kept as recorded, and says so');
    // openSettings paints the control from the stored key.
    C.localStorage.setItem(KEY, 'Maria Lopez');
    const r = attempt(() => C.openSettings());
    ok(r.ok, 'openSettings runs: ' + (r.err || ''));
    const sel = C.document.getElementById('set-device-user').innerHTML;
    eq(opts(sel).filter((x) => x[1]).map((x) => x[0]), ['Maria Lopez'], '⚠ the picker opens on the device\'s user');
    has(sel, '<option value="">Not set</option>', 'with not set offered');
  }

  group('D · Save Settings writes the pick, every stamp reads it at once, and the amber note goes; blank puts the note back');
  {
    const stubs = BASE();
    const C = lift(['saveSettings', 'deviceUser', '_paintDeviceUserNote', 'deviceUserNoteHtml', '_invStampBy', '_actor'], STOP, stubs);
    C.document.getElementById('set-device-user').value = ' Ashley Jerome ';
    C._paintDeviceUserNote();
    const note0 = C.document.getElementById('device-user-note').innerHTML;
    has(note0, 'not set', 'before the save the client list carries the note');
    has(note0, 'Settings', 'which says where to set it');
    has(note0, 'job&rsquo;s concierge', 'and what the record names until then');
    const r = attempt(() => C.saveSettings());
    ok(r.ok, 'saveSettings runs: ' + (r.err || ''));
    eq(C.localStorage.getItem(KEY), 'Ashley Jerome', '⚠⚠ the pick is stored on this device, trimmed');
    eq(C.deviceUser(), 'Ashley Jerome', 'and read back');
    eq(C._actor(JOB({ tc: 'Anthony Graziano Jr' })), 'Ashley Jerome', 'the next stamp names her');
    eq(C.document.getElementById('device-user-note').innerHTML, '', '⚠ the note is gone');
    eq(C.document.getElementById('settings-modal').style.display, 'none', 'fixture: the modal closed as before');
    C.document.getElementById('set-device-user').value = '';
    C.saveSettings();
    eq(C.deviceUser(), '', 'not set again');
    has(C.document.getElementById('device-user-note').innerHTML, 'not set', 'and the note is back');
    // A device whose Settings form lacks the control (an older cached page) keeps what it holds.
    const D = lift(['saveSettings', 'deviceUser'], STOP, BASE());
    D.localStorage.setItem(KEY, 'Anthony Graziano');
    const real = D.document.getElementById;
    D.document.getElementById = (id) => (id === 'set-device-user' ? null : real(id));
    D.saveSettings();
    eq(D.deviceUser(), 'Anthony Graziano', 'a control not on the form keeps the record');
  }

  group('D · the key is kept through a device clear, the controls are in the markup, and boot paints the note after Settings are read');
  {
    const ctx = sandbox({ vars: ['LOCAL_JOB_DATA_KEYS', 'LOCAL_KEEP_KEYS'] });
    ok(ctx.LOCAL_KEEP_KEYS.test(KEY), '⚠ hav_device_user survives Clear this device: it is this device\'s, like its URLs');
    ok(!ctx.LOCAL_JOB_DATA_KEYS.test(KEY), 'and is never cleared as job data');
    const a = SRC.indexOf('id="clients-list-view"'), b = SRC.indexOf('<div class="grid4"', a);
    ok(a > 0 && b > a && b - a < 2500, 'fixture: the client list\'s head is where it was');
    has(SRC.slice(a, b), 'id="device-user-note"', 'the note has its slot under the Clients heading, on the tab field mode shows');
    const s = SRC.indexOf('id="settings-modal"'), e = SRC.indexOf('clearLocalJobData()', s);
    ok(s > 0 && e > s && e - s < 20000, 'fixture: the Settings modal is where it was');
    const modal = SRC.slice(s, e);
    has(modal, 'id="set-device-user"', 'the picker is in Settings');
    has(modal, 'Who uses this device', 'under its label');
    has(modal, 'always name the job&rsquo;s concierge, whoever pressed the button', 'and Settings says the client\'s papers do not follow it');
    const boot = SRC.indexOf('\nloadSettings();\n');
    ok(boot > 0, 'fixture: the boot sequence reads Settings');
    eq((SRC.match(/\nloadSettings\(\);\n/g) || []).length, 1, 'fixture: once');
    has(SRC.slice(boot, boot + 80), '_paintDeviceUserNote();', '⚠ and paints the note right after, so a fresh device is told on its first screen');
  }

  process.env.TZ = prevTZ;
};
