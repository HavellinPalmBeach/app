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
    has(fn('renderAgreement'), 'var est = approvedEstimateFor(jobId) ||', 'standard form reads the approved snapshot first');
    has(fn('renderProbateAgreement'), 'var est = approvedEstimateFor(jobId) ||', 'estate form too');
    const agr = fn('renderAgreement');
    eq((agr.match(/attached as Exhibit A and incorporated by reference/g) || []).length, 2,
       '§1.1 on both standard-form arms says the Estimate is ATTACHED, because now it is');
  }

  group('the print and the filing');
  {
    const print = fn('printSigningPacket');
    has(print, "if (!agrApproved) { alert('Agreement must be approved before printing.'); return; }", 'same gate as printAgreement');
    has(print, '_printDocument(html)', 'routes through the ONE print path — no hand-rolled print sequence');
    lacks(print, 'window.print()', 'and does not call window.print itself');
    has(print, "'-Signing-Packet'", 'the PDF is named as a packet');
    const exp = fn('exportSigningPacketToDrive');
    has(exp, "resolveSubfolderId(job, 'Agreement'", 'filed to the Agreement subfolder beside the agreement');
    has(exp, "'_Signing_Packet.html'", 'under the packet name');
    has(src, 'setTimeout(function(){ exportSigningPacketToDrive(currentAgrJobId); }, 900);', 'and it fires on agreement approval');
    const est = fn('_approvedEstimateHtml');
    has(est, 'finally {', 'the estimate tab is restored whatever the renderer does');
    has(est, 'el.innerHTML = keep.html;', 'including its HTML');
    has(est, 'updateApprovalUI();', 'and its approval UI');
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

  group('print CSS');
  {
    has(src, '.packet-exhibit{break-before:page;page-break-before:always;}', 'the exhibit starts a new page');
  }
};
