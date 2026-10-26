'use strict';
// ─────────────────────────────────────────────────────────────────
// WRITTEN RELEASE APPROVAL ON A CLIENT'S OWN HOME (2026-10-26)
//
// Anthony, asked whether the release approval request should go through DocuSign on living work too: "for a living client,
// are we really going do this? probably not. they are going to approve things verbally to send … the estate requirement for
// signed/initialed release is the important one." He took "Drop it, firearms aside", and for the two living cautions "Split
// them": an item going to someone who works with Havellin still needs the client's written OK before it leaves (our conflict);
// a ⚑ line sold with no value is named on the Contents Record the client signs at the close.
//
// One rule, invWrittenReleaseNeeded(ref, job): every line leaving the property on an estate; on a client's own home, a firearm
// or a line going to someone who works with Havellin. Read by the awaiting list (and so the request, its card and the Releases
// bar), a selection's request, the sign-out's wait, ratification, a collection's written-release line, the work bar and the
// bulk bar. Everything here drives the real functions, lifted by their own call graph.
// ─────────────────────────────────────────────────────────────────

const { sandbox, source, fn, decl, domStub } = require('./harness');

const SRC = source();
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
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
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }
const text = (h) => String(h || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&mdash;/g, '—')
  .replace(/&rsquo;/g, '’').replace(/\s+/g, ' ').trim();

const T0 = Date.parse('2026-10-10T15:00:00Z');
const LIVING = (o) => Object.assign({
  id: 7, hvlId: 'HVL-0007', name: 'Margaret Ellis', fname: 'Margaret', email: 'meg@ellis.example', svc: 'downsizing_move', status: 'active', won: true,
  addr: '9 Dunbar Rd', city: 'Palm Beach', tc: 'Ashley Jerome', docTier: 'contents', docState: {}, at: {}, updatedAt: T0, payments: [],
}, o || {});
const ESTATE = (o) => LIVING(Object.assign({ name: 'Harold Brennan', svc: 'probate', matterType: 'probate', docTier: 'values', deathDate: '2026-08-01',
  executor: 'Rex Hale', executorRole: 'Personal Representative', executorEmail: 'rex@hale.example', executorAuth: 'received' }, o || {}));
const ROW = (id, over) => Object.assign({
  stableId: id, label: 'inventory', collId: null, roomIdx: 1, status: 'uploaded', ts: T0, updatedAt: T0, namedBy: 'desk',
  objectName: 'Sideboard', category: 'Furniture', qty: 1, condition: 'Good',
  driveFileId: 'f' + id, driveFileUrl: 'https://drive.google.com/file/d/f' + id + '/view',
}, over || {});
// The lines a client's own home sends out: a donation, a sale to a dealer, a rifle to a son, a lamp sold to the concierge.
const DONATE = () => ROW('d', { itemNo: 1, objectName: 'Sofa', disposition: 'Donate', channel: 'Habitat ReStore' });
const SELL = () => ROW('s', { itemNo: 2, objectName: 'Mahogany desk', disposition: 'Sell', channel: 'Kodner Galleries', fmv: 900 });
const GUN = () => ROW('g', { itemNo: 3, objectName: 'Browning rifle', category: 'Firearms', disposition: 'Distribute', channel: 'Tom Ellis', serial: 'BR123' });
const STAFF = () => ROW('t', { itemNo: 4, objectName: 'Brass lamp', disposition: 'Sell', channel: 'Ashley Jerome', fmv: 60 });
const KEEP = () => ROW('k', { itemNo: 5, objectName: 'Clock', disposition: 'Keep' });

const STOP = ['_printDocument', 'alert', 'showSyncBadge', 'renderInventoryTab', '_scheduleInventorySync', 'savePhotoRefs', '_invPrintThumb', '_docNotice'];
function rig(job, rows, extra) {
  const log = { printed: [], alerts: [], badges: [], notices: [] };
  const c = lift(['invWrittenReleaseNeeded', 'invWrittenReleasePicked', '_invAwaitingApproval', '_approvalLineOpen', 'invRatificationOwed',
    'printApprovalRequest', 'approvalRequestState', 'signoutGroups', 'collectionPartnerLines', 'deskFoldState', '_renderInvBulk', '_renderInvWorkbar',
    '_invBulkApply', '_renderInvRow', 'printContentsRecord', 'invReleaseCautions', '_invPanelCautionHtml', 'invRecordApproval', 'printDispositionLedger',
    'printAppraisalWorklist'], STOP, Object.assign({
    jobs: [job], _photoRefs: { 7: rows }, estimateStore: { 7: { estimate: { rooms: [{ idx: 1, name: 'Study', st: 'in' }] } } },
    vendorDirectory: [], document: domStub({}), _invPick: {},
    _printDocument: (html, title) => { log.printed.push({ html, title }); return true; }, _invPrintThumb: () => '',
    alert: (m) => log.alerts.push(String(m)), showSyncBadge: (m) => log.badges.push(String(m)), renderInventoryTab() {}, _scheduleInventorySync() {},
    savePhotoRefs() {}, _docNotice: (k, m) => log.notices.push(String(m)),
  }, extra || {}));
  c._invCloudSeen = { 7: true };
  return { c, log, job: () => c.jobs[0], row: (id) => c._photoRefs[7].find((x) => x.stableId === id) };
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const G = (name, body) => { group(name); try { body(); } catch (e) { ok(false, name + ' — threw: ' + String(e && e.message || e).split('\n')[0]); } };

  G('A · the one rule: every leaving line on an estate; on a client\'s own home a firearm or someone who works with Havellin', () => {
    const L = rig(LIVING(), [DONATE(), SELL(), GUN(), STAFF(), KEEP()]);
    const need = (id) => L.c.invWrittenReleaseNeeded(L.row(id), L.job());
    eq(['d', 's', 'g', 't', 'k'].map(need), [false, false, true, true, false],
      '⚠⚠ living: the donation and the sale on the client\'s word; the rifle and the lamp to the concierge in writing; the clock stays');
    const E = rig(ESTATE(), [DONATE(), SELL(), GUN(), KEEP()]);
    eq(['d', 's', 'g', 'k'].map((id) => E.c.invWrittenReleaseNeeded(E.row(id), E.job())), [true, true, true, false], 'an estate: every leaving line, as always');
    eq(L.c.invWrittenReleaseNeeded(Object.assign(GUN(), { deletedAt: 5 }), L.job()), false, 'a removed line: never');
    eq(L.c.invWrittenReleaseNeeded(Object.assign(GUN(), { disposition: 'Keep' }), L.job()), false, 'a firearm kept: nothing leaves');
  });

  G('B · the awaiting list, the request and a selection\'s request follow it; a living job with nothing to sign says why', () => {
    const L = rig(LIVING(), [DONATE(), SELL(), GUN(), STAFF(), KEEP()]);
    eq(L.c._invAwaitingApproval(7).map((r) => r.stableId), ['g', 't'], '⚠⚠ only the rifle and the lamp wait on the client\'s signature');
    const p = L.c.printApprovalRequest(7, false, { asHtml: true }) || {};
    const t = text(p.html);
    ok(!!p.html, 'the request prints' + (p.why ? ': ' + p.why : ''));
    has(t, 'Browning rifle', 'the rifle is on it');
    has(t, 'Brass lamp', 'the lamp to the concierge is on it');
    lacks(t, 'Sofa', 'the donation is not');
    lacks(t, 'Mahogany desk', 'nor the sale to the dealer');
    has(t, 'Property going to someone who works with Havellin', 'the conflict is named above the line the client initials');
    has(t, 'For your written approval before they leave', 'headed for what it is, plural for two');
    lacks(t, 'on counsel’s advice', '⚠ a living firearm block names no counsel the client does not have');
    // A selection of everyday lines: refused by name; a selection with the rifle: the rifle alone.
    L.c._invPick = { d: 1, s: 1 };
    const none = L.c.printApprovalRequest(7, true, { asHtml: true }) || {};
    eq(none.why, 'None of the items selected needs written approval. On a client’s own home only a firearm, or an item going to someone who works with Havellin, needs written approval: the client’s word approves the rest, and the Contents Record they sign at the close is the record.',
      '⚠⚠ a selection of everyday lines: nothing to sign, and why');
    L.c._invPick = { d: 1, g: 1 };
    const sel = L.c.printApprovalRequest(7, true, { asHtml: true }) || {};
    eq((sel.items || []).map((r) => r.stableId), ['g'], 'a selection with the rifle: the rifle alone');
    // Nothing waiting at all.
    const P = rig(LIVING(), [DONATE(), SELL()]);
    eq((P.c.printApprovalRequest(7, false, { asHtml: true }) || {}).why, 'Nothing is waiting on written approval. On a client’s own home only a firearm, or an item going to someone who works with Havellin, needs written approval: the client’s word approves the rest, and the Contents Record they sign at the close is the record.',
      '⚠⚠ only everyday lines leaving: nothing waiting, and why');
    // An estate's selection is taken as picked, as it always was.
    const E = rig(ESTATE(), [DONATE(), SELL()]);
    E.c._invPick = { d: 1 };
    eq(((E.c.printApprovalRequest(7, true, { asHtml: true }) || {}).items || []).map((r) => r.stableId), ['d'], 'an estate: the donation is asked for');
  });

  G('C · the sign-out waits only on what needs writing; ratification answers on a client\'s own home', () => {
    const L = rig(LIVING(), [DONATE(), SELL(), STAFF()]);
    const gs = L.c.signoutGroups(L.job(), L.c._photoRefs[7]);
    const of = (id) => { for (const g of gs) for (const k of ['ready', 'waiting', 'done']) if ((g[k] || []).some((r) => r.stableId === id)) return k; return ''; };
    eq([of('d'), of('s')], ['ready', 'ready'], '⚠⚠ the donation and the dealer\'s sale: ready to sign out on the client\'s word');
    eq(of('t'), 'waiting', '⚠⚠ the lamp to the concierge: waits on the client\'s written approval');
    // A rifle that left with nothing signed: ratification owed; a donation that left: nothing owed.
    const R = rig(LIVING(), [Object.assign(GUN(), { dispDate: '2026-10-12' }), Object.assign(DONATE(), { dispDate: '2026-10-12' })]);
    eq([R.c.invRatificationOwed(R.row('g'), R.job()), R.c.invRatificationOwed(R.row('d'), R.job())], [true, false], '⚠⚠ the rifle that left unsigned owes the client\'s signature; the donation owes nothing');
    const p = text((R.c.printApprovalRequest(7, false, { asHtml: true }) || {}).html);
    has(p, 'This item left the property before your written approval of its release was recorded.', 'the request lists it for ratification, in the client\'s words');
    has(p, 'for your signature, which ratifies the release; nothing is undone.', 'for their signature');
    lacks(p, 'Personal Representative', '⚠ never a representative they do not have');
    has(p, 'No written approval recorded; to sign: you', 'the row asks the client');
    has(p, 'For your signature', '⚠ a request of lines already gone is headed for the signature (found on review: it said "before it leaves")');
    lacks(p, 'before it leaves', 'never "before it leaves" over an item that has left');
    const row = R.c._renderInvRow(R.job(), R.row('g'));
    has(row, 'ratification owed', 'the row says so');
    has(row, 'Left the property before the client had approved it in writing', '⚠ its title names the client');
    const bar = attempt(() => R.c.deskFoldState(7, R.job(), 'releases', R.c._photoRefs[7], '2026-10-17')).val || { bits: [] };
    has((bar.bits || []).map((b) => b.text).join(' | '), '1 for ratification', 'and the Releases bar counts it');
  });

  G('D · the work bar and the bulk bar offer the request on a client\'s own home only where a line needs it', () => {
    const plain = rig(LIVING(), [DONATE(), SELL()]);
    const wb = plain.c._renderInvWorkbar(plain.job(), plain.c._photoRefs[7]);
    lacks(wb, 'printApprovalRequest(', '⚠⚠ nothing needs writing: no Approval Request on the work bar');
    plain.c._invPick = { d: 1, s: 1 };
    const bb = plain.c._renderInvBulk(plain.job());
    ok(bb.indexOf('2 selected') >= 0, 'fixture: the bulk bar is drawn for the selection');
    lacks(bb, 'printApprovalRequest(', '⚠⚠ nor Approval request across a selection of everyday lines');
    lacks(bb, 'sendApprovalRequest(', 'nor Send request');
    lacks(bb, 'invRecordApproval(', 'nor Record approval');
    has(bb, 'invBulkRemove(', 'the rest of the bar stays');
    const gun = rig(LIVING(), [DONATE(), GUN()]);
    has(gun.c._renderInvWorkbar(gun.job(), gun.c._photoRefs[7]), 'onclick="printApprovalRequest(7)"', 'a rifle leaving: the work bar offers it');
    gun.c._invPick = { d: 1, g: 1 };
    const gb = gun.c._renderInvBulk(gun.job());
    has(gb, 'printApprovalRequest(7,true)', 'and the bulk bar, with the rifle picked');
    has(gb, 'sendApprovalRequest(7,true)', 'Send request');
    has(gb, 'invRecordApproval(7)', 'Record approval');
    const est = rig(ESTATE(), [DONATE()]);
    est.c._invPick = { d: 1 };
    has(est.c._renderInvBulk(est.job()), 'printApprovalRequest(7,true)', 'an estate: as always');
  });

  G('E · the ⚑ line sold with no value is named on the Contents Record; the conflict on the request', () => {
    const flagged = ROW('f', { itemNo: 6, objectName: 'Bronze figure', category: 'Art & Décor', disposition: 'Sell', channel: 'Kodner Galleries', needsAppr: true, dispDate: '2026-10-12' });
    const L = rig(LIVING(), [flagged, DONATE()]);
    eq(L.c.invWrittenReleaseNeeded(L.row('f'), L.job()), false, 'a flagged sale needs no written approval on a client\'s own home');
    eq(L.c.invReleaseCautions(L.row('f'), 7).map((c) => c.key), ['flaggedUnvalued'], 'fixture: the caution is raised');
    const c = L.c.INV_RELEASE_CAUTIONS.filter((x) => x.key === 'flaggedUnvalued')[0] || {};
    eq(c.desk, 'The client may sell their own things unappraised, so it is not refused: the Contents Record the client signs at the close names it on the line '
      + '(and the release approval request, where the line needs the client’s written approval too).', '⚠⚠ the desk is told where the client meets it: the Contents Record');
    const cr = L.c.printContentsRecord(7, { asHtml: true }) || {};
    has(cr.html, 'FLAGGED FOR APPRAISAL, NO VALUE RECORDED', 'and the Contents Record carries its badge on the line');
    // The bulk bar's sweep says where the client meets it.
    L.c._invPick = { f: 1 };
    L.c._invBulkApply(7, 'disposition', 'Auction');
    has(L.log.badges.join(' | '), 'The Contents Record the client signs at the close names it.', '⚠ a sweep onto a flagged line: the Contents Record, never "the representative"');
    lacks(L.log.badges.join(' | '), 'goes to the representative', 'no representative on a client\'s own home');
    // The conflict stays on the request (above), and its desk sentence says so.
    const s = L.c.INV_RELEASE_CAUTIONS.filter((x) => x.key === 'staffRecipient')[0] || {};
    has(s.desk, 'the release approval request names it above the line the client initials', 'the conflict: still on the request');
  });

  G('F · a collection on a client\'s own home asks no written release unless a line of it needs one', () => {
    const coll = (o) => ROW('7_col_c1', Object.assign({ sourceCollId: 'c1', objectName: 'Coin collection', disposition: 'Auction', channel: 'Heritage' }, o || {}));
    const L = rig(LIVING(), [coll()]);
    eq(L.c.collectionPartnerLines(7, L.job(), { id: 'c1', name: 'Coin collection' }).map((l) => l.key), ['coll_photo', 'coll_released'],
      '⚠⚠ everyday: photographed and released, no "Release approved in writing"');
    const E = rig(ESTATE(), [coll()]);
    eq(E.c.collectionPartnerLines(7, E.job(), { id: 'c1', name: 'Coin collection' }).map((l) => l.key), ['coll_photo', 'coll_approved', 'coll_released'], 'an estate: all three, as always');
  });

  G('H · found on review: the bulk bar\'s Record approval, the living ledger, a mixed sweep, the worklist\'s held firearm', () => {
    // Record approval across a selection records the client's signature on the lines that need it, never the everyday ones beside them.
    const L = rig(LIVING(), [DONATE(), SELL(), GUN()]);
    L.c._invPick = { d: 1, s: 1, g: 1 };
    ok(L.c.invRecordApproval(7) !== false, 'Record approval opens');
    eq((L.c._invRecordCtx || {}).stableIds, ['g'], '⚠⚠ on the rifle alone: the sofa and the desk went on the client\'s word');
    const P = rig(LIVING(), [DONATE(), SELL()]);
    P.c._invPick = { d: 1, s: 1 };
    eq(P.c.invRecordApproval(7), false, 'a selection of everyday lines: refused');
    has(P.log.alerts.join(' | '), 'None of the items selected needs written approval.', 'by name, with the rule');
    // The living ledger: an everyday sale was authorised by the client's word, never "—".
    const Lg = rig(LIVING(), [Object.assign(SELL(), { dispDate: '2026-10-12', gross: 900, fees: 90 }), Object.assign(GUN(), { disposition: 'Sell', channel: 'Palm Beach Arms' })]);
    const lg = Lg.c.printDispositionLedger ? (Lg.c.printDispositionLedger(7, { asHtml: true }) || {}) : {};
    const row = (name) => { const m = new RegExp('<tr>(?:(?!</tr>).)*' + name + '(?:(?!</tr>).)*</tr>', 's').exec(String(lg.html || '')); return text(m ? m[0] : ''); };
    has(row('Mahogany desk'), 'the client', '⚠⚠ the desk sold on the client\'s word: authorised by the client');
    lacks(row('Browning rifle'), 'the client', 'the rifle with nothing signed: no word stands in for its signature');
    // A sweep onto a staff line and a flagged line: both destinations said.
    const M = rig(LIVING(), [STAFF(), ROW('f', { itemNo: 6, objectName: 'Bronze figure', category: 'Art & Décor', disposition: 'Sell', channel: 'Kodner Galleries', needsAppr: true })]);
    M.c._invPick = { t: 1, f: 1 };
    M.c._invBulkApply(7, 'disposition', 'Auction');
    has(M.log.badges.join(' | '), 'Check before the release request goes to the client; the Contents Record the client signs at the close names the rest.', '⚠ a mixed sweep names both papers');
    // The Appraisal Worklist's held firearm on a client's own home: the client authorises it.
    const W = rig(LIVING(), [Object.assign(GUN(), { needsAppr: true })], {});
    const wl = attempt(() => W.c.printAppraisalWorklist(7, { asHtml: true })).val || {};
    const wt = text(wl.html || (W.log.printed.slice(-1)[0] || {}).html || '');
    if (wt.indexOf('awaiting written authority') >= 0) {
      has(wt, 'Nothing is released until the client has authorised', 'the worklist names the client');
      lacks(wt, 'Personal Representative has authorised', 'never a representative they do not have');
    } else ok(false, 'fixture: the worklist lists the held rifle (' + (wl.why || wt.slice(0, 120)) + ')');
  });

  G('G · one rule, read where it is needed', () => {
    const body = (name) => codeOnly(fn(name));
    ['_invAwaitingApproval', '_approvalLineOpen', 'invRatificationOwed', 'signoutGroups', 'collectionPartnerLines', 'invWrittenReleasePicked']
      .forEach((n) => has(body(n), 'invWrittenReleaseNeeded(', n + ' reads the one rule'));
    has(body('printApprovalRequest'), 'invWrittenReleasePicked(', 'the request\'s selection reads it');
    has(body('sendApprovalRequest'), 'invWrittenReleasePicked(', 'and the send\'s');
    has(body('_renderInvBulk'), 'invWrittenReleasePicked(', 'the bulk bar\'s three buttons ask it');
    has(body('_renderInvWorkbar'), '_invAwaitingApproval(', 'the work bar asks the awaiting list');
    lacks(body('_approvalLineOpen'), 'INV_RELEASE_DISPOSITIONS', '⚠ no second copy of the disposition test');
  });
};
