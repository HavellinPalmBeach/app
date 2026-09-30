'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// ⚠⚠ EVERY CLIENT DOCUMENT'S ROWS ADD UP TO ITS OWN PRINTED TOTALS — THE RECONCILIATION MATRIX
// (2026-09-29, off the 2026-09-28 workflow audit).
//
// The audit ran every client document over a matrix of estimates and found the places where a
// document said something its own estimate did not price: a final whose "Original Estimate" row
// carried the change orders (M2), invoices that swapped a dollar between the midpoint and the final
// against the signed schedule on one total in four, a Home Prep estimate with no discount row, a
// premium final whose per-person rows came to more than the total under them, a credit final
// emailed as a balance due, and a rush line promising a second concierge nobody was staffing (H6).
// None of those was caught by a test, because every existing test asserted a FIGURE it had worked
// out — and a document can print the right figure under rows that do not reach it.
//
// So this suite asserts the one property a reader actually checks: the rows on the page add up to
// the totals on the page, and the schedule the client signed is the schedule they are billed. It
// renders the REAL builders — clientEstimateHtml, invoiceHtml at all three stages, both agreement
// forms and the three invoice emails — over a matrix of services, billing bases, rush, discount,
// premium rates and totals chosen to land on every residue mod 4, and reads the money back off the
// rendered markup. Failures are collected per rule and reported with the scenarios that broke it,
// so a failure names the document, the row and the case rather than a bare count.
//
// ⚠ THE FIXTURES CARRY calcAll's ARITHMETIC, not a made-up total. An estimate record whose rows do
// not reach its own havellinTotal is a fixture error, and would read here as an app defect — so
// buildEst mirrors calcAll term for term, and takes the discount from the REAL discountOnLabor.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, domStub } = require('./harness');

const FNS = [
  // the estimate and both agreement forms
  'marketingOptOutBlock', 'marketingUseParas', '_mktClause', 'estimateIsFeeOnly', 'estDeclutterHrs', 'prepFeeRate',
  'fmt', 'esc', 'fmtDate2', 'svcLabelOf', 'isDecedentJob', 'estTolerancePctTxt', 'conciergePhones',
  'conciergePhonesText', 'assignedTCContact', 'samePerson', 'canonPersonName', 'estWorkingDays', 'paymentSplit',
  'clientEstimateHtml', 'rushScopeLine', 'rushCrewAdded', 'buildPrepEstimateBody', 'clientJobPlanSection',
  '_cePhases', 'vendorEstimateNote', 'vendorFeeNote', 'materialsBasisNote', 'materialsPackageQuoted',
  'proposedPlanRow', 'estimateDocScope', 'svcHasDocStep', 'fmtCEDate', '_pctWords', 'agreementHtml',
  'agrPriceAdjustments', 'probateAgreementHtml', '_agrApprovedStamp', 'agrBillingRates', '_agrHasPrepVendors', '_agrScopeServices',
  '_agrProbateCompliance', '_agrMidpointTrigger', '_fixedFeeBlurb', 'docStandardEffect', 'isFormalDoc',
  'gateDispute', '_gateYes', '_gate706', 'docLevelFloor', 'resolveDocLevel', 'docLevelFloorReason', 'docTierOf',
  'docTierDef', 'docTierScope', 'docTierScopeMirror', 'agrSection', 'approvedEstimateFor', 'esignAnchor',
  'estFixedFee', 'estPrepFeeOnTop', 'weArrangeAppraisals', 'docTierProduces', 'docScopeDef',
  '_agrComplianceHeading', '_agrComplianceLead', '_agrApprover', '_agrTrustDeliverable', 'matterDef',
  'matterTypeOf', 'invFiduciaryMode',
  // the three invoices
  'invoiceHtml', 'finalAwaitsHours', 'paymentStageWord', 'docSentAt', 'jobLogEntries', 'invFinalApproval', 'invFinalApprovalRecord', 'docKeyFor', 'coHours', 'coHoursTotal', 'coBaselineShift', 'coPrice', 'coPriceTotal',
  'coHoursLabel', '_coMoney', 'getVendorActuals', '_srcLineKey', '_invVendorFeeSentence', 'vendorGroupOfLine',
  'resolveJobVendor', 'coordHrsFor', 'prepLineTCHrs', 'vendorLineTCHrs', 'vendorCats', 'vendorPrimaryCat',
  'stagePaidTotal', 'jobPaidTotal', 'jobPayments', 'discountOnLabor', 'estimateFigures',
  // the invoice emails, all three parts
  'buildInvoiceEmailText', 'buildInvoiceEmailHtml', 'buildInvoiceMailto', 'invoiceBalanceWords', '_emMoney',
  '_emHtml', 'bestClientGreetingName', 'firstName', 'bestClientEmail', 'mailtoBody', 'mailtoSignoff', 'invoiceEmailSubject', 'clientRecipient', 'estFixedLines', 'fixedDiscountBasisWords', 'rushBaseWords', 'discountOnFixedFee', 'coRushPct', 'coRushPctFor', 'appraisalDuty', 'estimateAppraiserLines', 'estimateAppraiserNames', 'coVendorAdds', 'coVendorAddsTxt', 'jobPrepLines', 'coPrepVendorLines', '_agrOtherAppraisalsBy'
];
const VARS = ['PAYMENT_STAGES', 'PREP_FEE_RATE', 'SMF_PCT', 'RUSH_PCT', 'SVC_LABELS', 'EST_TOLERANCE_PCT', 'DEPT_EMAILS',
  'HAVELLIN_OFFICE_PHONE', 'NON_MOBILE_NUMBERS', 'DEFAULT_CONTRACTORS', 'DECEDENT_SERVICES', 'PERSON_NAME_ALIASES',
  'DOC_SCOPES', 'DOC_CAPTURE_POOL_SHARE', 'JOB_STEPS', 'PRODUCTIVE_HRS_PER_DAY', '_PCT_WORDS', 'ESIGN_ANCHORS', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'MATTER_TYPES',
  'COORD_TOUCHES', 'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES_DEFAULT', 'TOUCH_HRS',
  'DOC_STAGE_WORD', 'EMAIL_BRAND', 'MAX_DISCOUNT_PCT'];

// ── Reading money back off a rendered document ────────────────────────────────
const ENT = { '&amp;': '&', '&nbsp;': ' ', '&times;': '×', '&mdash;': '—', '&ndash;': '–', '&rsquo;': '’',
  '&#39;': "'", '&quot;': '"', '&lt;': '<', '&gt;': '>', '&minus;': '−', '&#8212;': '—' };
const decode = (s) => s.replace(/&[a-z#0-9]+;/gi, (m) => (ENT[m] !== undefined ? ENT[m] : m));
const text = (h) => decode(String(h).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// The amount on a row is the LAST money figure in the LAST cell that carries one. A rate
// ("$150/hr", "$150 / hour") is not an amount. "($15,255)" is money received or credited, and
// "Credit: $2,741" is a balance the client is owed — both read as negative.
function lastMoney(cells) {
  for (let i = cells.length - 1; i >= 0; i--) {
    const c = cells[i];
    const ms = [...c.matchAll(/(\(\s*)?([+\-−]\s*)?\$([\d,]+)(?!\s*\/\s*h)(?![\d,])/g)];
    if (!ms.length) continue;
    const m = ms[ms.length - 1];
    let v = parseInt(m[3].replace(/,/g, ''), 10);
    if (m[2] && /[-−]/.test(m[2])) v = -v;
    if (m[1]) v = -v;
    if (/Credit:/.test(c)) v = -Math.abs(v);
    return v;
  }
  return null;
}
// The FIRST money figure in a cell — an agreement's schedule reads "$13,201 (50% of fixed price …)".
function firstMoney(cell) {
  const m = String(cell || '').match(/\$([\d,]+)(?![\d,])/);
  return m ? parseInt(m[1].replace(/,/g, ''), 10) : null;
}
function tables(html) {
  const out = [];
  for (const chunk of String(html).split(/<table/).slice(1)) {
    const cls = (chunk.match(/^[^>]*class="([^"]*)"/) || [, ''])[1];
    const body = chunk.split('</table>')[0];
    const rows = [];
    for (const m of body.matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/g)) {
      const cells = [...m[2].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => text(c[1]));
      rows.push({ cls: (m[1].match(/class="([^"]*)"/) || [, ''])[1], cells,
                  label: cells.find((c) => c) || '', text: cells.join(' | '), amt: lastMoney(cells) });
    }
    out.push({ cls, rows });
  }
  return out;
}
const isCheckpoint = (r) => /^Subtotal\b/.test(r.label);
const isTotalRow = (r) => /\b(subtotal|grand)\b/.test(r.cls);

// ⚠ THE GENERAL RULE, read over every table of a client document: every total row equals the rows
// above it since the last total. A "Subtotal (before discount)" line is a checkpoint — it must equal
// the rows above it and is not itself added in. Returns the failures, not a count.
// `compared` counts the totals actually checked against rows, so a parser that silently found no
// rows cannot read as a document that reconciles.
function tableFailures(html, docName) {
  const bad = [];
  let compared = 0;
  tables(html).forEach((t, ti) => {
    let sum = 0, items = 0;
    t.rows.forEach((r) => {
      if (r.amt === null) return;
      if (isTotalRow(r)) {
        if (items > 0) { compared++; if (r.amt !== sum) bad.push(`${docName} table ${ti} "${r.label}" ${r.amt} ≠ rows ${sum}`); }
        sum = 0; items = 0;
        return;
      }
      if (isCheckpoint(r)) {
        compared++;
        if (r.amt !== sum) bad.push(`${docName} table ${ti} "${r.label}" ${r.amt} ≠ rows ${sum}`);
        return;
      }
      if (t.cls.indexOf('ce-tbl') >= 0) { sum += r.amt; items++; }
    });
  });
  return { bad, compared };
}
const rowAmt = (html, re) => {
  for (const t of tables(html)) for (const r of t.rows) if (re.test(r.label) && r.amt !== null) return r.amt;
  return null;
};
const rowsMatching = (html, re) => {
  const out = [];
  for (const t of tables(html)) for (const r of t.rows) if (re.test(r.label)) out.push(r);
  return out;
};

module.exports = function ({ group, ok, eq, has }) {
  const ctx = sandbox({ fns: FNS, vars: VARS, stubs: {
    jobs: [], jobLogs: {}, estimateStore: {}, changeOrders: [], contractors: [], currentEstimate: null,
    currentInvStage: 'final', vendorDirectory: [], jobPlans: {}, _photoRefs: {}, document: domStub({}) } });

  const PKG = { 500: 'Estate Basic — $500', 750: 'Estate Standard — $750', 1500: 'Estate Premium — $1,500' };
  // calcAll's arithmetic, term for term — see the note at the top.
  function buildEst(o) {
    const premium = !!o.premium, tcRate = premium ? 185 : 150, psRate = premium ? 125 : 100;
    const isPrep = o.svc === 'prep';
    const totTC = o.totTC, totPS = isPrep ? 0 : o.totPS;
    const tcFee = Math.round(totTC * tcRate), psFee = Math.round(totPS * psRate);
    const pkgCost = isPrep ? 0 : (o.pkgCost || 0);
    const pkgLabel = pkgCost ? PKG[pkgCost] : 'None — $0';
    const prepItems = o.prepItems || [];
    const prepCost = prepItems.reduce((a, p) => a + p.cost, 0);
    const prepEnabled = isPrep || prepItems.length > 0;
    const prepFee = prepEnabled ? Math.round(prepCost * ctx.prepFeeRate()) : 0;
    const full = tcFee + psFee + pkgCost + prepFee;
    const rush = !isPrep && !!o.rush;
    const rushAmt = rush ? Math.round(full * 0.20) : 0;
    const discountPct = o.discountPct || 0;
    const discountAmt = ctx.discountOnLabor(tcFee + psFee, rush ? 0.20 : 0, discountPct);
    const hourly = Math.round(full + rushAmt - discountAmt);
    const vendors = o.vendors || [];
    const vendorCost = vendors.reduce((a, v) => a + (v.cost || 0), 0);
    const fixed = !isPrep && !!o.fixedAmount;
    // ⚠ `o.current`: a record saved under the 2026-09-30 rules (P12), priced by the REAL estimateFigures as
    // calcAll prices it — the premium and the discount as lines on a fixed fee (fixedLines), and the premium
    // never on the 30% prep fee (rushExPrepFee). Without it the record is the older shape, which the documents
    // must go on billing exactly as it was quoted.
    const fig = o.current ? (fixed
      ? ctx.estimateFigures({ fixed: true, fee: o.fixedAmount, pkg: pkgCost, prepFee, rushRate: rush ? 0.20 : 0, discountPct })
      : ctx.estimateFigures({ labour: tcFee + psFee, pkg: pkgCost, smf: 0, prepFee, rushRate: rush ? 0.20 : 0, discountPct })) : null;
    if (fig) {
      const svcTotal = fig.servicesTotal;
      return Object.assign(buildEst(Object.assign({}, o, { current: false })), {
        fixedLines: true, rushExPrepFee: true, rushAmt: fig.rushAmt, discountAmt: fig.discountAmt, havellinTotal: svcTotal,
        grandTotal: svcTotal + (isPrep ? 0 : vendorCost) + (prepEnabled ? prepCost : 0) });
    }
    return {
      jobId: 1, svc: o.svc, totTC, totPS, tcFee, psFee, tcRate, psRate, pkgCost, pkgLabel, smf: 0,
      prepItems, prepEnabled, prepCost, prepFee, prepTCHrs: 0, declutterTCHrs: isPrep ? totTC : 0,
      havellinTotalFull: full, havellinTotal: fixed ? o.fixedAmount + prepFee : hourly, hourlyHavellinTotal: hourly,
      fixedPrice: fixed, fixedAmount: fixed ? o.fixedAmount : 0, prepFeeOnTop: true,
      discountAmt: Math.round(discountAmt), discountPct, rush, rushPct: 0.20, rushAmt,
      grandTotal: (fixed ? o.fixedAmount + prepFee : hourly) + (isPrep ? 0 : vendorCost) + (prepEnabled ? prepCost : 0),
      vendors, vendorCost, needsTC2: !!o.tc2, tcCount: o.tc2 ? 2 : 1, psCount: o.psCount || 2,
      psRecommended: o.legacyCrew ? undefined : (isPrep ? 0 : (o.psRec || 2)),
      preparedBy: 'Anthony Graziano', rooms: [], docScope: 'full',
    };
  }
  const JOB = (svc, extra) => Object.assign({ id: 1, hvlId: 'HVL-0007', name: 'Butler Estate', svc,
    addr: '69 Beach Blvd', tc: 'Anthony Graziano', status: 'active', won: true, premium: false,
    email: 'client@example.com', executor: ctx.isDecedentJob({ svc }) ? 'Tripp Butler' : '',
    executorRole: 'Personal Representative', executorEmail: 'tripp@example.com', payments: [] }, extra || {});

  // The hours a crew logs: the concierge's own, the specialists' split between named people.
  function logsFor(o) {
    const members = [];
    const tcs = o.tcNames || ['Anthony Graziano'];
    tcs.forEach((n, i) => members.push({ name: n, role: 'TC', hours: o.tcHrs[i] }));
    (o.psHrs || []).forEach((h, i) => members.push({ name: 'Specialist ' + (i + 1), role: 'PS', hours: h }));
    return [{ date: '2026-09-01', activity: 'work', members }];
  }

  // Render every document for one scenario, walking the three invoices and paying each in full.
  function render(e, job, logs, cos) {
    ctx.estimateStore = { 1: { estimate: e, approved: true, approvedBy: 'Anthony Graziano' } };
    ctx.jobLogs = { 1: logs };
    ctx.changeOrders = cos || [];
    ctx.jobs = [job];
    const docs = { estimate: ctx.clientEstimateHtml(e, job),
                   agreement: ctx.isDecedentJob(job) ? ctx.probateAgreementHtml(job, e) : ctx.agreementHtml(job, e) };
    let pays = [];
    const inv = {};
    ['deposit', 'midpoint', 'final'].forEach((st, i) => {
      const j = Object.assign({}, job, { payments: pays });
      const d = ctx.invoiceHtml(j, st);
      inv[st] = { d, job: j };
      docs[st] = d.html;
      if (d.amtDue > 0) pays = pays.concat([{ stage: st, amount: d.amtDue, date: '2026-09-0' + (i + 1), method: 'wire', uid: 'p' + i }]);
    });
    return { docs, inv };
  }

  // ── THE RULES, each collecting its failures across the whole matrix ──────
  const RULES = {};
  const fail = (rule, msg) => { (RULES[rule] = RULES[rule] || []).push(msg); };
  const seen = (rule) => { RULES[rule] = RULES[rule] || []; };
  let scenarios = 0, totalsCompared = 0;

  function checkScenario(label, e, job, logs, cos, expect) {
    scenarios++;
    const { docs, inv } = render(e, job, logs, cos);
    const L = (m) => label + ' — ' + m;

    // 1. Every table's rows reach its totals, on every document.
    seen('tables add up');
    ['estimate', 'deposit', 'midpoint', 'final'].forEach((k) => {
      const tf = tableFailures(docs[k], k);
      totalsCompared += tf.compared;
      if (!tf.compared) fail('tables add up', L(`${k}: no total was found to check its rows against`));
      tf.bad.forEach((m) => fail('tables add up', L(m)));
    });

    // 2. The estimate states its own total, and its schedule is paymentSplit of it.
    const est = docs.estimate;
    const hst = rowAmt(est, /^Havellin Services Total/);
    seen('estimate total'); if (hst !== e.havellinTotal) fail('estimate total', L(`printed ${hst}, record ${e.havellinTotal}`));
    const split = ctx.paymentSplit(e.havellinTotal);
    const sched = tables(est).filter((t) => t.cls === 'pay-tbl').flatMap((t) => t.rows.filter((r) => r.amt !== null).map((r) => r.amt));
    seen('estimate schedule'); if (JSON.stringify(sched) !== JSON.stringify([split.deposit, split.midpoint, split.final]))
      fail('estimate schedule', L(`schedule ${sched} ≠ split ${[split.deposit, split.midpoint, split.final]}`));
    // The grand total: its own rows when it itemizes, otherwise the section totals on the page.
    const grand = rowAmt(est, /^Total Estimated Project Cost/);
    const sections = [/^Estimated Third-Party Total/, /Prep Vendor Total/].map((re) => rowAmt(est, re) || 0);
    seen('estimate grand total');
    if (grand !== null && grand !== hst + sections[0] + sections[1])
      fail('estimate grand total', L(`grand ${grand} ≠ services ${hst} + sections ${sections}`));

    // 3. The agreement's schedule is the same paymentSplit — the client signs the numbers the
    //    estimate states, and is invoiced them.
    const agrRows = rowsMatching(docs.agreement, /^(Deposit|Midpoint Payment|Second Payment|Final Payment|Final Invoice)\b/)
      .map((r) => firstMoney(r.cells[1]));
    seen('agreement schedule');
    if (JSON.stringify(agrRows) !== JSON.stringify([split.deposit, split.midpoint, split.final]))
      fail('agreement schedule', L(`agreement ${agrRows} ≠ split ${[split.deposit, split.midpoint, split.final]}`));

    // 4. The advance invoices bill their stage of their own printed total.
    const dep = inv.deposit.d, mid = inv.midpoint.d, fin = inv.final.d;
    const depTotal = rowAmt(docs.deposit, /^(Project Total|Havellin Services Total)/);
    seen('deposit invoice');
    if (dep.amtDue !== ctx.paymentSplit(depTotal).deposit || rowAmt(docs.deposit, /^Deposit Due Now/) !== dep.amtDue)
      fail('deposit invoice', L(`deposit ${dep.amtDue} on a printed total of ${depTotal}`));
    const midTotal = rowAmt(docs.midpoint, /^(Project Total|Havellin Services Total)/);
    const ms = ctx.paymentSplit(midTotal);
    seen('midpoint invoice');
    // ⚠ A Home Prep job's middle payment is its SECOND payment on every document since 2026-09-29 (audit
    // P10): the agreement and the estimate already named it by what triggers it (the vendor schedule
    // booked), and an invoice headed "Midpoint" was the one document calling it something else.
    if (mid.amtDue !== ms.deposit + ms.midpoint - dep.amtDue || rowAmt(docs.midpoint, /^(Midpoint|Second) Payment Due Now/) !== mid.amtDue)
      fail('midpoint invoice', L(`midpoint ${mid.amtDue} on ${midTotal} after ${dep.amtDue}`));

    // 5. The final's payment summary: the estimate as the estimate, and a balance that is its own
    //    arithmetic — the services it bills, plus any priced change order, less what was received.
    const fh = docs.final;
    seen('final original estimate');
    if (!e.fixedPrice && rowAmt(fh, /^Original Estimate/) !== e.havellinTotal)
      fail('final original estimate', L(`Original Estimate ${rowAmt(fh, /^Original Estimate/)} ≠ estimate ${e.havellinTotal}`));
    const received = -rowAmt(fh, /^Payments received to date/);
    const balance = rowAmt(fh, /^Balance Due Upon Completion/);
    // A fixed price saved from 2026-09-30 carries its premium and its discount as payment-summary lines too
    // (lower-case "delivery" / "client", which the services table above them does not use).
    const billed = e.fixedPrice
      ? (rowAmt(fh, /^Fixed Project Fee/) || 0) + (rowAmt(fh, /^Home prep site management fee/) || 0) + (rowAmt(fh, /^Approved Change Orders/) || 0)
        + (rowAmt(fh, /^Expedited delivery \(/) || 0) + (rowAmt(fh, /^Preferred client discount/) || 0)
      // A Home Prep final heads the same row "Services total (site management fee on actual vendor spend …)"
      // since 2026-09-30 (audit P14, Anthony's wording); the figure on it is the same one.
      : rowAmt(fh, /^(Actual Havellin services total|Services total \(site management fee)/);
    seen('final balance');
    if (balance !== billed - received || fin.amtDue !== balance)
      fail('final balance', L(`balance ${balance} (amtDue ${fin.amtDue}) ≠ billed ${billed} − received ${received}`));

    // 6. With the job run exactly as quoted and each invoice paid, the three invoices ARE the signed
    //    schedule — the $1 swap between the midpoint and the final on one total in four.
    if (expect.asQuoted) {
      seen('as quoted, billed as signed');
      const got = [dep.amtDue, mid.amtDue, fin.amtDue];
      if (JSON.stringify(got) !== JSON.stringify([split.deposit, split.midpoint, split.final]))
        fail('as quoted, billed as signed', L(`invoiced ${got} ≠ signed ${[split.deposit, split.midpoint, split.final]}`));
    }

    // 7. The emails word each balance truthfully: a credit as a credit, never "$-2,741 … due".
    seen('emails word the balance');
    ['deposit', 'midpoint', 'final'].forEach((st) => {
      const a = inv[st].d.amtDue, j = inv[st].job;
      const parts = [ctx.buildInvoiceEmailText(j, st, a), text(ctx.buildInvoiceEmailHtml(j, st, a)),
                     decodeURIComponent(ctx.buildInvoiceMailto(j, a, st).split('body=')[1] || '')];
      parts.forEach((p, pi) => {
        if (/\$-|-\$/.test(p)) fail('emails word the balance', L(`${st} email part ${pi} prints a negative amount`));
        if (a < 0 && (!/Credit to you/.test(p) || /calendar days/.test(p) || /Balance due/i.test(p)))
          fail('emails word the balance', L(`${st} credit of ${a} not worded as a credit (part ${pi})`));
        if (a > 0 && (!/Balance due/i.test(p) || !/7 calendar days/.test(p)))
          fail('emails word the balance', L(`${st} balance of ${a} lost its terms (part ${pi})`));
      });
    });

    // 8. ⚠⚠ NO DOCUMENT SAYS "second Transition Concierge" UNLESS THE ESTIMATE HAS TWO, and none says
    //    "expanded crew" unless it staffs more specialists than recommended. The rush line is the
    //    only place either can appear, so on a rush job that staffs them the estimate MUST say so.
    const c = ctx.rushCrewAdded(e);
    const rushPrinted = (!e.fixedPrice || e.fixedLines) && e.rushAmt > 0;
    seen('crew claims match the estimate');
    Object.keys(docs).forEach((k) => {
      const t = text(docs[k]);
      const says2 = /second Transition Concierge/.test(t), saysCrew = /expanded crew/.test(t);
      if (says2 && !e.needsTC2) fail('crew claims match the estimate', L(`${k} claims a second concierge the estimate does not have`));
      if (saysCrew && !c.ps) fail('crew claims match the estimate', L(`${k} claims an expanded crew the estimate does not staff`));
      if (/compress the project calendar/.test(t)) fail('crew claims match the estimate', L(`${k} still carries the retired rush wording`));
      if (k === 'estimate' && rushPrinted && e.needsTC2 && !says2) fail('crew claims match the estimate', L('the estimate omits a second concierge it staffs'));
      if (k === 'estimate' && rushPrinted && c.ps && !saysCrew) fail('crew claims match the estimate', L('the estimate omits the expanded crew it staffs'));
    });

    // 9. Q8 — the agreement names the premium and the discount its Exhibit A itemizes, on an hourly
    //    engagement, and names neither when there is none (or when a flat fee already contains them).
    const at = text(docs.agreement);
    const namesRush = /expedited-delivery premium of twenty percent \(20%\)/.test(at);
    const namesDisc = /preferred-client discount of/.test(at);
    // On a fixed price saved from 2026-09-30 both are lines on the fee, and the fixed-fee clause names them.
    const lines = !e.fixedPrice || !!e.fixedLines;
    const wantRush = lines && e.rush && e.rushAmt > 0;
    const wantDisc = lines && e.discountPct > 0 && e.discountAmt > 0;
    seen('agreement names the price adjustments');
    if (namesRush !== wantRush) fail('agreement names the price adjustments', L(`rush named ${namesRush}, priced ${wantRush}`));
    if (namesDisc !== wantDisc) fail('agreement names the price adjustments', L(`discount named ${namesDisc}, priced ${wantDisc}`));
    if (wantDisc && at.indexOf(ctx._pctWords(e.discountPct / 100)) < 0) fail('agreement names the price adjustments', L('the discount rate is not stated in words'));

    // 10. No document quotes a materials package that was not quoted.
    seen('no phantom materials package');
    ['estimate', 'agreement'].forEach((k) => {
      if (/\(None — \$0\)|None — \$0/.test(text(docs[k]))) fail('no phantom materials package', L(`${k} prints "None — $0"`));
    });
    return { docs, inv };
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the matrix: two labour services × hourly and fixed × rush × discount × premium × every residue mod 4');
  {
    // totTC 80.0 / 80.1 / 80.2 / 80.3 moves the concierge fee by $15 a step, so the Havellin total
    // lands on every residue mod 4 — the swap only ever showed on totals ≡ 3.
    ['downsizing', 'cleanout'].forEach((svc) => [false, true].forEach((fixed) => [false, true].forEach((rush) =>
      [0, 5, 15].forEach((disc) => [false, true].forEach((premium) => [0, 1, 2, 3].forEach((k) => {
        const totTC = 80 + k / 10;
        const e = buildEst({ svc, totTC, totPS: 60, pkgCost: k % 2 ? 750 : 0, rush, discountPct: disc, premium,
          fixedAmount: fixed ? 24000 + k : 0, vendors: k === 2 ? [{ type: 'Junk Removal', name: 'Junk Kings', cost: 1200 }] : [] });
        const job = JOB(svc, { premium });
        checkScenario(`${svc} ${fixed ? 'fixed' : 'T&M'} rush=${rush} disc=${disc} premium=${premium} k=${k}`, e, job,
          logsFor({ tcHrs: [totTC], psHrs: [30, 30] }), [], { asQuoted: true });
      }))))));
  }

  group('bundled Home Prep on a labour job — the fee inside the services table, hourly and fixed');
  {
    [false, true].forEach((fixed) => [false, true].forEach((rush) => [0, 10].forEach((disc) => [8000, 8001, 8003].forEach((pc) => {
      const e = buildEst({ svc: 'downsizing_move', totTC: 40, totPS: 30, pkgCost: 500, rush, discountPct: disc,
        prepItems: [{ type: 'Painting', cost: pc }, { type: 'Cleaning', cost: 1500 }], fixedAmount: fixed ? 18000 : 0 });
      checkScenario(`bundled prep ${fixed ? 'fixed' : 'T&M'} rush=${rush} disc=${disc} prep=${pc}`, e, JOB('downsizing_move'),
        logsFor({ tcHrs: [40], psHrs: [15, 15] }), [], { asQuoted: true });
    }))));
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ the 2026-09-30 rules (P12) — a fixed fee itemises its premium and discount, and the premium leaves the prep fee out');
  {
    // Anthony, Q9 and Q13: on a fixed price the premium prints under the fee as its own line and the discount
    // as its own line; on both bases the premium is never charged on the 30% prep fee. Every document must
    // still add up and bill the schedule the client signed — the same rules, on records priced the new way.
    const before = scenarios;
    ['downsizing', 'cleanout'].forEach((svc) => [false, true].forEach((fixed) => [false, true].forEach((rush) =>
      [0, 5, 15].forEach((disc) => [false, true].forEach((premium) => [0, 1, 2, 3].forEach((k) => {
        const totTC = 80 + k / 10;
        const e = buildEst({ current: true, svc, totTC, totPS: 60, pkgCost: k % 2 ? 750 : 0, rush, discountPct: disc, premium,
          fixedAmount: fixed ? 24000 + k : 0, vendors: k === 2 ? [{ type: 'Junk Removal', name: 'Junk Kings', cost: 1200 }] : [] });
        checkScenario(`P12 ${svc} ${fixed ? 'fixed' : 'T&M'} rush=${rush} disc=${disc} premium=${premium} k=${k}`, e, JOB(svc, { premium }),
          logsFor({ tcHrs: [totTC], psHrs: [30, 30] }), [], { asQuoted: true });
      }))))));
    [false, true].forEach((fixed) => [false, true].forEach((rush) => [0, 10].forEach((disc) => [8000, 8001, 8003].forEach((pc) => {
      const e = buildEst({ current: true, svc: 'downsizing_move', totTC: 40, totPS: 30, pkgCost: 500, rush, discountPct: disc,
        prepItems: [{ type: 'Painting', cost: pc }, { type: 'Cleaning', cost: 1500 }], fixedAmount: fixed ? 18000 : 0 });
      const r = checkScenario(`P12 bundled prep ${fixed ? 'fixed' : 'T&M'} rush=${rush} disc=${disc} prep=${pc}`, e, JOB('downsizing_move'),
        logsFor({ tcHrs: [40], psHrs: [15, 15] }), [], { asQuoted: true });
      if (rush) {
        const base = fixed ? e.fixedAmount : (e.tcFee + e.psFee + e.pkgCost);
        eq(e.rushAmt, Math.round(base * 0.20), `P12 bundled prep ${fixed ? 'fixed' : 'T&M'} prep=${pc}: the premium is 20% of ${fixed ? 'the fee' : 'the services'}, never of the prep fee`);
        eq(rowAmt(r.docs.estimate, /^Expedited Delivery/), e.rushAmt, '…and the estimate prints that premium');
        // With a prep fee in the table above it, the premium's row names its base — the reader can see a
        // subtotal it is NOT 20% of.
        const est1 = (rowsMatching(r.docs.estimate, /^Expedited Delivery/)[0] || {}).label || '';
        has(est1, fixed ? '20% of the fixed project fee' : '20% of Havellin services, not the home prep fee',
            `P12 bundled prep ${fixed ? 'fixed' : 'T&M'} prep=${pc}: the estimate's premium row names its base`);
        if (!fixed) {
          const fin1 = (rowsMatching(r.docs.final, /^Expedited Delivery/)[0] || {}).label || '';
          has(fin1, 'not the home prep fee', `P12 bundled prep T&M prep=${pc}: and so does the final invoice's`);
        }
      }
    }))));
    eq(scenarios - before, 216, 'the P12 matrix ran every one of its 216 scenarios through the fourteen rules');
  }

  group('standalone Home Prep — with and without declutter hours, with and without a discount');
  {
    // ⚠ The prep estimate printed NO discount row, so a discounted declutter job's fee and hours
    // added up to more than the total printed under them (2026-09-28 audit, low).
    [0, 5, 5.1, 5.2, 5.3].forEach((dc) => [0, 10].forEach((disc) => [9500, 9501].forEach((pc) => {
      const e = buildEst({ svc: 'prep', totTC: dc, prepItems: [{ type: 'Painting', cost: pc - 1500 }, { type: 'Cleaning', cost: 1500 }], discountPct: disc });
      checkScenario(`prep declutter=${dc} disc=${disc} vendors=${pc}`, e, JOB('prep'),
        dc > 0 ? [{ date: '2026-09-01', activity: 'declutter', members: [{ name: 'Ashley Jerome', role: 'TC', hours: dc }] }] : [],
        [], { asQuoted: true });
    })));
  }

  group('⚠ M2 — an accepted change order is a line of its own, never folded into the Original Estimate');
  {
    // The audit's own case: $10,962 with a +10/+10 change order printed "Original Estimate (basis for
    // advance payments) $13,462" over a $5,481 deposit and a $2,741 midpoint.
    const CO = [{ id: 1758000000001, jobId: 1, tcHrs: 10, psHrs: 10, clientApproved: true, description: 'Garage',
                  clientName: 'Tripp Butler', clientAcceptedAt: 'Sep 20, 2026' }];
    const e = buildEst({ svc: 'cleanout', totTC: 47, totPS: 39.12 });
    const r = checkScenario('M2 T&M +10/+10', e, JOB('cleanout'),
      logsFor({ tcHrs: [57], psHrs: [49.12] }), CO, {});
    const pay = tables(r.docs.final).find((t) => t.cls === 'pay-tbl');
    const labels = pay ? pay.rows.map((row) => row.label) : [];
    eq(rowAmt(r.docs.final, /^Original Estimate/), 10962, 'the Original Estimate row is the estimate: $10,962, not $13,462');
    const oi = labels.findIndex((l) => /^Original Estimate/.test(l));
    ok(oi >= 0 && /^Approved Change Orders \(1\)/.test(labels[oi + 1] || ''),
       'and the accepted change order is the very next line, on its own');
    eq(r.inv.deposit.d.amtDue, 5481, 'the deposit is half the estimate');
    eq(r.inv.midpoint.d.amtDue, 2741, 'the midpoint a quarter of it');

    // A fixed fee prices the change order, and the payment summary carries that price once, as a
    // line of its own under the fee, reaching the balance.
    [24000, 24001, 24002, 24003].forEach((fx) => {
      const ef = buildEst({ svc: 'cleanout', totTC: 80, totPS: 60, fixedAmount: fx });
      checkScenario(`M2 fixed ${fx} +10/+10`, ef, JOB('cleanout'), [], CO, {});
    });
    // And the same change order on every residue of an hourly total.
    [47, 47.1, 47.2, 47.3].forEach((tc) => {
      const et = buildEst({ svc: 'downsizing', totTC: tc, totPS: 39.12, rush: true, discountPct: 5 });
      checkScenario(`M2 T&M ${tc} rush + discount +10/+10`, et, JOB('downsizing'),
        logsFor({ tcHrs: [tc + 10], psHrs: [49.12] }), CO, {});
    });
  }

  group('credit finals and overruns — the balance is its own arithmetic, and a credit is emailed as one');
  {
    // The job came in well under what the deposit and the midpoint already collected, so the final
    // is a credit. The audit's email read "Balance due: $-2,741 … Payment is due within 7 calendar days".
    [0, 1, 2, 3].forEach((k) => [false, true].forEach((rush) => {
      const totTC = 80 + k / 10;
      const e = buildEst({ svc: 'downsizing', totTC, totPS: 60, rush, discountPct: rush ? 5 : 0 });
      const under = checkScenario(`credit k=${k} rush=${rush}`, e, JOB('downsizing'),
        logsFor({ tcHrs: [30], psHrs: [10, 10] }), [], {});
      ok(under.inv.final.d.amtDue < 0, `the final is a credit (k=${k}, rush=${rush})`);
      checkScenario(`overrun k=${k} rush=${rush}`, e, JOB('downsizing'),
        logsFor({ tcHrs: [totTC + 4], psHrs: [32, 32] }), [], {});
    }));
  }

  group('⚠ premium finals — two people sharing a role add up to the role, not a dollar or two over it');
  {
    // $185 × 10.3 = $1,905.50: two concierges printed $1,906 + $1,906 over a total that counted $3,811.
    [false, true].forEach((premium) => [[10.3, 10.3], [10.1, 10.3], [7.7, 7.7, 7.7]].forEach((tcs) =>
      [[5.1, 5.1], [5.3, 5.1, 5.1]].forEach((pss) => {
        const totTC = tcs.reduce((a, b) => a + b, 0), totPS = pss.reduce((a, b) => a + b, 0);
        const e = buildEst({ svc: 'cleanout', totTC, totPS, premium });
        const names = tcs.map((_, i) => ['Anthony Graziano', 'Ashley Jerome', 'Anthony Graziano Jr'][i]);
        checkScenario(`team premium=${premium} tc=${tcs} ps=${pss}`, e, JOB('cleanout', { premium }),
          logsFor({ tcNames: names, tcHrs: tcs, psHrs: pss }), [], {});
      })));
  }

  group('⚠⚠ H6 — the rush line names a second concierge or a larger crew only when the estimate staffs one');
  {
    [false, true].forEach((tc2) => [[2, 2], [4, 2], [3, 3], [6, 4]].forEach(([n, rec]) => [false, true].forEach((legacy) => {
      const e = buildEst({ svc: 'cleanout', totTC: 80, totPS: 60, rush: true, tc2, psCount: n, psRec: rec, legacyCrew: legacy });
      checkScenario(`crew tc2=${tc2} ps=${n}/${rec} legacy=${legacy}`, e, JOB('cleanout'),
        logsFor({ tcHrs: [80], psHrs: [30, 30] }), [], { asQuoted: true });
    })));
  }

  // ── The verdicts ─────────────────────────────────────────────────────────────
  group('every rule held across the whole matrix');
  {
    ok(scenarios >= 280, `the matrix really ran (${scenarios} scenarios) — a loop over nothing proves nothing`);
    ok(totalsCompared >= scenarios * 4, `and read ${totalsCompared} printed totals against their rows`);
    const names = Object.keys(RULES);
    eq(names.length, 14, 'all fourteen rules were exercised');
    names.forEach((rule) => {
      const f = RULES[rule];
      eq(f.slice(0, 6), [], `${rule}${f.length ? ' — ' + f.length + ' scenario(s) failed' : ''}`);
    });
  }
};

// The lifted lists, shared with document-claims.test.js so its direct cases drive the same builders
// rather than a hand-kept second list that drifts from this one.
module.exports.FNS = FNS;
module.exports.VARS = VARS;
