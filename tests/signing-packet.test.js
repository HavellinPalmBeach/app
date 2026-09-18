'use strict';
// The signing packet (2026-09-08). Both agreement forms incorporate the Estimate as Exhibit A
// and the estate form says the agreement is not valid without it, yet the app filed them as
// two documents in two subfolders. Anthony: "build the combined signing packet." One document:
// the agreement, then the APPROVED client estimate on a new page under an Exhibit A band.

const { sandbox, fn, source } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  const ctx = sandbox({ fns: ['buildSigningPacketHtml', 'approvedEstimateFor'] });
  const src = source();

  group('approvedEstimateFor — the snapshot, and only while approved');
  {
    eq(ctx.approvedEstimateFor(1), null, 'no record → null');
    ctx.estimateStore[2] = { estimate: { jobId: 2, havellinTotal: 100 }, approved: false };
    eq(ctx.approvedEstimateFor(2), null, 'an unapproved record → null, never the draft');
    ctx.estimateStore[3] = { estimate: { jobId: 3, havellinTotal: 200 }, approved: true };
    eq(ctx.approvedEstimateFor(3).havellinTotal, 200, 'an approved record → its snapshot');
  }

  group('buildSigningPacketHtml — agreement first, estimate second, on a new page');
  {
    const html = ctx.buildSigningPacketHtml('<p id="agr">AGR</p>', '<p id="est">EST</p>', { hvlId: 'HVL-2609-ABCD' });
    ok(html.indexOf('AGR') < html.indexOf('EST'), 'the agreement comes before the estimate');
    has(html, 'class="ce-page packet-exhibit"', 'the estimate page carries the page-break class');
    has(html, 'Exhibit A &mdash; Service Estimate &middot; HVL-2609-ABCD', 'the band names Exhibit A and the job');
    has(html, 'Incorporated by reference into the Agreement as Exhibit A', 'and says what it is — "the Agreement", because the estate form is titled Client Engagement Agreement and the standard form Client Services Agreement');
    eq((html.match(/class="ce-page/g) || []).length, 2, 'two pages, nothing else');
    const noId = ctx.buildSigningPacketHtml('a', 'b', {});
    lacks(noId, '&middot;', 'no job id, no dangling separator');
    has(ctx.buildSigningPacketHtml('a', 'b', { hvlId: '<x>' }), '&lt;x&gt;', 'the id is escaped');
  }

  group('both agreements read the APPROVED estimate, never a total with no rates behind it');
  {
    // ⚠ Both take `est` as an argument now (Slice 2) and fall back to the approved
    // snapshot when a caller passes none — so the assertion is that the FALLBACK is still
    // the approved record, never `job.havellinEst`, which carries no rates, no
    // fixed-price flag and no documentation scope.
    has(fn('agreementHtml'), 'if (!est) est = approvedEstimateFor(jobId) ||', 'standard form falls back to the approved snapshot');
    has(fn('probateAgreementHtml'), 'if (!est) est = approvedEstimateFor(jobId) ||', 'estate form too');
    has(fn('agreementHtml'), 'function agreementHtml(job, est)'.slice(9), 'and the caller may hand one in');
    const agr = fn('agreementHtml');
    eq((agr.match(/attached as Exhibit A and incorporated by reference/g) || []).length, 2,
       '§1.1 on both standard-form arms says the Estimate is ATTACHED, because now it is');
  }

  group('the print and the filing');
  {
    const print = fn('printSigningPacket');
    // ⚠ THE GATE MOVED IN SLICE 4 AND IS STRONGER FOR IT. It used to be the first line of
    // this function, of `printAgreement` and of `emailAgreementToClient` — three copies,
    // and a fourth door one line away from having none. It is `DOC_ACTIONS.agreement
    // .commit` now, run by `docAction` on every verb but 'view', so it cannot be reached
    // around.
    eq(print.replace(/\s+/g, ' ').trim(),
       "function printSigningPacket() { docAction(currentAgrJobId, 'agreement', 'print'); }",
       'it is a one-line shim on the one document action');
    has(fn('docAction'), "verb !== 'view' && spec.cfg.commit && spec.cfg.commit(spec)",
        'and the gate runs there, for every verb that puts the document in somebody\u2019s hands');
    // Slice 3: it is a wrapper on the one document action, which owns the print path and
    // the naming. `docNames` gives it a client-facing name rather than a database key.
    has(print, "docAction(currentAgrJobId, 'agreement', 'print')", 'routes through the ONE document action');
    lacks(print, 'window.print()', 'and does not call window.print itself');
    lacks(print, 'document.title =', 'nor juggles the page title by hand');
    has(fn('docNames'), 'Havellin Services Agreement', 'the PDF is named for the client, not keyed');
    // ⚠ SLICE 5: it files through `docFile` like every other document. The packet IS the
    // agreement kind's document (Slice 3), so the registry's `driveSub` puts it in the
    // Agreement folder and `docNames` names it — one subfolder rule, one naming rule.
    const exp = noComments(fn('exportSigningPacketToDrive'));
    has(exp, "docAction(jobId, 'agreement', 'file'", 'filed through the one action');
    has(exp, '{ auto: true }', 'and silently — a filing nobody pressed reports only failures');
    has(src, "driveSub: 'Agreement',", 'the registry puts the agreement kind in that folder');
    lacks(exp, 'uploadHtmlToDrive', 'it uploads nothing itself');
    lacks(exp, 'signingPacketHtml', 'nor builds the document a second way');
    // ⚠ THE ONCE-PER-APPROVAL GUARD SURVIVES, AND IT IS NOT REDUNDANT. A redraw must not
    // re-file, but a NEW approval carrying a correction must — which is why it keys on the
    // approval stamp rather than on "already done this session".
    has(exp, '_packetExported[jobId] === _agrExportKey(job)', 'a redraw does not re-file');
    has(exp, '_packetExported[jobId] = _agrExportKey(job)', 'but a fresh approval does');
    ok(exp.indexOf('_packetExported[jobId] =') < exp.indexOf('docAction('),
      'and the guard is claimed BEFORE the async filing, or two calls race past it');
    // ⚠ It used to fire inside the agreement's PIN handler. The PIN is gone, so the
    // filing moved to `ensureAgreementApproved` — the one place the approval is stamped.
    has(fn('ensureAgreementApproved'), 'exportSigningPacketToDrive(jobId)', 'and it fires when the approval is stamped');
    // ⚠ AND IT IS THE ONLY THING FILED. Retaining the bare agreement beside it put a
    // document that must never go out one click from the one that must, under a nearly
    // identical name. The packet carries the agreement verbatim as its first page, so
    // nothing is lost by not filing it twice.
    lacks(fn('ensureAgreementApproved'), 'exportAgreementToDrive', '⚠ and the bare agreement is not filed at all');
    lacks(src, 'function exportAgreementToDrive', 'the filer is deleted, not left dead in the file');
    // ⚠ THIS USED TO ASSERT A `finally` THAT PUT THE CLIENT ESTIMATE TAB BACK. Slice 2
    // removed the borrow it was compensating for: `_approvedEstimateHtml` swapped three
    // globals, rendered into #ce-page-content, read the innerHTML out and restored all
    // four. It was one early return away from leaving the tab on another client's
    // estimate, and it armed the 12-second approval poll against a job nobody was
    // looking at. The requirement was never "restore carefully" — it was "do not
    // disturb the tab at all", which a function returning a string cannot fail to meet.
    const est = fn('_approvedEstimateHtml');
    has(est, 'clientEstimateHtml(snap,', 'it builds the document from the approved snapshot');
    has(est, 'approvedEstimateFor(jobId)', 'and only while that record is approved');
    ['currentEstimate =', 'estimateApproved =', 'estimateSubmitted =', 'innerHTML',
     'renderClientEstimate', 'updateApprovalUI'].forEach(function(n){
      lacks(est, n, 'it mutates nothing — no ' + n);
    });
  }

  group('the button follows the Print / Save PDF button exactly');
  {
    has(src, 'id="btn-agr-packet" onclick="printSigningPacket()"', 'the button exists on the agreement tab');
    const ui = fn('updateAgrUI');
    const hide = (ui.match(/btnPdf\.style\.display='none'; if \(btnPacket\) btnPacket\.style\.display='none'/g) || []).length;
    const show = (ui.match(/btnPdf\.style\.display='inline-block'; if \(btnPacket\) btnPacket\.style\.display='inline-block'/g) || []).length;
    ok(hide >= 1 && show >= 1, 'every PDF-button toggle carries the packet button with it (' + hide + ' hide, ' + show + ' show)');
    eq((ui.match(/btnPdf\.style\.display='(none|inline-block)'(?!; if \(btnPacket\))/g) || []).length, 0, 'no bare toggle survives');
  }

  group('⚠⚠ THE TRAILING EXHIBIT A BLOCK IS GONE, AND THE INCORPORATION IS NOT');
  {
    // ⚠⚠ IT RESTATED THE PACKET’S OWN BAND ONE PAGE EARLY, ON THE PAGE THE CLIENT SIGNS. The
    // agreement never goes out alone — `DOC_ACTIONS.agreement` resolves to the packet on every verb
    // — and the packet opens the estimate under `.packet-exhibit-hdr`, which prints *Exhibit A —
    // Service Estimate · <HVL id>* over *Incorporated by reference into the Agreement as Exhibit A*.
    // Anthony, off a real envelope: *"the second is duplicated on the actual exhibit header, so
    // unneeded."*
    const agr = fn('agreementHtml');
    lacks(agr, '[Attach the approved Service Estimate', 'the Exhibit A block is a statement, not a note-to-self');
    lacks(agr, 'Exhibit A &mdash; Service Estimate',
          '⚠ and the heading is not printed a second time on the signature page');
    lacks(agr, 'is attached to this Agreement as Exhibit A. Its date, line-item breakdown',
          '⚠ the trailing paragraph is deleted, not hidden');
    // ⚠⚠ THE CONVERSE, AND IT IS THE HALF THAT MATTERS: THE INCORPORATION IS STILL IN THE BODY,
    // where a contract states it. Removing the trailing block and the §1.1 sentence together would
    // leave the agreement silent about what Exhibit A is.
    eq((agr.match(/attached as Exhibit A and incorporated by reference/g) || []).length, 2,
       '⚠ §1.1 says it on both standard-form arms');
    has(fn('probateAgreementHtml'), 'Exhibit A',
        '⚠ and the estate form still names it too — it never carried a trailing block, so both forms '
        + 'now end the same way');
    has(fn('buildSigningPacketHtml'), 'Incorporated by reference into the Agreement as Exhibit A',
        '⚠ the packet’s own band is where the heading lives now');
  }

  group('⚠⚠ THE AMATEURISH TOP BANNER IS OFF BOTH FORMS');
  {
    // Anthony, off a real envelope: *"the top banner is not needed and sounds amateurish."* Both
    // halves of it are said better further down — the signature page states that no work begins
    // until both signatures are obtained, and §18 / the estate acknowledgment carry the
    // read-and-understood line. A box at the top shouting READ CAREFULLY says neither.
    ['agreementHtml', 'probateAgreementHtml'].forEach(function (f) {
      lacks(fn(f), 'IMPORTANT: Read carefully',
            '⚠ ' + f + ' no longer opens with the banner');
    });
    has(fn('probateAgreementHtml'), 'No work will begin until both signatures are obtained',
        '⚠ and the estate form still says it where it belongs — on the signature page');
  }

  group('⚠⚠ PAGINATION — the exhibit and the signature page each start a fresh page');
  {
    // ⚠⚠ THE BASE STYLESHEET IS THE LOAD-BEARING SITE, NOT THE PRINT BLOCK. `_exportDoc` inlines
    // every <style> block in the page into the html it hands to `htmlToPdf`, and that PDF is what
    // the DocuSign envelope carries — so a rule declared only inside @media print would paginate
    // the Print button and do nothing to the document a client actually signs.
    const styleBlock = src.slice(src.indexOf('<style'), src.indexOf('</style>'));
    ['.packet-exhibit{break-before:page;page-break-before:always;}',
     '.agr-sig-page{break-before:page;page-break-before:always;}'].forEach(function (rule) {
      has(styleBlock, rule, '⚠ ' + rule.split('{')[0] + ' is declared in the BASE stylesheet');
      eq((src.match(new RegExp(rule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 3,
         '⚠ ' + rule.split('{')[0] + ' is declared at all THREE sites — base stylesheet, @media print '
         + 'and the agreement’s pdfCss — which is the pattern .packet-exhibit already followed');
    });
    has(src, "pdfCss: '.ce-page{max-width:800px;margin:0 auto;}",
        'and the agreement kind carries its own pdfCss');
    ['.packet-exhibit', '.agr-sig-page'].forEach(function (cls) {
      const line = src.slice(src.indexOf("pdfCss: '.ce-page{max-width:800px"));
      has(line.slice(0, line.indexOf('\n')), cls + '{break-before:page;page-break-before:always;}',
          '⚠ ' + cls + ' rides the pdfCss too, so the packet paginates on the send path as well');
    });
    // ⚠⚠ NO break-inside:avoid ON THE SIGNATURE PAGE, AND THAT IS MEASURED RATHER THAN GUESSED:
    // the probate block renders ~756px tall against ~893px of usable Letter page, so it fits — but
    // it is close enough that a renderer asked to keep it whole has nowhere to go if a longer
    // executor name or role pushes it over. The break-BEFORE is what Anthony asked for; keeping it
    // whole is not something the page can promise.
    lacks(src, '.agr-sig-page{break-before:page;page-break-before:always;break-inside:avoid',
          '⚠ the signature page starts a page; it does not also demand to be unbreakable');
  }
};
