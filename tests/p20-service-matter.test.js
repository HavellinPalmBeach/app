'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P20 · WC, A PROBATE SERVICE ON A MATTER WITH NO PROBATE (Q26), AND THE TRUST'S DATE (Q27). 2026-10-05.
// Anthony: "A, and yes to all the others".
//
// Measured on the real builders before the change (456d0cb, P19): a Probate service on a matter recorded Trust or
// Neither titled the trustee's agreement "Probate Estate Settlement" twice ("This Agreement governs Probate Estate
// Settlement services"), named the service "Probate Estate Settlement" on the client estimate's service row and fee
// table, on every invoice and in the three client emails, and told the client the work followed "the documentation
// standards probate requires" and kept "the records the court and counsel may request". Contested Probate did the same
// as "Contested Probate Estate Settlement" (its estate form fell back to "Estate Services" where no label was stored, and
// its fee table read "Onsite Contested Probate Estate Services"). The price was the service's, which is right, and nothing
// on any screen said the matter had no court. The trust's title read "dated Mar 3, 2015".
//
//   S1 the one rule, probateSvcOffTrack: Probate or Contested Probate on a matter ANSWERED Trust or Neither
//   S2 the one namer, docServiceTitle: Estate Settlement / Contested Estate Settlement off the track, the catalogue else;
//      its readers counted, no client builder reading svcLabelOf, and the three hand maps gone
//   S3 the documents, rendered by their real builders: both agreements, the client estimate, the three invoices, the three
//      client emails and the signing packet
//   S4 the price is the service's own on every matter (driveCalcAll; the figures were measured on 456d0cb, before)
//   S5 the flag, probateSvcFlag: Probate only, until a manager approves; the route while out for approval; never a refusal
//   S6 the screens: Client Intake live, Edit Client live and in its save's notice, Build Estimate beside the summary
//   S7 Q27: the trust's title spells the month out (fmtCEDate, local noon) on the agreement, the Trust Schedule and the
//      client estimate's identity line
// Driven through the real functions; the store and the network are stubbed by name.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source, fn, decl, domStub, driveCalcAll } = require('./harness');
const DOCREC = require('./document-reconciliation.test.js');

const SRC = source();
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
const noComments = (t) => String(t).split('\n').filter((l) => { const s = l.trim(); return !(s.startsWith('//') || s.startsWith('*') || s.startsWith('/*')); }).join('\n');
const LIVE = noComments(SRC);
const inEastern = (body) => { const prev = process.env.TZ; process.env.TZ = 'America/New_York'; try { return body(); } finally { process.env.TZ = prev; } };
const attempt = (f) => { try { return f(); } catch (e) { return 'THREW ' + String(e && e.message || e); } };
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&rsquo;/g, '’').replace(/&middot;/g, '·').replace(/&sect;/g, '§')
  .replace(/&mdash;/g, '—').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const unesc = (s) => String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// Which function a source index sits in, for counting the readers of a helper (p19-estate-docs.test.js's reader).
const FN_STARTS = [...LIVE.matchAll(/(^|\n)function ([A-Za-z0-9_$]+)\s*\(/g)].map((m) => ({ at: m.index, name: m[2] }));
function enclosing(idx) {
  let lo = 0, hi = FN_STARTS.length - 1, ans = '(top)';
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (FN_STARTS[mid].at <= idx) { ans = FN_STARTS[mid].name; lo = mid + 1; } else hi = mid - 1; }
  return ans;
}
function readers(name) {
  const out = {};
  const re = new RegExp('(?<![\\w.$])' + name.replace(/\$/g, '\\$') + '\\(', 'g');
  for (const m of LIVE.matchAll(re)) {
    if (LIVE.slice(Math.max(0, m.index - 9), m.index) === 'function ') continue;
    const f = enclosing(m.index);
    out[f] = (out[f] || 0) + 1;
  }
  const sorted = {}; Object.keys(out).sort().forEach((k) => { sorted[k] = out[k]; }); return sorted;
}

// The functions and top-level vars `roots` reach (p19-authority.test.js's closure); `stop` names what the test supplies.
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
  const c = { fns: [...fns], vars: [...vars] };
  _memo.set(key, c);
  return c;
}
function lift(roots, stop, stubs) {
  const c = closure(roots, (stop || []).concat(Object.keys(stubs || {})));
  return sandbox({ fns: c.fns, vars: c.vars, stubs: stubs || {} });
}

// ── Fixtures ────────────────────────────────────────────────────────────────
const NOW = Date.parse('2026-10-05T15:00:00Z');
const FixedDate = (t) => class extends Date { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } };
// The label intake stores on the job, as it stored it (SVC_LABELS at intake): the namer must beat it.
const STORED = { probate: 'Probate Estate Settlement', contested_probate: 'Contested Probate Estate Settlement', cleanout: 'Estate Settlement',
  home_cleanout: 'Home Cleanout', downsizing: 'Home Editing', downsizing_move: 'Home Transition', prep: 'Home Prep for Sale' };
const DECEDENT = ['probate', 'contested_probate', 'cleanout'];
const JOB = (svc, matter, o) => Object.assign({
  id: 7, hvlId: 'HVL-0007', name: 'Margaret Doe', fname: 'Margaret', lname: 'Doe', svc, svcLabel: STORED[svc], status: 'won',
  addr: '69 Beach Blvd', city: 'Palm Beach', zip: '33480', sqft: '3500', ptype: 'Estate', src: 'Family', start: '2026-10-19', tc: 'Ashley Jerome',
  payments: [], docState: {}, at: {}, updatedAt: NOW - 86400000,
}, DECEDENT.indexOf(svc) >= 0 ? {
  deathDate: '2026-01-15', docTier: 'values', gate706: 'no', executorAuth: 'pending',
  executor: 'Ruth Adler', executorFname: 'Ruth', executorLname: 'Adler', executorRole: matter === 'trust' ? 'Trustee' : 'Personal Representative',
  executorEmail: 'ruth@adler.example', executorPhone: '(561) 555-0101',
  probateAttyName: 'Ann Lowe', probateAttyFname: 'Ann', probateAttyLname: 'Lowe', probateAttyFirm: 'Lowe & Co', probateAttyPhone: '(561) 555-0102',
  probateAttyEmail: 'ann@lowe.law', probateCase: '2026-CP-001234', trustName: 'Adler Family Trust', trustDate: '2015-03-03',
} : { phone: '(561) 555-0100', email: 'pat@client.example' }, matter ? { matterType: matter } : {}, o || {});
const EST = (svc, o) => Object.assign({ jobId: 7, svc, tcFee: 6000, psFee: 8000, pkgCost: 0, pkgLabel: 'None — $0', smf: 0, prepFee: 0,
  havellinTotal: 14000, grandTotal: 14000, totTC: 40, totPS: 80, tcRate: 150, psRate: 100, discountPct: 0, discountAmt: 0, fixedPrice: false,
  rush: false, docScope: 'full', docTier: 'values', vendors: [], prepItems: [], rooms: [{ idx: 1, name: 'Study', st: 'in' }], collections: [],
  vehicles: [], preparedBy: 'Ashley Jerome' }, o || {});
const MATTERS = ['', 'probate', 'both', 'trust', 'neither'];
const SERVICES = ['probate', 'contested_probate', 'cleanout', 'downsizing', 'downsizing_move', 'home_cleanout', 'prep'];

// The client documents, rendered by their real builders: the reconciliation suite's lists, with what an answered matter, the
// signing packet and the two other client emails reach.
const DOC_FNS = DOCREC.FNS.concat(['estateAuthority', 'jobOnProbateTrack', 'trustInstrumentTitle', '_ceGroupedSpaces', 'signingPacketHtml',
  '_approvedEstimateHtml', 'buildSigningPacketHtml', 'buildAgreementEmailHtml', 'buildEstimateEmailHtml', 'estimateHavellinLines', 'vendorFeeNote',
  '_emPhoneLines', 'agreementEmailSubject', 'estimateEmailSubject',
  'agreementEmailCoSignLine']);  // P21: the agreement email's co-representatives' line (Q31)
const DOC_VARS = DOCREC.VARS.concat(['ESIGN_REQUIRED_ANCHORS', 'AGR_NOT_AN_ACCOUNTING']);
let _doc = null;
function docs(job, est) {
  if (!_doc) _doc = sandbox({ fns: DOC_FNS, vars: DOC_VARS, stubs: { document: domStub({}) } });
  Object.assign(_doc, { jobs: [job], jobLogs: {}, estimateStore: { [job.id]: { approved: true, submitted: true, estimate: est } }, changeOrders: [],
    contractors: [], currentEstimate: null, currentInvStage: 'final', vendorDirectory: [], jobPlans: {}, _photoRefs: {} });
  return _doc;
}
function render(svc, matter, o) {
  // No target start on the documents' job: the projected completion it prints is not what is measured here.
  const job = JOB(svc, matter, Object.assign({ start: '' }, o || {})), est = EST(svc);
  return inEastern(() => {
    const c = docs(job, est);
    const inv = (st) => attempt(() => { const r = c.invoiceHtml(job, st); return typeof r === 'string' ? r : (r && r.html) || ''; });
    return {
      agr: attempt(() => c.agreementHtml(job, est)),
      est: attempt(() => c.clientEstimateHtml(est, job)),
      deposit: inv('deposit'), midpoint: inv('midpoint'), final: inv('final'),
      invEmail: attempt(() => c.buildInvoiceEmailHtml(job, 'deposit', 7000)),
      agrEmail: attempt(() => c.buildAgreementEmailHtml(job)),
      estEmail: attempt(() => c.buildEstimateEmailHtml(est, job)),
      packet: attempt(() => c.signingPacketHtml(job.id)),
    };
  });
}
const TITLE_RE = /margin:\.6rem 0 \.25rem;">([^<]*)<\/div>/;   // the agreement's title line, above "Client … Agreement"
const agrTitle = (h) => (TITLE_RE.exec(h) || [])[1] || 'NO TITLE';
const serviceRow = (h) => (/<div class="ce-meta-label">Service<\/div><div class="ce-meta-val">([^<]*)<\/div>/.exec(h) || [])[1] || 'NO SERVICE ROW';
const onsite = (h) => (/>(Onsite [^<]*Services)</.exec(h) || [])[1] || 'NO FEE TABLE HEADING';
const emailService = (h) => (/margin-top:4px;">([^<&]*?)(?: &nbsp;|<\/div>)/.exec(h) || [])[1] || 'NO SERVICE LINE';
// Every "probate" a rendered document still prints, with its neighbours.
const probateWords = (h) => (text(h).match(/.{0,40}probate.{0,40}/gi) || []);

// The figures the engine priced on 456d0cb (P19, before this change), through the same drive (driveCalcAll, 3,500 sq ft,
// these six rooms at their defaults, the values tier), on every matter alike: hourly, and the suggested fixed fee.
const BASE = ['Living Room', 'Kitchen', 'Dining Room', 'Primary Suite', 'Bedroom 2', 'Garage (2-car)'];
const PRICED_BEFORE = { probate: [22750, 28437.5], contested_probate: [30150, 43605], cleanout: [19450, 23340] };
function priced(svc, matter, fixed, after) {
  return inEastern(() => {
    const r = driveCalcAll({ svc, sqft: 3500, rooms: BASE, job: Object.assign({ svc, docTier: 'values' }, matter ? { matterType: matter } : {}),
      seed: fixed ? { 'e-fixed': { checked: true } } : {} });
    if (after) { after(r.ctx); r.ctx.calcAll(); }
    return { total: r.est.havellinTotal, fixed: r.est.fixedSuggested, estSvc: r.est.svc, jobSvc: r.ctx.jobs[0].svc,
             flag: r.doc.getElementById('e-svc-flag').innerHTML };
  });
}

const OUT_FOR_APPROVAL = 'This estimate is out for manager approval, so it cannot be edited. It opens for editing again once a manager approves it or denies it.';
const SWITCH = 'Switch the service to Estate Settlement before the estimate is approved; it reprices the estimate.';
const HEAD_TRUST = 'No court on this matter: it is recorded as a trust administration. The Probate Estate Settlement service prices court work that will not happen.';
const HEAD_NEITHER = 'No court on this matter: it is recorded as a family distribution, with no trust. The Probate Estate Settlement service prices court work that will not happen.';

module.exports = function ({ group, ok, eq, has, lacks }) {
  const G = (name, body) => { group(name); try { inEastern(body); } catch (e) { ok(false, name + ' — threw: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); } };

  // ═══════════════════════════════════════════════════════════════════════════
  G('S1 · one rule: a probate service on a matter answered with no probate (probateSvcOffTrack)', () => {
    const R = lift(['probateSvcOffTrack'], [], {});
    // Worked out from the rule as decided, never by asking the code: the probate track is a Probate or Both answer, and an
    // unanswered matter (a Probate service records that a case was open at intake); only Trust and Neither are off it.
    const want = (svc, mt) => (svc === 'probate' || svc === 'contested_probate') && (mt === 'trust' || mt === 'neither');
    const got = {}, exp = {};
    SERVICES.forEach((svc) => MATTERS.forEach((mt) => { const k = svc + '/' + (mt || '-'); got[k] = R.probateSvcOffTrack({ svc, matterType: mt }); exp[k] = want(svc, mt); }));
    eq(got, exp, '⚠⚠ every service × matter: only Probate and Contested Probate on Trust or Neither are off the track');
    ok(R.probateSvcOffTrack(JOB('probate', 'trust')), 'a job record answers as the form\'s two values do');
    ok(R.probateSvcOffTrack({ svc: 'cleanout', matterType: 'trust' }, 'probate'), '`svcKey` asks about the service an estimate priced');
    ok(!R.probateSvcOffTrack({ svc: 'probate', matterType: 'trust' }, 'cleanout'), '…in both directions');
    ok(R.probateSvcOffTrack({ serviceType: 'contested_probate', matterType: 'neither' }), 'a record carrying the older serviceType field');
    ok(!R.probateSvcOffTrack({ svc: 'probate', matterType: 'court' }), 'an answer the catalogue does not know is no answer: on the track');
    ok(!R.probateSvcOffTrack(null) && !R.probateSvcOffTrack({}), 'nothing, or no service: not off the track');
    has(noComments(fn('probateSvcOffTrack')), '!jobOnProbateTrack(job, svc)', 'it reads the one definition of the probate track');
    lacks(codeOnly(fn('probateSvcOffTrack')), 'onProbate', 'and keeps no copy of the catalogue\'s flag');
    eq(readers('probateSvcOffTrack'), { docServiceTitle: 1, probateSvcFlag: 1, proposedPlanRow: 1 },
       '⚠ its readers: the namer, the flag and the estimate\'s narrative, and nothing else');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('S2 · one namer for the service on a client document (docServiceTitle), built on the catalogue', () => {
    const N = lift(['docServiceTitle'], [], {});
    const title = (svc, mt) => N.docServiceTitle(JOB(svc, mt));
    // The catalogue's names, typed here so a wrong catalogue cannot agree with itself.
    const ON = { probate: 'Probate Estate Settlement', contested_probate: 'Contested Probate Estate Settlement', cleanout: 'Estate Settlement',
      downsizing: 'Home Editing', downsizing_move: 'Home Transition', home_cleanout: 'Home Cleanout', prep: 'Home Prep for Sale' };
    const OFF = { probate: 'Estate Settlement', contested_probate: 'Contested Estate Settlement' };
    const got = {}, exp = {};
    SERVICES.forEach((svc) => MATTERS.forEach((mt) => {
      const k = svc + '/' + (mt || '-');
      got[k] = title(svc, mt);
      exp[k] = (OFF[svc] && (mt === 'trust' || mt === 'neither')) ? OFF[svc] : ON[svc];
    }));
    eq(got, exp, '⚠⚠ every service × matter: the catalogue\'s name, except a probate service off the track');
    eq([title('probate', 'trust'), title('contested_probate', 'trust')], ['Estate Settlement', 'Contested Estate Settlement'],
       '⚠⚠ Probate reads Estate Settlement and Contested Probate reads Contested Estate Settlement, though intake stored the probate label');
    eq(N.docServiceTitle({ svc: 'cleanout', matterType: 'trust' }, 'probate'), 'Estate Settlement', '`svcKey` names the estimate\'s own service');
    eq(N.docServiceTitle({ svc: 'probate', matterType: 'probate' }, 'contested_probate'), 'Contested Probate Estate Settlement', '…on the track too');
    eq(N.docServiceTitle({ svc: 'retired_key', svcLabel: 'Something Old' }), 'Something Old', 'a key the catalogue no longer has keeps its stored text (svcLabelOf)');
    eq([N.docServiceTitle(null), N.docServiceTitle({})], ['—', '—'], 'nothing names a service: svcLabelOf\'s dash');
    eq(readers('docServiceTitle'), { agreementHtml: 1, buildAgreementEmailHtml: 1, buildEstimateEmailHtml: 1, buildInvoiceEmailHtml: 1,
      clientEstimateHtml: 1, invoiceHtml: 1, probateAgreementHtml: 1 },
       '⚠ its readers: both agreement forms, the client estimate, the invoices and the three client emails');
    // No client document names the service any other way.
    const CLIENT = ['clientEstimateHtml', 'buildPrepEstimateBody', 'clientJobPlanSection', 'proposedPlanRow', '_cePhases', 'probateAgreementHtml',
      'agreementHtml', 'invoiceHtml', 'buildInvoiceEmailHtml', 'buildInvoiceEmailText', 'buildAgreementEmailHtml', 'buildAgreementEmailText',
      'buildEstimateEmailHtml', 'buildEstimateEmailText', 'signingPacketHtml', 'buildSigningPacketHtml', 'invoiceEmailSubject', 'agreementEmailSubject',
      'estimateEmailSubject', 'docNames', 'printChangeOrder'];
    const bad = CLIENT.filter((f) => { const b = codeOnly(fn(f)); return /\bsvcLabelOf\(|\.svcLabel\b/.test(b); });
    eq(bad, [], '⚠⚠ no client document builder reads svcLabelOf or the stored label');
    ['svcLabelMap', '_svcSubHdr', 'var svcMap'].forEach((n) => lacks(LIVE, n, 'the hand map is gone: ' + n));
    const code = codeOnly(SRC.slice(SRC.indexOf('<script>')));
    eq([(SRC.match(/'Probate Estate Settlement'/g) || []).length, (SRC.match(/'Contested Probate Estate Settlement'/g) || []).length], [1, 1],
       'the decedent names are typed once in the script, in the catalogue (intake\'s options are markup)');
    ok(code.length > 1000000, 'fixture: the script read is the whole file (' + code.length + ')');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('S3 · off the probate track the documents name the service without "Probate", Probate and Contested Probate alike', () => {
    [['probate', 'trust', 'Estate Settlement'], ['probate', 'neither', 'Estate Settlement'],
     ['contested_probate', 'trust', 'Contested Estate Settlement'], ['contested_probate', 'neither', 'Contested Estate Settlement']].forEach(([svc, mt, name]) => {
      const d = render(svc, mt);
      const at = svc + ' on ' + mt + ': ';
      ok(d.agr.length > 20000 && d.est.length > 5000 && d.deposit.length > 400, at + 'fixture: the documents rendered (' + [d.agr.length, d.est.length, d.deposit.length] + ')');
      eq(agrTitle(d.agr), name, at + '⚠⚠ the agreement\'s title');
      has(d.agr, 'This Agreement governs ' + name + ' services provided by Havellin Palm Beach, LLC', at + 'and its header sentence');
      lacks(d.agr, 'Probate Estate', at + 'no "Probate Estate" anywhere on the agreement');
      // What "probate" the form still prints is clause wording, never the service: §4.1's ancillary probate in another
      // state, §5.1's conditional ("If acting as Personal Representative…"), and on Neither §5.2's own negation.
      const left = probateWords(d.agr).filter((w) => !/ancillary probate coordination|duly appointed by the probate court|not being administered through a probate proceeding/.test(w));
      eq(left, [], at + 'the only "probate" left on the form is §4.1, §5.1 and §5.2\'s negation');
      eq(serviceRow(d.est), name, at + '⚠⚠ the client estimate\'s service row');
      eq(onsite(d.est), 'Onsite ' + name + ' Services', at + 'and its fee table\'s heading');
      eq(probateWords(d.est), [], at + '⚠⚠ the client estimate prints no "probate" at all');
      lacks(text(d.est), 'the court and counsel', at + 'and no court');
      ['deposit', 'midpoint', 'final'].forEach((st) => {
        eq(serviceRow(d[st]), name, at + 'the ' + st + ' invoice\'s service row');
        eq(probateWords(d[st]), [], at + 'the ' + st + ' invoice prints no "probate"');
      });
      [['invEmail', 'invoice'], ['agrEmail', 'agreement'], ['estEmail', 'estimate']].forEach(([k, w]) => {
        eq(emailService(d[k]), name, at + 'the ' + w + ' email names it');
        eq(probateWords(d[k]), [], at + 'and prints no "probate"');
      });
      ok(d.packet.length > 20000, at + 'fixture: the signing packet rendered (' + d.packet.length + ')');
      lacks(d.packet, 'Probate Estate', at + 'the signing packet, agreement and Exhibit A together, names no "Probate Estate"');
    });
    // The narrative: the probate one, without the probate or the court.
    const pt = text(render('probate', 'trust').est);
    has(pt, 'We settle the estate room by room under full documentation standards — a complete inventory, photographs, and chain-of-custody tracking for items of value, with the remainder routed to sale, donation, or disposal. Your Transition Concierge maintains the records counsel may request and keeps all parties informed.',
        '⚠⚠ the narrative: the same work, without "probate requires" or "the court"');
    has(text(render('contested_probate', 'trust').est), 'We settle the estate room by room under heightened documentation standards', 'Contested\'s narrative, which named neither, is its own');
  });

  G('S3 · on the probate track, and on every other service, the documents read as before', () => {
    ['', 'probate', 'both'].forEach((mt) => {
      const d = render('probate', mt), at = 'probate on ' + (mt || 'an unanswered matter') + ': ';
      eq(agrTitle(d.agr), 'Probate Estate Settlement', at + 'the agreement keeps its title');
      has(d.agr, 'This Agreement governs Probate Estate Settlement services provided', at + 'and its header sentence');
      eq([serviceRow(d.est), onsite(d.est)], ['Probate Estate Settlement', 'Onsite Probate Estate Settlement Services'], at + 'the estimate\'s row and heading');
      has(text(d.est), 'We settle the estate room by room under the documentation standards probate requires', at + 'and the probate narrative');
      has(text(d.est), 'Your Transition Concierge maintains the records the court and counsel may request and keeps all parties informed.', at + 'with its court');
      eq(serviceRow(d.final), 'Probate Estate Settlement', at + 'the invoices');
      eq(emailService(d.invEmail), 'Probate Estate Settlement', at + 'the emails');
    });
    ['', 'probate', 'both'].forEach((mt) => {
      const d = render('contested_probate', mt), at = 'contested on ' + (mt || 'an unanswered matter') + ': ';
      eq(agrTitle(d.agr), 'Contested Probate Estate Settlement', at + 'the agreement is titled from the catalogue');
      eq([serviceRow(d.est), onsite(d.est)], ['Contested Probate Estate Settlement', 'Onsite Contested Probate Estate Settlement Services'],
         at + 'the estimate\'s row, and its heading from the catalogue (it read "Onsite Contested Probate Estate Services")');
    });
    // The estate form's own fallback for Contested Probate is gone: with no label stored it read "Estate Services".
    eq(agrTitle(render('contested_probate', 'probate', { svcLabel: undefined }).agr), 'Contested Probate Estate Settlement',
       '⚠ Contested Probate with no stored label is titled from the catalogue, never "Estate Services"');
    ['', 'trust', 'neither'].forEach((mt) => eq(agrTitle(render('cleanout', mt).agr), 'Estate Settlement', 'Estate Settlement on ' + (mt || 'unanswered') + ': as before'));
    [['downsizing', 'Home Editing'], ['downsizing_move', 'Home Transition'], ['home_cleanout', 'Home Cleanout']].forEach(([svc, name]) => {
      const d = render(svc, '');
      eq([agrTitle(d.agr), serviceRow(d.est), onsite(d.est), serviceRow(d.deposit)], [name, name, 'Onsite ' + name + ' Services', name], svc + ': the catalogue\'s name on every document');
    });
    eq(agrTitle(render('home_cleanout', '', { svcLabel: undefined }).agr), 'Home Cleanout', '⚠ Home Cleanout with no stored label: the catalogue (its old map had no entry, and printed "[SERVICE TYPE]")');
    eq(agrTitle(render('prep', '').agr), 'Home Prep for Sale', 'Home Prep for Sale');
    const blank = inEastern(() => attempt(() => docs({ id: 9 }, null).agreementHtml({ id: 9 }, null)));
    eq(agrTitle(blank), '[SERVICE TYPE]', 'a blank template names no service and keeps its blank');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('S4 · the price follows the service, on every matter, exactly as before (driveCalcAll)', () => {
    Object.keys(PRICED_BEFORE).forEach((svc) => {
      const got = MATTERS.map((mt) => { const h = priced(svc, mt, false), f = priced(svc, mt, true); return [h.total, f.fixed]; });
      eq(got, MATTERS.map(() => PRICED_BEFORE[svc]), '⚠⚠ ' + svc + ': $' + PRICED_BEFORE[svc][0] + ' hourly and $' + PRICED_BEFORE[svc][1]
         + ' suggested fixed on every matter, the figures 456d0cb priced');
    });
    ok(PRICED_BEFORE.probate[0] > PRICED_BEFORE.cleanout[0] && PRICED_BEFORE.contested_probate[0] > PRICED_BEFORE.probate[0],
       'the services price differently, so the price is the service\'s own (Probate above Estate Settlement, Contested above both)');
    const t = priced('probate', 'trust', false);
    eq([t.estSvc, t.jobSvc], ['probate', 'probate'], '⚠⚠ nothing re-types the service: the estimate and the job stay Probate on a trust');
    const P = sandbox({ fns: ['fixedPriceBuffer'], vars: ['JOB_STEPS'] });
    eq([P.JOB_STEPS.probate.legal, P.JOB_STEPS.contested_probate.legal, P.JOB_STEPS.cleanout.legal], [[0.10, 0], [0.46, 0.15], undefined],
       'the court step is the service\'s, untouched');
    eq([P.fixedPriceBuffer('probate'), P.fixedPriceBuffer('contested_probate'), P.fixedPriceBuffer('cleanout')], [0.25, 0.35, 0.20],
       'and so are the fixed-price contingencies');
    const engine = ['calcAll', 'computeEngineV3', 'fixedPriceBuffer', 'effectiveJobSteps'].filter((f) => /docServiceTitle|probateSvcOffTrack\(/.test(codeOnly(fn(f))));
    eq(engine, [], 'the engine reads neither the namer nor the rule');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('S5 · the flag (probateSvcFlag): Probate only, until a manager approves; the route while out for approval', () => {
    const F = lift(['probateSvcFlag'], [], { estimateStore: {}, jobs: [] });
    const flag = (svc, mt, rec, o) => F.probateSvcFlag(Object.assign({ svc }, mt ? { matterType: mt } : {}, o || {}), rec || null);
    eq(flag('probate', 'trust'), HEAD_TRUST + ' ' + SWITCH, '⚠⚠ Probate on a trust: no court, the court work priced, and the switch suggested');
    eq(flag('probate', 'neither'), HEAD_NEITHER + ' ' + SWITCH, '⚠⚠ …and on Neither');
    eq(['trust', 'neither'].map((mt) => flag('contested_probate', mt)), ['', ''], '⚠⚠ Contested Probate is never flagged: its price stays');
    eq(['', 'probate', 'both'].map((mt) => flag('probate', mt)), ['', '', ''], 'on the probate track (Both, and unanswered) there is nothing to flag');
    eq(['cleanout', 'downsizing', 'home_cleanout', 'prep'].map((s) => flag(s, 'trust')), ['', '', '', ''], 'nor on any other service');
    eq(flag('probate', 'trust', { approved: true }), '', '⚠⚠ approved: no suggestion (the price stays; ✎ Edit estimate or a change order is the route)');
    eq(flag('probate', 'trust', null, { approved: true }), '', '…approved on the job record alike');
    const out = flag('probate', 'trust', { submitted: true });
    eq(out, HEAD_TRUST + ' ' + OUT_FOR_APPROVAL, '⚠⚠ out for approval: the matter, and the route instead of the switch');
    const outJob = { svc: 'probate', matterType: 'trust', status: 'pending' };
    eq(F.probateSvcFlag(outJob, null), HEAD_TRUST + ' ' + F.estimateRepriceRoute(outJob, null), 'a job pending approval: the route is estimateRepriceRoute\'s own');
    eq(flag('probate', 'trust', { submitted: false, approved: false }, { status: 'new' }), HEAD_TRUST + ' ' + SWITCH, 'a denied estimate is a draft again: the switch');
    eq(flag('probate', 'trust', null, { id: 7, name: 'Margaret Doe' }), HEAD_TRUST + ' ' + SWITCH, 'a job record answers as a form\'s two values');
    eq(readers('probateSvcFlag'), { calcAll: 1, ecPaintSvcFlag: 1, saveClientEdit: 1, toggleIntakeFields: 1 },
       '⚠ its readers: intake\'s toggle, Edit Client\'s painter and save notice, Build Estimate\'s summary — and no save refusal');
    // calcAll paints two slots since P22: under the total, and beside the picker in field mode (#e-svc-flag-field), one flag.
    eq(readers('paintProbateSvcFlag'), { calcAll: 2, ecPaintSvcFlag: 1, toggleIntakeFields: 1 }, 'one painter, on the three screens');
    eq(readers('ecPaintSvcFlag'), { ecToggleProbate: 1, showEditClient: 1 }, 'Edit Client paints on open and on every change');
    ['saveIntake', 'saveEstimateAndPreview', 'submitForApproval', 'checkPin', 'dashApproveEstimate', 'changeEstimateService'].forEach((f) =>
      lacks(codeOnly(fn(f)), 'probateSvcFlag', 'never a refusal: ' + f + ' does not ask it'));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLIENT INTAKE, driven: the real toggle over a domStub holding what was picked (p19-authority.test.js's rig).
  G('S6 · Client Intake flags it live, as the service or the matter changes', () => {
    const d = domStub({ 'i-svc': 'probate', 'i-matter-type': 'trust' });
    const c = lift(['toggleIntakeFields'], ['onDocGateChange'], { document: d, jobs: [], onDocGateChange() {} });
    const look = (svc, mt) => { d.getElementById('i-svc').value = svc; d.getElementById('i-matter-type').value = mt; c.toggleIntakeFields();
      return d.getElementById('i-svc-flag').innerHTML; };
    const tr = look('probate', 'trust');
    has(tr, 'class="alert a-warn"', 'a warning box');
    eq(text(tr), HEAD_TRUST + ' ' + SWITCH, '⚠⚠ Probate on a trust, at intake: the flag and the switch');
    eq(text(look('probate', 'neither')), HEAD_NEITHER + ' ' + SWITCH, 'the matter changed to Neither: the flag follows');
    eq(look('probate', 'both'), '', 'to Both: gone');
    eq(look('probate', ''), '', 'unanswered: nothing');
    eq(look('contested_probate', 'trust'), '', '⚠ Contested Probate on a trust: never flagged');
    eq(look('cleanout', 'trust'), '', '⚠⚠ the service switched to Estate Settlement: gone');
    eq(text(look('probate', 'trust')), HEAD_TRUST + ' ' + SWITCH, 'and back, live');
    const markup = SRC.slice(SRC.indexOf('<body>'), SRC.indexOf('<script>', SRC.indexOf('<body>')));
    const at = markup.indexOf('<div id="i-svc-flag"></div>');
    ok(at > markup.indexOf('id="i-matter-type"') && at < markup.indexOf('id="i-doc-tier"'), 'its slot sits under the matter question, inside the estate block');
    eq((markup.match(/id="i-svc-flag"/g) || []).length, 1, 'once');
  });

  G('S6 · Client Intake saves a Probate service on a trust as picked: a flag, never a refusal or a switch', () => {
    const d = domStub({ 'i-fname': 'Margaret', 'i-lname': 'Doe', 'i-svc': 'probate', 'i-addr': '69 Beach Blvd', 'i-city': 'Palm Beach', 'i-zip': '33480',
      'i-sqft': '3500', 'i-ptype': 'Estate', 'i-src': 'Family', 'i-start': '2026-10-19', 'i-tc': 'Ashley Jerome', 'i-pri': 'normal', 'i-re': 'unknown',
      'i-prem': 'no', 'i-date-of-death': '2026-01-15', 'i-matter-type': 'trust', 'i-gate-706': 'no', 'i-doc-tier': 'values',
      'i-executor-fname': 'Ruth', 'i-executor-lname': 'Adler', 'i-executor-role': 'Trustee', 'i-executor-phone': '(561) 555-0101',
      'i-executor-email': 'ruth@adler.example', 'i-executor-auth': 'pending', 'i-probate-case': '2026-CP-001234',
      'i-probate-atty-fname': 'Ann', 'i-probate-atty-lname': 'Lowe', 'i-probate-atty-firm': 'Lowe & Co', 'i-probate-atty-phone': '(561) 555-0102',
      'i-probate-atty-email': 'ann@lowe.law' });
    const said = { fb: [], landed: [] };
    const c = lift(['saveIntake', 'toggleIntakeFields', 'buildCoFiduciaryBlock'], ['onDocGateChange'], {
      document: d, jobs: [], Date: FixedDate(NOW), setTimeout: () => 0, clearTimeout() {}, referralDirectory: [], saveJobs() {}, syncJobToSheets() {},
      createDriveJobFolder() {}, populateAgrSelect: null, goToClientDashboard: (id, k, m) => said.landed.push({ id, k, m: String(m) }),
      showFB: (el, k, m) => said.fb.push({ el, k, m: String(m) }), clearIntakeForm() {}, onDocGateChange() {}, confirm: () => true });
    c.buildCoFiduciaryBlock();
    c.toggleIntakeFields();
    has(text(d.getElementById('i-svc-flag').innerHTML), SWITCH, 'fixture: the flag is on the form when Save Client is pressed');
    c.saveIntake();
    eq(said.fb.map((f) => f.m), [], '⚠⚠ nothing refused');
    const j = c.jobs[0] || {};
    eq([j.svc, j.matterType], ['probate', 'trust'], '⚠⚠ the service is saved as picked: nothing re-types it');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDIT CLIENT: the modal rendered, its flag painted on open and live, and the save's notice.
  const ecLift = (d, job, store, said) => lift(['showEditClient', 'ecToggleProbate', 'saveClientEdit'], ['renderClientDashboard', 'renderJobs', 'calcAll'], {
    document: d, jobs: [JSON.parse(JSON.stringify(job))], estimateStore: store || {}, contractors: [], referralDirectory: [], REFERRAL_SYNC_URL: '',
    Date: FixedDate(NOW), setTimeout: () => 0, saveJobs() {}, syncJobToSheets() {}, renderClientDashboard() {}, renderJobs() {}, calcAll() {},
    dashNotice: (t, m) => said.notices.push([t, String(m)]), alert: (m) => said.alerts.push(String(m)), confirm: () => true });
  // What a browser holds once the modal is drawn: the controls as rendered, and the slot's data-job (domStub parses no markup).
  const ecOpen = (job, store, edits) => {
    const said = { notices: [], alerts: [] };
    const probe = domStub({});
    ecLift(probe, job, store, said).showEditClient(job.id);
    const html = probe.getElementById('edit-client-modal').innerHTML;
    const form = {};
    (html.match(/<select\b[^>]*>[\s\S]*?<\/select>/g) || []).forEach((t) => {
      const id = /\bid="([^"]+)"/.exec(t); if (!id) return;
      const opts = t.match(/<option\b[^>]*>/g) || [];
      const sel = opts.find((o) => / selected\b/.test(o)) || opts[0] || '';
      const v = /\bvalue="([^"]*)"/.exec(sel); form[id[1]] = v ? unesc(v[1]) : '';
    });
    (html.match(/<input\b[^>]*>/g) || []).forEach((t) => {
      const id = /\bid="([^"]+)"/.exec(t); if (!id) return;
      const v = /\bvalue="([^"]*)"/.exec(t); form[id[1]] = v ? unesc(v[1]) : '';
    });
    (html.match(/<textarea\b[^>]*>[\s\S]*?<\/textarea>/g) || []).forEach((t) => {
      const id = /\bid="([^"]+)"/.exec(t); if (!id) return;
      form[id[1]] = unesc(t.replace(/^<textarea\b[^>]*>/, '').replace(/<\/textarea>$/, ''));
    });
    const seed = Object.assign(form, edits || {});
    const slot = /id="ec-svc-flag" data-job="([^"]*)"/.exec(html);
    seed['ec-svc-flag'] = { dataset: { job: slot ? slot[1] : '' } };
    const d = domStub(seed);
    const c = ecLift(d, job, store, said);
    c.showEditClient(job.id);   // drawn again over the controls a browser now holds: ecPaintSvcFlag paints on open
    return { html, d, c, said, flag: () => d.getElementById('ec-svc-flag').innerHTML };
  };

  G('S6 · Edit Client flags it on open and live, as the service or the matter changes', () => {
    const e = ecOpen(JOB('probate', 'trust'), {});
    has(e.html, '<div id="ec-svc-flag" data-job="7" style="grid-column:1 / -1;display:none;"></div>', 'the slot, naming the client, drawn hidden');
    ok(e.html.indexOf('id="ec-svc-flag"') > e.html.indexOf('id="ec-matter-type"') && e.html.indexOf('id="ec-svc-flag"') < e.html.indexOf('id="ec-doc-tier"'),
       'under the matter question');
    eq(text(e.flag()), HEAD_TRUST + ' ' + SWITCH, '⚠⚠ painted on open: Probate on a trust');
    const look = (svc, mt) => { e.d.getElementById('ec-svc').value = svc; e.d.getElementById('ec-matter-type').value = mt; e.c.ecToggleProbate(); return e.flag(); };
    eq(e.d.getElementById('ec-svc-flag').style.display, '', 'the slot is shown while it says something');
    eq(look('cleanout', 'trust'), '', '⚠⚠ the service switched to Estate Settlement in the picker: gone, live');
    eq(e.d.getElementById('ec-svc-flag').style.display, 'none', 'and hidden when empty, so it takes no row in the grid');
    eq(text(look('probate', 'trust')), HEAD_TRUST + ' ' + SWITCH, 'back to Probate: back');
    eq(text(look('probate', 'neither')), HEAD_NEITHER + ' ' + SWITCH, 'the matter changed to Neither: follows');
    eq(look('probate', 'both'), '', 'to Both: gone');
    eq(look('contested_probate', 'trust'), '', '⚠ Contested Probate: never');
    eq(ecOpen(JOB('probate', 'trust'), { 7: { approved: true, estimate: EST('probate') } }).flag(), '', '⚠⚠ an approved estimate: no suggestion on open');
    eq(text(ecOpen(JOB('probate', 'trust'), { 7: { submitted: true, estimate: EST('probate') } }).flag()), HEAD_TRUST + ' ' + OUT_FOR_APPROVAL,
       'out for approval: the route');
    eq(ecOpen(JOB('cleanout', 'trust'), {}).flag(), '', 'an Estate Settlement on a trust: nothing');
  });

  G('S6 · Edit Client\'s save names it in the notice, and saves what was picked', () => {
    const kept = ecOpen(JOB('probate', 'trust'), {});
    kept.c.saveClientEdit(7);
    const n = kept.said.notices.slice(-1)[0] || ['', ''];
    eq(n[0], 'warn', 'a warning notice');
    has(n[1], 'Saved.', 'the save went through');
    has(n[1], HEAD_TRUST + ' ' + SWITCH, '⚠⚠ and names the flag');
    eq([kept.c.jobs[0].svc, kept.c.jobs[0].matterType], ['probate', 'trust'], '⚠⚠ nothing re-typed: the service stays Probate');
    eq(kept.said.alerts, [], 'nothing refused');
    const switched = ecOpen(JOB('probate', 'trust'), {}, { 'ec-svc': 'cleanout' });
    switched.c.saveClientEdit(7);
    eq(switched.c.jobs[0].svc, 'cleanout', '⚠⚠ switched in the real picker by a person: saved as Estate Settlement');
    eq(switched.said.notices.filter((x) => x[1].indexOf('No court on this matter') >= 0), [], 'and no flag in its notice');
    const approved = ecOpen(JOB('probate', 'trust', { approved: true }), { 7: { approved: true, estimate: EST('probate') } });
    approved.c.saveClientEdit(7);
    eq(approved.said.notices.filter((x) => x[1].indexOf('No court on this matter') >= 0), [], 'approved: the notice suggests nothing');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('S6 · Build Estimate flags it beside the summary while the estimate is unapproved (calcAll)', () => {
    eq(text(priced('probate', 'trust').flag), HEAD_TRUST + ' ' + SWITCH, '⚠⚠ Probate on a trust: flagged under the total');
    eq(text(priced('probate', 'neither').flag), HEAD_NEITHER + ' ' + SWITCH, 'on Neither');
    eq(['', 'probate', 'both'].map((mt) => priced('probate', mt).flag), ['', '', ''], 'on the track: nothing');
    eq([priced('contested_probate', 'trust').flag, priced('cleanout', 'trust').flag], ['', ''], 'Contested Probate and Estate Settlement: nothing');
    eq(priced('probate', 'trust', false, (c) => { c.estimateStore[7] = { approved: true }; }).flag, '', '⚠⚠ the saved estimate approved: nothing');
    eq(priced('probate', 'trust', false, (c) => { c.estimateApproved = true; }).flag, '', 'the screen holding an approved build: nothing');
    eq(text(priced('probate', 'trust', false, (c) => { c.estimateStore[7] = { submitted: true }; }).flag), HEAD_TRUST + ' ' + OUT_FOR_APPROVAL,
       'out for approval: the route');
    eq(text(priced('probate', 'trust', false, (c) => { c.estimateSubmitted = true; }).flag), HEAD_TRUST + ' ' + OUT_FOR_APPROVAL, 'submitted on this screen: the route');
    // The service THIS SCREEN prices decides, not the record's: Edit Client switched the job to Estate Settlement while this
    // build stayed open on Probate (the resumed screen does not repaint its picker), so the total under the flag is a
    // Probate one and the flag says so.
    const stale = inEastern(() => { const r = driveCalcAll({ svc: 'probate', sqft: 3500, rooms: BASE, job: { svc: 'cleanout', matterType: 'trust', docTier: 'values' } });
      return { flag: r.doc.getElementById('e-svc-flag').innerHTML, svc: r.est.svc, total: r.est.havellinTotal }; });
    eq([stale.svc, stale.total], ['probate', PRICED_BEFORE.probate[0]], 'fixture: the screen prices Probate while the job record says Estate Settlement');
    eq(text(stale.flag), HEAD_TRUST + ' ' + SWITCH, '⚠ the flag follows the service the screen prices, the number it sits under');
    const markup = SRC.slice(SRC.indexOf('<body>'), SRC.indexOf('<script>', SRC.indexOf('<body>')));
    has(markup, '<div id="e-contract-gate"></div>\n        <!-- A Probate service on a matter with no court (P20, Q26), under the number it prices',
        'its slot follows the contract gate, under the total');
    ok(markup.indexOf('id="e-svc-flag"') > markup.indexOf('id="est-summary-col"') && markup.indexOf('id="e-svc-flag"') < markup.indexOf('id="est-save-card"'),
       'inside the summary column');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('S7 · Q27: the trust\'s title spells the month out, read at local noon (trustInstrumentTitle)', () => {
    const T = lift(['trustInstrumentTitle'], [], {});
    const t = (o, blank) => T.trustInstrumentTitle(Object.assign({ trustName: 'Adler Family Trust' }, o), blank);
    eq(t({ trustDate: '2015-03-03' }), 'The Adler Family Trust, dated March 3, 2015', '⚠⚠ "dated March 3, 2015", never "Mar 3"');
    eq(['2015-01-31', '2016-02-29', '2019-09-01', '2020-12-31'].map((d) => t({ trustDate: d })),
       ['The Adler Family Trust, dated January 31, 2015', 'The Adler Family Trust, dated February 29, 2016',
        'The Adler Family Trust, dated September 1, 2019', 'The Adler Family Trust, dated December 31, 2020'], 'every month spelled out');
    // Never a UTC parse: a bare yyyy-mm-dd read as UTC midnight is the day before west of Greenwich, the day of east of it.
    ['America/New_York', 'Pacific/Honolulu', 'Pacific/Kiritimati'].forEach((tz) => {
      const prev = process.env.TZ; process.env.TZ = tz;
      try { eq(t({ trustDate: '2015-03-01' }), 'The Adler Family Trust, dated March 1, 2015', 'the first of the month stays the first in ' + tz); }
      finally { process.env.TZ = prev; }
    });
    eq(t({ trustDate: '' }, '____'), 'The Adler Family Trust, dated ____________________', 'no date on a form: the line to complete');
    eq(T.trustInstrumentTitle({ trustDate: '2015-03-03' }, '____'), '____, dated March 3, 2015', 'no name on a form: the name is the line');
    eq(T.trustInstrumentTitle({ trustDate: '2015-03-03' }), '', 'a schedule: a date alone names no trust');
    has(noComments(fn('trustInstrumentTitle')), 'esc(fmtCEDate(d))', 'it reads the long-date helper');
    lacks(codeOnly(fn('trustInstrumentTitle')), 'fmtDate2', 'and not the short one');
    has(noComments(fn('fmtCEDate')), "new Date(d+'T12:00:00')", 'which reads the day at local noon');
    eq(readers('trustInstrumentTitle'), { clientEstimateHtml: 1, printTrustSchedule: 2, probateAgreementHtml: 2 }, 'the documents the title reaches');
    // On each of them, rendered.
    const d = render('probate', 'trust');
    has(text(d.agr), 'Trust The Adler Family Trust, dated March 3, 2015', '⚠⚠ the agreement\'s §1.2');
    has(text(render('cleanout', 'both').agr), 'Trust The Adler Family Trust, dated March 3, 2015', 'Both\'s trust row too');
    has(text(d.est), 'Trust The Adler Family Trust, dated March 3, 2015', '⚠⚠ the client estimate\'s identity line');
    lacks(d.agr + d.est + d.packet, 'Mar 3, 2015', 'the short date is nowhere on them');
    const S = lift(['printTrustSchedule'], ['_printDocument'], { jobs: [JOB('cleanout', 'trust')], _photoRefs: { 7: [
      { stableId: 'i1', label: 'inventory', objectName: 'Chesterfield sofa', category: 'Furniture', condition: 'Good', qty: '1', ts: 1, fmv: '4000', assetTrack: 'Trust' }] },
      estimateStore: {}, _printDocument: (h) => !!h });
    const r = attempt(() => S.printTrustSchedule(7, { asHtml: true }));
    const sh = typeof r === 'string' ? r : (r && (r.html || ('WHY ' + r.why))) || '';
    ok(sh.indexOf('Schedule of Tangible Personal Property Held in Trust') >= 0, 'fixture: the Trust Schedule rendered (' + sh.slice(0, 40) + ')');
    has(sh, '<div style="font-size:12px;margin-bottom:2px;">The Adler Family Trust, dated March 3, 2015</div>', '⚠⚠ the Trust Schedule\'s header');
  });
};
