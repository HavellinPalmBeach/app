'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// A CLOSE-UP AFTER THE FACT (2026-10-24). Anthony, off a line Agent One flagged *Look at this* for a blurred mark under a
// stack of plates: *"is there a workflow for taking a detail photo after the fact and attaching it to [the] item … saying
// this is the same item?"* There was none: the camera's Close-up files under the last item shot in that session, so a
// close-up missed in the house came only as a new line, with the old one removed and its number spent. Asked, he took
// **+ Close-up** on the line: a button in the line's record that takes a photograph (the iPad's camera or one already
// taken) and files it as a close-up of THAT line, through the one writer, `_captureShot`.
//
//   It is offered on a line with a photograph, and refused (by the same rule) on a typed line, a removed line or a line
//   still owed its photograph.
//   It files a close-up keyed on the line itself, a split line included, adds no line and touches nothing on the line.
//   The record shows it, with its state (on its way, not saved and Retry).
//   Agent Two reads it with the line (a split line's own close-ups first, then its photograph's).
//   The room's bin takes it with the photograph its line comes from, and Restore gives it back with that line.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { sandbox, fn, source } = require('./harness');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const text = (h) => String(h).replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&rsquo;/g, '’').replace(/&#10133;/g, '➕').replace(/&#9662;/g, '▾').replace(/\s+/g, ' ').replace(/\s+([,.;:)])/g, '$1');

const liveLines = (s) => String(s).split('\n')
  .filter((l) => { const t = l.trim(); return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')); })
  .join('\n');

const JOB = { id: 1, hvlId: 'HVL-0009', name: 'Ellison Estate', svc: 'cleanout', won: true, status: 'won' };
const EST = { svc: 'cleanout', rooms: [{ idx: 2, name: 'Kitchen', tcH: 1, psH: 2 }] };
// The plates: one photograph, two lines (the dinner plates on the photograph, the salad plates split off it).
const PLATES = () => [
  { stableId: 'p', label: 'inventory', roomIdx: 2, seq: 5, filename: 'HVL-0009_Kitchen_INV_5.jpg', driveFileId: 'FID_P',
    driveFileUrl: 'https://drive.google.com/file/d/FID_P/view', status: 'uploaded', ts: 1000, itemNo: 73,
    objectName: 'Hand-painted majolica dinner plates', category: 'Collectibles', qty: 8, disposition: 'Distribute',
    channel: 'Katherine', fieldNote: 'Italian plates going to Katherine', reviewed: false },
  { stableId: 's', label: 'inventory', roomIdx: 2, derivedFrom: 'p', seq: 5, filename: 'HVL-0009_Kitchen_INV_5.jpg',
    driveFileId: 'FID_P', driveFileUrl: 'https://drive.google.com/file/d/FID_P/view', status: 'uploaded', ts: 1000, itemNo: 81,
    objectName: 'Hand-painted majolica salad plates', category: 'Collectibles', qty: 6 },
  // The close-up taken in the house with the Close-up shutter, filed under the photograph.
  { stableId: 'dp', label: 'detail', groupId: 'p', roomIdx: 2, driveFileId: 'FID_DP', status: 'uploaded', ts: 1001 },
];

// `_captureShot` and the handler, real, with every async step synchronous: the FileReader answers at once, the
// compress hands the bytes back, the upload lands (or not, per `upload`).
function rig(over, opt) {
  opt = opt || {};
  const uploads = [], alerts = [], renders = [], repaints = [];
  const ctx = sandbox({
    fns: ['invCloseUpRefusal', 'invAddCloseUp', '_invPhotoSource', '_invHasPhoto', '_getPhotoRef', '_setPhotoRef',
          '_captureShot', 'photoSubfolder', 'fieldDispToInv', '_cleanName', '_photoUid', '_slotRefs', '_invTouch',
          '_invDetailRefs', '_jobInvRefs', 'collectionLineUnshot'],
    vars: ['_photoUidSeq', 'FIELD_DISPOSITIONS', 'FIELD_DISP_DEFAULT', 'PHOTO_CAPTURE_LABELS', 'AS_FOUND_SUBFOLDER',
           'PHOTO_SUBFOLDER', '_localShotThumbs', 'INV_DEFAULT_CATEGORY', 'DETAIL_PHOTO_MAX_W', 'DETAIL_PHOTO_QUALITY'],
    stubs: Object.assign({
      jobs: [Object.assign({}, JOB)], _photoRefs: { 1: PLATES() },
      estimateStore: { 1: { estimate: EST, approved: true } },
      _photoCaptureJob: (jid) => (jid === 1 ? Object.assign({}, JOB) : null),
      _photoStamp: () => '2026-10-24_101500',
      _photoRetryData: {}, _savePendingPhotoData() {}, savePhotoRefs() {},
      _doPhotoUpload: (jobId, dataUrl, filename, stableId, sub, onDone) => {
        uploads.push({ filename, stableId, sub });
        if (opt.upload !== 'pending' && onDone) onDone();
      },
      _invCacheLocalThumb() {}, _scheduleInventorySync() {},
      compressImage: (d, w, q, cb) => cb(d),
      FileReader: function () { this.readAsDataURL = (f) => this.onload({ target: { result: 'data:image/jpeg;base64,' + f.bytes } }); },
      alert: (m) => alerts.push(String(m)),
      renderInventoryTab: () => renders.push(1),
      _invCloseUpsRepaint: (j, sid) => { repaints.push(sid); return true; },
    }, over || {}),
  });
  return { ctx, uploads, alerts, renders, repaints, refs: () => ctx._photoRefs[1] };
}
const PICK = (type, bytes) => ({ value: 'C:\\fakepath\\IMG_0412.HEIC', files: [{ type: type == null ? 'image/jpeg' : type, bytes: bytes || 'UNDERSIDE' }] });

module.exports = function ({ group, ok, eq, has, lacks }) {

  group('A · who is offered it: a line with a photograph, never a typed, removed or unphotographed line (one rule)');
  {
    const { ctx } = rig();
    const R = (r) => ctx.invCloseUpRefusal(r);
    eq(R(ctx._getPhotoRef(1, 'p')), '', 'the dinner plates: a photographed line');
    eq(R(ctx._getPhotoRef(1, 's')), '', 'the salad plates, split off that photograph: offered too');
    has(R({ stableId: 'm', label: 'inventory', manual: true, objectName: 'Cash in the desk' }), 'has no photograph',
        'a typed line has nothing to be a close-up of');
    has(R({ stableId: 'c', label: 'inventory', objectName: 'Coin collection', sourceCollId: 4 }), 'Photograph the item in its room first',
        'a walkthrough collection still owed its photograph: the item photograph first');
    has(R(Object.assign({}, ctx._getPhotoRef(1, 'p'), { deletedAt: 9 })), 'has been removed', 'a removed line');
    has(R(ctx._getPhotoRef(1, 'dp')), 'not on this job', 'a close-up is not a line');
    has(R(null), 'not on this job', 'nor is nothing');
  }

  group('B · ⚠⚠ it files a close-up of THAT line: keyed on the line, no new line, nothing on the line touched');
  {
    const r = rig();
    const before = JSON.stringify(r.ctx._getPhotoRef(1, 'p'));
    const lines0 = r.ctx._jobInvRefs(1).map((x) => x.stableId);
    const input = PICK();
    ok(r.ctx.invAddCloseUp(1, 'p', input) === true, 'a photograph chosen for the dinner plates is taken');
    const d = r.refs().filter((x) => x.label === 'detail' && x.stableId !== 'dp')[0] || {};
    eq([d.label, d.groupId, d.roomIdx], ['detail', 'p', 2], 'a close-up, of the dinner plates, in their room');
    has(d.filename, '_DETAIL_', 'named as a close-up in Drive');
    eq(r.uploads.map((u) => u.sub), ['Estate Inventory'], 'filed beside the item photographs');
    eq(r.ctx._jobInvRefs(1).map((x) => x.stableId), lines0, '⚠⚠ no line added: the list is the same two lines');
    eq(JSON.stringify(r.ctx._getPhotoRef(1, 'p')), before, '⚠ and the line itself untouched (name, Katherine, the note)');
    eq(r.ctx._invDetailRefs(1, 'p').map((x) => x.stableId), ['dp', d.stableId], 'the record finds it beside the house close-up, in order');
    eq(input.value, '', 'the chooser is cleared, so the same photograph can be chosen again');
    eq(r.renders.length, 1, 'the desk is drawn once, as the press lands (the row counts its close-ups)');
    ok(r.repaints.length >= 1 && r.repaints.every((x) => x === 'p'), 'and the upload\'s answers repaint the record\'s close-ups alone');
    eq(r.alerts, [], 'nothing refused');
  }

  group('C · ⚠ on a line split off a photograph it is that line\'s, never the photograph\'s');
  {
    const r = rig();
    r.ctx.invAddCloseUp(1, 's', PICK());
    const d = r.refs().filter((x) => x.label === 'detail' && x.stableId !== 'dp')[0] || {};
    eq(d.groupId, 's', 'keyed on the salad plates themselves');
    eq(r.ctx._invDetailRefs(1, 's').map((x) => x.stableId), [d.stableId], 'shown on the salad plates\' record');
    eq(r.ctx._invDetailRefs(1, 'p').map((x) => x.stableId), ['dp'], 'and not on the dinner plates\'');
  }

  group('D · refused by name, nothing written: not a photograph, or the line gone while it was being chosen');
  {
    const r = rig();
    const n0 = r.refs().length;
    ok(r.ctx.invAddCloseUp(1, 'p', PICK('application/pdf')) === false, 'a PDF is not taken');
    has(r.alerts[0], 'not a photograph', 'and says why');
    ok(r.ctx.invAddCloseUp(1, 'p', { value: '', files: [] }) === false, 'a chooser closed with nothing picked does nothing');
    eq(r.alerts.length, 1, 'and says nothing');
    const r2 = rig({ FileReader: function () {
      this.readAsDataURL = () => { r2.ctx._getPhotoRef(1, 'p').deletedAt = 5; this.onload({ target: { result: 'data:image/jpeg;base64,X' } }); };
    } });
    r2.ctx.invAddCloseUp(1, 'p', PICK());
    has(r2.alerts[0] || '', 'has been removed', 'a line removed while the photo was read is refused when the bytes come in');
    eq(r.refs().length + r2.refs().length, n0 * 2, 'nothing written either time');
    eq(r.uploads.length + r2.uploads.length, 0, 'and nothing sent to Drive');
    const r3 = rig();
    r3.ctx.invAddCloseUp(1, 'm', PICK());
    has(r3.alerts[0] || '', 'not on this job', 'a line this job does not hold');
  }

  group('E · the record: + Close-up beside + Another item in this photo, wired to the handler; never on a typed line');
  {
    const ctx = sandbox({
      fns: ['_renderInvPanel', 'invCloseUpRefusal', '_invHasPhoto', '_invCloseUpsHtml', '_invCloseUpTileHtml', '_invPhotoOpenHtml', '_invDetailRefs',
            '_invPhotoSiblings', '_invPhotoSource', '_invDerivedRefs', '_getPhotoRef', '_agRecordNoticesHtml', 'agentNoticeQuiet', 'invLineReviewed',
            '_invPanelAppraisalHtml', '_invHasAppraisal', 'invAppraisalInProgress', 'invAppraised', '_invLinkedAppraiser', 'invLineAppraiser', 'invAppraisalSourceText', 'agentValueUnreviewed', '_avHasFigure', 'agentNoticesOn'],
      vars: ['AGENT_NOTICE_KINDS'],
      stubs: {
        _photoRefs: { 1: PLATES().concat([
          { stableId: 'dx', label: 'detail', groupId: 'p', status: 'failed', ts: 1002 },
          { stableId: 'dy', label: 'detail', groupId: 'p', status: 'uploading', ts: 1003 }]) },
        _invThumbHTML: (j, r, px) => '<div data-thumb-id="' + (r.driveFileId || '') + '" style="w:' + px + '"></div>',
        _invPanelCols: () => [], INV_PANEL_SECTIONS: [], custodyEvents: () => [], _invNamed: (r) => '#' + r.itemNo,
        _invFirearmPanelHtml: () => '', _invPanelCautionHtml: () => '', _invPanelLeftoverHtml: () => '', _collPanelHtml: () => '',
        _avPanelHtml: () => '', mustFindAllFound: () => false,
      },
    });
    const job = { id: 1 };
    const panel = ctx._renderInvPanel(job, ctx._getPhotoRef(1, 'p'));
    has(panel, '&#10133; Close-up</label>', 'the record offers + Close-up');
    has(panel, 'onchange="invAddCloseUp(1,\'p\',this)"', 'its chooser runs the handler for this line');
    has(panel, '<input type="file" accept="image/*"', 'a photograph: the iPad offers its camera or the library');
    lacks(panel, 'capture="environment"', 'not the camera alone, so a photograph already taken can be chosen');
    ok(panel.indexOf('Another item in this photo') < panel.indexOf('Close-up</label>'), 'beside + Another item in this photo');
    has(panel, '<div id="inv-cu-p">', 'the close-ups have a host of their own');
    has(panel, 'Detail shots \u00b7 3', 'counting the house close-up and the two added');
    has(panel, 'data-thumb-id="FID_DP" style="w:120"', 'each at 120 px');
    has(panel, 'onclick="invRetryCloseUp(1,\'dx\')"', 'one not saved offers Retry');
    has(panel, 'Not saved', 'and says so');
    has(panel, 'Uploading&hellip;', 'one on its way says so');
    const split = ctx._renderInvPanel(job, ctx._getPhotoRef(1, 's'));
    has(split, 'onchange="invAddCloseUp(1,\'s\',this)"', 'a split line is offered it too, for itself');
    const typed = ctx._renderInvPanel(job, { stableId: 'm', label: 'inventory', manual: true, objectName: 'Cash', itemNo: 90 });
    lacks(typed, 'Close-up</label>', 'never on a typed line');
    eq(ctx._invCloseUpsHtml(1, ctx._getPhotoRef(1, 's')), '<div id="inv-cu-s"></div>', 'a line with none draws an empty host, so the first close-up has somewhere to land');
  }

  group('F · Agent Two reads it with the line: a split line\'s own first, then its photograph\'s, four at most');
  {
    const ctx = sandbox({
      fns: ['invLineCloseUps', '_agDetailRefs', '_invFileId', '_getPhotoRef'],
      vars: ['AGENT_MAX_DETAILS'],
      stubs: { _photoRefs: { 1: PLATES().concat([
        { stableId: 'ds', label: 'detail', groupId: 's', driveFileId: 'FID_DS', status: 'uploaded', ts: 2000 },
        { stableId: 'dz', label: 'detail', groupId: 's', status: 'uploading', ts: 2001 },
        { stableId: 'dg', label: 'detail', groupId: 's', driveFileId: 'FID_DG', deletedAt: 3, ts: 2002 }]) } },
    });
    const ids = (r) => ctx.invLineCloseUps(1, ctx._getPhotoRef(1, r)).map((d) => d.stableId);
    eq(ids('s'), ['ds', 'dp'], 'the salad plates: their own close-up, then the photograph\'s; never one still uploading or removed');
    eq(ids('p'), ['dp'], 'the dinner plates: the photograph\'s, as before');
    const many = sandbox({ fns: ['invLineCloseUps', '_agDetailRefs', '_invFileId', '_getPhotoRef'], vars: ['AGENT_MAX_DETAILS'],
      stubs: { _photoRefs: { 1: PLATES().concat([1, 2, 3, 4, 5].map((n) => ({ stableId: 'd' + n, label: 'detail', groupId: 's', driveFileId: 'F' + n, ts: n }))) } } });
    eq(many.invLineCloseUps(1, many._getPhotoRef(1, 's')).length, many.AGENT_MAX_DETAILS, 'capped as Agent One\'s are');
    has(liveLines(fn('_avItemPayload')), 'invLineCloseUps(jobId, ref)', 'and it is what Agent Two\'s payload sends');
    // Driven: the payload Agent Two is sent for the salad plates, researched, carries their own close-up first.
    const pay = sandbox({ fns: ['_avItemPayload', '_invCondIsAgents', 'agentValueGradesCondition', 'invLineCloseUps', '_agDetailRefs', '_invFileId', '_getPhotoRef', '_avNameIsAgents',
      '_avPhotoContext', 'agentValueLooks', '_invPhotoSource', '_invRoomName', 'agentListedOff', '_invHasPhoto'], vars: ['AGENT_MAX_DETAILS', 'AGENT_VALUE_HEDGE_RE', 'AGENT_LISTED_MAX'],
      stubs: { agentValueMode: () => 'comps', _photoRefs: ctx._photoRefs } });
    const sent = pay._avItemPayload(1, pay._getPhotoRef(1, 's'));
    eq(sent && sent.details, [{ fileId: 'FID_DS' }, { fileId: 'FID_DP' }], '⚠ Agent Two is sent the salad plates\' own close-up, then the photograph\'s');
  }

  group('G · ⚠ the room\'s bin takes a split line\'s own close-up with the photograph; Restore gives it back with the line');
  {
    const ctx = sandbox({
      fns: ['discardShot', '_getPhotoRef', '_setPhotoRef', '_invDerivedRefs', '_invDetailRefs', '_invFileId', '_shotDesc',
            '_trashShotFiles', '_invNamed', '_invItemNo', 'invDetailsRemovedWith'],
      vars: ['_localShotThumbs'],
      stubs: {
        jobs: [{ id: 1 }],
        _photoRefs: { 1: PLATES().concat([{ stableId: 'ds', label: 'detail', groupId: 's', driveFileId: 'FID_DS', status: 'uploaded', ts: 2000 }]) },
        _photoRetryData: {}, _savePendingPhotoData() {}, savePhotoRefs() {},
        _invTouch(r) { r.updatedAt = 1; return r; },
        _invThumbCache: () => ({}), _invSaveThumbCache() {}, _scheduleInventorySync() {},
        _updatePhotoStatusEl() {}, _fieldCam: { open: false }, renderInventoryTab() {},
        SHEETS_SYNC_URL: 'https://script.example/exec', driveTrashFile: (id, cb) => cb(true), showSyncBadge() {},
        confirm: () => true, alert() {},
      },
    });
    ok(ctx.discardShot(1, 'p'), 'the plates\' photograph is binned');
    ok(!!ctx._getPhotoRef(1, 'ds').deletedAt, '⚠ the salad plates\' own close-up goes with it, not left behind on a removed line');
    eq(ctx._getPhotoRef(1, 'ds').deletedWith, 's', 'taken with the salad plates');
    eq(ctx._getPhotoRef(1, 'dp').deletedWith, 'p', 'the house close-up with the dinner plates, as before');
    eq(ctx.invDetailsRemovedWith(1, ctx._getPhotoRef(1, 's')).map((d) => d.stableId), ['ds'], 'so restoring the salad plates gives theirs back');
    eq(ctx.invDetailsRemovedWith(1, ctx._getPhotoRef(1, 'p')).map((d) => d.stableId), ['dp'], 'and the dinner plates theirs');
  }

  group('H · Retry from the record repaints it when the upload answers');
  {
    const repaints = [];
    let done = null;
    const ctx = sandbox({
      fns: ['invRetryCloseUp', 'retryPhotoUpload', '_getPhotoRef', '_setPhotoRef', 'photoSubfolder'],
      vars: ['AS_FOUND_SUBFOLDER', 'PHOTO_SUBFOLDER'],
      stubs: {
        _photoRefs: { 1: PLATES().concat([{ stableId: 'dx', label: 'detail', groupId: 's', roomIdx: 2, filename: 'X_DETAIL_2.jpg', status: 'failed', ts: 2000 }]) },
        _photoRetryData: { dx: 'data:image/jpeg;base64,X' }, savePhotoRefs() {}, alert() {},
        _updatePhotoStatusEl() {}, _invCacheLocalThumb() {}, _scheduleInventorySync() {},
        _doPhotoUpload: (j, d, f, sid, sub, cb) => { done = cb; },
        _invCloseUpsRepaint: (j, sid) => repaints.push(sid),
      },
    });
    ok(ctx.invRetryCloseUp(1, 'dx'), 'Retry goes');
    eq(ctx._getPhotoRef(1, 'dx').status, 'uploading', 'the close-up is on its way again');
    eq(repaints, ['s'], 'and the record says so at once');
    if (done) done();
    eq(repaints, ['s', 's'], 'and again when the upload answers');
    ok(!ctx.invRetryCloseUp(1, 's'), 'a line is not a close-up to retry');
  }

  group('I · the pages say it, each held to the control: the photography guide, the desk guide, the manual and the playbook');
  {
    const label = '&#10133; Close-up</label>';
    has(liveLines(fn('_renderInvPanel')), label, 'the record\'s control reads + Close-up');
    const photo = text(read('photography-guide.html'));
    has(photo, 'One missed can still be added on the computer: open the item on Job Admin & Inv and press + Close-up', 'Photographing a House says a missed close-up can be added at the computer');
    lacks(photo, 'cannot be added later', '⚠ and no longer says it cannot');
    has(text(read('evening-desk-guide.html')), '➕ Another item in this photo (a blank row for something else in the same photo; it never opens the camera), ➕ Close-up, Remove line.', 'The Evening Desk lists it among the record\'s buttons');
    has(text(read('manual.html')), 'A close-up after the fact (2026-10-24).', 'the manual has the note');
    has(read('MANUAL.md'), '**A close-up after the fact (2026-10-24).**', 'and its markdown copy');
    has(text(read('concierge-guide.html')), 'A close-up missed in the house (new 2026-10-24): in that ▾, press ➕ Close-up', 'the playbook says how');
    has(read('CONCIERGE_GUIDE.md'), '**A close-up missed in the house** (new 2026-10-24): in that ▾, press **➕ Close-up**', 'and its markdown copy');
    // What the pages claim, held to the code: the Look at this is quieted by the review, never by a close-up.
    // 2026-10-26: on the review of every line off its photograph (the note may be about any of them), still never on a close-up.
    has(liveLines(fn('agentNoticeQuiet')), "return sib.length ? sib.every(invLineReviewed) : invLineReviewed(ref);", 'a Look at this goes quiet on review, which the pages say'); 
    lacks(liveLines(fn('invAddCloseUp')), 'reviewed', 'and adding a close-up reviews nothing');
    ok(source().indexOf('function invAddCloseUp(') > 0, 'the handler is in the app');
  }
};
