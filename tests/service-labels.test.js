'use strict';
// Service-type names (2026-09-08). Anthony renamed the two living-client moving services:
// `downsizing` is HOME EDITING — with no move to manage, the job is editing what a couple
// takes to the next home — and `downsizing_move` is HOME TRANSITION. The KEYS are unchanged
// on purpose (they are stored on every job, estimate and snapshot, and JOB_STEPS,
// PRICING_REF and isDecedentJob all key on them), so the whole rename is a LABEL change and
// this suite is what keeps a stale copy of the old name from surviving anywhere a client or
// a concierge reads it.

const { sandbox, source, fn, domStub } = require('./harness');
const DOCREC = require('./document-reconciliation.test.js');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const ctx = sandbox({ fns: ['svcLabelOf', 'isDecedentJob'], vars: ['SVC_LABELS', 'DECEDENT_SERVICES'] });
  const src = source();
  // The two client documents that name the service, rendered by their real builders (the reconciliation suite's lists).
  const docs = sandbox({ fns: DOCREC.FNS, vars: DOCREC.VARS, stubs: { jobs: [], jobLogs: {}, estimateStore: {}, changeOrders: [],
    contractors: [], currentEstimate: null, currentInvStage: 'final', vendorDirectory: [], jobPlans: {}, _photoRefs: {}, document: domStub({}) } });
  const JOB = (svc) => ({ id: 1, hvlId: 'HVL-0001', name: 'Pat Client', svc, addr: '1 Ocean Blvd', city: 'Palm Beach', status: 'won', payments: [] });
  const EST = (svc) => ({ jobId: 1, svc, tcFee: 3000, psFee: 4000, tcRate: 150, psRate: 100, totTC: 20, totPS: 40, pkgCost: 0, smf: 0, prepFee: 0,
    havellinTotal: 7000, grandTotal: 7000, discountPct: 0, discountAmt: 0, fixedPrice: false, rush: false, vendors: [], prepItems: [], rooms: [],
    collections: [], vehicles: [] });
  const render = (f, svc) => { try { docs.jobs = [JOB(svc)]; return f === 'agr' ? docs.agreementHtml(JOB(svc), EST(svc)) : docs.clientEstimateHtml(EST(svc), JOB(svc)); }
    catch (e) { return 'THREW ' + e.message; } };
  const agrTitle = (svc) => { const h = render('agr', svc); const m = h.match(/margin:\.6rem 0 \.25rem;">([^<]*)<\/div>/); return m ? m[1] : 'NO TITLE: ' + h.slice(0, 80); };

  group('the catalogue carries the new names on the old keys');
  {
    eq(ctx.SVC_LABELS.downsizing, 'Home Editing', 'downsizing → Home Editing');
    eq(ctx.SVC_LABELS.downsizing_move, 'Home Transition', 'downsizing_move → Home Transition');
    // The reference band's own label table (PRICING_REF) is gone (2026-09-30, audit M11): the band is built by
    // the engine and names the service from the catalogue, so there is no second copy of the names to agree.
    has(fn('calcAll'), 'label: SVC_LABELS[svcKey] || svcKey', 'the reference band names the service from the catalogue');
    lacks(src, 'var PRICING_REF', 'and the hand-typed table with its own copy of the names is gone');
    ok(!ctx.isDecedentJob({ svc: 'downsizing' }) && !ctx.isDecedentJob({ svc: 'downsizing_move' }),
       'both are still living-client work — the rename moved no key and no predicate');
  }

  group('svcLabelOf — a job saved under the old name shows the new one');
  {
    eq(ctx.svcLabelOf({ svc: 'downsizing', svcLabel: 'Downsizing' }), 'Home Editing',
       'the catalogue beats the label stored at intake');
    eq(ctx.svcLabelOf({ svc: 'downsizing_move', svcLabel: 'Downsizing & Move Management' }), 'Home Transition',
       'same for a stored Downsizing & Move Management');
    eq(ctx.svcLabelOf({ svc: 'retired_key', svcLabel: 'Something Old' }), 'Something Old',
       'a key the catalogue no longer has keeps its stored text rather than printing the key');
    eq(ctx.svcLabelOf({ svc: 'retired_key' }), 'retired_key', 'and the key itself is the last resort');
    eq(ctx.svcLabelOf(null), '—', 'no job prints a dash, not a throw');
  }

  group('every reader of the stored label goes through the catalogue');
  {
    // The one place that WRITES job.svcLabel (intake save / edit client) and svcLabelOf's own
    // body are the only legitimate `.svcLabel` reads that do not put the catalogue first.
    const reads = (src.match(/\.svcLabel\b/g) || []).length;
    const catalogueFirst = (src.match(/SVC_LABELS\[job\.svc\] \|\| job\.svcLabel|svcLabelMap\[job\.svc\] \|\| esc\(job\.svcLabel\)|svcMap\[job\.svc\] \|\| job\.svcLabel/g) || []).length;
    const bareReads = (src.match(/\((?:job|j|invJob)\.svcLabel\|\|/g) || []).length;
    eq(bareReads, 0, 'no `(job.svcLabel||…)` reader survives — each one printed the stale name for a job saved before the rename');
    ok(reads - catalogueFirst <= 2, 'only svcLabelOf and the write site touch job.svcLabel bare (' + (reads - catalogueFirst) + ')');
  }

  group('the old names survive nowhere a client or a concierge reads');
  {
    lacks(src, 'Downsizing & Move Management', 'no unescaped copy of the old long name');
    lacks(src, 'Downsizing &amp; Move Management', 'nor an HTML-escaped one');
    lacks(src, "'Downsizing'", 'no string literal of the old short name');
    lacks(src, '>Downsizing<', 'no option, button or cell reading Downsizing');
    lacks(src, 'Onsite Downsizing Services', 'the fee-table sub-header is renamed');
    has(src, '<option value="downsizing">Home Editing</option>', 'intake offers Home Editing');
    has(src, '<option value="downsizing_move">Home Transition</option>', 'intake offers Home Transition');
    // RESTATED 2026-10-05 (P20, Q26): the fee table's heading is no longer a map of its own (_svcSubHdr) but the service row's
    // name, through the one namer for a client document (docServiceTitle) over this catalogue, so the renamed services are
    // read off the rendered estimate rather than off the map's source.
    has(render('ce', 'downsizing'), 'Onsite Home Editing Services', 'client estimate sub-header, editing');
    has(render('ce', 'downsizing_move'), 'Onsite Home Transition Services', 'client estimate sub-header, transition');
    has(src, 'Home Editing / Transition Basic — $200', 'the living-client materials tier is renamed with them');
  }

  group('the standard agreement names the services the client is buying');
  {
    const agr = fn('agreementHtml');
    // RESTATED 2026-10-05 (P20, Q26): the header names the service through docServiceTitle, not a map of its own (svcMap, which
    // had no Home Cleanout), so the renamed services are read off the rendered agreement's title.
    eq(agrTitle('downsizing'), 'Home Editing', 'the agreement header, editing');
    eq(agrTitle('downsizing_move'), 'Home Transition', 'the agreement header, transition');
    has(agr, 'home editing, home transition and move-management, property preparation', '§1.1 Services lists the renamed work');
    has(agr, 'for Estate Settlement, Home Editing and Home Transition engagements', '§3.5 names the renamed engagements on the SMF arm');
    lacks(agr, 'Downsizing', 'and the old word is gone from the agreement');
  }
};
