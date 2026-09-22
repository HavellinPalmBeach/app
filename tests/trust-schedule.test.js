'use strict';
// ⚠⚠ A TRUST MATTER HAD TWO DEAD ENDS AND NO THIRD ANSWER, and both were measured on the real
// functions before anything was built. Leave every line on `_invTrack`'s default and the Court
// Inventory lists the whole house on a §733.604 schedule for a proceeding that does not exist;
// set the track to Trust — the right answer, and the one both documents tell you to give — and
// the Court Inventory correctly refuses, totals $0, and NOTHING anywhere lists the property.
// Anthony: "most homes will be in trust. so we need to get this right." The common case was the
// one with no path through the app.
const { sandbox, source, fn, domStub } = require('./harness.js');

const FNS = [
  'printTrustSchedule', 'printCourtInventory', 'printEstateInventoryReport', '_invScheduleSection',
  '_invTrack', '_invTrackDefault', '_invOnTrustSchedule', '_invOnProbateSchedule',
  '_invIsExempt', '_invIsProbateAsset', '_invExcludedTracks', '_invHasValue',
  'invDocContractBlock', 'docTierProduces', 'docTierOf', 'docTierDef', 'docTierScope', 'docTierScopeMirror',
  'svcHasDocStep', 'matterDef', 'matterTypeOf', 'invProbateRows', 'invFiduciaryMode',
  'isDecedentJob', '_invAssignItemNos', '_jobInvRefs', '_invTouch', 'savePhotoRefs',
  '_warnPhotoStoreFull', 'isFormalDoc', 'resolveDocLevel', 'docLevelFloor', 'gateDispute',
  '_gateYes', '_gate706', '_invGuardrailItems', 'invAwaitingAppraisal', '_invJob',
  'invNeedsAppraisal', 'invIsIntrinsic', 'invCatMeta', 'invAppraisalThreshold',
  '_invHasAppraisal', '_jobAppraisers', 'resolveValBasis', 'estateValueDate', '_invMoney',
  '_invDocName', '_invItemNo', '_invGroupItems', '_invDispLabel', '_invRoomName', '_planRooms',
  '_invPrintThumb', '_invThumbFor', '_invThumbCache', '_invThumbKey', '_invProgressStamp',
  'agentShotGroups', 'agentNameableRefs', '_agState', '_agStateHtml', '_agNoticesHtml', 'agentNotices',
  '_invReviewStats', '_invDocHead', 'invAppraiserFor', '_renderInvWorkbar', '_invProgressBar',
  '_agrProbateCompliance', '_agrComplianceHeading', '_agrComplianceLead', '_agrApprover',
  '_agrTrustDeliverable', '_agrScopeServices', '_invFileId', '_invNeedsValue', 'invWorkFlags', '_invMissingThumbIds',
];
const VARS = [
  '_agRun', 'AGENT_NOTICE_KINDS', 
  'INV_CONTRACT_DOCS', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'DECEDENT_SERVICES',
  'MATTER_TYPES', 'INV_ASSET_TRACKS', 'INV_TAXONOMY', 'INV_APPRAISAL_THRESHOLD',
  'EXEMPT_CAP_732_402', 'AGR_NOT_AN_ACCOUNTING', 'INV_CATEGORIES', '_invShowRoll', 'INV_GROUP_ORDER', 'INV_CAT_GLYPH', 'INV_UNDECIDED', 'INV_DISPOSITIONS', 'INV_DEFAULT_CATEGORY',
];

const ESTATE = {
  id: 7, hvlId: 'HVL-0007', name: 'Tripp Butler', svc: 'cleanout', gate706: 'no',
  docTier: 'values', deathDate: '2026-08-14', addr: '69 Beach Blvd', city: 'Palm Beach',
};
const IT = (id, o) => Object.assign({
  stableId: id, label: 'inventory', objectName: 'Item ' + id, category: 'Furniture',
  condition: 'Good', qty: '1', ts: Number(String(id).replace(/\D/g, '')) || 1,
}, o || {});

function rig(job, items) {
  const printed = [];
  const c = sandbox({
    fns: FNS, vars: VARS,
    stubs: { document: domStub({}), jobs: [job], _photoRefs: { 7: items || [] },
             _printDocument: (html, title) => printed.push({ html: html, title: title }) },
  });
  c.alert = (m) => { c.__alert = m; };
  return { c: c, printed: printed, last: () => printed[printed.length - 1] || { html: '', title: '' } };
}
const txt = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
const J = (o) => Object.assign({}, ESTATE, o || {});

module.exports = ({ group, ok, eq, has, lacks }) => {
  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE DEAD END, MEASURED IN BOTH DIRECTIONS AND CLOSED');
  {
    const FURNITURE = () => [
      IT('i1', { objectName: 'Chesterfield sofa', fmv: '4000' }),
      IT('i2', { objectName: 'Dining suite', fmv: '9000' }),
      IT('i3', { objectName: 'Bedroom set', fmv: '6000' }),
    ];
    // ── The common case: a trust matter where nobody has touched the Asset Track. THIS is the
    //    case the whole step exists for — it is what every job looks like on day one.
    const untouched = rig(J({ matterType: 'trust' }), FURNITURE());
    untouched.c.printTrustSchedule(7);
    const t = untouched.last().html;
    ok(t.indexOf('#357a50') > 0, 'the trustee’s schedule is FINAL on a trust matter with nothing tracked by hand');
    has(t, 'Successor Trustee', 'and offers a signature block');
    has(t, '$19,000', 'and carries the property — it used to be reported nowhere at all');

    const court = rig(J({ matterType: 'trust' }), FURNITURE());
    court.c.printCourtInventory(7);
    ok(court.last().html.indexOf('#357a50') < 0, 'and the probate schedule correctly refuses on the same job');
    lacks(court.last().html, 'Reviewed and adopted by', 'with no adoption block on it');

    // ── The converse. A probate matter must not move an inch: this is every job papered before
    //    the matter-type field existed, and every real probate matter after it.
    const pro = rig(J({ matterType: 'probate' }), FURNITURE());
    pro.c.printCourtInventory(7);
    ok(pro.last().html.indexOf('#357a50') > 0, 'a probate matter still finalises its court schedule');
    has(pro.last().html, '$19,000', 'with the property on it');
    has(pro.last().html, 'Reviewed and adopted by', 'and an adoption block');

    const proTrust = rig(J({ matterType: 'probate' }), FURNITURE());
    proTrust.c.printTrustSchedule(7);
    ok(proTrust.last().html.indexOf('#357a50') < 0, 'and the trustee’s schedule refuses there instead');
    has(proTrust.last().html, 'has no trust in it', 'naming what the estate is, on its own face');

    // ⚠ AN UNANSWERED MATTER BEHAVES EXACTLY AS IT DID YESTERDAY, byte for byte. Every job
    //   created before 2026-09-21 carries none.
    const legacy = rig(J({}), FURNITURE());
    legacy.c.printCourtInventory(7);
    eq(legacy.last().html, pro.last().html,
       'an unanswered matter renders the court schedule identically to an explicit probate answer');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE TRACK DEFAULT FOLLOWS THE MATTER TYPE — and only an explicit `trust` moves it');
  {
    const { c } = rig(J({}), []);
    // ⚠ `both` IS A POUR-OVER WILL, whose whole function is that anything NOT already titled
    //   into the trust pours in THROUGH probate. So an untracked item there is probate property
    //   until somebody says otherwise — conservative, and true.
    eq(c._invTrackDefault(J({ matterType: 'trust' })),   'Trust',   'trust: an untracked item is the trust’s');
    eq(c._invTrackDefault(J({ matterType: 'both' })),    'Probate', 'both: it pours in through probate until somebody says otherwise');
    eq(c._invTrackDefault(J({ matterType: 'probate' })), 'Probate', 'probate: unchanged');
    eq(c._invTrackDefault(J({ matterType: 'neither' })), 'Probate', 'neither: unchanged — there is no court to mislead and nothing to gain');
    eq(c._invTrackDefault(J({})),                        'Probate', 'unanswered: unchanged, so no existing job acquires a claim nobody made');
    eq(c._invTrackDefault(undefined),                    'Probate', 'and no job at all still answers');
    // A recorded answer always wins over the default, in both directions.
    eq(c._invTrack({ assetTrack: 'Probate' }, J({ matterType: 'trust' })), 'Probate',
       'a hand-set Probate track survives on a trust matter');
    eq(c._invTrack({ assetTrack: 'Trust' }, J({ matterType: 'probate' })), 'Trust',
       'and a hand-set Trust track survives on a probate one');

    // ⚠⚠ IT READS THE CATALOGUE RATHER THAN TESTING THE KEY — the rule `invProbateRows` already
    //    follows, and the reason `both` is right by construction instead of by somebody
    //    remembering it.
    const body = fn('_invTrackDefault');
    lacks(body, "'trust'", 'the default does not compare the matter type to a quoted key');
    has(body, 'matterDef', 'it asks the resolver');
    has(body, '.trust', 'and reads the catalogue flags');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE JOB IS AN ARGUMENT, AND `ref.jobId` IS NOT AVAILABLE ALTHOUGH IT LOOKS LIKE IT IS');
  {
    // The obvious implementation resolves the job off the ref. It would pass every test whose
    // fixture sets `jobId` by hand and answer 'Probate' on every real reload — `jobId` is NOT on
    // the `savePhotoRefs` whitelist, so it is dropped on every save.
    const src = String(source());
    const wl = src.slice(src.indexOf('function savePhotoRefs('));
    const map = wl.slice(0, wl.indexOf('json = JSON.stringify'));
    lacks(map, 'jobId:r.jobId', 'jobId is not persisted on a ref, so it cannot resolve the job');
    lacks(fn('_invTrack'), 'jobId', 'and _invTrack does not reach for one');

    // ⚠ A CALL SITE THAT OMITS THE JOB SILENTLY GETS THE PROBATE DEFAULT ON A TRUST MATTER —
    //   the `invNeedsAppraisal` trap exactly, which this project already paid for once. The net
    //   is the rule rather than today's list of callers.
    const live = src.split('\n')
      .filter((l) => { const s = l.trim(); return !(s.startsWith('//') || s.startsWith('*') || s.startsWith('/*')); })
      .join('\n');
    ok(live.length > src.length * 0.5, 'the comment stripper did not eat the file');
    has(live, 'function _invTrack(ref, job)', 'the function under test is still in the stripped source');
    [/_invTrack\((\w+)\)/g, /_invIsExempt\((\w+)\)/g, /_invIsProbateAsset\((\w+)\)/g,
     /_invOnProbateSchedule\((\w+)\)/g, /_invOnTrustSchedule\((\w+)\)/g,
     /_invExcludedTracks\((\w+)\)/g].forEach((re) => {
      const hits = (live.match(re) || []).filter((h) => !/^function /.test(h));
      eq(hits.length, 0, 'no single-argument call survives: ' + String(re) + ' ' + JSON.stringify(hits));
    });
    // ⚠ AND THE ON-SCREEN DROPDOWN HELD A SECOND COPY OF THE DEFAULT (`v || 'Probate'`), so the
    //   one control that answers "which schedule is this on" would have read Probate while every
    //   document read the same row as Trust.
    lacks(live, "(v || 'Probate') === x", 'the Asset Track cell keeps no private copy of the default');
    has(live, "_invTrack(ref, job) === x", 'it asks the one definition, like everything else');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE CARVE-OUT IS REVERSED, AND IT IS ONE TRACK RATHER THAN THE NEGATION OF THE OTHER');
  {
    const { c } = rig(J({}), []);
    const j = J({ matterType: 'trust' });
    eq(c._invOnTrustSchedule({ assetTrack: 'Trust' }, j), true, 'trust property is what is listed');
    // Non-probate passes by beneficiary designation or joint tenancy — straight to the named
    // beneficiary, never to the trustee. Homestead passes to the heirs outside both.
    [['Probate', 'the estate’s'], ['Exempt', 'a claim against the probate estate'],
     ['Non-probate', 'the named beneficiary’s'], ['Homestead', 'the heirs’']].forEach(([track, why]) => {
      eq(c._invOnTrustSchedule({ assetTrack: track }, j), false, track + ' is not the trust’s — it is ' + why);
    });
    lacks(fn('_invOnTrustSchedule'), '!_invOnProbateSchedule', 'and it is not written as the negation of the probate test');

    // ⚠⚠ THE TWO SCHEDULES ARE NOT COMPLEMENTARY, and the document says so rather than letting a
    //    reader take one as covering the rest.
    const r = rig(J({ matterType: 'trust' }), [
      IT('i1', { objectName: 'Trust sofa', fmv: '4000', assetTrack: 'Trust' }),
      IT('i2', { objectName: 'Joint account chattel', fmv: '2000', assetTrack: 'Non-probate' }),
      IT('i3', { objectName: 'Homestead contents', fmv: '1000', assetTrack: 'Homestead' }),
    ]);
    r.c.printTrustSchedule(7);
    const t = txt(r.last().html);
    has(t, '$4,000', 'only the trust line is totalled');
    lacks(t, '$7,000', 'the other two are not swept in');
    has(t, '2 items tagged Homestead / Non-probate are excluded', 'and the excluded pots are named from the rows');
    has(t, 'passes outside both and is reported on neither',
        'with the honest statement that neither schedule covers them');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ IT SUPPORTS THE TRUSTEE’S ACCOUNTING AND IS NOT ONE — the line that keeps Havellin out of fiduciary accounting work');
  {
    const r = rig(J({ matterType: 'trust' }), [IT('i1', { fmv: '4000', assetTrack: 'Trust' })]);
    r.c.printTrustSchedule(7);
    const t = txt(r.last().html);
    has(t, 'It is not itself one', 'the document says outright that it is not an accounting');
    // ⚠ IT NAMES WHAT A §736.08135 ACCOUNTING CONTAINS THAT THIS DOES NOT. A bare disclaimer is
    //   a sentence somebody skims; a list is something a reader can check, and it is the same
    //   "state the gap" rule the Court Inventory follows on an unvalued line.
    ['no receipts or disbursements', 'no gains or losses on sale',
     'no identification of beneficiaries'].forEach((x) => has(t, x, 'and names the gap: ' + x));
    has(t, 'does not act as trustee, co-trustee or fiduciary', 'and disclaims the role itself');
    has(t, '736.08135', 'citing the accounting statute');
    has(t, '736.0813', 'and the duty to inform and account, which stays the trustee’s');
    has(t, 'chapter 736', 'with the chapter named on the face of the document');
    // ⚠ THE CARRYING-VALUE FRAMING IS WHY THE NUMBER IS THE SAME AS THE PROBATE ONE. Do not add
    //   a trust valuation date — see MATTER_TYPES.
    has(t, 'carrying value', 'and states why date-of-death FMV is the right figure for a trust');
    lacks(fn('printTrustSchedule'), 'trustValDate', 'the schedule invents no second valuation date');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ RECEIVED, NOT ADOPTED — who signs, and what they are signing');
  {
    const r = rig(J({ matterType: 'trust' }), [IT('i1', { fmv: '4000', assetTrack: 'Trust' })]);
    r.c.printTrustSchedule(7);
    const h = r.last().html;
    // A personal representative ADOPTS the probate schedule into a court filing; a successor
    // trustee files nothing — they take this into the trust's records and carry its figures into
    // the accounting. Naming the act wrongly on a signature line is the same class of claim the
    // $0 FINAL was.
    has(h, 'Received for the trust', 'the trustee receives it for the trust’s records');
    has(h, 'Successor Trustee', 'and signs in that capacity');
    lacks(h, 'Reviewed and adopted by', 'it is never adopted');
    lacks(h, 'Personal Representative', 'and no personal representative appears on it');
    lacks(h, '733.604', 'nor the probate inventory statute');
    lacks(h, '732.402', 'nor the probate exempt-property allowance, which is a claim against an estate');
    eq(r.last().title.indexOf('Trust Schedule') > 0, true, 'and the PDF is named for what it is: ' + r.last().title);
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE SAME DRAFT DISCIPLINE AS THE PROBATE SCHEDULE, AND EACH REASON CARRIES ITS OWN FIX');
  {
    const slice = (h) => { const i = h.indexOf('This schedule is not ready to be accepted'); return i < 0 ? '' : h.slice(i, i + 900); };

    // Nothing on the schedule at all — and the fix is the Asset Track, not valuing anything.
    const empty = rig(J({ matterType: 'trust' }), [IT('i1', { fmv: '4000', assetTrack: 'Probate' })]);
    empty.c.printTrustSchedule(7);
    has(empty.last().html, 'no recorded item is on the trust schedule', 'an empty schedule is never FINAL');
    has(slice(empty.last().html), 'set the Asset Track to Trust', 'and the fix is the track, not the valuation');
    lacks(empty.last().html, 'Received for the trust', 'with the signature block withheld');

    // Nothing recorded at all is a DIFFERENT fact, because the fix differs.
    const none = rig(J({ matterType: 'trust' }), []);
    none.c.printTrustSchedule(7);
    has(none.last().html, 'nothing is recorded on this estate yet', 'an empty inventory says which of the two empties it is');

    // An unvalued line makes the total a FLOOR and says so, naming the lines.
    const part = rig(J({ matterType: 'trust' }), [
      IT('i1', { objectName: 'Valued sofa', fmv: '4000', assetTrack: 'Trust' }),
      IT('i2', { objectName: 'Unpriced credenza', assetTrack: 'Trust' }),
    ]);
    part.c.printTrustSchedule(7);
    const p = txt(part.last().html);
    has(p, 'not yet valued', 'an unvalued line draws a DRAFT');
    has(p, 'not a complete total', 'and the total is labelled a floor');
    has(p, 'Unpriced credenza', 'with the line named rather than merely counted');
    has(slice(part.last().html), 'a final copy is issued once the outstanding items are valued', 'and that fix follows that reason');

    // ⚠ WHO FINISHES AN APPRAISAL DEPENDS ON THE CONTRACT, exactly as it does on the probate
    //   schedule: at `appraisals` Havellin engages the specialist, at `values` the agreement
    //   puts it with the trustee's counsel. Needs Strict Mode AND a guardrail item to fire.
    const guarded = (tier) => {
      const r = rig(J({ matterType: 'trust', docTier: tier, gate706: 'yes' }),
        [IT('i1', { objectName: 'Sargent portrait', category: 'Art & Décor', fmv: '48000', assetTrack: 'Trust' })]);
      r.c.printTrustSchedule(7);
      return slice(r.last().html);
    };
    has(guarded('appraisals'), 'Havellin engages the specialist', 'at the top tier the appraisal is ours');
    has(guarded('values'), 'the trustee or their counsel arranges the appraisal',
        'and at `values` it is the trustee’s — never "the estate attorney", who is not on this matter');

    // The wrong-instrument reason promises no final copy, because none is coming.
    const wrong = rig(J({ matterType: 'neither' }), [IT('i1', { fmv: '4000', assetTrack: 'Trust' })]);
    wrong.c.printTrustSchedule(7);
    has(slice(wrong.last().html), 'no final copy of THIS schedule will follow',
        'a matter with no trust in it is told no final copy is coming');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ A POUR-OVER WILL IS GENUINELY BOTH, AND GETS BOTH');
  {
    const items = () => [
      IT('i1', { objectName: 'Probate sofa', fmv: '4000', assetTrack: 'Probate' }),
      IT('i2', { objectName: 'Trust rug', fmv: '9000', assetTrack: 'Trust' }),
    ];
    const tr = rig(J({ matterType: 'both' }), items());
    tr.c.printTrustSchedule(7);
    ok(tr.last().html.indexOf('#357a50') > 0, 'the trustee’s schedule finalises on a pour-over matter');
    has(txt(tr.last().html), '$9,000', 'carrying the trust half');
    has(txt(tr.last().html), 'belongs on the estate', 'and pointing at the other schedule for the rest');

    const ct = rig(J({ matterType: 'both' }), items());
    ct.c.printCourtInventory(7);
    ok(ct.last().html.indexOf('#357a50') > 0, 'and the court schedule finalises too');
    has(txt(ct.last().html), '$4,000', 'carrying the probate half');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ AN UNRECORDED MATTER TYPE IS NAMED RATHER THAN GUESSED, AND DOES NOT MAKE IT A DRAFT');
  {
    // Somebody tracking an item Trust has already answered the question about the PROPERTY,
    // which is what this schedule lists. The blank is a gap in the job record, so the note says
    // where to close it rather than withholding a document that is correct on its face.
    const r = rig(J({}), [IT('i1', { fmv: '4000', assetTrack: 'Trust' })]);
    r.c.printTrustSchedule(7);
    ok(r.last().html.indexOf('#357a50') > 0, 'it still finalises');
    has(txt(r.last().html), 'No matter type is recorded on this job', 'and names the gap');
    has(txt(r.last().html), 'Answer it on Edit Client', 'with where to close it');
    const answered = rig(J({ matterType: 'trust' }), [IT('i1', { fmv: '4000', assetTrack: 'Trust' })]);
    answered.c.printTrustSchedule(7);
    lacks(txt(answered.last().html), 'No matter type is recorded', 'and an answered matter says nothing about it');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE CONTRACT GATES IT FOR THE SAME REASON IT GATES THE OTHER TWO VALUED SCHEDULES');
  {
    const at = (tier) => {
      const r = rig(J({ matterType: 'trust', docTier: tier }), [IT('i1', { fmv: '4000', assetTrack: 'Trust' })]);
      r.c.printTrustSchedule(7);
      return { printed: !!r.printed.length, alert: r.c.__alert || '' };
    };
    // A carrying value IS a value, and stating one is exactly what a capture engagement
    // contracts NOT to do. What differs between the probate and trust variants is the
    // instrument, never whether valuation is ours — which is why this needed no new axis.
    eq(at('contents').printed, false, 'a contents engagement cannot issue a carrying value');
    has(at('contents').alert, 'the schedule of trust property and the accounting it supports are the trustee',
        'and the refusal names whose it is instead');
    eq(at('none').printed, false, 'nor can a None engagement');
    eq(at('values').printed, true, 'a values engagement can');
    eq(at('appraisals').printed, true, 'and so can the top tier');
    // ⚠ THE GATE IS READ BY THE STRIP AND BY THE PRINTER, so the document cannot be reached
    //   around the withheld button — docAction's rule.
    const strip = (tier) => rig(J({ matterType: 'trust', docTier: tier }), [IT('i1', { fmv: '4000', assetTrack: 'Trust' })])
      .c._renderInvWorkbar(J({ matterType: 'trust', docTier: tier }), []);
    has(strip('values'), 'printTrustSchedule(7)', 'the button is offered where the document is ours');
    lacks(strip('contents'), 'printTrustSchedule(7)', 'and withheld where it is not');
    has(strip('contents'), 'the Trust Schedule are withheld for that reason',
        'with the strip explaining the absence rather than leaving it to be guessed at');
    // ⚠⚠ AND THE MATTER AXIS IS DELIBERATELY NOT GATED — step 6's rule, unchanged. Each
    //    instrument refuses on its own FACE, which answers the question a withheld button would
    //    leave hanging: "where is the trustee's schedule?"
    has(strip('values'), 'printCourtInventory(7)', 'both instruments are offered on a trust matter');
    const probateStrip = rig(J({ matterType: 'probate' }), []).c._renderInvWorkbar(J({ matterType: 'probate' }), []);
    has(probateStrip, 'printTrustSchedule(7)', 'and both on a probate one');
    // A living job gets neither: `fid` already withholds the estate set there.
    const living = J({ svc: 'downsizing', matterType: 'trust' });
    lacks(rig(living, []).c._renderInvWorkbar(living, []), 'printTrustSchedule(', 'a living job is offered no trust schedule');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ ONE TABLE, TWO SCHEDULES — extracted rather than copied');
  {
    const src = String(source());
    eq((src.match(/function _invScheduleSection\(/g) || []).length, 1, 'there is one renderer');
    ['printCourtInventory', 'printTrustSchedule'].forEach((n) => {
      has(fn(n), '_invScheduleSection', n + ' asks it rather than keeping a copy');
    });
    // A second renderer beside this one is the drift this project records more often than
    // anything else: the two schedules state the same thing about the same objects and must not
    // come to disagree about whether a quantity is a lot or a unit price.
    eq((src.match(/items, valued as a lot/g) || []).length, 1, 'and exactly one place says the value covers the lot');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE ESTATE INVENTORY REPORT’S CARVE-OUT STANDS DOWN WHERE THERE IS NO PROBATE ESTATE');
  {
    // Its own reason says the section exists so a reader can see property "sits outside the
    // probate estate". On a trust matter there is none to sit outside of — and once the track
    // default follows the matter type EVERY line lands there, under a heading naming three pots
    // the property is not in, above an empty Asset Schedule.
    const items = () => [IT('i1', { objectName: 'Chesterfield sofa', fmv: '4000', valSource: 'Comparable' })];
    const tr = rig(J({ matterType: 'trust' }), items());
    tr.c.printEstateInventoryReport(7);
    const t = txt(tr.last().html);
    has(t, 'Chesterfield sofa', 'the property is on the report');
    lacks(t, 'carved out of the probate estate', 'and nothing is carved out of an estate that does not exist');

    // The converse: a probate matter still carves, and the heading now names what is in it.
    const pro = rig(J({ matterType: 'probate' }), [
      IT('i1', { objectName: 'Main sofa', fmv: '4000', valSource: 'Comparable' }),
      IT('i2', { objectName: 'Homestead chair', fmv: '500', valSource: 'Comparable', assetTrack: 'Homestead' }),
    ]);
    pro.c.printEstateInventoryReport(7);
    const p = txt(pro.last().html);
    has(p, 'carved out of the probate estate', 'a probate matter still carves');
    has(p, 'Homestead Property', 'and the heading names the pot actually in it');
    lacks(p, 'Homestead, Exempt', 'rather than reciting three pots over whatever is there');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ D10 — THE AGREEMENT ASSERTED A PROBATE PROCEEDING ON EVERY ESTATE IT EVER PAPERED');
  {
    const { c } = rig(J({}), []);
    const mj = (m) => ({ svc: 'cleanout', matterType: m });
    const comp = (sc, m) => c._agrProbateCompliance(sc, mj(m)).join(' | ');

    // ⚠ THE PROBATE ARM IS BYTE-IDENTICAL TO AN UNANSWERED MATTER, which is what protects every
    //   agreement papered before the field existed. Stripping a §733.604 promise off a real
    //   probate matter on the strength of a question nobody was asked is the bad failure.
    ['full', 'capture', 'none'].forEach((sc) => {
      eq(c._agrProbateCompliance(sc, mj('probate')).join('\u0000'),
         c._agrProbateCompliance(sc, undefined).join('\u0000'),
         sc + ': an explicit probate answer reads exactly as no answer at all');
    });
    eq(c._agrComplianceHeading(mj('probate')), c._agrComplianceHeading(undefined), 'and so does the heading');
    has(c._agrComplianceHeading(undefined), 'Florida Probate Compliance', 'which is the wording it has always had');

    // ── The defect. A trust matter signed a contract promising a §733.604 inventory and
    //    appraisals "within the 60-day inventory deadline from Letters of Administration
    //    issuance". There are no Letters on a trust administration and no 60-day deadline.
    lacks(comp('full', 'trust'), '733.604', 'a trust matter is promised no §733.604 inventory');
    lacks(comp('full', 'trust'), 'Letters of Administration', 'and no 60-day Letters deadline');
    lacks(comp('full', 'trust'), '733.613', 'and no probate court-approval clause');
    lacks(comp('full', 'trust'), 'Personal Representative', 'and no personal representative anywhere in it');
    has(comp('full', 'trust'), 'held by the trust', 'it is promised a schedule of trust property');
    has(comp('full', 'trust'), 'carrying value', 'stated at the carrying value the accounting opens with');
    has(c._agrComplianceHeading(mj('trust')), 'Trust Administration', 'under a heading that names the instrument');
    has(c._agrComplianceLead(mj('trust')), 'successor trustee', 'and a lead that names who we support');

    // ⚠⚠ THE BOUNDARY IS IN THE CONTRACT, NOT ONLY ON THE DOCUMENT. The engagement is what a
    //    trustee's counsel reads when they ask what Havellin was retained to do.
    has(comp('full', 'trust'), 'does not prepare trust accountings', 'the contract disclaims accounting work');
    has(comp('full', 'trust'), '736.08135', 'citing what it supports');
    has(comp('full', 'trust'), '736.0813', 'and whose duty the accounting remains');
    has(comp('none', 'trust'), 'does not prepare trust accountings', 'at every tier — it is not a deliverable claim');
    has(comp('capture', 'trust'), 'does not prepare trust accountings', 'nor at capture');

    // ── `both` is an ADDITION, not an alternative: a pour-over will really does have both.
    has(comp('full', 'both'), '733.604', 'a pour-over matter keeps the probate inventory clause');
    has(comp('full', 'both'), 'does not prepare trust accountings', 'and gains the trust boundary beside it');
    has(comp('full', 'both'), 'scheduled separately for the successor trustee', 'naming where the trust half goes');
    has(c._agrComplianceHeading(mj('both')), 'Probate', 'with a heading naming both');
    has(c._agrComplianceHeading(mj('both')), 'Trust', 'sides of it');

    // ── `neither`: no court, no trust, and the section KEEPS ITS NUMBER. Removing a numbered
    //    subsection renumbers everything under it against agreements already issued.
    lacks(comp('full', 'neither'), '733.604', 'a family distribution is promised no statutory inventory');
    lacks(comp('full', 'neither'), 'trust accountings', 'and no trust boundary it has no use for');
    has(comp('full', 'neither'), 'no statutory inventory is required', 'it says so plainly instead');
    ['probate', 'trust', 'both', 'neither', undefined].forEach((m) => {
      has(c._agrComplianceHeading(mj(m)), '5.2 ', 'the subsection keeps its number on ' + (m || 'an unanswered matter'));
      has(c._agrProbateCompliance('full', mj(m)).join(' | '), 'retained for a minimum of 7 years',
          'and its retention clause: ' + (m || 'unanswered'));
    });

    // ── The approver noun, one definition, read everywhere the contract names that person.
    eq(c._agrApprover(mj('probate')), 'Personal Representative', 'probate: the PR approves');
    eq(c._agrApprover(mj('trust')), 'successor trustee', 'trust: the trustee does');
    eq(c._agrApprover(mj('both')), 'Personal Representative or successor trustee', 'both: either may');
    eq(c._agrApprover(mj('neither')), 'Client', 'neither: the client does');
    eq(c._agrApprover(undefined), 'Personal Representative', 'and an unanswered matter is unchanged');
    has(c._agrScopeServices('full', mj('trust')), 'authorized by the successor trustee',
        'the scope paragraph names the trustee too');
    eq(c._agrScopeServices('full', mj('probate')), c._agrScopeServices('full', undefined),
       'and is byte-identical on probate and an unanswered matter');
  }
};
