'use strict';
// ─────────────────────────────────────────────────────────────────
// P25 GROUP 3 · THE DESK (2026-10-09). Anthony's answers to the job-flow audit's questions, each driven through the real code:
//
//   Q39 Proceeds are typed once: a lot-by-lot table in the statement dialog, pre-ticked with that vendor's lines, writes
//       each lot's gross and fees onto its line; the to-the-cent reconciliation stays.
//   Q46 The release request lists every leaving line; one initial per destination group under $500; a line's own initial at
//       $500 and over, on a bequest, or on anything carrying a caution.
//   Q48 The close asks a rating of every directory vendor a leaving line names, or a filed pickup list names, as well as
//       those confirmed on the Job Plan.
//   Q50 Condition is set across a selection on the desk's bulk bar; a line with none prints "as photographed".
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
    won: true, status: 'active' }, o || {});
  const L = (id, o) => Object.assign({ stableId: id, label: 'inventory', itemNo: 1, objectName: 'Item ' + id, category: 'Furniture', authBy: '', approvalDate: '' }, o || {});

  // ═══ Q46 · ONE INITIAL PER DESTINATION GROUP UNDER $500 ═══
  group('Q46 · every leaving line listed; a group initial under $500; a line\'s own at $500 and over, on a bequest, or with a caution');
  {
    const lines = [
      L('a', { itemNo: 1, objectName: 'Paperback books', fmv: '20', disposition: 'Donate', channel: 'Goodwill' }),
      L('b', { itemNo: 2, objectName: 'Lamp', fmv: '60', disposition: 'Donate', channel: 'Goodwill' }),
      L('c', { itemNo: 3, objectName: 'Oil painting', category: 'Art & Décor', fmv: '2400', disposition: 'Auction', channel: 'Christie\'s', needsAppr: true }),
      L('d', { itemNo: 4, objectName: 'Old mattress', fmv: '0', disposition: 'Junk', channel: 'Haul-It' }),
      L('e', { itemNo: 5, objectName: 'Desk', fmv: '300', disposition: 'Donate', channel: 'Goodwill', flagDisputed: true }),
      L('f', { itemNo: 6, objectName: 'Pearl necklace', category: 'Jewelry', fmv: '450', disposition: 'Distribute', channel: 'Marie Doe', flagBequest: true })];
    const R = lift(['printApprovalRequest'], STATE.concat(['_printDocument', '_invPrintThumb', '_invPick', '_invFilter']),
      Object.assign(BASE(), { jobs: [PROBATE()], _photoRefs: { 7: lines.map((x) => Object.assign({}, x)) }, _invPrintThumb: () => '', _invPick: {},
        _invFilter: { when: 'all', room: '', q: '', flag: '' }, estimateStore: { 7: { estimate: { rooms: [] } } } }));
    const r = attempt(() => R.printApprovalRequest(7, false));
    ok(r.ok, 'the request prints (' + (r.err || 'ok') + ')');
    const html = String(R.__printed || ''), t = textOf(html);
    ['Paperback books', 'Lamp', 'Oil painting', 'Old mattress', 'Desk', 'Pearl necklace'].forEach((n) => has(t, n, n + ' is listed'));
    has(t, 'Initial once for the 2 items above going to Goodwill (Donate), each under $500', '⚠⚠ the two plain Goodwill lines share one initial');
    has(t, 'Initial once for the item above going to Haul-It (Disposed of), each under $500', 'the mattress, its own destination, one initial');
    eq(count(html, 'initialled with its group'), 3, 'three lines are initialled with their group');
    eq(count(html, 'class="inv-grp-row"'), 2, 'and two group initial lines');
    const S = lift(['invOwnInitial'], STATE, Object.assign(BASE(), { jobs: [PROBATE()], _photoRefs: { 7: lines } }));
    const own = (i) => attempt(() => S.invOwnInitial(lines[i], PROBATE())).val;
    eq([own(0), own(1), own(2), own(3), own(4), own(5)], [false, false, true, false, true, true],
      '⚠⚠ its own initial: the $2,400 painting, the disputed desk (a caution), the bequeathed necklace; not the paperbacks, lamp or mattress');
    eq(S.INV_LINE_INITIAL_MIN, 500, 'the agreement\'s $500');
    eq(attempt(() => S.invOwnInitial(L('x', { fmv: '500', disposition: 'Sell', channel: 'Kodner' }), PROBATE())).val, true, '$500 itself is its own initial');
    // A line matched to a bequest and going to its own beneficiary carries no caution (the bequest is being carried out), and
    // is still initialled on its own: the bequest arm, not the caution, decides it.
    const bqJob = PROBATE({ beneficiaries: [{ id: 'bn1', name: 'Marie Doe' }], bequests: [{ id: 'bq1', beneficiaryId: 'bn1', description: 'my pearls', stableIds: ['g'] }] });
    const pearls = L('g', { itemNo: 7, objectName: 'Pearl earrings', category: 'Jewelry', fmv: '120', disposition: 'Distribute', channel: 'Marie Doe', flagBequest: true });
    const SB = lift(['invOwnInitial', 'invReleaseCautions'], STATE, Object.assign(BASE(), { jobs: [bqJob], _photoRefs: { 7: [pearls] } }));
    eq(attempt(() => SB.invReleaseCautions(pearls, 7).length).val, 0, 'fixture: a bequest carried out raises no caution');
    eq(attempt(() => SB.invOwnInitial(pearls, bqJob)).val, true, '⚠ and is still initialled on its own, as a bequest');
    // Grouped: Goodwill's lines run together whatever order they were found in.
    const order = ['Paperback books', 'Lamp', 'Desk'].map((n) => t.indexOf(n));
    ok(order[0] < order[1] && order[1] < order[2] && t.indexOf('Oil painting') > order[2] || t.indexOf('Oil painting') < order[0], 'a destination\'s lines run together');
  }

  // ═══ Q48 · EVERY VENDOR A LINE NAMES IS RATED AT CLOSE ═══
  group('Q48 · the close asks a rating of every directory vendor named on a leaving line or a filed pickup list');
  {
    const dir = [{ _row: 11, vendor_name: 'Christie\'s' }, { _row: 12, vendor_name: 'Goodwill Palm Beach' }, { _row: 13, vendor_name: 'Haul-It' }, { _row: 14, vendor_name: 'Kodner Galleries' }];
    const refs = [L('a', { disposition: 'Auction', channel: 'christie\'s ' }), L('b', { disposition: 'Donate', channel: 'Goodwill Palm Beach' }),
      L('c', { disposition: 'Distribute', channel: 'Haul-It' }), L('d', { disposition: 'Keep', channel: 'Kodner Galleries' }),
      L('e', { disposition: 'Sell', channel: 'A neighbour' }), L('f', { disposition: 'Junk', channel: 'Haul-It', deletedAt: 5 })];
    const job = LIVING({ signedRecords: [{ id: 'p1', kind: 'pickup', ref: 'Kodner Galleries', filedAt: 1 }],
      vendorSourcing: { La: { vendorId: 20, vendorName: 'Ace Painting', status: 'Confirmed' } } });
    const V = lift(['unratedVendorsForJob', 'jobCloseBlockers'], STATE.concat(['vendorDirectory']), Object.assign(BASE(), { jobs: [job], _photoRefs: { 7: refs }, vendorDirectory: dir }));
    const names = (attempt(() => V.unratedVendorsForJob(job)).val || []).map((v) => v.name);
    eq(names, ['Ace Painting', 'Christie\'s', 'Goodwill Palm Beach', 'Kodner Galleries'],
      '⚠⚠ the Job Plan\'s vendor, the auction house and the charity named on lines, and the vendor on a filed pickup list');
    lacks(names.join(' '), 'Haul-It', 'not a vendor on a line going to a person, nor on a removed line');
    lacks(names.join(' '), 'neighbour', 'and a name the directory does not hold is nobody to rate');
    has((V.jobCloseBlockers(job) || [])[0] || '', '4 not yet rated', 'the close names all four');
    job.vendorRatings = { 11: { rating: 4 }, 12: { rating: 5 }, 14: { rating: 3 }, 20: { rating: 5 } };
    eq(V.jobCloseBlockers(job), [], 'rated, the close goes');
    job.signedRecords[0].voidedAt = 9; job.vendorRatings = {};
    lacks((attempt(() => V.unratedVendorsForJob(job)).val || []).map((v) => v.name).join(' '), 'Kodner', 'a voided pickup list names nobody');
  }

  // ═══ Q50 · CONDITION ═══
  group('Q50 · condition across a selection on the bulk bar; a blank prints "as photographed" on every document');
  {
    const C = lift(['invConditionText'], STATE, BASE());
    eq([C.invConditionText({ condition: 'Good' }), C.invConditionText({ condition: '' }), C.invConditionText({})], ['Good', 'as photographed', 'as photographed'], 'the one reader');
    ['printEstateInventoryReport', 'invReceiptHtml', '_invScheduleSection', 'printDonationRecord', 'printAppraisalWorklist', 'printContentsList'].forEach((f) => {
      has(fn(f), 'invConditionText(r)', f + ' prints it');
      lacks(codeOnly(fn(f)), "r.condition ||", f + ' never prints its own fallback');
    });
    const picked = [L('a'), L('b'), L('c', { condition: 'Poor' })];
    const B = lift(['_invBulkApply'], STATE.concat(['_invPicked', 'savePhotoRefs', '_scheduleInventorySync', 'showSyncBadge', 'renderInventoryTab', '_invMatchesFilter']),
      Object.assign(BASE(), { jobs: [LIVING()], _photoRefs: { 7: picked }, _invPicked: () => picked, savePhotoRefs() {}, _scheduleInventorySync() {},
        showSyncBadge() {}, renderInventoryTab() {}, _invMatchesFilter: () => true }));
    attempt(() => B._invBulkApply(7, 'condition', 'Good'));
    eq(picked.map((r) => r.condition), ['Good', 'Good', 'Good'], '⚠⚠ Good across the selection (the exceptions are set on their rows after)');
    has(String((B._invBulkLast || {}).msg || ''), 'Condition set to Good on 3 items', 'and it says so');
    const BB = lift(['_renderInvBulk'], STATE.concat(['_invPicked', '_invBulkLast']), Object.assign(BASE(), { jobs: [LIVING()], _photoRefs: { 7: picked },
      _invPicked: () => picked, _invBulkLast: null, estimateStore: { 7: { estimate: { rooms: [] } } } }));
    const bar = attempt(() => BB._renderInvBulk(LIVING())).val || '';
    has(bar, 'onchange="_invBulkApply(7,\'condition\',this.value)"', '⚠ the bulk bar offers Set condition…');
    has(bar, '>Set condition…</option>', 'under its own placeholder');
  }

  // ═══ Q39 · PROCEEDS TYPED ONCE ═══
  group('Q39 · the statement dialog: lot by lot, pre-ticked with the vendor\'s lines, the lots written onto the lines; the reconciliation stays');
  {
    const refs = [L('a', { itemNo: 1, objectName: 'Clock', disposition: 'Auction', channel: 'Kodner Galleries' }),
      L('b', { itemNo: 2, objectName: 'Rug', disposition: 'Auction', channel: 'Kodner Galleries', gross: 300, fees: 60 }),
      L('c', { itemNo: 3, objectName: 'Chair', disposition: 'Consign', channel: 'The Consignment Store' })];
    const job = LIVING({ proceedsStatements: [] });
    const dom = domStub({});
    const P = lift(['openProceedsStatement', 'psTickVendor', 'psLotsSum', 'saveProceedsStatement'],
      STATE.concat(['savePhotoRefs', '_scheduleInventorySync', 'showSyncBadge', 'renderInventoryTab']),
      Object.assign(BASE(), { jobs: [job], _photoRefs: { 7: refs }, document: dom, savePhotoRefs() {}, _scheduleInventorySync() {}, showSyncBadge() {}, renderInventoryTab() {} }));
    ok(attempt(() => P.openProceedsStatement(7)).val === true, 'the dialog opens');
    const linesHtml = dom.getElementById('ps-lines').innerHTML;
    eq(count(linesHtml, 'class="ps-lot-g"'), 3, '⚠⚠ a gross box on every sold line');
    eq(count(linesHtml, 'class="ps-lot-f"'), 3, 'and a fees box');
    has(linesHtml, 'value="300"', 'a lot already recorded opens with its figure');
    has(fn('psTickVendor'), "c.getAttribute('data-ch') === want && !c.getAttribute('data-on')", 'typing the vendor ticks its lines not already on a statement');
    has(fn('saveProceedsStatement'), 'r.gross = roundCents(l.gross)', 'and saving writes each lot\'s gross onto its line');
    has(fn('saveProceedsStatement'), 'r.fees = roundCents(l.fees)', 'and its fees');
    has(fn('proceedsReconciliation'), "if (differs(sg, lg)) flags.push", 'the statement is still checked against its lots to the cent');
  }

  process.env.TZ = prevTZ;
};
