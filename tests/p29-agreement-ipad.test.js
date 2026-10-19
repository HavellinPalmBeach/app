'use strict';
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// P29 (2026-10-18) · THE AGREEMENT SIGNED ON THE IPAD. Anthony: *"if we're dealing with older people and we're in person
// can we just show them the iPad and let them read the agreement … should we just have the ability to sign an agreement
// on the iPad"*; asked which jobs: every service, a fourth route beside DocuSign, the PDF to sign by hand and Handed over
// in person. DocuSign stays for anything sent.
//
//   1  The catalogue: how 'ipad' on AGR_SIG_METHODS, never offered to the hand recorder; the signed packet's record kind.
//   2  agreementIpadRefusal, the one gate: signed, an envelope out, the estimate, the acceptance, a raise, no URL.
//   3  agreementSignedHtml on the REAL forms: the images at the client's, Havellin's and each co-signer's block, the
//      day beside each, every unsigned marker removed, no DocuSign anchor left in the filed copy.
//   4  The execution record: what the app witnessed, the countersignature stated either way.
//   5  The record: the send where none was, the signature as DocuSign's is written, the co-signers with how 'ipad',
//      the filed copy's link; agreementCoSignState and the rail read it; the band offers the route only where the
//      gate would not refuse.
//   6  The dialog's Done: refuses a tap, skips a co-representative unticked, records nothing on a failed PDF or filing,
//      files kind signed_agreement (glass) and records on success.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const { sandbox, source, fn, decl, domStub } = require('./harness');

const SRC = source();
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
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
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&middot;/g, '·').replace(/&rsquo;/g, '’').replace(/&mdash;/g, '—').replace(/&#39;/g, "'")
  .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const count = (hay, needle) => String(hay).split(needle).length - 1;
const NOW = Date.parse('2026-10-19T15:00:00Z');
const FixedDate = (t) => class extends Date { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } };

const DAN = { id: 'cf1', name: 'Daniel Adler', role: 'Co-Trustee', phone: '', email: 'dan@adler.example' };
const MAE = { id: 'cf2', name: 'Mae O\'Neil', role: 'Co-Trustee', phone: '', email: 'mae@oneil.example' };
// A trust-only estate, agreed and approved, the packet not yet sent; a living Home Transition beside it.
const JOB = (o) => Object.assign({
  id: 60, hvlId: 'HVL-0060', name: 'Harold Adler', svc: 'cleanout', matterType: 'trust', status: 'won', won: true, approved: true,
  wonAt: '2026-10-01', wonBy: 'Ashley Jerome', created: 'Sep 28, 2026', agrApproved: true, agrApprovedBy: 'Anthony Graziano', tc: 'Ashley Jerome',
  addr: '100 Ocean Blvd', city: 'Palm Beach', zip: '33480', deathDate: '2026-08-01', executor: 'Ruth Adler', executorRole: 'Trustee',
  executorEmail: 'ruth@adler.example', executorAuth: 'received', trustName: 'Adler Family Trust', trustDate: '2015-03-03', docTier: 'values',
  coFiduciaries: [Object.assign({}, DAN), Object.assign({}, MAE)], docState: {}, at: {}, updatedAt: 1, payments: [], signedRecords: [],
}, o || {});
const LIVING = (o) => Object.assign({ id: 61, hvlId: 'HVL-0061', name: 'Jane Doe', email: 'jane@x.com', svc: 'downsizing_move', status: 'won', won: true,
  approved: true, agrApproved: true, tc: 'Ashley Jerome', addr: '12 Ocean Blvd', city: 'Palm Beach', zip: '33480', docState: {}, at: {}, payments: [], signedRecords: [] }, o || {});
const EST = (jobId, svc) => ({ jobId, svc, tcFee: 6000, psFee: 8000, pkgCost: 0, smf: 0, prepFee: 0, havellinTotal: 14000, totTC: 40, totPS: 80, tcRate: 150, psRate: 100,
  discountPct: 0, fixedPrice: false, rush: false, docScope: 'full', docTier: 'values', vendors: [], prepItems: [], rooms: [{ idx: 1, name: 'Study', st: 'in', vol: 3, cplx: 3 }], collections: [], vehicles: [] });
const REC = (jobId, svc) => ({ estimate: EST(jobId, svc), approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 30, 2026', savedAt: 1 });
const IMG = (k) => 'data:image/png;base64,SIG-' + k;

module.exports = function ({ group, ok, eq, has, lacks }) {
  const G = (name, body) => { group(name); try { inEastern(body); } catch (e) { ok(false, name + ' — threw: ' + String(e && e.stack || e).split('\n').slice(0, 4).join(' | ')); } };

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  G('1 · the catalogue', () => {
    const c = sandbox({ fns: [], vars: ['AGR_SIG_METHODS', 'AGR_SIG_MANUAL_METHODS'], stubs: {} });
    ok(c.AGR_SIG_METHODS.ipad && /iPad/.test(c.AGR_SIG_METHODS.ipad.label), 'how "ipad" is a signature method the rail can name: ' + (c.AGR_SIG_METHODS.ipad || {}).label);
    ok(c.AGR_SIG_MANUAL_METHODS.indexOf('ipad') < 0, '⚠ never offered to the hand recorder, which records paper');
    const k = sandbox({ fns: [], vars: ['SIGNED_RECORD_KINDS', 'AGR_IPAD_KIND', 'AGR_IPAD_REF'], stubs: {} });
    eq(k.SIGNED_RECORD_KINDS[k.AGR_IPAD_KIND] && k.SIGNED_RECORD_KINDS[k.AGR_IPAD_KIND].label, 'Signed agreement', 'the signed packet files under its own kind');
    eq(k.AGR_IPAD_KIND, 'signed_agreement', 'a stored value');
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  G('2 · agreementIpadRefusal, the one gate', () => {
    const rig = (url) => lift(['agreementIpadRefusal'], { jobs: [], estimateStore: {}, SHEETS_SYNC_URL: url === undefined ? 'https://sync.example/exec' : url });
    const c = rig();
    eq(c.agreementIpadRefusal(JOB(), REC(60, 'cleanout')), '', 'an approved, accepted, unsent estate: may sign');
    eq(c.agreementIpadRefusal(LIVING(), REC(61, 'downsizing_move')), '', 'a living client too: every service');
    has(c.agreementIpadRefusal(JOB({ agrSigned: true, docState: { agreement: { sig: { how: 'wet', signedBy: 'Ruth Adler', signedOn: '2026-10-03' } } } }), REC(60, 'cleanout')), 'already signed', 'signed: refused');
    has(c.agreementIpadRefusal(JOB({ agrSent: true, docState: { agreement: { sentAt: '2026-10-02T14:00:00.000Z', esign: { envelopeId: 'env-1', status: 'sent' } } } }), REC(60, 'cleanout')),
        'DocuSign has this agreement out', '⚠⚠ an envelope out: the client signs there, never twice by two routes');
    has(c.agreementIpadRefusal(JOB(), Object.assign(REC(60, 'cleanout'), { approved: false })), 'estimate must be approved', 'no approved estimate');
    has(c.agreementIpadRefusal(JOB({ won: false, status: 'approved' }), REC(60, 'cleanout')), 'acceptance first', 'not won: the acceptance first');
    has(c.agreementIpadRefusal(JOB({ acceptedTotal: 12000 }), REC(60, 'cleanout')), 'revised price', 'a raise after acceptance: re-accept first');
    has(rig('').agreementIpadRefusal(JOB(), REC(60, 'cleanout')), 'Handed over in person', 'no URL: cannot make or file the PDF, and names the paper route');
    has(c.agreementIpadRefusal(null), 'could not be found', 'no job');
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  G('3 · agreementSignedHtml on the real forms', () => {
    const A = lift(['agreementHtml', 'probateAgreementHtml', 'agreementSignedHtml', 'esignAnchorsPresent', 'esignCoSignerAnchors'],
      { estimateStore: {}, currentEstimate: null, jobs: [], document: domStub({}) });
    const job = JOB();
    const html = A.probateAgreementHtml(job, EST(60, 'cleanout'));
    const before = A.esignAnchorsPresent(html);
    ok(['clientSig', 'havSig', 'coSig1', 'coSig2', 'mktOptOut'].every((k) => before.indexOf(k) >= 0), 'the estate form prints the markers for the client, Havellin, both co-signers and the opt-out box: ' + JSON.stringify(before));
    const sigs = { client: { img: IMG('ruth'), date: '2026-10-19', name: 'Ruth Adler', role: 'Trustee' }, hav: { img: IMG('ag'), date: '2026-10-19' },
      co: [{ n: 2, img: IMG('mae'), date: '2026-10-19', name: 'Mae O\'Neil', role: 'Co-Trustee' }] };
    const out = A.agreementSignedHtml(html, sigs);
    eq(A.esignAnchorsPresent(out), [], '⚠⚠ no DocuSign marker is left in the filed copy, signed or not');
    // The Printed Name and Title / Role lines (2026-10-19, the first Ellison run: they came back blank on the filed PDF, the
    // record's name only as the caption under the line). The form prints a fill slot per signer; the iPad route writes the
    // name and role on the line for each who signed, and every slot nobody filled is gone.
    eq(count(html, 'class="agr-fill"'), 6, 'the estate form prints six slots: the client\'s name and role, each co-signer\'s');
    eq(count(html, 'data-fill="clientName"') + count(html, 'data-fill="clientRole"') + count(html, 'data-fill="coName1"') + count(html, 'data-fill="coRole1"') + count(html, 'data-fill="coName2"') + count(html, 'data-fill="coRole2"'), 6, 'one of each');
    lacks(out, 'agr-fill', '⚠ no slot is left in the filed copy, filled or not');
    const line = (t) => '<div class="sig-line"><span style="font-size:11px;">' + t + '</span></div>';
    eq(count(out, line('Ruth Adler')), 1, 'the client\'s printed name is on her line');
    eq(count(out, line('Trustee')), 1, 'and her role, as recorded');
    eq(count(out, line('Mae O&#39;Neil')), 1, 'Mae\'s printed name on her line');
    eq(count(out, line('Co-Trustee')), 1, 'and her role; Daniel, who did not sign, has neither');
    const danBlk = out.slice(out.indexOf('Daniel Adler') - 400, out.indexOf('Daniel Adler'));
    has(danBlk, '<div class="sig-line"></div>', 'Daniel\'s name line stays blank to print on by hand');
    eq(count(out, 'Daniel Adler'), 1, 'his name is the caption under the line only');
    ['/hsc/', '/hdc/', '/hsh/', '/hdh/', '/hcs1/', '/hcd1/', '/hcs2/', '/hcd2/', '/mko/'].forEach((m) => lacks(out, m, 'marker gone: ' + m));
    has(out, '&#9744;', 'the opt-out box stays a box, unticked, where the client did not opt out');
    lacks(out, '&#9746;', 'and is not ticked');
    const opted = A.agreementSignedHtml(html, Object.assign({}, sigs, { mktOptOut: true }));
    has(opted, '&#9746;', 'the client opting out: the box ticked on the page, as by hand on paper');
    lacks(opted, '/mko/', 'its marker gone');
    eq(count(out, IMG('ruth')), 1, 'the client\'s signature once');
    eq(count(out, IMG('ag')), 1, 'Havellin\'s once');
    eq(count(out, IMG('mae')), 1, 'the second co-signer\'s once');
    lacks(out, IMG('dan'), 'the first co-signer, not present, has no image');
    eq(count(out, 'alt="signature"'), 3, 'three images in all');
    // Each image sits in the block the marker sat in: the client's signature line, then the Havellin line, each co-signer's own.
    const at = (needle) => out.indexOf(needle);
    const clientBlock = out.slice(at('Client</div>') > 0 ? at('Client</div>') : 0);
    ok(clientBlock.indexOf(IMG('ruth')) >= 0, 'the client\'s image follows the Client caption');
    const mae = out.slice(out.indexOf('Mae O&#39;Neil') > 0 ? out.indexOf('Mae O&#39;Neil') : out.indexOf("Mae O'Neil"));
    ok(mae.indexOf(IMG('mae')) >= 0 && mae.indexOf(IMG('mae')) < 2500, 'Mae\'s image sits in her own block (' + mae.indexOf(IMG('mae')) + ' chars after her name)');
    const danAt = out.indexOf('Daniel Adler'), danEnd = out.indexOf('Co-Signer', danAt + 1);
    const dan = out.slice(danAt, danEnd > danAt ? danEnd : danAt + 1500);
    ok(danAt > 0 && danEnd > danAt, 'Daniel\'s block is bounded by the next Co-Signer caption');
    lacks(dan, 'alt="signature"', 'nothing drawn in Daniel\'s block');
    eq(count(out, '19 Oct 2026') + count(out, 'Oct 19, 2026') + count(out, 'October 19, 2026') + count(out, '2026-10-19'), 3, 'a day beside each of the three signatures');
    // The standard form, a living client: client and Havellin, no co-signer.
    const std = A.agreementHtml(LIVING(), EST(61, 'downsizing_move'));
    const stdOut = A.agreementSignedHtml(std, { client: { img: IMG('jane'), date: '2026-10-19' }, hav: null, co: [] });
    eq(A.esignAnchorsPresent(stdOut), [], 'the standard form: no marker left');
    eq(count(stdOut, 'alt="signature"'), 1, 'one image: the client\'s; Havellin\'s line left blank where nobody countersigned');
    eq(A.agreementSignedHtml(html, {}), A.agreementSignedHtml(html, { client: null, hav: null, co: [] }), 'nothing signed: every marker simply removed');
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  G('4 · the execution record', () => {
    const c = lift(['agreementIpadAttestationHtml'], { jobs: [] });
    const sigs = { client: { img: IMG('r'), date: '2026-10-19', name: 'Ruth Adler' }, hav: null, co: [{ n: 1, img: IMG('d'), date: '2026-10-19', name: 'Daniel Adler' }] };
    const t = text(c.agreementIpadAttestationHtml(JOB(), sigs, 'Ashley Jerome', '10/19/2026, 11:00:00 AM'));
    has(t, 'Ruth Adler read this Agreement, with the Estimate as Exhibit A, on the screen of Havellin’s device and signed it there with a finger on', 'what the client did');
    has(t, 'in the presence of Ashley Jerome for Havellin Palm Beach, LLC', 'who held the device');
    has(t, 'Daniel Adler signed the same way on', 'the co-signer present');
    has(t, 'Havellin’s countersignature is not on this copy', 'nobody countersigned: said, never implied');
    lacks(t, 'Countersigned', 'and not claimed');
    const t2 = text(c.agreementIpadAttestationHtml(JOB(), Object.assign({}, sigs, { hav: { img: IMG('a'), date: '2026-10-19' } }), 'Ashley Jerome', ''));
    has(t2, 'Countersigned for Havellin Palm Beach, LLC by Anthony Graziano, Managing Member, on the device on', 'countersigned: named');
    lacks(t2, ' at .', 'no time printed where none was given');
    has(t, 'made and filed to the client’s records by Havellin’s app at 10/19/2026', 'when the copy was made');
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // The record and its readers, with the DOM-side primes stubbed to what they do.
  function recRig(job, opt) {
    opt = opt || {};
    const log = { saves: 0, syncs: 0, sent: 0 };
    const c = lift(['_agrIpadRecord', 'recordAgreementSignature', 'agreementCoSignState', 'esignFiledCopies', 'jobTimelineActions', 'agreementIpadRefusal', 'jobTimeline',
      'agreementCoSignHtml', 'signedCopyControlHtml', 'signedRecordLinksHtml'], {
      jobs: [job], estimateStore: { [job.id]: REC(job.id, job.svc) }, SHEETS_SYNC_URL: opt.url === undefined ? 'https://sync.example/exec' : opt.url,
      saveJobs() { log.saves++; }, syncJobToSheets() { log.syncs++; }, document: domStub({}), Date: FixedDate(NOW),
      _primeAgreementFor: () => true,
      markAgreementSent() { log.sent++; job.agrSent = true; job.agrSentAt = 'October 19, 2026'; },
      changeOrders: [], contractors: [], jobPlanStore: {}, logStore: {}, _logsState: 'ready',
    });
    c.__log = log;
    return c;
  }
  const REC_OK = { id: 'sr1', fileUrl: 'https://drive.google.com/file/d/SIGNED/view', fileId: 'SIGNED' };
  const SIGS = () => ({ client: { img: IMG('r'), date: '2026-10-19', name: 'Ruth Adler' }, hav: { img: IMG('a'), date: '2026-10-19' },
    co: [{ n: 2, img: IMG('m'), date: '2026-10-19', name: 'Mae O\'Neil', email: 'mae@oneil.example' }] });

  G('5 · the record: the send, the signature, the co-signers, the link; what reads it', () => {
    const job = JOB();
    const c = recRig(job);
    eq(c._agrIpadRecord(60, REC_OK, SIGS(), 'Ashley Jerome'), '', 'recorded');
    const st = job.docState.agreement;
    eq([st.sentHow, !!st.sentAt, st.sentHowAt === st.sentAt, c.__log.sent], ['ipad', true, true, 1], 'the packet put in front of the client on the glass is the send, where none was on record');
    eq([st.sig.how, st.sig.provider, st.sig.signedBy, st.sig.signedOn, st.sig.filedUrl, st.sig.countersignedBy, st.sig.witnessedBy, st.sig.recordId],
       ['ipad', 'ipad', 'Ruth Adler', '2026-10-19', REC_OK.fileUrl, 'Anthony Graziano', 'Ashley Jerome', 'sr1'], 'the signature record, as every route\'s is written, with the copy\'s link');
    eq(st.sig.coSigners, [{ name: 'Mae O\'Neil', email: 'mae@oneil.example', signedOn: '2026-10-19', how: 'ipad' }], 'the co-signer who signed, how ipad');
    eq([job.agrSigned, job.agrSignedAt], [true, '2026-10-19'], 'the mirrors');
    ok(c.__log.saves >= 1 && c.__log.syncs >= 1, 'saved and synced as a person\'s edit');
    const cs = c.agreementCoSignState(job);
    eq(cs.coSigners.map((x) => [x.name, x.how]), [['Daniel Adler', ''], ['Mae O\'Neil', 'ipad']], 'agreementCoSignState: Mae on the iPad, Daniel owed');
    eq([cs.owed, cs.gaps.map((g) => g.name)], [true, ['Daniel Adler']], 'owed: Daniel');
    eq(c.esignFiledCopies(job).map((f) => [f.which, f.url]), [['agreement', REC_OK.fileUrl]], 'the filed packet is offered off the signature record, with no envelope');
    const rowsOf = (r) => (r && r.rows) || r;
    const row = rowsOf(c.jobTimeline(job, REC(60, 'cleanout'), [], [], null, null)).filter((r) => r.key === 'agreement_signed')[0];
    ok(row && row.done, 'the Agreement signed row is done');
    has(row.sub, 'Signed on the iPad', 'and says how');
    has(row.sub, 'Mae O\'Neil signed on the iPad', 'and that Mae did too');
    has(row.sub, 'countersigned for Havellin by Anthony Graziano', 'and that Havellin countersigned');
    // The signed copy emailed to the client (2026-10-19): the rail says what the record holds and never "sent".
    lacks(row.sub, 'signed copy', 'no copy drafted yet: nothing claimed');
    job.docState.agreement.sig.copy = { draftedAt: '2026-10-19T15:00:00.000Z', provider: 'gmail', to: 'ruth@adler.example', cc: 'dan@adler.example, agreements@havellinpalmbeach.com', by: 'Ashley Jerome' };
    const rowC = rowsOf(c.jobTimeline(job, REC(60, 'cleanout'), [], [], null, null)).filter((r) => r.key === 'agreement_signed')[0];
    has(rowC.sub, 'signed copy drafted in Gmail for ruth@adler.example (send it)', 'a Gmail draft: drafted, for whom, and that a person sends it');
    lacks(rowC.sub, 'sent to', 'never a send the app did not witness');
    job.docState.agreement.sig.copy = { draftedAt: '2026-10-19T15:00:00.000Z', provider: 'none', to: '', cc: '' };
    const rowN = rowsOf(c.jobTimeline(job, REC(60, 'cleanout'), [], [], null, null)).filter((r) => r.key === 'agreement_signed')[0];
    has(rowN.sub, 'no email on file for the signed copy: send it from Drive', 'no email: said, a flag');
    delete job.docState.agreement.sig.copy;
    has(row.flag, 'Daniel Adler', 'Daniel\'s signature flagged as owed, as on every route');
    has(text(c.agreementCoSignHtml(job)), 'Mae O\'Neil — signed on the iPad', 'the block under the timeline reads the same');
    has(text(c.agreementCoSignHtml(job)), 'or sign on the iPad', 'and offers the iPad for the one still owed');
    // Without the countersignature the row says so.
    const job2 = JOB();
    const c2 = recRig(job2);
    c2._agrIpadRecord(60, REC_OK, Object.assign(SIGS(), { hav: null }), 'Ashley Jerome');
    const row2 = rowsOf(c2.jobTimeline(job2, REC(60, 'cleanout'), [], [], null, null)).filter((r) => r.key === 'agreement_signed')[0];
    has(row2.sub, 'Havellin’s countersignature is not on the filed copy', 'no countersignature: the row says so');
    ok(!job2.docState.agreement.sig.countersignedBy, 'and the record carries no countersigner');
    // A packet already sent (handed over in person) keeps its send.
    const job3 = JOB({ agrSent: true, docState: { agreement: { sentAt: '2026-10-10T14:00:00.000Z', sentBy: 'Ashley Jerome', sentHow: 'in_person', sentHowAt: '2026-10-10T14:00:00.000Z' } } });
    const c3 = recRig(job3);
    eq(c3._agrIpadRecord(60, REC_OK, SIGS(), 'Ashley Jerome'), '', 'recorded on a packet handed over earlier');
    eq([job3.docState.agreement.sentHow, c3.__log.sent], ['in_person', 0], 'the earlier send stands');
  });

  G('5 · the band offers the route only where the gate would not refuse', () => {
    const job = JOB();
    const c = recRig(job);
    const acts = (j, key, state) => {
      const o = c.jobTimelineActions({ key, state: state || 'current' }, j, REC(j.id, j.svc));
      return [o.primary ? o.primary.label : ''].concat(o.secondary.map((s) => s.label)).map((l) => text(l.replace(/&#\d+;/g, '')));
    };
    const sent = acts(job, 'agreement_sent');
    ok(sent.some((l) => /Sign on the iPad/.test(l)), 'Signing packet sent: Sign on the iPad beside the three routes: ' + JSON.stringify(sent));
    ok(sent.some((l) => /DocuSign|signing packet/.test(l)) && sent.some((l) => /Handed over in person/.test(l)), 'and DocuSign and Handed over in person are still there');
    const handed = JOB({ agrSent: true, docState: { agreement: { sentAt: '2026-10-10T14:00:00.000Z', sentHow: 'in_person', sentHowAt: '2026-10-10T14:00:00.000Z' } } });
    const signedRow = acts(handed, 'agreement_signed');
    ok(signedRow.some((l) => /Sign on the iPad/.test(l)) && signedRow.some((l) => /Record the signed agreement/.test(l)), 'Agreement signed, packet handed over: offered beside Record the signed agreement: ' + JSON.stringify(signedRow));
    const out = JOB({ agrSent: true, docState: { agreement: { sentAt: '2026-10-02T14:00:00.000Z', esign: { envelopeId: 'env-1', status: 'sent' } } } });
    ok(!acts(out, 'agreement_signed').some((l) => /Sign on the iPad/.test(l)), '⚠ an envelope out: withheld');
    eq(acts(job, 'agreement_sent', 'done').filter((l) => /Sign on the iPad/.test(l)), [], 'a row already done: not offered');
    const c0 = recRig(JOB(), { url: '' });
    const o0 = c0.jobTimelineActions({ key: 'agreement_sent', state: 'current' }, JOB(), REC(60, 'cleanout'));
    eq(o0.secondary.map((s) => text(s.label)).filter((l) => /iPad/.test(l)), [], 'no URL on this device: withheld, as the gate would refuse');
    const onlyCall = c.jobTimelineActions({ key: 'agreement_sent', state: 'current' }, job, REC(60, 'cleanout')).secondary.filter((s) => /iPad/.test(s.label))[0];
    eq(onlyCall && onlyCall.call, 'dashSignAgreementOnPad(60)', 'the button runs the handler for this job');
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  function dlgRig(job, opt) {
    opt = opt || {};
    const log = { posts: [], filed: [], notices: [], fb: [], redraws: 0, primes: 0, approved: 0 };
    const doc = domStub({});
    const pad = (strokes) => ({ canvas: { toDataURL: () => 'data:image/png;base64,PAD', getContext: () => ({ clearRect() {} }) }, strokes });
    const pads = { 'as-pad-client': pad(opt.client === undefined ? 12 : opt.client), 'as-pad-co1': pad(opt.co1 || 0), 'as-pad-co2': pad(opt.co2 || 0), 'as-pad-hav': pad(opt.hav || 0) };
    const c = lift(['dashSignAgreementOnPad', 'agreementSignOnPadDone', 'closeAgreementSignDialog', '_agrIpadRecord', 'recordAgreementSignature', 'agreementCoSignState',
      'agreementSignedHtml', 'agreementIpadAttestationHtml', 'agreementIpadSigners', 'signPadSigned', 'signPadDataUrl', 'signPadClear', 'signPadInit', '_signoutPdf', 'esignCoSignerAnchors'], {
      jobs: [job], estimateStore: { [job.id]: REC(job.id, job.svc) }, SHEETS_SYNC_URL: opt.url === undefined ? 'https://sync.example/exec' : opt.url,
      document: doc, Date: FixedDate(NOW), saveJobs() {}, syncJobToSheets() {}, renderJobs() {}, _dashRedraw() { log.redraws++; },
      dashNotice(k, m) { log.notices.push(k + ': ' + m); }, showFB(id, k, m) { log.fb.push(k + ': ' + m); },
      _primeAgreementFor() { log.primes++; return true; }, ensureAgreementApproved() { log.approved++; return ''; },
      markAgreementSent() { job.agrSent = true; },
      signingPacketHtml: () => '<div class="ce-page">PACKET ' + '<span style="color:#fff;font-size:6px;line-height:0;">/hsc/</span><span style="color:#fff;font-size:6px;line-height:0;">/hdc/</span>'
        + '<span style="color:#fff;font-size:6px;line-height:0;">/hsh/</span><span style="color:#fff;font-size:6px;line-height:0;">/hdh/</span>'
        + '<span style="color:#fff;font-size:6px;line-height:0;">/hcs1/</span><span style="color:#fff;font-size:6px;line-height:0;">/hcd1/</span>'
        + '<span style="color:#fff;font-size:6px;line-height:0;">/hcs2/</span><span style="color:#fff;font-size:6px;line-height:0;">/hcd2/</span>'
        + '<span class="agr-fill" data-fill="clientName"></span><span class="agr-fill" data-fill="clientRole"></span><span class="agr-fill" data-fill="coRole1"></span><span class="agr-fill" data-fill="coRole2"></span></div>',
      _signPads: pads, deviceUser: () => 'Ashley Jerome',
      File: class { constructor(parts, name, o) { this.parts = parts; this.name = name; this.type = (o || {}).type; this.size = parts[0].length; } },
      atob: (b) => Buffer.from(b, 'base64').toString('binary'),
      _appsScriptPost(url, body, cb) { log.posts.push(body); cb(!opt.pdfFails, opt.pdfFails ? { error: 'conversion failed' } : { ok: true, base64: Buffer.from('%PDF-1.4 signed').toString('base64') }); },
      fileSignedCopy(jobId, kind, meta, file, cb) {
        log.filed.push({ jobId, kind, meta, file });
        if (opt.fileFails) { cb(false, 'The signed copy was not filed to Drive. Try again.'); return false; }
        cb(true, meta.label + ' filed to Drive.', { id: 'sr9', kind, fileUrl: 'https://drive/signed', fileId: 'F9' });
        return true;
      },
      // The signed copy's email (2026-10-19): the draft measured, the mailbox stubbed.
      gmailConfigured: () => !opt.noGmail, buildMimeMessage: (o) => o, gmailDraftUrl: () => 'https://mail.google.com/mail/u/0/#drafts/d1',
      gmailCreateDraft(mime, cb) { log.drafts.push(mime); if (opt.gmailFails) { cb(false, { error: 'quota' }); return; } cb(true, { messageId: 'd1' }); },
      window: { open(u) { log.opened.push(u); }, location: {} }, showSyncBadge() {}, _gmailUserEmail: 'ops@havellinpalmbeach.com',
      docNames: () => ({ attachment: 'Havellin Services Agreement 2026-10-19.pdf' }),
      assignedTCContact: () => ({ name: 'Ashley Jerome', phone: '', email: '' }), conciergePhonesText: () => '',
    });
    log.drafts = []; log.opened = [];
    c.__log = log; c.__doc = doc;
    return c;
  }
  const here = (c, key, on) => { c.document.getElementById('as-here-' + key).checked = on; };

  G('6 · the dialog: opened behind the gate, with a pad per signer', () => {
    const job = JOB();
    const c = dlgRig(job);
    eq(c.dashSignAgreementOnPad(60), true, 'opens');
    eq([c.__log.primes, c.__log.approved], [1, 1], 'primed, and the approval stamped as every send stamps it');
    eq(c.document.getElementById('agr-sign-modal').style.display, 'flex', 'the modal is on screen');
    has(c.document.getElementById('as-doc').innerHTML, 'PACKET', 'the packet is in the dialog to read');
    const signers = c.document.getElementById('as-signers').innerHTML;
    eq(count(signers, 'class="as-pad"'), 4, 'four pads: the client, two co-signers, Havellin');
    has(signers, 'Ruth Adler', 'the representative named'); has(signers, 'Daniel Adler', 'each co-signer named'); has(signers, 'Anthony Graziano, Managing Member', 'Havellin\'s countersigner named');
    eq(count(signers, 'class="as-here"'), 2, 'a present-today tick per co-signer, none for the client or Havellin');
    has(signers, 'leave blank if Anthony is not here', 'the countersignature optional, said');
    const signed = JOB({ agrSigned: true, docState: { agreement: { sig: { how: 'wet', signedBy: 'Ruth Adler', signedOn: '2026-10-03' } } } });
    const c2 = dlgRig(signed);
    eq(c2.dashSignAgreementOnPad(60), false, 'refused on a signed agreement');
    has(c2.__log.notices[0], 'already signed', 'by name');
    ok(c2.document.getElementById('agr-sign-modal').style.display !== 'flex', 'and the modal stays shut');
  });

  G('6 · Done: a tap refused, an absent co-signer skipped, nothing recorded until the copy is in Drive', () => {
    const job = JOB();
    const c = dlgRig(job, { client: 2 });
    c.dashSignAgreementOnPad(60);
    eq(c.agreementSignOnPadDone(), false, 'a tap is not a signature');
    has(c.__log.fb[c.__log.fb.length - 1], 'No signature yet from Ruth Adler', 'named');
    eq([c.__log.posts.length, c.__log.filed.length, !!job.agrSigned], [0, 0, false], 'nothing made, filed or recorded');
    // The client signed, a co-signer ticked present but not signed: refused by name.
    const jb = JOB();
    const cb = dlgRig(jb, { co2: 12 });
    cb.dashSignAgreementOnPad(60);
    here(cb, 'co1', true); here(cb, 'co2', true);
    eq(cb.agreementSignOnPadDone(), false, 'Daniel ticked present and unsigned');
    has(cb.__log.fb[cb.__log.fb.length - 1], 'No signature yet from Daniel Adler', 'named, with the untick offered');
    here(cb, 'co1', false);
    eq(cb.agreementSignOnPadDone(), true, 'Daniel unticked: goes');
    eq(cb.__log.filed.length, 1, 'filed once');
    const f = cb.__log.filed[0];
    eq([f.kind, f.meta.ref, f.meta.glass, f.meta.signedBy, f.meta.signedOn, f.file.type], ['signed_agreement', 'packet', true, 'Ruth Adler; Mae O\'Neil', '2026-10-19', 'application/pdf'], 'the signed packet, glass, its signers');
    const pdfHtml = cb.__log.posts[0].html;
    eq(cb.__log.posts[0].action, 'htmlToPdf', 'made through the one conversion');
    eq(count(pdfHtml, 'data:image/png;base64,PAD'), 2, 'two signatures drawn into the packet (the client\'s and Mae\'s), none for Daniel or Havellin');
    lacks(pdfHtml, '/hcs1/', 'Daniel\'s marker removed'); lacks(pdfHtml, '/hsh/', 'Havellin\'s marker removed'); lacks(pdfHtml, '/hsc/', 'the client\'s replaced');
    has(pdfHtml, 'Execution Record', 'the execution record at the foot');
    // The printed name and role lines, off the signers the dialog built (the role from the record, 2026-10-19).
    has(pdfHtml, '<span style="font-size:11px;">Ruth Adler</span>', 'the representative\'s printed name on her line');
    has(pdfHtml, '<span style="font-size:11px;">Trustee</span>', 'and her recorded role');
    eq(count(pdfHtml, '<span style="font-size:11px;">Co-Trustee</span>'), 1, 'Mae\'s role on hers, none for Daniel');
    lacks(pdfHtml, 'agr-fill', 'no slot left');
    has(pdfHtml, 'countersignature is not on this copy', 'and says Havellin did not countersign');
    const sig = jb.docState.agreement.sig;
    eq([sig.how, sig.signedBy, sig.filedUrl, (sig.coSigners || []).map((x) => x.name), sig.countersignedBy || ''], ['ipad', 'Ruth Adler', 'https://drive/signed', ['Mae O\'Neil'], ''], 'recorded off the filed copy');
    eq(cb.document.getElementById('agr-sign-modal').style.display, 'none', 'the dialog closes');
    // The signed copy to the client (2026-10-19; Anthony: "if we sign on ipad, a signed copy should also be emailed to the
    // client"): one Gmail draft to the representative, every co-representative and agreements@ copied, the PDF attached.
    eq(cb.__log.drafts.length, 1, 'one draft');
    const dr = cb.__log.drafts[0];
    eq([dr.to, dr.cc], ['ruth@adler.example', 'dan@adler.example, mae@oneil.example, agreements@havellinpalmbeach.com'], 'to the representative; the co-representatives and agreements@ copied');
    has(dr.subject, 'signed copy', 'the subject says what it is');
    eq(dr.attachments.map((a) => [a.name, a.base64]), [['Havellin Services Agreement 2026-10-19 — signed.pdf', Buffer.from('%PDF-1.4 signed').toString('base64')]], 'the PDF the app filed, attached');
    has(dr.text, 'Your signed copy is attached', 'the body says so');
    lacks(dr.text, 'https://drive/signed', 'and does not link Drive when the PDF rides along');
    has(dr.text, 'the property', 'an estate: the property, never your home');
    has(dr.html, 'Havellin', 'the html body in the house shell');
    const cpy = sig.copy;
    eq([cpy.provider, cpy.to, cpy.cc, cpy.draftUrl, cpy.by, !!cpy.draftedAt], ['gmail', 'ruth@adler.example', 'dan@adler.example, mae@oneil.example, agreements@havellinpalmbeach.com', 'https://mail.google.com/mail/u/0/#drafts/d1', 'Ashley Jerome', true], 'recorded on the signature as a draft, never a send');
    eq(cb.__log.opened, ['https://mail.google.com/mail/u/0/#drafts/d1'], 'the draft opened for the person to send');
    has(cb.__log.notices[cb.__log.notices.length - 1], 'The signed copy is drafted in ops@havellinpalmbeach.com for ruth@adler.example, copied to dan@adler.example, mae@oneil.example, agreements@havellinpalmbeach.com, with the PDF attached: read it and send it.', 'the notice says where the draft is and that a person sends it');
    // Gmail failing: the plain-email fallback with the filed copy linked, recorded as what it is.
    const jg = JOB();
    const cg = dlgRig(jg, { gmailFails: true });
    cg.dashSignAgreementOnPad(60); here(cg, 'co1', false); here(cg, 'co2', false);
    eq(cg.agreementSignOnPadDone(), true, 'goes');
    eq([jg.docState.agreement.sig.copy.provider, jg.docState.agreement.sig.copy.to, !!jg.agrSigned], ['mailto', 'ruth@adler.example', true], 'Gmail failed: a plain email, the signature still recorded');
    has(decodeURIComponent(cg.window.location.href), 'https://drive/signed', 'the plain email links the filed copy, since it can carry no attachment');
    has(decodeURIComponent(cg.window.location.href), 'cc=dan@adler.example', 'copied the same');
    has(cg.__log.notices[cg.__log.notices.length - 1], 'opened as a plain email for ruth@adler.example', 'said');
    // No email on file: nothing drafted, recorded as none, flagged in the notice; the signing never refused for it.
    const jn = JOB({ executorEmail: '', coFiduciaries: [] });
    const cn = dlgRig(jn);
    cn.dashSignAgreementOnPad(60);
    eq(cn.agreementSignOnPadDone(), true, 'goes with no email');
    eq([cn.__log.drafts.length, jn.docState.agreement.sig.copy.provider, !!jn.agrSigned], [0, 'none', true], 'no draft, recorded as none, the signature recorded');
    has(cn.__log.notices[cn.__log.notices.length - 1], 'No email on file for Ruth Adler: send the signed copy from Drive', 'flagged by name');
    eq(cn.__log.notices[cn.__log.notices.length - 1].slice(0, 5), 'warn:', 'as a warning');
    has(cb.__log.notices[cb.__log.notices.length - 1], 'Daniel Adler’s signature is not on record yet', 'the notice names the one still owed');
    has(cb.__log.notices[cb.__log.notices.length - 1], 'countersignature is not on the copy', 'and that Havellin did not countersign');
    // A failed PDF: nothing filed, nothing recorded, the paper route offered, the pads kept.
    const jp = JOB();
    const cp = dlgRig(jp, { pdfFails: true });
    cp.dashSignAgreementOnPad(60); here(cp, 'co1', false); here(cp, 'co2', false);
    cp.agreementSignOnPadDone();
    eq([cp.__log.filed.length, !!jp.agrSigned, cp.document.getElementById('agr-sign-modal').style.display], [0, false, 'flex'], 'PDF failed: nothing filed or recorded, the dialog stays open');
    has(cp.__log.fb[cp.__log.fb.length - 1], 'Handed over in person', 'the paper route named');
    has(cp.__log.fb[cp.__log.fb.length - 1], 'signatures are still on the pads', 'and the signatures kept');
    // A failed filing: the signature is not recorded without its copy.
    const jf = JOB();
    const cf = dlgRig(jf, { fileFails: true, hav: 12 });
    cf.dashSignAgreementOnPad(60); here(cf, 'co1', false); here(cf, 'co2', false);
    cf.agreementSignOnPadDone();
    eq([cf.__log.filed.length, !!jf.agrSigned, !!(jf.docState.agreement && jf.docState.agreement.sentAt)], [1, false, false], '⚠⚠ filing failed: no signature and no send recorded');
    has(cf.__log.fb[cf.__log.fb.length - 1], 'Nothing was recorded', 'said');
    // Havellin countersigning: on the copy and the record.
    const jh = JOB();
    const ch = dlgRig(jh, { hav: 12 });
    ch.dashSignAgreementOnPad(60); here(ch, 'co1', false); here(ch, 'co2', false);
    eq(ch.agreementSignOnPadDone(), true, 'signed with the countersignature');
    has(ch.__log.posts[0].html, 'Countersigned for Havellin Palm Beach, LLC by Anthony Graziano', 'the execution record says so');
    eq(jh.docState.agreement.sig.mktOptOut, undefined, 'no opt-out recorded where the box was not ticked');
    const jo = JOB();
    const co = dlgRig(jo);
    co.dashSignAgreementOnPad(60); here(co, 'co1', false); here(co, 'co2', false);
    co.document.getElementById('as-mko').checked = true;
    eq(co.agreementSignOnPadDone(), true, 'signed with the opt-out ticked');
    eq(jo.docState.agreement.sig.mktOptOut, true, 'the opt-out on the record');
    eq(jh.docState.agreement.sig.countersignedBy, 'Anthony Graziano', 'and the record');
    lacks(ch.__log.notices[ch.__log.notices.length - 1], 'countersignature', 'nothing to flag');
  });
};
