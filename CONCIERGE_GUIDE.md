# HAVELLIN PALM BEACH

*Concierge Job Playbook · Running a Job End to End · Internal*

---

This is the **how do I run a job** document. It follows one job in order, from the first phone call to the final invoice, and tells you which tab to be on, what to type, and what the app will refuse to let you do until something earlier is done.

It deliberately does not explain how the app is built. Setup, Apps Script URLs, folder IDs, the pricing engine's formulas, the vendor taxonomy and every other configuration matter live in the **Operations Manual** (`manual.html`). If something here says "the app works this out," the manual is where the arithmetic is written down.

> **The Operations Manual is the master document.** It covers everything in this playbook and everything this playbook leaves out. This is the walk-through-it-in-order extract, written for running a job with the app open — where the two disagree, the manual is right and this file needs fixing. Both are reconciled against the app together; the version stamps at the foot of each say when. Plain-text copies for a phone or a printer: `CONCIERGE_GUIDE.md` and `MANUAL.md`.

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
- **Home Cleanout is for a LIVING client. A house whose owner has died is an *Estate Settlement*.** Two different engagements at two different prices — the service type you pick here is what decides how every client document is written, and there is no second question anywhere that lets you correct it.
- **Documentation level** — Auto, Standard, or Formal (court & attorney grade). Auto is right almost always: it makes contested probate Formal and everything else Standard. Formal turns on the appraisal guardrails and makes chain-of-custody mandatory. This is separate from the Premium-estate rate — a premium job is not automatically a court-grade one.
- **Referral source** — if it came from an attorney, realtor or trust officer, link the actual Referral Partner so they get credit on the leaderboard. Family and friend referrals use the free-text name field.
- **Assigned concierge is optional here.** Intake usually runs a fortnight ahead of the work and nobody knows who is free. You staff the job properly at step 7.

> **⚠** **Get the service type right — it is the most consequential field on this form.** Pick *Home Cleanout* and the app writes to a living owner of their own property; pick *Estate Settlement* and it writes to the **authorised representative** of someone who has died, asks for the deceased's name instead of a client phone and email, and generates a different engagement agreement. There is no tick box and no override. A cleanout booked for a family whose mother died last month, filed under *Home Cleanout*, addresses her as the living owner of her own house — to the people who just buried her — **and under-prices the job**, because the estate services carry the documentation and disposition work a cleanout does not.

> **Home Prep for Sale runs a shorter version of this whole playbook** — no room scoring, no crew, no hours. Skip to the Home Prep section near the end once intake is saved.

## Step 2 · Build the estimate — Build Estimate tab

Select the job from the dropdown. This is desk or iPad work — the room tables are not built for a phone.

The tab reads top to bottom in three bands. **Top card:** *Job* on the left (job, service type, target start date, who prepared it), *Crew* on the right (crew size, the "client needs it sooner" planner, and the adjustment toggles). **Middle:** vendors, then the rooms two across, then collections beside vehicles, then moving materials. **Bottom:** the summary, then the pricing reference check beside the three price levers — discount, rush, fixed price. Scope decisions at the top, price decisions at the bottom next to the price.

### On the walkthrough

- Use **📝** for notes and **🎙** for voice-to-text in each room row. Voice transcribes as you talk. Hit **Save Notes** and it files itself to the job's Walkthrough Notes folder.
- **Private Walkthrough Notes** — the box at the end of the room grid, with its own mic. Internal only: never on the client estimate, never in a shared folder. It's for what you wouldn't say in front of the family — access problems, hoarding, who's actually making the decision. Dictate it in the car on the way out.
- **No photos at this stage.** Photography happens after the job is active, not on the estimate visit.
- Room sections open collapsed and run two across. Open each one as you walk that part of the house; use *Expand all / Collapse all / Hide empty* at the top.

### Scoring a room

Check the room to include it. It starts at 3/3 in most rooms — but foyers, half baths, secondary bathrooms, laundry, mudrooms and utility rooms start at 1/1, and primary baths at 2/2. Wherever it starts, **score what you're looking at**. Then set Volume and Complexity 1–5:

| Score | Volume | Complexity |
| --- | --- | --- |
| 1 | Nearly empty | Simple / standard items |
| 3 | Moderately filled | Mix of standard and care items |
| 5 | Completely full | High-value / fragile / specialty handling |

Tick **Special Items** if the room holds artwork, antiques, or anything needing specialty care. Hours and a timeline appear as you score.

**The hours on a room row are that room's full share of the job** — sorting, documentation, packing and haul-out together. Add the rows up and you get the fee lines. This changed on 2026-08-03: the rows used to show the *packing step only*, which is about a quarter of the work on an estate settlement, so every room understated itself by roughly **3.7×**. A 2-car garage read *2.4 PS* and was really booking over nine person-hours. If a room looks expensive now, that is the real number — it always was.

> **"How full is this house?" — press one chip instead of moving nineteen sliders.** Above the room grid: **Seasonal · Light · Normal · Full · Packed**. Tick your rooms as normal, then press the one that matches what you walked into. It sets the starting volume for every room in scope at once. *Normal* is what the app did before, so if you ignore the row nothing changes.
>
> It is a *shift*, not a blanket setting — a powder room stays lighter than a living room on every preset. Adjust individual rooms afterwards for anything that does not fit the pattern ("the house is full but they already cleared the garage"); your edits stand until you press another chip. Pressing the same chip twice does nothing new.
>
> It does not touch complexity. Volume is *how much stuff*; complexity is *how careful you have to be*. Two different questions, and the premium-estate toggle already handles the high-end rate.

Don't compare room hours between service types. The same closet shows *more* hours on a downsizing job than on an estate settlement, even though the estate job is more than twice the work — because on a downsizing nearly all the work is packing, so nearly all of it lands on the room rows.

> **⚠** **Score the whole house, not a sample.** Volume and complexity are averaged across the rooms you score and then applied to the *entire* square footage. Tick one foyer at 1/1 on a 10,000 sqft estate and the app prices all 10,000 sqft as if the whole house looked like that foyer — on a real job that dropped the quote from about $44,900 to $24,100. A half-finished walkthrough doesn't give you half a price, it gives you a *wrong* price.

The app checks you on this. Under the room grid it compares the bedrooms and baths recorded at intake against the ones you've actually scored:

| Badge | What to do |
| --- | --- |
| **Green** — room coverage matches intake | Nothing. Every bedroom and bath on record is scored. |
| **Amber** — walkthrough looks incomplete | It names the shortfall: "scored *2 of 5* bedrooms". Finish the walkthrough. It won't stop you saving — it's on you to know why you're ignoring it. |

If it says nothing at all, intake never captured the bed and bath counts. Go and fill them in — the check has nothing to compare against without them.

**Guest house, casita, cottage, pool house?** They live in **Outbuildings & Guest Quarters** and you score each one as a *whole building* — pick the row matching its bedroom count and set volume and complexity once. There are no separate rows for its kitchen or its bath any more. Two things to get right: the **casita** moved here out of Exterior & Auxiliary, and the pool house now appears in exactly one place depending on what it is — *Pool House / Cabana — no living quarters* under Exterior, or *Pool House — with living quarters* here. It used to be in both lists under the same name, and ticking both charged the client for it twice.

Outbuildings don't count toward the bedroom and bath numbers from intake — those are the main house. A four-bedroom house with a two-bed guest house is *4* at intake, not 6. Put 6 in and the coverage badge can never clear.

**Looking for a second half bath?** There are five to find: *Half Bath* in **Entry & Living**, in **Kitchen & Utility**, and in both the **First Floor** and **Second Floor Bedrooms & Bathrooms** sections, plus *Pool / Cabana Half Bath* in **Exterior & Auxiliary**. Tick the one that matches where the powder room actually is. Don't reach for *Additional Bathroom(s)* — that counts as a *full* bath, so it pushes the wrong number up and leaves the half-bath shortfall exactly where it was.

### The job settings that change the price

| Setting | What it does to the quote | When to use it |
| --- | --- | --- |
| **Premium Estate** | TC $185 / PS $125 instead of $150 / $100, plus a flat 25 hrs of specialty coordination. | Auction houses, appraisers, wine and art logistics. |
| **Crew** — concierges and specialists | Two dropdowns side by side in the *Schedule & Crew* card. The app sizes both itself and keeps adjusting them up *and down* as you score. The moment you set one yourself it stops moving and reports what your choice costs instead. | Leave them alone unless you know something the app doesn't. You're saying *how many*, never *which* — naming people is Job Plan work, step 7. |
| **Client needs it sooner?** | Pick the *date* the client asked for and the planner tells you what crew reaches it — see below. | Whenever a date comes up on site. Read it *before* you tick rush. |
| **Difficult access** | +15% to the physical work, which lengthens the job and so lengthens concierge time automatically. | Stairs, no elevator, long carry. |
| **Multiple heirs** | +20% to off-site coordination — more calls and sign-offs, not more boxes. | Greyed out on contested probate; it's already in those rates. |
| **Rush order** | A flat **20% expedited-delivery premium** on the Havellin services total, shown to the client as its own named line. Never on vendor costs. | When the client is buying a compressed calendar — a second concierge and a bigger crew in parallel. |
| **Quote as a fixed price** | Replaces hourly with a firm flat fee — the hourly basis plus a **20% contingency** — prefilled and fully editable. | **Not available on Probate or Contested Probate** — the toggle is disabled. Those bill on logged hours so the expense stands up in court. |
| **Preferred Client Discount** | Percentage off Havellin labour only, **max 15%**. Same cap on *Offer Discount* from the Client Estimate tab. | Sparingly. The cap is the guardrail — the margin panel is no longer shown on this tab. |
| **Multiple heirs** — read this once | It adds a full 20%, but to *off-site coordination* — not to total concierge hours. Coordination is about half the concierge line, so the total moves about 10%. | Nothing. It is not a bug; people report it as one. |
| **Moving Materials Package** | Estate tier ($500 / $750 / $1,500) or Downsizing tier ($200 / $350 / $550). | Or None. |

> **⚠** **A bigger crew makes the estimate go DOWN, not up.** The concierge works alongside the crew, so more specialists finish sooner and the concierge is on site for fewer billable hours. That is correct pricing — but it means a crew size left over from a larger job will quietly discount this one. **Never carry a crew size between estimates.** The app flags any crew above its own recommendation; take the flag seriously.

**If you discount and expedite the same job**, the order is: services total, *less* the discount, *then* 20% on what's left, then vendors at cost. The discount never applies to the premium and the premium is never charged on money you already discounted away.

### When the client wants it faster — the timeline planner

Under the crew dropdowns there's a date field: *client needs it sooner?* **Pick the date they asked for** — the app works out the days. It shows you what the job delivers as staffed first — "As staffed: 8 working days at 2 specialists — done Aug 19" — then answers the date three ways:

| Answer | What to say on site |
| --- | --- |
| **Green** — "Sep 30 is comfortable" | "Yes, comfortably." **Do not tick rush.** Nothing is being expedited and you can't defend the premium. |
| **Amber** — "Reachable — Aug 14 with 4 specialists", with a button | Offer it. The button sets the crew and, when it really is faster than normal, ticks expedited delivery. The summary underneath shows the price before you commit. |
| **Red** — "Aug 11 is not reachable" | Six specialists is the cap. Counter with the date it gives you, or take scope out. Don't agree to the date. |

> **The amber button comes two ways.** "*Rush it — 4 specialists, done Aug 14, +20%*" means genuinely faster than normal, so the premium applies. "*Set crew to 3 — done Sep 1, no premium*" means the date is reachable only because the crew was set below what the job needs — that's staffing it properly, not expediting, and we don't charge for it.

> **Compressing is good for us, not just for them.** A bigger crew moves hours off the concierge line onto the specialist line, so our cost *falls* while the premium adds revenue — on a 6,000 sqft cleanout, 8 days at 2 specialists versus 5 days at 6 went from 54% margin to 65%, and the client got it three days sooner. Say yes to the compression when you can deliver it.

> **⚠** **Don't charge the premium for a schedule you were going to run anyway.** That same job at its natural pace with rush ticked bills *more* than the genuinely expedited version — for nothing expedited. The app now says so out loud: tick rush without compressing and the badge reads *"Rush is on, but nothing is compressed … you are adding $X for no change in delivery."* Untick it, or add the crew.

### Vendors, collections and vehicles

Vendors are picked from **six Category Group cards** at the top of the build column — Asset Liquidation & Valuation, Disposal & Waste, Moving & Logistics, Professional Services, Property Preparation, and End-of-Job Logistics. Each is a category dropdown, an *Est cost* box and a **+**. The lists come straight from the Vendor Directory, so if a category is missing it's missing from the sheet — add it there (see the Operations Manual, §13a) and it appears here.

> **You pick a category, not a vendor.** Finding an appraiser who's actually free that week is office work at kickoff — the estimate says what the job *needs*, the Job Plan says who's doing it. Anything you add on the *End-of-Job Logistics* card carries through to the Job Plan and drops off its list there, so you're asked once rather than twice.

- **Third-party vendors** — add each with an estimated cost. Havellin charges **no fee** on them; they are billed to the client directly at cost, and your coordination time is billed hourly instead. **Every line you add books that time.** The card footer shows the running total per group. So adding a vendor does raise the quote now, and it should: sourcing, quoting, scheduling and chasing that vendor is real time you spend.
  > **Where those hours come from — count the touches, halve the count.** A *touch* is one thing you actually have to do with that vendor: a call to place, a quote to chase, access to arrange, work to go and look at, a settlement to reconcile. An estate sale company is 8 of them (call · walkthrough · contract · pricing schedule · sale-day staffing · mid-sale check · breakdown · settlement) so it books **4 hours**. A mover is 6 (survey · quote · insurance certificate · pack day · load day · delivery) so it books **3**. An appraiser or an auction house is 4 → 2 hrs · painting 3 → 1.5 · a hauler or a dumpster 2 → 1 · shredding 1 → 0.5. **If you think a count is wrong, say so** — that is the whole reason it is written as a count rather than an hours figure somebody once picked.
- **Home Prep as an add-on** — add the trades through the *Property Preparation* card, same as any other vendor. **That's the whole thing** — there's no box to tick and no second Home Prep section; if a line is on the card it's in the estimate. Fill in the **scope note** under each line while you're standing there. Bundled onto a labour job these carry **no fee**, billed at cost, plus your coordination hours (about 1.5 for painting, 2 for staging, 0.5–1 for most of the rest). The **30% GC fee applies only when Home Prep is the whole engagement**, where it's the only revenue there is.
- **Notable Collections** — name, estimated value, quantity, a proposed disposition (appraise, auction house, consignment, estate sale, licensed FFL, gold & silver buyer, and so on), what you expect that partner to charge, and a voice note. *You don't name the auction house here* — you tag a specific partner on the Job Plan when you're calling round with a list, and the disposition you pick is what scopes that picker to the right vendors. **The disposition you pick adds hours**, and the rule is simple: *if the specialist comes to the property, you're standing there; if the items go out to them, your time is phone and paperwork.* An appraisal, a dealer visit or an FFL handoff books real on-site time and lengthens the job. eBay, Replacements.com and consignment book coordination only. A ten-collection estate genuinely is a longer job than a two-collection one.
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

**The document now opens with a full job plan (new 2026-08-03).** Ahead of the money there is *How We Work*, *Spaces In Scope* grouped the way the Build Estimate grid groups them, and *How The Work Runs* — every stage of the job with what you will do, what you need from the client, and what finishes it. **Read it before you submit.** It is written out of the estimate, so a room filed in the wrong section or a vendor you forgot shows up here in plain English, where a number would not have caught your eye.

**Every vendor you entered is named in the stage it actually happens in** — appraisers in the sorting stage (they value while everything is still in place), haulers and auction houses in disposition, cleaners in close-out. So read the stages as a check on your vendor list: *if a vendor you entered is not named anywhere in the sequence, you have filed it under the wrong category.* What the client receives at the end — photographs, the inventory, vendor invoices, donation receipts, the final invoice against logged hours — is listed inside the Close-Out stage.

> **⚠** **Which version of this document you get is decided by the SERVICE TYPE, and nothing else.** *Estate Settlement*, *Probate* and *Contested Probate* are written to the representative of someone who has died. *Downsizing*, *Downsizing & Move Management*, *Home Cleanout* and *Home Prep* are written to a living owner. There is no field to override it — which is the point: the two documents and the price always agree about who the client is.
>
> **If this document has the wrong voice, the service type is wrong.** Go back to intake and change it, then re-open the estimate. Do not rewrite the wording — it is regenerated every time anyone renders the document, and the price is wrong too.

> **⚠** **On an estate or probate job the document reads completely differently, and it has to.** Those stages are written for the **representative** — the attorney, executor or trustee — not for a family standing in the house. Stage 2 is *Sorting, Documentation & Inventory*: we catalogue and **nothing is sold, donated or removed at that stage**, and the document tells them plainly they do not need to be on site. Stage 3 is *Distribution & Disposition* and will not start until the representative has read the inventory and authorised disposal **in writing**. On a downsizing the old decision-paced language stays, because there it is true.
>
> Two things in that copy are commitments *you* have to keep on the job: **releases against signed receipts**, and **nothing goes out on a verbal request**. If an heir asks you on site for something, the answer is that it goes through the representative in writing — be pleasant about it, and do not make an exception.

> **⚠** **Never ask a client for the will.** Ask for a certified copy of the **Letters**, and for the *list* of items designated to a named person — the representative or their attorney produces that list. If you find a will, codicil, deed or title in the house, it is **sequestered and handed to the representative and counsel against a signed receipt** (step 10a). We do not read it and we do not interpret it. The client document says so in as many words, and you should too.

Two things about it worth knowing before a client asks. **There are no dates or durations in it**, on purpose — the pace is set by how quickly they make decisions, and a date there is a promise about their calendar rather than ours. The document does not explain that absence either, so if a client asks, answer from the overall working-day estimate and say plainly that it depends on how fast they decide. And the stages come from the service type: a probate job shows documentation and court-filing stages, a home cleanout shows neither, a move shows Move Day. You cannot add or remove one by hand, and you should not try to — they are generated from the same thing that priced the job.

**Two things to check on the document itself (changed 2026-08-03).** Every vehicle you logged now appears in a *Vehicles & Watercraft* table — each one reads *Flagged for specialist appraisal* if you ticked Collector / classic, otherwise *Flagged for disposition*, and any vehicle without *Title located* ticked prints *Title to be located* in front of the client. That is deliberate — no title means no transfer, and they should hear it now rather than at closeout — but tick the box if you did find the title. The document never names a buyer or an appraiser for a vehicle; that gets decided on the job and recorded in the inventory.

On a **fixed-price** quote the document reads differently on purpose: one *Fixed Project Fee* line replacing the hourly rows, and **no hour counts anywhere** — including on the vendor and home-prep footnotes, which on an hourly quote tell the client how many concierge hours the vendor coordination took. A fixed-price document that quotes hours invites exactly the argument the fixed price exists to avoid.

> **⚠** **We are insured and bonded. We are NOT licensed.** Every client document said *"Licensed, Insured & Bonded"* until 2026-08-03. It is corrected everywhere in the app, but if you see the word *licensed* describing Havellin on anything that reaches a client — a document, an email, a proposal you have written yourself — take it out. *Licensed FFL* on a firearms disposition is a different thing and is correct: that is the vendor's licence, not ours.

The tagline on every client document is **"Havellin handles the work no family should face alone."**

> **⚠** Once approved, the estimate **cannot be edited**. Service type, square footage and the premium toggle freeze. If the scope changes after this, it's a **Change Order** — see step 10.

**Save to Drive** confirms itself now: the button turns green and reads *✓ Saved to Drive*, and the green approval banner gains a *📁 Filed to Drive · &lt;when&gt; · Open* line that is still there tomorrow. **If the button stays white, it did not save.** Pressing it again re-files and overwrites the old copy, which is what you want after an edit — and if you do edit, the *Filed to Drive* line disappears until it is re-approved, because the copy sitting in Drive is no longer the one on your screen.

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

> **⚠** **There are two agreement forms and you do not choose between them.** The app picks on the **service type**, the same way the estimate does (step 3): Estate Settlement and both probates get the **estate form**, written to a representative signing in a fiduciary capacity; Downsizing, Move Management, Home Cleanout and Home Prep get the standard form, written to an owner contracting for their own property. **Read the first paragraph before you send it.** If it addresses the wrong kind of client the service type is wrong — fix it at intake and re-generate. Never edit the agreement text by hand.

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

Photos can be captured from the moment the job is **Won** — you do not have to wait for the deposit, and the room cards are on screen from then on.

> **⚠** **This changed on 2026-08-03, and it is the fix to a real loss.** The app used to require *Active*. Because the camera buttons are on screen from *Won* onward, every photo taken between the client saying yes and the deposit being recorded was **thrown away without a word** — the camera opened, you took the shot, and nothing happened. If you took photos on a job in that window, **they are not in Drive**. Re-shoot if the property is still accessible.

- **📷** per room — photos upload automatically to the **Estate Inventory** Drive folder. Each room row shows its walkthrough note from the estimate in grey italic, so you're photographing against what you wrote at the time.
- **🎥** per room — video walkthrough footage.
- **📷 Asset photos** and **📄 Appraisal** on each notable collection — condition photography and the appraisal document itself.
- **Capture item** on a room card — photograph individual objects for the inventory. Type the object name, pick a category and set a disposition *before* the shot. Anything in an intrinsic category (art, jewellery, silver, antiques, rugs, coins, firearms, wine, instruments) that carries real value gets a **⚑ needs-a-specialist** flag.

> **Check the room card after you shoot.** A green number on the button means that many photos are filed in Drive. A red **⚠ not saved** means the upload failed and the photo is *not* in Drive — hit **Retry** on that shot. Retry works across sessions now, so a photo that failed yesterday can still be sent today; it used to do nothing at all and look identical to a button that had worked. If Retry tells you the image can no longer be recovered, the device did not have room to hold it — take the shot again.
> 
> The room cards themselves are in **walkthrough order**, matching the estimate, so you can work down the plan the way you walked the house.

### b. Log hours — Job Plan tab, every single day

One entry per working day: the **date**, an **activity summary**, and **hours against each named crew member**. The roles come from the roster you confirmed — concierge rows log as TC, specialist rows as PS.

> **⚠** **Log daily. Do not batch at end of job.** The hours drive the forward-variance projection *and* the final invoice — the timesheet *is* the invoice. A job with no logged hours cannot issue a final invoice at all, and nobody can unlock it for you.

Log *your own* hours as well as the crew's. You are on site for every crew hour; if the log shows crew time with no concierge time against it, the invoice warns you in dollars about the time it thinks you've missed.

### c. Source the vendors — Job Plan tab

Assign a directory vendor to each estimate line, set its status, and **record the actual quote**. On a standalone Home Prep job those actuals are what the 30% fee is charged on at the midpoint and final; on every other job Havellin charges nothing on them and they are recorded so the client's costs and the job's real margin are known. A line with no logged quote falls back to the estimate and gets tagged "est." on the client's invoice.

Only **Active** vendors appear in the picker. An assigned vendor's phone is a tap-to-dial link, because you're usually standing in the house when you need them.

> **Coord hrs — fill it in if it's easy, skip it if it isn't.** Next to each quote is a *Coord hrs* box showing what the estimate assumed (*est 3.0*). Roughly how long that vendor actually took you. **It bills nothing** — your logged hours already include the time you spent on the phone to them, so this is just labelling time that's already been charged, not adding any. It's there because the touch counts behind the quote are our best guess and nothing else in the app can check them; a handful of real jobs and we'll know whether a mover really is three hours. Nothing is gated on it and no invoice reads it. Once you've entered a few, a line at the bottom of the section totals estimated against recorded.

### d. Change Orders — Client Dashboard

Scope changed after approval? Do *not* edit the estimate — it's locked. From the job card: **Create Change Order** → description, the dollar impact (positive to add, negative to reduce), and a reason. **No manager PIN is involved** — a change order is priced with the client, not approved internally.

Then two buttons appear on it:

1. **PDF** — the printable change order showing the original total, the change and the revised total.
2. **Get Acceptance** — the client types their name against *✓ I Accept This Change Order.* Hand them the iPad, or record it yourself off their email or call.

> **⚠** **An unaccepted Change Order is never billed.** The final invoice counts accepted change orders and silently ignores the rest. A change order created, printed, agreed on the phone and never marked accepted is work you will do and not charge for. **Take the acceptance at the moment the client agrees.**

### e. Estate Inventory — Inventory tab

**This is your end-of-day tab.** The Job Plan is what you use in the house; the Inventory tab is what you open that evening at home or in the office to work through what you shot. Rebuilt 2026-09-01 around exactly that.

The manifest assembles from three places: items you captured on room cards, **+ Add line item** for an asset with no photo (cash, an account, a vehicle), and a **From the Estimate Walkthrough** panel that pulls in the collections and vehicles you flagged at estimate time — as a lot or itemised. Nothing can be imported twice.

#### How to work it

1. It opens on **Today** if you shot anything today. The five **Needs you** counts across the top are also filters — *Not yet decided · No value yet · Needs appraiser · Firearms held · Disputed / Hold*.
2. Start at the top. **Not yet decided** is everything you photographed without chipping a disposition onto it in the field, and it is your worklist. Rooms inside each group run in walkthrough order, so you are retracing your own day.
3. Put the value in on the row and pick the disposition on the row. When you change a disposition the item **moves** to that group — that is working, not a glitch.
4. Anything you need the rest of the record for — condition, flags, custody, appraiser, proceeds — press the **▾** and the item opens.
5. For the repetitive stuff, **tick the boxes down the left** and a bar comes up from the bottom: set disposition, room or valuation source across the whole selection at once. Forty household items to Junk is one action, not forty.
6. Tick **Reviewed** on each line as you finish it. The bar at the top tracks you.

> **Reviewing does not lock anything and does not unlock anything.** You can print the client's schedule at any point in a job — we show clients work in progress on purpose. Until every line is ticked the document prints with an **IN PROGRESS — 18 of 42 items reviewed** stamp and a line saying unreviewed values may still change. Don't apologise for it; that stamp is the honest thing on the page.

> **Where the columns went.** This tab used to be a 29-column spreadsheet with four buttons above it that swapped which columns you could see. Both are gone. Every one of those fields is still there — in the item panel, in the CSV and in the client's workbook.

- **Value it against something.** Put the number in the row, then set **Valuation Source** and write what you used in **Valuation Basis / Comps** in the item panel — which app, which comparables, what the range was. A line with a value and no source prints **not stated** in red on the client's schedule, because we promise on our own website that the source is stated.
- **Appraisers** — build the roster per estate: name, firm, credential (ISA / ASA / AAA / USPAP / GIA), independence, the effective and report dates, and **Due back** — the turnaround we promise to tell the client. An item valued by appraisal links to a roster appraiser instead of free text.
- **The $3,000 guardrail** — flagged items with no appraiser attached raise an amber nudge on a Standard job and a **red block on a Formal one**. Per-item **Waive** logs a reason. On a Formal job the Court Inventory prints *DRAFT* until every flagged item is appraised or waived.
- **MAIV §20.2031-6** and **MAIV Class** — whether an article counts toward the estate's *marked artistic or intrinsic value* total. It fires by itself on art, antiques, jewellery, silver, rugs, collectibles, firearms, wine and instruments; leave it on *Auto* unless you have a reason. Set it to **No** for something that is plainly ordinary in a fancy category — a $40 mass-produced print in Art & Décor. Set it to **Yes** for a **fur coat** or a **rare book library**, which the regulation names and the app has no category for, then pick the class.
- **Valuation basis and date** — Fair Market Value by default, valued as of the date of death. If the estate is taxable and counsel elects the §2032 alternate date (six months after death), toggle it and the schedule follows.
- **Asset track** — Probate / Trust / Non-probate / Homestead / Exempt. Only Probate-track items reach the Court Inventory, so the schedule doesn't overstate the estate.
- **🔗 Custody log** per item — released / received / transferred / returned, with party, date, method and receipt. Mandatory on Formal and on any probate job.
- **Snapshot** — a labelled point-in-time copy of the manifest. This is your amended-inventory trail; print any snapshot as an as-of schedule.

**What you hand out.** Three buttons sit on the header; everything else is under **More ▾**.

- **Estate Inventory PDF** — the client and attorney document. A photo, description, room, quantity, condition, date-of-death value and the valuation source on every line, grouped by disposition. Homestead, exempt and non-probate property print in their own schedule at the end, plus the appraisal flag list showing who is engaged on what and when it is due back.
- **CSV** — every column as a spreadsheet file, for attaching to an email to an executor or attorney.
- **Approval Request** — see the red block below. This is the one that matters.

Under **More**: *Court Inventory* (the §733.604-style schedule counsel files — Havellin does not file it), *Disposition Ledger* (gross / fees / net to the estate — our own service fee never appears on it), *Appraisal Worklist* (a per-specialist packet to hand each appraiser), *Snapshot*, and **Share w/ Counsel**, which grants the attorney or trust officer read-only access to the whole Estate Inventory folder by name — never a public link. **Revoke** takes it back. Financial folders stay private either way. *Show summary & rollups* opens the totals panel at the bottom of the tab.

> **⚠** **Nothing of value leaves the property without a signed approval request. Verbal approval is never accepted — not from the executor, not from a beneficiary, not on the phone.** Press **Approval Request** and the app builds the itemised list: photo, reference number, room, value, proposed disposition, and a box for them to initial each line. Keep and Hold are left off it — nothing is leaving. Send it, get it back signed, then select those items and press **Record approval**, which stamps who signed and when across all of them at once. Do not type approvals in row by row; that is how a signed approval ends up recorded against three items out of twenty.

> Everything in the inventory is documentation support, not a legal or appraisal opinion. The estate attorney and a credentialed appraiser remain the authority.

> **There are two $3,000 tests and they are not the same test.** The *per-item* one is the ⚑ flag: is this object worth enough to send to a specialist. The *aggregate* one asks whether the estate's art, jewellery, silver, antiques, rugs and collections **added together** come to more than $3,000 — and if the estate files a federal estate tax return, that means an expert appraisal under oath has to be filed with it.
>
> **An empty Appraisal Worklist does not mean nothing needs appraising.** Thirty $500 pieces of silver: nothing is flagged, because nothing is near $3,000 on its own — and the estate owes an appraisal on $15,000 of silverware. The worklist now prints the aggregate in its own box whether or not anything was flagged. **Read that box before you tell anyone the estate is clear.**

> **Value the MAIV articles before you call the total done.** While any of them has a blank value the app will say "at least $X — cannot be tested yet" rather than giving you a verdict, and it is right to. A partial total that happens to land under $3,000 is not an estate under $3,000.

> **⚠** **Your inventory is no longer only on your own phone (2026-08-24).** Until this change, every valuation, disposition, custody entry and flag lived in one browser and nothing ever read it back — so you and Ashley could each hold a different inventory for the same estate, and whichever saved last quietly overwrote the other. Clearing your browser data destroyed the record outright: the photographs were safe in Drive, but what they were, what they were worth and where they went was gone. It now saves to the shared sheet and merges item by item, so two people working the same job keep both sets of edits.

**What that means in practice.** Open a job on any device and it pulls whatever anyone else has entered. You do not have to be the person who took the photos to see the valuations. If you remove a manual line item it stays removed everywhere — and its item number is never handed to anything else, so a gap in the numbering is the record that something was taken out.

> **Photos on the inventory rows.** Every line shows a thumbnail of the item, pulled back from Drive. If you see a little category symbol instead — a box, a ring, a chair — that photo has not come down to this device yet. It is not lost: it is in the estate's Drive folder, and the client document tells you how many are missing rather than printing empty squares. If *every* photo is a symbol, the app will say why at the top of the tab — usually the Apps Script needs redeploying, which is Anthony's job, not yours.

> If the badge says *Inventory not saved — still on this device only*, you have no connection or the sync URL is unset in Settings. Your work is safe locally and will go up on the next save; but until it does, nobody else can see it and clearing your browser would lose it. Don't clear site data while that badge is showing.

### f. Firearms — and what NFA actually means

Firearms come up more often than people expect on Palm Beach estates, and the rule is short: **nobody on a Havellin crew touches one. Ever.** Not to move it out of the way, not to make a room safe to work in, not to put it somewhere sensible. If a firearm is in the way, the room waits.

> **⚠** **What to do, in order.** Photograph it where it lies, before anything in that room is moved. Leave it exactly where it is and secure the room or the container. Tell your Transition Concierge the same day — not at the end of the week. The TC notifies the representative and the estate attorney in writing within 24 hours. Nothing else happens until the representative has authorised the transfer *to a named licensed dealer*, in writing.

The dealer collects from the property. **Havellin does not transport firearms and does not ride along with them.** That is not caution, it is the whole reason we can be in the house at all: we never take possession, so possession is never our problem.

Two different questions get run together here and it helps to keep them apart. **Who decides** what happens to the guns is the representative, advised by counsel — that is what "send it to the attorney" means, you are sending the *decision*. **Who may legally carry them** is the dealer, and only the dealer. An attorney is not a firearms custodian and cannot take them off your hands.

### NFA items — the ones that don't look like guns

"NFA" is the National Firearms Act. It covers a short list of items that the federal government tracks individually, by serial number, on a registry — and they move on a completely different and much slower path than an ordinary shotgun.

**What you are looking for:**

- **Suppressors** (also called silencers or cans) — a metal tube, usually six to ten inches, often with threading at one end. *It looks like plumbing.* This is the one people miss.
- **Short-barrelled rifles and shotguns** — a rifle with a barrel under 16 inches or a shotgun under 18. Reads as "a small gun" unless you are measuring.
- **Machine guns** — anything fully automatic. Rare, but they exist in collections here.
- **Anything in a gun safe you cannot identify.** Flag it and let the dealer say what it is.

> **⚠** **The risk with an NFA item is not that you mishandle it. It is that nobody recognises it as a firearm in the first place.** A suppressor sitting in a drawer gets logged as a metal tube, or as nothing, and the whole authority process never starts for it. If you find something in a gun safe, a gun case, or a locked box and you are not certain what it is — photograph it, do not touch it, and flag it as a firearm. Being wrong costs the desk ten minutes. Being wrong the other way is a federal offence for somebody.

**In the app:** set the item's category to *Firearms* and tick **NFA Item** on the inventory row. The tick box only appears on firearms rows. It changes nothing about the authority rule — every firearm waits for written authority either way — but it puts the item on a separate notice on the Appraisal Worklist so the desk can warn the dealer before they drive out.

Why the desk cares: not every licensed dealer is licensed for NFA items, so an unannounced one can mean a wasted collection trip. And transferring a registered NFA item to an estate runs on an ATF Form 5, which takes **months**. On an estate trying to close, that is a schedule item the representative and the attorney want to hear about on day two, not at handover.

> **What you never do:** tell a family member what a gun is worth, agree to "just hold onto it," hand one to a beneficiary who asks for it, take one home for safekeeping, or move one between rooms. If a beneficiary presses, the line is: *"I'm not able to handle firearms — that goes through the representative and a licensed dealer. Let me get you the right person."*

> Havellin is not a firearms expert and this is not legal advice to a client. If anything about a firearm on a job is unclear, it stops and goes to the representative and counsel. That is always the correct answer and nobody will ever be criticised for it.

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
2. **Build Estimate** empties out — rooms, crew, labour, collections, vehicles and moving materials all disappear, and so do the five vendor cards that aren't Property Preparation. **One card is left**, sitting beside the Job details: *Home Prep for Sale — Managed Vendors*. Add each trade with an estimated cost; the footer shows the vendor total and the running 30%. **Fill in the scope note on every line** while you're on the walkthrough: exactly what you'll tell that trade ("5 bedrooms + hallway, walls & ceilings; front and back landscaping"). It carries through to sourcing.
3. **Client estimate** reads vendors-first: itemised vendor estimates at cost, then the 30% fee, then one total. Same 50 / 25 / 25 schedule on the Havellin fee. No completion date is projected — the schedule is confirmed once vendors are booked, and the estimate says so.
4. Approve → send → Mark Won → agreement → deposit, exactly as above.
5. **Job Plan** is stripped down to three things: *Budget & Fee* (estimated spend, quoted-to-date, the running 30% on actual quotes, with an over-budget flag), *Home Prep Vendors — Sourcing & Status* (assign the vendor, set status, log the actual quote against the scope note), and a *Coordination Checklist* — scope confirmed → quotes collected → vendors booked → work underway → completed/inspected → final invoices and fee billed.

## Quick reference

### What we bill the client

| Item | Standard | Premium Estate |
| --- | --- | --- |
| Transition Concierge | $150/hr | $185/hr |
| Property Specialist | $100/hr | $125/hr |
| Service Management Fee (third-party vendors) | **None — billed at cost** | **None** |
| Vendor coordination, per line you add | **touches × 0.5** — estate sale 4 hrs · mover 3 · auction 3 · appraiser / staging / GC 2 · painting 1.5 · hauler / dumpster / cleaning 1 · shredding 0.5 | Same hours, premium rate |
| Home Prep GC / Site Management Fee | **30%** — standalone Home Prep job only | 30% |
| Home Prep bundled onto a labour job | **None — at cost**, plus 0.5–2 coordination hrs per trade | **None**, same hours |
| Moving Materials | Cost + 25% | Cost + 25% |
| Preferred Client Discount | Havellin labour only · **max 15%** | max 15% |
| Expedited delivery (rush) | +20% of Havellin services | +20% |
| Fixed-price contingency | +20% on the hourly basis | +20% |

Every service bills **time-and-materials by default**. A firm fixed price is available on any job *except* Probate and Contested Probate. Vendor work is pass-through — the vendor bills the client directly at cost and Havellin takes only the fee on top.

**Order on the price:** services total → less the discount → plus 20% expedite on what's left → plus vendors at cost.

### Manager PIN required for

- Approving or denying an estimate
- Approving an agreement for sending
- A **final** invoice more than ±15% off the estimate (deposit and midpoint need none)
- Deleting a client, vendor or partner

**Not** required for a Change Order — that one is settled with the client, not internally. Everyone has their own PIN and the approval is recorded under whoever typed it, so use yours.

### The margin panel

**It is no longer shown on the Build Estimate tab** — too much detail for the screen you build the estimate on. Nothing about margin changed, and the **15% discount cap** is the guardrail that's left. If you're weighing a discount bigger than the app will let you give, that's a conversation with a manager, not a workaround.

When you do read it: it's an indicative profitability readout with a flag on it, **not a discounting tool**. *Price at 30% Margin* is a reference line at an admittedly arbitrary margin and *Above Reference* is simply the distance to it. Neither is an allowance to spend. In practice, a job needing that much discount is one to walk away from rather than price down to.

### If something won't let you proceed

| Symptom | What's missing |
| --- | --- |
| The Appraisal Worklist says nothing is flagged — is the estate clear? | Not necessarily, and this is the trap. That line answers the *per-item* test only. Read the **§20.2031-6(b)** box underneath it: art, jewellery, silver, antiques, rugs and collections are added together, and over $3,000 in total the estate owes an expert appraisal under oath with its federal return — even when no single piece was ever flagged. |
| The aggregate box says "cannot be tested yet" | Some MAIV articles still have no value in them. The total you can see is a floor, not a total, so the app will not give you a verdict. Get values against them; that is the whole job at that point. |
| You found a fur coat / a wall of old books and there is no category for them | There isn't one, deliberately. Leave the category as General/Household, set **MAIV** to *Yes*, and pick *Furs* or *Books & manuscripts* as the class. The regulation names both by name. |
| Trust items are on the aggregate but not on the Court Inventory | Correct, and both are right. The Court Inventory is the probate schedule and trust property is outside it. The federal aggregate counts the *gross estate*, and a revocable trust's contents are in the gross estate. Two documents, two questions. |
| A firearm you flagged isn't on the Appraisal Worklist | Correct, and deliberate. Nothing goes on that list until the representative has authorised the transfer to a **named** dealer in writing. Record it on the item — *Authorized By* and *Approval Date*, dealer in *Channel / Recipient* — and it appears. The worklist prints a note saying what it is holding, so a held item never reads as a forgotten one. |
| You can't find the **NFA Item** tick box | It only appears on rows whose category is *Firearms*. Set the category first. On anything else the column shows blank on purpose — an NFA tick on a sofa describes nothing. |
| A cheap gun never showed up anywhere on the worklist | Anything under $3,000 with a value recorded isn't flagged for a specialist, so it was never worklist-bound. It *is* still listed on the awaiting-authority notice — that notice covers **every** firearm without written authority, not just the expensive ones. |
| You found a metal tube in a gun safe and don't know what it is | Treat it as a firearm. Photograph it, touch nothing, flag it, tell your TC the same day. It may be a suppressor, which is an NFA item and a different transfer path entirely. Nobody is ever criticised for over-flagging this. |
| You took photos and nothing happened — no count, no flag, no message | Fixed 2026-08-03. The app required the job to be *Active* and it was only *Won*, so it discarded the shot silently. It captures from *Won* now, and says so out loud if it ever does refuse. **Photos taken in that window before that date are not in Drive** — re-shoot if you still can. |
| A room card shows a red **⚠ not saved** | That upload failed and the photo is not in Drive. Hit **Retry** on that shot — it works across sessions now, so yesterday's failure can still be sent today. |
| Retry says the photo can no longer be retried | The device had no room to hold the image. It's gone — take the shot again. |
| A job's photo counts all read zero when you first open it | Fixed 2026-08-03. The cards were drawn before the photo records loaded. Everything was in Drive the whole time; switching away and back used to show the real counts. |
| Save to Drive stays white after you press it | It didn't save. When it works the button turns green and reads *✓ Saved to Drive*, and the approval banner gains a *Filed to Drive* line. |
| The *Filed to Drive* line vanished from the banner | You edited the estimate. The copy in Drive is the previous version, so the claim is withdrawn until it's re-approved — which re-files it automatically. |
| Job Plan rooms are in a strange order | They're in walkthrough order now, matching the estimate. Before 2026-08-03 they were sorted hardest-room-first, which matched nothing. |
| The client estimate has no third-party vendor section at all | Correct when there are no vendors — the empty heading and its $0 lines are suppressed. Add a vendor and it comes back. A vendor with no direct cost (auction house, estate sale company) still shows. |
| A client asks how long each stage of the job will take | The document deliberately carries no dates. Answer from the overall working-day estimate and say plainly that the pace depends on how quickly they make decisions — that is the honest answer and it's also the one that protects you. |
| An heir on site asks you to hand them something | It goes through the representative, in writing. Be pleasant, do not make an exception, and do not take a verbal instruction from anyone who is not the representative — the client document promises this in writing and the estate file has to match it. |
| A client offers you the will, or you are tempted to ask for it | You do not need it and should not hold it. Ask for the *Letters* and for the list of designated items. A will you find in the house is sequestered and handed over against a signed receipt. |
| The estimate talks to the client as though they were alive, and they are not | The job is filed under **Home Cleanout** when it should be **Estate Settlement**. Change the service type at intake and re-open the estimate. Do not edit the wording — it is rebuilt on every render, and the price is wrong too. |
| You are looking for a "client is deceased" tick box | There isn't one, and there should not be. The **service type** is the answer: Estate Settlement, Probate and Contested Probate are deceased-client engagements; Downsizing, Move Management, Home Cleanout and Home Prep are living-client ones. |
| Intake will not take a client phone or email on an estate job | Correct — the client is deceased, so those fields are disabled and the **Authorized Representative** block below is where the contact goes. That is who every document is addressed to and where the estimate is sent. |
| The agreement is the wrong one of the two forms | Same cause, same fix — it reads the service type, exactly like the estimate. Correct the service type at intake and re-generate. The routing changed on 2026-08-03; anything issued before then is worth re-reading. |
| The estate document reads nothing like the downsizing one | Correct as of 2026-08-03. Estate and probate stages are written for the representative — catalogue first, nothing removed until authorised in writing, releases receipted. Downsizing keeps the decision-paced language because there the client really is standing in the house deciding. |
| A vendor you entered is not named anywhere in the job plan stages | It is filed under a category the stage bucketer does not recognise. Check its Category in the Vendor Directory — valuers land in the sorting stage, removal and sale in disposition, cleaning and finishing trades in close-out, everything else in disposition. |
| A client asks why the estimate has no dates | Deliberate, and the document does not explain it either. Answer from the overall working-day estimate and say the pace depends on how quickly they make decisions. Do not write dates onto the document. |
| You see the word "licensed" describing Havellin anywhere | Wrong — we are **insured and bonded**, not licensed. Corrected in the app 2026-08-03; take it out of anything you have written yourself. *Licensed FFL* for a firearms vendor is a different thing and is fine. |
| Email Estimate refuses | The estimate isn't approved. Submit for Approval first. |
| Can't edit the estimate | It's approved and locked. Use a Change Order. |
| Staffing refuses / Job Plan staffing section is hidden | The job isn't marked Won. Record the client's acceptance on the dashboard. |
| Mark Signed / Record Deposit buttons aren't there | The step before hasn't been marked. They appear one at a time, in order. |
| Save Hours Entry is greyed out | Either the team isn't confirmed, or the deposit isn't in — the bar says which. |
| Final invoice won't print, and no PIN is offered | No hours are logged. Go and log them. |
| A change order isn't on the final invoice | It was never marked accepted. Get Acceptance. |
| A vendor isn't in the Job Plan picker | They aren't set to *Active* in the Vendor Directory. |
| Saving a new vendor sits on *Saving…* and the form never closes | The write is still in flight — the sheet's web app can take several seconds to wake up. **Do not press Save again.** The button is disabled while it works, and an add is never retried automatically, so a second press is what writes the vendor twice. If nothing has happened after 45 seconds the app re-enables the button, reloads the directory and tells you to check whether the vendor is already there. |
| The form says the vendor is already in the directory | It is, under that name, and one firm is **one row** — two rows under one name break every later lookup, because the name is what identifies a vendor. Close the form and press **Edit** on the existing card. Genuinely a different firm with the same name? Put something in the name that tells them apart. |
| A crew member isn't in the staffing dropdown | They aren't *Active* on the Contractors tab. |
| Fixed-price toggle is disabled | It's a probate or contested probate job. Those bill on logged hours. |
| The estimate won't save | No rooms are scored. Score at least one — and read the coverage badge before you settle for one. |
| Amber badge: "walkthrough looks incomplete" | Fewer bedrooms or baths scored than intake recorded. It won't block you; finish the walkthrough anyway. |
| Amber badge says "1 of 2 half baths" and you've ticked the only one you can find | There are five *Half Bath* rows, not one — Entry & Living, Kitchen & Utility, both bedroom floors, and *Pool / Cabana Half Bath* under Exterior & Auxiliary. Tick the one matching where the powder room is. If the house genuinely has fewer half baths than intake recorded, the intake figure is wrong — fix it there. |
| You ticked *Additional Bathroom(s)* for a powder room and the badge got worse | That row counts as a *full* bath. Untick it and use a *Half Bath* row instead. |
| The guest house has its own kitchen and bath — where are those rows? | Gone on purpose. Score the whole building on one row, sized by bedrooms. Its kitchen and bath are already in that weight. |
| Can't find the casita | It moved from Exterior & Auxiliary into Outbuildings & Guest Quarters. |
| Two pool house rows — which one? | Whether it has living quarters. Cabana or changing room → the Exterior row. Bedroom, kitchen or bath → the Outbuildings row. Never both; that bills it twice. |
| Room hours jumped since you last used the app | Fixed 2026-08-03. Rows used to show the packing step only — about a quarter of the work — so every room understated itself by 3.7×. Nothing got more expensive; the row is finally telling the truth. |
| A garage or patio costs far more than you expected | Exterior rooms add load *on top of* the square footage, and they are charged the full estate step set including documentation. A 2-car garage carries the same content weight as the kitchen. Known and queued for a pricing pass — flag it if it looks wrong on a live job. |
| The whole house is packed and setting nineteen sliders is absurd | Use the **How full is this house?** chips above the room grid. One press. Then fix the odd room that does not fit. |
| A long-tenured house does not price higher than a new one | Correct as of 2026-08-03. Years in home used to multiply crew hours as well, on top of the volume you had already scored — the same fact counted twice. It now only adds concierge coordination time. If the house really is packed, say so with *volume*: that is the input that carries it. |
| The quote is above the reference range on an ordinary house | Known — the engine currently runs above the bands above roughly 3,000 sqft even at neutral scoring. The band is a market sanity check that needs re-cutting, not a fault in your walkthrough. Do not score down to hit it. |
| Crew size keeps changing by itself | Correct — it tracks the recommendation while you score. It stops the moment you set it yourself. |
| Crew badge: "2 assigned, 6 recommended — runs 23 days instead of 9" | You've staffed below what the job needs. That's allowed and it is priced as staffed — longer job, more concierge days, higher fee. Go back up unless the small crew is a real constraint. |
| Fixed price warns it is "+41% over the hourly basis" | You typed a fee and the estimate has moved since. The panel shows the current suggestion — one click to take it. |
| Crew badge warns "N assigned but only M recommended" | You've set a crew bigger than the scope needs, which *lowers* the quote. Drop back unless the extra hands are genuinely required. |
| The timeline planner says a date "is not reachable" | Six specialists is the cap. Counter with the days it quotes, or cut scope. |
| A vendor category isn't on any of the six cards | It isn't in the Vendor Directory under that Category Group. Add it there and reload. |
| The vendor cards are empty and say so | The Vendor Directory URL is missing from ⚙ Settings. |
| Looking for the Home Prep card and the *Include in estimate* tick box | Both gone as of 2026-08-03. Prep goes in the *Property Preparation* card with every other vendor, and having a line on it *is* including it. Nothing to tick. |
| An old estimate you reopen prices higher than it did | Expected, and it's a fix. Prep lines used to be dropped unless a tick box was set that the card adding them never touched — those lines now price. Third-party vendor lines also book coordination hours now. Re-read it before you send it. |
| Adding a vendor pushed the quote up | Correct since 2026-08-03. Each line books concierge coordination time (a mover 3 hrs, an estate sale company 4, a hauler 1). We charge no percentage on vendors, so this is how that work gets paid for. |
| A Home Prep job shows only one vendor card | Correct. A standalone prep job has nothing else to price — the client estimate and the Job Plan only ever carried prep vendors. If it truly needs a hauler, book it as a prep trade or run the job as a Cleanout with prep bundled. |
| A prep cost you typed into the card reads $0 in the totals | Fixed 2026-08-03. It was a parsing bug — the formatted "$8,000" was read as zero on every keystroke while the field kept showing it. If you're still seeing it, you're on a cached build; hard-refresh. |
| You disagree with the hours a vendor books | Say so — that is what the touch count is for. Work out how many separate things you actually have to do with that trade; the number is half of that. Anthony changes one integer and every future estimate follows. |
| Not sure whether to fill in *Coord hrs* on the Job Plan | Optional, always. It bills nothing and blocks nothing — your logged hours already cover that time. Enter it when it's obvious, skip it when it isn't. |
| The Inventory tab looks completely different | Rebuilt 2026-09-01. It is grouped by disposition now, with *Not yet decided* at the top as your worklist. The 29-column table and the four column buttons above it are gone; every one of those fields lives in the item panel behind the **▾** on each row. |
| An item jumped to a different section when you set its disposition | Working as intended. The list is grouped by disposition, so changing one moves the item. Find it under its new heading. |
| The Inventory tab looks half empty | It opens on **Today** when you have shot anything today. Press **All**, or **Clear filters**. |
| Photos show as little symbols instead of thumbnails | Those photos have not been pulled down to this device yet — they are safe in Drive. If every one is a symbol, the tab says why at the top; tell Anthony, the Apps Script needs redeploying. |
| The client schedule prints *IN PROGRESS* | Correct, and leave it. Not every line is ticked *Reviewed* yet. We give clients work in progress on purpose; the stamp is what makes that honest. Finish the review and it prints *REVIEWED*. |
| An item you want approval for is not on the Approval Request | It is set to **Keep** or **Hold** (nothing is leaving, so there is nothing to approve), it has no disposition at all yet, or it already carries an approval date. Set the disposition first. |
| A value shows *not stated* in red on the client schedule | That line has a value with no **Valuation Source**. Open the item and set one, and put what you used in *Valuation Basis / Comps*. We promise the source on our own website. |
| A red chip bottom-left: *N change(s) not saved* | Tap it. It opens and names which write is stuck, which sheet it was going to, and what the server said back. **Try again** resends. Nothing is lost while it sits there — the work is queued, not dropped. |
| The chip says *Apps Script needs redeploying* | The sheet script answered "unknown action" — it is genuinely older than the app. Anthony redeploys it (Extensions → Apps Script → Deploy → Manage deployments → New version), then you press **Try again**. |
| The chip says *the Apps Script returned an error* | The script crashed on that one write. It is held rather than retried, because the same request would fail the same way. Tap the chip, screenshot the error line and send it on — **do not go redeploying anything on the strength of this**. Until 2026-09-01 the app called this a redeploy, and it was wrong to. |
| "No payment link was created" after Generate Payment Link | The Stripe service didn't answer or rejected it. Nothing was sent. Send the deposit invoice and record the payment by hand. |

---

Havellin Palm Beach · 515 N Flagler Drive, Suite 350, West Palm Beach, FL 33401 · Concierge Job Playbook · Internal use only · Not for distribution · v2026.08 · reconciled 2026-08-03 · For configuration, setup and system reference see the Operations Manual — the master document
