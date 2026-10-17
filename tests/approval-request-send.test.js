'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// SENDING THE RELEASE APPROVAL REQUEST (2026-10-17; Anthony: "Build the send button").
//
// The request was print-only: a paper handed over or a PDF attached by hand, and nothing on screen said whether one
// had gone, to whom, or for which lines. It now goes as every client document goes, on the estate package's path:
//   · approvalRequestRecipients: every fiduciary with an email, the estate attorney copied; the attorney addressed where
//     no fiduciary has one (viaCounsel); the client on living work; agreements@ always; `noEmail` names who signs paper.
//   · approvalRequestBlocker: refused by name, everything missing at once — nobody to send to, no Drive folder, no URL.
//   · sendApprovalRequest: the manifest read from the sheet first, the one printer (printApprovalRequest, asHtml), a
//     dated copy filed to the Estate Inventory folder, the PDF through docPdfBase64, a Gmail draft, the mailto fallback
//     with the filed copy linked; recorded on docState.approvalRequest (APPROVAL_REQ_KEY) through docRecordSent with
//     `req`; confirmed by the one tap (markDocSent, through invMarkRequestSent on the desk).
//   · The draft rules know the record: overtaken when every line it carried is approved (approvalRequestOvertaken),
//     never by a price (outstandingDrafts leaves it out); noDraftToConfirm and staleDraftNote name it.
//   · The Releases card's first section and the dashboard's card: what went, to whom, what is still unsigned, the
//     lines a fresh request is owed for, and the send; the work bar and the bulk bar carry Send request once each.
//
// Driven through the real functions, each lifted as its own call graph derived from the source, with only the
// boundaries stubbed by name — the network at `fetch`, Google's sign-in, the notices and the store saves — and the
// sandbox's clock stopped (FixedDate), so nothing here reads the wall clock.
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

// The fake network: the Apps Script /exec (GET loadMedia; POST uploadHtml, htmlToPdf, getSubfolders), Google's userinfo
// and the Gmail drafts endpoint. Everything posted is kept for the assertions.
const SYNC = 'https://script.google.com/macros/s/APPROVALSEND/exec';
const BOX = 'anthony@havellinpalmbeach.com';
const AGREEMENTS = 'agreements@havellinpalmbeach.com';
function net(opts) {
  const o = Object.assign({ media: null, gmailFail: false, pdfFail: false, uploadFail: false }, opts || {});
  const log = { posts: [], uploads: [], pdfs: [], drafts: [], gets: [] };
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
  return { fetch, log };
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
                    'draftOutstanding', 'draftIsStale', 'noDraftToConfirm', 'outstandingDrafts', 'staleDraftNote', 'printApprovalRequest', '_invAwaitingApproval'],
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

  // ═══════════════════════════════════════════════════════════════════════
  G('A · to whom: every fiduciary with an email, the attorney copied, the attorney addressed where none has one, the client on living work', () => {
    const R = lift(['approvalRequestRecipients', 'approvalRequestBlocker'], [], { SHEETS_SYNC_URL: SYNC });
    const r = R.approvalRequestRecipients(ESTATE());
    eq(r.to, ['rex@hale.example', 'dana@hale.example'], 'To: the representative, then the co-representative with an email, in the fiduciary order');
    eq(r.cc, ['ann@lowe.law', AGREEMENTS], 'Cc: the estate attorney, then agreements@');
    eq(r.noEmail, ['Lee Hale'], '⚠ the co-representative with no email is named, never a refusal');
    eq(r.viaCounsel, false, 'and it does not go through counsel while a fiduciary can be reached');
    // Once each, whatever the case.
    const dup = R.approvalRequestRecipients(ESTATE({ coFiduciaries: [{ id: 'c1', name: 'Dana Hale', role: 'Co-Trustee', email: 'REX@hale.example' }] }));
    eq(dup.to, ['rex@hale.example'], 'an address recorded twice goes once');
    // No fiduciary email at all: the attorney is addressed, and the record says so.
    const via = R.approvalRequestRecipients(ESTATE({ executorEmail: '', coFiduciaries: [] }));
    eq(via.to, ['ann@lowe.law'], '⚠ with no fiduciary email the estate attorney is addressed');
    eq(via.cc, [AGREEMENTS], 'and copied no longer');
    eq(via.noEmail, ['Rex Hale'], 'the representative is named as signing through counsel');
    eq(via.viaCounsel, true, 'viaCounsel');
    // Nobody at all.
    const none = R.approvalRequestRecipients(ESTATE({ executorEmail: '', coFiduciaries: [], probateAttyEmail: '' }));
    eq(none.to, [], 'nobody to send to');
    // Living work: the client, nobody copied but agreements@, no fiduciary at all.
    const liv = R.approvalRequestRecipients(LIVING());
    eq(liv, { to: ['meg@ellis.example'], cc: [AGREEMENTS], noEmail: [], viaCounsel: false }, 'a living client: the client, agreements@');
    eq(R.approvalRequestRecipients(null).to, [], 'no job, nobody');

    // The blocker: by name, everything missing at once.
    eq(R.approvalRequestBlocker(ESTATE()), '', 'the estate as recorded can be sent');
    const b = R.approvalRequestBlocker(ESTATE({ executorEmail: '', coFiduciaries: [], probateAttyEmail: '', driveFolder: '' }));
    has(b, 'cannot be sent yet', 'refused');
    has(b, 'an email for the Personal Representative, a co-representative or the estate attorney (Edit Client)', 'names the email it needs, by the matter’s title, and where it is entered');
    has(b, 'the client’s Drive folder (Create Drive folder, on the dashboard)', 'and the folder');
    has(R.approvalRequestBlocker(LIVING({ email: '' })), 'the client’s email (Edit Client)', 'a living client: the client’s email');
    const noUrl = lift(['approvalRequestBlocker'], [], { SHEETS_SYNC_URL: '' });
    has(noUrl.approvalRequestBlocker(ESTATE()), 'the Apps Script URL in Settings', 'and the URL');
    eq(R.approvalRequestBlocker(null), 'This job could not be found.', 'no job');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('B · the one printer answers the send: printApprovalRequest with asHtml returns the page, its lines and its refusals', () => {
    const r = rig();
    const page = r.c.printApprovalRequest(7, false, { asHtml: true });
    ok(!!(page && page.html), 'the page comes back');
    eq((page.items || []).map((x) => x.stableId), ['a', 'b'], 'with the two lines awaiting approval (never the Keep line, never the approved one)');
    eq(page.asked.length, 2, 'both asked for');
    eq(page.ratify.length, 0, 'none for ratification');
    eq(page.title, 'Havellin Release Approval Request - 14 Seaspray Ave - Oct 17 2026', 'titled as the print names it, dated');
    has(page.html, 'Sargent portrait', 'the page is the request');
    has(page.html, 'Rex Hale', 'addressed to the fiduciaries');
    // A refusal is an answer, not an alert.
    r.c._photoRefs[7].forEach((row) => { if (row.disposition === 'Auction' || row.disposition === 'Donate') { row.authBy = ALL_SIGNED; row.approvalDate = '2026-10-15'; } });
    const none = r.c.printApprovalRequest(7, false, { asHtml: true });
    has(none.why, 'Nothing is waiting on approval', 'nothing waiting: {why}');
    ok(!none.html, 'and no page');
    const sel = r.c.printApprovalRequest(7, true, { asHtml: true });
    eq(sel.why, 'Select the items you want approval for first.', 'a selection of nothing: {why}');
    eq(r.c.printApprovalRequest(99, false, { asHtml: true }).why, 'This job could not be found.', 'no job: {why}');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('C · the send, Gmail: filed dated, the PDF attached, the draft to the fiduciaries, recorded with what it asked and of whom', () => {
    const r = rig();
    eq(r.c.sendApprovalRequest(7), true, 'it starts');
    eq(r.c._docBusy, null, 'and has finished (one send at a time, released)');
    eq(r.N.log.gets.filter((u) => /loadMedia/.test(u)).length, 1, 'the manifest was read from the sheet first');
    // Filed, under a DATED name, into the Estate Inventory folder.
    eq(r.N.log.uploads.length, 1, 'one filing');
    eq(r.N.log.uploads[0].filename, 'HVL-0007 - Havellin Release Approval Request - Oct 17 2026.html', '⚠ dated: each round is its own paper');
    eq(r.N.log.uploads[0].folderId, 'INV7', 'in the Estate Inventory folder');
    has(r.N.log.uploads[0].html, 'Sargent portrait', 'the filed copy is the request');
    eq(r.N.log.pdfs.length, 1, 'one PDF, through the one builder');
    // The draft.
    eq(r.N.log.drafts.length, 1, 'one Gmail draft');
    const mime = r.N.log.drafts[0];
    eq(headerOf(mime, 'To'), 'rex@hale.example, dana@hale.example', 'To: the fiduciaries with an email');
    eq(headerOf(mime, 'Cc'), 'ann@lowe.law, ' + AGREEMENTS, 'Cc: the attorney and agreements@');
    eq(decodeHeader(headerOf(mime, 'Subject')), 'Havellin Palm Beach — Release Approval Request for 14 Seaspray Ave', 'the subject names the paper and the street');
    const parts = mimeParts(mime);
    eq(parts.pdfs.map((p) => p.name), ['Havellin Release Approval Request - 14 Seaspray Ave - Oct 17 2026.pdf'], 'the PDF attached, named as the print names it');
    has(parts.text, 'Dear Rex and Dana,', 'greets the fiduciaries emailed, by first name, never the one with no email');
    has(parts.text, 'Attached is Havellin’s Release Approval Request for the Estate of Harold Brennan, 14 Seaspray Ave, Palm Beach, as of October 17, 2026: 2 lines proposed to leave the property.', 'says what it is, for what, as of when, and how many lines');
    has(parts.text, 'Please initial each line or group where marked, sign where shown, and return the signed copy to us; a scan or a photograph by reply is fine.', 'asks for the initials, the signature and the copy back');
    has(parts.text, 'Nothing on it will be moved, sold, donated or disposed of until it comes back signed.', 'the rule, as the page states it');
    has(parts.text, 'Every co-representative named on it signs.', 'three fiduciaries: every one signs');
    has(parts.text, 'Lee Hale has no email on file with us and will receive a printed copy to sign.', '⚠ the one with no email is named, so the others know a third signature is being gathered');
    lacks(parts.text, 'Google Drive', 'no Drive link where the PDF is attached');
    has(parts.html, 'Release Approval Request', 'the HTML part carries the paper’s name');
    has(parts.html, 'Dear Rex and Dana,', 'and the same greeting');
    has(parts.html, 'Lee Hale has no email on file', 'and the same sentence');
    // Recorded.
    const st = r.st();
    ok(!!st, 'recorded on docState.approvalRequest');
    eq(st.provider, 'gmail', 'provider gmail');
    eq(st.draftedAt, new Date(NOW).toISOString(), 'draftedAt now');
    eq(st.draftedBy, 'Ashley Jerome', 'by the job’s concierge (the device user unset)');
    eq(st.mailbox, BOX, 'whose drafts folder');
    ok(/mail\/u\/0\//.test(st.draftUrl), 'the draft link');
    eq(st.pdfOk, true, 'pdfOk');
    ok(!st.sentAt, '⚠ not sent: Gmail makes a draft and a person presses Send');
    eq(st.req.to, ['rex@hale.example', 'dana@hale.example'], 'req.to');
    eq(st.req.cc, ['ann@lowe.law', AGREEMENTS], 'req.cc');
    eq(st.req.noEmail, ['Lee Hale'], 'req.noEmail');
    eq(st.req.stableIds, ['a', 'b'], 'req.stableIds: the lines it asked for');
    eq(st.req.asked, 2, 'req.asked');
    eq(st.req.ratify, 0, 'req.ratify');
    eq(st.req.filedUrl, 'https://drive.google.com/file/d/up1/view', 'req.filedUrl');
    ok(!st.pkg, 'and it is not a package record');
    ok(r.saves.indexOf('jobs') >= 0 && r.saves.indexOf('sync') >= 0, 'saved and synced');
    // The notice.
    const n = r.last();
    eq(n.t, 'warn', 'amber: one fiduciary has no email');
    has(n.m, 'Draft created in ' + BOX + ' for rex@hale.example and dana@hale.example, copied to ann@lowe.law and ' + AGREEMENTS + ', with the Release Approval Request attached (2 lines). Read it, send it, then tap “I’ve sent it” on the Releases & signed papers card.', 'the notice says what was made, for whom, and the tap');
    has(n.m, 'Lee Hale has no email on file: print the request for them to sign (Approval Request).', 'and who signs paper');
    eq(r.opened.length, 1, 'the draft opened');
    has(r.badges.join('|'), 'Gmail draft created ✓', 'the badge');
    // The draft is outstanding, and the price readers leave it alone.
    eq(r.c.draftOutstanding(r.job(), 'approvalRequest'), true, 'outstanding');
    eq(r.c.outstandingDrafts(r.job()), [], '⚠ outstandingDrafts (the price readers) leaves it out, as it leaves the package out');

    // A second send while the draft waits is still a send (a fresh request replaces the draft, kept as stale history).
    // Here: the card offers the tap, not the send.
    const card = text(r.card());
    has(card, 'Approval request', 'the Releases card’s first section');
    has(card, 'Drafted Oct 17 · Ashley Jerome · ' + BOX + ' to rex@hale.example and dana@hale.example, 2 lines', 'what was drafted, by whom, where, to whom');
    has(card, 'Drafted — read it, send it, then confirm', 'the draft line, the rail’s words');
    has(r.card(), 'invMarkRequestSent(7)', 'the confirming tap');
    has(r.card(), "openDocDraft(7,'approvalRequest')", 'the link to the draft');
    lacks(r.card(), 'sendApprovalRequest(7)', 'and no second send while the draft waits');
  });

  G('C · the confirming tap: the desk’s I’ve sent it records the send through markDocSent, and refuses with no draft', () => {
    const r = rig();
    eq(r.c.invMarkRequestSent(7), false, 'nothing drafted: refused');
    has(r.last().m, 'There is no draft of the approval request waiting to be confirmed.', 'named');
    has(r.last().m, 'Send a fresh one from the desk (Job Admin & Inv, under Releases & signed papers).', 'and where to send one');
    r.c.sendApprovalRequest(7);
    eq(r.c.invMarkRequestSent(7), true, 'drafted: confirmed');
    const st = r.st();
    eq(st.sentAt, new Date(NOW).toISOString(), 'sentAt');
    eq(st.sentBy, 'Ashley Jerome', 'sentBy');
    eq(r.c.draftOutstanding(r.job(), 'approvalRequest'), false, 'no longer outstanding');
    eq(r.c.invMarkRequestSent(7), false, 'a second tap: refused');
    has(r.last().m, 'The approval request is already recorded as sent.', 'and says so');
    // The card after the send: what went, what is still unsigned, and the send again.
    const card = text(r.card());
    has(card, 'Sent Oct 17 by Ashley Jerome to rex@hale.example and dana@hale.example, 2 lines · 2 lines still unsigned', 'sent, to whom, how many, how many still unsigned');
    has(card, 'Lee Hale had no email: they sign the printed copy.', 'who signs paper');
    lacks(card, 'now await approval and were not on it', 'nothing new waits');
    has(r.card(), 'sendApprovalRequest(7)', 'a fresh send is offered (the two lines still wait)');
    // One line approved by all three, a new line put up for sale: the card counts both.
    r.c._photoRefs[7].forEach((row) => { if (row.stableId === 'a') { row.authBy = ALL_SIGNED; row.approvalDate = '2026-10-17'; } if (row.stableId === 'c') row.disposition = 'Sell'; });
    const card2 = text(r.card());
    has(card2, '2 lines · 1 line still unsigned', 'one of the two still unsigned');
    has(card2, '⚠ 1 line now await approval and were not on it: send a fresh request.', 'and the fresh line is named');
  });

  G('C · the send, Gmail refused: the plain email with the filed copy linked, recorded as what it is', () => {
    const r = rig({ net: { gmailFail: true } });
    eq(r.c.sendApprovalRequest(7), true, 'it starts');
    eq(r.N.log.drafts.length, 0, 'no draft');
    eq(r.hrefs.length, 1, 'a plain email opened');
    const m = decodeURIComponent(r.hrefs[0]);
    ok(m.indexOf('mailto:rex@hale.example,dana@hale.example?cc=ann@lowe.law,' + AGREEMENTS) === 0, 'to the same people');
    has(m, 'Below is a link to Havellin’s Release Approval Request', 'says it is linked, not attached');
    has(m, 'The request is in Google Drive: https://drive.google.com/file/d/up1/view', 'the filed copy linked');
    has(m, 'Lee Hale has no email on file', 'the same sentence');
    const st = r.st();
    eq(st.provider, 'mailto', 'recorded as a plain email');
    ok(!st.sentAt, 'never as sent');
    eq(st.req.stableIds, ['a', 'b'], 'with what it asked');
    has(r.last().m, 'Gmail draft failed — ', 'the notice leads with the failure');
    has(r.last().m, 'Email opened for rex@hale.example and dana@hale.example', 'and what was opened');
    has(r.last().m, 'with the request linked from Drive (a plain email carries no attachment)', 'and that nothing is attached');
    has(text(r.card()), 'Opened as a plain email — send it from your mail app, then confirm', 'the card asks for the same tap');
  });

  G('C · the send, no PDF: the draft links the filed copy; neither PDF nor filing: refused, nothing drafted', () => {
    const r = rig({ net: { pdfFail: true } });
    eq(r.c.sendApprovalRequest(7), true, 'starts');
    eq(r.N.log.drafts.length, 1, 'a draft all the same');
    const parts = mimeParts(r.N.log.drafts[0]);
    eq(parts.pdfs.length, 0, 'nothing attached');
    has(parts.text, 'Below is a link to Havellin’s Release Approval Request', 'linked');
    has(parts.text, 'https://drive.google.com/file/d/up1/view', 'to the filed copy');
    has(parts.html, '<a href="https://drive.google.com/file/d/up1/view"', 'as a link in the HTML part');
    eq(r.st().pdfOk, false, 'pdfOk false');
    has(r.last().m, 'The PDF could not be built (The PDF conversion failed.), so the draft links the filed copy instead of attaching it.', 'said');
    const both = rig({ net: { pdfFail: true, uploadFail: true } });
    both.c.sendApprovalRequest(7);
    eq(both.N.log.drafts.length, 0, '⚠ with nothing to attach or link, no draft');
    ok(!both.st(), 'and nothing recorded');
    eq(both.last().t, 'err', 'an error');
    has(both.last().m, 'neither made into a PDF', 'that says why');
    has(both.last().m, 'Approval Request still prints it', 'and that the print still works');
    eq(both.c._docBusy, null, 'released');
  });

  G('C · through counsel, and on living work', () => {
    const via = rig({ job: ESTATE({ executorEmail: '', coFiduciaries: [] }) });
    via.c.sendApprovalRequest(7);
    const mime = via.N.log.drafts[0];
    eq(headerOf(mime, 'To'), 'ann@lowe.law', 'addressed to the estate attorney');
    eq(headerOf(mime, 'Cc'), AGREEMENTS, 'agreements@ alone copied');
    const parts = mimeParts(mime);
    has(parts.text, 'Dear Ann,', 'greets counsel');
    has(parts.text, 'We have no email on file for Rex Hale, whose signature it needs, so we are sending it through you.', 'says why it comes to them');
    lacks(parts.text, 'Every co-representative', 'one fiduciary: no "every" sentence');
    eq(via.st().req.viaCounsel, true, 'recorded as through counsel');
    has(via.last().m, 'No fiduciary has an email on file, so it is addressed to the estate attorney; Rex Hale sign through counsel or on the printed copy.', 'the notice says so');
    has(text(via.card()), 'Rex Hale had no email: it went through the estate attorney.', 'and the card');

    const liv = rig({ job: LIVING(), rows: [
      ROW('a', { itemNo: 1, objectName: 'Sofa', fmv: '', valSource: '', disposition: 'Donate', channel: 'Habitat ReStore' }),
      ROW('b', { itemNo: 2, objectName: 'Desk', fmv: '', valSource: '', disposition: 'Keep' }) ] });
    eq(liv.c.sendApprovalRequest(7), true, 'a living client’s request goes too');
    const lm = liv.N.log.drafts[0];
    eq(headerOf(lm, 'To'), 'meg@ellis.example', 'to the client');
    eq(headerOf(lm, 'Cc'), AGREEMENTS, 'agreements@');
    const lp = mimeParts(lm);
    has(lp.text, 'Dear Margaret,', 'by first name');
    has(lp.text, 'Release Approval Request for your property at 9 Dunbar Rd, Palm Beach, as of October 17, 2026: 1 line proposed to leave the property.', 'for their property, one line');
    lacks(lp.text, 'Estate of', 'never an estate');
    lacks(lp.text, 'co-representative', 'no fiduciary words');
    eq(liv.st().req.stableIds, ['a'], 'the Donate line alone');
  });

  G('C · refused by name, nothing posted: nobody to send to, nothing waiting, busy, the sheet unread, a selection of nothing', () => {
    const none = rig({ job: ESTATE({ executorEmail: '', coFiduciaries: [], probateAttyEmail: '' }) });
    eq(none.c.sendApprovalRequest(7), false, 'nobody: refused');
    has(none.last().m, 'The approval request cannot be sent yet: it needs an email for the Personal Representative, a co-representative or the estate attorney (Edit Client).', 'by name');
    eq(none.N.log.posts.length, 0, 'nothing posted');
    const done = rig({ rows: INVENTORY().map((r) => Object.assign(r, r.disposition === 'Keep' ? {} : { authBy: ALL_SIGNED, approvalDate: '2026-10-12' })) });
    eq(done.c.sendApprovalRequest(7), false, 'nothing waiting: refused');
    has(done.last().m, 'Nothing is waiting on approval', 'said');
    const busy = rig({ stubs: { _docBusy: { jobId: 3, docKey: 'estimate' } } });
    eq(busy.c.sendApprovalRequest(7), false, 'another document in flight: refused');
    has(busy.last().m, 'Another document is being prepared', 'said');
    const off = rig({ media: false });
    eq(off.c.sendApprovalRequest(7), true, 'the sheet unreachable: it starts');
    eq(off.N.log.drafts.length, 0, 'and makes no draft');
    has(off.last().m, 'The inventory could not be read from the sheet', '⚠ an unread manifest is unread, not empty');
    ok(!off.st(), 'nothing recorded');
    eq(off.c._docBusy, null, 'released');
    const sel = rig();
    eq(sel.c.sendApprovalRequest(7, true), false, 'the bulk bar’s send with nothing selected: refused');
    eq(sel.last().m, 'Select the lines you want approval for first.', 'said');
    eq(sel.N.log.drafts.length, 0, 'no draft');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('D · the draft rules: overtaken when every line it carried is approved, never by a price; named by the shared helpers', () => {
    const r = rig();
    r.c.sendApprovalRequest(7);
    const job = r.job();
    eq(r.c.draftIsStale(job, job.docState.approvalRequest), false, 'two lines still wait: the draft stands');
    // A price change never touches it.
    job.priceChangedAt = new Date(NOW + 1000).toISOString();
    eq(r.c.draftIsStale(job, job.docState.approvalRequest), false, '⚠ a price change does not overtake it');
    // Every line it carried approved: overtaken.
    r.c._photoRefs[7].forEach((row) => { if (row.stableId === 'a' || row.stableId === 'b') { row.authBy = ALL_SIGNED; row.approvalDate = '2026-10-17'; } });
    eq(r.c.draftIsStale(job, job.docState.approvalRequest), true, 'every line approved: the draft is overtaken');
    eq(r.c.draftOutstanding(job, 'approvalRequest'), false, 'and no longer outstanding');
    const note = r.c.staleDraftNote(job, 'approvalRequest', false);
    has(note, 'The Gmail draft from Oct 17 (' + BOX + ') was made before every line on it was approved — delete it, don’t send it', 'the stale note says why, in its own words');
    has(r.c.noDraftToConfirm(job, 'approvalRequest'), 'There is no draft of the approval request waiting to be confirmed.', 'the tap’s refusal names the paper');
    const card = text(r.card());
    has(card, 'was made before every line on it was approved', 'the card carries the note');
    lacks(card, 'I’ve sent it', 'and offers no tap for it');
    // ⚠ A line one of three has signed is still open: the state asks invApprovalComplete (every fiduciary), never a name and
    // a date alone (the revert sweep found a `authBy && approvalDate` reading green until this case existed).
    const part = lift(['approvalRequestState', 'approvalRequestOvertaken', '_approvalLineOpen'], [], { _photoRefs: {} });
    const half = ROW('h', { disposition: 'Donate', authBy: 'Rex Hale', approvalDate: '2026-10-16' });
    const pj = ESTATE({ docState: { approvalRequest: { draftedAt: '2026-10-17T15:00:00.000Z', req: { stableIds: ['h'] } } } });
    eq(part._approvalLineOpen(half, pj), true, '⚠ signed by one of three: still open');
    eq(part.approvalRequestState(pj, [half]).open.map((r) => r.stableId), ['h'], 'and the state counts it as still unsigned');
    part._photoRefs[7] = [half];
    eq(part.approvalRequestOvertaken(pj, pj.docState.approvalRequest), false, 'and the draft is not overtaken');
    half.authBy = ALL_SIGNED;
    eq(part.approvalRequestOvertaken(pj, pj.docState.approvalRequest), true, 'all three: overtaken');
    // A device that has not loaded the manifest claims nothing.
    const cold = lift(['draftIsStale', 'approvalRequestOvertaken', 'docDraftPending'], [], { _photoRefs: {} });
    eq(cold.draftIsStale({ id: 7 }, { draftedAt: '2026-10-17T15:00:00.000Z', req: { stableIds: ['a'] } }), false, '⚠ no manifest on this device: not stale');
    eq(cold.draftIsStale({ id: 7 }, { draftedAt: '2026-10-17T15:00:00.000Z', req: { stableIds: [] } }), false, 'nothing carried: not stale');
    // The literal in the shared namer is the constant.
    const K = sandbox({ fns: ['staleDocName'], vars: ['APPROVAL_REQ_KEY', 'APPROVAL_REQ_TITLE'] });
    eq(K.APPROVAL_REQ_KEY, 'approvalRequest', '⚠ the stored key, never renamed');
    eq(K.staleDocName(K.APPROVAL_REQ_KEY), 'approval request', 'staleDocName names it (the literal there is this constant)');
    eq(K.APPROVAL_REQ_TITLE, 'Release Approval Request', 'the paper’s title');
    const live = noComments(fn('staleDocName'));
    has(live, "key === 'approvalRequest'", 'the shared namer carries the literal, so a sandbox lifting it alone needs no var');
    has(noComments(fn('noDraftToConfirm')), "key === 'approvalRequest'", 'and so does the tap\'s refusal');
    has(noComments(fn('printApprovalRequest')), "_invDocName(job, 'Release Approval Request')", 'the printer names the paper by the literal (pinned sandboxes lift it alone)');
    const K2 = sandbox({ vars: ['APPROVAL_REQ_TITLE'] });
    eq(K2.APPROVAL_REQ_TITLE, 'Release Approval Request', 'which is the constant');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('E · the Releases card before anything is sent, and the dashboard’s card once something is', () => {
    const r = rig();
    const card = text(r.card());
    has(card, 'Approval request', 'the section');
    has(card, '⚠ 2 lines await written approval; nothing has been sent from the app.', 'says what waits and that nothing went');
    has(card, 'Goes as a PDF to rex@hale.example and dana@hale.example, copied to ann@lowe.law and ' + AGREEMENTS + '; Lee Hale has no email and signs the printed copy.', 'to whom it will go, and who signs paper');
    has(r.card(), 'sendApprovalRequest(7)', 'the send');
    lacks(r.card(), 'invMarkRequestSent(', 'no tap with nothing drafted');
    // Blocked: the card says so in red and offers no send.
    const blk = rig({ job: ESTATE({ executorEmail: '', coFiduciaries: [], probateAttyEmail: '' }) });
    const bc = blk.card();
    has(text(bc), 'The approval request cannot be sent yet', 'the blocker on the card');
    lacks(bc, 'sendApprovalRequest(', 'no send offered that would refuse');
    // Nothing waiting and nothing sent: no section (the card is for what there is).
    const quiet = rig({ rows: INVENTORY().map((x) => Object.assign(x, x.disposition === 'Keep' ? {} : { authBy: ALL_SIGNED, approvalDate: '2026-10-12' })) });
    lacks(quiet.card(), 'Approval request', 'nothing to say');
    // The dashboard's card: nothing until a request has gone from the app.
    eq(r.c.approvalRequestDashHtml(r.job()), '', 'nothing recorded: no card');
    r.c.sendApprovalRequest(7);
    const d1 = r.c.approvalRequestDashHtml(r.job());
    has(d1, 'Release approval request', 'the heading');
    has(text(d1), 'Drafted Oct 17 by Ashley Jerome to rex@hale.example and dana@hale.example, 2 lines · Drafted — read it, send it, then confirm', 'the draft, in the rail’s words');
    has(d1, "markDocSent(7,'approvalRequest')", 'the confirming tap, the client documents’ own');
    has(d1, "openDocDraft(7,'approvalRequest')", 'the draft link');
    r.c.invMarkRequestSent(7);
    const d2 = r.c.approvalRequestDashHtml(r.job());
    has(text(d2), 'Sent Oct 17 by Ashley Jerome to rex@hale.example and dana@hale.example, 2 lines · 2 lines still unsigned', 'sent, and what is still unsigned where this device holds the manifest');
    has(d2, 'openJobDeskFor(7)', 'opens the desk');
    lacks(d2, 'markDocSent(', 'no tap once sent');
    // Where this device holds no manifest, nothing is claimed about what is unsigned.
    const cold = lift(['approvalRequestDashHtml'], [], { _photoRefs: {}, Date: FixedDate(NOW) });
    const dj = JSON.parse(JSON.stringify(r.job()));
    const d3 = text(cold.approvalRequestDashHtml(dj));
    has(d3, 'Sent Oct 17 by Ashley Jerome to rex@hale.example and dana@hale.example, 2 lines', 'the record');
    lacks(d3, 'still unsigned', '⚠ and no claim about the lines this device cannot see');
  });

  G('E · the dashboard draws the card under Keys & access; the desk’s bars carry Send request once each', () => {
    const dash = noComments(fn('renderClientDashboard'));
    const a = dash.indexOf('accessDashHtml(job)'), b = dash.indexOf('approvalRequestDashHtml(job)');
    ok(a > 0 && b > a, 'renderClientDashboard draws approvalRequestDashHtml after accessDashHtml');
    const bar = noComments(fn('_renderInvWorkbar'));
    eq((bar.match(/sendApprovalRequest\(' \+ jid \+ '\)/g) || []).length, 1, 'the work bar: Send request once');
    has(bar, 'Send request', 'labelled Send request');
    const bulk = noComments(fn('_renderInvBulk'));
    eq((bulk.match(/sendApprovalRequest\(' \+ jid \+ ',true\)/g) || []).length, 1, 'the bulk bar: Send request for the selection, once');
    const edit = noComments(fn('_invEdit'));
    has(edit, '_invRefreshReleases(jobId)', '_invEdit repaints the Releases card through the one helper');
    const rel = noComments(fn('_renderInvReleasesCard'));
    has(rel, 'approvalRequestCardHtml(job, all)', 'the Releases card draws the request section');
    ok(rel.indexOf('approvalRequestCardHtml') < rel.indexOf('invApprovalBatches(job, all)'), 'first');
    // openJobDeskFor is openJobPlanFor's twin.
    const desk = noComments(fn('openJobDeskFor'));
    has(desk, "showPanel(\\'inventory\\'", 'presses the desk’s nav button');
    has(desk, "getElementById('inv-job')", 'and checks the desk landed on the job');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('F · the documents say so', () => {
    const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    ['manual.html', 'MANUAL.md', 'concierge-guide.html', 'CONCIERGE_GUIDE.md'].forEach((f) => {
      const t = read(f);
      has(t, 'Send request', f + ' names the button');
      has(t, 'I’ve sent it', f + ' names the confirming tap');
      ok(/every fiduciary with an email/.test(t), f + ' says to whom it goes');
    });
    has(read('MANUAL.md'), 'docState.approvalRequest', 'the manual names the record');
    has(read('manual.html'), 'docState.approvalRequest', 'and its HTML copy');
  });
};
