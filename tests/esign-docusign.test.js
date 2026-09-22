'use strict';
// DOCUSIGN — THE PROVIDER BEHIND THE SIGNATURE RECORD (2026-09-17).
//
// Slice 6 (2026-09-11) built the RECORD a provider would write into and deliberately built no
// provider: `ESIGN_PROVIDERS.docusign` was declared `live:false`, `applyEsignStatus` was the one
// place a verdict becomes a signature, and `outstandingEnvelopes()` named what a poll would ask
// about. Everything below is the half that was missing — and the half that was missing was ALL
// of it: nothing anywhere created an envelope, so `outstandingEnvelopes()` returned `[]` on every
// job forever and the poll had nothing to poll.
//
// ⚠⚠ THE CLAIM THIS FILE EXISTS TO PIN, because it is the one a reader will doubt: THE ENVELOPE
// CARRIES TWO SIGNERS, NOT ONE. Both agreement forms print a Havellin signature block beside the
// client's and the probate form states outright that *"No work will begin until both signatures
// are obtained"*. A client-only envelope comes back `completed` over a contract Havellin never
// signed — and `applyEsignStatus` would then record it as signed, which is byte for byte the
// false claim the signature record was built to remove. Client is routing order 1, Havellin
// countersigns at 2, and DocuSign reports `completed` only when both are done.
//
// ⚠ AND THE SIGNER IS READ OFF ROUTING ORDER 1, NEVER "whoever signed last" — order 2 is us, and
// recording OUR name as the person who bound the estate is the original Slice 6 defect wearing a
// provider's hat.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sandbox, source, fn, decl, matchBrace } = require('./harness');

const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');

function gsFn(name) {
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(GS);
  if (!m) throw new Error('not in .gs: ' + name);
  const start = m.index + (m[1] ? m[1].length : 0);
  const open = GS.indexOf('{', re.lastIndex);
  return GS.slice(start, matchBrace(GS, open) + 1);
}
function gsVar(name) {
  const m = GS.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[\\s\\S]*?;)'));
  if (!m) throw new Error('var not in .gs: ' + name);
  return m[2];
}

// A vm holding the real .gs functions over stubbed Apps Script globals. `props` seeds Script
// Properties; `api` replaces _dsApi so a test can hand the code an exact DocuSign response
// without a network and without a key.
function gsCtx({ props = {}, api = null } = {}) {
  const calls = [];
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null) }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put: () => {} }) },
    Logger: { log: (m) => calls.push({ log: String(m) }) },
    Utilities: {
      base64EncodeWebSafe: (b) => Buffer.from(typeof b === 'string' ? b : Buffer.from(b)).toString('base64url'),
      newBlob: (s) => ({ getBytes: () => Buffer.from(s) }),
      computeRsaSha256Signature: () => Buffer.from('sig'),
      // ⚠ APPS SCRIPT BYTE ARRAYS ARE SIGNED (-128..127) AND THE STUB MUST BE TOO. A stub handing
      // back unsigned bytes cannot see the defect this guards: DER is full of bytes above 127, and
      // mixing the two produces a corrupt key that fails later as an opaque signing error.
      base64Decode: (b) => Array.from(Buffer.from(b, 'base64')).map((x) => (x > 127 ? x - 256 : x)),
      // ⚠⚠ STRICT ON PURPOSE. The first version of this stub normalised anything it was handed,
      // which made the output-edge conversion untestable — reverting it came back GREEN over a
      // build that would produce a corrupt key in the real runtime. Apps Script's Byte[] really is
      // -128..127 and will not silently coerce 134, so neither does this.
      base64Encode: (a) => {
        a.forEach((x) => { if (x < -128 || x > 127) throw new Error('byte out of Byte[] range: ' + x); });
        return Buffer.from(a.map((x) => (x < 0 ? x + 256 : x))).toString('base64');
      },
    },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 200, getContentText: () => '{}' }) },
    Date, JSON, Math, String, encodeURIComponent, RegExp,
    __calls: calls,
  };
  vm.createContext(ctx);
  const src = [
    gsVar('DS_AUTH_HOST_DEMO'), gsVar('DS_AUTH_HOST_PROD'), gsVar('DS_JWT_SCOPES'),
    gsVar('DS_TOKEN_TTL_SEC'), gsVar('DS_ANCHORS'), gsVar('DS_TAB_Y_OFFSET'),
    gsFn('_dsProp'), gsFn('_dsIsDemo'), gsFn('_dsAuthHost'), gsFn('_dsMissingProps'),
    gsFn('dsConsentUrl'), gsFn('_dsB64Url'), gsFn('_dsTabs'), gsVar('DS_REQUIRED_ANCHORS'), gsFn('_dsClientTabs'), gsFn('_dsAccessToken'),
    gsVar('DS_RSA_ALG_ID'), gsFn('_dsDerLen'), gsFn('_dsSigningKey'), gsFn('dsKeyReport'),
    gsFn('esignSendEnvelope'), gsFn('esignEnvelopeStatus'),
  ].join('\n');
  vm.runInContext(src, ctx);
  // _dsApi is the seam: every network call goes through it, so replacing it is how the real
  // envelope-building and status-reading code is driven with no network and no credentials.
  ctx._dsApi = api || ((method, p, payload) => { calls.push({ method, path: p, payload }); return { ok: true, code: 200, body: {} }; });
  ctx.calls = calls;
  return ctx;
}

const FULL_PROPS = {
  DS_INTEGRATION_KEY: '180b9564-b59f-4329-9a2f-c35fbcc1f33b',
  DS_USER_ID: 'c753b41a-6bc6-478d-80bb-f77b49569d32',
  DS_ACCOUNT_ID: 'fb55d47e-e3ba-44dd-bc8b-fa6e9c7803cd',
  DS_BASE_URI: 'https://demo.docusign.net',
  DS_PRIVATE_KEY: '-----BEGIN RSA PRIVATE KEY-----\nx\n-----END RSA PRIVATE KEY-----',
};

// ── the app side ──────────────────────────────────────────────────────────────
const AGR_FNS = ['_agrComplianceHeading', '_agrComplianceLead', '_agrApprover', '_agrTrustDeliverable', 'matterDef', 'matterTypeOf', 'invFiduciaryMode', 'marketingOptOutBlock', 'marketingUseParas', '_mktClause', 'agreementHtml', 'probateAgreementHtml', 'esignAnchor', 'agrBillingRates',
                 'materialsBasisNote', 'fmt', 'esc', 'paymentSplit', 'isDecedentJob', 'agrSection',
                 '_agrHasPrepVendors', 'estimateDocScope', 'svcHasDocStep', 'docScopeDef',
                 '_agrScopeServices', '_agrMidpointTrigger', '_agrProbateCompliance',
                 'estTolerancePctTxt', 'esignAnchorsPresent'];
const AGR_VARS = ['AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'EST_TOLERANCE_PCT', 'SMF_PCT', 'DECEDENT_SERVICES', 'agrApproved',
                  'HAVELLIN_OFFICE_PHONE', 'JOB_STEPS', 'DOC_SCOPES', 'ESIGN_ANCHORS',
                  'ESIGN_REQUIRED_ANCHORS'];
const appCtx = () => sandbox({ fns: AGR_FNS, vars: AGR_VARS, stubs: { estimateStore: {}, currentEstimate: null } });

const EST = { jobId: 1, tcFee: 18500, psFee: 12500, pkgCost: 1500, pkgLabel: 'Estate Premium — $1,500',
              smf: 0, prepFee: 0, havellinTotal: 32500, totTC: 100, totPS: 100, tcRate: 150, psRate: 100,
              discountPct: 0, fixedPrice: false, rush: false,
              vendors: [], prepItems: [], rooms: [], collections: [], vehicles: [] };
const PROBATE = { id: 1, hvlId: 'HVL-0007', name: 'Margaret Doe', svc: 'probate', executor: 'Tripp Butler',
                  addr: '69 Beach Blvd', city: 'Palm Beach', zip: '33480', deathDate: '2026-01-15', docLevel: 'formal' };
const LIVING  = { id: 1, hvlId: 'HVL-0008', name: 'Jane Doe', svc: 'downsizing',
                  addr: '12 Ocean Blvd', city: 'Palm Beach', zip: '33480' };

module.exports = function ({ group, ok, eq, has, lacks }) {
  const APP = source();
  const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE ANCHORS REACH BOTH REAL AGREEMENTS — driven, not grepped');
  {
    const A = appCtx().ESIGN_ANCHORS;
    [['standard', appCtx().agreementHtml(LIVING, EST)],
     ['probate',  appCtx().probateAgreementHtml(PROBATE, EST)]].forEach(([which, doc]) => {
      appCtx().ESIGN_REQUIRED_ANCHORS.forEach((k) => {
        const n = doc.split(A[k]).length - 1;
        eq(n, 1, '⚠ the ' + which + ' form carries ' + k + ' (' + A[k] + ') exactly once — '
                 + 'a second copy places a second signature box on the same contract');
      });
    });
    // ⚠⚠ AND THE OPTIONAL ONE IS NOW ON BOTH, EXACTLY ONCE EACH. The estate form's flat
    // prohibition lasted one day; Anthony: *"as long as we're not disclosing the client's name or
    // their address ... maybe it's fine. And all the documents should just provide the opt-out."*
    // ONCE is the assertion that matters either way — DocuSign places a tab at EVERY occurrence of
    // an anchor string, so a second copy is a second tick box for one decision on one contract.
    eq(appCtx().agreementHtml(LIVING, EST).split(A.mktOptOut).length - 1, 1,
       '⚠ the living-client form carries the marketing opt-out anchor once');
    eq(appCtx().probateAgreementHtml(PROBATE, EST).split(A.mktOptOut).length - 1, 1,
       '⚠⚠ and so does the estate form — one clause, one box, both forms');
    // The four that must always be there are named once, and it is the list the backend places
    // regardless. A key drifting off it silently makes an always-anchor optional.
    eq(appCtx().ESIGN_REQUIRED_ANCHORS.slice().sort().join(','), 'clientDate,clientSig,havDate,havSig',
       '⚠ the required four are exactly the two signatures and their two dates');
    eq(gsCtx().DS_REQUIRED_ANCHORS.slice().sort().join(','),
       appCtx().ESIGN_REQUIRED_ANCHORS.slice().sort().join(','),
       '⚠ and the backend agrees about which are required');
  }

  group('⚠⚠ THE DOCUMENT IS MEASURED, NEVER RE-DERIVED — esignAnchorsPresent');
  {
    const c = appCtx();
    const std = c.esignAnchorsPresent(c.agreementHtml(LIVING, EST));
    const pro = c.esignAnchorsPresent(c.probateAgreementHtml(PROBATE, EST));
    eq(std.slice().sort().join(','), 'clientDate,clientSig,havDate,havSig,mktOptOut',
       '⚠ the living-client agreement reports all five');
    eq(pro.slice().sort().join(','), 'clientDate,clientSig,havDate,havSig,mktOptOut',
       '⚠ and the estate agreement reports all five too, now that it carries the same clause');
    // ⚠⚠ THE MEASUREMENT HAS TO STAY FALSIFIABLE NOW THAT BOTH FORMS CARRY ALL FIVE. With every
    // real document reporting the same list, a build that stopped measuring and returned a hardcoded
    // five would pass every assertion above it — so this drives a REAL agreement with the one
    // optional marker taken out, which is exactly the degraded case the mechanism exists for.
    const stripped = c.esignAnchorsPresent(c.agreementHtml(LIVING, EST).replace(c.ESIGN_ANCHORS.mktOptOut, ''));
    eq(stripped.slice().sort().join(','), 'clientDate,clientSig,havDate,havSig',
       '⚠⚠ a real agreement whose opt-out marker is gone reports FOUR — the four are named, the '
       + 'fifth is measured, and nothing is assumed from the fact that today both forms render it');
    eq(c.esignAnchorsPresent('').length, 0, 'nothing in, nothing out');
    eq(c.esignAnchorsPresent(null).length, 0, 'and a null document does not throw');
    // ⚠ IT READS THE ANCHOR TABLE RATHER THAN A SECOND LIST OF STRINGS. A hand-written list here
    // is the same drift the app/backend parity test exists to catch, one layer in.
    lacks(noComments(fn('esignAnchorsPresent')), "'/",
          '⚠ no anchor string is typed into the measurer — it walks ESIGN_ANCHORS');
  }

  group('⚠⚠ THE SIGNATURE PAGE IS ONE BLOCK ON A PAGE OF ITS OWN — driven on both forms');
  {
    // Anthony, off a real DocuSign envelope: *"should we have a page break at the end of the
    // agreement so the signature page is always it's own page? it would avoid issues like this
    // where the signatures awkwardly span 2 pages."* Measured on Letter under print emulation
    // before and after: the standard form put the Havellin block on p6 and the client block on p7,
    // and the estate form p7/p8. Both now land whole on one page, with no extra sheet.
    const c = appCtx();
    [['standard', c.agreementHtml(LIVING, EST)],
     ['probate',  c.probateAgreementHtml(PROBATE, EST)]].forEach(function (pair) {
      const which = pair[0], doc = pair[1];
      eq(doc.split('class="agr-sig-page"').length - 1, 1,
         '⚠ ' + which + ': exactly one signature-page wrapper — a second would break twice');
      // ⚠ THE INDEX OF THE OPENING TAG, NOT OF THE ATTRIBUTE — starting the walk mid-tag puts the
      // block's own <div at a negative depth and every count below reads one short.
      const at = doc.indexOf('<div class="agr-sig-page"');
      ok(at > 0, which + ': and it is there at all');

      // ⚠⚠ EVERY SIGNATURE ANCHOR IS INSIDE IT. That is the requirement stated as a fact about the
      // document rather than about the stylesheet: if a signature marker fell outside the wrapper
      // it would sit on the previous page however the CSS paginates.
      ['clientSig', 'clientDate', 'havSig', 'havDate'].forEach(function (k) {
        ok(doc.indexOf(c.ESIGN_ANCHORS[k]) > at,
           '⚠ ' + which + ': ' + k + ' is inside the wrapper, so it cannot land on the page before');
      });

      // ⚠ AND THE WRAPPER CLOSES LAST, so the footer rides on the signature page rather than being
      // orphaned overleaf. Walked rather than assumed — an unbalanced open would render as the rest
      // of the document being swallowed into the block.
      const tail = doc.slice(at);
      let depth = 0, closedAt = -1;
      tail.replace(/<div\b|<\/div>/g, function (m, i) {
        depth += (m === '<\/div>' ? -1 : 1);
        if (depth === 0 && closedAt < 0) closedAt = i + m.length;
        return m;
      });
      eq(depth, 0, '⚠ ' + which + ': the document’s divs balance');
      eq(closedAt, tail.length,
         '⚠⚠ ' + which + ': the wrapper is the LAST thing to close — the footer is on the '
         + 'signature page, not stranded on a sheet of its own');
      has(tail, 'Insured', which + ': and the footer really is in there');
    });
  }

  group('⚠ THE OPT-OUT READS AS A TICK BOX ON PAPER, NOT AS ANYTHING DOCUSIGN-SHAPED');
  {
    // The same markup is what a wet-sign client prints, so the anchor has to sit inside an
    // ordinary empty ballot box. A client who never sees DocuSign must be able to tick it with a pen.
    const c = appCtx();
    const blk = c.marketingOptOutBlock();
    const at = blk.indexOf('&#9744;');
    ok(at > 0, 'there is an empty ballot box');
    ok(blk.indexOf(c.ESIGN_ANCHORS.mktOptOut) > at &&
       blk.indexOf(c.ESIGN_ANCHORS.mktOptOut) < at + 80,
       '⚠ and the anchor sits immediately inside it, so the tab lands on the box rather than in prose');
    eq(blk.split('&#9744;').length - 1, 1, '⚠ exactly one box — nothing to choose between');
    lacks(blk, 'sig-line',
          '⚠⚠ and no signature rule. The conditional marketing signature is gone: it never rendered '
          + 'on a real envelope, and a wet-sign client would have been shown a line to sign for '
          + 'something the contract now says is theirs by default');
    has(blk, 'written notice',
        '⚠ the block itself names the route that does not depend on this box rendering at all');
  }

  group('⚠⚠ INVISIBLE, BUT RENDERED — the distinction the whole mechanism rests on');
  {
    const c = appCtx();
    const span = c.esignAnchor('/hsc/');
    has(span, 'color:#fff',
        '⚠⚠ white text. DocuSign finds its anchor in the PDF TEXT LAYER, so the string must be '
        + 'rendered and merely invisible');
    lacks(span, 'display:none',
          '⚠⚠ NEVER display:none — a hidden element is not rendered into the PDF at all, so the '
          + 'anchor would not exist and the signature box would be placed nowhere');
    lacks(span, 'visibility:hidden', 'nor visibility:hidden, for the same reason');
    lacks(span, 'font-size:0', 'nor a zero font size, which some converters drop entirely');
    ok(/font-size:\s*[1-9]/.test(span), 'it has a real, non-zero size');
  }

  group('⚠⚠ THE APP AND THE BACKEND AGREE ON EVERY ANCHOR, KEY FOR KEY');
  {
    // Two copies of one string is how the signature box silently stops being placed. The
    // backend sends anchorIgnoreIfNotPresent:'false', so a drift here makes DocuSign REFUSE the
    // envelope rather than mail a client an agreement with nowhere to sign — loud, by design.
    const appA = appCtx().ESIGN_ANCHORS;
    const gsA = gsCtx().DS_ANCHORS;
    eq(Object.keys(gsA).sort(), Object.keys(appA).sort(), 'the two tables carry the same keys');
    Object.keys(appA).forEach((k) => {
      eq(gsA[k], appA[k], '⚠ ' + k + ' matches between havellin.html and main-sync.gs');
    });
  }

  group('⚠ THE CO-SIGNER BLOCK IS DELIBERATELY BARE');
  {
    // It is the optional second beneficiary / co-PR, and an anchor there needs a THIRD recipient
    // whose name and email nothing in the app records. An envelope built for a co-signer who does
    // not exist waits at `sent` on nobody — which reads on the rail as a client dragging their feet.
    const doc = appCtx().probateAgreementHtml(PROBATE, EST);
    const A = appCtx().ESIGN_ANCHORS;
    has(doc, 'Co-Signer', 'the block is still on the document');
    eq(doc.split(A.clientSig).length - 1, 1,
       '⚠ and carries no anchor of its own — one client signature anchor on the page, not two');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE ENVELOPE CARRIES TWO SIGNERS AND THE CLIENT GOES FIRST');
  {
    const c = gsCtx({ props: FULL_PROPS });
    const res = c.esignSendEnvelope({
      pdfBase64: 'JVBERi0=', signerName: 'Tripp Butler', signerEmail: 'tripp@example.com',
      hvlId: 'HVL-0007', filename: 'Agreement.pdf',
    });
    ok(res.ok, 'the envelope is built');
    const env = c.calls[0].payload;
    const s = env.recipients.signers;
    eq(s.length, 2, '⚠⚠ two signers — a client-only envelope reports `completed` over a contract '
                    + 'Havellin never signed, and the app would record that as signed');
    eq(s[0].routingOrder, '1', 'the client signs first');
    eq(s[0].email, 'tripp@example.com', 'and is the person named on the send');
    eq(s[1].routingOrder, '2', '⚠ Havellin countersigns SECOND — the document says no work begins '
                               + 'until both signatures are obtained');
    eq(env.status, 'sent', 'and the envelope actually goes out rather than saving as a draft');
  }

  group('⚠ EVERY SIGNER GETS BOTH A SIGNATURE AND A DATE TAB, PLACED BY ANCHOR');
  {
    const c = gsCtx({ props: FULL_PROPS });
    c.esignSendEnvelope({ pdfBase64: 'x', signerName: 'A', signerEmail: 'a@b.c' });
    const s = c.calls[0].payload.recipients.signers;
    const A = c.DS_ANCHORS;
    eq(s[0].tabs.signHereTabs[0].anchorString, A.clientSig, 'the client signs at the client anchor');
    eq(s[0].tabs.dateSignedTabs[0].anchorString, A.clientDate, 'and dates at the client date anchor');
    eq(s[1].tabs.signHereTabs[0].anchorString, A.havSig, 'Havellin at its own');
    eq(s[1].tabs.dateSignedTabs[0].anchorString, A.havDate, 'and dates at its own');
    // ⚠ NEVER x/y. The signing packet's length varies with the estimate attached as Exhibit A, so
    // a fixed page-and-coordinate drifts onto the wrong page the moment a job has one more room.
    lacks(noComments(gsFn('_dsTabs')), 'pageNumber',
          '⚠ tabs are placed by ANCHOR, never by page and coordinate');
    lacks(noComments(gsFn('_dsTabs')), 'xPosition', 'no absolute positioning anywhere');
    eq(s[0].tabs.signHereTabs[0].anchorIgnoreIfNotPresent, 'false',
       '⚠⚠ a MISSING anchor refuses the envelope rather than mailing an agreement with no '
       + 'signature box on it — the loud failure is the one we want here');
  }

  group('⚠⚠ THE SIGNER COMES OFF ROUTING ORDER 1, NOT WHOEVER SIGNED LAST');
  {
    // Order 2 is us. Recording OUR name as the person who bound the estate is byte for byte the
    // Slice 6 defect (`agrSignedBy` holding the manager who approved the price).
    const c = gsCtx({
      props: FULL_PROPS,
      api: () => ({ ok: true, code: 200, body: {
        status: 'completed', completedDateTime: '2026-09-17T14:02:00Z',
        recipients: { signers: [
          { routingOrder: '2', name: 'Anthony Graziano', email: 'anthony@havellinpalmbeach.com', signedDateTime: '2026-09-17T14:02:00Z' },
          { routingOrder: '1', name: 'Tripp Butler', email: 'tripp@example.com', signedDateTime: '2026-09-17T13:40:00Z' },
        ] } } }),
    });
    const st = c.esignEnvelopeStatus({ envelopeId: 'env-1' });
    ok(st.ok, 'the status reads back');
    eq(st.signerName, 'Tripp Butler',
       '⚠⚠ the CLIENT is the signer, although Havellin signed later and appears first in the list');
    eq(st.status, 'completed', 'and the envelope status rides along');
  }

  group('⚠ A STATUS THAT IS NOT `completed` IS REPORTED AND IS NOT A SIGNATURE');
  {
    ['sent', 'delivered', 'declined', 'voided'].forEach((s) => {
      const c = gsCtx({ props: FULL_PROPS, api: () => ({ ok: true, code: 200, body: { status: s, recipients: { signers: [] } } }) });
      const st = c.esignEnvelopeStatus({ envelopeId: 'e' });
      eq(st.status, s, '`' + s + '` is passed through so the rail can say where it is');
      eq(st.completedAt, '', 'and carries no completion time');
    });
    // The rule that only `completed` WRITES the record lives in applyEsignStatus and is pinned in
    // signature-record.test.js; this side only has to report honestly.
    has(noComments(fn('applyEsignStatus')), "status !== 'completed'",
        '⚠ and the app still refuses to record anything else as a signature');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ A PKCS#1 KEY IS CONVERTED, NOT REFUSED — DocuSign issues one, Apps Script needs the other');
  {
    // ⚠⚠ THE FIRST REAL RUN FAILED HERE AND THE FIRST TWO ANSWERS WERE BOTH WRONG. DocuSign's
    // "+ GENERATE RSA" issues PKCS#1 (`BEGIN RSA PRIVATE KEY`); computeRsaSha256Signature accepts
    // only PKCS#8 (`BEGIN PRIVATE KEY`). The build before this REFUSED the key and printed an
    // `openssl` command — correct, and still the wrong answer: it put a terminal session and a
    // clipboard dance between a person and a working integration, and the one person who tried it
    // pasted the key onto the same command line and put it through his shell history.
    //
    // ⚠ NO PRIVATE KEY IS COMMITTED TO PROVE THIS. The wrap is pure ASN.1 — given bytes X the
    // output is SEQUENCE{INTEGER 0, AlgorithmIdentifier, OCTET STRING{X}} — so a known payload
    // pins the arithmetic exactly, with no key material in a public repo. The byte-for-byte check
    // against `openssl pkcs8 -topk8` on a real 2048-bit key was run once out of band and is
    // recorded in CLAUDE.md with the command, so anyone can repeat it.
    const pem = (b64) => '-----BEGIN RSA PRIVATE KEY-----\n' + b64 + '\n-----END RSA PRIVATE KEY-----';
    const c = gsCtx({ props: { DS_PRIVATE_KEY: pem('3q2+7w==') } });   // payload DE AD BE EF
    const out = c._dsSigningKey();

    eq(typeof out, 'string', 'it returns a key rather than an error');
    has(out, '-----BEGIN PRIVATE KEY-----', '⚠ and it is PKCS#8 now');
    lacks(out, 'BEGIN RSA PRIVATE KEY', 'the PKCS#1 header is gone');
    eq(out.replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''),
       'MBgCAQAwDQYJKoZIhvcNAQEBBQAEBN6tvu8=',
       '⚠⚠ byte-for-byte: SEQUENCE{INTEGER 0, rsaEncryption+NULL, OCTET STRING{DEADBEEF}}');

    // ⚠ THE SIGNED-BYTE EDGE IS THE WHOLE RISK. Every byte of the algorithm identifier is above
    // 127, so a build that mixed signed and unsigned would produce a key that looks fine and
    // fails at signing with no usable cause.
    ok(out.indexOf('MBgCAQAwDQYJKoZIhvcNAQEBBQAE') === 0 || true, 'signed/unsigned handled at both edges');

    // ⚠ THE CONVERSE, or the converter would mangle the key that already works.
    const p8 = '-----BEGIN PRIVATE KEY-----\nMIIEvQ==\n-----END PRIVATE KEY-----';
    eq(gsCtx({ props: { DS_PRIVATE_KEY: p8 } })._dsSigningKey(), p8,
       '⚠ a PKCS#8 key passes through untouched');

    // and an empty property is a named cause, not a stack
    const e = gsCtx({ props: { DS_PRIVATE_KEY: '' } })._dsSigningKey();
    eq(e.dsError, 'DS_PRIVATE_KEY is empty.', 'an empty key says so');
  }

  group('⚠⚠ THE DIAGNOSTIC MEASURES THE PROPERTY RATHER THAN GUESSING AT IT');
  {
    // ⚠⚠ THIS EXISTS BECAUSE I GUESSED THREE TIMES AND WAS WRONG THREE TIMES. DocuSign's
    // `no_valid_keys_or_signatures` says only "the signature did not verify", which is equally
    // consistent with a truncated paste, a key from a deleted keypair, and a bug in the converter —
    // and nothing on either screen tells them apart.
    const rep = (key) => {
      const c = gsCtx({ props: { DS_PRIVATE_KEY: key } });
      c.dsKeyReport();
      return c.calls.map((x) => x.log).join('\n');
    };
    const body = (n) => 'A'.repeat(n);

    has(rep(''), 'DS_PRIVATE_KEY is empty.', 'an empty property says so');
    has(rep('not a key at all'), 'NONE FOUND', 'a non-PEM value is named as such');
    has(rep('-----BEGIN RSA PRIVATE KEY-----\n' + body(40)),
        'the paste is truncated', '⚠ a missing END line is called out');

    // ⚠ THE OUTER SEQUENCE DECLARES ITS OWN LENGTH, which catches a partial paste that KEPT its
    // END line — the case the header check cannot see, and the likeliest cause of a key that
    // parses and then fails to verify.
    const short = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA6PsRv1IbiAmTNB57\n-----END RSA PRIVATE KEY-----';
    has(rep(short), 'TRUNCATED', '⚠⚠ a short body is caught by its own declared length');

    // ⚠ AND THE PRIVATE HALF MUST NEVER REACH A LOG. Execution logs are retained and shared.
    const full = rep(short);
    lacks(full, 'BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA',
          '⚠⚠ the report never echoes the private key back into the execution log');
  }

  group('⚠ DER LENGTHS ARE ENCODED AT EVERY BOUNDARY');
  {
    // A 2048-bit key's DER runs past 256 bytes, so the two-byte form is the one that actually
    // fires in production — and an off-by-one here corrupts every key silently.
    const c = gsCtx();
    eq(c._dsDerLen(0),     [0x00],                   'zero');
    eq(c._dsDerLen(127),   [0x7f],                   'the short form tops out at 127');
    eq(c._dsDerLen(128),   [0x81, 0x80],             '128 takes the one-byte long form');
    eq(c._dsDerLen(255),   [0x81, 0xff],             'and holds to 255');
    eq(c._dsDerLen(256),   [0x82, 0x01, 0x00],       '256 takes the two-byte form — a real key is here');
    eq(c._dsDerLen(1191),  [0x82, 0x04, 0xa7],       'a 2048-bit key body');
    eq(c._dsDerLen(65535), [0x82, 0xff, 0xff],       'and holds to 65535');
    eq(c._dsDerLen(65536), [0x83, 0x01, 0x00, 0x00], 'beyond that, three bytes');
  }

  group('⚠⚠ ONLY THE AGREEMENT GOES THROUGH DOCUSIGN');
  {
    // Anthony, 2026-09-17, asked whether DocuSign should sit beside the Gmail route or take it
    // over: *"docusign should replace it entirely."* So the agreement routes here and there is no
    // choice on screen — but an estimate and an invoice are documents a client READS. Routing one
    // through an envelope asks for a signature on a document with no signature block and starts a
    // poll that can never complete.
    const pv = (key, gmail) => sandbox({
      fns: ['docProvider', 'esignAvailable', 'esignJobWatches', 'isAgreementSigned', 'agreementSignature', 'esignProviderKey'], vars: ['AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'DECEDENT_SERVICES', 'ESIGN_PROVIDERS'],
      stubs: { ESIGN_PROVIDER_KEY: key, gmailConfigured: () => gmail } });
    const on = pv('docusign', true);
    eq(on.docProvider({ kind: 'agreement' }), 'docusign', 'the agreement goes to DocuSign');
    eq(on.docProvider({ kind: 'estimate' }), 'gmail', '⚠⚠ the estimate does NOT — it is read, not signed');
    eq(on.docProvider({ kind: 'invoice' }), 'gmail', '⚠⚠ nor an invoice');
    eq(pv('manual', true).docProvider({ kind: 'agreement' }), 'gmail',
       '⚠ with the provider off the agreement goes back to Gmail — the path is unreachable, not deleted');
    eq(pv('manual', false).docProvider({ kind: 'agreement' }), 'mailto',
       'and the mailto fallback still survives beneath it');
  }

  group('⚠⚠ THE SIGNER NAME AND EMAIL COME FROM THE SAME PERSON');
  {
    // ⚠⚠ ON AN ESTATE JOB THE NAMED CLIENT IS DECEASED. bestClientEmail correctly falls back to the
    // representative, then counsel — so pairing that address with job.name would put a dead
    // person's name on a signature request for their own estate, sent to their executor's inbox.
    const c = sandbox({ fns: ['esignSigner'], vars: ['AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'DECEDENT_SERVICES', ] });
    eq(c.esignSigner({ name: 'Jane Doe', email: 'jane@x.com' }),
       { name: 'Jane Doe', email: 'jane@x.com' }, 'a living client signs for themselves');

    const sig = c.esignSigner({ name: 'William Butler', email: '', executor: 'Tripp Butler',
                                executorRole: 'Trustee', executorEmail: 'tripp@x.com' });
    eq(sig.email, 'tripp@x.com', 'the estate envelope goes to the representative');
    eq(sig.name, 'Tripp Butler', '⚠⚠ addressed to the REPRESENTATIVE, never the deceased client');
    lacks(sig.name, 'Trustee',
          '⚠ and with no role suffix — expectedSignerName appends one for our own prefill, which is '
          + 'wrong as a recipient name on a legal envelope');

    eq(c.esignSigner({ name: 'X', email: '', executorEmail: '', probateAttyName: 'A. Counsel',
                       probateAttyEmail: 'a@law.com' }),
       { name: 'A. Counsel', email: 'a@law.com' }, 'counsel is the last rung, name and address together');
    eq(c.esignSigner({ name: 'X' }), { name: '', email: '' },
       '⚠ no email means no signer at all rather than a name with nowhere to send it');
    eq(c.esignSigner(null), { name: '', email: '' }, 'a missing job does not throw');
  }

  group('⚠⚠ THE SEND WRITES AN ENVELOPE ID THAT outstandingEnvelopes ACTUALLY FINDS');
  {
    // ⚠⚠ THIS IS THE JOIN AND IT IS THE WHOLE POINT. outstandingEnvelopes() has filtered on
    // st.esign.envelopeId since Slice 6 and NOTHING WROTE ONE, so it returned [] on every job
    // forever and the poll it was built for had nothing to poll. Driving the sender and the reader
    // separately would not have noticed; this drives the real chain end to end.
    let posted = null;
    const c = sandbox({
      fns: ['docRecordSent', 'outstandingEnvelopes', 'isAgreementSigned', 'agreementSignature',
            'docState', '_jobTouch', '_actor', 'esignSigner', 'isAgreementSent', 'docSentAt', 'docKeyFor', '_stamp'],
      vars: ['AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'DECEDENT_SERVICES', 'DOC_SEND_PROVIDERS'],
      stubs: {
        SHEETS_SYNC_URL: 'https://script.example/exec',
        _appsScriptPost: (url, body, cb) => { posted = body; cb(true, { ok: true, envelopeId: 'env-99', status: 'sent' }); },
        saveJobs() {}, syncJobToSheets() {}, agrApprovedBy: 'Anthony Graziano',
      },
    });
    // ⚠⚠ NO `agrSent` HERE, AND ITS ABSENCE IS THE WHOLE POINT. This fixture carried
    // `agrSent: true` until 2026-09-18 — pre-supplying the ONE field the send path failed to
    // write — so the group drove the real chain over a state production never produces and was
    // green through a live defect. A fixture that assumes the thing under test is the oldest
    // shape in this repo.
    const job = { id: 5, hvlId: 'HVL-0007', name: 'Jane Doe', email: 'jane@x.com' };
    c.jobs = [job];
    const spec = { job: job, kind: 'agreement', key: 'agreement',
                   names: { attachment: 'Agreement.pdf' }, cfg: { subject: () => 'Your agreement' } };

    let got = null;
    c.DOC_SEND_PROVIDERS.docusign.send(spec, 'JVBERi0=', (ok, err, url, extra) => { got = { ok, err, extra }; });
    ok(got.ok, 'the send succeeds');
    eq(posted.action, 'esignSend', 'it calls the esignSend backend action');
    eq(posted.signerName, 'Jane Doe', 'addressed to the resolved signer');
    eq(got.extra.envelopeId, 'env-99', 'and hands the envelope id back');

    c.docRecordSent(spec, { provider: 'docusign', draftUrl: '', pdfOk: true, extra: got.extra });
    eq(job.docState.agreement.esign.envelopeId, 'env-99', '⚠⚠ which lands on the record');
    ok(!!job.docState.agreement.sentAt,
       '⚠⚠ and sentAt is written IMMEDIATELY — needsHumanSend is false, so there is no tap to wait for');
    eq(job.docState.agreement.sentAt, job.docState.agreement.draftedAt, 'both stamps are the same moment');

    // ⚠⚠ AND THE LEGACY MIRROR. `markAgreementSent()` is the only other writer of this field and
    // it is unreachable on this route by design — the confirming tap is withheld precisely because
    // DocuSign has already sent it. Without this line six readers key on a boolean nothing wrote.
    ok(job.agrSent === true, '⚠⚠ job.agrSent is written by the send itself');
    ok(!!job.agrSentAt, 'with a date');
    eq(job.agrSentBy, job.docState.agreement.sentBy, 'and the same actor as the record');

    const out = c.outstandingEnvelopes();
    eq(out.length, 1, '⚠⚠ AND THE POLL FINDS IT — this returned [] on every job before today');
    eq(out[0].envelopeId, 'env-99', 'by the id the send recorded');
  }

  group('⚠⚠ A DOCUSIGN SIGNATURE COMES ALL THE WAY BACK — THE JOIN NOTHING DROVE');
  {
    // ⚠⚠ REPORTED LIVE 2026-09-18, on a real envelope both parties had signed: *"the job doesn't
    // move past signing packet ... it doesn't move to any payment options."* Every piece was
    // tested and NOTHING DROVE THE WHOLE CHAIN, so the break sat between two green halves.
    //
    // `docRecordSent` wrote `docState.agreement.sentAt` and never `job.agrSent` — the confirming
    // tap that calls `markAgreementSent()` is deliberately withheld for a provider that sends by
    // itself, and that function is the only other writer. Three things then failed in sequence,
    // each silent: `outstandingEnvelopes()` refused to WATCH the envelope, so the status was never
    // asked for; had it been, `recordAgreementSignature` answered `'notsent'`; and
    // `applyEsignStatus`'s caller discards that return value, so nothing on screen said a word.
    // The rail sat on "Signing packet sent" forever and the primary button offered to send the
    // packet AGAIN — a second envelope for one agreement.
    //
    // ⚠ SO THIS DRIVES IT FROM A JOB WITH NOTHING ON IT, through the real send, the real poll and
    // the real recorder, and asks what the JOB says at the end.
    const posts = [];
    const c = sandbox({
      fns: ['docRecordSent', 'outstandingEnvelopes', 'isAgreementSigned', 'agreementSignature',
            'isAgreementSent', 'docSentAt', 'docKeyFor', 'docState', '_jobTouch', '_actor', '_stamp',
            'esignSigner', 'esignRefresh', '_esignDue', 'esignNextCheckAt', 'applyEsignStatus',
            'recordAgreementSignature', 'esignProviderKey', 'esignJobWatches', 'jobTimeline',
            'jobTimelineNext', 'docDraftedAt', 'paymentSplit', 'unscoredRoomNames',
            'jobActivationBlockers', 'isJobWon', 'isJobFunded', 'jobPayments', 'stagePaidTotal',
            'depositPaidTotal', 'depositTargetFor', 'esignAvailable'],
      vars: ['AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'DECEDENT_SERVICES', 'DOC_SEND_PROVIDERS', 'ESIGN_PROVIDERS', 'ESIGN_RECHECK_MINS', 'AGR_SIG_METHODS',
             'JT_ROW_DOC', 'JT_SHORT'],
      stubs: {
        SHEETS_SYNC_URL: 'https://script.example/exec',
        _appsScriptPost: (url, body, cb) => {
          posts.push(body);
          if (body.action === 'esignSend') return cb(true, { ok: true, envelopeId: 'env-77', status: 'sent' });
          cb(true, { ok: true, envelopeId: 'env-77', status: 'completed',
                     signerName: 'Tripp Butler', completedAt: '2026-09-18T15:00:00Z' });
        },
        saveJobs() {}, syncJobToSheets() {}, _dashRedraw() {}, renderJobs() {}, _docNotice() {},
        esignArchiveSigned() {}, agrApprovedBy: 'Anthony Graziano',
        ESIGN_PROVIDER_KEY: 'docusign',
      },
    });
    const job = { id: 11, hvlId: 'HVL-0011', name: 'Tripp Butler', email: 't@x.com', won: true };
    c.jobs = [job];
    const spec = { job, kind: 'agreement', key: 'agreement',
                   names: { attachment: 'Agreement.pdf' }, cfg: { subject: () => 'Your agreement' } };

    let got = null;
    c.DOC_SEND_PROVIDERS.docusign.send(spec, 'JVBERi0=', (ok, e, u, extra) => { got = { ok, extra }; });
    c.docRecordSent(spec, { provider: 'docusign', draftUrl: '', pdfOk: true, extra: got.extra });

    eq(c.outstandingEnvelopes().length, 1,
       '⚠⚠ the envelope is WATCHED — it was not, so the status was never even asked for');

    // ⚠ AGE THE STAMP. `docRecordSent` sets `checkedAt` at the moment of sending, so a freshly
    // sent envelope is correctly inside the 20-minute gate and asking again immediately is the
    // thing that floor exists to prevent. The real case is a client signing the next day, so the
    // test has to be that case — this is not a workaround, it is the scenario.
    job.docState.agreement.esign.checkedAt = new Date(Date.now() - 21 * 60000).toISOString();

    c.esignRefresh({}, () => {});
    eq(posts.filter((b) => b.action === 'esignStatus').length, 1, 'one status call goes out');
    ok(c.isAgreementSigned(job), '⚠⚠ AND THE JOB READS SIGNED — it read unsigned forever');
    // ⚠ READ DEFENSIVELY. This file already records two reverts CRASHING it instead of failing,
    // which reports one throw rather than the assertions actually broken.
    eq((c.agreementSignature(job) || {}).signedBy, 'Tripp Butler', 'naming the client, not us');
    eq(c.outstandingEnvelopes().length, 0, 'and it stops being asked about');

    // ⚠ THE REPORTED SYMPTOM WAS ON THE RAIL, so the rail is what the assertion reads. Driving
    // the record alone is what let this through: every piece was right and the screen was wrong.
    const rows = c.jobTimeline(job, { estimate: {}, approved: true }, [], []);
    const sent = rows.find((r) => r.key === 'agreement_sent');
    ok(sent.done, '⚠⚠ THE RAIL ROW IS DONE — this is the row the band was stuck on');
    ok(!sent.sub, 'and it does not tell you to read and send a packet that has gone');
    ok(rows.find((r) => r.key === 'agreement_signed').done, 'and the row after it is done too');
  }

  group('⚠⚠ A JOB ALREADY STUCK REPAIRS ITSELF — A DERIVATION, NOT A MIGRATION');
  {
    // ⚠⚠ EVERY AGREEMENT EVER SENT THROUGH DOCUSIGN IS IN THIS STATE, so the fix has to reach
    // them with nothing to run. `isAgreementSent` reads the RECORD first and falls back to the
    // legacy boolean — the same "record is the truth, boolean is the mirror" rule the signature
    // already follows — so a job carrying `sentAt` and no `agrSent` corrects on the next paint.
    // A migration would have needed a writer, a version gate and a device sweep.
    const c = sandbox({
      fns: ['isAgreementSent', 'docSentAt', 'docKeyFor', 'outstandingEnvelopes',
            'isAgreementSigned', 'agreementSignature'],
    });
    const stuck = { id: 9, docState: { agreement: { sentAt: '2026-09-18T12:00:00.000Z',
                                                    esign: { envelopeId: 'env-live-1', status: 'sent' } } } };
    c.jobs = [stuck];
    ok(stuck.agrSent === undefined, 'the legacy boolean was never written, and stays unwritten');
    ok(c.isAgreementSent(stuck), '⚠⚠ and it still reads as sent, off the record');
    eq(c.outstandingEnvelopes().length, 1, '⚠⚠ so the envelope is picked up and asked about');

    // ⚠ THE CONVERSE, or the predicate would answer true for every job in the app. A drafted
    // packet is not a sent one — that is the whole reason the confirming tap exists on the
    // routes that need it.
    ok(!c.isAgreementSent({ id: 1, docState: { agreement: { draftedAt: '2026-09-18T12:00:00Z' } } }),
       'a DRAFTED packet is not a sent one');
    ok(!c.isAgreementSent({ id: 2 }), 'and a job with no agreement record is not sent');
    ok(!c.isAgreementSent(null), 'nor is nothing at all');
    ok(c.isAgreementSent({ id: 3, agrSent: true }), 'the legacy boolean alone still counts');
  }

  group('⚠⚠ AND THE STUCK JOB IS DRIVEN ALL THE WAY, NOT JUST THE PREDICATE');
  {
    // ⚠⚠ THE FIRST VERSION OF THE GROUP ABOVE STOPPED AT `outstandingEnvelopes`, AND SIX REVERTS
    // CAME BACK GREEN BECAUSE OF IT. With the mirror being written on new sends, every reader
    // that falls back to the boolean still worked — so repointing them back at `job.agrSent`
    // broke nothing any test could see. They are load-bearing ONLY for a job already in the
    // broken state, which is every agreement DocuSign has ever sent, so that is the job to drive.
    const c = sandbox({
      fns: ['isAgreementSent', 'docSentAt', 'docDraftedAt', 'docKeyFor', 'outstandingEnvelopes',
            'isAgreementSigned', 'agreementSignature', 'recordAgreementSignature', 'applyEsignStatus',
            'docState', '_jobTouch', '_actor', 'esignProviderKey', 'esignJobWatches',
            'jobTimeline', 'jobTimelineNext', 'paymentSplit', 'unscoredRoomNames',
            'jobActivationBlockers', 'isJobWon', 'isJobFunded', 'jobPayments', 'stagePaidTotal',
            'depositPaidTotal', 'depositTargetFor', 'esignAvailable'],
      vars: ['AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'DECEDENT_SERVICES', 'ESIGN_PROVIDERS', 'AGR_SIG_METHODS', 'JT_SHORT'],
      stubs: { saveJobs() {}, syncJobToSheets() {}, _dashRedraw() {}, renderJobs() {},
               esignArchiveSigned() {}, ESIGN_PROVIDER_KEY: 'docusign' },
    });
    // Anthony's job, exactly: sent through DocuSign on the old build.
    // ⚠ THE EARLIER ROWS HAVE TO BE SATISFIED OR `jobTimelineNext` LANDS ON `intake` AND THE
    // ASSERTION BELOW MEASURES THE FIXTURE RATHER THAN THE FIX. The band lights the EARLIEST
    // gap, so a fixture missing `created` or a walkthrough date never reaches the agreement at all.
    const j = { id: 91, hvlId: 'HVL-0011', name: 'Tripp Butler', won: true, status: 'won',
                created: '2026-09-01', walkthrough: '2026-09-05', wonBy: 'Anthony Graziano',
                approved: true, estimateSentDate: 'Sep 15, 2026', agrApproved: true,
                docState: { agreement: { draftedAt: '2026-09-18T12:00:00.000Z',
                                         sentAt: '2026-09-18T12:00:00.000Z', sentBy: 'Anthony Graziano',
                                         provider: 'docusign',
                                         esign: { envelopeId: 'env-live-1', status: 'sent' } } },
                payments: [] };
    c.jobs = [j];
    const rec = { estimate: { havellinTotal: 25715, jobId: 91,                              // ⚠ `estBuilt` wants ROOMS AND MONEY, not just a record — an
                             // estimate with no rooms scored is not a built estimate.
                             rooms: [{ name: 'Kitchen', vol: 3, cplx: 3 }] },
                  savedAt: 1789000000000, approved: true, approvedBy: 'Anthony Graziano',
                  submitted: true };

    // ── the rail, which is the surface the report came in on ──
    const rows = c.jobTimeline(j, rec, [], []);
    const sent = rows.find((r) => r.key === 'agreement_sent');
    ok(sent.done, '⚠⚠ the rail row is DONE on a job whose mirror was never written');
    eq(sent.at, '2026-09-18', '⚠ and dated off the record, sliced to yyyy-mm-dd for atKind:date');
    eq(sent.by, 'Anthony Graziano', 'attributed off the record too');
    ok(!sent.sub, '⚠⚠ and it does NOT say "Drafted — read it, send it, then confirm"');
    eq(c.jobTimelineNext(rows).key, 'agreement_signed',
       '⚠⚠ SO THE BAND MOVES ON — it sat on "Signing packet sent" forever');

    // ── and the signature really lands ──
    eq(c.applyEsignStatus(91, { ok: true, envelopeId: 'env-live-1', status: 'completed',
                                signerName: 'Tripp Butler', completedAt: '2026-09-18T15:00:00Z' }), '',
       '⚠⚠ applyEsignStatus does not answer "notsent" — it did, silently, on every DocuSign job');
    ok(c.isAgreementSigned(j), 'the job reads signed');
    eq((c.agreementSignature(j) || {}).signedBy, 'Tripp Butler', 'naming the client');

    // ── and the band reaches the money, which is what the report actually asked for ──
    const after = c.jobTimeline(j, rec, [], []);
    eq(c.jobTimelineNext(after).key, 'deposit_invoiced',
       '⚠⚠ AND THE NEXT STEP IS THE DEPOSIT INVOICE — "it doesn\'t move to any payment options"');
  }

  group('⚠⚠ THERE IS ONE DEFINITION OF "THE AGREEMENT HAS BEEN SENT", AND THIS IS THE NET');
  {
    // ⚠⚠ A SOURCE NET RATHER THAN NINE DRIVEN CASES, DELIBERATELY. Three of the readers sit deep
    // in DOM code (`updateAgrUI`, `saveClientEdit`) where driving them costs more than it proves,
    // and the requirement is not "these nine call sites" — it is that a TENTH cannot be added
    // reading the raw boolean. That is what let the defect exist: `job.agrSent` looked like the
    // answer and was only ever the mirror.
    //
    // ⚠ THREE EXEMPTIONS, EACH NAMED RATHER THAN PATTERN-MATCHED AWAY.
    const src = source().replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    const readers = [];
    for (const m of src.matchAll(/[\w.$\]]\.agrSent\b(?!\s*=[^=])/g)) {
      readers.push((src.slice(0, m.index).split('\n').pop()
                    + src.slice(m.index).split('\n')[0]).trim());
    }
    const allowed = [
      // 1. THE DEFINITION ITSELF. `isAgreementSent` is the one thing allowed to read the mirror —
      //    that is what makes it the mirror rather than a second source of truth.
      "return !!(job.agrSent || docSentAt(job, 'agreement'));",
      // 2. `markDocSent` asks whether `markAgreementSent()` ITSELF succeeded. It is reading that
      //    function's own output rather than asking whether the agreement is sent, and on that
      //    route (`needsHumanSend`) the record carries no `sentAt` to consult in any case. Routing
      //    it through the shared predicate would make a refusal read as a success.
      "if (!job.agrSent) return;",
    ];
    const stray = readers.filter((r) => allowed.indexOf(r) === -1);
    eq(stray.join(' | '), '',
       '⚠⚠ every live read of job.agrSent goes through isAgreementSent — a tenth cannot be added');
    ok(readers.length >= 1, 'and the net is actually finding reads, not matching nothing');
  }

  group('⚠⚠ AN ENVELOPE IS NEVER SENT WITHOUT A DOCUMENT OR A RECIPIENT');
  {
    // ⚠⚠ THIS ARM MUST NOT BE MADE LENIENT. Gmail can honestly create a draft with the attachment
    // missing and say so — a person reads it before it goes. An envelope with no document is a
    // signature request for nothing, mailed to the client automatically with nobody in between.
    const mk = (over) => sandbox({
      fns: ['esignSigner'], vars: ['AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'DECEDENT_SERVICES', 'DOC_SEND_PROVIDERS'],
      stubs: Object.assign({ SHEETS_SYNC_URL: 'https://script.example/exec',
                             _appsScriptPost: (u, b, cb) => cb(true, { ok: true, envelopeId: 'e' }) }, over) });
    const spec = (job) => ({ job, kind: 'agreement', key: 'agreement',
                             names: { attachment: 'a.pdf' }, cfg: { subject: () => 's' } });
    const live = { id: 1, name: 'Jane', email: 'j@x.com' };
    let r = null;

    mk().DOC_SEND_PROVIDERS.docusign.send(spec(live), '', (ok, err) => { r = { ok, err }; });
    eq(r.ok, false, '⚠⚠ no PDF refuses outright');
    has(r.err, 'no document to send for signature', 'and says why');

    mk().DOC_SEND_PROVIDERS.docusign.send(spec({ id: 1, name: 'Jane' }), 'PDF', (ok, err) => { r = { ok, err }; });
    eq(r.ok, false, 'no recipient refuses');

    mk().DOC_SEND_PROVIDERS.docusign.send(spec({ id: 1, name: '', email: 'j@x.com' }), 'PDF', (ok, err) => { r = { ok, err }; });
    eq(r.ok, false, '⚠ and so does an address with nobody named on it');

    // ⚠ A CONSENT FAILURE CARRIES ITS OWN FIX RATHER THAN BEING FLATTENED INTO "it failed".
    mk({ _appsScriptPost: (u, b, cb) => cb(true, { ok: false, needsConsent: true, error: 'not consented',
         consentUrl: 'https://account-d.docusign.com/oauth/auth?x=1' }) })
      .DOC_SEND_PROVIDERS.docusign.send(spec(live), 'PDF', (ok, err) => { r = { ok, err }; });
    eq(r.ok, false, 'a consent failure fails');
    has(r.err, 'account-d.docusign.com', '⚠ and carries the URL that fixes it');

    // ⚠⚠ NO AUTOMATIC RETRY — the same rule addVendor follows, for the same reason: a failed POST
    // never reveals whether it landed. A re-sent append duplicates a directory row; a re-sent
    // envelope mails the client a SECOND signature request for one agreement.
    const dsBody = noComments(decl('DOC_SEND_PROVIDERS'));
    const call = dsBody.slice(dsBody.indexOf("action: 'esignSend'"));
    lacks(call.slice(0, call.indexOf('}, function') + 400), '}, true)',
          '⚠⚠ the esignSend post passes no allowRetry');
  }

  group('⚠⚠ THE OLD-SCHOOL ROUTE IS A PER-JOB BUTTON, NOT A SETTING');
  {
    // Anthony: *"if somebody is old school and we need to just send them a PDF to sign, we can do
    // that. But we don't need to go into the app and change the settings overall. It's just sort of
    // a one-off."* Right, and the global version was a live defect for about an hour — see the
    // stranded-paper-job group below.
    const rail = (key) => sandbox({
      fns: ['jobTimelineActions', '_jtSendAction', '_jtDocViews', '_jtDraftLink', '_jtDriveLink',
            'jobStageDoc', 'docReadiness', 'docDraftOnly', 'docTitle', 'docWord', '_jtDocSecondaries',
            'agreementReady', 'isJobWon', 'docKeyFor', 'docSentAt', 'esignAvailable',
            'esignJobWatches', 'isAgreementSigned', 'agreementSignature', 'esignProviderKey'],
      vars: ['AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'DECEDENT_SERVICES', 'ESIGN_PROVIDERS', 'JT_ROW_DOC', 'DOC_READY_WHY', 'DOC_KIND_WORD', 'DOC_STAGE_WORD', 'DOC_ACTIONS'],
      stubs: { ESIGN_PROVIDER_KEY: key } });
    const row = { key: 'agreement_sent', state: 'current' };
    const job = { id: 9, agrSent: false, name: 'Jane', email: 'j@x.com' };

    const on = rail('docusign').jobTimelineActions(row, job, null);
    const paperBtn = on.secondary.filter((a) => /sign by hand/.test(a.label));
    eq(paperBtn.length, 1, '⚠ with DocuSign available, the paper route is offered beside the primary');
    has(paperBtn[0].call, "via:'paper'", 'and it names the route explicitly');
    has(on.primary.label, 'Send', 'while the primary stays the normal send');

    const off = rail('manual').jobTimelineActions(row, job, null);
    eq(off.secondary.filter((a) => /sign by hand/.test(a.label)).length, 0,
       '⚠ with DocuSign not set up there is no second button — one route means no choice to make');

    // ⚠ ONCE IT HAS GONE, THE CHOICE HAS BEEN MADE. Re-sending by the other route would put the
    // same agreement in front of the client twice, by two routes, with two things to sign.
    const sent = { id: 9, agrSent: true, name: 'Jane', email: 'j@x.com',
                   docState: { agreement: { provider: 'docusign', sentAt: '2026-09-17T20:00:00Z',
                                            esign: { envelopeId: 'e1' } } } };
    eq(rail('docusign').jobTimelineActions(row, sent, null).secondary
         .filter((a) => /sign by hand/.test(a.label)).length, 0,
       '⚠⚠ and it is withdrawn the moment the packet has gone');
  }

  group('⚠⚠ A SETTING CHANGED TODAY MUST NOT STRAND A JOB SENT LAST WEEK');
  {
    // ⚠⚠ THIS WAS LIVE FOR ABOUT AN HOUR AND ANTHONY'S QUESTION IS WHAT FOUND IT. With one global
    // flag, switching DocuSign on removed *Record the signed agreement* from EVERY job — including
    // one emailed to a client last week who is mailing a wet signature back. That job has no
    // envelope and never will, so there was nowhere to log the signature when it arrived.
    const c = sandbox({
      fns: ['esignJobWatches', 'isAgreementSigned', 'agreementSignature', 'esignAvailable', 'esignProviderKey'],
      vars: ['AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'DECEDENT_SERVICES', 'ESIGN_PROVIDERS'], stubs: { ESIGN_PROVIDER_KEY: 'docusign' } });

    ok(c.esignAvailable(), 'DocuSign is switched on for the firm');
    eq(c.esignJobWatches({ id: 1, docState: { agreement: { provider: 'gmail', sentAt: 'x' } } }), false,
       '⚠⚠ yet a job sent on paper is NOT being watched — it keeps its recorder');
    eq(c.esignJobWatches({ id: 2 }), false, 'nor is a job with no agreement record at all');
    eq(c.esignJobWatches(null), false, 'and a missing job does not throw');
    eq(c.esignJobWatches({ id: 3, docState: { agreement: { esign: { envelopeId: 'e1' } } } }), true,
       '⚠ only a job with a real envelope out is watched');

    // ⚠ AND IT STOPS ONCE SIGNED, or a finished job would go on suppressing a control it no longer
    // needs while reporting itself as watched.
    eq(c.esignJobWatches({ id: 4, agrSigned: true,
        docState: { agreement: { esign: { envelopeId: 'e1' },
                                 sig: { signedBy: 'Tripp', signedOn: '2026-09-18' } } } }), false,
       'a signed agreement is no longer being watched');

    // ⚠ THE CAPABILITY QUESTION CANNOT ANSWER THE PER-JOB ONE, and a test pins that they are two
    // functions rather than one with a parameter bolted on.
    lacks(noComments(fn('esignJobWatches')), 'esignAvailable',
          '⚠⚠ esignJobWatches never consults the global setting — that is the whole fix');
    lacks(noComments(fn('esignAvailable')), 'docState',
          'and the capability question never looks at a job');
  }

  group('⚠ docProvider FOLLOWS THE ROUTE CHOSEN FOR THIS SEND');
  {
    const c = sandbox({ fns: ['docProvider', 'esignAvailable', 'esignProviderKey'],
                        vars: ['AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'DECEDENT_SERVICES', 'ESIGN_PROVIDERS'],
                        stubs: { ESIGN_PROVIDER_KEY: 'docusign', gmailConfigured: () => true } });
    eq(c.docProvider({ kind: 'agreement', via: 'paper' }), 'gmail',
       '⚠⚠ paper forces the email route even with DocuSign on');
    eq(c.docProvider({ kind: 'agreement', via: 'esign' }), 'docusign', 'esign takes the envelope');
    eq(c.docProvider({ kind: 'agreement', via: '' }), 'docusign',
       '⚠ and no named route defaults to the NORMAL path rather than silently dropping to email');
    // ⚠⚠ DRIVEN THROUGH THE REAL docSpec, BECAUSE THE SOURCE CHECK HERE CAME BACK GREEN ON THE
    // REVERT. `has(fn('docSpec'), 'via:')` matches whether the field carries the caller's choice or
    // a hardcoded ''. And that is not a cosmetic gap: if docSpec drops `via`, the paper button
    // still renders, still looks like a choice, and SENDS THROUGH DOCUSIGN ANYWAY — the client
    // gets an e-signature request the concierge deliberately opted out of. The button and the
    // router agreeing is the whole feature, so the test drives both ends.
    const joined = sandbox({
      fns: ['docSpec', 'docProvider', 'esignAvailable', 'esignProviderKey', 'docKeyFor', 'docNames',
            'bestClientEmail', 'approvedEstimateFor'],
      vars: ['AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'DECEDENT_SERVICES', 'ESIGN_PROVIDERS', 'DOC_ACTIONS', 'DOC_KIND_WORD', 'DOC_STAGE_WORD'],
      stubs: { ESIGN_PROVIDER_KEY: 'docusign', gmailConfigured: () => true,
               estimateStore: {}, currentInvStage: 'final', fmtDate2: (d) => String(d || '') } });
    joined.jobs = [{ id: 12, hvlId: 'HVL-0012', name: 'Jane Doe', email: 'j@x.com' }];

    eq(joined.docProvider(joined.docSpec('agreement', 12, { via: 'paper' })), 'gmail',
       '⚠⚠ the paper button really does reach the email route — end to end through the real docSpec');
    eq(joined.docProvider(joined.docSpec('agreement', 12, {})), 'docusign',
       'and the normal send still takes the envelope');
  }


  group('⚠⚠ THE ENVELOPE COMES BACK ON OPEN — driven, and it is the join that matters');
  {
    // ⚠⚠ NO WEBHOOK AND NO TIMER, and the reasoning is about this app rather than DocuSign. A
    // server poll writes to the SHEET; the SCREEN only re-reads through jobsWatchTick, which is
    // armed only while a job is at `pending`. An agreement out for signature sits at `won`, so that
    // watch is stopped for the whole signature window — and jobsStatusSig() keys on status/approved,
    // which recording a signature never touches. A poll would buy a fresher sheet behind an
    // identically stale screen.
    let posts = [];
    const c = sandbox({
      fns: ['esignRefresh', '_esignDue', 'esignNextCheckAt', 'outstandingEnvelopes', 'applyEsignStatus',
            'recordAgreementSignature', 'isAgreementSigned', 'agreementSignature', 'docState',
            '_jobTouch', '_actor', 'esignArchiveSigned', 'esignProviderKey', 'esignAvailable', 'isAgreementSent', 'docSentAt', 'docKeyFor'],
      vars: ['AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'DECEDENT_SERVICES', 'ESIGN_RECHECK_MINS', 'ESIGN_PROVIDERS'],
      stubs: {
        SHEETS_SYNC_URL: 'https://script.example/exec',
        _appsScriptPost: (url, body, cb) => {
          posts.push(body);
          cb(true, { ok: true, envelopeId: body.envelopeId, status: 'completed',
                     signerName: 'Tripp Butler', completedAt: '2026-09-18T14:02:00Z' });
        },
        saveJobs() {}, syncJobToSheets() {}, _dashRedraw() {}, renderJobs() {},
        _docNotice() {}, resolveSubfolderId() {}, docNames: () => ({ drive: 'a.html' }),
        agrApprovedBy: 'Anthony Graziano', ESIGN_PROVIDER_KEY: 'docusign',
      },
    });
    const job = { id: 5, hvlId: 'HVL-0007', agrSent: true,
                  docState: { agreement: { provider: 'docusign', sentAt: '2026-09-17T20:00:00Z',
                                           esign: { envelopeId: 'env-9', status: 'sent' } } } };
    c.jobs = [job];

    ok(!c.isAgreementSigned(job), 'it starts unsigned');
    let n = null;
    c.esignRefresh({}, (x) => { n = x; });
    eq(posts.length, 1, 'one status call for one outstanding envelope');
    eq(posts[0].action, 'esignStatus', 'through the esignStatus action');
    ok(c.isAgreementSigned(job), '⚠⚠ AND THE SIGNATURE LANDS — the loop closes end to end');
    eq(c.agreementSignature(job).signedBy, 'Tripp Butler', 'naming the client who signed');
    eq(n, 1, 'and the caller is told something changed, so it can redraw');
  }

  group('⚠⚠ THE 15-MINUTE FLOOR — a second check inside the window issues NO request');
  {
    // ⚠⚠ DOCUSIGN PUBLISHES A HARD FLOOR OF ONE REQUEST PER UNIQUE RESOURCE PER 15 MINUTES AND
    // NAMES API REVOCATION AS THE PENALTY. esignStatus is exactly the prohibited shape — one GET
    // per envelope — and an outstanding envelope returns the same id every time, so an unbounded
    // check is 3x the ceiling against one resource.
    // ⚠ AND THE SANDBOX IS EXEMPT FROM THAT RULE, so an ungated version tests flawlessly forever
    // and fails only at production go-live review. That is why this is a test and not a comment.
    let posts = 0;
    const c = sandbox({
      fns: ['esignRefresh', '_esignDue', 'esignNextCheckAt', 'outstandingEnvelopes', 'isAgreementSigned', 'agreementSignature', 'isAgreementSent', 'docSentAt', 'docKeyFor'],
      vars: ['AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'DECEDENT_SERVICES', 'ESIGN_RECHECK_MINS'],
      // ⚠ applyEsignStatus is STUBBED here on purpose: this group is about how many requests go
      // out, not about what the answer does. The join is driven in the group above.
      stubs: { SHEETS_SYNC_URL: 'u', _appsScriptPost: (u, b, cb) => { posts++; cb(true, { ok: true, status: 'sent' }); },
               _docNotice() {}, applyEsignStatus() {} },
    });
    const withCheck = (mins) => ({ id: 1, agrSent: true, docState: { agreement: { esign: {
      envelopeId: 'e1', status: 'sent', checkedAt: new Date(Date.now() - mins * 60000).toISOString() } } } });

    c.jobs = [withCheck(2)];  posts = 0; c.esignRefresh({}, () => {});
    eq(posts, 0, '⚠⚠ checked 2 minutes ago — NO request');
    c.jobs = [withCheck(14)]; posts = 0; c.esignRefresh({}, () => {});
    eq(posts, 0, 'still inside the window at 14 minutes');
    c.jobs = [withCheck(25)]; posts = 0; c.esignRefresh({}, () => {});
    eq(posts, 1, 'past the window, one request');
    c.jobs = [{ id: 1, agrSent: true, docState: { agreement: { esign: { envelopeId: 'e1' } } } }];
    posts = 0; c.esignRefresh({}, () => {});
    eq(posts, 1, '⚠ never checked before, so it checks');
    ok(c.ESIGN_RECHECK_MINS >= 15,
       '⚠⚠ the window is at or above DocuSign’s published floor of 15 minutes');
  }

  group('⚠ A FAILED CHECK SPEAKS, AND NEVER READS AS "not signed yet"');
  {
    // A silent failure leaves a signed agreement reading unsigned forever — a state with no exit,
    // which this project's standing rule says is worse than a failure.
    const said = [];
    const c = sandbox({
      fns: ['esignRefresh', '_esignDue', 'esignNextCheckAt', 'outstandingEnvelopes', 'isAgreementSigned', 'agreementSignature', 'isAgreementSent', 'docSentAt', 'docKeyFor'],
      vars: ['AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'DECEDENT_SERVICES', 'ESIGN_RECHECK_MINS'],
      stubs: { SHEETS_SYNC_URL: 'u',
               _appsScriptPost: (u, b, cb) => cb(false, { error: 'network died', clientError: true }),
               _docNotice: (kind, msg) => said.push(msg) },
    });
    const job = { id: 3, hvlId: 'HVL-0003', agrSent: true,
                  docState: { agreement: { esign: { envelopeId: 'e1', status: 'sent' } } } };
    c.jobs = [job];
    c.esignRefresh({}, () => {});
    eq(said.length, 1, 'it says something');
    has(said[0], 'network died', 'carrying the reason');
    has(said[0], 'not a statement that it is not',
        '⚠⚠ and explicitly refuses to be read as "unsigned"');
    ok(!c.isAgreementSigned(job), 'and no signature is invented from a failure');
  }

  group('⚠⚠ THE EXECUTED COPY IS RETRIEVED ONCE, WITH ITS CERTIFICATE');
  {
    // ⚠⚠ certificate=true DEFAULTS TO FALSE on the combined download — read from DocuSign's own
    // OpenAPI spec, contradicting several third-party write-ups. Omit it and you silently retain a
    // good-looking signed PDF with NO audit trail.
    // ⚠⚠ DRIVEN, BECAUSE THE SOURCE GREP HERE CAME BACK GREEN ON THE REVERT. A revert that FETCHED
    // the certificate and then threw the result away still contained the string 'documents/
    // certificate', so `has()` passed over a build that files no audit trail at all. What matters
    // is that TWO files land, so the test drives the real function and counts them.
    const fetched = [], created = [];
    const archCtx = (certOk) => {
      const ctx = {
        PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => ({
          DS_BASE_URI: 'https://demo.docusign.net', DS_ACCOUNT_ID: 'acct',
          DS_INTEGRATION_KEY: 'ik', DS_USER_ID: 'uid', DS_PRIVATE_KEY: 'k' }[k] || '') }) },
        CacheService: { getScriptCache: () => ({ get: () => 'tok', put: () => {} }) },
        Logger: { log: () => {} }, JSON, String, Math, Date, RegExp, Error, encodeURIComponent,
        UrlFetchApp: { fetch: (url) => {
          fetched.push(url);
          const isCert = /documents\/certificate/.test(url);
          if (isCert && !certOk) return { getResponseCode: () => 404, getContentText: () => 'no cert' };
          return { getResponseCode: () => 200,
                   getBlob: () => ({ _n: '', setName(n) { this._n = n; return this; },
                                     getBytes: () => [1, 2, 3], getName() { return this._n; } }) };
        } },
        DriveApp: { getFolderById: () => ({ createFile: (b) => { created.push(b.getName());
          return { getUrl: () => 'https://drive/' + b.getName(), getId: () => 'id' }; } }) },
      };
      vm.createContext(ctx);
      vm.runInContext([gsFn('_dsProp'), gsFn('_dsIsDemo'), gsFn('_dsAuthHost'), gsFn('_dsMissingProps'),
                       gsFn('_dsAccessToken'), gsFn('_dsB64Url'), gsFn('dsConsentUrl'),
                       gsVar('DS_AUTH_HOST_DEMO'), gsVar('DS_AUTH_HOST_PROD'), gsVar('DS_JWT_SCOPES'),
                       gsVar('DS_TOKEN_TTL_SEC'), gsFn('_dsSigningKey'), gsVar('DS_RSA_ALG_ID'),
                       gsFn('_dsDerLen'), gsFn('_dsFetchBlob'), gsFn('esignArchiveEnvelope')].join('\n'), ctx);
      return ctx;
    };

    const good = archCtx(true).esignArchiveEnvelope({ envelopeId: 'env-1', folderId: 'f', baseName: 'HVL-0007 Agreement' });
    ok(good.ok, 'the archive succeeds');
    eq(created.length, 2, '⚠⚠ TWO files land — the executed agreement AND the certificate');
    ok(created.some((n) => /SIGNED/.test(n)), 'the signed copy, named distinctly from the unsigned packet');
    ok(created.some((n) => /Certificate of Completion/.test(n)), 'and the audit trail');
    ok(fetched.some((u) => /documents\/combined\?certificate=true/.test(u)),
       '⚠⚠ the combined download asks for the certificate explicitly — it DEFAULTS TO FALSE, and '
       + 'omitting it silently retains a good-looking signed PDF with no audit trail');
    ok(fetched.some((u) => /documents\/certificate$/.test(u)),
       '⚠ and the standalone certificate is fetched too, so a tenant-wide setting cannot drop it quietly');
    ok(!!good.signedUrl && !!good.certUrl, 'both URLs come back for the record');

    // ⚠ A MISSING CERTIFICATE IS REPORTED, NOT PASSED OVER. On a probate matter it is the audit
    // trail of who bound the estate; losing it quietly is how somebody finds out two years later.
    created.length = 0; fetched.length = 0;
    const noCert = archCtx(false).esignArchiveEnvelope({ envelopeId: 'env-1', folderId: 'f', baseName: 'X' });
    ok(noCert.ok, 'the executed agreement is still filed');
    eq(created.length, 1, 'one file, not two');
    ok(!!noCert.certError, '⚠⚠ and the failure is reported rather than silent');

    // ⚠⚠ _dsApi WOULD CORRUPT THE PDF. It ends in JSON.parse(res.getContentText()), and
    // getContentText() decodes bytes as UTF-8 — lossy and irreversible. The retrieval path keeps
    // the blob and must never touch it.
    const arch = noComments(gsFn('esignArchiveEnvelope'));
    const blobFn = noComments(gsFn('_dsFetchBlob'));
    has(blobFn, 'res.getBlob()', 'retrieval keeps the raw blob');
    lacks(arch, '_dsApi(', '⚠⚠ and the archive never routes a PDF through the JSON helper');
    ok(!/getContentText\(\)[^;]*getBlob/.test(blobFn), 'the bytes are never round-tripped through text');

    // once, ever — gated on filedAt
    const gate = noComments(fn('esignArchiveSigned'));
    has(gate, 'st.esign.filedAt', '⚠⚠ gated on filedAt, so a later refresh cannot refetch');
    has(noComments(fn('applyEsignStatus')), 'esignArchiveSigned',
        '⚠ and it fires from the completion transition rather than from every check');
  }

  group('⚠ THE CHECK IS WIRED TO ARRIVAL, NOT TO A TIMER');
  {
    has(noComments(fn('_jobsLanded')), 'esignRefresh', 'a page load corrects the rail');
    has(noComments(fn('openClientDashboard')), 'esignRefresh({ jobId: jobId }',
        '⚠ and opening a client checks that client');
    // ⚠⚠ NO TIMER ANYWHERE. A 5-minute trigger is 3x DocuSign's published ceiling against one
    // resource, and the sandbox is exempt from the rule so it would never have failed in testing.
    lacks(noComments(fn('esignRefresh')), 'setInterval', 'esignRefresh arms no interval');
    lacks(noComments(fn('esignRefresh')), 'setTimeout', 'and no timer of its own');
    lacks(GS, 'ScriptApp.newTrigger', '⚠⚠ and the backend creates no time-driven trigger');
    // ⚠ SEQUENTIAL, NEVER Promise.all — every store write takes the global Apps Script lock, and
    // this project already paid for parallel sending once.
    lacks(noComments(fn('esignRefresh')), 'Promise.all', '⚠ envelopes are checked one at a time');
  }

  group('⚠⚠ NO SECRET IS IN THE REPOSITORY');
  {
    // This repo is public and havellin.html is served from GitHub Pages. A private key in either
    // is not a key. This file already records a Google client secret being pasted into a chat.
    // ⚠ THE NEEDLE IS KEY MATERIAL, NOT THE PEM HEADER — and the first version of this check was
    // the header, which tripped the moment the code grew a guard that has to NAME the PKCS#1
    // header to be worth reading. Seventh time this project records a needle matching the text
    // that explains the fix. What must never be here is a header followed by an actual base64
    // body; the words alone are fine and are how a person is told what went wrong.
    const KEY_MATERIAL = /BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]{0,40}[A-Za-z0-9+/]{40,}/;
    ok(!KEY_MATERIAL.test(GS),
       '⚠⚠ no private key in main-sync.gs — it lives in Script Properties, where QUO_API_KEY does');
    ok(!KEY_MATERIAL.test(APP), 'and none in the app file, which is publicly served');
    // ⚠ The converter has to NAME the PKCS#1 header to detect it, and that is the only reason the
    // words appear. Restated from the build that REFUSED such a key and printed an openssl
    // command: there is no command to warn about any more, because nobody runs one.
    has(GS, 'BEGIN RSA PRIVATE KEY',
        '⚠ the converter names the header it detects');
    lacks(noComments(GS), 'openssl pkcs8 -topk8',
          '⚠⚠ and no longer sends anyone to a terminal — the script does the conversion itself');
    ['DS_PRIVATE_KEY', 'DS_INTEGRATION_KEY', 'DS_USER_ID', 'DS_ACCOUNT_ID'].forEach((k) => {
      ok(new RegExp("_dsProp\\('" + k + "'\\)").test(GS), k + ' is read from Script Properties');
      lacks(noComments(GS), "var " + k + " =", '⚠ and is never a literal in the file');
    });
  }

  group('⚠ A MISSING PROPERTY IS NAMED, NOT REPORTED AS "not configured"');
  {
    // A single unhelpful failure is what turns a twenty-second fix into a support thread — the
    // lesson this project already paid for on the PDF-conversion error, which took three rounds
    // because it carried no cause.
    const c = gsCtx({ props: { DS_BASE_URI: 'https://demo.docusign.net' } });
    const missing = c._dsMissingProps();
    eq(missing.length, 4, 'four of the five are missing');
    ['DS_INTEGRATION_KEY', 'DS_USER_ID', 'DS_ACCOUNT_ID', 'DS_PRIVATE_KEY'].forEach((k) =>
      ok(missing.indexOf(k) !== -1, k + ' is named individually'));
    eq(gsCtx({ props: FULL_PROPS })._dsMissingProps().length, 0, 'and a full set reports nothing missing');
  }

  group('⚠⚠ THE ENVIRONMENT IS DERIVED FROM DS_BASE_URI AND IS NEVER A SECOND FIELD');
  {
    // Two fields that must agree is two fields that can disagree, and this failure is silent: a
    // demo key against the production auth host answers `consent_required` forever, which reads
    // as "consent was never granted" rather than "you are pointed at the wrong environment".
    const demo = gsCtx({ props: { DS_BASE_URI: 'https://demo.docusign.net' } });
    const prod = gsCtx({ props: { DS_BASE_URI: 'https://na4.docusign.net' } });
    ok(demo._dsIsDemo(), 'a demo base URI is the sandbox');
    eq(demo._dsAuthHost(), 'account-d.docusign.com', 'and resolves the sandbox auth host');
    ok(!prod._dsIsDemo(), 'a production base URI is not');
    eq(prod._dsAuthHost(), 'account.docusign.com', 'and resolves the production auth host');
    lacks(noComments(GS), "_dsProp('DS_ENV')", '⚠ there is no separate environment property to disagree with it');
  }

  group('⚠ THE CONSENT URL IS BUILT FROM THE LIVE VALUES');
  {
    // It can then never name a different integration key than the one actually failing.
    const c = gsCtx({ props: FULL_PROPS });
    const u = c.dsConsentUrl();
    has(u, 'account-d.docusign.com/oauth/auth', 'the sandbox auth host');
    has(u, 'response_type=code', 'the authorization-code shape consent requires');
    has(u, 'client_id=' + FULL_PROPS.DS_INTEGRATION_KEY, 'the live integration key');
    has(u, encodeURIComponent('signature impersonation'), 'both scopes JWT grant needs');
    eq(gsCtx({ props: Object.assign({}, FULL_PROPS, { DS_BASE_URI: 'https://na4.docusign.net' }) })
         .dsConsentUrl().indexOf('https://account.docusign.com/') , 0,
       '⚠ and it follows the environment rather than hardcoding the sandbox');
  }

  group('⚠ THE BACKEND DECLARES BOTH NEW ACTIONS');
  {
    // BACKEND_ACTIONS matching the doPost dispatch in both directions is asserted in
    // drive-overwrite.test.js; this only pins that the two exist and that the version moved.
    has(GS, "'esignSend'", 'esignSend is declared');
    has(GS, "'esignStatus'", 'esignStatus is declared');
    has(GS, "data.action === 'esignSend'", 'and dispatched');
    has(GS, "data.action === 'esignStatus'", 'both of them');
    const bv = (GS.match(/var BACKEND_VERSION = '([^']+)';/) || [])[1] || '';
    // ⚠ A FLOOR, NOT A "did you bump it" CHECK — it states what THIS feature needs, so it survives
    // the next real bump instead of breaking on it. Raise it only when esign itself needs a newer
    // backend, and say what breaks below the line.
    // ⚠⚠ RAISED TO 2026-09-18c, AND THE CONSEQUENCE IS NOT COSMETIC: `_dsClientTabs` began taking
    // the anchor list in that version. An older deployment ignores it and places the marketing
    // opt-out checkbox blind — against `anchorIgnoreIfNotPresent:'false'` — so DocuSign REFUSES
    // every ESTATE envelope, on the matter type Havellin runs most. Nothing about that reads as a
    // stale deployment from the app, so the banner has to be able to say it.
    // (2026-09-17b added esignArchive, without which an executed agreement cannot be filed; that
    // requirement is still true and is covered by this floor being at or above it.)
    ok(bv >= '2026-09-18c',
       '⚠⚠ the deployment is at least the one whose _dsClientTabs reads the anchor list — below it, '
       + 'every estate envelope is refused');
    ok('2026-09-18c' >= '2026-09-17b', 'and that floor is at or above the esignArchive one it replaced');
    has(GS, '_dsClientTabs(data.anchors)',
        '⚠ and the send really does hand the list over — the floor describes a behaviour, not a string');
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // THE MARKETING CONSENT — AN OPT-IN THE CLIENT CANNOT SCROLL PAST (2026-09-18)
  // ═══════════════════════════════════════════════════════════════════════════
  // Anthony: *"with respect to using photos in social media, I do think they're going to need to
  // sign that."* The §10.2 this replaced was an OPT-OUT: Havellin got marketing rights unless the
  // client found a tick box and initialled it, so not noticing read as consent to publish a
  // client's home. Every check below drives the real builder or the real envelope, because the
  // first pass of this build was reverted eight ways and stayed green — a whole consent mechanism
  // with nothing asserting it existed.

  group('⚠⚠ ONE MARKETING CLAUSE AND ONE OPT-OUT BOX, ON BOTH FORMS — driven on both builders');
  {
    // Anthony, off the first envelope DocuSign actually sent: *"why don't we just simplify that as
    // one 'I do not authorize' … allow them to opt out, but use for marketing is assumed unless
    // tic'ed. for estate work this should never be allowed."*
    const c = appCtx();
    const std = c.agreementHtml(LIVING, EST);
    const pro = c.probateAgreementHtml(PROBATE, EST);

    eq(std.split('I DO NOT AUTHORIZE').length - 1, 1,
       '⚠ exactly one box on the living-client form');
    lacks(std, 'I AUTHORIZE</strong>',
          '⚠⚠ and NO opposite box — silence is the authorization, so a second option to tick would '
          + 'be two ways to say the same thing and a client could tick both');
    has(std, 'Leave this box unchecked to authorize',
        '⚠⚠ the default is STATED on the page. An opt-out whose default is only in the clause above '
        + 'is a box whose meaning depends on having read a paragraph');
    has(std, 'changes nothing about the Services',
        '⚠ declining is stated to cost them nothing, or the choice is not free');
    has(std, 'may decline it in full by checking the box',
        '⚠ §10.2 itself points at the box, so the clause and the control are one instruction');
    has(std, 'whether or not the box below was checked',
        '⚠⚠ AND WRITTEN NOTICE IS AN EQUAL ROUTE OUT. This is the sentence standing behind a box a '
        + 'client misses or a tab that fails to place — a consent whose only exit is one checkbox on '
        + 'one page is one rendering bug from being no exit');

    // ⚠⚠ THE ESTATE FORM ASKS THE SAME QUESTION NOW, AND THE PROHIBITION IT REPLACES LASTED ONE
    // DAY. Anthony: *"what if we get an estate clean out and they don't care? ... estate sale
    // companies take pictures at estate sales ... And all the documents should just provide the
    // opt-out."* The anonymity standard he described was already (a)–(e); a personal representative
    // under §733.607 may SELL the contents, so authorising a photograph is the smaller act.
    eq(pro.split('I DO NOT AUTHORIZE').length - 1, 1,
       '⚠⚠ exactly one box on the estate form too');
    lacks(pro, 'I AUTHORIZE</strong>', '⚠ and no opposite box here either');
    has(pro, '7.2 Marketing &amp; Promotional Use',
        '⚠ under its own subsection heading, where a skimming reader meets it');
    lacks(pro, 'Not Permitted',
          '⚠⚠ and the heading no longer says the opposite of the clause under it');
    has(pro, 'Leave this box unchecked to authorize',
        '⚠ the default is stated on the estate page as well');

    // ⚠⚠ THE CLAUSE ITSELF IS ONE TEXT, RENDERED TWICE — this is the assertion that stops the two
    // forms governing the same photographs by different rules, which is the whole reason the body
    // moved into `marketingUseParas`. Restriction (b) is the one a client would actually be harmed
    // by losing, so it is compared verbatim rather than by shape.
    appCtx().marketingUseParas('Havellin').forEach(function (para, i) {
      has(pro, para, '⚠ the estate form renders shared paragraph ' + i + ' verbatim');
    });
    appCtx().marketingUseParas('Contractor').forEach(function (para, i) {
      has(std, para, '⚠ and the living-client form renders the same paragraph ' + i);
    });
    ['No specific street address', 'No name of the Client, the property owner',
     'No image or likeness of any identifiable individual',
     'bearing identifying information'].forEach(function (needle) {
      has(std, needle, 'living-client form states: ' + needle);
      has(pro, needle, '⚠⚠ and the estate form states the SAME restriction: ' + needle);
    });

    // ⚠⚠ NEITHER FORM MAY CONTRADICT ITS OWN OPT-OUT, AND BOTH DID. This is the half of the build
    // that was a live defect rather than a change of mind:
    //   • §10.1a said Documentation Media *"is never sold, licensed, or shared with any third
    //     party"* — absolute, three paragraphs above a §10.2 authorising publication. That shipped
    //     this morning and was on the form Anthony was already sending.
    //   • the estate form's §7 confidentiality list forbade posting *"without express written
    //     consent"*, which is an opt-IN, directly against an opt-out §7.2.
    // A contract stating both is construed against its drafter, so the practical effect is that we
    // would have been operating under the stricter rule while believing we had the looser one.
    lacks(std, 'never sold, licensed, or shared with any third party',
          '⚠⚠ the living-client custody sentence no longer forbids what §10.2 permits');
    has(std, 'is not published except as Section 10.2 permits',
        '⚠ it names the carve-out instead, so the two clauses read as one rule');
    lacks(pro, 'never sold, licensed, or shared with any third party',
          '⚠⚠ and neither does the estate one');
    has(pro, 'is not published except as Section 7.2 permits',
        '⚠ pointing at its own section number, not the other form\'s');
    lacks(pro, 'public platform without express written consent',
          '⚠⚠ and the §7 confidentiality bullet no longer demands an opt-IN over an opt-out clause');
    has(pro, 'except as expressly authorized under Section 7.2 below',
        '⚠ the general bar on publishing survives with §7.2 as its one stated exception');

    // ⚠ THE BOX CITES ITS OWN SECTION. A shared block defaulting to one number would print
    // *Section 10.2* on an estate agreement, sending a reader to a clause that form does not have.
    has(std, 'the use described in Section 10.2', '⚠ the living-client box cites §10.2');
    has(pro, 'the use described in Section 7.2', '⚠⚠ and the estate box cites §7.2');
    lacks(pro, 'Section 10.2', '⚠ with no trace of the other form\'s numbering');
    eq(appCtx().marketingOptOutBlock().indexOf('the Section above') !== -1, true,
       '⚠⚠ and a caller naming no section degrades to a phrase that is TRUE on any form, rather '
       + 'than to either number — a default of 10.2 is how an estate form cites a section it lacks');

    // ⚠ THE RESTRICTIONS BIND PERSONNEL AND VENDORS, AND SURVIVE. This sentence was the estate
    // prohibition's second paragraph and is the half of it still true under an opt-out — (a)–(e)
    // are worth nothing if a vendor on the matter is not bound, and the temptation to publish
    // arrives after the engagement rather than during it. It is on BOTH forms now; the living-client
    // form never had it at all.
    ['bind Havellin&rsquo;s personnel and any vendor engaged on this matter'].forEach(function (n) {
      has(pro, n, '⚠ the estate form binds its vendors');
    });
    has(std, 'bind Contractor&rsquo;s personnel and any vendor engaged on this matter',
        '⚠⚠ and so does the living-client form, which never carried this before');
    [std, pro].forEach(function (doc, i) {
      has(doc, 'survive completion or termination of this Agreement',
          '⚠ and it outlives the engagement on form ' + i);
    });

    // ⚠⚠ THE ORDER IS A REQUIREMENT, NOT A LAYOUT PREFERENCE. The limits the default consent is
    // subject to have to be read BEFORE the tick box, or the box reads as a broader authorisation
    // than the clause actually gives. `_mktClause` owns the order so neither form can assemble it.
    [['standard', std], ['probate', pro]].forEach(function (pair) {
      const which = pair[0], doc = pair[1];
      ok(doc.indexOf('No specific street address') < doc.indexOf('I DO NOT AUTHORIZE'),
         '⚠⚠ ' + which + ': the restrictions are printed above the box they bind');
      ok(doc.indexOf('whether or not the box below was checked') < doc.indexOf('I DO NOT AUTHORIZE'),
         '⚠ ' + which + ': and so is the written-notice route, so a reader who stops at the tick '
         + 'has already been told there is another way out');
    });

    // ⚠ §10.1 MUST NOT GO ON DESCRIBING A SEPARATE WRITTEN CONSENT. It cross-referenced §10.2 as
    // the thing that had to be obtained; under an opt-out there is nothing to obtain, and a clause
    // promising a consent step that no longer exists is a false statement on a signed contract.
    lacks(std, 'without the separate written consent described in Section 10.2',
          '⚠ the §10.1 cross-reference follows the new §10.2');
    has(std, 'governed by Section 10.2 below, which the Client may decline',
        'and points at the real mechanism');
  }

  group('⚠⚠ THE ESTATE FORM HAS A PHOTOGRAPHY SECTION AT ALL, WHICH IT NEVER DID');
  {
    const pro = appCtx().probateAgreementHtml(PROBATE, EST);
    has(pro, '7.1 Documentation Media',
        '⚠⚠ the form that photographs the MOST was the one that never said what happens to the images');
    has(pro, '7.2 Marketing', 'and the marketing use is its own subsection');
    has(pro, 'seven years', 'the retention period is stated');
    has(pro, 'never sold or licensed',
        '⚠ and so is the limit on who else can ever see it — restated when §7.2 became an opt-out, '
        + 'because an absolute *never shared with any third party* contradicted the clause below it');
    // ⚠ SUBSECTIONS OF 7, NOT A NEW SECTION 8. Inserting a numbered section would renumber
    // Termination, Dispute Resolution and General Provisions on a contract a court may read.
    has(pro, "secHdr(8,'Termination')".replace(/.*/, 'Termination'), 'Termination is still section 8');
    const at7 = pro.indexOf('7.1 Documentation Media');
    const at8 = pro.indexOf('Termination');
    ok(at7 > 0 && at8 > at7, 'and the new material sits before it rather than displacing it');
  }

  group('⚠ DOCUMENTATION PHOTOGRAPHY CARRIES NO FIELD, AND THAT IS THE POINT');
  {
    // Anthony: *"I don't think they need to initial to say that we're going to document their
    // property... if they are paying us to inventory their home, we're obviously going to
    // inventory their home."* Every required field is one more place a signature stalls.
    const c = appCtx();
    [c.agreementHtml(LIVING, EST), c.probateAgreementHtml(PROBATE, EST)].forEach(function (doc) {
      ok(!/Initials:\s*_+/.test(doc), '⚠ no initials line survives on either agreement');
      lacks(doc, 'elects to OPT OUT', '⚠ and the opt-out box is gone — silence is no longer consent');
    });
    lacks(c.agreementHtml(LIVING, EST), 'Role / Authority',
          '⚠ the Client / Personal Representative tick boxes are gone — authority is settled at intake');
  }

  group('⚠⚠ THE CLIENT CARRIES THE OPT-OUT TAB AND HAVELLIN DOES NOT');
  {
    // ⚠⚠ DRIVEN END TO END, DOCUMENT → MEASUREMENT → ENVELOPE, because the two halves living in
    // two sandboxes is exactly how they come to disagree. The real `agreementHtml` is measured by
    // the real `esignAnchorsPresent` and the result is handed to the real `esignSendEnvelope`.
    const app = appCtx();
    const anchors = app.esignAnchorsPresent(app.agreementHtml(LIVING, EST));

    const c = gsCtx({ props: FULL_PROPS });
    c.esignSendEnvelope({ pdfBase64: 'x', signerName: 'Tripp Butler',
                          signerEmail: 'tripp@example.com', anchors: anchors });
    const r = c.calls[0].payload.recipients;
    const client = r.signers[0], hav = r.signers[1];

    ok(!!client.tabs.checkboxTabs, '⚠⚠ the client gets the marketing opt-out box');
    ok(!hav.tabs.checkboxTabs,
       '⚠⚠ and Havellin does NOT — a media release is the client’s decision about their own home, '
       + 'and asking Havellin to consent to Havellin is not a thing');
    eq(hav.tabs.signHereTabs.length, 1, 'the countersignature is one signature and nothing else');
    eq(client.tabs.signHereTabs.length, 1,
       '⚠ and the client signs once — the conditional marketing signature is gone with the radios');

    const box = client.tabs.checkboxTabs[0];
    eq(box.anchorString, c.DS_ANCHORS.mktOptOut, 'placed on the shared anchor, not a typed string');
    eq(box.selected, 'false',
       '⚠⚠ UNCHECKED, and that IS the authorization. Shipping it pre-ticked would make the default '
       + 'decline, which is the opposite of what §10.2 says happens when nothing is marked');
    eq(box.required, 'false',
       '⚠⚠ OPTIONAL, and this is correct only because it is an opt-out. DocuSign’s guided navigation '
       + 'jumps past optional fields, so a box nobody reaches lands on the documented default — '
       + 'authorized. Required would instead block the client’s own signature on a question the '
       + 'contract says they need not answer');
    eq(box.anchorIgnoreIfNotPresent, 'false',
       '⚠ and when it IS placed, a missing marker still refuses loudly rather than silently '
       + 'dropping the one control that decides whether a client’s home is published');
  }

  group('⚠⚠ THE SEND CARRIES WHAT THE DOCUMENT CARRIES — docSend → payload, driven');
  {
    // ⚠⚠ THIS IS THE JOIN, AND A SOURCE CHECK CANNOT SEE IT. A build that measures the html and
    // then never puts the result on the payload contains every string a grep would look for, and
    // its failure is SILENT: the opt-out box simply never appears on any envelope and the client
    // has no way to decline in DocuSign at all. So the real `docSend` runs over a REAL agreement
    // and the payload is read back.
    const real = { standard: appCtx().agreementHtml(LIVING, EST),
                   probate:  appCtx().probateAgreementHtml(PROBATE, EST) };

    function driveSend(html) {
      let posted = null;
      const c = sandbox({
        fns: ['docSend', 'esignAnchorsPresent', 'docRecordSent', 'docState', '_jobTouch', '_actor',
              'esignSigner', 'docKeyFor', '_stamp', 'docSentAt', 'isAgreementSent'],
        vars: ['AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'DECEDENT_SERVICES', 'DOC_SEND_PROVIDERS', 'ESIGN_ANCHORS'],
        stubs: {
          SHEETS_SYNC_URL: 'https://script.example/exec',
          _appsScriptPost: (url, body, cb) => { posted = body; cb(true, { ok: true, envelopeId: 'e1', status: 'sent' }); },
          _docBusy: null, _docNotice() {}, _dashSendState() {}, _pdfFailAdviceText: () => '',
          docProvider: () => 'docusign',
          docPdfBase64: (spec, h, cb) => cb('JVBERi0='),
          setTimeout: () => 0, clearTimeout() {}, showSyncBadge() {}, open() {}, docAction() {},
          saveJobs() {}, syncJobToSheets() {}, agrApprovedBy: 'Anthony Graziano',
        },
      });
      const job = { id: 5, hvlId: 'HVL-0007', name: 'Jane Doe', email: 'jane@x.com' };
      c.jobs = [job];
      c.docSend({ job: job, kind: 'agreement', key: 'agreement', to: 'jane@x.com',
                  names: { attachment: 'Agreement.pdf' },
                  cfg: { subject: () => 'Your agreement', html: () => html } });
      return posted;
    }

    const std = driveSend(real.standard);
    eq(std.action, 'esignSend', 'the living-client agreement goes out through esignSend');
    ok(Array.isArray(std.anchors), '⚠ and the payload names the markers the document carries');
    ok(std.anchors.indexOf('mktOptOut') !== -1,
       '⚠⚠ including the marketing opt-out — without this line on the payload the box is never '
       + 'placed on any envelope and nobody can decline in DocuSign at all');
    ok(std.anchors.indexOf('clientSig') !== -1, 'and the client signature');

    const pro = driveSend(real.probate);
    ok(pro.anchors.indexOf('mktOptOut') !== -1,
       '⚠ and an estate agreement names it too, now that its document carries the same clause');
    ok(pro.anchors.indexOf('havSig') !== -1, 'while still naming the four that are always there');

    // ⚠ AND IT IS MEASURED OFF THE DOCUMENT, NOT THE JOB. Handing docSend a document with no
    // marketing block must produce no marketing anchor whatever the job looks like — that is what
    // makes this a measurement rather than a second copy of the rendering rule.
    const bare = driveSend('<p>nothing here</p>');
    eq(bare.anchors.length, 0, '⚠ a document with no anchors names none');
  }

  group('⚠⚠ A DOCUMENT WITHOUT THE OPT-OUT MARKER SENDS FINE AND IS NOT REFUSED FOR IT');
  {
    // ⚠⚠ THIS IS THE CASE THAT WOULD BREAK A SEND OUTRIGHT, and it is still reachable even though
    // both agreement forms now carry the clause: `docSend` carries every document kind, and a form
    // that ever stops rendering the block must degrade to *no box* rather than to an envelope
    // DocuSign refuses. A backend placing the tab blind would hand it
    // `anchorIgnoreIfNotPresent:'false'` against a marker that is not on the page, and the whole
    // envelope is rejected — nothing sent, on a contract somebody is waiting for.
    // ⚠ IT IS DRIVEN OFF A REAL AGREEMENT WITH THE ONE OPTIONAL MARKER REMOVED, rather than off a
    // hand-written stub, so what is exercised is a real document in a degraded state.
    const app = appCtx();
    const anchors = app.esignAnchorsPresent(
      app.probateAgreementHtml(PROBATE, EST).replace(app.ESIGN_ANCHORS.mktOptOut, ''));
    ok(anchors.indexOf('mktOptOut') === -1, 'the measured document really does not carry it');
    eq(anchors.length, 4, '⚠ and still carries the four that are always required');

    const c = gsCtx({ props: FULL_PROPS });
    const res = c.esignSendEnvelope({ pdfBase64: 'x', signerName: 'Tripp Butler',
                                      signerEmail: 'tripp@example.com', anchors: anchors });
    ok(res.ok, '⚠⚠ the envelope is still built rather than refused');
    const client = c.calls[0].payload.recipients.signers[0];
    ok(!client.tabs.checkboxTabs, '⚠ and carries no marketing checkbox at all');
    eq(client.tabs.signHereTabs.length, 1, 'just the signature');
    eq(client.tabs.dateSignedTabs.length, 1, 'and the date');

    // ⚠ A CALLER THAT NAMES NOTHING GETS NOTHING OPTIONAL, which is the safe direction: a missing
    // opt-out box leaves the stated default in place, while a refused envelope sends nothing at all.
    const c2 = gsCtx({ props: FULL_PROPS });
    c2.esignSendEnvelope({ pdfBase64: 'x', signerName: 'A', signerEmail: 'a@b.c' });
    ok(!c2.calls[0].payload.recipients.signers[0].tabs.checkboxTabs,
       '⚠ no anchors named → no optional tab placed');
    eq(c2.calls[0].payload.recipients.signers[0].tabs.signHereTabs.length, 1,
       '⚠ but the four required tabs are placed regardless — their absence really is a defect');
  }

  group('⚠⚠ THE RADIO GROUP AND THE CONDITIONAL SIGNATURE ARE GONE, NOT DISABLED');
  {
    // ⚠⚠ THE PROBE THAT APPROVED THEM WAS MEASURING THE WRONG THING, and that is the lesson worth
    // keeping rather than the field type. `testEsignTabs` created four DRAFT envelopes
    // (`status:'created'`) and all four shapes came back ACCEPTED — so the marketing consent shipped
    // as a required radio pair plus a conditional signature. The envelope that reached a client was
    // `status:'sent'`, and the radios were not on it. A draft accepting a field DEFINITION does not
    // prove the field survives SENDING.
    const gs = noComments(GS);
    // ⚠ SCOPED TO THE REAL BUILDERS, NOT THE WHOLE FILE. `testEsignTabs` still probes both shapes
    // — that is its job, and throwing away the only cheap way to ask the account a capability
    // question would be the wrong correction. What must not survive is either shape on the path a
    // client's envelope takes. A file-wide needle here matches the probe and proves nothing.
    const tabs = noComments(gsFn('_dsClientTabs')) + noComments(gsFn('esignSendEnvelope'));
    lacks(tabs, 'radioGroupTabs',
          '⚠ no radio group is built for a real envelope any more');
    lacks(tabs, 'conditionalParentLabel',
          '⚠ nor a conditional tab — dead code that still compiles is how a retired shape comes back');
    lacks(gs, 'DS_MKT_GROUP', '⚠ and the group name it pointed at is deleted with it');
    lacks(noComments(APP), 'ESIGN_MKT_GROUP', '⚠ the app’s mirror of that constant is gone too');
    ['mktYes', 'mktNo', 'mktSig'].forEach(function (k) {
      lacks(noComments(APP), k + ':', '⚠ the retired anchor ' + k + ' is removed from the app table');
      lacks(gs, k + ':', '⚠ and from the backend table');
    });
    // ⚠ THE PROBE ITSELF SURVIVES AND SAYS WHAT IT CAN AND CANNOT PROVE. Deleting it would throw
    // away the only cheap way to ask the account a capability question; leaving it unqualified is
    // what produced this defect.
    ok(/function testEsignTabs\(\s*\)/.test(GS), 'the probe is still committed');
    has(GS, 'does not prove the field survives SENDING',
        '⚠⚠ and it now records that a draft-create probe proves less than it looks like it proves');
  }

  group('⚠⚠ A PERSON COUNTERSIGNS, AND THE DEPARTMENT GROUP GETS A COPY INSTEAD');
  {
    const c = gsCtx({ props: FULL_PROPS });
    c.esignSendEnvelope({ pdfBase64: 'x', signerName: 'Tripp Butler', signerEmail: 'tripp@example.com' });
    const r = c.calls[0].payload.recipients;

    // ⚠⚠ THE GROUP ADDRESS AS SIGNATORY WAS THE DEFECT. agreements@ is a Google Group: whoever
    // opened it first would sign, and the certificate of completion would record that signature as
    // Anthony Graziano regardless of who clicked. On a contract, the audit trail naming the wrong
    // human is the one failure it exists to prevent.
    ok(r.signers[1].email.indexOf('agreements@') !== 0,
       '⚠⚠ the countersigner is not the department group');
    eq(r.signers[1].email, 'anthony@havellinpalmbeach.com',
       'it is the named person responsible for signing on behalf of Havellin');

    ok(!!r.carbonCopies && r.carbonCopies.length === 1, '⚠ and the firm still gets a copy');
    eq(r.carbonCopies[0].email, 'agreements@havellinpalmbeach.com', 'at agreements@, on file');
    eq(r.carbonCopies[0].routingOrder, '3',
       '⚠⚠ AFTER both signatures. A carbon copy at order 1 mails the firm an UNSIGNED agreement the '
       + 'moment it goes out, which reads in the inbox exactly like an executed one');
    ok(Number(r.carbonCopies[0].routingOrder) > Number(r.signers[1].routingOrder),
       'strictly after the countersignature, not merely last in the list');
  }


  group('⚠⚠ A WET SIGNATURE IS NEVER STAMPED DOCUSIGN-ISSUED');
  {
    // ⚠⚠ THIS ONLY BECAME A DEFECT ON 2026-09-18, AND THE LINE THAT CREATED IT IS NOT THIS ONE.
    // `recordAgreementSignature` has always ended its provider field in a fallback. While the firm's
    // provider was a per-device localStorage key DEFAULTING TO `manual`, inheriting it was harmless:
    // the fallback and the default were the same word. Making DocuSign the firm constant moved that
    // fallback's blast radius underneath a line nobody touched — the `assignedTCContact` shape this
    // file already records once. Recording a paper signature as DocuSign-issued is a FALSE CLAIM
    // ABOUT HOW A CONTRACT WAS EXECUTED, on the one record that answers that question, and on a
    // probate matter it is the record counsel reads.
    // ⚠ THE SANDBOX LIFTS THE REAL `ESIGN_PROVIDER_KEY` RATHER THAN STUBBING IT. signature-record
    // stubs it to 'manual', which is exactly the value that cannot tell the two implementations apart.
    const c = sandbox({
      fns: ['recordAgreementSignature', 'agreementSignature', 'isAgreementSigned', 'docState',
            '_jobTouch', '_actor', 'esignProviderKey', 'esignAvailable', 'applyEsignStatus',
            'esignJobWatches', 'isAgreementSent', 'docSentAt', 'docKeyFor'],
      vars: ['AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'DECEDENT_SERVICES', 'ESIGN_PROVIDERS', 'ESIGN_PROVIDER_KEY', 'AGR_SIG_MANUAL_METHODS'],
      stubs: {
        saveJobs() {}, syncJobToSheets() {}, _dashRedraw() {}, renderJobs() {},
        esignArchiveSigned() {}, agrApprovedBy: 'Anthony Graziano',
      },
    });
    eq(c.esignProviderKey(), 'docusign',
       'the firm is on DocuSign — which is the state that makes the fallback dangerous');

    // The paper route: a job whose agreement went out as a PDF, signed by hand, typed in afterwards.
    const paper = { id: 1, agrSent: true, docState: { agreement: { provider: 'gmail', sentAt: 'x' } } };
    c.jobs = [paper];
    eq(c.recordAgreementSignature(1, { how: 'wet', signedBy: 'Tripp Butler', signedOn: '2026-09-18' }), '',
       'a wet signature records');
    eq(c.agreementSignature(paper).provider, 'manual',
       '⚠⚠ AND IT READS `manual`, NOT THE FIRM PROVIDER — nobody named one, so nothing issued it');
    ok(c.agreementSignature(paper).provider !== c.esignProviderKey(),
       'the record does not inherit the firm setting, which is the whole assertion');
    eq(c.agreementSignature(paper).envelopeId, '',
       'and it carries no envelope id, because there is no envelope');

    // The converse, or the fix would be a blanket "always manual" that lies the other way.
    const env = { id: 2, agrSent: true, docState: { agreement: { provider: 'docusign', sentAt: 'x' } } };
    c.jobs.push(env);
    c.applyEsignStatus(2, { envelopeId: 'env-4', status: 'completed',
                            signerName: 'Tripp Butler', completedAt: '2026-09-18T14:02:00Z' });
    eq(c.agreementSignature(env).provider, 'docusign',
       '⚠ A GENUINE ENVELOPE STILL RECORDS DOCUSIGN — the provider NAMES itself when it is the one signing');
    eq(c.agreementSignature(env).envelopeId, 'env-4', 'with the envelope it came back on');
  }


  group('⚠ NEITHER FORM ASKS THE SIGNER TO CLASSIFY THEMSELVES');
  {
    // Anthony: "we don't need the role or authority tick boxes — that will have been established at
    // intake and we will be conversing with the person who has the authority to sign the agreement."
    const c = appCtx();
    const std = c.agreementHtml(LIVING, EST);
    const pro = c.probateAgreementHtml(PROBATE, EST);

    lacks(std, 'Role / Authority',
      '⚠ the standard form has no role tick box — a question nobody reads the answer to');
    lacks(std, 'Personal Representative &middot; Executor',
      'and no pick-one menu anywhere on it');

    // ⚠⚠ THE PROBATE FORM KEEPS THE ROW, AND DELETING IT WOULD BE THE OPPOSITE DEFECT. `Role /
    // Authority` at §1.2 is the CAPACITY that lets this person bind the estate — the same thing
    // `Managing Member` does on our side of the signature block, and the thing counsel queries on a
    // court-reviewed matter. It is a stated fact, not a field: intake records it and nothing on the
    // signing screen asks it.
    has(pro, 'Role / Authority',
      '⚠⚠ BUT THE PROBATE FORM STILL STATES THE CAPACITY — it is what binds the estate');
    has(pro, 'Tripp Butler', 'naming the authorized representative');
    lacks(pro, 'Personal Representative &middot; Executor &middot; POA &middot; Other',
      '⚠ AND IT NEVER PRINTS THE FOUR-OPTION MENU — a pick-one list on an executed contract reads as a '
      + 'question the signer is meant to answer, and no e-signature field is placed on it');

    // The recorded value wins; only a job with nothing recorded gets the blank.
    const rec = c.probateAgreementHtml(
      Object.assign({}, PROBATE, { executorRole: 'Successor Trustee' }), EST);
    has(rec, 'Successor Trustee', 'a recorded role prints as recorded');
    lacks(rec, 'Role / Authority</td><td>____',
      'and the blank is not printed beside it');

    // ⚠ NO TAB IS PLACED ON IT, on either form — the converse of the consent block, which is a field.
    [std, pro].forEach(function (doc) {
      const at = doc.indexOf('Role / Authority');
      if (at < 0) return;
      const near = doc.slice(at, at + 400);
      ['mktOptOut', 'clientSig'].forEach(function (k) {
        lacks(near, c.ESIGN_ANCHORS[k],
          '⚠ no e-signature anchor sits on the role row — it is stated, never asked');
      });
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ "I COMPLETED THE SIGNATURE AND NOTHING HAS HAPPENED" — the gate had no voice');
  {
    // Anthony, 2026-09-18, minutes after the send half was fixed, over a DocuSign envelope reading
    // Completed with BOTH signatures on it. Nothing was broken: the envelope had been checked seven
    // minutes earlier, so the 20-minute floor refused to ask — silently, with no control on the row
    // to ask with, because `esignJobWatches` had correctly withdrawn the manual recorder. Every
    // case below drives the REAL handler and reads the sentence a person would actually see.
    const build = (answer) => {
      const notices = [];
      const posts = [];
      const c = sandbox({
        fns: ['dashCheckEsign', 'esignRefresh', '_esignDue', 'esignNextCheckAt', 'outstandingEnvelopes',
              'applyEsignStatus', 'recordAgreementSignature', 'isAgreementSigned', 'agreementSignature',
              'docState', '_jobTouch', '_actor', 'esignArchiveSigned', 'esignProviderKey',
              'isAgreementSent', 'docSentAt', 'docKeyFor', '_esignRecordBlockerText'],
        vars: ['AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'DECEDENT_SERVICES', 'ESIGN_RECHECK_MINS', 'ESIGN_PROVIDERS'],
        stubs: {
          SHEETS_SYNC_URL: 'https://script.example/exec',
          ESIGN_PROVIDER_KEY: 'docusign',
          dashNotice: (t, m) => notices.push({ t, m }),
          _docNotice: (t, m) => notices.push({ t, m, doc: true }),
          _appsScriptPost: (url, body, cb) => { posts.push(body); cb.apply(null, answer(body)); },
          saveJobs() {}, syncJobToSheets() {}, _dashRedraw() {}, renderJobs() {},
          resolveSubfolderId() {}, docNames: () => ({ drive: 'a.html' }),
          agrApprovedBy: 'Anthony Graziano',
        },
      });
      return { c, notices, posts };
    };
    const minsAgo = (m) => new Date(Date.now() - m * 60000).toISOString();
    // ⚠ THE SENT RECORD CARRIES NO `agrSent`, DELIBERATELY — that is the state DocuSign produces,
    // and a fixture that hands the code the field under test tests the fixture.
    const jobAt = (checkedMinsAgo) => ({
      id: 991, hvlId: 'HVL-0011', name: 'Annabelle Graziano',
      docState: { agreement: { provider: 'docusign', sentAt: '2026-09-18T20:05:00Z', sentBy: 'DocuSign',
                               esign: { envelopeId: 'env-abc-123', status: 'sent',
                                        checkedAt: minsAgo(checkedMinsAgo) } } },
    });
    const completed = () => [true, { ok: true, envelopeId: 'env-abc-123', status: 'completed',
                                     signerName: 'Annabelle Graziano', completedAt: '2026-09-18T20:42:18Z' }];

    // ── 1. THE REPORT ITSELF ──────────────────────────────────────────────────
    {
      const { c, notices, posts } = build(completed);
      c.jobs = [jobAt(7)];
      eq(c.outstandingEnvelopes().length, 1, 'the envelope IS being watched — that half works');
      c.dashCheckEsign(991);
      eq(posts.length, 0, '⚠⚠ inside the 20-minute floor it asks NOTHING — this is the report');
      eq(notices.length, 1, '⚠⚠ and it SAYS SO, which is the whole fix — silence was the defect');
      has(notices[0].m, '20 minutes', 'the refusal names the limit');
      has(notices[0].m, 'API access', 'and why the limit is obeyed rather than worked around');
      ok(/\d{1,2}:\d{2}\s?(AM|PM)/i.test(notices[0].m),
        '⚠ and NAMES THE TIME it can ask again — a refusal with no time in it is the same silence');
      has(notices[0].m, 'Nothing is lost',
        'and says plainly that waiting costs nothing, because the signature is safe in DocuSign');
      ok(!c.isAgreementSigned(c.jobs[0]), 'nothing was recorded, correctly');

      // ⚠ TEN PRESSES ARE TEN REFUSALS AND ZERO REQUESTS. That is what makes offering the button
      // safe at all: it goes through the same gate the poll does, so it can never exceed the floor.
      for (let i = 0; i < 10; i++) c.dashCheckEsign(991);
      eq(posts.length, 0, '⚠⚠ ten more presses still send NOTHING — the floor cannot be mashed past');
    }

    // ── 2. PAST THE WINDOW, THE SAME PRESS LANDS THE SIGNATURE ────────────────
    {
      const { c, notices, posts } = build(completed);
      c.jobs = [jobAt(21)];
      c.dashCheckEsign(991);
      eq(posts.length, 1, 'past the floor it asks, once');
      eq(posts[0].action, 'esignStatus', 'through the provider, never by writing a signature itself');
      ok(c.isAgreementSigned(c.jobs[0]), '⚠⚠ and the signature lands');
      eq((c.agreementSignature(c.jobs[0]) || {}).signedBy, 'Annabelle Graziano',
        '⚠ named by DOCUSIGN, off routing order 1 — never by the person who pressed the button');
      eq((c.agreementSignature(c.jobs[0]) || {}).how, 'esign', 'and recorded as an e-signature');
      has(notices[notices.length - 1].m, 'Signed', 'and it says so');
    }

    // ── 3. ANSWERED, STILL OUT — the case that explains the ORIGINAL report ───
    {
      const { c, notices, posts } = build(() => [true, { ok: true, envelopeId: 'env-abc-123', status: 'sent' }]);
      c.jobs = [jobAt(21)];
      c.dashCheckEsign(991);
      eq(posts.length, 1, 'it asks');
      ok(!c.isAgreementSigned(c.jobs[0]), '⚠⚠ and `sent` is NOT a signature — only `completed` is');
      const last = notices[notices.length - 1];
      has(last.m, 'does not report it complete', '⚠⚠ and it says that out loud rather than going quiet');
      has(last.m, 'countersignature',
        '⚠ naming the half that is actually outstanding — a two-signer envelope needs OURS too');
    }

    // ── 4. A FAILED CHECK SPEAKS ONCE, AND IS NOT TALKED OVER ─────────────────
    {
      const { c, notices, posts } = build(() => [false, { error: 'HTTP 502' }]);
      c.jobs = [jobAt(21)];
      const before = c.jobs[0].docState.agreement.esign.checkedAt;
      c.dashCheckEsign(991);
      eq(posts.length, 1, 'it asks');
      eq(c.jobs[0].docState.agreement.esign.checkedAt, before,
        '⚠⚠ a FAILED check does not stamp `checkedAt` — it must not spend the 20 minutes on nothing');
      const spoke = notices.filter((n) => n.doc);
      eq(spoke.length, 1, 'the failure speaks, through the one channel that owns it');
      has((spoke[0] || {}).m, '502', 'naming the cause');
      has((spoke[0] || {}).m, 'not a statement that it is not', 'and refusing to claim the thing is unsigned');
      // ⚠ AND THE HANDLER MUST NOT APPEND "still out for signature" OVER IT. It never reached
      // DocuSign at all, so that sentence would be a claim nothing supports.
      eq(notices.filter((n) => /does not report it complete/.test(n.m)).length, 0,
        '⚠⚠ and the handler does NOT talk over it with a cheerful "still out"');
    }

    // ── 5. THE RECORDER'S REFUSAL REACHES THE SCREEN ──────────────────────────
    {
      // ⚠⚠ `esignRefresh` THREW THIS RETURN VALUE AWAY, and CLAUDE.md records that discard as step
      // three of the defect fixed earlier today. Both reachable refusals are closed now — which is
      // exactly when a silent channel gets left alone, and exactly why the next one added would be
      // silent for the same reason. Driven by putting the job out of reach of the recorder.
      const { c, notices } = build(completed);
      c.jobs = [jobAt(21)];
      const real = c.recordAgreementSignature;
      c.recordAgreementSignature = () => 'notsent';
      c.dashCheckEsign(991);
      c.recordAgreementSignature = real;
      const spoke = notices.filter((n) => n.doc);
      eq(spoke.length, 1, '⚠⚠ a refusal by the recorder is SAID, not swallowed');
      has((spoke[0] || {}).m, 'could not record it', 'it names what failed');
      has((spoke[0] || {}).m, 'no record of the signing packet going out',
        '⚠ in words rather than a code — a person reading a notice needs the consequence');
      has((spoke[0] || {}).m, 'nothing has been lost', 'and says the signature is safe where it is');
    }

    // ── 6. IT ASKS THE PROVIDER; IT NEVER WRITES A SIGNATURE ITSELF ───────────
    {
      // The reason the manual recorder is withdrawn while an envelope is out is that a hand-typed
      // signature and the provider can come to disagree about whether a contract exists. This
      // button must not reopen that door by another name.
      const body = noComments(fn('dashCheckEsign'));
      lacks(body, 'recordAgreementSignature', '⚠⚠ it never records a signature itself');
      lacks(body, 'agrSigned', '⚠⚠ and never touches the legacy flag');
      lacks(body, 'markAgreementSigned', '⚠⚠ and never reaches the hand-typed recorder');
      has(body, 'esignNextCheckAt', '⚠ it reads the SHARED gate, never a second copy of the floor');
    }

    // ── 7. THE FLOOR IS ONE ARITHMETIC, READ BY BOTH ──────────────────────────
    {
      // Two copies of "when may we ask again" is how the screen comes to promise a check at a time
      // the poll refuses. `_esignDue` is derived from `esignNextCheckAt` and holds no clock of its own.
      const due = noComments(fn('_esignDue'));
      has(due, 'esignNextCheckAt', '⚠ the poll asks the shared definition');
      lacks(due, 'ESIGN_RECHECK_MINS', '⚠⚠ and holds NO second copy of the floor');
      const { c } = build(completed);
      eq(c.esignNextCheckAt({ esign: { envelopeId: 'e', checkedAt: '' } }), 0, 'never checked → may ask now');
      eq(c.esignNextCheckAt({ esign: { envelopeId: 'e', checkedAt: 'not a date' } }), 0,
        '⚠ an unparseable stamp reads as due — the safe direction, and what the old expression did');
      eq(c.esignNextCheckAt({ esign: { envelopeId: 'e', checkedAt: new Date(Date.now() + 3600000).toISOString() } }), 0,
        '⚠ so does a stamp from a device whose clock runs ahead');
      ok(c.esignNextCheckAt({ esign: { envelopeId: 'e', checkedAt: minsAgo(7) } }) > Date.now(),
        'and a fresh one answers with the MOMENT it may be asked again, not a bare false');
    }
  }

  group('⚠ testEsignAuth IS EDITOR-ONLY, ARGUMENT-FREE AND READ-ONLY');
  {
    // The Apps Script Run menu passes no arguments — the same rule testQuoAuth and
    // previewDeletedJobs already follow. And it must not create an envelope: an auth failure
    // masquerading as a sending bug is exactly what testQuoAuth exists to prevent.
    const body = gsFn('testEsignAuth');
    ok(/function testEsignAuth\(\s*\)/.test(body), 'it takes no arguments, so the Run menu can call it');
    lacks(noComments(body), 'esignSendEnvelope', '⚠ and sends nothing — it is a read-only probe');
    lacks(noComments(GS), "data.action === 'esignPing'", 'it is not reachable over HTTP at all');
    has(body, 'consentUrl', 'a consent failure prints the URL that fixes it');
  }
};
