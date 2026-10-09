'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P25 GROUP 1 · THE PAPERS AND THE MONEY (2026-10-09). Anthony's answers to the job-flow audit's questions, each driven
// through the real code:
//
//   Q33 Exhibit A delivers the inventory to the estate attorney in time for the §733.604 filing (counsel serves and files),
//       names the representatives together where co-representatives are recorded, and Build Estimate flags a plan that
//       ends after the §733.604 deadline.
//   Q34 The agreement follows Exhibit A on when money is due: the deposit upon acceptance, the final invoiced after the
//       walk-through from the logged hours.
//   Q35 The release request is the firearms' transport authority, with each firearm's serial and dealer, under one initial
//       for the batch; a firearm routed through a dealer comes off Havellin's receipt and the dealer's receipt is filed.
//   Q36 A line is appraised once the appraisal's figure is on it (source Appraisal, a value); the link alone is in progress.
//   Q37 Every co-representative with an email is copied on every client email and the estate package.
//   Q38 Client documents name the job's assigned concierge; the preparer shows as "Walkthrough by".
//   Q49 A refund above what is due may be recorded with its reason, up to what the job holds; a walkaway's final is the
//       work done, and it settles.
//   Q51 One paper for a living family: the Contents Record carries the signature; the ledger only where something sold;
//       "Junk" reads "Disposed of".
//   Q52 The prep fee is charged on the vendor quotes recorded, updated if a vendor's invoice differs.
//   Q53 The court is read off the case number's county code (50 is Palm Beach) and can be typed over.
//   Q54 Change-order reasons per service, none pre-picked, no "Senior Property Specialist".
//   Q56 Home Prep's second invoice waits until every prep vendor is confirmed.
//
// Each sandbox is the root's own call graph, derived from the source, with state supplied at named boundaries.
// ─────────────────────────────────────────────────────────────────────────────

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

  const EST_HR = { jobId: 7, svc: 'downsizing', tcFee: 6000, psFee: 4000, pkgCost: 0, smf: 0, prepFee: 0, havellinTotal: 10000, totTC: 40, totPS: 40,
    tcRate: 150, psRate: 100, discountPct: 0, fixedPrice: false, rush: false, vendors: [], prepItems: [], rooms: [], collections: [], vehicles: [] };
  const LIVING = { id: 7, hvlId: 'HVL-0007', name: 'Jane Doe', email: 'jane@x.com', svc: 'downsizing', addr: '12 Ocean Blvd', city: 'Palm Beach' };
  const PROBATE = (o) => Object.assign({ id: 7, hvlId: 'HVL-0007', name: 'Margaret Doe', svc: 'probate', matterType: 'probate', executor: 'Tripp Butler',
    executorEmail: 'tripp@x.com', executorRole: 'Personal Representative', addr: '69 Beach Blvd', city: 'Palm Beach', deathDate: '2026-01-15',
    docLevel: 'formal', payments: [] }, o || {});

  // ═══ Q34 · THE AGREEMENT FOLLOWS EXHIBIT A ON WHEN MONEY IS DUE ═══════════════
  group('Q34 · both forms say the deposit is due upon acceptance and the final follows the walk-through, as Exhibit A does');
  {
    const A = lift(['agreementHtml', 'probateAgreementHtml', 'clientEstimateHtml'], STATE.concat(['_printDocument']), BASE());
    const std = textOf(attempt(() => A.agreementHtml(LIVING, EST_HR)).val);
    has(std, 'Due upon acceptance, on signing this Agreement — Services will not commence until received', '⚠⚠ the standard form: the deposit upon acceptance');
    lacks(std, 'within 7 calendar days of signing', '…never within seven days of signing');
    has(std, 'Invoiced after the final property walk-through, from the actual logged hours; due within 7 calendar days of the invoice date',
      '⚠⚠ the final after the walk-through, from the logged hours');
    lacks(std, 'prior to final property walk-through', '…never before the walk-through');
    const fx = textOf(attempt(() => A.agreementHtml(LIVING, Object.assign({}, EST_HR, { fixedPrice: true, fixedAmount: 12000 }))).val);
    has(fx, 'Invoiced after the final property walk-through, completing the fixed price; due within 7 calendar days', 'a fixed price completes the fee after the walk-through');
    const pro = textOf(attempt(() => A.probateAgreementHtml(PROBATE(), Object.assign({}, EST_HR, { svc: 'probate' }))).val);
    has(pro, 'Due upon acceptance, on signing this Agreement — before any work begins', 'the estate form: the deposit upon acceptance');
    has(pro, 'Invoiced after the final property walk-through, from the actual logged hours and the materials used', 'its final after the walk-through');
    const ce = textOf(attempt(() => A.clientEstimateHtml(EST_HR, LIVING)).val);
    has(ce, '50% Deposit — Due upon acceptance', 'Exhibit A: the deposit upon acceptance');
    has(ce, '25% Final — Due after the final walk-through', '⚠ Exhibit A\'s final row says the same as the agreement');
    lacks(ce, 'Due upon completion</td>', 'never "upon completion" against the agreement\'s walk-through');
  }

  // ═══ Q52 · THE PREP FEE IS ON THE VENDOR QUOTES RECORDED ═════════════════════
  group('Q52 · every paper says the fee is on the vendor quotes recorded, updated if a vendor\'s invoice differs');
  {
    const B = 'the vendor quotes recorded, updated if a vendor’s invoice differs';
    const A = lift(['agreementHtml', 'clientEstimateHtml', 'invoiceHtml'], STATE.concat(['_printDocument']), BASE());
    const PREP = { jobId: 7, svc: 'prep', totTC: 0, totPS: 0, tcRate: 150, psRate: 100, tcFee: 0, psFee: 0, prepEnabled: true,
      prepItems: [{ id: 'p1', lid: 'p1', type: 'Painter', cost: 10000 }], prepCost: 10000, prepFee: 3000, havellinTotal: 3000, pkgCost: 0, smf: 0,
      vendors: [], discountPct: 0, rush: false, fixedPrice: false, rooms: [] };
    const PJ = { id: 7, hvlId: 'HVL-0007', name: 'Butler', email: 'b@x.com', svc: 'prep', tc: 'Ashley Jerome', status: 'active', won: true, payments: [] };
    A.jobs = [PJ]; A.estimateStore = { 7: { estimate: PREP, approved: true } };
    eq(A.PREP_FEE_BASIS_TXT, B, 'one wording, one definition');
    const ce = textOf(attempt(() => A.clientEstimateHtml(PREP, PJ)).val);
    has(ce, '30% Home Sale Preparation Fee on ' + B, '⚠⚠ the estimate\'s terms');
    lacks(ce, 'actual vendor spend', 'never "actual vendor spend"');
    lacks(ce, 'actually invoice', 'never "what the vendors actually invoice"');
    const ag = textOf(attempt(() => A.agreementHtml(PJ, PREP)).val);
    has(ag, 'of the total third-party vendor costs managed under this Agreement, measured on ' + B, '⚠⚠ the standard form\'s §3.5 says how the cost is measured');
    const fin = attempt(() => A.invoiceHtml(PJ, 'final'));
    has(textOf(fin.val && fin.val.html), 'Services total (Home Sale Preparation Fee on the vendor quotes recorded)', 'the final\'s heading');
    const live = SRC.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    eq((live.match(/(on|of) what [^\n]{0,60}actually (invoice|bill|charge)|actual vendor spend|actual invoices|trued to their actual/g) || []).length, 0,
      '⚠ no live sentence ties the fee to what a vendor "actually" invoices, bills or charges');
  }

  // ═══ Q33 · EXHIBIT A: COUNSEL FILES, THE REPRESENTATIVES TOGETHER, THE DEADLINE FLAGGED ═══
  group('Q33 · Exhibit A delivers to counsel for the filing, names the representatives together, and Build Estimate flags a late plan');
  {
    const P = lift(['_cePhases', 'estateDirectionWords'], STATE, BASE());
    const E = Object.assign({}, EST_HR, { svc: 'probate', docScope: 'full', docTier: 'values' });
    const phases = (job) => attempt(() => P._cePhases(E, job)).val || [];
    const close = (ph) => ph.find((p) => /^Close-Out/.test(p.title)) || {};
    const before = (ph) => ph.find((p) => /Before/.test(p.title)) || {};
    const one = phases(PROBATE({ gate706: 'yes' }));
    has(close(one).body, 'delivered to the estate attorney in time for the §733.604 filing; counsel serves and files it.', '⚠⚠ counsel serves and files');
    lacks(close(one).body, 'served on interested parties and filed', 'never that Havellin serves and files');
    eq(close(one).title, 'Close-Out &amp; Court Inventory', 'the stage is the court inventory, not a court filing');
    has(before(one).body, 'we take direction from you alone and nothing is released to anyone without your written authority', 'one representative: you alone');
    const two = phases(PROBATE({ gate706: 'yes', coFiduciaries: [{ id: 'c1', name: 'Ruth Doe', role: 'Co-Personal Representative', at: 1 }] }));
    has(before(two).body, 'we take direction from the representatives together and nothing is released to anyone without the written authority of each of them',
      '⚠⚠ two co-representatives: the representatives together, and each one\'s written authority');
    lacks(before(two).body, 'you alone', 'never "you alone" with two');
    // The release request's dispute caution reads the same answer.
    const C = lift(['invReleaseCautions', 'estateDirectionWords'], STATE, BASE());
    const disp = attempt(() => C.INV_RELEASE_CAUTIONS.find((c) => c.key === 'flagDisputed')).val;
    C.jobs = [PROBATE({ coFiduciaries: [{ id: 'c1', name: 'Ruth Doe', role: 'Co-Personal Representative', at: 1 }] })];
    has(attempt(() => disp.body(7)).val, 'takes direction from the representatives together', 'the dispute caution names the representatives together');
    C.jobs = [PROBATE()];
    has(attempt(() => disp.body(7)).val, 'takes direction from you alone', '…and you alone with one');
    // The deadline flag.
    const F = lift(['courtDeadlineFlag'], STATE, BASE());
    const late = attempt(() => F.courtDeadlineFlag(PROBATE({ probateDeadline: '2026-11-20' }), '2026-12-04')).val || '';
    has(late, 'This plan ends Dec 4, 2026, after the §733.604 inventory deadline of Nov 20, 2026.', '⚠⚠ a plan ending after the deadline is flagged, with both dates');
    eq(F.courtDeadlineFlag(PROBATE({ probateDeadline: '2026-11-20' }), '2026-11-20'), '', 'ending on the day: nothing');
    eq(F.courtDeadlineFlag(PROBATE({ probateDeadline: '' }), '2026-12-04'), '', 'no deadline recorded: nothing');
    eq(F.courtDeadlineFlag(PROBATE({ matterType: 'trust', probateDeadline: '2026-11-20' }), '2026-12-04'), '', 'off the probate track: nothing');
    eq(F.courtDeadlineFlag(LIVING, '2026-12-04'), '', 'a living client: nothing');
    const calc = codeOnly(fn('calcAll'));
    has(calc, 'courtDeadlineFlag(loadedJob, projectedEnd)', 'Build Estimate asks it under the projected completion');
  }

  // ═══ Q53 · THE COURT FROM THE CASE NUMBER ════════════════════════════════════
  group('Q53 · the court is read off the case number\'s county code, typed over where somebody types it');
  {
    const C = lift(['courtFromCaseNo', 'jobProbateCourt', 'fillCourtFromCase'], STATE, BASE());
    eq(C.courtFromCaseNo('50-2026-CP-001234-XXXX-MB'), 'Circuit Court for Palm Beach County, Florida, Probate Division', '⚠⚠ 50 is Palm Beach');
    eq(C.courtFromCaseNo('502026CP001234XXXXMB'), 'Circuit Court for Palm Beach County, Florida, Probate Division', 'without dashes too');
    eq(C.courtFromCaseNo('06-2026-CP-000001'), 'Circuit Court for Broward County, Florida, Probate Division', '06 is Broward');
    eq(C.courtFromCaseNo('13-2026-CP-000001'), 'Circuit Court for Miami-Dade County, Florida, Probate Division', '13 is Miami-Dade');
    eq(C.courtFromCaseNo('2026-CP-001234'), '', 'no county code: nothing derived');
    eq(C.courtFromCaseNo('99-2026-CP-1'), '', 'a code not in the list: nothing');
    eq(C.jobProbateCourt({ probateCase: '50-2026-CP-1' }), 'Circuit Court for Palm Beach County, Florida, Probate Division', 'a job reads it off its case number');
    eq(C.jobProbateCourt({ probateCase: '50-2026-CP-1', probateCourt: 'Fifteenth Judicial Circuit' }), 'Fifteenth Judicial Circuit', 'what was recorded wins');
    // The form fills the court until somebody types over it.
    const dom = domStub({ 'i-probate-case': { value: '50-2026-CP-001234' }, 'i-probate-court': { value: '' } });
    C.document = dom;
    C.fillCourtFromCase('i');
    eq(dom.getElementById('i-probate-court').value, 'Circuit Court for Palm Beach County, Florida, Probate Division', '⚠ typing the case number fills the court');
    dom.getElementById('i-probate-court').value = 'Typed by hand'; dom.getElementById('i-probate-court').dataset.userEdited = '1';
    C.fillCourtFromCase('i');
    eq(dom.getElementById('i-probate-court').value, 'Typed by hand', '…and leaves a court typed by hand alone');
    // The agreement prints it.
    const A = lift(['probateAgreementHtml'], STATE.concat(['_printDocument']), BASE());
    const pro = textOf(attempt(() => A.probateAgreementHtml(PROBATE({ probateCase: '50-2026-CP-001234' }), Object.assign({}, EST_HR, { svc: 'probate' }))).val);
    has(pro, 'Court Circuit Court for Palm Beach County, Florida, Probate Division', '⚠⚠ the estate agreement prints the court, not "Court ____"');
    has(SRC, 'id="i-probate-court"', 'intake has the Court field');
    has(fn('showEditClient'), "fld('Court'", 'and Edit Client');
  }

  // ═══ Q54 · CHANGE-ORDER REASONS PER SERVICE ══════════════════════════════════
  group('Q54 · each service offers its own reasons, none pre-picked, and the save refuses one not offered');
  {
    const mk = (job, est) => {
      const dom = domStub({ 'co-jobid': { value: '7' } });
      const c = lift(['coReasonsFor', 'openChangeOrder', 'saveChangeOrder'], STATE.concat(['saveChangeOrders', 'renderJobs', '_docNotice', 'updateCOHours']),
        Object.assign(BASE(), { jobs: [job], estimateStore: { 7: { estimate: est, approved: true } }, saveChangeOrders() {}, renderJobs() {}, _docNotice() {},
          updateCOHours() {}, coDraftVendorAdd: () => null, document: dom }));
      c.__dom = dom;
      return c;
    };
    const L = mk(Object.assign({ status: 'active' }, LIVING), EST_HR);
    eq(L.coReasonsFor(7), ['scope_add', 'scope_remove', 'timeline', 'conditions', 'other'], 'a living labour job');
    const E = mk(PROBATE({ status: 'active' }), Object.assign({}, EST_HR, { svc: 'probate' }));
    eq(E.coReasonsFor(7), ['scope_add', 'scope_remove', 'timeline', 'discovery', 'other'], 'an estate: discovery on site');
    const PREP = { jobId: 7, svc: 'prep', prepEnabled: true, prepItems: [{ lid: 'p1', type: 'Painter', cost: 5000 }], havellinTotal: 1500, totTC: 0, totPS: 0, vendors: [] };
    const P = mk({ id: 7, name: 'Butler', svc: 'prep', status: 'active' }, PREP);
    eq(P.coReasonsFor(7), ['prep_hours', 'vendor_add', 'vendor', 'scope_remove', 'other'], '⚠⚠ Home Prep: its own list');
    ok(!L.CO_REASONS.some((r) => /Senior Property Specialist/.test(r.l)), 'no Senior Property Specialist anywhere');
    P.openChangeOrder(7);
    const sel = P.__dom.getElementById('co-reason');
    has(sel.innerHTML, '<option value="">Choose a reason', 'the dialog opens on a placeholder');
    eq(sel.value, '', '⚠⚠ nothing pre-picked');
    lacks(sel.innerHTML, 'value="scope_add"', 'a prep dialog offers no labour reason');
    // The save asks where the record is written.
    const save = (ctx, reason) => {
      const d = ctx.__dom;
      d.getElementById('co-jobid').value = '7'; d.getElementById('co-description').value = 'Paint the shed';
      d.getElementById('co-tc-hrs').value = '2'; d.getElementById('co-ps-hrs').value = ''; d.getElementById('co-reason').value = reason;
      d.getElementById('co-vendor-type').value = ''; d.getElementById('co-vendor-cost').value = '';
      const before = ctx.changeOrders.length;
      attempt(() => ctx.saveChangeOrder());
      return { saved: ctx.changeOrders.length - before, fb: textOf(d.getElementById('co-fb').innerHTML) };
    };
    const none = save(P, '');
    eq(none.saved, 0, '⚠⚠ no reason chosen: nothing saved');
    has(none.fb, 'Choose the reason for this change order.', '…and it says so');
    eq(save(P, 'scope_add').saved, 0, '⚠ a labour reason on a Home Prep job: refused');
    eq(save(P, 'prep_hours').saved, 1, 'Home Prep\'s own reason: saved');
  }

  // ═══ Q38 · THE ASSIGNED CONCIERGE ════════════════════════════════════════════
  group('Q38 · the estimate and the invoices name the assigned concierge; the estimate names the walker apart');
  {
    const A = lift(['clientEstimateHtml', 'invoiceHtml', 'docConciergeName'], STATE.concat(['_printDocument']), BASE());
    eq(A.docConciergeName({ tc: 'Ashley Jerome' }, { preparedBy: 'Anthony Graziano' }), 'Ashley Jerome', '⚠⚠ the assigned concierge first');
    eq(A.docConciergeName({ tc: '' }, { preparedBy: 'Anthony Graziano' }), 'Anthony Graziano', 'nobody assigned: who walked the house');
    eq(A.docConciergeName({ tc: 'Contractor — TC' }, { preparedBy: 'Anthony Graziano' }), 'Anthony Graziano', 'the placeholder is nobody');
    const job = Object.assign({ tc: 'Ashley Jerome', status: 'active', won: true, payments: [] }, LIVING);
    const e = Object.assign({}, EST_HR, { preparedBy: 'Anthony Graziano' });
    A.jobs = [job]; A.estimateStore = { 7: { estimate: e, approved: true } };
    const ce = textOf(attempt(() => A.clientEstimateHtml(e, job)).val);
    has(ce, 'Questions about this estimate? Contact Ashley Jerome', '⚠⚠ the estimate names Ashley, who runs the job');
    has(ce, 'Walkthrough by Anthony Graziano', '…and Anthony as who walked the house');
    const same = textOf(attempt(() => A.clientEstimateHtml(Object.assign({}, e, { preparedBy: 'Ashley Jerome' }), job)).val);
    lacks(same, 'Walkthrough by', 'one person: no "Walkthrough by"');
    const inv = textOf((attempt(() => A.invoiceHtml(job, 'deposit')).val || {}).html);
    has(inv, 'Questions about this invoice? Contact Ashley Jerome', 'the invoice names the assigned concierge');
    lacks(inv, 'Contact Anthony Graziano', '…never the walker');
  }

  // ═══ Q37 · EVERY CO-REPRESENTATIVE IS COPIED ════════════════════════════════
  group('Q37 · every co-representative with an email is copied on every client email, the package and its folder shares');
  {
    const C = lift(['clientCopyEmails', 'docCcLine', 'probatePackageRecipients', 'pkgShareEmails', '_reviewMailtoUrl'], STATE, BASE());
    const CO = [{ id: 'c1', name: 'Ruth Doe', role: 'Co-Personal Representative', email: 'ruth@x.com', at: 1 },
                { id: 'c2', name: 'Sam Doe', role: 'Co-Personal Representative', email: 'TRIPP@x.com', at: 1 },
                { id: 'c3', name: 'No Email', role: 'Co-Personal Representative', email: '', at: 1 }];
    const job = PROBATE({ coFiduciaries: CO, probateAttyEmail: 'counsel@law.com', probateAttyName: 'Lee Counsel' });
    eq(C.clientCopyEmails(job, 'tripp@x.com'), ['ruth@x.com'], '⚠⚠ the co-representatives with an email, never the addressee twice (any case)');
    eq(C.clientCopyEmails(LIVING, 'jane@x.com'), [], 'a living client copies nobody');
    eq(C.docCcLine(job, 'tripp@x.com', 'billing@havellinpalmbeach.com'), 'ruth@x.com, billing@havellinpalmbeach.com', 'the Cc line: co-representatives, then the department');
    // The one send path reads it: a Gmail draft built through the real provider, with the real registry's Cc rule.
    const sent = [];
    const prov = lift(['docSpec', 'docProvider', 'buildMimeMessage'], STATE.concat(['gmailCreateDraft']),
      Object.assign(BASE(), { gmailCreateDraft: (mime, cb) => { sent.push(mime); cb(true, { messageId: 'm1' }); }, gmailDraftUrl: () => 'u' }));
    const cfg = Object.assign({}, prov.DOC_ACTIONS.invoice, { subject: () => 'Invoice', text: () => 'Hello', emailHtml: () => '<p>Hello</p>' });
    const run = attempt(() => prov.DOC_SEND_PROVIDERS.gmail.send({ to: 'tripp@x.com', job: job, cfg: cfg, names: { attachment: 'a.pdf' } }, '', () => {}));
    ok(run.ok, 'the Gmail provider runs (' + (run.err || 'ok') + ')');
    has(String(sent[sent.length - 1] || ''), 'Cc: ruth@x.com, billing@havellinpalmbeach.com', '⚠⚠ the draft is copied to the co-representative and billing@');
    // The package: the representative, every co-representative, agreements@; and its folder shares follow.
    const rc = C.probatePackageRecipients(job);
    eq(rc.to, 'counsel@law.com', 'fixture: the probate package goes to counsel');
    eq(rc.cc, ['tripp@x.com', 'ruth@x.com', 'agreements@havellinpalmbeach.com'], '⚠⚠ the package copies the representative, each co-representative and agreements@');
    eq(C.pkgShareEmails(rc), ['counsel@law.com', 'tripp@x.com', 'ruth@x.com'], '…and the photograph folders are shared with each of them');
    // The review ask, and its plain-email fallback.
    has(decodeURIComponent(C._reviewMailtoUrl(job)), 'cc=ruth@x.com', 'the review ask\'s plain email copies them too');
    has(codeOnly(fn('draftReviewRequest') || ''), 'cc: _revCc', 'and its Gmail draft');
  }

  // ═══ Q36 · APPRAISED MEANS THE APPRAISAL'S FIGURE IS ON THE LINE ══════════════
  group('Q36 · a line is appraised once the appraisal\'s figure is on it; a linked appraiser alone is the appraisal in progress');
  {
    const AP = [{ id: 'ap1', name: 'M. Wayland', firm: 'Wayland Fine Art' }];
    const I = lift(['invAppraised', 'invAppraisalInProgress', 'invAwaitingAppraisal', 'invReleaseCautions', '_invSetAppraiser'],
      STATE.concat(['savePhotoRefs', 'renderInventoryTab', '_scheduleInventorySync']),
      Object.assign(BASE(), { jobs: [PROBATE({ appraisers: AP, gate706: 'yes' })], savePhotoRefs() {}, renderInventoryTab() {}, _scheduleInventorySync() {} }));
    const L = (o) => Object.assign({ stableId: 's1', label: 'inventory', objectName: 'Oil on canvas', category: 'Art & Décor', disposition: 'Auction', channel: 'Christie\'s' }, o || {});
    eq(I.invAppraised(L({ valSource: 'Appraisal', fmv: '6500' })), true, 'source Appraisal with a value: appraised');
    eq(I.invAppraised(L({ apprId: 'ap1', valSource: 'Auction comps', fmv: '6500', valuedBy: 'agent' })), false, '⚠⚠ a link over the agent\'s figure: not appraised');
    eq(I.invAppraised(L({ valSource: 'Appraisal', fmv: '' })), false, 'source Appraisal with no figure: not yet');
    const linked = L({ apprId: 'ap1', fmv: '6500', valSource: 'Auction comps', valuedBy: 'agent' });
    eq(I.invAwaitingAppraisal(linked, 7), true, '⚠⚠ linked with no appraisal figure: still awaiting it');
    eq(I.invAppraisalInProgress(linked, 7), true, '…in progress');
    ok(I.invReleaseCautions(linked, 7).some((c) => c.key === 'needsAppraisal'), '⚠ and the release request still names it NOT YET APPRAISED');
    eq(I.invAwaitingAppraisal(L({ fmv: '6500', valSource: 'Appraisal' }), 7), false, 'the report\'s figure, no link (counsel\'s appraiser): appraised');
    I._photoRefs[7] = [L({ stableId: 'x', fmv: '6500', valSource: '' })];
    I._invSetAppraiser(7, 'x', 'ap1');
    eq([I._photoRefs[7][0].apprId, I._photoRefs[7][0].valSource], ['ap1', ''], '⚠⚠ linking writes no source, so a figure from anybody never becomes the appraisal\'s');
    has(codeOnly(fn('printCourtInventory')), '_invGuardrailItems(jobId)', 'the Court Inventory reads the awaiting list for its FINAL stamp');
  }

  // ═══ Q35 · THE REQUEST IS THE FIREARMS' TRANSPORT AUTHORITY; THE DEALER'S RECEIPT ═══
  group('Q35 · the release request authorises carrying each firearm, by serial and dealer, under one initial; a dealer\'s transfer is the dealer\'s receipt');
  {
    const G = (id, o) => Object.assign({ stableId: id, label: 'inventory', category: 'Firearms', authBy: '', approvalDate: '' }, o);
    const lines = [
      G('g1', { itemNo: 1, objectName: 'Remington 870 shotgun', serial: 'RS1', disposition: 'Consign', channel: 'Palm Beach Arms (FFL)' }),
      G('g2', { itemNo: 2, objectName: 'Colt 1911', serial: 'C99', disposition: 'Distribute', channel: 'Marie Delgado (daughter)', viaDealer: 'Gulfstream Guns (FFL)', viaDealerBy: 'Ashley Jerome', viaDealerAt: 5 }),
      G('g3', { itemNo: 3, objectName: 'Ruger revolver', serial: '', disposition: 'Consign', channel: 'Palm Beach Arms (FFL)' }),
      { stableId: 'v1', label: 'inventory', itemNo: 4, objectName: 'Vase', category: 'Art & Décor', fmv: '200', disposition: 'Donate', channel: 'Goodwill', authBy: '', approvalDate: '' }];
    const R = lift(['printApprovalRequest'], STATE.concat(['_printDocument', '_invPrintThumb', '_invPick', '_invFilter']),
      Object.assign(BASE(), { jobs: [PROBATE()], _photoRefs: { 7: lines.map((x) => Object.assign({}, x)) }, _invPrintThumb: () => '', _invPick: {},
        _invFilter: { when: 'all', room: '', q: '', flag: '' }, estimateStore: { 7: { estimate: { rooms: [] } } } }));
    const r = attempt(() => R.printApprovalRequest(7, false));
    ok(r.ok, 'the request prints (' + (r.err || 'ok') + ')');
    const html = String(R.__printed || ''), t = textOf(html);
    has(t, 'Firearms: written authority', '⚠⚠ the firearms block says it is the written authority');
    has(t, 'Your initial below, with your signature at the foot, is your written authority for Havellin’s named principal to transport each non-NFA firearm listed here, by the serial and to the licensed dealer printed against it',
      '…to carry each non-NFA firearm by the serial and to the dealer printed against it');
    has(t, 'Havellin takes no ownership of any firearm', 'with the no-ownership sentence');
    has(t, 'Initial once for all 3 firearms above', '⚠⚠ one initial for the batch');
    eq(count(html, 'initialled once, with the firearms below'), 3, '…and no per-line initial box on a firearm line');
    has(t, 'Serial RS1 · to Palm Beach Arms (FFL), a licensed dealer', 'each firearm line prints its serial and dealer');
    has(t, 'Serial C99 · through Gulfstream Guns (FFL), a licensed dealer', 'a dealer-routed one names the dealer it goes through');
    has(t, '1 of them has no serial or no dealer recorded yet, and is not covered for transport', '⚠ one with no serial is not covered for transport');
    // The receipt: a dealer-routed firearm is the dealer's to receipt, never Havellin's.
    const job = PROBATE();
    const appr = (x) => Object.assign({}, x, { authBy: 'Tripp Butler', approvalDate: '2026-10-01' });
    const recs = [appr(lines[1]), appr({ stableId: 'c1', label: 'inventory', itemNo: 5, objectName: 'Mantel clock', category: 'Clocks', disposition: 'Distribute', channel: 'Marie Delgado (daughter)' })];
    const Q = lift(['invReceiptGroups', 'invReceiptRecord', 'invReceiptOwed', 'invViaDealer'], STATE, Object.assign(BASE(), { jobs: [job] }));
    const groups = attempt(() => Q.invReceiptGroups(job, recs)).val || [];
    const person = groups.find((g) => !g.dealer) || {}, dealer = groups.find((g) => g.dealer) || {};
    eq((person.released || []).map((x) => x.stableId), ['c1'], '⚠⚠ Marie\'s receipt from Havellin lists the clock, not the dealer-routed gun');
    eq([dealer.name, dealer.persons, (dealer.owed || []).map((x) => x.stableId)], ['Gulfstream Guns (FFL)', ['Marie Delgado'], ['g2']],
      '…the gun is the dealer\'s to receipt, naming who it goes to');
    const withRec = Object.assign({}, job, { signedRecords: [{ id: 'r1', kind: 'receipt', ref: 'Gulfstream Guns (FFL)', stableIds: ['g2'], at: 1 }] });
    eq(Q.invReceiptOwed(recs[0], withRec), false, 'the dealer\'s filed receipt clears it');
    const wrong = Object.assign({}, job, { signedRecords: [{ id: 'r1', kind: 'receipt', ref: 'Marie Delgado (daughter)', stableIds: ['g2'], at: 1 }] });
    eq(Q.invReceiptOwed(recs[0], wrong), true, '…a receipt Marie signed does not (Havellin never handed it to her)');
  }

  // ═══ Q51 · ONE PAPER FOR A LIVING FAMILY ════════════════════════════════════
  group('Q51 · the Contents Record is what a living family signs, the ledger only where something sold, and "Junk" reads "Disposed of"');
  {
    const W = lift(['invDispDocWord', 'ledgerApplies'], STATE, BASE());
    eq([W.invDispDocWord('Junk'), W.invDispDocWord('Keep'), W.invDispDocWord('')], ['Disposed of', 'Keep', 'Not yet decided'], 'the reader\'s word');
    const item = (id, d, o) => Object.assign({ stableId: id, label: 'inventory', objectName: 'Item ' + id, category: 'Furniture', disposition: d, roomIdx: 0 }, o || {});
    eq(W.ledgerApplies(LIVING, [item('a', 'Junk'), item('b', 'Donate')]), false, '⚠⚠ living, nothing sold: no ledger');
    eq(W.ledgerApplies(LIVING, [item('a', 'Junk'), item('b', 'Sell')]), true, 'living, something sold: the ledger');
    eq(W.ledgerApplies(PROBATE(), []), true, 'every estate keeps it');
    // Nobody signs a living job's ledger: its signers are none (the sign-off block is also gated on the fiduciary mode).
    const SG = lift(['ledgerSigners'], STATE, BASE());
    eq(attempt(() => SG.ledgerSigners(LIVING)).val, [], '⚠⚠ a living ledger has no signers: the family signs the Contents Record');
    ok((attempt(() => SG.ledgerSigners(PROBATE())).val || []).length >= 1, '…an estate\'s ledger keeps its signer');
    const rig = (job, rows) => lift(['printContentsRecord', '_renderLedgerCards'], STATE.concat(['_printDocument', '_invPrintThumb']),
      Object.assign(BASE(), { jobs: [job], _photoRefs: { 7: rows }, _invPrintThumb: () => '', estimateStore: { 7: { estimate: { rooms: [{ name: 'Kitchen' }] } } } }));
    const done = rig(LIVING, [item('a', 'Junk', { channel: 'Hauler' }), item('b', 'Keep')]);
    const page = (attempt(() => done.printContentsRecord(7, { asHtml: true })).val || {}).html || '';
    has(textOf(page), 'Disposed of', '⚠⚠ the family\'s record says Disposed of');
    lacks(textOf(page), 'Junk', '…never Junk');
    has(textOf(page), 'Sign-off Reviewed and accepted as the record of what stayed and what left the property', '⚠⚠ and carries the sign-off');
    has(textOf(page), 'Jane Doe, Client', '…for the client');
    const open = rig(LIVING, [item('a', 'Junk'), item('b', '')]);
    has(textOf((attempt(() => open.printContentsRecord(7, { asHtml: true })).val || {}).html), 'The sign-off is withheld.', 'a line with no destination: withheld');
    const est = rig(PROBATE(), [item('a', 'Junk')]);
    lacks((attempt(() => est.printContentsRecord(7, { asHtml: true })).val || {}).html || '', 'contents-signoff', 'an estate signs its ledger, not this');
    const cards = attempt(() => done._renderLedgerCards(LIVING, done._photoRefs[7])).val || '';
    has(cards, 'id="inv-contents-card"', 'the desk shows the Contents Record card on living work');
    lacks(cards, 'id="inv-ledger-card"', '…and no ledger card with nothing sold');
    // The close files it, and an estate's close never reads the sheet for it.
    const calls = { reads: 0, uploads: [] };
    const F = (job) => lift(['fileContentsRecord'], STATE.concat(['refreshPhotoRefs', 'resolveSubfolderId', 'uploadHtmlToDrive', 'saveJobs', 'syncJobToSheets',
      'showSyncBadge', '_docNotice', '_ledgerCardRepaint', '_invEnsureLoaded', '_invCloudSeen', '_printDocument', '_invPrintThumb']),
      Object.assign(BASE(), { jobs: [job], _photoRefs: { 7: [item('a', 'Keep')] }, SHEETS_SYNC_URL: 'https://x', _invCloudSeen: { 7: true }, _invPrintThumb: () => '',
        refreshPhotoRefs: (id, cb) => { calls.reads++; cb(); }, resolveSubfolderId: (j, s, cb) => cb('F1'), _invEnsureLoaded() {},
        uploadHtmlToDrive: (f, name, html, cb) => { calls.uploads.push(name); cb(true, 'https://drive/x', { fileId: 'd1' }); },
        saveJobs() {}, syncJobToSheets() {}, showSyncBadge() {}, _docNotice() {}, _ledgerCardRepaint() {} }));
    const E = F(PROBATE({ driveFolder: 'https://drive.google.com/drive/folders/ROOT' }));
    eq(E.fileContentsRecord(7, { auto: true }), false, 'an estate: nothing to file');
    eq(calls.reads, 0, '⚠ …and the sheet is not read for it');
    const lj = Object.assign({ driveFolder: 'https://drive.google.com/drive/folders/ROOT', docState: {} }, LIVING);
    const Lv = F(lj);
    Lv.fileContentsRecord(7, { auto: true });
    eq([calls.reads, calls.uploads.length], [1, 1], 'a living close reads the sheet and files the record');
    has(calls.uploads[0] || '', 'Contents Record', '…under its undated name');
    ok(!!(lj.docState.contentsRecord && lj.docState.contentsRecord.filedAt), '⚠⚠ recorded on its own docState key');
  }

  // ═══ Q56 · HOME PREP'S SECOND INVOICE WAITS ON THE VENDOR BOOKING ═══════════
  group('Q56 · Home Prep\'s second invoice is due once every prep vendor is confirmed; until then the band books the vendors');
  {
    const T = lift(['jobTimeline', 'jobTimelineNext', 'jobTimelineActions', 'prepVendorsConfirmed'], STATE,
      Object.assign(BASE(), { _todayStr: () => '2026-10-08' }));
    const EST = { jobId: 7, svc: 'prep', havellinTotal: 4500, totTC: 0, totPS: 0, prepEnabled: true, vendors: [], rooms: [],
      prepItems: [{ lid: 'p1', type: 'Painter', cost: 10000 }, { lid: 'p2', type: 'Landscaper', cost: 5000 }] };
    const rec = { estimate: EST, approved: true, approvedBy: 'Anthony Graziano', savedAt: 1 };
    const job = (src) => ({ id: 7, name: 'Butler', svc: 'prep', status: 'active', won: true, wonAt: '2026-10-01', approved: true, created: 'Sep 28, 2026',
      walkthrough: '2026-09-30', estimateSentDate: 'October 1, 2026', agrApproved: true, agrSent: true, agrSigned: true, activatedOn: '2026-10-05',
      docState: { estimate: { sentAt: '2026-10-01T14:00:00Z' }, agreement: { sentAt: '2026-10-02T14:00:00Z', sig: { signedBy: 'Pat Butler', signedAt: '2026-10-03', recordedBy: 'Ashley Jerome' } },
        'invoice:deposit': { sentAt: '2026-10-03T14:00:00Z' } },
      estimateSentTotal: 4500, acceptedTotal: 4500, payments: [{ uid: 'd1', stage: 'deposit', amount: 2250, receivedOn: '2026-10-04', method: 'wire' }],
      prepSourcing: src });
    const view = (j) => {
      T.jobs = [j]; T.estimateStore = { 7: rec };
      const r = attempt(() => { const rows = T.jobTimeline(j, rec, [], []); const row = rows.find((x) => x.key === 'midpoint_invoiced') || {};
        return { row, acts: T.jobTimelineActions(row, j, rec), next: (T.jobTimelineNext(rows) || {}).key }; });
      return r.ok ? r.val : { err: r.err, row: {}, acts: {} };
    };
    // Sourcing records key on the line's id ('L' + lid, _srcLineKey).
    const half = view(job({ Lp1: { status: 'Confirmed' }, Lp2: { status: 'Quote received' } }));
    ok(!half.err, 'fixture: the timeline runs (' + (half.err || 'ok') + ')');
    eq(T.prepVendorsConfirmed(job({ Lp1: { status: 'Confirmed' } }), EST), { done: 1, total: 2 }, 'the one count: 1 of 2 confirmed');
    eq(half.row.notYet, true, '⚠⚠ one of two vendors confirmed: the second invoice is not due yet');
    has(half.row.todo, 'Book the prep vendors', '…the band says to book them');
    has(half.row.sub, '1 of 2 prep vendors confirmed on the Job Plan', '…and counts them');
    eq((half.acts.primary || {}).call, "openJobPlanFor(7,'vendors')", '⚠ its button opens the vendors on the Job Plan');
    has(((half.acts.secondary || [])[0] || {}).label, 'once the vendors are confirmed', 'the send stays offered, early, saying when it is due');
    const all = view(job({ Lp1: { status: 'Confirmed' }, Lp2: { status: 'Confirmed' } }));
    eq(!!all.row.notYet, false, 'every vendor confirmed: it is due');
    has(String((all.acts.primary || {}).call), "docAction(7,'invoice','send',{stage:'midpoint'})", '…and Send is the button');
  }

  // ═══ Q49 · A REFUND ABOVE WHAT IS DUE; THE WORK-DONE FINAL ══════════════════
  group('Q49 · a walkaway settles on its final for the work done, and a refund above what is due is recorded with its reason');
  {
    const W = lift(['walkawayNet'], STATE, BASE());
    eq(W.walkawayNet(5000, 3500, 9000), { earned: 5000, due: 4000, owed: 0, retained: 5000 }, 'the deposit is more than the work: 4,000 back');
    eq(W.walkawayNet(5000, 8000, 6000), { earned: 8000, due: 0, owed: 2000, retained: 6000 }, '⚠ the work is more than was paid: 2,000 still owed');
    const est = Object.assign({}, EST_HR, { svc: 'downsizing', jobId: 7 });
    const job = (o) => Object.assign({ id: 7, hvlId: 'HVL-0007', name: 'Gone Client', svc: 'downsizing', status: 'closed_retained', won: true, docState: {}, at: {},
      payments: [{ id: 1, uid: 'p1', stage: 'deposit', amount: 5000, method: 'wire', receivedOn: '2026-09-01', clearedOn: '2026-09-01' },
                 { id: 2, uid: 'p2', stage: 'midpoint', amount: 4000, method: 'wire', receivedOn: '2026-09-15', clearedOn: '2026-09-15' }] }, o || {});
    const logs = { 7: [{ id: 1, date: '2026-09-20', members: [{ role: 'TC', name: 'Ashley Jerome', hours: 10 }, { role: 'PS', name: 'Sam', hours: 20 }] }] };
    const I = lift(['invoiceHtml', 'walkawaySettlement', 'walkawaySettlementHtml', 'refundBlocker'], STATE.concat(['_logsState']),
      Object.assign(BASE(), { estimateStore: { 7: { approved: true, estimate: est } }, jobLogs: logs, _logsState: 'ready' }));
    const j = job(); I.jobs = [j];
    const fin = attempt(() => I.invoiceHtml(j, 'final')).val || {};
    const t = textOf(fin.html);
    has(t, 'Settlement — the engagement ended early', '⚠⚠ the walkaway\'s final settles');
    has(t, 'Work done (the services above) $3,500', 'the work done: 10 × $150 + 20 × $100');
    has(t, 'Earned: the deposit or the work done, whichever is more $5,000', 'the deposit is more, so it is what was earned');
    has(t, 'Refund Due to You $4,000', '…and $4,000 of the $9,000 received goes back');
    eq([fin.blocked, fin.requiresApproval, fin.amtDue, fin.outstanding], [false, false, -4000, 0],
      'it waits on no hours, asks no PIN, and reads the refund as a credit (nothing outstanding to collect)');
    lacks(t, 'Original Estimate (basis for advance payments)', 'it is not measured against the estimate');
    const nh = job(); I.jobLogs = { 7: [] };
    eq((attempt(() => I.invoiceHtml(nh, 'final')).val || {}).blocked, false, '⚠ no hours logged at all: still issued, the deposit is earned either way');
    I.jobLogs = logs;
    const card = attempt(() => I.walkawaySettlementHtml(j)).val || '';
    has(card, "docAction(7,'invoice','view',{stage:'final'})", '⚠⚠ Deposit Retained offers the final: view');
    has(card, "docAction(7,'invoice','send',{stage:'final'})", '…and send');
    has(card, 'openRefundModal(7)', '…and Record refund');
    // The refund gate: anything up to what the job holds, the fixed price included.
    eq(I.refundBlocker(j), '', 'an hourly walkaway records a refund');
    I.estimateStore = { 7: { approved: true, estimate: Object.assign({}, est, { fixedPrice: true, fixedAmount: 12000 }) } };
    eq(I.refundBlocker(j), '', '⚠⚠ a fixed price records one too, with its reason');
    const refunded = job({ payments: [{ id: 1, uid: 'p1', stage: 'deposit', amount: 5000, method: 'wire', receivedOn: '2026-09-01' },
      { id: 2, uid: 'r1', stage: 'refund', amount: 5000, refundedOn: '2026-10-01', method: 'check' }] });
    has(I.refundBlocker(refunded), 'holds nothing to refund', 'a job that holds nothing: refused');
  }

  process.env.TZ = prevTZ;
};
