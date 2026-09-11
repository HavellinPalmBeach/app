'use strict';
// SLICE 2 — the three client documents are PURE FUNCTIONS (2026-09-10).
//
// ⚠ WHY THIS MATTERS BEYOND TIDINESS. The drilldown has to view, print, file and email
// all three documents, and until now the only way to OBTAIN one was to render it into
// its own tab's panel and read the innerHTML back out. `_approvedEstimateHtml` did
// exactly that: it swapped `currentEstimate`, `estimateApproved` and `estimateSubmitted`,
// rendered into `#ce-page-content`, read the HTML, and put all four back in a `finally`.
// It worked — and it was one early return away from leaving the Client Estimate tab
// showing another client's estimate, and from arming `applyEstimateLock`'s 12-second
// approval poll against a job nobody was looking at. A function that returns a string
// cannot fail that way at all.
//
// ⚠ AND THE INVOICE'S GATES WERE ASSERTED NOWHERE IN THIS SUITE. `invBlocked`,
// `invRequiresApproval` and the ±15% variance decide whether a client can be billed, and
// they were module globals set by whichever render ran last — so `printInvoice` was
// printing against another document's verdict whenever the tab had last rendered a
// different job or stage.

const { source, fn } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  const BUILDERS = ['clientEstimateHtml', 'agreementHtml', 'probateAgreementHtml', 'invoiceHtml'];

  // ───────────────────────────────────────────────────────────────────────────
  group('the builders touch no DOM — that is the whole property');
  {
    BUILDERS.forEach((name) => {
      const b = noComments(fn(name));
      ok(b.length > 0, `${name} exists`);
      ['document.getElementById', 'document.querySelector', '.innerHTML', 'window.print']
        .forEach((needle) => lacks(b, needle, `${name} does not touch the DOM (${needle})`));
      has(b, 'return', `${name} returns its document rather than writing it`);
    });

    // They take what they render rather than reading it out of a global, or a caller
    // still has to arrange the globals first — which is the borrow, moved.
    has(src, 'function clientEstimateHtml(e, job)', 'the estimate takes its estimate and job');
    has(src, 'function agreementHtml(job, est)', 'the agreement takes its job and estimate');
    has(src, 'function probateAgreementHtml(job, est)', 'so does the estate form');
    has(src, 'function invoiceHtml(job, stage)', 'the invoice takes its job and stage');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ the tab-borrow is gone');
  {
    const est = noComments(fn('_approvedEstimateHtml'));
    has(est, 'clientEstimateHtml(snap,', 'it builds from the approved snapshot directly');
    ['currentEstimate =', 'estimateApproved =', 'estimateSubmitted =', 'innerHTML',
     'renderClientEstimate', 'updateApprovalUI', 'finally'].forEach((n) => {
      lacks(est, n, `it mutates nothing — no ${n}`);
    });
    // And it is still scoped to an APPROVED record: an agreement must never attach an
    // estimate that has not been approved as its Exhibit A.
    has(est, 'approvedEstimateFor(jobId)', 'and only while the record is approved');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the shims stay thin — a rule in a shim is a second renderer');
  {
    // The moment a shim grows a rule the builder does not have, the document you PRINT
    // and the document you EMAIL begin to differ. That drift is in this file's history
    // more than once, so the shims are held to writing and wiring only.
    const ce = noComments(fn('renderClientEstimate'));
    has(ce, 'clientEstimateHtml(currentEstimate, _ceJob)', 'the estimate shim calls the builder');
    has(ce, 'tab-empty', 'and owns the empty state');
    ok(ce.split('\n').filter((l) => l.trim()).length <= 10, 'and is short');
    // ⚠ The empty state belongs to the SHIM, not the builder: "there is nothing to show
    // on this tab" is a statement about the tab, and a builder that returned it would
    // put that sentence inside a printed PDF.
    lacks(noComments(fn('clientEstimateHtml')), 'tab-empty', 'the builder never emits a tab empty-state');
    lacks(noComments(fn('invoiceHtml')), 'tab-empty', 'nor does the invoice builder');

    const ag = noComments(fn('renderAgreement'));
    has(ag, 'agreementHtml(job, null)', 'the agreement shim calls the builder');
    has(ag, 'updateAgrUI()', 'and does the tab wiring');
    ok(ag.split('\n').filter((l) => l.trim()).length <= 8, 'and is short');
    // ⚠ Routing stays in the BUILDER. A caller that forgets sends a living-owner
    // contract to an executor.
    has(noComments(fn('agreementHtml')), 'if (isDecedentJob(job)) return probateAgreementHtml(job, est);',
      'the living/deceased routing is inside the builder, not in a caller');
    lacks(ag, 'isDecedentJob', 'so the shim does not decide which form to draw');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ the invoice gates — the first committed coverage of them');
  {
    const inv = noComments(fn('invoiceHtml'));
    // Blocked and requires-approval are NOT the same idea and collapsing them is the
    // defect to guard: `requiresApproval` means "a manager can unlock this", and nobody
    // can unlock a missing timesheet.
    has(inv, 'blocked: _noHours', 'a final with no hours logged is blocked');
    has(inv, "requiresApproval: !_noHours && (stage === 'final') && (_variancePct > 0.15)",
      'and approval is a separate question, final-only, outside ±15%');
    has(inv, "var _noHours = (stage === 'final') && !_fixed && !_feeOnly && (actTC + actPS) === 0",
      'the no-hours test excludes fixed-price and fee-only, which bill no hours at all');
    has(inv, 'variancePct: _variancePct', 'the variance comes back so the banner can state it');
    has(inv, 'warnHtml: _warnBanner', 'so does the soft under-billing warning');
    has(inv, 'amtDue: stageAmtDue', 'and the amount, so the mailto cannot re-derive it');

    // ⚠ THE GATE TRAVELS WITH THE DOCUMENT because it cannot be re-derived cheaply —
    // `requiresApproval` needs `overUnder`, which needs the actual hours, the change
    // orders, the rush premium and the stage split. A separate gate function would be a
    // second copy of the money, and that is how a flag and the figure it describes come
    // to disagree.
    has(inv, 'overUnder: overUnder', 'the over/under figure travels with its own verdict');

    // ⚠ AND printInvoice MUST RE-COMPUTE. The globals are whatever the last render left
    // behind, for whatever job and stage that was — so a final blocked for no hours on
    // one job could be printed the moment another job's deposit invoice had cleared them.
    const p = noComments(fn('printInvoice'));
    has(p, 'invoiceHtml(_pj, currentInvStage)', 'printInvoice computes the gate fresh');
    has(p, '_pDoc.blocked', 'and reads the blocked verdict off that');
    has(p, '_pDoc.requiresApproval', 'and the approval verdict too');
    lacks(p, 'if (invBlocked)', 'never off the global the last render left behind');
    lacks(p, 'if (invRequiresApproval', 'nor that one');

    // The shim may mirror them for its own controls; nothing that DECIDES may read them.
    const rs = noComments(fn('renderInvoice'));
    has(rs, 'invBlocked = doc.blocked;', 'the shim mirrors the verdict for the tab controls');
    has(rs, 'invRequiresApproval = doc.requiresApproval;', 'both of them');
    has(rs, 'invBlocked = false; invRequiresApproval = false;',
      'and clears them when there is no job, so a stale verdict cannot outlive its document');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('nothing renders a document a second way');
  {
    // One builder per document, and the callers that need a string call it. Two
    // renderings of one document is the drift this whole slice exists to prevent.
    eq((src.match(/function clientEstimateHtml\(/g) || []).length, 1, 'one estimate builder');
    eq((src.match(/function agreementHtml\(/g) || []).length, 1, 'one agreement builder');
    eq((src.match(/function invoiceHtml\(/g) || []).length, 1, 'one invoice builder');
    // The old names are gone, so nothing can reach a renderer expecting it to return HTML.
    lacks(src, 'function renderProbateAgreement(', 'the old estate renderer name is retired');
    eq((src.match(/renderProbateAgreement\(\)/g) || []).length, 0, 'and nothing calls it');

    // ⚠ Slice 3 finished this: the packet READ `#agr-page-content`, so it was whatever
    // the Agreement tab happened to be showing, and it returned '' outright if that tab
    // had never rendered — printing a packet from the dashboard depended on having
    // visited another tab first. Both halves are built now.
    const pk = noComments(fn('signingPacketHtml'));
    lacks(pk, "getElementById('agr-page-content')", 'the packet no longer scrapes the agreement panel');
    has(pk, 'agreementHtml(job, null)', 'it builds the agreement');
    has(pk, '_approvedEstimateHtml(jobId)', 'and the approved estimate as its Exhibit A');
  }
};
