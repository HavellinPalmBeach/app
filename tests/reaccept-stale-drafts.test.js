'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// ⚠⚠ A RAISE AFTER THE CLIENT'S YES ASKS THEM AGAIN · A DRAFT MADE BEFORE A PRICE CHANGE SAYS SO ·
// EDIT ESTIMATE WAITS FOR THE PIN (2026-09-29).
//
// Anthony's answers to the three things the Edit-estimate build left open: "1 yes, 2 warning is fine,
// 3 hide until PIN".
//
//   1. A price raised after the client accepted is a price they have not seen. `estimateSentTotal` and
//      `acceptedTotal` record the figures the client last RECEIVED and last SAID YES TO; priceAboveSent and
//      priceAboveAcceptance compare each with the approved estimate, and only a RAISE counts. The rail
//      reopens the send and then the acceptance, agreementReady holds the packet ('reaccept') and the
//      invoices with it — and the job stays WON the whole time, so staffing and the Job Plan stay open.
//   2. A Gmail draft is a snapshot. A draft made before an edit or a discount reads stale; its row says so,
//      its button becomes an ordinary send, and the confirming tap is refused on it. ⚠ That is the concurrent
//      stale-draft build's design, merged here (notePriceChange stamps the job; stale-draft.test.js drives it).
//      What this build folds into it is docDraftPending: a draft newer than the last send is still waiting —
//      the revised estimate's second draft, which the rail in item 1 asks for.
//   3. Edit estimate is withheld while a manager has the estimate, on the rail and at both doors.
//
// Measured on the real functions before any of it was built: accepted at $20,000, edited to $24,100 and
// re-approved, and the rail lit "Send for signature — DocuSign" with every row before it green; a packet
// drafted, a discount revoking the agreement, the manager re-approving — and the band's one filled button
// read "I've sent it"; and Edit estimate offered on four rows while the estimate waited on a PIN.
//
// Every rule is DRIVEN on the real functions. The source reads at the end are nets.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source, domStub } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const strip = (h) => String(h || '').replace(/<[^>]+>/g, '');
  const uniq = (a) => a.filter((x, i) => a.indexOf(x) === i);

  const BLK_FNS = ['priceChangeBlocker', 'discountOfferBlocker', 'estimateEditBlocker', 'isAgreementSigned', 'agreementSignature',
    'isAgreementSent', 'docSentAt', 'docKeyFor'];
  const PRICE_FNS = ['_approvedPriceAbove', 'priceAboveAcceptance', 'priceAboveSent', 'priceRaiseSentence', 'isJobWon', 'fmt', 'roundCents']
    .concat(BLK_FNS);
  const SENT_AT = '2026-09-29T10:00:00Z';
  // ⚠ Draft and change stamps are fixed in the PAST on purpose: notePriceChange stamps `priceChangedAt` with the
  // real clock, and a draft dated after it would read as fresher than the change.
  const T1 = '2026-08-01T09:00:00Z';        // the estimate's first send
  const DRAFTED = '2026-08-01T10:00:00Z';   // a draft
  const SENT = '2026-08-01T10:30:00Z';      // that draft confirmed sent
  const MARKED = '2026-08-01T11:00:00Z';    // the price moved
  const T3 = '2026-08-01T12:00:00Z';        // a draft made after the change
  const HELP = ['docDraftPending', 'draftIsStale', 'draftOutstanding', 'outstandingDrafts', 'staleDraftsOf', 'staleDraftNote',
    'staleDocName', '_draftDay', '_andJoin'];

  const rec = (total, o) => Object.assign({ approved: true, submitted: false, estimate: { havellinTotal: total } }, o || {});
  const wonJob = (o) => Object.assign({ id: 7, name: 'Butler', status: 'won', won: true, wonAt: '2026-09-20',
    acceptedTotal: 20000, estimateSentDate: 'September 18, 2026', estimateSentTotal: 20000 }, o || {});

  // ═══════════════════════════════════════════════════════════════════════════
  group('the rule: only a RAISE over what the client last received or accepted counts');
  {
    const P = sandbox({ fns: PRICE_FNS });
    eq(P.priceAboveAcceptance(wonJob(), rec(24100)), { was: 20000, now: 24100 },
      'accepted at $20,000 and approved at $24,100: a raise, with both figures');
    eq(P.priceAboveSent(wonJob(), rec(24100)), { was: 20000, now: 24100 }, 'and above the estimate the client received');
    eq(P.priceAboveAcceptance(wonJob(), rec(20000)), null, 'the same price is not a raise');
    eq(P.priceAboveAcceptance(wonJob(), rec(18000)), null, '⚠ a DISCOUNT is not a raise — it only lowers what the client agreed');
    eq(P.priceAboveSent(wonJob(), rec(18000)), null, 'and does not reopen the send either');
    // RESTATED 2026-10-01 (P17, Anthony's answer 6): money is carried to the cent, so the price a client received or accepted is
    // recorded to the cent and any raise of a cent or more asks again. Before P17 both figures were whole dollars, so a sub-dollar
    // difference ($20,000.40 against $20,000) was not a raise and a $20,000.40 acceptance was recorded as $20,000.
    eq(P.priceAboveAcceptance(wonJob(), rec(20000.004)), null, 'a difference below a cent is not a raise (float noise)');
    eq(P.priceAboveAcceptance(wonJob(), rec(20000.4)), { was: 20000, now: 20000.4 }, 'forty cents is: the client read $20,000 and would now read $20,000.40');
    eq(P.priceAboveAcceptance(wonJob({ acceptedTotal: 20000.4 }), rec(20001)), { was: 20000.4, now: 20001 }, 'and the figure accepted keeps its cents');
    // ⚠ Nothing is asked of a job recorded before today — there is no honest figure to compare.
    eq(P.priceAboveAcceptance(wonJob({ acceptedTotal: undefined }), rec(24100)), null,
      '⚠ a job with no accepted figure on record is asked nothing');
    eq(P.priceAboveSent(wonJob({ estimateSentTotal: undefined }), rec(24100)), null, 'nor one with no sent figure');
    eq(P.priceAboveAcceptance(wonJob({ acceptedTotal: 0 }), rec(24100)), null, 'a zero is not a price');
    // Not won: no acceptance to reopen — but the SEND reopens, before the yes as well as after it.
    const pre = wonJob({ status: 'approved', won: undefined, acceptedTotal: undefined });
    eq(P.priceAboveAcceptance(pre, rec(24100)), null, 'a client who has not said yes has no acceptance to reopen');
    eq(P.priceAboveSent(pre, rec(24100)), { was: 20000, now: 24100 },
      '⚠ the send reopens BEFORE Won too — or the client would be recorded as accepting a figure they never saw');
    eq(P.priceAboveSent(wonJob({ estimateSentDate: '' }), rec(24100)), null, 'an estimate never sent has nothing to compare');
    // Once the packet is out the client holds the current figure, and signing it is the acceptance.
    eq(P.priceAboveAcceptance(wonJob({ agrSent: true }), rec(24100)), null, '⚠ once the packet is sent nothing is asked');
    eq(P.priceAboveAcceptance(wonJob({ docState: { agreement: { sentAt: SENT_AT } } }), rec(24100)), null,
      'including a DocuSign send, which writes only the record');
    eq(P.priceAboveSent(wonJob({ agrSent: true }), rec(24100)), null, 'and the send does not reopen either');
    eq(P.priceAboveAcceptance(wonJob({ docState: { agreement: { sig: { signedOn: '2026-09-29', signedBy: 'Tripp Butler' } } } }),
      rec(24100)), null, 'nor once signed');
    // Only an APPROVED estimate is a price anybody can be asked to accept.
    eq(P.priceAboveAcceptance(wonJob(), rec(24100, { approved: false })), null, 'an estimate not yet approved is not a price');
    eq(P.priceAboveAcceptance(wonJob(), rec(24100, { approved: false, submitted: true })), null, 'nor one waiting on the manager');
    eq(P.priceAboveAcceptance(wonJob(), { approved: true }), null, 'nor a record with no estimate');
    // The record it is handed, never the store — and the store only when handed nothing.
    P.estimateStore = { 7: rec(24100) };
    eq(P.priceAboveAcceptance(wonJob(), rec(20000)), null, '⚠ it answers for the record it is HANDED, not the store');
    P.estimateStore = { 7: rec(20000) };
    eq(P.priceAboveAcceptance(wonJob(), rec(24100)), { was: 20000, now: 24100 }, 'in both directions');
    P.estimateStore = { 7: rec(24100) };
    eq(P.priceAboveAcceptance(wonJob(), null), { was: 20000, now: 24100 }, 'handed nothing, it reads the store');
    eq(P.priceAboveAcceptance(null, rec(24100)), null, 'no job, no answer');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('priceRaiseSentence: one wording, read by the manager’s PIN on screen and the concierge’s email');
  {
    const P = sandbox({ fns: PRICE_FNS });
    eq(P.priceRaiseSentence(wonJob(), rec(24100)),
      'The client accepted $20,000 and the approved estimate is now $24,100. Send them the revised estimate and record their acceptance again before the signing packet goes out.',
      'after the yes: send the revised estimate and record the acceptance again');
    eq(P.priceRaiseSentence(wonJob({ status: 'approved', won: undefined, acceptedTotal: undefined }), rec(24100)),
      'The estimate the client has shows $20,000 and the approved one is now $24,100. Send them the revised estimate before they decide.',
      'before the yes: send the revised estimate before they decide');
    has(P.priceRaiseSentence(wonJob({ estimateSentTotal: 24100 }), rec(24100)), 'record their acceptance again',
      'a revised estimate already sent still owes the new yes');
    eq(P.priceRaiseSentence(wonJob(), rec(20000)), '', 'nothing to say when the price did not rise');
    eq(P.priceRaiseSentence(wonJob(), rec(18000)), '', 'nor on a discount');
    eq(P.priceRaiseSentence(wonJob({ acceptedTotal: undefined, estimateSentTotal: undefined }), rec(24100)), '',
      'nor on a job with no figures on record');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the two figures are written where the facts happen — the send, and the yes');
  {
    const M = sandbox({ fns: ['markEstimateSent', 'roundCents'], stubs: {
      saveJobs() {}, syncJobToSheets() {}, updateApprovalUI() {}, _dashRedraw() {}, showSyncBadge() {} } });
    M.jobs = [{ id: 7, name: 'Butler' }];
    M.currentEstimate = { jobId: 7, havellinTotal: 20000.4 };
    M.markEstimateSent();
    // RESTATED 2026-10-01 (P17, answer 6): recorded to the cent (it was 20000, in whole dollars).
    eq(M.jobs[0].estimateSentTotal, 20000.4, 'marking the estimate sent records the price that went, to the cent');
    ok(!!M.jobs[0].estimateSentDate, 'beside the date, as before');
    M.currentEstimate = { jobId: 7, havellinTotal: 24100 };
    M.markEstimateSent();
    eq(M.jobs[0].estimateSentTotal, 24100, 'the revised estimate going out moves it to the new price');
    M.currentEstimate = { jobId: 7, havellinTotal: 0 };
    M.markEstimateSent();
    eq(M.jobs[0].estimateSentTotal, 24100, 'an estimate with no total writes no figure — a zero is not a price');
  }

  function wonBed(jobO, recO) {
    const said = { badges: [], fb: [], alerts: [] };
    const d = domStub({});
    const W = sandbox({
      fns: ['openWonModal', 'confirmMarkWon', '_todayStr', '_ymdLocal', 'roundCents', 'fmt'].concat(PRICE_FNS),
      vars: ['WON_MODAL_COPY', '_wonJobId'],
      stubs: {
        document: d, saveJobs() {}, syncJobToSheets() {}, renderJobs() {}, renderClientDashboard() {},
        showSyncBadge(m) { said.badges.push(m); }, showFB(el, k, m) { said.fb.push({ el, k, m }); },
        confirm() { return true; }, alert(m) { said.alerts.push(m); }, approvedBy: 'Anthony Graziano', _dashboardJobId: 0,
      },
    });
    W.jobs = [wonJob(Object.assign({ wonMethod: 'call', wonNote: 'Said yes on the phone', wonBy: 'Ashley Jerome' }, jobO || {}))];
    W.estimateStore = { 7: rec(24100, recO) };
    // ⚠ openWonModal BLANKS the method and the note and resets the date to today, as the form a person meets
    // does, so the answers go in AFTER it opens — filling them first tests a form nobody sees.
    const fill = (method, date, note) => {
      d.getElementById('won-method').value = method;
      d.getElementById('won-date').value = date;
      d.getElementById('won-note').value = note;
    };
    return { W, d, said, fill, job: W.jobs[0] };
  }

  group('the yes: the modal asks about the NEW figure, and a second acceptance is recorded — not a second win');
  {
    const { W, d, said, fill, job } = wonBed();
    W.openWonModal(7);
    eq(d.getElementById('won-method').value, '', 'the modal opens with no method chosen');
    eq(d.getElementById('won-note').value, '', 'and no note carried over');
    eq(d.getElementById('won-title').textContent, 'Client Accepted the Revised Price', 'the modal names what is being accepted');
    has(d.getElementById('won-sub').innerHTML, '<strong>$20,000</strong> on 2026-09-20', 'the figure they accepted, and when');
    has(d.getElementById('won-sub').innerHTML, '<strong>$24,100</strong>', 'and the one they are being asked about now');
    has(d.getElementById('won-sub').innerHTML, 'nothing about staffing changes', 'and that the job is already won');
    eq(d.getElementById('won-go').textContent, 'Record Acceptance →', 'the button records an acceptance');
    eq(d.getElementById('won-modal').style.display, 'flex', 'it opens');
    fill('email', '2026-09-28', 'Yes to the revised figure, by email');
    W.confirmMarkWon();
    eq(job.acceptedTotal, 24100, '⚠⚠ the price they said yes to is now the approved one');
    eq(job.won, true, 'still won');
    eq(job.status, 'won', 'reading won');
    eq(job.wonAt, '2026-09-28', 'the acceptance is dated as recorded');
    eq(job.wonMethod, 'email', 'with how they said it');
    eq((job.priorAcceptances || []).length, 1, '⚠ the earlier yes is kept, not overwritten');
    eq((job.priorAcceptances || [])[0], { total: 20000, at: '2026-09-20', method: 'call', note: 'Said yes on the phone', by: 'Ashley Jerome' },
      'with its figure, date, method, note and who recorded it');
    has(said.badges.join(' | '), 'revised price recorded', 'the confirmation says what was recorded');
    lacks(said.badges.join(' | '), 'staffing unlocked', 'and announces no win that already happened');
    eq(W.priceAboveAcceptance(job, W.estimateStore[7]), null, 'nothing is outstanding any more');
  }
  {
    // ⚠ Every open writes all three lines — the second question's words must not survive onto the first.
    const { W, d } = wonBed();
    W.openWonModal(7);
    W.jobs.push({ id: 8, name: 'Ellsworth', status: 'approved' });
    W.estimateStore[8] = rec(15000);
    W.openWonModal(8);
    eq(d.getElementById('won-title').textContent, 'Client Accepted the Estimate', '⚠ a first acceptance opened next reads as one');
    has(d.getElementById('won-sub').innerHTML, 'This marks the job <strong>won</strong>', 'with the first-acceptance line');
    lacks(d.getElementById('won-sub').innerHTML, '$24,100', 'and nothing left over from the last client');
    eq(d.getElementById('won-go').textContent, 'Mark as Won →', 'and its own button');
  }
  {
    const { W, said, fill } = wonBed();
    W.jobs.push({ id: 8, name: 'Ellsworth', status: 'approved' });
    W.estimateStore[8] = rec(15000);
    W.openWonModal(8);
    fill('email', '2026-09-28', 'Accepted by email');
    W.confirmMarkWon();
    const j8 = W.jobs[1];
    eq(j8.won, true, 'a first acceptance wins the job, as it always did');
    eq(j8.acceptedTotal, 15000, 'and records the price the client said yes to');
    eq(j8.priorAcceptances, undefined, 'with no earlier acceptance to keep');
    has(said.badges.join(' | '), 'staffing unlocked', 'announced as a win');
  }
  {
    const { W, d, said } = wonBed({}, { approved: false });
    W.openWonModal(7);
    eq(said.alerts.length, 1, 'an unapproved estimate cannot be accepted — refused');
    ok(d.getElementById('won-modal').style.display !== 'flex', 'and the modal does not open');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // The rail — the real jobTimeline and jobTimelineActions, the fixture shape price-lock-won-status uses.
  const RAIL = sandbox({
    fns: uniq(['agrApprovalWithdrawn', 'jobTimeline', 'jobTimelineNext', 'jobTimelineActions', 'esignSignedCopyGaps', 'esignFiledCopies', 'agreementHandOverDraftNote', 'docReadOnlyWord', 'depositVoidFlag', 'agreementHandedOverInPerson',
      'estimateSubmitBlocker', 'jobStageDoc', 'docReadiness', 'docDraftOnly', 'docTitle', 'docWord', '_jtDocSecondaries',
      'docPreviewOnly', 'agreementReady', 'estimateNoteGaps', 'paymentSplit', 'unscoredRoomNames',
      'jobActivationBlockers', 'estimateContractBlocker', 'estimateContractMissing', 'isDecedentJob', 'invFiduciaryMode',
      'matterTypeOf', 'svcHasDocStep', 'docTierOf', 'docTierDef', 'isJobFunded', 'jobPayments', 'stagePaidTotal', 'paymentCounts', 'paymentLive', 'isRefundRecord',
      'depositPaidTotal', 'depositTargetFor', 'esignProviderKey', 'esignAvailable', 'esignJobWatches',
      '_jtSendAction', '_jtDocViews', '_jtDraftLink', '_jtDriveLink', 'estimateOutForApproval', 'jtDraftLine',
      // P10 (merged here): the final's row waits for logged hours.
      'finalAwaitsHours', 'estimateIsFeeOnly', 'estDeclutterHrs', 'jobLogEntries', 'jobOnProbateTrack', 'matterDef', '_ymdLocal', '_localDateOf', 'paymentStageWord', 'estimateTierMoved', 'docTierScope', 'seedDocScopeFromJob', 'estimateDocScope', 'docScopeDef', 'docTierWord', 'docScopeWord', 'finalCrewOnlyWarn', 'roundCents', 'fmtHrs', 'fmt', 'estateAuthority']
      .concat(HELP, PRICE_FNS)),
    vars: ['JT_SHORT', 'JT_NEXT', 'AGR_SIG_METHODS', 'ESIGN_PROVIDERS', 'ESIGN_PROVIDER_KEY', 'JT_ROW_DOC', 'DOC_READY_WHY',
      'DOC_KIND_WORD', 'DOC_STAGE_WORD', 'DOC_ACTIONS', 'ESTIMATE_CONTRACT_FIELDS', 'MATTER_TYPES', 'DOC_TIERS',
      'DOC_TIER_FROM_SCOPE', 'DECEDENT_SERVICES', 'JOB_STEPS', 'currentInvStage'],
    stubs: { REQUIRE_WALKTHROUGH_NOTES: false, SHEETS_SYNC_URL: 'https://script.google.com/macros/s/x/exec' },
  });
  const room = (name) => ({ name, vol: 3, cplx: 3, note: 'seen' });
  const estAt = (total) => ({ estimate: { rooms: [room('Kitchen'), room('Primary Bedroom')], havellinTotal: total, collections: [] } });
  function rail(jobO, recO) {
    const job = Object.assign({ id: 7, name: 'Butler', created: 'Sep 8, 2026', svc: 'downsizing', status: 'won', won: true,
      walkthrough: '2020-01-01', approved: true, estimateSentDate: 'September 9, 2026', estimateSentTotal: 20000,
      acceptedTotal: 20000, wonAt: '2026-09-12', wonBy: 'Ashley Jerome', wonMethod: 'email' }, jobO || {});
    const r = Object.assign({ savedAt: 1, approved: true, submitted: false }, estAt(24100), recO || {});
    RAIL.estimateStore = { 7: r }; RAIL.jobs = [job];
    const rows = RAIL.jobTimeline(job, r, [], []);
    const by = {};
    rows.forEach((x) => { by[x.key] = x; });
    const acts = (key) => (by[key] ? RAIL.jobTimelineActions(by[key], job, r) : { primary: null, secondary: [], doc: null });
    const all = [];
    rows.forEach((x) => {
      const a = acts(x.key);
      a.secondary.concat(a.doc ? a.doc.acts : []).concat(a.primary ? [a.primary] : [])
        .forEach((y) => all.push({ row: x.key, label: y.label, call: y.call }));
    });
    const lit = RAIL.jobTimelineNext(rows);
    return { job, rec: r, rows, by, acts, all, lit: lit ? lit.key : '' };
  }
  const empty = { key: '', state: '', done: null, sub: '', at: '', by: '', todo: '' };
  const row = (R, k) => R.by[k] || empty;

  group('the rail: a raise after Won reopens the send, then the acceptance — and the job stays won');
  {
    const R = rail();
    eq(R.lit, 'estimate_sent', '⚠⚠ the band lights the send again — the client has the estimate at $20,000');
    eq(row(R, 'estimate_sent').done, false, 'sent is not done while the approved price is above the one that went');
    eq(row(R, 'estimate_sent').at, '', 'and it carries no date — a lit row reading "Sep 9" says it happened');
    eq(row(R, 'estimate_sent').todo, 'Send the revised estimate to the client', 'the band says what to do');
    eq(row(R, 'estimate_sent').sub, 'Sent at $20,000 — the approved estimate is now $24,100, so the client needs the revised one',
      'the row names both figures');
    const p = R.acts('estimate_sent').primary || {};
    eq(p.label, '&#9993; Send revised estimate', 'the one filled button sends the REVISED estimate');
    eq(p.call, "docAction(7,'estimate','send')", 'through the one send path');
    eq(row(R, 'client_accepted').done, false, '⚠ and the acceptance is undone until the new figure is accepted');
    eq(row(R, 'client_accepted').at, '', 'with no date');
    eq(row(R, 'client_accepted').by, '', 'and nobody named as having accepted it');
    eq(row(R, 'client_accepted').sub, 'Accepted $20,000 — the approved estimate is now $24,100, so they are asked again', 'saying why');
    eq(row(R, 'client_accepted').state, 'waiting', 'waiting behind the send');
    eq(RAIL.isJobWon(R.job), true, '⚠ the job is still WON — staffing and the Job Plan stay open');
    eq(row(R, 'agreement_sent').done, false, 'the packet has not gone');
    ok(!R.acts('agreement_sent').primary, 'and nothing offers to send it');
    const agrDoc = R.acts('agreement_sent').doc || {};
    has(agrDoc.title || '', 'PREVIEW', 'the packet may be READ — it carries the new price — and says it is a preview');
    ok((agrDoc.acts || []).some((a) => /'agreement','view'/.test(a.call)), 'with View');
    ok(!(agrDoc.acts || []).some((a) => /'print'/.test(a.call)), 'and no Print');
    eq(R.acts('deposit_invoiced').doc, null,
      '⚠ the deposit invoice is not offered at all — it would ask for money under a figure the client has not agreed');
  }
  {
    // A revised estimate drafted after the first one went: the rail waits on its confirming tap.
    const R = rail({ docState: { estimate: { draftedAt: SENT_AT, sentAt: '2026-09-09T10:00:00Z', provider: 'gmail',
      draftUrl: 'https://mail.google.com/mail/u/0/#drafts?compose=abc' } } });
    const p = R.acts('estimate_sent').primary || {};
    eq(p.label, '&#10003; I&rsquo;ve sent it',
      '⚠⚠ a draft newer than the last send waits on its confirming tap — the old test read it as sent the moment it was drafted');
    eq(p.call, "markDocSent(7,'estimate')", 'which records the send');
    eq(row(R, 'estimate_sent').sub, 'Drafted — read it, send it, then confirm', 'the drafted line');
    ok(((R.acts('estimate_sent').doc || {}).acts || []).some((a) => a.call === "openDocDraft(7,'estimate')"),
      'and the draft is one tap away');
  }
  {
    // The revised estimate confirmed as sent: the acceptance is the lit step.
    const R = rail({ estimateSentDate: 'September 29, 2026', estimateSentTotal: 24100,
      docState: { estimate: { draftedAt: '2026-09-29T09:00:00Z', sentAt: SENT_AT } } });
    eq(row(R, 'estimate_sent').done, true, 'once the revised estimate goes, the send is done again');
    eq(R.lit, 'client_accepted', '⚠⚠ and the acceptance is the lit step');
    eq(row(R, 'client_accepted').todo, 'Get the client’s decision on the revised price', 'the band says what is being asked');
    const p = R.acts('client_accepted').primary || {};
    eq(p.label, '&#10003; Client accepted the revised price', 'the button names the revised price');
    eq(p.call, 'openWonModal(7)', 'through the one acceptance modal');
    ok(R.acts('client_accepted').secondary.some((s) => /openCloseoutModal\(7\)/.test(s.call)),
      'with Mark lost beside it — a client can say no to a higher price');
  }
  {
    // The new yes recorded.
    const R = rail({ estimateSentDate: 'September 29, 2026', estimateSentTotal: 24100, acceptedTotal: 24100, wonAt: '2026-09-29' });
    eq(row(R, 'client_accepted').done, true, 'accepted again');
    eq(row(R, 'client_accepted').at, '2026-09-29', 'dated when they said it');
    eq(R.lit, 'agreement_sent', 'and the packet is the next step');
    eq((R.acts('agreement_sent').doc || {}).title, 'Signing Packet', 'no longer a preview');
    ok(!!R.acts('agreement_sent').primary, 'with its send button');
  }

  group('⚠ a job recorded before today is asked nothing — its rail is the same at either price');
  {
    const legacy = { estimateSentTotal: undefined, acceptedTotal: undefined };
    const shape = (R) => R.rows.map((x) => [x.key, x.state, x.done, x.sub, x.at].join('|')).join('\n');
    const a = rail(legacy, estAt(20000));
    const b = rail(legacy);
    eq(shape(b), shape(a), 'the same rows, states, lines and dates at $20,000 and at $24,100');
    eq(b.lit, 'agreement_sent', 'the packet is next, as it always was');
  }
  {
    // ⚠ A LIMIT, RECORDED RATHER THAN HIDDEN: an estimate sent before this build carries no sent figure, so a raise
    // after an acceptance recorded today reopens the acceptance and not the send. The manager's PIN and the
    // concierge's email both say to send the revised estimate first (priceRaiseSentence).
    const R = rail({ estimateSentTotal: undefined });
    eq(row(R, 'estimate_sent').done, true, 'the send stays done — there is no sent figure to compare');
    eq(R.lit, 'client_accepted', 'and the acceptance is the lit step');
  }

  group('before the yes: a raise reopens the send and nothing else');
  {
    const R = rail({ status: 'approved', won: undefined, acceptedTotal: undefined, wonAt: undefined, wonBy: undefined,
      wonMethod: undefined });
    eq(R.lit, 'estimate_sent', 'the send is lit again — the client is deciding on a figure they no longer have');
    eq((R.acts('estimate_sent').primary || {}).label, '&#9993; Send revised estimate', 'the revised estimate');
    eq(row(R, 'client_accepted').sub, '', 'and the acceptance row asks nothing — nobody has said yes yet');
    eq(row(R, 'client_accepted').done, false, 'it is simply not done');
  }

  group('⚠ a client who was won, walked away and came back has no acceptance to reopen');
  {
    // confirmMarkLost clears `won` on a job with no deposit and leaves `acceptedTotal` where it was, and an estimate
    // event on a lost job moves it back into the pipeline (estimateEventStatus: "a lost job's comeback included").
    // The old yes was withdrawn when they walked away, so the comeback is a first decision, not a re-acceptance.
    const back = { status: 'approved', won: false, lostAt: '2026-09-15T12:00:00Z', lostReason: 'price' };
    const P = sandbox({ fns: PRICE_FNS });
    eq(P.priceAboveAcceptance(wonJob(back), rec(24100)), null,
      '⚠ the acceptance on record belongs to a decision the client withdrew — nothing to reopen');
    eq(P.priceRaiseSentence(wonJob(Object.assign({ estimateSentTotal: 24100 }, back)), rec(24100)), '',
      'the manager is not told to record an acceptance again — there is none standing');
    has(P.priceRaiseSentence(wonJob(back), rec(24100)), 'before they decide',
      'with the old estimate still in their hands, they are told to send the revised one before the client decides');
    const R = rail(Object.assign({ estimateSentTotal: 24100 }, back));
    eq(R.lit, 'client_accepted', 'the revised estimate is out, so the decision is the lit step');
    eq((R.acts('client_accepted').primary || {}).label, '&#10003; Client accepted — mark won',
      '⚠ and it asks for a first yes, not a yes to a "revised price"');
    eq(row(R, 'client_accepted').sub, '', 'with no line about an acceptance that no longer stands');
    const { W, d, said, fill } = wonBed(back);
    W.openWonModal(7);
    eq(d.getElementById('won-title').textContent, 'Client Accepted the Estimate', 'the modal asks the first-acceptance question');
    lacks(d.getElementById('won-sub').innerHTML, 'nothing about staffing changes', 'and never says the job is already won');
    fill('email', '2026-09-28', 'Came back and accepted by email');
    W.confirmMarkWon();
    eq(W.jobs[0].won, true, 'the yes wins the job again');
    eq(W.jobs[0].acceptedTotal, 24100, 'at the figure they accepted now');
    has(said.badges.join(' | '), 'staffing unlocked', 'announced as a win, which is what it is');
  }

  group('a discount reopens nothing, and nothing reopens once the packet is out');
  {
    const low = rail({}, estAt(18000));
    eq(row(low, 'estimate_sent').done, true, 'a discount leaves the send done — the client holds a higher figure, not a lower one');
    eq(row(low, 'client_accepted').done, true, 'and the acceptance stands');
    eq(low.lit, 'agreement_sent', 'the packet is next');
    const out = rail({ agrSent: true, agrSentAt: 'September 28, 2026' });
    eq(row(out, 'estimate_sent').done, true, '⚠ with the packet out the rows do not reopen — the packet carries the current price');
    eq(row(out, 'client_accepted').done, true, 'and signing it is the acceptance');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the packet and the invoices wait for the new yes: agreementReady says reaccept, and every reader inherits it');
  {
    const G = sandbox({ fns: uniq(['agreementReady', 'agrApprovalBlocker', 'docReadiness', 'docPreviewOnly', 'docReadOnlyWord',
      'docDraftOnly', 'roundCents', 'fmt'].concat(PRICE_FNS)), vars: ['DOC_READY_WHY'] });
    const j = wonJob(), r = rec(24100);
    G.jobs = [j]; G.estimateStore = { 7: r };
    eq(G.agreementReady(j, r), 'reaccept', '⚠⚠ a raise the client has not accepted holds the packet');
    eq(G.agreementReady(wonJob(), rec(20000)), '', 'at the accepted price it is ready');
    eq(G.agreementReady(wonJob(), rec(18000)), '', 'and after a discount');
    eq(G.agreementReady(wonJob({ status: 'approved', won: undefined }), r), 'notwon', 'a client who has not said yes is "notwon", not "reaccept"');
    eq(G.agreementReady(j, rec(24100, { approved: false })), 'estimate', 'an unapproved estimate is refused first');
    eq(G.agreementReady(wonJob({ acceptedTotal: undefined }), r), '', 'a job recorded before today is ready, as it always was');
    eq(G.docReadiness('agreement', j, r),
      'The client accepted $20,000 and the approved estimate is now $24,100. Send them the revised estimate and record their acceptance again before the agreement goes out.',
      'the packet’s refusal names both figures and the fix');
    eq(G.docReadiness('invoice', j, r),
      'The client accepted $20,000 and the approved estimate is now $24,100. Send them the revised estimate and record their acceptance again before the invoice goes out.',
      '⚠ and so does the invoice’s — a deposit on the new price is money asked for under a figure nobody agreed');
    eq(G.docReadiness('estimate', j, r), '', 'the estimate itself is never held — it is the thing to send');
    eq(G.docPreviewOnly('agreement', j, r), true, 'the packet may be READ — the concierge talks the client through the new price');
    eq(G.docReadOnlyWord('agreement', j, r), ' — PREVIEW', 'titled a preview');
    eq(G.docPreviewOnly('invoice', j, r), false, 'an invoice is not previewed');
    eq(G.agrApprovalBlocker(7), 'reaccept', 'the Agreement tab asks the same rule');
  }

  group('the doors: nothing stamps, files or asks for money while the new yes is outstanding');
  {
    const said = { fb: [], notices: [], primes: 0, timers: 0, fetches: 0 };
    const D = sandbox({
      fns: uniq(['ensureAgreementApproved', 'approveAgreementNow', 'stripePaymentLink', 'agreementReady', 'docReadiness', 'docState',
        '_jobTouch', 'roundCents', 'fmt'].concat(PRICE_FNS)),
      vars: ['DOC_READY_WHY', 'PAYMENT_STAGES', 'currentAgrJobId'],
      stubs: {
        _primeAgreementFor() { said.primes++; return true; }, setTimeout() { said.timers++; }, saveJobs() {}, syncJobToSheets() {},
        showFB(el, k, m) { said.fb.push({ el, k, m }); }, _dashFbTarget(id) { return id; }, renderAgreement() {}, _dashRedraw() {},
        _docNotice(k, m) { said.notices.push({ k, m }); }, SHEETS_SYNC_URL: 'https://script.google.com/macros/s/x/exec',
        fetch() { said.fetches++; return { then() { return this; }, catch() { return this; } }; },
        _appsScriptPost() { said.fetches++; }, _stripeShowLink() {},
      },
    });
    D.jobs = [wonJob()]; D.estimateStore = { 7: rec(24100) }; D.currentAgrJobId = 7;
    eq(D.ensureAgreementApproved(7), 'reaccept', 'the stamp refuses');
    eq(D.jobs[0].agrApproved, undefined, '⚠ nothing is approved');
    eq(said.primes, 0, 'nothing is primed');
    eq(said.timers, 0, 'and nothing is filed to Drive');
    D.approveAgreementNow();
    eq(said.fb.length, 1, 'Approve & File refuses');
    eq((said.fb[0] || {}).k, 'warn', 'as a warning');
    has((said.fb[0] || {}).m, 'accepted $20,000', 'naming what the client accepted');
    has((said.fb[0] || {}).m, 'now $24,100', 'and the price that stands');
    try { D.stripePaymentLink(7, 'deposit'); } catch (e) { said.threw = String(e); }
    eq(said.fetches, 0, '⚠ no payment link is minted');
    const n = said.notices[said.notices.length - 1] || {};
    eq(n.k, 'warn', 'the payment door refuses');
    has(n.m, 'before the invoice goes out', 'in the invoice’s words, naming both figures');
    has(n.m, '$24,100', 'the new price');
    eq(said.threw, undefined, 'and throws nothing');
  }

  {
    // The retired Agreement tab still paints when anything primes it, and its banner is a statement about the job.
    const d = domStub({});
    const U = sandbox({
      fns: uniq(['updateAgrUI', 'agreementReady', 'agrApprovalBlocker', 'agrApprovalWithdrawn', 'docReadiness', 'isJobFunded',
        'jobPayments', 'stagePaidTotal', 'paymentCounts', 'depositPaidTotal', 'depositTargetFor', 'roundCents', 'fmt', 'paymentSplit', 'paymentLive', 'isRefundRecord'].concat(PRICE_FNS)),
      vars: ['DOC_READY_WHY', 'currentAgrJobId'],
      stubs: { document: d },
    });
    U.jobs = [wonJob()]; U.estimateStore = { 7: rec(24100) }; U.currentAgrJobId = 7;
    U.updateAgrUI();
    has(d.getElementById('agr-approval-badge').innerHTML, 'Awaiting Re-acceptance', '⚠ the Agreement tab says the client is asked again');
    const b = d.getElementById('agr-banner-wrap').innerHTML;
    has(b, 'The client accepted $20,000 and the approved estimate is now $24,100', 'naming both figures');
    has(b, 'Client accepted the revised price', 'and the button on the timeline that records it');
    lacks(b, 'has not accepted the estimate yet', '⚠ never that the client has not accepted — they did, at a lower price');
    eq(d.getElementById('btn-agr-approve').style.display, 'none', 'Approve & File is withheld');
    eq(d.getElementById('btn-agr-sent').style.display, 'none', 'and so is the sent step');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the status reads both facts: Won · Awaiting Re-acceptance');
  {
    const V = sandbox({ fns: uniq(['jobStatusView', '_jobStatusCell'].concat(PRICE_FNS)), vars: ['JOB_STATUS_LABELS', 'JOB_STATUS_DOT'] });
    V.estimateStore = { 7: rec(24100) };
    const v = V.jobStatusView(wonJob());
    eq(v.label, 'Won · Awaiting Re-acceptance', '⚠⚠ a won client whose price went up reads as both facts');
    eq(v.key, 'won', 'keyed won — the Won list and the Status sort keep it where it is');
    eq(v.dot, 's-pending', 'with the amber dot — something is outstanding');
    has(strip(V._jobStatusCell(wonJob())), 'Won · Awaiting Re-acceptance', 'the list cell says the same');
    V.estimateStore = { 7: rec(20000) };
    eq(V.jobStatusView(wonJob()).label, 'Won', 'at the accepted price it reads Won');
    V.estimateStore = { 7: rec(24100) };
    eq(V.jobStatusView(wonJob({ acceptedTotal: undefined })).label, 'Won', 'a job recorded before today reads Won');
    eq(V.jobStatusView(wonJob({ status: 'pending' })).label, 'Won · Pending Re-approval', 'a revised price with the manager reads as that');
    eq(V.jobStatusView(wonJob({ status: 'active' })).label, 'Active', 'an active job reads Active');
    eq(V.jobStatusView(wonJob({ agrSent: true })).label, 'Won', 'once the packet is out there is nothing outstanding to say');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the manager and the concierge are told: checkPin warns on screen, the email carries the same sentence');
  {
    const ST_FNS = uniq(['checkPin', 'estimateApprovalTierBlocker', 'estimateTierMoved', 'docTierScope', 'seedDocScopeFromJob', 'estimateDocScope', 'docScopeDef', 'docTierWord', 'docScopeWord', 'resolvePin', 'unscoredRoomNames', 'estimateContractBlocker', 'estimateContractMissing',
      'isDecedentJob', 'svcHasDocStep', 'matterTypeOf', 'docTierOf', 'docTierDef', 'buildLockSnapshot', 'estimateEventStatus',
      'dashNotice', '_dashRedraw', '_jobBandHost'].concat(PRICE_FNS));
    const ST_VARS = ['_dashboardJobId', '_dashNotice', 'estimateApproved', 'estimateSubmitted', 'discountRevision', 'approvedBy',
      'approvedAt', 'MANAGER_PINS', 'ESTIMATE_CONTRACT_FIELDS', 'MATTER_TYPES', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE',
      'DECEDENT_SERVICES', 'JOB_STEPS'];
    const told = [];
    let ctx = null;
    ctx = sandbox({ fns: ST_FNS, vars: ST_VARS, stubs: {
      document: domStub({ 'pin-input': '3010' }), REQUIRE_WALKTHROUGH_NOTES: false,
      saveJobs() {}, syncJobToSheets() {}, renderClientEstimate() {}, applyEstimateLock() {}, closePinModal() {},
      renderClientDashboard() {}, _repaintJobBand() {}, setTimeout() {}, exportEstimateToDrive() {}, saveFolderEstimate() {},
      notifyTCOfDecision(j, e, d) { told.push(d); },
      // What the real saveEstimateState does: rebuild the store record from the page's approval globals.
      saveEstimateState() {
        ctx.estimateStore[ctx.currentEstimate.jobId] = { approved: ctx.estimateApproved, submitted: ctx.estimateSubmitted,
          estimate: ctx.currentEstimate };
      },
    } });
    ctx.jobs = [wonJob({ status: 'pending', approved: false, svc: 'downsizing' })];
    ctx.currentEstimate = { jobId: 7, havellinTotal: 24100, rooms: [{ name: 'Kitchen', vol: 3, cplx: 3, note: 'x' }] };
    ctx.estimateStore = { 7: { approved: false, submitted: true, estimate: ctx.currentEstimate } };
    ctx.estimateSubmitted = true;
    ctx.checkPin();
    eq(ctx.jobs[0].status, 'won', 'the re-approval returns the won client to won');
    const n = ctx._dashNotice || {};
    eq(n.type, 'warn', '⚠⚠ and the manager is told, where the PIN was typed');
    eq(n.msg, 'Approved. The client accepted $20,000 and the approved estimate is now $24,100. Send them the revised estimate and record their acceptance again before the signing packet goes out.',
      'in the shared sentence');
    eq(told, ['approved'], 'and the concierge is emailed');
  }
  {
    // ⚠ RESTATED 2026-09-30 (P16, B17): the decision email is a Gmail draft through sendInternalEmail now, not a
    // mailto: of its own, so the lines are read where they are handed over. The route itself (the draft, and the
    // mailto fallback with its From-address warning) is driven in tests/p16-payments-integrations.test.js.
    const opened = [];
    const N = sandbox({ fns: uniq(['notifyTCOfDecision', 'firstName', 'roundCents', 'fmt'].concat(PRICE_FNS)), stubs: {
      assignedTCContact() { return { name: 'Ashley Jerome', email: 'ashley@havellinpalmbeach.com' }; },
      sendInternalEmail(to, subject, lines) { opened.push({ to, subject, text: lines.join('\n') }); } } });
    N.estimateStore = { 7: rec(24100) };
    N.notifyTCOfDecision(wonJob(), { havellinTotal: 24100 }, 'approved', '');
    eq((opened[0] || {}).to, 'ashley@havellinpalmbeach.com', 'addressed to the concierge');
    const bodyOf = (m) => String((m && m.text) || '');
    has(bodyOf(opened[0]), 'The client accepted $20,000 and the approved estimate is now $24,100', 'the concierge reads the same sentence');
    has(bodyOf(opened[0]), 'open Butler from the Client Dashboard', 'and is sent to a screen that exists');
    lacks(bodyOf(opened[0]), 'Client Estimate tab', 'never the retired tab');
    N.notifyTCOfDecision(wonJob(), { havellinTotal: 24100 }, 'denied', 'Go back to the client first');
    lacks(bodyOf(opened[1]), 'approved estimate is now', 'a denial says nothing about a raise');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ⚠ ITEM 2 IS MAIN'S DESIGN NOW (the concurrent stale-draft build, merged 2026-09-29): the JOB carries when the
  // price moved (notePriceChange → priceChangedAt / priceChangeWhy) and a draft made before it reads stale. What
  // this build folds into it is the SEND-ORDER rule, docDraftPending: a draft newer than the last send is waiting
  // on its tap. Without it the revised estimate's second draft — the one case the rail asks for a second send —
  // read as already sent: no "I've sent it", and no price change could ever flag it. These groups drive that
  // rule through every reader main's design routes through it; stale-draft.test.js covers the rest.
  group('the send-order rule: a draft newer than the last send waits on its tap — and a price change reaches it');
  {
    const S = sandbox({ fns: HELP });
    eq(S.docDraftPending({ draftedAt: DRAFTED }), true, 'drafted, nothing sent: waiting on its tap');
    eq(S.docDraftPending({ draftedAt: DRAFTED, sentAt: SENT }), false, 'confirmed: not waiting');
    eq(S.docDraftPending({ draftedAt: DRAFTED, sentAt: T1 }), true,
      '⚠⚠ a SECOND draft after a send is waiting — `draftedAt && !sentAt` read it as sent');
    eq(S.docDraftPending({ draftedAt: 'rubbish', sentAt: T1 }), false, 'an unreadable stamp behind a send reads as sent, as before');
    eq(S.docDraftPending({}), false, 'nothing drafted');
    eq(S.docDraftPending(null), false, 'no record');
    const moved = (o) => Object.assign({ id: 7, priceChangedAt: MARKED, priceChangeWhy: 'discount' }, o || {});
    eq(S.draftIsStale(moved(), { draftedAt: DRAFTED }), true, 'a waiting draft made before the price moved is stale');
    eq(S.draftIsStale(moved(), { draftedAt: T3 }), false, '⚠ a FRESH draft after the change is not — a change never condemns a newer draft');
    eq(S.draftIsStale(moved(), { draftedAt: DRAFTED, sentAt: SENT }), false, 'a document already SENT is not a stale draft');
    eq(S.draftIsStale({ id: 7 }, { draftedAt: DRAFTED }), false, 'no price change, nothing stale');
    const second = moved({ docState: { estimate: { draftedAt: DRAFTED, sentAt: T1, provider: 'gmail' } } });
    eq(S.draftIsStale(second, second.docState.estimate), true, '⚠⚠ a SECOND draft made before the price moved is stale too');
    eq(S.draftOutstanding(second, 'estimate'), false, 'so it is not the draft to confirm');
    eq(S.outstandingDrafts(second), [], 'and the next change does not count it again');
    const live = moved({ docState: { estimate: { draftedAt: T3, sentAt: T1, provider: 'gmail' } } });
    eq(S.draftOutstanding(live, 'estimate'), true, 'a second draft made after the change is the live one');
    eq(S.outstandingDrafts(live), ['estimate'], 'and is listed for the next change to flag');
  }

  group('notePriceChange flags the drafts still waiting — the revised estimate’s second draft among them');
  {
    const S = sandbox({ fns: ['notePriceChange'].concat(HELP) });
    const job = { id: 7, docState: {
      estimate: { draftedAt: DRAFTED, sentAt: SENT },
      agreement: { draftedAt: DRAFTED, provider: 'gmail', draftUrl: 'https://mail.google.com/x' },
      'invoice:deposit': { draftedAt: DRAFTED },
      'invoice:final': {},
    } };
    const before = JSON.stringify(job.docState);
    eq(S.notePriceChange(job, 'discount').sort(), ['agreement', 'invoice:deposit'], 'it returns the two drafts still waiting on their tap');
    ok(!!job.priceChangedAt, 'the job carries when the price moved');
    eq(job.priceChangeWhy, 'discount', 'and why');
    eq(JSON.stringify(job.docState), before, '⚠ nothing is written into a draft’s own record — staleness is read off the job');
    eq(S.draftIsStale(job, job.docState.agreement), true, 'the packet draft now reads stale');
    eq(S.draftIsStale(job, job.docState.estimate), false, '⚠ a document already SENT is not — it went at the price that stood then');
    eq(S.notePriceChange(job, 'edit'), [], 'a second change finds nothing left to flag');
    eq(job.priceChangeWhy, 'edit', 'and records the latest reason');
    eq(S.notePriceChange({ id: 8 }, 'discount'), [], 'a job with no documents');
    const revised = { id: 9, docState: { estimate: { draftedAt: DRAFTED, sentAt: T1, provider: 'gmail' } } };
    eq(S.notePriceChange(revised, 'discount'), ['estimate'], '⚠⚠ the revised estimate’s second draft is flagged like any other');
  }

  group('the row: a stale draft is named, its button is an ordinary send, and no link to it is offered');
  {
    const J = sandbox({ fns: ['_jtSendAction', '_jtDraftLink', 'jtDraftLine', 'docKeyFor', 'docWord'].concat(HELP),
      vars: ['DOC_KIND_WORD', 'currentInvStage'] });
    const pkt = (o, j) => Object.assign({ id: 7, priceChangedAt: MARKED, priceChangeWhy: 'discount',
      docState: { agreement: Object.assign({ draftedAt: DRAFTED, provider: 'gmail', draftUrl: 'https://mail.google.com/x' }, o || {}) } }, j || {});
    const a = J._jtSendAction(7, pkt(), 'agreement', '', 'for signature &mdash; DocuSign');
    eq(a.label, '&#9993; Send for signature &mdash; DocuSign', '⚠⚠ the one filled button is an ordinary send — it read "I’ve sent it"');
    eq(a.call, "docAction(7,'agreement','send')", 'which builds a fresh packet at the price that stands');
    eq(J._jtSendAction(7, pkt({}, { priceChangedAt: undefined }), 'agreement', '', 'x').call, "markDocSent(7,'agreement')",
      'the converse: a draft no price change overtook still asks for the confirming tap');
    eq(J._jtDraftLink(7, pkt(), 'agreement', ''), [], 'no link to the old-price draft — opening it is the first step to sending it');
    eq((J._jtDraftLink(7, pkt({}, { priceChangedAt: undefined }), 'agreement', '')[0] || {}).label, '&#8599; Open the packet draft',
      'a live draft is simply opened');
    // The fold, on the row: a draft made after the last send waits on its tap and is opened like any other.
    const second = pkt({ draftedAt: T3, sentAt: T1 });
    eq(J._jtSendAction(7, second, 'agreement', '', 'x').call, "markDocSent(7,'agreement')",
      '⚠⚠ a draft made after the last send asks for the tap — it read as already sent');
    eq((J._jtDraftLink(7, second, 'agreement', '')[0] || {}).call, "openDocDraft(7,'agreement')", 'and its draft is one tap away');
    eq(J.jtDraftLine(pkt(), 'agreement', true), 'The Gmail draft from Aug 1 has the old price — delete it, don’t send it',
      'the row says which draft and what to do');
    eq(J.jtDraftLine(pkt({ provider: 'mailto' }, { priceChangeWhy: 'edit' }), 'agreement', true),
      'The email from Aug 1 was made before the estimate was edited — if it was never sent, discard it',
      '⚠ "Gmail" only when it IS in Gmail, and an edit named as an edit');
    eq(J.jtDraftLine(pkt({ mailbox: 'anthony@havellinpalmbeach.com' }), 'agreement', true),
      'The Gmail draft from Aug 1 (anthony@havellinpalmbeach.com) has the old price — delete it, don’t send it',
      'and whose mailbox it sits in');
    eq(J.jtDraftLine(pkt({}, { priceChangedAt: undefined }), 'agreement', true), 'Drafted — read it, send it, then confirm',
      'an ordinary draft keeps its line');
    eq(J.jtDraftLine(second, 'agreement', true), 'Drafted — read it, send it, then confirm', '⚠ and so does a second draft made since the change');
    eq(J.jtDraftLine({ id: 7 }, 'agreement', true), '', 'nothing drafted, nothing said');
    eq(J.jtDraftLine(pkt(), 'agreement', false), '', 'and a row that has gone says nothing — its own test is passed in');
  }
  {
    // On the rail: the packet row names the stale draft beside the withdrawn approval, and nothing opens it.
    const R = rail({ estimateSentTotal: 24100, acceptedTotal: 24100, agrApproved: false, agrRevokedBy: 'discount-revised',
      priceChangedAt: MARKED, priceChangeWhy: 'discount',
      docState: { agreement: { draftedAt: DRAFTED, provider: 'gmail', draftUrl: 'https://mail.google.com/x' } } });
    eq(R.lit, 'agreement_sent', 'the packet is the lit step');
    has(row(R, 'agreement_sent').sub, 'The Gmail draft from Aug 1 has the old price', '⚠ its row names the stale draft');
    eq((R.acts('agreement_sent').primary || {}).call, "docAction(7,'agreement','send')", 'its button sends a fresh one');
    eq(R.all.filter((x) => x.row === 'agreement_sent' && /openDocDraft/.test(x.call)).length, 0, 'and nothing opens the old draft');
  }
  {
    // An estimate drafted and then edited before it was ever confirmed sent: the stale line, and an ordinary send.
    const R = rail({ estimateSentDate: '', estimateSentTotal: undefined, status: 'approved', won: undefined, acceptedTotal: undefined,
      wonAt: undefined, wonBy: undefined, wonMethod: undefined, priceChangedAt: MARKED, priceChangeWhy: 'edit',
      docState: { estimate: { draftedAt: DRAFTED, provider: 'gmail', draftUrl: 'https://mail.google.com/e' } } });
    eq(R.lit, 'estimate_sent', 'the send is the lit step');
    eq(row(R, 'estimate_sent').sub, 'The Gmail draft from Aug 1 was made before the estimate was edited — delete it, don’t send it',
      '⚠ the estimate row names its stale draft');
    eq((R.acts('estimate_sent').primary || {}).label, '&#9993; Send estimate', 'and its button is an ordinary send, not the confirming tap');
    // The deposit invoice's row reads the same builder — a draft at the old price named on its own row.
    const D = rail({ estimateSentTotal: 24100, acceptedTotal: 24100, priceChangedAt: MARKED, priceChangeWhy: 'discount',
      docState: { 'invoice:deposit': { draftedAt: DRAFTED, provider: 'gmail' } } });
    eq(row(D, 'deposit_invoiced').sub, 'The Gmail draft from Aug 1 has the old price — delete it, don’t send it',
      '⚠ the deposit invoice row names its stale draft too');
    const L = rail({ estimateSentTotal: 24100, acceptedTotal: 24100,
      docState: { 'invoice:deposit': { draftedAt: MARKED, sentAt: DRAFTED, provider: 'gmail' } } });
    eq(row(L, 'deposit_invoiced').sub, '',
      'once the invoice is sent its row says nothing more — a row reopens from the figures, never from a later draft');
  }
  {
    // ⚠⚠ The fold, on the rail: the revised estimate's second draft. The row reopened from the figures (a raise
    // after the estimate went), and its draft is newer than the first send — so it waits on its tap and is
    // opened like any other.
    const R = rail({ docState: { estimate: { draftedAt: T3, sentAt: T1, provider: 'gmail', draftUrl: 'https://mail.google.com/r' } } });
    eq(R.lit, 'estimate_sent', 'the revised send is the lit step');
    eq(row(R, 'estimate_sent').sub, 'Drafted — read it, send it, then confirm',
      '⚠⚠ its second draft waits on the confirming tap — it read as already sent');
    eq((R.acts('estimate_sent').primary || {}).call, "markDocSent(7,'estimate')", 'and the one filled button is the tap');
    ok(R.all.some((x) => x.row === 'estimate_sent' && x.call === "openDocDraft(7,'estimate')"), 'with the draft one tap away');
    // A discount after that draft reaches it — and the first round's overtaken draft, dealt with when the
    // estimate first went, is not named again (a send closes a round).
    const S = rail({ priceChangedAt: '2026-08-01T13:00:00Z', priceChangeWhy: 'discount',
      docState: { estimate: { draftedAt: T3, sentAt: T1, provider: 'gmail', draftUrl: 'https://mail.google.com/r',
        staleDrafts: [{ draftedAt: '2026-07-31T10:00:00Z', provider: 'gmail', why: 'discount' }] } } });
    eq(row(S, 'estimate_sent').sub, 'The Gmail draft from Aug 1 has the old price — delete it, don’t send it',
      '⚠⚠ the discount reaches the second draft, and only it is named');
    eq((S.acts('estimate_sent').primary || {}).label, '&#9993; Send revised estimate', 'the button sends the revised estimate afresh');
    eq(S.all.filter((x) => x.row === 'estimate_sent' && /openDocDraft/.test(x.call)).length, 0, 'and nothing opens the old draft');
  }
  {
    // ⚠ The rail is a function of what it is HANDED. Both callers hand it the store's own record, so this changes no
    // answer on screen; it is what keeps jobTimeline a derivation the tests can drive, which they all rely on.
    const job = { id: 7, name: 'Butler', created: 'Sep 8, 2026', svc: 'downsizing', status: 'won', won: true, walkthrough: '2020-01-01',
      approved: true, estimateSentDate: 'September 9, 2026', estimateSentTotal: 20000, acceptedTotal: 20000, wonAt: '2026-09-12' };
    RAIL.jobs = [job];
    RAIL.estimateStore = { 7: Object.assign({ savedAt: 1, approved: true, submitted: false }, estAt(24100)) };
    const rows = RAIL.jobTimeline(job, null, [], []);
    const by = {};
    rows.forEach((x) => { by[x.key] = x; });
    eq((by.estimate_sent || {}).done, true, 'handed no record, the send reads as the record says — the store is not consulted');
    eq((by.client_accepted || {}).done, true, 'and so does the acceptance');
  }

  group('a send closes a round: the drafts it replaced are that round’s history, and the next round names only its own');
  {
    const S = sandbox({ fns: HELP });
    const job = { id: 7, priceChangedAt: '2026-08-01T13:00:00Z', priceChangeWhy: 'discount',
      docState: { estimate: { draftedAt: T3, sentAt: T1, provider: 'gmail',
        staleDrafts: [{ draftedAt: '2026-07-31T10:00:00Z', provider: 'gmail', why: 'discount' }] } } };
    eq(S.staleDraftsOf(job, 'estimate').map((d) => d.draftedAt), [T3], '⚠ the first round’s draft is not named again');
    eq(S.staleDraftNote(job, 'estimate', false), 'The Gmail draft from Aug 1 has the old price — delete it, don’t send it', 'one draft, one day');
    job.docState.estimate.sentAt = undefined;
    eq(S.staleDraftsOf(job, 'estimate').length, 2, 'the converse: with no send behind them, every overtaken draft is named');
  }

  group('the door: the confirming tap confirms an outstanding draft or nothing — a second draft after a send among them');
  {
    const said = { notices: [], redraw: 0, primed: 0, recorders: 0 };
    const K = sandbox({ fns: ['markDocSent', 'docState', '_jobTouch', 'noDraftToConfirm'].concat(HELP), stubs: {
      dashNotice(k, m) { said.notices.push({ k, m }); }, _dashRedraw() { said.redraw++; }, saveJobs() {}, syncJobToSheets() {},
      _primeAgreementFor() { said.primed++; return true; }, _primeEstimateFor() { said.primed++; return true; },
      markAgreementSent() { said.recorders++; }, markEstimateSent() { said.recorders++; }, _actor() { return ''; } } });
    K.jobs = [{ id: 7, tc: 'Ashley Jerome', priceChangedAt: MARKED, priceChangeWhy: 'edit',
      docState: { agreement: { draftedAt: DRAFTED, provider: 'gmail' } } }];
    K.markDocSent(7, 'agreement');
    eq(K.jobs[0].docState.agreement.sentAt, undefined, '⚠⚠ a draft at the old price is never recorded as sent');
    eq(said.primed, 0, 'nothing is primed');
    eq(said.recorders, 0, '⚠ and neither legacy recorder ran — markAgreementSent stamps the approval and files the packet on its way through');
    eq(said.notices.length, 1, 'one refusal');
    eq((said.notices[0] || {}).k, 'warn', 'as a warning');
    has((said.notices[0] || {}).m, 'was made before the estimate was edited', 'saying why');
    has((said.notices[0] || {}).m, 'Send a fresh one from the timeline', 'and what to do instead');
    K.jobs[0].docState.estimate = { draftedAt: T3 };
    K.markDocSent(7, 'estimate');
    ok(!!K.jobs[0].docState.estimate.sentAt, 'the converse: a draft made after the change is recorded as sent');
    eq(said.recorders, 1, 'through its legacy recorder');
    // ⚠⚠ The fold at the door: a second draft after a send.
    K.jobs.push({ id: 8, tc: 'Ashley Jerome', docState: { estimate: { draftedAt: T3, sentAt: T1, provider: 'gmail' } } });
    said.notices.length = 0;
    K.markDocSent(8, 'estimate');
    ok(Date.parse((K.jobs[1].docState.estimate || {}).sentAt) > Date.parse(T3),
      '⚠⚠ a second draft after a send is recorded — it was refused as "already recorded as sent"');
    eq(said.recorders, 2, 'through its legacy recorder, like the first');
    lacks(said.notices.map((x) => x.m).join(' | '), 'already recorded as sent', 'with no refusal');
    K.jobs.push({ id: 9, tc: 'Ashley Jerome', priceChangedAt: MARKED, priceChangeWhy: 'discount',
      docState: { estimate: { draftedAt: DRAFTED, sentAt: T1, provider: 'gmail' } } });
    said.notices.length = 0;
    K.markDocSent(9, 'estimate');
    eq((K.jobs[2].docState.estimate || {}).sentAt, T1, 'a second draft the price moved past is refused like a first one — the last send stands');
    eq((said.notices[0] || {}).k, 'warn', 'as a warning');
    lacks((said.notices[0] || {}).m, 'already recorded as sent', '⚠ never told it is already sent — the draft waiting is a different one');
    has((said.notices[0] || {}).m, 'has the old price', 'it names the draft');
  }
  {
    // A fresh draft after the change keeps the overtaken SECOND draft on record — before the fold it did not read
    // stale, so it was overwritten with nothing left to say where it was.
    const D = sandbox({ fns: ['docRecordSent', 'docState', '_jobTouch'].concat(HELP), stubs: {
      DOC_SEND_PROVIDERS: { gmail: { needsHumanSend: true } }, saveJobs() {}, syncJobToSheets() {},
      _actor() { return 'Anthony Graziano'; }, _stamp() { return 'September 29, 2026'; } } });
    const job = { id: 7, priceChangedAt: MARKED, priceChangeWhy: 'discount',
      docState: { estimate: { draftedAt: DRAFTED, sentAt: T1, provider: 'gmail', mailbox: 'ashley@havellinpalmbeach.com' } } };
    D.docRecordSent({ job, key: 'estimate' }, { provider: 'gmail', draftUrl: 'https://mail.google.com/y', pdfOk: true });
    const st = job.docState.estimate;
    eq((st.staleDrafts || []).length, 1, '⚠⚠ the overtaken second draft is kept on record');
    eq(((st.staleDrafts || [])[0] || {}).mailbox, 'ashley@havellinpalmbeach.com', 'with the mailbox it sits in');
    ok(Date.parse(st.draftedAt) > Date.parse(MARKED), 'the fresh draft is newer than the change');
    eq(D.draftOutstanding(job, 'estimate'), true, 'and it is the live draft');
    eq(D.staleDraftNote(job, 'estimate', true), 'Delete the older Gmail draft from Aug 1 (ashley@havellinpalmbeach.com) — it has the old price',
      'with the older one named beside it');
  }

  group('the two places the price moves before the packet flag the drafts: an edit and a discount');
  {
    const R = sandbox({ fns: ['revokeEstimateApproval', 'revokeAgreementApproval', 'notePriceChange'].concat(HELP),
      vars: ['_packetExported', 'currentAgrJobId'],
      stubs: { saveJobs() {}, syncJobToSheets() {}, showSyncBadge() {} } });
    R.jobs = [{ id: 7, approved: true, agrApproved: true, docState: { agreement: { draftedAt: DRAFTED, provider: 'gmail' } } }];
    R.estimateStore = { 7: { approved: true } };
    R.revokeEstimateApproval(7);
    eq(R.jobs[0].priceChangeWhy, 'edit', 'an approved estimate taken back for editing flags the drafts');
    eq(R.draftIsStale(R.jobs[0], R.jobs[0].docState.agreement), true, 'and the packet draft reads stale');
  }
  function discBed(docState, onDash) {
    const said = { fb: [], redraws: [], alerts: [] };
    const A = sandbox({
      fns: uniq(['applyDiscountRevision', 'discountPctInput', '_discountModalSays', 'discountPreview', 'estPreDiscountTotal',
        'discountOnLabor', 'estPrepFeeOnTop', 'estFixedLines', 'estFixedFee', 'discountOnFixedFee', 'fixedDiscountBasisWords', 'revokeAgreementApproval', 'notePriceChange', 'staleDraftNotice',
        'docState', '_jobTouch', 'estimateEventStatus', 'isJobWon', 'closeDiscountModal', '_jobBandHost', '_docNotice',
        'dashNotice', '_dashFbTarget', 'roundCents'].concat(HELP, BLK_FNS)),
      vars: ['MAX_DISCOUNT_PCT', 'RUSH_PCT', '_packetExported', 'currentAgrJobId', 'estimateApproved', 'estimateSubmitted', 'discountRevision', '_dashNotice', '_dashboardJobId'],
      stubs: { document: domStub({ 'dm-pct': '5' }), saveJobs() {}, syncJobToSheets() {}, saveEstimateState() {},
        renderClientEstimate() {}, updateApprovalUI() {}, _dashRedraw(id) { said.redraws.push(id); }, notifyManagerForApproval() {},
        showSyncBadge() {}, showFB(el, k, m) { said.fb.push({ el, k, m }); }, alert(m) { said.alerts.push(m); } },
    });
    // The drilldown open on this client is what makes the dashboard the screen the person is on (_jobBandHost).
    A._dashboardJobId = onDash ? 7 : 0;
    A.jobs = [{ id: 7, status: 'won', won: true, approved: true, agrApproved: false, docState }];
    A.currentEstimate = { jobId: 7, tcFee: 12000, psFee: 8000, havellinTotalFull: 20000, rush: false, rushAmt: 0,
      discountPct: 0, discountAmt: 0, havellinTotal: 20000, grandTotal: 20000, fixedPrice: false };
    A.applyDiscountRevision();
    return { A, said, note: A._dashNotice || {} };
  }
  {
    const { A, note, said } = discBed({ estimate: { draftedAt: DRAFTED, provider: 'gmail', draftUrl: 'https://x' } }, true);
    eq(A.jobs[0].priceChangeWhy, 'discount', 'a discount flags the drafts on the job');
    eq(A.draftIsStale(A.jobs[0], A.jobs[0].docState.estimate), true, 'and the estimate draft still in the mailbox reads stale');
    eq(note.type, 'warn', '⚠ the confirmation turns to a warning while a stale draft is out');
    has(note.msg, 'has the old price', 'and names the draft');
    // ⚠⚠ FOUND BY THIS BUILD'S BROWSER STEP (and by the concurrent build): the confirmation was written into #dash-fb
    // with showFB and the redraw straight after it rewrote the drilldown, so it reached nobody.
    eq(said.fb.filter((x) => x.el === 'dash-fb').length, 0, '⚠⚠ nothing is written into the strip the redraw is about to destroy');
    ok(said.redraws.indexOf(7) >= 0, 'the dashboard redraws with the notice on it');
  }
  {
    const { note, said } = discBed(undefined, true);
    eq(note.type, 'ok', 'with nothing drafted the discount confirms as before');
    has(note.msg, 'Discount applied.', 'on the dashboard, where it survives the redraw');
    lacks(note.msg, 'old price', 'and says nothing about drafts');
    eq(said.alerts.length, 0, 'never as an alert while a band is on screen');
  }
  {
    const { A, note } = discBed({ estimate: { draftedAt: DRAFTED, sentAt: T1, provider: 'gmail', draftUrl: 'https://x' } }, true);
    eq(A.draftIsStale(A.jobs[0], A.jobs[0].docState.estimate), true, '⚠⚠ the revised estimate’s second draft is flagged by a discount too');
    eq(note.type, 'warn', 'and the confirmation names it');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('Edit estimate waits for the PIN: withheld on every row while a manager has it, and refused at both doors');
  {
    const O = sandbox({ fns: ['estimateOutForApproval'] });
    eq(O.estimateOutForApproval({ id: 7, status: 'pending' }, { submitted: true, approved: false }), true, 'submitted: out for approval');
    eq(O.estimateOutForApproval({ id: 7, status: 'pending' }, null), true, '⚠ a job at pending counts even before its record has synced');
    eq(O.estimateOutForApproval({ id: 7, status: 'pending', approved: true }, null), false, 'but not once approved');
    eq(O.estimateOutForApproval({ id: 7, status: 'won' }, { submitted: false, approved: true }), false, 'an approved estimate is not');
    eq(O.estimateOutForApproval({ id: 7, status: 'won' }, { submitted: true }), true, 'the record’s own flag is enough');
    eq(O.estimateOutForApproval(null, { submitted: true }), false, 'no job, no answer');
    O.estimateStore = { 7: { submitted: true } };
    eq(O.estimateOutForApproval({ id: 7, status: 'won' }, { submitted: false, approved: true }), false,
      'it answers for the record handed in — never the store');
  }
  {
    const edits = (R) => R.all.filter((x) => /dashEditEstimate/.test(x.call));
    const out = rail({ status: 'pending', approved: false }, { approved: false, submitted: true });
    eq(out.lit, 'estimate_approved', 'the manager’s step is lit');
    eq(edits(out).length, 0, '⚠⚠ no row offers Edit estimate while a manager has the estimate — the tray and the strip alike');
    ok(out.all.some((x) => x.call === 'dashApproveEstimate(7)'), 'the PIN is the one next move, and the band offers it');
    const notWon = rail({ status: 'pending', won: undefined, approved: false, acceptedTotal: undefined }, { approved: false, submitted: true });
    eq(edits(notWon).length, 0, 'the same before the client has said yes');
    const approved = rail({ estimateSentTotal: 24100, acceptedTotal: 24100 });
    ok(edits(approved).length >= 1, 'offered again once a manager approves it (' + edits(approved).map((x) => x.row).join(', ') + ')');
    const draft = rail({ approved: false }, { approved: false, submitted: false });
    ok(edits(draft).length >= 1, 'and on a draft nobody has submitted');
  }
  {
    const said = { notices: [], nav: [], redraw: 0, primed: 0, revokes: 0 };
    const E = sandbox({ fns: uniq(['dashEditEstimate', 'estimateOutForApproval'].concat(BLK_FNS)),
      vars: ['ESTIMATE_OUT_FOR_APPROVAL_TXT', 'estimateApproved', 'estimateSubmitted', 'discountRevision', 'approvedBy', 'approvedAt'],
      stubs: { dashNotice(k, m) { said.notices.push({ k, m }); }, _dashRedraw() { said.redraw++; }, dashGoEstimate(id) { said.nav.push(id); },
        _primeEstimateFor() { said.primed++; return true; }, revokeEstimateApproval() { said.revokes++; }, saveEstimateState() {},
        currentEstimate: null } });
    E.jobs = [{ id: 7, status: 'pending', won: true, approved: false }];
    E.estimateStore = { 7: { submitted: true, approved: false, estimate: {} } };
    E.dashEditEstimate(7);
    eq(said.nav.length, 0, '⚠⚠ the dashboard door does not open Build Estimate while a manager has it');
    eq(said.revokes, 0, 'un-approves nothing');
    eq(said.primed, 0, 'and primes nothing');
    eq(said.notices.length, 1, 'one refusal');
    eq((said.notices[0] || {}).m, E.ESTIMATE_OUT_FOR_APPROVAL_TXT, 'in the shared words');
    has(E.ESTIMATE_OUT_FOR_APPROVAL_TXT, 'once a manager approves it or denies it', 'which say when it opens again');
    E.jobs[0].status = 'won'; E.jobs[0].approved = true;
    E.estimateStore = { 7: { approved: true, submitted: false, estimate: {} } };
    E.dashEditEstimate(7);
    eq(said.nav, [7], 'once approved the door opens Build Estimate');
    eq(said.revokes, 1, 'having un-approved the estimate first');
  }
  {
    const said = { fb: [], nav: [] };
    const C = sandbox({ fns: uniq(['editEstimateFromCE', 'estimateOutForApproval'].concat(BLK_FNS)),
      vars: ['ESTIMATE_OUT_FOR_APPROVAL_TXT', 'estimateApproved', 'estimateSubmitted', 'discountRevision', 'approvedBy', 'approvedAt'],
      stubs: { showFB(el, k, m) { said.fb.push({ el, k, m }); }, _dashFbTarget(id) { return id; }, editEstimateForJob(id) { said.nav.push(id); },
        revokeEstimateApproval() { return null; }, estimateEventStatus(j, n) { return n; }, saveJobs() {}, syncJobToSheets() {},
        saveEstimateState() {} } });
    C.jobs = [{ id: 7, status: 'pending', won: true, approved: false }];
    C.estimateStore = { 7: { submitted: true, approved: false } };
    C.currentEstimate = { jobId: 7, lockedRooms: [1] };
    C.estimateSubmitted = true;
    C.editEstimateFromCE();
    eq(said.nav.length, 0, '⚠ the Client Estimate panel’s door refuses too');
    eq(C.estimateSubmitted, true, 'and un-submits nothing — the manager is still reviewing it');
    ok(!!C.currentEstimate.lockedRooms, 'the frozen snapshot is untouched');
    eq((said.fb[0] || {}).m, C.ESTIMATE_OUT_FOR_APPROVAL_TXT, 'in the same words as the dashboard door');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the nets: one writer for each figure, and for when the price moved');
  {
    const live = src.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    ok(live.length > src.length * 0.5, 'the comment strip did not eat the file');
    eq((live.match(/\.estimateSentTotal\s*=[^=]/g) || []).length, 1, 'estimateSentTotal has ONE writer — markEstimateSent');
    eq((live.match(/\.acceptedTotal\s*=[^=]/g) || []).length, 1, 'acceptedTotal has ONE writer — confirmMarkWon');
    eq((live.match(/\.priceChangedAt\s*=[^=]/g) || []).length, 1, 'priceChangedAt has ONE writer — notePriceChange');
    // ⚠ The send-order rule has one definition, and every reader of "is a draft waiting" goes through it.
    ['draftIsStale(job, st)', 'draftOutstanding(job, key)', 'noDraftToConfirm(job, key)'].forEach((sig) => {
      const from = src.indexOf('function ' + sig);
      const rest = from < 0 ? '' : src.slice(from + 10);
      const end = rest.indexOf('\nfunction ');
      const b = (end < 0 ? rest : rest.slice(0, end)).split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
      ok(b.length > 40, sig + ' was found');
      has(b, 'docDraftPending(st)', sig + ' asks docDraftPending');
      lacks(b, '!st.sentAt', sig + ' keeps no private copy of the old "nothing sent" test');
    });
    // Every reader of "is this estimate waiting on a manager" asks the one rule.
    ['jobTimeline(job, estRec, logs, cos, sched)', 'jobTimelineActions(row, job, estRec)', 'dashEditEstimate(jobId)', 'editEstimateFromCE()']
      .forEach((sig) => {
        const from = src.indexOf('function ' + sig);
        const rest = from < 0 ? '' : src.slice(from + 10);
        const end = rest.indexOf('\nfunction ');
        const b = (end < 0 ? rest : rest.slice(0, end)).split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
        ok(b.length > 100, sig + ' was found');
        has(b, 'estimateOutForApproval(', sig + ' asks estimateOutForApproval');
      });
  }
};
