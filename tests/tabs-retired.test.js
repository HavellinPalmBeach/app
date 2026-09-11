'use strict';
// SLICE 7 — THE THREE DOCUMENT TABS ARE RETIRED (2026-09-11).
//
// Anthony, opening this whole rebuild: *"we are finding ourselves having to go to too many
// tabs in the app … all of the functionality that we currently have in client estimate
// agreement and invoices needs to go into the client dashboard."* Slices 3-6 gave the five
// documents one way to be viewed, printed, sent, filed and signed. This slice closes the
// last doors that existed ONLY on those tabs, and then takes the tabs off the nav.
//
// ⚠⚠ THE POINT OF THIS FILE IS THE AUDIT, NOT THE DELETION. Retiring a tab that holds the
// only door to something strands whoever needs it, so the work was finding what was
// tab-only. Three things were, and one of them was ALREADY BROKEN on the rail.

const { sandbox, source, fn } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  // ⚠ SEVERAL CHECKS BELOW RUN OVER LIVE LINES ONLY, AND THAT IS THE REQUIREMENT RATHER
  // THAN A WEAKENED VERSION OF IT. What must be true is that no live code, markup or
  // client-facing copy references a retired tab or a deleted element — a comment RECORDING
  // what was removed and why is the most useful part of the record, and this file has
  // already had three assertions trip on their own explanatory comments.
  // ⚠ HTML and block comments are stripped as BLOCKS, not line by line — the note recording
  // this slice's deletion runs to nine lines and only the first starts with `<!--`, so a
  // line filter left the rest in and the check tripped on its own explanation. Again.
  const liveOnly = (t) => t
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  const live = liveOnly(src);

  // ───────────────────────────────────────────────────────────────────────────
  group('the three tabs are off the nav, and the rest are not');
  {
    ["showPanel('client-estimate'", "showPanel('agreement'", "showPanel('invoice'"].forEach((p) => {
      eq((src.match(new RegExp('<button class="nb"[^>]*' + p.replace(/[(']/g, '\\$&'), 'g')) || []).length, 0,
        p + ' has no nav button');
    });
    // ⚠ AND EVERY OTHER TAB IS STILL THERE. A slice that quietly took a fourth would be
    // indistinguishable from this one in a diff.
    ['winloss', 'intake', 'estimate', 'job-plan', 'inventory', 'contractors', 'vendors', 'referrals']
      .forEach((t) => has(src, "showPanel('" + t + "',this)", t + ' is still on the nav'));
    // ⚠ COUNT THE PREFIX, NOT THE EXACT ATTRIBUTE. Client Dashboard carries
    // `class="nb active"`, so `class="nb"` misses it — and a check that silently counts one
    // fewer tab than exist would have gone on passing if a ninth were removed. Verified in a
    // browser: nine `.nb` elements render.
    eq((src.match(/<button class="nb[" ]/g) || []).length, 9, 'nine tabs, down from twelve');
    // ⚠ THIS PINNED THE BUTTON'S EXACT MARKUP AND BROKE ON A TRUE CHANGE — adding
    // `data-field` to make the dashboard a field tab failed a check about which tab opens
    // by default. A byte sequence is not a requirement; this file has now paid for that
    // five times. State what has to be true instead: exactly one tab is marked active, and
    // it is the one that opens the dashboard.
    const activeBtns = src.match(/<button class="nb active"[^>]*>/g) || [];
    eq(activeBtns.length, 1, 'exactly one tab opens by default');
    ok(/showPanel\('jobs'/.test(activeBtns[0]),
      'and it is the Client Dashboard, since that is where a job is now run');

    // ⚠ THE PANELS STAY IN THE DOM AND MUST NOT BE DELETED YET. The priming that makes the
    // rail safe (Slice 1) runs the REAL loaders, and those render into these panels;
    // `ensureAgreementApproved` primes before it stamps. Removing the markup and repointing
    // all of that in one commit is how one gets missed.
    ['panel-client-estimate', 'panel-agreement', 'panel-invoice'].forEach((p) =>
      has(src, 'id="' + p + '"', p + ' is still in the DOM, because the priming renders into it'));
    has(fn('_primeAgreementFor'), 'loadAgreement()', 'and the primer still runs the real loader');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ DOOR 1: EDITING AN APPROVED ESTIMATE — already broken on the rail');
  {
    // ⚠ THIS WAS LIVE BEFORE SLICE 7 AND HAD NOTHING TO DO WITH RETIRING ANYTHING.
    // `dashGoEstimate` calls `editEstimateForJob`, which NAVIGATES and nothing else. So
    // pressing "✎ Edit estimate" on the timeline with an approved estimate landed on Build
    // Estimate with the estimate still approved — and `applyEstimateLock` disables the whole
    // build form on `estimateApproved`. Measured in a browser before the fix:
    // `storeApproved:true, agrApproved:true, firstInputDisabled:true`. A dead end. The
    // working door was the Client Estimate tab's own button, i.e. the tab being retired.
    const acts = noComments(fn('jobTimelineActions'));
    has(acts, "call: 'dashEditEstimate(' + id + ')'", 'the rail calls the un-approving door');
    lacks(acts, "'&#9998; Edit estimate', call: 'dashGoEstimate(", 'never the navigate-only one');
    const d = noComments(fn('dashEditEstimate'));
    has(d, '_primeEstimateFor(jobId)', 'primed first, like every dashboard action');
    has(d, 'revokeEstimateApproval(jobId)', 'it revokes');
    has(d, 'estimateApproved = false', 'and clears the globals the lock actually reads');
    has(d, 'delete currentEstimate.lockedRooms', 'and the frozen walkthrough snapshot, so re-approval rebuilds provenance');
    // ⚠⚠ DRIVEN, NOT READ — AND THE FIRST VERSION COULD NOT FAIL. It asserted that
    // `revokeEstimateApproval` sits at a lower SOURCE INDEX than `dashGoEstimate`, and a
    // revert that simply moved the navigate call INSIDE the if-block, after the revoke,
    // left that index exactly where it was. Green. Second time this session: a source index
    // is not an ordering. What has to be true is that the estimate is ALREADY un-approved at
    // the moment the hand-off happens, because what lands on the other side reads it.
    const ord = sandbox({
      fns: ['dashEditEstimate', 'revokeEstimateApproval'],
      stubs: {
        saveJobs() {}, syncJobToSheets() {}, showSyncBadge() {}, saveEstimateState() {},
        dashNotice() {}, _dashRedraw() {}, currentAgrJobId: 0, currentEstimate: null,
        _primeEstimateFor(id) { ord.currentEstimate = { jobId: id, lockedRooms: [1], lockedAt: 'T' }; return true; },
        dashGoEstimate(id) {
          // Snapshot the world exactly as the hand-off sees it.
          ord.__atHandoff = {
            storeApproved: !!(ord.estimateStore[id] || {}).approved,
            jobApproved: !!ord.jobs[0].approved,
            agrApproved: !!ord.jobs[0].agrApproved,
            globalApproved: ord.estimateApproved,
            lockSnapshot: !!(ord.currentEstimate && ord.currentEstimate.lockedRooms),
          };
        },
      },
    });
    ord.jobs = [{ id: 7, approved: true, agrApproved: true, estimateDriveAt: 'T' }];
    ord.estimateStore = { 7: { approved: true, submitted: false } };
    ord.estimateApproved = true;
    ord.dashEditEstimate(7);
    ok(!!ord.__atHandoff, 'it hands off to Build Estimate');
    eq(ord.__atHandoff.storeApproved, false, '⚠ and the estimate is ALREADY un-approved when it does');
    eq(ord.__atHandoff.jobApproved, false, 'the job flag with it');
    eq(ord.__atHandoff.agrApproved, false, 'and the agreement, whose Exhibit A is about to change');
    eq(ord.__atHandoff.globalApproved, false,
      '⚠ including the GLOBAL applyEstimateLock actually reads — the record alone would still land on a locked form');
    eq(ord.__atHandoff.lockSnapshot, false, 'and the frozen walkthrough snapshot is cleared');

    // A DRAFT is opened untouched — revoking one would clear an approval nobody gave.
    ord.__atHandoff = null;
    ord.jobs = [{ id: 8 }];
    ord.estimateStore = { 8: { approved: false } };
    ord.estimateApproved = false;
    ord.dashEditEstimate(8);
    ok(!!ord.__atHandoff, 'a draft opens too');
    eq(ord.jobs[0].agrRevokedBy, undefined, 'with nothing revoked on the way');
    // ⚠ AND ONLY WHEN IT IS APPROVED. Revoking a draft would clear an approval nobody gave.
    has(d, 'estimateStore[jobId] && estimateStore[jobId].approved', 'a draft is opened without revoking anything');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ DOOR 2: the ±15% final-invoice manager PIN');
  {
    // The registry refuses a final outside tolerance and says it "needs a manager PIN". The
    // only place to give one was a button on the Invoices tab, so retiring it would have
    // left a refusal with no door — worse than no gate at all.
    const acts = noComments(fn('jobTimelineActions'));
    has(acts, "dashApproveInvoice(\" + id + \",'final')", 'the rail offers it on the final invoice row');
    const a = noComments(fn('dashApproveInvoice'));
    has(a, 'currentInvJobId = jobId', 'primed to the right job');
    has(a, 'currentInvStage = stage', 'and the right stage');
    has(a, 'invoiceHtml(job, currentInvStage)', '⚠ and the verdict is computed FRESH, not read off a global');
    has(a, 'if (!d.requiresApproval)', 'an invoice inside tolerance says so rather than asking for a PIN');
    has(a, 'openInvPinModal()', 'and the PIN modal is the one that already exists');
    ok(a.indexOf('invoiceHtml') < a.indexOf('openInvPinModal'),
      'the verdict comes before the modal, so a PIN is never asked for on an invoice that needs none');
    has(src, 'id="inv-pin-modal"', 'the modal is still in the DOM');
    has(fn('checkInvPin'), 'resolvePin(pin)', 'and still resolves a named approver');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ DOOR 3: the Stripe deposit link — moved, not promoted');
  {
    const acts = noComments(fn('jobTimelineActions'));
    has(acts, "call: 'dashStripeLink(' + id + ')'", 'reachable from the deposit row');
    // ⚠ IT IS A SECONDARY, NEVER THE PRIMARY. Stripe is ONE-WAY — no webhook, nothing reads
    // back, `clearedOn` is never written — so it sends a link and records nothing. The
    // primary on that row is the payment RECORDER, which is what actually funds a job.
    const dep = acts.slice(acts.indexOf("case 'deposit_invoiced':"), acts.indexOf("case 'deposit_received':"));
    has(dep, 'out.secondary.push({ label: \'&#128179; Stripe link\'', 'offered as a secondary');
    lacks(dep, "out.primary = { label: '&#128179;", 'never as the primary');
    // And only when it is configured — an unconfigured Stripe would be a button that refuses.
    has(dep, "typeof STRIPE_SCRIPT_URL !== 'undefined' && STRIPE_SCRIPT_URL", 'and only when Stripe is set up at all');
    has(fn('dashStripeLink'), '_primeAgreementFor(jobId)', 'primed, because generateStripeLink reads currentAgrJobId');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ WHAT WAS DELETED RATHER THAN MOVED, AND WHY THAT IS NOT THE SAME THING');
  {
    // ⚠ THE PAYMENT METHOD CARD NEVER STORED ANYTHING. `agr-card-last4`,
    // `agr-estate-contact` and `agr-estate-email` each appeared EXACTLY ONCE in the whole
    // file — the markup. Nothing read them, nothing saved them: somebody typed a card's last
    // four digits into a box and the value died with the page. Moving dead UI onto the
    // primary workflow would have made the workflow look broken.
    ['agr-card-last4', 'agr-estate-contact', 'agr-estate-email', 'agr-pay-track', 'agr-payment-card']
      .forEach((id) => eq((live.match(new RegExp(id, 'g')) || []).length, 0, id + ' is gone entirely'));
    lacks(src, 'function updateAgrPayTrack(', 'and the handler that only toggled them');
    // The three "copy payment link" buttons printed a sentence and did nothing else.
    lacks(src, 'function copyStripeLink(', 'the message-stub copier is deleted');
    eq((src.match(/(?<![\w$.])copyStripeLink\s*\(/g) || []).length, 0, 'and nothing calls it');
    // ⚠ But GENERATING a link is real and survives — it posts to a separate Apps Script.
    ok(fn('generateStripeLink').length > 0, 'generating a real link survives');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ the deep-link that would have become a dead button');
  {
    // `openInvoiceFor` found the Invoices tab by its NAV BUTTON —
    // `querySelector('.nb[onclick*="invoice"]')` — so with the tab retired it returns null,
    // `showPanel` never runs, and the three Job Plan buttons calling it would have silently
    // set two selects on a hidden panel and shown nothing. A control that looks live and does
    // nothing is the exact shape this rebuild keeps finding.
    const o = noComments(fn('openInvoiceFor'));
    lacks(o, ".nb[onclick", 'it no longer hunts for a nav button that is not there');
    lacks(o, 'showPanel(', 'nor switches panels');
    has(o, "docAction(jobId, 'invoice', 'view'", 'it opens the document through the one action');
    has(o, "stage: stage || 'midpoint'", 'carrying the stage it was asked for');
    eq((src.match(/openInvoiceFor\(/g) || []).length, 4, 'its three Job Plan callers are unchanged');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ nothing still tells a person to go to a tab that is gone');
  {
    // Copy that names a retired tab is worse than stale — it is an instruction that cannot
    // be followed, and two of these went out in EMAIL (the approval notice to a manager and
    // the invoice notice to billing@), where nobody can see that the tab no longer exists.
    ['Client Estimate tab', 'Agreement tab', 'Final Invoice tab', 'Invoices tab'].forEach((t) =>
      eq((live.match(new RegExp(t, 'g')) || []).length, 0, 'no live copy says "' + t + '"'));
    // And they were repointed rather than simply cut — the reader still needs to be told where.
    has(src, 'enter your manager PIN on the job timeline to approve', 'the approval email names the timeline');
    has(src, 'send the final invoice from the job timeline', 'so does the billing notice');
    has(src, 'Approve the estimate on the job timeline', 'and the agreement blocker');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FIELD MODE — the Client Dashboard joined the field tabs (2026-09-11).
  //
  // ⚠ THE COUNT IN THE TOGGLE'S OWN title= HAD BEEN WRONG SINCE SLICE 7 AND NOTHING
  // CAUGHT IT. The nav-count check above reads <button> markup; this string is a JS
  // literal assigned to `title`, so it went on promising "all twelve tabs" after three of
  // them were retired. Any user-facing COUNT of the tabs is asserted here now, wherever it
  // is written.
  group('field mode carries the Client Dashboard, and says how many tabs it has');
  {
    const navBlock = src.slice(src.indexOf('<div class="nav">'), src.indexOf('</div>', src.indexOf('<div class="nav">')));
    const fieldBtns = navBlock.match(/<button[^>]*data-field="1"[^>]*>/g) || [];
    eq(fieldBtns.length, 5, 'five nav buttons carry data-field="1"');

    // ⚠ The dashboard's button is `class="nb active"` — the same shape that made my own
    // nav count wrong in Slice 7. Pin it by name rather than by counting around it.
    ok(/<button class="nb active"[^>]*data-field="1"[^>]*data-field-label="Clients"[^>]*showPanel\('jobs'/.test(navBlock),
      '⚠ THE CLIENT DASHBOARD IS A FIELD TAB — the timeline is where a job is run now');

    const labels = [...navBlock.matchAll(/data-field-label="([^"]+)"/g)].map((m) => m[1]);
    eq(labels.join(' · '), 'Clients · Intake · Estimate · Job Plan · Vendors',
      'and each has a short label, in nav order');
    ok(labels.every((l) => l.length <= 9),
      'every label is short enough for a fifth of a phone (measured: the longest renders 47px into 56px at 320px)');

    // ⚠ The counts a person actually READS. Both were stale.
    const body = fn('setFieldMode');
    ok(/bring back all nine tabs/.test(body), '⚠ the exit tooltip counts the nine tabs that come back, not twelve');
    lacks(body, 'twelve tabs', 'the pre-Slice-7 count is gone');
    ok(/five tabs/.test(body), 'and the enter tooltip counts five');
    lacks(body, 'four tabs, bottom bar', 'the pre-dashboard count is gone');

    // ⚠ FIELD MODE IS A LAYOUT, NOT A PERMISSION LEVEL. There must be no second,
    // field-only opinion about which timeline actions are allowed — the timeline's own
    // gates are the one copy of that rule, and a second copy is what drifts.
    const actions = fn('jobTimelineActions');
    lacks(actions, 'field-mode', 'jobTimelineActions has no field-mode opinion');
    lacks(actions, 'isFieldMode', 'and does not consult field mode at all');
    const css = src.slice(src.indexOf('<style'), src.lastIndexOf('</style>'));
    lacks(css, 'body.field-mode #client-dashboard-view', 'and no stylesheet rule hides the dashboard in field mode');
    lacks(css, 'body.field-mode .jt-', 'nor any part of the timeline');
  }
};
