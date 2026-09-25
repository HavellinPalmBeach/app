'use strict';
// ON A FIXED PRICE A CHANGE ORDER IS TRIGGERED BY SCOPE, NEVER BY THE 15% — AND IT IS THE PRICE
// (2026-09-25).
//
// Anthony: *"Is a 15% over run change order necessary on a fixed price job, or should it be a
// 'Change of Scope' or something that triggers a change order?"* Scope. The agreements already
// said so — the estate form's §4.1 fixed arm lists "work … beyond the scope of work described in
// Exhibit A" in place of the hours trigger, the standard form's §3.8 fixed arm is "Changes to
// Scope", and the fixed-price estimate's Terms promise "any price adjustment agreed in writing
// before the additional work proceeds". Seven screens still spoke the T&M rule on a fixed job:
//
//   1. the change order modal's note and its 15% readout
//   2. the acceptance panel the client types their name under ("No charge is created")
//   3. the confirmation after acceptance
//   4. the printed change order ("does not itself create a charge")
//   5. the Client Dashboard's Hours Log ("Client must be notified … per agreement terms")
//   6. the Job Plan's hours summary (the same sentence, on a bare 1.15)
//   7. the Job Plan's projection card and the line under the hours fold ("STOP … No further scope
//      work until a signed Change Order", over hours the fixed fee exists to absorb)
//
// ⚠⚠ AND ON A FIXED PRICE THE CHANGE ORDER NOW CARRIES ITS PRICE. On T&M the timesheet bills the
// hours, so a price on the change order would charge them twice — that rule stands. On a fixed
// price nothing else charges them (the invoice adds exactly this figure), and the living-client
// agreement's fixed arm states no hourly rate anywhere, so without it a client signed hours and
// was billed at rates they had never seen in writing. Every case below drives BOTH bases, because
// the two documents must differ, and the join — the price printed equals the price billed — is
// driven through the real invoice rather than asserted.

const { sandbox, source, fn, domStub } = require('./harness');

const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

// 80 TC @150 + 60 PS @100 on the estimate; the fixed variant is a $26,000 flat fee.
const EST_TM = { jobId: 1, tcFee: 12000, psFee: 6000, pkgCost: 1940, smf: 0, prepFee: 0,
                 havellinTotal: 19940, tcRate: 150, psRate: 100, discountPct: 0,
                 fixedPrice: false, rush: false, vendors: [], prepItems: [],
                 preparedBy: 'Anthony Graziano', svc: 'cleanout', totTC: 80, totPS: 60 };
const EST_FX = Object.assign({}, EST_TM, { fixedPrice: true, fixedAmount: 26000, havellinTotal: 26000,
                                           prepFeeOnTop: true });
const JOB = { id: 1, hvlId: 'HVL-0007', name: "O'Hara & Co", client: 'Butler Estate', svc: 'cleanout',
              addr: '69 Beach Blvd', tc: 'Anthony Graziano', status: 'active',
              premium: false, executor: 'Tripp Butler' };

function co(tc, ps, id, extra) {
  return Object.assign({ id: id || 100, jobId: 1, description: 'Guest house <added> to scope',
                         reason: 'scope_add', tcHrs: tc, psHrs: ps, createdAt: 'Sep 25, 2026',
                         clientApproved: false, clientName: '', clientAcceptedAt: '' }, extra || {});
}
function accepted(tc, ps, id) { return co(tc, ps, id, { clientApproved: true, clientName: 'Tripp Butler', clientAcceptedAt: 'September 25, 2026' }); }

const CO_FNS = ['_coJobBasis', 'coHours', 'coHoursTotal', 'coBaselineShift', 'coHoursLabel', '_coMoney', 'fmt', 'esc',
                'coPrice', 'coPriceTotal', 'coFixedTerms', 'coRateBasisTxt', 'coReasonLabel', 'estFixedFee',
                'estTolerancePctTxt', 'coBasisNoteHtml', 'updateCOHours', 'openChangeOrder', 'openCOAcceptModal',
                'closeCOAcceptModal', 'acceptChangeOrder', 'printChangeOrder', '_coPriorAccepted', 'coPriorHours', 'coNoHoursBaseTxt', 'prepFeeRate'];

function coCtx(est, cos, seed) {
  const dom = domStub(seed || {});
  const said = [];
  const c = sandbox({
    fns: CO_FNS, vars: ['EST_TOLERANCE_PCT', 'CO_REASONS'],
    stubs: {
      document: dom, setTimeout: () => 0,
      jobs: [Object.assign({}, JOB)], changeOrders: cos || [],
      estimateStore: est ? { 1: { estimate: Object.assign({}, est), approved: true } } : {},
      currentEstimate: null,
      saveChangeOrders: () => {}, saveJobs: () => {}, syncJobToSheets: () => {}, renderJobs: () => {},
      showFB: (id, kind, msg) => said.push({ id, kind, msg }),
      docNames: () => ({ printTitle: 'Havellin Change Order' }),
    },
  });
  c.__dom = dom; c.__said = said;
  return c;
}

// The invoice sandbox, as change-order-billing.test.js builds it.
function inv(stubs) {
  return sandbox({
    fns: ['estTolerancePctTxt', 'invoiceHtml', 'jobLogEntries', 'coHours', 'coHoursTotal', 'coBaselineShift', 'coPrice', 'coPriceTotal', 'coHoursLabel',
          '_coMoney', 'fmt', 'getVendorActuals', '_srcLineKey', 'samePerson', 'canonPersonName',
          '_invVendorFeeSentence', 'prepFeeRate', 'vendorGroupOfLine', 'resolveJobVendor',
          'coordHrsFor', 'prepLineTCHrs', 'vendorLineTCHrs', 'esc', 'fmtDate2', 'svcLabelOf',
          'conciergePhones', 'conciergePhonesText', 'assignedTCContact', 'vendorCats',
          'vendorPrimaryCat', 'estimateIsFeeOnly', 'isDecedentJob',
          'stagePaidTotal', 'jobPaidTotal', 'jobPayments', 'discountOnLabor', 'estFixedFee', 'estPrepFeeOnTop'],
    vars: ['EST_TOLERANCE_PCT', 'SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'DEPT_EMAILS', 'HAVELLIN_OFFICE_PHONE',
           'NON_MOBILE_NUMBERS', 'DEFAULT_CONTRACTORS', 'COORD_TOUCHES',
           'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES_DEFAULT', 'TOUCH_HRS',
           'DECEDENT_SERVICES', 'PERSON_NAME_ALIASES', 'PREP_FEE_RATE', 'invApproved'],
    stubs: Object.assign({
      jobLogs: {}, estimateStore: {}, changeOrders: [], contractors: [],
      currentEstimate: null, currentInvStage: 'final', vendorDirectory: [], jobPlans: {},
    }, stubs || {}),
  });
}
// Walk the engagement stage by stage, paying each invoice in full, and return the final.
function finalDoc(est, cos, loggedTC, loggedPS) {
  const store = { 1: { estimate: est, approved: true, approvedBy: 'Anthony Graziano' } };
  const logs = { 1: [{ date: '2026-09-01', activity: 'clearance',
                       members: [{ name: 'Anthony Graziano', role: 'TC', hours: loggedTC },
                                 { name: 'Crew', role: 'PS', hours: loggedPS }] }] };
  const run = (payments) => {
    const job = Object.assign({}, JOB, { payments: payments });
    return { ctx: inv({ estimateStore: store, jobLogs: logs, changeOrders: cos || [] }), job };
  };
  const a = run([]);
  const dep = Math.round(a.ctx.invoiceHtml(a.job, 'deposit').amtDue);
  const b = run([{ stage: 'deposit', amount: dep, date: '2026-08-01', method: 'wire' }]);
  const mid = Math.round(b.ctx.invoiceHtml(b.job, 'midpoint').amtDue);
  const c = run([{ stage: 'deposit', amount: dep, date: '2026-08-01', method: 'wire' },
                 { stage: 'midpoint', amount: mid, date: '2026-09-01', method: 'wire' }]);
  const d = c.ctx.invoiceHtml(c.job, 'final');
  d._collected = dep + mid + Math.round(d.amtDue);
  return d;
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ═══════════════════════════════════════════════════════════════════════════
  group('the helpers — one price per change order, rounded once, summed rather than re-rounded');
  {
    const c = coCtx(EST_FX, []);
    eq(c.coPrice({ tcHrs: 20, psHrs: 20 }, 150, 100), 5000, 'hours at the job’s own rates');
    eq(c.coPrice({ tcHrs: -10, psHrs: 0 }, 150, 100), -1500, 'a reduction prices negative');
    eq(c.coPrice({ tcHrs: 0.5 }, 185, 125), 93, 'half an hour at the premium concierge rate rounds once, to $93');
    // ⚠⚠ THE CASE THE PER-ORDER SUM EXISTS FOR. Two signed change orders each read $93, so the
    // invoice must add $186 — rounding the pooled hours would add $185 and disagree with both.
    eq(c.coPriceTotal([{ tcHrs: 0.5 }, { tcHrs: 0.5 }], 185, 125), 186,
       '⚠⚠ two half-hours at $185 sum to $186 — what the two signed change orders say — not $185');
    eq(c.coPriceTotal([], 150, 100), 0, 'none sums to nothing');

    eq(c.coRateBasisTxt({ tcHrs: 20, psHrs: 20 }, 150, 100),
       '+20.0 concierge hrs at $150/hr · +20.0 specialist hrs at $100/hr', 'the basis reads both sides');
    eq(c.coRateBasisTxt({ tcHrs: -4, psHrs: 0 }, 185, 125), '−4.0 concierge hrs at $185/hr',
       'a one-sided reduction keeps the minus outside the figure');

    eq(c.coReasonLabel('scope_add'), 'Scope addition — new rooms or services', 'a key prints its label');
    eq(c.coReasonLabel('mystery'), 'mystery', 'an unknown key prints as itself rather than vanishing');
    eq(c.coReasonLabel(undefined), '', 'and a missing one prints nothing');
    eq(c.CO_REASONS.map((r) => r.v).join(','), 'timeline,crew,scope_add,scope_remove,vendor,other',
       'the six reasons the modal has always offered, in its order');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('coFixedTerms — null on T&M, the fee chain on a fixed price');
  {
    eq(coCtx(EST_TM, []).coFixedTerms(1, co(20, 20)), null, '⚠ a T&M job has no fixed terms — every surface branches on this null');
    eq(coCtx(null, []).coFixedTerms(1, co(20, 20)), null, 'nor does a job with no saved estimate');

    // ⚠ Read defensively (`|| {}`): a revert that makes this null must FAIL these checks, not
    // throw and take the rest of the file with it — a crash reads as a smaller total, not as red.
    const fx = coCtx(EST_FX, []).coFixedTerms(1, co(20, 20)) || {};
    eq(fx.flat, 26000, 'the flat fee in the agreement');
    eq(fx.prior, 0, 'nothing accepted before it');
    eq(fx.price, 5000, 'its price');
    eq(fx.revised, 31000, 'and the fee it leaves');

    // Earlier accepted orders count; later ones and unaccepted ones do not.
    const cos = [accepted(8, 8, 50), co(4, 4, 60), accepted(2, 2, 200)];
    const f2 = coCtx(EST_FX, cos).coFixedTerms(1, co(20, 20, 100)) || {};
    eq(f2.prior, 2000, '⚠ only change orders accepted BEFORE it are counted above it ($2,000, not the pending one or the later one)');
    eq(f2.revised, 33000, 'so the revised fee reads 26,000 + 2,000 + 5,000');
    const draft = coCtx(EST_FX, cos).coFixedTerms(1, { tcHrs: 1, psHrs: 0 }) || {};
    eq(draft.prior, 2500, 'a draft with no id yet counts every accepted order');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ 1 · THE CHANGE ORDER MODAL — the note and the readout follow the basis');
  {
    // Fixed: the readout is the price, and never the 15%.
    const f = coCtx(EST_FX, [], { 'co-jobid': '1' });
    f.openChangeOrder(1);
    const note = f.__dom.getElementById('co-basis-note').innerHTML;
    has(note, 'On a fixed price the change order is the charge', 'the note says what a fixed-price change order is');
    has(note, 'The trigger is a change in scope, never the hours', '⚠ and that scope is the trigger');
    lacks(note, 'carries no price and bills nothing', '⚠ and not the T&M sentence it used to carry');
    const opts = f.__dom.getElementById('co-reason').innerHTML;
    has(opts, 'Scope addition — new rooms or services', 'the reasons are filled from CO_REASONS');
    eq((opts.match(/<option /g) || []).length, 6, 'all six of them');
    eq(f.__dom.getElementById('co-reason').value, 'scope_add', 'defaulting to a scope addition');

    f.__dom.getElementById('co-tc-hrs').value = '20';
    f.__dom.getElementById('co-ps-hrs').value = '20';
    f.updateCOHours();
    const r = f.__dom.getElementById('co-hrs-note').innerHTML;
    has(r, '+ $5,000 on the fixed project fee', '⚠⚠ the readout states the price');
    has(r, 'from $26,000 to $31,000', 'and the fee it leaves');
    has(r, '$150 / $100 an hour', 'at the job’s own rates');
    lacks(r, '15%', '⚠⚠ and never the 15% — on a fixed price it is not the trigger');
    lacks(r, 'already agreed to', 'nor the T&M claim that a small change costs the client nothing');

    f.__dom.getElementById('co-tc-hrs').value = '-10';
    f.__dom.getElementById('co-ps-hrs').value = '-5';
    f.updateCOHours();
    const cut = f.__dom.getElementById('co-hrs-note').innerHTML;
    has(cut, '− $2,000 on the fixed project fee', 'a reduction prices negative, minus outside the figure');
    has(cut, 'comes down from $26,000 to $24,000', 'and says the fee comes down');

    // With an earlier accepted order the chain names it.
    const g = coCtx(EST_FX, [accepted(8, 8, 50)], { 'co-jobid': '1', 'co-tc-hrs': '20', 'co-ps-hrs': '20' });
    g.updateCOHours();
    const gr = g.__dom.getElementById('co-hrs-note').innerHTML;
    has(gr, 'from $28,000 to $33,000', 'the fee moves from where earlier change orders left it');
    has(gr, '$26,000 agreed, plus $2,000 of change orders already accepted', 'and says so');

    // T&M: unchanged — the 15% is its rule.
    const t = coCtx(EST_TM, [], { 'co-jobid': '1' });
    t.openChangeOrder(1);
    has(t.__dom.getElementById('co-basis-note').innerHTML, 'carries no price and bills nothing',
        'T&M keeps its note');
    has(t.__dom.getElementById('co-basis-note').innerHTML, '&plusmn;15% check', 'naming the 15% it moves');
    t.__dom.getElementById('co-tc-hrs').value = '20';
    t.__dom.getElementById('co-ps-hrs').value = '20';
    t.updateCOHours();
    has(t.__dom.getElementById('co-hrs-note').innerHTML, 'Past the 15% threshold', 'T&M still reads the threshold');
    lacks(t.__dom.getElementById('co-hrs-note').innerHTML, '$', 'and still states no price');
    t.__dom.getElementById('co-tc-hrs').value = '2';
    t.__dom.getElementById('co-ps-hrs').value = '2';
    t.updateCOHours();
    has(t.__dom.getElementById('co-hrs-note').innerHTML, 'Inside the 15%', 'and inside it, says so');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ 2 & 3 · THE ACCEPTANCE THE CLIENT TYPES THEIR NAME UNDER, AND ITS CONFIRMATION');
  {
    const f = coCtx(EST_FX, [co(20, 20, 100)]);
    f.openCOAcceptModal(100);
    const s = f.__dom.getElementById('coa-summary').innerHTML;
    has(s, 'Change to the fixed project fee', '⚠⚠ the client is shown the price they are agreeing to');
    has(s, '+ $5,000', 'the figure');
    has(s, 'Revised fixed project fee', 'and the fee it leaves');
    has(s, '$31,000', 'at $31,000');
    has(s, 'Priced at +20.0 concierge hrs at $150/hr · +20.0 specialist hrs at $100/hr', 'with the basis, checkable by hand');
    lacks(s, 'No charge is created', '⚠⚠ and never the T&M sentence that said it cost nothing');
    has(s, 'Reason: Scope addition — new rooms or services', 'the reason prints its label');
    lacks(s, 'scope_add', '⚠ never the raw key a client used to read');
    has(s, 'Guest house &lt;added&gt; to scope', 'the description is escaped');
    const terms = f.__dom.getElementById('coa-terms').innerHTML;
    has(terms, 'the change to the fixed project fee shown above', 'the acceptance sentence names the fee change');
    lacks(terms, 'as they are actually worked', 'and not the T&M promise to bill the hours worked');

    f.__dom.getElementById('coa-co-id').value = '100';
    f.__dom.getElementById('coa-client-name').value = 'Tripp Butler';
    f.acceptChangeOrder();
    const msg = f.__said.map((x) => x.msg).join(' | ');
    has(msg, '+ $5,000 on the fixed project fee, which is now $31,000', 'the confirmation states the new fee');
    lacks(msg, 'as they are worked', 'and not the T&M sentence');
    eq(f.jobs[0].havellinEst, 31000, 'the job’s figure moves by the price');

    const t = coCtx(EST_TM, [co(20, 20, 100)]);
    t.openCOAcceptModal(100);
    has(t.__dom.getElementById('coa-summary').innerHTML, 'No charge is created by this change order', 'T&M keeps its sentence');
    lacks(t.__dom.getElementById('coa-summary').innerHTML, '$', 'and states no price');
    has(t.__dom.getElementById('coa-terms').innerHTML, 'as they are actually worked', 'and its acceptance terms');
    t.__dom.getElementById('coa-co-id').value = '100';
    t.__dom.getElementById('coa-client-name').value = 'Tripp Butler';
    t.acceptChangeOrder();
    has(t.__said.map((x) => x.msg).join(' | '), 'These hours bill on the final invoice as they are worked', 'T&M confirmation unchanged');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ 4 · THE PRINTED CHANGE ORDER — dollars on a fixed price, hours on T&M');
  {
    const f = coCtx(EST_FX, [co(20, 20, 100)]);
    f.printChangeOrder(100);
    const d = f.__printed;
    has(d, 'Fixed project fee in your agreement', 'the table opens on the agreed fee');
    has(d, '$26,000', 'at $26,000');
    has(d, '+ $5,000', 'the change carries its price');
    has(d, 'Revised fixed project fee', 'and foots in the revised fee');
    has(d, '$31,000', 'of $31,000');
    has(d, '+20.0 concierge hrs at $150/hr', 'with the rate basis printed beside it');
    has(d, 'This change order adjusts your fixed project fee by the amount above.', '⚠⚠ the sentence that makes the fixed page honest');
    has(d, 'It does not change with the hours the work actually takes.', 'and that it is fixed at signing');
    lacks(d, 'does not itself create a charge', '⚠⚠ never the T&M sentence, which told a flat-fee client the opposite');
    lacks(d, 'Hours on the approved estimate', '⚠ and no estimate hours — a fixed-price client document carries none');
    has(d, 'Reason: Scope addition — new rooms or services', 'the reason prints its label');
    lacks(d, 'scope_add', 'never the raw key');
    has(d, 'O&#39;Hara &amp; Co', 'the client name is escaped');

    // A second change order shows the first one above it; the first never shows the second.
    const cos = [accepted(8, 8, 50), co(20, 20, 100)];
    const g = coCtx(EST_FX, cos);
    g.printChangeOrder(100);
    has(g.__printed, 'Change orders already accepted', 'change order #2 names what #1 already added');
    has(g.__printed, '$33,000', 'and foots in the fee after both');
    g.printChangeOrder(50);
    lacks(g.__printed, 'Change orders already accepted', 'change order #1 never shows a later one above it');
    has(g.__printed, '$28,000', 'it foots in the fee it left');

    // T&M: the 2026-09-11 document, untouched in substance.
    const t = coCtx(EST_TM, [co(20, 20, 100)]);
    t.printChangeOrder(100);
    const td = t.__printed;
    has(td, 'This change order does not itself create a charge.', 'T&M keeps the sentence');
    has(td, 'Hours on the approved estimate', 'and foots in hours');
    has(td, '140.0', 'from the estimate’s 140 hours');
    has(td, 'Revised estimated hours', 'to the revised hours');
    ok(!/\$\s?[\d,]/.test(td), '⚠ and a T&M change order still carries no dollar figure anywhere');
    has(td, 'Reason: Scope addition — new rooms or services', 'with the reason’s label on it too');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ THE JOIN — the price printed on the change order is the price the final invoice adds');
  {
    // Premium rates, half-hour change orders: the one case where a pooled rounding disagrees.
    const est = Object.assign({}, EST_FX, { tcRate: 185, psRate: 125 });
    const cos = [accepted(0.5, 0, 50), accepted(0.5, 0, 60)];
    const p = coCtx(est, cos);
    p.printChangeOrder(50);
    has(p.__printed, '+ $93', 'change order #1 is signed at $93');
    p.printChangeOrder(60);
    has(p.__printed, '+ $93', 'and #2 at $93');
    const d = finalDoc(est, cos, 80, 60);
    eq(d._collected, 26186, '⚠⚠ the engagement collects the flat fee plus exactly the two signed prices — $26,186, not $26,185');
    has(d.html, 'Each is charged at the price on the change order you accepted', 'the invoice says where the charge comes from');
    lacks(d.html, 'the rates in your agreement', '⚠ not the living-client agreement’s rates, which its fixed arm never states');
    // ⚠ Anchored on the change-order table's own header: the invoice's services table carries an
    // "Amount" heading of its own, so a bare needle passes on either basis.
    has(d.html, '<th style="text-align:right;">Additional hours</th><th style="text-align:right;">Amount</th>',
        'the fixed invoice’s change-order table carries an amount');
    has(d.html, 'added to the fixed project fee above', 'and the phrase the older suite pins');

    // The standard case, and the T&M invoice unchanged.
    eq(finalDoc(EST_FX, [accepted(20, 20, 50)], 80, 60)._collected, 31000, 'a +$5,000 change order on a $26,000 fee collects $31,000');
    const tm = finalDoc(EST_TM, [accepted(20, 20, 50)], 100, 80);
    eq(tm._collected, 24940, 'T&M still bills the change through the timesheet, once');
    has(tm.html, '<th style="text-align:right;">Additional hours</th></tr>', 'and its change-order table ends at the hours — no amount column');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ 5 & 6 · THE HOURS WARNINGS — no client to notify on a fixed price, only margin and scope');
  {
    const H = sandbox({ fns: ['hoursOverText', 'estTolerancePctTxt', 'planHoursRuleTxt'], vars: ['EST_TOLERANCE_PCT'] });
    const f = H.hoursOverText(true), t = H.hoursOverText(false);
    has(f, 'ours to absorb', 'fixed: the overrun is ours');
    has(f, 'the client is not billed for it', 'and not billed');
    has(f, 'If the extra time is work beyond the agreed scope, raise a change order', '⚠ the one real question: is it scope?');
    lacks(f, 'notified', '⚠⚠ and nothing about notifying the client under the agreement — its fixed arm has no hours trigger');
    has(t, 'must be notified in writing', 'T&M keeps the agreement’s notice duty');
    has(t, '15%', 'at the 15%');

    // The Job Plan's hours summary, driven.
    const logs = { 1: [{ date: '2026-09-20', members: [{ name: 'A', role: 'TC', hours: 100 }, { name: 'C', role: 'PS', hours: 70 }] }] };
    function summary(est) {
      const dom = domStub({});
      const S = sandbox({ fns: ['updateLogSummary', 'jobLogEntries', 'hoursOverText', 'estTolerancePctTxt', 'coAcceptedHours', 'coHoursTotal', 'coHours', 'coHoursLabel'],
                          vars: ['EST_TOLERANCE_PCT'],
                          stubs: { document: dom, jobs: [Object.assign({}, JOB)], jobLogs: logs,
                                   estimateStore: { 1: { estimate: est } } } });
      S.updateLogSummary(1);
      return dom.getElementById('log-overage-alert').innerHTML;
    }
    const fs = summary(EST_FX), ts = summary(EST_TM);
    has(fs, 'ours to absorb', 'fixed: the Job Plan summary reads the fixed sentence');
    lacks(fs, 'notified', '⚠⚠ and never tells the concierge to notify the client');
    has(ts, 'must be notified in writing', 'T&M: the notice duty stands');
    lacks(noComments(fn('updateLogSummary')), '1.15', 'the bare 1.15 is gone — it reads EST_TOLERANCE_PCT');

    // The Client Dashboard's Hours Log card: the shared sentence, read for the job's basis.
    const rcd = noComments(fn('renderClientDashboard'));
    has(rcd, 'var _fxHrs = !!(est && est.fixedPrice);', 'the dashboard reads the job’s billing basis');
    has(rcd, 'hoursOverText(_fxHrs)', 'and the shared sentence for it');
    lacks(rcd, 'Client must be notified in writing before continuing work', '⚠ the old unconditional sentence is gone');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ 5 · THE CLIENT DASHBOARD, DRIVEN — the Hours Log card on each basis');
  {
    const FNS = ['_dashUtilityBarHtml', '_jtDocViews', '_jtDraftLink', '_jtDriveLink', '_jtSendAction',
      'activeHouseFlags', 'agreementSignature', 'dashUtilityBar', 'driveFolderPending', 'depositPaidTotal', 'depositTargetFor',
      'docDraftedAt', 'docKeyFor', 'docSentAt', 'esignProviderKey', 'esignAvailable', 'esignJobWatches', 'field', 'fmtMoney',
      'getJobActuals', 'jobLogEntries', 'houseFlagsOf', 'isAgreementSigned', 'isJobFunded', 'isJobWon',
      'jobActivationBlockers', 'jobPayments', 'jobTimeline', 'jobTimelineActions', 'jobTimelineNext',
      'jobStageDoc', 'docReadiness', 'docDraftOnly', 'docTitle', 'docWord', '_jtDocSecondaries',
      'agreementReady', 'jobTimelineDoc',
      'jobSchedule', 'jtScheduleHtml', 'estWorkingDays', '_todayStr', 'addWorkingDays', 'jobProgress',
      'workingDaysInclusive', 'approvedEstimateFor',
      'maybeStartJobsWatch', 'paymentSplit', 'renderClientDashboard', 'sectionHdr', 'stagePaidTotal',
      'standingFlagLines', 'standingFlagsBlock', '_sfHost', '_sfRowHtml', 'mustFindItems', 'mustFoundOf', '_mustFindKey', '_mfHandle', 'stopJobsWatch', 'unscoredRoomNames', 'isAgreementSent', 'jtBandHtml', 'jtTrackHtml', 'jtRailHtml', '_jtAtFmt', '_jtStateCls',
      'hoursOverText', 'estTolerancePctTxt', 'coHoursLabel', 'coHours', 'dot', 'coWorkingDays', '_coPaceFix', 'coAcceptedHours', 'coHoursTotal', 'coInclTxt'];
    const VARS = ['_driveFolderInFlight', 'ESIGN_PROVIDERS', 'FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS', 'SF_HOSTS', 'JT_LEG_BREAK', 'JT_SHORT', 'JT_NEXT', 'SVC_LABELS',
      '_dashNotice', '_jobsWatch', 'jobLogs', 'JT_ROW_DOC', 'DOC_READY_WHY', 'DOC_KIND_WORD', 'DOC_STAGE_WORD', 'DOC_ACTIONS',
      'PRODUCTIVE_HRS_PER_DAY', 'jobPlanStore', 'PROJ_CREW_DAY', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'EST_TOLERANCE_PCT'];
    function dash(est, opts) {
      opts = opts || {};
      const dom = domStub({});
      const job = Object.assign({ status: 'active', won: true, approved: true, created: 'Sep 8, 2026', walkthrough: '2020-01-01',
                                  driveFolder: 'https://drive.google.com/drive/folders/XYZ' }, JOB, { id: 7 });
      const c = sandbox({ fns: FNS.concat(['esc']), vars: VARS, stubs: {
        document: dom, setTimeout: () => 0, clearTimeout: () => {}, Intl: global.Intl,
        jobs: [job], changeOrders: opts.cos || [], contractors: [], _photoRefs: {},
        estimateStore: { 7: { estimate: Object.assign({ rooms: [{ name: 'Kitchen', vol: 3, cplx: 3 }] }, est), approved: true } } } });
      if (opts.tol != null) c.EST_TOLERANCE_PCT = opts.tol;
      c.jobLogs[7] = [{ date: '2026-09-20', members: [{ name: 'A', role: 'TC', hours: 100 }, { name: 'C', role: 'PS', hours: 70 }] }];
      c.renderClientDashboard(7);
      return dom.getElementById('client-dashboard-view').innerHTML;
    }
    const f = dash(EST_FX), t = dash(EST_TM);
    has(f, 'ours to absorb', '⚠⚠ a fixed-price job 25% over its hours reads the margin sentence');
    lacks(f, 'must be notified', '⚠⚠ and is never told the client must be notified');
    has(t, 'must be notified in writing', 'a T&M job 25% over still reads the notice duty');
    has(f, '— OVERAGE', 'past the line the bar says OVERAGE');
    has(f, '#FCEBEB', 'and the card turns red');

    // ⚠ The OVERAGE label and the card's red were bare `115`s beside a sentence that read
    // EST_TOLERANCE_PCT, so they agreed only while the constant stayed put. Move it to 30% and all
    // three must move together: 125% / 117% is no longer over, so no label, no red, no sentence.
    const moved = dash(EST_FX, { tol: 0.30 });
    lacks(moved, '— OVERAGE', '⚠ with the tolerance at 30% the label stands down');
    lacks(moved, '#FCEBEB', 'and the red with it');
    lacks(moved, 'ours to absorb', 'and the over-tolerance sentence');
    has(moved, 'Approaching the estimated hours', 'leaving the approaching note — the three agree');
    lacks(noComments(fn('renderClientDashboard')), '>115', 'no bare 115 survives in the dashboard');

    // The change-order card lists the description, which is free text typed by a concierge.
    const esc1 = dash(EST_FX, { cos: [co(20, 20, 100, { jobId: 7, description: 'Pool & <b>spa</b> added' })] });
    has(esc1, 'Pool &amp; &lt;b&gt;spa&lt;/b&gt; added', '⚠ the dashboard escapes a change order’s description');
    lacks(esc1, '<b>spa</b>', 'and never prints its markup');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ 7 · THE JOB PLAN PROJECTION — a margin warning on a fixed price, never a STOP');
  {
    const P = sandbox({ fns: ['projBandHtml', 'estTolerancePctTxt', 'planHoursRuleTxt'], vars: ['EST_TOLERANCE_PCT'] });
    const fr = P.projBandHtml('red', 'TC', 120, 92, 80, 0.5, true);
    has(fr, 'more than 15% over the estimate', 'fixed red: over the line');
    has(fr, 'comes out of the margin', 'fixed red: the margin');
    has(fr, 'it is not a reason to stop', '⚠⚠ and explicitly not a stop');
    lacks(fr, 'STOP', '⚠⚠ never STOP');
    lacks(fr, 'No further scope work', '⚠⚠ never "no further scope work"');
    has(fr, 'raise a change order', 'the scope question survives');
    const tr = P.projBandHtml('red', 'TC', 120, 92, 80, 0.5, false);
    has(tr, 'STOP.', 'T&M red still stops');
    has(tr, 'No further scope work until a signed Change Order', 'T&M red keeps its rule');
    const fa = P.projBandHtml('amber', 'TC', 90, 92, 80, 0.5, true);
    has(fa, 'the fee does not move with the hours', 'fixed amber: the fee does not move');
    lacks(fa, 'prepare the client', 'fixed amber: nothing to prepare the client for');
    has(P.projBandHtml('amber', 'TC', 90, 92, 80, 0.5, false), 'prepare the client', 'T&M amber unchanged');

    has(P.planHoursRuleTxt(true), 'over the line is a margin warning, not a stop', 'the line under the hours fold, fixed');
    lacks(P.planHoursRuleTxt(true), 'Stop', 'and it does not tell the crew to stop');
    has(P.planHoursRuleTxt(false), 'Over the line? Stop — Change Order before the next room.', 'T&M keeps its line verbatim');

    // renderProjection, driven through computeProjection and jobProgress: the headline.
    const ROOMS = [{ idx: 0, name: 'Kitchen', tcH: 10, psH: 20 }, { idx: 1, name: 'Powder Room', tcH: 1, psH: 2 }];
    function proj(fixed) {
      const dom = domStub({});
      const C = sandbox({
        fns: ['renderProjection', 'computeProjection', 'jobProgress', 'getJobPlan', 'roomStatusNormalize', 'projBandHtml', 'estTolerancePctTxt', 'coHoursLabel', 'coHours', 'coAcceptedHours', 'coHoursTotal'],
        vars: ['PROJ_CREW_DAY', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'jobPlanStore', 'estimateStore', 'currentEstimate',
               'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY', 'EST_TOLERANCE_PCT'],
        stubs: { document: dom, saveJobPlan: () => {},
                 // 40% of the work done (the powder room plus a locked kitchen's TC half) on far more hours than that.
                 jobLogEntries: () => [{ date: '2026-09-20', members: [{ name: 'A', role: 'TC', hours: 30 }, { name: 'C', role: 'PS', hours: 60 }] }] },
      });
      C.jobPlanStore[7] = { rooms: { 0: { status: 'packed' }, 1: { status: 'complete' } } };
      C.estimateStore[7] = { estimate: { svc: 'cleanout', days: 6, totTC: 11, totPS: 22, rooms: ROOMS, fixedPrice: fixed } };
      C.renderProjection(7);
      const snap = C.jobPlanStore[7].lastProjection;
      return { html: dom.getElementById('projection-output').innerHTML, snap };
    }
    const pf = proj(true), pt = proj(false);
    eq(pf.snap.headlineBand, 'red', 'the fixture really is in the red band');
    has(pf.html, 'Over the estimated hours — margin at risk', '⚠⚠ a fixed-price job’s headline is the margin');
    lacks(pf.html, 'STOP', '⚠⚠ and nowhere on the card does it say STOP');
    has(pt.html, '⛔ STOP — Change Order Required', 'a T&M job keeps its stop');
    eq(pf.snap.triggerTC, Math.round(11 * 1.15 * 10) / 10, 'the trigger is still estimate + 15%, read off EST_TOLERANCE_PCT');
    lacks(noComments(fn('computeProjection')), '1.15', 'and no bare 1.15 survives in the projection');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the wiring that cannot be driven cheaply, pinned — and the retired sentences gone');
  {
    const rjp = noComments(fn('renderJobPlan'));
    has(rjp, 'planHoursRuleTxt(!!(est && est.fixedPrice))', 'the Job Plan reads the line for the job’s basis');
    const live = noComments(src);
    lacks(live, 'Client must be notified before continuing work', 'the Job Plan summary’s old unconditional sentence is gone');
    // The markup no longer carries either T&M sentence as static text.
    lacks(live, '<div class="vform"><div class="fld-note" style="font-size:11px;color:var(--gray);margin-top:2px;line-height:1.5;">Estimate the extra hours',
          'the modal note is written per basis, not static');
    has(src, 'id="co-basis-note"', 'into its own element');
    has(src, 'id="coa-terms"', 'and the acceptance terms into theirs');
    has(src, '<select id="co-reason"><!-- filled from CO_REASONS by openChangeOrder --></select>',
        'the reason select ships empty and is filled from the one list');
    // Every surface that prices a change order sums per order — one rounding rule.
    has(noComments(fn('invoiceHtml')), 'var coShift = coPriceTotal(jobCOs, tcRate, psRate);', 'the invoice sums the signed prices');
    has(noComments(fn('acceptChangeOrder')), 'coPriceTotal(accepted, b.tcRate, b.psRate)', 'and so does the job’s figure');
    lacks(noComments(fn('invoiceHtml')), 'Math.round(coBaselineShift(coHrs', 'the pooled rounding is gone');
  }
};
