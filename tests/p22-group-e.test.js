'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P22 · GROUP E (2026-10-06): Anthony's decisions on the items groups A to D handed back, and two found in passing.
//
//   E1  Over-refund: a Deposit Retained job whose refunds took it to $0, or below its deposit, reads Closed — Refunded
//       (jobClosedRefunded, through jobStatusView), shows what it kept, and Win / Loss counts it lost.
//   E2  The walkaway's work done counts only what was delivered or incurred: the materials package once it is ticked on
//       site (materialsDelivered), the fees on vendor quotes actually recorded (getVendorActuals' actualOnly).
//   E3  The suggested fixed fee rounds UP to the next $100, never below the calculated price (fixedFeeSuggested).
//   E4  A failed as-found shot whose bytes are gone: one tap, Mark lost (who and when), the error clears, and it never
//       counts toward Lock.
//   E5  The client estimate's will sentence (CE_FOUND_PAPERS_TXT), in all three sorting arms.
//   E6  §5.1's trustee representation names the trust and the day the trustee accepted, where it is recorded.
//   E7  The vendor pickup list: a signed-record kind, pre-ticked by the vendor's channel, counting as gone and closing
//       custody where it is kept, on estates and living work.
//   E8  DocuSign refuses an envelope whose Client signer would be the estate attorney (esignClientSignerRefusal); group
//       B's amber note (esignCounselSignsNote) is gone.
//   E9  Group C's estate staff caution (staffEstate) is gone; the living caution and the estate refusal stay.
//   E10 Found in passing by group A: paintEstimateService's note on an unsaved build, and the Deposit Retained card on an
//       unknown settlement.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source, fn, decl, domStub, driveCalcAll } = require('./harness');

const SRC = source();
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
const noComments = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
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
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&middot;/g, '·').replace(/&#39;/g, "'")
  .replace(/&rsquo;/g, '’').replace(/&mdash;/g, '—').replace(/&#9888;/g, '⚠').replace(/&#10003;/g, '✓').replace(/&quot;/g, '"')
  .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const NOW = Date.parse('2026-10-06T15:00:00Z');
const FixedDate = (t) => class extends Date { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } };
const readers = (name) => [...ALL_FNS].filter((f) => { try { return f !== name && noComments(fn(f)).includes(name + '('); } catch (e) { return false; } }).sort();

module.exports = function ({ group, ok, eq, has, lacks }) {
  const G = (name, body) => { group(name); try { body(); } catch (e) { ok(false, name + ' — threw: ' + String(e && e.message || e).split('\n')[0]); } };

  // ═══════════════════════════════════════════════════════════════════════════
  // E1 · CLOSED — REFUNDED
  // ═══════════════════════════════════════════════════════════════════════════
  const PAID = () => [
    { id: 1, uid: 'p1', stage: 'deposit', amount: 5000, method: 'wire', receivedOn: '2026-09-01', clearedOn: '2026-09-01' },
    { id: 2, uid: 'p2', stage: 'midpoint', amount: 2500, method: 'wire', receivedOn: '2026-09-10', clearedOn: '2026-09-10' }];
  const REFUND = (amt, uid) => ({ id: 9, uid: uid || 'r1', stage: 'refund', amount: amt, refundedOn: '2026-10-01', method: 'check', payee: 'Gone Client' });
  const RJ = (refunds, o) => Object.assign({ id: 6, name: 'Gone Client', addr: '1 Way', svc: 'downsizing', status: 'closed_retained', won: true,
    lostAt: '2026-10-01T15:00:00Z', lostReasonLabel: 'Client walked away', havellinEst: 10000, docState: {}, at: {},
    payments: PAID().concat(refunds || []) }, o || {});
  const STORE = { 6: { approved: true, estimate: { jobId: 6, svc: 'downsizing', havellinTotal: 10000 } } };

  G('E1 · a Deposit Retained job refunded below its deposit reads Closed — Refunded, and Win / Loss counts it lost', () => {
    const C = lift(['jobClosedRefunded', 'jobStatusView', 'winLossFigures', 'winLossListHtml', 'closeoutRetainedTotal'],
      { jobs: [], estimateStore: STORE, jobsUnread: () => false });
    eq(C.depositTargetFor ? C.depositTargetFor(RJ()) : 5000, 5000, 'fixture: the deposit this job asked for is $5,000');
    const keep = RJ([REFUND(2500)]), under = RJ([REFUND(3000)]), none = RJ([]), all = RJ([REFUND(7500)]);
    eq([C.closeoutRetainedTotal(keep), C.closeoutRetainedTotal(under), C.closeoutRetainedTotal(all)], [5000, 4500, 0], 'fixture: what each keeps');
    eq(C.jobClosedRefunded(none), false, 'nothing refunded: Deposit Retained');
    eq(C.jobClosedRefunded(keep), false, 'refunded down to the deposit exactly: still Deposit Retained');
    eq(C.jobClosedRefunded(under), true, '⚠⚠ refunded below the deposit: Closed — Refunded');
    eq(C.jobClosedRefunded(all), true, '⚠⚠ refunded to $0: Closed — Refunded');
    eq(C.jobClosedRefunded(Object.assign(RJ([REFUND(3000)]), { status: 'closed' })), false, 'only a job closed out with money kept');
    // With no estimate the deposit is unknown: only $0 kept reads refunded.
    const C0 = lift(['jobClosedRefunded'], { jobs: [], estimateStore: {} });
    eq([C0.jobClosedRefunded(under), C0.jobClosedRefunded(all)], [false, true], 'no deposit known: only $0 kept is Closed — Refunded');
    // The one reading.
    const v = C.jobStatusView(under);
    eq([v.key, v.label, v.dot], ['closed_refunded', 'Closed — Refunded', 's-lost'], '⚠⚠ jobStatusView reads it so');
    eq(C.jobStatusView(keep).label, 'Closed — Deposit Retained', 'a job that kept its deposit reads as before');
    eq(under.status, 'closed_retained', 'derived, never stored: the record is untouched');
    // Win / Loss.
    C.jobs = [none, under];
    const f = C.winLossFigures();
    eq(f.won.map((j) => j === none), [true], '⚠⚠ the refunded job is off the Won list');
    eq(f.lost.length, 1, '⚠⚠ and on the Lost list');
    eq(f.wonRev, 7500, 'won revenue counts only what the retained job kept');
    const lostHtml = text(C.winLossListHtml('lost', f, false));
    has(lostHtml, 'Closed — Refunded · $4,500 kept', 'the Lost list names it and the net it kept');
    const all0 = text((() => { C.jobs = [all]; return C.winLossListHtml('lost', C.winLossFigures(), false); })());
    has(all0, 'Closed — Refunded · $0 kept', 'the net kept is shown at $0 too');
  });

  G('E1 · the client card\'s terminal row says Closed — refunded and the net kept, even at $0', () => {
    const C = lift(['jobTimeline'], { jobs: [], estimateStore: STORE });
    const row = (j) => (C.jobTimeline(j, STORE[6], [], [], null) || []).filter((r) => r.key === 'terminal')[0] || {};
    const a = row(RJ([REFUND(7500)]));
    eq(a.label, 'Closed — refunded', '⚠⚠ its label');
    has(a.sub, '$0 kept after refunds', '⚠⚠ and the net kept, at $0');
    const b = row(RJ([]));
    eq(b.label, 'Closed — deposit retained', 'Deposit Retained unchanged');
    has(b.sub, '$7,500 retained', 'with what it retained');
  });

  G('E1 · readers: jobStatusView, winLossFigures, the Lost list, the terminal row and saveRefund\'s notice ask the one rule', () => {
    eq(readers('jobClosedRefunded'), ['jobStatusView', 'jobTimeline', 'saveRefund', 'winLossFigures', 'winLossListHtml'], 'every reader, and only these');
    has(noComments(decl('JOB_STATUS_LABELS')), "closed_refunded: 'Closed — Refunded'", 'the one status vocabulary carries it');
    ok(decl('JOB_STATUS_ORDER').indexOf("'closed_refunded'") > decl('JOB_STATUS_ORDER').indexOf("'closed_retained'"), 'and the sort places it after Deposit Retained');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // E2 · THE WALKAWAY'S WORK DONE: DELIVERED OR INCURRED
  // ═══════════════════════════════════════════════════════════════════════════
  G('E2 · the materials package counts once ticked on site, and a vendor fee only on a quote recorded', () => {
    const lid = 'pv1';
    const est = { jobId: 6, svc: 'downsizing', havellinTotal: 12000, tcRate: 150, psRate: 100, tcFee: 6000, psFee: 4000, pkgCost: 800, pkgLabel: 'Standard — $800',
      prepEnabled: true, prepItems: [{ lid, type: 'Painting', cost: 5000 }], vendors: [] };
    const job = (o) => Object.assign({ id: 6, name: 'Gone Client', svc: 'downsizing', status: 'closed_retained', won: true, docState: {}, at: {},
      payments: [{ id: 1, uid: 'p1', stage: 'deposit', amount: 9000, method: 'wire', receivedOn: '2026-09-01', clearedOn: '2026-09-01' }] }, o || {});
    const logs = { 6: [{ id: 1, date: '2026-09-20', members: [{ role: 'TC', name: 'Ashley Jerome', hours: 10 }, { role: 'PS', name: 'Sam', hours: 20 }] }] };
    const make = (plan) => {
      const c = lift(['walkawaySettlement', 'walkawaySettlementHtml', 'invoiceHtml', 'materialsDelivered'], {
        jobs: [], estimateStore: { 6: { approved: true, estimate: est } }, jobLogs: logs, changeOrders: [], jobPlanStore: plan || {},
        Date: FixedDate(NOW), document: domStub({}), currentEstimate: null });
      c._logsState = 'ready';
      return c;
    };
    const c0 = make({});
    const j0 = job();
    const s0 = inEastern(() => c0.walkawaySettlement(j0));
    // Labour 10 × 150 + 20 × 100 = $3,500; nothing delivered, nothing quoted for real.
    eq(s0.basis, 'hourly', 'an hourly walkaway');
    eq(s0.work, 3500, '⚠⚠ the work done is the hours logged alone: no package on site, no vendor engaged');
    eq([s0.pkg, s0.pkgCounted], [800, false], 'the package is named as not counted');
    has(c0.walkawayWorkNote(s0), 'The $800 materials package is not counted: “Moving materials on site” is not ticked on the Job Plan.', 'and says why');
    const fullFinal = inEastern(() => c0.invoiceHtml(j0, 'final'));
    ok(fullFinal.servicesTotal > s0.work, 'fixture: the client\'s final still bills the package and the quoted fee (' + fullFinal.servicesTotal + ')');
    // The package on site.
    const c1 = make({ 6: { tasks: { materials_onsite: true } } });
    const s1 = inEastern(() => c1.walkawaySettlement(j0));
    eq(s1.work, 4300, '⚠⚠ ticked on site: the $800 package counts');
    eq(s1.pkgCounted, true, 'and is named as counted');
    lacks(c1.walkawayWorkNote(s1), 'is not counted', 'so the note says nothing is left out');
    // A prep vendor actually engaged: the fee on the quote recorded.
    const j2 = job({ prepSourcing: { ['L' + lid]: { quote: 4000, vendorName: 'Ace Painting' } } });
    const s2 = inEastern(() => c1.walkawaySettlement(j2));
    eq(s2.work, 4300 + 4000 * c1.prepFeeRate(), '⚠⚠ the fee on the quote recorded counts');
    // getVendorActuals' own arm.
    const qa = c1.getVendorActuals(job(), est, { actualOnly: true }), qe = c1.getVendorActuals(job(), est);
    eq([qa.prepTotal, qe.prepTotal], [0, 5000], 'actualOnly leaves out a line with no quote; every other caller is unchanged');
    has(text(c1.walkawaySettlementHtml(Object.assign(j0, { status: 'closed_retained' }))), 'The work done is what was delivered', 'the card carries the note');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // E3 · THE SUGGESTED FIXED FEE, UP TO THE NEXT $100
  // ═══════════════════════════════════════════════════════════════════════════
  G('E3 · the suggested fixed fee rounds up to the next $100 and never below the calculated price', () => {
    const c = lift(['fixedFeeSuggested'], {});
    eq(c.fixedFeeSuggested(21062.5, 0.2), 25300, '$25,275 → $25,300');
    eq(c.fixedFeeSuggested(21000, 0.2), 25200, 'a figure already on a hundred stays');
    eq(c.fixedFeeSuggested(21000.01, 0.2), 25300, 'a cent over goes up');
    eq(c.fixedFeeSuggested(0, 0.2), 0, 'nothing from nothing');
    [1234.56, 9999.99, 17654.32, 43210.1].forEach((v) => {
      const s = c.fixedFeeSuggested(v, 0.25), raw = Math.round(v * 1.25 * 100) / 100;
      ok(s % 100 === 0 && s >= raw && s - raw < 100, 'never below the price, and under $100 above it: ' + raw + ' → ' + s);
    });
    const BASE = ['Living Room', 'Kitchen', 'Dining Room', 'Primary Suite', 'Bedroom 2'];
    [['cleanout', 4100], ['probate', 5300], ['downsizing', 3700]].forEach(([svc, sqft]) => {
      const r = driveCalcAll({ svc, sqft, rooms: BASE, seed: { 'e-fixed': { checked: true } } });
      const fee = r.est.fixedSuggested;
      ok(fee > 0 && fee % 100 === 0, '⚠⚠ ' + svc + ': the engine\'s suggestion is on a whole hundred ($' + fee + ')');
      eq(r.est.fixedAmount, fee, 'and the fee tracks it');
      const h = driveCalcAll({ svc, sqft, rooms: BASE });
      eq(h.ctx.window._fixedPriceSuggested, fee, 'hourly, the panel offers the same suggestion');
      has(h.doc.getElementById('fixed-price-label').textContent, 'rounded up to the next $100', 'and says so');
    });
    eq(readers('fixedFeeSuggested'), ['calcAll'], 'calcAll is its one reader');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // E4 · MARK LOST
  // ═══════════════════════════════════════════════════════════════════════════
  G('E4 · a failed as-found shot with no bytes: Mark lost, who and when, the error clears, and Lock still waits', () => {
    const job = { id: 3, name: 'Estate of A', svc: 'cleanout', tc: 'Ashley Jerome', deathDate: '2026-01-01' };
    const shot = (id, o) => Object.assign({ stableId: id, roomIdx: 1, label: 'before', seq: 1, status: 'failed', ts: 1, filename: id + '.jpg' }, o || {});
    const refs = { 3: [shot('b1'), shot('b2', { seq: 2, status: 'uploaded', driveFileUrl: 'https://drive/x' }), shot('i1', { label: 'inventory', status: 'failed', roomIdx: 2 })] };
    const log = { saved: 0, painted: 0 };
    const c = lift(['markShotLost', 'shotMarkLostOffered', '_roomShotStripHtml', 'lockRefusal', 'lockFlag', '_planRoomListHtml', 'asFoundRecord'], {
      jobs: [job], _photoRefs: refs, _photoRetryData: { i1: 'data:x' }, _localShotThumbs: {}, _invThumbCache: () => ({}),
      savePhotoRefs() { log.saved++; }, _savePendingPhotoData() {}, _updatePhotoStatusEl() { log.painted++; },
      jobPlanStore: { 3: { rooms: { 1: { foundDone: { at: '2026-10-01', by: 'Ashley Jerome' } } } } },
      estimateStore: { 3: { estimate: { rooms: [{ idx: 1, name: 'Study' }] } } }, Date: FixedDate(NOW) });
    const b1 = refs[3][0];
    eq(c.shotMarkLostOffered(b1), true, 'offered: an as-found shot, failed, its image not held');
    eq(c.shotMarkLostOffered(refs[3][2]), false, 'never on an item shot');
    eq(c.shotMarkLostOffered(Object.assign({}, b1, { stableId: 'i1' })), false, 'never while the image is held (Retry can resend it)');
    const strip0 = c._roomShotStripHtml(3, 1);
    has(strip0, 'markShotLost(3,\'b1\')', '⚠⚠ the tile offers Mark lost in Retry\'s place');
    lacks(strip0, 'retryPhotoUpload(3,\'b1\')', 'and no Retry that cannot work');
    // Lock: with b1 and b2 both counted, b2 alone is a real shot either way; take b2 away to see the gate.
    b1.status = 'failed';
    refs[3][1].deletedAt = 1;
    eq(c.lockRefusal(job, 3, 1), '', 'fixture: a failed as-found shot still counts as a shot before it is marked lost');
    inEastern(() => c.markShotLost(3, 'b1'));
    eq([b1.status, b1.lostAt, b1.lostBy], ['lost', '2026-10-06', 'Ashley Jerome'], '⚠⚠ marked lost, the day and the concierge');
    ok(b1.updatedAt > 0 && log.saved === 1 && log.painted === 1, 'stamped, saved and repainted');
    eq(c.markShotLost(3, 'b1'), false, 'a second tap does nothing');
    has(c.lockRefusal(job, 3, 1), 'Shoot the room as found first', '⚠⚠ a lost shot never satisfies Lock: another is needed');
    has(c.lockFlag(Object.assign({}, job, { svc: 'downsizing', deathDate: '' }), 3, 1), 'No as-found shots on this room', 'and the living flag reads it the same way');
    const strip1 = text(c._roomShotStripHtml(3, 1));
    has(strip1, 'Lost · marked Oct 6, 2026 by Ashley Jerome', '⚠⚠ the entry stays, reading lost, with who and when');
    lacks(strip1, 'not saved', 'the error is cleared');
    lacks(c._planRoomListHtml(3), 'not saved', 'and the room card\'s flag with it');
    const rec = c.asFoundRecord(3);
    eq([rec.rooms[0].count, rec.rooms[0].unsaved, rec.rooms[0].lost], [1, 0, 1], 'the As-Found Record keeps it, as lost, not unsaved');
    has(noComments(fn('savePhotoRefs')), 'lostAt:r.lostAt, lostBy:r.lostBy', 'who and when survive a reload');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // E5 · THE WILL SENTENCE ON THE CLIENT ESTIMATE
  // ═══════════════════════════════════════════════════════════════════════════
  G('E5 · the client estimate says where an original will goes, in every sorting arm', () => {
    const want = 'An original will or codicil we find is handed, unopened, to the estate attorney the same day (or to you where no attorney is recorded), against a signed receipt, for deposit with the clerk as Florida law requires. Deeds, titles and financial records go to you and counsel against a signed receipt';
    const ctx = sandbox({
      fns: ['estTolerancePctTxt', '_cePhases', 'estimateDocScope', 'docScopeDef', 'svcHasDocStep', 'isDecedentJob',
            'weArrangeAppraisals', 'docTierProduces', 'docTierOf', 'docTierDef', 'appraisalDuty', 'estimateAppraiserLines', 'esc', 'estimateAppraiserNames', 'docEstateAuthority', 'matterDef', 'matterTypeOf', 'invFiduciaryMode', 'invProbateRows', 'estateProceedsHolder'],
      vars: ['AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'EST_TOLERANCE_PCT', 'JOB_STEPS', 'DOC_SCOPES', 'DECEDENT_SERVICES',
             'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'ESTATE_AUTHORITIES', 'CE_FOUND_PAPERS_TXT'],
      stubs: { isFormalDoc: () => true },
    });
    const job = { id: 1, svc: 'probate', executor: 'PR' };
    ['full', 'capture', 'none'].forEach((scope) => {
      const body = ctx._cePhases({ svc: 'probate', docScope: scope, vendors: [], collections: [] }, job)[1].body;
      has(body, want, '⚠⚠ ' + scope + ': the will goes to the estate attorney the same day');
      lacks(body, 'wills, codicils, deeds', scope + ': never "turned over to you and counsel" for a will');
    });
    eq((noComments(fn('_cePhases')).match(/CE_FOUND_PAPERS_TXT/g) || []).length, 3, 'one sentence, read by the three arms');
    has(require('fs').readFileSync(require('path').join(__dirname, '..', 'COUNSEL_REVIEW_BUNDLE.md'), 'utf8'),
      'An original will or codicil we find is handed, unopened,', 'it is in the counsel bundle');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // E6 · §5.1, THE TRUSTEE'S ACCEPTANCE
  // ═══════════════════════════════════════════════════════════════════════════
  G('E6 · §5.1 names the trust and the day the trustee accepted, where it is recorded', () => {
    const c = lift(['_agrTrusteeRepresentation'], {});
    const old = 'If acting as successor trustee, the Client has accepted the trusteeship and holds authority under the trust instrument to direct the disposition of the property described in this Agreement.';
    eq(c._agrTrusteeRepresentation({ trustName: 'Adler Family Trust', trustDate: '2015-03-03' }), old, '⚠ no acceptance date recorded: today\'s words, byte for byte');
    eq(inEastern(() => c._agrTrusteeRepresentation({ trustName: 'Adler Family Trust', trustDate: '2015-03-03', trusteeAcceptedOn: '2026-03-01' })),
      'If acting as successor trustee, the Client accepted the trusteeship of The Adler Family Trust, dated March 3, 2015 on March 1, 2026 and holds authority under the trust instrument to direct the disposition of the property described in this Agreement.',
      '⚠⚠ recorded: the trust\'s title and the day');
    eq(inEastern(() => c._agrTrusteeRepresentation({ trusteeAcceptedOn: '2026-03-01' })),
      'If acting as successor trustee, the Client accepted the trusteeship on March 1, 2026 and holds authority under the trust instrument to direct the disposition of the property described in this Agreement.',
      'no trust name recorded: the day alone, never "of  on"');
    has(inEastern(() => c._agrTrusteeRepresentation({ trustName: '<b>X</b>', trusteeAcceptedOn: '2026-03-01' })), 'The &lt;b&gt;X&lt;/b&gt;', 'the name is escaped');
    has(noComments(fn('probateAgreementHtml')), 'reps.splice(2, 0, _agrTrusteeRepresentation(job))', 'the estate form reads it');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // E7 · THE VENDOR PICKUP LIST
  // ═══════════════════════════════════════════════════════════════════════════
  const LINE = (id, n, o) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 1, itemNo: n, status: 'uploaded', qty: 1,
    objectName: 'Line ' + n, category: 'Furniture', ts: 100 + n, updatedAt: 100 + n }, o || {});
  const TRUSTJ = (o) => Object.assign({ id: 7, name: 'Walter Ellsworth', hvlId: 'HVL-0007', svc: 'cleanout', matterType: 'trust', docTier: 'values',
    executor: 'Ruth Adler', deathDate: '2026-04-02', won: true, status: 'active', tc: 'Ashley Jerome', updatedAt: 1, signedRecords: [], at: {} }, o || {});
  const LIVINGJ = (o) => Object.assign({ id: 2, name: 'Margaret Ellsworth', hvlId: 'HVL-0002', svc: 'downsizing', won: true, status: 'active',
    tc: 'Ashley Jerome', updatedAt: 1, signedRecords: [], at: {} }, o || {});
  function pick(job, lines) {
    const log = { badges: [], syncs: 0, saves: 0, repaint: 0 };
    const doc = domStub({});
    const c = lift(['pickupGroups', 'invRecordedGone', 'invGoneText', 'pickupRecordCustody', 'pickupVoidCustody', 'voidSignedRecord',
      '_renderInvReleasesCard', 'openPickupDialog', 'pickupFileFromDialog', 'invPickupRecord', '_renderInvRow', 'jobListPut'], {
      jobs: [job], _photoRefs: { [job.id]: lines }, estimateStore: {}, contractors: [], vendorDirectory: [{ vendor_name: "Sotheby's  Palm Beach" }],
      showSyncBadge(m, e) { log.badges.push(String(m)); }, _scheduleInventorySync() { log.syncs++; }, savePhotoRefs() { log.saves++; },
      saveJobs() {}, syncJobToSheets() {}, _signedCopyRepaint() { log.repaint++; }, document: doc, jobPlanStore: {}, changeOrders: [],
      _invThumbHTML() { return ''; }, _invPrintThumb() { return ''; }, _invPick: {}, _invOpen: {}, _agDupSet: {}, Date: FixedDate(NOW), setTimeout: () => 0, clearTimeout() {},
      fileSignedCopy(jobId, kind, meta, file, cb) {
        log.filed = { jobId, kind, meta, file };
        const rec = c.jobListPut(job, 'signedRecords', { id: 'sr' + (job.signedRecords.length + 1), kind, ref: meta.ref, stableIds: meta.stableIds,
          label: meta.label, signedBy: meta.signedBy, signedOn: meta.signedOn, fileUrl: 'https://drive/p', filedAt: NOW });
        cb(true, 'Vendor pickup list filed to Drive.', rec);
        return true;
      } });
    c.window.prompt = () => 'filed against the wrong vendor';
    c.__log = log; c.__doc = doc;
    return c;
  }

  G('E7 · the pickup list: grouped by the vendor\'s channel, pre-ticked, filed, gone, and custody closed where it is kept', () => {
    const lines = [LINE('a', 1, { disposition: 'Auction', channel: "Sotheby's Palm Beach" }), LINE('b', 2, { disposition: 'Consign', channel: "  sotheby's   palm beach " }),
      LINE('c', 3, { disposition: 'Sell', channel: 'Jane Buyer' }), LINE('d', 4, { disposition: 'Donate', channel: 'Goodwill' }),
      LINE('e', 5, { disposition: 'Auction', channel: '' }), LINE('f', 6, { disposition: 'Auction', channel: "Sotheby's Palm Beach", deletedAt: 9 })];
    const job = TRUSTJ();
    const c = pick(job, lines);
    const g = c.pickupGroups(job, lines);
    eq(g.map((x) => [x.vendor, x.lines.map((r) => r.stableId)]), [["Sotheby's Palm Beach", ['a', 'b']], ['Jane Buyer', ['c']]],
      '⚠⚠ a selling line with a vendor named, matched case- and space-insensitively; a donation, a blank channel and a removed line are not');
    eq(c.invRecordedGone(lines[0], job), false, 'fixture: not gone before the list');
    // The dialog: pre-ticked, untick one, choose the photo.
    ok(c.openPickupDialog(7, g[0].key), 'the dialog opens');
    const body = c.__doc.getElementById('ip-body').innerHTML;
    eq((body.match(/ip-tick[^>]*checked/g) || []).length, 2, '⚠⚠ every live line on that channel pre-ticked');
    const ticks = [{ checked: true, getAttribute: () => 'a' }, { checked: false, getAttribute: () => 'b' }];
    c.document.querySelectorAll = () => ticks;
    const input = { files: [{ name: 'sheet.jpg', type: 'image/jpeg', size: 1000 }], value: 'x' };
    inEastern(() => c.pickupFileFromDialog(input));
    eq([c.__log.filed.kind, c.__log.filed.meta.ref, c.__log.filed.meta.stableIds], ['pickup', "Sotheby's Palm Beach", ['a']], '⚠⚠ filed as a pickup list, ref the vendor, the lines ticked');
    eq(c.invRecordedGone(lines[0], job), true, '⚠⚠ a line on the list counts as gone');
    eq(c.invRecordedGone(lines[1], job), false, 'the unticked line does not');
    eq(c.invGoneText(lines[0], job), "Released Oct 6, 2026 to Sotheby's Palm Beach", 'and says how it went (the custody event it wrote)');
    const ev = (lines[0].custodyLog || []).filter((e) => !e.deletedAt);
    eq(ev.map((e) => [e.action, e.party, e.method, e.date]), [['Released', "Sotheby's Palm Beach", 'Vendor pickup', '2026-10-06']],
      '⚠⚠ a trust keeps custody: a Released event to the vendor');
    ok(c.__log.syncs >= 1 && c.__log.saves >= 1, 'saved and synced');
    has(c.__log.badges.join(' '), '1 line recorded as picked up, each with a Released custody event', 'the notice says what it did');
    // The card and the row.
    const card = text(c._renderInvReleasesCard(job, lines.filter((r) => !r.deletedAt)));
    has(card, "Vendor pickups Sotheby's Palm Beach · 2 lines (#1, #2) · ✓ on a pickup list: #1 · not on one: #2", '⚠⚠ the card names what the list covers and what it does not');
    has(card, 'File another pickup list', 'and offers the next sheet');
    has(card, 'Jane Buyer · 1 line (#3) File pickup list', 'a vendor with nothing filed: one press');
    has(text(c._renderInvRow(job, lines[0], {})), "✓ picked up by Sotheby's Palm Beach", '⚠⚠ the row\'s status says so');
    lacks(text(c._renderInvRow(job, lines[1], {})), 'picked up by', 'and only on the lines it covers');
    // Void: the list and its custody events come off.
    c.voidSignedRecord(7, 'sr1');
    eq(c.invRecordedGone(lines[0], job), false, 'voided: no longer gone');
    eq((lines[0].custodyLog || []).filter((e) => !e.deletedAt).length, 0, '⚠⚠ and its Released event is tombstoned');
  });

  G('E7 · on living work: filed and gone, with no custody event where none is kept', () => {
    const lines = [LINE('a', 1, { disposition: 'Sell', channel: 'Kaminski Auctions' })];
    const job = LIVINGJ();
    const c = pick(job, lines);
    eq(c.pickupGroups(job, lines).length, 1, 'a living client\'s vendor is offered too');
    ok(c.openPickupDialog(2, 'kaminski auctions'), 'the dialog opens');
    c.document.querySelectorAll = () => [{ checked: true, getAttribute: () => 'a' }];
    inEastern(() => c.pickupFileFromDialog({ files: [{ name: 's.pdf', type: 'application/pdf', size: 10 }] }));
    eq(c.invRecordedGone(lines[0], job), true, '⚠⚠ gone');
    eq(c.invGoneText(lines[0], job), 'Released: Kaminski Auctions’s pickup list is on file', 'and says how: the pickup list on file');
    eq((lines[0].custodyLog || []).length, 0, 'no chain of custody is kept here, so no event');
    // Nothing ticked: refused by name, nothing filed.
    const c2 = pick(LIVINGJ(), [LINE('a', 1, { disposition: 'Sell', channel: 'Kaminski Auctions' })]);
    c2.openPickupDialog(2, 'Kaminski Auctions');
    c2.document.querySelectorAll = () => [{ checked: false, getAttribute: () => 'a' }];
    eq(c2.pickupFileFromDialog({ files: [{ name: 's.pdf', type: 'application/pdf', size: 10 }] }), false, 'nothing ticked: not filed');
    has(c2.__doc.getElementById('ip-fb').innerHTML, 'Tick the lines the pickup sheet lists.', 'and says so');
    eq(c2.__log.filed, undefined, 'nothing reached Drive');
  });

  G('E7 · one rule: the kind is registered, custody asks custodyLogKept, and renderJobPlan reads the same answer', () => {
    has(noComments(decl('SIGNED_RECORD_KINDS')), "pickup:    { label: 'Vendor pickup list' }", 'the kind');
    has(noComments(fn('renderJobPlan')), 'var custodyMandatory = custodyLogKept(job, est);', 'the plan\'s banner and the pickup ask one question');
    eq(readers('custodyLogKept'), ['pickupRecordCustody', 'renderJobPlan'], 'its readers');
    // Driven: each arm on its own (the 706 answered no, so the documentation level is not formal by default).
    const K = lift(['custodyLogKept'], {});
    const plain = { svc: 'cleanout', docTier: 'contents', gate706: 'no', deathDate: '2026-01-01' };
    eq(K.custodyLogKept(Object.assign({}, plain, { matterType: 'neither' }), null), false, 'fixture: an Estate Settlement on Neither keeps none');
    eq(K.custodyLogKept(Object.assign({}, plain, { matterType: 'trust' }), null), true, '⚠⚠ the trust track keeps custody');
    eq(K.custodyLogKept(Object.assign({}, plain, { matterType: 'probate' }), null), true, 'the probate track keeps custody');
    eq(K.custodyLogKept(Object.assign({}, plain, { svc: 'probate', matterType: 'neither' }), null), true, 'a probate service keeps custody');
    eq(K.custodyLogKept({ svc: 'downsizing' }, null), false, 'living work keeps none');
    has(noComments(fn('invRecordedGone')), 'invPickupRecord(ref, job)', 'gone reads the pickup list');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // E8 · DOCUSIGN NEVER SENDS THE ATTORNEY THE CLIENT'S LINE
  // ═══════════════════════════════════════════════════════════════════════════
  G('E8 · an estate with no representative email: the envelope is refused by name, before and at the send', () => {
    const c = lift(['esignClientSignerRefusal', 'clientRecipient'], {});
    const est = (o) => Object.assign({ id: 9, svc: 'cleanout', name: 'Estate of Hale', executor: 'Rex Hale', executorEmail: '',
      probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law' }, o || {});
    eq(c.esignClientSignerRefusal(est()), 'Add the representative’s email: the estate attorney can’t sign as the client.', '⚠⚠ refused by name');
    eq(c.esignClientSignerRefusal(est({ executorEmail: 'rex@hale.example' })), '', 'the representative\'s email recorded: it goes');
    eq(c.esignClientSignerRefusal({ id: 2, svc: 'downsizing', name: 'Living', email: 'l@x.example' }), '', 'a living client signs for themselves');
    has(noComments(fn('docSend')), 'DOC_SEND_PROVIDERS[provider].refuse(spec)', 'the send asks the provider before anything is built');
    const prov = noComments(decl('DOC_SEND_PROVIDERS'));
    has(prov, 'refuse: function (spec) { return esignClientSignerRefusal(spec.job) || esignCoSigners(spec.job, spec.anchors).why; }', '⚠⚠ DocuSign\'s refusal asks it first');
    has(prov, 'var _asClient = esignClientSignerRefusal(spec.job);', '⚠ and asked again where the envelope is made');
    ok(!ALL_FNS.has('esignCounselSignsNote'), 'group B\'s amber note is gone');
    lacks(noComments(SRC), 'esignCounselSignsNote(', 'and nothing reads it');
    // Driven: the provider's refuse and send.
    const S = sandbox({ fns: closure(['esignClientSignerRefusal', 'esignCoSigners', 'esignSigner']).fns, vars: ['DOC_SEND_PROVIDERS'].concat(closure(['esignCoSigners']).vars),
      stubs: { SHEETS_SYNC_URL: 'https://x/exec', _appsScriptPost() { S.__posted = true; } } });
    const spec = { job: est(), anchors: [], names: { attachment: 'a.pdf' }, cfg: { subject: () => 's' } };
    eq(S.DOC_SEND_PROVIDERS.docusign.refuse(spec), 'Add the representative’s email: the estate attorney can’t sign as the client.', '⚠⚠ the provider refuses');
    let said = null;
    S.DOC_SEND_PROVIDERS.docusign.send(spec, 'PDF', (okk, why) => { said = [okk, why]; });
    eq(said, [false, 'Add the representative’s email: the estate attorney can’t sign as the client'], '⚠⚠ and its send refuses again, posting nothing');
    ok(!S.__posted, 'nothing posted');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // E9 · NO ESTATE STAFF CAUTION
  // ═══════════════════════════════════════════════════════════════════════════
  G('E9 · the estate staff caution is gone; the living caution and the estate refusal stay', () => {
    lacks(SRC, 'staffEstate', 'no staffEstate anywhere in the app');
    ok(!ALL_FNS.has('_invStaffCaution'), 'nor its reader');
    has(noComments(decl('INV_RELEASE_CAUTIONS')), "key: 'staffRecipient'", 'the living caution stays');
    has(noComments(fn('_invEdit')), 'invStaffRefused(', 'and the estate refusal at the write');
    lacks(require('fs').readFileSync(require('path').join(__dirname, '..', 'COUNSEL_REVIEW_BUNDLE.md'), 'utf8'), '### D13. An estate line already recorded', 'D13 is out of the counsel bundle');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // E10 · FOUND IN PASSING BY GROUP A
  // ═══════════════════════════════════════════════════════════════════════════
  G('E10 · the service note on an unsaved build, and the Deposit Retained card on an unknown settlement', () => {
    const doc = domStub({ 'e-svc': 'downsizing' });
    const c = lift(['paintEstimateService'], { document: doc, estimateStore: {} });
    c.paintEstimateService('downsizing_move', { id: 4, svc: 'downsizing_move' }, 'downsizing');
    const unsaved = text(doc.getElementById('e-svc-note').innerHTML);
    has(unsaved, 'This build was priced as Home Editing; the job is now Home Transition, so it is repriced as that. Re-check the scope before saving.', '⚠⚠ an unsaved build says the build is repriced');
    lacks(unsaved, 'this estimate has been repriced', 'never "this estimate" with none saved');
    c.estimateStore = { 4: { estimate: { svc: 'downsizing' } } };
    c.paintEstimateService('downsizing_move', { id: 4, svc: 'downsizing_move' }, 'downsizing');
    has(text(doc.getElementById('e-svc-note').innerHTML), 'Priced as Home Editing; the job is now Home Transition and this estimate has been repriced.', 'a saved estimate keeps its sentence');
    // The card.
    const job = { id: 6, name: 'Gone', svc: 'downsizing', status: 'closed_retained', docState: {},
      payments: [{ id: 1, uid: 'p1', stage: 'deposit', amount: 6000, method: 'wire', receivedOn: '2026-09-01', clearedOn: '2026-09-01' }] };
    const w = lift(['walkawaySettlementHtml'], { jobs: [job], estimateStore: {}, jobLogs: {}, changeOrders: [], jobPlanStore: {}, document: domStub({}) });
    const h = text(w.walkawaySettlementHtml(job));
    has(h, 'Walkaway settlement What this job has earned, and any refund due, cannot be worked out until its estimate loads on this device.', '⚠⚠ an unknown settlement says what it waits on');
    lacks(h, 'Record refund', 'and offers no refund');
    w.estimateStore = { 6: { estimate: { jobId: 6, svc: 'downsizing', havellinTotal: 12000 } } };
    has(text(w.walkawaySettlementHtml(job)), 'until its hours log loads on this device', 'the hours log unread: named');
  });
};
