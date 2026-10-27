'use strict';
// THE DESK'S ROW AS COLUMNS UNDER HEADINGS, AND A SPLIT LINE TAKING ITS PHOTOGRAPH'S DESTINATION (2026-10-24).
//
// Anthony, off the desk after a practice run, with three screenshots: *"is the empty field second to right, is that supposed
// to be the value and there's no title for it or heading for it? … maybe we can just label those two columns. Also, it
// would be nice to have the number of items viewable at the headline level here. So if it counts things wrong, we can
// quickly update it … Also, maybe the link to the drive where the actual photo is stored … at the headline level too … So
// maybe wrap the description text so that it frees up a little bit more room to the right to add the quantity, and then
// have a link somewhere to the photo file in Drive."*
//
// And the towels: one photograph of plates, bath towels and hand towels on a kitchen counter, Donate pressed in the house
// and "all going to Habitat for Humanity" said over it. Agent One split it into three lines; the plates (the photograph's
// own line) kept Donate and the note, the split lines came back with no destination by design, and the bath towels sat in
// Not yet decided. Asked whether a line split off a photograph should take that photograph's destination, Anthony chose
// *"Take the destination (Recommended): Every line split off a photo (Agent One's or Another item in this photo) starts
// with the photo's destination (Donate here) and its recipient if one is named. ⚑ and the note stay on the photo's own
// line. Change any one that goes elsewhere on the desk."*
//
// So:
//   A. the row draws its boxes in column classes (Photo · # · Item · Qty · Each · Total · Where it goes · Who takes it; Each
//      and Total since 2026-10-25b, Anthony: "the total value needs to be multiplied by the number in the group"), the
//      photograph a link to its file in Drive, the name a wrapping box, the count a box of its own;
//   B. each open group draws one row of headings in the same classes, Who takes it exactly where its rows carry the box
//      (one answer, _invRowHasWho), none on a folded group;
//   C. the count left the line's record (one box per value);
//   D. a line split off a photograph (invSplitItemN: Agent One's split and the desk's Another item in this photo alike)
//      takes the photograph's destination and recipient, and nothing else;
//   E. the stylesheet: the headings and the boxes share one width per column; on a phone the headings go and each box
//      names itself.

const { sandbox, source, fn } = require('./harness');

const SRC = source();
const code = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n');
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }
// Every function whose live body calls `name` (comments off).
function callersOf(name) {
  const out = new Set();
  const re = new RegExp('\\b' + name + '\\(', 'g');
  let m;
  while ((m = re.exec(SRC))) {
    const def = SRC.lastIndexOf('\nfunction ', m.index);
    if (def < 0) continue;
    const f = /^\nfunction\s+([A-Za-z0-9_$]+)\s*\(/.exec(SRC.slice(def, def + 120));
    if (!f || f[1] === name) continue;
    let body = '';
    try { body = code(fn(f[1])); } catch (e) { continue; }
    if (new RegExp('\\b' + name + '\\(').test(body)) out.add(f[1]);
  }
  return [...out].sort();
}

// The row, lifted as photo-split.test.js lifts it, with the two helpers it reads since 2026-10-24.
const ROW_FNS = ['invLineReviewed', 'invLineOpen', '_renderInvRow', 'invApprovalPrevWords', 'invApprovalMoved', '_invRowPhotoHtml', '_invRowHasWho', 'invOutForAppraisal', 'collectionLineUnshot', '_invPhotoOpenHtml',
  '_invHasPhoto', '_collPanelHtml', '_arDupEligible', '_avRowBadges', 'agentValueStale', 'agentValueUnreviewed', 'agentValueSpecialistWorth', 'invPickupRecord', 'signedRecordsOf', '_invRowDomId', '_invRecipientInput', 'invPlanChannel', '_invDetailRefs',
  '_invPhotoSiblings', '_invPhotoSource', '_invDerivedRefs', '_getPhotoRef', '_invItemNo', 'invDealerRouteOffered', 'invDealerRoute',
  'invDealerRouteText', 'invBequestFor', 'jobListEntries', 'invApprovalGap', 'invReceiptOwed', '_invBenListAttr', 'invRatificationOwed', 'invWrittenReleaseNeeded',
  'invFiduciaryMode', 'isDecedentJob', 'invReleaseCautions', 'invBequestElsewhere', '_invJob', 'invHavellinRecipient', 'invChannelLeftover', 'invChannelLeftoverText',
  '_invPanelCautionHtml', '_invPanelLeftoverHtml', '_jobDestLabel', 'invAppraisalSourceText', 'invLineAppraiser', '_invLinkedAppraiser',
  'invAppraised', 'invAppraisalInProgress', '_invHasAppraisal', '_invHasValue', '_avHasFigure', 'invLineUnsure', '_invEachInput', 'invUnitValue', 'invLineQty', '_agNameKey', '_invInputStyle', '_invCtrlMinW', 'invLineAccepted', 'invLineHold', '_invLineHolds', '_invPhotoNoteOpen', 'invNeedsAppraisal', 'invLineAcceptedOnly', '_invRevBoxHtml', 'invIsMAIV', 'invMAIVDefaultCat', '_invAcceptCtxOf', 'invAcceptCtx', 'agentDuplicateGroups', '_jobInvRefs', '_agDupEligible', 'agentNamedTwice', 'gateDispute', '_gateYes', 'agentValueInternal'];
const ROW_VARS = ['INV_PLAN_CHANNEL_KINDS', 'INV_RELEASE_DISPOSITIONS', 'INVENTORY_COLUMNS', '_invOpen', '_invPick', '_agDupSet',
  'DECEDENT_SERVICES', 'INV_RELEASE_CAUTIONS', 'MAIV_OTHER', 'MAIV_BY_CATEGORY', '_agDupSetJob', 'INV_HOLD_WORDS', 'INV_OPEN_HOLDS', 'INV_ACCEPT_AMMO_RE'];
const LINE = (o) => Object.assign({ stableId: 'k80', label: 'inventory', roomIdx: 1, ts: 1, itemNo: 80, category: 'General/Household',
  objectName: 'White ceramic salad/dessert plates, coupe form, unmarked in frame', disposition: 'Donate', qty: 8,
  driveFileId: 'FK80', driveFileUrl: 'https://drive.google.com/file/d/FK80/view' }, o || {});
function rowRig(refs) {
  return sandbox({
    fns: ROW_FNS, vars: ROW_VARS,
    stubs: {
      _invInput: (j, r, c) => '<i data-col="' + c.key + '"></i>', _invThumbHTML: (j, r, px) => '<div data-thumb-id="' + (r.driveFileId || '') + '" data-px="' + px + '"></div>',
      _invRoomName: () => 'Kitchen', invIsFirearm: () => false, invReleaseBlocked: () => false, invAwaitingAppraisal: () => false,
      custodyEvents: () => [], _invPanelCols: () => [], INV_PANEL_SECTIONS: [], jobs: [{ id: 7, svc: 'home_cleanout' }], estimateStore: {},
      _photoRefs: { 7: refs },
    },
  });
}
// The column classes a fragment carries, in order (inv-c-pick is the heading's spacer over the row's own checkbox).
const cols = (html) => (String(html).match(/class="[^"]*\binv-c-(pick|photo|no|item|qty|each|val|disp|who|rev|open)\b/g) || [])
  .map((s) => s.match(/inv-c-(pick|photo|no|item|qty|each|val|disp|who|rev|open)/)[1]);

module.exports = function ({ group, ok, eq, has, lacks }) {
  // ═══ A. THE ROW ═══
  group('A · the row: the photograph a link to Drive, the name wrapping, the count, the boxes in their columns');
  {
    const R = rowRig([LINE()]);
    const r = attempt(() => R._renderInvRow({ id: 7, svc: 'home_cleanout' }, LINE()));
    ok(r.ok, 'the row renders (' + (r.err || 'ok') + ')');
    const row = r.ok ? r.val : '';
    eq(cols(row), ['photo', 'no', 'item', 'qty', 'each', 'val', 'disp', 'who', 'rev', 'open'],
       'Photo · # · Item · Qty · Each · Total · Where it goes · Who takes it · Reviewed · ▾, in that order');
    has(row, '<a class="inv-c-photo inv-photo-link" href="https://drive.google.com/file/d/FK80/view" target="_blank" rel="noopener" title="Open the full photo in Drive">',
        '⚠ the photograph opens its file in Drive, in a new tab (Anthony: "the link to the drive … at the headline level")');
    has(row, 'data-px="72"', 'still at 72 px');
    // The count, on the row, through the one writer.
    has(row, '<div class="inv-c inv-c-qty" data-cap="Qty"><input type="number" min="1" step="1" class="inv-qty" value="8"', '⚠ the count is a box on the row, reading the line’s 8');
    has(row, "onchange=\"_invEdit(7,'k80','qty',this)\"", '…written through _invEdit');
    // The name wraps: a textarea as tall as its text, the whole name carried beside it.
    has(row, '<div class="inv-name" data-v="White ceramic salad/dessert plates, coupe form, unmarked in frame"><textarea rows="1"',
        '⚠ the name is a wrapping box, its whole text beside it (Anthony: "wrap the description text")');
    has(row, "onchange=\"_invEdit(7,'k80','objectName',this)\">White ceramic salad/dessert plates, coupe form, unmarked in frame</textarea>", '…written through _invEdit, as before');
    has(row, "event.key===\\'Enter\\'".replace(/\\'/g, "'"), 'Enter ends the edit, as it did in the one-line box');
    has(row, "oninput=\"this.parentNode.setAttribute('data-v',this.value)\"", '…and the hidden copy follows the typing, so the box grows as the name does');
    lacks(row, "<input type=\"text\" value=\"White ceramic", 'never the one-line box that cut a long name off');
    // The boxes in their columns, each naming itself for the phone.
    has(row, '<div class="inv-c inv-c-each" data-cap="Each"><input type="text" inputmode="decimal" id="inv-each-k80" class="inv-each"', 'one article\'s value in the Each column…');
    has(row, "onchange=\"_invEdit(7,'k80','unitVal',this)\"", '…written through _invEdit, which multiplies it by the count (agents-together.test.js A8)');
    has(row, '<div class="inv-c inv-c-val" data-cap="Total"><i data-col="fmv">', 'the line\'s value box in the Total column');
    has(row, '<div class="inv-c inv-c-disp" data-cap="Where it goes"><i data-col="disposition">', 'the disposition in Where it goes');
    has(row, '<div class="inv-c inv-c-who" data-cap="Who takes it"><input type="text"', 'the recipient in Who takes it');
    has(row, 'class="inv-recip"', '…the recipient box itself');
    // An unnamed line's box stays bronze (the Unnamed pile still reads as a pile); a named one quiet.
    const blank = attempt(() => rowRig([LINE({ objectName: '' })])._renderInvRow({ id: 7 }, LINE({ objectName: '' })));
    has(blank.ok ? blank.val : '', '<div class="inv-name inv-unnamed" data-v="">', 'an unnamed line’s box is marked to stand out');
    lacks(row, 'inv-unnamed', 'a named one is not');
    // A line with no count reads 1, as every paper prints it, and writes nothing until a person changes it.
    const one = attempt(() => rowRig([LINE({ qty: '' })])._renderInvRow({ id: 7 }, LINE({ qty: '' })));
    has(one.ok ? one.val : '', 'class="inv-qty" value="1"', 'a line with no count reads 1');
    // A typed line, or a shot not yet in Drive, has no link.
    const typed = LINE({ stableId: 'm1', manual: true, driveFileUrl: null, driveFileId: null });
    const t = attempt(() => rowRig([typed])._renderInvRow({ id: 7 }, typed));
    ok(t.ok, 'a typed line renders (' + (t.err || 'ok') + ')');
    lacks(t.ok ? t.val : '<a', '<a class="inv-c-photo', 'a line with no file in Drive has no link');
    has(t.ok ? t.val : '', '<div class="inv-c-photo">', '…its photograph cell is drawn all the same, so the columns hold');
    has(t.ok ? t.val : '', 'title="Manual line item (no photo)">M</span>', 'the typed line’s M stays on the row');
    // Who takes it only where something leaves or moves.
    const keep = attempt(() => rowRig([LINE({ disposition: 'Keep' })])._renderInvRow({ id: 7 }, LINE({ disposition: 'Keep' })));
    eq(cols(keep.ok ? keep.val : ''), ['photo', 'no', 'item', 'qty', 'each', 'val', 'disp', 'rev', 'open'], 'a Keep row has no Who takes it');
    // The note runs to two lines (it was cut at one).
    const noted = attempt(() => rowRig([LINE({ fieldNote: 'all going to Habitat for Humanity' })])._renderInvRow({ id: 7 }, LINE({ fieldNote: 'all going to Habitat for Humanity' })));
    has(noted.ok ? noted.val : '', '<div class="inv-note" title="all going to Habitat for Humanity">&#127908; all going to Habitat for Humanity</div>', 'the spoken note under the name');
  }

  // ═══ B. THE HEADINGS ═══
  group('B · the headings over each open group, in the row’s own columns');
  {
    const H = sandbox({ fns: ['_renderInvColHead', '_invRowHasWho', '_renderInvGroup', '_renderInvGroupHead', '_invGroupDomId', '_invGroupHeadDomId',
      '_renderInvRoomBlock', '_renderInvRoomHead', '_invRoomDomId', '_invRoomHeadDomId'],
      vars: ['INV_RELEASE_DISPOSITIONS', '_invFold'],
      stubs: { _renderInvRow: (job, r) => '<div class="row" data-id="' + r.stableId + '"></div>', _invProgressBar: () => '', _invDispLabel: (k) => k || 'Not yet decided' } });
    const G = (key) => ({ key: key, label: key || 'Not yet decided', items: [{ stableId: 'a' }], fmv: 0, reviewed: 0, rooms: [{ key: '1', name: 'Kitchen', items: [{ stableId: 'a' }] }] });
    const head = attempt(() => H._renderInvColHead({ id: 7 }, G('Donate')));
    ok(head.ok, 'the headings render (' + (head.err || 'ok') + ')');
    const words = (h) => String(h).replace(/<[^>]+>/g, '|').split('|').map((s) => s.trim()).filter(Boolean);
    eq(words(head.ok ? head.val : ''), ['Photo', '#', 'Item', 'Qty', 'Each', 'Total', 'Where it goes', 'Who takes it'],
       '⚠ the headings name every box, the two Anthony asked about included: the value (Each and Total since 2026-10-25b) and Who takes it');
    eq(cols(head.ok ? head.val : ''), ['pick', 'photo', 'no', 'item', 'qty', 'each', 'val', 'disp', 'who', 'rev', 'open'],
       '…each in the column class of the box under it');
    const R = rowRig([LINE()]);
    const row = attempt(() => R._renderInvRow({ id: 7 }, LINE()));
    eq(cols(head.ok ? head.val : '').slice(1), cols(row.ok ? row.val : ''), '⚠⚠ heading for heading, the row’s columns: they line up by construction');
    const und = attempt(() => H._renderInvColHead({ id: 7 }, G('')));
    eq(words(und.ok ? und.val : ''), ['Photo', '#', 'Item', 'Qty', 'Each', 'Total', 'Where it goes'], 'Not yet decided has no Who takes it, as its rows have no box');
    eq(words(attempt(() => H._renderInvColHead({ id: 7 }, G('Move'))).val), ['Photo', '#', 'Item', 'Qty', 'Each', 'Total', 'Where it goes', 'Who takes it'], 'Move has it, as its rows do');
    // One answer for both.
    ['Keep', 'Move', 'Distribute', 'Auction', 'Consign', 'Sell', 'Donate', 'Junk', 'Hold', '', 'Undecided'].forEach((d) => {
      const rr = attempt(() => rowRig([LINE({ disposition: d })])._renderInvRow({ id: 7 }, LINE({ disposition: d })));
      const hh = attempt(() => H._renderInvColHead({ id: 7 }, G(d)));
      eq(cols(rr.ok ? rr.val : '').indexOf('who') >= 0, cols(hh.ok ? hh.val : 'x').indexOf('who') >= 0, (d || 'blank') + ': the heading and the row agree on Who takes it');
    });
    eq(callersOf('_invRowHasWho'), ['_renderInvColHead', '_renderInvRow'], 'the one answer, read by the row and the headings and nothing else');
    // Drawn once per open group, between the group's head and its rooms; none on a folded group.
    const grp = attempt(() => H._renderInvGroup({ id: 7 }, G('Donate')));
    const g = grp.ok ? grp.val : '';
    eq(g.split('class="inv-colhead"').length - 1, 1, 'an open group draws its headings once');
    ok(g.indexOf('class="inv-colhead"') > g.indexOf('Select all') && g.indexOf('class="inv-colhead"') < g.indexOf('Kitchen'),
       '…under the group’s head, above its first room');
    const und2 = attempt(() => H._renderInvGroup({ id: 7 }, G(''))).val || '';
    ok(und2.indexOf('This is the list to work down.') >= 0 && und2.indexOf('This is the list to work down.') < und2.indexOf('class="inv-colhead"'),
       'Not yet decided: under its sentence');
    H._invFold.Donate = true;
    const folded = attempt(() => H._renderInvGroup({ id: 7 }, G('Donate'))).val || 'class="inv-colhead"';
    lacks(folded, 'class="inv-colhead"', 'a folded group draws no headings, as it draws no rows');
  }

  // ═══ C. THE COUNT LEFT THE RECORD ═══
  group('C · the count is on the row and nowhere else on screen');
  {
    const P = sandbox({ fns: ['_invPanelCols', '_invColOnJob', 'invFiduciaryMode', 'isDecedentJob'], vars: ['INVENTORY_COLUMNS', 'DECEDENT_SERVICES'] });
    [{ id: 1, svc: 'probate' }, { id: 2, svc: 'downsizing_move' }].forEach((job) => {
      const keys = P._invPanelCols(job).map((c) => c.key);
      ok(keys.indexOf('qty') < 0, job.svc + ': the line’s record carries no second count box (one box per value)');
      ok(keys.indexOf('condition') >= 0, job.svc + ': …its other fields stay');
    });
    ok(P.INVENTORY_COLUMNS.some((c) => c.key === 'qty'), 'the column itself stays: the CSV, the workbook and the papers carry it');
  }

  // ═══ D. A SPLIT LINE TAKES ITS PHOTOGRAPH'S DESTINATION ═══
  group('D · a line split off a photograph takes the photograph’s destination and recipient, and nothing else');
  {
    const PHOTO = (o) => Object.assign({ stableId: 'k80', roomIdx: 1, label: 'inventory', collId: null, seq: 3, filename: 'k80.jpg',
      driveFileUrl: 'https://drive.google.com/file/d/FK80/view', driveFileId: 'FK80', status: 'uploaded', ts: 1000,
      objectName: 'White ceramic plates', category: 'General/Household', disposition: 'Donate', channel: 'Habitat for Humanity',
      fieldNote: 'all going to Habitat for Humanity', needsAppr: true, fmv: '40', condition: 'Good', authBy: 'Robert Hale', approvalDate: '2026-10-20',
      dispDate: '2026-10-21', itemNo: 80 }, o || {});
    const rig = (refs) => sandbox({
      fns: ['invSplitItemN', '_invSplitSource', 'invSplitItem', '_invPhotoSource', '_getPhotoRef', '_setPhotoRef', '_invFileId', '_photoUid', 'agentApplyResult', '_agWrite', '_invCondIsAgents', '_invAgentCondition', '_agState', '_jobInvRefs'],
      vars: ['_photoUidSeq', 'INV_DEFAULT_CATEGORY', 'INV_SPLIT_MAX', 'INV_CATEGORIES', 'INV_TAXONOMY', '_agRun', 'AGENT_CONDITIONS'],
      stubs: { jobs: [{ id: 7 }], _photoRefs: { 7: refs }, savePhotoRefs() {}, _invTouch(r) { r.updatedAt = 1; return r; }, _scheduleInventorySync() {} },
    });
    const S = rig([PHOTO()]);
    const made = attempt(() => S.invSplitItemN(7, 'k80', 2));
    ok(made.ok && Array.isArray(made.val) && made.val.length === 2, 'two lines split off the photograph (' + (made.err || 'ok') + ')');
    const lines = made.ok && Array.isArray(made.val) ? made.val : [{}, {}];
    eq(lines.map((r) => [r.disposition, r.channel]), [['Donate', 'Habitat for Humanity'], ['Donate', 'Habitat for Humanity']],
       '⚠⚠ each takes the photograph’s Donate and its recipient (Anthony: "Take the destination")');
    ['objectName', 'fieldNote', 'needsAppr', 'fmv', 'condition', 'authBy', 'approvalDate', 'dispDate', 'itemNo'].forEach((k) => {
      ok(lines.every((r) => r[k] === undefined || r[k] === ''), k + ' is not copied: ⚑ and the note stay on the photograph’s own line, and each line is approved and dated on its own');
    });
    eq(lines.map((r) => r.category), ['General/Household', 'General/Household'], 'the default category, as before');
    // A plan-filled recipient keeps its mark.
    const P2 = rig([PHOTO({ channelFrom: 'plan' })]);
    eq(attempt(() => P2.invSplitItem(7, 'k80').channelFrom).val, 'plan', 'a recipient the Job Plan filled keeps its mark (from the Job Plan)');
    // Undecided, or nothing chosen, gives nothing: silence is never filed.
    [['Undecided', 'Undecided'], ['', 'nothing chosen']].forEach(([d, w]) => {
      const U = rig([PHOTO({ disposition: d, channel: '' })]);
      const u = attempt(() => U.invSplitItem(7, 'k80'));
      eq(u.ok ? [u.val.disposition, u.val.channel] : null, ['', undefined], w + ' on the photograph: the split line starts in Not yet decided');
    });
    // No recipient on the photograph: the destination alone.
    const N = rig([PHOTO({ channel: '  ' })]);
    const n = attempt(() => N.invSplitItem(7, 'k80'));
    eq(n.ok ? [n.val.disposition, n.val.channel] : null, ['Donate', undefined], 'no recipient named: the destination alone');
    // Split off a split line: the photograph's own line answers, never the line pressed.
    const L = rig([PHOTO(), PHOTO({ stableId: 'k86', derivedFrom: 'k80', disposition: 'Keep', channel: '' })]);
    eq(attempt(() => L.invSplitItem(7, 'k86').disposition).val, 'Donate', 'split off a split line, the photograph’s destination');
    // Agent One's split, the towels: three things, one photograph.
    const A = rig([PHOTO({ objectName: '', fieldNote: 'all going to Habitat for Humanity', needsAppr: false, fmv: '', authBy: '', approvalDate: '', dispDate: '' })]);
    const res = attempt(() => A.agentApplyResult(7, { srcId: 'k80', rows: ['k80'] }, { notices: [], objects: [
      { name: 'White ceramic salad/dessert plates', category: 'General/Household', qty: 8, confidence: 'medium' },
      { name: 'White cotton terry bath towels, folded', category: 'General/Household', qty: 4, confidence: 'medium' },
      { name: 'White cotton terry hand towels / washcloths, folded', category: 'General/Household', qty: 1, confidence: 'medium' }] }));
    ok(res.ok, 'Agent One’s answer applies (' + (res.err || 'ok') + ')');
    const all = A._jobInvRefs(7);
    eq(all.map((r) => [r.objectName.split(',')[0], r.disposition, r.channel || '']), [
      ['White ceramic salad/dessert plates', 'Donate', 'Habitat for Humanity'],
      ['White cotton terry bath towels', 'Donate', 'Habitat for Humanity'],
      ['White cotton terry hand towels / washcloths', 'Donate', 'Habitat for Humanity']],
       '⚠⚠ the towels: all three things in the photograph go where the photograph was going');
    eq(all.map((r) => r.fieldNote || ''), ['all going to Habitat for Humanity', '', ''], '…the note on the photograph’s own line only');
    eq(all.map((r) => r.qty), [8, 4, undefined], 'and each its own count (a count of one is not written)');
  }

  // ═══ E. THE STYLESHEET ═══
  group('E · one width per column for the headings and the boxes; on a phone the headings go and each box names itself');
  {
    const css = SRC.slice(SRC.indexOf('<style>'), SRC.indexOf('</style>'));
    ok(css.length > 50000, 'fixture: the first stylesheet read whole (' + css.length + ' chars)');
    const phoneAt = css.indexOf('.inv-colhead{display:none;}');
    ok(phoneAt > 0, 'the phone block hides the headings');
    const desk = css.slice(0, css.indexOf('/* The desk\'s row on a phone (2026-10-24)'));
    ok(desk.length > 1000 && desk.length < phoneAt, 'fixture: the laptop rules read apart from the phone’s');
    [['pick', '14px'], ['photo', '72px'], ['no', '26px'], ['qty', '52px'], ['each', '92px'], ['val', '104px'], ['disp', '110px'], ['who', '150px'], ['rev', '84px'], ['open', '30px']].forEach(([c, w]) => {
      ok(new RegExp('\\.inv-c-' + c + '\\{flex:0 0 ' + w).test(desk), '.inv-c-' + c + ' is ' + w + ' wide, heading and box alike');
    });
    has(desk, '.inv-c-item{flex:1 1 auto;min-width:0;}', 'the item takes the rest');
    // The phone block is the one at max-width:820px, and these rules sit inside it.
    const phoneBlock = css.lastIndexOf('@media (max-width:820px)', phoneAt);
    const depth = phoneBlock > 0 ? css.slice(phoneBlock, phoneAt).split('{').length - css.slice(phoneBlock, phoneAt).split('}').length : 0;
    ok(phoneBlock > 0 && depth === 1, 'fixture: the phone rules are inside the phone block (depth ' + depth + ')');
    has(css.slice(phoneAt), '.inv-c[data-cap]::before{content:attr(data-cap);', 'on a phone each box names itself above it');
    has(css.slice(phoneAt), '.inv-name::after{font-size:16px;}', '…and the name’s copy grows with the phone’s 16 px text, so the box stays as tall as its words');
    has(desk, ".inv-name::after{content:attr(data-v) ' ';visibility:hidden;}", 'the name box is as tall as its own hidden copy');
    has(desk, '.inv-name>textarea{width:100%;height:auto;', '…not the 70 px every other textarea is');
  }
};
