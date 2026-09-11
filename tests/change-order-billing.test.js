'use strict';
// A CHANGE ORDER CARRIES HOURS, NOT A PRICE (REBUILT 2026-09-11).
//
// Anthony, settling it: "the change order is supposed to trigger when we're gonna run
// fifteen percent over a job, and that's on the transition concierge and property
// specialist hours … everything else is a pass through … I don't think the change order
// should have a dollar amount, and we certainly shouldn't bill a client for it on the
// change order. It should be an estimate of the additional hours or an increase in scope …
// and that should just be added to the final invoice once those hours are actually billed."
//
// ⚠⚠ WHAT IT REPLACES WAS THE SAME WORK CHARGED TWICE. The record carried `amount` /
// `originalTotal` / `newTotal` and the final invoice added the delta as a line. On a T&M
// job — the default on every service — the crew works the extra scope, logs the hours, and
// `_finalServices` trues labour to the log: the change is in the bill before the line is
// added. (A separate defect on top of that read `co.prevTotal`, a field nothing has ever
// written, so the line added the whole REVISED PROJECT TOTAL. Fixed first, then this.)
//
// ⚠ THE ONE RULE, AND THE REASON HALF THIS FILE EXISTS: the hours are billed by the
// TIMESHEET on T&M and by the RATE CARD on fixed price. A flat fee never consults the log,
// so there the derived shift IS the charge; on T&M it is not a charge at all. Applying it
// in both places is the original defect wearing a different hat, so every case below drives
// BOTH bases and checks what the job actually collects.
//
// ⚠ AND THE BASELINE HALF IS NOT COSMETIC. `overUnder` reads `est.havellinTotal`, so without
// the shift an expansion the client signed for reports as "job ran over estimate" and trips
// the ±15% PIN. The converse matters just as much and is asserted: an overrun BEYOND the
// authorised scope must still trip it. A baseline that moves is not a baseline that blinds.

const { sandbox, source, fn } = require('./harness');

function inv(stubs) {
  return sandbox({
    fns: ['invoiceHtml', 'coHours', 'coHoursTotal', 'coBaselineShift', 'coHoursLabel',
          '_coMoney', 'fmt', 'getVendorActuals', 'samePerson', 'canonPersonName',
          '_invVendorFeeSentence', 'prepFeeRate', 'vendorGroupOfLine', 'resolveJobVendor',
          'coordHrsFor', 'prepLineTCHrs', 'vendorLineTCHrs', 'esc', 'fmtDate2', 'svcLabelOf',
          'conciergePhones', 'conciergePhonesText', 'assignedTCContact', 'vendorCats',
          'vendorPrimaryCat', 'estimateIsFeeOnly', 'isDecedentJob'],
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
// 80 TC @150 + 60 PS @100 + $1,940 materials = $19,940, and the baseline hours below
// reproduce it exactly, so an untouched job reads zero variance.
const EST = { jobId: 1, tcFee: 12000, psFee: 6000, pkgCost: 1940, smf: 0, prepFee: 0,
              havellinTotal: 19940, tcRate: 150, psRate: 100, discountPct: 0,
              fixedPrice: false, rush: false, vendors: [], prepItems: [],
              preparedBy: 'Anthony Graziano', svc: 'cleanout', totTC: 80, totPS: 60 };

// The change order Anthony would raise: the guest house is added, about 20 hours each side.
// At the job's own rates that is 20×150 + 20×100 = $5,000 of authorised scope.
function co(tc, ps, id) {
  return { id: id || 99, jobId: 1, description: 'Guest house added to scope',
           reason: 'scope_add', tcHrs: tc, psHrs: ps,
           createdAt: 'Sep 11, 2026', clientApproved: true,
           clientName: 'Tripp Butler', clientAcceptedAt: 'Sep 11, 2026' };
}
function hrs(tc, ps) {
  return [{ date: '2026-09-01', activity: 'clearance',
            members: [{ name: 'Anthony Graziano', role: 'TC', hours: tc },
                      { name: 'Crew', role: 'PS', hours: ps }] }];
}

const DEPOSIT = 9970;   // 50% of $19,940 — unchanged by a change order at either basis
function finalDoc(loggedTC, loggedPS, cos, estOverride) {
  const est = Object.assign({}, EST, estOverride || {});
  const ctx = inv({
    estimateStore: { 1: { estimate: est, approved: true, approvedBy: 'Anthony Graziano' } },
    jobLogs: { 1: hrs(loggedTC, loggedPS) },
    changeOrders: cos || [],
  });
  return ctx.invoiceHtml(JOB, 'final');
}
// What the engagement collects across all three stages. The midpoint is anchored to the
// ESTIMATE at both bases, so it is the same number in every case below; the final is what
// reconciles. Collecting the right total is the only claim worth making.
function collected(d, midpoint) {
  return DEPOSIT + (midpoint === undefined ? 4985 : midpoint) + Math.round(d.amtDue);
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ T&M — THE TIMESHEET BILLS THE CHANGE ORDER, AND NOTHING ELSE DOES');
  {
    eq(Math.round(finalDoc(80, 60, []).amtDue), 4985,
       'baseline: hours as estimated, no change order — the final is the last 25%');

    // THE CASE THE REBUILD IS ABOUT. The client accepts +20/+20, the crew works it and logs
    // it, and the engagement collects the revised total ONCE.
    const worked = finalDoc(100, 80, [co(20, 20)]);
    eq(Math.round(worked.amtDue), 9985, 'the extra $5,000 of hours reaches the final, once');
    eq(collected(worked), 24940,
       '⚠⚠ the job collects the revised total exactly — the old model collected $29,940');

    // ⚠ AND THE CHANGE ORDER ITSELF ADDS NOTHING. Same accepted change order, no hours
    // worked against it yet: the bill must be identical to having no change order at all.
    eq(Math.round(finalDoc(80, 60, [co(20, 20)]).amtDue), 4985,
       '⚠ accepted but not yet worked bills nothing — a change order is not a price');

    // Two change orders do not scale an error, because there is no error to scale.
    eq(collected(finalDoc(120, 100, [co(20, 20), co(20, 20, 100)])), 29940,
       'two change orders, both worked: one revised total, not three');

    // A REDUCTION reduces, which the old model got backwards to the tune of +$19,940.
    const cut = finalDoc(70, 50, [co(-10, -10)]);
    eq(collected(cut), 17440, '⚠ taking scope out lowers the bill');
    eq(Math.round(cut.overUnder), 0, 'and lands exactly on the reduced baseline');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ FIXED PRICE — THERE THE RATE CARD BILLS IT, BECAUSE THE FLAT FEE CANNOT');
  {
    // A fixed fee never consults the timesheet (`_fixed` anchors every stage to
    // `_fixedTotal` and the final does not true up), so added scope that is not charged
    // here is not charged anywhere.
    const fx = { fixedPrice: true };
    eq(collected(finalDoc(80, 60, [], fx)), 19940, 'no change order: the flat fee, period');
    eq(collected(finalDoc(100, 80, [co(20, 20)], fx)), 24940,
       '⚠ the authorised hours are charged at the rate card — once');
    // ⚠ AND THE HOURS MUST NOT CHARGE IT A SECOND TIME. Logging more hours against a fixed
    // fee changes nothing, which is the whole point of a fixed fee.
    eq(collected(finalDoc(200, 200, [co(20, 20)], fx)), 24940,
       '⚠ logging double the hours on a fixed price changes nothing');
    eq(collected(finalDoc(80, 60, [co(20, 20)], fx)), 24940,
       'and it is charged whether or not the hours have been logged yet');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE BASELINE MOVES WITH AUTHORISED SCOPE — AND STILL CATCHES AN OVERRUN');
  {
    // Before the shift, an expansion the client had signed for read as a 25% overrun and
    // demanded a manager PIN. The app treating its own approved change as a variance.
    const authorised = finalDoc(100, 80, [co(20, 20)]);
    eq(Math.round(authorised.overUnder), 0, 'work done exactly to the authorised scope: no variance');
    eq(authorised.requiresApproval, false, '⚠ and no manager PIN on scope the client agreed to');

    // ⚠ THE CONVERSE, AND IT IS THE ONE THAT MATTERS. A baseline that moves must not be a
    // baseline that blinds: real overrun BEYOND the authorised scope still trips the gate.
    const over = finalDoc(120, 100, [co(20, 20)]);
    eq(Math.round(over.overUnder), 5000, 'hours beyond the change order are a real overrun');
    eq(over.requiresApproval, true, '⚠⚠ and they still require the manager PIN');

    // Inside the tolerance it does not fire, so the gate is not simply always-on.
    eq(finalDoc(110, 90, [co(20, 20)]).requiresApproval, false,
       '10% over the authorised scope is inside the ±15% the client already agreed to');

    // With no change order at all the gate is untouched by any of this.
    eq(finalDoc(120, 100, []).requiresApproval, true, 'and an unauthorised overrun still fires');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the document states scope and hours, and says plainly that it charges nothing');
  {
    const html = finalDoc(100, 80, [co(20, 20)]).html;
    has(html, 'Approved Change Orders', 'the invoice shows what was authorised');
    has(html, '+20.0 concierge / +20.0 specialist hrs', 'in hours');
    has(html, 'Accepted by Tripp Butler', 'naming who agreed to it and when');
    has(html, 'already included in the figures above',
        '⚠ and saying the hours are not billed a second time');
    lacks(html, 'Change Order Total', 'there is no change-order money subtotal on T&M');

    // The printed change order itself. Its own table must carry no price at all.
    const pco = noComments(fn('printChangeOrder'));
    has(pco, 'This change order does not itself create a charge.',
        '⚠ the sentence that makes the document honest');
    has(pco, 'Revised estimated hours', 'the table foots in hours');
    lacks(pco, 'Revised Total', 'and never in a revised project total');
    lacks(pco, 'co.amount', 'no dollar amount survives on the printed change order');

    // Fixed price is the one place a figure is legitimate, and it says why.
    has(finalDoc(100, 80, [co(20, 20)], { fixedPrice: true }).html,
        'added to the fixed project fee above',
        'on fixed price the section says it IS charged, and why');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE DOLLAR FIELDS ARE GONE FROM THE RECORD, NOT LEFT DEAD');
  {
    // Dead code that still compiles is how a retired field comes back "as a precaution",
    // and here it would come back as a second charge. Comments may name them; nothing live.
    const live = noComments(src);
    ['co.amount', 'co.newTotal', 'co.originalTotal', 'co.prevTotal', 'coDelta('].forEach((needle) => {
      lacks(live, needle, '⚠ nothing live reads ' + needle);
    });
    ['amount:', 'originalTotal:', 'newTotal:', 'prevTotal:'].forEach((needle) => {
      eq(noComments(fn('saveChangeOrder')).includes(needle), false,
         'saveChangeOrder no longer writes ' + needle);
    });
    const sc = noComments(fn('saveChangeOrder'));
    has(sc, 'tcHrs: tc,', 'it writes the concierge hours');
    has(sc, 'psHrs: ps,', 'and the specialist hours');
    eq((src.match(/changeOrders\.push\(/g) || []).length, 1,
       '⚠ still exactly one writer of a change order');
    // A change order with no hours authorises nothing and must not be creatable.
    has(sc, 'if (!tc && !ps)', '⚠ and it refuses a change order carrying no hours');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the four helpers, driven');
  {
    const c = inv();
    eq(c.coHours({ tcHrs: 20, psHrs: 20 }), { tc: 20, ps: 20, total: 40 }, 'hours off the record');
    eq(c.coHours({ tcHrs: -4 }), { tc: -4, ps: 0, total: -4 }, 'one side only, negative');
    eq(c.coHours(null), { tc: 0, ps: 0, total: 0 }, 'a null change order carries no hours');
    eq(c.coHours({ tcHrs: 'x' }), { tc: 0, ps: 0, total: 0 }, 'and rubbish is zero, not NaN');

    eq(c.coHoursTotal([{ tcHrs: 20, psHrs: 20 }, { tcHrs: 5, psHrs: -5 }]),
       { tc: 25, ps: 15, total: 40 }, 'summed across change orders');
    eq(c.coHoursTotal([]), { tc: 0, ps: 0, total: 0 }, 'none sums to nothing');

    eq(c.coBaselineShift({ tc: 20, ps: 20 }, 150, 100), 5000, 'shift at the job’s own rates');
    eq(c.coBaselineShift({ tc: 20, ps: 20 }, 185, 125), 6200, '⚠ and at premium rates, not a fixed pair');
    eq(c.coBaselineShift({ tc: -10, ps: -10 }, 150, 100), -2500, 'a reduction shifts down');

    has(c.coHoursLabel({ tcHrs: 20, psHrs: 20 }), '+20.0 concierge / +20.0 specialist hrs', 'the label');
    has(c.coHoursLabel({ tcHrs: -4, psHrs: 0 }), '−4.0 concierge hrs', 'minus outside the figure');
    eq(c.coHoursLabel({ tcHrs: 0, psHrs: 0 }), 'no hours change', 'and an empty one says so');

    // _coMoney survives for the fixed-price charge only, and keeps the house style.
    eq(c._coMoney(5000), '+ $5,000', 'a charge reads in the house style');
    eq(c._coMoney(-2500), '− $2,500', '⚠ and a credit never prints $-2,500');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('an unaccepted change order is never billed and never moves the baseline');
  {
    // Pre-existing and load-bearing: `clientApproved` is what makes a change order real.
    const pending = Object.assign(co(20, 20), { clientApproved: false });
    eq(Math.round(finalDoc(80, 60, [pending]).amtDue), 4985, 'it adds nothing on T&M');
    eq(collected(finalDoc(100, 80, [pending], { fixedPrice: true })), 19940,
       'nor on fixed price, where a change order is a real charge once accepted');
    lacks(finalDoc(80, 60, [pending]).html, 'Approved Change Orders',
          'and it does not appear on the document at all');
    // ⚠ It must not move the baseline either, or unsigned scope would excuse an overrun.
    eq(finalDoc(120, 100, [pending]).requiresApproval, true,
       '⚠ an unsigned change order cannot excuse an overrun');
  }
};
