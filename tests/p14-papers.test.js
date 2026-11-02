'use strict';
// P14 OF THE DESK AUDIT (2026-10-28): EACH PAPER SAYS THE RIGHT THING FOR ITS MATTER (audits/2026-10-27-desk/PLAN.md, P14; the
// findings DOC-02, DOC-07, VAL-24, NEW-14, DOC-28, DOC-20, DOC-17, VAL-30, EST-20, VAL-25 and LIV-16). Every paper the pack
// touches is rendered by its real printer on the six matters a job can be: probate, trust, both, neither, an unanswered estate
// and a living client, and each check reads the page's own text.
//
//   A · exempt property is claimed inside the probate estate on the Estate Inventory Report, with its subtotal (DOC-02);
//   B · the Appraisal Worklist's value date is the estate's, the alternate date named where elected, and a living client's has no
//       date of death (DOC-07, VAL-24); it states facts, never the desk's presses (DOC-20);
//   C · trust-only papers say *Inventory* and *the trust's Drive folder* (DOC-28);
//   D · the Court Inventory carries its own name, and the package email says what each attachment is for (DOC-17);
//   E · an appraiser's firm prints once (VAL-30);
//   F · More ▾ offers each instrument only where the matter has it (EST-20);
//   G · the guardrail says who arranges the appraisal and what the job is; the living Values bar says *To a specialist* and its
//       roster no date of death (VAL-25, VAL-24, NEW-14);
//   H · the living CSV and the living line's record follow the job (LIV-16);
//   I · the four documents and the counsel bundle say what changed.

const fs = require('fs');
const path = require('path');
const { sandbox, source, fn, decl, domStub } = require('./harness');

const SRC = source();
const code = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n');
const bare = (t) => code(t).replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
const textOf = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&middot;/g, '·').replace(/&rsquo;/g, '’').replace(/&mdash;/g, '—')
  .replace(/&sect;/g, '§').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#9888;/g, '⚠').replace(/&#9873;/g, '⚑').replace(/\s+/g, ' ');
const attempt = (f) => { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } };
const inEastern = (body) => { const prev = process.env.TZ; process.env.TZ = 'America/New_York'; try { return body(); } finally { process.env.TZ = prev; } };

const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
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

const STOP = ['jobs', '_photoRefs', 'estimateStore', 'jobPlanStore', 'vendorDirectory', 'document', 'window', 'SHEETS_SYNC_URL', '_invCloudSeen',
  '_invCloudFailed', 'savePhotoRefs', '_scheduleInventorySync', 'renderInventoryTab', 'showSyncBadge', '_invRefreshFlagStrip', '_invRefreshRecords',
  '_invRefreshReleases', '_invRefreshAgentNotices', '_deskFoldHeadsRepaint', '_todayStr', 'saveJobs', 'syncJobToSheets', '_invThumbHTML',
  'setTimeout', 'clearTimeout', '_printDocument', '_invPrintThumb', 'alert', '_invRefreshSummary', '_invRefreshGuardrail', 'invReadFirst',
  'refreshPhotoRefs', 'fetch', 'resolveSubfolderId', '_invShareEach', '_estStoreState'];
const ROOTS = ['printEstateInventoryReport', 'printCourtInventory', 'printTrustSchedule', 'printAppraisalWorklist', 'printContentsList',
  'printAsFoundRecord', 'invInstrumentOffered', '_renderAppraisalGuardrail', '_renderAppraiserRoster', '_apprFormCellsHtml', 'deskFoldState',
  '_renderInvPanel', 'buildInventoryCSV', 'buildProbatePackageEmailText', 'buildProbatePackageEmailHtml', 'probatePackageTitle',
  'probatePackageDocPurpose', 'probatePackageDocs', 'invTransportFact', 'invTransportReason', '_apprLabel', 'invLineAppraiser', 'invAppraisalSourceText',
  '_pkgShareFolders', 'probatePackageCardHtml', 'invValueAsOfWords', 'invInventoryWord', 'invDriveFolderWords', '_apprGuardrailHead',
  // P14's review: the chip's rule beside the bar's, and who arranges an appraisal.
  'invNeedsAppraisal', 'invAwaitingAppraisal', 'jobAppraisalDuty', 'invNfaTransferText'];
let _cl = null;
function rig(job, rows, o) {
  o = o || {};
  _cl = _cl || closure(ROOTS, STOP);
  const said = [], printed = [];
  const C = sandbox({ fns: _cl.fns, vars: _cl.vars, stubs: {
    jobs: [job], _photoRefs: { [job.id]: rows.map((r) => Object.assign({}, r)) },
    estimateStore: { [job.id]: { estimate: { svc: job.svc, rooms: [{ idx: 0, name: 'Living Room' }, { idx: 1, name: 'Garage' }] } } },
    jobPlanStore: {}, vendorDirectory: o.dir || [], document: domStub({}),
    window: { confirm: (m) => { said.push(String(m)); return true; } },
    SHEETS_SYNC_URL: 'https://script.google.com/macros/s/P14/exec', _invCloudSeen: { [job.id]: true }, _invCloudFailed: {},
    savePhotoRefs() {}, _scheduleInventorySync() {}, renderInventoryTab() {}, showSyncBadge() {},
    _invRefreshFlagStrip() {}, _invRefreshRecords() {}, _invRefreshReleases() {}, _invRefreshAgentNotices() {}, _deskFoldHeadsRepaint() {},
    _todayStr: () => '2026-10-28', saveJobs() {}, syncJobToSheets() {}, _invThumbHTML: () => '<i></i>', setTimeout: () => 1, clearTimeout() {},
    _printDocument(h) { printed.push(String(h)); }, _invPrintThumb: () => '', alert(m) { said.push(String(m)); }, _invRefreshSummary() {}, _invRefreshGuardrail() {},
    invReadFirst: () => false, refreshPhotoRefs() {}, fetch: () => ({ then() { return this; }, catch() { return this; } }),
    resolveSubfolderId: (j, name, cb) => cb(name === 'As-Found Record' ? 'AF' : 'INV'), _invShareEach: (ids, a, e, done) => done(1, ''),
    _estStoreState: o.estStore || 'ready',   // P14's review: the estimate store has read, unless a check says otherwise
  } });
  C.said = said; C.printed = printed;
  return C;
}
// The six matters, one estate each (Probate, Trust, Both, Neither and unanswered on an Estate Settlement), and a living client.
const BASE = { id: 14, hvlId: 'HVL-2610-P14', name: 'Harold Ashworth', addr: '210 Via Bellaria, Palm Beach', city: 'Palm Beach',
  deathDate: '2026-06-14', gate706: 'yes', docTier: 'values', status: 'active', activatedOn: '2026-07-01', won: true,
  executor: 'Ruth Adler', executorEmail: 'ruth@x.com', executorRole: 'Personal Representative', probateAttyEmail: 'counsel@law.com',
  probateAtty: 'Ann Lowe', tc: 'Ashley Jerome', docState: {}, at: {}, appraisers: [], driveFolder: 'ROOT14', probateCase: '50-2026-CP-001234' };
const MATTERS = {
  probate:    Object.assign({}, BASE, { svc: 'probate', matterType: 'probate' }),
  trust:      Object.assign({}, BASE, { svc: 'cleanout', matterType: 'trust', trustName: 'Ashworth Family Trust', trustDate: '2015-03-03' }),
  both:       Object.assign({}, BASE, { svc: 'probate', matterType: 'both', trustName: 'Ashworth Family Trust', trustDate: '2015-03-03' }),
  neither:    Object.assign({}, BASE, { svc: 'cleanout', matterType: 'neither' }),
  unanswered: Object.assign({}, BASE, { svc: 'cleanout', matterType: '' }),
  living:     Object.assign({}, BASE, { svc: 'downsizing_move', name: 'Robert Hale', deathDate: '', gate706: '', docTier: '', executor: '',
    executorEmail: '', executorRole: '', probateAttyEmail: '', probateAtty: '', probateCase: '', clientEmail: 'robert@hale.com', destAddr: '9 Ocean Ave' }),
};
const LINE = (o) => Object.assign({ stableId: 's1', label: 'inventory', itemNo: 1, objectName: 'Walnut sideboard', category: 'Furniture',
  disposition: 'Keep', roomIdx: 0, ts: Date.UTC(2026, 9, 21, 2, 9, 17), updatedAt: 1, fmv: 1200, valuedBy: 'desk', valSource: 'Dealer quote',
  namedBy: 'desk', reviewed: true }, o || {});
const ROWS = () => [
  LINE({ stableId: 'a1', itemNo: 1, objectName: 'Walnut sideboard', fmv: 1200 }),
  LINE({ stableId: 'a2', itemNo: 2, objectName: 'Household sofa', fmv: 900, flagExempt: true }),
  LINE({ stableId: 'a3', itemNo: 3, objectName: 'Mercedes sedan', category: 'Vehicles & Watercraft', fmv: 14000, assetTrack: 'Non-probate', roomIdx: 1 }),
  LINE({ stableId: 'a4', itemNo: 4, objectName: 'Oil on canvas, harbour scene', category: 'Art & Décor', fmv: 4200, needsAppr: true }),
];
const page = (C, f, jid) => { const r = attempt(() => C[f](jid || 14, { asHtml: true })).val || {}; return { html: r.html || '', text: textOf(r.html), why: r.why || '', title: r.title || '' }; };

module.exports = function ({ group, ok, eq, has, lacks }) {
  // ═══════════════════════════════ A · EXEMPT PROPERTY IS CLAIMED INSIDE THE ESTATE (DOC-02) ═══════════════════════════════
  group('⚠⚠ A1 · the Report lists exempt property inside the probate estate under its own heading with its subtotal, as the Court Inventory claims it');
  {
    ['probate', 'both', 'unanswered'].forEach((m) => {
      const C = rig(MATTERS[m], ROWS());
      const r = page(C, 'printEstateInventoryReport');
      const iExempt = r.text.indexOf('Exempt Property Claimed (Fla. Stat. §732.402)');
      const iOutside = r.text.indexOf('Property — outside the probate estate');
      ok(iExempt > 0, m + ': the exempt property has its own heading inside the estate');
      ok(iExempt > 0 && r.text.indexOf('Household sofa', iExempt) > iExempt && (iOutside < 0 || r.text.indexOf('Household sofa', iExempt) < iOutside),
        m + ': ⚠ the sofa ticked Exempt is listed under it, before the property outside the estate');
      has(r.text, 'Total exempt property claimed: $900', m + ': …with its subtotal, in the Court Inventory\'s words');
      eq(r.text.split('Household sofa').length - 1, 1, m + ': ⚠ the sofa is listed once, inside the estate, never again with the property outside it');
      has(r.text, 'Non-probate Property — outside the probate estate', m + ': the outside block names what it holds');
      ok(iOutside > 0 && r.text.indexOf('Mercedes sedan', iOutside) > iOutside, m + ': …and the car is listed there');
      lacks(r.text, 'carved out of the probate estate', m + ': ⚠⚠ never "carved out of the probate estate" over exempt property');
      lacks(r.text, 'Exempt property is counted in the probate estate', m + ': P7\'s stopgap sentence went with the layout it explained');
      has(r.text, 'Probate estate, exempt property included (Fair Market Value): $6,300', m + ': the estate\'s subtotal counts the exempt sofa');
      has(r.text, 'Non-probate property, outside the probate estate (Fair Market Value): $14,000', m + ': the outside subtotal, by its track');
      // The Court Inventory beside it: the same claim, the same figure, the same words.
      const ci = page(C, 'printCourtInventory');
      has(ci.text, 'Total exempt property claimed: $900', m + ': the Court Inventory claims the same $900 in the same words');
      has(ci.text, 'Total tangible personal property (Fair Market Value): $6,300', m + ': …and its total is the Report\'s estate subtotal');
    });
    // The cap check prints on both papers alike.
    const big = ROWS().concat([LINE({ stableId: 'a5', itemNo: 5, objectName: 'Dining set', fmv: 21000, flagExempt: true })]);
    const C = rig(MATTERS.probate, big);
    ['printEstateInventoryReport', 'printCourtInventory'].forEach((f) => has(page(C, f).text, 'Exceeds the $20,000 §732.402 allowance', f + ': the cap check, the same words'));
    eq(callersOf('_invExemptClaimTotalHtml'), ['printCourtInventory', 'printEstateInventoryReport'], 'one block, two papers');
    // No probate estate, no partition (the trust-only and Neither matters): one Asset Schedule, as before.
    ['trust', 'neither'].forEach((m) => {
      const r = page(rig(MATTERS[m], ROWS()), 'printEstateInventoryReport');
      lacks(r.text, 'Exempt Property Claimed', m + ': no exempt subsection where there is no probate estate to claim against');
      lacks(r.text, 'outside the probate estate', m + ': …and nothing outside one');
      has(r.text, 'Total estimated fair market value: $20,300', m + ': every line on the one schedule, one total');
    });
    // Only exempt property, nothing outside: the exempt block and its subtotal, one total.
    const X = page(rig(MATTERS.probate, [ROWS()[0], ROWS()[1]]), 'printEstateInventoryReport');
    has(X.text, 'Exempt Property Claimed (Fla. Stat. §732.402)', 'only exempt property beside the estate\'s: its heading');
    has(X.text, 'Total estimated fair market value: $2,100', '…one total, no subtotals');
    lacks(X.text, 'outside the probate estate', '…and no outside block');
  }

  // ═══════════════════════════════ B · THE WORKLIST'S DATE AND ITS FACTS (DOC-07, VAL-24, DOC-20) ═══════════════════════════════
  group('⚠⚠ B1 · the Appraisal Worklist values as of the estate\'s day, the alternate date named, and a living client\'s states no death');
  {
    const est = page(rig(MATTERS.probate, ROWS()), 'printAppraisalWorklist');
    has(est.text, 'Items flagged for specialist appraisal · value as of the date of death (Jun 14, 2026) · prepared', 'an estate: the date of death, named as such');
    const avd = page(rig(Object.assign({}, MATTERS.probate, { avd: true }), ROWS()), 'printAppraisalWorklist');
    has(avd.text, 'value as of the alternate valuation date (Dec 14, 2026)', '⚠ the §2032 election: the alternate date, six months after death');
    lacks(avd.text, 'date of death', '…and never the date of death beside it');
    const liv = page(rig(MATTERS.living, ROWS()), 'printAppraisalWorklist');
    has(liv.text, 'Items flagged for specialist appraisal · value as of the appraiser’s inspection · prepared', '⚠⚠ a living client: the appraiser\'s inspection');
    lacks(liv.text, 'date of death', '…never a date of death');
    ['trust', 'both', 'neither', 'unanswered'].forEach((m) => has(page(rig(MATTERS[m], ROWS()), 'printAppraisalWorklist').text,
      'value as of the date of death (Jun 14, 2026)', m + ': the estate\'s own day'));
    eq(attempt(() => rig(MATTERS.living, []).invValueAsOfWords(MATTERS.living)).val, '', 'invValueAsOfWords answers nothing on living work');
    has(code(fn('printAppraisalWorklist')), 'invValueAsOfWords(job)', 'the worklist reads the one rule');
  }
  group('⚠⚠ B2 · the worklist states facts, never the desk\'s presses (it goes in every package)');
  {
    const FIRE = (o) => LINE(Object.assign({ stableId: 'f1', itemNo: 11, objectName: 'Remington 870 shotgun', category: 'Firearms', fmv: 450,
      disposition: 'Sell', channel: '', serial: '' }, o || {}));
    const dir = [{ vendor_name: 'Palm Beach Guns & Sport', category: 'Firearms Dealer (FFL)' }];
    const PRESSES = ['press Record approval', 'Record approval on Job Admin', 'select the firearm', 'Open the line', 'select the line', 'tick Needs Appraisal',
      'press ⚑ Appraise', 'Job Plan, In the house', 'From the Estimate Walkthrough', 'before you leave', 'not on your person'];
    [['probate', MATTERS.probate], ['trust', MATTERS.trust], ['living', MATTERS.living]].forEach(([m, job]) => {
      const C = rig(job, [FIRE(), FIRE({ stableId: 'f2', itemNo: 12, objectName: 'Browning shotgun', disposition: 'Distribute', channel: 'Marie Delgado' }),
        FIRE({ stableId: 'f3', itemNo: 13, objectName: 'Colt revolver', serial: 'C12345', channel: 'Palm Beach Guns & Sport', authBy: 'Ruth Adler', approvalDate: '2026-10-01',
          authFor: { disposition: 'Sell', channel: 'Palm Beach Guns & Sport', fmv: 450, dealer: 'Palm Beach Guns & Sport' } })], { dir });
      const w = page(C, 'printAppraisalWorklist');
      PRESSES.forEach((p) => lacks(w.text, p, m + ': ⚠ no "' + p + '" on the paper'));
      if (m !== 'living') {
        has(w.text, '#11 Remington 870 shotgun — No written authority on file yet.', m + ': the fact: no written authority yet');
        has(w.text, '#12 Browning shotgun — Going to a named person, through a licensed dealer who makes the transfer; the dealer route is not yet recorded.', m + ': …the route not yet recorded');
        has(w.text, 'Carried in a locked case, unloaded, never on the person, by the direct route, with an itemised receipt signed at the dealer’s counter.', m + ': how Havellin carries it, as a fact');
      }
      // The desk's own reason still says what to do (the row and the record read it).
      const fr = C._photoRefs[14][0];
      ok(/Record approval|Open the line|Who takes it/.test(attempt(() => C.invTransportReason(fr, job)).val || ''), m + ': the desk keeps its directions (invTransportReason)');
    });
    const E = page(rig(MATTERS.probate, [ROWS()[0]]), 'printAppraisalWorklist');
    has(E.text, 'Art, jewelry, silver and rugs are listed here on their category alone, and any other item once it is flagged for appraisal.', 'the empty list states what it lists');
    eq(callersOf('invTransportFact'), ['printAppraisalWorklist'], 'the paper reads the facts; the desk keeps invTransportReason');
    // The walkthrough's collections and vehicles, and the empty list: facts, never where to press.
    const wlCode = code(fn('printAppraisalWorklist'));
    ['Job Plan, In the house', 'From the Estimate Walkthrough', 'tick Needs Appraisal', 'Record approval', 'before you leave'].forEach((x) => lacks(wlCode, x, 'the worklist\'s source: no "' + x + '"'));
    has(wlCode, "listed here once photographed", 'a collection with no photograph: listed once photographed');
    has(code(fn('_renderInvWorkbar')), 'Per-specialist packet of every item flagged for a specialist', 'the living tooltip names what the worklist lists (VAL-24)');
  }

  // ═══════════════════════════════ C · TRUST-ONLY PAPERS SAY INVENTORY AND THE TRUST'S FOLDER (DOC-28) ═══════════════════════════════
  group('C1 · a trust-only matter\'s papers, files and package say Inventory and the trust\'s Drive folder');
  {
    const noFile = (o) => LINE(Object.assign({ stableId: 'n1', itemNo: 9, objectName: 'Lamp', fileId: '', driveFileId: '' }, o || {}));
    const T = rig(MATTERS.trust, ROWS().concat([noFile()]));
    const r = page(T, 'printEstateInventoryReport');
    has(r.text, 'Inventory — Asset Schedule', 'the Report is headed Inventory');
    lacks(r.text, 'Estate Inventory', '⚠ never Estate Inventory on a trust administration');
    has(r.text, 'did not reach the trust’s Drive folder', 'the trust\'s Drive folder');
    lacks(r.text, 'estate’s Drive folder', '…never the estate\'s');
    ok(/^Havellin Inventory - 210 Via Bellaria - /.test(r.title), 'its file is the Inventory (' + r.title + ')');
    eq(attempt(() => T.probatePackageTitle(MATTERS.trust, 'schedule')).val, 'Inventory Report', 'the package names it the Inventory Report');
    const cl = page(rig(Object.assign({}, MATTERS.trust, { docTier: 'contents' }), ROWS().concat([noFile({ status: 'failed' })])), 'printContentsList');
    has(cl.text, 'whose photograph has not reached the trust’s Drive folder', 'the Contents List on a trust: the trust\'s folder');
    lacks(cl.text, 'estate’s Drive folder', '…never the estate\'s');
    // The As-Found Record, from its own printer (it prints; the sandbox keeps the page).
    const AF = (j) => { const C = rig(j, ROWS().concat([{ stableId: 'b1', label: 'before', roomIdx: 0, ts: 5, status: 'uploaded', driveFileUrl: 'https://d/b1', filename: 'b1.jpg' }]));
      attempt(() => C.printAsFoundRecord(14, {})); return textOf(C.printed.join(' ')); };
    has(AF(MATTERS.trust), 'Every shot below links to its file in the trust’s Drive folder.', 'the As-Found Record on a trust: the trust\'s folder');
    has(AF(MATTERS.probate), 'Every shot below links to its file in the estate’s Drive folder.', '…on probate the estate\'s');
    has(AF(MATTERS.living), 'Every shot below links to its file in this job’s Drive folder.', '…on living work this job\'s');
    // The package's folder link on a trust: Inventory photographs; elsewhere Estate Inventory photographs.
    const folders = (j) => { let got = null; attempt(() => rig(j, [])._pkgShareFolders(j, ['ann@lowe.law'], (l) => { got = l; })); return (got || []).map((f) => f.label); };
    eq(folders(MATTERS.trust), ['As-Found Record photographs', 'Inventory photographs'], '⚠ the trust package\'s folder link: Inventory photographs');
    eq(folders(MATTERS.probate), ['As-Found Record photographs', 'Estate Inventory photographs'], '…the probate package keeps Estate Inventory photographs');
    // Every other matter keeps its words.
    ['probate', 'both', 'neither', 'unanswered'].forEach((m) => {
      const C = rig(MATTERS[m], ROWS().concat([noFile()]));
      const p = page(C, 'printEstateInventoryReport');
      has(p.text, 'Estate Inventory — Asset Schedule', m + ': Estate Inventory');
      has(p.text, 'the estate’s Drive folder', m + ': the estate\'s folder');
      eq(attempt(() => C.probatePackageTitle(MATTERS[m], 'schedule')).val, 'Estate Inventory Report', m + ': the Estate Inventory Report');
    });
    eq(attempt(() => rig(MATTERS.living, []).invDriveFolderWords(MATTERS.living)).val, 'this job’s Drive folder', 'living work: this job\'s folder');
  }

  // ═══════════════════════════════ D · THE COURT INVENTORY'S NAME, AND WHAT EACH ATTACHMENT IS FOR (DOC-17) ═══════════════════════════
  group('D1 · the Court Inventory is headed as it is filed, and the package email says what each attachment is for');
  {
    const C = rig(MATTERS.probate, ROWS());
    const ci = page(C, 'printCourtInventory');
    has(ci.text, 'Court Inventory (§733.604) — Tangible Personal Property', 'the Court Inventory carries its own name');
    lacks(ci.text, 'Estate Inventory — Tangible Personal Property', '…never "Estate Inventory" beside the Report\'s');
    const ctx = { job: MATTERS.probate, asOf: 'October 28, 2026', scope: '',
      attached: ['court', 'schedule', 'ledger', 'worklist'].map((k) => ({ key: k, title: C.probatePackageTitle(MATTERS.probate, k) })),
      inDrive: [], unshared: [] };
    const tx = attempt(() => C.buildProbatePackageEmailText(ctx)).val || '';
    has(tx, '  - Court Inventory — the estate’s tangible personal property, scheduled for the §733.604 inventory filing', 'the Court Inventory: for the filing');
    has(tx, '  - Estate Inventory Report — every item listed, with its value and where it is going, including any property outside the probate estate',
      'the Report: the whole register, the outside property included');
    has(tx, '  - Disposition Ledger — where each item went and what it brought', 'the ledger');
    has(tx, '  - Appraisal Worklist — the items flagged for a specialist’s appraisal, grouped by specialist', 'the worklist');
    const hx = textOf(attempt(() => C.buildProbatePackageEmailHtml(ctx)).val || '');
    has(hx, 'Court Inventory — the estate’s tangible personal property, scheduled for the §733.604 inventory filing', 'the html body says the same');
    // The plain email links each page from Drive with what it is for.
    const plain = Object.assign({}, ctx, { attached: [], inDrive: [{ label: 'Court Inventory', key: 'court', url: 'https://d/1' }, { label: 'Photographs', url: 'https://d/2' }] });
    has(attempt(() => C.buildProbatePackageEmailText(plain)).val || '', '  - Court Inventory (the estate’s tangible personal property, scheduled for the §733.604 inventory filing): https://d/1',
      'the plain email\'s link says what the page is for');
    has(attempt(() => C.buildProbatePackageEmailText(plain)).val || '', '  - Photographs: https://d/2', '…and a folder link reads as before');
    // On the trust route: the trust's words, the Report as the Inventory Report, nothing of an estate outside probate.
    const T = rig(MATTERS.trust, ROWS());
    const tctx = { job: MATTERS.trust, asOf: 'October 28, 2026', scope: '', inDrive: [], unshared: [],
      attached: ['trustee', 'schedule'].map((k) => ({ key: k, title: T.probatePackageTitle(MATTERS.trust, k) })) };
    const tt = attempt(() => T.buildProbatePackageEmailText(tctx)).val || '';
    has(tt, '  - Trust Schedule — the tangible personal property held in the trust, scheduled to support the trustee’s accounting', 'the Trust Schedule: for the accounting');
    has(tt, '  - Inventory Report — every item listed, with its value and where it is going\n', '⚠ the Inventory Report, and no probate estate on a trust');
  }

  // ═══════════════════════════════ E · AN APPRAISER'S FIRM ONCE (VAL-30) ═══════════════════════════════
  group('E1 · an appraiser picked from the directory with no contact prints the firm once, on every paper');
  {
    const A = { id: 77, name: 'Gulfstream Appraisal Group', firm: 'Gulfstream Appraisal Group', credential: 'ISA', independent: true };
    const job = Object.assign({}, MATTERS.living, { appraisers: [A] });
    const C = rig(job, [LINE({ stableId: 'g1', itemNo: 1, objectName: 'Oil portrait', category: 'Art & Décor', apprId: 77, fmv: 2600, valSource: 'Appraisal', valuedBy: 'appraiser' })]);
    eq(attempt(() => C._apprLabel(A)).val, 'Gulfstream Appraisal Group (ISA)', '⚠ the label names the firm once');
    eq(attempt(() => C._apprLabel({ name: 'Maria Ortiz', firm: 'Gulfstream Appraisal Group', credential: 'ASA' })).val, 'Maria Ortiz · Gulfstream Appraisal Group (ASA)', 'a named appraiser keeps the firm beside the name');
    eq(attempt(() => C._apprLabel({ name: 'gulfstream  appraisal group', firm: 'Gulfstream Appraisal Group' })).val, 'gulfstream  appraisal group', 'case and spacing aside');
    has(textOf(attempt(() => C.invAppraisalSourceText(C._photoRefs[14][0], 14)).val), 'Appraisal · Gulfstream Appraisal Group (ISA)', 'the line\'s source, once');
    const roster = textOf(attempt(() => C._renderAppraiserRoster(job)).val);
    has(roster, 'Gulfstream Appraisal Group ISA', 'the roster row');
    lacks(roster, 'Gulfstream Appraisal Group · Gulfstream Appraisal Group', '…never twice');
  }

  // ═══════════════════════════════ F · MORE ▾ OFFERS EACH INSTRUMENT ONLY WHERE THE MATTER HAS IT (EST-20) ═══════════════════════════
  group('⚠ F1 · the Court Inventory on the probate track, the Trust Schedule where a trust holds property, both while unanswered');
  {
    const want = { probate: [true, false], trust: [false, true], both: [true, true], neither: [false, false], unanswered: [true, true], living: [false, false] };
    Object.keys(want).forEach((m) => {
      const C = rig(MATTERS[m], ROWS());
      eq([attempt(() => C.invInstrumentOffered(MATTERS[m], 'court')).val, attempt(() => C.invInstrumentOffered(MATTERS[m], 'trustee')).val], want[m],
        m + ': Court Inventory, Trust Schedule');
    });
    // A Probate service whose matter is Trust is off the track: no Court Inventory; an unanswered Probate service is on it.
    const pt = Object.assign({}, MATTERS.probate, { matterType: 'trust' });
    eq(attempt(() => rig(pt, []).invInstrumentOffered(pt, 'court')).val, false, 'a Probate service on a trust matter: no Court Inventory');
    const cp = Object.assign({}, MATTERS.probate, { svc: 'contested_probate' });
    eq(attempt(() => rig(cp, []).invInstrumentOffered(cp, 'trustee')).val, false, '⚠ contested probate: no Trust Schedule (it printed "Held in Trust … no trust in it")');
    // The tier still decides first: a Contents-list estate is offered neither.
    const ct = Object.assign({}, MATTERS.both, { docTier: 'contents' });
    eq([attempt(() => rig(ct, []).invInstrumentOffered(ct, 'court')).val, attempt(() => rig(ct, []).invInstrumentOffered(ct, 'trustee')).val], [false, false],
      'a Contents-list estate: neither (the tier)');
    // The menu reads it, and says why both are there on an unanswered matter.
    const wb = code(fn('_renderInvWorkbar'));
    has(wb, "invInstrumentOffered(job, 'court') ? btn('printCourtInventory(", 'the menu offers the Court Inventory by the rule');
    has(wb, "invInstrumentOffered(job, 'trustee') ? btn('printTrustSchedule(", '…and the Trust Schedule');
    has(wb, 'INV_MATTER_UNSET_TXT', '…and names the unanswered matter under them');
    has(decl('INV_MATTER_UNSET_TXT'), "'Matter type not recorded: set it in Edit Client.'", 'in these words');
    eq(callersOf('invInstrumentOffered'), ['_renderInvWorkbar'], 'one reader: the menu');
    // The printers still refuse on their own face wherever another path reaches them.
    has(page(rig(MATTERS.trust, ROWS()), 'printCourtInventory').text, 'This estate is not being administered through probate.', 'the Court Inventory on a trust refuses on its face');
    has(page(rig(MATTERS.probate, ROWS()), 'printTrustSchedule').text, 'This estate has no trust in it.', 'the Trust Schedule on a probate refuses on its face');
    // An unanswered Estate Settlement's Court Inventory names what is not on the record.
    has(page(rig(MATTERS.unanswered, ROWS()), 'printCourtInventory').text,
      'No matter type is recorded on this job, so Havellin cannot confirm from the record that this estate is administered through probate',
      '⚠ an unanswered Estate Settlement: the Court Inventory says the matter is not recorded');
    lacks(page(rig(Object.assign({}, MATTERS.probate, { matterType: '' }), ROWS()), 'printCourtInventory').text, 'No matter type is recorded',
      '…an unanswered Probate service is on the track, and says nothing of it');
  }

  // ═══════════════════════════════ G · THE GUARDRAIL, THE VALUES BAR, THE ROSTER (VAL-25, VAL-24, NEW-14) ═══════════════════════════
  group('⚠ G1 · the guardrail says who arranges the appraisal: counsel on a Contents-list estate, the specialist on living work');
  {
    const art = (o) => LINE(Object.assign({ stableId: 'p1', itemNo: 1, objectName: 'Oil portrait', category: 'Art & Décor', fmv: '', valSource: '', valuedBy: undefined, needsAppr: true }, o || {}));
    const ct = Object.assign({}, MATTERS.probate, { docTier: 'contents', docLevel: 'formal' });
    const g = textOf(attempt(() => rig(ct, [art()])._renderAppraisalGuardrail(ct)).val);
    has(g, '1 item for the estate attorney to have appraised: on this engagement Havellin does not arrange appraisals.', '⚠ a Contents-list estate: counsel has it appraised');
    lacks(g, 'before this inventory is complete', '…never "before this inventory is complete"');
    const tr = Object.assign({}, MATTERS.trust, { docTier: 'contents' });
    has(textOf(attempt(() => rig(tr, [art()])._renderAppraisalGuardrail(tr)).val), '1 item for the trustee or their counsel to have appraised', 'a trust: the trustee or their counsel');
    const ne = Object.assign({}, MATTERS.neither, { docTier: 'contents' });
    // Restated 2026-11-02 (P14's review): on a decedent job *the Client* is the deceased, so Neither names the representative's title.
    has(textOf(attempt(() => rig(ne, [art()])._renderAppraisalGuardrail(ne)).val), '1 item for the Authorized Representative to have appraised', 'Neither: the representative, by title');
    const lv = Object.assign({}, MATTERS.living);
    const lg = textOf(attempt(() => rig(lv, [art()])._renderAppraisalGuardrail(lv)).val);
    has(lg, '1 item to go to a specialist has no appraisal figure yet.', 'living work: to a specialist');
    has(lg, 'or Waive.', '…its figure or Waive');
    lacks(lg, 'reasonable estimates on a standard job', '⚠ never the estate\'s advice on living work');
    // Where Havellin arranges it (the appraisals tier): as before, its grammar mended.
    const ap = Object.assign({}, MATTERS.probate, { docTier: 'appraisals', docLevel: 'formal' });
    const ag = textOf(attempt(() => rig(ap, [art()])._renderAppraisalGuardrail(ap)).val);
    has(ag, 'Formal documentation: 1 item needs an appraisal before this inventory is complete.', 'Havellin arranges it: the head as it was, "1 item needs"');
    has(textOf(attempt(() => rig(ap, [art(), art({ stableId: 'p2', itemNo: 2 })])._renderAppraisalGuardrail(ap)).val), '2 items need an appraisal', '…and two items need');
  }
  group('G2 · the living Values bar names one state one way, and its roster no date of death');
  {
    const art = LINE({ stableId: 'p1', itemNo: 1, objectName: 'Oil portrait', category: 'Art & Décor', fmv: '', valSource: '', valuedBy: undefined, needsAppr: true });
    const C = rig(MATTERS.living, [art]);
    const st = attempt(() => C.deskFoldState(14, MATTERS.living, 'values', C._photoRefs[14])).val || { bits: [] };
    has(st.bits.map((b) => b.text).join(' | '), '1 waiting on a specialist (1 with no specialist linked)', '⚠ living: the specialist\'s words, for what it counts (P14\'s review)');
    lacks(st.bits.map((b) => b.text).join(' | '), 'needs an appraisal', '…never "needs an appraisal" beside a "To a specialist" chip');
    const E = rig(MATTERS.probate, [Object.assign({}, art)]);
    has((attempt(() => E.deskFoldState(14, MATTERS.probate, 'values', E._photoRefs[14])).val || { bits: [] }).bits.map((b) => b.text).join(' | '),
      '1 needs an appraisal (1 with no appraiser linked)', 'an estate: as it was');
    const none = rig(MATTERS.living, []);
    has((attempt(() => none.deskFoldState(14, MATTERS.living, 'values', [])).val || { bits: [] }).bits.map((b) => b.text).join(' | '), '✓ none waiting on a specialist', 'living, nothing waiting');
    const lr = textOf(attempt(() => C._renderAppraiserRoster(MATTERS.living)).val);
    has(lr, 'an effective date (the value date — usually the day the appraiser inspects it)', '⚠ living: the day the appraiser inspects it');
    lacks(lr, 'date of death', '…never the date of death');
    has(textOf(attempt(() => E._renderAppraiserRoster(MATTERS.probate)).val), '(the value date — usually the date of death)', 'an estate keeps the date of death');
    has(attempt(() => C._apprFormCellsHtml(14)).val, 'title="Effective date of value: the value date — usually the day the appraiser inspects it"', 'the box\'s words follow the job');
    has(attempt(() => E._apprFormCellsHtml(14)).val, 'title="Effective date of value: the value date — usually the date of death"', '…on an estate too');
  }

  // ═══════════════════════════════ H · THE LIVING CSV AND RECORD (LIV-16) ═══════════════════════════════
  group('⚠ H1 · the living CSV carries no estate column, a promise is a promise, and captured-at is local time');
  {
    const L = rig(MATTERS.living, ROWS());
    const csv = inEastern(() => attempt(() => L.buildInventoryCSV(14)).val || '');
    const head = csv.split('\r\n')[0];
    ['Valuation Date', 'Valuation Source', 'Valuation Basis / Comps', 'MAIV §20.2031-6', 'MAIV Class', 'Exempt §732.402', 'Asset Track', 'Specific Bequest']
      .forEach((h) => lacks(head, h, 'living CSV: no "' + h + '" column'));
    has(head, 'Promised to someone', '…a promise to someone, as the desk says it');
    has(head, 'Job ID,Item #,Object Name,Category,Room,Captured At,', 'the rest as they were');
    eq(head.split(',').length, csv.split('\r\n')[1].split(',').length, 'every row as wide as its header');
    has(csv.split('\r\n')[1], ',2026-10-20 22:09,', '⚠ captured at 10:09 PM Eastern on the 20th, never 2026-10-21T02:09:17.287Z');
    lacks(csv, 'T02:09:17', '…no UTC stamp anywhere');
    const E = rig(MATTERS.probate, ROWS());
    const ecsv = inEastern(() => attempt(() => E.buildInventoryCSV(14)).val || '');
    ['Valuation Date', 'MAIV §20.2031-6', 'Exempt §732.402', 'Asset Track', 'Specific Bequest'].forEach((h) => has(ecsv.split('\r\n')[0], h, 'an estate\'s CSV keeps "' + h + '"'));
    has(ecsv.split('\r\n')[1], ',2026-10-20 22:09,', 'the estate\'s stamp in local time too');
    // The workbook is unchanged: every column, its stamp as sent.
    const pl = attempt(() => L.buildInventoryPayload(14)).val || { columns: [] };
    eq(pl.columns.length, 1 + (attempt(() => L.INVENTORY_COLUMNS).val || []).length, 'the workbook\'s payload keeps every column');
  }
  group('H2 · the living line\'s record: Flags, Promised to someone, and who approved it only where it says something');
  {
    const L = rig(MATTERS.living, ROWS());
    const plain = textOf(attempt(() => L._renderInvPanel(MATTERS.living, L._photoRefs[14][0])).val);
    has(plain, 'Promised to someone', 'living: the promise, in the desk\'s words');
    lacks(plain, 'Specific Bequest', '…never a bequest');
    has(plain, ' Flags ', 'the section is Flags');
    lacks(plain, 'Flags & Track', '…with no track on living work');
    lacks(plain, 'Authorized By', '⚠ an everyday line the client approves by word: no Authorized By');
    lacks(plain, 'Approval Date', '…and no Approval Date');
    const fire = LINE({ stableId: 'w1', objectName: 'Remington 870 shotgun', category: 'Firearms', disposition: 'Sell', channel: '' });
    const F = rig(MATTERS.living, [fire]);
    const fp = textOf(attempt(() => F._renderInvPanel(MATTERS.living, F._photoRefs[14][0])).val);
    has(fp, 'Authorized By', 'a living firearm, which needs the client\'s written approval: shown');
    const signed = LINE({ stableId: 'w2', authBy: 'Robert Hale', approvalDate: '2026-10-01', disposition: 'Keep' });
    const S = rig(MATTERS.living, [signed]);
    has(textOf(attempt(() => S._renderInvPanel(MATTERS.living, S._photoRefs[14][0])).val), 'Approval Date', 'a recorded approval is never hidden');
    const E = rig(MATTERS.probate, ROWS());
    const ep = textOf(attempt(() => E._renderInvPanel(MATTERS.probate, E._photoRefs[14][0])).val);
    ['Specific Bequest', 'Flags & Track', 'Authorized By', 'Approval Date'].forEach((h) => has(ep, h, 'an estate\'s record keeps "' + h + '"'));
  }

  // ═══════════════════════════════ I · THE PAPER OUTSIDE THE APP ═══════════════════════════════
  // ═══════════════════════════════ J · P14'S REVIEW (2026-11-02) ═══════════════════════════════
  group('⚠⚠ J1 · the exempt subtotal is a floor on both papers: an unvalued exempt line is named and the §732.402 cap is not passed in silence');
  {
    const bed = LINE({ stableId: 'a9', itemNo: 9, objectName: 'Bedroom set', fmv: '', valSource: '', valuedBy: undefined, flagExempt: true });
    const C = rig(MATTERS.probate, ROWS().concat([bed]));
    ['printEstateInventoryReport', 'printCourtInventory'].forEach((f) => {
      const t = page(C, f).text;
      has(t, 'Total exempt property claimed, recorded so far — not a complete total: $900', f + ': ⚠⚠ the exempt subtotal reads as a floor');
      lacks(t, 'Total exempt property claimed: $900', f + ': …never as the complete claim');
      has(t, '1 item claimed exempt is recorded without a value and NOT included above: #9 Bedroom set.', f + ': the unvalued exempt line is named under it');
      has(t, 'The $20,000 §732.402 allowance cannot be tested until it is valued.', f + ': ⚠ the cap is said to be untestable, not passed');
    });
    // $19,500 recorded and a bedroom set unvalued: the cap cannot be tested, and the page says so.
    const near = rig(MATTERS.probate, [LINE({ stableId: 'b1', itemNo: 1, objectName: 'Dining set', fmv: 19500, flagExempt: true }),
      LINE({ stableId: 'b2', itemNo: 2, objectName: 'Bedroom set', fmv: '', valSource: '', valuedBy: undefined, flagExempt: true })]);
    ['printEstateInventoryReport', 'printCourtInventory'].forEach((f) => {
      const t = page(near, f).text;
      has(t, 'Total exempt property claimed, recorded so far — not a complete total: $19,500', f + ': $19,500 so far');
      has(t, 'cannot be tested until it is valued', f + ': ⚠⚠ under the cap on what is recorded, the test cannot be made, and the page says so');
      lacks(t, 'Exceeds the $20,000', f + ': …and claims no excess');
    });
    // Over the cap on the recorded figures alone: the excess stands whatever the rest are worth, and nothing calls it untestable.
    const over = rig(MATTERS.probate, [LINE({ stableId: 'c1', itemNo: 1, objectName: 'Dining set', fmv: 21000, flagExempt: true }),
      LINE({ stableId: 'c2', itemNo: 2, objectName: 'Bedroom set', fmv: '', valSource: '', valuedBy: undefined, flagExempt: true })]);
    ['printEstateInventoryReport', 'printCourtInventory'].forEach((f) => {
      const t = page(over, f).text;
      has(t, 'Exceeds the $20,000 §732.402 allowance for household furniture, furnishings and appliances on the recorded figures alone', f + ': over on what is recorded');
      lacks(t, 'cannot be tested', f + ': …and never untestable once passed');
    });
    // Every exempt line valued: the claim as P14 built it.
    has(page(rig(MATTERS.probate, ROWS()), 'printCourtInventory').text, 'Total exempt property claimed: $900', 'every exempt line valued: the complete claim, as before');
    has(code(fn('printEstateInventoryReport')), '_invExemptClaimTotalHtml(invTotalFloor(exempt))', 'the Report hands the floor in, never its bare total');
    lacks(code(fn('printCourtInventory')), '_invExemptClaimTotalHtml(exemptSec.total)', 'the Court Inventory too');
  }
  group('⚠ J2 · the worklist\'s grouped-lot block states the rule and the lots, never the desk\'s fix or its shorthand');
  {
    const lots = [LINE({ stableId: 'l1', itemNo: 21, objectName: 'Sterling flatware service', category: 'Silver', qty: 60, fmv: 9000, needsAppr: true }),
      LINE({ stableId: 'l2', itemNo: 22, objectName: 'Cut crystal stemware', category: 'General/Household', qty: 12, fmv: 2400 })];
    ['probate', 'trust'].forEach((m) => {
      const t = page(rig(MATTERS[m], lots), 'printAppraisalWorklist').text;
      has(t, 'Grouped lots — Treas. Reg. §20.2031-6(a)', m + ': fixture: a Form 706 estate draws the lot block');
      has(t, '2 grouped lots list more than one article under a single value.', m + ': the lots, in the reader\'s words');
      has(t, 'As listed, these lots do not meet that rule: each article is to be named on its own before the return is prepared', m + ': the rule and how they stand');
      ['manifest', 'record on the line', 'Split these lots', 'Split this lot', 'grouped line'].forEach((x) => lacks(t, x, m + ': ⚠ no "' + x + '" on the paper'));
    });
    // The source net reaches the blocks the worklist draws through, not only its own text (the review: B2 read the printer alone).
    ['_lotSplitWorklistBlock', '_maivWorklistBlock'].forEach((f) => {
      const t = code(fn(f));
      ['record on the line', 'on this manifest', 'press ', 'Job Admin', 'tick '].forEach((x) => lacks(t, x, f + ': no "' + x + '" in its words'));
    });
  }
  group('⚠ J3 · a living client\'s worklist names no estate and no personal representative, its NFA block and its transport line included');
  {
    const rows = [LINE({ stableId: 'n1', itemNo: 4, objectName: 'Thompson submachine gun', category: 'Firearms', flagNFA: true, disposition: 'Sell', fmv: 20000 }),
      LINE({ stableId: 'n2', itemNo: 1, objectName: 'Sterling flatware service', category: 'Silver', qty: 60, fmv: 9000, needsAppr: true })];
    const L = rig(MATTERS.living, rows);
    const t = page(L, 'printAppraisalWorklist').text;
    has(t, 'Appraisal Worklist', 'fixture: the living worklist rendered');
    has(t, 'value as of the appraiser’s inspection', '…as a living paper');
    has(t, 'NFA item', '…with its NFA block');
    has(t, 'A registered item transfers from the client to the dealer on ATF paperwork, and no written authority makes it lawful for Havellin to carry one.', '⚠ the client\'s transfer, in the block');
    has(t, 'NFA item — never transported by Havellin. It transfers from the client to the dealer on ATF paperwork.', '⚠ …and on the transport line');
    ['estate', 'personal representative', 'Personal Representative', 'carve-out'].forEach((x) => lacks(t, x, '⚠⚠ a living worklist: no "' + x + '"'));
    const E = rig(MATTERS.probate, rows);
    const et = page(E, 'printAppraisalWorklist').text;
    has(et, 'the estate carve-out names the personal representative', 'an estate keeps its NFA block');
    has(et, 'It transfers from the estate to the dealer on ATF paperwork.', '…and its transport line');
    const gun = L._photoRefs[14][0];
    has(attempt(() => L.invTransportReason(gun, MATTERS.living)).val || '', 'from the client to the dealer', 'the desk\'s reason on living work, the same words');
    has(attempt(() => E.invTransportReason(E._photoRefs[14][0], MATTERS.probate)).val || '', 'from the estate to the dealer', '…and on an estate');
    has(attempt(() => L.invTransportReason(gun)).val || '', 'from the estate to the dealer', 'with no job handed in, the words as before');
  }
  group('⚠ J4 · the guardrail claims nobody arranges an appraisal only once the estimate is read, and names the representative on Neither');
  {
    const art = (o) => LINE(Object.assign({ stableId: 'p1', itemNo: 1, objectName: 'Oil portrait', category: 'Art & Décor', fmv: '', valSource: '', valuedBy: undefined, needsAppr: true }, o || {}));
    const job = Object.assign({}, MATTERS.probate, { docTier: 'values', docLevel: 'formal' });
    // Unread: no approved estimate on the device and the store not read.
    const cold = rig(job, [art()], { estStore: 'loading' });
    const ct = textOf(attempt(() => cold._renderAppraisalGuardrail(job)).val);
    has(ct, '1 item needs an appraisal before this inventory is complete', 'fixture: the guardrail drew');
    lacks(ct, 'does not arrange appraisals', '⚠⚠ an unread store never says Havellin arranges none');
    has(ct, 'Who arranges the appraisal is read off the approved estimate, which has not loaded on this device yet.', '…and says why it cannot say who does');
    const off = rig(job, [art()], { estStore: 'offline' });
    lacks(textOf(attempt(() => off._renderAppraisalGuardrail(job)).val), 'does not arrange appraisals', 'offline: the same');
    // Read: the counsel head.
    has(textOf(attempt(() => rig(job, [art()])._renderAppraisalGuardrail(job)).val), '1 item for the estate attorney to have appraised: on this engagement Havellin does not arrange appraisals.',
      'the store read, no appraiser on an approved estimate: counsel arranges it');
    // An approved estimate listing an appraiser, with the store still marked unread: the estimate decides.
    const listed = rig(job, [art()], { estStore: 'loading' });
    listed.estimateStore[14] = { approved: true, estimate: { svc: 'probate', vendors: [{ type: 'Appraiser — fine art', name: 'Kodner', cost: 1500 }], rooms: [] } };
    eq(attempt(() => listed.jobAppraisalDuty(job)).val, 'listed', 'fixture: the approved estimate lists an appraiser');
    const lt = textOf(attempt(() => listed._renderAppraisalGuardrail(job)).val);
    has(lt, '1 item needs an appraisal before this inventory is complete', 'an approved estimate here: the estate head');
    lacks(lt, 'has not loaded on this device yet', '…with nothing said of an unread store');
    // Neither: the representative by title, never "the client" (on a decedent job, the deceased).
    const ne = Object.assign({}, MATTERS.neither, { docTier: 'contents', docLevel: 'formal' });
    const nt = textOf(attempt(() => rig(ne, [art()])._renderAppraisalGuardrail(ne)).val);
    has(nt, '1 item for the Authorized Representative to have appraised', '⚠ Neither: the Authorized Representative');
    lacks(nt, 'for the client to have', '…never the client');
    // Living work is never asked about the estimate.
    lacks(textOf(attempt(() => rig(MATTERS.living, [art()], { estStore: 'loading' })._renderAppraisalGuardrail(MATTERS.living)).val), 'has not loaded', 'living work: no estimate sentence');
  }
  group('⚠ J5 · on a living desk the Values bar says what it counts, beside a chip that counts something else');
  {
    const A = { id: 77, name: 'Maria Ortiz', firm: 'Gulfstream Appraisal Group', credential: 'ASA', independent: true };
    const job = Object.assign({}, MATTERS.living, { appraisers: [A] });
    const C = rig(job, [LINE({ stableId: 'g1', itemNo: 1, objectName: 'Oil portrait', category: 'Art & Décor', needsAppr: true, apprId: 77, fmv: 2600, valSource: 'Appraisal', valuedBy: 'appraiser' })]);
    const r = C._photoRefs[14][0];
    eq(attempt(() => C.invNeedsAppraisal(r, job)).val, true, 'fixture: the To a specialist chip counts the appraised line');
    eq(attempt(() => C.invAwaitingAppraisal(r, 14)).val, false, 'fixture: …and it waits on nobody');
    const line = ((attempt(() => C.deskFoldState(14, job, 'values', C._photoRefs[14])).val || { bits: [] }).bits).map((b) => b.text).join(' | ');
    has(line, '✓ none waiting on a specialist', '⚠ the bar: none waiting, what it counts');
    lacks(line, 'nothing to a specialist', '⚠⚠ never "nothing to a specialist" beside a chip counting one');
  }
  group('⚠⚠ J6 · an unanswered Estate Settlement\'s Court Inventory over lines nobody tracked is a draft, never adopted');
  {
    // The sideboard, the sofa and the car (the painting waits on its appraisal, a draft of its own on a Formal estate).
    const plain = ROWS().slice(0, 3);
    const t = page(rig(MATTERS.unanswered, plain), 'printCourtInventory').text;
    has(t, 'DRAFT', 'the page is a draft');
    has(t, 'the matter type is not recorded', '…naming why');
    lacks(t, 'Reviewed and adopted by', '⚠ …with no adoption line');
    has(t, 'each item is on the probate estate by default, until a matter type or an asset track says otherwise', 'the note says the lines are there by default');
    has(t, 'a final copy follows once the estate is recorded as administered through probate', 'and what a final copy waits on, as a fact');
    lacks(t, 'Edit Client', '…never the desk\'s press');
    // Every line on it tracked to probate by a person: somebody put it there, so the page is P14's.
    const tracked = ROWS().slice(0, 3).map((r) => Object.assign({}, r, { assetTrack: r.assetTrack || 'Probate' }));
    const tt = page(rig(MATTERS.unanswered, tracked), 'printCourtInventory').text;
    has(tt, 'FINAL', 'every line tracked Probate by a person: FINAL, as P14 built it');
    has(tt, 'listed because it is tracked to the probate estate', '…and the note says so');
    has(tt, 'Reviewed and adopted by', '…with its adoption line');
    // The probate answer is never touched.
    const pt = page(rig(MATTERS.probate, plain), 'printCourtInventory').text;
    has(pt, 'FINAL', 'a probate matter over untracked lines: FINAL');
    lacks(pt, 'the matter type is not recorded', '…and no such reason');
  }
  group('⚠ J7 · off the probate track the papers name no court filing: the Contents List\'s valuer and the Trust Schedule\'s carve-out');
  {
    const ct = (m) => Object.assign({}, MATTERS[m], { docTier: 'contents' });
    const tr = page(rig(ct('trust'), ROWS()), 'printContentsList').text;
    has(tr, 'Valuation of the property is the responsibility of the trustee or their counsel, who receive this list for that purpose.', '⚠ a Contents-tier trust: the trustee or their counsel');
    lacks(tr, 'court filing', '…and no court filing');
    lacks(tr, 'estate attorney', '…and no estate attorney');
    const ne = page(rig(ct('neither'), ROWS()), 'printContentsList').text;
    has(ne, 'Valuation of the property is the responsibility of the Authorized Representative and their counsel', '⚠ Neither: the representative and their counsel');
    lacks(ne, 'court filing', '…and no court filing');
    has(page(rig(ct('probate'), ROWS()), 'printContentsList').text, 'Valuation of the property and the court filing are the responsibility of the Client and the estate attorney',
      'the probate track keeps its words');
    lacks(page(rig(ct('unanswered'), ROWS()), 'printContentsList').text, 'court filing', 'an unanswered Estate Settlement, off the track: no court filing');
    has(page(rig(Object.assign({}, MATTERS.trust, { docTier: 'values' }), ROWS()), 'printContentsList').text, 'stated separately on the Inventory — Asset Schedule',
      'a valued trust\'s Contents List points at the Inventory by its own name');
    // The Trust Schedule names a §733.604 inventory only beside one.
    const tline = [LINE({ stableId: 't1', itemNo: 1, objectName: 'Walnut sideboard', fmv: 1200, assetTrack: 'Trust' }),
      LINE({ stableId: 't2', itemNo: 2, objectName: 'Household sofa', fmv: 900, assetTrack: 'Probate' })];
    const ts = page(rig(MATTERS.trust, tline), 'printTrustSchedule').text;
    has(ts, 'is excluded from this schedule.', 'fixture: a trust-only matter with a line tracked Probate');
    lacks(ts, '§733.604', '⚠ a trust-only matter: no §733.604 inventory named');
    has(page(rig(MATTERS.both, tline), 'printTrustSchedule').text, 'Probate and exempt property is reported on the estate’s §733.604 inventory', 'Both: the estate\'s inventory is named');
  }
  group('J8 · the package email claims no photograph the app did not witness');
  {
    const C = rig(MATTERS.probate, ROWS());
    ['schedule', 'contents'].forEach((k) => {
      const w = attempt(() => C.probatePackageDocPurpose(MATTERS.probate, k)).val || '';
      ok(/^every item listed/.test(w), k + ': fixture: its purpose');
      lacks(w, 'photographed', '⚠ ' + k + ': never "every item photographed"');
    });
  }

  group('I · the four documents say what changed, and the counsel bundle carries the heading as drafted');
  {
    const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    [['manual.html', read('manual.html')], ['MANUAL.md', read('MANUAL.md')]].forEach(([f, t]) => {
      has(t, 'Exempt Property Claimed', f + ': exempt property claimed inside the estate on the Report');
      ok(!/exempt, homestead, non-probate and trust-tracked property is carved out/.test(t), f + ': ⚠ never that exempt property is carved out with the property outside the estate');
      has(t, 'Court Inventory (§733.604)', f + ': the Court Inventory\'s own name');
      has(t, 'the appraiser’s inspection', f + ': the living worklist\'s value date');
      has(t, 'Matter type not recorded', f + ': More ▾ by the matter');
      has(t, 'Promised to someone', f + ': the living CSV and record');
      // P14's review (2026-11-02).
      has(t, 'Total exempt property claimed, recorded so far', f + ': the exempt subtotal a floor');
      has(t, 'N waiting on a specialist', f + ': the living Values bar says what it counts');
      has(t, 'the matter type is not recorded', f + ': an unanswered Estate Settlement\'s Court Inventory a draft');
      has(t, 'which has not loaded on this device yet', f + ': the guardrail on an unread estimate');
      has(t, f.endsWith('.html') ? '<em>the trustee or their counsel</em> on a trust' : '*the trustee or their counsel* on a trust', f + ': the Contents List\'s valuer by the matter');
    });
    [['concierge-guide.html', read('concierge-guide.html')], ['CONCIERGE_GUIDE.md', read('CONCIERGE_GUIDE.md')]].forEach(([f, t]) => {
      has(t, 'Matter type not recorded', f + ': More ▾ by the matter');
      has(t, 'what each attachment is for', f + ': the package email');
      has(t, 'waiting on a specialist', f + ': the living Values bar (P14\'s review)');
      has(t, 'the matter type is not recorded', f + ': the unanswered Court Inventory a draft (P14\'s review)');
    });
    const bundle = read('COUNSEL_REVIEW_BUNDLE.md');
    has(bundle, 'Exempt Property Claimed (Fla. Stat. §732.402)', '⚠ the heading is in the bundle, as drafted');
    has(bundle, 'The $20,000 §732.402 allowance cannot be tested until it is valued.', 'the review\'s floor words are in the bundle');
    has(bundle, 'no written authority makes it lawful for Havellin to carry one', '…and the living NFA sentence');
  }
};
