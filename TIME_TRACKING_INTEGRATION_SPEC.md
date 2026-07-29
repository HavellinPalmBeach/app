# Time Tracking → Havellin — Integration Scope

Status: **scoping. Vendor NOT chosen.** Drafted 2026-07-29.

Goal: crew and founders clock in on a time-tracking app in the field; that app feeds payroll
and accounting; the Havellin app stops being a hand-keyed timesheet and becomes a consumer
of tracked hours for billing.

Originally scoped against QuickBooks Time. QBT is priced per user per month, which does not
survive a 1099 crew that cycles in and out — see §0.

---

## 0. Vendor choice — open

### 0a. First decide whether this is needed at all

**How are the PS crew actually paid?** This decides the whole project, and it should be
settled before any vendor is.

Havellin's own pricing model bills `PS = n × H` — crew size × hours on site — and the
concierge is on site for every crew hour by design (`H = W / (n + α)`). So for **billing**,
the required facts are: how many crew, how many hours, which days. That is one entry, made
by someone who is already standing there, which is exactly what the app does today.

Individual per-person tracking is only load-bearing for:

1. **Paying the crew** — and only if they are paid *hourly*. A day rate or a per-job rate
   needs no clock.
2. **Dispute defence** — a contractor contesting hours.

If the crew are on day rates, buying a seat-based tracker to reconstruct a number the
concierge already knows is ceremony, and the honest recommendation is to buy nothing: keep
the app's log for billing, and put only the founders on a tracker if they want personal
records. If the crew are hourly, individual records are genuinely needed and §0b applies.

### 0b. If individual tracking is needed — the market as of 2026-07-29

Per-seat pricing is the wrong *shape* for a roster that churns. Two shapes fit: free
unlimited users, or flat per-location.

| Tool | Free tier | Paid model | API on free/cheap tier | Auth |
|---|---|---|---|---|
| **Jibble** | **Unlimited users, incl. GPS** | ~$6–11/user/mo for Premium+ | Yes — personal access token | API key |
| **Homebase** | 1 location, ~10–20 employees | **~$25/location/mo**, unlimited employees | Partner-oriented; assume CSV export only | — |
| **Clockify** | **5 users** (cut from unlimited, Apr 2026) | ~$4–12/user/mo | Yes — `X-Api-Key` | API key |
| **Connecteam** | ≤10 users | per user | **Expert tier only** — gated too high | `X-API-KEY` |
| **QuickBooks Time** | none | per user/mo | Yes (own-account app) | OAuth 2.0 + refresh rotation |

**Clockify's free plan was capped at 5 users in April 2026** — most review articles still say
"unlimited" and are stale. Kiosk mode, billable hours, shared reports and report export also
moved to paid, and free reports are limited to a one-month date range. Anyone choosing
Clockify on the strength of its old free tier is choosing a paid plan.

**Prices above are approximate and must be re-checked at signup.** The Clockify change is
three months old; the whole category is tightening free tiers, so treat any free-tier claim
in this table — including Jibble's — as needing confirmation before it is designed around.

**Leading candidate: Jibble.** Free tier covers unlimited users *including* GPS, which is
the combination nobody else offers free. Auth is a personal access token rather than OAuth,
which is materially simpler in Apps Script and matches the pattern `quo-sync.gs` already
runs in production.

**Confirm before committing:** (a) the free tier is still uncapped on users, and (b) API
access is genuinely on the free tier and not quietly a paid feature. Both were taken from
search results citing Jibble's own help pages; the vendor site blocks automated fetch, so
neither was read first-hand.

**Homebase** is the hedge if per-location flat pricing is preferred to per-seat. Its pricing
shape is right and it syncs to QuickBooks Online, but its API looks partner-oriented rather
than open, which likely means CSV export only — Phase 1 forever, with no live mid-job
projection (§4).

### 0c. Worth raising before rolling any of this out to contractors

Requiring 1099 contractors to clock in and out on a company system, on a company schedule,
with GPS, is **behavioral control** — one of the IRS common-law factors weighing toward
employee classification. It is one factor among several, not a prohibition, and plenty of
legitimate contractor arrangements keep time records for billing. But adding
surveillance-grade tracking to a cycling 1099 crew is not a free move, and it is worth ten
minutes with counsel before it becomes standard practice. There are estate attorneys in the
partner directory who will know who to ask.

This also argues for the lightest tool that answers the billing question, rather than the
one with the most control features.

---

## 1. What this replaces — and what it does not

The app has **two** unrelated things called "hours". Only one of them is in scope.

| | What it does | A tracker replaces it? |
|---|---|---|
| **Estimator hours engine** (`JOB_STEPS`, work pool, `H = W / (n + α)`) | *Predicts* hours to price a job before work starts | **No.** No tracker has a forward model. Untouched. |
| **Hours log** (`jobLogs`, Log Hours on the Job Plan tab) | *Records* actual hours per person per day, tagged TC or PS | **Yes.** This is the whole scope. |

Worth being explicit because "use a time tracker not the hours calculator" reads like it
targets the estimator. It doesn't — the estimator still prices the job, and the tracker just
replaces the clipboard that records what actually happened.

**What a tracker buys beyond killing double entry:** clock-in/out with GPS, overtime rules,
break tracking, payroll export, and a defensible timesheet record per contractor. That last
one is the real business case — a 1099 crew member disputing hours is currently answered by
a number somebody typed into a phone. (See §0c for the other side of that coin.)

---

## 2. The data contract — what the app actually needs back

Vendor-independent. The final invoice needs two numbers per job: `actTC` and `actPS`
(`havellin.html:10160`). But the log feeds three other things, and they need more than
totals:

- `computeProjection()` (`10638`) — projects the job to completion from hours-so-far ÷
  rooms-complete, and throws the red **Change Order Required** flag at 115% of estimate.
  Needs hours *accruing over time*, not a lump at the end.
- The final invoice's per-person team table — needs **name, role, hours** per person.
- `getJobActuals()` (`6559`) — client dashboard actuals, incl. distinct days worked.

So the import needs **one row per person, per day, per job** — which is what every tracker in
§0b produces. Shapes match regardless of vendor.

Target shape, unchanged from today except the two new fields:

```js
jobLogs[jobId] = [{
  id: 1753800000000,
  date: '2026-07-20',
  activity: 'Pack out — primary suite',   // ← tracker's note field
  members: [{ name: 'Anthony Graziano Sr', role: 'TC', hours: 7.97 }],
  extId: 'jibble:448812',                  // ← NEW: vendor-prefixed external id, the merge key
  src: 'tracker'                           // ← NEW: 'tracker' | 'manual'
}]
```

Prefix the external id with the vendor so a future migration cannot collide with ids already
stored under a different system.

**Do not pre-round hours.** Store exact fractional hours (trackers report seconds). The
existing code already sums first and rounds once (`10168`), which is correct; rounding each
row to 0.1h before summing would compound drift, and at $150/hr each 0.05h of error is $7.50.

---

## 3. The mapping model

Three things must map. Vendor-independent — every tool in §0b has some notion of a
project/job code and a user.

### 3a. Tracker project/jobcode → Havellin job — **one per job**

Most trackers support nesting (`Parent : Child`). Two options: flat (one code per job), or
nested with role underneath.

**Recommend flat.** Under the working-supervisor pricing model the concierge bills at the TC
rate for *all* on-site time, including hours spent working alongside the crew
(`billed TC = H + off-site`). So role follows the *person*, never the task — a role
sub-selection in the field would be a choice with no billing consequence and one more thing
to get wrong at 7am. One tap, one code.

Revisit only if travel or off-site coordination should appear separately on the invoice.

Name the code with `hvlId` as a **prefix** so matching is a parse, not a fuzzy name-compare:
`HVL-0001 — Pressly Estate`. Create it via the API when a job goes active so the format is
guaranteed and nobody hand-types it.

### 3b. Tracker user → crew member + TC/PS role — **already half built**

`DEFAULT_CONTRACTORS` / `contractors` records already carry `name`, `role: 'TC'|'PS'`, and a
cost `rate` (`havellin.html:15141`). One new field:

```js
{ id:'default-1', name:'Anthony Graziano Sr', role:'TC', trackerUserId: '…', ... }
```

Map by tracker user id, never by name — names drift, and a name-match failure would silently
drop somebody's hours off an invoice rather than erroring.

**An unmapped user must fail loudly.** Hours belonging to nobody must not vanish into a
rounding difference. This matters more with a churning roster: a new crew member who was
never mapped is the normal case, not the exception.

### 3c. Duration → hours

`hours = seconds / 3600`, kept at full precision per §2.

---

## 4. Two paths

### Option A — CSV import

Every tracker exports timesheets to CSV. Add a paste-or-upload box on the Log Hours tab that
parses, maps, and merges.

- **Effort:** ~1 day. No OAuth, no Apps Script deploy, no token maintenance.
- **Cons:** a manual step every billing cycle that somebody has to remember. Column headers
  can drift with a vendor UI change and break the parser silently.
- **The real cost:** hours only land when someone imports. **The mid-job projection and its
  change-order trigger go dark** — that early-warning system depends on hours accruing while
  the job runs, not arriving at invoicing time.

### Option B — API pull via Apps Script

A scheduled Apps Script trigger pulls timesheets for active jobs and merges them in.

- **Effort:** ~2–4 days depending on auth. An API-key tracker (Jibble, Clockify) is at the
  low end; OAuth with refresh rotation (QBT) at the high end.
- **Pros:** hands-off, projection stays live, the tracker is unambiguously the source of
  truth, same shape as the Quo sync already in production.

**Where the code lives:** Apps Script, not the browser. `havellin.html` is a static file on
GitHub Pages — it cannot hold a client secret, complete an OAuth redirect, or store a
refresh token. Precedent is set: `apps-script/quo-sync.gs` sits as a second file in the same
project, keys in Script Properties, `testQuoAuth` before anything else, dry-run then commit,
every entry point argument-free because the Run menu passes none. Follow that shape exactly.

**This is a real selection criterion.** An API-key tracker collapses Phase 2 to roughly the
Quo sync's complexity. OAuth with rotating refresh tokens is the single largest chunk of work
in this project and buys nothing functional.

### Recommendation — **B, staged through A**

Phase 1 builds the CSV import. Phase 2 swaps the *input* from a pasted CSV to an API pull and
throws nothing away, because the parse → map → merge → write pipeline is identical.

The reason to stage it this way isn't caution about the API — it's that the risky part is not
the transport, it's the **merge semantics** (§5). Phase 1 proves that logic on the cheap
path, against real exported data, with no auth in the way. It also **de-risks the vendor
choice**: a CSV parser is a day's work to retarget, so Phase 1 can ship before the vendor is
locked, and a wrong pick costs a day instead of a rebuild.

---

## 5. Merge semantics — the part that will actually bite

Everything else here is plumbing. This is the design, and it is vendor-independent.

**Upsert by `extId`, never append.** Today `saveLogEntry` pushes (`9957`). An import that
pushes would double every hour on any re-run or overlapping date range, and the failure mode
is an over-billed client — the exact category of bug the §8 guard was added to stop.

**Deletions must propagate.** A timesheet deleted or corrected in the tracker has to
disappear here, or the two disagree and the tracker is right. Same reconciliation the Quo
sync already does: diff what we hold against what the source produces, report the leftovers,
prune on confirm.

**Manual and imported entries must not both count.** Once a job is linked to a tracker code,
someone logging by hand *and* clocking in double-bills. **Recommend locking the manual form
for linked jobs with an explicit override** — a warning that only appears at invoicing time
is a warning that gets read after the client already has the number.

**Only closed entries.** Never import a running shift; its duration is a snapshot.

**Approval state.** If the tracker has timesheet approval, decide whether a final may bill
unapproved time. Recommend: import everything so the projection stays live, but flag
unapproved hours on the *final* and let the ±15% PIN gate do the rest. Note that Clockify
moved approvals to paid, so on its free tier this is moot.

---

## 6. Phases

**Phase 1 — CSV import (~1 day, vendor-agnostic)**
1. `trackerUserId` on the contractor record + a mapping UI on the Contractors tab.
2. Parser + mapper + the §5 merge, behind a paste box on the Log Hours tab.
3. Import preview: rows in, rows matched, rows unmapped, hours by role — **before** commit.
4. `extId` / `src` on log entries; imported rows render read-only in the log history.

**Phase 2 — API pull (~2–4 days, vendor-specific)**
5. Tracker API key into Script Properties.
6. `apps-script/time-sync.gs` — `testTrackerAuth` first, then `dryRunPull`, then `pullHours`.
7. Auto-create the job code when a job goes active; store `trackerJobId` on the job.
8. Time-driven trigger, nightly. Stale/deleted-entry reconciliation.

**Phase 3 — optional**
9. Push job costing to QuickBooks Online, if the accounting side wants it.
10. Retire the manual log form for linked jobs entirely.

---

## 7. Decisions needed before building

1. **How are the PS crew paid — hourly, day rate, or per job?** (§0a) Decides whether any of
   this is needed. Answer this first.
2. **Do the 1099 crew get logins at all?** If they won't install an app, this only ever
   captures founder hours and the PS side stays hand-keyed — Phase 1 only, permanently.
3. **Vendor** (§0b). Leading candidate Jibble, pending the two confirmations noted there.
4. **Flat or nested job codes** (§3a). Recommend flat.
5. **Lock the manual form** for linked jobs, or allow mixed sources with a flag? (§5)
6. **Bill unapproved time on a final?** (§5)
7. **Historical backfill**, or tracker-from-cutover-date only?

---

## 8. If the choice is QuickBooks Time — verified notes

Kept because QBT remains the best *payroll and accounting* fit even though its per-seat
pricing is wrong for a churning roster. Relevant only if the crew turns out not to need seats
(e.g. founders-only tracking, per §0a).

**Verified 2026-07-29:**
- API live and maintained; reference docs last updated 2026-05-19.
- Base URL `https://rest.tsheets.com/api/v1`; OAuth 2.0 access token as a `Bearer` header.
- Endpoints cover timesheets, jobcodes, users, customers, groups.
- **Own-account app creation needs no Intuit partner tier**: *Feature Add-ons → Manage
  Add-ons → API Add-On → Install → Add a new application*, redirect URL
  `http://localhost:33333`. The Gold/Platinum "Time API" partner tier in search results is a
  *different* product — the ISV-facing Intuit platform API for shipping apps into other
  people's QuickBooks accounts. Not needed here.
- Jobcodes are hierarchical, rendered `Parent : Child`.
- QBT is included with QuickBooks Workforce Premium and Elite.

**Unconfirmed (docs block automated fetch — check against the live API with a real token):**
- Exact timesheet field names — expected `id, user_id, jobcode_id, date, duration, notes,
  type, on_the_clock, locked` — and filters `start_date / end_date / user_ids / jobcode_ids`.
- Pagination (`page` / `per_page`, `more` flag).
- **Whether the refresh token rotates on use.** If it does, the sync must write the new one
  back to Script Properties on every refresh or it dies silently on the second run. Assume it
  rotates until proven otherwise.

---

## 9. Related change already shipped

`renderInvoice()` now blocks an hourly final when no hours are logged, rather than issuing a
credit invoice (commit `755880b`). That guard becomes *more* load-bearing once hours arrive
over the wire, since a sync that silently fails presents exactly as an unlogged job. Phase 2
should surface a per-job "hours last synced" timestamp so a stale pull is distinguishable
from a job nobody worked.
