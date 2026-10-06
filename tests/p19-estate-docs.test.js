'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P19 · W2, THE ESTATE DOCUMENTS (2026-10-03). Anthony: "i'm good with all of your calls. build it all".
//
// Measured on the real builders before the change (f635a87), a TRUST-ONLY matter's agreement named "Estate of
// <decedent>" as the party, "Letters of Administration: Pending", a "Probate Case Number" and a "Court" to fill in, an
// "Estate Attorney", "Client / Personal Representative" on the signature page and in §6.3, a "co-PR" co-signer, and
// "the Personal Representative" three times in §7.1; its Exhibit A asked the trustee for Letters and routed proceeds
// to "the estate account"; neither schedule could name the trust or carry a second fiduciary's signature.
//
//   B1 the estate agreement by matter (probateAgreementHtml and its _agr* helpers): the party, the paper, the case and
//      court, counsel, the approver in §6.3, §7.1 and on the signature page, a wet-sign block per recorded
//      co-representative and §5.1's joinder, §5.4 "No Purchase by Havellin" (Anthony's call 6), and the Disposition
//      Ledger as what the representative signs off. ⚠ AN UNANSWERED MATTER KEEPS TODAY'S PROBATE WORDING BYTE FOR BYTE:
//      it renders exactly as the probate form, and each clause's old words are pinned here.
//   B2 the client estimate (_cePhases): the paper (docEstateAuthority), the proceeds' holder (estateProceedsHolder), no
//      exempt property or court filing off the probate track, and the Disposition Ledger as the summary signed.
//   B3 the Trust Schedule names the trust and gives each trustee a line; B4 the Court Inventory gives each personal
//      representative an adoption line (scheduleSigners).
// Driven through the real functions; the store and the network are stubbed by name.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source, fn, domStub } = require('./harness');
const DOCREC = require('./document-reconciliation.test.js');

const SRC = source();
const noComments = (t) => String(t).split('\n')
  .filter((l) => { const s = l.trim(); return !(s.startsWith('//') || s.startsWith('*') || s.startsWith('/*')); }).join('\n');
const LIVE = noComments(SRC);
const inEastern = (body) => { const prev = process.env.TZ; process.env.TZ = 'America/New_York'; try { return body(); } finally { process.env.TZ = prev; } };
const attempt = (f) => { try { return f(); } catch (e) { return 'THREW ' + String(e && e.message || e); } };
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&rsquo;/g, '’').replace(/&middot;/g, '·').replace(/&sect;/g, '§')
  .replace(/&mdash;/g, '—').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ');
const count = (hay, needle) => String(hay).split(needle).length - 1;
// The text of one part of a document, from one heading to the next (bounded, so a needle cannot match a neighbour).
const between = (h, from, to) => { const a = h.indexOf(from); if (a < 0) return ''; const b = h.indexOf(to, a + from.length); return h.slice(a, b > a ? b : a + 4000); };

// Which function a source index sits in, for counting the readers of a helper.
const FN_STARTS = [...LIVE.matchAll(/(^|\n)function ([A-Za-z0-9_$]+)\s*\(/g)].map((m) => ({ at: m.index, name: m[2] }));
function enclosing(idx) {
  let lo = 0, hi = FN_STARTS.length - 1, ans = '(top)';
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (FN_STARTS[mid].at <= idx) { ans = FN_STARTS[mid].name; lo = mid + 1; } else hi = mid - 1; }
  return ans;
}
function readers(name, call) {
  const out = {};
  const re = new RegExp('(?<![\\w.$])' + name.replace(/\$/g, '\\$') + (call === false ? '\\b' : '\\('), 'g');
  for (const m of LIVE.matchAll(re)) {
    if (LIVE.slice(Math.max(0, m.index - 9), m.index) === 'function ') continue;
    if (call === false && /var\s+$/.test(LIVE.slice(Math.max(0, m.index - 4), m.index))) continue;
    const f = enclosing(m.index);
    out[f] = (out[f] || 0) + 1;
  }
  const sorted = {}; Object.keys(out).sort().forEach((k) => { sorted[k] = out[k]; }); return sorted;
}

// ── The agreement and the client estimate: the reconciliation suite's lift list, and what an answered matter reaches
//    that its unanswered fixtures never do (estateAuthority, jobOnProbateTrack, the trust's accounting sentence), the
//    trust's namer and the anchor measure.
const AGR_FNS = DOCREC.FNS.concat(['estateAuthority', 'jobOnProbateTrack', 'trustInstrumentTitle', 'esignAnchorsPresent', '_ceGroupedSpaces', 'esignCoSignerAnchors', 'esignCoSignerTop']);
const AGR_VARS = DOCREC.VARS.concat(['ESIGN_REQUIRED_ANCHORS', 'AGR_NOT_AN_ACCOUNTING', 'ESIGN_COSIGNER_ANCHOR']);
// One sandbox for the whole file (building one compiles ~170 functions, and the renders are pure): each render starts
// from the same empty stores, with only the job it is about on the client list.
let _docCtx = null;
function docCtx(job) {
  if (!_docCtx) _docCtx = sandbox({ fns: AGR_FNS, vars: AGR_VARS, stubs: { document: domStub({}) } });
  Object.assign(_docCtx, { jobs: job ? [job] : [], jobLogs: {}, estimateStore: {}, changeOrders: [], contractors: [], currentEstimate: null,
    currentInvStage: 'final', vendorDirectory: [], jobPlans: {}, _photoRefs: {} });
  return _docCtx;
}
const EST = (o) => Object.assign({ jobId: 7, svc: 'cleanout', tcFee: 6000, psFee: 8000, pkgCost: 0, pkgLabel: 'None — $0', smf: 0, prepFee: 0,
  havellinTotal: 14000, grandTotal: 14000, totTC: 40, totPS: 80, tcRate: 150, psRate: 100, discountPct: 0, fixedPrice: false, rush: false,
  docScope: 'full', docTier: 'values', vendors: [], prepItems: [], rooms: [{ idx: 1, name: 'Study', st: 'in' }], collections: [], vehicles: [] }, o || {});
const ROLE = { trust: 'Trustee' };
const JOB = (matter, o) => Object.assign({ id: 7, hvlId: 'HVL-0007', name: 'Margaret Doe', svc: 'cleanout', executor: 'Ruth Adler',
  executorRole: ROLE[matter] || 'Personal Representative', executorEmail: 'ruth@x.com', executorPhone: '(561) 555-0101',
  addr: '69 Beach Blvd', city: 'Palm Beach', zip: '33480', deathDate: '2026-01-15', docTier: 'values', gate706: 'no',
  probateAttyName: 'Ann Lowe', probateAttyFirm: 'Lowe & Co', probateAttyPhone: '(561) 555-0102', probateCase: '2026-CP-001234',
  executorAuth: 'pending', status: 'won', payments: [] }, matter ? { matterType: matter } : {}, o || {});
const CO1 = [{ id: 'c1', name: 'Daniel Adler', role: 'Trustee', email: 'dan@x.com' }];
const CO2 = CO1.concat([{ id: 'c2', name: 'Eve Adler', role: 'Trustee', email: 'eve@x.com' }]);
const TRUST = { trustName: 'Adler Family Trust', trustDate: '2015-03-03' };
const MATTERS = ['', 'probate', 'trust', 'both', 'neither'];
const agr = (job, est) => inEastern(() => attempt(() => docCtx(job).probateAgreementHtml(job, est || EST())));
const phases = (job, est) => inEastern(() => { const r = attempt(() => docCtx(job)._cePhases(est || EST({ svc: job.svc }), job)); return typeof r === 'string' ? [{ body: r }] : r; });
const phaseText = (P) => JSON.stringify(P);

// ── The two schedules: the Trust Schedule suite's lift list, the real date formatter, and the signers.
const SCH_FNS = [
  'printTrustSchedule', 'printCourtInventory', '_invScheduleSection', '_invTrack', '_invTrackDefault', '_invOnTrustSchedule',
  '_invOnProbateSchedule', '_invIsExempt', '_invIsProbateAsset', '_invExcludedTracks', '_invHasValue', 'invDocContractBlock',
  'docTierProduces', 'docTierOf', 'docTierDef', 'docTierScope', 'docTierScopeMirror', 'svcHasDocStep', 'matterDef', 'matterTypeOf',
  'invProbateRows', 'invFiduciaryMode', 'isDecedentJob', '_invAssignItemNos', '_jobInvRefs', '_invTouch', 'savePhotoRefs',
  '_warnPhotoStoreFull', 'isFormalDoc', 'resolveDocLevel', 'docLevelFloor', 'gateDispute', '_gateYes', '_gate706',
  '_invGuardrailItems', 'invAwaitingAppraisal', '_invJob', 'invNeedsAppraisal', 'invIsIntrinsic', 'invCatMeta',
  'invAppraisalThreshold', '_invHasAppraisal', '_jobAppraisers', 'resolveValBasis', 'estateValueDate', '_invMoney', '_invDocName',
  'jobAppraisalDuty', 'approvedEstimateFor', 'appraisalDuty', 'estimateDocScope', 'estimateAppraiserLines', 'estimateAppraiserNames',
  'docScopeDef', 'weArrangeAppraisals', 'roundCents', 'fmt', 'fmtDate2',
  'trustInstrumentTitle', 'fmtCEDate', 'scheduleSigners', 'scheduleSignLines', 'jobFiduciaries', 'jobListEntries'];
const SCH_VARS = ['INV_CONTRACT_DOCS', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'DECEDENT_SERVICES', 'MATTER_TYPES', 'INV_ASSET_TRACKS',
  'INV_TAXONOMY', 'INV_APPRAISAL_THRESHOLD', 'EXEMPT_CAP_732_402', 'INV_CATEGORIES', 'DOC_SCOPES'];
const IT = (id, o) => Object.assign({ stableId: id, label: 'inventory', objectName: 'Item ' + id, category: 'Furniture', condition: 'Good',
  qty: '1', ts: Number(String(id).replace(/\D/g, '')) || 1, fmv: '4000' }, o || {});
let _schCtx = null;   // one sandbox, the job and its inventory set per print (as docCtx)
function sched(kind, job, items) {
  return inEastern(() => {
    if (!_schCtx) _schCtx = sandbox({ fns: SCH_FNS, vars: SCH_VARS, stubs: { document: domStub({}) } });
    const c = Object.assign(_schCtx, { jobs: [job], _photoRefs: { 7: items }, estimateStore: {} });
    const r = attempt(() => (kind === 'trust' ? c.printTrustSchedule(7, { asHtml: true }) : c.printCourtInventory(7, { asHtml: true })));
    return typeof r === 'string' ? r : (r.html || 'WHY ' + r.why);
  });
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('B1 · ⚠⚠ an unanswered matter keeps today\'s probate wording: the whole form equals the probate one, and each clause reads as it did');
  {
    const blank = agr(JOB('')), probate = agr(JOB('probate'));
    ok(blank.length > 30000 && blank.indexOf('THREW') !== 0, 'fixture: the real estate form rendered (' + blank.length + ' chars)');
    eq(blank, probate, '⚠⚠ byte for byte, an unanswered matter renders the agreement an explicit probate answer does');
    eq(agr(JOB('', { coFiduciaries: CO1 })), agr(JOB('probate', { coFiduciaries: CO1 })), 'and so with a co-representative recorded');
    // Every clause P19 makes follow the matter, in the words it has always had (f635a87), on the unanswered form.
    [
      ['>Estate</td>', 'the party row is the estate'],
      ['Estate of Margaret Doe', 'named "Estate of <decedent>"'],
      ['Letters of Administration</td>', 'the authority row is the Letters'],
      ['Probate Case Number</td>', 'the case number row'],
      ['2026-CP-001234', 'carrying the recorded case'],
      ['>Court</td>', 'the court row'],
      ['Estate Attorney</td>', 'the attorney is the estate attorney'],
      ['the following are excluded from all Havellin engagements: legal representation or probate court filings (handled by estate attorney);', '§2.1'],
      ['remains the responsibility of the Client and the estate attorney, who receive Havellin\'s list of the items it believes warrant one.', '§2 at the values tier'],
      ['Vendors bill the estate directly at cost.', '§3.1\'s vendors row'],
      ['Section 5 &middot; Authority, Probate &amp; Legal Compliance', 'Section 5\'s title'],
      ['take the following actions on behalf of the estate, subject to the written approval thresholds below', '§5.3\'s lead'],
      ['Notify Client / Personal Representative within 24 hours of discovery', '§6.3'],
      ['it is how the estate is accounted for.', '§7.1, the photographs'],
      ['to anyone the Personal Representative authorizes in writing — counsel, the appraiser, the court. It is retained', '§7.1, who may see them'],
      ['prepared for the Personal Representative and forming part of the fiduciary record', '§7.1, whom the records are for'],
      ['Havellin will provide them to the Personal Representative, to counsel of record, and to any other person the Personal Representative authorizes in writing', '§7.1, to whom they go'],
      ['Responsibility for the estate&rsquo;s inventory, accounting and distributions rests with the Personal Representative and counsel.', '§7.1, whose the inventory is'],
      ['not employees of the Client or the estate.', '§10'],
      ['margin-bottom:10px;">Client / Personal Representative</div>', 'the signature page\'s heading'],
      ['(if applicable — second beneficiary or co-PR)', 'and the co-signer\'s caption'],
    ].forEach(([words, where]) => has(blank, words, '⚠ unanswered, ' + where + ': ' + words.slice(0, 70)));
    eq(count(blank, 'Client / Personal Representative'), 2, 'the capacity is printed twice, §6.3 and the signature page, as before');
    // What P19 adds to every estate form, the unanswered one included (Anthony's call 6, and the ledger W5 makes signable).
    has(blank, '5.4 No Purchase by Havellin', 'every estate form gains §5.4');
    has(blank, 'At the close of the engagement Havellin delivers the Disposition Ledger, the Project Records&rsquo; final statement of where every item went, to the Personal Representative for review and signature.',
        'and the Disposition Ledger sentence, naming the approver');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('B1 · a trust-only matter\'s agreement reads as a trust, clause by clause');
  {
    const h = agr(JOB('trust', TRUST));
    const t = text(h);
    ok(h.length > 30000, 'fixture: rendered (' + h.length + ')');
    // §1.2: the party is the trust, named as the instrument, with the decedent beside it.
    has(h, '>Trust</td>', 'the party row is the trust');
    // RESTATED 2026-10-05 (P20, Q27; Anthony: "yes"): the trust's date is spelled out, "March 3, 2015", as an instrument is
    // cited (trustInstrumentTitle reads fmtCEDate); P19 printed the app's short date, "Mar 3, 2015". Every date pin below follows.
    has(h, '<strong>The Adler Family Trust, dated March 3, 2015</strong>', '⚠⚠ named as the instrument: "The <name>, dated <date>"');
    has(h, '>Decedent</td>', 'with the decedent beside it');
    has(between(h, '>Decedent</td>', '</tr>'), 'Margaret Doe', 'by name');
    lacks(h, 'Estate of', '⚠⚠ no "Estate of <decedent>" as the party');
    lacks(h, '>Estate</td>', 'and no Estate row');
    // The paper is the Certification of Trust, read off the same stored answer.
    has(between(h, 'Certification of Trust</td>', '</tr>'), 'Pending', '⚠⚠ the authority row is the Certification of Trust (pending)');
    eq(['received', 'notneeded', 'pending', ''].map((a) => between(agr(JOB('trust', { executorAuth: a })), 'Certification of Trust</td>', '</tr>').replace(/<[^>]+>/g, '')),
       ['Certification of TrustAttached', 'Certification of TrustN/A', 'Certification of TrustPending', 'Certification of TrustPending'],
       'its status reads the stored answer: Attached, N/A, Pending (and Pending when none is recorded)');
    lacks(h, 'Letters of Administration</td>', '⚠⚠ and no Letters row');
    lacks(h, 'Probate Case Number', '⚠⚠ no probate case number row');
    lacks(h, '2026-CP-001234', 'and the case a previous answer recorded is not printed');
    lacks(h, '>Court</td>', '⚠⚠ no court row');
    has(h, 'Trustee\'s Attorney</td>', '⚠⚠ the attorney is the trustee\'s attorney');
    lacks(h, 'Estate Attorney', 'not the estate attorney');
    lacks(t.toLowerCase(), 'estate attorney', 'and no clause anywhere names an estate attorney (§2 and §2.1 included)');
    has(t, 'remains the responsibility of the Client and their counsel, who receive Havellin\'s list of the items it believes warrant one.', '§2 names the trustee\'s counsel');
    has(t, 'legal representation or court filings (handled by the trustee\'s counsel)', '§2.1 likewise');
    has(t, 'Vendors bill the trust directly at cost.', '§3.1: the trust pays the vendors');
    has(h, 'Section 5 &middot; Authority, Trust &amp; Legal Compliance', 'Section 5\'s title names the trust, not probate');
    has(t, 'take the following actions on behalf of the trust, subject to', '§5.3 acts for the trust');
    has(t, 'Notify Client / successor trustee within 24 hours of discovery', '⚠⚠ §6.3 notifies the successor trustee');
    has(t, 'it is how the trust is accounted for.', '§7.1: the photographs account for the trust');
    has(t, 'to anyone the successor trustee authorizes in writing — counsel, the appraiser. It is retained', '⚠⚠ §7.1: the trustee authorizes, and no court is named');
    has(t, 'prepared for the successor trustee and forming part of the fiduciary record', '§7.1: the records are prepared for the trustee');
    has(t, 'Havellin will provide them to the successor trustee, to counsel of record, and to any other person the successor trustee authorizes in writing', 'and go to the trustee');
    has(t, 'Responsibility for the trust’s inventory, accounting and distributions rests with the successor trustee and counsel.', 'the trust\'s inventory and accounting are the trustee\'s');
    has(t, 'not employees of the Client or the trust.', '§10');
    has(h, 'margin-bottom:10px;">Client / successor trustee</div>', '⚠⚠ the signature page is headed Client / successor trustee');
    has(h, '(if applicable — second beneficiary or co-trustee)', '⚠⚠ the blank co-signer is a co-trustee');
    lacks(h, 'co-PR', 'never a co-PR');
    // The one "Personal Representative" left is §5.1's conditional rep ("If acting as …"), never false on a trust.
    eq(count(t, 'Personal Representative'), 1, '⚠ "Personal Representative" survives once, in a conditional representation');
    has(t, 'If acting as Personal Representative or Executor, the Client has been duly appointed by the probate court', 'and it is that one');
    lacks(t, 'Client / Personal Representative', 'never as the Client\'s capacity');
    // Missing halves of the trust are lines to complete; a name beginning "The" is not given a second; text is escaped.
    has(agr(JOB('trust')), '<strong>_______________________________________________, dated ____________________</strong>', 'nothing recorded: two lines to complete');
    has(agr(JOB('trust', { trustName: 'Adler Family Trust' })), 'The Adler Family Trust, dated ____________________', 'no date: the date is the line');
    has(agr(JOB('trust', { trustDate: '2015-03-03' })), '_______________________________________________, dated March 3, 2015', 'no name: the name is the line');
    const the = agr(JOB('trust', { trustName: 'The Adler Family Trust', trustDate: '2015-03-03' }));
    has(the, 'The Adler Family Trust, dated March 3, 2015', 'a recorded name already beginning "The" …');
    lacks(the, 'The The', '… is not given a second');
    const xss = agr(JOB('trust', { trustName: '<img src=x onerror=alert(1)> Trust' }));
    lacks(xss, '<img src=x', '⚠ a typed trust name is text: escaped');
    has(xss, 'The &lt;img src=x onerror=alert(1)&gt; Trust', 'and printed as typed');
    // The same on a Probate service recorded as a trust administration (the foundation's legitimate pairing).
    const ps = agr(JOB('trust', Object.assign({ svc: 'probate' }, TRUST)));
    lacks(ps, 'Probate Case Number', 'a Probate service recorded as a trust prints no case number either');
    has(ps, 'Certification of Trust</td>', 'and asks for the Certification');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('B1 · Both keeps the estate and adds the trust; Neither names no court, no paper and no "Client / Client"');
  {
    const b = agr(JOB('both', TRUST)), bt = text(b);
    has(b, '>Estate</td>', 'a pour-over keeps the estate row');
    has(b, 'Estate of Margaret Doe', 'named as the estate');
    // RESTATED 2026-10-05 (P20, Q27): the month spelled out, as above.
    has(between(b, '>Trust</td>', '</tr>'), 'The Adler Family Trust, dated March 3, 2015', '⚠ and adds the trust row');
    ok(b.indexOf('>Estate</td>') < b.indexOf('>Trust</td>'), 'the estate first, then the trust');
    has(b, 'Letters of Administration</td>', 'the Letters: the probate track governs a pour-over');
    has(b, 'Probate Case Number</td>', 'its case number');
    has(b, '>Court</td>', 'and its court');
    has(b, 'Estate Attorney</td>', 'the estate attorney');
    has(b, 'Section 5 &middot; Authority, Probate, Trust &amp; Legal Compliance', 'Section 5 names both');
    has(bt, 'Notify Client / Personal Representative or successor trustee within 24 hours', '§6.3 names either');
    has(b, 'margin-bottom:10px;">Client / Personal Representative or successor trustee</div>', 'and the signature page');
    has(b, '(if applicable — second beneficiary, co-PR or co-trustee)', 'the blank co-signer may be either');
    has(bt, 'Vendors bill the estate directly at cost.', 'and the estate pays the vendors, as before');
    has(bt, 'counsel, the appraiser, the court. It is retained', 'with a court to authorize');

    const n = agr(JOB('neither')), nt = text(n);
    has(n, '>Estate</td>', 'Neither keeps its estate row');
    lacks(n, '>Trust</td>', 'and has no trust row');
    lacks(n, 'Letters of Administration</td>', '⚠⚠ no Letters row');
    lacks(n, 'Certification of Trust</td>', '⚠⚠ and no Certification row: Neither has no such paper');
    lacks(n, 'Probate Case Number', 'no case number');
    lacks(n, '>Court</td>', 'no court');
    has(n, '>Attorney</td>', '⚠ the attorney row is plain "Attorney"');
    lacks(n, 'Estate Attorney', 'not the estate attorney');
    has(nt, 'remains the responsibility of the Client and their advisers', '§2 names the Client\'s advisers, as §5.2 does');
    has(nt, 'legal representation or court filings (handled by the Client\'s own counsel)', '§2.1');
    // §2 on every tier and with an appraiser on the estimate: who else carries the inventory and the other appraisals.
    const scope = (m, sc, vendors) => text(agr(JOB(m), EST({ docScope: sc, docTier: sc === 'capture' ? 'contents' : sc === 'none' ? 'none' : 'values', vendors: vendors || [] })));
    const ART = [{ type: 'Art Appraiser', cost: 1500 }];
    has(scope('trust', 'none'), 'against the inventory prepared by the trustee or their counsel;', '⚠ tier none, trust: the schedule is the trustee\'s or their counsel\'s');
    has(scope('trust', 'none'), 'remain the responsibility of the Client and their counsel; Havellin works from the schedule they provide.', 'and so is the valuation');
    has(scope('neither', 'none'), 'against the inventory prepared by the Client or their advisers;', 'tier none, Neither: the Client\'s or their advisers\'');
    has(scope('trust', 'capture'), 'remain the responsibility of the Client and their counsel, who receive Havellin\'s photographed list for that purpose.', 'capture, trust');
    has(scope('trust', 'capture', ART), 'remains the responsibility of the Client and their counsel, who receive Havellin\'s photographed list for that purpose.', 'capture with an appraiser, trust');
    has(scope('trust', 'full', ART), 'any other appraisal remains the responsibility of the Client and their counsel.', '⚠ an appraiser on the estimate, trust: any other is the trustee\'s counsel\'s');
    has(scope('neither', 'full', ART), 'any other appraisal remains the responsibility of the Client and their advisers.', 'and on Neither the Client\'s advisers\'');
    ['trust', 'neither'].forEach((m) => ['none', 'capture', 'full'].forEach((sc) => lacks(scope(m, sc, sc === 'full' ? ART : []).toLowerCase(), 'estate attorney', m + ', ' + sc + ': no estate attorney in any arm')));
    ['none', 'capture', 'full'].forEach((sc) => eq(scope('', sc, ART), scope('probate', sc, ART), '⚠ ' + sc + ' with an appraiser: an unanswered matter reads exactly as probate'));
    has(scope('', 'none'), 'against the inventory prepared by the estate attorney\'s office;', 'and keeps the estate attorney\'s office at tier none');
    has(n, 'Section 5 &middot; Authority &amp; Legal Compliance', 'Section 5 names neither probate nor a trust');
    has(nt, 'Notify Client within 24 hours of discovery', '⚠⚠ §6.3 notifies the Client');
    has(n, 'margin-bottom:10px;">Client</div>', '⚠⚠ the signature page is headed "Client"');
    lacks(n, 'Client / Client', '⚠⚠ never "Client / Client"');
    has(nt, 'anyone the Client authorizes in writing — counsel, the appraiser. It is retained', '§7.1: the Client authorizes, no court');
    has(n, '(if applicable — second beneficiary)', 'the blank co-signer is a second beneficiary');
    lacks(nt, 'Client / Personal Representative', 'and no personal representative is the Client\'s capacity');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // RESTATED 2026-10-05 (P20): each co-representative's block now carries markers of its own (Anthony, Q22: they sign in
  // DocuSign beside the client), and still none of the client's or Havellin's four. The title said "no e-signature anchor".
  group('B1 · each recorded co-representative signs a block of their own, with their own e-signature markers and none of the four; §5.1 states their joinder');
  {
    const sigPage = (h) => between(h, 'Signature Page', 'Havellin Palm Beach, LLC</div>');
    const coBlocks = (h) => sigPage(h).split('>Co-Signer</div>').slice(1);
    const ANCHORS = ['/hsc/', '/hdc/', '/hsh/', '/hdh/'];
    MATTERS.forEach((m) => {
      const label = m || 'unanswered';
      const one = agr(JOB(m, Object.assign({ coFiduciaries: CO1 }, TRUST)));
      const two = agr(JOB(m, Object.assign({ coFiduciaries: CO2 }, TRUST)));
      const none = agr(JOB(m, TRUST));
      eq(coBlocks(one).length, 1, label + ': one co-representative, one named block');
      has(coBlocks(one)[0] || '', '<div class="sig-label">Daniel Adler</div>', label + ': the printed name filled in');
      has(coBlocks(one)[0] || '', '<div class="sig-label">Trustee</div>', label + ': and the recorded role');
      eq(coBlocks(two).length, 2, label + ': two co-representatives, two blocks');
      has(coBlocks(two)[1] || '', 'Eve Adler', label + ': each named');
      lacks(sigPage(one), '(if applicable', label + ': no blank "if applicable" block once one is recorded');
      has(sigPage(none), '(if applicable', label + ': the blank block when nobody is recorded');
      // ⚠ NONE OF THE FOUR ON A CO-SIGNER (RESTATED 2026-10-05, P20: a co-signer's block carries its own pair instead,
      // '/hcs<n>/' and '/hcd<n>/'; the four stay the client's and Havellin's, once each).
      ANCHORS.forEach((a) => eq([count(none, a), count(one, a), count(two, a)], [1, 1, 1], label + ': exactly one ' + a + ' anchor with 0, 1 and 2 co-representatives'));
      ok(coBlocks(two).every((blk) => ANCHORS.every((a) => blk.indexOf(a) < 0)), label + ': ⚠ none of the four inside any co-signer block');
      eq(coBlocks(two).map((blk) => [count(blk, '/hcs1/'), count(blk, '/hcd1/'), count(blk, '/hcs2/'), count(blk, '/hcd2/')]), [[1, 1, 0, 0], [0, 0, 1, 1]],
         label + ': each co-signer block carries its own pair, once, and not the other\'s');
      eq([count(none, '/hcs'), count(none, '/hcd')], [0, 0], label + ': the blank block carries none: there is nobody to send it to');
      eq(docCtx().esignAnchorsPresent(two).filter((k) => ['clientSig', 'clientDate', 'havSig', 'havDate'].indexOf(k) >= 0).length, 4,
         label + ': the real measure still finds the four required anchors');
      // §5.1: the joinder, singular and plural, and nothing when nobody is recorded.
      has(one, 'The Client acts together with the co-representative named on the signature page. That co-representative has signed this Agreement, or the Client holds written authority to bind them to it, and every written approval this Agreement requires is given by the Client and the co-representative together.',
          label + ': §5.1 states one co-representative\'s joinder');
      has(two, 'The Client acts together with the co-representatives named on the signature page. Each of them has signed this Agreement, or the Client holds written authority to bind each of them to it, and every written approval this Agreement requires is given by the Client and every co-representative.',
          label + ': and several');
      lacks(none, 'The Client acts together with', label + ': and nothing where none is recorded');
    });
    // The joinder is the last rep, so no rep moves.
    const reps = between(agr(JOB('trust', { coFiduciaries: CO1 })), '5.1 Client Representations', '5.2 ');
    ok(reps.lastIndexOf('The Client acts together with') > reps.lastIndexOf('All assets identified for sale, donation, or disposal'), 'appended after the last rep, so none renumbers');
    // A voided co-representative is no one; a typed name is text; a representative not recorded leaves every co-representative a block.
    const voided = agr(JOB('trust', { coFiduciaries: CO1.concat([{ id: 'c9', name: 'Gone Adler', role: 'Trustee', voidedAt: 5 }]) }));
    eq(coBlocks(voided).length, 1, 'a voided co-representative has no block');
    lacks(voided, 'Gone Adler', 'and is not named');
    const xss = agr(JOB('probate', { coFiduciaries: [{ id: 'c1', name: '<b>Eve</b>', role: '<i>Co</i>' }] }));
    lacks(xss, '<b>Eve</b>', '⚠ a typed co-representative\'s name is escaped');
    has(xss, '&lt;b&gt;Eve&lt;/b&gt;', 'and printed as typed');
    lacks(xss, '<i>Co</i>', 'and so is the role');
    eq(coBlocks(agr(JOB('trust', { executor: '', coFiduciaries: CO2 }))).length, 2, 'no representative recorded: each co-representative still has a block');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('B1 · §5.4 staff never buy, on every estate form and never on the standard one');
  {
    const CLAUSE = 'Havellin, its owners, team members and contractors will not purchase or otherwise acquire any of the contents of the property, or any other tangible personal property of the estate or the trust, whether directly or through any other person, and will take no commission, percentage or other share of the proceeds of any sale of that property.';
    eq(docCtx().AGR_NO_PURCHASE, CLAUSE, 'the clause, word for word (drafted; counsel bundle)');
    MATTERS.forEach((m) => {
      const h = agr(JOB(m, TRUST));
      has(h, '5.4 No Purchase by Havellin', (m || 'unanswered') + ': §5.4 is on the form');
      has(h, CLAUSE, (m || 'unanswered') + ': with the clause');
      const at53 = h.indexOf('5.3 Asset Disposition Authorization'), at54 = h.indexOf('5.4 No Purchase by Havellin'), at6 = h.indexOf('Section 6 &middot;');
      ok(at53 > 0 && at54 > at53 && at6 > at54, (m || 'unanswered') + ': after §5.3 and before Section 6, so nothing renumbers');
      ['Section 6 &middot; Liability', 'Section 7 &middot; Confidentiality', 'Section 8 &middot; Termination', 'Section 9 &middot; Dispute', 'Section 10 &middot; General']
        .forEach((s) => has(h, s, (m || 'unanswered') + ': ' + s.split(' &middot;')[0] + ' keeps its number'));
    });
    // The standard (living) form is untouched: no clause, no ledger sentence, no trust words.
    const living = { id: 8, hvlId: 'HVL-0008', name: 'Jane Doe', svc: 'downsizing', addr: '12 Ocean Blvd', city: 'Palm Beach', zip: '33480', status: 'won', payments: [] };
    const std = inEastern(() => attempt(() => docCtx(living).agreementHtml(living, EST({ svc: 'downsizing', docScope: 'none' }))));
    ok(std.length > 20000 && std.indexOf('THREW') !== 0, 'fixture: the standard form rendered (' + std.length + ')');
    ['will not purchase', '5.4 No Purchase', 'Disposition Ledger', 'Certification of Trust', 'co-trustee', 'successor trustee']
      .forEach((w) => lacks(std, w, '⚠⚠ the standard form is untouched: no "' + w + '"'));
    eq(readers('AGR_NO_PURCHASE', false), { probateAgreementHtml: 1 }, 'the clause is read by the estate form alone');
    // The Disposition Ledger sentence names whoever this matter's approver is.
    has(text(agr(JOB('trust'))), 'to the successor trustee for review and signature.', 'trust: the trustee signs off the ledger');
    has(text(agr(JOB('neither'))), 'to the Client for review and signature.', 'Neither: the Client');
    has(text(agr(JOB('both'))), 'to the Personal Representative or successor trustee for review and signature.', 'Both: either');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('B2 · Exhibit A asks for the matter\'s own paper, routes proceeds to its holder, and names the Disposition Ledger');
  {
    const P = {};
    MATTERS.forEach((m) => { P[m] = phases(JOB(m)); });
    const s = (m) => phaseText(P[m]);
    ok(P.trust.length >= 4 && P.trust[0].title === 'Before We Start', 'fixture: the real stages rendered (' + P.trust.length + ')');
    // The paper.
    const LETTERS_NEED = 'a certified copy of the Letters of Administration or Testamentary, with any limits on that authority noted in writing. If particular items are designated to particular people, we need that list from you or from counsel before anything is handled — we do not need the will itself.';
    const LETTERS_BODY = 'We also confirm authority: a certified copy of the Letters of Administration or Testamentary on file, the scope and any limits of that authority noted in writing, and a direct channel opened with your estate attorney.';
    ['', 'probate', 'both'].forEach((m) => {
      has(P[m][0].need, LETTERS_NEED, (m || 'unanswered') + ': the Letters, as before');
      has(P[m][0].body, LETTERS_BODY, (m || 'unanswered') + ': confirmed as before');
    });
    has(P.trust[0].need, 'A signed engagement agreement, the deposit, and the successor trustee’s Certification of Trust, with any limits on the trustee’s powers noted in writing. If particular items are designated to particular people, we need that list from you or from counsel before anything is handled — we do not need the will or the trust instrument itself.',
        '⚠⚠ trust: the Certification of Trust, the limits on the trustee\'s powers, and no instrument asked for');
    has(P.trust[0].body, 'We also confirm authority: the successor trustee’s Certification of Trust on file, any limits on the trustee’s powers noted in writing, and a direct channel opened with your attorney.',
        'confirmed on file');
    lacks(s('trust'), 'Letters', '⚠⚠ a trustee is never asked for Letters');
    has(P.neither[0].need, 'A signed engagement agreement, the deposit, and written confirmation of who is authorized to direct the work and approve releases.', '⚠⚠ Neither: no court paper, written confirmation of who directs');
    has(P.neither[0].body, 'We also confirm authority: who is authorized to direct the work and approve releases, confirmed in writing, and a direct channel opened with any attorney advising you.', 'confirmed in writing');
    ['Letters', 'Certification of Trust'].forEach((w) => lacks(s('neither'), w, 'Neither names no paper: ' + w));
    // The proceeds.
    const done3 = (m) => (P[m].find((p) => p.title === 'Distribution &amp; Disposition') || {}).done || '';
    ['', 'probate', 'neither'].forEach((m) => has(done3(m), 'and any proceeds are routed to the estate account.', (m || 'unanswered') + ': the estate account, as before'));
    has(done3('trust'), 'and any proceeds are routed to the trust account.', '⚠⚠ trust: the trust account');
    has(done3('both'), 'and any proceeds are routed to the estate or the trust, as the property is held.', 'Both: whichever holds the property');
    MATTERS.forEach((m) => has(done3(m), 'a signed receipt is held for every item released to a beneficiary', (m || 'unanswered') + ': the signed-receipt promise stays (W3 makes it true)'));
    // Exempt property is a probate claim.
    ['', 'probate', 'both'].forEach((m) => {
      has(s(m), 'property that may be claimed as exempt is flagged for your attention', (m || 'unanswered') + ': exempt property flagged, as before');
      has(s(m), 'property claimed as exempt is set aside', (m || 'unanswered') + ': and set aside');
    });
    ['trust', 'neither'].forEach((m) => lacks(s(m), 'exempt', '⚠ ' + m + ': no exempt-property claim off the probate track'));
    // On the formal standard (a 706 answered yes) the room's completion names exempt property too: on probate, never on a trust.
    const formalDone = (m) => (phases(JOB(m, { gate706: 'yes' }))[1] || {}).done || '';
    has(formalDone('probate'), 'specific bequests and exempt property are set aside and recorded', 'formal, probate: bequests and exempt property set aside, as before');
    has(formalDone('trust'), 'specific bequests are set aside and recorded', '⚠ formal, trust: bequests only');
    lacks(formalDone('trust'), 'exempt', 'and no exempt property');
    // The summary the client signs is the Disposition Ledger.
    const closeNeed = (m) => (P[m].find((p) => /^Close-Out/.test(p.title)) || {}).need || '';
    MATTERS.forEach((m) => has(closeNeed(m), 'Sign-off on the Disposition Ledger, the final record of where every item went.', '⚠⚠ ' + (m || 'unanswered') + ': the Disposition Ledger is the summary signed off'));
    MATTERS.forEach((m) => lacks(closeNeed(m), 'final disposition summary', (m || 'unanswered') + ': not "the final disposition summary"'));
    // An estimate drawn before any client is bound (no job) still writes to an estate, in the probate words.
    const jobless = inEastern(() => attempt(() => JSON.stringify(docCtx()._cePhases(EST({ svc: 'probate' }), undefined))));
    has(jobless, 'and any proceeds are routed to the estate account.', '⚠ no job: the estate account, never the client\'s');
    has(jobless, 'a certified copy of the Letters of Administration or Testamentary', 'and the Letters');
    // ⚠ The safe direction, stage by stage: an unanswered matter reads exactly as probate.
    eq(s(''), s('probate'), '⚠⚠ an unanswered matter\'s stages equal the probate ones, word for word');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('B2 · a Probate service recorded as a trust promises no court filing; living work keeps every word');
  {
    const E = EST({ svc: 'probate', docTier: 'values' });
    const formal = { gate706: 'yes' };
    const pro = phases(JOB('', Object.assign({ svc: 'probate' }, formal)), E);
    const tr = phases(JOB('trust', Object.assign({ svc: 'probate' }, formal)), E);
    const close = (P) => P.find((p) => /^Close-Out/.test(p.title)) || {};
    eq(close(pro).title, 'Close-Out &amp; Court Filing', 'fixture: an unanswered Probate service closes with a court filing, as before');
    has(close(pro).body, 'filed within the statutory deadline', 'and promises the filing');
    has(JSON.stringify(close(pro).receive), 'A verified inventory to the standard the court requires', 'to the court\'s standard');
    has(close(pro).done, 'the filing is complete', 'and calls it complete');
    eq(close(tr).title, 'Close-Out', '⚠⚠ recorded as a trust: no "Court Filing" stage');
    lacks(close(tr).body, 'statutory deadline', '⚠⚠ and no filing within a statutory deadline');
    lacks(JSON.stringify(close(tr).receive), 'the court requires', 'no court\'s standard');
    has(JSON.stringify(close(tr).receive), 'A verified inventory to a formal documentation standard, carrying date-of-death fair market value for every asset', 'the formal standard instead');
    lacks(close(tr).done, 'the filing is complete', 'and no filing to complete');
    const capT = phases(JOB('trust', Object.assign({ svc: 'probate' }, formal)), EST({ svc: 'probate', docScope: 'capture', docTier: 'contents' }));
    lacks(phaseText(capT), 'statutory deadline', 'at capture scope too');
    // Living work: none of it.
    const living = { id: 7, name: 'Jane Doe', svc: 'downsizing', docLevel: 'formal', payments: [] };
    const L = phases(living, EST({ svc: 'downsizing', docScope: 'none' }));
    const lt = phaseText(L);
    ['Certification of Trust', 'Disposition Ledger', 'trust account', 'Letters'].forEach((w) => lacks(lt, w, 'living work: no "' + w + '"'));
    has(close(L).need, 'A final walkthrough with us, and sign-off on the disposition summary.', 'living work signs off its disposition summary, as before');
    has(close(L).done, 'the filing is complete', '⚠ a living job on the formal standard keeps its words unchanged (out of P19\'s scope)');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('B2 · the join: Exhibit A as the client reads it, on a trust and on an unanswered matter');
  {
    const ce = (job) => inEastern(() => attempt(() => docCtx(job).clientEstimateHtml(EST({ svc: job.svc }), job)));
    const tr = ce(JOB('trust', TRUST)), un = ce(JOB(''));
    ok(tr.length > 10000 && tr.indexOf('THREW') !== 0, 'fixture: the real client estimate rendered (' + tr.length + ')');
    has(tr, 'the successor trustee’s Certification of Trust, with any limits on the trustee’s powers noted in writing', '⚠⚠ the trustee\'s estimate asks for the Certification');
    has(tr, 'routed to the trust account', 'and routes proceeds to the trust');
    lacks(tr, 'Letters of Administration', 'and never asks for Letters');
    has(un, 'a certified copy of the Letters of Administration or Testamentary, with any limits on that authority noted in writing', 'an unanswered matter\'s estimate is unchanged');
    has(tr, 'Sign-off on the Disposition Ledger, the final record of where every item went.', 'both name the Disposition Ledger');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // The lead, after the merge (P19): this workstream found the estimate's identity line still reading "Estate of
  // <decedent>" on a trust-only matter, outside its listed functions. The trust by name where recorded, else the
  // decedent; every other matter, and a living client, exactly as before.
  group('Lead · the client estimate\'s identity line names the trust on a trust-only matter, never "Estate of"');
  {
    const ce = (job) => inEastern(() => attempt(() => docCtx(job).clientEstimateHtml(EST({ svc: job.svc }), job)));
    const cell = (h) => { const i = h.indexOf('ce-ident-row'); const j = h.indexOf('Property</div>', i); return i > 0 && j > i ? text(h.slice(i, j)) : 'NO IDENTITY ROW'; };
    const named = cell(ce(JOB('trust', TRUST)));
    // RESTATED 2026-10-05 (P20, Q27): the month spelled out (trustInstrumentTitle, through fmtCEDate).
    has(named, 'Trust The Adler Family Trust, dated March 3, 2015', '⚠⚠ a trust-only matter with the trust recorded: the trust, by its name and date');
    lacks(named, 'Estate of', 'and never "Estate of"');
    const bare = cell(ce(JOB('trust')));
    has(bare, 'Decedent Margaret Doe', 'no trust name recorded: the decedent, which is true either way');
    lacks(bare, 'Estate of', 'still no "Estate of"');
    has(cell(ce(JOB('trust', { trustName: 'The Adler Trust' }))), 'Trust The Adler Trust', 'a name already beginning "The" is not given a second');
    const typed = ce(JOB('trust', { trustName: '<b>Adler</b>' }));
    has(typed, 'The &lt;b&gt;Adler&lt;/b&gt;', 'a typed name is text: escaped by the namer');
    lacks(typed, '<b>Adler</b>', 'and never markup');
    ['', 'probate', 'both', 'neither'].forEach((m) => {
      const c = cell(ce(JOB(m, TRUST)));
      has(c, 'Estate Estate of Margaret Doe', (m || 'unanswered') + ': "Estate of", unchanged');
      lacks(c, 'Adler Family Trust', (m || 'unanswered') + ': no trust named in the identity line');
    });
    const living = cell(ce(JOB('', { svc: 'home_cleanout', executor: '', executorRole: '', name: 'Joan Smith' })));
    has(living, 'Client Joan Smith', 'a living client: their own name, as before');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('B3 · the Trust Schedule names the trust, and each trustee receives it on a line of their own');
  {
    const items = () => [IT('i1', { objectName: 'Trust sofa', assetTrack: 'Trust' }), IT('i2', { objectName: 'Trust rug', fmv: '900', assetTrack: 'Trust' })];
    const h = sched('trust', JOB('trust', TRUST), items());
    ok(h.indexOf('#357a50') > 0, 'fixture: a FINAL trust schedule (its signature block is drawn)');
    // RESTATED 2026-10-05 (P20, Q27): the month spelled out, and the sandbox lifts the real long-date helper (fmtCEDate).
    has(h, '<div style="font-size:12px;margin-bottom:2px;">The Adler Family Trust, dated March 3, 2015</div>', '⚠⚠ the header names the trust as the instrument');
    ok(h.indexOf('The Adler Family Trust') > h.indexOf('Margaret Doe') && h.indexOf('The Adler Family Trust') < h.indexOf('Prepared for the successor trustee'),
       'under the decedent\'s line, above "Prepared for the successor trustee"');
    lacks(sched('trust', JOB('trust'), items()), ', dated', 'no trust recorded: no line, nothing invented');
    has(sched('trust', JOB('trust', { trustName: 'Adler Family Trust' }), items()), '>The Adler Family Trust</div>', 'a name without a date: the name alone');
    lacks(sched('trust', JOB('trust', { trustDate: '2015-03-03' }), items()), 'March 3, 2015</div>', 'a date alone names no trust');
    lacks(sched('trust', JOB('probate', TRUST), items()), 'Adler Family Trust', 'a matter recorded as having no trust never names one');
    has(sched('trust', JOB('trust', { trustName: '<b>X</b> Trust' }), items()), 'The &lt;b&gt;X&lt;/b&gt; Trust', '⚠ escaped');
    // One line, unchanged, without co-trustees.
    const OLD = '<div style="margin-top:18px;font-size:11px;">Received for the trust&rsquo;s records by: __________________________________ &nbsp; Date: ____________<br><span style="color:#888;">Successor Trustee</span></div>';
    has(h, OLD, 'no co-trustee: the one blank line, byte for byte as before');
    eq(count(h, 'Received for the trust&rsquo;s records by'), 1, 'and only one');
    // Co-trustees: a line apiece, named.
    const co = sched('trust', JOB('trust', Object.assign({ coFiduciaries: CO2 }, TRUST)), items());
    eq(count(co, 'Received for the trust&rsquo;s records by'), 3, '⚠⚠ three trustees recorded: three lines');
    ['Ruth Adler', 'Daniel Adler', 'Eve Adler'].forEach((n) => has(co, '<span style="color:#888;">' + n + ' &middot; Successor Trustee</span>', 'each named under their line: ' + n));
    lacks(co, OLD, 'and no anonymous line beside them');
    ok(co.indexOf('Ruth Adler &middot;') < co.indexOf('Daniel Adler &middot;'), 'the representative first');
    // On a trust-only matter every fiduciary is a trustee, whatever role the record happens to carry.
    const anyRole = sched('trust', JOB('trust', { executorRole: 'Family Member', coFiduciaries: [{ id: 'c1', name: 'Daniel Adler', role: '' }] }), items());
    eq(count(anyRole, 'Received for the trust&rsquo;s records by'), 2, '⚠ trust-only: the representative and a co-trustee recorded with no trustee role both receive it');
    has(anyRole, 'Ruth Adler &middot; Successor Trustee', 'each as a successor trustee');
    // Both: only those whose recorded role names a trustee receive the trust's schedule.
    const bothItems = () => [IT('i1', { assetTrack: 'Trust' })];
    const mixed = sched('trust', JOB('both', { executorRole: 'Personal Representative', coFiduciaries: [{ id: 'c1', name: 'Tess Trustee', role: 'Trustee' }] }), bothItems());
    eq(count(mixed, 'Received for the trust&rsquo;s records by'), 1, 'Both, a PR and one co-trustee: one trustee, so the one line');
    lacks(mixed, 'Ruth Adler &middot;', 'and the personal representative is not put down as a trustee');
    const twoT = sched('trust', JOB('both', { executorRole: 'Personal Representative', coFiduciaries: [{ id: 'c1', name: 'Tess Trustee', role: 'Trustee' }, { id: 'c2', name: 'Tom Trustee', role: 'Co-Trustee' }] }), bothItems());
    eq(count(twoT, 'Received for the trust&rsquo;s records by'), 2, 'Both, two trustees: two lines');
    lacks(twoT, 'Ruth Adler', '⚠ the PR receives none');
    // A draft withholds every line, as before.
    const draft = sched('trust', JOB('trust', { coFiduciaries: CO2 }), [IT('i1', { assetTrack: 'Trust', fmv: '' })]);
    eq(count(draft, 'Received for the trust&rsquo;s records by'), 0, 'a draft (an unvalued line) withholds the lines, co-trustees or not');
    const xss = sched('trust', JOB('trust', { coFiduciaries: [{ id: 'c1', name: '<b>Eve</b>', role: 'Trustee' }] }), items());
    has(xss, '&lt;b&gt;Eve&lt;/b&gt; &middot; Successor Trustee', '⚠ a co-trustee\'s typed name is escaped');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('B4 · the Court Inventory gives each personal representative an adoption line');
  {
    const items = () => [IT('i1', { objectName: 'Probate sofa', assetTrack: 'Probate' })];
    const OLD = '<div style="margin-top:18px;font-size:11px;">Reviewed and adopted by: __________________________________ &nbsp; Date: ____________<br><span style="color:#888;">Personal Representative / authorized fiduciary</span></div>';
    const one = sched('court', JOB('probate'), items());
    ok(one.indexOf('#357a50') > 0, 'fixture: a FINAL court schedule');
    has(one, OLD, 'one personal representative: the one blank line, byte for byte as before');
    eq(sched('court', JOB(''), items()), one, '⚠ an unanswered matter renders the court schedule exactly as probate');
    const COPR = [{ id: 'c1', name: 'Paul Adler', role: 'Personal Representative' }];
    const two = sched('court', JOB('probate', { coFiduciaries: COPR }), items());
    eq(count(two, 'Reviewed and adopted by'), 2, '⚠⚠ a co-personal representative recorded: two adoption lines');
    ['Ruth Adler', 'Paul Adler'].forEach((n) => has(two, '<span style="color:#888;">' + n + ' &middot; Personal Representative / authorized fiduciary</span>', 'each named: ' + n));
    lacks(two, OLD, 'and no anonymous line beside them');
    eq(count(sched('court', JOB('', { coFiduciaries: COPR }), items()), 'Reviewed and adopted by'), 2, 'an unanswered matter with a co-representative: two lines too');
    // Both: a co-trustee does not adopt the estate's inventory.
    const mixed = sched('court', JOB('both', { coFiduciaries: [{ id: 'c1', name: 'Tess Trustee', role: 'Trustee' }] }), items());
    eq(count(mixed, 'Reviewed and adopted by'), 1, 'Both, the PR and a co-trustee: one personal representative, one line');
    lacks(mixed, 'Tess Trustee', '⚠ the co-trustee adopts nothing');
    const three = sched('court', JOB('both', { coFiduciaries: COPR.concat([{ id: 'c2', name: 'Tess Trustee', role: 'Trustee' }]) }), items());
    eq(count(three, 'Reviewed and adopted by'), 2, 'Both, two PRs and a co-trustee: two lines, the trustee left out');
    const draft = sched('court', JOB('trust', { coFiduciaries: COPR }), items());
    eq(count(draft, 'Reviewed and adopted by'), 0, 'a trust matter\'s court schedule is a draft: no adoption lines at all');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('One definition each, and every reader counted');
  {
    eq(readers('docEstateAuthority'), { _cePhases: 1, probateAgreementHtml: 1 }, 'the documents\' paper: the agreement and Exhibit A');
    // The lead (P19, after the merge) gave the client estimate's identity line the same namer: one more reader.
    eq(readers('trustInstrumentTitle'), { clientEstimateHtml: 1, printTrustSchedule: 2, probateAgreementHtml: 2 }, 'the trust\'s namer: the agreement\'s two rows, the schedule\'s header and the client estimate\'s identity line');
    eq(readers('scheduleSigners'), { printCourtInventory: 2, printTrustSchedule: 2 }, 'who signs a schedule: the two schedules');
    eq(readers('scheduleSignLines'), { printCourtInventory: 1, printTrustSchedule: 1 }, 'and their lines');
    eq(readers('_agrCounsel'), { _agrScopeServices: 1, probateAgreementHtml: 2 }, 'counsel\'s names: §1.2, §2 and §2.1');
    eq(readers('_agrClientCapacity'), { probateAgreementHtml: 2 }, 'the Client\'s capacity: §6.3 and the signature page');
    eq(readers('_agrEstateNoun'), { probateAgreementHtml: 5 }, 'the estate noun: §3.1, §5.3, §7.1 twice (once as a possessive) and §10');
    eq(readers('_agrTrustIsParty'), { _agrEstateNoun: 1, clientEstimateHtml: 1, probateAgreementHtml: 1 }, 'whether the trust is the party: §1.2, the noun and the client estimate\'s identity line');
    // RESTATED 2026-10-05 (P20): two more readers, the envelope's co-signers (esignCoSigners) and the one answer to whether
    // their signatures are on record (agreementCoSignState).
    // RESTATED 2026-10-05 (P21): one more, the sign-by-hand email's line that each co-representative signs too (Q31,
    // agreementEmailCoSignLine), asked of the same list the signature page prints.
    eq(readers('_agrCoSigners'), { _agrCoRepRepresentation: 1, agreementCoSignState: 1, agreementEmailCoSignLine: 1, esignCoSigners: 1, probateAgreementHtml: 1 }, 'the co-signers: the signature page, §5.1, the envelope, the record and the email');
    const body = noComments(fn('probateAgreementHtml'));
    ok(body.length > 20000, 'fixture: the estate form\'s live source (' + body.length + ')');
    ["dRow('Estate Attorney'", "dRow('Letters of Administration'", ">Client / Personal Representative<", "Notify Client / Personal Representative", "anyone the Personal Representative authorizes",
     "prepared for the Personal Representative", "Vendors bill the estate directly", "on behalf of the estate, subject", "employees of the Client or the estate", "(handled by estate attorney)",
     "'Authority, Probate &amp; Legal Compliance'", "second beneficiary or co-PR"]
      .forEach((w) => lacks(body, w, '⚠ the form spells none of the matter\'s nouns itself: ' + w));
    has(body, "if (invProbateRows(job)) {\n    content += dRow('Probate Case Number', probateCase);", 'the case number row sits under the one court predicate');
    lacks(noComments(fn('_agrScopeServices')).toLowerCase(), 'estate attorney', '§2 asks _agrCounsel instead of naming the estate attorney');
    ['_agrClientCapacity', '_agrCounsel', '_agrEstateNoun', '_agrTrustIsParty', '_agrAuthorityTitle', '_agrCoSignerCaption', 'docEstateAuthority', 'scheduleSigners']
      .forEach((n) => ok(!/'(trust|both|neither)'/.test(noComments(fn(n))), n + ' asks the matter catalogue\'s flags, never a matter name'));
    ['estateAuthority', 'jobFiduciaries', 'estateProceedsHolder', 'trustInstrumentTitle', 'scheduleSigners', 'docEstateAuthority']
      .forEach((n) => eq((SRC.match(new RegExp('\\nfunction ' + n + '\\(', 'g')) || []).length, 1, n + ' is defined once'));
  }
};
