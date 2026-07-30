# Client Lifecycle Audit — as-is vs should-be

Drafted 2026-07-30. **Audit only — no code was changed.**

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

## 6. What should happen — the target model

The fix is not more gates bolted onto tabs. It is **one status field that everything reads
from**, with the gates falling out of it. Bolting gates on individually is how you get six
checks that disagree — which is roughly what exists now, and what I added to yesterday
without seeing the whole picture.

### Proposed job status

```
prospect → estimating → estimate_sent → WON → contracted → funded
                             ↓                                ↓
                           lost                            active → complete
```

| Status | Means | To enter, must be true | Recorded |
|---|---|---|---|
| `prospect` | intake done | — | — |
| `estimating` | estimate being built | — | — |
| `estimate_sent` | client has it | estimate manager-approved | who sent, when |
| `won` | **client accepted** | client approval logged | who, when, **how** (verbal/email/signed) |
| `lost` | client declined | — | who, when, **why** |
| `contracted` | signed agreement in hand | agreement sent **and** signed, independently | who, when, signed copy filed |
| `funded` | deposit received | payment logged with **amount, date, method** | who, when |
| `active` | work under way | `funded` | first hours entry |
| `complete` | work done | — | who, when |

### Which gates should be HARD

Every hard gate is friction and has to earn it. These four do:

1. **Staffing requires `won`.** Your rule #3. Committing a contractor to a job you have not
   won is a real cost — you turn down other work. *Deliberately allows staffing while
   waiting on signature and deposit, which is what you asked for.*
2. **Hours logging requires `funded`.** Your rule #1, at the only point that matters — the
   first hours entry is the moment work provably started. Gating the Job Plan tab instead
   would block legitimate prep; gating the timesheet blocks the actual thing.
3. **The agreement cannot be marked signed by the deposit button.** Split them. This is a
   correctness fix, not a workflow gate.
4. **Sending a client estimate requires manager approval.** Closes 3b. It already looks like
   a rule; make it one.

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

---

## 8. Decisions needed from you

1. **How do clients actually accept an estimate** — verbally at the walkthrough, by email
   reply, or only by signing the agreement? If acceptance and signature are the same event
   for you, `won` and `contracted` collapse into one status and this gets simpler.
2. **Is the deposit ever waived or varied?** Repeat clients, referral-partner jobs, a client
   who wires the full amount up front. If yes, the `funded` gate needs a documented override
   rather than a hard wall.
3. **Do you want per-person PINs?** Today one shared code and a hardcoded name. Real
   accountability means each person has their own.
4. **Should invoices be retained to Drive automatically?** My recommendation is yes — it is
   the cheapest defence you can buy.
5. **Who may record a deposit as received** — anyone, or founders only?
6. **What happens to a job that dies after the deposit?** Partial refund, retained deposit,
   something else. There is no path for it today.

---

## 9. What this audit could not determine

- **Whether Stripe payments actually flow through the app.** A payment-link request goes to
  an Apps Script endpoint (Agreement tab, gated on `agrApproved` at `15313`), but nothing
  observed writes `depositReceived` back from a Stripe callback. It appears to be recorded by
  hand. Not conclusively traced.
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
