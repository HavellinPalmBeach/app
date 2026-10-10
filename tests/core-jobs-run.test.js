'use strict';
// ─────────────────────────────────────────────────────────────────
// THE CORE-JOBS RUN (2026-10-10). Anthony: "run through a series of jobs again … confirm all workflows, app functionality,
// all paperwork … prioritize TC usability … on estate jobs, pay particular attention to the photo documentation work flow."
// Five whole jobs ran through the real controls (a Home Transition, a Home Cleanout on a fixed price, a trust estate, a
// probate estate and a fee-only Home Prep); these are the fixes they found, each driven through the real code:
//
//   A. a finished hourly job whose payments exceed the work settles on its final (the deposit earned, the rest due back),
//      the rail's last step is the refund, the recorder refuses the "payment", and the notices read a refund as one
//   B. what an invoice asked is recorded when its draft goes, and the final and the rail read the record, so a client who
//      paid the second invoice in full is never restated as short when the quotes move after it
//   C. the invoice emails say when each stage is due, in the agreement's words, and a balance of nothing says so
//   D. the invoice page says when the amount is due, under the box
//   E. a Home Prep's agreement email names its own stages; its second invoice shows the 75% it brings the client to
//   F. a fee-only estimate offers no discount; the vendors fold opens on an active Home Prep while a vendor is unconfirmed
//   G. a Job Plan slot offers the vendors under the line's own category as well as the mapped one
//   H. the hours fold's second-concierge row follows the estimator's pick (Q47), never the engine's load check
//   I. a line a person named and decided on the desk is reviewed (the stamp, the counts)
//   J. a line shot in the field takes the confirmed vendor of its kind at capture; a Sell line takes the one selling vendor
//   K. arming a walkthrough collection drops the latched chip; a note said over a close-up goes on its item
//   L. the papers: "or with no value recorded" on the request's group initial; "Quote to follow" on an appraiser with no
//      fee; the worklist drops appraised and waived lines; a schedule names the one recorded fiduciary; the desk papers
//      head with the estate or the trust and the court; a Keep line on the Contents Record reads "kept by the client"
//   M. the close names the rooms not cleared and the leaving lines with nobody named; the Releases card repaints on an edit
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
      else if (ALL_FNS.has(m[1])) queue.push(['f', m[1]]);
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
  '&rsquo;': '’', '&ldquo;': '“', '&rdquo;': '”', '&ndash;': '–', '&#9888;': '⚠', '&#9654;': '▶', '&#10003;': '✓', '&#8617;': '↩' };
const decode = (s) => String(s).replace(/&[a-z#0-9]+;/gi, (m) => (ENT[m] !== undefined ? ENT[m] : m));
const textOf = (h) => decode(String(h).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

const STATE = ['jobs', 'estimateStore', 'jobLogs', 'changeOrders', 'jobPlanStore', 'mediaStore', '_photoRefs', 'contractors', 'currentEstimate',
  'currentInvStage', 'SHEETS_SYNC_URL'];
const BASE = () => ({ jobs: [], estimateStore: {}, jobLogs: {}, changeOrders: [], jobPlanStore: {}, mediaStore: {}, _photoRefs: {}, contractors: [],
  currentEstimate: null, currentInvStage: 'final', SHEETS_SYNC_URL: '', vendorDirectory: [], Intl: global.Intl, document: domStub({}),
  setTimeout: () => 0, clearTimeout: () => {}, saveJobs: () => {}, syncJobToSheets: () => {}, updateApprovalUI: () => {} });

module.exports = function ({ group, ok, eq, has, lacks }) {
  const prevTZ = process.env.TZ;
  process.env.TZ = 'America/New_York';

  // A Home Transition priced at $21,700 (90 concierge + 82 specialist hours), as the run's was.
  const EST_HR = { jobId: 7, svc: 'downsizing_move', tcFee: 13500, psFee: 8200, pkgCost: 0, smf: 0, prepFee: 0, havellinTotal: 21700, totTC: 90, totPS: 82,
    tcRate: 150, psRate: 100, discountPct: 0, fixedPrice: false, rush: false, vendors: [], prepItems: [],
    rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }, { idx: 1, name: 'Dining', st: 'in', vol: 3, cplx: 3 }, { idx: 2, name: 'Bedroom', st: 'in', vol: 3, cplx: 3 }],
    collections: [], vehicles: [] };
  const LIVING = (o) => Object.assign({ id: 7, hvlId: 'HVL-0007', name: 'Robert Mercer', email: 'rm@x.com', svc: 'downsizing_move', addr: '2210 S Ocean Blvd',
    city: 'Palm Beach', tc: 'Ashley Jerome', won: true, status: 'active', agrSigned: true, docState: {}, at: {}, payments: [] }, o || {});
  const pay = (stage, amount, uid) => ({ id: 1, uid: uid || ('p-' + stage), stage: stage, amount: amount, method: 'wire', receivedOn: '2026-10-01', clearedOn: '2026-10-01' });
  // The run's fee-only Home Prep: three vendors, $15,400 of quotes, a $4,620 fee.
  const PREP = { jobId: 7, svc: 'prep', totTC: 0, totPS: 0, tcRate: 150, psRate: 100, tcFee: 0, psFee: 0, prepEnabled: true,
    prepItems: [{ id: 'p1', lid: 'p1', type: 'Full Interior Paint', cost: 9800 }, { id: 'p2', lid: 'p2', type: 'Landscaping', cost: 3200 }, { id: 'p3', lid: 'p3', type: 'Handyman Services', cost: 2400 }],
    prepCost: 15400, prepFee: 4620, havellinTotal: 4620, pkgCost: 0, smf: 0, vendors: [], discountPct: 0, rush: false, fixedPrice: false, rooms: [], collections: [], vehicles: [] };
  const PJ = (o) => Object.assign({ id: 7, hvlId: 'HVL-0007', name: 'David Kessler', email: 'dk@x.com', svc: 'prep', addr: '140 Clarke Ave', city: 'Palm Beach',
    tc: 'Ashley Jerome', status: 'active', won: true, agrSigned: true, docState: {}, at: {}, payments: [] }, o || {});
  const PROBATE = (o) => Object.assign({ id: 7, hvlId: 'HVL-0007', name: 'Harold Brennan', svc: 'probate', matterType: 'probate', executor: 'Michael Brennan',
    executorEmail: 'mb@x.com', executorRole: 'Personal Representative', addr: '1180 N Lake Way', city: 'Palm Beach', deathDate: '2026-06-02',
    probateCase: '50-2026-CP-004412', docTier: 'appraisals', docLevel: 'formal', tc: 'Ashley Jerome', won: true, status: 'active', payments: [], docState: {}, at: {} }, o || {});

  // ═══ A · A FINISHED HOURLY JOB WHOSE PAYMENTS EXCEED THE WORK ═════════════════
  group('A · a finished hourly job whose payments exceed the work settles on its final, and the rail asks for the refund');
  {
    const stubs = Object.assign(BASE(), { estimateStore: { 7: { approved: true, estimate: EST_HR } }, _logsState: 'ready',
      jobLogs: { 7: [{ id: 1, date: '2026-10-06', members: [{ role: 'TC', name: 'Ashley Jerome', hours: 20 }, { role: 'PS', name: 'Sam', hours: 30 }] }] },
      _primeAgreementFor: () => true, dashNotice: (k, m) => { stubs.__notice = k + ': ' + m; }, _dashRedraw: () => {}, openDepositModal: () => { stubs.__opened = true; } });
    const C = lift(['invoiceHtml', 'jobTimeline', 'jobTimelineActions', 'refundBlocker', 'walkawaySettlement', 'dashRecordPayment', 'invAskedWords',
      'invoiceAskedAmt', 'docRecordSent'], STATE.concat(['_logsState', '_primeAgreementFor', 'dashNotice', '_dashRedraw', 'openDepositModal',
      'saveJobs', 'syncJobToSheets', 'updateApprovalUI']), stubs);
    const j = LIVING({ status: 'closed', deliveredOn: '2026-10-09', deliveredBy: 'Ashley Jerome', payments: [pay('deposit', 10850, 'd1'), pay('midpoint', 5425, 'm1')],
      docState: { 'invoice:deposit': { sentAt: '2026-09-29T14:00:00Z' }, 'invoice:midpoint': { sentAt: '2026-10-05T14:00:00Z' } } });
    C.jobs = [j];
    const fin = attempt(() => C.invoiceHtml(j, 'final'));
    ok(fin.ok, 'the final builds: ' + (fin.err || ''));
    const t = textOf(fin.val && fin.val.html);
    has(t, 'Settlement — the payments received exceed the work done', '⚠⚠ the final settles rather than printing the whole excess as a credit');
    has(t, 'Work done (the services above) $6,000', 'the work: 20 × $150 + 30 × $100');
    has(t, 'Deposit — earned on signature, not refundable $10,850', 'the deposit the agreement makes earned on signature');
    has(t, 'Refund Due to You $5,425', '⚠⚠ what goes back is what came in above the deposit: the midpoint, not $10,050');
    lacks(t, 'Credit: $10,050', 'never the deposit printed as credit to be returned');
    has(t, 'The work came in under the payments made on the estimate.', 'the note says what happened');
    lacks(t, 'Refund Due to You $5,425 Due within 7 calendar days', 'no due line under a refund');
    eq([fin.val.amtDue, fin.val.outstanding, fin.val.requiresApproval], [-5425, 0, true], 'it asks a refund, nothing to collect, and the ±15% PIN still applies to a 72% miss');
    // The send records what it asked, and the rail reads the record.
    const spec = { kind: 'invoice', stage: 'final', key: 'invoice:final', job: j };
    const rec = attempt(() => C.docRecordSent(spec, { provider: 'gmail', draftUrl: '', pdfOk: true }));
    ok(rec.ok, 'the draft is recorded: ' + (rec.err || ''));
    eq(C.invoiceAskedAmt(j, 'final'), -5425, '⚠ the figure the final asked is on the record');
    const rows = C.jobTimeline(j, { approved: true, estimate: EST_HR }, C.jobLogs[7], [], null);
    const last = rows.filter((r) => r.key === 'final_paid')[0];
    eq([last.label, last.refund, last.todo, last.done], ['Refund sent', 5425, 'Send the client their refund', false], '⚠⚠ the rail\'s last step is the refund, not "Collect the final payment"');
    has(last.sub, '$5,425 due back to the client', 'and says what is due back');
    last.state = 'current';
    const acts = C.jobTimelineActions(last, j, { approved: true, estimate: EST_HR });
    eq(acts.primary && acts.primary.call, 'openRefundModal(7)', '⚠⚠ the band\'s filled button is Record refund');
    has(acts.primary && acts.primary.label, 'Record refund', '…by name');
    eq(C.refundBlocker(j), '', '⚠ the refund recorder is open on a closed job whose final states a refund');
    const s = C.walkawaySettlement(j);
    eq([s.basis, s.deposit, s.work, s.earned, s.due], ['hourly', 10850, 6000, 10850, 5425], 'the settlement the modal reads: the final\'s own figures');
    C.dashRecordPayment(7, 'final');
    has(stubs.__notice, 'refund of $5,425 due to the client', '⚠⚠ Record payment on that final refuses and names the refund');
    eq(!!stubs.__opened, false, '…and never opens the recorder on "$-5,425"');
    eq(C.invAskedWords(-5425), 'a refund of $5,425 to the client', 'the manager\'s notices read a refund as one');
    eq(C.invAskedWords(1200), '$1,200', '…and a balance as the figure');
    // Once the refund is recorded, the step is done.
    j.payments.push({ id: 3, uid: 'r1', stage: 'refund', amount: 5425, refundedOn: '2026-10-10', method: 'check' });
    const after = C.jobTimeline(j, { approved: true, estimate: EST_HR }, C.jobLogs[7], [], null).filter((r) => r.key === 'final_paid')[0];
    eq([after.done, after.sub], [true, '$5,425 refunded'], 'the refund recorded closes the step');
    // A job whose work exceeds what came in is untouched: a balance due, no settlement.
    const owing = LIVING({ status: 'closed', deliveredOn: '2026-10-09', payments: [pay('deposit', 10850, 'd1')] });
    C.jobLogs = { 7: [{ id: 1, date: '2026-10-06', members: [{ role: 'TC', name: 'Ashley Jerome', hours: 60 }, { role: 'PS', name: 'Sam', hours: 80 }] }] };
    const ow = textOf((attempt(() => C.invoiceHtml(owing, 'final')).val || {}).html);
    lacks(ow, 'Settlement —', 'a final that is owed money does not settle');
    has(ow, 'Balance Due Upon Completion $6,150', '…it bills the balance: $17,000 of work less $10,850');
    has(ow, 'Due within 7 calendar days of the invoice date.', '…and says when it is due (D)');
    eq(C.refundBlocker(owing), 'A refund is recorded once the job has been closed out with the deposit retained, or once a final invoice stating a refund due has gone to the client.',
      'and records no refund');
  }

  // ═══ B · WHAT AN INVOICE ASKED IS RECORDED AND READ ══════════════════════════
  group('B · the final states the second invoice at the figure it asked, never today\'s recomputation');
  {
    const quotes = (paint) => ({ Lp1: { status: 'Confirmed', vendorName: 'Palm Painters', quote: paint }, Lp2: { status: 'Confirmed', vendorName: 'Green Co', quote: 3200 },
      Lp3: { status: 'Confirmed', vendorName: 'Fix It', quote: 2400 } });
    const stubs = Object.assign(BASE(), { estimateStore: { 7: { approved: true, estimate: PREP } }, _logsState: 'ready' });
    const C = lift(['invoiceHtml', 'jobTimeline', 'invoiceAskedAmt', 'docRecordSent'],
      STATE.concat(['_logsState', 'saveJobs', 'syncJobToSheets', 'updateApprovalUI']), stubs);
    // The second invoice went when the painter's quote was $9,950: fee $4,665, 75% less the deposit = $1,188.75.
    const j = PJ({ status: 'closed', deliveredOn: '2026-10-09', prepSourcing: quotes(9950), payments: [pay('deposit', 2310, 'd1')],
      docState: { 'invoice:deposit': { sentAt: '2026-09-29T14:00:00Z' } } });
    C.jobs = [j];
    const mid = attempt(() => C.invoiceHtml(j, 'midpoint'));
    eq(mid.val && mid.val.amtDue, 1188.75, 'fixture: the second invoice asks $1,188.75');
    C.docRecordSent({ kind: 'invoice', stage: 'midpoint', key: 'invoice:midpoint', job: j }, { provider: 'gmail', pdfOk: true });
    eq(C.invoiceAskedAmt(j, 'midpoint'), 1188.75, '⚠⚠ the send records what the second invoice asked');
    j.docState['invoice:midpoint'].sentAt = '2026-10-05T14:00:00Z';
    j.payments.push(pay('midpoint', 1188.75, 'm1'));
    // Then the painter's invoice came in at $10,850 (the fee is on the quotes recorded, updated if the invoice differs).
    j.prepSourcing = quotes(10850);
    const t = textOf((attempt(() => C.invoiceHtml(j, 'final')).val || {}).html);
    has(t, 'fees trued to actuals Deposit + actual fees $1,188.75', '⚠⚠ the final restates the second invoice at the figure it asked');
    lacks(t, '$1,391.25', '…never at today\'s recomputation');
    lacks(t, 'Outstanding from the deposit and second invoices', '⚠⚠ a client who paid both in full is not told they are in arrears');
    has(t, 'Balance Due Upon Completion $1,436.25', 'the balance is the fee on the quotes recorded less what came in: $4,935 − $3,498.75');
    // Without the record (a printed copy handed over) the page computes as it always did.
    delete j.docState['invoice:midpoint'].asked;
    const t0 = textOf((attempt(() => C.invoiceHtml(j, 'final')).val || {}).html);
    has(t0, '$1,391.25', 'with no record the row is today\'s figure, as before');
    has(t0, 'Outstanding from the deposit and second invoices', '…and the gap row with it');
    j.docState['invoice:midpoint'].asked = 1188.75;
    const rows = C.jobTimeline(j, { approved: true, estimate: PREP }, [], [], null);
    eq(rows.filter((r) => r.key === 'midpoint_invoiced')[0].amount, 1188.75, '⚠ the rail\'s row shows what the second invoice asked, not the estimate\'s split');
    eq(rows.filter((r) => r.key === 'deposit_invoiced')[0].amount, 2310, 'the deposit row keeps the split where no record exists');
  }

  // ═══ C · THE EMAILS SAY WHEN EACH STAGE IS DUE ═══════════════════════════════
  group('C · the invoice emails say when each stage is due, in the agreement\'s words; a balance of nothing says so');
  {
    const C = lift(['invoiceBalanceWords', 'buildInvoiceEmailText', 'buildInvoiceEmailHtml', 'buildInvoiceMailto'], STATE.concat(['assignedTCContact']),
      Object.assign(BASE(), { assignedTCContact: () => ({ name: 'Ashley Jerome', phone: '', email: '' }) }));
    const j = LIVING();
    has(C.invoiceBalanceWords(10850, j, 'deposit').terms, 'Due upon acceptance, on signing the agreement', '⚠⚠ the deposit is due upon acceptance (§3.2), not in seven days');
    eq(C.invoiceBalanceWords(5425, j, 'midpoint').terms, 'Payment is due within 7 calendar days.', 'the midpoint keeps §3.7\'s seven days');
    eq(C.invoiceBalanceWords(1436.25, j, 'final').terms, 'Payment is due within 7 calendar days.', '…and the final');
    eq(C.invoiceBalanceWords(0, j, 'final'), { label: 'Nothing further is due', amount: '$0', terms: 'Nothing is due on this invoice: the payments received cover it in full.' },
      '⚠ a balance of exactly nothing says so (it read "Balance due: see attached … 7 calendar days")');
    eq(C.invoiceBalanceWords(-5425, j, 'final').label, 'Refund due to you', 'a refund due reads as one');
    has(C.buildInvoiceEmailText(j, 'deposit', 10850), 'Due upon acceptance', 'the deposit email carries it');
    has(C.buildInvoiceEmailHtml(j, 'final', 0), 'Nothing further is due', '⚠ the html body prints the block at $0 (it dropped it)');
    has(C.buildInvoiceMailto(j, 10850, 'deposit'), encodeURIComponent('Due upon acceptance'), 'the plain-email fallback too');
  }

  // ═══ D · THE INVOICE PAGE SAYS WHEN THE AMOUNT IS DUE ═════════════════════════
  group('D · the invoice page says when the amount is due, under the box');
  {
    const C = lift(['invoiceHtml'], STATE.concat(['_logsState']), Object.assign(BASE(), { estimateStore: { 7: { approved: true, estimate: EST_HR } }, _logsState: 'ready' }));
    const j = LIVING();
    C.jobs = [j];
    const dep = textOf((attempt(() => C.invoiceHtml(j, 'deposit')).val || {}).html);
    has(dep, 'Deposit Due Now (50%) $10,850 Due upon acceptance, on signing the agreement: services begin once it is received.', '⚠ the deposit\'s page says when, as the agreement does');
    j.payments = [pay('deposit', 10850, 'd1')];
    const mid = textOf((attempt(() => C.invoiceHtml(j, 'midpoint')).val || {}).html);
    has(mid, 'Midpoint Payment Due Now (to 75%) $5,425 Due within 7 calendar days of the invoice date.', 'the midpoint\'s page says seven days');
    has(mid, '75% of the services to date (deposit + this payment) $16,275', '…and the 75% it brings the client to, so the rows add up');
  }

  // ═══ E · A HOME PREP'S OWN STAGE WORDS ═══════════════════════════════════════
  group('E · the agreement email names a Home Prep\'s own stages; the second invoice shows the 75% it brings the client to');
  {
    const C = lift(['buildAgreementEmailHtml', 'buildAgreementEmailText', 'invoiceHtml'], STATE.concat(['_logsState', 'assignedTCContact']),
      Object.assign(BASE(), { estimateStore: { 7: { approved: true, estimate: PREP } }, _logsState: 'ready', assignedTCContact: () => ({ name: 'Ashley Jerome' }) }));
    const j = PJ(); C.jobs = [j];
    const h = textOf(attempt(() => C.buildAgreementEmailHtml(j)).val);
    has(h, '25% once the vendor schedule is booked $1,155', '⚠⚠ the email names the second payment as the agreement and Exhibit A do');
    has(h, '25% at show-ready handover $1,155', '…and the final');
    lacks(h, 'at the midpoint', 'never "at the midpoint" on a Home Prep');
    has(attempt(() => C.buildAgreementEmailText(j)).val, '25% once the vendor schedule is booked: $1,155', 'the text body too');
    C.estimateStore = { 7: { approved: true, estimate: EST_HR } };
    const lh = textOf(attempt(() => C.buildAgreementEmailHtml(LIVING())).val);
    has(lh, '25% at project midpoint $5,425', 'a labour job keeps the midpoint');
    has(lh, '25% on completion $5,425', '…and completion');
    C.estimateStore = { 7: { approved: true, estimate: PREP } };
    const pj = PJ({ payments: [pay('deposit', 2310, 'd1')] });
    const mid = textOf((attempt(() => C.invoiceHtml(pj, 'midpoint')).val || {}).html);
    has(mid, '75% of the fee to date (deposit + this payment) $3,465', '⚠ the 75% row: $4,620 × 0.75');
    has(mid, 'Second Payment Due Now (to 75%) $1,155', '…less the $2,310 received is what it asks');
    lacks(mid, 'Due Now (25%)', 'never a "(25%)" that is 25% of nothing on the page');
  }

  // ═══ F · A FEE-ONLY ESTIMATE AND THE VENDORS FOLD ═════════════════════════════
  group('F · a fee-only estimate offers no discount; the vendors fold opens on an active Home Prep while a vendor is unconfirmed');
  {
    const C = lift(['discountOfferBlocker', 'planVendorsOpenOnLoad'], STATE, Object.assign(BASE(), { estimateStore: { 7: { approved: true, estimate: PREP } } }));
    const j = PJ(); C.jobs = [j];
    has(C.discountOfferBlocker(j), 'no labour to discount', '⚠ a fee-only Home Prep: the discount comes off labour it has none of');
    C.estimateStore = { 7: { approved: true, estimate: EST_HR } };
    eq(C.discountOfferBlocker(LIVING({ agrSent: false, agrSigned: false })), '', 'a labour job before the packet goes: offered');
    C.estimateStore = { 7: { approved: true, estimate: PREP } };
    eq(C.planVendorsOpenOnLoad(7, PJ({ prepSourcing: {} }), PREP), true, '⚠ active, none of three confirmed: the fold opens');
    const all = { Lp1: { status: 'Confirmed' }, Lp2: { status: 'Confirmed' }, Lp3: { status: 'Confirmed' } };
    eq(C.planVendorsOpenOnLoad(7, PJ({ prepSourcing: all }), PREP), false, 'every vendor confirmed: shut');
    eq(C.planVendorsOpenOnLoad(7, LIVING(), Object.assign({}, EST_HR, { vendors: [{ lid: 'v1', type: 'Moving Company' }] })), false, 'an active labour job: shut, as before');
    eq(C.planVendorsOpenOnLoad(7, LIVING({ status: 'won' }), Object.assign({}, EST_HR, { vendors: [{ lid: 'v1', type: 'Moving Company' }] })), true, 'before activation with a line unconfirmed: open, as before');
  }

  // ═══ G · THE SLOT'S CATEGORIES ═════════════════════════════════════════════════
  group('G · a Job Plan slot offers the vendors under the line\'s own category as well as the mapped one');
  {
    const C = lift(['vendorCategoriesForSlot', 'approvedVendorsInCats'], ['vendorDirectory'],
      { vendorDirectory: [{ vendor_name: 'Haul-It Palm Beach', category: 'Junk Removal / Hauling', status: 'Active' }] });
    eq(C.vendorCategoriesForSlot('type', 'Junk Removal / Hauling'), ['Junk Removal & Dumpster', 'Junk Removal / Hauling'], '⚠⚠ the line\'s own category joins the mapped one');
    eq(C.vendorCategoriesForSlot('type', 'Auction House'), ['Auction House'], 'a map entry that already names the label stays one entry');
    eq(C.vendorCategoriesForSlot('type', 'Carpet Cleaning'), ['Carpet Cleaning'], 'the identity fallback is unchanged');
    eq(C.approvedVendorsInCats(C.vendorCategoriesForSlot('type', 'Junk Removal / Hauling')).map((v) => v.vendor_name), ['Haul-It Palm Beach'],
      '⚠ the hauler the estimate priced is offered on its own slot');
  }

  // ═══ H · THE SECOND CONCIERGE ROW ══════════════════════════════════════════════
  group('H · the hours fold\'s second-concierge row follows the estimator\'s pick (Q47), never the engine\'s load check');
  {
    const doc = domStub({ 'log-job': '7' });
    const stubs = Object.assign(BASE(), { document: doc, getAllActiveTC: () => [{ name: 'Ashley Jerome' }], getAllActivePS: () => [],
      getJobCrew: () => ({ confirmed: false, tc: { name: 'Ashley Jerome' }, tc2: null, ps: [] }), _logSelectOptionsHtml: () => '', isJobFunded: () => true });
    const C = lift(['buildLogTeamRows'], STATE.concat(['getAllActiveTC', 'getAllActivePS', 'getJobCrew', '_logSelectOptionsHtml', 'isJobFunded']), stubs);
    C.jobs = [LIVING()];
    C.estimateStore = { 7: { approved: true, estimate: Object.assign({}, EST_HR, { tcCount: 2, needsTC2: false, psSlots: [], psCount: 2 }) } };
    const one = attempt(() => C.buildLogTeamRows());
    ok(one.ok, 'the rows build: ' + (one.err || ''));
    const rowsHtml = () => doc.getElementById('log-team-rows').innerHTML;   // the form writes its rows, it returns nothing
    has(rowsHtml(), 'Transition Concierge', 'fixture: the concierge row is drawn');
    lacks(rowsHtml(), 'Transition Concierge 2', '⚠⚠ the engine\'s tcCount of 2 draws no second-concierge row when the estimator picked one');
    C.estimateStore = { 7: { approved: true, estimate: Object.assign({}, EST_HR, { tcCount: 2, needsTC2: true, psSlots: [], psCount: 2 }) } };
    const two = attempt(() => C.buildLogTeamRows());
    ok(two.ok, 'the rows build with two: ' + (two.err || ''));
    has(rowsHtml(), 'Transition Concierge 2', 'the estimator\'s pick of two draws it');
  }

  // ═══ I · REVIEWED IS READ OFF THE LINE ═══════════════════════════════════════
  group('I · a line a person named and decided on the desk is reviewed; the tick stays for the agent\'s names');
  {
    const C = lift(['invLineReviewed', '_invReviewStats'], [], {});
    const desk = { namedBy: 'desk', objectName: 'Sofa', disposition: 'Donate' };
    eq(C.invLineReviewed(desk), true, '⚠⚠ named and decided on the desk: reviewed');
    eq(C.invLineReviewed({ namedBy: 'desk', objectName: 'Sofa', disposition: '' }), false, 'named, undecided: not yet');
    eq(C.invLineReviewed({ namedBy: 'agent', objectName: 'Sofa', disposition: 'Donate' }), false, 'Agent One\'s name, decided: the tick is still the review');
    eq(C.invLineReviewed({ namedBy: 'agent', objectName: 'Sofa', disposition: 'Donate', reviewed: true }), true, '…and ticked, reviewed');
    eq(C.invLineReviewed({ namedBy: 'desk', objectName: '', disposition: 'Donate' }), false, 'a decided line with no name: not yet');
    eq(C._invReviewStats([desk, { namedBy: 'agent', objectName: 'Lamp', disposition: 'Keep' }]), { done: 1, total: 2, complete: false }, 'the stamp counts the derived review');
    eq(C._invReviewStats([desk, desk]).complete, true, '…and reads REVIEWED once every line is');
  }

  // ═══ J · THE CONFIRMED VENDOR AT CAPTURE ══════════════════════════════════════
  group('J · a line shot in the field takes the confirmed vendor of its kind; a Sell line takes the one selling vendor');
  {
    const est = Object.assign({}, EST_HR, { rooms: [{ idx: 0, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }],
      vendors: [{ lid: 'v1', type: 'Donation Organization' }, { lid: 'v2', type: 'Auction House' }] });
    const job = LIVING({ vendorSourcing: { Lv1: { status: 'Confirmed', vendorName: 'Goodwill Palm Beach' }, Lv2: { status: 'Confirmed', vendorName: 'Kodner Galleries' } } });
    const stubs = Object.assign(BASE(), { jobs: [job], estimateStore: { 7: { approved: true, estimate: est } }, _photoRefs: { 7: [] },
      compressImage: (d, w, q, cb) => cb(d), _doPhotoUpload: () => {}, _savePendingPhotoData: () => {}, savePhotoRefs: () => {}, _scheduleInventorySync: () => {},
      _photoRetryData: {}, _localShotThumbs: {}, invStaffRefused: () => false, _photoCaptureJob: () => job });
    const C = lift(['_captureShot', 'invPlanChannel'], STATE.concat(['compressImage', '_doPhotoUpload', '_savePendingPhotoData', 'savePhotoRefs', '_scheduleInventorySync',
      '_photoRetryData', '_localShotThumbs', 'invStaffRefused', '_photoCaptureJob']), stubs);
    const shot = (disp) => { C._photoRefs[7] = []; const r = attempt(() => C._captureShot(7, 0, 'inventory', 'data:image/jpeg;base64,x', { fieldDisp: disp })); ok(r.ok, 'the shot files: ' + (r.err || '')); return C._photoRefs[7][0] || {}; };
    const d = shot('donate');
    eq([d.disposition, d.channel, d.channelFrom], ['Donate', 'Goodwill Palm Beach', 'plan'], '⚠⚠ a Donate shot takes the confirmed charity at capture');
    const s = shot('sell');
    eq([s.disposition, s.channel], ['Sell', 'Kodner Galleries'], '⚠ a Sell shot takes the one confirmed selling vendor');
    const k = shot('keep');
    eq([k.disposition, k.channel || ''], ['Keep', ''], 'a Keep shot names nobody');
    eq(C.invPlanChannel(job, est, 'Sell'), { name: 'Kodner Galleries' }, 'Sell: the one auction house');
    const two = LIVING({ vendorSourcing: { Lv2: { status: 'Confirmed', vendorName: 'Kodner Galleries' }, Lv3: { status: 'Confirmed', vendorName: 'Sotheby’s' } } });
    eq(C.invPlanChannel(two, Object.assign({}, est, { vendors: est.vendors.concat([{ lid: 'v3', type: 'Estate Sale Company' }]) }), 'Sell').many.length, 2, 'two selling vendors: flagged, never guessed');
  }

  // ═══ K · THE COLLECTION CHIP AND THE CLOSE-UP NOTE ═════════════════════════════
  group('K · arming a walkthrough collection drops the latched chip; a note said over a close-up goes on its item');
  {
    const cam = { open: true, coll: null, detail: true, disp: 'sell' };
    const C = lift(['fieldCamToggleColl'], ['_fieldCamPaint', '_fieldCam'], { _fieldCamPaint: () => {}, _fieldCam: cam });
    C.fieldCamToggleColl('c1');
    eq([cam.coll, cam.detail, cam.disp], ['c1', false, 'undecided'], '⚠⚠ arming the collection: Undecided again, so the walkthrough\'s Auction stands unless a chip is pressed');
    const refs = [{ stableId: 's1', label: 'inventory', roomIdx: 0, fieldNote: '' }, { stableId: 'd1', label: 'detail', groupId: 's1', roomIdx: 0 }];
    const N = lift(['_fieldNoteAppend'], ['savePhotoRefs', '_scheduleInventorySync', '_invTouch', '_photoRefs'],
      { savePhotoRefs: () => {}, _scheduleInventorySync: () => {}, _invTouch: (r) => r, _photoRefs: { 7: refs } });
    eq(N._fieldNoteAppend(7, 'd1', 'promised to Claire'), true, 'a note on the close-up is taken');
    eq([refs[0].fieldNote, refs[1].fieldNote || ''], ['promised to Claire', ''], '⚠⚠ it goes on the item the close-up is of, where the desk and Agent One read it');
    N._fieldNoteAppend(7, 's1', 'Grandmother’s');
    eq(refs[0].fieldNote, 'promised to Claire Grandmother’s', 'a note on the item appends');
  }

  // ═══ L · THE PAPERS ═══════════════════════════════════════════════════════════
  group('L · the papers: the request\'s group initial, an appraiser\'s fee, the worklist, a schedule\'s one signer, the desk head, a Keep line');
  {
    const IT = (id, o) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 0, seq: 1, status: 'uploaded', objectName: 'Sofa', category: 'Furniture',
      ts: Date.UTC(2026, 9, 1), updatedAt: 1, driveFileId: 'f' + id, driveFileUrl: 'https://drive.google.com/file/d/f' + id + '/view', namedBy: 'desk' }, o || {});
    const printed = [];
    const mk = (job, items, extra) => lift(['printApprovalRequest', 'printContentsRecord', 'printTrustSchedule', 'printCourtInventory', '_apprGroups', '_invDocHead', 'clientEstimateHtml'],
      STATE.concat(['_printDocument', 'alert']),
      Object.assign(BASE(), { jobs: [job], _photoRefs: { 7: items }, estimateStore: { 7: { approved: true, estimate: Object.assign({}, EST_HR, { rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }] }) } },
        _printDocument: (h, t) => printed.push(h), alert: (m) => printed.push('ALERT ' + m) }, extra || {}));
    // the request's group initial on a living job: a line with no value is named as such
    const liv = mk(LIVING(), [IT('a', { disposition: 'Donate', channel: 'Goodwill', fmv: '20' }), IT('b', { disposition: 'Donate', channel: 'Goodwill', fmv: '' })]);
    liv.printApprovalRequest(7);
    const rq = textOf(printed.pop() || '');
    has(rq, 'each under $500 or with no value recorded:', '⚠ a group with an unvalued line is never "each under $500"');
    const liv2 = mk(LIVING(), [IT('a', { disposition: 'Donate', channel: 'Goodwill', fmv: '20' }), IT('b', { disposition: 'Donate', channel: 'Goodwill', fmv: '40' })]);
    liv2.printApprovalRequest(7);
    has(textOf(printed.pop() || ''), 'each under $500:', 'every line valued: under $500, as before');
    // the client estimate: an appraiser with no fee typed
    const ce = textOf(attempt(() => liv.clientEstimateHtml(Object.assign({}, EST_HR, { vendors: [{ type: 'Appraiser(s)', cost: 0 }, { type: 'Auction House', cost: 0 }] }), LIVING())).val);
    has(ce, 'Appraiser(s) Quote to follow', '⚠ an appraiser with no fee typed is a quote to follow');
    has(ce, 'Auction House No direct cost', 'an auction house is paid from the proceeds: no direct cost, as before');
    // the worklist drops appraised and waived lines
    const pr = mk(PROBATE(), [IT('p', { objectName: 'Oil on canvas', category: 'Art & Décor', fmv: '7200', valSource: 'Appraisal' }),
      IT('q', { objectName: 'Pearls', category: 'Jewelry & Watches', fmv: '', apprWaived: true, apprWaiveReason: 'under $3,000 at comps' }),
      IT('r', { objectName: 'Bronze', category: 'Art & Décor', fmv: '5000' })]);
    const groups = pr._apprGroups(7);
    const listed = [].concat.apply([], Object.keys(groups).map((k) => groups[k])).map((r) => r.objectName);
    eq(listed, ['Bronze'], '⚠ the worklist carries only the line still to be appraised');
    // a schedule names the one recorded fiduciary (a FINAL schedule: one furniture line, valued)
    const pr2 = mk(PROBATE(), [IT('f', { objectName: 'Sideboard', fmv: '900' })]);
    pr2.printCourtInventory(7);
    const ci = textOf(printed.pop() || '');
    has(ci, 'Reviewed and adopted by: __________________________________ Date: ____________ Michael Brennan · Personal Representative / authorized fiduciary',
      '⚠ the Court Inventory\'s adoption line names the one recorded representative');
    has(ci, 'Estate of Harold Brennan', '⚠⚠ the court-facing paper heads with the estate');
    has(ci, 'Case 50-2026-CP-004412, Circuit Court for Palm Beach County, Florida, Probate Division', '⚠ and names the court beside the case');
    const trustJob = PROBATE({ svc: 'cleanout', matterType: 'trust', probateCase: '', executor: 'Caroline Whitfield-Hayes', executorRole: 'Successor Trustee',
      trustName: 'Eleanor Whitfield Revocable Trust', trustDate: '2015-03-03', name: 'Eleanor Whitfield' });
    const tr = mk(trustJob, [IT('t', { objectName: 'Sideboard', fmv: '900' })]);
    tr.printTrustSchedule(7);
    const ts = textOf(printed.pop() || '');
    has(ts, 'Received for the trust’s records by: __________________________________ Date: ____________ Caroline Whitfield-Hayes · Successor Trustee',
      '⚠ the Trust Schedule\'s receipt line names the one recorded trustee');
    has(ts, 'The Eleanor Whitfield Revocable Trust, dated March 3, 2015 (Eleanor Whitfield)', 'the trust paper heads with the trust, the decedent after it');
    lacks(ts, 'Case ', 'and no case');
    const lh = textOf(liv._invDocHead(LIVING(), 'Contents Record'));
    has(lh, 'Robert Mercer · HVL-0007', 'a living client\'s paper heads with their name');
    const ph = textOf(pr2._invDocHead(PROBATE(), 'Estate Inventory'));
    has(ph, 'Estate of Harold Brennan · HVL-0007 · Case 50-2026-CP-004412, Circuit Court for Palm Beach County, Florida, Probate Division',
      '⚠ the shared head (the report, the request, the ledger) names the estate and the court beside the case');
    // the Contents Record: a Keep line is kept by the client
    const cr = mk(LIVING(), [IT('k', { disposition: 'Keep' }), IT('d', { disposition: 'Donate' })]);
    const out = attempt(() => cr.printContentsRecord(7, { asHtml: true }));
    const crt = textOf(out.val && out.val.html);
    has(crt, 'kept by the client', '⚠ a Keep line reads kept, not "not recorded"');
    has(crt, 'not recorded', 'a Donate line with nobody named still reads not recorded');
  }

  // ═══ M · THE CLOSE AND THE RELEASES CARD ══════════════════════════════════════
  group('M · the close names the rooms not cleared and the leaving lines with nobody named; the Releases card repaints on an edit');
  {
    const refs = [{ stableId: 'a', label: 'inventory', roomIdx: 0, objectName: 'Sofa', disposition: 'Donate', channel: '' },
                  { stableId: 'b', label: 'inventory', roomIdx: 1, objectName: 'Desk', disposition: 'Sell', channel: 'Kodner' }];
    const stubs = Object.assign(BASE(), { estimateStore: { 7: { approved: true, estimate: EST_HR } }, jobPlanStore: { 7: { rooms: { 0: { status: 'cleared' } } } },
      _photoRefs: { 7: refs }, jobCloseBlockers: () => [], ledgerCloseFlag: () => '', confirm: (m) => { stubs.__asked = m; return false; }, alert: (m) => { stubs.__alert = m; } });
    const C = lift(['closeOpenWorkFlag', 'applyJobTransition'], STATE.concat(['jobCloseBlockers', 'ledgerCloseFlag', 'confirm', 'alert', 'saveJobs', 'syncJobToSheets']), stubs);
    const j = LIVING({ payments: [pay('deposit', 10850, 'd1'), pay('midpoint', 5425, 'm1')] });
    C.jobs = [j];
    eq(C.closeOpenWorkFlag(j), '2 of 3 rooms are not marked cleared (Dining, Bedroom). 1 line leaving the property has no recipient recorded.', '⚠⚠ the flag names the open work');
    C.jobPlanStore = { 7: { rooms: { 0: { status: 'cleared' }, 1: { status: 'cleared' }, 2: { status: 'cleared' } } } };
    refs[0].channel = 'Goodwill';
    eq(C.closeOpenWorkFlag(j), '', 'nothing open: nothing said');
    refs[0].channel = '';
    C.jobPlanStore = { 7: { rooms: { 0: { status: 'cleared' } } } };
    eq(C.applyJobTransition(j), false, 'the close asks first (cancelled here)');
    has(stubs.__asked, '2 of 3 rooms are not marked cleared', '⚠⚠ the close question names the rooms');
    has(stubs.__asked, 'Closing does not change them; finish the rooms and name the recipients, or close now.', '…and says it is a flag, not a refusal');
    // the Releases card repaints when a recipient is typed
    const doc = domStub({});
    const estubs = Object.assign(BASE(), { document: doc, _photoRefs: { 7: [Object.assign({}, refs[1], { channel: '' })] }, jobs: [LIVING()],
      estimateStore: { 7: { approved: true, estimate: EST_HR } }, savePhotoRefs: () => {}, _scheduleInventorySync: () => {}, showSyncBadge: () => {},
      _invRefreshSummary: () => {}, _invRefreshGuardrail: () => {}, _invRefreshFlagStrip: () => {}, _invRefreshRecords: () => {}, renderInventoryTab: () => {},
      _renderInvReleasesCard: () => '<div class="card" id="inv-releases">File pickup list</div>', _renderInvRow: () => '' });
    const E = lift(['_invEdit'], STATE.concat(['savePhotoRefs', '_scheduleInventorySync', 'showSyncBadge', '_invRefreshSummary', '_invRefreshGuardrail', '_invRefreshFlagStrip',
      '_invRefreshRecords', 'renderInventoryTab', '_renderInvReleasesCard', '_renderInvRow']), estubs);
    const ed = attempt(() => E._invEdit(7, 'b', 'channel', { value: 'Palm Beach Estate Buyers' }));
    ok(ed.ok, 'the edit runs: ' + (ed.err || ''));
    eq(doc.getElementById('inv-releases').outerHTML, '<div class="card" id="inv-releases">File pickup list</div>', '⚠ typing the buyer repaints the Releases card, so File pickup list appears at once');
  }

  process.env.TZ = prevTZ;
};
