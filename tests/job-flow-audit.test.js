'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// THE JOB-FLOW AUDIT (2026-10-08). Anthony: "run through a job in each category … make sure the actual operational job
// of the transition concierge and the property specialist is not overly complicated … find inconsistencies or bugs".
// Seven whole jobs ran through the real controls (Home Transition, Home Editing, Home Cleanout, two Home Preps, a trust
// estate, a probate, a contested probate and a walkaway). These are the defects that met the triage bar's FIX NOW
// (wrong money, wrong party or legal wording, lost data, a job with no way forward), each driven through the real code.
//
//   1. A fee-only Home Prep's invoices bill no hours: its agreement's §3.3 says "No Transition Concierge or Property
//      Specialist hours are billed on this engagement", and its final printed an empty hours table under "Actual
//      Hours", its deposit and second a "Havellin labor (estimate) $0" row.
//   2. A fixed price logs hours for the record, and its final never waits on them: the Job Plan's close-out and the
//      desk said "the final invoice trues to the log" and "cannot issue without them".
//   3. A deposit cheque handed over with the signed agreement can be recorded there and then: Record payment was offered
//      only once a deposit invoice had been drafted and confirmed sent, and a deposit in hand now answers that invoice.
//   4. The living client's Contents Record claims only what the record holds: "Every line was photographed" and
//      "Photographs of every item are in the Drive folder shared with you" printed whatever the record said, and its
//      header printed "Prepared by Havellin Palm Beach, LLC" twice.
//   5. The fixed-fee blurb on the client estimate names moving materials only where a package is priced: a cleanout
//      quoted with the package at None read "Moving materials and all vendor coordination are included".
//
// Everything is driven through the real functions; each sandbox is the root's own call graph, derived from the source,
// with unrelated state supplied at named boundaries — never the rule under test.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source, fn, decl, domStub } = require('./harness');

const SRC = source();
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");

// The functions and top-level vars `roots` reach. `stop` names what the test supplies itself (a var listed there is not
// lifted, so its initialiser cannot overwrite the stub).
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
  return { fns: [...fns], vars: [...vars] };
}
function lift(roots, stop, stubs) {
  const c = closure(roots, stop);
  return sandbox({ fns: c.fns, vars: c.vars, stubs: stubs || {} });
}
// A call that may throw on the unfixed code: a revert must fail its assertions, not end the file.
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }

// Markup → the text a reader sees.
const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&mdash;': '—', '&middot;': '·', '&nbsp;': ' ', '&rarr;': '→' };
const decode = (s) => String(s).replace(/&[a-z#0-9]+;/gi, (m) => (ENT[m] !== undefined ? ENT[m] : m));
const textOf = (h) => decode(String(h).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

module.exports = function ({ group, ok, eq, has, lacks }) {
  const prevTZ = process.env.TZ;
  process.env.TZ = 'America/New_York';

  // ═══ 1 · A FEE-ONLY HOME PREP'S INVOICES BILL NO HOURS ═════════════════════
  group('1 · a fee-only Home Prep invoice says what §3.3 says: no hours are billed');
  {
    const INV = lift(['invoiceHtml'], ['jobs', 'estimateStore', 'jobLogs', 'changeOrders', 'contractors', 'currentEstimate', 'currentInvStage'],
      { jobs: [], estimateStore: {}, jobLogs: {}, changeOrders: [], contractors: [], currentEstimate: null, currentInvStage: 'final', vendorDirectory: [] });
    const EST = (hrs) => ({ jobId: 7, svc: 'prep', totTC: hrs, totPS: 0, tcRate: 150, psRate: 100, tcFee: hrs * 150, psFee: 0,
      declutterTCHrs: hrs, prepEnabled: true, prepItems: [{ id: 'p1', type: 'Painter', cost: 10000 }], prepCost: 10000, prepFee: 3000,
      havellinTotal: 3000 + hrs * 150, pkgCost: 0, smf: 0, vendors: [], discountPct: 0, rush: false, fixedPrice: false });
    const JOB = { id: 7, name: 'Butler', hvlId: 'HVL-0007', svc: 'prep', tc: 'Anthony Graziano', status: 'active', won: true, payments: [] };
    const page = (est, logs, stage, cos) => {
      INV.jobs = [JOB]; INV.estimateStore = { 7: { estimate: est, approved: true } }; INV.jobLogs = { 7: logs || [] };
      INV.changeOrders = cos || [];
      const r = attempt(() => INV.invoiceHtml(JOB, stage));
      return { ok: r.ok && !!r.val, err: r.err, text: textOf(r.val && r.val.html), html: String(r.val && r.val.html), due: r.val && r.val.amtDue };
    };

    const fin = page(EST(0), [], 'final');
    ok(fin.ok, 'fixture: the fee-only final renders (' + (fin.err || 'ok') + ')');
    has(fin.text, 'Havellin Services — Home Sale Preparation Fee', '⚠⚠ the final heads its services with the fee, not "Actual Hours"');
    lacks(fin.text, 'Actual Hours', 'never "Actual Hours" on a job that bills none');
    lacks(fin.html, '<th>Team Member</th>', '⚠ and no empty hours table');
    has(fin.text, 'No Transition Concierge or Property Specialist hours are billed on this engagement.', '⚠⚠ it says what §3.3 says');
    lacks(fin.text, 'Final charges based on actual hours worked', 'never that charges follow the hours');
    has(fin.text, 'Services total (Home Sale Preparation Fee on actual vendor spend)', 'Anthony\'s heading on the total stays');
    has(fin.text, '$3,000', 'over the fee it bills');

    const dep = page(EST(0), [], 'deposit');
    ok(dep.ok, 'fixture: the fee-only deposit renders (' + (dep.err || 'ok') + ')');
    lacks(dep.text, 'Havellin labor', '⚠⚠ the deposit prints no "Havellin labor (estimate) $0" row');
    has(dep.text, 'The Home Sale Preparation Fee is trued to actuals at the second and final invoices.',
      '⚠ and names the second invoice by its Home Prep name, never "midpoint"');
    lacks(dep.text, 'midpoint', 'no "midpoint" anywhere on a Home Prep deposit');
    eq(dep.due, 1500, 'the money is untouched: half the $3,000 fee');

    const mid = page(EST(0), [], 'midpoint');
    ok(mid.ok, 'fixture: the fee-only second invoice renders (' + (mid.err || 'ok') + ')');
    lacks(mid.text, 'Havellin labor', '⚠ the second prints no labour row either');
    lacks(mid.text, 'hours are still being logged', '⚠⚠ and never that hours are being logged');
    has(mid.text, 'The Home Sale Preparation Fee is calculated on the actual quotes recorded in the Job Plan.', 'it says how the fee is reached');

    // A change order that added concierge hours: the job bills hours now, so the final shows them.
    const CO = [{ id: 1700000000123, jobId: 7, clientApproved: true, addTC: 4, addPS: 0, tcHrs: 4, psHrs: 0, description: 'Declutter the garage' }];
    const withCo = page(EST(0), [{ id: 1, date: '2026-09-24', members: [{ name: 'Anthony Graziano', role: 'TC', hours: 4 }] }], 'final', CO);
    ok(withCo.ok, 'fixture: a prep final with change-order hours renders (' + (withCo.err || 'ok') + ')');
    has(withCo.text, 'Actual Hours', 'with hours on the page, the hours table is back');
    has(withCo.html, '<th>Team Member</th>', '…its header too');
    lacks(withCo.text, 'No Transition Concierge or Property Specialist hours are billed', 'and it never says no hours are billed while it bills them');
    const midCo = page(EST(0), [], 'midpoint', CO);
    has(midCo.text, 'Concierge hours added by change order are billed on the final invoice, as logged.', 'the second says where the added hours are billed');

    // A prep job that priced declutter hours keeps every word it had.
    const hrs = page(EST(8), [{ id: 1, date: '2026-09-24', members: [{ name: 'Anthony Graziano', role: 'TC', hours: 6 }] }], 'final');
    has(hrs.text, 'Havellin Services — Actual Hours', 'a prep job with declutter hours keeps "Actual Hours"');
    has(hrs.text, 'Final charges based on actual hours worked as logged by the Transition Concierge.', '…and its note');
    const hrsDep = page(EST(8), [], 'deposit');
    has(hrsDep.text, 'Havellin labor (estimate)', '…and its deposit keeps the labour row');
    has(hrsDep.text, 'Vendor and home-prep fees are trued to actuals at the second and final invoices.', '…with the stage named as Home Prep names it');

    // Every other service keeps "midpoint".
    const CJ = { id: 7, name: 'Ellsworth', hvlId: 'HVL-0008', svc: 'cleanout', tc: 'Anthony Graziano', status: 'active', won: true, payments: [] };
    INV.jobs = [CJ];
    INV.estimateStore = { 7: { estimate: { jobId: 7, svc: 'cleanout', totTC: 10, totPS: 20, tcRate: 150, psRate: 100, tcFee: 1500, psFee: 2000,
      havellinTotal: 3500, pkgCost: 0, smf: 0, vendors: [], prepItems: [], discountPct: 0, rush: false, fixedPrice: false }, approved: true } };
    INV.jobLogs = { 7: [] }; INV.changeOrders = [];
    const cdep = attempt(() => INV.invoiceHtml(CJ, 'deposit'));
    has(textOf(cdep.val && cdep.val.html), 'Vendor and home-prep fees are trued to actuals at the midpoint and final invoices.', 'an estate deposit still says midpoint');
    has(textOf(cdep.val && cdep.val.html), 'Havellin labor (estimate)', '…and keeps its labour row');
  }

  // ═══ 2 · A FIXED PRICE LOGS HOURS FOR THE RECORD ═══════════════════════════
  group('2 · on a fixed price the hours line says the hours are for the record, and the final waits on nothing');
  {
    const D = lift(['planDerivedLines'], ['jobs', 'estimateStore', 'jobLogs', 'changeOrders', 'mediaStore', 'jobPlanStore', 'contractors'],
      { jobs: [], estimateStore: {}, jobLogs: {}, changeOrders: [], mediaStore: {}, jobPlanStore: {}, contractors: [], _todayStr: () => '2026-10-08' });
    const est = (fixed) => ({ svc: 'home_cleanout', totTC: 20, totPS: 40, tcFee: 3000, psFee: 4000, havellinTotal: 7000, fixedPrice: fixed,
      fixedAmount: fixed ? 9000 : 0, rooms: [], vendors: [], prepItems: [] });
    const line = (fixed, logs, key) => {
      D.jobLogs = { 7: logs || [] };
      const job = { id: 7, svc: 'home_cleanout', status: 'active', payments: [] };
      D.jobs = [job]; D.estimateStore = { 7: { estimate: est(fixed), approved: true } };
      const r = attempt(() => D.planDerivedLines(7, job, est(fixed), 'admin', '2026-10-08'));
      if (!r.ok) return { err: r.err };
      return (r.val || []).find((l) => l.key === key) || {};
    };
    const LOG = [{ id: 1, date: '2026-10-06', members: [{ name: 'Ashley Jerome', role: 'TC', hours: 6 }, { name: 'Dana Ruiz', role: 'PS', hours: 12 }] }];
    const fxNone = line(true, [], 'hours_logged');
    ok(!fxNone.err, 'fixture: planDerivedLines runs (' + (fxNone.err || 'ok') + ')');
    has(fxNone.detail, 'log them for the record; the fixed-price final does not wait on them', '⚠⚠ an empty log on a fixed price says the final does not wait');
    lacks(fxNone.detail, 'cannot issue', 'never that the final cannot issue');
    eq(fxNone.ok, false, 'the hours are still asked for (open while none are logged)');
    const fx = line(true, LOG, 'hours_logged');
    has(fx.detail, '18 hrs against 60 estimated — for the record; the fixed fee does not move with them', '⚠ logged hours on a fixed price are for the record');
    lacks(fx.detail, 'trues to the log', 'never that the final trues to the log');
    const fxFin = line(true, [], 'final_invoice_sent');
    lacks(fxFin.detail, 'once the hours are in', '⚠ the final line does not wait on hours on a fixed price');
    // An hourly job keeps every word.
    const hr = line(false, LOG, 'hours_logged');
    has(hr.detail, 'the final invoice trues to the log', 'an hourly job still trues to the log');
    has(line(false, [], 'hours_logged').detail, 'the final invoice cannot issue without them', 'and still cannot issue without them');
    has(line(false, [], 'final_invoice_sent').detail, ', once the hours are in', 'and its final line still waits on the hours');
  }

  // ═══ 3 · A DEPOSIT IN HAND IS RECORDED BEFORE ANY INVOICE ══════════════════
  group('3 · the deposit invoice row offers Record payment, and a deposit on file answers it');
  {
    const T = lift(['jobTimeline', 'jobTimelineNext', 'jobTimelineActions'],
      ['jobs', 'estimateStore', 'jobLogs', 'changeOrders', 'jobPlanStore', 'mediaStore', 'SHEETS_SYNC_URL'],
      { jobs: [], estimateStore: {}, jobLogs: {}, changeOrders: [], jobPlanStore: {}, mediaStore: {}, SHEETS_SYNC_URL: '', Intl: global.Intl,
        _todayStr: () => '2026-10-08' });
    const rec = { estimate: { svc: 'home_cleanout', havellinTotal: 10000, totTC: 20, totPS: 30, rooms: [{ idx: 0, name: 'Kitchen', vol: 3, cplx: 3 }] },
      approved: true, approvedBy: 'Anthony Graziano', savedAt: 1 };
    const signed = (pay) => ({ id: 7, name: 'Butler', svc: 'home_cleanout', status: 'won', won: true, wonAt: '2026-10-01', approved: true,
      created: 'Sep 28, 2026', walkthrough: '2026-09-30', estimateSentDate: 'October 1, 2026', agrApproved: true, agrSent: true, agrSigned: true,
      docState: { estimate: { sentAt: '2026-10-01T14:00:00Z' }, agreement: { sentAt: '2026-10-02T14:00:00Z', sig: { signedBy: 'Pat Butler', signedAt: '2026-10-03', recordedBy: 'Ashley Jerome' } } },
      estimateSentTotal: 10000, acceptedTotal: 10000, payments: pay || [] });
    const view = (job) => {
      T.jobs = [job]; T.estimateStore = { 7: rec };
      const r = attempt(() => {
        const rows = T.jobTimeline(job, rec, [], []);
        const next = T.jobTimelineNext(rows);
        const inv = rows.find((x) => x.key === 'deposit_invoiced') || {};
        return { next: next && next.key, invDone: !!inv.done, acts: next ? T.jobTimelineActions(next, job, rec) : null };
      });
      return r.ok ? r.val : { err: r.err };
    };
    const before = view(signed());
    ok(!before.err, 'fixture: the timeline runs (' + (before.err || 'ok') + ')');
    eq(before.next, 'deposit_invoiced', 'fixture: a signed job with nothing paid is lit on the deposit invoice');
    const sec = ((before.acts && before.acts.secondary) || []).map((a) => a.call);
    ok(sec.indexOf("dashRecordPayment(7,'deposit')") >= 0, '⚠⚠ Record payment is offered beside Send deposit invoice — the cheque in hand can be recorded');
    ok(((before.acts && before.acts.primary) || {}).call !== "dashRecordPayment(7,'deposit')", 'the invoice stays the primary');
    const paid = view(signed([{ uid: 'p1', stage: 'deposit', amount: 5000, date: '2026-10-03', method: 'check' }]));
    eq(paid.invDone, true, '⚠⚠ a deposit on file answers the deposit invoice');
    ok(paid.next !== 'deposit_invoiced', 'so the light moves on from "Send the deposit invoice" (now ' + paid.next + ')');
    const part = view(signed([{ uid: 'p1', stage: 'deposit', amount: 2000, date: '2026-10-03', method: 'check' }]));
    eq(part.next, 'deposit_received', 'a part deposit in hand lights Collect the deposit, which reads it as part paid');
  }

  // ═══ 4 · THE CONTENTS RECORD CLAIMS ONLY WHAT THE RECORD HOLDS ═════════════
  group('4 · the Contents Record says every line was photographed, and shared, only where it was');
  {
    const printed = [];
    const C = lift(['printContentsRecord'], ['jobs', '_photoRefs', 'estimateStore', 'mediaStore', 'jobPlanStore', 'contractors', 'changeOrders',
      '_printDocument', '_invThumbCache', 'savePhotoRefs'],
      { jobs: [], _photoRefs: {}, estimateStore: {}, mediaStore: {}, jobPlanStore: {}, contractors: [], changeOrders: [],
        _invThumbCache: () => ({}), _printDocument: (html, title) => { printed.push(html); return true; }, document: domStub({}),
        setTimeout: () => 0, clearTimeout: () => {}, savePhotoRefs: () => {} });
    const LIVING = (shares) => ({ id: 2, name: 'Margaret Ellsworth', hvlId: 'HVL-0011', svc: 'downsizing_move', addr: '14 Coconut Row', city: 'Palm Beach',
      destAddr: '801 Sunset Ave', won: true, status: 'active', tc: 'Ashley Jerome',
      docState: shares ? { photoShares: { shares: { 'm@example.com': { email: 'm@example.com', sharedAt: '2026-10-05T14:00:00Z', sharedBy: 'Ashley Jerome' } } } } : {} });
    const ITEM = (id, over) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 1, seq: 1, status: 'uploaded', objectName: 'Sideboard',
      category: 'Furniture', disposition: 'Move', ts: Date.UTC(2026, 8, 20, 15, 0), driveFileId: 'f' + id,
      driveFileUrl: 'https://drive.google.com/file/d/f' + id + '/view', filename: 'x_INV_' + id + '.jpg' }, over || {});
    const print = (job, refs) => {
      C.jobs = [job]; C._photoRefs = { 2: refs }; C.estimateStore = { 2: { estimate: { rooms: [{ idx: 1, name: 'Living Room', st: 'in' }] } } };
      printed.length = 0;
      const r = attempt(() => C.printContentsRecord(2));
      return { err: r.ok ? '' : r.err, text: textOf(printed[0] || '') };
    };
    const allShot = print(LIVING(false), [ITEM('a'), ITEM('b', { objectName: 'Dining table' })]);
    ok(!allShot.err && allShot.text, 'fixture: the record prints (' + (allShot.err || 'ok') + ')');
    eq((allShot.text.match(/Prepared by Havellin Palm Beach, LLC/g) || []).length, 1, '⚠ the header names the preparer once');
    has(allShot.text, 'Every line was photographed in the room it came from.', 'every line photographed: it says so');
    lacks(allShot.text, 'shared with you', '⚠⚠ nothing shared: it never says the photographs are in a folder shared with the client');
    const shared = print(LIVING(true), [ITEM('a'), ITEM('b', { objectName: 'Dining table' })]);
    has(shared.text, 'Photographs of every item are in the Drive folder shared with you.', 'shared and every line photographed: it says so');
    const hand = ITEM('c', { objectName: 'Piano bench', driveFileId: '', driveFileUrl: '', filename: '' });
    const gap = print(LIVING(true), [ITEM('a'), hand]);
    lacks(gap.text, 'Every line was photographed', '⚠⚠ a line added by hand with no photograph: it never says every line was photographed');
    lacks(gap.text, 'Photographs of every item', '…nor that there is a photograph of every item');
    has(gap.text, 'The photographs are in the Drive folder shared with you.', 'it still says where the photographs are');
    has(gap.text, '1 item listed with no photograph', '⚠ and names the gap above the list');
  }

  // ═══ 5 · THE FIXED-FEE BLURB NAMES MATERIALS ONLY WHERE THEY ARE PRICED ═══
  group('5 · the fixed-fee blurb says moving materials are included only where the estimate prices a package');
  {
    const B = lift(['_fixedFeeBlurb'], [], {});
    const e = (o) => Object.assign({ svc: 'home_cleanout', fixedPrice: true, fixedAmount: 15100, psCount: 2, rooms: [{ name: 'Kitchen' }],
      pkgCost: 0, prepFee: 0 }, o || {});
    const none = attempt(() => B._fixedFeeBlurb(e()));
    ok(none.ok, 'fixture: the blurb renders (' + (none.err || 'ok') + ')');
    lacks(String(none.val), 'Moving materials', '⚠⚠ no package priced: no moving materials claimed');
    has(String(none.val), 'All vendor coordination is included.', 'the coordination sentence stays');
    has(String(B._fixedFeeBlurb(e({ pkgCost: 850 }))), 'Moving materials and all vendor coordination are included.', 'a package priced: it says so');
    const prep = String(B._fixedFeeBlurb(e({ prepFee: 900, prepFeeOnTop: true })));
    has(prep, 'Vendor coordination is included, apart from the home prep vendors', 'the prep carve-out without a package names no materials');
    lacks(prep, 'Moving materials', '…none at all');
    has(String(B._fixedFeeBlurb(e({ pkgCost: 850, prepFee: 900, prepFeeOnTop: true }))),
      'Moving materials and vendor coordination are included, apart from the home prep vendors', 'and with a package it keeps them');
  }

  process.env.TZ = prevTZ;
};
