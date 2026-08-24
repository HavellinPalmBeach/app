'use strict';
// Covers the three inventory changes of 2026-08-24:
//   1. firearms are withheld from the Appraisal Worklist without written PR authority
//   2. exempt property gets its own subtotal + §732.402 cap check, and a Trust-track
//      exempt item no longer falls between the two sections of the Court Inventory
//   3. Item # is a stored, permanent number rather than the current row position
//
// Every function under test is lifted from havellin.html by source text — see
// tests/harness.js for why the whole file cannot simply be loaded.

const { sandbox } = require('./harness');

const INV_FNS = [
  'invCatMeta', 'invAppraiserFor', 'invIsIntrinsic', 'invNeedsAppraisal',
  'invIsFirearm', 'invFirearmAuthorized', 'invReleaseBlocked',
  '_jobInvRefs', '_invAssignItemNos', '_invItemNo', '_invTouch', 'mergeMediaItems',
  '_invJob', 'invAppraisalThreshold', 'gateDispute', '_gateYes',
  '_apprGroups', '_apprWithheld', '_apprNFA',
  '_invTrack', '_invIsProbateAsset',
  'savePhotoRefs', '_warnPhotoStoreFull',
];
const INV_VARS = [
  'INV_TAXONOMY', 'INV_CATEGORIES', 'INV_DEFAULT_CATEGORY',
  'INV_APPRAISAL_THRESHOLD', 'INV_ASSET_TRACKS', 'EXEMPT_CAP_732_402',
];

function item(over) {
  return Object.assign({
    stableId: 's' + Math.random().toString(36).slice(2),
    label: 'inventory', collId: null, roomIdx: 1,
    objectName: 'Thing', category: 'General/Household',
    ts: 1000, fmv: '', assetTrack: 'Probate',
  }, over);
}

function ctxWith(items) {
  const ctx = sandbox({ fns: INV_FNS, vars: INV_VARS });
  ctx._photoRefs[1] = items;
  return ctx;
}

module.exports = function ({ group, ok, eq, has, lacks }) {

  // ── 1. Firearms authority ──────────────────────────────────────────────────
  group('firearms: authority before release');
  {
    const ctx = sandbox({ fns: INV_FNS, vars: INV_VARS });

    ok(ctx.invIsFirearm({ category: 'Firearms' }), 'a Firearms-category item is a firearm');
    ok(!ctx.invIsFirearm({ category: 'Antiques' }), 'an antique is not');
    ok(!ctx.invIsFirearm(null), 'null is not a firearm and does not throw');

    ok(!ctx.invFirearmAuthorized({}), 'no authority recorded = not authorized');
    ok(!ctx.invFirearmAuthorized({ authBy: 'J. Smith, PR' }),
       'a name with no approval date is not authority');
    ok(!ctx.invFirearmAuthorized({ approvalDate: '2026-09-01' }),
       'a date with no name is not authority');
    ok(!ctx.invFirearmAuthorized({ authBy: '   ', approvalDate: '2026-09-01' }),
       'whitespace is not a name');
    ok(ctx.invFirearmAuthorized({ authBy: 'J. Smith, PR', approvalDate: '2026-09-01' }),
       'name + date = authority');

    ok(ctx.invReleaseBlocked({ category: 'Firearms' }),
       'an unauthorised firearm is blocked');
    ok(!ctx.invReleaseBlocked({ category: 'Firearms', authBy: 'PR', approvalDate: '2026-09-01' }),
       'an authorised firearm is not blocked');
    ok(!ctx.invReleaseBlocked({ category: 'Jewelry & Watches' }),
       'the gate applies to firearms only — it must not block other categories');
  }

  group('firearms: the worklist withholds rather than omits');
  {
    // Over the $3,000 threshold, so these are genuinely worklist-bound.
    const rifle    = item({ objectName: 'Rifle',  category: 'Firearms', fmv: '4500' });
    const pistol   = item({ objectName: 'Pistol', category: 'Firearms', fmv: '3800',
                            authBy: 'J. Smith, PR', approvalDate: '2026-09-01',
                            channel: 'Palm Beach Arms (FFL)' });
    const painting = item({ objectName: 'Oil painting', category: 'Art & Décor', fmv: '4000' });
    const ctx = ctxWith([rifle, pistol, painting]);

    const groups = ctx._apprGroups(1);
    eq((groups['Firearms Specialist (FFL)'] || []).map((r) => r.objectName), ['Pistol'],
       'only the authorised firearm reaches the worklist');
    ok(!!groups['Art Appraiser'], 'non-firearm categories are untouched by the gate');

    eq(ctx._apprWithheld(1).map((r) => r.objectName), ['Rifle'],
       'the unauthorised firearm is reported as awaiting authority');

    // Recording authority releases it — no other change required.
    rifle.authBy = 'J. Smith, PR';
    rifle.approvalDate = '2026-09-02';
    eq(ctx._apprWithheld(1).length, 0, 'recording authority clears the hold');
    eq((ctx._apprGroups(1)['Firearms Specialist (FFL)'] || []).length, 2,
       'and the item then appears on the worklist');
  }

  group('firearms: cheap ones are reported too');
  {
    // A $900 shotgun with a value recorded is BELOW the $3,000 appraisal threshold, so
    // it never reaches the worklist. It is still a firearm nobody has authorised moving,
    // and it is the likeliest one to be picked up without a second thought — so the
    // awaiting-authority report must not be filtered through the appraisal test.
    const shotgun = item({ objectName: 'Shotgun', category: 'Firearms', fmv: '900' });
    const ctx = ctxWith([shotgun]);
    eq(ctx.invNeedsAppraisal(shotgun), false, 'a $900 firearm does not need a specialist');
    eq(Object.keys(ctx._apprGroups(1)).length, 0, 'and does not appear on the worklist');
    eq(ctx._apprWithheld(1).map((r) => r.objectName), ['Shotgun'],
       'but it IS reported as awaiting authority');
  }

  group('firearms: NFA items');
  {
    const can  = item({ objectName: 'Suppressor', category: 'Firearms', fmv: '800', flagNFA: true });
    const gun  = item({ objectName: 'Shotgun',    category: 'Firearms', fmv: '900' });
    const sofa = item({ objectName: 'Sofa', category: 'Furniture', fmv: '400', flagNFA: true });
    const ctx  = ctxWith([can, gun, sofa]);

    eq(ctx._apprNFA(1).map((r) => r.objectName), ['Suppressor'],
       'only firearms carrying the flag are reported as NFA');
    // A flag set on a non-firearm cannot describe anything, so it must not count —
    // the column is not offered on those rows, but stale or imported data can carry it.
    lacks(ctx._apprNFA(1).map((r) => r.objectName).join(), 'Sofa',
          'the flag is inert outside the Firearms category');

    // NFA is a disclosure, NOT a second gate: the authority rule is unchanged by it.
    ok(ctx.invReleaseBlocked(can), 'an unauthorised NFA item is blocked like any firearm');
    can.authBy = 'J. Smith, PR'; can.approvalDate = '2026-09-01';
    ok(!ctx.invReleaseBlocked(can), 'authority releases it on the same terms');
    eq(ctx._apprNFA(1).length, 1,
       'and it is STILL reported as NFA once authorised — the dealer needs telling either way');
  }

  // ── 2. Item numbers are permanent ──────────────────────────────────────────
  group('item numbers: assigned once, never reassigned');
  {
    const a = item({ objectName: 'A', ts: 100 });
    const b = item({ objectName: 'B', ts: 200 });
    const c = item({ objectName: 'C', ts: 300 });
    const ctx = ctxWith([a, b, c]);

    ctx._invAssignItemNos(1);
    eq([a.itemNo, b.itemNo, c.itemNo], [1, 2, 3], 'numbers assigned in capture order');

    // THE BUG THIS REPLACES: removing a line used to renumber everything below it,
    // in the app, in the client workbook, and against any receipt citing a number.
    ctx._photoRefs[1] = [a, c];
    ctx._invAssignItemNos(1);
    eq([a.itemNo, c.itemNo], [1, 3], 'removing B leaves A and C on their own numbers');

    const d = item({ objectName: 'D', ts: 400 });
    ctx._photoRefs[1] = [a, c, d];
    ctx._invAssignItemNos(1);
    eq(d.itemNo, 4, 'a new item takes the next number, never a freed one');

    // Re-running is a no-op — the backfill must not churn on every render.
    const before = [a.itemNo, c.itemNo, d.itemNo];
    ctx._invAssignItemNos(1);
    ctx._invAssignItemNos(1);
    eq([a.itemNo, c.itemNo, d.itemNo], before, 'repeat assignment changes nothing');

    eq(ctx._invItemNo({ itemNo: 7 }), '7', 'display renders the stored number');
    eq(ctx._invItemNo({}), '—', 'an unnumbered item renders as a dash, not as 0');
    eq(ctx._invItemNo(null), '—', 'null does not throw');
  }

  group('item numbers: the backfill persists');
  {
    const a = item({ objectName: 'A', ts: 100 });
    const ctx = ctxWith([a]);
    ctx._invAssignItemNos(1);
    const raw = ctx.__store['hav_media_1'];
    ok(!!raw, 'assigning numbers writes the manifest to storage');
    const parsed = JSON.parse(raw || '[]');
    eq(parsed[0] && parsed[0].itemNo, 1,
       'itemNo survives savePhotoRefs — without it the number is re-derived and the point is lost');
  }

  group('tombstones: a removed item stays removed');
  {
    const a = item({ objectName: 'A', ts: 100 });
    const b = item({ objectName: 'B', ts: 200 });
    const ctx = ctxWith([a, b]);
    ctx._invAssignItemNos(1);

    // Removal marks rather than splices, so the row is still in _photoRefs...
    b.deletedAt = Date.now(); ctx._invTouch(b);
    eq(ctx._jobInvRefs(1).map((r) => r.objectName), ['A'],
       '...but a tombstoned item is invisible to every reader');
    eq(ctx._photoRefs[1].length, 2,
       'the row itself survives, because absence would read as "not seen yet" on the merge');

    // ...and its number is not handed to the next item.
    const c = item({ objectName: 'C', ts: 300 });
    ctx._photoRefs[1].push(c);
    ctx._invAssignItemNos(1);
    eq(c.itemNo, 3, 'a removed item does not free its number for reuse');
  }

  group('updatedAt: every mutation stamps');
  {
    const a = item({ objectName: 'A', ts: 100 });
    const ctx = ctxWith([a]);
    eq(a.updatedAt, undefined, 'unstamped to begin with');
    ctx._invAssignItemNos(1);
    ok(a.updatedAt > 0, 'assigning an item number is a real write and stamps it');
    // Without the stamp the merge cannot tell this device has newer data, and the
    // backfilled numbers would lose to any other device on the next sync.
    const older = Object.assign({}, a, { itemNo: 99, updatedAt: a.updatedAt - 1000 });
    eq(ctx.mergeMediaItems([a], [older])[0].itemNo, 1,
       'and the stamp is what makes the newer copy win');
  }

  // ── 3. Court inventory: exempt subtotal, cap, and the track/exempt overlap ──
  group('court inventory: exempt property');
  {
    const COURT_FNS = INV_FNS.concat([
      '_invMoney', 'printCourtInventory', 'isFormalDoc', 'resolveDocLevel',
      'docLevelFloor', 'docLevelFloorReason', '_gate706', 'isDecedentJob',
      'resolveValBasis', 'estateValueDate', '_avdDate',
      '_invGuardrailItems', '_invHasAppraisal', '_jobAppraisers',
    ]);
    const COURT_VARS = INV_VARS.concat(['INV_VAL_BASES', 'DECEDENT_SERVICES', 'INV_APPRAISAL_THRESHOLD_DISPUTED']);

    function courtCtx(items) {
      const ctx = sandbox({ fns: COURT_FNS, vars: COURT_VARS });
      ctx.jobs.push({ id: 1, name: 'Estate of Doe', hvlId: 'HVL-1001',
                      deathDate: '2026-01-15', docLevel: 'standard' });
      ctx._photoRefs[1] = items;
      return ctx;
    }

    // Exempt property gets its own subtotal, and it is under the cap here.
    const ctx1 = courtCtx([
      item({ objectName: 'Sofa',   fmv: '900',  flagExempt: true }),
      item({ objectName: 'Table',  fmv: '600',  flagExempt: true }),
      item({ objectName: 'Statue', fmv: '5000' }),
    ]);
    ctx1.printCourtInventory(1);
    const out1 = ctx1.__printed;
    has(out1, 'Total exempt property claimed', 'the exempt section carries its own total');
    has(out1, '$1,500', 'exempt subtotal is the sum of the exempt items only');
    has(out1, '$6,500', 'the grand total still covers both sections');
    lacks(out1, '§732.402 allowance for household',
          'no cap warning while the claim is under $20,000');

    // Over the cap: prompt to check, not an assertion that the claim is bad.
    const ctx2 = courtCtx([
      item({ objectName: 'Suite', fmv: '25000', flagExempt: true }),
    ]);
    ctx2.printCourtInventory(1);
    has(ctx2.__printed, '§732.402 allowance for household',
        'over the cap the document says so');
    has(ctx2.__printed, 'confirm the composition of this claim with counsel',
        'the wording prompts a check rather than asserting the claim fails');
    has(ctx2.__printed, 'Motor vehicles are a separate allowance',
        'and it names the carve-out, so the reader is not misled');

    // THE OVERLAP BUG: a Trust-track item also ticked exempt used to render inside
    // the Exempt section of the PROBATE schedule, and was left out of the excluded
    // count as well — so nothing on the page disclosed it at all.
    const ctx3 = courtCtx([
      item({ objectName: 'Probate chair', fmv: '100' }),
      item({ objectName: 'Trust silver',  fmv: '8000', assetTrack: 'Trust', flagExempt: true }),
    ]);
    ctx3.printCourtInventory(1);
    const out3 = ctx3.__printed;
    lacks(out3, 'Trust silver', 'a Trust-track item stays off the probate schedule even when exempt');
    has(out3, 'excluded from this probate schedule', 'and it is disclosed in the excluded note');
    has(out3, '1 item', 'the excluded count includes it');
    lacks(out3, '$8,100', 'its value is not folded into the probate total');
  }

  // ── Guard: the appraisal threshold has not silently moved ──────────────────
  group('appraisal threshold');
  {
    const ctx = sandbox({ fns: INV_FNS, vars: INV_VARS });
    eq(ctx.INV_APPRAISAL_THRESHOLD, 3000, 'single-item referral threshold is $3,000');
    eq(ctx.EXEMPT_CAP_732_402, 20000, '§732.402 cap is $20,000');
    ok(ctx.invNeedsAppraisal({ category: 'Firearms', fmv: '' }),
       'an intrinsic item with no value yet still needs a specialist');
    ok(!ctx.invNeedsAppraisal({ category: 'Furniture', fmv: '50000' }),
       'a non-intrinsic category does not route on value alone (per the existing rule)');
  }

  // ── The guardrail has to offer the FIX, not only the escape hatch ───────────
  group('the appraisal guardrail lets you link an appraiser from the panel');
  {
    const g = sandbox({
      fns: ['_renderAppraisalGuardrail', '_invGuardrailItems', '_invHasAppraisal',
            '_jobAppraisers', '_apprLabel', '_jobInvRefs', 'invNeedsAppraisal',
            '_invJob', 'invAppraisalThreshold', 'gateDispute', '_gateYes',
            'invIsIntrinsic', 'invCatMeta', 'invAppraiserFor', 'isFormalDoc',
            'resolveDocLevel', 'docLevelFloor', '_gate706', 'isDecedentJob'],
      vars: ['INV_TAXONOMY', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED',
             'DECEDENT_SERVICES'],
    });
    const job = { id: 5, svc: 'cleanout', gate706: 'yes',
                  appraisers: [{ id: 77, name: 'Marie Wayland', firm: 'Appraisals by the Sea', credential: 'ISA' }] };
    g.jobs.push(job);
    g._photoRefs[5] = [{ stableId: 'c1', label: 'inventory', collId: null,
                         objectName: 'Coin Collection', category: 'Collectibles', fmv: '500000' }];

    const panel = g._renderAppraisalGuardrail(job);
    has(panel, 'Coin Collection', 'the flagged item is named');
    has(panel, '_invSetAppraiser(5,', 'and the row carries a picker that links it');
    has(panel, 'Marie Wayland', 'listing the roster appraisers by name');
    has(panel, 'waiveAppraisal(5,', 'Waive is still there');
    lacks(panel, 'Link each to an appraiser above',
          'the instruction no longer points at the roster, which cannot link anything');

    // With an empty roster the picker would be a dropdown with nothing in it.
    const bare = { id: 6, svc: 'cleanout', gate706: 'yes', appraisers: [] };
    g.jobs.push(bare);
    g._photoRefs[6] = [{ stableId: 'c2', label: 'inventory', collId: null,
                         objectName: 'Silver service', category: 'Silver & Precious Metal', fmv: '9000' }];
    const empty = g._renderAppraisalGuardrail(bare);
    has(empty, 'Add an appraiser to the roster above first',
        'an empty roster says so instead of offering an empty dropdown');
    lacks(empty, '<select', 'and renders no picker at all');

    // Linking clears the item off the panel — that is the whole loop.
    g._photoRefs[5][0].apprId = 77;
    eq(g._invGuardrailItems(5).length, 0, 'a linked item leaves the guardrail');
    eq(g._renderAppraisalGuardrail(job), '', 'and the panel disappears once nothing is outstanding');
  }
};
