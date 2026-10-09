'use strict';
// ─────────────────────────────────────────────────────────────────
// P25 GROUP 2 · THE FIELD TAPS (2026-10-09). Anthony's answers to the job-flow audit's questions, each driven through the
// real code:
//
//   Q40 On living work the as-found shot is the pass (no tick, nothing flagged once one is shot); the camera's as-found pass
//       goes on to Items in one tap; a locked room is marked cleared from its row on the room list, on every job.
//   Q41 A close-up is its own one-tap shutter: a detail of the last item, filed with it and never a new item.
//   Q42 Move day records four facts; the rest of the sequence is a procedure read under them, never ticked.
//   Q43 What the app records is derived, never ticked: the delivery of the inventory and the ledger to counsel or the
//       trustee (the package), the proceeds received (the statements), a collection's photograph, release and receipt, and
//       Home Prep's quotes and bookings. Shredding, the Certificate of Insurance, the valuables pickup and the moving
//       materials are asked only where they apply.
//   Q44 A Donate, Junk or Auction line takes the one confirmed vendor of its kind as its recipient, marked and editable;
//       two confirmed are flagged, never guessed.
//   Q45 No question about walkthrough notes on Submit: the rooms without one are named under it.
//   Q47 Two concierges only when the estimator picks two; the engine's recommendation is a suggestion.
//
// Each sandbox is the root's own call graph, derived from the source, with state supplied at named boundaries.
// ─────────────────────────────────────────────────────────────────

const { sandbox, source, fn, decl, domStub } = require('./harness');

const SRC = source();
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
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
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) {
      if (stopSet.has(m[1])) continue;
      if (ALL_VARS.has(m[1])) queue.push(['v', m[1]]);
      else if (ALL_FNS.has(m[1])) queue.push(['f', m[1]]);   // a function named without a call: `var c = roundCents;`
    }
  }
  return { fns: [...fns], vars: [...vars] };
}
function lift(roots, stop, stubs) {
  const c = closure(roots, stop);
  return sandbox({ fns: c.fns, vars: c.vars, stubs: stubs || {} });
}
// A lift whose roots include catalogues the code reads but no root names (PLAN_TASKS is read by its callers, not by these).
function liftV(roots, vars, stop, stubs) {
  const c = closure(roots, stop);
  return sandbox({ fns: c.fns, vars: c.vars.concat(vars.filter((v) => c.vars.indexOf(v) < 0)), stubs: stubs || {} });
}
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }
const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&mdash;': '—', '&middot;': '·', '&nbsp;': ' ', '&rarr;': '→',
  '&rsquo;': '’', '&ldquo;': '“', '&rdquo;': '”', '&ndash;': '–', '&#9888;': '⚠', '&#9654;': '▶', '&#10003;': '✓', '&#9993;': '✉', '&#128065;': '👁', '&#128424;': '🖨' };
const decode = (s) => String(s).replace(/&[a-z#0-9]+;/gi, (m) => (ENT[m] !== undefined ? ENT[m] : m));
const textOf = (h) => decode(String(h).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const count = (h, n) => String(h).split(n).length - 1;

const STATE = ['jobs', 'estimateStore', 'jobLogs', 'changeOrders', 'jobPlanStore', 'mediaStore', '_photoRefs', 'contractors', 'currentEstimate',
  'currentInvStage', 'SHEETS_SYNC_URL'];
const BASE = () => ({ jobs: [], estimateStore: {}, jobLogs: {}, changeOrders: [], jobPlanStore: {}, mediaStore: {}, _photoRefs: {}, contractors: [],
  currentEstimate: null, currentInvStage: 'final', SHEETS_SYNC_URL: '', vendorDirectory: [], Intl: global.Intl, document: domStub({}),
  setTimeout: () => 0, clearTimeout: () => {} });


module.exports = function ({ group, ok, eq, has, lacks }) {
  const prevTZ = process.env.TZ;
  process.env.TZ = 'America/New_York';
  const LIVING = (o) => Object.assign({ id: 7, hvlId: 'HVL-0007', name: 'Jane Doe', email: 'jane@x.com', svc: 'home_cleanout', addr: '12 Ocean Blvd', won: true, status: 'active' }, o || {});
  const PROBATE = (o) => Object.assign({ id: 7, hvlId: 'HVL-0007', name: 'Margaret Doe', svc: 'probate', matterType: 'probate', executor: 'Tripp Butler',
    executorEmail: 'tripp@x.com', executorRole: 'Personal Representative', addr: '69 Beach Blvd', deathDate: '2026-01-15', docTier: 'values',
    probateAttyName: 'R. Comiter', probateAttyEmail: 'rc@law.com', won: true, status: 'active', driveFolder: 'https://drive.google.com/drive/folders/X' }, o || {});

  // ═══ Q40 · THE AS-FOUND SHOT IS THE PASS ON LIVING WORK; NEXT: ITEMS; CLEARED ON THE ROOM'S ROW ═══
  group('Q40 · on living work the as-found shot is the pass; estates keep the tick and the refusal; Cleared on the room\'s row');
  {
    const shot = (label) => ({ stableId: 's-' + label, roomIdx: 0, label: label, status: 'uploaded', ts: 1 });
    const L = (refs, plan) => lift(['lockFlag', 'lockRefusal', '_roomFoundDoneHtml'], STATE, Object.assign(BASE(), { _photoRefs: { 7: refs }, jobPlanStore: { 7: plan || {} } }));
    const none = L([]);
    eq(none.lockFlag(LIVING(), 7, 0), 'No as-found shots on this room. Shoot it before anything moves.', 'living, nothing shot: flagged');
    const shotOnly = L([shot('before')]);
    eq(shotOnly.lockFlag(LIVING(), 7, 0), '', '⚠⚠ living, one as-found shot and no tick: nothing flagged — the shot is the pass');
    eq(shotOnly._roomFoundDoneHtml(7, 0, false), '', '⚠ and the tick is not offered on living work');
    has(shotOnly._roomFoundDoneHtml(7, 0, true), 'As-found pass complete', 'an estate keeps the tick');
    eq(shotOnly.lockRefusal(PROBATE(), 7, 0).indexOf('Confirm the as-found pass first'), 0, '⚠ and its refusal: the tick is still the concierge\'s word there');
    const ticked = L([shot('before')], { rooms: { 0: { foundDone: { at: '2026-10-09', by: 'Ashley Jerome' } } } });
    eq(ticked.lockRefusal(PROBATE(), 7, 0), '', 'an estate with the shot and the tick locks');

    // Cleared on the room's row: a locked room offers it, a pending one does not; it goes through the one setter.
    const R = lift(['_planRoomListHtml'], STATE.concat(['_planRooms']), Object.assign(BASE(), {
      _photoRefs: { 7: [] },
      jobPlanStore: { 7: { rooms: { 0: { status: 'locked' }, 1: { status: 'pending' }, 2: { status: 'cleared' } } } },
      _planRooms: () => ({ rooms: [{ idx: 0, name: 'Kitchen' }, { idx: 1, name: 'Den' }, { idx: 2, name: 'Garage' }], excluded: [] }) }));
    const list = attempt(() => R._planRoomListHtml(7)).val || '';
    eq(count(list, 'class="rl-clear"'), 1, '⚠⚠ one Mark cleared, on the one locked room');
    has(list, 'onclick="setPlanRoomStatus(7,0,\'cleared\')"', 'through the setter the workspace\'s button uses');
    has(list, '(no after photo yet)', 'and an after photo still missing is named on it');
    eq(count(list, 'class="rl-cell"'), 3, 'each room in its own cell, the card and its control together');

    // Next: Items, from the as-found camera: the camera reopens on the same room in Items.
    const calls = [];
    const N = lift(['fieldCamNextItems'], STATE.concat(['_fieldCam', 'closeFieldCamera', 'openFieldCamera']), Object.assign(BASE(), {
      _fieldCam: { open: true, mode: 'before', jobId: 7, roomIdx: 3 },
      closeFieldCamera: () => calls.push('close'), openFieldCamera: (j, r, m) => { calls.push(['open', j, r, m]); return true; } }));
    eq(N.fieldCamNextItems(), true, 'Next: Items goes on');
    eq(calls, ['close', ['open', 7, 3, 'inventory']], '⚠ closing the as-found pass and opening Items on the same room');
    N._fieldCam = { open: true, mode: 'inventory', jobId: 7, roomIdx: 3 };
    eq(N.fieldCamNextItems(), false, 'only from the as-found pass');

    // The As-Found Record (offered on living work too) says nothing of a pass nobody is asked to confirm there.
    const AF = (job) => lift(['asFoundRecord'], STATE.concat(['_planRooms']), Object.assign(BASE(), { jobs: [job], _photoRefs: { 7: [shot('before')] },
      jobPlanStore: { 7: {} }, _planRooms: () => ({ rooms: [{ idx: 0, name: 'Kitchen' }], excluded: [] }) })).asFoundRecord(7);
    const lr = AF(LIVING());
    eq([lr.attests, lr.unattested.length], [false, 0], '⚠⚠ living: no room is "not confirmed complete"');
    const er = AF(PROBATE());
    eq([er.attests, er.unattested.length], [true, 1], 'an estate: the room with no tick is named');
    has(fn('printAsFoundRecord'), "var att = !rec.attests ? ''", 'and the printed record reads it');
  }

  // ═══ Q41 · THE CLOSE-UP IS ITS OWN SHUTTER ═══
  group('Q41 · one tap for a close-up of the last item: armed the one way, filed as a detail, and nothing left armed');
  {
    const shots = [];
    const C = lift(['fieldCamShootDetail', 'fieldCamToggleDetail'], STATE.concat(['_fieldCam', 'fieldCamShoot', '_fieldCamPaint']), Object.assign(BASE(), {
      _fieldCam: { open: true, mode: 'inventory', last: null, detail: false, coll: 'c1' },
      fieldCamShoot: () => { shots.push({ detail: C._fieldCam.detail, coll: C._fieldCam.coll }); return true; }, _fieldCamPaint: () => {} }));
    eq(C.fieldCamShootDetail(), false, 'no item yet: nothing to be close to');
    eq(shots.length, 0, 'and nothing was shot');
    C._fieldCam.last = 'item-1';
    eq(C.fieldCamShootDetail(), true, '⚠⚠ one tap');
    eq(shots[0], { detail: true, coll: null }, 'the shot goes as a detail, and a collection armed for the next item is disarmed');
    C.fieldCamShoot = () => false;
    C._fieldCam.detail = false;
    eq(C.fieldCamShootDetail(), false, 'a shot that does not go');
    eq(C._fieldCam.detail, false, '⚠ leaves nothing armed for the next press of the main shutter');
    C._fieldCam.mode = 'before';
    eq(C.fieldCamShootDetail(), false, 'and there is no close-up on the as-found pass');
    // The strip: the Close-up shutter sits beside the main one on Items; the toggle is gone; Next: Items on the as-found pass.
    const paint = fn('_fieldCamPaint');
    has(paint, 'onclick="fieldCamShootDetail()"', 'the in-page Close-up shutter');
    has(paint, 'onchange="fieldCamNativeShot(this, true)"', 'and the native one, for a phone with no in-page camera');
    lacks(codeOnly(paint), 'fieldCamToggleDetail', '⚠ the two-tap toggle is gone from the strip');
    has(paint, 'onclick="fieldCamNextItems()"', 'Next: Items on the as-found pass');
  }

  // ═══ Q42 · MOVE DAY: FOUR FACTS, THE REST A PROCEDURE ═══
  group('Q42 · move day records four facts; the procedure is read, never ticked, and never counted');
  {
    const P = liftV(['planTasksFor', 'planTaskCtx', 'planProcedureHtml', 'planStageMeta'], ['PLAN_TASKS'], STATE.concat(['_planTaskDone', 'planDerivedLines']),
      Object.assign(BASE(), { _planTaskDone: () => false, planDerivedLines: () => [] }));
    const mm = P.planTaskCtx({ id: 7, svc: 'downsizing_move' }, { svc: 'downsizing_move' });
    eq(P.planTasksFor(P.PLAN_TASKS, 'p3', mm).map((t) => t.key), ['mv_eta', 'mv_client_walk', 'mv_damage', 'mv_mover_signoff'], '⚠⚠ four boxes, the four facts');
    eq(P.planTasksFor(P.PLAN_TASKS, 'p3', mm).map((t) => t.label),
      ['Movers arrived', 'Client walked the new home and approved it', 'Damage photographed and reported the same day, or none', 'Moving company’s final sign-off'], 'in Anthony\'s words');
    const proc = P.planProcedureHtml('p3', mm);
    eq(count(proc, '<li>'), 5, 'the procedure, five lines');
    lacks(proc, 'type="checkbox"', '⚠ and no box in it');
    has(textOf(proc), 'be on site before they arrive', 'the presence rules are there, to read');
    has(textOf(proc), 'Close-out records the house empty', 'the walk Close-out already records is named, not ticked twice');
    eq(P.planStageMeta(7, { id: 7, svc: 'downsizing_move' }, { svc: 'downsizing_move' }, 'p3', mm), '0 of 4 ticked', 'the stage counts the four facts only');
    eq(P.planProcedureHtml('p3', P.planTaskCtx({ id: 7, svc: 'home_cleanout' }, { svc: 'home_cleanout' })), '', 'no move day, no procedure');
    // The Job Plan draws it under the stage's boxes (browser step 73 drives the rendered stage: four boxes, five lines).
    has(codeOnly(fn('renderJobPlan')).replace(/''/g, "'p3'"), "planTasksHtml(jobId, 'p3', ctx) + planProcedureHtml('p3', ctx)", 'the move-day stage draws the procedure under its boxes');
  }

  // ═══ Q43 · DERIVED, NOT TICKED; ASKED ONLY WHERE IT APPLIES ═══
  group('Q43 · shredding, the COI, the valuables pickup and the materials are asked only where they apply');
  {
    const A = liftV(['planTaskApplies', 'planTasksFor', 'planTaskCtx'], ['PLAN_TASKS'], STATE, BASE());
    const keys = (job, est, phase) => A.planTasksFor(A.PLAN_TASKS, phase, A.planTaskCtx(job, est)).map((t) => t.key);
    const est = (o) => Object.assign({ svc: 'home_cleanout', vendors: [], pkgCost: 0 }, o || {});
    lacks(keys(LIVING(), est(), 'p2').join(' '), 'shred_done', 'no shredding vendor: no shredding box');
    has(keys(LIVING(), est({ vendors: [{ type: 'Document Shredding' }] }), 'p2').join(' '), 'shred_done', 'a shredding vendor on the estimate: asked');
    lacks(keys(LIVING(), est(), 'p0').join(' '), 'coi_provided', '⚠ a living house with no building or association: no COI box');
    has(keys(LIVING({ ptype: 'Town Home' }), est(), 'p0').join(' '), 'coi_provided', 'a town home (an association): asked');
    has(keys(LIVING({ houseFlags: { access: { on: true, note: 'HOA requires a COI before move-out' } } }), est(), 'p0').join(' '), 'coi_provided',
      'an association named on the intake\'s access row: asked');
    has(keys(PROBATE(), est({ svc: 'probate' }), 'p0').join(' '), 'coi_provided', 'an estate (the attorney, the representative): asked');
    lacks(keys(LIVING(), est(), 'p0').join(' '), 'materials_onsite', 'no materials package priced: no materials box');
    has(keys(LIVING(), est({ pkgCost: 450 }), 'p0').join(' '), 'materials_onsite', 'a package priced: asked (and the walkaway reads its tick)');
    lacks(keys(LIVING(), est(), 'p2').join(' '), 'coc_pickup_present', 'a living cleanout with no valuables and no seller: no valuables pickup');
    has(keys(LIVING({ houseFlags: { valuables: { on: true } } }), est(), 'p2').join(' '), 'coc_pickup_present', 'valuables flagged at intake: asked');
    has(keys(LIVING(), est({ vendors: [{ type: 'Auction House' }] }), 'p2').join(' '), 'coc_pickup_present', 'an auction house on the estimate: asked');
    has(keys(PROBATE(), est({ svc: 'probate' }), 'p2').join(' '), 'coc_pickup_present', 'every estate: asked');
  }

  group('Q43 · the delivery to counsel or the trustee is read off the package; proceeds off the statements');
  {
    const D = (job) => lift(['estateDeliveryLine'], STATE, Object.assign(BASE(), { jobs: [job], SHEETS_SYNC_URL: 'https://x' })).estateDeliveryLine(job);
    eq(D(LIVING()), null, 'no package route, no line');
    const notSent = D(PROBATE());
    eq([notSent.ok, notSent.label], [false, 'Court Inventory and Disposition Ledger delivered to counsel'], '⚠⚠ a probate estate at values: the instrument and the ledger, to counsel');
    has(notSent.detail, 'Send probate package', 'and how to send it');
    const sent = D(PROBATE({ docState: { probatePackage: { sentAt: '2026-10-08T15:00:00Z', pkg: { docs: ['court', 'schedule', 'ledger', 'worklist'], to: 'rc@law.com' } } } }));
    eq(sent.ok, true, 'a package confirmed sent that carried both: green');
    has(sent.detail, 'rc@law.com', 'naming whom it went to');
    const short = D(PROBATE({ docState: { probatePackage: { sentAt: '2026-10-08T15:00:00Z', pkg: { docs: ['schedule', 'worklist'] } } } }));
    eq(short.ok, false, '⚠ a package that carried neither is not a delivery');
    has(short.detail, 'did not carry the Court Inventory and Disposition Ledger', 'and it says what it left out');
    const drafted = D(PROBATE({ docState: { probatePackage: { draftedAt: '2026-10-08T15:00:00Z', pkg: { docs: ['court', 'ledger'] } } } }));
    eq(drafted.ok, false, 'a draft nobody confirmed sent is not a delivery');
    eq(D(PROBATE({ docTier: 'none' })).label, 'Disposition Ledger delivered to counsel', 'at None: only the ledger is Havellin\'s to deliver');
    eq(D(PROBATE({ svc: 'cleanout', matterType: 'trust', trusteeAttyEmail: '' })).label, 'Trust Schedule and Disposition Ledger delivered to the trustee', 'a trust: to the trustee');

    const PR = lift(['proceedsReceivedLine'], STATE, BASE());
    const lines = [{ stableId: 'a', disposition: 'Auction', gross: 100, fees: 20 }, { stableId: 'b', disposition: 'Keep' }];
    eq(PR.proceedsReceivedLine(LIVING(), [{ stableId: 'b', disposition: 'Keep' }]), null, 'nothing sold: no line');
    const open = PR.proceedsReceivedLine(LIVING(), lines);
    eq([open.ok, open.detail.indexOf('1 sold line on no statement yet')], [false, 0], 'a sold line on no statement: open');
    const st = (paidOn) => ({ id: 's1', vendor: 'Christie\'s', lines: [{ stableId: 'a' }], gross: 100, fees: 20, netPaid: 80, paidOn: paidOn });
    const unpaid = PR.proceedsReceivedLine(LIVING({ proceedsStatements: [st('')] }), lines);
    eq([unpaid.ok, unpaid.detail.indexOf('1 statement with no payment recorded')], [false, 0], '⚠ on a statement with no payment recorded: still open');
    eq(PR.proceedsReceivedLine(LIVING({ proceedsStatements: [st('2026-10-07')] }), lines).ok, true, 'paid: green');
    lacks(decl('JOB_ADMIN_TASKS'), "key:'fin_settlement'", 'the box it replaces is gone');
    ['ct_served', 'ct_filed', 'ct_accounting', 'tt_delivered', 'tt_records'].forEach((k) => lacks(decl('JOB_ADMIN_TASKS'), "key:'" + k + "'", k + ' is not a box'));
  }

  group('Q43 · a collection\'s photograph, release and receipt, and Home Prep\'s quotes and bookings, are read off their records');
  {
    const line = (o) => Object.assign({ stableId: '7_col_c1', label: 'inventory', sourceCollId: 'c1', objectName: 'Coin collection', disposition: 'Auction' }, o || {});
    const CP = (refs, job) => lift(['collectionPartnerLines'], STATE, Object.assign(BASE(), { _photoRefs: { 7: refs }, jobs: [job] }))
      .collectionPartnerLines(7, job, { id: 'c1', name: 'Coin collection' });
    let L = CP([line()], LIVING());
    eq(L.map((l) => l.ok), [false, false, false], 'nothing done: three open lines');
    eq(L.map((l) => l.key), ['coll_photo', 'coll_approved', 'coll_released'], 'the three facts');
    L = CP([line({ filename: 'x.jpg', authBy: 'Jane Doe', approvalDate: '2026-10-08', dispDate: '2026-10-09' })], LIVING());
    eq(L.map((l) => l.ok), [true, true, true], '⚠⚠ photographed, approved in writing and released on the record: all three green, no tick');
    L = CP([line({ filename: 'x.jpg', disposition: 'Keep' })], LIVING());
    eq([L[1].ok, L[1].detail], [false, 'no line of it is set to leave yet'], 'a collection staying is never "approved"');
    has(fn('renderVendorSourcing'), 'collectionPartnerLines(jobId, job, c)', 'the Collection Partners card draws them');
    lacks(codeOnly(fn('renderVendorSourcing')), "'coll_' + c.id + '_2'", 'and the three boxes are gone');
    const prep = codeOnly(fn('renderPrepJobPlan'));
    lacks(prep, "planChk(jobId, 'prep_quotes'", 'Home Prep\'s quotes box is gone');
    lacks(prep, "planChk(jobId, 'prep_booked'", 'and its bookings box');
    has(fn('renderPrepJobPlan'), "label: 'Every prep vendor booked (Confirmed)'", 'both are derived lines, off the sourcing records');
  }

  // ═══ Q44 · THE ONE CONFIRMED VENDOR OF A LINE'S KIND IS ITS RECIPIENT ═══
  group('Q44 · a Donate, Junk or Auction line takes the one confirmed vendor of its kind, marked; two are flagged, never guessed');
  {
    const EST = (vendors) => ({ svc: 'home_cleanout', vendors: vendors });
    const JOB = (vs, ls) => LIVING({ vendorSourcing: vs || {}, logisticsSourcing: ls || {} });
    const V = lift(['invPlanChannel', 'invFillPlanChannel'], STATE, BASE());
    const one = JOB({ La: { status: 'Confirmed', vendorName: 'Goodwill Palm Beach' } });
    const est1 = EST([{ lid: 'a', type: 'Donation Pickup', cost: 0 }]);
    eq(V.invPlanChannel(one, est1, 'Donate'), { name: 'Goodwill Palm Beach' }, 'one confirmed donation organization');
    eq(V.invPlanChannel(JOB({ La: { status: 'Quote requested', vendorName: 'Goodwill Palm Beach' } }), est1, 'Donate'), null, 'unconfirmed: nothing');
    eq(V.invPlanChannel(one, est1, 'Auction'), null, 'another kind: nothing');
    const two = JOB({ La: { status: 'Confirmed', vendorName: 'Goodwill Palm Beach' } }, { donation: { status: 'Confirmed', vendorName: 'Habitat ReStore' } });
    eq(V.invPlanChannel(two, est1, 'Donate'), { many: ['Goodwill Palm Beach', 'Habitat ReStore'] }, '⚠ two confirmed (an estimate line and an end-of-job line): both, to be named');
    eq(V.invPlanChannel(JOB({}, { junk: { status: 'Confirmed', vendorName: 'Haul-It' } }), EST([]), 'Junk'), { name: 'Haul-It' }, 'a hauler confirmed on the end-of-job list');
    const blank = { stableId: 'l1', disposition: 'Donate', channel: '' };
    eq(V.invFillPlanChannel(one, est1, blank), true, '⚠⚠ a Donate line with nobody named takes it');
    eq([blank.channel, blank.channelFrom], ['Goodwill Palm Beach', 'plan'], 'marked as from the Job Plan');
    const named = { stableId: 'l2', disposition: 'Donate', channel: 'St. Vincent' };
    eq(V.invFillPlanChannel(one, est1, named), false, 'a recipient already named is never overwritten');
    eq(V.invFillPlanChannel(two, est1, { stableId: 'l3', disposition: 'Donate', channel: '' }), false, 'two confirmed: nothing is guessed');
    eq(V.invFillPlanChannel(one, est1, { stableId: 'l4', disposition: 'Donate', channel: '', deletedAt: 5 }), false, 'a removed line is left alone');

    // Through the desk's own writer: the disposition set fills it; a recipient typed takes the mark off.
    const ref = { stableId: 'l9', label: 'inventory', disposition: '', channel: '', updatedAt: 1 };
    const E = lift(['_invEdit'], STATE.concat(['savePhotoRefs', '_invRefreshSummary', '_invRefreshGuardrail', '_invRefreshFlagStrip', '_invRefreshRecords',
      'showSyncBadge', '_renderInvRow', '_invRowDomId']), Object.assign(BASE(), {
      jobs: [one], estimateStore: { 7: { estimate: est1 } }, _photoRefs: { 7: [ref] }, savePhotoRefs() {}, _invRefreshSummary() {}, _invRefreshGuardrail() {},
      _invRefreshFlagStrip() {}, _invRefreshRecords() {}, showSyncBadge() {}, _renderInvRow: () => '', _invRowDomId: (s) => 'row-' + s }));
    attempt(() => E._invEdit(7, 'l9', 'disposition', { value: 'Donate', type: 'select-one' }));
    const after = E._photoRefs[7][0];
    eq([after.disposition, after.channel, after.channelFrom], ['Donate', 'Goodwill Palm Beach', 'plan'], '⚠⚠ set Donate at the desk: the confirmed charity is its recipient');
    ok(after.updatedAt > 1, 'as the person\'s edit, stamped');
    attempt(() => E._invEdit(7, 'l9', 'channel', { value: 'Habitat ReStore', type: 'text' }));
    eq([E._photoRefs[7][0].channel, E._photoRefs[7][0].channelFrom], ['Habitat ReStore', undefined], 'a recipient typed is the desk\'s: the mark comes off');
    has(fn('savePhotoRefs'), 'channelFrom:r.channelFrom', '⚠ and the mark is on the manifest\'s save list (a key not on it is dropped)');
    ['setJobVendorStatus', 'setLogisticsStatus', 'setJobVendor', 'setLogisticsVendor'].forEach((f) => has(fn(f), 'invFillPlanChannels(jobId)', f + ' names the vendor on its lines'));
  }

  // ═══ Q45 · NO NOTES QUESTION ON SUBMIT ═══
  group('Q45 · Submit asks nothing about walkthrough notes; the rooms without one are named under it');
  {
    lacks(codeOnly(fn('submitForApproval')), 'confirm(', '⚠⚠ no question on Submit');
    const T = lift(['jobTimeline'], STATE, Object.assign(BASE(), { _todayStr: () => '2026-10-09' }));
    const est = { jobId: 7, svc: 'home_cleanout', havellinTotal: 9000, totTC: 30, totPS: 40, vendors: [], prepItems: [],
      rooms: [{ idx: 0, name: 'Kitchen', st: 'in', vol: 3, cplx: 3, note: 'two pantries' }, { idx: 1, name: 'Den', st: 'in', vol: 3, cplx: 3 }, { idx: 2, name: 'Garage', st: 'in', vol: 3, cplx: 3 }] };
    const rec = { estimate: est, savedAt: 1 };
    T.estimateStore = { 7: rec };
    const job = LIVING({ status: 'new', won: false, created: 'Oct 1, 2026', walkthrough: '2026-10-02' });
    const row = (attempt(() => T.jobTimeline(job, rec, [], [])).val || []).filter((r) => r.key === 'estimate_approved')[0] || {};
    eq(row.sub, 'No walkthrough note: Den, Garage', '⚠⚠ the rooms without a note are named under Submit');
    rec.estimate.rooms.forEach((r) => { r.note = 'noted'; });
    const row2 = (attempt(() => T.jobTimeline(job, rec, [], [])).val || []).filter((r) => r.key === 'estimate_approved')[0] || {};
    eq(row2.sub, '', 'every room noted: nothing said');
  }

  // ═══ Q47 · TWO CONCIERGES ONLY WHEN PICKED ═══
  group('Q47 · the engine suggests a second concierge; the count is the estimator\'s');
  {
    const calc = codeOnly(fn('calcAll'));
    lacks(calc, 'tc2Sel.value =', '⚠⚠ calcAll never sets the concierge count');
    has(fn('calcAll'), 'A second concierge suggested', 'it suggests, in the hint');
    lacks(fn('calcAll'), '1 concierge assigned, 2 recommended', 'never the red "assigned" fault it read');
    has(fn('resetEstimateJobState'), "if (tcc) tcc.value = '1';", 'a new estimate opens on one concierge');
  }

  process.env.TZ = prevTZ;
};
