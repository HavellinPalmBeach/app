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

//
// ─────────────────────────────────────────────────────────────────────────────
// PHASES 1 AND 3 (2026-09-18) — ACH-ONLY LINKS, AND LEARNING THAT THE MONEY LANDED.
//
// ⚠⚠ THE LINK IS VERIFIED AFTER IT IS CREATED, NOT ASSUMED FROM THE PARAMETER. Whether
// `/v1/payment_links` honours `payment_method_types` could not be confirmed from the build
// environment — docs.stripe.com is blocked by the egress proxy — so the backend reads the link
// back and DEACTIVATES one that would also take a card. That is the `DriveApp.getThumbnail()`
// lesson: the method name promised a thumbnail and returned a 130KB photograph. Trust the
// measurement. The tests below therefore COUNT the deactivation call rather than grepping for
// it, because a build that deactivates nothing still contains the string.
//
// ⚠⚠ AND ONLY `succeeded` IS MONEY. On ACH the checkout session reads `complete` the instant
// the client authorises, while the transfer is still ~4 business days out and can still fail.
// Recording that is byte-for-byte the defect the clears-on-receipt split above exists to undo,
// so the read-back drives a session at `complete` over an intent at `processing` and asserts
// nothing is recorded.

const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { sandbox, fn, domStub, matchBrace } = require('./harness');

// ─── DRIVING THE REAL BACKEND ────────────────────────────────────────────────
const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
function gsFn(name) {
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(GS);
  if (!m) throw new Error('not in .gs: ' + name);
  const start = m.index + (m[1] ? m[1].length : 0);
  const open = GS.indexOf('{', re.lastIndex);
  return GS.slice(start, matchBrace(GS, open) + 1);
}
function gsVar(name) {
  const m = GS.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[\\s\\S]*?;)'));
  if (!m) throw new Error('var not in .gs: ' + name);
  return m[2];
}

// A vm holding the real Stripe backend over stubbed Apps Script globals. `fetch` is the seam:
// every call goes through UrlFetchApp, so replacing it drives the real request building and
// the real response handling with no network and no key.
function gsCtx({ props = { STRIPE_SECRET_KEY: 'sk' + '_test_zzz' }, fetch = null } = {}) {
  const calls = [];
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null) }) },
    Logger: { log: (m) => calls.push({ log: String(m) }) },
    UrlFetchApp: {
      fetch: (url, opts) => {
        calls.push({ url, opts });
        const r = fetch ? fetch(url, opts, calls) : { code: 200, body: {} };
        return { getResponseCode: () => r.code, getContentText: () => JSON.stringify(r.body) };
      },
    },
    Date, JSON, Math, Number, String, Object, Array, encodeURIComponent, RegExp,
    __calls: calls,
  };
  vm.createContext(ctx);
  vm.runInContext([
    gsVar('STRIPE_API'), gsVar('STRIPE_API_VERSION'), gsVar('STRIPE_ALLOWED_METHODS'),
    gsFn('_stProp'), gsFn('_stMissingProps'), gsFn('_stErr'), gsFn('_stForm'), gsFn('_stApi'),
    gsFn('stripeCreatePaymentLink'), gsFn('stripePaymentsForLink'),
  ].join('\n'), ctx);
  ctx.calls = calls;
  return ctx;
}

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

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1 — THE LINK IS ACH, AND IT IS PROVEN RATHER THAN REQUESTED
  // ═══════════════════════════════════════════════════════════════════════════

  group('⚠⚠ PHASE 1: ACH only — and the parameter is not taken on trust');
  {
    // The allowed list itself. ⚠ Adding a card here is a PRICING decision, not a config one:
    // on the $25,715 worked example a card costs $746.63 against $16.50 on ACH, and a 3%
    // surcharge cannot close it legally — the cap is the LOWER of 3% or actual cost of
    // acceptance, and the blended card rate is 2.9023% at these ticket sizes.
    const ctx0 = gsCtx();
    eq(JSON.stringify(ctx0.STRIPE_ALLOWED_METHODS), '["us_bank_account"]',
      'exactly one method, and it is ACH');

    // ── the happy path ───────────────────────────────────────────────────────
    let c = gsCtx({ fetch: (url, opts) => ({ code: 200,
      body: { id: 'plink_1', url: 'https://buy.stripe.com/x', payment_method_types: ['us_bank_account'] } }) });
    let r = c.stripeCreatePaymentLink({ amount: 12858, jobId: '1', hvlId: 'HVL-0007', stage: 'deposit',
                                        description: 'Havellin Palm Beach — Deposit (50%)' });
    ok(r.ok, 'an ACH-only link comes back ok');
    eq(r.linkId, 'plink_1', 'carrying the link id the read-back will ask about');
    eq(r.url, 'https://buy.stripe.com/x', 'and the url to send');
    eq(r.amount, 12858, 'and the amount, back in dollars');
    eq(c.calls.length, 1, '⚠ ONE call — a happy path deactivates nothing');

    // ⚠ CENTS, NOT DOLLARS. Stripe takes the smallest currency unit, and a link minted in
    // dollars asks a client for $128.58 on a $12,858 deposit — off by a hundred, silently.
    ok(/unit_amount%5D=1285800(&|$)/.test(c.calls[0].opts.payload), 'priced in cents');
    // ⚠ FORM ENCODING WITH BRACKET NESTING, NOT JSON. Posting JSON here returns a 400 that
    // reads like a bad key, which is the wrong place to start debugging.
    eq(c.calls[0].opts.contentType, 'application/x-www-form-urlencoded', 'form-encoded, not JSON');
    ok(/line_items%5B0%5D%5Bprice_data%5D%5Bcurrency%5D=usd/.test(c.calls[0].opts.payload),
      'nested with brackets');
    ok(/payment_method_types%5B0%5D=us_bank_account/.test(c.calls[0].opts.payload),
      'and asks for ACH in the request');
    // ⚠ THE METADATA IS HOW A PAYMENT FINDS ITS WAY HOME. Once a transfer lands four days
    // later Stripe is the only record of which job and stage it belongs to.
    ['jobId%5D=1', 'hvlId%5D=HVL-0007', 'stage%5D=deposit'].forEach((m) =>
      ok(c.calls[0].opts.payload.indexOf('metadata%5B' + m) >= 0, 'metadata carries ' + m.split('%5D')[0]));

    // ── a link that would also take a card ───────────────────────────────────
    // ⚠⚠ THE OUTCOME IS WHAT IS COUNTED, NOT THE SOURCE. A build that reads the methods back,
    // notices the card and returns the link anyway still contains every string a grep would
    // look for. What matters is that a SECOND call goes out deactivating it and the link is
    // NOT returned — the same gap this repo records on the DocuSign certificate fetch, where
    // a revert that fetched the file and threw it away came back green.
    c = gsCtx({ fetch: (url) => (url.indexOf('/payment_links/plink_2') >= 0
      ? { code: 200, body: { id: 'plink_2', active: false } }
      : { code: 200, body: { id: 'plink_2', url: 'https://buy.stripe.com/y',
                             payment_method_types: ['us_bank_account', 'card'] } }) });
    r = c.stripeCreatePaymentLink({ amount: 12858, stage: 'deposit' });
    ok(!r.ok, 'a link that also takes a card is REFUSED');
    ok(!r.url, 'and no url comes back, so nothing can be sent');
    eq(c.calls.length, 2, '⚠ a SECOND call goes out — the link is really deactivated');
    // ⚠ READ DEFENSIVELY. When the deactivation does not go out `c.calls[1]` is undefined, and
    // a bare `.url` on it kills the whole FILE — so a revert of the check reports one crash
    // instead of the four assertions it actually breaks. This repo records that shape once
    // before, on a test whose whole point was the empty case.
    const deact = c.calls[1] || { url: '', opts: {} };
    ok(/\/payment_links\/plink_2/.test(deact.url || ''), 'against that link');
    ok(/active=false/.test((deact.opts || {}).payload || ''), 'turning it off');
    has(r.error, 'card', 'the refusal names what it would have accepted');
    has(r.error, 'Payment methods', 'and where to fix it');

    // ⚠⚠ AN EMPTY LIST IS A FAILURE, NOT A PASS. Stripe returns nothing there when it defers
    // to the Dashboard's own payment-method settings — which may include cards. ACH-only
    // cannot be PROVEN in that case, and an unprovable claim about how a client may pay is
    // exactly what this whole verification exists to refuse.
    c = gsCtx({ fetch: (url) => (url.indexOf('/payment_links/plink_3') >= 0
      ? { code: 200, body: { id: 'plink_3' } }
      : { code: 200, body: { id: 'plink_3', url: 'https://buy.stripe.com/z' } }) });
    r = c.stripeCreatePaymentLink({ amount: 100, stage: 'deposit' });
    ok(!r.ok, 'a link that does not say which methods it takes is refused too');
    eq(c.calls.length, 2, 'and deactivated');

    // ── refusals that must be legible ────────────────────────────────────────
    // Named individually, never "not configured" — the lesson this repo records twice, on the
    // PDF conversion and on the five DocuSign properties.
    c = gsCtx({ props: {} });
    r = c.stripeCreatePaymentLink({ amount: 100 });
    ok(!r.ok, 'no key, no link');
    has(r.error, 'STRIPE_SECRET_KEY', 'and the missing property is named');
    eq(c.calls.length, 0, '⚠ and nothing was sent to Stripe at all');

    c = gsCtx();
    r = c.stripeCreatePaymentLink({ amount: 0 });
    ok(!r.ok, 'a zero amount is refused');
    eq(c.calls.length, 0, 'before any network call');

    c = gsCtx({ fetch: () => ({ code: 402, body: { error: { message: 'Your account cannot accept payments.' } } }) });
    r = c.stripeCreatePaymentLink({ amount: 100 });
    ok(!r.ok, "Stripe's own refusal is a refusal here");
    has(r.error, 'Your account cannot accept payments', "⚠ and its own words are passed through");
    has(r.error, '402', 'with the status code');
  }

  group("⚠ _stForm — Stripe's encoding, driven rather than described");
  {
    const c = gsCtx();
    eq(c._stForm({ a: 1, b: 'x y' }), 'a=1&b=x%20y', 'flat pairs are url-encoded');
    eq(c._stForm({ expand: ['data.payment_intent'] }), 'expand%5B0%5D=data.payment_intent',
      'an array of scalars indexes');
    eq(c._stForm({ line_items: [{ quantity: 1 }] }), 'line_items%5B0%5D%5Bquantity%5D=1',
      'an array of objects nests');
    eq(c._stForm({ metadata: { stage: 'deposit' } }), 'metadata%5Bstage%5D=deposit', 'objects nest');
    // ⚠ A null is DROPPED, not sent as the string "null" — Stripe reads that as a value.
    eq(c._stForm({ a: 1, b: null, c: undefined, d: 2 }), 'a=1&d=2', 'null and undefined are omitted');
    // ⚠ AND 0 IS A VALUE. A truthiness filter would drop a legitimate zero.
    eq(c._stForm({ a: 0 }), 'a=0', 'but zero is kept');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3 — LEARNING THAT THE MONEY LANDED
  // ═══════════════════════════════════════════════════════════════════════════

  group("⚠⚠ PHASE 3 backend: the INTENT's status, never the session's");
  {
    // ⚠⚠ THIS IS THE ONE THAT MATTERS. On ACH the checkout session reads `complete` the moment
    // the client authorises their bank, while the transfer is still about four business days
    // out and can still fail. A build reading `s.status` records money that has not arrived —
    // byte-for-byte the defect the clears-on-receipt split exists to undo, arriving by a
    // different door. So the fixture deliberately puts `complete` over `processing`.
    const SESSIONS = {
      code: 200,
      body: { data: [
        { id: 'cs_1', status: 'complete', customer_details: { name: 'Tripp Butler' },
          payment_intent: { id: 'pi_1', status: 'processing', amount: 1285800, created: 1789000000 } },
        { id: 'cs_2', status: 'complete', customer_details: { email: 'exec@example.com' },
          payment_intent: { id: 'pi_2', status: 'succeeded', amount: 1285800, amount_received: 1285800, created: 1789300000 } },
        // A session that never got as far as an intent, and one whose intent came back as a
        // bare id string because the expand was dropped. Neither may crash the read.
        { id: 'cs_3', status: 'open' },
        { id: 'cs_4', status: 'complete', payment_intent: 'pi_4' },
      ] },
    };
    const c = gsCtx({ fetch: () => SESSIONS });
    const r = c.stripePaymentsForLink({ linkId: 'plink_1' });
    ok(r.ok, 'the read comes back ok');
    eq(r.payments.length, 2, 'the two sessions with expanded intents are read; the other two are skipped');
    eq(r.payments[0].status, 'processing',
      "⚠⚠ a session reading `complete` over an intent at `processing` reports PROCESSING");
    eq(r.payments[1].status, 'succeeded', 'and a settled one reports succeeded');
    eq(r.payments[0].piId, 'pi_1', 'carrying the intent id, which is what makes recording idempotent');
    eq(r.payments[1].amount, 12858, 'and the amount back in dollars');
    eq(r.payments[0].payer, 'Tripp Butler', 'the payer by name where Stripe has one');
    eq(r.payments[1].payer, 'exec@example.com', 'and by email where it does not');

    // ⚠ ONE LIST CALL, NOT LIST-THEN-GET-EACH. `expand[]=data.payment_intent` returns the
    // intent inline; fetching each separately is N+1 calls for the same answer.
    eq(c.calls.length, 1, 'one call for the whole link');
    ok(/expand%5B0%5D=data.payment_intent/.test(c.calls[0].url), 'expanding the intent inline');
    ok(/payment_link=plink_1/.test(c.calls[0].url), 'scoped to this link');
    ok(c.calls[0].opts.method === 'get' || c.calls[0].opts.method === 'GET', 'as a GET');
    ok(!c.calls[0].opts.payload, '⚠ and a GET carries its params in the URL, never a body');

    // A refusal must be legible and must NOT look like an absence of money.
    const c2 = gsCtx({ fetch: () => ({ code: 502, body: { error: { message: 'Bad gateway' } } }) });
    const r2 = c2.stripePaymentsForLink({ linkId: 'plink_1' });
    ok(!r2.ok, 'a 502 is a failure');
    ok(!r2.payments, 'and reports NO payment list — an empty list would read as "nothing paid"');
    has(r2.error, '502', 'naming the status');
    has(r2.error, 'Bad gateway', "and Stripe's own words");

    const c3 = gsCtx();
    ok(!c3.stripePaymentsForLink({}).ok, 'no link id, no read');
    eq(c3.calls.length, 0, 'and nothing is sent');
  }

  group('⚠ the backend is on the MAIN deployment, and declares itself');
  {
    // ⚠⚠ IT IS IN main-sync.gs RATHER THAN A SECOND SCRIPT, which reverses the quo-sync.gs
    // precedent on purpose and for the same reason DocuSign did on 2026-09-17: this is on the
    // app's REQUEST PATH, so it has to move in lockstep with BACKEND_VERSION and the
    // dispatch-parity test. `checkBackendVersion` cannot reach a second deployment, so a stale
    // one fails silently and reads as an app bug — the defect that cost this project six weeks.
    ['stripeLink', 'stripeStatus'].forEach((a) => {
      ok(GS.indexOf("data.action === '" + a + "'") >= 0, a + ' is dispatched');
      ok(new RegExp("BACKEND_ACTIONS[\\s\\S]{0,400}'" + a + "'").test(GS), a + ' is declared in BACKEND_ACTIONS');
    });
    // ⚠ A FLOOR, NOT TODAY'S LITERAL. This repo records that exact assertion breaking twice on
    // this one constant. What the feature NEEDS is a deployment new enough to hold the two
    // actions above; a build older than that cannot mint a link or read a payment back.
    const bv = (GS.match(/BACKEND_VERSION\s*=\s*'([^']+)'/) || [])[1] || '';
    ok(bv >= '2026-09-18a', 'BACKEND_VERSION is at or past the build the Stripe actions landed in (' + bv + ')');

    // ⚠ NO SECRET IN THE REPO. This one is public and havellin.html is served from GitHub
    // Pages, so a key in either is not a key — the lesson from a Google client secret pasted
    // into a chat on 2026-09-08. The needle is a whole key, not the prefix: `_stProp(...)
    // .indexOf('sk_live_')` is a legitimate LIVE-vs-TEST check and must not trip it.
    ok(!/sk_(live|test)_[A-Za-z0-9]{16,}/.test(GS), 'no Stripe secret key in main-sync.gs');
    ok(!/whsec_[A-Za-z0-9]{16,}/.test(GS), 'and no webhook signing secret');
    has(GS, "_stProp('STRIPE_SECRET_KEY')", 'the key is read from Script Properties');

    // ⚠ NO WEBHOOK ENDPOINT, AND THE REASON IS NOT THE RATE LIMIT. `doPost(e)` exposes no
    // request HEADERS and Stripe signs with `Stripe-Signature`, so an Apps Script endpoint
    // cannot authenticate a delivery — leaving an open URL that marks a $12,858 deposit paid.
    ok(GS.indexOf('Stripe-Signature') === -1 || GS.indexOf("data.action === 'stripeWebhook'") === -1,
      'there is no unauthenticated webhook endpoint');

    // ⚠ EDITOR-ONLY, ARGUMENT-FREE, READ-ONLY — the testQuoAuth / testEsignAuth pattern. The
    // Run menu passes no arguments, and it must prove the key WITHOUT minting a link, or an
    // auth failure masquerades as a sending bug.
    const ta = gsFn('testStripeAuth');
    ok(/function testStripeAuth\(\)/.test(ta), 'testStripeAuth takes no arguments');
    lacks(ta, '/payment_links', '⚠ and creates nothing');
    has(ta, "'/balance'", 'it proves the key against a read');
    has(ta, 'us_bank_account_ach_payments', '⚠ and reports whether ACH is actually switched on');
  }

  // ⚠ COMMENT-STRIPPED. A `lacks()` over a raw body trips on the comment EXPLAINING the fix,
  // which this repo records paying for six times — `stripePaymentLink`'s own comments name
  // `currentAgrJobId` and the Gmail sender precisely to say why neither is in the code.
  const noC = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  // ─── THE APP SIDE OF THE READ-BACK ───────────────────────────────────────────
  // A sandbox holding the real recorder over the real payment helpers, so the record that
  // comes out is the one `isJobFunded`, the rail and the invoice all read.
  const RB_FNS = ['applyStripePayments', '_stripeRecordPayment', '_stripeDue', 'outstandingPayments',
                  'stripeRefresh', 'jobPayments', 'stagePaidTotal', 'depositPaidTotal',
                  'depositClearedTotal', 'isJobFunded', 'depositTargetFor', '_photoUid',
                  '_jobTouch', 'docState', 'fmt'];

  function rbCtx(jobsSeed) {
    const notices = [];
    const posts = [];
    const ctx = sandbox({
      fns: RB_FNS,
      vars: ['PAYMENT_STAGES', 'PAYMENT_STAGE_LABELS', '_photoUidSeq', 'STRIPE_RECHECK_MINS'],
      stubs: {
        jobs: jobsSeed,
        SHEETS_SYNC_URL: 'https://script.google.com/macros/s/x/exec',
        saveJobs: () => {}, syncJobToSheets: () => {}, renderJobs: () => {},
        _docNotice: (t, m, j) => notices.push({ t, m, j }),
        _appsScriptPost: (url, body, cb) => { posts.push(body); (ctx.__answer || ((b, c) => c(true, { ok: true, payments: [] })))(body, cb); },
      },
    });
    ctx.__notices = notices; ctx.__posts = posts;
    return ctx;
  }

  const jobWithLink = (over) => Object.assign({
    id: 1, name: 'Butler', hvlId: 'HVL-0007', svc: 'cleanout', havellinEst: TOTAL, payments: [],
    docState: { 'invoice:deposit': { stripe: { linkId: 'plink_1', url: 'https://buy.stripe.com/x', amount: DEPOSIT } } },
  }, over || {});

  group('⚠⚠ ONLY `succeeded` IS MONEY — a session at `complete` records nothing');
  {
    const job = jobWithLink();
    const ctx = rbCtx([job]);
    const n = ctx.applyStripePayments(1, 'invoice:deposit', 'deposit', { payments: [
      { piId: 'pi_1', status: 'processing', amount: DEPOSIT, createdAt: '2026-09-18T12:00:00Z' },
      { piId: 'pi_x', status: 'requires_payment_method', amount: DEPOSIT, createdAt: '2026-09-18T12:00:00Z' },
      { piId: 'pi_y', status: 'canceled', amount: DEPOSIT, createdAt: '2026-09-18T12:00:00Z' },
    ] });
    eq(n, 0, 'nothing is recorded');
    eq(ctx.jobPayments(job).length, 0, 'the job holds no payment');
    ok(!ctx.isJobFunded(job), '⚠ and the job is NOT funded — an authorised transfer is a promise, not a payment');
    eq(ctx.__notices.length, 0, 'and it says nothing, because nothing happened');
    // ⚠ BUT THE CHECK IS STAMPED. The answer arrived and it was "not yet" — that is a real
    // answer, and re-asking Stripe every dashboard repaint for it buys nothing.
    ok(!!job.docState['invoice:deposit'].stripe.checkedAt, 'the check is stamped even with nothing to record');
  }

  group('⚠⚠ A SETTLED TRANSFER RECORDS ITSELF, IN THE SHAPE saveDeposit WRITES BY HAND');
  {
    const job = jobWithLink();
    const ctx = rbCtx([job]);
    const n = ctx.applyStripePayments(1, 'invoice:deposit', 'deposit', { payments: [
      { piId: 'pi_2', status: 'succeeded', amount: DEPOSIT, payer: 'Tripp Butler', createdAt: '2026-09-22T14:03:00Z' },
    ] });
    eq(n, 1, 'one payment is recorded');
    const p = ctx.jobPayments(job)[0];
    eq(p.amount, DEPOSIT, 'for the amount that settled');
    eq(p.stage, 'deposit', 'against the stage its link was minted for');
    // ⚠ `stripe_ach`, NOT `stripe`. A card is final on receipt and this is not — see
    // PAYMENT_METHODS_CLEAR_ON_RECEIPT above. Recording it as a card is the defect this whole
    // file opens with, arriving automatically instead of by hand.
    eq(p.method, 'stripe_ach', 'as a bank transfer, never as a card');
    eq(p.recordedBy, 'Stripe', 'attributed to Stripe rather than to whoever happened to be looking');
    eq(p.reference, 'pi_2', "carrying Stripe's own reference");
    eq(p.payer, 'Tripp Butler', 'and the payer');
    eq(p.receivedOn, '2026-09-22', 'dated when the money moved, not when we looked');
    // ⚠⚠ AND HERE clearedOn IS SET, WHICH LOOKS LIKE A CONTRADICTION AND IS NOT. The METHOD
    // says "not final when a person records it", because then all anybody knows is that the
    // client authorised it. This record exists only because Stripe reported the intent
    // `succeeded` — the money has genuinely settled. That is the one moment an ACH payment is
    // cleared, and it is the whole reason read-back is worth building.
    eq(p.clearedOn, '2026-09-22', '⚠⚠ and it IS cleared, because Stripe said succeeded');
    eq(ctx.depositClearedTotal(job), DEPOSIT, 'so it counts as cleared money');
    ok(ctx.isJobFunded(job), 'and the job is funded');
    eq(job.depositReceivedBy, 'Stripe', 'the legacy mirror names Stripe too');
    eq(job.depositReceivedAt, '2026-09-22', 'and carries the date the money moved');

    // ⚠ IT TRAVELS. Every store write merges per key, so a payment born without a stamp is
    // merged away by the other device's next save — the defect the 2026-09-12 job merge closed.
    ok(!!p.uid, 'the payment carries a uid');
    ok(job.at && job.at['payments:' + p.uid], '⚠ and _jobTouch stamped it, so a stale device cannot erase it');
    ok(job.at['docState:invoice:deposit'], 'and the docState key is stamped too');

    // It says so, once, naming the money and the stage.
    eq(ctx.__notices.length, 1, 'it speaks exactly once');
    has(ctx.__notices[0].m, 'received by bank transfer', 'saying what arrived');
    has(ctx.__notices[0].m, 'Deposit', 'and on which stage');
  }

  group('⚠⚠ IDEMPOTENT ON THE INTENT ID — polling twice does not pay twice');
  {
    // ⚠ NOT ON `payment.id`. That is max(id)+1 over the payments THIS DEVICE holds, so two
    // devices both mint 1 — and this repo records that a union by id then FUSES two real
    // payments into one rather than merely losing one. The intent id is Stripe's, unique, and
    // the same on every device.
    const job = jobWithLink();
    const ctx = rbCtx([job]);
    const d = { payments: [{ piId: 'pi_2', status: 'succeeded', amount: DEPOSIT, createdAt: '2026-09-22T14:03:00Z' }] };
    eq(ctx.applyStripePayments(1, 'invoice:deposit', 'deposit', d), 1, 'the first pass records it');
    eq(ctx.applyStripePayments(1, 'invoice:deposit', 'deposit', d), 0, 'the second records nothing');
    eq(ctx.applyStripePayments(1, 'invoice:deposit', 'deposit', d), 0, 'and so does the third');
    eq(ctx.jobPayments(job).length, 1, 'one payment on the job');
    eq(ctx.depositPaidTotal(job), DEPOSIT, '⚠ and the deposit is not counted twice');

    // Two genuinely different transfers against one stage — a part payment and its balance —
    // stay two, because they carry two intent ids.
    const job2 = jobWithLink();
    const c2 = rbCtx([job2]);
    eq(c2.applyStripePayments(1, 'invoice:deposit', 'deposit', { payments: [
      { piId: 'pi_a', status: 'succeeded', amount: 6000, createdAt: '2026-09-22T14:00:00Z' },
      { piId: 'pi_b', status: 'succeeded', amount: 6858, createdAt: '2026-09-23T14:00:00Z' },
    ] }), 2, 'two transfers are two payments');
    eq(c2.depositPaidTotal(job2), DEPOSIT, 'and they add up');
  }

  group('⚠ WHAT IS STILL BEING WAITED ON — and what drops off');
  {
    const open = jobWithLink();
    const funded = jobWithLink({ id: 2, payments: [
      { id: 1, uid: 'u', stage: 'deposit', amount: DEPOSIT, clearedOn: '2026-09-22', method: 'stripe_ach' }] });
    const paper = { id: 3, name: 'Ellsworth', payments: [], docState: {} };
    const ctx = rbCtx([open, funded, paper]);
    const out = ctx.outstandingPayments();
    eq(out.length, 1, 'only the link still waiting is listed');
    eq(out[0].jobId, 1, 'and it is the unfunded one');
    eq(out[0].stage, 'deposit', 'carrying its stage');
    eq(out[0].linkId, 'plink_1', 'and its link id');
    // ⚠ A STAGE DROPS OFF ONCE ITS TARGET IS MET, or a finished stage is asked about forever —
    // the rule `esignJobWatches` already follows on a signed agreement.
    ok(!out.some((e) => e.jobId === 2), '⚠ a funded deposit is no longer asked about');
    // ⚠ AND A JOB THAT NEVER GOT A LINK IS NOT WATCHED AT ALL — the paper-route rule.
    ok(!out.some((e) => e.jobId === 3), 'a job with no link is not watched');
  }

  group('⚠ THE GATE, AND WHY IT IS NOT THE DOCUSIGN FLOOR');
  {
    const ctx = rbCtx([]);
    // ⚠⚠ DO NOT COPY THE 15-MINUTE DOCUSIGN FLOOR ACROSS AS THOUGH IT WERE A RULE. DocuSign
    // publishes one request per unique resource per 15 minutes and names REVOCATION as the
    // penalty. Stripe has no such rule. This gate exists only so a dashboard repaint and the
    // 15-second remote tick do not each fire a network call.
    ok(ctx.STRIPE_RECHECK_MINS > 0, 'there is a gate');
    const now = Date.now();
    ok(ctx._stripeDue({ stripe: { linkId: 'x' } }), 'a link never checked is due');
    ok(!ctx._stripeDue({ stripe: { linkId: 'x', checkedAt: new Date(now - 60000).toISOString() } }),
      'checked a minute ago is not due');
    ok(ctx._stripeDue({ stripe: { linkId: 'x', checkedAt: new Date(now - (ctx.STRIPE_RECHECK_MINS + 1) * 60000).toISOString() } }),
      'past the window it is due again');
    ok(!ctx._stripeDue({ stripe: {} }), 'and a stage with no link is never due');
    ok(!ctx._stripeDue(null), 'nor is a stage with no state at all');

    // ⚠⚠ AND THERE IS NO TIMER AT ALL, WHICH IS THE ACTUAL DESIGN. The check is wired to
    // ARRIVAL — a page load and opening a client — so it fires when somebody is looking at the
    // answer and never when nobody is. ACH takes ~4 business days; nothing needs it sooner.
    const rf = fn('stripeRefresh');
    lacks(rf, 'setInterval', 'no interval');
    lacks(rf, 'setTimeout', 'no timeout');
    // ⚠ SEQUENTIAL, NEVER Promise.all. Every store write takes the GLOBAL Apps Script lock, and
    // this repo records in full what parallel sending cost on 2026-09-11: the retry
    // manufactured the condition it was retrying.
    lacks(rf, 'Promise.all', '⚠ and never sends in parallel');
    const src2 = require('fs').readFileSync(require('path').join(__dirname, '..', 'havellin.html'), 'utf8');
    has(src2, 'stripeRefresh({}, ', 'a page load asks');
    has(src2, 'stripeRefresh({ jobId: jobId }', 'and so does opening a client');
  }

  group('⚠⚠ A FAILED CHECK SPEAKS, AND DOES NOT CLAIM THE MONEY IS ABSENT');
  {
    const job = jobWithLink();
    const ctx = rbCtx([job]);
    ctx.__answer = (b, cb) => cb(true, { ok: false, error: 'Stripe status check failed (HTTP 502): Bad gateway' });
    let done = -1;
    ctx.stripeRefresh({}, (n) => { done = n; });
    eq(done, 0, 'nothing is recorded');
    eq(ctx.__notices.length, 1, 'and it says so rather than failing silently');
    has(ctx.__notices[0].m, '502', 'naming the cause');
    // ⚠⚠ "not paid" WOULD BE A CLAIM, AND IT WOULD BE FALSE. A silent failure leaves a settled
    // deposit reading unpaid forever — a state with no exit, which this repo's standing rule
    // calls worse than a failure. So the notice refuses to assert the absence.
    has(ctx.__notices[0].m, 'this is not a statement that it has not',
      '⚠⚠ and refusing to assert that no money arrived');
    // ⚠ AND A FAILED CHECK MUST NOT STAMP `checkedAt` — that would burn the whole window on an
    // answer nobody got, so a transient 502 makes the app blind for ten minutes.
    ok(!job.docState['invoice:deposit'].stripe.checkedAt, '⚠ and the stamp is unmoved');
    ok(!ctx.isJobFunded(job), 'the job is not funded off a failed check');

    // The converse: a good answer stamps, and the next pass does not re-ask.
    const job2 = jobWithLink();
    const c2 = rbCtx([job2]);
    c2.__answer = (b, cb) => cb(true, { ok: true, payments: [] });
    c2.stripeRefresh({}, () => {});
    eq(c2.__posts.length, 1, 'one job, one call');
    eq(c2.__posts[0].action, 'stripeStatus', 'asking the status action');
    eq(c2.__posts[0].linkId, 'plink_1', 'about that link');
    ok(!!job2.docState['invoice:deposit'].stripe.checkedAt, 'a real answer stamps');
    c2.stripeRefresh({}, () => {});
    eq(c2.__posts.length, 1, '⚠ and a second pass inside the window makes NO network call');
  }

  group('⚠ stripeRefresh is sequential, and scopes to one job when asked');
  {
    const a = jobWithLink({ id: 1 });
    const b = jobWithLink({ id: 2, hvlId: 'HVL-0008' });
    b.docState['invoice:deposit'].stripe.linkId = 'plink_2';
    const ctx = rbCtx([a, b]);
    let peak = 0, live = 0;
    const pending = [];
    ctx.__answer = (body, cb) => { live++; peak = Math.max(peak, live); pending.push(() => { live--; cb(true, { ok: true, payments: [] }); }); };
    ctx.stripeRefresh({}, () => {});
    eq(peak, 1, '⚠ one request on the wire at a time');
    while (pending.length) pending.shift()();
    eq(ctx.__posts.length, 2, 'both links were asked about, one after the other');

    // Scoped: opening one client asks about that client only.
    const a2 = jobWithLink({ id: 1 });
    const b2 = jobWithLink({ id: 2 });
    b2.docState['invoice:deposit'].stripe.linkId = 'plink_2';
    const c2 = rbCtx([a2, b2]);
    c2.__answer = (body, cb) => cb(true, { ok: true, payments: [] });
    c2.stripeRefresh({ jobId: 2 }, () => {});
    eq(c2.__posts.length, 1, 'only the open client is asked about');
    eq(c2.__posts[0].linkId, 'plink_2', 'and it is the right one');

    // No backend URL, no calls — and no crash.
    const c3 = rbCtx([jobWithLink()]);
    c3.SHEETS_SYNC_URL = '';
    let r3 = -1;
    c3.stripeRefresh({}, (n) => { r3 = n; });
    eq(r3, 0, 'an unconfigured device reports nothing');
    eq(c3.__posts.length, 0, 'and sends nothing');
  }

  group('⚠⚠ ONE LINK PER STAGE, PRICED BY THE ONE THING THAT OWNS THE MONEY');
  {
    const sp = noC(fn('stripePaymentLink'));
    // ⚠⚠ THE AMOUNT COMES FROM `invoiceHtml`, and re-deriving it here would be a second copy
    // of the money — the drift this repo records more often than anything else. It is also the
    // figure the client's own invoice states as due, so the link and the document cannot
    // disagree about what is owed.
    has(sp, 'invoiceHtml(job, stage)', 'the amount is taken from the invoice');
    has(sp, 'inv.amtDue', 'specifically what that invoice says is due');
    ok(!/amtDue[\s\S]{0,200}(havellinEst|paymentSplit\()/.test(sp),
      '⚠ and nothing beside it re-derives the figure');
    has(sp, 'if (inv.blocked)', 'a blocked invoice cannot be sent for payment');
    // ⚠ A SECOND LINK FOR ONE STAGE IS TWO WAYS TO PAY THE SAME INVOICE, and a client who pays
    // both has overpaid by a deposit. Once minted, the same link comes back.
    has(sp, 'if (st.stripe && st.stripe.url)', 'an existing link is returned rather than re-minted');
    // ⚠ NO AUTOMATIC RETRY — the rule `addVendor` and the DocuSign send already follow. A failed
    // POST never reveals whether it landed, and re-sending mints a SECOND link against one stage.
    ok(!/action: 'stripeLink'[\s\S]{0,600}\}, *function[\s\S]{0,40}\}, *true\)/.test(sp),
      '⚠ and allowRetry is not passed');
    // ⚠ IT TAKES THE JOB RATHER THAN READING A GLOBAL — the wrong-job hazard Slice 1 exists to
    // close, on the one control that asks a client for money.
    ok(/function stripePaymentLink\(jobId, stage\)/.test(fn('stripePaymentLink')), 'it takes the job and the stage');
    lacks(sp, 'currentAgrJobId', 'and reads no global to decide which job it is');
    // ⚠ THE APP NEVER SENDS IT. Anthony reviews and sends every client document himself — the
    // same requirement that makes `gmail.compose` deliberately unable to send.
    lacks(sp, 'gmailCreateDraft', 'the app does not mail it');
    lacks(noC(fn('_stripeShowLink')), 'gmail', 'nor does the thing that shows it');
  }

  group('⚠⚠ THE JOIN: the real backend answer, fed to the real recorder');
  {
    // ⚠⚠ EVERY CHECK ABOVE DROVE A PIECE. The backend group asserts `stripePaymentsForLink`
    // reports the INTENT's status; the app group asserts `applyStripePayments` records only
    // `succeeded`. **Neither notices that the two ends no longer meet** — and reverting the
    // intent-vs-session read failed exactly ONE assertion about a string, on the single line
    // that decides whether the app records money that has not arrived. That is the gap this
    // repo records more than any other: the check drove a piece and nothing drove the outcome.
    //
    // So this takes the REAL backend's output for a session reading `complete` over an intent
    // at `processing` and hands it to the REAL recorder, and asks what the JOB says.
    const SESSIONS = { code: 200, body: { data: [
      { id: 'cs_j', status: 'complete', customer_details: { name: 'Tripp Butler' },
        payment_intent: { id: 'pi_j', status: 'processing', amount: 1285800, created: 1789000000 } },
    ] } };

    const authorised = gsCtx({ fetch: () => SESSIONS }).stripePaymentsForLink({ linkId: 'plink_1' });
    const job = jobWithLink();
    const ctx = rbCtx([job]);
    ctx.applyStripePayments(1, 'invoice:deposit', 'deposit', authorised);
    eq(ctx.jobPayments(job).length, 0,
      '⚠⚠ a client who has AUTHORISED but whose money has not moved leaves the job with no payment');
    ok(!ctx.isJobFunded(job), '⚠⚠ and the job is NOT funded — this is the whole defect, end to end');
    eq(ctx.depositPaidTotal(job), 0, 'nothing is counted as received');

    // Four business days later the same session's intent has settled. Same link, same read,
    // and now it records — so the silence above is a gate rather than a dead path.
    const SETTLED = { code: 200, body: { data: [
      { id: 'cs_j', status: 'complete', customer_details: { name: 'Tripp Butler' },
        payment_intent: { id: 'pi_j', status: 'succeeded', amount: 1285800,
                          amount_received: 1285800, created: 1789300000 } },
    ] } };
    const settled = gsCtx({ fetch: () => SETTLED }).stripePaymentsForLink({ linkId: 'plink_1' });
    ctx.applyStripePayments(1, 'invoice:deposit', 'deposit', settled);
    eq(ctx.jobPayments(job).length, 1, 'once it settles, the same link records one payment');
    eq(ctx.depositPaidTotal(job), DEPOSIT, 'for the full deposit');
    ok(ctx.isJobFunded(job), 'and the job is funded');
    eq(ctx.jobPayments(job)[0].method, 'stripe_ach', 'as a bank transfer');
    eq(ctx.jobPayments(job)[0].payer, 'Tripp Butler', 'naming the payer Stripe reported');
    eq(ctx.jobPayments(job)[0].clearedOn, '2026-09-13',
      'and cleared on the day Stripe says the money moved, because it said succeeded');
    eq(ctx.jobPayments(job)[0].receivedOn, ctx.jobPayments(job)[0].clearedOn,
      '⚠ received and cleared are the same day here — an intent that settled did both at once');
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
