'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// ⚠⚠ A DRAFT A PRICE CHANGE LEFT BEHIND IS NAMED, AND IS NEVER CONFIRMED AS SENT (2026-09-29).
//
// Anthony: "just flag a previous Gmail draft if a discount is offered." A document sent by email is a
// DRAFT until a person sends it and taps "I've sent it", and nothing reaches back into a draft once it
// is made. Measured on the build before this, through the real buttons: a signing packet drafted at
// $11,750 (deposit $5,875), a 10% discount, the manager's PIN — and the band then offered only
// "✓ I've sent it" and "↗ Open the packet draft", both over the old-price draft. Pressing the first
// recorded the $11,750 packet as SENT. The discount's own confirmation was written onto a strip the
// redraw wiped on the same tick, so nothing on screen said the draft had gone out of date.
//
// What this build does, and every rule below is DRIVEN on the real functions:
//   • both price-change doors stamp the JOB with when the price moved (notePriceChange);
//   • a draft made before that is read as stale — never rewritten — so the two-device case holds;
//   • a stale draft is not confirmable, has no link, brings Send back, and is named on its row;
//   • the discount pop-up names a live draft BEFORE the discount, and the confirmation after it;
//   • a fresh send keeps the old draft on record and says which to delete.
// It flags; it never touches Gmail. Deleting a draft in somebody's mailbox is a person's act.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sandbox, source, domStub, matchBrace, fn } = require('./harness');

const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
function gsFn(name) {
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(GS);
  if (!m) throw new Error('not in .gs: ' + name);
  const start = m.index + (m[1] ? m[1].length : 0);
  const open = GS.indexOf('{', re.lastIndex);
  const close = matchBrace(GS, open);
  if (close === -1) throw new Error('unbalanced: ' + name);
  return GS.slice(start, close + 1);
}
function gsVar(name) {
  const m = GS.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[^;]*;)'));
  if (!m) throw new Error('not in .gs: var ' + name);
  return m[2];
}

// Comment-stripped, LINE-based: a /\*[\s\S]*?\*\// stripper eats ~170KB of this file, because of
// accept="image/*" (CLAUDE.md records it).
function live(s) {
  return String(s).split('\n').filter((l) => !/^\s*\/\//.test(l)).map((l) => l.replace(/\s\/\/.*$/, '')).join('\n');
}

// Fixed stamps well in the past, so no assertion depends on the clock the suite runs under.
const D1 = '2026-09-01T14:00:00.000Z';        // 10:00am ET, Sep 1 — the packet drafted
const D0 = '2026-08-31T13:00:00.000Z';        // an earlier draft, Aug 31
const D_EVE = '2026-09-02T01:30:00.000Z';     // 9:30pm ET on Sep 1 — Sep 2 in UTC
const CHANGE = '2026-09-01T18:00:00.000Z';    // 2:00pm ET, Sep 1 — the discount
const AFTER = '2026-09-01T19:00:00.000Z';     // a draft made after it
const BOX = 'anthony@havellinpalmbeach.com';

module.exports = function ({ group, ok, eq, has, lacks }) {
  const realTZ = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try { run({ group, ok, eq, has, lacks }); }
  finally { if (realTZ === undefined) delete process.env.TZ; else process.env.TZ = realTZ; }
};

function run({ group, ok, eq, has, lacks }) {
  const src = source();

  const HELP = ['notePriceChange', 'draftIsStale', 'docDraftPending', 'draftOutstanding', 'outstandingDrafts', 'staleDraftsOf', 'staleDocName',
    '_draftDay', '_andJoin', 'staleDraftNote', 'discountDraftWarning', 'staleDraftNotice', 'noDraftToConfirm', 'jtDraftLine'];
  const P = sandbox({ fns: HELP });
  const gmail = (o) => Object.assign({ draftedAt: D1, provider: 'gmail', mailbox: BOX }, o || {});

  // ═══════════════════════════════════════════════════════════════════════════
  group('ONE definition of a live draft: made, not sent, and not overtaken by a price change');
  {
    const job = { id: 1, docState: { agreement: gmail() } };
    ok(P.draftOutstanding(job, 'agreement'), 'a draft made and not sent is outstanding');
    eq(P.outstandingDrafts(job), ['agreement'], 'and is the one outstanding draft on the job');
    eq(P.draftIsStale(job, job.docState.agreement), false, 'with no price change on record it is not stale');
    job.priceChangedAt = CHANGE;
    eq(P.draftIsStale(job, job.docState.agreement), true, '⚠ a draft made BEFORE the price moved is stale');
    eq(P.draftOutstanding(job, 'agreement'), false, '⚠⚠ and is no longer the draft — the tap and the link go with it');
    eq(P.outstandingDrafts(job), [], 'so the job has no outstanding draft');

    const after = { id: 2, priceChangedAt: CHANGE, docState: { agreement: gmail({ draftedAt: AFTER }) } };
    ok(P.draftOutstanding(after, 'agreement'), 'a draft made AFTER the price moved is the draft');
    eq(P.draftIsStale(after, after.docState.agreement), false, 'and is not stale');

    const sent = { id: 3, priceChangedAt: CHANGE, docState: { agreement: gmail({ sentAt: '2026-09-01T15:00:00.000Z' }) } };
    eq(P.draftIsStale(sent, sent.docState.agreement), false, 'a SENT document is never a stale draft — it went');
    eq(P.draftOutstanding(sent, 'agreement'), false, 'nor an outstanding one');

    eq(P.draftOutstanding(null, 'agreement'), false, 'no job, no draft');
    eq(P.draftOutstanding({ id: 4 }, 'agreement'), false, 'no record, no draft');
    eq(P.draftOutstanding({ id: 5, docState: { agreement: {} } }, 'agreement'), false, 'an empty record is not a draft');
    eq(P.outstandingDrafts(null), [], 'and a missing job lists none');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('notePriceChange: stamps the JOB, returns what it left out of date, writes nothing into a draft');
  {
    const job = { id: 5, docState: {
      estimate: gmail(), agreement: gmail(),
      'invoice:deposit': gmail({ sentAt: '2026-09-01T15:00:00.000Z' }) } };
    const was = P.notePriceChange(job, 'discount');
    eq(was.slice().sort(), ['agreement', 'estimate'], 'it returns the drafts it has just left out of date — never a sent one');
    ok(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(job.priceChangedAt),
       'stamped as a toISOString, the same shape as draftedAt — so the comparison is chronological');
    ok(job.priceChangedAt > D1, 'and later than the drafts it overtook');
    eq(job.priceChangeWhy, 'discount', 'recording why');
    eq(P.outstandingDrafts(job), [], 'neither draft is outstanding any more');
    eq(job.docState.agreement, gmail(),
       '⚠⚠ and it wrote NOTHING into the draft’s own record — staleness is read off the job, never stamped at the door');
    eq(P.notePriceChange(job, 'edit'), [], 'a second change finds nothing live to report');
    eq(job.priceChangeWhy, 'edit', 'and records the latest reason');
    P.notePriceChange(job, 'something-else');
    eq(job.priceChangeWhy, 'discount', 'an unrecognised reason reads as a discount — the wording has two arms, never a third');
    eq(P.notePriceChange(null, 'edit'), [], 'no job, nothing');
    lacks(live(fn('notePriceChange')), 'docState(', 'it never goes through the writer’s accessor either');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('The sentence — which document, which day, which mailbox, and what to do');
  {
    eq(P.staleDocName('agreement'), 'signing packet', 'the agreement is the signing packet — that is what is emailed');
    eq(P.staleDocName('estimate'), 'estimate', 'the estimate by name');
    eq(P.staleDocName('invoice:final'), 'final invoice', 'an invoice by its stage');
    eq(P.staleDocName('invoice:deposit'), 'deposit invoice', 'every stage');
    // ⚠ ON THIS DEVICE'S CALENDAR — slicing the UTC stamp names tomorrow after 8pm Eastern.
    eq(P._draftDay(D_EVE), 'Sep 1', '⚠ a draft made at 9:30pm Eastern is named on its own day, not the next');
    eq(P._draftDay('nonsense'), '', 'an unreadable stamp names no day rather than "Invalid Date"');
    eq(P._andJoin(['Aug 31', 'Sep 1']), 'Aug 31 and Sep 1', 'two days join with "and"');
    eq(P._andJoin(['a', 'b', 'c']), 'a, b and c', 'three with a list');

    const one = { id: 1, priceChangedAt: CHANGE, priceChangeWhy: 'discount', docState: { agreement: gmail() } };
    eq(P.staleDraftNote(one, 'agreement', false),
       'The Gmail draft from Sep 1 (' + BOX + ') has the old price — delete it, don’t send it',
       'a Gmail draft a discount overtook: which day, whose mailbox, and delete it');
    eq(P.staleDraftNote(one, 'agreement', true),
       'Delete the older Gmail draft from Sep 1 (' + BOX + ') — it has the old price',
       'beside a fresh draft it is "the older" one');
    has(P.staleDraftNote(one, 'agreement', false, true), 'Gmail draft of the signing packet from Sep 1',
        'and with no row above it, it names the document');

    const edit = { id: 1, priceChangedAt: CHANGE, priceChangeWhy: 'edit', docState: { estimate: gmail() } };
    has(P.staleDraftNote(edit, 'estimate', false), 'was made before the estimate was edited', 'an edit says so, not "the old price"');

    const mail = { id: 1, priceChangedAt: CHANGE, priceChangeWhy: 'discount',
      docState: { agreement: { draftedAt: D1, provider: 'mailto' } } };
    eq(P.staleDraftNote(mail, 'agreement', false), 'The email from Sep 1 has the old price — if it was never sent, discard it',
       '⚠ a mailto may already have gone — the app watched a compose window open, nothing more');
    lacks(P.staleDraftNote(mail, 'agreement', false), 'Gmail', 'and it is not called a Gmail draft');

    const two = { id: 1, priceChangedAt: CHANGE, priceChangeWhy: 'discount', docState: { agreement: gmail({
      staleDrafts: [{ draftedAt: D0, provider: 'gmail', mailbox: BOX, why: 'discount' }] }) } };
    eq(P.staleDraftNote(two, 'agreement', false),
       'The Gmail drafts from Aug 31 and Sep 1 (' + BOX + ') are out of date — delete them, don’t send them',
       'two out-of-date drafts are named together, the mailbox once');

    eq(P.staleDraftNote({ id: 1, docState: { agreement: gmail() } }, 'agreement', false), '',
       'a draft no price change has overtaken says nothing here');
    eq(P.staleDraftNote(null, 'agreement', false), '', 'nor does a missing job');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('What the pop-up says BEFORE the discount, and the confirmation after it');
  {
    const job = { id: 1, docState: { agreement: gmail(), estimate: gmail({ sentAt: '2026-09-01T15:00:00.000Z' }) } };
    const w = P.discountDraftWarning(job);
    has(w, 'The signing packet was drafted in Gmail on Sep 1 (' + BOX + ') and has not been confirmed sent',
        'the live packet draft is named, with its day and mailbox');
    has(w, 'A discount leaves that draft at the old price — delete it', 'and what the discount does to it');
    has(w, 'send a fresh packet once the manager re-approves', 'and what comes next');
    has(w, 'Already sent it? Cancel and tap “I’ve sent it” instead — a price change after the packet goes out is a change order',
        '⚠ and, on the packet, what to do if it has ALREADY gone — the app cannot know that from here');
    lacks(w, 'estimate was drafted', 'a SENT estimate is not a draft to warn about');
    eq(P.discountDraftWarning({ id: 2 }), '', 'a job with no draft gets no warning');
    const est = P.discountDraftWarning({ id: 3, docState: { estimate: gmail() } });
    has(est, 'The estimate was drafted in Gmail', 'an estimate draft is named too');
    lacks(est, 'Already sent it?', 'without the packet’s change-order sentence');
    const mailto = P.discountDraftWarning({ id: 4, docState: { agreement: { draftedAt: D1, provider: 'mailto' } } });
    has(mailto, 'opened as an email on Sep 1', 'a mailto is an email that was opened');
    has(mailto, 'discard it if it was never sent', 'and may already have gone');
    lacks(P.discountDraftWarning({ id: 5, priceChangedAt: CHANGE, docState: { agreement: gmail() } }), 'drafted in Gmail',
          'a draft already overtaken is the row’s to name, not this warning’s');

    const flagged = { id: 6, priceChangedAt: CHANGE, priceChangeWhy: 'discount', docState: { agreement: gmail() } };
    eq(P.staleDraftNotice(flagged, ['agreement']),
       '⚠ The Gmail draft of the signing packet from Sep 1 (' + BOX + ') has the old price — delete it, don’t send it.'
       + ' Send a fresh one once the manager re-approves — and if the old one already reached the client, tell them a revised one is coming.',
       'the confirmation names it and what comes next');
    eq(P.staleDraftNotice(flagged, []), '', 'no flagged draft, no sentence');
    has(P.staleDraftNotice({ id: 7, priceChangedAt: CHANGE, docState: { agreement: gmail(), estimate: gmail() } },
      ['agreement', 'estimate']), 'Send fresh ones once the manager re-approves — and if an old one already reached',
      'two flagged drafts, plural');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('The confirming tap confirms an OUTSTANDING draft, or nothing — driven on the real markDocSent');
  {
    function tapBed(docState, jobO) {
      const said = { notices: [], redraws: [], agr: 0, est: 0, saved: 0 };
      const ctx = sandbox({
        fns: ['markDocSent', 'docState', '_jobTouch', 'draftOutstanding', 'docDraftPending', 'draftIsStale', 'noDraftToConfirm', 'staleDocName',
          'staleDraftNote', 'staleDraftsOf', '_draftDay', '_andJoin'],
        stubs: {
          dashNotice(type, msg) { said.notices.push({ type, msg }); }, _dashRedraw(id) { said.redraws.push(id); },
          _primeAgreementFor: () => true, _primeEstimateFor: () => true,
          markAgreementSent() { said.agr++; ctx.jobs[0].agrSent = true; }, markEstimateSent() { said.est++; },
          _actor: () => 'Ashley Jerome', saveJobs() { said.saved++; }, syncJobToSheets() {},
        },
      });
      ctx.jobs = [Object.assign({ id: 9, docState: docState }, jobO || {})];
      return { ctx, said, job: ctx.jobs[0] };
    }
    {
      const { ctx, said, job } = tapBed({ agreement: gmail() }, { priceChangedAt: CHANGE, priceChangeWhy: 'discount' });
      ctx.markDocSent(9, 'agreement');
      ok(!job.docState.agreement.sentAt, '⚠⚠ a stale packet draft is NOT recorded as sent — that was the old-price packet');
      eq(said.agr, 0, '⚠ and the legacy recorder never ran, so no approval was stamped and nothing filed over it');
      ok(!job.agrSent, 'the legacy mirror is untouched');
      eq(said.saved, 0, 'nothing saved');
      eq((said.notices[0] || {}).type, 'warn', 'it says so, as a warning');
      has((said.notices[0] || {}).msg, 'There is no draft of the signing packet waiting to be confirmed.', 'why it refused');
      has((said.notices[0] || {}).msg, 'The Gmail draft from Sep 1 (' + BOX + ') has the old price — delete it, don’t send it.',
          'naming the draft to delete');
      has((said.notices[0] || {}).msg, 'Send a fresh one from the timeline.', 'and the way forward');
      eq(said.redraws, [9], 'and redraws, so the band stops offering the tap');
    }
    {
      const { ctx, said, job } = tapBed({ agreement: gmail({ draftedAt: AFTER }) }, { priceChangedAt: CHANGE });
      ctx.markDocSent(9, 'agreement');
      ok(!!job.docState.agreement.sentAt, 'the converse: a draft made after the price moved IS confirmed');
      eq(said.agr, 1, 'through the legacy recorder, as ever');
      eq((said.notices[said.notices.length - 1] || {}).msg, 'Recorded as sent.', 'and says so');
    }
    {
      const { ctx, said, job } = tapBed({ estimate: gmail() });
      ctx.markDocSent(9, 'estimate');
      ok(!!job.docState.estimate.sentAt, 'a draft with no price change on record is confirmed as before');
      eq(said.est, 1, 'the estimate’s recorder runs');
    }
    {
      const { ctx, said, job } = tapBed({ agreement: gmail({ sentAt: '2026-09-01T15:00:00.000Z' }) });
      ctx.markDocSent(9, 'agreement');
      eq(job.docState.agreement.sentAt, '2026-09-01T15:00:00.000Z', 'an already-sent document is not re-stamped by a second tap');
      eq(said.agr, 0, 'and nothing is re-filed');
      eq((said.notices[0] || {}).type, 'ok', 'it is not a warning — the send is on record');
      has((said.notices[0] || {}).msg, 'already recorded as sent', 'it says so');
    }
    {
      const { ctx, said } = tapBed({});
      ctx.markDocSent(9, 'invoice:deposit');
      eq((said.notices[0] || {}).msg,
         'There is no draft of the deposit invoice waiting to be confirmed. Send a fresh one from the timeline.',
         'no draft at all: said plainly, with nothing to delete');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // The rail — the fixture shape document-claims.test.js uses.
  const RAIL = sandbox({
    fns: ['agrApprovalWithdrawn', 'jobTimeline', '_localDateOf', '_ymdLocal', 'paymentStageWord', 'finalAwaitsHours', 'estimateIsFeeOnly', 'jobTimelineNext', 'jobTimelineActions', 'docReadOnlyWord', 'discountOfferBlocker',
      'estimateSubmitBlocker', 'jobStageDoc', 'docReadiness', 'docDraftOnly', 'docTitle', 'docWord', '_jtDocSecondaries',
      'docPreviewOnly', 'agreementReady', 'isJobWon', 'estimateNoteGaps', 'paymentSplit', 'unscoredRoomNames',
      'jobActivationBlockers', 'jobOnProbateTrack', 'matterDef', 'estimateContractBlocker', 'estimateContractMissing', 'isDecedentJob', 'invFiduciaryMode',
      'matterTypeOf', 'svcHasDocStep', 'docTierOf', 'docTierDef', 'isJobFunded', 'jobPayments', 'stagePaidTotal', 'paymentCounts',
      'depositPaidTotal', 'depositTargetFor', 'docSentAt', 'docKeyFor', 'agreementSignature',
      'isAgreementSigned', 'esignProviderKey', 'esignAvailable', 'esignJobWatches', '_jtSendAction', '_jtDocViews',
      '_jtDraftLink', '_jtDriveLink', 'isAgreementSent', 'estimateEditBlocker', 'priceChangeBlocker',
      // The re-acceptance build's rules, which the rail reads on every job (merged 2026-09-29) — lifted, never stubbed.
      'estimateOutForApproval', '_approvedPriceAbove', 'priceAboveSent', 'priceAboveAcceptance', 'fmtMoney'].concat(HELP),
    vars: ['JT_SHORT', 'JT_NEXT', 'AGR_SIG_METHODS', 'ESIGN_PROVIDERS', 'ESIGN_PROVIDER_KEY', 'JT_ROW_DOC', 'DOC_READY_WHY',
      'DOC_KIND_WORD', 'DOC_STAGE_WORD', 'DOC_ACTIONS', 'ESTIMATE_CONTRACT_FIELDS', 'MATTER_TYPES', 'DOC_TIERS',
      'DOC_TIER_FROM_SCOPE', 'DECEDENT_SERVICES', 'JOB_STEPS', 'currentInvStage'],
    stubs: { REQUIRE_WALKTHROUGH_NOTES: false, SHEETS_SYNC_URL: 'https://script.google.com/macros/s/x/exec' },
  });
  const room = (name) => ({ name, vol: 3, cplx: 3, note: 'seen' });
  const REST = () => ({ rooms: [room('Kitchen'), room('Primary Bedroom')], havellinTotal: 11750, collections: [] });
  function wonJob(o) {
    return Object.assign({ id: 7, name: 'Butler', created: 'Sep 8, 2026', svc: 'home_cleanout', status: 'won', won: true,
      wonAt: '2026-08-31', wonBy: 'Ashley Jerome', wonMethod: 'email', walkthrough: '2020-01-01', approved: true,
      estimateSentDate: 'August 30, 2026', agrApproved: true, agrApprovedBy: 'Anthony Graziano',
      docState: { estimate: { draftedAt: D0, sentAt: D0, provider: 'gmail', mailbox: BOX },
                  agreement: gmail({ draftUrl: 'https://mail.google.com/mail/u/0/#drafts?compose=m1' }) } }, o || {});
  }
  function rail(job, recO) {
    const rec = Object.assign({ estimate: REST(), savedAt: 'Aug 30, 2026', approved: true, submitted: false }, recO || {});
    RAIL.estimateStore = { 7: rec }; RAIL.jobs = [job];
    const rows = RAIL.jobTimeline(job, rec, [], []);
    const row = (k) => rows.filter((r) => r.key === k)[0] || {};
    const acts = (k) => RAIL.jobTimelineActions(row(k), job, rec);
    // The row's own buttons AND the document tray above them (out.doc.acts) — the draft link lives in the tray.
    const calls = (k) => { const a = acts(k);
      return [a.primary].concat(a.secondary || [], (a.doc && a.doc.acts) || []).filter(Boolean).map((x) => x.call); };
    return { rows, row, acts, calls };
  }
  // What the discount does to the job, through the real functions: the approval withdrawn, the price noted.
  function discount(job) {
    job.agrApproved = false; job.agrApprovedBy = ''; job.agrRevokedBy = 'discount-revised';
    RAIL.notePriceChange(job, 'discount');
    return job;
  }

  group('The packet row, before and after the discount — the reproduced defect, driven');
  {
    const before = rail(wonJob());
    eq(before.row('agreement_sent').state, 'current', 'the packet is the live step');
    eq(before.row('agreement_sent').sub, 'Drafted — read it, send it, then confirm', 'a live draft asks to be sent and confirmed');
    eq(before.acts('agreement_sent').primary.call, "markDocSent(7,'agreement')", 'the band offers the confirming tap');
    ok(before.calls('agreement_sent').indexOf("openDocDraft(7,'agreement')") !== -1, 'and the link to the draft');

    const after = rail(discount(wonJob()));
    const sub = after.row('agreement_sent').sub;
    // ⚠ RESTATED 2026-09-30 (audit P14): this fixture's estimate is approved again (the packet's Send is back,
    // below), so the withdrawal says only what is left to do — it said "re-approve the estimate" here until then.
    has(sub, 'A discount changed the price after this was prepared — send a fresh packet',
        'the withdrawal still says what to do in the app');
    lacks(sub, 're-approve', '⚠ and not to re-approve an estimate that is approved again');
    has(sub, 'The Gmail draft from Sep 1 (' + BOX + ') has the old price — delete it, don’t send it',
        '⚠⚠ and the old draft is NAMED — the thing somebody might still send from Gmail');
    ok(sub.indexOf('A discount changed') < sub.indexOf('The Gmail draft'), 'the withdrawal first, then the draft');
    lacks(sub, 'Drafted — read it, send it', '⚠ and it no longer tells anyone to send it');
    const cs = after.calls('agreement_sent');
    ok(cs.every((c) => !/markDocSent/.test(c)), '⚠⚠ the confirming tap is GONE — it would have recorded the old price as sent');
    ok(cs.every((c) => !/openDocDraft/.test(c)), '⚠ and so is the link to the old draft — opening it is the first step to sending it');
    eq(after.acts('agreement_sent').primary.call, "docAction(7,'agreement','send')", 'Send comes back as the one filled button');
    ok(cs.indexOf("docAction(7,'agreement','send',{via:'paper'})") !== -1, 'with the paper route beside it, as on any unsent packet');
  }

  group('A fresh draft after the discount: live again, and the old one named as the one to delete');
  {
    const job = discount(wonJob());
    // The commit hook re-stamps the approval on the send; the fresh draft keeps the overtaken one (docRecordSent, below).
    job.agrApproved = true; job.agrApprovedBy = 'Anthony Graziano';
    job.docState.agreement = gmail({ draftedAt: new Date(Date.parse(job.priceChangedAt) + 60000).toISOString(),
      draftUrl: 'https://mail.google.com/mail/u/0/#drafts?compose=m2',
      staleDrafts: [{ draftedAt: D1, provider: 'gmail', mailbox: BOX, why: 'discount' }] });
    const r = rail(job);
    eq(r.row('agreement_sent').sub,
       'Drafted — read it, send it, then confirm. Delete the older Gmail draft from Sep 1 (' + BOX + ') — it has the old price',
       'the new draft asks to be sent, and the old one is told apart from it');
    eq(r.acts('agreement_sent').primary.call, "markDocSent(7,'agreement')", 'the tap is back — over the NEW draft');
    ok(r.calls('agreement_sent').indexOf("openDocDraft(7,'agreement')") !== -1, 'and the link opens the new one');
    job.docState.agreement.sentAt = new Date(Date.parse(job.priceChangedAt) + 120000).toISOString(); job.agrSent = true;
    eq(rail(job).row('agreement_sent').sub, '', 'once the fresh packet is sent the row has nothing left to say');
  }

  group('A job papered before today keeps its old precedence: the withdrawal outranks the drafted nudge');
  {
    // No priceChangedAt: this build was not there to note the change, so the draft cannot be read as stale. The
    // withdrawal alone — never "Drafted — send it", which would be advice to send the old-price packet.
    const legacy = wonJob({ agrApproved: false, agrApprovedBy: '', agrRevokedBy: 'estimate-edited' });
    // ⚠ RESTATED 2026-09-30 (audit P14): the estimate here is approved again, so the "re-approve it" half went.
    eq(rail(legacy).row('agreement_sent').sub, 'The estimate was edited after this was prepared — send a fresh packet',
       'the withdrawal alone');
    const waiting = wonJob({ agrApproved: false, agrApprovedBy: '', agrRevokedBy: 'estimate-edited', approved: false });
    eq(rail(waiting, { approved: false, submitted: true }).row('agreement_sent').sub,
       'The estimate was edited after this was prepared — re-approve it and send a fresh packet',
       'and, while the estimate waits on the manager, as it always read');
  }

  group('Every document row names its own stale draft, and only its own');
  {
    // The estimate row: drafted, not yet sent.
    const e = wonJob({ estimateSentDate: '', status: 'approved', won: false, wonAt: '', wonBy: '', wonMethod: '',
      agrApproved: false, docState: { estimate: gmail() } });
    eq(rail(e).row('estimate_sent').sub, 'Drafted — read it, send it, then confirm', 'the estimate draft, live');
    RAIL.notePriceChange(e, 'edit');
    eq(rail(e).row('estimate_sent').sub, 'The Gmail draft from Sep 1 (' + BOX + ') was made before the estimate was edited — delete it, don’t send it',
       'overtaken by an edit, it says so');
    const eActs = rail(e).acts('estimate_sent');
    eq(eActs.primary && eActs.primary.call, "docAction(7,'estimate','send')",
       'and a stale estimate draft brings Send back on its row, never the confirming tap');

    // The three invoices, each reading its own key.
    const inv = wonJob({ agrSent: true, agrSigned: true, agrSignedAt: 'September 2, 2026', priceChangedAt: CHANGE, priceChangeWhy: 'edit',
      docState: { estimate: { draftedAt: D0, sentAt: D0 }, agreement: { draftedAt: D0, sentAt: D0 },
                  'invoice:deposit': gmail() } });
    const r = rail(inv);
    has(r.row('deposit_invoiced').sub, 'The Gmail draft from Sep 1', 'the deposit invoice row names its stale draft');
    eq(r.row('midpoint_invoiced').sub || '', '', 'and the midpoint, with no draft, says nothing about one');
    eq(r.row('final_invoiced').sub || '', '', 'nor the final');
    inv.docState['invoice:final'] = gmail();
    has(rail(inv).row('final_invoiced').sub, 'The Gmail draft from Sep 1', 'the final invoice row names its own');
    inv.docState['invoice:midpoint'] = gmail();
    has(rail(inv).row('midpoint_invoiced').sub, 'The Gmail draft from Sep 1', 'and the midpoint its own');
    ok(!/['"]Drafted/.test(live(fn('jobTimeline'))), '⚠ no row hand-writes the drafted sentence — jtDraftLine is the one builder');
    eq((live(fn('jobTimeline')).match(/jtDraftLine\(/g) || []).length, 5,
       'five rows, one builder (estimate · packet · deposit · midpoint · final)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('The discount itself, driven on the real applyDiscountRevision and openDiscountModal');
  {
    const DISC_FNS = ['discountPreview', 'estPreDiscountTotal', 'discountOnLabor', 'applyDiscountRevision', 'discountOfferBlocker',
      'discountPctInput', '_discountModalSays', 'revokeAgreementApproval', '_dashFbTarget', '_jobBandHost', '_dashRedraw',
      'isAgreementSigned', 'agreementSignature', 'isAgreementSent', 'docSentAt', 'docKeyFor', 'estFixedFee', 'estPrepFeeOnTop',
      'updateDiscountModal', 'openDiscountModal', 'closeDiscountModal', 'dashNotice', 'notifyManagerForApproval',
      'priceChangeBlocker', 'estimateEventStatus', 'isJobWon', 'docState', '_jobTouch', '_docNotice', 'estFixedLines', 'discountOnFixedFee', 'fixedDiscountBasisWords'].concat(HELP);
    const DISC_VARS = ['MAX_DISCOUNT_PCT', 'RUSH_PCT', '_dashboardJobId', '_packetExported', 'currentAgrJobId', '_dashNotice', 'currentInvStage', 'estimateApproved', 'estimateSubmitted',
      'discountRevision', 'approvedBy', 'approvedAt'];
    const EST = () => ({ jobId: 1, tcFee: 7000, psFee: 4750, havellinTotalFull: 11750, rush: false, rushAmt: 0,
      discountPct: 0, discountAmt: 0, havellinTotal: 11750, grandTotal: 11750, fixedPrice: false });
    function bed(jobO) {
      const doc = domStub({ 'dm-pct': '10' });
      const said = { fb: [], mail: [] };
      const ctx = sandbox({ fns: DISC_FNS, vars: DISC_VARS, stubs: {
        document: doc,
        jobs: [Object.assign({ id: 1, name: 'Butler', status: 'won', won: true, agrApproved: true, agrApprovedBy: 'Anthony Graziano' }, jobO || {})],
        currentEstimate: EST(),
        saveJobs() {}, syncJobToSheets() {}, saveEstimateState() {}, renderClientEstimate() {}, updateApprovalUI() {},
        showFB(el, type, m) { said.fb.push({ el, type, m }); }, showSyncBadge() {},
        assignedTCContact() { return { name: 'Ashley Jerome' }; }, svcLabelOf() { return 'Home Cleanout'; },
        sendInternalEmail(to, subj, lines) { said.mail.push(lines.join('\n')); },
        MANAGER_APPROVAL_EMAIL: 'anthony@example.com', renderClientDashboard() {}, _repaintJobBand() {}, setTimeout() {},
      } });
      ctx._packetExported = {};
      return { ctx, doc, said, job: ctx.jobs[0] };
    }
    {
      const { ctx, doc, job } = bed({ docState: { agreement: gmail() } });
      ctx.openDiscountModal();
      const w = doc.getElementById('dm-drafts').innerHTML;
      has(w, 'alert a-warn', 'the pop-up carries a warning BEFORE the discount is applied');
      has(w, 'The signing packet was drafted in Gmail on Sep 1 (' + BOX + ')', 'naming the draft');
      has(w, 'Already sent it? Cancel and tap “I’ve sent it” instead', 'and the way out if it has already gone');
      doc.getElementById('dm-pct').value = '10';
      ctx.applyDiscountRevision();
      ok(!!job.priceChangedAt, '⚠ the discount notes the price change on the job');
      eq(job.priceChangeWhy, 'discount', 'as a discount');
      eq(ctx.draftOutstanding(job, 'agreement'), false, '⚠⚠ so the old-price packet draft stops being the draft');
      eq(ctx.draftIsStale(job, job.docState.agreement), true, 'it reads stale');
      eq(job.docState.agreement.draftedAt, D1, 'and its record is untouched');
      const n = ctx._dashNotice || {};
      eq(n.type, 'warn', 'the confirmation is a warning when it has flagged a draft');
      has(n.msg, 'Discount applied.', 'it confirms the discount');
      has(n.msg, '⚠ The Gmail draft of the signing packet from Sep 1 (' + BOX + ') has the old price — delete it, don’t send it.',
          '⚠⚠ and names the draft it just left out of date');
      has(n.msg, 'if the old one already reached the client, tell them a revised one is coming', 'and what to tell the client');
    }
    {
      const { ctx, doc, job } = bed({ docState: {} });
      doc.getElementById('dm-drafts').innerHTML = '<div>left over from the last job</div>';
      ctx.openDiscountModal();
      eq(doc.getElementById('dm-drafts').innerHTML, '', '⚠ a job with no draft CLEARS the slot — a warning left from the last job would be a false claim');
      doc.getElementById('dm-pct').value = '10';
      ctx.applyDiscountRevision();
      const n = ctx._dashNotice || {};
      eq(n.type, 'ok', 'with nothing flagged the confirmation is plain');
      lacks(n.msg, '⚠', 'and names no draft');
      ok(!!job.priceChangedAt, 'the price change is still noted — a draft made on another device reads stale against it');
    }
    {
      const { ctx, doc, job } = bed({ docState: { agreement: gmail() } });
      doc.getElementById('dm-pct').value = '';
      ctx.applyDiscountRevision();
      ok(!job.priceChangedAt, 'the converse: a REFUSED discount changes no price and notes none');
      ok(ctx.draftOutstanding(job, 'agreement'), 'so the draft is still the draft');
    }
  }

  group('The edit door, driven on the real revokeEstimateApproval');
  {
    const said = { saved: 0 };
    const ctx = sandbox({
      fns: ['revokeEstimateApproval', 'revokeAgreementApproval', 'notePriceChange', 'outstandingDrafts', 'draftOutstanding', 'docDraftPending', 'draftIsStale'],
      vars: ['currentAgrJobId', '_packetExported'],
      stubs: { saveJobs() { said.saved++; }, syncJobToSheets() {}, showSyncBadge() {} },
    });
    ctx._packetExported = {};
    ctx.jobs = [{ id: 3, approved: true, agrApproved: true, docState: { estimate: gmail(), agreement: gmail() } }];
    ctx.estimateStore = { 3: { approved: true } };
    const job = ctx.revokeEstimateApproval(3);
    eq(job.priceChangeWhy, 'edit', 'editing the estimate notes a price change as an edit');
    eq(ctx.outstandingDrafts(job), [], '⚠ and both drafts made before it stop being the drafts');
    ok(job.updatedAt, 'the job’s clock moves with it, so the note rides the save');
    ok(said.saved >= 1, 'and it is saved');
    const body = (n) => live(fn(n));
    has(body('dashEditEstimate'), 'revokeEstimateApproval(', 'the rail’s Edit estimate comes through it');
    has(body('editEstimateFromCE'), 'revokeEstimateApproval(', 'and so does the Client Estimate tab’s');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('A fresh send keeps the overtaken draft on record — driven on the real docRecordSent and docSend');
  {
    function sendBed(provider, jobO) {
      const said = { notices: [], filed: 0 };
      const PROVIDERS = {
        gmail:    { needsHumanSend: true,  carriesAttachment: true,  send(spec, pdf, cb) { cb(true, '', 'https://mail.google.com/mail/u/0/#drafts?compose=m2'); } },
        mailto:   { needsHumanSend: true,  carriesAttachment: false, send(spec, pdf, cb) { cb(true, ''); } },
        docusign: { needsHumanSend: false, carriesAttachment: true,  send(spec, pdf, cb) { cb(true, '', '', { envelopeId: 'e1', esignStatus: 'sent' }); } },
      };
      const ctx = sandbox({
        fns: ['docSend', 'docRecordSent', 'docState', '_jobTouch', '_actor', '_stamp'].concat(HELP),
        stubs: {
          DOC_SEND_PROVIDERS: PROVIDERS, _docBusy: null, docProvider: () => provider, esignAnchorsPresent: () => [],
          _dashSendState() {}, setTimeout: () => 0, clearTimeout() {}, docPdfBase64: (spec, h, cb) => cb('JVBERi0='),
          _pdfFailAdviceText: () => '', esignSigner: () => ({ name: 'Tripp Butler' }), docAction() { said.filed++; },
          _docNotice(type, msg) { said.notices.push({ type, msg }); }, showSyncBadge() {}, saveJobs() {}, syncJobToSheets() {},
          _gmailUserEmail: BOX,
        },
      });
      const job = Object.assign({ id: 7, name: 'Tripp Butler', agrApproved: true, agrApprovedBy: 'Anthony Graziano',
        priceChangedAt: CHANGE, priceChangeWhy: 'discount', docState: { agreement: gmail() } }, jobO || {});
      ctx.jobs = [job];
      ctx.docSend({ job, kind: 'agreement', key: 'agreement', to: 'tripp@example.com',
                    cfg: { html: () => '<p>the packet</p>' } });
      return { ctx, said, job };
    }
    {
      const { ctx, said, job } = sendBed('gmail');
      const st = job.docState.agreement;
      eq(st.staleDrafts, [{ draftedAt: D1, provider: 'gmail', mailbox: BOX, why: 'discount' }],
         '⚠⚠ the overtaken draft is kept on record before the fresh one overwrites it — it is still in a mailbox');
      ok(st.draftedAt > CHANGE, 'the fresh draft is stamped now');
      eq(st.mailbox, BOX, 'and records whose drafts folder it is in');
      ok(ctx.draftOutstanding(job, 'agreement'), 'the fresh draft is the live one');
      eq(ctx.staleDraftsOf(job, 'agreement').length, 1, 'and the old one is still named');
      const n = said.notices[said.notices.length - 1] || {};
      has(n.msg, 'Draft created in ' + BOX + ' with the PDF attached', 'the send says what it did');
      has(n.msg, '⚠ Delete the older Gmail draft from Sep 1 (' + BOX + ') — it has the old price.',
          '⚠ and, while there are two, which one to delete');
      eq(n.type, 'warn', 'as a warning, though the PDF attached');
      eq(said.filed, 1, 'and files the fresh document, as every send does');
    }
    {
      const { said, job } = sendBed('docusign');
      const st = job.docState.agreement;
      ok(!!st.sentAt, 'DocuSign sends: the packet is recorded as sent');
      eq((st.staleDrafts || []).length, 1, 'and the overtaken Gmail draft is kept on record');
      eq(st.mailbox, '', 'a DocuSign send records no mailbox');
      const n = said.notices[said.notices.length - 1] || {};
      has(n.msg, 'Sent to Tripp Butler for signature through DocuSign', 'the send says it went');
      has(n.msg, '⚠ Delete the older Gmail draft from Sep 1 (' + BOX + ') — it has the old price.',
          '⚠⚠ and names the old Gmail draft — read BEFORE the record writes sentAt, or a sent packet would name nothing');
      eq(rail(Object.assign(wonJob(), { docState: job.docState, agrSent: true })).row('agreement_sent').sub, '',
         'once it has gone, the row has nothing left to say');
    }
    {
      const { said, job } = sendBed('mailto');
      eq(job.docState.agreement.mailbox, '', 'a mailto records no mailbox — the app cannot know which client opened');
      eq((job.docState.agreement.staleDrafts || []).length, 1, 'and keeps the overtaken draft the same way');
      has((said.notices[said.notices.length - 1] || {}).msg, 'Delete the older Gmail draft', 'named on the send');
    }
    {
      const { said, job } = sendBed('gmail', { priceChangedAt: undefined, docState: {} });
      eq(job.docState.agreement.staleDrafts, undefined, 'a first send with nothing overtaken keeps no history');
      const n = said.notices[said.notices.length - 1] || {};
      eq(n.type, 'ok', 'and the notice is plain');
      lacks(n.msg, '⚠', 'naming nothing');
    }
    {
      // A re-send at the SAME price: the earlier draft is not out of date, so it is not kept as one.
      const { job } = sendBed('gmail', { priceChangedAt: undefined });
      eq(job.docState.agreement.staleDrafts, undefined, 'a second draft at the same price is not "the old price"');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ The message on screen survives a redraw the app makes on its own — and only that');
  {
    // Measured through the real Apply button: the discount submits the estimate, the approval watch fires
    // AT ONCE, and its redraw took the confirmation — and the out-of-date draft it names — off the screen
    // the moment its fetch answered. Driven here on the real painter, the real _dashRedraw and _docNotice.
    const painted = [];
    const N = sandbox({
      fns: ['_dashNoticeHtml', '_asBackgroundRedraw', 'dashNotice', '_dashRedraw', '_docNotice', 'esc'],
      vars: ['_dashNotice', '_dashShown', '_dashKeepNotice', '_dashboardJobId'],
      stubs: {
        document: { getElementById: (id) => (id === 'client-dashboard-view' ? { style: { display: 'block' } } : (id === 'dash-fb' ? {} : null)) },
        _jobBandHost: () => ({ kind: 'dash', jobId: 7, fb: 'dash-fb' }),
        renderClientDashboard(jobId) { painted.push(N._dashNoticeHtml('dash', jobId, true)); },
        _repaintJobBand() {}, alert() {},
      },
    });
    N._dashboardJobId = 7;
    const last = () => painted[painted.length - 1] || '';
    N._docNotice('warn', 'Discount applied. ⚠ The Gmail draft … <b>old</b> price', 7);
    has(last(), 'alert a-warn', 'the person’s action paints its notice, as a warning');
    has(last(), 'Discount applied.', 'saying what happened');
    has(last(), '&lt;b&gt;old&lt;/b&gt;', 'escaped — it carries a mailbox address');
    eq(N._dashNotice, null, 'and the pending notice is consumed');
    N._asBackgroundRedraw(() => N._dashRedraw(7));
    has(last(), 'Discount applied.', '⚠⚠ the approval watch’s redraw paints it AGAIN rather than wiping it');
    has(last(), 'alert a-warn', 'as the same warning');
    eq(N._dashKeepNotice, false, 'and the flag is down again once that redraw is done');
    N._dashRedraw(7);
    eq(last(), '', 'the person’s NEXT redraw clears it — shown once, as ever');
    N._asBackgroundRedraw(() => N._dashRedraw(7));
    eq(last(), '', 'and a background redraw after that cannot bring it back');

    // Never across jobs or surfaces, and a new message always wins.
    N.dashNotice('ok', 'Recorded as sent.'); N._dashRedraw(7);
    has(last(), 'Recorded as sent.', 'a new message on the dashboard');
    eq(N._asBackgroundRedraw(() => N._dashNoticeHtml('plan', 7, true)), '',
       'a background redraw of the job-page band paints nothing the dashboard showed — another surface');
    N.dashNotice('ok', 'Recorded as sent.'); N._dashRedraw(7);
    N._asBackgroundRedraw(() => painted.push(N._dashNoticeHtml('dash', 8, true)));
    eq(last(), '', 'a background redraw of ANOTHER job paints no message of this one');
    N._asBackgroundRedraw(() => N._dashRedraw(7));
    eq(last(), '', 'and having moved on, the old job does not get it back');
    N.dashNotice('ok', 'First.'); N._dashRedraw(7);
    N.dashNotice('warn', 'Second.');
    N._asBackgroundRedraw(() => N._dashRedraw(7));
    has(last(), 'Second.', 'a message set since wins over the one on screen');
    lacks(last(), 'First.', 'and replaces it');

    // A surface that is not the one handlers speak to neither shows nor consumes anything.
    N.dashNotice('ok', 'Kept for the right surface.');
    eq(N._dashNoticeHtml('plan', 7, false), '', 'not mine: nothing painted');
    eq((N._dashNotice || {}).msg, 'Kept for the right surface.', 'and the pending notice is left for the surface it belongs to');

    // The flag is scoped: restored after a throw, and nested calls unwind.
    let threw = false;
    try { N._asBackgroundRedraw(() => { throw new Error('boom'); }); } catch (e) { threw = true; }
    ok(threw && N._dashKeepNotice === false, 'a throwing redraw still puts the flag down');
    eq(N._asBackgroundRedraw(() => N._asBackgroundRedraw(() => 5)), 5, 'it returns what the redraw returns');
    eq(N._dashKeepNotice, false, 'nested calls unwind to down');

    // The net: which redraws keep, which clear — by what they ARE.
    ['approvalWatchTick', '_jobsLanded', '_estStoreLanded'].forEach((n) =>
      has(live(fn(n)), '_asBackgroundRedraw(', n + ' is a redraw the app makes on its own'));
    eq((live(fn('openClientDashboard')).match(/_asBackgroundRedraw\(/g) || []).length, 2,
       'and so are the two arrival checks on opening a client (DocuSign, Stripe)');
    // …and ONLY those two: opening a client is a person's press, so its own paint must clear the last
    // message rather than carry it onto the next client. Checked directly, not left to the count above,
    // which would still read 2 if one arrival check were unwrapped and the main paint wrapped instead.
    ok(!/_asBackgroundRedraw\([^;]*renderClientDashboard/.test(live(fn('openClientDashboard'))),
       'opening a client is a person’s action — its own paint clears the last message');
    ['_docNotice', 'dashNotice', 'markDocSent', 'applyDiscountRevision'].forEach((n) =>
      lacks(live(fn(n)), '_asBackgroundRedraw', n + ' is a person’s action — its redraw clears the old message'));
    ['renderClientDashboard', 'jobProgressBlockHtml'].forEach((n) => {
      has(live(fn(n)), '_dashNoticeHtml(', n + ' paints through the one painter');
      lacks(live(fn(n)), '_dashNotice = null', n + ' keeps no clear of its own');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ Two devices: the draft made on one, the discount on the other’s morning copy — through the real merge');
  {
    const S = { console, Date };
    vm.createContext(S);
    vm.runInContext([gsVar('JOB_KEYED_LISTS'), gsVar('JOB_KEYED_MAPS'), gsVar('JOB_LIST_KEY'), gsVar('JOB_PAYMENT_STICKY'),
      ...['_jobStamp', '_jobListKey', '_mergeJobKeyed', '_mergeJobRecord', '_paymentSticky'].map(gsFn)].join('\n\n'), S,
      { filename: 'main-sync.gs (extracted)' });
    const W = sandbox({ fns: ['docState', '_jobTouch'].concat(HELP) });

    const MORNING = 1756800000000;
    const morning = () => ({ id: 7, name: 'Butler', status: 'won', won: true, agrApproved: true, updatedAt: MORNING,
      docState: { estimate: { draftedAt: D0, sentAt: D0 } }, at: { 'docState:estimate': MORNING } });
    // Device A drafts the packet, through the writer's accessor (which stamps the key and the record).
    const A = morning();
    const st = W.docState(A, 'agreement');
    st.draftedAt = D1; st.provider = 'gmail'; st.mailbox = BOX;
    // Device B, still on the morning copy, offers the discount a little later.
    const B = morning();
    eq(W.outstandingDrafts(B), [], '⚠ B holds no draft — which is exactly why the flag cannot be written into the draft at the door');
    W.notePriceChange(B, 'discount');
    B.updatedAt = Math.max(A.updatedAt, Date.now()) + 1000;
    [['A then B', S._mergeJobRecord(A, B)], ['B then A', S._mergeJobRecord(B, A)]].forEach(([order, m]) => {
      eq(m.priceChangedAt, B.priceChangedAt, order + ': the merged job carries when the price moved');
      eq((m.docState.agreement || {}).draftedAt, D1, order + ': and A’s draft, merged per key');
      eq(W.draftIsStale(m, m.docState.agreement), true, '⚠⚠ ' + order + ': so the draft reads stale wherever the two meet');
      eq(W.draftOutstanding(m, 'agreement'), false, order + ': and is not confirmable');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('The nets');
  {
    // Every reader of a draft stamp is one of these — so the next "is there a draft" cannot be written
    // beside draftOutstanding and quietly skip the price change.
    const ALLOWED = {
      draftIsStale: 'the rule', draftOutstanding: 'the one definition of a live draft', staleDraftsOf: 'the history',
      staleDraftNote: 'the sentence', discountDraftWarning: 'the pop-up (reads the outstanding record)',
      docRecordSent: 'the writer',
      // The send-order rule, folded into the first two on the merge with the re-acceptance build: a draft newer
      // than the last send is outstanding again (the revised estimate after a raise).
      docDraftPending: 'the send-order rule',
      // The Re-open (2026-09-29): it RETIRES a final drafted at the close into the history (staleDrafts), the same
      // place docRecordSent keeps one a price change overtook. It reads the stamp to move it, never as "is there one to send".
      _reopenTransition: 'the Re-open, retiring a final drafted at the close',
      // A different record entirely: job.reviewAsk, the Google-review email at the close.
      closeoutState: 'reviewAsk', renderCloseoutBody: 'reviewAsk', draftReviewRequest: 'reviewAsk', markReviewRequestSent: 'reviewAsk',
    };
    const names = [...new Set([...src.matchAll(/(^|\n)function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[2]))];
    const readers = names.filter((n) => { let b; try { b = fn(n); } catch (e) { return false; } return /draftedAt/.test(live(b)); });
    eq(readers.filter((n) => !ALLOWED[n]), [], '⚠ no function reads a draft stamp except the named few');
    ok(readers.length >= 6, 'and the scan found them (vacuity guard)');
    lacks(src, 'function docDraftedAt', 'docDraftedAt is gone — it answered "was a draft made" and was read as "is there one to send"');

    ['_jtSendAction', '_jtDraftLink', 'markDocSent', 'jtDraftLine'].forEach((n) =>
      has(live(fn(n)), 'draftOutstanding(', n + ' asks the one definition'));
    const callers = names.filter((n) => { if (n === 'notePriceChange') return false; let b; try { b = fn(n); } catch (e) { return false; }
      return /notePriceChange\(/.test(live(b)); });
    eq(callers.sort(), ['applyDiscountRevision', 'revokeEstimateApproval'], 'the two price-change doors, and only they, note the change');

    // The pop-up's slot, above the refusal strip, which is cleared on every keystroke.
    const dd = src.indexOf('<div id="dm-drafts"></div>'), df = src.indexOf('<div id="dm-fb"></div>');
    ok(dd > 0 && df > dd, 'the discount pop-up carries its own slot for the draft warning, above the refusal strip');
    has(live(fn('openDiscountModal')), 'esc(_ddMsg)', 'and the warning is escaped — it carries a mailbox address');
    lacks(live(fn('applyDiscountRevision')), "showFB(_dashFbTarget", 'the confirmation no longer goes onto a strip the redraw wipes');
  }
}
