# Six jobs, scripted

*Draft for Anthony Graziano to correct. Havellin Palm Beach, 2026-10-13. Dummy data throughout.*

## Read this first

This is the gate the road to launch sets (CLAUDE.md, *Road to launch*; the tracker, *Six jobs, scripted*): six whole jobs, each run from the first call to the final payment through the real controls of the app, by a person, on two devices. Nothing is simulated and nothing is typed into a test. The concierge works the house on a phone in field mode; the work on the Job Admin & Inv tab (the inventory tab) is done on a laptop. Every document a client, an attorney or a representative would receive is read against the reader's checklist in that job's script. The taps at every stage are counted and written into the table at the end of each script.

**The exit rule.** All six pass twice running, with nothing left in *fix now*, before anything else is built. A pass is: the job reaches its end state with no page error, every figure on every document reconciles to the cent, every refusal in the script's *What the app should refuse* list fires, every flag in its *What the app should flag* list shows, and nothing is found that meets the *fix now* bar (wrong money, wrong party or legal wording, lost data, a job with no way forward). Anything found goes in the tracker under the run's heading, sorted by the triage bar: *fix now*, *fix if cheap* (extra taps or a confusing step on a full house), *accept and close*.

**How to read a script.** Control names are in bold and are printed exactly as the app shows them, including their symbols and dashes (**✓ Client accepted — mark won**). Where a control could not be checked against the app's source it says *(control name to confirm)*: the thing to press is described, and the name on the button is for Anthony to correct here. The first time a term appears it is explained. Each script has ten parts in the same order: the cast, intake, the estimate, approval through the deposit, the field work, the Job Admin & Inv tab work, invoices and close, the reader's checklists, the taps table, and the two lists of what the app should refuse and flag, each quoting the rule as CLAUDE.md records it.

**Two people, two devices.** One person can run a job alone, but the taps count only means something if the field work is done on a phone and the Job Admin & Inv work on a laptop. Where the script says *phone*, use the phone; where it says *laptop*, use the laptop.

## Before every run

1. On each device open the app (the live build on `main`, not a branch), press **⚙ Settings**, set *Who uses this device* to the person holding it, and press **Save Settings**. Until it is set the Clients tab says so in amber, and every stamp names the job's concierge instead of the person who pressed.
2. On both devices check Settings holds the three Apps Script URLs and that the Clients tab loads the client list (an empty list that says *loading* or *unreachable* is not ready).
3. On the phone press **📱 Field** in the header. The bottom bar shows **Clients · Job Plan · Vendors**. Press it again to come back to all six tabs when a step says so.
4. Sign the laptop into the Havellin Gmail account before the first send: every email the app makes is a Gmail draft you read and send yourself.
5. Have the DocuSign sandbox signed in on the laptop for the jobs that send through it, and the Stripe test account where a script asks for the ACH link.
6. Open the tracker to the run's heading and keep it open. Write each finding as you meet it, with the stage, the control pressed and what happened.
7. Check the Vendor Directory holds at least one *Active* vendor under each category the scripts name (Moving Company, Donation Organization, Junk Removal / Hauling, Dumpster Rental, Auction House, Art Appraiser, Antiques & Furniture Appraiser, Jewelry & Watch Appraiser, Firearms Dealer (FFL), Painting, Home Staging, Pressure Washing, Deep Cleaning, Handyman), and that a charity, an auction house and a hauler are there to confirm on the Job Plan.
8. Count taps per stage as you go. A tap is one press of anything: a button, a chip, a field, a shutter, a confirmation. Write the count into the table at the end of the script before moving to the next stage, and write the minutes beside it.

## The steps every job shares

Each script refers back to these by letter. The scripts list only the values to type and what differs.

**A. Intake (laptop or phone).** Clients tab, **+ Add New Client**. Fill in what the script gives under its intake part. Every field marked with a red star is required; the form will not save without them. Press **Save Client**; it lands on the new client's dashboard, whose brown band names the next step. Correct anything later with **✎ Edit Client** on the *Job Timeline & Payments* heading and **Save Changes**.

**B. The estimate (laptop, on site or in the office).** Open the client, press **Build estimate** in the band. Tick each room the script lists, type its Volume and Complexity (1 to 5) in that room's row, and set the Scope box (blank, **✓** in scope, **✕** out of scope) where the script says. Use **Expand all**, **Collapse all** and **Hide empty** at the top. The fullness chips above the rooms (**Seasonal**, **Light**, **Normal**, **Full**, **Packed**) set a starting volume for every room; press one before ticking rooms where the script says so. Add vendors on the six Category Group cards: pick the category, type **Est Cost**, press **+**. Write walkthrough notes with **📝** or **🎤** in the room row and **Save Notes**. *Private Walkthrough Notes* at the end of the grid is internal and never prints anywhere a client sees. At the bottom set *Preferred Client Discount*, *Quote as a fixed price* and the *Moving materials package* where the script says. Press **Save Estimate**: it lands on the client's dashboard with the summary of what it saved.

**C. Approval (laptop).** On the dashboard the band reads *Get the estimate approved*. Press **👁 View estimate** and read it. Press **Submit for approval**: a Gmail draft asking for the PIN opens; send it. The manager presses **Manager approval** in the band, types their PIN in the *Manager Approval* box and confirms *(the confirm button's name to confirm)*; or presses **Deny**, gives a reason and presses **Deny & Send Back**. The *Estimate approved* row goes green and the tray offers **🖨 Print estimate** and **📁 Filed estimate**.

**D. Send it (laptop).** Band reads *Send the estimate to the client*. Press **✉ Send estimate**; read the Gmail draft, send it, come back and press **✓ I've sent it**.

**E. The client says yes (phone or laptop).** Band reads *Get the client’s decision*. Press **✓ Client accepted — mark won**, pick *How did they accept?*, the *Date accepted*, type *What they said*, press **Record Acceptance**.

**F. The agreement (laptop).** Band reads *Send the signing packet*. Press **👁 View packet** and read the first page against the script's cast. Then one of three: **✉ Send for signature — DocuSign** (the normal route; the step records itself as sent), **📄 Send as PDF to sign by hand** (a Gmail draft; send it, then **✓ I've sent it**), or **🖨 Print packet** then **🤝 Handed over in person**. Once pressed, only the route chosen is offered again.

**G. Staff the team (laptop).** Job Plan tab, open **Hours & daily close**, the *Job Team & Hours* roster. Name each slot the estimate priced, press **Save & Confirm Job Team →**. Staffing is refused until the job is marked Won.

**H. Signed copy back.** DocuSign route: the *Agreement signed* row reads that DocuSign is watching; when the envelope completes (the client, every co-signer, then Anthony), the app records the signature on the next load or **↻ Check DocuSign now** (at most once every twenty minutes). PDF or in-person route: press **✓ Record the signed agreement**; answer *Who signed it?*, *How did it come back?* (*Signed in person* or *Signed copy returned*), *Date signed*.

**I. The deposit (phone in the house, or laptop).** On the *Deposit invoice sent* row press **✉ Send deposit invoice** (a Gmail draft, then **✓ I've sent it**) or, with a cheque in hand, **✓ Record payment** straight away: *Which payment is this?* opens on the deposit, *Amount received* prefilled at 50%, *Date received*, *Method* (*Personal cheque*, *Cashier's cheque*, *Wire transfer*, *Bank transfer (ACH)*, *Cash*), *Reference*, *Paid by*, *Photo of the cheque*; press **Record Deposit →**. **🏦 ACH payment link** beside it makes a Stripe link for the balance; a transfer through it records itself once it settles. A cheque or a hand-recorded transfer sits *Uncleared* under *Payments recorded* beneath the timeline until **✓ Mark cleared** is pressed; a wire or cash is cleared on receipt.

**J. Activate (laptop, on the morning work starts).** Band reads *Activate the job*; press **▶ Activate job**. It is refused until the agreement is signed, the deposit is in and, on an estate, the authority paper reads *Received*. The app opens the Job Plan.

**K. The house (phone, field mode, Job Plan tab).** Follow *Photographing a House* (`photography-guide.html`). Open **Vendors & partners** first if a vendor is still unconfirmed. Tap a room card. Read the brief at the top. **📷 As found**: the room from the door, then every drawer, cabinet and closet open; on an estate tick **As-found pass complete** under the camera; press **Next: Items →** in the camera to go straight on. **📷 Items**: one shot per thing or per group of everyday things; tap the destination chip first (**Keep**, **New home** on a job with a new address, **To a person**, **Donate**, **Sell**, **Remove**, **Undecided**); it stays lit shot after shot. **⚑ Appraise** marks the next shot only. **Close-up**, the round button beside the shutter, files an extra angle under the last item and never adds an item. **🎤 Hold to talk** puts a note on the last shot. A walkthrough collection waiting for its photograph is a chip in the room's brief and in the camera: tap it, then shoot it. Press **Done**. Check the card: nothing may read *⚠ not saved* (press **Retry**). Tap **🔒 Lock — sorted & shot**. Once the room is empty: **📷 After**, then **✓ Cleared — empty, after-photo in** (or **✓ Mark cleared** on the card in the room list). Log the day in **Hours & daily close**: the *Date*, the *Activity summary*, half hours against each name, **Save Hours Entry →**.

**L. The Job Admin & Inv tab (laptop).** This is the inventory tab: everything shot in the house arrives here unnamed. Work the bar in order. **Name N shots** (the naming step; it reads every item shot and its close-ups, writes a name, a category and a quantity, and nothing else; when it finishes the room check runs by itself and *Possible duplicates* lists anything one room photographed twice). **Check N rooms** runs the room check again. **Value N lines** (the valuing step) puts a value, a source and a one-line basis on every named row nobody has valued; each row then reads *agent value* with **Accept value** under it, or type your own figure. Then the review: the *Needs you* counts across the top (*Unnamed shots · Unreviewed values · Not yet decided · No value yet · Lots to split · Needs appraiser · No recipient · Firearms held · Disputed / Hold*; a living client's job has fewer) are filters; work each down to zero. Pick the disposition on the row (*Keep, Move, Distribute, Donate, Sell, Consign, Auction, Junk, Hold*) and type *Channel / Recipient* where something leaves. Open a row with **▾** for the rest (condition, flags, custody with **Add event**, *Serial Number*, *Needs Appraisal*, *NFA Item*, *Asset Track*, *Valuation Source*, *Valuation Basis / Comps*, **Remove line**, **➕ Another item in this photo**). Tick rows down the left for the bulk bar: **Set recipient**, **Set condition…**, **Mark reviewed**, **Accept values**, **Approval request**, **Record approval**. The documents sit on the header (**Contents List** or **Estate Inventory PDF**, **CSV**, **Approval Request**) and under **More ▾** (**As-Found Record**, **Court Inventory**, **Trust Schedule**, **Appraisal Worklist**, **Snapshot**, **Share w/ Counsel**). The close-out records are cards under the inventory: *Disposition Ledger* (**Print**, **File to Drive**, **File signed copy**), *Contents Record* on living work, *Proceeds statements* (**+ Record a statement**, **File the statement**), *Donations* (**Print Donation Record**, **File charity receipt**), *Releases & signed papers* (**Print receipt**, **File signed receipt**, **File the signed request**, **File pickup list** under *Vendor pickups*, **File the adopted copy**, **File the received copy**) and, on an estate, *Beneficiaries & specific bequests* (**Save beneficiary**, **Save bequest**, **Match**).

**M. Invoices (laptop).** Each invoice has its own timeline row. **✉ Send midpoint invoice** when the band makes it the filled button (the plan's halfway day, half the work done, or every room locked), then **✓ I've sent it**, then **✓ Record payment** when the money comes. On a Home Prep the middle invoice is the *Second* invoice and waits for every prep vendor to read *Confirmed*. After the close, **✉ Send final invoice**; a final more than 15% from the estimate asks for **🔑 Manager approval** first.

**N. Close (laptop and phone).** On the Job Plan's *Close-out* stage: tick *Client satisfaction confirmed by phone*, press **Draft review request** (a Gmail draft; send it, confirm it), tick *Referral ask made*, and rate every vendor on the *Vendor scorecard* (a star saves itself). Then **■ Close job** in the band. It refuses until every vendor used is rated, and asks first where the midpoint is unpaid or an estate's ledger is unsigned. Then the final (M), then **✓ Record payment** on the final, and the band reads COMPLETE.

---

## Job 1 · Home Transition: the Hallorans

### 1. Cast and premise

Robert and Diane Halloran, a living couple, are leaving the four-bedroom house they have owned for 31 years at 1140 Lake Drive, Delray Beach, FL 33483 (Single Family Home, 2,800 sq ft) for a 1,650 sq ft condominium at 500 S Ocean Blvd, Boca Raton. The service is **Home Transition**, hourly. Their realtor, a referral partner, sent them. Ashley Jerome is the concierge; Anthony approves the estimate. Mid-job they add the garage, which was out of scope, by change order. The job ends on move day with the Contents Record signed by Diane. Money: the deposit by personal cheque, the midpoint by wire, the final through the ACH payment link where the Stripe test is set up, else by cheque.

### 2. Intake (step A, laptop)

| Field | Value |
|---|---|
| *Service type* | Home Transition |
| *Client full name* | Robert Halloran |
| *Phone* / *Email* | 561-555-0141 / rhalloran@example.com |
| *Property address*, *City*, *Zip* | 1140 Lake Drive, Delray Beach, 33483 |
| *Property type*, *Approx. sqft* | Single Family Home, 2800 |
| *Bedrooms*, *Full baths*, *Half baths* | 4, 3, 1 |
| *Years in home* | 31 |
| *Approximate home value* | 1,450,000 |
| *Walkthrough / site visit date* | 2026-10-20 |
| *Target start date* | 2026-11-02 |
| *Hard target date* | 2026-11-20 (the condo closing) |
| *Priority* | Normal |
| *Premium estate?* | No — standard rates |
| *RE transaction potential* | Yes — likely RE transaction |
| *New home address*, *City*, *New home sq ft* | 500 S Ocean Blvd, Boca Raton, 1650 |
| Question 1 (must find) | *Diane's mother's wedding ring, probably in the primary closet safe* (one line) |
| Question 2 (safety) | *Two cats; the garage step is loose* |
| House rows | tick *Safes & lockboxes* (write: primary closet, they have the combination), *Access & security* (write: alarm 4471, cleaner has a key Tuesdays) |
| *Referral source* / *Referral partner* | Realtor / pick any partner on the list (the agent) |
| *Assigned Transition Concierge* | Ashley Jerome |
| *Notes* | *Diane decides; Robert wants it over quickly.* |

Expect: the Drive folder creates itself after save; the dashboard reads *Creating Drive folder…* and then settles. A second client typed at the same street would be named at intake, not refused.

### 3. The walkthrough and Build Estimate (step B, laptop, 2026-10-20)

- Press **Normal** on the fullness chips first. Tick: Entryway / Foyer, Living Room, Half Bath (*Entry & Living*), Dining Room, Family Room / Great Room, Kitchen, Laundry Room, and in *First Floor Bedrooms & Bathrooms* Primary Suite, Primary Bath, Walk-in Closet, Bedroom 2, Bathroom 2, Bedroom 3, Bedroom 4. Set Primary Suite 4/3, Walk-in Closet 4/2, Kitchen 4/3, everything else at its default. In *Garage & Storage* tap the Scope box of *Garage (2-car)* round to **✕** (the garage is the clients' own, for now) and write the note *Clients clearing the garage themselves*.
- Leave Bathroom 3 blank on purpose, read the red coverage badge naming the shortfall in baths, then tap its Scope box round to **✕**. The badge goes green.
- Vendors: *Moving & Logistics* → Moving Company, **Est Cost** 4800; *End-of-Job Logistics* → Donation Organization and Junk Removal / Hauling, 0 and 450. *Moving materials package*: Home Editing / Transition Standard — $350.
- Crew: leave the *Concierges* and *Specialists* dropdowns to the app. Read the timeline badge; in *Client needs it sooner?* type 2026-11-20 and read the answer. Do not tick **Rush order** unless it reads amber and you accept the compression; the point of this run is an ordinary job.
- Room notes: on Primary Suite dictate *Ring safe in closet, combination with Diane*. In *Private Walkthrough Notes* type *Robert will try to give away the dining set before we start.*
- Before saving, clear one room's Volume box and press **Save Estimate**: it refuses and names the room. Put the score back. Then press **Save Estimate**.
- Expected on the client estimate (**👁 View estimate** after save): hourly rows in whole hours; a *Spaces In Scope* section listing the garage as out of scope; the mover under Move Day; the materials package as a fixed line; *Quote to follow* against the donation organization with no cost; the concierge named as Ashley Jerome; no values anywhere, no "licensed". Write the services total here: ______.

### 4. Approval, sending, the yes, the agreement, the deposit (steps C to J)

- C: Submit, approve with Anthony's PIN. Then press **✎ Edit estimate**, give 5% in *Preferred Client Discount*, **Save Estimate**, **Submit for approval** again and re-approve: a discount never asks the client again. Try **Offer discount** at 20% from the band: the cap is 15%.
- D, E: send, confirm, mark won (*Phone call*, 2026-10-22, *"Diane: go ahead, Nov 2 start"*). A phone acceptance with no note is challenged; type the note.
- F: **✉ Send for signature — DocuSign** to Robert. Read the packet first: the standard form, written to an owner, §3.9 naming ACH, wire or check, the deposit *Due upon acceptance, on signing this Agreement*, §12.4 on the deposit. Note the marketing opt-out box in §10.2.
- G: Job Plan, name Ashley on the concierge row and two specialists; **Save & Confirm Job Team →**. Try to log hours now: refused, the deposit is not in.
- H: complete the sandbox envelope as Robert, then as Anthony; the *Agreement signed* row names Robert and his day and files the executed copy and the certificate.
- I: record a *Personal cheque* for half the total, *Paid by* Robert Halloran, with a photo. The payments list shows it *Uncleared*. Two days later press **✓ Mark cleared**. Try to record a payment with no method: refused.
- J: on 2026-11-02 press **▶ Activate job**.

### 5. The house (step K, phone, 2026-11-02 to 11-06)

- Day 1: *Standing job flags* read aloud; tick *Keys and access codes tested* and *Crew confirmed by name and briefed* under *Before Day 1*; tick *Moving materials on site for Day 1 morning* when the boxes arrive.
- Shoot every ticked room. Per room: as-found from the door and the closets, **Next: Items →**, then three to six items with the chip set per thing (**New home** for the keepers; **To a person** for the dining set, note *to daughter Megan*; **Donate** for the books; **Remove** for the broken chair; **Sell** for the sideboard, **⚑ Appraise** on it). One **Close-up** of the sideboard's maker's label. Find the ring: press **Found it** on its line in the room brief.
- Try to lock a room with no as-found shot: on a living job it lets you through and flags it in amber. Shoot the as-found anyway.
- Day 2, the study: a decanter breaks while it is wrapped. On the phone, the *Incidents* card under the in-house boxes, **Report an incident**, *Property damage*, where, what, who was present, the item and $1,250, two photographs, **Record**. Read the card: the photographs arrive as an entry; the three §6.3 lines (client told, report to Anthony, the carrier above $500). Tell Margaret, press **Client notified**; press **I called Anthony**. Leave the carrier line open and watch it turn red two days later. Before the close, **Resolve** it with what was done (new 2026-10-16, P26).
- Log hours every evening: Ashley 7, each specialist 7. Type 7.25 once and read the refusal; correct it.
- Day 3: Robert asks for the garage after all. On the laptop, dashboard, *Change Orders* card **+ New**: *What changed in the scope* "Garage added to scope", *Reason for change* "Scope addition — new rooms or services", *Additional concierge hours* 6, *Additional specialist hours* 8, **Create Change Order**. Press **PDF** and read it: hours, no price. Press **Get Acceptance** and hand Robert the laptop: he types his name under **✓ I Accept This Change Order**. The row reads *Accepted* and then **📁 Filed copy**. Type 2.5 hours first and read the refusal.
- The garage has no room card on the Job Plan: it was marked out of scope, and a change order carries hours, not rooms. Do not shoot it in another room's workspace. Log the garage hours in the day's *Activity summary*, and write in the tracker that a room added by change order has no card (a *fix if cheap* candidate for Anthony to call).
- Move day (the *Move day* stage): tick *Movers arrived*, *Client walked the new home and approved it*, *Damage photographed and reported the same day, or none*, *Moving company's final sign-off*.

### 6. The Job Admin & Inv tab (step L, laptop, each evening)

- **Name N shots**, read the *Possible duplicates* block (press **Not duplicates** on the two matching nightstands; **Remove** on a sideboard shot twice if one was taken). **Value N lines**: on a living job the figures are the agent's to accept; the sideboard reads *worth a specialist* if its range is high. Accept values; type Megan's name as *Channel / Recipient* on the dining set lines; set *Channel / Recipient* on the Donate rows to the charity the plan confirmed (it fills itself if exactly one is confirmed).
- Set a Donate row's recipient to *Ashley Jerome*: on a living job it is flagged (*works with Havellin*), never refused. Put it back.
- *Not yet decided* down to zero. Press **Contents Record** on the header mid-job: it stamps *IN PROGRESS*.
- After move day: every row decided and a recipient on everything that left. **Contents Record** reads *REVIEWED*; print it, Diane signs the sign-off, **File signed copy** on its card (a photograph of the signed page). The *Disposition Ledger* card shows only because the sideboard sold; nobody signs it on living work.

### 7. Invoices and the close (steps M, N)

- Midpoint: when the band makes **✉ Send midpoint invoice** the filled button (the plan's halfway day, 2026-11-04), send it, confirm, then record a *Wire transfer*, *Paid by* Robert Halloran; it records as cleared.
- Close: satisfaction call tick, **Draft review request**, referral tick, rate the mover, the charity and the hauler. **■ Close job**.
- Final: **✉ Send final invoice**; read it first. Then **🏦 ACH payment link** if the Stripe test is live (the transfer records itself as *stripe_ach* once settled), else a cheque recorded by hand.

### 8. Reader's checklists

**The client estimate (Robert and Diane):** their names and address; *Home Transition*; the concierge named Ashley Jerome; whole hours on every labour row and the rows add to the services total; the 5% discount as its own line on labour only; the materials package at $350; vendors at cost with the line saying each vendor bills them directly; the garage listed as out of scope; the deposit/midpoint/final split 50/25/25 to the cent; the tagline; no "licensed".

**The signing packet:** the standard form addressed to Robert Halloran as owner; Exhibit A equal to the approved estimate, dated by its approval; *Time is recorded and billed in half-hour increments, as worked* in §3.3; §3.9 names ACH through the payment link, wire or check and no card; the deposit *Due upon acceptance, on signing this Agreement*; the final invoiced after the final walk-through and due within 7 days; the marketing opt-out at §10.2; the certificate of completion filed beside it after signing.

**The change order PDF:** the scope change; +6 concierge and +8 specialist hours; the revised hours; no dollar figure; Robert's typed name and date once accepted; the line that the hours bill like every other hour, discount included.

**The deposit, midpoint and final invoices:** each names Robert, the stage, when it is due (*Due upon acceptance…*; *within 7 days*); the midpoint shows *75% of the services to date* above *Received to date* and asks the difference; the final prices the hours logged (the change order's hours included), the materials package, the discount, lists the deposit and the midpoint at the figures those invoices asked, and its balance is the whole less what was received; cents print where there are any; no variance narrative.

**The Contents Record (Diane signs):** every item photographed; where each went and who took it (Megan by name; the charity; *Disposed of*, never *Junk*); a Keep item reads *kept by the client*; the sideboard's net received after the sale; the Havellin-person flag printed if one was left on; the sign-off block present only once every item has a disposition.

### 9. Taps per stage

| Stage | Phone taps | Laptop taps | Minutes | Notes |
|---|---|---|---|---|
| Intake | | | | |
| Build Estimate (14 rooms in scope, 3 vendors) | | | | |
| Approval and send | | | | |
| Mark won, packet, DocuSign | | | | |
| Staff the team | | | | |
| Deposit recorded and cleared | | | | |
| Activate | | | | |
| One room, as-found + 4 items + lock | | | | |
| Hours, one day | | | | |
| Change order, create to accepted | | | | |
| Job Admin & Inv: name, value, review (per item) | | | | |
| Move day boxes | | | | |
| Midpoint invoice and payment | | | | |
| Contents Record printed, signed, filed | | | | |
| Close-out card and Close job | | | | |
| Final invoice and payment | | | | |

### 10. What the app should refuse, and what it should flag

**Refuse** (CLAUDE.md's words):
- "Save, Submit and approval refuse unscored rooms in scope (`unscoredRoomNames`)."
- "*New home sq ft is required* on a Home Transition still refuses." (Clear it on Edit Client and try Save Estimate once.)
- "weekends are refused as picked" (pick 2026-10-24 as a walkthrough date and watch).
- "staffing needs `won`; logging hours needs a recorded deposit (`isJobFunded`), with no override, which is safe only because the deposit is never waived."
- "The recorder offers exactly `PAYMENT_METHODS_RECORDABLE`, and `saveDeposit` refuses anything else, a card included."
- "On hourly jobs a change order carries whole hours (`isWholeHours`, either role, either sign: `saveChangeOrder` names and refuses anything else)"; "`saveChangeOrder` refuses a reason not on that list".
- "Hours are logged in half hours, for everyone … naming each row it refuses and writing nothing."
- "Edit estimate and Offer discount go once the packet is out (`priceChangeBlocker`: sent means a change order, signed means locked)."
- "A final with no logged hours is blocked outright unless the job is on a fixed price or fee-only (`finalAwaitsHours`)."
- "The preferred-client discount (up to `MAX_DISCOUNT_PCT`, 15%; 0 removes it)."
- "Close job … needs every vendor used rated (`jobCloseBlockers`)."

**Flag:**
- "a blank [home value] is flagged in amber under the total (`propval-warn`) and in Save's notice (`_noPropVal`) and the estimate saves."
- "Dates out of order are kept and flagged in red, never cleared (`dateChainConflicts`)."
- "A street address already on file is named at intake, never refused (`jobsAtAddress`)."
- "on a living one the as-found shot is the pass … only a room with no as-found shot is flagged (`lockFlag`)."
- "possible duplicates are flagged for a person, never merged."
- "A living client is never refused but flagged (Anthony, P20, Q25 …): the `staffRecipient` caution."
- "Crew hours logged with none of the concierge's are flagged, never refused, on the final's timeline row."
- "Above `LARGE_DEPOSIT_THRESHOLD` a personal cheque is flagged, never refused."
- "Outside ±15% (`EST_TOLERANCE_PCT` …) it needs a manager's PIN" on the final.

---

## Job 2 · Home Prep for Sale: the Nwosu listing

### 1. Cast and premise

Patricia Nwosu is listing the 3,400 sq ft house at 2210 NW 52nd Street, Boca Raton, FL 33496 (Single Family Home) with Mark Feld, a Douglas Elliman agent and a referral partner. The service is **Home Prep for Sale**, fee-only: four trades managed by Havellin at a 30% Home Sale Preparation Fee on the quotes recorded, no rooms, no crew, no hours. Anthony Graziano is the concierge. Mid-job a handyman nobody quoted is added by change order. The agreement is with Patricia, never with the agent. Money: deposit by personal cheque; the second invoice once every vendor is booked; the final on the quotes as recorded, with the painter's bill updated.

### 2. Intake (step A)

*Service type* Home Prep for Sale; *Client full name* Patricia Nwosu, 561-555-0177, pnwosu@example.com; 2210 NW 52nd St, Boca Raton 33496; Single Family Home, 3400 sq ft, 5 bedrooms, 4 full, 1 half, 12 years in home; *Approximate home value* 2,100,000; walkthrough 2026-10-21, target start 2026-11-03, no hard target; *Priority* Normal; *RE transaction potential* Yes; *Referral source* Realtor, *Referral partner* Mark Feld; *Assigned Transition Concierge* Anthony Graziano. On this service only question 2 (safety) and the *Access & security* row are asked: write *Gate code 2210; stager needs the alarm off*. Expect the must-find question, the other six rows and the *Documentation level* to be hidden.

### 3. Build Estimate (step B)

Two cards only: *Home Prep for Sale — Managed Vendors* and *Pre-Prep Declutter — Concierge Hours*. Add on the first: Painting **Est Cost** 9500, scope note *5 bedrooms + hallway, walls and ceilings*; Home Staging 4200, *living, dining, primary*; Pressure Washing 900, *drive, pool deck*; Deep Cleaning 800, *whole house after the painters*. Leave *Concierge hours* at 0. Expect: the footer shows $15,400 of vendors and the fee $4,620; no fixed-price box; no rooms, crew, collections, vehicles or materials. Try **Save Estimate** with every vendor removed and 6 hours typed: refused, it says to use Home Editing. Put the vendors back and save. The client estimate reads vendors first, the fee, one total, and says the schedule is confirmed once vendors are booked.

### 4. Approval to activation (steps C to J)

Approve (Anthony's PIN), send, confirm, mark won (*Email reply*, paste a line). **Offer discount** is not offered on a fee-only job. Packet by **✉ Send for signature — DocuSign** to Patricia; read §3.3 before sending: no concierge or specialist hours are billed. Sign in the sandbox. Record the deposit, a *Personal cheque* for $2,310 (half the fee), *Paid by* Patricia Nwosu, photo. **▶ Activate job** on 2026-11-03. Expect the dashboard's Hours Log card to say no hours are billed and to offer no **+ Log Hours Today**.

### 5. The field work (phone, Job Plan)

The painter's ladder chips a counter top: the *Incidents* card is on the prep plan too. **Report an incident**, *Property damage*, the vendor named among those present, $900, a photograph; **Client notified**; **Resolve** once the painter has made good. The Incident Record files at the close, on a prep job as on any other (P26).

There is no inventory on a prep job. The Job Plan is *Budget & Fee*, *Home Prep Vendors — Sourcing & Status*, the *Coordination Checklist* and the Close-out card. The *Vendors & partners* fold opens by itself while a prep vendor is unconfirmed. For each line: pick the vendor from the directory (*Active* vendors only are offered), move the status *To contact → Quote requested → Quote received → Confirmed*, type **Quote $** (painter 9,500, stager 4,200, pressure 900, cleaning 800). Watch the band: it reads *Book the prep vendors* with **▶ Book the vendors** until every line is *Confirmed*; then **✉ Send second invoice** is the filled button. Never log time on the trades.

### 6. The Job Admin & Inv tab (laptop)

The Job Admin & Inv tab on a prep job is short on purpose: the client line, the band, the *Job Admin* paperwork and the Close-out card. Nothing to name or value. Confirm there is no inventory, no appraisers and no Approval Request offered.

### 7. The change order, invoices and the close

- Second invoice: once all four read *Confirmed*, **✉ Send second invoice**, confirm, record a *Wire transfer* for what it asks ($1,155, bringing the fee to 75%).
- The handyman: on the dashboard **+ New** on *Change Orders*; *Reason for change* "Preparation vendor added"; leave *Additional concierge hours* blank; under **Add a prep vendor** pick Handyman and type *Its estimated cost* 1050; read the line it prints back (the fee at that cost, $315); **Create Change Order**; **PDF**; **Get Acceptance**, Patricia types her name. Try first with a vendor and no cost: refused. The handyman now sits with the other prep lines on the Job Plan: confirm it and type **Quote $** 1050.
- The painter bills $9,800: type 9800 into the painter's **Quote $** before the final.
- Close: the checklist's last lines, the Close-out card, rate all five trades, **■ Close job**. **✉ Send final invoice**: the fee on the quotes recorded ($16,450 × 30% = $4,935), less the deposit and the second invoice as each asked, no hours table, no *labor $0* row. Record the final payment by cheque.

### 8. Reader's checklists

**The client estimate (Patricia):** the four trades itemised at cost with their scope notes; the fee row *Home Prep for Sale — Home Sale Preparation Fee* at 30% as the last row of the services table; one total; the 50/25/25 split named *Deposit*, *Second payment*, *Final*; no hours, no rooms, no completion date; the agent nowhere as a party.

**The signing packet:** the standard form to Patricia Nwosu as owner; §3.3 says no concierge or specialist hours are billed; §3.5 the fee *on the vendor quotes recorded, updated if a vendor's invoice differs*; Exhibit A the approved estimate; *Due upon acceptance* on the deposit; the second payment *once the vendor schedule is booked* and the final *at show-ready handover* in the agreement email's schedule.

**The change order PDF:** names Handyman, its estimated cost $1,050 and the fee at that cost; no hours; Patricia's acceptance.

**The three invoices:** the deposit on the estimate basis; the second invoice headed *Second*, bringing the client to 75% of the fee on the quotes recorded at that day; the final headed *Services total (Home Sale Preparation Fee on the vendor quotes recorded)*, the fee on $16,450, the deposit and second rows at the figures those invoices asked (not today's recomputation), the balance to the cent, no hours anywhere; each says when it is due.

### 9. Taps per stage

| Stage | Phone taps | Laptop taps | Minutes | Notes |
|---|---|---|---|---|
| Intake | | | | |
| Build Estimate (4 vendors) | | | | |
| Approval and send | | | | |
| Mark won, packet, DocuSign | | | | |
| Deposit | | | | |
| Activate | | | | |
| Source one vendor to Confirmed with a quote | | | | |
| Second invoice and payment | | | | |
| Change order with a vendor, create to accepted | | | | |
| Update a quote | | | | |
| Close-out card and Close job | | | | |
| Final invoice and payment | | | | |

### 10. What the app should refuse, and what it should flag

**Refuse:**
- "a prep estimate still needs at least one vendor: hours alone will not save" (the playbook, Home Prep step 3).
- "Fixed price is offered on every service but Home Prep (whose box is hidden)."
- "A fee-only estimate offers no discount (`discountOfferBlocker` reads `estimateIsFeeOnly` off the approved estimate first)."
- "Home Prep's second invoice once every prep vendor is confirmed on the Job Plan (`prepVendorsConfirmed`; until then the row is not yet due and the band's button is **▶ Book the vendors**)."
- A change order "will not save with neither [hours nor a vendor] … or with a vendor and no cost" (the playbook, 10d); "`saveChangeOrder` refuses a reason not on that list."
- "A fee-only Home Prep's invoices print no hours."
- "Close job … needs every vendor used rated."

**Flag:**
- "The dashboard's Hours Log card on a fee-only job (`jobIsFeeOnly`) says no hours are billed and offers no *+ Log Hours Today*."
- "The Vendors & partners fold opens by itself on an active Home Prep while a prep vendor is unconfirmed (`planVendorsOpenOnLoad`)."
- Known and not fixed, so expect it: "a Home Prep's early second invoice sends with no word that it is early." Send it early once on the second run and note what the page says.
- The *Budget & Fee* card's over-budget flag once the painter's quote moves.

---

## Job 3 · Trust estate: the Ellison trust

### 1. Cast and premise

Marjorie Ellison died on 2026-08-14. Her home, a 4,100 sq ft Estate at 310 Seaspray Avenue, Palm Beach, FL 33480, is held by *The Marjorie Ellison Revocable Trust*, dated March 3, 2015. Her children Thomas Ellison and Catherine Ellison-Reyes are co-trustees; Thomas is the representative on the record, Catherine the co-representative. The trustee's attorney is Laura Pell of Pell & Marsh, P.A. The service is **Estate Settlement**; the matter is *Trust*; no probate, no court. Tier: *Inventory with values*. No Form 706; no dispute. Fixed price (an estate opens on it). Contents: a silver flatware service and a Lladró collection noted at the walkthrough; two specific bequests (the Steinway upright to grandson Owen Reyes; the pearl necklace to Catherine); most of the furniture to auction, the household to a charity, the rest removed. Both trustees sign the agreement in DocuSign, approve every release, and sign the Disposition Ledger. The package goes to Laura Pell. Ashley Jerome is the concierge.

### 2. Intake (step A)

| Field | Value |
|---|---|
| *Service type* | Estate Settlement |
| *Deceased full name* | Marjorie Ellison (no phone or email are asked) |
| Address | 310 Seaspray Avenue, Palm Beach, 33480; Estate; 4100 sq ft; 4 bedrooms, 3 full baths, 1 half; 40 years |
| *Approximate home value* | 6,800,000 |
| Dates | walkthrough 2026-10-22, target start 2026-11-09, hard target blank |
| Representative | *First name* Thomas, *Last name* Ellison, *Role / Authority* Trustee, 561-555-0190, tellison@example.com |
| *Date of death* | 2026-08-14 |
| *How is this estate being administered?* | Trust — a successor trustee administers it |
| The authority control (now labelled *Certification of Trust*) | Pending |
| *Trust Details* | *Name of the trust* The Marjorie Ellison Revocable Trust; *Trust dated* 2015-03-03; *Successor trustee accepted* 2026-08-20 |
| *Property sale required?* | Yes — property must be sold |
| **+ Add a co-representative** | Catherine Ellison-Reyes, Co-Trustee, 561-555-0191, creyes@example.com |
| Attorney | Laura Pell, Pell & Marsh, P.A., 561-555-0120, lpell@example.com |
| *Federal estate tax return (Form 706) being filed?* | No |
| *Known dispute, contest, or elective share?* | No / not known |
| *What are we contracted to produce?* | Inventory with values — estimated FMV, basis stated |
| *Documentation level* | leave on Auto (it reads Standard) |
| Question 1 | *Mother's pearl necklace (Catherine's), jewellery box in the primary closet* / *The Steinway is Owen's* |
| Question 2 | *Oxygen tanks in the primary bedroom; the pool gate does not latch* |
| House rows | *Valuables* (silver service in the dining sideboard; Lladró in the living room cabinet), *Documents & digital* (trust papers in the study desk) |
| Concierge | Ashley Jerome; *Referral source* Trust officer |

Try **Save Client** with the matter type blank: refused. Try typing Thomas as his own co-representative: refused by name. Expect no *Probate Details* block and no case number anywhere.

### 3. Build Estimate (step B)

Press **Full**. Tick Entryway / Foyer, Living Room, Dining Room, Kitchen, Butler's Pantry, Library, Primary Suite, Walk-in Closet, Bedroom 2, Bedroom 3, Bedroom 4, Office 1, and in *Garage & Storage* *Garage (2-car)*. Tap Primary Bath, Bathroom 2, Bathroom 3 and the *Entry & Living* Half Bath round to **✕** (nothing to inventory there) so the coverage badge reads green. Score the Library 5/4 and the Dining Room 3/4 (silver), the rest at the preset. *Documentation scope* opens at *Full*: leave it. *Adjustments*: tick *Multiple heirs*. *Notable Collections*: *Silver flatware service*, est value 6,000, qty 1, disposition *Auction House*; *Lladró figurines*, 2,500, qty 14, *Online Auction*. Vendors: *Asset Liquidation & Valuation* → Auction House with **Est Cost** 0 (paid from the proceeds); *End-of-Job Logistics* → Donation Organization, Junk Removal / Hauling 600. *Moving materials package*: Estate Standard — $750. *Quote as a fixed price* is ticked already: read the suggested fee (the two-specialist plan plus 20%, rounded up to the next $100) and press *Round to $…* if it is offered. Save. Write the fee: ______.

Expected on the estimate: the estate form of the document, written to the representative; *Estate Settlement*; the identity line naming the trust by its title, never *Estate of*; Exhibit A's direction lines reading *the representatives together* and *the written authority of each of them*; the auction house as *No direct cost*; the sorting stage *Sorting, Documentation & Inventory*; a fixed project fee with no hour counts; the Form 706 line absent; the appraisal sentence saying counsel arranges any appraisal (no appraiser is on the estimate).

### 4. Approval to activation (steps C to J)

- C, D: approve, send to Thomas (the email copies Catherine and agreements@; read the CC line).
- E: mark won (*In person*, 2026-10-28, note).
- F: read the packet's first page: the trust is the party by its title, *dated March 3, 2015*, with the decedent; a *Certification of Trust* row where the Letters would be; *Trustee’s Attorney* Laura Pell; no case number or court; §5.1 names Catherine's joinder and gives her a *Co-Signer* block; §5.4 *No Purchase by Havellin*; the signature page headed *Client / successor trustee* and reading *No work will begin until the Client and Havellin have signed and the deposit has been received*. Clear Catherine's email on Edit Client and press **✉ Send for signature — DocuSign**: refused by name before anything is sent. Put it back and press again. The notice names both signers. Then, on the second run only, give Catherine Thomas's email and send: it goes, and the notice turns amber naming the shared address.
- G: staff Ashley and two specialists.
- H: sign as Thomas, as Catherine, then as Anthony in the sandbox. The row names Thomas and Catherine with each one's day and the authenticated address; the executed copy and the certificate are filed. If the certificate's link is missing the row offers **📁 File signed copy**.
- I: *Wire transfer* for half the fee, *Paid by* The Marjorie Ellison Revocable Trust; cleared on receipt.
- J: press **▶ Activate job** with the authority still *Pending*: refused, *The successor trustee's Certification of Trust must be received*. Edit Client, set it to *Received*, save, activate on 2026-11-09. The Job Plan's gate chips show *Certification of Trust* green; *Before Day 1* carries *Certification of Trust (§736.1017) read — any limits on the trustee's powers noted*: tick it.

### 5. The house (step K, phone, three days)

- Shoot all thirteen rooms. Per room on an estate: as-found including every drawer, tick **As-found pass complete**, **Next: Items →**, items with chips (**Sell** for the furniture going to auction, **Donate** for the household, **Remove** for the rest, **To a person** for the Steinway with the note *Owen's*, **Keep** for nothing), **Close-up** on the Steinway's serial plate and the silver's hallmark. In the dining room tap the *Silver flatware service* chip in the brief and shoot it; in the living room the *Lladró figurines* chip. Try **🔒 Lock — sorted & shot** before the tick: greyed, *Confirm the as-found pass first*. Try to delete an as-found shot: it cannot be deleted.
- Tick the four in-house boxes on the estate plan (firearms where they lie; NFA check; papers sequestered; valuables logged). Hand the trust papers from the study to Laura Pell against a signed receipt and tick *Deeds, titles, trust papers…*.
- Log the hours every day, half hours, fixed price or not.
- Day 2: the gold pocket watch (item 22) is not where it was photographed. **Report an incident**, *Missing item*, the item number, last seen. The header turns red, *CALL ANTHONY IMMEDIATELY (617) 650-6588*: call him from the banner, then press **I called Anthony**. It turns up in the car on day 3: **Resolve** with where it was found (P26).
- Lock every room; the plan moves to *Midpoint & pickups*; the band offers the midpoint invoice.

### 6. The Job Admin & Inv tab (step L, laptop)

1. **Name N shots**. Read *Possible duplicates* (the Lladró cabinet shot and a close-up taken as an item, if one slipped through): **Remove** the extra, or **Not duplicates**. Find a collection shot as an ordinary item: open the collection's row (*📷 no photograph yet*), pick the photo under *From the walkthrough*, **Use that line**.
2. **Value N lines**. The silver and the piano are researched (sold comparables with links, each marked SOLD or ASKING); the household lots get a general figure. **Accept value** on each, or type over it. Open one line's record: **Check WorthPoint** then **Use a WorthPoint sale** with a pasted sale; the source reads *WorthPoint comps*. Rename a valued line and watch *value made for an earlier name*; press **Re-value**.
3. *Beneficiaries & specific bequests*: add Owen Reyes and Catherine Ellison-Reyes as beneficiaries (**Save beneficiary**), then two bequests in the trustees' own words (*"the Steinway upright piano to Owen"*, *"Mother's pearl necklace to Catherine"*) with the item numbers, **Save bequest**. Propose the necklace to *Auction* for a moment: the row reads *bequest to Catherine · going elsewhere*; put it back to *Distribute* with Catherine named.
4. Set a Sell line's *Channel / Recipient* to *Anthony Graziano*: refused where it is written, naming the rule and the line. Set an Auction line with the one auction house confirmed on the plan: it fills itself, marked *from the Job Plan*.
5. *Needs you* down to zero: every row decided, every leaving row with a recipient, values accepted. **Set condition… → Good** across a room, fix the exceptions.
6. **Approval Request** on the header: read it (part 8). Print it; both trustees sign the same day. Tick the lines, **Record approval**: tick Thomas and Catherine, the date, confirm; then **File the signed request** with the photographed pages.
7. *Releases & signed papers*: **Print receipt** for Owen and for Catherine; each signs when they take the items; **File signed receipt** on each. Under *Vendor pickups* the auction house has **File pickup list**: untick nothing, photograph the sheet. Those rows read *✓ picked up by*, and each gets a *Released* custody event (custody is mandatory on a trust; check one row's log with **▾**).
8. *Donations*: **Print Donation Record** for the charity; when its receipt comes back, **File charity receipt**.
9. *Proceeds statements*: the auction settles for $13,518 gross, $2,703.60 fees, $10,814.40 net. **+ Record a statement**: type who it is from (its lines tick themselves), each lot's gross and fees off the statement, the totals, **Record statement →**; it reconciles to the cent or says by how much it does not. **File the statement**.
10. *Disposition Ledger*: no signature block until every line has a disposition. Then **Print**; Thomas and Catherine sign; **File signed copy**. **More ▾ → Trust Schedule**: FINAL once every line is valued and reviewed, headed with the trust's title, one receipt line per trustee; once they sign it as received, **File the received copy** under *Releases & signed papers*.
11. Dashboard, *Trust Information* card: **📧 Send trust package**. The draft goes to Laura Pell, copies Thomas and Catherine and agreements@, attaches the Trust Schedule, the Estate Inventory Report, the Disposition Ledger and the Appraisal Worklist, links the two photograph folders (shared with her as it runs) and the *Release Approvals and Chain of Custody* record. Send it; **✓ I've sent it** on the row. Change a line's value and watch the row say the inventory moved since the draft.

### 7. Invoices and the close (steps M, N)

Midpoint when every room is locked: send, confirm, record a *Wire transfer* from the trust. Close-out: call, review request, referral, rate the auction house, the charity and the hauler (the auction house is named on the lines, so it is on the scorecard whether or not it was on the plan). **■ Close job** asks about the ledger if it is unsigned; it should be signed by now. Final: the rest of the fee, the materials package, nothing trued to hours; record the wire.

### 8. Reader's checklists

**The client estimate and Exhibit A (Thomas and Catherine):** the trust named by its title and date; *Estate Settlement*; the fixed fee with no hours; the sorting stage promising the inventory with values; counsel arranges any appraisal; *the representatives together* on every direction line; no court, no §733.604, no Form 706.

**The signing packet (both sign):** the trust as party with the decedent; the *Certification of Trust* row; *Trustee’s Attorney*; §5.1 Catherine's joinder; a named *Co-Signer* block for Catherine with her own DocuSign markers; §5.4 *No Purchase by Havellin*; §7.1's Disposition Ledger sentence; §8.1 on the deposit; the marketing opt-out box once, the client's; the certificate of completion naming both trustees.

**The release approval request:** addressed to both trustees by name, a signature line each, *both must sign*; grouped by destination with one initial per group, a line of $500 or more or a bequest on its own; *BEQUEST TO Owen Reyes* on the piano; the Havellin rule in print; no *not yet appraised* caution (nothing was flagged) and no firearms block; every fiduciary's signature recorded afterwards as *Signed so far by…* if one signs first.

**The Trust Schedule (Laura Pell and the trustees):** headed with the trust's title and the decedent in brackets; date-of-death FMV as the basis on every line with its source word (*Auction comps*, *General estimate*, *WorthPoint comps*); property the trust does not hold left off and named as such; FINAL only with every line valued; no court, no case; receipt lines for Thomas and Catherine; the sentence that it supports the accounting and is not one.

**The Estate Inventory Report, the Appraisal Worklist, the Disposition Ledger:** the report lists every line with photo, room, condition (*as photographed* where blank), value and source, grouped by disposition; the worklist states the MAIV aggregate is not tested (no 706) and lists nothing flagged; the ledger lists every line under its number, the auction's net to *Net to Trust*, sums to the cent, no gaps once every receipt and statement is filed, and two signature lines.

**The Release Approvals and Chain of Custody record:** the signing act with both names and the day; each pickup release with *recorded by* the device's user; the dealer route absent (no firearms).

**The beneficiary receipts and the charity's donation record:** the receipt from *the trustees of* the trust, the lines by number, the recipient's signature line and Havellin's witness line; the donation record listing the charity's lines.

### 9. Taps per stage

| Stage | Phone taps | Laptop taps | Minutes | Notes |
|---|---|---|---|---|
| Intake with a co-trustee | | | | |
| Build Estimate (13 rooms, 4 out of scope, 2 collections, 3 vendors) | | | | |
| Approval and send | | | | |
| Won, packet, DocuSign with a co-signer | | | | |
| Staff, deposit, Certification received, Activate | | | | |
| One room: as-found + tick + 5 items + close-ups + lock | | | | |
| A collection chip shot | | | | |
| Hours, one day | | | | |
| Name, room check, value (per item) | | | | |
| Bequest card: 2 beneficiaries, 2 bequests | | | | |
| Review to zero (per item) | | | | |
| Approval request, both signatures recorded, filed | | | | |
| Two receipts printed, signed, filed | | | | |
| Pickup list | | | | |
| Proceeds statement recorded and filed | | | | |
| Donation record and receipt | | | | |
| Ledger signed and filed; Trust Schedule received | | | | |
| Trust package sent | | | | |
| Midpoint, close-out, close, final | | | | |

### 10. What the app should refuse, and what it should flag

**Refuse:**
- The matter type "has no default and the form will not save without it" (the playbook, Step 1); "A blank tier refuses Save and Submit (`estimateContractBlocker`) but never stops pricing."
- "the representative can never be their own co-representative, `coFiduciaryRepClash`, refused by both saves."
- "activation needs the signed agreement, the deposit and the paper that proves the representative's authority (`jobActivationBlockers`): … the successor trustee's Certification of Trust (§736.1017) on a trust-only matter."
- "Lock needs an as-found shot and the *As-found pass complete* tick on a decedent job (`lockRefusal`)"; "An as-found shot cannot be deleted."
- "A co-representative with no email, or no block of their own, refuses the envelope by name before the PDF is built."
- "On an estate a sale (`INV_SALE_DISPOSITIONS`: Auction, Consign, Sell) or a Distribute whose recipient is one of `havellinPeople(job)` … is refused where it is written."
- Bequests: "an unknown number or a taken line is refused by name; a beneficiary a bequest names is not removed."
- "`saveProceedsStatement` refuses a negative lot figure with the rest."
- The ledger's signature "withheld while any line has no disposition"; the package "refuses by name, everything missing at once (`probatePackageBlocker`)".
- The *Found on site* card is offered on this estate and nothing is found, so leave it alone; on a living client's job it is not offered at all: "a living job is refused by the card, the dialog and `saveSiteFind`".

**Flag:**
- "A line with no photograph is owed one (`collectionLineUnshot`)"; "possible duplicates are flagged for a person, never merged."
- "Matching marks `flagBequest` … It flags, never refuses"; "`invBequestElsewhere` is the one test for a matched line proposed anywhere but to its beneficiary."
- "Signers the envelope carries at one email address go out, and the send's notice turns amber and names who shares which address."
- "A line released with none filed reads *no signed receipt* on its row"; "an estate's close question names an unsigned ledger (`ledgerCloseFlag`) and never refuses."
- "`agreementCoSignState` … Flagged, never refused" where a co-signer's signature is not on record.
- "A high range sends it to an appraiser" on an estate (`invNeedsAppraisal`) if a researched range reaches $3,000.
- "A name changed after valuing is `agentValueStale` (*value made for an earlier name*, Re-value)."
- "a draft carrying `pkg` goes stale when the inventory moved after it or the documents owed changed."

---

## Job 4 · Probate: the Brandt estate

### 1. Cast and premise

Harold Brandt died on 2026-07-02 at 1480 N Ocean Boulevard, Gulf Stream, FL 33483, a 5,600 sq ft Estate full of art and antiques. His daughter Susan Brandt-Kessler is the personal representative; the estate attorney is Daniel Okafor of Okafor Levin, P.A.; the case is 50-2026-CP-004512-XXXX-MB in Palm Beach County; Letters issued 2026-09-28, so the §733.604 inventory is due 2026-11-27. The service is **Probate Estate Settlement**; the matter is *Probate*; a Form 706 is being filed; no dispute. Tier: *Inventory + appraisals* (Formal, so chain of custody and the appraisal guardrails are mandatory). Premium estate. Fixed price. In the house: two firearms in the hall closet safe, a Browning shotgun going to a licensed dealer and a suppressor (an NFA item: the dealer collects it); an original will in the study desk; $2,340 in cash in a coat pocket; a painting appraised by an art appraiser; the dining furniture claimed as §732.402 exempt property; one bequest, Harold's watch to grandson Eli Kessler. The package goes to Daniel Okafor. Anthony Graziano is the concierge; Ashley approves the estimate.

### 2. Intake (step A)

*Service type* Probate Estate Settlement; *Deceased full name* Harold Brandt; 1480 N Ocean Blvd, Gulf Stream, 33483; Estate; 5600 sq ft; 4 bedrooms, 2 full baths, 1 half; 35 years; *Approximate home value* 9,500,000; walkthrough 2026-10-23, target start 2026-11-10, *Hard target date* 2026-11-25 (the court); *Priority* High — probate deadline; *Premium estate?* Yes — art, antiques, wine. Representative: Susan Brandt-Kessler, Personal Representative, 561-555-0202, sbk@example.com; *Date of death* 2026-07-02; *How is this estate being administered?* Probate — administered through the court; *Letters of Administration* Pending; *Probate Details*: *Case number* 50-2026-CP-004512-XXXX-MB (watch the *Court* fill itself with the Palm Beach circuit court's probate division; type over it once and watch it stay), *Letters issued* 2026-09-28, *§733.604 inventory deadline* 2026-11-27; *Property sale required?* Under discussion. Attorney: Daniel Okafor, Okafor Levin, P.A., 561-555-0133, dokafor@example.com (required on probate). *Form 706* Yes; *dispute* No; *What are we contracted to produce?* Inventory + appraisals; *Documentation level* greys at Formal with the reason beside it. Question 1: *Grandfather's Patek watch, bedroom safe (Eli's)* / *the signed Chagall lithograph*. Question 2: *Two firearms in the hall closet safe, Susan has the code; she is authorised to take possession through a dealer.* Rows: *Firearms & ammunition* (write the same), *Cash* (*he kept cash in coat pockets*), *Valuables* (art throughout; wine in the cellar), *Safes & lockboxes*, *Documents & digital* (*look for the original will, the attorney has only a copy*). Concierge Anthony; *Referral source* Estate attorney, partner Daniel Okafor if listed.

### 3. Build Estimate (step B)

Press **Full**. Tick: Entryway / Foyer, Living Room, Half Bath (*Entry & Living*), Dining Room, Library, Wine Cellar, Office 1, Kitchen, Primary Suite, Primary Bath, His Walk-in Closet, Bedroom 2, Bathroom 2, Bedroom 3, Bedroom 4, and in *Garage & Storage* *Garage (3+ car)*: sixteen rooms. Living Room 4/5, Library 5/5, Wine Cellar 4/5 with *Special Items* ticked. *Documentation scope* opens at *Full*: the amber line under it says the tier promises the appraisals, add each appraiser under Vendors. Vendors: *Asset Liquidation & Valuation* → Art Appraiser **Est Cost** 1200, Antiques & Furniture Appraiser 900, Auction House 0, Firearms Dealer (FFL) 0; *End-of-Job Logistics* → Donation Organization 0, Junk Removal / Hauling 900. Collections: *Wine cellar, ~400 bottles*, 18,000, *Appraise*. *Moving materials package*: Estate Premium — $1,500. Fixed price (25% contingency on probate). Read the projected completion against 2026-11-27: if the plan ends after it, Build Estimate says so under the total (a flag; add a specialist and watch it clear). Save.

### 4. Approval to activation

Approve with Ashley's PIN. Send to Susan (copies agreements@; no co-representative). Mark won. The packet: the probate form, *Estate of Harold Brandt*, the Letters row, the case number and the court, §5.2's probate list, §5.3's appraisal row reading that Havellin arranges every appraisal (the appraisals tier at full scope), §5.4, Exhibit A promising the inventory to the estate attorney in time for the §733.604 filing with counsel serving and filing it. **✉ Send for signature — DocuSign**; sign as Susan and Anthony. Staff Anthony and three specialists. Deposit: a *Cashier's cheque* from the estate account, *Paid by* Estate of Harold Brandt, photo; on the second run record a *Personal cheque* above $10,000 instead and read the policy flag. **▶ Activate job** with the Letters *Pending*: refused, *Executor authorization must be received*. Edit Client, *Received*, activate 2026-11-10. The strip now carries the court deadline and *Form 706 due 2027-04-02*.

### 5. The house (step K, phone, four days)

- The red firearms banner leads the Job Plan with intake's words and **Read the firearms protocol →**. Read it to the crew in the driveway.
- Rooms as in Job 3 (as-found, the tick, items, close-ups). In the Entryway / Foyer workspace (the hall closet safe): one item shot of each firearm where it lies, both sides, a legible **Close-up** of the shotgun's serial; nobody touches either. On the 706 estate give anything that might be worth over $100 its own photo; group only everyday things.
- Day 1, the study: the original will in the desk. On the phone, the *Found on site* card under the in-house boxes: **Record an original will**: *Found on* today, *Where in the house* study desk, *Found by* Anthony Graziano, *What it looks like from the outside* "sealed white envelope marked Last Will, unopened"; *Handed to* prefilled with Daniel Okafor; **Record**. The card reads red, *Original will held by Havellin*. **Print Receipt for Original Will**; drive it to Okafor the same day; **Record the hand-over** (today); **File signed receipt** with a photo of the signed receipt. Ten days later Okafor confirms the deposit with the clerk: **Confirm the deposit with the clerk**. On the second run, record the hand-over on the next day instead and read the flag.
- Day 2: $2,340 in a coat pocket. **Record cash found**: *Amount counted* 2340.00, *Counted by* Anthony Graziano *And by* Ashley Jerome, *Sealed bag number* HB-0001. Try Anthony twice: refused, *Two different people count the cash*. **Print Cash Count and Receipt**; Susan signs for the bag today; **Record the hand-over**; **File signed receipt**.
- Press **Found it** on the watch and the lithograph when found. Tick the four in-house boxes. Log hours daily.
- Lock all sixteen rooms; the midpoint falls due.
- An injury on day 2: a specialist cuts a hand on a broken frame. **Report an incident**, *Injury*, who was hurt, medical help *No*, a photograph. The red banner; call; **I called Anthony**. **Resolve** that evening. Check at the close that the Incident Record is in the estate package, after the ledger (P26).

### 6. The Job Admin & Inv tab (step L, laptop)

1. **Name N shots**; expect *Firearm* and *Possible NFA item* notices above the rows for the two safe shots, and a *Must find* prompt for the watch. Check rooms; remove doubles.
2. **Value N lines**: art and antiques researched; the *Lots to split* chip counts any lot with an article over $100. Split one with **➕ Another item in this photo**. The MAIV aggregate on the Appraisal Worklist reads *at least $X* until every marked article is valued.
3. Firearms. Shotgun row: category Firearms, *Serial Number* typed from the close-up, disposition *Sell*, *Channel / Recipient* the dealer. Suppressor row: category Firearms, tick **NFA Item**; the worklist reads *NFA item — never transported by Havellin*. Set the shotgun to *Distribute* to Eli for a moment and open **▾**: *Through a licensed dealer…* is offered; name the dealer; the row reads *via*; then **Take the route off** and put it back to *Sell*.
4. Appraisers: *Appraisers* roster, add the art appraiser from the directory with credential and *Due back*; link the painting; its row reads *Appraisal in progress*; the request would still print *NOT YET APPRAISED*. When the report comes, type the figure with *Valuation Source* Appraisal: the agent's range and comparables go. Waive the Antiques appraiser's one flagged chair with a reason (**Waive**).
5. The dining furniture: *Asset Track* Exempt (§732.402) on the table and chairs. The watch: bequest to Eli Kessler on the card; the row *Distribute* to Eli.
6. *Needs you* to zero. **Approval Request**: Susan alone; the *Firearms: written authority* block lists the shotgun by serial and dealer and the suppressor as not covered for transport (the dealer collects it); one initial for the batch. Susan signs; **Record approval**; **File the signed request**. Now the shotgun's row reads cleared to carry: Anthony alone drives it to the dealer and files the dealer's itemised receipt (**File the dealer’s receipt** on the *Releases & signed papers* card).
7. Receipt for Eli (**Print receipt**, **File signed receipt**). Pickup list for the auction house. Donation record and charity receipt. Proceeds statement from the auction house, each lot typed once. Ledger signed by Susan, **File signed copy**.
8. **More ▾ → Court Inventory**: names the court beside the case; §732.402 exempt property on its own subtotal with the cap check; FINAL once everything flagged is appraised or waived and every line valued; Susan adopts it: **File the adopted copy**. **Share w/ Counsel** with Okafor's address (read-only, both folders).
9. Dashboard, *Probate Information* card: **📧 Send probate package** to Daniel Okafor, copying Susan and agreements@: the Court Inventory, the Estate Inventory Report, the Disposition Ledger, the Appraisal Worklist, the record, the links. Send; **✓ I've sent it**. The Job Admin card's *Court Inventory and Disposition Ledger delivered to counsel* goes green.

### 7. Invoices and the close

Midpoint by wire from the estate account. Close-out: rate the two appraisers, the auction house, the dealer, the charity, the hauler. **■ Close job** (asks about the ledger if unsigned). Final: the rest of the fixed fee, the materials package, the two appraisers' fees at the quotes recorded. Record the final by wire.

### 8. Reader's checklists

**The client estimate and Exhibit A (Susan):** *Estate of Harold Brandt*; *Probate Estate Settlement*; the fixed fee with the 25% contingency inside it and no hours; the appraisers as their own lines; the wine collection flagged for appraisal; the probate-track sentence that the inventory is delivered to the estate attorney in time for the §733.604 filing and that counsel serves and files it; the court deadline flag cleared before sending.

**The signing packet:** the probate form; the Letters row; the case number and court; §5.2 and §5.3 with Havellin arranging every appraisal; §5.4; the PR signing in a fiduciary capacity; the certificate of completion after signing.

**The will and cash receipts (Okafor, Susan):** the will's receipt stating Havellin has not opened, read or copied it; the cash receipt with both counters, the bag number and the fiduciary's line; the dates on each match the card.

**The release approval request (Susan):** every leaving line; the painting's row and the group initials; *not yet appraised* only on an unappraised flagged line; the firearms block by serial and dealer with one initial; the suppressor named as not covered for transport; *BEQUEST TO Eli Kessler* on the watch; the Havellin rule.

**The Court Inventory (Okafor files it):** the court named beside the case; FMV at the date of death with a source word on every line; the probate and exempt tracks, the exempt subtotal and cap; homestead and non-probate property named as left off; FINAL only when every flagged line is appraised or waived; Susan's adoption line; the unreviewed-values stamp absent.

**The Appraisal Worklist:** each appraiser's packet; the MAIV aggregate tested against $3,000 for the 706; the lot cap block; the firearm transport block with the first gate each fails.

**The Disposition Ledger and the record:** every line, the sale's net to *Net to Estate*, the receipts and the statement reconciled, the dealer's receipt on the shotgun, Susan's signature; the record listing the signing act, the pickup releases and the dealer route with *recorded by*.

### 9. Taps per stage

| Stage | Phone taps | Laptop taps | Minutes | Notes |
|---|---|---|---|---|
| Intake with Probate Details and firearms | | | | |
| Build Estimate (16 rooms, 1 collection, 6 vendors) | | | | |
| Approval, send, won, packet, DocuSign | | | | |
| Staff, deposit, Letters received, Activate | | | | |
| One room: as-found + tick + 5 items + close-ups + lock | | | | |
| Firearms: two shots in place + serial close-up | | | | |
| Will: record, receipt, hand-over, filed, clerk | | | | |
| Cash: record, receipt, hand-over, filed | | | | |
| Name, room check, value (per item) | | | | |
| Firearm rows: serial, dealer, NFA | | | | |
| Appraiser linked; figure typed as Appraisal | | | | |
| Review to zero (per item) | | | | |
| Approval request signed, recorded, filed | | | | |
| Receipt, pickup list, statement, donation | | | | |
| Court Inventory adopted and filed; ledger signed | | | | |
| Probate package sent | | | | |
| Midpoint, close-out, close, final | | | | |

### 10. What the app should refuse, and what it should flag

**Refuse:**
- Activation: "the Letters of Administration on the probate track."
- Firearms: "Anthony alone may drive a non-NFA firearm to a licensed dealer, once authority, serial and dealer are recorded (`invTransportBlocked`: `nfa`, `beneficiary`, `authority`, `serial`, `dealer`, in that order)"; "An NFA item never travels with us, under any authority, and is offered no route."
- "Never buy an estate firearm and never take a percentage of firearm proceeds"; "Havellin's people never buy or receive estate property" (try a Sell line to a staff name: refused).
- Found on site: "cash is counted by two different people (`samePerson`)"; the will "refuses it without the day, the finder or that description" (the playbook, 10g).
- "Submit and the manager's approval refuse a draft still priced against an older tier (`estimateTierMoved`)" (change the tier on Edit Client with the draft unapproved on the second run and watch Submit).
- "Verbal approval is never accepted."
- "A schedule with an unvalued line, or with nothing on it, is never FINAL: it reports a floor, names the gaps and withholds the signature block."

**Flag:**
- "a hand-over on another day, or cash to somebody not in `jobFiduciaries`, is recorded and flagged, never refused."
- "a will's deposit with the clerk due `WILL_DEPOSIT_DAYS` (10) after the hand-over (§732.901), red from the day after."
- "the lot cap (§20.2031-6(a): no article in a grouped lot over $100, `invLotSplitState`, flagged at capture, never refused)"; "the MAIV aggregate … a floor until every line is valued."
- "`estateTaxReturn` … red within `ESTATE_TAX_RETURN_WARN_DAYS` (30) and once past"; "The §733.604 deadline chip turns red once its day has passed."
- "Build Estimate flags a plan ending after `job.probateDeadline` (`courtDeadlineFlag`, a flag)."
- "The appraisals tier with none on the estimate is flagged on Build Estimate (`appraisalTierNote`)."
- "An appraiser who also buys is flagged, never refused."
- "Must-find and firearm notices are prompts it raises, never ticks."
- "Above `LARGE_DEPOSIT_THRESHOLD` a personal cheque is flagged, never refused (wire preferred, cashier's cheque accepted)."
- "linking an appraiser writes no source and clears nothing (`_invSetAppraiser`), the line reads *Appraisal in progress*."

---

## Job 5 · Contested probate: the Castellano estate

### 1. Cast and premise

Vivian Castellano died on 2026-06-20. Her 3,900 sq ft Single Family Home at 212 Dunbar Road, Palm Beach, FL 33480 is administered by two co-personal representatives who do not agree: her son Marco Castellano (the representative on the record) and her daughter Elena Castellano-Ford (co-representative). Vivian's second husband has filed for an elective share, so the matter is in dispute. The estate attorney is Rachel Sommers of Sommers Whitlock, P.A.; the case is 50-2026-CP-003877-XXXX-MB; Letters issued 2026-09-14 (in hand), so the inventory is due 2026-11-13, which the plan will miss. The service is **Contested Probate Estate Settlement**; matter *Probate*; tier *Inventory with values*; Form 706 unknown; dispute yes (so the appraisal threshold drops to $500 and the level is Formal). Fixed price with the 35% contingency. The agreement goes out as a PDF to sign by hand; Elena signs the page beside Marco and Havellin files it. Marco signs the release request a week before Elena; the auction house collects the dining set in between, so that release is ratified. A Rolex both children claim stays on Hold. The deposit is a cashier's cheque from the law firm's trust account. Ashley Jerome is the concierge.

### 2. Intake (step A)

*Service type* Contested Probate Estate Settlement; *Deceased full name* Vivian Castellano; 212 Dunbar Road, Palm Beach 33480; Single Family Home; 3900 sq ft; 4 bedrooms, 3 full baths, 1 half; 22 years; value 4,200,000; walkthrough 2026-10-26, target start 2026-11-16, hard target blank; *Priority* High — probate deadline. Representative Marco Castellano, Personal Representative, 561-555-0210, marco@example.com; **+ Add a co-representative** Elena Castellano-Ford, Co-Personal Representative, 561-555-0211, elena@example.com; *Date of death* 2026-06-20; matter Probate; *Letters of Administration* Received; *Case number* 50-2026-CP-003877-XXXX-MB (the Court fills); *Letters issued* 2026-09-14; *§733.604 inventory deadline* 2026-11-13; *Property sale required?* Yes. Attorney Rachel Sommers, Sommers Whitlock, P.A., 561-555-0150, rsommers@example.com. *Form 706* leave at *Unknown — treated as yes*; *Known dispute, contest, or elective share?* Yes — contested or likely to be; tier Inventory with values; the level greys at Formal and the box under the questions says why. Question 1: *Mother's Rolex, bedroom dresser, both children claim it.* Question 2: *Elena and Marco should not be on site at the same time.* Rows: *Valuables*, *Access & security* (*Marco has keys; Elena has the alarm code*). Concierge Ashley. Expect no amber service box: a contested service is never flagged for the matter.

### 3. Build Estimate (step B)

Press **Normal**. Tick Entryway / Foyer, Living Room, Dining Room, Kitchen, Office 1, Primary Suite, Primary Bath, Walk-in Closet, Bedroom 2, Bedroom 3, Bedroom 4, and in *Garage & Storage* *Garage (2-car)*; tap Bathroom 2, Bathroom 3 and the *Entry & Living* Half Bath round to **✕**. Dining Room 4/4 (the set). *Multiple heirs* is greyed on contested probate: confirm it. Vendors: Auction House 0; Jewelry & Watch Appraiser **Est Cost** 650; Donation Organization; Junk Removal / Hauling 700. Collections: none. Materials: Estate Basic — $500. Fixed price (35%). The projected completion is after 2026-11-13: read the amber deadline line under the total and leave it (counsel will seek an extension; note it in *Private Walkthrough Notes*). Save.

### 4. Approval to activation

Approve, send (copies Marco, Elena, agreements@), mark won (*Email reply* from Rachel Sommers on the PRs' behalf, pasted). Read the packet: *Contested Probate Estate Settlement* in the title; Elena's *Co-Signer* block; §5.1's joinder; the dispute does not change the form. Press **📄 Send as PDF to sign by hand**: the Gmail draft says *Each co-representative named on the signature page signs it too*; send it; **✓ I've sent it**. Staff Ashley and two specialists. When the signed packet returns with Marco's signature only: **✓ Record the signed agreement** (*Who signed it?* Marco Castellano, *Signed copy returned*, the date). The notice and the *Agreement signed* row read in amber *Not on record: the signature of Elena Castellano-Ford*. Under the timeline, *Co-representatives on the agreement*: **File the page signed by Elena Castellano-Ford** with the photographed page once it arrives; the flag clears. Deposit: *Cashier's cheque*, *Paid by* Sommers Whitlock, P.A. Trust Account, photo; it sits *Uncleared*; **✓ Mark cleared** when the bank confirms. Activate 2026-11-16 (the Letters are *Received*). The strip shows the deadline in red once 2026-11-13 has passed, and *Form 706 due 2027-03-20, if a return is filed*.

### 5. The house (phone, three days)

Rooms as in Job 3. The Rolex: one item shot, **⚑ Appraise** before it, note *both children claim it*, chip **Undecided**. The dining set: one shot of the table, one of the chairs as a set, chip **Sell**. Jewellery: own photo each, **⚑ Appraise** on anything over $500 (the disputed threshold). Lock every room. Hours daily.
- A beneficiary complains by phone that a room was entered before she arrived. **Report an incident**, *Client complaint*, who and how it reached us, what she asked for. No banner (a complaint does not alert). **Resolve** with the call back and what was agreed. The record goes to counsel in the package; read it as the attorney would (P26).

### 6. The Job Admin & Inv tab (laptop)

1. Name, room check, value. The dispute lowers the appraisal threshold: the *Needs appraiser* count grows; link the jewellery appraiser to the pieces it will see, waive nothing yet.
2. The Rolex: disposition *Hold*; tick its disputed flag in the record (*Disputed / Hold* counts it). It never appears on a request.
3. Confirm the auction house on the plan; the Sell rows take it as *Channel / Recipient*.
4. **Approval Request** (first): addressed to Marco and Elena, two signature lines, *both must sign*; the dining set and the other leaving lines; the appraisal caution on the jewellery. Marco signs on 2026-11-19. Tick those lines, **Record approval**: tick Marco only, date 2026-11-19; before confirming, read the dialog's note that the lines stay open for Elena; confirm. The rows read *approval incomplete*; the Job Plan's release-authority line names Elena.
5. The auction house collects the dining set on 2026-11-20 before Elena has signed: *Vendor pickups* → **File pickup list** for the auction house. Nothing refuses it; the dining rows now read *ratification owed*.
6. **Approval Request** (second): the lines still waiting read *Signed so far by Marco Castellano (2026-11-19); still to sign: Elena Castellano-Ford*; the dining set is listed apart under *Already released: for ratification*. Elena signs on 2026-11-26. **Record approval**, tick Elena, 2026-11-26: the lines complete; each name keeps its own day (*authBy* reads both with their days in brackets). **File the signed request** for each signing act; *Releases & signed papers* lists two acts, one per day.
7. On the second run only: add a third co-representative on Edit Client after both have signed and watch every approved line read *approval incomplete* again; then remove them (nobody's bequest names them) and watch the lines clear.
8. The jewellery appraisal comes in: type each figure with source Appraisal. Pickup list, proceeds statement, donation receipt, ledger signed by Marco and Elena (two lines), Court Inventory adopted (two adoption lines), **File the adopted copy**. **📧 Send probate package** to Rachel Sommers, copying both.

### 7. Invoices and the close

Midpoint by wire from the trust account; close-out with every vendor rated (the auction house, the charity, the hauler, the appraiser); **■ Close job**; final; record the wire. The Google review ask is drafted as on every job; whether to send it is the concierge's call. Never post about the house.

### 8. Reader's checklists

**The client estimate, Exhibit A and the packet (Marco, Elena, Sommers):** *Contested Probate Estate Settlement*; the 35% contingency inside the fee, no hours; the Letters row; the case and court; Elena's named Co-Signer block; the probate-track §733.604 sentence; the court deadline line that the plan ends after the filing date, cleared with counsel; the co-signed page filed and linked on the *Agreement signed* row.

**The first and second release requests:** both fiduciaries by name, two lines, *both must sign*; the Rolex absent (Hold); the jewellery lines each on their own initial with *has not been appraised yet*; on the second request the *Signed so far by…* line with Marco's day, and *Already released: for ratification* listing the dining set for Elena's signature, with the request saying nothing is to be moved for those lines; the Havellin rule.

**The Court Inventory and the Trust Schedule:** the Court Inventory only (no trust); the court beside the case; two adoption lines; the disputed line carried with its flag; FINAL only when every line over $500 flagged is appraised or waived.

**The Disposition Ledger and the record:** two signature lines; the dining set's release recorded with the pickup list's day and the approval showing both signers and their days; the proceeds reconciled; the record printing the two signing acts and the pickup release with *recorded by*.

### 9. Taps per stage

| Stage | Phone taps | Laptop taps | Minutes | Notes |
|---|---|---|---|---|
| Intake with a co-PR and the dispute | | | | |
| Build Estimate (12 rooms, 3 out of scope, 4 vendors) | | | | |
| Approval, send, won | | | | |
| Packet by PDF, signature recorded, co-signed page filed | | | | |
| Staff, deposit, cleared, Activate | | | | |
| One room: as-found + tick + 5 items + lock | | | | |
| Name, room check, value (per item) | | | | |
| Review to zero (per item) | | | | |
| First request, Marco's partial approval, filed | | | | |
| Pickup list before the second signature | | | | |
| Second request, Elena's approval, filed | | | | |
| Appraisal figures typed | | | | |
| Statement, donation, ledger signed, Court Inventory adopted | | | | |
| Probate package sent | | | | |
| Midpoint, close-out, close, final | | | | |

### 10. What the app should refuse, and what it should flag

**Refuse:**
- "A partial approval is saved, never refused (Anthony, P20, Q24) … it refuses only nobody ticked or no date."
- "Refusing a partial release approval, or undoing a release that left before every fiduciary signed" is on the *Decided: do not re-propose* list: neither happens.
- "Contested Probate is never flagged: a fight over a trust usually reaches a court too, so its price stays."
- The level: "The manual choice can raise it, never lower it" (try to set *Standard* on Edit Client).
- Activation, the final's hours, the vendor ratings and the staff rule, as in Job 4.

**Flag:**
- "A co-representative recorded later makes an earlier approval incomplete (`invApprovalGap`; the row reads *approval incomplete*, or *ratification owed* once the line has gone)."
- "A line that left before every fiduciary approved it is ratified, never undone (Anthony, P20, Q23)."
- "a recorded dispute" lowers the threshold: "`invAppraisalThreshold`, $3,000 or $500 on a disputed estate."
- "`agreementCoSignState` … the Agreement signed row (its `flag`, amber on the rail and the track; the row stays done and nothing waits on it)."
- "Build Estimate flags a plan ending after `job.probateDeadline` (`courtDeadlineFlag`, a flag)"; "The §733.604 deadline chip turns red once its day has passed."
- "A dispute means beneficiaries disagree and we hold" (the playbook): the *DISPUTED* badge where a disputed line is ever proposed to leave.
- "Suppressing the Google review ask on a contested matter … it stays on every job; the concierge decides whether to send it."

---

## Job 6 · The walkaway: the Pruitt cleanout

### 1. Cast and premise

Gerald Pruitt, 84, is leaving the 2,200 sq ft Town Home at 88 Jupiter Lakes Boulevard, Jupiter, FL 33458 for assisted living; his son Dennis runs the arrangements and pays. The service is **Home Cleanout**, hourly, a living client. Dennis pays the deposit by cheque and, at his own ask, the midpoint early by wire. After one day of work the assisted-living place falls through and Dennis stops the job. The job closes as *Closed — Deposit Retained*: the deposit is kept (the agreement makes it earned on signature), the work done is less than the deposit, and the midpoint money goes back. The refund is recorded once sent, and the settlement final goes to Dennis. Anthony Graziano is the concierge.

### 2. Intake (step A)

*Service type* Home Cleanout; *Client full name* Gerald Pruitt, 561-555-0230, dpruitt@example.com (Dennis reads the mail); 88 Jupiter Lakes Blvd, Jupiter 33458; Town Home; 2200 sq ft; 3 bedrooms, 2 full baths, no half; 19 years; value 620,000; walkthrough 2026-10-27, target start 2026-11-17; *Priority* Urgent — health / emergency; *Premium* No. Question 1: *Navy photographs, hall closet.* Question 2: *Gerald is frail; a walker in the hall.* Rows: *Access & security* (*HOA gate; call the office for the dumpster*). Expect the *Certificate of Insurance* box later on the plan: a Town Home asks it. Concierge Anthony; *Referral source* Senior living community.

### 3. Build Estimate (step B)

Press **Full**. Tick Living Room, Dining Room, Kitchen, Primary Suite, Primary Bath, Walk-in Closet, Bedroom 2, Bedroom 3, Bathroom 2, and in *Garage & Storage* *Garage (1-car)*. Vendors: *End-of-Job Logistics* → Dumpster Rental **Est Cost** 650, Donation Organization 0. Materials: Home Editing / Transition Basic — $200. Hourly (untick nothing; a living service opens hourly). Save. Write the services total ______ and the deposit (half) ______.

### 4. Approval to activation

Approve, send, mark won (*Phone call*, Dennis). Packet by **✉ Send for signature — DocuSign** to Gerald (he signs with Dennis beside him): read §12.4 before it goes, the deposit earned on signature and applied against the hours and materials worked. Staff Anthony and two specialists. Deposit: *Personal cheque*, *Paid by* Dennis Pruitt, photo; **✓ Mark cleared** two days later. **▶ Activate job** 2026-11-17. Tick *Moving materials on site for Day 1 morning* the morning the boxes arrive (the walkaway reads that tick). That morning Dennis asks to pay the midpoint now: on the *Midpoint invoice sent* row the send is an outline button reading *due around…*; press **✉ Send midpoint invoice** anyway, confirm, and record a *Wire transfer*, *Paid by* Dennis Pruitt, for what it asks.

### 5. The house (phone, one day)

Day 1: as-found and items in the Living Room, the Kitchen and Bedroom 2 (chips **Remove** and **Donate**, the photographs **Keep**, **Found it** on the Navy photographs). Lock the three rooms. Log the day: Anthony 6, each specialist 6. That evening Dennis calls: the place fell through, stop.
- Mold behind the garage shelving: **Report an incident**, *Hazardous condition*, work stopped *Yes*, photographs. The header reads red while it is open. Then try the close-out with the deposit retained: it is refused until the incident is resolved; mark it resolved with what was done and close (P26, Q68).

### 6. The Job Admin & Inv tab (laptop)

Name and value the day's shots (a living job: *To a specialist* instead of *Needs appraiser*); decide the rows so the Contents Record can be printed for what was touched; it reads *IN PROGRESS* if anything is undecided, and that is honest. Nothing left the house, so no recipient is owed.

### 7. The close-out as Deposit Retained, the refund, the settlement

1. On the Client Dashboard's client list press the **✕** on Gerald's row (the job is active, so it is still there). The box names the money received (the deposit plus the midpoint) and shows three rows: *Received*, *Earned* (the deposit, since the one day's work as the final would bill it is less than it) and *Refund due* (the midpoint wire). The button reads **Close — Retain $… · refund $…**. If it says the hours log has not loaded, reload and come back; it will not guess the hours as none. Press it. Where a reason is asked, pick *Timing — client not ready yet* and note *assisted living fell through*.
2. The job reads *Closed — Deposit Retained* and counts as won at what it kept. The *Walkaway settlement* card sits above the payments list: received, earned, the refund due, and the note of what the work done counted (the hours, the materials package only because its box was ticked). The *Final invoice* on the card is the settlement document: **👁 View** it (part 8), **✉ Send final invoice**, confirm.
3. Anthony sends the wire back. Press **Record refund**: it opens on the amount due and today; *Method* Wire transfer, *Reference* the confirmation, *Paid to* Dennis Pruitt; **Record refund →**. Try first with more than is due: it asks for a reason; try more than the job holds: refused. The refund joins the payments list as its own line; the amount retained drops to what was earned; the status stays *Closed — Deposit Retained* because the deposit is kept whole. On the second run record a refund that takes the job below its deposit and watch it read *Closed — Refunded* and count as lost; **Void** that refund with a reason and watch it return.
4. Try **✓ Record payment** on the settlement final: refused by name. Try **↺ Re-open job**: it is not offered once the final has gone out.
5. Rate the dumpster company on the scorecard (it was booked) and close the Close-out card's lines where they apply; nothing here gates the terminal status.

### 8. Reader's checklists

**The client estimate and the packet (Gerald, Dennis):** *Home Cleanout* to a living owner; hourly rows in whole hours; the dumpster at cost; the materials package; §12.4's deposit clause as the script describes; no refund language beyond Havellin's uncured breach.

**The deposit and midpoint invoices:** the deposit *Due upon acceptance…*; the midpoint invoice sent early with no word that it is early (known); its 75% row and the amount asked; the wire recorded against it.

**The settlement final (Dennis):** headed *Settlement — the engagement ended early*; the work done priced from the hours logged on the one day at the job's rates, the materials package (ticked) and the dumpster fee at the quote recorded; the deposit shown as earned; the payments received; *Refund Due to You* equal to the card's *Refund due*; cents where any; no variance narrative; no PIN asked unless it lands outside the tolerance; it never waits on hours.

**The payments list:** the cheque with its clearing day and who cleared it; the wire; the refund as its own line with method, reference, payee and who recorded it; a void, if one was made, struck through with its reason.

### 9. Taps per stage

| Stage | Phone taps | Laptop taps | Minutes | Notes |
|---|---|---|---|---|
| Intake | | | | |
| Build Estimate (10 rooms, 2 vendors) | | | | |
| Approval, send, won, packet, DocuSign | | | | |
| Staff, deposit, cleared | | | | |
| Activate, materials tick | | | | |
| Midpoint sent early and wire recorded | | | | |
| Three rooms shot and locked | | | | |
| Hours, one day | | | | |
| Job Admin & Inv: name, value, decide | | | | |
| ✕, close-out dialog to Deposit Retained | | | | |
| Settlement final viewed and sent | | | | |
| Refund recorded | | | | |
| Void and re-record (second run) | | | | |

### 10. What the app should refuse, and what it should flag

**Refuse:**
- "A settled job (delivered, or final paid: `jobIsSettled`) cannot be marked lost" (the ✕ goes once the work is delivered or a final payment is recorded; here it is still there).
- "`refundBlocker` refuses only an unknown settlement or a job holding nothing"; "`saveRefund` refuses more than the job holds and, above what is due, requires a reason."
- "The walkaway answers `unknown` until the hours log has loaded (`_logsState`, `hoursLogReady`)" and "nothing prints a figure or offers a refund" until then.
- "`dashRecordPayment` refuses that final by name."
- "Re-open (`_reopenTransition`) works until the final invoice is sent or paid (`jobReopenBlocker`)."
- "A payment is never corrected and a void never undone (Anthony, P17): void it with the reason and record it again."
- "Refunding a deposit on an hourly walkaway" is on the *Decided: do not re-propose* list: "only what came in above the deposit or the work done, whichever is more, goes back."

**Flag:**
- "with no midpoint payment it asks first" (Close job) does not apply here (the midpoint is paid); the ✕'s dialog states the three rows before anything is written.
- "`walkawayWorkNote` names what it left out" (the materials package if the box was never ticked).
- "Refunds that leave the job keeping less than the deposit … read *Closed — Refunded* (`jobClosedRefunded`…), with the amount kept, and count as lost in Win / Loss."
- "a walkaway's terminal row says the whole sum received is *retained* before the refund due is recorded" (known, not fixed: note what the row reads before and after the refund).
- "Crew hours logged with none of the concierge's are flagged, never refused" (log the specialists only on the second run and read the settlement card).

---

## Recording the runs

- Each run gets a heading in the tracker: *Six jobs, run 1 (date)*, then *run 2*. Under it, one line per finding: the job, the stage, the control pressed, what happened, what was expected, and the triage verdict. The taps tables are copied in whole.
- A document that fails its checklist is a *fix now* when the money, the party or the legal wording is wrong, and a *fix if cheap* when a sentence is unclear.
- A refusal or a flag in part 10 that did not fire is a *fix now*: the rule exists and the app did not keep it.
- When both runs pass with nothing in *fix now*, the mock job in a real house is next, then the attorney's hour with the trust package.
