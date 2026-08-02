# HAVELLIN PALM BEACH

*Concierge Job Playbook · Running a Job End to End · Internal*

---

This is the **how do I run a job** document. It follows one job in order, from the first phone call to the final invoice, and tells you which tab to be on, what to type, and what the app will refuse to let you do until something earlier is done.

It deliberately does not explain how the app is built. Setup, Apps Script URLs, folder IDs, the pricing engine's formulas, the vendor taxonomy and every other configuration matter live in the **Operations Manual** (`manual.html`). If something here says "the app works this out," the manual is where the arithmetic is written down.

> **Three things are recorded by hand, always.** The client's acceptance, the signed agreement coming back, and every payment. Nothing arrives by itself and nothing is automatic — if you don't record it, the app does not know it happened, and the next step stays locked.

## The Job, Start to Finish

```
1. Intake → 2. Build the estimate → 3. Manager approves it → 4. Email it to the client
→ 5. Client says yes → Mark Won → 6. Approve & send the agreement → 7. Staff the job team
→ 8. Mark it signed → 9. Record the deposit → 10. Work the job: document, log hours, source vendors
→ 11. Midpoint invoice → 12. Final invoice → 13. Close the job
```

**Four points in that sequence are hard gates.** The app refuses — it does not warn, and there is no override:

| You cannot… | Until… | Why |
| --- | --- | --- |
| Email the estimate | A manager has approved it | The figure isn't final until somebody has signed off on it. |
| Staff the job team, or open the staffing section of the Job Plan | The job is marked **Won** | Holding a specialist for these dates means turning down other work. Never commit crew to a job the client hasn't accepted. |
| Log hours | The **deposit** is recorded and complete | The deposit is never waived, so this gate is always safe to enforce. |
| Issue the final invoice | Hours are logged | The final bills labour at hours actually worked. No hours means there is nothing behind the number, so no manager can unlock it. |

## Step 1 · Intake — Client Intake tab

Fill in everything marked *. The Job ID (`HVL-YYMM-XXXX`) and the client's Drive folders are created for you on save.

- **Service type** — Downsizing · Downsizing & Move Management · Home Cleanout · Estate Settlement · Probate Estate Settlement · Contested Probate Estate Settlement · Home Prep for Sale.
- **Square footage** is what drives the sizing. Property type is just a label. Bedrooms, full baths and half baths are separate fields, so "five baths" is never ambiguous.
- **Estate and probate jobs need an authorised representative** — executor, POA or administrator, with name, role, phone and email. Probate also needs the case number and the attorney's details.
- **Documentation level** — Auto, Standard, or Formal (court & attorney grade). Auto is right almost always: it makes contested probate Formal and everything else Standard. Formal turns on the appraisal guardrails and makes chain-of-custody mandatory. This is separate from the Premium-estate rate — a premium job is not automatically a court-grade one.
- **Referral source** — if it came from an attorney, realtor or trust officer, link the actual Referral Partner so they get credit on the leaderboard. Family and friend referrals use the free-text name field.
- **Assigned concierge is optional here.** Intake usually runs a fortnight ahead of the work and nobody knows who is free. You staff the job properly at step 7.

> **Home Prep for Sale runs a shorter version of this whole playbook** — no room scoring, no crew, no hours. Skip to the Home Prep section near the end once intake is saved.

## Step 2 · Build the estimate — Build Estimate tab

Select the job from the dropdown. This is desk or iPad work — the room tables are not built for a phone.

### On the walkthrough

- Use **📝** for notes and **🎙** for voice-to-text in each room row. Voice transcribes as you talk. Hit **Save Notes** and it files itself to the job's Walkthrough Notes folder.
- **No photos at this stage.** Photography happens after the job is active, not on the estimate visit.
- Room sections open collapsed. Open each one as you walk that part of the house; use *Expand all / Collapse all / Hide empty* at the top.

### Scoring a room

Check the room to include it — it scores 3/3 by default. Then set Volume and Complexity 1–5:

| Score | Volume | Complexity |
| --- | --- | --- |
| 1 | Nearly empty | Simple / standard items |
| 3 | Moderately filled | Mix of standard and care items |
| 5 | Completely full | High-value / fragile / specialty handling |

Tick **Special Items** if the room holds artwork, antiques, or anything needing specialty care. Hours and a timeline appear as you score.

### The job settings that change the price

| Setting | What it does to the quote | When to use it |
| --- | --- | --- |
| **Premium Estate** | TC $185 / PS $125 instead of $150 / $100, plus a flat 25 hrs of specialty coordination. | Auction houses, appraisers, wine and art logistics. |
| **Property Specialists** | The app sizes the crew itself — the smallest number that lands inside the 10-working-day target (floor 2, cap 6). You can add more by hand. | Leave it alone unless you know something the app doesn't. |
| **Difficult access** | +15% to the physical work, which lengthens the job and so lengthens concierge time automatically. | Stairs, no elevator, long carry. |
| **Multiple heirs** | +20% to off-site coordination — more calls and sign-offs, not more boxes. | Greyed out on contested probate; it's already in those rates. |
| **Rush order** | A flat **20% expedited-delivery premium** on the Havellin services total, shown to the client as its own named line. Never on vendor costs. | When the client is buying a compressed calendar — a second concierge and a bigger crew in parallel. |
| **Quote as a fixed price** | Replaces hourly with a firm flat fee, prefilled from the suggested figure and fully editable. | **Not available on Probate or Contested Probate** — the toggle is disabled. Those bill on logged hours so the expense stands up in court. |
| **Preferred Client Discount** | Percentage off Havellin labour only, max 30%. | Read the margin panel before you use it. |
| **Moving Materials Package** | Estate tier ($500 / $750 / $1,500) or Downsizing tier ($200 / $350 / $550). | Or None. |

> **⚠** **A bigger crew makes the estimate go DOWN, not up.** The concierge works alongside the crew, so more specialists finish sooner and the concierge is on site for fewer billable hours. That is correct pricing — but it means a crew size left over from a larger job will quietly discount this one. **Never carry a crew size between estimates.** The app flags any crew above its own recommendation; take the flag seriously.

### Vendors, collections and vehicles

- **Third-party vendors** — add each with an estimated cost. A **15% Service Management Fee** calculates automatically. Vendor costs are estimates; the client is billed by the vendor directly at cost.
- **Home Prep as an add-on** — tick *Include in estimate* in the Home Prep section. Prep vendors carry a **30% GC fee**, not the 15%.
- **Notable Collections** — name, estimated value, quantity and a proposed disposition (appraise, auction house, consignment, estate sale, licensed FFL, gold & silver buyer, and so on). **The disposition you pick adds hours**, and the rule is simple: *if the specialist comes to the property, you're standing there; if the items go out to them, your time is phone and paperwork.* An appraisal, a dealer visit or an FFL handoff books real on-site time and lengthens the job. eBay, Replacements.com and consignment book coordination only. A ten-collection estate genuinely is a longer job than a two-collection one.
- **Vehicles & watercraft** — add each by description then fill the panel: type, year, VIN/HIN, mileage, condition, and the two flags — *collector / classic* and *title located*. Ordinary vehicles you value in-house from KBB/NADA as of the date of death; collectors and boats route to an appraiser. Vehicles don't change the labour estimate.

### Reading the timeline badge before you save

| Badge | What to do |
| --- | --- |
| **Green** | Nothing. Either it's inside the 10-day target, or it's longer because the house is big and the crew is already at 6 — no lever left. |
| **Amber** | Over target *with crew headroom*. Adding a specialist would pull it back. This is the one badge you can act on. |
| **Red** | The projection misses the client's hard date. Renegotiate scope or the deadline *before* you send the estimate. |

> **If the app recommends a second concierge**, it's telling you one person can't cover the schedule — more than 10 concierge hours a day. It changes neither the fee nor the duration; it stops somebody working 12-hour days. Contested probate and heavy documentation estates trip this, which is right.

Hit **Save & Preview Client Estimate**. It saves, syncs, and opens the client-facing preview. You can keep editing until it's approved.

## Step 3 · Get it approved — Client Estimate tab

Read the client-facing document for accuracy. Then **Submit for Approval** → a manager types their PIN → the estimate locks as *Approved for Release* and the PDF unlocks.

> **⚠** Once approved, the estimate **cannot be edited**. Service type, square footage and the premium toggle freeze. If the scope changes after this, it's a **Change Order** — see step 10.

No client signature is wanted on the estimate. It's informational.

## Step 4 · Send it — Client Estimate tab

**Email Estimate** opens a pre-drafted, warmly-worded email that ties back to the walkthrough. Attach the estimate and send.

> **⚠** An unapproved estimate **cannot be emailed**, from this tab or from the dashboard shortcut. If the button refuses, go back to step 3.

Then wait. Do not send an agreement, do not book anybody.

## Step 5 · The client says yes — Client Dashboard

Open the job card and hit **✓ Client Accepted — Mark Won**. Acceptance is informal — nothing is signed until the agreement — so the app records *how you know*:

- **Method** — email reply · phone call · text · in person
- **Date** they accepted
- **What they said** — paste the email, or write down what was said on the call

> A phone call or in-person acceptance **with no note** gets challenged before it's accepted. There's no email to fall back on, so your note is the only record of what the client actually agreed to. Write it while you remember it.

*Approved* and *Won* are different things and the difference is the whole point: approved means a manager signed off on our figure; won means the client said yes. Marking Won is what unlocks staffing.

## Step 6 · Agreement — Agreement tab

> **⚠** **Never send an agreement before the job is marked Won.** Record the acceptance on the dashboard first.

1. Select the job — the agreement populates from the approved estimate.
2. A manager enters their PIN to approve it for sending. The approved agreement files itself to the Drive **Agreement** folder at this moment.
3. **Print / Save PDF** or **Email to Client**.
4. Hit **✉ Mark Agreement Sent**.

Three buttons then appear one at a time, each in its own turn, each recording who did it and when. None of them will run out of order — you cannot mark a signature on an agreement that was never sent.

| Button | Press it when |
| --- | --- |
| **✉ Mark Agreement Sent** | You've emailed it or handed it over. |
| **✓ Mark Agreement Signed** | The signed copy has come back. Signing does *not* mean paid — the app keeps those separate on purpose. |
| **✓ Record Deposit** | The money is in your hand. This is what lets work begin. |

## Step 7 · Staff the job team — Job Plan tab

Do this in the wait between sending the agreement and the deposit landing. You know the job is happening; now find out who is actually free.

1. Open the job's **Job Team & Hours** roster. It shows the crew the approved estimate was priced for — not a blank six slots — plus a concierge row and an optional second concierge row.
2. Confirm each person's availability, then name them. Any empty planned slot is flagged **"needs a name."**
3. Need somebody beyond what was quoted? **+ Add a specialist beyond plan**. Those rows are tagged *beyond plan*, because crew above plan eats margin against a fixed quote and the projection will say so.
4. **Save & Confirm Job Team →**

- **Placeholders are fine.** *Contractor TBD* and *Contractor — TC* mean a confirmed need with an unconfirmed person. They cost at a placeholder rate, so the app says out loud that margin is an estimate until you name them.
- **Confirming locks the named people.** Empty slots stay open so you can add mid-job.
- **Revise team** reopens the roster — but anyone who has already logged hours stays locked. You can add to a team mid-job; you can never retroactively remove somebody who worked. Hours stay shut until you re-confirm.
- **One person, one role, one date.** A name taken disappears from the other selects and a duplicate is refused at save.

> **⚠** **Confirming the team does not start the clock.** Hours stay locked until the deposit is in. A confirmed team on an unfunded job keeps its confirmation and tells you plainly that the deposit is what's missing. Staffing ahead of payment is deliberate; starting work is not.

## Step 8 · Signed copy back

**✓ Mark Agreement Signed** on the Agreement tab. That's it — but do it the day it arrives, because the deposit button won't appear until you have.

## Step 9 · Record the deposit — Agreement tab

The deposit is **50% of the approved total** and it is **never waived or varied**. The same button records all three payments; a *Which payment is this?* picker at the top opens on the first unsatisfied stage, so in normal use you never touch it.

Recording a payment captures evidence, not a tick:

| Field | What to put |
| --- | --- |
| **Amount** | Prefilled with what's still outstanding — a second cheque needs no arithmetic in the field. |
| **Date received** | The day it reached your hand, not the day it clears. |
| **Method & reference** | Cheque number, wire confirmation, Stripe id. |
| **Paid by** | The trust, estate account, law firm or the client. In estate work the payer is often not the client, and this is what shows the estate is funding the engagement properly. It also settles the argument if heirs later dispute who paid for what. |
| **Photo of the cheque** | Take it *before the cheque leaves your hands.* Five seconds, and it's what makes a hand-recorded payment a document rather than an assertion. It files to Drive against the payment. |

**Partial payments are normal.** Two cheques, or the trust sending part and the family the rest, all work. The job stays part-paid and unfunded until the running total hits the target, the bar shows what's outstanding, and the button stays available for the next one. A short total asks before it's accepted; a second cheque that completes the deposit goes through without a warning.

> **Work starts on *received*, not *cleared*.** Waiting for cheques to clear costs three to five days on every job. Wires, cards and cash are marked cleared on receipt; cheques show as uncleared on the dashboard until the bank confirms.

### Deposits over $10,000

Above $10,000 a personal cheque is no longer the accepted instrument: **wire preferred, cashier's cheque accepted.** Recording a large personal cheque anyway is allowed — the money is already in hand — but it's flagged as a policy exception and carries your name.

Two things worth knowing when you ask for one:

- A **certified** cheque is not a **cashier's** cheque. Certified is drawn on the client's account with the bank only secondarily liable. A cashier's cheque is drawn on the bank's own account with the money already taken. Ask for the second one, by name.
- Neither is bounce-proof — counterfeit cashier's cheques are a common fraud and a bank can reverse weeks later. On a large one, phone the *issuing* bank on a number you look up yourself, never the number printed on the cheque. A wire beats both: it's final on receipt, and it's what trust officers and law firms do routinely anyway.

### What you're collecting, and when

| Milestone | Amount | Timing |
| --- | --- | --- |
| Deposit | 50% of the estimate | On signing |
| Midpoint | Brings the cumulative to 75%, with vendor and prep fees trued to the actual quotes you've logged | At project midpoint |
| Final | The balance — labour trued to logged hours, fees on actuals, plus any accepted Change Orders | Within 7 days of the final invoice |

> Only the deposit gates anything. Recording a midpoint or final payment captures the money so the job's paid total is complete — it doesn't unlock anything, and a midpoint cheque of any size will never fund a job. Those two stages prefill nothing and challenge nothing: type what arrived.

## Step 10 · Work the job

The job is now **Active**. Three things run in parallel.

### a. Document the property — Client Dashboard → job documentation

This is the only stage where photos are captured.

- **📷** per room — photos upload automatically to the **Estate Inventory** Drive folder. Each room row shows its walkthrough note from the estimate in grey italic, so you're photographing against what you wrote at the time.
- **🎥** per room — video walkthrough footage.
- **📷 Asset photos** and **📄 Appraisal** on each notable collection — condition photography and the appraisal document itself.
- **Capture item** on a room card — photograph individual objects for the inventory. Type the object name, pick a category and set a disposition *before* the shot. Anything in an intrinsic category (art, jewellery, silver, antiques, rugs, coins, firearms, wine, instruments) that carries real value gets a **⚑ needs-a-specialist** flag.

### b. Log hours — Job Plan tab, every single day

One entry per working day: the **date**, an **activity summary**, and **hours against each named crew member**. The roles come from the roster you confirmed — concierge rows log as TC, specialist rows as PS.

> **⚠** **Log daily. Do not batch at end of job.** The hours drive the forward-variance projection *and* the final invoice — the timesheet *is* the invoice. A job with no logged hours cannot issue a final invoice at all, and nobody can unlock it for you.

Log *your own* hours as well as the crew's. You are on site for every crew hour; if the log shows crew time with no concierge time against it, the invoice warns you in dollars about the time it thinks you've missed.

### c. Source the vendors — Job Plan tab

Assign a directory vendor to each estimate line, set its status, and **record the actual quote**. Those actuals are what the midpoint and final invoices charge the 15% / 30% fee on — a line with no logged quote falls back to the estimate and gets tagged "est." on the client's invoice.

Only **Active** vendors appear in the picker. An assigned vendor's phone is a tap-to-dial link, because you're usually standing in the house when you need them.

### d. Change Orders — Client Dashboard

Scope changed after approval? Do *not* edit the estimate — it's locked. From the job card: **Create Change Order** → description, the dollar impact (positive to add, negative to reduce), and a reason. **No manager PIN is involved** — a change order is priced with the client, not approved internally.

Then two buttons appear on it:

1. **PDF** — the printable change order showing the original total, the change and the revised total.
2. **Get Acceptance** — the client types their name against *✓ I Accept This Change Order.* Hand them the iPad, or record it yourself off their email or call.

> **⚠** **An unaccepted Change Order is never billed.** The final invoice counts accepted change orders and silently ignores the rest. A change order created, printed, agreed on the phone and never marked accepted is work you will do and not charge for. **Take the acceptance at the moment the client agrees.**

### e. Estate Inventory — Inventory tab

On estate and probate jobs, the manifest assembles from three places: items you captured on room cards, **+ Add line item** for an asset with no photo (cash, an account, a vehicle), and a **From the Estimate Walkthrough** panel that pulls in the collections and vehicles you flagged at estimate time — as a lot or itemised. Nothing can be imported twice.

- **Appraisers** — build the roster per estate: name, firm, credential (ISA / ASA / AAA / USPAP / GIA), independence, and the effective and report dates. An item valued by appraisal links to a roster appraiser instead of free text.
- **The $3,000 guardrail** — flagged items with no appraiser attached raise an amber nudge on a Standard job and a **red block on a Formal one**. Per-item **Waive** logs a reason. On a Formal job the Court Inventory prints *DRAFT* until every flagged item is appraised or waived.
- **Valuation basis and date** — Fair Market Value by default, valued as of the date of death. If the estate is taxable and counsel elects the §2032 alternate date (six months after death), toggle it and the schedule follows.
- **Asset track** — Probate / Trust / Non-probate / Homestead / Exempt. Only Probate-track items reach the Court Inventory, so the schedule doesn't overstate the estate.
- **🔗 Custody log** per item — released / received / transferred / returned, with party, date, method and receipt. Mandatory on Formal and on any probate job.
- **Snapshot** — a labelled point-in-time copy of the manifest. This is your amended-inventory trail; print any snapshot as an as-of schedule.

**Exports:** *Court Inventory* (the §733.604-style schedule counsel files — Havellin does not file it), *Disposition Ledger* (gross / fees / net to the estate — our own service fee never appears on it), *Appraisal Worklist* (a per-specialist packet to hand each appraiser), and **Share w/ Counsel**, which grants the attorney or trust officer read-only access to the whole Estate Inventory folder by name — never a public link. **Revoke** takes it back. Financial folders stay private either way.

> Everything in the inventory is documentation support, not a legal or appraisal opinion. The estate attorney and a credentialed appraiser remain the authority.

## Step 11 & 12 · Invoices — Invoices tab

Select the job, then pick a **Stage**. The stage advances by itself as you record payments, so it's usually already on the right one.

| Stage | What it bills |
| --- | --- |
| **Deposit** | 50% on the estimate basis. No actuals exist yet. |
| **Midpoint** | Brings the cumulative collected to 75% and trues vendor and prep fees to the quotes you logged. Labour stays on estimate until the hours are complete. |
| **Final** | Labour trued to logged hours, fees on actuals, plus any accepted Change Orders. |

### What needs a PIN — and what doesn't

**Most invoices need no PIN.** Deposit and midpoint are formulaic from the approved estimate, so they print straight out and show *No approval required*. Only the **final** asks for a manager PIN, and only when it lands more than **±15%** away from the estimate — the banner names the percentage and the direction. Accepted change orders are left out of that comparison, since the client already agreed to those separately.

> **⚠** **No hours logged = no final invoice.** No PIN, no PDF, no email, and no manager can unlock it. This is the one thing most likely to bite a practice run: skip the daily logging and the final simply will not issue. Go log the hours, then reprint. (Fixed-price and Home Prep jobs are exempt — their labour total doesn't come from the log.)

### Things you'll see on an invoice

- **A rush job carries its 20% expedited-delivery line on all three stages.** If you invoiced a rush job before August 2026, re-print its midpoint and final and check the totals against what the client agreed — the premium used to be dropped after the deposit.
- **A negative final invoice is not a bug.** If the job ran far enough under estimate, the 75% taken by midpoint overcollected. It renders as a green Credit and the document says the job came in under estimate. That's correct — issue it.
- **Every invoice you print files itself to Drive**, one file per stage, so the three never overwrite each other. Reprinting a stage replaces its own copy — which is what you want when you correct a figure and reissue.
- **On a fixed-price job** the flat fee *is* the services total; the stages split that number and labour is never trued to hours. Vendor and prep fees still true up to actual quotes either way.

## Step 13 · Close the job — Client Dashboard

Final invoice paid → close the job. The app stamps the delivery date, the time, and who closed it, **once**. Re-opening and re-closing does not move that date — it records when the work was actually handed over.

The status button on a closed job reads **Re-open** and returns it to *Active*, where it left off. It does not send the job back to the start.

### If the job dies instead

The **✕** on the job card opens closeout, and what it does depends on whether money arrived:

- **Before the deposit** → *Lost*, with a reason (price, scope, timing, unresponsive, competitor, other) and an optional note — competitor name, price gap. A job marked Won that then withdraws flips back to not-won: a win that produced nothing isn't a win.
- **After the deposit** → the button becomes **Close — Retain Deposit**. We keep the money and it still counts as won, because it produced revenue.

> **⚠** Both of those are **terminal**. The status button will not move them. If a lost client comes back, start a new job.

## Where the job sits — the status list

| Status | Means | What's unlocked |
| --- | --- | --- |
| New | Intake done, no estimate yet | Build Estimate |
| Pending Approval | Estimate submitted for a manager PIN | — |
| Approved — Awaiting Client | We approved our own figure. **The client has not answered.** | Email the estimate. Nothing may be staffed. |
| **Won** | The client accepted | Agreement, staffing, the Job Plan staffing section |
| Active | Signed and deposited — work in progress | Hours, photos, invoices |
| Closed | Final invoice paid; delivery stamped | Re-open returns it to Active |
| Lost | Died before any money arrived | Terminal |
| Closed — Deposit Retained | Died after the deposit; we keep it | Terminal. Still counts as won. |

## Home Prep for Sale — the short version

A sell-side, show-ready service, mostly through Douglas Elliman referral agents. Havellin manages every trade — paint, repairs, landscaping, deep cleaning, staging — and charges a flat **30% GC / Site Management Fee** on the managed vendor spend. No room scoring, no in-house labour, no crew, no hours log.

> **⚠** **The agreement is with the homeowner.** The referring agent is a referral channel, never our client. No document should suggest otherwise.

1. **Intake** with Service Type = *Home Prep for Sale*. No property value needed.
2. **Build Estimate** hides rooms, crew and labour entirely. Add each prep item and vendor with an estimated cost — the 30% shows per line and in total. **Fill in the scope note on every line** while you're on the walkthrough: exactly what you'll tell that trade ("5 bedrooms + hallway, walls & ceilings; front and back landscaping"). It carries through to sourcing.
3. **Client estimate** reads vendors-first: itemised vendor estimates at cost, then the 30% fee, then one total. Same 50 / 25 / 25 schedule on the Havellin fee. No completion date is projected — the schedule is confirmed once vendors are booked, and the estimate says so.
4. Approve → send → Mark Won → agreement → deposit, exactly as above.
5. **Job Plan** is stripped down to three things: *Budget & Fee* (estimated spend, quoted-to-date, the running 30% on actual quotes, with an over-budget flag), *Home Prep Vendors — Sourcing & Status* (assign the vendor, set status, log the actual quote against the scope note), and a *Coordination Checklist* — scope confirmed → quotes collected → vendors booked → work underway → completed/inspected → final invoices and fee billed.

## Quick reference

### What we bill the client

| Item | Standard | Premium Estate |
| --- | --- | --- |
| Transition Concierge | $150/hr | $185/hr |
| Property Specialist | $100/hr | $125/hr |
| Service Management Fee (third-party vendors) | 15% of vendor cost | 15% |
| Home Prep GC / Site Management Fee | 30% of prep vendors | 30% |
| Moving Materials | Cost + 25% | Cost + 25% |
| Expedited delivery (rush) | +20% of Havellin services | +20% |

Every service bills **time-and-materials by default**. A firm fixed price is available on any job *except* Probate and Contested Probate. Vendor work is pass-through — the vendor bills the client directly at cost and Havellin takes only the fee on top.

### Manager PIN required for

- Approving or denying an estimate
- Approving an agreement for sending
- A **final** invoice more than ±15% off the estimate (deposit and midpoint need none)
- Deleting a client, vendor or partner

**Not** required for a Change Order — that one is settled with the client, not internally. Everyone has their own PIN and the approval is recorded under whoever typed it, so use yours.

### The margin panel

It's an indicative profitability readout with a flag on it — **not a discounting tool**. *Price at 30% Margin* is a reference line at an admittedly arbitrary margin and *Above Reference* is simply the distance to it. Neither is an allowance to spend. In practice, a job needing that much discount is one to walk away from rather than price down to. The panel also shows what the 50% deposit covers at the quoted price and warns in dollars when it stops covering cost.

### If something won't let you proceed

| Symptom | What's missing |
| --- | --- |
| Email Estimate refuses | The estimate isn't approved. Submit for Approval first. |
| Can't edit the estimate | It's approved and locked. Use a Change Order. |
| Staffing refuses / Job Plan staffing section is hidden | The job isn't marked Won. Record the client's acceptance on the dashboard. |
| Mark Signed / Record Deposit buttons aren't there | The step before hasn't been marked. They appear one at a time, in order. |
| Save Hours Entry is greyed out | Either the team isn't confirmed, or the deposit isn't in — the bar says which. |
| Final invoice won't print, and no PIN is offered | No hours are logged. Go and log them. |
| A change order isn't on the final invoice | It was never marked accepted. Get Acceptance. |
| A vendor isn't in the Job Plan picker | They aren't set to *Active* in the Vendor Directory. |
| A crew member isn't in the staffing dropdown | They aren't *Active* on the Contractors tab. |
| Fixed-price toggle is disabled | It's a probate or contested probate job. Those bill on logged hours. |

---

Havellin Palm Beach · 515 N Flagler Drive, Suite 350, West Palm Beach, FL 33401 · Concierge Job Playbook · Internal use only · Not for distribution · For configuration, setup and system reference see the Operations Manual
