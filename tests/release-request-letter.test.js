'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// THE RELEASE REQUEST AS A LETTER, AND ONLY FOR WHAT HAS SOMEWHERE TO GO (2026-10-26; Anthony at the desk on the Ellison
// test client: "it's a bit odd to say like verbal approval is never accepted … make it just sound like a little bit more
// normal. Like we're writing a letter asking them for their release and initialing"; "I don't think we need … the initial
// column and for every item say initialled with its group"; "there are no recipients. There's no donation partner
// chosen"; "the only thing I can do is mark I've sent it or open the draft. I can't, I guess, edit it"). His answers:
// "Hold them off", "Keep theirs", and the letter's words ("Use it").
//   · The letter: Dear <every fiduciary>, the items ready to leave, the written approval of each of you, initial where
//     shown, each of you sign and date at the foot; nothing moved until it is back with us, signed by both of you; Thank you.
//   · Hold them off: a line leaving with nobody named to take it (invReleaseRecipientNamed) is never on the request
//     (printApprovalRequest's `held`), refused by name when nothing else is; approvalRequestState's `unnamed`, said on the
//     card and on the Releases bar. A line already gone is still listed for ratification, named or not.
//   · Keep theirs: the Initial column only where a line needs its own initial (invOwnInitial), a box on that line alone.
//   · A waiting draft: a line it carried that changed where it goes, to whom or its value, or went, after the draft was made
//     (approvalRequestChanged, off the record's one fingerprint, `req.sig`) is flagged on the card and the bar, never refused:
//     the draft may already have gone. Discard draft (discardApprovalRequestDraft) lets one go and puts back the request that
//     went before it (`sentReq`, dropped once a send is confirmed). Restated on review, the same day: the first build refused.
// Driven through the real functions on approval-request-send's rig, with only the boundaries stubbed by name.
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

  // ═══════════════════════════════════════════════════════════════════════
  G('L · the letter: Anthony\'s words, addressed to every fiduciary, for one, two or three of them', () => {
    // The words he approved, for the Ellison trustees, byte for byte (whitespace collapsed).
    const two = rig2({ job: TWO() });
    const p2 = two.page();
    eq(two.letter(p2.html), 'Dear Thomas Ellison and Catherine Ellison-Reyes, The items listed below are ready to leave the property. Before anything is moved, '
      + 'we ask for the written approval of each of you. Please initial where shown, then each of you sign and date at the foot and return it to us. '
      + 'Nothing on this list will be moved, sold, donated or disposed of until it is back with us, signed by both of you. Thank you.',
      '⚠⚠ the letter Anthony approved, word for word');
    lacks(p2.html, 'Verbal approval', '⚠ no sentence about verbal approval');
    lacks(p2.html, 'To <strong>', 'and no "To …:" heading in its place');
    // Three fiduciaries: all 3 of you.
    const three = rig2();
    has(three.letter(three.page().html), 'Dear Rex Hale, Dana Hale and Lee Hale,', 'three: each named');
    has(three.letter(three.page().html), 'signed by all 3 of you.', 'and "all 3 of you"');
    // One: you, and no "each of you".
    const one = rig2({ job: ONE(), rows: INVENTORY().slice(1, 2) });
    const l1 = one.letter(one.page().html);
    eq(l1, 'Dear Rex Hale, The item listed below is ready to leave the property. Before anything is moved, we ask for your written approval. '
      + 'Please initial where shown, then sign and date at the foot and return it to us. Nothing on this list will be moved, sold, donated or disposed of until it is back with us, signed by you. Thank you.',
      'one representative, one line: singular throughout');
    // Living work: the client by name, the same promise. (Firearms since 2026-10-26: on a client's own home only a firearm, or
    // a line going to someone who works with Havellin, is asked for in writing; Anthony, "Drop it, firearms aside".)
    const liv = rig2({ job: LIVING(), rows: INVENTORY().slice(0, 2).map((r) => Object.assign(r, { category: 'Firearms' })) });
    const ll = liv.letter(liv.page().html);
    has(ll, 'Dear Margaret Ellis,', 'a living client is addressed by name');
    has(ll, 'signed by you.', 'and signs for themself');
    // Only lines already gone: listed for signature, never "ready to leave", nothing promised about moving.
    const gone = rig2({ job: TWO(), rows: [ROW('g', { itemNo: 9, objectName: 'Clock', disposition: 'Sell', channel: 'Kodner Galleries', dispDate: '2026-10-02' })] });
    const lg = gone.letter(gone.page().html);
    eq(lg, 'Dear Thomas Ellison and Catherine Ellison-Reyes, The item listed below has already left the property and is listed for your signature. '
      + 'Please each of you sign and date at the foot and return it to us. Thank you.', 'a ratification-only request says so');
    // Its email asks for the signature alone: the paper marks nothing for initials (found on review).
    gone.c.sendApprovalRequest(7);
    const gp = mimeParts(gone.N.log.drafts[0] || '');
    has(gp.text, 'Please sign where shown and return the signed copy to us; a scan or a photograph by reply is fine.', '⚠ a ratification-only email asks for the signature');
    lacks(gp.text, 'Please initial', 'and no initials');
    // The email asks for the same, in one sentence.
    two.c.sendApprovalRequest(7);
    const parts = mimeParts(two.N.log.drafts[0] || '');
    has(parts.text, 'Please initial where marked, sign where shown, and return the signed copy to us; a scan or a photograph by reply is fine.', 'the email\'s one sentence');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('H · hold them off: a line leaving with nobody named is not on the request; refused by name when nothing else is', () => {
    const rows = INVENTORY().concat([
      ROW('e', { itemNo: 5, objectName: 'Sofa', fmv: 300, disposition: 'Donate', channel: '' }),
      ROW('f', { itemNo: 6, objectName: 'Old mattress', fmv: 0, disposition: 'Junk', channel: '   ' }),
      ROW('g', { itemNo: 7, objectName: 'Wall clock', fmv: 90, disposition: 'Sell', channel: '', dispDate: '2026-10-02' })]);
    const r = rig2({ rows });
    const p = r.page();
    eq((p.items || []).map((x) => x.stableId), ['a', 'b', 'g'], '⚠⚠ the two named lines and the one already gone; not the sofa or the mattress');
    eq((p.held || []).map((x) => x.stableId), ['e', 'f'], 'the held lines come back by name (a blank of spaces is nobody)');
    lacks(text(p.html), 'Sofa', 'the sofa is not on the page');
    lacks(text(p.html), 'Old mattress', 'nor the mattress');
    has(text(p.html), 'Wall clock', '⚠ a line already gone is listed for ratification, named or not');
    eq([rows[4], rows[5], rows[0]].map((x) => r.c.invReleaseRecipientNamed(x)), [false, false, true], 'one rule: somebody named');
    // Nothing named at all: refused by name, nothing drawn.
    const none = rig2({ rows: [ROW('e', { itemNo: 5, objectName: 'Sofa', disposition: 'Donate' }), ROW('h', { itemNo: 8, objectName: 'Desk', disposition: 'Auction' })] });
    const pn = none.page();
    eq(pn.why, 'Nobody is named to take any of the 2 items waiting for approval yet. Type who takes each on its row (a charity or a hauler confirmed on the Job Plan fills itself in), then send the request.',
      '⚠ refused by name, with what to do');
    eq((pn.held || []).length, 2, 'naming both');
    ok(!pn.html, 'and no page');
    // The bulk bar's selection likewise.
    none.c._invPick = { e: 1 };
    const ps = attempt(() => none.page(true)).val || {};
    has(ps.why, 'Nobody is named to take the item selected yet.', 'a selection of one with nobody named: refused, singular');
    // The send: refused with nothing drafted when nothing has a taker; with some, the notice names what was held.
    none.c.sendApprovalRequest(7);
    eq(none.N.log.drafts.length, 0, 'nothing drafted for a request with nobody named');
    ok(!none.st(), 'nothing recorded');
    has(none.last().m, 'Nobody is named to take', 'the refusal is the printer\'s own');
    r.c.sendApprovalRequest(7);
    eq(r.st().req.stableIds, ['a', 'b', 'g'], 'the record carries what went');
    has(r.last().m, '2 items wait for somebody to be named to take them and are not on it.', '⚠ the notice names the held lines');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('H · the card and the Releases bar say what waits for a taker, before a send and after', () => {
    const rows = INVENTORY().concat([ROW('e', { itemNo: 5, objectName: 'Sofa', fmv: 300, disposition: 'Donate' })]);
    const r = rig2({ rows });
    const S = r.c.approvalRequestState(r.job(), r.c._jobInvRefs(7));
    eq([S.open.length, S.fresh.map((x) => x.stableId), S.unnamed.map((x) => x.stableId)], [0, ['a', 'b'], ['e']], 'state: two fresh, one waiting for a taker');
    const line = '⚠ 1 line waits for somebody to be named to take it, so it is not asked for: type who takes each on its row (a charity or a hauler confirmed on the Job Plan fills itself in).';
    has(text(r.card()), line, 'the card says so before a send');
    has(r.card(), 'sendApprovalRequest(7)', 'and offers the send for the two that can go');
    const bar = attempt(() => r.c.deskFoldState(7, r.job(), 'releases', r.c._jobInvRefs(7), '2026-10-17')).val || { bits: [] };
    has(bar.bits.map((b) => b.text).join(' | '), '1 item waits for somebody to be named to take it', 'the Releases bar\'s line');
    eq((bar.bits.filter((b) => /somebody to be named/.test(b.text))[0] || {}).tone, 'amber', 'in amber');
    r.c.sendApprovalRequest(7);
    has(text(r.card()), line, 'while the draft waits');
    r.c.invMarkRequestSent(7);
    has(text(r.card()), line, 'and once it has gone');
    // Only a line with no taker, nothing ever sent: the card still says so, and offers no send.
    const only = rig2({ rows: [ROW('e', { itemNo: 5, objectName: 'Sofa', disposition: 'Donate' })] });
    has(text(only.card()), '1 line waits for somebody to be named', '⚠ the card is drawn for it alone');
    lacks(only.card(), 'sendApprovalRequest(7)', 'with no send: there is nothing to ask for');
    const ob = attempt(() => only.c.deskFoldState(7, only.job(), 'releases', only.c._jobInvRefs(7), '2026-10-17')).val || {};
    eq(ob.show, true, 'and the bar is shown');
    // On living work nothing else draws the bar (no bequests card): a firearm waiting for a taker is reason enough. An everyday
    // line is not (2026-10-26): the client's word approves it, so nothing waits on a taker for a request.
    const liv = rig2({ job: LIVING(), rows: [ROW('e', { itemNo: 5, objectName: 'Browning rifle', category: 'Firearms', disposition: 'Distribute' })] });
    const lb = attempt(() => liv.c.deskFoldState(7, liv.job(), 'releases', liv.c._jobInvRefs(7), '2026-10-17')).val || { bits: [] };
    eq([lb.show, (lb.bits || []).map((b) => b.text).join(' | ')], [true, '1 item waits for somebody to be named to take it'], '⚠ living work: the bar is drawn for a firearm, and says so');
    const sofa = rig2({ job: LIVING(), rows: [ROW('e', { itemNo: 5, objectName: 'Sofa', disposition: 'Donate' })] });
    const sb = attempt(() => sofa.c.deskFoldState(7, sofa.job(), 'releases', sofa.c._jobInvRefs(7), '2026-10-17')).val || { bits: [] };
    eq(sb.show, false, '⚠⚠ and not for a sofa to be donated: nothing waits on a request');
    // Named, it moves to fresh.
    only.c._photoRefs[7][0].channel = 'Habitat ReStore';
    has(only.card(), 'sendApprovalRequest(7)', 'a taker typed: the send is offered');
    lacks(text(only.card()), 'somebody to be named', 'and the line is gone');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('I · the Initial column only where a line needs its own; a box on that line alone; the group row spans the table', () => {
    const r = rig2({ job: TWO(), rows: [ROW('a', { itemNo: 1, objectName: 'Lamp', fmv: 60, disposition: 'Donate', channel: 'Habitat ReStore' }),
      ROW('b', { itemNo: 2, objectName: 'Chairs', fmv: 120, disposition: 'Donate', channel: 'Habitat ReStore' })] });
    const h = r.page().html || '';
    lacks(h, '>Initial</th>', '⚠⚠ nothing needs its own initial: no column');
    eq((h.match(/class="inv-own-init"/g) || []).length, 0, 'and no box');
    lacks(h, 'initialled with its group', 'no line says it is initialled with its group');
    has(text(h), 'Initial once for the 2 items above going to Habitat ReStore (Donate), each under $500', 'one initial for the group');
    const th = (h.match(/<th /g) || []).length;
    eq(Number((/inv-grp-row"><td colspan="(\d+)"/.exec(h) || [])[1]), th, 'the group row spans every column');
    const big = rig2({ job: TWO(), rows: [ROW('a', { itemNo: 1, objectName: 'Lamp', fmv: 60, disposition: 'Donate', channel: 'Habitat ReStore' }),
      ROW('b', { itemNo: 2, objectName: 'Sargent portrait', fmv: 48000, disposition: 'Auction', channel: 'Christie’s' })] });
    const hb = big.page().html || '';
    has(hb, '>Initial</th>', 'a $48,000 painting needs its own: the column is drawn');
    eq((hb.match(/class="inv-own-init"/g) || []).length, 1, '⚠ one box, on the painting');
    const rowOf = (name) => (hb.split('<tr>').filter((x) => x.indexOf(name) >= 0).pop() || '');   // the line's row, not the caution above the table
    has(rowOf('Sargent portrait'), 'inv-own-init', 'the box is on the painting\'s row');
    lacks(rowOf('Lamp'), 'inv-own-init', 'not on the lamp\'s');
    eq(Number((/inv-grp-row"><td colspan="(\d+)"/.exec(hb) || [])[1]), (hb.match(/<th /g) || []).length, 'and the lamp\'s group row spans the extra column');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('S · a line on a waiting draft changed after it was made: flagged on the card and the bar, never a refusal', () => {
    // ⚠ RESTATED ON REVIEW (2026-10-26): the first build made such a draft out of date, so it could not be confirmed. It may
    // already have gone from Gmail with the tap not yet pressed, an Agent Two figure can move a value at any time, and the
    // overtaken draft's lines then read as the sent request's. It is a flag; Discard draft is the way to redo it.
    const fresh = () => { const r = rig2(); r.c.sendApprovalRequest(7); r.at(NOW + 60e3); return r; };
    const r0 = fresh();
    const req = r0.st().req;
    ok(typeof req.sig === 'string' && req.sig.length > 0 && req.sig.length <= 8, '⚠ the record keeps one short fingerprint (' + req.sig + ')');
    ok(!('lines' in req), '⚠⚠ never a copy of every line: the record rides the job’s one cell on the sheet');
    eq(r0.c.approvalRequestChanged(r0.job(), r0.st()), [], 'fixture: nothing changed');
    const change = (f) => { const r = fresh(); r.edit('b', (x) => { f(x); x.updatedAt = NOW + 60e3; }); return r; };
    [['the recipient', (x) => { x.channel = 'Goodwill'; }], ['the disposition', (x) => { x.disposition = 'Junk'; }], ['the value', (x) => { x.fmv = 900; }],
     ['removed', (x) => { x.deletedAt = NOW + 60e3; }]].forEach(([what, f]) => {
      const r = change(f);
      eq(r.c.approvalRequestChanged(r.job(), r.st()), ['b'], '⚠⚠ ' + what + ': the line is named as changed');
      eq(r.c.draftOutstanding(r.job(), 'approvalRequest'), true, '⚠ ' + what + ': and the draft can still be confirmed (it may have gone)');
    });
    // What does not change the paper is not a change.
    [['the condition', (x) => { x.condition = 'Fair'; }], ['the name', (x) => { x.objectName = 'Eight dining chairs'; }],
     ['the same recipient, spaced', (x) => { x.channel = ' Habitat ReStore '; }], ['a value typed as text', (x) => { x.fmv = '400'; }]].forEach(([what, f]) => {
      const r = change(f);
      eq(r.c.approvalRequestChanged(r.job(), r.st()), [], what + ': nothing flagged');
    });
    // RESTATED 2026-10-27 (P5): no clock. The changed lines are read off the request's own terms, so an edit made before the
    // draft's clock that landed after it (another device's) is a change; a device that has not read the sheet claims nothing.
    const old = fresh();
    old.c._photoRefs[7].filter((x) => x.stableId === 'b')[0].channel = 'Goodwill';   // its updatedAt is still T0, before the draft
    eq(old.c.approvalRequestChanged(old.job(), old.st()), ['b'], '⚠⚠ a change stamped before the draft is still a change (never two devices\' clocks)');
    old.c._invCloudSeen = {};
    eq(old.c.approvalRequestChanged(old.job(), old.st()), [], '⚠⚠ a device that has not read the sheet claims nothing');
    // A device without the manifest claims nothing.
    const r = change((x) => { x.channel = 'Goodwill'; });
    const saved = r.c._photoRefs[7]; r.c._photoRefs[7] = undefined;
    eq(r.c.approvalRequestChanged(r.job(), r.st()), [], 'no manifest: nothing claimed');
    r.c._photoRefs[7] = saved;
    // The card and the bar say so; the tap is still offered, and records the send.
    const card = text(r.card());
    has(card, '⚠ 1 line on this draft changed after it was made (where it goes, who takes it or its value). Not sent yet? Discard draft, then send a fresh request. Already sent? Tap I’ve sent it.',
      '⚠⚠ the card names it, and both ways on');
    has(r.card(), 'invMarkRequestSent(7)', 'the tap is still there');
    has(r.card(), 'discardApprovalRequestDraft(7)', 'and Discard draft');
    const bar = attempt(() => r.c.deskFoldState(7, r.job(), 'releases', r.c._jobInvRefs(7), '2026-10-17')).val || { bits: [] };
    has(bar.bits.map((b) => b.text).join(' | '), '1 item on the draft changed since it was made', 'the Releases bar says so');
    eq(r.c.invMarkRequestSent(7), true, '⚠ already sent from Gmail: the tap records it');
    // RESTATED 2026-10-27 (P5, REL-02): "I've sent it" made every change after it invisible; the line still waits, still changed.
    eq(r.c.approvalRequestChanged(r.job(), r.st()), ['b'], '⚠⚠ and once sent, still flagged while it waits');
    // Once confirmed, what a discarded draft would have put back is gone from the record.
    const s2 = rig2(); s2.c.sendApprovalRequest(7); s2.c.invMarkRequestSent(7); s2.at(NOW + 3600e3); s2.c.sendApprovalRequest(7);
    ok(!!s2.st().sentReq, 'fixture: a draft over a sent request keeps the request that went');
    s2.c.invMarkRequestSent(7);
    ok(!s2.st().sentReq, '⚠ confirmed: the copy is dropped, so the record never carries two for long');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('S · an overtaken draft over a sent request: the card reads the request that went, never the draft’s lines', () => {
    const s = rig2();
    s.c.sendApprovalRequest(7); s.c.invMarkRequestSent(7);
    s.at(NOW + 3600e3);
    s.edit('c', (x) => { x.disposition = 'Sell'; x.channel = 'Kodner Galleries'; x.updatedAt = NOW + 3600e3; });
    s.c.sendApprovalRequest(7);
    eq(s.st().req.stableIds, ['a', 'b', 'c'], 'fixture: the second draft carries three');
    // Every line on it approved by all three before it went: it is overtaken.
    ['a', 'b', 'c'].forEach((id) => s.edit(id, (x) => { x.authBy = ALL_SIGNED; x.approvalDate = '2026-10-17'; }));
    eq(s.c.draftIsStale(s.job(), s.st()), true, 'fixture: the draft is overtaken');
    const S = s.c.approvalRequestState(s.job(), s.c._jobInvRefs(7));
    eq(S.carried, 2, '⚠⚠ the request in force is the one that went (2 lines), never the overtaken draft’s 3');
    has(text(s.card()), 'Sent Oct 17 by Ashley Jerome to rex@hale.example and dana@hale.example, 2 lines · every line on it approved', 'and the card says so');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('D · Discard draft: asks first, lets the draft go, offers the send again; the request that went before it is the record again', () => {
    const r = rig2();
    eq(r.c.discardApprovalRequestDraft(7), false, 'nothing drafted: nothing to discard');
    eq(r.asked.length, 0, 'and nothing asked');
    r.c.sendApprovalRequest(7);
    has(r.card(), 'discardApprovalRequestDraft(7)', '⚠ the waiting draft offers Discard draft');
    // Cancel: nothing changes.
    const no = rig2({}, false);
    no.c.sendApprovalRequest(7);
    const before = JSON.stringify(no.st());
    eq(no.c.discardApprovalRequestDraft(7), false, 'cancelled');
    eq(JSON.stringify(no.st()), before, 'the record untouched');
    // OK on a first draft: the record forgets it.
    eq(r.c.discardApprovalRequestDraft(7), true, 'discarded');
    has(r.asked[0], 'Discard this draft of the Release Approval Request?', 'asked first, by name');
    has(r.asked[0], 'The email itself stays in ' + BOX + ': delete it there.', 'and where the email itself is');
    const st = r.st();
    ok(!st.draftedAt && !st.req && !st.provider && !st.draftUrl, '⚠ the draft and what it carried are gone');
    eq((st.staleDrafts || []).map((d) => d.why), ['discarded'], 'kept as a discarded draft');
    has(text(r.card()), 'The Gmail draft from Oct 17 (' + BOX + ') was discarded on the desk — delete it, don’t send it', 'the card says to delete it');
    has(r.card(), 'sendApprovalRequest(7)', 'and offers the send again');
    has(r.badges[r.badges.length - 1] || '', 'Draft discarded: delete it in ' + BOX, 'the toast');
    eq(r.c.discardApprovalRequestDraft(7), false, 'a second press: nothing to discard');
    // After a send: a second draft discarded puts the first request back.
    const s = rig2();
    s.c.sendApprovalRequest(7);
    s.c.invMarkRequestSent(7);
    const went = JSON.stringify(s.st().req);
    s.at(NOW + 3600e3);
    s.edit('c', (x) => { x.disposition = 'Sell'; x.channel = 'Kodner Galleries'; x.updatedAt = NOW + 3600e3; });
    s.c.sendApprovalRequest(7);
    eq(s.st().req.stableIds, ['a', 'b', 'c'], 'fixture: the second draft carries three');
    eq(JSON.stringify(s.st().sentReq), went, 'the request that went is kept beside it');
    s.c.discardApprovalRequestDraft(7);
    eq(JSON.stringify(s.st().req), went, '⚠⚠ discarded: the request that went is the record again');
    ok(!s.st().sentReq, 'and kept no longer');
    ok(!!s.st().sentAt, 'the send stays recorded');
    const sc = text(s.card());
    has(sc, 'Sent Oct 17 by Ashley Jerome to rex@hale.example and dana@hale.example, 2 lines', 'the card reads the send again');
    has(sc, 'was discarded', 'and names the discarded draft');
    has(sc, '1 line now await approval and were not on it: send a fresh request.', 'and the line it carried is fresh again');
  });
};
