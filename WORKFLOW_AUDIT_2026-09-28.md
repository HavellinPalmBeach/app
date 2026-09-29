# Havellin Workflow Audit — September 28, 2026

Five audits and a click-through of three jobs, from + Add New Client to final payment: intake, the estimator, the client documents, the job plan and sync. Nothing in the app was changed.

Status of each fix pack lives in this file: when a session lands a pack, it marks it done here and adds its CLAUDE.md entry.

**Status, 2026-09-29:** P1–P8 and P10 have landed on `main`: C1, C2, H1, H2, H3, H4, H5, H6, M1–M8 and thirteen lows are fixed and marked below, plus Anthony's follow-up to P7 (the final invoice names only the invoices that went out, and a closed job can be re-opened; see H3). One P10 low is a decision for Anthony (`deliveredBy` / `activatedBy`, under the lows). Still open: P9 and P11–P14 (H7–H9, M9–M16 and the remaining lows). Questions still open: Q7, the Q14 follow-up and Anthony's OK on the Q20 reading, all three for P12 only.

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

#### H7 · Edit Client · Saving Edit Client erases fields it can't display.

Its concierge list is hard-coded (and includes Anthony Jr, a specialist), and its representative-role list lacks the three ad litem roles intake offers. Any save, even one to fix a date, writes them back blank: a directory concierge is removed (the job's contact falls back to Anthony) and an ad litem role is lost.

**Where:** `showEditClient` (the two lists, `sel()` exact match), `saveClientEdit` writes both back unconditionally.

**Fix:** P9 (Bring Edit Client up to intake's rules)

#### H8 · Edit Client · Switching between a living and an estate service keeps the wrong person's data.

Edit Client allows the switch and keeps everything. A living client re-typed to an estate service keeps their own email, and Edit Client even marks phone and email required on estate jobs. DocuSign's signer lookup takes the client email first, so the signature request can go out under the deceased's name. The other way round, a job that kept its representative reads "Estate of …" on the client estimate.

**Where:** `showEditClient` / `saveClientEdit`; `esignSigner` prefers `job.email` on every service.

**Fix:** P9 (Bring Edit Client up to intake's rules)

#### H9 · Intake & Edit Client · Moving a date silently deletes the closing date or the start date.

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

#### M9 · Backend · A corrupt store blob empties that store on the next save; lock timeouts write unlocked.

If a stored blob fails to parse, the server reads it as empty and the next save writes back only what that save carried, which is every other job's estimates, plans or logs gone. Nine save paths carry on without the lock after a 20-second timeout. Unlikely, but the damage is total.

**Where:** main-sync.gs `_readStoreBlob`, `_writeStoreBlob`, and the `waitLock` catch blocks.

**Fix:** P11 (Harden the Apps Script backend (redeploy))

#### M10 · Build Estimate · On fixed price, the Estimate Summary panel shows the hourly totals.

A $21,840 fixed quote shows "Total project estimate $18,200"; with bundled prep, $79,150 against the document's $82,480. Internal only.

**Where:** `calcAll` writes `s-havellin` and `s-total` before the fixed-price block.

**Fix:** P12 (Estimator fixes and pricing decisions)

#### M11 · Build Estimate · The reference bands mislead in both directions.

Estate Settlement reads "Above range" at 3,500 sq ft on default scores, and 9 of 24 normally-scored test houses read "Below range — review scores", which invites scoring up. The day ranges run 2 to 6 times the engine's plans, and the range grows 15–85% on homes over $5M although property value never moves the price.

**Where:** `PRICING_REF` (Estate Settlement reuses Home Cleanout's bands), `updateRefBox`.

**Fix:** P12 (Estimator fixes and pricing decisions)

#### M12 · Pricing design · The price can fall as the walkthrough gets more complete or the house gets bigger.

Scoring the rooms the coverage badge asks for dropped one quote from $18,200 to $17,000. With automatic crew sizing, 5,750 sq ft priced below 5,500. Forcing six specialists cut 14.6%.

**Where:** Room volume is averaged unweighted in `computeEngineV3`; crew sizing in `calcAll`.

**Fix:** P12 (Estimator fixes and pricing decisions)

#### M13 · Edit Client · Some intake answers can never be corrected.

Years in home (it moves the price: 4 → 40 years took $17,450 to $18,200), bed and bath counts, the referral source and partner, and the Letters date have no Edit Client field.

**Where:** `showEditClient`.

**Fix:** P9 (Bring Edit Client up to intake's rules)

#### M14 · Intake · A hand-set documentation level can come back on the next intake.

When a gate forces Formal, the form remembers the level it overrode so it can hand it back. That memory survives the reset after Save Client, so the next client's form can come back to the previous client's level.

**Where:** `dataset.preGate` on the level select is not cleared by `resetIntakeFields`.

**Fix:** P9 (Bring Edit Client up to intake's rules)

#### M15 · Intake · Save Client can pull you back to the new client when its Drive folder lands.

Seconds after Save Client, the folder callback reopens that client's dashboard and makes it the current client for the Job Plan, even if you have moved on to another client.

**Where:** Four `openClientDashboard(job.id)` calls in `createDriveJobFolder`.

**Fix:** P9 (Bring Edit Client up to intake's rules)

#### M16 · Intake · Referral attribution can record a partner you didn't pick.

A partner chosen and then hidden (by changing the source) is still saved, and partners are identified by sheet row, so re-sorting the sheet re-points them.

**Where:** `saveIntake` referral fields; `referralIdOf`.

**Fix:** P9 (Bring Edit Client up to intake's rules)

### Low (34)

**Build Estimate** (fix: P12)

- Re-saving a reopened estimate replaces its pinned cost rates with today's Settings (margin panel only).
- A saved estimate reprices by about $150 when the Vendor Directory hasn't loaded.
- The unscored-room gate can never fire: a blank or 0 is priced as 3, and 9 or 2.5 is saved as typed.
- Standalone Home Prep lets you tick Fixed price, then ignores it.
- The two ways to discount a fixed fee disagree once a materials package is on the job (about $180).
- The Save button still reads "Save & Preview Client Estimate →".

**Client documents** (fix: P6)

- Midpoint and final swap $1 against the signed schedule in 12 of 79 scenarios. *(fixed 2026-09-29)*
- The Home Prep estimate prints no discount row, so its rows don't add up to its total. *(fixed 2026-09-29)*
- A credit final's email says "Balance due: $-2,741 … due within 7 calendar days". *(fixed 2026-09-29)*
- Premium finals: the per-person rows run $1–2 over the printed total. *(fixed 2026-09-29)*
- Both agreements print "(None — $0)" when no materials package was quoted. *(fixed 2026-09-29)*
- The invoice gate's refusal says "before the agreement can be drawn". *(fixed 2026-09-29)*

**Intake & Edit Client** (fix: P9)

- Edit Client's required asterisks aren't enforced.
- The example placeholders ((561) 555-0100, client@email.com) are back, set at runtime where the markup test can't see them.
- The intake reset carries date minimums and the referral block to the next client.
- No sanity checks on square footage or room counts.
- The client name is unescaped in two headers.
- A service switch wipes phone and email.
- Home Prep's Edit Client shows the house checklist its intake skips.

**Job Plan & lifecycle** (fix: P10)

- Change-order notices print on the hidden Build Estimate panel, and the card reads "None issued" until a redraw (fixed in P5).
- The final invoice's View and Print are offered before activation, and Print then refuses. *(fixed 2026-09-29)*
- "Estate attorney on file" stays red on a trust administration with no attorney. *(fixed 2026-09-29)*
- A closed job's plan marks Before Day 1 as NOW. *(fixed 2026-09-29)*
- Home Prep's second payment is called the "midpoint invoice", while its estimate says it is due when the vendor schedule is booked. *(fixed 2026-09-29)*
- A won job reads "Approved — Awaiting Client" in the client list after a re-approval. *(fixed 2026-09-29)*
- `deliveredBy` and `activatedBy` record the estimate's approver, not whoever pressed the button. *(left for Anthony, 2026-09-29: which name should a handover carry — the approver, the assigned concierge, or a name asked at the press?)*

**Other** (fix: P14)

- The stale-backend banner doesn't list every action the app calls (fixed in P11).
- A feedback message can be wiped by an earlier message's 4-second timer. *(fixed 2026-09-29)*
- Filed copy links don't name their document.
- The Job active step shows no date.
- Dead code: `houseFlagSummary` and the client list's detail row. *(fixed 2026-09-29)*
- Deleting a contractor has no PIN.
- Splitting a photo repaints the whole tab: 1.4 s at 3,000 rows.
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
- [ ] **P9** Bring Edit Client up to intake's rules (needs Q4, Q15–Q18)
- [x] **P10** Lifecycle and payment loose ends (needs Q2, Q12, Q19)
- [ ] **P11** Harden the Apps Script backend (redeploy)
- [ ] **P12** Estimator fixes and pricing decisions (needs Q5–Q7, Q9, Q10, Q13, Q20)
- [ ] **P13** Documentation pass (needs the packs above first)
- [ ] **P14** Small backlog

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
- `showFB` clears its strip on an unconditional 4-second timer, so a second message inside 4 s is wiped by the first message's timer.
- The "Filed copy" links in the document strip don't name their document.
- The Job active step shows no date, though `activatedOn` is stamped.
- Dead code: `houseFlagSummary` and the client list's unused `detailHtml`, if P5 didn't already remove them.
- Deleting a contractor has no PIN, unlike vendors and partners.
- Splitting a photo (`invSplitItemClick`) repaints the whole Job Admin tab: 1.4 s at 3,000 rows. Repaint the affected rows only.
- Agent One's `AGENT_MAX_TOKENS` is 4,096 with adaptive thinking on, so a dense frame can fail with "cut off". Raise it to about 16,000 (backend; bundle it with P11's redeploy).
House process (CLAUDE.md): tests plus a revert sweep, a CLAUDE.md entry, stamp the build, push.
```

## Questions for Anthony

**Answered 2026-09-29.** The recommendations stand except Q9 and Q20, which Anthony changed, and Q7 and a Q14 follow-up, which are still open. Each answer is under its question.

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
- **Q6** Should a room scored at its normal default pull the whole-house fullness down? Finishing the walkthrough cut one quote from $18,200 to $17,000.  
  *Recommendation:* No. Weight the average by room size. *(used by P12)*  
  *Answer (2026-09-29):* Agreed.
- **Q7** The reference bands no longer match the engine. Rebuild them from the engine, or keep them and drop the "review scores" nudge?  
  *Recommendation:* Rebuild them. *(used by P12)*  
  *Still open (2026-09-29):* Open. You asked what the bands are. They are a hand-typed table from before the current pricing engine, internal only: of 24 normally-scored test houses, 9 read "Below range — review scores" and one reads "Above range" (M11). My call now: replace the hand-typed table with a range the engine works out for this house (its sq ft and service at Normal and at Full scoring), worded neutrally so it never tells anyone to score up. Or delete the box.
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
  *Still open (2026-09-29):* Agreed, with one follow-up open: now that rush applies on fixed price, should a fixed-price rush job's change-order hours carry the 20% too? My call: yes.
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
- **Q21** Neither agreement has a referral-fee disclosure. Add one?  
  *Recommendation:* Yes, if you will pay or receive referral fees. Send it to counsel with the bundle. *(counsel bundle)*  
  *Answer (2026-09-29):* Agreed.

## Only Anthony can do these

- [x] **Redeploy the Apps Script.** The repo is at `2026-09-22b`; the last recorded deploy is `22a`. Add `ANTHROPIC_API_KEY` in Script Properties and run `testAgentIdentify()` once. Until then, Agent One (photo naming) can't run. *You report this done (2026-09-29). To confirm: no "out of date" banner when the app loads means the 22b deployment is live, and pressing Name N shots on a job with photos (or running `testAgentIdentify()` in the editor) proves the key.*
- [ ] **Redeploy quo-sync.gs, then check before pruning.** Deploy the 2026-09-18 fix, fix the duplicate "David Schneider" vendor row, and run `dryRunQuoAll` before any prune.
- [ ] **Send one DocuSign sandbox envelope end to end.** Check that the opt-out box renders, where the signature boxes land, that no green "Approved for Sending" band is on the PDF, and that the signed PDF and certificate file to Drive. Then move to production.
- [ ] **Stripe: one test ACH link.** It proves the ACH-only check. Confirm the account's ACH limit covers your largest deposit.
- [ ] **Google Cloud: set the Gmail consent screen's audience to Internal.** Otherwise the Gmail draft path stays in Testing mode.
- [ ] **Run `previewOrphanRecords()` once.** From the Apps Script editor, to see leftover practice records.
- [ ] **Send the counsel bundle in priority order.** Before the first fixed-fee, trust and firearm jobs. Add the hourly termination wording, the retained-deposit clause, an ACH-return clause and the referral-fee question.
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

- No way to add a new vendor (a painter found mid-job) through a change order. Raised 2026-09-25, not built.
- The hourly agreement's termination wording ("after project start") is vague; it belongs with counsel.
- The estate guide says no photography is shared without written consent; both agreements carry an opt-out marketing clause.
- Four literal "15%" strings survive; they are correct while the tolerance is 15%.
- The engine is still uncalibrated against real jobs: the step coefficients and the 50% capture share are starting guesses.

## Method

- Five audits ran in parallel (intake, estimator, client documents, job plan and lifecycle, sync and backend), plus my own click-through of three jobs. Each drove the real `havellin.html` in headless Chromium against a stubbed backend, and the real Apps Script merge code in node.
- Every Critical and High on this list was checked against the source before it went on the list.
- Nothing in the app was changed.
- Not tested live: Apps Script, DocuSign, Stripe, Gmail and Quo themselves, which the build environment can't reach. The owner actions above cover them.
