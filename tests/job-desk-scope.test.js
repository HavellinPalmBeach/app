'use strict';
// THE DESK CHECKLIST KEYS ON THE CONTRACT, NOT ON WHAT WAS SOLD (2026-09-21).
//
// Step 4 of ESTATE_SCOPE_SPEC.md, closing D2's job-plan half and D6. `planTaskCtx` exposed
// thirteen SERVICE questions and nothing about what Havellin was contracted to hand over or
// which instrument the estate feeds, so the whole §733.604 compliance list keyed on
// `isProbate`. Measured on the real catalogue before anything changed, and it failed in both
// directions at once:
//
//   Estate Settlement      5 desk boxes, NO compliance list, at every tier and every matter
//   Probate / Contested   12 desk boxes, the full list, at every tier and every matter
//   tier × matter          identical across all twenty combinations on all seven services
//
// So a probate estate contracted at `None` — counsel does the whole inventory — was still told
// to verify date-of-death FMV and attach appraisals its own agreement says are counsel's; and
// an Estate Settlement administering a probate estate at the top tier got no checklist at all.

const { sandbox, source, fn, decl } = require('./harness');

const CTX_FNS = ['planTaskCtx', 'planTasksFor', 'invFiduciaryMode', 'isDecedentJob',
                 'firearmsFlaggedAtIntake', 'houseFlagsOf', 'matterTypeOf', 'matterDef',
                 'docTierOf', 'docTierDef', 'docTierProduces', 'docTierScope', 'docTierScopeMirror', 'svcHasDocStep'];
const CTX_VARS = ['PLAN_TASKS', 'JOB_ADMIN_TASKS', 'DECEDENT_SERVICES', 'MATTER_TYPES',
                  'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'HOUSE_FLAGS',
                  'FIREARMS_PROTOCOL_DOC'];

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const c = sandbox({ fns: CTX_FNS, vars: CTX_VARS, stubs: { isFormalDoc: () => false } });

  const ctx = (job) => c.planTaskCtx(job, { svc: job.svc });
  const admin = (job) => c.planTasksFor(c.JOB_ADMIN_TASKS, null, ctx(job)).map((t) => t.key);
  const compliance = (job) => admin(job).filter((k) => k.indexOf('ct_') === 0).map((k) => k.slice(3));
  const plan = (job) => c.planTasksFor(c.PLAN_TASKS, null, ctx(job)).map((t) => t.key);

  // ═══════════════════════════════════════════════════════════════════════════
  group('the catalogue says what each tier HANDS OVER, beside what it prices');
  {
    const want = {
      contents:   { inventory: true,  values: false, appraisals: false },
      values:     { inventory: true,  values: true,  appraisals: false },
      appraisals: { inventory: true,  values: true,  appraisals: true  },
      none:       { inventory: false, values: false, appraisals: false }
    };
    c.DOC_TIERS.forEach((t) => {
      ok(t.produces && typeof t.produces === 'object', t.key + ' carries a produces block');
      ['inventory', 'values', 'appraisals'].forEach((k) => {
        eq(t.produces[k], want[t.key][k], t.key + ' → ' + k + ' = ' + want[t.key][k]);
      });
    });
    // ⚠⚠ `produces` IS ON THE CATALOGUE, NOT DERIVED FROM `scope`, AND THAT IS THE WHOLE POINT
    // OF THE TIER. `scope` is the pricing projection — how much of the work do we do — and this
    // answers what the client gets. The two top tiers PROVE they cannot be derived from each
    // other: identical scope, different deliverable.
    eq(c.docTierDef('values').scope, c.docTierDef('appraisals').scope, 'the top two price identically');
    ok(c.docTierDef('values').produces.appraisals !== c.docTierDef('appraisals').produces.appraisals,
       '⚠ and hand over different things — so the deliverable cannot be read off the price');
    lacks(fn('docTierProduces'), '.scope', 'the deliverable question never consults the pricing projection');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('docTierProduces — the fallback is the migration map, not a second literal');
  {
    const P = (tier, what) => c.docTierProduces({ svc: 'probate', docTier: tier }, what);
    eq(P('contents', 'inventory'), true,  'a contents list is still an inventory we produce');
    eq(P('contents', 'values'), false,    'and states no values');
    eq(P('values', 'values'), true,       'the valued tier states values');
    eq(P('values', 'appraisals'), false,  'and does not coordinate appraisals');
    eq(P('appraisals', 'appraisals'), true, 'the top tier does');
    eq(P('none', 'inventory'), false,     'None produces nothing at all');

    // ⚠ AN UNANSWERED TIER READS AS `values` — the same map the migration uses — so every job
    // recorded before the tier existed behaves exactly as it did yesterday rather than silently
    // losing a check. Stated as the map rather than as the word, so the two cannot drift.
    const legacy = { svc: 'probate' };
    eq(c.docTierOf(legacy), '', 'a job with neither a tier nor a scope resolves to nothing');
    eq(c.docTierProduces(legacy, 'values'), c.docTierDef(c.DOC_TIER_FROM_SCOPE.full).produces.values,
       'and reads as whatever `full` migrates to');
    eq(c.docTierProduces(legacy, 'values'), true, 'which is values — it still states them');
    eq(c.docTierProduces(legacy, 'appraisals'), false, 'and not appraisals, exactly as the migration refuses to');
    eq(c.docTierProduces({ svc: 'probate', docScope: 'capture' }, 'values'), false,
       'a job carrying only the old scope is read through it');

    // ⚠ A SERVICE THAT PRICES NO DOCUMENTATION STEP PRODUCES NOTHING, or the fallback above
    // would quietly claim a downsizing hands over a valued inventory.
    ['downsizing', 'downsizing_move', 'home_cleanout', 'prep'].forEach((svc) => {
      eq(c.docTierProduces({ svc: svc }, 'values'), false, svc + ' produces no inventory');
      eq(c.docTierProduces({ svc: svc, docTier: 'appraisals' }, 'appraisals'), false,
         svc + ' produces none even with a tier written onto it');
    });
    eq(c.docTierProduces(null, 'values'), false, 'and neither does no job at all');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('planTaskCtx carries both contract axes, so a `when` predicate can ask');
  {
    const k = Object.keys(ctx({ svc: 'probate' }));
    ['tier', 'weInventory', 'weValue', 'weAppraise', 'matter', 'probateTrack', 'trustTrack', 'hasAppraisers']
      .forEach((f) => ok(k.indexOf(f) >= 0, 'ctx exposes ' + f));
    // The service questions are untouched — they are correct AS service questions.
    ['svc', 'isMM', 'isDownsizing', 'isCleanout', 'isEstate', 'isProbate', 'isDocJob',
     'isDisposal', 'fid', 'hasItemRecord', 'hasPlaybook', 'formal', 'hasCOC', 'firearms', 're']
      .forEach((f) => ok(k.indexOf(f) >= 0, 'and still exposes ' + f));

    // ⚠⚠ THE ASYMMETRY IS THE LOAD-BEARING PART. A recorded matter decides. An UNANSWERED one
    // on a probate service still means a court case was open at intake, so the checklist every
    // existing probate job has today survives; nothing in a service name says trust, so there
    // is no honest fallback in that direction.
    eq(ctx({ svc: 'probate' }).probateTrack, true, 'unanswered on a probate service falls back to the service');
    eq(ctx({ svc: 'probate' }).trustTrack, false, 'and never falls back to trust');
    eq(ctx({ svc: 'cleanout' }).probateTrack, false, 'unanswered on an Estate Settlement claims nothing');
    eq(ctx({ svc: 'probate', matterType: 'trust' }).probateTrack, false, 'a recorded trust matter overrides the service');
    eq(ctx({ svc: 'probate', matterType: 'trust' }).trustTrack, true, 'and is on the trust track');
    eq(ctx({ svc: 'cleanout', matterType: 'probate' }).probateTrack, true, 'a recorded probate matter reaches an Estate Settlement');
    eq(ctx({ svc: 'cleanout', matterType: 'both' }).probateTrack, true, '`both` is on the probate track');
    eq(ctx({ svc: 'cleanout', matterType: 'both' }).trustTrack, true, 'and the trust one — it is genuinely both');
    eq(ctx({ svc: 'cleanout', matterType: 'neither' }).probateTrack, false, '`neither` is on neither');
    eq(ctx({ svc: 'cleanout', matterType: 'neither' }).trustTrack, false, 'in both directions');
    // A living service has no matter type at all, so it can never fall onto a track.
    ['downsizing', 'downsizing_move', 'home_cleanout', 'prep'].forEach((svc) => {
      eq(ctx({ svc: svc, matterType: 'probate' }).probateTrack, false,
         svc + ' stays off the probate track even with a stale matter written onto it');
    });
    eq(ctx({ svc: 'probate', appraisers: [{ id: 1 }] }).hasAppraisers, true, 'an appraiser on the record is visible to a predicate');
    eq(ctx({ svc: 'probate', appraisers: [] }).hasAppraisers, false, 'an empty roster is not');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('⚠⚠ THE COMPLIANCE LIST — the two defects D6 names, driven both ways');
  {
    // (a) THE UNDER-FIRE. An Estate Settlement administering a probate estate got nothing.
    eq(compliance({ svc: 'cleanout', docTier: 'values' }).length, 0,
       'an Estate Settlement with no matter recorded claims no court administration');
    eq(compliance({ svc: 'cleanout', matterType: 'probate', docTier: 'values' }).join(' '),
       'inventory nonprobate served filed accounting pr_signoff',
       '⚠ and gets the whole list the moment the matter says probate — it used to get NONE');
    eq(compliance({ svc: 'cleanout', matterType: 'both', docTier: 'appraisals' }).join(' '),
       'inventory appraisals nonprobate served filed accounting pr_signoff',
       'a pour-over will at the top tier gets all seven');

    // (b) THE OVER-FIRE. A probate estate contracted at None was told to do counsel's work.
    eq(compliance({ svc: 'probate', matterType: 'probate', docTier: 'none' }).join(' '),
       'served filed accounting pr_signoff',
       '⚠ contracted at None, the two deliverable checks and the carve-out are gone');
    eq(compliance({ svc: 'probate', matterType: 'probate', docTier: 'contents' }).join(' '),
       'nonprobate served filed accounting pr_signoff',
       'on a contents list we state no values, so nothing asks us to verify one');
    eq(compliance({ svc: 'probate', matterType: 'probate', docTier: 'values' }).join(' '),
       'inventory nonprobate served filed accounting pr_signoff',
       'the valued tier verifies the FMV and still does not attach reports it was not engaged for');
    eq(compliance({ svc: 'probate', matterType: 'probate', docTier: 'appraisals' }).join(' '),
       'inventory appraisals nonprobate served filed accounting pr_signoff',
       'and the top tier attaches them');

    // ⚠ THE PROCEDURAL FOUR NEVER MOVE WITH THE TIER. Serving, filing, the accounting and the
    // PR's sign-off happen on a probate matter whoever built the schedule.
    ['contents', 'values', 'appraisals', 'none'].forEach((t) => {
      const got = compliance({ svc: 'probate', matterType: 'probate', docTier: t });
      ['served', 'filed', 'accounting', 'pr_signoff'].forEach((k) => {
        ok(got.indexOf(k) >= 0, 'ct_' + k + ' survives tier ' + t);
      });
    });

    // ⚠ A TRUST MATTER CORRECTLY GETS NONE OF THESE, and it is not an omission: the trustee's
    // schedule they would verify does not exist yet. Pinned so step 7 has to come back here.
    ['probate', 'contested_probate', 'cleanout'].forEach((svc) => {
      ['trust', 'neither'].forEach((m) => {
        eq(compliance({ svc: svc, matterType: m, docTier: 'appraisals' }).length, 0,
           svc + ' recorded ' + m + ' gets no §733.604 list at any tier');
      });
    });

    // ⚠ OR THE JOB ACTUALLY HOLDS ONE. The tier says whose job it was to obtain an appraisal; a
    // report that exists has to be attached however it arrived.
    const noAppr = { svc: 'probate', matterType: 'probate', docTier: 'contents' };
    ok(compliance(noAppr).indexOf('appraisals') < 0, 'a contents engagement is not told to attach reports');
    ok(compliance(Object.assign({ appraisers: [{ id: 1 }] }, noAppr)).indexOf('appraisals') >= 0,
       '⚠ but an appraiser on the record brings the box back — it never silently drops off a job holding one');

    // The financial close and the archive are service questions and are deliberately untouched.
    ['probate', 'cleanout'].forEach((svc) => {
      ['', 'trust', 'probate'].forEach((m) => {
        const a = admin({ svc: svc, matterType: m });
        ok(a.indexOf('fin_vendor_invoices') >= 0, svc + '/' + (m || 'unanswered') + ' keeps the financial close');
        ok(a.indexOf('rec_archived') >= 0, svc + '/' + (m || 'unanswered') + ' keeps the archive box');
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('a legacy job behaves as it did yesterday, and a living one is untouched');
  {
    // Every probate job created before 2026-09-21 carries neither field.
    eq(compliance({ svc: 'probate' }).join(' '),
       'inventory nonprobate served filed accounting pr_signoff',
       'a probate job with no tier and no matter keeps its checklist');
    eq(compliance({ svc: 'contested_probate' }).join(' '),
       'inventory nonprobate served filed accounting pr_signoff',
       'and so does a contested one');
    eq(compliance({ svc: 'probate', docScope: 'full' }).join(' '),
       compliance({ svc: 'probate', docTier: 'values' }).join(' '),
       'a job carrying only the old scope reads the same as the tier it migrates to');

    ['downsizing', 'downsizing_move', 'home_cleanout', 'prep'].forEach((svc) => {
      eq(compliance({ svc: svc }).length, 0, svc + ' is offered no compliance list');
      eq(compliance({ svc: svc, matterType: 'probate', docTier: 'appraisals' }).length, 0,
         svc + ' is offered none even with both fields written onto it');
    });
    eq(admin({ svc: 'home_cleanout' }).join(' '),
       'fin_vendor_invoices fin_proceeds fin_settlement fin_donation_receipts rec_archived',
       'a Home Cleanout desk list is exactly what it was');
    eq(admin({ svc: 'downsizing' }).join(' '),
       'fin_vendor_invoices fin_donation_receipts rec_archived',
       'and a Home Editing one');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('pr_authority is the same defect one list over');
  {
    ok(plan({ svc: 'cleanout', matterType: 'probate' }).indexOf('pr_authority') >= 0,
       '⚠ an Estate Settlement administering a probate estate is finally asked — it never was');
    ok(plan({ svc: 'probate', matterType: 'trust' }).indexOf('pr_authority') < 0,
       'a probate job recorded as a trust administration has a successor trustee instead');
    ok(plan({ svc: 'probate' }).indexOf('pr_authority') >= 0,
       'and an unanswered probate job keeps it, through the same service fallback');
    ok(plan({ svc: 'downsizing_move' }).indexOf('pr_authority') < 0, 'a Home Transition is never asked');
    // The rest of the Job Plan does not move with the matter type.
    const a = plan({ svc: 'probate', matterType: 'probate' }).filter((k) => k !== 'pr_authority');
    const b = plan({ svc: 'probate', matterType: 'trust' }).filter((k) => k !== 'pr_authority');
    eq(a.join(' '), b.join(' '), 'and nothing else on the plan moves with it');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ⚠⚠ THE JOIN. Every check above drives the CATALOGUE. A build that computes the right ctx
  // and renders the old list contains every string a source check would look for, so the desk
  // list is read back out of the REAL renderJobAdmin here — the gap this project records more
  // often than any other.
  group('⚠⚠ DRIVEN — the rendered desk card, read back');
  {
    const mk = () => {
      const a = sandbox({
        fns: ['renderJobAdmin', 'planTaskCtx', 'invFiduciaryMode', 'isDecedentJob', 'planTasksFor',
              '_planTaskDone', 'planDerivedLines', 'planDerivedHtml', 'planTaskSectionsHtml',
              'planSubsec', 'chkGrid', 'planChk', '_planRooms', 'roomStatusNormalize',
              'firearmsFlaggedAtIntake', 'houseFlagsOf', '_jobInvRefs', '_srcLineKey',
              'matterTypeOf', 'matterDef', 'docTierOf', 'docTierDef', 'docTierProduces', 'svcHasDocStep', 'estimateIsFeeOnly', 'estDeclutterHrs', '_jobAdminIsOpen'],
        vars: ['DECEDENT_SERVICES', 'JOB_ADMIN_TASKS', '_jobAdminOpen', 'jobPlanStore', 'estimateStore',
               'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY',
               'INV_RELEASE_DISPOSITIONS', 'FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS', 'changeOrders',
               'MATTER_TYPES', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS'],
        stubs: { isFormalDoc: () => false, isJobWon: () => true, docSentAt: () => null,
                 jobLogEntries: () => [], isAgreementSigned: () => false, isJobFunded: () => false,
                 depositPaidTotal: () => 0, stagePaidTotal: () => 0, _photoRefs: { 7: [] } },
      });
      a.estimateStore[7] = { estimate: { svc: 'probate', rooms: [{ idx: 0, name: 'Kitchen' }] }, approved: true };
      a._jobAdminOpen[7] = true;
      return a;
    };
    const render = (job) => { const a = mk(); a.estimateStore[7].estimate.svc = job.svc; return a.renderJobAdmin(7, Object.assign({ id: 7 }, job)); };

    const estate = render({ svc: 'cleanout', matterType: 'probate', docTier: 'values' });
    has(estate, '0 of 11 ticked', '⚠ an Estate Settlement on a probate matter renders eleven boxes — it rendered five');
    has(estate, "'ct_filed'", 'the filing deadline is on it');
    has(estate, "'ct_inventory'", 'and the §733.604 verification');
    has(estate, 'Florida court &amp; legal compliance', 'under the compliance heading');

    const none = render({ svc: 'probate', matterType: 'probate', docTier: 'none' });
    has(none, '0 of 9 ticked', 'a probate estate contracted at None renders nine');
    has(none, "'ct_filed'", 'the court procedure stays');
    lacks(none, "'ct_inventory'", '⚠ and it is no longer told to verify a value counsel states');
    lacks(none, "'ct_appraisals'", 'nor to attach reports counsel obtains');
    lacks(none, 'date-of-death FMV on every line', 'the instruction is gone from the rendered card, not just from the catalogue');

    const trust = render({ svc: 'probate', matterType: 'trust', docTier: 'values' });
    has(trust, '0 of 5 ticked', 'a trust matter renders the financial close and the archive');
    lacks(trust, 'Florida court &amp; legal compliance', 'and no court section at all');
    lacks(trust, '733.604', '⚠ nothing on it cites the wrong statute');

    const top = render({ svc: 'probate', matterType: 'probate', docTier: 'appraisals' });
    has(top, '0 of 12 ticked', 'the top tier renders all twelve');
    has(top, "'ct_appraisals'", 'including the reports it was engaged to attach');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ⚠⚠ AN EMPTY COURT SECTION IS AMBIGUOUS ON ITS FACE the moment it keys on two recorded
  // answers, so the desk card names both. Without these the concierge cannot tell "this estate
  // has no probate in it" from "nobody answered the question" — the silent absence this whole
  // step exists to stop, arriving by the door the step itself opened.
  group('⚠⚠ THE DESK CARD SAYS WHY ITS LIST LOOKS THE WAY IT DOES');
  {
    const d = sandbox({
      fns: ['planDerivedLines', 'planTaskCtx', 'invFiduciaryMode', 'isDecedentJob', '_planRooms',
            'roomStatusNormalize', 'firearmsFlaggedAtIntake', 'houseFlagsOf', '_jobInvRefs',
            '_srcLineKey', 'matterTypeOf', 'matterDef', 'docTierOf', 'docTierDef',
            'docTierProduces', 'svcHasDocStep', 'estimateIsFeeOnly', 'estDeclutterHrs'],
      vars: ['DECEDENT_SERVICES', 'jobPlanStore', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES',
             'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY', 'INV_RELEASE_DISPOSITIONS',
             'FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS', 'changeOrders', 'MATTER_TYPES',
             'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS'],
      stubs: { isFormalDoc: () => false, docSentAt: () => null, jobLogEntries: () => [],
               stagePaidTotal: () => 0, _photoRefs: { 7: [] },
               // A room on the record — since 2026-09-22 a job with NO rooms (Home Prep) is asked no room question.
               estimateStore: { 7: { estimate: { rooms: [{ idx: 0, name: 'Kitchen' }] } } } },
    });
    // ⚠ planTaskCtx takes the ESTIMATE's service over the job's, so the fixture has to move
    // both together or it measures a Home Editing job wearing an estate estimate.
    const lines = (job, phase) => d.planDerivedLines(7, Object.assign({ id: 7 }, job),
      { svc: job.svc, rooms: [{ idx: 0, name: 'Kitchen' }] }, phase)
      .reduce((m, l) => (m[l.key] = l, m), {});

    const blank = lines({ svc: 'cleanout' }, 'admin');
    eq(blank.matter_type.ok, false, 'an unrecorded matter type reads OPEN');
    has(blank.matter_type.detail, 'withheld until it is', 'and says what is being withheld because of it');
    has(blank.matter_type.detail, 'Edit Client', 'and where to answer it');
    eq(blank.doc_tier.ok, false, 'an unrecorded tier reads open too');
    has(blank.doc_tier.detail, 'before the agreement goes out', 'naming the moment it has to be answered by');

    const done = lines({ svc: 'cleanout', matterType: 'trust', docTier: 'contents' }, 'admin');
    eq(done.matter_type.ok, true, 'a recorded matter reads green');
    eq(done.matter_type.detail, d.MATTER_TYPES.trust.label, 'and names the answer from the catalogue, never a second wording');
    eq(done.doc_tier.ok, true, 'a recorded tier reads green');
    eq(done.doc_tier.detail, d.docTierDef('contents').label, 'and names the tier the client was told');

    const legacy = lines({ svc: 'probate', docScope: 'full' }, 'admin');
    eq(legacy.doc_tier.ok, true, 'a job carrying only the old scope reads as the tier it migrates to');
    eq(legacy.doc_tier.detail, d.docTierDef('values').label, 'which is Inventory with values');
    eq(legacy.matter_type.ok, false, 'and still has no matter type recorded — the scope says nothing about the instrument');

    // ⚠ THE DESK CARD ONLY. The Job Plan's Close-out stage shares the close-out facts and not
    // these two, whose wording is about a list that renders nowhere near it.
    const p4 = lines({ svc: 'cleanout' }, 'p4');
    ok(!p4.matter_type, 'the Job Plan close-out card does not carry the matter line');
    ok(!p4.doc_tier, 'nor the tier line');
    ok(!!p4.rooms_cleared && !!p4.final_invoice_sent, 'and still carries every close-out fact it always did');
    ok(!!lines({ svc: 'cleanout' }, 'admin').rooms_cleared, 'which the desk card carries too');

    // A living job is asked neither — it feeds no instrument and hands over no inventory.
    ['downsizing', 'downsizing_move', 'home_cleanout'].forEach((svc) => {
      const L = lines({ svc: svc }, 'admin');
      ok(!L.matter_type && !L.doc_tier, svc + ' is asked neither');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('the converse — no ct_ task may key on the service type again');
  {
    const ctLines = decl('JOB_ADMIN_TASKS').split('\n').filter((l) => l.indexOf("key:'ct_") >= 0);
    eq(ctLines.length, 7, 'seven compliance boxes');
    ctLines.forEach((l) => {
      const key = l.match(/key:'(ct_\w+)'/)[1];
      ok(l.indexOf('c.isProbate') < 0, key + ' does not read the service type');
      ok(l.indexOf('c.probateTrack') >= 0, key + ' reads which instrument the estate feeds');
    });
    ok(decl('PLAN_TASKS').indexOf("{ key:'pr_authority',       phase:'p0', sec:'Probate gate', when:function(c){ return c.probateTrack; }") >= 0,
       'and so does pr_authority');
    // `isProbate` is still right for everything it is used for, and must not be swept out.
    ok(src.indexOf('isProbate: isProbate') > 0, 'the service question itself survives on the ctx');
  }
};
