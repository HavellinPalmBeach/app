'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// ⚠⚠ WHAT A CLIENT DOCUMENT CLAIMS, AND THE DOORS THAT CHANGE A PRICE ONCE IT IS OUT
// (2026-09-29, off the 2026-09-28 workflow audit: H6, M3, the document lows, Q8 and Q11).
//
// document-reconciliation.test.js asserts the arithmetic across a matrix — every document's rows
// reach its own totals. This file asserts the individual rules that arithmetic cannot see: what a
// rush line may say, which numbers the discount box accepts, which doors refuse a discount once the
// signing packet is out, what the agreement says about the premium and the discount, that a credit
// is emailed as a credit, and that the packet can be READ before the client's yes and nothing else.
// Every rule is driven on the real function; the source reads are only where the rule is a line
// in a function this harness cannot drive (calcAll).
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
  const live = src.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
  ok(live.length > src.length * 0.5, 'the comment strip did not eat the file');
  const liveBody = (sig) => body(sig).split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

  // ═══════════════════════════════════════════════════════════════════════════
  group('H6 — the rush line is priority scheduling, and names added crew only when there is some');
  {
    const r = sandbox({ fns: ['rushCrewAdded', 'rushScopeLine'] });
    const PLAIN = 'Priority scheduling to meet the timeline you requested';
    eq(r.rushScopeLine({}), PLAIN, 'an ordinary rush estimate says priority scheduling and nothing about crew');
    eq(r.rushScopeLine(null), PLAIN, 'no estimate still names what the premium is');
    eq(r.rushScopeLine({ needsTC2: true }), PLAIN + ', with a second Transition Concierge working in parallel',
       'a second concierge is named when the estimate staffs one');
    eq(r.rushScopeLine({ preparedBy2: 'Ashley Jerome' }), PLAIN + ', with a second Transition Concierge working in parallel',
       'and an older record naming a second preparer counts as one');
    eq(r.rushScopeLine({ psRecommended: 3, psCount: 5 }), PLAIN + ', with an expanded crew of 5 Property Specialists working in parallel',
       'an expanded crew is named, with its size, when more specialists are staffed than recommended');
    eq(r.rushScopeLine({ needsTC2: true, psRecommended: 2, psCount: 4 }),
       PLAIN + ', with a second Transition Concierge and an expanded crew of 4 Property Specialists working in parallel', 'both, joined');
    eq(r.rushCrewAdded({ psRecommended: 3, psCount: 3 }).ps, 0, 'the recommended crew is not an expanded one');
    eq(r.rushCrewAdded({ psRecommended: 4, psCount: 3 }).ps, 0, 'nor is a smaller one');
    eq(r.rushCrewAdded({ psCount: 6 }).ps, 0,
       '⚠ a record saved before psRecommended existed NEVER claims an expanded crew — the comparison cannot be made');
    eq(r.rushCrewAdded({ nps: 5, psRecommended: 2 }).ps, 5, 'the older crew-count field is read too');
    eq(r.rushCrewAdded(null), { tc2: false, ps: 0 }, 'no estimate, no crew claimed');

    // The retired sentences are gone from every live line — the three rush rows read the one helper.
    lacks(live, 'A second Transition Concierge and an expanded specialist crew working in parallel',
          'the old estimate/final rush sentence survives nowhere');
    lacks(live, 'Compressing the project calendar at your request', 'nor the advance invoices’ version');
    eq((liveBody('clientEstimateHtml(e, job)').match(/rushScopeLine\(e\)/g) || []).length, 1, 'the estimate’s rush row reads the helper');
    eq((liveBody('invoiceHtml(job, stage)').match(/rushScopeLine\(est\)/g) || []).length, 2,
       'both invoice rush rows (final and advance) read it');
    has(liveBody('calcAll()'), 'psRecommended: isPrep ? 0 : _recommendedPS',
        'the snapshot records the recommended crew, so the claim can be tested off the record');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('M3 — the discount box: 0 removes it, a blank is not an answer, and the cap is the real cap');
  {
    const d = sandbox({ fns: ['discountPctInput'], vars: ['MAX_DISCOUNT_PCT'] });
    eq(d.discountPctInput('0'), { pct: 0, error: '' }, '0 is an answer — it removes the discount');
    eq(d.discountPctInput('5'), { pct: 5, error: '' }, '5 is 5');
    eq(d.discountPctInput(' 15 '), { pct: 15, error: '' }, 'the cap itself is allowed, whitespace trimmed');
    ['', '   ', null, undefined, '16', '30', '5.5', '-3', 'abc', '1e1'].forEach((v) => {
      const out = d.discountPctInput(v);
      ok(out.pct === null && !!out.error, `${JSON.stringify(v)} is refused rather than read as a number`);
    });
    const msg = d.discountPctInput('').error;
    has(msg, 'between 0% and 15%', 'the refusal names the real range — the cap is 15, not 30');
    has(msg, '0 removes the discount', 'and says how to take a discount off');
    lacks(live, 'between 1 and 30', 'the unreachable "between 1 and 30" refusal is gone');
    lacks(liveBody('applyDiscountRevision()'), 'Math.max(1', 'nothing turns a blank or a 0 into 1% any more');
    has(src, 'id="dm-pct" min="0" max="15"', 'the box itself accepts 0');
  }

  // A driven sandbox for the pop-up, the rail's door and the write.
  const DISC_FNS = ['discountPreview', 'estPreDiscountTotal', 'discountOnLabor', 'applyDiscountRevision', 'discountOfferBlocker',
    'discountPctInput', '_discountModalSays', 'revokeAgreementApproval', '_dashFbTarget', '_jobBandHost', '_dashRedraw',
    'isAgreementSigned', 'agreementSignature', 'isAgreementSent', 'docSentAt', 'docKeyFor', 'estFixedFee', 'estPrepFeeOnTop',
    'updateDiscountModal', 'openDiscountModal', 'closeDiscountModal', 'dashOfferDiscount', 'dashNotice', '_primeEstimateFor',
    'notifyManagerForApproval'];
  const DISC_VARS = ['MAX_DISCOUNT_PCT', 'RUSH_PCT', '_dashboardJobId', '_packetExported', 'currentAgrJobId', 'agrApproved',
    'agrApprovedBy', 'agrApprovedAt', '_dashNotice', 'currentInvStage', 'estimateApproved', 'estimateSubmitted',
    'discountRevision', 'approvedBy', 'approvedAt'];
  // An hourly estimate: labour 20,000, a 10% discount, no rush — agreed at 18,000.
  const EST = (o) => Object.assign({ jobId: 1, tcFee: 12000, psFee: 8000, havellinTotalFull: 20000, rush: false, rushAmt: 0,
    discountPct: 10, discountAmt: 2000, havellinTotal: 18000, grandTotal: 18000, fixedPrice: false }, o || {});
  function discBed(estO, jobO) {
    const doc = domStub({ 'dm-pct': '0' });
    const said = { fb: [], badges: [], mail: [], saved: 0, redraw: [] };
    const ctx = sandbox({ fns: DISC_FNS, vars: DISC_VARS, stubs: {
      document: doc,
      jobs: [Object.assign({ id: 1, name: 'Butler', status: 'approved', agrApproved: true, agrApprovedBy: 'Anthony Graziano',
        agrApprovedAt: 'September 29, 2026' }, jobO || {})],
      currentEstimate: EST(estO),
      saveJobs() { said.saved++; }, syncJobToSheets() {}, saveEstimateState() {}, renderClientEstimate() {}, updateApprovalUI() {},
      showFB(el, type, m) { said.fb.push({ el, type, m }); }, showSyncBadge(m) { said.badges.push(m); },
      assignedTCContact() { return { name: 'Ashley Jerome' }; }, svcLabelOf() { return 'Home Editing'; },
      sendInternalEmail(to, subj, lines) { said.mail.push({ subj, text: lines.join('\n') }); },
      MANAGER_APPROVAL_EMAIL: 'anthony@example.com', renderClientDashboard(id) { said.redraw.push(id); },
      _repaintJobBand() {}, setTimeout() {},
    } });
    ctx._packetExported = { 1: 'September 29, 2026|Anthony Graziano' };
    return { ctx, doc, said, job: ctx.jobs[0] };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('M3 — 0 REMOVES the discount, and revokes the agreement the way an edited estimate does');
  {
    const { ctx, doc, said, job } = discBed();
    doc.getElementById('dm-pct').value = '0';
    ctx.applyDiscountRevision();
    eq(ctx.currentEstimate.discountPct, 0, 'the discount is off');
    eq(ctx.currentEstimate.discountAmt, 0, 'and its amount');
    eq(ctx.currentEstimate.havellinTotal, 20000, 'the total goes back to the pre-discount figure');
    eq(job.havellinEst, 20000, 'and the job carries it');
    eq(job.status, 'pending', 'and it goes back to the manager, as any price change does');
    eq(job.agrApproved, false, '⚠ the agreement’s approval is withdrawn — its Exhibit A just changed');
    eq(job.agrRevokedBy, 'discount-revised', 'naming why');
    eq(job.agrApprovedBy, '', 'and the approver cleared, so the re-approval re-stamps');
    ok(!('1' in ctx._packetExported),
       '⚠⚠ and the packet’s filing guard is cleared, so re-approval RE-FILES Drive the same day by the same manager');
    ok(said.badges.some((m) => /Agreement approval revoked/.test(m)), 'the revocation says so');
    ok(said.fb.some((f) => /^Discount removed\./.test(f.m)), 'the confirmation says the discount was REMOVED, not applied');
    const mail = said.mail[0] || { subj: '', text: '' };
    has(mail.text, 'has removed the client discount', 'the manager’s email says it was removed');
    has(mail.text, 'Discount: removed', 'rather than "Proposed discount: 0%"');
    lacks(mail.text, 'Proposed discount: 0%', 'which is not a discount anyone proposed');
  }
  {
    // A real discount still applies, and revokes the same way.
    const { ctx, doc, said, job } = discBed({ discountPct: 0, discountAmt: 0, havellinTotal: 20000 });
    doc.getElementById('dm-pct').value = '5';
    ctx.applyDiscountRevision();
    eq(ctx.currentEstimate.discountPct, 5, 'a 5% discount lands as 5%');
    eq(ctx.currentEstimate.havellinTotal, 19000, 'off the labour');
    eq(job.agrRevokedBy, 'discount-revised', 'and a discount offered revokes the agreement too');
    ok(said.fb.some((f) => /^Discount applied\./.test(f.m)), 'confirmed as applied');
    has((said.mail[0] || {}).text, 'Proposed discount: 5%', 'the manager is told the percentage');
  }

  group('M3 — what the box refuses, and that a refusal writes nothing');
  {
    const refused = (estO, jobO, value, needle, label) => {
      const { ctx, doc, said, job } = discBed(estO, jobO);
      doc.getElementById('dm-pct').value = value;
      const before = JSON.stringify(ctx.currentEstimate);
      ctx.applyDiscountRevision();
      eq(JSON.stringify(ctx.currentEstimate), before, label + ' — the estimate is untouched');
      eq(job.agrApproved, (jobO && 'agrApproved' in jobO) ? jobO.agrApproved : true, label + ' — the agreement is untouched');
      eq(said.saved, 0, label + ' — nothing saved');
      has(doc.getElementById('dm-fb').innerHTML, needle, label + ' — and the pop-up says why');
    };
    refused(null, null, '', 'between 0% and 15%', 'a blank');
    refused(null, null, '16', 'between 0% and 15%', 'above the cap');
    refused({ discountPct: 0, discountAmt: 0, havellinTotal: 20000 }, null, '0', 'no discount to remove', '0 on an estimate with no discount');
    refused({ fixedPrice: true, fixedAmount: 18000, havellinTotal: 18000, discountPct: 0, discountAmt: 0 }, null, '0',
      'inside the fee itself', '0 on a fixed fee');
    refused(null, { agrSent: true }, '5', 'signing packet has gone to the client', 'a discount after the packet was sent (the boolean)');
    refused(null, { docState: { agreement: { sentAt: '2026-09-29T10:00:00Z' } } }, '5', 'signing packet has gone to the client',
      '⚠ and after a DocuSign send, which writes the record and not the boolean');
    refused(null, { agrSent: true, docState: { agreement: { sig: { signedOn: '2026-09-29', signedBy: 'Tripp Butler' } } } }, '5',
      'price is locked', 'a discount on a signed agreement');
  }

  group('M3 — the preview and the doors agree with the write');
  {
    const { ctx, doc } = discBed();
    doc.getElementById('dm-pct').value = '';
    ctx.updateDiscountModal();
    eq(doc.getElementById('dm-revised').textContent, '—', 'a blank box previews nothing — not a clamped figure the write would refuse');
    doc.getElementById('dm-pct').value = '0';
    ctx.updateDiscountModal();
    eq(doc.getElementById('dm-revised').textContent, '$20,000', 'and 0 previews the total with the discount taken off');

    // The door on the dashboard and the pop-up's own door refuse once the packet is out.
    const sent = discBed(null, { agrSent: true });
    let opened = 0;
    sent.ctx.openDiscountModal = (function (orig) { return function () { opened++; return orig.apply(this, arguments); }; })(sent.ctx.openDiscountModal);
    sent.ctx.estimateStore = { 1: { estimate: sent.ctx.currentEstimate, approved: true } };
    sent.ctx.dashOfferDiscount(1);
    eq(opened, 0, 'the dashboard handler does not open the pop-up once the packet has gone');
    has((sent.ctx._dashNotice || {}).msg, 'signing packet has gone to the client', 'and says why, on the dashboard');
    sent.ctx.openDiscountModal();
    ok(sent.doc.getElementById('discount-modal').style.display !== 'flex', 'the pop-up’s own door refuses as well');
    ok(sent.said.fb.some((f) => /signing packet has gone/.test(f.m)), 'and says why');
    has(liveBody('updateApprovalUI()'), 'discountOfferBlocker(ceJob)', 'the Client Estimate panel’s button reads the same rule');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('M3 — discountOfferBlocker is the one rule, and it reads the RECORD');
  {
    const b = sandbox({ fns: ['discountOfferBlocker', 'isAgreementSigned', 'agreementSignature', 'isAgreementSent', 'docSentAt', 'docKeyFor'],
      vars: ['currentInvStage'] });
    eq(b.discountOfferBlocker({ id: 1 }), '', 'a job whose packet has not gone out may still be offered one');
    has(b.discountOfferBlocker({ id: 1, agrSent: true }), 'signing packet has gone to the client', 'sent (the boolean) refuses');
    has(b.discountOfferBlocker({ id: 1, docState: { agreement: { sentAt: 'x' } } }), 'change order',
        '⚠ sent (the record, as DocuSign writes it) refuses — and names the route that remains');
    has(b.discountOfferBlocker({ id: 1, agrSigned: true }), 'price is locked', 'signed refuses');
    has(b.discountOfferBlocker(null), 'could not be found', 'no job refuses');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // The rail — the same fixture shape as dashboard-actions.test.js.
  const RAIL = sandbox({
    fns: ['agrApprovalWithdrawn', 'jobTimeline', 'jobTimelineNext', 'jobTimelineActions', 'docReadOnlyWord', 'discountOfferBlocker',
      'estimateSubmitBlocker', 'jobStageDoc', 'docReadiness', 'docDraftOnly', 'docTitle', 'docWord', '_jtDocSecondaries',
      'docPreviewOnly', 'agreementReady', 'isJobWon', 'estimateNoteGaps', 'paymentSplit', 'unscoredRoomNames',
      'jobActivationBlockers', 'estimateContractBlocker', 'estimateContractMissing', 'isDecedentJob', 'invFiduciaryMode',
      'matterTypeOf', 'svcHasDocStep', 'docTierOf', 'docTierDef', 'isJobFunded', 'jobPayments', 'stagePaidTotal',
      'depositPaidTotal', 'depositTargetFor', 'docSentAt', 'docDraftedAt', 'docKeyFor', 'agreementSignature',
      'isAgreementSigned', 'esignProviderKey', 'esignAvailable', 'esignJobWatches', '_jtSendAction', '_jtDocViews',
      '_jtDraftLink', '_jtDriveLink', 'isAgreementSent'],
    vars: ['JT_SHORT', 'JT_NEXT', 'AGR_SIG_METHODS', 'ESIGN_PROVIDERS', 'ESIGN_PROVIDER_KEY', 'JT_ROW_DOC', 'DOC_READY_WHY',
      'DOC_KIND_WORD', 'DOC_STAGE_WORD', 'DOC_ACTIONS', 'ESTIMATE_CONTRACT_FIELDS', 'MATTER_TYPES', 'DOC_TIERS',
      'DOC_TIER_FROM_SCOPE', 'DECEDENT_SERVICES', 'JOB_STEPS', 'currentInvStage'],
    stubs: { REQUIRE_WALKTHROUGH_NOTES: false, SHEETS_SYNC_URL: 'https://script.google.com/macros/s/x/exec' },
  });
  const room = (name) => ({ name, vol: 3, cplx: 3, note: 'seen' });
  const REST = () => ({ rooms: [room('Kitchen'), room('Primary Bedroom')], havellinTotal: 24100, collections: [] });
  function rail(jobO, recO) {
    const job = Object.assign({ id: 7, name: 'Butler', created: 'Sep 8, 2026', svc: 'cleanout', status: 'approved',
      walkthrough: '2020-01-01', approved: true, estimateSentDate: 'September 9, 2026' }, jobO || {});
    const rec = Object.assign({ estimate: REST(), savedAt: 'Sep 8, 2026', approved: true, submitted: false }, recO || {});
    RAIL.estimateStore = { 7: rec }; RAIL.jobs = [job];
    const rows = RAIL.jobTimeline(job, rec, [], []);
    return { rows, job, rec, row: (k) => rows.filter((r) => r.key === k)[0] };
  }
  const actsOn = (r, key) => {
    const a = RAIL.jobTimelineActions(r.row(key), r.job, r.rec);
    return { a, all: a.secondary.concat(a.doc ? a.doc.acts : []).concat(a.primary ? [a.primary] : []) };
  };

  group('M3 — Offer discount on the rail: offered until the packet goes out, withdrawn after');
  {
    const offered = (r) => actsOn(r, 'estimate_sent').all.some((x) => /Offer discount/.test(x.label));
    ok(offered(rail({ won: true, agrApproved: true })), 'offered on a won job whose packet has not gone out');
    ok(!offered(rail({ won: true, agrApproved: true, agrSent: true })), '⚠ withdrawn once the packet has been SENT, not only once signed');
    ok(!offered(rail({ won: true, agrApproved: true, docState: { agreement: { sentAt: '2026-09-29T10:00:00Z' } } })),
       'including a DocuSign send, which writes only the record');
    ok(!offered(rail({ won: true, agrSent: true, agrSigned: true })), 'and on a signed agreement');
  }

  group('M3 — a withdrawn approval explains itself, whatever withdrew it');
  {
    const w = sandbox({ fns: ['agrApprovalWithdrawn'] });
    eq(w.agrApprovalWithdrawn(null), '', 'no job, nothing to say');
    eq(w.agrApprovalWithdrawn({ agrApproved: true, agrRevokedBy: 'discount-revised' }), '', 'an approved agreement is not withdrawn');
    eq(w.agrApprovalWithdrawn({}), '', 'an agreement never approved is not "withdrawn"');
    has(w.agrApprovalWithdrawn({ agrRevokedBy: 'estimate-edited' }), 'The estimate was edited after this was prepared', 'an edit reads as an edit');
    has(w.agrApprovalWithdrawn({ agrRevokedBy: 'discount-revised' }), 'A discount changed the price after this was prepared',
        '⚠ and a discount says it was a discount — it used to say nothing at all');
    const r = rail({ won: true, agrRevokedBy: 'discount-revised' });
    has(r.row('agreement_sent').sub, 'A discount changed the price', 'the rail’s packet row carries it');
    const sentR = rail({ won: true, agrRevokedBy: 'discount-revised', agrSent: true });
    lacks(sentR.row('agreement_sent').sub || '', 'A discount changed the price', 'but not once the packet is out — it is history then');
    lacks(liveBody('updateAgrUI()'), "agrRevokedBy === 'estimate-edited'", 'the Agreement tab reads the shared helper too');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the gate names the document it is refusing — the invoice’s refusal was about the agreement');
  {
    const wait = rail({ won: false, status: 'approved' }, { approved: false });
    eq(RAIL.docReadiness('invoice', wait.job, wait.rec), 'The estimate must be approved before the invoice can be drawn.',
       'an invoice refused for an unapproved estimate says "invoice"');
    eq(RAIL.docReadiness('agreement', wait.job, wait.rec), 'The estimate must be approved before the agreement can be drawn.',
       'the packet still says "agreement"');
    const nw = rail({ won: false });
    has(RAIL.docReadiness('invoice', nw.job, nw.rec), 'there is nothing to invoice', 'before the client’s yes there is nothing to invoice');
    has(RAIL.docReadiness('agreement', nw.job, nw.rec), 'nothing to put under contract', 'and nothing to put under contract');
    ['invoice', 'agreement', 'estimate'].forEach((k) => [wait, nw].forEach((r) => {
      const t = RAIL.docReadiness(k, r.job, r.rec);
      ok(!/\{doc\}|\{act\}/.test(t), `no placeholder leaks into the ${k} refusal`);
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('Q11 — the packet may be READ before the client says yes, and only read');
  {
    const nw = rail({ won: false });
    ok(RAIL.docPreviewOnly('agreement', nw.job, nw.rec), 'approved but not won: the packet is preview-only');
    ok(!RAIL.docPreviewOnly('agreement', rail({ won: true }).job, rail({ won: true }).rec), 'once won it is the real thing');
    const un = rail({ won: false }, { approved: false });
    ok(!RAIL.docPreviewOnly('agreement', un.job, un.rec), '⚠ an UNAPPROVED estimate is not previewable — its Exhibit A is a draft nobody approved');
    ok(!RAIL.docPreviewOnly('estimate', nw.job, nw.rec), 'only the packet has a preview state');
    ok(!RAIL.docPreviewOnly('agreement', null, null), 'no job, no preview');

    // ⚠ The blocker reads the STORE, which each rail() call re-seeds — so the job under test is
    // re-seeded right here rather than trusted from above (the lines above seeded other fixtures).
    const nw2 = rail({ won: false });
    const spec = { job: nw2.job, kind: 'agreement' };
    eq(RAIL.DOC_ACTIONS.agreement.blocker(spec, 'view'), '', 'viewing the packet before the yes is allowed');
    ['print', 'send', 'file'].forEach((v) =>
      has(RAIL.DOC_ACTIONS.agreement.blocker(spec, v), 'nothing to put under contract', `but ${v} still waits for the client’s yes`));
    const un2 = rail({ won: false }, { approved: false });
    has(RAIL.DOC_ACTIONS.agreement.blocker({ job: un2.job, kind: 'agreement' }, 'view'), 'must be approved',
        'and an unapproved estimate refuses even the view');

    eq(RAIL.docReadOnlyWord('agreement', nw.job, nw.rec), ' — PREVIEW', 'the packet before the yes reads PREVIEW');
    eq(RAIL.docReadOnlyWord('estimate', un.job, un.rec), ' — DRAFT', 'an unapproved estimate still reads DRAFT');
    eq(RAIL.docReadOnlyWord('agreement', rail({ won: true }).job, rail({ won: true }).rec), '', 'the real thing reads as itself');

    // The waiting "Signing packet sent" row: its tray offers the packet to READ, never to print.
    const t = actsOn(nw, 'agreement_sent');
    ok(!!t.a.doc, 'the packet row carries its document before the yes');
    eq(t.a.doc && t.a.doc.title, 'Signing Packet — PREVIEW', 'titled PREVIEW');
    ok(t.all.some((x) => x.call === "docAction(7,'agreement','view')"), 'offering View');
    ok(!t.all.some((x) => /'agreement','(print|send|file)'/.test(x.call)), '⚠ and never Print, Send or File');
    const won = actsOn(rail({ won: true }), 'agreement_sent');
    ok(won.all.some((x) => x.call === "docAction(7,'agreement','print')"), 'once won, Print comes back');
    eq(won.a.doc && won.a.doc.title, 'Signing Packet', 'without the PREVIEW word');
  }

  group('Q11 — docAction: a view before the yes stamps nothing and offers no Print');
  {
    const calls = { commit: 0, viewer: [], printed: 0, notices: [] };
    const D = sandbox({
      fns: ['docAction', 'docReadiness', 'docPreviewOnly', 'agreementReady', 'isJobWon', 'docReadOnlyWord', 'docDraftOnly',
        'docTitle', 'openDocViewer', '_openViewer'],
      vars: ['DOC_ACTIONS', 'DOC_READY_WHY', 'DOC_STAGE_WORD', '_docViewerSpec'],
      stubs: {
        document: domStub({}),
        docSpec(kind, jobId) { const job = D.jobs[0]; return { kind, stage: null, job, cfg: D.DOC_ACTIONS[kind], names: { printTitle: 'x' } }; },
        signingPacketHtml() { return '<p>packet</p>'; },
        ensureAgreementApproved() { calls.commit++; return ''; },
        _printDocument() { calls.printed++; return true; },
        _docNotice(t, m) { calls.notices.push(m); },
      },
    });
    const setJob = (won) => {
      D.jobs = [{ id: 7, name: 'Butler', addr: '69 Beach Blvd', status: won ? 'won' : 'approved', won }];
      D.estimateStore = { 7: { estimate: { havellinTotal: 1 }, approved: true } };
    };
    setJob(false);
    D.docAction(7, 'agreement', 'view');
    eq(calls.commit, 0, '⚠ viewing before the yes does not stamp the approval or file anything');
    eq(D.document.getElementById('doc-viewer-print').style.display, 'none', 'and the viewer offers no Print');
    has(D.document.getElementById('doc-viewer-title').textContent, 'PREVIEW', 'its title says PREVIEW');
    D.docAction(7, 'agreement', 'print');
    eq(calls.printed, 0, 'printing before the yes is refused');
    eq(calls.commit, 0, 'and still stamps nothing');
    ok(calls.notices.some((m) => /nothing to put under contract/.test(m)), 'saying why');
    setJob(true);
    D.docAction(7, 'agreement', 'view');
    eq(D.document.getElementById('doc-viewer-print').style.display, '', 'once won the viewer offers Print again');
    lacks(D.document.getElementById('doc-viewer-title').textContent, 'PREVIEW', 'and the title is the document’s own');
    D.docAction(7, 'agreement', 'print');
    eq(calls.printed, 1, 'and printing works');
    eq(calls.commit, 1, 'stamping the approval on the way through, as it always has');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // The agreement builders — the reconciliation suite's list, trimmed to what these forms read.
  const AGR = sandbox({
    fns: ['marketingOptOutBlock', 'marketingUseParas', '_mktClause', 'estimateIsFeeOnly', 'estDeclutterHrs', 'prepFeeRate', 'fmt',
      'svcLabelOf', 'isDecedentJob', 'estTolerancePctTxt', 'paymentSplit', 'materialsBasisNote', 'materialsPackageQuoted',
      'estimateDocScope', 'svcHasDocStep', '_pctWords', 'agreementHtml', 'agrPriceAdjustments', 'probateAgreementHtml',
      'agrBillingRates', '_agrHasPrepVendors', '_agrScopeServices', '_agrProbateCompliance', '_agrMidpointTrigger',
      'docStandardEffect', 'isFormalDoc', 'gateDispute', '_gateYes', '_gate706', 'docLevelFloor', 'resolveDocLevel',
      'docLevelFloorReason', 'docTierOf', 'docTierDef', 'docTierScope', 'docTierScopeMirror', 'agrSection',
      'approvedEstimateFor', 'esignAnchor', 'estFixedFee', 'estPrepFeeOnTop', 'weArrangeAppraisals', 'docTierProduces',
      'docScopeDef', '_agrComplianceHeading', '_agrComplianceLead', '_agrApprover', '_agrTrustDeliverable', 'matterDef',
      'matterTypeOf', 'invFiduciaryMode', 'conciergePhones', 'conciergePhonesText', 'assignedTCContact', 'samePerson',
      'canonPersonName'],
    vars: ['PREP_FEE_RATE', 'SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'EST_TOLERANCE_PCT', 'DECEDENT_SERVICES', 'DOC_SCOPES',
      'DOC_CAPTURE_POOL_SHARE', 'JOB_STEPS', 'agrApproved', 'agrApprovedBy', 'agrApprovedAt', '_PCT_WORDS', 'ESIGN_ANCHORS',
      'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'MATTER_TYPES', 'HAVELLIN_OFFICE_PHONE', 'NON_MOBILE_NUMBERS', 'DEFAULT_CONTRACTORS',
      'PERSON_NAME_ALIASES', 'MAX_DISCOUNT_PCT'],
    stubs: { jobs: [], estimateStore: {}, contractors: [] },
  });
  const flat = (h) => String(h).replace(/<[^>]+>/g, ' ').replace(/&rsquo;|’/g, '’').replace(/\s+/g, ' ');
  const AEST = (o) => Object.assign({ svc: 'downsizing', tcRate: 150, psRate: 100, totTC: 40, totPS: 60, tcFee: 6000, psFee: 6000,
    havellinTotal: 12000, fixedPrice: false, rush: false, rushAmt: 0, rushPct: 0.20, discountPct: 0, discountAmt: 0,
    pkgCost: 0, pkgLabel: 'None — $0', prepItems: [], docScope: 'full' }, o || {});
  const AJOB = (svc, o) => Object.assign({ id: 3, name: 'Butler', svc, addr: '69 Beach Blvd', tc: 'Anthony Graziano',
    status: 'won', won: true, executor: 'Tripp Butler', executorRole: 'Personal Representative', matterType: 'probate' }, o || {});

  group('Q8 — the fee clause names the premium and the discount its Exhibit A itemizes, one sentence each');
  {
    const RUSH = 'At Client’s request this engagement is scheduled on a priority basis, for which an expedited-delivery premium of twenty percent (20%) of Contractor’s fees is charged, as itemized on the Estimate and applied to the fees actually billed.';
    eq(AGR.agrPriceAdjustments(AEST({ rush: true, rushAmt: 2400 }), 'Contractor'), RUSH, 'the rush sentence, exactly');
    eq(AGR.agrPriceAdjustments(AEST({ discountPct: 10, discountAmt: 1200 }), 'Havellin'),
       'A preferred-client discount of ten percent (10%) applies to Havellin’s labor fees, as itemized on the Estimate and applied to the labor fees actually billed.',
       'the discount sentence, naming the estate form’s party');
    has(AGR.agrPriceAdjustments(AEST({ rush: true, rushAmt: 2400, discountPct: 5, discountAmt: 720 }), 'Contractor'),
        'applies to Contractor’s labor fees and to the expedited-delivery premium charged on them',
        'with rush, the discount says it reaches the premium too — as discountOnLabor computes it');
    eq(AGR.agrPriceAdjustments(AEST(), 'Contractor'), '', 'nothing to name, nothing said');
    eq(AGR.agrPriceAdjustments(AEST({ fixedPrice: true, rush: true, rushAmt: 2400, discountPct: 10, discountAmt: 1200 }), 'Contractor'), '',
       '⚠ never on a fixed fee — both are inside the figure the fixed-fee clause states');
    eq(AGR.agrPriceAdjustments(AEST({ discountPct: 5, discountAmt: 0 }), 'Contractor'), '', 'a percentage with no amount is not a discount');
    eq(AGR.agrPriceAdjustments(null, 'Contractor'), '', 'the blank template names neither');
    has(AGR.agrPriceAdjustments(AEST({ rush: true, rushAmt: 3000, rushPct: 0.25 }), 'Contractor'), 'twenty-five percent (25%)',
        'the premium is read off the estimate’s pinned rate');
    for (let p = 1; p <= AGR.MAX_DISCOUNT_PCT; p++)
      ok(/^[a-z-]+ percent \(\d+%\)$/.test(AGR._pctWords(p / 100)), `${p}% is spelled for a contract (${AGR._pctWords(p / 100)})`);

    const std = flat(AGR.agreementHtml(AJOB('downsizing', { executor: '' }), AEST({ rush: true, rushAmt: 2400, discountPct: 10, discountAmt: 1440 })));
    has(std, 'expedited-delivery premium of twenty percent (20%) of Contractor’s fees', 'the standard form’s §3.3 names the premium');
    has(std, 'preferred-client discount of ten percent (10%) applies to Contractor’s labor fees', 'and the discount');
    const s33 = std.slice(std.indexOf('3.3 Hourly'), std.indexOf('3.4 Third-Party'));
    has(s33, 'expedited-delivery premium', 'inside §3.3, where the rates are');
    const fx = flat(AGR.agreementHtml(AJOB('downsizing', { executor: '' }), AEST({ fixedPrice: true, fixedAmount: 12000, rush: true, rushAmt: 2400 })));
    lacks(fx, 'expedited-delivery premium of', 'a fixed-fee agreement names no premium');
    const pro = flat(AGR.probateAgreementHtml(AJOB('probate'), AEST({ svc: 'probate', rush: true, rushAmt: 2400, discountPct: 5, discountAmt: 720 })));
    has(pro, 'expedited-delivery premium of twenty percent (20%) of Havellin’s fees', 'the estate form names the premium, as Havellin');
    has(pro, 'preferred-client discount of five percent (5%) applies to Havellin’s labor fees and to the expedited-delivery premium',
        'and the discount');
    const prep = flat(AGR.agreementHtml(AJOB('prep', { executor: '' }), AEST({ svc: 'prep', totTC: 4, totPS: 0, tcFee: 600, psFee: 0,
      declutterTCHrs: 4, prepItems: [{ cat: 'Painting', cost: 9000 }], prepFee: 2700, havellinTotal: 3240, discountPct: 10, discountAmt: 60 })));
    has(prep, 'preferred-client discount of ten percent (10%) applies to Contractor’s labor fees',
        'a Home Prep job with declutter hours names its discount in its own §3.3 arm');
  }

  group('Q8/Q11 — the "Approved for Sending" stamp is read off the job, never another client’s globals');
  {
    AGR.agrApproved = true; AGR.agrApprovedBy = 'Somebody Else'; AGR.agrApprovedAt = 'January 1, 2026';
    const notYet = AGR.agreementHtml(AJOB('downsizing', { executor: '' }), AEST());
    lacks(notYet, 'Approved for Sending', '⚠ the globals a previous client primed do not stamp this one');
    lacks(notYet, 'Somebody Else', 'nor name their approver');
    const approved = AGR.agreementHtml(AJOB('downsizing', { executor: '', agrApproved: true, agrApprovedBy: 'O’Hara & Sons',
      agrApprovedAt: 'September 29, 2026' }), AEST());
    has(approved, 'Approved for Sending', 'this job’s own approval stamps it');
    has(approved, 'O’Hara &amp; Sons', 'naming its approver, escaped');
    // ⚠ The estate form is asserted on the STAMP, not only on the other client's name. The revert
    // sweep found the name check alone blind: restoring just the global CONDITION stamps this job
    // "Approved for Sending" with its own (empty) approver, and no other client's name appears.
    const proNot = AGR.probateAgreementHtml(AJOB('probate'), AEST({ svc: 'probate' }));
    lacks(proNot, 'Approved for Sending', '⚠ the estate form does not stamp an unapproved job off another client’s globals');
    lacks(proNot, 'Somebody Else', 'nor name their approver');
    const proYes = AGR.probateAgreementHtml(AJOB('probate', { agrApproved: true, agrApprovedBy: 'O’Hara & Sons',
      agrApprovedAt: 'September 29, 2026' }), AEST({ svc: 'probate' }));
    has(proYes, 'Approved for Sending', 'the estate form stamps its own job’s approval');
    has(proYes, 'O’Hara &amp; Sons', 'naming its approver, escaped');
    AGR.agrApproved = false; AGR.agrApprovedBy = ''; AGR.agrApprovedAt = '';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('lows — no materials package is an answer, not "(None — $0)" quoted back at the client');
  {
    eq(AGR.materialsPackageQuoted('None — $0', 0), false, 'the dropdown’s None is no package');
    eq(AGR.materialsPackageQuoted('Estate Premium — $1,500', 1500), true, 'a priced package is one');
    eq(AGR.materialsPackageQuoted('None', undefined), false, 'a "None" label with no cost is none');
    eq(AGR.materialsPackageQuoted(undefined, undefined), true, 'the blank template still states the basis a package is billed on');
    eq(AGR.materialsBasisNote('None — $0', 0), 'No moving or packing materials package is quoted on the Estimate, and none is billed.',
       'the none sentence');
    has(AGR.materialsBasisNote('Estate Premium — $1,500', 1500), '(Estate Premium — $1,500)', 'a real package is still named');
    const std = flat(AGR.agreementHtml(AJOB('downsizing', { executor: '' }), AEST()));
    lacks(std, '(None — $0)', '⚠ the standard §3.6 no longer quotes "(None — $0)"');
    has(std, 'No moving or packing materials package is quoted', 'it says none is quoted');
    const pro = flat(AGR.probateAgreementHtml(AJOB('probate'), AEST({ svc: 'probate' })));
    lacks(pro, '(None — $0)', 'nor does the estate form’s fee table');
    has(pro, 'None quoted', 'whose rate cell says so');
    has(flat(AGR.probateAgreementHtml(AJOB('probate'), AEST({ svc: 'probate', pkgCost: 1500, pkgLabel: 'Estate Premium — $1,500' }))),
        'Fixed package price', 'and a quoted package still reads as one');
    has(liveBody('calcAll()'), "if (isPrep) { pkgCost = 0; pkgLabel = 'None — $0'; }",
        '⚠ a Home Prep estimate prices no materials package off the hidden select');
  }

  group('lows — a credit final is emailed as a credit');
  {
    const w = sandbox({ fns: ['invoiceBalanceWords', '_emMoney'] });
    const cr = w.invoiceBalanceWords(-2741);
    eq(cr.label, 'Credit to you', 'a negative balance is a credit');
    eq(cr.amount, '$2,741', 'stated as a positive amount');
    has(cr.terms, 'Nothing is due on this invoice', 'and nothing is asked for');
    lacks(cr.terms, 'calendar days', 'no payment terms on a credit');
    const due = w.invoiceBalanceWords(2741);
    eq([due.label, due.amount, due.terms], ['Balance due', '$2,741', 'Payment is due within 7 calendar days.'], 'a balance is a balance');
    eq(w.invoiceBalanceWords(0).amount, 'see attached', 'a zero reads as before');
    ['buildInvoiceEmailText(', 'buildInvoiceEmailHtml(', 'buildInvoiceMailto('].forEach((f) =>
      has(liveBody(f), 'invoiceBalanceWords(', `${f.replace('(', '')} words its balance through the one helper`));
    lacks(liveBody('buildInvoiceMailto('), "'Balance due: ' + bal", 'the mailto keeps no private copy');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Direct cases on the real invoice and estimate builders — the reconciliation suite's lists.
  const REC = require('./document-reconciliation.test.js');
  const B = sandbox({ fns: REC.FNS, vars: REC.VARS, stubs: {
    jobs: [], jobLogs: {}, estimateStore: {}, changeOrders: [], contractors: [], currentEstimate: null,
    currentInvStage: 'final', vendorDirectory: [], jobPlans: {}, _photoRefs: {}, document: domStub({}) } });
  const money = (h, re) => { const m = String(h).match(re); return m ? parseInt(m[1].replace(/,/g, ''), 10) : null; };
  const personFee = (h, name) => money(h, new RegExp('<tr><td>' + name + '</td>(?:(?!</tr>)[\\s\\S])*?\\$([\\d,]+)</td></tr>'));

  group('lows — on a premium final two people sharing a role add up to that role’s fee');
  {
    // $185 × 10.3 = $1,905.50 and $125 × 10.1 = $1,262.50: each row rounds UP on its own, and the
    // role's fee — round(20.6 × 185) = 3,811, round(20.2 × 125) = 2,525 — is a dollar under the pair.
    const e = { jobId: 1, svc: 'cleanout', totTC: 20.6, totPS: 20.2, tcRate: 185, psRate: 125, tcFee: 3811, psFee: 2525,
      pkgCost: 0, pkgLabel: 'None — $0', smf: 0, prepItems: [], prepEnabled: false, prepCost: 0, prepFee: 0,
      havellinTotalFull: 6336, havellinTotal: 6336, fixedPrice: false, rush: false, rushAmt: 0, discountPct: 0,
      discountAmt: 0, vendors: [], vendorCost: 0, rooms: [], docScope: 'full' };
    const job = { id: 1, hvlId: 'HVL-0007', name: 'Butler', svc: 'cleanout', addr: '69 Beach Blvd', tc: 'Anthony Graziano',
      status: 'active', won: true, premium: true, payments: [] };
    B.jobs = [job];
    B.estimateStore = { 1: { estimate: e, approved: true } };
    B.jobLogs = { 1: [{ date: '2026-09-01', activity: 'work', members: [
      { name: 'Anthony Graziano', role: 'TC', hours: 10.3 }, { name: 'Ashley Jerome', role: 'TC', hours: 10.3 },
      { name: 'Specialist One', role: 'PS', hours: 10.1 }, { name: 'Specialist Two', role: 'PS', hours: 10.1 }] }] };
    B.changeOrders = [];
    const h = B.invoiceHtml(job, 'final').html;
    const a = personFee(h, 'Anthony Graziano'), b = personFee(h, 'Ashley Jerome');
    const c = personFee(h, 'Specialist One'), d = personFee(h, 'Specialist Two');
    eq(a + b, 3811, '⚠ the two concierge rows add up to the concierge fee — they printed $1,906 + $1,906 = $3,812');
    eq(c + d, 2525, 'and the two specialist rows to the specialist fee');
    eq([a, b], [1905, 1906], 'the remainder rides on ONE row — the longest, the first of them on a tie');
    [a, b].forEach((v) => ok(Math.abs(v - 10.3 * 185) <= 1, `no concierge row moves by more than its own rounding (${v})`));
    [c, d].forEach((v) => ok(Math.abs(v - 10.1 * 125) <= 1, `nor any specialist row (${v})`));
  }

  group('lows — the Home Prep estimate prints its discount, so its rows reach its total');
  {
    const e = { jobId: 1, svc: 'prep', totTC: 4, totPS: 0, tcRate: 150, psRate: 100, tcFee: 600, psFee: 0, declutterTCHrs: 4,
      pkgCost: 0, pkgLabel: 'None — $0', smf: 0, prepItems: [{ cat: 'Painting', cost: 9000, note: '' }], prepEnabled: true,
      prepCost: 9000, prepFee: 2700, prepTCHrs: 0, havellinTotalFull: 3300, havellinTotal: 3240, fixedPrice: false,
      rush: false, rushAmt: 0, discountPct: 10, discountAmt: 60, vendors: [], vendorCost: 0, rooms: [], grandTotal: 12240 };
    const job = { id: 1, hvlId: 'HVL-0007', name: 'Butler', svc: 'prep', addr: '69 Beach Blvd', tc: 'Anthony Graziano',
      status: 'approved', payments: [] };
    B.jobs = [job];
    const h = B.clientEstimateHtml(e, job);
    has(h, 'Preferred Client Discount (10%)', 'the discount has a row');
    has(h, 'Applied to the declutter hours', 'saying what it came off — the fee on vendor spend is not labour');
    has(h, '- $60', 'for the amount taken off');
    const noDisc = B.clientEstimateHtml(Object.assign({}, e, { discountPct: 0, discountAmt: 0, havellinTotal: 3300 }), job);
    lacks(noDisc, 'Preferred Client Discount', 'and no row when there is no discount');
  }

  group('lows — the estimate’s Terms state a materials basis only when a package is quoted');
  {
    const e = { jobId: 1, svc: 'cleanout', totTC: 40, totPS: 60, tcRate: 150, psRate: 100, tcFee: 6000, psFee: 6000,
      pkgCost: 0, pkgLabel: 'None — $0', smf: 0, prepItems: [], prepEnabled: false, prepCost: 0, prepFee: 0,
      havellinTotalFull: 12000, havellinTotal: 12000, fixedPrice: false, rush: false, rushAmt: 0, discountPct: 0,
      discountAmt: 0, vendors: [], vendorCost: 0, rooms: [], docScope: 'full', grandTotal: 12000 };
    const job = { id: 1, hvlId: 'HVL-0007', name: 'Butler', svc: 'cleanout', addr: '69 Beach Blvd', tc: 'Anthony Graziano',
      status: 'approved', payments: [] };
    B.jobs = [job];
    const none = B.clientEstimateHtml(e, job);
    lacks(none, 'None — $0', 'no "None — $0" quoted back at the client');
    lacks(none, 'materials package is quoted', '⚠ and no sentence about a package that is not there — the fee table already shows none');
    lacks(none, 'Moving and packing materials are supplied', 'nor the basis a package would be billed on');
    const pkg = B.clientEstimateHtml(Object.assign({}, e, { pkgCost: 1500, pkgLabel: 'Estate Premium — $1,500',
      havellinTotalFull: 13500, havellinTotal: 13500, grandTotal: 13500 }), job);
    has(pkg, 'Moving and packing materials are supplied as a fixed package', 'a quoted package states its basis');
    has(pkg, '(Estate Premium — $1,500)', 'naming the package');
  }

  group('lows — the invoice bills paymentSplit’s running targets, never a second rounding');
  {
    const inv = liveBody('invoiceHtml(job, stage)');
    has(inv, 'paymentSplit(totalDepositBasis)', 'the deposit is the split’s deposit');
    has(inv, '_midSplit.deposit + _midSplit.midpoint', 'the cumulative 75% is the split’s deposit plus its midpoint');
    lacks(inv, 'Math.round(0.5 * totalDepositBasis)', 'the private 50% rounding is gone');
    lacks(inv, 'Math.round(0.75 * totalMidBasis)', 'and the private 75%');
    const s = sandbox({ fns: ['paymentSplit'] });
    const bad = [];
    for (let t = 10000; t < 10100; t++) {
      const p = s.paymentSplit(t);
      const invDep = p.deposit, invMid = (p.deposit + p.midpoint) - invDep, invFin = t - (p.deposit + p.midpoint);
      if (invMid !== p.midpoint || invFin !== p.final) bad.push(t);
    }
    eq(bad, [], 'with the basis unmoved, the three stage bills ARE the signed three on every residue');
  }
};
