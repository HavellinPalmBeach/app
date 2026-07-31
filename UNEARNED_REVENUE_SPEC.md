# Unearned Revenue & QuickBooks Posting Layer — Spec

**Status:** **Steps 0 and 1 of §10 are BUILT** (2026-07-30) — the rush-premium billing defect,
the status-transition hazard, delivery capture, and payment capture across all three stages.
The QuickBooks posting layer itself (§3, §5, §6 guard, §7) remains **specification only**: it is
blocked on the September chart-of-accounts build with Laura and on the open decisions in §9, and
per §10 a posting path must not be built against accounts that do not yet exist.

What changed in the app is listed at each section. Nothing about the QuickBooks integration was
built, and no GL write path exists.

**Supersedes** the July 30 brief *"Claude Code Brief — Unearned Revenue & QBO Posting Layer"*.
Every claim below was verified against `havellin.html` at commit `9e37f3f` (17,406 lines) —
line numbers in the appendix. Where this document disagrees with the brief or with
`Havellin_Chart_of_Accounts_QBO.docx`, the disagreement is called out explicitly in §0 rather
than silently corrected.

**Companion documents:** `LIFECYCLE_AUDIT.md` (payment records, job statuses),
`TIME_TRACKING_INTEGRATION_SPEC.md` (hours → QuickBooks), `PRICING_SCHEMA.md`.

---

## 0. What changed from the brief

The brief was largely accurate and got the hardest trap right — it correctly mapped
`cleanout` → *Estate Settlement* and `home_cleanout` → *Home Cleanout*, which are inverted
from intuition and would have posted two service lines to each other's accounts permanently
had they been mapped by reading labels.

Nine corrections follow.

| # | Item | Status in the brief | Corrected | Built |
|---|---|---|---|---|
| 1 | Rush premium dropped from midpoint + final invoices | Not mentioned | **§1a — live billing bug, blocks everything** | ✅ |
| 2 | Recognition trigger has no backing field | "flag it if they diverge" | **§2b — second blocking prerequisite** | ✅ |
| 3 | Attached Home Prep folds into SMF | Not mentioned | **§6 — decided: 4400 is standalone-only** | n/a — needs no code |
| 4 | The AR debit is the unpaid balance, not the invoiced final | "1200 AR (final balance)" | **§3 — one formula covers refunds too** | spec |
| 5 | `finalDue` can go negative | Not mentioned | §3 | already correct in UI |
| 6 | The three stages bill on three different bases | Implied "50 / 25 / 25" | §3 | spec |
| 7 | Hours are *not* moving to QuickBooks Time | Given as rationale for §4 | **§4 — rationale corrected, recommendation stands** | n/a |
| 8 | `recordPayment` does not exist — the function is `saveDeposit` | Named `recordPayment` | §2a | ✅ |
| 9 | §9a and §9d are already answered | Listed as open | §9 | n/a |
| 10 | `midpointInvoiceSent` is never set — the final invoice was unreachable | Not mentioned | **§2c** | ✅ |

Item 5 needed no fix: `_amtDueBox` already renders a negative balance as a green **Credit**, and
`overUnder < 0` already prints *"came in under estimate — credit applied."* A negative final on a
genuinely under-running T&M job is correct output, not a defect. Fixing the rush premium reduces
spurious negatives but does not remove real ones, and it should not.

---

## 1. Background

Havellin bills on a three-stage milestone schedule. Deposit and midpoint are collected before
the corresponding work is delivered, which makes them **unearned revenue** — a liability, not
income — until the job is delivered.

Account **2200 Unearned Revenue — Client Deposits** (Other Current Liability) receives them.
The final invoice relieves 2200 and recognizes the full job value to a service-line income
account. Five income accounts (4000 / 4100 / 4200 / 4300 / 4400) plus **4900 Discounts &
Allowances** as contra.

**Governing constraint:** the app must not become a bookkeeping system. It produces an invoice
and a *posting instruction*. QuickBooks performs the accounting. No general ledger inside the
app. The app remains the operational source of truth and the only writer to job data.

### 1a. Blocking defect — the rush premium never reaches the invoice — **FIXED**

**This was a client-billing bug independent of QuickBooks, and it had to be fixed before any
posting design could be built on top of the invoice totals.**

`RUSH_PCT` is a flat 20% expedited-delivery premium on the Havellin services total
(`3347`, `3859-3862`). It is quoted, shown as its own line on the client estimate (`5503`),
persisted on the saved estimate (`rushAmt`, `4164`), and included in `est.havellinTotal`
(`4158` stores `havellinTotalDiscounted`, which is `havellinTotal − discountAmt + rushAmt`).

`renderInvoice` contains **zero references to rush** (verified across `11240-11800`). The three
billing bases are:

```js
var totalDepositBasis = ... (est && est.havellinTotal) ...            // 11364 — INCLUDES rush
var totalMidBasis     = estLaborNet + materials + smf + prepFee + legacyFees;   // 11366 — no rush
var totalFinalBasis   = actLaborNet + materials + smf + prepFee + legacyFees + coTotal; // 11367 — no rush
```

The deposit is taken on a basis that includes the premium; midpoint and final rebuild the total
from components and **drop it**.

Worked example — $100k of Havellin services, no discount, rush on:

| | |
|---|---|
| Quoted / client agreed | **$120,000** |
| Deposit — 50% of `est.havellinTotal` | $60,000 |
| Midpoint — 75% × $100k basis − deposit | $15,000 |
| Final — $100k basis − $60k − $15k | $25,000 |
| **Total billed** | **$100,000** |

The premium is lost in full. Where the job also runs under estimate, `finalDue` goes negative
and the app generates a refund to a client who was correctly charged.

For the posting layer specifically: 2200 would accumulate a deposit containing the premium
while recognition credits revenue without it, leaving a permanent unexplained balance in 2200
on **every rush job**. No reconciliation can clear it, because the money is real and the
revenue was never recognized.

There was a third consequence, on the client's own invoice. `overUnder` compares
`havellinTotalDiscounted` against `est.havellinTotal` — a rush-exclusive actual against a
rush-inclusive estimate — so **every rush job that hit its estimate exactly printed
*"Job came in under estimate by $20,000 — credit applied"*** on the final invoice. A phantom
credit, shown to the client, on a job that landed precisely on budget.

**Fixed.** The rate is pinned per saved estimate (`est.rushPct`, the way α is pinned) so moving
`RUSH_PCT` cannot reprice a live job; the amount trues up with each basis so the premium follows
the services actually delivered; fixed-price is excluded because the flat fee already contains
it; and the premium is computed *before* `coTotal` so it is never levied on change orders, which
are priced when they are agreed. The premium now also appears as its own line on the midpoint and
final invoice bodies, so the subtotal reconciles on the page.

The worked example now bills $120,000. `overUnder` reads $0.

**Not fixed, deliberately:** a job running far enough under estimate still produces a negative
final. That is a real refund — the client overpaid through the 75% collected by midpoint — and
the invoice already renders it as a credit. See §0 item 5.

---

## 2. Blocking prerequisites

Two, not one. Neither is optional and neither can be worked around downstream.

### 2a. Payment capture covers only the deposit — **FIXED**

`saveDeposit` (`6931` — the brief calls this `recordPayment`, which does not exist in the file)
hardcodes `stage: 'deposit'` on every payment record (`6963`). `jobPayments()` (`6812`) likewise
reconstructs only deposit-stage records.

**Midpoint and final payments are invoiced but never captured as payment records.**
`depositPaidTotal` (`6833`) and `isJobFunded` (`6843`) only reason about the deposit. Unearned
revenue posting is impossible without this — 2200 cannot be relieved for money the app has no
record of receiving.

Scope:

- Generalize capture so `stage` accepts `deposit` | `midpoint` | `final`.
- Add per-stage paid totals and outstanding calculations, mirroring the existing
  `depositPaidTotal` / `depositTargetFor` pattern.
- **Preserve the list-not-a-flag design.** Partial payments, multiple cheques, and split
  trust/family payments must stay visibly short rather than reading as paid. The reasoning is
  in the source comments at `6821-6826` and in `LIFECYCLE_AUDIT.md` §6b. Do not undo it.
- `isJobFunded` continues to gate on the deposit only. Work starts when the deposit is in;
  midpoint capture is a recording concern, not a gate. **Do not change the gating behavior.**
- Note that `isJobFunded` carries a 1% tolerance (`6848`, `paid >= target * 0.99`). A job can
  be funded while genuinely short. **Post observed amounts, never targets** — see §9b.

**Built as specified.** The modal opens on the first unsatisfied stage and can be re-pointed at
any of the three. `stagePaidTotal(job, stage)` and `jobPaidTotal(job)` are the new readers;
`depositPaidTotal` is now a thin alias so no existing caller changed meaning. `isJobFunded` still
reads the deposit alone — a midpoint cheque of any size cannot fund a job, which is covered by a
test. Only a deposit-stage payment writes `depositReceived` / `depositReceivedAt`.

The short-payment challenge stays deposit-only: it is the one stage whose target the app can
derive on its own. Midpoint and final amounts come off an invoice computed from logged hours and
actual vendor quotes, which is not reproducible in the payments module, and inventing a target
there would have meant duplicating the invoice engine and letting the copies drift.

### 2b. The recognition trigger has no backing field — **FIXED**

The brief recommends recognizing at job delivery and notes: *"if delivery and the final invoice
can diverge, flag it."* They cannot diverge, because **neither event is recorded.**

- There is no `finalInvoiceSent`. Only `midpointInvoiceSent` exists (`4633`).
- There is no delivery date, completion timestamp, or handover record.
- `job.completionDate` is the *target* set at intake, not an observation.

The only candidate signal is `status === 'closed'`, and it is unsafe to post from:

```js
var next = {new:'active',pending:'active',approved:'active',won:'active',
            active:'closed',closed:'new'}[j.status] || 'new';   // 7624, duplicated at 7727
```

`closed → new`. The cycle wraps. One mis-tap on a phone un-recognizes a job's revenue, and
cycling forward again re-fires the entry. A general ledger cannot hang off a button that
round-trips.

**Fixed, in three parts.**

1. **The map is now one map.** `JOB_TRANSITIONS` plus `jobActivationBlockers()` and
   `applyJobTransition()` replace the two hand-synchronised copies. `CLAUDE.md` instructed that
   both be edited in lockstep, which is a rule nobody can keep; there is now nothing to keep.
2. **`closed → active`, not `closed → new`.** The button has always been labelled *Re-open*, and
   it now resumes the job instead of resetting it to the start of the lifecycle.
3. **`deliveredOn` / `deliveredAt` / `deliveredBy` are stamped write-once** on the first close.
   Re-opening and re-closing does not move the date the job was actually handed over — which is
   the property recognition needs.

Also fixed on the way: `lost` and `closed_retained` were absent from the map and fell through
its `|| 'new'` default, so the status button silently **resurrected a lost job as brand new**.
They are terminal now and say so.

### 2c. `midpointInvoiceSent` is never set — **FIXED**

`midpointInvoiceSent` is initialised to `false` at job creation (`4633`) and **written by
nothing**. `defaultInvStage` read it, so once the deposit landed every job pinned to the midpoint
invoice and the final was unreachable without selecting it by hand — the same dead-flag shape as
the `markDepositReceived` defect from Wave 1.

The stage now advances off money actually recorded, which is the rule the deposit already
followed one stage along: midpoint paid means the next document to produce is the final. The
flag is still honoured if any future path sets it.

---

## 3. Posting instruction layer

### 3a. The milestone schedule is not fixed

"50 / 25 / 25" describes intent, not the code. The three stages bill against **three different
bases** (`11364-11372`):

| Stage | Basis | Amount |
|---|---|---|
| Deposit | The saved **estimate** | `0.5 × totalDepositBasis` |
| Midpoint | An **estimate/actual hybrid** — estimate labor, actual SMF and prep fees | `0.75 × totalMidBasis − deposit` |
| Final | **Actuals + change orders** | `totalFinalBasis − deposit − midpoint` |

The final is a variable true-up plug, not 25% of anything. `finalDue` has **no clamp**
(`11372`) — a T&M job that runs under estimate produces a negative final invoice, i.e. a refund.

Chart of accounts §8.1 currently instructs *"debit accounts receivable for the final 25%."*
That is wrong on its face and must be corrected in the doc.

**Recommendation:** freeze the agreed contract total at approval and bill all three stages
against it, with actuals reconciled only in the final true-up. That fixes §1a and this
inconsistency together, and gives 2200 a stable per-job denominator. If the bases stay
divergent, every rule below still holds — the entries balance — but the deposit will keep
being taken against a number the final invoice does not use.

### 3b. Entries

| Event | Debit | Credit |
|---|---|---|
| Deposit received | 1000 Cash / 1050 Stripe Clearing | 2200 Unearned Revenue |
| Midpoint received | 1000 / 1050 | 2200 Unearned Revenue |
| Job delivered | 2200 · 1200 AR · 4900 | 4xxx service line |

The delivery entry, stated as one formula that handles every case including refunds:

```
Dr  2200 Unearned Revenue   = all payments received on the job
Dr  1200 Accounts Receivable = totalFinalBasis − payments received     ← the UNPAID BALANCE
Dr  4900 Discounts & Allowances = discountAmt                          ← T&M only, see §7
    Cr  4xxx Service line       = totalFinalBasis + discountAmt        ← gross
```

Two things this gets right that both prior documents do not:

1. **The AR debit is the unpaid balance, not `finalDue`.** `finalDue` is what was *invoiced*;
   the balancing figure is what is *owed*. They differ whenever a client underpaid an earlier
   stage — which the payment model explicitly allows. Anchoring to `finalDue` leaves the entry
   out of balance by exactly the shortfall.
2. **A negative AR debit is the refund case**, expressed by the same formula. When
   `totalFinalBasis < payments received`, the figure is a credit — a refund payable, not a
   receivable. Reclassify it to 2000 Accounts Payable rather than carrying negative AR.

Notes:

- The posting instruction attaches to the **payment record** for deposit and midpoint. Money
  received is the trigger, not money billed.
- Recognition attaches to `deliveredOn` (§2b).
- `qbMatchId` already exists on the payment record as a null stub (`6974`) with the comment
  *"set by QuickBooks reconciliation, when that exists."* Use it. Do not invent a parallel field.

---

## 4. Recognition trigger

**Recommendation: recognize 100% at job delivery. Do not implement percentage-of-completion.**
The recommendation stands, but one of the brief's three stated reasons is factually wrong and
must not be repeated.

| Rationale | Verdict |
|---|---|
| Jobs run 3–15 business days; most open and close inside one month | **Holds.** The liability rarely survives a period end. |
| Complexity corrects a distortion lasting about a week | **Holds.** |
| *"Hours are moving to QuickBooks Time, so the app will no longer own the data"* | **False.** |

`TIME_TRACKING_INTEGRATION_SPEC.md` §0 records that a third-party time tracker — QuickBooks
Time explicitly among them — was **evaluated and rejected**, on per-seat pricing, 1099
classification risk, and buying no QuickBooks linkage the app does not already have. The app
keeps the timesheet and pushes *raw hours carrying no rates* to QBO.

So the app **does** retain the data a percentage-of-completion calculation would need. The
reason not to build it is that it is not worth the complexity for a week-long distortion — not
that the data is leaving. Anyone reading the original rationale later could reasonably conclude
POC became impossible, and design around a constraint that does not exist.

---

## 5. Service type → general ledger mapping

`SVC_LABELS` (`2644`) defines **eight** keys against five income accounts. Map explicitly
through a lookup table. Do not infer from labels, and do not derive the account from the
display string.

| `SVC_LABELS` key | Display label | GL account |
|---|---|---|
| `home_cleanout` | Home Cleanout | 4000 |
| `cleanout` | Estate Settlement | 4100 |
| `estate` | Estate Settlement (legacy alias) | 4100 |
| `probate` | Probate Estate Settlement | 4200 |
| `contested_probate` | Contested Probate Estate Settlement | 4200 |
| `downsizing` | Downsizing | 4300 |
| `downsizing_move` | Downsizing & Move Management | 4300 |
| `prep` | Home Prep for Sale | 4400 |

**`cleanout` is Estate Settlement. `home_cleanout` is Home Cleanout.** The naming is inverted
from intuition and this is the single most dangerous line in the mapping. Anyone rebuilding it
from labels will get it backwards, and misposted revenue between two service lines is not
visible in any total.

`estate` is a legacy alias for `cleanout`. Confirm whether any live job records still carry it
before deciding whether to keep the mapping or migrate the records.

An unmapped service type must **fail loudly**. Do not silently default to any account.

---

## 6. Home Prep — decided: 4400 is standalone-only

**Decision (2026-07-30, Anthony):** account 4400 records **standalone `prep` engagements only**.
Home Prep attached to a Downsizing or Estate job posts to that job's service line as part of the
vendor management fee.

### Why

The chart of accounts already works this way, and so does the app. COA §5 creates five service
lines and **no vendor-management-fee account** — so the 15% SMF has nowhere to go except the
host job's service line. That is already true for every coordinated vendor: haulers, movers,
cleaners, appraisers. Attached Home Prep is charged at that same 15%, through that same
mechanism:

```js
if (prepEnabled && !isPrep) { smf += prepFee; prepFee = 0; }   // 3675
```

On an attached job the fee is folded into SMF and `prepFee` is **zeroed** — not only for the
GL, but on the client invoice, which shows a single *Service Management Fee* line. Attached prep
money is economically indistinguishable from any other vendor coordination: same rate, same fee
type, same invoice line. Breaking it out in the ledger would be a distinction the business makes
nowhere else.

Standalone `prep` is a genuinely different product, not the same service at a different rate —
a 30% GC fee (`4433`) against no billed labor at all (`3676` zeroes `baseTCHrs`, `basePSHrs`,
`workPool`, `coordTC`). The fee *is* the engagement. That earns its own income account.

The rule reads: **a 30% GC engagement is a product; a 15% coordination fee is part of whatever
job it attaches to.**

### What it buys

The mapping stays a pure function of `svcKey` — one job, one account. No split-entry logic, the
recognition entry credits one account for `totalFinalBasis` matching the single invoice total,
and the fail-loud check in §5 actually covers everything.

**It needs no enforcement code.** The §5 table already maps `prep` → 4400 unmodified; an
attached prep job carries `downsizing` or `cleanout` as its `svcKey` and routes to the host line
automatically. The rule enforces itself.

### What it costs — flag to Laura

Roughly $3,750 per attached job (~$25k vendor spend × 15%) sits inside 4300 / 4100 rather than
4400. You cannot read total Home Prep fee revenue off the P&L; 4400 shows standalone only.

Accepted deliberately. Prep-as-a-product is a management question, not a statutory one, and the
answer lives in the app — which computes `prepFee` before folding it, so nothing is lost.
Recovering it in QBO instead means Classes, which means the Plus tier, which COA §1 rules out.
Splitting attached prep into 4400 would also immediately raise why haulers and movers do not get
their own lines; the chart unravels toward Classes from there.

### The fee-isolation guard

**Only the fee may be written to QuickBooks.** Vendor spend must never post to the P&L in any
form — not as revenue, not as COGS, not as pass-through. Clients pay third-party vendors
directly at the vendor's normal rate. Havellin never takes a percentage of sale, auction, or
consignment proceeds.

The brief proposed *"a guard that rejects any GL write whose amount matches a vendor-cost
field."* **Replace it.** Amount-matching is a coincidence detector, not a type system: it fails
open when no coincidence occurs, fails closed when a fee happens to equal a cost, and would have
passed the §6 fold above cleanly — correct amount, wrong account.

Build the posting payload from an **explicit whitelist of revenue fields**
(`tcFee`, `psFee`, `pkgCost`, `smf`, `gcFee`, `stagerGcFee`, `prepFee`, `rushAmt`). `prepCost`,
`vendorCost`, `stagerCost` and `getPrepCost()` never enter the posting path at all. A field that
cannot reach the payload cannot be misposted from it.

---

## 7. Discount and rush premium

`discountPct` is capped 0–30 and applies to **labor only** (`3850-3852`,
`laborBase = tcFee + psFee`). The invoice basis is already net of it — `_netLabor` (`11311`)
subtracts it before the bases are built — and `discountAmt` is available at `11317`.

**In fixed-price mode the discount is baked into the flat fee and `discountPct` is forced to 0**
(`5972-5978`), with a source comment explaining this prevents double application on recompute.
Respect it. Do not restore a discount value in fixed mode.

**Recommendation:** for T&M jobs, post gross labor revenue to the service line and the discount
separately to **4900** as contra-revenue, preserving visibility of gross and net billing. For
fixed-price jobs there is no separable discount — post the flat fee net, nothing to 4900.

**The rush premium is absent from both prior documents.** `RUSH_PCT` (20%, `3347`) is charged on
the Havellin services total *after* the discount (`3861`), so it is neither a discount nor a
service fee. Once §1a is fixed, it rides the host service line as ordinary revenue — but decide
that on purpose rather than discovering it in reconciliation. The recognition credit is
`totalFinalBasis + discountAmt`, and `totalFinalBasis` must contain `rushAmt`.

---

## 8. Job identifier as the integration key

`generateHvlId()` (`8086`) produces `HVL-YYMM-XXXX` on a 32-character alphabet excluding
O/0/I/1, assigned at job creation (`4601`).

Every GL write must carry `hvlId` so QuickBooks Time, QuickBooks Online and Stripe reconcile
against a common key.

**Do not inherit the existing fallback.** Line `9906` already does `job.hvlId || String(jobId)`,
and most read sites render `job.hvlId || '—'` — jobs predating the field do not have one. If the
posting path adopts either fallback, the three systems key on different values for the same job
and the reconciliation silently splits. Treat a missing `hvlId` the same as an unmapped service
type: **fail loudly.**

---

## 9. Open decisions

Two of the brief's five are already answered. Three remain.

### Answered

**9a. Received vs cleared — answered by the accrual decision.** The chart of accounts sets the
reporting basis to accrual in both the Executive Summary and §8. Under accrual you post on
receipt. `clearsOnReceipt` (`6958`) treats wire, Stripe and cash as final on receipt; cheques
carry `clearedOn: null` until they clear — but a cheque that never banks is a bank-reconciliation
and bad-debt matter (6950), not a recognition-timing one. This only becomes live if the *tax*
basis goes cash, which is already COA §11 Q1 on Laura's list. It is downstream of a question she
has been asked, not a separate one.

**9d. Change orders — confirmed, not open.** `coTotal` (`11321`) enters only `totalFinalBasis`
(`11367`). Change orders already flow through the recognition entry and post to the same service
line as the underlying job. No separate treatment needed.

### Still open

**9b. Reconstructed legacy records.** `jobPayments()` sets `reconstructed: true` (`6826`) on
migrated records whose amount was inferred from the 50% target rather than observed. **These must
not auto-post.** Exclude and flag for manual review. Note this is the strict case of a general
rule: because `isJobFunded` tolerates a 1% shortfall (`6848`), post observed amounts and never
targets, on every record.

**9c. Policy-exception deposits.** Large cheque deposits set `policyException: true` (`6972`) —
a personal cheque at or above `LARGE_DEPOSIT_THRESHOLD` ($10k). Determine whether this holds the
posting pending review or posts normally with a flag.

**9e. Sheets sync interaction.** Job data syncs via `syncToSheets()` (`10222`) with merge-by-id
semantics. Determine whether GL posting state lives on the job record and therefore syncs, or
sits in a separate ledger-state store. Concurrency and save integrity are a known concern in this
codebase — do not introduce a new write path without addressing it.

---

## 10. Build sequence

Forced, not preferred.

| # | Step | Status |
|---|---|---|
| 0 | **Fix the rush premium (§1a)** | ✅ **Built** 2026-07-30 |
| 1 | **Payment capture across all three stages (§2a) + `deliveredOn` (§2b) + invoice stage advance (§2c)** | ✅ **Built** 2026-07-30 |
| 2 | Build the `svcKey` → GL lookup with fail-loud on unmapped types (§5) | Blocked — needs the QBO accounts |
| 3 | Build the posting instruction layer against the existing `qbMatchId` stub (§3) | Blocked — needs 2 |
| 4 | Implement the whitelist payload guard (§6) | Blocked — needs 3 |
| 5 | Implement discount + rush posting with fixed-price respected (§7) | Blocked — needs 3 |
| 6 | Return §9b, 9c, 9e for a call before resolving any of them in code | **Open — for Laura / Anthony** |

Steps 2–5 are deliberately **not** built. The QBO account does not exist yet, three posting
policy questions are unresolved, and a GL write path built against accounts nobody has created
cannot be verified against anything. Building it early would mean the first live reconciliation
is also its first test.

### Verification of steps 0 and 1

31 checks, all passing, over the extracted functions and the real invoice basis block:

- **Rush (10):** the worked example bills $120,000 · under-run bills exactly its actual basis ·
  a non-rush job is byte-identical at 50/25/25 · fixed price adds nothing on top · the premium is
  not levied on change orders · the rate is pinned per estimate.
- **Payments (10):** all three stages capture and total independently · `jobPaidTotal` sums
  across stages · a $99,999 midpoint payment does **not** fund a job.
- **Invoice stage (3):** deposit → midpoint → **final**, the last of which was unreachable.
- **Transitions (8):** `closed → active` · delivery stamped on first close · `deliveredOn` is
  write-once across a reopen/reclose cycle · `lost` and `closed_retained` are terminal ·
  activation blockers still enforced.

---

## 11. Chart of accounts — replacement text for §5

The 4400 paragraph currently reads as though the account captures both fee types, which
contradicts the rest of the chart. Replace it with:

> Account 4400 records fee revenue from **standalone** Home Prep for Sale engagements only,
> where Havellin acts as general contractor on a project booked in its own right. A standalone
> engagement assumes approximately $40,000 of vendor spend against a 30% general contractor fee.
> Only the fee is revenue. The vendor spend is never recorded — the client pays the vendor
> directly at the vendor's normal rate.
>
> Home Prep attached to a Downsizing or Estate Settlement job is **not** recorded here. The
> attached engagement earns the standard 15% supplier management fee, identical to every other
> coordinated third-party vendor, and posts to the service line of the job it attaches to. This
> follows the treatment of all vendor coordination revenue in this chart, which has no separate
> supplier management fee account. Total Home Prep fee revenue across both engagement types is
> therefore not readable from the profit and loss statement; the job manager application retains
> it and is the correct place to ask that question.

Two further COA corrections follow from this document:

- **§8.1** — *"debit accounts receivable for the final 25%"* is incorrect. The final stage is a
  variable true-up, and the balancing debit is the unpaid balance. Use the §3b formula.
- **§8.2** — *"hours are moving to QuickBooks Time"* is incorrect. See §4.

---

## Appendix — verification

Verified against `havellin.html` @ `9e37f3f`, 17,406 lines. Local `main` confirmed identical to
`origin/main` before reading.

| Claim | Line(s) |
|---|---|
| `RUSH_PCT = 0.20` | 3347 |
| Rush computed after discount | 3859-3862 |
| Rush persisted on the estimate | 4158, 4164 |
| Rush on the client estimate document | 5503-5504 |
| **Zero rush references in `renderInvoice`** | 11240-11800 |
| `SVC_LABELS` — eight keys | 2644-2656 |
| `cleanout` → Estate Settlement | 2648 |
| `home_cleanout` → Home Cleanout | 2647 |
| Attached prep folds into SMF, `prepFee` zeroed | 3675 |
| Standalone prep zeroes all labor | 3676 |
| `prepFeeRate` — 30% / 15% | 4433 |
| `havellinTotal` composition | 3847 |
| `discountPct` capped 0-30, labor only | 3850-3852 |
| Fixed price forces `discountPct = 0` | 5972-5978 |
| `midpointInvoiceSent` — no `finalInvoiceSent` | 4633 |
| `depositTargetFor` — 50% of `est.havellinTotal` | 6793 |
| `jobPayments` migration | 6812 |
| `reconstructed: true` | 6826 |
| `depositPaidTotal` | 6833 |
| `isJobFunded` — 1% tolerance | 6843-6848 |
| `clearsOnReceipt` | 6958 |
| `saveDeposit` hardcodes `stage: 'deposit'` | 6931, 6963 |
| `policyException` | 6972 |
| `qbMatchId` null stub | 6974 |
| Status cycle wraps `closed → new` | 7624, 7727 |
| `generateHvlId` | 8086 |
| `hvlId || String(jobId)` fallback | 9906 |
| `syncToSheets` | 10222 |
| `_netLabor` — basis is net of discount | 11311 |
| `discountAmt` available in `renderInvoice` | 11317 |
| `coTotal` — change orders | 11321 |
| Three divergent billing bases | 11364-11367 |
| `finalDue` — no clamp | 11372 |
