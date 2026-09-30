'use strict';
// P16 · W2, payments and integrations (2026-09-30). Anthony's answers of 2026-09-30 and the known-bug list.
//
//   CARD  Anthony: no card payments. The recorder offered Card and cleared it on receipt; the handler took one.
//   B5    (a) a bank transfer recorded by hand was recorded AGAIN when Stripe reported it; (b) nothing cleared a
//         cheque or a transfer recorded by hand; (c) nothing removed a payment. A void is a recorded act, and
//         ONE predicate (paymentCounts) takes it out of every total. The sheet keeps a void and a clear from
//         either copy (_paymentSticky), so a stale device that touches the same payment cannot undo them.
//   B15   Stripe's own record was cleared on the day the client AUTHORISED the debit, days before it settled.
//   B16   a DocuSign signature was dated the day the ENVELOPE completed (Havellin's countersignature), and the
//         client's own date and email the backend returns were dropped.
//   B6    a Gmail draft that failed and fell back to a plain email recorded nothing, so the send could never be
//         confirmed; the estimate's old "recorded as sent" handler had no caller.
//   B7    after Edit estimate, "Filed estimate" still opened the pre-edit copy.
//   B17   the manager's decision email to the concierge still opened `mailto:`.
//   B20   sendInternalEmail's "Gmail is not set up" branch could not run.
//   B26   two editor-only Drive functions needed an argument the Run menu cannot pass; a comment named the
//         wrong project for the DocuSign keys.
//   and four stale lines: esignArchiveSigned, revokeAgreementApproval, GMAIL_SCOPE, ensureAgreementApproved.
//
// Every group drives the REAL functions (the app's through the harness, the backend's out of main-sync.gs),
// and the joins are driven too: the app's void through the server's merge, the backend's Stripe answer through
// the app's recorder, a failed Gmail draft through to "I've sent it".

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sandbox, domStub, fn, decl, source, matchBrace } = require('./harness');

const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
function gsFn(name) {
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(GS);
  if (!m) throw new Error('not in main-sync.gs: ' + name);
  const start = m.index + (m[1] ? m[1].length : 0);
  const open = GS.indexOf('{', re.lastIndex);
  return GS.slice(start, matchBrace(GS, open) + 1);
}
function gsVar(name) {
  const m = GS.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[\\s\\S]*?;)\\n'));
  if (!m) throw new Error('var not in main-sync.gs: ' + name);
  return m[2];
}
const live = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

// A fixed clock: 2pm Eastern on 30 September. `new Date()` with no argument is the pinned instant; with one it
// is the real constructor. TZ is set for the date groups and restored, so no other suite runs in Eastern.
const realDate = Date;
const NOW = realDate.parse('2026-09-30T18:00:00Z');
function clockAt(ms) {
  function Fake(...a) {
    if (!new.target) return new realDate(ms).toString();
    return a.length ? new realDate(...a) : new realDate(ms);
  }
  Fake.prototype = realDate.prototype;
  Fake.now = () => ms; Fake.parse = realDate.parse; Fake.UTC = realDate.UTC;
  return Fake;
}
function inZone(body) {
  const prev = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try { return body(); } finally { process.env.TZ = prev; }
}

// ─── THE PAYMENT SANDBOX ─────────────────────────────────────────────────────
// The real recorder, the real totals, the real list, the real cleared and void handlers, and the real
// _saveJobEdit / _jobTouch pair, so what is stamped is what the app stamps.
const PAY_FNS = ['saveDeposit', 'paymentStageLabel', 'paymentStageWord', 'jobPayments', 'paymentCounts', '_paymentKey',
  '_jobPaymentByKey', 'stagePaidTotal', 'jobPaidTotal', 'depositPaidTotal', 'depositClearedTotal', 'isJobFunded',
  'depositTargetFor', 'paymentMethodLabel', 'updateDepModalHints', 'currentDepStage', '_photoUid', 'fmt',
  'closeoutRetainedTotal', 'jobIsSettled', 'markPaymentCleared', 'openVoidPayment', 'closeVoidPayment',
  'confirmVoidPayment', 'paymentVoidEffect', 'paymentSummaryText', 'jobPaymentsListHtml', '_jobTouch', '_saveJobEdit',
  '_todayStr', '_ymdLocal', '_localDateOf', 'fmtDate2', 'esc'];
const PAY_VARS = ['DOC_STAGE_WORD', 'PAYMENT_STAGES', 'PAYMENT_STAGE_LABELS', 'PAYMENT_METHODS_CLEAR_ON_RECEIPT',
  'PAYMENT_METHODS_RECORDABLE', '_photoUidSeq', 'LARGE_DEPOSIT_THRESHOLD'];
const TOTAL = 25715, DEPOSIT = 12858;   // the estate this project always works: 50% is $12,858

function payBox(opts) {
  const o = opts || {};
  const job = Object.assign({ id: 1, name: 'Butler', hvlId: 'HVL-0007', svc: 'cleanout', status: 'active',
    agrApprovedBy: 'Anthony Graziano', payments: [] }, o.job || {});
  const doc = domStub(Object.assign({ 'dep-amount': String(DEPOSIT), 'dep-date': '2026-09-28', 'dep-method': 'check',
    'dep-reference': '#1042', 'dep-payer': 'Pressly Family Trust', 'dep-stage': 'deposit' }, o.seed || {}));
  const seen = { fb: [], notices: [], synced: 0, saved: 0, redrawn: 0, confirms: [], badges: [] };
  const ctx = sandbox({
    fns: PAY_FNS, vars: PAY_VARS,
    stubs: {
      Date: clockAt(NOW), document: doc, jobs: [job],
      estimateStore: { 1: { approved: true, estimate: { havellinTotal: TOTAL } } },
      confirm: (m) => { seen.confirms.push(String(m)); return o.decline ? false : true; },
      _agrJob: () => job, _actor: (j) => (j && j.agrApprovedBy) || '',
      showFB: (id, kind, msg) => seen.fb.push({ id, kind, msg: String(msg) }), _dashFbTarget: (x) => x,
      saveJobs: () => { seen.saved++; }, syncJobToSheets: () => { seen.synced++; },
      updateAgrUI() {}, renderJobs() {}, loadInvoice() {}, _attachPaymentEvidence() {},
      dashNotice: (type, msg) => seen.notices.push({ type, msg: String(msg) }),
      _dashRedraw: () => { seen.redrawn++; },
    },
  });
  return { ctx, job, doc, seen };
}
function record(method, over) {
  const b = payBox({ seed: Object.assign({ 'dep-method': method }, over || {}) });
  inZone(() => b.ctx.saveDeposit());
  return Object.assign(b, { pay: b.job.payments[b.job.payments.length - 1] });
}

// Every top-level function in the app whose LIVE body calls `name(` — one pass over the file, so a new reader
// is found by the scan and has to be classified by a person, not by whoever happened to write it.
// A reference counts, not only a call: `.filter(paymentCounts)` reads the predicate as surely as a call does.
function callersOf(name) {
  const src = source();
  const re = /(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g;
  const out = [];
  const call = new RegExp('(^|[^A-Za-z0-9_$.\'"])' + name.replace(/\$/g, '\\$') + '(?![A-Za-z0-9_$])');
  let m;
  while ((m = re.exec(src))) {
    const open = src.indexOf('{', re.lastIndex);
    const close = matchBrace(src, open);
    if (close < 0) continue;
    const body = live(src.slice(open, close + 1));
    if (m[2] !== name && call.test(body)) out.push(m[2]);
  }
  return out.sort();
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ═══════════════════════════════════════════════════════════════════════════
  group('CARD · the recorder offers none, and the handler refuses one whatever the field holds');
  {
    const a = src.indexOf('<select id="dep-method"');
    const sel = a >= 0 ? src.slice(a, src.indexOf('</select>', a)) : '';
    ok(sel.length > 100 && sel.length < 3000, 'the recorder\'s method select was found (' + sel.length + ' chars)');
    const opts = [...sel.matchAll(/<option value="([^"]*)"/g)].map((x) => x[1]).filter(Boolean);
    const { ctx } = payBox();
    eq(opts, ctx.PAYMENT_METHODS_RECORDABLE, 'the select offers exactly PAYMENT_METHODS_RECORDABLE, in its order');
    ok(opts.indexOf('stripe') < 0, '⚠⚠ no Card option (Anthony, 2026-09-30: no card payments)');
    lacks(sel, '>Card<', 'and no Card label');
    ok(ctx.PAYMENT_METHODS_CLEAR_ON_RECEIPT.indexOf('stripe') < 0, 'a card is off the clear-on-receipt list');
    ok(ctx.PAYMENT_METHODS_CLEAR_ON_RECEIPT.indexOf('stripe_ach') < 0, 'and ACH never joins it');
    eq(ctx.PAYMENT_METHODS_CLEAR_ON_RECEIPT.slice().sort(), ['cash', 'wire'], 'wire and cash are still money on receipt');

    // ⚠⚠ ENFORCED WHERE THE PAYMENT IS WRITTEN. A screen from an older build, or a value set any other way,
    // put `stripe` in the field and saveDeposit wrote it — cleared on receipt.
    const card = record('stripe');
    eq(card.job.payments.length, 0, '⚠⚠ a card payment is refused: nothing is written');
    has((card.seen.fb[0] || {}).msg, 'Card payments are not accepted', 'and the recorder says why');
    eq(card.seen.synced, 0, 'nothing is synced');
    const odd = record('bitcoin');
    eq(odd.job.payments.length, 0, 'an unknown method is refused too');
    eq((odd.seen.fb[0] || {}).msg, 'Select how it was paid.', 'as an unchosen one is');
    ['check', 'cashiers_check', 'wire', 'stripe_ach', 'cash'].forEach((m) =>
      eq(record(m).job.payments.length, 1, m + ' still records'));
    eq(record('wire').pay.clearedOn, '2026-09-28', 'a wire is still cleared on receipt');
    eq(record('check').pay.clearedOn, null, 'a cheque is still uncleared');

    // ⚠ A PAYMENT RECORDED AS A CARD BEFORE TODAY KEEPS WHAT IT WAS RECORDED WITH.
    const old = payBox({ job: { payments: [{ id: 1, uid: 'u-card', stage: 'deposit', amount: DEPOSIT, method: 'stripe',
      receivedOn: '2026-09-02', clearedOn: '2026-09-02', recordedBy: 'Anthony Graziano' }] } });
    eq(old.ctx.paymentMethodLabel('stripe'), 'Card', 'a legacy card record still reads Card');
    eq(old.ctx.depositClearedTotal(old.job), DEPOSIT, 'and keeps the cleared state it was recorded with');
    ok(old.ctx.isJobFunded(old.job), 'and still funds the job');
    const lh = inZone(() => old.ctx.jobPaymentsListHtml(old.job));
    has(lh, 'Card', 'the payments list names it a card');
    has(lh, 'Cleared Sep 2, 2026', 'cleared on the day it was recorded');
    lacks(lh, 'markPaymentCleared', 'so it offers no Mark cleared');

    // ⚠ A DEPOSIT FROM BEFORE PAYMENT RECORDS (a bare `depositReceived`) is migrated at the 50% target by
    // jobPayments: nobody counted that money, and the list must not print it as though somebody had.
    const legacy = payBox({ job: { payments: undefined, depositReceived: true, depositReceivedAt: '2026-08-20' } });
    const lg = inZone(() => legacy.ctx.jobPaymentsListHtml(legacy.job));
    has(lg, '>$12,858</span> · Deposit (50%) · received Aug 20, 2026 · amount inferred — predates payment records',
        'a migrated deposit says its amount was inferred, as the recorder does');
    lacks(lg, ' · — ', 'and prints no blank method');
    has(lg, 'openVoidPayment(1,\'1\')', 'and it can still be voided, keyed on its id, if the inference was wrong');
    eq(legacy.ctx.paymentSummaryText(legacy.job, legacy.job.payments[0]), '$12,858 payment on the deposit, received Aug 20, 2026',
       'and the dialogs call it a payment, never "—"');

    // Person-entered text on the list is text: the payer and a void's reason are escaped (the list is innerHTML).
    const tags = payBox({ job: { payments: [
      { id: 1, uid: 'e1', stage: 'deposit', amount: 500, method: 'check', clearedOn: null, payer: '<b>Pressly</b> & Sons' },
      { id: 2, uid: 'e2', stage: 'deposit', amount: 700, method: 'check', clearedOn: null, payer: 'Vale',
        voidedAt: '2026-09-29T15:00:00.000Z', voidedBy: 'Anthony Graziano', voidReason: '<i>typed</i> twice' }] } });
    const th = inZone(() => tags.ctx.jobPaymentsListHtml(tags.job));
    has(th, '&lt;b&gt;Pressly&lt;/b&gt; &amp; Sons', 'the payer is escaped');
    has(th, '&lt;i&gt;typed&lt;/i&gt; twice', 'and so is a void\'s reason');
    lacks(th, '<b>', 'no markup a person typed reaches the page');
    lacks(th, '<i>', 'none');

    // A key the app did not mint (a row edited by hand in the sheet) never goes into an onclick: the payment gets
    // no controls rather than a broken or injected one.
    const oddKey = payBox({ job: { payments: [{ id: 1, uid: "u'1", stage: 'deposit', amount: 500, method: 'check', clearedOn: null }] } });
    const ok1 = inZone(() => oddKey.ctx.jobPaymentsListHtml(oddKey.job));
    has(ok1, 'Uncleared', 'fixture: the payment is listed');
    lacks(ok1, 'markPaymentCleared(', 'a key that could break out of the onclick gets no Mark cleared');
    lacks(ok1, 'openVoidPayment(', 'nor Void');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('B5(b) · Mark cleared: the bank confirmed a cheque, and a person says so');
  {
    const b = record('check');
    const key = b.ctx._paymentKey(b.pay);
    ok(!!key && key === b.pay.uid, 'a payment is keyed on its uid, the key the sheet merges it on');
    eq(b.pay.clearedOn, null, 'fixture: a personal cheque, uncleared');
    let lh = inZone(() => b.ctx.jobPaymentsListHtml(b.job));
    has(lh, 'Uncleared', 'the list says so');
    has(lh, 'markPaymentCleared(1,\'' + key + '\')', 'and offers Mark cleared on it');
    const before = b.job.updatedAt;
    b.job.updatedAt = 1;   // an old clock, so the move is visible
    // ⚠ And an old stamp on the payment: the fixture recorded it on this same pinned instant, so without this the
    // recording's own stamp would pass the check below whether or not the clear stamps anything.
    b.job.at['payments:' + key] = 1;
    inZone(() => b.ctx.markPaymentCleared(1, key));
    has(b.seen.confirms[0] || '', '$12,858 personal cheque on the deposit, received Sep 28, 2026, from Pressly Family Trust',
        'it asks first, naming the payment');
    eq(b.pay.clearedOn, '2026-09-30', '⚠⚠ cleared today, on the local calendar');
    eq(b.pay.clearedBy, 'Anthony Graziano', 'attributed as a payment\'s recordedBy is (_actor)');
    ok(b.job.at && b.job.at['payments:' + key] === NOW, '⚠ stamped on the payment\'s own key, or the other device merges it away');
    ok(b.job.updatedAt === NOW && b.seen.synced >= 2, 'a person\'s edit: the job\'s clock moves and it syncs');
    eq(b.ctx.depositClearedTotal(b.job), DEPOSIT, 'the deposit now reads cleared');
    eq(b.ctx.depositPaidTotal(b.job), DEPOSIT, 'and no money moved');
    has((b.seen.notices.pop() || {}).msg, 'Marked cleared Sep 30, 2026', 'and it says what it did');
    lh = inZone(() => b.ctx.jobPaymentsListHtml(b.job));
    has(lh, 'Cleared Sep 30, 2026 · Anthony Graziano', 'the list shows when and who');
    lacks(lh, 'markPaymentCleared', 'and Mark cleared is gone');
    void before;

    // Declined, nothing is written.
    const d = payBox({ decline: true });
    inZone(() => d.ctx.saveDeposit());
    const dk = d.ctx._paymentKey(d.job.payments[0]);
    const syncs = d.seen.synced;
    inZone(() => d.ctx.markPaymentCleared(1, dk));
    eq(d.job.payments[0].clearedOn, null, 'a declined question clears nothing');
    eq(d.seen.synced, syncs, 'and syncs nothing');
    // Refused where it is written, whatever the screen offered.
    inZone(() => b.ctx.markPaymentCleared(1, key));
    has((b.seen.notices.pop() || {}).msg, 'already recorded as cleared', 'a second press is refused and says so');
    inZone(() => b.ctx.markPaymentCleared(1, 'nope'));
    has((b.seen.notices.pop() || {}).msg, 'no longer on this job', 'an unknown payment is refused');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('B5(c) · Void: a recorded act, the record stays, and it counts toward nothing');
  {
    const b = record('check');
    const key = b.ctx._paymentKey(b.pay);
    ok(b.ctx.isJobFunded(b.job) && b.job.depositReceived === true, 'fixture: a $12,858 cheque funds the job');
    let lh = inZone(() => b.ctx.jobPaymentsListHtml(b.job));
    has(lh, 'openVoidPayment(1,\'' + key + '\')', 'the list offers Void on it');

    inZone(() => b.ctx.openVoidPayment(1, key));
    const D = (id) => b.doc.getElementById(id);
    eq(D('pay-void-modal').style.display, 'flex', 'the Void dialog opens');
    has(D('pv-summary').textContent, '$12,858 personal cheque on the deposit', 'naming the payment');
    const eff = D('pv-effect').innerHTML;
    has(eff, '$12,858 comes off the deposit, leaving $0 of the $12,858 due recorded against it.',
        '⚠⚠ it says what the void does to the money BEFORE anything is written');
    has(eff, 'The job is no longer funded: hours cannot be logged on it until the deposit is recorded again.',
        '⚠ including the consequence a person would not guess');
    has(eff, 'Received on the job in all: $0.', 'and the job\'s received total');

    // No reason, no void.
    D('pv-reason').value = '   ';
    inZone(() => b.ctx.confirmVoidPayment());
    has((b.seen.fb.pop() || {}).msg, 'Say why it is being voided', 'a blank reason is refused');
    ok(!b.pay.voidedAt && b.ctx.isJobFunded(b.job), 'and nothing is voided');

    b.job.updatedAt = 1;
    b.job.at['payments:' + key] = 1;   // not the recording's own stamp (same pinned instant), or the check below proves nothing
    D('pv-reason').value = 'Cheque returned unpaid';
    inZone(() => b.ctx.confirmVoidPayment());
    ok(b.job.payments.length === 1 && b.job.payments[0] === b.pay, '⚠⚠ the record STAYS — a void is never a deletion');
    eq(b.pay.voidedAt, new realDate(NOW).toISOString(), 'with when');
    eq(b.pay.voidedBy, 'Anthony Graziano', 'who');
    eq(b.pay.voidReason, 'Cheque returned unpaid', 'and why');
    eq(b.pay.amount, DEPOSIT, 'and the amount is untouched');
    eq(D('pay-void-modal').style.display, 'none', 'the dialog closes');
    ok(b.job.at && b.job.at['payments:' + key] === NOW, '⚠ stamped on the payment\'s key');
    ok(b.job.updatedAt === NOW, 'and the job\'s clock moves (a person\'s edit)');

    eq(b.ctx.depositPaidTotal(b.job), 0, '⚠⚠ the deposit no longer counts it');
    eq(b.ctx.stagePaidTotal(b.job, 'deposit'), 0, 'stagePaidTotal');
    eq(b.ctx.jobPaidTotal(b.job), 0, 'jobPaidTotal');
    eq(b.ctx.depositClearedTotal(b.job), 0, 'depositClearedTotal');
    eq(b.ctx.closeoutRetainedTotal(b.job), 0, 'closeoutRetainedTotal');
    ok(!b.ctx.isJobFunded(b.job), '⚠⚠ isJobFunded: the job is no longer funded');
    eq(b.job.depositReceived, false, 'and the derived mirror the activation gate reads follows it');
    eq(b.job.depositReceivedAt, '', '⚠ and the day the rail prints on "Deposit received" no longer names the voided cheque');
    const n = b.seen.notices.pop() || {};
    has(n.msg, 'Voided: $12,858 personal cheque on the deposit', 'the notice names the payment');
    has(n.msg, 'Reason: Cheque returned unpaid.', 'the reason');
    has(n.msg, 'The job is no longer funded', '⚠ and what it did to the money');
    eq(n.type, 'warn', 'as a warning, since money moved');

    lh = inZone(() => b.ctx.jobPaymentsListHtml(b.job));
    has(lh, 'jt-pay void', 'the list keeps it, marked void');
    has(lh, 'Void Sep 30, 2026 · Anthony Graziano — Cheque returned unpaid', 'with when, who and why');
    lacks(lh, 'openVoidPayment', 'and no second Void');
    lacks(lh, 'markPaymentCleared', 'nor Mark cleared: a void is not money');

    // Refused where it is written, whatever the screen offered.
    D('pv-job').value = '1'; D('pv-key').value = key; D('pv-reason').value = 'again';
    inZone(() => b.ctx.confirmVoidPayment());
    has((b.seen.fb.pop() || {}).msg, 'already void', 'a second void is refused');
    eq(b.pay.voidReason, 'Cheque returned unpaid', 'and the first reason stands');
    inZone(() => b.ctx.markPaymentCleared(1, key));
    has((b.seen.notices.pop() || {}).msg, 'void, so there is nothing to clear', 'Mark cleared refuses a void');
    inZone(() => b.ctx.openVoidPayment(1, key));
    has((b.seen.notices.pop() || {}).msg, 'already void', 'and the dialog will not open on one');

    // The recorder's own list at that stage keeps it, struck through, and never "uncleared".
    const prior = sandbox({ fns: ['onDepStageChange', 'paymentCounts', 'jobPayments', 'stagePaidTotal', 'depositTargetFor', 'paymentStageWord',
      'paymentMethodLabel', 'currentDepStage', 'fmt', 'esc'], vars: ['DOC_STAGE_WORD', 'PAYMENT_STAGES'],
      stubs: { document: b.doc, _agrJob: () => b.job, estimateStore: { 1: { estimate: { havellinTotal: TOTAL } } },
        updateDepModalHints() {}, invoiceHtml: () => null } });
    b.doc.getElementById('dep-stage').value = 'deposit';
    prior.onDepStageChange();
    const pr = b.doc.getElementById('dep-prior').innerHTML;
    has(pr, '<s>$12,858</s>', 'the recorder lists the void, struck through');
    has(pr, '>void<', 'marked void');
    lacks(pr, 'uncleared', 'never as uncleared money');
    eq(b.doc.getElementById('dep-amount').value, DEPOSIT, '⚠ and it prefills the whole deposit again: the void is not money received');

    // A void on a CLOSED-RETAINED job says what it does to the amount kept; one on a final unsettles it.
    const r = payBox({ job: { status: 'closed_retained', payments: [
      { id: 1, uid: 'r1', stage: 'deposit', amount: 2000, method: 'wire', clearedOn: '2026-09-02' },
      { id: 2, uid: 'r2', stage: 'deposit', amount: 500, method: 'cash', clearedOn: '2026-09-03' }] } });
    has(r.ctx.paymentVoidEffect(r.job, r.job.payments[1]), 'The amount this closed job records as retained becomes $2,000.',
        'voiding part of a retained job names the new retained figure');
    const f = payBox({ job: { payments: [
      { id: 1, uid: 'f1', stage: 'deposit', amount: DEPOSIT, method: 'wire', clearedOn: '2026-09-02' },
      { id: 2, uid: 'f2', stage: 'final', amount: 6429, method: 'wire', clearedOn: '2026-09-20' }] } });
    ok(f.ctx.jobIsSettled(f.job), 'fixture: the final is paid, so the job is settled');
    has(f.ctx.paymentVoidEffect(f.job, f.job.payments[1]), 'The final payment reads unpaid again.', 'voiding it says the final reopens');
    f.job.payments[1].voidedAt = '2026-09-30T18:00:00.000Z';
    ok(!f.ctx.jobIsSettled(f.job), '⚠ and jobIsSettled agrees once it is void');
    eq(f.ctx.paymentVoidEffect(f.job, f.job.payments[1]), '', 'a void has no further effect to describe');

    // A deposit typed twice: voiding the duplicate leaves the job funded by the first, and the deposit's day is
    // that payment's — the one the rail prints — not the voided duplicate's.
    const two = payBox({ job: { depositReceived: true, depositReceivedAt: '2026-09-28', payments: [
      { id: 1, uid: 't1', stage: 'deposit', amount: DEPOSIT, method: 'wire', receivedOn: '2026-09-20', clearedOn: '2026-09-20' },
      { id: 2, uid: 't2', stage: 'deposit', amount: DEPOSIT, method: 'wire', receivedOn: '2026-09-28', clearedOn: '2026-09-28' }] } });
    has(two.ctx.paymentVoidEffect(two.job, two.job.payments[1]), 'leaving $12,858 of the $12,858 due recorded against it',
        'fixture: the dialog says the deposit is still whole');
    inZone(() => two.ctx.openVoidPayment(1, 't2'));
    two.doc.getElementById('pv-reason').value = 'Recorded twice';
    inZone(() => two.ctx.confirmVoidPayment());
    ok(!!two.job.payments[1].voidedAt, 'the duplicate is void');
    ok(two.ctx.isJobFunded(two.job) && two.job.depositReceived === true, 'and the job is still funded by the first');
    eq(two.job.depositReceivedAt, '2026-09-20', '⚠ the deposit\'s day is the payment that still counts, not the voided duplicate');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('B5(c) · the invoices read what counts: a voided cheque is not money received');
  {
    // The real invoice, over the real payment helpers — the "received" row and the final's balance.
    const IFNS = ['estTolerancePctTxt', 'paymentStageWord', 'finalAwaitsHours', 'invoiceHtml', 'docSentAt', 'paymentSplit', 'rushScopeLine',
      'rushCrewAdded', 'jobLogEntries', 'invFinalApproval', 'invFinalApprovalRecord', 'docKeyFor', 'coHours', 'coHoursTotal', 'coBaselineShift',
      'coPrice', 'coPriceTotal', 'coHoursLabel', '_coMoney', 'fmt', 'getVendorActuals', '_srcLineKey', 'samePerson', 'canonPersonName',
      '_invVendorFeeSentence', 'prepFeeRate', 'vendorGroupOfLine', 'resolveJobVendor', 'coordHrsFor', 'prepLineTCHrs', 'vendorLineTCHrs',
      'esc', 'fmtDate2', 'svcLabelOf', 'conciergePhones', 'conciergePhonesText', 'assignedTCContact', 'vendorCats', 'vendorPrimaryCat',
      'estimateIsFeeOnly', 'isDecedentJob', 'stagePaidTotal', 'jobPaidTotal', 'jobPayments', 'paymentCounts', 'discountOnLabor', 'estFixedFee',
      'estPrepFeeOnTop', 'estFixedLines', 'discountOnFixedFee', 'fixedDiscountBasisWords', 'rushBaseWords', 'coRushPct', 'coVendorAdds',
      'coVendorAddsTxt', 'jobPrepLines', 'coPrepVendorLines', 'finalCrewOnlyWarn', 'coBaselineMove', 'agrBillingRates', 'estDeclutterHrs'];
    const IVARS = ['DOC_STAGE_WORD', 'EST_TOLERANCE_PCT', 'SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'DEPT_EMAILS', 'HAVELLIN_OFFICE_PHONE',
      'NON_MOBILE_NUMBERS', 'DEFAULT_CONTRACTORS', 'COORD_TOUCHES', 'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES_DEFAULT', 'TOUCH_HRS',
      'DECEDENT_SERVICES', 'PERSON_NAME_ALIASES', 'PREP_FEE_RATE'];
    const EST = { jobId: 1, tcFee: 12000, psFee: 6000, pkgCost: 1940, smf: 0, prepFee: 0, havellinTotal: 19940, havellinTotalFull: 19940,
      tcRate: 150, psRate: 100, discountPct: 0, discountAmt: 0, fixedPrice: false, rush: false, vendors: [], prepItems: [],
      preparedBy: 'Anthony Graziano', svc: 'cleanout', totTC: 80, totPS: 60 };
    const LOGS = [{ date: '2026-09-01', activity: 'clearance', members: [{ name: 'Anthony Graziano', role: 'TC', hours: 80 }, { name: 'Crew', role: 'PS', hours: 60 }] }];
    const inv = (payments) => {
      const c = sandbox({ fns: IFNS, vars: IVARS, stubs: { jobLogs: { 1: LOGS }, estimateStore: { 1: { estimate: EST, approved: true, approvedBy: 'Anthony Graziano' } },
        changeOrders: [], contractors: [], currentEstimate: null, currentInvStage: 'final', vendorDirectory: [], jobPlans: {} } });
      return c.invoiceHtml({ id: 1, hvlId: 'HVL-0007', client: 'Butler Estate', svc: 'cleanout', address: '69 Beach Blvd', tc: 'Anthony Graziano',
        status: 'active', executor: 'Tripp Butler', payments: payments }, 'final');
    };
    const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const good = { id: 1, uid: 'g', stage: 'deposit', amount: 9970, method: 'wire', clearedOn: '2026-09-01' };
    const bounced = { id: 2, uid: 'b', stage: 'midpoint', amount: 4985, method: 'check', clearedOn: null,
      voidedAt: '2026-09-20T15:00:00.000Z', voidedBy: 'Anthony Graziano', voidReason: 'returned unpaid' };
    const withVoid = inv([good, bounced]);
    const without = inv([good]);
    eq(Math.round(withVoid.amtDue), Math.round(without.amtDue), '⚠⚠ the final bills as if the bounced cheque had never been recorded');
    eq(Math.round(withVoid.amtDue), 19940 - 9970, 'the whole job less what really arrived');
    has(text(withVoid.html), '$9,970', 'the received row prints what counts');
    lacks(text(withVoid.html), '$14,955', 'and never the voided cheque added in');
    // The converse, so the void is what moved it: the same cheque live is money.
    const liveCheque = Object.assign({}, bounced); delete liveCheque.voidedAt;
    eq(Math.round(inv([good, liveCheque]).amtDue), 19940 - 9970 - 4985, 'the same cheque, not voided, is credited');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('B5(c) · ONE predicate, and every reader of the payment list is accounted for');
  {
    // ⚠ Counted from the source, so a new total that reads the list without paymentCounts is found here.
    // Two kinds of reader: those that SUM or GATE (they must ask paymentCounts), and those that deal in records
    // by design (mint an id, look one up, list voids, dedupe Stripe intents, build a what-if copy).
    // (confirmVoidPayment re-derives the deposit's day from the deposit payments that still count.)
    const SUMS = ['confirmVoidPayment', 'depositClearedTotal', 'jobPaidTotal', 'stagePaidTotal', 'updateAgrUI'];
    const RECORDS = ['_jobPaymentByKey', '_stripeHandMatch', '_stripeRecordPayment', 'applyStripePayments', 'jobPaymentsListHtml',
      'onDepStageChange', 'outstandingPayments', 'paymentVoidEffect', 'saveDeposit'];
    eq(callersOf('jobPayments'), SUMS.concat(RECORDS).sort(),
       '⚠⚠ these, and only these, read the payment list — a new reader must be classified here');
    SUMS.forEach((f) => has(live(fn(f)), 'paymentCounts', f + ' sums only what counts'));
    // The two record-level readers that still ask a money question do it through the one predicate.
    has(live(fn('_stripeHandMatch')), '_handAchAwaitingStripe(x)', '_stripeHandMatch matches only a payment that counts');
    has(live(fn('outstandingPayments')), '_handAchAwaitingStripe(p)', 'and outstandingPayments watches only for one');
    has(live(fn('_handAchAwaitingStripe')), 'paymentCounts(p)', 'through paymentCounts');
    eq(callersOf('paymentCounts'), ['_handAchAwaitingStripe', 'confirmVoidPayment', 'depositClearedTotal', 'jobPaidTotal', 'jobPaymentsListHtml',
      'markPaymentCleared', 'onDepStageChange', 'openVoidPayment', 'paymentVoidEffect', 'stagePaidTotal', 'updateAgrUI'],
      'and paymentCounts has exactly these readers');
    eq(live(fn('paymentCounts')).replace(/\s+/g, ' '), 'function paymentCounts(p) { return !!p && !p.voidedAt; }', 'the predicate itself: a void does not count');
    // Nothing reads a job's array around the accessor. The three lines allowed are jobPayments itself, the what-if
    // copy paymentVoidEffect builds FROM the accessor, and Stripe's answer (`d.payments`), which is not a job.
    const ALLOWED = [/job\.payments = out;/, /Array\.isArray\(job\.payments\)\) return job\.payments;/,
      /without\.payments = jobPayments\(job\)\.filter/, /\(d\.payments \|\| \[\]\)\.forEach/];
    const direct = src.split('\n').filter((l) => !l.trim().startsWith('//') && /\b[A-Za-z_$]+\.payments\b/.test(l)
      && !ALLOWED.some((re) => re.test(l)));
    eq(direct.map((l) => l.trim().slice(0, 90)), [], 'no live line reads a job\'s .payments except through jobPayments');
    eq(ALLOWED.map((re) => src.split('\n').filter((l) => re.test(l)).length), [1, 1, 1, 1], 'and each allowed line is there exactly once');
    // The totals everything else reads are the three that filter — each reader of them is covered.
    ['isJobFunded', 'closeoutRetainedTotal', 'jobIsSettled', 'depositPaidTotal'].forEach((f) =>
      ok(/stagePaidTotal\(|jobPaidTotal\(|depositPaidTotal\(/.test(live(fn(f))), f + ' reads a filtered total'));
    has(live(fn('invoiceHtml')), 'jobPaidTotal(job)', 'the invoice reads the filtered job total');
    has(live(fn('invoiceHtml')), "stagePaidTotal(job, 'deposit')", 'and the filtered deposit');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('B5 · the sheet keeps a void and a clear against a stale device (the app\'s edit, through the real merge)');
  {
    const S = { Date, JSON, Math, Number, String, Object, Array };
    vm.createContext(S);
    vm.runInContext([gsVar('JOB_KEYED_LISTS'), gsVar('JOB_KEYED_MAPS'), gsVar('JOB_LIST_KEY'), gsVar('JOB_PAYMENT_STICKY'),
      gsFn('_paymentSticky'), gsFn('_jobStamp'), gsFn('_jobListKey'), gsFn('_mergeJobKeyed'), gsFn('_mergeJobRecord')].join('\n\n'), S);
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const T1 = 1000, T3 = NOW + 5000, T4 = NOW + 9000;

    // The morning copy both devices hold: a cheque recorded at T1, stamped on its key.
    const morning = { id: 1, name: 'Butler', updatedAt: T1, notes: 'am', at: { 'payments:u-chq': T1 },
      payments: [{ id: 1, uid: 'u-chq', stage: 'deposit', amount: DEPOSIT, method: 'check', clearedOn: null }] };
    // Device A voids it through the REAL app handler.
    const A = payBox({ job: clone(morning) });
    const D = (id) => A.doc.getElementById(id);
    inZone(() => A.ctx.openVoidPayment(1, 'u-chq'));
    D('pv-reason').value = 'Cheque returned unpaid';
    inZone(() => A.ctx.confirmVoidPayment());
    ok(!!A.job.payments[0].voidedAt && A.job.at['payments:u-chq'] === NOW, 'fixture: device A voided it through the real handler, stamped');

    // Device B never reloaded: it saves an unrelated edit later, carrying the cheque live at its morning stamp.
    const Bstale = clone(morning); Bstale.notes = 'pm'; Bstale.updatedAt = T3;
    const p1 = S._mergeJobRecord(clone(A.job), clone(Bstale)).payments[0];
    const p2 = S._mergeJobRecord(clone(Bstale), clone(A.job)).payments[0];
    ok(!!p1.voidedAt && !!p2.voidedAt, '⚠⚠ the void survives a stale device\'s later save, in either order');
    eq(S._mergeJobRecord(clone(A.job), clone(Bstale)).notes, 'pm', 'while B\'s newer scalar still wins');

    // ⚠⚠ THE CASE THE STAMP ALONE LOST: B touched THE SAME payment after the void, on its older live copy.
    const Btouch = clone(morning); Btouch.updatedAt = T4; Btouch.at['payments:u-chq'] = T4;
    Btouch.payments[0].clearedOn = '2026-09-30'; Btouch.payments[0].clearedBy = 'Ashley Jerome';
    const m1 = S._mergeJobRecord(clone(A.job), clone(Btouch)).payments[0];
    const m2 = S._mergeJobRecord(clone(Btouch), clone(A.job)).payments[0];
    eq([m1.voidedAt, m1.voidedBy, m1.voidReason], [new realDate(NOW).toISOString(), 'Anthony Graziano', 'Cheque returned unpaid'],
       '⚠⚠ a stale device\'s later touch does NOT bring the payment back live (_paymentSticky)');
    ok(!!m2.voidedAt, 'in either order');
    eq(m1.clearedOn, '2026-09-30', 'and B\'s own change (the clear) is kept beside the void');
    eq(S._mergeJobRecord(clone(A.job), clone(Btouch)).payments.length, 1, 'one payment, never two');

    // A clear survives the same way: A clears at NOW; stale B attaches the cheque photo later on its uncleared copy.
    const C = payBox({ job: clone(morning) });
    inZone(() => C.ctx.markPaymentCleared(1, 'u-chq'));
    const Bphoto = clone(morning); Bphoto.updatedAt = T4; Bphoto.at['payments:u-chq'] = T4;
    Bphoto.payments[0].evidence = 'https://drive.google.com/file/d/cheque';
    const c1 = S._mergeJobRecord(clone(C.job), clone(Bphoto)).payments[0];
    eq(c1.clearedOn, '2026-09-30', '⚠ the clear survives a stale device that touched the payment later');
    eq(c1.clearedBy, 'Anthony Graziano', 'with who cleared it');
    eq(c1.evidence, 'https://drive.google.com/file/d/cheque', 'and the photo B attached is kept');
    // And the photo survives the converse: a device that never had it touches the same payment LATER, so its copy
    // (no photo) wins the stamp — the photo is kept from the other copy (the evidence group of JOB_PAYMENT_STICKY).
    const Bph = clone(morning); Bph.updatedAt = T3; Bph.at['payments:u-chq'] = T3;
    Bph.payments[0].evidence = 'https://drive.google.com/file/d/cheque';
    const Alater = clone(morning); Alater.updatedAt = T4; Alater.at['payments:u-chq'] = T4;
    Alater.payments[0].clearedOn = '2026-10-01'; Alater.payments[0].clearedBy = 'Ashley Jerome';
    const c2 = S._mergeJobRecord(clone(Bph), clone(Alater)).payments[0];
    const c2b = S._mergeJobRecord(clone(Alater), clone(Bph)).payments[0];
    eq([c2.evidence, c2b.evidence], ['https://drive.google.com/file/d/cheque', 'https://drive.google.com/file/d/cheque'],
       '⚠ a photo is not lost to a later touch from a device that never had it, in either order');
    eq(c2.clearedOn, '2026-10-01', 'beside that device\'s own change');

    // A payment written before uids existed merges on its id — the key the app now stamps with it.
    const legacy = { id: 1, updatedAt: T1, payments: [{ id: 1, stage: 'deposit', amount: DEPOSIT, method: 'check', clearedOn: null }] };
    const L = payBox({ job: clone(legacy) });
    eq(L.ctx._paymentKey(L.job.payments[0]), '1', 'a uid-less payment is keyed on its id, as _jobListKey keys it');
    inZone(() => L.ctx.openVoidPayment(1, '1'));
    L.doc.getElementById('pv-reason').value = 'Entered twice';
    inZone(() => L.ctx.confirmVoidPayment());
    ok(L.job.at && L.job.at['payments:1'] === NOW, 'the void stamps payments:1');
    const lstale = clone(legacy); lstale.updatedAt = T3;
    ok(!!S._mergeJobRecord(clone(L.job), lstale).payments[0].voidedAt, '⚠ and it survives an unstamped stale copy');

    // The Stripe intent a payment was matched to is kept too: A's arrival check attached it; stale B, which never saw
    // it, marks the same hand record cleared later. Losing the intent would let the next check match it again.
    const handMorning = { id: 1, name: 'Butler', updatedAt: T1, at: { 'payments:u-ach': T1 },
      payments: [{ id: 2, uid: 'u-ach', stage: 'midpoint', amount: 6429, method: 'stripe_ach', clearedOn: null }] };
    const Am = clone(handMorning); Am.updatedAt = NOW; Am.at['payments:u-ach'] = NOW;
    Object.assign(Am.payments[0], { stripePiId: 'pi_mid', stripeMatchedAt: new realDate(NOW).toISOString(), clearedOn: '2026-09-30', clearedBy: 'Stripe' });
    const Bm = clone(handMorning); Bm.updatedAt = T4; Bm.at['payments:u-ach'] = T4;
    Object.assign(Bm.payments[0], { clearedOn: '2026-10-01', clearedBy: 'Ashley Jerome' });
    const sm = S._mergeJobRecord(clone(Am), clone(Bm)).payments[0];
    eq([sm.stripePiId, sm.stripeMatchedAt], ['pi_mid', new realDate(NOW).toISOString()], '⚠ the Stripe intent it was matched to survives a stale touch');
    eq([sm.clearedOn, sm.clearedBy], ['2026-10-01', 'Ashley Jerome'], 'beside the later copy\'s own clear');

    // Nothing sticky is invented: a payment neither side voided stays live.
    const plain = S._mergeJobRecord(clone(morning), clone(Object.assign(clone(morning), { updatedAt: T3 }))).payments[0];
    ok(!plain.voidedAt && !plain.clearedOn, 'a payment nobody voided or cleared stays as it was');
    eq(S._paymentSticky({ a: 1, voidedAt: 'x' }, { voidedAt: 'y', voidReason: 'r' }).voidedAt, 'x', 'the winning copy\'s own values are never overwritten');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── STRIPE ─────────────────────────────────────────────────────────────────
  const RB_FNS = ['applyStripePayments', '_stripeHandMatch', '_handAchAwaitingStripe', 'paymentStageLabel', 'paymentStageWord',
    '_stripeRecordPayment', '_localDateOf', '_ymdLocal', '_todayStr', '_stripeDue', 'outstandingPayments', 'stripeRefresh', 'jobPayments',
    'paymentCounts', '_paymentKey', 'stagePaidTotal', 'depositPaidTotal', 'depositClearedTotal', 'isJobFunded', 'depositTargetFor',
    '_photoUid', '_jobTouch', 'fmt', 'fmtDate2', 'docStateBare', '_saveArrivalCheck', '_saveJobEdit', 'paymentSummaryText', 'paymentMethodLabel',
    'jobPaymentsListHtml', 'esc'];
  function rb(jobsSeed, at) {
    const notices = [];
    const ctx = sandbox({ fns: RB_FNS, vars: ['DOC_STAGE_WORD', 'PAYMENT_STAGES', 'PAYMENT_STAGE_LABELS', '_photoUidSeq', 'STRIPE_RECHECK_MINS'],
      stubs: { Date: clockAt(at || NOW), jobs: jobsSeed, estimateStore: { 1: { estimate: { havellinTotal: TOTAL } } },
        SHEETS_SYNC_URL: 'https://script.google.com/macros/s/x/exec', saveJobs() {}, syncJobToSheets() {}, renderJobs() {},
        _docNotice: (t, m, j) => notices.push({ t, m: String(m), j }),
        _appsScriptPost: (url, body, cb) => cb(true, { ok: true, payments: [] }) } });
    ctx.__notices = notices;
    return ctx;
  }
  const linked = (stage, payments, over) => Object.assign({ id: 1, name: 'Butler', hvlId: 'HVL-0007', svc: 'cleanout', payments: payments,
    docState: { ['invoice:' + stage]: { stripe: { linkId: 'plink_' + stage } } } }, over || {});
  const dep = { id: 1, uid: 'u-dep', stage: 'deposit', amount: DEPOSIT, method: 'wire', receivedOn: '2026-09-10', clearedOn: '2026-09-10' };
  const handAch = (over) => Object.assign({ id: 2, uid: 'u-mid', stage: 'midpoint', amount: 6429, method: 'stripe_ach',
    receivedOn: '2026-09-24', clearedOn: null, recordedBy: 'Anthony Graziano', reference: '', payer: '' }, over || {});
  const settled = (over) => ({ payments: [Object.assign({ piId: 'pi_mid', status: 'succeeded', amount: 6429, payer: 'Tripp Butler',
    createdAt: '2026-09-24T15:00:00Z' }, over || {})] });

  group('⚠⚠ B5(a) · money recorded by hand is not recorded again when Stripe reports it');
  {
    const job = linked('midpoint', [Object.assign({}, dep), handAch()]);
    const c = rb([job]);
    const n = inZone(() => c.applyStripePayments(1, 'invoice:midpoint', 'midpoint', settled()));
    eq(job.payments.length, 2, '⚠⚠ still two payments on the job, not three — the hand record took the intent');
    eq(c.stagePaidTotal(job, 'midpoint'), 6429, '⚠⚠ and the midpoint counts $6,429 once (it read $12,858 before)');
    const h = job.payments[1];
    eq(h.stripePiId, 'pi_mid', 'the hand record now carries the intent id');
    eq(h.clearedOn, '2026-09-30', 'and is cleared on the day the app saw it settle');
    eq(h.clearedBy, 'Stripe', 'by Stripe');
    eq(h.recordedBy, 'Anthony Graziano', 'while it stays the person\'s record');
    eq(h.reference, 'pi_mid', 'a blank reference takes the intent id');
    eq(h.payer, 'Tripp Butler', 'and a blank payer Stripe\'s');
    ok(job.at && job.at['payments:u-mid'] === NOW, '⚠ stamped on its own key, so it travels');
    ok(job.updatedAt === NOW, 'and the job\'s clock moves: a check that learned something records it');
    eq(n, 1, 'it reports a change, so the dashboard redraws');
    const said = (c.__notices[0] || {}).m || '';
    has(said, 'Stripe confirms the $6,429 bank transfer (ACH) on the midpoint, received Sep 24, 2026', 'the notice names the payment it matched');
    has(said, 'not recorded twice', 'and says why there is one');
    eq(c.__notices.length, 1, 'one notice');
    const lst = inZone(() => c.jobPaymentsListHtml(job));
    has(lst, 'Cleared Sep 30, 2026 — Stripe reported it settled', 'the payments list says who cleared it: Stripe, not a person');
    lacks(lst, 'markPaymentCleared(1,\'u-mid\')', 'and offers no Mark cleared on it');
    eq(inZone(() => c.applyStripePayments(1, 'invoice:midpoint', 'midpoint', settled())), 0, 'a second pass records nothing');
    eq(job.payments.length, 2, 'still two');

    // What is NOT matched: anything less exact is recorded on its own record, as before.
    const cases = [
      ['a different amount', handAch({ amount: 6000 })],
      ['another stage', handAch({ stage: 'final' })],
      ['a cash payment of the same size', handAch({ method: 'cash' })],
      ['a record naming another intent', handAch({ reference: 'pi_other' })],
      ['a voided hand record', handAch({ voidedAt: '2026-09-25T12:00:00.000Z', voidReason: 'wrong job' })],
      ['a record already carrying an intent', handAch({ stripePiId: 'pi_older' })],
    ];
    cases.forEach(([what, rec]) => {
      const j = linked('midpoint', [Object.assign({}, dep), rec]);
      const cc = rb([j]);
      inZone(() => cc.applyStripePayments(1, 'invoice:midpoint', 'midpoint', settled()));
      eq(j.payments.length, 3, what + ': not matched, so Stripe\'s money is its own record');
      eq((j.payments[2] || {}).stripePiId, 'pi_mid', what + ': recorded from Stripe');
    });
    // A record naming THIS intent is matched.
    const named = linked('midpoint', [Object.assign({}, dep), handAch({ reference: 'pi_mid' })]);
    inZone(() => rb([named]).applyStripePayments(1, 'invoice:midpoint', 'midpoint', settled()));
    eq(named.payments.length, 2, 'a hand record whose reference IS this intent is matched');

    // Uncleared first, then one a person marked cleared (and its date stands).
    const two = linked('midpoint', [Object.assign({}, dep),
      handAch({ uid: 'u-a', id: 2, clearedOn: '2026-09-27', clearedBy: 'Ashley Jerome' }), handAch({ uid: 'u-b', id: 3 })]);
    const c2 = rb([two]);
    inZone(() => c2.applyStripePayments(1, 'invoice:midpoint', 'midpoint', settled()));
    eq([two.payments[1].stripePiId, two.payments[2].stripePiId], [undefined, 'pi_mid'], 'an uncleared record is matched before a cleared one');
    const only = linked('midpoint', [Object.assign({}, dep), handAch({ clearedOn: '2026-09-27', clearedBy: 'Ashley Jerome' })]);
    const c3 = rb([only]);
    inZone(() => c3.applyStripePayments(1, 'invoice:midpoint', 'midpoint', settled()));
    eq(only.payments.length, 2, '⚠ one a person already marked cleared is still the same money');
    eq([only.payments[1].clearedOn, only.payments[1].clearedBy], ['2026-09-27', 'Ashley Jerome'], 'and the person\'s clear stands');
    lacks((c3.__notices[0] || {}).m, 'now marked cleared', 'the notice does not claim a clear it did not make');
  }

  group('B5(a) · a funded deposit stays watched while a hand-recorded transfer on it awaits Stripe');
  {
    const depAch = { id: 1, uid: 'u-d', stage: 'deposit', amount: DEPOSIT, method: 'stripe_ach', receivedOn: '2026-09-24', clearedOn: null };
    const job = linked('deposit', [depAch]);
    const c = rb([job]);
    ok(c.isJobFunded(job), 'fixture: the hand-recorded transfer funds the job');
    eq(c.outstandingPayments().map((e) => e.stage), ['deposit'],
       '⚠⚠ its link is still asked about — a funded deposit used to drop off, so the transfer read uncleared for good');
    inZone(() => c.applyStripePayments(1, 'invoice:deposit', 'deposit', settled({ piId: 'pi_dep', amount: DEPOSIT })));
    eq(job.payments.length, 1, 'Stripe\'s report is matched to it, not added');
    eq(job.payments[0].clearedOn, '2026-09-30', 'and clears it');
    eq(c.outstandingPayments().length, 0, 'then the deposit drops off the watch');
    const cheque = linked('deposit', [Object.assign({}, depAch, { method: 'check' })]);
    eq(rb([cheque]).outstandingPayments().length, 0, 'a cheque funding it is not waited on (Stripe cannot confirm a cheque)');
  }

  group('B5(a) · a void is never undone by automation; a void a stale device matched to is recorded afresh');
  {
    // A Stripe payment voided on purpose (the transfer came back after it settled): never re-recorded.
    const stripeRec = { id: 2, uid: 'u-s', stage: 'midpoint', amount: 6429, method: 'stripe_ach', stripePiId: 'pi_mid', recordedBy: 'Stripe',
      clearedOn: '2026-09-26', voidedAt: '2026-09-29T12:00:00.000Z', voidReason: 'ACH returned R10' };
    const j1 = linked('midpoint', [Object.assign({}, dep), stripeRec]);
    eq(inZone(() => rb([j1]).applyStripePayments(1, 'invoice:midpoint', 'midpoint', settled())), 0, '⚠⚠ a voided Stripe payment is not re-recorded');
    eq(j1.payments.length, 2, 'the void stands');
    // A hand record matched and THEN voided by a person who knew: the void covers the intent.
    const after = handAch({ stripePiId: 'pi_mid', stripeMatchedAt: '2026-09-26T12:00:00.000Z', clearedOn: '2026-09-26',
      voidedAt: '2026-09-29T12:00:00.000Z', voidReason: 'client disputed it' });
    const j2 = linked('midpoint', [Object.assign({}, dep), after]);
    eq(inZone(() => rb([j2]).applyStripePayments(1, 'invoice:midpoint', 'midpoint', settled())), 0, 'a void made after the match covers the intent');
    // ⚠ A hand record voided on one device, matched on a stale one, merged with the void kept: that void was
    // about a hand entry, not this money, so the money is recorded on its own record.
    const before = handAch({ stripePiId: 'pi_mid', stripeMatchedAt: '2026-09-29T12:00:00.000Z', clearedOn: '2026-09-29', clearedBy: 'Stripe',
      voidedAt: '2026-09-26T12:00:00.000Z', voidReason: 'thought it had not come in' });
    const j3 = linked('midpoint', [Object.assign({}, dep), before]);
    const c3 = rb([j3]);
    eq(inZone(() => c3.applyStripePayments(1, 'invoice:midpoint', 'midpoint', settled())), 1, 'the intent is recorded afresh');
    eq(c3.stagePaidTotal(j3, 'midpoint'), 6429, '⚠ so the money that did arrive counts, once');
    eq(inZone(() => c3.applyStripePayments(1, 'invoice:midpoint', 'midpoint', settled())), 0, 'and only once');

    // ⚠⚠ THE SAME CASE AS IT REALLY HAPPENS, through the real handlers and the real merge, with no field typed in by
    // hand: device A voids the hand record; device B, which never saw the void, matches Stripe's report to its live
    // copy a minute later; the sheet keeps A's void and B's match; the next check records the money, once.
    const G = { Date, JSON, Math, Number, String, Object, Array };
    vm.createContext(G);
    vm.runInContext([gsVar('JOB_KEYED_LISTS'), gsVar('JOB_KEYED_MAPS'), gsVar('JOB_LIST_KEY'), gsVar('JOB_PAYMENT_STICKY'),
      gsFn('_paymentSticky'), gsFn('_jobStamp'), gsFn('_jobListKey'), gsFn('_mergeJobKeyed'), gsFn('_mergeJobRecord')].join('\n\n'), G);
    const cl = (o) => JSON.parse(JSON.stringify(o));
    const am = Object.assign(linked('midpoint', [Object.assign({}, dep), handAch()]), { updatedAt: 1000, at: { 'payments:u-mid': 1000 } });
    const A = payBox({ job: cl(am) });
    inZone(() => A.ctx.openVoidPayment(1, 'u-mid'));
    A.doc.getElementById('pv-reason').value = 'Thought it had not come in';
    inZone(() => A.ctx.confirmVoidPayment());
    const Bj = cl(am);
    eq(inZone(() => rb([Bj], NOW + 60000).applyStripePayments(1, 'invoice:midpoint', 'midpoint', settled())), 1, 'fixture: stale B matches it');
    eq(Bj.payments[1].stripeMatchedAt, new realDate(NOW + 60000).toISOString(), '⚠ the match records when it was made');
    const merged = G._mergeJobRecord(cl(A.job), cl(Bj));
    const mp = merged.payments[1] || {};
    ok(!!mp.voidedAt && mp.stripePiId === 'pi_mid', 'fixture: the sheet holds both A\'s void and B\'s match');
    const Cc = rb([merged], NOW + 120000);
    eq(inZone(() => Cc.applyStripePayments(1, 'invoice:midpoint', 'midpoint', settled())), 1,
       '⚠⚠ the money is recorded on its own record — the void predates the match, so it was never about this money');
    eq(Cc.stagePaidTotal(merged, 'midpoint'), 6429, 'and it counts once');
  }

  group('B15 · Stripe\'s record is cleared the day the app saw it settle, never the day it was authorised');
  {
    const job = linked('midpoint', [Object.assign({}, dep)]);
    const c = rb([job]);
    inZone(() => c.applyStripePayments(1, 'invoice:midpoint', 'midpoint', settled()));
    const p = job.payments[1] || {};
    eq(p.receivedOn, '2026-09-24', 'received on the day the client authorised it (the intent\'s date)');
    eq(p.clearedOn, '2026-09-30', '⚠⚠ cleared on the day a check saw `succeeded` — it read the authorisation date, days early');
    eq(p.clearedBy, 'Stripe', 'by Stripe');
    const lst = inZone(() => c.jobPaymentsListHtml(job));
    has(lst, 'received Sep 24, 2026 · Tripp Butler · recorded by Stripe', 'the list says Stripe recorded it, received on the authorisation day');
    has(lst, 'Cleared Sep 30, 2026 — Stripe reported it settled', 'and cleared on the day the app saw it settle');
    has(live(fn('_stripeRecordPayment')), 'clearedOn: _todayStr()', 'the local calendar day, through the one helper');
    // What the backend really returns — measured, not assumed: no settlement date among it.
    const ctx = { PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k === 'STRIPE_SECRET_KEY' ? 'sk' + '_test_x' : null) }) },
      Logger: { log() {} }, Date, JSON, Math, Number, String, Object, Array, encodeURIComponent, RegExp,
      UrlFetchApp: { fetch: () => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify({ data: [{ id: 'cs_1',
        customer_details: { name: 'Tripp Butler' }, payment_intent: { id: 'pi_1', status: 'succeeded', amount: 642900, amount_received: 642900, created: 1790000000 } }] }) }) } };
    vm.createContext(ctx);
    vm.runInContext([gsVar('STRIPE_API'), gsVar('STRIPE_API_VERSION'), gsFn('_stProp'), gsFn('_stErr'), gsFn('_stForm'), gsFn('_stApi'),
      gsFn('stripePaymentsForLink')].join('\n'), ctx);
    const r = ctx.stripePaymentsForLink({ linkId: 'plink_1' });
    eq(Object.keys((r.payments || [])[0] || {}).sort(), ['amount', 'createdAt', 'payer', 'piId', 'sessionId', 'status'],
       '⚠ the backend returns no settlement date — createdAt is the intent\'s creation, so the app dates the clear itself');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('B16 · a DocuSign signature carries the signer\'s own day and the address DocuSign authenticated');
  {
    const S = sandbox({ fns: ['agreementSignature', 'isAgreementSigned', 'recordAgreementSignature', 'esignProviderKey', 'docState', '_jobTouch',
      'applyEsignStatus', '_localDateOf', '_ymdLocal', '_todayStr', '_actor', 'isAgreementSent', 'docSentAt', 'docKeyFor', 'docStateBare', '_saveArrivalCheck'],
      vars: ['AGR_SIG_METHODS', 'ESIGN_PROVIDERS'],
      stubs: { Date: clockAt(NOW), saveJobs() {}, syncJobToSheets() {}, _dashRedraw() {}, renderJobs() {}, esignArchiveSigned() {} } });
    const env = (over) => ({ id: 1, agrSent: true, docState: { agreement: { sentAt: '2026-09-25T12:00:00Z', esign: { envelopeId: 'env1' } } } });
    // The client signed at 9:30pm Eastern on the 28th (01:30Z on the 29th); Anthony countersigned on the 30th.
    const j = env(); S.jobs = [j];
    const blk = inZone(() => S.applyEsignStatus(1, { status: 'completed', envelopeId: 'env1', signerName: 'Tripp Butler',
      signerEmail: 'tripp@example.com', signedAt: '2026-09-29T01:30:00.0000000Z', completedAt: '2026-09-30T14:00:00.0000000Z' }));
    eq(blk, '', 'recorded');
    const sig = S.agreementSignature(j) || {};
    eq(sig.signedOn, '2026-09-28', '⚠⚠ dated the day THE CLIENT signed, on the local calendar — it read the 30th, Havellin\'s countersignature');
    eq(sig.signerEmail, 'tripp@example.com', '⚠ and the address DocuSign authenticated them at is kept');
    eq(sig.signedBy, 'Tripp Butler', 'the signer is unchanged');
    eq(j.agrSignedAt, '2026-09-28', 'the legacy mirror carries the same day');
    // An answer without the signer's time falls back to the envelope's.
    const k = env(); S.jobs = [k];
    inZone(() => S.applyEsignStatus(1, { status: 'completed', envelopeId: 'env1', signerName: 'Tripp Butler', completedAt: '2026-09-30T14:00:00Z' }));
    eq((S.agreementSignature(k) || {}).signedOn, '2026-09-30', 'no signedAt: the completion day, as before');
    eq((S.agreementSignature(k) || {}).signerEmail, '', 'and no address rather than an invented one');
    has(live(fn('applyEsignStatus')), 'signedOn: _localDateOf(status.signedAt) || _localDateOf(status.completedAt)',
        'the day goes through the local helper, never an ISO slice');
    // A hand-recorded signature names no address.
    const w = { id: 1, agrSent: true }; S.jobs = [w];
    inZone(() => S.recordAgreementSignature(1, { how: 'wet', signedBy: 'Tripp Butler', signedOn: '2026-09-28' }));
    eq((S.agreementSignature(w) || {}).signerEmail, '', 'a wet signature carries no authenticated address');

    // The rail says it: the Agreement signed row names the address beside how it came back.
    const R = sandbox({
      fns: ['agrApprovalWithdrawn', 'jobTimeline', 'paymentStageWord', 'finalAwaitsHours', 'estimateIsFeeOnly', 'jobTimelineNext', 'agreementSignature', 'isAgreementSigned',
        'esignProviderKey', 'esignAvailable', 'esignJobWatches', 'docState', '_jobTouch', 'paymentSplit', 'unscoredRoomNames',
        'jobActivationBlockers', 'jobOnProbateTrack', 'matterDef', 'matterTypeOf', 'invFiduciaryMode', 'isDecedentJob', 'isJobWon', 'isJobFunded', 'jobPayments', 'stagePaidTotal',
        'paymentCounts', 'depositPaidTotal', 'depositTargetFor', 'docSentAt', 'docKeyFor', 'isAgreementSent', 'jtDraftLine', 'staleDraftNote', 'staleDraftsOf', 'draftIsStale', 'draftOutstanding',
        'staleDocName', '_draftDay', '_andJoin', 'estimateOutForApproval', 'priceAboveSent', 'docDraftPending', 'fmtMoney', 'docWord', 'priceAboveAcceptance', '_approvedPriceAbove', '_localDateOf', '_ymdLocal', 'finalCrewOnlyWarn', 'agrBillingRates', 'fmt', 'estDeclutterHrs'],
      vars: ['JT_SHORT', 'DOC_STAGE_WORD', 'MATTER_TYPES', 'DECEDENT_SERVICES', 'JT_NEXT', 'AGR_SIG_METHODS', 'ESIGN_PROVIDERS', 'DOC_KIND_WORD'],
      stubs: { ESIGN_PROVIDER_KEY: 'manual', REQUIRE_WALKTHROUGH_NOTES: false } });
    const rj = Object.assign({ name: 'Butler', created: 'Sep 8, 2026', svc: 'cleanout', status: 'won', walkthrough: '2020-01-01', approved: true, won: true,
      estimateSentDate: 'Sep 8, 2026', agrApproved: true, agrApprovedBy: 'Anthony Graziano', agrSignedAt: '2026-09-28' }, j);
    R.jobs = [rj]; R.estimateStore = { 1: { estimate: { rooms: [{ name: 'Kitchen', vol: 3, cplx: 3 }], havellinTotal: 24100 }, approved: true } };
    const row = (R.jobTimeline(rj, R.estimateStore[1], [], [], null) || []).filter((x) => x.key === 'agreement_signed')[0] || {};
    eq(row.sub, 'Electronic signature · tripp@example.com', '⚠ the row names the authenticated address');
    eq(row.at, '2026-09-28', 'and the client\'s day');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ B6 · a failed Gmail draft falls back, is recorded as the plain email it is, and can be confirmed sent');
  {
    const job = { id: 1, name: 'Butler', agrApprovedBy: 'Anthony Graziano', tc: 'Ashley Jerome', docState: {} };
    const filed = [], notices = [], badges = [], hrefs = [];
    const win = { open() {}, location: {} };
    Object.defineProperty(win.location, 'href', { set: (v) => hrefs.push(String(v)), get: () => '' });
    const D = sandbox({
      fns: ['docSend', 'docProvider', 'gmailConfigured', 'docRecordSent', 'docState', '_jobTouch', 'draftIsStale', 'docDraftPending',
        'staleDraftNote', 'staleDraftsOf', 'staleDocName', '_draftDay', '_andJoin', '_jtSendAction', 'docKeyFor', 'draftOutstanding',
        'jtDraftLine', 'markDocSent', 'noDraftToConfirm', 'buildMimeMessage', '_mimeHeader', '_b64Wrap'],
      vars: ['DOC_SEND_PROVIDERS', 'GMAIL_CLIENT_ID_DEFAULT', 'GMAIL_CLIENT_ID', '_gmailUserEmail', '_docBusy'],
      stubs: {
        Date: clockAt(NOW), window: win, jobs: [job],
        esignAvailable: () => true, esignAnchorsPresent: () => [], _dashSendState() {},
        setTimeout: () => 1, clearTimeout() {},
        docPdfBase64: (spec, html, cb) => cb('JVBERi0xLjQ=', '', ''),
        gmailCreateDraft: (mime, cb) => cb(false, { error: 'Gmail API returned HTTP 403' }),
        docAction: (id, kind, verb, opt) => filed.push({ id, kind, verb, auto: !!(opt && opt.auto) }),
        _docNotice: (type, msg) => notices.push({ type, msg: String(msg) }), showSyncBadge: (m) => badges.push(String(m)),
        _actor: (j) => (j && j.agrApprovedBy) || '', saveJobs() {}, syncJobToSheets() {},
        _primeEstimateFor: () => ({}), markEstimateSent: () => { job.estimateSentDate = 'September 30, 2026'; },
        dashNotice: (type, msg) => notices.push({ type, msg: String(msg) }), _dashRedraw() {},
      } });
    const spec = { job, kind: 'estimate', key: 'estimate', to: 'tripp@example.com',
      names: { attachment: 'Havellin Estimate.pdf' },
      cfg: { html: () => '<p>Estimate</p>', cc: () => 'estimates@havellinpalmbeach.com', subject: () => 'Your estimate', text: () => 'Hi',
             emailHtml: () => '<p>Hi</p>', mailto: () => 'mailto:tripp@example.com?subject=Your%20estimate' } };
    ok(D.docSend(spec) === true, 'the send ran');
    eq(hrefs, ['mailto:tripp@example.com?subject=Your%20estimate'], 'Gmail failed, so a plain email opened');
    const st = job.docState.estimate || {};
    ok(!!st.draftedAt, '⚠⚠ and it is RECORDED: draftedAt — it recorded nothing before');
    eq(st.provider, 'mailto', 'as the plain email it is');
    ok(!st.sentAt, '⚠ never sentAt: the app opened a mail app, it did not watch a send');
    eq(st.pdfOk, false, 'and not as having carried the PDF');
    eq(filed.map((f) => f.verb + ':' + f.auto), ['file:true'], 'the document is filed, as every send files it');
    const n = notices[notices.length - 1] || {};
    has(n.msg, 'Gmail draft failed — Gmail API returned HTTP 403.', 'the notice says what failed');
    has(n.msg, 'a plain email carries NO attachment, so attach a printed copy before sending', 'and that nothing is attached');
    has(n.msg, 'tap “I’ve sent it”', 'and what to do next');
    eq(n.type, 'warn', 'as a warning');
    eq(badges.pop(), 'Email opened ✓', 'the badge says an email opened, not that a draft was made');
    // The rail now offers the confirming tap, and says what the app did.
    eq(D._jtSendAction(1, job, 'estimate', '', 'estimate').call, "markDocSent(1,'estimate')", '⚠⚠ the band offers "I\'ve sent it"');
    eq(D.jtDraftLine(job, 'estimate', true), 'Opened as a plain email — send it from your mail app, then confirm',
       'the row says it was opened as a plain email, not drafted');
    D.markDocSent(1, 'estimate');
    ok(!!job.docState.estimate.sentAt, '⚠⚠ and a send made from the mail app can now be confirmed');
    eq(job.estimateSentDate, 'September 30, 2026', 'through the estimate\'s own recorder');
    // A Gmail draft that worked still reads as drafted.
    eq(D.jtDraftLine({ id: 2, docState: { estimate: { draftedAt: '2026-09-30T12:00:00Z', provider: 'gmail' } } }, 'estimate', true),
       'Drafted — read it, send it, then confirm', 'a Gmail draft keeps its line');
    // Both routes failed (no address for a plain email either): nothing is recorded, and it says it could not send.
    const job2 = { id: 2, name: 'Vale', agrApprovedBy: 'Anthony Graziano', docState: {} };
    const spec2 = Object.assign({}, spec, { job: job2, cfg: Object.assign({}, spec.cfg, { mailto: () => '' }) });
    const filedBefore = filed.length;
    ok(D.docSend(spec2) === true, 'fixture: the second send ran');
    ok(!(job2.docState.estimate && job2.docState.estimate.draftedAt), '⚠ when the plain email cannot open either, nothing is recorded');
    eq(filed.length, filedBefore, 'and nothing is filed');
    const n2 = notices[notices.length - 1] || {};
    eq([n2.type, n2.msg], ['err', 'Could not send — Gmail API returned HTTP 403.'], 'it says it could not send, in Gmail\'s words');
    // The dead handler is gone rather than left without a caller.
    ok(!/(^|\n)function dashMarkEstimateSent\(/.test(src), 'the estimate\'s callerless "recorded as sent" handler is removed');
    eq(src.split('dashMarkEstimateSent').length - 1, 0, 'and nothing names it');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('B7 · Edit estimate drops the filing record the rail reads, as a stamped removal');
  {
    const job = { id: 1, approved: true, estimateDriveAt: '2026-09-20T12:00:00Z', estimateDriveUrl: 'https://drive/old', updatedAt: 1,
      at: { 'docState:estimate': 1000 },
      docState: { estimate: { sentAt: '2026-09-20T12:00:00Z', filedAt: '2026-09-20T12:00:00Z', filedUrl: 'https://drive/old' } } };
    const stale = JSON.parse(JSON.stringify(job));
    const E = sandbox({ fns: ['revokeEstimateApproval', 'docState', '_jobTouch', '_jtDriveLink', 'docKeyFor', 'docWord'],
      vars: ['DOC_KIND_WORD', 'DOC_STAGE_WORD'],
      stubs: { Date: clockAt(NOW), jobs: [job], estimateStore: { 1: { approved: true } }, revokeAgreementApproval() {}, notePriceChange() {},
        saveJobs() {}, syncJobToSheets() {}, paymentStageWord: () => ({ invoice: 'invoice' }) } });
    eq((E._jtDriveLink(1, job, 'estimate', '', false)[0] || {}).label, '&#128193; Filed estimate', 'fixture: the strip offers the filed copy');
    E.revokeEstimateApproval(1);
    ok(!job.docState.estimate.filedAt && !job.docState.estimate.filedUrl, '⚠⚠ the filing record is dropped with the approval');
    eq(job.docState.estimate.sentAt, '2026-09-20T12:00:00Z', 'and nothing else on it moves');
    eq(E._jtDriveLink(1, job, 'estimate', '', true), [], '⚠ so the strip no longer offers the pre-edit copy as the estimate');
    ok(job.at['docState:estimate'] === NOW, 'the key is stamped: a removal is recorded, never an absence');
    // Through the real merge: a stale device still holding the filing does not bring it back.
    const S = { Date, JSON, Math, Number, String, Object, Array };
    vm.createContext(S);
    vm.runInContext([gsVar('JOB_KEYED_LISTS'), gsVar('JOB_KEYED_MAPS'), gsVar('JOB_LIST_KEY'), gsVar('JOB_PAYMENT_STICKY'), gsFn('_paymentSticky'),
      gsFn('_jobStamp'), gsFn('_jobListKey'), gsFn('_mergeJobKeyed'), gsFn('_mergeJobRecord')].join('\n\n'), S);
    stale.updatedAt = NOW + 60000;   // B saves something else later, on its morning copy
    ok(!S._mergeJobRecord(JSON.parse(JSON.stringify(job)), stale).docState.estimate.filedAt, '⚠ the stale copy\'s filing loses, in either order');
    ok(!S._mergeJobRecord(stale, JSON.parse(JSON.stringify(job))).docState.estimate.filedAt, '…both ways');
    // Nothing is stamped when there was nothing filed.
    const bare = { id: 2, approved: true, docState: { estimate: { sentAt: 'x' } } };
    E.jobs = [bare];
    E.revokeEstimateApproval(2);
    ok(!(bare.at && bare.at['docState:estimate']), 'a record with no filing is not claimed');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('B17 · the decision email is a Gmail draft from the Havellin mailbox, with the mailto fallback kept');
  {
    const run = (gmailOk) => {
      const opened = [], badges = [], mimes = [];
      const N = sandbox({ fns: ['notifyTCOfDecision', 'firstName', 'sendInternalEmail', 'buildMimeMessage', '_mimeHeader', '_b64Wrap', 'gmailDraftUrl', 'esc'],
        vars: ['_gmailUserEmail'],
        stubs: { window: { open: (u) => { opened.push(String(u)); return null; } }, showSyncBadge: (m, e) => badges.push({ m: String(m), e: !!e }),
          assignedTCContact: () => ({ name: 'Ashley Jerome', email: 'ashley@havellinpalmbeach.com' }), priceRaiseSentence: () => '', estimateStore: {},
          gmailCreateDraft: (mime, cb) => { mimes.push(String(mime)); return gmailOk ? cb(true, { draftId: 'd1', messageId: 'm1' }) : cb(false, { error: 'Google sign-in was closed before it finished.' }); } } });
      N._gmailUserEmail = gmailOk ? 'anthony@havellinpalmbeach.com' : '';
      N.notifyTCOfDecision({ id: 1, name: 'Butler' }, { havellinTotal: 24100 }, 'denied', 'Score the garage first');
      return { opened, badges, mimes };
    };
    const g = run(true);
    eq(g.opened.filter((u) => u.indexOf('mailto:') === 0).length, 0, '⚠⚠ no mailto: when Gmail works');
    eq(g.mimes.length, 1, 'one Gmail draft');
    has(g.mimes[0], 'To: ashley@havellinpalmbeach.com', 'addressed to the concierge');
    ok(g.opened.some((u) => /mail\.google\.com/.test(u)), 'opened in Gmail');
    ok(g.badges.some((b) => /anthony@havellinpalmbeach\.com/.test(b.m)), 'naming the mailbox it is in');
    const f = run(false);
    eq(f.opened.filter((u) => u.indexOf('mailto:ashley@havellinpalmbeach.com') === 0).length, 1, 'a failed draft still opens a plain email');
    ok(f.badges.some((b) => /CHECK THE FROM ADDRESS/.test(b.m) && b.e), 'with the From-address warning');
    ok(f.badges.some((b) => /closed before it finished/.test(b.m)), 'and the reason in Gmail\'s own words');
    lacks(live(fn('notifyTCOfDecision')), 'mailto', 'it keeps no mailto of its own');
    has(live(fn('notifyTCOfDecision')), 'sendInternalEmail(tc.email, subject, lines)', 'it goes through the one internal-email path');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('B20 · sendInternalEmail has no branch that cannot run, and the real path still names the fix');
  {
    const body = live(fn('sendInternalEmail'));
    lacks(body, 'gmailConfigured', 'no configured-check: gmailConfigured() is always true on a device');
    lacks(body, 'not set up', 'and no "Gmail is not set up" message');
    // Why it could never run: Settings cannot blank the id.
    has(live(fn('saveSettings')), 'GMAIL_CLIENT_ID = gcEl2.value.trim() || GMAIL_CLIENT_ID_DEFAULT', 'a blank Settings field saves the default');
    has(live(fn('loadSettings')), "GMAIL_CLIENT_ID   = localStorage.getItem('hav_gmail_client_id') || GMAIL_CLIENT_ID_DEFAULT", 'and loads it');
    ok(/^'\d+-[a-z0-9]+\.apps\.googleusercontent\.com'$/.test(decl('GMAIL_CLIENT_ID_DEFAULT').replace(/^var GMAIL_CLIENT_ID_DEFAULT = |;$/g, '')),
       'and the default is a real client id');
    // If a blank id ever arrived, the real Gmail path says so and the same fallback runs.
    const opened = [], badges = [];
    const B = sandbox({ fns: ['sendInternalEmail', 'gmailCreateDraft', 'gmailAuth', 'gmailConfigured', 'buildMimeMessage', '_mimeHeader', '_b64Wrap', 'esc'],
      vars: ['GMAIL_CLIENT_ID_DEFAULT', 'GMAIL_CLIENT_ID', 'GMAIL_SCOPE', '_gmailUserEmail', '_gmailToken', '_gmailTokenExp', '_gmailTokenClient'],
      stubs: { window: { open: (u) => opened.push(String(u)) }, showSyncBadge: (m) => badges.push(String(m)), gmailResolveUser: (t, cb) => cb() } });
    B.GMAIL_CLIENT_ID = '';
    B.sendInternalEmail('estimates@havellinpalmbeach.com', 'S', ['a']);
    eq(opened.filter((u) => u.indexOf('mailto:') === 0).length, 1, 'a blank id still opens the plain email');
    ok(badges.some((m) => /Settings/.test(m) && /CHECK THE FROM ADDRESS/.test(m)), 'naming Settings in gmailAuth\'s own words, with the warning');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('B26 · the folder sweep runs from the Run menu with no argument: PDFs only, preview then trash, never delete');
  {
    // A fake Shared Drive: the root holds two job folders; one has a subfolder with a PDF filed three times, a
    // PDF DriveApp's own listing misses (only the Drive API sees it), and two cheque photos sharing a name.
    // One copy (e3) is one DriveApp may not trash, as happens on a Shared Drive; the Drive API with
    // supportsAllDrives can — the second path trashDriveFile takes everywhere else.
    let nextId = 0;
    const trashed = [], listCalls = [], viaApi = [];
    const file = (name, mime, updated, refuse) => { const id = 'f' + (++nextId); const f = { id, name, mime, updated, trashed: false,
      getId: () => id, getName: () => name, getMimeType: () => mime, getLastUpdated: () => new realDate(updated),
      setTrashed: (v) => { if (refuse) throw new Error('Access denied: DriveApp'); f.trashed = v; trashed.push(id); } }; return f; };
    const folder = (name, files, subs, hidden) => { const id = 'd' + (++nextId); return { id, name, files, subs: subs || [], hidden: hidden || [],
      getId: () => id, getName: () => name,
      getFiles: () => { const l = files.slice(); return { hasNext: () => l.length > 0, next: () => l.shift() }; },
      getFolders: () => { const l = (subs || []).slice(); return { hasNext: () => l.length > 0, next: () => l.shift() }; } }; };
    const e1 = file('Estimate – HVL-1.pdf', 'application/pdf', '2026-09-01T12:00:00Z');
    const e2 = file('Estimate – HVL-1.pdf', 'application/pdf', '2026-09-20T12:00:00Z');
    const e3 = file('Estimate – HVL-1.pdf', 'application/pdf', '2026-09-10T12:00:00Z', true);
    const eHidden = file('Estimate – HVL-1.pdf', 'application/pdf', '2026-09-05T12:00:00Z');
    const ph1 = file('HVL-1_Payment_1_check.jpg', 'image/jpeg', '2026-09-02T12:00:00Z');
    const ph2 = file('HVL-1_Payment_1_check.jpg', 'image/jpeg', '2026-09-03T12:00:00Z');
    const inv = file('Invoice – Deposit – HVL-2.pdf', 'application/pdf', '2026-09-04T12:00:00Z');
    const estSub = folder('Estimate', [e1, e2, e3], [], [eHidden]);
    const job1 = folder('HVL-1 Butler', [ph1, ph2], [estSub]);
    const job2 = folder('HVL-2 Vale', [inv]);
    const root = folder('Havellin Jobs', [], [job1, job2]);
    const allFolders = [root, job1, job2, estSub];
    const allFiles = [e1, e2, e3, eHidden, ph1, ph2, inv];
    const ctx = {
      ROOT_FOLDER_ID: root.id, Logger: { log() {} }, Date, JSON, Math, Number, String, Object, Array, RegExp,
      DriveApp: {
        getFolderById: (id) => { const f = allFolders.find((x) => x.id === id); if (!f) throw new Error('Invalid argument: id'); return f; },
        getFileById: (id) => { const f = allFiles.find((x) => x.id === id); if (!f) throw new Error('no file'); return f; },
      },
      Drive: { Files: {
        // One item a page, as a long listing comes back: the copy only the API sees is on the last page.
        list: (opt) => { listCalls.push(opt); const m = /'([^']+)' in parents/.exec(opt.q); const d = allFolders.find((x) => x.id === (m && m[1]));
          const items = d ? d.files.concat(d.hidden).filter((f) => f.getMimeType() === 'application/pdf' && !f.trashed).map((f) => ({ id: f.id })) : [];
          const at = parseInt(opt.pageToken || '0', 10);
          return { items: items.slice(at, at + 1), nextPageToken: at + 1 < items.length ? String(at + 1) : undefined }; },
        update: (res, id, blob, opt) => {
          if (!(opt && opt.supportsAllDrives === true)) throw new Error('File not found: ' + id);   // a Shared Drive answers nothing without it
          const f = allFiles.find((x) => x.id === id); if (!f) throw new Error('File not found: ' + id);
          if (res && res.trashed === true) { f.trashed = true; trashed.push(id); viaApi.push(id); }
          return {}; },
      } },
    };
    vm.createContext(ctx);
    vm.runInContext([gsFn('_folderDuplicatePlan'), gsFn('_pdfsByNameInFolder'), gsFn('previewFolderDuplicates'),
      gsFn('dedupeFolderConfirm'), gsFn('trashDriveFile'), gsVar('ROOT_FOLDER_ID').replace(/^var /, 'var __unused_')].join('\n\n'), ctx);
    let plan = null, err = '';
    try { plan = ctx.previewFolderDuplicates(); } catch (e) { err = String(e.message || e); }
    eq(err, '', '⚠⚠ previewFolderDuplicates() runs with no argument — it threw "Invalid argument: id" before');
    eq((plan || []).map((d) => d.path + ' / ' + d.name + ' x' + (d.trash.length + 1)), ['Havellin Jobs / HVL-1 Butler / Estimate / Estimate – HVL-1.pdf x4'],
       'it sweeps every job folder and subfolder, and finds the one name filed four times (one only the Drive API sees)');
    eq(trashed, [], '⚠ the preview changes nothing');
    ok(listCalls.length >= 4 && listCalls.every((o) => o.supportsAllDrives === true && o.includeItemsFromAllDrives === true),
       'every Drive API listing asks the Shared Drive (supportsAllDrives, includeItemsFromAllDrives)');
    let removed = -1;
    try { removed = ctx.dedupeFolderConfirm(); } catch (e) { err = String(e.message || e); }
    eq(err, '', 'dedupeFolderConfirm() runs with no argument too');
    eq(removed, 3, 'it trashes the three older copies');
    eq(trashed.sort(), [e1.id, e3.id, eHidden.id].sort(), '⚠ keeping the newest, and trashing — never deleting — the rest');
    eq(viaApi, [e3.id], '⚠ the copy DriveApp may not trash goes to the bin through the Drive API with supportsAllDrives (trashDriveFile)');
    ok(!ph1.trashed && !ph2.trashed, '⚠⚠ two cheque photos sharing a name are left alone: a photograph is never swept by name');
    ok(!inv.trashed && !e2.trashed, 'and nothing held once is touched');
    // An id passed from a wrapper sweeps just that tree.
    trashed.length = 0;
    const one = ctx.previewFolderDuplicates(job2.id);
    eq(one.length, 0, 'a folder id sweeps only that folder\'s tree');
    // Still editor-only.
    lacks(gsFn('doPost') + gsFn('doGet'), 'FolderDuplicate', 'neither is reachable over HTTP');
    lacks(gsFn('doPost') + gsFn('doGet'), 'dedupeFolder', 'nor the confirm');
    ok(/function previewFolderDuplicates\(folderId\)/.test(GS) && /function dedupeFolderConfirm\(folderId\)/.test(GS), 'the id stays optional');

    // The DocuSign keys' comment names this project, not Quo's.
    const dsNote = GS.slice(GS.indexOf('EVERY SECRET IS IN SCRIPT PROPERTIES AND NONE IS IN THIS FILE'), GS.indexOf('DS_INTEGRATION_KEY  the app'));
    ok(dsNote.length > 100 && dsNote.length < 1200, 'the DocuSign properties note was found');
    has(dsNote, "THIS project's Script Properties", 'it says the keys go in this project');
    lacks(dsNote.replace(/\(Not "where QUO_API_KEY lives"[^)]*\)/, ''), 'QUO_API_KEY lives', 'and no longer sends anyone to the Quo project');
  }

  group('B26 · the deployment says it is 2026-09-30b, and the app names what an older one leaves broken');
  {
    const bv = (GS.match(/var BACKEND_VERSION = '([^']+)';/) || [])[1];
    eq(bv, '2026-09-30b', 'BACKEND_VERSION is bumped with the .gs change');
    const B = sandbox({ vars: ['BACKEND_NEEDS', 'BACKEND_NEEDS_TYPES', 'BACKEND_FEATURE_COST', 'BACKEND_MIN_VERSION'] });
    eq(B.BACKEND_MIN_VERSION, '2026-09-30b', '⚠ the app relies on the new merge, so it asks for it');
    const shown = [];
    const C = sandbox({ fns: ['checkBackendVersion'], vars: ['BACKEND_NEEDS', 'BACKEND_NEEDS_TYPES', 'BACKEND_MIN_VERSION', '_backendVersion'],
      stubs: { SHEETS_SYNC_URL: 'https://sheets', _showBackendStaleBanner: (v, m) => shown.push({ v, m }),
        fetch: () => ({ then(f) { const r = f({ json: () => ({ ok: true, version: '2026-09-30', actions: B.BACKEND_NEEDS, types: B.BACKEND_NEEDS_TYPES }) });
          return { then(g) { g(r); return { catch() {} }; } }; } }) } });
    C.checkBackendVersion();
    eq(shown.length === 1 && shown[0].m, ['version'], '⚠ the deployment Anthony has live (2026-09-30) is named as out of date');
    has(B.BACKEND_FEATURE_COST.version, 'a payment voided or marked cleared on one device can come back', 'by the consequence it has');
    has(B.BACKEND_FEATURE_COST.version, 'on a deployment older than 2026-09-30', 'and says which gaps belong to an older one');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('stale text · esignArchiveSigned and revokeAgreementApproval say what really happens');
  {
    const notices = [];
    const mk = (folderId, answer) => sandbox({ fns: ['esignArchiveSigned', 'docState', '_jobTouch'],
      stubs: { SHEETS_SYNC_URL: 'https://x', jobs: [{ id: 1, docState: { agreement: { esign: { envelopeId: 'env1' } } } }],
        resolveSubfolderId: (job, sub, cb) => cb(folderId), _appsScriptPost: (u, b, cb) => cb(answer.ok, answer.d),
        docNames: () => ({ drive: 'Agreement – HVL-1.pdf' }), _docNotice: (t, m) => notices.push(String(m)), saveJobs() {}, syncJobToSheets() {}, _dashRedraw() {} } });
    mk(null, {}).esignArchiveSigned(1);
    mk('fold1', { ok: true, d: { ok: false, error: 'HTTP 500' } }).esignArchiveSigned(1);
    eq(notices.length, 2, 'both failures speak');
    notices.forEach((m, i) => {
      lacks(m, 're-open this client', '⚠ nothing retries it, so neither failure says to re-open the client (' + i + ')');
      has(m, 'download the signed agreement and its certificate of completion', 'each says what to do instead (' + i + ')');
    });
    has(notices[1], 'HTTP 500', 'in the server\'s words');

    const badges = [];
    const R = sandbox({ fns: ['revokeAgreementApproval'], stubs: { showSyncBadge: (m) => badges.push(String(m)), _packetExported: {} } });
    ok(R.revokeAgreementApproval({ id: 1, agrApproved: true, agrApprovedBy: 'Anthony Graziano' }, 'estimate-edited'), 'it withdraws the approval');
    lacks(badges[0], 're-approve it once the estimate is settled', '⚠ the agreement has no approval step to redo');
    has(badges[0], 'once the estimate is approved again, send the client a fresh signing packet', 'it names the step that restores it');
  }

  group('stale comments · GMAIL_SCOPE and ensureAgreementApproved describe the code');
  {
    const at = src.indexOf('var GMAIL_SCOPE = ');
    const from = src.indexOf('var GMAIL_CLIENT_ID = GMAIL_CLIENT_ID_DEFAULT;');
    const note = (at > 0 && from > 0 && from < at) ? src.slice(from, at) : '';
    ok(note.length > 100 && note.length < 1500, 'the GMAIL_SCOPE note was found');
    lacks(note, 'Gmail accepts an address in that slot', '⚠ it no longer says the link carries the mailbox — it never has since 2026-09-09');
    has(note, 'the draft link is always /mail/u/0/', 'it says what userinfo.email is for now');
    has(live(fn('gmailDraftUrl')), "'https://mail.google.com/mail/u/0/#drafts?compose='", 'and the link is /u/0/, as it says');
    const e = src.indexOf('function ensureAgreementApproved(');
    const eNote = src.slice(src.lastIndexOf('\n\n', e), e);
    ok(eNote.length > 100 && eNote.length < 2000, 'the ensureAgreementApproved note was found');
    lacks(eNote, 'exportAgreementToDrive', '⚠ it no longer names a filer that does not exist');
    has(eNote, 'files the SIGNING PACKET', 'it says what it files');
    ok(!/(^|\n)function exportAgreementToDrive\(/.test(src), 'and that filer really is gone');
  }
};
