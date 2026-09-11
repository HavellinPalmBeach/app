'use strict';
// CHANGE ORDERS BILLED THE WHOLE PROJECT TOTAL INSTEAD OF THE DELTA (FOUND 2026-09-11).
//
// ⚠⚠ THE READER NAMED A FIELD NOTHING HAS EVER WRITTEN. Both consumers of a change
// order's money computed `co.newTotal - co.prevTotal`, and `prevTotal` appears nowhere in
// havellin.html, in tests/, or in apps-script/. `saveChangeOrder` is the ONLY writer of a
// change order and it writes `originalTotal`. So the expression resolved to `newTotal - 0`
// — the whole REVISED PROJECT TOTAL — and `totalFinalBasis` added a second entire copy of
// the job to the final invoice.
//
// Measured by driving the real `invoiceHtml` on a $19,940 Estate Settlement with the hours
// logged to reproduce the estimate exactly:
//   +$5,000 change order  → final billed $29,925 against a correct  $9,985
//   -$5,000 change order  → final billed $19,925 against a correct     -$15  (a REDUCTION
//                           in scope RAISED the bill by nearly twenty thousand dollars)
//   two +$5,000 orders    → final billed $54,865 against a correct $14,985
// The error is one whole project total PER accepted change order, on the document that
// goes to the client.
//
// ⚠⚠ AND THE 15% MANAGER PIN WAS BLIND TO IT, WHICH IS WHY IT SURVIVED. The variance gate
// reads `overUnder`, derived from `havellinTotalDiscounted = totalFinalBasis - coTotal` —
// the same wrong number subtracted straight back out. Every one of those invoices reported
// variance 0.0% with `requiresApproval` false. A gate that reads a figure the defect
// cancels itself out of is not a second line of defence, and the tests must drive the
// AMOUNT rather than the flag.
//
// ⚠ THERE WAS NO COVERAGE OF CHANGE-ORDER BILLING ANYWHERE IN tests/ — 3306 committed
// checks and not one of them had ever put a change order on an invoice. That is the whole
// reason this ran: the money path with the fewest readers had none.

const { sandbox, source, fn } = require('./harness');

// Everything `invoiceHtml` reaches. Lifted from the real source, not stubbed — a stub of
// the money is a test of the stub.
function inv(stubs) {
  return sandbox({
    fns: ['invoiceHtml', 'coDelta', '_coMoney', 'fmt', 'getVendorActuals', 'samePerson',
          'canonPersonName', '_invVendorFeeSentence', 'prepFeeRate', 'vendorGroupOfLine',
          'resolveJobVendor', 'coordHrsFor', 'prepLineTCHrs', 'vendorLineTCHrs', 'esc',
          'fmtDate2', 'svcLabelOf', 'conciergePhones', 'conciergePhonesText',
          'assignedTCContact', 'vendorCats', 'vendorPrimaryCat', 'estimateIsFeeOnly',
          'isDecedentJob'],
    vars: ['SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'DEPT_EMAILS', 'HAVELLIN_OFFICE_PHONE',
           'NON_MOBILE_NUMBERS', 'DEFAULT_CONTRACTORS', 'COORD_TOUCHES',
           'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES_DEFAULT', 'TOUCH_HRS',
           'DECEDENT_SERVICES', 'PERSON_NAME_ALIASES', 'PREP_FEE_RATE', 'invApproved'],
    stubs: Object.assign({
      jobLogs: {}, estimateStore: {}, changeOrders: [], contractors: [],
      currentEstimate: null, currentInvStage: 'final', vendorDirectory: [], jobPlans: {},
    }, stubs || {}),
  });
}

const JOB = { id: 1, hvlId: 'HVL-0007', client: 'Butler Estate', svc: 'cleanout',
              address: '69 Beach Blvd', tc: 'Anthony Graziano', status: 'active',
              premium: false, executor: 'Tripp Butler' };
// tcFee + psFee + pkgCost = 12,000 + 6,000 + 1,940 = 19,940, and the hours below
// reproduce that exactly, so the baseline final is a clean 25% with zero variance.
const EST = { jobId: 1, tcFee: 12000, psFee: 6000, pkgCost: 1940, smf: 0, prepFee: 0,
              havellinTotal: 19940, tcRate: 150, psRate: 100, discountPct: 0,
              fixedPrice: false, rush: false, vendors: [], prepItems: [],
              preparedBy: 'Anthony Graziano', svc: 'cleanout' };
const HOURS = [{ date: '2026-09-01', activity: 'clearance',
                 members: [{ name: 'Anthony Graziano', role: 'TC', hours: 80 },
                           { name: 'Crew', role: 'PS', hours: 60 }] }];

function co(amount, id) {
  return { id: id || 99, jobId: 1, description: 'Additional attic clearance',
           amount: amount, reason: 'scope', originalTotal: 19940,
           newTotal: 19940 + amount, approved: false, clientApproved: true,
           clientName: 'Tripp Butler', clientAcceptedAt: 'Sep 11, 2026' };
}

function finalInvoice(cos, estOverride) {
  const est = Object.assign({}, EST, estOverride || {});
  const ctx = inv({
    estimateStore: { 1: { estimate: est, approved: true, approvedBy: 'Anthony Graziano' } },
    jobLogs: { 1: HOURS },
    changeOrders: cos || [],
  });
  return ctx.invoiceHtml(JOB, 'final');
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE DELTA IS THE DELTA — driven on the real invoice, not asserted on source');
  {
    // The baseline has to be right or every figure below means nothing.
    eq(Math.round(finalInvoice([]).amtDue), 4985,
       'with no change order the final is 25% of the $19,940 the client accepted');

    eq(Math.round(finalInvoice([co(5000)]).amtDue), 9985,
       '⚠⚠ a +$5,000 change order adds $5,000 — it used to add $24,940, the whole revised total');

    eq(Math.round(finalInvoice([co(-5000)]).amtDue), -15,
       '⚠⚠ a -$5,000 change order REDUCES the bill — it used to RAISE it to $19,925');

    eq(Math.round(finalInvoice([co(5000), co(5000, 100)]).amtDue), 14985,
       '⚠ two change orders add $10,000 — the old error scaled with the COUNT, to $54,865');

    // Fixed price takes a different basis (`_fixedTotal`) and reaches the same reduce.
    eq(Math.round(finalInvoice([co(5000)], { fixedPrice: true }).amtDue), 9985,
       'a fixed-price job bills the same delta — change orders are the only thing that moves a flat fee');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the line the CLIENT reads carries the same number as the total');
  {
    // The two sites are the invoice's coTotal and the row it prints. Two copies of one
    // rule is the defect this file records more often than any other; here they did not
    // drift, they were simply both wrong, which is luck rather than design.
    has(finalInvoice([co(5000)]).html, 'Change Order Total',
        'an accepted change order renders its own section');
    has(finalInvoice([co(5000)]).html, '+ $5,000', 'and the row states the real delta');
    lacks(finalInvoice([co(5000)]).html, '$24,940',
          '⚠ the revised project total never appears as a delta');

    // ⚠ THE NEGATIVE BRANCH ONLY BECAME REACHABLE WITH THIS FIX. While the delta resolved
    // to the whole revised total it was positive on every realistic job, so the else-arm
    // had never once run — and it printed `$-5,000`. The discount row above it has always
    // written a minus sign and a positive figure.
    has(finalInvoice([co(-5000)]).html, '− $5,000',
        'a reduction prints in the house style, not $-5,000');
    lacks(finalInvoice([co(-5000)]).html, '$-5,000', 'and never with the sign inside the figure');

    // ⚠ THERE ARE FOUR RENDER SITES, NOT TWO, AND THE `lacks` ABOVE IS WHAT FOUND THAT.
    // The first pass at this fix routed the section row and its subtotal and called it
    // done; the driven check then failed on a `$-5,000` in the PAYMENT SUMMARY, which
    // renders the same figure again — twice, once in the final body and once in the
    // fee-only one. Grepping for the two sites I already knew about proved nothing.
    eq((noComments(src).match(/_coMoney\(/g) || []).length, 5,
       '\u26a0 one definition and four readers: section row, subtotal, both payment summaries');
    eq(noComments(src).split('\n').filter(function (l) {
         return /(^|[^\w$])(coTotal|delta)\s*>=\s*0\s*\?/.test(l);
       }), [], '\u26a0 no hand-rolled change-order sign survives anywhere');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE FIELD THAT WAS NEVER WRITTEN');
  {
    // State the requirement rather than today's spelling: no live line may read a change
    // order field that `saveChangeOrder` does not write. `prevTotal` survives only in the
    // comment explaining its removal — the same needle-trips-my-own-comment trap this
    // repository has now recorded four times.
    const live = noComments(src).split('\n').filter((l) => l.includes('co.prevTotal'));
    eq(live, [], '⚠ nothing reads co.prevTotal any more');
    eq((src.match(/prevTotal:/g) || []).length, 0,
       'and nothing writes it either — it never existed, which is the whole defect');

    // The writer is the contract. If these three stop being written together the fallback
    // ladder in coDelta is what holds, and it should be asserted rather than assumed.
    const sc = noComments(fn('saveChangeOrder'));
    has(sc, 'originalTotal: orig,', 'saveChangeOrder writes originalTotal');
    has(sc, 'newTotal: orig + amount,', 'and newTotal');
    has(sc, 'amount: amount,', 'and the amount as typed');
    eq((src.match(/changeOrders\.push\(/g) || []).length, 1,
       '⚠ exactly one writer of a change order — a second one is how a field goes missing');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('coDelta is ONE definition, and the invoice reads it');
  {
    const c = inv();
    eq(c.coDelta({ originalTotal: 19940, newTotal: 24940, amount: 5000 }), 5000,
       'the gap between the two figures the client signed');
    eq(c.coDelta({ originalTotal: 19940, newTotal: 14940, amount: -5000 }), -5000, 'negative too');
    // ⚠ THE PRINTED DOCUMENT IS THE CONSTRAINT, NOT `amount`. The change order the client
    // accepts prints "Original estimate" and "Revised Total"; billing anything but the gap
    // between those two bills a number their signed copy does not show. So a record whose
    // `amount` disagrees is billed off the printed pair.
    eq(c.coDelta({ originalTotal: 19940, newTotal: 24940, amount: 999 }), 5000,
       '⚠ the signed figures win over a disagreeing amount');
    eq(c.coDelta({ amount: 5000 }), 5000, 'amount is the fallback when a figure is missing');
    eq(c.coDelta({ originalTotal: 19940 }), 0, 'and a record with neither bills nothing');
    eq(c.coDelta(null), 0, 'a null change order bills nothing rather than throwing');
    // A job with no estimate when the order was raised stores originalTotal 0.
    eq(c.coDelta({ originalTotal: 0, newTotal: 5000, amount: 5000 }), 5000,
       'originalTotal 0 is a real value, not a missing one');

    // Both consumers go through it. An inlined second copy is what this replaces.
    const ih = noComments(fn('invoiceHtml'));
    has(ih, 'sum + coDelta(co)', 'the invoice total reads coDelta');
    has(ih, 'var delta = coDelta(co);', 'and so does the row it prints');
    eq((noComments(src).match(/co\.newTotal\s*\|\|\s*0/g) || []).length, 0,
       '⚠ no inlined delta arithmetic survives outside coDelta');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE PIN GATE CANNOT SEE A CHANGE ORDER, AND THAT IS CORRECT');
  {
    // Worth pinning because it is the reason the defect was invisible, and because the
    // right answer looks identical to the wrong one from here. A change order the CLIENT
    // has accepted is agreed scope, not a variance — `havellinTotalDiscounted` subtracts
    // coTotal back out precisely so the ±15% test measures Havellin's performance against
    // the estimate rather than flagging work the client asked for. So `requiresApproval`
    // stays false, and the AMOUNT is the only thing that can catch a billing error.
    const d = finalInvoice([co(5000)]);
    eq(d.requiresApproval, false, 'an accepted change order does not trip the manager PIN');
    eq(Math.round(d.variancePct * 100) / 100, 0, 'and does not register as variance');
    eq(Math.round(d.overUnder), 0, 'the job still ran exactly to estimate on its own scope');
    // ⚠ Which is exactly why the checks above assert amtDue. A suite watching the flag
    // would have been green through every figure in the header comment.
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('an unaccepted change order is never billed');
  {
    // Pre-existing and load-bearing: `renderInvoice` filters on `co.clientApproved`, so a
    // change order sitting unsigned is not money. Untouched by this fix and asserted here
    // because this is now where change-order billing is covered.
    const pending = Object.assign(co(5000), { clientApproved: false });
    eq(Math.round(finalInvoice([pending]).amtDue), 4985,
       'an unaccepted change order adds nothing');
    lacks(finalInvoice([pending]).html, 'Change Order Total',
          'and does not appear on the document at all');
  }
};
