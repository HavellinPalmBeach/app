'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P20 · WA ESIGN — EVERY CO-REPRESENTATIVE SIGNS THE AGREEMENT (2026-10-05). Anthony's answer to Q22: "A, and yes to all
// the others" — each co-representative (co-executor or co-trustee) signs in DocuSign beside the client (the same routing
// order, Anthony after them); on the sign-by-hand route the co-signed page is filed as a signed record.
//
// Measured on the build before this (456d0cb): the envelope carried the client (order 1), Anthony (2) and agreements@
// (3) and nobody else, whatever the job recorded; the estate agreement's co-signer blocks carried no marker DocuSign
// could place a tab at; DocuSign reported the agreement `completed` on two signatures; esignEnvelopeStatus took the
// first signer at routing order 1 as the client (with a co-signer at order 1 listed first, the co-signer); and on the
// paper route nothing asked for, or recorded, a co-representative's signature at all.
//
//   S1  the markers: each co-signer's own pair ('/hcs<n>/', '/hcd<n>/'), the app's and the server's held equal for
//       every n, and never one inside another (DocuSign matches an anchor as a substring).
//   S2  the estate signature page: a recorded co-signer's block carries its pair, white text, once; the blank block
//       none; esignAnchorsPresent measures them; a job with none renders byte for byte as before.
//   S3  the server's envelope (esignSendEnvelope, through the real _dsApi with UrlFetchApp stubbed): co-signers at
//       routing order 1 beside the client, each with tabs at the markers the app named, unique recipientIds, Anthony
//       last; the answer says who it put there; refusals by name before DocuSign is asked; none = byte for byte.
//   S4  the server's status (esignEnvelopeStatus): the client by recipientId '1', the co-signers with their days.
//   S5  the app's send: the payload carries each co-signer with the markers measured for them; refused by name before
//       anything is posted; an answer without the list (an older deployment) recorded as no co-signer on the envelope;
//       none = the payload byte for byte as before.
//   S6  the record: on `completed`, each co-signer's signature on `sig.coSigners`, with their own local day.
//   S7  agreementCoSignState, the one answer to "the co-representatives' signatures are on record".
//   S8  the Agreement signed row (its flag never undoes it), the rail and the track, the block under the timeline with
//       its File control and Void, and the hand recorder's notice.
//   S9  one definition, every reader counted; the backend version; the sentences on screen; the four documents.
// Driven through the real functions; only the network, the store's saves and the screen's notices are stubbed by name.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { sandbox, source, fn, decl, domStub, matchBrace } = require('./harness');

const SRC = source();
const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
const noComments = (t) => String(t).split('\n').filter((l) => { const s = l.trim(); return !(s.startsWith('//') || s.startsWith('*') || s.startsWith('/*')); }).join('\n');
const LIVE = noComments(SRC);
// The functions and top-level vars `roots` reach (the closure the P19 tests use); `stop` names what the test supplies.
const _memo = new Map();
function closure(roots, stop) {
  const key = JSON.stringify([roots, (stop || []).slice().sort()]);
  if (_memo.has(key)) return _memo.get(key);
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
  const out = { fns: [...fns], vars: [...vars] };
  _memo.set(key, out);
  return out;
}
function lift(roots, stop, stubs) {
  const c = closure(roots, (stop || []).concat(Object.keys(stubs || {})));
  return sandbox({ fns: c.fns, vars: c.vars, stubs: stubs || {} });
}
const inEastern = (body) => { const prev = process.env.TZ; process.env.TZ = 'America/New_York'; try { return body(); } finally { process.env.TZ = prev; } };
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const count = (hay, needle) => String(hay).split(needle).length - 1;
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&middot;/g, '·').replace(/&rsquo;/g, '’')
  .replace(/&mdash;/g, '—').replace(/&#9888;/g, '⚠').replace(/&#10003;/g, '✓').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
// Which function a source index sits in, for counting the readers of a helper.
const FN_STARTS = [...LIVE.matchAll(/(^|\n)function ([A-Za-z0-9_$]+)\s*\(/g)].map((m) => ({ at: m.index, name: m[2] }));
const VAR_STARTS = [...LIVE.matchAll(/(^|\n)var ([A-Za-z0-9_$]+)\s*=/g)].map((m) => ({ at: m.index, name: m[2] }));
function enclosing(idx) {
  let f = '(top)', fa = -1, v = '', va = -1;
  FN_STARTS.forEach((s) => { if (s.at <= idx && s.at > fa) { fa = s.at; f = s.name; } });
  VAR_STARTS.forEach((s) => { if (s.at <= idx && s.at > va) { va = s.at; v = s.name; } });
  return va > fa ? 'var ' + v : f;
}
function readers(re) {
  const out = {};
  for (const m of LIVE.matchAll(re)) {
    if (/(function|var)\s+$/.test(LIVE.slice(Math.max(0, m.index - 9), m.index))) continue;
    const f = enclosing(m.index);
    out[f] = (out[f] || 0) + 1;
  }
  const sorted = {}; Object.keys(out).sort().forEach((k) => { sorted[k] = out[k]; }); return sorted;
}

// ── The server ─────────────────────────────────────────────────────────────────
function gsFn(name) {
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(GS);
  if (!m) throw new Error('not in .gs: ' + name);
  const start = m.index + (m[1] ? m[1].length : 0);
  return GS.slice(start, matchBrace(GS, GS.indexOf('{', re.lastIndex)) + 1);
}
function gsVar(name) {
  const m = GS.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[\\s\\S]*?;)'));
  if (!m) throw new Error('var not in .gs: ' + name);
  return m[2];
}
// The real send and status, the real _dsApi and token read, with UrlFetchApp stubbed: `answer(url, opts)` is what
// DocuSign says; every request DocuSign would receive is kept in `fetches`, its JSON exactly as posted.
function gs(answer) {
  const fetches = [];
  const props = { DS_INTEGRATION_KEY: 'k', DS_USER_ID: 'u', DS_ACCOUNT_ID: 'acct-1', DS_BASE_URI: 'https://demo.docusign.net', DS_PRIVATE_KEY: 'x' };
  const g = {
    JSON, String, Array, Number, Date, Math, encodeURIComponent,
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null) }) },
    CacheService: { getScriptCache: () => ({ get: () => 'TOKEN', put() {} }) },
    UrlFetchApp: { fetch: (url, opts) => {
      fetches.push({ url, opts });
      const a = answer ? answer(url, opts) : { code: 201, body: { envelopeId: 'env-9', status: 'sent' } };
      return { getResponseCode: () => a.code, getContentText: () => JSON.stringify(a.body) };
    } },
    Logger: { log() {} },
  };
  vm.createContext(g);
  vm.runInContext([gsVar('DS_ANCHORS'), gsVar('DS_TAB_Y_OFFSET'), gsVar('DS_REQUIRED_ANCHORS'), gsVar('DS_COSIGNER_ANCHOR'), gsFn('_dsCoSignerAnchor'),
    gsFn('_dsProp'), gsFn('_dsMissingProps'), gsFn('_dsAccessToken'), gsFn('_dsApi'), gsFn('_dsTabs'), gsFn('_dsClientTabs'),
    gsFn('esignSendEnvelope'), gsFn('esignEnvelopeStatus')].join('\n'), g);
  g.fetches = fetches;
  return g;
}
const SEND = (o) => Object.assign({ pdfBase64: 'JVBERi0=', signerName: 'Ruth Adler', signerEmail: 'ruth@adler.example', hvlId: 'HVL-0060',
  filename: 'Agreement.pdf', subject: 'Your agreement', anchors: ['clientSig', 'clientDate', 'havSig', 'havDate', 'mktOptOut'] }, o || {});
const posted = (g) => JSON.parse((g.fetches[0] || { opts: { payload: '{}' } }).opts.payload);

// ── Fixtures ───────────────────────────────────────────────────────────────────
const T0 = Date.parse('2026-10-01T15:00:00Z');
const NOW = Date.parse('2026-10-05T15:00:00Z');
const FixedDate = (t) => class extends Date { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } };
const DAN = { id: 'cf1', name: 'Daniel Adler', role: 'Trustee', phone: '(561) 555-0103', email: 'dan@adler.example' };
const MAE = { id: 'cf2', name: 'Mae O\'Neil', role: 'Trustee', phone: '', email: 'mae@oneil.example' };
// A trust-only estate whose trustee is Ruth Adler, with a co-trustee; agreed, approved, the packet not yet sent.
const JOB = (o) => Object.assign({
  id: 60, hvlId: 'HVL-0060', name: 'Harold Adler', svc: 'cleanout', matterType: 'trust', status: 'won', won: true, approved: true,
  wonAt: '2026-10-01', wonBy: 'Ashley Jerome', created: 'Sep 28, 2026', walkthrough: '2026-09-29', estimateSentDate: 'September 30, 2026',
  agrApproved: true, agrApprovedBy: 'Anthony Graziano', tc: 'Ashley Jerome', addr: '100 Ocean Blvd', city: 'Palm Beach', zip: '33480',
  deathDate: '2026-08-01', executor: 'Ruth Adler', executorRole: 'Trustee', executorEmail: 'ruth@adler.example', executorPhone: '(561) 555-0101',
  executorAuth: 'received', trustName: 'Adler Family Trust', trustDate: '2015-03-03', docTier: 'values',
  coFiduciaries: [Object.assign({}, DAN)], docState: {}, at: {}, updatedAt: T0, payments: [],
}, o || {});
const EST = { jobId: 60, svc: 'cleanout', tcFee: 6000, psFee: 8000, pkgCost: 0, smf: 0, prepFee: 0, havellinTotal: 14000, totTC: 40, totPS: 80,
  tcRate: 150, psRate: 100, discountPct: 0, fixedPrice: false, rush: false, docScope: 'full', docTier: 'values',
  vendors: [], prepItems: [], rooms: [{ idx: 1, name: 'Study', st: 'in', vol: 3, cplx: 3 }], collections: [], vehicles: [] };
const REC = () => ({ estimate: JSON.parse(JSON.stringify(EST)), approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 30, 2026', savedAt: T0 });
// Out for signature through DocuSign, with whoever the backend put on the envelope.
const OUT = (coOnEnvelope, o) => JOB(Object.assign({ agrSent: true, agrSentAt: 'October 2, 2026',
  docState: { agreement: { draftedAt: '2026-10-02T14:00:00.000Z', sentAt: '2026-10-02T14:00:00.000Z', sentBy: 'Anthony Graziano', provider: 'docusign',
    esign: Object.assign({ envelopeId: 'env-60', status: 'sent', checkedAt: '2026-10-02T14:00:00.000Z' }, coOnEnvelope ? { coSigners: coOnEnvelope } : {}) } } }, o || {}));
// Sent on the paper route and signed by the client by hand.
const HAND = (o) => JOB(Object.assign({ agrSent: true, agrSigned: true, agrSentAt: 'October 2, 2026',
  docState: { agreement: { draftedAt: '2026-10-02T14:00:00.000Z', sentAt: '2026-10-02T14:00:00.000Z', provider: 'gmail',
    sig: { how: 'wet', signedBy: 'Ruth Adler', signedOn: '2026-10-03', provider: 'manual', recordedBy: 'Anthony Graziano', recordedAt: '2026-10-03T16:00:00.000Z' } } } }, o || {}));
// The goldens: what the build before P20 (456d0cb) produced for a job with no co-representative, byte for byte.
const GOLD = {
  standard: '7dffc35f801065fce45f9233e738db17eac6d32821d0fbfa8b24ee32fc4ab60d',
  probate: '7bcc8da8d10fe7398a495bb0405ec63f4f7190710fc29c054760c2132fd22e0e',
  payload: 'c98a559007c46ec25fc1c393e688ff347d3656ffe13d68ad80856a5e0254822a',
  envelope: 'c467d607f17deab1025f929f719bb85aba1eed1514938460cccc2365dc0c251c',
};
const GOLD_EST = { jobId: 1, tcFee: 18500, psFee: 12500, pkgCost: 1500, pkgLabel: 'Estate Premium — $1,500', smf: 0, prepFee: 0, havellinTotal: 32500, totTC: 100, totPS: 100, tcRate: 150, psRate: 100,
  discountPct: 0, fixedPrice: false, rush: false, vendors: [], prepItems: [], rooms: [], collections: [], vehicles: [] };
const GOLD_PROBATE = { id: 1, hvlId: 'HVL-0007', name: 'Margaret Doe', svc: 'probate', matterType: 'probate', executor: 'Tripp Butler', executorEmail: 'tripp@x.com',
  addr: '69 Beach Blvd', city: 'Palm Beach', zip: '33480', deathDate: '2026-01-15', docLevel: 'formal' };
const GOLD_LIVING = { id: 1, hvlId: 'HVL-0008', name: 'Jane Doe', email: 'jane@x.com', svc: 'downsizing', addr: '12 Ocean Blvd', city: 'Palm Beach', zip: '33480' };

module.exports = function ({ group, ok, eq, has, lacks }) {
  const G = (name, body) => { group(name); try { inEastern(body); } catch (e) { ok(false, name + ' — threw: ' + String(e && e.stack || e).split('\n').slice(0, 4).join(' | ')); } };

  // The agreement forms, their call graph lifted once.
  let _agr = null;
  const agr = () => _agr || (_agr = lift(['agreementHtml', 'probateAgreementHtml', 'esignAnchorsPresent', 'esignCoSignerAnchors'], [],
    { estimateStore: {}, currentEstimate: null, jobs: [], document: domStub({}) }));

  // ═══════════════════════════════════════════════════════════════════════════
  G('S1 · each co-signer\'s own markers: the app and the server agree for every n, and none sits inside another', () => {
    const A = agr();
    const g = gs();
    for (let n = 1; n <= 30; n++) {
      const a = A.esignCoSignerAnchors(n);
      eq([a.sig, a.date, a.sigKey, a.dateKey], ['/hcs' + n + '/', '/hcd' + n + '/', 'coSig' + n, 'coDate' + n], 'co-signer ' + n + ': its pair and the keys that name it');
      const s = g._dsCoSignerAnchor(a.sigKey), d = g._dsCoSignerAnchor(a.dateKey);
      eq([s && s.anchor, s && s.kind, s && s.n, d && d.anchor, d && d.kind, d && d.n], [a.sig, 'sig', n, a.date, 'date', n],
         '⚠⚠ co-signer ' + n + ': the server reads each key back into the very marker the app printed');
    }
    eq(A.ESIGN_COSIGNER_ANCHOR, g.DS_COSIGNER_ANCHOR, 'the two templates are equal, key for key');
    ['', 'coSig', 'coSig0', 'coSig01', 'cosig1', 'coSigX', 'clientSig', 'coDate1000', null].forEach((k) => eq(g._dsCoSignerAnchor(k), null, 'not a co-signer key: ' + JSON.stringify(k)));
    // DocuSign matches an anchor as a substring, so no marker may sit inside another, nor inside two run together (the
    // way adjacent text reaches the PDF's text layer).
    const all = Object.keys(A.ESIGN_ANCHORS).map((k) => A.ESIGN_ANCHORS[k]);
    for (let n = 1; n <= 12; n++) { const a = A.esignCoSignerAnchors(n); all.push(a.sig, a.date); }
    let inside = [], joined = [];
    all.forEach((x) => all.forEach((y) => { if (x !== y && y.indexOf(x) >= 0) inside.push(x + ' in ' + y); }));
    all.forEach((x) => all.forEach((y) => all.forEach((z) => { if (z !== x && z !== y && (x + y).indexOf(z) >= 0) joined.push(z + ' in ' + x + y); })));
    eq(inside, [], '⚠⚠ no marker inside another (' + all.length + ' markers)');
    eq(joined, [], '⚠⚠ nor inside any two run together');
    eq(new Set(all).size, all.length, 'and every marker is its own');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('S2 · the signature page: each recorded co-signer\'s block carries its own pair; the blank one none; measured; none = as before', () => {
    const A = agr();
    const sigPage = (h) => h.slice(h.indexOf('<div class="agr-sig-page"'));
    const blocks = (h) => sigPage(h).split('>Co-Signer</div>').slice(1).map((b) => b.split('Havellin Palm Beach, LLC</div>')[0]);
    const one = A.probateAgreementHtml(JOB(), EST);
    const two = A.probateAgreementHtml(JOB({ coFiduciaries: [DAN, MAE] }), EST);
    const none = A.probateAgreementHtml(JOB({ coFiduciaries: [] }), EST);
    ok(one.indexOf('<div class="agr-sig-page"') > 0, 'fixture: the estate form rendered, with its signature page');
    eq(blocks(two).map((b) => [count(b, '/hcs1/'), count(b, '/hcd1/'), count(b, '/hcs2/'), count(b, '/hcd2/')]), [[1, 1, 0, 0], [0, 0, 1, 1]],
       '⚠⚠ each co-signer\'s block carries its own pair once, and never another\'s');
    has(blocks(two)[0], 'Daniel Adler', 'the first block is the first co-signer\'s');
    has(blocks(two)[1], 'Mae O&#39;Neil', 'the second the second\'s');
    eq([count(two, '/hcs1/'), count(two, '/hcd1/'), count(two, '/hcs2/'), count(two, '/hcd2/')], [1, 1, 1, 1], 'and nowhere else in the document');
    ok(two.indexOf('/hcs1/') > two.indexOf('<div class="agr-sig-page"'), 'inside the signature page, so it cannot land on the page before');
    // White text in the PDF's text layer, never hidden: the client's own marker, by the client's own renderer.
    const span = '<span style="color:#fff;font-size:6px;line-height:0;">/hcs1/</span>';
    has(one, span, '⚠⚠ the marker is rendered as the client\'s is: white, a real size, in the text layer');
    ['display:none', 'visibility:hidden'].forEach((w) => lacks(blocks(one)[0], w, 'never ' + w));
    // The signature and date lines each carry theirs.
    has(blocks(one)[0], 'Signature</div><div class="sig-line">' + span + '</div>', 'the signature line carries /hcs1/');
    has(blocks(one)[0], 'Date</div><div class="sig-line"><span style="color:#fff;font-size:6px;line-height:0;">/hcd1/</span></div>', 'the date line /hcd1/');
    eq([count(none, '/hcs'), count(none, '/hcd')], [0, 0], '⚠ the blank block (nobody recorded) carries none: there is nobody to send it to');
    eq(A.esignAnchorsPresent(two), ['clientSig', 'clientDate', 'havSig', 'havDate', 'mktOptOut', 'coSig1', 'coDate1', 'coSig2', 'coDate2'],
       '⚠⚠ esignAnchorsPresent measures each pair off the html, numbered as the page numbers them');
    eq(A.esignAnchorsPresent(none), ['clientSig', 'clientDate', 'havSig', 'havDate', 'mktOptOut'], 'and reports exactly the five with none recorded');
    eq(A.esignAnchorsPresent(two.replace('/hcd2/', '')), ['clientSig', 'clientDate', 'havSig', 'havDate', 'mktOptOut', 'coSig1', 'coDate1', 'coSig2'],
       'a marker gone from the page is reported gone, never assumed');
    // P22: the walk goes to the highest number the page carries, so a gap no longer hides the co-signers after it.
    eq(A.esignAnchorsPresent(two.replace('/hcs1/', '').replace('/hcd1/', '')), ['clientSig', 'clientDate', 'havSig', 'havDate', 'mktOptOut', 'coSig2', 'coDate2'],
       'a co-signer the page carries neither marker for is not reported, and the ones after it still are (esignCoSigners refuses the gap by name)');
    lacks(noComments(fn('esignAnchorsPresent')), "'/", 'no marker string is typed into the measurer: it asks the namer');
    // ⚠⚠ A JOB WITH NO CO-REPRESENTATIVE RENDERS EXACTLY AS IT DID: the two forms, byte for byte against 456d0cb.
    // RESTATED (P25, Q34; Anthony, 2026-10-09: "Upon acceptance"): the agreement follows Exhibit A on when the deposit and
    // the final are due. Put the old timing back and each page is still 456d0cb's byte for byte, so the timing is the only
    // change (this fixture records no case number, so the Court row Q53 fills stays the blank line).
    const P25_BACK = [
      ['Due upon acceptance, on signing this Agreement — Services will not commence until received', 'Due within 7 calendar days of signing — Services will not commence until received'],
      ['Invoiced after the final property walk-through, from the actual logged hours; due within 7 calendar days of the invoice date</td>', 'Due upon substantial completion, prior to final property walk-through</td>'],
      ['Due upon acceptance, on signing this Agreement — before any work begins', 'Due upon signing this Agreement — before any work begins'],
      ['Invoiced after the final property walk-through, from the actual logged hours and the materials used; due within 7 calendar days of the invoice date', 'Due within 7 days of final invoice delivery — reflects actual hours and materials vs. estimate'],
    ];
    const p25Back = (h) => P25_BACK.reduce((t, x) => t.split(x[0]).join(x[1]), h);
    const _std = A.agreementHtml(GOLD_LIVING, GOLD_EST);
    ok(_std.indexOf(P25_BACK[0][0]) >= 0 && _std.indexOf(P25_BACK[1][0]) >= 0, 'the standard form carries the new deposit and final timing');
    eq(sha(p25Back(_std)), GOLD.standard, '⚠⚠ the standard form, byte for byte as before P20 but for that timing');
    // RESTATED 2026-10-05 (P21; Anthony's answer to Q30): the signature page's sentence names who signs before the work
    // begins ("until the Client and Havellin have signed") where it counted "both signatures". Put the old words back and
    // the page is still 456d0cb's byte for byte, so that sentence is the only change and nothing else moved.
    const _q30 = A.probateAgreementHtml(GOLD_PROBATE, GOLD_EST);
    const _q30New = 'No work will begin until the Client and Havellin have signed and the deposit has been received.';
    eq(count(_q30, _q30New), 1, 'the estate form carries the new sentence once');
    ok(_q30.indexOf(P25_BACK[2][0]) >= 0 && _q30.indexOf(P25_BACK[3][0]) >= 0, 'the estate form carries the new deposit and final timing');
    eq(sha(p25Back(_q30).replace(_q30New, 'No work will begin until both signatures are obtained and the deposit has been received.')), GOLD.probate,
       '⚠⚠ the estate form with no co-representative, byte for byte as before P20 but for that sentence');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('S3 · the envelope: every co-signer at routing order 1 beside the client, tabs at their own markers, Anthony last; the answer says who', () => {
    const g = gs();
    const two = [{ name: 'Daniel Adler', email: 'dan@adler.example', anchors: ['coSig1', 'coDate1'] },
                 { name: 'Mae O\'Neil', email: 'mae@oneil.example', anchors: ['coSig2', 'coDate2'] }];
    const res = g.esignSendEnvelope(SEND({ coSigners: two }));
    ok(res.ok, 'the envelope is created');
    eq(g.fetches.length, 1, 'one request to DocuSign');
    eq(g.fetches[0].url, 'https://demo.docusign.net/restapi/v2.1/accounts/acct-1/envelopes', 'POSTed to the account\'s envelopes');
    const env = posted(g);
    const s = env.recipients.signers;
    eq(s.map((x) => [x.name, x.recipientId, x.routingOrder, x.roleName]),
       [['Ruth Adler', '1', '1', 'Client'], ['Daniel Adler', '4', '1', 'Co-Signer'], ['Mae O\'Neil', '5', '1', 'Co-Signer'], ['Anthony Graziano', '2', '2', 'Havellin']],
       '⚠⚠ the client and each co-signer at routing order 1, in parallel; Anthony countersigns at 2 after all of them');
    const cc = env.recipients.carbonCopies;
    eq(cc.map((x) => [x.email, x.recipientId, x.routingOrder]), [['agreements@havellinpalmbeach.com', '3', '3']], 'agreements@ still copied at 3');
    const ids = s.map((x) => x.recipientId).concat(cc.map((x) => x.recipientId));
    eq(new Set(ids).size, ids.length, '⚠ every recipientId is unique (' + ids.join(',') + '); the client is still 1');
    eq([s[1].email, s[2].email], ['dan@adler.example', 'mae@oneil.example'], 'each at their own address');
    const tabs = (x) => [x.tabs.signHereTabs[0].anchorString, x.tabs.dateSignedTabs[0].anchorString,
                         x.tabs.signHereTabs[0].anchorIgnoreIfNotPresent, x.tabs.dateSignedTabs[0].anchorIgnoreIfNotPresent];
    eq(tabs(s[1]), ['/hcs1/', '/hcd1/', 'false', 'false'], '⚠⚠ Daniel signs and dates at his own markers, and a marker missing refuses the envelope');
    eq(tabs(s[2]), ['/hcs2/', '/hcd2/', 'false', 'false'], 'Mae at hers');
    eq(tabs(s[0]).slice(0, 2), ['/hsc/', '/hdc/'], 'the client at the client\'s');
    eq(Object.keys(s[1].tabs).sort(), ['dateSignedTabs', 'signHereTabs'], '⚠ a co-signer carries no marketing box: the opt-out is the client\'s decision');
    eq(res.coSigners, [{ name: 'Daniel Adler', email: 'dan@adler.example', recipientId: '4' }, { name: 'Mae O\'Neil', email: 'mae@oneil.example', recipientId: '5' }],
       '⚠⚠ the answer says who it put on the envelope beside the client');
    eq([res.envelopeId, res.status], ['env-9', 'sent'], 'with the envelope, as before');
    // Placed only where the app named them: the keys, read back, nothing else.
    const g2 = gs();
    g2.esignSendEnvelope(SEND({ coSigners: [{ name: 'Daniel Adler', email: 'dan@adler.example', anchors: ['coSig3', 'coDate3'] }] }));
    eq(tabs(posted(g2).recipients.signers[1]).slice(0, 2), ['/hcs3/', '/hcd3/'], 'the tabs go to the markers the app named for that co-signer');
  });

  G('S3 · refused by name, everything at once, before DocuSign is asked: no email, no line of their own, one line twice', () => {
    const tryIt = (co) => { const g = gs(); const r = g.esignSendEnvelope(SEND({ coSigners: co })); return { r, n: g.fetches.length }; };
    let t = tryIt([{ name: 'Daniel Adler', email: '', anchors: ['coSig1', 'coDate1'] }]);
    eq([t.r.ok, t.n], [false, 0], '⚠⚠ a co-signer with no email: no envelope, and DocuSign is never asked');
    has(t.r.error, 'Daniel Adler needs a name and an email', 'named');
    t = tryIt([{ name: 'Daniel Adler', email: 'dan@adler.example', anchors: [] }]);
    eq([t.r.ok, t.n], [false, 0], 'no markers named for them: refused');
    has(t.r.error, 'Daniel Adler has no signature line of their own on the agreement', 'named');
    t = tryIt([{ name: 'Daniel Adler', email: 'dan@adler.example', anchors: ['coSig1', 'coDate2'] }]);
    eq([t.r.ok, t.n], [false, 0], '⚠ a signature on one block and a date on another: refused');
    t = tryIt([{ name: 'Daniel Adler', email: 'dan@adler.example', anchors: ['coSig1', 'coDate1'] }, { name: 'Mae O\'Neil', email: 'mae@oneil.example', anchors: ['coSig1', 'coDate1'] }]);
    eq([t.r.ok, t.n], [false, 0], '⚠ two co-signers on one block: refused');
    has(t.r.error, 'Mae O\'Neil has no signature line of their own', 'the second is named');
    t = tryIt([{ name: '', email: 'x@y.z', anchors: ['coSig1', 'coDate1'] }, { name: 'Mae O\'Neil', email: '', anchors: [] }]);
    eq([t.r.ok, t.n], [false, 0], 'two problems');
    has(t.r.error, 'co-signer 1 needs a name and an email; Mae O\'Neil needs a name and an email', '⚠ everything missing, at once');
    has(t.r.error, 'The envelope was not created', 'and it says no envelope exists');
  });

  G('S3 · with no co-signer the server posts the envelope it always did, byte for byte', () => {
    const g = gs();
    const r = g.esignSendEnvelope(SEND({ signerName: 'Tripp Butler', signerEmail: 'tripp@x.com', hvlId: 'HVL-0007' }));
    eq(sha(g.fetches[0].opts.payload), GOLD.envelope, '⚠⚠ the envelope JSON DocuSign receives is byte for byte what 456d0cb posted');
    eq(posted(g).recipients.signers.length, 2, 'two signers');
    eq(r.coSigners, [], 'and the answer says nobody was put beside the client');
    const g2 = gs();
    g2.esignSendEnvelope(SEND({ signerName: 'Tripp Butler', signerEmail: 'tripp@x.com', hvlId: 'HVL-0007', coSigners: [] }));
    eq(sha(g2.fetches[0].opts.payload), GOLD.envelope, 'an empty list is no list');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('S4 · the status: the client is recipientId 1 wherever DocuSign lists them; each co-signer comes back with the day they signed', () => {
    const signers = [
      { recipientId: '4', routingOrder: '1', roleName: 'Co-Signer', name: 'Daniel Adler', email: 'dan@adler.example', status: 'completed', signedDateTime: '2026-10-05T01:30:00Z' },
      { recipientId: '1', routingOrder: '1', roleName: 'Client', name: 'Ruth Adler', email: 'ruth@adler.example', status: 'completed', signedDateTime: '2026-10-04T14:00:00Z' },
      { recipientId: '2', routingOrder: '2', roleName: 'Havellin', name: 'Anthony Graziano', email: 'anthony@havellinpalmbeach.com', status: 'completed', signedDateTime: '2026-10-05T18:00:00Z' },
      { recipientId: '5', routingOrder: '1', roleName: 'Co-Signer', name: 'Mae O\'Neil', email: 'mae@oneil.example', status: 'completed', signedDateTime: '2026-10-05T12:00:00Z' },
    ];
    const g = gs(() => ({ code: 200, body: { status: 'completed', completedDateTime: '2026-10-05T18:00:00Z', recipients: { signers } } }));
    const st = g.esignEnvelopeStatus({ envelopeId: 'env-60' });
    ok(st.ok, 'the status reads back');
    eq(g.fetches[0].url, 'https://demo.docusign.net/restapi/v2.1/accounts/acct-1/envelopes/env-60?include=recipients', 'one GET of the envelope with its recipients');
    eq([st.signerName, st.signerEmail, st.signedAt], ['Ruth Adler', 'ruth@adler.example', '2026-10-04T14:00:00Z'],
       '⚠⚠ the CLIENT, although a co-signer at the same routing order is listed first');
    eq(st.coSigners, [{ name: 'Daniel Adler', email: 'dan@adler.example', recipientId: '4', signedAt: '2026-10-05T01:30:00Z' },
                      { name: 'Mae O\'Neil', email: 'mae@oneil.example', recipientId: '5', signedAt: '2026-10-05T12:00:00Z' }],
       '⚠⚠ each co-signer with their own signedDateTime, and never Havellin');
    // An answer that lacks the ids still finds the client by role.
    const noIds = signers.map((s) => { const c = Object.assign({}, s); delete c.recipientId; return c; });
    const g2 = gs(() => ({ code: 200, body: { status: 'completed', recipients: { signers: noIds } } }));
    eq(g2.esignEnvelopeStatus({ envelopeId: 'e' }).signerName, 'Ruth Adler', 'with no recipientId, roleName Client');
    // An envelope from before P20: the client and Anthony.
    const g3 = gs(() => ({ code: 200, body: { status: 'sent', recipients: { signers: signers.filter((s) => s.recipientId === '1' || s.recipientId === '2') } } }));
    const st3 = g3.esignEnvelopeStatus({ envelopeId: 'e' });
    eq([st3.signerName, st3.coSigners], ['Ruth Adler', []], 'an envelope with no co-signer reports none');
    lacks(noComments(gsFn('esignEnvelopeStatus')), "routingOrder) === '1'", '⚠ nothing finds the client by routing order any more');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // The app's send: docSend, the provider and the record, with the network and the screen stubbed.
  function sendRig(o) {
    o = o || {};
    const log = { posts: [], notices: [], pdfs: 0, filed: 0 };
    const S = lift(['docSend', 'docRecordSent', 'agreementCoSignState', 'esignAnchorsPresent', 'esignCoSignerAnchors'], [], {
      SHEETS_SYNC_URL: 'https://script.google.com/macros/s/P20/exec', ESIGN_PROVIDER_KEY: 'docusign',
      _appsScriptPost: (url, body, cb) => { log.posts.push(JSON.parse(JSON.stringify(body))); cb(true, o.answer ? o.answer(body) : { ok: true, envelopeId: 'env-60', status: 'sent', coSigners: (body.coSigners || []).map((c, i) => ({ name: c.name, email: c.email, recipientId: String(4 + i) })) }); },
      docPdfBase64: (spec, html, cb) => { log.pdfs++; cb('JVBERi0='); },
      _docNotice: (type, msg) => log.notices.push([type, msg]), _dashSendState() {}, docAction() { log.filed++; }, showSyncBadge() {},
      setTimeout: () => 0, clearTimeout() {}, saveJobs() {}, syncJobToSheets() {}, gmailConfigured: () => true, _gmailUserEmail: '',
      _pdfFailAdviceText: () => '', window: { open() {} }, Date: FixedDate(NOW),
    });
    S._docBusy = null;
    return { S, log };
  }
  const specFor = (S, job, html) => ({ job, kind: 'agreement', key: 'agreement', to: 'ruth@adler.example', via: '',
    names: { attachment: 'HVL-0060 Agreement.pdf' }, cfg: Object.assign({}, S.DOC_ACTIONS ? {} : {}, { subject: () => 'Your Havellin agreement', html: () => html }) });

  G('S5 · the send: the payload names each co-signer with the markers measured for them; the answer is recorded; the notice names everyone', () => {
    const job = JOB({ coFiduciaries: [DAN, MAE] });
    const html = agr().probateAgreementHtml(job, EST);
    const { S, log } = sendRig();
    S.jobs = [job];
    ok(S.docSend(specFor(S, job, html)), 'the send starts');
    eq(log.posts.length, 1, 'one post');
    const p = log.posts[0];
    eq(p.action, 'esignSend', 'esignSend');
    eq(p.coSigners, [{ name: 'Daniel Adler', email: 'dan@adler.example', anchors: ['coSig1', 'coDate1'] },
                     { name: 'Mae O\'Neil', email: 'mae@oneil.example', anchors: ['coSig2', 'coDate2'] }],
       '⚠⚠ each co-representative, with the pair of markers measured for them off the html sent');
    eq(p.anchors, ['clientSig', 'clientDate', 'havSig', 'havDate', 'mktOptOut', 'coSig1', 'coDate1', 'coSig2', 'coDate2'], 'and the anchors the document carries');
    eq([p.signerName, p.signerEmail], ['Ruth Adler', 'ruth@adler.example'], 'the client is the trustee, as before');
    const es = job.docState.agreement.esign;
    eq(es.coSigners, [{ name: 'Daniel Adler', email: 'dan@adler.example', recipientId: '4' }, { name: 'Mae O\'Neil', email: 'mae@oneil.example', recipientId: '5' }],
       '⚠⚠ who the backend put on the envelope is recorded on the e-sign record');
    eq(es.envelopeId, 'env-60', 'beside the envelope');
    const n = log.notices[log.notices.length - 1] || [];
    eq(n[0], 'ok', 'a clean send reads ok');
    has(n[1], 'Sent to Ruth Adler, Daniel Adler and Mae O\'Neil for signature through DocuSign', '⚠ the notice names everyone the envelope went to');
    const st = S.agreementCoSignState(job);
    eq(st.coSigners.map((c) => [c.name, c.onEnvelope, c.how]), [['Daniel Adler', true, ''], ['Mae O\'Neil', true, '']], 'both on the envelope, neither signed yet');
  });

  G('S5 · a job with no co-representative posts the payload it always did, byte for byte', () => {
    const { S, log } = sendRig();
    const html = agr().probateAgreementHtml(GOLD_PROBATE, GOLD_EST);
    const job = JSON.parse(JSON.stringify(GOLD_PROBATE)); job.id = 5; S.jobs = [job];
    S.docSend({ job, kind: 'agreement', key: 'agreement', to: 'tripp@x.com', names: { attachment: 'Agreement.pdf' }, cfg: { subject: () => 'Your agreement', html: () => html } });
    eq(sha(JSON.stringify(log.posts[0])), GOLD.payload, '⚠⚠ the esignSend payload, byte for byte what 456d0cb posted');
    ok(!('coSigners' in log.posts[0]), 'no coSigners key at all');
    ok(!('coSigners' in job.docState.agreement.esign), 'and the e-sign record carries none');
  });

  G('S5 · refused by name before anything is posted: no email (one, then two, at once), no line of their own', () => {
    const run = (job, html) => { const r = sendRig(); r.S.jobs = [job]; const started = r.S.docSend(specFor(r.S, job, html || agr().probateAgreementHtml(job, EST))); return Object.assign(r, { started, job }); };
    let r = run(JOB({ coFiduciaries: [Object.assign({}, DAN, { email: '' })] }));
    eq([r.started, r.log.pdfs, r.log.posts.length], [false, 0, 0], '⚠⚠ nothing at all is posted: not the PDF, not the envelope');
    eq(r.log.notices, [['warn', 'Daniel Adler has no email recorded. Add it on Edit Client, or send the PDF to sign by hand.']], '⚠⚠ named, with the fix');
    ok(!r.job.docState.agreement, 'and nothing is recorded as sent');
    r = run(JOB({ coFiduciaries: [Object.assign({}, DAN, { email: ' ' }), Object.assign({}, MAE, { email: '' })] }));
    eq(r.log.notices, [['warn', 'Daniel Adler and Mae O\'Neil have no email recorded. Add them on Edit Client, or send the PDF to sign by hand.']], 'everyone missing, at once');
    // A page that does not give a co-signer a line of their own (it never should) is refused too, never sent tab-less.
    const job = JOB({ coFiduciaries: [DAN, Object.assign({}, MAE, { email: '' })] });
    r = run(job, agr().probateAgreementHtml(job, EST).replace('/hcs1/', ''));
    eq(r.log.posts.length, 0, 'nothing posted');
    eq((r.log.notices[0] || [])[1], 'Mae O\'Neil has no email recorded. Add it on Edit Client, or send the PDF to sign by hand. The agreement carries no DocuSign signature line for Daniel Adler, so the envelope could not place that signature. Send the PDF to sign by hand.',
       '⚠ both reasons, at once: Daniel\'s line is missing from the page, and Mae has no email');
    // ⚠ The provider's own send asks again, where the envelope is made.
    const r2 = sendRig(); const j2 = JOB({ coFiduciaries: [Object.assign({}, DAN, { email: '' })] }); r2.S.jobs = [j2];
    let out = null;
    r2.S.DOC_SEND_PROVIDERS.docusign.send({ job: j2, anchors: ['clientSig', 'clientDate', 'havSig', 'havDate', 'coSig1', 'coDate1'], names: { attachment: 'a.pdf' }, cfg: { subject: () => 's' } },
      'JVBERi0=', (okk, err) => { out = { okk, err }; });
    eq([out.okk, r2.log.posts.length], [false, 0], '⚠⚠ the send itself refuses and posts nothing');
    eq(out.err, 'Daniel Adler has no email recorded. Add it on Edit Client, or send the PDF to sign by hand', 'in the same words (the caller adds the stop)');
  });

  G('S5 · an answer without the list (a deployment older than 2026-10-05) is recorded as nobody on the envelope, and said', () => {
    const job = JOB();
    const { S, log } = sendRig({ answer: () => ({ ok: true, envelopeId: 'env-old', status: 'sent' }) });
    S.jobs = [job];
    S.docSend(specFor(S, job, agr().probateAgreementHtml(job, EST)));
    eq(log.posts[0].coSigners, [{ name: 'Daniel Adler', email: 'dan@adler.example', anchors: ['coSig1', 'coDate1'] }], 'the app asked for Daniel');
    eq(job.docState.agreement.esign.coSigners, [], '⚠⚠ recorded as what the backend did: nobody beside the client');
    const n = log.notices[log.notices.length - 1] || [];
    eq(n[0], 'warn', 'the notice is a warning');
    has(n[1], 'Sent to Ruth Adler for signature through DocuSign', 'the envelope went to the client alone');
    has(n[1], 'Daniel Adler was not put on the envelope (the Apps Script deployment is older than 2026-10-05: redeploy it), so they sign a printed copy of the agreement; file the page they signed under the timeline once the client has signed.',
        '⚠⚠ and says who was left off, why, and what happens instead');
    eq(S.agreementCoSignState(job).coSigners.map((c) => c.onEnvelope), [false], 'the record says he is not on the envelope');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // The arrival check and the record: applyEsignStatus → recordAgreementSignature.
  function statusRig() {
    return lift(['applyEsignStatus', 'agreementCoSignState', 'isAgreementSigned'], ['esignArchiveSigned'], {
      saveJobs() {}, syncJobToSheets() {}, _dashRedraw() {}, renderJobs() {}, esignArchiveSigned() {}, ESIGN_PROVIDER_KEY: 'docusign', Date: FixedDate(NOW) });
  }
  G('S6 · on completed, each co-signer DocuSign reports is recorded beside the client, on their own local day', () => {
    const S = statusRig();
    const job = OUT([{ name: 'Daniel Adler', email: 'dan@adler.example', recipientId: '4' }]);
    S.jobs = [job];
    // Not yet complete: kept as it was, the envelope's list included, nothing signed.
    eq(S.applyEsignStatus(60, { envelopeId: 'env-60', status: 'delivered', signerName: 'Ruth Adler',
      coSigners: [{ name: 'Daniel Adler', email: 'dan@adler.example', recipientId: '4', signedAt: '2026-10-04T14:00:00Z' }] }), '', 'a status that is not completed');
    eq(S.isAgreementSigned(job), false, '⚠ is not a signature, whoever has signed so far');
    eq(job.docState.agreement.esign.coSigners, [{ name: 'Daniel Adler', email: 'dan@adler.example', recipientId: '4' }],
       '⚠⚠ who the send put on the envelope survives the check that rewrites the e-sign record');
    eq(job.docState.agreement.esign.status, 'delivered', 'with the status it read');
    // Completed.
    eq(S.applyEsignStatus(60, { envelopeId: 'env-60', status: 'completed', completedAt: '2026-10-05T18:00:00Z',
      signerName: 'Ruth Adler', signerEmail: 'ruth@adler.example', signedAt: '2026-10-04T14:00:00Z',
      coSigners: [{ name: 'Daniel Adler', email: 'dan@adler.example', recipientId: '4', signedAt: '2026-10-05T01:30:00Z' }] }), '', 'completed is recorded');
    const sig = job.docState.agreement.sig;
    eq([sig.how, sig.signedBy, sig.signedOn, sig.provider, sig.envelopeId], ['esign', 'Ruth Adler', '2026-10-04', 'docusign', 'env-60'], 'the client\'s signature, as before');
    eq(sig.coSigners, [{ name: 'Daniel Adler', email: 'dan@adler.example', signedOn: '2026-10-04' }],
       '⚠⚠ Daniel\'s, on HIS day in Palm Beach (01:30Z on the 5th is 9:30pm on the 4th), never sliced off an ISO stamp');
    ok(typeof job.at['docState:agreement'] === 'number', 'a signature learned is stamped like a hand entry');
    const st = S.agreementCoSignState(job);
    eq([st.onRecord, st.owed, st.coSigners[0].how, st.coSigners[0].signedOn], [true, false, 'esign', '2026-10-04'], '⚠⚠ the co-signature is on record');
    // A co-signer with no day of their own takes the envelope's completion.
    const j2 = OUT([{ name: 'Daniel Adler', email: 'dan@adler.example', recipientId: '4' }], { id: 61 }); S.jobs = [j2];
    S.applyEsignStatus(61, { envelopeId: 'env-60', status: 'completed', completedAt: '2026-10-05T18:00:00Z', signerName: 'Ruth Adler',
      coSigners: [{ name: 'Daniel Adler', email: 'dan@adler.example', recipientId: '4', signedAt: '' }] });
    eq(j2.docState.agreement.sig.coSigners[0].signedOn, '2026-10-05', 'with no day of their own: the day the envelope completed');
    // An answer with no co-signers (an older deployment) records none: the row then asks for the printed page.
    const j3 = OUT([], { id: 62 }); S.jobs = [j3];
    S.applyEsignStatus(62, { envelopeId: 'env-60', status: 'completed', completedAt: '2026-10-05T18:00:00Z', signerName: 'Ruth Adler' });
    ok(!('coSigners' in j3.docState.agreement.sig), '⚠ none named, none recorded: a signature the app did not witness is never claimed');
    eq(S.agreementCoSignState(j3).owed, true, 'and the co-signature is owed');
    // A job with no co-representative records exactly the signature it always did.
    const j4 = OUT(null, { id: 63, coFiduciaries: [] }); S.jobs = [j4];
    S.applyEsignStatus(63, { envelopeId: 'env-60', status: 'completed', completedAt: '2026-10-05T18:00:00Z', signerName: 'Ruth Adler', coSigners: [] });
    eq(Object.keys(j4.docState.agreement.sig).sort(), ['envelopeId', 'how', 'note', 'provider', 'recordedAt', 'recordedBy', 'signedBy', 'signedOn', 'signerEmail'],
       'no co-signer: the record has the shape it always had');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('S7 · agreementCoSignState: the one answer, in every state', () => {
    const S = lift(['agreementCoSignState'], [], {});
    const st = (job) => S.agreementCoSignState(job);
    const none = st(JOB({ coFiduciaries: [] }));
    eq([none.coSigners.length, none.onRecord, none.owed], [0, true, false], 'nobody recorded: nothing to ask for');
    eq(st(JOB({ svc: 'downsizing', matterType: '', coFiduciaries: [DAN] })).coSigners.length, 0, 'a living client has no co-representative');
    // Before the client signs nothing is owed, whichever route.
    eq([st(JOB()).onRecord, st(JOB()).owed], [false, false], 'unsigned: not on record, and not yet owed');
    eq(st(OUT([{ name: 'Daniel Adler', email: 'dan@adler.example', recipientId: '4' }])).owed, false, 'out for signature: not owed');
    // The paper route, the client's signature recorded by hand.
    const h = st(HAND());
    eq([h.onRecord, h.owed, h.gaps.map((c) => c.name)], [false, true, ['Daniel Adler']], '⚠⚠ hand-signed by the client: Daniel\'s signature is owed');
    eq(h.coSigners[0].onEnvelope, false, 'and he was on no envelope');
    // A filed page naming him puts it on record; voided, it is owed again.
    const page = { id: 'sr1', kind: 'agreement', ref: 'agreement', signedBy: 'Daniel Adler', fileUrl: 'https://drive.google.com/file/d/P/view', filedAt: T0 };
    const filed = st(HAND({ signedRecords: [page] }));
    eq([filed.onRecord, filed.owed, filed.coSigners[0].how, filed.pages.length], [true, false, 'filed', 1], '⚠⚠ a live co-signed page naming him: on record');
    eq(st(HAND({ signedRecords: [Object.assign({}, page, { voidedAt: T0, voidReason: 'wrong page' })] })).owed, true, '⚠ voided, it is owed again');
    eq(st(HAND({ signedRecords: [Object.assign({}, page, { kind: 'receipt' })] })).owed, true, 'a page of another kind is not his');
    eq(st(HAND({ signedRecords: [Object.assign({}, page, { signedBy: 'Someone Else' })] })).owed, true, 'nor one that names somebody else');
    // Two co-signers: a page names who signed it; a later co-representative is owed on their own.
    const two = st(HAND({ coFiduciaries: [DAN, MAE], signedRecords: [page] }));
    eq([two.onRecord, two.gaps.map((c) => c.name)], [false, ['Mae O\'Neil']], 'a page naming Daniel leaves Mae owed');
    eq(st(HAND({ coFiduciaries: [DAN, MAE], signedRecords: [Object.assign({}, page, { signedBy: 'Daniel Adler; Mae O\'Neil' })] })).onRecord, true, 'one naming both covers both');
    // DocuSign's record: by name (samePerson) or by the address the envelope carried.
    const es = (co) => JOB({ agrSent: true, docState: { agreement: { sentAt: '2026-10-02T14:00:00.000Z', esign: { envelopeId: 'e', coSigners: [{ name: 'Daniel Adler', email: 'dan@adler.example', recipientId: '4' }] },
      sig: { how: 'esign', signedBy: 'Ruth Adler', signedOn: '2026-10-04', provider: 'docusign', coSigners: co } } } });
    const e1 = st(es([{ name: 'daniel adler ', email: '', signedOn: '2026-10-04' }]));
    eq([e1.onRecord, e1.coSigners[0].how, e1.coSigners[0].onEnvelope], [true, 'esign', true], 'by name, as samePerson reads it');
    eq(st(es([{ name: 'Dan Adler', email: 'DAN@adler.example', signedOn: '2026-10-04' }])).onRecord, true, 'or by the address DocuSign authenticated');
    eq(st(es([])).owed, true, '⚠ an envelope that completed with nobody named for him: owed (never assumed)');
    eq(st(es([{ name: 'Someone Else', email: 'x@y.z', signedOn: '2026-10-04' }])).owed, true, 'a stranger on the record covers nobody');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // The rail: jobTimeline, its renderers, and what the next step is.
  let _tl = null;
  const tl = () => _tl || (_tl = lift(['jobTimeline', 'jobTimelineNext', 'jtRailHtml', 'jtTrackHtml', 'jobActivationBlockers'], [],
    { Date: FixedDate(NOW), _todayStr: () => '2026-10-05', estimateStore: {}, jobs: [], ESIGN_PROVIDER_KEY: 'docusign', fmtDate2: (d) => 'D:' + d }));
  const rowOf = (job, key) => { const S = tl(); S.jobs = [job]; S.estimateStore = { 60: REC() }; const rows = S.jobTimeline(job, S.estimateStore[60], [], []); return { rows, r: rows.filter((x) => x.key === (key || 'agreement_signed'))[0] || {} }; };

  G('S8 · the Agreement signed row: who signs where while it is out; once the client signs, each co-signer on record, or flagged', () => {
    // Out for signature, Daniel on the envelope.
    let r = rowOf(OUT([{ name: 'Daniel Adler', email: 'dan@adler.example', recipientId: '4' }])).r;
    eq([r.done, r.sub, r.flag], [false, 'DocuSign is watching for it — Daniel Adler signs there too', ''], '⚠ out for signature: Daniel signs in DocuSign beside the client');
    // Out on an envelope an older deployment sent: he was not on it.
    r = rowOf(OUT([])).r;
    eq(r.sub, 'DocuSign is watching for it — Daniel Adler was not sent the envelope and signs a printed copy', '⚠⚠ an envelope without him says so, before anyone waits on it');
    r = rowOf(OUT([{ name: 'Daniel Adler', email: 'dan@adler.example', recipientId: '4' }], { coFiduciaries: [DAN, MAE] })).r;
    eq(r.sub, 'DocuSign is watching for it — Daniel Adler signs there too; Mae O\'Neil was not sent the envelope and signs a printed copy', 'mixed: each said once');
    // Completed in DocuSign with Daniel: done, both named, his day on the line.
    const done = OUT([{ name: 'Daniel Adler', email: 'dan@adler.example', recipientId: '4' }]);
    done.agrSigned = true;
    done.docState.agreement.sig = { how: 'esign', signedBy: 'Ruth Adler', signerEmail: 'ruth@adler.example', signedOn: '2026-10-04', provider: 'docusign',
      coSigners: [{ name: 'Daniel Adler', email: 'dan@adler.example', signedOn: '2026-10-04' }] };
    const d = rowOf(done);
    eq([d.r.done, d.r.by, d.r.flag], [true, 'Ruth Adler, Daniel Adler', ''], '⚠⚠ signed: the row names the client and the co-signer');
    eq(d.r.sub, 'Electronic signature · ruth@adler.example · Daniel Adler signed in DocuSign D:2026-10-04', 'and how, with his day');
    // Hand-signed by the client: done, flagged, the light moves on and Activate is still offered.
    const h = rowOf(HAND());
    eq([h.r.done, h.r.by, h.r.sub], [true, 'Ruth Adler', 'Signed in person'], 'the client\'s signature reads as it always did');
    eq(h.r.flag, 'Not on record: the signature of Daniel Adler. File the page they signed, under the timeline', '⚠⚠ and Daniel\'s is flagged');
    eq(h.r.state, 'done', '⚠⚠ a flag never undoes the row');
    ok(((tl().jobTimelineNext(h.rows) || {}).key || '') !== 'agreement_signed', '⚠⚠ the light moves on: nothing waits on the co-signature');
    eq(tl().jobActivationBlockers(Object.assign(HAND(), { depositReceived: true })), [], '⚠⚠ and activation is not held by it');
    // Filed: on record.
    const f = rowOf(HAND({ signedRecords: [{ id: 'sr1', kind: 'agreement', ref: 'agreement', signedBy: 'Daniel Adler', filedAt: T0 }] }));
    eq([f.r.by, f.r.sub, f.r.flag], ['Ruth Adler, Daniel Adler', 'Signed in person · Daniel Adler on the co-signed page filed', ''], 'a filed page clears the flag and names him');
    // Two owed.
    eq(rowOf(HAND({ coFiduciaries: [DAN, MAE] })).r.flag, 'Not on record: the signatures of Daniel Adler and Mae O\'Neil. File the page they signed, under the timeline', 'two, at once');
    // No co-representative: the row is exactly what it was.
    const plain = rowOf(HAND({ coFiduciaries: [] })).r;
    eq([plain.by, plain.sub, plain.flag], ['Ruth Adler', 'Signed in person', ''], 'nobody recorded: as before');
    eq(rowOf(OUT(null, { coFiduciaries: [] })).r.sub, 'DocuSign is watching for it', 'and out for signature, as before');
  });

  G('S8 · the rail and the track paint the flag, amber, under the row', () => {
    const { rows } = rowOf(HAND());
    const rail = tl().jtRailHtml(rows), track = tl().jtTrackHtml(rows);
    const flagLine = '&#9888; Not on record: the signature of Daniel Adler. File the page they signed, under the timeline';
    has(rail, '<div class="jt-sub jt-warn">' + flagLine + '</div>', '⚠⚠ the rail (a phone) prints the flag');
    has(track, '<div class="jt-ssub jt-warn">' + flagLine + '</div>', '⚠⚠ and the track (a desk) too, under the signer');
    eq(count(rail, 'jt-warn'), 1, 'once on the rail');
    const css = SRC.slice(SRC.indexOf('<style'), SRC.indexOf('</style>'));
    has(css, '.jt-warn,.jt-sub.jt-warn,.jt-ssub.jt-warn{color:var(--warn-tx);font-weight:600;}', 'amber, specific enough to beat the plain sub-line\'s grey');
    lacks(tl().jtRailHtml(rowOf(HAND({ coFiduciaries: [] })).rows), 'jt-warn', 'no flag, no line');
    // Person-entered names are text.
    has(tl().jtRailHtml(rowOf(HAND({ coFiduciaries: [{ id: 'x', name: '<b>Eve</b>', email: 'e@x.com' }] })).rows), '&lt;b&gt;Eve&lt;/b&gt;', 'a typed name is escaped');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // The block under the timeline: the File control (fileSignedCopy) and Void.
  function blockRig(o) {
    o = o || {};
    const log = { uploads: [], badges: [], redraws: 0 };
    const S = lift(['agreementCoSignHtml', 'fileSignedCopyFromInput', 'voidSignedRecord'], [], {
      SHEETS_SYNC_URL: 'https://script.google.com/macros/s/P20/exec', saveJobs() {}, syncJobToSheets() {}, Date: FixedDate(NOW),
      resolveSubfolderId(j, name, cb) { cb('SIGNED60'); },
      uploadToDrive(folderId, filename, dataUrl, cb) { log.uploads.push({ folderId, filename }); cb(true, 'https://drive.google.com/file/d/F' + log.uploads.length + '/view', 'F' + log.uploads.length); },
      FileReader: function () { const self = this; self.readAsDataURL = function (file) { self.result = 'data:' + file.type + ';base64,QUJD'; if (self.onload) self.onload(); }; },
      showSyncBadge: (m) => log.badges.push(m), _dashRedraw() { log.redraws++; }, _jobBandHost: () => ({ kind: 'dash', jobId: 60 }),
      window: { prompt: () => o.why || '' }, fmtDate2: (d) => 'D:' + d,
    });
    return { S, log };
  }
  G('S8 · the block under the timeline: who is owed, the control that files the page they signed, and the filed page with its Void', () => {
    const { S, log } = blockRig({ why: 'Filed against the wrong job' });
    const job = HAND();
    S.jobs = [job];
    let h = S.agreementCoSignHtml(job);
    has(text(h), 'Co-representatives on the agreement ⚠ Daniel Adler — signature not on record', '⚠⚠ who is owed, in amber');
    has(text(h), 'Have Daniel Adler sign the agreement’s printed signature page, then file it: File the page signed by Daniel Adler', 'and the one thing to do');
    const m = /onchange="fileSignedCopyFromInput\(this,(\d+)\)"/.exec(h);
    ok(!!m, '⚠⚠ the control is the signed-copy file picker (signedCopyControlHtml)');
    has(h, 'accept="application/pdf,image/*"', 'a PDF or a photograph of the page');
    const spec = S._signedCopySpecs[Number(m && m[1])] || {};
    eq([spec.jobId, spec.kind, spec.meta && spec.meta.ref, spec.meta && spec.meta.signedBy], [60, 'agreement', 'agreement', 'Daniel Adler'],
       '⚠⚠ it files a co-signed agreement page, naming who signed it');
    // Press it: the person picks the photograph of the signed page.
    S.fileSignedCopyFromInput({ files: [{ name: 'IMG_7.JPG', type: 'image/jpeg', size: 400000 }], value: 'x' }, Number(m && m[1]));
    eq(log.uploads.length, 1, 'one upload');
    eq(log.uploads[0].folderId, 'SIGNED60', 'into the client\'s Signed Records folder');
    ok(/^HVL-0060 - Co-signed agreement page - agreement - 2026-10-05 \d{6}\.jpg$/.test(log.uploads[0].filename), 'named for the client and the paper: ' + log.uploads[0].filename);
    const rec = (job.signedRecords || [])[0] || {};
    eq([rec.kind, rec.ref, rec.signedBy, rec.label, rec.fileId], ['agreement', 'agreement', 'Daniel Adler', 'Co-signed agreement page', 'F1'], '⚠⚠ recorded on the job as a signed record');
    ok(typeof job.at['signedRecords:' + rec.id] === 'number', 'stamped on its own key: a person\'s edit');
    eq(log.badges, ['Co-signed agreement page filed to Drive.'], 'and said');
    ok(log.redraws >= 1, 'the dashboard repaints');
    eq(S.agreementCoSignState(job).onRecord, true, '⚠⚠ the co-signature is on record');
    h = S.agreementCoSignHtml(job);
    has(text(h), '✓ Daniel Adler — on the co-signed page filed', 'the block now says so');
    lacks(h, 'fileSignedCopyFromInput', '⚠ and offers no control: nothing is owed');
    has(h, 'href="https://drive.google.com/file/d/F1/view"', 'the filed page links to Drive');
    has(h, 'onclick="voidSignedRecord(60,\'' + rec.id + '\')"', 'with its Void');
    // Void it (filed against the wrong job): owed again, the control back.
    ok(S.voidSignedRecord(60, rec.id), 'voided, with a reason');
    eq(rec.voidReason, 'Filed against the wrong job', 'the reason is kept');
    eq(S.agreementCoSignState(job).owed, true, '⚠ owed again');
    has(S.agreementCoSignHtml(job), 'fileSignedCopyFromInput', 'and the control is back');
    // Nothing owed and nothing filed: no block. Before the client signs: none either.
    eq(S.agreementCoSignHtml(HAND({ coFiduciaries: [] })), '', 'no co-representative: no block');
    eq(S.agreementCoSignHtml(JOB()), '', 'before the client\'s signature: no block (the row says who signs where)');
    const es = OUT([{ name: 'Daniel Adler', email: 'dan@adler.example', recipientId: '4' }]);
    es.docState.agreement.sig = { how: 'esign', signedBy: 'Ruth Adler', signedOn: '2026-10-04', provider: 'docusign', coSigners: [{ name: 'Daniel Adler', email: 'dan@adler.example', signedOn: '2026-10-04' }] };
    eq(S.agreementCoSignHtml(es), '', 'signed in DocuSign by everyone: the row says so, and no block');
    has(S.agreementCoSignHtml(HAND({ coFiduciaries: [{ id: 'x', name: 'Eve "E" <b>', email: '' }] })), 'Eve &quot;E&quot; &lt;b&gt;', 'a typed name is text');
  });

  G('S8 · the dashboard draws the block under the strip, and the card says how each co-representative signs', () => {
    const dom = domStub({});
    const S = lift(['renderClientDashboard'], ['esignRefresh', 'stripeRefresh', 'maybeStartJobsWatch', 'refreshPhotoRefs'], {
      document: dom, setTimeout: () => 0, clearTimeout() {}, Intl: global.Intl, Date: FixedDate(NOW),
      jobs: [], changeOrders: [], contractors: [], _photoRefs: {}, jobLogs: {}, SHEETS_SYNC_URL: 'https://script.google.com/macros/s/P20/exec',
      jobPlanStore: {}, estimateStore: { 60: REC() }, maybeStartJobsWatch() {}, esignRefresh() {}, stripeRefresh() {}, refreshPhotoRefs() {} });
    const render = (job) => { S.jobs.length = 0; S.jobs.push(JSON.parse(JSON.stringify(job))); S.renderClientDashboard(60); return dom.getElementById('client-dashboard-view').innerHTML; };
    const h = render(HAND());
    const at = h.indexOf('<div class="jt-cosign" id="jt-cosign">');
    ok(at > 0, '⚠⚠ the block is on the dashboard');
    ok(at > h.indexOf('class="jt-rail"') && (h.indexOf('class="jt-pays"') < 0 || at < h.indexOf('class="jt-pays"')), 'under the timeline, above the payments');
    eq(count(h, 'fileSignedCopyFromInput'), 1, '⚠ one File control on the screen');
    has(text(h), 'Each signs the agreement beside Ruth Adler: in DocuSign, which needs their email, or on the printed page when it is signed by hand.', '⚠⚠ the card says how each signs');
    lacks(h, 'goes to Ruth Adler alone', 'never the old one-signer sentence');
    lacks(render(HAND({ coFiduciaries: [] })), 'jt-cosign', 'no co-representative: no block');
  });

  G('S8 · recording the client\'s signature by hand names the co-signature still owed', () => {
    const notes = [], strip = [];
    const dom = domStub({ 'sig-how': 'wet', 'sig-by': 'Ruth Adler', 'sig-on': '2026-10-03', 'sig-note': '' });
    const S = lift(['confirmAgreementSignature'], [], { document: dom, saveJobs() {}, syncJobToSheets() {}, renderJobs() {}, updateAgrUI() {}, _dashRedraw() {},
      showFB: (id, t, m) => strip.push([id, t, m]), _dashFbTarget: () => 'dash-fb', dashNotice: (t, m) => notes.push([t, m]), Date: FixedDate(NOW) });
    const job = JOB({ agrSent: true, docState: { agreement: { sentAt: '2026-10-02T14:00:00.000Z', provider: 'gmail' } } });
    S.jobs = [job]; S._sigJobId = 60;
    S.confirmAgreementSignature();
    eq(job.docState.agreement.sig.signedBy, 'Ruth Adler', 'the client\'s signature is recorded');
    eq(notes, [['warn', 'Signature recorded — signed by Ruth Adler. Daniel Adler’s signature is not on record yet: have them sign the printed signature page, then file it under the timeline. Record the deposit when it arrives.']],
       '⚠⚠ and the notice names Daniel\'s, owed, and where it goes');
    eq(strip, [['dash-fb', 'warn', 'Signature recorded — signed by Ruth Adler. Daniel Adler’s signature is not on record yet: have them sign the printed signature page, then file it under the timeline. Record the deposit when it arrives.']],
       '⚠⚠ and the strip carries the same message, where a shorter one used to be written over it');
    const S2 = lift(['confirmAgreementSignature'], [], { document: domStub({ 'sig-how': 'wet', 'sig-by': 'Tripp <b>Butler</b>', 'sig-on': '2026-10-03' }), saveJobs() {}, syncJobToSheets() {}, renderJobs() {}, updateAgrUI() {},
      _dashRedraw() {}, showFB: (id, t, m) => strip.push([id, t, m]), _dashFbTarget: () => 'dash-fb', dashNotice: (t, m) => notes.push([t, m]) });
    const plain = JOB({ coFiduciaries: [], agrSent: true, docState: { agreement: { sentAt: '2026-10-02T14:00:00.000Z' } } });
    S2.jobs = [plain]; S2._sigJobId = 60; notes.length = 0; strip.length = 0;
    S2.confirmAgreementSignature();
    eq(notes, [['ok', 'Signature recorded — signed by Tripp <b>Butler</b>. Record the deposit when it arrives.']], 'with nobody to ask for, the notice it always gave');
    eq(strip, [['dash-fb', 'ok', 'Signature recorded — signed by Tripp &lt;b&gt;Butler&lt;/b&gt;. Record the deposit when it arrives.']], '⚠ the strip\'s copy is escaped: the signer\'s name was typed');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('S9 · one definition, every reader counted', () => {
    eq(readers(/(?<![\w.$])agreementCoSignState\(/g), { agreementCoSignHtml: 1, confirmAgreementSignature: 1, docSend: 1, jobTimeline: 1 },
       '⚠⚠ the one answer: the row, the block, the send\'s notice and the hand recorder\'s');
    eq(readers(/(?<![\w.$])esignCoSigners\(/g), { 'var DOC_SEND_PROVIDERS': 2 }, 'who signs beside the client: the provider\'s check before the PDF and its send');
    eq(readers(/(?<![\w.$])esignCoSignerAnchors\(/g), { esignAnchorsPresent: 1, esignCoSigners: 1, probateAgreementHtml: 1 }, 'the markers\' one namer: the page, the measure, the envelope');
    eq(readers(/(?<![\w.$])agreementCoSignHtml\(/g), { renderClientDashboard: 1 }, 'the block is drawn once, on the dashboard');
    // Nothing else reads the co-signature record or the filed pages.
    eq(readers(/\bsig\.coSigners\b/g), { agreementCoSignState: 2, recordAgreementSignature: 4 }, '⚠ the signature\'s co-signers: written by the recorder (from what the provider named), read by the one answer alone');
    eq(readers(/signedRecordsOf\([^)]*'agreement'/g), { agreementCoSignState: 1 }, '⚠ the filed pages are read by the one answer');
    eq(readers(/\besign\.coSigners\b/g), { agreementCoSignState: 2, docRecordSent: 1 }, 'the envelope\'s list: written at the send, read by the one answer alone (the check keeps it with every other field of the envelope\'s record, P22)');
    eq(readers(/AGR_COSIGN_REF/g), { agreementCoSignHtml: 1, agreementCoSignState: 1 }, 'the page\'s ref');
    const kinds = new Function('return ' + decl('SIGNED_RECORD_KINDS').replace(/^var\s+\w+\s*=\s*/, '').replace(/;\s*$/, ''))();
    eq(kinds.agreement, { label: 'Co-signed agreement page' }, 'the new kind of signed record');
    has(decl('AGR_COSIGN_REF'), "'agreement'", 'its ref, a stored value');
  });

  G('S9 · the backend: 2026-10-05, asked for by the app, and the banner names what an older one costs', () => {
    const bv = (GS.match(/var BACKEND_VERSION = '([^']+)';/) || [])[1];
    ok(bv >= '2026-10-05', 'BACKEND_VERSION is at least the P20 bump (P22 raised it to 2026-10-06)');
    const B = sandbox({ vars: ['BACKEND_MIN_VERSION', 'BACKEND_FEATURE_COST', 'BACKEND_NEEDS'] });
    ok(B.BACKEND_MIN_VERSION >= '2026-10-05', '⚠⚠ the app asks for at least it: an older deployment puts no co-representative on the envelope');
    ok(String(B.BACKEND_FEATURE_COST.version).indexOf('a co-executor or co-trustee is not put on the DocuSign envelope beside the client, so they sign a printed copy of the agreement') === 0,
       '⚠ the banner names that consequence first');
    has(B.BACKEND_FEATURE_COST.version, 'on a deployment older than 2026-10-03, a co-trustee, a beneficiary', 'and says which older gaps belong to which vintage');
    ok(['esignSend', 'esignStatus'].every((a) => B.BACKEND_NEEDS.indexOf(a) >= 0), 'no new action: the two it always used');
    has(GS, '2026-10-05 (P20): esignSend puts every co-representative', 'the deployment header says what changed');
  });

  G('S9 · the intake and Edit Client hint says each signs the agreement beside the representative', () => {
    const S = lift(['coFiduciaryBlockHtml'], [], {});
    const h = S.coFiduciaryBlockHtml('ec', [DAN]);
    has(h, 'Each one approves the releases with the representative and signs the agreement beside them: in DocuSign, which needs their email, or on the printed page when it is signed by hand.', '⚠⚠ the hint');
    lacks(h, 'representative alone', 'never the old one-signer sentence');
  });

  G('S9 · the four documents describe the co-signature, both routes, the flag and the redeploy', () => {
    const root = path.join(__dirname, '..');
    const norm = (s) => s.replace(/<[^>]+>/g, '').replace(/\*\*|\*|`/g, '').replace(/&rsquo;|’/g, '\'').replace(/&sect;/g, '§')
      .replace(/&mdash;/g, '—').replace(/&hellip;/g, '…').replace(/&ldquo;|&rdquo;/g, '"').replace(/&amp;/g, '&').replace(/&#9888;/g, '⚠').replace(/\s+/g, ' ');
    ['MANUAL.md', 'manual.html', 'CONCIERGE_GUIDE.md', 'concierge-guide.html'].forEach((f) => {
      const d = norm(fs.readFileSync(path.join(root, f), 'utf8'));
      has(d, 'since 2026-10-05 (P20)', f + ': says when it changed');
      has(d, 'signs in DocuSign beside the client', f + ': each co-representative signs in DocuSign beside the client');
      has(d, 'File the page signed by', f + ': names the control that files the co-signed page');
      has(d, 'has no email recorded. Add it on Edit Client, or send the PDF to sign by hand.', f + ': quotes the refusal');
      lacks(d, 'a DocuSign envelope goes to the representative alone', f + ': ⚠ no longer says DocuSign goes to one signer');
      lacks(d, 'whether a co-representative must sign the agreement too is not yet decided', f + ': ⚠ nor that it is undecided');
      lacks(d, 'Whether the others must sign the agreement too is not decided yet', f + ': (either wording)');
    });
    ['MANUAL.md', 'manual.html'].forEach((f) => {
      const d = norm(fs.readFileSync(path.join(root, f), 'utf8'));
      has(d, '2026-10-05', f + ': the redeploy note names the version');
      has(d, 'recipientId', f + ': the manual names how the client is found');
      has(d, 'Co-signed agreement page', f + ': and the signed record\'s kind');
    });
  });
};
