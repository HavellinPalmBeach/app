'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P19 · W1 AUTHORITY — THE CLIENT RECORD (2026-10-03). Anthony: "i'm good with all of your calls. build it all".
//
//   A1  The successor trustee's Certification of Trust (Fla. Stat. §736.1017) holds a trust job's activation the way the
//       Letters hold a probate one (call 1). jobActivationBlockers asks estateAuthority; the Letters' line is byte for
//       byte what it was. The rail, the handler's alert and the dashboard's chips name the paper by route.
//   A2  Labels follow the matter: intake's and Edit Client's authority control is the Letters of Administration on the
//       probate track, the Certification of Trust on a trust-only matter, and is not shown where the matter has no
//       paper (Neither, or an Estate Settlement not yet answered). The client card names the paper, or draws no field.
//   A3  The Trust card carries the Certification of Trust as the Probate card carries the Letters.
//   A4  The trust itself: job.trustName, trustDate, trusteeAcceptedOn, asked wherever the matter holds a trust.
//   A5  The property-sale question on a trust as on a court matter (propertySaleAsked).
//   A6  Co-representatives (call 4): both forms record every co-executor and co-trustee on job.coFiduciaries through
//       the record list's writer; the card lists them under the route's heading, and says DocuSign goes to one signer.
//   A7  Form 706 (call 5): jobSchedule carries the date, the strip prints it beside the court deadline, the card shows
//       it; red within 30 days or once passed. A reminder: counsel or the accountant files.
//
// Everything is DRIVEN through the real functions (intake, Edit Client, the dashboard, the rail, the transition), each
// lifted as its own call graph derived from the source, with only the boundaries stubbed by name: the store saves and
// syncs, the network, the screen's notices, and the sandbox's clock (FixedDate), so nothing here reads the wall clock.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { sandbox, source, fn, decl, domStub } = require('./harness');

const SRC = source();
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
const noComments = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
// The functions and top-level vars `roots` reach (the closure p18-trust-package.test.js uses); `stop` names what the
// test supplies itself.
// Memoised: the walk reads the source once per function, and the rigs below lift the same graphs many times.
const _closureMemo = new Map();
function closure(roots, stop) {
  const memoKey = JSON.stringify([roots, (stop || []).slice().sort()]);
  if (!_closureMemo.has(memoKey)) _closureMemo.set(memoKey, closureWalk(roots, stop));
  const c = _closureMemo.get(memoKey);
  return { fns: c.fns.slice(), vars: c.vars.slice() };
}
function closureWalk(roots, stop) {
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
  const c = closure(roots, (stop || []).concat(Object.keys(stubs || {})));
  return sandbox({ fns: c.fns, vars: c.vars, stubs: stubs || {} });
}
const inEastern = (body) => { const prev = process.env.TZ; process.env.TZ = 'America/New_York'; try { return body(); } finally { process.env.TZ = prev; } };
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&middot;/g, '·').replace(/&rsquo;/g, '’')
  .replace(/&mdash;/g, '—').replace(/&#9888;/g, '⚠').replace(/&#10005;/g, '✕').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const unesc = (s) => String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
// The card a rendered dashboard holds whose heading is `title`, from its <div class="card"> to the </div> that closes it.
function cardAt(html, title) {
  const at = String(html).indexOf('>' + title + '<');
  if (at < 0) return '';
  const start = html.lastIndexOf('<div class="card"', at);
  if (start < 0) return '';
  const re = /<div\b|<\/div>/g;
  re.lastIndex = start;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    depth += m[0] === '</div>' ? -1 : 1;
    if (depth === 0) return html.slice(start, m.index + 6);
  }
  return '';
}
// What a browser shows in each control of a rendered form, keyed by id (edit-client-intake-rules.test.js's reader).
function formFromHtml(html) {
  const out = {};
  (html.match(/<input\b[^>]*>/g) || []).forEach((t) => {
    const id = /\bid="([^"]+)"/.exec(t); if (!id) return;
    if (/type="checkbox"/.test(t)) { out[id[1]] = / checked\b/.test(t); return; }
    const v = /\bvalue="([^"]*)"/.exec(t);
    out[id[1]] = v ? unesc(v[1]) : '';
  });
  (html.match(/<textarea\b[^>]*>[\s\S]*?<\/textarea>/g) || []).forEach((t) => {
    const id = /\bid="([^"]+)"/.exec(t); if (!id) return;
    out[id[1]] = unesc(t.replace(/^<textarea\b[^>]*>/, '').replace(/<\/textarea>$/, ''));
  });
  (html.match(/<select\b[^>]*>[\s\S]*?<\/select>/g) || []).forEach((t) => {
    const id = /\bid="([^"]+)"/.exec(t); if (!id) return;
    const opts = t.match(/<option\b[^>]*>/g) || [];
    const sel = opts.find((o) => / selected\b/.test(o)) || opts[0] || '';
    const v = /\bvalue="([^"]*)"/.exec(sel);
    out[id[1]] = v ? unesc(v[1]) : '';
  });
  return out;
}
// The style a rendered element's opening tag carries, by id.
const styleOf = (html, id) => ((new RegExp('id="' + id + '"[^>]*?style="([^"]*)"')).exec(html) || [])[1];

// ── Fixtures ────────────────────────────────────────────────────────────────
const NOW = Date.parse('2026-10-03T15:00:00Z');          // a Saturday afternoon in Palm Beach
const T0 = Date.parse('2026-09-28T15:00:00Z');
const FixedDate = (t) => class extends Date { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } };
const L_GATE = 'Executor authorization must be received';
const C_GATE = 'The successor trustee’s Certification of Trust must be received';
// A trust-only estate, with a co-trustee and the trust itself recorded. Date of death 10 February 2026, a 706 being filed:
// the return is due 10 November 2026, 38 days after NOW.
const TRUST = (o) => Object.assign({
  id: 7, hvlId: 'HVL-0007', name: 'Walter Adler', fname: 'Walter', lname: 'Adler', svc: 'cleanout', status: 'won', won: true, approved: true,
  addr: '69 Beach Blvd', city: 'Palm Beach', zip: '33480', sqft: '4200', ptype: 'Estate', src: 'Family', start: '2026-10-19',
  tc: 'Ashley Jerome', agrApprovedBy: 'Anthony Graziano',
  matterType: 'trust', docTier: 'values', deathDate: '2026-02-10', gate706: 'yes', executorAuth: 'pending',
  executor: 'Rex Hale', executorFname: 'Rex', executorLname: 'Hale', executorRole: 'Trustee', executorEmail: 'rex@hale.example', executorPhone: '(561) 555-0101',
  probateAttyName: 'Ann Lowe', probateAttyFirm: 'Lowe & Co', probateAttyEmail: 'ann@lowe.law', probateAttyPhone: '(561) 555-0102',
  trustName: 'The Adler Family Revocable Trust', trustDate: '2019-04-02', trusteeAcceptedOn: '2026-03-01', probateSale: 'yes',
  coFiduciaries: [{ id: 'cf1', name: 'Daniel Adler', role: 'Trustee', phone: '(561) 555-0103', email: 'dan@adler.example' }],
  docState: {}, at: {}, updatedAt: T0, payments: [],
}, o || {});
const PROBATE = (o) => TRUST(Object.assign({ svc: 'probate', matterType: 'probate', executorRole: 'Personal Representative', probateCase: '2026-CP-001234',
  probateDeadline: '2026-11-20', trustName: '', trustDate: '', trusteeAcceptedOn: '' }, o || {}));
const EST = () => ({ approved: true, estimate: { jobId: 7, svc: 'cleanout', havellinTotal: 24000, days: 6,
  rooms: [{ idx: 1, name: 'Study', st: 'in', vol: 3, cplx: 3 }], vendors: [] } });
const SERVICES = ['probate', 'contested_probate', 'cleanout', 'downsizing', 'downsizing_move', 'home_cleanout', 'prep'];
const MATTERS = ['', 'probate', 'both', 'trust', 'neither'];
const DECEDENT = ['probate', 'contested_probate', 'cleanout'];
// The paper each service × matter holds, worked out here from the rule as decided — never by asking the code: the
// probate track is a Probate or Both answer, or a Probate service whose matter is unanswered; a trust-only answer takes
// the Certification of Trust; nothing else, and nothing at all on a living client.
const PAPER = (svc, mt) => DECEDENT.indexOf(svc) < 0 ? ''
  : (mt === 'probate' || mt === 'both' || (mt === '' && svc !== 'cleanout')) ? 'letters'
  : mt === 'trust' ? 'certification' : '';

module.exports = function ({ group, ok, eq, has, lacks }) {
  const G = (name, body) => { group(name); try { inEastern(body); } catch (e) { ok(false, name + ' — threw: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); } };

  // ═══════════════════════════════════════════════════════════════════════════
  G('A1 · the gate: the paper the matter has holds activation, on every service, matter and answer', () => {
    const S = lift(['jobActivationBlockers'], [], {});
    const B = (o) => S.jobActivationBlockers(Object.assign({ agrSigned: true, depositReceived: true }, o));
    let n = 0;
    SERVICES.forEach((svc) => MATTERS.forEach((mt) => ['pending', '', undefined, 'bogus', 'received', 'notneeded'].forEach((auth) => {
      const paper = PAPER(svc, mt);
      const held = paper && (auth !== 'received' && auth !== 'notneeded');
      const want = held ? [paper === 'letters' ? L_GATE : C_GATE] : [];
      eq(B({ svc, matterType: mt, executorAuth: auth }), want, svc + ' / ' + (mt || 'unanswered') + ' / ' + JSON.stringify(auth) + ' → ' + (want[0] || 'free'));
      n++;
    })));
    eq(n, 210, 'every service, matter and answer was asked (7 × 5 × 6)');
    // ⚠⚠ The probate line is the gate's own, byte for byte, as it read before P19.
    eq(B({ svc: 'probate', executorAuth: 'pending' }), ['Executor authorization must be received'], '⚠ the Letters\' line is unchanged');
    eq(B({ svc: 'cleanout', matterType: 'trust', executorAuth: 'pending' }), ['The successor trustee’s Certification of Trust must be received'],
       '⚠⚠ a trust-only matter waits on the Certification of Trust');
    eq(B({ svc: 'cleanout', matterType: 'both', executorAuth: 'pending' }), [L_GATE], '⚠ Both waits on the Letters (the court governs a pour-over), never on both papers');
    // The other two gates are untouched, and come first.
    eq(S.jobActivationBlockers({ svc: 'cleanout', matterType: 'trust', executorAuth: 'pending' }),
       ['Service agreement must be signed', 'Deposit (50%) must be received', C_GATE], 'the agreement and the deposit, then the paper');
  });

  G('A1 · the handler refuses as the button does, naming the paper', () => {
    const alerts = [];
    const S = lift(['applyJobTransition'], [], { alert: (m) => alerts.push(String(m)), confirm: () => true, _todayStr: () => '2026-10-03',
      Date: FixedDate(NOW), saveJobs() {}, syncJobToSheets() {} });
    const job = TRUST({ status: 'won', agrSigned: true, depositReceived: true, start: '2026-10-01' });
    eq(S.applyJobTransition(job), false, '⚠⚠ a trust job with its Certification pending is refused activation in the handler');
    has(alerts[0] || '', '• ' + C_GATE, 'and the refusal names the paper');
    eq([job.status, job.activatedOn || ''], ['won', ''], 'nothing moved');
    job.executorAuth = 'received';
    eq(S.applyJobTransition(job), true, 'with the Certification received it activates');
    eq(job.status, 'active', 'the job is active');
    const pj = PROBATE({ status: 'won', agrSigned: true, depositReceived: true, start: '2026-10-01' });
    alerts.length = 0;
    eq(S.applyJobTransition(pj), false, 'a probate job with its Letters pending is refused, as before');
    has(alerts[0] || '', '• ' + L_GATE, 'in the words it always used');
    const nj = TRUST({ matterType: 'neither', status: 'won', agrSigned: true, depositReceived: true, start: '2026-10-01' });
    eq(S.applyJobTransition(nj), true, 'Neither has no paper and nothing waits on one');
  });

  G('A1 · one definition: the words by route, read by the gate, the rail, the chips and the forms; the card and the paper agree', () => {
    const live = noComments(SRC);
    ok(live.length > SRC.length * 0.5, 'the comment strip left most of the file (vacuity guard)');
    const names = [...ALL_FNS];
    // Every function whose live code names `needle`, the function that defines it left out.
    const readers = (needle) => names.filter((n) => { if (needle === n + '(') return false; let b; try { b = fn(n); } catch (e) { return false; }
      return noComments(b).indexOf(needle) >= 0; }).sort();
    eq(readers('ESTATE_AUTHORITY_WORDS'), ['executorAuthField', 'jobActivationBlockers', 'jobTimeline', 'renderClientDashboard'],
       '⚠ ESTATE_AUTHORITY_WORDS is read by the gate, the rail, the dashboard\'s chips and the forms\' control, nothing else');
    eq(readers('executorAuthField('), ['ecToggleProbate', 'showEditClient', 'toggleIntakeFields'], 'the control\'s paper is asked by both forms, render and toggle');
    eq(readers('propertySaleAsked('), ['ecToggleProbate', 'saveClientEdit', 'saveIntake', 'showEditClient', 'toggleIntakeFields'], 'the sale question: both forms, render, toggle and save');
    eq(readers('trustRecordShown('), ['ecToggleProbate', 'propertySaleAsked', 'renderClientDashboard', 'saveClientEdit', 'saveIntake', 'showEditClient', 'toggleIntakeFields'],
       'the trust itself: both forms, the card, and the sale rule');
    eq(readers('saveCoFiduciaryRows('), ['saveClientEdit', 'saveIntake'], 'one writer of co-representatives, read by both saves');
    eq(readers('coFiduciaryBlockHtml('), ['buildCoFiduciaryBlock', 'showEditClient'], 'one block, drawn by both forms');
    // ⚠ Nothing names the authority paper by the probate track alone any more, and nothing re-tests "Executor".
    lacks(noComments(fn('jobActivationBlockers')), 'jobOnProbateTrack(j)', 'the gate asks estateAuthority, not the probate track');
    lacks(noComments(fn('jobTimeline')), "indexOf('Executor')", 'and the rail no longer picks the line out by its first word');
    has(noComments(fn('jobActivationBlockers')), "resolveExecutorAuth(j.executorAuth) === 'pending'", 'a blank still reads as pending, through the one resolver');
    // The paper and the card are one route: wherever a paper holds the job there is a card to point at, and only there.
    const R = lift(['estateAuthority', 'estatePackageRoute'], [], {});
    SERVICES.forEach((svc) => MATTERS.forEach((mt) => {
      const a = R.estateAuthority({ svc, matterType: mt }), r = R.estatePackageRoute({ svc, matterType: mt });
      eq(a ? a.key : '', PAPER(svc, mt), svc + ' / ' + (mt || 'unanswered') + ': the paper');
      eq(!!r && (a ? (a.key === 'letters') === r.court : false), !!a, svc + ' / ' + (mt || 'unanswered') + ': a card exactly where a paper is, the court card for the Letters');
    }));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // A won, signed, invoiced and funded job: the next step is activation, and nothing else holds it.
  const FUNDED = (o) => TRUST(Object.assign({
    created: 'Sep 20, 2026', walkthrough: '2026-09-20', approved: true, status: 'won', estimateSentDate: 'September 28, 2026',
    won: true, wonAt: '2026-09-29', wonBy: 'Anthony Graziano', wonMethod: 'call',
    agrApproved: true, agrApprovedAt: 'Sep 29, 2026', agrSent: true, agrSentAt: 'Sep 29, 2026', agrSentBy: 'Anthony Graziano',
    agrSigned: true, agrSignedAt: 'Sep 30, 2026', agrSignedBy: 'Anthony Graziano',
    docState: { 'invoice:deposit': { draftedAt: '2026-09-30T14:00:00.000Z', draftedBy: 'Anthony', sentAt: '2026-09-30T14:00:00.000Z', sentBy: 'Anthony', provider: 'gmail' } },
    payments: [{ id: 1, stage: 'deposit', amount: 12000, receivedOn: '2026-10-01' }], depositReceived: true, depositReceivedAt: '2026-10-01',
  }, o || {}));
  const REC = () => ({ estimate: { rooms: [{ name: 'Study', vol: 3, cplx: 3 }], havellinTotal: 24000 }, savedAt: 'Sep 27, 2026',
    approved: true, submitted: true, approvedBy: 'Anthony', approvedAt: 'September 27, 2026' });

  G('A1 · the rail: a trust job\'s activation is held on its Certification, and the fix names the paper', () => {
    const S = lift(['jobTimeline', 'jobTimelineNext'], [], { Date: FixedDate(NOW), _todayStr: () => '2026-10-03', estimateStore: {}, jobs: [] });
    const rows = (job) => { S.jobs = [job]; S.estimateStore = { 7: REC() }; return S.jobTimeline(job, S.estimateStore[7], [], []); };
    const act = (job) => rows(job).filter((r) => r.key === 'job_active')[0] || {};
    const t = rows(FUNDED());
    const ja = t.filter((r) => r.key === 'job_active')[0] || {};
    eq(ja.state, 'blocked', '⚠⚠ a funded trust job with its Certification pending: Job active is held, not offered (the filter on "Executor" let it through)');
    eq(ja.blockedWhy, C_GATE, 'in the gate\'s own words');
    eq(ja.blockedFix, 'Contact Rex Hale on (561) 555-0101 — the Certification of Trust must be received before work can start.', 'and the fix names the paper and who to chase');
    eq((S.jobTimelineNext(t) || {}).key, 'job_active', 'and it is the lit row');
    eq(act(FUNDED({ executorAuth: 'received' })).state, 'current', 'received: Activate is the next step');
    eq(act(FUNDED({ executorAuth: 'notneeded' })).state, 'current', 'not required: the same');
    const p = act(FUNDED({ matterType: 'probate', svc: 'probate' }));
    eq([p.state, p.blockedWhy], ['blocked', L_GATE], 'a probate job is held on its Letters, as before');
    eq(p.blockedFix, 'Contact Rex Hale on (561) 555-0101 — the Letters must be received before work can start.', '⚠ in the words it always used');
    eq(act(FUNDED({ matterType: 'neither' })).state, 'current', 'Neither: nothing waits on a paper');
    eq(act(FUNDED({ matterType: '' })).state, 'current', 'an unanswered Estate Settlement: nothing waits either');
    eq(act(FUNDED({ executorPhone: '' })).blockedFix, 'Contact Rex Hale at rex@hale.example — the Certification of Trust must be received before work can start.', 'no phone: the email');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // The real dashboard, its call graph derived from the source, lifted once and fed one job at a time.
  let dashRig = null;
  const renderDash = (job) => {
    if (!dashRig) {
      const dom = domStub({});
      const c = lift(['renderClientDashboard', 'jobActivationBlockers'], ['esignRefresh', 'stripeRefresh', 'maybeStartJobsWatch', 'refreshPhotoRefs'], {
        document: dom, setTimeout: () => 0, clearTimeout() {}, Intl: global.Intl, Date: FixedDate(NOW),
        jobs: [], changeOrders: [], contractors: [], _photoRefs: {}, jobLogs: {}, SHEETS_SYNC_URL: 'https://script.google.com/macros/s/P19W1/exec',
        jobPlanStore: {}, estimateStore: { 7: EST() }, maybeStartJobsWatch() {}, esignRefresh() {}, stripeRefresh() {}, refreshPhotoRefs() {} });
      dashRig = { c, dom };
    }
    dashRig.c.jobs.length = 0;
    dashRig.c.jobs.push(JSON.parse(JSON.stringify(job)));
    dashRig.c.renderClientDashboard(job.id);
    return dashRig.dom.getElementById('client-dashboard-view').innerHTML;
  };
  // The red activation chips in the client card, as [label, its fix].
  const chips = (html) => [...String(html).matchAll(/<span class="badge"[^>]*title="([^"]*)">&#9888; ([^<]*)<\/span>/g)].map((m) => [unesc(m[2]), unesc(m[1])]);
  // One field of a rendered grid: the value a label carries, as text.
  const fieldVal = (html, label) => { const m = new RegExp('<div class="dfl">' + label + '</div><div class="dfv[^"]*">([\\s\\S]*?)</div></div>').exec(html); return m ? text(m[1]) : null; };

  G('A1 · the activation chips name the paper by route, and point at its card', () => {
    const t = chips(renderDash(TRUST()));
    eq(t.map((c) => c[0]), ['Agreement not signed', 'Deposit not received', 'Certification of Trust pending'], '⚠⚠ a trust job\'s chip names the Certification of Trust');
    eq(t[2] && t[2][1], 'Contact Rex Hale — (561) 555-0101', 'its fix says whom to chase');
    eq((chips(renderDash(TRUST({ executorPhone: '', executorEmail: '' }))).pop() || [])[1], 'Contact Rex Hale — see the Trust card below', 'with no number, the Trust card');
    const p = chips(renderDash(PROBATE()));
    eq(p.map((c) => c[0]).pop(), 'Letters pending', '⚠ a probate job\'s chip names the Letters');
    eq((chips(renderDash(PROBATE({ executorPhone: '', executorEmail: '' }))).pop() || [])[1], 'Contact Rex Hale — see the Probate card below', 'and points at the Probate card');
    ['neither', ''].forEach((mt) => eq(chips(renderDash(TRUST({ matterType: mt }))).map((c) => c[0]), ['Agreement not signed', 'Deposit not received'],
      (mt || 'unanswered') + ': no paper, no chip for one'));
    eq(chips(renderDash(TRUST({ executorAuth: 'received' }))).map((c) => c[0]), ['Agreement not signed', 'Deposit not received'], 'received: the chip goes');
    // The chip is the gate: on every service and matter, drawn exactly where the gate holds the job on its paper.
    SERVICES.slice(0, 3).forEach((svc) => MATTERS.forEach((mt) => {
      const job = TRUST({ svc, matterType: mt });
      const drawn = chips(renderDash(job)).some((c) => /^(Letters|Certification of Trust) pending$/.test(c[0]));
      const held = dashRig.c.jobActivationBlockers(Object.assign({}, job, { agrSigned: true, depositReceived: true })).length > 0;
      eq(drawn, held, svc + ' / ' + (mt || 'unanswered') + ': the chip is drawn exactly where the paper holds the job (' + held + ')');
    }));
  });

  G('A2 · the client card names the paper an Estate Settlement has, or draws no field', () => {
    eq(fieldVal(renderDash(TRUST()), 'Certification of Trust'), 'Pending', '⚠⚠ a trust-only Estate Settlement: the Certification of Trust');
    lacks(renderDash(TRUST()), 'Letters of Admin', 'never the Letters, which nothing waits on here');
    eq(fieldVal(renderDash(TRUST({ executorAuth: 'received' })), 'Certification of Trust'), 'Received', 'received');
    eq(fieldVal(renderDash(TRUST({ executorAuth: '' })), 'Certification of Trust'), 'Pending', '⚠ a blank reads Pending, as the gate holds it');
    eq(fieldVal(renderDash(TRUST({ matterType: 'probate' })), 'Letters of Administration'), 'Pending', 'an Estate Settlement on a probate matter: the Letters');
    eq(fieldVal(renderDash(TRUST({ matterType: 'both', executorAuth: 'notneeded' })), 'Letters of Administration'), 'N/A', 'Both: the Letters, not required here');
    ['neither', ''].forEach((mt) => {
      const h = renderDash(TRUST({ matterType: mt }));
      ok(fieldVal(h, 'Authorized rep') === 'Rex Hale · Trustee', (mt || 'unanswered') + ': fixture — the representative is on the card');
      ['Letters of Admin', 'Certification of Trust'].forEach((w) => lacks(h, w, (mt || 'unanswered') + ': no paper named — ' + w));
    });
  });

  G('A3 · the Trust card carries the Certification of Trust as the Probate card carries the Letters', () => {
    const card = cardAt(renderDash(TRUST()), 'Trust Information');
    ok(card.length > 500, 'the Trust card rendered');
    const t = text(card);
    has(t, 'Trust Information Certification of Trust pending — blocker', '⚠⚠ its chip, beside the heading, naming the paper');
    has(t, 'Trustee Name Rex Hale Phone (561) 555-0101 Email rex@hale.example Role Trustee Certification of Trust Pending', 'and beside the trustee');
    has(card, 'color:#A32D2D', 'in red');
    has(text(cardAt(renderDash(TRUST({ executorAuth: 'received' })), 'Trust Information')), 'Certification of Trust received', 'received');
    const nn = text(cardAt(renderDash(TRUST({ executorAuth: 'notneeded' })), 'Trust Information'));
    has(nn, 'Certification of Trust not required', '⚠ not required says so, never "received"');
    has(nn, 'Role Trustee Certification of Trust Not required', 'beside the trustee too');
    ['Case number', '2026-CP-001234', 'Court deadline', 'Authorization', 'Letters'].forEach((w) => lacks(t, w, 'no court record and no Letters on the Trust card: ' + w));
    // The probate card keeps its word, "Authorization", and its court grid.
    const pc = text(cardAt(renderDash(PROBATE()), 'Probate Information'));
    has(pc, 'Probate Information Authorization pending — blocker', 'the Probate card\'s chip, as before');
    has(pc, 'Case number 2026-CP-001234 Court deadline Nov 20, 2026 Property sale yes Authorization Pending', 'its court grid, as before');
    has(pc, 'Role Personal Representative Authorization Pending', 'and beside the executor');
    has(text(cardAt(renderDash(PROBATE({ executorAuth: 'notneeded' })), 'Probate Information')), 'Authorization not required', '⚠ not required, never "received"');
    lacks(pc, 'Certification of Trust', 'and no Certification of Trust on a probate matter');
  });

  G('A4 · A5 · the trust itself, and the property sale, on the card wherever the matter holds a trust', () => {
    const card = cardAt(renderDash(TRUST()), 'Trust Information');
    has(text(card), 'Trust name The Adler Family Revocable Trust Trust dated Apr 2, 2019 Trustee accepted Mar 1, 2026 Property sale yes',
        '⚠⚠ the trust\'s name, its date, the trustee\'s acceptance and the property-sale answer');
    has(card, '<div class="d-split2" style="gap:0 24px;margin-top:12px;">', 'the blocks sit a grid\'s gap below it');
    const blank = text(cardAt(renderDash(TRUST({ trustName: '', trustDate: '', trusteeAcceptedOn: '', probateSale: '' })), 'Trust Information'));
    has(blank, 'Trust name not recorded Trust dated not recorded Trustee accepted not recorded Property sale —', 'blank: not recorded, never nothing');
    const typed = cardAt(renderDash(TRUST({ trustName: 'The <b>Adler</b> & Co Trust' })), 'Trust Information');
    has(typed, 'The &lt;b&gt;Adler&lt;/b&gt; &amp; Co Trust', 'what was typed is text');
    lacks(typed, '<b>Adler', 'never markup');
    // Both: the Probate card, its court grid, and the trust under it; the sale answer once.
    const both = cardAt(renderDash(TRUST({ matterType: 'both', probateCase: '2026-CP-009', probateDeadline: '2026-12-01' })), 'Probate Information');
    const bt = text(both);
    has(bt, 'Case number 2026-CP-009', 'a pour-over: the court record');
    has(bt, 'Trust name The Adler Family Revocable Trust Trust dated Apr 2, 2019 Trustee accepted Mar 1, 2026', 'and the trust under it');
    eq((bt.match(/Property sale/g) || []).length, 1, '⚠ the property-sale answer once, in the court grid');
    // A probate matter has no trust to record; a Neither matter has no card.
    lacks(text(cardAt(renderDash(PROBATE({ trustName: 'Stale Trust' })), 'Probate Information')), 'Trust name', 'a probate matter: no trust details, even with a stale name on the record');
    lacks(renderDash(TRUST({ matterType: 'neither' })), 'Trust name', 'Neither: none');
  });

  G('A6 · co-representatives on the card, under the route\'s heading, and on the client card; never on a living job', () => {
    const card = cardAt(renderDash(TRUST()), 'Trust Information');
    const t = text(card);
    has(t, 'Co-Trustees Name Daniel Adler Role Trustee Phone (561) 555-0103 Email dan@adler.example', '⚠⚠ the co-trustee, under Co-Trustees');
    // RESTATED 2026-10-05 (P20): Anthony decided (Q22) that each co-representative signs the agreement beside the
    // representative, in DocuSign or on the printed page, so the card says so where it said DocuSign went to one signer.
    has(t, 'Each signs the agreement beside Rex Hale: in DocuSign, which needs their email, or on the printed page when it is signed by hand.', 'and how each signs the agreement, said once');
    lacks(t, 'A DocuSign envelope goes to Rex Hale alone.', '⚠ never the old one-signer sentence');
    eq((t.match(/DocuSign/g) || []).length, 1, 'once');
    lacks(t, 'on paper', 'and nothing beyond the two routes is prescribed');
    has(text(cardAt(renderDash(PROBATE()), 'Probate Information')), 'Co-Personal Representatives Name Daniel Adler', 'on a probate matter: Co-Personal Representatives');
    const two = renderDash(TRUST({ coFiduciaries: [{ id: 'c1', name: 'Daniel <i>Adler</i>', role: 'Trustee' }, { id: 'c2', name: 'Mae O\'Neil', email: 'mae@x.com' },
      { id: 'c3', name: 'Voided Person', voidedAt: 5 }, { id: '', name: 'No Id' }] }));
    eq(fieldVal(two, 'Co-representatives'), 'Daniel <i>Adler</i> · Trustee; Mae O\'Neil', 'the client card lists every live co-representative, by the one list');
    has(two, 'Daniel &lt;i&gt;Adler&lt;/i&gt;', 'escaped');
    lacks(two, '<i>Adler', 'never markup');
    lacks(two, 'Voided Person', 'a voided entry is no one');
    eq(fieldVal(renderDash(TRUST({ coFiduciaries: [] })), 'Co-representatives'), null, 'none recorded: no field');
    lacks(cardAt(renderDash(TRUST({ coFiduciaries: [] })), 'Trust Information'), 'Co-Trustees', 'and no heading on the card');
    // A Neither estate has no card: the client card carries them.
    eq(fieldVal(renderDash(TRUST({ matterType: 'neither' })), 'Co-representatives'), 'Daniel Adler · Trustee', 'Neither: on the client card');
    // A living client's family are not fiduciaries.
    const living = renderDash(TRUST({ svc: 'downsizing', matterType: '', phone: '(561) 555-0100', email: 'w@a.example' }));
    ['Co-representatives', 'Daniel Adler', 'Co-Trustees'].forEach((w) => lacks(living, w, '⚠ never on a living job: ' + w));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('A7 · the Form 706 date: how near it is, against the today it is handed', () => {
    const S = lift(['estateTaxReturnDue', 'estateTaxReturnWords'], [], { fmtDate2: (d) => 'D:' + d });
    const due = (death, a, today, svc) => JSON.parse(JSON.stringify(S.estateTaxReturnDue({ svc: svc || 'cleanout', deathDate: death, gate706: a }, today)));
    eq(due('2026-02-10', 'yes', '2026-10-03'), { due: '2026-11-10', firm: true, days: 38, flag: '' }, 'nine months on, 38 days away: no flag');
    eq(due('2026-02-10', 'yes', '2026-10-11'), { due: '2026-11-10', firm: true, days: 30, flag: 'soon' }, '⚠ thirty days out: soon (the line turns red)');
    eq(due('2026-02-10', 'yes', '2026-10-10').flag, '', 'thirty-one days out: not yet');
    eq(due('2026-02-10', 'yes', '2026-11-10'), { due: '2026-11-10', firm: true, days: 0, flag: 'soon' }, 'the day itself: soon, 0 days');
    eq(due('2026-02-10', 'yes', '2026-11-11'), { due: '2026-11-10', firm: true, days: -1, flag: 'past' }, '⚠ the day after: past');
    eq(due('2026-02-10', '', '2026-10-03').firm, false, 'an unanswered 706: the date, unfirm');
    eq(S.estateTaxReturnDue({ svc: 'cleanout', deathDate: '2026-02-10', gate706: 'no' }, '2026-10-03'), null, 'a 706 answered no: nothing');
    eq(S.estateTaxReturnDue({ svc: 'downsizing', deathDate: '2026-02-10', gate706: 'yes' }, '2026-10-03'), null, 'a living client: nothing');
    eq(due('2026-02-10', 'yes', '').days, null, 'no today: no count, and no flag');
    eq(due('2026-02-10', 'yes', '').flag, '', '(and never a guess)');
    // ⚠ Across a DST change and a month end, a calendar count, not a millisecond one.
    eq(due('2026-02-28', 'yes', '2026-11-01').days, 27, 'across the November clock change: 27 calendar days');
    // The March change is the one a local-midnight millisecond count gets wrong: that day has 23 hours, so 14 days
    // measure 13.96 and floor to 13 (the November day has 25, which floors back to the right answer).
    eq(due('2025-06-15', 'yes', '2026-03-01'), { due: '2026-03-15', firm: true, days: 14, flag: 'soon' }, '⚠ across the spring clock change: 14 calendar days, not 13');
    // The words.
    const w = (death, a, today) => S.estateTaxReturnWords(S.estateTaxReturnDue({ svc: 'cleanout', deathDate: death, gate706: a }, today));
    eq(w('2026-02-10', 'yes', '2026-10-03'), 'Form 706 due D:2026-11-10', 'firm, far: the date');
    eq(w('2026-02-10', '', '2026-10-03'), 'Form 706, if a return is filed, due D:2026-11-10', 'unfirm: if a return is filed');
    eq(w('2026-02-10', 'yes', '2026-10-24'), 'Form 706 due D:2026-11-10 — in 17 days', 'near: how many days');
    eq(w('2026-02-10', 'yes', '2026-11-09'), 'Form 706 due D:2026-11-10 — in 1 day', 'one day, singular');
    eq(w('2026-02-10', 'yes', '2026-11-10'), 'Form 706 due D:2026-11-10 — today', 'the day itself');
    eq(w('2026-02-10', 'yes', '2026-12-01'), 'Form 706 due D:2026-11-10 — passed: confirm with counsel it was filed or extended', '⚠ past: confirm with counsel, never a claim it was or was not filed');
    eq(S.estateTaxReturnWords(null), '', 'no return: no words');
  });

  G('A7 · jobSchedule carries the date, and the strip prints it beside the court deadline', () => {
    const S = lift(['jobSchedule', 'jtScheduleHtml'], [], { fmtDate2: (d) => 'D:' + d });
    const EST6 = { days: 6, svc: 'cleanout' };
    const sched = (job, today) => S.jobSchedule(Object.assign({ id: 7, svc: 'cleanout', deathDate: '2026-02-10', gate706: 'yes', start: '2026-10-19' }, job), EST6, today);
    const p = sched({}, '2026-10-03');
    eq(JSON.parse(JSON.stringify(p.taxReturn)), { due: '2026-11-10', firm: true, days: 38, flag: '' }, '⚠⚠ the descriptor carries the 706 date, measured against the today it was handed');
    eq(p.fit, '', 'and the plan is never measured against it — a reminder, not a fit test');
    const strip = S.jtScheduleHtml(p);
    has(strip, '<span class="jt-sched-i">Form 706 due D:2026-11-10</span>', 'the strip prints it, grey');
    lacks(strip, 'jt-s-err', 'not red, 38 days out');
    const near = S.jtScheduleHtml(sched({}, '2026-10-24'));
    has(near, '<span class="jt-sched-i jt-s-err">&#9888; Form 706 due D:2026-11-10 — in 17 days</span>', '⚠ red within thirty days, saying how many');
    has(S.jtScheduleHtml(sched({}, '2026-11-12')), '— passed: confirm with counsel it was filed or extended', 'past: red, and what to do');
    has(S.jtScheduleHtml(sched({ gate706: '' }, '2026-10-03')), 'Form 706, if a return is filed, due D:2026-11-10', 'unfirm on an unanswered 706');
    lacks(S.jtScheduleHtml(sched({ gate706: 'no' }, '2026-10-03')), 'Form 706', 'a 706 answered no: nothing');
    lacks(S.jtScheduleHtml(sched({ svc: 'downsizing' }, '2026-10-03')), 'Form 706', 'a living client: nothing');
    // Beside the court deadline, after it.
    const pr = S.jtScheduleHtml(sched({ svc: 'probate', probateDeadline: '2026-12-15' }, '2026-10-03'));
    ok(pr.indexOf('Court deadline D:2026-12-15') > 0 && pr.indexOf('Form 706 due') > pr.indexOf('Court deadline'), 'after the court deadline, on a probate matter');
    // A running job carries it too; a finished one does not (history is not an instruction).
    has(S.jtScheduleHtml(sched({ status: 'active', activatedOn: '2026-10-01' }, '2026-10-02')), 'Form 706 due D:2026-11-10', 'a running job: printed');
    lacks(S.jtScheduleHtml(sched({ status: 'closed', activatedOn: '2026-09-21', deliveredOn: '2026-09-30' }, '2026-10-24')), 'Form 706', 'a delivered job: not');
    // Still DOM-free and clock-free.
    const sb = noComments(fn('jobSchedule'));
    ['document.', 'getElementById', 'innerHTML', 'new Date()', 'Date.now'].forEach((n) => lacks(sb, n, 'jobSchedule stays DOM-free and clock-free (' + n + ')'));
    ['new Date()', 'Date.now'].forEach((n) => lacks(noComments(fn('estateTaxReturnDue')), n, 'and so does the count (' + n + ')'));
  });

  G('A7 · the card shows it: a reminder, red once near or past, and nothing on a job that died', () => {
    const line = (job) => { const m = /<div class="est-706"[^>]*>[\s\S]*?<\/span><\/div>/.exec(renderDash(job)); return m ? m[0] : ''; };
    const far = line(TRUST());
    has(text(far), 'Form 706 due Nov 10, 2026 · the federal estate tax return; counsel or the estate’s accountant files it', '⚠⚠ the card: the date and who files');
    has(far, 'color:var(--gray-dk)', 'grey, 38 days out');
    const near = line(TRUST({ deathDate: '2026-01-20' }));
    has(text(near), '⚠ Form 706 due Oct 20, 2026 — in 17 days', 'red inside thirty days');
    has(near, 'color:#A32D2D', 'in red');
    has(text(line(TRUST({ deathDate: '2025-12-01' }))), 'Form 706 due Sep 1, 2026 — passed: confirm with counsel it was filed or extended', 'past');
    has(text(line(TRUST({ gate706: '' }))), 'Form 706, if a return is filed, due Nov 10, 2026', 'unfirm');
    eq(line(TRUST({ gate706: 'no' })), '', 'answered no: no line');
    eq(line(TRUST({ status: 'lost' })), '', 'a lost job: no line');
    has(text(cardAt(renderDash(PROBATE()), 'Probate Information')), 'Form 706 due Nov 10, 2026', 'on the Probate card too');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLIENT INTAKE, driven: the real toggle, the real rows and the real save, over a domStub holding what was typed.
  const INTAKE = {
    'i-fname': 'Walter', 'i-lname': 'Adler', 'i-svc': 'cleanout', 'i-addr': '69 Beach Blvd', 'i-city': 'Palm Beach', 'i-zip': '33480',
    'i-sqft': '4200', 'i-ptype': 'Estate', 'i-src': 'Family', 'i-start': '2026-10-19', 'i-tc': 'Ashley Jerome', 'i-pri': 'normal', 're': 'unknown',
    'i-prem': 'no', 'i-date-of-death': '2026-02-10', 'i-matter-type': 'trust', 'i-gate-706': 'yes', 'i-executor-fname': 'Rex', 'i-executor-lname': 'Hale',
    'i-executor-role': 'Trustee', 'i-executor-phone': '(561) 555-0101', 'i-executor-email': 'rex@hale.example', 'i-executor-auth': 'pending',
    'i-trust-name': 'The Adler Family Revocable Trust', 'i-trust-date': '2019-04-02', 'i-trustee-accepted': '2026-03-01', 'i-probate-sale': 'yes',
  };
  function intakeRig(seed) {
    const d = domStub(Object.assign({}, INTAKE, seed || {}));
    const said = { fb: [], landed: [], saves: 0, syncs: 0 };
    const c = lift(['saveIntake', 'toggleIntakeFields', 'addCoFiduciaryRow', 'removeCoFiduciaryRow', 'buildCoFiduciaryBlock', 'resetIntakeFields', 'jobFiduciaries', 'jobActivationBlockers'],
      ['onDocGateChange'], {
        document: d, jobs: [], Date: FixedDate(NOW), setTimeout: () => 0, clearTimeout() {}, referralDirectory: [],
        saveJobs: () => { said.saves++; }, syncJobToSheets: () => { said.syncs++; }, createDriveJobFolder() {}, populateAgrSelect: null,
        goToClientDashboard: (id, k, m) => said.landed.push({ id, k, m: String(m) }), showFB: (el, k, m) => said.fb.push({ el, k, m: String(m) }),
        clearIntakeForm() {}, onDocGateChange() {}, confirm: () => true });
    return { c, d, said };
  }

  G('A2 · A4 · A5 · intake: the paper, the trust and the sale question follow the matter as it changes', () => {
    const r = intakeRig({ 'i-matter-type': '' });
    const look = (svc, mt) => {
      r.d.getElementById('i-svc').value = svc; r.d.getElementById('i-matter-type').value = mt;
      r.c.toggleIntakeFields();
      const g = (id) => r.d.getElementById(id);
      return { cell: g('i-executor-auth-cell').style.display, lbl: g('i-executor-auth-lbl').textContent, hint: g('i-executor-auth-hint').textContent,
               trust: g('trust-fields').style.display, sale: g('i-sale-cell').style.display };
    };
    let v = look('cleanout', 'trust');
    eq([v.cell, v.lbl], ['', 'Certification of Trust'], '⚠⚠ a trust-only matter: the control names the Certification of Trust');
    has(v.hint, 'The successor trustee’s proof of authority (Fla. Stat. §736.1017).', 'and its hint says what it is');
    has(v.hint, 'On a trust the job cannot be activated until this reads Received', 'and what waits on it');
    eq([v.trust, v.sale], ['block', ''], 'the trust\'s own details and the sale question are asked');
    v = look('cleanout', 'probate');
    eq([v.cell, v.lbl], ['', 'Letters of Administration'], 'a probate matter: the Letters');
    has(v.hint, 'On probate the job cannot be activated until this reads Received', '…with the hint it always had');
    eq([v.trust, v.sale], ['none', ''], 'no trust to record; the sale question, with the court record');
    v = look('cleanout', 'both');
    eq([v.lbl, v.trust, v.sale], ['Letters of Administration', 'block', ''], 'Both: the Letters, and the trust it pours into');
    v = look('cleanout', 'neither');
    eq([v.cell, v.trust, v.sale], ['none', 'none', 'none'], '⚠ Neither: no paper, no trust and no sale question — nothing names a paper the matter does not have');
    v = look('cleanout', '');
    eq([v.cell, v.trust, v.sale], ['none', 'none', 'none'], 'an Estate Settlement not yet answered: the same, until it is');
    v = look('probate', '');
    eq([v.cell, v.lbl, v.sale], ['', 'Letters of Administration', ''], 'a Probate service not yet answered: the Letters, and the sale with the court record');
    v = look('cleanout', 'trust');
    eq(v.lbl, 'Certification of Trust', 'and back again, live');
  });

  G('P22 · intake refuses the representative as their own co-representative, by name', () => {
    const r = intakeRig();
    r.c.addCoFiduciaryRow('i');
    r.d.getElementById('i-cofid-0-name').value = 'rex hale';
    r.d.getElementById('i-cofid-0-role').value = 'Co-Trustee';
    r.c.saveIntake();
    eq(r.c.jobs.length, 0, '⚠⚠ refused: nothing is written');
    eq((r.said.fb[0] || {}).m, 'rex hale is the representative on this estate, so cannot also be a co-representative: take that row off with ✕ Remove.', 'named, as typed');
    r.d.getElementById('i-cofid-0-name').value = 'Daniel Adler';
    r.said.fb.length = 0;
    r.c.saveIntake();
    eq(((r.c.jobs[0] || {}).coFiduciaries || []).map((c) => [c.name, c.role]), [['Daniel Adler', 'Co-Trustee']], 'anyone else is saved');
  });

  G('A4 · A5 · A6 · intake saves the trust, the sale answer and every co-representative', () => {
    const r = intakeRig();
    r.c.buildCoFiduciaryBlock();
    has(r.d.getElementById('i-cofid-block').innerHTML, 'onclick="addCoFiduciaryRow(\'i\')">+ Add a co-representative</button>', 'the block offers + Add a co-representative');
    eq(r.c.addCoFiduciaryRow('i'), 0, 'a row is added');
    eq(r.c.addCoFiduciaryRow('i'), 1, 'and another');
    const set = (n, o) => Object.keys(o).forEach((k) => { r.d.getElementById('i-cofid-' + n + '-' + k).value = o[k]; });
    set(0, { name: '  Daniel Adler ', role: 'Trustee', phone: '(561) 555-0103', email: 'dan@adler.example' });
    // Row 1 is left empty: no one.
    r.c.saveIntake();
    eq(r.said.fb, [], 'nothing refused');
    const j = r.c.jobs[0] || {};
    eq(r.said.landed.length && r.said.landed[0].k, 'ok', 'saved, landing on the new client');
    eq([j.trustName, j.trustDate, j.trusteeAcceptedOn], ['The Adler Family Revocable Trust', '2019-04-02', '2026-03-01'], '⚠⚠ the trust itself is recorded');
    eq(j.probateSale, 'yes', '⚠ the property-sale answer on a trust is recorded');
    eq(j.executorAuth, 'pending', 'the Certification\'s answer, on the one stored field');
    const co = (j.coFiduciaries || []).map((x) => [x.name, x.role, x.phone, x.email]);
    eq(co, [['Daniel Adler', 'Trustee', '(561) 555-0103', 'dan@adler.example']], '⚠⚠ the co-trustee is recorded, trimmed; the empty row is no one');
    const id = ((j.coFiduciaries || [])[0] || {}).id;
    ok(typeof id === 'string' && id.length > 6, 'with an id of its own');
    ok(typeof ((j.at || {})['coFiduciaries:' + id]) === 'number', '⚠ stamped on its own key: a person\'s edit, through the record list');
    eq(r.c.jobFiduciaries(j).map((f) => f.name), ['Rex Hale', 'Daniel Adler'], 'the representative first, then the co-trustee');
    eq(r.c.jobActivationBlockers(Object.assign({}, j, { agrSigned: true, depositReceived: true })), [C_GATE], 'and the new job waits on its Certification');
  });

  G('A6 · intake: a co-representative needs a name; a living client keeps none; the sale and the trust only where asked', () => {
    let r = intakeRig();
    r.c.addCoFiduciaryRow('i');
    r.d.getElementById('i-cofid-0-phone').value = '(561) 555-0199';
    r.c.saveIntake();
    eq(r.c.jobs.length, 0, '⚠ a row with a phone and no name is refused, and nothing is written');
    has((r.said.fb[0] || {}).m, 'Co-representative 1’s name', 'naming the row');
    // Switching to a living service hides the estate block with the rows in it: they are never saved.
    r = intakeRig({ 'i-svc': 'downsizing', 'i-phone': '(561) 555-0100', 'i-email': 'w@a.example', 'i-matter-type': '' });
    r.c.addCoFiduciaryRow('i');
    r.d.getElementById('i-cofid-0-name').value = 'Daniel Adler';
    r.c.saveIntake();
    const lj = r.c.jobs[0] || {};
    ok(!!lj.id, 'fixture: the living client saved');
    eq([(lj.coFiduciaries || []).length, lj.trustName, lj.probateSale], [0, '', ''], '⚠ a living client: no co-representative, no trust, no sale answer');
    // A probate matter is not asked the trust's details; Neither is not asked the sale.
    r = intakeRig({ 'i-matter-type': 'probate', 'i-probate-case': '50-2026-CP-1', 'i-probate-atty-fname': 'Ann', 'i-probate-atty-lname': 'Lowe' });
    r.c.saveIntake();
    eq([(r.c.jobs[0] || {}).trustName, (r.c.jobs[0] || {}).probateSale], ['', 'yes'], 'a probate matter: the sale answer, no trust details');
    r = intakeRig({ 'i-matter-type': 'neither' });
    r.c.saveIntake();
    eq([(r.c.jobs[0] || {}).trustName, (r.c.jobs[0] || {}).probateSale], ['', ''], 'Neither: neither');
    r = intakeRig({ 'i-matter-type': 'both' });
    r.c.saveIntake();
    eq([(r.c.jobs[0] || {}).trustName, (r.c.jobs[0] || {}).probateSale], ['The Adler Family Revocable Trust', 'yes'], 'Both: the trust and the sale');
    // ✕ on a row nobody has saved: it simply goes, with nothing asked.
    r = intakeRig();
    let asked = 0; r.c.confirm = () => { asked++; return true; };
    r.c.addCoFiduciaryRow('i'); r.c.addCoFiduciaryRow('i');
    r.d.getElementById('i-cofid-0-name').value = 'Gone Person';
    r.d.getElementById('i-cofid-1-name').value = 'Mae O\'Neil';
    eq(r.c.removeCoFiduciaryRow('i', 0), true, 'an unsaved row comes off');
    eq(asked, 0, 'without a question: nothing was recorded');
    eq(r.d.getElementById('i-cofid-rows').dataset.rows, '1', 'its number leaves the list');
    eq(r.c.addCoFiduciaryRow('i'), 2, '⚠ and is never reused');
    r.c.saveIntake();
    eq(((r.c.jobs[0] || {}).coFiduciaries || []).map((x) => x.name), ['Mae O\'Neil'], 'only the row left is saved');
    // The reset draws the block again, empty, so the next client starts with none.
    r.c.resetIntakeFields();
    const blk = r.d.getElementById('i-cofid-block').innerHTML;
    has(blk, 'id="i-cofid-rows" data-rows="" data-next="0"', '⚠ the reset draws the rows empty');
    lacks(blk, 'i-cofid-0', 'with no row left from the last client');
    eq(['i-trust-name', 'i-trust-date', 'i-trustee-accepted'].map((id) => r.d.getElementById(id).value), ['', '', ''], 'and the trust\'s details cleared');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDIT CLIENT, driven as a person uses it: the modal rendered, read back as a browser shows it, changed, and saved.
  function ecRig(job, opts) {
    opts = opts || {};
    const said = { alerts: [], notices: [] };
    const STOP = ['renderClientDashboard', 'renderJobs', 'calcAll'];
    const mk = (d, jobsArr) => lift(['showEditClient', 'saveClientEdit', 'ecToggleProbate', 'addCoFiduciaryRow', 'removeCoFiduciaryRow'], STOP, {
      document: d, jobs: jobsArr, estimateStore: opts.estimateStore || {}, contractors: [], referralDirectory: [], REFERRAL_SYNC_URL: '',
      Date: FixedDate(NOW), setTimeout: () => 0, saveJobs() {}, syncJobToSheets() {}, renderClientDashboard() {}, renderJobs() {}, calcAll() {},
      dashNotice: (t, m) => said.notices.push(String(m)), alert: (m) => said.alerts.push(String(m)), confirm: opts.confirm || (() => true) });
    const probe = domStub({});
    const r0 = mk(probe, [JSON.parse(JSON.stringify(job))]);
    r0.showEditClient(job.id);
    const html = probe.getElementById('edit-client-modal').innerHTML;
    const form = Object.assign(formFromHtml(html), opts.edits || {});
    const rendered = new Set((html.match(/\bid="([^"]+)"/g) || []).map((m) => m.slice(4, -1)));
    const d = domStub(form);
    const mint = d.getElementById.bind(d);
    // A browser answers null for a control the modal never rendered (rows added on the page are rendered by the add).
    const added = new Set();
    d.getElementById = (id) => (/^ec-/.test(id) && !rendered.has(id) && !added.has(id) && !(id in (opts.edits || {}))) ? null : mint(id);
    (html.match(/<[a-z]+\b[^>]*\bid="[^"]+"[^>]*>/g) || []).forEach((t) => {
      const id = /\bid="([^"]+)"/.exec(t)[1];
      let m; const re = /\bdata-([a-z-]+)="([^"]*)"/g;
      while ((m = re.exec(t))) mint(id).dataset[m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = unesc(m[2]);
    });
    const c = mk(d, [JSON.parse(JSON.stringify(job))]);
    // `addRow(values)` presses + Add a co-representative and types into the new row.
    const addRow = (vals) => { const n = c.addCoFiduciaryRow('ec'); ['name', 'role', 'phone', 'email'].forEach((k) => added.add('ec-cofid-' + n + '-' + k));
      added.add('ec-cofid-' + n); Object.keys(vals || {}).forEach((k) => { d.getElementById('ec-cofid-' + n + '-' + k).value = vals[k]; }); return n; };
    if (opts.act) opts.act(c, d, addRow);
    c.saveClientEdit(job.id);
    return { html, form, d, c, said, job: c.jobs[0] };
  }
  const EC_TRUST = TRUST({ status: 'won', coFiduciaries: [{ id: 'cf1', name: 'Daniel Adler', role: 'Trustee', phone: '(561) 555-0103', email: 'dan@adler.example' },
    { id: 'cf2', name: 'Mae O\'Neil', role: 'Trustee', phone: '', email: 'mae@oneil.example' }], at: {} });

  G('A2 · A4 · A5 · A6 · Edit Client draws the paper, the trust, the sale and the co-representatives by the matter', () => {
    const t = ecRig(EC_TRUST);
    eq((/<div class="dfl" id="ec-exec-auth-lbl">([^<]*)<\/div>/.exec(t.html) || [])[1], 'Certification of Trust', '⚠⚠ a trust-only matter: the control names the Certification of Trust');
    lacks(t.html, 'Letters of Administration', 'and never the Letters');
    eq(styleOf(t.html, 'ec-exec-auth-wrap'), undefined, 'shown');
    eq([styleOf(t.html, 'ec-trust-fields'), styleOf(t.html, 'ec-sale-fields')], ['display:block;', 'display:block;'], 'the trust\'s details and the sale question are shown');
    eq([t.form['ec-trust-name'], t.form['ec-trust-date'], t.form['ec-trustee-accepted'], t.form['ec-probate-sale']],
       ['The Adler Family Revocable Trust', '2019-04-02', '2026-03-01', 'yes'], 'prefilled from the record');
    has(t.html, 'id="ec-cofid-rows" data-rows="0,1" data-next="2" data-removed=""', 'both co-trustees are drawn, in order');
    eq([t.form['ec-cofid-0-name'], t.form['ec-cofid-0-role'], t.form['ec-cofid-1-name'], t.form['ec-cofid-1-email']],
       ['Daniel Adler', 'Trustee', 'Mae O\'Neil', 'mae@oneil.example'], 'each with what was recorded');
    has(t.html, 'id="ec-cofid-0" data-id="cf1"', 'each row carries its entry\'s id');
    has(t.html, 'onclick="removeCoFiduciaryRow(\'ec\',1)">&#10005; Remove</button>', 'each with ✕ Remove');
    // RESTATED 2026-10-05 (P20; Q22): the hint says each co-representative signs the agreement beside the representative.
    has(t.html, 'Each one approves the releases with the representative and signs the agreement beside them: in DocuSign, which needs their email, or on the printed page when it is signed by hand.</div>', 'and how each signs the agreement');
    lacks(t.html, 'A DocuSign envelope goes to the representative alone', '⚠ never the old one-signer sentence');
    lacks(t.html, 'on paper', 'and nothing beyond the two routes is prescribed');
    const p = ecRig(PROBATE());
    eq((/<div class="dfl" id="ec-exec-auth-lbl">([^<]*)<\/div>/.exec(p.html) || [])[1], 'Letters of Administration', 'a probate matter: the Letters');
    eq([styleOf(p.html, 'ec-trust-fields'), styleOf(p.html, 'ec-sale-fields')], ['display:none;', 'display:block;'], 'no trust; the sale question');
    const n = ecRig(TRUST({ matterType: 'neither' }));
    eq([styleOf(n.html, 'ec-exec-auth-wrap'), styleOf(n.html, 'ec-trust-fields'), styleOf(n.html, 'ec-sale-fields')], ['display:none;', 'display:none;', 'display:none;'],
       '⚠ Neither: no paper, no trust, no sale question');
    has(n.html, 'id="ec-exec-auth"', 'the control is still rendered, hidden: its value is the record\'s, and a matter answered later shows it');
    const living = ecRig(TRUST({ svc: 'downsizing', matterType: '', phone: '(561) 555-0100', email: 'w@a.example' }));
    eq(styleOf(living.html, 'ec-estate-auth-fields'), 'display:none;', 'a living client: the estate block, with the co-representatives in it, is hidden');
    eq(living.job.coFiduciaries.length, 1, '…and its save never touches them');
  });

  G('A2 · Edit Client: the labels follow the matter type live, mid-edit', () => {
    const d = domStub({ 'ec-svc': 'cleanout', 'ec-matter-type': 'probate' });
    const c = lift(['showEditClient', 'ecToggleProbate'], ['renderClientDashboard', 'renderJobs'], { document: d, jobs: [JSON.parse(JSON.stringify(TRUST({ matterType: 'probate' })))],
      estimateStore: {}, contractors: [], referralDirectory: [], Date: FixedDate(NOW) });
    c.showEditClient(7);
    const look = (mt) => { d.getElementById('ec-matter-type').value = mt; c.ecToggleProbate();
      return [d.getElementById('ec-exec-auth-wrap').style.display, d.getElementById('ec-exec-auth-lbl').textContent,
              d.getElementById('ec-trust-fields').style.display, d.getElementById('ec-sale-fields').style.display]; };
    eq(look('trust'), ['', 'Certification of Trust', 'block', 'block'], '⚠⚠ switched to Trust: the Certification of Trust, the trust\'s details, the sale question');
    eq(look('neither'), ['none', 'Certification of Trust', 'none', 'none'], 'switched to Neither: the control, the trust and the sale go (the label is left as it was, unseen)');
    eq(look('both'), ['', 'Letters of Administration', 'block', 'block'], 'switched to Both: the Letters, and the trust');
    eq(look('probate'), ['', 'Letters of Administration', 'none', 'block'], 'and back to Probate');
  });

  G('A6 · Edit Client: open and save untouched writes nothing to the co-representatives', () => {
    const r = ecRig(EC_TRUST);
    eq(r.said.alerts, [], 'nothing refused');
    eq(JSON.parse(JSON.stringify(r.job.coFiduciaries)), JSON.parse(JSON.stringify(EC_TRUST.coFiduciaries)), 'the list is as it was');
    eq(Object.keys(r.job.at || {}).filter((k) => /^coFiduciaries:/.test(k)), [], '⚠⚠ and no entry is stamped: a key this device merely carried never claims to be newer');
    eq([r.job.trustName, r.job.trustDate, r.job.trusteeAcceptedOn, r.job.probateSale, r.job.executorAuth],
       ['The Adler Family Revocable Trust', '2019-04-02', '2026-03-01', 'yes', 'pending'], 'the trust, the sale and the Certification\'s answer kept');
  });

  G('A6 · Edit Client: edit one, add one, remove one (asked first), each a stamped edit of that entry alone', () => {
    const e = ecRig(EC_TRUST, { edits: { 'ec-cofid-1-phone': '(561) 555-0144' } });
    eq(e.job.coFiduciaries.map((x) => [x.id, x.phone]), [['cf1', '(561) 555-0103'], ['cf2', '(561) 555-0144']], 'the edit is saved on its own entry');
    eq(Object.keys(e.job.at).filter((k) => /^coFiduciaries:/.test(k)), ['coFiduciaries:cf2'], '⚠⚠ and only that entry is stamped');
    const a = ecRig(EC_TRUST, { act: (c, d, addRow) => addRow({ name: 'Ruth Adler', role: 'Personal Representative', email: 'ruth@adler.example' }) });
    eq(a.job.coFiduciaries.map((x) => x.name), ['Daniel Adler', 'Mae O\'Neil', 'Ruth Adler'], 'a co-representative added');
    const nid = a.job.coFiduciaries[2].id;
    eq(Object.keys(a.job.at).filter((k) => /^coFiduciaries:/.test(k)), ['coFiduciaries:' + nid], 'stamped on its own new key');
    let asked = [];
    const rm = ecRig(EC_TRUST, { confirm: (m) => { asked.push(m); return true; }, act: (c) => c.removeCoFiduciaryRow('ec', 0) });
    has(asked[0] || '', 'Remove Daniel Adler from the co-representatives on this estate?', '⚠ asked first, by name');
    has(asked[0] || '', 'It is recorded when you press Save Changes; Cancel keeps them.', 'saying when it takes effect');
    eq(rm.job.coFiduciaries.map((x) => x.id), ['cf2'], 'removed on Save');
    ok(typeof rm.job.at['coFiduciaries:cf1'] === 'number', '⚠⚠ a stamped removal: absence alone is never one');
    eq(Object.keys(rm.job.at).filter((k) => /^coFiduciaries:/.test(k)), ['coFiduciaries:cf1'], 'and nothing else stamped');
    const no = ecRig(EC_TRUST, { confirm: () => false, act: (c) => { eq(c.removeCoFiduciaryRow('ec', 0), false, 'declined: the press does nothing'); } });
    eq(no.job.coFiduciaries.map((x) => x.id), ['cf1', 'cf2'], '…and the save keeps them both');
    // A name cleared on a recorded row, or a new row with no name: refused, and nothing is written.
    const cl = ecRig(EC_TRUST, { edits: { 'ec-cofid-0-name': '', 'ec-trust-name': 'Changed' } });
    has(cl.said.alerts[0] || '', 'Please complete: Co-representative 1’s name.', '⚠ a cleared name is refused, by row');
    has(cl.said.alerts[0] || '', 'a row added by mistake comes off with its ✕ Remove', 'with the way out');
    has(cl.said.alerts[0] || '', 'Nothing has been saved.', 'and nothing is saved');
    eq([cl.job.coFiduciaries[0].name, cl.job.trustName], ['Daniel Adler', 'The Adler Family Revocable Trust'], 'the record is untouched');
    const nn = ecRig(EC_TRUST, { act: (c, d, addRow) => addRow({ email: 'nobody@x.com' }) });
    has(nn.said.alerts[0] || '', 'Co-representative 3’s name', 'a new row with an email and no name: refused');
    eq(nn.job.coFiduciaries.length, 2, 'nothing added');
    const blank = ecRig(EC_TRUST, { act: (c, d, addRow) => addRow({}) });
    eq([blank.said.alerts.length, blank.job.coFiduciaries.length], [0, 2], 'a new row left empty is no one, and is not refused');
    // A row drawn from an entry another device has removed since the modal opened is left removed.
    const gone = ecRig(EC_TRUST, { edits: { 'ec-cofid-0-phone': '(561) 555-0999' }, act: (c) => { c.jobs[0].coFiduciaries = c.jobs[0].coFiduciaries.filter((x) => x.id !== 'cf1'); } });
    eq(gone.job.coFiduciaries.map((x) => x.id), ['cf2'], 'an entry removed elsewhere is not brought back by an edit of a row drawn before');
  });

  G('A4 · A5 · Edit Client saves the trust and the sale answer where it shows them, and only there', () => {
    const t = ecRig(EC_TRUST, { edits: { 'ec-trust-name': '  The Adler Trust  ', 'ec-trust-date': '2020-01-15', 'ec-trustee-accepted': '2026-03-05', 'ec-probate-sale': 'maybe' } });
    eq([t.job.trustName, t.job.trustDate, t.job.trusteeAcceptedOn, t.job.probateSale], ['The Adler Trust', '2020-01-15', '2026-03-05', 'maybe'],
       '⚠⚠ a trust matter: the trust\'s details and the sale answer saved');
    const p = ecRig(PROBATE({ trustName: 'Old Name' }), { edits: { 'ec-trust-name': 'Typed Into A Hidden Box', 'ec-probate-sale': 'no' } });
    eq([p.job.trustName, p.job.probateSale], ['Old Name', 'no'], 'a probate matter: the hidden trust box is not read; the sale is');
    const n = ecRig(TRUST({ matterType: 'neither' }), { edits: { 'ec-probate-sale': 'no', 'ec-trust-name': 'X' } });
    eq([n.job.probateSale, n.job.trustName], ['yes', 'The Adler Family Revocable Trust'], 'Neither: neither is read, and the record keeps both');
    const sw = ecRig(TRUST({ matterType: 'probate', trustName: '' }), { edits: { 'ec-matter-type': 'trust', 'ec-trust-name': 'The New Trust' } });
    eq([sw.job.matterType, sw.job.trustName], ['trust', 'The New Trust'], 'a matter switched to Trust in the modal: its details are saved with it');
    // The Certification's answer is written through the gate's resolver, as the Letters' always was.
    const rc = ecRig(EC_TRUST, { edits: { 'ec-exec-auth': 'received' } });
    eq(rc.job.executorAuth, 'received', 'the Certification of Trust recorded as received');
  });

  G('what was typed into a co-representative row is text, in its value and its id', () => {
    const r = ecRig(TRUST({ coFiduciaries: [{ id: 'c"x', name: 'Mae "Mo" O\'Neil <b>', role: 'Trustee', email: 'a"b@x.com' }] }));
    has(r.html, 'value="Mae &quot;Mo&quot; O&#39;Neil &lt;b&gt;"', 'the name is escaped in its value');
    has(r.html, 'data-id="c&quot;x"', 'and the id in its attribute');
    lacks(r.html, 'O\'Neil <b>', 'never markup');
    eq(r.form['ec-cofid-0-name'], 'Mae "Mo" O\'Neil <b>', 'and reads back exactly as typed');
    eq(r.job.coFiduciaries[0].name, 'Mae "Mo" O\'Neil <b>', 'so an untouched save keeps it');
  });

  G('the load builds the intake block, as it builds the role list', () => {
    const live = noComments(SRC);
    has(live.slice(live.lastIndexOf('buildExecutorAuthOptions();')), 'buildCoFiduciaryBlock();', 'the co-representative block is drawn at load');
    has(SRC, '<div id="i-cofid-block"></div>', 'into its empty host on the intake form');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('the four documents describe the trust\'s paper, its details, the co-representatives and the 706 date', () => {
    const root = path.join(__dirname, '..');
    const norm = (s) => s.replace(/<[^>]+>/g, '').replace(/\*\*|\*|`/g, '').replace(/&rsquo;|’/g, '\'').replace(/&sect;/g, '§')
      .replace(/&mdash;/g, '—').replace(/&hellip;/g, '…').replace(/&ldquo;|&rdquo;/g, '"').replace(/&amp;/g, '&').replace(/&#9998;/g, '✎');
    ['MANUAL.md', 'manual.html', 'CONCIERGE_GUIDE.md', 'concierge-guide.html'].forEach((f) => {
      const d = norm(fs.readFileSync(path.join(root, f), 'utf8'));
      ok(d.split('\n').some((l) => l.indexOf('Certification of Trust') >= 0 && l.indexOf('2026-10-03') >= 0 && l.indexOf('§736.1017') >= 0),
         f + ' names the Certification of Trust, its statute and its date, in one passage');
      has(d, '+ Add a co-representative', f + ' names the co-representative control');
      // RESTATED 2026-10-05 (P20): Anthony decided (Q22) that each co-representative signs the agreement beside the
      // representative, in DocuSign or on the printed page, so the documents say that where they said DocuSign went to one
      // signer. tests/p20-esign-cosigners.test.js reads the rest of what they say about it.
      has(d, 'signs the agreement beside them', f + ' says each co-representative signs the agreement beside the representative');
      lacks(d, 'a DocuSign envelope goes to the representative alone', f + ' no longer says DocuSign goes to one signer');
      // …and still prescribes no "on paper" signing beyond the two routes it names.
      lacks(d, 'sign the agreement on paper', f + ' prescribes no paper signing for a co-representative');
      lacks(d, 'signs the agreement on paper', f + ' (either wording)');
      has(d, 'Form 706', f + ' names the Form 706 date');
      has(d, 'Trust Details', f + ' names the trust\'s details');
      // ⚠ The sentences that described the old behaviour are gone (a behaviour change updates every one of them).
      lacks(d, 'A trust matter is never asked.', f + ' no longer says a trust is never asked');
      lacks(d, 'court deadline or authorization, because a trust matter has none', f + ' no longer says the Trust card has no authorization');
      lacks(d, 'property-sale answer or authorization (neither the chip nor the field)', f + ' nor that it shows no property-sale answer');
    });
    ['MANUAL.md', 'manual.html'].forEach((f) => {
      const d = norm(fs.readFileSync(path.join(root, f), 'utf8'));
      has(d, 'Form 706 due …', f + ': the strip\'s 706 row');
      has(d, 'passed: confirm with counsel it was filed or extended', f + ': its words once the date has passed');
      has(d, 'Certification of Trust pending — blocker', f + ': the Trust card\'s chip');
      has(d, 'not recorded', f + ': a blank trust detail');
    });
    ['CONCIERGE_GUIDE.md', 'concierge-guide.html'].forEach((f) => {
      const d = norm(fs.readFileSync(path.join(root, f), 'utf8'));
      has(d, 'The successor trustee\'s Certification of Trust must be received', f + ': the symptom row names the gate\'s words');
      has(d, 'It is not ours to file', f + ': the 706 line is a reminder, and says whose it is');
    });
  });
};
