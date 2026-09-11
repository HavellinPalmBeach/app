'use strict';
// SLICE 5 — ONE WAY TO FILE ANY CLIENT DOCUMENT TO DRIVE (2026-09-11).
//
// Slice 3 gave the five documents one way to be NAMED, VIEWED and PRINTED; Slice 4 one way
// to be SENT. This is the last verb: `docAction(jobId, kind, 'file', opt)`.
//
// ⚠⚠ TWO OF THE FOUR WRITERS SCRAPED A RENDERED PANEL, AND IT IS THE WORST BLAST RADIUS IN
// THE APP. `saveFolderEstimate` read `#ce-page-content` and `exportAgreementToDrive` read
// `#agr-page-content` — whatever those TABS happened to be showing. Fired from the
// drilldown, which never opens either, that is the PREVIOUSLY-LOADED CLIENT'S DOCUMENT
// filed into THIS client's estate folder, under this client's job id. Nothing downstream
// can notice: the upload succeeds, the badge reads "saved to Drive ✓", and counsel opens a
// shared folder holding somebody else's agreement. CLAUDE.md flagged this on the agreement
// on 2026-09-10 and it stayed live until now.
//
// ⚠⚠ AND THE INVOICE WAS FILED BY EXACTLY ONE BUTTON ON ONE TAB. `saveInvoiceToDrive` was
// reachable from `printInvoice` and nowhere else — so an invoice SENT from the rail was
// retained nowhere at all. That function's own comment names the failure it was built to
// prevent: *"the firm could not produce what it had billed."*

const { sandbox, source, fn, decl } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ NOTHING BUILDS A DOCUMENT FROM A PANEL ANY MORE');
  {
    // The requirement, stated once and checked across every filing path: a document going
    // into a client's Drive folder is built from the SPEC, never read off the screen.
    ['docFile', 'saveFolderEstimate', 'exportSigningPacketToDrive',
     'printInvoice', 'docPdfBase64'].forEach((f) => {
      const b = noComments(fn(f));
      lacks(b, "getElementById('ce-page-content')", f + ' does not read the estimate tab');
      lacks(b, "getElementById('agr-page-content')", f + ' does not read the agreement tab');
      lacks(b, "getElementById('inv-page-content')", f + ' does not read the invoice tab');
    });
    has(noComments(fn('docFile')), 'spec.cfg.html(spec)', 'docFile builds from the registry');
    // ⚠ The three renderers Slice 2 extracted are what make that possible. A caller that
    // has to render into a panel to obtain a document will always be one early return away
    // from leaving that panel on another client.
    ['clientEstimateHtml', 'agreementHtml', 'invoiceHtml'].forEach((f) =>
      ok(fn(f).length > 0, f + ' exists as a pure builder for it to use'));
    // ⚠ `exportAgreementToDrive` is GONE (2026-09-11). It filed the BARE agreement beside
    // the packet, so the folder held the terms-without-Exhibit-A one click from the document
    // the client actually signs, under a nearly identical name. Anthony: *"let's just have
    // the combined doc saved and sent."* The packet carries the agreement verbatim as its
    // first page, so nothing is lost — and nothing ever read the filed bare copy back.
    lacks(src, 'function exportAgreementToDrive', 'the bare-agreement filer is deleted, not disabled');
    // ⚠ Scoped to LIVE lines, and that is the honest scope rather than a weakened check:
    // the comment above the packet's filer NAMES the retired filename in order to explain
    // what was removed and why nobody should restore it. The requirement is that no CODE
    // writes that name any more. (This file records the same needle tripping on its own
    // comment twice before — reword the comment, or scope the assertion and say why.)
    lacks(noComments(src), '_Agreement.html', 'and no code writes its Drive filename any more');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ the filename must not move, or a re-file accumulates instead of replacing');
  {
    // `uploadHtmlToDrive` overwrites BY FILENAME — that asymmetry is load-bearing and
    // CLAUDE.md records it: the client-facing name is dated, the Drive name is not,
    // precisely so a re-file REPLACES. A changed name orphans every copy already there.
    const nm = sandbox({ fns: ['docNames', 'docKeyFor', 'estimateDocNames'], vars: ['EST_TOLERANCE_PCT', 'DOC_STAGE_WORD'] });
    const job = { hvlId: 'HVL-0007', addr: '69 Beach Blvd, Palm Beach FL', name: 'Butler' };
    eq(nm.docNames(job, 'estimate', {}).drive, nm.estimateDocNames(job).driveClient,
      'the estimate keeps the exact name it already files under');
    // Every Drive name is undated, so re-filing is idempotent.
    [['estimate', {}], ['agreement', {}], ['invoice', { stage: 'deposit' }],
     ['invoice', { stage: 'midpoint' }], ['invoice', { stage: 'final' }]].forEach(([k, o]) => {
      const d = nm.docNames(job, k, o).drive;
      has(d, 'HVL-0007', k + ': the Drive name is keyed to the job');
      has(d, '.html', k + ': and is an html file');
      lacks(d, '2026', k + ': ⚠ and carries NO date — that is what makes a re-file replace');
      ok(nm.docNames(job, k, o).client.indexOf('20') > 0,
        k + ': while the CLIENT name IS dated, because that copy is not overwritten');
    });
    // ⚠ THE THREE INVOICES MUST NOT SHARE A FILE. Keying on kind alone would have each
    // stage overwrite the last, leaving one invoice in the folder for a job that issued
    // three — the same collision `printInvoice` already had for a different reason.
    const inv = ['deposit', 'midpoint', 'final'].map((st) => nm.docNames(job, 'invoice', { stage: st }).drive);
    eq(new Set(inv).size, 3, 'each invoice stage files under its own name');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the record — "is this in Drive?" is answerable for all five now');
  {
    // `estimateDriveAt` was built on 2026-08-03 because there was no record anywhere that
    // an estimate had been filed. The agreement, the packet and all three invoices still
    // had none, so the question was unanswerable for four of the five.
    const ctx = sandbox({
      fns: ['docState', 'docRecordFiled', 'docFiledAt', 'docKeyFor'],
      stubs: { saveJobs() { ctx.__saved = (ctx.__saved || 0) + 1; }, syncJobToSheets() {} },
    });
    ctx.currentInvStage = 'final';
    const job = { id: 1 };
    ctx.docRecordFiled({ job, key: 'invoice:deposit', kind: 'invoice' }, 'https://drive/x');
    const st = job.docState['invoice:deposit'];
    ok(!!st.filedAt, 'the filing is stamped');
    eq(st.filedUrl, 'https://drive/x', 'with the link back to the copy');
    eq(ctx.docFiledAt(job, 'invoice', 'deposit'), st.filedAt, 'and reads back by kind and stage');
    eq(ctx.docFiledAt(job, 'invoice', 'midpoint'), '', '⚠ and the midpoint does not inherit it');
    eq(ctx.docFiledAt({ id: 2 }, 'estimate'), '', 'a job with no record reads empty, never undefined');
    eq(ctx.__saved, 1, 'and it persists');

    // ⚠ THE ESTIMATE KEEPS ITS LEGACY PAIR. `updateApprovalUI` hides the retry button on
    // `estimateDriveAt` and the approval banner links `estimateDriveUrl`; writing docState
    // alone would leave a filed estimate showing its "File to Drive" retry forever.
    ctx.docRecordFiled({ job, key: 'estimate', kind: 'estimate' }, 'https://drive/e');
    eq(job.estimateDriveAt, job.docState.estimate.filedAt, 'the estimate mirrors to the legacy stamp');
    eq(job.estimateDriveUrl, 'https://drive/e', 'and the legacy url');
    // Only the estimate — nothing else has a legacy reader to satisfy.
    eq((noComments(fn('docRecordFiled')).match(/spec\.kind === /g) || []).length, 1,
      'exactly one kind carries a legacy mirror');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ DRIVEN END TO END — docAction(…, \'file\') really files and really records');
  {
    // ⚠ THIS GROUP EXISTS BECAUSE TWO REVERTS CAME BACK GREEN. Dropping `docFile`'s call
    // to `docRecordFiled`, and dropping the `'file'` verb out of `docAction` altogether,
    // both left the suite passing — because every other check here drives a PIECE
    // (`docRecordFiled` on its own, `docNames` on its own) and nothing drove the WIRING.
    // A part-by-part suite over a path nobody walks is the shape this file records again
    // and again. So: the real `docAction`, the real registry, a fake Drive.
    const uploads = [];
    const ctx = sandbox({
      fns: ['docAction', 'docFile', 'docRecordFiled', 'docState', 'docSentAt', 'docFiledAt',
            'docKeyFor', 'docNames', 'docSpec', 'approvedEstimateFor'],
      vars: ['EST_TOLERANCE_PCT', 'DOC_ACTIONS', 'DOC_STAGE_WORD'],
      stubs: {
        saveJobs() {}, syncJobToSheets() {}, showSyncBadge() {},
        _exportDoc: (title, body) => '<doc>' + title + '|' + body + '</doc>',
        resolveSubfolderId: (job, name, cb) => cb(name === 'Nowhere' ? null : 'folder:' + name),
        _jobRootFolderId: () => 'folder:ROOT',
        uploadHtmlToDrive(folderId, filename, html, done) {
          uploads.push({ folderId, filename, html });
          done(true, 'https://drive/' + uploads.length, {});
        },
        _docNotice(type, msg) { ctx.__notice = { type, msg }; },
        ensureAgreementApproved: () => '',
        signingPacketHtml: () => '<packet/>',
        clientEstimateHtml: () => '<estimate/>',
        invoiceHtml: () => ({ html: '<invoice/>', blocked: false, requiresApproval: false, amtDue: 100 }),
        agreementReady: () => '',
        bestClientEmail: () => 'c@x.com',
        DEPT_EMAILS: { estimates: 'e@h', agreements: 'a@h', billing: 'b@h' },
      },
    });
    const job = { id: 7, hvlId: 'HVL-0007', addr: '69 Beach Blvd', name: 'Butler', driveFolder: 'https://drive/folders/abc' };
    ctx.jobs = [job];
    ctx.estimateStore = { 7: { estimate: { jobId: 7 }, approved: true } };
    ctx.currentInvStage = 'final';

    // ⚠ THE WIRING, BOTH HALVES: the verb dispatches, and the filing is RECORDED.
    eq(ctx.docAction(7, 'estimate', 'file', {}), true, "docAction dispatches the 'file' verb");
    eq(uploads.length, 1, 'and one document reaches Drive');
    eq(uploads[0].folderId, 'folder:Estimate', 'in the subfolder the registry names');
    eq(uploads[0].filename, 'HVL-0007 - Havellin Service Estimate.html', 'under the shared Drive name');
    has(uploads[0].html, '<estimate/>', 'built from the pure renderer, not a panel');
    ok(!!ctx.docFiledAt(job, 'estimate'), '⚠ AND THE FILING IS RECORDED — the revert that came back green');
    eq(job.docState.estimate.filedUrl, 'https://drive/1', 'with the link to the copy');
    eq(job.estimateDriveAt, job.docState.estimate.filedAt, 'and the estimate mirrors its legacy stamp');

    // The agreement kind files the PACKET, into the Agreement folder.
    ctx.docAction(7, 'agreement', 'file', {});
    eq(uploads[1].folderId, 'folder:Agreement', 'the agreement goes to its own folder');
    has(uploads[1].html, '<packet/>', '⚠ and it is the PACKET, never the bare agreement');
    ok(!!ctx.docFiledAt(job, 'agreement'), 'recorded too');

    // ⚠ THE THREE INVOICES ARE THREE FILES AND THREE RECORDS.
    ['deposit', 'midpoint', 'final'].forEach((st) => ctx.docAction(7, 'invoice', 'file', { stage: st }));
    const names = uploads.slice(2).map((u) => u.filename);
    eq(new Set(names).size, 3, 'each stage files its own document');
    ['deposit', 'midpoint', 'final'].forEach((st) =>
      ok(!!ctx.docFiledAt(job, 'invoice', st), st + ' is recorded under its own key'));
    // ⚠ SEPARATE RECORDS, NOT SEPARATE TIMESTAMPS. The three stamps land in the same
    // millisecond here and comparing them proves nothing — what has to be true is that
    // filing ONE stage stamps only that stage. Keying on kind alone is how a midpoint
    // would read as filed because the deposit was.
    const one = { id: 8, hvlId: 'HVL-0008', driveFolder: 'https://drive/folders/z' };
    ctx.jobs.push(one);
    ctx.estimateStore[8] = { estimate: { jobId: 8 }, approved: true };
    ctx.docAction(8, 'invoice', 'file', { stage: 'deposit' });
    ok(!!ctx.docFiledAt(one, 'invoice', 'deposit'), 'the deposit is filed');
    eq(ctx.docFiledAt(one, 'invoice', 'midpoint'), '', 'and the midpoint does not read as filed');
    eq(ctx.docFiledAt(one, 'invoice', 'final'), '', 'nor the final');
    eq(ctx.docFiledAt(one, 'estimate'), '', 'nor a different document entirely');

    // ⚠ THE GATE RUNS BEFORE THE FILING. A document the registry refuses must not reach a
    // client's Drive folder — the same rule Slice 3 put on view and print.
    const before = uploads.length;
    ctx.estimateStore[7].approved = false;
    eq(ctx.docAction(7, 'estimate', 'file', {}), false, 'an unapproved estimate is refused');
    eq(uploads.length, before, 'and nothing is filed');
    has(ctx.__notice.msg, 'has not been approved', 'with the reason on screen');
    ctx.estimateStore[7].approved = true;

    // An unresolved subfolder falls back to the job root rather than dropping the document.
    const fb = sandbox({
      fns: ['docAction', 'docFile', 'docRecordFiled', 'docState', 'docFiledAt', 'docKeyFor', 'docNames', 'docSpec', 'approvedEstimateFor'],
      vars: ['EST_TOLERANCE_PCT', 'DOC_ACTIONS', 'DOC_STAGE_WORD'],
      stubs: Object.assign({}, {
        saveJobs() {}, syncJobToSheets() {}, showSyncBadge() {}, _docNotice() {},
        _exportDoc: (t, b) => b, resolveSubfolderId: (j, n, cb) => cb(null),
        _jobRootFolderId: () => 'folder:ROOT',
        uploadHtmlToDrive(folderId, filename, html, done) { fb.__at = folderId; done(true, 'u', {}); },
        clientEstimateHtml: () => '<estimate/>', invoiceHtml: () => null,
        signingPacketHtml: () => '', agreementReady: () => '', ensureAgreementApproved: () => '',
        bestClientEmail: () => '', DEPT_EMAILS: { estimates: '', agreements: '', billing: '' },
      }),
    });
    fb.jobs = [{ id: 7, hvlId: 'HVL-0007', driveFolder: 'https://drive/folders/abc' }];
    fb.estimateStore = { 7: { estimate: { jobId: 7 }, approved: true } };
    fb.docAction(7, 'estimate', 'file', {});
    eq(fb.__at, 'folder:ROOT', '⚠ an older job with no Estimate subfolder files a level up, not nowhere');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ a document that went to the client is one the firm can produce');
  {
    // The parity gap this slice exists to close: the estimate filed on approval, the
    // agreement and packet filed on approval, and the invoice filed NOWHERE unless
    // somebody pressed Print on the Invoices tab.
    const send = noComments(fn('docSend'));
    has(send, "docAction(spec.job.id, spec.kind, 'file'", 'sending files the document');
    has(send, 'stage: spec.stage', 'carrying its stage, so a midpoint files as a midpoint');
    ok(send.indexOf('docRecordSent(spec') < send.indexOf("'file'"),
      'after the send record, which is the thing the person is waiting on');
    // ⚠ `auto: true`, so a Drive failure never buries the notice that matters. The draft
    // was created; an error about a copy nobody is waiting on must not replace that.
    has(send, 'auto: true', 'and silently — a failed filing does not bury the draft notice');
    has(noComments(fn('docFile')), 'if (!auto)', 'which docFile honours on every failure branch');
    lacks(src, 'function saveInvoiceToDrive(', 'the one-button invoice filer is gone');
    eq((src.match(/[^\w$.]saveInvoiceToDrive\s*\(/g) || []).length, 0, 'and nothing calls it');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the fallback, and the failure that must never be silent');
  {
    const b = noComments(fn('docFile'));
    // ⚠ FALL BACK TO THE JOB ROOT RATHER THAN DROPPING THE DOCUMENT. Older jobs predate
    // some of these subfolders. `saveInvoiceToDrive` already did this and the other three
    // just `return`ed — so on such a job the estimate, agreement and packet were silently
    // never retained. A document filed a level up is findable; one never written is not.
    has(b, '_jobRootFolderId(spec.job)', 'an unresolved subfolder falls back to the job root');
    has(b, 'if (!target)', 'and only a job with no Drive folder at all gives up');
    has(b, 'no Drive folder yet', 'saying so, with the fix');
    // A filing somebody pressed reports its failure; one nobody pressed does not shout.
    has(b, "_docNotice('err'", 'a pressed filing that fails says so');
    has(b, 'duplicatesRemoved', 'and the badge carries the server’s duplicate sweep');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the rail answers it, and offers the retry where it matters');
  {
    const ctx = sandbox({ fns: ['_jtDriveLink', 'docKeyFor'] });
    const j = (o) => ({ id: 7, docState: { estimate: o } });
    eq(ctx._jtDriveLink(7, j({}), 'estimate', '').length, 0, 'nothing sent, nothing offered');
    eq(ctx._jtDriveLink(7, j({ filedAt: 't', filedUrl: 'https://drive/x' }), 'estimate', '')[0].call,
      "openDocFiled(7,'estimate')", 'a filed document offers its copy');
    // ⚠ THE CASE THAT MATTERS: it went to the client and was NOT filed, so the firm cannot
    // produce it later. That gets a button rather than silence.
    const gap = ctx._jtDriveLink(7, j({ sentAt: 't' }), 'estimate', '');
    eq(gap.length, 1, 'sent but unfiled offers a retry');
    has(gap[0].call, "'estimate','file'", 'through the one action');
    has(gap[0].label, 'File to Drive', 'and says what it will do');
    // An unsent, unfiled document is not a gap — it has not gone anywhere yet.
    eq(ctx._jtDriveLink(7, j({ draftedAt: 't' }), 'estimate', '').length, 0,
      'a draft that has not been sent is not a retention gap');
    // The stage travels, so a midpoint retry files a midpoint.
    const mid = ctx._jtDriveLink(7, { id: 7, docState: { 'invoice:midpoint': { sentAt: 't' } } }, 'invoice', 'midpoint');
    has(mid[0].call, "{stage:'midpoint'}", 'and an invoice retry carries its stage');

    // Every document row offers it, by construction rather than by five copies.
    const acts = noComments(fn('jobTimelineActions'));
    eq((acts.match(/_jtDriveLink\(/g) || []).length, 5, 'five rows, one builder');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ printInvoice is finally the shim Slice 3 said it already was');
  {
    // CLAUDE.md's Slice 3 entry says "all three are five-line wrappers on docAction now".
    // It was two plus the packet — `printInvoice` was never converted, so the defect that
    // entry records fixing was still live: the client's invoice PDF was named
    // `<Surname>-<hvlId>-Final`, a database key on a document going to a client.
    const p = noComments(fn('printInvoice'));
    ok(p.replace(/\s+/g, ' ').trim().length < 130, 'it is one line now');
    has(p, "docAction(currentInvJobId, 'invoice', 'print'", 'routing through the one action');
    lacks(p, 'window.print()', 'hand-rolling no print sequence');
    lacks(p, 'document.title =', 'and naming the client’s PDF through docNames instead');
    lacks(p, "job.name.split(' ').pop()", 'so the database-key filename is gone');
    eq((src.match(/-' \+ \(job\.hvlId \|\| 'Invoice'\) \+ '-/g) || []).length, 0,
      'and survives nowhere else in the file');
    // All four printers are shims on one path now — that is the claim, checked.
    ['printClientEstimate', 'printAgreement', 'printSigningPacket', 'printInvoice'].forEach((f) => {
      has(noComments(fn(f)), 'docAction(', f + ' goes through the one action');
      lacks(noComments(fn(f)), 'printTarget', f + ' touches no print target itself');
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE COMMIT HOOK RE-ENTERS ITSELF, AND IS BOUNDED BY ONE ORDERING');
  {
    // `exportSigningPacketToDrive` files through `docAction(…,'file')`; `docAction` runs
    // `DOC_ACTIONS.agreement.commit`, which IS `ensureAgreementApproved`; and that is what
    // called the packet filer. The stamp calls the filer and the filer calls the stamp.
    //
    // ⚠ TWO GUARDS BOUND IT, AND THE FIRST WRITE-UP NAMED THE WRONG ONE. Measured by
    // reverting each in turn: dropping `ensureAgreementApproved`'s `if (job.agrApproved)`
    // early return alone leaves it bounded and the suite GREEN; dropping
    // `exportSigningPacketToDrive`'s `_packetExported` stamp guard alone turns it RED; and
    // dropping BOTH runs away. So the packet guard is load-bearing and the early return is
    // the second line of defence — which is worth knowing before anyone removes either as
    // redundant. The check below drives the loop rather than reading source order.
    has(src, 'commit: function (spec) { return ensureAgreementApproved(spec.job.id); },',
      'the hook really is this function, so the loop is real');

    // ⚠⚠ THIS IS DRIVEN, NOT READ, AND THE FIRST VERSION COULD NOT FAIL. It asserted that
    // `job.agrApproved = true` appears at a lower SOURCE INDEX than the filing — and
    // wrapping the assignment in a `setTimeout` leaves that index exactly where it was
    // while destroying the ordering completely. The revert came back green. A source index
    // is not an ordering; run it.
    //
    // `setTimeout` is synchronous here on purpose: it makes the re-entry immediate, so an
    // unbounded loop blows the stack in this test instead of in somebody's browser.
    const rc = sandbox({
      fns: ['ensureAgreementApproved', 'exportSigningPacketToDrive', 'docAction', 'docFile',
            'docRecordFiled', 'docState', 'docFiledAt', 'docKeyFor', 'docNames', 'docSpec',
            'approvedEstimateFor', 'agreementReady'],
      vars: ['EST_TOLERANCE_PCT', 'DOC_ACTIONS', 'DOC_STAGE_WORD'],
      stubs: {
        setTimeout: (f) => f(),
        saveJobs() {}, syncJobToSheets() {}, showSyncBadge() {}, _docNotice() {},
        _exportDoc: (t, b2) => b2, resolveSubfolderId: (j, n, cb) => cb('folder:' + n),
        _jobRootFolderId: () => 'root',
        uploadHtmlToDrive(f, n, h, done) { rc.__up.push(n); done(true, 'https://drive/x', {}); },
        _primeAgreementFor: () => true,
        _packetExported: {}, _agrExportKey: (j) => String(j.agrApprovedAt || ''),
        signingPacketHtml: () => '<packet/>', isJobWon: () => true,
        clientEstimateHtml: () => '<e/>', invoiceHtml: () => null,
        bestClientEmail: () => '', DEPT_EMAILS: { estimates: '', agreements: '', billing: '' },
      },
    });
    rc.__up = []; rc.__calls = 0;
    rc.jobs = [{ id: 9, hvlId: 'HVL-0009', driveFolder: 'https://drive/folders/f' }];
    rc.estimateStore = { 9: { estimate: { jobId: 9 }, approved: true, approvedBy: 'Anthony Graziano' } };
    rc.currentAgrJobId = 9;
    // Count the re-entries by wrapping the real function in the sandbox.
    rc.__real = rc.ensureAgreementApproved;
    rc.ensureAgreementApproved = function (id) {
      rc.__calls++;
      if (rc.__calls > 20) throw new Error('RUNAWAY RECURSION — the bound is gone');
      return rc.__real(id);
    };
    rc.DOC_ACTIONS.agreement.commit = function (spec) { return rc.ensureAgreementApproved(spec.job.id); };

    let threw = null;
    try { rc.ensureAgreementApproved(9); } catch (err) { threw = String(err.message); }
    eq(threw, null, '⚠ the stamp → file → commit loop terminates');
    ok(rc.__calls > 1, 'and it really does re-enter itself (' + rc.__calls + ' calls), so this is not a vacuous pass');
    ok(rc.__calls <= 3, 'exactly one level deep (' + rc.__calls + ' calls)');
    // Both guards, asserted where they live — so removing one is a decision rather than
    // an accident, and removing both fails the check above.
    has(noComments(fn('ensureAgreementApproved')), "if (job.agrApproved) return ''",
      'the second guard: an already-stamped agreement re-enters no further');
    has(noComments(fn('exportSigningPacketToDrive')), '_packetExported[jobId] === _agrExportKey(job)',
      'the load-bearing one: the packet does not re-file within an approval');
    eq(rc.jobs[0].agrApproved, true, 'the approval is stamped');
    eq(rc.jobs[0].agrApprovedBy, 'Anthony Graziano', 'attributed to the estimate’s approver');
    ok(rc.__up.length >= 1, 'and the packet is filed (' + rc.__up.length + ')');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ WHAT THIS SLICE MUST NOT HAVE TAKEN');
  {
    // The INTERNAL worksheet is not one of the five client documents. It is the working
    // paper — room scores, TC/PS hours, per-room dollars, walkthrough notes — and it
    // carries a red "not a client document" line on its face. It keeps its own path and
    // its own name, and that separate name is what stops the filename race that once put
    // our cost breakdown in a client's Estimate folder roughly half the time.
    ok(fn('exportEstimateToDrive').length > 0, 'the internal worksheet still files itself');
    has(fn('exportEstimateToDrive'), 'estimateDocNames(job).driveInternal', 'under its own name');
    has(src, 'INTERNAL', 'and still says on its face that it is not a client document');

    // The once-per-approval guards. A redraw must not re-file; a NEW approval carrying a
    // correction must — which is why they key on the approval stamp rather than on
    // "already done this session". CLAUDE.md records what the bare boolean cost.
    has(src, 'function _agrExportKey(job) { return String(job.agrApprovedAt || ', 'the stamp key survives');
    has(noComments(fn('exportSigningPacketToDrive')), '_agrExportKey(job)',
      'the packet — the one document retained — still keys on the approval stamp');

    // Drive's duplicate sweep depends on the Shared-Drive lookup fixed on 2026-09-09.
    has(src, 'duplicatesRemoved', 'the duplicate count still reaches the badge');
  }
};
