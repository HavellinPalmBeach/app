'use strict';
// CLOSE-OUT, THE BAND ON BOTH JOB TABS, AND A PREP JOB'S DESK (2026-09-22).
//
// Anthony, off Job Admin & Inv on a Home Prep job: *"this needs to be massively re-worked.
// everything below job admin - desk paperwork is immaterial to a home prep job. also, should we
// rate every vendor we use at the end of a job? shouldn't all the vendors we used be here …
// shouldn't we close out with asking for a client review on google or something? job closeout
// needs work too."* Then, answering the four questions put back to him: the review link, *"lets'
// email like we do invoices"*, *"ratings for vendors should be mandatory"*, and the close-out on
// *"Job Plan. and Admin."* — plus the client header and *"the brown band with actions and the
// deposit & start timeline"* on both job tabs.
//
// Measured before anything changed, on a prep job with four confirmed trades:
//   the scorecard            "No vendors were assigned" — it read two of the four sourcing buckets
//   the prep Job Plan        no satisfaction call, no review ask, no referral ask, no scorecard
//   Job Admin & Inv          a Contents Record, a CSV, an Approval Request, + Add line item, an
//                            empty manifest and the appraiser roster, on a house we inventory nothing in
//   the desk card            "All rooms cleared — 0 of 0" open forever on a job with no rooms
//   closing the job          allowed with nobody rated

const { sandbox, fn } = require('./harness');
const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

const CARD_FNS = ['renderCloseoutCard', 'renderCloseoutBody', 'closeoutState', 'closeoutMeta',
  '_assignedVendorsForJob', 'unratedVendorsForJob', 'lookupVendorById', 'vendorIdOf',
  'bestClientEmail', '_coFmt', 'renderVendorScorecard', 'computeVendorAvg', 'planChk',
  '_planTaskDone', 'chkGrid', 'jobCloseBlockers'];

// A prep job: four trades sourced, three confirmed (one twice — the same firm on two lines), one
// still at "Quote requested"; a hauler confirmed at the end; and a collection partner assigned.
const VENDORS = [
  { _row: 2, vendor_name: 'Ace Painting' },
  { _row: 3, vendor_name: 'Sparkle Cleaning' },
  { _row: 4, vendor_name: 'Green Thumb' },
  { _row: 5, vendor_name: 'Junk Kings' },
  { _row: 6, vendor_name: 'Sothebys' },
];
const JOB = () => ({
  id: 7, svc: 'prep', name: 'Margaret Whitfield', email: 'mw@example.com', fname: 'Margaret',
  addr: '231 Seaspray Ave, Palm Beach', status: 'active',
  prepSourcing: {
    La: { vendorId: 2, vendorName: 'Ace Painting', status: 'Confirmed' },
    Lb: { vendorId: 3, vendorName: 'Sparkle Cleaning', status: 'Confirmed' },
    Lc: { vendorId: 4, vendorName: 'Green Thumb', status: 'Quote requested' },
    Ld: { vendorId: 2, vendorName: 'Ace Painting', status: 'Confirmed' },
  },
  logisticsSourcing: { junk: { vendorId: 5, vendorName: 'Junk Kings', status: 'Confirmed' } },
});

module.exports = function ({ group, ok, eq, has, lacks }) {
  const card = (extra) => sandbox({
    fns: CARD_FNS.concat(extra || []),
    vars: ['CLOSEOUT_TASK_KEYS', 'VENDOR_RATING_WINDOW'],
    stubs: { vendorDirectory: VENDORS, jobPlanStore: {}, jobs: [] },
  });

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ EVERY VENDOR THE JOB USED — all four sourcing buckets, confirmed only, once each');
  {
    const t = card();
    const v = t._assignedVendorsForJob(JOB()).map((x) => x.name);
    ok(v.indexOf('Ace Painting') >= 0 && v.indexOf('Sparkle Cleaning') >= 0,
      '⚠⚠ prep trades are on the scorecard — the old reader never looked in prepSourcing');
    ok(v.indexOf('Junk Kings') >= 0, 'and so is the end-of-job hauler, from logisticsSourcing');
    ok(v.indexOf('Green Thumb') < 0, '⚠ a vendor never confirmed is a firm we did not use — no mandatory rating for no work');
    eq(v.filter((n) => n === 'Ace Painting').length, 1, 'a firm on two lines is ONE relationship and one row');
    const j = JOB(); j.collSourcing = { c1: { vendorId: 6, vendorName: 'Sothebys' } };
    ok(t._assignedVendorsForJob(j).some((x) => x.name === 'Sothebys'),
      'a collection partner counts when assigned — collSourcing carries no status, the rule vendorSourcingProgress already uses');
    j.vendorSourcing = { L1: { vendorId: 4, vendorName: 'Green Thumb', status: 'Confirmed' } };
    ok(t._assignedVendorsForJob(j).some((x) => x.name === 'Green Thumb'), 'and a confirmed service vendor, as before');
    eq(t._assignedVendorsForJob({ id: 1 }).length, 0, 'a job with no sourcing has nobody to rate');
    eq(t._assignedVendorsForJob(null).length, 0, 'and a missing job answers empty rather than throwing');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ RATINGS ARE MANDATORY — the job does not close with a vendor unrated');
  {
    const t = sandbox({
      fns: ['applyJobTransition', 'jobActivationBlockers', 'jobCloseBlockers', 'unratedVendorsForJob',
            '_assignedVendorsForJob', 'lookupVendorById', 'vendorIdOf', '_actor', '_todayStr'],
      vars: ['JOB_TRANSITIONS'],
      stubs: { vendorDirectory: VENDORS, agrApprovedBy: '', alerts: [] },
    });
    const said = [];
    t.alert = (m) => said.push(m);
    const j = JOB();
    eq(t.jobCloseBlockers(j).length, 1, 'three vendors unrated is one blocker');
    has(t.jobCloseBlockers(j)[0], 'Ace Painting', 'which names them');
    has(t.jobCloseBlockers(j)[0], 'Junk Kings', 'every one of them');
    has(t.jobCloseBlockers(j)[0], 'Close-out card', 'and says where the fix is');
    ok(t.applyJobTransition(j) === false, 'closing an active job with vendors unrated is refused');
    eq(j.status, 'active', 'and the status does not move');
    ok(!j.deliveredOn, 'nor is a delivery date stamped on a close that did not happen');
    has(said[0] || '', 'Cannot close the job yet', 'and the refusal is said out loud');
    j.vendorRatings = { 2: { rating: 5 }, 3: { rating: 4 } };
    ok(t.applyJobTransition(j) === false, 'two of three is still refused');
    has(t.jobCloseBlockers(j)[0], 'Junk Kings', 'naming only the one left');
    lacks(t.jobCloseBlockers(j)[0], 'Ace Painting', 'and not the ones already rated');
    j.vendorRatings[5] = { rating: 3 };
    ok(t.applyJobTransition(j) === true, 'once every vendor used is rated, it closes');
    eq(j.status, 'closed', 'and the status moves');
    j.agrSigned = true; j.depositReceived = true;   // re-opening IS an activation, with its own gate
    j.vendorRatings = {};
    ok(t.applyJobTransition(j) === true && j.status === 'active', 're-opening a closed job is not gated on ratings');
    const none = { id: 9, status: 'active' };
    ok(t.applyJobTransition(none) === true, 'a job with nobody to rate closes as it always did');
    // An activation is not a close — the gate must not leak onto the other transition.
    const w = Object.assign(JOB(), { status: 'won', agrSigned: true, depositReceived: true });
    ok(t.applyJobTransition(w) === true, 'activating a job with vendors unrated is NOT refused — ratings are a close-out question');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the close-out card, in the order it is done — and the review ask waits on the call');
  {
    const t = card();
    const j = JOB();
    let h = t.renderCloseoutBody(7, j);
    ['Satisfaction call', 'Google review', 'Referral ask', 'Vendor scorecard'].forEach((s) =>
      has(h, s, 'the card carries ' + s));
    ok(h.indexOf('Satisfaction call') < h.indexOf('Google review') && h.indexOf('Google review') < h.indexOf('Referral ask')
       && h.indexOf('Referral ask') < h.indexOf('Vendor scorecard'), 'in the order the close is done');
    has(h, 'Draft review request</button>', 'the review button is there');
    has(h, '<button class="btn-s" disabled>', '⚠⚠ and disabled until the satisfaction call is ticked');
    has(h, 'Unlocks once the satisfaction call is ticked', 'and the card says why');
    lacks(h, 'draftReviewRequest(7)', 'so there is nothing to press yet');
    has(h, '0 of 3 rated', 'the scorecard heads with the count');
    has(h, 'required before the job can close', 'and says it is required');
    has(h, 'Not rated — required to close the job', 'each unrated row says so');

    t.jobPlanStore[7] = { tasks: { satisfaction_call: true } };
    h = t.renderCloseoutBody(7, j);
    has(h, 'draftReviewRequest(7)', 'ticking the call unlocks the draft');
    has(h, 'mw@example.com', 'and names who it goes to');

    j.reviewAsk = { draftedAt: '2026-09-22T15:00:00Z', draftUrl: 'https://mail.google.com/x', via: 'gmail' };
    h = t.renderCloseoutBody(7, j);
    has(h, 'markReviewRequestSent(7)', 'drafted: the confirming tap');
    has(h, 'Open draft', 'and the draft is one tap away');
    has(h, 'read it, send it, then confirm', 'the same two-step as every other client email');

    j.reviewAsk.sentAt = '2026-09-22T16:00:00Z';
    h = t.renderCloseoutBody(7, j);
    has(h, "togglePlanTask(7,'review_posted'", 'sent: a box for the review actually appearing on Google');
    lacks(h, 'markReviewRequestSent(7)', 'and the confirming tap is withdrawn');
    has(t.closeoutMeta(7, j), '2 of 3 done', 'the fold count moves with the steps');
    has(t.closeoutMeta(7, j), '0 of 3 vendors rated', 'and carries the rating count');

    j.vendorRatings = { 2: { rating: 5, writtenAt: 'x' }, 3: { rating: 4, writeErr: 'failed' }, 5: { rating: 3 } };
    h = t.renderCloseoutBody(7, j);
    has(h, '3 of 3 rated', 'every vendor rated reads complete');
    has(h, 'Saved to the Vendor Directory', 'a rating that reached the directory says so');
    has(h, 'not yet saved to the directory', 'and one that did not says so too — never silently');
    has(t.renderCloseoutCard(7, j, 'admin'), 'id="closeout-admin-7"', 'the card carries its host in its id');
    has(t.renderCloseoutCard(7, j, 'plan'), 'id="closeout-plan-7"', 'so both tabs can be repainted');
    has(t.renderVendorScorecard(7, { id: 7 }), 'No vendors were confirmed', 'a job with nobody to rate says so');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ the steps gate each other, so a tick repaints the card');
  {
    const tp = noComments(fn('togglePlanTask'));
    has(tp, 'if (CLOSEOUT_TASK_KEYS[key]) _repaintCloseout(jobId);', 'a close-out tick repaints the card');
    const t = card();
    ok(t.CLOSEOUT_TASK_KEYS.satisfaction_call && t.CLOSEOUT_TASK_KEYS.referral_ask && t.CLOSEOUT_TASK_KEYS.review_posted,
      'the three keys are the card\'s');
    const rp = noComments(fn('_repaintCloseout'));
    has(rp, "['plan', 'admin']", 'both hosts are repainted');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the Google review email — the sender\'s own Gmail, the link, and never before the call');
  {
    const drafts = [], notices = [];
    const t = sandbox({
      fns: ['draftReviewRequest', 'markReviewRequestSent', 'buildReviewEmailText', 'buildReviewEmailHtml',
            'reviewEmailSubject', '_reviewPlace', '_reviewMailtoUrl', 'bestClientEmail', 'bestClientGreetingName',
            'firstName', 'isDecedentJob', '_emHtml', '_planTaskDone', 'conciergePhonesText', 'conciergePhones'],
      vars: ['GOOGLE_REVIEW_URL', 'EMAIL_BRAND', 'DECEDENT_SERVICES', 'HAVELLIN_OFFICE_PHONE', 'NON_MOBILE_NUMBERS'],
      stubs: {
        jobPlanStore: {}, saveJobs() {}, syncJobToSheets() {}, _repaintCloseout() {}, _actor: () => 'Ashley Jerome',
        assignedTCContact: () => ({ name: 'Ashley Jerome', phone: '' }),
        gmailConfigured: () => true,
        buildMimeMessage: (o) => JSON.stringify(o),
        gmailCreateDraft: (mime, cb) => { drafts.push(JSON.parse(mime)); cb(true, { messageId: 'm1' }); },
        gmailDraftUrl: (id) => 'https://mail.google.com/mail/u/0/#drafts?compose=' + id,
        _gmailUserEmail: 'ashley@havellinpalmbeach.com',
        _coNotice: (id, type, msg) => notices.push(type + ':' + msg),
      },
    });
    t.window.open = () => {};
    const j = JOB(); t.jobs = [j];
    t.draftReviewRequest(7);
    eq(drafts.length, 0, '⚠⚠ no draft before the satisfaction call is ticked');
    has(notices[0], 'satisfied by phone first', 'and it says why');
    t.jobPlanStore[7] = { tasks: { satisfaction_call: true } };
    t.draftReviewRequest(7);
    eq(drafts.length, 1, 'with the call ticked, one draft');
    eq(drafts[0].to, 'mw@example.com', 'to the client');
    has(drafts[0].html, t.GOOGLE_REVIEW_URL, 'carrying the review link');
    has(drafts[0].text, t.GOOGLE_REVIEW_URL, 'in the plain-text half too');
    eq(t.GOOGLE_REVIEW_URL, 'https://g.page/r/CcQOjVMdHUcnEBM/review', 'which is the Havellin Google Business Profile link');
    has(drafts[0].html, 'your home at 231 Seaspray Ave', 'a living client reads "your home"');
    lacks(drafts[0].html, 'Ashley Jerome', 'no signature in the Gmail body — Gmail appends the sender\'s own');
    eq(j.reviewAsk.via, 'gmail', 'the draft is recorded on the job');
    has(j.reviewAsk.draftUrl, 'compose=m1', 'with its link, so the card can reopen it');
    ok(!j.reviewAsk.sentAt, '⚠ and a draft is NOT a send — gmail.compose cannot send, a person does');
    t.markReviewRequestSent(7);
    ok(!!j.reviewAsk.sentAt, 'the confirming tap records the send');
    eq(j.reviewAsk.sentBy, 'Ashley Jerome', 'and who confirmed it');

    const estate = { id: 8, svc: 'probate', name: 'Estate of R. Jones', executor: 'Tripp Butler', executorEmail: 'tb@example.com',
                     addr: '69 Beach Blvd' };
    has(t.buildReviewEmailHtml(estate), 'the property at 69 Beach Blvd', '⚠ a decedent job says "the property" — the house is not the reader\'s');
    lacks(t.buildReviewEmailHtml(estate), 'your home', 'never "your home"');
    has(t.buildReviewEmailText(estate), 'Dear Tripp', 'and greets the representative the email goes to');

    const noEmail = { id: 9, svc: 'prep', name: 'No Email' };
    t.jobs.push(noEmail); t.jobPlanStore[9] = { tasks: { satisfaction_call: true } };
    t.draftReviewRequest(9);
    eq(drafts.length, 1, 'no client email, no draft');
    has(notices[notices.length - 1], 'No client email', 'and it names the fix');

    // Gmail not configured — the mailto fallback, which keeps its signature because nothing appends one.
    t.gmailConfigured = () => false;
    t.window.location = {};
    const k = JOB(); k.id = 11; t.jobs.push(k); t.jobPlanStore[11] = { tasks: { satisfaction_call: true } };
    t.draftReviewRequest(11);
    has(t.window.location.href || '', 'mailto:mw%40example.com', 'falls back to a plain email to the client');
    has(decodeURIComponent(t.window.location.href || ''), 'Ashley Jerome', 'which signs itself');
    eq(k.reviewAsk.via, 'mailto', 'and records which route it went');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ a rating saves itself — to the job and to the Vendor Directory');
  {
    const writes = [];
    let answer = true;
    const t = sandbox({
      fns: ['setVendorRating', 'setVendorRatingNote', '_ratingJob', '_writeVendorScore', 'computeVendorAvg',
            'lookupVendorById', 'vendorIdOf'],
      vars: ['VENDOR_RATING_WINDOW'],
      stubs: {
        vendorDirectory: VENDORS, VENDOR_SYNC_URL: 'https://vendor', saveJobs() {}, syncJobToSheets() {},
        _repaintCloseout() {}, _todayStr: () => '2026-09-22',
        queuedDirectoryWrite: (target, body, cb) => { writes.push({ target, body }); cb(answer, answer ? {} : { error: 'HTTP 502' }, false); },
      },
    });
    const j = JOB(); t.jobs = [j];
    t.setVendorRating(7, 2, 5);
    eq(j.vendorRatings[2].rating, 5, 'the star is recorded on the job');
    eq(writes.length, 1, '⚠⚠ and written to the directory at once — no separate button to forget');
    eq(writes[0].target, 'vendor', 'through the vendor directory queue');
    eq(writes[0].body.type, 'rateVendor', 'as a rateVendor write (idempotent, so it may retry)');
    eq(writes[0].body.payload.performance_score, 5, 'carrying the recomputed rolling average');
    eq(writes[0].body.payload._row, 2, 'against the right row');
    ok(!!j.vendorRatings[2].writtenAt, 'and the row records that it landed');
    answer = false;
    t.setVendorRating(7, 3, 2);
    has(j.vendorRatings[3].writeErr, 'HTTP 502', 'a failed write is recorded on the row, never silent');
    ok(!j.vendorRatings[3].writtenAt, 'and it does not claim to have landed');
    answer = true;
    t.setVendorRatingNote(7, 3, 'late twice');
    eq(writes.length, 3, 'a note on a rated vendor writes again');
    has(writes[2].body.payload.note, 'late twice', 'carrying the note');
    t.setVendorRatingNote(7, 5, 'n/a');
    eq(writes.length, 3, 'a note on an UNRATED vendor writes nothing — there is no score to carry');
    lacks(noComments(fn('_writeVendorScore')), 'fetch(', 'it never hand-rolls a fetch — the queue is what retries');
    lacks(require('./harness').source(), 'function writeVendorScores', 'the old write-back button is gone');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ A HOME PREP JOB\'S DESK HAS NO INVENTORY ON IT');
  {
    const r = noComments(fn('renderInventoryTab'));
    const iPrep = r.indexOf("if (job.svc === 'prep') {");
    ok(iPrep > 0, 'the tab has a prep arm');
    const prepArm = r.slice(iPrep, r.indexOf('return;', iPrep) + 7);
    ['_renderInvWorkbar', '_renderAppraiserRoster', '_renderInventoryImportPanel', '_renderInvBulk',
     '_renderInventorySnapshots', '_renderRemovedRows', '_renderAppraisalGuardrail'].forEach((f) =>
      lacks(prepArm, f, 'the prep arm renders no ' + f));
    has(prepArm, 'renderJobAdmin(jobId, job)', 'it renders the desk paperwork');
    has(prepArm, 'closeout', 'and the close-out');
    ok(r.indexOf('var top = jobInfoHeaderHtml(job)') < iPrep, 'the client header and the band come first, on both arms');
    has(r, "'<div id=\"jband-slot-admin\">' + jobProgressBlockHtml(jobId, 'admin')", 'the band is the dashboard\'s own renderer');
    // The desk fold opens by itself on prep — there it IS the tab.
    const t = sandbox({ fns: ['_jobAdminIsOpen'], vars: ['_jobAdminOpen'] });
    ok(t._jobAdminIsOpen(7, { svc: 'prep' }) === true, 'Job Admin opens by default on a prep job');
    ok(t._jobAdminIsOpen(8, { svc: 'cleanout' }) === false, 'and stays folded elsewhere');
    t._jobAdminOpen[7] = false;
    ok(t._jobAdminIsOpen(7, { svc: 'prep' }) === false, 'a choice made by hand wins');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the desk card stops asking a prep job questions that do not apply to it');
  {
    const d = sandbox({
      fns: ['planDerivedLines', 'planTaskCtx', 'invFiduciaryMode', 'isDecedentJob', '_planRooms', 'roomStatusNormalize',
            'firearmsFlaggedAtIntake', 'houseFlagsOf', '_jobInvRefs', '_srcLineKey', 'matterTypeOf', 'matterDef',
            'docTierOf', 'docTierDef', 'docTierProduces', 'svcHasDocStep', 'estimateIsFeeOnly', 'estDeclutterHrs', 'jobIsFeeOnly',
            'planTasksFor', 'coAcceptedHours', 'coHoursTotal', 'coHours'],
      vars: ['DECEDENT_SERVICES', 'jobPlanStore', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'ROOM_STATUS_META',
             'ROOM_STATUS_LEGACY', 'INV_RELEASE_DISPOSITIONS', 'FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS', 'changeOrders',
             'MATTER_TYPES', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'JOB_ADMIN_TASKS'],
      stubs: { isFormalDoc: () => false, docSentAt: () => null, jobLogEntries: () => [], stagePaidTotal: () => 0,
               _photoRefs: { 7: [] } },
    });
    const est = { svc: 'prep', prepEnabled: true, prepItems: [{ type: 'Painting', cost: 8000, lid: 'a' }], totTC: 0, totPS: 0 };
    const keys = d.planDerivedLines(7, { id: 7, svc: 'prep' }, est, 'admin').map((l) => l.key);
    ok(keys.indexOf('rooms_cleared') < 0, '⚠ no "All rooms cleared — 0 of 0" on a job with no rooms');
    ok(keys.indexOf('hours_logged') < 0, '⚠ no hours line on a fee-only engagement — it logs none');
    ok(keys.indexOf('prep_vendors') >= 0 && keys.indexOf('final_invoice_sent') >= 0, 'the lines that apply stay');
    const fin = d.planDerivedLines(7, { id: 7, svc: 'prep' }, est, 'admin').find((l) => l.key === 'final_invoice_sent');
    lacks(fin.detail, 'once the hours are in', 'and the invoice line does not wait on hours a fee-only job never logs');
    has(fin.detail, 'Next band', 'it points at the band on the same tab');
    const dc = Object.assign({}, est, { declutterTCHrs: 5, totTC: 5 });
    ok(d.planDerivedLines(7, { id: 7, svc: 'prep' }, dc, 'admin').some((l) => l.key === 'hours_logged'),
      'a prep job that DID price declutter hours keeps the hours line');
    const tasks = (svc) => d.planTasksFor(d.JOB_ADMIN_TASKS, null, d.planTaskCtx({ id: 7, svc }, { svc })).map((x) => x.key);
    ok(tasks('prep').indexOf('fin_donation_receipts') < 0, 'no donation receipts on a prep job');
    ok(tasks('home_cleanout').indexOf('fin_donation_receipts') >= 0, 'and still on a cleanout');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE BAND ON BOTH JOB TABS IS THE DASHBOARD\'S BAND');
  {
    const b = noComments(fn('jobProgressBlockHtml'));
    has(b, 'jtBandHtml(job, estRec, rows, jobTimelineNext(rows))', 'the same band renderer, fed the same rows');
    has(b, 'jobTimeline(job, estRec, logs, cos, sched)', 'from the same state machine');
    has(b, 'var work = jtWorkRows(rows);', 'and only the second leg of the track is drawn');
    has(b, 'jtTrackHtml(work, [work]) + jtRailHtml(work)', 'on a desk and on a phone');
    lacks(b, 'getJobPlan(', '⚠ never the minting accessor — this paints on every redraw');
    const t = sandbox({ fns: ['jtWorkRows'], vars: ['JT_LEG_BREAK'] });
    const rows = ['intake', 'agreement_signed', 'deposit_invoiced', 'final_paid'].map((key) => ({ key }));
    eq(t.jtWorkRows(rows).map((r) => r.key), ['deposit_invoiced', 'final_paid'], 'the work rows start after the signature — Deposit & Start');
    has(noComments(fn('renderClientDashboard')), 'jtBandHtml(job, estRec, _jtRows, _jtNext)', 'and the dashboard draws its band through it too');
    // The Job Plan paints it once the job is won; the empty states clear it.
    const lp = noComments(fn('loadJobPlanTab'));
    has(lp, "_repaintJobBand('plan', jobId);", 'the Job Plan paints the band');
    ok(lp.indexOf("_repaintJobBand('plan', jobId);") > lp.indexOf('if (!isJobWon(job))'), 'only past the won gate');
    has(lp, "getElementById('jband-slot-plan'); if (bandEl) bandEl.innerHTML = '';", 'and an empty state clears it');
    has(require('./harness').source(), '<div id="jband-slot-plan"></div>', 'the slot sits in the Job Plan panel');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ A BUTTON PRESSED ON A JOB TAB ACTS ON THAT TAB\'S JOB');
  {
    // client-dashboard-view keeps display:block when you leave for another tab, so a dashboard
    // left open on one client must not answer for a button pressed on another client's Job Plan.
    const mk = (panels, vals) => ({
      getElementById(id) {
        if (id === 'client-dashboard-view') return { style: { display: 'block' } };
        if (id === 'plan-job') return { value: String(vals.plan || '') };
        if (id === 'inv-job') return { value: String(vals.inv || '') };
        if (/^panel-/.test(id)) return { classList: { contains: (c) => c === 'active' && panels.indexOf(id) >= 0 } };
        if (/^jband-/.test(id) || id === 'dash-fb') return {};
        return null;
      },
    });
    const t = sandbox({ fns: ['_jobBandHost', '_dashFbTarget', '_agrJob'], stubs: { _dashboardJobId: 1 } });
    t.jobs = [{ id: 1, name: 'Butler' }, { id: 2, name: 'Ellsworth' }];
    t.document = mk(['panel-job-plan'], { plan: 2 });
    eq(t._jobBandHost().kind, 'plan', 'on the Job Plan the host is the Job Plan');
    eq(t._jobBandHost().jobId, 2, '⚠⚠ and its job — not the dashboard left open on another client');
    eq(t._agrJob().name, 'Ellsworth', 'so a payment or signature is recorded against the right client');
    eq(t._dashFbTarget('agr-fb'), 'jband-fb-plan', 'and its message lands on that tab');
    t.document = mk(['panel-inventory'], { inv: 2 });
    eq(t._jobBandHost().kind, 'admin', 'on Job Admin the host is Job Admin');
    t.document = mk(['panel-jobs'], {});
    eq(t._jobBandHost().kind, 'dash', 'on the Client Dashboard, the dashboard — as before');
    eq(t._agrJob().name, 'Butler', 'and its job');
    eq(t._dashFbTarget('agr-fb'), 'dash-fb', 'with its strip');
  }
};
