'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P18 · THE TRUST PACKAGE (2026-10-02, workstream W-A). Anthony's answer A, asked: "Trust-only or no-court estates
// have no Probate card, so they can't send a package. My call: yes for trusts. Use the same package with the Trust
// Schedule, sent to the trustee's attorney (or the trustee if there's no attorney). Put the button on the same card,
// renamed for trust matters. For 'Neither' I'd skip it; send documents one at a time as today." Anthony: "1 - yes."
//
//   · One answer, estatePackageRoute(job): the probate route wherever jobOnProbateTrack holds (unchanged), the trust
//     route on a trust-only matter, null everywhere else — each route an entry of ESTATE_PKG_ROUTES whose flags the
//     readers ask (never a matter name: matter-type.test.js nets those). The card, the blocker, the addressee, the
//     email's words, the send's notices and the confirming tap's refusal all ask it; the readers are counted here.
//   · The Trust card: the same card renamed (Trust Information, Trustee's Attorney, Trustee), with no court record and
//     no authorization chip, because jobActivationBlockers waits on the Letters only where the estate goes through
//     probate. The chip is held to the gate on every service and matter type.
//     RESTATED 2026-10-03 (P19): the gate now waits on the successor trustee's Certification of Trust on a trust-only
//     matter (Anthony's call 1, estateAuthority), so the Trust card carries THAT chip and field, and the trust's own
//     details with the property-sale answer (propertySaleAsked); the chip is still held to the gate everywhere.
//   · To the trustee's attorney where an email is recorded, else to the trustee; the trustee copied when the attorney
//     is addressed, agreements@ always. Refused by name, everything missing at once, saying where each is entered.
//   · The Trust Schedule, the tier's document and the Appraisal Worklist attached, the links as on the probate route,
//     and never a Court Inventory, a case number or a word about a court or a filing.
//   · Recorded on docState.probatePackage exactly as the probate package is; Neither and living clients have no card,
//     and the handler refuses them.
//
// Everything is DRIVEN through the real functions: the dashboard, the send (over the real printers, sharing, filing,
// PDF and Gmail code) and the confirming tap, each lifted as its own call graph derived from the source, with only the
// boundaries stubbed by name — the network at `fetch`, Google's sign-in, the screen's notices and the store saves —
// and the sandbox's clock stopped (FixedDate), so nothing here reads the wall clock.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { sandbox, source, fn, decl, domStub } = require('./harness');

const SRC = source();

// The functions and top-level vars `roots` reach (the closure p17-documents-drive.test.js uses: comments and string
// literals stripped first, so an onclick naming a function is not a call). `stop` names what the test supplies.
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
  return { fns: [...fns], vars: [...vars] };
}
function lift(roots, stop, stubs) {
  const c = closure(roots, (stop || []).concat(Object.keys(stubs || {})));
  return sandbox({ fns: c.fns, vars: c.vars, stubs: stubs || {} });
}
// Dates are read in Eastern time, as the app runs, and the zone is put back afterwards.
const inEastern = (body) => { const prev = process.env.TZ; process.env.TZ = 'America/New_York'; try { return body(); } finally { process.env.TZ = prev; } };

// ── A synchronous, already-settled promise: the runner is synchronous, so every `fetch(...).then(...)` chain has to
// run inside the call. It unwraps a returned thenable like a real promise does.
function sp(v) {
  if (v && v.__sync) return v;
  return { __sync: true,
    then(f) { try { return sp(f ? f(v) : v); } catch (e) { return sr(e); } },
    catch() { return this; }, finally(f) { if (f) f(); return this; } };
}
function sr(e) {
  return { __sync: true,
    then(f, g) { if (!g) return this; try { return sp(g(e)); } catch (e2) { return sr(e2); } },
    catch(h) { try { return sp(h(e)); } catch (e2) { return sr(e2); } }, finally(f) { if (f) f(); return this; } };
}
const res = (obj, status) => ({ ok: (status || 200) < 300, status: status || 200, json: () => sp(obj), text: () => sp(JSON.stringify(obj)) });

// ── The fake network: the Apps Script /exec (GET loadMedia; POST shareFolder, uploadHtml, htmlToPdf, getSubfolders),
// Google's userinfo and the Gmail drafts endpoint. Everything posted is kept for the assertions.
const SYNC = 'https://script.google.com/macros/s/P18TRUST/exec';
const BOX = 'anthony@havellinpalmbeach.com';
function net(opts) {
  const o = Object.assign({ media: null, gmailFail: false, failShare: null }, opts || {});
  const log = { posts: [], uploads: [], pdfs: [], shares: [], drafts: [], gets: [] };
  let n = 0;
  const fetch = (url, init) => {
    const u = String(url);
    if (init && init.method === 'POST' && u.indexOf(SYNC) === 0) {
      const body = JSON.parse(init.body || '{}');
      log.posts.push(body.action || body.type);
      if (body.action === 'shareFolder') {
        log.shares.push({ folderId: body.folderId, email: body.email });
        return sp(res(o.failShare === body.folderId ? { ok: false, error: 'Drive refused the share' } : { ok: true }));
      }
      if (body.action === 'uploadHtml') {
        n++;
        log.uploads.push({ folderId: body.folderId, filename: body.filename, html: body.html });
        return sp(res({ ok: true, fileUrl: 'https://drive.google.com/file/d/up' + n + '/view', fileId: 'up' + n }));
      }
      if (body.action === 'getSubfolders') return sp(res({ ok: true, subfolders: null }));
      if (body.action === 'htmlToPdf') {
        log.pdfs.push(body.html);
        return sp(res({ ok: true, base64: Buffer.from('%PDF-1.4 ' + 'x'.repeat(150) + ' #' + log.pdfs.length).toString('base64') }));
      }
      return sp(res({ ok: true }));
    }
    if (u.indexOf(SYNC) === 0) {
      log.gets.push(u);
      if (/action=loadMedia/.test(u)) return sp(res(o.media ? { ok: true, media: o.media } : { ok: false, error: 'offline' }));
      return sp(res({ ok: false }));
    }
    if (u === 'https://www.googleapis.com/oauth2/v3/userinfo') return sp(res({ email: BOX }));
    if (u === 'https://gmail.googleapis.com/gmail/v1/users/me/drafts') {
      const raw = JSON.parse(init.body).message.raw;
      const mime = Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
      if (o.gmailFail) return sp(res({ error: { message: 'Request had insufficient authentication scopes.' } }, 403));
      log.drafts.push(mime);
      return sp(res({ id: 'r-' + log.drafts.length, message: { id: 'm-' + log.drafts.length } }));
    }
    return sr(new TypeError('Failed to fetch ' + u));
  };
  return { fetch, log };
}

// MIME parts, read back the way a mail client does.
function mimeParts(mime) {
  const mix = (/boundary="(MIX-[^"]+)"/.exec(mime) || [])[1];
  const alt = (/boundary="(ALT-[^"]+)"/.exec(mime) || [])[1];
  const parts = mix ? mime.split('--' + mix).slice(1, -1) : [];
  const out = { pdfs: [], text: '', html: '' };
  parts.forEach((p) => {
    if (/Content-Type: multipart\/alternative/.test(p) && alt) {
      p.split('--' + alt).slice(1, -1).forEach((q) => {
        const dec = Buffer.from(q.slice(q.indexOf('\r\n\r\n') + 4).replace(/\r\n/g, ''), 'base64').toString('utf8');
        if (/text\/plain/.test(q)) out.text = dec; else if (/text\/html/.test(q)) out.html = dec;
      });
    } else if (/application\/pdf/.test(p)) {
      out.pdfs.push({ name: (/filename="([^"]+)"/.exec(p) || [])[1] });
    }
  });
  return out;
}
const decodeHeader = (h) => String(h || '').replace(/=\?UTF-8\?B\?([^?]+)\?=/g, (m, b) => Buffer.from(b, 'base64').toString('utf8'));
const headerOf = (mime, name) => ((new RegExp('^' + name + ': (.*)$', 'm')).exec(mime) || [])[1] || '';
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&middot;/g, '·').replace(/&rsquo;/g, '’')
  .replace(/&mdash;/g, '—').replace(/&#10003;/g, '✓').replace(/&#128231;/g, '📧').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
// The card a rendered dashboard holds whose heading is `title`: from its opening <div class="card"> to the </div> that
// closes it, by counting divs, so a check on it never reads the cards around it.
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

// ── Fixtures ────────────────────────────────────────────────────────────────
const NOW = Date.parse('2026-10-02T15:00:00Z');
const T0 = Date.parse('2026-09-28T15:00:00Z');
const FixedDate = (t) => class extends Date { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } };
// A trust-only estate. ⚠ It still carries a case number, a deadline and a property-sale answer from an earlier answer
// to the matter question: none of them may reach the Trust card or the email.
const TRUST = (o) => Object.assign({
  id: 7, hvlId: 'HVL-0007', name: 'Walter Ellsworth', svc: 'cleanout', status: 'active', won: true, approved: true,
  addr: '69 Beach Blvd', city: 'Palm Beach', tc: 'Ashley Jerome', agrApprovedBy: 'Anthony Graziano',
  matterType: 'trust', docTier: 'values', deathDate: '2026-08-01', executorAuth: 'pending',
  probateCase: '2026-CP-001234', probateDeadline: '2026-11-20', probateSale: 'yes',
  executor: 'Rex Hale', executorRole: 'Successor Trustee', executorEmail: 'rex@hale.example', executorPhone: '(561) 555-0101',
  probateAttyName: 'Ann Lowe', probateAttyFirm: 'Lowe & Co', probateAttyEmail: 'ann@lowe.law', probateAttyPhone: '(561) 555-0102',
  driveFolder: 'https://drive.google.com/drive/folders/ROOT7',
  driveSubfolders: { 'Estate Inventory': 'INV7', 'As-Found Record': 'AF7', 'Agreement': 'AGR7', 'Change Orders': 'CO7' },
  docState: {}, at: {}, updatedAt: T0, payments: [],
}, o || {});
const PROBATE = (o) => TRUST(Object.assign({ svc: 'probate', matterType: 'probate', executorRole: 'Personal Representative' }, o || {}));
const ROW = (id, over) => Object.assign({
  stableId: id, label: 'inventory', collId: null, roomIdx: 1, status: 'uploaded', ts: T0, updatedAt: T0,
  objectName: 'Sideboard', category: 'Furniture', qty: 1, condition: 'Good', fmv: 1200, valSource: 'Comparable sales',
  driveFileId: 'f' + id, driveFileUrl: 'https://drive.google.com/file/d/f' + id + '/view',
}, over || {});
const INVENTORY = () => [
  ROW('a', { itemNo: 1, objectName: 'Sargent portrait', category: 'Art & Décor', fmv: 48000, valSource: 'Appraisal',
             disposition: 'Auction', channel: 'Christie’s', authBy: 'Rex Hale', approvalDate: '2026-09-25',
             custodyLog: [{ cid: 'c1', at: T0, action: 'Released', party: 'Christie’s', date: '2026-09-26', method: 'Courier', receipt: 'CH-0091' }] }),
  // One line with no value: the Trust Schedule must read as a floor, never FINAL.
  ROW('b', { itemNo: 2, objectName: 'Dining chairs (8)', qty: 8, fmv: '', valSource: '' }),
  { stableId: 'd1', label: 'appraisal', collId: '3', roomIdx: null, status: 'uploaded', ts: T0, objectName: 'Christies appraisal.pdf',
    filename: 'HVL-0007_APPRSL_Art_1.pdf', driveFileUrl: 'https://drive.google.com/file/d/APPR1/view' },
];
const EST = () => ({ approved: true, estimate: { jobId: 7, svc: 'cleanout', havellinTotal: 24000,
  rooms: [{ idx: 1, name: 'Study', st: 'in', vol: 3, cplx: 3 }], vendors: [] } });
const ROUTE_FNS = ['estatePackageRoute', 'jobOnProbateTrack', 'matterDef', 'matterTypeOf', 'invFiduciaryMode', 'isDecedentJob'];
const ROUTE_VARS = ['MATTER_TYPES', 'DECEDENT_SERVICES'];
const AGREEMENTS = 'agreements@havellinpalmbeach.com';

module.exports = function ({ group, ok, eq, has, lacks }) {
  const G = (name, body) => { group(name); try { inEastern(body); } catch (e) { ok(false, name + ' — threw: ' + String(e && e.message || e).split('\n')[0]); } };

  // The real dashboard, its call graph derived from the source, lifted once and fed one job at a time.
  let dashRig = null;
  const renderDash = (job) => {
    if (!dashRig) {
      const dom = domStub({});
      const c = lift(['renderClientDashboard', 'jobActivationBlockers'], ['esignRefresh', 'stripeRefresh', 'maybeStartJobsWatch', 'refreshPhotoRefs'], {
        document: dom, setTimeout: () => 0, clearTimeout() {}, Intl: global.Intl, Date: FixedDate(NOW),
        jobs: [], changeOrders: [], contractors: [], _photoRefs: {}, jobLogs: {}, SHEETS_SYNC_URL: SYNC, jobPlanStore: {},
        estimateStore: { 7: EST() }, maybeStartJobsWatch() {}, esignRefresh() {}, stripeRefresh() {}, refreshPhotoRefs() {} });
      dashRig = { c, dom };
    }
    dashRig.c.jobs.length = 0;
    dashRig.c.jobs.push(JSON.parse(JSON.stringify(job)));
    dashRig.c.renderClientDashboard(job.id);
    return dashRig.dom.getElementById('client-dashboard-view').innerHTML;
  };

  // The whole send: the real sendProbatePackage over the real printers, sharing, filing, PDF and Gmail code, with only
  // the network (fetch), Google's sign-in, the notices and the store saves at the boundary.
  function pkgRig(over) {
    const o = Object.assign({ job: TRUST(), media: true, rows: INVENTORY(), net: {} }, over || {});
    const N = net(Object.assign({ media: o.media ? { 7: { items: JSON.parse(JSON.stringify(o.rows)) } } : null }, o.net));
    const notices = [], opened = [], hrefs = [], saves = [];
    const loc = { set href(v) { hrefs.push(v); }, get href() { return ''; } };
    const c = lift(['sendProbatePackage', 'probatePackageCardHtml', 'markDocSent', 'draftOutstanding', 'draftIsStale', 'noDraftToConfirm'],
      ['saveJobs', 'syncJobToSheets', '_docNotice', '_dashSendState', 'showSyncBadge', 'dashNotice', '_dashRedraw', 'gmailAuth',
       'savePhotoRefs', '_primeAgreementFor', '_primeEstimateFor', 'markAgreementSent', 'markEstimateSent', 'loadPhotoRefs'], Object.assign({
        jobs: [o.job], estimateStore: { 7: EST() }, jobPlanStore: {}, _photoRefs: { 7: JSON.parse(JSON.stringify(o.rows)) }, changeOrders: [],
        SHEETS_SYNC_URL: SYNC, fetch: N.fetch, document: domStub({}), setTimeout: () => 0, clearTimeout() {}, Date: FixedDate(NOW),
        window: { open: (u) => opened.push(u), location: loc },
        gmailAuth: (cb) => cb('tok-p18'), loadPhotoRefs() {}, savePhotoRefs() {},
        saveJobs: () => saves.push('jobs'), syncJobToSheets: () => saves.push('sync'), _dashRedraw() {},
        _docNotice: (t, m) => notices.push({ t, m: String(m) }), dashNotice: (t, m) => notices.push({ t, m: String(m) }),
        _dashSendState() {}, showSyncBadge() {},
      }, o.stubs || {}));
    return { c, N, notices, opened, hrefs, saves, job: () => c.jobs[0], last: () => (notices[notices.length - 1] || {}) };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  G('A · one answer: estatePackageRoute, on every service and matter type', () => {
    const R = sandbox({ fns: ROUTE_FNS, vars: ROUTE_VARS.concat(['ESTATE_PKG_ROUTES']) });
    // The route is the catalogue's own entry (null off both routes); named here by its key to read the table.
    const keyOf = (r) => r === R.ESTATE_PKG_ROUTES.probate ? 'probate' : r === R.ESTATE_PKG_ROUTES.trust ? 'trust' : r === null ? '' : 'UNEXPECTED';
    const route = (svc, matterType) => keyOf(R.estatePackageRoute({ svc, matterType }));
    // [service, matter type, route]
    const TABLE = [
      ['probate', '', 'probate'], ['probate', 'probate', 'probate'], ['probate', 'both', 'probate'], ['probate', 'trust', 'trust'], ['probate', 'neither', ''],
      ['contested_probate', '', 'probate'], ['contested_probate', 'both', 'probate'], ['contested_probate', 'trust', 'trust'], ['contested_probate', 'neither', ''],
      ['cleanout', '', ''], ['cleanout', 'probate', 'probate'], ['cleanout', 'both', 'probate'], ['cleanout', 'trust', 'trust'], ['cleanout', 'neither', ''],
    ];
    TABLE.forEach(([svc, mt, want]) => eq(route(svc, mt), want, svc + ' / ' + (mt || 'unanswered') + ' → ' + (want || 'no package')));
    // ⚠ A pour-over will is the probate route: it has a court in it, and its Probate card already carries the Trust Schedule.
    eq(route('cleanout', 'both'), 'probate', '⚠ Both is the probate route, never the trust one');
    // ⚠ An unanswered matter is never read as a trust, and a living client has no matter at all.
    ['downsizing', 'downsizing_move', 'home_cleanout', 'prep'].forEach((svc) => {
      eq(route(svc, 'trust'), '', '⚠ a living ' + svc + ' job carrying a stale "trust" answer has no package');
      eq(route(svc, ''), '', 'nor one with none');
    });
    eq(route('cleanout', 'Trust'), '', 'an unrecognised answer is no answer');
    eq(R.estatePackageRoute(null), null, 'no job, no route');
    // The route's flags and words, one catalogue, the same fields for both routes.
    const W = R.ESTATE_PKG_ROUTES;
    eq(Object.keys(W), ['probate', 'trust'], 'two routes');
    eq(Object.keys(W.trust), Object.keys(W.probate), 'each with the same flags and words');
    eq(JSON.parse(JSON.stringify(W.trust)), { court: false, trust: true, name: 'trust package', label: 'Trust package', send: 'Send trust package',
      card: 'Trust card', title: 'Trust Information', atty: 'Trustee’s Attorney', rep: 'Trustee' }, 'the trust route: no court, the trustee addressable, its words');
    eq(JSON.parse(JSON.stringify(W.probate)), { court: true, trust: false, name: 'probate package', label: 'Probate package', send: 'Send probate package',
      card: 'Probate card', title: 'Probate Information', atty: 'Probate Attorney', rep: 'Executor' }, 'the probate route: the court, and the words it had');
    eq(sandbox({ vars: ['PROBATE_PKG_KEY'] }).PROBATE_PKG_KEY, 'probatePackage', '⚠ the stored key is the same on both routes, and never renamed');
  });

  G('A · its readers, counted: nothing else decides whether there is a package or which way it goes', () => {
    const live = noComments(SRC);
    ok(live.length > SRC.length * 0.5, 'the comment strip left most of the file (vacuity guard)');
    const names = [...new Set([...SRC.matchAll(/(^|\n)function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[2]))];
    const readers = (call) => names.filter((n) => { let b; try { b = fn(n); } catch (e) { return false; }
      return n !== call && noComments(b).indexOf(call + '(') >= 0; }).sort();
    // Every reader of the route, and what it reads it for.
    const ROUTE_READERS = {
      renderClientDashboard: 'whether the card is drawn, and its heads',
      probatePackageBlocker: 'the refusal off both routes, and what each route needs',
      probatePackageAddressee: 'whom it is addressed to',
      _pkgEstateLine: 'the estate line',
      probatePackageScopeLine: 'the scope lines',
      buildProbatePackageEmailText: 'the folder and the closing, text',
      buildProbatePackageEmailHtml: 'the line under the street, the folder and the closing, HTML',
      sendProbatePackage: 'the notices',
      probatePackageCardHtml: 'the row\'s label and button',
      noDraftToConfirm: 'the confirming tap\'s refusal',
    };
    eq(readers('estatePackageRoute'), Object.keys(ROUTE_READERS).sort(), '⚠⚠ estatePackageRoute is read by exactly these');
    eq(readers('probatePackageAddressee'), ['_pkgGreeting', 'probatePackageBlocker', 'probatePackageCardHtml', 'probatePackageRecipients'],
       '⚠ and whom it goes to by exactly these, so the To: line, the greeting, the refusal and the card name one person');
    // No second copy of the rule: every route comes out of the predicate. The catalogue itself is read by the predicate,
    // and by the off-route refusal alone, which names both cards because there is no route to name.
    const catReaders = names.filter((n) => { let b; try { b = fn(n); } catch (e) { return false; }
      return /\bESTATE_PKG_ROUTES\b/.test(noComments(b)); }).sort();
    eq(catReaders, ['estatePackageRoute', 'probatePackageBlocker'], '⚠ ESTATE_PKG_ROUTES is read by the predicate and the off-route refusal only');
    has(noComments(fn('estatePackageRoute')), 'return (d && d.trust) ? ESTATE_PKG_ROUTES.trust : null;', '⚠ the trust route asks the matter catalogue\'s own flag');
    ok(!/'(trust|both|neither)'/.test(noComments(fn('estatePackageRoute'))), 'and never a matter name (the matter-type net\'s rule)');
    // The package's words live in the catalogue: outside it, no live line names either package or either card.
    const cat = decl('ESTATE_PKG_ROUTES');
    ok(live.indexOf(cat) >= 0, 'fixture: the catalogue is live code');
    const rest = live.replace(cat, '');
    ['probate package', 'Probate package', 'Send probate package', 'Probate card', 'trust package', 'Trust package', 'Send trust package', 'Trust card']
      .forEach((w) => lacks(rest, '\'' + w, '"' + w + '" is spelled only in ESTATE_PKG_ROUTES'));
    has(noComments(fn('renderClientDashboard')), 'var _pkgW = estatePackageRoute(job);', 'the dashboard asks the route for the card');
    lacks(noComments(fn('renderClientDashboard')), 'if (jobOnProbateTrack(job))', 'and no longer draws it on the probate track alone');
    has(noComments(fn('probatePackageBlocker')), 'var R = estatePackageRoute(job);', 'the handler asks the cards\' question');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('A · the Trust card: renamed, no court record, its Certification of Trust chip (P19), the trust package at its foot', () => {
    const html = renderDash(TRUST());
    ok(html.length > 5000, 'the real dashboard rendered (' + html.length + ')');
    const card = cardAt(html, 'Trust Information');
    ok(card.length > 500, '⚠⚠ a trust-only matter has a card now: Trust Information');
    lacks(html, 'Probate Information', 'and never the Probate card');
    const t = text(card);
    has(t, 'Trustee’s Attorney Name Ann Lowe Firm Lowe & Co Phone (561) 555-0102 Email ann@lowe.law', 'the attorney block, headed for the trustee\'s attorney');
    has(t, 'Trustee Name Rex Hale Phone (561) 555-0101 Email rex@hale.example Role Successor Trustee', 'the representative block, headed Trustee');
    // ⚠ RESTATED 2026-10-03 (P19): 'Property sale', 'blocker' and 'Pending' came off this list. The gate now waits on the
    // successor trustee's Certification of Trust (Anthony's call 1), so the Trust card carries that chip and field — named
    // for the paper, never "Authorization", which is the Letters' word — and the property-sale answer is asked on a trust
    // too (Anthony, 2026-10-02: "yes"). What the list pinned still holds: no court record and no Letters on a trust.
    ['Case number', '2026-CP-001234', 'Court deadline', 'Probate Attorney', 'Executor', 'Authorization', 'Letters']
      .forEach((w) => lacks(t, w, '⚠ no court record and no Letters on the Trust card: ' + w));
    has(t, 'Trust Information Certification of Trust pending — blocker', 'its chip names the Certification of Trust (P19)');
    has(t, 'Role Successor Trustee Certification of Trust Pending', 'and so does the field beside the trustee (P19)');
    has(t, 'Property sale yes', 'the property-sale answer, asked on a trust since P19');
    has(t, 'Trust package', 'the package row, labelled for the trust route');
    // RESTATED 2026-10-03 (P19): the package carries the Disposition Ledger too, on both routes and at every tier, before the
    // Appraisal Worklist (probatePackageDocs; p19-ledger.test.js). Everything else here is as it was.
    has(t, 'Carries the Trust Schedule, Estate Inventory Report, Disposition Ledger and Appraisal Worklist, with links to the photographs and the release and custody record, to ann@lowe.law.',
        'it says what it carries, and to whom, before it goes');
    has(card, 'onclick="event.stopPropagation();sendProbatePackage(7)">&#128231; Send trust package</button>', '⚠ and the send, named for the route');
    // RESTATED 2026-10-03 (P19): this pinned margin-top:0px — no grid above the blocks. The trust's own details (its name,
    // date and the trustee's acceptance, with the property sale) now sit in a grid there, so the blocks keep a grid's gap.
    has(card, '<div class="d-split2" style="gap:0 24px;margin-top:12px;">', 'the blocks sit a grid\'s gap below the trust details (P19)');
    eq((card.match(/sendProbatePackage\(/g) || []).length, 1, 'one send on the card');
    // With no attorney recorded the row names the trustee.
    has(text(cardAt(renderDash(TRUST({ probateAttyEmail: '' })), 'Trust Information')),
        'release and custody record, to the trustee, rex@hale.example.', '⚠ with no attorney\'s email it goes to the trustee, and says so');
  });

  G('A · the Probate card is drawn as before', () => {
    const html = renderDash(PROBATE());
    const card = cardAt(html, 'Probate Information');
    ok(card.length > 500, 'the Probate card');
    lacks(html, 'Trust Information', 'and not the Trust card');
    const t = text(card);
    has(t, 'Authorization pending — blocker', 'the authorization chip');
    has(t, 'Case number 2026-CP-001234', 'the case number');
    has(t, 'Court deadline', 'the court deadline');
    has(t, 'Property sale yes', 'the property sale');
    has(t, 'Probate Attorney Name Ann Lowe', 'the probate attorney');
    has(t, 'Executor Name Rex Hale Phone (561) 555-0101 Email rex@hale.example Role Personal Representative Authorization', 'the executor, with the authorization');
    has(t, 'Probate package Carries the Court Inventory, Estate Inventory Report, Disposition Ledger and Appraisal Worklist', 'the probate package row (P19: with the ledger)');
    has(card, '&#128231; Send probate package</button>', 'and its send');
    has(card, '<div class="d-split2" style="gap:0 24px;margin-top:12px;">', 'the blocks spaced from the court grid as before');
    // A pour-over will, and an unanswered Probate service, are the probate route.
    ok(cardAt(renderDash(PROBATE({ matterType: 'both' })), 'Probate Information').length > 500, 'a pour-over will: the Probate card');
    ok(cardAt(renderDash(PROBATE({ matterType: '' })), 'Probate Information').length > 500, 'an unanswered Probate service: the Probate card');
  });

  G('A · Neither, an unanswered Estate Settlement and a living client: no card and no package', () => {
    [['Neither', TRUST({ matterType: 'neither' })], ['an unanswered Estate Settlement', TRUST({ matterType: '' })],
     ['a living client', TRUST({ svc: 'downsizing', matterType: 'trust' })]].forEach(([what, job]) => {
      const html = renderDash(job);
      ok(html.length > 5000, what + ': the dashboard rendered');
      ['pkg-row', 'Trust Information', 'Probate Information', 'sendProbatePackage('].forEach((w) => lacks(html, w, '⚠ ' + what + ': no ' + w));
    });
    const g = lift(['probatePackageCardHtml'], [], { jobs: [], estimateStore: {}, _photoRefs: {}, SHEETS_SYNC_URL: SYNC });
    eq(g.probatePackageCardHtml(TRUST({ matterType: 'neither' })), '', 'the row itself draws nothing off both routes');
  });

  G('A · the authorization chip is the activation gate, on every service and matter type', () => {
    ['probate', 'contested_probate', 'cleanout'].forEach((svc) => ['', 'probate', 'both', 'trust', 'neither'].forEach((mt) => {
      const job = TRUST({ svc, matterType: mt, executorAuth: 'pending' });
      const html = renderDash(job);
      // RESTATED 2026-10-03 (P19): the trust card's chip names its paper, the Certification of Trust; the probate card's
      // keeps "Authorization". Either is the chip.
      const chip = /(Authorization|Certification of Trust) pending — blocker/.test(html);
      const gate = dashRig.c.jobActivationBlockers(Object.assign({}, job, { agrSigned: true, depositReceived: true })).length > 0;
      eq(chip, gate, svc + ' / ' + (mt || 'unanswered') + ': the chip is drawn exactly where a pending authorization holds the job (' + gate + ')');
    }));
    // And it is a real gate where it is drawn: received lifts it.
    ok(!dashRig.c.jobActivationBlockers(PROBATE({ agrSigned: true, depositReceived: true, executorAuth: 'received' })).length, 'fixture: received lifts the gate');
    // RESTATED 2026-10-03 (P19): this read `[]` — nothing waited on a trust. The Certification of Trust holds a trust job
    // now (Anthony's call 1), never the Letters, and the Trust card shows its chip for exactly that reason.
    eq(dashRig.c.jobActivationBlockers(TRUST({ agrSigned: true, depositReceived: true, executorAuth: 'pending' })),
       ['The successor trustee’s Certification of Trust must be received'],
       '⚠ on a trust matter the Certification of Trust holds the job, never the Letters, which is why the Trust card shows its chip');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('A · whom it goes to: the trustee\'s attorney, else the trustee; the probate route unchanged', () => {
    const g = lift(['probatePackageRecipients', 'probatePackageAddressee', '_pkgGreeting'], [], {});
    const R = (job) => JSON.parse(JSON.stringify(g.probatePackageRecipients(job)));
    eq(R(TRUST()), { to: 'ann@lowe.law', cc: ['rex@hale.example', AGREEMENTS] }, '⚠⚠ trust: to the trustee\'s attorney, the trustee and agreements@ copied');
    eq(g.probatePackageAddressee(TRUST()), 'attorney', 'addressed to the attorney');
    eq(R(TRUST({ probateAttyEmail: '' })), { to: 'rex@hale.example', cc: [AGREEMENTS] }, '⚠⚠ no attorney: to the trustee, agreements@ alone copied');
    eq(g.probatePackageAddressee(TRUST({ probateAttyEmail: '  ' })), 'trustee', 'a blank attorney email is no email');
    eq(R(TRUST({ probateAttyEmail: '', executorEmail: '' })), { to: '', cc: [AGREEMENTS] }, 'neither: nobody to address it to');
    eq(g.probatePackageAddressee(TRUST({ probateAttyEmail: '', executorEmail: '' })), '', 'and the addressee says so');
    eq(R(TRUST({ executorEmail: 'ANN@lowe.law' })).cc, [AGREEMENTS], 'a trustee who is the attorney is not copied twice');
    eq(R(TRUST({ executorEmail: ' rex@hale.example ' })), { to: 'ann@lowe.law', cc: ['rex@hale.example', AGREEMENTS] }, 'addresses are trimmed');
    // ⚠ The probate route never falls back to the representative: the attorney is Anthony's one condition (P17).
    eq(R(PROBATE({ probateAttyEmail: '' })), { to: '', cc: ['rex@hale.example', AGREEMENTS] }, '⚠⚠ probate with no attorney: to nobody, never the PR');
    eq(g.probatePackageAddressee(PROBATE({ probateAttyEmail: '' })), '', 'so the probate route stays refused');
    eq(R(PROBATE()), { to: 'ann@lowe.law', cc: ['rex@hale.example', AGREEMENTS] }, 'probate: to the estate attorney, as before');
    eq(g.probatePackageAddressee(TRUST({ matterType: 'neither' })), '', 'no route, nobody');
    // The greeting names whoever it is addressed to.
    eq(g._pkgGreeting(TRUST()), 'Ann', 'the attorney greeted');
    eq(g._pkgGreeting(TRUST({ probateAttyName: '' })), 'Counsel', 'an attorney with no name recorded: Counsel');
    eq(g._pkgGreeting(TRUST({ probateAttyEmail: '' })), 'Rex', '⚠ the trustee greeted when it goes to the trustee');
    eq(g._pkgGreeting(TRUST({ probateAttyEmail: '', executorFname: 'Rexford' })), 'Rexford', 'by the first name recorded');
    eq(g._pkgGreeting(TRUST({ probateAttyEmail: '', executor: '' })), 'Trustee', 'a trustee with no name recorded: Trustee');
    eq(g._pkgGreeting(PROBATE({ probateAttyEmail: '' })), 'Ann', 'the probate route greets the attorney whatever else is recorded');
  });

  G('A · refused by name on the trust route, everything missing at once', () => {
    const g = lift(['probatePackageBlocker'], [], { SHEETS_SYNC_URL: SYNC });
    eq(g.probatePackageBlocker(TRUST()), '', 'everything there: no refusal');
    eq(g.probatePackageBlocker(TRUST({ probateAttyEmail: '' })), '', '⚠ the trustee\'s email is enough on the trust route');
    eq(g.probatePackageBlocker(TRUST({ probateAttyEmail: '', executorEmail: '', driveFolder: '' })),
       'The trust package cannot be sent yet: it needs the trustee’s attorney’s email (Edit Client, under Estate Attorney) or the trustee’s own '
       + '(Edit Client, under Authorized Representative) and the client’s Drive folder (Create Drive folder, on this dashboard).',
       '⚠⚠ no email for either: both named, with where each is entered, and the folder');
    g.SHEETS_SYNC_URL = '';
    eq(g.probatePackageBlocker(TRUST({ probateAttyEmail: ' ', executorEmail: '', driveFolder: '' })),
       'The trust package cannot be sent yet: it needs the trustee’s attorney’s email (Edit Client, under Estate Attorney) or the trustee’s own '
       + '(Edit Client, under Authorized Representative), the client’s Drive folder (Create Drive folder, on this dashboard) and the Apps Script URL in Settings.',
       'everything missing, at once');
    eq(g.probatePackageBlocker(TRUST({ probateAttyEmail: '' })), 'The trust package cannot be sent yet: it needs the Apps Script URL in Settings.',
       'the trustee there, the URL not: the URL alone');
    g.SHEETS_SYNC_URL = SYNC;
    // The probate route's rule is unchanged: the attorney, never the PR.
    eq(g.probatePackageBlocker(PROBATE({ probateAttyEmail: '' })), 'The probate package cannot be sent yet: it needs the estate attorney’s email (Edit Client, under Estate Attorney).',
       '⚠ probate with a PR\'s email but no attorney\'s: still refused, as before');
    const off = 'The inventory package goes from the Probate card, on an estate administered through probate, or the Trust card, on one a successor trustee administers, and this job is neither.';
    eq(g.probatePackageBlocker(TRUST({ matterType: 'neither' })), off, '⚠ Neither: refused, naming both cards');
    eq(g.probatePackageBlocker(TRUST({ matterType: '' })), off, 'an unanswered Estate Settlement: the same');
    eq(g.probatePackageBlocker(TRUST({ svc: 'downsizing', matterType: '' })), off, 'a living client: the same');
  });

  G('A · what the trust package carries: the Trust Schedule, the tier\'s document, the worklist — never the Court Inventory', () => {
    // RESTATED 2026-10-03 (P19): the package carries the Disposition Ledger too, on both routes and at every tier, before the
    // Appraisal Worklist (probatePackageDocs; p19-ledger.test.js). Everything else here is as it was.
    const g = lift(['probatePackageDocs'], [], { jobs: [], estimateStore: {} });
    eq(g.probatePackageDocs(TRUST()), ['trustee', 'schedule', 'ledger', 'worklist'], 'valued: the Trust Schedule, the Estate Inventory Report, the Disposition Ledger, the Appraisal Worklist');
    eq(g.probatePackageDocs(TRUST({ docTier: 'appraisals' })), ['trustee', 'schedule', 'ledger', 'worklist'], 'with appraisals: the same four');
    eq(g.probatePackageDocs(TRUST({ docTier: 'contents' })), ['contents', 'ledger', 'worklist'], 'a contents engagement: no valued schedule, the Contents List');
    eq(g.probatePackageDocs(TRUST({ docTier: 'none' })), ['ledger', 'worklist'], 'tier none: the ledger and the worklist');
    eq(g.probatePackageDocs(TRUST({ svc: 'probate' })), ['trustee', 'schedule', 'ledger', 'worklist'], '⚠ a Probate service recorded as a trust matter: still no Court Inventory');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('A · the send to the trustee\'s attorney: one Gmail draft, the Trust Schedule attached, no court anywhere', () => {
    const r = pkgRig();
    ok(r.c.sendProbatePackage(7) === true, 'it starts');
    eq(r.N.log.drafts.length, 1, '⚠⚠ one Gmail draft');
    const mime = r.N.log.drafts[0] || '';
    eq(headerOf(mime, 'To'), 'ann@lowe.law', 'to the trustee\'s attorney');
    eq(headerOf(mime, 'Cc'), 'rex@hale.example, ' + AGREEMENTS, 'the trustee and agreements@ copied');
    eq(decodeHeader(headerOf(mime, 'Subject')), 'Havellin Palm Beach — Inventory Package for 69 Beach Blvd', 'the subject, the probate route\'s: it names no court');
    const p = mimeParts(mime);
    // RESTATED 2026-10-03 (P19): the package carries the Disposition Ledger too, on both routes and at every tier, before the
    // Appraisal Worklist (probatePackageDocs; p19-ledger.test.js). Everything else here is as it was.
    eq(p.pdfs.map((x) => x.name.replace(/ - 69 Beach Blvd - .*$/, '')), ['Havellin Trust Schedule', 'Havellin Estate Inventory', 'Havellin Disposition Ledger', 'Havellin Appraisal Worklist'],
       '⚠⚠ the Trust Schedule, the Estate Inventory Report, the Disposition Ledger and the Appraisal Worklist attached');
    const led = (r.N.log.uploads.filter((u) => /Disposition Ledger/.test(u.filename))[0] || {}).html || '';
    has(text(led), 'proceeds net to the trust', 'P19: the ledger the trust package carries says the proceeds are the trust\'s');
    ok(!r.N.log.uploads.some((u) => /Court Inventory/.test(u.filename)) && !r.N.log.pdfs.some((h) => /Estate Inventory — Tangible Personal Property/.test(h)),
       '⚠⚠ and no Court Inventory: not attached, not filed, not built');
    // The attached Trust Schedule is the desk's own page, with its gaps.
    const ts = (r.N.log.uploads.filter((u) => /Trust Schedule/.test(u.filename))[0] || {}).html || '';
    has(ts, 'Schedule of Tangible Personal Property Held in Trust', 'the Trust Schedule is the printer\'s own page');
    // ⚠ P18 lead: the job still carries the case number an earlier answer recorded, and _invDocHead printed it on every
    // desk document; no page this package files or attaches may name a probate case (it asks jobOnProbateTrack now).
    ok(r.N.log.uploads.length > 0 && r.N.log.pdfs.length > 0
       && !r.N.log.uploads.some((u) => /2026-CP-001234/.test(u.html || '')) && !r.N.log.pdfs.some((h) => /2026-CP-001234/.test(h)),
       '⚠⚠ no page filed or attached prints the old probate case number');
    has(ts, 'DRAFT', 'with a line still to value it goes as a DRAFT');
    has(text(ts), 'It is not itself one', 'saying on its face that it supports the trustee\'s accounting and is not one');
    // The words, line by line.
    eq(p.text.split('\n'), [
      'Dear Ann,',
      '',
      'Attached are Havellin’s inventory documents for the Walter Ellsworth trust administration, 69 Beach Blvd, Palm Beach, as they stand on October 2, 2026:',
      '  - Trust Schedule',
      '  - Estate Inventory Report',
      '  - Disposition Ledger',
      '  - Appraisal Worklist',
      '',
      'In the trust’s Google Drive folder:',
      '  - Appraisal report or offer — Christies appraisal.pdf: https://drive.google.com/file/d/APPR1/view',
      '  - As-Found Record photographs: https://drive.google.com/drive/folders/AF7',
      '  - Estate Inventory photographs: https://drive.google.com/drive/folders/INV7',
      '  - Release approvals and chain of custody: https://drive.google.com/file/d/up1/view',
      '',
      'If you need anything further for the administration of the trust, reply here and we will send it.',
    ], '⚠⚠ the email, line by line: the trust administration, the trust’s folder, the administration of the trust');
    has(p.html, 'margin-top:4px;">Walter Ellsworth trust administration</div>', 'the HTML names the trust administration under the street');
    has(p.html, 'In the trust&rsquo;s Google Drive folder', 'the folder');
    has(p.html, 'If you need anything further for the administration of the trust, reply here and we will send it.', 'and the closing');
    // ⚠⚠ No court, no filing, no case number — in either part, though the record still carries a case number.
    [p.text, text(p.html)].forEach((part, i) => {
      const which = i ? 'HTML' : 'text';
      ['2026-CP-001234', 'Case ', 'Estate of', 'filing'].forEach((w) => lacks(part, w, '⚠ the ' + which + ' part never says "' + w + '"'));
      ok(!/court|probate|§/i.test(part), '⚠ the ' + which + ' part names no court, no probate and no statute');
    });
    // Shared with the recipient, filed, recorded.
    eq(r.N.log.shares, [{ folderId: 'AF7', email: 'ann@lowe.law' }, { folderId: 'INV7', email: 'ann@lowe.law' }], 'both photograph folders shared with the attorney');
    eq(r.N.log.uploads.map((u) => [u.folderId, u.filename]), [
      ['INV7', 'HVL-0007 - Havellin Release Approvals and Chain of Custody.html'], ['INV7', 'HVL-0007 - Havellin Trust Schedule.html'],
      ['INV7', 'HVL-0007 - Havellin Estate Inventory Report.html'], ['INV7', 'HVL-0007 - Havellin Disposition Ledger.html'],
      ['INV7', 'HVL-0007 - Havellin Appraisal Worklist.html']],
       'the record and every page filed to Estate Inventory, undated, so the next package replaces them');
    const st = (r.job().docState || {}).probatePackage || {};
    ok(!!st.draftedAt && !st.sentAt && st.provider === 'gmail', '⚠ recorded on docState.probatePackage as a draft, never a send');
    eq(JSON.parse(JSON.stringify(st.pkg || {})), { owed: ['trustee', 'schedule', 'ledger', 'worklist'], docs: ['trustee', 'schedule', 'ledger', 'worklist'], to: 'ann@lowe.law',
       cc: ['rex@hale.example', AGREEMENTS] }, 'what it carried and to whom');
    ok((r.job().at || {})['docState:probatePackage'] > 0, 'stamped on its key: a person\'s edit');
    has(r.last().m, 'Draft created in ' + BOX + ' for ann@lowe.law, copied to rex@hale.example and ' + AGREEMENTS
        + ', with the Trust Schedule, Estate Inventory Report, Disposition Ledger and Appraisal Worklist attached', 'the notice');
    eq(r.last().t, 'ok', 'all of it went');
    // The card waits on the confirming tap, which records the send.
    const card = r.c.probatePackageCardHtml(r.job());
    has(text(card), 'Trust package', 'the row keeps its label');
    has(card, 'markDocSent(7,\'probatePackage\')', 'the client documents\' own confirming tap');
    lacks(card, 'sendProbatePackage(7)', 'and no second send while the draft waits');
    r.c.markDocSent(7, 'probatePackage');
    ok(!!r.job().docState.probatePackage.sentAt, '"I\'ve sent it" records the send');
    const after = r.c.probatePackageCardHtml(r.job());
    has(text(after), 'Sent Oct 2 by Anthony Graziano, to ann@lowe.law', 'who sent it, when, and to whom');
    has(after, '&#128231; Send trust package', 'and a fresh trust package can go');
  });

  G('A · with no attorney recorded the package goes to the trustee', () => {
    const r = pkgRig({ job: TRUST({ probateAttyEmail: '' }) });
    has(text(r.c.probatePackageCardHtml(r.job())), 'to the trustee, rex@hale.example.', 'the card says so before it goes');
    ok(r.c.sendProbatePackage(7) === true, 'it starts');
    const mime = r.N.log.drafts[0] || '';
    eq([headerOf(mime, 'To'), headerOf(mime, 'Cc')], ['rex@hale.example', AGREEMENTS], '⚠⚠ to the trustee, agreements@ alone copied');
    const p = mimeParts(mime);
    eq(p.text.split('\n')[0], 'Dear Rex,', '⚠ the trustee greeted');
    has(p.html, '<p style="font-size:15px;line-height:1.65;color:#2e2e33;margin:0 0 14px;">Dear Rex,</p>', 'in both parts');
    eq(p.pdfs.map((x) => x.name.replace(/ - 69 Beach Blvd - .*$/, '')), ['Havellin Trust Schedule', 'Havellin Estate Inventory', 'Havellin Disposition Ledger', 'Havellin Appraisal Worklist'],
       'the same four documents');
    eq(r.N.log.shares, [{ folderId: 'AF7', email: 'rex@hale.example' }, { folderId: 'INV7', email: 'rex@hale.example' }], '⚠ the folders shared with the trustee');
    eq(JSON.parse(JSON.stringify(r.job().docState.probatePackage.pkg)).to, 'rex@hale.example', 'recorded as sent to the trustee');
    eq(JSON.parse(JSON.stringify(r.job().docState.probatePackage.pkg)).cc, [AGREEMENTS], 'copied to agreements@');
    has(r.last().m, 'for rex@hale.example, copied to ' + AGREEMENTS + ', with the Trust Schedule', 'the notice');
    has(text(r.c.probatePackageCardHtml(r.job())), 'to rex@hale.example', 'the waiting draft names the trustee');
  });

  G('A · the trust route\'s scope lines and its plain-email fallback', () => {
    const contents = pkgRig({ job: TRUST({ probateAttyEmail: '', docTier: 'contents' }) });
    contents.c.sendProbatePackage(7);
    const cp = mimeParts(contents.N.log.drafts[0] || '');
    eq(cp.pdfs.map((x) => x.name.replace(/ - 69 Beach Blvd - .*$/, '')), ['Havellin Contents List', 'Havellin Disposition Ledger', 'Havellin Appraisal Worklist'], 'a contents engagement: the Contents List (and, since P19, the ledger)');
    has(cp.text, '\nValuing the property is not part of Havellin’s engagement on this trust administration, so the Contents List is attached in place of a valued schedule.\n',
        '⚠ the one absence stated, for a trust administration');
    const none = pkgRig({ job: TRUST({ docTier: 'none' }) });
    none.c.sendProbatePackage(7);
    const np = mimeParts(none.N.log.drafts[0] || '');
    eq(np.pdfs.map((x) => x.name.replace(/ - 69 Beach Blvd - .*$/, '')), ['Havellin Disposition Ledger', 'Havellin Appraisal Worklist'], 'tier none: the ledger and the worklist (P19)');
    has(np.text, '\nOn this trust administration the schedule of the trust’s property is prepared by the trustee or their counsel; Havellin’s records of the property are below.\n',
        '⚠ and whose the schedule is, in the agreement\'s own words — never "the filing"');
    lacks(np.text, 'your office', 'nor "your office", which a trustee does not have');
    // Gmail fails: a plain email, to the same people, with every document linked from Drive.
    const fb = pkgRig({ job: TRUST({ probateAttyEmail: '' }), net: { gmailFail: true } });
    fb.c.sendProbatePackage(7);
    eq(fb.hrefs.length, 1, 'a failed Gmail draft falls back to a plain email');
    const href = decodeURIComponent(fb.hrefs[0] || '');
    has(href, 'mailto:rex@hale.example?cc=' + AGREEMENTS + '&subject=', '⚠ to the trustee, agreements@ copied');
    has(href, 'Dear Rex,', 'greeting the trustee');
    has(href, 'Havellin’s inventory records for the Walter Ellsworth trust administration, 69 Beach Blvd, Palm Beach, as they stand on October 2, 2026, are in the trust’s Google Drive folder:',
        '⚠ it can carry no PDF, so the documents are linked from the trust’s folder');
    has(href, '  - Trust Schedule: https://drive.google.com/file/d/up2/view', 'the filed Trust Schedule, linked');
    lacks(href, 'Court Inventory', 'and no Court Inventory');
    const st = fb.job().docState.probatePackage || {};
    ok(st.provider === 'mailto' && !!st.draftedAt && !st.sentAt, 'recorded as an email opened, never as sent');
    has(text(fb.c.probatePackageCardHtml(fb.job())), 'Opened as a plain email — send it from your mail app, then confirm', 'the card says what the app did');
  });

  G('A · a stale trust draft is named for the Trust card; a matter that moved names its own card, or none', () => {
    const r = pkgRig();
    r.c.sendProbatePackage(7);
    const job = r.job();
    job.docState.probatePackage.draftedAt = new Date(NOW - 3600000).toISOString();
    r.c._photoRefs[7][1].fmv = 900; r.c._photoRefs[7][1].updatedAt = Date.parse(job.docState.probatePackage.draftedAt) + 60000;
    ok(r.c.draftIsStale(job, job.docState.probatePackage), '⚠ a line valued after the draft makes the trust package stale, as the probate one');
    has(text(r.c.probatePackageCardHtml(job)), 'was made before the inventory changed', 'the card names it');
    has(r.c.probatePackageCardHtml(job), '&#128231; Send trust package', 'and Send comes back');
    r.c.markDocSent(7, 'probatePackage');
    ok(!job.docState.probatePackage.sentAt, '⚠ the tap is refused at the handler');
    has(r.last().m, 'There is no draft of the trust package waiting to be confirmed.', '⚠⚠ naming the trust package');
    has(r.last().m, 'Send a fresh one from the Trust card.', 'and the Trust card');
    lacks(r.last().m, 'probate', 'never the probate package');
    // The matter moves to a pour-over will after the draft: it now owes the Court Inventory, and the card is the Probate card.
    const both = pkgRig(); both.c.sendProbatePackage(7);
    both.job().matterType = 'both';
    ok(both.c.draftIsStale(both.job(), both.job().docState.probatePackage), 'the matter now owes the Court Inventory too: stale');
    both.c.markDocSent(7, 'probatePackage');
    has(both.last().m, 'There is no draft of the probate package waiting to be confirmed.', 'named by the route it is on now');
    has(both.last().m, 'Send a fresh one from the Probate card.', 'and the card that now carries it');
    // The matter moves to Neither: no card, so none is named.
    const gone = pkgRig(); gone.c.sendProbatePackage(7);
    gone.job().matterType = 'neither';
    eq(gone.c.probatePackageCardHtml(gone.job()), '', 'the row is gone with the card');
    gone.c.markDocSent(7, 'probatePackage');
    has(gone.last().m, 'There is no draft of the inventory package waiting to be confirmed.', '⚠ the tap is refused, naming no route');
    lacks(gone.last().m, 'Send a fresh one', 'and pointing at no card, since there is none');
    ok(!gone.job().docState.probatePackage.sentAt, 'nothing recorded');
  });

  G('A · the send\'s own notices name the trust package: an inventory not read, and a send that never answers', () => {
    // The inventory cannot be read from the sheet: nothing goes, and the notice names the trust card's button.
    const off = pkgRig({ media: false });
    eq(off.c.sendProbatePackage(7), true, 'fixture: started');
    has(off.last().m, 'The inventory could not be read from the sheet, so the package would go out without it. Check the connection, then press Send trust package again.',
        '⚠ an unread inventory is not sent as an empty one, and the notice names the trust card\'s send');
    eq(off.N.log.drafts.length + off.N.log.uploads.length, 0, 'nothing filed, no draft');
    // Held at Google's sign-in, the watchdog fires: the notice names the trust package.
    const timers = [];
    const held = pkgRig({ stubs: { gmailAuth() {}, setTimeout: (f) => { timers.push(f); return timers.length; } } });
    held.c.sendProbatePackage(7);
    eq(held.N.log.drafts.length, 0, 'fixture: the send is waiting on Google sign-in');
    ok(timers.length >= 1, 'fixture: the watchdog is armed');
    timers.forEach((f) => f());
    has(held.last().m, 'The trust package took too long to build. A draft may already have been created — check your Gmail drafts before pressing Send again.',
        '⚠ the watchdog names the trust package');
    ok(!held.c._docBusy, 'and releases the one-at-a-time hold');
  });

  G('A · Neither and a living client: the handler refuses, and asks nobody anything', () => {
    [['Neither', TRUST({ matterType: 'neither' })], ['a living client', TRUST({ svc: 'downsizing', matterType: '' })],
     ['an unanswered Estate Settlement', TRUST({ matterType: '' })]].forEach(([what, job]) => {
      const r = pkgRig({ job });
      eq(r.c.sendProbatePackage(7), false, '⚠ ' + what + ': refused');
      has(r.last().m, 'The inventory package goes from the Probate card', what + ': saying why');
      eq(r.N.log.posts.length + r.N.log.drafts.length + r.N.log.gets.length, 0, what + ': and nothing is asked of anyone');
      ok(!(r.job().docState || {}).probatePackage, what + ': and nothing recorded');
    });
  });

  G('A · what was typed on the Trust card is text', () => {
    const html = cardAt(renderDash(TRUST({ probateAttyName: 'Ann <i>Lowe</i>', probateAttyEmail: 'a<b>@l.law', executor: 'Rex <b>Hale</b>',
      executorRole: 'Successor <s>Trustee</s>' })), 'Trust Information');
    ok(html.length > 500, 'fixture: the Trust card rendered');
    ['Ann &lt;i&gt;Lowe&lt;/i&gt;', 'a&lt;b&gt;@l.law', 'Rex &lt;b&gt;Hale&lt;/b&gt;', 'Successor &lt;s&gt;Trustee&lt;/s&gt;'].forEach((t) => has(html, t, 'escaped: ' + t));
    ['<i>Lowe', 'a<b>@', '<b>Hale', '<s>Trustee'].forEach((raw) => lacks(html, raw, 'never markup: ' + raw));
  });

  // ═══════════════════════════════════════════════════════════════════════
  // P18 lead, found by W-A: _invDocHead headed every desk document with any recorded case number, whatever the matter.
  G('lead · a desk document names a probate case only where the estate goes through probate', () => {
    const X = lift(['_invDocHead'], [], { Date: FixedDate(NOW) });
    const head = (j) => { try { return X._invDocHead(j, 'Estate Inventory Report'); } catch (e) { return 'threw: ' + e.message; } };
    lacks(head(TRUST()), 'Case 2026-CP-001234', '⚠⚠ a trust matter still carrying an old case number prints none');
    lacks(head(TRUST({ matterType: 'neither' })), 'Case 2026-CP-001234', 'nor does a Neither matter');
    has(head(PROBATE()), 'Case 2026-CP-001234', 'a probate matter prints its case');
    has(head(TRUST({ matterType: 'both' })), 'Case 2026-CP-001234', 'and so does a pour-over (Both), which goes through probate');
  });

  G('A · the four documents describe the trust route', () => {
    const root = path.join(__dirname, '..');
    ['MANUAL.md', 'manual.html', 'CONCIERGE_GUIDE.md', 'concierge-guide.html'].forEach((f) => {
      const d = fs.readFileSync(path.join(root, f), 'utf8');
      ok(d.split('\n').some((l) => l.indexOf('Send trust package') >= 0 && l.indexOf('2026-10-02 (P18)') >= 0),
         f + ' names the Trust card\'s send, and dates it, in one passage');
      has(d, 'Trust Information', f + ' names the card');
      // ⚠ The sentence that said a trust has no package is gone (a behaviour change updates every sentence that said
      // it could not be done).
      lacks(d, '(a trust, or neither) has no Probate card and no package', f + ' no longer says a trust has no package');
    });
    // The playbook's Court Inventory stop says what a trust family is handed: the Trust Schedule and, since P18, the trust
    // package that carries it. (The revert sweep found this sentence unguarded: the symptom table names both strings too.)
    const norm = (s) => s.replace(/<[^>]+>/g, '').replace(/\*\*|\*|`/g, '').replace(/&amp;/g, '&').replace(/&rsquo;|’/g, '\'')
      .replace(/&#128231;/g, '📧').replace(/&mdash;/g, '—');
    ['CONCIERGE_GUIDE.md', 'concierge-guide.html'].forEach((f) => {
      has(norm(fs.readFileSync(path.join(root, f), 'utf8')), 'it is what you hand a trust family: Trust Schedule, under More on the Job Admin & Inv tab; '
        + 'since 2026-10-02 (P18) 📧 Send trust package, on the Trust Information card, sends it with the rest of the inventory to the trustee\'s attorney, '
        + 'or to the trustee (below).', f + ': the Court Inventory stop points a trust family at the trust package');
    });
    // The manual's table says whom the trust package goes to, in both copies.
    ['MANUAL.md', 'manual.html'].forEach((f) => {
      const d = fs.readFileSync(path.join(root, f), 'utf8').replace(/&rsquo;/g, '’').replace(/<[^>]+>|\*\*|\*|`/g, '');
      has(d, 'Trust package: the trustee’s attorney (the same field), copying the trustee and agreements@; with no attorney’s email recorded, the trustee',
          f + ': to the trustee’s attorney, else the trustee');
      has(d, 'If you need anything further for the administration of the trust, reply here and we will send it.', f + ': the trust package’s words');
    });
  });
};
