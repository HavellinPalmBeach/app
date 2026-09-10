'use strict';
// Service-type names (2026-09-08). Anthony renamed the two living-client moving services:
// `downsizing` is HOME EDITING — with no move to manage, the job is editing what a couple
// takes to the next home — and `downsizing_move` is HOME TRANSITION. The KEYS are unchanged
// on purpose (they are stored on every job, estimate and snapshot, and JOB_STEPS,
// PRICING_REF and isDecedentJob all key on them), so the whole rename is a LABEL change and
// this suite is what keeps a stale copy of the old name from surviving anywhere a client or
// a concierge reads it.

const { sandbox, source, fn } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const ctx = sandbox({ fns: ['svcLabelOf', 'isDecedentJob'], vars: ['SVC_LABELS', 'PRICING_REF', 'DECEDENT_SERVICES'] });
  const src = source();

  group('the catalogue carries the new names on the old keys');
  {
    eq(ctx.SVC_LABELS.downsizing, 'Home Editing', 'downsizing → Home Editing');
    eq(ctx.SVC_LABELS.downsizing_move, 'Home Transition', 'downsizing_move → Home Transition');
    eq(ctx.PRICING_REF.downsizing.label, ctx.SVC_LABELS.downsizing, 'the reference band names the service the same way');
    eq(ctx.PRICING_REF.downsizing_move.label, ctx.SVC_LABELS.downsizing_move, 'both of them');
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
    has(src, "downsizing: 'Onsite Home Editing Services'", 'client estimate sub-header, editing');
    has(src, "downsizing_move: 'Onsite Home Transition Services'", 'client estimate sub-header, transition');
    has(src, 'Home Editing / Transition Basic — $200', 'the living-client materials tier is renamed with them');
  }

  group('the standard agreement names the services the client is buying');
  {
    const agr = fn('agreementHtml');
    has(agr, "downsizing:'Home Editing'", 'the agreement header map, editing');
    has(agr, "downsizing_move:'Home Transition'", 'the agreement header map, transition');
    has(agr, 'home editing, home transition and move-management, property preparation', '§1.1 Services lists the renamed work');
    has(agr, 'for Estate Settlement, Home Editing and Home Transition engagements', '§3.5 names the renamed engagements on the SMF arm');
    lacks(agr, 'Downsizing', 'and the old word is gone from the agreement');
  }
};
