'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// THE ESTATE'S RELEASE APPROVAL REQUEST THROUGH DOCUSIGN (2026-10-26c; Anthony: "definitely docusign"; a representative
// with no email: "Refuse, name them").
//   · Every fiduciary on one envelope at once, each with their own initials at every initial point, signature and date
//     (ESIGN_REQUEST_ANCHOR, held equal to the server's DS_REQUEST_ANCHOR); the estate attorney and agreements@ copied.
//   · Offered on an estate only, on a deployment that has esignSendRequest, with every fiduciary's email recorded, no
//     envelope out and no Gmail draft waiting (approvalRequestEsignRefusal, asked by the card and the send).
//   · Nothing is recorded until DocuSign says every one has signed: then each fiduciary's own day on every line the request
//     carried that still waits (invApplyApproval, the press's writer, once the manifest is read), the executed copy filed to
//     Signed Records (esignArchive) and listed once per signing day. Declined or voided: nothing recorded, said in red.
//   · While it is out nothing is recorded or sent by hand past it.
// Driven through the real functions, the boundaries stubbed by name; the server half through the real .gs with
// UrlFetchApp stubbed.
// ─────────────────────────────────────────────────────────────────────────────
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { sandbox, source, fn, decl, domStub } = require('./harness');

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
  return { fns: [...fns], vars: [...vars] };
}
function lift(roots, stop, stubs) {
  const c = closure(roots, (stop || []).concat(Object.keys(stubs || {})));
  return sandbox({ fns: c.fns, vars: c.vars, stubs: stubs || {} });
}
// A call that may throw on the unfixed code: a revert must fail its assertions, not end the group.
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }
const inEastern = (body) => { const prev = process.env.TZ; process.env.TZ = 'America/New_York'; try { return body(); } finally { process.env.TZ = prev; } };

// A synchronous, already-settled promise (the runner is synchronous).
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

// An answer held back until the test releases it: each step chained on it waits, and runs in order on release.
function held() {
  const chain = [];
  const p = { __sync: true, then(f) { chain.push(f); return p; }, catch() { return p; }, finally() { return p; } };
  return { p, release(v) {
    let x = v;
    chain.forEach((f) => { if (!f) return; x = f(x); if (x && x.__sync) { let y; x.then((z) => { y = z; }); x = y; } });
  } };
}

// The fake network: the Apps Script /exec (GET loadMedia; POST uploadHtml, htmlToPdf, getSubfolders), Google's userinfo
// and the Gmail drafts endpoint. Everything posted is kept for the assertions.
const SYNC = 'https://script.google.com/macros/s/APPROVALSEND/exec';
const BOX = 'anthony@havellinpalmbeach.com';
const AGREEMENTS = 'agreements@havellinpalmbeach.com';
function net(opts) {
  const o = Object.assign({ media: null, gmailFail: false, pdfFail: false, uploadFail: false }, opts || {});
  const log = { posts: [], uploads: [], pdfs: [], drafts: [], gets: [], esign: [], status: [], archive: [] };
  let n = 0;
  const fetch = (url, init) => {
    const u = String(url);
    if (init && init.method === 'POST' && u.indexOf(SYNC) === 0) {
      const body = JSON.parse(init.body || '{}');
      log.posts.push(body.action || body.type);
      if (body.action === 'uploadHtml') {
        n++;
        log.uploads.push({ folderId: body.folderId, filename: body.filename, html: body.html });
        if (o.uploadFail) return sp(res({ ok: false, error: 'Drive refused the file' }));
        return sp(res({ ok: true, fileUrl: 'https://drive.google.com/file/d/up' + n + '/view', fileId: 'up' + n }));
      }
      if (body.action === 'getSubfolders') return sp(res({ ok: true, subfolders: null }));
      if (body.action === 'esignSendRequest') {
        log.esign.push(body);
        if (o.esignHold) return o.esignHold.p;
        return sp(res(o.esignSend || { ok: true, envelopeId: 'env-r1', status: 'sent',
          signers: (body.signers || []).map((s, i) => ({ name: s.name, email: s.email, recipientId: String(i + 1), n: i + 1 })) }));
      }
      if (body.action === 'esignStatus') {
        log.status.push(body);
        return sp(res(typeof o.esignStatus === 'function' ? o.esignStatus(body) : (o.esignStatus || { ok: true, envelopeId: body.envelopeId, status: 'sent', signers: [] })));
      }
      if (body.action === 'esignArchive') {
        log.archive.push(body);
        return sp(res(o.esignArchive || { ok: true, signedUrl: 'https://drive.google.com/file/d/signed1/view', signedId: 'signed1', certUrl: 'https://drive.google.com/file/d/cert1/view' }));
      }
      if (body.action === 'htmlToPdf') {
        log.pdfs.push(body.html);
        if (o.pdfFail) return sp(res({ ok: false, error: 'The PDF conversion failed.' }));
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
  return { fetch, log, opts: o };
}
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
  .replace(/&mdash;/g, '—').replace(/&#10003;/g, '✓').replace(/&#128231;/g, '📧').replace(/&#9888;/g, '⚠').replace(/&#8599;/g, '↗')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

// ── Fixtures ────────────────────────────────────────────────────────────────
const NOW = Date.parse('2026-10-17T15:00:00Z');   // Oct 17, 11:00 Eastern
const T0 = Date.parse('2026-10-10T15:00:00Z');
const FixedDate = (t) => class extends Date { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } };
// A probate estate: the representative and one co-representative with emails, a second co-representative without.
const ESTATE = (o) => Object.assign({
  id: 7, hvlId: 'HVL-0007', name: 'Harold Brennan', svc: 'probate', status: 'active', won: true, approved: true,
  addr: '14 Seaspray Ave', city: 'Palm Beach', tc: 'Ashley Jerome', agrApprovedBy: 'Anthony Graziano',
  matterType: 'probate', docTier: 'values', deathDate: '2026-08-01', executorAuth: 'received',
  probateCase: '2026-CP-001234',
  executor: 'Rex Hale', executorRole: 'Personal Representative', executorEmail: 'rex@hale.example', executorPhone: '(561) 555-0101',
  coFiduciaries: [
    { id: 'c1', name: 'Dana Hale', role: 'Co-Personal Representative', email: 'dana@hale.example', phone: '' },
    { id: 'c2', name: 'Lee Hale', role: 'Co-Personal Representative', email: '', phone: '' },
  ],
  probateAttyName: 'Ann Lowe', probateAttyFirm: 'Lowe & Co', probateAttyEmail: 'ann@lowe.law', probateAttyPhone: '(561) 555-0102',
  driveFolder: 'https://drive.google.com/drive/folders/ROOT7',
  driveSubfolders: { 'Estate Inventory': 'INV7', 'As-Found Record': 'AF7', 'Signed Records': 'SR7' },
  docState: {}, at: {}, updatedAt: T0, payments: [],
}, o || {});
const LIVING = (o) => Object.assign({
  id: 7, hvlId: 'HVL-0007', name: 'Margaret Ellis', fname: 'Margaret', email: 'meg@ellis.example', svc: 'downsizing_move', status: 'active', won: true, approved: true,
  addr: '9 Dunbar Rd', city: 'Palm Beach', tc: 'Ashley Jerome', agrApprovedBy: 'Anthony Graziano', docTier: 'contents',
  driveFolder: 'https://drive.google.com/drive/folders/ROOT7', driveSubfolders: { 'Estate Inventory': 'INV7' },
  docState: {}, at: {}, updatedAt: T0, payments: [],
}, o || {});
const EST = () => ({ approved: true, estimate: { jobId: 7, svc: 'probate', havellinTotal: 24000, rooms: [{ idx: 1, name: 'Study', st: 'in', vol: 3, cplx: 3 }], vendors: [] } });
const ROW = (id, over) => Object.assign({
  stableId: id, label: 'inventory', collId: null, roomIdx: 1, status: 'uploaded', ts: T0, updatedAt: T0,
  objectName: 'Sideboard', category: 'Furniture', qty: 1, condition: 'Good', fmv: 1200, valSource: 'Comparable sales',
  driveFileId: 'f' + id, driveFileUrl: 'https://drive.google.com/file/d/f' + id + '/view',
}, over || {});
const ALL_SIGNED = 'Rex Hale; Dana Hale; Lee Hale';
// Two lines waiting on approval (a sale and a donation), one kept (never on a request), one already approved by all three.
const INVENTORY = () => [
  ROW('a', { itemNo: 1, objectName: 'Sargent portrait', category: 'Art & Décor', fmv: 48000, valSource: 'Appraisal', disposition: 'Auction', channel: 'Christie’s' }),
  ROW('b', { itemNo: 2, objectName: 'Dining chairs (8)', qty: 8, fmv: 400, disposition: 'Donate', channel: 'Habitat ReStore' }),
  ROW('c', { itemNo: 3, objectName: 'Grandfather clock', fmv: 2500, disposition: 'Keep' }),
  ROW('d', { itemNo: 4, objectName: 'Silver tea service', fmv: 1800, disposition: 'Distribute', channel: 'Dana Hale', authBy: ALL_SIGNED, approvalDate: '2026-10-12' }),
];


const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
const { matchBrace } = require('./harness');
function gsFn(name) {
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(GS);
  if (!m) throw new Error('not in .gs: ' + name);
  const start = m.index + (m[1] ? m[1].length : 0);
  return GS.slice(start, matchBrace(GS, GS.indexOf('{', re.lastIndex)) + 1);
}
function gsVar(name) {
  const m = GS.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[\\s\\S]*?;)'));
  if (!m) throw new Error('var not in .gs: ' + name);
  return m[2];
}
// The real send and status with UrlFetchApp stubbed: `answer(url, opts)` is what DocuSign says.
function gs(answer) {
  const fetches = [];
  const props = { DS_INTEGRATION_KEY: 'k', DS_USER_ID: 'u', DS_ACCOUNT_ID: 'acct-1', DS_BASE_URI: 'https://demo.docusign.net', DS_PRIVATE_KEY: 'x' };
  const g = {
    JSON, String, Array, Number, Date, Math, encodeURIComponent,
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null) }) },
    CacheService: { getScriptCache: () => ({ get: () => 'TOKEN', put() {} }) },
    UrlFetchApp: { fetch: (url, opts) => {
      fetches.push({ url, opts });
      const a = answer ? answer(url, opts) : { code: 201, body: { envelopeId: 'env-9', status: 'sent' } };
      return { getResponseCode: () => a.code, getContentText: () => JSON.stringify(a.body) };
    } },
    Logger: { log() {} },
  };
  vm.createContext(g);
  vm.runInContext([gsVar('DS_ANCHORS'), gsVar('DS_TAB_Y_OFFSET'), gsVar('DS_COSIGNER_ANCHOR'), gsFn('_dsCoSignerAnchor'),
    gsVar('DS_REQUEST_ANCHOR'), gsFn('_dsRequestAnchor'), gsVar('DS_REQUEST_INIT_Y_OFFSET'),
    gsFn('_dsProp'), gsFn('_dsMissingProps'), gsFn('_dsAccessToken'), gsFn('_dsApi'), gsFn('_dsTabs'),
    gsFn('esignSendRequestEnvelope'), gsFn('esignEnvelopeStatus')].join('\n'), g);
  g.fetches = fetches;
  return g;
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const G = (name, body) => { group(name); try { inEastern(body); } catch (e) { ok(false, name + ' — threw: ' + String(e && e.message || e).split('\n')[0]); } };

  // The whole send over the real printer, filing, PDF and Gmail code, with the boundaries stubbed by name.
  function rig(over) {
    const o = Object.assign({ job: ESTATE(), media: true, rows: INVENTORY(), net: {} }, over || {});
    const N = net(Object.assign({ media: o.media ? { 7: { items: JSON.parse(JSON.stringify(o.rows)) } } : null }, o.net));
    const notices = [], opened = [], hrefs = [], saves = [], badges = [];
    const loc = { set href(v) { hrefs.push(v); }, get href() { return ''; } };
    const dom = domStub({});
    const c = lift(['sendApprovalRequest', 'invMarkRequestSent', '_renderInvReleasesCard', 'approvalRequestDashHtml', 'markDocSent',
                    'draftOutstanding', 'draftIsStale', 'noDraftToConfirm', 'outstandingDrafts', 'staleDraftNote', 'printApprovalRequest', '_invAwaitingApproval']
                    .concat(o.roots || []),
      ['saveJobs', 'syncJobToSheets', '_docNotice', '_dashSendState', 'showSyncBadge', 'dashNotice', '_dashRedraw', 'gmailAuth',
       'savePhotoRefs', '_primeAgreementFor', '_primeEstimateFor', 'markAgreementSent', 'markEstimateSent', 'loadPhotoRefs', '_printDocument'], Object.assign({
        jobs: [o.job], estimateStore: { 7: EST() }, jobPlanStore: {}, _photoRefs: { 7: JSON.parse(JSON.stringify(o.rows)) }, changeOrders: [],
        contractors: [], vendorDirectory: [], _invPicks: {},
        SHEETS_SYNC_URL: SYNC, fetch: N.fetch, document: dom, setTimeout: () => 0, clearTimeout() {}, Date: FixedDate(NOW),
        window: { open: (u) => opened.push(u), location: loc },
        gmailAuth: (cb) => cb('tok-req'), loadPhotoRefs() {}, savePhotoRefs() {}, _printDocument() { ok(false, 'nothing printed on a send'); },
        saveJobs: () => saves.push('jobs'), syncJobToSheets: () => saves.push('sync'), _dashRedraw() {},
        _docNotice: (t, m) => notices.push({ t, m: String(m) }), dashNotice: (t, m) => notices.push({ t, m: String(m) }),
        _dashSendState() {}, showSyncBadge: (m) => badges.push(String(m)),
      }, o.stubs || {}));
    return { c, N, dom, notices, opened, hrefs, saves, badges, job: () => c.jobs[0], last: () => (notices[notices.length - 1] || {}),
             st: () => (c.jobs[0].docState || {}).approvalRequest, card: () => c._renderInvReleasesCard(c.jobs[0], c._jobInvRefs(7)) };
  }
  const ROOTS = ['discardApprovalRequestDraft', 'approvalRequestState', 'approvalRequestChanged', 'invReleaseRecipientNamed', 'deskFoldState'];
  // A rig whose confirm() answers as told, and whose clock can be moved on (a later draft is later than the send it follows).
  function rig2(over, answer) {
    const asked = [];
    // The sheet's copy is the rig's own, so an edit made here is the one the send reads back from the sheet (it reads first).
    const rows = (over && over.rows) || INVENTORY();
    const media = { 7: { items: JSON.parse(JSON.stringify(rows)) } };
    const r = rig(Object.assign({ roots: ROOTS, net: { media }, stubs: { confirm: (m) => { asked.push(String(m)); return answer !== false; } } }, over || {}));
    r.asked = asked;
    r.c._invCloudSeen = { 7: true };
    r.edit = (id, f) => [r.c._photoRefs[7], media[7].items].forEach((list) => list.filter((x) => x.stableId === id).forEach((x) => f(x, r)));
    r.at = (t) => { r.c.Date = FixedDate(t); };
    r.page = (sel) => r.c.printApprovalRequest(7, !!sel, { asHtml: true });
    r.letter = (h) => { const m = /<div class="inv-req-letter"[^>]*>([\s\S]*?)<\/div>/.exec(String(h || '')); return m ? text(m[1]).replace(/ ,/g, ',') : ''; };
    return r;
  }
  const ONE = (o) => ESTATE(Object.assign({ coFiduciaries: [] }, o || {}));
  const TWO = (o) => ESTATE(Object.assign({ executor: 'Thomas Ellison', executorEmail: 'tom@ellison.example', executorRole: 'Trustee', matterType: 'trust', svc: 'cleanout',
    coFiduciaries: [{ id: 'c1', name: 'Catherine Ellison-Reyes', role: 'Co-Trustee', email: 'cat@ellison.example', phone: '' }] }, o || {}));

  // A rig on a trust with two trustees, each with an email, the deployment answering that it has esignSendRequest.
  const DS = ['approvalEnvelopeRefresh', 'approvalEnvelopeCheckNow', 'approvalEnvelopeFile', 'approvalEnvelopeApply', 'sendApprovalRequestEsign',
    'approvalRequestEsignRefusal', 'invRecordApproval', 'invRecordRequestApproval', 'invApprovalComplete', 'deskFoldState'];
  // The tea service carries the Hales' signatures in the letter test's inventory; on the Ellison trustees' it is simply waiting.
  const ROWS = () => INVENTORY().map((x) => { if (x.stableId === 'd') { delete x.authBy; delete x.approvalDate; } return x; });
  function dsRig(over) {
    const r = rig2(Object.assign({ job: TWO(), roots: ROOTS.concat(DS), rows: ROWS() }, over || {}));
    r.c._backendActions = ['esignSendRequest'];
    r.alerts = [];
    r.c.alert = (m) => r.alerts.push(String(m));
    r.env = () => ((r.st() || {}).req || {}).envelope || null;
    r.row = (id) => r.c._photoRefs[7].find((x) => x.stableId === id) || {};
    r.bar = () => (attempt(() => r.c.deskFoldState(7, r.job(), 'releases', r.c._jobInvRefs(7), '2026-10-17')).val || { bits: [] });
    r.barLine = () => (r.bar().bits || []).map((b) => b.text).join(' · ');
    return r;
  }
  const MIN = 60000;
  // DocuSign's answer for every signer: [recipientId, status, signedAt, declinedReason].
  const STATUS = (status, rows, o) => Object.assign({ ok: true, envelopeId: 'env-r1', status, completedAt: status === 'completed' ? '2026-10-19T15:00:00Z' : '',
    signers: rows.map(([id, st, at, why]) => ({ recipientId: id, name: id === '1' ? 'Thomas Ellison' : 'Catherine Ellison-Reyes', email: '', status: st, signedAt: at || '', declinedReason: why || '' })) }, o || {});

  // ═══════════════════════════════════════════════════════════════════════
  G('A · each fiduciary\'s markers: the app and the server agree for every n, and none sits inside another or the agreement\'s', () => {
    const A = lift(['esignRequestAnchors', 'esignCoSignerAnchors'], [], {});
    const g = gs();
    for (let n = 1; n <= 12; n++) {
      const a = A.esignRequestAnchors(n);
      eq([a.init, a.sig, a.date, a.initKey, a.sigKey, a.dateKey], ['/hri' + n + '/', '/hrs' + n + '/', '/hrd' + n + '/', 'reqInit' + n, 'reqSig' + n, 'reqDate' + n], 'fiduciary ' + n + ': three markers and their keys');
      eq([a.initKey, a.sigKey, a.dateKey].map((k) => { const x = g._dsRequestAnchor(k); return x && x.anchor; }), [a.init, a.sig, a.date], '⚠⚠ fiduciary ' + n + ': the server reads each key back into the marker the app printed');
    }
    eq(sandbox({ vars: ['ESIGN_REQUEST_ANCHOR'] }).ESIGN_REQUEST_ANCHOR, g.DS_REQUEST_ANCHOR, 'the two templates are equal, key for key');
    ['', 'reqInit0', 'reqSig01', 'reqsig1', 'coSig1', 'clientSig', 'reqDate1000', null].forEach((k) => eq(g._dsRequestAnchor(k), null, 'not a request key: ' + JSON.stringify(k)));
    const all = Object.keys(g.DS_ANCHORS).map((k) => g.DS_ANCHORS[k]);
    for (let n = 1; n <= 12; n++) { const a = A.esignRequestAnchors(n), c = A.esignCoSignerAnchors(n); all.push(a.init, a.sig, a.date, c.sig, c.date); }
    const inside = [], joined = [];
    all.forEach((x) => all.forEach((y) => { if (x !== y && y.indexOf(x) >= 0) inside.push(x + ' in ' + y); }));
    all.forEach((x) => all.forEach((y) => all.forEach((z) => { if (z !== x && z !== y && (x + y).indexOf(z) >= 0) joined.push(z + ' in ' + x + y); })));
    eq(inside, [], '⚠⚠ no marker inside another (' + all.length + ' markers)');
    eq(joined, [], '⚠⚠ nor inside any two run together');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('B · the DocuSign copy: one initials box per trustee at every initial point, each trustee\'s signature and date; the paper copy unchanged', () => {
    const r = dsRig();
    const ds = r.c.printApprovalRequest(7, false, { asHtml: true, esign: true }) || {};
    const paper = r.page() || {};
    const count = (h, s) => String(h || '').split(s).length - 1;
    eq(ds.esign, true, 'built as the DocuSign copy');
    // The portrait ($48,000) and the tea service ($1,800) are initialled on their own, the chairs with their group: three points.
    eq([count(ds.html, '/hri1/'), count(ds.html, '/hri2/')], [3, 3], '⚠⚠ each trustee initials at every one of the three points');
    eq([count(ds.html, '/hrs1/'), count(ds.html, '/hrd1/'), count(ds.html, '/hrs2/'), count(ds.html, '/hrd2/')], [1, 1, 1, 1], 'and signs and dates once, on their own line');
    ok(ds.html.indexOf('/hrs1/') < ds.html.indexOf('Thomas Ellison, Trustee') && ds.html.indexOf('Thomas Ellison, Trustee') < ds.html.indexOf('/hrs2/'), 'the first trustee\'s line carries the first markers');
    eq(['/hri1/', '/hrs1/', '/hrd1/'].map((m) => count(paper.html, m)), [0, 0, 0], 'the paper copy carries none');
    has(r.letter(ds.html), 'Please initial where shown, then each of you sign and date at the foot. Nothing on this list', '⚠ the DocuSign copy does not ask for it to be returned');
    has(r.letter(paper.html), 'and return it to us.', 'the paper copy still does');
    has(text(ds.html), 'The signed copy is filed with the trust’s records', 'and its footer says where the signed copy goes');
    // Only items already gone: nothing to initial, so no initials marker (the server places the tab only where measured).
    const gone = dsRig({ rows: [ROW('g', { itemNo: 9, objectName: 'Clock', disposition: 'Sell', channel: 'Kodner Galleries', dispDate: '2026-10-02' })] });
    const gh = (gone.c.printApprovalRequest(7, false, { asHtml: true, esign: true }) || {}).html;
    eq([count(gh, '/hri1/'), count(gh, '/hrs1/')], [0, 1], 'a request of items already gone: a signature, no initials');
    const P = gone.c.esignRequestAnchorsPresent(gh, 2);
    eq(P, ['reqSig1', 'reqDate1', 'reqSig2', 'reqDate2'], 'and the measure says so');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('C · refused by name before anything is sent: a representative with no email, a living client, an older deployment, nobody recorded, an envelope or a draft out', () => {
    const three = dsRig({ job: ESTATE() });
    eq(three.c.approvalRequestEsignRefusal(three.job()), 'Not through DocuSign: Lee Hale has no email on file (Edit Client), and everyone who signs is on the one envelope. Send request emails it as a PDF to sign by hand this round.',
      '⚠⚠ Anthony\'s answer: refuse and name them (Refuse, name them)');
    eq(three.c.sendApprovalRequestEsign(7), false, 'the send refuses the same');
    eq(three.last().m, three.c.approvalRequestEsignRefusal(three.job()), 'in the same words');
    eq(three.N.log.esign.length + three.N.log.pdfs.length, 0, 'nothing built, nothing sent');
    has(text(three.card()), 'Lee Hale has no email on file', 'the card says why, beside the email route');
    lacks(three.card(), 'sendApprovalRequestEsign(', 'and offers no DocuSign send');
    has(three.card(), 'sendApprovalRequest(7)', 'the PDF by email stays');
    const liv = dsRig({ job: LIVING(), rows: INVENTORY().slice(0, 2).map((x) => Object.assign(x, { category: 'Firearms' })) });
    has(liv.c.approvalRequestEsignRefusal(liv.job()), 'on a client’s own home it goes by email', 'a client\'s own home: by email');
    lacks(liv.card(), 'sendApprovalRequestEsign(', 'never offered there');
    const old = dsRig(); old.c._backendActions = ['esignSend'];
    has(old.c.approvalRequestEsignRefusal(old.job()), 'the Apps Script deployment is older than this build', 'an older deployment: named');
    lacks(old.card(), 'sendApprovalRequestEsign(', 'and not offered');
    lacks(text(old.card()), 'older than this build', '⚠ nor said on every estate card before the redeploy: the banner says it');
    const none = dsRig({ job: ESTATE({ executor: '', coFiduciaries: [] }) });
    has(none.c.approvalRequestEsignRefusal(none.job()), 'no Personal Representative is recorded', 'nobody recorded: named by role');
    const ok2 = dsRig();
    eq(ok2.c.approvalRequestEsignRefusal(ok2.job()), '', 'two trustees, both with email: it can go');
    has(ok2.card(), '<button class="btn-bronze" onclick="sendApprovalRequestEsign(7)">&#9997;&#65039; Send through DocuSign</button>', '⚠⚠ and the card leads with it');
    has(ok2.card(), '<button class="btn-s" onclick="sendApprovalRequest(7)">&#128231; Send request</button>', 'the PDF by email beside it');
    has(text(ok2.card()), 'Goes through DocuSign to Thomas Ellison and Catherine Ellison-Reyes, each initialling and signing on screen, ann@lowe.law and agreements@havellinpalmbeach.com copied once everyone has signed; or as a PDF by email (Send request), to sign by hand.', 'saying where each goes');
    ok2.c.sendApprovalRequest(7);
    has(ok2.c.approvalRequestEsignRefusal(ok2.job()), 'A request drafted in Gmail waits', 'a Gmail draft waiting: refused');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('D · the send: both trustees on one envelope with their markers, the attorney copied, recorded as sent with its envelope; nothing by hand past it', () => {
    const r = dsRig();
    ok(r.c.sendApprovalRequestEsign(7), 'Send through DocuSign');
    const post = r.N.log.esign[0] || {};
    eq((post.signers || []).map((x) => [x.name, x.email, x.anchors]), [
      ['Thomas Ellison', 'tom@ellison.example', ['reqInit1', 'reqSig1', 'reqDate1']],
      ['Catherine Ellison-Reyes', 'cat@ellison.example', ['reqInit2', 'reqSig2', 'reqDate2']]], '⚠⚠ each trustee with the markers the page carries for them');
    eq(post.cc, ['ann@lowe.law', 'agreements@havellinpalmbeach.com'], 'the estate attorney copied, and agreements@');
    ok(String(post.pdfBase64 || '').length > 100, 'the PDF of the DocuSign copy');
    has(r.N.log.pdfs[0] || '', '/hri1/', 'built from the DocuSign copy');
    eq(r.N.log.drafts.length, 0, 'no Gmail draft');
    eq(r.N.log.posts.filter((p) => p === 'esignSendRequest').length, 1, 'posted once');
    const st = r.st() || {};
    eq([st.provider, !!st.sentAt, st.esign], ['docusign', true, undefined], 'recorded as sent, and the agreement\'s esign field untouched');
    const e = r.env() || {};
    eq([e.id, e.status, (e.signers || []).map((x) => [x.name, x.recipientId, x.n])], ['env-r1', 'sent', [['Thomas Ellison', '1', 1], ['Catherine Ellison-Reyes', '2', 2]]], 'the envelope on the request\'s own record');
    eq(st.req.stableIds, ['a', 'b', 'd'], 'the lines it carried, in the paper\'s order');
    has(r.last().m, 'Sent through DocuSign to Thomas Ellison and Catherine Ellison-Reyes (3 lines), each initialling and signing on screen; ann@lowe.law and agreements@havellinpalmbeach.com copied once everyone has signed.', 'the notice');
    const card = text(r.card());
    has(card, 'Out for signature in DocuSign since Oct 17 to Thomas Ellison and Catherine Ellison-Reyes, 3 lines', '⚠⚠ the card: out for signature');
    has(card, 'Every signature is recorded by itself once both have signed: nothing to record by hand.', 'nothing to press');
    has(r.card(), 'onclick="approvalEnvelopeCheckNow(7)"', 'Check DocuSign');
    ['sendApprovalRequest(', 'sendApprovalRequestEsign(', 'invRecordRequestApproval(', 'invMarkRequestSent('].forEach((c) => lacks(r.card(), c, '⚠ no ' + c + ' while it is out'));
    has(r.barLine(), '3 out for signature in DocuSign', 'the Releases bar says so');
    lacks(r.barLine(), 'send a request', 'and asks for no send');
    eq(r.c.invRecordRequestApproval(7), false, '⚠⚠ Record the signed request refuses');
    eq(r.c.sendApprovalRequest(7), false, 'the email route refuses');
    has(r.last().m, 'A request is out for signature in DocuSign', 'saying why');
    r.c._invPick = { a: 1 };
    eq(r.c.invRecordApproval(7), false, 'the bulk bar\'s Record approval refuses a line on the envelope');
    has(r.alerts.join(' | '), '#1 is out for signature in DocuSign', 'naming it');
    // Only what the page carries is sent: a request of lines already gone asks for signatures and no initials, so DocuSign is
    // told of no initials marker (an anchor it cannot find refuses the envelope).
    const goneRows = ROWS().map((x) => (x.disposition === 'Keep' ? x : Object.assign(x, { dispDate: '2026-10-15' })));
    const g2 = dsRig({ rows: goneRows });
    g2.c.sendApprovalRequestEsign(7);
    const gp = g2.N.log.esign[0] || {};
    lacks(g2.N.log.pdfs[0] || '', '/hri1/', 'the page of lines already gone carries no initials marker');
    eq((gp.signers || []).map((x) => x.anchors), [['reqSig1', 'reqDate1'], ['reqSig2', 'reqDate2']], '⚠⚠ so each trustee is sent with their signature and date markers alone');
    // DocuSign refuses: nothing recorded.
    const no = dsRig({ net: { esignSend: { ok: false, error: 'DocuSign refused the envelope (HTTP 400): ANCHOR_TAB_STRING_NOT_FOUND' } } });
    no.c.sendApprovalRequestEsign(7);
    has(no.last().m, 'DocuSign did not take the request — DocuSign refused the envelope (HTTP 400): ANCHOR_TAB_STRING_NOT_FOUND. Nothing went out', 'refused by DocuSign: said');
    eq(no.st() && no.st().sentAt, undefined, 'and nothing recorded');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('E · on arrival, inside DocuSign\'s floor; signed so far is said and recorded nowhere; complete records each trustee\'s own day and files the copy', () => {
    const r = dsRig();
    r.c.sendApprovalRequestEsign(7);
    r.c.approvalEnvelopeRefresh({ jobId: 7 });
    eq(r.N.log.status.length, 0, '⚠⚠ inside the floor from the send: not asked');
    r.at(NOW + 21 * MIN);
    const stamp0 = JSON.stringify(r.job().at || {});
    const upd0 = r.job().updatedAt, sync0 = r.saves.filter((x) => x === 'sync').length;
    r.N.opts.esignStatus = STATUS('sent', [['1', 'completed', '2026-10-18T14:00:00Z'], ['2', 'sent']]);
    r.c.approvalEnvelopeRefresh({ jobId: 7 });
    eq(r.N.log.status.map((b) => b.envelopeId), ['env-r1'], 'past it: asked once, for its envelope');
    eq(r.env().signedSoFar, ['Thomas Ellison'], 'who has signed so far is noted');
    eq(JSON.stringify(r.job().at || {}), stamp0, '⚠ bare: a check that recorded nothing moves no clock');
    eq([r.job().updatedAt, r.saves.filter((x) => x === 'sync').length], [upd0, sync0], '⚠⚠ nor the job\'s own clock, and nothing is synced (a device that only looked claims nothing)');
    eq(r.row('a').authBy, undefined, '⚠⚠ nothing on a line until both have signed');
    has(text(r.card()), 'signed so far by Thomas Ellison', 'the card says so');
    r.c.approvalEnvelopeRefresh({ jobId: 7 });
    eq(r.N.log.status.length, 1, 'and not asked again inside the floor');
    r.at(NOW + 45 * MIN);
    r.N.opts.esignStatus = STATUS('completed', [['1', 'completed', '2026-10-18T14:00:00Z'], ['2', 'completed', '2026-10-19T15:00:00Z']]);
    r.c.approvalEnvelopeRefresh({ jobId: 7 });
    const e = r.env();
    eq([e.status, e.signers.map((x) => x.signedOn)], ['completed', ['2026-10-18', '2026-10-19']], 'complete: each trustee\'s own local day');
    ok(!!(r.job().at || {})['docState:approvalRequest'], 'stamped: a recorded act, like the hand entry it replaces');
    eq(['a', 'b', 'd'].map((id) => [r.row(id).authBy, r.row(id).approvalDate]), [
      ['Thomas Ellison (2026-10-18); Catherine Ellison-Reyes (2026-10-19)', '2026-10-19'],
      ['Thomas Ellison (2026-10-18); Catherine Ellison-Reyes (2026-10-19)', '2026-10-19'],
      ['Thomas Ellison (2026-10-18); Catherine Ellison-Reyes (2026-10-19)', '2026-10-19']], '⚠⚠ every line it carried, each signer on their own day (the press\'s writer)');
    ok(['a', 'b', 'd'].every((id) => r.c.invApprovalComplete(r.row(id), r.job())), 'and each is approved by both');
    eq(r.row('c').authBy, undefined, 'the clock that stays is untouched');
    const arc = r.N.log.archive[0] || {};
    eq([arc.envelopeId, arc.what, /^HVL-0007 - Havellin Release Approval Request - Oct 17 2026$/.test(arc.baseName)], ['env-r1', 'release approval request', true], 'the executed copy fetched and filed, by name');
    eq(r.env().filedUrl, 'https://drive.google.com/file/d/signed1/view', 'its link recorded');
    const recs = (r.job().signedRecords || []).filter((x) => x.kind === 'approval');
    eq(recs.map((x) => [x.id, x.signedBy, x.signedOn, x.fileUrl]), [
      ['esr_env-r1_2026-10-18', 'Thomas Ellison', '2026-10-18', 'https://drive.google.com/file/d/signed1/view'],
      ['esr_env-r1_2026-10-19', 'Catherine Ellison-Reyes', '2026-10-19', 'https://drive.google.com/file/d/signed1/view']], '⚠⚠ the signed copy listed once per signing day');
    const card = text(r.card());
    has(card, 'Signed in DocuSign by Thomas Ellison (Oct 18, 2026); Catherine Ellison-Reyes (Oct 19, 2026), 3 lines · every line on it approved', 'the card');
    has(r.card(), 'href="https://drive.google.com/file/d/signed1/view"', 'with the signed copy in Drive');
    lacks(r.card(), 'invRecordRequestApproval(', 'and nothing to record by hand');
    lacks(r.barLine(), 'not filed', 'the bar owes no filing');
    // Once: running it again writes nothing more.
    const before = JSON.stringify([r.c._photoRefs[7], r.job().signedRecords]);
    const upd1 = r.job().updatedAt, sync1 = r.saves.filter((x) => x === 'sync').length;
    eq(r.c.approvalEnvelopeApply(7), 0, 'applied once');
    r.c.approvalEnvelopeFile(7, { auto: true });
    eq(JSON.stringify([r.c._photoRefs[7], r.job().signedRecords]), before, '⚠ and a second pass changes nothing');
    eq([r.job().updatedAt, r.saves.filter((x) => x === 'sync').length], [upd1, sync1], '⚠⚠ nor stamps the job and syncs it again (the desk reads every 15 s)');
    // An approval a person takes off by hand afterwards stays off: the envelope is not written over it again.
    r.edit('a', (x) => { delete x.authBy; delete x.approvalDate; });
    r.at(NOW + 46 * MIN);
    r.c._invReadAt[7] = NOW + 46 * MIN;
    r.c.approvalEnvelopeApply(7);
    eq(r.row('a').authBy, undefined, '⚠⚠ a hand correction after DocuSign is not undone by the next read');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('F · the manifest unread: complete is noted and the lines wait for the read; a filing that failed is offered again, outside the floor', () => {
    const r = dsRig({ net: { esignArchive: { ok: false, error: 'Could not retrieve the signed release approval request — HTTP 404' } } });
    r.c.sendApprovalRequestEsign(7);
    // The sheet unreachable when DocuSign answers, and the last read hours old (found on review: never written off a stale copy).
    const media = r.N.opts.media;
    r.N.opts.media = null;
    r.at(NOW + 21 * MIN);
    r.N.opts.esignStatus = STATUS('completed', [['1', 'completed', '2026-10-19T14:00:00Z'], ['2', 'completed', '2026-10-19T15:00:00Z']]);
    r.c.approvalEnvelopeRefresh({ jobId: 7 });
    eq([r.env().status, r.env().appliedAt, r.row('a').authBy], ['completed', undefined, undefined], '⚠⚠ complete, and nothing written off a copy that was not just read');
    eq(r.c.approvalEnvelopeApply(7), 0, 'not off the last read, 21 minutes old');
    has(text(r.card()), 'recorded on the lines once the inventory is read', 'the card says so');
    eq(r.c.sendApprovalRequest(7), false, '⚠⚠ no new request meanwhile: it would move the signed one aside');
    has(r.last().m, 'not yet recorded on its items: open this client on Job Admin & Inv', 'saying how to finish it');
    lacks(r.card(), 'sendApprovalRequest(', 'and the card offers no send');
    r.N.opts.media = media;
    r.c.refreshPhotoRefs(7, () => {});
    ok(r.c.approvalEnvelopeApply(7) === 3, 'the read lands: written');
    eq(r.row('a').authBy, 'Thomas Ellison; Catherine Ellison-Reyes', 'both on one day: written plainly');
    eq(r.env().filedUrl, undefined, 'fixture: the filing failed');
    has(r.card(), 'onclick="approvalEnvelopeFile(7)"', 'File signed copy offered');
    has(r.barLine(), 'signed approval not filed to Drive', 'the bar says the signed copy is not filed');
    eq(r.c.sendApprovalRequest(7), false, 'not filed yet: still no new request');
    has(r.last().m, 'not yet filed to Drive: press File signed copy', 'saying so');
    r.N.opts.esignArchive = null;
    eq(r.c.approvalEnvelopeFile(7), false, 'inside DocuSign\'s floor from the last ask: refused');
    has(r.last().m, 'allows one ask every 20 minutes', 'saying when');
    r.at(NOW + 45 * MIN);
    r.c.approvalEnvelopeFile(7);
    eq(r.env().filedUrl, 'https://drive.google.com/file/d/signed1/view', 'outside it: filed');
    eq((r.job().signedRecords || []).filter((x) => x.kind === 'approval').length, 1, 'one signing day, one listing');
    lacks(r.barLine(), 'not filed', 'and the bar no longer owes it');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('G · declined or voided: nothing recorded, said in red, the bar opens, a fresh request offered; an older deployment records nothing', () => {
    const r = dsRig();
    r.c.sendApprovalRequestEsign(7);
    r.at(NOW + 21 * MIN);
    r.N.opts.esignStatus = STATUS('declined', [['1', 'completed', '2026-10-18T14:00:00Z'], ['2', 'declined', '', 'The clock is not on it']]);
    r.c.approvalEnvelopeRefresh({ jobId: 7 });
    eq([r.env().status, r.env().declinedBy, r.env().declinedReason], ['declined', ['Catherine Ellison-Reyes'], 'The clock is not on it'], 'declined, by whom and why');
    eq(r.row('a').authBy, undefined, '⚠⚠ nothing recorded, not even the trustee who signed before');
    has(text(r.card()), 'Declined in DocuSign by Catherine Ellison-Reyes (“The clock is not on it”). Nothing was recorded: talk to them, then send a fresh request.', 'said on the card');
    has(r.card(), 'color:#A32D2D', 'in red');
    has(r.card(), 'sendApprovalRequestEsign(7)', 'a fresh request offered');
    const b = r.bar();
    eq([b.openByDefault, (b.bits || []).filter((x) => x.tone === 'red').map((x) => x.text)], [true, ['Declined in DocuSign: send a fresh request']], 'the bar opens, red');
    eq(r.c.invRecordRequestApproval(7), false, 'nothing came back to record');
    const v = dsRig();
    v.c.sendApprovalRequestEsign(7);
    v.at(NOW + 21 * MIN);
    v.N.opts.esignStatus = STATUS('voided', [['1', 'sent'], ['2', 'sent']], { voidedReason: 'Wrong client' });
    v.c.approvalEnvelopeRefresh({ jobId: 7 });
    has(text(v.card()), 'Voided in DocuSign (“Wrong client”). Nothing was recorded: send a fresh request.', 'voided: said');
    const o = dsRig();
    o.c.sendApprovalRequestEsign(7);
    o.at(NOW + 21 * MIN);
    o.N.opts.esignStatus = { ok: true, envelopeId: 'env-r1', status: 'completed', completedAt: '2026-10-19T15:00:00Z' };
    o.c.approvalEnvelopeRefresh({ jobId: 7 });
    eq([o.env().status, o.row('a').authBy], ['sent', undefined], '⚠ an older deployment that names no signers: nothing recorded');
    has(o.last().m, 'too old to say who signed when', 'and said');
    const f = dsRig();
    f.c.sendApprovalRequestEsign(7);
    f.at(NOW + 21 * MIN);
    f.N.opts.esignStatus = { ok: false, error: 'DocuSign status check failed (HTTP 401): ' };
    f.c.approvalEnvelopeRefresh({ jobId: 7 });
    has(f.last().m, 'It may already be signed; this is not a statement that it is not.', 'a failed check speaks');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('H · the server: every fiduciary at order 1 with their own tabs, the copies at order 2, no countersigner; refused without a line of their own; every signer reported', () => {
    let g = gs();
    const SEND = (o) => Object.assign({ pdfBase64: 'JVBERi0=', hvlId: 'HVL-0007', filename: 'Request.pdf', subject: 'Release Approval Request',
      signers: [{ name: 'Thomas Ellison', email: 'tom@ellison.example', anchors: ['reqInit1', 'reqSig1', 'reqDate1'] },
                { name: 'Catherine Ellison-Reyes', email: 'cat@ellison.example', anchors: ['reqInit2', 'reqSig2', 'reqDate2'] }], cc: ['ann@lowe.law'] }, o || {});
    const out = g.esignSendRequestEnvelope(SEND());
    eq([out.ok, out.envelopeId, out.signers], [true, 'env-9', [{ name: 'Thomas Ellison', email: 'tom@ellison.example', recipientId: '1', n: 1 },
      { name: 'Catherine Ellison-Reyes', email: 'cat@ellison.example', recipientId: '2', n: 2 }]], 'sent, naming who it put on and which line each signs');
    const env = JSON.parse(g.fetches[0].opts.payload);
    eq(env.recipients.signers.map((x) => [x.recipientId, x.routingOrder, x.roleName, x.tabs.signHereTabs[0].anchorString, x.tabs.dateSignedTabs[0].anchorString, x.tabs.initialHereTabs[0].anchorString]),
      [['1', '1', 'Fiduciary', '/hrs1/', '/hrd1/', '/hri1/'], ['2', '1', 'Fiduciary', '/hrs2/', '/hrd2/', '/hri2/']], '⚠⚠ both trustees at once, each with their own three tabs');
    eq(env.recipients.carbonCopies.map((x) => [x.email, x.routingOrder]), [['agreements@havellinpalmbeach.com', '2'], ['ann@lowe.law', '2']], 'agreements@ and the attorney copied once both have signed');
    ok(!env.recipients.signers.some((x) => /havellin/i.test(x.email)), 'no countersigner');
    g = gs();
    const noInit = g.esignSendRequestEnvelope(SEND({ signers: [{ name: 'Thomas Ellison', email: 'tom@ellison.example', anchors: ['reqSig1', 'reqDate1'] }] }));
    eq([noInit.ok, JSON.parse(g.fetches[0].opts.payload).recipients.signers[0].tabs.initialHereTabs], [true, undefined], 'no initials marker measured: no initials tab (a request of items already gone)');
    g = gs();
    eq(g.esignSendRequestEnvelope(SEND({ signers: [{ name: 'Thomas Ellison', email: '', anchors: ['reqSig1', 'reqDate1'] }] })).error, 'The envelope was not created: Thomas Ellison needs a name and an email.', 'no email: refused');
    eq(g.esignSendRequestEnvelope(SEND({ signers: [{ name: 'Thomas Ellison', email: 'a@b.c', anchors: ['reqSig1', 'reqDate2'] }] })).error, 'The envelope was not created: Thomas Ellison has no signature line of their own on the request.', 'a signature on one line and a date on another: refused');
    eq(g.esignSendRequestEnvelope(SEND({ signers: [{ name: 'A', email: 'a@b.c', anchors: ['reqSig1', 'reqDate1'] }, { name: 'B', email: 'b@b.c', anchors: ['reqSig1', 'reqDate1'] }] })).error,
      'The envelope was not created: B has no signature line of their own on the request.', 'two signers on one line: refused');
    eq(g.fetches.length, 0, 'and nothing reached DocuSign');
    g = gs(() => ({ code: 200, body: { status: 'declined', voidedReason: '', recipients: { signers: [
      { recipientId: '1', name: 'Thomas Ellison', email: 't', status: 'completed', signedDateTime: '2026-10-18T14:00:00Z' },
      { recipientId: '2', name: 'Catherine Ellison-Reyes', email: 'c', status: 'declined', declinedReason: 'No' }] } } }));
    const st = g.esignEnvelopeStatus({ envelopeId: 'env-9' });
    eq(st.signers, [{ recipientId: '1', name: 'Thomas Ellison', email: 't', status: 'completed', signedAt: '2026-10-18T14:00:00Z', declinedReason: '' },
      { recipientId: '2', name: 'Catherine Ellison-Reyes', email: 'c', status: 'declined', signedAt: '', declinedReason: 'No' }], '⚠⚠ every signer reported, with why one declined');
    // The agreement's fields read as they always did (recipient 2 is its countersigner); the request reads `signers`.
    eq([st.signerName, st.coSigners.length], ['Thomas Ellison', 0], 'the agreement\'s fields unchanged');
    has(GS, "'esignSendRequest'", 'the action is listed');
    has(GS, "if (data.action === 'esignSendRequest') { return jsonOut(esignSendRequestEnvelope(data)); }", 'and dispatched');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('K · found on review: a destination changed after it went, a signer DocuSign swapped, a send not yet answered, a failing check, a red bar with nothing left', () => {
    // A line retyped to another taker while the envelope is out: its signatures are not recorded, and the card says so.
    const r = dsRig();
    r.c.sendApprovalRequestEsign(7);
    r.at(NOW + 5 * MIN);
    r.edit('b', (x) => { x.channel = 'Salvation Army'; x.updatedAt = NOW + 5 * MIN; });
    r.at(NOW + 21 * MIN);
    r.N.opts.esignStatus = STATUS('completed', [['1', 'completed', '2026-10-18T14:00:00Z'], ['2', 'completed', '2026-10-19T15:00:00Z']]);
    r.c.approvalEnvelopeRefresh({ jobId: 7 });
    eq([r.row('a').approvalDate, r.row('b').authBy, r.row('d').approvalDate], ['2026-10-19', undefined, '2026-10-19'], '⚠⚠ the chairs, now to another charity, are not recorded; the rest are');
    eq(r.env().changed, ['b'], 'named on the record');
    has(text(r.card()), '1 line changed where it goes, who takes it or its value after the envelope went, so its signatures were not recorded: send a fresh request for it.', 'and on the card');
    // A value moved by Agent Two after it went is not a change of destination, and within Ask 5's rule (P5, 2026-10-27: past
    // $500, the appraisal threshold or a 25% rise it is; tests/approval-pinned.test.js group G) not a change at all.
    const v = dsRig();
    v.c.sendApprovalRequestEsign(7);
    v.at(NOW + 5 * MIN);
    v.edit('b', (x) => { x.fmv = 410; x.updatedAt = NOW + 5 * MIN; });
    v.at(NOW + 21 * MIN);
    v.N.opts.esignStatus = STATUS('completed', [['1', 'completed', '2026-10-18T14:00:00Z'], ['2', 'completed', '2026-10-19T15:00:00Z']]);
    v.c.approvalEnvelopeRefresh({ jobId: 7 });
    eq(v.row('b').approvalDate, '2026-10-19', 'a value changed within the rule after it went: still recorded');
    // A signer DocuSign reports under another email: nothing recorded, said in red, the paper by hand allowed.
    const m = dsRig();
    m.c.sendApprovalRequestEsign(7);
    m.at(NOW + 21 * MIN);
    const swapped = STATUS('completed', [['1', 'completed', '2026-10-18T14:00:00Z'], ['2', 'completed', '2026-10-19T15:00:00Z']]);
    swapped.signers[0].email = 'tom@ellison.example'; swapped.signers[1].email = 'someone@else.example';
    m.N.opts.esignStatus = swapped;
    m.c.approvalEnvelopeRefresh({ jobId: 7 });
    eq([m.env().mismatch, m.row('a').authBy], [[{ name: 'Catherine Ellison-Reyes', sent: 'cat@ellison.example', signed: 'someone@else.example' }], undefined], '⚠⚠ who signed is not who it was sent to: nothing recorded');
    has(text(m.card()), 'Signed in DocuSign, but Catherine Ellison-Reyes signed as someone@else.example, not cat@ellison.example: nothing was recorded.', 'said in red');
    eq(m.c.approvalRequestRecordRefusal(m.job(), m.c.approvalRequestState(m.job(), m.c._jobInvRefs(7))), '', 'the signed paper may be recorded by hand');
    // A send DocuSign has not answered yet: no second send by either route.
    const w = dsRig();
    w.c._approvalEsignOut[7] = true;
    eq(w.c.sendApprovalRequest(7), false, 'the email route refuses while DocuSign has not answered');
    has(w.last().m, 'DocuSign has not answered the last send yet', 'saying so');
    has(w.c.approvalRequestEsignRefusal(w.job()), 'DocuSign has not answered the last send yet', 'and DocuSign\'s own refusal');
    // A failing check is not asked again inside the floor, this page.
    const f = dsRig();
    f.c.sendApprovalRequestEsign(7);
    f.at(NOW + 21 * MIN);
    f.N.opts.esignStatus = { ok: false, error: 'DocuSign status check failed (HTTP 500): ' };
    f.c.approvalEnvelopeRefresh({ jobId: 7 });
    f.at(NOW + 21 * MIN + 15000);
    f.c.approvalEnvelopeRefresh({ jobId: 7 });
    eq(f.N.log.status.length, 1, '⚠ a failed ask is not repeated fifteen seconds later');
    // Declined, then every line recorded by hand: the bar stops asking for a fresh request.
    const d = dsRig();
    d.c.sendApprovalRequestEsign(7);
    d.at(NOW + 21 * MIN);
    d.N.opts.esignStatus = STATUS('declined', [['1', 'completed'], ['2', 'declined', '', 'No']]);
    d.c.approvalEnvelopeRefresh({ jobId: 7 });
    ['a', 'b', 'd'].forEach((id) => d.edit(id, (x) => { x.authBy = 'Thomas Ellison; Catherine Ellison-Reyes'; x.approvalDate = '2026-10-20'; }));
    eq((d.bar().bits || []).filter((x) => x.tone === 'red').length, 0, 'every line approved by hand since: no red bar');
    // DocuSign answers after the watchdog let go: the envelope went, so it is recorded all the same (the watchdog's notice has
    // already spoken; nothing is finished twice). A refusal after the watchdog writes nothing and says nothing.
    const lateRun = (answer) => {
      const L = dsRig();
      if (answer) L.N.opts.esignSend = answer;
      const job = L.job();
      const page = attempt(() => L.c.printApprovalRequest(7, false, { asHtml: true, esign: true })).val || {};
      const ids = (page.asked || []).concat(page.ratify || []).map((x) => String(x.stableId));
      let finished = 0;
      attempt(() => L.c.approvalRequestSendEsign(job, page, 'JVBERi0xLjQ=', '', 'https://drive.google.com/file/d/up1/view', ids,
        L.c.approvalRequestRecipients(job), () => {}, () => { finished++; }, () => true));
      return { L, finished, n: L.notices.length };
    };
    const late = lateRun(null);
    eq(late.L.N.log.esign.length, 1, 'the request was posted once');
    eq((late.L.env() || {}).id, 'env-r1', '⚠⚠ an answer after the watchdog still records the envelope');
    eq((late.L.st() || {}).sentAt ? 'sent' : 'not', 'sent', 'and records the request as sent');
    eq(late.finished, 0, 'the watchdog already finished the press: not finished twice');
    has(late.L.last().m, 'DocuSign answered late, and the request did go: Sent through DocuSign to Thomas Ellison and Catherine Ellison-Reyes', 'saying it went, late');
    eq(late.L.c._approvalEsignOut[7], undefined, 'the in-flight mark is off once DocuSign answers');
    // While DocuSign has not answered, the in-flight mark itself refuses a second send by either route.
    const h = held();
    const H = dsRig({ net: { esignHold: h } });
    H.c.sendApprovalRequestEsign(7);
    eq(H.N.log.esign.length, 1, 'the first send is posted and waits on DocuSign');
    eq(H.env(), null, 'nothing recorded yet');
    eq(H.c._approvalEsignOut[7], true, '⚠⚠ the send marks itself out until DocuSign answers');
    const nAsk = H.N.log.esign.length;
    H.c.sendApprovalRequestEsign(7);
    H.c.sendApprovalRequest(7);
    eq(H.N.log.esign.length, nAsk, '⚠ a second press posts nothing meanwhile');
    eq(H.N.log.drafts.length, 0, 'and the email route drafts nothing');
    h.release(res({ ok: true, envelopeId: 'env-r1', status: 'sent', signers: [] }));
    eq((H.env() || {}).id, 'env-r1', 'the answer lands and is recorded');
    eq(H.c._approvalEsignOut[7], undefined, 'and the mark comes off');
    const lateNo = lateRun({ ok: false, error: 'DocuSign refused the envelope' });
    eq(lateNo.L.env(), null, 'a refusal after the watchdog records no envelope');
    eq(lateNo.n, 0, 'and adds no second notice');
    eq(lateNo.L.c._approvalEsignOut[7], undefined, 'the in-flight mark is off');
  });

  G('J · the version probe records what the deployment has, and the DocuSign send is offered only on one that has it', () => {
    const answers = [{ ok: true, version: '2026-10-26c', actions: ['esignSend', 'esignSendRequest'], types: [] }, { ok: true, version: '2026-10-26b', actions: ['esignSend'], types: [] }];
    answers.forEach((a, i) => {
      const P = lift(['checkBackendVersion', 'backendHas'], ['_showBackendStaleBanner'], { SHEETS_SYNC_URL: SYNC, _showBackendStaleBanner() {},
        fetch: () => sp({ json: () => sp(a) }) });
      P.checkBackendVersion();
      eq(P.backendHas('esignSendRequest'), i === 0, (i ? 'an older deployment: not offered' : '⚠⚠ a deployment with the action: offered') + ' (' + a.version + ')');
    });
    const U = lift(['backendHas'], [], {});
    eq(U.backendHas('esignSendRequest'), false, 'before the probe answers: not offered');
  });

  G('I · one rule each, read where it is needed', () => {
    const body = (n) => codeOnly(fn(n));
    has(body('sendApprovalRequest'), 'approvalRequestEsignRefusal(', 'the send asks the refusal');
    has(body('approvalRequestCardHtml'), 'approvalRequestEsignRefusal(', 'the card asks it');
    has(body('sendApprovalRequest'), 'approvalRequestSendBlocker(', 'the send refuses past an envelope (the shared blocker)');
    has(body('approvalRequestSendBlocker'), 'approvalEnvelopeOut(', '…which asks whether one is out');
    has(body('approvalRequestEsignRefusal'), 'approvalRequestSendBlocker(', 'and DocuSign\'s own refusal asks it too');
    has(body('invRecordApproval'), 'approvalEnvelopeOut(', 'the bulk bar\'s Record approval too');
    has(body('approvalRequestRecordRefusal'), 'approvalEnvelope(', 'and Record the signed request');
    has(body('invSaveApproval'), 'invApplyApproval(', 'the press writes through the one writer');
    has(body('approvalEnvelopeApply'), 'invApplyApproval(', 'and so does DocuSign');
    has(body('_invRefreshFromCloud'), 'approvalEnvelopeApply(', 'the desk\'s read lands the signatures');
    has(body('openClientDashboard'), 'approvalEnvelopeRefresh(', 'opening a client asks DocuSign');
    has(body('_jobsLanded'), 'approvalEnvelopeRefresh(', 'and the client list landing');
  });
};
