# HAVELLIN PALM BEACH

*Operations Manual · Internal Use Only · v2026*

---

## 1. Overview

> **This is the master document.** It is the system of record for how the app is set up and how it works — configuration, engine, taxonomy, rates, gates. Its companion, the **Concierge Job Playbook** (`concierge-guide.html`), is the walk-through-it-in-order extract for running one job from intake to final invoice with the app open; it covers a subset of what is here, and where the two disagree this document is right. They are reconciled against the app *together* — the version stamp at the foot of each says when. Plain-text copies for a phone or a printer: `MANUAL.md` and `CONCIERGE_GUIDE.md`, generated from these two files.

Browser-based app used by all Havellin staff. No installation. Data syncs across devices (iMac ↔ iPad) via Google Sheets. Documents and media auto-upload to Google Drive. Some approvals require a manager PIN — see §17 for exactly which. Client signatures and payments are recorded **by hand**: DocuSign, Stripe and QuickBooks are not built (§3).

> **How we describe ourselves on client documents — corrected 2026-08-03.** Havellin is **insured and bonded**. It is **NOT licensed**, and every client document said *"Licensed, Insured & Bonded"* until this correction — client estimate footer, invoice footer, both agreement footers, and the Terms line. **Do not put "licensed" back on any client-facing surface.** This is compliance, not wording: if it ever needs revisiting it needs Anthony, not a judgement call.
>
> *A third party's licence is a different thing and is correct where it appears* — **Licensed FFL** on the firearms disposition list (§5f), the vendor directory's **License / cert** field (§13), and "licensed firearms transfer" in the collections cost note. Those describe vendors, not us.
>
> The tagline on all four client documents is **"Havellin handles the work no family should face alone."** It replaced *Guiding Families Through Life's Transitions* on 2026-08-03.

**Navigation tabs (in order):** Win / Loss · Client Dashboard · Client Intake · Build Estimate · Client Estimate · Agreement · Job Plan · Inventory · Invoices · Contractors · Vendors · Referral Partners

> The app opens on the **Client Dashboard** even though Win / Loss is the first tab.

Interface notes: the header + navigation bar stay pinned to the top while you scroll; dialogs (e.g. Settings) scroll internally so their buttons are always reachable; and reference dropdowns (categories, dispositions, types, roles) are alphabetized — scale/pipeline lists (Condition, Priority, statuses, service tiers, Year) keep their meaningful order.

**Phone & field use.** Every tab works on a phone — the nav becomes a scrolling strip, dialogs open as bottom sheets, and grids stack. The three directories (Contractors, Vendors, Referral Partners) are built for standing in a driveway: search, tap-to-call/text/email, and a **Quick edit** for contact details. **Build Estimate** is the deliberate exception — its room tables are desk/iPad work, and they scroll sideways rather than reflow.

> **What Build Estimate hides on a phone, and the rule behind it.** Field mode (`?field=1`) keeps everything you can only learn by *being in the house* — room scoring, difficult access, multiple heirs, **premium estate**, collections, vehicles, materials, prep. It hides the commercial decisions and the arithmetic: crew sizing, the timeline planner, discount, expedited delivery, fixed price, and every calculated total. Those wait for the desk. The cut is *observation vs. commercial decision*, not "does it change the price" — every adjustment changes the price. Premium estate sat on the wrong side of that until 2026-08-03: the agreement (§3.3) defines it as a property containing fine art, antiques, collectibles or high-value contents, which is a judgment you make standing in the room and cannot make from a desk. Hiding it also achieved nothing, since the same flag is set on the Client Intake tab, which is itself a field tab. Nothing is ever *removed* on a phone — only hidden. The estimate computes and saves in full either way, so a walkthrough captured on a phone is complete; you are only deferring the pricing decisions.

## 2. Initial Setup (one time per device)

Open **Settings** (gear icon) and enter:

| Field | Value |
| --- | --- |
| Google Sheets Sync — Apps Script URL | The jobs / estimates web-app `/exec` URL |
| Google Drive — Jobs Folder ID | `1X2bmAAjbruL5lLip-UgwwmPNo7y_Ubrb` |
| Vendor Directory — Apps Script URL | The Vendor Directory web-app `/exec` URL (separate sheet) |
| Referral Partners — Apps Script URL | The Referral Partners web-app `/exec` URL (separate sheet) |
| Stripe Publishable Key | `pk_live_...` (configure when live) |

Two further groups in Settings are **pricing policy**, not device setup — they change what jobs cost and who can see the margin. Set them once, deliberately:

| Setting | Default | What it does |
| --- | --- | --- |
| **Concierge production rate** (α) | 50% | The share of the concierge's on-site hours spent physically handling contents rather than directing. Drives hours, crew size, and duration — see Section 5i. Dial down on trophy estates where the concierge mostly directs; up on straightforward downsizings. |
| **Labour cost rates** — founder concierge / contractor concierge / contractor PS Standard / contractor PS Senior | $100 · $60 · $30 · $35 | What we *pay*. Feeds the margin panel only. Never billed, never shown to a client. See Section 16. |

> Changing the concierge production rate applies to **new** estimates only. A saved estimate is pinned to the rate it was priced under, so reopening an old quote on a device with a different setting never silently reprices it — the crew badge says so when the two differ.

> Each directory (Vendors, Referral Partners) is its own Google Sheet with its own deployed Apps Script, kept walled off from job/estimate data. When you deploy or re-deploy a script, use **Who has access: Anyone** and paste the fresh `/exec` URL. If a save shows a login/HTML-page error, that access setting or a stale URL is the cause.

> **The unsaved-changes chip, and what it is allowed to claim.** A write that fails is queued, not lost, and a red chip sits bottom-left until it lands. **Tap it** — it opens and names the write, the sheet it was bound for, and the server's own error, with a **Try again** button. Only one wording is a claim about the deployment: *Apps Script needs redeploying* appears when the server answered `Unknown type/action`, which is proof the deployed script predates the app. A crash inside the script reads *the Apps Script returned an error* instead — held rather than retried, but no redeploy is prescribed, because a live bug on a current deployment throws exactly the same shape. Before 2026-09-01 both said "needs redeploying", which sent people to redeploy scripts nobody had touched.

## 2a. Quick Links

> **Internal — do not print or forward outside the team.** These open the underlying Google files; access is still gated by your Google sign-in, so a link alone grants nothing to someone without permission.

| Opens | Paste into your browser |
| --- | --- |
| Google Drive — Havellin Jobs (all client folders) | `https://drive.google.com/drive/folders/1X2bmAAjbruL5lLip-UgwwmPNo7y_Ubrb` |
| Jobs & estimates data — Google Sheet (manager) | `https://docs.google.com/spreadsheets/d/16Z3yiRYbhYLsia0aG4v5znWo_O2eDRnB0dcldECjAJM/edit` |
| Vendor Directory — Google Sheet | *add link* |
| Referral Partners — Google Sheet | *add link* |

To open the **Apps Script** behind any of these sheets (to view, edit, or re-deploy the code): open the sheet, then **Extensions → Apps Script**. That's how you reach the main sync script (`main-sync.gs` + `saveInventory.gs`) and each directory's script.

> The Apps Script `/exec` web-app URLs are deliberately **not** listed here — they're live API endpoints (effectively keys) and pasting one in a browser just returns raw data, not a page. They live only in the app's **Settings**; keep them there, not in a printable doc.

## 3. End-to-End Job Workflow

```
Intake → Estimate → Manager Approval → Send to Client → Client Accepts → Mark Won
→ Approve & Send Agreement → Staff the Job Team → Mark Agreement Signed → Record Deposit
→ Job Active → Job Plan / Document Property → Log Hours → Invoices → Complete
```

> **Three points in this flow are hard gates — the app refuses, it does not merely warn.**
>
> - **Staffing requires the job to be marked Won.** Never commit a specialist to a job the client hasn't accepted — holding someone for these dates is turning down other work.
> - **Logging hours requires the deposit.** This is the one gate with no override anywhere, and that is only safe *because* the deposit is never waived.
> - **The Job Plan's staffing and hours section stays shut until Won.** Building a plan for a job you haven't won is wasted effort.

> **Not yet built:** DocuSign, Stripe auto-charge, and QuickBooks reconciliation. Earlier versions of this manual described those as automatic — they are not. Every step above is recorded by hand today: you mark the agreement sent, you mark it signed when it comes back, and you record the deposit when it arrives. When those integrations land they will populate the same records; nothing about the sequence changes.

**Staffing sits in the waiting period on purpose.** Once the agreement is out for signature there's usually a few days of dead time — that's when you confirm who is actually available and name the crew on the Job Plan. **Save & Confirm Job Team** is what unlocks hours logging, so a job can't reach its first working day with an unnamed crew (Section 11).

**Home Prep for Sale** follows a streamlined variant of this flow — no room scoring, no labor/hours, no crew. See Section 6.

## 4. New Client Intake

All fields marked * are required. Job ID is auto-generated (`HVL-YYMM-XXXX`). Google Drive folders are created automatically on save — no manual step needed.

> **Assigned Transition Concierge is optional at intake.** Intake often runs a fortnight or more ahead of the work, and nobody knows who is free that far out. The field is still there if you already know — but the concierge is properly staffed on the **Job Plan** along with the rest of the crew, once the agreement is out for signature (Section 11).

**Service Types:** Downsizing · Downsizing & Move Management · Home Cleanout · Estate Settlement · Probate Estate Settlement · Contested Probate Estate Settlement · **Home Prep for Sale**.

**Property Types:** Apartment · Town Home · Patio Home · Single Family Home · Estate. (Property type is a label; square footage drives sizing.)

**Home details:** Square footage, **Bedrooms**, **Full baths**, and **Half baths** are captured separately (so "5 baths" is never ambiguous), plus years in home and approximate property value.

**Estate / Probate** jobs require an authorized representative (executor, POA, administrator) — name, role, phone, email. **Probate** additionally requires case number and attorney details.

> **The service type is the living/deceased decision, and there is nothing else to set.** *Home Cleanout* is a **living** owner clearing their own property — a landlord, a relocation, a hoarding clear-up. A house whose owner has **died** is an **Estate Settlement**. They are different engagements and they price differently (the estate services carry a documentation step and heavier disposition work), so picking the wrong one mis-prices the job as well as mis-addressing every document. **If a client document has the wrong voice, correct the service type** — there is no override, and the form deliberately never asks the question twice.

**Documentation level** — choose *Auto*, *Standard*, or *Formal — court & attorney grade*. Auto resolves by service type (Contested Probate = Formal, everything else Standard). Formal turns on the item-appraisal guardrails and makes chain-of-custody tracking mandatory. This is a *documentation* decision, kept separate from the Premium-estate *rate* toggle (§5c) — a premium job is not automatically a court-grade one, and vice-versa.

**Referral source:** Intake records how the job came in. Professional referral types (attorney, realtor, trust officer, etc.) link to a specific **Referral Partner** from that directory, so referrals are attributed on the partner leaderboard. Personal sources (family, friend, existing client) use a free-text "Referred by" name instead.

> **The partner doesn't have to be in the directory yet — *+ New* beside the picker adds them without leaving intake.** Name, firm, phone, email; it writes to the Referral Partners sheet through the same `addPartner` path the directory tab uses, then selects them on the form. A referral arrives from someone new more often than not, and leaving intake to go and add them first is precisely how the attribution gets dropped. The rest of the prospecting detail (partner type, rating, contact history) is desk work on the Referral Partners tab afterwards — §14.

Drive folder structure created automatically per job:

```
Estate Inventory · Walkthrough Notes · Estimate · Agreement · Change Orders · Invoice · Job Log
```

Room photos, item photos, collection photos/appraisals, and the inventory workbook all live in one **Estate Inventory** subfolder — the single package you share with counsel (§10a). Financial folders (Estimate, Agreement, Change Orders, Invoice) stay private.

## 5. Estimate (Labor-Based Services)

**Tab: Build Estimate** → select job from dropdown. This section covers the labor-based services (Downsizing, Cleanout, Estate Settlement, Probate). Home Prep for Sale uses the fee-only flow in Section 6.

**How the tab is laid out** (rebuilt 2026-08-02, so a screenshot older than that will not match):

| Band | Holds |
| --- | --- |
| **Top card, two columns** | *Job* on the left — Job Details picker, service type, target start date, estimate prepared by, the second-concierge flag, the timeline badge. *Crew* on the right — crew size, the *client needs it sooner* planner, and the Adjustments toggles (difficult access, multiple heirs, premium estate). |
| **Build column** | Third-Party Vendors, then the Room-by-Room Assessment (sections run **two across** the full page width), then Notable Collections beside Vehicles & Watercraft, then Moving Materials. *Changed 2026-08-03:* the separate Home Prep card that used to sit beside Moving Materials is gone — prep vendors are entered in the *Property Preparation* card at the top with every other vendor (§5e). |
| **Bottom** | Estimate Summary, then Pricing Reference Check beside the three price levers (discount · rush · fixed price), then Reset / Save. |

> **The price levers sit under the totals they move, and that is deliberate.** Discount, expedite and fixed price are read against the number, not against the scope — they spent a spell up beside Adjustments and were three scrolls away from anything they changed. Scope decisions live at the top; price decisions live at the bottom next to the price.

> **The Estimate Summary on this tab is condensed.** The hours breakdown, per-role fee lines, blended-rate bar and the internal margin panel are hidden here — all of that reappears on the **Client Estimate** document (§7), which is what those numbers are actually for. Nothing was deleted: the app still calculates every one of them on each recalculation, so the client estimate and the invoices are unchanged. See §16 for what this means for the margin panel specifically.

### 5a. Walkthrough Notes & Voice

During the site visit, use the **📝** (notes) and **🎙** (voice-to-text) buttons in each room row. Voice transcribes in real time into the notes field. Hit **Save Notes** — the note saves with the estimate and uploads as a `.txt` file to the job's **Walkthrough Notes** Drive folder automatically.

**Private Walkthrough Notes** is a separate box, sitting as the last cell of the room grid with its own 🎙 button. It is *internal only* — never shown to the client, never on the estimate document, never uploaded to a shared folder. It is for what you would not say in front of the family: access problems, hoarding, who is actually making the decision, anything that changes how the job runs. It saves with the estimate (`est.privateNote`) and reloads with it. The intended use is dictating in the car on the way out.

> 📷 Photos are NOT captured during the estimate stage. Photography happens only after job activation.

### 5b. Room Scoring

Check each room to include it. Set Volume and Complexity on a 1–5 scale:

| Score | Volume | Complexity |
| --- | --- | --- |
| 1 | Nearly empty | Simple / standard items |
| 3 | Moderately filled | Mix of standard and care items |
| 5 | Completely full | High-value / fragile / specialty handling |

Check **Special Items** if the room contains artwork, antiques, or items requiring specialty care. Hours and a working-day timeline generate automatically as you score. **A room row now shows that room's share of the whole job** — sorting, documentation, packing and haul-out together — so the rows reconcile to the fee lines once the walkthrough is complete. How the totals become billed concierge and specialist hours is Section 5i.

> **Corrected 2026-08-03 — this section used to say a room row was "the packing step only", and it was.** Packing is 27% of the hands-on pool on an estate job, so every row understated its own room by **3.7×**: a 2-car garage displayed *2.4 PS* and booked **9.1 person-hours**. Nothing on the screen let you feel a quote building as you ticked rooms, and a 3,500 sqft house priced at $27,000 with nobody able to see where it came from. The rows carry the full pool now and there is no residual to explain. **The old advice to mentally multiply a room row is obsolete — the number on screen is the number.**

> **Rooms are still not comparable between service types.** The same closet costs different hours on a downsizing job than on a probate one, because the pool coefficients differ per service — Estate Settlement runs **2.2×** the hands-on hours of a Downsizing of the same house, and Contested Probate **1.5×** an Estate Settlement. That is a deliberate policy ratio, not a scoring difference. Compare a room to other rooms on the same job, never across jobs of different types.

> **"How full is this house?" — one press instead of nineteen (NEW 2026-08-03).** A chip row above the room grid: **Seasonal · Light · Normal · Full · Packed**. It sets the starting volume for every room *in scope* in one go. *Normal* is the behaviour that was there before, so ignoring the row changes nothing.
>
> Each preset is a **shift on each room's own default, never a blanket value** — that part is load-bearing. A foyer and a powder room open at 1 because they are inherently lighter whatever the house is like, so setting everything to 5 would claim a powder room is as full as a garage. On *Packed* the foyer is still below the living room. Pressing the same chip twice lands on the same numbers, and pressing a different one re-bases from the defaults rather than compounding; any per-room adjustment you make afterwards stands until another chip is pressed. It exists because telling the app a house was packed used to mean moving nineteen sliders by hand, so nobody did it and every house priced as average.
>
> **It does not touch complexity**, and wiring "premium estate" to complexity was considered and rejected: complexity moves a job about **3.9%** while the premium toggle moves it **49.6%**, so you would never notice it fire — and it would collapse two separate questions, *how careful* and *how expensive*, into one.

**Where the rest of the hours are stated (changed 2026-08-03).** There used to be a *Project coordination & logistics* strip under the room grid carrying the residual. It is gone: it named the largest block of work on an estate job — mostly documentation and triage — as though it were administrative overhead, and it gave a number without ever saying what was in it. The same hours are now itemized by work step directly under the **Transition Concierge fee** and **Property Specialist fee** rows in the Estimate Summary, beside the figures they explain. The concierge line splits first into *on site with the crew* and *off site*, then names the off-site drivers. Both lines are scaled so the parts add up to the hours printed on the same row.

The two label sets are deliberately different. A work step carries two coefficients — off-site coordination and the hands-on pool — and they are not the same work done by two people. So the specialist line says *Packing & handling* while the concierge line says *Packing logistics & materials*: the concierge is ordering crates and scheduling the delivery, not packing. Don't collapse the two lists.

**A ticked room does not start at 3/3 everywhere.** Most rooms open at the neutral 3 — a normally furnished Palm Beach home. Inherently light rooms open at the 1 floor: entryway/foyer, half bath, bathrooms 2–4, additional bathrooms, laundry, mudroom, mechanical/utility. Primary baths open at 2. The starting score is a starting point in every case — **score what you are looking at**.

Room sections launch **collapsed** so the estimate opens compact, and run **two across** the page — open each section as you walk that part of the house. Use *Expand all / Collapse all / Hide empty* at the top of the assessment; each section header shows a live in-scope count. Reopening a scored estimate auto-reveals the sections that have rooms in scope.

> **Volume and complexity are property-wide, not per-room — which is why a half-finished walkthrough misprices rather than under-counts.** The scores you enter are averaged across the rooms you scored, and that average is then applied to the load derived from the *whole* square footage. Score one foyer at 1/1 on a 10,000 sqft estate and the app prices all 10,000 sqft as though the entire house looks like that foyer — on a real job that took the quote from about $44,900 to $24,100. Half a walkthrough is not half a price; it is a wrong price.

**Room coverage flag.** Under the room grid the app compares the bedrooms and baths *recorded at intake* against the bedrooms and baths you have actually scored, and says so:

| Badge | Means |
| --- | --- |
| Green — *Room coverage matches intake* | Every bedroom and bath on record has been scored. Nothing to do. |
| Amber — *Walkthrough looks incomplete* | Names the shortfall, e.g. "scored **2 of 5** bedrooms, **1 of 4** full baths". Finish the walkthrough, or knowingly accept that the unscored rooms are being priced off the ones you did score. |

It is a *flag, not a gate* — a concierge mid-walkthrough knows the estimate is incomplete and does not need to be stopped. Saving with *zero* rooms is already refused, which is the case worth blocking. The check goes quiet if intake never captured bed/bath counts, so fill those in at intake (§4) or this check has nothing to compare against.

> **The badge counts grid rows, so intake can only ask for what the grid can reach.** Each bedroom and bath is counted by matching the room's name against the rows you scored, which means the highest number reachable for a given kind is the number of *rows carrying that name* — not the number of rooms the house has. Reachable today: **8 bedrooms, 14 full baths, 5 half baths** — all *main-house* rows, counted across the First Floor and Second Floor sections. Until 2026-08-03 *Half Bath* existed in exactly one section, so the half-bath count was capped at **1** and any property with two powder rooms stayed amber no matter how completely it was walked. If a count is ever raised at intake beyond what the grid can reach, the badge becomes unclearable and stops meaning anything — add the rows in the same change.

**Where the half baths are.** *Half Bath* now appears in **Entry & Living** (the powder room off the foyer), **Kitchen & Utility**, and both **First Floor** and **Second Floor Bedrooms & Bathrooms**. A fifth, **Pool / Cabana Half Bath**, sits in **Exterior & Auxiliary** — it is an exterior room, so it adds load on top of the under-air baseline rather than modulating it (§5i), which is right for a cabana bath that is not inside the square footage. All five open at 1/1 and count toward the intake half-bath tally.

*Additional Bathroom(s)* is still classified as a **full** bath, and it is a plural row counted once — so a house with several surplus baths can still read short. Use the dedicated half-bath rows for powder rooms rather than pressing *Additional Bathroom(s)* into service, which moves the full-bath count up while leaving the half-bath count where it was.

> **Intake's bed and bath counts are the MAIN HOUSE, and outbuildings no longer count toward them (changed 2026-08-03).** A guest house bedroom used to satisfy the intake figure, so scoring four main bedrooms plus a guest house and a pool house against an intake of six turned the badge *green* with two main bedrooms never walked — a false clear on the one check that catches a half-scored house. Outbuilding rows are off both coverage lists. Enter main-house counts at intake; capture the guest quarters on the walkthrough (§5b, Outbuildings & Guest Quarters). Putting a casita's bedroom into the intake figure now makes the badge unclearable, because the grid has no outbuilding bedroom row to score against it.

#### Outbuildings & guest quarters — one row per building

Detached buildings are scored as **whole buildings sized by bedroom count**, not room by room. Until 2026-08-03 this section carried eleven rows (each building split into bedroom / living / kitchen / bath), which is a level of detail nobody uses on a detached structure — you score a guest house 3/3 as a whole and move on. The rows now are:

| Row | Weight | Replaces |
| --- | --- | --- |
| Casita — bedroom & bath | 2.5 | the old *Casita* row, moved here out of Exterior & Auxiliary |
| Pool House — with living quarters | 4.5 | Pool House living/bedroom + kitchen/bar + bath |
| Guest House — 1 / 2 / 3 bedroom | 7.0 / 9.0 / 11.0 | Guest House bedroom + living + kitchen/bar + bath, then +2.0 a bedroom |
| Caretaker's Cottage — 1 / 2 / 3 bedroom | 5.5 / 7.5 / 9.5 | Cottage bedroom + living/kitchen + bath, then +2.0 a bedroom |
| Additional Outbuilding Room | 2.0 | unchanged — still a free-text row |

Each weight is the **sum of the sub-rooms it replaces**, so a fully-ticked building prices exactly as it did before; only the number of clicks changed. Every additional bedroom adds 2.0, the old bedroom weight — keep that step if a size is ever added.

> **The pool house was in the list twice, and ticking both double-charged it.** A bare *Pool House* row sat in Exterior & Auxiliary (2.7) while three *Pool House — …* sub-rows sat here (4.5 together). They are the same building — the split was meant to be cabana versus one with living quarters, but nothing on screen said so. The Exterior row is now **Pool House / Cabana — no living quarters** and this section has **Pool House — with living quarters**. Pick one. On a mid-size estate the old double-tick was worth about 7 specialist hours nobody would have questioned.

### 5c. Job Settings

- **Premium Estate** — TC $185/hr, PS $125/hr (vs. standard $150/$100). Also adds a flat 25 hrs of specialty coordination (auction house, appraisers, wine/art logistics).
- **Crew** — two dropdowns side by side in the **Schedule & Crew** card: *Concierges* (1–2) and *Specialists* (2–6). Both track the engine's recommendation up and down until you set one by hand; from that moment the app leaves it alone and the badge underneath reports what your choice costs.
  > **A crew below the recommendation is now honoured, and priced.** It used to be an undisclosed floor — picking 4 against a recommended 6 changed nothing at all, and the badge then reported the 6 it had actually used against a dropdown still reading 4. Two numbers for one crew, on screen together. A smaller crew is a legitimate answer; it just takes longer, and because the concierge is on site every one of those days the fee goes *up*. The badge names the trade in days: *"2 PS assigned, 6 recommended — the job runs 23 working days instead of 9."*
  > **The estimate says how many specialists, never which.** This was six tick boxes, and before that six dropdowns naming a person or a rate tier per slot — a question nobody can answer three weeks before the job, and the wrong question to ask at estimate time. Naming people happens on the **Job Plan** once the job is Won (§11), where the roster seeds from this count and every row asks for a name. Costing at estimate stage assumes the standard contractor rate for every specialist; the margin firms up as the real people are named.
  > **Crew size moves the price.** Under the working-supervisor model a bigger crew finishes sooner, so the concierge is on site for fewer hours — which makes the estimate *lower*, not higher. That is correct, but it means a crew left over from a larger job will quietly discount this one, so the app flags any crew above the recommendation. Do not carry a crew size over between estimates. See Section 5i.
- **Client needs it sooner?** — pick the **date** the client asked for. The **timeline planner** underneath answers it directly: what this job delivers as staffed, and what crew reaches that date. Full detail in §5i.
- **Rush order** now lives in this card too, directly under the planner — it is a timing decision, and it was being made three scrolls below the crew size and completion date it depends on. Its effect on the price still appears on the Estimate Summary at the bottom, where a one-line reminder points back up here.
- **Concierges** is a count, not a name. The app raises it to 2 when the daily load passes the cap; you can set it yourself. Unlike specialists it changes *neither the fee nor the duration* — see the note at the end of §5i — so setting it to 1 against a recommendation of 2 changes no number at all and the hint says so: somebody works a 12-hour day.
- **Documentation scope** (estate services only, under the concierge hands-on share; new 2026-09-04) — *Full*, *Capture only*, or *None*. Whether the attorney's office keeps the inventory in-house is decided job by job, so this is a per-estimate control pinned on the saved estimate, like the production rate — never a Settings value and never a service type.
  > **The paperwork is a third to two-fifths of an estate ticket.** On a 3,500 sqft home at Normal the `document` step is 34% of an Estate Settlement, 39% of Probate and 41% of Contested. Until this control existed it was hard-wired to the service type. Stripping it prices an Estate Settlement within a few hundred dollars of a Home Cleanout on the same house — which is the honest floor if counsel keeps the inventory — while the estate voice, the written-authority gate and the heavier disposition rules all stay, because those come from the service type, not from the scope.
  > **What each setting prices.** *Full* is the original: Havellin catalogues every item of consequence with an estimated value and coordinates the appraisers. *Capture only* is Havellin photographing, describing and locating each item and handing the *list* to counsel, whose people value it and arrange any appraisal — half the documentation work and none of the appraiser coordination (the 50% is a starting coefficient, to be tuned on the first real job). *None* removes the step entirely. On a service with no documentation step (downsizing, home cleanout, prep) the control is hidden and the field is ignored. The Estimate Summary's hours breakdown relabels the halved step *Photograph & list (counsel values)*.
  > **The client estimate and the estate agreement both read the pin, not the catalogue.** Stage 2 becomes *Sorting, Photography & Listing* or *Sorting & Set-Aside*, the records list drops the valued inventory and the appraisals, and the agreement's scope paragraph, §5.2 compliance list, midpoint-payment trigger and appraisal row all follow (§7, §8). An estimate saved before 2026-09-04 carries no scope and is read as *Full* — that is what it was priced at.
- **Difficult access** (stairs, no elevator) — **+15% to the hands-on work pool only**. It makes the physical work take longer, which lengthens the job, which lengthens concierge presence automatically. Lifting the concierge line as well would double-count it.
- **Multiple heirs / decision-makers** — **+20% to off-site coordination only**. More calls and sign-offs, not more boxes. Baked into contested-probate rates already, so the toggle greys out on those jobs.
  > **It is a full 20%, but of off-site coordination — not of total concierge hours.** Total TC is on-site presence *plus* off-site coordination, and the uplift touches only the second, so it lands as roughly **10% on the total concierge line**. This gets reported as a bug about once a rebuild; the arithmetic has always been right and the toggle's own label was the thing that was wrong. It now names the pool it lifts.
- **Rush order** — adds a flat **20% expedited-delivery premium** to the Havellin services total, shown to the client as its own line. It is a premium on the total, deliberately *not* a markup on the TC/PS hourly rates: rates outside NASMM norms read badly to a client comparing quotes, and a named line is clearer and easier to defend. It is also literally what they're buying — a second concierge and a larger crew working in parallel to compress the calendar. Applied *after* the Preferred Client Discount, so the discount is never computed on the premium. Vendor costs are excluded (pass-through at cost doesn't get more expensive because we moved faster). Works on both hourly and fixed-price quotes.
- **Quote as a fixed price** — every service bills **time-and-materials by default**; the concierge may switch an individual estimate to a firm flat fee. The amount prefills from the suggested fee (hourly basis + a flat **20% contingency**) and is fully editable. **Not available on Probate or Contested Probate** — the toggle is disabled there, because those bill on actual logged hours for Personal-Representative and court defensibility. Estate Settlement is a private engagement with a family or trustee, so a flat quote *is* available on it.
  > **The prefilled fee tracks the estimate until you type one.** It used to prefill once and then freeze while crew size, room scores, adjustments, the premium toggle, the discount and rush all kept moving the basis underneath it — a real estimate showed **$109,613 against a $77,620 services total**, a 41% markup where the contingency is 20%, because the toggle had been flipped when the total was around $91,300 and the crew changed afterwards. That figure goes on the client estimate, the agreement and every invoice, so a stale prefill is money. Type a number and it stops tracking — that is your price — but if the estimate then moves away from it the panel says by how much and offers the current suggestion in one click. Reopening a saved estimate always holds its agreed fee.
  > The contingency is **20% on every service you can actually quote fixed**. Estate Settlement was 25% and came down to match: 25% on top of an already-buffered hourly estimate reads as padding to a client comparing quotes. Probate keeps 25% and contested probate 35%, and that is not an inconsistency — those two are time-and-materials only, so their buffer is never quoted to anyone. It exists solely as the internal *"what would a flat fee have run"* reference line the panel shows on this tab, where a wider band on the riskiest work is the honest figure.
- **Preferred Client Discount** — percentage off Havellin labor fees only, **capped at 15%**. The same cap applies to *Offer Discount* on the Client Estimate tab (§7), which is the route to use once the estimate has already gone out.
- **Moving Materials Package** — None, or an Estate tier (Basic $500 · Standard $750 · Premium $1,500) or Downsizing tier (Basic $200 · Standard $350 · Premium $550)

### 5d. Third-Party Vendors & Moving Materials

Add third-party vendors with estimated costs. Vendor costs are estimates only — actual invoices are billed directly to the client at cost. **Havellin adds no fee to them.**

> **No coordination fee on third-party vendors, as of 2026-08-02.** Vendors are billed to the client directly at cost and Havellin adds nothing on top. The 15% Service Management Fee was removed because the concierge time spent sourcing, quoting, scheduling and supervising a vendor is *already billed hourly* — the engine bills off-site coordination as concierge hours — so the fee was a second charge for the same work, and on probate it was a percentage markup on a third-party invoice in front of a court that reviews the expenses. **Standalone Home Prep is the exception and is unchanged:** it bills no hours at all, so its **30% GC fee** is the entire revenue for that engagement. The rule: a coordination fee applies only where the coordination is not already billed by the hour.

> **Each vendor line books concierge coordination hours — new 2026-08-03, and it changes the price.** When the 15% came off, the justification given to the client (on the tab, on the estimate and in the terms) was that coordination bills hourly instead. It did not. The engine's off-site coordination is driven by service type and square footage and had no idea how many vendors a job ran, so five vendors added **no fee and no hours** — the sentence defending the removal was true of nothing. Each line now books that time. The card footer shows the running total per group, and the Estimate Summary carries a *Third-party vendor coordination* line.

### 5d-i. The touch model — where every coordination number comes from

Coordination hours are not a lookup table of judgement calls. There is **one rule**, and it covers third-party vendors and Home Prep trades alike:

```
hours = touches × 0.5
```

A **touch** is one discrete interaction with that vendor that costs concierge time — a call to place, a quote to chase, an access arrangement to make, a piece of work to go and look at, a settlement statement to reconcile. Count them, halve the count, that is the number. So an estate sale company is **8 touches** (call · walkthrough · contract · pricing schedule · sale-day staffing · mid-sale check · breakdown · settlement) = 4.0 hrs, and a mover is **6** (survey · quote · certificate of insurance · pack day · load day · delivery) = 3.0 hrs.

| Touches | Hours | Categories |
| --- | --- | --- |
| 1 | 0.5 | Document Shredding · Appliance Repair · HVAC · Pest Inspection / Treatment · Pool & Spa Service · Pressure Washing |
| 2 | 1.0 | Donation Pickup · Junk Removal & Dumpster · Carpet Cleaning · Deep Cleaning · Handyman · Landscaper · Window Cleaning · *anything unrecognised in Disposal, Logistics or Property Preparation* |
| 3 | 1.5 | Painting · Floor Refinishing · *Professional Services group default* |
| 4 | 2.0 | General Contractor · Home Staging · Online Auction House · Firearms Dealer (FFL) · *Asset Liquidation group default (appraisers, buyers)* |
| 6 | 3.0 | Auction House · *Moving & Logistics group default* |
| 8 | 4.0 | Estate Sale Company |

> **Why a rule rather than a list.** This started as two separate hour tables — one for prep trades, one for vendors — hand-tuned at different times, which is exactly how two lists that mean the same thing drift apart. Every value in both was a multiple of half an hour, so they converted to touch counts exactly: the rule was already implicit in the numbers, nobody had written it down. Three things follow. A brand-new directory category gets a number in **ten seconds** by counting on your fingers. The counts are arguable out loud — if you think a mover is really eight touches, say so and it changes. And *"4 hours because an estate sale is 8 separate interactions"* is a sentence you can put in front of a client or a probate judge; *"4 hours because that felt about right"* is not.

> **Coordination only — never attendance. Do not count a day on site as a touch.** These hours are sourcing, quotes, scheduling, the confirming calls and checking the invoice. Standing next to the appraiser is priced separately and already: a collection dispositioned to an appraiser or a dealer books real on-site presence through the disposition hours (§5f). An estate sale company can be both a vendor line here and a collection disposition on the same job, so counting attendance in both places would bill it twice.

> **These do not scale with what the vendor charges, and that is deliberate.** Tying hours to the vendor's invoice is the obvious next idea and it is the one to refuse. Havellin's own sorting, contents list and photography *shrink* the appraiser's bill — so hours pegged to that bill would **fall as Havellin did more work**, which is the precise perverse incentive that took the 15% to zero in the first place. It would also put a percentage of third-party spend back onto court-reviewed probate expenses wearing a different name. If size sensitivity is ever wanted, the honest input is property square footage on property-work trades: already in the engine, and our own effort cannot game it downward.

**Vendors are picked from six Category Group cards**, three across, at the top of the build column. Each card is a category dropdown plus an *Est cost* box and a **+**:

| Card | Source of its list | Where the line lands |
| --- | --- | --- |
| Asset Liquidation & Valuation | The Vendor Directory — every category filed under that Category Group, alphabetized (§13a). | Third-party vendor list, at cost. |
| Disposal & Waste Management | Same, that group. | Third-party vendor list, at cost. |
| Moving & Logistics | Same, that group. | Third-party vendor list, at cost. |
| Professional Services | Same, that group. | Third-party vendor list, at cost. |
| Property Preparation | Same — the Property Preparation group. | **The Home Prep list**, not the vendor list. That is deliberate: the Home Prep list is what a standalone prep engagement's 30% GC fee is computed from, and routing a painter through the vendor list would silently drop that fee. This card is the **only** way to add prep, as of 2026-08-03 (§5e), and its lines each carry a **scope note** — what to tell that trade when you ring for a quote. |
| End-of-Job Logistics | Not a directory group — the five end-of-job slots the Job Plan asks for: donation organization, junk removal / hauling, dumpster rental, move-out / final cleaning, document shredding. | Third-party vendor list. Anything ticked here **drops out of the Job Plan's own logistics list**, so it is asked once, not twice (§11). |

> **These lists are the directory and nothing else.** The twelve hand-written umbrella labels are gone — the old single "Add vendor…" dropdown mixed those labels with whatever directory categories they did not already cover, so it was half taxonomy and half leftovers and the real category names were mostly hidden behind an umbrella. A category added to the Vendors sheet appears here on the next directory load, with no app change. If no card has any options, the Vendor Directory URL is missing from ⚙ Settings and the cards say so.

> **You do not pick individual vendors at this stage, by design.** Finding an appraiser who is actually free that week is office work at job kickoff, not walkthrough work. The estimate says what the job *needs*; the **Job Plan** says who is doing it (§11).

### 5e. Home Prep for Sale (as an add-on)

To add show-ready prep to a labor-based job, add the trades through the **Property Preparation** card in Third-Party Vendors. That is all there is to it — adding a line *is* including prep in the estimate. Each line takes an estimated cost and a **scope note** (what to tell that trade when you call for a quote); the notes carry through to the Job Plan sourcing. When Home Prep is the *only* service, use the standalone flow in Section 6 instead.

> **One entry point, as of 2026-08-03 — the separate Home Prep card and its "Include in estimate" tick box are gone.** There used to be two: the *Property Preparation* card at the top and a *Home Prep for Sale* card near Moving Materials. They wrote to the **same list**, so one list had two front doors that disagreed. The card never touched the tick box, and everything downstream read the tick box — so a prep vendor added on a walkthrough sat on screen with a dollar figure against it and was worth **zero** on the client estimate, in the Job Plan sourcing and on every invoice. The two dropdowns also spoke different languages (*Full Interior Paint* in one, *Painting* in the other), so a line entered in one could not be shown by the other. If you have an estimate saved before this date with prep lines that never priced, **reopen it** — those lines now price, and the total will move.

> **Bundled prep carries no fee, as of 2026-08-02.** Prep vendors on a labor job are billed to the client at cost like every other vendor. The **30% GC fee applies only to a standalone Home Prep engagement** (§6), where no hours are billed at all and the fee is the entire revenue. Same rule as the vendor fee in §5d: a coordination fee applies only where the coordination is not already billed by the hour, and on a labor job it is.

> **Prep lines book coordination hours off the same touch model as every other vendor** — see §5d-i for the rule and the full table. Roughly 0.5–2.0 hours per trade. Painting is 3 touches (1.5 hrs) rather than 4: the old list split it into a full repaint and a touch-up and the directory has one *Painting* category for both, so it sits between them and the scope note on the line says which it is. Prep hours were their own separate table until 2026-08-03, keyed by the old dropdown's friendly labels — so when that dropdown went, all but four keys stopped matching and every prep line would have quietly billed the default, staging at 1.0 instead of 2.0. Older estimates carrying the friendly labels still resolve to their original hours.

### 5f. Notable Collections

Add significant asset collections (artwork, jewelry, antiques, silver, etc.) requiring disposition planning. Set name, estimated value, quantity, and a proposed disposition. The disposition list is now vendor-mapped — each option scopes the Job Plan partner picker to the matching Vendor Directory category:

Appraise · Auction House · Coin / Currency Buyer · Consignment · Donate · eBay Store · Estate Sale · Firearms — Licensed FFL · Gold & Silver Buyer · Jewelry / Watch Buyer · Online Auction · Rare Books / Manuscripts · Replacements.com · Specialized Dealer · Other.

Collections appear in the client-facing estimate under *Notable Collections — Disposition Plan*, and can be pulled into the **Estate Inventory** manifest on site (as a lot or itemized — see §10a).

> **You do not name the auction house here.** The vendor-name field came off the collection row on 2026-08-02, same reasoning as the vendor cards in §5d — you tag a specific partner when you are calling round with a list, not while standing in the house. That is **Job Plan** work, and the disposition you pick is what scopes the Job Plan's partner picker to the right directory category. What stays on the row: the estimated **fee** the partner will charge (a real cost, and it belongs in the estimate) and the **voice note** (detail captured on site is the whole point).

**The disposition you pick adds hours.** Each option carries its own concierge and specialist time, split by a single rule: *if the specialist comes to the property, the concierge is there; if the items go out to them (shipped, dropped off, consigned), the concierge's time is phone and paperwork.* So an appraisal, a dealer visit, or an FFL firearms handoff books real **on-site presence** — it shows on its own summary line and counts against the working-day target, because standing next to an appraiser is fixed time no crew size absorbs. Online auction, eBay, Replacements.com and consignment book coordination only. A ten-collection estate is a materially longer job than a two-collection one, and the timeline now says so.

### 5g. Vehicles & Watercraft

Capture cars, boats, motorcycles, and other vehicles as estate assets. Add each by description, then fill in the detail panel: **Type** (Car, SUV/Van, Truck, Motorcycle, Boat, Personal watercraft, RV, Trailer, Golf cart, ATV/UTV, Other), **Year**, VIN/HIN, mileage/hours, condition, and two flags — **Collector / classic** and **Title located**.

- **Ordinary vehicles** are valued from a book value (KBB / NADA) as of the date of death — Havellin can do that in-house.
- **Collector / classic** vehicles (and boats) route to a Vehicle / Boat appraiser.

Vehicles ride along in the estimate snapshot (they don't affect the labor estimate) and can be pulled into the Estate Inventory on site (§10a).

> **Flag at estimate, route on the job — and the client estimate now says so (added 2026-08-03).** Vehicles appear on the client estimate for the first time, in a *Vehicles & Watercraft* table beside the collections disposition plan; before this a boat logged on the walkthrough reached no client document at all. It states what was *flagged*, never a route: *Flagged for specialist appraisal* when Collector / classic is ticked, otherwise *Flagged for disposition*, plus *Title to be located* where that box is unticked. The KBB / NADA and Vehicle-Boat-appraiser wording stays on the internal card and is deliberately kept off the client's copy, because the disposition path is chosen during the engagement — `materializeVehicle` imports each vehicle with an empty `disposition` for exactly that reason. **What Collector / classic actually does** is set `needsAppr` on the inventory line; the appraiser itself comes from the category, which is *Vehicles & Watercraft* either way. It is an appraisal flag, not a routing switch.

Title located is worth ticking honestly. It is the one field on this card with a consequence the client feels — no title means no transfer — and an unticked box now prints on their estimate.

### 5h. Saving

Hit **Save & Preview Client Estimate**. Estimate saves and syncs to Google Sheets, then opens in the Client Estimate preview. Editable until approved.

### 5i. Hours, Crew Size & Timeline — how the numbers come out

The estimator does **not** compute concierge hours and specialist hours as two independent buckets. It computes one pool of hands-on work and one pool of coordination, then works out who clears the first — and the answer includes the concierge, because **the concierge is on site for every crew hour and works alongside the crew.** Understanding this is the difference between trusting the number and second-guessing it.

| The engine produces | Meaning |
| --- | --- |
| **Hands-on work pool** | Total physical hours in the house — sorting, packing, staging, haul-out — regardless of who performs them. *This is not the billed PS figure.* |
| **Off-site coordination** | Attorney, vendor, heir, and disposition contact that happens away from the property, around the crew days. |
| **Fixed on-site presence** | Concierge time at the property that isn't pool work — attending appraisals, dealer visits, FFL handoffs (§5f). |

> **What drives the pool — and what deliberately does not (changed 2026-08-03).** The hands-on pool comes from under-air square footage, the *volume* scores averaged across the rooms you scored, and any exterior rooms added on top. That is the whole list.
>
> **Years in home no longer touches it, and must not be put back.** It used to multiply the interior load by up to **1.30** — which made it a second measurement of the thing the volume slider measures directly. You are standing in the room scoring it, and the app refuses to submit without a volume score on every room in scope, so the direct observation is always present and the proxy was always redundant. Worse, the two compounded: a genuinely packed 35-year home scored an honest volume 5 got `1.70 × 1.30 = 2.21×`, so **the more accurately you recorded what you saw, the more the guess piled on top of it**. On a 3,500 sqft estate that was $7,600.
>
> Tenure now scales the **coordination column only**. What long tenure genuinely predicts is decision friction — thirty-five years of "we should keep this", more family history against each object, more heir conversation. That is concierge time. A box packs at the same rate whether it has sat there thirty-five years or three.
>
> **Complexity has never touched the pool either**, and still doesn't — it scales the coordination column, like tenure. So a "simple" house cannot price down on crew hours; only *volume* and scope do that.

With a crew of *n* specialists and the concierge working at production rate **α** (Settings, default 50%), the pool is cleared by **n + α** pairs of hands:

| Quantity | How it is derived |
| --- | --- |
| Concierge hours on site | `work pool ÷ (n + α) + fixed on-site presence` |
| Billed specialist hours | `n × (work pool ÷ (n + α))` |
| Billed concierge hours | `concierge hours on site + off-site coordination` |
| Duration in working days | `concierge on-site hours ÷ 7`, floored at the service mobilization minimum |

The concierge's own share of the pool is **not billed twice** — it moves from the specialist line to the concierge line. That is why a 100-hour pool does not bill as 100 PS hours. Billable hours are rounded up to whole hours, and the fees are recomputed off the rounded figures so hours × rate always reconciles on the client estimate.

**Reading the hours breakdown** — the rows map straight onto the model. This table is on the **Client Estimate** document (§7); the Build Estimate tab's own summary is condensed and does not show it.

| Summary row | Is |
| --- | --- |
| Hands-on work pool — all roles↳ Difficult-access uplift | The pool, before it is divided. The uplift is +15% here and nowhere else. |
| Concierge on site — works the crew days↳ Specialist visits attended | The concierge's presence at the property. The indented line is the fixed portion (appraisers, dealers, FFL) and only appears when collections call for it. |
| Concierge off-site coordination↳ Heirs / premium specialty coordination | Coordination away from the property. The +20% multiple-heirs uplift and the flat +25 premium specialty hours land here. |
| **Total Transition Concierge hours** | On site + off-site. This is what bills at the TC rate. |
| **Total Property Specialist hours** | The crew's share of the pool. This is what bills at the PS rate. |

**Crew sizing.** The app starts at 2 specialists and adds one at a time — to a maximum of 6 — until the job lands inside the **10-working-day target**. Each service also carries a mobilization floor no job goes below: Downsizing 2 days · Downsizing & Move / Cleanout / Estate Settlement / Probate 3 days · Contested Probate 4 days. A crew day is **7 productive hours** (travel, setup, and breaks are already excluded).

> **The crew dropdown tracks the recommendation in both directions — until you touch it.** It used to move up only, which mattered more than it sounds: early in a walkthrough the recommendation runs high (few rooms scored means the whole property is priced off those few) and falls as scoring completes, so the dropdown kept the early number. A crew of 6 left sitting on a job that needs 3 finishes sooner, puts the concierge on site fewer hours, and *quietly discounts the quote*. Once you pick a crew size by hand the app stops moving it and the badge warns instead — which is the behaviour you want when the choice is yours.

**"Client needs it sooner?" — the timeline planner.** The badge tells you what the job takes; the planner tells you what to *offer* when the client asks for a date on the spot. **Pick the date they asked for** — not a count of working days; the app converts it against the target start date from intake. It opens with what this estimate delivers *as staffed* ("As staffed: 8 working days at 2 specialists — done Aug 19"), then answers:

| Answer | Means | What to say |
| --- | --- | --- |
| Green — *"Yes — Sep 30 is comfortable"* | The date they asked for is looser than the schedule already staffed. | Say yes. **Do not tick rush.** Nothing is being expedited and charging a 20% premium for it is not defensible. |
| Amber — *"Reachable — Aug 14 with 4 specialists"*, with a button | Reachable by adding crew. States the date, the crew, and where it comes from ("5 working days, from 8 at 2"). | Offer it. The button applies it and the summary below shows what it does to the price. |
| Red — *"Aug 11 is not reachable"* | Six specialists is the cap and the job still needs more days than that. | Counter with the date the app gives you, or reduce scope. Do not agree to the date. |

> **The amber answer comes in two flavours, and only one of them charges.** The premium is offered when the result is faster than the pace this job would run at the crew the engine recommends — the button reads *"Rush it — 4 specialists, done Aug 14, +20%"*. If the date is reachable simply because the crew was set *below* the recommendation, that is not an expedite, it is staffing the job properly, and the button reads *"Set crew to 3 — done Sep 1, no premium"*. Charging 20% to undo our own under-staffing is not a thing we do.

Once expedited delivery is on, the badge under the toggle states the compression being charged for — *"Expedited — 5 working days instead of 8, done Aug 14. Premium of $3,790."* If rush is ticked on a job that is **not** compressed, the badge says that instead, in those words, with the dollar figure being added for no change in delivery. That is the case the whole planner exists to catch.

> **Compression is genuinely good business, which is why the planner exists at all.** A bigger crew moves hours off the $100/hr concierge cost line onto the $30/hr specialist line, so Havellin's *cost falls* while the expedite premium adds revenue. Measured on a 6,000 sqft cleanout: 8 days at 2 specialists costs $12,870 and bills $28,050 (54% margin); 5 days at 6 specialists costs $10,830 and bills $30,780 with the premium (65%). More profit, better margin, faster delivery, and the client got what they asked for. What the planner is there to prevent is the other case — **charging the 20% premium on a job running its natural schedule**. That same job at 2 specialists over 8 days with rush ticked bills $33,660: more than the genuinely expedited version, for nothing expedited. The planner's green answer is the guard against it, so read it before you tick the box.

Applying a plan drives the real crew and rush controls and then re-runs the normal calculation — the planner never produces a price of its own, so it cannot drift away from what the estimate actually charges.

Fixed on-site presence is added flat, never divided — six specialists don't make an appraisal go faster. A larger crew still helps indirectly: it shrinks the pool-derived share of the concierge's day, which buys back calendar room for the fixed hours.

**How far the core team reaches.** The default 2-specialist crew plus the concierge covers a surprising amount of house. At standard 3/3 room scoring, with no difficult access and no attended specialist visits, a third specialist isn't needed until roughly:

| Service | 2 specialists hold the 10-day target to about |
| --- | --- |
| Downsizing | 11,900 sqft |
| Home Cleanout | 8,000 sqft |
| Estate Settlement | 5,400 sqft |
| Probate Estate Settlement | 4,700 sqft |
| Contested Probate Estate Settlement | 3,600 sqft |

Indicative, not a rule — the app does the real arithmetic per job. Heavier room scoring, difficult access, and attended collection visits all pull these down; difficult access alone by roughly 13%. *Long tenure no longer does* — it moved off the pool in the 2026-08-03 change above, so it lengthens no crew day. The pattern is what matters: the heavier the documentation load, the sooner the core team runs out of calendar.

> **Known and unresolved: the engine still runs above the §16 reference bands.** At neutral scoring a 3,500 sqft Estate Settlement prices around **$19,000** against a band of $8,000–$16,000, and the gap widens with size — the band treats 2,000–4,000 sqft as one bucket while the engine is linear across it (roughly $10,400 to $20,800), so a single band cannot track both ends. Treat the band as a *market sanity check that is currently mis-calibrated*, not as a fault in the quote. Also open: item documentation is 35% of crew hours on an estate job and does not vary with whether there is anything worth documenting; *Garage (2-car)* carries the same content weight as the Kitchen; and the full estate step set, documentation included, is applied to exterior spaces like a patio. All recorded for a pricing pass.

**Reading the timeline badge:**

| Badge | Means |
| --- | --- |
| Green | Inside the 10-day target — or past it with the crew already at 6, in which case the badge states the duration as a neutral fact: *"more than 10 days because of the size of the property, not staffing."* There is no lever left, so there is nothing to warn about. |
| Amber | Past the target *with crew headroom left* — *"adding a specialist would pull it back."* This is the one case where the estimator can still act. |
| Red | Projected completion misses the client's hard target date. Renegotiate scope or deadline before sending the estimate. |

> **Second Transition Concierge** is a **tick box on the estimate** — "this scope needs a second concierge" — not a name. The engine ticks it for you when the load check below trips, and you can tick it yourself; either way the second concierge is *named on the Job Plan* alongside the crew. Recommended on a load check, not a rate tier: when on-site presence plus off-site coordination exceeds **10 concierge hours a day**, one person can't carry the job. Coordination is spread over at least 10 working days for this test, so short jobs don't falsely trip it. A second concierge **changes neither the fee nor the duration** — billing is total concierge hours split between the two. It makes the schedule coverable without one person working 12-hour days. Contested probate and heavy-documentation estates are what trip this, which is correct.

## 6. Home Prep for Sale (Standalone Service)

A show-ready, sell-side service offered primarily through **Douglas Elliman referral agents**. Havellin manages every trade needed to get a property market-ready — paint, repairs, landscaping, deep cleaning, staging — and charges a flat **30% GC / Site Management Fee** on the managed vendor spend. There is no room scoring, no in-house labor, and no crew.

> **Who the contract is with:** the agreement is directly with the **homeowner**. The referring agent is a referral channel only — never our client. No document should suggest otherwise.

### 6a. Building the estimate

- Select the job (Service Type = *Home Prep for Sale*). **The tab empties out** — room scoring, crew, labor, Notable Collections, Vehicles & Watercraft and Moving Materials all disappear, and so do the five vendor cards that are not Property Preparation. What is left is one card, **Home Prep for Sale — Managed Vendors**, sitting beside the Job details. There is nothing else on the tab to fill in.
- Add each prep trade with an estimated cost. The card footer shows the vendor total and the running 30% fee. The dropdown is the *Property Preparation* categories from the Vendor Directory, so a newly-added prep specialty (e.g. Floor Refinishing) appears automatically (Section 13a).
- **Scope notes:** each vendor line has a scope field — capture on the walkthrough exactly what to tell that trade (e.g. "5 bedrooms + hallway, walls & ceilings; front & back landscaping"). These carry through to the Job Plan sourcing.
- No property value is required.

> **Why the other five vendor cards are hidden — changed 2026-08-03.** They were on screen and they should not have been: the client estimate for a prep job itemizes prep vendors, the 30% fee and one total and nothing else, and the prep Job Plan sources nothing else — so a dumpster added here landed in the grand total while appearing on no document the client or the crew ever saw, and the client estimate stopped adding up. If a prep job genuinely needs a hauler, book it as a Property Preparation trade or run the job as a Cleanout with prep bundled (§5e).

### 6b. Client estimate

The client estimate reads vendors-first: the itemized prep vendor estimates (billed at cost), then the Havellin 30% management fee, then one Total Estimated Project Cost. Standard 50 / 25 / 25 payment schedule applies to the Havellin fee.

**Timeline:** Home Prep runs on the vendors' schedules, so no completion date is projected. The estimate shows the Target Start plus a note that the schedule is confirmed once vendors are booked — the client never sees a blank completion date.

### 6c. Job Plan (streamlined)

A Home Prep job opens a stripped-down Job Plan — no hours log, no PS crew, no room phases, no end-of-job logistics. It shows only:

- **Budget & Fee** — estimated vendor spend, quoted-to-date, and the running 30% fee on actual quotes (flags any over-budget).
- **Home Prep Vendors — Sourcing & Status** — assign a partner from the Vendor Directory, set status, and log the actual quote per item (with the scope note shown for reference).
- **Coordination Checklist** — scope confirmed → quotes collected → vendors booked → work underway → completed/inspected → final invoices + fee billed.

## 7. Client Estimate & Approval

**Tab: Client Estimate** → select job. The client-facing estimate document renders here. Review for accuracy. The estimate is informational — no client signature is required or requested.

### What the document contains

It opens with **Havellin Job Plan & Services** — rebuilt 2026-08-03 from a single *Proposed Plan* paragraph into a structured section ahead of the fee tables. **Three blocks: *How We Work* · *Spaces In Scope* · *How The Work Runs*.** The fee tables, third-party vendors and totals follow it.

> **It was six blocks for a few hours on 2026-08-03, and the last three were folded into the numbered stages on instruction.** Everything they said now sits in the stage it belongs to: the vendor roster is split across the stages the vendors actually appear in, the records list is inside Close-Out because that is when the client receives it, and the client's obligations were already stated per stage under *What we need from you*. **Do not reintroduce a trailing block after a numbered sequence** — it reads as an appendix restating what the sequence already said.

> **Vendors are named in the stage they appear in, bucketed by what the trade does.** Appraisers, FFLs and other valuers go in the *sorting* stage — they work while the contents are still in place. Haulers, dumpsters, storage and auction houses go in *disposition*. Cleaners, painters and finishing trades go in *close-out*, because none of them can start until the house is empty. A single roster at the end had put the appraisers two stages late and the final clean two stages early, on a document whose whole point is that we know the order. It also exposed a real gap — **close-out never mentioned the finishing trades at all**, so a cleaning vendor could appear on the estimate and in no stage of the method.

> **The stages are DERIVED from the pricing engine, not written per service — this is the whole design.** Which stages a client sees comes from `JOB_STEPS[svc]`, the same table that produced the hours. Probate prices a *document* step and a *legal* step, so its document carries the documentation and court-filing stages; Home Cleanout prices neither and shows neither; move management gets Move Day. The narrative and the number read one source and cannot disagree. **If a service ever needs a new stage, add the step to `JOB_STEPS`** — never hardcode a per-service phase list, or the two drift exactly the way this manual does.

Each stage states three things: what Havellin does, **what we need from the client**, and **what "complete" means** — the internal Job Plan's phase gate (§11) restated in client language. That last field is what makes the document read as a method rather than a brochure.

> **No dates and no durations appear anywhere in the plan, deliberately.** Same reasoning as the fixed-price fee line (§5c): a number beside a stage reads as a delivery commitment, and the pace is set by how fast the *client* decides, not by us. A test asserts that no day or week count appears in any stage copy on any service type. Don't add one.
>
> There is also **no sentence on the document explaining that absence** — one was written and then removed on instruction. Explaining an absence is what draws attention to it; a client reading a gated sequence with a *Complete when* on every stage does not ask why there is no calendar. If one does ask, answer from the overall working-day estimate and say plainly that the pace depends on how quickly they decide.

> **The documentation the stages promise is what the estimate PRICED, not what the service offers (new 2026-09-04).** With the Build Estimate *Documentation scope* (§5c) at *Capture only* the sorting stage is *Sorting, Photography & Listing* and says once that valuation is counsel's; at *None* it is *Sorting & Set-Aside* and says once that counsel is inventorying and we work from their schedule. The Close-Out records list drops the valued inventory and the appraisals on both, and the court-grade records (date-of-death FMV, appraisals attached) survive only on *Full*. This is the one place the standing rule against explaining an absence yields: the absence shifts a responsibility, and a reader who skipped the line would assume Havellin carries it. Everything the stage says about authority is unchanged — nothing is sold or removed at that stage, nothing leaves without written authority, the representative need not attend.

> **Depth follows the documentation level (§4), not the project value.** A *Formal* engagement gets the fuller completion criteria and the court-grade records list inside Close-Out — date-of-death FMV, chain of custody, appraisals attached, seven-year retention. A *Standard* job keeps every stage rather than reading as an afterthought; it simply doesn't claim records it isn't producing.

**Spaces In Scope is grouped by section** — Entry & Living, Kitchen & Utility, Lifestyle Rooms, both bedroom floors and the rest — with a count per group and a total. The flat comma list it replaces dropped the section name, so a two-storey house printed *Primary Suite … Primary Suite* and *Half Bath … Half Bath*: real first- and second-floor rooms reading as duplicated typing on a six-figure proposal. Grouping is a correctness fix, not styling. Excluded spaces still print in red beneath.

**Standalone Home Prep runs its own three stages** — Scoping & Sourcing · Execution & Oversight · Show-Ready Handover — and carries no records list, because it produces no inventory (§6b).

> **An empty third-party section no longer prints.** With no vendors on the estimate the heading, the *No third-party vendors estimated at this time* line, the $0 subtotal and the $0 row in the totals table are all suppressed — four lines describing work outside the engagement, which read as though something were missing. **The test is on having no vendor *rows*, never on the cost being zero:** an auction house or estate-sale company is proceeds-based, prints *No direct cost*, and is a real engaged vendor that must still be listed. A cost with nothing itemising it keeps the section, so money is never hidden to tidy a layout. The totals table also drops its *Havellin Services* breakdown line when there is nothing to break the total into — with no vendors and no prep it was stating one number twice.

> **ONE RULE DECIDES THE VOICE: is the client alive, or is the client dead? The SERVICE TYPE answers it, always.** `isDecedentJob(job)` is the single reader, and both the client estimate and the engagement agreement go through it. The catalogue is already split down this line and there is no in-between case:
>
> **LIVING** — Downsizing · Downsizing & Move Management · **Home Cleanout** · Home Prep for Sale. It is *your home*, *your things*, and the decisions are theirs; the pace is set by how quickly they decide.
>
> **DECEASED** — **Estate Settlement** · Probate Estate Settlement · Contested Probate Estate Settlement. It is *the property*, never theirs; the will governs disposition rather than preference; we catalogue first and hand the inventory over; nothing moves without written authority; heirs on site get courtesy and no instruction is taken from them; they need not attend.
>
> **A Home Cleanout is a living owner by definition** — a landlord, a relocation, a clear-up. The house of somebody who has died is an **Estate Settlement**, which is a different engagement at a different price. So the fix for a wrongly-addressed document is always to correct the *service type*.
>
> **DO NOT ADD "SAFETY NET" FALLBACKS ON A DATE OF DEATH OR A RECORDED REPRESENTATIVE.** Both were in the predicate on 2026-08-03 and both came out the same day. Neither is reachable — intake shows those fields only on the three services that already answer *deceased* — and the representative one is **wrong as a death signal**: the role list offers *Power of Attorney* and *Family Member*, and a POA acts for a **living** person (it terminates on death). A POA managing a living parent's downsizing is ordinary work, and that fallback would have called it a decedent job the moment the rep block was offered on a living-client service.

> **Keep this separate from "does this job price a documentation step".** That question is answered by `JOB_STEPS` and decides whether a documentation *stage* exists at all — it is what the client is being **charged** for. The living/deceased rule decides only **who we are writing to**. *Today the two select exactly the same three services* — Estate Settlement, Probate and Contested Probate are precisely the ones carrying a `document` step — but they are kept as separate tests because they answer different questions, and the first time the catalogue moves, collapsing them would either sell documentation nobody bought or address a dead man as the client.

> **The stages branch on the JOB FAMILY, and this is a correctness matter rather than a wording one.** Until 2026-08-03 every service type got the same stage copy — *"Decisions, room by room. This is the part of the job that sets the pace"* and *"the retained list is confirmed with you in writing"*. That describes a **downsizing**: a living owner standing in their own house making calls. On an **estate or probate** the owner is deceased, the client is the **representative** — frequently an attorney or trust officer who is not local and may never attend — and the **will** governs disposition rather than preference. The document was describing a job that was not happening.
>
> **Estate / probate stage 2 is *Sorting, Documentation & Inventory*.** We catalogue, and **nothing is sold, donated or removed at that stage at all**. Items designated to a named person are set aside and recorded separately; property that may be claimed exempt is flagged. It says plainly *"You do not need to be on site"*, and the room is complete when its inventory has been **delivered to the representative and counsel**.
>
> **Stage 3 is *Distribution & Disposition*** and opens with the gate: **nothing leaves the property until the representative has reviewed the inventory and authorised it in writing.** Releases are made **against signed receipts** — on a court-supervised matter "we gave it to the daughter" is not a record — and where beneficiaries disagree we hold and wait. We do not arbitrate, and nothing goes out on a verbal request.
>
> **Downsizing keeps the decision-paced language, because there it is true.** **Home Cleanout keeps a simpler living-owner version** — it routes contents and asks for a decision on anything to be kept, without the estate's cataloguing and written-authority gates, because a cleanout client is alive and clearing their own property. A test asserts *Decisions, room by room* appears on downsizing and on neither estate nor probate.

> **We do not ask the client for the will, and the document must never read as if we were counsel.** The first draft of this section asked for "a copy of the will or trust". That was wrong and was corrected the same day. Havellin's own Job Plan asks for a **certified copy of the Letters** (§11 Phase 0) and treats a will found in the house as something to **sequester and turn over to the PR/attorney against a signed receipt** (§11 Phase 1) — it never requests one. The client document now asks for the Letters plus **the list of items designated to a named person**, produced by the representative or counsel, and states outright *"we do not need the will itself"* and *"we do not read or interpret the will"*. **If this ever needs revisiting it needs Anthony and probably counsel, not a judgement call.**

> **Stage 1 says who we work for, and it is not the family.** It carried the same downsizing framing — *"who will be in <u>your home</u>"*, *"the decisions <u>you</u> will be asked to make in every room"* — addressed to someone who does not live there. The estate version now states **"We work for you"** and says that where family or beneficiaries are at the property we are **courteous to everyone present but take direction from the representative alone**, releasing nothing without their written authority. On a job with multiple interested parties it asks how questions from anyone else should be routed, rather than asking for a group spokesperson.

> **"At cost" is stated on labels and in Terms — not in prose.** It appeared five times on one page. It now appears on the two vendor subtotals (*Estimated Third-Party Total (at cost)*, *Est. Prep Vendor Total (at cost)*), on their two lines in the Total Estimated Project Cost table, and in full, once, in **Terms**, which is where a commercial rule belongs. Both vendor footnotes were deleted with it, and so were the concierge-hour counts they carried (*"accounts for 18.0 of the Transition Concierge hours above"*) — the client's copy shows one combined concierge figure, so that number could never be checked against anything on the page. **The no-markup claim itself survives, in Terms.**

> **Band weight is hierarchy, and there are exactly two dark bands.** The dark charcoal band is **reserved for the two that state what the client pays** — *Total Estimated Project Cost* and *Payment Schedule*. Every other section on the estimate wears the lighter tan band. When all of them were dark there was no hierarchy and the number the client needs to find carried no more weight than a vendor list. A test asserts exactly two. *The invoice is a separate document and still uses the dark band throughout.*

> **The header is one identity line** — Job ID · Estate/Client · Property · Date — then the representative row (which now carries *Service*), then the dates row (which now carries *Date of Death*). Rows run even columns with the last value flush right. The *Estate*/*Client* label flips on whether an **authorised representative is recorded**, not on the service type, so a cleanout job with no rep correctly reads *Client*.

### Approval

Hit **Submit for Approval** → manager enters PIN → estimate is locked and marked *Approved for Release*. PDF is unlocked. Estimate cannot be edited after approval — use a Change Order instead.

### Sending to Client

> **An unapproved estimate cannot be emailed.** The app refuses, from the Client Estimate tab and from the Client Dashboard shortcut alike. Approve it first — the figure isn't final until someone has signed off on it.

Hit **Email Estimate** → opens a pre-drafted, warmly-worded email (referencing the in-home walkthrough) with the estimate to attach. Send to the client for review, then wait for them to confirm they want to proceed before taking further steps.

> **Save to Drive confirms itself, and still says so tomorrow.** The button repaints to a green **✓ Saved to Drive** carrying the time in its tooltip, and the approval banner gains a persistent **📁 Filed to Drive · &lt;when&gt; · Open** line linking straight to the filed copy. Before 2026-08-03 the only acknowledgement was a four-second toast in the bottom-right corner of a long page — missed by anyone watching the button they had just pressed — and nothing anywhere recorded that an estimate had ever been filed. A *failed* upload writes no stamp and the button stays plain, so it can never claim a save that didn't happen. **Editing an approved estimate clears the stamp**, because the copy in Drive is the previous version the moment you edit; re-approval re-files and re-stamps automatically. Pressing the button again re-files and overwrites by filename.

## 8. Service Agreement

**Tab: Agreement** → select job

> **Which of the two agreement forms you get is decided by the same living/deceased rule as the estimate** (§7) — `isDecedentJob(job)`. A **deceased** client gets the **estate form**, which is written to an authorised representative signing in a fiduciary capacity; a **living** client gets the standard form, written to an owner contracting for their own property. You do not choose it and there is no override on the tab.
>
> **This changed on 2026-08-03 and it changes what goes out on real jobs.** The routing used to name four service types, one of which was the plain *Home Cleanout* — so a **Home Cleanout** generated the *estate* agreement even though it is living-owner work, while **Estate Settlement** (the deceased engagement) was covered correctly. It now reads the same predicate as the estimate, so the two documents can no longer disagree about who the client is. *Any cleanout agreement issued before this date should be re-generated and re-read before it is relied on.*

> **The estate-form agreement follows the documentation scope on the attached estimate (new 2026-09-04).** Three places in it described the inventory as a Havellin deliverable — the Scope of Services paragraph, the §5.2 Florida Probate Compliance list, and the midpoint-payment trigger — and each now reads the estimate's *Documentation scope* (§5c). At *None* the scope says the inventory and valuation are not within the engagement and remain counsel's; at *Capture only* it sells the photographed list without valuation and names valuation and appraisal coordination as counsel's; the §5.2 list replaces "Havellin will prepare a documented asset inventory" and "Havellin will coordinate professional appraisals" accordingly, and the §5.3 appraisal row becomes *Admit an appraiser engaged by counsel*. The midpoint payment used to trigger on completion of the asset-inventory phase; it now names the stage the estimate actually has. **An agreement generated before the scope was set on the estimate reads as the full-scope form** — re-open the estimate, set the scope, re-approve, and regenerate.

> **Never send an agreement before the client has accepted the estimate** — verbally, by email, or by text. Record that acceptance on the Client Dashboard first (**✓ Client Accepted — Mark Won**, §9). That's the record the client actually said yes, and it's what unlocks staffing.

### Generate & Send

1. Select job → agreement auto-populates from approved estimate data
2. Manager enters PIN to approve for sending. *The approved agreement files itself to the Drive **Agreement** folder at this point* — approval is the first moment the document means anything.
3. **Print / Save PDF** or **Email to Client**, then hit **✉ Mark Agreement Sent**.

> **Generate Payment Link** asks the Stripe service for a deposit link and mails it to `billing@havellinpalmbeach.com` for you to forward. **Believe what it tells you.** It used to report success unconditionally — the request was sent in a mode that makes the reply unreadable, so a 404 from an undeployed URL and a 500 from a script that threw both printed *"payment link generated and sent"*. It now reads the reply and says plainly when nothing was created; if it does, send the deposit invoice instead and record the payment by hand. Nothing yet reads *back* from Stripe — there is no webhook and no automatic payment record (§3).

### Then, as each thing actually happens

Three ordered steps, each recording who did it and when. Each button appears only at its own stage, and each refuses to run out of order — you can't mark a signature on an agreement that was never sent.

1. **✉ Mark Agreement Sent** — you've emailed or handed it over.
2. **✓ Mark Agreement Signed** — the signed copy has come back. *Signing does not imply payment*; these are separate facts and the app keeps them separate.
3. **✓ Record Deposit** — see below. This is what allows work to begin.

### Recording a payment

The same button records **all three** payments — deposit, midpoint and final. A **Which payment is this?** picker at the top of the dialog opens on the first stage that hasn't been satisfied, so in normal use you never touch it. Change it when you're recording a midpoint or final cheque.

> **Only the deposit gates anything.** Recording a midpoint or final payment captures the money so the job's paid total is complete — it doesn't unlock work, and a midpoint cheque of any size will never fund a job. That distinction is deliberate: the deposit is the one stage whose target the app can work out on its own (50% of the approved total). The midpoint and final amounts come off the invoice you actually sent, which is built from logged hours and real vendor quotes, so those stages prefill nothing and challenge nothing — type what arrived. *Until this was built, midpoint and final money was invoiced and then recorded nowhere at all.*

### Recording the deposit

The deposit is **50% of the approved total** and is **never waived or varied**. Recording it captures evidence, not a tick:

- **Amount** — prefilled with what's still outstanding, so a second cheque needs no arithmetic in the field.
- **Date received**, **method**, and **reference** (cheque number, wire confirmation, Stripe id).
- **Paid by** — the trust, estate account, law firm, or the client. In estate work the payer is frequently *not* the client, and this is what tells you the estate is funding the engagement properly. It also settles the question if heirs later dispute who paid for what.
- **Photo of the cheque** — filed to Drive and linked to the payment. Five seconds, and you want it before the cheque leaves your hands. This is what makes a hand-recorded payment a document rather than an assertion.

**Partial payments are normal and handled.** Two cheques, or a trust sending part and the family the rest, all work: the job stays *part-paid* and unfunded until the running total reaches the target, the bar shows what's outstanding, and the Record Deposit button stays available for the next one. A short total asks before it's accepted; a second cheque that completes the deposit passes without a warning.

> **Work starts on *received*, not *cleared*.** Waiting for cheques to clear costs three to five days on every job. Wires, cards and cash are marked cleared on receipt; cheques show as *uncleared* on the dashboard until the bank confirms. Above **$10,000** a personal cheque is no longer the accepted instrument — **wire preferred, cashier's cheque accepted**. Recording a large personal cheque anyway is allowed (the money is already in hand) but it is flagged as a *policy exception* and carries your name.

A *certified* cheque and a *cashier's* cheque are not the same thing: certified is drawn on the client's account with the bank only secondarily liable; a cashier's cheque is drawn on the bank's own account with the money already taken. Ask for the second one. Neither is bounce-proof — counterfeit cashier's cheques are a common fraud — so on a large deposit, phone the *issuing* bank on a number you look up yourself, not the one printed on the cheque.

### Payment Schedule

| Milestone | Amount | Timing |
| --- | --- | --- |
| Deposit | 50% of estimate | Due upon signing (estimate basis — no actuals yet) |
| Midpoint | Brings cumulative to 75%, with vendor & home-prep fees trued to actual Job Plan quotes | Due at project midpoint |
| Final | Balance — labor trued to logged hours, fees on actuals, plus any approved Change Orders | Within 7 days of final invoice |

Third-party and home-prep vendor invoices are billed directly to the client at cost. Havellin's 30% GC fee on a standalone Home Prep engagement is calculated on the actual quotes logged in the Job Plan sourcing and trued up from the midpoint invoice onward; no fee is charged on vendors for any other service; lines with no logged quote fall back to the estimate, tagged "est." Generate each stage from the Invoices tab via the Stage selector.

## 9. Client Dashboard

**Tab: Client Dashboard** → select job card. Shows full job status, action checklist, referral source / partner, Drive folder link, and all management actions.

| Status | Meaning |
| --- | --- |
| New | Intake complete, no estimate yet |
| Pending Approval | Estimate submitted for manager PIN approval |
| Approved — Awaiting Client | We've approved our own estimate. **The client has not answered.** Nothing may be staffed yet. |
| **Won** | The client has accepted. Staffing unlocks here. |
| Active | Signed + deposit received — work in progress |
| Closed | Final invoice paid and closed. **Delivery is stamped here** — see below. |
| Lost | Died before any money arrived. **Terminal.** |
| Closed — Deposit Retained | Died *after* the deposit. We keep the money; it still counts as won because it produced revenue. **Terminal.** |

> **Re-open resumes; it does not reset.** The status button on a closed job reads **Re-open** and returns it to *Active*, where it left off. It used to send the job back to *New*, so one mis-tap on a phone threw a delivered job to the very start of the lifecycle. *Lost* and *Closed — Deposit Retained* are terminal and the button will not move them at all — previously it silently turned a lost job into a brand-new one. If a lost client comes back, start a new job.

> **The handover date is recorded once.** The first time a job is closed, the app stamps the delivery date, the time, and who closed it. Re-opening and re-closing does *not* move that date — it records when the work was actually handed over, not the last time somebody touched the button. Nothing in the app previously recorded delivery at all (the *completion date* on the intake form is a target, not an observation), and this is the field revenue recognition will read once the QuickBooks twin goes live.

> **"Approved" and "Won" are different things, and the difference is the point.** Approved means a manager signed off on our own figure. Won means the *client* said yes. Previously the app had no way to tell them apart — it counted a job as won the moment we approved our own estimate, so the win rate measured how often we approved our own work.

### Marking a job Won

Once the estimate is approved, the dashboard shows **✓ Client Accepted — Mark Won**. Acceptance is informal — nothing is signed until the agreement — so the app records *how you know*:

- **Method** — email reply · phone call · text · in person.
- **Date** they accepted.
- **What they said** — paste the email, or note what was said on the call.

A phone call or in-person acceptance **with no note** is challenged before it's accepted. For those there is no email to fall back on: the note is the only thing recording what the client actually agreed to.

### Closing out a job that dies

The **✕** button on a job card opens closeout. What it does depends on whether money has arrived:

- **Before the deposit** → *Lost*, with a reason. A job that was marked Won and then withdraws flips back to not-won — a win that produced nothing isn't a win.
- **After the deposit** → the button changes to **Close — Retain Deposit** and the status becomes *Closed — Deposit Retained*. It still counts as won.

> The retained-deposit position **needs agreement language before the money is treated as earned**. The app models the state; the clause is a question for counsel.

The **📁 Drive** button opens the job's Google Drive folder directly.

### Change Orders

If scope changes after estimate approval, the approved estimate is not edited — a Change Order carries the difference. From the job card: **Create Change Order** → description, the dollar impact (*positive to add, negative to reduce*) and a reason. **No manager PIN is involved** — a Change Order is priced with the client, not approved internally.

The change order then appears on the job with two buttons:

1. **PDF** — the printable Change Order showing original total, the change, and the revised total.
2. **Get Acceptance** — the client types their name against *✓ I Accept This Change Order*. Hand them the iPad, or record it yourself off their email or call. Name and date are stored on the change order.

> **An unaccepted Change Order is never billed.** Acceptance is what updates the project total and what puts the change on the final invoice — the invoice counts client-approved change orders and silently ignores the rest. A change order created, printed, agreed on the phone and never marked accepted is work you will do and not charge for. Take the acceptance at the moment the client agrees.

## 10. Active Job Documentation

Accessible from Client Dashboard once a job is **Won**. (Home Prep jobs are vendor-managed and generally skip room documentation.)

> **Corrected 2026-08-03 — this said *Active*, and the app used to enforce it.** Photo capture now opens as soon as the job is **Won**, matching the gate the Job Plan screen itself enforces. It mattered: a job sits at *Won* for the entire stretch between the client accepting and the deposit being recorded, the Job Plan renders its room cards — camera buttons included — that whole time, and every shot taken in that window was **silently discarded**. No upload, no record, no message: the camera opened, the photo was taken, and the app did nothing. Day-one walkthrough photos evaporated. **If either gate ever moves, move both.**

> **Three refusals that were silent now speak.** A job that isn't Won, a job that can't be resolved, and a failed photo whose image data is no longer held all now say so. A camera button that does nothing is indistinguishable from one that worked, which is why these were worth more than a log line.

> **A failed photo now survives the session.** Its **Retry** used to do nothing at all once the tab had been closed — the image was held in memory only, so a shot that failed on Tuesday was gone by Wednesday with a live-looking Retry button sitting beside it. Failed shots now keep their image data on the device (under their own storage key, so image data can never crowd out the inventory record) until they upload. If the device has no room to hold one, you are told to retry it *now*, before leaving the job.

> **Photo counts are correct on the first open of a job.** The room cards used to be drawn before the photo records were loaded, so the first time you opened any job in a session every count read zero and every failed-upload flag was hidden — photos correctly filed in Drive read on screen as photos that never happened. Related: uploads now resolve the destination through the shared folder resolver, so a job folder created before the 2026-07-15 *Photos* + *Asset Documentation* merge files correctly instead of failing every photo (§15).

### Room Documentation

Each room row shows the walkthrough note from the estimate as a gray italic reference. Capture buttons per room:

- **📷** — tap to add/review photos. Uploads automatically to the **Estate Inventory** Drive subfolder
- **🎥** — capture video walkthrough footage

Photo naming: `HVL-YYMM-XXXX_RoomName_001.jpg`

### Notable Collections — Asset Documentation

- **📷 Asset photos** — condition/identification photography. Uploads to **Estate Inventory** as `HVL-YYMM-XXXX_ASSET_CollectionName_001.jpg`
- **📄 Appraisal** — upload PDF or image of appraisal document. Saves as `HVL-YYMM-XXXX_APPRSL_CollectionName_2026-05-01.pdf`

### Item Inventory Capture (room cards)

On each Job Plan room card, use **Capture item** to photograph individual objects for the estate inventory. Type the object name, pick a **category**, and set a disposition before the shot; each photo is saved with a self-identifying filename. Items in an "intrinsic" category (art, jewelry, silver, antiques, rugs, coins, firearms, wine, instruments) that carry real value show a **⚑ needs-a-specialist** flag. Captured items flow straight into the Estate Inventory manifest, where they are grouped by disposition for the evening review — anything you did not chip a disposition onto in the field lands in *Not yet decided* at the top of that tab (§10a).

## 10a. Estate Inventory (Tab)

**Tab: Inventory** → select a client. A per-client tangible-personal-property manifest and the estate documentation workspace. It assembles from three sources: items captured on Job Plan room cards, **+ Add line item** (an asset with no photo — cash, account, a vehicle), and **import from the estimate** (below).

### What this tab is for — rebuilt 2026-09-01

The Job Plan is the **field** surface: room by room, on a phone, standing in the room. The Inventory tab is the **desk** surface — that evening, the concierge opens the day's captures and works them: puts values on things, decides where each goes, ticks each line off, then produces the client's schedule. It is not a field tab (it is hidden in field mode) and that is deliberate.

- **Grouped by disposition, then by room.** *Not yet decided* sorts first, because it is the worklist; the rest run Keep · Auction · Consign · Sell · Donate · Junk · Hold — the order the decisions get made in, not alphabetical. Inside each group the rooms run in **walkthrough order**, so the evening review retraces the day.
- **Needs you** — five counts across the top: *Not yet decided · No value yet · Needs appraiser · Firearms held · Disputed / Hold*. Each is also a filter. These are the reasons to open the tab.
- **Today / Last 7 days / All**, plus a room picker and a search box. It opens on **Today** when anything was captured today and on **All** otherwise, so a job picked up a week later is not an empty screen.
- **Value and disposition edit on the row.** The ▾ opens the item panel — the photo, and every other field in four sections (Item · Valuation · Disposition · Flags & Track).
- **Select rows and a bulk bar rises from the foot:** set disposition, room or valuation source across the whole selection, mark them reviewed, or raise an approval request. The evening pass is mostly the same decision repeated forty times; doing it one dropdown at a time is what makes people stop doing it.
- **Reviewed** is a tick per line with an *N of M* read-out on the tab and on each group.
- The Summary and its rollups moved to the **bottom** and start closed — *More → Show summary & rollups*. It is a read-out, not a workspace, and it was sitting on top of the work.

> **The column-group buttons are gone, and so is the table they existed for.** Until 2026-09-01 this tab drew all 29 manifest columns and put a row of buttons above them (Valuation · Disposition · Flags & Track · Everything) to swap which slice was on screen. A control that exists only to work around the width of the thing beneath it is a symptom, not a feature. The column *groups* survive — they are now the item panel's four sections, so there is still exactly one definition of what a column is and where it belongs. The **export is unchanged**: the workbook and the CSV carry every column.

> **Reviewing gates nothing and locks nothing, on purpose.** Havellin shows clients work in progress during an engagement, so a checkpoint that withholds the document is exactly the wrong mechanism. An unfinished review instead **stamps every client document** — *IN PROGRESS — 18 of 42 items reviewed*, with a line saying unreviewed values may still change. A finished one reads *REVIEWED*. Do not turn this into a gate later; the honesty comes from the stamp.

### Categories & appraiser routing

Every item has a category from the shared taxonomy. Each category knows which specialist appraiser it routes to and whether items in it are treated as carrying **marked artistic or intrinsic value** — which drives two *different* $3,000 tests, one per item and one across the estate. See *Two different $3,000 tests* below; confusing them is the mistake this section exists to prevent. Categories: Antiques · Art & Décor · Collectibles · Electronics & Appliances · Firearms · Furniture · General/Household · Jewelry & Watches · Musical Instruments · Rugs & Carpets · Silver & Precious Metal · Vehicles & Watercraft · Wine & Spirits.

### From the estimate walkthrough (the bridge)

When flagged collections or vehicles exist on the estimate, a **From the Estimate Walkthrough** panel offers to add them to the manifest. Collections can be **itemized** (one row per piece) or kept as a **lot**; a guessed category pre-selects the appraiser routing. Collector vehicles carry a needs-appraisal flag. Imported items can't be added twice.

### Appraisers (per estate)

Add a roster of named appraisers — name, firm, **credential** (ISA / ASA / AAA / USPAP / GIA), **independence**, effective (value) / report dates, and **Due back**. An item whose valuation source is *Appraisal* is linked to a roster appraiser from the *Appraisal Doc* field in its item panel, or from the row the guardrail panel offers — replacing free-text with a defensible record.

> **Due back is the "expected turnaround" the deliverables page promises** ("which appraiser is engaged for each, and expected turnaround"). Nothing in the app recorded it until 2026-09-01. It prints on the Appraisal Flag List at the foot of the Estate Inventory Report; with no due date set, the report falls back to the report date and then to a dash.

### The $3,000 appraisal guardrail

Items flagged for appraisal that aren't yet linked to an appraiser surface a panel: a **soft amber nudge on Standard** jobs, a **red block on Formal** jobs (the inventory isn't complete until each is appraised). Per-item **Waive** logs a reason. On a Formal job, the Court Inventory export stamps *DRAFT* until every flagged item is appraised or waived.

### Two different $3,000 tests — per item, and across the estate

The app carries two thresholds that share a number and answer different questions. Read this once and the rest of the section follows.

| Test | Question | Where it shows |
|---|---|---|
| **Per item** — $3,000, or $500 in Strict Mode with a recorded dispute | Is *this object* worth enough that a specialist should value it? | The ⚑ flag on the row, the guardrail panel, the per-specialist groups on the Appraisal Worklist |
| **Aggregate** — Treas. Reg. §20.2031-6(b), $3,000, never indexed | Do the estate's articles of marked artistic or intrinsic value, *added up*, exceed $3,000 — so that an expert's appraisal under oath must be filed with the Form 706? | The *MAIV Articles* row in the Summary, and its own block on the Appraisal Worklist |

> **An estate can pass every per-item test and still fail the aggregate.** Thirty $500 pieces of silver: not one is near $3,000, every one carries a recorded value, so nothing is flagged and the Appraisal Worklist has *no groups on it at all* — and the estate owes an expert appraisal under oath on $15,000 of silverware. Until 2026-08-24 the app said nothing in that case. The aggregate block now prints whether or not anything made the per-item cut, and the empty-worklist message points at it.

### MAIV — marked artistic or intrinsic value

Two manifest columns: **MAIV §20.2031-6** (Auto / Yes / No) and **MAIV Class**.

- **It fires by default** on Art & Décor, Antiques, Jewelry & Watches, Silver & Precious Metal, Rugs & Carpets, Collectibles, Firearms, Wine & Spirits and Musical Instruments. Furniture, Electronics, General/Household and Vehicles do not.
- **The control overrides in both directions**, and both directions matter. A $40 mass-produced print sitting in Art & Décor is not an article of marked artistic value and carrying it in overstates the estate's exposure — set it to *No*. A fur coat or a rare book library filed under General/Household *is* one and nothing derives it — set it to *Yes* and pick the class.
- **MAIV Class uses the regulation's own words** — paintings/prints/statuary · antiques · jewelry · **furs** · silverware · **books & manuscripts** · oriental rugs · coin & stamp collections · other articles of marked value. Furs and books have no item category on purpose: the class is a separate field precisely so they can be captured without inventing a fourteenth category.
- **The class cell only opens on an article that is MAIV**, the same rule the NFA tick follows on non-firearms.

> **Counted across the whole gross estate, not the probate schedule.** The regulation says "included in the gross estate", and a revocable trust's contents are in the gross estate even though they sit outside the §733.604 filing. So Trust and Non-probate items *are* in the aggregate — which matters here, where a great many estates hold everything in trust. Do not reuse the Court Inventory's probate filter for this.

> **An untested aggregate is never reported as one under the cap.** An article with no value recorded makes the total a *floor*. While anything is unvalued the app says "at least $X … cannot be tested yet" and refuses to conclude, because printing "under the aggregate" against a partial sum reads as a clearance and is not one.

> **The filing requirement is scoped to the 706, not to Strict Mode.** A recorded dispute forces Strict Mode without making a federal return due, so the block reads the *706 answer itself*. On an estate filing no return the aggregate still prints — it is a useful read on where the value sits — but as a guide, never as a requirement.

### Valuation basis & date

- **Valuation Basis** — the level of value the whole schedule is stated on (defaults to Fair Market Value, as estate/probate requires).
- **Value as of** — normally the date of death. Toggle the **§2032 alternate valuation date** (six months after death, for taxable estates) and item value-dates and the Court Inventory follow it.
- **Asset Track** — Probate / Trust / Non-probate / Homestead / Exempt (default Probate). Only Probate-track items appear on the Court Inventory, so the probate schedule doesn't overstate the estate.
- **Valuation Basis / Comps** (new 2026-09-01) — free text beside the value: which valuation app you used, which comparables, what the range was. The concierge reads a value off an external app that returns recent auction results; this is where that answer is written down.

> **A value with no stated source is what the published promise exists to prevent.** The deliverables page commits to "date-of-death fair market value, *and the valuation source stated*". The Estate Inventory Report prints **not stated** in red against any line whose Valuation Source is blank, rather than leaving a gap the reader has to notice for themselves.

### Chain of custody & snapshots

- **🔗 custody log** (per item) — record each transfer: released / received / transferred / returned · party · date · method · receipt. A badge shows the event count.
- **Snapshot** — capture a labeled point-in-time copy of the manifest (the amended-inventory / what-changed trail); print any snapshot as an as-of schedule.

### Exports (work product)

Three sit on the working header; the rest moved under **More ▾** to get them out of the way of the work.

- **Estate Inventory PDF** (new 2026-09-01) — *the client / attorney deliverable*, and the document the website's §02 promises. A photo thumbnail, description, location, quantity, condition, date-of-death FMV and the valuation source on every line, grouped by disposition and then by room. **Homestead, exempt and non-probate property are carved out** into their own schedule rather than omitted, so a reader can see both that it exists and that it sits outside the probate estate. An **Appraisal Flag List** closes the document, naming the specialist required, the appraiser engaged and when the report is due back.
- **CSV** (new 2026-09-01) — every column, as a file to attach to an email. Built from the *same payload the Drive workbook is written from*, so the spreadsheet a concierge sends an attorney cannot disagree with the workbook shared with counsel. Written with a byte-order mark, or Excel reads it as Windows-1252 and every § and é arrives mangled.
- **Approval Request** (new 2026-09-01) — see *Release approval* below.
- **Court Inventory** — a §733.604-style schedule grouped by category with date-of-death FMV, exempt property (§732.402) separated, a valuation-basis header and attestation line, and *no* internal figures. Stamps DRAFT / FINAL per the guardrail. Feeds counsel's filing (Havellin does not file it).
- **Disposition Ledger** — the fiduciary accounting: gross / fees / net to the estate / receipts. Havellin's own service fee never appears here.
- **Appraisal Worklist** — a per-specialist packet of every flagged item (photo, room, condition) to hand each appraiser.
- **Share w/ Counsel** — grants the estate attorney or trust officer *read-only* access to the whole **Estate Inventory** Drive folder (all photos + the workbook), pre-filled from the attorney email. **Revoke** removes it. Named-person access, never a public link — financial folders stay private.

> All inventory valuations are documentation support, not a legal or appraisal opinion — the estate attorney and a credentialed appraiser remain the authority on any estate.

### Where the inventory manifest actually lives

Until 2026-08-24 it lived **only in one browser's localStorage**. The workbook write was one-way and nothing read back, so two devices held two different manifests of the same estate and the last sync overwrote the other wholesale; clearing site data destroyed the record. It now persists to a **MediaStore** blob in the main spreadsheet, beside jobs and estimates, via `saveMedia` / `loadMedia`.

> **It is deliberately NOT in the job's Drive folder.** *Share w/ Counsel* grants read-only access to the whole Estate Inventory folder, and the manifest carries custody logs, appraisal-waiver reasons and upload state — none of which counsel has any business reading. The *workbook* still goes to Drive: it is the manifest's display columns and no internals. A test asserts `saveMediaStore` never touches `DriveApp`.

> **The merge is per ITEM, not per job, and must stay that way.** `_mergeStoreByKey` — the helper the other stores use — keeps whichever whole entry is newer. For an inventory that means two people editing *different items on the same job* still clobber each other. Every mutation stamps `updatedAt` and the merge resolves item by item against it. Removal writes a `deletedAt` tombstone rather than deleting the row, because absence is indistinguishable from "this device has not seen it yet" and a union merge would resurrect every deletion.

> Consequence worth knowing: a tombstoned item still holds its **item number**, and the number is never reissued. A gap in the numbering is the visible record that something was removed.

### Release approval — written, itemised, before anything leaves

The deliverables page commits to *"written approval requests, itemized item by item, before anything of value leaves the property. Verbal approval is never accepted."* Until 2026-09-01 the app recorded the **result** of an approval — *Authorized By* and *Approval Date* on the item — and had nothing that produced the **request**. It does now.

- **Approval Request** on the working header lists everything awaiting approval; the same button on the bulk bar lists just what you have selected.
- Each line carries its photo, reference number, room, quantity, estimated value, proposed disposition and channel, with an **Initial** box, and the document states plainly that nothing on it will be moved, sold, donated or disposed of until the request is returned signed.
- **Keep and Hold are excluded by definition** — nothing is leaving, so there is nothing to ask permission for. So is anything that already carries an approval date. An item with no disposition yet is not a request either.
- A firearm on the list prints its own note: collected from the property by a licensed dealer only, on the representative's authority, and Havellin does not transport it.
- When the signed copy comes back, select those items and press **Record approval**. It writes the signer and the date across every one of them in a single action. Typing a name into twenty rows by hand is how a signed approval ends up recorded against three of them.

### Photographs on the manifest

Every row shows a thumbnail of its item photo, and the Estate Inventory Report and the Approval Request print them. They are fetched **through the Apps Script**, which runs as the Havellin Google account and already holds Drive access, and cached per job on the device.

> **They are deliberately NOT loaded from `drive.google.com` directly, and must not be.** *Share w/ Counsel* grants access with named viewers only — never "anyone with the link" — so Drive demands an authenticated session, and the app is served from GitHub Pages, which makes that a cross-site request. Safari blocks third-party cookies by default. A direct image link would render on desktop Chrome and fail on the iPad, and failing on one device only is worse than failing on all of them: it reads as missing photos on exactly the machine the work is done on. There is a test asserting no such URL survives in code.

> Every upload has always returned a Drive **file id** and the app discarded it until 2026-09-01. It is stored now, and for photos taken before then it is recovered out of the URL that *was* stored — so nothing in the existing backlog is stranded. A photo that still cannot be resolved renders a **category glyph**, never a broken image; the report says how many are missing rather than printing empty boxes at a client.

> **⚠ Requires an Apps Script redeploy.** `main-sync.gs` gained a `getThumbnails` action on 2026-09-01. Until it is redeployed the tab works normally but every photo shows a glyph — and says why, rather than leaving grey squares unexplained.

### Firearms — the authority gate, and the NFA flag

A firearm is the one category where the app deliberately refuses to produce a document. **Nothing reaches the Appraisal Worklist until the personal representative has authorised the transfer to a named licensed dealer, in writing.** Before 2026-08-24 it did not: flagged firearms were grouped under a Firearms Specialist (FFL) and a handover packet printed on day one, which is a printed instruction to release a firearm nobody had authorised releasing.

Authority is recorded on the item itself, using columns that already existed — **Authorized By** and **Approval Date**, with the dealer named in **Channel / Recipient**. There is no separate firearms screen and no new field to learn.

> **Authority and custody are different questions, and the app keeps them apart.** *Authority* — who decides what happens — belongs to the representative on counsel's advice; that is what routing a firearm "to the attorney" means, routing the *decision*. *Custody* — who may lawfully possess and move it — belongs to the dealer, because nobody else may. So FFL routing is correct and stays; the change was adding the gate in front of it. Havellin never transports a firearm: the dealer collects from the property.

> **The awaiting-authority notice is NOT filtered through the appraisal test, and this is deliberate.** `invNeedsAppraisal` answers a valuation question — an intrinsic category with no value yet, or a value at or above $3,000. A $900 shotgun with a value recorded against it is therefore never on the worklist at all, and an earlier version of this feature consequently reported it *nowhere*. The cheap, ordinary firearm is the one most likely to be picked up without a second thought. Do not re-narrow this filter.

**NFA Item** is a tick box on the inventory row, offered only where the category is *Firearms*. It changes nothing about the authority rule — every firearm waits either way — and it protects Havellin from nothing, since Havellin never takes possession. It exists for three narrower reasons, and they are worth knowing so nobody "simplifies" it away:

- **The dealer needs telling in advance.** Not every licensed dealer may take an NFA item, so an unannounced one can mean a wasted collection trip.
- **It is a closing-timeline item.** Transferring a registered NFA item to an estate runs on an ATF Form 5 and takes months, not days. The representative and counsel should hear that on day two, not at handover.
- **Recognition.** A suppressor reads as a plain metal tube and a short-barrelled rifle as a small gun. The risk is not mishandling one — it is never categorising it as a firearm at all, in which case the authority gate never fires for it. This is why the Phase 1 crew checklist names these items by appearance rather than by law.

NFA-flagged items print on their own notice on the Appraisal Worklist, separate from the awaiting-authority list, carrying the Form 5 timeline warning. An item appears there whether or not it has been authorised — the dealer needs telling regardless.

> Still open and flagged for counsel: the app has no view on *which* dealer may take an NFA item, and does not attempt one. It reports; the decision is the representative's and the dealer's.

## 11. Job Plan & Log Hours

**Tab: Job Plan** → select job. Generates once the estimate is approved. For labor-based services it runs the phase playbook (Phase 0 Pre-Job → Phase 4 Close-Out), vendor & partner sourcing, and daily hours logging. For **Home Prep for Sale** it is the streamlined vendor/budget/checklist view described in Section 6c.

> **Room cards run in walkthrough order** — Entry & Living, then Kitchen & Utility, then Lifestyle Rooms, and so on: the same top-to-bottom as the Build Estimate grid and the client estimate, so a room can be found in one document by its position in the other. Both phase grids read the same order. Until 2026-08-03 they were sorted by complexity descending, which matched nothing else in the app and read as random. A room saved without a grid position keeps its stored place at the end rather than dropping out of the plan.

The plan header shows the **documentation level** on estate/formal jobs. **Chain of custody is mandatory** when that level is Formal or the job is any probate — it is driven by the documentation level (§4), *not* the Premium-estate rate. Estate/probate jobs also carry the §733.604 documentation stream.

### Staffing the job — do this before any hours exist

Staffing is an explicit step, and it **gates hours logging**. The window for it is the wait between sending the agreement and the deposit landing: you know the job is happening, and you now find out who is actually free.

1. Open the job's **Job Team & Hours** roster on the Job Plan. It renders the crew the *approved estimate* was priced for — not a flat six slots — so you can't quietly log hours for specialists nobody quoted. A concierge row is always there, plus an optional second concierge row.
2. Confirm each person's availability, then name them. Any planned slot still empty is flagged **"needs a name"**.
3. Need a body beyond what was quoted? **+ Add a specialist beyond plan**. Those rows carry a *beyond plan* tag, because crew above plan raises cost against a fixed quote and the projection will flag it.
4. Hit **Save & Confirm Job Team →**.

> **Two separate gates, and only the second one stops work.** Confirming the team is the first. The second is the **deposit**: hours cannot be logged against a job that hasn't paid. A confirmed team on an unfunded job keeps its confirmation and says plainly that the deposit is what's missing — staffing ahead of payment is deliberate, starting work is not. If the deposit is part-paid the bar names what has arrived and what is outstanding.

Only once *both* hold does **Save Hours Entry** become available. Until the team is signed off the hours boxes are inert on purpose — the roster is a staffing sheet at that point, not a timesheet, and doing both in one confused pass is how the wrong person ends up with the hours.

- **Placeholders.** *Contractor TBD* (specialist) and *Contractor — TC* (an outside concierge) stand for a confirmed *need* with an unconfirmed *person*. Allowed — you often have the headcount before the names — but they cost at a placeholder rate, so the app says out loud that margin on the job is an estimate until they're named.
- **Confirming locks the named members.** Empty slots stay open, so someone can still be added mid-job.
- **Revise team** reopens it — but anyone who has already logged hours **stays locked**. You can add to a team mid-job; you can never retroactively remove someone who worked. Hours can't be logged again until the team is re-confirmed.
- **One person, one role, one date.** A name taken on the roster disappears from the other selects, and a duplicate is refused outright at save. Only the placeholders above may legitimately repeat.

### Log Hours (labor jobs)

One entry per working day: **date**, an **activity summary**, and **hours against each crew member** on the confirmed roster. Roles come from the roster, not a dropdown — the concierge rows log as TC (including the second concierge), the specialist rows as PS. Hours accumulate against the estimate and drive the forward-variance projection. Log daily — do not batch at end of job.

### Vendor & Partner Sourcing

Assign a directory vendor to each estimate line and logged category, set status, and record the actual quote. On a standalone Home Prep job these actuals feed the 30% GC fee on the midpoint and final invoices. On every other service they carry no Havellin fee at all — they are recorded so the client's pass-through costs and the job's true margin are known.

> **Coord hrs — optional, and it bills nothing.** Beside each vendor's actual quote is a **Coord hrs** box with the estimate's figure next to it (*est 3.0*). Roughly how long that vendor actually took to coordinate. It exists because the touch counts in §5d-i are currently judgement and nothing in the app could ever check them — the hours log records a date, an activity note and who worked, with no way to attribute an hour to *this mover*. A few real jobs of these and the counts tune themselves off evidence instead of intuition. **Fill it in when it's easy and skip it when it isn't**; nothing depends on it and no gate consults it. It is **not billed, and cannot be** — this is the part worth understanding, because it looks like it should be. The client is billed off your *logged hours*, which already contain the time you spent phoning that mover; it simply isn't labelled. So this is a breakdown of hours already logged and already invoiced, not extra hours. Feeding it into pricing would bill the same time twice. Once anything is recorded, a line at the foot of the section totals it: *estimated 8.5 hrs · recorded 5.5 hrs across 1 vendor*. Not shown on a standalone Home Prep job, which bills no hours at all and therefore has no estimate to check against.

> **End-of-job logistics are asked once.** The Job Plan carries five logistics slots — donation organization, junk removal / hauling, dumpster rental, move-out / final cleaning, document shredding. Any of those already priced on the estimate through the *End-of-Job Logistics* card (§5d) arrives here as an estimate line to source against, and drops out of the Job Plan's own list rather than appearing twice under a slightly different name.

**A vendor you didn't know you needed mid-job** is added the same way: pick the category, assign the vendor, log the quote. It becomes a pass-through cost on the client's invoice at cost like any other. If it also changes Havellin's scope or hours, that is a **Change Order** (§9) — the vendor line alone is not one.

## 12. Invoices

**Tab: Invoices** → select job, then pick a **Stage** (Deposit / Midpoint / Final). *Deposit* is the 50% estimate basis. *Midpoint* brings the cumulative collected to 75% and trues vendor & home-prep fees to the actual quotes logged in the Job Plan (labor stays on estimate until hours are fully logged). *Final* trues labor to logged hours, fees to actuals, and adds any approved Change Orders.

> **Most invoices need no PIN.** Deposit and midpoint are formulaic from the approved estimate — nothing to review, so they print straight out and show *No approval required*. Only the **final** asks for a manager PIN, and only when it lands more than **±15%** away from the estimate; the banner names the percentage and the direction. Approved Change Orders are excluded from that comparison, since the client already agreed to those separately. An approval is per stage and per job — re-picking the stage asks again.

> **The final invoice is blocked outright until hours are logged.** On a time-and-materials labor job with no hours recorded there is no PIN, no PDF and no email — a manager cannot unlock it, because nobody can approve a total that has nothing behind it. The final bills labor at the hours actually worked, so the Job Plan timesheet *is* the invoice. This catches a dry run especially: skip the daily logging on a practice job and the final simply will not issue. Log the hours, then reprint. (Fixed-price and fee-only jobs are exempt — their labor total does not come from the log.)

A softer version fires when crew hours are logged with **no concierge hours** against them: the invoice still issues, with a warning naming the dollar value of concierge time it is probably missing. The concierge is on site for every crew hour, so that pattern nearly always means the log is incomplete rather than that nobody supervised.

That describes a **time-and-materials** job, which is the default. On a job quoted **fixed price** (§5c) the flat fee *is* the Havellin services total — the stages split that number and labor is never trued to logged hours. Vendor and home-prep fees still true up to actual quotes either way, since those stay pass-through at cost.

> **Every invoice you print is filed to Drive automatically**, into the job's **Invoice** folder, named per stage (`HVL-xxxx_Invoice_Deposit.html` and so on) so the three never overwrite each other. Reprinting a stage replaces its own copy, which is what you want when a figure is corrected and reissued. Until recently no invoice was retained anywhere in any form.

The invoice stage advances by itself as the job progresses, reading the payments you've recorded (§8): no deposit recorded keeps it on *Deposit*, a funded deposit moves it to *Midpoint*, and a recorded midpoint payment moves it to *Final*. Previously it read a flag that nothing ever set, so every funded job stuck on the Midpoint stage and the Final invoice could only be reached by picking it from the Stage selector by hand.

> **The expedited-delivery premium now appears on the midpoint and final invoices.** On a rush job (§5, §16) the 20% premium shows as its own line on all three stages. It previously appeared on the quote, the client estimate and the deposit invoice, but was dropped from the midpoint and final — so a rush client was asked for a deposit that included the premium and then billed a total that didn't, and a job that landed exactly on its estimate printed a phantom *"came in under estimate — credit applied"* line for the premium amount. If you have invoiced a rush job before now, re-print its midpoint and final stages and check the totals against what the client agreed.

The premium's *rate* is pinned to the estimate the client accepted, so changing the standard 20% later never reprices a live job. The *amount* trues up with each stage like every other fee, so the final invoice charges the premium on the services actually delivered. It is never charged on an approved Change Order — those are priced when they're agreed — and on a fixed-price quote it is already inside the flat fee.

## 12a. Contractors (Crew Directory)

**Tab: Contractors.** The people who actually work the jobs — concierges and property specialists. This is where the crew that appears in every estimate's staffing dropdowns and every Job Plan roster comes from. Unlike Vendors and Referral Partners, contractors live in the *main* job sheet.

- **Role** — TC (Transition Concierge) or PS (Property Specialist).
- **Rate ($/hr — your cost)** — what we *pay* this person. It is internal, never billed, and it is what makes the margin panel real: a named person is costed at their own rate rather than a placeholder. Keep it current — a blank or stale rate is the single most common reason a job's margin reads wrong. See Section 16.
- **Status** — Active · Vetting · Inactive. Only Active crew appear in the staffing dropdowns.
- **Client-facing bio** — concierges only. Two or three sentences; it appears on the client estimate, so write it for a client, not for us.
- **Specialty / notes** — internal ("strong on furniture, great with families, available weekends"). This is what you read before staffing a difficult estate.
- **Search** the crew by name, phone, email, or specialty, and **tap to call / text / email** straight from the card — this is the field-use path when you need a body tomorrow morning.
- **Quick edit** changes contact details only; **Full edit →** opens the whole record (role, rate, status, bio, notes).

> A contractor's own rate always wins over the Settings placeholder rates. The four Settings values exist for the unnamed slots you staff *before* you know who's coming — once a real name is on the roster, that person's record is the cost.

## 13. Vendor Directory

**Tab: Vendors.** The curated network of trades and service providers (painters, landscapers, movers, appraisers, haulers, etc.), stored in its own Google Sheet. Work each vendor through its lifecycle: *Identified → Contacted → Vetting → Active* (with *Backup* and *Do Not Use* as terminal states). Only **Active** vendors can be assigned to a job in the Job Plan sourcing. Status is set with the **color-coded dropdown on the card** (under the vendor's category), which also shows the rating beside it — there is no separate status badge.

- **☎ Log contact** — type what you discussed in the note field, then log it; this stamps today as the last-contacted date and stores the latest contact note (used for follow-up cadence). Logging the *first* contact auto-advances an *Identified* vendor to *Contacted* (it never moves a vendor already at Vetting/Active/etc.). The last-contacted date + note show in a highlighted bar right under the log box, so you see the prior touch before you call. Last-contacted is set only this way — it is read-only in the edit form. The old bulk-imported Google review is no longer shown or editable; what surfaces is the star rating earned from completed jobs.
- **Search** — free text across name, contact, phone, and category. Multiple words are AND-ed (so *"west palm mover"* narrows rather than widens), and a numeric query matches the phone number however it's punctuated.
- **Tap to call / text / email** straight from the vendor card. In the Job Plan sourcing, an assigned vendor's phone is a tap-to-dial link too — you're usually on site when you need them.
- **Quick edit / Full edit** — *Quick edit* is contact details only, saves just what you changed, and is the one to use from a phone. *Full edit →* opens the complete record below.
- **Edit (full)** — intake/vetting fields: category group, category, contact, pricing structure, ballpark, minimum job, lead time, COI on file, license, service area, notes.
- Performance is rated post-job (a rolling average), kept separate from the curated fields so a vetting edit never wipes performance history.
- **Delete (manager PIN)** — inside the Edit form, *Delete this vendor permanently* removes the row from the app *and* the spreadsheet. It's PIN-gated (the same manager PIN as approvals/client-delete) and reserved for bulk-import errors or defunct companies — not a substitute for *Do Not Use*, which is for real vendors you're retiring. A vendor with job history (a rating or completed jobs) is blocked from deletion and pointed to Do Not Use instead, so a delete can't orphan performance history.

> **Adding a vendor: one press, one row.** The Save button disables itself and reads *Saving…* while the write is in flight, and an `addVendor` is deliberately never queued or auto-retried — a re-send would append the row a second time — so a second press while the first is running is the one way a duplicate reaches the sheet. It happened on 2026-08-27 against a slow web app. Three guards now: the disabled button, a refusal to add a name the directory already holds (one firm is one row; the **name** is what resolves a vendor to a job, so two rows under one name break every later lookup), and a 45-second watchdog that re-enables the button, reloads the directory and says the row may already have been written rather than leaving the form stuck on *Saving…*. A failed add says the same thing — a failed POST never reveals whether it reached Google, so "failed" on its own is what invites the duplicating press.

### 13a. Category Group & Category (how a vendor is filed)

Every vendor is filed under a **Category group** (required) and a **Category**. The five groups are the fixed top-level taxonomy; categories live underneath them and are *open-ended* — you add a new one just by typing it.

- **The group dictates the category.** Pick a group first; the Category field then offers only that group's existing categories. This prevents nonsensical pairings (e.g. a mover filed under "Document Shredding").
- **Adding a new category is self-serve.** If none of the group's categories fit a new specialty vendor (e.g. a stone/hardwood *Floor Refinishing* outfit), just type the new category name — it's created under the selected group. No developer/code change needed.
- **The group decides which estimate menu — and fee — the vendor feeds** (see table). A category added under a group automatically shows up in that group's estimate menu and, once a vendor in it is **Active**, auto-populates the matching Job Plan sourcing slot.

| Category group | Feeds estimate menu | Fee |
| --- | --- | --- |
| Property Preparation | *Property Preparation* card → the Home Prep list (§5e / §6a) | **30% GC / Site Management on a standalone Home Prep job only.** Bundled onto a labor job: at cost, no fee. |
| Asset Liquidation & Valuation | Its own card → third-party vendor list (§5d) | At cost — no fee |
| Disposal & Waste Management | Its own card, and several of its categories also appear on the *End-of-Job Logistics* card | At cost — no fee |
| Moving & Logistics | Its own card → third-party vendor list | At cost — no fee |
| Professional Services | Its own card → third-party vendor list | At cost — no fee |

The sixth estimate card, *End-of-Job Logistics*, is not a Category Group — it is a curated list of the five slots the Job Plan asks for, drawn across the groups. A category can therefore appear on two cards; adding the line from either one produces the same vendor line.

> What stays fixed: the five groups and the group→menu routing above. Everything below them — the categories — is self-serve, so onboarding a new type of vendor never requires a code change.

## 14. Referral Partners

**Tab: Referral Partners.** A CRM for the network of attorneys, realtors, trust officers, and Douglas Elliman agents who refer business. Mirrors the Vendor Directory: its own Google Sheet + Apps Script, kept apart from job data.

- **Add / Edit a partner** — first & last name, type, firm, primary contact, phone, email, website, owner, and notes. Type, phone, and email are required. Owner is one of Anthony Graziano Sr · Ashley Jerome · Anthony Graziano Jr.
- **Search · tap-to-contact · Quick edit** — the same field pattern as the Vendor Directory: free-text search across name, firm, title, phone and city (multi-word AND-ed, numeric queries match the phone), tap-to-call/text/email on the card, and a **Quick edit** for contact details with **Full edit →** as the escape hatch.
- **Status** runs the outreach lifecycle *Identified → Contacted → Intro Meeting → Active Partner* (with *Dormant* and *Do Not Use*). It's set with the **color-coded dropdown on the card** (under the partner's type, beside the priority badge) — the same pattern as the Vendor Directory. Partners are retired by status rather than deleted.
- **Log outreach** — stamps last-contacted to today, and auto-advances a still-*Identified* partner to *Contacted* (never downgrades one further along). The last-contacted date shows in a highlighted bar right above the button.
- **Dormancy nudge** — an engaged partner with no outreach or referral in 90 days is flagged "Needs Nudge."
- **Leaderboard** — jobs are attributed to a partner when a professional referral source is linked at intake, so you can see who sends the most business.
- **Delete (manager PIN)** — inside the Edit form, *Delete this partner permanently* removes the row from the app *and* the spreadsheet, PIN-gated like the vendor delete. Reserved for bulk-import errors / defunct contacts, not a replacement for *Do Not Use*. A partner with referrals attributed to them is blocked from deletion (steered to Do Not Use) so the leaderboard history stays intact.

## 15. Drive Folder Reference

| Subfolder | Contents | When populated |
| --- | --- | --- |
| Walkthrough Notes | Voice/typed notes per room (.txt) | During estimate walkthrough |
| Estimate | Internal cost breakdown *and* the client-facing estimate | Both automatic on approval |
| Agreement | The **approved** agreement | Automatic on manager approval. **A signed copy is not retained** — there is no upload path for one until DocuSign lands. |
| Invoice | Every issued invoice, one file per stage, plus cheque photos for recorded payments | On print / on recording a payment |
| Estate Inventory | All room + item + collection photos, appraisal docs, and the inventory workbook — the shareable package | During active job |
| Change Orders | Approved change order documents | As needed |

## 16. Rates & Fees Reference

> **Billing basis.** Every service bills **time-and-materials** by default — hours × rate, trued to what's logged. The concierge may quote any individual job as a firm fixed price instead, *except* **Probate** and **Contested Probate**, where the option is withheld: those expenses are reviewed by the court, and a flat fee that can't be tied back to logged time is what gets questioned. Home Prep for Sale is neither — it's fee-only on managed vendor spend (§6).

### What we bill the client

| Item | Standard | Premium Estate |
| --- | --- | --- |
| Transition Concierge | $150/hr | $185/hr |
| Property Specialist | $100/hr | $125/hr |
| Service Management Fee (third-party vendors) | **None — at cost** | **None — at cost** |
| Vendor coordination (per vendor line) | **touches × 0.5** = 0.5–4.0 concierge hrs, billed at the rate above (§5d-i) | Same hours, premium rate |
| Home Prep GC / Site Management Fee | **30%** — standalone engagement only | 30% |
| Home Prep bundled onto a labor job | **None — at cost**, plus 0.5–2.0 coordination hrs per trade | **None — at cost**, plus the same hours |
| Moving Materials | Cost + 25% | Cost + 25% |
| Preferred Client Discount | Havellin labor only · **max 15%** | Havellin labor only · **max 15%** |
| Expedited delivery (rush order) | +20% of Havellin services | +20% of Havellin services |
| Fixed-price contingency | +20% on the hourly basis | +20% on the hourly basis |

The rush premium is charged on the Havellin services total after any Preferred Client Discount, and never on vendor costs. Hourly rates stay as published — the premium is a separate line, so a client comparing us to another firm sees standard NASMM-range rates plus a clearly-labelled expedite.

**Order of operations on the price**, because a discount and an expedite on the same job is a fair question to ask:

```
Havellin services total → less Preferred Client Discount (labor fees only) → plus 20% expedited delivery on what's left → plus vendor costs at cost = total project estimate
```

The discount comes off first, so the premium is never charged on money already discounted away and the discount is never computed on the premium. On a fixed-price quote the 20% contingency is applied last, to a figure that already contains both.

> **The margin panel is hidden on Build Estimate as of 2026-08-02** — it was too much detail for the tab the estimate is built on. Nothing was deleted and nothing changed about how margin is calculated; the panel and its underlying figures are still computed on every recalculation. Two consequences to know about: the *Price at 30% Margin* / *Above Reference* pair is no longer in front of you when you set a discount, and neither is the warning that fires when the 50% deposit stops covering job cost. The **15% discount cap** is the guardrail that remains, and it is enforced on both routes to a discount. When it is read, read it for what it is: an indicative profitability readout with a flag on it, **not a discounting tool**. *Price at 30% Margin* is a reference line at an admittedly arbitrary margin, and *Above Reference* is simply the distance to it. Neither is an allowance to spend. In practice a job that needs that much discount is one to walk away from rather than one to price down to.

### What we pay — labour cost rates (internal, never billed)

> **These are a different set of numbers from the table above, and confusing the two is expensive in both directions** — billing a client at cost, or paying a contractor at the billing rate. Cost rates feed the margin panel only. They are Settings knobs (Section 2); the values below are the defaults.

| Role | Cost | Applies to |
| --- | --- | --- |
| Founder concierge | $100/hr | Anthony Sr, Ashley |
| Contractor concierge | $60/hr | An outside concierge — the *Contractor — TC* placeholder slot |
| Contractor PS — Standard | $30/hr | The *Contractor — Standard* placeholder slot |
| Contractor PS — Senior | $35/hr | The *Contractor — Senior* placeholder slot |

**Cost follows the person, not the job title.** Founders and contractors are paid differently for the same role, so a named individual in the Contractors directory is always costed at *their own* rate (§12a). The four rates above cover only the unnamed placeholder slots you staff before a specific person is assigned.

If a concierge can't be resolved to a person at all, the margin panel costs them at the **founder** rate — deliberately the most expensive assumption, so margin is never overstated — and says on the panel that the figure is an assumption. Assign the concierge, or set their rate on the Contractors tab, to replace it with a real number.

## 16a. Win / Loss

**Tab: Win / Loss.** Reads the *client's* decision, not ours. A job counts as won when it has been marked Won on the dashboard — or, for jobs that predate that step, when it reached Active or Closed under the old model, so the existing history isn't rewritten.

What that changes in practice: a job sitting at **Approved — Awaiting Client** is *not* in the won column. It used to be, which meant the win rate counted internal approvals. Expect the number to read lower and truer than it did.

Loss reasons are captured at closeout — price, scope, timing, unresponsive, competitor, other — with an optional note (competitor name, price gap). *Closed — Deposit Retained* jobs stay on the won side, because they produced revenue; keeping them separate from ordinary losses is why the two statuses exist.

## 17. Manager PINs

Required for: estimate approval · estimate denial · agreement approval · **a final invoice more than ±15% off the estimate** (§12 — deposit and midpoint invoices need none) · deleting a client, vendor or partner.

Not required for a Change Order (§9) — that one is settled with the client, not internally.

**Each person has their own PIN, and the approval is recorded under whoever typed it.** Previously there was one shared code and the approver was stored as a fixed name, so an estimate Ashley approved was filed under Anthony's — worse than recording nothing, because it read as evidence. Contact management for current PINs.

> **A PIN here is attribution, not security.** The app is a single file served from the web, so anyone who views the page source can read the PINs. It raises the bar against the wrong person clicking approve; it does not stop anyone determined. Real authentication needs a server and is a separate project. Don't treat a PIN as protecting anything valuable on its own.

---

Havellin Palm Beach · 515 N Flagler Drive, Suite 350, West Palm Beach, FL 33401 · Internal use only · Not for distribution · v2026.08 · reconciled 2026-08-03
