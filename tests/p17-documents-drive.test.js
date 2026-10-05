'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P17 · DOCUMENTS AND DRIVE (2026-10-01, workstream W3). Anthony's answers 4, 9 and 11 of 2026-10-01.
//
//   4   File signed copy. The executed agreement and its certificate of completion were fetched from DocuSign once,
//       on the transition into `completed`, and nothing retried a failure: the notices said to download both by
//       hand. The Agreement signed row now offers File signed copy while either is missing from Drive, and one
//       press fetches and files both through the backend's esignArchive — which now files by name (it called
//       createFile, so a second filing added a second "… - SIGNED" beside the first: measured, two filings, four
//       files).
//   9   Change orders to Drive. The Change Orders folder was made at intake and nothing ever wrote to it. The
//       accepted copy (the printed change order with the client's typed name and the date) is filed when the client
//       accepts, recorded on the change order, and the card offers the filed copy, or File to Drive while it is not.
//   11  The probate package. 📧 Send Package sent nothing: it flipped a self-attested flag. It is one Gmail draft to
//       the estate attorney now, copying the personal representative and agreements@, carrying the Court Inventory
//       (and the Trust Schedule on a pour-over will), the tier's inventory document and the Appraisal Worklist as
//       PDFs, and linking the filed appraisal reports, both photograph folders (shared with the attorney) and a filed
//       record of the signed release approvals and the custody log; recorded like any document send.
//
// Everything is DRIVEN through the real functions: each sandbox is the root's own call graph, derived from the
// source, with only the boundaries stubbed by name — the network at `fetch` (so the real upload, PDF, sharing and
// Gmail code runs), the screen's notices, and the stores the fixture supplies. Where a test needs an answer to be
// still out, it holds it at the nearest boundary instead (uploadHtmlToDrive, Google's sign-in, _appsScriptPost), and
// the sandbox's clock is stopped (FixedDate), so nothing here reads the wall clock.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sandbox, source, fn, decl, domStub, matchBrace } = require('./harness');

const SRC = source();
const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
function gsFn(name) {
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(GS);
  if (!m) throw new Error('not in main-sync.gs: ' + name);
  const start = m.index + (m[1] ? m[1].length : 0);
  return GS.slice(start, matchBrace(GS, GS.indexOf('{', re.lastIndex)) + 1);
}
function gsVar(name) {
  const m = GS.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[\\s\\S]*?;)\\n'));
  if (!m) throw new Error('var not in main-sync.gs: ' + name);
  return m[2];
}

// The functions and top-level vars `roots` reach (the closure p16-inventory-desk.test.js uses: comments and string
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

// ── A synchronous, already-settled promise: the runner is synchronous, so every `fetch(...).then(...)` chain here
// has to run inside the call. It unwraps a returned thenable like a real promise does.
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
const res = (obj, status) => ({ ok: (status || 200) < 300, status: status || 200,
  json: () => sp(obj), text: () => sp(JSON.stringify(obj)) });

// ── The fake network: the Apps Script /exec (GET loadMedia; POST shareFolder, uploadHtml, htmlToPdf, esignArchive),
// Google's userinfo and the Gmail drafts endpoint. Everything posted is kept for the assertions.
const SYNC = 'https://script.google.com/macros/s/P17W3/exec';
const BOX = 'anthony@havellinpalmbeach.com';
function net(opts) {
  const o = Object.assign({ media: null, gmailFail: false, failShare: null, failUpload: null, failPdf: null, subfolders: null }, opts || {});
  const log = { posts: [], uploads: [], pdfs: [], shares: [], drafts: [], gets: [] };
  let n = 0;
  const fetch = (url, init) => {
    const u = String(url);
    if (init && init.method === 'POST' && u.indexOf(SYNC) === 0) {
      const body = JSON.parse(init.body || '{}');
      log.posts.push(body.action || body.type);
      if (body.action === 'shareFolder') {
        log.shares.push({ folderId: body.folderId, email: body.email });
        return sp(res(o.failShare === body.folderId ? { ok: false, error: 'Drive refused the share' } : { ok: true, url: 'https://drive.google.com/drive/folders/' + body.folderId }));
      }
      if (body.action === 'uploadHtml') {
        n++;
        log.uploads.push({ folderId: body.folderId, filename: body.filename, html: body.html });
        if (o.failUpload && o.failUpload.test(body.filename)) return sp(res({ ok: false, error: 'Drive is unavailable' }));
        return sp(res({ ok: true, fileUrl: 'https://drive.google.com/file/d/up' + n + '/view', fileId: 'up' + n }));
      }
      if (body.action === 'getSubfolders') {
        // A job folder's subfolders, as Drive lists them (o.subfolders), for a job whose record lacks one.
        return sp(res({ ok: true, subfolders: o.subfolders || null }));
      }
      if (body.action === 'htmlToPdf') {
        log.pdfs.push(body.html);
        if (o.failPdf && o.failPdf.test(body.html)) return sp(res({ ok: false, error: 'conversion failed' }));
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
  const out = { headers: mime.slice(0, mime.indexOf('\r\n\r\n')), pdfs: [], text: '', html: '' };
  parts.forEach((p) => {
    if (/Content-Type: multipart\/alternative/.test(p) && alt) {
      p.split('--' + alt).slice(1, -1).forEach((q) => {
        const body = q.slice(q.indexOf('\r\n\r\n') + 4).replace(/\r\n/g, '');
        const dec = Buffer.from(body, 'base64').toString('utf8');
        if (/text\/plain/.test(q)) out.text = dec; else if (/text\/html/.test(q)) out.html = dec;
      });
    } else if (/application\/pdf/.test(p)) {
      const name = (/filename="([^"]+)"/.exec(p) || [])[1];
      const b64 = p.slice(p.indexOf('\r\n\r\n') + 4).trim();
      out.pdfs.push({ name, b64, lines: b64.split('\r\n') });
    }
  });
  return out;
}
const decodeHeader = (h) => String(h || '').replace(/=\?UTF-8\?B\?([^?]+)\?=/g, (m, b) => Buffer.from(b, 'base64').toString('utf8'));
const headerOf = (mime, name) => ((new RegExp('^' + name + ': (.*)$', 'm')).exec(mime) || [])[1] || '';
const bareLF = (s) => (String(s).match(/(^|[^\r])\n/g) || []).length;
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&middot;/g, '·')
  .replace(/&rsquo;/g, '’').replace(/&mdash;/g, '—').replace(/&#10003;/g, '✓').replace(/\s+/g, ' ');

// ── Fixtures ────────────────────────────────────────────────────────────────
const NOW = Date.parse('2026-10-01T15:00:00Z');
const T0 = Date.parse('2026-09-28T15:00:00Z');
// The sandbox's clock, stopped at an instant: the code under test reads `new Date()` and `Date.now()` and the test
// never reads the wall clock (a date worked out on each side of midnight would disagree).
const FixedDate = (t) => class extends Date { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } };
const ESTATE = () => ({
  id: 7, hvlId: 'HVL-0007', name: 'Walter Ellsworth', svc: 'probate', status: 'active', won: true, approved: true,
  addr: '69 Beach Blvd', city: 'Palm Beach', tc: 'Ashley Jerome', agrApprovedBy: 'Anthony Graziano',
  matterType: 'probate', docTier: 'values', deathDate: '2026-08-01', probateCase: '2026-CP-001234',
  executor: 'Rex Hale', executorRole: 'Personal Representative', executorEmail: 'rex@hale.example',
  probateAttyName: 'Ann Lowe', probateAttyFirm: 'Lowe & Co', probateAttyEmail: 'ann@lowe.law',
  driveFolder: 'https://drive.google.com/drive/folders/ROOT7',
  driveSubfolders: { 'Estate Inventory': 'INV7', 'As-Found Record': 'AF7', 'Agreement': 'AGR7', 'Change Orders': 'CO7' },
  docState: {}, at: {}, updatedAt: T0, payments: [],
});
const ROW = (id, over) => Object.assign({
  stableId: id, label: 'inventory', collId: null, roomIdx: 1, status: 'uploaded', ts: T0, updatedAt: T0,
  objectName: 'Sideboard', category: 'Furniture', qty: 1, condition: 'Good', fmv: 1200, valSource: 'Comparable sales',
  driveFileId: 'f' + id, driveFileUrl: 'https://drive.google.com/file/d/f' + id + '/view',
}, over || {});
const INVENTORY = () => [
  ROW('a', { itemNo: 1, objectName: 'Sargent portrait', category: 'Art & Décor', fmv: 48000, valSource: 'Appraisal',
             disposition: 'Auction', channel: 'Christie’s', authBy: 'Rex Hale', approvalDate: '2026-09-25',
             custodyLog: [{ cid: 'c1', at: T0, action: 'Released', party: 'Christie’s', date: '2026-09-26', method: 'Courier', receipt: 'CH-0091' }] }),
  // One line with no value: every valued schedule must read as a floor, never FINAL.
  ROW('b', { itemNo: 2, objectName: 'Dining chairs (8)', qty: 8, fmv: '', valSource: '' }),
  { stableId: 'd1', label: 'appraisal', collId: '3', roomIdx: null, status: 'uploaded', ts: T0, objectName: 'Christies appraisal.pdf',
    filename: 'HVL-0007_APPRSL_Art_1.pdf', driveFileUrl: 'https://drive.google.com/file/d/APPR1/view' },
];
const EST = () => ({ approved: true, estimate: { jobId: 7, svc: 'probate', havellinTotal: 24000,
  rooms: [{ idx: 1, name: 'Study', st: 'in', vol: 3, cplx: 3 }], vendors: [] } });

module.exports = function ({ group, ok, eq, has, lacks }) {
  const G = (name, body) => { group(name); try { body(); } catch (e) { ok(false, name + ' — threw: ' + String(e && e.message || e).split('\n')[0]); } };

  // ═══════════════════════════════════════════════════════════════════════════
  // 4 · FILE SIGNED COPY
  // ═══════════════════════════════════════════════════════════════════════════
  // A Shared Drive folder, the shape drive-overwrite.test.js measures against: DriveApp's own listing comes back
  // empty there, and only the advanced service (with supportsAllDrives) finds a file by name.
  function driveFolder() {
    const files = []; let next = 1;
    const wrap = (f) => ({ getId: () => f.id, getUrl: () => 'https://drive.google.com/file/d/' + f.id + '/view', getName: () => f.name,
      getDateCreated: () => new Date(f.created), setTrashed: (t) => { f.trashed = !!t; } });
    const live = (name) => files.filter((f) => !f.trashed && (name == null || f.name === name));
    const folder = { getId: () => 'AGR7', getFilesByName: () => ({ hasNext: () => false, next: () => null }),
      createFile: (b) => { const f = { id: 'F' + next++, name: b.getName(), bytes: b._bytes, created: next, trashed: false }; files.push(f); return wrap(f); } };
    const updates = [];
    const ctx = { Logger: { log() {} }, String, encodeURIComponent, Date,
      DriveApp: { getFolderById: () => folder, getFileById: (id) => wrap(files.find((f) => f.id === id)) },
      Drive: { Files: {
        list: (args) => { const m = /title = '((?:[^'\\]|\\.)*)'/.exec(args.q || ''); return { items: (args.supportsAllDrives ? live(m ? m[1] : null) : []).map((f) => ({ id: f.id })) }; },
        update: (r, id, blob) => { const f = files.find((x) => x.id === id); f.bytes = blob._bytes; updates.push(id); return { id }; } } } };
    return { ctx, files, live, updates };
  }
  const blob = (bytes) => { let n = ''; const b = { setName(x) { n = x; return b; }, getName: () => n, getBytes: () => [1, 2, 3], _bytes: bytes }; return b; };

  G('4 · the backend: a second filing of one envelope replaces the first, by name, and keeps its id', () => {
    const d = driveFolder();
    let certOk = false, round = 0;
    Object.assign(d.ctx, { _dsFetchBlob: (p, name) => (/certificate$/.test(p) && !certOk) ? { ok: false, error: 'HTTP 404' } : { ok: true, bytes: 3, blob: blob('round' + round).setName(name) } });
    vm.createContext(d.ctx);
    vm.runInContext([gsFn('_filesNamedInFolder'), gsFn('_fileBlobByName'), gsFn('esignArchiveEnvelope')].join('\n'), d.ctx);
    round = 1;
    const first = d.ctx.esignArchiveEnvelope({ envelopeId: 'env-7', folderId: 'AGR7', baseName: 'HVL-0007 - Havellin Services Agreement' });
    ok(first.ok && !!first.signedUrl && !first.certUrl && !!first.certError, 'fixture: the first filing lands the executed agreement and reports the certificate missing');
    round = 2; certOk = true;
    const second = d.ctx.esignArchiveEnvelope({ envelopeId: 'env-7', folderId: 'AGR7', baseName: 'HVL-0007 - Havellin Services Agreement' });
    ok(second.ok && !!second.certUrl, 'the second filing brings the certificate');
    eq(d.live().map((f) => f.name).sort(), ['HVL-0007 - Havellin Services Agreement - Certificate of Completion.pdf', 'HVL-0007 - Havellin Services Agreement - SIGNED.pdf'],
       '⚠⚠ one executed agreement and one certificate in the folder — never a second "… - SIGNED" (it was two filings, four files)');
    eq(second.signedUrl, first.signedUrl, '⚠ the executed agreement kept its id: updated in place, so a link counsel holds still opens it');
    eq(d.updates, [second.signedId], 'by the advanced Drive service, on the copy already there');
    eq(d.live('HVL-0007 - Havellin Services Agreement - SIGNED.pdf')[0].bytes, 'round2', 'with the new bytes');
    // One rule for both callers.
    lacks(noComments(gsFn('esignArchiveEnvelope')), 'createFile(', 'esignArchiveEnvelope never creates a file itself');
    has(noComments(gsFn('esignArchiveEnvelope')), '_fileBlobByName(folder, signed.blob)', 'it files the executed agreement by name …');
    has(noComments(gsFn('esignArchiveEnvelope')), '_fileBlobByName(folder, cert.blob)', '… and the certificate');
    has(noComments(gsFn('uploadHtmlToDrive')), '_fileBlobByName(folder, pdfBlob)', 'through the rule uploadHtmlToDrive files every document by');
    eq((GS.match(/\.createFile\(/g) || []).length, 2, 'createFile is left in _fileBlobByName and the photo upload only (a photograph is named per shot)');
    has(gsFn('_fileBlobByName'), 'folder.createFile(blob)', 'one of them is the rule\'s own, for a name with nothing under it');
    has(gsFn('uploadFileToDrive'), 'folder.createFile(blob)', 'and the other the photo upload');
  });

  G('4 · the backend version moves, and the app asks for it, naming what an older deployment does', () => {
    const bv = (GS.match(/var BACKEND_VERSION = '([^']+)';/) || [])[1];
    // RESTATED 2026-10-03 (P19): the backend moved on to 2026-10-03 (the job's record lists merge by id), which
    // carries this pack's filing by name; the app asks for that one now, so both are at least this pack's.
    ok(bv >= '2026-10-01', 'BACKEND_VERSION is bumped with the .gs change (' + bv + ')');
    const B = sandbox({ vars: ['BACKEND_NEEDS', 'BACKEND_NEEDS_TYPES', 'BACKEND_FEATURE_COST', 'BACKEND_MIN_VERSION'] });
    ok(B.BACKEND_MIN_VERSION >= '2026-10-01', '⚠ File signed copy relies on the filing by name, so the app asks for this deployment or a later one');
    has(B.BACKEND_FEATURE_COST.version, 'File signed copy adds a second copy of the signed agreement', 'the banner names the consequence first');
    has(B.BACKEND_FEATURE_COST.version, 'on a deployment older than 2026-09-30b', 'and says which older gaps belong to which vintage');
  });

  // The rail, the strip button and the handler, through the real timeline and the real archive path.
  const SIGNED = (over) => {
    const j = ESTATE();
    j.status = 'won'; j.agrApproved = true; j.agrSent = true; j.agrSentAt = 'September 21, 2026';
    j.docState.agreement = Object.assign({ draftedAt: '2026-09-21T13:00:00.000Z', sentAt: '2026-09-21T13:00:00.000Z', provider: 'docusign',
      esign: { envelopeId: 'env-7', status: 'completed', checkedAt: '2026-09-22T16:00:00.000Z' },
      sig: { how: 'esign', signedBy: 'Rex Hale', signerEmail: 'rex@hale.example', signedOn: '2026-09-22', provider: 'docusign', envelopeId: 'env-7', recordedBy: 'DocuSign' } }, over || {});
    j.agrSigned = true; j.agrSignedAt = '2026-09-22';
    return j;
  };
  // The notice contract the dashboard keeps (_dashNoticeHtml): dashNotice holds a message, the next redraw paints it,
  // and an ordinary redraw after that paints none — a notice is shown once. So a redraw after the notice clears it.
  function signedRig(job, answer) {
    const notices = [], posts = [], saves = [];
    const screen = { pending: null, shown: null };
    const redraw = () => { screen.shown = screen.pending; screen.pending = null; };
    let clock = NOW;
    const D = class extends Date { constructor(...a) { if (a.length) super(...a); else super(clock); } static now() { return clock; } };
    const c = lift(['dashFileSignedCopy', 'esignArchiveSigned', 'esignSignedCopyGaps', 'jobTimeline', 'jobTimelineActions', 'jobTimelineNext'],
      ['saveJobs', 'syncJobToSheets', '_dashRedraw', 'dashNotice', '_docNotice', '_appsScriptPost', 'renderJobs'], {
        jobs: [job], estimateStore: { 7: EST() }, SHEETS_SYNC_URL: SYNC, Date: D,
        // Each save keeps what the device would write: the agreement's DocuSign record at that moment.
        saveJobs: () => saves.push(JSON.parse(JSON.stringify(((c.jobs[0].docState || {}).agreement || {}).esign || {}))),
        syncJobToSheets() {}, _dashRedraw: redraw, renderJobs() {},
        dashNotice: (t, m) => { notices.push({ t, m: String(m) }); screen.pending = String(m); },
        _docNotice: (t, m) => { notices.push({ t, m: String(m) }); screen.pending = String(m); redraw(); },
        _appsScriptPost: (url, body, cb) => { posts.push(body); const a = typeof answer === 'function' ? answer(body) : answer; if (a) cb(a.ok, a.d); },
      });
    return { c, notices, posts, saves, screen, tick: (ms) => { clock += ms; }, job: () => c.jobs[0] };
  }
  const rowActs = (r) => {
    const job = r.job();
    const row = r.c.jobTimeline(job, EST(), [], []).filter((x) => x.key === 'agreement_signed')[0];
    return r.c.jobTimelineActions(row, job, EST());
  };

  G('4 · the row offers File signed copy while either file is missing, and only then', () => {
    const g = lift(['esignSignedCopyGaps']);
    eq(g.esignSignedCopyGaps(SIGNED()), ['agreement', 'certificate'], 'executed in DocuSign, nothing filed: both are missing');
    eq(g.esignSignedCopyGaps(SIGNED({ esign: { envelopeId: 'env-7', filedAt: 'x', filedUrl: 'https://drive/s', certUrl: '' } })), ['certificate'],
       'the agreement filed and the certificate not: the certificate is missing');
    eq(g.esignSignedCopyGaps(SIGNED({ esign: { envelopeId: 'env-7', filedAt: 'x', filedUrl: 'https://drive/s', certUrl: 'https://drive/c' } })), [],
       'both filed: nothing');
    const wet = SIGNED(); delete wet.docState.agreement.esign; wet.docState.agreement.sig = { how: 'wet', signedBy: 'Rex Hale', signedOn: '2026-09-22' };
    eq(g.esignSignedCopyGaps(wet), [], 'a wet signature has no envelope and nothing to fetch');
    const out = SIGNED(); delete out.docState.agreement.sig; out.agrSigned = false;
    eq(g.esignSignedCopyGaps(out), [], 'an envelope still out holds nothing executed yet');

    const r = signedRig(SIGNED(), null);
    const a = rowActs(r);
    const btn = a.secondary.filter((x) => /File signed copy/.test(x.label))[0];
    ok(!!btn, '⚠⚠ the Agreement signed row offers File signed copy');
    eq(btn && btn.call, 'dashFileSignedCopy(7)', 'naming this job');
    ok(!a.primary, 'as a secondary: the row is done, so it lands in the strip under the timeline');
    const done = signedRig(SIGNED({ esign: { envelopeId: 'env-7', filedUrl: 'https://drive/s', certUrl: 'https://drive/c' } }), null);
    eq(rowActs(done).secondary.filter((x) => /File signed copy/.test(x.label)).length, 0, 'gone once both are filed');
    const w = signedRig(wet, null);
    eq(rowActs(w).secondary.filter((x) => /File signed copy/.test(x.label)).length, 0, 'never on a wet signature');
  });

  G('4 · one press fetches both and records what came back, as the arrival path does', () => {
    const r = signedRig(SIGNED(), { ok: true, d: { ok: true, signedUrl: 'https://drive.google.com/file/d/SIG/view', certUrl: 'https://drive.google.com/file/d/CERT/view' } });
    const stampBefore = r.job().at['docState:agreement'] || 0;
    r.c.dashFileSignedCopy(7);
    eq(r.posts.length, 1, 'one request');
    const p = r.posts[0] || {};
    eq([p.action, p.envelopeId, p.folderId, p.baseName], ['esignArchive', 'env-7', 'AGR7', 'HVL-0007 - Havellin Services Agreement'],
       '⚠⚠ the backend\'s existing esignArchive, for this envelope, into the Agreement folder, under the stable name');
    const es = r.job().docState.agreement.esign;
    eq([es.filedUrl, es.certUrl], ['https://drive.google.com/file/d/SIG/view', 'https://drive.google.com/file/d/CERT/view'], 'both links recorded');
    ok(!!es.filedAt, 'with when');
    ok((r.job().at['docState:agreement'] || 0) > stampBefore, 'stamped: what was filed is recorded like a hand entry, so a stale device cannot undo it');
    ok(!!es.fileAskedAt, 'the request is stamped for DocuSign\'s floor');
    has((r.notices[r.notices.length - 1] || {}).m, 'Signed agreement and certificate of completion filed to Drive', 'and it says so');
    has(r.screen.shown, 'filed to Drive', '⚠ and it is still on screen: no redraw after the notice wipes it (one did, until 2026-10-01)');
    eq(rowActs(r).secondary.filter((x) => /File signed copy/.test(x.label)).length, 0, 'the button is gone');
    r.c.dashFileSignedCopy(7);
    eq(r.posts.length, 1, 'a press with nothing left to file asks nothing');
    has((r.notices[r.notices.length - 1] || {}).m, 'both filed to Drive', 'and says why');
    // ⚠ The filing path asks the same question itself, so a caller other than the button (the arrival transition
    // included) cannot fetch a copy Drive already holds.
    r.tick(60 * 60000);
    r.c.esignArchiveSigned(7);
    eq(r.posts.length, 1, '⚠ the one filing path, called directly with nothing missing, asks DocuSign nothing');
  });

  G('4 · a certificate that does not come back: the agreement is kept, the button stays, a later press finishes it', () => {
    let answer = { ok: true, d: { ok: true, signedUrl: 'https://drive.google.com/file/d/SIG/view', certError: 'HTTP 404' } };
    const r = signedRig(SIGNED(), () => answer);
    r.c.dashFileSignedCopy(7);
    const es = r.job().docState.agreement.esign;
    eq([es.filedUrl, es.certUrl], ['https://drive.google.com/file/d/SIG/view', ''], 'the executed agreement recorded, the certificate not');
    const n = (r.notices[r.notices.length - 1] || {});
    eq(n.t, 'warn', 'said out loud');
    has(n.m, 'the certificate of completion could not be retrieved (HTTP 404)', 'naming what is missing, in the server\'s words');
    has(n.m, 'Press File signed copy on the timeline to try again', '⚠⚠ and pointing at the button, never at a download by hand');
    has(r.screen.shown, 'could not be retrieved', 'still on screen after the filing');
    lacks(n.m, 'download', 'never at a download by hand');
    ok(rowActs(r).secondary.some((x) => /File signed copy/.test(x.label)), 'the button stays while the certificate is missing');
    // Inside DocuSign's window a press is refused with the time it lifts, and asks nothing.
    r.tick(5 * 60000);
    r.c.dashFileSignedCopy(7);
    eq(r.posts.length, 1, '⚠⚠ a press inside the window asks DocuSign nothing');
    has((r.notices[r.notices.length - 1] || {}).m, 'held until', 'and names when it can ask again');
    // After it, the press finishes the job — and an answer lacking the agreement's link never clears the one recorded.
    r.tick(20 * 60000);
    answer = { ok: true, d: { ok: true, signedUrl: '', certUrl: 'https://drive.google.com/file/d/CERT/view' } };
    r.c.dashFileSignedCopy(7);
    eq(r.posts.length, 2, 'past the window the press asks again');
    const es2 = r.job().docState.agreement.esign;
    eq([es2.filedUrl, es2.certUrl], ['https://drive.google.com/file/d/SIG/view', 'https://drive.google.com/file/d/CERT/view'],
       '⚠ the certificate is recorded and the agreement\'s link is kept, never cleared by an answer that lacks it');
    // The same rule for the certificate's link: a re-filing whose certificate does not come back leaves the one already
    // filed in Drive (the backend only replaces what it fetched), so its recorded link stays.
    const r2 = signedRig(SIGNED({ esign: { envelopeId: 'env-7', filedAt: 'x', filedUrl: '', certUrl: 'https://drive.google.com/file/d/CERT0/view' } }),
      { ok: true, d: { ok: true, signedUrl: 'https://drive.google.com/file/d/SIG2/view', certError: 'HTTP 404' } });
    r2.c.dashFileSignedCopy(7);
    const es3 = r2.job().docState.agreement.esign;
    eq([es3.filedUrl, es3.certUrl], ['https://drive.google.com/file/d/SIG2/view', 'https://drive.google.com/file/d/CERT0/view'],
       '⚠ and a certificate already recorded is kept when a later answer lacks it');
  });

  G('4 · the failure notices point at the button, and a refused press names itself', () => {
    const noFolder = SIGNED(); noFolder.driveSubfolders = {}; noFolder.driveFolder = '';
    const r1 = signedRig(noFolder, null);
    r1.c.dashFileSignedCopy(7);
    eq(r1.posts.length, 0, 'no Agreement folder: DocuSign is not asked');
    const n1 = (r1.notices[r1.notices.length - 1] || {}).m || '';
    has(n1, 'create the Drive folder, then press File signed copy on the timeline', 'the notice says what to do');
    lacks(n1, 'download', 'and no longer sends anyone to download it by hand');
    ok(!r1.job().docState.agreement.esign.fileAskedAt, 'and no request is stamped against the floor');
    const r2 = signedRig(SIGNED(), { ok: true, d: { ok: false, error: 'consent_required' } });
    r2.c.dashFileSignedCopy(7);
    const n2 = (r2.notices[r2.notices.length - 1] || {}).m || '';
    has(n2, 'consent_required', 'a retrieval failure names the server\'s words');
    has(n2, 'press File signed copy on the timeline to try again, from', 'and when the button can be pressed again');
    lacks(n2, 'download', 'never a download by hand');
    ok(!r2.job().docState.agreement.esign.filedUrl, 'nothing is recorded as filed');
    // The arrival path is the same function: its notices are these.
    const arrival = noComments(fn('esignArchiveSigned'));
    lacks(arrival, 'download', '⚠ no notice in the one filing path sends anyone to download by hand');
    // A request already out is not doubled.
    const r3 = signedRig(SIGNED(), null);   // the answer never comes
    r3.c.dashFileSignedCopy(7);
    ok(r3.saves.some((s) => !!s.fileAskedAt), '⚠ the request is stamped and saved on this device before any answer, so a reload inside DocuSign\'s window cannot ask again');
    r3.c.dashFileSignedCopy(7);
    eq(r3.posts.length, 1, '⚠ a second press while the first is out sends nothing');
    has((r3.notices[r3.notices.length - 1] || {}).m, 'being fetched from DocuSign now', 'and says so');
    r3.tick(60 * 60000);
    r3.c.esignArchiveSigned(7);
    eq(r3.posts.length, 1, '⚠ and the filing path refuses it too, whoever calls it, while a request is out');
    const r4 = signedRig(SIGNED(), null);
    r4.c.SHEETS_SYNC_URL = '';
    r4.c.dashFileSignedCopy(7);
    has((r4.notices[r4.notices.length - 1] || {}).m, 'no Apps Script URL in Settings', 'no backend: named');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9 · CHANGE ORDERS TO DRIVE
  // ═══════════════════════════════════════════════════════════════════════════
  const CO = (over) => Object.assign({ id: 1759180000050, jobId: 7, description: 'Add the garage', reason: 'scope',
    tcHrs: 6, psHrs: 10, createdAt: 'September 29, 2026', clientApproved: false }, over || {});
  function coRig(cos, net0, opt) {
    const o = opt || {};
    const notices = [], badges = [], saved = [], redraws = [];
    const N = net0 || net();
    const dom = domStub({ 'coa-co-id': String(cos[0].id), 'coa-client-name': 'Rex Hale' });
    const job = Object.assign(ESTATE(), o.job || {});
    const c = lift(['acceptChangeOrder', 'fileChangeOrder', 'coCardActions', 'openChangeOrderFiled'],
      ['saveJobs', 'syncJobToSheets', 'renderJobs', '_docNotice', 'showSyncBadge', 'saveChangeOrders', '_dashRedraw', 'dashNotice', '_asBackgroundRedraw', 'closeCOAcceptModal'], Object.assign({
        jobs: [job], estimateStore: { 7: EST() }, changeOrders: cos, currentEstimate: null, SHEETS_SYNC_URL: SYNC, Date: FixedDate(NOW),
        document: dom, fetch: N.fetch, window: { open: (u) => notices.push({ t: 'open', m: u }) },
        saveJobs() {}, syncJobToSheets() {}, renderJobs() {}, closeCOAcceptModal() {}, _asBackgroundRedraw: (f) => f(),
        // Each repaint keeps what the change order's row offers at that moment.
        _dashRedraw: () => redraws.push(c.coCardActions(c.changeOrders[0]).map((a) => a.label)),
        dashNotice: (t, m) => notices.push({ t, m: String(m) }), _docNotice: (t, m) => notices.push({ t, m: String(m) }),
        showSyncBadge: (m, err) => badges.push({ m: String(m), err: !!err }), saveChangeOrders: () => saved.push(JSON.parse(JSON.stringify(c.changeOrders))),
      }, o.stubs || {}));
    return { c, notices, badges, saved, redraws, net: N, dom };
  }

  G('9 · the card: the filed copy once it is in Drive, File to Drive while it is not, nothing before acceptance', () => {
    const g = lift(['coCardActions']);
    const lab = (co) => g.coCardActions(co).map((a) => a.label + ' → ' + a.call);
    eq(lab(CO()), ['PDF → printChangeOrder(1759180000050)', 'Get Acceptance → openCOAcceptModal(1759180000050)'], 'unaccepted: the PDF and Get Acceptance, as before');
    eq(lab(CO({ clientApproved: true })), ['PDF → printChangeOrder(1759180000050)', '&#128193; File to Drive → fileChangeOrder(1759180000050)'],
       '⚠ accepted and not in Drive: File to Drive');
    eq(lab(CO({ clientApproved: true, filedAt: '2026-10-01T15:00:00.000Z', filedUrl: 'https://drive/co' })),
       ['PDF → printChangeOrder(1759180000050)', '&#128193; Filed copy → openChangeOrderFiled(1759180000050)'], 'filed: the filed copy');
  });

  G('9 · accepting files the accepted copy to the Change Orders folder, named without a date, and records it', () => {
    const r = coRig([CO()]);
    r.c.acceptChangeOrder();
    const co = r.c.changeOrders[0];
    ok(co.clientApproved === true && co.clientName === 'Rex Hale', 'fixture: the real acceptance ran');
    eq(r.net.log.uploads.length, 1, '⚠⚠ accepting files it — one upload');
    const u = r.net.log.uploads[0] || {};
    eq(u.folderId, 'CO7', 'into the client\'s Change Orders folder');
    eq(u.filename, 'HVL-0007 - Havellin Change Order CO-000050.html', 'named by docNames, with NO date — a re-file replaces it');
    has(u.html, 'Client Accepted', '⚠ the ACCEPTED copy');
    has(u.html, '<strong>Rex Hale</strong> accepted this change order on ' + co.clientAcceptedAt, 'with the typed name and the date');
    has(u.html, 'Add the garage', 'and the change itself');
    eq([co.filedUrl, co.filedId], ['https://drive.google.com/file/d/up1/view', 'up1'], 'recorded on the change order: the link and its Drive id');
    ok(!!co.filedAt, 'and when');
    eq(co.updatedAt, NOW, 'its clock is now (that the filing itself moves it is driven below, with the upload held)');
    eq(r.saved.length >= 2 && !!r.saved[r.saved.length - 1][0].filedUrl, true, 'and the store is saved with it');
    ok(r.badges.some((b) => /filed to Drive/.test(b.m) && !b.err), 'the filing reports through the sync badge, under the acceptance notice');
    has((r.notices.filter((n) => n.t !== 'open')[0] || {}).m, 'Change Order accepted by Rex Hale', 'which is still the notice that says what the acceptance moved');
    eq(r.c.coCardActions(co).map((a) => a.call), ['printChangeOrder(1759180000050)', 'openChangeOrderFiled(1759180000050)'], 'the card now offers the filed copy');
    r.c.openChangeOrderFiled(co.id);
    eq((r.notices[r.notices.length - 1] || {}).m, 'https://drive.google.com/file/d/up1/view', 'which opens the Drive copy');
    // Same page as the client prints: the filing asks the printer for its page.
    const page = r.c.printChangeOrder(co.id, { asHtml: true });
    ok(!!page && u.html.indexOf(page.html) >= 0, '⚠ the filed copy is the printed page itself, byte for byte');
  });

  G('9 · never before acceptance; a failed filing leaves File to Drive, and the press files it', () => {
    const r = coRig([CO()]);
    eq(r.c.fileChangeOrder(1759180000050), false, 'an unaccepted change order is refused at the handler');
    eq(r.net.log.uploads.length, 0, '⚠⚠ and nothing is filed');
    has((r.notices[r.notices.length - 1] || {}).m, 'once the client has accepted it', 'saying why');
    const N = net({ failUpload: /Change Order/ });
    const f = coRig([CO()], N);
    f.c.acceptChangeOrder();
    const co = f.c.changeOrders[0];
    ok(co.clientApproved && !co.filedAt && !co.filedUrl, 'the upload failed: nothing is recorded as filed');
    ok(f.badges.some((b) => b.err && /was not filed to Drive/.test(b.m) && /Press File to Drive/.test(b.m)), 'the sync badge says so and names the button');
    eq(f.c.coCardActions(co).map((a) => a.call)[1], 'fileChangeOrder(1759180000050)', 'the card offers File to Drive');
    N.log.uploads.length = 0;
    // The press, with Drive back.
    const g = coRig([JSON.parse(JSON.stringify(co))]);
    g.c.fileChangeOrder(co.id);
    eq(g.net.log.uploads.length, 1, 'the press files it');
    eq((g.net.log.uploads[0] || {}).filename, 'HVL-0007 - Havellin Change Order CO-000050.html', 'under the same name, so it would replace a copy already there');
    has((g.notices[g.notices.length - 1] || {}).m, 'filed to the client’s Change Orders folder', 'and says so on the dashboard');
    ok(!!g.c.changeOrders[0].filedUrl, 'recorded');
  });

  G('9 · while a filing is out a second press files nothing, and the row is repainted when it lands', () => {
    // The upload held at its boundary (uploadHtmlToDrive), so its answer comes when the test gives it — as Drive's does.
    const pending = [];
    const r = coRig([CO()], null, { stubs: { uploadHtmlToDrive: (folderId, name, doc, cb) => { pending.push({ folderId, name, cb }); } } });
    r.c.acceptChangeOrder();
    const id = r.c.changeOrders[0].id;
    eq(pending.length, 1, 'fixture: accepting started the filing, and its answer has not come');
    eq(r.c.fileChangeOrder(id), false, '⚠ a press while it is out is refused …');
    eq(pending.length, 1, '⚠⚠ … and files nothing a second time');
    has((r.notices[r.notices.length - 1] || {}).m, 'being filed now', 'saying so');
    eq(r.redraws.length, 0, 'fixture: nothing has repainted the card since the acceptance');
    // The accepted copy as another device last saved it: the filing must be newer than that, or the store's merge (the
    // newer updatedAt wins the whole record) would hand the record back without it.
    r.c.changeOrders[0].updatedAt = T0;
    (pending[0] || { cb() {} }).cb(true, 'https://drive.google.com/file/d/LATE/view', { fileId: 'LATE' });
    ok(r.c.changeOrders[0].updatedAt > T0, '⚠ the filing moves the change order\'s clock past the copy other devices hold');
    eq(r.redraws[r.redraws.length - 1], ['PDF', '&#128193; Filed copy'], '⚠ when it lands the dashboard is repainted, and the row offers the filed copy');
    eq(r.c.changeOrders[0].filedId, 'LATE', 'recorded from the answer');
    eq(r.c.fileChangeOrder(id), true, 'once it has landed a press may file it again (by name, so it replaces)');
    eq(pending.length, 2, 'and does');
  });

  G('9 · a job folder with no Change Orders subfolder files into the client\'s own folder', () => {
    // An older job folder: Drive lists its subfolders and none is Change Orders. The fallback docFile takes.
    const N = net({ subfolders: { Agreement: 'AGR7' } });
    const r = coRig([CO({ clientApproved: true, clientName: 'Rex Hale', clientAcceptedAt: 'September 30, 2026' })], N,
      { job: { driveSubfolders: { Agreement: 'AGR7' } } });
    r.c.fileChangeOrder(1759180000050);
    eq(N.log.uploads.map((u) => u.folderId), ['ROOT7'], '⚠ filed into the client\'s folder rather than not at all');
    ok(!!r.c.changeOrders[0].filedUrl, 'and recorded');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 11 · THE PROBATE PACKAGE
  // ═══════════════════════════════════════════════════════════════════════════
  G('11 · the MIME builder carries several PDFs, each part CRLF-wrapped, and the one-PDF form is unchanged', () => {
    const D = { now: () => 1759330800000 };
    const m = sandbox({ fns: ['buildMimeMessage', '_b64Wrap', '_mimeHeader'], stubs: { Date: D } });
    const b64 = (s) => Buffer.from(s.repeat(40)).toString('base64');
    const one = m.buildMimeMessage({ to: 'a@x', cc: 'b@x', subject: 'S', text: 't', html: '<p>h</p>', pdfBase64: b64('one'), pdfName: 'One.pdf' });
    const asList = m.buildMimeMessage({ to: 'a@x', cc: 'b@x', subject: 'S', text: 't', html: '<p>h</p>', attachments: [{ name: 'One.pdf', base64: b64('one') }] });
    eq(asList, one, 'the one-document form and a one-item list produce the same message');
    const three = m.buildMimeMessage({ to: 'a@x', subject: 'S', text: 't', html: 'h',
      attachments: [{ name: 'A.pdf', base64: b64('aa') }, { name: 'B.pdf', base64: '' }, { name: 'C.pdf', base64: b64('cc') }] });
    const p = mimeParts(three);
    eq(p.pdfs.map((x) => x.name), ['A.pdf', 'C.pdf'], '⚠ one part per PDF, and a part with no bytes is left out');
    ok(p.pdfs.every((x) => x.lines.every((l) => l.length <= 76)), 'every base64 line is at most 76 characters');
    eq(bareLF(three), 0, '⚠⚠ and every line break is CRLF — a bare LF is what dropped the attachment once');
    eq(Buffer.from(p.pdfs[1].lines.join(''), 'base64').toString(), 'cc'.repeat(40), 'each part decodes to its own bytes');
  });

  G('11 · each printer asked for its page answers with the page or its refusal, never an alert', () => {
    // The package asks each inventory printer for its page (opt.asHtml). Where the tier puts a document with counsel,
    // or there is nothing to list, the answer is the printer's own sentence, which the package's notice repeats.
    const alerts = [];
    const g = lift(['printCourtInventory', 'printTrustSchedule', 'printEstateInventoryReport', 'printContentsList', 'printAppraisalWorklist'],
      ['_printDocument', 'alert'], { jobs: [Object.assign(ESTATE(), { docTier: 'contents' })], estimateStore: { 7: EST() }, jobPlanStore: {},
        _photoRefs: { 7: [] }, document: domStub({}), alert: (m) => alerts.push(String(m)), _printDocument: () => alerts.push('printed') });
    const court = g.printCourtInventory(7, { asHtml: true }) || {};
    const trust = g.printTrustSchedule(7, { asHtml: true }) || {};
    const eir = g.printEstateInventoryReport(7, { asHtml: true }) || {};
    const cl = g.printContentsList(7, { asHtml: true }) || {};
    ok(!!court.why && !court.html, '⚠ a contents engagement: the Court Inventory answers with why it is counsel\'s');
    has(court.why, 'Contents List', 'naming what to hand over instead');
    ok(!!trust.why && !trust.html, 'the Trust Schedule the same');
    ok(!!eir.why && !eir.html, 'and the Estate Inventory Report');
    has(cl.why, 'Nothing has been photographed or listed on this job yet', 'an empty Contents List says there is nothing to list');
    eq(alerts, [], '⚠⚠ and none of them alerts or prints: the package is not interrupted by a dialog');
  });

  G('11 · what the package carries follows the matter and the tier', () => {
    const g = lift(['probatePackageDocs'], [], { jobs: [], estimateStore: {} });
    const J = (o) => Object.assign(ESTATE(), o);
    // RESTATED 2026-10-03 (P19): the package carries the Disposition Ledger too, on both routes and at every tier, before the
    // Appraisal Worklist (probatePackageDocs; p19-ledger.test.js). Everything else here is as it was.
    eq(g.probatePackageDocs(J({})), ['court', 'schedule', 'ledger', 'worklist'], 'probate, valued: the Court Inventory, the Estate Inventory Report, the Disposition Ledger, the Appraisal Worklist');
    eq(g.probatePackageDocs(J({ matterType: 'trust', svc: 'cleanout' })), ['trustee', 'schedule', 'ledger', 'worklist'], 'a trust: the Trust Schedule');
    eq(g.probatePackageDocs(J({ matterType: 'both' })), ['court', 'trustee', 'schedule', 'ledger', 'worklist'], 'a pour-over will: both instruments');
    eq(g.probatePackageDocs(J({ matterType: '' })), ['court', 'schedule', 'ledger', 'worklist'], 'an unanswered matter on a probate service: the court\'s');
    // ⚠ The court's instrument is jobOnProbateTrack's answer, the one definition: an unanswered matter claims a court
    // only on a Probate service, and a family distribution claims none.
    eq(g.probatePackageDocs(J({ matterType: '', svc: 'cleanout' })), ['schedule', 'ledger', 'worklist'], '⚠ an unanswered matter on an Estate Settlement claims no court');
    eq(g.probatePackageDocs(J({ matterType: 'neither', svc: 'cleanout' })), ['schedule', 'ledger', 'worklist'], 'neither a court nor a trust: neither instrument');
    eq(g.probatePackageDocs(J({ docTier: 'contents' })), ['contents', 'ledger', 'worklist'], '⚠ a contents engagement: no valued schedule, the Contents List instead');
    eq(g.probatePackageDocs(J({ docTier: 'none' })), ['ledger', 'worklist'], 'tier none: the inventory is counsel\'s (the ledger is our own record)');
    eq(g.probatePackageDocs(Object.assign(ESTATE(), { svc: 'downsizing' })), [], 'a living job has no package');
  });

  G('11 · refused by name when there is no estate attorney email, saying everything that is missing', () => {
    const g = lift(['probatePackageBlocker'], [], { SHEETS_SYNC_URL: SYNC });
    eq(g.probatePackageBlocker(ESTATE()), '', 'everything there: no refusal');
    // ⚠ The handler asks the card's question: the row is on the Probate card, drawn only where the estate is
    // administered through probate, so a matter with no card is refused rather than sent from elsewhere.
    // RESTATED 2026-10-02 (P18): a trust-only matter has a card of its own now, the Trust card (Anthony, answer A: "1 -
    // yes"), so the off-route refusal is held on a matter recorded Neither, which has neither card. The trust route's
    // own refusals are in p18-trust-package.test.js.
    eq(g.probatePackageBlocker(Object.assign(ESTATE(), { matterType: 'neither', svc: 'cleanout' })),
       'The inventory package goes from the Probate card, on an estate administered through probate, or the Trust card, on one a successor trustee administers, and this job is neither.',
       '⚠ off both routes: refused, saying why');
    eq(g.probatePackageBlocker(Object.assign(ESTATE(), { matterType: 'both', svc: 'cleanout' })), '', 'a pour-over will is on the probate track');
    const noAtty = Object.assign(ESTATE(), { probateAttyEmail: '  ' });
    has(g.probatePackageBlocker(noAtty), 'the estate attorney’s email (Edit Client, under Estate Attorney)', '⚠⚠ no attorney email: named, with where it is entered');
    const none = Object.assign(ESTATE(), { probateAttyEmail: '', driveFolder: '' });
    g.SHEETS_SYNC_URL = '';
    eq(g.probatePackageBlocker(none), 'The probate package cannot be sent yet: it needs the estate attorney’s email (Edit Client, under Estate Attorney), '
       + 'the client’s Drive folder (Create Drive folder, on this dashboard) and the Apps Script URL in Settings.', 'everything missing, at once');
    const r = lift(['probatePackageRecipients']);
    eq(JSON.parse(JSON.stringify(r.probatePackageRecipients(ESTATE()))), { to: 'ann@lowe.law', cc: ['rex@hale.example', 'agreements@havellinpalmbeach.com'] },
       'to the estate attorney; the personal representative and agreements@ copied');
    eq(JSON.parse(JSON.stringify(r.probatePackageRecipients(Object.assign(ESTATE(), { executorEmail: 'ANN@lowe.law' })))).cc, ['agreements@havellinpalmbeach.com'],
       'a representative who is the attorney is not copied twice');
  });

  // The whole send: the real sendProbatePackage over the real printers, sharing, filing, PDF and Gmail code, with
  // only the network (fetch), Google's sign-in, the notices and the store saves at the boundary.
  function pkgRig(over) {
    const o = Object.assign({ job: ESTATE(), media: true, rows: INVENTORY(), net: {} }, over || {});
    const job = o.job;
    const N = net(Object.assign({ media: o.media ? { 7: { items: JSON.parse(JSON.stringify(o.rows)) } } : null }, o.net));
    const notices = [], steps = [], badges = [], opened = [], hrefs = [], saves = [];
    const dom = domStub({});
    const loc = { set href(v) { hrefs.push(v); }, get href() { return ''; } };
    const c = lift(['sendProbatePackage', 'probatePackageCardHtml', 'markDocSent', 'draftOutstanding', 'draftIsStale', 'notePriceChange', 'outstandingDrafts', 'noDraftToConfirm'],
      ['saveJobs', 'syncJobToSheets', '_docNotice', '_dashSendState', 'showSyncBadge', 'dashNotice', '_dashRedraw', 'gmailAuth',
       'savePhotoRefs', '_primeAgreementFor', '_primeEstimateFor', 'markAgreementSent', 'markEstimateSent', 'loadPhotoRefs'], Object.assign({
        jobs: [job], estimateStore: { 7: EST() }, jobPlanStore: {}, _photoRefs: { 7: JSON.parse(JSON.stringify(o.rows)) }, changeOrders: [],
        SHEETS_SYNC_URL: SYNC, fetch: N.fetch, document: dom, setTimeout: () => 0, clearTimeout() {}, Date: FixedDate(NOW),
        window: { open: (u) => opened.push(u), location: loc },
        gmailAuth: (cb) => cb('tok-p17'), loadPhotoRefs() {}, savePhotoRefs() {},
        saveJobs: () => saves.push('jobs'), syncJobToSheets: () => saves.push('sync'), _dashRedraw() {},
        _docNotice: (t, m) => notices.push({ t, m: String(m) }), dashNotice: (t, m) => notices.push({ t, m: String(m) }),
        _dashSendState: (k, l) => steps.push(l), showSyncBadge: (m) => badges.push(String(m)),
      }, o.stubs || {}));
    return { c, N, notices, steps, badges, opened, hrefs, saves, job: () => c.jobs[0] };
  }

  G('11 · the send: one Gmail draft to the attorney, the representative and agreements@ copied, three PDFs attached', () => {
    const r = pkgRig();
    const started = r.c.sendProbatePackage(7);
    ok(started === true, 'it starts');
    eq(r.N.log.drafts.length, 1, '⚠⚠ one Gmail draft is made — the old button made none');
    const mime = r.N.log.drafts[0] || '';
    eq(headerOf(mime, 'To'), 'ann@lowe.law', 'to the estate attorney');
    eq(headerOf(mime, 'Cc'), 'rex@hale.example, agreements@havellinpalmbeach.com', 'copying the personal representative and agreements@');
    eq(decodeHeader(headerOf(mime, 'Subject')), 'Havellin Palm Beach — Inventory Package for 69 Beach Blvd', 'the subject');
    eq(bareLF(mime), 0, '⚠ every line break in the message is CRLF');
    const p = mimeParts(mime);
    const day = new Date(NOW).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).replace(/,/g, '');
    // RESTATED 2026-10-03 (P19): the package carries the Disposition Ledger too, on both routes and at every tier, before the
    // Appraisal Worklist (probatePackageDocs; p19-ledger.test.js). Everything else here is as it was.
    eq(p.pdfs.map((x) => x.name), ['Havellin Court Inventory - 69 Beach Blvd - ' + day + '.pdf', 'Havellin Estate Inventory - 69 Beach Blvd - ' + day + '.pdf',
      'Havellin Disposition Ledger - 69 Beach Blvd - ' + day + '.pdf',
      'Havellin Appraisal Worklist - 69 Beach Blvd - ' + day + '.pdf'], '⚠⚠ four PDFs: the Court Inventory, the Estate Inventory Report, the Disposition Ledger and the Appraisal Worklist, named as the desk names them');
    ok(p.pdfs.every((x) => x.lines.every((l) => l.length <= 76)), 'each attachment\'s base64 wrapped at 76');
    eq(p.pdfs.map((x) => /^%PDF/.test(Buffer.from(x.lines.join(''), 'base64').toString())), [true, true, true, true], 'each one the PDF the server built');
    // The body: the documents, and the links.
    has(p.text, 'Dear Ann,', 'the attorney greeted');
    has(p.text, 'Attached are Havellin’s inventory documents for the Estate of Walter Ellsworth, 69 Beach Blvd, Palm Beach', 'naming the estate');
    ['Court Inventory', 'Estate Inventory Report', 'Disposition Ledger', 'Appraisal Worklist'].forEach((t) => has(p.text, '  - ' + t, 'listing the ' + t));
    has(p.text, 'Appraisal report or offer — Christies appraisal.pdf: https://drive.google.com/file/d/APPR1/view', '⚠ the filed appraisal report, linked');
    has(p.text, 'As-Found Record photographs: https://drive.google.com/drive/folders/AF7', 'the As-Found Record folder, linked');
    has(p.text, 'Estate Inventory photographs: https://drive.google.com/drive/folders/INV7', 'the Estate Inventory folder, linked');
    const rec = r.N.log.uploads.filter((u) => /Release Approvals/.test(u.filename))[0] || {};
    ok(!!rec.filename, 'fixture: the release and custody record was filed');
    has(p.text, 'Release approvals and chain of custody: https://drive.google.com/file/d/up1/view', '⚠ and the signed release approvals and the custody log, linked to the filed record');
    has(p.html, 'href="https://drive.google.com/drive/folders/AF7"', 'the HTML part links them too');
    has(p.html, 'Inventory Package', 'in the branded email');
    lacks(p.text, 'Valuing the property is not part', 'a valued engagement states no absence');
    // Shared, filed, converted.
    eq(r.N.log.shares, [{ folderId: 'AF7', email: 'ann@lowe.law' }, { folderId: 'INV7', email: 'ann@lowe.law' }],
       '⚠⚠ both photograph folders shared with the attorney through the existing sharing action');
    eq(r.N.log.uploads.map((u) => [u.folderId, u.filename]), [
      ['INV7', 'HVL-0007 - Havellin Release Approvals and Chain of Custody.html'], ['INV7', 'HVL-0007 - Havellin Court Inventory.html'],
      ['INV7', 'HVL-0007 - Havellin Estate Inventory Report.html'], ['INV7', 'HVL-0007 - Havellin Disposition Ledger.html'],
      ['INV7', 'HVL-0007 - Havellin Appraisal Worklist.html']],
       '⚠ every PDF filed to the Estate Inventory folder too, under undated names, so the next package replaces them');
    eq(r.N.log.pdfs.length, 4, 'four conversions, through the one PDF builder');
    // Sequential, never parallel, and in order.
    eq(r.N.log.posts, ['shareFolder', 'shareFolder', 'uploadHtml', 'uploadHtml', 'uploadHtml', 'uploadHtml', 'uploadHtml', 'htmlToPdf', 'htmlToPdf', 'htmlToPdf', 'htmlToPdf'],
       'one Apps Script call after another');
    ok(r.N.log.gets.some((u) => /action=loadMedia&jobId=7/.test(u)), '⚠ the inventory is read from the sheet first, never assumed empty');
  });

  G('11 · documents with gaps go out as working copies — a floor, DRAFT, never FINAL — and the record states what was recorded', () => {
    const r = pkgRig();
    r.c.sendProbatePackage(7);
    const court = (r.N.log.uploads.filter((u) => /Court Inventory/.test(u.filename))[0] || {}).html || '';
    has(court, 'DRAFT', '⚠⚠ the Court Inventory with an unvalued line reads DRAFT');
    lacks(text(court), ' FINAL ', 'and never FINAL');
    has(text(court), 'not a complete total', 'its total is a floor');
    has(text(court), 'Dining chairs (8)', 'naming the line still to value');
    lacks(court, 'Reviewed and adopted by:', 'and its signature block is withheld');
    const eir = (r.N.log.uploads.filter((u) => /Estate Inventory Report/.test(u.filename))[0] || {}).html || '';
    has(eir, 'IN PROGRESS', 'the Estate Inventory Report carries its IN PROGRESS stamp');
    const rec = text((r.N.log.uploads.filter((u) => /Release Approvals/.test(u.filename))[0] || {}).html || '');
    has(rec, 'Release Approvals and Chain of Custody', 'the record');
    has(rec, '1 Sargent portrait Auction Christie’s Rex Hale', '⚠ the signed release approval recorded on the portrait: who signed it');
    has(rec, 'Released Christie’s Courier CH-0091', 'and its custody event, with the receipt');
    lacks(rec, 'Dining chairs', 'a line with neither appears in neither table');
    // The same pages the desk prints.
    const pdfCourt = r.N.log.pdfs.filter((h) => /Estate Inventory — Tangible Personal Property/.test(h))[0] || '';
    ok(pdfCourt.length > 0 && pdfCourt === court, '⚠ the attached PDF and the filed copy are built from the same page');
  });

  G('11 · recorded like any document send: the draft on docState, "I\'ve sent it", who and when on the card', () => {
    const r = pkgRig();
    r.c.sendProbatePackage(7);
    const st = (r.job().docState || {}).probatePackage || {};
    ok(!!st.draftedAt && !st.sentAt, '⚠⚠ a draft is recorded (draftedAt), never a send the app did not see');
    eq([st.provider, st.mailbox, st.draftUrl], ['gmail', BOX, 'https://mail.google.com/mail/u/0/#drafts?compose=m-1'], 'which mailbox it is in, and the link to it');
    eq(st.draftedBy, 'Anthony Graziano', 'who drafted it');
    // RESTATED 2026-10-03 (P19): the package carries the Disposition Ledger too, on both routes and at every tier, before the
    // Appraisal Worklist (probatePackageDocs; p19-ledger.test.js). Everything else here is as it was.
    eq(JSON.parse(JSON.stringify(st.pkg)), { owed: ['court', 'schedule', 'ledger', 'worklist'], docs: ['court', 'schedule', 'ledger', 'worklist'], to: 'ann@lowe.law',
       cc: ['rex@hale.example', 'agreements@havellinpalmbeach.com'] }, 'what it carried and to whom');
    ok((r.job().at || {})['docState:probatePackage'] > 0, '⚠ stamped on its key: a person\'s edit, which the sheet merges by key');
    ok(r.saves.indexOf('sync') >= 0, 'and synced');
    has((r.notices[r.notices.length - 1] || {}).m, 'Draft created in ' + BOX + ' for ann@lowe.law, copied to rex@hale.example and agreements@havellinpalmbeach.com, with the Court Inventory, Estate Inventory Report, Disposition Ledger and Appraisal Worklist attached',
        'the notice says where the draft is and what it carries');
    eq((r.notices[r.notices.length - 1] || {}).t, 'ok', 'all of it went: ok');
    eq(r.opened, ['https://mail.google.com/mail/u/0/#drafts?compose=m-1'], 'the draft opens');
    const card = r.c.probatePackageCardHtml(r.job());
    has(card, 'markDocSent(7,\'probatePackage\')', '⚠ the card offers the client documents\' own confirming tap');
    has(text(card), 'I’ve sent it', 'labelled as everywhere else');
    has(card, 'openDocDraft(7,\'probatePackage\')', 'and the draft');
    lacks(card, 'sendProbatePackage(7)', 'and no second send while a draft waits');
    has(text(card), 'Anthony Graziano · ' + BOX + ' · to ann@lowe.law', 'who and to whom');
    has(text(card), 'Drafted — read it, send it, then confirm', 'the draft\'s own line');
    r.c.markDocSent(7, 'probatePackage');
    const st2 = r.job().docState.probatePackage;
    ok(!!st2.sentAt && st2.sentBy === 'Anthony Graziano', '"I\'ve sent it" records the send, and who');
    const card2 = text(r.c.probatePackageCardHtml(r.job()));
    has(card2, 'Sent ' + new Date(st2.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' by Anthony Graziano, to ann@lowe.law', 'the card says who sent it, when, and to whom');
    has(r.c.probatePackageCardHtml(r.job()), 'sendProbatePackage(7)', 'and offers a fresh package');
  });

  G('11 · a stale draft is named: the inventory moved, not the price', () => {
    const r = pkgRig();
    r.c.sendProbatePackage(7);
    const job = r.job();
    // A discount afterwards: the package carries no price, so it is neither flagged nor warned about.
    eq(r.c.notePriceChange(job, 'discount'), [], '⚠ a price change leaves no package draft out of date');
    ok(r.c.draftOutstanding(job, 'probatePackage'), 'and the draft is still the draft');
    // The inventory moves after the draft: that draft is out of date. (The draft was made an hour ago and the line valued
    // a minute after it, so a package sent now is newer than both.)
    job.docState.probatePackage.draftedAt = new Date(NOW - 3600000).toISOString();
    r.c._photoRefs[7][1].fmv = 900; r.c._photoRefs[7][1].updatedAt = Date.parse(job.docState.probatePackage.draftedAt) + 60000;
    ok(r.c.draftIsStale(job, job.docState.probatePackage), '⚠⚠ a line valued after the draft makes it stale');
    ok(!r.c.draftOutstanding(job, 'probatePackage'), 'so it is not confirmable');
    const card = text(r.c.probatePackageCardHtml(job));
    has(card, 'was made before the inventory changed', 'the card names it');
    has(card, 'delete it, don’t send it', 'and what to do');
    has(r.c.probatePackageCardHtml(job), 'sendProbatePackage(7)', 'and Send comes back');
    r.c.markDocSent(7, 'probatePackage');
    ok(!job.docState.probatePackage.sentAt, '⚠ the tap is refused at the handler');
    has((r.notices[r.notices.length - 1] || {}).m, 'There is no draft of the probate package waiting to be confirmed', 'naming the package');
    has((r.notices[r.notices.length - 1] || {}).m, 'Send a fresh one from the Probate card', 'and where to send a fresh one');
    // The fresh package: the old draft is kept on the record, named for what overtook it, until somebody deletes it.
    r.c.sendProbatePackage(7);
    ok(r.c.draftOutstanding(job, 'probatePackage'), 'fixture: a fresh draft waits');
    const fresh = text(r.c.probatePackageCardHtml(job));
    has(fresh, 'Delete the older Gmail draft', '⚠ the card still names the old draft sitting in the mailbox');
    has(fresh, 'it was made before the inventory changed', '⚠ for the reason it went out of date');
    lacks(fresh, 'old price', 'never a price it never carried');
    // Removing a line, or the matter changing the instrument, is the same.
    const r2 = pkgRig(); r2.c.sendProbatePackage(7);
    r2.c._photoRefs[7][0].deletedAt = Date.parse(r2.job().docState.probatePackage.draftedAt) + 1;
    ok(r2.c.draftIsStale(r2.job(), r2.job().docState.probatePackage), 'a line removed after the draft');
    const r3 = pkgRig(); r3.c.sendProbatePackage(7);
    r3.job().matterType = 'both';
    ok(r3.c.draftIsStale(r3.job(), r3.job().docState.probatePackage), 'the matter now owes the Trust Schedule too');
  });

  G('11 · refusals, the old flag, a failed Gmail draft, a share that failed', () => {
    const none = pkgRig({ job: Object.assign(ESTATE(), { probateAttyEmail: '' }) });
    eq(none.c.sendProbatePackage(7), false, 'no attorney email: refused');
    has((none.notices[0] || {}).m, 'it needs the estate attorney’s email', '⚠⚠ by name');
    eq(none.N.log.posts.length + none.N.log.drafts.length + none.N.log.gets.length, 0, 'and nothing is asked of anyone');
    has(text(none.c.probatePackageCardHtml(none.job())), 'it needs the estate attorney’s email', 'the card says it before anybody presses');

    const off = pkgRig({ media: false });
    eq(off.c.sendProbatePackage(7), true, 'fixture: started');
    has((off.notices[off.notices.length - 1] || {}).m, 'The inventory could not be read from the sheet', '⚠ an inventory not read from the sheet is not sent as an empty one');
    eq(off.N.log.drafts.length + off.N.log.uploads.length, 0, 'nothing filed, no draft');

    const old = pkgRig({ job: Object.assign(ESTATE(), { probatePkgSent: true }) });
    const oc = text(old.c.probatePackageCardHtml(old.job()));
    has(oc, 'Marked sent by hand before 2026-10-01', '⚠ the old self-attested flag is history');
    has(oc, 'nothing was sent from the app', 'never a send');
    has(old.c.probatePackageCardHtml(old.job()), 'sendProbatePackage(7)', 'and the real send is offered');
    lacks(SRC, 'function toggleProbatePkg(', 'the toggle is gone');

    const fallback = pkgRig({ net: { gmailFail: true } });
    fallback.c.sendProbatePackage(7);
    eq(fallback.hrefs.length, 1, 'a failed Gmail draft falls back to a plain email');
    const href = decodeURIComponent(fallback.hrefs[0] || '');
    has(href, 'mailto:ann@lowe.law?cc=rex@hale.example,agreements@havellinpalmbeach.com', 'to the attorney, copied as before');
    has(href, 'are in the estate’s Google Drive folder:', '⚠ it can carry no PDF, so the documents are linked from Drive');
    has(href, 'Court Inventory: https://drive.google.com/file/d/up2/view', 'the filed Court Inventory');
    const fst = fallback.job().docState.probatePackage || {};
    ok(fst.provider === 'mailto' && !!fst.draftedAt && !fst.sentAt, 'recorded as an email opened, never as sent');
    has(text(fallback.c.probatePackageCardHtml(fallback.job())), 'Opened as a plain email — send it from your mail app, then confirm', 'the card says what the app did');

    const share = pkgRig({ net: { failShare: 'AF7' } });
    share.c.sendProbatePackage(7);
    const sp2 = mimeParts(share.N.log.drafts[0] || '');
    has(sp2.text, 'As-Found Record photographs: not yet shared with you', '⚠ a folder that could not be shared is named, not linked');
    lacks(sp2.text, 'folders/AF7', 'no link that would refuse them');
    has(sp2.html, 'As-Found Record photographs &mdash; not yet shared with you', 'the HTML part, the one counsel reads, names it too');
    lacks(sp2.html, 'folders/AF7', 'and links it nowhere');
    const sn = share.notices[share.notices.length - 1] || {};
    eq(sn.t, 'warn', 'the notice warns');
    has(sn.m, 'The As-Found Record photographs folder could not be shared with ann@lowe.law (Drive refused the share)', 'naming the folder and why');
    has(sn.m, 'Share w/ Counsel', 'and the control that shares it');

    // A page whose PDF could not be built goes as a link to its filed copy instead, and the notice says so.
    const pdfFail = pkgRig({ net: { failPdf: /<h2[^>]*>Appraisal Worklist/ } });
    pdfFail.c.sendProbatePackage(7);
    const pf = mimeParts(pdfFail.N.log.drafts[0] || '');
    // RESTATED 2026-10-03 (P19): the package carries the Disposition Ledger too, on both routes and at every tier, before the
    // Appraisal Worklist (probatePackageDocs; p19-ledger.test.js). Everything else here is as it was.
    eq(pf.pdfs.map((x) => x.name.replace(/ - 69 Beach.*$/, '')), ['Havellin Court Inventory', 'Havellin Estate Inventory', 'Havellin Disposition Ledger'], 'fixture: the worklist\'s PDF failed, the other three attached');
    has(pf.text, 'Appraisal Worklist: https://drive.google.com/file/d/up5/view', '⚠ the page that could not be attached is linked to its filed copy');
    lacks(pf.text, 'Court Inventory: https://', 'an attached page is not linked as well');
    has((pdfFail.notices[pdfFail.notices.length - 1] || {}).m, 'The Appraisal Worklist could not be made into a PDF, so it is linked from Drive instead of attached', 'and the notice says so');
    eq(JSON.parse(JSON.stringify(pdfFail.job().docState.probatePackage.pkg.docs)), ['court', 'schedule', 'ledger'], 'the record names what was attached');

    // A document the inventory cannot yet produce is left out, and the notice (the sender's, not the attorney's) says why.
    const empty = pkgRig({ rows: [] });
    empty.c.sendProbatePackage(7);
    const em = empty.notices[empty.notices.length - 1] || {};
    has(em.m, 'Not in the package: the Estate Inventory Report — There is nothing in the inventory to report yet.', '⚠ an empty inventory: the report is left out, by name, with its reason');
    has(em.m, 'Not in the package: the Disposition Ledger — There is nothing in the inventory to record yet.', 'P19: and so is the ledger, which has nothing to record');
    eq(em.t, 'warn', 'and the notice warns');
    eq(mimeParts(empty.N.log.drafts[0] || '').pdfs.map((x) => x.name.replace(/ - 69 Beach.*$/, '')), ['Havellin Court Inventory', 'Havellin Appraisal Worklist'],
       'the rest still goes, the Court Inventory as the working draft it is');

    // A filing that did not land is named in the notice; the draft still carries the document.
    const unfiled = pkgRig({ net: { failUpload: /Court Inventory/ } });
    unfiled.c.sendProbatePackage(7);
    const un = unfiled.notices[unfiled.notices.length - 1] || {};
    eq(un.t, 'warn', 'a page that was not filed: the notice warns');
    has(un.m, 'Not filed to Drive: the Court Inventory.', '⚠ naming what is missing from the folder');
    eq(mimeParts(unfiled.N.log.drafts[0] || '').pdfs.length, 4, 'and the draft still attaches it (P19: four documents with the ledger)');

    // A pour-over will: both instruments go.
    const both = pkgRig({ job: Object.assign(ESTATE(), { matterType: 'both' }) });
    both.c.sendProbatePackage(7);
    const bp = mimeParts(both.N.log.drafts[0] || '');
    eq(bp.pdfs.map((x) => x.name.replace(/ - 69 Beach.*$/, '')), ['Havellin Court Inventory', 'Havellin Trust Schedule', 'Havellin Estate Inventory', 'Havellin Disposition Ledger', 'Havellin Appraisal Worklist'],
       '⚠ a pour-over will carries the Court Inventory and the Trust Schedule, each the desk\'s own page');
    lacks((both.notices[both.notices.length - 1] || {}).m, 'Not in the package', 'and leaves nothing out');

    const contents = pkgRig({ job: Object.assign(ESTATE(), { docTier: 'contents' }) });
    contents.c.sendProbatePackage(7);
    const cp = mimeParts(contents.N.log.drafts[0] || '');
    eq(cp.pdfs.map((x) => x.name.replace(/ - 69 Beach.*$/, '')), ['Havellin Contents List', 'Havellin Disposition Ledger', 'Havellin Appraisal Worklist'], 'a contents engagement sends the Contents List');
    has(cp.text, 'Valuing the property is not part of Havellin’s engagement on this estate, so the Contents List is attached in place of a valued schedule.',
        '⚠ and says once, to counsel, that the values are theirs');
  });

  G('11 · one package at a time, and the next is not refused once the first is done', () => {
    // Held at Google's sign-in, so the first send is still out when the second press comes.
    const held = [];
    const r = pkgRig({ stubs: { gmailAuth: (cb) => held.push(cb) } });
    r.c.sendProbatePackage(7);
    eq(held.length, 1, 'fixture: the first send is waiting on Google sign-in');
    eq(r.c.sendProbatePackage(7), false, '⚠ a second press while it is out is refused');
    has((r.notices[r.notices.length - 1] || {}).m, 'Another document is being prepared', 'saying so');
    eq(held.length, 1, 'and nothing is started twice');
    (held[0] || (() => {}))('tok-p17');
    eq(r.N.log.drafts.length, 1, 'the first finishes with its draft');
    ok(!r.c._docBusy, '⚠ and releases the one-at-a-time hold');
    r.c.markDocSent(7, 'probatePackage');
    eq(r.c.sendProbatePackage(7), true, 'so the next package can go');
    eq(held.length, 2, 'and it does');
  });

  G('11 · an older job\'s one photograph folder, a folder with no Estate Inventory, tier none, a removed report', () => {
    // A folder from before the 2026-09-20 split: both names resolve to one folder, which is shared and linked once.
    const one = pkgRig({ job: Object.assign(ESTATE(), { driveSubfolders: { 'Estate Inventory': 'INV7', 'Agreement': 'AGR7' } }) });
    one.c.sendProbatePackage(7);
    eq(one.N.log.shares, [{ folderId: 'INV7', email: 'ann@lowe.law' }], '⚠ one photograph folder is shared once');
    const op = mimeParts(one.N.log.drafts[0] || '');
    has(op.text, 'Photographs: https://drive.google.com/drive/folders/INV7', 'and linked once, as the photographs');
    lacks(op.text, 'As-Found Record photographs', 'never claiming a second folder');

    // No Estate Inventory subfolder at all (Drive lists none): the documents are filed in the client's own folder.
    const flat = pkgRig({ job: Object.assign(ESTATE(), { driveSubfolders: { 'Agreement': 'AGR7' } }), net: { subfolders: { Agreement: 'AGR7' } } });
    flat.c.sendProbatePackage(7);
    ok(flat.N.log.uploads.length === 5 && flat.N.log.uploads.every((u) => u.folderId === 'ROOT7'),
       '⚠ with no Estate Inventory folder the record and every page are filed in the client\'s folder, never dropped');
    eq(flat.N.log.drafts.length, 1, 'and the draft is still made');

    // Tier none: the inventory is counsel's, and the email says so once.
    const none = pkgRig({ job: Object.assign(ESTATE(), { docTier: 'none' }) });
    none.c.sendProbatePackage(7);
    const np = mimeParts(none.N.log.drafts[0] || '');
    eq(np.pdfs.map((x) => x.name.replace(/ - 69 Beach.*$/, '')), ['Havellin Disposition Ledger', 'Havellin Appraisal Worklist'], 'tier none: the Disposition Ledger and the Appraisal Worklist (P19)');
    has(np.text, 'On this estate the inventory and the filing are your office’s; Havellin’s records of the property are below.', '⚠ and the one absence that shifts the work to counsel is stated');

    // A report removed from the Job Plan is not linked.
    const rows = INVENTORY().concat([{ stableId: 'd2', label: 'appraisal', collId: '4', roomIdx: null, status: 'uploaded', ts: T0,
      objectName: 'Withdrawn offer.pdf', driveFileUrl: 'https://drive.google.com/file/d/GONE/view', deletedAt: T0 + 1000 }]);
    const rm = pkgRig({ rows });
    rm.c.sendProbatePackage(7);
    const rp = mimeParts(rm.N.log.drafts[0] || '');
    has(rp.text, 'Christies appraisal.pdf', 'fixture: the standing report is linked');
    lacks(rp.text, 'GONE', '⚠ a report removed from the Job Plan is not linked');
  });

  G('11 · the package\'s record survives a stale device\'s save, through the real sheet merge', () => {
    const S = { Date, JSON, Math, Number, String, Object, Array };
    vm.createContext(S);
    vm.runInContext([gsVar('JOB_KEYED_LISTS'), gsVar('JOB_KEYED_MAPS'), gsVar('JOB_LIST_KEY'), gsVar('JOB_PAYMENT_STICKY'),
      gsFn('_paymentSticky'), gsFn('_jobStamp'), gsFn('_jobListKey'), gsFn('_mergeJobKeyed'), gsFn('_mergeJobRecord')].join('\n\n'), S);
    const morning = Object.assign(ESTATE(), { updatedAt: T0, notes: 'am' });
    const r = pkgRig({ job: JSON.parse(JSON.stringify(morning)) });
    r.c.sendProbatePackage(7);
    const desk = JSON.parse(JSON.stringify(r.job()));
    // The other device, on its morning copy, edits the notes later.
    const stale = JSON.parse(JSON.stringify(morning)); stale.notes = 'pm'; stale.updatedAt = desk.updatedAt + 5000;
    const merged = S._mergeJobRecord(desk, stale);
    eq(merged.notes, 'pm', 'fixture: the later scalar edit wins its field');
    ok(!!(merged.docState && merged.docState.probatePackage && merged.docState.probatePackage.draftedAt),
       '⚠⚠ and the package draft survives it — docState merges by key, and the send stamped its key');
  });

  G('11 · the card on the dashboard: the toggle is gone, and a typed attorney email is text', () => {
    const rd = noComments(fn('renderClientDashboard'));
    lacks(rd, 'toggleProbatePkg', 'the dashboard no longer calls the self-attested toggle');
    lacks(rd, 'Package Sent', 'nor paints "✓ Package Sent"');
    has(rd, 'probatePackageCardHtml(job)', 'the Probate card carries the package row');
    const g = lift(['probatePackageCardHtml'], [], { jobs: [], estimateStore: {}, _photoRefs: {}, SHEETS_SYNC_URL: SYNC });
    const h = g.probatePackageCardHtml(Object.assign(ESTATE(), { probateAttyEmail: 'a<b>@l.law' }));
    has(h, 'a&lt;b&gt;@l.law', 'the attorney\'s email is escaped');
    lacks(h, 'a<b>@', 'never markup');
    has(text(h), 'Carries the Court Inventory, Estate Inventory Report, Disposition Ledger and Appraisal Worklist, with links to the photographs and the release and custody record', 'it says what it carries before it goes (P19: with the ledger)');
    // The waiting draft's who-and-when line is text too: the address came from what was typed, the rest from records.
    const live = Object.assign(ESTATE(), { probateAttyEmail: 'a<b>@l.law' });
    live.docState = { probatePackage: { draftedAt: '2026-10-01T14:00:00.000Z', draftedBy: 'O<i>Hara</i>', provider: 'gmail',
      mailbox: 'box<u>@h.com', draftUrl: 'https://mail.google.com/mail/u/0/#drafts?compose=m-1',
      // RESTATED 2026-10-03 (P19): a draft carries the documents owed when it was made, and the package owes the ledger now.
      pkg: { owed: ['court', 'schedule', 'ledger', 'worklist'], docs: ['court', 'schedule', 'ledger', 'worklist'], to: 'a<b>@l.law', cc: [] } } };
    const hl = g.probatePackageCardHtml(live);
    has(hl, 'markDocSent(7,', 'fixture: the draft is waiting on its confirming tap');
    has(hl, 'O&lt;i&gt;Hara', '⚠ who drafted it, as text');
    lacks(hl, '<i>', 'never markup');
    lacks(hl, '<u>', 'nor the mailbox');
    lacks(hl, 'a<b>@', 'nor the address it went to');
  });
};
