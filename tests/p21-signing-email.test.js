'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P21 · ANTHONY'S ANSWERS TO Q28–Q32 (2026-10-05: "yes to all, build P21"). P20 put every co-representative on the
// agreement beside the client; these are the five questions it raised, answered as recommended:
//
//   Q28  keep Contested Estate Settlement and the off-track Probate narrative: no code (P20's tests hold both).
//   Q29  the marketing opt-out stays the client's box; a co-representative opts out by written notice: no code.
//   Q30  the estate signature page names who signs before the work begins, where it counted "both signatures":
//        "No work will begin until the Client and Havellin have signed and the deposit has been received."
//   Q31  the sign-by-hand email says "Each co-representative named on the signature page signs it too." where one is
//        recorded (agreementEmailCoSignLine, asked of the list the signature page prints, _agrCoSigners).
//   Q32  two signers at one email address: until the sandbox shows what DocuSign does, the envelope goes and the send's
//        notice names who shares which address (esignSharedEmails), off whom the backend says it put on the envelope.
//
// Measured on the build before this (bf5388c, P20): the estate signature page said "until both signatures are
// obtained" on a page carrying three signature blocks; the paper route's email asked the Client alone to "sign and
// return it"; and a co-trustee recorded with the Client's email went on the envelope at that address without a word.
// Driven through the real functions (closure-lifted); only the network, the store and the screen's notices are stubbed.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source, fn, decl, domStub } = require('./harness');

const SRC = source();
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
const noComments = (t) => String(t).split('\n').filter((l) => { const s = l.trim(); return !(s.startsWith('//') || s.startsWith('*') || s.startsWith('/*')); }).join('\n');
const LIVE = noComments(SRC);
// The functions and top-level vars `roots` reach (the P19 and P20 tests' closure); the stubs name what the test supplies.
function closure(roots, stop) {
  const stopSet = new Set(stop || []);
  const fns = new Set(), vars = new Set();
  const queue = roots.map((r) => ['f', r]);
  while (queue.length) {
    const [k, name] = queue.shift();
    if (stopSet.has(name)) continue;
    let body;
    if (k === 'f') { if (fns.has(name)) continue; fns.add(name); try { body = codeOnly(fn(name)); } catch (e) { continue; } }
    else { if (vars.has(name)) continue; vars.add(name); try { body = codeOnly(decl(name)); } catch (e) { continue; } }
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/[(,]\s*([A-Za-z_$][\w$]*)\s*[,)]/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) if (ALL_VARS.has(m[1]) && !stopSet.has(m[1])) queue.push(['v', m[1]]);
  }
  return { fns: [...fns].filter((n) => ALL_FNS.has(n)), vars: [...vars] };
}
function lift(roots, stubs) {
  const c = closure(roots, Object.keys(stubs || {}));
  return sandbox({ fns: c.fns, vars: c.vars, stubs: stubs || {} });
}
const inEastern = (body) => { const prev = process.env.TZ; process.env.TZ = 'America/New_York'; try { return body(); } finally { process.env.TZ = prev; } };
const count = (hay, needle) => String(hay).split(needle).length - 1;
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&rsquo;/g, '’')
  .replace(/&mdash;/g, '—').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
// Which function a source index sits in, for counting the readers of a helper.
const FN_STARTS = [...LIVE.matchAll(/(^|\n)function ([A-Za-z0-9_$]+)\s*\(/g)].map((m) => ({ at: m.index, name: m[2] }));
function readers(name) {
  const out = {};
  const re = new RegExp('\\b' + name.replace(/\$/g, '\\$') + '\\s*\\(', 'g');
  let m;
  while ((m = re.exec(LIVE))) {
    let owner = null;
    for (const f of FN_STARTS) { if (f.at <= m.index) owner = f.name; else break; }
    if (owner === name) continue;   // its own definition
    out[owner] = (out[owner] || 0) + 1;
  }
  return out;
}

// ── Fixtures: a trust estate whose trustee is Ruth Adler, with co-trustees as each case needs ─────────────────────────
const T0 = Date.parse('2026-10-01T15:00:00Z');
const NOW = Date.parse('2026-10-05T15:00:00Z');
const FixedDate = (t) => class extends Date { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } };
const DAN = { id: 'cf1', name: 'Daniel Adler', role: 'Trustee', email: 'dan@adler.example' };
const MAE = { id: 'cf2', name: 'Mae O\'Neil', role: 'Trustee', email: 'mae@oneil.example' };
const JOB = (o) => Object.assign({
  id: 60, hvlId: 'HVL-0060', name: 'Harold Adler', svc: 'cleanout', matterType: 'trust', status: 'won', won: true, approved: true,
  wonAt: '2026-10-01', created: 'Sep 28, 2026', walkthrough: '2026-09-29', agrApproved: true, agrApprovedBy: 'Anthony Graziano',
  tc: 'Ashley Jerome', addr: '100 Ocean Blvd, Palm Beach, FL', city: 'Palm Beach', zip: '33480', deathDate: '2026-08-01',
  executor: 'Ruth Adler', executorRole: 'Trustee', executorEmail: 'ruth@adler.example', executorPhone: '(561) 555-0101',
  executorAuth: 'received', trustName: 'Adler Family Trust', trustDate: '2015-03-03', docTier: 'values',
  coFiduciaries: [Object.assign({}, DAN)], docState: {}, at: {}, updatedAt: T0, payments: [],
}, o || {});
const LIVING = (o) => Object.assign({ id: 61, hvlId: 'HVL-0061', name: 'Jane Doe', email: 'jane@x.com', svc: 'downsizing_move',
  addr: '12 Ocean Blvd, Palm Beach, FL', status: 'won', won: true, approved: true, agrApproved: true, docState: {}, at: {}, payments: [] }, o || {});
const EST = { jobId: 60, svc: 'cleanout', tcFee: 6000, psFee: 8000, pkgCost: 0, smf: 0, prepFee: 0, havellinTotal: 14000, totTC: 40, totPS: 80,
  tcRate: 150, psRate: 100, discountPct: 0, fixedPrice: false, rush: false, docScope: 'full', docTier: 'values',
  vendors: [], prepItems: [], rooms: [{ idx: 1, name: 'Study', st: 'in', vol: 3, cplx: 3 }], collections: [], vehicles: [] };

const Q30_NEW = 'No work will begin until the Client and Havellin have signed and the deposit has been received.';
const Q30_OLD = 'No work will begin until both signatures are obtained';
const Q31_LINE = 'Each co-representative named on the signature page signs it too.';
const Q31_SENT = 'When you are ready, sign and return it and we will confirm the schedule.';

module.exports = function ({ group, ok, eq, has, lacks }) {
  const G = (name, body) => { group(name); try { inEastern(body); } catch (e) { ok(false, name + ' — threw: ' + String(e && e.stack || e).split('\n').slice(0, 4).join(' | ')); } };

  let _a = null;
  const agr = () => _a || (_a = lift(['agreementHtml', 'probateAgreementHtml'], { estimateStore: {}, currentEstimate: null, jobs: [], document: domStub({}) }));
  const sigPage = (h) => { const i = String(h).indexOf('<div class="agr-sig-page"'); return i >= 0 ? String(h).slice(i) : ''; };
  const head = (h) => { const i = String(h).indexOf('<div class="agr-sig-page"'); return i >= 0 ? String(h).slice(0, i) : String(h); };
  const coBlocks = (h) => count(sigPage(h), '>Co-Signer</div>');   // a recorded co-representative's block (the blank one carries a caption)

  // ═══════════════════════════════════════════════════════════════════════════
  G('Q30 · the estate signature page names who signs before the work begins, on every matter, with or without co-representatives', () => {
    const A = agr();
    const cases = [
      ['one co-trustee on a trust', JOB()],
      ['two co-trustees', JOB({ coFiduciaries: [DAN, MAE] })],
      ['nobody beside the client', JOB({ coFiduciaries: [] })],
      ['a probate matter', JOB({ svc: 'probate', matterType: 'probate', executorRole: 'Personal Representative' })],
      ['a pour-over (Both)', JOB({ matterType: 'both' })],
      ['Neither', JOB({ matterType: 'neither', coFiduciaries: [] })],
      ['an unanswered matter', JOB({ matterType: '' })],
    ];
    cases.forEach(([what, job]) => {
      const h = A.probateAgreementHtml(job, EST);
      ok(sigPage(h).length > 500, what + ': fixture: the estate form rendered, with its signature page');
      eq(count(sigPage(h), Q30_NEW), 1, '⚠⚠ ' + what + ': the signature page names who signs before the work begins');
      eq(count(h, Q30_NEW), 1, what + ': once, and only there');
      eq(count(h, Q30_OLD), 0, what + ': never the count of "both signatures"');
    });
    // The sentence opens the signature page, above every signature block.
    const two = A.probateAgreementHtml(JOB({ coFiduciaries: [DAN, MAE] }), EST);
    ok(sigPage(two).indexOf(Q30_NEW) < sigPage(two).indexOf('>Co-Signer</div>'), 'above the co-signers\' blocks it is about');
    eq(coBlocks(two), 2, 'fixture: the page carries two co-signers\' blocks, so "both" could not have meant them');
    has(text(sigPage(two)), 'By signing below, both parties acknowledge they have read, understood, and agreed to all terms of this Agreement.',
        'the acknowledgment beside it is unchanged: the parties are still two');
    // The standard form never said it and does not now: its §18 carries the acknowledgment.
    const std = A.agreementHtml(LIVING(), EST);
    ok(String(std).length > 5000, 'fixture: the standard form rendered');
    eq([count(std, Q30_NEW), count(std, Q30_OLD)], [0, 0], 'the standard form carries neither sentence (it never did)');
    has(text(std), 'Client acknowledges that Client has read this Agreement', 'its §18 acknowledgment is where it was');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  let _e = null;
  const em = () => _e || (_e = lift(['buildAgreementEmailText', 'buildAgreementEmailHtml', 'buildAgreementMailto', 'agreementEmailCoSignLine'], {
    approvedEstimateFor: () => ({ havellinTotal: 14000 }), estimateStore: {}, jobs: [], currentEstimate: null, document: domStub({}),
    assignedTCContact: () => ({ name: 'Ashley Jerome', phone: '(561) 555-0100', email: 'ashley@havellinpalmbeach.com' }),
  }));

  G('Q31 · the sign-by-hand email says each co-representative signs too, where one is recorded, and nowhere else', () => {
    const E = em();
    const line = (job) => ({ text: E.buildAgreementEmailText(job), html: E.buildAgreementEmailHtml(job) });
    const one = line(JOB()), two = line(JOB({ coFiduciaries: [DAN, MAE] }));
    [['one co-trustee', one], ['two co-trustees', two]].forEach(([what, r]) => {
      has(r.text, Q31_SENT + ' ' + Q31_LINE, '⚠⚠ ' + what + ': the text says it, right after "sign and return it"');
      eq(count(r.text, Q31_LINE), 1, what + ': once in the text');
      has(text(r.html), Q31_SENT + ' ' + Q31_LINE, '⚠⚠ ' + what + ': and the html, in the same paragraph');
      eq(count(r.html, Q31_LINE), 1, what + ': once in the html');
    });
    const none = line(JOB({ coFiduciaries: [] }));
    has(none.text, Q31_SENT + '\n', 'nobody beside the client: the sentence ends the paragraph, as before');
    lacks(none.text + none.html, Q31_LINE, 'and the line is absent from both parts');
    const voided = line(JOB({ coFiduciaries: [Object.assign({}, DAN, { voidedAt: '2026-10-02T12:00:00.000Z' })] }));
    lacks(voided.text + voided.html, Q31_LINE, 'a co-trustee whose row was removed (voided) is nobody beside the client');
    const living = line(LIVING({ coFiduciaries: [DAN] }));
    lacks(living.text + living.html, Q31_LINE, 'a living client has no co-representatives, whatever a stray row says');
    // The plain-email fallback is built from the text, so it carries the line too.
    const mailto = decodeURIComponent(E.buildAgreementMailto(JOB({ coFiduciaries: [DAN, MAE] })).split('&body=')[1] || '');
    has(mailto, Q31_LINE, 'the mailto fallback says it as well');
    lacks(decodeURIComponent(E.buildAgreementMailto(JOB({ coFiduciaries: [] })).split('&body=')[1] || ''), Q31_LINE, 'and only where one is recorded');
  });

  G('Q31 · the line asks the list the signature page prints: a co-signer\'s block on the page if and only if the line in the email', () => {
    const A = agr(), E = em();
    const variants = [
      JOB(), JOB({ coFiduciaries: [DAN, MAE] }), JOB({ coFiduciaries: [] }), JOB({ matterType: 'probate', svc: 'probate' }),
      JOB({ matterType: 'neither' }), JOB({ coFiduciaries: [Object.assign({}, DAN, { voidedAt: '2026-10-02T12:00:00.000Z' })] }),
      JOB({ coFiduciaries: [{ id: 'cf9', name: '', email: 'x@y.z' }] }),
    ];
    variants.forEach((job, i) => {
      const blocks = coBlocks(A.probateAgreementHtml(job, EST));
      const hasLine = count(E.buildAgreementEmailText(job), Q31_LINE) === 1;
      eq(hasLine, blocks > 0, 'variant ' + (i + 1) + ': ' + blocks + ' co-signer block(s) on the page, and the email ' + (hasLine ? 'says' : 'does not say') + ' they sign');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('Q32 · esignSharedEmails: which signers share an address, compared as an address is', () => {
    const S = lift(['esignSharedEmails'], {});
    const R = { name: 'Ruth Adler', email: 'ruth@adler.example' }, D = { name: 'Daniel Adler', email: 'dan@adler.example' }, M = { name: 'Mae O\'Neil', email: 'mae@oneil.example' };
    eq(S.esignSharedEmails([R, D, M]), [], 'three addresses: nothing shared');
    eq(S.esignSharedEmails([R, Object.assign({}, D, { email: 'ruth@adler.example' })]), [{ email: 'ruth@adler.example', names: ['Ruth Adler', 'Daniel Adler'] }],
       '⚠⚠ a co-trustee at the client\'s address: one address, both names, in signing order');
    eq(S.esignSharedEmails([R, Object.assign({}, D, { email: '  RUTH@Adler.Example ' })]), [{ email: 'ruth@adler.example', names: ['Ruth Adler', 'Daniel Adler'] }],
       'case and spaces do not make two addresses (DocuSign delivers to one inbox); the first spelling met is printed');
    eq(S.esignSharedEmails([R, Object.assign({}, D, { email: 'ruth@adler.example' }), Object.assign({}, M, { email: 'Ruth@adler.example' })]),
       [{ email: 'ruth@adler.example', names: ['Ruth Adler', 'Daniel Adler', 'Mae O\'Neil'] }], 'three at one address');
    eq(S.esignSharedEmails([R, Object.assign({}, D, { email: 'ruth@adler.example' }), M, { name: 'Lou Adler', email: 'mae@oneil.example' }]),
       [{ email: 'ruth@adler.example', names: ['Ruth Adler', 'Daniel Adler'] }, { email: 'mae@oneil.example', names: ['Mae O\'Neil', 'Lou Adler'] }],
       'two shared addresses, each named, in the order first met');
    eq(S.esignSharedEmails([R, Object.assign({}, D, { email: '' }), Object.assign({}, M, { email: '  ' })]), [], 'a blank address is no address (the send refuses it anyway)');
    eq(S.esignSharedEmails([]), [], 'nobody: nothing');
    eq(S.esignSharedEmails(null), [], 'nothing passed: nothing');
  });

  // The real docSend, posting to a stubbed backend that answers as the 2026-10-05 deployment does (or an older one).
  function sendRig(answer, more) {
    const log = { posts: [], notices: [], drafts: 0 };
    const S = lift(['docSend', 'docRecordSent', 'agreementCoSignState', 'esignAnchorsPresent', 'esignCoSignerAnchors'], Object.assign({
      SHEETS_SYNC_URL: 'https://script.google.com/macros/s/P21/exec', ESIGN_PROVIDER_KEY: 'docusign',
      _appsScriptPost: (url, body, cb) => { log.posts.push(JSON.parse(JSON.stringify(body))); cb(true, answer ? answer(body) : { ok: true, envelopeId: 'env-60', status: 'sent', coSigners: (body.coSigners || []).map((c, i) => ({ name: c.name, email: c.email, recipientId: String(4 + i) })) }); },
      docPdfBase64: (spec, html, cb) => cb('JVBERi0='),
      _docNotice: (type, msg) => log.notices.push([type, msg]), _dashSendState() {}, docAction() {}, showSyncBadge() {},
      setTimeout: () => 0, clearTimeout() {}, saveJobs() {}, syncJobToSheets() {}, gmailConfigured: () => true, _gmailUserEmail: '',
      _pdfFailAdviceText: () => '', window: { open() {} }, Date: FixedDate(NOW),
      gmailCreateDraft: (mime, cb) => { log.drafts++; cb(true, { draftId: 'd60' }); },
    }, more || {}));
    S._docBusy = null;
    return { S, log };
  }
  const specFor = (job, html) => ({ job, kind: 'agreement', key: 'agreement', to: job.executorEmail, via: '',
    names: { attachment: 'HVL-0060 Agreement.pdf' }, cfg: { subject: () => 'Your Havellin agreement', html: () => html } });
  const send = (job, answer) => {
    const html = agr().probateAgreementHtml(job, EST);
    const { S, log } = sendRig(answer);
    S.jobs = [job];
    const started = S.docSend(specFor(job, html));
    return { started, log, last: log.notices[log.notices.length - 1] || ['', ''] };
  };
  const SHARED = (names, email) => names + ' are on the envelope at one email address (' + email + '): make sure each of them signs for themselves.';

  G('Q32 · the DocuSign send names signers the envelope carries at one address, and goes amber; otherwise it says nothing', () => {
    // A co-trustee recorded with the client's own address (a couple's shared inbox, or a slip on Edit Client).
    const shared = send(JOB({ coFiduciaries: [Object.assign({}, DAN, { email: 'ruth@adler.example' }), MAE] }));
    ok(shared.started, 'the send goes: nothing is refused until the sandbox says DocuSign refuses it');
    eq(shared.log.posts.length, 1, 'one envelope posted');
    eq((shared.log.posts[0].coSigners || []).map((c) => c.email), ['ruth@adler.example', 'mae@oneil.example'], 'both co-trustees on it, Daniel at the client\'s address');
    eq(shared.last[0], 'warn', '⚠⚠ the notice is amber');
    has(shared.last[1], 'Sent to Ruth Adler, Daniel Adler and Mae O\'Neil for signature through DocuSign', 'it still says who it went to');
    has(shared.last[1], '⚠ ' + SHARED('Ruth Adler and Daniel Adler', 'ruth@adler.example'), '⚠⚠ and names who shares which address');
    lacks(shared.last[1], 'Mae O\'Neil are on the envelope', 'Mae, at her own address, is not named');
    // Distinct addresses: the clean send it always was.
    const clean = send(JOB({ coFiduciaries: [DAN, MAE] }));
    eq(clean.last[0], 'ok', 'distinct addresses: a clean send reads ok');
    lacks(clean.last[1], 'one email address', 'and says nothing of addresses');
    // Read off the backend's answer: an older deployment put nobody but the client on the envelope, so nobody shares.
    const old = send(JOB({ coFiduciaries: [Object.assign({}, DAN, { email: 'ruth@adler.example' })] }), () => ({ ok: true, envelopeId: 'env-60', status: 'sent' }));
    lacks(old.last[1], 'one email address', '⚠ an older deployment (no co-signers on the envelope): no shared address is claimed');
    has(old.last[1], 'Daniel Adler was not put on the envelope', 'the notice says what did happen instead');
    // The backend's own word decides: an echo naming the co-trustee at another address is what the envelope carries.
    const echoed = send(JOB({ coFiduciaries: [Object.assign({}, DAN, { email: 'ruth@adler.example' })] }),
      (body) => ({ ok: true, envelopeId: 'env-60', status: 'sent', coSigners: [{ name: 'Daniel Adler', email: 'daniel@elsewhere.example', recipientId: '4' }] }));
    lacks(echoed.last[1], 'one email address', 'the envelope is what the backend says it is, not what the job holds');
    // Case and spaces: one inbox.
    const cased = send(JOB({ coFiduciaries: [Object.assign({}, DAN, { email: 'Ruth@Adler.Example' })] }));
    has(cased.last[1], SHARED('Ruth Adler and Daniel Adler', 'ruth@adler.example'), 'one inbox whatever the case; the client\'s spelling printed');
  });

  G('Q32 · the sign-by-hand route claims no envelope, whoever shares an address', () => {
    // The Gmail route answers no list of co-signers, so nothing it says can name one on an envelope. (The provider check
    // in docSend is belt and braces: without it the client alone is asked about and nothing is shared.)
    const job = JOB({ coFiduciaries: [Object.assign({}, DAN, { email: 'ruth@adler.example' })] });
    const html = agr().probateAgreementHtml(job, EST);
    const { S, log } = sendRig();
    S.jobs = [job];
    const spec = Object.assign(specFor(job, html), { via: 'paper',
      cfg: { subject: () => 'Your Havellin agreement', html: () => html, cc: () => 'agreements@havellinpalmbeach.com',
             text: () => 'Dear Ruth,', emailHtml: () => '<p>Dear Ruth,</p>' } });
    ok(S.docSend(spec), 'the paper send starts');
    eq([log.posts.length, log.drafts], [0, 1], 'fixture: no envelope posted; one Gmail draft made');
    const last = log.notices[log.notices.length - 1] || ['', ''];
    has(last[1], 'Draft created in', 'fixture: the Gmail route\'s notice');
    lacks(last[1], 'on the envelope', 'it claims no envelope');
    lacks(last[1], 'one email address', 'and names no shared address');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('One definition each, and every reader counted', () => {
    eq(readers('agreementEmailCoSignLine'), { buildAgreementEmailHtml: 1, buildAgreementEmailText: 1 }, 'the email line: the html and the text (the mailto reads the text)');
    eq(readers('esignSharedEmails'), { docSend: 1 }, 'who shares an address: the DocuSign send\'s notice');
    eq(count(LIVE, "'" + Q31_LINE + "'"), 1, 'the email line is typed once in live code');
    eq(count(LIVE, Q30_NEW.replace(/\.$/, '')), 1, 'the signature-page sentence is typed once in live code');
    eq(count(LIVE, Q30_OLD), 0, 'and the old count of "both signatures" nowhere in live code');
    const body = noComments(fn('agreementEmailCoSignLine'));
    has(body, '_agrCoSigners(job)', 'the line asks the list the signature page prints its blocks from');
  });
};
