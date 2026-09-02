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

  group('printing: assign, print, clear cannot happen on one tick');
  {
    // "I hit appraisal worklist and a blank doc comes up to print." Five printers set
    // #print-target, called window.print(), and cleared it synchronously. On a browser
    // that defers the dialog by a frame the target is empty by the time it renders.
    // printAgreement always did it correctly and said why in a comment; the others now
    // share that path.
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'havellin.html'), 'utf8');
    lacks(src, "window.print();\n  pt.innerHTML = '';",
          'no printer clears the target on the same tick as the dialog');
    const printers = ['printCourtInventory', 'printDispositionLedger', 'printAppraisalWorklist',
                      'printInventorySnapshot', 'printJobPlan'];
    printers.forEach((name) => {
      const at = src.indexOf('function ' + name + '(');
      if (at < 0) return;                       // renamed upstream; the lacks() above still guards
      const body = src.slice(at, src.indexOf('\nfunction ', at + 10));
      has(body, '_printDocument(', name + ' goes through the shared print path');
    });
    const h = src.slice(src.indexOf('function _printDocument('));
    const hb = h.slice(0, h.indexOf('\nfunction ', 10));
    has(hb, 'setTimeout', 'the shared path defers the dialog until styles have settled');
    has(hb, 'nothing to print', 'and refuses to open an empty dialog at all');
  }

  group('a cleared value stays blank, and money shows as money');
  {
    const m = sandbox({ fns: ['_invEdit', '_getPhotoRef', '_setPhotoRef', 'savePhotoRefs',
                              '_warnPhotoStoreFull', '_invTouch', 'moneyToNumber'],
                        stubs: { _invRefreshSummary() {}, _invRefreshGuardrail() {},
                                 _scheduleInventorySync() {}, _invNetDisplay: () => '' } });
    m._photoRefs[2] = [{ stableId: 'a', label: 'inventory', collId: null, fmv: '500000' }];

    m._invEdit(2, 'a', 'fmv', { value: '$12,500' });
    eq(m._photoRefs[2][0].fmv, 12500,
       'a formatted "$12,500" is stored as a number — parseFloat on that string gives NaN');

    m._invEdit(2, 'a', 'fmv', { value: '' });
    eq(m._photoRefs[2][0].fmv, '',
       'CLEARING the field leaves it blank, not 0 — "no value recorded" is a real state');

    m._invEdit(2, 'a', 'gross', { value: '$0' });
    eq(m._photoRefs[2][0].gross, 0, 'an explicit zero is still an explicit zero');

    // And the control itself has to be one that can render a dollar sign at all.
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'havellin.html'), 'utf8');
    const f = src.slice(src.indexOf('function _invInput('));
    const body = f.slice(0, f.indexOf('\nfunction _invNetDisplay'));
    lacks(body, '<input type="number" min="0" step="0.01"',
          'the currency cell is no longer a number input, which cannot display "$"');
    has(body, 'formatMoneyInput(this)', 'it formats as you type');
  }

  group('a manual line item has no room, and says so');
  {
    const r = sandbox({ fns: ['_invRoomName'] });
    eq(r._invRoomName(1, null), 'Unassigned / estate-wide',
       'not "Room undefined" on a document handed to an appraiser');
    eq(r._invRoomName(1, undefined), 'Unassigned / estate-wide', 'same for undefined');
  }

  group('item numbers survive a merge between two devices');
  {
    // Numbers are issued off a LOCAL high-water mark, so two sessions working the same
    // estate each issue 1, 2, 3 and the per-item merge unions them — the real screenshot
    // was six rows numbered 1,2,1,2,3,1. A duplicate number defeats the entire point of
    // having one: a receipt citing "item 2" has to identify a single object.
    const c = sandbox({ fns: ['_invAssignItemNos', '_jobInvRefs', '_invTouch', '_invItemNo',
                              'savePhotoRefs', '_warnPhotoStoreFull'] });
    const row = (id, no, ts) => ({ stableId: id, label: 'inventory', collId: null, itemNo: no, ts });
    c._photoRefs[1] = [
      row('a', 1, 100), row('b', 2, 200), row('c', 3, 300),   // device one
      row('d', 1, 400), row('e', 2, 500), row('f', 1, 600),   // device two, merged in
    ];
    const out = c._invAssignItemNos(1);
    const nos = out.map((r) => r.itemNo).sort((x, y) => x - y);
    eq(nos.length, 6, 'every row still has a number');
    eq(new Set(nos).size, 6, 'and no two rows share one');

    const byId = Object.fromEntries(out.map((r) => [r.stableId, r.itemNo]));
    eq(byId.a, 1, 'the earliest-created row KEEPS the number it was issued');
    eq(byId.b, 2, 'and so does the next');
    eq(byId.c, 3, 'and the next');
    ok(byId.d > 3 && byId.e > 3 && byId.f > 3, 'the later copies are reissued above the high-water mark');

    // Deterministic: a second pass must not keep churning numbers.
    const again = c._invAssignItemNos(1).map((r) => r.itemNo);
    eq(again, out.map((r) => r.itemNo), 'a second pass is a no-op — the resolution converges');
  }

  group('item numbers: a tombstone can collide too, and restore must not reintroduce one');
  {
    // Reported 2026-09-02 off a screenshot of the Removed items panel: two removed rows
    // both reading "#1", with a live row also on #1. The collision pass ran over
    // _jobInvRefs, which HIDES tombstones — so duplicates among removed rows were never
    // resolved, and a tombstone could sit on a live row's number indefinitely. Press
    // Restore and you have two live items numbered the same, which is the one thing the
    // numbering exists to prevent, because a receipt cites it.
    const c = sandbox({ fns: ['_invAssignItemNos', '_jobInvRefs', '_invTouch', '_invItemNo',
                              'savePhotoRefs', '_warnPhotoStoreFull'] });
    const row = (id, no, ts, del) => ({ stableId: id, label: 'inventory', collId: null,
                                        itemNo: no, ts, deletedAt: del });
    c._photoRefs[1] = [
      row('live', 1, 100),          // on the list, its number possibly already on a receipt
      row('t1', 1, 200, 900),
      row('t2', 1, 300, 950),
      row('t3', 2, 400, 960),
    ];
    c._invAssignItemNos(1);
    const all = c._photoRefs[1];
    const nos = all.map((r) => r.itemNo);
    eq(new Set(nos).size, 4, 'no two rows share a number, tombstones included');

    // A LIVE row is never displaced by a dead one. Its number may be printed already;
    // a removed row's is in nobody's hands.
    eq(all.find((r) => r.stableId === 'live').itemNo, 1,
       'the live row keeps its number — a tombstone never bumps one off');
    ok(all.find((r) => r.stableId === 't1').itemNo > 2, 'the removed copies are reissued');
    ok(all.find((r) => r.stableId === 't2').itemNo > 2, 'both of them');
    eq(all.find((r) => r.stableId === 't3').itemNo, 2, 'a tombstone with no clash is left alone');

    const again = c._invAssignItemNos(1) && c._photoRefs[1].map((r) => r.itemNo);
    eq(again, nos, 'a second pass is a no-op — it converges instead of churning');
  }

  group('restore issues a fresh number when the old one has been taken');
  {
    const r = sandbox({ fns: ['restoreInventoryItem', '_getPhotoRef', '_setPhotoRef',
                              'savePhotoRefs', '_warnPhotoStoreFull', '_invTouch',
                              '_jobInvRefs', '_invAssignItemNos', '_invItemNo'],
                        stubs: { renderInventoryTab() {}, _scheduleInventorySync() {},
                                 showSyncBadge(m) { r.__said = m; } } });
    r._photoRefs[1] = [
      { stableId: 'live', label: 'inventory', collId: null, itemNo: 4, ts: 100, objectName: 'Sideboard' },
      { stableId: 'gone', label: 'inventory', collId: null, itemNo: 4, ts: 50,
        objectName: 'Coin Collection', fmv: 500000, deletedAt: 900 },
    ];
    r.restoreInventoryItem(1, 'gone');
    const back = r._photoRefs[1].find((x) => x.stableId === 'gone');
    eq(r._jobInvRefs(1).length, 2, 'it comes back onto the list');
    eq(r._photoRefs[1].find((x) => x.stableId === 'live').itemNo, 4,
       'the item already holding #4 keeps it');
    ok(back.itemNo !== 4, 'and the restored row takes the next free number instead');
    eq(back.fmv, 500000, 'everything else on the row survives');
    // Silently renumbering would be worse than the collision — the person restoring is the
    // one who might have that number written down.
    ok(String(r.__said || '').includes('had been taken'), 'and it says so rather than renumbering quietly');
  }

  group('a duplicated import is named, not silently merged');
  {
    const d = sandbox({ fns: ['_invDuplicateImports', '_jobInvRefs'] });
    d._photoRefs[2] = [
      { stableId: 'v1', label: 'inventory', collId: null, sourceVehId: 9, objectName: '2026 Bentley SUV' },
      { stableId: 'v2', label: 'inventory', collId: null, sourceVehId: 9, objectName: '2026 Bentley SUV' },
      { stableId: 'k1', label: 'inventory', collId: null, sourceCollId: 4, objectName: 'Silver #1' },
      { stableId: 'k2', label: 'inventory', collId: null, sourceCollId: 4, objectName: 'Silver #2' },
      { stableId: 'm1', label: 'inventory', collId: null, objectName: 'Cash on hand' },
    ];
    const groups = d._invDuplicateImports(2);
    eq(groups.length, 1, 'one duplicate group');
    eq(groups[0].map((r) => r.stableId), ['v1', 'v2'], 'the two copies of the same vehicle');

    // An ITEMISED collection is legitimately many rows off one estimate line and must
    // never be reported as duplicated.
    ok(!groups.some((gr) => gr.some((r) => r.sourceCollId === 4)),
       'an itemised collection is not a duplicate — its rows carry different names');

    // A tombstoned copy is gone and does not count.
    d._photoRefs[2][1].deletedAt = Date.now();
    eq(d._invDuplicateImports(2).length, 0, 'deleting the extra clears the notice');
  }

  group('an import cannot be taken twice, and a deleted one can be retaken');
  {
    const i = sandbox({ fns: ['_importedSourceSet', '_jobInvRefs'] });
    i._photoRefs[3] = [{ stableId: 'v', label: 'inventory', collId: null, sourceVehId: 7 }];
    ok(i._importedSourceSet(3).veh[7], 'a live row marks its estimate line as imported');

    i._photoRefs[3][0].deletedAt = Date.now();
    ok(!i._importedSourceSet(3).veh[7],
       'a TOMBSTONED row does not — deleting every copy makes the line importable again, '
       + 'where reading _photoRefs directly locked it out forever');

    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'havellin.html'), 'utf8');
    ['materializeVehicle', 'materializeCollection'].forEach((name) => {
      const at = src.indexOf('function ' + name + '(');
      const body = src.slice(at, src.indexOf('\nfunction ', at + 10));
      has(body, '_importedSourceSet(jobId)', name + ' refuses a second import of the same line');
    });
  }

  group('the column switcher is gone — the groups are the item panel now');
  {
    const v = sandbox({ fns: ['_invPanelCols', '_invPanelSection'],
                        vars: ['INVENTORY_COLUMNS', 'INV_PANEL_SECTIONS'] });
    const panel = v._invPanelCols().map((c) => c.key);

    // The row already carries these three. Two inputs bound to one value is how a panel
    // and a row silently disagree about what an item is worth.
    ok(panel.indexOf('seq') < 0, 'the item number is the row identity, not a panel field');
    ok(panel.indexOf('fmv') < 0, 'FMV is edited on the row');
    ok(panel.indexOf('disposition') < 0, 'and so is the disposition');
    ok(panel.indexOf('valNote') >= 0, 'the valuation basis / comps note is in the panel');
    ok(panel.indexOf('gross') >= 0, 'the proceeds are');
    ok(panel.indexOf('flagMAIV') >= 0, 'and the flags');

    // EVERY panel field must land in a section that is actually rendered, or it exists
    // in the data and nowhere on screen — the same unreachability the old view test guarded.
    const sections = v.INV_PANEL_SECTIONS.map((s) => s.key);
    const orphan = v._invPanelCols().filter((c) => sections.indexOf(v._invPanelSection(c)) < 0);
    eq(orphan.map((c) => c.key), [], 'no panel field falls outside a rendered section');

    eq(v._invPanelSection({ key: 'objectName' }), 'item', 'identity fields head the panel');
    eq(v._invPanelSection({ key: 'room', group: 'val' }), 'item', 'room is an identity field, not a valuation one');
    eq(v._invPanelSection({ key: 'gross', group: 'disp' }), 'disp', 'otherwise the column group decides');

    // The EXPORT is unaffected — the workbook always carries every column.
    eq(v.INVENTORY_COLUMNS.length, 30, 'the manifest is 30 columns wide on export');

    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'havellin.html'), 'utf8');
    lacks(src, 'function setInvView', 'the column-group switcher is deleted, not hidden');
  }

  group('a removed item can be brought back');
  {
    // The tombstone keeps every value on the row. That was designed for merge
    // correctness, and it means a mis-click is fully recoverable — but nothing offered
    // it back, so a $500,000 line with a linked appraiser was gone for good.
    const r = sandbox({ fns: ['_invRemovedRows', 'restoreInventoryItem', '_getPhotoRef',
                              '_setPhotoRef', 'savePhotoRefs', '_warnPhotoStoreFull',
                              '_invTouch', '_jobInvRefs'],
                        stubs: { renderInventoryTab() {}, _scheduleInventorySync() {} } });
    r._photoRefs[1] = [{ stableId: 'c', label: 'inventory', collId: null, itemNo: 3,
                         objectName: 'Coin Collection', fmv: 500000, apprDoc: 'Marie Wayland',
                         deletedAt: 900 }];
    eq(r._invRemovedRows(1).length, 1, 'the removed row is still there to offer back');
    eq(r._jobInvRefs(1).length, 0, 'while staying out of the live manifest');

    r.restoreInventoryItem(1, 'c');
    eq(r._jobInvRefs(1).length, 1, 'restoring returns it to the manifest');
    eq(r._photoRefs[1][0].itemNo, 3, 'with its ORIGINAL item number, that number being free — receipts still point at it');
    eq(r._photoRefs[1][0].fmv, 500000, 'and its valuation');
    eq(r._photoRefs[1][0].apprDoc, 'Marie Wayland', 'and its linked appraiser');
    ok(r._photoRefs[1][0].updatedAt > 900,
       'stamped newer than the tombstone, so the undelete wins the merge on every device');
  }

  group('linking an appraiser answers the valuation-source question');
  {
    const a = sandbox({ fns: ['_invSetAppraiser', '_jobAppraisers', '_apprLabel', '_getPhotoRef',
                              '_setPhotoRef', 'savePhotoRefs', '_warnPhotoStoreFull', '_invTouch'],
                        stubs: { renderInventoryTab() {}, _scheduleInventorySync() {},
                                 _invRefreshGuardrail() {}, _invRefreshSummary() {} } });
    a.jobs.push({ id: 1, appraisers: [{ id: 7, name: 'Marie Wayland', firm: 'Appraisals by the Sea' }] });
    a._photoRefs[1] = [{ stableId: 'x', label: 'inventory', collId: null }];

    a._invSetAppraiser(1, 'x', 7);
    eq(a._photoRefs[1][0].valSource, 'Appraisal',
       'linking a credentialed appraiser IS the valuation source — it fills itself in');

    a._photoRefs[1][0].valSource = 'Dealer quote';
    a._invSetAppraiser(1, 'x', 7);
    eq(a._photoRefs[1][0].valSource, 'Dealer quote',
       'but it never overwrites a source somebody chose deliberately');

    a._photoRefs[1][0].valSource = 'Appraisal';
    a._invSetAppraiser(1, 'x', '');
    eq(a._photoRefs[1][0].valSource, '',
       'unlinking clears it — "Appraisal" with no appraiser is the unsupported claim the '
       + 'guardrail exists to catch');
  }

  group('the firm is named once, not twice');
  {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'havellin.html'), 'utf8');
    const f = src.slice(src.indexOf('function _apprPickVendor('));
    const body = f.slice(0, f.indexOf('\nfunction _apprPickerHtml'));
    has(body, "wrap.style.display = 'none'",
        'picking a directory vendor hides the Firm box — the dropdown already names it');
    has(body, "wrap.style.display = ''", 'and clearing the picker brings it back for free text');
    has(body, "placeholder = 'Contact at ", 'the remaining field says what it wants');
    has(src, 'id="appr-firm-wrap"', 'the wrapper exists to hide');
  }
};
