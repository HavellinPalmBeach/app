'use strict';
// ⚠⚠ THE CONTRACT DECIDES WHICH DOCUMENTS ARE OURS TO ISSUE. Measured before this shipped:
// nine of eleven inventory printers read neither the tier nor the matter type, and the strip
// offered every estate document on every decedent job whatever the agreement said — so at tier
// `none`, where counsel does the whole inventory, the PRIMARY button handed over a page headed
// *Estate Inventory — Asset Schedule*.
const { sandbox, source, domStub } = require('./harness.js');

const FNS = ['_invScheduleSection', '_invTrackDefault', 
  'invDocContractBlock', 'docTierProduces', 'docTierOf', 'docTierDef', 'svcHasDocStep',
  'printEstateInventoryReport', 'printCourtInventory', 'printContentsList', 'contentsList',
  'printContentsRecord', 'printApprovalRequest', '_lotSplitWorklistBlock', 'invLotSplitState', 'invLotArticleValue', 'invLotSplitSentence', 'invLotsToSplit', 'invLotsUntestable', 'printAppraisalWorklist', 'printDispositionLedger',
  '_clFlags', '_renderInvWorkbar', '_invProgressBar', 'invWorkFlags', '_invNeedsValue',
  '_invAssignItemNos', '_jobInvRefs', '_invItemNo', '_invRoomName', '_planRooms', '_invFileId',
  '_invTouch', 'savePhotoRefs', '_warnPhotoStoreFull', '_invDocHead', '_invDocName',
  '_invPrintThumb', '_invProgressStamp', '_invReviewStats', '_invThumbFor', '_invThumbCache',
  '_invThumbKey', 'invFiduciaryMode', 'isDecedentJob', 'svcFamily', '_invGroupItems',
  '_invDispLabel', '_invIsExempt', '_invIsProbateAsset', '_invTrack', '_invHasAppraisal',
  '_jobAppraisers', 'invAppraiserFor', 'resolveValBasis', 'estateValueDate', 'invNeedsAppraisal',
  'invAppraisalThreshold', 'invIsIntrinsic', 'invCatMeta', 'gateDispute', '_gateYes', '_gate706',
  '_invJob', 'invIsMAIV', 'invMAIVCategory', 'invMAIVDefaultCat', '_invGuardrailItems',
  '_invHasValue', '_invOnProbateSchedule', '_invExcludedTracks', 'isFormalDoc', 'resolveDocLevel',
  'docLevelFloor', 'docLevelFloorReason', 'estimateDocScope', 'docScopeDef', '_invMoney',
  'invReleaseBlocked', 'invIsFirearm', 'invTransportBlocked', 'invFirearmAuthorized',
  'invAwaitingAppraisal', '_invAwaitingApproval', 'invProbateRows', 'matterDef', 'matterTypeOf',
  'maivFilingApplies', 'invReleaseCautions', '_invCautionBadges', '_invCautionNotices',
  '_invNamed', '_invDateTime',
];
const VARS = [
  'INV_CONTRACT_DOCS', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'DECEDENT_SERVICES',
  'SVC_ORDER', 'SVC_LABELS', 'INV_CAT_GLYPH', 'estimateStore', 'INV_APPRAISAL_THRESHOLD',
  'INV_APPRAISAL_THRESHOLD_DISPUTED', 'INV_CATEGORIES', 'INV_TAXONOMY', 'MAIV_BY_CATEGORY',
  'MAIV_OTHER', 'MAIV_AGGREGATE_THRESHOLD', 'INV_CONDITIONS', 'INV_GROUP_ORDER',
  'INV_DISPOSITIONS', 'INV_ASSET_TRACKS', 'INV_VAL_BASES', 'INV_UNDECIDED', 'INV_WORK_FLAGS',
  'INV_RELEASE_DISPOSITIONS', 'INV_RELEASE_CAUTIONS', 'MATTER_TYPES', '_invFilter', '_invShowRoll',
  '_invOpen', '_invPick', 'INVENTORY_COLUMNS', 'INV_PANEL_SECTIONS', 'DOC_SCOPES',
  'INV_VAL_SOURCES', 'EXEMPT_CAP_732_402',
];

const ESTATE = (over) => Object.assign({
  id: 7, name: 'Butler Estate', hvlId: 'HVL-0007', svc: 'probate', addr: '69 Beach Blvd',
  city: 'Palm Beach', executor: 'Tripp Butler', deathDate: '2026-04-02', won: true,
  status: 'won', matterType: 'probate',
}, over || {});
const LIVING = { id: 2, name: 'Ellsworth', hvlId: 'HVL-0002', svc: 'downsizing_move',
                 addr: '12 Ocean Way', won: true, status: 'won' };
const IT = (id, over) => Object.assign({
  stableId: id, label: 'inventory', roomIdx: 1, ts: 1, status: 'uploaded',
  objectName: 'Sideboard', category: 'Furniture', condition: 'Good', fmv: '4000',
  driveFileId: 'f' + id, driveFileUrl: 'https://drive.google.com/file/d/f' + id + '/view',
}, over || {});

function rig(job, refs) {
  const printed = [], alerts = [];
  const ctx = sandbox({
    fns: FNS, vars: VARS,
    stubs: {
      jobs: [Object.assign({}, job)], _photoRefs: { [job.id]: (refs || [IT('a')]).slice() },
      _invThumbs: {},
      esc: (x) => String(x == null ? '' : x),
      fmtDate2: (d) => String(d || '—'),
      _printDocument: (html, title) => { printed.push({ html, title }); return true; },
      alert: (m) => alerts.push(String(m)),
      maivAggregate: () => ({ count: 0, total: 0, settled: true, over: false, unvalued: 0 }),
      document: domStub({}),
    },
  });
  ctx.estimateStore[job.id] = { estimate: { rooms: [
    { idx: 1, name: 'Entry & Living', st: 'in' }, { idx: 4, name: 'Kitchen', st: 'in' }] } };
  return { ctx, printed, alerts, last: () => printed[printed.length - 1] || { html: '', title: '' } };
}
const bar = (job, refs) => { const { ctx } = rig(job, refs);
  return ctx._renderInvWorkbar(Object.assign({}, job), ctx._jobInvRefs(job.id)); };

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const live = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const fnLive = (name) => {
    const i = live.indexOf('function ' + name + '(');
    if (i < 0) return '';
    let d = 0, s = null;
    for (let x = live.indexOf('{', i); x < live.length; x++) {
      const c = live[x];
      if (s) { if (c === '\\') { x++; continue; } if (c === s) s = null; continue; }
      if (c === '"' || c === "'" || c === '`') { s = c; continue; }
      if (c === '{') d++; else if (c === '}') { d--; if (!d) return live.slice(i, x + 1); }
    }
    return live.slice(i);
  };

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE PREDICATE — the tier decides, and it decides for exactly two documents');
  {
    const p = sandbox({ fns: ['invDocContractBlock', 'docTierProduces', 'docTierOf', 'docTierDef', 'svcHasDocStep'],
                        vars: ['MATTER_TYPES', 'DECEDENT_SERVICES', 'INV_CONTRACT_DOCS', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS'] });
    const B = (tier, kind) => p.invDocContractBlock({ svc: 'probate', docTier: tier }, kind);
    ['schedule', 'court'].forEach((k) => {
      eq(B('values', k), '', k + ': issuable at the values tier');
      eq(B('appraisals', k), '', k + ': issuable at the top tier');
      ok(B('contents', k).length > 20, '⚠ ' + k + ': refused at `contents`, with a reason');
      ok(B('none', k).length > 20, '⚠ ' + k + ': refused at `none`, with a reason');
    });
    // Both reasons name the tier's own consequence and point at what we DO hand over.
    has(B('contents', 'schedule'), 'does not include valuation', 'the reason names the engagement …');
    has(B('contents', 'schedule'), 'Contents List', '… and names the document to send instead');
    has(B('contents', 'court'), '§733.604', 'the court reason names the filing it belongs to');
    has(B('contents', 'court'), 'estate attorney', 'and whose it is');
    // An unknown kind is not a gate. A typo must not silently withhold a document.
    eq(B('contents', 'nosuchkind'), '', '⚠ an unrecognised kind blocks nothing');
  }

  group('⚠ A LEGACY JOB WITH NO TIER BEHAVES EXACTLY AS IT DID');
  {
    const p = sandbox({ fns: ['invDocContractBlock', 'docTierProduces', 'docTierOf', 'docTierDef', 'svcHasDocStep'],
                        vars: ['MATTER_TYPES', 'DECEDENT_SERVICES', 'INV_CONTRACT_DOCS', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS'] });
    eq(p.invDocContractBlock({ svc: 'probate' }, 'schedule'), '',
       '⚠⚠ no tier reads as `values` through the migration, so nothing recorded before today loses a document');
    eq(p.invDocContractBlock({ svc: 'probate' }, 'court'), '', 'the court schedule likewise');
    eq(p.invDocContractBlock({ svc: 'probate', docScope: 'capture' }, 'schedule').length > 20, true,
       'but a job carrying only the legacy scope still resolves to `contents` and is refused');
  }

  group('⚠ A LIVING SERVICE IS NOT GATED HERE — one rule per outcome, never two');
  {
    const p = sandbox({ fns: ['invDocContractBlock', 'docTierProduces', 'docTierOf', 'docTierDef', 'svcHasDocStep'],
                        vars: ['MATTER_TYPES', 'DECEDENT_SERVICES', 'INV_CONTRACT_DOCS', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS'] });
    ['downsizing', 'downsizing_move', 'home_cleanout', 'prep'].forEach((svc) => {
      eq(p.invDocContractBlock({ svc, docTier: 'contents' }, 'schedule'), '',
         svc + ': answers "not blocked" — the `fid` test already withholds these');
    });
    // The converse, and it is the reason: gating here as well would be two rules for one
    // outcome, which is how they drift.
    has(fnLive('invDocContractBlock'), 'svcHasDocStep', 'it stands down on a service that prices no documentation');
    const { ctx } = rig(LIVING);
    const b = ctx._renderInvWorkbar(Object.assign({}, LIVING), ctx._jobInvRefs(2));
    lacks(b, 'printEstateInventoryReport(', 'and the living strip still withholds them on its own');
    lacks(b, 'printCourtInventory(', 'both of them');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE PRINTERS REFUSE WITH THE SAME SENTENCE — the gate cannot be reached around');
  {
    const { ctx, printed, alerts } = rig(ESTATE({ docTier: 'contents' }));
    ctx.printEstateInventoryReport(7);
    ctx.printCourtInventory(7);
    eq(printed.length, 0, '⚠ neither document is produced at the `contents` tier');
    eq(alerts.length, 2, 'and each says why');
    has(alerts[0], 'does not include valuation', 'the schedule names the engagement');
    has(alerts[1], '§733.604', 'the court schedule names the filing');
    // ONE rule, two readers — a gate living only on the button is not a gate.
    has(fnLive('printEstateInventoryReport'), "invDocContractBlock(job, 'schedule')", 'the schedule asks it');
    has(fnLive('printCourtInventory'), "invDocContractBlock(job, 'court')", 'the court schedule asks it');
    has(fnLive('_renderInvWorkbar'), 'invDocContractBlock', 'and so does the strip');
  }

  group('and both still print normally where they ARE ours');
  {
    const v = rig(ESTATE({ docTier: 'values' }));
    v.ctx.printEstateInventoryReport(7);
    v.ctx.printCourtInventory(7);
    eq(v.printed.length, 2, 'both documents produced at the values tier');
    eq(v.alerts.length, 0, 'nothing refused');
    has(v.printed[0].html, 'FMV (total)', 'the schedule still carries its value column');
    has(v.printed[1].html, '733.604', 'and the court schedule is still the §733.604 document');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE STRIP — three primaries on a decedent job, and the third is the fix');
  {
    const prim = (b) => {
      const m = b.match(/<button class="btn-s"[^>]*background:var\(--gray-dk\)[^>]*>([^<]*)</);
      return m ? m[1].trim() : '(none)';
    };
    eq(prim(bar(ESTATE({ docTier: 'contents' }))), 'Contents List', 'contents → the photographed list');
    eq(prim(bar(ESTATE({ docTier: 'values' }))), 'Estate Inventory PDF', 'values → the valued schedule');
    eq(prim(bar(ESTATE({ docTier: 'appraisals' }))), 'Estate Inventory PDF', 'appraisals → the same');
    eq(prim(bar(ESTATE({ docTier: 'none' }))), 'Approval Request',
       '⚠⚠ none → the written release approval, because that is what we DO issue there');
    eq(prim(bar(LIVING)), 'Contents Record', 'a living job is untouched');

    const none = bar(ESTATE({ docTier: 'none' }));
    lacks(none, 'printEstateInventoryReport(7)',
          '⚠⚠ and the page headed "Estate Inventory — Asset Schedule" is gone from a job we did not inventory');
    lacks(none, 'printCourtInventory(7)', 'along with the §733.604 schedule');
    const cont = bar(ESTATE({ docTier: 'contents' }));
    lacks(cont, 'printCourtInventory(7)', '⚠ the court schedule is withheld at `contents` too …');
    lacks(cont, 'printEstateInventoryReport(7)', '… and so is the valued one');
  }

  group('⚠ EVERYTHING ELSE IS PRODUCED AT EVERY TIER AND MUST STAY');
  {
    // The converse is the half that keeps this a gate rather than a cull. Each of these is
    // work Havellin does on every engagement, so withholding one would be the opposite defect.
    const KEEP = ['printApprovalRequest', 'printDispositionLedger', 'printAppraisalWorklist',
                  'printAsFoundRecord', 'takeInventorySnapshot', 'exportInventoryCSV',
                  'shareInventoryWithCounsel'];
    ['contents', 'values', 'appraisals', 'none'].forEach((tier) => {
      const b = bar(ESTATE({ docTier: tier }));
      KEEP.forEach((d) => has(b, d + '(', tier + ': ' + d.replace(/^print|^export|^take/, '') + ' still offered'));
    });
    // The Appraisal Worklist specifically: the capture agreement says Havellin gives the
    // appraiser access and attends on request, so the per-specialist packet is exactly what we
    // hand the appraiser COUNSEL engaged. Withholding it would be reading the tier as a ban.
    has(src, 'give the appraiser access to the property and be present for the visit on request',
        'and the agreement says why that one is ours at every tier');
  }

  group('⚠ THE ABSENCE IS EXPLAINED ON THE STRIP, not left to be hunted');
  {
    const b = bar(ESTATE({ docTier: 'contents' }));
    has(b, 'No valued schedule on this engagement', 'the strip says it plainly …');
    has(b, 'withheld for that reason, not because anything is missing here',
        '… and says it is the contract rather than a gap in the work');
    has(b, 'Counsel values it', 'carrying the tier’s own `they` sentence rather than a second copy of it');
    // And it is absent where nothing is withheld, or it becomes noise.
    lacks(bar(ESTATE({ docTier: 'values' })), 'No valued schedule on this engagement',
          'and nothing is said where nothing is withheld');
    lacks(bar(LIVING), 'No valued schedule on this engagement', 'nor on a living job');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE MATTER TYPE IS DELIBERATELY NOT GATED HERE — step 2 made the document explain itself');
  {
    // A withheld button leaves "where is the court inventory?" hanging. The document answers
    // it: it renders, refuses to finalise, and names what the estate actually is. Do not
    // "finish" this by hiding it.
    const t = rig(ESTATE({ docTier: 'values', matterType: 'trust' }));
    t.ctx.printCourtInventory(7);
    eq(t.printed.length, 1, 'it still renders on a trust matter …');
    const h = t.printed[0].html;
    has(h, 'not being administered through probate', '… and says so on its face');
    has(h, 'not ready to be adopted', 'refusing to finalise');
    lacks(h, 'Reviewed and adopted by', 'with no signature block');
    has(bar(ESTATE({ docTier: 'values', matterType: 'trust' })), 'printCourtInventory(7)',
        '⚠ and the button is still offered, because the document is the explanation');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ EACH DRAFT REASON CARRIES ITS OWN FIX — one constant sentence was wrong in three of four');
  {
    const why = (job, refs) => { const r = rig(job, refs); r.ctx.printCourtInventory(7);
      const h = (r.printed[0] || {}).html || '';
      const i = h.indexOf('This schedule is not ready to be adopted');
      return i < 0 ? '' : h.slice(i, i + 700).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '); };

    // 1. Unvalued lines — the only reason the old constant actually described.
    has(why(ESTATE({ docTier: 'values' }), [IT('a', { fmv: '' })]),
        'once the outstanding items are valued', 'unvalued: valuing it is the fix');

    // 2. Nothing on the probate schedule. Valuing items will never put them there.
    const off = why(ESTATE({ docTier: 'values' }), [IT('a', { assetTrack: 'Trust' })]);
    has(off, 'put the property on the probate schedule', '⚠ empty schedule: the fix is the track …');
    lacks(off, 'once the outstanding items are valued',
          '⚠⚠ … and NOT the valuation the old sentence sent them off to do');

    // 3. A trust matter. No final copy of this schedule is ever coming.
    const tr = why(ESTATE({ docTier: 'values', matterType: 'trust' }), [IT('a', { assetTrack: 'Trust' })]);
    has(tr, 'no final copy of THIS schedule will follow', '⚠⚠ trust matter: it says the copy is not coming');
    has(tr, 'wrong instrument', 'and why');

    // 4. ⚠⚠ PENDING APPRAISAL, AND WHO FINISHES IT DEPENDS ON THE CONTRACT. This arm came back
    // GREEN on the first revert sweep — every case above reached one of the other three
    // reasons, and this one needs Strict Mode AND a guardrail item to fire at all. At the
    // `appraisals` tier Havellin engages the specialist; at `values` the agreement puts that
    // with counsel, so promising a final copy "once Havellin engages the specialist" would be
    // promising somebody else's work as ours.
    const APPR = IT('a', { objectName: 'Sargent portrait', category: 'Art & Décor', fmv: '48000' });
    const atValues = why(ESTATE({ docTier: 'values', gate706: 'yes' }), [APPR]);
    has(atValues, 'pending appraisal', 'the guardrail reason fires …');
    has(atValues, 'the estate attorney arranges the appraisal on this engagement',
        '⚠⚠ at `values` the fix names COUNSEL, because appraisals are not ours there');
    lacks(atValues, 'Havellin engages the specialist',
          '⚠ and it does not promise our own work on somebody else’s engagement');

    const atAppr = why(ESTATE({ docTier: 'appraisals' }), [APPR]);
    has(atAppr, 'Havellin engages the specialist',
        'at the top tier it IS ours, and the fix says so');
    lacks(atAppr, 'the estate attorney arranges the appraisal',
          'the converse, so the two arms cannot collapse');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ ONE CATALOGUE, AND THE REASONS LIVE ON IT');
  {
    const p = sandbox({ fns: ['invDocContractBlock', 'docTierProduces', 'docTierOf', 'docTierDef', 'svcHasDocStep'],
                        vars: ['MATTER_TYPES', 'DECEDENT_SERVICES', 'INV_CONTRACT_DOCS', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS'] });
    const keys = Object.keys(p.INV_CONTRACT_DOCS);
    // ⚠ THREE SINCE 2026-09-21, and the third is the point rather than an exception: the
    // trustee's Chapter 736 schedule states a carrying value on every line, so it takes the
    // SAME test for the SAME reason. What separates the probate and trust variants is the
    // instrument and who signs, never whether valuation is ours — which is why the trust
    // schedule needed no new axis here. The count is pinned so a fourth cannot arrive
    // unnoticed, and the converse group below still asserts everything else stays ungated.
    eq(keys.sort().join(','), 'court,schedule,trustee', 'exactly three documents are gated by the contract');
    eq(p.INV_CONTRACT_DOCS.trustee.needs, 'values',
       'and the trust schedule is gated on values for the same reason the other two are');
    keys.forEach((k) => {
      const d = p.INV_CONTRACT_DOCS[k];
      ok(!!d.needs, k + ' names what it needs …');
      ok(d.why && d.why.length > 40, '… and carries the sentence a person reads');
      ok(['inventory', 'values', 'appraisals'].indexOf(d.needs) >= 0,
         '⚠ and it needs one of the `produces` keys, never a scope or a service');
    });
    // ⚠ IT READS `produces`, NEVER `scope`. The two top tiers share a scope and differ in what
    // they hand over — the separation step 3 exists for.
    lacks(fnLive('invDocContractBlock'), '.scope', 'the predicate never consults the pricing projection');
    lacks(fnLive('invDocContractBlock'), 'docScope', 'nor the legacy field');
  }
};
