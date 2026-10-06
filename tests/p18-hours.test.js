'use strict';
// ────────────────────────────────────────────────────────────────────────────────────────────────
// ⚠⚠ P18 · HOURS (workstream W-B) — Anthony's answer B of 2026-10-02.
//
//   "I think actually billing every 15mins is a lot of detail...we are not lawyers billing $1500/hr. maybe make it
//   thirty minutes for logging hours (so a TC can bill 1hr, 1.5hrs or 2hrs) ... but round estimates to full hours, and
//   round up. I was confused about that. when we create estimates round to full hours. make sense?" Then: "change orders
//   whole hours. and yes on agreements."
//
//   B1  Estimates round UP to whole hours, through one float-safe helper (roundUpHours, read at twelve significant
//       digits so 10.000000000000002 is 10, never 11), at every site P17 took to the nearest quarter: the engine's two
//       columns, labourBilled, the move day, the declutter hours. Day counts still round up. Every hour figure a client
//       document prints for an estimate is a whole number and its rows add up.
//   B2  The declutter box is in whole hours, rounded up: a typed 5.5 is priced and saved as 6, and the hint beside the
//       box says so before Save. P17's Save/Submit refusal is that flag now.
//   B3  The hours log is in half hours for everyone (both concierge rows and every crew row), one predicate
//       (isHalfHours), each refused row named, nothing written until every row is one.
//   B4  Change orders are in whole hours, either role, either sign (isWholeHours).
//   B5  Recorded coordination hours on the Job Plan are in half hours, like the log.
//   B6  Invoices bill the logged hours as logged; money stays to the cent.
//   B7  The agreements say "Time is recorded and billed in half-hour increments, as worked." wherever they bill time,
//       and never on a fixed fee.
//
// Driven wherever it can be: the real engine through driveCalcAll, the real documents through the reconciliation
// suite's own lift list, the real handlers in a sandbox. Every figure pinned here was measured on this build.
// ────────────────────────────────────────────────────────────────────────────────────────────────

const { sandbox, source, fn, domStub, driveCalcAll } = require('./harness');
const DOCREC = require('./document-reconciliation.test.js');

const ENT = { '&amp;': '&', '&nbsp;': ' ', '&times;': '×', '&mdash;': '—', '&ndash;': '–', '&rsquo;': '’', '&#39;': "'",
              '&quot;': '"', '&lt;': '<', '&gt;': '>', '&minus;': '−', '&sect;': '§', '&middot;': '·', '&#8627;': '↳', '&hellip;': '…' };
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, (m) => (ENT[m] !== undefined ? ENT[m] : m))
  .replace(/\s+/g, ' ').trim();
// Running prose (an agreement's clauses), read as a person reads it: inline tags dropped without a space.
const flat = (h) => String(h || '').replace(/<\/(p|div|td|th|tr|li|h\d)>/g, ' ').replace(/<[^>]+>/g, '')
  .replace(/&[a-z#0-9]+;/gi, (m) => (ENT[m] !== undefined ? ENT[m] : m)).replace(/\s+/g, ' ').trim();
const noComments = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }
const C = (n) => Math.round(Number(n) * 100);            // whole cents, for sums and comparisons
const money = (s) => C(String(s).replace(/[^0-9.\-]/g, ''));

const SRC = source();
const LIVE = noComments(SRC);
const FN_STARTS = [...LIVE.matchAll(/(^|\n)function ([A-Za-z0-9_$]+)\s*\(/g)].map((m) => ({ at: m.index, name: m[2] }));
function enclosing(idx) {
  let lo = 0, hi = FN_STARTS.length - 1, ans = '(top)';
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (FN_STARTS[mid].at <= idx) { ans = FN_STARTS[mid].name; lo = mid + 1; } else hi = mid - 1; }
  return ans;
}
// Who calls a helper (or reads a constant), by enclosing function, the definition left out.
function readers(name, call) {
  const out = {};
  const re = new RegExp('(?<![\\w.$])' + name + (call === false ? '(?![\\w$])' : '\\('), 'g');
  for (const m of LIVE.matchAll(re)) {
    if (LIVE.slice(Math.max(0, m.index - 9), m.index) === 'function ') continue;
    if (LIVE.slice(Math.max(0, m.index - 4), m.index) === 'var ') continue;
    const f = enclosing(m.index);
    out[f] = (out[f] || 0) + 1;
  }
  const sorted = {};
  Object.keys(out).sort().forEach((k) => { sorted[k] = out[k]; });
  return sorted;
}

// Seven rooms at their defaults on a 3,500 sq ft house: the estate every hand-back measures.
const BASE = ['Living Room', 'Kitchen', 'Dining Room', 'Family Room / Great Room', 'Primary Suite', 'Bedroom 2', 'Bedroom 3'];
function run(svc, opts) {
  const o = opts || {};
  const seed = Object.assign({ 'e-prem': !!o.prem }, o.seed || {});
  const r = driveCalcAll({ svc, sqft: o.sqft || 3500, rooms: o.rooms || BASE, seed, fns: o.fns || [], job: o.job });
  if (o.lines) {
    r.ctx.vendors = o.lines.map((l, i) => Object.assign({ lid: 'v' + i, cost: 1500 }, l,
      typeof l.tcHrs === 'number' ? {} : { tcHrs: r.ctx.vendorLineTCHrs(l.type) }));
    r.ctx.calcAll();
  }
  if (o.prep) { o.prep.forEach((p) => r.ctx.prepItems.push(p)); r.ctx.calcAll(); }
  return r;
}
const E = (r) => (r && r.ctx && r.ctx.currentEstimate) || {};
const tryE = (f) => { const a = attempt(() => E(f())); return a.ok ? a.val : { err: a.err }; };

// The documents, through the reconciliation suite's own lift list, plus Exhibit A's packet.
const DOC_FNS = DOCREC.FNS.concat(['_ceGroupedSpaces', 'signingPacketHtml', '_approvedEstimateHtml', 'buildSigningPacketHtml', 'estateAuthority', 'jobOnProbateTrack']);
const DOC_VARS = DOCREC.VARS;
function docs(est, job, logs) {
  return sandbox({ fns: DOC_FNS, vars: DOC_VARS, stubs: {
    jobs: [job], jobLogs: { [job.id]: logs || [] }, changeOrders: [], contractors: [], currentEstimate: null,
    estimateStore: { [job.id]: { estimate: Object.assign({}, est, { jobId: job.id }), approved: true, approvedBy: 'Anthony Graziano' } },
    currentInvStage: 'final', vendorDirectory: [], jobPlans: {}, _photoRefs: {}, document: domStub({}),
    ensureAgreementApproved: () => '', _jobTouch() {}, saveJobs() {}, syncJobToSheets() {} } });
}
const html = (a) => (a && a.ok ? a.val : 'THREW ' + (a && a.err));
// The hours rows of a services table: [label, hours, rate, amount] for every row whose second cell is an hours figure
// and third a rate per hour.
function hourRows(h) {
  const out = [];
  for (const tr of String(h).split(/<tr[\s>]/).slice(1)) {
    const cells = tr.split('</td>').map((c) => text(c));
    if (cells.length < 4) continue;
    if (!/^\d+(\.\d+)?$/.test(cells[1]) || !/\/hr$/.test(cells[2])) continue;
    out.push({ label: cells[0], hrs: parseFloat(cells[1]), rate: money(cells[2]), amt: money(cells[3]) });
  }
  return out;
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  ok(LIVE.length > SRC.length * 0.5, 'fixture: the comment-stripped source is still most of the file (' + LIVE.length + ' of ' + SRC.length + ')');

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ B1 · estimates round UP to whole hours, through one float-safe helper; a part day is still a day');
  {
    const Q = sandbox({ fns: ['roundUpHours', 'isHalfHours', 'isWholeHours', 'roundCents', 'labourBilled', 'planDays'], vars: ['ENGINE_FLOOR', 'PRODUCTIVE_HRS_PER_DAY'] });
    eq([10, 10.01, 59.1, 59.9, 0.2, 0, 6, 5.5].map((h) => Q.roundUpHours(h)), [10, 11, 60, 60, 1, 0, 6, 6],
       '⚠⚠ up to the whole hour, never to the nearest (59.1 → 60, 10.01 → 11, 5.5 → 6)');
    eq([10.000000000000002, (0.1 + 0.2) * 10, 0.7 + 0.1 + 0.2].map((h) => Q.roundUpHours(h)), [10, 3, 1],
       '⚠⚠ float noise is not an hour: 10.000000000000002 is 10, (0.1 + 0.2) × 10 = 3.0000000000000004 is 3 (Math.ceil makes them 11 and 4)');
    eq([Math.ceil(10.000000000000002), Math.ceil((0.1 + 0.2) * 10)], [11, 4], 'fixture: the bare Math.ceil the helper guards against');
    eq([NaN, undefined, 'x', -0.4].map((h) => Q.roundUpHours(h)), [0, 0, 0, 0], 'and nothing (or a negative part hour) is 0');
    const b = Q.labourBilled({ tcHrs: 59.1, psHrs: 89.2 }, { tcRate: 150, psRate: 100 });
    eq([b.totTC, b.totPS, b.tcFee, b.psFee], [60, 90, 9000, 9000], '⚠⚠ 59.1 concierge hours bill 60 and 89.2 specialist hours bill 90 (P17 billed 59.0 and 89.25)');
    const b1 = Q.labourBilled({ tcHrs: 59.01, psHrs: 89 }, { tcRate: 185, psRate: 125 });
    eq([b1.totTC, b1.totPS, b1.tcFee, b1.psFee], [60, 89, 11100, 11125], 'a hundredth over is the next hour; a whole figure stays as it is');
    const dc = Q.labourBilled({ tcHrs: 0, psHrs: 0 }, { isPrep: true, declutterTCHrs: 6, tcRate: 150, psRate: 100 });
    eq([dc.totTC, dc.tcFee], [6, 900], 'standalone prep bills its declutter hours as saved');
    eq(Q.planDays({ days: 3 }, 7, 2, 'cleanout', false), 4, 'a destination day of 7 specialist hours on a crew of two is a whole day: days still round up');
    has(noComments(fn('computeEngineV3')), 'tc = roundUpHours(tc); ps = roundUpHours(ps);', '⚠ the engine\'s two columns go up to the whole hour');
    has(noComments(fn('computeEngineV3')), 'Math.ceil(tc/7)', 'while its day count still rounds up');
    has(noComments(fn('labourBilled')), 'var totTC = roundUpHours(tc), totPS = roundUpHours(ps);', '⚠ labourBilled rounds the billed hours up');
    // One helper: every rounding of an estimate's hours asks roundUpHours.
    eq(readers('roundUpHours'), { calcAll: 2, computeEngineV3: 2, declutterHoursFlag: 1, getDeclutterTCHrs: 1, labourBilled: 2 },
       '⚠ roundUpHours\' readers: the engine\'s two columns, the billed hours, the move day\'s two, the declutter box and its flag');
    eq(readers('isHalfHours'), { _coordHrsRefusal: 1, saveLogEntry: 2 }, 'isHalfHours\' readers: the hours log (every row) and recorded coordination');
    eq(readers('isWholeHours'), { saveChangeOrder: 2 }, 'isWholeHours\' reader: a change order (both roles)');
    ['function roundQuarter(', 'function isQuarterHours(', 'declutterHoursRefusal'].forEach((n) => lacks(LIVE, n, 'P17\'s ' + n.replace('function ', '').replace('(', '') + ' is retired'));
    eq((LIVE.match(/\* *4\) *\/ *4|\* *2\) *\/ *2/g) || []).length, 0, 'no second rounding of hours written by hand');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ B1 · the price moves, measured through the real engine: P16\'s figures come back where nothing else moved');
  {
    const ES = tryE(() => run('cleanout')), HC = tryE(() => run('home_cleanout'));
    eq([ES.totTC, ES.totPS, ES.havellinTotal], [60, 90, 18000],
       '⚠⚠ a standard Estate Settlement, 3,500 sq ft, seven rooms at their defaults: 60 / 90 hours, $18,000 (P16\'s figure; P17 $17,775 at 59 / 89.25)');
    eq([HC.totTC, HC.totPS, HC.havellinTotal], [41, 61, 12250], '⚠⚠ a Home Cleanout: 41 / 61 hours, $12,250 (P16\'s figure; P17 $12,012.50 at 39.75 / 60.5)');
    const PR = tryE(() => run('cleanout', { prem: true }));
    eq([PR.totTC, PR.totPS, PR.havellinTotal], [60, 90, 22350],
       'a Premium Estate Settlement: the standard hours at $185 / $125, $22,350 (P17 $22,071.25; P16 $26,975 with Premium\'s 25 hours, which stay gone)');
    const AP = tryE(() => run('cleanout', { prem: true, lines: [{ type: 'Art Appraiser' }] }));
    const OA = tryE(() => run('cleanout', { prem: true, lines: [{ type: 'Online Auction House' }] }));
    const AH = tryE(() => run('cleanout', { prem: true, lines: [{ type: 'Auction House' }] }));
    eq([AP.havellinTotal, OA.havellinTotal, AH.havellinTotal], [22720, 23460, 22905],
       'with an appraiser $22,720 (+$370), an online auction $23,460 (+$1,110), an auction house $22,905 (+$555): P17\'s touches, whole hours');
    const L1 = tryE(() => run('home_cleanout', { lines: [{ type: 'Estate Sale Company', cost: 3000 }] }));
    eq([L1.totTC, L1.havellinTotal], [42, 12400], 'a Home Cleanout with an estate sale company: 42 concierge hours, $12,400 (P17 $12,237.50; P16 $12,850 at 8 touches)');
    const PP0 = tryE(() => run('probate', { prem: true })), PP1 = tryE(() => run('probate', { prem: true, lines: [{ type: 'Art Appraiser' }] }));
    eq([PP0.havellinTotal, PP1.havellinTotal], [26135, 26505], 'a Premium Probate $26,135, and $26,505 with an appraiser (P17 $25,825 / $26,195)');
    const FX = tryE(() => run('cleanout', { prem: true, seed: { 'e-fixed': { checked: true } }, lines: [{ type: 'Art Appraiser' }] }));
    eq(FX.fixedSuggested, 27264, 'the Premium fixed-fee suggestion with an appraiser $27,264 (P17 $26,929.50)');
    const CX = tryE(() => run('cleanout', { rooms: BASE.map((n) => ({ name: n, cplx: 5 })) }));
    const CXP = tryE(() => run('cleanout', { prem: true, rooms: BASE.map((n) => ({ name: n, cplx: 5 })) }));
    eq([CX.havellinTotal, CXP.havellinTotal], [18450, 22905], 'complexity 5 throughout: $18,450, and $22,905 with Premium on (P17 $18,300 / $22,718.75)');
    // The move day: up to the whole hour, where it was to the tenth (and to the quarter for P17's day).
    const HT = tryE(() => run('downsizing_move', { job: { destSqft: 2350 } }));
    eq([HT.destTC, HT.destPS, HT.totTC, HT.totPS, HT.havellinTotal], [13, 22, 56, 64, 14800],
       '⚠⚠ a Home Transition to a 2,350 sq ft home: move day 13 concierge / 22 specialist hours (12.7 / 21.2 before P17, 12.75 / 21.25 on P17), 56 / 64 billed, $14,800 (P16 $14,700)');
    // Every service, every billed and destination figure whole.
    ['downsizing', 'downsizing_move', 'home_cleanout', 'cleanout', 'probate', 'contested_probate'].forEach((svc) => {
      const e = tryE(() => run(svc, { job: { destSqft: 2350 } }));
      ok(!e.err, svc + ': priced through the real engine' + (e.err ? ' — ' + e.err : ''));
      eq([e.totTC, e.totPS, e.destTC || 0, e.destPS || 0].map((h) => Number.isInteger(h)), [true, true, true, true],
         '⚠ ' + svc + ': every billed hour is whole (' + [e.totTC, e.totPS, e.destTC || 0, e.destPS || 0].join(' / ') + ')');
      eq([C(e.tcFee), C(e.psFee)], [C(e.totTC * e.tcRate), C(e.totPS * e.psRate)], svc + ': and each fee is those hours at the rate');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ B1 · every hour a client document prints for an estimate is whole, and its rows add up — Home Transition');
  {
    const HT = tryE(() => run('downsizing_move', { job: { destSqft: 2350 } }));
    const JOB = { id: 31, hvlId: 'HVL-0311', name: 'Ada Vale', svc: 'downsizing_move', addr: '3 Palm Way', tc: 'Anthony Graziano', status: 'won', won: true,
                  email: 'ada@example.com', destSqft: 2350, payments: [] };
    const c = docs(HT, JOB);
    const e = Object.assign({}, HT, { jobId: JOB.id });
    const ce = html(attempt(() => c.clientEstimateHtml(e, JOB)));
    const rows = hourRows(ce);
    eq(rows.length, 4, 'fixture: the estimate prints four hours rows, on site and move day, each role (' + rows.map((r) => r.hrs).join(' / ') + ')');
    eq(rows.map((r) => Number.isInteger(r.hrs)), [true, true, true, true], '⚠⚠ every hours figure on the client estimate is a whole number');
    eq(rows.map((r) => r.hrs), [HT.totTC - HT.destTC, HT.totPS - HT.destPS, HT.destTC, HT.destPS], 'on site is the billed total less the move day, for each role');
    eq(rows.map((r) => r.amt), rows.map((r) => C(r.hrs * r.rate / 100)), '⚠ each row is its hours at its rate');
    eq(rows.reduce((a, r) => a + r.amt, 0), C(HT.tcFee) + C(HT.psFee), '⚠⚠ and the four rows add up to the two fees the total counts');
    has(text(ce), 'Havellin Services Total ' + c.fmt(HT.havellinTotal), 'under the total they make');
    // Exhibit A is the same page inside the packet.
    const pk = html(attempt(() => c.signingPacketHtml(JOB.id)));
    has(pk, 'Exhibit A', 'fixture: the signing packet carries Exhibit A');
    const xr = hourRows(pk.slice(pk.indexOf('packet-exhibit')));
    eq(xr.map((r) => [r.hrs, r.amt]), rows.map((r) => [r.hrs, r.amt]), '⚠ Exhibit A prints the same whole hours and amounts');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠ B1 · the internal worksheet adds up to the whole hours; the per-step breakdown is internal and sums to them');
  {
    const ES = tryE(() => run('cleanout'));
    const job = { id: 7, hvlId: 'HVL-0007', name: 'Butler', svc: 'cleanout' };
    let out = null;
    attempt(() => sandbox({ fns: ['exportEstimateToDrive', 'estimateIsFeeOnly', 'estDeclutterHrs', 'estDeclutterHrsQuoted', 'prepFeeRate', 'fmt', 'esc', 'estimateDocNames', '_todayStr', '_ymdLocal', 'roundCents', 'fmtHrs'],
      vars: ['PREP_FEE_RATE'], stubs: { jobs: [job], resolveSubfolderId: (j, name, cb) => cb('F1'),
        uploadHtmlToDrive: (folder, name, h) => { out = { name, html: h }; }, showSyncBadge() {} } }).exportEstimateToDrive(job.id, ES));
    const w = (out && out.html) || '';
    has(w, 'Internal worksheet — not a client document', 'fixture: the worksheet says it is internal');
    const foot = text(w.slice(w.lastIndexOf('<div style="margin-top:20px;font-size:14px;">')));
    has(foot, 'TC: 60 hrs | PS: 90 hrs', '⚠ its footer states the whole hours billed');
    // The rooms' hands-on hours plus the job-level row are the billed total.
    const rTC = (ES.rooms || []).reduce((a, r) => a + (r.tcH || 0), 0), rPS = (ES.rooms || []).reduce((a, r) => a + (r.psH || 0), 0);
    const jl = /Job-level work\s*([\d.]+) TC \/ ([\d.]+) PS/.exec(text(w)) || [];
    eq([Math.round((rTC + parseFloat(jl[1])) * 100) / 100, Math.round((rPS + parseFloat(jl[2])) * 100) / 100], [60, 90],
       '⚠ the room rows and the job-level row add up to the 60 / 90 billed');
    // The per-step breakdown under Build Estimate's fee lines: scaled to the billed (whole) figure, read by the worksheet only.
    const S = sandbox({ fns: ['_scaleHoursParts'] });
    const parts = S._scaleHoursParts([{ label: 'a', hrs: 12.34 }, { label: 'b', hrs: 40.5 }, { label: 'c', hrs: 7.77 }], 90);
    eq(Math.round(parts.reduce((a, p) => a + p.hrs, 0) * 10) / 10, 90, 'the breakdown\'s parts sum to the whole hours billed');
    const bdAt = {};
    for (const m of LIVE.matchAll(/hoursBreakdown/g)) { const f = enclosing(m.index); bdAt[f] = (bdAt[f] || 0) + 1; }
    eq(bdAt, { calcAll: 1, exportEstimateToDrive: 1 }, '⚠ and only Build Estimate (which writes it) and the internal worksheet read it: no client document');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ B2 · the declutter box: whole hours, rounded up — a typed 5.5 is priced and saved as 6, and flagged, never refused');
  {
    const G = (v, svc) => sandbox({ fns: ['getDeclutterTCHrs', 'currentSvc', 'roundUpHours'], vars: ['DECLUTTER_MAX_HRS'],
      stubs: { document: domStub({ 'e-declutter-hrs': { value: v }, 'e-svc': { value: svc || 'prep' } }) } }).getDeclutterTCHrs();
    eq(['5.5', '5', '0.2', '6', '', '0', '45', '39.5'].map((v) => G(v)), [6, 5, 1, 6, 0, 0, 40, 40], '⚠⚠ 5.5 is priced as 6, 0.2 as 1; the cap stays 40');
    eq(G('5.5', 'cleanout'), 0, 'and nothing on a labour job, whatever the hidden box holds');
    const F = (v) => sandbox({ fns: ['declutterHoursFlag', 'roundUpHours', 'esc'], vars: ['DECLUTTER_MAX_HRS'],
      stubs: { document: domStub({ 'e-declutter-hrs': { value: v } }) } }).declutterHoursFlag();
    eq(F('5.5'), 'Estimates round up to whole hours: 5.5 is priced as 6.', '⚠⚠ the flag says what a typed 5.5 is priced at');
    eq(F('0.25'), 'Estimates round up to whole hours: 0.25 is priced as 1.', 'and a quarter');
    eq(['', '0', '5', '40', 'x'].map(F), ['', '', '', '', ''], 'a whole number or nothing raises no flag');
    // ⚠ Past the 40-hour cap a part hour is priced at 40 (getDeclutterTCHrs), so "45.5 is priced as 46" would be false: the
    // rounding flag stays silent there. Restated P22: the cap is said instead, which nothing on screen did.
    eq(F('45'), 'The declutter box takes at most 40 hours: 45 is priced as 40.', '⚠ past the cap, the cap is said');
    eq(F('45.5'), 'The declutter box takes at most 40 hours: 45.5 is priced as 40.', '⚠ and a part hour past the cap is not flagged as rounded up: it is priced at the cap, 40');
    // The real engine: the snapshot, the billed hours and the hint are one figure.
    const pb = attempt(() => { const d = driveCalcAll({ svc: 'prep', sqft: 3500, rooms: [], seed: { 'e-declutter-hrs': '5.5' } });
      d.ctx.prepItems.push({ type: 'Painting', cost: 20000, note: '', lid: 'p1' }); d.ctx.calcAll(); return d; });
    const P = pb.ok ? pb.val.ctx.currentEstimate : {};
    eq([P.declutterTCHrs, P.totTC, P.tcFee, P.prepFee, P.havellinTotal], [6, 6, 900, 6000, 6900],
       '⚠⚠ 5.5 typed: the snapshot holds 6, the estimate bills 6 × $150 = $900, the total $6,000 + $900 = $6,900 (P17 $825 / $6,825)');
    const hint = pb.ok ? text(pb.val.doc.getElementById('e-declutter-hint').innerHTML) : '';
    has(hint, 'Estimates round up to whole hours: 5.5 is priced as 6.', '⚠⚠ the hint beside the box flags it before Save');
    has(hint, '6.0 hrs × $150 = $900', 'and prices the 6 hours');
    lacks(hint, 'Save refuses', 'and refuses nothing');
    has(pb.ok ? pb.val.doc.getElementById('e-declutter-hint').innerHTML : '', 'color:var(--warn-tx)', 'in the flag\'s amber, not the error red');
    // Save Estimate: the 5.5 is not refused; the record written is the 6 the estimate priced.
    const said = [], wrote = [];
    const S = sandbox({ fns: ['saveEstimateAndPreview', 'estDeclutterHrs', 'fmtHrs', 'fmt', 'esc', 'prepFeeRate', 'roundCents'],
      vars: ['PREP_FEE_RATE'],
      stubs: { document: domStub({ 'e-job': { value: '3' }, 'e-declutter-hrs': { value: '5.5' } }), jobs: [{ id: 3, svc: 'prep', status: 'new' }],
               estimateStore: {}, estimateApproved: false, estimateSubmitted: false, approvedBy: '', approvedAt: '',
               currentEstimate: Object.assign({}, P, { jobId: 3 }), estimateContractBlocker: () => null, estimateEventStatus: (j, s) => s,
               showFB: (id, k, m) => said.push(k + ':' + m), saveJobs() {}, syncJobToSheets() {}, setTimeout: () => 0,
               saveEstimateState: () => wrote.push('WROTE') } });
    const sv = attempt(() => S.saveEstimateAndPreview());
    ok(sv.ok, 'Save Estimate runs' + (sv.ok ? '' : ' — ' + sv.err));
    eq(wrote, ['WROTE'], '⚠⚠ Save Estimate writes the estimate with 5.5 in the box (P17 refused it)');
    has(said.join(' | '), '+ 6.0 declutter hrs · total $6,900', 'and its summary names the 6 hours saved');
    eq(S.currentEstimate.declutterTCHrs, 6, 'the record holds 6');
    // Submit: no declutter question at all.
    const sub = [];
    const U = sandbox({ fns: ['submitForApproval'],
      stubs: { document: domStub({ 'e-declutter-hrs': { value: '5.5' } }), jobs: [{ id: 3, svc: 'prep', status: 'new' }], estimateSubmitted: false,
               REQUIRE_WALKTHROUGH_NOTES: true, currentEstimate: Object.assign({}, P, { jobId: 3, rooms: [] }), estimateSubmitBlocker: () => null,
               estimateEventStatus: (j, s) => s, showFB: (id, k, m) => sub.push(m), saveEstimateState: () => sub.push('WROTE'), saveJobs() {},
               syncJobToSheets() {}, updateApprovalUI() {}, notifyManagerForApproval: () => sub.push('NOTIFIED') } });
    const out = attempt(() => U.submitForApproval());
    eq(out.ok ? out.val : out.err, null, '⚠⚠ Submit is not refused by a 5.5 in the box');
    eq(sub, ['WROTE', 'NOTIFIED'], 'it writes the estimate and asks the manager');
    // The documents read the one figure: the Home Prep page and agreement §3.3.
    const JOB = { id: 9, hvlId: 'HVL-0091', name: 'Marston', svc: 'prep', addr: '1 Ocean Blvd', tc: 'Anthony Graziano', status: 'won', won: true,
                  email: 'm@example.com', payments: [] };
    const c = docs(P, JOB);
    const e = Object.assign({}, P, { jobId: JOB.id });
    const ce = text(html(attempt(() => c.clientEstimateHtml(e, JOB))));
    has(ce, 'hands-on clearing of the rooms (6.0 hrs × $150/hr) $900', '⚠⚠ the Home Prep page reads 6.0 hrs × $150 = $900');
    has(ce, 'Havellin Services Total $6,900', '⚠⚠ above a total that counts exactly it: $6,000 + $900');
    eq(C(P.prepFee) + C(900), C(6900), 'and the fee and the hours add up to it');
    const ag = flat(html(attempt(() => c.agreementHtml(JOB, e))));
    has(ag, 'the Estimate provides for 6.0 hours ($900) on that basis', '⚠ agreement §3.3 states the same 6 hours and $900');
    has(noComments(SRC.slice(SRC.indexOf('<input type="number" id="e-declutter-hrs"'), SRC.indexOf('<input type="number" id="e-declutter-hrs"') + 140)), 'step="1"', 'the box steps by 1');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ B3 · the hours log: half hours for everyone, refused where the record is written, each row named');
  {
    const H = sandbox({ fns: ['isHalfHours'] });
    eq([0.5, 1, 1.5, 7, 0, -1.5, 24].map((h) => H.isHalfHours(h)), [true, true, true, true, true, true, true], 'half hours are half hours');
    eq([1.25, 2.3, 0.75, 0.1, 2.25, NaN].map((h) => H.isHalfHours(h)), [false, false, false, false, false, false], 'a quarter, a tenth and nothing are not');
    const crew = { tc: { name: 'Ashley Jerome', locked: false }, tc2: { name: 'Anthony Graziano', locked: false },
                   ps: [{ name: 'Anthony Graziano Jr', locked: false }, { name: 'Specialist 2', locked: false }], confirmed: true };
    const save = (seed) => {
      const said = [];
      const dom = domStub(Object.assign({ 'log-job': { value: '21' }, 'log-date': { value: '2026-10-02' }, 'log-activity': { value: 'Kitchen sort' } }, seed));
      const c = sandbox({ fns: ['saveLogEntry', 'isCrewPlaceholder', 'roundCents', 'isHalfHours', 'esc'], vars: ['CONTRACTOR_TC_NAME', 'LOG_PLACEHOLDER_NAMES', 'jobLogs'],
        stubs: { document: dom, jobs: [{ id: 21, status: 'active' }], getJobCrew: () => crew, isJobFunded: () => true,
                 depositTargetFor: () => 0, depositPaidTotal: () => 0, fmt: (n) => '$' + n,
                 showFB: (id, kind, msg) => said.push(kind + ':' + msg), saveLogData() {}, lockAssignedCrew() {}, clearLogEntry() {},
                 buildLogTeamRows() {}, updateLogSummary() {}, renderLogHistory() {}, renderProjection() {}, _repaintHoursReadouts() {}, Date } });
      c.saveLogEntry();
      return { logs: c.jobLogs[21] || [], said: said.join(' | ') };
    };
    const crewQ = save({ 'log-m0-name': { value: 'Ashley Jerome' }, 'log-m0-hrs': { value: '7' }, 'log-m1-name': { value: 'Anthony Graziano Jr' }, 'log-m1-hrs': { value: '1.25' } });
    eq(crewQ.logs.length, 0, '⚠⚠ 1.25 hours on a crew row are refused: nothing is written');
    has(crewQ.said, 'Hours are logged in half hours (0.5, 1.0, 1.5 …). Not a half hour: Anthony Graziano Jr (1.25). Correct it and save again; nothing was saved.',
        '⚠⚠ and the refusal names the row');
    const crewH = save({ 'log-m0-name': { value: 'Ashley Jerome' }, 'log-m0-hrs': { value: '7' }, 'log-m1-name': { value: 'Anthony Graziano Jr' }, 'log-m1-hrs': { value: '1.5' } });
    eq(((crewH.logs[0] || {}).members || []).map((m) => m.role + ':' + m.hours).join(' '), 'TC:7 PS:1.5', '⚠⚠ 1.5 on the crew row is logged, exactly');
    const tcQ = save({ 'log-m0-name': { value: 'Ashley Jerome' }, 'log-m0-hrs': { value: '2.25' } });
    eq(tcQ.logs.length, 0, '⚠ the concierge row is asked the same question: 2.25 (P17\'s quarter) is refused');
    has(tcQ.said, 'Not a half hour: Ashley Jerome (2.25)', 'naming it');
    const tc2Q = save({ 'log-m0-name': { value: 'Ashley Jerome' }, 'log-m0-hrs': { value: '2.5' }, 'log-tc2-name': { value: 'Anthony Graziano' }, 'log-tc2-hrs': { value: '0.75' } });
    eq(tc2Q.logs.length, 0, '⚠ and the second concierge\'s row: 0.75 is refused, the good 2.5 beside it is not written either');
    has(tc2Q.said, 'Not a half hour: Anthony Graziano (0.75)', 'naming them');
    const many = save({ 'log-m0-name': { value: 'Ashley Jerome' }, 'log-m0-hrs': { value: '2.3' }, 'log-m1-name': { value: 'Anthony Graziano Jr' }, 'log-m1-hrs': { value: '1.25' },
                        'log-m2-name': { value: 'Specialist 2' }, 'log-m2-hrs': { value: '4' } });
    has(many.said, 'Not a half hour: Ashley Jerome (2.3), Anthony Graziano Jr (1.25). Correct them and save again; nothing was saved.', 'every refused row is named at once');
    const all = save({ 'log-m0-name': { value: 'Ashley Jerome' }, 'log-m0-hrs': { value: '8' }, 'log-tc2-name': { value: 'Anthony Graziano' }, 'log-tc2-hrs': { value: '1.5' },
                       'log-m1-name': { value: 'Anthony Graziano Jr' }, 'log-m1-hrs': { value: '7.5' }, 'log-m2-name': { value: 'Specialist 2' }, 'log-m2-hrs': { value: '0.5' } });
    eq(((all.logs[0] || {}).members || []).map((m) => m.role + ':' + m.hours).join(' '), 'TC:8 PS:7.5 PS:0.5 TC:1.5', 'half hours on every row are logged as typed');
    // Every log box steps by a half hour.
    const rows = noComments(fn('buildLogTeamRows'));
    const tags = (s) => [...s.matchAll(/<input[^>]*>/g)].map((m) => m[0]);
    ['id="log-m0-hrs"', 'id="log-tc2-hrs"', 'id="log-m\'+i+\'-hrs"'].forEach((id) => {
      const t = tags(rows).filter((x) => x.indexOf(id) >= 0);
      eq(t.length, 1, 'fixture: the hours log draws ' + id);
      has(t[0] || '', 'step="0.5"', '⚠ the hours log\'s ' + id + ' steps by 0.5');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ B4 · a change order is in whole hours, either role, either sign');
  {
    const W = sandbox({ fns: ['isWholeHours'] });
    eq([1, 3, 0, -2, 40].map((h) => W.isWholeHours(h)), [true, true, true, true, true], 'whole hours, a reduction included');
    eq([2.5, 0.5, -1.5, 2.25, NaN].map((h) => W.isWholeHours(h)), [false, false, false, false, false], 'a half, a quarter and nothing are not');
    const EST_TM = { jobId: 1, tcFee: 12000, psFee: 6000, pkgCost: 0, smf: 0, prepFee: 0, havellinTotal: 18000, tcRate: 150, psRate: 100,
                     discountPct: 0, fixedPrice: false, rush: false, vendors: [], prepItems: [], svc: 'cleanout', totTC: 80, totPS: 60 };
    const co = (tc, ps) => {
      const dom = domStub({ 'co-jobid': { value: '1' }, 'co-description': { value: 'Garage' }, 'co-tc-hrs': { value: tc }, 'co-ps-hrs': { value: ps },
                            'co-reason': { value: 'scope_add' } });
      const c = sandbox({ fns: ['saveChangeOrder', '_coJobBasis', 'agrBillingRates', 'coPrepVendorsOn', '_agrHasPrepVendors', 'estFixedFee',
          'estPrepFeeOnTop', 'estFixedLines', 'coRushPctFor', 'coPriorHours', '_coPriorAccepted', 'coHours', 'coScopeLabel', 'coHoursLabel',
          'coVendorAdds', 'coVendorAddsTxt', 'isWholeHours', 'roundCents', 'fmtHrs', 'fmt', 'esc', 'prepFeeRate'],
        vars: ['RUSH_PCT', 'PREP_FEE_RATE'],
        stubs: { document: dom, jobs: [{ id: 1, svc: 'cleanout', status: 'active' }], changeOrders: [],
                 estimateStore: { 1: { estimate: EST_TM, approved: true } }, currentEstimate: null, saveChangeOrders() {}, renderJobs() {},
                 _docNotice() {}, _srcLid: () => 'L1', coDraftVendorAdd: () => null } });
      attempt(() => c.saveChangeOrder());
      return { cos: c.changeOrders, fb: text(dom.getElementById('co-fb').innerHTML || '') };
    };
    const r1 = co('2.5', '');
    eq(r1.cos.length, 0, '⚠⚠ 2.5 concierge hours are refused: nothing is saved');
    has(r1.fb, 'Change orders are in whole hours (1, 2, 3 …): concierge 2.5 is not a whole hour. Nothing was saved.', '⚠⚠ and the refusal names it');
    const r2 = co('3', '-1.5');
    eq(r2.cos.length, 0, 'a specialist reduction of 1.5 is refused the same way');
    has(r2.fb, 'specialist -1.5 is not a whole hour', 'naming it');
    const r3 = co('2.5', '0.5');
    has(r3.fb, 'concierge 2.5 and specialist 0.5 are not whole hours', 'both at once');
    const r4 = co('3', '-2');
    eq(r4.cos.map((x) => [x.tcHrs, x.psHrs]), [[3, -2]], '⚠⚠ 3 and −2 are saved');
    const tags = [...SRC.matchAll(/<input[^>]*>/g)].map((m) => m[0]);
    ['co-tc-hrs', 'co-ps-hrs'].forEach((id) => {
      const t = tags.filter((x) => x.indexOf('id="' + id + '"') >= 0);
      eq(t.length, 1, 'fixture: #' + id + ' is in the markup once');
      has(t[0] || '', 'step="1"', '#' + id + ' steps by 1');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠ B5 · recorded coordination hours on the Job Plan: half hours, like the log');
  {
    const notes = [];
    const K = sandbox({ fns: ['setJobVendorCoordHrs', '_coordHrsRefusal', 'isHalfHours'],
      stubs: { _svcJob: () => ({ rec: { coordHrs: 1 }, job: { id: 1 }, bucket: 'vendorSourcing', key: 'La' }), alert: (m) => notes.push(m),
               refreshVendorSourcing() {}, _saveJobEdit: () => notes.push('SAVED') } });
    K.setJobVendorCoordHrs(1, 0, '1.25');
    eq(notes.filter((x) => x === 'SAVED'), [], '⚠ recorded coordination of 1.25 hours is refused before anything is written');
    has(notes[0] || '', 'Coordination hours are recorded in half hours (0.5, 1.0, 1.5 …): 1.25 is not one. Nothing was saved.', 'and says so');
    K.setJobVendorCoordHrs(1, 0, '1.5');
    eq(notes.filter((x) => x === 'SAVED').length, 1, 'and 1.5 is recorded');
    ['setPrepVendorCoordHrs', 'setLogisticsCoordHrs'].forEach((n) => has(noComments(fn(n)), 'var _why = _coordHrsRefusal(val); if (_why) {', n + ' asks the same question first'));
    has(noComments(fn('_coordHrsField')), '<input type="number" step="0.5"', 'the box steps by 0.5');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ B6 · an invoice bills the hours as logged, an older quarter entry included; money stays to the cent');
  {
    const EST = { svc: 'cleanout', totTC: 13, totPS: 16, tcFee: 1950, psFee: 1600, tcRate: 150, psRate: 100, pkgCost: 0, pkgLabel: 'None — $0',
                  smf: 0, prepItems: [], prepEnabled: false, prepCost: 0, prepFee: 0, havellinTotal: 3550, fixedPrice: false, rush: false,
                  discountPct: 0, discountAmt: 0, vendors: [], rooms: [], preparedBy: 'Anthony Graziano', rushExPrepFee: true };
    const JOB = { id: 6, hvlId: 'HVL-0061', name: 'Lee', svc: 'cleanout', addr: '3 Palm Way', tc: 'Anthony Graziano', status: 'active', won: true,
                  executor: 'Pat Lee', executorRole: 'Personal Representative', executorEmail: 'p@example.com', payments: [] };
    // A day logged in half hours today, and one logged on P17's day in quarters.
    const LOGS = [{ date: '2026-10-01', activity: 'work', members: [{ name: 'Anthony Graziano', role: 'TC', hours: 2.25 }, { name: 'Specialist 1', role: 'PS', hours: 7.75 }] },
                  { date: '2026-10-02', activity: 'work', members: [{ name: 'Anthony Graziano', role: 'TC', hours: 10.5 }, { name: 'Specialist 1', role: 'PS', hours: 8 }] }];
    const c = docs(EST, JOB, LOGS);
    const fin = attempt(() => c.invoiceHtml(c.jobs[0], 'final'));
    const t = text(fin.ok ? fin.val.html : '');
    has(t, 'Anthony Graziano TC 12.75 $150/hr $1,912.50', '⚠⚠ the concierge\'s 10.5 + 2.25 hours bill exactly 12.75 × $150 = $1,912.50, never rounded');
    has(t, 'Specialist 1 PS 15.75 $100/hr $1,575', 'a specialist\'s 8 + 7.75 at exactly $1,575');
    has(t, 'Havellin Services Total $3,487.50', 'under a total that is their sum, to the cent');
    has(noComments(fn('invoiceHtml', 'jobLogEntries')), 'roundCents(actTC * tcRate)', 'the invoice prices the hours as logged, to the cent');
    eq((LIVE.match(/fmt\(Math\.round\(/g) || []).length, 0, 'P17\'s net holds: nothing rounds money to the dollar before printing it');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠⚠ B7 · the agreements say "Time is recorded and billed in half-hour increments, as worked." where time is billed');
  {
    const LINE = 'Time is recorded and billed in half-hour increments, as worked.';
    eq(sandbox({ vars: ['TIME_INCREMENT_TXT'] }).TIME_INCREMENT_TXT, LINE, 'one sentence, one definition');
    eq(readers('TIME_INCREMENT_TXT', false), { agreementHtml: 2, probateAgreementHtml: 1 }, '⚠ read by both forms: the standard form\'s two arms that bill time, the estate form\'s one');
    const sec = (t, from, to) => { const a = t.indexOf(from); const b = a >= 0 ? t.indexOf(to, a + from.length) : -1; return a >= 0 ? t.slice(a, b > a ? b : a + 2500) : ''; };
    const living = { id: 41, hvlId: 'HVL-0411', name: 'Lee Vance', svc: 'home_cleanout', addr: '3 Palm Way', tc: 'Anthony Graziano', status: 'won', won: true, email: 'l@example.com', payments: [] };
    const estate = { id: 42, hvlId: 'HVL-0421', name: 'Estate of Ada Vale', svc: 'cleanout', addr: '9 Palm Way', tc: 'Anthony Graziano', status: 'won', won: true,
                     executor: 'Mark Vale', executorRole: 'Personal Representative', executorEmail: 'm@example.com', matterType: 'probate', docTier: 'values', payments: [] };
    const prepJ = { id: 43, hvlId: 'HVL-0431', name: 'Sam Marston', svc: 'prep', addr: '1 Ocean Blvd', tc: 'Ashley Jerome', status: 'won', won: true, email: 's@example.com', payments: [] };
    const agr = (est, job) => { const c = docs(est, job); return flat(html(attempt(() => (c.isDecedentJob(job) ? c.probateAgreementHtml(job, Object.assign({}, est, { jobId: job.id }))
                                                                                      : c.agreementHtml(job, Object.assign({}, est, { jobId: job.id })))))); };
    // Standard form, hourly.
    const HC = tryE(() => run('home_cleanout'));
    const sH = sec(agr(HC, living), '3.3 Hourly and Project Rates.', '3.4 Third-Party Vendors.');
    ok(sH.length > 50, 'fixture: the hourly §3.3 is printed');
    has(sH, 'All rates are inclusive of on-site project oversight, client liaison, and vendor coordination. ' + LINE, '⚠⚠ the standard form\'s hourly §3.3 says it, after the rates');
    // Standard form, fixed fee: not a word of it.
    const HCF = tryE(() => run('home_cleanout', { seed: { 'e-fixed': { checked: true } } }));
    const aF = agr(HCF, living);
    has(aF, '3.3 Fixed Project Fee.', 'fixture: the fixed-fee §3.3 is printed');
    lacks(aF, 'half-hour increments', '⚠⚠ and a fixed fee, which bills no time, never says it');
    // Standard form, Home Prep with declutter hours, and without.
    const pb = attempt(() => { const d = driveCalcAll({ svc: 'prep', sqft: 3500, rooms: [], seed: { 'e-declutter-hrs': '5.5' } });
      d.ctx.prepItems.push({ type: 'Painting', cost: 20000, note: '', lid: 'p1' }); d.ctx.calcAll(); return d.ctx.currentEstimate; });
    const sP = sec(agr(pb.ok ? pb.val : {}, prepJ), '3.3 Basis of Fee.', '3.4 Third-Party Vendors.');
    has(sP, 'the Estimate provides for 6.0 hours ($900) on that basis. ' + LINE + ' No Property Specialist hours are billed on this engagement',
        '⚠⚠ the Home Prep §3.3 that bills declutter hours says it, after the hours it provides for');
    const p0 = attempt(() => { const d = driveCalcAll({ svc: 'prep', sqft: 3500, rooms: [] });
      d.ctx.prepItems.push({ type: 'Painting', cost: 20000, note: '', lid: 'p1' }); d.ctx.calcAll(); return d.ctx.currentEstimate; });
    const s0 = sec(agr(p0.ok ? p0.val : {}, prepJ), '3.3 Basis of Fee.', '3.4 Third-Party Vendors.');
    has(s0, 'No Transition Concierge or Property Specialist hours are billed on this engagement', 'fixture: the fee-only Home Prep §3.3');
    has(s0, 'those hours are then billed as worked at Contractor\'s Transition Concierge rate of $150/hour, in addition to the Home Sale Preparation Fee, and that time is recorded and billed in half-hour increments.',
        '⚠ and its change-order hours carry the increment, in that clause\'s own words');
    // Estate form: the IMPORTANT paragraph on the hourly arm; never on the fixed one.
    const ES = tryE(() => run('cleanout'));
    const eH = agr(ES, estate);
    has(eH, 'IMPORTANT: Final billing reflects actual hours worked and materials used. ' + LINE + ' If actual hours are projected to exceed the estimate',
        '⚠⚠ the estate form\'s §3.2 says it on its hourly arm');
    const ESF = tryE(() => run('cleanout', { seed: { 'e-fixed': { checked: true } } }));
    const eF = agr(ESF, estate);
    has(eF, 'IMPORTANT: This engagement is billed at the fixed price stated above', 'fixture: the estate form\'s fixed arm');
    lacks(eF, 'half-hour increments', '⚠⚠ which never says it');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  group('⚠ every hours box steps by its unit: whole hours where an estimate is made, half hours where work is logged');
  {
    const tags = (s) => [...s.matchAll(/<input[^>]*>/g)].map((m) => m[0]);
    const hourBoxes = tags(SRC).filter((t) => /type=\\?"number"/.test(t) && /hrs|hours/i.test(t));
    ok(hourBoxes.length >= 6, 'fixture: the hours boxes are found (' + hourBoxes.length + ')');
    eq(hourBoxes.filter((t) => /step="0\.25"/.test(t)), [], '⚠ none steps by a quarter any more');
    eq(hourBoxes.filter((t) => !/step="(1|0\.5)"/.test(t)), [], 'every one steps by a whole or a half hour');
    eq(hourBoxes.filter((t) => /step="1"/.test(t)).map((t) => (/id="([^"]+)"/.exec(t) || [])[1]).sort(), ['co-ps-hrs', 'co-tc-hrs', 'e-declutter-hrs'],
       'whole hours: the declutter box and the change order\'s two');
  }
};
