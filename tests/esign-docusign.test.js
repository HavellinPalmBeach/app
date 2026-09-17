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
const { sandbox, source, fn, matchBrace } = require('./harness');

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
    Logger: { log: () => {} },
    Utilities: {
      base64EncodeWebSafe: (b) => Buffer.from(typeof b === 'string' ? b : Buffer.from(b)).toString('base64url'),
      newBlob: (s) => ({ getBytes: () => Buffer.from(s) }),
      computeRsaSha256Signature: () => Buffer.from('sig'),
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
    gsFn('dsConsentUrl'), gsFn('_dsB64Url'), gsFn('_dsTabs'),
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
const AGR_FNS = ['agreementHtml', 'probateAgreementHtml', 'esignAnchor', 'agrBillingRates',
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
  group('⚠⚠ NO SECRET IS IN THE REPOSITORY');
  {
    // This repo is public and havellin.html is served from GitHub Pages. A private key in either
    // is not a key. This file already records a Google client secret being pasted into a chat.
    lacks(GS, 'BEGIN RSA PRIVATE KEY',
          '⚠⚠ no private key in main-sync.gs — it lives in Script Properties, where QUO_API_KEY does');
    lacks(APP, 'BEGIN RSA PRIVATE KEY', 'and none in the app file, which is publicly served');
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
    ok(bv >= '2026-09-17a',
       '⚠ BACKEND_VERSION moved with the file, or the banner cannot tell this deployment from the old one');
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
