# Hours Review → QuickBooks — Design

Status: **designed, not built.** Drafted 2026-07-29.

Hours are logged in the Havellin app by the Transition Concierge, reviewed and signed off at
the end of each job (or weekly on jobs that run longer than a week), and the reviewed hours
push to QuickBooks Online as **raw hours carrying no rates**.

Rates stay separated by system on purpose: QuickBooks holds what founders and contractors are
**paid**; the app holds what clients are **billed**. Neither learns the other's numbers. See
§5a — this works end-to-end for founders on payroll, and leaves one manual step for 1099s that
no amount of code on our side removes.

---

## 0. Decision: no third-party time tracker

Evaluated and rejected. Kept in §9 for the record.

The app already holds everything a tracker would produce. Havellin's pricing bills
`PS = n × H` — crew size × hours on site — and under the working-supervisor model the
concierge is on site for every crew hour by design (`H = W / (n + α)`). So the facts billing
needs are: how many crew, how many hours, which days. That is one entry, made by someone
already standing there.

Three things decided it:

1. **Per-seat pricing is the wrong shape for a churning 1099 roster.** QuickBooks Time and
   most of the category price per user per month. Clockify's free tier was capped at 5 users
   in April 2026 (most review articles still say "unlimited" and are stale).
2. **The classification risk runs the wrong way.** Requiring 1099 contractors to clock in on
   a company system on a company schedule with GPS is *behavioral control* — an IRS
   common-law factor weighing toward employee classification. Not a prohibition, but not a
   free move either, and worth ten minutes with counsel before it becomes standard practice.
3. **A tracker buys no QuickBooks linkage we don't already have.** The push to QB is the same
   work either way. A tracker would only change where the hours originate.

The TC owns the timesheet. That is defensible for what it is: time recorded by the person
responsible for the job, at the moment, on a job where one concierge is present for every
crew hour anyway. Not GPS proof — but accurate, and the accuracy is structural rather than
a matter of trust.

**Revisit only if** contractors begin disputing hours as a pattern, or the roster grows past
the point where one concierge is present for all crew time.

---

## 1. What is already built — verified against the code

Daily tracking and deviation detection are live. This section is the baseline; §2 is what's
missing.

`saveLogEntry()` (`havellin.html:9928`) writes one entry per date per job, `members[]` tagged
`TC` / `PS`. Every save immediately fires `updateLogSummary()` and `renderProjection()`, so
deviation recomputes as hours land rather than at invoicing.

`computeProjection()` (`10712`) is the forward model: actual hours ÷ fraction of room hours
complete, projected to completion, banded.

| Band | Condition |
|---|---|
| red | (≥15% complete AND projected ≥ 140% of estimate) OR (≥35% complete AND projected > 115%) |
| amber | projected > 105% of estimate |
| preliminary | total logged below `PROJ_CREW_DAY` (7 hrs) — noise floor |
| nodata | no room complete yet |

Room completion is graded per role — `TC_DONE_STATUSES` counts `locked/packed/complete`,
`PS_DONE_STATUSES` only `packed/complete` (`10709`) — so the two projections move
independently. Rooms marked `excluded` (homeowner-handled) are dropped from both.

Four places surface a deviation today:

| Where | Basis | Threshold |
|---|---|---|
| Log Hours panel (`10049`) | hours-to-date vs estimate | >100% warn, >115% error |
| Projection card (`10808`) | **projected** hours | bands above |
| Client dashboard bars (`6919`) | hours-to-date, per role | 90% / 115% |
| Final invoice PIN gate (`10539`) | **dollars**, ±15% of `est.havellinTotal` | manager PIN unlocks |

Also shipped: `renderInvoice()` blocks an hourly final when no hours are logged rather than
issuing a credit invoice (commit `755880b`), with fixed-price and fee-only jobs exempt.

---

## 2. Gaps found

### 2a. The contractual 15% rule is on hours; the invoice gate is on dollars

The agreement says (`5154`, `5214`):

> If actual **hours** exceed the estimate by more than 15%, Havellin will notify the client
> before proceeding.

Hours, and the duty is *prospective* — during the job, before continuing work. The invoice
gate is a *dollar* variance against `est.havellinTotal` (`10539`), which is a different
measure of a different thing at a different time. They diverge in both directions: a job at
118% of estimated hours with vendor actuals landing under estimate can stay inside ±15% on
dollars, so the invoice stays quiet about a threshold the agreement already tripped mid-job.

**Nothing records that the notice was given.** The app can detect the breach and cannot
demonstrate compliance. This is the largest gap here — larger than the review question — and
the cheapest to close.

### 2b. Under-logging is indistinguishable from efficiency

A job active eight days with three log entries reads as "under estimate, on track." It is the
most dangerous false negative in the system, because the projection presents partial data as
reassurance. Nothing compares logged days against elapsed days.

### 2c. Every deviation notice is passive

All four surfaces in §1 require someone to already be looking at that job's tab. An
over-trending job is invisible from the client list.

### 2d. No review state on hours

Every entry is immediately live and billable. Entries can be deleted individually
(`deleteLogEntry`, `9987`) but there is no sign-off, so nothing distinguishes a considered
timesheet from a half-finished one — and the final bills both identically.

### 2e. The midpoint invoice does not consult the log

`totalMidBasis` (`10263`) bills 75% cumulative off the *estimate's* labor (`estLaborNet`);
only the final uses `actLaborNet`. Vendor fees are trued from the midpoint on, labor only at
the final. This is correct as designed, but it means a midpoint hours review is not a billing
control — see §3b.

---

## 3. The review checkpoint

### 3a. Cadence — job end, or weekly, whichever comes first

Most estate jobs run days rather than weeks, so **job end is the common case** and the weekly
rule is the overflow for long ones. A short job therefore reviews once, complete, rather than
in two partial slices — which also makes its QB push a single write.

Review at the end of a long job alone is not workable: three weeks of hours is unreviewable
in practice, because nobody reconstructs day four. Weekly it is five rows against a fresh
memory.

New fields on each log entry:

```js
{
  id: 1753800000000,
  date: '2026-07-20',
  activity: 'Pack out — primary suite',
  members: [{ name: 'Anthony Graziano Sr', role: 'TC', hours: 7.97 }],
  reviewed:   true,              // ← NEW
  reviewedBy: 'Ashley …',        // ← NEW
  reviewedAt: '2026-07-26T18:04:11Z',
  period:     '2026-W30',        // ← NEW: review batch key; 'job-end' for short jobs
  qbo:        { timeActivityId: '187', syncToken: '0', billId: null }   // ← NEW, see §5
}
```

Reviewed entries render read-only in the log history (no `✕`). Corrections go through an
explicit unlock, which clears `reviewed` and — critically — must also reverse anything
already pushed (§5c).

**Do not pre-round hours.** Store exact fractional hours. The existing code sums first and
rounds once (`10168`), which is correct; rounding each row before summing compounds drift,
and at $150/hr each 0.05h is $7.50.

### 3b. Midpoint — acknowledgment, not a billing gate

Because the midpoint bills off the estimate (§2e), gating it on hours review would be
ceremony. Gate it on the *projection being looked at*: before the midpoint sends, surface
hours-vs-plan and the projection band. Amber or red then becomes a change-order decision at
the one point where it can still change the outcome. After the final it is a write-off
argument.

### 3c. Final — hard gate

Unreviewed entries block the final. Same mechanism as the zero-hours guard already shipped
(`invBlocked`, `10518`), and the same reasoning: the number isn't unusual, it's unfinished,
and no approval makes it correct. The existing guard blocks a final with no hours; this
extends it to a final with unsigned hours.

Deliberately **not** routed through `invRequiresApproval` — that flag means "a manager can
PIN this open," and a manager cannot PIN away a timesheet nobody has read.

### 3d. Notice-of-overage capture

When hours cross 115% of estimate, capture that the client was told: date, method, who, and
what they were told. Stored on the job, rendered on the dashboard, and included in the job
record. This is what turns §2a from a detectable breach into a demonstrable compliance step.

---

## 4. What review triggers

Review is the authorization event. Reviewed hours become eligible for:

1. **The final invoice** (§3c) — already the consumer of `actTC` / `actPS`.
2. **The QuickBooks push** (§5).
3. **The CSV export** (§6) — one row per person per day per job, reviewed rows only.

Unreviewed hours still feed `computeProjection()` and every deviation surface. The projection
must stay live as the job runs; withholding hours from it until sign-off would blind the one
early-warning system that works.

---

## 5. The QuickBooks push

### 5a. Push raw hours only — no rates cross the wire

**Decided 2026-07-29.** The push writes `TimeActivity` — person, day, job, hours — and carries
**no rate of any kind**. Pay rates live in QuickBooks; client billing rates live in the app.
Neither system learns the other's numbers.

This is the right split, and it makes Phase 4 substantially smaller. But it only completes the
picture for one of the two worker types, and the difference matters:

| | Where the pay rate lives | Do hours become money automatically? |
|---|---|---|
| **Founders on QB Payroll** | Employee record in QB | **Yes.** Hours → payroll → wages → W-2. Works exactly as intended. |
| **1099 contractors** | Nowhere in QB | **No.** See below. |

**QuickBooks generates a 1099 from payments made, not from hours logged.** The 1099 report
reads bills paid, checks and expenses tagged to a vendor; it does not read `TimeActivity`. And
a QBO vendor record has no hourly cost-rate field, so QB cannot turn 8 hours into $800 owed.
(This is precisely the gap QuickBooks Time fills, and part of why it is priced per seat.)

So for the 1099 side, something must still create the payment. Two options, and the first is
the recommended start:

1. **A human enters the bills in QB each period.** Minutes of work, no code, and QB remains
   the only place a contractor cost rate exists — which is the whole point of the decision
   above.
2. **The app pushes a `Bill` computed from `DEFAULT_CONTRACTORS[].rate`** (`15141`). Removes
   the manual step but puts a cost rate back in the app. Deferred, not rejected.

Either way the hours record lands in QB immediately. Note where the cost actually hits the
P&L-by-job: it arrives with the **bill**, not with the time entry. `TimeActivity` for a vendor
is a time record, not a cost — with no rate attached there is no dollar figure for it to
contribute. Worth being clear about, because "push hours for job costing" implies otherwise.

**The app still needs its own cost rate,** and that is not duplication. The margin panel costs
the concierge at engaged hours during estimating — before anything exists in QB at all.
Different purpose, different moment, and it must not be confused with what QB pays.

### 5a-bis. Mark the pushed time NOT billable

The app generates client invoices. If hours arrive in QBO flagged `Billable`, QBO will offer to
invoice them as well — the same hours billed twice out of two systems, which is the exact
failure the zero-hours final guard exists to prevent, one system further downstream.

Set `BillableStatus: NotBillable`. Cheap to prevent, expensive to discover from a client.

### 5b. It cannot run in the browser

`havellin.html` is a static file on GitHub Pages. It cannot hold a client secret, complete an
OAuth redirect, or store a refresh token. The push lives in Apps Script —
`apps-script/qbo-sync.gs`, as an additional file in the existing project, following
`quo-sync.gs` exactly: key material in Script Properties, `testQboAuth` before anything else,
dry-run then commit, and **every entry point argument-free** because the Apps Script Run menu
passes no arguments.

So "automatically on review" resolves to: review writes the flag → `saveLogData()` already
posts it to the sheet → a time-driven trigger picks up reviewed-and-unpushed entries. Near
real time, not instant. Worth saying plainly so the behaviour isn't a surprise.

### 5c. Write-back is mandatory here — unlike the Quo sync

The Quo sync deliberately has **no write-back**: it reads Quo for everything under our
sources, builds `externalId → id` in memory, and derived state cannot drift from what Quo
holds. That design does not transfer. QBO has no equivalent searchable external key, and
every QBO update requires the object's `Id` **and** its current `SyncToken`. Both must be
stored per log entry (the `qbo` field in §3a).

Consequences:

- **Upsert against the stored `Id`, never append.** A corrected week must update, not
  duplicate. Same failure shape as a double-counted import, except in the books rather than
  on an invoice.
- **A stale `SyncToken` fails the update.** QBO increments it on every write, including
  writes made by a human in the QBO UI. Re-read before update, or handle the version error
  by re-reading and retrying once.
- **Unlocking a reviewed entry must reverse the push,** not just clear the flag. If the
  period's `Bill` has already been paid, it cannot be silently amended — that case needs to
  surface to a human rather than resolve itself.

### 5d. The refresh token rotates

QBO OAuth 2.0: access token ~1 hour, refresh token ~100 days, **and the refresh token rotates
on use.** The new one must be written back to Script Properties on every refresh or the sync
dies silently on its second run. This is the single most likely way this integration breaks,
and it breaks quietly.

Initial authorization needs a browser round-trip. Google's `apps-script-oauth2` library
handles this and is the intended path.

### 5e. Do not auto-push a job that is red on projection

Reviewed hours on a job that has blown past 115% should not quietly become cost in the books
before someone has decided about a change order. Otherwise the accounting system of record
silently ratifies an overage nobody signed off on, and the change-order conversation happens
after the cost is already booked.

Gate the push on the projection band, or at minimum route red-band periods to a held queue
that names what it is holding and why. Silence is the one unacceptable option.

### 5f. Verify against the live API before building

Taken from working knowledge of the QBO API and **not yet confirmed against a real token**.
Confirm each before designing on it:

- `TimeActivity` accepts `VendorRef` for a 1099 (vs `EmployeeRef`), and whether `NameOf` must
  be set explicitly.
- **Whether `TimeActivity` will post with no rate at all** — §5a depends on this. If QBO
  requires an `HourlyRate`, the no-rates decision needs revisiting rather than working around.
- Whether `TimeActivity` exposes any usable external-id field — if it does, §5c gets simpler.
- Whether the founders exist in QB as `Employee` or `Vendor`, since that determines which ref
  the push uses per person and whether payroll picks the hours up at all (§8.2).
- Sandbox first: `https://sandbox-quickbooks.api.intuit.com`, production
  `https://quickbooks.api.intuit.com/v3/company/<realmId>/`.

---

## 6. CSV export

One row per person per day per job, reviewed rows only. Worth building **even with the push
running**: it is the reconciliation artifact when QB and the app disagree, and the fallback
the first time the token rotation bites (§5d). It is also the cheap path — if the push slips,
billing and payroll still work.

---

## 7. Phases

**Phase 1 — review checkpoint (~1 day, no QB dependency)**
1. `reviewed` / `reviewedBy` / `reviewedAt` / `period` on log entries; reviewed rows
   read-only, with an explicit unlock.
2. Review & sign-off UI on the Job Plan tab. Job-end and weekly batching, job-end default.
3. Final-invoice hard gate on unreviewed entries (§3c).
4. Logged-days vs elapsed-days reconciliation on the projection card, and a staleness flag
   for an active job with no recent entry (§2b).
5. Deviation chip on the client list row (§2c).

**Phase 2 — notice capture (~half a day)**
6. Overage notice record on the job: date, method, who, what was said (§3d).
7. Align the invoice-stage language with the agreement's hours basis (§2a).

**Phase 3 — CSV export (~half a day)**
8. Reviewed-hours export, per job and per period.

**Phase 4 — QBO hours push (~2–4 days, the OAuth is most of it)**
9. `apps-script/qbo-sync.gs`. `testQboAuth`, then `dryRunQboPush`, then `pushQbo`.
10. OAuth 2.0 with refresh-token write-back (§5d). Sandbox first.
11. `TimeActivity` per person per day, **no rate**, `BillableStatus: NotBillable` (§5a,
    §5a-bis); store `Id` + `SyncToken` back on the entry.
12. Red-band hold queue (§5e). Reversal path for unlocking a pushed entry (§5c).
13. Time-driven trigger. Per-job "hours last pushed" timestamp, so a stale push is
    distinguishable from a job nobody worked.

**Phase 5 — optional, deferred**
14. `Bill` per contractor per period from `DEFAULT_CONTRACTORS[].rate`, if entering bills by
    hand in QB becomes the bottleneck (§5a option 2).

Phases 1–3 are worth doing regardless of whether Phase 4 ever ships.

---

## 8. Open decisions

1. ~~Does review push `TimeActivity` only, or `Bill` as well?~~ **Decided: `TimeActivity`
   only, no rates** (§5a). Bills are Phase 5 and may never be needed.
2. **Are the founders on QB Payroll as employees, or taking owner draws?** (§5a) Decides
   whether the hours push completes the founder pay loop by itself or whether founder pay is
   in the same manual position as the 1099s. Cheap to answer, and it changes nothing about
   the build — but it changes what the push is *worth*.
3. **Who can sign off?** Any TC on their own hours, or only the assigned concierge? A TC
   signing off on their own time is the norm in a two-founder firm but is worth stating
   rather than defaulting into.
4. **Can a TC unlock their own reviewed period,** or does that need the manager PIN? Leans
   PIN once anything has been pushed.
5. **Which 15% is the contractual one** (§2a) — the agreement says hours; confirm that is
   intended, since the invoice gate reads dollars.
6. **Historical backfill** into QBO, or cutover-date forward only?

---

## 9. Appendix — the vendor evaluation, for the record

Kept so the decision in §0 can be re-examined without redoing the work. Prices are as of
2026-07-29 and approximate; the category is actively tightening free tiers, so re-check
anything here before relying on it.

| Tool | Free tier | Paid model | API on free/cheap tier | Auth |
|---|---|---|---|---|
| Jibble | Unlimited users, incl. GPS | ~$6–11/user/mo | Yes — personal access token | API key |
| Homebase | 1 location, ~10–20 employees | ~$25/location/mo, unlimited employees | Partner-oriented; assume CSV only | — |
| Clockify | **5 users** (cut from unlimited, Apr 2026) | ~$4–12/user/mo | Yes — `X-Api-Key` | API key |
| Connecteam | ≤10 users | per user | Expert tier only — gated too high | `X-API-KEY` |
| QuickBooks Time | none | per user/mo | Yes (own-account app) | OAuth 2.0 + refresh rotation |

If this is ever reopened, **Jibble** was the leading candidate — free unlimited users
*including* GPS is a combination nobody else offers free, and API-key auth is materially
simpler in Apps Script than OAuth. Two things were never confirmed first-hand (the vendor site
blocks automated fetch): that the free tier is still uncapped on users, and that API access is
genuinely on the free tier rather than quietly a paid feature.

**QuickBooks Time** notes, verified 2026-07-29, in case the calculus changes:

- API live and maintained; reference docs last updated 2026-05-19.
- Base URL `https://rest.tsheets.com/api/v1`; OAuth 2.0 `Bearer` token.
- **Own-account app creation needs no Intuit partner tier**: *Feature Add-ons → Manage
  Add-ons → API Add-On → Install → Add a new application*, redirect `http://localhost:33333`.
  The Gold/Platinum "Time API" partner tier in search results is a *different* product — the
  ISV-facing platform API for shipping apps into other people's QuickBooks accounts.
- Jobcodes are hierarchical, rendered `Parent : Child`. One per job would be the mapping,
  flat rather than nested — under working-supervisor pricing the concierge bills TC for all
  on-site time, so role follows the person, never the task, and a role sub-selection in the
  field would be a choice with no billing consequence and one more thing to get wrong at 7am.
- QBT is included with QuickBooks Workforce Premium and Elite.
