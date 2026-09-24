'use strict';
// THE FIXED FEE IS THE MANAGER'S FIGURE, AND ROUNDING IT IS NOT AN ERROR (2026-09-20).
//
// Anthony: "when we want to go to a fixed price estimate, we need to be able to edit the final
// amount, not just have the premium stuck in because it sometimes just makes an awkward looking
// number. Like if it's $25,275, I'd probably just create a $25,000 estimate."
//
// ⚠⚠ MEASURED ON THE REAL FORM BEFORE ANYTHING WAS CHANGED: the field WAS editable, and a typed
// figure already rode through save → reopen → client estimate → agreement → all three invoices.
// What was wrong was the drift warning beside it. It compared the fee's effective markup with the
// 20% contingency, so rounding $21,600 down to $21,000 (a 2.8% concession) drew "This fixed fee
// is +17% over the hourly basis … The estimate has moved since you set it — the suggested fee is
// now $21,600. [Use $21,600]" — with nothing moved, and a button offering to put the contingency
// straight back. That is the "premium stuck in". The warning cannot tell "the rooms changed"
// from "the manager chose a rounder number"; the two are different facts and only one is a
// problem. So the figure now carries the suggestion it was typed AGAINST (`_fixedAmountBasis`,
// saved as `fixedSuggested`), and the warning fires only when the current suggestion differs
// from that. A rounded fee draws nothing. A fee the estimate has moved under still does.
//
// Two smaller things came with it: the field was `type=number` (bare `21000`, no $ and no
// thousands separator — the very "awkward looking number"), and there was no one-tap way to the
// clean figure. It is a money field now, with a Round chip that offers the suggestion rounded
// DOWN, and a Suggested chip that hands the field back to the tracker.

const { sandbox, source, fn, domStub } = require('./harness');

const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

// The invoice, driven the way payments-received drives it — this is the promise that matters
// most to Anthony's plan ("go fixed price and avoid having to log hours"): a fixed-price final
// bills with an EMPTY timesheet, and a time-and-materials one still refuses.
const INV_FNS = ['estTolerancePctTxt', 'invoiceHtml', 'jobLogEntries', 'coHours', 'coHoursTotal', 'coBaselineShift', 'coHoursLabel',
                 '_coMoney', 'fmt', 'getVendorActuals', '_srcLineKey', 'samePerson', 'canonPersonName',
                 '_invVendorFeeSentence', 'prepFeeRate', 'vendorGroupOfLine', 'resolveJobVendor',
                 'coordHrsFor', 'prepLineTCHrs', 'vendorLineTCHrs', 'esc', 'fmtDate2', 'svcLabelOf',
                 'conciergePhones', 'conciergePhonesText', 'assignedTCContact', 'vendorCats',
                 'vendorPrimaryCat', 'estimateIsFeeOnly', 'isDecedentJob',
                 'stagePaidTotal', 'jobPaidTotal', 'jobPayments', 'discountOnLabor', 'estFixedFee', 'estPrepFeeOnTop'];
const INV_VARS = ['EST_TOLERANCE_PCT', 'SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'DEPT_EMAILS', 'HAVELLIN_OFFICE_PHONE',
                  'NON_MOBILE_NUMBERS', 'DEFAULT_CONTRACTORS', 'COORD_TOUCHES',
                  'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES_DEFAULT', 'TOUCH_HRS',
                  'DECEDENT_SERVICES', 'PERSON_NAME_ALIASES', 'PREP_FEE_RATE', 'invApproved'];
function invoice(est, stage, payments) {
  const ctx = sandbox({
    fns: INV_FNS, vars: INV_VARS,
    stubs: {
      jobLogs: { 1: [] },   // ⚠ nothing logged — the whole point
      estimateStore: { 1: { estimate: est, approved: true, approvedBy: 'Anthony Graziano' } },
      changeOrders: [], contractors: [], currentEstimate: null,
      currentInvStage: stage, vendorDirectory: [], jobPlans: {},
    },
  });
  const job = { id: 1, hvlId: 'HVL-0007', client: 'Butler Estate', svc: 'cleanout',
                address: '69 Beach Blvd', tc: 'Anthony Graziano', status: 'active',
                executor: 'Tripp Butler', payments: payments || [] };
  return ctx.invoiceHtml(job, stage);
}
const pay = (stage, amount) => ({ stage, amount, date: '2026-10-01', method: 'wire' });

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ───────────────────────────────────────────────────────────────────────────
  group('fixedFeeRounded — down, to a clean figure, never above the suggestion');
  {
    const c = sandbox({ fns: ['fixedFeeRounded'] });
    eq(c.fixedFeeRounded(25275), 25000, "Anthony's example: $25,275 rounds to $25,000");
    eq(c.fixedFeeRounded(21600), 21000, '$21,600 → $21,000 — the nearest thousand below, above $20,000');
    eq(c.fixedFeeRounded(25900), 25000, '⚠ down, never up: $25,900 → $25,000, not $26,000 — the suggestion already carries the contingency');
    eq(c.fixedFeeRounded(12858), 12500, '$12,858 → $12,500 — the nearest $500 between $5,000 and $20,000');
    eq(c.fixedFeeRounded(3275), 3200, '$3,275 → $3,200 — the nearest $100 under $5,000, so a small job is not rounded down by a tenth of itself');
    eq(c.fixedFeeRounded(25000), 25000, 'an already-round figure comes back unchanged — which is how the chip knows not to offer it');
    eq(c.fixedFeeRounded(0), 0, 'nothing from nothing');
    eq(c.fixedFeeRounded(undefined), 0, 'and nothing from a missing suggestion');
    [5000, 5001, 19999, 20000, 20001, 47450, 999].forEach((v) => {
      const r = c.fixedFeeRounded(v), unit = v >= 20000 ? 1000 : v >= 5000 ? 500 : 100;
      ok(r <= v && v - r < unit && r % unit === 0, 'within one unit below and on the unit: ' + v + ' → ' + r);
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the field is money, and every reader goes through moneyToNumber');
  {
    has(src, 'inputmode="numeric" id="e-fixed-amount"', 'a text field with a numeric keyboard');
    lacks(src, 'type="number" id="e-fixed-amount"', '⚠ not a number input — a number input cannot show $25,275, which is the awkward number');
    has(src, 'oninput="markFixedAmountEdited(this)"', 'typing marks the fee as hand-set and formats it');
    const dom = domStub({ 'e-fixed-amount': { value: '$25,275' } });
    const c = sandbox({ fns: ['_fxAmtGet', '_fxAmtSet', 'moneyToNumber'], stubs: { document: dom } });
    eq(c._fxAmtGet(), 25275, 'the reader parses the money string');
    c._fxAmtSet(21000);
    eq(dom.getElementById('e-fixed-amount').value, '$21,000', 'the writer formats it');
    c._fxAmtSet(0);
    eq(dom.getElementById('e-fixed-amount').value, '', 'zero clears rather than printing $0');
    eq(c._fxAmtGet(), 0, 'and reads back as 0');
    // ⚠ The trap this repo records on the prep card (2026-08-03): formatMoneyInput rewrites the
    // field to "$8,000" and a parseFloat on that is NaN → 0, silently, while the field goes on
    // showing the number. No reader of this field may parseFloat it.
    const readers = ['calcAll', 'toggleFixedPrice', 'resetFixedToSuggested', 'useRoundedFixedFee', 'restoreEstimateToUI']
      .map((n) => noComments(fn(n))).join('\n');
    lacks(readers, 'parseFloat(_fxAmtEl', '⚠ calcAll no longer parseFloats the field');
    lacks(readers, 'parseFloat(amt.value)', 'nor does the toggle');
    lacks(readers, 'fxAmtEl.value = est.fixedPrice', 'nor does the restore write a bare number into it');
    has(noComments(fn('calcAll')), 'var fixedAmount = isFixed ? _fxAmtGet() : 0;', 'calcAll reads the fee through the one reader');
    has(noComments(fn('calcAll')), 'if (_fxAmtGet() !== _fpFee) _fxAmtSet(_fpFee);', 'and tracks the suggestion through the one writer while nothing is typed');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE FIGURE CARRIES THE SUGGESTION IT WAS SET AGAINST — driven through the real handlers');
  {
    const dom = domStub({ 'e-svc': { value: 'cleanout' }, 'e-fixed': true });
    const calls = [];
    const c = sandbox({
      fns: ['markFixedAmountEdited', 'resetFixedToSuggested', 'useRoundedFixedFee', 'keepFixedFee', 'toggleFixedPrice',
            'fixedFeeRounded', '_fxAmtGet', '_fxAmtSet', 'moneyToNumber', 'formatMoneyInput'],
      vars: ['_fixedAmountUserSet', '_fixedAmountBasis'],
      stubs: { document: dom, calcAll: () => calls.push('calc'), showFB: () => {} },
    });
    const amt = dom.getElementById('e-fixed-amount');
    c.window._fixedPriceSuggested = 21600;
    c.toggleFixedPrice();
    eq(amt.value, '$21,600', 'switching fixed on prefills the suggested fee, formatted');
    eq(c._fixedAmountUserSet, false, 'and the field is still tracking');
    eq(c._fixedAmountBasis, 0, 'with no basis — a tracked fee has nothing to drift from');
    eq(dom.getElementById('fixed-amount-row').style.display, 'flex', 'the row shows');

    amt.value = '21000';
    c.markFixedAmountEdited(amt);
    eq(amt.value, '$21,000', 'typing formats as money');
    eq(c._fixedAmountUserSet, true, 'and the fee is hand-set');
    eq(c._fixedAmountBasis, 21600, '⚠ the suggestion at the moment of typing is recorded — that is what drift is measured against');

    c.window._fixedPriceSuggested = 25275;
    c.useRoundedFixedFee();
    eq(amt.value, '$25,000', 'the Round chip sets $25,000 against a $25,275 suggestion');
    eq(c._fixedAmountBasis, 25275, 'and records what it was rounded from');
    eq(c._fixedAmountUserSet, true, 'as a hand-set figure');

    c.window._fixedPriceSuggested = 26100;
    c.keepFixedFee();
    eq(c._fixedAmountBasis, 26100, 'Keep re-bases on the current suggestion, so the warning clears');
    eq(amt.value, '$25,000', 'without touching the figure');

    c.resetFixedToSuggested();
    eq(amt.value, '$26,100', 'the Suggested chip hands the field back to the tracker');
    eq(c._fixedAmountUserSet, false, 'tracking again');
    eq(c._fixedAmountBasis, 0, 'with no basis');
    ok(calls.length >= 5, 'every action recalculates (' + calls.length + ' calls)');

    // ⚠ THIS PAIR PINNED THE RETIRED REFUSAL — the toggle used to untick itself and hide the
    // amount row on a probate matter — and broke correctly when isTMOnly came off on
    // 2026-09-20. Restated as the converse, which is the requirement now and is the one that
    // would catch the rule creeping back: the box STAYS ticked on the two matter types that
    // used to refuse it, the row opens, and the field takes a fee.
    ['probate', 'contested_probate'].forEach(function (svc) {
      dom.getElementById('e-svc').value = svc;
      dom.getElementById('e-fixed').checked = true;
      c._fixedAmountUserSet = false;
      c.window._fixedPriceSuggested = 31000;
      // Emptied on purpose: toggleFixedPrice prefills only into an empty field ("prefill +
      // override"), so leaving the previous step's $26,100 in it would make the prefill
      // assertion below pass on a figure this call never wrote.
      c._fxAmtSet(0);
      c.toggleFixedPrice();
      eq(dom.getElementById('e-fixed').checked, true, svc + ': the box stays ticked');
      eq(dom.getElementById('fixed-amount-row').style.display, 'flex', svc + ': and the amount row opens');
      eq(amt.value, '$31,000', svc + ': the fee prefills rather than being discarded');
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ ROUNDING DRAWS NO WARNING; THE ESTIMATE MOVING DOES — the drift condition compares suggestions');
  {
    const calc = noComments(fn('calcAll'));
    has(calc, 'var _fpMoved = _fixedAmountUserSet && _fpFee > 0 && _fixedAmountBasis > 0 && _fpFee !== _fixedAmountBasis;',
        'the warning fires only when the suggestion is no longer what the figure was typed against');
    lacks(calc, 'Math.abs(_effPct - Math.round(_fpBuf * 100)) > 2',
          '⚠ never on the markup drifting from the contingency — that expression read a rounded fee as an error');
    lacks(calc, 'The estimate has moved since you set it —', 'the sentence that was false on a round-down is gone');
    has(calc, 'The estimate has moved since you set this fee: the suggested fee was', 'the new one names both figures');
    has(calc, 'onclick="keepFixedFee()">Keep $', 'with Keep beside Use');
    has(calc, 'onclick="resetFixedToSuggested()">Use $', 'and Use still there');
    has(calc, 'onclick="useRoundedFixedFee()">Round to $', 'the Round chip');
    has(calc, 'onclick="resetFixedToSuggested()">Suggested $', 'and the Suggested chip');
    has(calc, 'if (_fpRound > 0 && _fpRound !== _fpFee && fixedAmount !== _fpRound)', 'Round is withheld when the field already holds it, or the suggestion is already round');
    has(calc, 'if (_fpFee > 0 && fixedAmount !== _fpFee)', 'Suggested is withheld when the field already holds it');
    has(calc, "if (_fpChipsEl) _fpChipsEl.innerHTML = '';", 'chips are cleared with the drift, so neither survives the toggle going off');
    has(calc, "your figure, against a suggested $", 'a hand-set fee is described as the manager\'s figure, not as the contingency');
    lacks(calc, "' (' + (_effPct >= 0 ? '+' : '') + _effPct + '%) ' + (_delta >= 0 ? 'above' : 'below') + ' it — that gap is the contingency, already included. '",
          'and the unconditional "that gap is the contingency" is gone — it was false the moment a figure was typed');
    // The old warning's whole mechanism must not come back under another name.
    lacks(calc, 'where the contingency for this service is', 'no wording that measures the fee against the buffer');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the basis rides the snapshot and comes back on reopen — one key, written and read');
  {
    const calc = noComments(fn('calcAll'));
    has(calc, 'fixedSuggested: isFixed ? (_fixedAmountUserSet ? (_fixedAmountBasis || _fpFee) : _fpFee) : 0,',
        'the snapshot carries the suggestion the figure was set against (the suggestion itself while tracking)');
    const rs = noComments(fn('restoreEstimateToUI'));
    // Restated 2026-09-24: a fixed fee saved before then carries the prep fee inside it, and the
    // restore moves that out (tests/prep-fee-billing.test.js drives it). Its suggestion was taken
    // with the fee inside, so it is not read back — the current one differs by construction.
    has(rs, '_fixedAmountBasis = (est.fixedPrice && !_legacyPrepInside) ? Math.round(est.fixedSuggested || 0) : 0;',
        'the restore reads it back');
    has(rs, '_fixedAmountUserSet = !!est.fixedPrice;', 'a saved fee is hand-set — it was agreed, not prefilled');
    has(rs, 'Math.round(est.fixedAmount || est.havellinTotal || 0)', 'the flat fee reads fixedAmount first');
    has(rs, '_fxAmtSet(_restoredFlat - _fixedPrepMovedOut);', 'and written back formatted');
    // A record saved before today has no fixedSuggested: the basis reads 0, and 0 never claims a move.
    eq(src.split('  _tc2UserSet = false;\n  _fixedAmountUserSet = false;\n  _fixedAmountBasis = 0;\n').length - 1, 3,
       'the three job-switch resets zero the basis with the flag — a basis leaking across jobs would warn about the wrong estimate');
    const tg = noComments(fn('toggleFixedPrice'));
    has(tg, '_fixedAmountBasis = 0;', 'the toggle prefill starts with no basis');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ A FIXED-PRICE FINAL NEEDS NO TIMESHEET — and a time-and-materials one still does');
  {
    const FEE = 21000;
    const fixed = { jobId: 1, tcFee: 10800, psFee: 7200, pkgCost: 0, smf: 0, prepFee: 0,
                    havellinTotal: FEE, havellinTotalFull: 18000, hourlyHavellinTotal: 18000, tcRate: 150, psRate: 100,
                    discountPct: 0, discountAmt: 0, fixedPrice: true, fixedAmount: FEE, fixedSuggested: 21600, rush: false,
                    vendors: [], prepItems: [], preparedBy: 'Anthony Graziano', svc: 'cleanout', totTC: 72, totPS: 72 };
    const dep = invoice(fixed, 'deposit');
    eq(Math.round(dep.amtDue), 10500, 'the deposit asks for half of the typed fee — $21,000, not the $21,600 suggestion');
    const mid = invoice(fixed, 'midpoint', [pay('deposit', 10500)]);
    eq(Math.round(mid.amtDue), 5250, 'the midpoint a quarter');
    const fin = invoice(fixed, 'final', [pay('deposit', 10500), pay('midpoint', 5250)]);
    eq(fin.blocked, false, '⚠ the final issues with NOTHING in the hours log — a flat fee has no timesheet to true to');
    eq(fin.requiresApproval, false, 'and needs no manager PIN — there is no hourly variance on a fixed job');
    eq(Math.round(fin.amtDue), 5250, 'closing out the last quarter');
    eq(10500 + 5250 + Math.round(fin.amtDue), FEE, 'the engagement collects exactly the figure the manager typed');
    has(fin.html, 'Fixed project fee', 'and the final says it is a fixed fee');
    // The converse, so this cannot be "fixed" by dropping the gate: hourly with no hours is refused.
    const tm = Object.assign({}, fixed, { fixedPrice: false, fixedAmount: 0, fixedSuggested: 0, havellinTotal: 18000 });
    eq(invoice(tm, 'final', [pay('deposit', 9000), pay('midpoint', 4500)]).blocked, true,
       'the same job on time-and-materials is still blocked until hours are logged');
    const body = noComments(fn('invoiceHtml'));
    has(body, "var _noHours = (stage === 'final') && !_fixed && !_feeOnly && (actTC + actPS) === 0;",
        'the gate excludes a fixed basis by construction');
  }
};
