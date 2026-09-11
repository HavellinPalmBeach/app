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
→ 5. Client says yes → Mark Won → 6. Send the signing packet → 7. Staff the job team
→ 8. Mark it signed → 9. Record the deposit → 10. Work the job: document, log hours, source vendors
→ 11. Midpoint invoice → 12. Final invoice → 13. Close the job
```

> **⚠** **You run the whole job from ONE screen now — the Client Dashboard (changed 2026-09-11).** Open a client and you get a **timeline** of the job from intake to final payment, and every button you need is on the row for the step it belongs to. **Client Estimate, Agreement and Invoices are gone from the top of the screen.** Nothing they did was removed — it all moved onto the timeline. Anthony asked for this in as many words: *"we are finding ourselves having to go to too many tabs … that way, as we're going through a job, we know what to do next."* **Exactly one step is ever lit up**, and that is the one to do next. If a step is red it is blocked, and the row tells you both why and how to clear it. If you are hunting for a button, open the client and look at the lit row — it is there, on the step it belongs to. The steps below are still the order of the job; they are just no longer the order of the tabs.

> **On a phone in the house, press 📱 Field in the header.** The tabs drop to a bottom bar you can reach with a thumb — **Clients · Intake · Estimate · Job Plan · Vendors** — and everything is sized for one hand. The other four tabs are desk work and are hidden, not removed; nothing you type is lost. **Clients is new there as of 2026-09-11, and its buttons work.** So the three things you actually do standing in somebody's kitchen are all on the timeline, on your phone: **record a cheque** they just handed you, **record the signed agreement** they just handed back, and **mark them won** after the walkthrough conversation. Do them there and then — that is the whole point, and it beats a note to yourself for later. Press it again to come back to the full nine tabs. Whatever you were looking at stays put.

> **⚠** **Every document goes out the same way, and that is the whole point of the change.** Estimate, signing packet, deposit invoice, midpoint invoice, final invoice — all five: **✉ Send…** → read the draft in your Gmail and send it → **✓ I've sent it**. Each row also carries **👁 View**, **🖨 Print** and **📁 Filed copy**. Learn it once on the estimate and you know how to send an agreement and an invoice. **Why you press two buttons and not one.** The app builds the email and puts it in *your* Gmail as a draft — it deliberately cannot send it, because every client email gets read by a person first. So it cannot know when you actually sent it. **✉ Send** makes the draft; **✓ I've sent it** is you telling the app it went. Until you press the second one the row reads *"Drafted — read it, send it, then confirm"* and the step stays open. **Do not skip it** — on the estimate, that confirmation is what lets you mark the job Won.

**Four points in that sequence are hard gates.** The app refuses — it does not warn, and there is no override:

| You cannot… | Until… | Why |
| --- | --- | --- |
| Email the estimate | A manager has approved it | The figure isn't final until somebody has signed off on it. |
| Staff the job team, or open the staffing section of the Job Plan | The job is marked **Won** | Holding a specialist for these dates means turning down other work. Never commit crew to a job the client hasn't accepted. |
| Log hours | The **deposit** is recorded and complete | The deposit is never waived, so this gate is always safe to enforce. |
| Issue the final invoice | Hours are logged | The final bills labour at hours actually worked. No hours means there is nothing behind the number, so no manager can unlock it. |

## Step 1 · Intake — Client Intake tab

Fill in everything marked *. The Job ID (`HVL-YYMM-XXXX`) and the client's Drive folders are created for you on save.

- **Service type** — Home Editing · Home Transition · Home Cleanout · Estate Settlement · Probate Estate Settlement · Contested Probate Estate Settlement · Home Prep for Sale.
- **Square footage** is what drives the sizing. Property type is just a label. Bedrooms, full baths and half baths are separate fields, so "five baths" is never ambiguous.
- **Estate and probate jobs need an authorised representative** — executor, POA or administrator, with name, role, phone and email. Probate also needs the case number and the attorney's details.
- **Home Cleanout is for a LIVING client. A house whose owner has died is an *Estate Settlement*.** Two different engagements at two different prices — the service type you pick here is what decides how every client document is written, and there is no second question anywhere that lets you correct it.
- **Documentation level** — Auto, Standard, or Formal (court & attorney grade). Auto is right almost always: it makes contested probate Formal and everything else Standard. Formal turns on the appraisal guardrails and makes chain-of-custody mandatory. This is separate from the Premium-estate rate — a premium job is not automatically a court-grade one.
- **Who builds the inventory?** (estate jobs only, new 2026-09-04) — ask the attorney: *do you want us to build the inventory, or does your paralegal?* Their answer goes here and the estimate opens at it. You can still change it on the walkthrough in Step 2; the estimate is what prices it, and it will tell you when the two disagree. Leave it on *Havellin — inventory & estimated value* until they say otherwise.
- **Referral source** — if it came from an attorney, realtor or trust officer, link the actual Referral Partner so they get credit on the leaderboard. Family and friend referrals use the free-text name field.
- **Assigned concierge is optional here.** Intake usually runs a fortnight ahead of the work and nobody knows who is free. You staff the job properly at step 7.

> **⚠** **Get the service type right — it is the most consequential field on this form.** Pick *Home Cleanout* and the app writes to a living owner of their own property; pick *Estate Settlement* and it writes to the **authorised representative** of someone who has died, asks for the deceased's name instead of a client phone and email, and generates a different engagement agreement. There is no tick box and no override. A cleanout booked for a family whose mother died last month, filed under *Home Cleanout*, addresses her as the living owner of her own house — to the people who just buried her — **and under-prices the job**, because the estate services carry the documentation and disposition work a cleanout does not.
>
> **What you CAN fix later, from 2026-09-10:** a living job re-typed as another living job, and an estate job re-typed as another estate job — on Build Estimate, right on the walkthrough. What you still cannot do anywhere but this form is cross between the two, which is exactly the mistake above.

### What's in the house — ask these on every call

New 2026-09-10. This replaced the old single *Notes* box as the main thing intake asks about the property. Two questions, in these words, then the checklist:

1. **"Is there anything in the house you need us to find? Something valuable, or something that matters to the family, that we absolutely cannot miss or accidentally dispose of?"**
2. **"Is there anything in the house we need to be aware of for safety, or that needs special handling?"**

Then tick what is in the house and **write down what you are told** — the tick on its own is worth almost nothing:

| Tick | Then write |
| --- | --- |
| **Cash** — loose cash, envelopes, hidden spots | Roughly how much, and where. |
| **Valuables** — jewellery, gold/silver, watches, coins, art, collectibles | What, where, who gets it, and whether they want it appraised. |
| **Firearms & ammunition** | How many, where, and *who is authorised to take possession*. |
| **Safes & lockboxes** | Where it is, whether they have the combination or key, whether they know what is inside. |
| **Documents & digital** | Will or trust, deeds, insurance, statements, passports — and the digital ones people forget: crypto wallets, thumb drives, seed phrases, old laptops and phones. What they are looking for, and where it might be. |
| **Sentimental must-finds** — photos, letters, specific heirlooms | Name them. "Sentimental things" is not findable; "the blue photo album from the Navy years" is. |
| **Access & security** | Alarm and codes, cameras, smart locks, who else has keys — caregivers, cleaners, family — and any gate or HOA. Anything we need to disarm. |

> **⚠** **Everything you write here is read out to the crew before Day 1. That is the whole point of asking.** It comes back as a **Standing job flags** panel at the top of the Job Plan and prints with it, so the two people emptying the house know about the cash in the freezer and the ring in the blue box. If you tick a row and leave the note blank, the crew sees *"Ticked at intake, no detail recorded — ask the client before Day 1"* — which is honest, but it means somebody has to make the call you should have made.
>
> **Firearms is the red one, and it prints first.** It carries the standing rule with it wherever it appears: *nothing moves without written authority, photograph it where it lies, tell the concierge the same day, and let nobody carry one out — family included.* Get the name of who is authorised to take possession while you have them on the phone; that is the answer that stops the job later if you do not have it.
>
> None of this is a gate. Nothing here blocks a save, and you can correct any of it later on **Edit Client**, which asks the same questions. Do that the moment a client tells you something new — the crew reads the current version, not the one from the call.

> **The plain *Notes* box is still there, at the bottom.** The questions above cover the house; Notes is for everything else — family dynamics, urgency, who actually makes the decisions, which sibling will be difficult on site.

> **Home Prep for Sale runs a shorter version of this whole playbook** — no room scoring, no crew, no hours. Skip to the Home Prep section near the end once intake is saved.

## Step 2 · Build the estimate — Build Estimate tab

Select the job from the dropdown. This is desk or iPad work — the room tables are not built for a phone.

The tab reads top to bottom in three bands. **Top card:** *Job* on the left (job, **service type — a dropdown, not a label**, target start date, who prepared it), *Crew* on the right (crew size, the "client needs it sooner" planner, and the adjustment toggles). **Middle:** vendors, then the rooms two across, then collections beside vehicles, then moving materials. **Bottom:** the summary, then the pricing reference check beside the three price levers — discount, rush, fixed price. Scope decisions at the top, price decisions at the bottom next to the price.

> **⚠** **If the walkthrough tells you the job is not what intake said it was, change the service type here.** The commonest one: you were called out for Home Prep and the house actually needs editing first — closets, the garage, forty years of a dining room. Pick *Home Editing* in the service dropdown and say yes to the confirmation. The rooms appear, hours start pricing, and **the prep vendors you already entered stay exactly where they are and still earn their 30%**. Everything you have scored is kept.
>
> The dropdown only offers the services on the same side of the living/deceased line, so you cannot turn a living client into an estate matter by accident. If you genuinely need to cross it, that is Client Intake or Edit Client — the estate form asks for a representative and a date of death, and this screen does not.
>
> It is locked once the **agreement is signed**. Before then it is open, including after the client has seen the estimate — press **✎ Edit estimate** on the timeline first, exactly as you would to give a discount, then re-approve. **If the client is already holding a document that names the old service, re-send it.**

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
> It is a *shift*, not a blanket setting — a powder room stays lighter than a living room on every preset. Pressing the same chip twice does nothing new, and pressing a different one re-bases rather than piling on top.
>
> **Press it whenever you like, including before you have ticked a single room.** It is a standing setting: every room you tick from then on opens at that fullness. That is the easy way to run a walkthrough — say what the house is like when you walk in, then just tick rooms as you go through it. *Before 2026-09-10 it only applied to rooms already ticked, so anything you ticked afterwards quietly went back to the middle. If you priced a job that way, the rooms you did later are under-scored.*
>
> **Anything you type by hand is yours and the chip will not touch it.** Type a volume into a room ("the house is full but they already cleared the garage") and later chips re-base every other room around it and leave that one alone — the line under the row tells you how many it held back. To give a room back to the chip, **untick it and tick it again**.
>
> It does not touch complexity. Volume is *how much stuff*; complexity is *how careful you have to be*. Two different questions, and the premium-estate toggle already handles the high-end rate.

Don't compare room hours between service types. The same closet shows *more* hours on a home editing job than on an estate settlement, even though the estate job is more than twice the work — because on a home editing job nearly all the work is packing, so nearly all of it lands on the room rows.

> **⚠** **Score the whole house, not a sample.** Volume and complexity are averaged across the rooms you score and then applied to the *entire* square footage. Tick one foyer at 1/1 on a 10,000 sqft estate and the app prices all 10,000 sqft as if the whole house looked like that foyer — on a real job that dropped the quote from about $44,900 to $24,100. A half-finished walkthrough doesn't give you half a price, it gives you a *wrong* price.

The app checks you on this. Under the room grid it compares the bedrooms and baths recorded at intake against the ones you have **accounted for** — scored, *or* deliberately marked out of scope:

| Badge | What to do |
| --- | --- |
| **Green** — room coverage matches intake | Nothing. Every bedroom and bath on record is accounted for. If some are out of scope it says so — "2 scored, 5 out of scope". |
| **Red** — walkthrough looks incomplete | It names the shortfall: "accounted for *2 of 5* bedrooms". Either finish the walkthrough, or mark the rooms we are not touching as out of scope. It won't stop you saving — it's on you to know why you're ignoring it. |

> **⚠ Not doing every room? Say so — don't just leave it blank.** The Scope box beside each room has *three* states, and tapping cycles through them: **blank → ✓ in scope → ✕ out of scope → blank**. Blank means "nobody has looked at this yet". ✕ means "we are deliberately not touching this — the client is handling it". They are different answers and the app treats them differently. On a job that is mostly Home Prep, where the guest wing, the kitchen and the laundry are the client's own, tap those rooms round to **✕**: the red badge clears, they cost nothing, and they still print on the client estimate and the job plan as explicitly *not ours* — which is exactly what you want the client to see. Leave them blank instead and the app cannot tell you from someone who quit halfway.

An ✕ room keeps its **notes and photos** — use the note to record *why* it is out of scope ("client is emptying the garage themselves"). That sentence is what stops the question coming back on job day.

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
| **Documentation scope** (estate jobs only) | *Full*, *Capture only* or *None*, under the concierge hands-on share. New 2026-09-04. It is a third to two-fifths of an estate quote, so set it before you read the total. *Capture only* means we photograph, describe and locate everything and hand counsel the *list*; they value it and book the appraisers. *None* means the attorney's office does the whole inventory and we sort, set aside and stage against their schedule. It is saved with the estimate and hidden on home editing, home transition and home-cleanout jobs. | Ask the attorney at intake: *do you want us to build the inventory, or does your paralegal?* Default to *Full* until they say otherwise. Never change it after approval without re-approving — the client estimate and the agreement both rewrite themselves from it. |
| **Rush order** | A flat **20% expedited-delivery premium** on the Havellin services total, shown to the client as its own named line. Never on vendor costs. | When the client is buying a compressed calendar — a second concierge and a bigger crew in parallel. |
| **Quote as a fixed price** | Replaces hourly with a firm flat fee — the hourly basis plus a **20% contingency** — prefilled and fully editable. | **Not available on Probate or Contested Probate** — the toggle is disabled. Those bill on logged hours so the expense stands up in court. |
| **Preferred Client Discount** | Percentage off Havellin labour only, **max 15%**. Same cap on **Offer discount** on the timeline. | Sparingly. The cap is the guardrail — the margin panel is no longer shown on this tab. |
| **Multiple heirs** — read this once | It adds a full 20%, but to *off-site coordination* — not to total concierge hours. Coordination is about half the concierge line, so the total moves about 10%. | Nothing. It is not a bug; people report it as one. |
| **Moving Materials Package** | Estate tier ($500 / $750 / $1,500) or Home Editing / Transition tier ($200 / $350 / $550). | Or None. |

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

Vendors are picked from **six Category Group cards**, sitting **below Notable Collections and Vehicles & Watercraft** — Asset Liquidation & Valuation, Disposal & Waste, Moving & Logistics, Professional Services, Property Preparation, and End-of-Job Logistics. Each is a category dropdown, an *Est cost* box and a **+**. The lists come straight from the Vendor Directory, so if a category is missing it's missing from the sheet — add it there (see the Operations Manual, §13a) and it appears here.

> **A firm that does two things is one row in the directory, not two.** Its trades go in the Category field separated by a semicolon — *Jewelry & Watch Appraiser; Jewelry & Watch Buyer* — and it then shows up under both headings in the Vendors tab while staying one firm with one rating, one status and one contact history. To add a trade to a firm that is already in there, press **Edit** on its card and type the extra trade; **do not add a second row**, and the app will refuse one under a name it already has. The suggestions keep working after the semicolon, and past the first trade they widen beyond the group you picked. One thing it cannot do: a firm still has a single *Category group*, so if its trades genuinely straddle two groups, file it under the one you engage it for most and expect the other trade on that same estimate card.

> **You pick a category, not a vendor.** Finding an appraiser who's actually free that week is office work at kickoff — the estimate says what the job *needs*, the Job Plan says who's doing it. Anything you add on the *End-of-Job Logistics* card carries through to the Job Plan and drops off its list there, so you're asked once rather than twice.

- **Third-party vendors** — add each with an estimated cost. Havellin charges **no fee** on them; they are billed to the client directly at cost, and your coordination time is billed hourly instead. **Every line you add books that time.** The card footer shows the running total per group. So adding a vendor does raise the quote now, and it should: sourcing, quoting, scheduling and chasing that vendor is real time you spend.
  > **Where those hours come from — count the touches, halve the count.** A *touch* is one thing you actually have to do with that vendor: a call to place, a quote to chase, access to arrange, work to go and look at, a settlement to reconcile. An estate sale company is 8 of them (call · walkthrough · contract · pricing schedule · sale-day staffing · mid-sale check · breakdown · settlement) so it books **4 hours**. A mover is 6 (survey · quote · insurance certificate · pack day · load day · delivery) so it books **3**. An appraiser or an auction house is 4 → 2 hrs · painting 3 → 1.5 · a hauler or a dumpster 2 → 1 · shredding 1 → 0.5. **If you think a count is wrong, say so** — that is the whole reason it is written as a count rather than an hours figure somebody once picked.
- **Home Prep as an add-on** — add the trades through the *Property Preparation* card, same as any other vendor. **That's the whole thing** — there's no box to tick and no second Home Prep section; if a line is on the card it's in the estimate. Fill in the **scope note** under each line while you're standing there. **Changed 2026-09-10:** prep vendors carry the **30% GC fee wherever they appear** — bundled onto a labour job exactly as on a standalone prep engagement — and they book **no coordination hours** at all any more. The vendors bill the client at cost; the 30% is ours. Before this they were the other way round (at cost with no fee, plus 0.5–2 of your hours per trade), which on a $45,000 package was about $1,200 of hours instead of $13,500 of fee.
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

## Step 3 · Get it approved — Client Dashboard

> **⚠** **The buttons that used to sit across the top of the Client Dashboard are gone (changed 2026-09-11).** There were seven: *Estimate · Submit for Approval · Client Accepted — Mark Won · Change Order · Edit Client · Drive · Activate Job*. **Five of them were already further down the same screen.** Nothing was removed — every one of them is where it belongs now: the four job steps are rows on the **timeline**, *Change Order* has its **+ New** in the Change Orders card, and the two that are not steps sit on the **Job Timeline & Payments** heading: **✎ Edit Client** and **📁 Drive**. **If you are hunting for a button, look at the lit row.** That is the whole design — one screen, one lit step, the buttons on the step they belong to.


Open the client and find the *Estimate approved* row. **👁 View** reads the client-facing document — do that first, for accuracy. Then **Submit for approval** → a manager presses **🔑 Manager approval** and types their PIN → the estimate locks as *Approved for Release*.

**The document now opens with a full job plan (new 2026-08-03).** Ahead of the money there is *How We Work*, *Spaces In Scope* grouped the way the Build Estimate grid groups them, and *How The Work Runs* — every stage of the job with what you will do, what you need from the client, and what finishes it. **Read it before you submit.** It is written out of the estimate, so a room filed in the wrong section or a vendor you forgot shows up here in plain English, where a number would not have caught your eye.

**Every vendor you entered is named in the stage it actually happens in** — appraisers in the sorting stage (they value while everything is still in place), haulers and auction houses in disposition, cleaners in close-out. So read the stages as a check on your vendor list: *if a vendor you entered is not named anywhere in the sequence, you have filed it under the wrong category.* What the client receives at the end — photographs, the inventory, vendor invoices, donation receipts, the final invoice against logged hours — is listed inside the Close-Out stage.

> **⚠** **Which version of this document you get is decided by the SERVICE TYPE, and nothing else.** *Estate Settlement*, *Probate* and *Contested Probate* are written to the representative of someone who has died. *Home Editing*, *Home Transition*, *Home Cleanout* and *Home Prep* are written to a living owner. There is no field to override it — which is the point: the two documents and the price always agree about who the client is.
>
> **If this document has the wrong voice, the service type is wrong.** Go back to intake and change it, then re-open the estimate. Do not rewrite the wording — it is regenerated every time anyone renders the document, and the price is wrong too.

> **⚠** **On an estate or probate job the document reads completely differently, and it has to.** Those stages are written for the **representative** — the attorney, executor or trustee — not for a family standing in the house. Stage 2 is *Sorting, Documentation & Inventory*: we catalogue and **nothing is sold, donated or removed at that stage**, and the document tells them plainly they do not need to be on site. Stage 3 is *Distribution & Disposition* and will not start until the representative has read the inventory and authorised disposal **in writing**. On a home editing or home transition job the old decision-paced language stays, because there it is true.
>
> Two things in that copy are commitments *you* have to keep on the job: **releases against signed receipts**, and **nothing goes out on a verbal request**. If an heir asks you on site for something, the answer is that it goes through the representative in writing — be pleasant about it, and do not make an exception.

> **⚠** **Never ask a client for the will.** Ask for a certified copy of the **Letters**, and for the *list* of items designated to a named person — the representative or their attorney produces that list. If you find a will, codicil, deed or title in the house, it is **sequestered and handed to the representative and counsel against a signed receipt** (step 10a). We do not read it and we do not interpret it. The client document says so in as many words, and you should too.

> **⚠** **Check the sorting stage against what you priced (new 2026-09-04).** If the estimate's *Documentation scope* is *Capture only* the stage reads *Sorting, Photography & Listing* and says once that valuation is counsel's; at *None* it reads *Sorting & Set-Aside* and says once that counsel is inventorying. If it still reads *Sorting, Documentation & Inventory* and promises an itemised inventory with values, you are promising work that is not in the price — go back to Build Estimate, set the scope, and re-submit. The rules about authority do not move with it: nothing is sold or removed at that stage, nothing leaves without written authority.

Two things about it worth knowing before a client asks. **There are no dates or durations in it**, on purpose — the pace is set by how quickly they make decisions, and a date there is a promise about their calendar rather than ours. The document does not explain that absence either, so if a client asks, answer from the overall working-day estimate and say plainly that it depends on how fast they decide. And the stages come from the service type: a probate job shows documentation and court-filing stages, a home cleanout shows neither, a move shows Move Day. You cannot add or remove one by hand, and you should not try to — they are generated from the same thing that priced the job.

**Two things to check on the document itself (changed 2026-08-03).** Every vehicle you logged now appears in a *Vehicles & Watercraft* table — each one reads *Flagged for specialist appraisal* if you ticked Collector / classic, otherwise *Flagged for disposition*, and any vehicle without *Title located* ticked prints *Title to be located* in front of the client. That is deliberate — no title means no transfer, and they should hear it now rather than at closeout — but tick the box if you did find the title. The document never names a buyer or an appraiser for a vehicle; that gets decided on the job and recorded in the inventory.

On a **fixed-price** quote the document reads differently on purpose: one *Fixed Project Fee* line replacing the hourly rows, and **no hour counts anywhere** — including on the vendor and home-prep footnotes, which on an hourly quote tell the client how many concierge hours the vendor coordination took. A fixed-price document that quotes hours invites exactly the argument the fixed price exists to avoid.

> **⚠** **We are insured and bonded. We are NOT licensed.** Every client document said *"Licensed, Insured & Bonded"* until 2026-08-03. It is corrected everywhere in the app, but if you see the word *licensed* describing Havellin on anything that reaches a client — a document, an email, a proposal you have written yourself — take it out. *Licensed FFL* on a firearms disposition is a different thing and is correct: that is the vendor's licence, not ours.

> **The vendor numbers are flagged as estimates on the document itself (new 2026-09-10).** Both vendor sections now open with a line before the table saying these are good-faith figures from the walkthrough, that each vendor sets its own final price, and that because every vendor invoices the client *directly* they will see the real bill. **Say the same thing out loud when you walk them through it.** The vendor lines are the part of your estimate most likely to move, and a client who was told that up front reads a higher painter's invoice as a painter pricing a paint job — not as Havellin missing its own number.

**If a client asks whether we value things from photographs** — the sorting stage says we do, and why. We photograph a piece and send it to the specialist first so an on-site appraisal is only booked where the item warrants one, which keeps them from paying a call-out fee on something that does not. What we do *not* do is put a value on anything of consequence from a photograph: that is done in person, on site, while the contents are still in place. *Until 2026-09-10 the document claimed the opposite outright — that nothing is ever assessed from a photograph — so if you sent an estimate before then, that is the sentence they read.*

The tagline on every client document is **"Havellin handles the work no family should face alone."**

> **⚠** Once approved, the estimate **cannot be edited**. Service type, square footage and the premium toggle freeze. If the scope changes after this, it's a **Change Order** — see step 10.

**You do not have to save the estimate to Drive — approving it does that.** When you approve with your PIN the client estimate is filed into the job's Drive *Estimates* folder automatically, and the green approval banner gains a *📁 Filed to Drive · &lt;when&gt; · Open* line. If you edit an approved estimate, re-approving re-files the corrected version over the old one. A **📁 File to Drive** button only appears when that automatic filing did not land — press it then, and it goes away once it works.

> **The PDF is named for the client now (new 2026-09-08).** Print / Save PDF gives you *Havellin Service Estimate - 1234 Ocean Blvd - Sep 8 2026.pdf* instead of *Ellsworth-HVL-0007.pdf*. The email attachment uses the same name.

> **⚠** **If you estimated a client before 2026-09-08, look in their Drive *Estimate* folder.** Two different documents used to be saved under one filename — the client estimate, and our internal worksheet with the room scores, the hours and your walkthrough notes on it — and whichever finished uploading last is the one that stayed. **If the file in there is a table of rooms and hours, it is the internal one.** Open the estimate and press *Save to Drive* to put the client version back. They are two separate files from now on, and the internal one says *Internal worksheet — not a client document* across the top.

No client signature is wanted on the estimate. It's informational.

## Step 4 · Send it — Client Dashboard

**✉ Send estimate** on the *Estimate sent to client* row builds a proper formatted email — Havellin masthead, the property, the cost summary, the stages — with the estimate PDF attached, and leaves it as a **draft in your own Gmail**. It opens the draft for you. Read it, add a line of your own, and send it yourself.

Google will ask which account the first time you use it on a device, and stay quiet after that. **The draft is yours**: it sends from your address, lands in your Sent folder, and the client's reply comes back to you. The app can create the draft and cannot send it — that is deliberate, and it is why you always get to read it first.

Then come back and hit **✓ I've sent it** so the app records the delivery. The row will not go green until you do, and **Mark Won is waiting on it**.

> **⚠** An unapproved estimate **cannot be emailed**. If the button refuses it prints the reason on the dashboard, right where you pressed it — go back to step 3.

> **✉ Plain email** sits beside it as the backup, and the app drops to it on its own if Gmail is not set up on this device or the sign-in is cancelled — it will tell you which. That one is the old plain-text email in your normal mail app, and **you have to attach the PDF yourself** (Print / Save PDF first). Use it if you are in a hurry on a device that has never been signed in.

Then wait. Do not send an agreement, do not book anybody.

## Step 5 · The client says yes — Client Dashboard

Open the job card and hit **✓ Client Accepted — Mark Won**. Acceptance is informal — nothing is signed until the agreement — so the app records *how you know*:

- **Method** — email reply · phone call · text · in person
- **Date** they accepted
- **What they said** — paste the email, or write down what was said on the call

> A phone call or in-person acceptance **with no note** gets challenged before it's accepted. There's no email to fall back on, so your note is the only record of what the client actually agreed to. Write it while you remember it.

*Approved* and *Won* are different things and the difference is the whole point: approved means a manager signed off on our figure; won means the client said yes. Marking Won is what unlocks staffing.

## Step 6 · Agreement — Client Dashboard

> **⚠** **The app will not let you approve an agreement until the job is marked Won (enforced 2026-09-08).** It used to be a rule you had to remember; now the tab reads *Awaiting Client Acceptance* and withholds Approve, Print / Save PDF and the signing packet until the acceptance is on the dashboard (step 5). A manager PIN will not get past it either.
>
> **The reason is where the agreement goes.** Approving it is what files the agreement *and* the signing packet into the client's Drive folder. Before this, an agreement could be sitting in the folder of somebody who had never said yes. You can still read the draft on screen the whole time — reading it costs nothing, approving it is what commits.

> **⚠** **If you edit the estimate, this agreement's approval is withdrawn.** The agreement attaches the estimate as Exhibit A, so it cannot stay approved against a version you are changing. The tab tells you it happened. **Re-approve after the estimate is settled** and both the agreement and the signing packet in Drive are replaced automatically — you do not need to delete anything.

> **⚠** **You no longer need a manager to approve the agreement (changed 2026-09-10).** There used to be a second PIN here. It is gone, and it is not coming back — Anthony: *"once an estimate is approved by a manager and accepted by a client, a TC should be able to send an agreement without further manager approval … there is literally no way to amend an agreement that comes out of the system."* That is the reason it was safe to drop: **you cannot change a word of the agreement.** Its commercial terms *are* the estimate a manager already approved, attached as Exhibit A, and everything else is generated. There was nothing for a second manager to read that the first had not. **The two conditions have not changed** — the estimate must be approved and the client must be marked Won. You still cannot get past those. What changed is that meeting them approves the agreement *as you send it*, instead of being a separate thing to chase somebody for.

1. Open the client and find the *Signing packet sent* row.
2. **✉ Send signing packet**. One press: it stamps the approval, files the agreement *and* the signing packet into the client's Drive folder, and opens a draft in your own Gmail CC'd to agreements@. (Or **🖨 Print** if you are handing it over in person — that stamps and files the same way.)
3. Read the draft, add a line, send it.
4. Hit **✓ I've sent it**.

> **⚠** **There are two agreement forms and you do not choose between them.** The app picks on the **service type**, the same way the estimate does (step 3): Estate Settlement and both probates get the **estate form**, written to a representative signing in a fiduciary capacity; Home Editing, Home Transition, Home Cleanout and Home Prep get the standard form, written to an owner contracting for their own property. **Read the first paragraph before you send it.** If it addresses the wrong kind of client the service type is wrong — fix it at intake and re-generate. Never edit the agreement text by hand.

> **⚠** **The estate agreement rewrites its inventory clauses from the estimate's Documentation scope (new 2026-09-04).** Scope of Services, the §5.2 probate-compliance list, the appraisal row in §5.3 and the midpoint-payment trigger all follow it. At *None* the agreement says the inventory and valuation are counsel's; at *Capture only* it sells the photographed list without valuation. If you approved the agreement and then changed the scope on the estimate, the filed copy is wrong: regenerate and re-approve. Read §2 and §5.2 before it goes out — that is where it would contradict what the attorney told you.

> **The agreement's Email to Client is new as of 2026-09-08 — the old one never worked.** The button was there but did nothing, so **agreements@ has never had a copy of an agreement sent to a client.** It does now, automatically, on both the Gmail draft and the plain-text fallback. It attaches the **signing packet**, so you are never sending an agreement whose Exhibit A is missing.

> **One document goes into their Drive folder, and it is the packet (changed 2026-09-11).** It used to file two — the packet *and* the agreement on its own. They sat side by side under almost the same name, and only one of them is signable: the bare agreement is the terms with **Exhibit A missing**, which both forms say makes it invalid. Nothing is lost by filing one, because the packet *contains* the agreement as its first page. **If you are looking in a folder from before that date you will see both.** The one to keep is the one whose name reads **Havellin Services Agreement**. The one ending *_Agreement.html* is the half-document — do not send it to anybody.

Three buttons then appear one at a time, each in its own turn, each recording who did it and when. None of them will run out of order — you cannot mark a signature on an agreement that was never sent.

| Button | Press it when |
| --- | --- |
| **🖨 Print** (signing packet) | One PDF: the agreement, then the approved estimate as Exhibit A on a new page. **This is what you send for signature** — the agreement alone refers to an exhibit the client does not have. It is also filed to Drive beside the agreement when you approve. |
| **✓ I've sent it** | You have emailed it or handed it over. |
| **✓ Record the signed agreement** | The signed copy has come back. It asks **who signed it** — see step 8. Signing does *not* mean paid; the app keeps those separate on purpose. |
| **✓ Record payment** | The money is in your hand. This is what lets work begin. |

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

**✓ Record the signed agreement** on the *Agreement signed* row. Do it the day it arrives — the deposit step will not open until you have.

> **⚠** **It asks WHO SIGNED, and it means the client (new 2026-09-11).** Not you. Not the manager who approved the price. **The name of the person who signed the contract.** Until this build the app recorded the Havellin manager who approved the *estimate* and displayed that as the signer — so the dashboard read *"Agreement signed · Anthony Graziano"* over a contract Anthony had not signed, and **nowhere did the app hold the name of whoever actually signed it**. On a probate matter that is the first thing counsel asks: who bound the estate to this? It prefills the authorised representative (or the client on a living-owner job) and **will not accept a blank**. It also asks how it came back — *Signed in person* or *Signed copy returned* — the date *they* signed rather than the date you typed it, and a note (where the original is held is the useful thing to put there). **A job signed before 2026-09-11 reads as signed with no signer named**, and says so. That is correct and there is nothing to fix: we genuinely did not record it. Do not go back and type a name in from memory.

## Step 9 · Record the deposit — Client Dashboard

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
- **⚑ Appraise** — the toggle under the disposition chips, new 2026-09-11. **It is not an eighth chip and it does not replace the disposition.** An appraisal is the step *before* a destination, so the item keeps whatever you chipped: first appraise, then auction or consign or sell. Press it for anything you want a specialist to value.

> **Check the room card after you shoot.** A green number on the button means that many photos are filed in Drive. A red **⚠ not saved** means the upload failed and the photo is *not* in Drive — hit **Retry** on that shot. Retry works across sessions now, so a photo that failed yesterday can still be sent today; it used to do nothing at all and look identical to a button that had worked. If Retry tells you the image can no longer be recovered, the device did not have room to hold it — take the shot again.
> 
> The room cards themselves are in **walkthrough order**, matching the estimate, so you can work down the plan the way you walked the house.

> **⚠** **Press ⚑ Appraise for anything you think is worth more than it looks. Nothing else in the app can tell.** The automatic rule works off the *category* — art, jewellery, silver, antiques, rugs, collectibles, firearms, wine and instruments route to the worklist on their own, and the line under the toggle tells you when that has already happened (*✓ Art & Décor already goes to the appraisal worklist*). What it cannot see is the period side table, the unmarked bronze, the thing filed under Furniture that is not furniture. **That judgement is yours standing in the room, and before 2026-09-11 there was no way to record it at all.**
>
> It is asked again for every object, deliberately — the disposition stays put between shots, this does not. If you meant it for the whole shelf, press it on each one.
>
> Missed it in the house? Tick **Needs Appraisal** on the row that evening on the Inventory tab. Nothing is lost by doing it later.

> **⚠** **Read the Standing job flags to the crew before anyone starts, and hand them the printed plan.** The panel at the top of the Job Plan is what intake was told about this house — firearms and cash and safes, the thing the family cannot lose, the dog and the rotten step. Phase 0 has a checkbox for exactly this. *Print Job Plan* carries the panel onto the paper.
>
> **⚠ If you printed a plan before 2026-09-11, throw it away and print again.** It gave you the header and the five phase headings and *nothing underneath them* — no room cards, no checklists, no disposition streams. The flags panel always looked right, which is exactly why nobody noticed. It prints in full now, and you do not have to open the phases first.
>
> If a row reads *"Ticked at intake, no detail recorded"*, that is a question nobody finished asking — ring the client before Day 1 rather than finding out with a crew standing in the driveway. If something turns up that intake never mentioned, put it on the record through **Edit Client** so the next person reading the plan has it too.

### b. Log hours — Job Plan tab, every single day

One entry per working day: the **date**, an **activity summary**, and **hours against each named crew member**. The roles come from the roster you confirmed — concierge rows log as TC, specialist rows as PS.

> **⚠** **Log daily. Do not batch at end of job.** The hours drive the forward-variance projection *and* the final invoice — the timesheet *is* the invoice. A job with no logged hours cannot issue a final invoice at all, and nobody can unlock it for you.

Log *your own* hours as well as the crew's. You are on site for every crew hour; if the log shows crew time with no concierge time against it, the invoice warns you in dollars about the time it thinks you've missed.

### c. Source the vendors — Job Plan tab

Assign a directory vendor to each estimate line, set its status, and **record the actual quote**. Actual quotes on **Home Prep** lines are what the 30% fee is charged on at the midpoint and final — on a standalone prep job and, since 2026-09-10, on prep bundled into any other job too. Every other vendor line carries nothing for Havellin; those are recorded so the client's costs and the job's real margin are known. You will notice prep lines have **no *Coord hrs* box** — prep books no hours now, so there is nothing to compare against. A line with no logged quote falls back to the estimate and gets tagged "est." on the client's invoice.

Only **Active** vendors appear in the picker. An assigned vendor's phone is a tap-to-dial link, because you're usually standing in the house when you need them.

> **Coord hrs — fill it in if it's easy, skip it if it isn't.** Next to each quote is a *Coord hrs* box showing what the estimate assumed (*est 3.0*). Roughly how long that vendor actually took you. **It bills nothing** — your logged hours already include the time you spent on the phone to them, so this is just labelling time that's already been charged, not adding any. It's there because the touch counts behind the quote are our best guess and nothing else in the app can check them; a handful of real jobs and we'll know whether a mover really is three hours. Nothing is gated on it and no invoice reads it. Once you've entered a few, a line at the bottom of the section totals estimated against recorded.

### d. Change Orders — Client Dashboard

Scope changed after approval? Do *not* edit the estimate — it's locked. From the job card: **Create Change Order** → description, a reason, and **the extra concierge and specialist hours**. **No manager PIN is involved** — a change order is agreed with the client, not approved internally.

> **⚠** **A change order carries HOURS. There is no dollar box, and there is no price on the client's copy.** (Changed 2026-09-11 — it used to ask for a dollar impact.) Type the extra concierge and specialist hours you expect; the screen tells you what that does to the job as you type — *“140.0 hrs on the estimate becomes 180.0 (+28.6%) — Past the 15% threshold”* in amber, or *“+2.9% — inside the 15% the client already agreed to”* in blue. **It will not save with no hours on it.**
>
> **You are not billing them for the change order itself.** On an ordinary job you work the extra scope, log the hours like any other hours, and the final invoice picks them up. The change order is the client’s written authority, not a second charge. On a *fixed-price* job it is the other way round — a flat fee never looks at your timesheet, so there the hours are converted at the estimate’s rates and added to the fee. The invoice says which.
>
> **Holding a printed change order from before 11 Sep? Throw it away and print it again** — the old ones carried a dollar figure that is no longer how any of this works.

Then two buttons appear on it:

1. **PDF** — the printable change order: hours on the approved estimate, the scope change, revised estimated hours. **No dollar figure on it anywhere.**
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
7. **Work *Needs appraiser* before you print a release request.** That filter is the list of things nobody has valued yet, and an unvalued line on a signed release is property that left the estate with no independent record of what it was worth.

> **Reviewing does not lock anything and does not unlock anything.** You can print the client's schedule at any point in a job — we show clients work in progress on purpose. Until every line is ticked the document prints with an **IN PROGRESS — 18 of 42 items reviewed** stamp and a line saying unreviewed values may still change. Don't apologise for it; that stamp is the honest thing on the page.

> **Where the columns went.** This tab used to be a 29-column spreadsheet with four buttons above it that swapped which columns you could see. Both are gone. Every one of those fields is still there — in the item panel, in the CSV and in the client's workbook.

> **⚠** **The release approval request now tells the representative when a line has not been valued — and before 2026-09-11 it did not.** An object the app had itself flagged for a specialist, with no value on record, printed with *Auction* proposed and an initial box beside it and the document said nothing about it. It is badged *NOT YET APPRAISED* now, named with its item number in a notice above the table.
>
> **It does not stop you, and it should not.** Selling before a formal appraisal is often the right call — a dealer's offer may be the market test, and not everything warrants a formal valuation. The representative decides. Your job is to have asked the question first, and to be able to answer it when they ask what the piece was worth.
>
> **⚠ Any release approval request you printed before 2026-09-11 is worth re-reading against the manifest.**

- **Value it against something.** Put the number in the row, then set **Valuation Source** and write what you used in **Valuation Basis / Comps** in the item panel — which app, which comparables, what the range was. A line with a value and no source prints **not stated** in red on the client's schedule, because we promise on our own website that the source is stated.
- **Appraisers** — build the roster per estate: name, firm, credential (ISA / ASA / AAA / USPAP / GIA), independence, the effective and report dates, and **Due back** — the turnaround we promise to tell the client. An item valued by appraisal links to a roster appraiser instead of free text.

  > **⚠** **An appraiser who also BUYS is not independent, and the app now says so.** Pick a firm from the directory dropdown and, if the directory lists it as a buyer, an auction house or an estate sale company, the option reads *⚠ also Jewelry & Watch Buyer* and the *Independent* tick comes off by itself with the reason printed beside it. A firm that might end up buying the property, or earning a commission on what it sells for, cannot give a defensible opinion of its value — that is the entire point of the word. You can tick it back, and sometimes you should: a family that wants the jeweller who has known them thirty years to look at the jewellery is making their own decision. But do it deliberately. **If you linked an appraiser from the directory before 9 September 2026, open the roster and check that row** — the old picker hid the buying trade and left *Independent* ticked.
- **The $3,000 guardrail** — flagged items with no appraiser attached raise an amber nudge on a Standard job and a **red block on a Formal one**. Per-item **Waive** logs a reason. On a Formal job the Court Inventory prints *DRAFT* until every flagged item is appraised or waived.
- **Needs Appraisal** (new 2026-09-11) — the tick box in the item panel's Valuation section, and the desk half of the **⚑ Appraise** toggle you press in the house. Tick it for anything the category cannot see; untick it to take a line back off the worklist. *Untick is not the same as Waive* — waiving records that the requirement applied and somebody decided against it, with a reason that prints. And if the item routes automatically on its category, unticking does nothing: link an appraiser or waive it.
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

> **⚠** **If a line on that request is badged *SPECIFIC BEQUEST* or *DISPUTED*, do not chase the signature on it.** A specific bequest is property the will leaves to a named person, and every estate estimate we issue says we set those aside. A dispute means beneficiaries disagree and we hold. Both can still properly be released — but that is the representative's call **on counsel's advice**, and it is not yours to argue either way. The request names those lines above the table and says so; let them ask counsel. If they want it off the request instead, set the item's disposition to **Keep** or **Hold** and it drops off by definition.

> **Catch it earlier at the bulk bar.** When you set a disposition across a selection, the confirmation now names any flagged items it swept in — "2 of them are flagged specific bequest — #2 Sargent portrait, #4 locket." That is the moment to fix it, not when the representative is holding the paper.

> Everything in the inventory is documentation support, not a legal or appraisal opinion. The estate attorney and a credentialed appraiser remain the authority.

> **There are two $3,000 tests and they are not the same test.** The *per-item* one is the ⚑ flag: is this object worth enough to send to a specialist. The *aggregate* one asks whether the estate's art, jewellery, silver, antiques, rugs and collections **added together** come to more than $3,000 — and if the estate files a federal estate tax return, that means an expert appraisal under oath has to be filed with it.
>
> **An empty Appraisal Worklist does not mean nothing needs appraising.** Thirty $500 pieces of silver: nothing is flagged, because nothing is near $3,000 on its own — and the estate owes an appraisal on $15,000 of silverware. The worklist now prints the aggregate in its own box whether or not anything was flagged. **Read that box before you tell anyone the estate is clear.**

> **Value the MAIV articles before you call the total done.** While any of them has a blank value the app will say "at least $X — cannot be tested yet" rather than giving you a verdict, and it is right to. A partial total that happens to land under $3,000 is not an estate under $3,000.

> **⚠** **Your inventory is no longer only on your own phone (2026-08-24).** Until this change, every valuation, disposition, custody entry and flag lived in one browser and nothing ever read it back — so you and Ashley could each hold a different inventory for the same estate, and whichever saved last quietly overwrote the other. Clearing your browser data destroyed the record outright: the photographs were safe in Drive, but what they were, what they were worth and where they went was gone. It now saves to the shared sheet and merges item by item, so two people working the same job keep both sets of edits.

> **⚠** **⚠ One thing that merge got wrong until 2026-09-11, and it is the chain of custody.** Within an item the newer record won *whole* — so if you logged a release on your phone and Ashley corrected that item's value on her laptop without having synced, her record was newer and **your custody entry was deleted**. Silently, on a court record. Custody events now merge as a union: everyone's entries survive, and they are listed in the order the events happened rather than the order they synced. **If you worked an estate from two devices before that date, open the custody logs and check nothing is missing.**

> **Removing a custody event marks it removed rather than erasing it** — otherwise the next sync from the other device simply puts it back. It disappears from the list and stops counting, and the removal holds everywhere.

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

## Step 11 & 12 · Invoices — Client Dashboard

Open the client. **Each invoice has its own row on the timeline** — *Deposit invoice sent*, *Midpoint invoice sent*, *Final invoice sent* — so there is no stage to pick any more: the row you are on *is* the stage, and the lit one is the invoice due. Each sends exactly like the estimate did (**✉ Send…** → **✓ I've sent it**), and each is filed to Drive as it goes out.

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
| Home Prep GC / Site Management Fee | **30%** of prep vendor spend — standalone *or* bundled | 30% |
| Home Prep coordination hours | **None** — they are inside the 30% *(changed 2026-09-10; this row used to say “None — at cost, plus 0.5–2 coordination hrs per trade”, which contradicted the row above it)* | **None** |
| Moving Materials | **Fixed package price** — you pick a tier on the estimate ($200–$1,500). *Not* cost-plus, no handling fee, no receipts *(corrected 2026-09-11)* | Same packages |
| Preferred Client Discount | Havellin labour only · **max 15%** | max 15% |
| Expedited delivery (rush) | +20% of Havellin services | +20% |
| Fixed-price contingency | +20% on the hourly basis | +20% |

Every service bills **time-and-materials by default**. A firm fixed price is available on any job *except* Probate and Contested Probate. Vendor work is pass-through — the vendor bills the client directly at cost and Havellin takes only the fee on top.

**Order on the price:** services total → less the discount → plus 20% expedite on what's left → plus vendors at cost.

### Manager PIN required for

- Approving or denying an estimate
- A **final** invoice more than ±15% off the estimate (deposit and midpoint need none)
- Deleting a client, vendor or partner

**Not** required for the **agreement** — that second PIN was removed 2026-09-10 (step 6), and not for a Change Order — that one is settled with the client, not internally. Everyone has their own PIN and the approval is recorded under whoever typed it, so use yours.

### The margin panel

**It is no longer shown on the Build Estimate tab** — too much detail for the screen you build the estimate on. Nothing about margin changed, and the **15% discount cap** is the guardrail that's left. If you're weighing a discount bigger than the app will let you give, that's a conversation with a manager, not a workaround.

When you do read it: it's an indicative profitability readout with a flag on it, **not a discounting tool**. *Price at 30% Margin* is a reference line at an admittedly arbitrary margin and *Above Reference* is simply the distance to it. Neither is an allowance to spend. In practice, a job needing that much discount is one to walk away from rather than price down to.

### If something won't let you proceed

| Symptom | What's missing |
| --- | --- |
| Half the tabs are missing and the nav is at the bottom | You are in **field mode** — the **📱 Field** button in the header is filled bronze. It keeps five tabs (Clients · Intake · Estimate · Job Plan · Vendors) and hides the four that are desk work. Nothing is lost; press it again to come back. |
| **The Client Estimate / Agreement / Invoices tab is gone** | Retired 2026-09-11. Everything they did is on the **job timeline** — open the client on the Client Dashboard and look at the row for the step you want. Nothing was removed. |
| You sent the email but the step has not gone green, and the row says *"Drafted — read it, send it, then confirm"* | You have not pressed **✓ I've sent it**. The app can only put a draft in your Gmail; it cannot see that you sent it. Press it. On the estimate this is what **Mark Won** is waiting for. |
| The row of buttons across the top of the Client Dashboard has gone | Changed 2026-09-11, and nothing was lost. Five of the seven were already further down the same screen. **Estimate · Submit for Approval · Mark Won · Activate Job** are rows on the **timeline** — open the client and look at the lit row. **Change Order** is the **+ New** in the Change Orders card. **✎ Edit Client** and **📁 Drive** are on the *Job Timeline & Payments* heading. |
| You are looking for **Activate Job** | It is a row on the timeline (*Job active*), and it only shows a button when the job can actually be activated. If there is no button there, the row says what is blocking it — usually the signed agreement, the deposit, or executor authorisation on a probate matter. The old top-of-screen button offered itself even when the job was blocked, which is why it went. |
| A job will not activate, and you want to start the pre-job work | You already can. **Marking the client Won** is what opens staffing, the Job Plan and photo capture — none of that waits for money. Only **logging hours** waits for the deposit, and that gate has no override. *Active* is a status marker, not a permission. |
| When does a client's Drive folder get created? | **At the moment you save Client Intake** — the folder and all six subfolders in one go. Not at approval, not at activation. **📁 Drive** is only ever a link to it; there is nothing to press to create one. |
| You cannot find a button you are sure exists | Open the client and look at the **lit row**. Only one step is live at a time and its buttons are drawn in the band, once — not on every row. If nothing is lit, the job is finished or lost. |
| The agreement is waiting for a manager PIN | It is not — that PIN was removed 2026-09-10. If **✉ Send signing packet** refuses, it is one of the two real conditions: the estimate is not approved, or the client is not marked **Won**. The row says which. |
| *Who signed it?* — do you put your own name in | **No.** It is the **client** who signed the contract; it prefills the authorised representative. Who recorded it is captured separately, automatically. It will not accept a blank. |
| An old job shows *"Signed before the signature record — who signed it is not on file"* | Correct, and nothing to fix. Before 2026-09-11 the app never recorded the signer. **Do not type a name in from memory** — an unknown signer is an honest record. |
| There is no *Save to Drive* button on a document | There is nothing to press — documents file themselves. **📁 File to Drive** only appears when the automatic filing did *not* land, and it goes away once it works. **📁 Filed copy** opens what is already there. |
| A document in a client's Drive folder names a different client | A bug fixed 2026-09-11: the estimate and agreement used to be filed by reading whatever the old tab was showing, so filing from the dashboard with another client loaded wrote *their* document into *this* folder — and reported success. Re-file it from the timeline and delete the stray. Worth a look in any folder used before that date. |
| An invoice you emailed before 2026-09-11 had no attachment | It never did. The old invoice email was plain text and said *"Please find attached"* with nothing attached. Re-send it from the timeline; it carries the PDF now. |
| A date on the timeline reads *Invalid Date* | A display bug fixed 2026-09-11. Reload the page to pick up the current build. The underlying date is fine — nothing was lost and nothing needs re-entering. |
| Somebody found cash, a gun or a safe that intake never mentioned | Nothing moves. Put it on the record through **Edit Client** — tick the row, write what you found and where — and it appears on the Job Plan brief for everyone else. A firearm additionally waits for **written authority** naming who may take possession; the app will not release one without it, and neither should you. |
| A flag on the crew brief reads *"Ticked at intake, no detail recorded"* | Somebody ticked the box on the intake call and never wrote the answer down. Ring the client and get it **before Day 1**, then fix it on Edit Client. The app prints the row rather than hiding it precisely so this is visible while it is still cheap. |
| The Job Plan shows no Standing job flags panel at all | Either nothing was ticked and neither question was answered, or the job predates 2026-09-10, when the questions were added. Nothing is broken — an empty panel would just be noise. Fill it in on **Edit Client** and it appears. |
| You are looking for the old free-text *Notes* box on intake | Still there, at the bottom of the first card, under the two questions and the checklist. It is for what the questions do not cover — family dynamics, urgency, who really decides. What used to go in it about the *house* now has proper rows of its own. |
| A client asks whether you mark up the vendors | Straight answer, and it is on every document: **no — the vendor bills them at the vendor's own price and we add nothing to that invoice.** On home prep vendors we charge a separate, clearly-shown **30% general contracting and site management fee** for sourcing, scheduling, on-site oversight and quality control. Both things are true at once; do not say only the first half. |
| The job is not the service type intake said it was | Change it in the **service type** dropdown on Build Estimate (from 2026-09-10). Everything you have scored is kept and the price re-runs. It offers living services on a living job and estate services on an estate job, and never both. |
| The service dropdown does not offer the type you want | You are trying to cross the living/deceased line — a living client cannot become an Estate Settlement here, because nobody has been asked for a representative or a date of death. Do it on **Edit Client**, and fill those fields in while you are there. |
| The service dropdown is greyed out | Either the estimate is out for manager approval, or it is approved, or the agreement is signed. For the first two, press **✎ Edit estimate** on the timeline and it opens again (you will need to re-approve). Once the agreement is *signed* it is a **Change Order**, not an edit. |
| You changed the service type and the total jumped | Expected — that is the point. The services price differently, and coming off Home Prep in particular switches the job from a fee on vendor spend to billed concierge and specialist hours *plus* that fee. Check the reference band before you submit. |
| A prep vendor you entered before today is now earning a fee it did not before | Changed 2026-09-10 — bundled prep carries 30% now and books no coordination hours. If the client is holding an estimate issued before that date, it was quoted the old way and reopening it moves the total up. Re-send after re-approval rather than letting the invoice arrive higher than the quote. |
| The *Coord hrs* box is gone from your prep vendors | Deliberate, 2026-09-10. Prep books no coordination hours on any job now, so there is no estimated figure for a recorded one to be checked against. The box is still there on every other vendor. |
| You switched a job to Contested Probate and the case fields vanished | Fixed 2026-09-10 — a real bug. On **Edit Client**, switching to Contested Probate used to hide the case number, the deadline, the attorney *and* the authorised representative, while still saving whatever was in them. Nothing was ever lost; you just could not see or correct it. They stay on screen now. |
| Your mobile is not on the estimate or the email you just sent | It comes from the phone field on your row in the **Contractors** tab. Add it there and it appears on every client document and email from then on. Until you do, the client gets the office line only — which works, it is just less direct. |
| A client document shows a phone number that rings nowhere | The old office line was *(561) 370-4700* and it is retired. The app refuses to print it as anybody's mobile, so if you are seeing it, you are looking at a document generated before 2026-09-09 — regenerate it. The office is now **(561) 652-5522**. |
| The Gmail draft opened in the wrong Google account | Fixed 2026-09-09 — the link now names your mailbox. If it still happens, switch account in Gmail and the draft is there. It was created in whichever account you picked in the Google window, and that is the one it sends from. |
| There used to be a *Plain email* button and now there isn't | Deliberate. It carried no attachment, and having it beside the real button invited sending the wrong one. The app still falls back to a plain email on its own if Gmail cannot be used, and tells you that is what it did. |
| agreements@ never got a copy of an agreement you sent | Before 2026-09-08 there was no working agreement email at all — the button was in the app and did nothing. Nothing was lost on your side; the copy simply never went. From now on both the Gmail draft and the plain email CC it automatically. |
| The worksheet in a Home Prep client's Estimate folder is blank | Fixed 2026-09-08. A prep job has no rooms and no hours, so the old worksheet rendered an empty table. Re-approve the estimate and it re-files with the vendor lines and the fee on it. (And check the folder holds the client estimate too — see the row above about a table of rooms and hours.) |
| **✉ Send…** opened a plain-text email instead of the formatted one | The app fell back, and it will have said why in the message bar. Almost always the Google sign-in window was closed before it finished — press the button again and complete it. (Gmail is set up in the app already; nothing to configure on your device.) The plain email works; you just have to attach the PDF yourself. |
| The Gmail draft was created but the PDF is not attached | The PDF conversion failed and the app told you so rather than dropping the email. The body still carries the summary. Hit **Print / Save PDF**, attach it to the draft by hand, and send. |
| The Gmail draft opened in the wrong Google account | Gmail opens the first account signed in on that browser. Switch account in Gmail and the draft is there — it was created in whichever account you picked in the Google window, and that is the one it will send from. |
| Google says the Gmail API is not enabled | A one-time setup step on the Google Cloud project, not something on this device. Send it to Anthony — it is in §2 of the manual. Use **✉ Plain email** until it is done. |
| The *Signing packet sent* row will not let you send | The client has not been recorded as accepting. Go to the Client Dashboard and hit **✓ Client Accepted — Mark Won** (step 5). Approving is what files the agreement into their Drive folder, so it waits for the yes. The draft on screen is a preview and has not been filed anywhere. |
| The agreement was approved and now says the approval was withdrawn | Somebody edited the estimate. The agreement attaches it as Exhibit A, so it cannot stay approved against a version that is changing. Settle the estimate, re-approve it, then re-approve the agreement — Drive is refreshed for you. |
| The estimate PDF in a client's Drive folder is a table of rooms and hours | That is our internal worksheet, and before 2026-09-08 it shared a filename with the client estimate so it sometimes won. Open the estimate and press **Save to Drive** to put the client version back. They are separate files now. |
| A Home Prep estimate talked about hours, or a 15% overrun | Fixed 2026-09-08. Home Prep bills no hours at all — the fee is 30% of what the vendors actually invoice. If you are holding a prep estimate issued before that date, re-open it and re-approve so the client gets the corrected terms. |
| The Appraisal Worklist says nothing is flagged — is the estate clear? | Not necessarily, and this is the trap. That line answers the *per-item* test only. Read the **§20.2031-6(b)** box underneath it: art, jewellery, silver, antiques, rugs and collections are added together, and over $3,000 in total the estate owes an expert appraisal under oath with its federal return — even when no single piece was ever flagged. |
| The aggregate box says "cannot be tested yet" | Some MAIV articles still have no value in them. The total you can see is a floor, not a total, so the app will not give you a verdict. Get values against them; that is the whole job at that point. |
| You found a fur coat / a wall of old books and there is no category for them | There isn't one, deliberately. Leave the category as General/Household, set **MAIV** to *Yes*, and pick *Furs* or *Books & manuscripts* as the class. The regulation names both by name. |
| Trust items are on the aggregate but not on the Court Inventory | Correct, and both are right. The Court Inventory is the probate schedule and trust property is outside it. The federal aggregate counts the *gross estate*, and a revocable trust's contents are in the gross estate. Two documents, two questions. |
| A firearm you flagged isn't on the Appraisal Worklist | Correct, and deliberate. Nothing goes on that list until the representative has authorised the transfer to a **named** dealer in writing. Record it on the item — *Authorized By* and *Approval Date*, dealer in *Channel / Recipient* — and it appears. The worklist prints a note saying what it is holding, so a held item never reads as a forgotten one. |
| A red chip bottom-left reads *N unsaved changes — retrying…* | A save did not reach the sheet. **Nothing is lost** — it is held and re-sent on its own, and the chip goes when it lands. **Tap the chip** to see which save it is and what the server said. Carry on working; it usually clears itself within a minute. |
| The chip reads *still failing after N attempts* | Then it is not a blip, and it will not fix itself. Two things cause it: the **Apps Script URL in Settings is stale**, or the script was deployed with anything other than **Who has access: Anyone**. Tell whoever manages the Apps Script, and **until it clears, that work exists only on the device in your hand — do not close or reload the tab.** Retrying carries on in the background the whole time. |
| The browser asks whether you really want to leave the page | You have a save that has not reached the sheet yet — look bottom-left for the red chip. **Stay**, and wait for it to go. Closing the tab throws that work away: the queue lives in the page, and the next load takes the sheet's copy over this device's. |
| Photographs fail on site — every shot says *"not saved"* | The client has no Google Drive folder. It is made when Client Intake is saved, and very occasionally that one attempt does not land. Open the client on the Client Dashboard and press **Create Drive folder**, then press **Retry** on the room card — the photos are still held on the device and go up as soon as the folder exists. |
| You can't find the **NFA Item** tick box | It only appears on rows whose category is *Firearms*. Set the category first. On anything else the column shows blank on purpose — an NFA tick on a sofa describes nothing. |
| A cheap gun never showed up anywhere on the worklist | Anything under $3,000 with a value recorded isn't flagged for a specialist, so it was never worklist-bound. It *is* still listed on the awaiting-authority notice — that notice covers **every** firearm without written authority, not just the expensive ones. |
| You found a metal tube in a gun safe and don't know what it is | Treat it as a firearm. Photograph it, touch nothing, flag it, tell your TC the same day. It may be a suppressor, which is an NFA item and a different transfer path entirely. Nobody is ever criticised for over-flagging this. |
| You took photos and nothing happened — no count, no flag, no message | Fixed 2026-08-03. The app required the job to be *Active* and it was only *Won*, so it discarded the shot silently. It captures from *Won* now, and says so out loud if it ever does refuse. **Photos taken in that window before that date are not in Drive** — re-shoot if you still can. |
| A room card shows a red **⚠ not saved** | That upload failed and the photo is not in Drive. Hit **Retry** on that shot — it works across sessions now, so yesterday's failure can still be sent today. |
| Retry says the photo can no longer be retried | The device had no room to hold the image. It's gone — take the shot again. |
| A job's photo counts all read zero when you first open it | Fixed 2026-08-03. The cards were drawn before the photo records loaded. Everything was in Drive the whole time; switching away and back used to show the real counts. |
| You cannot find the *Save to Drive* button any more | Because the estimate is already on Drive. Approving files it automatically; the banner's *📁 Filed to Drive · &lt;when&gt; · Open* line is the confirmation, and the button only comes back if a filing fails. |
| A client's *Estimates* folder has the same estimate in it several times | Pressing the old *Save to Drive* button repeatedly, before 2026-09-09, added a copy each time instead of replacing one. **Approve the estimate once more and the folder collapses back to a single file** — the extras go to Drive's trash and are recoverable for 30 days. Tell Anthony if it does not, because the Apps Script may not have been redeployed. |
| After **✉ Send…**, Gmail shows an error — *"account is not available"* or *Temporary Error (404)* | Fixed 2026-09-09 (second attempt). **The draft was created every time** — only the link opening it was wrong. Check the version stamp under the Havellin title reads **2026.09.09** or later; then use the *Open Gmail* link in the box that appears under the buttons, and if Gmail opens a different account, switch with the avatar top-right. The box names the mailbox the draft is in. |
| Gmail opened, but it is the wrong Google account and there is no draft | The link can only open whichever Google account signed in first in that browser. Switch accounts with the avatar top-right — the box under the buttons names the mailbox the draft was created in, and it is in **Drafts**. |
| The Gmail draft has no PDF attached | First check you are not looking at an **old draft** — a draft is a snapshot and never updates itself, so delete it and press *Email to Client* again. If the new one still has none, the app says so in orange under the buttons: use *Print / Save PDF* and attach it by hand before sending. |
| The *Filed to Drive* line vanished from the banner | You edited the estimate. The copy in Drive is the previous version, so the claim is withdrawn until it's re-approved — which re-files it automatically. |
| Job Plan rooms are in a strange order | They're in walkthrough order now, matching the estimate. Before 2026-08-03 they were sorted hardest-room-first, which matched nothing. |
| The client estimate has no third-party vendor section at all | Correct when there are no vendors — the empty heading and its $0 lines are suppressed. Add a vendor and it comes back. A vendor with no direct cost (auction house, estate sale company) still shows. |
| A client asks how long each stage of the job will take | The document deliberately carries no dates. Answer from the overall working-day estimate and say plainly that the pace depends on how quickly they make decisions — that is the honest answer and it's also the one that protects you. |
| An heir on site asks you to hand them something | It goes through the representative, in writing. Be pleasant, do not make an exception, and do not take a verbal instruction from anyone who is not the representative — the client document promises this in writing and the estate file has to match it. |
| A client offers you the will, or you are tempted to ask for it | You do not need it and should not hold it. Ask for the *Letters* and for the list of designated items. A will you find in the house is sequestered and handed over against a signed receipt. |
| The estimate talks to the client as though they were alive, and they are not | The job is filed under **Home Cleanout** when it should be **Estate Settlement**. Change the service type at intake and re-open the estimate. Do not edit the wording — it is rebuilt on every render, and the price is wrong too. |
| You are looking for a "client is deceased" tick box | There isn't one, and there should not be. The **service type** is the answer: Estate Settlement, Probate and Contested Probate are deceased-client engagements; Home Editing, Home Transition, Home Cleanout and Home Prep are living-client ones. |
| Intake will not take a client phone or email on an estate job | Correct — the client is deceased, so those fields are disabled and the **Authorized Representative** block below is where the contact goes. That is who every document is addressed to and where the estimate is sent. |
| The agreement is the wrong one of the two forms | Same cause, same fix — it reads the service type, exactly like the estimate. Correct the service type at intake and re-generate. The routing changed on 2026-08-03; anything issued before then is worth re-reading. |
| The agreement says 15% of vendor invoices, but the estimate charges no vendor fee | Fixed 2026-09-08. The fee came off on 2026-08-02 and the agreement clause was not updated with it, so every agreement generated in between promised a fee the invoice never bills. Re-generate it — §3.5 now reads *Vendor Coordination*, no fee, on the standard form, and the estate form's fee table says *at cost — no fee*. If a client has already signed one, the invoice governs and charges less, not more. |
| There are two agreement files in the client's Drive folder | The folder predates 2026-09-11, when the app stopped filing the bare agreement beside the packet. **Keep the one named *Havellin Services Agreement*** — that is the signing packet, with the estimate attached as Exhibit A. The one ending *_Agreement.html* is the terms without the exhibit and is not signable; never send it. |
| The client asks where Exhibit A is | You sent the agreement on its own. Use **🖨 Print** on the *Signing packet sent* row — one PDF with the approved estimate attached as Exhibit A — and send that. New 2026-09-08. |
| The estate document reads nothing like the home editing one | Correct as of 2026-08-03. Estate and probate stages are written for the representative — catalogue first, nothing removed until authorised in writing, releases receipted. Home Editing keeps the decision-paced language because there the client really is standing in the house deciding. |
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
| The change order form has no box for a dollar amount | Correct — it carries **hours** now (changed 2026-09-11). Type the extra concierge and specialist hours. You are not billing the client for the change order; you are recording their authority for the extra work, and the hours are billed through your timesheet on the final invoice like every other hour. On a fixed-price job they are converted at the estimate’s rates and added to the fee instead. |
| A change order won’t save | It has no hours on it. A change order with no hours would sit on the timeline and the invoice reading as an agreed change while agreeing to nothing, so the app refuses it. |
| A client asks for the *receipts* for the moving materials | There are none, and the documents no longer promise any. Materials are a **fixed package price** you picked on the estimate — not cost-plus, no handling fee. Four client surfaces said otherwise until 2026-09-11, two of them contracts. If they are holding one of those, re-send the current estimate and agreement; the price has not changed. |
| A prep client’s agreement quotes $150/hour | It was generated before 2026-09-11. A Home Prep engagement bills **no hours at all** — the fee is 30% of vendor spend — and the contract said both things at once. Re-generate and re-send it; nothing about the price changed. |
| A vendor’s quote is on the wrong trade’s line | Fixed 2026-09-11. Removing a line from an estimate used to shift every quote below it up one, so the cleaner’s row could come back carrying the landscaper’s name and price. If you are looking at a job where that already happened, re-enter the quotes on the Job Plan — they will stay put now. |
| Win / Loss reads all zeros, or the referral leaderboard is empty | The clients had not finished loading when you opened the tab. It corrects itself now (fixed 2026-09-11) — if you are on an older build, press **↺ Refresh**. When the app genuinely cannot reach the sheet it says so and shows em dashes rather than zeros, because “0 won, 0 lost” is a claim and it has not read anything yet. |
| Two tabs are showing on top of each other | You printed a change order on a build older than 2026-09-11. Reload the page. It is fixed, along with the PDF being named after the app instead of the client. |
| A firm does two things and you want it under both | Press **Edit** on its card in the Vendors tab and add the second trade to the Category field after a semicolon — *Art Appraiser; Antiques & Furniture Appraiser*. Do not add a second row for the same firm. |
| Saving a vendor says the name is already in the directory | It is, and that is the guard working. A job remembers its vendor by *name*, so two rows under one name make every later lookup pick between them at random. Edit the existing card instead. |
| The category suggestions go quiet once you type a semicolon | They shouldn't any more (fixed 2026-09-09). If they do, you are on a stale build — reload the page. Note the suggestion list carries what you already typed, so the whole line stays in the box. |
| A firm's second trade is on the wrong Build Estimate card | Cards are driven by the vendor's single *Category group*, not by each trade. File the firm under the group you engage it for most; its other trade appears on that card. Nothing is lost — it is still assignable and the Job Plan finds it by name. |
| An appraiser came back unticked as *Independent* | The directory lists that firm as also buying, or as an auction house or estate sale company. The app unticks it and says which trade. Tick it back if you have a reason; the note tells you what it saw. |
| A vendor isn't in the Job Plan picker | They aren't set to *Active* in the Vendor Directory. |
| Saving a new vendor sits on *Saving…* and the form never closes | The write is still in flight — the sheet's web app can take several seconds to wake up. **Do not press Save again.** The button is disabled while it works, and an add is never retried automatically, so a second press is what writes the vendor twice. If nothing has happened after 45 seconds the app re-enables the button, reloads the directory and tells you to check whether the vendor is already there. |
| The form says the vendor is already in the directory | It is, under that name, and one firm is **one row** — two rows under one name break every later lookup, because the name is what identifies a vendor. Close the form and press **Edit** on the existing card. Genuinely a different firm with the same name? Put something in the name that tells them apart. |
| A crew member isn't in the staffing dropdown | They aren't *Active* on the Contractors tab. |
| Fixed-price toggle is disabled | It's a probate or contested probate job. Those bill on logged hours. |
| The estimate won't save | No rooms are scored. Score at least one — and read the coverage badge before you settle for one. |
| "Every included room needs a volume and complexity score" — and it names rooms you deliberately left out | **Fixed 2026-09-10.** Save and Submit were counting out-of-scope rooms as unscored, and an ✕ room has its volume and complexity boxes greyed out, so there was no way to comply. If you see this now, the rooms it names are genuinely still *blank*, not ✕ — tap each one round to ✓ and score it, or round to ✕ to put it out of scope. |
| Red badge: "walkthrough looks incomplete" | Fewer bedrooms or baths accounted for than intake recorded. Either score them, or mark the ones we're not touching **✕ out of scope**. It won't block you; don't ignore it without knowing why. |
| You marked rooms out of scope and the badge still complains | Check they're on **✕** and not blank — the box cycles blank → ✓ → ✕, so one tap from blank only gets you to ✓. Blank reads as "not looked at yet". Also check the room is one intake actually counted: outbuildings don't count toward the main-house bed and bath numbers. |
| The badge says "2 scored, 5 out of scope" — is that a problem? | No, that's the confirmation. It's green. It's telling you the walkthrough is complete and reminding you five rooms are deliberately not ours, so nothing looks like an oversight later. |
| Red badge says "1 of 2 half baths" and you've ticked the only one you can find | There are five *Half Bath* rows, not one — Entry & Living, Kitchen & Utility, both bedroom floors, and *Pool / Cabana Half Bath* under Exterior & Auxiliary. Tick the one matching where the powder room is. If the house genuinely has fewer half baths than intake recorded, the intake figure is wrong — fix it there. |
| You ticked *Additional Bathroom(s)* for a powder room and the badge got worse | That row counts as a *full* bath. Untick it and use a *Half Bath* row instead. |
| The guest house has its own kitchen and bath — where are those rows? | Gone on purpose. Score the whole building on one row, sized by bedrooms. Its kitchen and bath are already in that weight. |
| Can't find the casita | It moved from Exterior & Auxiliary into Outbuildings & Guest Quarters. |
| Two pool house rows — which one? | Whether it has living quarters. Cabana or changing room → the Exterior row. Bedroom, kitchen or bath → the Outbuildings row. Never both; that bills it twice. |
| Room hours jumped since you last used the app | Fixed 2026-08-03. Rows used to show the packing step only — about a quarter of the work — so every room understated itself by 3.7×. Nothing got more expensive; the row is finally telling the truth. |
| A garage or patio costs far more than you expected | Exterior rooms add load *on top of* the square footage, and they are charged the full estate step set including documentation. A 2-car garage carries the same content weight as the kitchen. Known and queued for a pricing pass — flag it if it looks wrong on a live job. |
| The whole house is packed and setting nineteen sliders is absurd | Use the **How full is this house?** chips above the room grid. Press it when you walk in, before ticking anything — every room you tick then opens at that fullness. Then fix the odd room that does not fit. |
| You set the house to Packed and the rooms you ticked afterwards all opened at 3 | Fixed 2026-09-10 — the chip used to apply once, to whatever was ticked at that moment. On the current build it seeds every room you tick from then on. **Any estimate you priced that way is under-scored on the rooms you did later**, and because volume is averaged across the whole property that moves the price of the entire job. Reopen it and press the chip again. |
| You pressed a chip and one room did not change | Working as intended: you had typed that room's volume by hand, so it is yours and the chip leaves it alone. The line under the grid tells you how many it held back. To hand it back to the chip, untick the room and tick it again. |
| Where did the Third-Party Vendors card go? | Moved below Notable Collections and Vehicles & Watercraft on 2026-09-10. It is the collections and the vehicles that tell you whether this job needs an auction house or an appraiser, so the question is asked after you have walked the house rather than before. |
| A client asks whether the vendor prices on their estimate are guaranteed | They are not, and the document says so above both vendor tables. Each vendor sets its own final price and invoices the client directly, so they see the real bill. Havellin never marks up a vendor's invoice; on home-prep vendors our 30% is charged on what the vendors actually bill. |
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
| **There is no "Appraise" in the disposition chips** | There is not meant to be, and it is not missing. Appraise is a separate **⚑ Appraise** toggle just under the chips (new 2026-09-11), because an appraisal is not a destination — it is the step *before* one. Press the toggle *and* chip the disposition: the item goes to the appraisal worklist and still shows as heading for Auction. First appraise, then sell. |
| Something needs valuing but its category is Furniture or General/Household | That is exactly what the toggle is for. Art, jewellery, silver, antiques, rugs, collectibles, firearms, wine and instruments go to the worklist on their own; nothing else does. Press **⚑ Appraise** in the house, or tick **Needs Appraisal** on the row that evening. There was no way to do either before 2026-09-11. |
| You pressed ⚑ Appraise, then photographed the next object and it was not flagged | Working as intended. The toggle resets after every shot; the *disposition* chip deliberately does not. A whole shelf going to auction is one decision, but "send this one to a specialist" is about the single object in front of you. Press it again for each piece. |
| A collection you marked **Appraise** on the estimate is not on the Appraisal Worklist | If you imported it before 2026-09-11 the instruction was lost on the way in — it arrived as *Hold* with no appraisal flag, so unless the guessed category happened to be an intrinsic one it was reported nowhere. Open the row and tick **Needs Appraisal**. Fixed for anything imported since; it now arrives as *Not yet decided* with the flag set. |
| The release approval request says **NOT YET APPRAISED** on a line | That line is flagged for a specialist, no appraiser is linked and no waiver is recorded. **It is not a block** — the representative can properly decide to release it, and the line stays on the request. It is there so nobody initials away an object without knowing the estate will have no independent record of what it was worth. Either get it valued, link an appraiser, or **Waive** with a reason. |
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
| The attorney says their paralegal does the inventory — how do I quote it? | Build Estimate → **Documentation scope** (under the concierge hands-on share) → *None*. If they want our photographs and list but will value it themselves, *Capture only*. Do not pick a different service type — the voice, the written-authority gate and the disposition rules come from the service type and must stay. |
| The Documentation scope dropdown isn't there | The job is a home editing, home transition, home cleanout or home prep. Those price no documentation step, so there is nothing to scale and the control hides. If the owner has died the job is an Estate Settlement, and correcting the service type is what brings it back. |
| The estimate opened at *None* and I didn't set it | Intake did. *Who builds the inventory?* on the intake form seeds the estimate's scope. Change it on the estimate if the walkthrough says otherwise — the hint under the dropdown will name the disagreement — and correct the intake answer through Edit Client so the next person sees the same thing you do. |
| The client estimate still promises an itemised inventory with values after I set the scope to None | The scope is saved with the estimate. Re-open it on Build Estimate, confirm the dropdown reads *None*, and re-submit for approval — the client estimate and the agreement regenerate from the approved copy. |
| The service dropdown says *Home Editing* and *Home Transition* and I am looking for Downsizing | Renamed 2026-09-08. *Downsizing* is **Home Editing** — with no move to manage, we are editing what the couple takes to the next home — and *Downsizing & Move Management* is **Home Transition**. Same two jobs, same prices, same documents; only the names moved. A client saved under the old name shows the new one everywhere. |
| Clients you deleted are back on the list — or you added one and three old ones came with it | A device that still had the app open from before the deletion saved its whole list. Since 2026-09-08 the sheet refuses those ids and the device drops them itself — you will see *N clients deleted elsewhere — removed from this device too*. If they are genuinely back in the sheet, the Apps Script has not been redeployed since that date; tell Anthony. |
| A custody entry you logged is not there any more | If the job was worked from two devices before 2026-09-11, it was destroyed by the merge — an edit to any field on that row on the other device took the whole newer record and the log with it. Fixed now, but it cannot be recovered; re-enter what you know from the receipt. |
| You removed a custody event and it came back | Only possible on a build before 2026-09-11, or on a device that has not reloaded since. Removal marks the event rather than erasing it now, and the removal is what wins the merge, so it holds everywhere. Reload and check again before re-removing. |
| The printed job plan is just the phase headings | A build before 2026-09-11. The phases print closed, so you got the headings and nothing inside. Print it again on the current build — you do not need to open the phases first. |
| A tab in the sync spreadsheet is empty and you expect data in it | `Estimates` and `Hours` are dead tabs from an older build — nothing writes to them and nothing ever will. The real estimates are in `EstimateStore` and the real hours in `LogStore`, both as one long line of JSON in column B, which does not look like data at a glance. A tab that is missing altogether (no `LogStore` at all, say) means no hours have ever been logged; the tab is created by the first save. |
| A line on the release approval request is badged *SPECIFIC BEQUEST* or *DISPUTED* | Working as intended, and it is telling you something. The item is flagged on the manifest, the request names it above the table with its item number, and the representative decides — on counsel's advice — whether to initial it. Do not push for the signature and do not remove the flag. If they want it off the request, set its disposition to **Keep** or **Hold**. |
| The bulk bar says "2 of them are flagged specific bequest" after you set a disposition | You have just proposed selling or donating property the will leaves to a named person. Usually a mis-selection — check the item numbers it names and put those rows back to Keep or Hold. If it is deliberate, leave it: the request will name them again for the representative. |
| An approval request printed before 2026-09-11 said nothing about a bequest | Correct — it could not. Those two flags reached no printed document until that date, so a bequest could be listed for auction with nothing on the page saying so. Re-read any request issued before then against the manifest's *Specific Bequest* and *Disputed* columns, and re-issue if a flagged line was approved unknowingly. |
| The sheet shows more estimates than you have clients | Records for clients deleted before 2026-09-09 were left behind. Harmless — nothing reads or bills off an estimate whose client is gone. Anthony clears them with `previewOrphanRecords()` then `pruneOrphanRecordsConfirm()` in the Apps Script editor. From 2026-09-09 the sheet tidies itself, so this is a one-off. |
| "N clients deleted elsewhere — removed from this device too" | Not an error and not data loss. Somebody deleted those clients (in the app, or by clearing the sheet) while this device still held them, and this device has just caught up. If one of them was deleted by mistake, Anthony can allow it back from the Apps Script editor before you save again. |

---

Havellin Palm Beach · 515 N Flagler Drive, Suite 350, West Palm Beach, FL 33401 · Concierge Job Playbook · Internal use only · Not for distribution · v2026.08 · reconciled 2026-08-03 · For configuration, setup and system reference see the Operations Manual — the master document
