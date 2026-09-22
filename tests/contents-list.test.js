'use strict';
// ⚠⚠ THE CONTENTS LIST — the document three client-facing surfaces promised and nothing
// produced. The signed estate agreement says it twice (`_agrProbateCompliance`'s capture arm
// and `_agrScopeServices`' capture arm) and the client estimate's records list a third time.
// Every inventory printer that came close carried a value column, which is the one thing the
// capture tier's own contract says is counsel's and not ours.
const { sandbox, source, domStub } = require('./harness.js');

const FNS = ['matterDef', 'matterTypeOf', 'invProbateRows', '_invTrackDefault',  'invDocContractBlock',
  'contentsList', 'printContentsList', '_clFlags',
  '_invAssignItemNos', '_jobInvRefs', '_invItemNo', '_invRoomName', '_planRooms',
  '_invFileId', '_invTouch', 'savePhotoRefs', '_warnPhotoStoreFull',
  '_invDocHead', '_invDocName', '_invPrintThumb', '_invProgressStamp', '_invReviewStats',
  '_invThumbFor', '_invThumbCache', '_invThumbKey',
  'invFiduciaryMode', 'isDecedentJob', 'svcFamily',
  'docTierProduces', 'docTierOf', 'docTierDef', 'svcHasDocStep',
  'invNeedsAppraisal', 'invAppraisalThreshold', 'invIsIntrinsic', 'invCatMeta',
  'gateDispute', '_gateYes', '_invJob', 'invIsMAIV', 'invMAIVCategory', 'invMAIVDefaultCat',
  // The Estate Inventory Report, so its twin of this document's defect can be driven — see
  // the last group in this file. Nothing in the suite had ever called it.
  'printEstateInventoryReport', '_invGroupItems', '_invDispLabel', '_invIsExempt',
  '_invIsProbateAsset', '_invTrack', '_invHasAppraisal', '_jobAppraisers', 'invAppraiserFor',
  'resolveValBasis',
];
const VARS = ['MATTER_TYPES',  'INV_CONTRACT_DOCS',
  '_agRun', 'AGENT_NOTICE_KINDS', 
  'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'DECEDENT_SERVICES', 'SVC_ORDER',
  'INV_CAT_GLYPH', 'estimateStore', 'INV_APPRAISAL_THRESHOLD',
  'INV_APPRAISAL_THRESHOLD_DISPUTED', 'INV_CATEGORIES', 'INV_TAXONOMY',
  'MAIV_BY_CATEGORY', 'MAIV_OTHER', 'MAIV_AGGREGATE_THRESHOLD', 'INV_CONDITIONS',
  'INV_GROUP_ORDER', 'INV_DISPOSITIONS', 'INV_ASSET_TRACKS', 'INV_VAL_BASES', 'INV_UNDECIDED',
];

const ESTATE = {
  id: 7, name: 'Butler Estate', hvlId: 'HVL-0007', svc: 'probate', addr: '69 Beach Blvd',
  city: 'Palm Beach', executor: 'Tripp Butler', deathDate: '2026-04-02',
  won: true, status: 'won', docTier: 'contents', matterType: 'probate',
};
const LIVING = { id: 2, name: 'Ellsworth', hvlId: 'HVL-0002', svc: 'downsizing_move',
                 addr: '12 Ocean Way', city: 'Palm Beach', won: true, status: 'won' };

const ROOMS = [
  { idx: 1, name: 'Entry & Living', st: 'in' },
  { idx: 4, name: 'Kitchen', st: 'in' },
  { idx: 9, name: 'Study', st: 'in' },
  { idx: 15, name: 'Garage (2-car)', excluded: true },
];

const IT = (id, over) => Object.assign({
  stableId: id, label: 'inventory', roomIdx: 1, ts: 1, status: 'uploaded',
  objectName: 'Sideboard', category: 'Furniture', condition: 'Good',
  driveFileId: 'f' + id, driveFileUrl: 'https://drive.google.com/file/d/f' + id + '/view',
}, over || {});

function rig(job, refs, rooms) {
  const printed = [];
  const ctx = sandbox({
    fns: FNS, vars: VARS,
    stubs: {
      jobs: [Object.assign({}, job)],
      _photoRefs: { [job.id]: (refs || []).slice() },
      _invThumbs: {},
      esc: (x) => String(x == null ? '' : x)
        .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
      fmtDate2: (d) => String(d || '—'),
      _invMoney: (v) => (isNaN(parseFloat(v)) ? '—' : '$' + Math.round(parseFloat(v))),
      resolveValBasis: () => 'Fair Market Value',
      estateValueDate: (j) => j.deathDate || '',
      _printDocument: (html, title) => { printed.push({ html, title }); return true; },
      alert: (m) => printed.push({ alert: m }),
      document: domStub({}),
    },
  });
  ctx.estimateStore[job.id] = { estimate: { rooms: (rooms || ROOMS).map((r) => Object.assign({}, r)) } };
  return { ctx, printed, last: () => printed[printed.length - 1] || { html: '', title: '' } };
}
// The rendered page as a reader sees it: tags out, entities back to characters.
const text = (html) => String(html).replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&middot;/g, '·').replace(/&mdash;/g, '—')
  .replace(/&#9888;/g, '⚠').replace(/&rsquo;/g, '’').replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').trim();

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  // The comment blocks on this document quote the retired wordings and name the money
  // helpers deliberately, so every source needle here reads live lines only — the trap this
  // project has recorded a dozen times.
  const live = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const fnLive = (name) => {
    const i = live.indexOf('function ' + name + '(');
    if (i < 0) return '';
    let d = 0, k = live.indexOf('{', i), s = null;
    for (let x = k; x < live.length; x++) {
      const c = live[x];
      if (s) { if (c === '\\') { x++; continue; } if (c === s) s = null; continue; }
      if (c === '"' || c === "'" || c === '`') { s = c; continue; }
      if (c === '{') d++;
      else if (c === '}') { d--; if (!d) return live.slice(i, x + 1); }
    }
    return live.slice(i);
  };

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE PROMISE — three client-facing surfaces, one document');
  {
    // These are the sentences this whole step exists to make true. If any of them is
    // reworded the document has to follow it, so they are pinned against the live source.
    has(src, 'photographed, room-by-room list of the property contents (description, location and condition)',
        'the signed estate agreement’s §733.604 compliance clause promises it');
    has(src, 'room-by-room photography and listing of property contents (description, location and condition, without valuation)',
        'and its Scope of Services paragraph promises it again');
    has(src, 'A photographed, room-by-room list of the contents of consequence — description, location and condition, for counsel to value',
        'and the client estimate’s records list a third time');
    // The tier catalogue names the same deliverable, which is what step 3 built.
    has(src, 'A room-by-room list with a photograph, a description, a location and a condition for every item of consequence.',
        'DOC_TIERS.contents.we is the same promise on the desk card');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ ROOM-FIRST, IN WALKTHROUGH ORDER — the whole reason it is not the Estate Inventory Report');
  {
    const { ctx } = rig(ESTATE, [
      IT('a', { roomIdx: 4, objectName: 'Dining suite' }),
      IT('b', { roomIdx: 1, objectName: 'Sargent portrait' }),
      IT('c', { roomIdx: 1, objectName: 'Console', disposition: 'Auction' }),
      IT('d', { roomIdx: 4, objectName: 'Tabriz rug', disposition: 'Keep' }),
    ]);
    const rec = ctx.contentsList(7);
    eq(rec.groups.map((g) => g.name).join(' > '),
       'Entry & Living > Kitchen > Study',
       'grouped by ROOM in walkthrough order, never by disposition');
    eq(rec.groups[0].items.length, 2, 'both Entry & Living items together …');
    eq(rec.groups[1].items.length, 2, '… and both Kitchen items together');
    // The converse, and it is the point: two items in one room with DIFFERENT dispositions
    // stay in one group. _invGroupItems would have split them across two headings.
    eq(rec.groups[0].items.map((r) => r.disposition || '').sort().join('|'), '|Auction',
       '⚠ a room’s contents are not split by what happens to them');
    lacks(fnLive('contentsList'), '_invGroupItems',
          '⚠ and the disposition-first grouper is never called');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ AN EMPTY ROOM IN SCOPE IS ON THE LIST — the half that answers “is this complete”');
  {
    const { ctx } = rig(ESTATE, [IT('a', { roomIdx: 1 })]);
    const rec = ctx.contentsList(7);
    eq(rec.groups.length, 3, 'every room in scope is a group, listed or not');
    eq(rec.empty.map((g) => g.name).join(', '), 'Kitchen, Study',
       'the two rooms with nothing listed are named');
    // Built from the ROOM LIST, never from the items — an empty room cannot appear if the
    // headings are derived from what was photographed.
    const b = fnLive('contentsList');
    has(b, 'rs.rooms.map', 'the groups are built from _planRooms …');
    ok(b.indexOf('rs.rooms.map') < b.indexOf('Object.keys(byRoom)'),
       '… before anything is read off the items');
  }

  group('an excluded room is an ANSWER, not a gap');
  {
    const { ctx, last } = rig(ESTATE, [IT('a', { roomIdx: 1 })]);
    const rec = ctx.contentsList(7);
    eq(rec.excluded.map((r) => r.name).join(','), 'Garage (2-car)', 'reported separately …');
    eq(rec.empty.filter((g) => g.name.indexOf('Garage') === 0).length, 0,
       '… and never counted as a room somebody missed');
    eq(rec.groups.filter((g) => g.name.indexOf('Garage') === 0).length, 0,
       'nor given a heading with an empty table under it');
    ctx.printContentsList(7);
    const t = text(last().html);
    has(t, 'Not in scope on this engagement: Garage (2-car)',
        '⚠ and the page SAYS so — silently absent reads as a room somebody missed');
    has(t, 'were not worked and their contents are not listed below',
        'in terms that cannot be read as an omission');
    lacks(t, 'Garage (2-car) · nothing listed', 'it is never given a room heading of its own');
  }

  group('an item whose room has left the estimate is KEPT, and said to be off-plan');
  {
    const { ctx, last } = rig(ESTATE, [IT('a', { roomIdx: 1 }), IT('z', { roomIdx: 99, objectName: 'Orphan chair' })]);
    const rec = ctx.contentsList(7);
    const off = rec.groups.filter((g) => g.offPlan);
    eq(off.length, 1, 'it gets its own group rather than vanishing');
    eq(off[0].items[0].objectName, 'Orphan chair', 'carrying the item');
    ctx.printContentsList(7);
    has(text(last().html), 'not on the current room list', 'and the page says why it is there');
  }

  group('a manual line item has no room and sorts last');
  {
    const { ctx } = rig(ESTATE, [IT('m', { roomIdx: null, manual: true, objectName: '1965 Mustang' }), IT('a', { roomIdx: 9 })]);
    const rec = ctx.contentsList(7);
    eq(rec.groups[rec.groups.length - 1].name, 'Unassigned / estate-wide',
       'under the wording the room picker itself uses, after every real room');
    eq(rec.groups[rec.groups.length - 1].items[0].objectName, '1965 Mustang', 'carrying the item');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ NO VALUE REACHES THIS PAGE — the rule the contract turns on');
  {
    // Every row carries money. None of it may print: the agreement this document is issued
    // under says valuation is the estate attorney’s.
    const { ctx, last } = rig(ESTATE, [
      IT('a', { roomIdx: 1, fmv: 48000, gross: 51000, fees: 5100 }),
      IT('b', { roomIdx: 4, fmv: 1250, valSource: 'Appraisal', valNote: 'Sothebys comp, lot 41' }),
    ]);
    ctx.printContentsList(7);
    const html = last().html;
    ok(!/\$/.test(html), '⚠ not one dollar sign anywhere on the rendered page');
    ok(!/48,?000|51,?000|1,?250/.test(html), 'no recorded figure prints, however it is formatted');
    ok(!/FMV|fair market|Estimated value|Net received|Gross/i.test(text(html)),
       'and no value column, in any of the wordings the other documents use');
    lacks(text(html), 'Sothebys comp', 'the valuation basis note is not on it either');
    // The converse at source: a later edit cannot reach for the money helper.
    const b = fnLive('printContentsList');
    lacks(b, '_invMoney', '⚠ the printer never calls the money formatter');
    lacks(b, 'r.fmv', 'and never reads fmv');
    lacks(b, 'valSource', 'nor the valuation source');
    lacks(fnLive('contentsList'), 'fmv', 'the derivation does not carry it either');
  }

  group('and it STATES the absence, because this one shifts a responsibility');
  {
    const { ctx, last } = rig(ESTATE, [IT('a')]);
    ctx.printContentsList(7);
    const t = text(last().html);
    has(t, 'no values are stated on this list', 'the header says so on its face');
    has(t, 'responsibility of the Client and the estate attorney',
        'and the footer names who does value it — the agreement’s own words');
    has(t, 'states no opinion of value', 'in terms that cannot be read as an omission');
  }

  group('the header does NOT assert a valuation basis or a date of death');
  {
    const { ctx, last } = rig(ESTATE, [IT('a')]);
    ctx.printContentsList(7);
    const t = text(last().html);
    lacks(t, 'Fair Market Value', '⚠ _invDocHead’s default tail is refused …');
    lacks(t, 'date of death', '… along with the valuation date it carries');
    has(t, 'Butler Estate', 'while the identifying header is unchanged');
    has(t, 'HVL-0007', 'job id and all');
    // The mechanism: the `extra` argument, the same one the Contents Record passes.
    has(fnLive('printContentsList'), '_invDocHead(job,', 'through _invDocHead …');
    has(fnLive('printContentsList'), 'Description, location and condition', '… with an extra of its own');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE PROGRESS STAMP NAMES WHAT THIS DOCUMENT CARRIES');
  {
    const p = sandbox({ fns: ['_invProgressStamp', '_invReviewStats'] });
    const plain = p._invProgressStamp([{ reviewed: true }, {}]);
    const noVal = p._invProgressStamp([{ reviewed: true }, {}], { noValues: true });
    has(plain, 'Values and dispositions on unreviewed lines may still change',
        'the default sentence is untouched — six other documents carry it');
    has(noVal, 'Descriptions and conditions on unreviewed lines may still change',
        'and the no-values caller gets one about what it actually states');
    lacks(noVal, 'Values and dispositions',
          '⚠ it must not promise to revise a value it never stated');
    // Both arms still stamp. The option changes the caveat, never the stamp.
    has(noVal, 'IN PROGRESS', 'the stamp itself is unchanged');
    has(p._invProgressStamp([{ reviewed: true }], { noValues: true }), 'REVIEWED', 'REVIEWED on a complete set');
  }

  group('and the Contents List asks for it');
  {
    const { ctx, last } = rig(ESTATE, [IT('a'), IT('b', { reviewed: true })]);
    ctx.printContentsList(7);
    const t = text(last().html);
    has(t, 'IN PROGRESS — 1 of 2 items reviewed', 'stamped like every other client document');
    has(t, 'Descriptions and conditions on unreviewed lines', 'with the caveat that fits it');
    lacks(t, 'Values and dispositions', '⚠ and not the one that does not');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE GAP BLOCK IS ABOVE THE LIST, and names each gap');
  {
    const { ctx, last } = rig(ESTATE, [
      IT('a', { roomIdx: 1 }),
      IT('b', { roomIdx: 1, objectName: '' }),
      IT('c', { roomIdx: 4, condition: '' }),
      IT('d', { roomIdx: 4, driveFileId: '', driveFileUrl: '' }),
    ]);
    const rec = ctx.contentsList(7);
    eq(rec.unnamed, 1, 'an unnamed item is a gap — counsel cannot value “—”');
    eq(rec.noCondition, 1, 'a blank condition is a gap — it is one of the three promised fields');
    eq(rec.unsaved, 1, 'a photograph that never reached Drive is a gap');
    eq(rec.empty.length, 1, 'and so is a room in scope with nothing in it');
    ctx.printContentsList(7);
    const html = last().html;
    const t = text(html);
    has(t, 'This list is not yet complete.', 'the block says so plainly');
    has(t, '1 room in scope with nothing listed — Study', 'naming the room');
    has(t, '1 photographed item not yet named', 'the unnamed line');
    has(t, '1 item with no condition recorded', 'the condition line');
    has(t, 'has not reached the estate’s Drive folder', 'and the missing photograph');
    // ⚠ POSITION, measured on the rendered page rather than argued. A reader works down this
    // page; a caveat printed under the list has arrived after they took it as complete.
    ok(html.indexOf('This list is not yet complete') < html.indexOf('Entry &amp; Living'),
       '⚠ and it is ABOVE the first room heading');
  }

  group('a complete list raises nothing — the converse, so the block means something');
  {
    const { ctx, last } = rig(ESTATE,
      [IT('a', { roomIdx: 1 }), IT('b', { roomIdx: 4 }), IT('c', { roomIdx: 9 })]);
    const rec = ctx.contentsList(7);
    eq(rec.unnamed + rec.noCondition + rec.unsaved + rec.empty.length, 0, 'no gaps');
    ctx.printContentsList(7);
    lacks(text(last().html), 'This list is not yet complete', 'and no block on the page');
  }

  group('the reconnect advice is scoped to a photograph that EXISTS');
  {
    // A row with no file on Drive is already in the gap block, and "re-open with a
    // connection" cannot fix a photograph that was never uploaded.
    const { ctx, last } = rig(ESTATE, [IT('a', { driveFileId: '', driveFileUrl: '' })]);
    ctx.printContentsList(7);
    const t = text(last().html);
    has(t, 'has not reached the estate’s Drive folder', 'it is reported as a missing photograph');
    lacks(t, 'no photograph available on this device', '⚠ and NOT as a device that needs a connection');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE THREE FLAGS, and the wording is the point');
  {
    const { ctx, last } = rig(ESTATE, [
      IT('a', { roomIdx: 1, flagBequest: true }),
      IT('b', { roomIdx: 1, flagDisputed: true }),
      IT('c', { roomIdx: 4, objectName: 'Sargent portrait', category: 'Art & Décor' }),
      IT('d', { roomIdx: 4, objectName: 'Dining chair' }),
    ]);
    ctx.printContentsList(7);
    const t = text(last().html);
    has(t, 'DESIGNATED TO A NAMED PERSON', 'a specific bequest is flagged for counsel');
    has(t, 'DISPUTED — HELD', 'and a dispute, with what we do about it');
    has(t, 'SPECIALIST SUGGESTED', 'and the item the threshold says warrants one');
    // ⚠⚠ THE WORDING IS NOT THE RELEASE REQUEST'S. `INV_RELEASE_CAUTIONS` renders NOT YET
    // APPRAISED, which is true on a release request and a false accusation here: on a capture
    // engagement obtaining the appraisal was never Havellin's to do.
    lacks(t, 'NOT YET APPRAISED', '⚠ never the release request’s wording …');
    lacks(fnLive('printContentsList'), '_invCautionBadges', '… and the release badges are not reused');
    lacks(fnLive('_clFlags'), '_invCautionBadges', 'nor by the flag builder');
    // The rule is READ, not copied — the estate's own threshold still decides.
    has(fnLive('_clFlags'), 'invNeedsAppraisal', 'the appraisal rule is read from the one definition');
    // An ordinary chair raises nothing at all.
    const plain = ctx._clFlags({ objectName: 'Dining chair', category: 'Furniture' }, ctx.jobs[0], 7);
    eq(plain.length, 0, 'and an ordinary item carries no flag');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ NOTHING IS CARVED OUT — the As-Found Record’s rule, for the same reason');
  {
    const { ctx, last } = rig(ESTATE, [
      IT('a', { roomIdx: 1, objectName: 'Homestead sofa', flagExempt: true }),
      IT('b', { roomIdx: 4, objectName: 'Trust console', assetTrack: 'Trust' }),
    ]);
    ctx.printContentsList(7);
    const t = text(last().html);
    has(t, 'Homestead sofa', 'exempt property is listed in its room …');
    has(t, 'Trust console', '… and so is trust property');
    lacks(t, 'carved out', 'no carve-out schedule');
    lacks(t, 'Non-Probate', 'and no track heading');
    // Which pot an item falls into is the determination this engagement does not make, and
    // _invTrack still defaults an unset item to Probate — so carving would assert a track
    // nobody set, on the page handed to the person whose job it is to decide.
    const b = fnLive('printContentsList') + fnLive('contentsList');
    lacks(b, '_invIsExempt', '⚠ the exempt predicate is never consulted');
    lacks(b, '_invIsProbateAsset', 'nor the probate-asset one');
    lacks(b, '_invTrack', 'nor the asset track');
  }

  group('⚠ a room NOTE never prints — this page goes to counsel');
  {
    const { ctx, last } = rig(ESTATE, [IT('a', { roomIdx: 1 })],
      [{ idx: 1, name: 'Entry & Living', st: 'in', note: 'family very sensitive about the study' }]);
    ctx.printContentsList(7);
    lacks(text(last().html), 'family very sensitive', 'our working observation stays internal');
    lacks(fnLive('contentsList'), 'r.note', 'and the derivation does not carry it');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE ROOM HEADING IS THE LOCATION, and the page says so');
  {
    const { ctx, last } = rig(ESTATE, [IT('a', { roomIdx: 4, objectName: 'Dining suite' })]);
    ctx.printContentsList(7);
    const t = text(last().html);
    has(t, 'Kitchen · 1 item', 'the room is the heading, stated once');
    has(t, 'recorded location', 'and the footer says the room IS the location');
    // No Location column repeating it on every row — the app records no sub-location, so the
    // room is the whole of what can honestly be stated.
    const heads = (last().html.match(/<th[^>]*>([^<]*)<\/th>/g) || []).map((h) => h.replace(/<[^>]+>/g, ''));
    eq(heads.indexOf('Location'), -1, '⚠ and there is no Location column repeating it');
    eq(heads.join('|'), 'Photo|Item #|Description|Qty|Condition|Notes',
       'the six columns are the promise plus the quantity and the flags');
  }

  group('description, location and condition — all three are actually on it');
  {
    const { ctx, last } = rig(ESTATE, [
      IT('a', { roomIdx: 9, objectName: 'Partners desk', category: 'Furniture',
                condition: 'Fair', qty: 1, serial: 'X-4471' }),
    ]);
    ctx.printContentsList(7);
    const t = text(last().html);
    has(t, 'Partners desk', 'the description');
    has(t, 'Furniture', 'with the category under it');
    has(t, 'Serial X-4471', 'and the serial where the object carries one');
    has(t, 'Study', 'the location');
    has(t, 'Fair', 'the condition');
    has(t, 'Photo', 'and a photograph column');
  }

  group('a blank condition says so rather than printing an em dash');
  {
    const { ctx, last } = rig(ESTATE, [IT('a', { condition: '' })]);
    ctx.printContentsList(7);
    has(text(last().html), 'not recorded',
        '⚠ a promised field left blank is named, not left looking like an empty cell');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ ITEM NUMBERS ARE ASSIGNED BEFORE PRINTING, and they are permanent');
  {
    const { ctx, last } = rig(ESTATE, [IT('a', { roomIdx: 1 }), IT('b', { roomIdx: 4 })]);
    ctx.printContentsList(7);
    eq(ctx._photoRefs[7].map((r) => r.itemNo).join(','), '1,2', 'numbers land on the rows …');
    has(fnLive('contentsList'), '_invAssignItemNos', '… through the one assigner');
    // A second printing must not renumber anything — counsel will cite these back.
    ctx._photoRefs[7].unshift(IT('z', { roomIdx: 9, objectName: 'Late arrival' }));
    ctx.printContentsList(7);
    eq(ctx._photoRefs[7].filter((r) => r.stableId === 'a')[0].itemNo, 1, 'a keeps #1');
    eq(ctx._photoRefs[7].filter((r) => r.stableId === 'b')[0].itemNo, 2, 'b keeps #2');
    eq(ctx._photoRefs[7].filter((r) => r.stableId === 'z')[0].itemNo, 3, 'and the new row takes the next');
    has(text(last().html), 'Late arrival', 'which is on the page');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE PRINT PATH AND THE FILENAME — the one path, and not the app’s browser tab');
  {
    const { ctx, last } = rig(ESTATE, [IT('a')]);
    ctx.printContentsList(7);
    has(last().title, 'Havellin Contents List', 'named for what it is …');
    has(last().title, '69 Beach Blvd', '… and for the property');
    has(fnLive('printContentsList'), '_printDocument(html, _invDocName(job',
        'through the one print path, with the one namer');
    // ⚠ NOT `docNames`: that registry carries send and file verbs, and `file` writes into the
    // CLIENT'S OWN Drive folder. These seven printers have no verbs and must not acquire any.
    lacks(fnLive('printContentsList'), 'docNames', 'never the send/file registry');
  }

  group('an empty inventory refuses rather than printing an empty page');
  {
    const { ctx, printed } = rig(ESTATE, []);
    ctx.printContentsList(7);
    eq(printed.filter((p) => p.html).length, 0, 'nothing is printed');
    has(String((printed[0] || {}).alert || ''), 'no contents list to produce',
        'and it says why');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE THREE WHO-VALUES ARMS — it must never tell an estate counsel is valuing a list we valued');
  {
    const cap = rig(ESTATE, [IT('a')]);
    cap.ctx.printContentsList(7);
    has(text(cap.last().html), 'responsibility of the Client and the estate attorney',
        'contents tier: counsel values it');

    const val = rig(Object.assign({}, ESTATE, { docTier: 'values' }), [IT('a')]);
    val.ctx.printContentsList(7);
    const vt = text(val.last().html);
    has(vt, 'Estate Inventory — Asset Schedule', '⚠ values tier: it points at the valued document …');
    lacks(vt, 'responsibility of the Client and the estate attorney',
          '… and does NOT tell counsel to value a list we were paid to value');

    const liv = rig(LIVING, [IT('a')]);
    liv.ctx.printContentsList(2);
    const lt = text(liv.last().html);
    has(lt, 'This list states no values.', 'living client: no values, stated plainly');
    lacks(lt, 'estate attorney', '⚠ and no estate wording on a living owner’s document');
    lacks(lt, 'Personal Representative', 'nor a fiduciary addressed anywhere');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE STRIP OFFERS IT, AND THE TIER DECIDES — driven, not grepped');
  {
    // A build that renders the document perfectly and never puts a button on any screen
    // contains every string a source check would look for. This drives the real workbar.
    const BAR = FNS.concat([
      'agentShotGroups', 'agentNameableRefs', '_agState', '_agStateHtml', '_agNoticesHtml', 'agentNotices',
      '_renderInvWorkbar', '_invProgressBar', 'invWorkFlags', '_invNeedsValue',
      'printEstateInventoryReport', 'printContentsRecord', '_invDispLabel',
      'invReleaseBlocked', 'invIsFirearm', 'invTransportBlocked', 'invFirearmAuthorized',
      'invAwaitingAppraisal', '_invHasAppraisal', '_jobAppraisers', '_invAwaitingApproval',
      'invProbateRows', 'matterDef', 'matterTypeOf', 'maivFilingApplies', '_gate706',
    ]);
    const BVARS = VARS.concat(['INV_WORK_FLAGS', 'INV_DISPOSITIONS', 'INV_GROUP_ORDER',
      'INV_RELEASE_DISPOSITIONS', 'INV_RELEASE_CAUTIONS', 'MATTER_TYPES', 'INV_UNDECIDED',
      '_invFilter', '_invShowRoll', '_invOpen', '_invPick', 'INV_VAL_BASES', 'INVENTORY_COLUMNS']);
    const barRig = (job) => {
      const ctx = sandbox({
        fns: BAR, vars: BVARS,
        stubs: {
          jobs: [Object.assign({}, job)], _photoRefs: { [job.id]: [IT('a')] }, _invThumbs: {},
          esc: (x) => String(x == null ? '' : x),
          fmtDate2: (d) => String(d || '—'),
          _invMoney: (v) => (isNaN(parseFloat(v)) ? '—' : '$' + Math.round(parseFloat(v))),
          resolveValBasis: () => 'Fair Market Value', estateValueDate: (j) => j.deathDate || '',
          _printDocument: () => true, maivAggregate: () => ({ count: 0, total: 0, settled: true, over: false, unvalued: 0 }),
          document: domStub({}),
        },
      });
      ctx.estimateStore[job.id] = { estimate: { rooms: ROOMS.map((r) => Object.assign({}, r)) } };
      return ctx._renderInvWorkbar(Object.assign({}, job), ctx._jobInvRefs(job.id));
    };
    const bar = (j) => barRig(j);

    const contents = bar(ESTATE);
    has(contents, 'printContentsList(7)', '⚠ on a contents-tier estate the button is there …');
    lacks(contents, 'printEstateInventoryReport(7)',
          '… and the valued schedule is NOT the primary — its FMV column would print empty');

    const valued = bar(Object.assign({}, ESTATE, { docTier: 'values' }));
    has(valued, 'printEstateInventoryReport(7)', 'a values-tier estate keeps the asset schedule');
    lacks(valued, 'printContentsList(7)', 'and is not offered the unvalued list beside it');

    const appr = bar(Object.assign({}, ESTATE, { docTier: 'appraisals' }));
    has(appr, 'printEstateInventoryReport(7)', 'so does the top tier');
    lacks(appr, 'printContentsList(7)', 'same');

    const none = bar(Object.assign({}, ESTATE, { docTier: 'none' }));
    lacks(none, 'printContentsList(7)',
          '⚠ a None-tier estate is not offered the Contents List — there is no list of ours');
    // ⚠ RESTATED FOR STEP 6, NOT DELETED. This asserted the Estate Inventory Report was the
    // primary at `none`, which was true until the contract gate shipped — and is the defect it
    // closes: at `none` the agreement says counsel does the whole inventory, so handing over a
    // page headed *Estate Inventory — Asset Schedule* claims work we contracted not to do.
    lacks(none, 'printEstateInventoryReport(7)',
          '⚠⚠ nor the valued schedule — counsel does the whole inventory on that engagement');
    has(none, 'printApprovalRequest(7)',
        'the primary is the written release approval, which IS what we issue there');

    const legacy = bar(Object.assign({}, ESTATE, { docTier: '', docScope: '' }));
    has(legacy, 'printEstateInventoryReport(7)',
        '⚠ and a job recorded before the tier existed behaves exactly as it did — values reads as ours');
    lacks(legacy, 'printContentsList(7)', 'so nothing changes under it');

    const living = bar(LIVING);
    has(living, 'printContentsRecord(2)', 'a living job keeps the Contents Record as its primary');
    lacks(living, 'printContentsList(2)', 'and is never offered the estate list');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ IT IS NOT THE CONTENTS RECORD — two documents, two subjects');
  {
    const { ctx, last } = rig(ESTATE, [IT('a', { disposition: 'Auction', gross: 9000, fees: 900 })]);
    ctx.printContentsList(7);
    const t = text(last().html);
    has(t, 'Contents List — Room by Room', 'the title names the grouping …');
    lacks(t, 'Contents Record', '… and cannot be read as the other one');
    lacks(t, 'Where it went', 'no disposition column …');
    lacks(t, 'who took it', '… and no recipient');
    // The Contents Record is untouched and still carries what it always did.
    has(src, "_invDocName(job, 'Contents Record')", 'the Contents Record still names itself');
    has(fnLive('printContentsRecord'), 'Net received', 'and still states what came in');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE SAME DEFECT ONE DOCUMENT OVER — the Estate Inventory Report told counsel to reconnect for a photograph that does not exist');
  {
    // ⚠ NOTHING IN THIS SUITE HAD EVER DRIVEN THIS PRINTER. It appears in four files and in
    // every one of them only as a STRING, inside a strip assertion — which is exactly how a
    // false sentence on the client / attorney deliverable survived. It is driven here because
    // the defect is this document's twin and the fix is the same shape.
    // ⚠ THE FIXTURE IS A `values` ESTATE, and it has to be: step 6 refuses this document on a
    // `contents` engagement, because the agreement puts the values with counsel. Driving it at
    // `contents` would measure the refusal rather than the report.
    const { ctx, last } = rig(Object.assign({}, ESTATE, { docTier: 'values' }), [
      IT('a', { roomIdx: 1, objectName: 'Sargent portrait', fmv: 48000, valSource: 'Appraisal' }),
      IT('b', { roomIdx: 4, objectName: 'Lost lamp', fmv: 200, valSource: 'Comparable',
                driveFileId: '', driveFileUrl: '' }),
    ]);
    ctx.printEstateInventoryReport(7);
    const t = text(last().html);
    // The row whose file never reached Drive is named as what it is: a permanent gap.
    has(t, '1 item was photographed and the image did not reach the estate’s Drive folder',
        'the lost photograph is reported …');
    has(t, 'not held anywhere', '… and said to be unrecoverable, not stale');
    // And the reconnect advice no longer claims it. THE COUNT is what moves — the old code
    // folded both rows into one number, so it said "2 items have"; both sentences are
    // legitimately present now, which is why a `lacks` on the wording would prove nothing.
    lacks(t, '2 items have no photograph available on this device',
          '⚠ the lost row is NOT counted among the ones a connection would fix');
    // The converse: a row that HAS a file and no cached thumbnail still gets the old advice,
    // because that is the one case reconnecting fixes.
    has(t, '1 item has no photograph available on this device',
        'the genuine stale-device case still says so, and only it');
    has(t, 're-open this tab with a connection', 'with the advice that works for it');
    // The two counts are separate reads, and the distinguishing one is the file id.
    has(fnLive('printEstateInventoryReport'), '_invFileId',
        '⚠ the function reads the file id at all — it never did, which is why it could not tell them apart');
    // The document is otherwise untouched: it is still the VALUED schedule.
    has(t, 'Estate Inventory', 'still the asset schedule …');
    has(t, 'FMV (total)', '… still carrying the value column …');
    has(t, 'Location', '… and still the Location field the deliverables page promises');
  }
};
