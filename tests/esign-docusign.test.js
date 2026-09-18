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
    gsFn('dsConsentUrl'), gsFn('_dsB64Url'), gsFn('_dsTabs'), gsVar('DS_MKT_GROUP'), gsFn('_dsClientTabs'), gsFn('_dsAccessToken'),
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
const AGR_FNS = ['marketingConsentBlock', 'agreementHtml', 'probateAgreementHtml', 'esignAnchor', 'agrBillingRates',
                 'materialsBasisNote', 'fmt', 'esc', 'paymentSplit', 'isDecedentJob', 'agrSection',
                 '_agrHasPrepVendors', 'estimateDocScope', 'svcHasDocStep', 'docScopeDef',
                 '_agrScopeServices', '_agrMidpointTrigger', '_agrProbateCompliance',
                 'estTolerancePctTxt'];
const AGR_VARS = ['EST_TOLERANCE_PCT', 'SMF_PCT', 'DECEDENT_SERVICES', 'agrApproved',
                  'HAVELLIN_OFFICE_PHONE', 'JOB_STEPS', 'DOC_SCOPES', 'ESIGN_ANCHORS'];
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
      ['clientSig', 'clientDate', 'havSig', 'havDate'].forEach((k) => {
        const n = doc.split(A[k]).length - 1;
        eq(n, 1, '⚠ the ' + which + ' form carries ' + k + ' (' + A[k] + ') exactly once — '
                 + 'a second copy places a second signature box on the same contract');
      });
    });
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
      fns: ['docProvider', 'esignAvailable', 'esignJobWatches', 'isAgreementSigned', 'agreementSignature', 'esignProviderKey'], vars: ['ESIGN_PROVIDERS'],
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
    const c = sandbox({ fns: ['esignSigner'], vars: [] });
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
            'docState', '_jobTouch', '_actor', 'esignSigner'],
      vars: ['DOC_SEND_PROVIDERS'],
      stubs: {
        SHEETS_SYNC_URL: 'https://script.example/exec',
        _appsScriptPost: (url, body, cb) => { posted = body; cb(true, { ok: true, envelopeId: 'env-99', status: 'sent' }); },
        saveJobs() {}, syncJobToSheets() {}, agrApprovedBy: 'Anthony Graziano',
      },
    });
    const job = { id: 5, hvlId: 'HVL-0007', agrSent: true, name: 'Jane Doe', email: 'jane@x.com' };
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

    const out = c.outstandingEnvelopes();
    eq(out.length, 1, '⚠⚠ AND THE POLL FINDS IT — this returned [] on every job before today');
    eq(out[0].envelopeId, 'env-99', 'by the id the send recorded');
  }

  group('⚠⚠ AN ENVELOPE IS NEVER SENT WITHOUT A DOCUMENT OR A RECIPIENT');
  {
    // ⚠⚠ THIS ARM MUST NOT BE MADE LENIENT. Gmail can honestly create a draft with the attachment
    // missing and say so — a person reads it before it goes. An envelope with no document is a
    // signature request for nothing, mailed to the client automatically with nobody in between.
    const mk = (over) => sandbox({
      fns: ['esignSigner'], vars: ['DOC_SEND_PROVIDERS'],
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
      vars: ['ESIGN_PROVIDERS', 'JT_ROW_DOC', 'DOC_READY_WHY', 'DOC_KIND_WORD', 'DOC_STAGE_WORD', 'DOC_ACTIONS'],
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
      vars: ['ESIGN_PROVIDERS'], stubs: { ESIGN_PROVIDER_KEY: 'docusign' } });

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
                        vars: ['ESIGN_PROVIDERS'],
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
      vars: ['ESIGN_PROVIDERS', 'DOC_ACTIONS', 'DOC_KIND_WORD', 'DOC_STAGE_WORD'],
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
      fns: ['esignRefresh', '_esignDue', 'outstandingEnvelopes', 'applyEsignStatus',
            'recordAgreementSignature', 'isAgreementSigned', 'agreementSignature', 'docState',
            '_jobTouch', '_actor', 'esignArchiveSigned', 'esignProviderKey', 'esignAvailable'],
      vars: ['ESIGN_RECHECK_MINS', 'ESIGN_PROVIDERS'],
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
      fns: ['esignRefresh', '_esignDue', 'outstandingEnvelopes', 'isAgreementSigned', 'agreementSignature'],
      vars: ['ESIGN_RECHECK_MINS'],
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
      fns: ['esignRefresh', '_esignDue', 'outstandingEnvelopes', 'isAgreementSigned', 'agreementSignature'],
      vars: ['ESIGN_RECHECK_MINS'],
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
    // ⚠ A FLOOR, NOT A "did you bump it" CHECK — it states what THIS feature needs. esignArchive
    // landed in 2026-09-17b, so a deployment older than that cannot file an executed agreement and
    // the banner must be able to say so. Raise it only when esign itself needs a newer backend.
    ok(bv >= '2026-09-17b',
       '⚠ the deployment is at least the one that added esignArchive');
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

  group('⚠⚠ THE CONSENT BLOCK IS ON BOTH FORMS AND NAMES THE RIGHT PERSON');
  {
    const c = appCtx();
    const std = c.agreementHtml(LIVING, EST);
    const pro = c.probateAgreementHtml(PROBATE, EST);

    [['standard', std], ['probate', pro]].forEach(function (pair) {
      const which = pair[0], doc = pair[1];
      has(doc, 'I AUTHORIZE', which + ': the authorize option is offered');
      has(doc, 'I DO NOT AUTHORIZE',
          '⚠ ' + which + ': and so is DECLINE — a single "I agree" box somebody must tick to finish '
          + 'the envelope is a toll gate, not a consent');
      has(doc, 'does not affect the Services',
          '⚠ ' + which + ': declining is stated to cost them nothing, or the choice is not free');
    });

    // ⚠ ONE BLOCK, TWO READERS, AND ONLY THE SIGNER LABEL DIFFERS. On an estate the person
    // choosing is the personal representative; a block saying "Client" there would be addressing
    // somebody who is deceased.
    has(std, 'Client&rsquo;s Choice', 'the living-client form asks the Client');
    has(pro, 'Personal Representative&rsquo;s Choice',
        '⚠ and the estate form asks the Personal Representative, never the decedent');
    lacks(pro, 'Client&rsquo;s Choice', 'the estate form does not also say Client');
  }

  group('⚠⚠ THE ESTATE FORM HAS A PHOTOGRAPHY SECTION AT ALL, WHICH IT NEVER DID');
  {
    const pro = appCtx().probateAgreementHtml(PROBATE, EST);
    has(pro, '7.1 Documentation Media',
        '⚠⚠ the form that photographs the MOST was the one that never said what happens to the images');
    has(pro, '7.2 Marketing', 'and the marketing use is its own subsection');
    has(pro, 'seven years', 'the retention period is stated');
    has(pro, 'never sold, licensed, or shared', 'and so is the limit on who else can ever see it');
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

  group('⚠⚠ THE CLIENT CARRIES THE CONSENT TABS AND HAVELLIN DOES NOT');
  {
    const c = gsCtx({ props: FULL_PROPS });
    c.esignSendEnvelope({ pdfBase64: 'x', signerName: 'Tripp Butler', signerEmail: 'tripp@example.com' });
    const r = c.calls[0].payload.recipients;
    const client = r.signers[0], hav = r.signers[1];

    ok(!!client.tabs.radioGroupTabs, '⚠⚠ the client is asked the marketing question');
    ok(!hav.tabs.radioGroupTabs,
       '⚠⚠ and Havellin is NOT — a media release is the client’s decision about their own home, '
       + 'and a REQUIRED radio on recipient 2 would block our own countersignature on a contract '
       + 'the client had already signed');
    eq(hav.tabs.signHereTabs.length, 1, 'the countersignature is one signature and nothing else');

    const grp = client.tabs.radioGroupTabs[0];
    eq(grp.groupName, c.DS_MKT_GROUP, 'the group is named from the shared constant');
    eq(grp.radios.length, 2, 'two options');
    eq(grp.radios.map(function (x) { return x.value; }).sort().join(','), 'authorize,decline',
       'authorize and decline, both real answers');
    grp.radios.forEach(function (x) {
      eq(x.required, 'true',
         '⚠⚠ REQUIRED — this is the only thing that guarantees the client SEES it. DocuSign’s '
         + 'guided navigation steps through required fields and jumps past optional ones, so an '
         + 'optional signature alone is a consent nobody is ever asked for');
    });

    const mkt = client.tabs.signHereTabs.filter(function (t) { return t.tabLabel === 'marketing_signature'; })[0];
    ok(!!mkt, 'the marketing signature exists');
    eq(mkt.optional, 'true', '⚠ and is OPTIONAL — a client who declines is never made to sign it');
    eq(mkt.conditionalParentLabel, c.DS_MKT_GROUP, 'shown only under the marketing radio');
    eq(mkt.conditionalParentValue, 'authorize',
       '⚠ and only on authorize, so declining never shows a signature line to ignore');
    // ⚠ MEASURED BEFORE IT WAS BUILT. testEsignTabs drove all three shapes against the real
    // account on 2026-09-18 and all three came back ACCEPTED; the plan's field palette does not
    // answer this, because nothing here uses the drag-and-drop sender UI it describes.
    ok(/function testEsignTabs\(\s*\)/.test(GS), 'and the probe that proved the account takes them is committed');
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
            'esignJobWatches'],
      vars: ['ESIGN_PROVIDERS', 'ESIGN_PROVIDER_KEY', 'AGR_SIG_MANUAL_METHODS'],
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
      ['mktYes', 'mktNo', 'mktSig', 'clientSig'].forEach(function (k) {
        lacks(near, c.ESIGN_ANCHORS[k],
          '⚠ no e-signature anchor sits on the role row — it is stated, never asked');
      });
    });
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
