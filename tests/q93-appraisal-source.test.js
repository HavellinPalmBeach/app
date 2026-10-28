'use strict';
// Q93 · THE APPRAISER IS THE SOURCE FROM THE MOMENT OF LINKING, ON EVERY JOB (2026-10-24).
//
// The defect (CLAUDE.md, Known, not fixed): a line is appraised once source Appraisal carries a value (invAppraised), the
// Valuation Source column is an estate's alone, and a figure typed was the appraisal's only where it replaced Agent Two's on a
// line with an appraiser linked, so a living line linked to an appraiser whose figure was typed by hand stayed "Appraisal in
// progress" until Waive. Anthony was asked "On a living job, how should the app know an appraiser's figure has come back?"
// (Typed figure counts / Show the source box / An 'Appraisal received' button) and answered, verbatim: *"i mean, if we send an
// item to an appraiser, listed in the vendor directory, shouldn't that person be on the record for all jobs, living & dead, as
// the source of that value? when their appraisal comes back, they are already listed as the source and we just input the
// values and save the formal apraisal to the drive?"*
//
// So, on a living Home Transition and a probate estate alike, through the real handlers:
//   · the link puts the appraiser on the record as the source: the line and its record read "Appraisal · <appraiser> · pending";
//     a figure already on the line keeps its own source (Q36's protection: the link writes nothing);
//   · a figure typed after the link is the appraisal's (one rule, _avTakeValue): source Appraisal, valuedBy appraiser, the
//     agent's fields gone, the valuation date the job's rule sets; the line leaves the guardrail and the Values bar's count;
//   · File the report on the appraiser's row (fileSignedCopy, kind appraisal_report, ref the appraiser's id, stableIds the lines
//     linked) into Estate Inventory, listed with a Void, more than one allowed, a line owed one named ("report not filed");
//   · the estate package links each report; the schedules, the Estate Inventory Report and the worklist name the appraiser.

const { sandbox, source, fn, decl, domStub } = require('./harness');

const SRC = source();
const code = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n');
const bare = (t) => code(t).replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
// The functions and vars `roots` reach, `stop` naming what the test supplies (desk-layout.test.js's walk).
function closure(roots, stop) {
  const stopSet = new Set(stop || []);
  const fns = new Set(), vars = new Set();
  const queue = roots.map((r) => ['f', r]);
  while (queue.length) {
    const [k, name] = queue.shift();
    if (stopSet.has(name)) continue;
    let body;
    if (k === 'f') { if (fns.has(name)) continue; fns.add(name); try { body = bare(fn(name)); } catch (e) { continue; } }
    else { if (vars.has(name)) continue; vars.add(name); try { body = bare(decl(name)); } catch (e) { continue; } }
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/[(,]\s*([A-Za-z_$][\w$]*)\s*[,)]/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) if (ALL_VARS.has(m[1]) && !stopSet.has(m[1])) queue.push(['v', m[1]]);
  }
  return { fns: [...fns], vars: [...vars] };
}
// Every function whose live body calls `name` (comments and strings off).
function callersOf(name) {
  const out = new Set();
  const re = new RegExp('\\b' + name + '\\(', 'g');
  let m;
  while ((m = re.exec(SRC))) {
    const def = SRC.lastIndexOf('\nfunction ', m.index);
    if (def < 0) continue;
    const f = /^\nfunction\s+([A-Za-z0-9_$]+)\s*\(/.exec(SRC.slice(def, def + 120));
    if (!f || f[1] === name) continue;
    let body = '';
    try { body = bare(fn(f[1])); } catch (e) { continue; }
    if (new RegExp('\\b' + name + '\\(').test(body)) out.add(f[1]);
  }
  return [...out].sort();
}
// The top-level functions whose live body (comments off) matches `re`.
function fnsWhere(re) {
  const out = new Set(), g = new RegExp(re.source, 'g');
  let m;
  while ((m = g.exec(SRC))) {
    const def = SRC.lastIndexOf('\nfunction ', m.index);
    if (def < 0) continue;
    const f = /^\nfunction\s+([A-Za-z0-9_$]+)\s*\(/.exec(SRC.slice(def, def + 120));
    if (!f) continue;
    let b = '';
    try { b = code(fn(f[1])); } catch (e) { continue; }
    if (re.test(b)) out.add(f[1]);
  }
  return [...out].sort();
}
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }
const textOf = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/&middot;/g, '·').replace(/&rsquo;/g, '’').replace(/&mdash;/g, '—')
  .replace(/&amp;/g, '&').replace(/\s+/g, ' ');

// ─── The fixtures ─────────────────────────────────────────────────────────────
const AP = { id: 501, name: 'Marie Wayland', firm: 'Wayland Fine Art', credential: 'ASA', independent: true };
const AP2 = { id: 502, name: 'Tom Beck', firm: '', credential: '', independent: true };
const LABEL = 'Marie Wayland · Wayland Fine Art (ASA)';
const LIVING = (o) => Object.assign({ id: 7, hvlId: 'HVL-2610-LIVE', svc: 'downsizing_move', name: 'Hale', status: 'active', won: true,
  tc: 'Ashley Jerome', docState: {}, at: {}, appraisers: [Object.assign({}, AP), Object.assign({}, AP2)],
  driveFolder: 'https://drive.google.com/drive/folders/ROOT7' }, o || {});
const ESTATE = (o) => Object.assign({ id: 7, hvlId: 'HVL-2610-EST', svc: 'probate', matterType: 'probate', name: 'Estate of Ashworth',
  deathDate: '2026-06-14', gate706: 'yes', docTier: 'values', status: 'active', won: true, executor: 'Ruth Adler', executorEmail: 'ruth@x.com',
  probateAttyEmail: 'counsel@law.com', tc: 'Ashley Jerome', docState: {}, at: {}, appraisers: [Object.assign({}, AP), Object.assign({}, AP2)],
  driveFolder: 'https://drive.google.com/drive/folders/ROOT7' }, o || {});
// A painting going to an appraiser: on a living job ticked ⚑ (the flag there is the tick), on an estate by its category.
const LINE = (o) => Object.assign({ stableId: 's1', label: 'inventory', itemNo: 12, objectName: 'Oil on canvas, harbour scene', category: 'Art & Décor',
  disposition: 'Keep', roomIdx: 0, ts: 1, updatedAt: 1, fmv: '' }, o || {});
const EST = { 7: { estimate: { svc: 'probate', rooms: [{ idx: 0, name: 'Study' }] } } };

const STOP = ['jobs', '_photoRefs', 'estimateStore', 'jobPlanStore', 'vendorDirectory', 'document', 'SHEETS_SYNC_URL', '_invCloudSeen', '_invCloudFailed',
  'savePhotoRefs', '_scheduleInventorySync', 'renderInventoryTab', 'showSyncBadge', '_invRefreshSummary', '_invRefreshFlagStrip', '_invRefreshRecords',
  '_invRefreshReleases', '_invRefreshAgentNotices', '_deskFoldHeadsRepaint', '_todayStr', 'saveJobs', 'syncJobToSheets', '_invThumbHTML',
  'FileReader', 'resolveSubfolderId', 'uploadToDrive', 'setTimeout', 'clearTimeout', '_printDocument', '_invPrintThumb', '_signedCopyRepaint', 'alert'];
const ROOTS = ['_invEdit', '_invBulkApply', '_invSetAppraiser', 'removeAppraiser', '_avTakeValue', 'agentValueUseSale', 'invAppraised',
  'invAppraisalSourceText', 'invLineAppraiser', '_invLinkedAppraiser', '_invHasAppraisal', '_renderInvRow', '_renderInvPanel',
  '_renderAppraisalGuardrail', '_renderAppraiserRoster', '_invGuardrailItems', 'deskFoldState', 'fileSignedCopy', 'fileSignedCopyFromInput',
  'voidSignedRecord', 'probatePackageReports', 'probatePackageMovedSince', 'invValBasisWord', '_invScheduleSection', 'printEstateInventoryReport',
  'printAppraisalWorklist', 'invAppraisalReportOwed', 'apprReportOwedLines', '_apprReportsRepaint', '_invRefreshGuardrail', 'signedRecordsOf',
  'signedRecordLinksHtml', 'photoSubfolder', 'invAwaitingAppraisal', '_renderInvWorkbar'];
let _cl = null;
function desk(job, rows, o) {
  o = o || {};
  _cl = _cl || closure(ROOTS, STOP);
  const log = { renders: 0, resolves: [], uploads: [], badges: [], heads: 0 };
  const dom = domStub({});
  const C = sandbox({ fns: _cl.fns, vars: _cl.vars, stubs: {
    jobs: [job], _photoRefs: { 7: rows }, estimateStore: EST, jobPlanStore: {}, vendorDirectory: [], document: dom,
    SHEETS_SYNC_URL: 'https://script.google.com/macros/s/Q93/exec', _invCloudSeen: { 7: true }, _invCloudFailed: {},
    savePhotoRefs() {}, _scheduleInventorySync() {}, renderInventoryTab() { log.renders++; }, showSyncBadge(m) { log.badges.push(m); },
    _invRefreshSummary() {}, _invRefreshFlagStrip() {}, _invRefreshRecords() {}, _invRefreshReleases() {}, _invRefreshAgentNotices() {},
    _deskFoldHeadsRepaint() { log.heads++; }, _todayStr: () => '2026-10-24', saveJobs() {}, syncJobToSheets() {}, _invThumbHTML: () => '<i></i>',
    _invPrintThumb: () => '', _printDocument() {}, _signedCopyRepaint() { log.renders++; }, alert() {},
    setTimeout: () => 1, clearTimeout: () => {},
    resolveSubfolderId(j, name, cb) { log.resolves.push(name); cb('SUB-' + name); },
    uploadToDrive(folderId, filename, dataUrl, cb) { log.uploads.push({ folderId, filename }); cb(true, 'https://drive.google.com/file/d/R' + log.uploads.length + '/view', 'R' + log.uploads.length); },
    FileReader: function () { const self = this; self.readAsDataURL = function (f) { self.result = 'data:' + f.type + ';base64,QUJD'; if (self.onload) self.onload(); }; },
  } });
  C.log = log; C.dom = dom;
  return C;
}
const ref = (C) => C._photoRefs[7].filter((r) => r.stableId === 's1')[0];
// Type a figure on the row's box, as the person does: the real _invEdit with the control's value.
const typeFigure = (C, v, sid) => attempt(() => C._invEdit(7, sid || 's1', 'fmv', { value: v, type: 'text' }));
const PDF = { name: 'Wayland report.pdf', type: 'application/pdf', size: 250000 };

module.exports = function ({ group, ok, eq, has, lacks }) {
  const JOBS = [['a living Home Transition', LIVING, { needsAppr: true }], ['a probate estate', ESTATE, {}]];

  // ═══ 1 · THE LINK PUTS THE APPRAISER ON THE RECORD AS THE SOURCE ═══
  group('1 · linking an appraiser makes them the source at once, on a living job and an estate: "Appraisal · <appraiser> · pending"');
  JOBS.forEach(([what, J, extra]) => {
    const C = desk(J(), [LINE(extra)]);
    attempt(() => C._invSetAppraiser(7, 's1', '501'));
    const r = ref(C);
    eq([String(r.apprId), r.apprDoc], ['501', LABEL], what + ': the link records the appraiser and their label');
    eq([r.valSource || '', r.valuedBy || ''], ['', ''], what + ': ⚠ the link itself writes no source and no owner (Q36): pending is read off the link');
    eq(attempt(() => C.invAppraised(r)).val, false, what + ': not appraised yet');
    eq(attempt(() => C.invAppraisalSourceText(r, 7)).val, 'Appraisal · ' + LABEL + ' · pending', what + ': the line reads "Appraisal · <appraiser> · pending"');
    const row = attempt(() => C._renderInvRow(C.jobs[0], r));
    has(row.val || row.err, '&#9873; Appraisal · ' + LABEL + ' · pending', what + ': ⚠⚠ the row says so (a living line too, which has no source box)');
    const panel = attempt(() => C._renderInvPanel(C.jobs[0], r));
    has(textOf(panel.val || panel.err), 'Valuation source Appraisal · ' + LABEL + ' · pending', what + ': and so does its record');
    has(textOf(panel.val || ''), 'when the report comes back, type its figure on the line', what + ': with what to do when it lands');
  });
  {
    // A living line NOT ticked ⚑ is still in progress once linked (the flag there is the tick; the source is the link).
    const C = desk(LIVING(), [LINE()]);
    attempt(() => C._invSetAppraiser(7, 's1', '501'));
    eq(attempt(() => C.invAwaitingAppraisal(ref(C), 7)).val, false, 'fixture: a living line not ticked ⚑ is not awaiting an appraisal');
    has(attempt(() => C._renderInvRow(C.jobs[0], ref(C))).val || '', 'Appraisal · ' + LABEL + ' · pending', '…and still reads pending once linked: the link is the source');
  }

  // ═══ 2 · THE FIGURE TYPED IS THE APPRAISAL'S ═══
  group('2 · when the report comes back the person types the figure, and it is the appraisal\'s on every job (the real _invEdit)');
  JOBS.forEach(([what, J, extra]) => {
    const C = desk(J(), [LINE(extra)]);
    attempt(() => C._invSetAppraiser(7, 's1', '501'));
    eq(attempt(() => C._invGuardrailItems(7).length).val, 1, what + ': fixture: the linked line waits on the guardrail');
    const before = attempt(() => C.deskFoldState(7, C.jobs[0], 'values', C._photoRefs[7], '2026-10-24')).val || { bits: [] };
    has(before.bits.map((b) => b.text).join(' | '), '1 needs an appraisal, each linked', what + ': fixture: and on the Values bar\'s line');
    const t = typeFigure(C, '$18,500');
    ok(t.ok, what + ': the figure is typed (' + (t.err || 'ok') + ')');
    const r = ref(C);
    eq([r.fmv, r.valSource, r.valuedBy], [18500, 'Appraisal', 'appraiser'], what + ': ⚠⚠ source Appraisal, valued by the appraiser');
    eq(attempt(() => C.invAppraised(r)).val, true, what + ': appraised (invAppraised, the one answer)');
    eq(r.valDate, J === ESTATE ? '2026-06-14' : '2026-10-24', what + ': the valuation date the job\'s rule sets (the estate\'s value date; else the day it is recorded)');
    eq(attempt(() => C._invGuardrailItems(7).length).val, 0, what + ': ⚠⚠ it leaves the guardrail, no Waive needed');
    const after = attempt(() => C.deskFoldState(7, C.jobs[0], 'values', C._photoRefs[7], '2026-10-24')).val || { bits: [] };
    has(after.bits.map((b) => b.text).join(' | '), '✓ nothing needs an appraisal', what + ': and the Values bar\'s count with it');
    eq(attempt(() => C.invAppraisalSourceText(r, 7)).val, 'Appraisal · ' + LABEL, what + ': the line now reads "Appraisal · <appraiser>"');
    // The row the figure landed on is redrawn in place, carrying the appraisal it records.
    has(String(C.dom.getElementById('inv-row-s1').outerHTML || ''), 'Appraisal · ' + LABEL, what + ': ⚠ the row is redrawn as the figure lands (no longer "pending")');
    lacks(String(C.dom.getElementById('inv-row-s1').outerHTML || ''), '· pending', what + ': …with no pending left on it');
  });
  {
    // A person's own valuation date stays (an estate's box shows it); an agent's is replaced by the job's rule.
    const C = desk(ESTATE(), [LINE({ apprId: 501, apprDoc: LABEL, valDate: '2026-07-01' })]);
    typeFigure(C, '9000');
    eq(ref(C).valDate, '2026-07-01', 'a valuation date a person typed stays with the appraisal');
    // An unknown appraiser id (the roster no longer holds it) is no link: the figure is the desk's.
    const D = desk(LIVING(), [LINE({ apprId: 999, apprDoc: '' })]);
    typeFigure(D, '700');
    eq([ref(D).valSource, ref(D).valuedBy], [undefined, 'desk'], 'a dangling appraiser id is no link: the figure typed is the desk\'s');
    // The estate's Valuation Source set to Appraisal over a figure takes the line too, and the guardrail is repainted for it.
    const E = desk(ESTATE(), [LINE({ fmv: 5200, valSource: 'Dealer quote', valuedBy: 'desk' })]);
    const g = E.dom.getElementById('inv-guardrail'); g.innerHTML = 'STALE';
    attempt(() => E._invEdit(7, 's1', 'valSource', { value: 'Appraisal', type: 'select-one' }));
    eq([ref(E).valSource, ref(E).valuedBy], ['Appraisal', 'appraiser'], 'a source set to Appraisal over a figure is the appraisal (as before)');
    ok(g.innerHTML !== 'STALE', '⚠ and the guardrail is repainted for it (it was not, on a source edit)');
  }

  // ═══ 3 · Q36'S PROTECTION: A FIGURE FROM BEFORE THE LINK IS NEVER THE APPRAISAL'S ═══
  group('3 · a figure already on the line before the link keeps its own source until the appraiser\'s figure replaces it');
  [['a living Home Transition', LIVING, { needsAppr: true, fmv: 900, valuedBy: 'desk' }],
   // On an estate a painting's figure at the $3,000 line keeps it on the guardrail; below it, it would not need an appraisal at all.
   ['a probate estate', ESTATE, { fmv: 5000, valuedBy: 'desk', valSource: 'Dealer quote', valNote: 'Quote from Gallery 9' }]].forEach(([what, J, earlier]) => {
    const C = desk(J(), [LINE(earlier)]);
    attempt(() => C._invSetAppraiser(7, 's1', '501'));
    const r = ref(C);
    eq([r.fmv, r.valSource, r.valuedBy, r.valNote], [earlier.fmv, earlier.valSource, 'desk', earlier.valNote], what + ': ⚠⚠ the earlier figure, its source and its sentence stand');
    eq(attempt(() => C.invAppraised(r)).val, false, what + ': not appraised by the link');
    eq(attempt(() => C.invAppraisalSourceText(r, 7)).val, 'Appraisal · ' + LABEL + ' · pending', what + ': the line reads pending beside the earlier figure');
    eq(attempt(() => C._invGuardrailItems(7).length).val, 1, what + ': and stays on the guardrail');
    typeFigure(C, '12,000');
    eq([ref(C).fmv, ref(C).valSource, ref(C).valuedBy], [12000, 'Appraisal', 'appraiser'], what + ': the figure typed after the link replaces it as the appraisal');
    eq(ref(C).valNote, earlier.valNote, what + ': a sentence a person wrote survives (only the agent\'s goes with its figure)');
  });

  // ═══ 4 · AGENT TWO, UNCHANGED ═══
  group('4 · Agent Two\'s figure: unchanged, and a WorthPoint sale is never taken for the appraisal');
  {
    const AGENT = { fmv: 640, valLow: 480, valHigh: 800, valuedBy: 'agent', valSource: 'Auction comps', valNote: 'Three comparable lots', valConf: 'high',
      valComps: [{ title: 'x', price: 600 }], valLookup: 'harbour oil' };
    const C = desk(ESTATE(), [LINE(Object.assign({}, AGENT, { apprId: 501, apprDoc: LABEL }))]);
    typeFigure(C, '5200');
    eq([ref(C).valuedBy, ref(C).valSource, ref(C).valHigh, ref(C).valComps, ref(C).valNote], ['appraiser', 'Appraisal', undefined, undefined, undefined],
      'typed over the agent\'s with an appraiser linked: the appraisal, the agent\'s range, comparables and sentence gone (as before)');
    const D = desk(ESTATE(), [LINE(Object.assign({}, AGENT))]);
    typeFigure(D, '700');
    eq([ref(D).valuedBy, ref(D).valSource, ref(D).valNote], ['desk', undefined, undefined], 'typed over the agent\'s with no appraiser: the desk\'s (as before)');
    // A WorthPoint sale pasted on a linked line with no figure: the desk's comparable, its source WorthPoint comps.
    const E = desk(ESTATE(), [LINE({ apprId: 501, apprDoc: LABEL })]);
    ['title:Harbour scene, oil', 'price:$4,100', 'date:2025-11-02', 'venue:Bonhams', 'url:https://www.worthpoint.com/x'].forEach((p) => {
      const k = p.split(':')[0]; E.dom.getElementById('av-wp-' + k + '-s1').value = p.slice(k.length + 1);
    });
    const u = attempt(() => E.agentValueUseSale(7, 's1'));
    ok(u.ok, 'the sale is used (' + (u.err || 'ok') + ')');
    eq([ref(E).fmv, ref(E).valSource, ref(E).valuedBy, (ref(E).valComps || []).length], [4100, 'WorthPoint comps', 'desk', 1],
      '⚠⚠ a WorthPoint sale on a linked line is the desk\'s figure, its comparable kept (the appraisal arm would delete it)');
    eq(attempt(() => E.invAppraised(ref(E))).val, false, '…and not the appraisal');
    // Even on a line whose source a person set to Appraisal before any figure (an estate's box): the sale is the desk's comparable.
    const F = desk(ESTATE(), [LINE({ valSource: 'Appraisal' })]);
    ['title:Harbour scene, oil', 'price:$4,100', 'date:2025-11-02', 'venue:Bonhams', 'url:https://www.worthpoint.com/x'].forEach((p) => {
      const k = p.split(':')[0]; F.dom.getElementById('av-wp-' + k + '-s1').value = p.slice(k.length + 1);
    });
    attempt(() => F.agentValueUseSale(7, 's1'));
    eq([ref(F).valuedBy, ref(F).valSource, (ref(F).valComps || []).length], ['desk', 'WorthPoint comps', 1],
      '⚠ a sale on a line sourced Appraisal with no figure is the desk\'s, its comparable kept (the appraisal arm deleted it and named the appraiser)');
    has(code(fn('agentValueUseSale')), "_avTakeValue(ref, 'sale', job);", 'the sale asks the one rule as a sale');
  }

  // ═══ 5 · UNLINK, OR THE APPRAISER LEAVES THE ROSTER ═══
  group('5 · unlinking after the figure landed leaves the appraisal standing, named; removing the appraiser keeps a landed appraisal named');
  JOBS.forEach(([what, J, extra]) => {
    const C = desk(J(), [LINE(extra), LINE(Object.assign({}, extra, { stableId: 's2', itemNo: 13, objectName: 'Pair of bronzes' }))]);
    attempt(() => C._invSetAppraiser(7, 's1', '501'));
    attempt(() => C._invSetAppraiser(7, 's2', '501'));
    typeFigure(C, '18500');
    attempt(() => C._invSetAppraiser(7, 's1', ''));
    let r = ref(C);
    eq([r.apprId, r.apprDoc, r.valSource, r.fmv], ['', LABEL, 'Appraisal', 18500], what + ': ⚠ unlinked after landing: the appraisal stands, the appraiser still named');
    eq(attempt(() => C.invAppraisalSourceText(r, 7)).val, 'Appraisal · ' + LABEL, what + ': and the line still says whose figure it is');
    // Removing the appraiser: the landed line (relinked) keeps the name; the one still pending loses link and name.
    attempt(() => C._invSetAppraiser(7, 's1', '501'));
    C._photoRefs[7].forEach((x) => { x.updatedAt = 5; });
    attempt(() => C.removeAppraiser(7, 501));
    r = ref(C); const p = C._photoRefs[7][1];
    eq([r.apprId, r.apprDoc, r.valSource], ['', LABEL, 'Appraisal'], what + ': ⚠⚠ the appraiser removed: the landed appraisal stands, named (apprDoc)');
    eq([p.apprId, p.apprDoc], ['', ''], what + ': a line still pending loses the link and the name');
    ok(C._photoRefs[7].every((x) => x.updatedAt > 5), what + ': ⚠ each line changed is touched, so the unlink wins the merge');
    eq(attempt(() => C.invAppraisalSourceText(r, 7)).val, 'Appraisal · ' + LABEL, what + ': the line names the appraiser off its own record');
    eq(attempt(() => C.invAppraisalSourceText(p, 7)).val, '', what + ': the pending line reads nothing now');
  });
  {
    const C = desk(LIVING(), [LINE({ needsAppr: true })]);
    attempt(() => C._invSetAppraiser(7, 's1', '501'));
    attempt(() => C._invSetAppraiser(7, 's1', ''));
    eq(ref(C).apprDoc, '', 'unlinked while pending: the name goes with the link');
  }

  // ═══ 6 · THE BULK BAR ═══
  group('6 · the bulk bar\'s Valuation source asks the same rule, handing it the job');
  {
    // RESTATED (2026-10-27, the desk audit's P7, VAL-02): one select on the bar made forty of Agent Two's estimates read as
    // appraisals; an appraisal is one appraiser's figure, typed on its own line after Appraisal is chosen there. The bar no longer
    // offers it and the handler refuses it, naming why; the line keeps its source and its owner.
    const C = desk(ESTATE(), [LINE({ fmv: 3000, valSource: 'Dealer quote', valuedBy: 'desk' })]);
    C._invPick = { s1: 1 };
    const said = [];
    C.alert = (m) => said.push(String(m));
    attempt(() => C._invBulkApply(7, 'valSource', 'Appraisal'));
    eq([ref(C).valSource, ref(C).valuedBy, ref(C).fmv], ['Dealer quote', 'desk', 3000], '⚠⚠ Appraisal across a selection is refused: the line is as it was');
    has(said.join(' | '), 'Appraisal is never set across a selection', '…and the refusal says why');
    lacks(code(fn('_invBulkApply')), "_avTakeValue(ref, 'appraisal', job);", 'the bulk bar no longer takes a line as the appraisal');
  }

  // ═══ 7 · FILE THE REPORT ═══
  group('7 · File the report on the appraiser\'s row: the one filing path, Estate Inventory, listed with a Void, more than one; a line owed one is named');
  JOBS.forEach(([what, J, extra]) => {
    const C = desk(J(), [LINE(extra), LINE(Object.assign({}, extra, { stableId: 's2', itemNo: 13, objectName: 'Pair of bronzes' }))]);
    attempt(() => C._invSetAppraiser(7, 's1', '501'));
    attempt(() => C._invSetAppraiser(7, 's2', '501'));
    let roster = attempt(() => C._renderAppraiserRoster(C.jobs[0])).val || '';
    has(roster, '<th>Report</th>', what + ': the roster has a Report column');
    has(roster, 'id="appr-rpt-7-501"', what + ': each appraiser\'s report cell has its own id (repainted by id)');
    has(roster, '>File the report<', what + ': ⚠⚠ File the report on the appraiser\'s row');
    lacks(roster, 'report not filed', what + ': nothing owed while the figures are pending');
    typeFigure(C, '18500');
    const owed = attempt(() => C.apprReportOwedLines(C.jobs[0], 501).map((x) => x.stableId)).val;
    eq(owed, ['s1'], what + ': the line whose figure landed is owed its report');
    roster = attempt(() => C._renderAppraiserRoster(C.jobs[0])).val || '';
    has(textOf(roster), '⚠ report not filed: #12 Oil on canvas, harbour scene', what + ': ⚠⚠ named on the appraiser\'s row (a flag)');
    has(textOf(attempt(() => C._renderInvRow(C.jobs[0], ref(C))).val || ''), 'report not filed', what + ': and on the line\'s row');
    const bar = attempt(() => C.deskFoldState(7, C.jobs[0], 'values', C._photoRefs[7], '2026-10-24')).val || { bits: [] };
    eq(bar.bits.filter((b) => /report not filed/.test(b.text)).map((b) => [b.text, b.tone]), [['report not filed: Marie Wayland (1 item)', 'amber']],
      what + ': and on the Values bar\'s line, amber');
    eq(bar.openByDefault, false, what + ': which it does not open (a flag, never a block)');
    // The figure typed repainted the report cell by id (through the guardrail's repaint), never the roster whole.
    has(textOf(C.dom.getElementById('appr-rpt-7-501').innerHTML), 'report not filed', what + ': ⚠ the report cell was repainted as the figure landed');
    // File it, through the control on the row.
    const specAt = roster.indexOf('fileSignedCopyFromInput(this,');
    const idx = specAt >= 0 ? parseInt(roster.slice(specAt + 'fileSignedCopyFromInput(this,'.length), 10) : -1;
    ok(idx >= 0, what + ': fixture: the row carries a file control');
    attempt(() => C.fileSignedCopyFromInput({ files: [PDF], value: 'x' }, idx));
    const recs = C.jobs[0].signedRecords || [];
    eq(recs.length, 1, what + ': one copy recorded');
    const rec = recs[0] || {};
    eq([rec.kind, rec.ref, rec.stableIds, rec.label], ['appraisal_report', '501', ['s1', 's2'], 'Appraisal report · Marie Wayland'],
      what + ': ⚠⚠ kind appraisal_report, ref the appraiser\'s id, the lines linked to them, labelled for them');
    eq(C.log.resolves, ['Estate Inventory'], what + ': ⚠⚠ into Estate Inventory, where the collections\' Upload Appraisal files (never Signed Records)');
    ok(/^HVL-2610-(LIVE|EST) - Appraisal report - Marie Wayland - \d{4}-\d{2}-\d{2} \d{6}\.pdf$/.test((C.log.uploads[0] || {}).filename || ''),
      what + ': named for the appraiser, not their roster id: ' + (C.log.uploads[0] || {}).filename);
    roster = attempt(() => C._renderAppraiserRoster(C.jobs[0])).val || '';
    has(roster, 'href="https://drive.google.com/file/d/R1/view"', what + ': listed on the row with its link');
    has(roster, 'voidSignedRecord(7,', what + ': with a Void');
    has(roster, '>File the report<', what + ': and File the report still offered: more than one report may be filed');
    lacks(roster, 'report not filed', what + ': the report covering it clears the flag');
    eq(attempt(() => C.invAppraisalReportOwed(ref(C), C.jobs[0])).val, false, what + ': nothing owed');
    // Void it (filed against the wrong paper): listed no more, owed again.
    C.window.prompt = () => 'filed against the wrong appraiser';
    attempt(() => C.voidSignedRecord(7, rec.id));
    roster = attempt(() => C._renderAppraiserRoster(C.jobs[0])).val || '';
    lacks(roster, 'href="https://drive.google.com/file/d/R1/view"', what + ': a voided copy is listed no more');
    has(roster, 'report not filed', what + ': and the line is owed its report again');
    ok(!!(rec.voidedAt && rec.voidReason), what + ': the void is recorded with its reason (the file stays in Drive)');
  });
  {
    // The catalogue: one kind, its folder named by the photo upload's own rule.
    const C = desk(ESTATE(), []);
    eq(attempt(() => C.SIGNED_RECORD_KINDS.appraisal_report).val, { label: 'Appraisal report', folder: 'appraisal' }, 'SIGNED_RECORD_KINDS.appraisal_report');
    eq(attempt(() => C.photoSubfolder('appraisal')).val, 'Estate Inventory', '…whose folder is the collections\' appraisal uploads\' (photoSubfolder)');
    has(code(fn('attachCollectionDoc')), "_doPhotoUpload(jobId, ev.target.result, filename, stableId, 'Estate Inventory'", 'where Upload Appraisal files');
    has(code(fn('fileSignedCopy')), 'resolveSubfolderId(job, _sub,', 'fileSignedCopy resolves the kind\'s folder');
    // A report filed for one appraiser does not cover another's line.
    const D = desk(ESTATE({ signedRecords: [{ id: 'sr1', kind: 'appraisal_report', ref: '502', stableIds: ['s1'], fileUrl: 'https://d/x' }] }),
      [LINE({ apprId: 501, apprDoc: LABEL, fmv: 9000, valSource: 'Appraisal', valuedBy: 'appraiser' })]);
    eq(attempt(() => D.invAppraisalReportOwed(ref(D), D.jobs[0])).val, true, 'a report filed for another appraiser does not cover the line');
    // Nor does one filed for this appraiser before the line was linked to them (it lists the lines linked then).
    const E = desk(ESTATE({ signedRecords: [{ id: 'sr1', kind: 'appraisal_report', ref: '501', stableIds: ['s2'], fileUrl: 'https://d/x' }] }),
      [LINE({ apprId: 501, apprDoc: LABEL, fmv: 9000, valSource: 'Appraisal', valuedBy: 'appraiser' })]);
    eq(attempt(() => E.invAppraisalReportOwed(ref(E), E.jobs[0])).val, true, '⚠ a report of this appraiser\'s that does not list the line does not cover it');
    E.jobs[0].signedRecords[0].stableIds = ['s2', 's1'];
    eq(attempt(() => E.invAppraisalReportOwed(ref(E), E.jobs[0])).val, false, '…one that lists it does');
  }

  // ═══ 8 · THE ESTATE PACKAGE LINKS EACH REPORT ═══
  group('8 · the estate package links the reports filed from the roster, and a report filed after a draft makes the draft stale');
  {
    const job = ESTATE({ signedRecords: [
      { id: 'sr1', kind: 'appraisal_report', ref: '501', stableIds: ['s1'], label: 'Appraisal report · Marie Wayland', fileUrl: 'https://drive.google.com/file/d/R1/view', filedAt: 2000 },
      { id: 'sr2', kind: 'appraisal_report', ref: '777', stableIds: [], label: 'Appraisal report · Jane Gone', fileUrl: 'https://drive.google.com/file/d/R2/view', filedAt: 2000 },
      { id: 'sr3', kind: 'appraisal_report', ref: '501', stableIds: [], label: 'Appraisal report · Marie Wayland', fileUrl: 'https://drive.google.com/file/d/R3/view', voidedAt: 2200, filedAt: 2000 }] });
    const C = desk(job, [LINE({ label: 'appraisal', stableId: 'c1', docKind: 'appraisal', collId: '4', objectName: 'Coins.pdf', status: 'uploaded', driveFileUrl: 'https://drive.google.com/file/d/C1/view' })]);
    const reps = attempt(() => C.probatePackageReports(job)).val || [];
    eq(reps.map((r) => [r.title, r.name, r.url]), [
      ['Appraisal report', 'Coins.pdf', 'https://drive.google.com/file/d/C1/view'],
      ['Appraisal report', LABEL, 'https://drive.google.com/file/d/R1/view'],
      ['Appraisal report', 'Jane Gone', 'https://drive.google.com/file/d/R2/view']],
      '⚠⚠ the collection upload, then each live report, named for its appraiser (or the name it was filed under once they left the roster); a voided copy left out');
    const st = { draftedAt: new Date(2500).toISOString(), pkg: { owed: attempt(() => C.probatePackageDocs(job)).val } };
    eq(attempt(() => C.probatePackageMovedSince(job, st)).val, false, 'fixture: a draft made after every filing is current');
    job.signedRecords.push({ id: 'sr4', kind: 'appraisal_report', ref: '501', stableIds: ['s1'], fileUrl: 'https://d/R4', filedAt: 4000 });
    eq(attempt(() => C.probatePackageMovedSince(job, st)).val, true, '⚠ a report filed after the draft makes it stale (it would not link it)');
  }

  // ═══ 9 · THE DOCUMENTS NAME THE APPRAISER ═══
  group('9 · the schedules\' basis, the Estate Inventory Report, the worklist and the guardrail name the appraiser');
  {
    const C = desk(ESTATE(), [LINE({ apprId: 501, apprDoc: LABEL, fmv: 18500, valSource: 'Appraisal', valuedBy: 'appraiser' }),
      LINE({ stableId: 's2', itemNo: 13, objectName: 'Pair of bronzes', category: 'Antiques', apprId: 501, apprDoc: LABEL, fmv: '' }),
      LINE({ stableId: 's3', itemNo: 14, objectName: 'Mantel clock', category: 'Clocks', fmv: 400, valSource: 'Dealer quote' })]);
    const R = C._photoRefs[7];
    eq(attempt(() => C.invValBasisWord(R[0], 7)).val, 'appraisal · ' + LABEL, '⚠⚠ the schedule\'s basis names the appraiser beside "appraisal"');
    eq(attempt(() => C.invValBasisWord(R[0])).val, 'appraisal · ' + LABEL, '…with no job, off the name the line keeps');
    // RESTATED (P7, VAL-02): nobody recorded as the appraiser is said so on the schedule, never a bare "appraisal".
    eq(attempt(() => C.invValBasisWord({ fmv: 1, valSource: 'Appraisal' })).val, 'appraisal (appraiser not named)', 'an appraisal with no appraiser recorded (counsel\'s) says so');
    eq(attempt(() => C.invValBasisWord(R[2], 7)).val, 'dealer quote', 'any other source as before');
    const sec = attempt(() => C._invScheduleSection('Tangible Personal Property', [R[0], R[2]])).val || { html: '' };
    has(sec.html, 'appraisal · ' + LABEL, 'the Court Inventory and the Trust Schedule\'s shared table print it');
    const rep = attempt(() => C.printEstateInventoryReport(7, { asHtml: true })).val || {};
    has(textOf(rep.html), 'Appraisal · ' + LABEL, '⚠⚠ the Estate Inventory Report\'s Valuation source names the appraiser');
    has(textOf(rep.html), 'Dealer quote', '…and prints any other source as typed');
    const wl = attempt(() => C.printAppraisalWorklist(7, { asHtml: true })).val || {};
    has(textOf(wl.html), 'Pair of bronzes · Appraisal in progress · ' + LABEL, '⚠ the worklist: "Appraisal in progress · <appraiser>" on a linked line');
    lacks(textOf(wl.html), 'Oil on canvas', '…and an appraised line is off it (as before)');
    const gr = attempt(() => C._renderAppraisalGuardrail(C.jobs[0])).val || '';
    has(textOf(gr), 'Appraisal in progress · ' + LABEL + ': when the report comes back, type its figure on the line.', 'the guardrail: in progress, naming the appraiser and what to do');
    lacks(gr, 'with source Appraisal', '⚠ and never asks for the source to be set (it is the appraiser already)');
    lacks(gr, 'this estate&rsquo;s inventory', 'its heading says "this inventory", true on a living Formal job too');
    // The report's flag list keeps the appraiser of a landed appraisal after they leave the roster.
    const D = desk(ESTATE({ appraisers: [] }), [LINE({ apprId: '', apprDoc: LABEL, fmv: 18500, valSource: 'Appraisal', valuedBy: 'appraiser' })]);
    const rep2 = attempt(() => D.printEstateInventoryReport(7, { asHtml: true })).val || {};
    has(textOf(rep2.html), 'Appraiser engaged', 'fixture: the report\'s appraisal flag list');
    has(textOf(rep2.html), LABEL, '⚠ an appraisal whose appraiser left the roster still names them');
    lacks(textOf(rep2.html), 'Not yet engaged', '…never "Not yet engaged" over a landed appraisal');
  }

  // ═══ 10 · ONE RULE, ONE READER ═══
  group('10 · one rule: _avTakeValue decides the owner, invAppraised what is appraised, _invLinkedAppraiser the link, the namer the words');
  {
    has(code(fn('_avTakeValue')), "var appraisal = how !== 'sale' && (how === 'appraisal' || wasAppraisal || (figure && linked));",
      'the one ownership rule: a typed figure on a linked line is the appraisal, on every job (no wasAgent condition)');
    has(code(fn('_avTakeValue')), "var figure = how === 'typed' && _invHasValue(ref);", '…and a figure is a value left on the line: a blank is none (the Q93 review)');
    has(code(fn('_avTakeValue')), "var wasAppraisal = ref.valSource === 'Appraisal';", '…a source of Appraisal read before anything is written');
    has(code(fn('_avTakeValue')), 'var linked = !!ref.apprId && (!job || _invHasAppraisal(job.id, ref));', 'linked: the roster, through _invHasAppraisal');
    has(code(fn('_invEdit')), "if (key === 'fmv' || key === 'unitVal') _avTakeValue(ref, 'typed', _invJob(jobId));", '_invEdit hands it the job');
    // The appraised test lives in invAppraised alone: the conjunction of the source and a value is written nowhere else.
    eq(fnsWhere(/valSource === 'Appraisal' && _invHasValue\(/), ['invAppraised'], '⚠⚠ "source Appraisal with a value" is asked in invAppraised alone');
    // Every comparison of a source with 'Appraisal' in live code is in one of the four places that set or name it, never a second "appraised".
    // RESTATED (P7): the ask before Appraisal is chosen over another's figure, and Agent Two's writer, which never fills a line waiting
    // on its appraiser's figure, compare it too.
    eq(fnsWhere(/valSource\s*===\s*'Appraisal'/), ['_avTakeValue', '_avWrite', '_invEdit', 'agentRevalue', 'invAppraisalSourceAsk', 'invAppraised'], 'the source is compared with Appraisal only where it is set or named');
    const readers = callersOf('invAppraised');
    ['invAppraisalSourceText', 'invValBasisWord', 'printEstateInventoryReport', '_invSetAppraiser', 'removeAppraiser', '_invEdit', 'invAppraisalReportOwed']
      .forEach((f) => ok(readers.indexOf(f) >= 0, 'invAppraised is read by ' + f));
    eq(callersOf('invAppraisalSourceText'), ['_invPanelAppraisalHtml', '_renderInvRow', 'printEstateInventoryReport'], 'the namer: the row, the record and the report');
    eq(callersOf('apprReportOwedLines'), ['_apprReportCellHtml', 'deskFoldState'], 'what is owed a report: the roster row and the Values bar, one rule');
    // _invLinkedAppraiser answers the link _invHasAppraisal answers, line for line.
    const C = desk(ESTATE(), []);
    const cases = [{}, { apprId: 501 }, { apprId: '501' }, { apprId: 502 }, { apprId: 999 }, { apprId: '' }, null];
    eq(cases.map((r) => !!attempt(() => C._invLinkedAppraiser(7, r)).val), cases.map((r) => !!attempt(() => C._invHasAppraisal(7, r)).val),
      '_invLinkedAppraiser and _invHasAppraisal agree on every link');
    eq(attempt(() => C.invLineAppraiser({ apprId: 502 }, 7)).val, 'Tom Beck', 'the namer reads the roster\'s label');
    eq(attempt(() => C.invLineAppraiser({ apprId: 999, apprDoc: 'Kept Name' }, 7)).val, 'Kept Name', '…else the label the line keeps');
  }
  // ═══ 11 · THE REVIEW: A BLANK IS NO FIGURE, AND A BARE SOURCE OF APPRAISAL GOES WITH THE LINK ═══
  // The review reproduced it in the real page: a living Formal job, a desk figure of $900, the appraiser linked, the box cleared
  // (Tab) wrote ['', 'Appraisal', 'appraiser', a date]; unlinked; 650 typed with no appraiser linked read [650, 'Appraisal',
  // 'appraiser'], appraised, the Formal guardrail empty. On an estate the clear overwrote a recorded Dealer quote.
  group('11 · the Q93 review: a blank typed on a linked line is no figure; a link off a line not appraised takes a bare source of Appraisal with it');
  [['a living Home Transition', LIVING, { needsAppr: true, fmv: 900, valuedBy: 'desk' }],
   ['a probate estate', ESTATE, { fmv: 5000, valuedBy: 'desk', valSource: 'Dealer quote' }]].forEach(([what, J, earlier]) => {
    const C = desk(J(), [LINE(earlier)]);
    attempt(() => C._invSetAppraiser(7, 's1', '501'));
    const t = typeFigure(C, '');
    ok(t.ok, what + ': the box is cleared (' + (t.err || 'ok') + ')');
    let r = ref(C);
    eq([r.fmv, r.valSource, r.valuedBy, r.valDate], ['', earlier.valSource, 'desk', undefined],
      what + ': ⚠⚠ cleared on a linked line: no source of Appraisal, no appraiser, no date written, and a source a person recorded stands');
    eq(attempt(() => C.invAppraised(r)).val, false, what + ': not appraised');
    eq(attempt(() => C.invAppraisalSourceText(r, 7)).val, 'Appraisal · ' + LABEL + ' · pending', what + ': still pending on the link');
    // The review's path on: the link comes off, then a figure is typed with no appraiser linked.
    attempt(() => C._invSetAppraiser(7, 's1', ''));
    typeFigure(C, '650');
    r = ref(C);
    eq([r.fmv, r.valSource, r.valuedBy], [650, earlier.valSource, 'desk'], what + ': ⚠⚠ a figure typed once the link is off is the desk\'s, never an appraisal');
    eq(attempt(() => C.invAppraised(r)).val, false, what + ': and the line is not appraised');
    if (J === LIVING) {
      eq(attempt(() => C._invGuardrailItems(7).length).val, 1, what + ': ⚠ so it stays on the guardrail (a desk estimate clears no appraisal)');
      const bar = attempt(() => C.deskFoldState(7, C.jobs[0], 'values', C._photoRefs[7], '2026-10-24')).val || { bits: [] };
      lacks(bar.bits.map((b) => b.text).join(' | '), '✓ nothing needs an appraisal', what + ': and the Values bar does not say nothing needs one');
    }
  });
  {
    // A source of Appraisal with no figure under it (an estate's box set ahead of the report, or a figure cleared on an appraised line):
    // it stays while a link stands, and goes with the link, so the next desk figure is the desk's.
    const BARE = () => LINE({ needsAppr: true, apprId: 501, apprDoc: LABEL, valSource: 'Appraisal', valuedBy: 'appraiser', fmv: '' });
    const C = desk(LIVING(), [BARE()]);
    attempt(() => C._invSetAppraiser(7, 's1', '502'));
    eq([ref(C).valSource, String(ref(C).apprId)], ['Appraisal', '502'], 'a bare source of Appraisal stays while a link stands (relinked, nothing asked: not appraised)');
    attempt(() => C._invSetAppraiser(7, 's1', ''));
    eq([ref(C).valSource, ref(C).valuedBy, ref(C).apprDoc], [undefined, undefined, ''], '⚠⚠ and comes off with the link');
    typeFigure(C, '650');
    eq([ref(C).valSource, ref(C).valuedBy], [undefined, 'desk'], '…so the next figure typed is the desk\'s');
    const D = desk(LIVING(), [BARE()]);
    attempt(() => D.removeAppraiser(7, 501));
    eq([ref(D).valSource, ref(D).valuedBy, ref(D).apprId, ref(D).apprDoc], [undefined, undefined, '', ''],
      '⚠⚠ removing the appraiser takes a bare source of Appraisal off each line it unlinks');
    // A cleared figure on an appraised line keeps the appraisal's source while linked (as before Q93): the next figure is the appraisal's.
    const E = desk(LIVING(), [LINE({ needsAppr: true, apprId: 501, apprDoc: LABEL, valSource: 'Appraisal', valuedBy: 'appraiser', fmv: 18500, valDate: '2026-10-20' })]);
    typeFigure(E, '');
    eq([ref(E).valSource, ref(E).valDate], ['Appraisal', '2026-10-20'], 'a figure cleared on an appraised, linked line: the source as before, and no date written');
    const E2 = desk(LIVING(), [LINE({ needsAppr: true, apprId: 501, apprDoc: LABEL, valSource: 'Appraisal', valuedBy: 'appraiser', fmv: 18500 })]);
    typeFigure(E2, '');
    eq(ref(E2).valDate, undefined, '⚠ …nor onto one with no date: a date is written only with a figure');
  }

  group('12 · the Q93 review: relinking or unlinking a line whose appraisal figure has landed asks first');
  JOBS.forEach(([what, J, extra]) => {
    const C = desk(J(), [LINE(extra)]);
    attempt(() => C._invSetAppraiser(7, 's1', '501'));
    typeFigure(C, '18500');
    const said = []; let answer = false;
    C.window.confirm = (m) => { said.push(m); return answer; };
    const r0 = C.log.renders;
    attempt(() => C._invSetAppraiser(7, 's1', '502'));
    eq(said.length, 1, what + ': ⚠⚠ relinking an appraised line to somebody else asks first');
    has(said[0] || '', '#12 Oil on canvas, harbour scene already carries an appraisal figure, recorded as ' + LABEL + '’s. Link it to Tom Beck?',
      what + ': naming the item, whose figure it is, and who it would go to');
    has(said[0] || '', 'OK names Tom Beck as the appraiser of the figure on the line: use it to correct a wrong link.', what + ': and what OK does');
    eq(String(ref(C).apprId), '501', what + ': ⚠ Cancel leaves the link as it was');
    eq(attempt(() => C.invValBasisWord(ref(C), 7)).val, 'appraisal · ' + LABEL, what + ': …and the figure still names the appraiser it landed under');
    ok(C.log.renders > r0, what + ': and the desk is redrawn, so the picker shows the link it kept');
    answer = true;
    attempt(() => C._invSetAppraiser(7, 's1', '502'));
    eq([String(ref(C).apprId), attempt(() => C.invValBasisWord(ref(C), 7)).val], ['502', 'appraisal · Tom Beck'], what + ': OK relinks: a correction, the figure named for Tom Beck');
    // Unlinking: OK keeps the appraisal (as before), Cancel takes it off.
    said.length = 0;
    attempt(() => C._invSetAppraiser(7, 's1', ''));
    has(said[0] || '', 'Keep the appraisal on #12 Oil on canvas, harbour scene?', what + ': ⚠⚠ unlinking an appraised line asks whether to keep the appraisal');
    has(said[0] || '', 'Its figure is recorded as Tom Beck’s appraisal. OK keeps it, with the appraiser named. Cancel takes the appraisal off: the figure stays on the line as the desk’s estimate, with no source.',
      what + ': saying what each answer does');
    eq([ref(C).apprId, ref(C).apprDoc, ref(C).valSource], ['', 'Tom Beck', 'Appraisal'], what + ': OK: the appraisal stands, named');
    // Relinking it to the appraiser it already names asks nothing.
    said.length = 0;
    attempt(() => C._invSetAppraiser(7, 's1', '502'));
    eq([said.length, String(ref(C).apprId)], [0, '502'], what + ': relinked to the appraiser it already names: nothing asked');
    answer = false;
    attempt(() => C._invSetAppraiser(7, 's1', ''));
    const r = ref(C);
    eq([r.fmv, r.valSource, r.valuedBy, r.apprId, r.apprDoc], [18500, undefined, 'desk', '', ''],
      what + ': ⚠⚠ Cancel takes the appraisal off: the figure stays as the desk\'s, with no source and no appraiser');
    eq(attempt(() => C.invAppraised(r)).val, false, what + ': not appraised');
    eq(attempt(() => C._invGuardrailItems(7).length).val, 1, what + ': ⚠ and back on the guardrail: only an appraisal or a Waive clears it');
  });

  group('13 · the Q93 review: the appraisal\'s date, the work bar, the Values bar\'s lines, a report whose appraiser left the roster');
  {
    const EFF = (J) => J({ appraisers: [Object.assign({}, AP, { effectiveDate: '2026-09-30' }), Object.assign({}, AP2)] });
    // A living line carrying a date from an earlier figure (a WorthPoint sale): the appraisal's own date replaces it.
    const C = desk(EFF(LIVING), [LINE({ needsAppr: true, valDate: '2026-08-01' })]);
    attempt(() => C._invSetAppraiser(7, 's1', '501'));
    typeFigure(C, '18500');
    eq(ref(C).valDate, '2026-09-30', '⚠⚠ the appraisal carries its appraiser\'s effective (value) date from the roster, over a date an earlier figure left');
    typeFigure(C, '19000');
    eq(ref(C).valDate, '2026-09-30', 'a figure retyped on the appraisal keeps its date');
    const D = desk(LIVING(), [LINE({ needsAppr: true, valDate: '2026-08-01' })]);
    attempt(() => D._invSetAppraiser(7, 's1', '501'));
    typeFigure(D, '18500');
    eq(D._photoRefs[7][0].valDate, '2026-10-24', '⚠ with none recorded, a living appraisal is dated the day it is recorded, not the earlier figure\'s date');
    const D2 = desk(LIVING(), [LINE({ needsAppr: true, apprId: 501, apprDoc: LABEL, valSource: 'Appraisal', valuedBy: 'appraiser', fmv: 18500, valDate: '2026-10-20' })]);
    typeFigure(D2, '19000');
    eq(D2._photoRefs[7][0].valDate, '2026-10-20', '⚠ a figure retyped on a living appraisal that landed on an earlier day keeps that day (only the landing dates it)');
    const E = desk(EFF(ESTATE), [LINE()]);
    attempt(() => E._invSetAppraiser(7, 's1', '501'));
    typeFigure(E, '18500');
    eq(E._photoRefs[7][0].valDate, '2026-09-30', 'an estate line with no date of its own: the appraiser\'s effective date');
    const F = desk(EFF(ESTATE), [LINE({ apprId: 501, apprDoc: LABEL, valDate: '2026-07-01' })]);
    typeFigure(F, '9000');
    eq(F._photoRefs[7][0].valDate, '2026-07-01', 'an estate\'s Valuation Date box is a person\'s: a date there stays (as group 2)');
  }
  {
    // The work bar's Value N lines goes as the figure lands, repainted by id (it was left offering the line until a full render).
    const C = desk(LIVING(), [LINE({ needsAppr: true })]);
    attempt(() => C._invSetAppraiser(7, 's1', '501'));
    const wb = C.dom.getElementById('inv-workbar');
    wb.outerHTML = attempt(() => C._renderInvWorkbar(C.jobs[0], C._photoRefs[7])).val || '';
    has(wb.outerHTML, '>Value 1 line</button>', 'fixture: the work bar offers the linked line for valuing while it has no figure');
    typeFigure(C, '18500');
    lacks(String(wb.outerHTML || ''), 'Value 1 line', '⚠⚠ the figure typed repaints the work bar: Value 1 line is gone');
    has(String(wb.outerHTML || ''), 'id="inv-workbar"', '…the work bar itself redrawn in place');
  }
  {
    // The Values bar's report line reads the lines it is handed (deskFoldState's `all`), as the rest of the bar does.
    const C = desk(ESTATE(), [LINE({ apprId: 501, apprDoc: LABEL, fmv: 18500, valSource: 'Appraisal', valuedBy: 'appraiser' })]);
    const on = (all) => (attempt(() => C.deskFoldState(7, C.jobs[0], 'values', all, '2026-10-24')).val || { bits: [] }).bits.map((b) => b.text).join(' | ');
    has(on(C._photoRefs[7]), 'report not filed: Marie Wayland (1 item)', 'fixture: the lines handed in owe a report');
    lacks(on([]), 'report not filed', '⚠ handed no lines, the bar names none owed (it read the job\'s lines whatever it was handed)');
    has(code(fn('deskFoldState')), 'apprReportOwedLines(job, a.id, all)', 'deskFoldState hands it `all`');
  }
  {
    // A report filed for an appraiser who then leaves the roster: listed under the roster with its Void, never lost with the row.
    const C = desk(ESTATE({ signedRecords: [
      { id: 'sr1', kind: 'appraisal_report', ref: '501', stableIds: ['s1'], label: 'Appraisal report · Marie Wayland', fileUrl: 'https://drive.google.com/file/d/R1/view', filedAt: 2000 }] }),
      [LINE({ apprId: 501, apprDoc: LABEL, fmv: 18500, valSource: 'Appraisal', valuedBy: 'appraiser' })]);
    let roster = attempt(() => C._renderAppraiserRoster(C.jobs[0])).val || '';
    lacks(roster, 'no longer on the roster', 'fixture: a report whose appraiser is on the roster is listed on their row only');
    eq((roster.match(/file\/d\/R1\/view/g) || []).length, 1, '…once');
    const said = []; C.window.confirm = (m) => { said.push(m); return true; };
    attempt(() => C.removeAppraiser(7, 501));
    has(said[0] || '', 'any report filed stays in Drive and on the record, listed under the roster.', 'the Remove confirm says where the report stays listed');
    roster = attempt(() => C._renderAppraiserRoster(C.jobs[0])).val || '';
    has(textOf(roster), 'Reports filed for appraisers no longer on the roster:', '⚠⚠ listed under the roster once the appraiser has left it');
    has(roster, 'href="https://drive.google.com/file/d/R1/view"', '…with its link');
    has(roster, 'voidSignedRecord(7,\'sr1\')', '…and its Void, reachable');
    eq((attempt(() => C.probatePackageReports(C.jobs[0])).val || []).map((x) => x.url), ['https://drive.google.com/file/d/R1/view'], 'the package still links it, as the desk lists it');
  }
};
