'use strict';
// THE CLIENT DASHBOARD'S UTILITY BAR — and the first test in this repo that renders the
// dashboard at all (2026-09-11).
//
// WHAT WAS WRONG. The dashboard opened with a seven-control header bubble: Build/Edit
// Estimate · Submit for Approval · Client Accepted — Mark Won · Change Order · Edit
// Client · Drive · Activate Job. FIVE of those were already reachable further down the
// same screen, with their own buttons. Anthony, reading it: *"do we need the 5 boxes at
// the top at all? like the activate job button? … estimate probably doesn't need to be
// there if it's down below in the timeline."*
//
// ⚠⚠ AND THE TWO COPIES COULD DISAGREE, which is what makes it a defect rather than
// clutter. The bubble offered **Activate Job** unconditionally. The rail's own
// `job_active` row stands that button DOWN when the activation is blocked — deliberately,
// because the fix is a phone call to the executor and "a button that alerts the same
// blocker back at you is worse than none". So on a contested matter with the Letters
// outstanding the rail correctly showed no button and the bubble showed one. Same shape
// as the field grid cut from above the rail on 2026-09-10, where "● Not signed" in red
// sat two inches above the rail lighting *Agreement signed* as the live step.
//
// ⚠ THE RULE THE BAR NOW ENFORCES: THE TIMELINE HOLDS EVERY STEP, THIS BAR HOLDS ONLY
// WHAT IS NOT ONE. The load-bearing check below is not "the four buttons are gone" — a
// label can be renamed — it is that no `call` in `dashUtilityBar` appears anywhere in
// `jobTimelineActions`, across every row, at every point in the lifecycle. It has exactly
// one exemption and the exemption is named, tested and explained rather than quietly
// excluded from the net.
//
// ⚠⚠ AND DRIVING THE REAL RENDERER IS WHAT FOUND THE ONE I GOT WRONG. The first cut kept
// Change Order in the bar. `renderClientDashboard` came back with `openChangeOrder(7)`
// TWICE in one page — the Change Orders card lower down already carries a `+ New`, on
// every job, beside the count and the never-billed warning. A source assertion would not
// have seen it; the rendered page did, in one run. Hence the general net at the end:
// every onclick on the whole rendered dashboard is unique.

const { sandbox, source, domStub } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // Resolved by driving the real renderer until it stopped throwing. Everything here is
  // lifted verbatim from havellin.html — nothing is stubbed that the page itself has.
  const FNS = ['_dashUtilityBarHtml', '_jtDocViews', '_jtDraftLink', '_jtDriveLink', '_jtSendAction',
    'activeHouseFlags', 'agreementSignature', 'dashUtilityBar', 'depositPaidTotal', 'depositTargetFor',
    'docDraftedAt', 'docKeyFor', 'docSentAt', 'esignProviderKey', 'esignWatches', 'field', 'fmtMoney',
    'getJobActuals', 'houseFlagsOf', 'isAgreementSigned', 'isJobFunded', 'isJobWon',
    'jobActivationBlockers', 'jobPayments', 'jobTimeline', 'jobTimelineActions', 'jobTimelineNext',
    'maybeStartJobsWatch', 'paymentSplit', 'renderClientDashboard', 'sectionHdr', 'stagePaidTotal',
    'standingFlagLines', 'standingFlagsBlock', 'stopJobsWatch', 'unscoredRoomNames'];
  const VARS = ['ESIGN_PROVIDERS', 'HOUSE_FLAGS', 'JT_LEG_BREAK', 'JT_SHORT', 'SVC_LABELS',
    '_dashNotice', '_jobsWatch', 'jobLogs'];

  const EST = () => ({ rooms: [{ name: 'Kitchen', vol: 3, cplx: 3 }], havellinTotal: 24100 });
  const BASE = { id: 7, hvlId: 'HVL-0007', name: 'Butler', svc: 'cleanout', created: 'Sep 8, 2026',
    walkthrough: '2020-01-01' };

  // One sandbox, reused: lifting 36 functions per case is the slow part of this file.
  const ctx = sandbox({
    fns: FNS, vars: VARS,
    stubs: { document: domStub({}), setTimeout: () => 0, clearTimeout: () => {}, Intl: global.Intl,
      jobs: [], logs: [], changeOrders: [], contractors: [], _photoRefs: {}, estimateStore: {} },
  });

  // Build a sandbox holding one job and render the REAL dashboard into the REAL element
  // id it writes to, then hand back the markup a person would be looking at.
  function render(extra, rec, driveRoot) {
    const job = Object.assign({ status: 'won', won: true, approved: true,
      driveFolder: 'https://drive.google.com/drive/folders/XYZ' }, BASE, extra || {});
    const dom = domStub({});
    const stubs = {
      document: dom, setTimeout: () => 0, clearTimeout: () => {}, Intl: global.Intl,
      jobs: [job], logs: [], changeOrders: [], contractors: [], _photoRefs: {},
      estimateStore: rec === null ? {} : { 7: rec || { estimate: EST(), approved: true } },
    };
    if (driveRoot !== undefined) stubs.DRIVE_FOLDER_ID = driveRoot;
    const c = sandbox({ fns: FNS, vars: VARS, stubs });
    c.renderClientDashboard(7);
    return dom.getElementById('client-dashboard-view').innerHTML;
  }

  // The bar for a job, without rendering anything — dashUtilityBar is DOM-free.
  function bar(jobOver, driveRoot) {
    if (driveRoot === undefined) return ctx.dashUtilityBar(Object.assign({ id: 7 }, jobOver || {}));
    const c = sandbox({ fns: ['dashUtilityBar', '_dashUtilityBarHtml'],
      stubs: { document: domStub({}), DRIVE_FOLDER_ID: driveRoot } });
    return c.dashUtilityBar(Object.assign({ id: 7 }, jobOver || {}));
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('The bar holds only what is NOT a step');

  const b = bar({ driveFolder: 'https://drive.google.com/drive/folders/XYZ' });
  eq(b.length, 2, 'two controls, not seven');
  eq(b[0].call, 'dashEditClient(7)', 'Edit Client — the client record is not a milestone');
  eq(b[0].href, undefined, 'and it is a button, not a link');
  eq(b[1].label, '&#128193; Drive', 'and the Drive link');

  // ⚠ EACH OF THESE HAS A ROW OF ITS OWN ON THE RAIL, WITH ITS OWN BUTTON. Named rather
  // than only counted, so a reader of a failure knows which one came back.
  const barCallText = b.map((x) => x.call || '').join(' ');
  ok(!/editEstimateForJob|dashGoEstimate/.test(barCallText), 'Build/Edit Estimate is not here — estimate_built carries it');
  ok(!/dashboardSubmitForApproval|dashSubmitEstimate/.test(barCallText), 'Submit for Approval is not here — estimate_approved carries it');
  ok(!/openWonModal/.test(barCallText), 'Mark Won is not here — client_accepted carries it');
  ok(!/activateOrCycle/.test(barCallText), 'Activate / Close Job is not here — job_active and work_complete carry it');
  // ⚠ AND CHANGE ORDER IS NOT HERE EITHER, which is the one the rendered page taught me.
  ok(!/openChangeOrder/.test(barCallText), 'Change Order is not here — the Change Orders card carries it');
  // Nothing in this bar is a primary: the primary belongs to the tan NEXT band, alone.
  ok(b.every((x) => !x.primary), 'no control here claims to be the next thing to do');

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE RULE: no control in the bar is also a step on the rail');

  // Walk the WHOLE lifecycle, so a control offered at one stage only cannot slip through.
  // Each case is chosen because it makes a DIFFERENT row the live one — verified by the
  // `reached` assertions below, or the net would be walking the same three rows ten times.
  const STAGES = [
    { n: 'no estimate yet', job: { status: 'new', won: false, approved: false }, rec: null },
    { n: 'no walkthrough date', job: { status: 'new', won: false, approved: false, walkthrough: '' }, rec: null },
    { n: 'built, not yet submitted', job: { status: 'new', won: false, approved: false }, rec: { estimate: EST(), approved: false, submitted: false } },
    { n: 'submitted for approval', job: { status: 'pending', won: false, approved: false }, rec: { estimate: EST(), approved: false, submitted: true } },
    { n: 'approved, not sent', job: { status: 'approved', won: false, approved: true }, rec: { estimate: EST(), approved: true } },
    { n: 'sent, awaiting client', job: { status: 'approved', won: false, approved: true, estimateSentDate: 'September 8, 2026' }, rec: { estimate: EST(), approved: true } },
    { n: 'won', job: { status: 'won', won: true, approved: true, estimateSentDate: 'x' }, rec: { estimate: EST(), approved: true } },
    { n: 'packet sent', job: { status: 'won', won: true, approved: true, estimateSentDate: 'x', agrApproved: true, agrSent: true }, rec: { estimate: EST(), approved: true } },
    { n: 'signed and funded', job: { status: 'won', won: true, approved: true, estimateSentDate: 'x',
        agrApproved: true, agrSent: true, agrSigned: true, agrSignedAt: 'Sep 10, 2026', depositReceived: true,
        payments: [{ id: 1, stage: 'deposit', amount: 12050, receivedOn: '2026-09-10' }],
        docState: { 'invoice:deposit': { draftedAt: 'x', sentAt: '2026-09-10T10:00:00Z' } } }, rec: { estimate: EST(), approved: true } },
    { n: 'active', job: { status: 'active', won: true, approved: true, estimateSentDate: 'x', agrSigned: true,
        depositReceived: true, payments: [{ id: 1, stage: 'deposit', amount: 12050 }] }, rec: { estimate: EST(), approved: true } },
    { n: 'closed', job: { status: 'closed', won: true, approved: true, estimateSentDate: 'x', agrSigned: true,
        depositReceived: true, deliveredOn: '2026-09-30', payments: [{ id: 1, stage: 'deposit', amount: 12050 }] }, rec: { estimate: EST(), approved: true } },
    { n: 'lost', job: { status: 'lost', won: false, approved: true }, rec: { estimate: EST(), approved: true } },
    // ⚠ The blocked activation — the one case where the retired bubble and the rail
    // actively disagreed about whether there was a button to press at all.
    { n: 'blocked activation', job: { status: 'won', won: true, approved: true, estimateSentDate: 'x',
        agrSigned: true, depositReceived: true, svc: 'contested_probate', executorAuth: 'pending',
        payments: [{ id: 1, stage: 'deposit', amount: 12050 }] }, rec: { estimate: EST(), approved: true } },
  ];

  const railCalls = new Set();
  const callsByRow = {};            // call -> the row keys that offer it
  STAGES.forEach((c) => {
    const job = Object.assign({}, BASE, c.job);
    ctx.jobTimeline(job, c.rec, [], []).forEach((row) => {
      const a = ctx.jobTimelineActions(row, job, c.rec);
      const add = (x) => {
        if (!x) return;
        railCalls.add(x.call);
        (callsByRow[x.call] = callsByRow[x.call] || new Set()).add(row.key);
      };
      add(a.primary);
      a.secondary.forEach(add);
    });
  });

  const barCalls = bar({ driveFolder: 'x' }).map((a) => a.call).filter(Boolean);
  ok(barCalls.length > 0, 'the bar has calls to check — a bar of pure links would make this vacuous');
  ok(railCalls.size >= 15, 'the rail really was walked (' + railCalls.size + ' distinct calls)');

  // ⚠⚠ EXACTLY ONE OVERLAP, AND IT IS NAMED. The `walkthrough` row's primary opens the
  // same Edit Client modal, because the missing datum genuinely lives there — but under
  // its own label ("Set the walkthrough date"), as the live step's instruction rather
  // than as a standing tool. It is exempt for the reason the bubble's four were not:
  // the two copies CANNOT disagree. Same call, and Edit Client is never gated, so there
  // is no state in which one is offered and the other withheld. Pinning the exemption BY
  // ROW is what keeps this a real net: a second overlap, or this call appearing from any
  // other row, fails.
  const overlap = barCalls.filter((c) => railCalls.has(c));
  eq(overlap, ['dashEditClient(7)'], 'the only overlap is Edit Client');
  eq([...(callsByRow['dashEditClient(7)'] || [])], ['walkthrough'],
    '…and it comes from the walkthrough row alone, as that step\'s own instruction');

  // The converse, and it is what makes the check meaningful rather than trivially true:
  // the retired buttons ARE on the rail, so taking them out of the bar lost nothing.
  const railText = [...railCalls].join(' ');
  ok(/dashGoEstimate\(7\)/.test(railText), 'Build Estimate is on the rail');
  ok(/dashSubmitEstimate\(7\)/.test(railText), 'Submit for approval is on the rail');
  ok(/openWonModal\(7\)/.test(railText), 'Mark won is on the rail');
  ok(/activateOrCycle\(7\)/.test(railText), 'Activate / close is on the rail');
  ok(/dashEditEstimate\(7\)/.test(railText), 'Edit estimate is on the rail');
  ok(/dashOfferDiscount\(7\)/.test(railText), 'Offer discount is on the rail');
  ok(/docAction\(7,'estimate','send'\)/.test(railText), 'and every document is sent from it');

  // ───────────────────────────────────────────────────────────────────────────
  group('Drive is a link, and the folder is made at CLIENT CREATION');

  // ⚠ THE ANSWER TO "WHEN DOES THE CLIENT FOLDER FIRE?" — at the intake save, once, with
  // all six subfolders in the same call. Nothing later in the lifecycle creates one,
  // which is why this control is only ever a link. Pinned at source because it is the
  // claim the bar's fallback rests on.
  const intakeFrom = src.indexOf('\nfunction saveIntake(');
  const intakeBody = src.slice(intakeFrom, src.indexOf('\nfunction ', intakeFrom + 10));
  ok(intakeBody.length > 500, 'saveIntake was found and bounded');
  has(intakeBody, 'createDriveJobFolder(job)', 'the intake save is what creates the Drive folder');
  const mk = src.slice(src.indexOf('function createDriveJobFolder('),
    src.indexOf('function createDriveJobFolder(') + 1400);
  has(mk, "'Estate Inventory','Walkthrough Notes','Estimates','Agreement','Change Orders','Invoice'",
    'all six subfolders are made in that one call');
  has(mk, 'if (job && job.driveFolder)', 'and it refuses to mint a second folder for a job that has one');

  const drive = b.filter((x) => /Drive/.test(x.label))[0];
  eq(drive.href, 'https://drive.google.com/drive/folders/XYZ', "it opens the job's own folder");
  eq(drive.call, undefined, '⚠ never a call — a create action here would mint a duplicate folder');

  // ⚠ AND THE RENDERED CONTROL IS AN ANCHOR, WHICH THE OBJECT CHECK ABOVE DOES NOT PROVE.
  // Rewriting the renderer to emit `<button onclick="window.open(href)">` left every
  // assertion in this file green — caught by reverting, not by reading, which is the
  // thirteenth time CLAUDE.md has had to record that. An anchor is what gives Drive
  // middle-click, cmd-click and "copy link address"; a scripted window.open on an iPad is
  // also exactly what a popup blocker eats.
  const driveHtml = ctx._dashUtilityBarHtml({ id: 7, driveFolder: 'https://drive.google.com/drive/folders/XYZ' });
  has(driveHtml, '<a href="https://drive.google.com/drive/folders/XYZ"', 'the rendered control is an anchor with a real href');
  has(driveHtml, 'target="_blank"', 'opening in a new tab, so the dashboard is not navigated away from');
  lacks(driveHtml, 'window.open', '⚠ never a scripted open — a popup blocker eats that on an iPad');
  ok(!/onclick="[^"]*[Dd]rive/.test(driveHtml), 'and Drive carries no onclick at all');
  // The converse: Edit Client IS a button, because it opens a modal in place.
  has(driveHtml, '<button class="btn-s" onclick="dashEditClient(7)"', 'Edit Client stays a button');

  // ⚠⚠ A JOB WITH NO FOLDER OFFERS TO MAKE ONE, AND NEVER LINKS TO THE DRIVE ROOT.
  // This assertion used to pin the opposite ("findable beats absent"), and that
  // fallback is what disguised a real failure: the single automatic attempt at intake
  // failed SILENTLY, the button went on opening the Drive root exactly as if it had
  // worked, and the first symptom was a crew in the entryway watching every photograph
  // fail. Nothing else in the lifecycle creates a folder, so the link was also a dead
  // end — the client could never get one. The requirement is the repair door, not the
  // root link, and the root link must not come back.
  const fbDrive = bar({}, 'ROOTID').filter((x) => /Drive/.test(x.label))[0];
  eq(fbDrive.href, undefined, 'a folderless job never links to the Drive root');
  eq(fbDrive.call, 'createDriveFolderNow(7)', 'it offers to create the folder instead');
  has(fbDrive.label, 'Create Drive folder', 'and the label says so, rather than reading as a link to the folder');
  // The door exists and is reachable by that exact name.
  has(src, 'function createDriveFolderNow(', 'createDriveFolderNow is defined');
  // It is offered whether or not a root folder id happens to be configured — the root
  // was never what made the folder, so it has no bearing on whether one can be made.
  eq(bar({}, '').length, 2, 'and it is offered with no root configured too');
  has(ctx._dashUtilityBarHtml({ id: 7 }), 'onclick="createDriveFolderNow(7)"',
    'the rendered folderless control is a real button');

  // ───────────────────────────────────────────────────────────────────────────
  group('dashUtilityBar is DOM-free, and guards a missing job');

  const ubFrom = src.indexOf('function dashUtilityBar(');
  const ubBody = src.slice(ubFrom, src.indexOf('\nfunction _dashUtilityBarHtml', ubFrom))
    .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  ok(ubBody.length > 100, 'the body was found and bounded');
  lacks(ubBody, 'document.', 'it never touches the DOM — the tests read real objects, not rendered HTML');
  lacks(ubBody, 'innerHTML', 'and it builds no markup; _dashUtilityBarHtml does that');
  eq(ctx.dashUtilityBar(null), [], 'no job returns nothing rather than throwing');
  eq(ctx._dashUtilityBarHtml(null), '', 'and renders nothing');

  // ───────────────────────────────────────────────────────────────────────────
  group('The bar renders on the timeline heading, NOT in the tan NEXT band');

  const html = render();
  has(html, '<div class="d-sec-bar">', 'the heading line is a flex bar');
  has(html, '<div class="d-util">', 'and it carries the utility buttons');
  has(html, 'Job Timeline & Payments', 'beside the timeline heading itself');

  // ⚠ PLACEMENT IS THE POINT, so it is measured on the RENDERED page rather than argued.
  // The tan band means "the one thing to do next"; hanging standing tools in it costs it
  // exactly that meaning, which is why Anthony's "put it in the tan box" landed here
  // instead — on the heading immediately above it.
  const barAt = html.indexOf('<div class="d-util">');
  const nextAt = html.indexOf('<div class="jt-next">');
  ok(barAt > -1, 'the bar is on the page');
  ok(nextAt > -1, 'the NEXT band is on the page');
  ok(barAt < nextAt, 'the bar comes BEFORE the NEXT band');
  const nextBlock = html.slice(nextAt, html.indexOf('<div class="jt-rail">'));
  ok(nextBlock.length > 50, 'the NEXT band was bounded');
  lacks(nextBlock, 'd-util', 'and nothing of the bar is inside the NEXT band');

  // The retired bubble is gone from the RENDERED page, not merely from the source.
  lacks(html, '>Client Dashboard<', 'the "Client Dashboard" header bubble is gone');
  lacks(html, 'Manage this client', 'and its subtitle with it');
  lacks(html, 'Activate Job', 'no Activate Job button at the top');
  lacks(html, 'Build Estimate</button>', 'no Build Estimate button at the top');
  lacks(html, 'Submit for Approval</button>', 'no Submit for Approval button at the top');
  lacks(html, 'Mark Won</button>', 'no Mark Won button at the top');
  lacks(html, 'editEstimateForJob(', 'and nothing on the page bounces you to the Build Estimate tab');

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ EVERY onclick ON THE RENDERED DASHBOARD IS UNIQUE');

  // The general net, and it earned its keep before it was committed: it is what caught
  // Change Order being offered twice. A rule about one named button would not have.
  // Walked at several points in the lifecycle, because a duplicate can appear at one
  // stage only.
  [
    { label: 'won, estimate approved', over: {}, rec: undefined },
    { label: 'brand new, no estimate', over: { status: 'new', won: false, approved: false }, rec: null },
    { label: 'signed and funded', over: { agrApproved: true, agrSent: true, agrSigned: true,
      agrSignedAt: 'Sep 10, 2026', depositReceived: true, status: 'active',
      payments: [{ id: 1, stage: 'deposit', amount: 12050, receivedOn: '2026-09-10' }] }, rec: undefined },
    { label: 'closed', over: { status: 'closed', deliveredOn: '2026-09-30', agrSigned: true,
      depositReceived: true, payments: [{ id: 1, stage: 'deposit', amount: 12050 }] }, rec: undefined },
    { label: 'lost', over: { status: 'lost', won: false }, rec: undefined },
  ].forEach((c) => {
    const page = render(c.over, c.rec);
    const clicks = (page.match(/onclick="([^"]+)"/g) || []).map((m) => m.slice(9, -1));
    ok(clicks.length > 2, c.label + ': the page really rendered its buttons (' + clicks.length + ')');
    const dupes = [...new Set(clicks.filter((v, i) => clicks.indexOf(v) !== i))];
    eq(dupes, [], c.label + ': no control appears twice on one screen');
  });

  // ───────────────────────────────────────────────────────────────────────────
  group('Edit client appears exactly once, and the quick strip no longer carries it');

  eq((html.match(/dashEditClient\(7\)/g) || []).length, 1, 'one Edit Client button on the whole page');

  // ⚠ THE QUICK STRIP DEDUPS BY `call` AND SKIPS THE LIVE ROW, so leaving Edit client on
  // the (always-done) intake row would have put the identical button on screen twice —
  // the very thing this change removes.
  const doneJob = Object.assign({}, BASE, { status: 'won', won: true, approved: true });
  const doneRec = { estimate: EST(), approved: true };
  const intakeRow = ctx.jobTimeline(doneJob, doneRec, [], []).filter((r) => r.key === 'intake')[0];
  eq(intakeRow.state, 'done', 'the intake row is done on any live job');
  eq(ctx.jobTimelineActions(intakeRow, doneJob, doneRec).secondary, [], 'and it offers nothing');

  // ⚠ THE CONVERSE, AND IT IS A DIFFERENT THING: the walkthrough row's PRIMARY still
  // calls dashEditClient. There it is the live step's instruction, and a `current` row is
  // excluded from the quick strip anyway, so it cannot collide with the bar.
  const walkJob = Object.assign({}, BASE, { walkthrough: '', status: 'new', won: false, approved: false });
  const walkRow = ctx.jobTimeline(walkJob, null, [], []).filter((r) => r.key === 'walkthrough')[0];
  eq(walkRow.state, 'current', 'a job with no walkthrough date lights that step');
  const wa = ctx.jobTimelineActions(walkRow, walkJob, null);
  ok(wa.primary && /dashEditClient/.test(wa.primary.call), 'the walkthrough row still opens Edit Client');
  ok(/walkthrough date/i.test(wa.primary.label), 'under its own label — an instruction, not a tool');
  // And on the rendered page that still leaves ONE of each, because the band carries the
  // instruction and the bar carries the tool: asserted by the uniqueness net above, which
  // includes the 'brand new, no estimate' case.

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE STYLESHEET IS PART OF THIS CHANGE');

  // The 368-line-CSS-deletion shape: a rule no test reads is a rule that can be deleted
  // silently, and the bar collapses into a stack of buttons under the heading without
  // these two. Pinned at source for the same reason `.ce-lead` is.
  const css = src.slice(src.indexOf('<style'), src.indexOf('</style>'));
  has(css, '.d-sec-bar{', 'the heading bar rule is declared');
  has(css, '.d-sec-bar .d-util{', 'and the button group rule');
  const secBar = css.slice(css.indexOf('.d-sec-bar{'), css.indexOf('.d-sec-bar{') + 220);
  has(secBar, 'justify-content:space-between', 'heading left, buttons right');
  has(secBar, 'flex-wrap:wrap', 'and it wraps, so the bar survives a phone');

  // ───────────────────────────────────────────────────────────────────────────
  group('The locals the retired bubble owned went WITH it');

  // Dead code that still compiles is how a retired control comes back "as a precaution".
  const rcdFrom = src.indexOf('function renderClientDashboard(');
  const rcd = src.slice(rcdFrom, src.indexOf('\nfunction ', rcdFrom + 10))
    .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  ok(rcd.length > 1000, 'the body was found and bounded');
  lacks(rcd, 'var estApproved', 'estApproved is gone — nothing after the bubble read it');
  lacks(rcd, 'var estExists', 'estExists is gone');
  lacks(rcd, 'var estSubmitted', 'estSubmitted is gone');
  has(rcd, 'var estRec = estimateStore[jobId];', 'estRec survives — the rail needs it');
  lacks(rcd, 'editEstimateForJob(', 'and no estimate button survives in the dashboard');
  lacks(rcd, 'dashboardSubmitForApproval(', 'nor a submit button');
  lacks(rcd, 'openWonModal(', 'nor a Mark Won button');
  lacks(rcd, 'activateOrCycle(', 'nor an Activate/Close button');
  has(rcd, '_dashUtilityBarHtml(job)', 'and the bar is rendered exactly where the heading is built');
  eq((rcd.match(/_dashUtilityBarHtml\(/g) || []).length, 1, 'once, and only once');
};
