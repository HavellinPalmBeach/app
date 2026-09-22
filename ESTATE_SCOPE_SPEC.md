# Estate Documentation Scope — Diagnosis, Decisions & Build Spec

**Status:** Decisions taken 2026-09-21 · No app code changed yet · Build not started
**Scope:** How Havellin captures what an executor, personal representative or trustee has asked it to produce, and how that answer reaches the price, the contract, the crew, the desk and the documents.

Anthony, 2026-09-21:

> "We claim that we can work with executors or personal representatives according to their process, and do as little or as much of the inventory work as required. Whether that's a full Rule 5.340 inventory or trust accounting, or something lighter… But I don't think there's anywhere in the app to actually capture that… We can't be 100% flexible. But we have to know if we are doing a full documentation with valuation and that should be captured somewhere, probably at intake, certainly before we offer an estimate of cost. And then the job plan needs to reflect that."

---

## 1. The finding in one line

**The app already asks the question, prices it, and writes it into the contract — and then every surface that actually delivers the work ignores the answer.**

---

## 2. What already exists and works — do not rebuild this

`docScope` (`DOC_SCOPES`, line 4045) is a per-estimate pin answering *who builds the inventory*:

| Value | Meaning | Engine effect |
|---|---|---|
| `full` | Havellin catalogues AND values, coordinates appraisers | full `document` step |
| `capture` | Havellin photographs, describes, locates; hands the list to counsel, who values | `DOC_CAPTURE_POOL_SHARE` = 0.5 of the pool, none of the coordination |
| `none` | Counsel's office inventories and values | step removed |

It is captured at intake (`i-docscope`, 1427), editable on Build Estimate (`e-docscope`) and Edit Client (`ec-docscope`, 32650), pinned on the snapshot as `est.docScope` (6953) and restored on reopen (11316).

It correctly drives three things:
1. **Price** — `effectiveJobSteps` / `computeEngineV3` (4063, 4132).
2. **The client estimate** — `_cePhases` has three distinct decedent arms for stage title, stage body and the records list (8957–9210).
3. **Both agreement forms** — `_agrScopeServices` (30579), `_agrProbateCompliance` (30588), `_agrMidpointTrigger` (30607).

Also already built and sound: the 30-column manifest, asset tracks, valuation basis (`INV_VAL_BASES`, 18463), the §2032 alternate valuation date, the chain-of-custody event log, the appraiser roster with independence and conflict flags, the MAIV §20.2031-6(b) aggregate, and snapshots.

`docLevel` (Strict Mode, 29335–29444) is a *separate* dial answering *how strictly* — driven by the Form 706 gate and the dispute gate, escalate-only.

---

## 3. What is broken right now

### D1 — Three intake questions are hidden on Estate Settlement ⚠ worst
`#probate-fields` spans **1366–1437** and `toggleIntakeFields` renders it only when `svc` is `probate` / `contested_probate`. It is hidden on `cleanout` (Estate Settlement), which **is** a decedent service.

Hidden inside it: `i-date-of-death` (1384, marked required), `i-letters-date` (1386), `i-probate-case` (1389, required), `i-probate-deadline` (1390), `i-gate-706` (1405), `i-gate-dispute` (1413), `i-gate-readout` (1420), **`i-docscope` (1427)**.

Consequences:
- **Estate Settlement is never asked who builds the inventory.** `saveIntake` reads the hidden element (7831) and takes the `'full'` default (`INTAKE_FIELD_DEFAULTS`, 8284), so every Estate Settlement is seeded and **priced at full documentation**. Project notes record full-vs-none as ~34% of the ticket on that service.
- **Permanent Strict Mode.** `gate706` is never answered, unknown counts as yes, `docLevelFloor` returns `formal` (29343). There is no `ec-gate-706`, `ec-gate-dispute` or `ec-doclevel` on Edit Client, so both gates are write-once at intake and **an Estate Settlement can never leave Strict Mode**.
- **A disabled control with an invisible reason.** `i-doclevel` (1549) is outside the block and so is visible; `onDocGateChange` disables it and pins it to Formal, while the explanation renders into `#i-gate-readout`, which is hidden.
- **No date of death.** `estateValueDate(job)` returns the §2032 alternate date or `job.deathDate`. On Estate Settlement that field does not exist, yet date-of-death FMV is the stated basis of every estate document.

### D2 — `docScope` has zero readers downstream of the contract
No occurrence of `docScope` / `estimateDocScope` anywhere between **11316 and 30559** — a span containing the entire Job Plan, the entire Inventory tab, the room workspace and the whole field-capture flow.

- `planTaskCtx` (26324) exposes `svc, isMM, isDownsizing, isCleanout, isEstate, isProbate, isDocJob, isDisposal, hasPlaybook, formal, hasCOC, firearms, re` — and not `docScope`. No `when` predicate can branch on it.
- Zero `docScope` references in `printCourtInventory` (20261), `printEstateInventoryReport` (19894), `printApprovalRequest` (20161), `printAppraisalWorklist` (20476), `printAsFoundRecord` (20661), `buildInventoryPayload` (22095), `exportInventoryCSV` (20014), `printInventorySnapshot` (19666), or anything in `apps-script/`.

The crew and the desk do byte-identical work at every scope, and every document is built as though the answer were always `full`.

### D3 — The Court Inventory is unissuable on a capture engagement
`printCourtInventory` computes `unvalued` as probate-schedule items with no value. On a capture job **every line is legitimately unvalued**, so it stamps DRAFT in red, prints *"Total recorded so far — not a complete total: $0"*, names items as "not yet valued", withholds the signature block, and promises *"a final copy is issued once the outstanding items are valued"* — a copy Havellin is not contracted to issue and never will.

### D4 — The Estate Inventory Report flags correct work as a defect
The valuation-source cell renders a red *"not stated"* when absent. On a capture engagement every line prints red.

### D5 — The contract names a deliverable that does not exist
`_agrProbateCompliance` capture arm (30592) promises counsel *"a photographed, room-by-room list of the property contents (description, location and condition)"*, and the client estimate promises the same (9186). **No such document exists.** Every inventory document carries an FMV column; `printAsFoundRecord` is the before-photo index, not a contents list.

### D6 — The desk checklist keys on service type, not scope
`JOB_ADMIN_TASKS` `ct_inventory` / `ct_appraisals` / `ct_nonprobate` / `ct_served` / `ct_filed` / `ct_accounting` all fire on `c.isProbate` alone (26313–26320). A probate job priced at `capture` or `none` still tells the desk to verify date-of-death FMV and attach appraisals the contract says are counsel's. Conversely an **Estate Settlement at `full` scope gets no compliance checklist at all.**

### D7 — Every estate document is offered on every job
`populateInventorySelect` filters nothing and the document button strip (~21719) is ungated by service or scope. A Home Editing or Home Prep job is offered a §733.604 Court Inventory.

### D8 — Strict Mode's headline promise is prose only
`invListingThreshold` (29436) has exactly one reader: `docStandardEffect` (29443), a sentence builder. Nothing **enforces** an itemisation floor.

⚠ **CORRECTED 2026-09-22 — the sentence above said "enforces or displays", and it DID display it.** `docStandardEffect` renders into `#i-gate-readout` and `#ec-gate-readout`, so the floor was on the intake form and in Edit Client the whole time. That is what made it worth closing rather than leaving: the app was not silently carrying an unused constant, it was telling a concierge, in amber, that a rule applied which nothing applied. `isFormalDoc`'s real readers are the client estimate's `deep` copy (8966, 9285), `printCourtInventory`'s appraisal-draft gate (20266), line 21236, and `planTaskCtx.formal` (26334).

### D9 — Trust administration is absent, and where Trust is load-bearing it fails
"trustee" appears four times in 33,000 lines, all cosmetic (1350, 5473, 13825, 32657); `executorRole` is display-only. Zero occurrences of Rule 5.340, chapter 736, §736.0813, §736.08135, "trust accounting" or "successor trustee".

`_invOnProbateSchedule` is `Probate || Exempt`. On a pure trust administration every item is Trust-track, so both sections of `printCourtInventory` render empty, total `$0`, `unvalued.length` is 0, `draft` is false — and the document prints a **green FINAL stamp with a signature block reading "Reviewed and adopted by … Personal Representative / authorized fiduciary" over an empty $0 schedule.**

There is no trust service type (a trust books as `cleanout`), no intake question distinguishing probate from trust, no trust clause in either agreement, and `assetTrack` defaults to `Probate` with no bulk control.

### D10 — The estate agreement asserts probate compliance on non-probate matters
`_agrProbateCompliance` is emitted ungated: it prints "Florida Probate Compliance", §733.604 and a 60-day Letters deadline even on Estate Settlement.

---

## 4. What is genuinely missing

Nothing records **what the client asked Havellin to produce**. `docScope` answers *how much of the work do we do*, not *what are we contracted to hand over*. And there is no matter-type axis at all — probate and trust are not mutually exclusive on one estate, and intake never asks.

---

## 5. Decisions taken (Anthony, 2026-09-21)

| # | Question | Decision |
|---|---|---|
| 1 | Menu shape | **One closed tier menu**, picked at intake; `docScope` derived from it so pricing is untouched and nothing can drift |
| 2 | Trust work | **Delivery variant, not a new product.** We feed the trustee's accounting and never produce it |
| 3 | Unknown at intake | **Refuse to price until answered.** Build Estimate will not save or submit without it |
| 4 | Sequencing | **Defects first, then the menu.** Each ships tested, revert-verified and documented |

### 5a. On decision 2 — is date of death different from current value?

**No. On Havellin's jobs they are the same number, and date of death is the one to record.**

At death, tangible personal property is valued at date-of-death fair market value. That one number does three jobs: it sets the beneficiaries' stepped-up basis under IRC §1014, it is the Form 706 figure if one is filed, and it becomes the **carrying value** the trust opens its first accounting with. A §736.08135 accounting shows carrying value *and* estimated current value; for assets received from a decedent the carrying value **is** the date-of-death value. Havellin is not producing a different number for a trust, it is producing the input the accounting starts from.

The §1014 step-up applies to revocable trust assets too — they sit in the gross estate — so a successor trustee needs date-of-death FMV for the same reasons a PR does.

They diverge only where there was no death (an irrevocable trust funded years ago) or where a trust held the contents for years before engagement. On a cleanout the contents are gone within months.

**Rule: the valuation date is driven by whether somebody died, not by probate vs trust.** The app already models this correctly in `estateValueDate`. The defect is D1 — date of death is hidden on the service where most trust work will land.

**What actually differs for a trust matter** is four things, none of them the number:
1. The carve-out is backwards — `_invOnProbateSchedule` deletes the whole estate (D9).
2. The citation and framing — Chapter 736, "schedule of tangible personal property held by the trust", not §733.604 "court inventory".
3. Who signs — a successor trustee accepting a schedule, not a PR adopting a court filing.
4. A line on the face stating it is prepared to support the trustee's accounting and **is not itself a §736.08135 accounting**. Same "state the gap" rule the Court Inventory already follows, and what keeps Havellin out of fiduciary accounting work.

**Priority consequence.** Anthony: *"most homes will be in trust… the probate cases will be more rare if we stick to our upmarket business plan."* The app is built probate-first — the intake block, the desk checklist, the Court Inventory and the agreement's compliance section all key on `isProbate`. If upmarket means trust-held, **the common case is the one with no path through the app.** The trust variant is the main line, not an edge case.

---

## 6. The model

Two required fields on decedent jobs, each answering a genuinely different question, neither derivable from the other.

**A. Engagement tier** — what we are contracted to hand over. Drives `docScope`, the job plan tasks and which documents are offered.

| Tier | We produce | They produce | Derives |
|---|---|---|---|
| Contents list | Photographed room-by-room list: description, location, condition. No values. | Valuation, any appraisal, the filing | `capture` |
| Inventory with values | The above plus estimated FMV at the valuation date, with basis stated | The filing | `full` |
| Inventory + appraisals | The above plus specialist appraisal coordination and attached reports | The filing | `full`, forces Strict Mode floor |
| None | Sorting, staging and set-aside against counsel's schedule | The whole inventory | `none` |

**B. Matter type** — which instrument the work feeds. Drives document shape, citations and the signature block.

`probate` (Rule 5.340 / §733.604) · `trust` (Ch. 736, feeds the trustee's accounting) · `both` (pour-over will — some assets probate through into the trust) · `neither` (family distribution, no court and no trust)

**Why two fields and not one menu of combinations.** Because valuation is identical across probate and trust (§5a), the tiers do not need probate and trust variants — that would double the menu for no behavioural difference. Depth and instrument are orthogonal and both are needed.

---

## 7. Build order

Forced order. Each is a separate commit, tested, revert-verified, with a manual and playbook pass where user-facing wording changes.

1. ~~**Split the intake block.**~~ **DONE 2026-09-21.** Date of death, the 706 gate, the dispute gate, the scope question **and the estate attorney** moved out of `#probate-fields` into `#estate-fields`, shown on all three decedent services; case number, Letters, the §733.604 deadline and the sale question stay probate-only. Edit Client gained `ec-date-of-death`, `ec-gate-706`, `ec-gate-dispute` and the attorney, so Strict Mode is no longer a one-way door. Date of death is now required on all three; the attorney is required on probate and offered on an Estate Settlement. ⚠ The attorney was NOT in the original scope of this step and was added on measuring `planDerivedLines`' `attorney_on_file` line, which fires on `isDocJob` — Estate Settlement included — and told the reader *“not recorded — Edit Client”* on a service where Edit Client had never offered the field. *Closes D1.*
2. ~~**Add matter type** at intake and Edit Client, required on decedent jobs.~~ **DONE 2026-09-21.** `MATTER_TYPES` (probate / trust / both / neither) with `matterTypeOf` and `matterDef`; required at intake on all three decedent services, **deliberately without a default** — an unanswered one resolves to `''` and every reader treats that as unanswered rather than as probate, so no job recorded before today acquires a claim nobody made. Edit Client carries it and discards a value it does not recognise.
   ⚠ **It shipped with readers rather than as a dead field**, and measuring D9 first is what found the worse half of it: the Court Inventory stamped **FINAL** in green over a **$0** total with a signature block, on a seeded estate holding **$19,000** of furniture, whenever every line was tracked Trust — and identically for Non-probate and Homestead. So an empty schedule now reports DRAFT and withholds the signature block (**no field needed, so every existing job is covered**), and a matter recorded `trust` or `neither` says on its face, above the table, that a §733.604 schedule is the wrong instrument. `both` is not refused — the probate half is real. *Closes the signable half of D9; the trustee's schedule itself is still step 7.*
   ⚠ **NOT done, and it is step 6/7's to take:** `_invTrack` still defaults every unset item to `'Probate'`, so on a trust matter every line silently claims to be probate property until somebody sets it by hand. Making the default follow the matter type is a one-function change with about ten call sites — **and it must not ship before the trust schedule exists**, or a trust matter's contents move from the wrong schedule onto no schedule at all.
3. ~~**Add the engagement tier**, derive `docScope` from it, migrate the three existing values.~~ **DONE 2026-09-21.** `DOC_TIERS` — *Contents list* / *Inventory with values* / *Inventory + appraisals* / *None* — with `docTierOf`, `docTierDef` and `docTierScope`. The tier is what the agreement promises; `docScope` is its **pricing projection**, mirrored onto the job so the twenty-odd readers of the scope did not have to be repointed in one commit. **Pricing is byte-identical**: driven through the real `computeEngineV3`, each tier produces exactly the `byStep` its scope always did (measured PS hours 112 / 93 / 73 for full / capture / none). Built from one catalogue at load and read by both forms, so a tier cannot be renamed on one and not the other.
   ⚠ **Four tiers onto three scopes, and the 4→3 is deliberate.** The top two price the same today — appraiser coordination already sits inside the `document` step's coordination column and nothing prices it separately. What they do not share is the documentation **standard**: `appraisals` raises the `docLevelFloor` to `formal`, which is the machinery it is named after (red guardrail, mandatory chain of custody, the court-grade records list on the client estimate, and the Court Inventory and Trust Schedule held at DRAFT until every flagged item is appraised or waived — the $100 listing floor that used to be named here was retired in step 9). If appraisal coordination is ever priced on its own, that is where the split goes.
   ⚠ **The migration is a READ, and `full` maps to `values` rather than `appraisals`.** Mapping every existing job onto the top tier would have put all of them into Strict Mode silently, on jobs already priced and papered. A read-time derivation covers every device with nothing to run.
   ⚠ **The tier has no default and intake does not refuse a blank**, deliberately — on the first call the attorney may genuinely not have decided, and a guess printed onto an agreement is worse than a blank. **Step 8 is what turns that into a gate**, at the estimate, where the cost of the answer is actually incurred. Both documents say it must be answered before the agreement goes out.
   ⚠ **The floor reason is LAST in `docLevelFloorReason`'s chain**, under contested / dispute / 706. Those three are facts about the matter; this one is a contractual choice, and when both apply the reader wants the fact they cannot change. *Closes the §4 gap.*
4. ~~**Wire scope into `planTaskCtx`** and re-key the `ct_*` desk tasks off tier and matter type instead of `isProbate`.~~ **DONE 2026-09-21.** `planTaskCtx` carries both contract axes — `tier` / `weInventory` / `weValue` / `weAppraise` off a new `produces` block on each `DOC_TIERS` entry, and `matter` / `probateTrack` / `trustTrack` off `MATTER_TYPES` — beside the thirteen service questions, which are untouched because each is correct *as* a service question. All seven `ct_*` boxes and `pr_authority` re-keyed. *Closes D2 (job plan) and D6.*
   ⚠ **Measured before it was changed, and D6 understates it.** Tier and matter type changed **nothing** across all twenty combinations on every one of the seven services. An Estate Settlement got **5** desk boxes and no compliance list whatever it was contracted for; Probate and Contested got all **12**, so a probate estate contracted at `None` — where the agreement says counsel does the whole inventory — was told to verify date-of-death FMV on every line and attach the appraisals. Now: Estate Settlement on a probate matter **9–12 by tier**, probate on a trust matter **5**.
   ⚠ **`produces` IS ON THE CATALOGUE, NEVER DERIVED FROM `scope`.** The two top tiers prove it cannot be derived: identical `scope`, different deliverable. Keying a deliverable check off the pricing projection would collapse the two axes step 3 exists to separate; a test `lacks()` `.scope` in `docTierProduces`.
   ⚠ **`probateTrack` FALLS BACK TO THE SERVICE AND `trustTrack` DOES NOT.** A recorded matter decides; an unanswered one on a probate *service* still means a court case was open at intake, so every job created before step 2 keeps its checklist rather than losing it silently. Nothing in a service name says trust, so there is no honest fallback that way. The one legacy change is `ct_appraisals`: a job carrying only `docScope` migrates to `values`, which does not make appraisals ours — **11 boxes, not 12** — and it returns the moment an appraiser is on the roster.
   ⚠ **A TRUST MATTER GETS NO COURT LIST, AND THAT IS NOT AN OMISSION — it is step 7's.** The trustee's schedule those boxes would verify does not exist, and a checklist against a document nothing can produce is the box people learn to tick blind. What *is* built is the pair of derived lines that stop an empty court section being ambiguous: **Matter type recorded** and **Contracted to produce**, on a new `admin` phase so they render on the desk card and not on the Job Plan's Close-out stage.
   ⚠ **`ctx.matter` AND `ctx.tier` CAME BACK GREEN ON THE FIRST REVERT SWEEP** — two fields with no reader, which is the thing to fix rather than to cover. Those two derived lines are the fix; re-done, they fail 2 and 4.
5. ~~**Build the contents-list document** the capture contract already promises.~~ **DONE 2026-09-21** — `contentsList` / `printContentsList`, room-first in walkthrough order, description · location · condition and **no value in any form**. It is the primary button on an estate contracted at `contents`. *Closes D5.*
6. ~~**Make the documents scope-aware and gate the strip** by service, tier and matter type.~~ **DONE 2026-09-21** — `invDocContractBlock(job, kind)`, one predicate read by the strip AND by the printer, so neither can be reached around the other. It gates exactly two documents — the **Estate Inventory Report** and the **Court Inventory**, both of which state a value on every line and so need `produces.values`. The primary follows the tier: *contents* → Contents List, *values* / *appraisals* → Estate Inventory PDF, **none → Approval Request**, which is the defect it closes — at `none` the agreement says counsel does the whole inventory and the primary button handed over a page headed *Estate Inventory — Asset Schedule*. *Closes D2 (documents), D3, D4, D7.*
   ⚠ **Measured first: nine of eleven inventory printers read neither the tier nor the matter type.** At `contents` the Court Inventory stamped DRAFT, called correct work *"not yet valued"* and promised a final copy Havellin will never issue; the Estate Inventory Report printed **not stated** in red on 2 of 2 lines.
   ⚠ **The MATTER axis is deliberately NOT gated, and D7 does not ask for it.** D7’s own text is about the SERVICE axis, closed on 2026-09-21 by the `fid` gate. On a trust matter the Court Inventory still renders and refuses on its own face (step 2), which answers the question a withheld button would leave hanging. Do not "finish" this by hiding it.
   ⚠ **Everything else stays on the strip at every tier** — Approval Request, Disposition Ledger, As-Found Record, CSV, Snapshot, and the **Appraisal Worklist**, because the capture agreement says Havellin gives the appraiser access and attends on request, so the per-specialist packet is what we hand the appraiser counsel engaged.
   ⚠ **And each DRAFT reason now carries its own fix.** One constant sentence (*"a final copy is issued once the outstanding items are valued"*) was glued onto all four reasons and was wrong in three: an empty probate schedule is fixed by the Asset Track, a trust matter gets no final copy at all, and a pending appraisal at the `values` tier is counsel’s to arrange.
7. ~~**Trust schedule variant** — carve-out, citations, signature block, the not-an-accounting line. Gate `_agrProbateCompliance` on matter type.~~ **DONE 2026-09-21.** `printTrustSchedule` is the Chapter 736 instrument a trust matter actually gets, and `_invTrack`'s default now follows the matter type — the two ship together because neither is worth much alone. *Closes D9, D10.*
   ⚠⚠ **Measured in both directions before anything was built, and the dead end ran BOTH ways.** On a seeded trust estate holding **$19,000** of furniture: leave every line on the default track and the Court Inventory lists the whole house on a §733.604 schedule for a proceeding that does not exist; set the track to Trust — the right answer, and the one both documents told you to give — and the Court Inventory correctly refuses, totals **$0**, and **nothing anywhere lists the property at all**. There was no third answer. `chapter 736`, `Rule 5.340` and `736.08135` had **0 live occurrences** in 33,000 lines.
   ⚠⚠ **THE CARVE-OUT IS ONE TRACK, NOT THE NEGATION OF THE PROBATE TEST**, and reaching for `!` is the mistake to avoid. Non-probate property passes by beneficiary designation or joint tenancy straight to the named beneficiary, never to the trustee; Florida homestead passes to the heirs outside both. Neither is the trust's. So the two schedules are **not complementary** — together they do not cover everything, deliberately — and each names what it left out.
   ⚠⚠ **THE NOT-AN-ACCOUNTING LINE NAMES WHAT A §736.08135 ACCOUNTING CONTAINS THAT THIS DOES NOT** — receipts, disbursements, gains and losses on sale, and the identification of beneficiaries — rather than merely disclaiming. A bare disclaimer is a sentence somebody skims; a list is something a reader can check, and it is the same *state the gap* rule the Court Inventory already follows on an unvalued line. It is on the document's face **and** in the agreement, because the engagement is what a trustee's counsel reads when they ask what Havellin was retained to do.
   ⚠ **THE NUMBER IS DELIBERATELY THE SAME AS THE PROBATE SCHEDULE'S** — §5a, unchanged. Date-of-death FMV is the §1014 stepped-up basis, the Form 706 figure and the carrying value a trust's first accounting opens with, and the step-up reaches revocable trust assets. **Do not add a trust valuation date.** The table is `_invScheduleSection`, extracted and shared with the probate schedule rather than copied.
   ⚠ **ONLY AN EXPLICIT `trust` MOVES THE TRACK DEFAULT.** `both` keeps `Probate` because a pour-over will's whole function is that anything not already titled into the trust pours in THROUGH probate; `neither` and an unanswered matter keep it too, so no job recorded before today moves. **The job is an ARGUMENT and `ref.jobId` only looks available** — it is not on the `savePhotoRefs` whitelist, so a version resolving the job off the ref passes every fixture that sets it by hand and answers `Probate` on every real reload.
   ⚠ **D10 WAS WORSE THAN ITS OWN TEXT.** `_agrProbateCompliance` read `docScope` and nothing else, so a trust matter signed a contract headed *Florida Probate Compliance* promising a §733.604 inventory and appraisals *"within the 60-day inventory deadline from Letters of Administration issuance"* — there are no Letters on a trust administration. The heading, the lead, every clause, the §5.1 representations, the §5.3 authorisation table and §2's scope paragraph all follow the matter type now; **the probate arm is byte-identical to an unanswered one**, which is what protects every agreement papered before the field existed.
   ⚠ **The §736.08135 carrying-value mechanics were read through secondary summaries** (§8) — the operative wording of this document and of the agreement's trust arm goes to counsel with the rest of the agreement language before a real trust matter signs.
8. **Gate the estimate** so Build Estimate will not price until tier and matter type are answered. *Decision 3.*
9. ~~**Either implement or retire `invListingThreshold`.**~~ **DONE 2026-09-22 — RETIRED.** The function and both constants (`INV_LISTING_THRESHOLD_STRICT` 100, `INV_LISTING_THRESHOLD_STANDARD` 1000) are deleted, and `docStandardEffect` now names what the level genuinely gates. *Closes D8.*
   ⚠⚠ **THE SENTENCE WAS WRONG IN BOTH HALVES, NOT ONE — driven on the real gate chain before anything was changed.** The listing floor was the only figure that moved with the level (`$1,000` → `$100`) and it was enforced by nothing; the specialist figure is real and enforced but is moved by the **dispute gate**, not by the level — **$3,000 on a Strict estate and $3,000 on a Standard one**, identical across the commonest level change there is. So the amber box whose entire job is explaining a forced level explained it with one fiction and one number the level is not responsible for, and its own comment claimed these were *"the only two numbers it moves"*.
   ⚠⚠ **IMPLEMENTING IT WAS NOT A RENDERING CHANGE, WHICH IS WHY RETIRING WAS THE ANSWER.** `_invScheduleSection` groups on the row's own `qty`, set at import time (itemise-or-lot), and a lot row carries ONE name, ONE value and ONE quantity — there is **no per-article data inside it** for a threshold to split. Any real floor is therefore a **capture-time gate on the inventory desk** (refuse or flag a lot line above it, while somebody is still there to split it). §8 records that Florida sets no statutory itemisation floor, so nothing external forces one.

9b. **The grouping cap — §20.2031-6(a), built 2026-09-22 the same day, on Anthony's *“those rules were arbitrary, figure this out and fix it”*.** Retiring an arbitrary figure leaves a hole, and there was a real rule in it: `INV_LOT_ARTICLE_CAP` / `invLotSplitState` / `_lotSplitWorklistBlock` / `_impLotHintHtml`.
   ⚠⚠ **IT SHARES ONE NUMBER WITH THE RETIRED PAIR AND NOTHING ELSE, AND THAT DISTINCTION IS THE WHOLE POINT.** The retired pair was a Havellin house rule keyed on the DOCUMENTATION LEVEL, enforced by nothing, with the $1,000 tier sourced from nowhere at all. This is federal, citable, carries its own number, and governs exactly one thing — what may be GROUPED on a schedule filed **with a Form 706**. So it is gated on `maivFilingApplies`, **the same gate the aggregate in (b) reads**: one regulation, two subsections, one gate, both blocks on one page of the Appraisal Worklist. **The $1,000 must never return in any form.**
   ⚠⚠ **TESTED AT CAPTURE, WHICH IS THE ONLY PLACE IT CAN BE.** The live readout sits in the import panel under each collection, where the *Keep as lot / Itemize* selector is one tap from the number and the quantity box re-reads it live. A **Lots to split** chip on the desk and a block on the worklist catch anything committed another way. It **flags and never refuses** — at import the value is a walkthrough estimate and the count is often a guess.
   ⚠ **THREE ANSWERS, NOT TWO.** `'' | 'over' | 'unvalued'`, for the reason (b) keeps `settled`: an unvalued lot has not passed the test, it has not been GIVEN one, and reporting it as clear reads as a clearance. Exactly $100 an article is INSIDE the cap — the reg says *in excess of*.
   ⚠ **THE PER-ARTICLE FIGURE IS AN AVERAGE AND EVERY SURFACE SAYS SO.** FMV on a manifest line is the LINE TOTAL, so the implied article value is the total over the count. Thirty forks and one candlestick can average under the cap with the candlestick over it; it is the only figure a grouped line can support, and an average *above* the cap is a certainty that something inside is above it.
   ⚠ **A BLANK QUANTITY BOX IS NOT A QUANTITY OF ONE** — found by the test, not by reading. On the first paint the input does not exist yet and mid-edit it is empty for a keystroke; reading 1 there reports a single article, which is never flagged. It falls back to the panel's own default.
   ⚠ **THE WORDING IS NOT VERIFIED AGAINST A PRIMARY SOURCE** — ecfr.gov and law.cornell.edu are both blocked by the egress proxy, as §8 already records for §736.08135. The *$100 an article* reading is what ships; confirm the article-versus-lot-total reading with counsel before a real 706 estate relies on it. It rides the review bundle.
   ⚠ **FOUND ON THE WAY: `clientJobPlanSection` DECLARED A `deep` LOCAL AND NEVER READ IT.** So `isFormalDoc` had **four** live readers, not five, and D8's own list counted the dead one. Deleted, and a test pins its absence — the replacement sentence must not claim the client Job Plan section deepens when it does not.
   ⚠ **ONE NUMBER, ONE PLACE.** `docLevelFloorReason`'s dispute arm quoted the specialist threshold as well, so it appeared **twice in one alert**; its `appraisals` arm restated *"held … until it is appraised or waived"*, which the effect now says. Both trimmed: the reason says WHY the floor is set, the effect says what it does.
   ⚠ **CONTESTED PROBATE HAS NO RECORDED DISPUTE.** `gateDispute` is true on the service key alone, so the first draft's flat *"the recorded dispute is what lowers that"* was false on the one matter type whose reader is most likely to be counsel. It names the contest there instead.
   ⚠ **THE CLAIM HAD REACHED FOUR DOCUMENTS**, and the playbook's was the worst of the six sites: *"Strict Mode lists items individually above $100 instead of $1,000, so it is a lot more manifest work"* — told to a concierge as the reason to chase an attorney over a workload that does not exist. All six corrected, and the net is a rule rather than today's names: no live line anywhere in the file may quote an itemisation floor in any wording.

**Steps 1 to 9 shipped 2026-09-21 / 2026-09-22. The build order in this section is complete.** Step 8 gated the estimate — and *"two fields that already exist"* was wrong in the interesting direction: the fields existed and **the record was manufacturing an answer for them**, so the gate could not have fired on any job the app had ever created. Step 9 retired `invListingThreshold` and corrected the sentence that was its only reader; **9b then put the real rule where the arbitrary one had been**, which is the shape to copy the next time a house figure is found masquerading as a standard — retire the fiction, then go and find whether anything genuine was underneath it.

**What remains open is §8 — the legal flags, which are counsel's rather than a build:** Fla. Prob. R. 5.340 alongside §733.604, §733.604(3) cited nowhere, and the §736.08135 carrying-value mechanics read through secondary summaries because the egress proxy blocked the primary sources.

---

## 8. Open items and legal flags

✓ **COLLECTED 2026-09-22 into `COUNSEL_REVIEW_BUNDLE.md`**, with every other legal flag this project has deferred — the agreements, the firearms protocol and the filing rules — prioritised by what each one blocks. The items below are items **D1–D5** there. Nothing has been sent; the bundle is a document ready to forward.

⚠ **Primary sources were unreachable.** The egress proxy blocked leg.state.fl.us, flsenate.gov and law.justia.com during this pass; the Florida statements below were read through secondary summaries. The IRC §1014 step-up and date-of-death valuation are well settled. **Confirm with an estate attorney before any of this ships in client-facing wording:**

- Fla. Prob. R. 5.340 and Fla. Stat. §733.604 are two live instruments covering the same inventory. The app cites only §733.604. Citing both is more complete.
- The standard is "reasonable detail" plus estimated FMV at date of death. **Florida sets no statutory itemisation floor.** ✓ **CLOSED 2026-09-22.** The $100 / $1,000 house pair was retired (step 9) and the **federal** rule that genuinely exists was built in its place (step 9b): §20.2031-6(a), gated on the 706 answer and never on the documentation level, so nothing in the app now presents a Havellin preference as a legal standard. ⚠ **Still for counsel:** whether (a) reads *no article in excess of $100* (what the app implements) or *total value not exceeding $100*. The two differ on any lot of many cheap articles, and ecfr.gov and law.cornell.edu are both blocked from this environment.
- **§733.604(3)** gives a beneficiary the right to a written explanation of how each inventory value was determined. This is the statutory hook that makes a stated valuation basis a sellable deliverable rather than a nicety. The app has the field and cites this nowhere.
- Florida does not require a licensed appraiser to value tangible personal property; it permits one.
- §736.08135 carrying-value mechanics — confirm before the trust schedule's wording is fixed.
- Treas. Reg. §20.2031-6(b) — already implemented as the MAIV aggregate. §20.2031-6(a) is implemented as of 2026-09-22 (step 9b), under the same gate. ⚠ An earlier note in this file and in the app said (a) was "actually implemented" **by** the aggregate; that was wrong — (b) is a different subsection asking a different question, and (a) was implemented nowhere at all.

**Decided — Havellin states values, and that is the product (Anthony, 2026-09-21):** *“why wouldn't we want a valuation figure? agent 2 is supposed to take care of that.”* An earlier draft of this section asked whether Havellin ever wants its own figure on a document a court reads. That was the wrong question and it is struck: at the `Inventory with values` tier the figure **is** the deliverable, Agent Two is the plan for producing it, and the agreement already promises it (`_agrProbateCompliance` full arm, 30593).

What survives of it is **attribution**, which is a different thing and is the half §733.604(3) actually reaches: Havellin's *estimated fair market value with a stated basis* is not a credentialed appraiser's signed opinion, and every document has to say which of the two it is carrying. The app already has the fields for it — `valSource`, `valNote` (Valuation Basis / Comps) and the appraiser link — and the §733.604(3) right to a written explanation of how each value was determined is the reason to fill them in, not a reason to withhold the value.
