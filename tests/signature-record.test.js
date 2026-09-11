'use strict';
// SLICE 6 — THE SIGNATURE RECORD, SHAPED FOR A PROVIDER BEFORE THERE IS ONE (2026-09-11).
//
// Anthony: *"we need to, at some point, integrate DocuSign. So think about how we do that
// and how we get signatures back on agreements. Prior to building anything that might not
// work in a DocuSign workflow."*
//
// ⚠⚠ THE DEFECT THIS FOUND IS LIVE TODAY, ON WET SIGNATURES, AND HAS NOTHING TO DO WITH
// DOCUSIGN: `agrSignedBy` IS NOT THE SIGNER. `markAgreementSigned` wrote `_actor(job)`,
// which returns `job.agrApprovedBy` — the Havellin manager who approved the PRICE. So the
// rail read "Agreement signed · Anthony Graziano" over a contract Anthony did not sign, and
// **the app held no record anywhere of who actually signed it.** On a court-reviewed probate
// matter that is precisely the question counsel asks: who bound the estate to this? "Our
// managing partner" is not an answer.
//
// ⚠ AND THE REASON THE SHAPE COMES FIRST. `job.agrSigned` is a boolean a person sets. The
// moment an e-signature provider exists, a reachable "mark it signed" button is a manual
// write that bypasses the envelope — somebody ticks it while DocuSign still says `sent`,
// and the app and the provider disagree about whether a contract exists. That hole has to
// be closed BEFORE the provider lands, not after.

const { sandbox, source, fn, decl } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  const box = (stubs) => sandbox({
    fns: ['agreementSignature', 'isAgreementSigned', 'recordAgreementSignature', 'expectedSignerName',
          'esignProviderKey', 'esignWatches', 'docState', 'applyEsignStatus', 'outstandingEnvelopes', '_actor'],
    vars: ['AGR_SIG_METHODS', 'AGR_SIG_MANUAL_METHODS', 'ESIGN_PROVIDERS'],
    stubs: Object.assign({
      saveJobs() {}, syncJobToSheets() {}, _dashRedraw() {}, renderJobs() {},
      ESIGN_PROVIDER_KEY: 'manual', agrApprovedBy: '',
    }, stubs || {}),
  });

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE SIGNER AND THE RECORDER ARE TWO PEOPLE');
  {
    const ctx = box();
    const job = { id: 1, agrSent: true, agrApprovedBy: 'Anthony Graziano', name: 'William Butler' };
    ctx.jobs = [job];
    eq(ctx.recordAgreementSignature(1, { how: 'scanned', signedBy: 'Tripp Butler', signedOn: '2026-09-11' }), '',
      'a signature is recorded');
    const sig = ctx.agreementSignature(job);
    eq(sig.signedBy, 'Tripp Butler', '⚠ THE SIGNER IS THE CLIENT');
    eq(sig.recordedBy, 'Anthony Graziano', 'and the recorder is whoever typed it in');
    ok(sig.signedBy !== sig.recordedBy, 'the two are separate fields, which is the whole slice');
    eq(sig.how, 'scanned', 'with how it came back');
    eq(sig.signedOn, '2026-09-11', 'and the date THEY signed, not the date we typed it');
    ok(!!sig.recordedAt && sig.recordedAt !== sig.signedOn, 'both times are kept, and they are different questions');

    // ⚠ THE LEGACY TRIO IS MIRRORED, NOT REPLACED. Eight sites read `job.agrSigned` — the
    // estimate lock, the discount gate, the deposit gate, the activation blockers, the
    // client estimate's contract banner and the rail. Repointing all of them in the same
    // commit as a new record is how one gets missed and a signed job silently unlocks.
    eq(job.agrSigned, true, 'the legacy boolean still flips');
    eq(job.agrSignedAt, '2026-09-11', 'and the legacy date');
    eq(job.agrSignedBy, 'Anthony Graziano', '⚠ and agrSignedBy keeps holding the RECORDER — which is what it always held');
    ok((src.match(/job\.agrSigned\b/g) || []).length > 5, 'because plenty still read it');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ a job signed before today is still signed, and its signer is UNKNOWN');
  {
    // A fact about the world, not about our schema. But inventing a signer from
    // `agrSignedBy` is exactly the conflation this slice exists to undo, so it reads blank.
    const ctx = box();
    const old = { id: 2, agrSigned: true, agrSignedBy: 'Anthony Graziano', agrSignedAt: 'September 8, 2026' };
    const sig = ctx.agreementSignature(old);
    eq(ctx.isAgreementSigned(old), true, 'it reads as signed');
    eq(sig.signedBy, '', '⚠ with NO signer — never the manager who approved the price');
    eq(sig.recordedBy, 'Anthony Graziano', 'the old field is read as what it is: the recorder');
    eq(sig.legacy, true, 'and flagged, so the rail can say why the signer is missing');
    eq(sig.how, '', 'how it came back is unknown too, rather than guessed');

    eq(ctx.agreementSignature({ id: 3 }), null, '⚠ an unsigned agreement returns null, not an empty shape');
    eq(ctx.isAgreementSigned({ id: 3 }), false, 'and reads unsigned');
    eq(ctx.agreementSignature(null), null, 'a missing job does not throw');
    // A record half-written is not a signature.
    eq(ctx.agreementSignature({ id: 4, docState: { agreement: { sig: { signedBy: 'X' } } } }), null,
      'a sig with no signedOn is not a signature');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE BUTTON STANDS ITSELF DOWN THE MOMENT A PROVIDER IS WATCHING');
  {
    // This is why the shape came before the integration. Nothing on screen changes when a
    // provider is wired — the control simply stops being offered, the same way Slice 4's
    // confirming tap disappears on a provider with `needsHumanSend:false`.
    const acts = noComments(fn('jobTimelineActions'));
    has(acts, 'if (live && !esignWatches())', 'the rail offers the manual recorder only while nothing is watching');
    // And the door itself refuses, so it cannot be reached around by another surface.
    const open = noComments(fn('openSignatureModal'));
    has(open, 'if (esignWatches())', 'the recorder refuses under a provider');
    has(open, 'records them from there rather than by hand', 'and says why rather than doing nothing');
    ok(open.indexOf('esignWatches()') < open.indexOf('_sigJobId = jobId'),
      'before it opens anything');

    // Driven: flip the provider and watch the primary disappear.
    const rail = sandbox({
      fns: ['jobTimelineActions', '_jtSendAction', '_jtDocViews', '_jtDraftLink', '_jtDriveLink',
            'docKeyFor', 'esignWatches', 'esignProviderKey'],
      vars: ['ESIGN_PROVIDERS'], stubs: { ESIGN_PROVIDER_KEY: 'manual' },
    });
    const row = { key: 'agreement_signed', state: 'current' };
    const j = { id: 7, agrSent: true };
    ok(!!rail.jobTimelineActions(row, j, null).primary, 'with no provider, the button is offered');
    has(rail.jobTimelineActions(row, j, null).primary.label, 'Record the signed agreement',
      'and it asks for the signed agreement rather than announcing a receipt');
    rail.ESIGN_PROVIDERS.docusign.live = true;
    rail.ESIGN_PROVIDER_KEY = 'docusign';
    eq(rail.jobTimelineActions(row, j, null).primary, null,
      '⚠ and the moment a provider is live and watching, it is gone');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE ROW ITSELF — where "signed by Anthony Graziano" was actually printed');
  {
    // ⚠ THIS GROUP EXISTS BECAUSE TWO REVERTS CAME BACK GREEN. Everything above drove the
    // RECORD and the ACTION and nothing drove the ROW, so repointing `by` back at
    // `agrSignedBy` — which is the defect, the thing a person actually read on screen —
    // was invisible to the suite. The record being right does not help if the row prints
    // something else.
    const rail = sandbox({
      fns: ['jobTimeline', 'jobTimelineNext', 'agreementSignature', 'isAgreementSigned',
            'esignProviderKey', 'esignWatches', 'docState', 'paymentSplit', 'unscoredRoomNames',
            'jobActivationBlockers', 'isJobWon', 'isJobFunded', 'jobPayments', 'stagePaidTotal',
            'depositPaidTotal', 'depositTargetFor', 'docSentAt', 'docDraftedAt', 'docKeyFor'],
      vars: ['JT_SHORT', 'AGR_SIG_METHODS', 'ESIGN_PROVIDERS'],
      stubs: { ESIGN_PROVIDER_KEY: 'manual', REQUIRE_WALKTHROUGH_NOTES: false },
    });
    const base = () => ({ id: 7, name: 'Butler', created: 'Sep 8, 2026', svc: 'cleanout',
      status: 'won', walkthrough: '2020-01-01', approved: true, won: true,
      estimateSentDate: 'Sep 8, 2026', agrApproved: true, agrApprovedBy: 'Anthony Graziano',
      agrSent: true, agrSentAt: 'Sep 9, 2026' });
    const rec = { estimate: { rooms: [{ name: 'Kitchen', vol: 3, cplx: 3 }], havellinTotal: 24100 }, approved: true };
    const rowOf = (job) => { rail.jobs = [job]; rail.estimateStore = { 7: rec };
      return rail.jobTimeline(job, rec, [], []).filter((r) => r.key === 'agreement_signed')[0]; };

    // ⚠ THE DEFECT, AS IT APPEARED ON SCREEN.
    const properly = base();
    properly.agrSigned = true; properly.agrSignedBy = 'Anthony Graziano'; properly.agrSignedAt = '2026-09-10';
    properly.docState = { agreement: { sig: { how: 'scanned', signedBy: 'Tripp Butler',
      signedOn: '2026-09-10', recordedBy: 'Anthony Graziano', recordedAt: '2026-09-10T12:00:00Z' } } };
    const r1 = rowOf(properly);
    eq(r1.done, true, 'a signed agreement reads done');
    eq(r1.by, 'Tripp Butler', '⚠ THE ROW NAMES THE CLIENT WHO SIGNED');
    ok(r1.by !== 'Anthony Graziano', 'and NOT the manager who approved the price');
    has(r1.sub, 'Signed copy returned', 'with how it came back');

    // ⚠ THE RECORD IS THE TRUTH AND `agrSigned` IS THE MIRROR, so the row has to read the
    // record. They agree today only because `recordAgreementSignature` writes both — which
    // makes reading the boolean look harmless right up until something writes a signature
    // without it, and then a signed agreement reads unsigned and the job stalls.
    const noMirror = base();
    noMirror.docState = { agreement: { sig: { how: 'wet', signedBy: 'Tripp Butler', signedOn: '2026-09-10' } } };
    eq(noMirror.agrSigned, undefined, 'a record written with no legacy mirror');
    const r0 = rowOf(noMirror);
    eq(r0.done, true, 'still reads signed — the row reads the record, not the boolean');
    eq(r0.by, 'Tripp Butler', 'and names the signer off it');

    // A job signed before the record says its signer is not on file, rather than naming ours.
    const old = base();
    old.agrSigned = true; old.agrSignedBy = 'Anthony Graziano'; old.agrSignedAt = 'September 8, 2026';
    const r2 = rowOf(old);
    eq(r2.done, true, 'a legacy signed job still reads signed');
    eq(r2.by, '', '⚠ with nobody named as the signer');
    has(r2.sub, 'who signed it is not on file', 'and the row says why rather than leaving a blank');

    // Unsigned, nothing watching: no signer, no status line.
    const un = rowOf(base());
    eq(un.done, false, 'an unsigned agreement reads unsigned');
    eq(un.by, '', 'with no signer');
    eq(un.sub, '', 'and nothing to say about a provider that does not exist');

    // ⚠ Under a provider the row says what is watching for it, so silence is not mistaken
    // for nothing happening.
    rail.ESIGN_PROVIDERS.docusign.live = true;
    rail.ESIGN_PROVIDER_KEY = 'docusign';
    has(rowOf(base()).sub, 'DocuSign is watching for it', 'under a provider the row says what is watching');
    eq(rowOf(properly).sub.indexOf('watching'), -1, 'and stops once it is actually signed');
    rail.ESIGN_PROVIDERS.docusign.live = false;
    rail.ESIGN_PROVIDER_KEY = 'manual';
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the provider table, and why only one of them is live');
  {
    const t = decl('ESIGN_PROVIDERS');
    has(t, 'manual:', 'manual is a provider like any other');
    has(t, 'watches: false', 'and does not watch');
    has(t, 'docusign:', 'DocuSign is declared');
    has(t, 'live: false', '⚠ and NOT live — there is no account, no credentials, no backend action');
    // ⚠ An unknown or not-live key falls back to manual rather than standing the only
    // working control down. A typo in Settings must not make signatures unrecordable.
    const ctx = box({ ESIGN_PROVIDER_KEY: 'docusign' });
    eq(ctx.esignProviderKey(), 'manual', 'a declared-but-not-live provider falls back to manual');
    eq(ctx.esignWatches(), false, 'so nothing is standing down on a provider that cannot deliver');
    const typo = box({ ESIGN_PROVIDER_KEY: 'docsign' });
    eq(typo.esignProviderKey(), 'manual', 'and so does a typo');
    // Flipping it on is one field.
    has(src, "localStorage.getItem('hav_esign_provider')", 'the key is a Settings value, not a constant');
    has(src, 'hav_esign_provider', 'kept through a device clear, like the other endpoint settings');
    ok(/LOCAL_KEEP_KEYS[^\n]*hav_esign_provider/.test(src), 'explicitly on the keep list');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ the recorder will not write a signature with no signer on it');
  {
    const c = noComments(fn('confirmAgreementSignature'));
    has(c, 'if (!by)', 'a blank signer is refused');
    has(c, 'not yours unless you signed', 'and the refusal says whose name it wants');
    has(c, 'AGR_SIG_MANUAL_METHODS.indexOf(how) < 0', '⚠ and a person cannot claim an e-signature');
    has(c, 'if (!on)', 'nor leave the date blank');
    ok(c.indexOf('if (!by)') < c.indexOf('recordAgreementSignature('),
      'every refusal comes before anything is written');
    // The picker offers the two manual methods and not the third.
    const open = noComments(fn('openSignatureModal'));
    has(open, 'AGR_SIG_MANUAL_METHODS.map', 'the picker is built from the manual list');
    eq(decl('AGR_SIG_MANUAL_METHODS'), "var AGR_SIG_MANUAL_METHODS = ['wet', 'scanned'];",
      'which is wet and scanned — never esign');
    // The record cannot be written before the agreement has gone out.
    const ctx = box();
    ctx.jobs = [{ id: 5, agrSent: false }];
    eq(ctx.recordAgreementSignature(5, { how: 'wet', signedBy: 'X' }), 'notsent',
      'and nothing unsent can come back signed');
    eq(ctx.recordAgreementSignature(99, {}), 'nojob', 'an unknown job is refused, not invented');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the signer is prefilled, because retyping a name invites getting it wrong');
  {
    const ctx = box();
    eq(ctx.expectedSignerName({ executor: 'Tripp Butler', executorRole: 'Trustee', name: 'William Butler' }),
      'Tripp Butler (Trustee)', 'an estate expects its authorized representative');
    eq(ctx.expectedSignerName({ name: 'Margaret Ellsworth' }), 'Margaret Ellsworth',
      'a living client signs for themselves');
    eq(ctx.expectedSignerName({ executor: 'Tripp Butler' }), 'Tripp Butler', 'a rep with no role is still the rep');
    eq(ctx.expectedSignerName({}), '', 'and a job with neither prefills nothing rather than a placeholder');
    has(noComments(fn('openSignatureModal')), 'expectedSignerName(job)', 'the modal uses it');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ POLL, DO NOT USE DOCUSIGN CONNECT — the decision, and it is load-bearing');
  {
    // Connect is DocuSign's webhook and the obvious design. It cannot work against this
    // backend, for four separate reasons, each fatal on its own — and the most important is
    // the security one: `doPost(e)` does not expose request headers, so the HMAC that proves
    // a callback is really DocuSign is unreadable. An unauthenticated endpoint that marks
    // contracts signed is not something to ship.
    const where = src.slice(src.indexOf('WHERE A PROVIDER'), src.indexOf('function applyEsignStatus'));
    has(where, "POLL, DO NOT USE DOCUSIGN", "the decision is recorded where the code is");
    has(where, '302', 'the redirect that makes every notification look like a failure');
    has(where, 'ContentService', 'the reason a 200 cannot be returned');
    has(where, 'X-DocuSign-Signature-1', 'and the HMAC that cannot be read');
    // ⚠ NOTHING CALLS DOCUSIGN. A half-built integration reporting success on an opaque
    // response is a defect this file already records once — `generateStripeLink`.
    lacks(src, 'docusign.net', 'no endpoint is contacted');
    lacks(src, 'demo.docusign', 'not even a sandbox one');
    eq((src.match(/accounts\.docusign/g) || []).length, 0, 'no auth host either');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('what a provider is allowed to write, and what it is not');
  {
    const ctx = box();
    const job = { id: 6, agrSent: true, agrApprovedBy: 'Anthony Graziano',
                  docState: { agreement: { esign: { envelopeId: 'env-1' } } } };
    ctx.jobs = [job];

    // ⚠ ONLY `completed` IS A SIGNATURE. `delivered` and a per-recipient `signed` are not
    // the contract being executed, and treating them as one marks a job signed early.
    ['sent', 'delivered', 'declined', 'voided'].forEach((st) => {
      ctx.applyEsignStatus(6, { envelopeId: 'env-1', status: st, signerName: 'Tripp Butler' });
      eq(ctx.isAgreementSigned(job), false, '"' + st + '" does not sign the agreement');
      eq(job.docState.agreement.esign.status, st, 'though the status is kept, so the rail can say where it is');
      ok(!!job.docState.agreement.esign.checkedAt, 'with when we last asked');
    });

    ctx.applyEsignStatus(6, { envelopeId: 'env-1', status: 'completed',
                              signerName: 'Tripp Butler', completedAt: '2026-09-12T14:03:00Z' });
    const sig = ctx.agreementSignature(job);
    eq(ctx.isAgreementSigned(job), true, '⚠ and "completed" does');
    eq(sig.signedBy, 'Tripp Butler', 'THE PROVIDER NAMES THE SIGNER — which is the point of using one');
    eq(sig.how, 'esign', 'recorded as an electronic signature');
    eq(sig.signedOn, '2026-09-12', 'on the date it completed');
    eq(sig.envelopeId, 'env-1', 'against the envelope it came from');
    eq(job.agrSigned, true, 'and the legacy boolean follows, so every existing gate sees it');
    eq(ctx.applyEsignStatus(404, {}), 'nojob', 'an unknown job is refused');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ⚠ FOUND IN A BROWSER ON THE SHIPPED SLICE 6 BUILD, NOT BY THIS SUITE: the rail's
  // *Agreement signed* row rendered the literal string "Invalid Date". The row gained
  // `atKind:'date'` in Slice 6, which sends `sig.signedOn` through `fmtDate2` — and on a
  // LEGACY job `signedOn` is `job.agrSignedAt`, written by `_stamp()` as "September 10,
  // 2026". `fmtDate2` only ever handled `yyyy-mm-dd`.
  //
  // ⚠⚠ AND THE REASON 3278 CHECKS WERE GREEN THROUGH IT: THE HARNESS STUBS `fmtDate2` AS A
  // PASSTHROUGH (`harness.js`, `fmtDate2: (d) => String(d || '')`). Every test that has ever
  // rendered a date in this app rendered it through a stub that cannot fail. So this group
  // lifts the REAL one. A stub that does not match the real source is worse than no stub —
  // this file already records that costing the `&amp;amp;` defect a whole round.
  group('⚠ fmtDate2 printed "Invalid Date" on anything but yyyy-mm-dd');
  {
    const ctx = sandbox({ fns: ['fmtDate2', 'agreementSignature'], vars: [] });

    // The four shapes that were broken. `new Date(<rubbish>)` does not THROW, so the
    // function's own `catch(e) { return d; }` passthrough was unreachable code.
    eq(ctx.fmtDate2('September 10, 2026'), 'Sep 10, 2026',
      '⚠⚠ THE LEGACY `_stamp()` FORM — what EVERY job signed before 2026-09-11 carries');
    eq(ctx.fmtDate2('2026-09-10T00:00:00Z'), 'Sep 10, 2026', 'an ISO stamp');
    eq(ctx.fmtDate2('9/10/2026'), 'Sep 10, 2026', 'and a date somebody typed');
    eq(ctx.fmtDate2('2026-09-10'), 'Sep 10, 2026', 'with the yyyy-mm-dd path unchanged');

    // ⚠ AN UNPARSEABLE VALUE PASSES THROUGH, which is what the dead `catch` always meant to
    // do. It must never render as those twelve characters: 27 call sites reach this, and
    // the Court Inventory and the Appraisal Worklist are two of them.
    eq(ctx.fmtDate2('not a date'), 'not a date', 'rubbish passes through unchanged');
    eq(ctx.fmtDate2(''), '—', 'and empty is still the em-dash, not a date');
    ok(!['September 10, 2026', '9/10/2026', 'not a date', '2026-09-10T00:00:00Z']
      .some((v) => ctx.fmtDate2(v).indexOf('Invalid Date') >= 0),
      '⚠ and nothing anywhere renders the string "Invalid Date"');

    // ⚠⚠ THE ORDER OF THE TWO PARSE ATTEMPTS IS A CORRECTNESS CONSTRAINT, AND THE CONTAINER
    // RUNS UTC — which is the only reason this reads as trivially true here. A plain
    // `yyyy-mm-dd` parses as UTC MIDNIGHT, so in any negative-offset zone a bare
    // `new Date(d)` renders the PREVIOUS DAY. Palm Beach is America/New_York, so
    // "simplifying" the noon attempt away would move every date on the dashboard back one.
    // Driven under the real zone rather than asserted on source text.
    const tz = process.env.TZ;
    try {
      process.env.TZ = 'America/New_York';
      eq(ctx.fmtDate2('2026-09-10'), 'Sep 10, 2026',
        '⚠⚠ IN EASTERN TOO — the T12:00:00 attempt must stay FIRST or this reads Sep 9');
      eq(ctx.fmtDate2('September 10, 2026'), 'Sep 10, 2026', 'and the legacy form holds there');
    } finally { process.env.TZ = tz; }

    // The row that surfaced it, end to end: a legacy signed job with no record.
    const legacy = ctx.agreementSignature({ agrSigned: true, agrSignedAt: 'September 10, 2026',
                                            agrSignedBy: 'Anthony Graziano' });
    eq(ctx.fmtDate2(legacy.signedOn), 'Sep 10, 2026',
      'so the rail\'s *Agreement signed* row reads a date rather than "Invalid Date"');
    eq(legacy.signedBy, '', '⚠ while the SIGNER stays unknown — the date being legible does not invent one');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('what the poll would ask about');
  {
    const ctx = box();
    ctx.jobs = [
      { id: 1, agrSent: true, docState: { agreement: { esign: { envelopeId: 'e1' } } } },
      { id: 2, agrSent: true },                                     // no envelope — nothing to ask
      { id: 3, agrSent: false, docState: { agreement: { esign: { envelopeId: 'e3' } } } },  // never went out
      { id: 4, agrSent: true, agrSigned: true, hvlId: 'HVL-4',
        docState: { agreement: { esign: { envelopeId: 'e4' } } } },  // already back
    ];
    const out = ctx.outstandingEnvelopes();
    eq(out.length, 1, 'only agreements out and not yet back');
    eq(out[0].envelopeId, 'e1', 'named by envelope');
    eq(out[0].jobId, 1, 'and by job');
    // ⚠ A signed agreement drops off the poll, or it is asked about forever.
    ok(!out.some((e) => e.jobId === 4), 'a signed one is not asked about again');
    lacks(noComments(fn('outstandingEnvelopes')), 'document.', 'and the whole thing is DOM-free, so a backend can be written against it');
  }
};
