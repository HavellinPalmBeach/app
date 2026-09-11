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

const { source, fn, sandbox } = require('./harness');

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
  group('⚠⚠ THE CHANGE ORDER IS A CLIENT DOCUMENT AND WAS THE LAST PRINTER OFF THE PATH');
  {
    // It hand-rolled the sequence _printDocument exists to own. Measured in a browser:
    //   · it set NO document.title, so Chrome named the client's Save-as-PDF after the
    //     PAGE — "Havellin Palm Beach — Job Manager". Third time this file records that.
    //   · it hid the panels with an inline display:none and restored the active one with
    //     an inline display:block, which BEATS the stylesheet's .panel{display:none} — so
    //     after printing a change order and switching tabs, BOTH panels rendered, stacked,
    //     until the page was reloaded.
    //   · `document.querySelector('.panel.active').style.display` would throw inside its
    //     own timeout if no panel happened to be active.
    const body = noComments(fn('printChangeOrder'));
    has(body, '_printDocument(content,', 'it goes through the one print path');
    lacks(body, 'window.print()', '⚠⚠ and holds no print call of its own');
    lacks(body, "pt.style.display = 'block'", 'nor its own target handling');
    lacks(body, "p.style.display='none'", '⚠⚠ nor the inline panel hiding that broke the app');
    lacks(body, "querySelector('.panel.active')", 'nor the lookup that could throw');
    has(body, "docNames(job, 'changeorder'", 'and it is named by the one namer');

    // The CO number is on the document's face, so the filename that cites it carries it.
    const n = noComments(fn('docNames'));
    has(n, "'Havellin Change Order'", 'the namer knows the kind');
    has(n, 'opt.coNo', 'and takes the change order number');

    const c = sandbox({ fns: ['docNames'], vars: ['EST_TOLERANCE_PCT', 'DOC_STAGE_WORD'] });
    const job = { hvlId: 'HVL-0701', addr: '69 Beach Blvd, Palm Beach, FL' };
    const co = c.docNames(job, 'changeorder', { coNo: 'CO-000001' });
    has(co.printTitle, 'Havellin Change Order CO-000001 - 69 Beach Blvd - ',
       'the PDF is named for the client, the change order and the property');
    lacks(co.printTitle, 'HVL-0701', '⚠ and carries no database key, the way the invoice used to');
    // Same asymmetry as every other kind: the client name is dated, the Drive name is not.
    eq(co.drive, 'HVL-0701 - Havellin Change Order CO-000001.html',
       'the Drive name is the job id plus a stable title');
    lacks(co.drive, new Date().getFullYear().toString(), 'and carries no date');
    // A change order printed before a job record exists must still be named, not throw.
    ok(/^Havellin Change Order - /.test(c.docNames(null, 'changeorder', {}).printTitle),
       'no job and no number still produces a name');
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
    // ⚠ THIS USED TO GREP FIVE HAND-WRITTEN View/Print PAIRS OUT OF `jobTimelineActions`,
    // which proved the five agreed on the day it was written and nothing about the sixth.
    // Slice 4 made them ONE builder, so the assertion is the builder — driven, not read —
    // plus the fact that no row hand-rolls a second copy. That is the requirement:
    // sameness by construction rather than sameness by coincidence.
    const ctx = sandbox({ fns: ['_jtDocViews', '_jtSendAction', 'docKeyFor'] });
    [['estimate', ''], ['agreement', ''],
     ['invoice', 'deposit'], ['invoice', 'midpoint'], ['invoice', 'final']].forEach(([kind, stage]) => {
      const v = ctx._jtDocViews(7, kind, stage, stage ? (stage + ' invoice') : kind);
      const at = stage ? `${kind}/${stage}` : kind;
      eq(v.length, 2, `${at}: two views and no more`);
      ok(/^View\b/.test(v[0].label.replace(/^&#\d+; /, '')), `${at}: View comes first`);
      ok(/^Print\b/.test(v[1].label.replace(/^&#\d+; /, '')), `${at}: Print second, as on every other row`);
      // ⚠ AND EACH NAMES ITS DOCUMENT. The same objects feed the deduped quick strip at
      // the foot of the rail, which carries no row context — bare "View"/"Print" rendered
      // there as four identical pairs with nothing saying which document each opened.
      [0, 1].forEach((k) => has(v[k].label, stage ? (stage + ' invoice') : kind,
        `${at}: the ${k ? 'Print' : 'View'} label says which document it opens`));
      has(v[0].call, `docAction(7,'${kind}','view'`, `${at}: View routes through the one action`);
      has(v[1].call, `docAction(7,'${kind}','print'`, `${at}: and so does Print`);
      if (stage) {
        has(v[0].call, `{stage:'${stage}'}`, `${at}: carrying its stage, so a midpoint views as a midpoint`);
        has(v[1].call, `{stage:'${stage}'}`, `${at}: on Print too`);
      } else {
        lacks(v[0].call, '{stage:', `${at}: and a one-off document carries none`);
      }
    });
    // No row may build its own. Both counts are 5 — five rows, five calls — and a sixth
    // document added by hand instead of through the builder fails here.
    const acts = noComments(fn('jobTimelineActions'));
    eq((acts.match(/_jtDocViews\(/g) || []).length, 5, 'five rows, each calling the one builder');
    eq((acts.match(/'view'/g) || []).length, 0, 'and not one of them writes its own view call');
    eq((acts.match(/'print'/g) || []).length, 0, 'nor its own print call');

    // ⚠ THE SEND BUTTON IS THE SAME SHAPE OF CLAIM AND THE MORE IMPORTANT ONE: the five
    // documents get ONE send control with ONE pair of states, so learning it on the
    // estimate teaches the other four.
    eq((acts.match(/_jtSendAction\(/g) || []).length, 5, 'five rows, one send builder');
    const job = { id: 7, docState: {} };
    [['estimate', '', 'estimate'], ['agreement', '', 'signing packet'],
     ['invoice', 'deposit', 'deposit invoice'], ['invoice', 'midpoint', 'midpoint invoice'],
     ['invoice', 'final', 'final invoice']].forEach(([kind, stage, what]) => {
      const key = ctx.docKeyFor(kind, stage ? { stage } : null);
      job.docState = {};
      const a = ctx._jtSendAction(7, job, kind, stage, what);
      eq(a.label, `&#9993; Send ${what}`, `${key}: nothing drafted → Send, and it names the document`);
      has(a.call, `docAction(7,'${kind}','send'`, `${key}: through the one action`);
      // ⚠ Drafted-and-unsent is a REAL interval, not a formality: `gmail.compose` can
      // only create a draft. Turning the rail green on it would say "sent to client"
      // over an untouched draft — and on the estimate that is what unlocks Mark Won.
      job.docState[key] = { draftedAt: '2026-09-11T10:00:00Z' };
      const b = ctx._jtSendAction(7, job, kind, stage, what);
      has(b.label, 'I&rsquo;ve sent it', `${key}: a pending draft asks for the confirming tap instead`);
      eq(b.call, `markDocSent(7,'${key}')`, `${key}: which records it under its own key`);
      job.docState[key].sentAt = '2026-09-11T10:05:00Z';
      has(ctx._jtSendAction(7, job, kind, stage, what).label, 'Send',
        `${key}: and once sent the button is Send again — a document can always be re-sent`);
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('sending and receiving are two rows and two buttons');
  {
    // They shared one: View/Print sat on the PAYMENT row, so the document you have to
    // read before you can ask for the money was reached from the step that records the
    // money arriving. The invoice rows exist now, so each half is where it belongs.
    const acts = noComments(fn('jobTimelineActions'));
    ['deposit', 'midpoint', 'final'].forEach((stage) => {
      const at = acts.indexOf(`case '${stage}_invoiced':`);
      ok(at > -1, `${stage}_invoiced has its own case`);
      const nextCase = acts.indexOf('case ', at + 6);
      const block = acts.slice(at, nextCase > -1 ? nextCase : undefined);
      has(block, `_jtSendAction(id, job, 'invoice', '${stage}'`, `${stage}: the send lives on the invoice row`);
      has(block, `_jtDocViews(id, 'invoice', '${stage}', '${stage} invoice')`, `${stage}: and so do View and Print, labelled with the document they open`);
      lacks(block, 'dashRecordPayment', `${stage}: the payment recorder does not`);
    });
    ['deposit_received', 'midpoint_received', 'final_paid'].forEach((key) => {
      const at = acts.indexOf(`case '${key}':`);
      const nextCase = acts.indexOf('case ', at + 6);
      const block = acts.slice(at, nextCase > -1 ? nextCase : acts.length - 40);
      has(block, 'dashRecordPayment', `${key}: records the money`);
      lacks(block, '_jtDocViews', `${key}: and no longer carries the document`);
      lacks(block, '_jtSendAction', `${key}: nor sends it`);
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ markDocSent CALLS the legacy recorders, it does not reimplement them');
  {
    // `markAgreementSent` REFUSES without an approved agreement and stamps that approval
    // on the way through; `markEstimateSent` writes the field six surfaces read. The
    // first version of markDocSent set `agrSent = true` itself — a door straight past the
    // one gate that survived the slimming, and a second copy of a rule this file has
    // already paid for twice.
    const m = noComments(fn('markDocSent'));
    has(m, 'markAgreementSent();', 'the agreement goes through its own recorder');
    has(m, 'markEstimateSent();', 'and the estimate through its own');
    has(m, '_primeAgreementFor(jobId)', 'primed first, like every other dashboard action');
    has(m, '_primeEstimateFor(jobId)', 'both of them');
    ok(m.indexOf('_primeAgreementFor(jobId)') < m.indexOf('markAgreementSent();'),
      'and the priming comes first, or it records against whichever job was loaded');
    has(m, 'if (!job.agrSent) return;', 'a refusal stops the send record being written anyway');
    lacks(m, 'job.agrSent = true', 'it never sets the agreement flag itself');
    lacks(m, 'job.estimateSentDate =', 'nor the estimate date');
    // The one thing it DOES own: the per-document record, which is what the three
    // invoice rows read and what nothing else writes.
    has(m, 'st.sentAt = new Date().toISOString()', 'it owns the send stamp');
  }
};
