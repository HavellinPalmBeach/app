'use strict';
// SLICE 4 — ONE WAY TO SEND ANY CLIENT DOCUMENT (2026-09-11).
//
// Anthony: *"when we are sending documents to a client, whether it's the estimate, the
// agreement, or an invoice, it should all follow the same process and be one button to
// generate the HTML email as we currently have with the estimate … if they've sent an
// estimate they'll know how to send an agreement, and they'll know how to send an
// invoice."* Sameness is the feature, so sameness is what this file pins — and it pins it
// by CONSTRUCTION (one builder, driven) rather than by grepping five hand-written copies
// and proving only that they agreed on the day they were typed.
//
// ⚠⚠ WHAT WAS ACTUALLY THERE: THREE ANSWERS TO ONE QUESTION, AND ONE OF THEM WAS NOTHING.
//   · The ESTIMATE had a real HTML email — its own PDF builder, busy flag, Gmail call,
//     fallback and refusals, roughly 90 lines on the Client Estimate tab.
//   · The AGREEMENT had a near-identical 90 lines on its own tab, differing in a title and
//     a stylesheet — and carrying the SAME eight-line error block verbatim, the one that
//     passes the server's own words through and took three rounds of "still no PDF" to get
//     right. Two copies of that is two places for it to drift back.
//   · The INVOICE had NO email at all. Its only send was a `mailto:` whose body reads
//     "Please find attached your invoice" with NOTHING ATTACHED, because RFC 6068 carries
//     plain text and nothing else. It has been telling clients an attachment is there.
//
// ⚠ AND `estimatePdfBase64` SCRAPED `ce-page-content`. The attachment was whatever the
// Client Estimate TAB happened to be showing — so sent from the drilldown, which never
// opens that tab, it would have attached the previously-loaded client's estimate or
// nothing at all. That is the same class of defect as Slice 1's wrong-job approvals.

const { sandbox, source, fn, decl } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ docState — the record that makes an invoice-sent milestone honest');
  {
    // Slice 0 refused to draw invoice-sent rows because nothing recorded a send: "a row
    // whose `done` cannot be answered honestly is worse than no row". This is that record.
    const ctx = sandbox({ fns: ['docState', 'docSentAt', 'docDraftedAt', 'docKeyFor'] });
    ctx.currentInvStage = 'final';

    eq(ctx.docState(null, 'estimate'), null, 'no job, no record');
    const job = { id: 1 };
    const st = ctx.docState(job, 'estimate');
    eq(typeof st, 'object', 'a first read creates the slot');
    ok(job.docState && job.docState.estimate === st, 'and hangs it off the job');
    st.sentAt = 'T';
    eq(ctx.docState(job, 'estimate').sentAt, 'T', 'a second read returns the same object, never a fresh one');

    // ⚠ NESTED ON THE JOB, NOT A NEW SHEET COLUMN. The Jobs sheet stores
    // JSON.stringify(job) in its Data column, so this rides the existing sync with no
    // Apps Script redeploy — the same reason `houseFlags` is shaped this way.
    has(noComments(fn('docState')), 'job.docState', 'it lives on the job, so the existing sync carries it');
    lacks(src, "'docState'," , 'and is not added to any column whitelist, because there is none to add to');

    // ⚠ KEYED BY KIND **PLUS STAGE**, because the invoice is three documents. Keying on
    // kind alone is how a midpoint inherits a final's record — the same collision
    // `printInvoice` already had for a different reason.
    eq(ctx.docKeyFor('estimate'), 'estimate', 'a one-off document is keyed by kind');
    eq(ctx.docKeyFor('invoice', { stage: 'deposit' }), 'invoice:deposit', 'an invoice carries its stage');
    ctx.docState(job, 'invoice:deposit').sentAt = 'D';
    eq(ctx.docSentAt(job, 'invoice', 'deposit'), 'D', 'the deposit reads its own send');
    eq(ctx.docSentAt(job, 'invoice', 'midpoint'), '', 'and the midpoint does not inherit it');
    eq(ctx.docSentAt(job, 'invoice', 'final'), '', 'nor the final');
    eq(ctx.docSentAt({ id: 2 }, 'invoice', 'deposit'), '', 'a job with no record reads empty, never undefined');
    eq(ctx.docSentAt(null, 'estimate'), '', 'and neither does a missing job throw');

    // ⚠ DRAFTED IS NOT SENT, AND THE WHOLE SLICE TURNS ON IT.
    ctx.docState(job, 'invoice:final').draftedAt = 'F';
    eq(ctx.docDraftedAt(job, 'invoice', 'final'), 'F', 'a draft is recorded');
    eq(ctx.docSentAt(job, 'invoice', 'final'), '', 'and a draft is not a send');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ needsHumanSend — why the timeline asks for one confirming tap');
  {
    // `gmail.compose` DELIBERATELY CANNOT SEND. That is the requirement, not a limitation:
    // Anthony asked to review and send each email himself. So between the app creating a
    // draft and the mail going out there is a real interval, and the app cannot see across
    // it. Recording the draft as a send would turn the rail green over an untouched draft
    // sitting in a mailbox — and on the estimate that is what unlocks Mark Won.
    has(decl('GMAIL_SCOPE'), 'gmail.compose', 'the scope creates drafts');
    lacks(decl('GMAIL_SCOPE'), 'gmail.send', 'and cannot put mail on the wire');
    const prov = decl('DOC_SEND_PROVIDERS');
    eq((prov.match(/needsHumanSend: true/g) || []).length, 2, 'both providers of today need a person');
    lacks(prov, 'needsHumanSend: false', 'and none claims otherwise');

    // ⚠ IT IS A PROPERTY OF THE PROVIDER, NEVER OF THE DOCUMENT — which is what makes the
    // tap disappear on its own when a server-side sender or an e-signature provider
    // arrives in Slice 6/8. No screen changes, no second rule to remember.
    const send = noComments(fn('_jtSendAction'));
    lacks(send, 'needsHumanSend', 'the rail reads the RECORD, not the provider');
    has(send, 'st.draftedAt && !st.sentAt', 'so it asks for the tap exactly while a draft is outstanding');
    has(noComments(fn('docRecordSent')), '!DOC_SEND_PROVIDERS[res.provider].needsHumanSend',
      'and a provider that does not need one stamps sentAt itself');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ the record is written before anything else can fail, and it writes draftedAt');
  {
    const ctx = sandbox({
      fns: ['docState', 'docRecordSent'],
      stubs: { saveJobs() { ctx.__saved = (ctx.__saved || 0) + 1; },
               syncJobToSheets() { ctx.__synced = (ctx.__synced || 0) + 1; },
               _actor: () => 'Ashley Graziano',
               DOC_SEND_PROVIDERS: { gmail: { needsHumanSend: true }, robot: { needsHumanSend: false } } },
    });
    const job = { id: 1, tc: 'Anthony Graziano' };
    const spec = { job, key: 'invoice:deposit' };
    ctx.docRecordSent(spec, { provider: 'gmail', draftUrl: 'https://mail/x', pdfOk: true });
    const st = job.docState['invoice:deposit'];
    ok(!!st.draftedAt, 'the draft is stamped');
    eq(st.sentAt, undefined, '⚠ and sentAt is NOT — the app watched a draft be created, not a person send it');
    eq(st.draftedBy, 'Ashley Graziano', 'attributed to whoever is acting');
    eq(st.provider, 'gmail', 'the provider is recorded, so a later read knows what kind of send this was');
    eq(st.draftUrl, 'https://mail/x', 'with the link back to it');
    eq(st.pdfOk, true, 'and whether the PDF actually attached');
    eq(ctx.__saved, 1, 'saved once');
    eq(ctx.__synced, 1, 'and synced once');

    // A provider that really does send stamps both, and the confirming tap disappears.
    ctx.docRecordSent({ job, key: 'estimate' }, { provider: 'robot', pdfOk: false });
    const st2 = job.docState.estimate;
    eq(st2.sentAt, st2.draftedAt, 'a provider that sends stamps sentAt with it');
    eq(st2.sentBy, st2.draftedBy, 'attributed to the same person');

    // No actor and no concierge must not write `undefined` onto a client record.
    const bare = sandbox({
      fns: ['docState', 'docRecordSent'],
      stubs: { saveJobs() {}, syncJobToSheets() {}, _actor: () => '',
               DOC_SEND_PROVIDERS: { gmail: { needsHumanSend: true } } },
    });
    const j2 = { id: 2 };
    bare.docRecordSent({ job: j2, key: 'estimate' }, { provider: 'gmail' });
    eq(j2.docState.estimate.draftedBy, '', 'an unattributable draft records a blank, never undefined');
    eq(j2.docState.estimate.draftUrl, '', 'and a missing draft URL is a blank too');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ markDocSent CALLS the legacy recorders — it never reimplements their rules');
  {
    // `markAgreementSent` REFUSES without an approved agreement and stamps that approval
    // on the way through. The first version of this function set `job.agrSent = true`
    // itself, which is a door straight past the one gate that survived the slimming — and
    // a second copy of a rule this file records paying for repeatedly.
    const m = noComments(fn('markDocSent'));
    has(m, 'markAgreementSent();', 'the agreement goes through its own recorder');
    has(m, 'markEstimateSent();', 'the estimate through its own');
    ok(m.indexOf('_primeAgreementFor(jobId)') < m.indexOf('markAgreementSent();'),
      'primed first — those recorders read a global the drilldown never set');
    ok(m.indexOf('_primeEstimateFor(jobId)') < m.indexOf('markEstimateSent();'), 'both of them');
    has(m, 'if (!job.agrSent) return;', '⚠ and a refusal stops the send record being written anyway');
    lacks(m, 'job.agrSent = true', 'it never sets the agreement flag itself');
    lacks(m, 'job.estimateSentDate =', 'nor the estimate date');
    has(m, 'st.sentAt = new Date().toISOString()', 'what it owns is the per-document send stamp');

    // Driven: an invoice touches neither recorder, because neither has anything to say
    // about it — the invoice's only record IS docState.
    const ctx = sandbox({
      fns: ['docState', 'markDocSent'],
      stubs: { saveJobs() {}, syncJobToSheets() {}, dashNotice() {}, _dashRedraw() {},
               _actor: () => 'Anthony Graziano',
               _primeAgreementFor() { ctx.__primedAgr = true; return true; },
               _primeEstimateFor() { ctx.__primedEst = true; return true; },
               markAgreementSent() { ctx.jobs[0].agrSent = true; },
               markEstimateSent() { ctx.jobs[0].estimateSentDate = 'September 11, 2026'; } },
    });
    ctx.jobs = [{ id: 5 }];
    ctx.markDocSent(5, 'invoice:midpoint');
    ok(!ctx.__primedAgr && !ctx.__primedEst, 'an invoice reaches neither recorder');
    ok(!!ctx.jobs[0].docState['invoice:midpoint'].sentAt, 'and its send is recorded');
    eq(ctx.jobs[0].docState['invoice:midpoint'].sentBy, 'Anthony Graziano', 'with who said so');

    ctx.markDocSent(5, 'estimate');
    eq(ctx.jobs[0].estimateSentDate, 'September 11, 2026', 'the estimate writes the field six surfaces read');
    ctx.markDocSent(5, 'agreement');
    eq(ctx.jobs[0].agrSent, true, 'and the agreement its own');

    // ⚠ A REFUSED AGREEMENT RECORDS NOTHING. Otherwise the rail would read "sent" off a
    // docState the recorder had just declined to back.
    const refuse = sandbox({
      fns: ['docState', 'markDocSent'],
      stubs: { saveJobs() {}, syncJobToSheets() {}, dashNotice() {}, _dashRedraw() {}, _actor: () => 'x',
               _primeAgreementFor: () => true, _primeEstimateFor: () => true,
               markAgreementSent() {}, markEstimateSent() {} },
    });
    refuse.jobs = [{ id: 6 }];
    refuse.markDocSent(6, 'agreement');
    ok(!(refuse.jobs[0].docState && refuse.jobs[0].docState.agreement && refuse.jobs[0].docState.agreement.sentAt),
      'a refused agreement leaves no send record behind');

    // An unprimeable job stops before it records anything, rather than recording a send
    // against whichever job the agreement panel was last showing.
    const noprime = sandbox({
      fns: ['docState', 'markDocSent'],
      stubs: { saveJobs() {}, syncJobToSheets() {}, dashNotice() {}, _dashRedraw() {}, _actor: () => 'x',
               _primeAgreementFor: () => false, _primeEstimateFor: () => false,
               markAgreementSent() { throw new Error('must not be reached'); }, markEstimateSent() {} },
    });
    noprime.jobs = [{ id: 7 }];
    noprime.markDocSent(7, 'agreement');
    ok(!noprime.jobs[0].docState || !noprime.jobs[0].docState.agreement,
      'a job the panel cannot be primed to records nothing at all');
    noprime.markDocSent(999, 'estimate');
    ok(true, 'and an unknown job id is a no-op rather than a throw');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ one busy flag, app-wide, and a watchdog that re-enables LOUDLY');
  {
    // It used to be one flag per tab (`_estEmailBusy`, `_agrEmailBusy`), which could not
    // stop somebody starting an invoice send while an estimate was still building.
    has(src, 'var _docBusy = null;', 'one flag');
    lacks(src, 'var _estEmailBusy', 'the per-tab flags are gone');
    lacks(src, 'var _agrEmailBusy', 'both of them');
    const s = noComments(fn('docSend'));
    has(s, 'if (_docBusy)', 'a second press while one is in flight is refused');
    has(s, 'Another document is being prepared', 'and says why rather than doing nothing');

    // ⚠ A `fetch` HAS NO TIMEOUT, so a backend that never answers leaves the button dead
    // forever. Re-enabling must be LOUD: the draft may already exist, and a silent
    // re-enable is the exact moment somebody presses again and gets two drafts. That is
    // the vendor-form lesson, which cost a duplicated row in a 152-row directory.
    has(s, '45000', 'a 45-second watchdog');
    has(s, 'A draft may already have been created', 'that says the draft may exist');
    has(s, 'check your Gmail drafts before pressing send again', 'and what to do before pressing again');
    has(s, 'clearTimeout(watchdog)', 'cleared when the answer arrives');
    has(s, 'if (!_docBusy) return;', 'and a late answer after the watchdog fired is dropped, not re-reported');

    // Refusals come before any work.
    ok(s.indexOf('No client email on this job') < s.indexOf('docPdfBase64'),
      'a job with no client email is refused before a PDF is built');
    ok(s.indexOf('There is nothing to send') < s.indexOf('docPdfBase64'),
      'and so is a document with no content');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('a failed PDF still produces the email, and prescribes only what the error proves');
  {
    // A missing PDF is not a reason to abandon the send — the body carries the summary and
    // the person can attach a printed copy. Saying nothing is what produced three rounds
    // of "still no PDF" with nothing new in any of them.
    const s = noComments(fn('docSend'));
    has(s, 'WITHOUT the PDF', 'the notice says the attachment is not there');
    has(s, '_pdfFailAdviceText(pdfErrKind)', 'and prescribes by what the error actually proves');
    has(s, " The server said: ' + pdfErr", "in the server's own words");
    // ONE table of advice, two renderings — the strip escapes, so it cannot take markup.
    const ctx = sandbox({ fns: ['_pdfFailAdvice', '_pdfFailAdviceText'] });
    has(ctx._pdfFailAdviceText('stale'), 'New version', 'the plain form keeps the instruction');
    lacks(ctx._pdfFailAdviceText('stale'), '<', 'and carries no markup at all');
    lacks(ctx._pdfFailAdviceText('crash'), 'New version', 'a crash still prescribes no redeploy');
    ['', 'crash', 'stale', undefined].forEach((k) =>
      ok(ctx._pdfFailAdviceText(k).length > 0, 'every branch says something: ' + JSON.stringify(k)));

    // ⚠ A GMAIL FAILURE FALLS BACK RATHER THAN STOPPING. A compose window that opens beats
    // a button that reports an error — and it says the attachment is missing, because
    // RFC 6068 cannot carry one.
    has(s, "if (provider === 'gmail')", 'a failed Gmail draft falls back');
    has(s, 'it carries NO attachment', 'and the notice says so rather than letting the body claim one');
    has(s, "_docNotice('err'", 'while a failed fallback is reported as an error');

    // ⚠⚠ WHETHER AN ATTACHMENT IS POSSIBLE IS A PROPERTY OF THE PROVIDER, NEVER OF
    // WHETHER THE PDF BUILT — and this was wrong in the first cut, found by driving the
    // real fallback in a browser rather than by any assertion here. The PDF converted
    // perfectly, so the notice took the "with the PDF attached" branch over a `mailto:`
    // that cannot carry one. That is the exact claim the invoice's old mailto: made for
    // months: "Please find attached your invoice", with nothing attached.
    const prov2 = decl('DOC_SEND_PROVIDERS');
    has(prov2, 'carriesAttachment: true', 'Gmail can carry one');
    has(prov2, 'carriesAttachment: false', 'and a mailto: cannot');
    has(s, 'var attached = DOC_SEND_PROVIDERS[provider].carriesAttachment && !!pdf;',
      'so the sentence needs BOTH a provider that can and a PDF that built');
    has(s, 'a plain email carries NO attachment, so attach a printed copy before sending',
      'and the fallback says to attach a printed copy');
    // ⚠ AND THE RECORD AGREES WITH THE SENTENCE. `pdfOk` is what a later reader trusts
    // about whether the client got the document; keying it on `pdf` alone would record a
    // mailto send as having carried one.
    has(s, 'pdfOk: attached', 'the record stores what actually went, not what was built');
    ok(s.indexOf('var attached =') < s.indexOf('pdfOk: attached'),
      'computed before it is recorded');
    has(s, "_docNotice(attached ? 'ok' : 'warn'", 'and a send with no attachment reads as a warning, not a success');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the invoice finally has a real email — and it is a cover note, not the document');
  {
    // ⚠ REBUILDING THE INVOICE INLINE WOULD BE THE SECOND-RENDERER DRIFT THIS FILE RECORDS
    // OVER AND OVER. Mail clients strip <style> and do not support CSS custom properties,
    // so the rendered invoice arrives as unstyled text; the complete document is the
    // attached PDF, from the same conversion that writes the Drive copy.
    const ctx = sandbox({
      fns: ['invoiceEmailSubject', 'buildInvoiceEmailText', 'buildInvoiceEmailHtml',
            '_emHtml', '_emMoney', '_emPhoneLines', 'conciergePhones', 'conciergePhonesText'],
      vars: ['EMAIL_BRAND', 'DOC_STAGE_WORD', 'HAVELLIN_OFFICE_PHONE', 'NON_MOBILE_NUMBERS'],
      stubs: {
        assignedTCContact: () => ({ name: 'Ashley Graziano', phone: '(978) 857-5374', email: 'ashley@havellinpalmbeach.com' }),
        bestClientGreetingName: () => 'Mrs Butler',
        svcLabelOf: () => 'Estate Settlement',
      },
    });
    const job = { id: 1, name: 'Butler', addr: '1789 S Ocean Blvd, Palm Beach FL', hvlId: 'HVL-0007' };

    ['deposit', 'midpoint', 'final'].forEach((stage) => {
      const word = { deposit: 'Deposit', midpoint: 'Midpoint', final: 'Final' }[stage];
      has(ctx.invoiceEmailSubject(job, stage), word + ' Invoice', stage + ': the subject says which invoice');
      has(ctx.invoiceEmailSubject(job, stage), '1789 S Ocean Blvd', stage + ': and which property');
      const html = ctx.buildInvoiceEmailHtml(job, stage, 12050);
      has(html, word + ' Invoice', stage + ': the HTML names the stage');
      has(html, '$12,050', stage + ': and the balance');
      has(html, 'attached as a PDF', stage + ': pointing at the attachment for the detail');
      const text = ctx.buildInvoiceEmailText(job, stage, 12050);
      has(text, word.toLowerCase() + ' invoice', stage + ': the plain part says it too');
      has(text, '$12,050', stage + ': with the same number');
      // ⚠ NO SIGNATURE (2026-09-11) — Gmail appends the sender's own, so this one does not.
      lacks(text, 'Warm regards', stage + ': and signs off nothing');
      lacks(text, 'Office (561) 652-5522', stage + ': nor prints a phone block Gmail is about to duplicate');
    });

    // ⚠ A ZERO OR UNKNOWN BALANCE MUST NOT PRINT "$0". A final invoice can legitimately be
    // a credit, and "Balance due: $0" on a job that overcollected is simply wrong.
    const noAmt = ctx.buildInvoiceEmailText(job, 'final', 0);
    has(noAmt, 'see attached', 'no figure means the email points at the document rather than asserting one');
    lacks(ctx.buildInvoiceEmailHtml(job, 'final', 0), 'Balance due', 'and the HTML drops the balance box entirely');

    // An unknown stage must not print "undefined Invoice" on a client's screen.
    has(ctx.invoiceEmailSubject(job, 'wat'), 'Final Invoice', 'an unrecognised stage reads as Final, never undefined');
    has(ctx.invoiceEmailSubject({ name: 'Butler' }, 'final'), 'Butler', 'a job with no address falls back to the name');
    has(ctx.invoiceEmailSubject({}, 'final'), 'your property', 'and a job with neither still reads as English');

    // The cover note must not try to be the document.
    const html = ctx.buildInvoiceEmailHtml(job, 'final', 12050);
    lacks(html, 'var(--', 'no custom properties — mail clients do not support them');
    lacks(html, '<style', 'and no stylesheet, which they strip');
    has(html, 'role="presentation"', 'tables, because that is what email HTML is');
    has(html, 'max-width:600px', 'and a fluid width, so it does not overflow a phone');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('every document is CC\'d to the department that owns it');
  {
    // The estimate always CC'd estimates@ and invoices CC billing@; the AGREEMENT never
    // did, which was a defect — that CC is the firm's own record of what went out.
    ['estimates', 'agreements', 'billing'].forEach((d) =>
      has(src, `cc: function () { return DEPT_EMAILS.${d}; },`, `${d}@ is CC'd on its own document`));
    has(src, 'to: spec.to, cc: spec.cfg.cc(),', 'and the one send path reads it from the registry');
    // Which means the count is three — one per kind, no more and no fewer.
    eq((decl('DOC_ACTIONS').match(/cc: function \(\)/g) || []).length, 3, 'one CC rule per document kind');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ the Documents card and the rail cannot disagree, because there is one of them');
  {
    // ⚠ THEY DID DISAGREE, VISIBLY, EIGHT INCHES APART ON THE SAME SCREEN. The card kept
    // its OWN copy of every "has this gone out" rule — `estimateSentDate`, `agrSigned`,
    // `depositReceived` — while the rail above reads `docState`. So a deposit invoice
    // drafted and waiting read "Drafted — read it, send it, then confirm" on the timeline
    // and **Send now** in the card. Found in a screenshot, not by any assertion here.
    const rc = noComments(src.slice(src.indexOf('function renderClientDashboard(jobId)'),
                                    src.indexOf('\nfunction ', src.indexOf('function renderClientDashboard(jobId)') + 10)));
    lacks(rc, "docType:'estimate'", 'the card no longer states the estimate’s status itself');
    lacks(rc, "docType:'agreement'", 'nor the agreement’s');
    lacks(rc, "First Invoice — Deposit (50%)", 'nor any of the three invoices’');
    lacks(rc, 'Send now', 'so the contradicting status chip is gone');

    // ⚠ AND ITS BUTTONS WENT BACK TO THE TABS, which is the thing this rebuild removes.
    // `docPdf` navigated to another panel and fired a print 200ms later — timing, not a
    // gate, so a slow render printed the previous client's document.
    lacks(src, 'function docPdf(', 'docPdf is deleted');
    lacks(src, 'function docEmail(', 'and docEmail with it');
    eq((src.match(/[^\w$.]docPdf\s*\(/g) || []).length, 0, 'nothing calls docPdf');
    eq((src.match(/[^\w$.]docEmail\s*\(/g) || []).length, 0, 'nothing calls docEmail');
    // ⚠ THE INVOICE ROW PASSED NO STAGE AT ALL (`docType:'invoice'`), so its PDF printed
    // whichever stage `currentInvStage` happened to hold — and its email INVENTED the
    // balance: `hav * 0.75` hardcoded, ignoring change orders, the rush premium and every
    // recorded payment. That number went to clients.
    lacks(src, 'var paid = Math.round(hav * 0.75);', 'and the invented 75%-paid balance is gone');

    // Change Orders stay, because the rail does not carry them.
    has(rc, "openChangeOrder(", 'raising a change order is still offered');
    has(rc, "sectionHdr('Change Orders')", 'under its own heading now');
    // ⚠ `renderInvoice` filters on `co.clientApproved`, so an unaccepted change order is
    // never billed — which is worth saying where they are raised.
    has(rc, 'an unaccepted change order is never billed', 'and the card says what acceptance means');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ NOTHING CALLS A HELPER THIS SLICE DELETED — the tripwire for the next sweep');
  {
    // ⚠ THIS EXISTS BECAUSE THE SUITE WAS GREEN THROUGH A LIVE ReferenceError.
    // Slice 4 deleted `_setAgrEmailBusy` with the second send path, and `updateAgrUI`
    // still called it — so opening the agreement tab, or ANY path that primes it
    // (`ensureAgreementApproved` → `_primeAgreementFor` → `loadAgreement`), threw. Every
    // one of the 2872 checks passed anyway: the harness drives extracted functions and
    // reads source text, and neither notices a call to a name that no longer exists.
    // Found by a browser, which is the third time this file records that lesson.
    //
    // ⚠ A CONSOLIDATION IS EXACTLY WHEN THIS BITES. Deleting a duplicate path is the
    // right move and it leaves callers behind; `git diff --stat` says "-90 lines" and
    // looks like a tidy-up. So the check is general rather than a list of today's names:
    // every `_private(` call in the file must resolve to something the file defines.
    // Private helpers are the class that gets removed in a sweep, which is what makes
    // that the useful net.
    const defs = new Set();
    for (const m of src.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)) defs.add(m[1]);
    for (const m of src.matchAll(/(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*function/g)) defs.add(m[1]);
    for (const m of src.matchAll(/([A-Za-z_$][\w$]*)\s*:\s*function/g)) defs.add(m[1]);
    const orphans = new Map();
    for (const m of src.matchAll(/(^|[^\w$.'"])(_[A-Za-z][\w$]*)\s*\(/g)) {
      if (!defs.has(m[2])) orphans.set(m[2], (orphans.get(m[2]) || 0) + 1);
    }
    eq([...orphans.keys()].sort().join(', '), '',
      'every _private( call in the file resolves to a definition in the file');

    // ⚠⚠ AND THE SAME DEFECT IN MARKUP, WHICH BIT AGAIN IN SLICE 7. Deleting the dead
    // Payment Method card left three writes behind —
    // `getElementById('agr-deposit-amt').textContent = …` and two more — on elements that
    // no longer existed. That is a TypeError inside `updateAgrUI`, i.e. the agreement panel
    // throwing on every render, and **the suite was green through it**: the harness drives
    // extracted functions and reads source text, and neither notices a DOM id that stopped
    // existing. Found by grepping the diff, not by a test. Now it is a test.
    //
    // ⚠ THE CHECK IS NARROW ON PURPOSE — unguarded CHAINED access only. `var el =
    // getElementById(x); if (!el) return;` is safe whether the element exists or not, and
    // flagging it would bury the real ones in noise. What throws is
    // `getElementById('gone').something`.
    const domIds = new Set();
    for (const m of src.matchAll(/\bid=["']([A-Za-z][\w:-]*)["']/g)) domIds.add(m[1]);
    for (const m of src.matchAll(/\.id\s*=\s*'([^']+)'/g)) domIds.add(m[1]);   // built at runtime
    // The Edit Client modal is assembled by `showEditClient` through a prefixing helper, so
    // its ids never appear literally anywhere; `i-executor-auth` is ternary-guarded on its
    // own line. Both are reachable and real — everything else must be in the markup.
    const ALLOW = [/^ec-/, /^i-executor-auth$/];
    const orphanIds = new Set();
    for (const m of src.matchAll(/getElementById\(\s*'([^']+)'\s*\)\s*\./g)) {
      const id = m[1];
      if (domIds.has(id) || ALLOW.some((r) => r.test(id))) continue;
      const line = src.slice(src.lastIndexOf('\n', m.index) + 1, src.indexOf('\n', m.index));
      if (line.includes("getElementById('" + id + "') ?")) continue;
      orphanIds.add(id);
    }
    eq([...orphanIds].sort().join(', '), '',
      'every unguarded getElementById(...).x names an element the page actually has');

    // ⚠⚠ AND A THIRD SHAPE THE TWO ABOVE COULD NOT SEE, which cost a roster row on
    // 2026-09-11: a LIST of ids swept into `getElementById(<variable>)`.
    // `showAddContractor` did `['c-name','c-phone',…].forEach(function(id){
    // document.getElementById(id).value=''; })` and `c-name` has never existed — the form is
    // `c-firstname` + `c-lastname`. The id is a variable at the call site, so neither the
    // literal-chain check above nor any grep for `getElementById('c-name')` matches it.
    //
    // ⚠ AND THE COST WAS NOT THE UNRESET FIELD. The throw landed on the FIRST id, so every
    // line below it was skipped — including `card.dataset.editId = ''`. Pressing
    // "+ Add Contractor" after editing somebody left the edit target pointing at them, and
    // the next save overwrote that person with the new one's details. A name is this app's
    // only person key, and `saveContractors()` pushes the roster to the sheet, so it
    // propagated to the other device.
    const sweepOrphans = new Set();
    // ⚠ THE SEARCH IS INVERTED — find the variable-id lookup, then look BACK for the list.
    // Matching the array first needs a nested quantifier over quoted strings, and on a 1.7MB
    // source that backtracks until the run times out. It did, once, writing this.
    // Unguarded chained access only, the same rule the literal check above states: a swept
    // `var el = getElementById(id); if (el) …` is safe whether the element exists or not.
    // What destroyed a roster row was `getElementById(id).value = ''` with nothing in front.
    for (const m of src.matchAll(/getElementById\(\s*([A-Za-z_$][\w$]*)\s*\)\s*\./g)) {
      const before = src.slice(Math.max(0, m.index - 400), m.index);
      const arr = before.lastIndexOf('[');
      if (arr < 0) continue;
      const close = before.indexOf(']', arr);
      if (close < 0) continue;
      const body = before.slice(arr + 1, close);
      if (body.indexOf("'") < 0 || !/^[\s'",\w:.-]*$/.test(body)) continue;   // literals only
      for (const lit of body.matchAll(/'([^']+)'/g)) {
        const id = lit[1];
        if (domIds.has(id) || ALLOW.some((r) => r.test(id))) continue;
        sweepOrphans.add(id);
      }
    }
    eq([...sweepOrphans].sort().join(', '), '',
      '\u26a0 every id swept through getElementById(<var>) names a real element too');

    // And the names this slice actually removed, stated outright — so a later pass that
    // reintroduces one of these duplicate paths has to argue with a test rather than a
    // comment. Each was a SECOND copy of something that now exists once.
    [['estimatePdfBase64', 'docPdfBase64'],
     ['signingPacketPdfBase64', 'docPdfBase64'],
     ['_estimateEmailFallback', 'DOC_SEND_PROVIDERS.mailto'],
     ['_agreementEmailFallback', 'DOC_SEND_PROVIDERS.mailto'],
     ['_showDraftLink', 'docSend\u2019s notice plus _jtDraftLink'],
     ['_setEstEmailBusy', '_docBusy'],
     ['_setAgrEmailBusy', '_docBusy']].forEach(([gone, now]) => {
      lacks(src, 'function ' + gone + '(', gone + ' is deleted — ' + now + ' does that job now');
      eq((src.match(new RegExp('[^\\w$.]' + gone + '\\s*\\(', 'g')) || []).length, 0,
        'and nothing calls ' + gone);
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the drilldown is where a send reports, because that is where the button is');
  {
    // ⚠ The tab strips (`ce-fb`, `agr-fb`) live inside panels the drilldown hides, so a
    // refusal fired from the rail landed in the DOM and was seen by nobody — which is
    // exactly what makes a button look dead.
    const n = noComments(fn('_docNotice'));
    has(n, "document.getElementById('dash-fb')", 'it prefers the drilldown strip');
    has(n, 'dashNotice(type, msg)', 'through the notice that survives the redraw');
    has(n, 'alert(msg)', 'and falls back to an alert when the drilldown is not open');
    eq((noComments(fn('docSend')).match(/showFB\(/g) || []).length, 0,
      'nothing in the send path writes to a tab strip');
  }
};
