'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P5 · AN APPROVAL MEANS WHAT WAS SIGNED (2026-10-27; the desk audit's P5, audits/2026-10-27-desk/PLAN.md; Anthony's Ask 5:
// "When the value crosses $500 or the appraisal threshold, or rises more than 25%"; "Someone who approved $2,400 did not approve
// $24,000.")
//
// The audit drove it on the real desk: both representatives approved a $2,400 painting for Auction · Kodner Galleries; retyped on
// its row to Distribute · Cousin Pete at $24,000 it stayed approved, was offered for sign-out, and the ledger printed both names
// against a gift neither had seen (EST-01, REL-01, SYN-03). A line changed after "I've sent it" was recorded at its new terms
// (REL-02); the bulk request took Keep and approved lines (REL-07); a name typed into Authorized By counted as written approval
// (REL-05); an approval dated after today went on every paper (REL-26).
//   · authFor: what the signed paper approved, written by the one writer (invApplyApproval) on every route, kept once recorded.
//   · invApprovalMoved: the one answer; invApprovalComplete stops holding, so the sign-out, the firearm gates and the papers follow.
//   · Ask 5's value rule, one definition (invApprovalValueMoved), read by an approval, the email request and the DocuSign envelope.
//   · A person's change asks once (_invEdit, _invBulkApply); the next approval moves the old one to authWas and starts afresh.
//   · The request carries its terms line by line (req.terms), and its changed lines are read off them, never a clock.
//   · The bulk request and Record approval take only lines that wait on written approval, and say what they left out.
//   · Authorized By and Approval Date are read-only; Correct… with a reason; a date after today refused, one before the request
//     went flagged.
//   · The merge carries authFor, authWas and authFixes with the approval they belong to, the app and the server alike.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sandbox, source, fn, decl, domStub } = require('./harness');

const SRC = source();
const GS_INV = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'saveInventory.gs'), 'utf8');
const GS_MAIN = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
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
  return { fns: [...fns].filter((n) => ALL_FNS.has(n)), vars: [...vars] };
}
function lift(roots, stop, stubs) {
  const c = closure(roots, (stop || []).concat(Object.keys(stubs || {})));
  return sandbox({ fns: c.fns, vars: c.vars, stubs: stubs || {} });
}
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }
const inEastern = (body) => { const prev = process.env.TZ; process.env.TZ = 'America/New_York'; try { return body(); } finally { process.env.TZ = prev; } };
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&middot;/g, '·').replace(/&rsquo;/g, '’')
  .replace(/&mdash;/g, '—').replace(/&#10003;/g, '✓').replace(/&#128231;/g, '📧').replace(/&#9888;/g, '⚠').replace(/&#8599;/g, '↗')
  .replace(/&hellip;/g, '…').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

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

// The fake network: the Apps Script /exec (GET loadMedia; POST uploadHtml, htmlToPdf, getSubfolders), Google's userinfo and
// the Gmail drafts endpoint.
const SYNC = 'https://script.google.com/macros/s/APPROVALPIN/exec';
const BOX = 'anthony@havellinpalmbeach.com';
function net(media) {
  const log = { drafts: [] };
  let n = 0;
  const fetch = (url, init) => {
    const u = String(url);
    if (init && init.method === 'POST' && u.indexOf(SYNC) === 0) {
      const body = JSON.parse(init.body || '{}');
      if (body.action === 'uploadHtml') { n++; return sp(res({ ok: true, fileUrl: 'https://drive.google.com/file/d/up' + n + '/view', fileId: 'up' + n })); }
      if (body.action === 'getSubfolders') return sp(res({ ok: true, subfolders: null }));
      if (body.action === 'htmlToPdf') return sp(res({ ok: true, base64: Buffer.from('%PDF-1.4 ' + 'x'.repeat(150)).toString('base64') }));
      return sp(res({ ok: true }));
    }
    if (u.indexOf(SYNC) === 0) {
      if (/action=loadMedia/.test(u)) return sp(res({ ok: true, media: media }));
      return sp(res({ ok: false }));
    }
    if (u === 'https://www.googleapis.com/oauth2/v3/userinfo') return sp(res({ email: BOX }));
    if (u === 'https://gmail.googleapis.com/gmail/v1/users/me/drafts') {
      log.drafts.push(1);
      return sp(res({ id: 'r-' + log.drafts.length, message: { id: 'm-' + log.drafts.length } }));
    }
    return sr(new TypeError('Failed to fetch ' + u));
  };
  return { fetch, log };
}

// ── Fixtures: the Ashworth estate, both representatives with an email ─────────────────────────────────────────────────
const NOW = Date.parse('2026-10-20T15:00:00Z');   // Oct 20, 11:00 Eastern
const T0 = Date.parse('2026-10-10T15:00:00Z');
const FixedDate = (t) => class extends Date { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } };
const ESTATE = (o) => Object.assign({
  id: 7, hvlId: 'HVL-0007', name: 'Harold Ashworth', svc: 'probate', status: 'active', won: true, approved: true,
  addr: '14 Seaspray Ave', city: 'Palm Beach', tc: 'Ashley Jerome', agrApprovedBy: 'Anthony Graziano',
  matterType: 'probate', docTier: 'values', deathDate: '2026-08-01', executorAuth: 'received', probateCase: '2026-CP-001234',
  executor: 'Thomas Ashworth', executorRole: 'Personal Representative', executorEmail: 'tom@ashworth.example', executorPhone: '(561) 555-0101',
  coFiduciaries: [{ id: 'c1', name: 'Nora Ashworth', role: 'Co-Personal Representative', email: 'nora@ashworth.example', phone: '' }],
  probateAttyName: 'Ann Lowe', probateAttyFirm: 'Lowe & Co', probateAttyEmail: 'ann@lowe.law',
  driveFolder: 'https://drive.google.com/drive/folders/ROOT7',
  driveSubfolders: { 'Estate Inventory': 'INV7', 'As-Found Record': 'AF7', 'Signed Records': 'SR7' },
  docState: {}, at: {}, updatedAt: T0, payments: [],
}, o || {});
const EST = () => ({ approved: true, estimate: { jobId: 7, svc: 'probate', havellinTotal: 24000, rooms: [{ idx: 1, name: 'Study', st: 'in', vol: 3, cplx: 3 }], vendors: [] } });
const ROW = (id, over) => Object.assign({
  stableId: id, label: 'inventory', collId: null, roomIdx: 1, status: 'uploaded', ts: T0, updatedAt: T0, namedBy: 'desk',
  objectName: 'Sideboard', category: 'Furniture', qty: 1, condition: 'Good', valSource: 'Comparable sales',
  driveFileId: 'f' + id, driveFileUrl: 'https://drive.google.com/file/d/f' + id + '/view',
}, over || {});
const BOTH = 'Thomas Ashworth; Nora Ashworth';
const KODNER = { disposition: 'Auction', channel: 'Kodner Galleries', fmv: 2400 };
const PAINTING = () => ROW('e1', { itemNo: 1, objectName: 'Harbor scene oil painting', category: 'Art & Décor', fmv: 2400, disposition: 'Auction',
  channel: 'Kodner Galleries', authBy: BOTH, approvalDate: '2026-10-12', authFor: Object.assign({}, KODNER) });
const DRESSER = () => ROW('e2', { itemNo: 2, objectName: 'Walnut dresser', fmv: 450, disposition: 'Sell', channel: 'Palm Beach Estate Buyers' });
const CHAIRS = () => ROW('e4', { itemNo: 4, objectName: 'Dining chairs', fmv: 300, disposition: 'Donate', channel: 'Goodwill Palm Beach' });
const MIXER = () => ROW('e18', { itemNo: 18, objectName: 'Stand mixer', fmv: 80, disposition: 'Keep' });
const INVENTORY = () => [PAINTING(), DRESSER(), CHAIRS(), MIXER()];

const BOUNDARY = ['saveJobs', 'syncJobToSheets', '_docNotice', '_dashSendState', 'showSyncBadge', 'dashNotice', '_dashRedraw', 'gmailAuth',
  'savePhotoRefs', '_primeAgreementFor', '_primeEstimateFor', 'markAgreementSent', 'markEstimateSent', 'loadPhotoRefs', '_printDocument',
  'renderInventoryTab', '_scheduleInventorySync', 'alert', '_invPrintThumb', '_invThumbHTML', '_invRefreshSummary', '_invRefreshGuardrail',
  '_invRefreshFlagStrip', '_invRefreshRecords', '_invRefreshReleases', '_invRefreshAgentNotices', '_invReviewRepaint', '_invReadLineRepaint',
  'agentValueAfterRename', '_invPaintFigures', '_deskFoldHeadsRepaint'];

module.exports = function ({ group, ok, eq, has, lacks }) {
  const G = (name, body) => { group(name); try { inEastern(body); } catch (e) { ok(false, name + ' — threw: ' + String(e && e.message || e).split('\n')[0]); } };

  // The desk over the real code, with the boundaries stubbed by name. `asks` is what window.confirm was asked, `answer` its answer.
  function rig(over) {
    const o = Object.assign({ job: ESTATE(), rows: INVENTORY(), roots: [], answer: true }, over || {});
    const media = { 7: { items: JSON.parse(JSON.stringify(o.rows)) } };
    const N = net(media);
    const log = { notices: [], badges: [], alerts: [], asks: [], renders: 0, saves: 0, painted: 0 };
    const dom = domStub({});
    const c = lift(['sendApprovalRequest', 'invMarkRequestSent', '_renderInvReleasesCard', 'printApprovalRequest', '_invAwaitingApproval',
      'approvalRequestState', 'approvalRequestChanged', 'deskFoldState', 'invRecordRequestApproval', 'invRecordApproval', 'invSaveApproval',
      'invApprovalDialogNote', 'closeInvApproval', 'invApprovalComplete', 'signoutGroups', 'printDispositionLedger', '_invEdit', '_invBulkApply',
      '_renderInvBulk', '_invCell', 'invCorrectApproval', 'invSaveApprovalFix', 'invApplyApproval', 'invWrittenReleasePicked',
      'invWrittenReleaseLeftOutText', 'invTransportBlocked', 'invTransportReason', '_renderInvRow', 'approvalEnvelopeApply', 'approvalEnvelopeChanged',
      'mergeMediaItems', '_invExportValue', 'invApprovalWithSigners', 'invApprovalLeftOpen'].concat(o.roots),
      BOUNDARY, Object.assign({
        jobs: [o.job], estimateStore: { 7: EST() }, jobPlanStore: {}, _photoRefs: { 7: JSON.parse(JSON.stringify(o.rows)) }, changeOrders: [],
        contractors: [], vendorDirectory: [], _invPick: {}, _invOpen: {}, _invFilter: { when: 'all', room: '', q: '', flag: '' }, _invBulkLast: null,
        _agDupSet: {}, _invThumbFailed: {},
        SHEETS_SYNC_URL: SYNC, fetch: N.fetch, document: dom, setTimeout: () => 0, clearTimeout() {}, Date: FixedDate(NOW),
        window: { open() {}, location: { href: '' }, confirm: (m) => { log.asks.push(String(m)); return o.answer; } },
        gmailAuth: (cb) => cb('tok-pin'), loadPhotoRefs() {}, savePhotoRefs() { log.saves++; }, _printDocument() { return true; },
        saveJobs() {}, syncJobToSheets() {}, _dashRedraw() {}, _invPrintThumb: () => '', _invThumbHTML: () => '<div></div>',
        _docNotice: (t, m) => log.notices.push({ t, m: String(m) }), dashNotice: (t, m) => log.notices.push({ t, m: String(m) }),
        _dashSendState() {}, showSyncBadge: (m) => log.badges.push(String(m)), alert: (m) => log.alerts.push(String(m)),
        renderInventoryTab: () => { log.renders++; }, _scheduleInventorySync() {}, _invRefreshSummary() {}, _invRefreshGuardrail() {},
        _invRefreshFlagStrip() {}, _invRefreshRecords() {}, _invRefreshReleases() {}, _invRefreshAgentNotices() {}, _invReviewRepaint() {},
        _invReadLineRepaint() {}, agentValueAfterRename() {}, _invPaintFigures: () => { log.painted++; }, _deskFoldHeadsRepaint() {},
      }, o.stubs || {}));
    c._invCloudSeen = { 7: true };
    const R = { c, N, dom, log, media, job: () => c.jobs[0], row: (id) => c._photoRefs[7].find((x) => x.stableId === id) || {},
      st: () => (c.jobs[0].docState || {}).approvalRequest, card: () => text(c._renderInvReleasesCard(c.jobs[0], c._jobInvRefs(7))),
      el: (id) => dom.getElementById(id), at: (t) => { c.Date = FixedDate(t); } };
    // An edit made on the desk, as a person makes it: the row's control, then _invEdit.
    R.edit = (id, key, value) => { const el = { value: value, type: 'text' }; c._invEdit(7, id, key, el); return el; };
    // An edit that lands from the sheet (another device): both copies changed, no question asked.
    R.land = (id, f) => [c._photoRefs[7], media[7].items].forEach((list) => list.filter((x) => x.stableId === id).forEach(f));
    R.asDrawn = () => {
      const body = R.el('ia-body').innerHTML;
      for (const m of body.matchAll(/id="(ia-line-\d+)"( checked)?/g)) R.el(m[1]).checked = !!m[2];
      const d = /id="ia-date" value="([^"]*)"/.exec(body);
      R.el('ia-date').value = d ? d[1] : '';
      return body;
    };
    R.bar = () => (attempt(() => c.deskFoldState(7, c.jobs[0], 'releases', c._jobInvRefs(7), '2026-10-20')).val || { bits: [] });
    return R;
  }

  // ═══════════════════════════════════════════════════════════════════════
  G('A · Ask 5, one rule: crossing $500 or the appraisal threshold, or rising more than 25%; a fall never', () => {
    const R = rig();
    const J = R.job(), D = ESTATE({ svc: 'contested_probate' });
    const mv = (was, now, job) => R.c.invApprovalValueMoved(was, now, job || J);
    eq([R.c.INV_APPROVAL_RISE_PCT, R.c.INV_LINE_INITIAL_MIN, R.c.invAppraisalThreshold(J)], [25, 500, 3000], 'fixture: 25%, the $500 line, the $3,000 threshold');
    eq([mv(2400, 24000), mv(2400, 2900), mv(2400, 3000), mv(2400, 2999)], [true, false, true, false],
      '⚠⚠ $2,400 approved: $24,000 goes back, $2,900 (21%) does not, $3,000 crosses the threshold');
    eq([mv(450, 500), mv(450, 499), mv(100, 126), mv(100, 125)], [true, false, true, false], 'the $500 line; more than 25%, never exactly 25%');
    eq([mv('', 400), mv('', 600), mv('', 3500)], [false, true, true], 'approved with no value: a figure past a line goes back, one under it does not');
    eq([mv(3500, 2000), mv(600, 450), mv(600, ''), mv(600, null)], [false, false, false, false], '⚠ a value that falls, or is cleared, never sends a line back');
    eq([mv('2400', '$24,000'.replace(/[$,]/g, '')), mv('450', '480')], [true, false], 'a value stored as text reads as its number');
    ok(R.c.invAppraisalThreshold(D) <= 500 && mv(400, 520, D), 'on a disputed estate the threshold is $500, and the rule reads it');
    // The one answer, for the painting approved for Auction · Kodner Galleries at $2,400.
    const p = PAINTING();
    const moved = (over) => R.c.invApprovalMoved(Object.assign(PAINTING(), over), J);
    eq(moved({}), '', 'as approved: covered');
    eq([moved({ disposition: 'Distribute' }), moved({ channel: 'Cousin Pete Ashworth' }), moved({ fmv: 24000 })], ['dest', 'dest', 'value'],
      '⚠⚠ another destination, another taker, a value past the rule');
    eq([moved({ channel: '  kodner galleries ' }), moved({ channel: 'Kodner Galleries (Boca)' }), moved({ fmv: 2900 })], ['', '', ''],
      'a spelling or a bracketed note is the same taker; a value within the rule is the same approval');
    eq([moved({ authFor: undefined, channel: 'Cousin Pete' }), moved({ authBy: '', channel: 'Cousin Pete' })], ['', ''],
      'nothing recorded of what it approved, or no approval: nothing seen to move');
    eq(R.c.invApprovalPrevWords(Object.assign(p, { channel: 'Cousin Pete Ashworth' }), J), 'previously approved for Auction · Kodner Galleries', 'the line\'s words');
    eq(R.c.invApprovalPrevWords(Object.assign(PAINTING(), { fmv: 24000 }), J), 'previously approved for Auction · Kodner Galleries at $2,400', 'with the value where the value moved');
  });

  G('B · ⚠⚠ an approval that no longer covers the line is no approval: the sign-out, the request, the ledger, the firearm gate follow; undone, it covers again', () => {
    const R = rig();
    const J = R.job();
    ok(R.c.invApprovalComplete(R.row('e1'), J), 'fixture: the painting is approved by both');
    const ready = () => (R.c.signoutGroups(J, R.c._jobInvRefs(7)).filter((g) => g.ready.some((r) => r.stableId === 'e1'))[0] || {}).taker || '';
    eq(ready(), 'Kodner Galleries', 'fixture: offered for sign-out to Kodner');
    // Another device retyped it (it lands from the sheet: nobody here was asked).
    R.land('e1', (x) => { x.disposition = 'Distribute'; x.channel = 'Cousin Pete Ashworth'; });
    ok(!R.c.invApprovalComplete(R.row('e1'), J), '⚠⚠ re-routed: no longer approved (EST-01, REL-01, SYN-03)');
    eq(ready(), '', '⚠⚠ and never offered for sign-out to the cousin');
    eq(R.c._invAwaitingApproval(7).map((r) => r.stableId), ['e1', 'e2', 'e4'], 'it goes on the next request with the lines waiting');
    const page = text((R.c.printApprovalRequest(7, false, { asHtml: true }) || {}).html);
    has(page, 'Previously approved for Auction · Kodner Galleries (Oct 12, 2026): asked for again as it now reads', '⚠ the request says what it was approved for');
    const L = R.c.printDispositionLedger(7, { asHtml: true }) || {};
    const ledger = text(L.html);
    has(ledger, 'Not approved as it now reads: previously approved for Auction · Kodner Galleries by Thomas Ashworth; Nora Ashworth (Oct 12, 2026)',
      '⚠⚠ the ledger prints no approval the paper does not support');
    eq(R.c._invExportValue(R.row('e1'), { key: 'authBy' }, J), 'Not approved as it now reads: previously approved for Auction · Kodner Galleries by Thomas Ashworth; Nora Ashworth (Oct 12, 2026)',
      'the client\'s workbook and the CSV, the same words');
    ok(R.c.invApprovalMissing(R.row('e1'), J).length === 2, 'nobody has approved it as it reads: both still to sign');
    has(R.c.invApprovalGap(R.row('e1'), J), 'Approved Oct 12, 2026 by Thomas Ashworth and Nora Ashworth for Auction · Kodner Galleries; it now goes to Distribute · Cousin Pete Ashworth, which that approval does not cover: it goes on the next request.', 'the flag says what it was for');
    // The desk row's chip (found by the sweep: only browser step 118 read it).
    const rowHtml = String((attempt(() => R.c._renderInvRow(J, R.row('e1'))).val) || '');
    has(text(rowHtml), 'previously approved for Auction · Kodner Galleries', '⚠⚠ the row says what it was approved for');
    ok(/class="inv-prev-chip"[^>]*title="[^"]*it now goes to Distribute/.test(rowHtml), 'its title the whole sentence, what it goes to now');
    lacks(text(rowHtml), 'approval incomplete', 'and never "approval incomplete" over the signers\' names');
    // Put back: the approval covers it again.
    R.land('e1', (x) => { x.disposition = 'Auction'; x.channel = 'Kodner Galleries'; });
    ok(R.c.invApprovalComplete(R.row('e1'), J), '⚠ undone: the signed approval covers it again');
    // A value an agent moved past the rule: the same comparison, nobody asked.
    R.land('e1', (x) => { x.fmv = 24000; });
    ok(!R.c.invApprovalComplete(R.row('e1'), J), '⚠⚠ $24,000: the approval given at $2,400 does not cover it');
    R.land('e1', (x) => { x.fmv = 2900; });
    ok(R.c.invApprovalComplete(R.row('e1'), J), 'within the rule: still approved');
    // A firearm approved for one dealer and moved to another: held again.
    const gun = ROW('g', { itemNo: 9, objectName: 'Browning shotgun', category: 'Firearms', disposition: 'Sell', channel: 'Palm Beach Arms', serial: 'BR123', fmv: 900,
      authBy: BOTH, approvalDate: '2026-10-12', authFor: { disposition: 'Sell', channel: 'Palm Beach Arms', fmv: 900 } });
    R.c._photoRefs[7].push(gun);
    eq(R.c.invTransportBlocked(gun, J), '', 'fixture: cleared to carry to the dealer named');
    gun.channel = 'Jupiter Gun Exchange';
    eq(R.c.invTransportBlocked(gun, J), 'authority', '⚠⚠ another dealer: no written authority for it');
    has(R.c.invTransportReason(gun, J), 'Written authority is not complete. Approved Oct 12, 2026 by Thomas Ashworth and Nora Ashworth for Sell · Palm Beach Arms', 'and the reason says why');
  });

  G('C · ⚠⚠ a change the approval does not cover asks once, on the row; Cancel puts the line back; OK keeps the approval as what was signed', () => {
    const R = rig({ answer: false });
    const J = R.job();
    const el = R.edit('e1', 'channel', 'Cousin Pete Ashworth');
    eq(R.log.asks.length, 1, 'asked once');
    eq(R.log.asks[0], '#1 Harbor scene oil painting\n\nApproved Oct 12, 2026 by Thomas and Nora for Auction · Kodner Galleries: this change goes on the next request.\n\n'
      + 'Going to Auction · Cousin Pete Ashworth, the signed approval no longer covers it, so it is not offered for sign-out until it is approved again. The approval stays on the line as what was signed.'
      + '\n\nOK makes the change. Cancel leaves the line as it was approved.', '⚠⚠ who approved it, when, for what, and where the change leaves it');
    eq([R.row('e1').channel, el.value, R.log.saves], ['Kodner Galleries', 'Kodner Galleries', 0], '⚠ Cancel: the line and the box as they were, nothing saved');
    ok(R.c.invApprovalComplete(R.row('e1'), J), 'still approved');
    // A value past the rule asks; within it, nothing.
    R.edit('e1', 'fmv', '$2,900');
    eq([R.log.asks.length, R.row('e1').fmv], [1, 2900], 'within the rule: no question, the figure written');
    R.edit('e1', 'fmv', '$24,000');
    eq(R.log.asks.length, 2, 'past it: asked');
    has(R.log.asks[1], 'At $24,000, the signed approval no longer covers it', 'naming the value');
    eq(R.row('e1').fmv, 2900, '⚠ Cancel: the figure as it was');
    ok(R.log.painted >= 1, 'and the boxes repainted to it');
    // OK: written, the approval kept as what was signed, the line waiting.
    const Y = rig({ answer: true, stubs: { _invPick: { e1: 1 } } });
    Y.edit('e1', 'disposition', 'Distribute');
    eq(Y.log.asks.length, 1, 'asked once');
    has(Y.el('inv-bulk-7').outerHTML || '', 'invRecordApproval(7)', '⚠ the bulk bar, with the painting picked, offers Record approval again (repainted by id)');
    eq([Y.row('e1').disposition, Y.row('e1').authBy, JSON.stringify(Y.row('e1').authFor)], ['Distribute', BOTH, JSON.stringify(KODNER)], '⚠⚠ OK: written; the approval stays, for what it was');
    ok(!Y.c.invApprovalComplete(Y.row('e1'), Y.job()), 'and no longer counts');
    Y.edit('e1', 'channel', 'Margaret Ashworth');
    eq(Y.log.asks.length, 1, '⚠ asked once: a further change to a line already waiting asks nothing');
    // A line with no approval, and an approval with nothing recorded of what it approved.
    Y.edit('e2', 'channel', 'Kodner Galleries');
    eq(Y.log.asks.length, 1, 'a line with no approval: nothing to ask');
    const P = rig({ answer: true, rows: [Object.assign(PAINTING(), { authFor: undefined })] });
    ok(P.c.invApprovalComplete(P.row('e1'), P.job()), 'fixture: an approval with no record of what it approved reads as covering the line');
    P.edit('e1', 'channel', 'Cousin Pete Ashworth');
    eq(P.log.asks.length, 1, '⚠ its first change asks');
    eq(JSON.stringify(P.row('e1').authFor), JSON.stringify(KODNER), '⚠⚠ and pins it to the line as it read just before');
    ok(!P.c.invApprovalComplete(P.row('e1'), P.job()), 'so the change is seen');
  });

  G('D · a selection swept to another taker asks once for every approved line it moves; Cancel writes nothing', () => {
    const R = rig({ answer: false, stubs: { _invPick: { e1: 1, e2: 1 } } });
    R.c._invBulkApply(7, 'channel', 'Habitat ReStore');
    eq(R.log.asks.length, 1, 'one question for the selection');
    has(R.log.asks[0], '#1 Harbor scene oil painting: approved Oct 12, 2026 by Thomas and Nora for Auction · Kodner Galleries', 'naming the approved line and what it was approved for');
    lacks(R.log.asks[0], 'Walnut dresser', 'never a line with no approval');
    eq([R.row('e1').channel, R.row('e2').channel], ['Kodner Galleries', 'Palm Beach Estate Buyers'], '⚠ Cancel: nothing written, on any line');
    const Y = rig({ answer: true, stubs: { _invPick: { e1: 1, e2: 1 } } });
    Y.c._invBulkApply(7, 'channel', 'Habitat ReStore');
    eq([Y.row('e1').channel, Y.row('e2').channel], ['Habitat ReStore', 'Habitat ReStore'], 'OK: the sweep written');
    ok(!Y.c.invApprovalComplete(Y.row('e1'), Y.job()), 'and the painting waits on a fresh approval');
  });

  G('E · the one writer pins what was signed; the next approval over a moved one starts afresh and keeps the old one in authWas', () => {
    const R = rig();
    const J = R.job();
    R.c.invApplyApproval(7, [R.row('e2')], ['Thomas Ashworth'], '2026-10-18');
    eq(JSON.stringify(R.row('e2').authFor), JSON.stringify({ disposition: 'Sell', channel: 'Palm Beach Estate Buyers', fmv: 450 }), '⚠⚠ a new approval pinned to the line as signed');
    R.land('e2', (x) => { x.fmv = 480; });
    R.c.invApplyApproval(7, [R.row('e2')], ['Nora Ashworth'], '2026-10-19');
    eq([R.row('e2').authBy, R.row('e2').authFor.fmv], ['Thomas Ashworth (2026-10-18); Nora Ashworth (2026-10-19)', 450], 'a second signer of the same terms adds to the first, the pin kept');
    ok(R.c.invApprovalComplete(R.row('e2'), J), 'both: approved');
    // The painting retyped, then approved again for where it goes now.
    R.land('e1', (x) => { x.disposition = 'Distribute'; x.channel = 'Margaret Ashworth'; });
    const left = R.c.invApprovalLeftOpen(J, [R.row('e1')], ['Nora Ashworth'], '2026-10-20');
    eq(left.missing, ['Thomas Ashworth'], '⚠ the dialog\'s note: Thomas\'s signature on the old terms does not count for the new');
    R.c.invApplyApproval(7, [R.row('e1')], ['Thomas Ashworth', 'Nora Ashworth'], '2026-10-20');
    const p = R.row('e1');
    eq([p.authBy, p.approvalDate], [BOTH, '2026-10-20'], '⚠⚠ a fresh approval, never added to the old one (which kept the first dates)');
    eq(JSON.stringify(p.authFor), JSON.stringify({ disposition: 'Distribute', channel: 'Margaret Ashworth', fmv: 2400 }), 'pinned to where it goes now');
    eq(p.authWas.map((w) => [w.authBy, w.approvalDate, w.authFor.channel, w.replacedOn]), [[BOTH, '2026-10-12', 'Kodner Galleries', '2026-10-20']], '⚠ the earlier approval kept, as what was signed');
    ok(p.authBySetAt >= NOW, 'stamped, so a merge keeps it over a copy still holding the old one');
    ok(R.c.invApprovalComplete(p, J), 'approved for the cousin\'s mother now');
    // A request's terms pin the paper's value.
    R.c.invApplyApproval(7, [R.row('e4')], [BOTH], '2026-10-20', { e4: { disposition: 'Donate', channel: 'Goodwill Palm Beach', fmv: 250 } });
    eq(R.row('e4').authFor.fmv, 250, 'signed off a request: the value the paper printed');
  });

  G('F · ⚠⚠ the request carries its terms line by line; a line changed after "I\'ve sent it" is flagged off them, never a clock', () => {
    const R = rig();
    R.c.sendApprovalRequest(7);
    R.c.invMarkRequestSent(7);
    const req = R.st().req || {};
    eq(req.stableIds, ['e2', 'e4'], 'fixture: the request carried the dresser and the chairs');
    eq(typeof req.terms, 'string', 'with its terms');
    eq(req.terms.split(';').length, 2, 'one entry per line, in the paper\'s order');
    ok(/^[0-9a-z]+:450$/.test(req.terms.split(';')[0]) && /:300$/.test(req.terms.split(';')[1]), '⚠ a short fingerprint and the value: never a copy of the line (' + req.terms + ')');
    lacks(JSON.stringify(req), 'Palm Beach Estate Buyers', 'no recipient\'s words in the record');
    ok(!('destSig' in req), 'and no second fingerprint beside them');
    eq(R.c.approvalRequestChanged(R.job(), R.st()), [], 'fixture: nothing changed since');
    // The dresser raised past $500 on another device BEFORE the send's clock, landing after: still a change (the clock flaw).
    R.land('e2', (x) => { x.fmv = 2900; x.updatedAt = T0 - 1; });
    eq(R.c.approvalRequestChanged(R.job(), R.st()), ['e2'], '⚠⚠ off the terms, never updatedAt against the send');
    R.land('e2', (x) => { x.fmv = 480; });
    eq(R.c.approvalRequestChanged(R.job(), R.st()), [], 'within Ask 5\'s rule: no change');
    R.land('e4', (x) => { x.channel = 'Habitat ReStore'; });
    eq(R.c.approvalRequestChanged(R.job(), R.st()), ['e4'], 'the chairs to another charity: changed');
    R.c._invCloudSeen = {};
    eq(R.c.approvalRequestChanged(R.job(), R.st()), [], 'a device that has not read the sheet claims nothing');
    R.c._invCloudSeen = { 7: true };
    has(R.card(), '1 line changed after this request went (where it goes, who takes it or its value): the signed copy does not cover it as it reads now. Record the signed request leaves it unticked; send a fresh request for it.',
      '⚠⚠ the card says so (REL-02)');
    const bar = R.bar();
    has(bar.bits.map((b) => b.text).join(' | '), '1 item changed since the request went: send a fresh request', 'the Releases bar too');
    eq(bar.openByDefault, true, 'and it opens');
    // Record the signed request: the chairs drawn unticked, the dresser ticked.
    ok(R.c.invRecordRequestApproval(7), 'the dialog opens');
    const body = R.asDrawn();
    has(body, 'id="ia-line-0" checked', 'the dresser, unchanged since, ticked');
    lacks(body, 'id="ia-line-1" checked', '⚠⚠ the chairs, changed since, unticked');
    has(text(body), '#4 Dining chairs · Donate · Habitat ReStore ⚠ changed after the request went: tick it only if the signed copy shows it as it reads now', 'and saying why');
    R.el('ia-fid-0').checked = true; R.el('ia-fid-1').checked = true;
    ok(R.c.invSaveApproval(), 'recorded');
    ok(R.c.invApprovalComplete(R.row('e2'), R.job()), 'the dresser approved');
    eq(R.row('e2').authFor.fmv, 450, '⚠⚠ pinned to the $450 the paper printed, not the $480 since');
    eq(R.row('e4').authBy, undefined, '⚠⚠ the chairs carry no signature the paper did not give them');
    // Ticked anyway (the signed copy shows Habitat written in): pinned to the line as it reads.
    ok(R.c.invRecordRequestApproval(7), 'again, for the chairs');
    R.asDrawn();
    R.el('ia-line-0').checked = true; R.el('ia-fid-0').checked = true; R.el('ia-fid-1').checked = true;
    ok(R.c.invSaveApproval(), 'recorded as the person ticked it');
    eq(R.row('e4').authFor.channel, 'Habitat ReStore', 'pinned to where it goes now');
    ok(R.c.invApprovalComplete(R.row('e4'), R.job()), 'and approved');
  });

  G('G · DocuSign: a value past the rule after the envelope went is not recorded; within it, recorded at the value it carried', () => {
    const R = rig();
    const rows = R.c._photoRefs[7];
    const list = [R.row('e2'), R.row('e4')];
    R.job().docState.approvalRequest = { sentAt: '2026-10-13T15:00:00.000Z', req: { stableIds: ['e2', 'e4'], terms: R.c.approvalRequestTerms(list),
      envelope: { id: 'env-1', status: 'completed', sentAt: '2026-10-13T15:00:00.000Z', appliedAt: '', completedAt: '2026-10-19T15:00:00Z',
        signers: [{ name: 'Thomas Ashworth', recipientId: '1', n: 1, signedOn: '2026-10-19' }, { name: 'Nora Ashworth', recipientId: '2', n: 2, signedOn: '2026-10-19' }] } } };
    R.land('e2', (x) => { x.fmv = 2900; });   // the $450 dresser raised to $2,900 while the envelope was out (the audit's recheck)
    R.land('e4', (x) => { x.fmv = 320; });    // the chairs nudged within the rule
    eq(R.c.approvalEnvelopeChanged(R.job(), R.st().req, rows), ['e2'], '⚠⚠ the value past the rule is a change (it was none until today)');
    R.c._invReadAt = { 7: NOW };
    eq(R.c.approvalEnvelopeApply(7), 1, 'one line recorded');
    eq([R.row('e2').authBy, R.row('e4').authBy], [undefined, BOTH], 'the dresser waits; the chairs are signed');
    eq(R.row('e4').authFor.fmv, 300, '⚠ pinned to the $300 the envelope carried');
    eq(R.st().req.envelope.changed, ['e2'], 'named on the record');
  });

  G('H · ⚠⚠ the bulk request and Record approval take only lines that wait on written approval, and say what they left out (REL-07)', () => {
    const R = rig({ stubs: { _invPick: { e18: 1, e1: 1, e4: 1 } } });
    const J = R.job();
    eq(R.c.invWrittenReleasePicked(7, J).map((r) => r.stableId), ['e4'], '⚠⚠ the Keep line and the approved painting are left out');
    eq(R.c.invWrittenReleaseLeftOutText(7, J), 'Left out 2 of the 3 selected — #18 Stand mixer (Keep): not leaving the property; #1 Harbor scene oil painting: already approved in writing as it reads.',
      'named, by why');
    const page = R.c.printApprovalRequest(7, true, { asHtml: true }) || {};
    eq((page.items || []).map((r) => r.stableId), ['e4'], 'the paper carries the chairs alone');
    lacks(text(page.html), 'Stand mixer', '⚠ never "Initial once for the item above marked Keep"');
    ok(R.c.invRecordApproval(7), 'Record approval opens');
    eq(R.c._invRecordCtx.stableIds, ['e4'], '⚠⚠ on the chairs alone: no approval is written onto the Keep line');
    has(text(R.el('ia-sub').innerHTML), 'Left out 2 of the 3 selected', 'and says what it left out');
    R.c.closeInvApproval();
    // A selection of Keep and approved lines: no request buttons at all.
    R.c._invPick = { e18: 1, e1: 1 };
    eq(R.c.invWrittenReleasePicked(7, J).length, 0, 'fixture: nothing in it waits');
    lacks(R.c._renderInvBulk(J), 'invRecordApproval(7)', 'no Record approval offered');
    lacks(R.c._renderInvBulk(J), 'sendApprovalRequest(7,true)', 'no Send request');
    has(R.c.invWrittenReleaseNoneText(7, J), 'None of the lines selected waits on written approval.', 'pressed anyway: why');
    R.c._invPick = { e18: 1, e4: 1 };
    has(R.c._renderInvBulk(J), 'invRecordApproval(7)', 'with a line that waits: offered');
    // A moved approval is a line that waits.
    R.land('e1', (x) => { x.channel = 'Habitat ReStore'; });
    R.c._invPick = { e1: 1 };
    eq(R.c.invWrittenReleasePicked(7, J).map((r) => r.stableId), ['e1'], 'the re-routed painting is taken');
  });

  G('I · ⚠⚠ Authorized By is read, never typed: Correct… with a reason, the stamp kept; nothing counts that Record approval did not write (REL-05)', () => {
    const R = rig();
    const J = R.job();
    const cell = R.c._invCell(7, R.row('e1'), { key: 'authBy', header: 'Authorized By', kind: 'manage', edit: 'text', group: 'disp' }, J, 0);
    lacks(cell, '<input', '⚠⚠ no box to type a name into');
    has(text(cell), 'Signed: Thomas Ashworth; Nora Ashworth (Oct 12, 2026)', 'who signed, readably');
    has(cell, 'invCorrectApproval(7,\'e1\')', 'and Correct…');
    lacks(R.c._invCell(7, R.row('e1'), { key: 'approvalDate', header: 'Approval Date', kind: 'manage', edit: 'date', group: 'disp' }, J, 0), '<input', 'the date is read too');
    const empty = R.c._invCell(7, R.row('e4'), { key: 'authBy', header: 'Authorized By', kind: 'manage', edit: 'text', group: 'disp' }, J, 0);
    has(text(empty), 'No written approval recorded: select the line and press Record approval once the signed copy is back', 'a line with none says how one is recorded');
    lacks(empty, 'invCorrectApproval', 'and offers nothing to correct');
    // The handler refuses a typed name as the record no longer offers one.
    R.edit('e4', 'authBy', BOTH);
    R.edit('e4', 'approvalDate', '2026-10-19');
    eq([R.row('e4').authBy, R.row('e4').approvalDate], [undefined, undefined], '⚠⚠ a name typed is never written');
    ok(!R.c.invApprovalComplete(R.row('e4'), J), 'and nothing counts');
    eq(R.c.invCorrectApproval(7, 'e4'), false, 'Correct… on a line with no approval: refused');
    has(R.log.alerts.join(' '), 'A signed approval is recorded with Record approval', 'pointing at the way in');
    // A correction: Nora was misspelled.
    R.c._photoRefs[7].find((x) => x.stableId === 'e1').authBy = 'Thomas Ashworth; Norah Ashworth';
    ok(R.c.invCorrectApproval(7, 'e1'), 'Correct… opens');
    eq(R.el('ia-title').textContent, 'Correct a recorded approval', 'titled so');
    R.el('ia-fix-who').value = BOTH; R.el('ia-fix-date').value = '2026-10-12'; R.el('ia-fix-why').value = '';
    eq(R.c.invSaveApprovalFix(), false, 'no reason: refused');
    has(R.el('ia-fb').innerHTML, 'say why it is being corrected', 'by name');
    R.el('ia-fix-why').value = 'Nora misspelled'; R.el('ia-fix-date').value = '';
    eq(R.c.invSaveApprovalFix(), false, 'names without a date: refused');
    R.el('ia-fix-date').value = '2027-12-31';
    eq(R.c.invSaveApprovalFix(), false, '⚠ a day after today: refused');
    has(R.el('ia-fb').innerHTML, 'Dec 31, 2027 is after today', 'saying so');
    R.el('ia-fix-date').value = '2026-10-12';
    ok(R.c.invSaveApprovalFix(), 'saved');
    const p = R.row('e1');
    eq(p.authBy, BOTH, 'corrected');
    ok(p.authBySetAt >= NOW, '⚠ the hand edit\'s stamp kept, for the merge');
    eq(p.authFixes.map((f) => [f.why, f.was.authBy, f.on]), [['Nora misspelled', 'Thomas Ashworth; Norah Ashworth', '2026-10-20']], 'the correction recorded: why, and what it read');
    eq(JSON.stringify(p.authFor), JSON.stringify(KODNER), 'what was approved is untouched');
    has(text(R.c._invCell(7, p, { key: 'authBy', header: 'Authorized By', kind: 'manage', edit: 'text', group: 'disp' }, J, 0)),
      'Corrected Oct 20, 2026 by Ashley Jerome: “Nora misspelled” (it read Thomas Ashworth; Norah Ashworth, Oct 12, 2026)', 'and shown in the record');
  });

  G('J · the day of a signed approval: after today refused; before the request went, recorded and flagged (REL-26)', () => {
    const R = rig();
    R.c.sendApprovalRequest(7); R.c.invMarkRequestSent(7);
    ok(R.c.invRecordRequestApproval(7), 'the dialog opens');
    R.asDrawn();
    has(R.el('ia-body').innerHTML, 'max="2026-10-20"', 'the date box stops at today');
    R.el('ia-fid-0').checked = true; R.el('ia-fid-1').checked = true; R.el('ia-date').value = '2027-12-31';
    eq(R.c.invSaveApproval(), false, '⚠⚠ Dec 31, 2027: refused');
    has(R.el('ia-fb').innerHTML, 'Not recorded: Dec 31, 2027 is after today.', 'by name');
    eq(R.row('e2').approvalDate, undefined, 'nothing written');
    R.el('ia-date').value = '2026-10-15';
    ok(R.c.invSaveApproval(), 'a day before the request went: recorded');
    has(text(R.el('ia-body').innerHTML), 'That date, Oct 15, 2026, is before the request went (Oct 20, 2026): check the date on the signed copy', '⚠ and flagged');
  });

  G('K · ⚠⚠ the merge carries what an approval approved with it, the app and the server alike', () => {
    const R = rig();
    const grab = (name) => { const m = GS_INV.match(new RegExp('function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}')); return m ? m[0] : ''; };
    const gsVar = (name) => (GS_INV.match(new RegExp('var ' + name + ' = \\[[\\s\\S]*?\\];')) || [''])[0];
    const g = {};
    vm.createContext(g);
    vm.runInContext([gsVar('INV_STICKY_FIELDS'), grab('_invHasVal'), grab('_invStickyValue'), grab('_custodyEventId'), grab('_mergeCustodyLogs'),
      grab('_invApprovalEntries'), grab('_invApprovalSetAt'), grab('_invMergeApprovals'), grab('_mergeMediaItems')].join('\n\n'), g);
    ['authFor', 'authWas', 'authFixes'].forEach((k) => {
      ok(R.c.INV_STICKY_FIELDS.indexOf(k) >= 0, k + ' sticks in the app');
      ok(vm.runInContext('INV_STICKY_FIELDS', g).indexOf(k) >= 0, k + ' sticks on the sheet');
    });
    const both = (a, b) => [JSON.stringify(R.c.mergeMediaItems(a, b)), JSON.stringify(g._mergeMediaItems(a, b))];
    const same = (a, b, label) => { const [x, y] = both(a, b); eq(x, y, label + ': the server merges as the app does'); return JSON.parse(x)[0]; };
    // A newer edit on a device that never saw the approval: the approval and its pin survive.
    const approved = PAINTING(); approved.updatedAt = 10;
    const stale = Object.assign(PAINTING(), { updatedAt: 20, condition: 'Fair' }); delete stale.authBy; delete stale.approvalDate; delete stale.authFor;
    const m1 = same([approved], [stale], 'a newer copy that never saw it');
    eq([m1.authBy, JSON.stringify(m1.authFor)], [BOTH, JSON.stringify(KODNER)], '⚠⚠ the approval and what it approved, both kept');
    // SYN-03's hybrid: the newer copy re-routed the line; the approval is kept and no longer covers it.
    const hy = Object.assign(PAINTING(), { updatedAt: 20, disposition: 'Donate', channel: 'Goodwill Palm Beach' }); delete hy.authBy; delete hy.approvalDate; delete hy.authFor;
    const m2 = same([approved], [hy], 'the hybrid');
    eq([m2.disposition, m2.authBy], ['Donate', BOTH], 'the newer destination, the older approval');
    ok(!R.c.invApprovalComplete(m2, R.job()), '⚠⚠ and the approval does not cover the donation it was never given for');
    // A fresh approval over a moved one, against a stale copy holding the old one under the same names.
    const fresh = Object.assign(PAINTING(), { updatedAt: 30, disposition: 'Distribute', channel: 'Margaret Ashworth', approvalDate: '2026-10-20', authBySetAt: 25,
      authFor: { disposition: 'Distribute', channel: 'Margaret Ashworth', fmv: 2400 }, authWas: [{ authBy: BOTH, approvalDate: '2026-10-12', authFor: KODNER, replacedOn: '2026-10-20' }] });
    const old = Object.assign(PAINTING(), { updatedAt: 40, condition: 'Fair', disposition: 'Distribute', channel: 'Margaret Ashworth' });
    const m3 = same([fresh], [old], 'a fresh approval and a stale copy of the old one');
    eq([m3.approvalDate, m3.authFor.channel, (m3.authWas || []).length], ['2026-10-20', 'Margaret Ashworth', 1], '⚠⚠ the fresh approval wins with its pin and its history, the same names or not');
    ok(R.c.invApprovalComplete(m3, R.job()), 'so it reads as approved for where it goes');
    // A correction and the copy it corrected.
    const fixed = Object.assign(PAINTING(), { updatedAt: 30, authBySetAt: 30, authFixes: [{ at: 30, why: 'typo', was: { authBy: 'x' } }] });
    const m4 = same([fixed], [Object.assign(PAINTING(), { updatedAt: 40, condition: 'Fair' })], 'a correction');
    eq((m4.authFixes || []).length, 1, 'the correction kept');
    // This device's own copy: savePhotoRefs writes a whitelist of keys, and drops a key it does not list (found by the sweep: no
    // check here held it, so a reload would have lost every pin this device recorded).
    const store = {};
    const W = sandbox({ fns: ['savePhotoRefs'], stubs: { localStorage: { setItem: (k, v) => { store[k] = v; } }, _warnPhotoStoreFull() {},
      _invReclaimSpace: () => ({ bytes: 0, jobs: [], thumbs: 0 }), _invNoteReclaim() {},
      _photoRefs: { 7: [Object.assign(PAINTING(), { authWas: [{ authBy: 'Old', approvalDate: '2026-10-01' }], authFixes: [{ at: 1, why: 'typo' }] })] } } });
    attempt(() => W.savePhotoRefs(7));
    const kept = (() => { try { return JSON.parse(Object.values(store)[0] || '[]')[0] || {}; } catch (e) { return {}; } })();
    eq([JSON.stringify(kept.authFor), (kept.authWas || []).length, (kept.authFixes || []).length], [JSON.stringify(KODNER), 1, 1],
      '⚠⚠ this device\'s own copy keeps what the approval approved, the one it replaced and the correction');
  });

  G('L · one definition each, read where it is needed; the deployment that carries it', () => {
    const callers = (name) => [...ALL_FNS].filter((n) => n !== name && (() => { try { return new RegExp('\\b' + name + '\\(').test(noComments(fn(n))); } catch (e) { return false; } })()).sort();
    ['invApprovalMoved', 'invApprovalValueMoved', 'invApprovalTermsOf', 'approvalLineDestKey', '_invTermsMoved', 'invApprovalPaperText', 'approvalRequestMovedIds',
     'approvalRequestTerms', 'approvalRequestPaperTerms', 'invApplyApproval', 'invCorrectApproval', 'invSaveApprovalFix']
      .forEach((n) => eq((SRC.match(new RegExp('\\nfunction ' + n + '\\(', 'g')) || []).length, 1, n + ' is defined once'));
    eq(callers('invApprovalPaperText'), ['_invExportValue', 'printDispositionLedger', 'probatePackageRecordHtml', 'signoutSheetHtml'],
      '⚠⚠ every paper that prints an approval asks what it may print: the workbook and CSV, the ledger, the package\'s record, the sign-out sheet');
    eq(callers('invApprovalValueMoved'), ['_invTermsMoved', 'approvalRequestMovedIds'], '⚠ Ask 5\'s rule, read by an approval and by a request (both routes)');
    eq(callers('approvalRequestMovedIds'), ['approvalEnvelopeChanged', 'approvalRequestChanged', 'approvalRequestPaperTerms', 'approvalRequestState', 'invRecordApproval'],
      'the request\'s changed lines: the draft and the sent request, the card\'s state, the envelope, and Record the signed request');
    const mv = callers('invApprovalMoved');
    ['invApprovalComplete', 'invApprovalMissing', 'invApprovalWithSigners', 'invApplyApproval', 'invApprovalPrevWords', 'invApprovalMovedText', 'printApprovalRequest',
     '_renderInvReleasesCard', '_invBulkApply', '_invEdit'].forEach((n) => ok(mv.indexOf(n) >= 0, 'invApprovalMoved is read by ' + n));
    eq(callers('approvalRequestSig').length >= 1 && !/destOnly|destSig/.test(noComments(SRC).replace(/\/\/.*$/gm, '')), true, '⚠ the DocuSign build\'s destSig is gone: the terms carry where each line went');
    lacks(noComments(fn('approvalRequestChanged')), 'draftedAt', '⚠⚠ no clock in the changed lines');
    lacks(noComments(fn('approvalEnvelopeChanged')), 'updatedAt', 'nor in the envelope\'s');
    const B = sandbox({ vars: ['BACKEND_MIN_VERSION', 'BACKEND_FEATURE_COST'] });
    eq((GS_MAIN.match(/var BACKEND_VERSION = '([^']+)';/) || [])[1], '2026-10-27d', 'main-sync.gs is 2026-10-27d');
    eq(B.BACKEND_MIN_VERSION, '2026-10-27d', 'the app relies on it');
    ok(/^a release approval recorded on one device can lose, on the sheet, the record of where the item was going/.test(B.BACKEND_FEATURE_COST.version),
      'and the stale banner names what an older deployment drops, first');
  });
};
