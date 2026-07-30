# Client Lifecycle Audit — as-is vs should-be

Drafted 2026-07-30. Decisions recorded 2026-07-30 (§8). **Audit only — no code was changed.**

**Status: Waves 1, 2 and 4 are BUILT and live, plus Wave 3 step 1.** All three of the
firm's hard rules are now enforced in code:

| Rule | Enforced by |
|---|---|
| No job starts until the 50% deposit is received | `saveLogEntry` refuses unless `isJobFunded()`; hours inputs and the save button are inert |
| No job plan before the client accepts | `loadJobPlanTab` withholds staffing/hours until `isJobWon()` |
| Don't tie up crew on unwon jobs | `confirmJobTeam` refuses an unwon job |

Remaining, and blocked on credentials rather than design: **DocuSign** (→ `contracted` and
a retained signed PDF), **Stripe** (sets `clearedOn` on cards), **QuickBooks** (the
reconciler, §6d). Each attaches to `job.payments[]` rather than replacing it, so none is a
prerequisite for the gates above — that is why Wave 4 shipped ahead of them.

Still open and NOT code: the retained-deposit clause (§8.6, counsel) and the 30%-vs-50%
walk-away floor (§5a, pricing policy — the margin panel now discloses deposit coverage
either way).

Method: eight parallel readers mapped one lifecycle segment each out of `havellin.html`,
then every gate they claimed was a *hard* block was handed to a separate agent told to
break it. 82 claimed hard gates were tested. **66 did not survive** — 47 turned out to be
warnings only, 14 were nothing at all, and 5 hold at the point they are written but are
reachable around via another screen. 145 problems were logged, 58 of them high severity.

The three findings that matter most were re-verified by hand against the file before being
written down here.

---

## 0. The short version

**All three of your hard rules are unenforced.** Not weakly enforced — absent.

| Your rule | Reality |
|---|---|
| No job starts until the 50% deposit is received | `depositReceived` is read **nowhere** in the Job Plan, staffing, or hours path |
| No job plan before the client approves the estimate | A gate exists, but it checks **your manager PIN**, not the client |
| Don't tie up concierges or specialists on unwon jobs | The app has no concept of *won* |

And one defect worth fixing on its own, today:

> **Marking the deposit received also silently marks the agreement signed.**
> `markDepositReceived()` (`6420-6433`) sets `job.depositReceived = true` **and**
> `job.agrSigned = true` on lines 6425-6426 from a single button press. Line 6426 is the
> **only place in the entire file** that ever writes `agrSigned`. So the app cannot record
> "they signed" as a separate fact from "they paid", and every dashboard that reports a
> signed contract is reporting a payment.

There is also no `agrSent` field anywhere in the file (zero occurrences). "We sent the
agreement" is not a thing the app can record.

---

## 1. The lifecycle as the business actually runs it

1. **Intake** — walkthrough booked, client and property captured.
2. **Estimate built** on site, room by room.
3. **Manager approves** the estimate internally.
4. **Estimate sent** to the client.
5. **Client approves** — the moment the job is *won*.
6. **Agreement sent** for signature.
7. **Agreement signed** and returned.
8. **Deposit invoice** (50%) sent.
9. **Deposit received** — the moment work may begin.
10. **Staffing** — crew named and confirmed. *(In practice overlaps 6-9: you have to
    assume you are getting the job or you are behind when the wire lands.)*
11. **Work** — hours logged daily, projection watched.
12. **Midpoint invoice** at 75% cumulative.
13. **Final invoice**, trued to logged hours.

Steps 5, 6, 7 and 9 are the load-bearing ones. Three of the four are invisible to the app.

---

## 2. What the app does today

| Stage | State written | Gate to enter | Gate to leave | Who/when recorded? |
|---|---|---|---|---|
| Intake | full job record, `hvlId`, Drive folder | none | **HARD** 12-field check (`4270-4315`) | no |
| Estimate build | `estimateStore[jobId]` | none | none | partial |
| Manager approval | `approved`, `approvedBy`, `approvedAt` | **SOFT** — button hidden, not blocked | — | **who is a constant**, see §4 |
| Estimate → client | `estSent`, `estSentDate` | **NONE** — unapproved can be emailed | — | date only |
| **Client approval** | **nothing** | — | — | **not recorded at all** |
| Agreement generated | — | none — renders on dropdown change | — | no |
| Agreement approved | `agrApproved` | PIN (`15268`) | — | no |
| **Agreement sent** | **no field exists** | — | — | **impossible** |
| **Agreement signed** | `agrSigned` | — | — | **written only by the deposit button** |
| Deposit invoice | — | **NONE** (`10870`: approval only applies to `final`) | — | no |
| **Deposit received** | `depositReceived` (boolean) | none | — | **no amount, date, method or actor** |
| Job Plan | `plan.*` | **HARD** on *manager* approval (`11244`) | — | no |
| Staffing | `crew.confirmed/By/At` | **HARD** (built yesterday) | — | **yes** — the only one |
| Hours | `jobLogs` | **HARD** on team confirmed | — | date only |
| Midpoint invoice | `midpointInvoiceSent` | **NONE** | — | no |
| Final invoice | — | **HARD** PIN if variance >15%; **HARD** no-hours block | — | no |

The pattern: gates cluster around *money out* (invoices) and are absent around *commitment
in* (client says yes, client signs, client pays).

---

## 3. The gates that are not really gates

Ranked by how likely you are to rely on one of these believing it protects you.

**3a. The Job Plan gate checks the wrong approval.** `loadJobPlanTab` (`11244`) refuses
unless `estRec.approved || job.approved`. That flag is set by *your* manager PIN, not by the
client. So the Job Plan opens — and crew can be committed — on a job the client has never
seen. This is your rule #2, and the code looks like it implements it while implementing
something else entirely.

**3b. An unapproved estimate can be emailed to the client in two clicks.** `docEmail()`
→ `buildEstimateMailto()` (`7079-7085`, `7773`) has no approval check. The Email button
renders on the Client Dashboard for any saved estimate. The approval "gate" is only that a
*different* button is hidden on the estimate tab.

**3c. Deposit and midpoint invoices require no approval whatsoever.**
`invRequiresApproval = (stage === 'final') && (_variancePct > 0.15)` (`10870`). Every
non-final invoice is unlocked by construction. The deposit invoice — the one that sets the
client's expectation of the whole engagement — has less control on it than the final.

**3d. Intake validation is create-time only, and Edit Client has none.** `saveClientEdit`
(`16081-16142`) validates first and last name, then rewrites address, city, zip, sqft,
property type, phone, email and **service type** unchecked. Service type and sqft are
pricing inputs. Changing them on a signed, active job silently desynchronises the approved
estimate from the job record, with no re-approval and no audit trail. The edit modal even
renders red asterisks on fields it does not enforce.

**3e. Two intake fields marked required are not validated.** Walkthrough date
(`i-walkthrough`, asterisk at `688`) and Site visit conducted by (`i-site-visit-by`,
asterisk at `691`) never appear in `missing[]`. The Downsizing destination fields are the
same. The UI asserts a requirement the save path does not hold.

**3f. Room status and every plan checklist item advance with no precondition.**
`setRoomStatus` (`11183-11189`) and `togglePlanTask` (`13962-13970`) write freely. The
Phase-gate checkboxes in the job playbook — including the deposit item — are decorative.

---

## 4. Where the record breaks

**The manager approval records the wrong person.** The PIN literal `3010` is hardcoded in
six places (`5788`, `5851`, `7279`, `10905`, `12675`, `15268`) and the approver is stored as
the constant string `Anthony Graziano Sr`. If Ashley approves an estimate, the record says
you did. That is worse than recording nothing, because it looks like evidence.

**Transitions that are a bare boolean with no actor and no timestamp:**

| Transition | What is stored | Missing |
|---|---|---|
| Client approved the estimate | *nothing* | everything |
| Agreement sent | *nothing* | everything |
| Agreement signed | `agrSigned = true` | who, when, and any independence from payment |
| Deposit received | `depositReceived = true` | **amount, date, method, who recorded it** |
| Midpoint invoice sent | `midpointInvoiceSent = true` | when, to whom |

The deposit one is the sharpest. You have a hard business rule keyed on a fact you store as
a single bit, set by a button, with no amount and no date. If a client says "I paid you
three weeks ago", the app cannot help you. If two devices disagree, nothing resolves it.

The only transition in the whole lifecycle that records who and when is the job team
sign-off built yesterday.

---

## 5. Document retention — what actually reaches Drive

| Document | To Drive? | Note |
|---|---|---|
| Internal estimate PDF | **AUTOMATIC** ×2 | saved on Save Estimate *and* again after approval |
| Walkthrough notes corpus | **AUTOMATIC** | per-room `.txt` files |
| **Client-facing estimate PDF** | **MANUAL** | *the document the client actually received* |
| Agreement PDF | **AUTOMATIC — but wrong** | saves the **blank unsigned template**, on *render*, every time the tab is opened |
| **Signed agreement** | **NEVER** | no upload path exists for it at all |
| **Any invoice** | **NEVER** | not retained in any form |
| **Proof of deposit payment** | **NEVER** | — |
| Item/room photos | AUTOMATIC | gated on `job.status === 'active'` |
| Collection diligence docs | MANUAL | upload button per collection |
| Inventory workbook | AUTOMATIC | debounced, 14 call sites |

**A year from now you could not produce:** the signed agreement, any invoice you issued,
proof the deposit was paid, or — unless someone remembered to press a button — the estimate
document the client actually accepted. You *could* produce an unsigned blank contract
template and two copies of your internal cost breakdown.

Also: the Drive folder is created fire-and-forget at intake (`4377`), with the success
message shown unconditionally at `4383` before the async result returns. If it fails, every
later Drive write for that job silently no-ops for the life of the job.

---

## 5a. The 50%-deposit invariant does not survive the app's own discount floor

Stated rule: *the 50% deposit covers our cost, so we never lose money on a job, because our
margins are at least 50%.*

The arithmetic holds **exactly at 50% margin** and nowhere below it:

| Margin | Cost as % of price | What a 50% deposit covers |
|---|---|---|
| 50% | 50% | **100% of cost** — invariant holds |
| 40% | 60% | 83% of cost |
| 35% | 65% | 77% of cost |
| 30% | 70% | **71% of cost** — 29% of cost unfunded at job start |

The app permits and actively assists pricing down to **30%**: the walk-away floor is
`walkAway = totalCost / 0.70` (`7752`), and `negotiationRoom = havellinTotal - walkAway`
(`7753`) is displayed as available discount room. The margin bands colour 35–50% **amber**
(`7763-7764`) — acceptable with caution, not forbidden.

So the tool invites pricing into the region where the invariant fails. Two ways to resolve,
and it is a pricing-policy decision rather than a bug:

- **Move the floor to 50%** (`totalCost / 0.50`). The invariant becomes structural — the
  deposit always covers cost, by construction, and the app stops offering room it should not.
- **Keep the 30% floor** and accept that the invariant is a norm rather than a guarantee. Then
  the margin panel should say what a discount does to deposit coverage, so the trade is
  visible at the moment it is made.

Recommend the first. It costs one constant, and it makes a rule you already believe you have
actually true.

---

## 6. What should happen — the target model

The fix is not more gates bolted onto tabs. It is **one status field that everything reads
from**, with the gates falling out of it. Bolting gates on individually is how you get six
checks that disagree — which is roughly what exists now, and what I added to yesterday
without seeing the whole picture.

### Job status — settled against the answers in §8

`won` and `contracted` stay **separate**. Acceptance is informal (email, call, text) and
nothing is signed until the contract goes out, so they are genuinely two events days apart —
and staffing hangs off the first one while the deposit gate hangs off the third.

```
prospect → estimating → estimate_sent → won → contracted → funded → active → complete
                              │           │        │
                              └───────────┴────────┴──→ lost          (never paid us)
                                                   │
                                          funded ──┴──→ closed_retained
                                                        (paid, then walked — deposit kept)
```

| Status | Means | To enter, must be true | Recorded |
|---|---|---|---|
| `prospect` | intake done | — | — |
| `estimating` | estimate being built | — | — |
| `estimate_sent` | client has it | estimate manager-approved | who sent, when |
| `won` | **client accepted informally** | acceptance logged | who logged it, when, **how** (email / call / text / in person), and the client's words if written |
| `contracted` | **e-signature completed** | DocuSign (or equivalent) reports signed | signer, timestamp, envelope id, **signed PDF filed** |
| `funded` | **deposit confirmed by Stripe or QB** | payment observed via API — never keyed by hand | amount, date, source, payment id |
| `active` | work under way | `funded` | first hours entry |
| `complete` | work done | — | who, when |
| `lost` | died before any money arrived | — | who, when, **why** |
| `closed_retained` | died after the deposit | was `funded` | who, when, why, deposit retained |

`lost` and `closed_retained` are deliberately different states. Both are dead jobs, but one
cost you a proposal and the other paid for itself — collapsing them would make win-rate and
revenue reporting lie in opposite directions.

**Acceptance is a logged human judgement, not a document.** Since a client may accept by
phone, the app cannot verify it — so it should capture *who heard it and how*, which is what
makes it reviewable later. That is the honest design; pretending otherwise would be worse.

**`funded` is machine-observed only.** Per §8.5 nobody records a deposit by hand. That makes
this the strongest gate in the system, and it removes the "who may mark it paid" question
entirely — nobody may.

### Which gates should be HARD

Every hard gate is friction and has to earn it. These four do:

1. **Staffing requires `won`.** Your rule #3. Committing a contractor to a job you have not
   won is a real cost — you turn down other work. *Deliberately allows staffing while
   waiting on signature and deposit, which is what you asked for.*
2. **Hours logging requires `funded`.** Your rule #1, at the only point that matters — the
   first hours entry is the moment work provably started. Gating the Job Plan tab instead
   would block legitimate prep; gating the timesheet blocks the actual thing.
   **Unconditional — no override, no exception path**, because the deposit is never waived or
   varied (§8.2). This is the one place in the app where a hard wall with no escape hatch is
   the correct design, and it is only correct *because* the rule has no exceptions.
3. **The agreement cannot be marked signed by the deposit button.** Split them. This is a
   correctness fix, not a workflow gate.
4. **Sending a client estimate requires manager approval.** Closes 3b. It already looks like
   a rule; make it one.

### 6a. Cheques are the normal case, not the edge case

**Corrected 2026-07-30.** An earlier draft of this section treated cheques as an awkward path
and argued against manual entry. That is wrong for this client base: the clientele is elderly
and often institutional — a trust officer, an estate account, or a law firm's trust account
writes the cheque. A gate that only accepts Stripe would stall the majority of jobs.

The important distinction, which the earlier draft missed:

> **Recording a cheque is not bypassing the gate — it is satisfying it through another
> channel.** What must be resisted is not manual entry; it is a bare *mark as paid* boolean
> with no evidence behind it. That is precisely what exists today
> (`markDepositReceived`, `6420-6433`), and it is why the current flag proves nothing.

So manual entry is a **first-class path**, and it earns its place by capturing evidence.

### 6b. Replace the boolean with a payment record

One flag cannot carry this. Partial payments are real — an elderly client may write a cheque
for less than the full 50%, or two cheques, or the trust sends part and the family sends the
rest. Model payments as a list:

```js
job.payments = [{
  id, stage: 'deposit' | 'midpoint' | 'final',
  amount,
  receivedOn,                  // date the cheque was handed over / wire landed
  method: 'check' | 'wire' | 'stripe' | 'cash' | 'card',
  reference,                   // cheque number, wire confirmation, or Stripe payment id
  payer,                       // WHO wrote it — trust, estate account, law firm, client
  evidence,                    // Drive file id: photo of the cheque, or wire confirmation
  recordedBy, recordedAt,      // actor + timestamp, always
  clearedOn,                   // null until the bank/QB confirms
  qbMatchId                    // set by reconciliation
}]
```

`funded` fires when **deposit payments sum to ≥ 50% of the contract total** — not when someone
ticks a box. That handles partial payment correctly and makes a short cheque visible instead of
silently passing as full.

**`payer` is not bureaucracy in this business.** In estate work the person paying is frequently
not the client: a trust, an estate account, or an attorney's trust account. Recording it tells
you the estate is funding the engagement properly, feeds accounting correctly, and settles the
question if heirs later dispute who paid for what.

**Require a photo of the cheque.** The camera path already exists for inventory
(`_doPhotoUpload`), and the Drive folder tree is already per-job. A photograph turns *"Ashley
says a cheque arrived"* into a document, which is the honest substitute for an API
confirmation. Five seconds in the field, and you want it before the cheque leaves your hands
anyway. This is what makes manual entry trustworthy rather than a hole.

### 6c. Received vs cleared — decided by the instrument, not the calendar

A cheque in hand is not money; it can bounce. So `clearedOn` is tracked separately from
`receivedOn`. But a blanket "wait for clearing" rule costs 3-5 days on **every** job, which
collides with the scheduling pressure that drove staffing-ahead in the first place.

**Decided 2026-07-30: tier the accepted instrument by deposit size.** Above a threshold
(starting point **$10,000**, held as a Settings value, not a constant — it will want tuning as
job sizes move), a personal cheque is no longer accepted. That removes the exposure instead of
waiting it out.

| Deposit size | Accepted | Work starts |
|---|---|---|
| Under threshold | personal cheque, wire, card | on **received** |
| **Over threshold** | **wire preferred; cashier's cheque accepted** | on **received** |
| Any size | Stripe / card | on received (`clearedOn` set immediately) |

So work always starts on received. The risk is managed by *what you accept* at size, not by
delaying the job.

**Three factual points that belong in the agreement language, and are easy to get wrong:**

1. **"Certified" ≠ "cashier's".** A *certified* cheque is drawn on the client's account — the
   bank verifies funds and certifies the signature, and is only secondarily liable. A
   *cashier's* cheque is drawn on the **bank's own** account; the bank has already taken the
   money and is primarily liable. Cashier's is materially stronger. Name the one intended,
   because a bank will issue whichever is asked for.
2. **Neither is bounce-proof.** Faster funds availability is not finality. Counterfeit
   cashier's cheques are a common fraud precisely because people treat them as cash, and a
   bank can reverse weeks later on a forged instrument. Practical mitigation on a large
   deposit: telephone the **issuing** bank — on a number looked up independently, not the one
   printed on the cheque — and verify before work starts.
3. **A wire is strictly better than either**, and easier for the payers most likely to be
   sending large amounts. Wires are final and irrevocable on receipt. A trust officer or law
   firm wires money routinely; asking them for a cheque is the unusual request. Hence *wire
   preferred* rather than cashier's cheque as the headline.

**What the app should do about it:**

- Compute the deposit amount when the agreement is generated, and state the accepted payment
  methods **on the agreement and the deposit invoice** — the tier has to reach the client
  before they go to the bank, or it is just an internal preference.
- Flag a recorded payment whose `method` violates the tier for its amount (a $14k personal
  cheque) as a policy exception. Not blocked — the money is real and already in hand — but
  visible, because that is a decision someone made and should own.
- Set `clearedOn` immediately for wire and Stripe. Leave it open for cheques of any kind, and
  show the outstanding exposure on the dashboard until QuickBooks reconciles it (§6d).

Below the threshold the residual risk is a bounced personal cheque on a small deposit: rare,
visible, and recoverable. That is a fair trade for never delaying a job.

### 6d. Reconciliation is what keeps manual entry honest

Every manual payment is provisional until QuickBooks agrees. When QB shows a deposit, match it
to the recorded payment and set `clearedOn` + `qbMatchId`.

Three outcomes, each meaningful:

| QB vs recorded | Meaning |
|---|---|
| matches | cleared, done |
| **no QB record after N days** | cheque never banked, lost, or bounced — **flag it** |
| **amount differs** | short payment or a keying error — **flag it** |

That loop is the real control. It does not block the job, and it means a manual entry cannot
quietly be wrong forever — which is the only thing the "nobody may record it by hand" position
was actually protecting against.

**Sources, by role:**

- **Stripe** — near-instant, authoritative for what it processed, sets `clearedOn` immediately.
- **Manual entry + cheque photo** — the normal path for cheques and wires, provisional.
- **QuickBooks** — sees everything eventually; the reconciler, not the gate.

Build order within Wave 3 changes accordingly: **the manual payment record comes first**, since
it is what the deposit gate actually reads on most jobs. Stripe and QB then attach to a
structure that already exists.

### Which should stay SOFT

- Opening the Job Plan tab — you may want to look, plan phases, or sanity-check scope before
  the deposit lands. Show a status banner instead of a wall.
- Room status and checklist ordering — the field is messier than any state machine.
- Exceeding planned crew — already warns, and should stay a warning.

### Explicitly reversible

Every status needs a way back: `won → lost` (client backs out), `funded → refunded`,
`contracted → lost`. A state machine with no reverse edges gets worked around within a week.

---

## 7. Gap list, ranked by what it costs to leave alone

| # | Gap | Consequence | Size |
|---|---|---|---|
| 1 | Deposit button also sets `agrSigned` | Your records assert a signed contract that may not exist | **S** |
| 2 | Deposit is a bare boolean | No amount, date or method behind a hard business rule | **S** |
| 3 | Client approval unrecorded | *Won* cannot be known; rules #2 and #3 have nothing to key on | **M** |
| 4 | Signed agreement never retained | Cannot produce the contract in a dispute | **M** |
| 5 | Invoices never retained | Cannot produce what you billed | **M** |
| 6 | Approver recorded as a constant | Approval trail is misleading, not merely thin | **S** |
| 7 | Unapproved estimate emailable | Client sees a price nobody signed off | **S** |
| 8 | Edit Client rewrites pricing unchecked | Approved estimate silently desyncs from the job | **S** |
| 9 | Hours not gated on deposit | Rule #1 unenforced | **S** (after #2) |
| 10 | Agreement auto-saves blank template on render | Drive fills with unsigned copies; real one absent | **S** |
| 11 | Client estimate PDF manual to Drive | The accepted document may not exist anywhere | **S** |
| 12 | Drive folder creation fire-and-forget | Silent permanent loss of retention for that job | **M** |
| 13 | Deposit/midpoint invoices need no approval | No second pair of eyes on the first client number | **S** |
| 14 | Required-asterisk fields not validated | UI asserts rules the code does not hold | **S** |
| 15 | Hardcoded PIN in six places | No per-person accountability; cannot revoke | **M** |

1-2 and 6-11 are each an hour or two. The expensive items are 3, 4, 5 and 15 — and 3 is the
keystone, because rules #2 and #3 cannot be enforced until *won* exists.

### 7a. Build order, as the §8 answers force it

The decisions create real dependencies. Three things must happen before the deposit gate can
exist at all, so the order is not a preference:

**Wave 1 — no dependencies, all small, all pure correctness.** Can ship immediately.
- Split `agrSigned` from `depositReceived` (gap 1). Blocks nothing, fixes a false record.
- Per-person PINs, real `approvedBy` (gaps 6, 15) — needed before any later transition's
  "who" field is worth storing.
- Approval required to email a client estimate (gap 7); Edit Client stops rewriting pricing
  on approved jobs (gap 8); stop auto-filing the blank agreement on render (gap 10);
  auto-file the client estimate and every invoice to Drive (gaps 11, 5, per §8.4).
- Move the walk-away floor to 50% **or** show deposit coverage in the margin panel (§5a) —
  pricing policy, needs your call, one constant either way.

**Wave 2 — the status model.** `won` / `lost` with acceptance method and actor (gap 3). This
is the keystone: staffing gates on `won`, so rule #3 lands here. Independent of any external
integration, so it need not wait for Stripe.

**Wave 3 — the payment record, then the integrations that feed it.**
1. **`job.payments` + the manual entry form with cheque photo** (§6b). First, because on most
   jobs this *is* the payment path — not a fallback to it. Everything else attaches to this
   structure.
2. **DocuSign** → `contracted` and a retained signed PDF (gap 4). Independent of payments, so
   it can run in parallel.
3. **Stripe** → sets `clearedOn` immediately for cards it processed.
4. **QuickBooks** → the reconciler (§6d): confirms cheques cleared, flags what never banked.

**Wave 4 — the deposit gate.** Hours logging requires `funded`, computed from summed deposit
payments rather than a flag. **Needs Wave 3 step 1 only** — not the integrations. Once payments
are recorded with evidence, the gate can read them; Stripe and QB then improve confidence
without being prerequisites.

That ordering is the substantive change from treating cheques properly: the gate is no longer
blocked behind two external integrations, because the manual record it reads is trustworthy on
its own.

**Not on the critical path:** the retained-deposit clause (§8.6) is counsel's, and
`closed_retained` can be modelled before the language exists — just don't treat the money as
earned until it does.

---

## 8. Decisions — answered 2026-07-30

**8.1 How clients accept an estimate.** Informally — email reply, phone, text. **Nothing is
signed until the contract is sent.** So acceptance and signature are separate events, and
`won` / `contracted` stay separate statuses (§6). Acceptance is captured as a logged judgement
with a method field; the app cannot verify a phone call and should not pretend to.

**Also decided: wire in DocuSign** (or equivalent) so a formal signature produces a real
record — signer, timestamp, envelope id, and a signed PDF. This directly fixes gap #4, which
is otherwise the hardest one to close: today no signed copy is retained anywhere, and there is
no upload path for one.

**8.2 Deposit waived or varied — NEVER.** The `funded` gate is therefore unconditional, with
no override. Rationale recorded because it constrains pricing: the 50% deposit is meant to
cover job cost outright, so the firm cannot lose money on a job. **See §5a — that only holds
at ≥50% margin, and the app currently permits pricing to 30%.**

**8.3 Per-person PINs — yes.** One for Anthony, one for Ashley, to start. Replaces the literal
`3010` hardcoded in six places (`5788`, `5851`, `7279`, `10905`, `12675`, `15268`) and makes
`approvedBy` real instead of the constant string it is today.

**8.4 Invoices retained to Drive — yes, always, automatically.**

**8.5 Who may record a deposit.** Original answer: nobody — Stripe or QuickBooks over an API.
**Revised the same day**, because the client base pays by cheque: elderly clients in person,
and trust officers or law firms institutionally. An API-only gate would stall most jobs.

Settled position: **a founder or concierge may record a payment, but only with evidence** —
amount, date, method, reference, payer, and a photo of the cheque, all attributed. Stripe still
sets `clearedOn` instantly on the cards it processes; QuickBooks reconciles everything
afterwards and flags anything that never banked or banked short. See §6a-6d.

What is *not* acceptable is the thing that exists today: a bare boolean with no amount, no
date, no evidence and no actor, which additionally lies about the signature.

**8.6 A job that dies.**
- **After signature, before payment** → killed. Status `lost`. Clean, nothing owed either way.
- **After payment, client backs out with no material breach by Havellin** → **Havellin retains
  the deposit.** Status `closed_retained`.

⚠️ **This needs contract language before it is relied on.** A retained deposit is only
defensible if the agreement says so plainly — how it is characterised matters, and a clause
that reads as a penalty rather than compensation for work performed and capacity committed can
be challenged. That is a drafting question for counsel, not something to settle in the app or
for me to draft; there are estate attorneys in the partner directory. The app should model the
state now, and the money should not be treated as earned until the clause exists.
Interim position, worth confirming with counsel: the deposit funds capacity that was reserved
and crew that was committed, which is a stronger footing than calling it a cancellation fee.

---

## 9. What this audit could not determine

- **Whether Stripe payments actually flow through the app.** A payment-link request goes to
  an Apps Script endpoint (Agreement tab, gated on `agrApproved` at `15313`), but nothing
  observed writes `depositReceived` back from a Stripe callback. It appears to be recorded by
  hand. Not conclusively traced. **Resolved as a plan rather than a finding:** Stripe and
  QuickBooks integration is scheduled for a later session (§8.5), and until it exists the
  `funded` gate cannot be turned on — so the sequencing is forced. Build the payment
  integration first, then the gate that depends on it.
- **Whether a blank `sqft` degrades the hours engine** enough to act as an implicit
  downstream gate. Only confirmed that no explicit check exists.
- **Real-world Drive failure rate** for the fire-and-forget folder creation — the code path is
  confirmed, the frequency is not.
- The synthesis and completeness passes of the audit workflow were lost to a session limit,
  so **this document is my own synthesis of the eight verified stage maps** rather than an
  independently critiqued one. The stage maps and gate verdicts themselves are complete. A
  completeness pass would be worth running before acting on §6 — in particular for paths not
  covered here: change orders mid-job, cancellation after deposit, re-estimating after a
  scope change, and the fee-only Home Prep variant, which follows a different route.
