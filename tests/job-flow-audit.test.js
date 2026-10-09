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
//   6. The Job Plan stops re-rendering itself: a manifest refresh read the same items as changed whenever the sheet's
//      copy held its keys in another order than this device's, so the plan redrew forever on any job with photographs
//      on the sheet (and a note being typed was lost).
//   7. An estate's invoices bill the estate, or the trust, and name the representative: every deposit, midpoint and final
//      printed "Client: <the decedent>" and "Phone: —". One rule (docPartyIdent) for the estimate's header and theirs.
//   8. Every shot reaches the sheet, as-found and after included: only Items and detail shots scheduled the manifest write
//      (field-capture.test.js holds it, restated).
//   9. Agent Two's basis goes with its figure: a figure the appraiser or the desk set printed the agent's source ("auction
//      comps") and its comparables sentence on the documents sent to the attorney.
//  10. The trust package carries no probate words: the Estate Inventory Report named "the personal representative's
//      filing" and the Appraisal Worklist "the §733.604 probate schedule" on a trust-only matter.
//  11. An approved estimate (and so Exhibit A) carries the day it was approved: it printed the day it was viewed, so the
//      signed packet's Exhibit A was dated after the estimate the client accepted and "valid for 30 days" moved.
//  12. An accepted change order keeps the vendors in the client list's Total Est.: it set the total to Havellin's figure.
//  13. The beneficiary's receipt names the trust by its title and "the trustees" where two are recorded: it read "from the
//      trustee of Eleanor M. Whitcombe Revocable Trust" on a trust with two co-trustees.
//  14. The concierge confirmed on the Job Plan is the job's where intake named nobody: the dashboard read "Unassigned"
//      over a confirmed team, and Job active and Work complete were credited to the approver.
//  15. A stage's "N of M ticked" follows each tick: it was drawn only by a full render ("0 of 10 ticked" after ten ticks).
//  16. A background notice with no client on screen goes to the sync toast, never a blocking alert().
//  17. The §733.604 deadline chip turns red once the day has passed, as the Form 706 chip does (it stayed a green tick).
//  18. The unsaved-changes chip steps aside while the camera is open: it covered the shutter on a phone (browser step 71).
//  19. The final invoice names the role, never "Contractor TBD", for hours logged against a placeholder.
//  20. A bequest line going To a person with nobody named yet is not "proposed to go elsewhere … to nobody recorded yet".
//      (The release request's appraisal heading, "has not been appraised yet", and "both" for two signers are held in
//      appraisal-track, p16-inventory-desk and p19-releases, restated.)
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
const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&mdash;': '—', '&middot;': '·', '&nbsp;': ' ', '&rarr;': '→', '&rsquo;': '’', '&ldquo;': '“', '&rdquo;': '”', '&ndash;': '–' };
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
    has(fin.text, 'Services total (Home Sale Preparation Fee on the vendor quotes recorded)', 'the heading on the total names what the fee is charged on'); // RESTATED (P25, Q52): the fee is on the vendor quotes recorded
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

  // ═══ 6 · A REFRESH THAT MOVES NOTHING IS NOT A CHANGE, WHATEVER THE KEY ORDER ═══
  group('6 · the manifest refresh reads the same items, in another key order, as no change — through the real merge');
  {
    const syncOk = (v) => ({ then(f) { const o = f(v); return (o && typeof o.then === 'function') ? o : syncOk(o); }, catch() { return this; } });
    const rig = (local, remote) => lift(['refreshPhotoRefs'], ['_photoRefs', '_invCloudSeen', 'savePhotoRefs', 'SHEETS_SYNC_URL', 'fetch'],
      { SHEETS_SYNC_URL: 'https://script.google.com/macros/s/AAA/exec', _photoRefs: { 7: local }, _invCloudSeen: {}, savePhotoRefs: () => {},
        fetch: () => syncOk({ json: () => syncOk({ ok: true, media: { 7: { items: remote } } }) }) });
    // One item as savePhotoRefs writes it, and as the sheet hands it back: the same fields in another order.
    const mine = { stableId: 's1', label: 'inventory', roomIdx: 2, status: 'uploaded', objectName: 'Sideboard', updatedAt: 10, ts: 5,
      custodyLog: [{ id: 'e1', kind: 'found', at: 5, by: 'Ashley Jerome' }] };
    const theirs = { updatedAt: 10, ts: 5, objectName: 'Sideboard', status: 'uploaded', roomIdx: 2, label: 'inventory', stableId: 's1',
      custodyLog: [{ by: 'Ashley Jerome', at: 5, kind: 'found', id: 'e1' }] };
    const drive = (r, cap) => {
      let n = 0;
      try { (function again() { n++; if (n > cap) throw new Error('cap'); r.refreshPhotoRefs(7, (c) => { if (c) again(); }); })(); }
      catch (e) { if (e.message !== 'cap') return 'threw: ' + e.message; return cap + 1; }
      return n;
    };
    eq(drive(rig([Object.assign({}, mine)], [theirs]), 25), 1, '⚠⚠ the plan renders once and stops — it re-rendered forever');
    let changed = null;
    rig([Object.assign({}, mine)], [Object.assign({}, theirs, { objectName: 'Mahogany sideboard', updatedAt: 11 })]).refreshPhotoRefs(7, (c) => { changed = c; });
    eq(changed, true, 'a real edit from the other device still reads as a change');
    rig([Object.assign({}, mine)], [theirs, { stableId: 's2', label: 'inventory', roomIdx: 3, updatedAt: 12, ts: 12 }]).refreshPhotoRefs(7, (c) => { changed = c; });
    eq(changed, true, 'and so does a new shot');
  }

  // ═══ 7 · AN ESTATE'S INVOICES NAME THE ESTATE OR THE TRUST, NEVER THE DECEDENT AS CLIENT ═══
  group('7 · every invoice names the party the estimate names, and the representative on a decedent job');
  {
    const INV = lift(['invoiceHtml'], ['jobs', 'estimateStore', 'jobLogs', 'changeOrders', 'contractors', 'currentEstimate', 'currentInvStage'],
      { jobs: [], estimateStore: {}, jobLogs: {}, changeOrders: [], contractors: [], currentEstimate: null, currentInvStage: 'deposit', vendorDirectory: [] });
    const CE = lift(['clientEstimateHtml'], ['jobs', 'estimateStore', 'contractors', 'changeOrders', 'jobPlanStore'],
      { jobs: [], estimateStore: {}, contractors: [], changeOrders: [], jobPlanStore: {} });
    const EST = { jobId: 7, svc: 'cleanout', totTC: 20, totPS: 40, tcRate: 150, psRate: 100, tcFee: 3000, psFee: 4000, havellinTotal: 7000,
      pkgCost: 0, smf: 0, vendors: [], prepItems: [], rooms: [{ idx: 0, name: 'Kitchen', vol: 3, cplx: 3 }], discountPct: 0, rush: false, fixedPrice: false };
    const base = { id: 7, hvlId: 'HVL-0007', name: 'Harold Whitcombe', svc: 'cleanout', tc: 'Ashley Jerome', status: 'active', won: true, payments: [],
      addr: '69 Beach Blvd', city: 'Palm Beach', executor: 'Thomas Whitcombe', executorRole: 'Personal Representative',
      executorPhone: '(561) 555-0101', executorEmail: 't@example.com', deathDate: '2026-04-02' };
    const header = (job, stage) => {
      INV.jobs = [job]; INV.estimateStore = { 7: { estimate: Object.assign({}, EST, { svc: job.svc }), approved: true } }; INV.jobLogs = { 7: [] };
      const r = attempt(() => INV.invoiceHtml(job, stage));
      const h = String(r.val && r.val.html);
      const row = (h.match(/<div class="ce-hdr-row ce-hdr-row-1">([\s\S]*?)<div class="ce-divider">/) || [])[1] || '';
      return { err: r.ok ? '' : r.err, text: textOf(row) };
    };
    const probate = Object.assign({}, base, { svc: 'probate', matterType: 'probate', probateCase: '50-2026-CP-001234' });
    ['deposit', 'midpoint', 'final'].forEach((st) => {
      const h = header(probate, st);
      ok(!h.err, 'fixture: the probate ' + st + ' invoice renders (' + (h.err || 'ok') + ')');
      has(h.text, 'Estate Estate of Harold Whitcombe', '⚠⚠ the ' + st + ' invoice bills the estate');
      lacks(h.text, 'Client Harold Whitcombe', '…never the decedent as the client');
      has(h.text, 'Authorized Representative Thomas Whitcombe (561) 555-0101', '…and names the representative who pays, with their number');
      lacks(h.text, 'Phone —', '…never a blank phone for a dead man');
    });
    const trust = Object.assign({}, base, { matterType: 'trust', trustName: 'Eleanor M. Whitcombe Revocable Trust', trustDate: '2015-03-03' });
    has(header(trust, 'deposit').text, 'Trust The Eleanor M. Whitcombe Revocable Trust, dated March 3, 2015', '⚠ on a trust-only matter the invoice bills the trust, by its title');
    const living = { id: 7, hvlId: 'HVL-0007', name: 'Pat Butler', svc: 'home_cleanout', tc: 'Ashley Jerome', status: 'active', won: true, payments: [],
      addr: '1 A St', city: 'Palm Beach', phone: '(561) 555-0199' };
    const lv = header(living, 'deposit');
    has(lv.text, 'Client Pat Butler', 'a living client is the client');
    has(lv.text, 'Phone (561) 555-0199', '…with their own number');
    // The estimate and the invoice name the same party: one rule.
    CE.jobs = [trust];
    const ce = attempt(() => CE.clientEstimateHtml(Object.assign({}, EST, { svc: 'cleanout' }), trust));
    has(textOf(ce.val), 'Trust The Eleanor M. Whitcombe Revocable Trust, dated March 3, 2015', 'the estimate names the trust the same way (' + (ce.err || 'ok') + ')');
  }

  // ═══ 9 · THE AGENT'S BASIS GOES WITH ITS FIGURE ═══════════════════════════
  group('9 · a figure the appraiser or the desk sets carries none of Agent Two\'s basis; a person\'s source and note stay');
  {
    const T = lift(['_avTakeValue'], [], {});
    const agentLine = (o) => Object.assign({ stableId: 's1', fmv: 640, valLow: 480, valHigh: 800, valuedBy: 'agent', valSource: 'Auction comps',
      valNote: 'Three comparable lots sold 2025-2026', valConf: 'high', valComps: [{ title: 'x', price: 600 }] }, o || {});
    let r = agentLine(); r.fmv = 60; attempt(() => T._avTakeValue(r, 'typed'));
    eq([r.valuedBy, r.valSource, r.valNote], ['desk', undefined, undefined], '⚠⚠ a figure typed over the agent\'s drops the agent\'s source and sentence');
    r = agentLine(); r.valSource = 'Appraisal'; attempt(() => T._avTakeValue(r, 'appraisal'));
    eq([r.valuedBy, r.valSource, r.valNote], ['appraiser', 'Appraisal', undefined], '⚠⚠ the appraisal takes the line without the agent\'s comparables sentence');
    r = agentLine({ apprId: 'a1' }); r.fmv = 5200; attempt(() => T._avTakeValue(r, 'typed'));
    eq([r.valuedBy, r.valSource, r.valNote], ['appraiser', 'Appraisal', undefined], 'a figure typed over the agent\'s with an appraiser linked is the appraisal, no agent sentence');
    r = { stableId: 's2', fmv: 900, valuedBy: 'desk', valSource: 'Dealer quote', valNote: 'Quote from Jupiter Arms, 10/2' }; r.fmv = 950;
    attempt(() => T._avTakeValue(r, 'typed'));
    eq([r.valSource, r.valNote], ['Dealer quote', 'Quote from Jupiter Arms, 10/2'], 'a source and a sentence a person recorded stay');
    r = { stableId: 's3', fmv: 4000, valuedBy: 'desk', valNote: 'Report of 9/30' }; r.valSource = 'Appraisal'; attempt(() => T._avTakeValue(r, 'appraisal'));
    eq(r.valNote, 'Report of 9/30', '…and a person\'s note survives the appraisal');
  }

  // ═══ 10 · THE TRUST PACKAGE CARRIES NO PROBATE WORDS ═══════════════════════
  group('10 · the Estate Inventory Report and the worklist name the probate filing only on the probate track');
  {
    const R = lift(['printEstateInventoryReport', '_maivWorklistBlock'],
      ['jobs', '_photoRefs', 'estimateStore', 'mediaStore', 'jobPlanStore', 'contractors', 'changeOrders', '_printDocument', '_invThumbCache', 'savePhotoRefs'],
      { jobs: [], _photoRefs: {}, estimateStore: {}, mediaStore: {}, jobPlanStore: {}, contractors: [], changeOrders: [], _invThumbCache: () => ({}),
        _printDocument: () => true, savePhotoRefs: () => {}, setTimeout: () => 0, clearTimeout: () => {}, document: domStub({}) });
    const JOB = (matter) => ({ id: 7, hvlId: 'HVL-0007', name: 'Eleanor Whitcombe', svc: 'cleanout', matterType: matter, docTier: 'values',
      deathDate: '2026-04-02', executor: 'Diane Marsh', status: 'active', won: true, addr: '1 Ocean Blvd', city: 'Palm Beach' });
    const LINE = { stableId: 'a', label: 'inventory', roomIdx: 0, seq: 1, status: 'uploaded', objectName: 'Oil on canvas, harbour scene', category: 'Fine Art',
      fmv: 4000, valSource: 'Dealer quote', disposition: 'Auction', itemNo: 1, ts: 1, driveFileId: 'f1', filename: 'x_INV_1.jpg' };
    const report = (matter) => {
      R.jobs = [JOB(matter)]; R._photoRefs = { 7: [Object.assign({}, LINE)] };
      R.estimateStore = { 7: { estimate: { rooms: [{ idx: 0, name: 'Living Room', st: 'in' }] }, approved: true } };
      const r = attempt(() => R.printEstateInventoryReport(7, { asHtml: true }));
      return { err: r.ok ? '' : r.err, text: textOf((r.val && (r.val.html || r.val.why)) || '') };
    };
    const tr = report('trust');
    ok(!tr.err && tr.text, 'fixture: the trust report renders (' + (tr.err || tr.text.slice(0, 60)) + ')');
    lacks(tr.text, 'personal representative', '⚠⚠ the trust package\'s report never names a personal representative\'s filing');
    has(tr.text, 'administered under the trust instrument and are reported separately by the trustee', 'it names the trustee, as the Trust Schedule does');
    has(report('probate').text, 'reported separately in the personal representative’s filing, prepared with counsel', 'the probate track keeps its words');
    has(report('neither').text, 'reported separately, with counsel', 'a matter with neither names counsel alone');
    const maiv = { count: 1, total: 4000, unvalued: 0, over: true, settled: true };
    const block = (matter) => textOf(String(attempt(() => R._maivWorklistBlock(JOB(matter), [Object.assign({}, LINE, { maivCat: 'Paintings' })], maiv)).val || ''));
    lacks(block('trust'), '733.604', '⚠ the worklist names no §733.604 schedule on a trust-only matter');
    has(block('trust'), 'property held in a trust and other property that passes outside probate', '…and says what it counts instead');
    has(block('probate'), 'outside the §733.604 probate schedule', 'the probate track keeps its words');
  }

  // ═══ 11 · AN APPROVED ESTIMATE IS DATED BY ITS APPROVAL ════════════════════
  group('11 · the estimate and Exhibit A carry the day the estimate was approved, never the day they are viewed');
  {
    const CE = lift(['clientEstimateHtml'], ['jobs', 'estimateStore', 'contractors', 'changeOrders', 'jobPlanStore'],
      { jobs: [], estimateStore: {}, contractors: [], changeOrders: [], jobPlanStore: {} });
    const job = { id: 7, hvlId: 'HVL-0007', name: 'Pat Butler', svc: 'home_cleanout', addr: '1 A St', city: 'Palm Beach', phone: '(561) 555-0199' };
    const e = { jobId: 7, svc: 'home_cleanout', totTC: 20, totPS: 40, tcRate: 150, psRate: 100, tcFee: 3000, psFee: 4000, havellinTotal: 7000,
      pkgCost: 0, smf: 0, vendors: [], prepItems: [], rooms: [{ idx: 0, name: 'Kitchen', vol: 3, cplx: 3 }], discountPct: 0, rush: false, fixedPrice: false };
    const dateCell = (h) => ((String(h).match(/ce-meta-label">Date<\/div><div class="ce-meta-val"[^>]*>([^<]*)</) || [])[1] || '');
    CE.jobs = [job];
    CE.estimateStore = { 7: { estimate: e, approved: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 14, 2026' } };
    const a = attempt(() => CE.clientEstimateHtml(e, job));
    eq(dateCell(a.val), 'September 14, 2026', '⚠⚠ an approved estimate is dated the day it was approved (' + (a.err || 'ok') + ')');
    has(textOf(a.val), 'valid for 30 days from the date above', 'so its 30 days run from that day');
    CE.estimateStore = { 7: { estimate: e, approved: false } };
    const draft = dateCell(attempt(() => CE.clientEstimateHtml(e, job)).val);
    ok(draft && draft !== 'September 14, 2026', 'a draft no manager has approved reads the day it is viewed, never a stale approval (' + draft + ')');
  }

  // ═══ 12 · AN ACCEPTED CHANGE ORDER KEEPS THE VENDORS IN TOTAL EST. ═════════
  group('12 · accepting a change order moves Total Est. by what it adds, vendors at cost kept');
  {
    const dom = domStub({ 'coa-co-id': { value: '501' }, 'coa-client-name': { value: 'Pat Butler' } });
    const job = { id: 1, name: 'Pat Butler', svc: 'downsizing_move', status: 'active', havellinEst: 24145, totalEst: 36245 };
    const est = { jobId: 1, svc: 'downsizing_move', tcRate: 150, psRate: 100, totTC: 100, totPS: 86, havellinTotal: 24145, grandTotal: 36245,
      tcFee: 15000, psFee: 8600, fixedPrice: false, rush: false, discountPct: 0, prepItems: [], vendors: [] };
    const A = lift(['acceptChangeOrder'], ['jobs', 'changeOrders', 'estimateStore', 'currentEstimate', 'saveChangeOrders', 'fileChangeOrder', 'saveJobs',
      'syncJobToSheets', 'renderJobs', 'showFB', '_docNotice', 'dashNotice', '_dashRedraw', 'closeCOAcceptModal', 'docNames'],
      { document: dom, setTimeout: () => 0, jobs: [job], estimateStore: { 1: { estimate: est, approved: true } }, currentEstimate: null,
        changeOrders: [{ id: 501, jobId: 1, addTC: 6, addPS: 14, tcHrs: 6, psHrs: 14, description: 'Pool cabana and a storage unit' }],
        saveChangeOrders: () => {}, fileChangeOrder: () => {}, saveJobs: () => {}, syncJobToSheets: () => {}, renderJobs: () => {}, showFB: () => {},
        _docNotice: () => {}, dashNotice: () => {}, _dashRedraw: () => {}, closeCOAcceptModal: () => {}, docNames: () => ({ printTitle: 'x' }) });
    const r = attempt(() => A.acceptChangeOrder());
    ok(r.ok, 'fixture: the change order is accepted (' + (r.err || 'ok') + ')');
    const move = job.havellinEst - 24145;
    ok(move > 0, 'fixture: the change order moves Havellin\'s figure (' + move + ')');
    eq(job.totalEst, 36245 + move, '⚠⚠ Total Est. keeps the $12,100 of vendors and moves by the same amount');
  }

  // ═══ 13 · THE RECEIPT NAMES THE TRUST BY ITS TITLE, AND EVERY TRUSTEE ═════
  group('13 · the receipt says who the property came from as the agreement names them');
  {
    const F = lift(['invReceiptFrom'], [], {});
    const trust = (co) => ({ id: 7, name: 'Eleanor Whitcombe', svc: 'cleanout', matterType: 'trust', executor: 'Diane Marsh', executorRole: 'Successor Trustee',
      trustName: 'Eleanor M. Whitcombe Revocable Trust', trustDate: '2015-03-03',
      coFiduciaries: co ? [{ id: 'c1', name: 'James Marsh', role: 'Co-Trustee', at: 1 }] : [] });
    const one = String(attempt(() => F.invReceiptFrom(trust(false))).val);
    eq(one, 'the trustee of The Eleanor M. Whitcombe Revocable Trust, dated March 3, 2015', 'one trustee: the trust by its title');
    const two = String(attempt(() => F.invReceiptFrom(trust(true))).val);
    eq(two, 'the trustees of The Eleanor M. Whitcombe Revocable Trust, dated March 3, 2015', '⚠⚠ two co-trustees: "the trustees"');
    const est = String(attempt(() => F.invReceiptFrom({ id: 8, name: 'Harold <b>Whitcombe', svc: 'probate', matterType: 'probate', executor: 'Thomas' })).val);
    eq(est, 'the Estate of Harold &lt;b&gt;Whitcombe', 'a probate estate by name, escaped (the receipt prints it as HTML)');
  }

  // ═══ 14 · THE CONFIRMED CONCIERGE IS THE JOB'S WHERE INTAKE NAMED NOBODY ═══
  group('14 · confirming the team names the job\'s concierge where intake left it blank, in the team\'s one save');
  {
    const run = (jobTc, tcName) => {
      let saves = 0;
      const crew = { tc: { name: tcName, locked: false }, tc2: { name: '', locked: false }, ps: [{ name: 'Dana Ruiz', locked: false }], confirmed: false };
      const K = sandbox({ fns: ['confirmJobTeam', 'plannedTC2', 'crewDuplicates', 'isCrewPlaceholder', 'samePerson', 'canonPersonName',
        '_lockCrewSlots', '_crewSave', '_saveJobEdit', '_jobTouch', '_stampChangedKeys', '_crewSnap'],
        vars: ['CONTRACTOR_TC_NAME', 'LOG_PLACEHOLDER_NAMES', 'PERSON_NAME_ALIASES'],
        stubs: { getJobCrew: () => crew, isJobWon: () => true, unfilledPlannedPS: () => [], plannedPSCount: () => 1, showFB: () => {}, confirm: () => true,
          saveJobs: () => { saves++; }, syncJobToSheets: () => {}, buildLogTeamRows: () => {}, _repaintPlanGates: () => {}, estimateStore: {} } });
      const job = { id: 7, tc: jobTc, crew: crew };
      K.jobs = [job];
      const r = attempt(() => K.confirmJobTeam(7));
      return { err: r.ok ? '' : r.err, job, crew, saves };
    };
    const blank = run('', 'Ashley Jerome');
    ok(!blank.err && blank.crew.confirmed, 'fixture: the team confirms (' + (blank.err || 'ok') + ')');
    eq(blank.job.tc, 'Ashley Jerome', '⚠⚠ intake named nobody: the confirmed concierge is the job\'s');
    eq(blank.saves, 1, '…in the team\'s one save');
    eq(run('Anthony Graziano', 'Ashley Jerome').job.tc, 'Anthony Graziano', 'a concierge intake or Edit Client named is never overwritten');
    eq(run('', 'Contractor — TC').job.tc, '', 'the concierge placeholder is nobody');
  }

  // ═══ 15 · THE STAGE COUNTER FOLLOWS THE TICK ═══════════════════════════════
  group('15 · ticking a Before Day 1 box repaints the stage\'s count by id');
  {
    // The stage card holds its count as `.stg-count` (planStageCard); the stub card answers the one query the repaint makes.
    const count = { innerHTML: '0 of 5 ticked' };
    const dom = domStub({ 'stage-p0': { querySelector: (q) => (q === '.stg-count' ? count : null) } });
    const job = { id: 7, svc: 'home_cleanout', status: 'active' };
    const est = { svc: 'home_cleanout', rooms: [], vendors: [], prepItems: [], pkgCost: 0 };
    const P = lift(['togglePlanTask'], ['jobs', 'estimateStore', 'jobPlanStore', 'saveJobPlan', 'changeOrders', 'mediaStore', 'contractors'],
      { document: dom, jobs: [job], estimateStore: { 7: { estimate: est, approved: true } }, jobPlanStore: {}, saveJobPlan: () => {},
        changeOrders: [], mediaStore: {}, contractors: [], _todayStr: () => '2026-10-08' });
    const before = String(attempt(() => P.planStageMeta(7, job, est, 'p0')).val || '');
    ok(/^0 of \d+ ticked/.test(before), 'fixture: nothing ticked yet (' + before + ')');
    const r = attempt(() => P.togglePlanTask(7, 'precall', true, null));
    ok(r.ok, 'fixture: the tick saves (' + (r.err || 'ok') + ')');
    has(count.innerHTML, '1 of ', '⚠⚠ the stage reads one ticked straight away, not on the next full render');
  }

  // ═══ 16 · A BACKGROUND NOTICE NEVER BLOCKS THE SCREEN ══════════════════════
  group('16 · with no client on screen, a notice is the sync toast and never an alert');
  {
    const alerts = [];
    const badge = { textContent: '', style: {} };
    const N = lift(['_docNotice'], ['_jobBandHost', 'dashNotice', '_dashRedraw'], {
      _jobBandHost: () => null, dashNotice: () => { throw new Error('no strip on screen'); }, _dashRedraw: () => {},
      alert: (m) => alerts.push(m), setTimeout: () => 0, clearTimeout: () => {},
      document: { getElementById: (id) => (id === 'sync-status' ? badge : null) } });
    const r = attempt(() => N._docNotice('ok', 'Signed agreement and certificate of completion filed to Drive.', 7));
    ok(r.ok, 'fixture: the notice runs (' + (r.err || 'ok') + ')');
    eq(alerts.length, 0, '⚠⚠ no blocking alert over the client list or the field');
    eq(badge.textContent, 'Signed agreement and certificate of completion filed to Drive.', 'the toast carries it');
  }

  // ═══ 17 · THE §733.604 CHIP TURNS RED ONCE THE DEADLINE HAS PASSED ═════════
  group('17 · the court deadline chip is green ahead of the day and red after it');
  {
    const D = lift(['planDerivedLines'], ['jobs', 'estimateStore', 'jobLogs', 'changeOrders', 'mediaStore', 'jobPlanStore', 'contractors'],
      { jobs: [], estimateStore: {}, jobLogs: {}, changeOrders: [], mediaStore: {}, jobPlanStore: {}, contractors: [] });
    const job = { id: 7, svc: 'probate', matterType: 'probate', status: 'active', payments: [], probateDeadline: '2026-10-02', executorAuth: 'received',
      probateAttyName: 'Pressly' };
    const est = { svc: 'probate', rooms: [], vendors: [], prepItems: [], fixedPrice: true };
    D.jobs = [job]; D.estimateStore = { 7: { estimate: est, approved: true } };
    const line = (today) => ((attempt(() => D.planDerivedLines(7, job, est, 'p0', today)).val || []).find((l) => l.key === 'deadline_733604') || {});
    eq(line('2026-09-30').ok, true, 'two days ahead: green');
    const past = line('2026-10-08');
    eq(past.ok, false, '⚠⚠ six days past: no longer a green tick');
    has(past.detail, 'the date has passed', '…and it says so, and to confirm the filing with counsel');
  }

  // ═══ 19 · A PLACEHOLDER ON THE FINAL IS A ROLE, NEVER A NAME ════════════════
  group('19 · hours logged against a placeholder print as the role on the client\'s final');
  {
    const INV = lift(['invoiceHtml'], ['jobs', 'estimateStore', 'jobLogs', 'changeOrders', 'contractors', 'currentEstimate', 'currentInvStage'],
      { jobs: [], estimateStore: {}, jobLogs: {}, changeOrders: [], contractors: [], currentEstimate: null, currentInvStage: 'final', vendorDirectory: [] });
    const job = { id: 7, hvlId: 'HVL-0007', name: 'Pat Butler', svc: 'downsizing_move', tc: 'Ashley Jerome', status: 'closed', won: true, payments: [],
      addr: '1 A St', city: 'Palm Beach', phone: '(561) 555-0199' };
    INV.jobs = [job];
    INV.estimateStore = { 7: { estimate: { jobId: 7, svc: 'downsizing_move', totTC: 20, totPS: 60, tcRate: 150, psRate: 100, tcFee: 3000, psFee: 6000,
      havellinTotal: 9000, pkgCost: 0, smf: 0, vendors: [], prepItems: [], discountPct: 0, rush: false, fixedPrice: false }, approved: true } };
    INV.jobLogs = { 7: [{ id: 1, date: '2026-10-06', members: [{ name: 'Ashley Jerome', role: 'TC', hours: 20 },
      { name: 'Contractor TBD', role: 'PS', hours: 57 }, { name: 'Dana Ruiz', role: 'PS', hours: 3 }] }] };
    const r = attempt(() => INV.invoiceHtml(job, 'final'));
    const t = textOf(r.val && r.val.html);
    ok(r.ok && t, 'fixture: the final renders (' + (r.err || 'ok') + ')');
    lacks(t, 'Contractor TBD', '⚠⚠ the placeholder never prints as a person on the client\'s final');
    has(t, 'Property Specialist PS 57', 'the hours print under the role');
    has(t, 'Dana Ruiz PS 3', 'a named specialist keeps their name');
  }

  // ═══ 20 · AN UNNAMED RECIPIENT IS NOT "ELSEWHERE" ══════════════════════════
  group('20 · a bequest line To a person with nobody named carries no going-elsewhere caution');
  {
    const job = { id: 7, name: 'Eleanor Whitcombe', svc: 'cleanout', matterType: 'trust', executor: 'Diane Marsh',
      beneficiaries: [{ id: 'b1', name: 'Sarah Whitcombe', at: 1 }],
      bequests: [{ id: 'q1', description: 'The diamond ring', beneficiaryId: 'b1', stableIds: ['s1'], at: 1 }] };
    const B = lift(['invBequestElsewhere'], ['jobs'], { jobs: [job] });
    const line = (o) => Object.assign({ stableId: 's1', label: 'inventory', objectName: 'Diamond ring', flagBequest: true }, o);
    const blank = attempt(() => B.invBequestElsewhere(line({ disposition: 'Distribute', channel: '' }), 7));
    ok(blank.ok, 'fixture: the rule runs (' + (blank.err || 'ok') + ')');
    eq(blank.val, null, '⚠⚠ To a person with nobody named: no "going elsewhere" caution');
    eq(attempt(() => B.invBequestElsewhere(line({ disposition: 'Distribute', channel: 'Sarah Whitcombe' }), 7)).val, null, 'to its beneficiary: none');
    ok(!!attempt(() => B.invBequestElsewhere(line({ disposition: 'Distribute', channel: 'Peter Whitcombe' }), 7)).val, 'to somebody else: the caution');
    ok(!!attempt(() => B.invBequestElsewhere(line({ disposition: 'Auction', channel: '' }), 7)).val, 'to auction with no house named: still elsewhere');
  }

  process.env.TZ = prevTZ;
};
