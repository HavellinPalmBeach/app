'use strict';
// The estimate's save / file / email path (2026-09-08). Four separate reports from Anthony
// walking a dummy client through it, and every one of them was a real defect:
//
//   1. "i don't know why the save button can't just automatically push a PDF into Google
//      Drive the way we do for an agreement." It already did both — but the INTERNAL
//      worksheet and the CLIENT document were writing the same filename into the same
//      folder, so which one the client folder ended up holding was a race.
//   2. "it looks like an agreement gets pushed into Google Drive before an estimate is even
//      approved … there was an agreement in the client file before we even solidified the
//      estimate." Agreement approval had no client-acceptance gate, and editing the
//      estimate un-approved the estimate but not the agreement.
//   3. "the terms and conditions for a home prep job need to change … there are no hours."
//      Right: prep bills none, and the Terms promised hourly billing and a 15% hours
//      overrun trigger that could never fire.
//   4. "the estimate naming should make more sense for the client."
//
// Plus the HTML email, which could not be done with mailto: at all.

const { fn, decl, source, sandbox } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ── 1. THE TWO DRIVE FILES ─────────────────────────────────────────────────
  group('the internal worksheet and the client estimate no longer share a filename');
  {
    const names = fn('estimateDocNames');
    const internal = fn('exportEstimateToDrive');
    const client = fn('saveFolderEstimate');

    has(internal, 'estimateDocNames(job).driveInternal', 'the worksheet asks for the internal name');
    has(client, 'estimateDocNames(job).driveClient', 'the client copy asks for the client name');

    // The bug in its exact original shape: both built the name inline and identically.
    const collide = (src.match(/\(job\.hvlId\|\|'EST'\)\+'_Estimate\.html'/g) || []).length;
    eq(collide, 0, "no `(job.hvlId||'EST')+'_Estimate.html'` literal survives at either site");

    const ctx = sandbox({ fns: ['estimateDocNames'] });
    const n = ctx.estimateDocNames({ hvlId: 'HVL-0007', addr: '1234 Ocean Blvd, Palm Beach, FL' });
    ok(n.driveInternal !== n.driveClient, 'the two Drive names differ');
    has(n.driveInternal, 'INTERNAL', 'and the worksheet says so in its filename');
    ok(!/INTERNAL/.test(n.driveClient), 'while the client copy does not');
    // Drive overwrites by filename, so a dated Drive name would accumulate a new file on
    // every re-file instead of replacing the current one.
    ok(!/\d{4}/.test(n.driveClient.replace(/HVL-\d+/, '')), 'the Drive name carries no date, so a re-file overwrites');
  }

  group('the internal worksheet says on its face that it is not a client document');
  {
    const internal = fn('exportEstimateToDrive');
    has(internal, 'Internal worksheet — not a client document', 'the document is labelled');
    has(internal, 'Estimate Worksheet — ', 'and its heading no longer reads as the client estimate');
  }

  // ── 2. CLIENT-FACING NAMING ────────────────────────────────────────────────
  group('the client-facing name says what the document is, not which record it came from');
  {
    const ctx = sandbox({ fns: ['estimateDocNames'] });
    const n = ctx.estimateDocNames({ hvlId: 'HVL-0007', addr: '1234 Ocean Blvd, Palm Beach, FL 33480' });
    has(n.client, 'Havellin Service Estimate', 'it names the document');
    has(n.client, '1234 Ocean Blvd', 'and the property');
    ok(/\d{4}$/.test(n.client), 'and ends in the year, so a client filing two versions can tell them apart');
    eq(n.attachment, n.client + '.pdf', 'the email attachment is the same name');
    ok(!/,/.test(n.client), 'no comma in the filename');

    // The old name was the surname and the job id, which reads as a database key.
    // Slice 3: printing goes through the one document action, which owns the naming via
    // `docNames` — the generalisation of `estimateDocNames` that covers all five
    // documents. The three names still cannot drift, because they come from one function.
    const print = fn('printClientEstimate');
    has(print, "docAction(currentEstimate.jobId, 'estimate', 'print')",
      'the printed PDF goes through the one document action');
    has(fn('docNames'), 'Havellin Service Estimate', 'which names it for the client');
    has(fn('docNames'), 'printTitle: client', 'and hands that name to the print path as the PDF filename');
    lacks(print, "clientName.split(' ').pop()", 'the surname-and-id filename is gone');

    // A job with no address must still produce something sane.
    const bare = ctx.estimateDocNames({});
    has(bare.client, 'Havellin Service Estimate', 'and it degrades to the document name alone');
    ok(bare.client.indexOf(' -  - ') === -1, 'with no empty slot left where the address would be');
    ok(bare.driveInternal.indexOf('HVL') === 0, 'with an HVL fallback on the Drive names');
  }

  // ── 3. HOME PREP: NO HOURS, SO NO HOURLY TERMS ─────────────────────────────
  group('estimateIsFeeOnly is the same test the invoice already used');
  {
    const ctx = sandbox({ fns: ['estimateIsFeeOnly'] });
    const f = ctx.estimateIsFeeOnly;
    eq(f({ svc: 'prep' }), true, 'standalone Home Prep is fee-only');
    eq(f({ svc: 'cleanout', totTC: 40, totPS: 120 }), false, 'an estate job is not');
    eq(f({ svc: 'downsizing', totTC: 0, totPS: 0 }), true, 'nor is an estimate that priced no hours at all, whatever its service');
    eq(f(null, { svc: 'prep' }), true, 'the job answers when there is no estimate yet');
    eq(f({ svc: 'probate', totTC: 10, totPS: 0 }), false, 'concierge hours alone still count as hours');

    // The invoice's copy of the rule, so a future edit to one shows up against the other.
    const invoice = fn('invoiceHtml');
    has(invoice, "=== 'prep')", 'the invoice still keys fee-only off the same service');
    has(invoice, '(est.totTC || 0) + (est.totPS || 0)) === 0', 'and the same zero-hours arm');
  }

  group('a prep estimate no longer promises hours it can never bill');
  {
    const ce = fn('clientEstimateHtml');
    has(ce, 'var _isFeeOnlyEst = estimateIsFeeOnly(e, job);', 'the document computes it once');

    has(ce, '30% management fee on actual vendor spend', 'prep states the fee it actually charges');
    has(ce, 'It is not billed hourly.', 'and says plainly that it is not hourly');
    has(ce, 'it is re-quoted and agreed with you in writing', 'scope changes are a re-quote, not an hours change order');

    // The hourly claims must be unreachable on a fee-only job. Slice the Terms fee-only arm
    // EXACTLY — from its first <li> to where the hourly arm begins. Anchoring on the first
    // `_isFeeOnlyEst` instead picks up the payment-schedule ternary above it and the comment
    // block between them, and that comment quotes all three phrases while explaining why
    // they are wrong here. A test that reads its own rationale as evidence proves nothing.
    const armStart = ce.indexOf("'<li>Havellin\\'s fee for this project is a <strong>30% management fee");
    const armEnd = ce.indexOf(': (e.fixedPrice', armStart);
    ok(armStart > -1 && armEnd > armStart, 'the fee-only Terms arm is locatable');
    const branch = ce.slice(armStart, armEnd);
    lacks(branch, 'actual hours worked', 'the fee-only arm never mentions actual hours worked');
    lacks(branch, 'exceed the estimate by more than 15%', 'nor the 15% hours trigger');
    lacks(branch, 'materials handling fee', 'nor the 25% moving-materials fee');

    // And the hourly arm keeps all three, for the jobs where they are true.
    has(ce, 'Final charges reflect actual hours worked.', 'an hourly job still says so');
    has(ce, 'exceed the estimate by more than 15%', 'and still carries the notify threshold');
  }

  group('and its payment schedule has milestones that exist on the engagement');
  {
    const ce = fn('clientEstimateHtml');
    has(ce, 'Due once the vendor schedule is booked', 'prep bills against the booking, not a project midpoint');
    has(ce, 'Due at show-ready handover', 'and against handover');
    has(ce, 'Management fee only', 'labelled as the fee rather than "Havellin services"');
    // The hourly schedule survives untouched for everything else.
    has(ce, 'Due at project midpoint', 'an hourly job still bills at the midpoint');
  }

  // ── 4. THE AGREEMENT GATE ──────────────────────────────────────────────────
  group("agreement approval waits for the client's yes, not just for our own");
  {
    const blocker = fn('agrApprovalBlocker');
    const ctx = sandbox({ fns: ['agrApprovalBlocker', 'isJobWon'] });
    ctx.jobs.length = 0;
    ctx.jobs.push({ id: 1, status: 'approved' });          // estimate approved, not won
    ctx.jobs.push({ id: 2, status: 'won', won: true });
    ctx.jobs.push({ id: 3, status: 'new' });
    ctx.estimateStore[1] = { approved: true };
    ctx.estimateStore[2] = { approved: true };
    ctx.estimateStore[3] = { approved: false };

    eq(ctx.agrApprovalBlocker(3), 'estimate', 'an unapproved estimate blocks first');
    eq(ctx.agrApprovalBlocker(1), 'notwon', 'an approved estimate the client has not accepted still blocks');
    eq(ctx.agrApprovalBlocker(2), '', 'a won job clears');
    eq(ctx.agrApprovalBlocker(999), 'nojob', 'and an unknown job is refused rather than cleared');

    has(blocker, 'isJobWon(job)', 'the gate reads the same predicate the rest of the app does');

    // ⚠ THE AGREEMENT'S MANAGER PIN IS GONE (2026-09-10) — it reviewed nothing. The
    // commercial terms ARE the approved estimate, attached as Exhibit A, and the document
    // has no free-text field a manager could read differently; both facts needing a human
    // were already captured by a named person (the pricing PIN and the client's recorded
    // acceptance). What must NOT go with it is the GATE, which is the same two conditions.
    const ready = fn('agreementReady');
    has(ready, 'isJobWon(job)', 'readiness still requires the client to have accepted');
    has(ready, 'rec.approved', 'and the estimate to have been approved');
    const ensure = fn('ensureAgreementApproved');
    has(ensure, 'agreementReady(job, null)', 'and every action stamps through that one gate');
    has(ensure, "if (blk) return blk", 'refusing rather than stamping when it is not met');
    // ⚠ It files two documents into a client's Drive folder off whatever the agreement
    // panel currently holds, so it must guarantee the panel is on THIS job.
    has(ensure, '_primeAgreementFor(jobId)', 'it primes the agreement panel before filing');
    has(ensure, "return 'nojob'", 'and refuses if it cannot');
    lacks(src, 'function checkAgrPin(', 'the PIN function is deleted, not left dead');
    lacks(src, 'agr-pin-modal', 'and its modal markup with it');
  }

  group('editing the estimate revokes the agreement it is Exhibit A to');
  {
    const edit = fn('editEstimateFromCE');
    has(edit, 'edJob.agrApproved = false', 'approval is withdrawn');
    has(edit, "edJob.agrRevokedBy = 'estimate-edited'", 'and why is recorded on the job');
    has(edit, 'syncJobToSheets(edJob)', 'and it reaches the sheet, so the other device agrees');
    has(edit, 'if (currentAgrJobId === edJob.id)', 'the live globals are cleared when the tab is showing that job');
    has(edit, 'Agreement approval revoked', 'and the person is told, rather than finding out later');
    // The estimate's own Drive stamp was already cleared here; that must not regress.
    has(edit, 'delete edJob.estimateDriveAt', "the estimate's Drive stamp still clears too");
  }

  group('re-approving after a revoke re-files, rather than leaving the stale copy in Drive');
  {
    const agr = fn('exportAgreementToDrive');
    const packet = fn('exportSigningPacketToDrive');
    // The old guard was a bare boolean, so a second approval in the same browser session
    // was suppressed — which is exactly the approval that carries the correction.
    lacks(agr, 'if (_agrExported[jobId]) return;', 'the bare session guard is gone from the agreement');
    lacks(packet, 'if (_packetExported[jobId]) return;', 'and from the packet');
    has(agr, '_agrExported[jobId] === _agrExportKey(job)', 'both key on the approval stamp');
    has(packet, '_packetExported[jobId] === _agrExportKey(job)', 'so a NEW approval re-files and a redraw does not');

    const ctx = sandbox({ fns: ['_agrExportKey'] });
    const k1 = ctx._agrExportKey({ agrApprovedAt: 'September 8, 2026', agrApprovedBy: 'Anthony' });
    const k2 = ctx._agrExportKey({ agrApprovedAt: 'September 9, 2026', agrApprovedBy: 'Anthony' });
    const k3 = ctx._agrExportKey({ agrApprovedAt: 'September 8, 2026', agrApprovedBy: 'Ashley' });
    ok(k1 !== k2, 'a later approval is a different key');
    ok(k1 !== k3, 'so is a different approver');
    eq(ctx._agrExportKey({ agrApprovedAt: 'September 8, 2026', agrApprovedBy: 'Anthony' }), k1, 'and the same approval is the same key');
  }

  group('the Agreement tab explains which of the two gates is holding it');
  {
    const ui = fn('updateAgrUI');
    has(ui, 'agrApprovalBlocker(currentAgrJobId)', 'the buttons read the shared gate');
    has(ui, 'Awaiting Client Acceptance', 'an unaccepted job gets its own badge');
    has(ui, "agrRevokedBy === 'estimate-edited'", 'a revoked approval reads differently from one never given');
    has(ui, 'has not been filed anywhere', 'and the draft on screen is described as a preview');
    lacks(ui, '} else if (!estApproved) {', 'the single estimate-only refusal is gone');
  }

  // ── 5. THE HTML EMAIL ──────────────────────────────────────────────────────
  group('the email body is email-safe HTML: no classes, no CSS variables');
  {
    const body = fn('buildEstimateEmailHtml');
    // Mail clients strip <style> and do not support custom properties at all. Every colour
    // here has to be a literal, which is what EMAIL_BRAND exists for.
    lacks(body, 'var(--', 'no CSS custom properties, which no mail client resolves');
    lacks(body, 'class="ce-', 'and no app stylesheet classes');
    has(body, 'role="presentation"', 'layout is tables, marked presentational for screen readers');
    has(body, 'EMAIL_BRAND', 'colours come from the resolved brand literals');
    has(decl('EMAIL_BRAND'), "bronze:'#A67C45'", 'which are the real brand values');
  }

  group('it states the same numbers as the document, from the same fields');
  {
    const ctx = sandbox({
      fns: ['buildEstimateEmailHtml', 'buildEstimateEmailText', 'estimateEmailSubject',
            'estimateIsFeeOnly', '_emHtml', '_emMoney', '_emPhoneLines', 'conciergePhones', 'conciergePhonesText',
            // Both emails state the vendor-fee rule through the one shared sentence (2026-09-10).
            'vendorFeeNote', 'prepFeeRate'],
      vars: ['EMAIL_BRAND', 'HAVELLIN_OFFICE_PHONE', 'NON_MOBILE_NUMBERS', 'PREP_FEE_RATE'],
      stubs: {
        assignedTCContact: () => ({ name: 'Ashley Graziano', phone: '(561) 370-4700', email: 'ashley@havellinpalmbeach.com' }),
        bestClientGreetingName: () => 'Margaret',
        svcLabelOf: () => 'Estate Settlement',
        _cePhases: () => ([{ title: 'Mobilization &amp; Access' }, { title: 'Sorting, Documentation &amp; Inventory' }]),
      },
    });
    const job = { id: 1, name: 'Margaret Ellsworth', addr: '1234 Ocean Blvd, Palm Beach, FL', hvlId: 'HVL-0007', svc: 'cleanout' };
    const est = { svc: 'cleanout', havellinTotal: 18650, vendorCost: 4200, grandTotal: 22850, totTC: 40, totPS: 120, rooms: [] };
    const html = ctx.buildEstimateEmailHtml(est, job);

    has(html, '$18,650', 'the Havellin total');
    has(html, '$4,200', 'the vendor estimate');
    has(html, '$22,850', 'and the grand total');
    has(html, 'Total Estimated Project Cost', 'under the same label the document uses');
    has(html, 'HVL-0007', 'the reference');
    has(html, '1234 Ocean Blvd', 'the property');
    has(html, 'Margaret', 'and it greets the person the email is actually going to');
    // ⚠ NOT SIGNED ANY MORE — Gmail appends the sender's own. The concierge is still
    // RESOLVED (the greeting, the subject and the PDF all depend on it); what is gone is
    // this email printing a second signature under the one Gmail is about to add.
    lacks(html, 'Warm regards', 'and carries no signature of its own');
    lacks(html, 'Office (561) 652-5522', 'nor a phone block under it');
    has(html, 'Havellin adds no markup', 'the at-cost rule appears where vendors do');
    // ⚠ NOT double-escaped. _cePhases writes HTML literals that already carry entities, so
    // running them through _emHtml again printed a literal "&amp;" to the client.
    has(html, 'Sorting, Documentation &amp; Inventory', 'the stages are named');
    lacks(html, '&amp;amp;', 'and not escaped a second time');

    // ⚠ THE CONTRACT THAT MAKES THE LINE ABOVE SAFE: every _cePhases title is an HTML
    // fragment with its entities already written in. The email passes them through raw, so a
    // title added later with a BARE "&" would ship unescaped. Assert the contract at source
    // rather than normalising at runtime — one rule, checked, beats two encodings guessing.
    const phaseSrc = fn('_cePhases');
    const titles = (phaseSrc.match(/title:\s*'([^']*)'/g) || []).map(s => s.replace(/^title:\s*'/, '').replace(/'$/, ''));
    ok(titles.length > 5, 'the phase titles are locatable (' + titles.length + ' found)');
    const bare = titles.filter(x => /&(?!(amp|lt|gt|quot|#\d+|nbsp|mdash|ndash|rsquo|hellip);)/.test(x));
    eq(bare, [], 'every phase title is already entity-escaped, so passing it through raw is safe');
    has(html, 'hours actually worked and logged', 'and an hourly job says so');

    // Fee-only: the email must not promise hours either.
    const prep = { svc: 'prep', havellinTotal: 9000, prepEnabled: true, prepCost: 30000, grandTotal: 39000, totTC: 0, totPS: 0, rooms: [] };
    const phtml = ctx.buildEstimateEmailHtml(prep, { ...job, svc: 'prep' });
    has(phtml, 'Havellin Management Fee', 'a prep email names the fee');
    has(phtml, '30% of what the vendors actually invoice', 'and states the basis');
    lacks(phtml, 'hours actually worked', 'and never mentions hours');

    // A fixed-price job says the third thing.
    const fx = ctx.buildEstimateEmailHtml({ ...est, fixedPrice: true }, job);
    has(fx, 'Fixed Project Fee', 'a fixed-price email names the fee that way');
    has(fx, 'does not move with the hours worked', 'and states the risk transfer');
    lacks(fx, 'exceeding this estimate by more than 15%', 'without the hourly threshold');

    // Excluded rooms — invisible in a price, so stated.
    const excl = ctx.buildEstimateEmailHtml({ ...est, rooms: [{ name: 'Wine Cellar', excluded: true }] }, job);
    has(excl, 'Wine Cellar', 'excluded spaces are named');
    has(excl, 'is excluded and no work in', 'and described as unpriced');

    // A phase list that throws must not take the email down with it.
    const ctx2 = sandbox({
      fns: ['buildEstimateEmailHtml', 'estimateIsFeeOnly', '_emHtml', '_emMoney', '_emPhoneLines', 'conciergePhones', 'conciergePhonesText',
            'vendorFeeNote', 'prepFeeRate'],
      vars: ['EMAIL_BRAND', 'HAVELLIN_OFFICE_PHONE', 'NON_MOBILE_NUMBERS', 'PREP_FEE_RATE'],
      stubs: {
        assignedTCContact: () => ({ name: 'A', phone: 'p', email: 'e' }),
        bestClientGreetingName: () => 'X', svcLabelOf: () => 'S',
        _cePhases: () => { throw new Error('boom'); },
      },
    });
    const survived = ctx2.buildEstimateEmailHtml(est, job);
    has(survived, '$22,850', 'the email still renders when the phase derivation fails');

    // Subject and the plain-text alternative.
    eq(ctx.estimateEmailSubject(job), 'Havellin Palm Beach — Service Estimate for 1234 Ocean Blvd', 'the subject names the property');
    const text = ctx.buildEstimateEmailText(est, job);
    has(text, '$22,850', 'the text part carries the total too');
    lacks(text, '<', 'and is genuinely plain');
  }

  group('the MIME message is a real multipart with the PDF attached');
  {
    const ctx = sandbox({ fns: ['buildMimeMessage', '_mimeHeader', '_b64Wrap'] });
    const mime = ctx.buildMimeMessage({
      to: 'client@example.com', cc: 'estimates@havellinpalmbeach.com',
      subject: 'Havellin Palm Beach — Service Estimate for 1234 Ocean Blvd',
      text: 'plain', html: '<b>rich</b>',
      pdfBase64: 'QQ'.repeat(200), pdfName: 'Havellin Service Estimate.pdf',
    });
    has(mime, 'To: client@example.com', 'addressed');
    has(mime, 'Cc: estimates@havellinpalmbeach.com', 'and CC\'d to the department inbox');
    has(mime, 'Content-Type: multipart/mixed', 'mixed on the outside, so the attachment sits beside the body');
    has(mime, 'Content-Type: multipart/alternative', 'alternative inside, so text and HTML are the same message');
    has(mime, 'Content-Type: text/plain; charset="UTF-8"', 'a text part');
    has(mime, 'Content-Type: text/html; charset="UTF-8"', 'an HTML part');
    has(mime, 'Content-Type: application/pdf', 'and the PDF');
    has(mime, 'Content-Disposition: attachment; filename="Havellin Service Estimate.pdf"', 'named for the client');
    has(mime, '=?UTF-8?B?', 'the subject is RFC 2047 encoded, so the em dash survives');
    // ⚠ THE ASSERTION THAT MATTERS, AND THE ONE THE FIRST VERSION LACKED. Checking that CRLF
    // is *present* passes on a message that is mostly CRLF with a few bare LFs hidden inside
    // a base64 body — which is exactly what shipped: the wrap used \n while the structure
    // used \r\n, and Gmail dropped the attachment. Anthony: "there is no attached PDF".
    let bareLF = 0;
    for (let i = 0; i < mime.length; i++) if (mime[i] === '\n' && mime[i - 1] !== '\r') bareLF++;
    eq(bareLF, 0, 'every line ending is CRLF, including inside the base64 parts');
    ok(mime.indexOf('\r\n') > -1, 'CRLF line endings, as the RFC requires');
    // Every boundary opened must be closed, or Gmail rejects the message.
    const mix = mime.match(/boundary="(MIX-[^"]+)"/)[1];
    const alt = mime.match(/boundary="(ALT-[^"]+)"/)[1];
    ok(mime.includes('--' + mix + '--'), 'the mixed boundary is closed');
    ok(mime.includes('--' + alt + '--'), 'and the alternative boundary is closed');
    // Attachment lines must be wrapped — a single 100KB line is not valid MIME.
    const longest = mime.split('\r\n').reduce((m, l) => Math.max(m, l.length), 0);
    ok(longest <= 998, 'no line exceeds the RFC 5322 limit (longest ' + longest + ')');

    // No attachment is still a valid message.
    const noPdf = ctx.buildMimeMessage({ to: 'a@b.c', subject: 's', text: 't', html: '<i>h</i>' });
    lacks(noPdf, 'application/pdf', 'a message with no PDF carries no attachment part');
    ok(noPdf.trim().endsWith('--'), 'and still closes its boundary');
  }

  group('a missing PDF says WHY, in the words the server used');
  {
    // Three rounds of "still no PDF" happened because the app answered "The PDF conversion
    // failed" — a sentence with no cause in it, so every report came back carrying nothing
    // new. The message assembly was verified sound with a spec-compliant MIME parser
    // (correct nesting, zero defects, attachment bytes round-tripping), which leaves only
    // one possibility: the PDF never arrived. The reason it never arrived is a string the
    // server sent, and the app was throwing it away.
    const src = source();

    // ⚠ SLICE 4 COLLAPSED `estimatePdfBase64` AND `signingPacketPdfBase64` INTO ONE, and
    // this group is the reason that mattered: the two differed only in a title and a
    // stylesheet while carrying the SAME eight-line error block verbatim — two copies of
    // the one rule that decides whether a "still no PDF" report contains anything new.
    // Now there is one, so "they must not drift" is no longer something to check.
    const body = fn('docPdfBase64');
    has(body, '_backendErrorKind(err', 'the failure is classified with the app\'s one classifier');
    lacks(body, "cb(null, (d && d.error) || 'The PDF conversion failed.');",
          'the bare no-cause callback is gone');
    lacks(src, 'function estimatePdfBase64(', 'the estimate keeps no private copy');
    lacks(src, 'function signingPacketPdfBase64(', 'nor the signing packet');
    // ⚠ AND THE OLD ONE SCRAPED THE TAB. `estimatePdfBase64` read `ce-page-content`'s
    // innerHTML, so the attachment was whatever the Client Estimate tab happened to be
    // showing — from the drilldown, which never opens that tab, the previous client's
    // estimate or nothing.
    lacks(body, 'getElementById', 'and it is built from the spec, never scraped off a panel');
    has(body, 'spec.cfg.label', 'titled from the registry, so each document names itself');
    has(body, 'spec.cfg.pdfCss', 'and carries its own print CSS — the packet paginates, the estimate does not');

    // ⚠ PROVENANCE. Only text the SERVER sent may diagnose the server — the same rule
    // _backendErrorKind was built for. A fetch that never landed must not read as a stale
    // deployment and send someone to redeploy a script that was never asked anything.
    has(body, 'clientError', 'a client-side failure is never blamed on the deployment');

    const ctx = sandbox({ fns: ['_pdfFailAdvice'] });
    // `stale` is the ONE case where "redeploy" is proof rather than a guess: the server
    // saying it has no dispatch line for htmlToPdf. A deployment predating it answers
    // "Unknown type: undefined", because doPost falls past every action test to data.type.
    has(ctx._pdfFailAdvice('stale'), 'New version', 'a stale deployment gets the exact redeploy step');
    has(ctx._pdfFailAdvice('stale'), 'saving alone does not update the live URL',
        'and the trap that makes a redeploy look done when it is not');
    lacks(ctx._pdfFailAdvice('crash'), 'New version', 'a crash prescribes no redeploy');
    lacks(ctx._pdfFailAdvice(''), 'New version', 'and neither does an unclassified failure');
    ['', 'crash', 'stale', undefined].forEach(function (k) {
      ok(ctx._pdfFailAdvice(k).length > 0, 'every branch says something actionable: ' + JSON.stringify(k));
    });

    // The classifier reads the real message a pre-htmlToPdf deployment sends.
    const kind = sandbox({ fns: ['_backendErrorKind'] });
    eq(kind._backendErrorKind('Unknown type: undefined', true), 'stale',
       'the answer from a deployment that predates htmlToPdf reads as stale');
    eq(kind._backendErrorKind('Unknown type: undefined', false), '',
       'but only when the server actually said it');
  }

  group('the draft link cannot dead-end, whatever accounts the browser holds');
  {
    // ⚠ THIS ASSERTION HAS BEEN WRONG TWICE AND IS NOW WRITTEN AGAINST THE REQUIREMENT.
    //
    // v1 asserted the address percent-encoded. Gmail: "Your account is not available".
    // v2 asserted the address with a literal '@'. Gmail: "Temporary Error (404) — your
    //    account is temporarily unavailable".
    // Both passed. Both described what the function returned rather than what had to be
    // true, so each one locked in the bug it was written beside. What actually has to be
    // true is that the URL RESOLVES — the browser's Google session is invisible from the
    // app, so any account identifier we put in the path is a guess, and a wrong guess is
    // an error page with nowhere to go.
    const ctx = sandbox({ fns: ['gmailDraftUrl'], vars: ['GMAIL_SCOPE'] });

    // Whatever we know or do not know about the mailbox, the URL is the same.
    ['', 'ashley@havellinpalmbeach.com', 'not an email', 'a@b/../evil', 'x@y@z'].forEach(function (who) {
      ctx._gmailUserEmail = who;
      const u = ctx.gmailDraftUrl('abc123');
      has(u, 'https://mail.google.com/mail/u/0/', 'always the account-0 path: ' + JSON.stringify(who));
      lacks(u, '@havellin', 'no address in the URL: ' + JSON.stringify(who));
      lacks(u, '%40', 'and nothing percent-encoded in its place: ' + JSON.stringify(who));
      has(u, '#drafts?compose=abc123', 'still deep-links to the draft: ' + JSON.stringify(who));
    });

    // The mailbox is named ON SCREEN instead — that is what replaces it, and dropping it
    // would leave someone whose account 0 is a personal Gmail with no idea where the
    // draft went.
    // ⚠ IT USED TO BE A NODE INSERTED BESIDE A TAB'S FEEDBACK STRIP (`_showDraftLink`),
    // and Slice 4 deleted that: the drilldown rewrites itself with innerHTML on every
    // redraw and every 15-second remote-status tick, so a sibling node beside `dash-fb`
    // is gone before it can be read. The mailbox is named in the notice at the moment the
    // draft is created, and the LINK rides the document record — so it survives every
    // redraw and is still there tomorrow.
    const sendBody = fn('docSend');
    has(sendBody, "'Draft created in ' + (_gmailUserEmail || 'your Havellin mailbox')",
      'the notice names the mailbox the draft was created in, with an honest fallback');
    lacks(src, 'function _showDraftLink(', 'the tab-strip version is gone');
    has(fn('docRecordSent'), 'st.draftUrl = res.draftUrl', 'the link is kept on the document record');
    const drafts = sandbox({ fns: ['_jtDraftLink', 'docKeyFor'] });
    const job = { id: 7, docState: { estimate: { draftedAt: 'x', draftUrl: 'https://mail.google.com/x' } } };
    eq(drafts._jtDraftLink(7, job, 'estimate', '').length, 1, 'and the rail offers it while the draft is outstanding');
    eq(drafts._jtDraftLink(7, job, 'estimate', '')[0].call, "openDocDraft(7,'estimate')",
      'through a function that reads the URL off the record rather than embedding it in an onclick');
    // ⚠ IT NAMES ITS DOCUMENT, like View and Print beside it and for the same reason: the
    // deduped quick strip at the foot of the rail carries no row context, so two
    // outstanding drafts would render as two identical "Open the draft" buttons.
    has(drafts._jtDraftLink(7, job, 'estimate', '', 'estimate')[0].label, 'estimate draft',
      'and the label says which draft it opens');
    has(drafts._jtDraftLink(7, job, 'estimate', '')[0].label, 'document draft',
      'with an honest fallback when the caller names nothing');
    // ⚠ WITHDRAWN ONCE THE SEND IS CONFIRMED. A button that reopens an already-sent draft
    // is an invitation to send it twice.
    job.docState.estimate.sentAt = 'y';
    eq(drafts._jtDraftLink(7, job, 'estimate', '').length, 0, 'and withdrawn once the send is confirmed');
    eq(drafts._jtDraftLink(7, { id: 7 }, 'estimate', '').length, 0, 'a job with no draft offers nothing');
  }

  group('the plain-text email is the automatic fallback, not a button beside the real one');
  {
    // Two email buttons side by side invites sending the plain one by mistake, which loses
    // the attachment. The anchor stays in the DOM because updateApprovalUI sets its href.
    lacks(src, '&#9993; Plain email', 'no second email button on the tab');
    const ui = fn('updateApprovalUI');
    has(ui, 'mailtoEl.href = buildEstimateMailto()', 'the href is still maintained');
    lacks(ui, "mailtoEl.style.display = 'inline-block'", 'but it is never shown');
    // ⚠ THE FALLBACK IS A PROVIDER NOW, NOT A FUNCTION EACH SENDER CALLS. `docSend` falls
    // to it when Gmail is unconfigured or the draft fails, so all five documents get the
    // same escape hatch — and it says it carries no attachment, because RFC 6068 cannot.
    const prov = decl('DOC_SEND_PROVIDERS');
    has(prov, 'mailto: {', 'the plain-text path survives as a provider');
    has(prov, 'spec.cfg.mailto(spec)', 'building the href from the registry');
    has(fn('docProvider'), "gmailConfigured() ? 'gmail' : 'mailto'",
      'and an unconfigured Gmail falls to it rather than erroring');
    has(fn('docSend'), 'DOC_SEND_PROVIDERS.mailto', 'as does a failed Gmail draft');
    has(fn('docSend'), 'it carries NO attachment', 'and the notice says the attachment is not there');
    // Reached in code, never offered as a choice: two email buttons side by side invites
    // sending the plain one by mistake, which loses the attachment.
    lacks(src, "onclick=\"buildEstimateMailto", 'nothing offers the plain path as a button');
  }

  group('base64url, because the Gmail API will not take standard base64');
  {
    const ctx = sandbox({ fns: ['_b64url'] });
    const out = ctx._b64url('subjects?? with ~~ padding>>');
    lacks(out, '+', 'no plus');
    lacks(out, '/', 'no slash');
    lacks(out, '=', 'no padding');
    // And it round-trips, so the message Gmail receives is the message we built.
    const back = Buffer.from(out.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('binary');
    eq(back, 'subjects?? with ~~ padding>>', 'and decodes back to the original');
  }

  group('the token is never persisted, and the scope cannot send mail');
  {
    const auth = fn('gmailAuth');
    eq((src.match(/setItem\(\s*['"][^'"]*gmail[^'"]*token/gi) || []).length, 0,
       'no localStorage write of a Gmail token anywhere in the file');
    has(decl('GMAIL_SCOPE'), 'gmail.compose', 'the scope is compose');
    lacks(decl('GMAIL_SCOPE'), 'gmail.send', 'and deliberately NOT send — the person presses send, not the app');
    has(auth, '_gmailTokenExp', 'expiry is tracked so a stale token is not reused');
    has(auth, 'popup_closed', 'a closed sign-in popup is reported as that rather than as a failure');
  }

  // ⚠ EVERY REQUIREMENT IN THIS GROUP SURVIVES SLICE 4 — WHAT MOVED IS WHERE IT LIVES.
  // The estimate tab used to hold a complete second send path: its own busy flag, its own
  // Gmail call, its own fallback, its own refusals. All five documents share one now, so
  // each of these is asserted against `docSend` — which means the agreement and the three
  // invoices get them too, and three of the four never had them.
  group('the send path refuses, falls back and reports the same way for every document');
  {
    const send = fn('docSend');
    has(fn('docProvider'), 'gmailConfigured()', 'an unconfigured client ID falls back rather than erroring');
    has(send, 'DOC_SEND_PROVIDERS.mailto', 'and so does a failed draft');
    has(decl('DOC_SEND_PROVIDERS'), 'spec.cfg.mailto(spec)', 'the fallback is the pre-existing plain-text path');
    // The unapproved-estimate refusal moved into the registry, where it now guards every
    // verb rather than only the send button.
    has(src, "return 'This estimate has not been approved yet.", 'an unapproved estimate is refused');
    has(send, 'No client email on this job', 'and a job with no email says so before doing any work');
    // ⚠ ONE BUSY FLAG, APP-WIDE. It used to be per tab (`_estEmailBusy`, `_agrEmailBusy`),
    // which could not stop somebody starting an invoice send while an estimate was
    // building — and `_docBusy` is what the 45-second watchdog clears.
    has(send, 'if (_docBusy)', 'a second press while it is working is a no-op');
    has(src, 'var _docBusy = null;', 'through one flag rather than one per document');
    lacks(src, 'var _estEmailBusy', 'the per-tab flags are gone');
    lacks(src, 'var _agrEmailBusy', 'both of them');
    // ⚠ A `fetch` HAS NO TIMEOUT. Re-enabling must be loud — the draft may already exist,
    // and a silent re-enable is the exact moment somebody presses again and gets two.
    has(send, 'setTimeout(function () {', 'a watchdog re-enables the button if nothing answers');
    has(send, 'A draft may already have been created', 'and says so rather than re-enabling silently');
    has(send, 'clearTimeout(watchdog)', 'and is cleared when the answer arrives');
    // A missing PDF must not abandon the email — the body carries the summary.
    has(send, 'WITHOUT the PDF', 'a failed PDF still produces a draft, and says so');
    has(send, '_pdfFailAdviceText(pdfErrKind)', 'prescribing only what the error entitles it to');
  }

  group('the PDF comes from the same conversion that writes the filed copy');
  {
    const pdf = fn('docPdfBase64');
    has(pdf, "action: 'htmlToPdf'", 'through a dedicated Apps Script action');
    has(pdf, '_exportDoc(', 'built from the same _exportDoc input as the Drive copy');
    has(pdf, 'spec.cfg.label', 'titled from the registry rather than read off a rendered panel');
    // The server side must not write anything to Drive on this path.
    const gs = require('fs').readFileSync(require('path').join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
    const body = gs.slice(gs.indexOf('function htmlToPdfBase64'), gs.indexOf('function handleGetSubfolders'));
    has(gs, "data.action === 'htmlToPdf'", 'the action is dispatched');
    has(body, "getAs('application/pdf')", 'and converts the same way uploadHtmlToDrive does');
    lacks(body, 'DriveApp', 'while touching Drive not at all — nothing is stored');
    has(body, 'Utilities.base64Encode', 'handing the bytes back base64');
  }

  // ── THE TWO PHONE NUMBERS ──────────────────────────────────────────────────
  group('the office line is the firm\'s and a mobile is the person\'s');
  {
    // The office number used to be a literal in five client documents AND Anthony's `phone`
    // in the roster, so one person's record was carrying the firm's line while Ashley and
    // Anthony Jr had no number at all.
    eq((src.match(/\(561\) 370-4700/g) || []).length, 1,
       'the retired number survives ONLY in the non-mobile guard list');
    has(decl('HAVELLIN_OFFICE_PHONE'), '(561) 652-5522', 'the current office line is one constant');
    const contractors = decl('DEFAULT_CONTRACTORS');
    has(contractors, "phone:'(617) 650-6588'", "Anthony's mobile is on his own record");
    has(contractors, "phone:'(978) 857-5374'", "and Ashley's on hers");

    const ctx = sandbox({ fns: ['conciergePhones', 'conciergePhonesText'],
                          vars: ['HAVELLIN_OFFICE_PHONE', 'NON_MOBILE_NUMBERS'] });
    const both = ctx.conciergePhonesText({ phone: '(978) 857-5374' });
    has(both, 'Office (561) 652-5522', 'the office line always shows');
    has(both, 'Mobile (978) 857-5374', 'with the mobile beside it');
    ok(both.indexOf('Office') < both.indexOf('Mobile'), 'office first — it is the one answered when the concierge is on a job');

    // A concierge with no mobile yet gets one line, not an empty label.
    eq(ctx.conciergePhones({ phone: '' }).length, 1, 'no mobile means office only');
    eq(ctx.conciergePhones(null).length, 1, 'and an unresolvable concierge still gets the office');

    // ⚠ A firm line in a person's record is never a mobile — the retired one included,
    // whatever format it is written in. That would put a dead number on a client document.
    ['(561) 370-4700', '561-370-4700', '5613704700', '(561) 652-5522'].forEach(function (n) {
      eq(ctx.conciergePhones({ phone: n }).length, 1, n + ' is not offered as a mobile');
    });
  }

  group('a concierge never inherits another concierge\'s contact details');
  {
    // ⚠ THIS BECAME SEVERE ON 2026-09-09. assignedTCContact fell back to the managing
    // partner's own phone and email whenever the resolved person had none — survivable
    // while that fallback was the OFFICE line, and not survivable once contractor `phone`
    // meant a personal mobile: a concierge with none recorded would have had Anthony's
    // personal number printed under THEIR name, as the direct line on their client's
    // estate. A blank field is now blank, and conciergePhones renders office-only.
    const a = fn('assignedTCContact');
    has(a, 'phone: tc.phone || \'\'', 'a resolved person with no mobile has no mobile');
    has(a, 'email: tc.email || \'\'', 'and no email rather than somebody else\'s');
    lacks(a, 'tc.phone || fallback.phone', 'the leaking fallback is gone');
    lacks(a, 'tc.email || fallback.email', 'both of them');

    const ctx = sandbox({ fns: ['assignedTCContact', 'conciergePhones', 'conciergePhonesText', 'canonPersonName', 'samePerson'],
                          vars: ['HAVELLIN_OFFICE_PHONE', 'NON_MOBILE_NUMBERS', 'DEFAULT_CONTRACTORS', 'PERSON_NAME_ALIASES'] });
    ctx.contractors = [{ id: 'c1', name: 'New Concierge', role: 'TC', phone: '', email: 'new@havellinpalmbeach.com' }];
    const bare = ctx.assignedTCContact({ tc: 'New Concierge' });
    eq(bare.phone, '', 'a concierge with no mobile resolves to an empty one');
    eq(ctx.conciergePhonesText(bare), 'Office (561) 652-5522', 'and their client sees the office alone');

    // A job with NO concierge assigned still speaks for the firm — that is what the
    // fallback identity is for, and it keeps its own real details.
    const none = ctx.assignedTCContact({});
    has(ctx.conciergePhonesText(none), 'Mobile (617) 650-6588', 'an unassigned job falls back to the managing partner in full');

    // ⚠ A BLANK EMAIL MUST NOT RENDER AN EMPTY LINE. The guard used to live inline in the
    // two HTML signatures; those are gone, so it lives in `mailtoSignoff` — the one
    // signature left in the app — and is DRIVEN rather than grepped.
    const so = sandbox({ fns: ['mailtoSignoff', 'conciergePhones', 'conciergePhonesText'],
                         vars: ['HAVELLIN_OFFICE_PHONE', 'NON_MOBILE_NUMBERS'] });
    const full = so.mailtoSignoff({ name: 'Ashley Graziano', phone: '(978) 857-5374', email: 'ashley@havellinpalmbeach.com' });
    has(full.join('\n'), 'Mobile (978) 857-5374', 'a full record signs with both numbers');
    has(full.join('\n'), 'ashley@havellinpalmbeach.com', 'and the address');
    const bare2 = so.mailtoSignoff({ name: 'Anthony Graziano Jr', phone: '', email: '' });
    eq(bare2.filter((l) => l === '').length, 1, 'a blank mobile and address leave no empty lines behind');
    has(bare2.join('\n'), 'Office (561) 652-5522', 'and the office line still gets them a person');
    ok(bare2.indexOf('Anthony Graziano Jr') >= 0, 'with the name intact');
  }

  // ⚠⚠ THE THREE EMAILS NO LONGER SIGN THEMSELVES (2026-09-11). Anthony: *"we can remove
  // email signatures bc our Gmail inserts one anyway."* Two signatures stacked — ours and
  // the sender's own — is worse than either alone, and Gmail's is the one that is actually
  // current for that person.
  group('the emails carry NO signature, because Gmail appends the sender\'s own');
  {
    ['buildEstimateEmailHtml', 'buildAgreementEmailHtml', 'buildInvoiceEmailHtml',
     'buildEstimateEmailText', 'buildAgreementEmailText', 'buildInvoiceEmailText'].forEach((f) => {
      lacks(fn(f), 'Warm regards', f + ' signs off nothing');
      lacks(fn(f), '_emPhoneLines(tc)', f + ' renders no phone block');
      lacks(fn(f), 'conciergePhonesText(tc)', f + ' renders no phone line');
      lacks(fn(f), 'tc.email', f + ' prints no sender address');
    });
    // ⚠ THE PLAIN-TEXT PARTS LOSE IT TOO, AND THAT IS NOT A SEPARATE DECISION. Each pair
    // is ONE `multipart/alternative` message and the client picks a half — so cutting only
    // the HTML would give a plain-text reader our signature and everyone else Gmail's, off
    // the same send. The assertion above covers both halves for exactly that reason.
    eq((src.match(/Warm regards/g) || []).length, 1,
      'exactly ONE survives in the whole file — `mailtoSignoff`, which only the fallbacks read');

    // ⚠ AND THE `mailto:` FALLBACKS KEEP THEIRS, DELIBERATELY. They fire precisely when
    // Gmail is NOT in play — unconfigured client id, cancelled popup, failed draft — so
    // nothing there would append the signature that replaces ours.
    // ⚠ ONE DEFINITION, THREE READERS — and the agreement is why that matters. It derives
    // its body from `buildAgreementEmailText`, so cutting the Gmail signature took the
    // FALLBACK'S with it, silently. Not drift: one copy simply disappeared.
    [['buildEstimateMailto', 'the estimate fallback'],
     ['buildAgreementMailto', 'the agreement fallback'],
     ['buildInvoiceMailto', 'the invoice fallback']].forEach(([f, what]) => {
      has(fn(f), 'mailtoSignoff(', what + ' still signs off');
    });
    has(fn('mailtoSignoff'), 'conciergePhonesText(tc)', 'through one signoff that carries both numbers');
    eq((src.match(/'Warm regards,'/g) || []).length, 1, 'written once, nowhere else');
  }

  group('⚠ the two numbers still reach the client — on the DOCUMENT, not the email');
  {
    // This is the half worth guarding. The office line and the concierge's mobile were
    // split apart on 2026-09-09 so a client document carries both, and the email
    // signature was one of six surfaces reading that. Dropping it is only safe because
    // the numbers are on the attached PDF, which is where a client looks for them weeks
    // later anyway — an email scrolls away, a filed estimate does not.
    eq((src.match(/conciergePhonesText\(preparer/g) || []).length, 2,
      'the estimate and the invoice both print the contact line');
    has(src, 'Insured &amp; Bonded', 'and the document footers still carry the firm block');
    ok((src.match(/HAVELLIN_OFFICE_PHONE/g) || []).length > 1,
      'the office line is a constant the documents read');
    eq((src.match(/var prepPhone =/g) || []).length, 0, 'the single-number variable is still gone');
    has(fn('_emPhoneLines'), 'href="tel:', 'the phone renderer survives for any surface that wants it');
    has(fn('_emPhoneLines'), "replace(/[^0-9+]/g, '')", 'with punctuation stripped from the tel: target');
  }

  // ── 6. THE AGREEMENT EMAIL, AND THE CC THAT NEVER EXISTED ──────────────────
  group('the agreement now has a working client email, CC\'d to agreements@');
  {
    // The dead button: `btn-mailto-agr` appeared once in the whole file — the markup,
    // display:none — and nothing set its href or showed it. So agreements@ had never
    // received a copy of anything sent to a client, while estimates@ always had.
    eq((src.match(/id="btn-mailto-agr"/g) || []).length, 0, 'the dead anchor is gone from the markup');
    ok(/btn-mailto-agr/.test(src), 'though the comments still name it, so the next reader knows what it was');
    has(src, 'id="btn-agr-email"', 'a real button replaces it');
    has(src, 'onclick="emailAgreementToClient()"', 'wired to the sender');

    const ui = fn('updateAgrUI');
    has(ui, "getElementById('btn-agr-email')", 'updateAgrUI resolves it');
    // It must follow the PDF button exactly — shown only on an approved agreement, and
    // hidden in every refusal state, or it becomes a way past the gates.
    const pdfShow = (ui.match(/btnPdf\.style\.display='inline-block'/g) || []).length;
    const emailShow = (ui.match(/btnEmail\.style\.display='inline-block'/g) || []).length;
    const pdfHide = (ui.match(/btnPdf\.style\.display='none'/g) || []).length;
    const emailHide = (ui.match(/btnEmail\.style\.display='none'/g) || []).length;
    eq(emailShow, pdfShow, 'shown in exactly the states the PDF button is shown in');
    eq(emailHide, pdfHide, 'and hidden in exactly the states it is hidden in');

    // ⚠ THE BUTTON IS A SHIM ON THE ONE SEND PATH NOW. Every requirement below still
    // holds; each is asserted where it moved to, and because it moved to the shared path
    // the estimate and the three invoices get it too.
    has(fn('emailAgreementToClient'), "docAction(currentAgrJobId, 'agreement', 'send')",
      'the button routes through the one document action');
    has(src, 'cc: function () { return DEPT_EMAILS.agreements; },', "CC'd to agreements@ — the thing that was missing");
    // The gate is the same two conditions; what changed is that meeting them STAMPS the
    // approval rather than requiring a separate one — and that stamp is now the registry's
    // `commit`, run by docAction on every verb but 'view'.
    has(src, 'commit: function (spec) { return ensureAgreementApproved(spec.job.id); },',
      'refuses an agreement that is not ready, and stamps when it is');
    has(fn('docSend'), 'No client email on this job', 'and a job with no client email');
    has(fn('docSend'), 'if (_docBusy)', 'a second press while working is a no-op');
    has(fn('docSend'), 'DOC_SEND_PROVIDERS.mailto', 'and it falls back like the estimate does');

    // It must send the PACKET. Both forms incorporate the estimate as Exhibit A and the
    // estate form says the agreement is not valid without it.
    has(src, 'html: function (spec) { return signingPacketHtml(spec.job.id); },',
      'the attachment is the signing packet, not the bare agreement');
    has(fn('docPdfBase64'), "action: 'htmlToPdf'", 'through the same conversion as everything else');
    // ⚠ AND IT PAGINATES. The exhibit has to start on a fresh page, or the estimate runs
    // on from the signature block — which is what "attached as Exhibit A" has to look like.
    has(src, "pdfCss: '.ce-page{max-width:800px;margin:0 auto;} .packet-exhibit{break-before:page;page-break-before:always;}',",
      'and the packet carries its own print CSS so the exhibit starts a new page');

    // The fallback carries the CC too — that is the whole point of this group.
    const fb = fn('buildAgreementMailto');
    has(fb, 'DEPT_EMAILS.agreements', "the plain-text fallback CC's agreements@ as well");
    has(fb, 'Attach the signing packet before sending', 'and says to attach the packet, since mailto: cannot');

    // Estimates and invoices must not have lost theirs.
    has(src, 'cc: function () { return DEPT_EMAILS.estimates; },', "the estimate still CC's estimates@");
    has(fn('buildEstimateMailto'), 'DEPT_EMAILS.estimates', 'on the fallback too');
    has(fn('buildInvoiceMailto'), 'DEPT_EMAILS.billing', "and invoices still CC billing@");
  }

  group('the agreement email states the schedule and reads as a covering note');
  {
    const ctx = sandbox({
      fns: ['buildAgreementEmailHtml', 'buildAgreementEmailText', 'agreementEmailSubject',
            'paymentSplit', '_emHtml', '_emMoney', '_emPhoneLines', 'conciergePhones', 'conciergePhonesText'],
      vars: ['EMAIL_BRAND', 'HAVELLIN_OFFICE_PHONE', 'NON_MOBILE_NUMBERS'],
      stubs: {
        assignedTCContact: () => ({ name: 'Anthony Graziano', phone: '(561) 370-4700', email: 'anthony@havellinpalmbeach.com' }),
        bestClientGreetingName: () => 'Margaret',
        svcLabelOf: () => 'Estate Settlement',
        approvedEstimateFor: () => ({ havellinTotal: 18650 }),
      },
    });
    const job = { id: 1, name: 'Margaret Ellsworth', addr: '1234 Ocean Blvd, Palm Beach, FL', hvlId: 'HVL-0007' };
    const html = ctx.buildAgreementEmailHtml(job);
    has(html, 'Exhibit A', 'it names the exhibit, so the client knows what is attached');
    has(html, '$9,325', 'the 50% deposit');
    has(html, '$4,663', 'and a 25% instalment');
    has(html, 'HVL-0007', 'the reference');
    lacks(html, 'Warm regards', 'and carries no signature of its own — Gmail adds the sender\'s');
    lacks(html, 'var(--', 'no CSS variables, which no mail client resolves');
    lacks(html, 'class="ce-', 'and no app stylesheet classes');
    has(html, 'max-width:600px', 'fluid up to 600px, like the estimate email');

    eq(ctx.agreementEmailSubject(job), 'Havellin Palm Beach — Service Agreement for 1234 Ocean Blvd', 'the subject names the property');
    const text = ctx.buildAgreementEmailText(job);
    has(text, '$9,325', 'the text part carries the schedule');
    lacks(text, '<', 'and is genuinely plain');

    // A job with no approved estimate must not print a $0 schedule.
    const ctx2 = sandbox({
      fns: ['buildAgreementEmailHtml', 'paymentSplit', '_emHtml', '_emMoney', '_emPhoneLines', 'conciergePhones', 'conciergePhonesText'],
      vars: ['EMAIL_BRAND', 'HAVELLIN_OFFICE_PHONE', 'NON_MOBILE_NUMBERS'],
      stubs: {
        assignedTCContact: () => ({ name: 'A', phone: 'p', email: 'e' }),
        bestClientGreetingName: () => 'X', svcLabelOf: () => 'S',
        approvedEstimateFor: () => null,
      },
    });
    const bare = ctx2.buildAgreementEmailHtml({ id: 2, name: 'N', addr: 'A' });
    lacks(bare, 'Payment schedule', 'no schedule at all rather than a schedule of zeroes');
  }

  // ── 7. THE WORKSHEET ON A FEE-ONLY JOB ─────────────────────────────────────
  group('the internal worksheet says something on a job with no rooms and no hours');
  {
    // Anthony sent this document on 2026-09-08: a Home Prep worksheet whose room table was
    // a single "Job-level work 0.0 TC / 0.0 PS" row over a $4,560 total.
    const ws = fn('exportEstimateToDrive');
    has(ws, 'var _feeOnlyWs = estimateIsFeeOnly(est, job);', 'it asks the shared predicate');
    has(ws, 'Prep vendor line', 'and renders the vendor lines the fee is computed on');
    has(ws, 'Scope note', 'with their scope notes');
    has(ws, '<strong>Vendor spend:</strong>', 'the footer states the spend');
    // prepFeeRate stopped being service-scoped on 2026-09-10 (bundled prep charges the 30%
    // too), so it takes no argument now. The requirement is unchanged and is what this
    // asserts: the percentage on the worksheet comes out of the one function, never a literal.
    has(ws, 'Math.round(prepFeeRate()*100)', 'and the rate from the real function, not a literal');
    lacks(ws, "Fee rate:</strong> 30%", 'no hardcoded 30 beside it');
    has(ws, 'No prep vendor lines on this estimate', 'an empty one says so rather than rendering a bare table');
    // The room path is untouched for every other job.
    has(ws, '<th>Room</th><th>Vol</th><th>Cplx</th>', 'a room-based job still gets the room table');
  }

  group('the button is wired, and the Gmail client ID is a setting that survives a device clear');
  {
    has(src, 'id="btn-html-email-est"', 'the button exists');
    has(src, 'onclick="emailEstimateToClient()"', 'and calls the orchestrator');
    has(src, 'accounts.google.com/gsi/client', 'Google Identity Services is loaded');
    has(src, '<script src="https://accounts.google.com/gsi/client" async defer>',
        'async and deferred, so it can never hold up first paint');
    has(src, 'id="set-gmail-client-id"', 'Settings takes the client ID');
    has(fn('saveSettings'), "localStorage.setItem('hav_gmail_client_id'", 'and saves it');
    has(fn('loadSettings'), "getItem('hav_gmail_client_id')", 'and loads it');
    has(decl('LOCAL_KEEP_KEYS'), 'hav_gmail_client_id',
        'and a device clear keeps it, like the other endpoint settings — retyping it on a phone is the thing that list exists to prevent');

    // The firm's client id ships as the default, so a new device needs no setup step.
    const cidDefault = decl('GMAIL_CLIENT_ID_DEFAULT');
    has(cidDefault, '.apps.googleusercontent.com', 'a real client id is baked in as the default');
    has(fn('loadSettings'), "|| GMAIL_CLIENT_ID_DEFAULT", 'a device with nothing stored falls back to it, not to empty');
    has(fn('saveSettings'), '|| GMAIL_CLIENT_ID_DEFAULT', 'and clearing the field restores it rather than disabling Gmail');

    // ⚠ A CLIENT SECRET MUST NEVER APPEAR IN THE APP. The browser flow is a public client:
    // initTokenClient takes no secret, and a secret in a page anyone can View Source on is
    // not a secret. The prefix is assembled rather than typed, so this test file does not
    // itself trip a secret scan of the repository — the first version of it did.
    const secretPrefix = 'GOCSPX' + '-';
    eq(src.split(secretPrefix).length - 1, 0, 'no Google client secret anywhere in the app');
    eq((src.match(/client_secret/gi) || []).length, 0, 'and nothing asks for one');
    has(fn('gmailAuth'), 'client_id: GMAIL_CLIENT_ID', 'the token client is given the id and nothing else');

    const ui = fn('updateApprovalUI');
    has(ui, "getElementById('btn-html-email-est')", 'the tab shows it');
    has(ui, 'htmlEmailEl0.style.display = \'none\'', 'and hides it with the rest before deciding state');
  }
};
