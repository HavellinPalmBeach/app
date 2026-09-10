'use strict';
// Re-typing a job on the walkthrough (2026-09-10), and the prep-fee change that came with it.
//
// Anthony: "we get a home prep client at intake and create a home prep job, and then we show up
// on-site to do a walkthrough, it might turn out that they actually need some editing … at the
// estimate stage we make that editable." Two rules carry the whole thing and both are here:
//
//   1. A job may be re-typed WITHIN its family and never across one. The living and decedent
//      halves of the catalogue ask different questions at intake, so a move inside a family can
//      never leave a required field unasked — and a move across one always would.
//   2. Home Prep vendors carry the 30% GC fee on EVERY engagement, and book NO concierge hours
//      on any. Those two must move together or the same coordination is billed twice.

const { sandbox, source, fn } = require('./harness');

// A DOM small enough to drive the picker for real. The harness's own document only serves
// print-target, and every guard in changeEstimateService reads a field off this one.
function fakeDom(fields) {
  const els = {};
  Object.keys(fields).forEach((id) => { els[id] = { value: fields[id], innerHTML: '', id }; });
  return {
    els,
    document: { getElementById(id) { return els[id] || null; } },
  };
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  const ctx = sandbox({
    fns: ['svcLabelOf', 'isDecedentJob', 'svcFamily', 'svcFamilyOptions', 'sameSvcFamily',
          'isTMOnly', '_svcChangeConsequences', 'prepFeeRate', 'getVendorActuals',
          '_agrHasPrepVendors', '_pctWords', 'ecIsProbateSvc', 'ecIsEstateSvc'],
    vars: ['SVC_LABELS', 'DECEDENT_SERVICES', 'SVC_ORDER', 'PREP_FEE_RATE', 'SMF_PCT', '_PCT_WORDS'],
  });

  // ── 1. THE FAMILIES ────────────────────────────────────────────────────────
  group('every service in the catalogue lands in exactly one family');
  {
    eq(ctx.SVC_ORDER.length, 7, 'seven selectable services');
    ctx.SVC_ORDER.forEach((k) => {
      ok(ctx.svcFamily(k) === 'living' || ctx.svcFamily(k) === 'decedent', k + ' has a family');
      ok(!!ctx.SVC_LABELS[k], k + ' has a display label');
    });
    eq(ctx.svcFamily('downsizing'), 'living', 'Home Editing is living-client work');
    eq(ctx.svcFamily('downsizing_move'), 'living', 'so is Home Transition');
    eq(ctx.svcFamily('home_cleanout'), 'living', 'and Home Cleanout — the owner is alive');
    eq(ctx.svcFamily('prep'), 'living', 'and Home Prep for Sale');
    eq(ctx.svcFamily('cleanout'), 'decedent', 'Estate Settlement is decedent work');
    eq(ctx.svcFamily('probate'), 'decedent', 'so is Probate');
    eq(ctx.svcFamily('contested_probate'), 'decedent', 'and Contested Probate');
    eq(ctx.svcFamily('nonsense'), '', 'a key the catalogue does not know gets no family');
    eq(ctx.svcFamily(''), '', 'nor does an empty one');
  }

  group('the family split IS DECEDENT_SERVICES, not a second copy of it');
  {
    // The one thing that would make this whole feature dangerous is these two lists
    // disagreeing: svcFamily would offer a decedent service inside the living picker, and the
    // move would land on a job with no representative and a phone number belonging to someone
    // who has died. svcFamily derives from isDecedentJob so it cannot — asserted both ways.
    const decl = ctx.SVC_ORDER.filter((k) => ctx.svcFamily(k) === 'decedent').sort();
    eq(decl, Object.keys(ctx.DECEDENT_SERVICES).sort(),
       'the decedent family is exactly DECEDENT_SERVICES');
    ctx.SVC_ORDER.forEach((k) => {
      eq(ctx.svcFamily(k) === 'decedent', ctx.isDecedentJob(null, k),
         k + ': svcFamily and isDecedentJob agree');
    });
    has(fn('svcFamily'), 'isDecedentJob(', 'and it is derived, not listed a second time');
  }

  group('`estate` — the legacy alias — is placed, and never offered');
  {
    eq(ctx.svcFamily('estate'), 'decedent',
       'a job still carrying the retired key is decedent work, not living');
    ok(ctx.SVC_ORDER.indexOf('estate') < 0, 'but it is not on the selectable list');
    ok(ctx.svcFamilyOptions('estate').indexOf('estate') < 0,
       'so the picker on such a job offers the three real decedent keys and quietly repairs it');
    eq(ctx.svcFamilyOptions('estate'), ['cleanout', 'probate', 'contested_probate'],
       'those three, in catalogue order');
  }

  group('svcFamilyOptions never crosses the line');
  {
    ctx.SVC_ORDER.forEach((k) => {
      const opts = ctx.svcFamilyOptions(k);
      ok(opts.indexOf(k) >= 0, k + ' can stay what it is');
      ok(opts.every((o) => ctx.svcFamily(o) === ctx.svcFamily(k)),
         k + ' is only ever offered its own family');
    });
    eq(ctx.svcFamilyOptions('prep'), ['downsizing', 'downsizing_move', 'home_cleanout', 'prep'],
       'the living four, in catalogue order');
    eq(ctx.svcFamilyOptions('nonsense'), [], 'an unplaceable key offers no move at all');
    ok(ctx.sameSvcFamily('prep', 'downsizing'), 'prep → Home Editing is allowed');
    ok(ctx.sameSvcFamily('cleanout', 'contested_probate'), 'Estate Settlement → Contested is allowed');
    ok(!ctx.sameSvcFamily('prep', 'cleanout'), 'prep → Estate Settlement is not');
    ok(!ctx.sameSvcFamily('home_cleanout', 'probate'), 'nor Home Cleanout → Probate');
    ok(!ctx.sameSvcFamily('nonsense', 'nonsense'), 'and an unknown key matches nothing, not even itself');
  }

  group('the estimate picker and the intake dropdown offer the same list');
  {
    // Two hardcoded service lists is how the Edit Client modal ended up still saying
    // "Downsizing" a week after the rename. The estimate picker builds itself from SVC_ORDER;
    // this checks the static intake markup still agrees with it, key for key and in order.
    const intake = [];
    const re = /<option value="([a-z_]+)">([^<]+)<\/option>/g;
    const block = src.slice(src.indexOf('<select id="i-svc"'), src.indexOf('<select id="i-svc"') + 900);
    let m;
    while ((m = re.exec(block))) intake.push(m[1]);
    eq(intake, ctx.SVC_ORDER, 'intake offers exactly SVC_ORDER, in the same order');
  }

  // ── 2. THE PICKER ──────────────────────────────────────────────────────────
  group('the service type is a control now, not a read-only display');
  {
    has(src, '<select id="e-svc" onchange="changeEstimateService()">', 'e-svc is a select and is wired');
    lacks(src, 'e-svc-display', 'the read-only display is gone, with no orphan writers left behind');
    lacks(src, '<input type="hidden" id="e-svc"', 'and so is the hidden input it shadowed');
    has(src, 'id="e-svc-note"', 'with a persistent note under it');
  }

  group('every lock the estimate already had covers the picker too');
  {
    // applyEstimateLock disables every input/select/textarea/button in panel-estimate,
    // exempting only the job selector and the nav. A select added to that panel is therefore
    // locked by construction — while submitted for approval, and once approved. The route back
    // is Edit Estimate, which un-approves. This asserts the exemption list has not grown.
    const lock = fn('applyEstimateLock');
    has(lock, "querySelectorAll('input, select, textarea, button')", 'the lock sweeps selects');
    has(lock, "if (el.id === 'e-job') return;", 'the job selector is the only field exempted');
    lacks(lock, "'e-svc'", 'the service picker is NOT exempted from the lock');
    // The hard lock beyond that is the signed agreement, and the picker enforces it itself.
    const chg = fn('changeEstimateService');
    has(chg, 'job.agrSigned || job.depositReceived', 'and the picker refuses under a signed agreement');
    has(chg, 'Change Order', 'naming the Change Order as the way through');
    has(chg, 'if (!sameSvcFamily(prev, next))', 'a family jump is refused even if the options ever offered one');
  }

  group('the change is written to the JOB, not left on the estimate');
  {
    // job.svc is what the dashboard, the invoice header, the approval email, the agreement
    // routing and isDecedentJob all read. Leaving it behind would price the estimate as one
    // service under an agreement drawn for another — the exact drift this file records twice.
    const chg = fn('changeEstimateService');
    has(chg, 'job.svc = next;', 'the job key is updated');
    has(chg, 'job.svcLabel = SVC_LABELS[next] || next;', 'and the stored label with it');
    has(chg, 'saveJobs();', 'persisted');
    has(chg, 'syncJobToSheets(job);', 'and synced');
    has(chg, 'job.svcChangedFrom = prev;', 'the reclassification is recorded');
    // And the reverse direction: reopening a saved estimate follows the JOB, not the snapshot.
    const rest = fn('restoreEstimateToUI');
    has(rest, '_svcJobR.svc) || est.svc', 'a reopened estimate takes the job\'s service type first');
    has(rest, 'paintEstimateService(_svcNowR, _svcJobR, est.svc', 'and says so when the two differ');
  }

  // ── 3. DRIVING THE PICKER ──────────────────────────────────────────────────
  group('changeEstimateService — driven for real');
  {
    function harness(job, opts) {
      opts = opts || {};
      const dom = fakeDom({ 'e-svc': opts.next, 'e-job': String(job ? job.id : ''),
                            'e-prepared-by': 'Ashley Jerome', 'e-svc-note': '' });
      const fb = [];
      const c = sandbox({
        fns: ['svcFamily', 'svcFamilyOptions', 'sameSvcFamily', 'isDecedentJob', 'isTMOnly',
              '_svcChangeConsequences', 'changeEstimateService'],
        vars: ['SVC_LABELS', 'DECEDENT_SERVICES', 'SVC_ORDER'],
        stubs: {
          document: dom.document,
          jobs: job ? [job] : [],
          confirm: () => opts.confirm !== false,
          showFB: (id, kind, msg) => fb.push({ kind, msg }),
          saveJobs: () => { c.__saved = true; },
          syncJobToSheets: () => { c.__synced = true; },
          paintEstimateService: () => {},
          renderJobRefStrip: () => {},
          svcTypeChanged: () => {},
        },
      });
      // The picker was showing the job's own service before the user touched it.
      c._svcSelPrev = opts.prev;
      c.changeEstimateService();
      return { fb, sel: dom.els['e-svc'], job };
    }

    // Anthony's case: a Home Prep job that turns out to need editing.
    let job = { id: 1, svc: 'prep', svcLabel: 'Home Prep for Sale', tc: 'Ashley Jerome' };
    let r = harness(job, { prev: 'prep', next: 'downsizing' });
    eq(job.svc, 'downsizing', 'prep → Home Editing goes through');
    eq(job.svcLabel, 'Home Editing', 'and relabels the job');
    eq(job.svcChangedFrom, 'prep', 'recording where it came from');
    eq(job.svcChangedBy, 'Ashley Jerome', 'and who did it');
    eq(r.fb[0].kind, 'ok', 'reported as a success');

    // Declining the confirm changes nothing and puts the control back.
    job = { id: 1, svc: 'prep', svcLabel: 'Home Prep for Sale' };
    r = harness(job, { prev: 'prep', next: 'downsizing', confirm: false });
    eq(job.svc, 'prep', 'cancelling leaves the job alone');
    eq(r.sel.value, 'prep', 'and snaps the picker back to what it was showing');

    // The line that must never be crossed.
    job = { id: 1, svc: 'prep' };
    r = harness(job, { prev: 'prep', next: 'cleanout' });
    eq(job.svc, 'prep', 'a living job is not re-typed as an estate matter here');
    eq(r.sel.value, 'prep', 'the picker reverts');
    eq(r.fb[0].kind, 'err', 'and it is an error, not a warning');
    has(r.fb[0].msg, 'Client Intake', 'pointing at the form that asks those questions');

    // The hard lock.
    job = { id: 1, svc: 'downsizing', agrSigned: true };
    r = harness(job, { prev: 'downsizing', next: 'home_cleanout' });
    eq(job.svc, 'downsizing', 'a signed agreement holds the service type');
    has(r.fb[0].msg, 'Change Order', 'and names the Change Order');
    job = { id: 1, svc: 'downsizing', depositReceived: true };
    r = harness(job, { prev: 'downsizing', next: 'home_cleanout' });
    eq(job.svc, 'downsizing', 'so does a recorded deposit');

    // Anthony's decedent example: the will gets contested mid-engagement.
    job = { id: 1, svc: 'cleanout', svcLabel: 'Estate Settlement' };
    r = harness(job, { prev: 'cleanout', next: 'contested_probate' });
    eq(job.svc, 'contested_probate', 'Estate Settlement → Contested Probate goes through');

    // No job picked at all.
    r = harness(null, { prev: '', next: 'downsizing' });
    eq(r.fb[0].kind, 'warn', 'with no client selected it asks for one');
  }

  // ── 4. WHAT THE CONFIRM ACTUALLY SAYS ──────────────────────────────────────
  group('_svcChangeConsequences names what moves, and only what moves');
  {
    const j = (o) => Object.assign({ id: 1 }, o || {});
    let l = ctx._svcChangeConsequences('prep', 'downsizing', j()).join(' | ');
    has(l, 'room grid opens up', 'leaving prep opens the rooms');
    has(l, 'still carry the 30% fee', 'and says the prep vendors keep their fee — they do now');

    l = ctx._svcChangeConsequences('downsizing', 'prep', j()).join(' | ');
    has(l, 'bills no concierge or specialist hours', 'entering prep is fee-only');
    has(l, 'kept and comes back', 'and the room scoring is not destroyed');

    l = ctx._svcChangeConsequences('cleanout', 'probate', j()).join(' | ');
    has(l, 'Fixed price is not offered', 'probate withdraws the flat fee');
    has(l, '733.604', 'and asks for the case details Estate Settlement never collected');

    l = ctx._svcChangeConsequences('probate', 'contested_probate', j()).join(' | ');
    lacks(l, '733.604', 'moving between two probate services does not re-ask for them');
    lacks(l, 'Fixed price is not offered', 'nor re-state a restriction that already applied');

    l = ctx._svcChangeConsequences('contested_probate', 'cleanout', j()).join(' | ');
    has(l, 'Fixed price becomes available', 'leaving a T&M-only matter restores it');

    l = ctx._svcChangeConsequences('downsizing', 'home_cleanout', j()).join(' | ');
    eq(l, '', 'a move that changes none of those says nothing rather than padding the dialog');

    l = ctx._svcChangeConsequences('downsizing', 'home_cleanout', j({ estimateSentDate: 'Sep 9, 2026' })).join(' | ');
    has(l, 'already sent to the client', 'an estimate the client is holding is called out');
    has(l, 'Home Editing', 'naming the service they were sent, not the new one');
  }

  // ── 5. THE PREP FEE ────────────────────────────────────────────────────────
  group('prep vendors carry 30% on every engagement');
  {
    eq(ctx.prepFeeRate(), 0.30, 'the rate is 30%');
    eq(ctx.prepFeeRate('downsizing'), 0.30, 'on a bundled job — this returned SMF_PCT (0) before');
    eq(ctx.prepFeeRate('prep'), 0.30, 'and standalone, unchanged');
    eq(ctx.SMF_PCT, 0, 'SMF is still zero, so the old bundled arm really did charge nothing');
    lacks(fn('prepFeeRate'), 'SMF_PCT', 'the fee no longer falls through to the vendor SMF');
    lacks(fn('prepFeeRate'), "=== 'prep'", 'and is not scoped to the service key any more');
  }

  group('…and book no concierge hours on any of them');
  {
    // The two halves of one trade. Charging the 30% AND the hours is the double charge that
    // took SMF_PCT to zero, and it would be invisible — prepTCHrs lands inside coordTC beside
    // every other coordination figure.
    const calc = fn('calcAll');
    has(calc, 'var prepTCHrs = 0;', 'prepTCHrs is zero unconditionally');
    lacks(calc, '(prepEnabled && !isPrep) ? getPrepTCHrs()', 'the bundled arm is gone');
    lacks(src, 'function getPrepTCHrs', 'and the function that fed it is deleted, not left dead');
    // The card footer used to advertise those hours; now it advertises the fee.
    const cards = fn('renderVendorGroupCards');
    has(cards, 'cardHrs  += isPrep ? 0 : vendorLineTCHrs(v.type);', 'a prep line adds no hours to its card');
    has(cards, "bits.push(Math.round(prepFeeRate()*100) + '% GC fee", 'the card states the fee instead');
    lacks(cards, 'isPrep && isPrepSvc', 'and no longer gates that on the service being prep');
  }

  group('the invoice bills the same rule, from the same function');
  {
    const va = fn('getVendorActuals');
    lacks(va, 'pr.total * 0.30', 'no second hardcoded 30 in the invoice path');
    lacks(va, 'standalonePrep', 'and no second copy of the engagement test');
    has(va, 'prepFee: Math.round(pr.total * prepFeeRate())', 'it reads the one function');

    // Driven for real: a BUNDLED prep job must now produce a fee. It produced 0 before.
    const job = { id: 7, svc: 'downsizing', prepSourcing: {}, vendorSourcing: {}, logisticsSourcing: {} };
    const est = { svc: 'downsizing', prepEnabled: true,
                  prepItems: [{ type: 'Painting', cost: 30000 }, { type: 'Home Staging', cost: 15000 }],
                  vendors: [] };
    const act = ctx.getVendorActuals(job, est);
    eq(act.prepTotal, 45000, 'the prep spend is passed through at cost');
    eq(act.prepFee, 13500, '30% of it is billed as the GC fee on a bundled Home Editing job');
    eq(act.smf, 0, 'and it is NOT also swept into the vendor SMF base — that would bill both');

    // Standalone is unchanged, which is the half that already worked.
    const solo = ctx.getVendorActuals({ id: 8, svc: 'prep', prepSourcing: {} },
                                      { svc: 'prep', prepEnabled: true,
                                        prepItems: [{ type: 'Painting', cost: 10000 }], vendors: [] });
    eq(solo.prepFee, 3000, 'a standalone prep job still bills 30%');
  }

  group('the client estimate states the fee where the spend is, and reads the rate');
  {
    const ce = fn('renderClientEstimate');
    has(ce, "Havellin GC / Site Management Fee (' + Math.round(prepFeeRate()*100) + '% of prep vendors)",
        'the fee row sits in the Home Prep section and reads the constant');
    lacks(ce, 'Home Prep for Sale — GC / Site Management Fee (30%)',
          'the old hardcoded row under the Moving Materials heading is gone');
    has(ce, 'var hasMaterialsSection = e.pkgCost > 0 || vendorSMF > 0;',
        'and the materials band no longer opens just because a prep fee exists');
  }

  // ── 6. THE CONTRACT MUST NOT DISAGREE WITH THE INVOICE ─────────────────────
  group('the agreement carries the bundled-prep fee — the defect that ran five weeks on the 15%');
  {
    ok(ctx._agrHasPrepVendors({ prepEnabled: true, prepItems: [{ cost: 100 }] }),
       'an estimate with priced prep vendors');
    ok(!ctx._agrHasPrepVendors({ prepEnabled: true, prepItems: [{ cost: 0 }] }),
       'a zero-cost placeholder line is not a fee-bearing vendor');
    ok(!ctx._agrHasPrepVendors({ prepEnabled: false, prepItems: [{ cost: 100 }] }), 'prep switched off');
    ok(!ctx._agrHasPrepVendors(null), 'and no estimate at all does not throw');

    eq(ctx._pctWords(0.30), 'thirty percent (30%)', 'a contract states the percentage in words');
    eq(ctx._pctWords(0.15), 'fifteen percent (15%)', 'and the SMF rate too, if it ever comes back');
    eq(ctx._pctWords(0.07), '7%', 'a rate with no spelling falls back to the figure, not invented prose');

    const agr = fn('renderAgreement');
    has(agr, '_agrHasPrepVendors(est)', '§3.5 branches on the ESTIMATE, not the service key');
    has(agr, '3.5 Vendor Coordination and Home Sale Preparation Fee.',
        'and there is a third arm for a job that carries both');
    has(agr, "_pctWords(prepFeeRate())", 'stating the rate from the one function');
    // The plain no-fee clause must survive for a job with no prep vendors — most jobs.
    has(agr, '3.5 Vendor Coordination.', 'the no-fee clause is still there for a job with no prep');

    const pro = fn('renderProbateAgreement');
    has(pro, '_agrHasPrepVendors(est)', 'the probate fee table asks the same question');
    has(pro, 'Home Sale Preparation Fee', 'and adds the row only when Exhibit A carries one');
    has(pro, "'At cost — no fee'", 'while the general third-party row is untouched');
  }

  // ── 7. THE EDIT CLIENT BUG ON THE CONTESTED PATH ───────────────────────────
  group('Edit Client stops hiding the fields it is about to save');
  {
    ok(ctx.ecIsProbateSvc('probate'), 'probate carries case fields');
    ok(ctx.ecIsProbateSvc('contested_probate'), 'and so does contested probate — it did not before');
    ok(!ctx.ecIsProbateSvc('cleanout'), 'Estate Settlement does not');
    ok(ctx.ecIsEstateSvc('contested_probate'), 'contested probate carries the representative block');
    ok(ctx.ecIsEstateSvc('cleanout') && ctx.ecIsEstateSvc('estate'), 'so do both Estate Settlement keys');
    ok(!ctx.ecIsEstateSvc('downsizing') && !ctx.ecIsEstateSvc('prep'), 'living services carry neither');

    // Every one of the four sites reads the shared predicate, so the toggle cannot drift from
    // the render or from what saveClientEdit reads back out.
    const tog = fn('ecToggleProbate');
    has(tog, 'ecIsProbateSvc(svcVal)', 'the toggle asks the predicate');
    has(tog, 'ecIsEstateSvc(svcVal)', 'for both blocks');
    lacks(tog, "svcVal === 'probate' ?", 'no bare probate-only test survives');
    lacks(tog, "svcVal === 'cleanout'", 'nor an inline estate list that omitted contested probate');
    has(fn('saveClientEdit'), 'var isEstateEdit = ecIsEstateSvc(svc);', 'and the save reads the same one');
  }
};
