'use strict';
// The signing packet (2026-09-08). Both agreement forms incorporate the Estimate as Exhibit A
// and the estate form says the agreement is not valid without it, yet the app filed them as
// two documents in two subfolders. Anthony: "build the combined signing packet." One document:
// the agreement, then the APPROVED client estimate on a new page under an Exhibit A band.

const { sandbox, fn, source } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
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
    has(print, 'ensureAgreementApproved(currentAgrJobId)', 'same gate as printAgreement');
    has(print, '_printDocument(html)', 'routes through the ONE print path — no hand-rolled print sequence');
    lacks(print, 'window.print()', 'and does not call window.print itself');
    has(print, "'-Signing-Packet'", 'the PDF is named as a packet');
    const exp = fn('exportSigningPacketToDrive');
    has(exp, "resolveSubfolderId(job, 'Agreement'", 'filed to the Agreement subfolder beside the agreement');
    has(exp, "'_Signing_Packet.html'", 'under the packet name');
    // ⚠ It used to fire inside the agreement's PIN handler. The PIN is gone, so the
    // filing moved to `ensureAgreementApproved` — the one place the approval is stamped.
    has(fn('ensureAgreementApproved'), 'exportSigningPacketToDrive(jobId)', 'and it fires when the approval is stamped');
    has(fn('ensureAgreementApproved'), 'exportAgreementToDrive(jobId)', 'alongside the agreement itself');
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

  group('no bracketed instruction survives on a signing document');
  {
    const agr = fn('agreementHtml');
    lacks(agr, '[Attach the approved Service Estimate', 'the Exhibit A block is a statement, not a note-to-self');
    has(agr, 'is attached to this Agreement as Exhibit A. Its date, line-item breakdown, payment schedule, and total fees are incorporated', 'and it says the estimate is attached, which the packet makes true');
  }

  group('print CSS');
  {
    has(src, '.packet-exhibit{break-before:page;page-break-before:always;}', 'the exhibit starts a new page');
  }
};
