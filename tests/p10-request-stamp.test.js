'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P10 OF THE DESK AUDIT (2026-10-28): THE RELEASE REQUEST CARRIES THE STAMP THE OTHER PAPERS CARRY, AND A FIGURE TYPED ON THE
// DESK SAYS WHY (Anthony's answer to Ask 8). audits/2026-10-27-desk/PLAN.md P10; findings EST-04, NEW-02, VAL-28, LIV-22, DOC-14,
// DOC-15, LIV-01, VAL-07, ROW-10 (and DOC-09, Ask 8's).
//   A · one reader for every stamp: the request (the email PDF and the DocuSign copy), the Donation Record and the living request
//       print _invProgressStamp's words over their own lines, the values' pill beside it bronze until the list is read.
//   B · a line still flagged is marked on its row with what the desk's box names; a line that stands, or one checked, carries none.
//   C · each request value shows its basis; the footer's promise is kept.
//   D · a living ⚑ line keeps its caution once Agent Two values it (LIV-01).
//   E · on Formal, a valued line with no basis stated is a DRAFT reason on both schedules (Q109 keeps the read out of it).
//   F · Ask 8: a figure typed drops the agent's range and opens the one-tap reason; the reason prints with the person's name;
//       unpicked, "Havellin estimate (staff)" under $500 and "basis not stated" in amber at $500 or more; Q105 and Ask 5 stand.
//   G · the No basis chip.
//   H · Send request and Send through DocuSign ask once, and Cancel opens the lines.
//   I · The Evening Desk's sentence held to the request.
//   J · the reason rides the save list, the list's read and the export.
// Driven through the real functions (closure lifts), with only the boundaries stubbed by name.
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
    for (const m of body.matchAll(/[(,=]\s*([A-Za-z_$][\w$]*)\s*[,);]/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) if (ALL_VARS.has(m[1]) && !stopSet.has(m[1])) queue.push(['v', m[1]]);
  }
  return { fns: [...fns], vars: [...vars] };
}
// The closure is worked out once per set of roots and stops (each walk reads the whole file), then reused.
const _closures = new Map();
function lift(roots, stop, stubs) {
  const st = (stop || []).concat(Object.keys(stubs || {})), key = roots.join(',') + '|' + st.slice().sort().join(',');
  if (!_closures.has(key)) _closures.set(key, closure(roots, st));
  const c = _closures.get(key);
  return sandbox({ fns: c.fns, vars: c.vars, stubs: stubs || {} });
}
const inEastern = (body) => { const prev = process.env.TZ; process.env.TZ = 'America/New_York'; try { return body(); } finally { process.env.TZ = prev; } };
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&middot;/g, '·').replace(/&rsquo;/g, '’')
  .replace(/&mdash;/g, '—').replace(/&#10003;/g, '✓').replace(/&#9888;/g, '⚠').replace(/&#9662;/g, '▾').replace(/&nbsp;/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

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

const SYNC = 'https://script.google.com/macros/s/P10STAMP/exec';
const BOX = 'anthony@havellinpalmbeach.com';
function net(media) {
  const log = { uploads: [], pdfs: [], drafts: [], esign: [] };
  let n = 0;
  const fetch = (url, init) => {
    const u = String(url);
    if (init && init.method === 'POST' && u.indexOf(SYNC) === 0) {
      const body = JSON.parse(init.body || '{}');
      if (body.action === 'uploadHtml') { n++; log.uploads.push(body.html); return sp(res({ ok: true, fileUrl: 'https://drive.google.com/file/d/up' + n + '/view', fileId: 'up' + n })); }
      if (body.action === 'getSubfolders') return sp(res({ ok: true, subfolders: null }));
      if (body.action === 'htmlToPdf') { log.pdfs.push(body.html); return sp(res({ ok: true, base64: Buffer.from('%PDF-1.4 ' + 'x'.repeat(150)).toString('base64') })); }
      if (body.action === 'esignSendRequest') { log.esign.push(body); return sp(res({ ok: true, envelopeId: 'env-1', signers: [] })); }
      return sp(res({ ok: true }));
    }
    if (u.indexOf(SYNC) === 0) {
      if (/action=loadMedia/.test(u)) return sp(res({ ok: true, media: { 7: { items: JSON.parse(JSON.stringify(media())) } } }));
      return sp(res({ ok: false }));
    }
    if (u === 'https://www.googleapis.com/oauth2/v3/userinfo') return sp(res({ email: BOX }));
    if (u === 'https://gmail.googleapis.com/gmail/v1/users/me/drafts') { log.drafts.push(init.body); return sp(res({ id: 'r-1', message: { id: 'm-1' } })); }
    return sr(new TypeError('Failed to fetch ' + u));
  };
  return { fetch, log };
}

// ── Fixtures ────────────────────────────────────────────────────────────────
const T0 = Date.parse('2026-10-10T15:00:00Z');
const NOW = Date.parse('2026-10-28T15:00:00Z');
const FixedDate = (t) => class extends Date { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } };
const ESTATE = (o) => Object.assign({
  id: 7, hvlId: 'HVL-0007', name: 'Harold Brennan', svc: 'probate', status: 'active', won: true, approved: true, activatedOn: '2026-10-01',
  addr: '14 Seaspray Ave', city: 'Palm Beach', tc: 'Ashley Jerome', matterType: 'probate', docTier: 'values', deathDate: '2026-08-01',
  executorAuth: 'received', probateCase: '2026-CP-001234', executor: 'Rex Hale', executorRole: 'Personal Representative', executorEmail: 'rex@hale.example',
  coFiduciaries: [], probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law', driveFolder: 'https://drive.google.com/drive/folders/ROOT7',
  driveSubfolders: { 'Estate Inventory': 'INV7', 'Signed Records': 'SR7' }, docState: {}, at: {}, updatedAt: T0, payments: [],
}, o || {});
const LIVING = (o) => Object.assign({
  id: 7, hvlId: 'HVL-0007', name: 'Margaret Ellis', fname: 'Margaret', email: 'meg@ellis.example', svc: 'downsizing_move', status: 'active', won: true, approved: true,
  addr: '9 Dunbar Rd', city: 'Palm Beach', tc: 'Ashley Jerome', driveFolder: 'https://drive.google.com/drive/folders/ROOT7',
  driveSubfolders: { 'Estate Inventory': 'INV7' }, docState: {}, at: {}, updatedAt: T0, payments: [],
}, o || {});
const EST = () => ({ approved: true, estimate: { jobId: 7, rooms: [{ idx: 1, name: 'Study', st: 'in', vol: 3, cplx: 3 }], vendors: [] } });
const ROW = (id, over) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 1, status: 'uploaded', ts: T0, updatedAt: T0,
  objectName: 'Sideboard', category: 'Furniture', qty: 1, condition: 'Good', fmv: 1200, namedBy: 'agent', agentConf: 'high',
  driveFileId: 'f' + id, driveFileUrl: 'https://drive.google.com/file/d/f' + id + '/view' }, over || {});
// #1 an agent's guess (both agents low: flagged); #2 a desk figure under $500, no reason; #3 a desk figure of $4,800, no reason
// (and waiting on an appraisal on an estate); #4 a desk figure with a reason; #5 Agent Two's figure, standing.
const ROWS = () => [
  ROW('a', { itemNo: 1, objectName: 'Walnut dresser', agentConf: 'low', fmv: 450, valuedBy: 'agent', valSource: 'General estimate', valConf: 'low', valNameAt: 'Walnut dresser', valLow: 300, valHigh: 600, disposition: 'Sell', channel: 'Kodner Galleries' }),
  ROW('b', { itemNo: 2, objectName: 'Copper cookware set', fmv: 300, valuedBy: 'desk', disposition: 'Donate', channel: 'Goodwill' }),
  ROW('c', { itemNo: 3, objectName: 'Rolex Datejust', fmv: 4800, valuedBy: 'desk', disposition: 'Consign', channel: 'Kodner Galleries' }),
  ROW('d', { itemNo: 4, objectName: 'Bookcase', fmv: 900, valuedBy: 'desk', valWhy: 'rate', valWhyBy: 'Ashley Jerome', valWhyAt: T0, disposition: 'Sell', channel: 'Kodner Galleries' }),
  ROW('e', { itemNo: 5, objectName: 'Brass lamp', fmv: 80, valuedBy: 'agent', valSource: 'General estimate', valConf: 'high', valNameAt: 'Brass lamp', disposition: 'Donate', channel: 'Goodwill' }),
];
const BOUNDARY = ['_printDocument', 'showSyncBadge', 'savePhotoRefs', '_scheduleInventorySync', 'renderInventoryTab', 'saveJobs', 'syncJobToSheets',
  '_docNotice', '_dashSendState', 'dashNotice', '_dashRedraw', 'gmailAuth', 'loadPhotoRefs', '_saveJobEdit'];
function papers(over) {
  const o = Object.assign({ job: ESTATE(), rows: ROWS(), url: '' }, over || {});
  const seen = { prints: [], badges: [], notices: [], renders: 0, asked: [] };
  const c = lift(['printApprovalRequest', '_invScheduleSection', 'printCourtInventory', 'printTrustSchedule', 'printEstateInventoryReport', 'printDonationRecord',
                  'printContentsRecord', 'printDispositionLedger', 'printContentsList', 'approvalRequestGaps', 'approvalRequestOpenGaps', 'invValBasisWord', 'invBasisDraft',
                  'invBasisMissing', '_invBasisCellHtml', 'invHoldPaperText', '_invHoldMarkHtml', 'invWorkFlags', '_invEdit', 'invPickValueWhy', 'invWhyOpen', 'invWhyClose',
                  '_invWhyHtml', '_invPanelBasisHtml', '_invBulkApply', 'invListSeen', 'invListRead', '_invExportValue', 'buildInventoryPayload',
                  '_renderInvRow', 'invReleaseCautions', '_invCautionBadges', '_invPanelCautionHtml', 'invLineReviewed', 'invAcceptCtx', '_invProgressStamp', '_avUnreviewedStamp']
                  .concat(o.roots || []),
    BOUNDARY.concat(o.stop || []), Object.assign({
      jobs: [o.job], estimateStore: { 7: EST() }, jobPlanStore: {}, _photoRefs: { 7: o.rows }, _invCloudSeen: { 7: true }, changeOrders: [],
      contractors: [], vendorDirectory: [], _invPick: {}, document: domStub({}), SHEETS_SYNC_URL: o.url, Date: FixedDate(NOW),
      _printDocument: (h) => seen.prints.push(h), showSyncBadge: (m) => seen.badges.push(String(m)), savePhotoRefs() {}, _scheduleInventorySync() {},
      renderInventoryTab: () => { seen.renders++; }, saveJobs() {}, syncJobToSheets() {}, _saveJobEdit() {}, loadPhotoRefs() {}, gmailAuth: (cb) => cb('tok'),
      _docNotice: (t, m) => seen.notices.push({ t, m: String(m) }), dashNotice() {}, _dashSendState() {}, _dashRedraw() {},
      confirm: (m) => { seen.asked.push(String(m)); return o.answer !== false; }, alert: (m) => seen.notices.push({ t: 'alert', m: String(m) }),
      prompt: () => (o.link === undefined ? 'https://www.liveauctioneers.com/item/12345' : o.link),
      window: { open() {}, confirm: (m) => { seen.asked.push(String(m)); return o.answer !== false; }, prompt: () => (o.link === undefined ? 'https://www.liveauctioneers.com/item/12345' : o.link), location: {} },
      setTimeout: () => 0, clearTimeout() {},
    }, o.stubs || {}));
  const ref = (id) => c._photoRefs[7].filter((r) => r.stableId === id)[0];
  return { c, seen, ref, job: () => c.jobs[0], req: (opt) => c.printApprovalRequest(7, false, Object.assign({ asHtml: true }, opt || {})),
           fc: () => c.invAcceptCtx(c.jobs[0]) };
}
// The list read as it now stands (Q107), recorded by Anthony.
const readNow = (P) => { P.job().invRead = { at: NOW, by: 'Anthony Graziano', seen: P.c.invListSeen(7) }; };
const tick = (P, id) => { const r = P.ref(id); r.reviewed = true; r.reviewedBy = 'Ashley Jerome'; r.reviewedAt = NOW; if (r.valuedBy === 'agent') { r.valReviewed = true; r.valReviewedBy = 'Ashley Jerome'; } };

module.exports = function ({ group, ok, eq, has, lacks }) {
  const G = (name, body) => { group(name); try { inEastern(body); } catch (e) { ok(false, name + ' — threw: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); } };

  // ═══════════════════════════════════════════════════════════════════════
  G('A · one reader for every stamp: the request (both copies), the Donation Record and the living request print the Report\'s words', () => {
    const P = papers();
    const r = P.req();
    ok(!!(r && r.html), 'the request builds');
    const lines = r.asked.concat(r.ratify);
    const want = P.c._invProgressStamp(lines, { fc: P.fc(), namesOnly: false });
    ok(want.length > 40, 'fixture: the reader stamps the request\'s lines');
    has(r.html, want, '⚠⚠ the email copy carries _invProgressStamp\'s words over its own lines, byte for byte');
    has(text(r.html), 'IN PROGRESS — 2 of 4 items checked; 1 accepted as valued', 'the Report\'s words: checked, and how many stand as the agents left them (Q100)');
    has(r.html, P.c._avUnreviewedStamp(lines, { noAccepted: true, fc: P.fc() }), 'and the values\' pill, as the Report prints it beside its stamp');
    has(text(r.html), '1 value not yet reviewed', 'the pill names the agent figure nobody has looked at');
    ok(r.html.indexOf(want) < r.html.indexOf('inv-req-letter'), 'the stamp sits under the head, above the letter, where the Report puts it');
    // The DocuSign copy is the same printer: the same stamp, its markers aside.
    const ds = P.req({ esign: true });
    has(ds.html, want, '⚠⚠ the DocuSign copy carries the same stamp');
    // Bronze until read; REVIEWED once every flagged line is checked and the list is read (Q107, Q109).
    has(want, 'background:#8a6d3b', 'bronze while unread');
    tick(P, 'a'); tick(P, 'c');
    const notRead = P.req();
    has(text(notRead.html), 'the list not yet read', 'every flagged line checked, the list unread: IN PROGRESS still says so (Q107)');
    readNow(P);
    const done = P.req();
    has(text(done.html), 'REVIEWED — read by Anthony Graziano, October 28, 2026; 4 items checked; 1 accepted as valued', '⚠⚠ REVIEWED, naming the read, once read');
    has(done.html, 'background:#357a50', 'and green');
    // The Donation Record over its charity's lines.
    const D = papers();
    const dr = D.c.printDonationRecord(7, 'b', { asHtml: true });
    ok(!!(dr && dr.html), 'the Donation Record builds');
    const dLines = D.c._photoRefs[7].filter((x) => x.disposition === 'Donate');
    has(dr.html, D.c._invProgressStamp(D.c._invAssignItemNos(7).filter((x) => x.disposition === 'Donate'), { fc: D.fc(), namesOnly: false }), '⚠⚠ the Donation Record carries the stamp over its own lines');
    eq(dLines.length, 2, 'fixture: two lines to Goodwill');
    has(text(dr.html), 'IN PROGRESS', 'and reads IN PROGRESS while its list is unread');
    // A living request (a firearm needs the client's written approval on their own home): the same stamp.
    const L = papers({ job: LIVING(), rows: [ROW('g', { itemNo: 1, objectName: 'Remington 870 pump shotgun', category: 'Firearms', fmv: 500, valuedBy: 'agent', valSource: 'General estimate', valConf: 'high', valNameAt: 'Remington 870 pump shotgun', disposition: 'Sell', channel: 'Palm Beach Guns', serial: 'A123' })] });
    const lr = L.req();
    ok(!!(lr && lr.html), 'the living request builds: ' + (lr && lr.why || ''));
    has(text(lr.html), 'IN PROGRESS', '⚠⚠ the living request is stamped too (LIV-22)');
    has(text(lr.html), 'Needs a look: a firearm or ammunition', 'and its firearm is marked as the desk\'s box marks it');
    // The one reader, counted: every inventory paper calls it, the request and the Donation Record among them.
    ['printApprovalRequest', 'printDonationRecord', 'printEstateInventoryReport', 'printDispositionLedger', 'printContentsRecord', 'printContentsList'].forEach((f) =>
      has(noComments(fn(f)), '_invProgressStamp(', f + ' reads the one stamp'));
    eq((noComments(SRC).match(/\+ '?IN PROGRESS &mdash; /g) || []).length, 0, 'and nothing else writes an IN PROGRESS stamp by hand');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('B · a line still flagged is marked on its row with what the desk\'s box names; a line that stands, or is checked, carries none', () => {
    const P = papers();
    const fc = P.fc();
    eq(P.c.invHoldPaperText(P.ref('a'), fc), 'Needs a look: both agents were guessing', 'both agents guessing: the box\'s words');
    eq(P.c.invHoldPaperText(P.ref('e'), fc), '', 'Agent Two\'s figure standing: no mark (Q106: the stamp speaks for it)');
    eq(P.c.invHoldPaperText(P.ref('b'), fc), '', 'a figure typed on the desk: no mark (Q105)');
    P.ref('a').objectName = 'Walnut dresser, mahogany'; // a figure for an earlier name
    has(P.c.invHoldPaperText(P.ref('a'), P.fc()), 'its value was made for an earlier name', 'a figure for an earlier name, named');
    tick(P, 'a');
    eq(P.c.invHoldPaperText(P.ref('a'), P.fc()), '', 'a line a person ticked: no mark');
    const Q = papers();
    Q.ref('b').disposition = 'Undecided';
    eq(Q.c.invHoldPaperText(Q.ref('b'), Q.fc()), 'Needs a look: no destination yet', 'the desk\'s instructions are left off the paper ("choose where it goes")');
    // On every paper that prints a value per line.
    const R = papers();
    const req = text(R.req().html);
    has(req, 'Walnut dresser Furniture · Study Needs a look: both agents were guessing', '⚠⚠ the request marks the flagged line under its name');
    lacks(req, 'Brass lamp Furniture · Study Needs a look', 'and not the line that stands');
    const ci = R.c.printCourtInventory(7, { asHtml: true });
    has(text(ci.html), 'Walnut dresser Needs a look: both agents were guessing', 'the Court Inventory marks it (DOC-14)');
    const rep = R.c.printEstateInventoryReport(7, { asHtml: true });
    has(text(rep.html), 'Needs a look: both agents were guessing', 'the Estate Inventory Report marks it');
    const ts = papers({ job: ESTATE({ matterType: 'trust', svc: 'cleanout', probateCase: '', executorRole: 'Trustee' }), rows: ROWS().map((x) => Object.assign(x, { assetTrack: 'Trust' })) });
    has(text(ts.c.printTrustSchedule(7, { asHtml: true }).html), 'Walnut dresser Needs a look: both agents were guessing', 'the Trust Schedule marks it');
    const dr = papers({ rows: ROWS().map((x) => Object.assign(x, { disposition: 'Donate', channel: 'Goodwill' })) }).c.printDonationRecord(7, 'a', { asHtml: true });
    has(text(dr.html), 'Walnut dresser Furniture Needs a look: both agents were guessing', 'and the Donation Record');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('C · each request value shows its basis, so the footer\'s "unless an appraisal is noted against the line" can be kept', () => {
    const P = papers({ rows: ROWS().concat([ROW('f', { itemNo: 6, objectName: 'Harbour painting', category: 'Art & Décor', fmv: 3200, valuedBy: 'appraiser', valSource: 'Appraisal', apprDoc: 'Carla Mendes ASA', disposition: 'Consign', channel: 'Kodner Galleries' })]) });
    const t = text(P.req().html);
    has(t, '$450 general estimate', 'Agent Two\'s figure: its source');
    has(t, '$900 the going rate · Ashley Jerome', '⚠⚠ a reason picked on the desk, with who picked it (Ask 8)');
    has(t, '$300 Havellin estimate (staff)', 'a desk figure under $500, unpicked: Havellin\'s estimate');
    has(t, '$4,800 basis not stated', 'at $500 or more, unpicked: basis not stated');
    has(P.req().html, '<span class="inv-basis-missing" style="color:#8a5a1e;">basis not stated</span>', 'in amber');
    has(t, '$3,200 appraisal · Carla Mendes ASA', '⚠ an appraisal names its appraiser (DOC-15)');
    has(t, 'not appraisals unless an appraisal is noted against the line', 'and the footer stays');
    // A line with no figure prints no basis under its dash.
    const Q = papers({ rows: [ROW('n', { itemNo: 1, objectName: 'Box of linens', fmv: '', valuedBy: '', disposition: 'Donate', channel: 'Goodwill' })] });
    lacks(Q.req().html, 'inv-req-basis', 'an unvalued line prints no basis under its dash');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('D · a living ⚑ line keeps its caution once Agent Two values it: only Havellin\'s estimate on record (LIV-01)', () => {
    const flagged = (o) => ROW('l', Object.assign({ itemNo: 3, objectName: 'Oil painting, harbour scene', category: 'Art & Décor', needsAppr: true, disposition: 'Sell', channel: 'Kodner Galleries', fmv: '' }, o || {}));
    const keys = (P) => P.c.invReleaseCautions(P.ref('l'), 7).map((x) => x.key);
    eq(keys(papers({ job: LIVING(), rows: [flagged()] })), ['flaggedUnvalued'], 'no value: the caution, as before');
    const A = papers({ job: LIVING(), rows: [flagged({ fmv: 1200, valuedBy: 'agent', valSource: 'Online comps', valConf: 'high', valNameAt: 'Oil painting, harbour scene' })] });
    eq(keys(A), ['flaggedUnvalued'], '⚠⚠ Agent Two\'s figure does not answer it');
    has(A.c._invCautionBadges(A.ref('l'), 7), 'FLAGGED FOR APPRAISAL, ONLY HAVELLIN’S ESTIMATE ($1,200) ON RECORD', 'and its badge says what is on record');
    const cr = A.c.printContentsRecord(7, { asHtml: true });
    has(text(cr && cr.html), 'FLAGGED FOR APPRAISAL, ONLY HAVELLIN’S ESTIMATE ($1,200) ON RECORD', '⚠⚠ on the Contents Record the client signs');
    has(text(A.c._invPanelCautionHtml(A.job(), A.ref('l'))), 'Flagged for appraisal, only Havellin’s estimate on record.', 'the line\'s record heads it the same way');
    has(text(A.c._invPanelCautionHtml(A.job(), A.ref('l'))), 'with only Havellin’s estimate ($1,200) on record', 'with the line\'s own words');
    eq(keys(papers({ job: LIVING(), rows: [flagged({ fmv: 1200, valuedBy: 'desk' })] })), [], 'a figure a person typed answers it');
    eq(keys(papers({ job: LIVING(), rows: [flagged({ fmv: 1200, valuedBy: 'appraiser', valSource: 'Appraisal' })] })), [], 'so does the appraisal\'s');
    eq(keys(papers({ job: LIVING(), rows: [flagged({ fmv: 1200, valuedBy: 'agent', apprWaived: true })] })), [], 'and a waiver');
    eq(keys(papers({ rows: [flagged({ fmv: 1200, valuedBy: 'agent' })] })).indexOf('flaggedUnvalued'), -1, 'never on an estate');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('E · on Formal a valued line with no basis keeps the schedules DRAFT; on Standard, and once a reason is picked, FINAL (Q109 keeps the read out)', () => {
    const one = () => [ROW('c', { itemNo: 3, objectName: 'Rolex Datejust', category: 'Jewelry & Watches', fmv: 4800, valuedBy: 'desk', disposition: 'Consign', channel: 'Kodner Galleries', apprWaived: true })];
    const F = papers({ job: ESTATE({ docLevel: 'formal' }), rows: one() });
    const ci = text(F.c.printCourtInventory(7, { asHtml: true }).html);
    has(ci, 'DRAFT — 1 valued line with no basis stated (#3 Rolex Datejust)', '⚠⚠ Formal: DRAFT, naming the line');
    has(ci, 'a final copy is issued once the basis of each value is stated', 'and what finishes it');
    lacks(ci, 'Reviewed and adopted by', 'the signature block withheld');
    const S = papers({ job: ESTATE({ docLevel: '', gate706: 'no' }), rows: one() });   // no Form 706: the floor is Standard
    const sci = text(S.c.printCourtInventory(7, { asHtml: true }).html);
    has(sci, 'FINAL', 'Standard: FINAL whatever the basis says');
    lacks(sci, 'with no basis stated', 'and no basis reason');
    F.ref('c').valWhy = 'verbal'; F.ref('c').valWhyBy = 'Anthony Graziano';
    const fixed = text(F.c.printCourtInventory(7, { asHtml: true }).html);
    has(fixed, 'FINAL', 'Formal with the reason picked: FINAL');
    has(fixed, 'an appraiser’s verbal opinion · Anthony Graziano', 'and the reason is the basis');
    const T = papers({ job: ESTATE({ docLevel: 'formal', matterType: 'trust', svc: 'cleanout', probateCase: '', executorRole: 'Trustee' }), rows: one().map((x) => Object.assign(x, { assetTrack: 'Trust' })) });
    has(text(T.c.printTrustSchedule(7, { asHtml: true }).html), 'DRAFT — 1 valued line with no basis stated (#3 Rolex Datejust)', '⚠⚠ the Trust Schedule by the same rule');
    // A line with no figure is the floor's, never a basis gap.
    eq(F.c.invBasisDraft(F.job(), [ROW('z', { fmv: '' })]), null, 'an unvalued line is not counted as a missing basis');
    // Q109: an unread list never makes them DRAFT.
    const R = papers({ job: ESTATE({ docLevel: 'formal' }), rows: [ROW('e', { itemNo: 5, objectName: 'Brass lamp', fmv: 80, valuedBy: 'agent', valSource: 'General estimate', valConf: 'high', valNameAt: 'Brass lamp', disposition: 'Donate', channel: 'Goodwill' })] });
    has(text(R.c.printCourtInventory(7, { asHtml: true }).html), 'FINAL', 'a Formal schedule with the list unread stays FINAL (Q109), its pill bronze');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('F · Ask 8: a figure typed drops the agent\'s range and opens the one-tap reason, which prints with the person\'s name', () => {
    const P = papers({ stubs: { deviceUser: () => 'Ashley Jerome' } });
    const box = (v) => ({ value: v, type: 'text' });
    P.c._invEdit(7, 'a', 'fmv', box('$300'));
    const a = P.ref('a');
    eq([a.fmv, a.valuedBy, a.valLow, a.valHigh, a.valSource], [300, 'desk', undefined, undefined, undefined], '⚠⚠ typed over Agent Two\'s: the desk\'s, the agent\'s range and source gone (VAL-07)');
    eq(P.c._invWhyOpen.a, 1, 'and the reason opens by itself');
    const pick = text(P.c._invWhyHtml(7, a, P.job()));
    has(pick, 'Why $300? A sale’s link Havellin’s own sale The going rate A condition adjustment An appraiser’s verbal opinion Not now', 'the five reasons, one press each, and Not now');
    eq(P.c.invValBasisWord(a, 7), 'Havellin estimate (staff)', 'unpicked under $500: Havellin\'s estimate');
    ok(P.c.invLineAccepted(a, P.fc()), '⚠ Q105: the typed figure is the person\'s look, picked or not');
    ok(P.c.invPickValueWhy(7, 'a', 'condition'), 'one press records it');
    eq([a.valWhy, a.valWhyBy, typeof a.valWhyAt], ['condition', 'Ashley Jerome', 'number'], 'the reason, who (the device\'s user) and when');
    eq(P.c.invValBasisWord(a, 7), 'a condition adjustment · Ashley Jerome', '⚠⚠ the basis the papers print');
    eq(P.c._invWhyOpen.a, 0, 'and the picker closes');
    const rec = text(P.c._invPanelBasisHtml(P.job(), a));
    has(rec, 'Valuation basis a condition adjustment · Ashley Jerome Change the reason', 'the line\'s record shows the basis, with the press to change it');
    eq(text(P.c._invPanelBasisHtml(P.job(), P.ref('e'))), '', 'and nothing on Agent Two\'s figure');
    // A sale's link asks for the link.
    P.c._invEdit(7, 'c', 'fmv', box('$5,000'));
    ok(P.c.invPickValueWhy(7, 'c', 'sale'), 'a sale\'s link');
    eq([P.ref('c').valWhy, P.ref('c').valWhyUrl], ['sale', 'https://www.liveauctioneers.com/item/12345'], 'records the link');
    eq(P.c.invValBasisWord(P.ref('c'), 7), 'a comparable sale · Ashley Jerome', 'and prints as a comparable sale');
    has(P.c.printEstateInventoryReport(7, { asHtml: true }).html, 'A comparable sale · Ashley Jerome <a href="https://www.liveauctioneers.com/item/12345"', 'the Report links the sale');
    const N = papers({ link: 'not a link' });
    N.c._invEdit(7, 'c', 'fmv', box('$5,000'));
    ok(!N.c.invPickValueWhy(7, 'c', 'sale'), 'a sale\'s link that is not a link records nothing');
    eq(N.ref('c').valWhy, undefined, 'nothing recorded');
    // At $500 or more, unpicked: no basis, in amber, on the row and on the papers.
    const U = papers();
    U.c._invEdit(7, 'b', 'fmv', box('$650'));
    U.c.invWhyClose(7, 'b');
    eq(U.c.invValBasisWord(U.ref('b'), 7), '', 'unpicked at $500 or more: no basis');
    ok(U.c.invBasisMissing(U.ref('b'), 7), 'which invBasisMissing answers');
    has(text(U.c._invWhyHtml(7, U.ref('b'), U.job())), 'basis not stated ▾', 'the row says so, with the press that reopens the reason');
    has(U.c._invBasisCellHtml(U.ref('b'), 7), 'color:#8a5a1e;">basis not stated', 'and the papers in amber');
    // A new figure takes the old reason off and asks again.
    U.c.invPickValueWhy(7, 'b', 'own');
    U.c._invEdit(7, 'b', 'fmv', box('$700'));
    eq([U.ref('b').valWhy, U.ref('b').valWhyBy, U.c._invWhyOpen.b], [undefined, undefined, 1], '⚠ a new figure: the reason for the old one goes, and the picker opens again');
    // One basis per figure: a source chosen in the record takes the reason off; a reason picked takes a chosen source off.
    U.c.invPickValueWhy(7, 'b', 'rate');
    U.c._invEdit(7, 'b', 'valSource', { value: 'Dealer quote', type: 'select-one' });
    eq([U.ref('b').valSource, U.ref('b').valWhy], ['Dealer quote', undefined], 'a source chosen: the reason goes');
    eq(U.c.invValBasisWord(U.ref('b'), 7), 'dealer quote', 'and the source is the basis');
    U.c.invPickValueWhy(7, 'b', 'rate');
    eq([U.ref('b').valSource, U.ref('b').valWhy], [undefined, 'rate'], 'a reason picked: the chosen source goes');
    // A copy carrying both (two devices merged, one picking a reason, one a source): the reason picked is the basis.
    const both = Object.assign({}, U.ref('b'), { valSource: 'Dealer quote' });
    eq(U.c.invValBasisWord(both, 7), 'the going rate · Ashley Jerome', '⚠ a reason and a source on one copy: the reason is the basis');
    // The appraisal's figure asks no reason: a line linked to an appraiser on the roster takes a typed figure outright (Q93).
    const Ap = papers({ job: ESTATE({ appraisers: [{ id: 'ap1', name: 'Carla Mendes', firm: 'Mendes Appraisal', credential: 'ASA' }] }) });
    Ap.ref('c').apprId = 'ap1';
    Ap.c._invEdit(7, 'c', 'fmv', box('$5,200'));
    eq([Ap.ref('c').valuedBy, Ap.c._invWhyOpen.c], ['appraiser', 0], '⚠ a figure typed on a linked line is the appraisal\'s, and opens no reason');
    eq(text(Ap.c._invWhyHtml(7, Ap.ref('c'), Ap.job())), '', 'and the row says nothing of a basis');
    // Where counsel values, no paper prints a figure: nothing opens.
    const In = papers({ job: ESTATE({ docTier: 'contents' }) });
    In.c._invEdit(7, 'b', 'fmv', box('$650'));
    eq(In.c._invWhyOpen.b, 0, 'where counsel values (agentValueInternal) the reason is not asked');
    // A refusal on a line with no figure typed on the desk.
    const R = papers();
    ok(!R.c.invPickValueWhy(7, 'e', 'rate'), 'a reason for Agent Two\'s figure is refused');
    has(R.seen.notices.map((n) => n.m).join(' '), 'a reason is given for a figure typed on the desk', 'by name');
    // Ask 5: an approved line's value moving past the rule asks first, and Cancel leaves nothing open and nothing changed.
    const Q = papers({ answer: false });
    Object.assign(Q.ref('b'), { authBy: 'Rex Hale', approvalDate: '2026-10-20', authFor: { disposition: 'Donate', channel: 'Goodwill', fmv: 300 } });
    Q.c._invEdit(7, 'b', 'fmv', box('$900'));
    has(Q.seen.asked.join(' '), 'this change goes on the next request', 'the change asks first (Ask 5)');
    eq([Q.ref('b').fmv, Q.ref('b').valuedBy, Q.c._invWhyOpen.b], [300, 'desk', undefined], '⚠ Cancel: the line as it was, and no reason opened');
    const Q2 = papers({ answer: true });
    Object.assign(Q2.ref('b'), { authBy: 'Rex Hale', approvalDate: '2026-10-20', authFor: { disposition: 'Donate', channel: 'Goodwill', fmv: 300 } });
    Q2.c._invEdit(7, 'b', 'fmv', box('$900'));
    eq([Q2.ref('b').fmv, Q2.c._invWhyOpen.b], [900, 1], 'OK: the figure written, then its reason asked');
    // The bulk bar's Set valuation source takes the reason off as the record does.
    const B = papers({ stubs: { invReadFirst: () => false } });
    B.c._invPick = { d: 1 };
    B.c._invBulkApply(7, 'valSource', 'PR estimate');
    eq([B.ref('d').valSource, B.ref('d').valWhy], ['PR estimate', undefined], 'a source set across a selection takes the reason off');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('G · the No basis chip gathers the lines still without one, wherever a paper prints a figure', () => {
    const P = papers();
    const chip = P.c.invWorkFlags(P.job()).filter((f) => f.key === 'nobasis')[0];
    ok(!!chip, 'an estate on the values tier has the chip');
    eq(chip && chip.label, 'No basis', 'named No basis');
    eq(P.c._photoRefs[7].filter((r) => chip.test(r, P.job())).map((r) => r.stableId), ['c'], '⚠⚠ it gathers the $4,800 typed with no reason, and nothing with a basis');
    P.ref('c').valWhy = 'rate';
    eq(P.c._photoRefs[7].filter((r) => chip.test(r, P.job())).length, 0, 'a reason picked takes it out');
    const L = papers({ job: LIVING() });
    ok(L.c.invWorkFlags(L.job()).some((f) => f.key === 'nobasis'), 'living work prints its figures on its papers too');
    const In = papers({ job: ESTATE({ docTier: 'contents' }) });
    ok(!In.c.invWorkFlags(In.job()).some((f) => f.key === 'nobasis'), 'never where counsel values (no document prints a figure)');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // The send, over the real printer, filing, PDF and Gmail code (release-request-letter's rig, shortened).
  function sendRig(over) {
    const o = Object.assign({ job: ESTATE(), rows: ROWS(), answer: true }, over || {});
    let sheet = JSON.parse(JSON.stringify(o.rows));
    const N = net(() => sheet);
    const shows = [], timers = [];
    const P = papers({ job: o.job, rows: o.rows, url: SYNC, answer: o.answer,
      roots: ['sendApprovalRequest', 'sendApprovalRequestEsign'], stop: ['deskShowLine', 'deskFoldOpen'],
      stubs: Object.assign({ fetch: N.fetch, deskShowLine: (j, id) => { shows.push(id); return true; }, deskFoldOpen() {}, backendHas: () => true,
        setTimeout: (f, ms) => { timers.push(ms); return timers.length; } }, o.stubs || {}) });
    P.timers = timers;
    P.c._invCloudSeen = { 7: true };
    P.N = N; P.shows = shows; P.setSheet = (rows) => { sheet = JSON.parse(JSON.stringify(rows)); };
    return P;
  }
  G('H · Send request and Send through DocuSign ask once, naming the flagged lines and the unread list; Cancel opens them', () => {
    const P = sendRig({ answer: false });
    P.c.sendApprovalRequest(7);
    eq(P.seen.asked.length, 1, '⚠⚠ asked once');
    const q = P.seen.asked[0] || '';
    has(q, '2 lines on this request are still flagged and not yet checked: #1 Walnut dresser (both agents were guessing); #3 Rolex Datejust (waiting on an appraisal).', 'naming each flagged line and why');
    has(q, 'The list has not been read, and 1 line on the request stands as the agents left it.', 'and the unread list (Q107)');
    has(q, 'OK sends it as it is. Cancel sends nothing and opens those lines on the desk.', 'a flag: OK sends');
    eq(P.N.log.drafts.length + P.N.log.uploads.length + P.N.log.pdfs.length, 0, 'Cancel: nothing filed, made or drafted');
    has((P.seen.notices[P.seen.notices.length - 1] || {}).m, 'Not sent. Check the 2 flagged lines (under Not reviewed), then press Send request again.', 'and says what to do');
    eq(P.c._invFilter.flag, 'unreviewed', '⚠ the desk filtered to Not reviewed');
    eq(P.shows, ['a'], 'and the first flagged line opened and shown');
    // OK sends, the paper marked.
    const Y = sendRig({ answer: true });
    Y.c.sendApprovalRequest(7);
    eq(Y.N.log.drafts.length, 1, 'OK: the draft is made');
    eq(Y.timers.filter((ms) => ms === Y.c.APPROVAL_REQ_WATCHDOG_MS).length, 2, 'the send\'s watchdog armed again once the question was answered (the time reading it is not the send\'s)');
    has(text(Y.N.log.pdfs[0] || ''), 'IN PROGRESS', 'and the PDF the fiduciaries get is stamped');
    has(text(Y.N.log.pdfs[0] || ''), 'Needs a look: both agents were guessing', 'with the flagged line marked');
    // Nothing flagged, the list read: no question.
    const C = sendRig({ answer: false });
    tick(C, 'a'); tick(C, 'c');
    readNow(C);
    C.setSheet(C.c._photoRefs[7]);
    readNow(C);
    C.c.sendApprovalRequest(7);
    eq(C.seen.asked.length, 0, '⚠ every flagged line checked and the list read: nothing is asked (no tick on the rest, Q106)');
    eq(C.N.log.drafts.length, 1, 'and it goes');
    // Only the read owed: Cancel goes to the read's line.
    const R = sendRig({ answer: false });
    tick(R, 'a'); tick(R, 'c');
    R.setSheet(R.c._photoRefs[7]);
    R.c.sendApprovalRequest(7);
    has(R.seen.asked.join(''), 'Cancel sends nothing and opens the list’s read on the work bar.', 'only the read owed: Cancel opens the read');
    has((R.seen.notices[R.seen.notices.length - 1] || {}).m, 'press ✓ I’ve read the list on the work bar', 'and the notice names the press');
    // Through DocuSign: the same question, the press named.
    const D = sendRig({ answer: false });
    D.c.sendApprovalRequestEsign(7);
    eq(D.seen.asked.length, 1, '⚠⚠ Send through DocuSign asks the same once');
    eq(D.N.log.esign.length, 0, 'and Cancel sends no envelope');
    has((D.seen.notices[D.seen.notices.length - 1] || {}).m, 'then press Send through DocuSign again', 'naming its own press');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('I · The Evening Desk\'s sentence held to the request: IN PROGRESS until every flagged item is checked', () => {
    const page = fs.readFileSync(path.join(__dirname, '..', 'evening-desk-guide.html'), 'utf8');
    has(text(page), 'Papers print marked IN PROGRESS until every flagged item is checked', 'the page says it');
    has(text(page), 'So does the release request, each item still flagged marked on its row.', 'and names the request among them, with its marks');
    has(text(page), 'On a Formal job a value with no basis keeps them DRAFT too.', 'the Formal schedules\' basis reason, as the page says');
    has(text(page), 'With an item on it still flagged, or the list unread, either send asks once; Cancel opens those items.', 'the send\'s one question, as the page says');
    has(text(page), 'A value you type asks why.', 'the one-tap reason, as the page says…');
    const W = sandbox({ vars: ['INV_VAL_WHY', 'INV_DESK_BASIS_MIN'] });
    has(text(page), W.INV_VAL_WHY.rate.btn, '…naming a reason by its button (' + W.INV_VAL_WHY.rate.btn + ')');
    eq(W.INV_DESK_BASIS_MIN, 500, '…the $500 the page names');
    has(text(page), 'Skip it and it prints as Havellin estimate (staff) under $500, or basis not stated from $500 until you pick; No basis gathers those.', '…unpicked, as the papers print it');
    has(noComments(SRC), "label:'No basis'", '…and No basis is the work bar\'s label');
    const P = papers();
    has(text(P.req().html), 'IN PROGRESS', 'with a flagged line the request is IN PROGRESS');
    tick(P, 'a'); tick(P, 'c'); readNow(P);
    lacks(text(P.req().html), 'IN PROGRESS', 'every flagged item checked and the list read: not IN PROGRESS');
  });

  // ═══════════════════════════════════════════════════════════════════════
  G('J · the reason rides the save list, the list\'s read and the export', () => {
    // The three writers that take the reason off name the same four fields (kept inline: each is lifted alone by many sandboxes).
    const FOUR = "'valWhy', 'valWhyBy', 'valWhyAt', 'valWhyUrl'";
    has(noComments(fn('_avTakeValue')), "['valLow', 'valHigh', " + FOUR + ']', 'a figure typed takes the range and the reason off');
    has(noComments(fn('_invEdit')), "if (key === 'valSource') [" + FOUR + ']', 'a source chosen in the record takes the reason off');
    has(noComments(fn('_invBulkApply')), "if (key === 'valSource') [" + FOUR + ']', 'and across a selection');
    const saved = noComments(fn('savePhotoRefs'));
    ['valWhy:r.valWhy', 'valWhyBy:r.valWhyBy', 'valWhyAt:r.valWhyAt', 'valWhyUrl:r.valWhyUrl'].forEach((k) => has(saved, k, 'the manifest keeps ' + k.split(':')[0]));
    const P = papers();
    readNow(P);
    ok(P.c.invListRead(P.job()).current, 'fixture: the list read');
    P.ref('b').valWhy = 'own'; P.ref('b').valWhyBy = 'Ashley Jerome';
    ok(!P.c.invListRead(P.job()).current, '⚠ a reason picked after the read is a list the read did not see (it prints)');
    const cols = P.c.INVENTORY_COLUMNS.filter((x) => x.key === 'valSource')[0];
    eq(P.c._invExportValue(P.ref('d'), cols, P.job()), 'the going rate · Ashley Jerome', 'the CSV and the workbook carry the reason');
    eq(P.c._invExportValue(P.ref('b'), cols, P.job()), 'the going rate · Ashley Jerome'.replace('the going rate', 'Havellin’s own sale'), 'picked or changed');
    eq(P.c._invExportValue(P.ref('e'), cols, P.job()), 'General estimate', 'and any other source as recorded');
  });
};
