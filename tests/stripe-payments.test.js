'use strict';
// ACH IS NOT A CARD, AND THE APP CALLED IT ONE (2026-09-18).
//
// ⚠⚠ `clearsOnReceipt` was an inline `wire || stripe || cash` at the one write site in
// `saveDeposit`, and `stripe` covered every rail Stripe runs. True of a card — the funds are
// authorised the instant it is swiped. FALSE of an ACH debit, which settles in about four
// business days, returns `R01` inside about two, and carries a SIXTY-CALENDAR-DAY window on the
// unauthorised codes `R05`/`R07`/`R10` that under NACHA rules cannot be re-presented.
//
// So an ACH deposit recorded under the old model stamped `clearedOn` immediately: the app
// asserting money had landed when it had not, on the record of what the firm is owed.
//
// ⚠⚠ THE CONVERSE IS WHAT KEEPS THE FIX FROM BEING A DOWNGRADE, and it is the first group here.
// `isJobFunded` reads `depositPaidTotal` — recorded AMOUNTS — and never consults `clearedOn`.
// Work starts on RECEIVED, deliberately (UNEARNED_REVENUE_SPEC.md §6), because waiting on
// clearing costs 3-5 days a job. Anthony, told about the 60-day window: *"we obviously can't
// wait 2 months to start a job ... that seems unlikely to me, so a risk worth taking."* Right,
// and not waitable in any case. A fix that delayed a job start would be far worse than the
// defect it closes, so that is pinned before anything else.
//
// Every assertion drives the REAL `saveDeposit` against a stubbed DOM and reads the payment
// record back, rather than testing the method list on its own — this repo records eighteen
// times that a check drove a piece while nothing drove the outcome.

const { sandbox, fn, domStub } = require('./harness');

const FNS = ['saveDeposit', 'jobPayments', 'stagePaidTotal', 'jobPaidTotal', 'depositPaidTotal',
             'depositClearedTotal', 'isJobFunded', 'depositTargetFor', 'paymentMethodLabel',
             'updateDepModalHints', 'currentDepStage', '_photoUid', 'fmt'];
const VARS = ['PAYMENT_STAGES', 'PAYMENT_STAGE_LABELS', 'PAYMENT_METHODS_CLEAR_ON_RECEIPT', '_photoUidSeq',
              'LARGE_DEPOSIT_THRESHOLD'];

// The $25,715 estate job this project already uses as its worked example. 50% is $12,858 —
// above LARGE_DEPOSIT_THRESHOLD, which is the realistic size and exercises the instrument
// tier at the same time.
const TOTAL = 25715, DEPOSIT = 12858;

function build(seed) {
  const job = { id: 1, name: 'Butler', hvlId: 'HVL-0007', svc: 'cleanout',
                agrApprovedBy: 'Anthony Graziano', payments: [] };
  const doc = domStub(Object.assign({
    'dep-amount': String(DEPOSIT), 'dep-date': '2026-09-18',
    'dep-method': '', 'dep-reference': '', 'dep-payer': '', 'dep-stage': 'deposit',
  }, seed || {}));
  const ctx = sandbox({
    fns: FNS, vars: VARS,
    stubs: {
      document: doc,
      confirm: () => true,
      jobs: [job],
      estimateStore: { 1: { approved: true, estimate: { havellinTotal: TOTAL } } },
      _agrJob: () => job,
      _actor: () => 'Anthony Graziano',
      _jobTouch: () => {},
      showFB: (id, kind, msg) => { ctx.__fb = { id, kind, msg }; },
      _dashFbTarget: (x) => x,
      saveJobs: () => {}, syncJobToSheets: () => {}, updateAgrUI: () => {},
      renderJobs: () => {}, _dashRedraw: () => {}, loadInvoice: () => {},
      _attachPaymentEvidence: () => {},
    },
  });
  return { ctx, job, doc };
}

function record(method, over) {
  const { ctx, job, doc } = build({ 'dep-method': method });
  if (over !== undefined) doc.getElementById('dep-amount').value = String(over);
  ctx.saveDeposit();
  return { ctx, job, pay: job.payments[job.payments.length - 1] };
}

module.exports = function ({ group, ok, eq, has, lacks }) {

  group('⚠⚠ THE JOB IS FUNDED ON MONEY RECEIVED, NOT MONEY CLEARED — the fix must not gate a start');
  {
    const { ctx, job, pay } = record('stripe_ach');
    eq(pay.clearedOn, null, 'an ACH deposit is recorded UNCLEARED');
    ok(ctx.isJobFunded(job), 'and the job is funded anyway — work can begin the same day');
    eq(job.depositReceived, true, 'the derived depositReceived flag follows received, not cleared');
    eq(ctx.depositPaidTotal(job), DEPOSIT, 'the full deposit counts as received');
    eq(ctx.depositClearedTotal(job), 0, 'while nothing counts as cleared yet');
    lacks(String(ctx.isJobFunded), 'clearedOn', 'isJobFunded must never consult clearedOn');
  }

  group('⚠⚠ ACH DOES NOT CLEAR ON RECEIPT AND A CARD DOES — the defect, both directions');
  {
    eq(record('stripe_ach').pay.clearedOn, null, 'ACH: not final on receipt');
    eq(record('stripe').pay.clearedOn, '2026-09-18', 'card: final on receipt, unchanged');
    eq(record('wire').pay.clearedOn, '2026-09-18', 'wire: final on receipt, unchanged');
    eq(record('cash').pay.clearedOn, '2026-09-18', 'cash: final on receipt, unchanged');
    eq(record('check').pay.clearedOn, null, 'cheque: unchanged, still uncleared');
    eq(record('cashiers_check').pay.clearedOn, null, "cashier's cheque: unchanged");
  }

  group('⚠ ONE DEFINITION of which methods are money on receipt');
  {
    const { ctx } = build({});
    const L = ctx.PAYMENT_METHODS_CLEAR_ON_RECEIPT;
    ok(L.indexOf('stripe_ach') < 0, '⚠ stripe_ach is ABSENT and must never be added');
    ok(L.indexOf('stripe') >= 0 && L.indexOf('wire') >= 0 && L.indexOf('cash') >= 0,
       'card, wire and cash are on it');
    ok(L.indexOf('check') < 0 && L.indexOf('cashiers_check') < 0, 'neither cheque is');
    // The rule used to be an inline || chain, which is how the next rail gets classified by
    // whoever happens to be editing saveDeposit rather than by a decision.
    lacks(fn('saveDeposit').replace(/\/\/[^\n]*/g, ''),
          "method === 'stripe'", 'saveDeposit keeps no inline copy of the rule');
  }

  group('a recorded ACH payment says it is uncleared, on screen and in the record');
  {
    const { ctx, pay } = record('stripe_ach');
    eq(pay.method, 'stripe_ach', 'the method is stored distinctly from a card');
    has(ctx.__fb.msg, 'uncleared', 'the confirmation says so rather than reading as settled');
    eq(ctx.paymentMethodLabel('stripe_ach'), 'Bank transfer (ACH)', 'and it has its own label');
    eq(ctx.paymentMethodLabel('stripe'), 'Card', 'a card is named a card, not a processor');
    eq(ctx.paymentMethodLabel('wire'), 'Wire transfer', 'the other labels are unmoved');
  }

  group('⚠ A RECORD WRITTEN BEFORE TODAY IS A CARD and keeps its meaning');
  {
    // Nothing migrates, deliberately: every `stripe` payment predating this really was a card,
    // and rewriting history to say otherwise would assert an uncleared state that never existed.
    const { ctx } = build({});
    ok(ctx.PAYMENT_METHODS_CLEAR_ON_RECEIPT.indexOf('stripe') >= 0,
       'legacy stripe still clears on receipt');
    ok(ctx.paymentMethodLabel('stripe') !== 'stripe', 'and still renders a human label');
  }

  group('the deposit modal says what ACH means, where the concierge is standing');
  {
    const { ctx, doc } = build({ 'dep-method': 'stripe_ach' });
    doc.getElementById('dep-modal-hint').innerHTML = '';
    ctx.updateDepModalHints();
    const h = doc.getElementById('dep-modal-hint').innerHTML;
    has(h, 'four business days', 'it names the real settlement window');
    has(h, 'uncleared', 'and the state it will read in until then');
    has(h, 'funded on money received', '⚠ and says outright that this does not hold the job up');
    // Flags, never refuses — the standing rule. A hint is not a gate.
    lacks(h, 'cannot', 'it does not refuse');
  }

  group('⚠ the large-instrument tier still fires, and ACH does not swallow it');
  {
    const { ctx, doc } = build({ 'dep-method': 'check' });
    ctx.updateDepModalHints();
    has(doc.getElementById('dep-modal-hint').innerHTML, 'policy exception',
        'a large personal cheque is still flagged');
    const a = build({ 'dep-method': 'stripe_ach' });
    a.ctx.updateDepModalHints();
    has(a.doc.getElementById('dep-modal-hint').innerHTML, 'wire is final on receipt',
        'and an ACH deposit above the threshold still points at the safer instrument');
  }

  group('⚠ a small ACH payment gets the plain note without the instrument warning');
  {
    const { ctx, doc } = build({ 'dep-method': 'stripe_ach', 'dep-amount': '400' });
    ctx.updateDepModalHints();
    const h = doc.getElementById('dep-modal-hint').innerHTML;
    has(h, 'four business days', 'still says ACH is not immediate');
    lacks(h, 'safer instrument', 'but does not push a wire at a small amount');
  }

  group('⚠ THE METHOD IS SELECTABLE — a rail nobody can pick is a dead control');
  {
    // The three driven groups above all set `dep-method` directly, so every one of them
    // passes over a dropdown that does not offer ACH at all. That is the shape this repo
    // records again and again: the check drove the piece and nothing drove the control.
    const src = require('fs').readFileSync(require('path')
      .join(__dirname, '..', 'havellin.html'), 'utf8');
    has(src, '<option value="stripe_ach">', 'the deposit modal offers it');
    has(src, '<option value="stripe">', 'and still offers a card');
    const opt = src.slice(src.indexOf('<option value="stripe_ach">'));
    has(opt.slice(0, 60), 'ACH', 'named so a concierge knows which rail it is');
  }

  group('⚠ NO STRIPE SECRET IS IN THE REPO');
  {
    const src = require('fs').readFileSync(require('path')
      .join(__dirname, '..', 'havellin.html'), 'utf8');
    lacks(src, 'sk_' + 'live_', 'no live secret key');
    lacks(src, 'sk_' + 'test_', 'no test secret key');
    lacks(src, 'whsec' + '_', 'no webhook signing secret');
  }
};
