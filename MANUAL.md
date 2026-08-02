# HAVELLIN PALM BEACH

*Operations Manual · Internal Use Only · v2026*

---

## 1. Overview

Browser-based app used by all Havellin staff. No installation. Data syncs across devices (iMac ↔ iPad) via Google Sheets. Documents and media auto-upload to Google Drive. Some approvals require a manager PIN — see §17 for exactly which. Client signatures and payments are recorded **by hand**: DocuSign, Stripe and QuickBooks are not built (§3).

**Navigation tabs (in order):** Win / Loss · Client Dashboard · Client Intake · Build Estimate · Client Estimate · Agreement · Job Plan · Inventory · Invoices · Contractors · Vendors · Referral Partners

> The app opens on the **Client Dashboard** even though Win / Loss is the first tab.

Interface notes: the header + navigation bar stay pinned to the top while you scroll; dialogs (e.g. Settings) scroll internally so their buttons are always reachable; and reference dropdowns (categories, dispositions, types, roles) are alphabetized — scale/pipeline lists (Condition, Priority, statuses, service tiers, Year) keep their meaningful order.

**Phone & field use.** Every tab works on a phone — the nav becomes a scrolling strip, dialogs open as bottom sheets, and grids stack. The three directories (Contractors, Vendors, Referral Partners) are built for standing in a driveway: search, tap-to-call/text/email, and a **Quick edit** for contact details. **Build Estimate** is the deliberate exception — its room tables are desk/iPad work, and they scroll sideways rather than reflow.

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

**Documentation level** — choose *Auto*, *Standard*, or *Formal — court & attorney grade*. Auto resolves by service type (Contested Probate = Formal, everything else Standard). Formal turns on the item-appraisal guardrails and makes chain-of-custody tracking mandatory. This is a *documentation* decision, kept separate from the Premium-estate *rate* toggle (§5c) — a premium job is not automatically a court-grade one, and vice-versa.

**Referral source:** Intake records how the job came in. Professional referral types (attorney, realtor, trust officer, etc.) link to a specific **Referral Partner** from that directory, so referrals are attributed on the partner leaderboard. Personal sources (family, friend, existing client) use a free-text "Referred by" name instead.

Drive folder structure created automatically per job:

```
Estate Inventory · Walkthrough Notes · Estimate · Agreement · Change Orders · Invoice · Job Log
```

Room photos, item photos, collection photos/appraisals, and the inventory workbook all live in one **Estate Inventory** subfolder — the single package you share with counsel (§10a). Financial folders (Estimate, Agreement, Change Orders, Invoice) stay private.

## 5. Estimate (Labor-Based Services)

**Tab: Build Estimate** → select job from dropdown. This section covers the labor-based services (Downsizing, Cleanout, Estate Settlement, Probate). Home Prep for Sale uses the fee-only flow in Section 6.

### 5a. Walkthrough Notes & Voice

During the site visit, use the **📝** (notes) and **🎙** (voice-to-text) buttons in each room row. Voice transcribes in real time into the notes field. Hit **Save Notes** — the note saves with the estimate and uploads as a `.txt` file to the job's **Walkthrough Notes** Drive folder automatically.

> 📷 Photos are NOT captured during the estimate stage. Photography happens only after job activation.

### 5b. Room Scoring

Check each room to include it (auto-scores 3/3). Set Volume and Complexity on a 1–5 scale:

| Score | Volume | Complexity |
| --- | --- | --- |
| 1 | Nearly empty | Simple / standard items |
| 3 | Moderately filled | Mix of standard and care items |
| 5 | Completely full | High-value / fragile / specialty handling |

Check **Special Items** if the room contains artwork, antiques, or items requiring specialty care. Hours and a working-day timeline generate automatically as you score — the per-room figures shown are *hands-on handling only*, with job-level work (triage, documentation, haul-out, vendor and move coordination) surfaced as one separate *Project coordination & logistics* line so the room breakdown plus that line always equals the totals. How the totals become billed concierge and specialist hours is Section 5i.

Room sections launch **collapsed** so the estimate opens compact — open each section as you walk that part of the house. Use *Expand all / Collapse all / Hide empty* at the top of the assessment; each section header shows a live in-scope count. Reopening a scored estimate auto-reveals the sections that have rooms in scope.

### 5c. Job Settings

- **Premium Estate** — TC $185/hr, PS $125/hr (vs. standard $150/$100). Also adds a flat 25 hrs of specialty coordination (auction house, appraisers, wine/art logistics).
- **Property Specialists** — six **tick boxes**, one per specialist. Crew is auto-ticked to the smallest number that lands the job inside the 10-working-day target (floor 2, cap 6); tick more to price a bigger crew, up to the cap.
  > **The estimate says how many specialists, never which.** These were dropdowns naming a person or a rate tier per slot — a question nobody can answer three weeks before the job, and the wrong question to ask at estimate time. Naming people happens on the **Job Plan** once the job is Won (§11), where the roster seeds from this count and every row asks for a name. Costing at estimate stage now assumes the standard contractor rate for every specialist; the margin panel firms up as the real people are named.
  > **Crew size moves the price.** Under the working-supervisor model a bigger crew finishes sooner, so the concierge is on site for fewer hours — which makes the estimate *lower*, not higher. That is correct, but it means a crew left over from a larger job will quietly discount this one, so the app flags any crew above the recommendation. Do not carry a crew size over between estimates. See Section 5i.
- **Difficult access** (stairs, no elevator) — **+15% to the hands-on work pool only**. It makes the physical work take longer, which lengthens the job, which lengthens concierge presence automatically. Lifting the concierge line as well would double-count it.
- **Multiple heirs / decision-makers** — **+20% to off-site coordination only**. More calls and sign-offs, not more boxes. Baked into contested-probate rates already, so the toggle greys out on those jobs.
- **Rush order** — adds a flat **20% expedited-delivery premium** to the Havellin services total, shown to the client as its own line. It is a premium on the total, deliberately *not* a markup on the TC/PS hourly rates: rates outside NASMM norms read badly to a client comparing quotes, and a named line is clearer and easier to defend. It is also literally what they're buying — a second concierge and a larger crew working in parallel to compress the calendar. Applied *after* the Preferred Client Discount, so the discount is never computed on the premium. Vendor costs are excluded (pass-through at cost doesn't get more expensive because we moved faster). Works on both hourly and fixed-price quotes.
- **Quote as a fixed price** — every service bills **time-and-materials by default**; the concierge may switch an individual estimate to a firm flat fee. The amount prefills from the suggested fee (hourly basis + contingency buffer) and is fully editable. **Not available on Probate or Contested Probate** — the toggle is disabled there, because those bill on actual logged hours for Personal-Representative and court defensibility. Estate Settlement is a private engagement with a family or trustee, so a flat quote *is* available on it.
- **Preferred Client Discount** — percentage off Havellin labor fees only, **capped at 15%**. The same cap applies to *Offer Discount* on the Client Estimate tab (§7), which is the route to use once the estimate has already gone out.
- **Moving Materials Package** — None, or an Estate tier (Basic $500 · Standard $750 · Premium $1,500) or Downsizing tier (Basic $200 · Standard $350 · Premium $550)

### 5d. Moving Materials & Third-Party Vendors

Add third-party vendors with estimated costs. Vendor costs are estimates only — actual invoices are billed directly to the client at cost. **Havellin adds no fee to them.**

> **No coordination fee on third-party vendors, as of 2026-08-02.** Vendors are billed to the client directly at cost and Havellin adds nothing on top. The 15% Service Management Fee was removed because the concierge time spent sourcing, quoting, scheduling and supervising a vendor is *already billed hourly* — the engine bills off-site coordination as concierge hours — so the fee was a second charge for the same work, and on probate it was a percentage markup on a third-party invoice in front of a court that reviews the expenses. **Standalone Home Prep is the exception and is unchanged:** it bills no hours at all, so its **30% GC fee** is the entire revenue for that engagement. The rule: a coordination fee applies only where the coordination is not already billed by the hour. An estimate quoted before this keeps the rate it was quoted at.

The vendor-type dropdown lists the standard estate/clearing service types plus, under a **From directory** group, any category from the Vendor Directory in the estate-side groups (Asset Liquidation, Disposal, Moving, Professional Services). So a new category added to the directory shows up here automatically — see Section 13a.

### 5e. Home Prep for Sale (as an add-on)

On a labor-based job you can also check **Include in estimate** in the Home Prep section to add show-ready prep as an add-on. Prep vendors carry a **30% GC / Site Management Fee** (not the 15% vendor SMF). When Home Prep is the *only* service, use the standalone flow in Section 6 instead.

### 5f. Notable Collections

Add significant asset collections (artwork, jewelry, antiques, silver, etc.) requiring disposition planning. Set name, estimated value, quantity, and a proposed disposition. The disposition list is now vendor-mapped — each option scopes the Job Plan partner picker to the matching Vendor Directory category:

Appraise · Auction House · Coin / Currency Buyer · Consignment · Donate · eBay Store · Estate Sale · Firearms — Licensed FFL · Gold & Silver Buyer · Jewelry / Watch Buyer · Online Auction · Rare Books / Manuscripts · Replacements.com · Specialized Dealer · Other.

Collections appear in the client-facing estimate under *Notable Collections — Disposition Plan*, and can be pulled into the **Estate Inventory** manifest on site (as a lot or itemized — see §10a).

**The disposition you pick adds hours.** Each option carries its own concierge and specialist time, split by a single rule: *if the specialist comes to the property, the concierge is there; if the items go out to them (shipped, dropped off, consigned), the concierge's time is phone and paperwork.* So an appraisal, a dealer visit, or an FFL firearms handoff books real **on-site presence** — it shows on its own summary line and counts against the working-day target, because standing next to an appraiser is fixed time no crew size absorbs. Online auction, eBay, Replacements.com and consignment book coordination only. A ten-collection estate is a materially longer job than a two-collection one, and the timeline now says so.

### 5g. Vehicles & Watercraft

Capture cars, boats, motorcycles, and other vehicles as estate assets. Add each by description, then fill in the detail panel: **Type** (Car, SUV/Van, Truck, Motorcycle, Boat, Personal watercraft, RV, Trailer, Golf cart, ATV/UTV, Other), **Year**, VIN/HIN, mileage/hours, condition, and two flags — **Collector / classic** and **Title located**.

- **Ordinary vehicles** are valued from a book value (KBB / NADA) as of the date of death — Havellin can do that in-house.
- **Collector / classic** vehicles (and boats) route to a Vehicle / Boat appraiser.

Vehicles ride along in the estimate snapshot (they don't affect the labor estimate) and can be pulled into the Estate Inventory on site (§10a).

### 5h. Saving

Hit **Save & Preview Client Estimate**. Estimate saves and syncs to Google Sheets, then opens in the Client Estimate preview. Editable until approved.

### 5i. Hours, Crew Size & Timeline — how the numbers come out

The estimator does **not** compute concierge hours and specialist hours as two independent buckets. It computes one pool of hands-on work and one pool of coordination, then works out who clears the first — and the answer includes the concierge, because **the concierge is on site for every crew hour and works alongside the crew.** Understanding this is the difference between trusting the number and second-guessing it.

| The engine produces | Meaning |
| --- | --- |
| **Hands-on work pool** | Total physical hours in the house — sorting, packing, staging, haul-out — regardless of who performs them. *This is not the billed PS figure.* |
| **Off-site coordination** | Attorney, vendor, heir, and disposition contact that happens away from the property, around the crew days. |
| **Fixed on-site presence** | Concierge time at the property that isn't pool work — attending appraisals, dealer visits, FFL handoffs (§5f). |

With a crew of *n* specialists and the concierge working at production rate **α** (Settings, default 50%), the pool is cleared by **n + α** pairs of hands:

| Quantity | How it is derived |
| --- | --- |
| Concierge hours on site | `work pool ÷ (n + α) + fixed on-site presence` |
| Billed specialist hours | `n × (work pool ÷ (n + α))` |
| Billed concierge hours | `concierge hours on site + off-site coordination` |
| Duration in working days | `concierge on-site hours ÷ 7`, floored at the service mobilization minimum |

The concierge's own share of the pool is **not billed twice** — it moves from the specialist line to the concierge line. That is why a 100-hour pool does not bill as 100 PS hours. Billable hours are rounded up to whole hours, and the fees are recomputed off the rounded figures so hours × rate always reconciles on the client estimate.

**Reading the Estimate Summary panel** — the rows map straight onto the model:

| Summary row | Is |
| --- | --- |
| Hands-on work pool — all roles↳ Difficult-access uplift | The pool, before it is divided. The uplift is +15% here and nowhere else. |
| Concierge on site — works the crew days↳ Specialist visits attended | The concierge's presence at the property. The indented line is the fixed portion (appraisers, dealers, FFL) and only appears when collections call for it. |
| Concierge off-site coordination↳ Heirs / premium specialty coordination | Coordination away from the property. The +20% multiple-heirs uplift and the flat +25 premium specialty hours land here. |
| **Total Transition Concierge hours** | On site + off-site. This is what bills at the TC rate. |
| **Total Property Specialist hours** | The crew's share of the pool. This is what bills at the PS rate. |

**Crew sizing.** The app starts at 2 specialists and adds one at a time — to a maximum of 6 — until the job lands inside the **10-working-day target**. Each service also carries a mobilization floor no job goes below: Downsizing 2 days · Downsizing & Move / Cleanout / Estate Settlement / Probate 3 days · Contested Probate 4 days. A crew day is **7 productive hours** (travel, setup, and breaks are already excluded).

Fixed on-site presence is added flat, never divided — six specialists don't make an appraisal go faster. A larger crew still helps indirectly: it shrinks the pool-derived share of the concierge's day, which buys back calendar room for the fixed hours.

**How far the core team reaches.** The default 2-specialist crew plus the concierge covers a surprising amount of house. At standard 3/3 room scoring, with no difficult access and no attended specialist visits, a third specialist isn't needed until roughly:

| Service | 2 specialists hold the 10-day target to about |
| --- | --- |
| Downsizing | 11,900 sqft |
| Home Cleanout | 8,000 sqft |
| Estate Settlement | 5,400 sqft |
| Probate Estate Settlement | 4,700 sqft |
| Contested Probate Estate Settlement | 3,600 sqft |

Indicative, not a rule — the app does the real arithmetic per job. Heavier room scoring, long tenure, difficult access, and attended collection visits all pull these down; difficult access alone by roughly 13%. The pattern is what matters: the heavier the documentation load, the sooner the core team runs out of calendar.

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

- Select the job (Service Type = *Home Prep for Sale*). The estimator hides room scoring, crew, and labor entirely — the **Home Prep for Sale — Managed Vendors** card sits beside the Job details.
- Add each prep item/vendor with an estimated cost. The 30% fee is shown per line and in total. The item dropdown lists the standard prep tasks plus, under a **From directory** group, any *Property Preparation* category from the Vendor Directory — so a newly-added prep specialty (e.g. Floor Refinishing) appears here automatically (Section 13a).
- **Scope notes:** each vendor line has a scope field — capture on the walkthrough exactly what to tell that trade (e.g. "5 bedrooms + hallway, walls & ceilings; front & back landscaping"). These carry through to the Job Plan sourcing.
- No property value is required.

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

### Approval

Hit **Submit for Approval** → manager enters PIN → estimate is locked and marked *Approved for Release*. PDF is unlocked. Estimate cannot be edited after approval — use a Change Order instead.

### Sending to Client

> **An unapproved estimate cannot be emailed.** The app refuses, from the Client Estimate tab and from the Client Dashboard shortcut alike. Approve it first — the figure isn't final until someone has signed off on it.

Hit **Email Estimate** → opens a pre-drafted, warmly-worded email (referencing the in-home walkthrough) with the estimate to attach. Send to the client for review, then wait for them to confirm they want to proceed before taking further steps.

## 8. Service Agreement

**Tab: Agreement** → select job

> **Never send an agreement before the client has accepted the estimate** — verbally, by email, or by text. Record that acceptance on the Client Dashboard first (**✓ Client Accepted — Mark Won**, §9). That's the record the client actually said yes, and it's what unlocks staffing.

### Generate & Send

1. Select job → agreement auto-populates from approved estimate data
2. Manager enters PIN to approve for sending. *The approved agreement files itself to the Drive **Agreement** folder at this point* — approval is the first moment the document means anything.
3. **Print / Save PDF** or **Email to Client**, then hit **✉ Mark Agreement Sent**.

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

Accessible from Client Dashboard once a job is **Active**. This is the only stage where photos are captured. (Home Prep jobs are vendor-managed and generally skip room documentation.)

### Room Documentation

Each room row shows the walkthrough note from the estimate as a gray italic reference. Capture buttons per room:

- **📷** — tap to add/review photos. Uploads automatically to the **Estate Inventory** Drive subfolder
- **🎥** — capture video walkthrough footage

Photo naming: `HVL-YYMM-XXXX_RoomName_001.jpg`

### Notable Collections — Asset Documentation

- **📷 Asset photos** — condition/identification photography. Uploads to **Estate Inventory** as `HVL-YYMM-XXXX_ASSET_CollectionName_001.jpg`
- **📄 Appraisal** — upload PDF or image of appraisal document. Saves as `HVL-YYMM-XXXX_APPRSL_CollectionName_2026-05-01.pdf`

### Item Inventory Capture (room cards)

On each Job Plan room card, use **Capture item** to photograph individual objects for the estate inventory. Type the object name, pick a **category**, and set a disposition before the shot; each photo is saved with a self-identifying filename. Items in an "intrinsic" category (art, jewelry, silver, antiques, rugs, coins, firearms, wine, instruments) that carry real value show a **⚑ needs-a-specialist** flag. Captured items flow straight into the Estate Inventory manifest.

## 10a. Estate Inventory (Tab)

**Tab: Inventory** → select a client. A per-client tangible-personal-property manifest and the estate documentation workspace. It assembles from three sources: items captured on Job Plan room cards, **+ Add line item** (an asset with no photo — cash, account, a vehicle), and **import from the estimate** (below).

### Categories & appraiser routing

Every item has a category from the shared taxonomy. Each category knows which specialist appraiser it routes to and whether it's subject to the IRS **$3,000** formal-appraisal rule for art/jewelry/etc. Categories: Antiques · Art & Décor · Collectibles · Electronics & Appliances · Firearms · Furniture · General/Household · Jewelry & Watches · Musical Instruments · Rugs & Carpets · Silver & Precious Metal · Vehicles & Watercraft · Wine & Spirits.

### From the estimate walkthrough (the bridge)

When flagged collections or vehicles exist on the estimate, a **From the Estimate Walkthrough** panel offers to add them to the manifest. Collections can be **itemized** (one row per piece) or kept as a **lot**; a guessed category pre-selects the appraiser routing. Collector vehicles carry a needs-appraisal flag. Imported items can't be added twice.

### Appraisers (per estate)

Add a roster of named appraisers — name, firm, **credential** (ISA / ASA / AAA / USPAP / GIA), **independence**, and effective (value) / report dates. An item whose valuation source is *Appraisal* is linked to a roster appraiser from the manifest's *Appraisal Doc* cell, replacing free-text with a defensible record.

### The $3,000 appraisal guardrail

Items flagged for appraisal that aren't yet linked to an appraiser surface a panel: a **soft amber nudge on Standard** jobs, a **red block on Formal** jobs (the inventory isn't complete until each is appraised). Per-item **Waive** logs a reason. On a Formal job, the Court Inventory export stamps *DRAFT* until every flagged item is appraised or waived.

### Valuation basis & date

- **Valuation Basis** — the level of value the whole schedule is stated on (defaults to Fair Market Value, as estate/probate requires).
- **Value as of** — normally the date of death. Toggle the **§2032 alternate valuation date** (six months after death, for taxable estates) and item value-dates and the Court Inventory follow it.
- **Asset Track** — Probate / Trust / Non-probate / Homestead / Exempt (default Probate). Only Probate-track items appear on the Court Inventory, so the probate schedule doesn't overstate the estate.

### Chain of custody & snapshots

- **🔗 custody log** (per item) — record each transfer: released / received / transferred / returned · party · date · method · receipt. A badge shows the event count.
- **Snapshot** — capture a labeled point-in-time copy of the manifest (the amended-inventory / what-changed trail); print any snapshot as an as-of schedule.

### Exports (work product)

- **Court Inventory** — a §733.604-style schedule grouped by category with date-of-death FMV, exempt property (§732.402) separated, a valuation-basis header and attestation line, and *no* internal figures. Stamps DRAFT / FINAL per the guardrail. Feeds counsel's filing (Havellin does not file it).
- **Disposition Ledger** — the fiduciary accounting: gross / fees / net to the estate / receipts. Havellin's own service fee never appears here.
- **Appraisal Worklist** — a per-specialist packet of every flagged item (photo, room, condition) to hand each appraiser.
- **Share w/ Counsel** — grants the estate attorney or trust officer *read-only* access to the whole **Estate Inventory** Drive folder (all photos + the workbook), pre-filled from the attorney email. **Revoke** removes it. Named-person access, never a public link — financial folders stay private.

> All inventory valuations are documentation support, not a legal or appraisal opinion — the estate attorney and a credentialed appraiser remain the authority on any estate.

## 11. Job Plan & Log Hours

**Tab: Job Plan** → select job. Generates once the estimate is approved. For labor-based services it runs the phase playbook (Phase 0 Pre-Job → Phase 4 Close-Out), vendor & partner sourcing, and daily hours logging. For **Home Prep for Sale** it is the streamlined vendor/budget/checklist view described in Section 6c.

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

### 13a. Category Group & Category (how a vendor is filed)

Every vendor is filed under a **Category group** (required) and a **Category**. The five groups are the fixed top-level taxonomy; categories live underneath them and are *open-ended* — you add a new one just by typing it.

- **The group dictates the category.** Pick a group first; the Category field then offers only that group's existing categories. This prevents nonsensical pairings (e.g. a mover filed under "Document Shredding").
- **Adding a new category is self-serve.** If none of the group's categories fit a new specialty vendor (e.g. a stone/hardwood *Floor Refinishing* outfit), just type the new category name — it's created under the selected group. No developer/code change needed.
- **The group decides which estimate menu — and fee — the vendor feeds** (see table). A category added under a group automatically shows up in that group's estimate menu and, once a vendor in it is **Active**, auto-populates the matching Job Plan sourcing slot.

| Category group | Feeds estimate menu | Fee |
| --- | --- | --- |
| Property Preparation | Home Prep items (Section 5e / 6a) | 30% GC / Site Management |
| Asset Liquidation & Valuation | Third-Party / Service Vendors (Section 5d) | At cost — no fee |
| Disposal & Waste Management | Third-Party / Service Vendors + End-of-Job Logistics | At cost — no fee |
| Moving & Logistics | Third-Party / Service Vendors | At cost — no fee |
| Professional Services | Third-Party / Service Vendors | At cost — no fee |

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
| Home Prep GC / Site Management Fee | 30% of prep vendors | 30% of prep vendors |
| Moving Materials | Cost + 25% | Cost + 25% |
| Expedited delivery (rush order) | +20% of Havellin services | +20% of Havellin services |

The rush premium is charged on the Havellin services total after any Preferred Client Discount, and never on vendor costs. Hourly rates stay as published — the premium is a separate line, so a client comparing us to another firm sees standard NASMM-range rates plus a clearly-labelled expedite.

> **The margin panel is an indicative profitability readout with a flag on it — not a discounting tool.** *Price at 30% Margin* is a reference line at an admittedly arbitrary margin, and *Above Reference* is simply the distance to it. Neither is an allowance to spend. In practice a job that needs that much discount is one to walk away from rather than one to price down to. The panel also shows what the 50% deposit covers at the quoted price, and warns in dollars when it stops covering cost — that happens below a 50% margin.

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

Havellin Palm Beach · 515 N Flagler Drive, Suite 350, West Palm Beach, FL 33401 · Internal use only · Not for distribution · v2026.08 · reconciled 2026-08-01
