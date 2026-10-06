'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// ⚠⚠ ONCE THE SIGNING PACKET IS OUT, NOTHING RE-PRICES THE ESTIMATE — AND A WON CLIENT STAYS WON
// (2026-09-29, the follow-up to the document-claims build).
//
// Two things Anthony asked in one message: "yes, withdraw Edit estimate once the packet is sent. if
// we are offering a discount, and therefore it is 'pending' how is it also 'won'?"
//
//   1. Edit estimate was the second door into a price change. Offer discount had been withdrawn once
//      the packet went out; Edit estimate went on being offered until the SIGNATURE, on the rail's
//      document tray and the strip at its foot, and `dashEditEstimate` checked nothing at all — so on
//      a job whose packet (or live DocuSign envelope) sat with the client, one press un-approved the
//      estimate AND the agreement under an Exhibit A the client was being asked to sign.
//      `priceChangeBlocker` is the one rule both doors read now.
//
//   2. The status line is one string carrying two facts: the estimate's phase before the client's
//      yes, the job's stage after it. Six estimate writes put the estimate's phase over it whatever
//      the job had reached, so a WON client offered a discount read "Pending Approval", then
//      "Approved — Awaiting Client" once the manager re-approved, or "New" after a deny — while
//      `job.won` stayed true and everything else went on reading it as won. `estimateEventStatus`
//      is the one rule for those writes; `jobStatusView` is the one reading of the status.
//
// Every rule is DRIVEN on the real functions. The source reads are the nets: that no estimate write
// assigns a status of its own, and that the dashboard's header keeps no second vocabulary.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source, domStub } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const body = (sig) => {
    const from = src.indexOf('function ' + sig);
    if (from < 0) return '';
    const rest = src.slice(from + 10);
    const end = rest.indexOf('\nfunction ');
    return end < 0 ? rest : rest.slice(0, end);
  };
  // Line-based comment strip. ⚠ NOT a /\*…\*/ regex: `accept="image/*"` in this file opens a
  // "comment" that eats ~170KB (CLAUDE.md, 2026-09-19).
  const liveBody = (sig) => body(sig).split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
  const strip = (h) => String(h || '').replace(/<[^>]+>/g, '');

  const BLK_FNS = ['priceChangeBlocker', 'discountOfferBlocker', 'estimateEditBlocker', 'isAgreementSigned', 'agreementSignature',
    'isAgreementSent', 'docSentAt', 'docKeyFor'];
  const SENT_AT = '2026-09-29T10:00:00Z';

  // ═══════════════════════════════════════════════════════════════════════════
  group('ONE rule for every door that moves the price: priceChangeBlocker');
  {
    const b = sandbox({ fns: BLK_FNS });
    eq(b.priceChangeBlocker({ id: 1 }), '', 'a job whose packet has not gone out may still change its price');
    has(b.priceChangeBlocker(null), 'could not be found', 'no job refuses');
    has(b.priceChangeBlocker({ id: 1, agrSent: true }), 'signing packet has gone to the client', 'sent (the boolean) refuses');
    has(b.priceChangeBlocker({ id: 1, docState: { agreement: { sentAt: SENT_AT } } }), 'signing packet has gone to the client',
      '⚠ and so does a DocuSign send, which writes only the RECORD (isAgreementSent, never the boolean alone)');
    has(b.priceChangeBlocker({ id: 1, agrSigned: true }), 'price is locked', 'a signed agreement refuses (legacy trio)');
    has(b.priceChangeBlocker({ id: 1, docState: { agreement: { sig: { signedOn: '2026-09-29', signedBy: 'Tripp Butler' } } } }),
      'price is locked', 'and so does the signature record');
    // Each door finishes the sentence in its own words; the RULE is not theirs.
    eq(b.discountOfferBlocker({ id: 1, agrSent: true }),
      'The signing packet has gone to the client with this price as its Exhibit A. A change now goes through a change order, not a discount.',
      'the discount door says exactly what it said before');
    eq(b.estimateEditBlocker({ id: 1, agrSent: true }),
      'The signing packet has gone to the client with this price as its Exhibit A. A change now goes through a change order, not an edit to the estimate.',
      'the edit door names itself');
    eq(b.discountOfferBlocker({ id: 1 }), '', 'the discount door is open before the packet');
    eq(b.estimateEditBlocker({ id: 1 }), '', 'and so is the edit door');
    // ⚠ The two doors cannot drift: neither wrapper holds a copy of the rule.
    ['discountOfferBlocker(job)', 'estimateEditBlocker(job)'].forEach((sig) => {
      const w = liveBody(sig);
      has(w, 'priceChangeBlocker(job,', sig + ' asks the shared rule');
      lacks(w, 'isAgreementSent', sig + ' keeps no copy of the sent test');
      lacks(w, 'isAgreementSigned', sig + ' keeps no copy of the signed test');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // The rail — the same fixture shape as document-claims.test.js. Every row is swept, which is
  // exactly what the strip at the foot of the rail does (it collects the doc acts of every row
  // but the lit one), so "no row offers it" is "neither the tray nor the strip offers it".
  const RAIL = sandbox({
    fns: ['agrApprovalWithdrawn', 'jobTimeline', '_localDateOf', '_ymdLocal', 'paymentStageWord', 'finalAwaitsHours', 'estimateIsFeeOnly', 'jobTimelineNext', 'jobTimelineActions', 'esignSignedCopyGaps', 'docReadOnlyWord', 'depositVoidFlag', 'agreementHandedOverInPerson',
      'estimateSubmitBlocker', 'jobStageDoc', 'docReadiness', 'docDraftOnly', 'docTitle', 'docWord', '_jtDocSecondaries',
      'docPreviewOnly', 'agreementReady', 'isJobWon', 'estimateNoteGaps', 'paymentSplit', 'unscoredRoomNames',
      'jobActivationBlockers', 'jobOnProbateTrack', 'matterDef', 'estimateContractBlocker', 'estimateContractMissing', 'isDecedentJob', 'invFiduciaryMode',
      'matterTypeOf', 'svcHasDocStep', 'docTierOf', 'docTierDef', 'isJobFunded', 'jobPayments', 'stagePaidTotal', 'paymentCounts', 'paymentLive', 'isRefundRecord',
      'depositPaidTotal', 'depositTargetFor', 'esignProviderKey', 'esignAvailable', 'esignJobWatches',
      '_jtSendAction', '_jtDocViews', '_jtDraftLink', '_jtDriveLink', 'jtDraftLine', 'staleDraftNote', 'staleDraftsOf', 'draftIsStale', 'draftOutstanding', 'staleDocName', '_draftDay', '_andJoin', 'estimateOutForApproval', 'priceAboveSent', 'docDraftPending', 'fmt', 'priceAboveAcceptance', '_approvedPriceAbove', 'estimateTierMoved', 'docTierScope', 'seedDocScopeFromJob', 'estimateDocScope', 'docScopeDef', 'docTierWord', 'docScopeWord', 'finalCrewOnlyWarn', 'roundCents', 'fmtHrs', 'estateAuthority'].concat(BLK_FNS),
    vars: ['JT_SHORT', 'JT_NEXT', 'AGR_SIG_METHODS', 'ESIGN_PROVIDERS', 'ESIGN_PROVIDER_KEY', 'JT_ROW_DOC', 'DOC_READY_WHY',
      'DOC_KIND_WORD', 'DOC_STAGE_WORD', 'DOC_ACTIONS', 'ESTIMATE_CONTRACT_FIELDS', 'MATTER_TYPES', 'DOC_TIERS',
      'DOC_TIER_FROM_SCOPE', 'DECEDENT_SERVICES', 'JOB_STEPS', 'currentInvStage'],
    stubs: { REQUIRE_WALKTHROUGH_NOTES: false, SHEETS_SYNC_URL: 'https://script.google.com/macros/s/x/exec' },
  });
  const room = (name) => ({ name, vol: 3, cplx: 3, note: 'seen' });
  function railActs(jobO, recO) {
    const job = Object.assign({ id: 7, name: 'Butler', created: 'Sep 8, 2026', svc: 'cleanout', status: 'won', won: true,
      walkthrough: '2020-01-01', approved: true, estimateSentDate: 'September 9, 2026', agrApproved: true }, jobO || {});
    const rec = Object.assign({ estimate: { rooms: [room('Kitchen'), room('Primary Bedroom')], havellinTotal: 24100, collections: [] },
      savedAt: 1, approved: true, submitted: false }, recO || {});
    RAIL.estimateStore = { 7: rec }; RAIL.jobs = [job];
    const out = [];
    RAIL.jobTimeline(job, rec, [], []).forEach((r) => {
      const a = RAIL.jobTimelineActions(r, job, rec);
      a.secondary.concat(a.doc ? a.doc.acts : []).concat(a.primary ? [a.primary] : [])
        .forEach((x) => out.push({ row: r.key, label: x.label, call: x.call }));
    });
    return out;
  }
  const editsOn = (acts) => acts.filter((x) => /dashEditEstimate/.test(x.call));
  const discOn = (acts) => acts.filter((x) => /dashOfferDiscount/.test(x.call));

  group('the rail: Edit estimate is offered until the packet goes out, and withdrawn after — like Offer discount');
  {
    const before = railActs();
    ok(editsOn(before).length >= 1, 'offered on a won job whose packet has not gone out (' + editsOn(before).map((x) => x.row).join(', ') + ')');
    ok(editsOn(before).every((x) => x.call === 'dashEditEstimate(7)'), 'through the un-approving door, never the navigate-only one');
    ok(discOn(before).length === 1, 'Offer discount is offered beside it');
    const sent = railActs({ agrSent: true, docState: { agreement: { sentAt: SENT_AT } } });
    eq(editsOn(sent).length, 0, '⚠⚠ withdrawn on EVERY row once the packet has been sent — the tray and the strip alike');
    eq(discOn(sent).length, 0, 'the same moment Offer discount goes');
    eq(editsOn(railActs({ docState: { agreement: { sentAt: SENT_AT } } })).length, 0,
      '⚠ including a DocuSign send, which writes only the record');
    eq(editsOn(railActs({ agrSent: true, agrSigned: true })).length, 0, 'and on a signed agreement, as before');
    // ⚠ The preview packet before the client's yes is NOT a send: a job still at approved (not won)
    // whose agreement has only been READ keeps its edit door.
    const notWon = railActs({ status: 'approved', won: undefined, agrApproved: false });
    ok(editsOn(notWon).length >= 1, 'a job the client has not accepted yet keeps it (the preview packet is not a send)');
    // View is never withdrawn — reading a document already sent is always safe.
    ok(sent.some((x) => /docAction\(7, *'estimate', *'view'/.test(x.call) || /View/.test(x.label)),
      'viewing the estimate stays on the rail after the packet goes out');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the dashboard door refuses, and writes nothing — including on a SIGNED agreement it never checked');
  function editBed(jobO, recO) {
    const said = { notices: [], nav: [], redraw: 0, badges: [] };
    const E = sandbox({
      fns: ['dashEditEstimate', 'revokeEstimateApproval', 'revokeAgreementApproval', 'estimateEventStatus', 'isJobWon', 'notePriceChange', 'draftIsStale', 'draftOutstanding', 'outstandingDrafts', 'docState', '_jobTouch', 'docDraftPending', 'estimateOutForApproval'].concat(BLK_FNS),
      vars: ['_packetExported', 'currentAgrJobId', 'estimateApproved',
        'estimateSubmitted', 'discountRevision', 'approvedBy', 'approvedAt', 'ESTIMATE_OUT_FOR_APPROVAL_TXT'],
      stubs: {
        _primeEstimateFor(id) { E.currentEstimate = Object.assign({ jobId: id, lockedRooms: [1] }, (E.estimateStore[id] || {}).estimate || {}); return true; },
        saveJobs() {}, syncJobToSheets() {}, saveEstimateState() {}, showSyncBadge(m) { said.badges.push(m); },
        dashNotice(k, m) { said.notices.push({ k, m }); }, _dashRedraw() { said.redraw++; },
        dashGoEstimate(id) { said.nav.push(id); },
      },
    });
    E.jobs = [Object.assign({ id: 7, won: true, status: 'won', approved: true, agrApproved: true, agrApprovedBy: 'Anthony Graziano',
      estimateDriveAt: 'T' }, jobO || {})];
    E.estimateStore = { 7: Object.assign({ approved: true, submitted: false, estimate: { jobId: 7 } }, recO || {}) };
    E.estimateApproved = true;
    E._packetExported = { 7: 'k' };
    return { E, said, job: E.jobs[0] };
  }
  {
    const { E, said, job } = editBed({ agrSent: true, docState: { agreement: { sentAt: SENT_AT } } });
    E.dashEditEstimate(7);
    eq(said.nav.length, 0, '⚠⚠ it does not land on Build Estimate');
    eq(E.estimateStore[7].approved, true, 'the estimate stays approved');
    eq(job.approved, true, 'and so does the job flag');
    eq(job.agrApproved, true, '⚠ and the agreement — its Exhibit A is in the client’s hands');
    eq(job.estimateDriveAt, 'T', 'the Drive stamp is untouched');
    ok('7' in E._packetExported, 'and the packet’s filing guard');
    eq(E.estimateApproved, true, 'the global the lock reads is untouched');
    ok(said.notices.length === 1 && said.notices[0].k === 'warn', 'one refusal, where the person is');
    has((said.notices[0] || {}).m, 'not an edit to the estimate', 'naming the door');
    has((said.notices[0] || {}).m, 'change order', 'and the route that remains');
    eq(said.badges.length, 0, 'no "agreement approval revoked" badge, because nothing was revoked');
  }
  {
    // The handler used to check NOTHING — a signed agreement was protected only by the button being hidden.
    const { E, said, job } = editBed({ agrSent: true, agrSigned: true });
    E.dashEditEstimate(7);
    eq(said.nav.length, 0, '⚠ a SIGNED agreement’s estimate is refused at the door too');
    eq(E.estimateStore[7].approved, true, 'and stays approved');
    eq(job.agrApproved, true, 'with its agreement');
    has((said.notices[0] || {}).m, 'price is locked', 'naming the signature');
  }
  {
    // The converse: before the packet, the door works exactly as it did.
    const { E, said, job } = editBed();
    E.dashEditEstimate(7);
    eq(said.nav, [7], 'before the packet it still opens Build Estimate');
    eq(E.estimateStore[7].approved, false, 'having un-approved the estimate first');
    eq(job.agrApproved, false, 'and withdrawn the agreement, whose Exhibit A is about to change');
    eq(said.notices.length, 0, 'with no refusal');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the Client Estimate panel’s door refuses too — its button may have been drawn before the packet went out');
  function ceBed(jobO) {
    const said = { fb: [], nav: [] };
    const C = sandbox({
      fns: ['editEstimateFromCE', 'revokeEstimateApproval', 'revokeAgreementApproval', 'estimateEventStatus', 'isJobWon',
        '_dashFbTarget', '_jobBandHost', 'notePriceChange', 'draftIsStale', 'draftOutstanding', 'outstandingDrafts', 'docState', '_jobTouch', 'docDraftPending', 'estimateOutForApproval'].concat(BLK_FNS),
      vars: ['_packetExported', 'currentAgrJobId', 'estimateApproved',
        'estimateSubmitted', 'discountRevision', 'approvedBy', 'approvedAt', '_dashboardJobId', 'ESTIMATE_OUT_FOR_APPROVAL_TXT'],
      stubs: {
        saveJobs() {}, syncJobToSheets() {}, saveEstimateState() {}, showSyncBadge() {},
        showFB(el, k, m) { said.fb.push({ el, k, m }); }, editEstimateForJob(id) { said.nav.push(id); },
      },
    });
    C.jobs = [Object.assign({ id: 7, won: true, status: 'won', approved: true, agrApproved: true }, jobO || {})];
    C.estimateStore = { 7: { approved: true, submitted: false } };
    C.currentEstimate = { jobId: 7, lockedRooms: [1], lockedAt: 'T' };
    C.estimateApproved = true; C.approvedBy = 'Anthony Graziano';
    return { C, said, job: C.jobs[0] };
  }
  {
    const { C, said, job } = ceBed({ agrSent: true });
    C.editEstimateFromCE();
    eq(said.nav.length, 0, '⚠ it does not open the estimate for editing');
    eq(C.estimateApproved, true, 'nothing reset — the approval global');
    eq(C.approvedBy, 'Anthony Graziano', 'the approver');
    ok(!!C.currentEstimate.lockedRooms, 'the frozen walkthrough snapshot');
    eq(C.estimateStore[7].approved, true, 'the store');
    eq(job.agrApproved, true, 'and the agreement');
    ok(said.fb.length === 1 && said.fb[0].k === 'warn', 'one refusal');
    has((said.fb[0] || {}).m, 'not an edit to the estimate', 'in the edit door’s words');
  }
  {
    const { C, said } = ceBed();
    C.editEstimateFromCE();
    eq(said.nav, [7], 'before the packet it opens the estimate for editing, as before');
    eq(C.estimateApproved, false, 'un-approved');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the panel’s own button and its words follow the same rule (updateApprovalUI, driven)');
  function uiBed(jobO, noJob) {
    const d = domStub({});
    const U = sandbox({
      fns: ['updateApprovalUI', 'roundCents', 'fmt'].concat(BLK_FNS),
      vars: ['estimateApproved', 'estimateSubmitted', 'discountRevision', 'approvedBy', 'approvedAt'],
      stubs: {
        document: d, applyEstimateLock() {}, _paintDriveEstBtn() {}, buildEstimateMailto() { return 'mailto:x'; },
        _driveStampText() { return ''; },
      },
    });
    U.jobs = noJob ? [] : [Object.assign({ id: 7, won: true, status: 'won', approved: true, agrApproved: true,
      estimateSentDate: 'September 9, 2026', estimateDriveAt: 'T' }, jobO || {})];
    U.currentEstimate = { jobId: 7, havellinTotal: 24100 };
    U.estimateApproved = true; U.approvedBy = 'Anthony Graziano'; U.approvedAt = 'September 8, 2026';
    U.updateApprovalUI();
    return {
      edit: d.getElementById('btn-edit-est').style.display, disc: d.getElementById('btn-offer-discount').style.display,
      sub: d.getElementById('ce-subtitle').textContent, banner: strip(d.getElementById('approval-banner-wrap').innerHTML),
    };
  }
  {
    const open = uiBed();
    eq(open.edit, 'inline-block', 'before the packet the panel offers Edit Estimate');
    eq(open.disc, 'inline-block', 'and Offer Discount');
    has(open.banner, 'Edit to revise or use Offer Discount', 'and says so');
    const out = uiBed({ agrSent: true, docState: { agreement: { sentAt: SENT_AT } } });
    eq(out.edit, 'none', '⚠⚠ once the packet is out the panel’s Edit Estimate is withdrawn');
    eq(out.disc, 'none', 'with Offer Discount');
    has(out.sub, 'the signing packet is with the client', 'the subtitle says why');
    lacks(out.sub, 'Edit to revise', 'and no longer tells anyone to edit');
    has(out.banner, 'Change Order', 'the banner names the route that remains');
    lacks(out.banner, 'Edit to revise', 'and offers no edit');
    // An approved estimate never marked as sent, with the packet out anyway (the packet does not wait on it).
    const unsentEst = uiBed({ estimateSentDate: '', agrSent: true });
    eq(unsentEst.edit, 'none', 'withdrawn on an estimate never marked sent, too — the packet is what matters');
    has(unsentEst.sub, 'signing packet is with the client', 'and its subtitle says so');
    lacks(unsentEst.sub, 'Edit if you still need changes', 'rather than inviting an edit');
    has(unsentEst.banner, 'The signing packet has gone to the client — revise via a Change Order', 'and its banner names the route');
    lacks(uiBed({ estimateSentDate: '' }).banner, 'signing packet has gone', 'which an estimate whose packet is still to go does not say');
    const signed = uiBed({ agrSent: true, agrSigned: true });
    eq(signed.edit, 'none', 'withdrawn on a signed agreement, as before');
    has(signed.sub, 'under signed agreement', 'with the signed wording');
    // A job dropped on another device while its estimate is open here: the blocker refuses ("could not
    // be found"), and that must not be read as a packet having gone out.
    const gone = uiBed({}, true);
    lacks(gone.sub, 'signing packet', '⚠ a job missing from this device is never said to have a packet out');
    lacks(gone.banner, 'signing packet has gone', 'nor in the banner');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('Build Estimate’s lock banner stops offering the two withdrawn buttons (applyEstimateLock, driven)');
  function lockBanner(jobO, noJob) {
    const d = domStub({});
    const L = sandbox({
      fns: ['applyEstimateLock'].concat(BLK_FNS),
      vars: ['estimateApproved', 'estimateSubmitted'],
      stubs: { document: d, startApprovalWatch() {}, stopApprovalWatch() {} },
    });
    L.jobs = noJob ? [] : [Object.assign({ id: 7, won: true, status: 'won', approved: true }, jobO || {})];
    L.currentEstimate = { jobId: 7 };
    L.estimateApproved = true;
    L.applyEstimateLock();
    return strip(d.getElementById('est-approved-banner').innerHTML);
  }
  {
    const open = lockBanner();
    has(open, 'Still negotiable', 'before the packet the banner says the price may still move');
    has(open, 'once the signing packet has gone out', '⚠ and the change-order threshold is the PACKET now, not the signature');
    lacks(open, 'only needed once the agreement is signed', 'the sentence that went false with the discount build is gone');
    const out = lockBanner({ agrSent: true });
    has(out, 'Signing Packet Sent', '⚠⚠ once it is out the banner says so');
    lacks(out, 'Still negotiable', 'and no longer sends anyone looking for two buttons that are not there');
    lacks(out, 'Offer Discount', 'no Offer Discount');
    has(out, 'Change Order', 'the route that remains');
    has(lockBanner({ docState: { agreement: { sentAt: SENT_AT } } }), 'Signing Packet Sent', 'a DocuSign send reads the same');
    has(lockBanner({ agrSent: true, agrSigned: true }), 'Under Signed Agreement', 'a signed one keeps its own wording');
    lacks(lockBanner({}, true), 'Signing Packet Sent', '⚠ a job missing from this device is not said to have a packet out');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('Reset’s refusal on an approved estimate names the route that exists (resetEstimate, driven)');
  // Found merging the concurrent Reset build with this one: its refusal told the reader to press Edit
  // estimate on the timeline — the button this build withdraws once the packet is out.
  function resetRefusal(jobO, opts) {
    opts = opts || {};
    const said = [];
    const d = domStub({ 'e-job': { value: '7' } });
    const R = sandbox({
      fns: ['resetEstimate'].concat(BLK_FNS),
      vars: ['estimateApproved', 'estimateSubmitted'],
      stubs: { document: d, showFB(id, kind, msg) { said.push(kind + ':' + msg); }, confirm() { said.push('ASKED'); return true; },
        resetEstimateJobState() { said.push('CLEARED'); }, clearEstimateScratch() { said.push('SCRATCH'); } },
    });
    R.jobs = opts.noJob ? [] : [Object.assign({ id: 7, won: true, status: 'won', approved: true }, jobO || {})];
    R.currentEstimate = null;   // the job is the screen's binding (e-job), as the reset itself reads it
    R.estimateApproved = !opts.submitted;
    R.estimateSubmitted = !!opts.submitted;
    try { R.resetEstimate(); } catch (e) { said.push('THREW:' + e.message); }
    return said;
  }
  {
    const open = resetRefusal();
    eq(open.length, 1, 'before the packet: one refusal, nothing asked, nothing cleared');
    has(open[0] || '', 'Edit estimate on the client', 'and it still sends the reader to Edit estimate, which is there');
    [['the packet emailed (the boolean)', { agrSent: true }], ['DocuSign’s record alone', { docState: { agreement: { sentAt: SENT_AT } } }]]
      .forEach(([how, o]) => {
        const s = resetRefusal(o);
        eq(s.length, 1, '⚠⚠ ' + how + ': one refusal, nothing asked, nothing cleared');
        lacks(s[0] || '', 'Edit estimate', how + ': it no longer names the button this build withdraws');
        has(s[0] || '', 'signing packet has gone to the client', how + ': it says why');
        has(s[0] || '', 'change order', how + ': and names the route that remains');
      });
    const signed = resetRefusal({ agrSent: true, agrSigned: true });
    lacks(signed[0] || '', 'Edit estimate', 'a signed agreement names no Edit estimate either');
    has(signed[0] || '', 'price is locked', 'it says the price is locked');
    const missing = resetRefusal({}, { noJob: true });
    eq(missing.length, 1, 'a job missing from this device: one refusal');
    lacks(missing[0] || '', 'signing packet', '⚠ and it is never said to have a packet out');
    has(missing[0] || '', 'could not be found', 'it says the job is not here');
    lacks(missing[0] || '', 'timeline', 'and does not send the reader to a timeline this device does not have');
    has(resetRefusal({ agrSent: true }, { submitted: true })[0] || '', 'out for manager approval',
      'out for approval keeps its own sentence, whatever the packet');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the net: any code that tells somebody to press Edit estimate asks the rule first');
  {
    // The shape this build keeps finding: a sentence naming a control is only true while the control is
    // offered. So every top-level function whose LIVE code names Edit estimate must ask estimateEditBlocker.
    const re = /\nfunction ([A-Za-z0-9_$]+)\(/g;
    let m; const starts = [];
    while ((m = re.exec(src))) starts.push({ name: m[1], at: m.index });
    const naming = [];
    starts.forEach((s, i) => {
      const end = i + 1 < starts.length ? starts[i + 1].at : src.length;
      const b = src.slice(s.at, end).split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
      if (/Edit estimate/i.test(b)) naming.push({ name: s.name, asks: b.indexOf('estimateEditBlocker(') >= 0 });
    });
    ok(naming.length >= 3, 'the net finds the functions that name Edit estimate (' + naming.map((n) => n.name).join(', ') + ')');
    naming.forEach((n) => ok(n.asks, n.name + ' names Edit estimate and asks estimateEditBlocker'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('estimateEventStatus: the ONE rule for what an estimate event leaves the status at');
  {
    const S = sandbox({ fns: ['estimateEventStatus', 'isJobWon'] });
    const st = (job, next) => S.estimateEventStatus(job, next);
    // Before the client's yes, the estimate's phase IS the status — exactly as it always was.
    [['new', 'pending'], ['pending', 'approved'], ['pending', 'new'], ['approved', 'pending'], ['approved', 'new'], ['', 'new']]
      .forEach(([from, next]) => eq(st({ status: from }, next), next, 'not won: ' + (from || '(blank)') + ' → ' + next));
    eq(st({ status: 'lost', won: false }, 'pending'), 'pending', 'a LOST client coming back through a revised estimate is unchanged');
    // After the yes: the one estimate state worth a status is a revised price waiting on the manager.
    eq(st({ status: 'won', won: true }, 'pending'), 'pending', 'won + submitted/discounted → pending (the manager’s worklist)');
    ['approved', 'new'].forEach((next) =>
      eq(st({ status: 'pending', won: true }, next), 'won', '⚠⚠ won + ' + next + ' → won, never a pre-won phase'));
    eq(st({ status: 'won', won: true }, 'won'), 'won', 'won + a save → won');
    eq(st({ status: 'approved', won: true }, 'new'), 'won', 'a won job an older build knocked back is returned to won by the next event');
    // Past won, an estimate event never moves the job at all.
    ['active', 'closed', 'closed_retained'].forEach((s) => ['pending', 'approved', 'new'].forEach((next) =>
      eq(st({ status: s, won: true }, next), s, s + ' is never moved by an estimate event (' + next + ')')));
    eq(st({ status: 'active' }, 'approved'), 'active', 'a legacy active job with no won flag is spared, as checkPin always spared it');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ the won client, driven end to end: discount → re-approval → deny → resubmit → edit');
  const ST_FNS = ['discountPreview', 'estPreDiscountTotal', 'discountOnLabor', 'applyDiscountRevision', 'discountPctInput',
    '_discountModalSays', 'revokeAgreementApproval', '_dashFbTarget', '_jobBandHost', '_dashRedraw', 'estFixedFee',
    'estPrepFeeOnTop', 'closeDiscountModal', 'dashNotice', 'notifyManagerForApproval', 'checkPin', 'estimateApprovalTierBlocker', 'resolvePin',
    'unscoredRoomNames', 'estimateContractBlocker', 'estimateContractMissing', 'isDecedentJob', 'svcHasDocStep', 'matterTypeOf',
    'docTierOf', 'docTierDef', 'buildLockSnapshot', 'submitDeny', 'isJobWon', '_jobStatusCell', 'jobStatusView',
    'estimateEventStatus', 'submitForApproval', 'estimateSubmitBlocker', 'estimateNoteGaps', 'editEstimateFromCE',
    'revokeEstimateApproval', 'notePriceChange', 'draftIsStale', 'draftOutstanding', 'outstandingDrafts', 'docState', '_jobTouch', 'staleDraftNote', 'staleDraftsOf', 'staleDocName', '_draftDay', '_andJoin', 'staleDraftNotice', '_docNotice', 'priceAboveAcceptance', '_approvedPriceAbove', 'docDraftPending', 'estimateOutForApproval', 'priceRaiseSentence', 'priceAboveSent', 'fmt', 'estFixedLines', 'discountOnFixedFee', 'fixedDiscountBasisWords', 'estimateTierMoved', 'docTierScope', 'seedDocScopeFromJob', 'estimateDocScope', 'docScopeDef', 'docTierWord', 'docScopeWord', 'roundCents', 'fmtHrs'].concat(BLK_FNS);
  const ST_VARS = ['MAX_DISCOUNT_PCT', 'RUSH_PCT', '_dashboardJobId', '_packetExported', 'currentAgrJobId', '_dashNotice', 'currentInvStage', 'estimateApproved', 'estimateSubmitted',
    'discountRevision', 'approvedBy', 'approvedAt', 'MANAGER_PINS', 'JOB_STATUS_LABELS', 'JOB_STATUS_DOT',
    'ESTIMATE_CONTRACT_FIELDS', 'MATTER_TYPES', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'DECEDENT_SERVICES', 'JOB_STEPS', '_dashShown', '_dashKeepNotice', 'ESTIMATE_OUT_FOR_APPROVAL_TXT'];
  function lifeBed(jobO) {
    const doc = domStub({ 'dm-pct': '5', 'pin-input': '3010', 'deny-reason': 'Go back to the client first', 'deny-pin': '3010' });
    const ctx = sandbox({ fns: ST_FNS, vars: ST_VARS, stubs: {
      document: doc, REQUIRE_WALKTHROUGH_NOTES: false,
      saveJobs() {}, syncJobToSheets() {}, saveEstimateState() {}, renderClientEstimate() {}, updateApprovalUI() {},
      applyEstimateLock() {}, showFB() {}, showSyncBadge() {}, assignedTCContact() { return { name: 'Ashley Jerome' }; },
      svcLabelOf() { return 'Home Editing'; }, sendInternalEmail() {}, MANAGER_APPROVAL_EMAIL: 'a@example.com',
      renderClientDashboard() {}, _repaintJobBand() {}, setTimeout() {}, closePinModal() {}, closeDenyModal() {},
      notifyTCOfDecision() {}, exportEstimateToDrive() {}, saveFolderEstimate() {}, uploadWalkthroughNotesToDrive() {},
      editEstimateForJob() {}, confirm() { return true; },
    } });
    ctx.jobs = [Object.assign({ id: 1, name: 'Butler', svc: 'downsizing', status: 'won', won: true, wonAt: '2026-09-20',
      approved: true, agrApproved: false }, jobO || {})];
    ctx.currentEstimate = { jobId: 1, tcFee: 12000, psFee: 8000, havellinTotalFull: 20000, rush: false, rushAmt: 0,
      discountPct: 0, discountAmt: 0, havellinTotal: 20000, grandTotal: 20000, fixedPrice: false,
      rooms: [{ name: 'Kitchen', vol: 3, cplx: 3, note: 'x' }] };
    ctx.estimateApproved = true;
    return { ctx, job: ctx.jobs[0] };
  }
  const chip = (ctx, job) => strip(ctx._jobStatusCell(job));
  {
    const { ctx, job } = lifeBed();
    eq(chip(ctx, job), 'Won', 'a won client reads Won');
    ctx.applyDiscountRevision();
    eq(job.status, 'pending', 'offering a discount sends the revised price to the manager');
    eq(ctx.isJobWon(job), true, 'without un-winning the client');
    eq(chip(ctx, job), 'Won · Pending Re-approval', '⚠⚠ and the list says BOTH facts — it used to say "Pending Approval" alone');
    ctx.checkPin();
    eq(job.status, 'won', '⚠⚠ the manager’s re-approval returns it to won');
    eq(chip(ctx, job), 'Won', 'never "Approved — Awaiting Client", on a client who had already said yes');
    eq(job.approved, true, 'the estimate is approved again');
    // A deny instead.
    ctx.applyDiscountRevision();
    ctx.estimateApproved = false; ctx.estimateSubmitted = true;
    ctx.submitDeny();
    eq(job.status, 'won', '⚠ a DENY leaves the won client won — it used to read "New"');
    eq(job.approved, false, 'with the estimate back in review');
    ctx.submitForApproval({ silent: true });
    eq(job.status, 'pending', 'resubmitting waits on the manager again');
    eq(chip(ctx, job), 'Won · Pending Re-approval', 'as both facts');
    ctx.estimateSubmitted = false; ctx.estimateApproved = true; job.status = 'won';
    ctx.editEstimateFromCE();
    eq(job.status, 'won', 'an edit before the packet leaves it won');
  }
  {
    // The converse — a client who has NOT said yes walks the old path exactly.
    const { ctx, job } = lifeBed({ status: 'approved', won: undefined });
    ctx.applyDiscountRevision();
    eq(job.status, 'pending', 'not won: a discount → pending');
    eq(chip(ctx, job), 'Pending Approval', 'reading "Pending Approval", as it always did');
    ctx.checkPin();
    eq(job.status, 'approved', 'not won: re-approved → approved');
    eq(chip(ctx, job), 'Approved — Awaiting Client', 'which is true of a client who has not said yes');
    ctx.applyDiscountRevision(); ctx.estimateApproved = false; ctx.estimateSubmitted = true;
    ctx.submitDeny();
    eq(job.status, 'new', 'not won: denied → new');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('jobStatusView: ONE reading of the status, and a won job never reads as a pre-won phase');
  {
    const V = sandbox({ fns: ['jobStatusView', 'isJobWon', '_jobStatusCell', 'priceAboveAcceptance', '_approvedPriceAbove', 'isAgreementSigned', 'agreementSignature', 'isAgreementSent', 'docSentAt', 'docKeyFor', 'roundCents'], vars: ['JOB_STATUS_LABELS', 'JOB_STATUS_DOT'] });
    const v = (j) => V.jobStatusView(j);
    eq(v({ status: 'pending', won: true }).label, 'Won · Pending Re-approval', 'won + pending: both facts');
    eq(v({ status: 'pending', won: true }).key, 'pending', '⚠ keyed pending, so the manager’s Pending Approval filter still finds it');
    eq(v({ status: 'pending', won: true }).dot, 's-pending', 'with the amber dot — something is waiting on the manager');
    eq(v({ status: 'approved', won: true }).label, 'Won', '⚠ a won job an older build left at "approved" reads Won — derived, not migrated');
    eq(v({ status: 'new', won: true }).label, 'Won', 'and one left at "new"');
    eq(v({ status: 'approved', won: true }).key, 'won', 'keyed won, so it sorts with the won jobs');
    eq(v({ status: 'pending' }).label, 'Pending Approval', 'not won: pending reads as it always did');
    eq(v({ status: 'approved' }).label, 'Approved — Awaiting Client', 'not won: approved reads as it always did');
    eq(v({ status: 'active', won: true }).label, 'Active', 'active is active');
    eq(v({ status: 'closed_retained', won: true }).label, 'Closed — Deposit Retained', 'closed with the deposit is itself');
    eq(v({ status: 'lost', won: false }).label, 'Lost', 'lost is lost');
    has(V._jobStatusCell({ status: 'pending', won: true }), '<strong', 'the list cell still bolds a pending state');
    has(strip(V._jobStatusCell({ status: 'pending', won: true })), 'Won · Pending Re-approval', 'with both facts');
    eq(strip(V._jobStatusCell({ status: 'approved', won: true })), 'Won', 'and a legacy won job reads Won in the list');
  }
  {
    // The Status sort reads the same view.
    const s = sandbox({ fns: ['sortJobsForList', 'svcLabelOf', 'jobStatusView', 'isJobWon', 'priceAboveAcceptance', '_approvedPriceAbove', 'isAgreementSigned', 'agreementSignature', 'isAgreementSent', 'docSentAt', 'docKeyFor', 'roundCents'],
      vars: ['SVC_LABELS', 'SVC_ORDER', 'JOB_STATUS_ORDER', 'JOB_STATUS_LABELS', 'JOB_STATUS_DOT', 'JOB_SORTS'] });
    const list = [{ id: 1, status: 'approved', won: true, name: 'A' }, { id: 2, status: 'approved', name: 'B' },
      { id: 3, status: 'active', won: true, name: 'C' }];
    const order = s.sortJobsForList(list, 'status', 'asc').map((j) => j.id);
    eq(order, [2, 1, 3], '⚠ the legacy won job sorts with the won jobs, not with "Approved — Awaiting Client"');
  }
  {
    // The Pending Approval filter and the jobs watch still see a won job waiting on the manager.
    has(liveBody('renderJobs()'), "case 'pending': return j.status==='pending';", 'the filter reads the status');
    has(liveBody('maybeStartJobsWatch()'), "j.status === 'pending'", 'the jobs watch arms on it');
    const W = sandbox({ fns: ['maybeStartJobsWatch', 'stopJobsWatch'], vars: ['_jobsWatch'],
      stubs: { SHEETS_SYNC_URL: 'https://x', setInterval() { return 42; }, clearInterval() {}, jobsWatchTick() {} } });
    W.jobs = [{ id: 1, status: 'pending', won: true }];
    W.maybeStartJobsWatch();
    eq(W._jobsWatch.timer, 42, '⚠ a won job waiting on the manager still arms the cross-device watch — that is why it stays "pending"');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the nets: no estimate write keeps a status of its own, and the header keeps no second vocabulary');
  {
    const WRITERS = ['saveEstimateAndPreview()', 'submitForApproval(opts)', 'applyDiscountRevision()', 'editEstimateFromCE()',
      'submitDeny()', 'checkPin()'];
    WRITERS.forEach((sig) => {
      const w = liveBody(sig);
      ok(w.length > 200, sig + ' was found');
      has(w, 'estimateEventStatus(', sig + ' asks the shared rule');
      ok(!/\.status\s*=\s*'/.test(w), sig + ' assigns no status literal of its own');
      ok(!/\.status\s*=\s*\(/.test(w), sig + ' and no inline conditional status either');
    });
    const dash = liveBody('renderClientDashboard(jobId)');
    ok(dash.length > 1000, 'renderClientDashboard was found');
    lacks(dash, 'var statusLabels', 'the dashboard header no longer keeps its own status labels');
    has(dash, 'jobStatusView(job)', 'the header chip reads the shared view');
    has(liveBody('_jobStatusCell(j)'), 'jobStatusView(j)', 'so does the list cell');
    has(src, "val: function(j){ var i = JOB_STATUS_ORDER.indexOf(jobStatusView(j).key);", 'and the Status sort');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('every door that un-approves an estimate asks the rule first');
  {
    // revokeEstimateApproval is the un-approve; every caller must have asked the edit door first.
    const callers = [];
    const re = /\nfunction ([A-Za-z0-9_$]+)\(/g;
    let m; const starts = [];
    while ((m = re.exec(src))) starts.push({ name: m[1], at: m.index });
    starts.forEach((s, i) => {
      const end = i + 1 < starts.length ? starts[i + 1].at : src.length;
      const b = src.slice(s.at, end).split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
      if (s.name !== 'revokeEstimateApproval' && /revokeEstimateApproval\(/.test(b)) callers.push({ name: s.name, b });
    });
    eq(callers.map((c) => c.name).sort(), ['dashEditEstimate', 'editEstimateFromCE'], 'two doors un-approve an estimate');
    callers.forEach((c) => {
      ok(c.b.indexOf('estimateEditBlocker(') >= 0 && c.b.indexOf('estimateEditBlocker(') < c.b.indexOf('revokeEstimateApproval('),
        c.name + ' asks estimateEditBlocker before it revokes');
    });
    has(liveBody('jobTimelineActions(row, job, estRec)'), "_d.kind === 'estimate' && !estimateEditBlocker(job)",
      'the rail’s tray asks the same rule');
    lacks(liveBody('jobTimelineActions(row, job, estRec)'), "_d.kind === 'estimate' && !job.agrSigned", 'not the signature alone');
  }
};
