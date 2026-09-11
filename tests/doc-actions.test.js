'use strict';
// SLICE 3 — one way to NAME, VIEW and PRINT any client document (2026-09-10).
//
// Slice 2 made the three documents pure functions. This gives them one registry, one
// naming rule, one viewer and one print path, so the estimate, the signing packet and all
// three invoices behave identically — which is the thing Anthony actually asked for:
// *"if they've sent an estimate they'll know how to send an agreement, and they'll know
// how to send an invoice."* Sameness is the feature, so it is what these tests pin.
//
// ⚠ THE THREE PRINTERS EACH GOT IT WRONG IN A DIFFERENT WAY, WHICH IS WHY ONE PATH.
//   · `printAgreement` set NO document.title — and Chrome names a Save-as-PDF after the
//     page title, so the client's agreement arrived called "Havellin Palm Beach —
//     Clients & Estimator — INTERNAL". It also hand-rolled the panel-hiding sequence
//     that `_printDocument` exists to own.
//   · `printClientEstimate` hand-rolled the same sequence separately.
//   · The invoice named its PDF `<Surname>-<hvlId>-Final` — a database key on a document
//     going to a client.
// And all three read a rendered panel, so printing from the dashboard depended on having
// visited another tab first.

const { source, fn } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  const KINDS = ['estimate', 'agreement', 'invoice'];

  // ───────────────────────────────────────────────────────────────────────────
  group('the registry holds the differences and nothing else');
  {
    const reg = src.slice(src.indexOf('var DOC_ACTIONS = {'), src.indexOf('var DOC_STAGE_WORD'));
    KINDS.forEach((k) => {
      has(reg, k + ': {', `${k} is registered`);
    });
    ['label:', 'driveSub:', 'html: function', 'blocker: function'].forEach((field) => {
      eq((reg.split(field).length - 1), 3, `every kind declares ${field.split(' ')[0].slice(0, -1)} — exactly three`);
    });

    // ⚠ THE AGREEMENT KEY IS THE SIGNING PACKET, NEVER THE BARE AGREEMENT. Both forms
    // incorporate the Estimate as Exhibit A and the estate form says the agreement is not
    // valid without it, so a client sent the agreement alone is signing against an
    // exhibit they do not have.
    has(reg, 'signingPacketHtml(spec.job.id)', 'the agreement key produces the PACKET');
    lacks(reg, 'agreementHtml(spec', 'never the bare agreement');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ the invoice is THREE documents, so the key carries its stage');
  {
    // Keying on kind alone would let a midpoint invoice inherit a final's gate — the same
    // shape of bug `printInvoice` already had for a different reason.
    const kf = noComments(fn('docKeyFor'));
    has(kf, "'invoice:'", 'an invoice key carries its stage');
    const spec = noComments(fn('docSpec'));
    has(spec, "(kind === 'invoice')", 'and docSpec resolves a stage only for invoices');
    has(spec, "|| currentInvStage || 'final'", 'falling back to the tab, then to final');
    // ⚠ It resolves the JOB from an id, never from a global — the Slice 1 lesson.
    has(spec, 'jobs.find(function (j) { return j.id === jobId; })', 'the job comes from the id it was given');
    lacks(spec, 'currentAgrJobId', 'not from the Agreement tab');
    lacks(spec, 'currentEstimate', 'nor from whatever estimate was last loaded');
    // The APPROVED snapshot first: it carries the rates, the fixed-price flag and the
    // documentation scope that job.havellinEst does not.
    has(spec, 'approvedEstimateFor(jobId)', 'and the approved snapshot is preferred');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ one naming rule — and the PDF filename is what the client sees');
  {
    const n = noComments(fn('docNames'));
    ['Havellin Service Estimate', 'Havellin Services Agreement', 'Havellin Invoice - ']
      .forEach((t) => has(n, t, `it names ${t.trim()} for a human`));
    has(n, 'printTitle: client', 'the print title IS the client-facing name');
    has(n, 'attachment: client', 'and so is the email attachment');
    // ⚠ CLIENT NAME DATED, DRIVE NAME NOT — and the asymmetry is load-bearing. Drive
    // overwrites by filename, so a stable name makes a re-file REPLACE rather than
    // accumulate; dating it would leave a folder of near-identical documents with no way
    // to tell which one the client holds.
    has(n, "var stamp = new Date()", 'the client name carries a date');
    has(n, "drive: hvl + ' - ' + driveBase", 'the Drive name is the job id plus a stable title');
    const driveLine = n.slice(n.indexOf('drive:'));
    lacks(driveLine.slice(0, driveLine.indexOf('\n')), 'stamp', 'and carries no date, so a re-file replaces');
    // The old names are gone from the printers.
    lacks(noComments(fn('printSigningPacket')), "'-Signing-Packet'", 'no hand-built packet filename survives');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ the gate is checked in docAction, once, for every verb');
  {
    // Putting the gate on the buttons instead is how `printInvoice` came to trust a flag
    // another document had set: a gate beside the action cannot be bypassed by reaching
    // the action another way.
    const a = noComments(fn('docAction'));
    has(a, 'var blk = spec.cfg.blocker(spec);', 'every action runs the document’s blocker');
    has(a, 'if (blk) {', 'and refuses when it speaks');
    const iBlk = a.indexOf('spec.cfg.blocker');
    const iHtml = a.indexOf('spec.cfg.html');
    ok(iBlk >= 0 && iHtml >= 0 && iBlk < iHtml, 'the gate runs BEFORE the document is built');
    ['view', 'print'].forEach((v) => has(a, "verb === '" + v + "'", `${v} is a verb`));
    // Slices 4 and 5 add 'send' and 'file' here without a caller changing.
    has(a, "_docNotice('warn', 'Unknown document action.'", 'an unknown verb refuses rather than falling through');

    // The invoice's two verdicts must not collapse into one.
    const ib = noComments(src.slice(src.indexOf('invoice: {'), src.indexOf('var DOC_STAGE_WORD')));
    has(ib, 'if (d.blocked) return', 'blocked is its own refusal');
    has(ib, 'if (d.requiresApproval && !invApproved) return', 'and needs-a-PIN is a different one');
    has(ib, 'Math.round(d.variancePct * 100)', 'which says by how much it is off');

    // ⚠ TYPE CONFUSION, CAUGHT IN A BROWSER AND NOT BY A SOURCE ASSERTION. `spec.est` is
    // the estimate SNAPSHOT; `agreementReady`'s second argument is the STORE RECORD
    // (`{approved, estimate}`). A snapshot has no `.approved`, so passing it made every
    // agreement read as unapproved and refuse to open. The call LOOKED right, which is
    // exactly why grepping for it proved nothing.
    const ab = noComments(src.slice(src.indexOf('agreement: {'), src.indexOf('invoice: {')));
    has(ab, 'agreementReady(spec.job, null)', 'the agreement blocker lets agreementReady read the record itself');
    lacks(ab, 'agreementReady(spec.job, spec.est)', 'never handing it a snapshot');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the three printers are wrappers on the one path');
  {
    ['printClientEstimate', 'printAgreement', 'printSigningPacket'].forEach((p) => {
      const b = noComments(fn(p));
      has(b, "docAction(", `${p} routes through docAction`);
      lacks(b, 'window.print()', `${p} does not hand-roll the print sequence`);
      lacks(b, 'printTarget', `${p} does not touch the print target itself`);
      lacks(b, 'document.title =', `${p} does not juggle the page title`);
      ok(b.split('\n').filter((l) => l.trim()).length <= 6, `${p} is a wrapper, not a renderer`);
    });
    // ⚠ `title` IS the PDF filename, and it is restored on the SAME nested timeout that
    // clears the print target — so a caller cannot leak its filename onto the next print.
    const pd = noComments(fn('_printDocument'));
    has(pd, 'function _printDocument(html, title)', 'the one print path takes a title');
    has(pd, 'var _origTitle = document.title;', 'it remembers the page title');
    has(pd, 'if (title) document.title = title;', 'sets the one it was given');
    const restore = pd.indexOf('document.title = _origTitle;');
    const clear = pd.indexOf("pt.innerHTML = '';");
    ok(restore > clear, 'and restores it where the target is cleared, not on a separate timer');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ the viewer lives OUTSIDE the drilldown');
  {
    // `jobsWatchTick` re-renders #client-dashboard-view with innerHTML whenever a status
    // changes remotely — every 15 seconds while anything is pending — so a viewer nested
    // inside it would be wiped mid-read.
    // ⚠ The requirement is not "after the last panel" — it is "NOT INSIDE the container
    // that gets rewritten". #client-dashboard-view lives inside #panel-jobs, so the test
    // is that the viewer falls outside that panel's span.
    const dvAt = src.indexOf('id="doc-viewer-modal"');
    const jobsAt = src.indexOf('id="panel-jobs"');
    const dashAt = src.indexOf('id="client-dashboard-view"');
    // The panel that opens immediately after #panel-jobs bounds it.
    const nextPanelAt = src.indexOf('<div class="panel" id="panel-job-plan"');
    ok(dvAt > -1, 'the viewer markup exists');
    ok(jobsAt > -1 && dashAt > jobsAt && nextPanelAt > dashAt, 'the drilldown lives inside #panel-jobs');
    ok(dvAt < jobsAt || dvAt > nextPanelAt, 'and the viewer falls outside that panel entirely');
    // It is a sibling of the print target, in the modal/utility block.
    ok(Math.abs(dvAt - src.indexOf('id="print-target"')) < 1500, 'sitting with the other overlays');

    const open = noComments(fn('openDocViewer'));
    has(open, "'<div class=\"ce-page\">'", 'the document is wrapped in a page, as it prints');
    const close = noComments(fn('closeDocViewer'));
    // ⚠ A 45KB agreement left behind a hidden overlay is one display:flex away from being
    // read as the current client's.
    has(close, "box.innerHTML = ''", 'closing drops the document rather than leaving it in the DOM');
    has(close, '_docViewerSpec = null', 'and forgets which document it was');

    // Printing from the viewer rebuilds from the spec rather than scraping the screen.
    const pv = noComments(fn('printDocViewer'));
    has(pv, "docAction(s.job.id, s.kind, 'print'", 'the viewer prints through the same action');
    lacks(pv, 'innerHTML', 'rather than scraping what it is showing');
    has(pv, 'stage: s.stage', 'carrying the stage, so a midpoint prints as a midpoint');

    const css = src.slice(src.indexOf('<style>'), src.indexOf('</style>'));
    ['.doc-viewer{', '.doc-viewer-hd{', '.doc-viewer-body{'].forEach((r) => has(css, r, `${r.slice(0, -1)} exists`));
    // The header must not scroll away: Print has to stay reachable on a long agreement
    // instead of sitting 45KB above the fold.
    has(css, '.doc-viewer-hd{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 16px;border-bottom:1px solid var(--border);background:var(--cream);flex-shrink:0;}',
      'the header does not shrink away');
    has(css, '.doc-viewer-body{overflow-y:auto', 'the document scrolls, not the sheet');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('every document is reachable from the client it belongs to, the same way');
  {
    // The sameness Anthony asked for, asserted as sameness: View then Print, that order,
    // on every document.
    const acts = noComments(fn('jobTimelineActions'));
    [["'estimate','view'", "'estimate','print'"],
     ["'agreement','view'", "'agreement','print'"],
     ["'invoice','view',{stage:'deposit'}", "'invoice','print',{stage:'deposit'}"],
     ["'invoice','view',{stage:'midpoint'}", "'invoice','print',{stage:'midpoint'}"],
     ["'invoice','view',{stage:'final'}", "'invoice','print',{stage:'final'}"],
    ].forEach(([v, p]) => {
      has(acts, v, `${v} is offered`);
      has(acts, p, `${p} is offered`);
      ok(acts.indexOf(v) < acts.indexOf(p), 'and View comes before Print, as on every other row');
    });
    // `&#128065; View` is a prefix of `&#128065; View invoice`, so count the exact labels.
    eq((acts.match(/&#128065; View'/g) || []).length, 2, 'two plain View labels — the estimate and the agreement');
    eq((acts.match(/&#128065; View invoice'/g) || []).length, 3, 'and three that say which invoice');
  }
};
