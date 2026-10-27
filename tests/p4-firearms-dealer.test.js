'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P4 · FIREARMS GO ONLY TO A LICENSED DEALER (2026-10-27; the desk audit, audits/2026-10-27-desk/PLAN.md, closing EST-02,
// FLD-01, REL-03, REL-04, REL-15, FLD-07, LIV-05 and SYN-14).
//
// Measured before the build: one bulk press put four shotguns on Donate to Goodwill with no flag, and Goodwill, Haul-It and the
// Job Plan's Kodner each read "Cleared to carry" as the firearm's licensed dealer, on the paper the representatives initial. A
// beneficiary's receipt said Havellin delivered her a revolver. The custody dialog opened on Released. A shotgun found in the
// garage lit nothing the crew sees. A living client's shotgun on Keep read "held" for good.
//
// Anthony, 2026-10-27, Ask 4 (a living client's own firearm going to the new home: who carries it?): *"it's always safer for the
// client just to take it, but I'm not going to mandate that they take it in a locked case. I mean, they can put it in their
// trunk ... They put it in a backpack in their trunk. There's nothing wrong with that."* The client takes it themselves;
// Havellin and the movers never carry it; the app prescribes no container and states no transport law.
//
// Everything is DRIVEN through the real functions, lifted by their own call graph (comments and strings stripped first), with
// only the boundaries stubbed by name.
// ─────────────────────────────────────────────────────────────────────────────

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
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }
const text = (h) => String(h || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&mdash;/g, '—')
  .replace(/&rsquo;/g, '’').replace(/&middot;/g, '·').replace(/&#9888;/g, '⚠').replace(/&#10003;/g, '✓').replace(/&hellip;/g, '…')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const count = (h, needle) => String(h || '').split(needle).length - 1;

const T0 = Date.parse('2026-10-10T15:00:00Z');
const ESTATE = (o) => Object.assign({
  id: 7, hvlId: 'HVL-0007', name: 'Walter Price', svc: 'probate', matterType: 'probate', docTier: 'values', deathDate: '2026-08-01',
  executor: 'Ruth Price', executorRole: 'Personal Representative', executorEmail: 'ruth@price.example', executorAuth: 'received',
  status: 'active', won: true, addr: '9 Dunbar Rd', city: 'Palm Beach', tc: 'Ashley Jerome', docState: {}, at: {}, updatedAt: T0, payments: [],
}, o || {});
const LIVING = (o) => ESTATE(Object.assign({ name: 'Margaret Hale', svc: 'downsizing_move', matterType: '', executor: '', executorRole: '',
  executorEmail: '', executorAuth: '', deathDate: '', destAddr: '801 Sunset Ave', docTier: 'contents' }, o || {}));
const ROW = (id, n, over) => Object.assign({
  stableId: id, itemNo: n, label: 'inventory', collId: null, roomIdx: 1, status: 'uploaded', ts: T0 + n, updatedAt: T0 + n, namedBy: 'desk',
  objectName: 'Line ' + n, category: 'Furniture', qty: 1, condition: 'Good',
  driveFileId: 'f' + id, driveFileUrl: 'https://drive.google.com/file/d/f' + id + '/view',
}, over || {});
const GUN = (id, n, over) => ROW(id, n, Object.assign({ objectName: 'Remington 870 shotgun', category: 'Firearms', serial: 'RS' + n }, over || {}));
// The Vendor Directory: one licensed dealer, a charity, a hauler and an auction house that is no dealer.
const DIR = [
  { vendor_name: 'Jupiter Gun Exchange', category: 'Firearms Dealer (FFL)', status: 'Active' },
  { vendor_name: 'Palm Beach Arms', category: 'Auction House; Firearms Dealer (FFL)', status: 'Active' },
  { vendor_name: 'Stale Guns Inc', category: 'Firearms Dealer (FFL)', status: 'Do Not Use' },
  { vendor_name: 'Goodwill Palm Beach', category: 'Donation Organization' },
  { vendor_name: 'Haul-It Junk Removal', category: 'Junk Removal & Dumpster' },
  { vendor_name: 'Kodner Galleries', category: 'Auction House' },
];
const ROOMS = [{ idx: 1, name: 'Garage', st: 'in' }, { idx: 2, name: 'Study', st: 'in' }];
// The Job Plan: Kodner confirmed for the auction line, Goodwill for donations, Haul-It for the junk.
const EST = { rooms: ROOMS, vendors: [{ lid: 'v1', type: 'Auction House' }] };
const PLANNED = (job) => Object.assign(job, {
  vendorSourcing: { Lv1: { status: 'Confirmed', vendorName: 'Kodner Galleries' } },
  logisticsSourcing: { donation: { status: 'Confirmed', vendorName: 'Goodwill Palm Beach' }, junk: { status: 'Confirmed', vendorName: 'Haul-It Junk Removal' } },
});

const STOP = ['_printDocument', 'alert', 'showSyncBadge', 'renderInventoryTab', '_scheduleInventorySync', 'savePhotoRefs', '_invPrintThumb',
  '_docNotice', '_invThumbHTML', '_invInput', '_invRefreshSummary', '_invRefreshGuardrail', '_invRefreshFlagStrip', '_invRefreshRecords',
  '_invRefreshReleases', '_invReviewRepaint', '_invReadLineRepaint', '_invRefreshAgentNotices', '_renderInvWorkbar', '_renderInvBulk',
  '_invPaintFigures', 'agentValueAfterRename', '_fieldCamPaint'];
function rig(job, rows, extra) {
  const log = { printed: [], alerts: [], badges: [], confirms: [], renders: 0 };
  const doc = domStub({});
  const c = lift(['_invEdit', '_invBulkApply', '_invDispOptions', 'invFirearmDispRefusal', 'invTransportBlocked', 'invTransportReason',
    'invTransportDealer', 'invDealerWhy', 'invFillPlanChannel', 'invFillPlanChannels', 'agentApplyResult', 'agentValueApply',
    '_renderInvRow', '_renderInvPanel', '_invFirearmPanelHtml', 'invReleaseBlocked', 'invReceiptGroups', 'invReceiptOwed',
    'invReceiptHtml', 'printBeneficiaryReceipt', 'leavingGroups', '_leavingRowHtml', 'printApprovalRequest', 'openCustodyModal',
    'addCustodyEvent', 'custodyFirearmQuestion', 'jobHasFirearms', 'jobFirearmLines', 'firearmsBannerHtml', 'firearmsWorkspaceLine',
    'deskAlertsHtml', 'collectionLineWithPhoto', 'fieldCamSetDisp', '_fieldCamChipRefusal', 'collectionLinesEnsure', 'invWorkFlags',
    '_apprTransport', '_invFirearmsDealerListHtml', '_invRecipientInput', 'planDerivedLines'], STOP, Object.assign({
    jobs: [job], _photoRefs: { 7: rows }, estimateStore: { 7: { estimate: EST } }, vendorDirectory: DIR, document: doc, _invPick: {},
    _invOpen: {}, _agDupSet: {}, _agDupSetJob: null, _invFilter: { when: 'all', room: '', q: '', flag: '' }, _invBulkLast: null,
    _printDocument: (html, title) => { log.printed.push({ html, title }); return true; }, _invPrintThumb: () => '', _invThumbHTML: () => '<div></div>',
    _invInput: () => '', alert: (m) => log.alerts.push(String(m)), showSyncBadge: (m) => log.badges.push(String(m)),
    renderInventoryTab() { log.renders++; }, _scheduleInventorySync() {}, savePhotoRefs() {}, _docNotice() {},
    _invRefreshSummary() {}, _invRefreshGuardrail() {}, _invRefreshFlagStrip() {}, _invRefreshRecords() {}, _invRefreshReleases() {},
    _invReviewRepaint() {}, _invReadLineRepaint() {}, _invRefreshAgentNotices() {}, _renderInvWorkbar: () => '', _renderInvBulk: () => '',
    _invPaintFigures() {}, agentValueAfterRename() {}, _fieldCamPaint() {}, SHEETS_SYNC_URL: 'https://script.google.com/macros/s/P4/exec',
  }, extra || {}));
  c.window.confirm = (m) => { log.confirms.push(String(m)); return c.__answer === undefined ? true : c.__answer; };
  c.confirm = c.window.confirm;
  c._invCloudSeen = { 7: true };
  return { c, log, doc, job: () => c.jobs[0], row: (id) => c._photoRefs[7].find((x) => x.stableId === id) };
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const G = (name, body) => { group(name); try { body(); } catch (e) { ok(false, name + ' — threw: ' + String(e && e.message || e).split('\n')[0]); } };

  G('A · where a firearm may go: one rule, withheld on the control, refused where it is written', () => {
    const E = rig(ESTATE(), [GUN('g', 1, { disposition: 'Hold' }), ROW('s', 2)]);
    const opts = (r, job) => E.c._invDispOptions(job || E.job(), r.disposition, r);
    eq(opts(E.row('g')), ['Auction', 'Consign', 'Distribute', 'Hold', 'Keep', 'Sell'], '⚠⚠ an estate firearm is offered a dealer, a person through one, Hold and Keep: never Donate or Junk');
    eq(opts(E.row('s')), ['Auction', 'Consign', 'Distribute', 'Donate', 'Hold', 'Junk', 'Keep', 'Sell'], 'a sideboard is offered everything, as before');
    eq(E.c._invDispOptions(E.job(), ''), ['Auction', 'Consign', 'Distribute', 'Donate', 'Hold', 'Junk', 'Keep', 'Sell'], 'the bulk menu passes no line: the bulk bar skips firearms instead');
    const L = rig(LIVING(), [GUN('g', 1, { disposition: 'Keep' })]);
    eq(L.c._invDispOptions(L.job(), 'Keep', L.row('g')), ['Auction', 'Consign', 'Distribute', 'Hold', 'Keep', 'Move', 'Sell'], 'a living client\'s firearm may go to the new home (Ask 4)');
    eq(E.c._invDispOptions(Object.assign(ESTATE(), { destAddr: '1 New St' }), '', E.row('g')).indexOf('Move'), -1, 'an estate firearm never goes to a new home, destination or not');
    eq(E.c._invDispOptions(E.job(), 'Donate', E.row('g')).indexOf('Donate') >= 0, true, 'a value already stored is still shown, as every select does');
    // The rule's words.
    has(E.c.invFirearmDispRefusal(E.job(), 'Donate'), 'A firearm is never donated.', 'Donate refused in plain words');
    has(E.c.invFirearmDispRefusal(E.job(), 'Junk'), 'A firearm is never hauled away.', 'Junk refused');
    has(E.c.invFirearmDispRefusal(E.job(), 'Move'), 'On an estate a firearm does not go to a new home.', 'New home refused on an estate');
    eq(['Auction', 'Consign', 'Sell', 'Distribute', 'Hold', 'Keep', ''].map((d) => E.c.invFirearmDispRefusal(E.job(), d)), ['', '', '', '', '', '', ''], 'every other destination is allowed');
    eq(L.c.invFirearmDispRefusal(L.job(), 'Move'), '', 'New home allowed on a client\'s own home');
    has(L.c.invFirearmDispRefusal(L.job(), 'Donate'), 'New home, which the client takes there themselves', 'and the living words say so');
    // The row's handler refuses as the select withholds.
    const r = attempt(() => E.c._invEdit(7, 'g', 'disposition', { value: 'Donate', type: 'select-one' }));
    ok(r.ok, 'the edit runs' + (r.ok ? '' : ': ' + r.err));
    eq(E.row('g').disposition, 'Hold', '⚠⚠ a firearm set to Donate on its row: nothing written');
    has(E.log.alerts.join('\n'), '#1 Remington 870 shotgun: A firearm is never donated.', 'and the refusal names the line');
    has(E.log.alerts.join('\n'), 'Nothing was changed.', 'and says nothing was changed');
    const el = { value: 'Junk', type: 'select-one' };
    E.c._invEdit(7, 'g', 'disposition', el);
    eq([E.row('g').disposition, el.value], ['Hold', 'Hold'], 'Junk too, and the control is put back');
    E.c._invEdit(7, 'g', 'disposition', { value: 'Sell', type: 'select-one' });
    eq(E.row('g').disposition, 'Sell', 'a sale to a dealer is written');
    E.c._invEdit(7, 's', 'disposition', { value: 'Donate', type: 'select-one' });
    eq(E.row('s').disposition, 'Donate', 'a sideboard donated, as before');
    L.c._invEdit(7, 'g', 'disposition', { value: 'Move', type: 'select-one' });
    eq(L.row('g').disposition, 'Move', 'a living firearm to the new home is written');
    E.c._invEdit(7, 'g', 'disposition', { value: 'Move', type: 'select-one' });
    eq(E.row('g').disposition, 'Sell', 'an estate firearm to a new home is refused');
  });

  G('B · the bulk bar skips firearms for where a line goes and who takes it, and says how many', () => {
    const rows = [GUN('a', 1), GUN('b', 2), GUN('c', 3), GUN('d', 4), ROW('l', 5, { objectName: 'Lamp' }), ROW('m', 6, { objectName: 'Rug' })];
    const E = rig(ESTATE(), rows);
    E.c._invPick = { a: 1, b: 1, c: 1, d: 1, l: 1, m: 1 };
    E.c._invBulkApply(7, 'disposition', 'Donate');
    eq(['a', 'b', 'c', 'd', 'l', 'm'].map((id) => E.row(id).disposition || ''), ['', '', '', '', 'Donate', 'Donate'], '⚠⚠ four shotguns swept to Donate: none moved; the lamp and the rug did');
    const said = E.log.badges.pop() || '';
    has(said, 'Donate set on 2 items', 'the sweep counts what it set');
    has(said, '4 firearms left as they were (#1 Remington 870 shotgun, #2 Remington 870 shotgun, #3 Remington 870 shotgun, #4 Remington 870 shotgun)', '⚠ and names the firearms it left');
    has(said, 'a firearm goes only to a licensed dealer, so where it goes and who takes it are set on its own line', 'and why');
    E.c._invBulkApply(7, 'channel', 'Goodwill Palm Beach');
    eq(['a', 'l'].map((id) => E.row(id).channel || ''), ['', 'Goodwill Palm Beach'], '⚠ a recipient swept across the selection never lands on a firearm');
    // A selection of firearms alone: nothing written, and said.
    E.c._invPick = { a: 1, b: 1 };
    E.log.alerts.length = 0;
    E.c._invBulkApply(7, 'disposition', 'Junk');
    eq([E.row('a').disposition || '', E.row('b').disposition || ''], ['', ''], 'firearms alone: nothing written');
    has(E.log.alerts.join('\n'), '2 firearms left as they were', 'and the press says so');
    has(E.log.alerts.join('\n'), 'Nothing was changed.', 'that nothing changed');
    // Other bulk fields still reach a firearm: condition, room, review.
    E.c._invBulkApply(7, 'condition', 'Fair');
    eq(E.row('a').condition, 'Fair', 'a condition across the selection reaches the firearm');
  });

  G('C · a line filed as a firearm loses what a firearm may not have; the row repaints on the category', () => {
    const job = PLANNED(ESTATE());
    const E = rig(job, [ROW('g', 1, { objectName: 'Shotgun', disposition: 'Donate', channel: 'Goodwill Palm Beach', channelFrom: 'plan' }),
      ROW('h', 2, { objectName: 'Pistol', disposition: 'Sell', channel: 'Jupiter Gun Exchange' }), ROW('k', 3, { objectName: 'Rifle', disposition: 'Junk' })]);
    E.c._invEdit(7, 'g', 'category', { value: 'Firearms', type: 'select-one' });
    eq([E.row('g').category, E.row('g').disposition, E.row('g').channel, E.row('g').channelFrom], ['Firearms', '', '', undefined],
      '⚠⚠ Donate and the Job Plan\'s Goodwill come off a line filed as a firearm');
    has(E.log.badges.join('\n'), '#1 Shotgun is a firearm: Donate came off it', 'and the desk says so at once');
    has(E.log.badges.join('\n'), 'Goodwill Palm Beach, filled in from the Job Plan, came off Who takes it', 'naming the recipient it took off');
    ok(E.log.renders > 0, 'the line moves group, so the tab is drawn');
    E.c._invEdit(7, 'h', 'category', { value: 'Firearms', type: 'select-one' });
    eq([E.row('h').disposition, E.row('h').channel], ['Sell', 'Jupiter Gun Exchange'], 'a sale to a dealer a person typed stays');
    // ⚠ SYN-14: the row and its open record repaint by id on the category.
    E.c._invOpen = { h: 1 };
    E.doc.__seed('inv-row-h', { outerHTML: '<div>old row</div>' });
    E.c._invEdit(7, 'h', 'category', { value: 'Firearms', type: 'select-one' });
    const html = E.doc.__els['inv-row-h'].outerHTML;
    has(html, 'Firearms', '⚠⚠ Firearms chosen in the record redraws the row');
    has(text(html), 'Firearm', 'with its open record\'s Firearm block');
    // Across a selection.
    E.c._invPick = { k: 1 };
    E.c._invBulkApply(7, 'category', 'Firearms');
    eq([E.row('k').category, E.row('k').disposition], ['Firearms', ''], 'a selection filed as Firearms: Junk comes off');
    has(E.log.badges.pop() || '', '#3 Rifle is a firearm: Junk came off it', 'and the sweep says so');
  });

  G('D · the Job Plan\'s vendor never fills a firearm; the agents\' naming takes it off', () => {
    const job = PLANNED(ESTATE());
    const E = rig(job, [GUN('g', 1, { disposition: 'Auction' }), ROW('s', 2, { disposition: 'Auction' }),
      ROW('n', 3, { objectName: '', namedBy: '', disposition: 'Sell', channel: 'Kodner Galleries', channelFrom: 'plan', category: 'General/Household' }),
      ROW('m', 4, { objectName: '', namedBy: '', disposition: 'Donate', channel: 'Goodwill Palm Beach', channelFrom: 'plan', category: 'General/Household' })]);
    eq(E.c.invFillPlanChannel(E.job(), EST, E.row('g')), false, '⚠⚠ the plan\'s auction house is never a firearm\'s recipient');
    eq(E.c.invFillPlanChannel(E.job(), EST, E.row('s')), true, 'a sideboard takes it, as before');
    E.c.invFillPlanChannels(7);
    eq(E.row('g').channel || '', '', 'nor on a confirm on the Job Plan');
    // Agent One names the latched Sell shot (Kodner from the plan) and the latched Donate shot as firearms.
    E.c.agentApplyResult(7, { srcId: 'n', rows: ['n'] }, { objects: [{ name: 'Remington 870 pump shotgun', category: 'Firearms', qty: 1, confidence: 'high', basis: '' }], notices: [] });
    eq([E.row('n').category, E.row('n').disposition, E.row('n').channel, E.row('n').channelFrom], ['Firearms', 'Sell', '', undefined],
      '⚠⚠ FLD-01: the shotgun named off a Sell pile keeps Sell and loses Kodner, which no person chose as its dealer');
    E.c.agentApplyResult(7, { srcId: 'm', rows: ['m'] }, { objects: [{ name: 'Colt revolver', category: 'Firearms', qty: 1, confidence: 'high', basis: '' }], notices: [] });
    eq([E.row('m').disposition, E.row('m').channel], ['', ''], 'and one named off a Donate pile goes back to Undecided');
    lacks(noComments(fn('_agWrite')), 'disposition', 'Agent One\'s writer still never touches the disposition itself');
    // Agent Two moving a research line into Firearms: the same settle, in its caller.
    has(noComments(fn('agentValueApply')), 'invFirearmSettle(', 'Agent Two\'s figure lands through the same settle');
    // Two auction houses confirmed: an ordinary line's row asks which one took it; a firearm's never offers the Job Plan's
    // vendors as its dealer, on the row or in its Who takes it box.
    const two = PLANNED(ESTATE());
    two.vendorSourcing.Lv2 = { status: 'Confirmed', vendorName: 'Hindman Palm Beach' };
    const EST2 = { rooms: ROOMS, vendors: [{ lid: 'v1', type: 'Auction House' }, { lid: 'v2', type: 'Auction House' }] };
    const W = rig(two, [GUN('g', 1, { disposition: 'Auction' }), ROW('s', 2, { disposition: 'Auction' })], { estimateStore: { 7: { estimate: EST2 } } });
    has(text(W.c._renderInvRow(W.job(), W.row('s'))), '2 confirmed: name one', 'the sideboard\'s row asks which confirmed auction house took it');
    lacks(text(W.c._renderInvRow(W.job(), W.row('g'))), 'confirmed: name one', '⚠ the shotgun\'s row never asks which Job Plan vendor is its dealer');
    has(W.c._invRecipientInput(7, W.row('s'), W.job()), 'Hindman Palm Beach', 'the sideboard\'s box names the two');
    lacks(W.c._invRecipientInput(7, W.row('g'), W.job()), 'Hindman Palm Beach', '⚠ the shotgun\'s box names neither');
  });

  G('E · the dealer is a person\'s pick: a licensed dealer on the Vendor Directory, or a recorded route', () => {
    const E = rig(ESTATE(), []);
    const D = (o) => E.c.invTransportDealer(GUN('g', 1, o));
    eq(D({ disposition: 'Donate', channel: 'Goodwill Palm Beach' }), '', '⚠⚠ EST-02: Goodwill is never the dealer');
    eq(D({ disposition: 'Junk', channel: 'Haul-It Junk Removal' }), '', 'nor a junk hauler');
    eq(D({ disposition: 'Auction', channel: 'Kodner Galleries' }), '', '⚠⚠ nor an auction house the directory does not list as a dealer');
    eq(D({ disposition: 'Sell', channel: 'Jupiter Gun Exchange', channelFrom: 'plan' }), '', '⚠⚠ FLD-01: nor a name the Job Plan filled in');
    eq(D({ disposition: 'Sell', channel: '  jupiter   gun exchange ' }), 'Jupiter Gun Exchange', 'a directory dealer typed by a person, named as the directory names it');
    eq(D({ disposition: 'Auction', channel: 'Palm Beach Arms' }), 'Palm Beach Arms', 'a firm with the dealer category among its trades');
    eq(D({ disposition: 'Hold', channel: 'Jupiter Gun Exchange' }), '', 'a firearm on Hold is going to no dealer');
    eq(D({ disposition: 'Sell', channel: 'Marie Price (daughter)', channelLeftover: 'Marie Price (daughter)' }), '', 'nor a person left from To a person');
    eq(D({ disposition: 'Distribute', channel: 'Marie Price', viaDealer: 'Jupiter Gun Exchange' }), 'Jupiter Gun Exchange', 'on a line to a person, the recorded route');
    const Cold = rig(ESTATE(), [], { vendorDirectory: [] });
    eq(Cold.c.invTransportDealer(GUN('g', 1, { disposition: 'Sell', channel: 'Jupiter Gun Exchange' })), '', 'with no directory read, no firm is a dealer: the safe direction');
    // The gate, on EST-02's papered shotgun: serial, both signatures, Goodwill.
    const papered = { authBy: 'Ruth Price', approvalDate: '2026-10-12' };
    eq(E.c.invTransportBlocked(GUN('g', 1, Object.assign({ disposition: 'Donate', channel: 'Goodwill Palm Beach' }, papered)), E.job()), 'dealer',
      '⚠⚠ it is no longer cleared to carry to Goodwill');
    eq(E.c.invTransportBlocked(GUN('g', 1, Object.assign({ disposition: 'Sell', channel: 'Jupiter Gun Exchange' }, papered)), E.job()), '',
      'to a licensed dealer, papered: cleared');
    // The reasons, for what each is.
    has(E.c.invTransportReason(GUN('g', 1, Object.assign({ disposition: 'Sell', channel: 'Kodner Galleries' }, papered)), E.job()),
      'Kodner Galleries is not a licensed dealer on the Vendor Directory', 'a name that is not a dealer');
    has(E.c.invTransportReason(GUN('g', 1, Object.assign({ disposition: 'Sell', channel: 'Kodner Galleries', channelFrom: 'plan' }, papered)), E.job()),
      'was filled in from the Job Plan, and a firearm’s dealer is chosen by a person', 'a name the plan filled in');
    has(E.c.invTransportReason(GUN('g', 1, Object.assign({ disposition: 'Hold' }, papered)), E.job()), 'Not going to a dealer', 'a firearm going nowhere yet');
    // The record and the row.
    const R = rig(ESTATE(), [GUN('g', 1, Object.assign({ disposition: 'Sell', channel: 'Goodwill Palm Beach' }, papered))]);
    R.c._invOpen = { g: 1 };
    const row = R.c._renderInvRow(R.job(), R.row('g'));
    lacks(text(row), 'Cleared to carry', '⚠⚠ the record no longer clears it to Goodwill');
    has(text(row), 'Not cleared to carry: No dealer named — Goodwill Palm Beach is not a licensed dealer on the Vendor Directory', 'it says why');
    has(text(row), 'no licensed dealer', 'and the row says so before the record is opened');
    // The recipient box suggests the directory's dealers, never one marked Do Not Use.
    const list = R.c._invFirearmsDealerListHtml(R.job());
    has(list, 'id="inv-ffl-list-7"', 'one datalist of dealers');
    has(list, 'Jupiter Gun Exchange', 'listing the directory\'s dealers');
    lacks(list, 'Stale Guns Inc', 'never one marked Do Not Use');
    lacks(list, 'Kodner Galleries', 'and no firm that is not a dealer');
    has(R.c._invRecipientInput(7, R.row('g'), R.job()), 'list="inv-ffl-list-7"', 'read by a firearm\'s Who takes it box');
    // The desk draws it once (browser step 117 reads it off the page); a box naming a list nobody drew suggests nothing.
    const tab = codeOnly(fn('renderInventoryTab'));
    eq((tab.match(/_invFirearmsDealerListHtml\(job\)/g) || []).length, 1, 'the desk draws the dealers\' list, once');
  });

  G('F · the request reads "licensed dealer not named yet" until a person names one', () => {
    const E = rig(ESTATE(), [GUN('g', 1, { disposition: 'Sell', channel: 'Kodner Galleries', channelFrom: 'plan' }),
      GUN('h', 2, { disposition: 'Sell', channel: 'Jupiter Gun Exchange' })]);
    const p = E.c.printApprovalRequest(7, false, { asHtml: true }) || {};
    ok(!!p.html, 'the request prints' + (p.why ? ': ' + p.why : ''));
    const t = text(p.html);
    has(t, 'Serial RS1 · licensed dealer not named yet', '⚠⚠ FLD-01: the shotgun the Job Plan "named" reads no dealer');
    lacks(t, 'to Kodner Galleries, a licensed dealer', 'never Kodner as its dealer');
    has(t, 'Serial RS2 · to Jupiter Gun Exchange, a licensed dealer', 'the one a person named reads its dealer');
    has(t, '1 of them has no serial or no dealer recorded yet', 'the authority block counts the one not covered');
  });

  G('G · the custody dialog opens on Choose… and asks before a firearm is Released', () => {
    has(SRC, '<select id="cust-action"><option value="">Choose…</option><option>Released</option>', '⚠ the markup starts on Choose…');
    const E = rig(ESTATE(), [GUN('g', 1, { disposition: 'Distribute', channel: 'Margaret Price' }), ROW('s', 2, { disposition: 'Sell', channel: 'Kodner Galleries' })]);
    const seed = (o) => Object.keys(o).forEach((k) => E.doc.__seed(k, o[k]));
    E.c.openCustodyModal(7, 'g');
    eq(E.doc.getElementById('cust-action').value, '', '⚠⚠ REL-04: it opens on Choose…, never on Released');
    seed({ 'cust-party': 'Uncle Bob Price', 'cust-date': '2026-10-25' });
    E.c.addCustodyEvent();
    eq((E.row('g').custodyLog || []).length, 0, 'nothing chosen: nothing recorded');
    has(E.log.alerts.join('\n'), 'Choose what happened', 'and it says what to choose');
    seed({ 'cust-action': 'Released', 'cust-party': 'Uncle Bob Price' });
    E.c.__answer = false;
    E.c.addCustodyEvent();
    eq((E.row('g').custodyLog || []).length, 0, '⚠⚠ a firearm Released to a relative is asked first, and Cancel records nothing');
    const q = E.log.confirms.pop() || '';
    has(q, '#1 Remington 870 shotgun is a firearm.', 'the question names the firearm');
    has(q, 'nobody else carries one out, family included', 'and the protocol');
    has(q, 'Not cleared to carry:', 'and what the gate says of it');
    has(q, 'report it on the Job Plan’s Incidents card', 'and where to report it');
    E.c.__answer = true;
    seed({ 'cust-action': 'Released', 'cust-party': 'Uncle Bob Price' });
    E.c.addCustodyEvent();
    eq((E.row('g').custodyLog || []).map((e) => e.action + ' · ' + e.party), ['Released · Uncle Bob Price'], 'OK records it as it happened: a flag, never a refusal');
    eq(E.doc.getElementById('cust-action').value, '', 'and the dialog goes back to Choose…');
    seed({ 'cust-action': 'Released', 'cust-party': 'Kodner Galleries' });
    const n = E.log.confirms.length;
    E.c._custodyCtx = { jobId: 7, stableId: 's' };
    E.c.addCustodyEvent();
    eq([E.log.confirms.length, (E.row('s').custodyLog || []).length], [n, 1], 'a sideboard released is not asked');
    eq(E.c.custodyFirearmQuestion(E.row('g'), E.job(), 'Received', 'Ruth Price'), '', 'a firearm received back is not asked either');
    // An action chosen and the dialog closed without saving: the next item's dialog still opens on Choose….
    seed({ 'cust-action': 'Released' });
    E.c.openCustodyModal(7, 'g');
    eq(E.doc.getElementById('cust-action').value, '', '⚠ a dialog closed with Released chosen reopens on Choose…');
  });

  G('H · firearms on this job: one rule, read by the banner, the room and the desk\'s Urgent strip', () => {
    const job = ESTATE();
    const E = rig(job, [ROW('s', 1), GUN('g', 2, { roomIdx: 1 })]);
    ok(E.c.jobHasFirearms(E.job()), '⚠⚠ FLD-07: a firearm on the inventory is a firearm on the job, intake flag or not');
    const banner = text(E.c.firearmsBannerHtml(E.job()));
    has(banner, 'FIREARMS IN THIS HOUSE — found on site', 'the Job Plan\'s banner lights');
    has(banner, 'Found on site: #2 Remington 870 shotgun · Garage', 'naming the line and its room');
    has(text(E.c.firearmsWorkspaceLine(E.job())), 'Firearm found on this job (#2 Remington 870 shotgun · Garage) — photograph in place, nothing moves.', 'the room\'s line lights');
    has(text(E.c.deskAlertsHtml(7, E.job(), { strip: [], admin: [] })), 'Firearm found on this job', 'and the desk\'s Urgent strip');
    // A note Agent One raised on a line not filed as a firearm counts until a person has looked.
    const N = rig(ESTATE(), [ROW('n', 1, { objectName: 'Gun cabinet', namedBy: 'agent', agentNotices: [{ kind: 'firearm', text: 'A rifle is visible inside' }] })]);
    ok(N.c.jobHasFirearms(N.job()), 'a Firearm note on an unreviewed line lights it');
    N.row('n').reviewed = true; N.row('n').reviewedBy = 'Ashley Jerome'; N.row('n').disposition = 'Keep';
    ok(!N.c.jobHasFirearms(N.job()), 'and a person\'s look settles it');
    const None = rig(ESTATE(), [ROW('s', 1)]);
    eq([None.c.firearmsBannerHtml(None.job()), None.c.firearmsWorkspaceLine(None.job())], ['', ''], 'no firearm: no banner, no line');
    // The notes are looked for only where one is on the job: agentNoticesOn walks the whole list for each split line, and the
    // banner draws on every Job Plan paint (a performance guard, counted here so its revert goes red).
    const P = rig(ESTATE(), [ROW('a', 1), ROW('b', 2, { derivedFrom: 'a' }), ROW('d', 3, { derivedFrom: 'a' })]);
    let calls = 0; const realNotes = P.c.agentNoticesOn;
    P.c.agentNoticesOn = function () { calls++; return realNotes.apply(this, arguments); };
    const pFound = attempt(() => P.c.jobHasFirearms(P.job()));
    eq([pFound.ok && pFound.val, calls], [false, 0], 'with no Firearm or NFA note on the job, no line\'s notes are worked out');
    const Intake = rig(ESTATE({ houseFlags: { firearms: { on: true, note: 'Gun safe in the study' } } }), []);
    has(text(Intake.c.firearmsBannerHtml(Intake.job())), 'flagged at intake', 'the intake flag still lights it, in its words');
    has(text(Intake.c.firearmsWorkspaceLine(Intake.job())), 'Firearms flagged on this job — photograph in place, nothing moves.', 'and the room\'s line');
    // One rule, counted: the two builders read it, the desk's strip reads the room's line, and nothing else re-derives it.
    const readers = [...ALL_FNS].filter((f) => f !== 'jobHasFirearms' && /\bjobHasFirearms\(/.test(codeOnly(fn(f))));
    eq(readers.sort(), ['firearmsBannerHtml', 'firearmsWorkspaceLine'], 'the readers of the one rule');
    has(codeOnly(fn('deskAlertsHtml')), 'firearmsWorkspaceLine(', 'the Urgent strip reads the room\'s line');
  });

  G('I · a living client\'s own firearm staying with them: the client takes it, in grey, never held (Ask 4)', () => {
    const L = rig(LIVING(), [GUN('k', 1, { disposition: 'Keep' }), GUN('m', 2, { disposition: 'Move' }), GUN('h', 3, { disposition: 'Hold' })]);
    eq(['k', 'm', 'h'].map((id) => L.c.invReleaseBlocked(L.row(id), L.job())), [false, false, true], '⚠⚠ LIV-05: Keep and New home are not held; Hold still is');
    eq(['k', 'm'].map((id) => L.c.invTransportBlocked(L.row(id), L.job())), ['client', 'client'], 'and never cleared to carry: the client takes it');
    eq(L.c.invTransportBlocked(Object.assign(L.row('k'), {}), ESTATE()), 'authority', 'an estate\'s Keep is not the client\'s: held as before');
    L.c._invOpen = { m: 1 };
    const row = L.c._renderInvRow(L.job(), L.row('m'));
    has(row, 'class="inv-fa-client"', 'the row says so');
    has(text(row), 'client takes it', 'in its words');
    has(row, 'color:var(--gray-dk);">client takes it', 'in grey');
    lacks(text(row), '⚠ held', 'never the red held');
    has(text(row), 'The client takes it themselves: Havellin and the movers never carry it.', 'the record says who takes it');
    lacks(text(row), 'Not cleared to carry', 'not as a refusal');
    lacks(text(row), 'locked case', '⚠ and the app prescribes no container (Ask 4)');
    const flags = L.c.invWorkFlags(L.job()).filter((f) => f.key === 'firearm')[0];
    eq(['k', 'm', 'h'].map((id) => flags.test(L.row(id), L.job())), [false, false, true], 'the Firearms held chip counts the Hold line alone');
    eq(L.c._apprTransport(7).blocked.map((b) => b.ref.stableId), ['h'], 'and the worklist\'s Transport to the dealer leaves the client\'s own out');
    lacks(noComments(fn('invFirearmClientTakes')) + decl('INV_FIREARM_CLIENT_TXT'), 'locked', 'the rule names no container');
  });

  G('J · no beneficiary receipt lists a firearm; the dealer\'s receipt has its own row, on estate and living work alike', () => {
    const appr = { authBy: 'Ruth Price', approvalDate: '2026-10-12' };
    // REL-03: an approved Colt going to Margaret with no dealer route, beside an approved clock.
    const E = rig(ESTATE(), [ROW('c', 7, Object.assign({ objectName: 'Clock', disposition: 'Distribute', channel: 'Margaret Price' }, appr)),
      GUN('g', 41, Object.assign({ objectName: 'Colt revolver', disposition: 'Distribute', channel: 'Margaret Price' }, appr))]);
    const groups = E.c.invReceiptGroups(E.job(), E.c._photoRefs[7]);
    eq(groups.map((g) => g.name + ':' + (g.released || []).map((r) => r.stableId).join(',')), ['Margaret Price:c'], '⚠⚠ REL-03: Margaret\'s receipt carries the clock and never the revolver');
    E.c.printBeneficiaryReceipt(7, 'Margaret Price');
    const printed = text((E.log.printed.pop() || {}).html);
    has(printed, 'Clock', 'the receipt prints the clock');
    lacks(printed, 'Colt revolver', '⚠⚠ and not the revolver');
    lacks(text(E.c.invReceiptHtml(E.job(), 'Margaret Price', [E.row('c'), E.row('g')])), 'Colt revolver', 'the page leaves a firearm out whoever hands it one');
    eq(E.c.invReceiptOwed(E.row('g'), E.job()), false, 'a firearm with no dealer owes no receipt');
    // And the Job Plan's receipt line counts the clock, never the revolver with no dealer route (it could never go green).
    const pl = attempt(() => E.c.planDerivedLines(7, E.job(), EST, 'admin', '2026-10-27'));
    const rc = (pl.ok ? pl.val : []).filter((l) => l && l.key === 'beneficiary_receipts')[0] || {};
    has(rc.detail || pl.err || 'no line', '0 of 1', '⚠ the Job Plan’s signed-receipt line counts the clock alone');
    // REL-15: a firearm sold to a licensed dealer, on an estate and on a client's own home.
    const sold = (id, n) => GUN(id, n, Object.assign({ objectName: 'Browning rifle', disposition: 'Sell', channel: 'Jupiter Gun Exchange' }, appr));
    [['estate', ESTATE()], ['living', LIVING()]].forEach(([k, job]) => {
      const R = rig(job, [sold('r', 40)]);
      const L = R.c.leavingGroups(R.job(), R.c._photoRefs[7]);
      eq(L.map((x) => x.taker), ['Jupiter Gun Exchange'], '⚠⚠ ' + k + ': the dealer has its own row under Leaving the property');
      const html = R.c._leavingRowHtml(R.job(), L[0] || { taker: '', receipts: [], outs: [], records: [], strayDonations: [] });
      has(text(html), 'File the dealer’s receipt (#40)', k + ': with File the dealer\'s receipt');
      has(text(html), 'A firearm leaves only to the licensed dealer, so Havellin prints no receipt for it', k + ': and why Havellin prints none');
      lacks(html, 'printBeneficiaryReceipt(', k + ': and no Havellin receipt to print');
      eq(R.c.invReceiptOwed(R.row('r'), R.job()), true, k + ': the dealer\'s receipt is owed once it may leave');
      has(text(R.c._renderInvRow(R.job(), R.row('r'))), 'no dealer’s receipt', k + ': the row says so, as the dealer\'s');
      // Filed: no longer owed, and the line counts as gone.
      R.job().signedRecords = [{ id: 'sr1', kind: 'receipt', ref: 'Jupiter Gun Exchange', stableIds: ['r'], filedAt: T0, url: 'https://drive.google.com/x' }];
      eq([R.c.invReceiptOwed(R.row('r'), R.job()), R.c.invRecordedGone(R.row('r'), R.job())], [false, true], k + ': filed, nothing owed and the line has gone');
    });
  });

  G('K · the camera: a firearms collection is never photographed onto Donate or Remove', () => {
    const job = ESTATE();
    const line = ROW('col', 1, { objectName: 'Gun collection', category: 'Firearms', disposition: 'Hold', sourceCollId: 9, filename: '', driveFileUrl: null, driveFileId: '' });
    const E = rig(job, [line]);
    const shot = { roomIdx: 1, label: 'inventory', seq: 1, collId: null, filename: 'x.jpg', driveFileUrl: null, status: 'uploading', ts: T0 };
    eq(E.c.collectionLineWithPhoto(line, shot, { fieldDisp: 'donate' }, job).disposition, 'Hold', '⚠⚠ a latched Donate chip never lands on a firearms collection');
    eq(E.c.collectionLineWithPhoto(line, shot, { fieldDisp: 'remove' }, job).disposition, 'Hold', 'nor Remove');
    eq(E.c.collectionLineWithPhoto(line, shot, { fieldDisp: 'sell' }, job).disposition, 'Sell', 'Sell to a dealer still does');
    const sofa = ROW('so', 2, { objectName: 'Sofa', sourceCollId: 8, filename: '', driveFileUrl: null, driveFileId: '' });
    eq(E.c.collectionLineWithPhoto(sofa, shot, { fieldDisp: 'donate' }, job).disposition, 'Donate', 'an ordinary collection takes Donate as before');
    E.c._fieldCam = { open: true, jobId: 7, coll: 'col', disp: 'undecided' };
    eq(E.c.fieldCamSetDisp('donate'), false, '⚠ the Donate chip is refused while the firearms collection is armed');
    eq(E.c._fieldCam.disp, 'undecided', 'nothing latched');
    has(E.c._fieldCam.talkMsg || '', 'A firearm is never donated.', 'and the strip says why');
    eq(E.c.fieldCamSetDisp('sell'), true, 'Sell is taken');
    has(noComments(fn('_fieldCamPaint')), '_fieldCamChipRefusal(st, d.key)', 'the chips are withheld on the control by the same answer');
    // A walkthrough's firearms collection marked Donate lands Undecided.
    const W = rig(Object.assign(ESTATE(), {}), [], { estimateStore: { 7: { estimate: { rooms: ROOMS, collections: [{ id: 5, name: 'Shotgun collection', disp: 'donate', qty: 3 }] } } } });
    W.c.collectionLinesEnsure(7);
    const wl = W.c._photoRefs[7][0] || {};
    eq([wl.category, wl.disposition || ''], ['Firearms', ''], 'a walkthrough firearms collection marked Donate lands Undecided');
  });

  G('M · the row repaints when a recipient names its dealer; Agent Two filing a firearm settles it; the camera withholds the chips', () => {
    // A licensed dealer typed into a gun's Who takes it: its row (and open record) redraw at once, by id.
    const E = rig(ESTATE(), [GUN('g', 1, { disposition: 'Sell', authBy: 'Ruth Price', approvalDate: '2026-10-12' })]);
    E.c._invOpen = { g: 1 };
    E.doc.__seed('inv-row-g', { outerHTML: '<div>old row</div>' });
    E.c._invEdit(7, 'g', 'channel', { value: 'Jupiter Gun Exchange', type: 'text' });
    const row = E.doc.__els['inv-row-g'].outerHTML;
    lacks(row, 'old row', '⚠ a dealer named in the box redraws the row');
    has(text(row), 'Cleared to carry. Havellin’s named principal alone takes it to Jupiter Gun Exchange', 'and its record says it is cleared, to that dealer');
    lacks(text(row), 'no licensed dealer', 'with no "no licensed dealer" left on it');
    // Agent Two filing a researched line under Firearms: what a firearm may not have comes off, in agentValueApply.
    const A = rig(ESTATE(), [ROW('a', 2, { objectName: 'Flintlock pistol', namedBy: 'agent', category: 'Antiques', disposition: 'Donate',
      channel: 'Goodwill Palm Beach', channelFrom: 'plan', valSource: '', fmv: '' })]);
    const out = attempt(() => A.c.agentValueApply(7, 'a', { fmv: 900, low: 700, high: 1100, confidence: 'medium', mode: 'research',
      category: 'Firearms', name: 'Flintlock pistol', comps: [], notices: [] }, A.job(), {}));
    eq(out.ok ? out.val : out.err, 'valued', 'Agent Two values it');
    eq([A.row('a').category, A.row('a').disposition, A.row('a').channel], ['Firearms', '', ''], '⚠⚠ filed under Firearms by Agent Two: Donate and the plan\'s Goodwill come off');
    // The camera's chips, drawn while a firearms collection is armed: Donate and Remove are there and pressed nothing.
    const line = ROW('col', 1, { objectName: 'Gun collection', category: 'Firearms', disposition: 'Hold', sourceCollId: 9, filename: '', driveFileUrl: null, driveFileId: '' });
    const dom = domStub({});
    const P = lift(['_fieldCamPaint'], ['_paintRoomWorkspace'], { jobs: [ESTATE()], _photoRefs: { 7: [line] }, estimateStore: { 7: { estimate: EST } },
      document: dom, _fieldCam: { open: true, jobId: 7, roomIdx: 1, mode: 'inventory', coll: 'col', disp: 'undecided', count: 0 } });
    const r = attempt(() => P._fieldCamPaint());
    ok(r.ok, 'the camera strip paints' + (r.ok ? '' : ': ' + r.err));
    const ui = dom.__els['fc-ui'] ? dom.__els['fc-ui'].innerHTML : '';
    has(ui, 'disabled title="A firearm is never donated.', '⚠ Donate is withheld on the control');
    has(ui, 'disabled title="A firearm is never hauled away.', 'and Remove');
    lacks(ui.slice(ui.indexOf("fieldCamSetDisp('sell')") - 120, ui.indexOf("fieldCamSetDisp('sell')")), 'disabled', 'Sell is offered');
  });

  G('L · one rule each, counted', () => {
    const live = (f) => codeOnly(fn(f));
    const readers = (name) => [...ALL_FNS].filter((f) => f !== name && new RegExp('\\b' + name + '\\(').test(live(f))).sort();
    eq(readers('invFirearmDispRefusal'), ['_fieldCamChipRefusal', '_invDispOptions', '_invEdit', 'collectionLineWithPhoto', 'invFirearmSettle', 'invFirearmSettleText'],
      'where a firearm may go: the select, the row\'s handler, the camera, the settle and its words');
    ok(readers('invFirearmSettle').length >= 5, 'the settle runs wherever a line can become a firearm (' + readers('invFirearmSettle').join(', ') + ')');
    lacks(live('invTransportDealer'), "String(ref.channel || '').trim()", '⚠⚠ the dealer is never the bare channel');
    has(live('invFillPlanChannel'), 'invIsFirearm(ref)', 'the plan fill asks whether the line is a firearm');
    has(live('invReceiptHtml'), 'invIsFirearm(r)', 'the receipt page leaves firearms out itself');
    eq(readers('invFirearmClientTakes'), ['_renderInvRow', 'invReleaseBlocked', 'invTransportBlocked'], 'the client-takes rule: the hold, the gate and the row');
    eq(readers('invFirearmsDealerFirm'), ['invTransportDealer'], 'the directory dealer is read through the dealer alone');
  });
};
