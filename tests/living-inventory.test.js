'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// THE ROOM-BY-ROOM INVENTORY ON A LIVING-CLIENT JOB (2026-09-21).
//
// Anthony: "we should have the room by room inventory available on all job types … what's
// going to the new home, what's going to be donated, what's going to be sent to the kids,
// what's going to be auctioned … the inventory is not just for the jobs that we're doing for
// dead people which i think was the previous rule."
//
// ⚠⚠ HALF OF THAT PREMISE WAS NEVER TRUE AND THE OTHER HALF WAS WORSE THAN HE THOUGHT. The
// capture was never gated — the room grid, the camera, the chips and the manifest have always
// rendered on all six labour services. What WAS true is that the seven estate DOCUMENTS were
// ungated too, so a living downsizing client was already one Donate row away from a Release
// Approval Request addressed "To Personal Representative" over a "Fair Market Value as of date
// of death (—)" basis line, and a §733.604 court schedule with an adoption block to sign.
//
// Then, asked whether to price the work: "it won't be full estate inventory work, with pricing
// estimates for all items … the time cost of the photography is inconsequential … it will keep
// us on track and honest with what goes to donation, appraisers, auction houses, etc. and will
// be a good record for the family of where stuff winds up and with whom."
//
// THE FOUR RULES THIS FILE PINS, in the order they matter:
//
//   1. NO LIVING-CLIENT QUOTE MOVES. No `document` step, no doc-scope control, no new hours.
//      This is the one that costs real money if it ever goes false.
//   2. THE ESTATE DOCUMENTS ARE WITHHELD FROM A LIVING JOB, and the converse — the estate
//      arm is untouched — is pinned beside every one of them, or the living arm gets built
//      by quietly weakening the estate one.
//   3. "WITH WHOM" IS EXPRESSIBLE. `Distribute` plus the recipient, end to end: field chip →
//      manifest → row → the family's record. Adding it also closed a live probate defect.
//   4. THE FIDUCIARY APPARATUS COMES OFF, AND THE ITEM RECORD DOES NOT. Axis 2 goes; Axis 1
//      — object, room, photograph, destination, recipient — is identical on both sides.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source, domStub } = require('./harness');

const liveLines = (s) => String(s).split('\n')
  .filter((l) => { const t = l.trim(); return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')); })
  .join('\n');

const LIVING = { id: 2, name: 'Margaret Ellsworth', hvlId: 'HVL-0011', svc: 'downsizing_move',
                 addr: '14 Coconut Row, Palm Beach', destAddr: '801 Sunset Ave', destCity: 'Palm Beach',
                 won: true, status: 'won', tc: 'Ashley Jerome', email: 'm@example.com' };
const EDIT   = Object.assign({}, LIVING, { id: 3, svc: 'downsizing', destAddr: '', destCity: '' });
const ESTATE = { id: 7, name: 'Butler Estate', hvlId: 'HVL-0007', svc: 'probate',
                 addr: '69 Beach Blvd, Palm Beach', executor: 'Tripp Butler',
                 deathDate: '2026-04-02', won: true, status: 'won', tc: 'Ashley Jerome' };

const ITEM = (id, over) => Object.assign({
  stableId: id, label: 'inventory', roomIdx: 1, seq: 1, status: 'uploaded',
  objectName: 'Sideboard', category: 'Furniture', ts: Date.UTC(2026, 8, 20, 15, 0),
  driveFileId: 'f' + id, driveFileUrl: 'https://drive.google.com/file/d/f' + id + '/view',
}, over || {});

const PRINT_FNS = [
  'printContentsRecord', 'dispositionRecord', 'printApprovalRequest', 'printCourtInventory',
  'printDispositionLedger', '_renderInvWorkbar', '_invReviewStats', '_invProgressStamp',
  '_invDocName', '_invDocHead', '_invPrintThumb', '_invRecipient', '_jobDestLabel',
  '_jobHasDestination', 'invFiduciaryMode', 'isDecedentJob', '_invJob', '_jobInvRefs',
  '_invAssignItemNos', '_invItemNo', '_invNamed', '_invRoomName', '_invDispLabel',
  '_invCautionBadges', 'invReleaseCautions', '_invTouch', 'savePhotoRefs', '_warnPhotoStoreFull',
  '_invProgressBar', 'invIsFirearm', 'invTransportBlocked', 'invFirearmAuthorized',
  '_invCautionNotices', '_invPicked', 'invFirearmAuthorized', '_invAwaitingApproval',
  '_renderInventorySummary', '_maivWorklistBlock', '_invDateTime', 'maivStatement_', '_avdDate',
  '_maivSummaryNotice', 'maivFilingApplies', '_gate706', 'invIsMAIV', 'invMAIVCategory',
  'invMAIVDefaultCat',
  'invReleaseBlocked', 'invIsIntrinsic', 'invCatMeta', 'invNeedsAppraisal', 'invAppraisalThreshold',
  'gateDispute', '_gateYes', 'invAwaitingAppraisal', '_invHasAppraisal', '_jobAppraisers',
  'invWorkFlags', '_invNeedsValue', '_invDispOptions', 'fieldDispChips', '_invPanelCols',
  '_invPanelSection',
];
const PRINT_VARS = [
  'INV_DISPOSITIONS', 'INV_GROUP_ORDER', 'INV_RELEASE_DISPOSITIONS', 'INV_RELEASE_CAUTIONS',
  'INVENTORY_COLUMNS', 'INV_PANEL_SECTIONS', 'INV_WORK_FLAGS', 'FIELD_DISPOSITIONS',
  'DECEDENT_SERVICES', 'CONTENTS_RECORD_GLOSS', 'INV_CAT_GLYPH', 'INV_TAXONOMY',
  'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED', 'INV_TRANSPORT_REASONS', 'INV_UNDECIDED',
  'estimateStore', '_invFilter', '_invShowRoll', '_invOpen', '_invPick',
  'INV_VAL_BASES', 'MAIV_AGGREGATE_THRESHOLD', 'INV_CONDITIONS', 'INV_VAL_SOURCES', 'INV_CATEGORIES',
  'MAIV_OTHER', 'MAIV_BY_CATEGORY', 'MAIV_BY_CATEGORY',
];

function rig(job, refs) {
  const printed = [];
  const ctx = sandbox({
    fns: PRINT_FNS, vars: PRINT_VARS,
    stubs: {
      jobs: [Object.assign({}, job)],
      _photoRefs: { [job.id]: refs || [] },
      esc: (x) => String(x == null ? '' : x),
      fmtDate2: (d) => String(d || '—'),
      _invThumbCache: () => ({}),
      _invFileId: (r) => r.driveFileId || '',
      _invMoney: (v) => (isNaN(parseFloat(v)) ? '—' : '$' + Math.round(parseFloat(v))),
      _money: (v) => '$' + Math.round(v || 0),
      resolveValBasis: () => 'Fair Market Value',
      estateValueDate: (j) => j.deathDate || '',
      _printDocument: (html, title) => { printed.push({ html, title }); return true; },
      maivAggregate: () => ({ count: 0, total: 0, settled: true, over: false, unvalued: 0 }),
      document: domStub({}),
    },
  });
  ctx.estimateStore[job.id] = { estimate: { rooms: [{ idx: 1, name: 'Entry & Living', st: 'in' }] } };
  return { ctx, printed, last: () => printed[printed.length - 1] || { html: '', title: '' } };
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const live = liveLines(src);

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ RULE 1 — NOT PRICED. No living-client quote moves by a dollar.');
  {
    const p = sandbox({ fns: ['svcHasDocStep', 'estimateDocScope', 'docScopeDef', 'seedDocScopeFromJob'],
                        vars: ['JOB_STEPS', 'DOC_SCOPES'] });
    // Anthony ruled the pricing out explicitly — "not the pricing agent … the time cost of the
    // photography is inconsequential". A `document` step is a third to two-fifths of an estate
    // ticket, so this going false is the expensive failure, not a cosmetic one.
    ['downsizing', 'downsizing_move', 'home_cleanout', 'prep'].forEach((svc) => {
      eq(p.svcHasDocStep(svc), false, svc + ' prices NO documentation step');
      ok(!p.JOB_STEPS[svc].document, 'and carries no `document` coefficient pair');
      eq(p.estimateDocScope({ svc }), 'none', 'so its scope is none whatever any pin says');
      // The control is hidden off the same predicate, so it cannot be set by hand either.
      eq(p.estimateDocScope({ svc, docScope: 'full' }), 'none',
         '⚠ even a record carrying docScope:full — the service decides, not the field');
    });
    // The converse: the decedent three are untouched, which is what makes this a separation
    // of the two axes rather than a relaxation of the first.
    ['cleanout', 'probate', 'contested_probate'].forEach((svc) => {
      eq(p.svcHasDocStep(svc), true, svc + ' still prices documentation');
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ RULE 2 — the estate documents are WITHHELD from a living job (they were not)');
  {
    const { ctx } = rig(LIVING, [ITEM('a', { disposition: 'Donate' })]);
    const bar = ctx._renderInvWorkbar(Object.assign({}, LIVING), ctx._jobInvRefs(2));

    // MEASURED BEFORE THE GATE: every one of these rendered on a living client, ungated, and
    // the first was the dark PRIMARY button on the tab.
    lacks(bar, 'printCourtInventory(', '⚠ no §733.604 court schedule for a living owner');
    lacks(bar, 'printEstateInventoryReport(', '⚠ no "Estate Inventory" asset schedule');
    lacks(bar, 'printDispositionLedger(', '⚠ no fiduciary accounting ledger');
    lacks(bar, 'takeInventorySnapshot(', '⚠ no amended-inventory snapshot trail');
    has(bar, 'printContentsRecord(2)', 'the primary is the record the family is promised');
    has(bar, 'Contents Record', 'and it is named for what it is');
    lacks(bar, 'Estate Inventory PDF', 'and the estate primary is gone with it');
    // Withheld, never offered-and-refused: a button that alerts a blocker back at you is worse
    // than none — the standing rule this app already follows on a blocked activation.
    lacks(bar, 'Share w/ Counsel', 'a living client has no counsel; the control is relabelled');
    has(bar, 'Share photographs', 'but the capability survives — their own adviser is a real reader');

    // ⚠⚠ THE CONVERSE, AND IT IS THE HALF THAT KEEPS THIS HONEST. Without it the living arm
    // could be built by quietly weakening the estate one and every check above would still pass.
    const e = rig(ESTATE, [ITEM('b', { disposition: 'Donate' })]);
    const ebar = e.ctx._renderInvWorkbar(Object.assign({}, ESTATE), e.ctx._jobInvRefs(7));
    ['printCourtInventory(7)', 'printEstateInventoryReport(7)', 'printDispositionLedger(7)',
     'takeInventorySnapshot(7)', 'printApprovalRequest(7)', 'Share w/ Counsel']
      .forEach((s) => has(ebar, s, 'the estate job still offers ' + s));
    lacks(ebar, 'printContentsRecord(', '⚠ and the estate job is NOT offered the living record');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ RULE 3 — "with whom" is expressible, end to end');
  {
    // The gap Anthony named twice. Before this there was no value meaning "went to a named
    // person": Keep is not a release, Hold is not an action, and Sell/Donate/Auction/Consign/
    // Junk are all false — so the tea set going to Sarah could only be crammed into Keep.
    const { ctx } = rig(LIVING, [
      ITEM('a', { objectName: 'Tea service', disposition: 'Distribute', channel: 'Sarah Ellsworth (daughter)' }),
      ITEM('b', { objectName: 'Dining table', disposition: 'Move' }),
      ITEM('c', { objectName: 'Rowing machine', disposition: 'Donate' }),
      ITEM('d', { objectName: 'Box of cables' }),
    ]);
    ok(ctx.INV_DISPOSITIONS.indexOf('Distribute') >= 0, 'Distribute is a destination');
    ok(ctx.INV_RELEASE_DISPOSITIONS.indexOf('Distribute') >= 0,
       '⚠⚠ and it is a RELEASE — this is the live probate defect it closed: a specific bequest '
       + 'released to its beneficiary reached _invAwaitingApproval, and therefore the Release '
       + 'Approval Request, through no disposition at all');
    ok(ctx.INV_RELEASE_DISPOSITIONS.indexOf('Move') < 0,
       '⚠ Move is NOT a release — it is the client\'s own property going to their own new address');

    const rec = ctx.dispositionRecord(2);
    eq(rec.total, 4, 'four items on the record');
    eq(rec.undecided, 1, 'one with no destination yet');
    // ⚠ MY OWN FIXTURE ASSERTION WAS WRONG AND THE CODE WAS RIGHT: the Donate row carries no
    // channel, so it IS a release with nobody recorded as taking it — which is precisely the
    // gap the count exists to surface. The Move row is excluded because its destination is the
    // job's own recorded address, and the undecided row has not left anywhere.
    eq(rec.noRecipient, 1, 'the Donate row has left with nobody named, and is counted');

    // The recipient is DERIVED for a Move and never written onto the row.
    const table = ctx._photoRefs[2].filter((r) => r.stableId === 'b')[0];
    eq(ctx._invRecipient(LIVING, table), '801 Sunset Ave, Palm Beach, FL',
       'a Move reads its destination off the job record');
    eq(table.channel, undefined, '⚠ and nothing was written back onto the item');

    // The gap the whole decision turns on: it left and nobody wrote down who took it.
    const g = rig(LIVING, [ITEM('x', { objectName: 'Armchair', disposition: 'Distribute' })]);
    eq(g.ctx.dispositionRecord(2).noRecipient, 1, 'a Distribute with no name is counted');
    const chip = g.ctx.invWorkFlags(LIVING).filter((f) => f.key === 'norecip')[0];
    ok(!!chip, 'and the desk carries a "No recipient" count');
    eq(chip.test(g.ctx._photoRefs[2][0]), true, 'which fires on exactly that row');
    // Useful on an estate too — there it is the release whose recipient was never recorded.
    ok(!!g.ctx.invWorkFlags(ESTATE).filter((f) => f.key === 'norecip')[0],
       'the count is on both sides of the catalogue');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE FAMILY\'S RECORD — what it says, and what it must never claim');
  {
    const { ctx, last } = rig(LIVING, [
      ITEM('a', { objectName: 'Tea service', disposition: 'Distribute', channel: 'Sarah Ellsworth (daughter)' }),
      ITEM('b', { objectName: 'Dining table', disposition: 'Move' }),
      ITEM('c', { objectName: 'Chandelier', disposition: 'Auction', channel: 'Kodner Galleries', gross: '4200', fees: '840' }),
      ITEM('d', { objectName: 'Box of cables' }),
    ]);
    ctx.printContentsRecord(2);
    const h = last().html;

    has(h, 'Contents Record', 'it is titled for what it is');
    has(h, 'Sarah Ellsworth (daughter)', '⚠⚠ WITH WHOM — the whole point');
    has(h, '801 Sunset Ave', 'and a Move shows where it went');
    has(h, 'Kodner Galleries', 'and an auction names the house');
    // Money actually RECEIVED is not a valuation — it is the first thing a family asks about
    // the dining table, and withholding it would be reading the brief upside down.
    has(h, '$3360', 'net actually received prints (gross less the partner\'s fees)');

    // ⚠ WHAT IT MUST NEVER SAY. Each of these printed on a living client before the gate.
    ['date of death', 'Personal Representative', 'Fiduciary', '733.604', '20.2031-6',
     '732.402', 'net to the estate', 'Letters'].forEach((bad) => {
      lacks(h, bad, '⚠ the family\'s record never says "' + bad + '"');
    });
    lacks(h, 'Basis:', '⚠ and it states no valuation basis — it is not a valuation');

    // The gap block, above the index: a reader works down the page, so a caveat printed under
    // the list has arrived after they have already taken it as complete. Same rule as the
    // As-Found Record's missing-rooms block and the release cautions.
    has(h, 'This record is not yet complete', 'the gap block names what is outstanding');
    ok(h.indexOf('This record is not yet complete') < h.indexOf('Item #'),
       '⚠⚠ and it prints ABOVE the index, measured on the rendered page');
    has(h, 'no destination recorded yet', 'and says which gap it is');

    // The undecided pile sorts LAST on a document and FIRST on the screen, deliberately.
    const rec = ctx.dispositionRecord(2);
    eq(rec.groups[rec.groups.length - 1].disposition, '',
       '⚠ "not yet decided" is last on the page — it is the worklist on screen, and opening a '
       + 'family\'s record with the pile nobody decided about would be the wrong first thing');
    eq(ctx.INV_GROUP_ORDER[0], '', 'while the screen still opens with it');

    // Our two words are glossed; the five that are ordinary English are not.
    has(h, 'went with you to the new home', 'Move is glossed');
    has(h, 'given to a named person', 'Distribute is glossed');
    ok(!ctx.CONTENTS_RECORD_GLOSS.Donate, '⚠ and Donate is not — a gloss on every heading reads '
       + 'as an app explaining itself');

    // It is both the mid-job control and the hand-over, on one mechanism that already existed.
    has(h, 'IN PROGRESS', 'it stamps itself a working copy until every line is reviewed');
    // The PDF is named after the document, not the browser tab — the defect this file's
    // predecessor records four times.
    has(last().title, 'Havellin Contents Record', 'and the Save-as-PDF is named for it');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ RULE 4 — Axis 2 comes off, Axis 1 is identical on both sides');
  {
    const { ctx } = rig(LIVING, []);
    const living = ctx._invPanelCols(LIVING).map((c) => c.key);
    const estate = ctx._invPanelCols(ESTATE).map((c) => c.key);

    // Each of these is a false statement on a living owner, not merely clutter. `_invTrack`
    // returns 'Probate' for any row with no explicit value — measured — so every line on a
    // living client's manifest silently asserted it was probate-estate property.
    ['assetTrack', 'flagExempt', 'flagMAIV', 'maivCat', 'valDate', 'valSource', 'valNote']
      .forEach((k) => {
        ok(living.indexOf(k) < 0, k + ' is off a living job');
        ok(estate.indexOf(k) >= 0, 'and still on an estate one');
      });
    // Axis 1 is the record itself and does not move.
    ['objectName', 'category', 'room', 'channel', 'serial', 'flagBequest', 'flagDisputed',
     'dispDate', 'receiptDoc'].forEach((k) => {
      ok(living.indexOf(k) >= 0 && estate.indexOf(k) >= 0, k + ' is on both');
    });

    // The value CHIP goes (it would count every row forever, since nobody enters values on a
    // living job) — but the FMV box on the row stays, because _invPanelCols excludes it
    // precisely because the row carries it, so gating it there would make it unreachable.
    const lf = ctx.invWorkFlags(LIVING).map((f) => f.key);
    ok(lf.indexOf('noval') < 0, '⚠ "No value yet" is off a living job — it could never clear');
    ok(ctx.invWorkFlags(ESTATE).map((f) => f.key).indexOf('noval') >= 0, 'and on an estate one');
    has(live, "_invInput(jid, ref, fmvCol, job)", '⚠ the FMV box itself stays on the row');

    // invNeedsAppraisal reduces to the explicit tick. Its automatic arm fires on an intrinsic
    // category with no value — which on a living job is every such row, forever.
    const art = ITEM('z', { category: 'Art & Décor' });
    eq(ctx.invNeedsAppraisal(art, LIVING), false,
       '⚠⚠ an unvalued Art & Décor row does NOT auto-flag on a living job');
    eq(ctx.invNeedsAppraisal(art, ESTATE), true, 'and still does on an estate');
    eq(ctx.invNeedsAppraisal(Object.assign({}, art, { needsAppr: true }), LIVING), true,
       'the explicit tick still works — on a living job it means a CHANNEL, not a valuation');
    // ⚠ NO JOB MEANS THE ESTATE BEHAVIOUR, which is the safe direction and is load-bearing:
    // every caller that forgets the job must not silently under-flag a real estate.
    eq(ctx.invNeedsAppraisal(art), true, 'and with no job at all the estate rule survives');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ FIREARMS STAY WHOLE ON EVERY SERVICE — and Distribute is blocked outright');
  {
    const { ctx } = rig(LIVING, []);
    // A gun in a downsizing client's closet is still a gun. The category keys on the OBJECT.
    const gun = { category: 'Firearms', objectName: 'Remington 870', serial: 'RS12345678',
                  authBy: 'Margaret Ellsworth', approvalDate: '2026-09-20', channel: 'Palm Beach Arms (FFL)' };
    eq(ctx.invIsFirearm(gun), true, 'a firearm is a firearm on a living job');
    eq(ctx.invTransportBlocked(gun), '', 'fully papered to a dealer, it may be carried');

    // ⚠⚠ THE ARM THIS BUILD HAD TO ADD. `dealer` below is satisfied by ANY non-empty channel,
    // so the moment that field routinely holds a recipient's name a firearm marked Distribute
    // would have read as CLEARED TO CARRY with "Marie (daughter)" standing in for a licensee.
    const toKid = Object.assign({}, gun, { disposition: 'Distribute', channel: 'Marie Delgado (daughter)' });
    eq(ctx.invTransportBlocked(toKid), 'beneficiary',
       '⚠⚠ a firearm going to a named person is BLOCKED — the transfer runs through an FFL');
    has(ctx.INV_TRANSPORT_REASONS.beneficiary, 'licensed dealer', 'and the reason says why');
    // Above `authority` on purpose: no authorisation can cure an unlicensed transfer to a person.
    eq(ctx.invTransportBlocked(Object.assign({}, toKid, { authBy: '', approvalDate: '' })), 'beneficiary',
       '⚠ and no written authority can clear it — same rule as the NFA arm');
    // NFA is still first and still has no override.
    eq(ctx.invTransportBlocked(Object.assign({}, toKid, { flagNFA: true })), 'nfa', 'NFA outranks it');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE CHIPS AND THE DESK SELECT OFFER ONE LIST, FILTERED — never a second list');
  {
    const { ctx } = rig(LIVING, []);
    // Move is offered where there is somewhere of the client's own to go, and nowhere else —
    // on a Home Cleanout it would be read as "move it to the garage", which is a staging note.
    eq(ctx._jobHasDestination(LIVING), true, 'a Transition has a new home');
    eq(ctx._jobHasDestination(EDIT), false, 'a Home Editing job with no recorded address does not');
    eq(ctx._jobHasDestination(ESTATE), false, 'and an estate never does');
    ok(ctx.fieldDispChips(LIVING).some((d) => d.key === 'move'), 'so the chip is offered there');
    ok(!ctx.fieldDispChips(EDIT).some((d) => d.key === 'move'), 'and withheld here');
    // Distribute is offered everywhere, estate included — there it is the bequest release.
    [LIVING, EDIT, ESTATE].forEach((j) => {
      ok(ctx.fieldDispChips(j).some((d) => d.key === 'distribute'), 'Distribute is always offered');
    });
    // ⚠ A FILTER OVER ONE LIST. Every chip must still resolve to a real value, or a pile tapped
    // in a room lands in a section the desk never renders.
    ctx.FIELD_DISPOSITIONS.forEach((d) => {
      ok(d.disposition === '' || ctx.INV_DISPOSITIONS.indexOf(d.disposition) >= 0,
         d.label + ' maps to a real disposition');
    });
    // ⚠⚠ THE STORED VALUE IS ALWAYS FORCED INTO THE SELECT. Without this, re-typing a job off
    // downsizing_move would silently clobber every Move already recorded on it.
    ok(ctx._invDispOptions(EDIT, 'Move').indexOf('Move') >= 0,
       'a row already carrying Move keeps it even where Move is withheld');
    ok(ctx._invDispOptions(EDIT, '').indexOf('Move') < 0, 'but it is not offered fresh');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ⚠⚠ THE FOUR GROUPS BELOW EXIST BECAUSE A REVERT SWEEP CAME BACK GREEN ON EACH OF THEM.
  // Every one drove a PIECE and nothing drove the OUTCOME, which is the gap this project
  // records more than any other. Each is driven against the real renderer now.
  group('⚠ THE SUMMARY BLOCK — five estate rows and three estate totals come off');
  {
    const { ctx } = rig(LIVING, [ITEM('a', { fmv: '', disposition: 'Keep' })]);
    const L = ctx._renderInventorySummary(Object.assign({}, LIVING), ctx._jobInvRefs(2));
    const E = rig(ESTATE, [ITEM('p', { fmv: '', disposition: 'Keep' })]);
    const Eh = E.ctx._renderInventorySummary(Object.assign({}, ESTATE), E.ctx._jobInvRefs(7));

    // Measured before the gate: five consecutive rows of estate apparatus on a living owner,
    // one of them an editable Valuation Basis dropdown and one a §2032 alternate-valuation tick.
    ['Date of Death', 'Valuation Basis', 'Letters Issued', '§733.604', 'Value as of']
      .forEach((r) => { lacks(L, r, '⚠ "' + r + '" is off a living summary'); has(Eh, r, 'and on the estate one'); });
    ['Items Awaiting Valuation', '20.2031-6', '§732.402']
      .forEach((r) => { lacks(L, r, '⚠ "' + r + '" is off a living summary'); has(Eh, r, 'and on the estate one'); });
    has(L, 'Net received', 'the net is "received", not "to Estate"');
    lacks(L, 'Net to Estate', '⚠ there is no estate to be net to');
    has(Eh, 'Net to Estate', 'and the estate wording survives');
    has(L, 'Going to a specialist', 'the appraisal row is a routing question on a living job');
    has(Eh, 'Needs Specialist Appraisal', 'and a valuation one on an estate');
    has(L, 'Promised to someone', 'a bequest is a promise on a living job');
    has(Eh, 'Specific Bequests', 'and a will term on an estate');
    // The footer's whole subject is what counsel files instead; it has no living counterpart.
    lacks(L, 'court inventory', '⚠ and the §733.604 footer simply goes rather than being reworded');
    has(L, 'Total Items', 'while the record itself is on both');
  }

  group('⚠ THE MAIV AGGREGATE NEVER REACHES A LIVING JOB');
  {
    // Measured before the gate, on a Home Editing job with one oil painting and one ring: a full
    // Treas. Reg. §20.2031-6(b) block naming "the gross estate" and "the §733.604 probate
    // schedule", printed on the packet handed to a specialist.
    const { ctx } = rig(LIVING, []);
    const maiv = { count: 2, total: 5000, settled: true, over: true, unvalued: 0 };
    const items = [ITEM('a', { category: 'Art & Décor', fmv: '4000' }),
                   ITEM('b', { category: 'Jewelry & Watches', fmv: '1000' })];
    eq(ctx._maivWorklistBlock(LIVING, items, maiv), '',
       '⚠⚠ nothing renders on a living job, whatever the aggregate says');
    ok(ctx._maivWorklistBlock(ESTATE, items, maiv).length > 200,
       'and the estate block is untouched');
    has(ctx._maivWorklistBlock(ESTATE, items, maiv), '20.2031-6',
       'still citing the regulation it exists for');
    // The converse of the converse: an estate with nothing flagged still renders nothing.
    eq(ctx._maivWorklistBlock(ESTATE, [], { count: 0, total: 0, settled: true, over: false }), '',
       'and an empty aggregate is still empty');
  }

  group('⚠ THE NOT-YET-APPRAISED CAUTION IS A FIDUCIARY CAUTION');
  {
    // Its body says the estate would have "no independent record of what the property was worth
    // when it left" and that on a federal return "that figure is reported under oath". Neither
    // sentence is true of a living owner who watched the piece go out of the door.
    const { ctx } = rig(LIVING, []);
    const art = { category: 'Art & Décor', objectName: 'Oil painting', disposition: 'Auction', needsAppr: true };
    const lc = ctx.invReleaseCautions(art, 2).map((c) => c.key);
    const ec = rig(ESTATE, []).ctx.invReleaseCautions(art, 7).map((c) => c.key);
    ok(lc.indexOf('needsAppraisal') < 0, '⚠ it is withheld from a living job');
    ok(ec.indexOf('needsAppraisal') >= 0, 'and kept on an estate');
    // Bequest and dispute are NOT fid — a promised piece and a family argument are both ordinary
    // on a downsizing, and both are exactly what the record is meant to keep honest.
    const both = { flagBequest: true, flagDisputed: true, disposition: 'Donate' };
    ['flagBequest', 'flagDisputed'].forEach((k) => {
      ok(ctx.invReleaseCautions(both, 2).map((c) => c.key).indexOf(k) >= 0,
         k + ' fires on a living job too');
    });
    eq(ctx.INV_RELEASE_CAUTIONS.filter((c) => c.fid).map((c) => c.key).join(','), 'needsAppraisal',
       'exactly one caution is fiduciary-only');
  }

  group('⚠ A TRANSITION HAS A NEW HOME BEFORE ANYONE HAS TYPED THE ADDRESS');
  {
    // ⚠ THE ARM THE FIRST SWEEP COULD NOT SEE: every fixture had destAddr set, so the
    // `|| svc === 'downsizing_move'` half never decided anything. The address is captured at
    // intake and is frequently still blank on the walkthrough — which is exactly when the chip
    // is first needed, standing in the room on day one.
    const { ctx } = rig(LIVING, []);
    const noAddr = { id: 4, svc: 'downsizing_move', destAddr: '', destCity: '' };
    eq(ctx._jobHasDestination(noAddr), true,
       '⚠⚠ a Transition with no address recorded yet still offers the New home chip');
    ok(ctx.fieldDispChips(noAddr).some((d) => d.key === 'move'), 'so the crew can use it on day one');
    // And with no address there is nothing to derive, so the row falls back to blank rather
    // than to a misleading label.
    eq(ctx._jobDestLabel(noAddr), '', 'the destination label is empty until somebody records it');
    eq(ctx._invRecipient(noAddr, { disposition: 'Move' }), '',
       'and a Move row reads blank rather than inventing a destination');
    // The converse: a plain Home Editing job with no address does NOT get the chip.
    eq(ctx._jobHasDestination({ id: 5, svc: 'downsizing', destAddr: '' }), false,
       'and a Home Editing job with nowhere to go does not');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE RELEASE APPROVAL REQUEST IS KEPT ON A LIVING JOB, AND STOPS BEING AN ESTATE DOCUMENT');
  {
    // MEASURED before the rework, on a living client with one Donate row: "To Personal
    // Representative:", "Basis: Fair Market Value as of date of death (—)", an Est. value column
    // of em dashes footed "estimated value $0", "authorized fiduciary", and a footer filing it
    // "with the estate record and retained for seven years". The button was never gated.
    const { ctx, last } = rig(LIVING, [
      ITEM('a', { objectName: 'Tea service', disposition: 'Distribute', channel: 'Sarah Ellsworth (daughter)' }),
      ITEM('c', { objectName: 'Rowing machine', disposition: 'Donate' }),
    ]);
    ctx.printApprovalRequest(2);
    const h = last().html;

    has(h, 'To <strong>Margaret Ellsworth</strong>', 'it addresses the owner, who is standing there');
    lacks(h, 'Personal Representative', '⚠ not a representative they do not have');
    lacks(h, 'authorized fiduciary', '⚠ and they are not signing as a fiduciary');
    lacks(h, 'date of death', '⚠ no date-of-death basis line');
    lacks(h, 'Est. value', '⚠ no value column — a column of em dashes reads as a failed render');
    lacks(h, 'estimated value', 'and no $0 total under it');
    lacks(h, 'estate record', '⚠ it is filed with their job record, not an estate record');
    has(h, 'Where it is going', 'the column says what it is');
    // ⚠⚠ THE CONTROL ITSELF SURVIVES ON BOTH ARMS. This sentence is on the published
    // deliverables page and is not decedent-specific — it is the whole point of the document,
    // and it is exactly the "keep us on track and honest" Anthony asked the record to provide.
    has(h, 'Verbal approval is not accepted', '⚠⚠ and verbal approval is still not accepted');
    has(h, 'Sarah Ellsworth (daughter)', 'the recipient prints on the line');

    // The converse, byte for byte: the estate document is untouched.
    const e = rig(ESTATE, [ITEM('p', { objectName: 'Sargent portrait', disposition: 'Auction', fmv: '48000' })]);
    e.ctx.printApprovalRequest(7);
    const eh = e.last().html;
    ['authorized fiduciary', 'date of death', 'Est. value',
     'estimated value', 'estate record', 'Verbal approval is not accepted', 'Proposed disposition']
      .forEach((t) => has(eh, t, 'the estate request still says "' + t + '"'));
    // ⚠ MY OWN ASSERTION WAS WRONG AND THE CODE WAS RIGHT: this fixture HAS an executor, so the
    // document addresses him by name. 'Personal Representative' is only the fallback, and the
    // fallback is what has to survive — an estate with nobody recorded must not fall through to
    // the client's own name, because on a decedent job that name belongs to someone who is dead.
    has(eh, 'To <strong>Tripp Butler</strong>', 'and addresses the representative by name');
    const noExec = rig(Object.assign({}, ESTATE, { executor: '' }), [ITEM('q', { disposition: 'Donate' })]);
    noExec.ctx.printApprovalRequest(7);
    has(noExec.last().html, 'To <strong>Personal Representative</strong>',
        '⚠⚠ an estate with no representative recorded falls back to the ROLE, never to job.name');

    // ⚠ AND A LIVING JOB THAT DOES CARRY A FIGURE KEEPS THE COLUMN — withholding it there would
    // hide real money, which is the opposite failure.
    const v = rig(LIVING, [ITEM('m', { objectName: 'Chandelier', disposition: 'Auction', fmv: '4200' })]);
    v.ctx.printApprovalRequest(2);
    has(v.last().html, 'Est. value', 'a living job with a value recorded still shows the column');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE MANIFEST KEEPS THE RECIPIENT ACROSS A MERGE (it did not)');
  {
    const st = sandbox({ vars: ['INV_STICKY_FIELDS'] });
    // Every neighbour of `channel` in the same column group was already sticky — authBy,
    // approvalDate, dispDate, receiptDoc — so a two-device merge kept WHEN the sideboard left
    // and the receipt number against it, and lost WHO TOOK IT. Live defect on estate work.
    ok(st.INV_STICKY_FIELDS.indexOf('channel') >= 0,
       '⚠⚠ `channel` survives a merge — it is the only field that records who ended up with it');
    ['authBy', 'approvalDate', 'dispDate', 'receiptDoc'].forEach((k) => {
      ok(st.INV_STICKY_FIELDS.indexOf(k) >= 0, k + ' still does too');
    });
    ok(st.INV_STICKY_FIELDS.indexOf('fmv') < 0,
       '⚠ and fmv still does NOT — a value is a judgement somebody revises');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE CLIENT DOCUMENT NAMES THE RECORD, AND NEVER PROMISES A VALUE');
  {
    // The estimate is Exhibit A, incorporated by reference into a signed agreement, so a line
    // promising "an itemised inventory … and estimated value" on a living job would sell the
    // valuation Anthony ruled out. The two lines are separate for exactly that reason.
    const ce = src.slice(src.indexOf('var records = ['), src.indexOf('var records = [') + 1600);
    has(ce, "if (!isDeceased) records.push('A record of the contents",
        'a living job names the record it now produces');
    has(ce, 'who received it', 'and says the record carries who received it');
    ok(ce.indexOf("if (!isDeceased) records.push('A record of the contents") <
       ce.indexOf("docScope === 'full'"),
       'it is its own line, above the estate one');
    const livingLine = ce.slice(ce.indexOf("if (!isDeceased) records.push("),
                                ce.indexOf("if (docScope === 'full')"));
    lacks(livingLine, 'estimated value', '⚠⚠ and it promises NO value');
    lacks(livingLine, 'appraisal', 'and no appraisal');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE PLAN AND THE DESK AGREE ABOUT RECIPIENTS');
  {
    // They were about to disagree: the desk counted "a release with no recipient" on every
    // service, and the plan asked the question only on a decedent job. Two claims, two lines —
    // an estate needs WRITTEN AUTHORITY before property may leave; a living owner authorised it
    // standing there, and what is missing is only the record of who took it.
    has(live, "key: 'recipients_recorded'", 'the plan carries a living-job recipient line');
    has(live, "key: 'release_authority'", 'and the estate authority line survives');
    const dl = live.slice(live.indexOf("key: 'release_authority'") - 900,
                          live.indexOf("key: 'recipients_recorded'") + 400);
    has(dl, 'ctx.hasItemRecord && leaving.length', 'the living line is gated on the item record');
    has(dl, 'ctx.isDocJob', 'and the estate line is still gated on the decedent services');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE TWO AXES ARE TWO PREDICATES AND MUST NOT BE COLLAPSED');
  {
    const p = sandbox({ fns: ['invFiduciaryMode', 'isDecedentJob', 'svcFamily', 'svcHasDocStep'],
                        vars: ['DECEDENT_SERVICES', 'SVC_ORDER', 'JOB_STEPS'] });
    // They select the same set TODAY. The reason they are two names is that the first time a
    // living client wants a court-grade inventory — a trust officer's client, a pre-nuptial
    // schedule — they will not, and every read site would have to be sorted out under pressure.
    p.SVC_ORDER.forEach((svc) => {
      eq(p.invFiduciaryMode({ svc }), p.isDecedentJob({ svc }),
         svc + ': the two agree today, and that is recorded rather than assumed');
    });
    eq(p.invFiduciaryMode(null), false, 'no job is not a fiduciary job');
    // ⚠ Axis 1 is EVERY labour service, and there is no predicate for it because there is no
    // gate — the room grid, the camera and the manifest have never been service-gated.
    ['downsizing', 'downsizing_move', 'home_cleanout', 'cleanout', 'probate', 'contested_probate']
      .forEach((svc) => eq(p.svcFamily(svc) === 'decedent', p.invFiduciaryMode({ svc }),
                           svc + ': Axis 2 follows the family, never the document step alone'));
    // The one live reference that must NOT be rewritten to the new name: isDecedentJob decides
    // WHO WE ARE WRITING TO (the estimate's voice, which agreement form), a different question.
    has(live, 'if (isDecedentJob(job)) return probateAgreementHtml(job, est);',
        '⚠ the agreement form still routes on isDecedentJob, not on the fiduciary predicate');
  }
};
