'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// ONE CURRENT JOB ACROSS THE TWO JOB TABS (2026-09-20)
//
// Anthony, from the Job Plan: *"I just went to a job plan and used the drop down to set the job to
// one of our dummy clients, and I realized what would be nice is if the inventory tab updated to
// the same client. So if I'm working on a job and I'm going between job plan and inventory, they're
// on the same job. So selecting in one basically selects in both."*
//
// The two tabs are the field and desk halves of ONE job, and they held two independent pickers
// (`plan-job`, `inv-job`) that knew nothing about each other.
//
// ⚠⚠ THE RISK IS NOT THE SYNC, IT IS THE SILENT REJECTION. A <select> assigned a value it has no
// option for keeps its OLD value (or goes empty) and throws nothing — the defect this project
// already paid for once on Build Estimate, where a filtered-out job left `e-job` empty and fifteen
// downstream `parseInt` reads resolved to 0. So a remembered job that another device has since
// dropped must never be assigned: it would land BOTH tabs on "Select a job" and read as the sync
// being broken rather than the job being gone.
//
// ⚠ AND `domStub` CANNOT SEE THAT ON ITS OWN — it stores whatever it is handed, unvalidated, so a
// test driving the bare stub would pass on exactly that defect. The select stub below does the two
// things a real one does: it coerces to a string, and it REFUSES a value that is not among its
// options. That is what makes these assertions able to fail.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { sandbox } = require('./harness');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');
const fnBody = (name) => {
  const at = SRC.indexOf('function ' + name + '(');
  return SRC.slice(at, SRC.indexOf('\n}\n', at));
};
// ⚠ COMMENT-STRIPPED, AND THIS IS NOT TIDYING. The first revert sweep of this change commented the
// call out — `/* setCurrentJob(jobId); */` — and the assertion below passed, because a `has()` over
// raw source is satisfied by a call that no longer runs. Line-based rather than a /\*…\*\// regex:
// the app carries `accept="image/*"`, whose `/*` swallows ~170KB to the next `*/`.
const live = (s) => s.split('\n').filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n');

// A <select> that behaves like the browser's: string-valued, and an unlisted value does not stick.
function selectStub(options, value) {
  return {
    _opts: options.map(String),
    _v: String(value == null ? '' : value),
    get value() { return this._v; },
    set value(v) {
      const s = String(v);
      if (s === '' || this._opts.indexOf(s) !== -1) this._v = s;   // otherwise: silently ignored
    },
  };
}

module.exports = function ({ group, ok, eq, has, lacks }) {

  group('picking a job on either tab makes it the job the other opens on');
  {
    const s = sandbox({ fns: ['setCurrentJob', 'adoptCurrentJob'], vars: ['_currentJobId'] });
    s.jobs = [{ id: 7, name: 'Butler Estate' }, { id: 8, name: 'Ellsworth' }];

    const plan = selectStub([7, 8], 7);
    const inv  = selectStub([7, 8], '');
    s.document = { getElementById: (id) => (id === 'plan-job' ? plan : id === 'inv-job' ? inv : null) };

    // The Job Plan picks Butler.
    s.setCurrentJob(7);
    eq(s._currentJobId, 7, 'the Job Plan records the client it is on');

    // Opening Job Admin & Inv adopts it.
    eq(s.adoptCurrentJob('inv-job'), true, 'the desk tab moves to that client');
    eq(inv.value, '7', 'and really holds it');

    // Back the other way: the desk tab switches client, the Job Plan follows.
    s.setCurrentJob(8);
    eq(s.adoptCurrentJob('plan-job'), true, 'the Job Plan moves to the client picked at the desk');
    eq(plan.value, '8', 'and really holds it');

    // A tab already on the current job is NOT a change, or every tab open would redraw.
    eq(s.adoptCurrentJob('plan-job'), false, 'a tab already on that client reports no change');
  }

  group('⚠⚠ a job this device no longer has is REFUSED, never assigned');
  {
    const s = sandbox({ fns: ['setCurrentJob', 'adoptCurrentJob'], vars: ['_currentJobId'] });
    s.jobs = [{ id: 7, name: 'Butler Estate' }];

    // Job 8 was open, and has since been dropped by another device (the job ledger does this).
    const inv = selectStub([7], '7');
    s.document = { getElementById: (id) => (id === 'inv-job' ? inv : null) };
    s.setCurrentJob(8);

    eq(s.adoptCurrentJob('inv-job'), false, 'it refuses rather than assigning a job that is gone');
    eq(inv.value, '7', '⚠ and leaves the picker on a REAL client rather than emptying it');

    // The guard is a membership test against `jobs`, not a try/assign — assigning and hoping is
    // what leaves a picker silently empty.
    has(fnBody('adoptCurrentJob'), 'jobs.some', 'it checks the job is still on this device first');
  }

  group('nothing is remembered anywhere but this session');
  {
    // ⚠ Which client somebody is looking at is nobody else's business. Persisting it would sync one
    // person's screen position to the other's iPad, and hand the per-key merge a key that means
    // nothing. A reload clears it, deliberately.
    const setBody = fnBody('setCurrentJob');
    lacks(setBody, 'localStorage', 'the current job is never written to this device');
    lacks(setBody, 'saveJobs', 'nor to the job store');
    lacks(setBody, 'syncJobToSheets', 'nor pushed to the sheet');
    lacks(fnBody('adoptCurrentJob'), 'localStorage', 'and reading it touches no store either');
    ok(/var _currentJobId = 0;/.test(SRC), 'it is plain module state');
  }

  group('both tabs are wired — the write sites and the read sites');
  {
    // A shared current job that only ONE tab writes, or only one tab reads, is half a feature and
    // looks identical to a broken one from the tab that was missed.
    // ⚠ A SOURCE PIN, recorded as one rather than dressed up. `loadJobPlanTab` reads three dozen DOM
    // elements and cannot be driven in this harness — the standing limitation this project records
    // for `calcAll` — so what is checked is that the live call is there and above the gates, and the
    // browser run is the proof it fires. Comment-stripped so a commented-out call cannot satisfy it.
    has(live(fnBody('loadJobPlanTab')), 'setCurrentJob(jobId)', 'the Job Plan records the client it loads');
    has(live(fnBody('onInventoryJobChange')), 'setCurrentJob(', 'Job Admin & Inv records the client it loads');

    const sp = fnBody('showPanel');
    has(sp, "adoptCurrentJob('plan-job')", 'opening the Job Plan adopts the current client');
    has(sp, "adoptCurrentJob('inv-job')", 'opening Job Admin & Inv adopts the current client');
    // ⚠ The Job Plan does not re-render on tab open by itself, so an adopted change has to load it.
    has(sp, "if (adoptCurrentJob('plan-job')) loadJobPlanTab();", 'and a moved Job Plan picker is loaded, not left stale');
  }

  group('⚠ the Job Plan records the client even when it withholds the plan');
  {
    // A job whose plan is gated (not won, estimate unread) is still the job being worked. If the
    // gates returned before recording it, the desk tab would stay on whoever was open last — the
    // one case where the two tabs disagreeing is most confusing.
    const body = live(fnBody('loadJobPlanTab'));
    const at = body.indexOf('setCurrentJob(jobId)');
    ok(at > -1, 'it is recorded');
    ok(at < body.indexOf('isJobWon'), '⚠ and recorded ABOVE the won gate, not after it');
  }
};
