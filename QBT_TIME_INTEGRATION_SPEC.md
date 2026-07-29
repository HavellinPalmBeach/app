# QuickBooks Time → Havellin — Integration Scope

Status: **scoping, not built.** Drafted 2026-07-29.

Goal: crew and founders clock in on QuickBooks Time (QBT) in the field; QBT feeds payroll
and accounting; the app stops being a hand-keyed timesheet and becomes a consumer of QBT
hours for billing.

---

## 1. What this replaces — and what it does not

The app has **two** unrelated things called "hours". Only one of them is in scope.

| | What it does | QBT replaces it? |
|---|---|---|
| **Estimator hours engine** (`JOB_STEPS`, work pool, `H = W / (n + α)`) | *Predicts* hours to price a job before work starts | **No.** QBT has no forward model. Untouched by this work. |
| **Hours log** (`jobLogs`, Log Hours on the Job Plan tab) | *Records* actual hours per person per day, tagged TC or PS | **Yes.** This is the whole scope. |

Worth being explicit because "use QBT not the hours calculator" reads like it targets the
estimator. It doesn't — the estimator still prices the job, and QBT just replaces the
clipboard that records what actually happened.

**What QBT buys beyond killing double entry:** clock-in/out with GPS and geofencing,
overtime rules, break tracking, payroll export, and a defensible timesheet record per
contractor. That last one is the real business case — a 1099 crew member disputing hours
is currently answered by a number somebody typed into a phone.

---

## 2. The data contract — what the app actually needs back

The final invoice needs two numbers per job: `actTC` and `actPS` (`havellin.html:10160`).
But the log feeds three other things, and they need more than totals:

- `computeProjection()` (`10638`) — projects the job to completion from hours-so-far ÷
  rooms-complete, and throws the red **Change Order Required** flag at 115% of estimate.
  Needs hours *accruing over time*, not a lump at the end.
- The final invoice's per-person team table — needs **name, role, hours** per person.
- `getJobActuals()` (`6559`) — client dashboard actuals, incl. distinct days worked.

So the import needs **one row per person, per day, per job** — which is exactly what a QBT
timesheet record is. Good news: shapes match.

Target shape, unchanged from today except the two new fields:

```js
jobLogs[jobId] = [{
  id: 1753800000000,
  date: '2026-07-20',
  activity: 'Pack out — primary suite',   // ← QBT timesheet notes
  members: [{ name: 'Anthony Graziano Sr', role: 'TC', hours: 7.97 }],
  qbtId: 448812,                           // ← NEW: QBT timesheet id, the merge key
  src: 'qbt'                               // ← NEW: 'qbt' | 'manual'
}]
```

**Do not pre-round hours.** Store exact fractional hours (QBT gives seconds). The existing
code already sums first and rounds once (`10168`), which is correct; rounding each row to
0.1h before summing would compound drift, and at $150/hr each 0.05h of error is $7.50.

---

## 3. The mapping model

Three things must map. This is where the design decisions are.

### 3a. QBT jobcode → Havellin job — **one jobcode per job**

QBT jobcodes are hierarchical (they render as `Parent : Child`). Two options:

- **Flat — one jobcode per job.** `HVL-0001 — Pressly Estate`. The concierge and crew all
  clock into the same code.
- **Nested — job as parent, role as child.** `HVL-0001 : Concierge`, `HVL-0001 : Crew`.

**Recommend flat.** Under the working-supervisor pricing model the concierge bills at the
TC rate for *all* on-site time, including the hours spent working alongside the crew
(`billed TC = H + off-site`). So role follows the *person*, never the task — which means a
role sub-selection in the field would be a choice with no billing consequence and one more
thing to get wrong at 7am. One tap, one code.

Revisit only if you later want travel or off-site coordination separated on the invoice.

Name the jobcode with `hvlId` as a **prefix** so the match is a parse, not a fuzzy
name-compare: `HVL-0001 — Pressly Estate`. Create it via the API when a job goes active so
the format is guaranteed and nobody hand-types it.

### 3b. QBT user → crew member + TC/PS role — **already half built**

`DEFAULT_CONTRACTORS` / `contractors` records already carry `name`, `role: 'TC'|'PS'`, and
a cost `rate` (`havellin.html:15141`). Only one new field is needed:

```js
{ id:'default-1', name:'Anthony Graziano Sr', role:'TC', qbtUserId: 1234567, ... }
```

Map by `qbtUserId`, never by name — names drift, and a name-match failure would silently
drop somebody's hours off an invoice rather than erroring.

**An unmapped QBT user must fail loudly.** Hours that belong to nobody must not vanish into
a rounding difference. Report them, don't skip them.

### 3c. Duration → hours

`hours = timesheet.duration / 3600`, kept at full precision per the note above.

---

## 4. Two paths

### Option A — CSV import

QBT exports timesheets to CSV. Add a paste-or-upload box on the Log Hours tab that parses,
maps, and merges.

- **Effort:** ~1 day. No OAuth, no Apps Script deploy, no token maintenance.
- **Cost:** nothing beyond the QBT subscription.
- **Cons:** a manual step every billing cycle that somebody has to remember. Column headers
  can drift with a QBT UI change and break the parser silently.
- **The real cost:** hours only land when someone imports. **The mid-job projection and its
  change-order trigger go dark** — that early-warning system depends on hours accruing
  while the job is running, not arriving at invoicing time.

### Option B — API pull via Apps Script

A scheduled Apps Script trigger pulls timesheets for active jobs and merges them in.

- **Effort:** ~3–4 days including the OAuth setup and a live-data shakedown.
- **Cons:** OAuth setup is a one-time manual dance; refresh-token rotation needs handling
  (see §7); requires jobcode discipline in the field.
- **Pros:** hands-off, projection stays live, QBT is unambiguously the source of truth, and
  it's the same shape as the Quo sync already running in production.

**Where the code lives:** Apps Script, not the browser. `havellin.html` is a static file on
GitHub Pages — it cannot hold a client secret, complete an OAuth redirect, or store a
refresh token. Precedent is already set: `apps-script/quo-sync.gs` sits as a second file in
the same Apps Script project, keys in Script Properties, `testQuoAuth` before anything else,
dry-run then commit, every entry point argument-free because the Run menu passes none.
Follow that file's shape exactly — `apps-script/qbt-sync.gs` as a third file.

### Recommendation — **B, staged through A**

Phase 1 builds the CSV import. Phase 2 swaps the *input* from a pasted CSV to an API pull
and throws nothing away, because the parse → map → merge → write pipeline is identical.

The reason to stage it this way isn't caution about the API — it's that the risky part of
this integration is not the transport, it's the **merge semantics** (§5). Phase 1 builds and
proves that logic on the cheap path, against real exported data, with no OAuth in the way.
Phase 2 then changes where the rows come from and nothing else.

---

## 5. Merge semantics — the part that will actually bite

Everything else here is plumbing. This is the design.

**Upsert by `qbtId`, never append.** Today `saveLogEntry` pushes (`9957`). An import that
pushes would double every hour on any re-run or overlapping date range, and the failure mode
is an over-billed client — the exact category of bug the guard in §8 was just added to stop.

**Deletions must propagate.** A timesheet deleted or corrected in QBT has to disappear here,
or QBT and the invoice disagree and QBT is right. Same reconciliation the Quo sync already
does: diff what we hold against what the source produces, report the leftovers, prune on
confirm.

**Manual and imported entries must not both count.** Once a job has a QBT jobcode, someone
logging by hand *and* clocking in double-bills. Options: lock the manual form for
QBT-linked jobs with an explicit override, or keep it open and flag mixed-source jobs on the
invoice. **Recommend locking with an override** — a warning that appears at invoicing time
is a warning that gets read after the client already has the number.

**Only closed timesheets.** QBT `on_the_clock` rows are open shifts with a running duration.
Never import one — the hours are a snapshot of a shift in progress.

**Approval state.** QBT supports timesheet approval. Decide whether the final invoice may
bill unapproved time. Recommend: import everything so the projection stays live, but flag
unapproved hours on the *final* and let the ±15% PIN gate do the rest.

---

## 6. Phases

**Phase 1 — CSV import (~1 day)**
1. `qbtUserId` on the contractor record + a mapping UI on the Contractors tab.
2. Parser + mapper + the §5 merge, behind a paste box on the Log Hours tab.
3. Import preview: rows in, rows matched, rows unmapped, hours by role — **before** commit.
4. `qbtId` / `src` on log entries; imported rows render read-only in the log history.

**Phase 2 — API pull (~3–4 days)**
5. QBT app + OAuth, refresh token into Script Properties.
6. `apps-script/qbt-sync.gs` — `testQbtAuth` first, then `dryRunQbtPull`, then `pullQbtHours`.
7. Auto-create the jobcode when a job goes active; store `qbtJobcodeId` on the job.
8. Time-driven trigger, nightly. Stale/deleted-timesheet reconciliation.

**Phase 3 — optional**
9. Push job costing back to QuickBooks Online, if the accounting side wants it.
10. Retire the manual log form for QBT-linked jobs entirely.

---

## 7. Decisions needed before building

1. **Does Havellin have a QBT subscription yet?** It's priced per active user per month —
   every crew member is a seat. Confirm the cost against actual crew size before committing;
   a large seasonal crew changes the math.
2. **Do 1099 contractors get QBT logins?** If crew won't install an app, this whole thing
   only ever captures founder hours and the PS side stays hand-keyed — which would mean
   Phase 1 only, permanently.
3. **Flat or nested jobcodes** (§3a). Recommend flat.
4. **Lock the manual form** for QBT-linked jobs, or allow mixed sources with a flag? (§5)
5. **Bill unapproved time on a final?** (§5)
6. **Historical backfill** — import existing jobs' hours, or QBT from a cutover date only?

---

## 8. Facts — verified vs. to confirm

**Verified 2026-07-29:**
- API is live and maintained; reference docs last updated 2026-05-19.
- Base URL `https://rest.tsheets.com/api/v1`; OAuth 2.0 access token as a `Bearer` header.
- Endpoints cover timesheets, jobcodes, users, customers, groups.
- **Own-account app creation needs no Intuit partner tier**: in QBT, *Feature Add-ons →
  Manage Add-ons → API Add-On → Install → Add a new application*, redirect URL
  `http://localhost:33333`. The Gold/Platinum "Time API" partner tier that turns up in
  search results is a *different* product — the distributor-facing Intuit platform API for
  ISVs shipping apps to other people's QuickBooks accounts. Not needed here.
- Jobcodes are hierarchical, rendered `Parent : Child`.
- Timesheets carry notes, a billable flag, and a service item.
- QBT is included with QuickBooks Workforce Premium and Elite.

**To confirm during the Phase 2 spike (docs blocked automated fetch; check against the live
API with a real token):**
- Exact timesheet field names — expected `id, user_id, jobcode_id, date, duration, notes,
  type, on_the_clock, locked` — and the list filters `start_date / end_date / user_ids /
  jobcode_ids`.
- Pagination semantics (`page` / `per_page`, and the `more` flag in supplemental data).
- **Whether the refresh token rotates on use.** If it does, `qbt-sync.gs` must write the new
  one back to Script Properties on every refresh or the integration dies silently the second
  time it runs. Assume it rotates until proven otherwise.
- Rate limits.

---

## 9. Related change already shipped

`renderInvoice()` now blocks an hourly final when no hours are logged, rather than issuing a
credit invoice (commit `755880b`). That guard becomes *more* load-bearing once hours arrive
over the wire, since a sync that silently fails now presents exactly as an unlogged job.
Phase 2 should surface a per-job "hours last synced" timestamp so a stale pull is
distinguishable from a job nobody worked.
