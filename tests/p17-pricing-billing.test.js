'use strict';
// ────────────────────────────────────────────────────────────────────────────────────────────────
// ⚠⚠ P17 · PRICING AND BILLING (workstream W1) — Anthony's answers of 2026-10-01.
//
//   1   Premium Estate is the higher billing rates only ($185 / $125). Its flat 25 concierge hours of "specialty
//       coordination" are gone (labourPools), and with them P16's rule that an appraiser line books no hours on a
//       Premium estate (premiumCoversLine, and the Premium flag every sum of line hours was handed). Every vendor
//       line books its own touches on every job. Anthony's counts move two: Online Auction House 12 touches (6.0
//       hours, the most of any category: Havellin lists and disposes) and Estate Sale Company 3 (1.5 hours: the
//       company runs the sale). A line saved with its hours keeps them.
//   5   The 30% fee on the home preparation vendors is the "Home Sale Preparation Fee" wherever a client or a screen
//       reads it. It was "GC / Site Management Fee", "site management fee", "management fee" and "GC fee".
//   6   Quarter hours and cents. The engine bills the nearest quarter hour, never rounding up (day counts still
//       round up). Every hours box steps by 0.25 and every handler that writes hours refuses anything else; an
//       older entry that is not a quarter is shown and billed as logged. ⚠ RESTATED 2026-10-02 (P18, Anthony's answer B):
//       estimates round UP to whole hours again (roundUpHours), the log and recorded coordination take half hours
//       (isHalfHours), a change order whole hours (isWholeHours), and the declutter box is flagged, not refused; the
//       item-6 groups below are restated to those rules and their figures re-measured. Money is carried to the cent by one helper
//       (roundCents: half away from zero, read at fifteen significant digits so 1.005 is 1.01) and printed by one
//       formatter (fmt: "$900", "$971.25"). Every client document adds up to the cent, and the Stripe link asks
//       for exactly the invoice's outstanding figure.
//   10  Typing a room's volume as 5 no longer sets its complexity to 5.
//
// Everything that can be driven is: the real engine through driveCalcAll, the real documents through the
// reconciliation suite's own lift list, the real handlers in a sandbox. The figures pinned below are the ones
// the P17 hand-back reports, measured here.
// ────────────────────────────────────────────────────────────────────────────────────────────────

const { sandbox, source, fn, domStub, driveCalcAll } = require('./harness');
const DOCREC = require('./document-reconciliation.test.js');

const ENT = { '&amp;': '&', '&nbsp;': ' ', '&times;': '×', '&mdash;': '—', '&ndash;': '–', '&rsquo;': '’', '&#39;': "'",
              '&quot;': '"', '&lt;': '<', '&gt;': '>', '&minus;': '−', '&sect;': '§', '&middot;': '·', '&#8627;': '↳' };
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, (m) => (ENT[m] !== undefined ? ENT[m] : m))
  .replace(/\s+/g, ' ').trim();
const noComments = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }
const C = (n) => Math.round(Number(n) * 100);            // whole cents, for sums and comparisons
const CENTS = (s) => [...String(s).matchAll(/\$([\d,]+(?:\.\d\d)?)(?!\.\d)(?![\d,])/g)].map((m) => parseFloat(m[1].replace(/,/g, '')));

const SRC = source();
const LIVE = noComments(SRC);
// Which function a source index sits in, for counting the readers of a helper.
const FN_STARTS = [...LIVE.matchAll(/(^|\n)function ([A-Za-z0-9_$]+)\s*\(/g)].map((m) => ({ at: m.index, name: m[2] }));
function enclosing(idx) {
  let lo = 0, hi = FN_STARTS.length - 1, ans = '(top)';
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (FN_STARTS[mid].at <= idx) { ans = FN_STARTS[mid].name; lo = mid + 1; } else hi = mid - 1; }
  return ans;
}
function readers(name) {
  const out = {};
  for (const m of LIVE.matchAll(new RegExp('(?<![\\w.$])' + name + '\\(', 'g'))) {
    if (LIVE.slice(Math.max(0, m.index - 9), m.index) === 'function ') continue;   // the definition
    const f = enclosing(m.index);
    out[f] = (out[f] || 0) + 1;
  }
  const sorted = {};
  Object.keys(out).sort().forEach((k) => { sorted[k] = out[k]; });
  return sorted;
}
const total = (o) => Object.keys(o).reduce((a, k) => a + o[k], 0);

// Seven rooms at their defaults on a 3,500 sq ft house: the estate this hand-back measures.
const BASE = ['Living Room', 'Kitchen', 'Dining Room', 'Family Room / Great Room', 'Primary Suite', 'Bedroom 2', 'Bedroom 3'];
function run(svc, opts) {
  const o = opts || {};
  const seed = Object.assign({ 'e-prem': !!o.prem }, o.seed || {});
  const r = driveCalcAll({ svc, sqft: 3500, rooms: o.rooms || BASE, seed, fns: o.fns || [] });
  if (o.lines) {
    r.ctx.vendors = o.lines.map((l, i) => Object.assign({ lid: 'v' + i, cost: 1500 }, l,
      typeof l.tcHrs === 'number' ? {} : { tcHrs: r.ctx.vendorLineTCHrs(l.type) }));
    r.ctx.calcAll();
  }
  return r;
}
const E = (r) => (r && r.ctx && r.ctx.currentEstimate) || {};

// The documents, through the reconciliation suite's own lift list (its FNS / VARS), plus the Stripe link.
// (The reconciliation fixtures carry no rooms; an estimate the real engine priced does, so its plan section's grouping is lifted too.)
const DOC_FNS = DOCREC.FNS.concat(['stripePaymentLink', '_stripeShowLink', 'docState', 'paymentStageLabel', 'estimateHavellinLines', '_ceGroupedSpaces']);
const DOC_VARS = DOCREC.VARS.concat(['PAYMENT_STAGE_LABELS']);
function docs(est, job, logs, extraStubs) {
  const posts = [], notices = [];
  const ctx = sandbox({ fns: DOC_FNS, vars: DOC_VARS, stubs: Object.assign({
    jobs: [job], jobLogs: { [job.id]: logs || [] }, changeOrders: [], contractors: [], currentEstimate: null,
    estimateStore: { [job.id]: { estimate: Object.assign({}, est, { jobId: job.id }), approved: true, approvedBy: 'Anthony Graziano' } },
    currentInvStage: 'final', vendorDirectory: [], jobPlans: {}, _photoRefs: {}, document: domStub({}),
    SHEETS_SYNC_URL: 'https://script.example/exec', ensureAgreementApproved: () => '',
    _appsScriptPost: (url, body) => posts.push(body), _docNotice: (kind, msg) => notices.push({ kind, msg }),
    _jobTouch() {}, saveJobs() {}, syncJobToSheets() {} }, extraStubs || {}) });
  ctx.__posts = posts; ctx.__notices = notices;
  return ctx;
}
// Every document for one job, the three invoices walked in order and each paid in full as it is issued.
function walk(est, job, logs) {
  const c = docs(est, job, logs);
  const e = Object.assign({}, est, { jobId: job.id });
  const out = { c, estimate: attempt(() => c.clientEstimateHtml(e, job)),
                agreement: attempt(() => (c.isDecedentJob(job) ? c.probateAgreementHtml(job, e) : c.agreementHtml(job, e))), inv: {} };
  let pays = [];
  ['deposit', 'midpoint', 'final'].forEach((st, i) => {
    c.jobs[0].payments = pays;
    const d = attempt(() => c.invoiceHtml(c.jobs[0], st));
    out.inv[st] = d.ok ? d.val : { html: 'THREW ' + d.err, amtDue: NaN };
    const a = out.inv[st].amtDue;
    if (a > 0) pays = pays.concat([{ uid: 'p' + i, stage: st, amount: a, method: 'wire', receivedOn: '2026-09-0' + (i + 1), clearedOn: '2026-09-0' + (i + 1) }]);
  });
  return out;
}
const html = (a) => (a && a.ok ? a.val : 'THREW ' + (a && a.err));

module.exports = function ({ group, ok, eq, has, lacks }) {
  ok(LIVE.length > SRC.length * 0.5, 'fixture: the comment-stripped source is still most of the file (' + LIVE.length + ' of ' + SRC.length + ')');

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ 1 · Premium Estate is the higher rates only: the same hours as a standard estate, on every labour service');
  {
    ['downsizing', 'home_cleanout', 'cleanout', 'probate', 'contested_probate'].forEach((svc) => {
      const s = attempt(() => E(run(svc))), p = attempt(() => E(run(svc, { prem: true })));
      ok(s.ok && p.ok, svc + ': both estimates price through the real engine' + (s.ok && p.ok ? '' : ' — ' + (s.err || p.err)));
      const S = s.ok ? s.val : {}, P = p.ok ? p.val : {};
      eq([P.totTC, P.totPS], [S.totTC, S.totPS],
         '⚠⚠ ' + svc + ': Premium adds no hours (' + S.totTC + ' TC / ' + S.totPS + ' PS either way); it added 25 concierge hours until P17');
      eq([P.tcRate, P.psRate, S.tcRate, S.psRate], [185, 125, 150, 100], svc + ': it changes the rates, $185 / $125 against $150 / $100');
      eq(C(P.havellinTotal), C(P.totTC * 185) + C(P.totPS * 125), svc + ': and the total is those hours at those rates, to the cent');
    });
    // The figures the hand-back reports, measured on the estate this project always prices.
    const ES = E(run('cleanout', { prem: true })), ES0 = E(run('cleanout'));
    // RESTATED 2026-10-02 (P18, Anthony's answer B: estimates in whole hours, rounded up), re-measured through the real engine: 60 / 90 hours and $22,350
    // (P17's quarter hours read 59 / 89.25 and $22,071.25), and the standard rates $18,000 again (P17 $17,775).
    eq([ES.totTC, ES.totPS, ES.havellinTotal], [60, 90, 22350],
       'measured: a Premium Estate Settlement bills 60 TC and 90 PS hours, $22,350 (85 TC / 90 PS and $26,975 before P17)');
    eq(ES0.havellinTotal, 18000, 'and the same house at the standard rates $18,000 (whole hours, rounded up, as before P17)');
    // labourPools itself no longer reads the flag: driven with it on and off, the pools are the same.
    const LP = sandbox({ fns: ['labourPools'] });
    const eng = { totTC: 40.3, totPS: 70.6 };
    const k = { colHrs: { tc: 2, onsite: 1, ps: 3 }, heirs: true, access: true, vendorTCHrs: 6, destTC: 0, prepTCHrs: 0 };
    eq(JSON.stringify(LP.labourPools(eng, Object.assign({ prem: true }, k))), JSON.stringify(LP.labourPools(eng, Object.assign({ prem: false }, k))),
       '⚠⚠ labourPools prices a Premium estate\'s pools exactly as a standard one\'s');
    lacks(noComments(fn('labourPools')), 'k.prem', 'and never reads k.prem');
    lacks(LIVE, 'premiumSpecialtyTC', 'the 25 hours are gone from the live code');
    lacks(LIVE, 'premiumCoversLine', 'and so is P16\'s rule that Premium covered an appraiser line\'s hours');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ 1 · a vendor line books its own hours on a Premium estate, as on any other — measured through calcAll');
  {
    const ES = E(run('cleanout', { prem: true }));
    const AP = E(run('cleanout', { prem: true, lines: [{ type: 'Art Appraiser' }] }));
    const OA = E(run('cleanout', { prem: true, lines: [{ type: 'Online Auction House' }] }));
    const AH = E(run('cleanout', { prem: true, lines: [{ type: 'Auction House' }] }));
    eq([AP.vendorTCHrs, AP.totTC - ES.totTC, C(AP.havellinTotal) - C(ES.havellinTotal)], [2, 2, 37000],
       '⚠⚠ an appraiser books its 2.0 hours at $185: +$370 (P16 booked none on a Premium estate)');
    eq([OA.vendorTCHrs, OA.totTC - ES.totTC, C(OA.havellinTotal) - C(ES.havellinTotal)], [6, 6, 111000],
       '⚠⚠ an online auction house books 6.0 hours (12 touches): +$1,110');
    eq([AH.vendorTCHrs, AH.totTC - ES.totTC, C(AH.havellinTotal) - C(ES.havellinTotal)], [3, 3, 55500],
       'an auction house books its 3.0 hours (6 touches, unchanged): +$555');
    // RESTATED 2026-10-02 (P18, Anthony's answer B: estimates in whole hours, rounded up), re-measured through the real engine (P17: $22,441.25, $23,181.25, $22,626.25).
    eq([AP.havellinTotal, OA.havellinTotal, AH.havellinTotal], [22720, 23460, 22905],
       'measured: $22,720 with the appraiser, $23,460 with the online auction, $22,905 with the auction house');
    // An estate sale company on a living client's cleanout: a call and the follow-up.
    const L0 = E(run('home_cleanout')), L1 = E(run('home_cleanout', { lines: [{ type: 'Estate Sale Company', cost: 3000 }] }));
    // RESTATED 2026-10-02 (P18, Anthony's answer B: estimates in whole hours, rounded up), re-measured through the real engine: the line books its 1.5 hours, and the
    // billed concierge hours, rounded up to the whole hour, rise from 41 to 42 (+$150); on P17's quarters they rose 1.5 (+$225).
    eq([L1.vendorTCHrs, L1.totTC - L0.totTC, C(L1.havellinTotal) - C(L0.havellinTotal)], [1.5, 1, 15000],
       '⚠⚠ an estate sale company books 1.5 hours (3 touches; it was 8, 4.0 hours): the billed whole hours rise 41 → 42, +$150 at $150');
    eq([L0.havellinTotal, L1.havellinTotal], [12250, 12400], 'measured: $12,250 without it, $12,400 with it (P17 $12,012.50 and $12,237.50; P16 $12,250 and $12,850)');
    // A Premium Probate and its appraiser.
    const PP0 = E(run('probate', { prem: true })), PP1 = E(run('probate', { prem: true, lines: [{ type: 'Art Appraiser' }] }));
    // RESTATED 2026-10-02 (P18, Anthony's answer B: estimates in whole hours, rounded up), re-measured through the real engine (P17: $25,825 and $26,195).
    eq([PP0.havellinTotal, PP1.havellinTotal], [26135, 26505], 'measured: a Premium Probate $26,135, and $26,505 with an appraiser (+$370)');
    // On the screen: the concierge fee's breakdown names the vendor coordination and no Premium hours.
    const r = run('cleanout', { prem: true, lines: [{ type: 'Online Auction House' }] });
    const label = text(r.doc.getElementById('tc-fee-label').innerHTML);
    has(label, 'Third-party vendor coordination', 'the concierge fee\'s breakdown names the line\'s coordination');
    lacks(label, 'Premium specialty', '⚠ and no Premium specialty coordination');
    has(label, '(66.0 hrs × $185)', 'at the Premium rate (65.0 on P17\'s quarter hours; ' + 'RESTATED 2026-10-02, P18)');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ 1 · the touch counts: an online auction carries the most, an estate sale company a call and its follow-up');
  {
    const DIR = ['Art Appraiser', 'Estate Sale Company', 'Online Auction House', 'Auction House']
      .map((c, i) => ({ vendor_name: 'V' + i, category_group: 'Asset Liquidation & Valuation', category: c, status: 'Active' }));
    const T = sandbox({ fns: ['vendorLineTCHrs', 'coordHrsFor', 'coordTouches', 'vendorGroupOfLine', 'vendorGroupCategories',
                              'directoryCategories', 'vendorCats'],
      vars: ['COORD_TOUCHES', 'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES_DEFAULT', 'TOUCH_HRS', 'VENDOR_GROUP_CARDS', 'LOGISTICS_CATEGORIES'],
      stubs: { vendorDirectory: DIR } });
    eq([T.COORD_TOUCHES['Online Auction House'], T.COORD_TOUCHES['Estate Sale Company'], T.COORD_TOUCHES['Auction House']], [12, 3, 6],
       '⚠⚠ Anthony\'s counts: Online Auction House 12 (was 4), Estate Sale Company 3 (was 8), Auction House 6');
    eq(['Online Auction House', 'Estate Sale Company', 'Auction House', 'Art Appraiser'].map((c) => T.vendorLineTCHrs(c)), [6, 1.5, 3, 2],
       'as hours: 6.0, 1.5, 3.0, and an appraiser 2.0 (its group\'s 4 touches, unchanged)');
    const counts = Object.keys(T.COORD_TOUCHES).map((k) => T.COORD_TOUCHES[k]);
    eq(Object.keys(T.COORD_TOUCHES).filter((k) => T.COORD_TOUCHES[k] === Math.max.apply(null, counts)), ['Online Auction House'],
       'the online auction carries the most of any category');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠ 1 · a line saved with its hours keeps them, whatever the touch table says now');
  {
    const r = run('cleanout', { lines: [{ type: 'Online Auction House', cost: 2000, tcHrs: 2 }, { type: 'Estate Sale Company', cost: 3000, tcHrs: 4 }],
                                fns: ['pinVendorLineHours', 'vendorDirectoryReady'] });
    eq(E(r).vendorTCHrs, 6, '⚠⚠ a saved estimate\'s lines book the hours they were quoted at, 2.0 + 4.0 (today\'s counts would be 6.0 + 1.5)');
    r.ctx.vendorDirectory = [{ vendor_name: 'A', category_group: 'Asset Liquidation & Valuation', category: 'Online Auction House', status: 'Active' }];
    const lines = [{ type: 'Online Auction House', tcHrs: 2 }, { type: 'Estate Sale Company', tcHrs: 4 }];
    r.ctx.pinVendorLineHours(lines, 6);
    eq(lines.map((l) => l.tcHrs), [2, 4], 'reopening it with the directory loaded leaves both lines at their recorded hours');
    eq(r.ctx.vendorLineHrs({ type: 'Online Auction House' }), 6, 'a line added now books today\'s 6.0');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('1 · every Premium text says rates only');
  {
    const prem = SRC.slice(SRC.indexOf('<div class="toggle-title">Premium estate?</div>'), SRC.indexOf('<div class="toggle-title">Premium estate?</div>') + 600);
    has(prem, '$185 TC / $125 PS rates only. Coordination comes from the vendor lines you add, as on every job.', 'the Premium toggle says rates only');
    lacks(prem, '25 concierge hours', 'and no longer promises the 25 hours');
    has(SRC, '<td class="muted" style="padding-left:16px;">&#8627; Multiple-heir coordination</td>', 'the summary row is the heirs\' coordination alone');
    lacks(LIVE.toLowerCase(), 'premium specialty coordination', 'no live text names Premium specialty coordination');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ 5 · the Home Sale Preparation Fee, by name, on every document a client reads');
  {
    const OLD = /site management|GC fee|GC \/|Havellin Management Fee|(?<!Service )management fee/i;
    // Standalone Home Prep: a $20,000 painter and 5.5 declutter hours, priced by the real engine.
    const pb = attempt(() => { const d = driveCalcAll({ svc: 'prep', sqft: 3500, rooms: [], seed: { 'e-declutter-hrs': '5.5' } });
      d.ctx.prepItems.push({ type: 'Painting', cost: 20000, note: '', lid: 'p1' }); d.ctx.calcAll(); return d.ctx.currentEstimate; });
    ok(pb.ok, 'fixture: the Home Prep estimate prices' + (pb.ok ? '' : ' — ' + pb.err));
    const PREP = pb.ok ? pb.val : {};
    const PJOB = { id: 3, hvlId: 'HVL-0031', name: 'Marston', svc: 'prep', addr: '1 Ocean Blvd', tc: 'Anthony Graziano', status: 'active',
                   won: true, email: 'm@example.com', payments: [] };
    const w = walk(PREP, PJOB, [{ date: '2026-09-02', activity: 'declutter', members: [{ name: 'Ashley Jerome', role: 'TC', hours: 5.5 }] }]);
    const pages = { estimate: html(w.estimate), agreement: html(w.agreement), deposit: w.inv.deposit.html, midpoint: w.inv.midpoint.html, final: w.inv.final.html };
    Object.keys(pages).forEach((k) => {
      has(text(pages[k]), 'Home Sale Preparation Fee', '⚠⚠ Home Prep ' + k + ': names the Home Sale Preparation Fee');
      const hit = OLD.exec(text(pages[k]));
      eq(hit ? hit[0] : null, null, '⚠⚠ Home Prep ' + k + ': and no older name for it');
    });
    has(text(pages.final), 'Services total (Home Sale Preparation Fee on actual vendor spend + logged concierge hours)',
        '⚠ the Home Prep final heads its total in the fee\'s name (Anthony\'s wording, P14, renamed)');
    // A fee-only Home Prep job (no declutter hours): its final, and the fee-only arm of the agreement.
    const fb = attempt(() => { const d = driveCalcAll({ svc: 'prep', sqft: 3500, rooms: [] });
      d.ctx.prepItems.push({ type: 'Staging', cost: 10000, note: '', lid: 'p2' }); d.ctx.calcAll(); return d.ctx.currentEstimate; });
    const w0 = walk(fb.ok ? fb.val : {}, Object.assign({}, PJOB), []);
    has(text(w0.inv.final.html), 'Services total (Home Sale Preparation Fee on actual vendor spend)', 'and drops the hours when none are logged');
    const OLD0 = OLD.exec(text(w0.inv.final.html) + ' ' + text(html(w0.agreement)) + ' ' + text(html(w0.estimate)));
    eq(OLD0 ? OLD0[0] : null, null, 'the fee-only job\'s estimate, agreement and final carry no older name either');
    // The agreement's clauses that name it (legal text: counsel bundle).
    const agr = text(pages.agreement);
    has(agr, '3.5 Home Sale Preparation Fee.', '§3.5 is headed with the fee\'s name (it read "Management Fee")');
    has(agr, 'Contractor\'s fee for the Services is a Home Sale Preparation Fee equal to thirty percent (30%)', '§1.2 names it');
    has(agr, '3.3 Basis of Fee. Contractor is paid on two bases for this engagement. First, the Home Sale Preparation Fee stated in Section 1.2 and Section 3.5',
        '§3.3\'s two bases name it first');
    // RESTATED 2026-10-02 (P18, Anthony's answer B): a typed 5.5 is priced and saved as 6, so §3.3 provides for 6.0 hours ($900).
    has(agr, 'the Estimate provides for 6.0 hours ( $900 ) on that basis', 'and quote the declutter hours, 5.5 typed and saved as 6, at $900');
    has(text(html(w0.agreement)), 'billed as worked at Contractor\'s Transition Concierge rate of $150/hour , in addition to the Home Sale Preparation Fee',
        'the fee-only §3.3 bills later hours on top of it, by name');

    // A labour job whose estimate bundles prep: an $8,001 painter, whose fee carries cents.
    const lb = attempt(() => { const d = driveCalcAll({ svc: 'downsizing', sqft: 3500, rooms: BASE });
      d.ctx.prepItems.push({ type: 'Painting', cost: 8001, note: '', lid: 'b1' }); d.ctx.calcAll(); return d.ctx.currentEstimate; });
    ok(lb.ok, 'fixture: the bundled estimate prices' + (lb.ok ? '' : ' — ' + lb.err));
    const LAB = lb.ok ? lb.val : {};
    eq(LAB.prepFee, 2400.3, 'fixture: 30% of $8,001 is $2,400.30, to the cent');
    const LJOB = { id: 4, hvlId: 'HVL-0041', name: 'Harper', svc: 'downsizing', addr: '12 Ocean Blvd', tc: 'Anthony Graziano', status: 'active',
                   won: true, email: 'h@example.com', payments: [] };
    const lw = walk(LAB, LJOB, [{ date: '2026-09-02', activity: 'work', members: [{ name: 'Anthony Graziano', role: 'TC', hours: LAB.totTC },
      { name: 'Specialist 1', role: 'PS', hours: LAB.totPS }] }]);
    [['estimate', html(lw.estimate)], ['agreement', html(lw.agreement)], ['final invoice', lw.inv.final.html]].forEach(([k, h]) => {
      has(text(h), 'Home Sale Preparation Fee', '⚠ bundled prep ' + k + ': names the fee');
      const hit = OLD.exec(text(h));
      eq(hit ? hit[0] : null, null, '⚠ bundled prep ' + k + ': and no older name');
    });
    has(text(html(lw.agreement)), 'Contractor charges a Home Sale Preparation Fee of thirty percent (30%) of those vendor costs',
        '§3.5\'s bundled arm names it (it read "General Contractor / Site Management Fee")');
    has(text(html(lw.estimate)), '$2,400.30', 'and the estimate prints the fee to the cent');
    // The estate form's fee table, on an estate whose estimate bundles prep.
    const eb = attempt(() => { const d = driveCalcAll({ svc: 'cleanout', sqft: 3500, rooms: BASE });
      d.ctx.prepItems.push({ type: 'Painting', cost: 8001, note: '', lid: 'e1' }); d.ctx.calcAll(); return d.ctx.currentEstimate; });
    const EJOB = { id: 5, hvlId: 'HVL-0051', name: 'Butler Estate', svc: 'cleanout', addr: '69 Beach Blvd', tc: 'Anthony Graziano', status: 'active',
                   won: true, executor: 'Tripp Butler', executorRole: 'Personal Representative', executorEmail: 't@example.com', payments: [] };
    const ew = walk(eb.ok ? eb.val : {}, EJOB, []);
    const ea = text(html(ew.agreement));
    has(ea, 'Home Sale Preparation Fee', 'the estate form names the fee');
    has(ea, 'Charged on the home sale preparation vendors identified in Exhibit A', 'its fee row says what it is charged on');
    const eh = OLD.exec(ea);
    eq(eh ? eh[0] : null, null, '⚠ and no older name anywhere on it');
    // The emails' cost lines: the fee by its name, and every figure to the cent.
    const c = docs(PREP, PJOB);
    eq(c.estimateHavellinLines(PREP, true)[0][0], 'Home Sale Preparation Fee', 'the fee-only email line (it read "Havellin Management Fee")');
    const FXL = { fixedPrice: true, fixedAmount: 20000.25, prepFeeOnTop: true, fixedLines: true, prepEnabled: true, prepFee: 2400.3,
                  rush: true, rushPct: 0.2, rushAmt: 4000.05, discountPct: 5, discountAmt: 1200.02, pkgCost: 0 };
    eq(JSON.stringify(c.estimateHavellinLines(FXL, false)),
       JSON.stringify([['Fixed Project Fee', 20000.25], ['Home Sale Preparation Fee (30%)', 2400.3], ['Expedited Delivery (20%)', 4000.05],
                       ['Preferred Client Discount (5%)', -1200.02]]),
       '⚠ the email\'s lines carry their cents (the prep fee and the premium were rounded to the dollar there)');
    // The live source: the older names survive only in the dormant Service Management Fee clause (SMF_PCT is 0).
    const site = [...LIVE.matchAll(/site management/gi)].map((m) => enclosing(m.index));
    eq(site, ['agreementHtml'], 'one "site management" left in live code, in the agreement\'s SMF clause');
    const at = LIVE.search(/site management/i);
    has(LIVE.slice(Math.max(0, at - 400), at), '(SMF_PCT > 0', '⚠ which prints only while a Service Management Fee is charged — it is 0');
    eq((LIVE.match(/GC fee|Havellin Management Fee|GC \/ Site/g) || []).length, 0, 'no "GC fee", "GC / Site Management" or "Havellin Management Fee" anywhere live');
    has(SRC, '<td class="muted">Home Sale Preparation Fee</td><td class="num" id="s-prep-fee">', 'Build Estimate\'s summary row names it');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ 6 · RESTATED (P18): the engine bills whole hours, rounded up; a part day is still a day');
  {
    // RESTATED 2026-10-02 (P18, Anthony's answer B: "round estimates to full hours, and round up"), re-measured. P17 billed the
    // nearest quarter (59.1 → 59.0, 89.2 → 89.25, $10,961.25 for 59.13 at $185, a 5.5-hour declutter $825) through
    // roundQuarter and asked isQuarterHours of every hours box; both are retired. Now 59.1 → 60, 89.2 → 90, 59.13 → 60
    // ($11,100), and a 5.5-hour declutter bills 6 ($900), as before P17. p18-hours.test.js carries the rest of the rule.
    const Q = sandbox({ fns: ['roundUpHours', 'isHalfHours', 'isWholeHours', 'roundCents', 'labourBilled', 'planDays'], vars: ['ENGINE_FLOOR', 'PRODUCTIVE_HRS_PER_DAY'] });
    eq([2.1, 2.12, 2.125, 2.13, 2.37, 2.38, 59.1, 59.13, 59, 0].map((h) => Q.roundUpHours(h)), [3, 3, 3, 3, 3, 3, 60, 60, 59, 0],
       '⚠⚠ up to the whole hour (2.1 → 3, 59.1 → 60; P17 took them to the nearest quarter, 2.0 and 59.0)');
    eq([NaN, undefined, 'x'].map((h) => Q.roundUpHours(h)), [0, 0, 0], 'and nothing is 0');
    eq([2.5, 7, 0, -1.5, 2.25, 2.3, 0.1].map((h) => Q.isHalfHours(h)), [true, true, true, true, false, false, false],
       'isHalfHours: the question the hours log and recorded coordination ask (a quarter is no longer one)');
    eq([3, 0, -2, 2.5, 2.25].map((h) => Q.isWholeHours(h)), [true, true, true, false, false], 'isWholeHours: the question a change order asks');
    const b = Q.labourBilled({ tcHrs: 59.1, psHrs: 89.2 }, { tcRate: 150, psRate: 100 });
    eq([b.totTC, b.totPS, b.tcFee, b.psFee], [60, 90, 9000, 9000], '⚠⚠ 59.1 concierge hours bill 60 and 89.2 specialist hours bill 90 (P17: 59.0 and 89.25)');
    const b2 = Q.labourBilled({ tcHrs: 59.13, psHrs: 0 }, { tcRate: 185, psRate: 125 });
    eq([b2.totTC, b2.tcFee], [60, 11100], 'and the fee is the billed hours at the rate, to the cent ($11,100; P17 $10,961.25 for 59.25)');
    const dc = Q.labourBilled({ tcHrs: 0, psHrs: 0 }, { isPrep: true, declutterTCHrs: 5.5, tcRate: 150, psRate: 100 });
    eq([dc.totTC, dc.tcFee], [6, 900], 'a 5.5-hour declutter on a record saved before P18 bills 6 whole hours, $900 (one saved since already holds 6)');
    eq(Q.planDays({ days: 3 }, 7.25, 2, 'cleanout', false), 4, 'a destination day of 7.25 specialist hours on a crew of two is a whole day: days still round up');
    lacks(noComments(fn('labourBilled')), 'Math.ceil', 'the billed hours go up through the one float-safe helper, never a bare Math.ceil');
    has(noComments(fn('computeEngineV3')), 'tc = roundUpHours(tc); ps = roundUpHours(ps);', 'the engine\'s two columns go up to the whole hour too');
    has(noComments(fn('computeEngineV3')), 'Math.ceil(tc/7)', 'while its day count still rounds up');
    // One helper: every rounding of an estimate's hours asks roundUpHours.
    eq(readers('roundUpHours'), { calcAll: 2, computeEngineV3: 2, declutterHoursFlag: 1, getDeclutterTCHrs: 1, labourBilled: 2 },
       'roundUpHours\' readers: the engine, the billing, the move day, the declutter box and its flag');
    eq([readers('roundQuarter'), readers('isQuarterHours')], [{}, {}], 'P17\'s roundQuarter and isQuarterHours have no readers left: retired');
    eq((LIVE.match(/\* *4\) *\/ *4/g) || []).length, 0, 'no quarter rounding written by hand');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ 6 · RESTATED (P18): every hours box steps by its unit — a whole hour where an estimate is made, a half where work is logged');
  {
    // RESTATED 2026-10-02 (P18, Anthony's answer B): the declutter box and a change order's two boxes step by 1; the hours log's
    // and recorded coordination's by 0.5. Every one of them stepped by 0.25 on P17.
    const tags = (s) => [...s.matchAll(/<input[^>]*>/g)].map((m) => m[0]);
    const byId = (id) => tags(SRC).filter((t) => t.indexOf('id="' + id + '"') >= 0);
    ['e-declutter-hrs', 'co-tc-hrs', 'co-ps-hrs'].forEach((id) => {
      eq(byId(id).length, 1, 'fixture: #' + id + ' is in the markup once');
      has(byId(id)[0] || '', 'step="1"', '#' + id + ' steps by 1');
    });
    const rows = noComments(fn('buildLogTeamRows'));
    ['id="log-m0-hrs"', 'id="log-tc2-hrs"', 'id="log-m\'+i+\'-hrs"'].forEach((id) => {
      const t = tags(rows).filter((x) => x.indexOf(id) >= 0);
      eq(t.length, 1, 'fixture: the hours log draws ' + id);
      has(t[0] || '', 'step="0.5"', '⚠ the hours log\'s ' + id + ' steps by 0.5');
    });
    has(noComments(fn('_coordHrsField')), '<input type="number" step="0.5"', 'the recorded-coordination box steps by 0.5');
    const hourBoxes = tags(SRC).filter((t) => /type=\\?"number"/.test(t) && /hrs|hours/i.test(t));
    ok(hourBoxes.length >= 6, 'fixture: the hours boxes are found (' + hourBoxes.length + ')');
    eq(hourBoxes.filter((t) => !/step="(1|0\.5)"/.test(t)), [], 'and none steps by anything but a whole or a half hour (none by a quarter)');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ 6 · RESTATED (P18): the hours log refuses anything but half hours, where the record is written — both concierge rows');
  {
    // RESTATED 2026-10-02 (P18, Anthony's answer B: "maybe make it thirty minutes for logging hours"): the question is isHalfHours
    // and the refusal says half hours; P17's 2.25 and 1.75 were quarters, and a quarter is refused now. p18-hours.test.js drives
    // the crew rows too.
    const crew = { tc: { name: 'Ashley Jerome', locked: false }, tc2: { name: 'Anthony Graziano', locked: false },
                   ps: [{ name: 'Anthony Graziano Jr', locked: false }], confirmed: true };
    const save = (seed) => {
      const said = [];
      const dom = domStub(Object.assign({ 'log-job': { value: '21' }, 'log-date': { value: '2026-09-20' }, 'log-activity': { value: 'Kitchen sort' } }, seed));
      const c = sandbox({ fns: ['saveLogEntry', 'isCrewPlaceholder', 'roundCents', 'isHalfHours', 'esc'], vars: ['CONTRACTOR_TC_NAME', 'LOG_PLACEHOLDER_NAMES', 'jobLogs'],
        stubs: { document: dom, jobs: [{ id: 21, status: 'active' }], getJobCrew: () => crew, isJobFunded: () => true,
                 depositTargetFor: () => 0, depositPaidTotal: () => 0, fmt: (n) => '$' + n,
                 showFB: (id, kind, msg) => said.push(kind + ':' + msg), saveLogData() {}, lockAssignedCrew() {}, clearLogEntry() {},
                 buildLogTeamRows() {}, updateLogSummary() {}, renderLogHistory() {}, renderProjection() {}, _repaintHoursReadouts() {}, Date } });
      c.saveLogEntry();
      return { logs: c.jobLogs[21] || [], said: said.join(' | ') };
    };
    const bad = save({ 'log-m0-name': { value: 'Ashley Jerome' }, 'log-m0-hrs': { value: '2.3' }, 'log-m1-name': { value: 'Anthony Graziano Jr' }, 'log-m1-hrs': { value: '7' } });
    eq(bad.logs.length, 0, '⚠⚠ 2.3 hours are refused: nothing is written');
    has(bad.said, 'Hours are logged in half hours (0.5, 1.0, 1.5 …). Not a half hour: Ashley Jerome (2.3).', 'and the refusal names the row');
    has(bad.said, 'nothing was saved', 'and says nothing was saved');
    const quarter = save({ 'log-m0-name': { value: 'Ashley Jerome' }, 'log-m0-hrs': { value: '2.25' }, 'log-m1-name': { value: 'Anthony Graziano Jr' }, 'log-m1-hrs': { value: '7' } });
    eq(quarter.logs.length, 0, '⚠⚠ P17\'s quarter, 2.25, is refused now: nothing is written');
    has(quarter.said, 'Not a half hour: Ashley Jerome (2.25)', 'naming it');
    const good = save({ 'log-m0-name': { value: 'Ashley Jerome' }, 'log-m0-hrs': { value: '2.5' }, 'log-m1-name': { value: 'Anthony Graziano Jr' }, 'log-m1-hrs': { value: '7' } });
    eq(good.logs.length, 1, '2.5 hours are logged');
    eq(((good.logs[0] || {}).members || []).map((m) => m.role + ':' + m.hours).join(' '), 'TC:2.5 PS:7', 'as 2.5, exactly');
    const tc2 = save({ 'log-m0-name': { value: 'Ashley Jerome' }, 'log-m0-hrs': { value: '2.5' }, 'log-tc2-name': { value: 'Anthony Graziano' }, 'log-tc2-hrs': { value: '1.1' } });
    eq(tc2.logs.length, 0, '⚠ the second concierge\'s row is asked the same question: 1.1 is refused and nothing is written');
    has(tc2.said, 'Not a half hour: Anthony Graziano (1.1)', 'naming them');
    const both = save({ 'log-m0-name': { value: 'Ashley Jerome' }, 'log-m0-hrs': { value: '2.5' }, 'log-tc2-name': { value: 'Anthony Graziano' }, 'log-tc2-hrs': { value: '1.5' } });
    eq(((both.logs[0] || {}).members || []).map((m) => m.role + ':' + m.hours).join(' '), 'TC:2.5 TC:1.5', 'and a half hour on it is logged');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ 6 · RESTATED (P18): a change order refuses a part hour, recorded coordination a figure that is not a half hour, and the declutter box is flagged, not refused');
  {
    // RESTATED 2026-10-02 (P18, Anthony's answer B: "change orders whole hours"; the log and coordination in half hours; the
    // estimate's hours rounded up, so the declutter box is a flag). P17 refused anything that was not a quarter hour in all three,
    // and Save and Submit refused a declutter figure that was not one.
    // A change order: whole hours.
    const EST_TM = { jobId: 1, tcFee: 12000, psFee: 6000, pkgCost: 0, smf: 0, prepFee: 0, havellinTotal: 18000, tcRate: 150, psRate: 100,
                     discountPct: 0, fixedPrice: false, rush: false, vendors: [], prepItems: [], svc: 'cleanout', totTC: 80, totPS: 60 };
    const co = (tc, ps) => {
      const dom = domStub({ 'co-jobid': { value: '1' }, 'co-description': { value: 'Garage' }, 'co-tc-hrs': { value: tc }, 'co-ps-hrs': { value: ps },
                            'co-reason': { value: 'scope_add' } });
      const said = [];
      const c = sandbox({ fns: ['saveChangeOrder', '_coJobBasis', 'agrBillingRates', 'coPrepVendorsOn', '_agrHasPrepVendors', 'estFixedFee',
          'estPrepFeeOnTop', 'estFixedLines', 'coRushPctFor', 'coPriorHours', '_coPriorAccepted', 'coHours', 'coScopeLabel', 'coHoursLabel',
          'coVendorAdds', 'coVendorAddsTxt', 'isWholeHours', 'roundCents', 'fmtHrs', 'fmt', 'esc', 'prepFeeRate'],
        vars: ['RUSH_PCT', 'PREP_FEE_RATE'],
        stubs: { document: dom, jobs: [{ id: 1, svc: 'cleanout', status: 'active' }], changeOrders: [],
                 estimateStore: { 1: { estimate: EST_TM, approved: true } }, currentEstimate: null, saveChangeOrders() {}, renderJobs() {},
                 _docNotice: (k, m) => said.push(m), _srcLid: () => 'L1', coDraftVendorAdd: () => null } });
      attempt(() => c.saveChangeOrder());
      return { cos: c.changeOrders, fb: dom.getElementById('co-fb').innerHTML || '', said };
    };
    const r1 = co('2.3', '');
    eq(r1.cos.length, 0, '⚠⚠ a change order of 2.3 concierge hours is refused: nothing is saved');
    has(r1.fb, 'Change orders are in whole hours (1, 2, 3 …): concierge 2.3 is not a whole hour. Nothing was saved.', 'and the refusal says which');
    const r1q = co('2.25', '');
    eq(r1q.cos.length, 0, '⚠ P17\'s quarter, 2.25, is refused now too');
    const r2 = co('2', '-1.1');
    eq(r2.cos.length, 0, 'a specialist figure of −1.1 is refused the same way');
    has(r2.fb, 'specialist -1.1', 'naming it');
    const r3 = co('2', '-1');
    eq(r3.cos.map((x) => [x.tcHrs, x.psHrs]), [[2, -1]], 'whole hours are saved, a reduction included');
    // The declutter box: a flag beside the box, never a refusal (P18).
    const DQ = (v) => sandbox({ fns: ['declutterHoursFlag', 'roundUpHours', 'esc'], vars: ['DECLUTTER_MAX_HRS'],
                                stubs: { document: domStub({ 'e-declutter-hrs': { value: v } }) } }).declutterHoursFlag();
    eq(['', '0', '5', '6', '40'].map(DQ), ['', '', '', '', ''], 'a blank box, nothing, or a whole number raises no flag');
    eq(DQ('5.3'), 'Estimates round up to whole hours: 5.3 is priced as 6.', '⚠ 5.3 is flagged with what it is priced at (P17 refused it, priced at 5.25)');
    const said = [];
    const S = sandbox({ fns: ['saveEstimateAndPreview', 'fmtHrs', 'esc', 'prepFeeRate'],
      vars: ['DECLUTTER_MAX_HRS', 'PREP_FEE_RATE'],
      stubs: { document: domStub({ 'e-job': { value: '3' }, 'e-declutter-hrs': { value: '5.3' } }), jobs: [{ id: 3, svc: 'prep' }], estimateStore: {},
               estimateApproved: false, currentEstimate: { jobId: 3, svc: 'prep', prepEnabled: true, prepCost: 0, havellinTotal: 900 },
               estimateContractBlocker: () => null, showFB: (id, k, m) => said.push(m) } });
    attempt(() => S.saveEstimateAndPreview());
    has(said[0] || '', 'Add at least one Home Prep vendor with a cost', '⚠⚠ Save Estimate no longer refuses 5.3 declutter hours: it goes on to the next question (this fixture has no vendor)');
    const sub = [];
    const U = sandbox({ fns: ['submitForApproval'],
      stubs: { document: domStub({ 'e-declutter-hrs': { value: '5.3' } }), jobs: [{ id: 3, svc: 'prep' }], estimateSubmitted: false,
               REQUIRE_WALKTHROUGH_NOTES: true, currentEstimate: { jobId: 3, svc: 'prep', havellinTotal: 6900, rooms: [] }, estimateSubmitBlocker: () => null,
               estimateEventStatus: (j, st) => st, showFB: (id, k, m) => sub.push(m), saveEstimateState: () => sub.push('WROTE'), saveJobs: () => sub.push('WROTE'),
               syncJobToSheets() {}, updateApprovalUI() {}, notifyManagerForApproval: () => sub.push('NOTIFIED'), confirm: () => true } });
    const out = attempt(() => U.submitForApproval());
    eq(out.ok ? out.val : out.err, null, '⚠⚠ Submit is not refused by it either');
    eq(sub.filter((x) => x === 'WROTE' || x === 'NOTIFIED'), ['WROTE', 'WROTE', 'NOTIFIED'], 'it writes the estimate and the job and asks the manager');
    eq(U.estimateSubmitted, true, 'the estimate is submitted');
    // Recorded coordination (the Job Plan's sourcing rows): half hours, like the log.
    const notes = [];
    const K = sandbox({ fns: ['setJobVendorCoordHrs', '_coordHrsRefusal', 'isHalfHours'],
      stubs: { _svcJob: () => ({ rec: { coordHrs: 1 }, job: { id: 1 }, bucket: 'vendorSourcing', key: 'La' }), alert: (m) => notes.push(m),
               refreshVendorSourcing() {}, _saveJobEdit: () => notes.push('SAVED') } });
    K.setJobVendorCoordHrs(1, 0, '1.3');
    eq(notes.filter((x) => x === 'SAVED'), [], '⚠ recorded coordination of 1.3 hours is refused before anything is written');
    has(notes[0] || '', 'Coordination hours are recorded in half hours (0.5, 1.0, 1.5 …): 1.3 is not one. Nothing was saved.', 'and says so');
    K.setJobVendorCoordHrs(1, 0, '1.25');
    eq(notes.filter((x) => x === 'SAVED'), [], 'P17\'s quarter, 1.25, is refused now too');
    K.setJobVendorCoordHrs(1, 0, '1.5');
    eq(notes.filter((x) => x === 'SAVED').length, 1, 'and 1.5 is recorded');
    ['setPrepVendorCoordHrs', 'setLogisticsCoordHrs'].forEach((n) => has(noComments(fn(n)), 'var _why = _coordHrsRefusal(val); if (_why) {', n + ' asks the same question first'));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ 6 · an invoice bills exactly the hours logged at the rate, and an older entry as it was logged');
  {
    const EST = { svc: 'cleanout', totTC: 12.5, totPS: 15.5, tcFee: 1875, psFee: 1550, tcRate: 150, psRate: 100, pkgCost: 0, pkgLabel: 'None — $0',
                  smf: 0, prepItems: [], prepEnabled: false, prepCost: 0, prepFee: 0, havellinTotal: 3425, fixedPrice: false, rush: false,
                  discountPct: 0, discountAmt: 0, vendors: [], rooms: [], preparedBy: 'Anthony Graziano', rushExPrepFee: true };
    const JOB = { id: 6, hvlId: 'HVL-0061', name: 'Lee', svc: 'cleanout', addr: '3 Palm Way', tc: 'Anthony Graziano', status: 'active', won: true,
                  executor: 'Pat Lee', executorRole: 'Personal Representative', executorEmail: 'p@example.com', payments: [] };
    const LOGS = [{ date: '2026-09-01', activity: 'work', members: [{ name: 'Anthony Graziano', role: 'TC', hours: 10.25 },
                    { name: 'Specialist 1', role: 'PS', hours: 7.75 }, { name: 'Specialist 2', role: 'PS', hours: 7.75 }] },
                  { date: '2026-09-02', activity: 'work', members: [{ name: 'Anthony Graziano', role: 'TC', hours: 2.25 }] }];
    const c = docs(EST, JOB, LOGS);
    const fin = attempt(() => c.invoiceHtml(c.jobs[0], 'final'));
    const t = text(fin.ok ? fin.val.html : '');
    has(t, 'Anthony Graziano TC 12.5 $150/hr $1,875', '⚠⚠ the concierge\'s 10.25 + 2.25 hours billed at exactly 12.5 × $150 = $1,875');
    has(t, 'Specialist 1 PS 7.75 $100/hr $775', '⚠⚠ a specialist\'s 7.75 hours at exactly $775');
    has(t, 'Specialist 2 PS 7.75 $100/hr $775', 'and the other\'s');
    has(t, 'Havellin Services Total $3,425', 'under a total that is their sum');
    // An entry logged before 2026-10-01 in tenths stays as it was and bills as logged.
    const old = docs(EST, JOB, [{ date: '2026-09-01', activity: 'work', members: [{ name: 'Anthony Graziano', role: 'TC', hours: 2.3 }] }]);
    const of = attempt(() => old.invoiceHtml(old.jobs[0], 'final'));
    const ot = text(of.ok ? of.val.html : '');
    has(ot, 'Anthony Graziano TC 2.3 $150/hr $345', '⚠ an older 2.3-hour entry shows as 2.3 and bills 2.3 × $150 = $345 — as logged, never re-rounded');
    // A lone quarter hour is billed as a quarter hour: the readout's total is the sum of the rows above it.
    const one = docs(EST, JOB, [{ date: '2026-09-01', activity: 'work', members: [{ name: 'Anthony Graziano', role: 'TC', hours: 2.25 }] }]);
    const oneF = attempt(() => one.invoiceHtml(one.jobs[0], 'final'));
    const oneT = text(oneF.ok ? oneF.val.html : '');
    has(oneT, 'Anthony Graziano TC 2.25 $150/hr $337.50', '⚠ a lone 2.25 hours bills $337.50');
    has(oneT, 'Havellin Services Total $337.50', '⚠⚠ and the total under it is $337.50 — it summed the log to the tenth, 2.3, $345');
    const H = sandbox({ fns: ['fmtHrs'] });
    eq([2, 2.5, 2.25, 7.75, 2.3, 12.5, 0].map((h) => H.fmtHrs(h)), ['2.0', '2.5', '2.25', '7.75', '2.3', '12.5', '0.0'],
       'fmtHrs: one decimal as before, two for a quarter, an older entry as logged');
    // The hours log's own readout sums to the hundredth, so two quarters add to a half and one stays a quarter.
    const J = sandbox({ fns: ['jobLogEntries'], stubs: { jobLogs: { 6: LOGS } } });
    ok(typeof J.jobLogEntries === 'function', 'fixture: the log is read through jobLogEntries');
    has(noComments(fn('invoiceHtml', 'jobLogEntries')), 'roundCents(actTC * tcRate)', '⚠ the invoice prices the hours as logged, to the cent');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ 6 · money is carried to the cent by one helper, and printed by one formatter');
  {
    const M = sandbox({ fns: ['roundCents', 'fmt', 'paymentSplit', 'moneyToNumber', 'formatMoneyInput', '_invMoney'] });
    eq([1.005, 2.675, 1.004, -1.005, 0.125, 0.1 + 0.2, 1e-10, 971.249, 971.25].map((n) => M.roundCents(n)),
       [1.01, 2.68, 1, -1.01, 0.13, 0.3, 0, 971.25, 971.25], '⚠⚠ roundCents: half away from zero, and decimal-correct (1.005 is 1.01, which Math.round(x * 100) / 100 makes 1)');
    eq([NaN, undefined, 'x', Infinity].map((n) => M.roundCents(n)), [0, 0, 0, 0], 'and nothing is 0');
    eq([900, 971.25, 1234.5, 0.1 + 0.2, 25715, 12857.5, 0, 1000000.01].map((n) => M.fmt(n)),
       ['$900', '$971.25', '$1,234.50', '$0.30', '$25,715', '$12,857.50', '$0', '$1,000,000.01'],
       '⚠⚠ fmt: whole dollars as before, and the cents whenever there are any');
    eq(M._invMoney('1234.5'), '$1,234.50', 'the inventory\'s values print through it too');
    eq(JSON.stringify(M.paymentSplit(22071.25)), JSON.stringify({ deposit: 11035.63, midpoint: 5517.81, final: 5517.81, total: 22071.25 }),
       '⚠⚠ the 50/25/25 split to the cent, and the three add up to the total');
    eq(JSON.stringify(M.paymentSplit(10962)), JSON.stringify({ deposit: 5481, midpoint: 2740.5, final: 2740.5, total: 10962 }),
       'a quarter of $10,962 is $2,740.50 (it was rounded to $2,741, and the final took $2,740)');
    [10000.01, 10000.02, 10000.03, 99.99, 0.01].forEach((t) => {
      const s = M.paymentSplit(t);
      eq(C(s.deposit) + C(s.midpoint) + C(s.final), C(t), 'the split of $' + t + ' adds up to it to the cent');
    });
    // The money field formats as typed and keeps the cents (it stripped the point: "1234.50" became $123,450).
    const el = { value: '' };
    const fmtd = ['1234.5', '1234.567', '12,000', '.5', '$8,000.00', ''].map((v) => { el.value = v; M.formatMoneyInput(el); return el.value; });
    eq(fmtd, ['$1,234.5', '$1,234.56', '$12,000', '$0.5', '$8,000.00', ''], '⚠⚠ formatMoneyInput keeps the point and two digits after it');
    eq(fmtd.map((v) => M.moneyToNumber(v)), [1234.5, 1234.56, 12000, 0.5, 8000, 0], 'and every one reads back as the amount typed, never a hundred times it');
    // One helper, one formatter: who reads them.
    const rc = readers('roundCents'), fm = readers('fmt');
    ok(total(rc) >= 150, 'roundCents has ' + total(rc) + ' readers across ' + Object.keys(rc).length + ' functions');
    ok(total(fm) >= 300, 'fmt has ' + total(fm) + ' readers across ' + Object.keys(fm).length + ' functions');
    ['estimateFigures', 'paymentSplit', 'labourBilled', 'invoiceHtml', 'getVendorActuals', 'coPrice', 'discountOnLabor', 'stripePaymentLink', 'getPrepFee']
      .forEach((f) => ok(rc[f] > 0, '⚠ ' + f + ' derives its money through roundCents'));
    ['clientEstimateHtml', 'invoiceHtml', 'agreementHtml', 'probateAgreementHtml', 'printChangeOrder', 'buildPrepEstimateBody', '_emMoney',
     '_invMoney', 'exportEstimateToDrive', 'renderPrepJobPlan', 'jobPaymentsListHtml']
      .forEach((f) => ok(fm[f] > 0, f + ' prints its money through fmt'));
    lacks(LIVE, 'function fmtMoney(', 'fmt\'s whole-dollar twin is gone');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ 6 · no money print rounds to the whole dollar — the nets over the live code');
  {
    eq((LIVE.match(/fmt\(Math\.round\(/g) || []).length, 0, '⚠⚠ nothing rounds a figure to the dollar and then formats it');
    const dollarRound = [...LIVE.matchAll(/'\$'\s*\+\s*Math\.round\(/g)].map((m) => enclosing(m.index));
    eq(dollarRound, ['formatPropVal'], 'nothing prints "$" + a rounded figure but the property value\'s "$1,250K"');
    const wholeFmt = [...LIVE.matchAll(/maximumFractionDigits:\s*0|\.toFixed\(0\)/g)].map((m) => enclosing(m.index));
    eq(wholeFmt, [], 'nothing formats money with no fraction digits');
    const ownFmt = [...LIVE.matchAll(/'\$'\s*\+[^;\n]*?\.toLocaleString\(/g)].map((m) => enclosing(m.index));
    eq(ownFmt.filter((f) => ['fmt', 'formatMoneyInput', 'formatPropVal'].indexOf(f) < 0), [], '⚠ no second money formatter: "$" + toLocaleString lives in fmt alone (and the typed field, and the property value)');
    // A money figure assigned from Math.round: a percentage (× 100) aside, there is none.
    const NAMES = /\b[A-Za-z_$]*(?:Fee|fee|Amt|amt|Amount|amount|Total|total|Cost|cost|Price|price|Due|due|Paid|paid|deposit|Deposit|midpoint|Midpoint|balance|Balance|discount|Discount|Rush|outstanding|Outstanding)\s*[:=]\s*Math\.round\(([^;\n]*)/g;
    const assigned = [...LIVE.matchAll(NAMES)].filter((m) => !/\*\s*100\s*\)\s*$|\*\s*100\)(?!\s*\/)/.test(m[1])).map((m) => enclosing(m.index) + ': ' + m[0].slice(0, 60));
    eq(assigned, [], '⚠⚠ no money figure is taken to the dollar with Math.round');
    // Driven: a total with cents prints them on every document, never its whole-dollar rounding.
    // RESTATED 2026-10-02 (P18, Anthony's answer B), re-measured: the estimate's hours are whole again, so a Premium estate is whole
    // dollars ($22,350; it was $22,071.25 on P17's quarter hours) and the cents come from a percentage. A 3% preferred-client
    // discount carries them: $21,679.50, a $10,839.75 deposit.
    const pr = attempt(() => E(run('cleanout', { prem: true, seed: { 'e-discount': '3' } })));
    const P = pr.ok ? pr.val : {};
    eq([P.havellinTotal, P.discountAmt], [21679.5, 670.5], 'fixture: a Premium Estate Settlement with 3% off is $21,679.50 ($670.50 off $22,350)');
    const JOB = { id: 8, hvlId: 'HVL-0081', name: 'Butler Estate', svc: 'cleanout', addr: '69 Beach Blvd', tc: 'Anthony Graziano', status: 'active',
                  won: true, premium: true, executor: 'Tripp Butler', executorRole: 'Personal Representative', executorEmail: 't@example.com', payments: [] };
    const w = walk(P, JOB, []);
    const all = [html(w.estimate), html(w.agreement), w.inv.deposit.html].map(text).join(' ');
    has(all, '$21,679.50', 'the estimate total prints its cents');
    has(all, '$10,839.75', 'the deposit too');
    ok(!/\$21,680(?![\d.])/.test(all) && !/\$21,679(?!\.50)/.test(all), '⚠⚠ and nowhere as $21,680 or $21,679');
    ok(!/\$10,840(?![\d.])/.test(all) && !/\$10,839(?!\.75)/.test(all), '⚠⚠ nor the deposit as $10,840 or $10,839');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ 6 · every client document adds up to the cent — Home Prep with 5.5 declutter hours typed');
  {
    // RESTATED 2026-10-02 (P18, Anthony's answer B: "the Home Prep estimate prints the rounded-up hours so the page adds up"),
    // re-measured through the real engine: a typed 5.5 is priced and saved as 6, so the row reads 6.0 hrs × $150 = $900 above a
    // $6,900 total, a $3,450 deposit and $1,725 quarters (P17: 5.5 × $150 = $825, $6,825, $3,412.50 and $1,706.25). Logged as
    // quoted (6 hours), the invoices are that schedule; 5.5 hours logged would bill $825, as logged.
    const pb = attempt(() => { const d = driveCalcAll({ svc: 'prep', sqft: 3500, rooms: [], seed: { 'e-declutter-hrs': '5.5' } });
      d.ctx.prepItems.push({ type: 'Painting', cost: 20000, note: '', lid: 'p1' }); d.ctx.calcAll(); return d.ctx.currentEstimate; });
    const PREP = pb.ok ? pb.val : {};
    eq([PREP.declutterTCHrs, PREP.totTC, PREP.tcFee, PREP.prepFee, PREP.havellinTotal], [6, 6, 900, 6000, 6900],
       '⚠⚠ 5.5 typed is saved as 6 and bills 6 × $150 = $900, and the total is $6,000 + $900 = $6,900');
    const JOB = { id: 9, hvlId: 'HVL-0091', name: 'Marston', svc: 'prep', addr: '1 Ocean Blvd', tc: 'Anthony Graziano', status: 'active', won: true,
                  email: 'm@example.com', payments: [] };
    const w = walk(PREP, JOB, [{ date: '2026-09-02', activity: 'declutter', members: [{ name: 'Ashley Jerome', role: 'TC', hours: 6 }] }]);
    const ce = text(html(w.estimate));
    has(ce, '(6.0 hrs × $150/hr) $900', 'the estimate\'s declutter row');
    has(ce, 'Havellin Services Total $6,900', '⚠⚠ under a total that counts exactly it');
    has(ce, '$3,450', 'the schedule\'s deposit');
    has(ce, '$1,725', 'and its two quarters');
    eq([w.inv.deposit.amtDue, w.inv.midpoint.amtDue, w.inv.final.amtDue], [3450, 1725, 1725],
       '⚠⚠ billed as quoted, the three invoices are the schedule the client signed, to the cent');
    eq(C(w.inv.deposit.amtDue) + C(w.inv.midpoint.amtDue) + C(w.inv.final.amtDue), C(6900), 'and they add up to the total');
    has(text(w.inv.final.html), '$900', 'the final bills the 6 hours logged as $900');
    const w55 = walk(PREP, JOB, [{ date: '2026-09-02', activity: 'declutter', members: [{ name: 'Ashley Jerome', role: 'TC', hours: 5.5 }] }]);
    has(text(w55.inv.final.html), 'Ashley Jerome TC 5.5 $150/hr $825', 'and 5.5 hours logged bill $825, as logged');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ 6 · every client document adds up to the cent — hourly and fixed, each with the premium and a discount');
  {
    [false, true].forEach((fixed) => {
      const label = fixed ? 'fixed' : 'hourly';
      // RESTATED 2026-10-02 (P18): whole hours make a 5% discount on this house land on whole dollars ($25,479 hourly), so the
      // fixture takes 7%, which carries cents on both bases ($24,942.60 hourly, $29,931.12 fixed; measured through the engine).
      const seed = { 'e-rush': true, 'e-discount': '7' };
      if (fixed) seed['e-fixed'] = { checked: true };
      const pr = attempt(() => E(run('cleanout', { prem: true, seed })));
      ok(pr.ok, label + ': the estimate prices' + (pr.ok ? '' : ' — ' + pr.err));
      const P = pr.ok ? pr.val : {};
      ok(P.rushAmt > 0 && P.discountAmt > 0, label + ' fixture: a premium ($' + P.rushAmt + ') and a discount ($' + P.discountAmt + ') on it');
      ok(C(P.havellinTotal) % 100 !== 0, label + ' fixture: the total carries cents ($' + P.havellinTotal + ')');
      const JOB = { id: 10, hvlId: 'HVL-0101', name: 'Butler Estate', svc: 'cleanout', addr: '69 Beach Blvd', tc: 'Anthony Graziano', status: 'active',
                    won: true, premium: true, executor: 'Tripp Butler', executorRole: 'Personal Representative', executorEmail: 't@example.com', payments: [] };
      // As quoted: the hours the estimate priced are the hours logged, in half hours (RESTATED 2026-10-02, P18; quarters on P17).
      const ps1 = Math.floor(P.totPS / 2 * 2) / 2;
      const w = walk(P, JOB, [{ date: '2026-09-02', activity: 'work', members: [{ name: 'Anthony Graziano', role: 'TC', hours: P.totTC },
        { name: 'Specialist 1', role: 'PS', hours: ps1 }, { name: 'Specialist 2', role: 'PS', hours: P.totPS - ps1 }] }]);
      const split = w.c.paymentSplit(P.havellinTotal);
      const amts = [w.inv.deposit.amtDue, w.inv.midpoint.amtDue, w.inv.final.amtDue];
      eq(amts, [split.deposit, split.midpoint, split.final], '⚠⚠ ' + label + ': the three invoices bill the signed schedule to the cent (' + amts.join(' / ') + ')');
      eq(C(amts[0]) + C(amts[1]) + C(amts[2]), C(P.havellinTotal), label + ': and add up to the total');
      const ce = text(html(w.estimate)), ag = text(html(w.agreement));
      has(ce, w.c.fmt(P.havellinTotal), label + ': the estimate prints the total with its cents');
      [split.deposit, split.midpoint].forEach((a) => {
        has(ce, w.c.fmt(a), label + ': the estimate\'s schedule prints ' + w.c.fmt(a));
        has(ag, w.c.fmt(a), label + ': and so does the agreement\'s');
      });
      has(text(w.inv.deposit.html), 'Deposit Due Now (50%) ' + w.c.fmt(split.deposit), label + ': the deposit invoice asks for it');
      // The estimate's services table adds up: its rows above the total, in cents.
      const rows = (P.fixedPrice
        ? [P.fixedAmount, P.prepFee || 0, P.rushAmt, -P.discountAmt]
        : [P.tcFee, P.psFee, P.pkgCost || 0, P.prepFee || 0, P.rushAmt, -P.discountAmt]);
      eq(rows.reduce((a, v) => a + C(v), 0), C(P.havellinTotal), '⚠ ' + label + ': the lines the estimate prints add up to its total, to the cent');
      rows.filter((v) => v > 0).forEach((v) => has(ce, w.c.fmt(v), label + ': and each of them is printed (' + w.c.fmt(v) + ')'));
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ 6 · a fixed-price change order is priced to the cent, and its page adds up');
  {
    const CO_FNS = ['_coJobBasis', 'coHours', 'coHoursTotal', 'coBaselineShift', 'coHoursLabel', '_coMoney', 'fmt', 'esc', 'coPrice', 'coPriceTotal',
      'coFixedTerms', 'coRateBasisTxt', 'coReasonLabel', 'estFixedFee', 'estTolerancePctTxt', 'printChangeOrder', '_coPriorAccepted', 'coPriorHours',
      'prepFeeRate', 'agrBillingRates', 'coRateModsLine', 'estFixedLines', 'coRushPct', 'coRushPctFor', 'coScopeLabel', 'coVendorAdds', 'coVendorAddsTxt',
      'coPrepVendorsOn', '_agrHasPrepVendors', 'estPrepFeeOnTop', 'coBaselineMove', 'discountOnLabor', 'roundCents', 'fmtHrs', 'moneyToNumber'];
    const EST_FX = { jobId: 1, tcFee: 12000, psFee: 6000, pkgCost: 0, smf: 0, prepFee: 0, havellinTotal: 24000.25, tcRate: 150, psRate: 100,
                     discountPct: 0, fixedPrice: true, fixedAmount: 24000.25, prepFeeOnTop: true, fixedLines: true, rush: false, vendors: [],
                     prepItems: [], svc: 'cleanout', totTC: 80, totPS: 60 };
    // (P18: a change order is in whole hours since 2026-10-02; this one was recorded on P17's day in quarters, and keeps them —
    // priced, printed and footed to the cent as entered.)
    const CO = { id: 100, jobId: 1, description: 'Guest house', reason: 'scope_add', tcHrs: 2.25, psHrs: 1.75, createdAt: 'Oct 1, 2026',
                 clientApproved: false, clientName: '', clientAcceptedAt: '' };
    const c = sandbox({ fns: CO_FNS, vars: ['EST_TOLERANCE_PCT', 'CO_REASONS', 'RUSH_PCT', 'PREP_FEE_RATE'],
      stubs: { document: domStub({}), jobs: [{ id: 1, hvlId: 'HVL-0007', name: 'Butler Estate', svc: 'cleanout', addr: '69 Beach Blvd', tc: 'Anthony Graziano' }],
               changeOrders: [CO], estimateStore: { 1: { estimate: EST_FX, approved: true } }, currentEstimate: null,
               docNames: () => ({ printTitle: 'Havellin Change Order' }) } });
    eq(c.coPrice(CO, 150, 100), 512.5, '2.25 concierge hours at $150 and 1.75 specialist hours at $100: $337.50 + $175 = $512.50');
    attempt(() => c.printChangeOrder(100));
    const t = text(c.__printed);
    has(t, 'Fixed project fee in your agreement $24,000.25', 'the page opens on the agreed fee, to the cent');
    has(t, '+ $512.50', 'adds the change\'s price');
    has(t, 'Revised fixed project fee $24,512.75', '⚠⚠ and foots in the revised fee, to the cent: $24,000.25 + $512.50');
    has(t, '+2.25 concierge hrs at $150/hr', 'with its quarter hours printed as entered');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ 6 · the Stripe link asks for exactly what the invoice says is outstanding, to the cent');
  {
    // RESTATED 2026-10-02 (P18), re-measured: on whole hours a Premium estate is whole dollars, so the cents come from a 3% discount
    // ($21,679.50; a $10,839.75 deposit, $5,839.75 outstanding after a $5,000 cheque). P17 read $22,071.25, $11,035.63, $6,035.63.
    const pr = attempt(() => E(run('cleanout', { prem: true, seed: { 'e-discount': '3' } })));
    const P = pr.ok ? pr.val : {};
    const JOB = { id: 11, hvlId: 'HVL-0111', name: 'Butler Estate', svc: 'cleanout', addr: '69 Beach Blvd', tc: 'Anthony Graziano', status: 'active',
                  won: true, premium: true, executor: 'Tripp Butler', executorRole: 'Personal Representative', executorEmail: 't@example.com',
                  payments: [{ uid: 'c1', stage: 'deposit', amount: 5000, method: 'check', receivedOn: '2026-09-20' }] };
    const c = docs(P, JOB, []);
    const inv = attempt(() => c.invoiceHtml(c.jobs[0], 'deposit'));
    const I = inv.ok ? inv.val : {};
    eq([I.amtDue, I.outstanding], [10839.75, 5839.75], 'fixture: the deposit invoice asks $10,839.75, of which $5,839.75 is outstanding after a $5,000 cheque');
    attempt(() => c.stripePaymentLink(11, 'deposit'));
    eq(c.__posts.map((p) => p.amount), [5839.75], '⚠⚠ the link asks for $5,839.75 — not $5,840');
    has((c.__notices[0] || {}).msg || '', 'Creating an ACH payment link for $5,839.75', 'and the notice says so, to the cent');
    const c2 = docs(P, Object.assign({}, JOB, { payments: [] }), []);
    attempt(() => c2.stripePaymentLink(11, 'deposit'));
    eq(c2.__posts.map((p) => p.amount), [10839.75], 'with nothing received, the whole deposit, to the cent');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // closeoutRetainedTotal took the money received to the dollar (Math.round), so a client who paid a $3,412.50
  // deposit and walked away was closed out as "$3,413 retained". The extra revert sweep found nothing holding it.
  group('⚠ 6 · a job closed out after money came in names what it kept, to the cent');
  {
    const dom = domStub({});
    const X = sandbox({
      fns: ['openCloseoutModal', 'closeoutRetainedTotal', 'jobPaidTotal', 'paymentCounts', 'jobIsSettled', 'stagePaidTotal', 'jobPayments',
            'roundCents', 'fmt', 'esc', 'jobRefundedTotal', 'refundCounts', 'paymentLive', 'isRefundRecord', 'walkawaySettlement'],
      // P17 merge: the dialog now asks walkawaySettlement (W2), which reads the job's estimate; a fixed price keeps the
      // earn-out wording this group measures (an hourly one shows the settlement, measured in p17-payments-lifecycle).
      stubs: { document: dom, alert: () => {}, estimateStore: { 77: { approved: true, estimate: { fixedPrice: true } } } },
    });
    const J = { id: 77, name: 'Marston', svc: 'prep', status: 'active', won: true,
                payments: [{ uid: 'd1', stage: 'deposit', amount: 3412.5, method: 'wire', receivedOn: '2026-09-02' }] };
    X.jobs = [J]; X.closeoutJobId = 0;
    const r = attempt(() => X.closeoutRetainedTotal(J));
    eq(r.ok ? r.val : r.err, 3412.5, '⚠⚠ the amount kept is the $3,412.50 received, not $3,413');
    attempt(() => X.openCloseoutModal(77));
    const sub = text(dom.getElementById('closeout-sub').innerHTML);
    has(sub, '$3,412.50 has already been received on this job', '⚠ the close-out dialog names it to the cent');
    has(sub, 'with the $3,412.50 kept, not as a loss', 'twice');
    ok(!/\$3,413(?![\d.])/.test(sub), 'and never as $3,413');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠ 10 · a volume of 5 leaves the complexity the estimator typed alone');
  {
    const dom = domStub({ 'vol-r1': '5', 'cplx-r1': '2', 'vol-r2': '7', 'cplx-r2': '1' });
    const V = sandbox({ fns: ['onVolInput', 'clampRoomScoreInput', 'roomScoreOf'], stubs: { document: dom, calcAll() {}, _volHandSet: {} } });
    V.onVolInput('r1');
    eq(String(dom.getElementById('cplx-r1').value), '2', '⚠⚠ a 5 typed as the volume leaves the complexity at 2 (it wrote 5 over it)');
    V.onVolInput('r2');
    eq([String(dom.getElementById('vol-r2').value), String(dom.getElementById('cplx-r2').value)], ['5', '1'],
       'a 7 clamps to a 5 as typed, and the complexity stays 1');
    eq(V._volHandSet.r1, true, 'the volume is still marked hand-scored');
    lacks(noComments(fn('onVolInput')), 'cplx', 'onVolInput no longer touches the complexity box at all');
  }
};
