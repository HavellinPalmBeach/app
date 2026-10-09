# Havellin Workflow Audit — September 28, 2026

Five audits and a click-through of three jobs, from + Add New Client to final payment: intake, the estimator, the client documents, the job plan and sync. Nothing in the app was changed.

Status of each fix pack lives in this file: when a session lands a pack, it marks it done here and adds its CLAUDE.md entry.

**Status, 2026-09-30:** P1–P10 have landed on `main`: C1, C2, H1–H9, M1–M8, M13–M16 and nineteen lows are fixed and marked below, plus Anthony's follow-up to P7 (the final invoice names only the invoices that went out, and a closed job can be re-opened; see H3). The P10 low that waited on Anthony (`deliveredBy` / `activatedBy`) is answered and fixed with P14 (the assigned concierge). P11 landed on 2026-09-30 (live once the Apps Script is redeployed, `2026-09-30`), and so did P14; its one open line, sanity checks on square footage and room counts, is decided not to build (Anthony, 2026-09-30: "no sanity check is needed"). P12 landed on 2026-09-30 too (M10–M12 and the six estimator lows fixed and marked below). Anthony answered the last three questions the same day (the hourly half of Q5 stays as it is; the Q14 follow-up and Q20 yes), and P15 built them with the Home Prep change-order vendor and four small items. P13, the documentation pass, landed on 2026-09-30 as well. Every pack has landed and every question is answered; what is left is Anthony's own list below and the items found in passing (under *Known and still open*).

**Status, 2026-10-06:** P16 to P21 landed on 2026-09-30 to 2026-10-05. On 2026-10-06 P22 cleared the known-bug list with Anthony's answers of that day (its backend half `2026-10-06`), and **P23, Agent Two (valuation), landed** (live once the Apps Script is redeployed, `2026-10-06b`). The same day **P24** added the room check and put walkthrough collections on the inventory by themselves, for the first mock job with a full inventory: Anthony redeployed `2026-10-06c` that day, and its first live room check read eight photographs in 32 seconds, so `2026-10-06d` reads a room in runs of 12 to answer inside Apps Script's limit (redeployed the same afternoon: six photographs in one run in 15 seconds). What comes next is the road to launch below: Anthony chose Agent Two first, then a freeze.

**Status, 2026-10-09:** the job-flow audit below ran a whole job on every service through the real controls (2026-10-08) and fixed what met the triage bar's *fix now* and the cheap *fix if cheap* items. Anthony answered Q33 to Q56 on 2026-10-09: 23 to build as P25, Q55 kept as it is.

## Road to launch (Anthony, 2026-10-06)

Anthony asked how to stop the whack-a-mole and reach an app that works for a transition concierge in the field and gives a trust attorney or personal representative what they need. The answer recommended, and his choice on the freeze (*"Agent Two first"*):

1. **Agent Two, then a feature freeze.** P23 built Agent Two. From here **no new features or rules** until the exit below; only what the six jobs, the pilot or the attorney's read turn up is built. One session works on `main` at a time.
2. **Six jobs, scripted** (to draft for Anthony's correction, modelled on real jobs where he has them): a Home Transition (living couple, hourly, a change order mid-job); a Home Prep for a listing agent (fee-only); a trust estate (two co-trustee siblings, bequests, auction and donations, the signed ledger); a probate (Letters, a firearm to a dealer and an NFA item, a will and cash found on site, a 706 estate, appraisals); a contested probate (a dispute, partial approvals, ratification); a walkaway (deposit kept, excess refunded).
3. **Each run whole in the real browser**, intake to close: the concierge on a phone in the field, the desk on a laptop. Every document the attorney or representative receives is checked against a reader's checklist (inventory with date-of-death value and basis, custody, every fiduciary's approval, receipts, proceeds reconciled, the signed ledger), and the taps per stage are counted so click overhead is measured. The six become the gate: nothing ships unless all six pass.
4. **One triage bar** for what they find and for the open list in `CLAUDE.md`: fix now (wrong money, wrong party or legal wording, lost data, a job with no way forward); fix if cheap (extra taps or a confusing step on a full house); accept and close (edge cases, dummy data only, cosmetic).
5. **Real world:** a mock job in a real house (Ashley as concierge on her phone, real Drive and Gmail, the DocuSign sandbox with a co-signer, a Stripe test ACH), then an hour with a friendly trust and estate attorney on the trust package (*what is missing?*). The freeze also lets the counsel bundle go.
6. **Exit:** all six pass twice running with nothing in *fix now*, the pilot is done and the attorney has read the package. Tag it v1.0; after that every change reruns the six.
7. **The field method (2026-10-06).** Anthony asked for a best-practices manual for photographing a house so nothing is counted twice (*"if there is a blue vase and I take a picture of it on a dresser and then I take another picture zoomed in on the blue vase … the agent should realize it's the same"*: it does not, unless the zoom is a *Detail of last*). Built as `photography-guide.html`, *Photographing a House*, and rewritten the same day in plain words and shorter at Anthony's ask (*"write this in human speak and cut it down to size"*): three rules, the camera's four buttons, the vase done wrong and right, a room in six steps, its own photo or a group photo, close-ups, special situations, the review on the computer and a pocket card. Draft for Anthony to read; the six scripts and the pilot house follow it. Found writing it, for the triage bar (CLAUDE.md, Open work): a walkthrough collection shot in the house stays listed as not brought in, and bringing it in doubles it; a split frame's chip, ⚑ and close-ups stay on its first line; a note said over a close-up is read by nobody; *Possible duplicates* compares names only. Anthony took the room check over the guide's shot spot (*"Fix option 2 above with room level check. That's an obvious fix and will help with our fake client we are doing tomorrow with full inventory"*) and asked for collections on the inventory by themselves (*"definitely fix the collection double count. collections should automatically be in inventory and obviously need photo documentation"*): built as P24 the same day, below, which fixes the first and the last of those four. The guide's other two calls (the whole-house as-found pass first on an estate; cash never an Items shot) are still drafted for him to confirm.

## Job-flow audit (2026-10-08)

Anthony: *"run through a job in each category … make sure the actual operational job of the transition concierge and the property specialist is not overly complicated by unnecessary buttons and clicks … or tick boxes … fix any bugs … come back to me with a series of questions."* The first whole-job runs the road to launch asks for (step 2–3 above), done by five auditors on a frozen copy through the real controls: the field at 390 px, the desk at 1440, every tap, field and dialog counted.

| Job | Reached | Money (to the cent) | Taps |
|---|---|---|---|
| Home Transition, hourly, 20 rooms, 47 lines, a change order, move day | Closed, final paid | $24,145 estimated; $12,072.50 + $6,047.50 + $7,115 = $25,235 billed (hours trued, change order +20 h) | ~790 (In the house 307; Move day 15; Close-out rooms 122) |
| Home Editing | Intake to plan | — | as Transition, less Move day and new-home prep |
| Home Cleanout, fixed, 14 rooms | Closed, final paid | $7,550 + $3,775 + $3,775 = $15,100 | 215 |
| Home Prep, fee-only | Closed, final paid | fee $5,895 on $19,650 of quotes | 108 |
| Home Prep, 6 declutter hours, change order adds a vendor | Closed, final paid | $2,700 | 108 |
| Trust estate, two co-trustees, bequests, auction, donation, ledger | Closed, final paid | $22,750 + $11,375 + $11,375 = $45,500; auction net $31,200 reconciled | ~640 measured; ~2,550 at 15 rooms and 400 lines |
| Probate, Letters, firearm via dealer + NFA, will and cash found, 706, appraisals | Closed, final paid | $25,600 + $12,800 + $12,800 = $51,200; Court Inventory $43,115 + exempt $2,700 | ~2,100 field + ~1,200 desk at full size |
| Contested probate (Both), two co-PRs, hourly, partial approval and ratification | Closed, final paid (PIN at +26%) | $48,050 estimated; $60,500 billed | per room 8 fixed + 1.3 per item |
| Hourly walkaway (trust) | Deposit Retained, refund recorded | kept $6,975, refunded $3,487.50 | 4 taps to close and refund |

Zero page errors in every run; no horizontal overflow at 390 px except the contested desk's chips (188 px).

**Where the taps go.** In the field: about 14 taps per room before a single item (open, As found, Done, the pass-complete tick, Items, Done, Lock, back; then After, Done, Cleared, back), 2 per close-up, and about 1.5 to 4.4 per item. At the desk: proceeds typed line by line (about 750 taps on 150 sold lots), appraisers linked one line at a time, recipients typed per line, hours typed from scratch daily. Tick boxes: Move Day's 13, and a set the app could derive (questions below).

**Fixed in this pass** (`tests/job-flow-audit.test.js`, browser step 71; `BUILD_HISTORY.md` has the detail):
- [x] The Job Plan re-rendered itself without end on any job whose photographs were on the sheet: three auditors were stopped by it (193 to 350 rewrites in a few seconds, every control detached, a note lost mid-sentence).
- [x] Every estate invoice billed the decedent (*Client: Harold Whitcombe · Phone: —*); it now names the estate or the trust and the representative, as the estimate does.
- [x] As-found and after shots never reached the sheet on their own.
- [x] Agent Two's source and comparables sentence printed under figures the appraiser or the desk set (on the report sent to the attorney).
- [x] The trust package carried probate words (*the personal representative's filing*, *the §733.604 probate schedule*).
- [x] The estimate and Exhibit A were re-dated every time they were viewed; now the approval's date.
- [x] A fee-only Home Prep's invoices billed "actual hours" against an agreement that says no hours are billed.
- [x] An accepted change order dropped the vendors from the client list's Total Est.
- [x] The beneficiary's receipt named one "trustee" of the trust's raw name on a trust with two co-trustees.
- [x] The living Contents Record claimed every line photographed and the photos shared, whatever the record said.
- [x] A deposit cheque handed over at signing could not be recorded until an invoice for it was emailed.
- [x] The concierge confirmed on the Job Plan never reached the job (dashboard *Unassigned*; the handover credited to the approver).
- [x] A fixed price was told its final waits on the hours; the fixed-fee blurb promised materials with none priced.
- [x] Stage counts never repainted; background notices were blocking pop-ups; the unsaved chip covered the camera shutter; the §733.604 chip stayed green past the deadline; *Contractor TBD* printed as a person on the final; a bequest with no recipient yet read *going elsewhere*; the request said *not been valued* over valued lines, and *all 2 of you*.

**Found and not fixed** (the triage bar's *fix if cheap*, listed in `CLAUDE.md`, Open work): Manager approval on every final; the rail's invoice rows show the planned split, not what went; a walkaway's row says *retained* before the refund due is recorded; the custody record leaves out releases made by receipt; the ledger prints appraisal cautions and an empty Date column; Home Prep's second invoice is the band's button from activation; change-order reasons are one list for every service; the desk's chips overflow at 390 px.

## TL;DR

The arithmetic is right everywhere we could reach. What breaks is state: values that outlive the client they belong to, edits one device undoes on another, and three places in the job lifecycle with no way forward.

**2 Critical · 9 High · 16 Medium · 34 Low**

**Working**

- **The money.** 79 pricing scenarios reconcile to the dollar across the estimate, the agreement, Exhibit A and all three invoices.
- **The whole journey.** Three jobs ran from + Add New Client to final paid through the real buttons, with zero errors.
- **Delivery and gates.** The right recipients, copies, DocuSign signer and Stripe amount, and every gate refuses with a reason.
- **Saved estimates** keep their price when Settings change.

**Broken, worst first**

1. **C1** Build Estimate carries the last client's discount, private note and more into the next client's estimate.
2. **C2** Vendor quotes and the confirmed team can be undone by the other device's routine save.
3. **H2** Change orders can be created but never accepted or printed.
4. **H3** A finished job can't close or send its final invoice while the midpoint is unpaid.
5. **H1** One manager PIN unlocks every over-tolerance final invoice for the rest of the session.
6. **H4** A cloud refresh can wipe a new client or an edit before its save lands.
7. **H5** "Work done" tops out at 42–74%, so jobs on schedule read as late.
8. **H6** The rush line on estimates and invoices promises a second concierge nobody priced.
9. **H7** Edit Client erases fields it can't show, keeps estate data across service switches, and silently deletes closing dates.

## Findings

### Critical (2)

#### C1 · Build Estimate · The last client's discount, private note and more carry into the next client's estimate. — **Fixed 2026-09-29**

A fresh estimate keeps the previous client's preferred-client discount, move styling (+8 specialist hours on Home Transition), private walkthrough note and "Walkthrough by". If the previous estimate wasn't saved, its collections, vehicles and target date come along too, and the discount and note survive even a Save. Measured: a 10% discount rode through five new clients; a fixed-price estimate lost $2,220 with no discount line printed; another estate's coin collection and car printed on the next client's estimate; one family's note ("the son contests the will") landed on another family's record.

**Where:** `applyOpenedEstimate` (fresh branch), `neutralizeEstimateView`, `resetEstimateExtras`, `clearEstimateTab`. Only `restoreEstimateToUI` ever writes `#e-discount` or `_privateWalkNote`.

**Fix:** P1 (Stop estimates leaking between clients)

#### C2 · Sync · Vendor quotes and the confirmed team get undone by the other device. — **Fixed 2026-09-29**

The Job Plan's sourcing and crew controls save without updating the job's modified time. When a second device that loaded the job earlier saves anything at all, the server treats its old copy as equally new and keeps it. A confirmed $23,400 painter vanishes, the confirmed team resets, and the final invoice then bills the prep fee on the estimate and drops logistics actuals ($850 → $0).

**Where:** The sourcing setters (`setJobVendorQuote`, `setPrepVendorStatus`, `setLogisticsQuote`…) and crew setters (`setCrewTC`, `confirmJobTeam`…) call only `saveJobs()`, which fills `updatedAt` only when missing; `_mergeJobRecord` in main-sync.gs keeps the incoming copy on a tie.

**Fix:** P2 (Stamp every Job Plan edit so the other device can't undo it)

### High (9)

#### H1 · Invoices · One manager PIN unlocks every over-tolerance final for the rest of the session. — **Fixed 2026-09-29**

The final-invoice approval is a page-wide flag, not stored on the job. Approve job B's final and job A's, also 30% over, prints with no PIN. B stays approved after more hours are logged, a reload forgets the approval, and nothing records who approved which variance.

**Where:** `invApproved` / `invApprovedBy` / `invApprovedAt` globals, set in `checkInvPin`, read by `DOC_ACTIONS.invoice.blocker` and the "Approved for Release" band; only the retired Invoices tab cleared them.

**Fix:** P4 (Keep manager approvals on the job)

#### H2 · Job lifecycle · Change orders can be created but never accepted or printed. — **Fixed 2026-09-29**

The Get acceptance and PDF buttons exist only in a client-list detail row that is never displayed, and the dashboard card shows "Awaiting acceptance" with nothing to press. So no change order can be signed, lengthen the plan, clear an overrun flag or be billed on a fixed-price final, and a vendors-only Home Prep job can never open its hours log. The browser tests reach acceptance through `page.evaluate`, which is why they pass.

**Where:** `renderJobs` builds the buttons into `detailHtml` and never appends it; the dashboard Change Orders card has no actions.

**Fix:** P5 (Give change orders their buttons)

#### H3 · Job lifecycle · A finished job can't be closed, or sent its final invoice, while the midpoint is unpaid. — **Fixed 2026-09-29**

Close job appears only on the Work complete step, which comes after the midpoint payment, and the final invoice comes after that. With the midpoint outstanding the band reads "Collect the midpoint payment" and no screen can close the job. The only way out is to record money that hasn't arrived.

**Where:** `jobTimelineActions` (`work_complete`); the client list's Status button is overwritten on the next line of `renderJobs`.

**Fix:** P7 (Let a finished job close with the midpoint unpaid)

**Follow-up, 2026-09-29:** Anthony took two of the four things the P7 build left open (*"yes to 2 and 3, reword the final and add Re-open"*). The final invoice now names only the invoices that actually went out, and a closed job can be re-opened with **↺ Re-open job** on its timeline until the final invoice goes out. Not taken: a filled *Log today's hours* button on activation day; the every-room-locked reading of "half the work" stands as shipped. See CLAUDE.md.

#### H4 · Sync · A cloud refresh wipes edits that haven't reached the sheet yet. — **Fixed 2026-09-29**

With realistic Apps Script delays: create a client and press Build estimate straight away, and the client disappears from the device; score rooms and Save, and it says "Job not found" and the walkthrough is lost. Change square footage in Edit Client and press Build estimate: it prices the old size, and the change reverts on this device.

**Where:** `refreshJobsFromCloud` has no `_syncWritesOutstanding()` check; five callers, two of them on timers.

**Fix:** P3 (Hold the cloud refresh until this device's saves land)

#### H5 · Job Plan · "Work done" can't reach 100%, so jobs on schedule read as behind. — **Fixed 2026-09-29**

Progress adds up room hours but divides by the whole estimate, which includes coordination and move-day hours no room carries. With every room cleared, real estimates read 42% (Home Transition) to 74% (Home Cleanout). A 4-day cleanout finished on day 3 says it will run a day late and tells you to re-plan or raise a change order, which H2 makes impossible.

**Where:** `jobProgress`.

**Fix:** P8 (Measure work done against the rooms)

#### H6 · Client documents · The rush line promises a second concierge and a bigger crew nobody priced. — **Fixed 2026-09-29**

Every rush estimate and invoice says "A second Transition Concierge and an expanded specialist crew working in parallel". Rush is a flat 20% and adds no one, and the estimate is Exhibit A of the signed agreement.

**Where:** `clientEstimateHtml` and `invoiceHtml`, the Expedited Delivery row.

**Fix:** P6 (Make the client documents match the estimate)

#### H7 · Edit Client · Saving Edit Client erases fields it can't display. — **Fixed 2026-09-30**

Its concierge list is hard-coded (and includes Anthony Jr, a specialist), and its representative-role list lacks the three ad litem roles intake offers. Any save, even one to fix a date, writes them back blank: a directory concierge is removed (the job's contact falls back to Anthony) and an ad litem role is lost.

**Where:** `showEditClient` (the two lists, `sel()` exact match), `saveClientEdit` writes both back unconditionally.

**Fix:** P9 (Bring Edit Client up to intake's rules)

#### H8 · Edit Client · Switching between a living and an estate service keeps the wrong person's data. — **Fixed 2026-09-30**

Edit Client allows the switch and keeps everything. A living client re-typed to an estate service keeps their own email, and Edit Client even marks phone and email required on estate jobs. DocuSign's signer lookup takes the client email first, so the signature request can go out under the deceased's name. The other way round, a job that kept its representative reads "Estate of …" on the client estimate.

**Where:** `showEditClient` / `saveClientEdit`; `esignSigner` prefers `job.email` on every service.

**Fix:** P9 (Bring Edit Client up to intake's rules)

#### H9 · Intake & Edit Client · Moving a date silently deletes the closing date or the start date. — **Fixed 2026-09-30**

If the start moves past the hard target, the hard target is erased; if the start falls before the walkthrough, the start is erased. There is no message. The erased date is the one the schedule uses to flag a job that will miss a closing.

**Where:** `dateChainGuard` (only the weekend case speaks).

**Fix:** P9 (Bring Edit Client up to intake's rules)

### Medium (16)

#### M1 · Client documents · The agreement's "Approved for Sending" band can show another job's approver. — **Fixed 2026-09-29**

Both agreement builders read page-wide approval variables. After approving job B, job A's agreement, including the HTML converted for DocuSign, shows B's approver and date. The band is hidden only when printing; if the PDF conversion ignores print styles it ships on the client's contract. One real envelope settles it.

**Where:** `agreementHtml`, `probateAgreementHtml` read `agrApproved` / `agrApprovedBy` / `agrApprovedAt`.

**Fix:** P4 (Keep manager approvals on the job)

#### M2 · Invoices · The final's "Original Estimate" includes change-order hours. — **Fixed 2026-09-29**

A $10,962 hourly job with an accepted +10/+10 change order shows an original estimate of $13,462 above a $5,481 deposit and a $2,741 midpoint that don't add up to it. Home Prep shows $14,700 against a signed $13,500.

**Where:** `invoiceHtml` prints `estHavellinTotal`, which adds the change-order shift.

**Fix:** P6 (Make the client documents match the estimate)

#### M3 · Build Estimate · The discount pop-up can't remove a discount, and leaves the agreement approved at the old price. — **Fixed 2026-09-29**

A blank or 0 applies 1% and sends the estimate back for approval. The agreement stays approved, so the signing packet filed in Drive keeps the old Exhibit A price.

**Where:** `applyDiscountRevision` (`Math.max(1, …)`; no agreement revoke).

**Fix:** P6 (Make the client documents match the estimate)

#### M4 · Job lifecycle · Marking a part-paid job Lost drops the money from the record. — **Fixed 2026-09-29**

With $2,000 of a $4,575 deposit received, Mark Lost records a plain loss and clears Won. The $2,000 appears nowhere, Win/Loss included.

**Where:** `openCloseoutModal`, `confirmMarkLost` test `depositReceived`, which needs the full 50%.

**Fix:** P10 (Lifecycle and payment loose ends)

#### M5 · Job lifecycle · An Estate Settlement on a probate matter activates without the Letters. — **Fixed 2026-09-29**

The Letters gate and the case-number fields follow the service type, not the matter type. CLAUDE.md queued this on 2026-09-24.

**Where:** `jobActivationBlockers`; `#probate-fields` and its Edit Client twin.

**Fix:** P10 (Lifecycle and payment loose ends)

#### M6 · Payments · Recording a midpoint or final payment starts blank, under a "Record Deposit" button. — **Fixed 2026-09-29**

Only the deposit prefills. Pressing the button with the amount empty is refused inside the modal.

**Where:** `openDepositModal` / `onDepStageChange`; the button label is fixed markup.

**Fix:** P10 (Lifecycle and payment loose ends)

#### M7 · Dates · After 8pm Eastern, the hours, payment, won and signature dates default to tomorrow. — **Fixed 2026-09-29**

They use UTC. An evening hours entry lands on the next day in the log that bills the client, while the fold still says nothing was logged today.

**Where:** `new Date().toISOString()` defaults in the hours form, `openDepositModal`, the won modal and the signature recorder.

**Fix:** P10 (Lifecycle and payment loose ends)

#### M8 · Job lifecycle · The band says "Send the midpoint invoice" on day one. — **Fixed 2026-09-29**

Right after activation, the filled button bills the midpoint, while the estimate says it is due at the project midpoint.

**Where:** `jobTimelineActions` (`midpoint_invoiced`).

**Fix:** P7 (Let a finished job close with the midpoint unpaid)

#### M9 · Backend · A corrupt store blob empties that store on the next save; lock timeouts write unlocked. — **Fixed 2026-09-30** (live since Anthony redeployed `2026-09-30` the same day)

If a stored blob fails to parse, the server reads it as empty and the next save writes back only what that save carried, which is every other job's estimates, plans or logs gone. Nine save paths carry on without the lock after a 20-second timeout. Unlikely, but the damage is total.

**Where:** main-sync.gs `_readStoreBlob`, `_writeStoreBlob`, and the `waitLock` catch blocks.

**Fix:** P11 (Harden the Apps Script backend (redeploy))

#### M10 · Build Estimate · On fixed price, the Estimate Summary panel shows the hourly totals. — **Fixed 2026-09-30**

A $21,840 fixed quote shows "Total project estimate $18,200"; with bundled prep, $79,150 against the document's $82,480. Internal only.

**Where:** `calcAll` writes `s-havellin` and `s-total` before the fixed-price block.

**Fix:** P12 (Estimator fixes and pricing decisions)

#### M11 · Build Estimate · The reference bands mislead in both directions. — **Fixed 2026-09-30**

Estate Settlement reads "Above range" at 3,500 sq ft on default scores, and 9 of 24 normally-scored test houses read "Below range — review scores", which invites scoring up. The day ranges run 2 to 6 times the engine's plans, and the range grows 15–85% on homes over $5M although property value never moves the price.

**Where:** `PRICING_REF` (Estate Settlement reuses Home Cleanout's bands), `updateRefBox`.

**Fix:** P12 (Estimator fixes and pricing decisions)

#### M12 · Pricing design · The price can fall as the walkthrough gets more complete or the house gets bigger. — **Fixed 2026-09-30** (the fixed fee; the hourly quote's crew step is a question to Anthony)

Scoring the rooms the coverage badge asks for dropped one quote from $18,200 to $17,000. With automatic crew sizing, 5,750 sq ft priced below 5,500. Forcing six specialists cut 14.6%.

**Where:** Room volume is averaged unweighted in `computeEngineV3`; crew sizing in `calcAll`.

**Fix:** P12 (Estimator fixes and pricing decisions)

#### M13 · Edit Client · Some intake answers can never be corrected. — **Fixed 2026-09-30**

Years in home (it moves the price: 4 → 40 years took $17,450 to $18,200), bed and bath counts, the referral source and partner, and the Letters date have no Edit Client field.

**Where:** `showEditClient`.

**Fix:** P9 (Bring Edit Client up to intake's rules)

#### M14 · Intake · A hand-set documentation level can come back on the next intake. — **Fixed 2026-09-30**

When a gate forces Formal, the form remembers the level it overrode so it can hand it back. That memory survives the reset after Save Client, so the next client's form can come back to the previous client's level.

**Where:** `dataset.preGate` on the level select is not cleared by `resetIntakeFields`.

**Fix:** P9 (Bring Edit Client up to intake's rules)

#### M15 · Intake · Save Client can pull you back to the new client when its Drive folder lands. — **Fixed 2026-09-30**

Seconds after Save Client, the folder callback reopens that client's dashboard and makes it the current client for the Job Plan, even if you have moved on to another client.

**Where:** Four `openClientDashboard(job.id)` calls in `createDriveJobFolder`.

**Fix:** P9 (Bring Edit Client up to intake's rules)

#### M16 · Intake · Referral attribution can record a partner you didn't pick. — **Fixed 2026-09-30**

A partner chosen and then hidden (by changing the source) is still saved, and partners are identified by sheet row, so re-sorting the sheet re-points them.

**Where:** `saveIntake` referral fields; `referralIdOf`.

**Fix:** P9 (Bring Edit Client up to intake's rules)

### Low (34)

**Build Estimate** (fix: P12)

- Re-saving a reopened estimate replaces its pinned cost rates with today's Settings (margin panel only). *(fixed 2026-09-30)*
- A saved estimate reprices by about $150 when the Vendor Directory hasn't loaded. *(fixed 2026-09-30)*
- The unscored-room gate can never fire: a blank or 0 is priced as 3, and 9 or 2.5 is saved as typed. *(fixed 2026-09-30)*
- Standalone Home Prep lets you tick Fixed price, then ignores it. *(fixed 2026-09-30)*
- The two ways to discount a fixed fee disagree once a materials package is on the job (about $180). *(fixed 2026-09-30)*
- The Save button still reads "Save & Preview Client Estimate →". *(fixed 2026-09-30)*

**Client documents** (fix: P6)

- Midpoint and final swap $1 against the signed schedule in 12 of 79 scenarios. *(fixed 2026-09-29)*
- The Home Prep estimate prints no discount row, so its rows don't add up to its total. *(fixed 2026-09-29)*
- A credit final's email says "Balance due: $-2,741 … due within 7 calendar days". *(fixed 2026-09-29)*
- Premium finals: the per-person rows run $1–2 over the printed total. *(fixed 2026-09-29)*
- Both agreements print "(None — $0)" when no materials package was quoted. *(fixed 2026-09-29)*
- The invoice gate's refusal says "before the agreement can be drawn". *(fixed 2026-09-29)*

**Intake & Edit Client** (fix: P9)

- Edit Client's required asterisks aren't enforced. *(fixed 2026-09-30: both forms ask one rule; Edit Client refuses a save that would clear a required field and names older gaps after saving)*
- The example placeholders ((561) 555-0100, client@email.com) are back, set at runtime where the markup test can't see them. *(fixed 2026-09-30, and the tripwire now reads runtime placeholders)*
- The intake reset carries date minimums and the referral block to the next client. *(fixed 2026-09-30)*
- No sanity checks on square footage or room counts. *(left open by P9, 2026-09-30, and moved to P14; decided not to build: Anthony, 2026-09-30, "no sanity check is needed")*
- The client name is unescaped in two headers. *(fixed 2026-09-30)*
- A service switch wipes phone and email. *(fixed 2026-09-30: put aside and restored)*
- Home Prep's Edit Client shows the house checklist its intake skips. *(fixed 2026-09-30: both forms ask access & security and safety on prep, per Q17)*

**Job Plan & lifecycle** (fix: P10)

- Change-order notices print on the hidden Build Estimate panel, and the card reads "None issued" until a redraw (fixed in P5).
- The final invoice's View and Print are offered before activation, and Print then refuses. *(fixed 2026-09-29)*
- "Estate attorney on file" stays red on a trust administration with no attorney. *(fixed 2026-09-29)*
- A closed job's plan marks Before Day 1 as NOW. *(fixed 2026-09-29)*
- Home Prep's second payment is called the "midpoint invoice", while its estimate says it is due when the vendor schedule is booked. *(fixed 2026-09-29)*
- A won job reads "Approved — Awaiting Client" in the client list after a re-approval. *(fixed 2026-09-29)*
- `deliveredBy` and `activatedBy` record the estimate's approver, not whoever pressed the button. *(left for Anthony, 2026-09-29: which name should a handover carry — the approver, the assigned concierge, or a name asked at the press?)* *(fixed 2026-09-30, P14: Anthony's answer, the assigned concierge; the approver only when nobody is assigned)*

**Other** (fix: P14)

- The stale-backend banner doesn't list every action the app calls. *(fixed 2026-09-30 in P11: it lists every action and type the app posts, and names a deployment older than 2026-09-30 by version)*
- A feedback message can be wiped by an earlier message's 4-second timer. *(fixed 2026-09-29)*
- Filed copy links don't name their document. *(fixed 2026-09-30)*
- The Job active step shows no date. *(fixed 2026-09-30)*
- Dead code: `houseFlagSummary` and the client list's detail row. *(fixed 2026-09-29)*
- Deleting a contractor has no PIN. *(fixed 2026-09-30: the manager PIN, and a contractor named on any job is retired rather than deleted)*
- Splitting a photo repaints the whole tab: 1.4 s at 3,000 rows. *(fixed 2026-09-30: the split repaints its rows in place)*
- Agent One's 4,096-token limit is tight with thinking on.

## Fix prompts

Paste one per session, in this order. Where a prompt says "Decision to apply", it carries the recommendation; change that line first if the answer differs.

- [x] **P1** Stop estimates leaking between clients
- [x] **P2** Stamp every Job Plan edit so the other device can't undo it
- [x] **P3** Hold the cloud refresh until this device's saves land
- [x] **P4** Keep manager approvals on the job
- [x] **P5** Give change orders their buttons (needs Q14)
- [x] **P6** Make the client documents match the estimate (needs Q8, Q11)
- [x] **P7** Let a finished job close with the midpoint unpaid (needs Q1)
- [x] **P8** Measure work done against the rooms (needs Q3)
- [x] **P9** Bring Edit Client up to intake's rules (needs Q4, Q15–Q18)
- [x] **P10** Lifecycle and payment loose ends (needs Q2, Q12, Q19)
- [x] **P11** Harden the Apps Script backend (redeploy) — landed 2026-09-30; live since Anthony redeployed `2026-09-30`
- [x] **P12** Estimator fixes and pricing decisions (needs Q5–Q7, Q9, Q10, Q13, Q20) — landed 2026-09-30; Q20 and the Q14 follow-up built with P15, and the hourly half of Q5 decided as it is
- [x] **P13** Documentation pass (needs the packs above first) — landed 2026-09-30
- [x] **P14** Small backlog — landed 2026-09-30 (the intake sanity checks are decided not to build)
- [x] **P15** Anthony's answers of 2026-09-30 (Q20, the Q14 follow-up, a vendor on a Home Prep change order, four small items) — landed 2026-09-30
- [x] **P16** Anthony's answers of 2026-09-30, round 2 (no cards, the hourly deposit, a vendor by change order on bundled prep, Premium's appraiser hours, a firearm to a person through a dealer), and the known-bug list — landed 2026-09-30; its backend half is live once Anthony redeploys `2026-09-30b`
- [x] **P17** Anthony's answers of 2026-10-01, the twelve open questions (Premium is the rates only, quarter hours and cents, the Home Sale Preparation Fee, the walkaway refund, a voided deposit, handed over in person, File signed copy, change orders to Drive, the probate package, no Power of Attorney) — landed 2026-10-01; its backend half is live once Anthony redeploys `2026-10-01`
- [x] **P18** Anthony's answers of 2026-10-02 (the trust package; estimates in whole hours rounded up, logging in half hours, change orders in whole hours, the half-hour line in both agreements) — landed 2026-10-02; app-only
- [x] **P19** Anthony's calls on the estate workflow (*"i'm good with all of your calls. build it all"*, 2026-10-03): trust parity, the Certification of Trust, every co-representative and co-trustee, the Form 706 date, an original will or cash found on site, staff never buy, beneficiaries and bequests, receipts and signed papers to Drive, the Disposition Ledger signed at close, donations, proceeds statements, snapshots voided — landed 2026-10-05; its backend half is live once Anthony redeploys `2026-10-03`
- [x] **P20** Anthony's answers to Q22–Q27 (*"A, and yes to all the others"*; *"yes, cover approved estimates too"*, 2026-10-05): every co-representative signs the agreement in DocuSign beside the client, partial approvals saved and a release already gone ratified, the staff rule flagged on a living client's job, a Probate service with no court flagged and never titled Probate, the trust's date in full — landed 2026-10-05; its backend half is live once Anthony redeploys `2026-10-05`
- [x] **P21** Anthony's answers to Q28–Q32 (*"yes to all, build P21"*, 2026-10-05): the drafts kept, the opt-out stays the client's, the signature page names who signs before the work begins, the sign-by-hand email asks the co-representatives too, signers at one email address named on the send — landed 2026-10-05; app-only

### P1 · Stop estimates leaking between clients

Fixes: C1

```text
Fix a Critical leak on Build Estimate (2026-09-28 workflow audit, finding C1): a fresh estimate inherits settings from the last client's estimate.

What leaks, all reproduced in a browser through the real buttons:
- The preferred-client discount (`#e-discount`). It survives a job switch and a Save, because only `restoreEstimateToUI` ever writes it. A 10% discount rode through five new clients in a row; on a fixed-price job it cut the flat fee by $2,220 and no discount line printed.
- Move styling (`#e-move-styling`, +8 specialist hours on Home Transition).
- The private walkthrough note (`_privateWalkNote` and its textarea). One family's note ("the son contests the will") was saved on the next client's estimate and shown in its Walkthrough view.
- "Walkthrough by" (`#e-prepared-by`) when the new job names no concierge.
- If the last estimate was left unsaved (the ← Clients bar keeps the work): `collectionsData`, `vehiclesData` and the planner target `#tp-target`. Another estate's coin collection and car printed on the next client's estimate.

Where: the fresh-build branch of `applyOpenedEstimate`, `neutralizeEstimateView`, `resetEstimateExtras` and `clearEstimateTab`.

Fix: write one `resetEstimateJobState()` that resets every per-job input and store, and call it from both paths. A saved estimate must still get all of these back from `restoreEstimateToUI`. Keep `openEstimateScreen`'s resume (going back to the SAME client keeps unsaved work).

Tests: a net that walks every input `calcAll` reads, plus `collectionsData`, `vehiclesData` and `_privateWalkNote`, and fails if any survives a fresh build for a different job, so the next input added can't leak. A browser step: client A with a discount, styling, a note, a collection and a vehicle; ← Clients; client B's fresh estimate and client document carry none of them; A reopened still has all of them.

House process (CLAUDE.md): reproduce first, tests plus a revert sweep, a browser step, manual and playbook where anything user-facing changes, a CLAUDE.md entry, stamp the build, push.
```

### P2 · Stamp every Job Plan edit so the other device can't undo it

Fixes: C2

```text
Fix a Critical sync bug (2026-09-28 workflow audit, finding C2): Job Plan edits are silently undone by the other device.

These writers change the job and call only `saveJobs()`, which sets `updatedAt` only when it is missing:
- sourcing: `_srcSetVendor`, `setJobVendorQuote`, `setJobVendorStatus`, `setPrepVendor`, `setPrepVendorQuote`, `setPrepVendorStatus`, `setCollVendor`, `setCollFee`, `setLogisticsVendor`, `setLogisticsQuote`, `setLogisticsStatus`, `addLogisticsLine`, `removeLogisticsLine`
- crew: `setCrewTC`, `setCrewTC2`, `setCrewPS`, `confirmJobTeam`, `reviseJobTeam`, `lockAssignedCrew`

`saveAllJobs` posts every job, and the server's `_mergeJobRecord` (apps-script/main-sync.gs) keeps the incoming copy when `incT >= curT`. So a second device holding the morning's copy wins the tie the moment it saves anything: a confirmed $23,400 painter disappears, a confirmed team resets, and `getVendorActuals` then bills the prep fee on the estimate figure and drops logistics actuals ($850 → $0) from the final invoice.

Fix (app only, no redeploy): stamp the job in every one of these writers (`job.updatedAt = Date.now()`, or `_jobTouch` where a key applies), then `saveJobs(); syncJobToSheets(job);`, the house pairing. Then find every other function that writes into a job and calls `saveJobs()` without stamping (vendor ratings, review ask, house flags, anything else) and fix those too.

Tests: drive each real writer, then the real `_mergeJobRecord` from main-sync.gs in a vm against a stale copy with the old timestamp; the edit must survive. Add a net that fails on any function that writes `job.` fields and calls `saveJobs()` without stamping.

Not in this change: a per-key merge for these maps so two people editing different lines both keep their edits. That needs a backend redeploy and is fix pack P11.

House process (CLAUDE.md): reproduce first, tests plus a revert sweep, a browser step, a CLAUDE.md entry, stamp the build, push.
```

### P3 · Hold the cloud refresh until this device's saves land

Fixes: H4

```text
Fix a High sync race (2026-09-28 workflow audit, finding H4): `refreshJobsFromCloud` replaces the whole `jobs` list with the sheet's copy even while this device's own saves are still queued.

Callers: `refreshEstimateFromCloud` (through `loadJobIntoEstimate`), the client-estimate load, `approvalWatchTick` (every 12 s while an estimate is submitted), `editEstimateForJob`, and `jobsWatchTick` (every 15 s while any job is pending).

Measured with realistic Apps Script latency (writes 4 s, reads 0.8 s):
- Save Client, then press Build estimate straight away: the new client vanishes from this device (the jobs list and the local cache both go to 0). Score rooms and press Save: "Job not found", and the walkthrough is lost. The sheet has the job; this device doesn't until a reload.
- Edit Client 3,000 → 5,200 sq ft, then Build estimate: the estimate is priced on 3,000 sq ft ($8,650) and the local job reverts to 3,000 while the sheet holds 5,200.

Fix: the rule `refreshPlanAndLogFromCloud` already follows. Stand down when `_syncWritesOutstanding()` is true, checked before the request and again when the response lands (a write can be queued in between), and let the caller carry on with local data. Keep `_applyDroppedJobs` working. Consider merging by `updatedAt` instead of replacing, so a newer local record is never overwritten.

Tests: a slow stubbed backend driving the real `saveIntake` then `refreshJobsFromCloud`; the new job must survive, and with nothing queued the refresh must still take the sheet's copy. A browser step: create a client, press Build estimate at once, score rooms, and Save succeeds.

House process (CLAUDE.md): reproduce first, tests plus a revert sweep, a browser step, a CLAUDE.md entry, stamp the build, push.
```

### P4 · Keep manager approvals on the job

Fixes: H1, M1

```text
Fix two manager approvals that live in page-wide variables instead of on the job (2026-09-28 workflow audit, findings H1 and M1).

1. The final-invoice PIN (High). `invApproved`, `invApprovedBy` and `invApprovedAt` are page globals. `checkInvPin` sets them; `DOC_ACTIONS.invoice.blocker` (the ± tolerance gate) and the "Approved for Release" band in `invoiceHtml` read them. Only the retired Invoices tab (`loadInvoice`, `setInvStage`) ever cleared them; `dashApproveInvoice` doesn't. Repro: jobs A and B both 30% over estimate; A's final is refused; enter the PIN for B from the dashboard; A's final now prints. B also stays approved after more hours are logged, and a reload forgets the approval.
   Fix: record `{by, at, amtDue}` on `job.docState['invoice:final']` through the `docState` accessor, so it stamps and merges per key. The gate passes only when a record exists and its `amtDue` equals the current `invoiceHtml(job, 'final').amtDue`. The band prints from that record. Delete the three globals.

2. The agreement's "Approved for Sending" band (Medium). `agreementHtml` and `probateAgreementHtml` print "Approved by X on Y" from the page globals `agrApproved`, `agrApprovedBy` and `agrApprovedAt`, which describe whichever job `ensureAgreementApproved` touched last. Repro: A approved by Anthony on Sep 1, then B approved by Ashley today; A's agreement HTML, the one converted for DocuSign, says Ashley, today.
   Fix: read `job.agrApproved`, `job.agrApprovedBy` and `job.agrApprovedAt`. The band is hidden only under `@media print`; add `.approved-stamp{display:none}` to the `pdfCss` of every client document kind so it can never reach a client PDF.

Tests: two-job driven cases for both; a net that no client-document builder reads a page-level approval variable.

House process (CLAUDE.md): reproduce first, tests plus a revert sweep, a browser step, a CLAUDE.md entry, stamp the build, push.
```

### P5 · Give change orders their buttons

Fixes: H2 · Needs: Q14

```text
Fix a High dead end (2026-09-28 workflow audit, finding H2): a change order can be created but never accepted or printed.

`openCOAcceptModal` and `printChangeOrder` are called only inside `renderJobs`' `detailHtml`, which is built and never added to the page ("Detail expand suppressed"). The dashboard's Change Orders card shows "Awaiting acceptance" with no buttons. So the client never gets a document to sign, accepted hours never lengthen the plan or clear the overrun flags, a fixed-price change is never billed on the final, and a vendors-only Home Prep job can never open its hours log. Browser steps 23–25 pass only because they call both functions through `page.evaluate`.

Fix:
- On each row of the dashboard's Change Orders card, add PDF, and Get acceptance while the change order is unaccepted.
- After Create and after Accept, print the notice on `#dash-fb` (today it goes to `#e-fb` on the hidden Build Estimate panel) and call `_dashRedraw(jobId)`; the card reads "None issued" until something redraws. Reword the create notice, which tells you to open the Client Dashboard you are already on.
- Delete the dead change-order block in `detailHtml`, and consider the whole unused detail row (`houseFlagSummary` has no other reader).
- Change browser steps 23–25 to press the real buttons instead of calling the functions.

Decision to apply (edit before pasting if yours differs), Q14: an hourly change order's hours carry the job's rush premium and discount like every other hour, and a fixed-price change order is priced at the plain hourly rates. Say so in one line on the printed change order. (Open follow-up, check the audit file's Q14: since rush now applies on fixed price too, a fixed-price RUSH job's change-order price may carry the 20% as well; my call is yes.)

Tests: a driven dashboard render with one pending and one accepted change order, asserting both controls and their onclicks.

House process (CLAUDE.md): reproduce first, tests plus a revert sweep, a browser step, manual and playbook updates (§9 and Step 10d describe acceptance), a CLAUDE.md entry, stamp the build, push.
```

### P6 · Make the client documents match the estimate

Fixes: H6, M2, M3, document lows · Needs: Q8, Q11

```text
Fix the places where client documents say something the estimate doesn't price (2026-09-28 workflow audit, findings H6, M2, M3 and the document lows).

1. Rush wording (High). `clientEstimateHtml` and `invoiceHtml` describe the 20% premium as "A second Transition Concierge and an expanded specialist crew working in parallel to compress the project calendar". Rush is a flat premium and adds no one, and the estimate is Exhibit A of the signed agreement. Describe it as priority scheduling, and mention added crew only when the estimate really has two concierges or more specialists than recommended.
2. The final's "Original Estimate (basis for advance payments)" row in `invoiceHtml` prints the estimate plus accepted change-order hours: a $10,962 job with a +10/+10 change order shows $13,462 above a $5,481 deposit and a $2,741 midpoint. Print `est.havellinTotal` there and list accepted change orders on their own line.
3. The discount pop-up (`applyDiscountRevision`) turns a blank or 0 into 1% (`Math.max(1, …)`), so a discount can't be removed and its "between 1 and 30" message (the cap is 15) can never show. Treat 0 as removing the discount. It also leaves `job.agrApproved` set, so `ensureAgreementApproved` never re-files the signing packet and Drive keeps the old Exhibit A price; revoke the agreement approval the way `revokeEstimateApproval` does. Check whether Offer discount is still reachable after the packet has been sent; if it is, withdraw it then, since a later price change is a change order.
4. Low:
   - Midpoint and final swap $1 against the signed schedule in 12 of 79 scenarios; make `invoiceHtml` bill `paymentSplit`'s running targets.
   - The Home Prep estimate (`buildPrepEstimateBody`) prints no discount row, so its rows don't add up to its total.
   - A credit final's email reads "Balance due: $-2,741 … due within 7 calendar days" (`buildInvoiceEmailText`, `buildInvoiceEmailHtml`); word a credit as a credit.
   - Premium finals: the per-person rows add up to $1–2 more than the total when two people share a role; put the rounding remainder on one row.
   - Both agreements print "(None — $0)" when no materials package was quoted (`materialsBasisNote`).
   - The invoice gate's refusal says "…before the agreement can be drawn"; it means the invoice.

Decisions to apply (edit before pasting if yours differ): Q8 name the 20% rush premium and the preferred-client discount in both agreements' fee clauses, one sentence each; Q11 let the agreement be viewed, not printed or sent, before the client is marked Won.

Tests: extend the reconciliation matrix so every client document's rows add up to its own printed totals, and no document says "second Transition Concierge" unless the estimate has two.

House process (CLAUDE.md): reproduce first, tests plus a revert sweep, a browser step, manual §7/§8/§12 and the playbook where wording changed, a CLAUDE.md entry, stamp the build, push. Agreement wording is drafted, not reviewed: add anything new to COUNSEL_REVIEW_BUNDLE.md.
```

### P7 · Let a finished job close with the midpoint unpaid

Fixes: H3, M8 · Needs: Q1

```text
Fix a High dead end on the job timeline (2026-09-28 workflow audit, findings H3 and M8): a finished job can't be closed, or sent its final invoice, until a midpoint payment is recorded.

The band lights the earliest unfinished step (`jobTimelineNext`). "Close job" is offered only while `work_complete` is live (`jobTimelineActions`), and that row comes after `midpoint_invoiced` and `midpoint_received`; the final invoice comes after it. The client list's Status button (`cycleStatus`) is overwritten on the next line of `renderJobs`, so there is no other close control. With the midpoint invoice sent and unpaid, the band reads "Collect the midpoint payment" and nothing can close the job; the only way out is to record money that hasn't arrived. Also, on activation day the band's filled button is "Send midpoint invoice", while the estimate says the midpoint is due at the project midpoint.

Decision to apply (edit before pasting if yours differs), Q1: Close is allowed any time after activation, and the final can go out with the midpoint still unpaid (the final already reconciles against payments received). The midpoint invoice is a secondary button, "due around <halfway date>", until the calendar halfway or half the work is done.

Fix: offer Close job as a secondary from `job_active` onward (`jobCloseBlockers` still enforces the vendor ratings). Let `final_invoiced` light once the job is closed, whatever the midpoint rows say, and keep the midpoint rows open until paid. Apply the midpoint timing above. Remove the dead `cycleStatus` line, or wire a real Re-open and document it.

Tests: drive the real rail for a job with every room cleared and the midpoint unpaid: Close is reachable, and after closing, the final invoice is the band's primary. On activation day, Send midpoint invoice is not the filled button.

House process (CLAUDE.md): reproduce first, tests plus a revert sweep, a browser step, manual §9a and playbook Steps 10–13 plus the symptom table, a CLAUDE.md entry, stamp the build, push.
```

### P8 · Measure work done against the rooms

Fixes: H5 · Needs: Q3

```text
Fix a High false alarm (2026-09-28 workflow audit, finding H5): "work done" on the schedule strip and the Job Plan header can't reach 100% on a real estimate, so jobs on schedule read as behind.

`jobProgress` sums each room's `tcH` and `psH` but divides by `est.totTC + est.totPS`. A room's `tcH` holds only the concierge's hands-on share; off-site coordination and move-day hours belong to no room. On real 22-room estimates with every room Cleared: Home Editing 61%, Home Transition 42%, Home Cleanout 74%, Estate Settlement 73%, Probate 72%, Contested Probate 67%. A 4-day cleanout with every room cleared on day 3 reads "74% … 1 working day past the planned end. Re-plan with the client, or raise a change order."

Decision to apply (edit before pasting if yours differs), Q3: work done measures room work only; logged hours already track the rest.

Fix: divide by the rooms' own totals (Σ `tcH` + `psH` over the rooms in scope), and leave hours logged against the authorised total as it is. Check that `computeProjection` and the pace verdict use the same basis.

Tests: build the estimate with the real `calcAll`, not seeded rooms that happen to sum to the totals (that is why the 2026-09-13 tests passed), and assert 100% with every room cleared on all six labour services.

House process (CLAUDE.md): reproduce first, tests plus a revert sweep, a browser step, manual §9a-i, a CLAUDE.md entry, stamp the build, push.
```

### P9 · Bring Edit Client up to intake's rules

Fixes: H7, H8, H9, M13–M16, intake lows · Needs: Q4, Q15–Q18

**Landed 2026-09-30.** H7, H8, H9, M13–M16, Q4 and Q15–Q18 applied, and six of the seven intake lows; the seventh (square footage and room-count sanity checks) needs limits from Anthony and moves to P14. Two additions the prompt did not name: intake's walkthrough date and site-visit asterisks came off (the save never required them, and the dashboard asks for the walkthrough later), and Edit Client refuses only a save that would clear a required field, naming older gaps after the save, so a legacy client stays correctable. See `BUILD_HISTORY.md`.

```text
Bring Edit Client up to Client Intake's rules (2026-09-28 workflow audit, findings H7, H8, H9, M13–M16 and the intake lows).

Decisions to apply (edit before pasting if yours differ): Q4 switching between a living and an estate service is blocked in Edit Client with "Create a new client for this", the same rule Build Estimate follows; Q15 the referral source and partner can be corrected here; Q16 warn, never block, when a new client matches an existing street address; Q17 Home Prep intake asks the access and safety rows (vendors go through the house) but not the must-find question; Q18 when a start date moves past the closing date, keep both and flag it.

1. High: saving Edit Client erases what it can't display. The concierge list is hard-coded to Anthony Graziano, Ashley Jerome and Anthony Graziano Jr (a specialist), and the representative-role list lacks Administrator ad litem, Curator and Guardian ad litem, which intake offers. `sel()` selects only an exact match and `saveClientEdit` writes both back unconditionally, so any save erases a directory concierge (the job's contact then falls back to Anthony) or an ad litem role. Build the concierge list from `getAllActiveTC()` plus the job's current value, share one role catalogue with intake, and never write back a field the form couldn't show.
2. High: service switches. With Q4 applied, block cross-family switches. Also stop asking for the client's phone and email on an estate job (they are the deceased's), and make `esignSigner` prefer the representative on decedent jobs, so a signature request can never go out under the deceased's name.
3. High: `dateChainGuard` silently clears the hard target when the start moves past it, and the start when it falls before the walkthrough; only the weekend case says anything. Keep the dates and flag the conflict; the schedule's fit check already turns red when the plan misses the closing date.
4. Medium: add Edit Client fields for what only intake can set today: years in home (it moves the price; 4 → 40 years took $17,450 to $18,200), bed and bath counts (the coverage badge reads them), referral source and partner, and the Letters date.
5. Medium: `dataset.preGate` survives `resetIntakeFields`, so a hand-set documentation level can come back on the next intake; clear it. The Drive-folder callback reopens the new client's dashboard when the folder lands; redraw only if that client is still on screen. Don't save a referral partner whose picker is hidden, and identify partners by uid rather than sheet row (`referralIdOf`).
6. Low: Edit Client's asterisks aren't enforced. The example placeholders are back at runtime ("(561) 555-0100" and "client@email.com" set in `toggleIntakeFields`, "(561) 000-0000" in `tel()`), where the markup tripwire can't see them; extend that test to runtime placeholders. The intake reset carries date minimums and the referral block to the next client. The client name is unescaped in two headers. A service switch wipes phone and email. Home Prep's Edit Client shows the house checklist its intake skips.

Tests: for a job with each role and a directory concierge, open Edit Client and save untouched: nothing changes. A date conflict flags instead of clearing.

House process (CLAUDE.md): reproduce first, tests plus a revert sweep, a browser step, manual §4 and playbook Step 1, a CLAUDE.md entry, stamp the build, push.
```

### P10 · Lifecycle and payment loose ends

Fixes: M4–M7, lifecycle lows · Needs: Q2, Q12, Q19

**Landed 2026-09-29.** M4–M7, Q12, Q19 and four of the five lows; the fifth (`deliveredBy` / `activatedBy`) is a decision for Anthony, flagged below. One addition the prompt did not name: the ACH link now stays beside *Record payment* until the deposit is in, because the Q12 balance path was unreachable once the deposit invoice had gone out. See the CLAUDE.md entry.

```text
Fix the lifecycle and payment loose ends (2026-09-28 workflow audit, findings M4–M7 and the job-plan lows).

Decisions to apply (edit before pasting if yours differ): Q2 a client who paid part of the deposit and walks away is Closed — Deposit Retained, with the amount named; Q12 after a partial deposit the ACH link asks only for the balance; Q19 a two-concierge estimate needs a name or Contractor TBD in the second concierge slot before the team can be confirmed.

1. Marking a part-paid job Lost drops the money. `openCloseoutModal` and `confirmMarkLost` test `depositReceived`, which is true only once the full 50% is in. With $2,000 of $4,575 received, the job becomes `lost`, `won` is cleared and the $2,000 appears nowhere, Win/Loss included. Decide on any recorded payment (`jobPaidTotal`).
2. An Estate Settlement on a probate matter activates with no Letters. `jobActivationBlockers` checks executor authorization only on the probate and contested services, and the Letters and case fields render only there. Key both on the matter type, the way `planTaskCtx`'s `probateTrack` does (matter type first, service as the fallback). CLAUDE.md queued this on 2026-09-24.
3. The payment recorder opens blank for the midpoint and final, and its button reads "Record Deposit →" on every stage. Prefill the outstanding amount from `invoiceHtml(job, stage).amtDue` less `stagePaidTotal(job, stage)`, and label the button per stage.
4. After 8pm Eastern, `new Date().toISOString()` defaults the hours form, the payment date, the won date and the signature date to tomorrow, so an evening hours entry lands on the wrong day in the log that bills the client. Use `_todayStr()`, and format ISO send stamps in local time in `_jtAtFmt`. Add a net that forbids a UTC date slice on a new Date.
5. Low: Home Prep's second payment is called the "midpoint invoice" in the band, while its estimate and agreement say it is due once the vendor schedule is booked. The final invoice's View and Print are offered before activation, and Print then refuses. "Estate attorney on file" stays red on a trust administration with no attorney; scope it to probate matters. A closed job's plan marks Before Day 1 as NOW. A won job reads "Approved — Awaiting Client" in the client list after a re-approval, because `checkPin` preserves active and closed but not won.

Tests: driven cases for each, and a browser step recording a midpoint payment through the real modal without typing the amount.

House process (CLAUDE.md): reproduce first, tests plus a revert sweep, a browser step, manual §8/§9 and the playbook, a CLAUDE.md entry, stamp the build, push.
```

### P11 · Harden the Apps Script backend (redeploy)

Fixes: M9, C2 follow-up

**Landed 2026-09-30** (`BACKEND_VERSION 2026-09-30`; nothing server-side is live until the redeploy). All four steps, plus two app-only fixes the 2026-09-30 re-check found still open: the DocuSign and Stripe arrival checks no longer claim the job when they learn nothing new, and the Job Plan refresh refuses an answer that raced a new write. Agent One's token limit (a P14 line) rode this redeploy. See `BUILD_HISTORY.md`.

```text
Harden apps-script/main-sync.gs (2026-09-28 workflow audit, finding M9 plus the per-key follow-up from P2). This needs a redeploy: bump `BACKEND_VERSION`, and the app's `BACKEND_NEEDS`.

1. `_readStoreBlob` returns the empty store when JSON.parse fails, and the next save's merge then writes back only what that save carried, wiping every other job's records in that store. On a parse failure, refuse the write with a clear error and leave the sheet untouched.
2. Nine save paths do `try { lock.waitLock(20000); } catch (e) {}` and write without the lock after a timeout. Return `{ok:false, error:'busy'}` instead, so the app's outbox retries.
3. Per-key merge for the job maps two people edit at once: add `vendorSourcing`, `prepSourcing`, `logisticsSourcing`, `collSourcing`, `crew`, `vendorRatings`, `reviewAsk` and `houseFlags` to `JOB_KEYED_MAPS`, with the app stamping `job.at[kind + ':' + key]` in each writer (build on the stamping from P2).
4. The app's stale-backend banner (`BACKEND_NEEDS`) doesn't list every action the app calls. Add a test that every `action` and `type` the app posts is on the list.

Tests: drive the real .gs functions in a vm with a corrupted blob, a lock that times out, and two devices editing different vendor lines on one job.

House process (CLAUDE.md): tests plus a revert sweep, a CLAUDE.md entry with the redeploy warning, push. After it merges, redeploy the Apps Script and confirm the version banner clears.
```

### P12 · Estimator fixes and pricing decisions

Fixes: M10–M12, estimator lows · Needs: Q5–Q7, Q9, Q10, Q13, Q20

**Landed 2026-09-30** (Anthony: *"For all the rest, go for it."* Q5–Q7 answered the same day). All nine items fixed: Q6 scores each room against its own default; the fixed fee is priced on the two-specialist plan (Q5); the band is the engine's, at Normal and Full (Q7); the premium never touches the prep fee and is a line on a fixed fee (Q9); estates open on fixed price (Q10); a fixed-price discount is a line, one rule for Build Estimate and Offer discount (Q13); the Estimate Summary shows the final figures (M10); and the six lows. **Not built:** Q20 (waits on Anthony's OK on the reading), and the hourly half of Q5 — an hourly quote still dips at each automatic crew step, because a bigger crew bills fewer concierge hours, and flooring it would bill hours nobody worked; put back to Anthony. Details in `BUILD_HISTORY.md`.

**Completed 2026-09-30 (P15).** Anthony OK'd the Q20 reading and it is built; the hourly half of Q5 stays as it is (*"we don't want jobs stretching over weeks, so we bump up crew size to keep work days down"*).

**Re-checked 2026-09-30:** all nine P12 items (six lows, M10, M11, M12) still reproduce. Only M11 waits on an open question (Q7). **M12 needs Q6 put back to Anthony:** `computeEngineV3` already weights volume by room size (`engineRoomWeight`), so "weight by room size" is the current code; the drop comes from light rooms' low default scores pulling a factor applied to the whole square footage, and crew sizing (5,500 → 5,750 sq ft prices $28,400 → $27,450 as the crew goes 2 → 3).

```text
Estimator fixes and pricing decisions (2026-09-28 workflow audit, findings M10–M12 and the Build Estimate lows).

Decisions to apply (edit before pasting if yours differ): Q5 extra crew never lowers the fee below the two-specialist plan (speed is what rush is for); Q6 weight the whole-house fullness average by room size, so a light half bath doesn't dilute a packed garage; Q7 (OPEN when this was written — check the audit file's Q7; my call is to replace the hand-typed table with a range the engine computes live for this house at Normal and at Full scoring, worded neutrally, and to drop the property-value multiplier from it); Q9 rush does not apply to the 30% prep fee on either basis, and a rush job carries the 20% on the services on BOTH bases — on fixed price it is already inside the suggested fee, so make it visible and binding: the fee is the fee for the scope and the premium prints as its own line under it (as the discount will, Q13), so ticking rush always raises the price, even over a fee typed by hand; Q10 Estate Settlement, Probate and Contested Probate estimates open on fixed price; Q13 a fixed-price discount prints as its own line; Q20 (Anthony: "If we need an appraiser, don't we just add one? It's not mandatory and shouldn't be blocked either.") price appraisers only when one is added to the estimate — each appraiser vendor line already books 4 touches (2 concierge hours) — so the `document` step's coordination keeps inventory scheduling and drops the built-in appraiser scheduling on both top tiers (a tunable share, like `DOC_CAPTURE_POOL_SHARE`), which also ends the double charge on a job that has an appraiser line; no tier requires or refuses an appraiser; and when the priced estimate carries an appraiser line, `weArrangeAppraisals` answers yes, so the values-tier agreement's bold carve-out, the estimate's close-out and the playbook's "do not offer to" stop contradicting Exhibit A. Confirm the Q20 reading in the audit file before building it.

1. On fixed price, the Estimate Summary panel shows the hourly totals (`calcAll` writes `s-havellin` and `s-total` before the fixed-price block): a $21,840 quote shows "Total project estimate $18,200", and with bundled prep $79,150 against the document's $82,480. Fill it from the final figures, rename the first row "Services subtotal", and list rush above the discount as the documents do.
2. Reference bands (`PRICING_REF`, `updateRefBox`): Estate Settlement reuses Home Cleanout's bands and reads "Above range" at 3,500 sq ft on default scores ($18,300 against a $16,000 ceiling); 9 of 24 normally-scored test houses (six services at 2,000 / 3,500 / 6,000 / 10,000 sq ft) read "Below range — review scores"; the first band says 2,000–3,000 sq ft but covers everything under 2,000; the day ranges run 2 to 6 times the engine's plans (a 10,000 sq ft Home Cleanout plans 9 days against "20–45 days"); and `propValMultiplier` grows the range 15–85% on homes over $5M although property value never moves the price, so the more valuable the house the likelier a normal quote reads "review scores". Apply Q7.
3. The price falls as the walkthrough gets more complete: scoring the rooms the coverage badge asks for dropped $18,200 to $17,000; with automatic crew sizing, 5,750 sq ft prices below 5,500 ($27,600 against $28,300); forcing 2 → 6 specialists cuts 14.6%. Apply Q5 and Q6.
4. Apply Q9, Q10, Q13 and Q20.
5. Low: re-saving a reopened estimate stamps the live `COST_RATES` instead of `activeCostRates()`. A saved estimate reprices when the Vendor Directory hasn't loaded (`vendorGroupOfLine` falls back to the first card); store each vendor line's coordination hours on the line. The unscored-room gate can't fire (`parseFloat(…) || 3` prices a blank or 0 as 3 and saves 9 or 2.5 as typed); clamp to 1–5 and validate. Standalone Home Prep lets you tick Fixed price and then ignores it; hide it. The two ways to discount a fixed fee disagree once a materials package is on the job. The Save button still reads "Save & Preview Client Estimate →".

Tests: a monotonicity suite (more rooms scored at their defaults, a bigger house, a bigger crew never lower the fee), and the bands checked against the engine.

House process (CLAUDE.md): reproduce first, tests plus a revert sweep, a browser step, manual §5/§16 and playbook Step 2, a CLAUDE.md entry, stamp the build, push.
```

### P13 · Documentation pass

Fixes: docs out of date · Needs: the packs above first

**Landed 2026-09-30.** Every item below, and the full pass it asks for: nine readers each audited a region of the manual or the playbook against the code (both files of each pair, and the four spec headers), and every finding was applied or answered, with P15's changes written in. Details in `BUILD_HISTORY.md`; the app defects they found are under *Known and still open*.

```text
Documentation pass, after the fix packs above have landed (2026-09-28 workflow audit). Bring manual.html, concierge-guide.html and their .md copies in line with the app:
- Manual §8 says the agreement draft renders the moment you pick a job, and describes the retired Agreement tab and its PIN.
- Playbook Step 6 says sending the agreement opens a Gmail draft and needs "✓ I've sent it"; it goes through DocuSign with no tap.
- Manual §4 says "All fields marked * are required", that Notes shows on the client list (that detail row is dead code), and lists "Job Log" and "Estimate" subfolders.
- Manual §15's DocuSign line is stale.
- The manual (~line 1351) and the playbook (~964, ~996) say a closed job's status button reads Re-open; no such control exists. The playbook's "Final invoice paid → close the job" has the order backwards. *(Done 2026-09-29 with P7 and its follow-up: there is now a real ↺ Re-open job on the timeline, and both documents describe it and the close order.)*
- The playbook contradicts itself on changing a job's service type.
- The 2026-09-20 photo-delete and note-saving pass was never done (manual §10 ~1492, playbook ~713–717 and ~1181).
- CLAUDE.md says the engine overshoots the bands above ~3,000 sq ft; it now sits below them at 6,000+ sq ft for half the services.
- Stale headers in AGENT_ONE_SPEC.md, ESTATE_SCOPE_SPEC.md, UNEARNED_REVENUE_SPEC.md §9d and LIFECYCLE_AUDIT.md.
Also document whatever the fix packs changed. House process for docs: parity-check the .md copies claim by claim, run tests/doc-structure, render at 1440 and 390 px with no overflow, check tables under print.
```

### P14 · Small backlog

Fixes: other lows

```text
Small backlog, one commit (2026-09-28 workflow audit, "Other" lows):
- `showFB` clears its strip on an unconditional 4-second timer, so a second message inside 4 s is wiped by the first message's timer. *(already fixed 2026-09-29, found on re-check 2026-09-30)*
- The "Filed copy" links in the document strip don't name their document. *(fixed 2026-09-30)*
- The Job active step shows no date, though `activatedOn` is stamped. *(fixed 2026-09-30)*
- Intake has no sanity check on square footage or room counts (moved from P9; ask Anthony for the limits first — flag, never refuse). *(decided not to build: Anthony, 2026-09-30, "no sanity check is needed")*
- Dead code: `houseFlagSummary` and the client list's unused `detailHtml`, if P5 didn't already remove them. *(already gone, re-checked 2026-09-30)*
- Person-entered names rendered unescaped (found on re-check 2026-09-30): `saveQuickPartner`'s notice (partner), *Estimate loaded for job:* (client), the estimate-denied notice (`djob.tc`), the contractor save and refusal messages, and contractor names in the `value` and text of four dropdowns (a quote mark breaks the option). Wrap each in `esc()`. *(fixed 2026-09-30, and the Job Plan team selects' labels with them)*
- The Home Prep final heads its total "logged hours + actual fees" (client-facing wording: Anthony picks the label). An unrendered "Service Management Fee (15% — vendor coordination)" label in `invoiceHtml` would be wrong if `SMF_PCT` ever moved off 0. *(fixed 2026-09-30: Anthony's wording, "Services total (site management fee on actual vendor spend + logged concierge hours)", without the hours when none are logged; the SMF label reads `SMF_PCT`)*
- Deleting a contractor has no PIN, unlike vendors and partners. *(fixed 2026-09-30)*
- Splitting a photo (`invSplitItemClick`) repaints the whole Job Admin tab: 1.4 s at 3,000 rows. Repaint the affected rows only. *(fixed 2026-09-30)*
- Agent One's `AGENT_MAX_TOKENS` is 4,096 with adaptive thinking on, so a dense frame can fail with "cut off". Raise it to about 16,000 (backend; bundle it with P11's redeploy). *(fixed 2026-09-30 in P11)*
House process (CLAUDE.md): tests plus a revert sweep, a CLAUDE.md entry, stamp the build, push.
```

### P15 · Anthony's answers of 2026-09-30

Fixes: Q20, the Q14 follow-up, a vendor on a Home Prep change order, and the small items found in passing · Needs: the answers of 2026-09-30

**Landed 2026-09-30.** Anthony: *"1 - I think it's fine … 2. yes. 3. yes, drop build-in appraiser scheduling. 4. yes, add new also, or add TC hours for decluttering. fix the other small items."*
- **Q5, the hourly half:** kept as it is (see Q5). Recorded as decided in CLAUDE.md.
- **The Q14 follow-up:** a fixed-price rush job's change order is priced at the rate card plus the 20% premium, pinned on the change order when it is raised (`coRushPct`, `coRushPctFor`); the modal, the readout, the printed page, the standard form's fixed-fee clause and the estate form's blank change order say so. The discount still does not apply.
- **Q20:** the `document` step's coordination is inventory scheduling only, half the column at full scope (`DOC_COORD_INVENTORY_SHARE`, a starting figure); an appraiser is priced by its own line; who arranges the appraisals is one answer (`appraisalDuty`: all, the ones the estimate lists, or none), read by the agreement, the client estimate, the court and trust schedules and the Job Plan; the *Inventory + appraisals* tier flags an estimate with no appraiser on it. A 3,500 sq ft Estate Settlement moves $19,900 → $19,450.
- **A vendor on a Home Prep change order:** the modal adds a preparation vendor with its estimated cost, as well as or instead of concierge hours; once accepted it joins the job's prep lines (`jobPrepLines`): the Job Plan's sourcing list and budget, the vendors-confirmed count and the final's 30% fee.
- **The small items:** the desk's **All** filter stays chosen (applied once per client, `_invApplyWhenDefault`), and each client's desk starts clean; the vendor and partner deletes ask their history question behind the PIN too, and a partner delete waits for the client list; *Vendor Directory not loaded* asks the directory, so it shows on a labour job; browser step 17 no longer reads the clock.
- **Found by the P13 editors and fixed here, as P15's own work:** the client estimate's capture-scope sentence and §5.3's party on a *neither* matter (Q20); a Home Prep final's notes, its payment-summary line and its ±15% baseline for an added vendor.

### P16 · Anthony's answers of 2026-09-30, round 2, and the known-bug list

Fixes: the seven answers below and CLAUDE.md's *Known, not fixed* list · Needs: the answers of 2026-09-30 (round 2)

**Landed 2026-09-30.** Anthony: *"1. yes. 2. deposit paid, is lost. 3. yes. 4. drop the lines hours on premium jobs. 5. sure. 6. yes. 7. I think agent one should only look detailed inventory photos, not as-found. fix the 20 bugs also. I've done apps script and backfillIDs."* Built in four workstreams, merged and verified together.
- **1 · No cards.** The standard agreement's §3.9 names ACH through the payment link, wire or check; the payment recorder no longer offers Card, and the handler refuses one (a card record from before still reads "Card").
- **2 · The hourly deposit is earned on signature.** The standard form's hourly §12.4 and the estate form's hourly §8.1 keep the deposit, refunding only above what is owed after Havellin's uncured material breach (counsel bundle A1, B2).
- **3 · A vendor by change order on bundled prep.** A labour job whose estimate carries a costed preparation vendor may add one by change order (`coPrepVendorsOn`), through the dialog, the acceptance, the printed change order, the final's fee and the ±15% baseline; both forms' fee clauses and the estate form's §4.2 change-order form say so (counsel bundle B9).
- **4 · Premium's appraiser hours.** On a Premium Estate an appraiser line books no coordination hours (`premiumCoversLine`); a Premium Estate Settlement with an appraiser moves $27,345 → $26,975 hourly.
- **5 · A firearm to a person, through a dealer.** A Distribute firearm records its dealer route (`invSetDealerRoute`), which clears the beneficiary arm; authority and serial are still required, and an NFA item is offered none. The protocol, revised, is in the counsel bundle (C6).
- **6 · As-found shots stay non-deletable,** and **7 · Agent One stays on the item and detail shots:** recorded as decided (CLAUDE.md, AGENT_ONE_SPEC §6); nothing built.
- **The known bugs.** Payments: Mark cleared and Void as recorded acts, one `paymentCounts` predicate, a Stripe settlement matched to the transfer recorded by hand, the settled day as the cleared day. Documents: the plain-email fallback recorded, Edit estimate removing the filed link, the signer's own day and email, the decision email as a Gmail draft. Invoices: Manager approval asks the no-hours block first; the rush baseline moves by what the final bills; the crew-only warning is shown again. The estate form's §5.3 row names §5.2's party. The desk: a living client's request prints no estate caution, failed detail shots have tiles, the valuation source only where it shows, the Approval Request once, and Remove line. Apps Script `2026-09-30b`: the payment merge keeps a void or a clear, the folder sweep runs from the Run menu, and `saveInventory.gs`'s sticky list matches the app's. Screens: field mode keeps Save Estimate on the phone; typed text is shown as text wherever it lands (the dashboard's cards, the concierge on the estimate and invoices, the worksheet); an estimate no manager has approved follows the documentation tier, and an approved one says how to change it; intake's administration question carries its asterisk; the sourcing card pairs each number with whom it reaches; the Home Prep worksheet lists its vendors and declutter hours; a dozen stale labels corrected, measured where they state a figure.

### P17 · Anthony's answers of 2026-10-01

Fixes: the twelve questions CLAUDE.md held for Anthony after P16 · Needs: the answers of 2026-10-01

**Landed 2026-10-01.** Asked in order, with options and their tradeoffs. Built in three workstreams (pricing and billing; payments and lifecycle; documents and Drive), merged and verified together.
- **1 · Premium is the rates only.** Anthony: *"if we do use any of these, hours should be assume and billed for … just go off the estimate."* The flat 25 specialty hours are gone, and every vendor line books its own hours on every job (P16's appraiser exception reversed). Online Auction House 12 touches (6.0 hours: *"handling an online auction ourselves is a real time sink"*), Estate Sale Company 3 (1.5 hours: *"a call and some follow up"*). A Premium Estate Settlement with no vendors moves $26,975 → $22,071.25 (3,500 sq ft; quarter hours included).
- **2 · A voided deposit on an active job** blocks *Deposit received* in red, naming the payment, the reason and the fix; nothing rewinds, and hours stay stopped until a payment that counts restores it.
- **3 · Payments stay void-and-record-again.** Decided; nothing built.
- **4 · File signed copy.** Offered on the Agreement signed step while DocuSign's executed agreement or certificate is missing from Drive; the server files by name, so a second filing replaces the first (Apps Script `2026-10-01`).
- **5 · One name: the Home Sale Preparation Fee,** on every document and screen (counsel bundle B11).
- **6 · Quarter hours and cents.** Anthony: *"let's log hours and bill them in 15min increments. no rounding up on logging or billing."* Every hours box takes quarter hours and refuses anything else; billed hours are the hours logged; estimates round to the nearest quarter; money is carried and shown to the cent whenever there are cents. The Home Prep page that showed $6,000 + $825 above a $6,900 total now totals $6,825. Neither agreement states the increment yet (counsel bundle B12).
- **7 · The hourly walkaway refund.** Havellin keeps the deposit or the work done, whichever is more (the deposit is applied against the final invoice for the work, as both hourly clauses say), and the rest is shown as a refund due, recorded once sent. Measured: a $12,012.50 Home Cleanout that paid $9,009.38 with $3,600 of work keeps $6,006.25 and owes back $3,003.13 (counsel bundle A1, B2).
- **8 · Handed over in person,** on the *Signing packet sent* step, records the send through the send's own gate.
- **9 · Change orders to Drive** when the client accepts, with **File to Drive** if that fails.
- **10 · Volume and complexity are separate scores** (a volume of 5 no longer sets complexity 5).
- **11 · The probate package is a real send:** one Gmail draft to the estate attorney, copying the representative and agreements@, with the inventory documents attached, the appraisals and photograph folders linked, and a filed release-and-custody record; sendable at any stage with the gaps marked (counsel bundle D6).
- **12 · Power of Attorney** is off the estate roles; an older record keeps it, shown as recorded.
- **Open after P17** (CLAUDE.md, Waiting on Anthony): a probate package for a Trust or Neither matter (no Probate card today); a sentence on the quarter-hour increment in both agreements; counsel's reading of the walkaway refund outside a breach.

### P18 · Anthony's answers of 2026-10-02

Fixes: the three questions P17 left open · Needs: the answers of 2026-10-02

**Landed 2026-10-02.** Built in two workstreams (the trust package; hours), merged and verified together. App-only.
- **The trust package.** Anthony: *"1 - yes"* to sending a trust-only estate the same package. Its card is the Probate card renamed (*Trust Information*, *Trustee's Attorney*, *Trustee*), with no court record; the package carries the Trust Schedule, the tier's document and the Appraisal Worklist, and goes to the trustee's attorney, or to the trustee when no attorney's email is recorded. One answer decides where a package is offered (`estatePackageRoute`); a *Neither* matter has none. A desk document no longer prints a probate case number on a trust or *Neither* matter.
- **Hours.** Anthony: *"billing every 15mins is a lot of detail...we are not lawyers billing $1500/hr. maybe make it thirty minutes for logging hours (so a TC can bill 1hr, 1.5hrs or 2hrs)... but round estimates to full hours, and round up"*, then *"change orders whole hours."* Estimates round up to whole hours again (a Standard Estate Settlement, 3,500 sq ft, $17,775 → $18,000; a Home Cleanout $12,012.50 → $12,250); the hours log takes half hours for everyone; change orders take whole hours; a part hour typed in the declutter box is priced as the whole hour above it and flagged, so the Home Prep page reads 6 × $150 = $900.
- **The agreements.** Anthony: *"yes on agreements."* Both forms say *"Time is recorded and billed in half-hour increments, as worked."* wherever time is billed, never on a fixed fee (counsel bundle B12).
- **The counsel bundle is on hold** until Anthony says go (*"hold counsel bundle until we are done here. they may be more changes"*); B12 and D6 are updated in it.

### P19 · Anthony's calls on the estate workflow (2026-10-03)

Fixes: the estate-workflow audit's calls · Needs: Anthony's *"i'm good with all of your calls. build it all"*

**Landed 2026-10-05.** Built on a shared foundation (the job's six record lists, merged entry by entry on the server; the one signed-copy path to a *Signed Records* folder) in five workstreams (authority; estate documents; releases; site and plan; the ledger), each in its own worktree with its own tests, revert sweep and browser step, then merged, re-swept on the merged tree and verified together. Its backend half is `2026-10-03` (below, *Only Anthony can do these*).
- **Trust parity.** The estate agreement, the client estimate and the schedules follow the matter type clause by clause: the trust named as a party on a trust-only matter, the Certification of Trust in place of the Letters, the trustee's counsel in place of the estate attorney, no probate case or court where there is none; an unanswered matter keeps the probate wording byte for byte. Intake and Edit Client record the trust (name, date, the trustee's acceptance) and ask the property-sale question on a trust too; the trustee gets a desk checklist of their own (*Trust administration*); chain of custody is mandatory on a trust as on probate.
- **The Certification of Trust** gates activation on a trust-only matter (§736.1017), as the Letters do on the probate track.
- **Every co-representative and co-trustee** is recorded on the client, named on the agreement (§5.1's joinder and a co-signer block each) and on the schedules' signature lines, and **every one of them approves a release**: the approval request, the firearm gates, the worklist and the Job Plan all ask the one answer.
- **The Form 706 date** (nine months after death) is a chip on the plan and a line on the schedule strip, unless the 706 is answered *No*.
- **An original will found on site** goes to the estate attorney the same day against a signed receipt, with the ten-day §732.901 reminder; **cash found** is counted by two people, sealed in a numbered bag and handed to the fiduciary the same day against a receipt. Both on the Job Plan's *Found on site* card, red on the desk while Havellin holds either.
- **Havellin's people never buy or receive estate property:** a sale or release to anyone on the team is refused where it is written, and the agreement says so (§5.4).
- **Beneficiaries and specific bequests:** a roster and a list of designated items the inventory is checked against; a matched line proposed to go elsewhere is named on the request.
- **Receipts and signed papers:** a receipt for every item released to a person, and every signed paper (approvals, receipts, adopted schedules, the ledger, charity receipts, statements, the will and cash receipts) filed to the client's *Signed Records* folder.
- **The Disposition Ledger** is the close-out summary the client signs: its own desk card, filed to Drive as the job closes, its signed copy a derived line in place of the PR's sign-off box; the estate package attaches it.
- **Donations** are receipted line by line, with a Donation Record per charity; **proceeds statements** are recorded and reconciled against the ledger to the cent; **snapshots** are voided with a reason, never deleted, and compared by item number.
- **Neutral wording:** the ledger, the item panel and the CSV read *Net Proceeds*; the net total is headed for whoever holds the proceeds (*Net to Trust* on a trust), on the desk now and in the workbook from the `2026-10-03` deployment.
- **Questions this pack raised** are Q22 to Q27 below; the found-in-passing items are in `CLAUDE.md`, Open work.

### P20 · Anthony's answers to Q22–Q27 (2026-10-05)

Fixes: Q22–Q27 · Needs: Anthony's *"A, and yes to all the others"* and *"yes, cover approved estimates too"*

**Landed 2026-10-05.** Three workstreams (DocuSign co-signers; approvals; the service on a matter with no court), each in its own worktree with its own tests, revert sweep and browser step, then merged, re-swept on the merged tree and verified together. Its backend half is `2026-10-05` (below, *Only Anthony can do these*).
- **Q22 · Every co-representative signs the agreement.** In DocuSign, each co-executor or co-trustee signs beside the client on their own block (the same routing order; Anthony countersigns once all have), and one with no email stops the send by name before anything goes out. On the sign-by-hand route and in person, the *Agreement signed* row flags anyone not yet on record and files the page they signed (**File the page signed by …**); it never holds up activation.
- **Q24 · Partial approvals.** **Record approval** saves whoever has signed, each with their own day, says before and after the save which lines stay open and for whom, and the lines stay on the next request until everyone has signed. Every document prints each signer with their day, never a raw date.
- **Q23 · Ratification.** A line that left before every fiduciary approved it is listed apart on the next request, *Already released: for ratification*, for the missing signature; the desk row reads *ratification owed*; nothing is undone.
- **Q25 · The staff rule on a living client's job.** A sale or gift to someone who works with Havellin is saved and flagged (the row, the line's record, the bulk bar, the request the client initials, the Contents Record and the ledger), never refused; an estate still refuses it.
- **Q26 · A Probate service with no court.** On a trust or *Neither* matter, intake, Edit Client and Build Estimate flag a Probate service while the estimate is unapproved and suggest Estate Settlement, which reprices it; nothing switches by itself, and Contested Probate is never flagged. No client document names a probate there, for either service, an approved estimate included (*Estate Settlement*, *Contested Estate Settlement*); the price stays the service's own.
- **Q27** The trust's date reads *March 3, 2015* in the agreement, Exhibit A and the Trust Schedule.
- **Questions this pack raised** are Q28 to Q32 below; the found-in-passing items are in `CLAUDE.md`, Open work.

### P21 · Anthony's answers to Q28–Q32 (2026-10-05)

Fixes: Q28–Q32 · Needs: Anthony's *"yes to all, build P21"*

**Landed 2026-10-05.** One small pack, built and verified in the lead's own tree (no backend change, no redeploy).
- **Q28** *Contested Estate Settlement* and the off-track Probate narrative are kept as P20 drafted them (counsel to confirm, A15).
- **Q29** The marketing opt-out stays the client's box; a co-representative opts out in writing (§7.2). The manual and the playbook say so.
- **Q30** The estate signature page reads *"No work will begin until the Client and Havellin have signed and the deposit has been received."* (it said *"until both signatures are obtained"*), which is what the app waits for.
- **Q31** On the sign-by-hand route the agreement email adds *"Each co-representative named on the signature page signs it too."* where one is recorded: the formatted email, its plain text and the plain-email fallback.
- **Q32** Signers the DocuSign envelope carries at one email address go out, and the send's notice turns amber and names who shares which address. Anthony's sandbox test (below) decides whether it stays allowed or becomes a refusal.
- The found-in-passing item (a representative recorded as their own co-representative) is in `CLAUDE.md`, Open work.

### P22 · The known-bug list and Anthony's answers of 2026-10-06
Every defect under CLAUDE.md's *Known, not fixed* (46 bullets) fixed, in five groups, plus Anthony's calls: an over-refunded walkaway reads *Closed — Refunded* and counts as lost; the walkaway counts only what was delivered; the suggested fixed fee rounds up to the next $100; a lost as-found shot can be marked lost; the client estimate's will sentence follows the procedure (counsel A17); §5.1 names the trust and the trustee's acceptance date where recorded (counsel A16); a vendor's pickup sheet files as a signed paper; DocuSign refuses counsel as the client signer. Redeploy `2026-10-06`.

### P23 · Agent Two, valuation (2026-10-06)

Fixes: the spec's build (`AGENT_TWO_SPEC.md`) · Needs: Anthony's decisions of 2026-10-05 and his answers to the spec's §12 (2026-10-06), and *"Agent Two first"* on the road to launch

**Landed 2026-10-06.** Built in the lead's own tree. Its backend half is `2026-10-06b` (below, *Only Anthony can do these*).
- **Value N lines** on the desk's work bar puts a value on every named line nobody has valued: sold comparables (one line to a request, with its photograph and close-ups) for art, antiques, jewelry, silver, collectibles, firearms, wine, instruments, a line ticked for appraisal or one named off a maker's mark; the going resale rate for everyday lots (eight to a request; one that comes back above $250 is researched instead, in the same run). A comparable is kept only if a tool returned its link; research with no sold comparable is low confidence.
- **Every figure comes back unreviewed:** *agent value* on the row, *Accept value* under the figure, an *Unreviewed values* chip, *Accept values* on the bulk bar; the line's record carries the comparables, the WorthPoint search and *Use a WorthPoint sale*; *Re-value* researches one line again. A figure a person or an appraiser recorded is never overwritten; a name changed after valuing reads *value made for an earlier name*.
- **Where counsel values** (*Contents list*, *None*) the figure stays on the desk: a range for routing the sale and recommending appraisals, never a value a document could print.
- **The appraisal rule** reads the top of an agent's range on an estate; a living client's range past the threshold reads *worth a specialist*. An appraisal takes the line from the agent outright.
- **The schedules:** an unreviewed agent figure counts as valued; the Court Inventory, the Trust Schedule and the Estate Inventory PDF count *N values not yet reviewed* beside their status; the Court Inventory and the Trust Schedule name each line's basis. Counsel bundle D13.
- **Found in passing:** in `CLAUDE.md`, Open work.

### P24 · The room check, and walkthrough collections on the inventory (2026-10-06)

Fixes: two of the four gaps found writing *Photographing a House* (a doubled walkthrough collection; *Possible duplicates* comparing names only) · Needs: Anthony's two calls of 2026-10-06 (Road to launch, item 7), before the first mock job with a full inventory

**Landed 2026-10-06.** Built in the lead's own tree. Its backend half is `2026-10-06c` (below, *Only Anthony can do these*).
- **The room check** reads each room's photographs together, each with the lines Agent One named off it, and flags lines that look like one thing photographed twice under *Possible duplicates*, with both pictures side by side, what it saw and how sure it is. It never removes a line: a person removes the extra one or presses *Not duplicates*. It runs by itself after **Name N shots** and from **Check N rooms** on the work bar. A large room is read in runs of 24 photographs overlapping by 8.
- **Walkthrough collections are on the inventory by themselves** once the job is won, one line each, and each is owed a photograph: the Job Plan's banner, the room's brief and the Collection Partners card say so. In the house, tap the collection on the room's brief and shoot it: the photograph goes on the collection's own line, which keeps its number, and Agent One names it. A collection already shot as an ordinary line is joined on the desk with **Use that line**. *Bring them in* is gone; vehicles are still brought in by hand.
- **The guide** says both, and its field card's sixth and tenth lines changed.
- **After the first live run (2026-10-06, `2026-10-06d`):** `testAgentRoomCheck()` read eight photographs of a living room in 32 seconds and found three things photographed more than once, all correctly. Apps Script cuts any one request off at about 60 seconds, so at that pace a run of 24 would fail a big room as *took too long*: a room is now read in runs of 12 sharing 6 (two shots within six of each other always meet). The model's sentence ran to 300 characters naming its own photograph labels (*P8 shows it all*), which the desk never sees: it is now asked for under 25 plain words and cut at a word. The test now times one full run of the room with the most Items photographs.
- **Found in passing:** in `CLAUDE.md`, Open work.

## Questions for Anthony

**Answered 2026-09-29, the last three on 2026-09-30, and Q22 to Q32 on 2026-10-05.** The recommendations stand except Q9 and Q20, which Anthony changed. Each answer is under its question.

### Answer these first

- **Q1** Should a job be closeable, and its final invoice sendable, while the midpoint payment is still outstanding? And should the midpoint invoice wait for the job's halfway date?  
  *Recommendation:* Yes to both. A late midpoint cheque should never block the close; the final already nets out what has been paid. *(used by P7)*  
  *Answer (2026-09-29):* Agreed.
- **Q2** A client pays part of the deposit, then walks away. Keep the money (Closed, deposit retained) or refund it?  
  *Recommendation:* Keep it and name the amount. Your agreements say the deposit is earned on signature. *(used by P10)*  
  *Answer (2026-09-29):* Agreed.
- **Q3** Should "work done" measure room work only, or count coordination time too?  
  *Recommendation:* Room work only. Logged hours already show the rest. *(used by P8)*  
  *Answer (2026-09-29):* Agreed.
- **Q4** Should Edit Client let you switch a job between a living service and an estate service?  
  *Recommendation:* No. Make it a new client, the rule Build Estimate already follows. *(used by P9)*  
  *Answer (2026-09-29):* Agreed.
- **Q5** Should adding crew ever lower the price? Today a 5,750 sq ft house can price below a 5,500 sq ft one.  
  *Recommendation:* No. Floor the fee at the two-specialist plan; rush is how a client pays for speed. *(used by P12)*  
  *Answer (2026-09-29):* Agreed.  
  *Built (2026-09-30, P12):* the fixed fee suggestion is floored at the two-specialist plan. The hourly quote still follows the crew (a bigger crew bills fewer concierge hours), because a floor there would bill hours nobody works; put back to Anthony as a follow-up.  
  *Answer (2026-09-30), the hourly half:* "I think it's fine. We don't want jobs stretching over weeks, so we bump up crew size to keep work days down." Kept as it is: an hourly quote bills the hours worked.
- **Q6** Should a room scored at its normal default pull the whole-house fullness down? Finishing the walkthrough cut one quote from $18,200 to $17,000.  
  *Recommendation:* No. Weight the average by room size. *(used by P12)*  
  *Answer (2026-09-29):* Agreed.  
  *Answer (2026-09-30, restated):* a room left at its default doesn't pull the house average down, and a bigger house never prices lower. *Built in P12:* each room's scores are measured against that room's own default, so ticking a room and leaving it at its default changes nothing.
- **Q7** The reference bands no longer match the engine. Rebuild them from the engine, or keep them and drop the "review scores" nudge?  
  *Recommendation:* Rebuild them. *(used by P12)*  
  *Answer (2026-09-30):* Rebuild them from the engine, as recommended below ("go for it"). Built in P12: this house at Normal and at Full, worded neutrally, no property-value multiplier.
  *Was open (2026-09-29):* You asked what the bands are. They are a hand-typed table from before the current pricing engine, internal only: of 24 normally-scored test houses, 9 read "Below range — review scores" and one reads "Above range" (M11). My call now: replace the hand-typed table with a range the engine works out for this house (its sq ft and service at Normal and at Full scoring), worded neutrally so it never tells anyone to score up. Or delete the box.
- **Q8** Should the agreement's fee clause name the 20% rush premium and the preferred-client discount? Today they appear only in Exhibit A, and on hourly jobs the premium lands on every hour above the stated rates.  
  *Recommendation:* Yes, one sentence each. It matters most on probate. *(used by P6)*  
  *Answer (2026-09-29):* Agreed.
- **Q9** Should rush apply to the 30% prep fee? Hourly jobs charge it ($2,700 on a $45k package); fixed-price jobs don't.  
  *Recommendation:* No, on both. Rush speeds up our crew, not the painter. *(used by P12)*  
  *Answer (2026-09-29):* No rush on the 30% prep fee on either basis, and a rush job carries the 20% on both hourly and fixed-price jobs. On fixed price the premium is already built into the suggested fee, but no fixed-price document shows it and a fee you typed does not follow the tick, so it prints as its own line under the fee, like the discount (Q13).
- **Q10** New estimates open hourly, while the estate guide on your website promises a fixed fee. Should Estate Settlement, Probate and Contested Probate open on fixed price?  
  *Recommendation:* Yes. *(used by P12)*  
  *Answer (2026-09-29):* Agreed.

### The prompts assume the recommendation

- **Q11** Should the agreement be viewable (not printable or sendable) before the client says yes? The manual says yes; the app says no.  
  *Recommendation:* Yes, view only. *(used by P6)*  
  *Answer (2026-09-29):* Agreed.
- **Q12** After a partial deposit cheque, should the ACH link ask only for the balance?  
  *Recommendation:* Yes. *(used by P10)*  
  *Answer (2026-09-29):* Agreed.
- **Q13** On a fixed-price job the discount is folded into the fee and never shown. Show it as a line?  
  *Recommendation:* Yes, so the client sees the concession. *(used by P12)*  
  *Answer (2026-09-29):* Agreed.
- **Q14** Change-order hours carry the rush premium and the discount on hourly jobs, and plain rates on fixed-price jobs. Keep that?  
  *Recommendation:* Keep it, and say so on the change order. *(used by P5)*  
  *Answer (2026-09-29):* Agreed, with one follow-up: now that rush applies on fixed price, should a fixed-price rush job's change-order hours carry the 20% too? My call: yes.  
  *Answer (2026-09-30):* Yes. *Built in P15:* the price is the hours at the rate card plus 20%, pinned on each change order when it is raised; the discount still does not apply, and one raised earlier keeps its plain-rate price.
- **Q15** Should the referral source and partner be correctable after intake?  
  *Recommendation:* Yes, in Edit Client. *(used by P9)*  
  *Answer (2026-09-29):* Agreed.
- **Q16** Warn when a new client matches an existing address?  
  *Recommendation:* Warn, never block. *(used by P9)*  
  *Answer (2026-09-29):* Agreed.
- **Q17** Should Home Prep intake ask the access and safety questions?  
  *Recommendation:* Yes; vendors go through the house. Skip the must-find question. *(used by P9)*  
  *Answer (2026-09-29):* Agreed.
- **Q18** If a start date moves past the closing date, keep both and flag it red?  
  *Recommendation:* Yes. *(used by P9)*  
  *Answer (2026-09-29):* Agreed.
- **Q19** A two-concierge estimate can confirm its team with the second concierge slot empty. Require a name or Contractor TBD?  
  *Recommendation:* Yes. *(used by P10)*  
  *Answer (2026-09-29):* Agreed.
- **Q20** "Inventory with values" still prices appraiser scheduling (about $765 on a typical estate), though counsel books the appraisers at that tier. Drop it?  
  *Recommendation:* Keep inventory scheduling, drop appraiser scheduling. *(used by P12)*  
  *Answer (2026-09-29):* "If we need an appraiser, don't we just add one? It's not mandatory and shouldn't be blocked either." So: an appraiser is priced when one is added to the estimate (each appraiser line already books 2 concierge hours, about $300), the documentation line keeps inventory scheduling and drops the built-in appraiser scheduling, and no tier requires or refuses an appraiser. When the estimate carries one, the agreement and the estimate say Havellin coordinates it; today the values-tier agreement says in bold that it does not, and the playbook says "do not offer to". Awaiting your OK on this reading.  
  *Answer (2026-09-30):* "Yes, drop built-in appraiser scheduling." *Built in P15:* the documentation step keeps half its coordination as inventory scheduling (a starting figure, like the capture share), an appraiser line prices its own 2 hours, and a job whose estimate lists an appraiser is Havellin's to coordinate for that appraisal, on any tier.
- **Q21** Neither agreement has a referral-fee disclosure. Add one?  
  *Recommendation:* Yes, if you will pay or receive referral fees. Send it to counsel with the bundle. *(counsel bundle)*  
  *Answer (2026-09-29):* Agreed.

### New, from P19 (2026-10-05)

- **Q22** A co-representative signs the agreement on paper and nothing records it: DocuSign records the agreement signed once the client and Anthony have, with a co-representative unsigned. Add each co-representative as a DocuSign signer, or file their wet signature as a signed record?  
  *Recommendation:* Each co-representative signs in DocuSign beside the client (the same routing order, Anthony after them); on the *sign by hand* route the co-signed page is filed as a signed record. *(counsel bundle A11)*  
  *Answer (2026-10-05):* "A, and yes to all the others." Agreed. *(built by P20)*
- **Q23** A co-representative recorded after a line has already gone makes that line's approval incomplete, so it comes back on the next Approval Request. Ask the new co-trustee to ratify those lines, or leave them?  
  *Recommendation:* Ratify: the next request lists them apart, as already released, for the new co-trustee's signature; nothing is undone.  
  *Answer (2026-10-05):* Agreed. *(built by P20)*
- **Q24** When one co-trustee signs a week before the other, the first signature can only be typed into the item record, where it reads *approval incomplete*. Let **Record approval** save a partial approval?  
  *Recommendation:* Yes: record who signed and when, and keep the line open until everyone has; the request already prints *"Signed so far by…; still to sign…"*.  
  *Answer (2026-10-05):* Agreed. *(built by P20)*
- **Q25** The staff rule is estate-only: a sale or gift to a Havellin person on a living client's job is neither refused nor flagged. Flag it there too?  
  *Recommendation:* Flag it, never refuse: an owner gives their own things to whom they like, but the conflict should be on the record.  
  *Answer (2026-10-05):* Agreed. *(built by P20)*
- **Q26** A Probate or Contested Probate service recorded as a trust or *Neither* still prices the legal step and titles the agreement *Probate Estate Settlement*. Re-type it to Estate Settlement?  
  *Recommendation:* Yes, before the estimate is approved: Edit Client flags it and names Estate Settlement; after approval the price stays as quoted.  
  *Answer (2026-10-05):* **A**: flag it before the estimate is approved and suggest Estate Settlement; never switch automatically; once approved the price stays and a change goes through ✎ Edit estimate or a change order. Contested Probate on such a matter keeps its price, and only its title and wording change (a fight over a trust usually ends up in court too). On such a matter no client document names the service *Probate*, whichever of the two it is, an estimate approved before the matter was recorded included (Anthony, 2026-10-05: *"yes, cover approved estimates too"*); its price stays as quoted. *(built by P20)*
- **Q27** The trust's title prints its date as *"Mar 3, 2015"*. Spell the month out in a legal title (*"March 3, 2015"*)?  
  *Recommendation:* Yes.  
  *Answer (2026-10-05):* Agreed. *(built by P20)*

### New, from P20 (2026-10-05)

- **Q28** Two drafts need your word. *Contested Estate Settlement*: the name a Contested Probate service now takes on the client's documents when the matter is a trust or *Neither*. And the client estimate's Probate narrative off the probate track: *"We settle the estate room by room under full documentation standards — a complete inventory, photographs, and chain-of-custody tracking for items of value, with the remainder routed to sale, donation, or disposal. Your Transition Concierge maintains the records counsel may request and keeps all parties informed."* (it read *"…under the documentation standards probate requires…"* and *"…the records the court and counsel may request…"*).  
  *Recommendation:* Keep both. *(counsel bundle A15)*  
  *Answer (2026-10-05):* "yes to all, build P21". Agreed. *(recorded by P21)*
- **Q29** The marketing opt-out box is the client's DocuSign tab alone: a co-representative cannot tick it, and their way out is written notice (§7.2). Give each co-representative a box of their own?  
  *Recommendation:* No: the client's box speaks for the matter, and any co-representative can still opt out by written notice. Counsel to confirm (B4).  
  *Answer (2026-10-05):* Agreed. *(recorded by P21)*
- **Q30** The estate signature page says *"No work will begin until both signatures are obtained and the deposit has been received."* With co-representatives on the page, "both" is ambiguous, and the app starts the work on the client's signature (a co-representative's is flagged until it is on record). Reword it?  
  *Recommendation:* *"No work will begin until the Client and Havellin have signed and the deposit has been received."* It matches what the app waits for, and §5.1's joinder covers a co-representative who signs later. Counsel to confirm (A11).  
  *Answer (2026-10-05):* Agreed. *(built by P21)*
- **Q31** The sign-by-hand email (*"When you are ready, sign and return it…"*) says nothing of co-representatives. Add *"Each co-representative named on the signature page signs it too."* where one is recorded?  
  *Recommendation:* Yes.  
  *Answer (2026-10-05):* Agreed. *(built by P21)*
- **Q32** Two signers on one email address (a couple sharing an inbox): the app neither refuses nor flags a co-representative recorded with the client's email, and how DocuSign handles it is unmeasured.  
  *Recommendation:* Try it once in the sandbox (below). If DocuSign takes it, allow it and say so on the send; if it refuses, refuse it in the app by name before anything is sent.  
  *Answer (2026-10-05):* Agreed. P21 built the first half: the envelope goes and the send says so. The sandbox test decides whether it stays that way. *(built by P21; the test is Anthony's)*

### New, from the job-flow audit (2026-10-08)

Ordered by what they protect: the client's and counsel's papers first, then the taps.

- **Q33** Exhibit A promises what Havellin does not do: *"the whole package served on interested parties and filed within the statutory deadline"* and *"Complete when … the filing is complete"* (the agreement's §2.1 says the estate attorney files), and *"we take direction from you alone"* where two co-representatives must approve together (§5.1). §5.2 also promises appraisals *"within the 60-day inventory deadline"*, which nothing checks.
  *Recommendation:* Reword to *"delivered to the estate attorney in time for the §733.604 filing; counsel serves and files"*, name *the representatives together* where co-representatives are recorded, and flag on Build Estimate a projected end after the §733.604 date. Counsel to confirm.
  *Answer (2026-10-09):* Agreed as recommended: delivered to the estate attorney in time for the §733.604 filing, counsel serves and files; *the representatives together* where co-representatives are recorded; a projected end after the §733.604 date flagged on Build Estimate. Counsel to confirm. *(to build: P25)*
- **Q34** The packet disagrees with itself on when money is due: the agreement's §3.2 says the deposit is due *within 7 calendar days of signing* and the final *prior to the final walk-through*; Exhibit A says the deposit is due *upon acceptance* and the final is generated after the walk-through from the logged hours (which is what the app does).
  *Recommendation:* One rule: deposit within 7 days of signing; final on completion, from the logged hours; drop *"prior to final walk-through"*. Counsel to confirm.
  *Answer (2026-10-09):* Upon acceptance, not the recommendation: the agreement follows Exhibit A and what the app does. The deposit is due upon acceptance, and the final is issued after the walk-through from the logged hours (*prior to final walk-through* goes). Counsel to confirm. *(to build: P25)*
- **Q35** Firearms. *Cleared to carry* rests on the release approval, whose own paragraph says transport needs authority *"separately in writing, naming each firearm by serial"*, and the request prints no serial. The beneficiary's receipt says Havellin *delivered* a firearm that went through the dealer.
  *Recommendation:* Make the release request the transport authority for firearms: each firearm line prints make, model, serial and dealer with the no-ownership sentence, initialled per line. Leave dealer-routed firearms off Havellin's receipt and file the dealer's receipt instead. Counsel to review.
  *Answer (2026-10-09):* Agreed, with one change: *"I don't think every line needs an initial. Just one for the batch."* The release request is the transport authority: each firearm line prints make, model, serial and dealer with the no-ownership sentence, under one initial for the batch. Dealer-routed firearms come off Havellin's receipt and the dealer's receipt is filed instead. Counsel to review. *(to build: P25)*
- **Q36** What counts as *appraised*? Today linking an appraiser to a line makes the Court Inventory FINAL and clears *NOT YET APPRAISED* while the value is still Agent Two's; and a line whose source is set to Appraisal with the report's figure typed, but no appraiser linked, still prints *NOT YET APPRAISED*.
  *Recommendation:* The appraisal's figure on the line (source Appraisal with a value), linked appraiser or not; the link alone is the appraisal in progress.
  *Answer (2026-10-09):* Agreed: a line is appraised once the appraisal's figure is on it (source Appraisal with a value), linked appraiser or not; the link alone is the appraisal in progress. *(to build: P25)*
- **Q37** Co-representatives get no client email: the estimate, the invoices, the package and the review ask go to the representative alone, and on a contested matter the other side hears nothing but the DocuSign envelope.
  *Recommendation:* Copy every co-representative with an email on every client email and the package, and share the photo folders with them.
  *Answer (2026-10-09):* Agreed: every co-representative with an email is copied on every client email and the estate package, and the photograph folders are shared with them. *(to build: P25)*
- **Q38** Which concierge do the client documents name? The estimate and invoices name whoever is in *Prepared by* (it defaults to the site-visit person), before the assigned concierge: one trust job's documents named Anthony while Ashley ran it.
  *Recommendation:* The assigned concierge, with the preparer shown as *Walkthrough by*.
  *Answer (2026-10-09):* Agreed: client documents name the job's assigned concierge; the preparer shows as *Walkthrough by*. *(to build: P25)*
- **Q39** Proceeds are typed twice: each sold lot's gross and fees in its own record (four taps a lot, about 750 on a full estate), then the statement's totals.
  *Recommendation:* A lot-by-lot table inside the statement dialog, pre-ticked with that vendor's lines, writing gross and fees onto the lines; the to-the-cent reconciliation stays.
  *Answer (2026-10-09):* Agreed: a lot-by-lot table inside the statement dialog, pre-ticked with that vendor's lines, writing gross and fees onto the lines; the to-the-cent reconciliation stays. *(to build: P25)*
- **Q40** About 14 taps per room before the first item. On living work the *As-found pass complete* tick only quiets a flag.
  *Recommendation:* On living jobs the as-found shot stands as the pass (still flagged if missing); a *Next: Items* button in the camera; *Cleared* offered on the room's row. Estates keep the tick and the refusal.
  *Answer (2026-10-09):* Agreed: on living jobs the as-found shot stands as the pass (still flagged if missing); *Next: Items* in the camera and *Cleared* on the room's row on every job; estates keep the tick and the refusal. *(to build: P25)*
- **Q41** A close-up costs two taps (Detail, then the shutter) because Detail resets after every shot.
  *Recommendation:* A separate one-tap *Close-up* shutter.
  *Answer (2026-10-09):* Agreed: a separate one-tap *Close-up* shutter for a detail of the last item. *(to build: P25)*
- **Q42** Move Day has 13 tick boxes, four of them *"TC present / oversees"* rules and two the same walk as *Home confirmed empty*.
  *Recommendation:* Four recorded facts (movers arrived, client walked the new home and approved, damage photographed or none, mover's sign-off); the rest as read-only procedure.
  *Answer (2026-10-09):* Agreed: four recorded facts (movers arrived; client walked the new home and approved; damage photographed, or none; mover's sign-off); the rest read-only procedure. *(to build: P25)*
- **Q43** Tick boxes the app can derive or that do not apply: the trust list's *delivered* and *records delivered* (the package records both), *settlement timeline* (every sold line on a paid statement), the Collection Partners' three per collection, Home Prep's *quotes collected* and *vendors booked*; *served*, *filed* and *final accounting* are counsel's acts; *Shredding*, *Certificate of Insurance to the attorney*, *valuables pickup* and *Moving materials on site* show on jobs they do not apply to.
  *Recommendation:* Derive what the app records; replace the three court boxes with one derived line, *Court Inventory and Disposition Ledger delivered to counsel*; show the rest only where they apply.
  *Answer (2026-10-09):* Agreed: derive what the app records; the three court boxes become one derived line, *Court Inventory and Disposition Ledger delivered to counsel*; *Shredding*, the Certificate of Insurance to the attorney, *valuables pickup* and *Moving materials on site* show only where they apply. *(to build: P25)*
- **Q44** Recipients are typed per line even when the Job Plan already holds the one confirmed donation charity, hauler or auction house.
  *Recommendation:* Default the line's recipient from the single confirmed vendor of that kind, marked as derived; flag when there are two.
  *Answer (2026-10-09):* Agreed: a Donate, Junk or Auction line takes the single confirmed vendor of that kind as its recipient, marked derived and editable; flagged where there are two. *(to build: P25)*
- **Q45** Submit opens a confirm listing every room with no walkthrough note (14 of 15 on one job), on every submit. Notes are optional.
  *Recommendation:* Drop the dialog; a passive line under Submit.
  *Answer (2026-10-09):* Agreed: no dialog; a passive line under Submit names the rooms with no note. (A first tap of *Only special rooms* was a mis-tap; Anthony corrected it.) *(to build: P25)*
- **Q46** The release request asks two initials on every leaving line, a $20 paperback to junk included; the agreement's §5.3 asks written approval only for sales or disposals over $500, and donations.
  *Recommendation:* List every line; one initial per destination group under $500; line initials for $500 and over, bequests, and anything carrying a caution.
  *Answer (2026-10-09):* Agreed: every leaving line listed; one initial per destination group under $500; line initials for $500 and over, bequests and anything carrying a caution. *(to build: P25)*
- **Q47** A second concierge nobody chose: the engine's recommendation pre-selects two on the estimate, and the team cannot be confirmed until a second is named.
  *Recommendation:* Two only when the estimator picks two.
  *Answer (2026-10-09):* Agreed: two concierges only when the estimator picks two; the engine's recommendation stays a suggestion. *(to build: P25)*
- **Q48** Vendor ratings at close count only vendors confirmed on the Job Plan; an auction house or charity used as a line's channel is never asked, so the gate was passed with five vendors unrated.
  *Recommendation:* Also every vendor named as a channel or on a pickup list.
  *Answer (2026-10-09):* Agreed: the close also asks a rating of every vendor named as a line's channel or on a pickup list. *(to build: P25)*
- **Q49** The walkaway. A refund above the computed amount (after Havellin's uncured breach, which §8.1 requires, or goodwill) cannot be recorded; and §8.1 promises a final invoice within 10 business days that the app never offers on Deposit Retained.
  *Recommendation:* Allow a refund above the amount due, up to what the job holds, asked first with a required reason; offer a *work done* final on Deposit Retained that shows what was earned and the refund due.
  *Answer (2026-10-09):* Agreed: a refund above the amount due may be recorded, up to what the job holds, asked first with a required reason; a *work done* final is offered on Deposit Retained, showing what was earned and the refund due. *(to build: P25)*
- **Q50** Condition is promised on the estimate, the agreement and the receipt (*"in the condition described"*) and never recorded: every schedule prints *—*.
  *Recommendation:* Condition on the desk's bulk bar (set *Good* across a selection, mark the exceptions) and *as photographed* where blank.
  *Answer (2026-10-09):* Agreed: condition on the desk's bulk bar (set *Good* across a selection, mark the exceptions); a blank prints *as photographed*. *(to build: P25)*
- **Q51** A living family gets two near-identical papers (the Contents Record, and the Disposition Ledger to sign at close), and the record says *Junk*.
  *Recommendation:* One paper: the Contents Record with a signature line, the ledger only where there are proceeds; *Junk* reads *Disposed of*.
  *Answer (2026-10-09):* Agreed: the Contents Record carries a signature line and is the paper a living family signs; the Disposition Ledger prints on living work only where there are sale proceeds; *Junk* reads *Disposed of*. *(to build: P25)*
- **Q52** The 30% Home Sale Preparation Fee trues to the *Quote $* typed on the Job Plan, while the documents say it trues to what the vendors actually invoice.
  *Recommendation:* Reword to *"the vendor quotes recorded, updated if a vendor's invoice differs"*.
  *Answer (2026-10-09):* Agreed: the documents say the fee is on *"the vendor quotes recorded, updated if a vendor's invoice differs"*. Counsel bundle. *(to build: P25)*
- **Q53** The estate agreement prints *Court ____* and intake never asks for the court.
  *Recommendation:* A Court field, defaulted from the case number (*50-* is Palm Beach County).
  *Answer (2026-10-09):* Agreed: the Court is derived from the case number's county prefix (*50-* is Palm Beach County Circuit Court, Probate Division) and stays editable. *(to build: P25)*
- **Q54** Change-order reasons are one list for every service and open on *Accelerated timeline — rush adjustment*; a prep change order printed *Crew upgrade — Senior Property Specialist required*, a role the rate card does not have.
  *Recommendation:* A list per service, no reason pre-picked, *Senior Property Specialist* gone.
  *Answer (2026-10-09):* Agreed: a reason list per service, none pre-picked, *Senior Property Specialist* gone. *(to build: P25)*
- **Q55** The Google review ask on a contested matter or a recorded dispute goes to one litigating sibling.
  *Recommendation:* Suppress it there.
  *Answer (2026-10-09):* Keep as is: the review ask stays on every job and the concierge decides whether to send it. *(closed, no change)*
- **Q56** Home Prep's second invoice is due *"once the vendor schedule is booked"* but is the band's button from activation day.
  *Recommendation:* Due once every prep vendor is marked Confirmed, which the Job Plan already records.
  *Answer (2026-10-09):* Agreed: the second invoice becomes the band's step once every prep vendor on the job is Confirmed; before that the band shows the vendor booking. *(to build: P25)*

## Only Anthony can do these

- [x] **Redeploy the Apps Script.** The repo is at `2026-09-22b`; the last recorded deploy is `22a`. Add `ANTHROPIC_API_KEY` in Script Properties and run `testAgentIdentify()` once. Until then, Agent One (photo naming) can't run. *You report this done (2026-09-29). To confirm: no "out of date" banner when the app loads means the 22b deployment is live, and pressing Name N shots on a job with photos (or running `testAgentIdentify()` in the editor) proves the key.*
- [ ] **Redeploy quo-sync.gs, then check before pruning.** Deploy the 2026-09-18 fix, fix the duplicate "David Schneider" vendor row, and run `dryRunQuoAll` before any prune.
- [x] **Send one DocuSign sandbox envelope end to end.** Check that the opt-out box renders, where the signature boxes land, that no green "Approved for Sending" band is on the PDF, and that the signed PDF and certificate file to Drive. Then move to production. *You report several that worked (2026-09-30). What remains is the move to production when you are ready.*
- [x] **Redeploy the Apps Script at `2026-09-30`.** *Done (Anthony, 2026-09-30).* Copy `main-sync.gs` and `saveInventory.gs` from `main`, then Deploy → Manage deployments → New version. Until then P11's per-key merges, the unreadable-store refusal, the busy answer and Agent One's larger answer limit are not live; the banner says so.
- [ ] **Redeploy the Apps Script at `2026-10-06`** (P22's `saveInventory.gs`: two devices' release signers merge to both, the workbook's money to the cent; it carries P20's `2026-10-05`, P19's `2026-10-03`, P17's `2026-10-01` and P16's `2026-09-30b`). Paste `main-sync.gs` and `saveInventory.gs` from `main`, then Deploy → Manage deployments → edit → New version. Every device shows the out-of-date banner until it is done. Until then a DocuSign envelope goes to the client and Anthony alone, so a co-executor or co-trustee signs a printed copy and the app asks for the page they signed. If `2026-10-03` never went live, the six lists P19 adds to a client (co-representatives, beneficiaries, bequests, signed papers, finds on site, proceeds statements) can lose an entry when two devices add to one, a void can be undone by a device that had not reloaded, and a trust's workbook heads its net total *Net to Estate*; and if `2026-10-01` never went live, **File signed copy** can file a second executed agreement beside the first.
- [ ] **Redeploy the Apps Script at `2026-10-06b`, then run `testAgentValue()` once** (P23; it carries P22's `2026-10-06` and everything before it, so it replaces the items above if those were never done). Paste `main-sync.gs` and `saveInventory.gs` from `main`, then Deploy → Manage deployments → edit → New version. Until then every device shows the out-of-date banner (*the desk cannot value lines automatically*) and *Value N lines* answers *Unknown action*. `testAgentValue()` values three known lines and prints how long the call took: if it reports *took too long*, send that figure, because Apps Script's per-request limit decides how much research one call can do.
- [x] **Redeploy the Apps Script at `2026-10-06c`, then run `testAgentRoomCheck()` and `testAgentValue()` once** *Done (Anthony, 2026-10-06): `testAgentRoomCheck()` read eight photographs in 32 seconds and found three doubles, all correct. `testAgentValue()` not reported yet.* (P24; it carries P23's `2026-10-06b`, P22's `2026-10-06` and everything before it, so it replaces the items above if those were never done). Paste `main-sync.gs` and `saveInventory.gs` from `main`, then Deploy → Manage deployments → edit → New version. Until then every device shows the out-of-date banner (*the desk cannot check a room's photographs for one thing photographed twice*), and **Check N rooms**, and the check that runs after naming, answer *Unknown action*. `testAgentRoomCheck()` reads up to eight photographs from one Drive folder as one room and prints how long it took: note that figure, because Apps Script's per-request limit decides how many photographs one look can take.
- [x] **Redeploy the Apps Script at `2026-10-06d`, then run `testAgentRoomCheck()` once** *Done (Anthony, 2026-10-06, 2:12 pm): the biggest room in Drive had six Items photographs, read in one run in 15 seconds; two doubles found, both right, each in one short plain sentence. Still to time: a full run of twelve, once a room with twelve or more Items photographs has been shot (run the test again after the first big room of the mock job).* (P24, after the first live run; `main-sync.gs` only). Paste `main-sync.gs` from `main`, then Deploy → Manage deployments → edit → New version. It reads a room in runs of 12 photographs rather than 24, so each request answers inside Apps Script's 60-second limit, and keeps the room check's sentence short. Until then a big room can fail the room check as *took too long*. The test now times one full run of the room with the most Items photographs: note the seconds it prints (it warns past 45).
- [ ] **DocuSign co-signers in the sandbox, before production** (P20; proved only against stubs). With a test trust whose trustee is one of your mailboxes and a co-trustee on a second (once, a second co-trustee on a third): (1) both get DocuSign's email at the same time, and you only after both have signed; (2) each signature and date lands on its own *Co-Signer* block, not the client's; (3) ↻ Check DocuSign now names the client as the signer even if DocuSign lists a co-trustee first; (4) a co-trustee who signs after 8pm Eastern gets their own day; (5) the envelope stays out until everyone has signed, and a decline records nothing; (6) the executed copy and the certificate filed to Drive list every signer; (7) optionally, remove a co-trustee's email to see the refusal; (8) one envelope with two signers on one email address (Q32).
- [ ] **Stripe: one test ACH link.** It proves the ACH-only check. Confirm the account's ACH limit covers your largest deposit. *Lower priority (2026-09-30), still to do before the first real deposit.*
- [x] **Run `backfillIds()` once in the Referral Partners Apps Script project.** *Done (Anthony, 2026-09-30).* Gives every partner row a permanent id, so re-sorting that sheet can never move a referral.
- [ ] **Google Cloud: set the Gmail consent screen's audience to Internal.** Otherwise the Gmail draft path stays in Testing mode.
- [ ] **Run `previewOrphanRecords()` once.** From the Apps Script editor, to see leftover practice records.
- [ ] **Send the counsel bundle in priority order.** *On hold (Anthony, 2026-10-02) until the open changes are done.* Before the first fixed-fee, trust and firearm jobs. The hourly termination wording and the retained deposit are drafted now (A1, B2, P16); the ACH-return question is B10, and the referral-fee question is still to add. P17 adds the walkaway refund (A1, B2), the fee's one name (B11), the quarter-hour increment (B12) and the probate package's wording (D6). P19 adds the trust form and the estate workflow's papers (A10 to A14, D7 to D11). P20 adds co-representatives signing in DocuSign and the signature page's "both signatures" (A11, reworded by P21), the service's name on a matter with no court and the trust's date (A15), partial approvals and ratification (D7) and a living client's property going to a team member (D12).
- [ ] **WorthPoint: subscribe and send the partnership inquiry** (2026-10-05). All Access (about $47 a month) is Agent Two's confirming source by hand (`AGENT_TWO_SPEC.md` §4); the partnership inquiry was sent (Anthony, 2026-10-06); waiting on their answer. Subscription still to do.
- [ ] **QuickBooks: Laura's four answers** (LLC tax status, contractor bills, deposits and chart of accounts, pass-through vendor money). Texted 2026-10-06; the questions are in the Gmail draft *Havellin: 4 quick QuickBooks questions*. The QuickBooks build waits on them (`TIME_TRACKING_INTEGRATION_SPEC.md`).
- [ ] **Bind the insurance and the bond.** Before the first real client document goes out; every document already says Insured & Bonded.
- [ ] **Update the two Drive documents.** Re-import the updated estate guide into its Google Doc, and retire the "NEEDS REWRITE" probate package.

## What works

- **Money reconciles.** 79 document scenarios: six labour services, hourly and fixed, seven modifier combinations, plus two typed fixed fees and five Home Prep cases. In every one, deposit + midpoint + final equals the agreed total, and the estimate, agreement, Exhibit A and invoices agree to the dollar.
- **The pricing rules hold.** Rush is 20% on the full services total, then the discount comes off labour including the premium (10,150 + 2,030 − 1,218 = 10,962). Fixed-price contingencies are 20, 25 and 35%. Premium rates are $185 and $125. The 30% prep fee sits on top of a fixed fee. Change orders carry no dollar figure on hourly jobs, chain on fixed ($14,616 → $17,116 → $17,866) and bill $150 an hour on prep; an unaccepted one bills nothing.
- **Three jobs ran end to end through the real buttons, with zero page errors.** Home Transition, hourly: $7,325 + $3,663 + $3,662 = $14,650. Estate Settlement, fixed, on a probate matter: $16,740 + $8,370 + $8,370 = $33,480, with the executor as the DocuSign signer. Home Prep: $5,250 + $2,625 + $2,625 = $10,500.
- **Delivery is right.** Estimates go to the client with estimates@ copied and invoices with billing@, under dated PDF names; on estate jobs created at intake the representative, never the deceased, signs; the DocuSign envelope carries all five signature anchors; the Stripe link amount equals the invoice.
- **Gates hold.** A blank documentation tier refuses Save and Submit and keeps the rooms. Excluded rooms pass. The PIN freezes the rooms, and editing after approval revokes the agreement. Unapproved estimates can't print or send. The agreement waits for Won. A final with no hours is blocked, and the ±15% PIN applies to the final only. Probate activation waits for the Letters and names the representative's number. Hours wait for the team and the deposit. Close waits for vendor ratings, and the review email waits for the satisfaction call.
- **Saved estimates keep their price.** Reopened after a Settings change and a reload, the figures, rooms, collections, vehicles, vendors and prep lines are identical, and a new estimate picks up the new Settings.
- **The wording rules hold.** Insured & Bonded on every document, no claim to be licensed, no 15% hours trigger on fixed-price forms, materials described as a fixed package, and no "undefined", "NaN" or "Invalid Date" anywhere.
- **Phone layout holds.** No sideways scrolling at 390 px on the dashboard, the Job Plan with both folds open, the desk or the prep plan.
- **The standing suites pass.** 11,489 unit checks and 1,154 browser checks.

### Known and still open (decisions, not bugs)

- ~~No way to add a new vendor (a painter found mid-job) through a change order.~~ Built 2026-09-30 (P15) on Home Prep for Sale. Still open: whether a labour job with bundled prep may do the same.
- **Found by the P13 documentation pass (2026-09-30), not fixed** (each with its function names in `CLAUDE.md`, Open work). For Anthony: agreement §3.9 still offers card payment; the hourly deposit clauses against keeping every paid walkaway; whether a Premium job with an appraiser line prices appraiser scheduling twice; a firearm going to a named person can never clear transport; the as-found delete refusal; in-person packet records; filing change orders to Drive; Agent One never reading as-found shots; volume 5 forcing complexity 5; the self-attested *Send Package*; Power of Attorney offered for a decedent. Defects: field mode hides Save Estimate; unescaped text on the client card and the preparer's bio; a hand-recorded ACH payment counted twice when Stripe reports it; the Gmail fallback records no send; the filed estimate after Edit estimate; the final's approval message on a no-hours final; and about fifteen smaller ones and stale strings. *All answered or fixed by P16 (2026-09-30) and P17 (2026-10-01).*
- The hourly agreement's termination wording ("after project start") is vague; it belongs with counsel.
- The estate guide says no photography is shared without written consent; both agreements carry an opt-out marketing clause.
- Four literal "15%" strings survive; they are correct while the tolerance is 15%.
- The engine is still uncalibrated against real jobs: the step coefficients and the 50% capture share are starting guesses.

## Method

- Five audits ran in parallel (intake, estimator, client documents, job plan and lifecycle, sync and backend), plus my own click-through of three jobs. Each drove the real `havellin.html` in headless Chromium against a stubbed backend, and the real Apps Script merge code in node.
- Every Critical and High on this list was checked against the source before it went on the list.
- Nothing in the app was changed.
- Not tested live: Apps Script, DocuSign, Stripe, Gmail and Quo themselves, which the build environment can't reach. The owner actions above cover them.
