'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P20 · THE LEAD'S JOINS (2026-10-05). P20 was built in three workstreams, each tested on its own tree: WA (Q22, every
// co-representative signs the agreement in DocuSign beside the client), WB (Q23–Q25, partial approvals, ratification,
// the staff rule on living work) and WC (Q26–Q27, the service's name on a matter with no court, the trust's date in
// full). Two of them meet in code each tested alone, so this file drives the joins on the merged build:
//
//   L1  the estate agreement, which WA (the co-signer blocks and their DocuSign markers) and WC (the title, the sentence
//       under it and §1.2's trust date) both edited: one render of a Probate service on a trust with two co-trustees
//       carries both, the envelope's co-signers are measured off that same render, and on the probate track the title
//       keeps its name with the markers unchanged.
//   L2  the fiduciaries: the people WA puts on the envelope beside the client are exactly the people a release still
//       waits on (WB) once the client has signed it, and a release is complete when every one of them has, on their
//       own days.
// Driven through the real functions (closure-lifted); only the store, the job list and the document are stubbed.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source, fn, decl, domStub } = require('./harness');

const SRC = source();
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
// The functions and top-level vars `roots` reach (the P19 and P20 tests' closure); `stop` names what the test supplies.
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

// ── Fixtures: a trust estate whose trustee is Ruth Adler, with two co-trustees, quoted as a Probate service ──────────
const DAN = { id: 'cf1', name: 'Daniel Adler', role: 'Trustee', email: 'dan@adler.example' };
const MAE = { id: 'cf2', name: 'Mae O\'Neil', role: 'Trustee', email: 'mae@oneil.example' };
const JOB = (o) => Object.assign({
  id: 60, hvlId: 'HVL-0060', name: 'Harold Adler', svc: 'probate', matterType: 'trust', status: 'won', won: true, approved: true,
  wonAt: '2026-10-01', created: 'Sep 28, 2026', walkthrough: '2026-09-29', agrApproved: true, agrApprovedBy: 'Anthony Graziano',
  tc: 'Ashley Jerome', addr: '100 Ocean Blvd', city: 'Palm Beach', zip: '33480', deathDate: '2026-08-01',
  executor: 'Ruth Adler', executorRole: 'Trustee', executorEmail: 'ruth@adler.example', executorAuth: 'received',
  trustName: 'Adler Family Trust', trustDate: '2015-03-03', docTier: 'values',
  coFiduciaries: [Object.assign({}, DAN), Object.assign({}, MAE)], docState: {}, at: {}, updatedAt: 1, payments: [],
}, o || {});
const EST = (svc) => ({ jobId: 60, svc: svc || 'probate', tcFee: 6000, psFee: 8000, pkgCost: 0, smf: 0, prepFee: 0, havellinTotal: 14000,
  totTC: 40, totPS: 80, tcRate: 150, psRate: 100, discountPct: 0, fixedPrice: false, rush: false, docScope: 'full', docTier: 'values',
  vendors: [], prepItems: [], rooms: [{ idx: 1, name: 'Study', st: 'in', vol: 3, cplx: 3 }], collections: [], vehicles: [] });

module.exports = function ({ group, ok, eq, has, lacks }) {
  const G = (name, body) => { group(name); try { inEastern(body); } catch (e) { ok(false, name + ' — threw: ' + String(e && e.stack || e).split('\n').slice(0, 4).join(' | ')); } };

  let _s = null;
  const S = () => _s || (_s = lift(['agreementHtml', 'probateAgreementHtml', 'esignAnchorsPresent', 'esignCoSigners', 'jobFiduciaries',
    'invApprovalMissing', 'invApprovalComplete', 'invApprovalWithSigners', 'invApprovalSignedText'],
    { estimateStore: {}, currentEstimate: null, jobs: [], document: domStub({}) }));
  const sigPage = (h) => { const i = String(h).indexOf('<div class="agr-sig-page"'); return i >= 0 ? String(h).slice(i) : ''; };
  const head = (h) => { const i = String(h).indexOf('<div class="agr-sig-page"'); return i >= 0 ? String(h).slice(0, i) : String(h); };

  // ═══════════════════════════════════════════════════════════════════════════
  G('L1 · one render of the estate agreement carries WC\'s title and WA\'s co-signer markers, and the envelope is measured off it', () => {
    const A = S();
    const job = JOB();
    const h = A.agreementHtml(job, EST('probate'));
    ok(String(h).length > 5000 && sigPage(h).length > 0, 'fixture: the estate form rendered, with its signature page (' + String(h).length + ' chars)');
    // WC (Q26): no client document names a probate on a trust; the price is the service's own.
    eq(count(text(h), 'Probate Estate Settlement'), 0, '⚠⚠ the title and the sentence under it never say Probate Estate Settlement on a trust');
    has(text(head(h)), 'This Agreement governs Estate Settlement services provided by Havellin Palm Beach, LLC', 'the sentence under the title names Estate Settlement');
    // WC (Q27): the trust's date in full in §1.2.
    has(text(h), 'Adler Family Trust, dated March 3, 2015', '§1.2 names the trust with the month spelled out');
    lacks(text(h), 'Mar 3, 2015', 'and never the short month');
    // WA (Q22): each co-trustee's own pair, once, on the signature page.
    eq(['/hcs1/', '/hcd1/', '/hcs2/', '/hcd2/'].map((m) => count(sigPage(h), m)), [1, 1, 1, 1], '⚠⚠ each co-trustee\'s block carries its own pair, once');
    eq(['/hcs1/', '/hcd1/', '/hcs2/', '/hcd2/'].map((m) => count(head(h), m)), [0, 0, 0, 0], 'and none before the signature page');
    const anchors = A.esignAnchorsPresent(h);
    ['clientSig', 'clientDate', 'havSig', 'havDate', 'coSig1', 'coDate1', 'coSig2', 'coDate2'].forEach((k) =>
      ok(anchors.indexOf(k) >= 0, 'the envelope\'s measure of this render finds ' + k));
    const co = A.esignCoSigners(job, anchors);
    eq(co.why, '', 'nothing refuses the envelope');
    eq(co.list.map((c) => [c.name, c.email, c.anchors.join(' ')]),
       [['Daniel Adler', 'dan@adler.example', 'coSig1 coDate1'], ['Mae O\'Neil', 'mae@oneil.example', 'coSig2 coDate2']],
       '⚠⚠ the envelope names each co-trustee with the pair this very render carries');
    // The same render with a co-trustee's markers gone (a page that lost them) refuses that co-trustee by name.
    const lost = A.esignCoSigners(job, A.esignAnchorsPresent(h.replace('/hcs2/', '').replace('/hcd2/', '')));
    has(lost.why, 'no DocuSign signature line for Mae O\'Neil', 'a co-trustee whose block lost its markers is refused by name');
  });

  G('L1 · on the probate track the title keeps its name and the markers are the same; Contested Probate on a trust drops Probate', () => {
    const A = S();
    const onTrack = A.agreementHtml(JOB({ matterType: 'probate' }), EST('probate'));
    ok(count(text(head(onTrack)), 'Probate Estate Settlement') >= 1, 'on a probate matter the title is Probate Estate Settlement, as before');
    eq(['/hcs1/', '/hcd1/', '/hcs2/', '/hcd2/'].map((m) => count(sigPage(onTrack), m)), [1, 1, 1, 1], 'with the same co-signer markers');
    const both = A.agreementHtml(JOB({ matterType: 'both' }), EST('probate'));
    ok(count(text(head(both)), 'Probate Estate Settlement') >= 1, 'a pour-over (Both) is on the probate track: the title keeps its name');
    const contested = A.agreementHtml(JOB({ svc: 'contested_probate' }), EST('contested_probate'));
    has(text(head(contested)), 'Contested Estate Settlement', 'Contested Probate on a trust reads Contested Estate Settlement');
    eq(count(text(contested), 'Probate Estate Settlement'), 0, 'and never Probate Estate Settlement');
    eq(['/hcs1/', '/hcd1/', '/hcs2/', '/hcd2/'].map((m) => count(sigPage(contested), m)), [1, 1, 1, 1], 'with both co-trustees\' markers');
    const neither = A.agreementHtml(JOB({ matterType: 'neither', coFiduciaries: [] }), EST('probate'));
    eq(count(text(neither), 'Probate Estate Settlement'), 0, 'on Neither too, with nobody beside the client');
    eq([count(neither, '/hcs'), count(neither, '/hcd')], [0, 0], 'and no co-signer marker where nobody is recorded');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('L2 · the people on the envelope beside the client are the people a release still waits on once the client has signed', () => {
    const A = S();
    const job = JOB();
    const h = A.agreementHtml(job, EST('probate'));
    const onEnvelope = A.esignCoSigners(job, A.esignAnchorsPresent(h)).list.map((c) => c.name);
    const fids = A.jobFiduciaries(job);
    eq(fids.map((f) => f.name), ['Ruth Adler', 'Daniel Adler', 'Mae O\'Neil'], 'fixture: the trustee and two co-trustees');
    // Ruth (the client) signs a release first (WB, Q24: a partial approval is saved).
    const ref = { stableId: 'l1', disposition: 'Sell', authBy: '', approvalDate: '' };
    Object.assign(ref, A.invApprovalWithSigners(ref, ['Ruth Adler'], '2026-10-01'));
    eq(A.invApprovalMissing(ref, job), onEnvelope, '⚠⚠ after the client signs, the release waits on exactly the co-signers DocuSign adds');
    eq(A.invApprovalComplete(ref, job), false, 'and is not complete');
    Object.assign(ref, A.invApprovalWithSigners(ref, ['Daniel Adler'], '2026-10-08'));
    eq(A.invApprovalMissing(ref, job), ['Mae O\'Neil'], 'one co-trustee later, the other is still owed');
    Object.assign(ref, A.invApprovalWithSigners(ref, ['Mae O\'Neil'], '2026-10-09'));
    eq(A.invApprovalComplete(ref, job), true, 'complete once every one of them has signed');
    eq(ref.approvalDate, '2026-10-09', 'the approval date is the last signature\'s');
    eq(A.invApprovalSignedText(ref), 'Ruth Adler (Oct 1, 2026); Daniel Adler (Oct 8, 2026); Mae O\'Neil (Oct 9, 2026)',
       'each signer printed with their own day, never an ISO date');
    // A co-trustee recorded after the release: the envelope and the release both name them (one list, jobFiduciaries).
    const later = JOB({ coFiduciaries: [DAN, MAE, { id: 'cf3', name: 'Lou Adler', role: 'Trustee', email: 'lou@adler.example' }] });
    const h3 = A.agreementHtml(later, EST('probate'));
    eq(A.esignCoSigners(later, A.esignAnchorsPresent(h3)).list.map((c) => c.name), ['Daniel Adler', 'Mae O\'Neil', 'Lou Adler'], 'a third co-trustee goes on the envelope');
    eq(A.invApprovalMissing(ref, later), ['Lou Adler'], 'and the completed release now waits on them too');
  });
};
