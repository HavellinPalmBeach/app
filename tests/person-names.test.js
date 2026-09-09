'use strict';
// Renaming a person, when the NAME is the identity key.
//
// Anthony, 2026-09-09: "lets remove 'Sr' everywhere. i do not want that anywhere."
//
// A one-word request that is a data migration. There is no person id anywhere in this
// app: `job.tc`, `approvedBy`, `preparedBy`, `agrApprovedBy`, `lockedBy`, the staffing
// rosters and every hour-log member row all store the NAME, and eight lookups matched it
// with ===. Rename the source string and every record written before today points at a
// person who no longer exists — an estimate loses its preparer, an approval loses its
// approver, and getTCCostRate silently falls through to the founder rate.
//
// ⚠ AND THE RENAME UNDOES ITSELF WITHOUT THE MIGRATION. loadContractors restores the
// built-in team from havellin_defaults_v3 and from the ContractorStore BY ID, with
// Object.assign — so a stored old name is copied straight back over the renamed source
// on every page load. That is the case these tests exist for: it looks like the rename
// simply did not take, and no amount of re-reading the source explains it.

const fs = require('fs');
const path = require('path');
const { sandbox } = require('./harness');

const APP = () => fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');

const NAME_FNS = ['canonPersonName', 'samePerson', 'migrateRetiredNames'];

module.exports = function ({ group, ok, eq, has, lacks }) {

  group('the retired spelling is gone from the source');
  {
    const src = APP();
    // The request was "everywhere", and the two spellings differ — a grep for the long
    // form alone leaves "Anthony Sr" in the escalation copy and the cost-rate comment.
    lacks(src, 'Anthony Graziano Sr', 'no long form survives in the app');
    lacks(src, 'Anthony Sr', 'and no short form either');

    for (const f of ['manual.html', 'MANUAL.md', 'concierge-guide.html', 'CONCIERGE_GUIDE.md']) {
      const p = path.join(__dirname, '..', f);
      if (!fs.existsSync(p)) continue;
      const d = fs.readFileSync(p, 'utf8');
      lacks(d, 'Anthony Graziano Sr', f + ' carries the current name');
      lacks(d, 'Anthony Sr', f + ' carries the current name (short form)');
    }
  }

  group('canonPersonName resolves the retired spellings and nothing else');
  {
    const ctx = sandbox({ fns: NAME_FNS, vars: ['PERSON_NAME_ALIASES'] });

    eq(ctx.canonPersonName('Anthony Graziano Sr'), 'Anthony Graziano', 'the stored long form');
    eq(ctx.canonPersonName('Anthony Graziano Sr.'), 'Anthony Graziano', 'with the full stop');
    eq(ctx.canonPersonName('anthony graziano sr'), 'Anthony Graziano', 'case-insensitively');
    eq(ctx.canonPersonName('  Anthony  Graziano   Sr  '), 'Anthony Graziano', 'and through sloppy whitespace');
    eq(ctx.canonPersonName('Anthony Sr'), 'Anthony Graziano', 'the short form used in escalation copy');

    // ⚠ THE ONE THAT WOULD BE A DISASTER. Junior is a different person with his own
    // cost rate ($60 against $100) and his own mailbox. An alias that swallowed him
    // would reprice every job he is staffed on and send his mail to his father.
    eq(ctx.canonPersonName('Anthony Graziano Jr'), 'Anthony Graziano Jr', 'Junior is untouched');
    eq(ctx.canonPersonName('Ashley Jerome'), 'Ashley Jerome', 'so is everyone else');
    eq(ctx.canonPersonName('Anthony Graziano'), 'Anthony Graziano', 'and the current name is a fixed point');

    // A name we do not alias is somebody real — an outside concierge, a contractor added
    // on the iPad. Returning '' for one would erase them from a document.
    eq(ctx.canonPersonName('Marie Wayland'), 'Marie Wayland', 'an unknown name is returned unchanged');
    eq(ctx.canonPersonName(''), '', 'blank stays blank');
    eq(ctx.canonPersonName(null), null, 'and null is not stringified into "null"');
    eq(ctx.canonPersonName(undefined), undefined, 'nor undefined');
  }

  group('samePerson matches across the rename in both directions');
  {
    const ctx = sandbox({ fns: NAME_FNS, vars: ['PERSON_NAME_ALIASES'] });

    ok(ctx.samePerson('Anthony Graziano Sr', 'Anthony Graziano'), 'stored old vs live new');
    ok(ctx.samePerson('Anthony Graziano', 'Anthony Graziano Sr'), 'and the other way round');
    ok(ctx.samePerson('Anthony Graziano Sr', 'Anthony Graziano Sr.'), 'two old spellings match each other');
    ok(ctx.samePerson('ashley jerome', 'Ashley Jerome'), 'ordinary names still match case-insensitively');
    ok(!ctx.samePerson('Anthony Graziano', 'Anthony Graziano Jr'), 'father is not son');
    ok(!ctx.samePerson('Ashley Jerome', 'Anthony Graziano'), 'and two different people do not match');

    // Both blank is a match; one blank is not. An unstaffed job must never resolve to
    // whichever contractor happens to carry an empty name field.
    ok(ctx.samePerson('', ''), 'blank matches blank');
    ok(!ctx.samePerson('', 'Ashley Jerome'), 'but blank matches nobody');
    ok(!ctx.samePerson(null, 'Ashley Jerome'), 'and neither does null');
  }

  group('migrateRetiredNames rewrites a record wherever the name is stored');
  {
    const ctx = sandbox({ fns: NAME_FNS, vars: ['PERSON_NAME_ALIASES'] });

    // Every key the name is actually written under, in one record — this is the shape
    // that made a deep walk the right tool rather than a list of field names.
    const job = ctx.migrateRetiredNames({
      id: 1, tc: 'Anthony Graziano Sr',
      approvedBy: 'Anthony Graziano Sr', preparedBy: 'Anthony Graziano Sr',
      agrApprovedBy: 'Anthony Graziano Sr', lockedBy: 'Anthony Graziano Sr',
      wonBy: 'Anthony Graziano Sr', deliveredBy: 'Anthony Graziano Sr',
      client: 'Ellsworth', addr: '1234 Ocean Blvd',
    });
    eq(job.tc, 'Anthony Graziano', 'job.tc');
    eq(job.approvedBy, 'Anthony Graziano', 'approvedBy');
    eq(job.preparedBy, 'Anthony Graziano', 'preparedBy');
    eq(job.agrApprovedBy, 'Anthony Graziano', 'agrApprovedBy');
    eq(job.lockedBy, 'Anthony Graziano', 'lockedBy');
    eq(job.wonBy, 'Anthony Graziano', 'wonBy');
    eq(job.deliveredBy, 'Anthony Graziano', 'deliveredBy');
    eq(job.client, 'Ellsworth', 'and it leaves everything else alone');
    eq(job.addr, '1234 Ocean Blvd', 'including an address');

    // Nested: the hour log is jobLogs[jobId][].members[].name — three levels down, and
    // it is what the invoice team table and the court-grade hour record both read.
    const logs = ctx.migrateRetiredNames({
      '17': [{ date: '2026-09-01', activity: 'Walkthrough',
               members: [{ name: 'Anthony Graziano Sr', role: 'TC', hours: 6 },
                         { name: 'Anthony Graziano Jr', role: 'PS', hours: 8 }] }],
    });
    eq(logs['17'][0].members[0].name, 'Anthony Graziano', 'a log member three levels down');
    eq(logs['17'][0].members[1].name, 'Anthony Graziano Jr', 'and Junior on the row beside him is untouched');
    eq(logs['17'][0].activity, 'Walkthrough', 'the free-text activity is not a name field and is left alone');

    // Arrays of records, which is how the contractor roster and the staffing crew arrive.
    const roster = ctx.migrateRetiredNames([
      { id: 'default-1', name: 'Anthony Graziano Sr', rate: 100 },
      { id: 'default-2', name: 'Ashley Jerome', rate: 100 },
    ]);
    eq(roster[0].name, 'Anthony Graziano', 'an array of contractor records');
    eq(roster[1].name, 'Ashley Jerome', 'leaving the others as they are');
    eq(roster[0].rate, 100, 'and numbers are not touched');

    ok(ctx.migrateRetiredNames(null) === null, 'null in, null out — a failed load must not throw');
    ok(ctx.migrateRetiredNames('a string') === 'a string', 'a bare string is returned as-is');
  }

  group('migrateRetiredNames survives the shapes a real store can arrive in');
  {
    const ctx = sandbox({ fns: NAME_FNS, vars: ['PERSON_NAME_ALIASES'] });

    // A cycle is not hypothetical: an estimate snapshot pinned onto a job, on a store
    // built up in memory, can point back. An unguarded walk here hangs the page on load
    // and reads as the app being broken rather than as a migration bug.
    const a = { name: 'Anthony Graziano Sr' };
    a.self = a;
    a.child = { parent: a, name: 'Anthony Graziano Sr' };
    ctx.migrateRetiredNames(a);
    eq(a.name, 'Anthony Graziano', 'a self-referential record still migrates');
    eq(a.child.name, 'Anthony Graziano', 'and so does its child');
  }

  group('every === lookup on a stored name goes through samePerson');
  {
    const src = APP();

    // These are the sites that break silently. A preparer that does not resolve prints
    // no contact block; a cost-rate name that does not resolve falls back to the founder
    // rate. Neither raises anything — the document is just quietly wrong.
    lacks(src, 'c.name === (e.preparedBy', 'the estimate preparer lookup is not a bare ===');
    lacks(src, 'c.name === ((est && est.preparedBy)', 'nor the invoice preparer lookup');
    lacks(src, 'c.name === job.tc', 'nor assignedTCContact');
    lacks(src, 'm.name === name', 'nor the hour-log member lookup');
    lacks(src, '.text === job.tc', 'nor the TC dropdown preselect');
    lacks(src, 'allPS.find(function(c){ return c.name === name; })', 'nor the specialist cost rate');
    lacks(src, 'allTC.find(function(c){ return c.name === name; })', 'nor the concierge cost rate');

    has(src, 'samePerson(c.name, e.preparedBy || job.tc)', 'estimate preparer resolves across the rename');
    has(src, 'samePerson(c.name, (est && est.preparedBy) || job.tc)', 'invoice preparer too');
    has(src, 'samePerson(c.name, job.tc)', 'assignedTCContact too');
  }

  group('the migration is wired into every load path');
  {
    const src = APP();

    // ⚠ THE ONE THAT MATTERS MOST. loadContractors Object.assigns a stored record over
    // the built-in team BY ID, so without a migration on the way in, the retired name is
    // copied back over the renamed source on every page load and the rename appears not
    // to have happened at all.
    const lc = src.slice(src.indexOf('function loadContractors('));
    const lcBody = lc.slice(0, lc.indexOf('\n}\n'));
    has(lcBody, 'migrateRetiredNames(JSON.parse(d))',
        'the stored built-in team is migrated BEFORE the Object.assign that would restore it');
    has(lcBody, 'migrateRetiredNames(Array.isArray(remote.defaults)',
        'and so is the copy that comes back from the ContractorStore');
    has(lcBody, 'migrateRetiredNames(JSON.parse(s))', 'added contractors too');

    // Each store, on both arms: localStorage for the instant render and the cloud copy
    // that overwrites it. Migrating only one leaves the name flickering back on sync.
    const paths = [
      ['function loadJobs(', "jobs=migrateRetiredNames(JSON.parse(s))", 'migrateRetiredNames(data.jobs)'],
      ['function loadEstimateState(', 'estimateStore = migrateRetiredNames(JSON.parse(s))', 'migrateRetiredNames(sheetsRec)'],
      ['function loadLogData(', 'jobLogs=migrateRetiredNames(JSON.parse(s))', 'migrateRetiredNames(data.logs)'],
      ['function loadJobPlanData(', 'jobPlanStore = migrateRetiredNames(JSON.parse(s))', 'migrateRetiredNames(data.jobPlans)'],
    ];
    for (const [anchor, localArm, cloudArm] of paths) {
      const cut = src.slice(src.indexOf(anchor));
      const body = cut.slice(0, cut.indexOf('\n}\n'));
      has(body, localArm, anchor + ' migrates the local cache');
      has(body, cloudArm, anchor + ' migrates the cloud copy');
    }
  }

  group('nothing writes the migration back to the sheet');
  {
    const src = APP();
    // A load-time rewrite that also SAVED would push one device's opinion of everybody's
    // records up as a side effect of opening the app — the same shape as the stale-laptop
    // bug the job ledger exists to stop. Normalise on read; save only on a real edit.
    for (const anchor of ['function loadJobs(', 'function loadLogData(', 'function loadJobPlanData(']) {
      const cut = src.slice(src.indexOf(anchor));
      const body = cut.slice(0, cut.indexOf('\n}\n'));
      lacks(body, 'postSyncBadge(', anchor + ' does not push on load');
    }
  }

  group('the built-in team and the PIN list carry the current name');
  {
    const ctx = sandbox({ fns: NAME_FNS, vars: ['PERSON_NAME_ALIASES', 'DEFAULT_CONTRACTORS', 'MANAGER_PINS'] });

    const anthony = ctx.DEFAULT_CONTRACTORS.find(c => c.id === 'default-1');
    eq(anthony.name, 'Anthony Graziano', 'the managing partner on the built-in roster');
    const jr = ctx.DEFAULT_CONTRACTORS.find(c => c.id === 'default-3');
    eq(jr.name, 'Anthony Graziano Jr', 'and Junior is still Junior');

    const pin = ctx.MANAGER_PINS.find(p => p.pin === '3010');
    eq(pin.name, 'Anthony Graziano', 'the PIN list files approvals under the current name');

    // The roster and the PIN list are two separate literals holding one person's name,
    // and an approval is filed under whichever one resolvePin returns. If they drift, an
    // approval is attributed to a person the roster has no record of.
    ctx.MANAGER_PINS.forEach(p => {
      const onRoster = ctx.DEFAULT_CONTRACTORS.some(c => ctx.samePerson(c.name, p.name));
      ok(onRoster, 'every PIN holder is on the built-in roster: ' + p.name);
    });
  }

  group('a stored old name still resolves to the right contact and the right rate');
  {
    // The end-to-end case, driving the real functions: a job saved before the rename.
    const ctx = sandbox({
      fns: ['assignedTCContact', ...NAME_FNS],
      vars: ['PERSON_NAME_ALIASES', 'DEFAULT_CONTRACTORS'],
    });
    ctx.contractors = [];

    // ⚠ THE ROSTER IS OVERRIDDEN WITH A DISTINGUISHING PHONE ON PURPOSE, and the first
    // version of this test was worthless without it. assignedTCContact's own fallback IS
    // the managing partner, so asserting his name and mailbox passes whether the lookup
    // resolved or fell through — the test could not tell a hit from a miss, and stayed
    // green when samePerson was reverted. The roster now carries a number the fallback
    // does not, so only a real match can produce it.
    ctx.DEFAULT_CONTRACTORS = [
      { id: 'default-1', name: 'Anthony Graziano', role: 'TC', phone: '(561) 555-0101', email: 'anthony@havellinpalmbeach.com' },
    ];
    const hit = ctx.assignedTCContact({ tc: 'Anthony Graziano Sr' });
    eq(hit.name, 'Anthony Graziano', 'a job staffed before the rename still finds its concierge');
    eq(hit.phone, '(561) 555-0101', 'off the roster record — not the hardcoded fallback');
    eq(hit.email, 'anthony@havellinpalmbeach.com', 'with the right mailbox');

    const rates = sandbox({
      fns: ['getTCCostRate', 'activeCostRates', ...NAME_FNS],
      vars: ['PERSON_NAME_ALIASES', '_estimateCostPin'],
      stubs: {
        COST_RATES: { founderTC: 100, contractorTC: 60, psStandard: 30, psSenior: 35 },
        CONTRACTOR_TC_NAME: 'Contractor — TC',
        DEFAULT_CONTRACTORS: [{ name: 'Anthony Graziano', role: 'TC', rate: 111 }],
        contractors: [],
      },
    });
    // Without samePerson this returns the $100 founder fallback — close enough to look
    // right on a margin panel, and wrong on every job the person is actually staffed on.
    eq(rates.getTCCostRate('Anthony Graziano Sr'), 111, 'and is costed at his own rate, not the fallback');
  }
};
