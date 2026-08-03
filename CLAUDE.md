# Havellin Palm Beach — App Notes

## Always on every commit
- Update the version timestamp in `havellin.html` line ~247:
  `2026.MM.DD · H:MMpm ET`
  Use the current date and approximate ET time.
  Format: `YYYY.MM.DD · H:MMpm ET`
- **READ THE CLOCK — do not increment the stamp you found in the file.** The container runs
  UTC, so get ET with `TZ=America/New_York date '+%Y.%m.%d · %-I:%M%P ET'` and paste that.
  On 2026-08-03 five commits shipped with invented times (7:05pm → 11:05pm) against a real
  4:17pm, because the stamp already in the file was treated as a counter to bump. The point
  of the stamp is telling which build is on the phone; a made-up time makes it useless and
  a stamp in the future makes it actively misleading.

## Git identity — set this at the start of every session
```
git config user.email noreply@anthropic.com && git config user.name Claude
```
Do NOT pass `--author` on commits — let the repo config set both author and committer.
If the stop hook fires anyway, run `git commit --amend --no-edit --reset-author` and force-push.

## Branches
- Active feature branch: `claude/photo-sync-google-drive-69ykub`
  (was `claude/master-suite-cleaning-hours-g62ink`, then
  `claude/home-prep-sale-consolidation-13yxt9`; before that
  `claude/field-app-formatting-9eu5ff` and `claude/zen-ride-v4x393`, deleted from the
  remote — don't chase either.)
- Push to `main` after every commit so GitHub Pages stays current:
  `git push origin claude/photo-sync-google-drive-69ykub:main`
- Keep the feature branch in sync with main after each push.
- **A session may be assigned its own branch, and that assignment wins over the name
  above.** Push to the assigned branch AND to `main` — Pages serves `main`, so skipping
  it means the phone keeps showing the old build no matter what was committed. Then
  update the name above in the same commit, or the next session works off a dead ref.
  Note that pushing the same commit to both leaves nothing for a PR to diff.

## App
- Single-file app: `havellin.html` — all CSS, JS, HTML in one file
- Hosted on GitHub Pages from `main` branch
- No build process

## Writing client-facing copy — the standing rule (Anthony, 2026-08-03)
**If a line explains something the reader can already see, or explains why something is
*not* there, it is costing you rather than earning.** Cut it. This applies to the client
estimate, the invoice, both agreements, and any client document built later. Default to
cutting; do not wait to be told.
- Anthony removed four separate things in a row on 2026-08-03, and they are all the same
  mistake. Keep them as the worked examples:
  - **The italic preamble** under *How The Work Runs* explaining that we have deliberately
    not put dates against the stages. **Explaining an absence is what draws attention to
    it** — a client reading a gated sequence with a *Complete when* on every stage does not
    ask why there is no calendar.
  - **"No fixed-price contingency is applied"** on a T&M estimate — describing something the
    document never offered.
  - **The second billing caveat.** "Final charges reflect actual hours worked" and "billed on
    actual logged Transition Concierge and Property Specialist hours" is ONE fact in two
    stacked boxes, directly beneath a table of hours.
  - **Column header rows** reading *Collection / Item* over a list of collections, under a
    band already headed *Notable Collections*. Two header bars for a two-column table.
- The same instinct killed the three trailing sections after the numbered stages: content
  that restates, after the fact, what the sequence already said reads as an appendix.
- **The test to apply:** would a reader who skipped this line be missing anything? If the
  answer is no — because the table above it, the heading over it, or the absence itself
  already told them — it goes.
- **What this is NOT licence to cut:** anything stated once that a client would otherwise
  have to ask for. The 15% notify threshold, the at-cost/no-markup statement, the
  hour-by-hour court record, the *Complete when* gates. Those each appear exactly once and
  each answer a real question. Terseness is the goal, not thinness.

## Concierge job playbook (`concierge-guide.html` / `CONCIERGE_GUIDE.md`) — NEW 2026-08-02
- **A second, separate document. It does NOT replace `manual.html` and nothing was removed from
  the manual to make it.** The manual is the system-of-record reference (setup, Apps Script
  URLs, folder IDs, engine formulas, vendor taxonomy, interface/architecture notes). The
  playbook is the TC-facing *how do I run a job* document — chronological, one job from intake
  to final invoice, written for Anthony and Ashley walking dummy clients end to end.
- **The dividing line, and keep it:** the playbook says what to press and what the app will
  refuse; the manual says how it works and how it is configured. If you find yourself writing
  "α" or an Apps Script URL into the playbook, it belongs in the manual instead.
- Structure is Step 1..13 + Home Prep short version + a quick reference (billing rates, PIN
  list, margin panel framing) + a **"If something won't let you proceed"** symptom→cause table.
  That last table is the highest-value part for a dry run — keep it current with the gates.
- `CONCIERGE_GUIDE.md` is GENERATED from `concierge-guide.html` by the same style of converter
  as `MANUAL.md` (scratchpad, not the repo). Regenerate in the same commit as any edit.
- It adds one class the manual doesn't have: `.stop` (red left border) for the hard gates,
  rendering as `> **⚠**` in markdown. Print/phone rules are copied from `manual.html` verbatim
  and carry the same reasoning — the phone block stays scoped to `screen` or printed tables
  silently lose their right-hand column.
- **Both documents drift together.** Any app change that triggers a manual reconciliation pass
  triggers a playbook pass too, and the playbook is the one that goes stale more dangerously —
  a wrong manual entry misinforms, a wrong playbook step strands somebody mid-job.

## NOT "licensed" — insured & bonded only (CORRECTED 2026-08-03)
**Anthony: "we are not 'licensed', only 'bonded & insured'."** Every client document was
claiming a licence Havellin does not hold. Fixed on all four — client estimate footer,
invoice footer, standard agreement footer, probate agreement footer — plus the Terms line
(*"Havellin Palm Beach is insured and bonded."*).
- **The first sweep missed two of the four.** The agreement footers build the string
  differently, so a grep on the estimate's phrasing came back clean while
  `renderAgreement`/`renderProbateAgreement` still said it. A test asserting the claim
  appears **nowhere in the file** is what caught them. Keep that test.
- **A third party's licence is a different thing and must survive** — *Licensed FFL* on the
  firearms disposition list, the vendor directory's *License / cert* field, "licensed
  firearms transfer" in the collections cost note. Those are about vendors, not us.
- Compliance-adjacent, not styling: if this ever needs revisiting, it needs Anthony, not a
  judgement call.

## Header rows: even columns, justified ends (2026-08-03)
- Header rows run **even columns** (`repeat(N,minmax(0,1fr))`) and **justify their ends** —
  `.ce-hdr-row>*:last-child:not(:first-child){text-align:right;}`. Uneven `fr` weights left
  the last value floating short of the right margin, a ragged edge on a document whose job
  is to look considered. **The `:not(:first-child)` guard matters**: without it a one-cell
  row (`ce-hdr-row-3`, the contact line) gets right-aligned.
- **Service moved onto the Authorized Representative row** and **Date of Death onto the dates
  row**, where a date belongs. That removed a whole row and a divider that existed to carry
  one short value. Dates row is `ce-hdr-row-5` when a date of death exists, `-4` otherwise.
- **Rep Email lost its inline `font-size:11px`** — it was squeezing into a narrow column and
  read visibly smaller than every value beside it. Even columns plus `overflow-wrap` make it
  unnecessary.
- Phone collapses all of them to two columns AND resets the right-alignment (with two
  columns the second cell is the last child, and right-flinging it looks broken).
  **`@media print` re-asserts the full grids** — Chrome lays Letter out at ~739px, inside the
  820px phone breakpoint, so without that the printed estimate gets the phone layout.
- `ce-hdr-row-2` deleted as dead. `ce-hdr-row-1` survives — the INVOICE still uses it.

## "At cost" said twice on labels, not five times in prose (2026-08-03)
**Anthony, walking the estimate: "two more areas restating the same thing — billed at cost."**
It appeared FIVE times on one page. It now appears on the two subtotal labels and the two
grand-total lines — where a reader looking for a number actually is — and in full, once, in
**Terms**, which is where a commercial rule belongs.
- **Both vendor footnotes deleted.** `Estimated Third-Party Total` gained **(at cost)** to match
  `Est. Prep Vendor Total (at cost)`; the prep footnote now renders only its
  Service-Management-Fee sentence, and only while `SMF_PCT > 0` (it is 0 today).
- **The hour counts went with them** — *"…accounts for 18.0 of the Transition Concierge hours
  above"*. They were added as evidence for the no-fee claim, but the client's copy shows one
  combined concierge figure, so the number could never be checked against anything on the page.
  It invited a question rather than answering one. **The claim itself survives, in Terms.**
- **"No coordination fee" went too** — on a document with no coordination-fee line, that
  explains an absence.
- **A third-party duplicate found while doing this:** *"Includes N TC hrs for home prep vendor
  coordination"* sat under the **Moving Materials** heading while describing **home prep**, and
  the Home Prep section stated the same `prepTCHrs` figure four lines later. Misfiled and
  duplicated.
- The Packing & Disposition stage names the vendors but no longer restates the rule.
- 23 more checks (135 in this suite), including one asserting `(at cost)` appears exactly four
  times and only on labels.

## The stages now follow the ESTATE playbook, not the downsizing one (2026-08-03)
**Anthony: "in an estate settlement, there are no family members on site to make decisions… the
will dictates the disposition for items specified. this language is wrong for those types of
jobs."** He is right, and it was a correctness bug, not a wording preference. Stages 2 and 3
now branch on the job FAMILY.
- **What was wrong:** every service type got *"Decisions, room by room. This is the part of the
  job that sets the pace — we can work as fast as decisions are made"* and *"the retained list is
  confirmed with you in writing."* That is a **downsizing** job — a living owner standing in their
  own house. On an estate the owner is deceased, the representative is frequently an attorney or
  trust officer who is **not local and not on site**, and the **will** governs disposition rather
  than preference. The document described a job that was not happening.
- **Estate / probate stage 2 is now `Sorting, Documentation & Inventory`** — we CATALOGUE, and
  **nothing is sold, donated or removed at that stage at all**. Specific bequests named in the
  will are set aside and recorded separately; property that may be claimed exempt is flagged. The
  ask is the **will or trust up front** (before anything is handled, not after) plus the Letters,
  and it says plainly **"You do not need to be on site"** and **"we do not interpret the will"** —
  we are not counsel and must not read as if we are. Complete when the room is catalogued and the
  inventory has been **delivered to the representative and counsel**.
- **Estate / probate stage 3 is `Distribution & Disposition`** and opens with the gate:
  **nothing leaves the property until the representative has reviewed the inventory and authorised
  it in writing.** Bequests are released **against signed receipts** — on a court-supervised matter
  "we gave it to the daughter" is not a record. Where beneficiaries disagree we **hold and wait**;
  we do not arbitrate and **nothing goes out on a verbal request**.
- **Stage 1 had the same bug and it was corrected in the same pass.** It told the reader about
  *"who will be in **your home**"* and *"the decisions **you** will be asked to make in every
  room"* — addressed to an attorney or trust officer who does not live there and may never
  attend. The estate version now says **"We work for you"** plainly, and states that if family
  or beneficiaries are at the property we will be **courteous to everyone present but take
  direction from the representative alone**, and release nothing without their written
  authority. That is the sentence the representative actually wants to read.
- **CORRECTED MID-BUILD: do not ask the client for the will.** The first draft asked for "a copy
  of the will or trust". Havellin's own internal checklist asks for a **certified copy of the
  Letters**, and treats a will found in the house as something to **sequester and turn over to
  the PR/attorney against a signed receipt** — it never requests one. The client document now
  asks for the Letters plus **the list of items designated to a named person**, produced by the
  representative or counsel, and says outright *"we do not need the will itself"* and *"we do
  not read or interpret the will"*. **Havellin is not counsel and the document must never read
  as if it were.**
- **Downsizing keeps the decision-paced language, because there it is true**, and Home Cleanout
  keeps the simpler middle version. A test asserts *Decisions, room by room* appears on downsizing
  and on NEITHER estate nor probate.
- Close-Out no longer assumes the client attends the final walkthrough on an estate — it is often
  the attorney or a family member standing in, and the records do not depend on anyone attending.
- 25 checks on this alone (180 in the suite).

## Job Plan section folded into the stages — three trailing blocks DELETED (2026-08-03)
**Anthony: "everything below 4. Close-Out should be incorporated in the appropriate numbered
slot above. this is too much and reads awkwardly."** The section was six blocks; it is now
three — *How We Work · Spaces In Scope · How The Work Runs*. **Do not reintroduce a trailing
block after a numbered sequence** — it reads as an appendix restating what the stages said.
- **Vendors are named in the STAGE THEY APPEAR IN**, bucketed by what the trade does, not by
  what it costs: `/apprais|firearm|ffl|gemolog|numismat/` → the **sorting** stage (they value
  while contents are still in place), `/clean|paint|carpet|landscap|stag|repair|…/` → **close-out**
  (a cleaner cannot start until the house is empty), everything else → **disposition**. The old
  single roster put appraisers two stages late and the final clean two stages early on a
  document whose whole point is that we know the order. Tests assert the position of each.
- **Close-out was silently missing the finishing trades entirely** — a cleaning vendor appeared
  on the estimate and in no stage. Fixed here.
- *What You Receive* moved into Close-Out (that is when they receive it) as a `receive` field on
  the phase. *What We Need From You* was mostly a duplicate of each stage's own `need`; access
  and the multi-party ask folded into stage 1. The collections no-commission line moved to
  Disposition.
- **The Drive reference is gone** on instruction — "the complete job file, filed in a folder
  shared with you" became *the complete documentation package*. The client does not need our
  storage mechanism named.
- **The italic no-dates preamble is DELETED, also on instruction.** Explaining an absence is
  what draws attention to it. The no-dates RULE still holds and is still tested; if a client
  asks, the concierge has the answer in the playbook's symptom table.
- `proposedPlanRow` is now narrative-only — its four conditional notes and `andList` are gone,
  every one having a real home in a stage.
- 112 checks in this suite.

## New tagline + one-line estimate header (BUILT 2026-08-03)
- **Tagline is now "Havellin handles the work no family should face alone."** Replaces
  *Guiding Families Through Life's Transitions* on **all four client documents** — client
  estimate, invoice, standard agreement, probate agreement. It appears in three different
  source spellings (`’` escape, literal `’`, escaped `\'`), which is why a naive
  find-and-replace missed half of them; a test asserts **4 occurrences and zero survivors** of
  the old one. Check that count if it ever needs changing again.
- **The estimate header is one identity line:** `Job ID · Estate/Client · Property · Date`,
  in that order, under `.ce-ident-row` (`auto 1.3fr 1.7fr auto` — the two fixed-width strings
  take `auto`, the variable-length fields get the slack). It replaces a centred Job ID/Date
  strip plus a separate Estate/Property row — three lines and a lot of vertical space for four
  short facts, pushing the actual scope down the page.
  - **`isEstateJob` keys off `job.executor` being present, NOT the service type.** The label
    flips between *Estate* and *Client* on that, and a cleanout job with no rep recorded
    correctly reads *Client*. Don't "fix" it to test `svc`.
  - The non-estate branch lost its now-duplicated Client and Property cells and carries only
    Phone and Service.
- 12 more checks (110 in the job-plan suite).

## Client estimate: page breaks, band weight, no left rule (BUILT 2026-08-03)
Three presentation fixes on the new Job Plan section, all reported off a printed copy.
- **A half-blank page before *How The Work Runs*, and it was self-inflicted.** Every block in
  `clientJobPlanSection` carried `break-inside:avoid`, including the CONTAINER holding all five
  phases. Once that container outgrew the space left on the page it jumped to the next one
  whole, stranding half a sheet. **Same lesson as `manual.html`: keep `break-inside` on notes
  and tables, never on a list that can run longer than a page.** Now two styles — `BLOCK`
  (atomic, short fixed blocks) and `BLOCKB` (growable: spaces, phases, vendors, records, asks).
  The container may break; each repeated CHILD carries `ATOM`, so a break lands *between* two
  phases and never through one. Headings gained `break-after:avoid` so none is orphaned at a
  page foot. **Picking the wrong one of the two is a printing bug, not a styling preference.**
- **The bronze left rule is gone** — Anthony's call, it read as a quote bar on a document that
  is not quoting anything. Blocks are now plain with tighter vertical rhythm.
- **Band weight is now hierarchy.** `.ce-section-hdr` (dark) is **reserved for the two bands
  that state what the client pays** — *Total Estimated Project Cost* and *Payment Schedule*.
  Every other estimate section uses the new `.ce-band` (tan `#f7f4ee` + bronze), which matches
  the sub-headers already inside the fee tables. With every section wearing the dark band there
  was no hierarchy and the number the client needs to find carried no more weight than a vendor
  list. A test asserts **exactly two** dark bands on a fully-populated document. **The INVOICE
  is a separate surface and deliberately still uses the dark band throughout.**
- 22 more checks in the job-plan suite (99 total there, 205 across five suites).

## Tenure was a DOUBLE COUNT + fullness presets + honest room rows (BUILT 2026-08-03)
**Anthony ran a 3,500 sqft 4bed/3.5bath estate settlement, left every room at its default,
and got $27,000 / 9 days against a reference band of $8,000–$16,000 / 5–9 days.** Forensic
decomposition (harnesses in the session scratchpad) found three separate things.
- **THE DOUBLE COUNT, and Anthony spotted it himself.** `tenureMultiplier` (up to ×1.30)
  multiplied `interiorLoad` — so it was a SECOND measurement of the exact quantity the volume
  slider measures directly. The estimator is standing in the room scoring it, and
  `submitForApproval` refuses without a volume score on every room in scope, so the direct
  observation is **always** present and the proxy is **always** redundant. Worse, they
  compounded: an honestly-scored packed 35-year home got `1.70 × 1.30 = 2.21×`, so **the more
  accurately you recorded what you saw, the more the guess piled on top**. +$7,600 on a packed
  house, +$4,700 on this one.
  - **Tenure now scales the CONCIERGE column only** (`stepTC`), never the hands-on pool.
    Long tenure is real, but it is *decision friction* — thirty-five years of "we should keep
    this", more heir conversation — not more crew hours. A box packs at the same rate whether
    it sat there thirty-five years or three. **Do not put it back into `interiorLoad`.**
    A test asserts the crew pool is bit-identical at 5 yrs and 35 yrs.
- **Room rows understated themselves by 3.7×.** `perRoom[].work` carried `roomPS` — the `pack`
  step alone, 27% of the pool on an estate job. A 2-car garage displayed **2.4 PS** and booked
  **9.1 person-hours**. Nothing on screen let you feel a quote building as you ticked rooms,
  which is why this took a forensic exercise to find. Rows now carry their share of the WHOLE
  pool and reconcile to the fee lines once the walkthrough is complete — so there is no
  residual and no "room rows are packing only" caveat to remember. (That caveat is now wrong
  in `manual.html` §5b and the playbook — **both need a pass**.)
- **NEW `VOL_PRESETS` — one control for the whole house.** Seasonal · Light · Normal · Full ·
  Packed, as a chip row above the room grid. Telling the app "this place is packed" used to
  mean moving nineteen sliders by hand, so nobody did, and every house priced as average.
  - **A preset is a SHIFT on each room's own default, never a blanket value.** `ROOM_DEFAULTS`
    opens a foyer and a powder room at 1 because they are inherently lighter whatever the house
    is like; setting everything to 5 would say a powder room is as full as a garage. Tested:
    on *Packed* the foyer is still below the living room.
  - Applies to rooms **in scope** only, idempotent, re-bases from defaults rather than
    compounding, and any per-room edit afterwards stands until another preset is pressed.
  - **COMPLEXITY IS DELIBERATELY UNTOUCHED, and "premium estate → complexity 5" was CONSIDERED
    AND REJECTED.** Complexity moves a job **3.9%**; the premium toggle moves it **49.6%**
    (rates $150→$185 / $100→$125 plus 25 flat coordination hrs). Wiring them together adds a
    control you would never notice firing and collapses two different questions — "how careful"
    and "how expensive" — into one. Don't re-propose it.
  - `est.volPreset` round-trips so a reopened estimate lights the right chip; the room volumes
    are the real record.
- 34 checks on these three alone (183 across five suites).
- **STILL OPEN, and the honest state of the pricing:** at *Normal* this job is now $19,070
  against a $16,000 ceiling. **The engine still overshoots the bands at every sqft above
  ~3,000, even at neutral scoring** — one band bucket spans 2,000–4,000 sqft while the engine
  is linear across it ($10.4k → $20.8k), so a single band cannot track it at both ends. Also
  unresolved: `document` at 0.90 is 35% of crew hours and is blind to whether there is anything
  to document (this job had **no** collections); `Garage (2-car)` weighs 3.5, identical to the
  Kitchen; the full estate step-set including `document` is applied to a patio; and complexity
  never touches crew hours so "premium estate" cannot mean "handle everything slowly".

## Havellin Job Plan & Services — the estimate now states the METHOD (BUILT 2026-08-03)
**Anthony: "this is a big ticket item, twenty to a hundred thousand dollars, and I want a
detailed job plan that lives up to the ticket price."** The old *Proposed Plan* was ONE table
row: a paragraph, a run-on room list, and up to four notes. Replaced by a structured section
above the fee tables under a renamed band, `clientJobPlanSection(e, job)`.
- **`_cePhases(e, job)` derives the phases from `JOB_STEPS[svc]` — the table that PRICED the
  job. This is the whole design and the thing not to undo.** Probate prices a `document` and a
  `legal` step, so it gets the documentation and court-filing phases; Home Cleanout prices
  neither and gets neither; `downsizing_move` gets Move Day. The narrative and the number
  cannot disagree because they read one source. **Never hardcode a per-service phase list
  here** — add the step to `JOB_STEPS` and the client document follows.
- Each phase carries three fields: **what we do · what we need from you · complete when**. The
  "complete when" is the internal Job Plan's phase GATE said in client language, which is what
  makes the document read as a method rather than a brochure.
- **DELIBERATELY NO DATES OR DURATIONS, and there is a test asserting the phase copy contains
  no day/week count.** Same reasoning as `_fixedFeeBlurb`: a number beside a phase reads as a
  delivery commitment, and the pace is set by how fast the CLIENT decides. Decided with Anthony.
- **Depth scales with DOCUMENTATION LEVEL (`isFormalDoc`), not project value** — his call. A
  formal engagement gets the fuller completion criteria and the court-grade records list
  (date-of-death FMV, chain of custody, appraisals attached, 7-year retention); a $20k
  downsizing keeps every phase rather than reading as an afterthought.
- **Spaces are grouped by section with counts**, ordered by `idx`. The flat list this replaces
  dropped the section, so a two-storey house printed *Primary Suite … Primary Suite*, *Half
  Bath … Half Bath*, *Bedroom 2 … Bedroom 2* — real first/second-floor rooms reading as
  duplicated typing on a six-figure proposal. **Grouping is a correctness fix, not styling.**
- `proposedPlanRow` no longer returns a `<tr>`; it returns `{narrative, notesHtml}` and is a
  helper of the new section. Both call sites moved (`buildPrepEstimateBody` takes `job` now).
- **Standalone prep gets its own three phases** — Scoping & Sourcing · Execution & Oversight ·
  Show-Ready Handover — not the sort/pack playbook, and no records block (it has no inventory).
- Phase blocks carry `break-inside:avoid`; half a completion criterion across a page break is
  worse than a short page.
- 77 checks driving the real `renderClientEstimate` across all seven service types.

## Empty third-party section suppressed + Job Plan rooms in walkthrough order (BUILT 2026-08-03)
Two cosmetics reported on the same pass, both about a screen saying something it shouldn't.
- **The client estimate always printed the third-party block, empty.** A heading, an italic
  "No third-party vendors estimated at this time", a **$0** subtotal, and a **$0** line in the
  grand-total table — four lines describing work that is not part of the engagement, and it
  read as though something were missing. Suppressed now on `showVendors`.
  - **The test is on having no ROWS, never on `vendorCost === 0`.** An auction house or estate
    sale company is proceeds-based and renders "No direct cost" — it is a real engaged vendor
    and must still be listed. Collection-attached vendors (appraisers, FFLs) count the same way.
  - **One fail-safe runs the other direction:** `showVendors` is also true if `vendorCost > 0`
    with nothing itemising it, so a stray cost is still disclosed and the grand total still
    reconciles. Never hide money to tidy a layout.
  - The **Total Estimated Project Cost** table drops its *Havellin Services* breakdown line when
    there is nothing to break the total down into — with no vendors and no prep it was stating
    one number twice, directly under a *Havellin Services Total* band that had already stated it.
    Any vendor or prep row brings the Havellin line back so the column adds up.
  - The internal Estimate Summary panel (`s-vendor-row`) is untouched — a $0 there is a working
    readout, not a client document.
- **Job Plan room cards were sorted by complexity descending** (`(b.cplx)-(a.cplx) || (b.vol)-(a.vol)`),
  which matched nothing else in the app and read as random. Now **ascending `idx`** — the running
  counter across the whole `ROOMS` array, so it IS the Build Estimate / client estimate order
  (Entry & Living → Kitchen & Utility → Lifestyle → …). Rooms with no `idx` keep their stored
  position at the end rather than being dropped. Heading changed to *(walkthrough order)*, and
  both phase grids read the same array so Phase 1 and Phase 2 stay in step.
- 29 checks, driving the real `renderClientEstimate` and the real ordering expression.

## Save to Drive now confirms itself (BUILT 2026-08-03)
**The client estimate's *Save to Drive* had feedback — a `showSyncBadge` toast — but it is fixed
bottom-right and gone in 4 seconds, while your eyes are on the button you just pressed near the
top of a long page.** Reported as "it saved fine but the button just stays white." Worse, it
answered nothing the next day: there was no record anywhere that an estimate had ever been filed.
- **The filing is recorded on the JOB** (`estimateDriveAt` + `estimateDriveUrl`), the way
  `markEstimateSent` records delivery — `saveJobs()` + `syncJobToSheets`. **Not on the estimate
  record:** `saveEstimateState` rebuilds `estimateStore[jobId]` from a literal every save, so a
  stamp parked there is silently dropped on the next write.
- `uploadHtmlToDrive` was already returning `fileUrl` and `saveFolderEstimate` was **throwing it
  away** on `function(ok)`. Kept now, so the banner links straight to the filed copy.
- Two surfaces: the button repaints to **✓ Saved to Drive** (green, timestamp in its tooltip) via
  `_paintDriveEstBtn`, and the approval banner gains a persistent **📁 Filed to Drive · <when> ·
  Open** line in both approved states. `_reset()` inside `saveFolderEstimate` calls the painter
  rather than hardcoding the label, or a re-save would wipe the confirmed state.
- **`editEstimateFromCE` clears both fields.** The copy in Drive is the previous version the
  moment you edit; re-approval re-files and re-stamps automatically (`checkPin` →
  `saveFolderEstimate(true)`). A stamp that outlived the edit would assert the filed document
  matches the one on screen, which is the one thing it must never do.
- A FAILED upload writes no stamp and the button falls back to plain *Save to Drive* — tested.
- Pressing it again still re-files; the Apps Script overwrites by filename.
- 24 checks (same lift-the-real-source harness as the photo suite).

## Job Plan photos → Drive: six ways a shot went missing (BUILT 2026-08-03)
**Reported as "we took pics the other day that didn't seem to make it to the Estate Inventory
folder."** Six defects on that path, three of which lose the photo outright and two of which
lose it *without saying so*. Verified by lifting the real function bodies into a vm sandbox and
driving them (19 checks, harness in the session scratchpad — booting the whole 1.2 MB file in
jsdom times out, so the harness pulls `function NAME(` blocks by source text instead).
- **The headline, and it is a silent drop.** All four capture entry points opened with
  `if (!job || job.status !== 'active') return;` — **no upload, no ref, no message**. The camera
  opened, the shot was taken, and the app did nothing. A job sits at **`won`** for the entire
  stretch between the client accepting and the deposit being recorded, and `loadJobPlanTab`
  renders the room cards — camera buttons included — that whole time. So the day-one walkthrough
  shots, the ones taken before anyone has been back to the office to record a cheque, evaporated.
  New `_photoCaptureJob(jobId)` gates on **`isJobWon`** — the same rule the SCREEN enforces —
  and when it does refuse it says so. **Match these two gates if either ever moves.**
- **`_doPhotoUpload` hand-rolled its subfolder lookup instead of calling `resolveSubfolderId`**,
  so it never saw the alias map — and `'Estate Inventory'` aliases to `['Photos','Asset
  Documentation']`, the two folders it was merged from on 2026-07-15. On any job folder created
  before that merge there is no `Estate Inventory` key and **every photo failed**, while every
  other Drive writer in the app (estimates, invoices, agreements, walkthrough notes) went
  through the resolver and filed correctly. It also missed the `{ name: "id" }` stored shape
  `_subfolderId` handles. Now one call to the shared resolver. **Don't re-inline this lookup.**
- **`_photoRetryData` was memory-only, so a failed shot died with the tab** — and
  `retryPhotoUpload` opened `if (!dataUrl) return;`, so the Retry button sat there doing nothing,
  forever, indistinguishable from one that worked. Bytes for **failed** shots now persist under
  their own key (`hav_media_pending_<jobId>`), rehydrated by `loadPhotoRefs`, dropped on success.
  Separate key on purpose: image data must never be able to crowd the manifest write out of the
  quota. The residual no-bytes case now speaks instead of returning.
- **Two shots into one room slot back to back collided.** `seq` and `stableId` were read at
  capture time, *before* the async FileReader + compress, so both computed seq 1 and the same
  `stableId` — the second ref overwrote the first in `_setPhotoRef`. Both files reached Drive;
  one of them was referenced by nothing and the badge counted one shot where two were taken.
  Now taken inside the compress callback, with `_photoUid()` (timestamp + monotonic counter)
  because two captures really can share a millisecond. Same fix on all four entry points.
- **`loadPhotoRefs(jobId)` ran AFTER the plan HTML was built.** The room cards read `_photoRefs`
  as they render, so the first open of a job in any session drew every count as zero and hid
  every failed-upload flag — photos correctly filed in Drive read on screen as photos that never
  happened. Moved above both render calls; the duplicate second call is gone.
- **`savePhotoRefs` swallowed quota errors in a bare `catch(e) {}`.** That leaves the photo in
  Drive and missing from the inventory, and the inventory is the court record. Warns once now.
- ⚠️ **`manual.html` + `concierge-guide.html` need a pass** — the capture gate moved from
  *active* to *won*, three refusals that were silent now speak, and the playbook's symptom→cause
  table has no row for "took photos and nothing happened." Not done here.

## Home Prep consolidation + vendor coordination hours — BUILT 2026-08-03
**One entry point for prep, and third-party vendors finally bill the hours the estimate has
been promising the client since the 15% came off.**
- **There were two front doors on ONE array.** The *Property Preparation* card in Third-Party
  Vendors and the separate *Home Prep for Sale* card both wrote to `prepItems`. Four ways they
  disagreed, in descending order of how much money each cost:
  - **The card never touched `e-prep-enabled`, and everything downstream read it.** With the
    box unticked `prepEnabled` was false, so `prepCost`/`prepFee`/`prepTCHrs` all zeroed — no
    line on the client estimate, no sourcing card in the Job Plan, nothing on any invoice.
    A prep vendor entered on a walkthrough sat on screen with a dollar figure against it and
    was worth **zero** everywhere else. `prepEnabled` is now **derived**: `isPrep ||
    prepItems.length > 0`. Having lines IS including prep, and nothing can disagree with it.
  - **Editing a cost in the card wrote 0.** `formatMoneyInput` rewrites the field to `$8,000`
    and then handed that string to `updatePrepCost`, which did `parseFloat(val)||0` → `NaN`
    → **0**, on every keystroke, while the field went on displaying the number. Now
    `moneyToNumber`, which is what `updateVendorCost` beside it always used.
  - **The two dropdowns spoke different languages.** The card offers directory categories;
    the deleted dropdown offered `PREP_BASE_TYPES` friendly labels, and **ten of the fourteen
    are not category names** (*Full Interior Paint* vs *Painting*). `vendorGroupOfLine` places
    a line by category lookup, so a line entered in one could not be displayed by the other.
    One vocabulary now — the directory's own names. `VENDOR_SLOT_CATEGORY_MAP` still
    translates the old labels so saved estimates scope their Job Plan picker correctly.
  - Only the deleted table had the per-line **scope note**. It moved into the card; losing it
    would have made the consolidation a downgrade.
- **`PREP_TC_HRS` was rekeyed to directory categories** and this is the subtle one: the table
  was keyed *entirely* by the friendly labels, so the moment that dropdown went, all but four
  keys stopped matching and every prep line silently billed the 1.0 default — staging at 1.0
  instead of 2.0. Old labels kept as aliases. **Painting is 1.5**, not 2.0: the old list split
  it into a full repaint (2.0) and a touch-up (1.0) and the directory has one category for
  both, so the number is the middle and the scope note says which it is.
  (`PREP_TC_HRS` itself was then folded into `COORD_TOUCHES` later the same day — see the touch
  model section above. The rekeying and the aliases survive it; only the shape changed.)
## The touch model — coordination hours from ONE rule (BUILT 2026-08-03, same day, after the below)
**`hours = touches × TOUCH_HRS` (0.5), and that is the entire model.** A *touch* is one discrete
interaction with a vendor that costs concierge time — a call, a quote to chase, access to
arrange, work to inspect, a settlement to reconcile.
- **Replaces `PREP_TC_HRS` AND `VENDOR_TC_HRS`/`VENDOR_TC_HRS_BY_GROUP`, both deleted.** Two
  tables of the same quantity, hand-tuned at different times, in different shapes — which is
  how two lists that mean the same thing drift. Now `COORD_TOUCHES` (per category, integers) +
  `COORD_TOUCHES_BY_GROUP` (per Category Group) + `COORD_TOUCHES_DEFAULT`. `prepLineTCHrs` and
  `vendorLineTCHrs` survive as one-line wrappers over `coordHrsFor(cat, kind)`, so no caller moved.
- **It changes no number.** Every value in both old tables was a multiple of 0.5, so they convert
  to touch counts exactly — the rule was already implicit and nobody had written it down. A test
  hardcodes both old tables and asserts all 36 values reproduce. The counts also survive a
  plausibility check, which is the real evidence: estate sale 8 (call · walkthrough · contract ·
  pricing schedule · sale-day staffing · mid-sale check · breakdown · settlement), mover 6
  (survey · quote · COI · pack · load · delivery). Countable on your fingers, which is the point.
- `kind` ('prep' | 'vendor') selects only the FALLBACK: prep lines resolve to the Property
  Preparation group default, never through `vendorGroupOfLine`, which cannot place them and would
  drop an unknown prep label into the first vendor card's group.
- **One deliberate behaviour change, on legacy data only:** a *vendor* line carrying a prep
  category ('Pest Inspection / Treatment' is both) used to miss the vendor override table, fall
  through `vendorGroupOfLine` to card[0], and book 2.0 hrs. It now answers 0.5 from the shared
  table. Unreachable through the UI (vendor dropdowns never offer prep categories); it is a fix.
- **DO NOT scale these by the vendor's cost. Do not re-propose it.** Havellin's own sorting,
  contents list and photography SHRINK the appraiser's invoice, so hours pegged to that invoice
  would FALL as Havellin did more work — the exact perverse incentive that took `SMF_PCT` to 0
  (see its comment) — and it puts a percentage of third-party spend back onto court-reviewed
  probate expenses in a hat. If size sensitivity is ever wanted the honest input is property
  sqft on property-work trades: already in the engine, and our own effort cannot game it down.
- **NEW `rec.coordHrs` — optional, observational, disposable.** A *Coord hrs* box beside each
  actual quote on the Job Plan sourcing card (all three: service, logistics, prep), with the
  touch-derived figure shown next to it, plus a `coordHrsRollup` at the foot of the section once
  anything is recorded. Anthony was explicit he is unsure about per-vendor time logging long
  term, so: never required, never gates anything, and if nobody fills it in the app behaves
  exactly as before.
  - **It must NEVER reach pricing, and the reason is not obvious.** The client is billed off the
    HOURS LOG (`actTC`), which already contains the time spent phoning that mover — it is simply
    not attributable to them. `saveLogEntry` stores `{date, activity(free text), members:[{name,
    role, hours}]}` with no vendor or category field, which is why none of this could ever be
    checked before. So `coordHrs` is a *breakdown of hours already logged and already billed*,
    not additional hours. Feeding it anywhere would bill the same time twice.
  - The rollup's ESTIMATED side reads `est.vendorTCHrs + est.prepTCHrs` (the saved quote), not a
    re-walk of the lines — re-deriving sweeps in the empty End-of-Job Logistics placeholders and
    inflates "estimated" with hours nobody quoted. The RECORDED side sweeps all three sourcing
    maps including logistics, because a hauler booked mid-job is real coordination that really
    happened and was never in the quote.
  - Suppressed entirely on standalone prep (`_noCoord`): that engagement bills no hours, so there
    is no estimate to check against and "est 1.5" would be inventing one.
- Also fixed here: `renderVendorSourcing`'s prep footnote still promised a "15% Service Management
  Fee (folded in with all coordinated vendors)" on a bundled job, on the very screen where those
  actuals are typed. 69 more jsdom checks (138 total across the three suites).

- **`VENDOR_TC_HRS` / `VENDOR_TC_HRS_BY_GROUP` — SUPERSEDED by the touch model above, same day.**
  Kept here because the *reasoning* still holds; only the table shape changed. When `SMF_PCT` went to 0 the app started
  telling the client — on the tab, on the estimate, in the terms — that Havellin adds no fee
  *because coordination bills hourly*. **Nothing billed it.** The engine's off-site coordination
  is service-type and sqft driven and had no idea how many vendors a job ran, so five vendors
  added **no fee and no hours**: the sentence justifying the removal was true of nothing. Now
  keyed by Category Group (Moving & Logistics 3.0 · Asset Liquidation 2.0 · Professional
  Services 1.5 · Disposal 1.0 · Logistics 1.0) with per-category overrides (Estate Sale 4.0,
  Auction 3.0, Shredding 0.5). Sized against what the 15% collected at the $150 TC rate — a
  $3,000 mover was $450 of fee and is 3.0 hrs.
  - **Coordination ONLY, never attendance — do not "improve" this into on-site time.** A
    collection dispositioned to an appraiser or dealer already books real presence via
    `COLLECTION_HOURS.on`, and an estate sale company can be a vendor line *and* a collection
    disposition on the same job. Pricing attendance here would bill it twice. Folds into
    `coordTC` for exactly that reason, alongside `prepTCHrs`.
  - Zero on standalone prep (that engagement bills no hours at all). Saved as
    `est.vendorTCHrs` so a reopened estimate can still explain where the hours came from.
- **Standalone prep now shows ONE card.** `renderVendorGroupCards` filters to Property
  Preparation on `svc === 'prep'`, `est-vehicles-card` joined the hide list, and `vendorCost`
  is excluded from `grandTotal` on prep. The rest of that pipeline already assumed prep
  vendors are the only vendors — `buildPrepEstimateBody` itemizes nothing else and
  `renderPrepJobPlan` sources nothing else — so a dumpster added there landed in the grand
  total while appearing on no client document, and **the client estimate stopped adding up**.
- The card that relocates into `est-job-grid` on a prep job is now `est-vendors-card`, not the
  deleted `est-prep-card`. Card-set rebuilds are guarded on `_vgrpPrepMode` changing, NOT run
  every `calcAll` — that would destroy the cost `<input>` mid-type (the "can't get past the
  first digit" bug).
- **Migration, and it is a fix rather than a regression:** an estimate saved before this with
  prep lines but the box unticked reopens with those lines **priced**, so its total moves. They
  were entered on a walkthrough and dropped by a checkbox the card adding them never set.
  Vendor lines on old estimates also book coordination hours now. Both documents say to
  reopen and re-read anything saved earlier.
- Deleted as newly-dead: `PREP_BASE_TYPES`, `SERVICE_BASE_TYPES`, `_coveredCats`,
  `_jobMenuHTML`, `togglePrepSection`, `addPrepItem`, `calcPrepTotals`, `currentPrepFeeRate`,
  and the `s-prep-tc-row` hours line that sat inside the dollars table.
- 47 jsdom checks on the estimate path + 22 downstream (Job Plan sourcing, all three invoice
  stages bundled and standalone, both agreements, zero load errors) — all green.

## Outbuildings consolidated + a FALSE GREEN on room coverage (BUILT 2026-08-03)
**Eleven per-sub-room outbuilding rows became nine per-building rows sized by bedroom count**,
and fixing the section surfaced a worse bug beside it.
- **The false green, and it is the important half.** `COVERAGE_BEDROOMS` / `COVERAGE_FULL_BATHS`
  carried the outbuilding bedroom and bath rows, but intake has **no outbuilding field at all** —
  its beds/baths are the main house. So four main bedrooms + a guest house + a pool house against
  an intake of 6 returned `beds: 6` and the badge went **green with two main bedrooms never
  walked**. A false clear on the one check that catches a half-scored house is worse than no
  check. Outbuilding rows are off both lists; intake gained a *Main house only* hint, because the
  converse (counting a casita bedroom at intake) makes the badge unclearable — same shape as the
  half-bath bug. **Reachable is now beds 8, full baths 14, half baths 5** (was 11 / 17 / 5).
- **The pool house was in the grid TWICE under the same name.** `Pool House` (Exterior, 2.7) and
  `Pool House — Living / Bedroom` + `Kitchen / Bar` + `Bath` (Outbuildings, 4.5) are one building;
  the split was meant to be cabana vs. with-quarters and nothing said so. Ticking both
  double-counted 2.7 load units ≈ **7 PS hours**, invisibly. Now
  `Pool House / Cabana — no living quarters` and `Pool House — with living quarters`.
- **Weights are the old sub-room SUMS, so a fully-ticked building prices identically** — Guest
  House 7.0 (2+2+2+1), Cottage 5.5 (2+2.5+1), Pool House 4.5 (2+1.5+1). Each extra bedroom adds
  **2.0**, the old bedroom weight; keep that step if a size is added. Casita moved out of Exterior
  into this section at its unchanged 2.5, making the ladder legible: casita → pool house →
  cottage → guest house.
- Per-sub-room volume/complexity and per-sub-room notes/media are gone for outbuildings. That was
  the accepted trade — nobody scores a detached guest house room by room.
- **No alias map: old sub-room names are simply gone, so any estimate saved earlier loses its
  outbuildings on reopen.** Deliberate — Anthony confirmed the app holds only dummy jobs. If real
  estimates ever predate a room rename, add aliases instead; `loadEstimate` matches section+name
  first, so a rename without one silently drops the room and reprices lower.
- 94 jsdom checks on this alone (230 across five suites).

## Client estimate document — vehicles, the fixed-price line, and a fixed-price hours leak (BUILT 2026-08-03)
- **Vehicles reached NO client document.** Captured since 2026-07-15, saved on the snapshot,
  bridged to inventory — and absent from the client estimate entirely, while collections beside
  them got a whole disposition table. New *Vehicles & Watercraft* section after the collections
  plan.
- **It states what was FLAGGED, never a route, and that is Anthony's rule: flag at estimate,
  route on the job.** *Flagged for specialist appraisal* (collector) / *Flagged for disposition*,
  plus *Title to be located* when unticked. The architecture already worked this way —
  `materializeVehicle` imports with `disposition: ''` precisely so the job decides. KBB/NADA and
  "→ Vehicle / Boat appraiser" stay on the internal card; a test asserts neither reaches the
  client copy.
  - **`collector` is an appraisal flag, not a routing switch.** Its one real effect is
    `needsAppr: !!veh.collector` on the inventory line; the appraiser comes from the CATEGORY
    (`INV_CATEGORIES` → Vehicles & Watercraft → Vehicle / Boat Appraiser), identical either way.
    Don't document it as routing.
  - The two tick boxes and the card's own hint text were left alone on instruction.
- **`_fixedFeeBlurb(e)` replaces the Fixed Project Fee description.** The old copy ended "Billed
  as a fixed price, not by the hour" under a heading reading FIXED PROJECT FEE, with the same
  fact repeated in the note below and twice in Terms — four statements of one thing. Worse, the
  hourly document described the concierge properly while the fixed one collapsed it to
  "oversight", so **the client learned less by paying a firm price** — backwards, since there is
  no hour count to inspect. Now names the crew size, the confirmed/excluded space counts, and
  **the risk transfer**: `fixedPriceBuffer` adds 20% precisely so Havellin absorbs the overrun,
  the client pays for that, and it was stated nowhere. Deliberately silent on duration — a day
  count in the price line reads as a delivery commitment.
- **The fixed-price hours leak, two sites, and the second was a contradiction not just a leak.**
  Neither footnote branched on `fixedPrice`: the third-party one said "accounts for 18.0 of the
  Transition Concierge hours above" (no such line exists on a fixed-price document), and the
  home-prep one asserted "is billed hourly" against Terms three paragraphs down saying the fee
  does not vary with hours. Both now take the Terms' own wording on fixed price. A test asserts
  the string "of the Transition Concierge hours" appears nowhere on any fixed-price estimate.
- Also removed on instruction: the concierge sub-line *"Present for every working hour listed
  below, not on call. Hours the concierge spends on hands-on work are billed here and are not
  also billed on the specialist line."* Both halves were already in the sentence above it, and
  the no-double-billing disclaimer is internal accounting answering a question nobody asked.
  And the note under the fixed-price table lost its redundant opening sentence, so it now leads
  with the change-order mechanic — the only part not stated elsewhere.
- Heading is **Third-Party Vendors To Be Engaged** — it is an estimate; nothing is booked. One
  render site, client estimate only; the invoice has no counterpart to keep in step.
- 46 jsdom checks on the document alone (136 across four suites).

## Estimate Summary now says what the hours ARE (BUILT 2026-08-03)
**The fee rows stated a count and nothing else, and the composition existed nowhere a reader
could see it.** The room grid shows `pack` alone — 27% of the hands-on pool on Estate
Settlement, 23% probate, 18% contested, but **71% on Downsizing** — so per-room hours are a
minority of the work on exactly the jobs Havellin runs, and are **not comparable between
service types**. A closet reading 3.6 hrs on an estate job carries ~13 hrs once its share of
everything else is counted.
- `computeEngineV3` now returns **`byStep`** (per-step tc/ps). `STEP_LABELS` +
  `STEP_LABELS_COORD` name them, and `_scaleHoursParts` / `_hoursPartsLine` render them under
  the two fee rows in the Estimate Summary. Stored on the snapshot as `est.hoursBreakdown` so
  the Drive working paper and a reopened estimate can't drift from what was quoted.
- **Both lines are SCALED, not raw.** Billed PS is `n × W/(n+α)` of the pool, and billed TC adds
  on-site hours to off-site coordination — raw step hours would visibly fail to add up to the
  total on the same row. The rounding residual goes to the largest part so they sum exactly.
- **TWO label maps, and this is the one to not "simplify".** A step's two coefficients are
  off-site coordination and the hands-on pool — not the same work done by two people. Using the
  hands-on names for the TC column printed *"Packing & handling 5.0"* against a concierge who
  was not in the building. Specialist side says *Packing & handling*; concierge side says
  *Packing logistics & materials*.
- **DELETED: the `room-overhead-line` strip** under the room grid ("+ Project coordination &
  logistics"). It named the largest block of work on an estate job as administrative overhead
  and gave a residual without saying what was in it. The Drive export row is renamed *Job-level
  work* and now prints the stored breakdown, falling back to the old text on pre-change
  snapshots. Don't reintroduce a second copy — two places describing one quantity is how the
  fee table and the room grid drift apart.
- 40 jsdom checks on this alone (90 across the three suites).

## Room coverage — half baths were unreachable, and ROOMS was secretly append-only (BUILT 2026-08-03)
**The coverage badge could never clear on a house with two powder rooms**, so a fully-walked
estate read as an unfinished walkthrough forever and the one check that catches a half-scored
house — the expensive failure, since scores are averaged and applied to the whole sqft — was
teaching people to ignore it.
- `roomCoverage` counts by **name membership over the scored rows**, so duplicates count: beds
  and full baths appear in both floor sections and reach 8 and 14. `COVERAGE_HALF_BATHS` was
  `['Half Bath']` and `Half Bath` existed in **exactly one section** (Kitchen & Utility) — a
  hard ceiling of **1** against an intake field that accepts any number.
- **The rule to keep:** the reachable count for a kind is the number of GRID ROWS carrying that
  name, not the number of distinct names on the list. Raising an intake count past what the grid
  can reach makes the badge unclearable. Reachable now: **beds 11, full baths 17, half baths 5**.
- Added `Half Bath` to Entry & Living, First Floor and Second Floor Bedrooms & Bathrooms, plus
  `Pool / Cabana Half Bath` in Exterior & Auxiliary (weight 0.5, in `EXTERIOR_ROOMS` so it adds
  load rather than modulating the under-air baseline — a cabana bath is not inside the sqft).
- **`Additional Bathroom(s)` is deliberately still a FULL bath.** Reclassifying it would change
  what already-saved estimates mean. It remains a plural row counted once, so a house with
  several surplus baths can still read short — the honest fix there is the per-room `mult`
  field, which `includedRooms` already carries hardcoded to 1 and nothing has ever built.
- **The trap, and it nearly shipped: `loadEstimate` matched saved rooms by `idx` FIRST.** `idx`
  is a running counter across the whole `ROOMS` array, so inserting any row shifts every index
  after it and a saved estimate restores its scores onto whatever row inherited its old number
   — silently, on reopen, no error. Same shape as the vendor row-index bug. **Order is now
  section+name → idx → plain name**, `idx` constrained to its own section (it survives only to
  rescue a RENAMED custom `Other` row, which no name lookup can match by definition), and a
  `_claim` guard stops two rows restoring from one saved record. **ROOMS is safe to edit now;
  it was not before.** Don't put `idx` back in front.
- 50 jsdom checks (34 unit + 16 driving the real grid and badge), zero load errors.

## Docs / operations manual (`manual.html`)
- `manual.html` is the internal operations manual. It is **hand-maintained** and does
  NOT auto-sync with the app, so it drifts whenever the app changes.
- **`MANUAL.md` is a GENERATED copy of `manual.html`** — a plain-text read of the same
  document for phones, printing and pasting into a thread. `manual.html` stays the
  source. Regenerate it in the same commit as any manual edit or the two disagree, and
  the markdown is the one people will have open. The converter lives in the session
  scratchpad, not the repo; it is ~120 lines of DOM walking (h1-h3, p, ul/ol incl.
  nested, tables, `.note` → blockquote, `.flow` → fenced block **stripped of inline
  bold**, since `**` renders literally inside a fence).
- **Printing is a real output, so the phone block in `manual.html` is scoped to
  `screen`.** Chrome lays a page out at roughly 739px for Letter, which matches
  `max-width:820px` — so an unscoped phone block gives every printed table the phone's
  `display:block; overflow-x:auto; white-space:nowrap`. On screen you scroll such a
  table; on paper the overflow is just gone. A printed table losing its right-hand
  column silently is the worst failure mode for a document someone follows step by step.
  Keep `break-inside:avoid` on `.note`, `.flow` and tables but NOT on lists — §5i and
  §11 have lists longer than a page and forcing those whole strands half a sheet.
- **Reminder:** after any significant rebuild (new/renamed/removed tabs, rate changes,
  dropdown/option changes, workflow changes), flag to the user that `manual.html` needs
  a reconciliation pass against the current app. Don't let it silently fall out of date.
- Last reconciled against the app: **2026-08-03 (tenth pass, same day)** — both documents, against
  the client-estimate rebuild and the licence correction. **The compliance item is the one that
  matters:** manual §1 and playbook Step 3 now state plainly that Havellin is **insured and bonded,
  NOT licensed**, that every client document claimed otherwise until this correction, and that a
  vendor's *Licensed FFL* is a different thing that is correct where it appears. In the playbook it
  is a red `.stop`, because the instruction is to strike the word from anything a concierge writes
  themselves. Both also carry the new tagline.
  - Manual §7 was rewritten for the folded structure — **three blocks, not six** — with the
    fold recorded (do not reintroduce a trailing block after a numbered sequence), the
    vendor-to-stage bucketing rule, the close-out gap it exposed, the deleted no-dates preamble
    and why, the *at cost* consolidation, the two-dark-bands rule, and the one-line header
    including the `isEstateJob`-reads-the-rep trap. §5b/§5i untouched — the ninth pass covered them.
  - Playbook Step 3 gained the same in field language plus a genuinely useful field check:
    **if a vendor you entered is not named anywhere in the stages, it is filed under the wrong
    category.** Three new symptom→cause rows (vendor missing from the stages · client asks why
    there are no dates · the word *licensed* anywhere).
- Prior pass **2026-08-03 (ninth pass, same day)** — both documents, against the
  pricing changes. This pass CORRECTS the biggest standing claim in either document: **manual §5b and
  playbook Step 2 both said a room row is "the packing step only"**, with the instruction to mentally
  multiply it (a 3.6 hr closet "is really 13"). True until this morning, false now — rows carry the
  whole pool and reconcile to the fee lines, so the advice is not just stale, following it now
  double-counts. Both say so and name the 3.7× understatement it replaced. Manual §5b also gained the
  fullness-preset note (shift-not-blanket, complexity untouched, premium→complexity rejected with the
  3.9% vs 49.6% numbers) and a kept-but-rewritten note that rooms are still not comparable ACROSS
  service types (2.2× and 1.5× ratios). **§5i gained the load-drivers note** — what feeds the pool,
  the tenure double-count and why it moved to the coordination column, and that complexity never
  touched the pool either. §5i's core-team-reach footnote dropped "long tenure" from the list of
  things that pull the reach down, because it no longer does. Playbook Step 2 got the same in field
  language plus **five new symptom→cause rows** (hours jumped · garage/patio costs more than expected ·
  nineteen sliders · long tenure not pricing higher · above the reference range).
  - **Both documents now carry the open calibration gap in writing** — engine above the bands past
    ~3,000 sqft, one band bucket spanning a 2× sqft range, `document` blind to contents, garage
    weighted as the kitchen, estate documentation charged on a patio. The playbook's version ends
    **"do not score down to hit it"**, which is the instruction that matters in the field.
- Prior pass **2026-08-03 (eighth pass, same day)** — both documents, against the
  photo-path fixes, the Save-to-Drive confirmation, the suppressed empty vendor section, the Job Plan
  room reorder and the new client Job Plan section. This pass CORRECTS a claim that was actively
  wrong: **manual §10 and playbook Step 10a both said photos are captured only once a job is Active**,
  which was true of the app and was the bug — every shot taken while the job sat at *Won* was silently
  discarded. Both now say **Won**, name the loss, and tell anyone who shot in that window that those
  photos are not in Drive. Manual §7 gained a new **"What the document contains"** subsection (the
  derived-from-`JOB_STEPS` rule, the no-dates rule and why, depth-by-documentation-level, grouped
  spaces and the duplicate-name defect they fix, prep's own three stages, the suppressed vendor
  section) · §7 a Save-to-Drive note · §10 four notes (the gate correction, refusals that now speak,
  retry surviving a session, counts correct on first open) · §11 a walkthrough-order note. Playbook
  Step 3 gained the job-plan section in field language plus Save to Drive, Step 10a the gate `.stop`
  and a check-the-room-card note, and **nine new symptom→cause rows**.
  - **Also fixed here, and it is a pre-existing defect in both documents:** the phone block was
    `@media (max-width:820px)` — NOT scoped to `screen`, despite this file asserting it was and
    explaining why it must be. Chrome lays Letter out at ~739px, inside that breakpoint, so every
    PRINTED table was getting `display:block; overflow-x:auto; white-space:nowrap` and losing its
    right-hand column silently on paper — including the playbook's symptom→cause table, whose right
    column is the half that says what to do. Now `@media screen and (max-width:820px)` in both, with
    the reasoning in a CSS comment so it survives the next edit. `havellin.html` was checked and is
    NOT exposed: its phone block carries no bare `table{overflow-x:auto}` rule and printing goes
    through `#print-target` under its own `@media print`.
- Prior pass **2026-08-03 (seventh pass, same day)** — both documents, against
  the outbuilding consolidation. This pass CORRECTS the reachable ceilings the fourth pass added
  (11 / 17 → **8 / 14**, half baths unchanged at 5) and adds: manual §5b a note that **intake's
  bed/bath counts are the main house and outbuildings no longer satisfy them**, naming the false
  green it fixes · a new **"Outbuildings & guest quarters — one row per building"** subsection with
  the row/weight/replaces table and the sum-of-sub-rooms derivation · a note on the duplicated pool
  house and what ticking both used to cost. Playbook Step 2: the same in field language plus
  **three new symptom→cause rows** (where the guest house kitchen row went · can't find the casita ·
  which pool house row). `.md` copies hand-edited to match and diffed for parity.
- Prior pass **2026-08-03 (sixth pass, same day)** — both documents, against
  the client-estimate changes. Manual §5g gained a note stating the **flag-at-estimate /
  route-on-the-job** rule, what the client now sees, why KBB/NADA and the appraiser name stay off
  their copy, and the correction that **Collector / classic sets `needsAppr` rather than routing
  anything** — §5g's old bullet implied it picked the appraiser. Playbook Step 3 gained what to
  check on the document before submitting for approval (the vehicle rows, the printed
  *Title to be located*) and **why a fixed-price document carries no hour counts anywhere**.
  `.md` copies hand-edited to match and diffed for parity.
- Prior pass **2026-08-03 (fifth pass, same day)** — both documents, against
  the Estimate Summary hours breakdown. This one CORRECTS rather than adds: manual §5b described
  the deleted *Project coordination & logistics* line as the place the job-level hours are stated,
  which is now false. Replaced with where they actually are (under the two fee rows), plus a note
  that room rows are the packing step only, the pack-share table by service type (27 / 23 / 18 /
  71%), the "a 3.6 hr closet is really ~13" arithmetic, and **don't compare room hours across
  service types**. A second note explains why the two label sets differ and says not to collapse
  them. Playbook Step 2: the same in field language plus **one new symptom→cause row** (a room's
  hours look far too low). `.md` copies hand-edited to match and diffed for parity.
- Prior pass **2026-08-03 (fourth pass, same day)** — both documents, against
  the half-bath coverage fix. Nothing either document said was falsified (neither enumerates the
  room list), so this pass ADDS rather than corrects. Manual §5b: a note stating **the badge counts
  grid rows, so intake can only ask for what the grid can reach** — with the reachable ceilings
  (11 / 17 / 5) and the instruction to add rows in the same change as any intake count that
  outgrows them · where the five half baths now live and why the cabana one is exterior · why
  `Additional Bathroom(s)` is still a full bath and still counted once. Playbook Step 2: the same
  in field language, plus **two new symptom→cause rows** (ticked the only half bath you can find ·
  used `Additional Bathroom(s)` for a powder room and made it worse). The `.md` copies were
  hand-edited to match rather than regenerated — the converter is not in this session's scratchpad
  — so the four files were diffed for parity afterwards.
- Prior pass **2026-08-03 (third pass, same day)** — both documents, against
  the touch model and the optional `coordHrs` capture. Manual: **NEW §5d-i "The touch model"** —
  the rule as a `.flow` block, a touches→hours→categories table, why it is a rule rather than a
  list, the coordination-not-attendance note moved into it, and an explicit **do-not-scale-by-cost**
  note carrying the appraiser argument · §5d's old rate list replaced by a pointer to it · §5e's
  prep hours now point at the same rule · **§11 gained the `Coord hrs` note** — optional, bills
  nothing, and *why* it cannot (the hours log already contains that time unattributed) · §16 fee
  row now reads `touches × 0.5`. Playbook: the touch count in field language under the vendor
  bullet, a `Coord hrs` note in Step 11c, the quick-reference row, and **two new symptom→cause
  rows** (disagreeing with a vendor's hours · whether to fill in Coord hrs). Also corrected in
  both: two surviving "15% / 30% fee" lines on the sourcing step, stale since 2026-08-02.
- Prior pass **2026-08-03 (second)** — both documents,
  against the Home Prep consolidation and vendor coordination hours built that afternoon. See
  the *Home Prep consolidation* section below for the change itself. Docs touched: §5 layout
  map (the Home Prep card is gone from the build column) · **§5d gained two notes** — the
  per-vendor coordination hours with the full rate table, and the coordination-not-attendance
  rule that keeps it off collections' on-site time · §5d's Property Preparation row now says
  it is the only prep entry point and carries scope notes · **§5e rewritten** around one entry
  point, with a callout naming the silent-drop bug and telling anyone holding a pre-2026-08-03
  estimate to reopen it · §5e gained the rekeyed `PREP_TC_HRS` numbers and why Painting is 1.5
  · **§6a** the tab empties out on a prep job, plus why the other five vendor cards are hidden
  · §16 fee table gained a coordination-hours row. Playbook: the same in field language, plus
  **five new symptom→cause rows** (looking for the tick box · an old estimate pricing higher ·
  adding a vendor raising the quote · one card on a prep job · a prep cost reading $0).
- Prior pass **2026-08-03 (first)** — both documents, against the Build Estimate
  rebuild and the pricing decisions of 2026-08-02/03. The manual and the playbook were passed
  together, as CLAUDE.md says they must be. What changed:
  - **§5 gained a layout map of the rebuilt tab** (Job/Crew two-column top · vendors → rooms
    two-up → paired cards · summary, reference check and the three price levers at the bottom).
    A screenshot older than 2026-08-02 no longer matches the tab, so the map is what a reader
    reconciles against.
  - **§5c: the six specialist tick boxes are one crew-size dropdown (2–6)**, and the manual now
    states the two-way tracking — it follows the recommendation up *and down* until you set it
    by hand, then stops and warns. The one-way version was the bug: a stale crew of 6 on a job
    needing 3 silently discounts the quote.
  - **NEW in §5c/§5i: the timeline planner.** Three answers (already inside / reachable at N
    specialists / not reachable at the cap) with the measured margin case for compressing —
    54% → 65% on the 6,000 sqft cleanout — and the guard it exists for: charging the 20%
    premium on a natural schedule bills *more* than the genuinely expedited job.
  - **NEW in §5b: the room-coverage flag**, plus the reason it matters stated plainly — scores
    are averaged over the rooms you scored and applied to the whole sqft, so a half walkthrough
    misprices rather than under-counts ($44,900 → $24,100 on one ticked foyer).
  - **§5b: "auto-scores 3/3" was wrong** and is corrected — foyer/half bath/secondary baths/
    laundry/mudroom/utility open at 1/1, primary baths at 2/2.
  - **§5d rewritten for the six Category Group cards**, including the two things that are
    load-bearing: Property Preparation feeds the *prep* list (routing a painter through the
    vendor list drops the 30% GC fee on a standalone job) and End-of-Job Logistics dedupes
    against the Job Plan.
  - **§5e/§13a/§16: bundled Home Prep now carries NO fee.** Both documents still said 30% on a
    bundled add-on; `prepFeeRate` returns 30% only when `svc === 'prep'`. The playbook's version
    of the same claim ("not the 15%") was doubly stale.
  - **§16: discount cap 15%, fixed-price contingency 20%**, plus an explicit order-of-operations
    block (services → less discount → plus 20% expedite → plus vendors at cost).
  - **§16: the margin panel is HIDDEN on Build Estimate** and the manual says so rather than
    describing a panel nobody can see. Two named consequences: the 30%-reference pair is not in
    front of you when you set a discount, and neither is the deposit-coverage warning. The 15%
    cap is the guardrail that remains.
  - **§8: Stripe's payment link now reports failure honestly** — worth documenting because the
    old behaviour (unconditional success on an opaque response) is exactly what strands a dry
    run waiting for a link that was never created.
  - Also: §4 the inline *+ New* referral partner · §5a private walkthrough notes · §5f the
    vendor-name field is off the collection row · §11 mid-job vendors and the logistics dedupe.
  - Playbook: Step 2 rebuilt to match, quick-reference fee table corrected, and **nine new rows
    on the symptom→cause table** (won't save with no rooms · coverage amber · crew moving by
    itself · crew-above-recommendation warning · unreachable date · missing vendor category ·
    empty vendor cards · Stripe failure).
  - Checked and found **already correct**, so left alone: the 20% rush mechanics and its
    after-discount ordering, the T&M default and the probate withholding, §5f's disposition
    hours rule, §5i's engine formulas and core-team reach table, §12's invoice gates, §17.
    The Home Prep scope note IS real (`p.note` on each prep line) — both documents describe it
    correctly; it is the *third-party vendor* line that has no scope field, and neither claims one.
- Prior pass **2026-08-01** — a pass run before Anthony and Ashley walk a
  fake client end to end, so the checks were aimed at the billing/job-plan path rather than at
  what had recently been built. Four claims were wrong against the app:
  - **§12 the invoice PIN rule was simply not the rule.** It said every stage needs manager-PIN
    approval to unlock the PDF. `invRequiresApproval = (stage === 'final') && (_variancePct >
    0.15)` — deposit and midpoint need nothing and render a *No approval required* badge, and
    the final needs a PIN only outside ±15% (change orders excluded from the comparison).
  - **§12 was missing a hard gate that has no override.** `invBlocked = _noHours` kills a final
    invoice with no logged hours — no PIN, no PDF, no email, deliberately not routed through
    `invRequiresApproval` because a manager cannot unlock a missing timesheet. Nothing in the
    manual mentioned it, and it is exactly what a practice job hits. Documented, along with the
    softer `_noTCHours` warning (crew hours logged with no concierge hours against them).
  - **§9 Change Orders described a manager approval and a DocuSign send. Neither exists.**
    `saveChangeOrder` takes no PIN, and the app has *zero* DocuSign references. The real flow is
    Create → PDF → **Get Acceptance** (the client's name typed against *I Accept This Change
    Order*). The load-bearing part now stated plainly: `renderInvoice` filters on
    `co.clientApproved`, so an unaccepted change order is never billed at all.
    (`co.approved` is initialised false and written by nothing — a dead flag of the same shape
    as `midpointInvoiceSent`. Left alone; the client-acceptance path is the real one.)
  - **§1 still sold DocuSign as live** — "Client signatures via DocuSign. Payments via Stripe
    (planned — not yet live)", where the parenthetical reads as attaching only to Stripe. This
    is the third time this manual has promised that integration; §3's not-yet-built note was
    added in the 2026-07-30 pass and §1 was missed then.
  - §17's PIN list carries the ±15% condition now, and says plainly that a Change Order needs
    no PIN — the two questions §9 and §12 will send a reader there with.
  - Checked and found **already correct**, so left alone: §3's three hard gates, §5c (fixed
    price withheld on probate/contested, rush premium), §7, §8 (three ordered agreement steps,
    the three-stage payment recorder, the cheque photo — `dep-evidence` is real), §9's status
    table and won/re-open/delivery-stamp notes, §11, §12's Drive filing and stage auto-advance,
    §16a, §17's attribution-not-security note.
- Prior pass **2026-07-31** — the unearned-revenue prerequisites. What
  changed:
  - **§8** the deposit button is now a three-stage payment recorder (deposit · midpoint · final),
    with the picker defaulting to the first unsatisfied stage. States plainly that only the
    deposit gates anything and why the other two prefill and challenge nothing — their targets
    live in `renderInvoice` and are not reproducible in the payments module.
  - **§9** Re-open resumes at *Active* rather than resetting to *New*; *Lost* and *Closed —
    Deposit Retained* marked terminal (the button used to resurrect a lost job as new); new note
    on the write-once delivery stamp and why it is not `completionDate`.
  - **§12** stage advance now described off recorded payments rather than the dead flag, plus an
    explicit note that the **expedited premium now reaches the midpoint and final invoices** —
    including a *re-print and re-check any rush job invoiced before now* instruction, since real
    money was under-billed.
  - §5 and §16 already described the rush premium correctly; they were documenting intended
    behaviour the invoice wasn't delivering, so they needed no edit.
- Prior pass **2026-07-30** — the lifecycle rebuild (Waves 1-4). What
  changed, and the first item is the important one:
  - **§3, §8 and §9 described automation that does not exist.** The workflow diagram had
    "Send Agreement (DocuSign)" and "Deposit Auto-Charged (Stripe)", and §8 carried a whole
    *"Automated Steps After Sending"* list — client signs via DocuSign, Stripe fires on
    signature, status flips to Active by itself. None of it was ever built. Someone
    following that manual would wait for automation that never comes. Replaced with the
    manual steps that actually exist, plus an explicit not-yet-built note naming DocuSign,
    Stripe and QuickBooks.
  - **§3** now names the three hard gates (staffing needs Won · hours need the deposit ·
    Job Plan staffing section needs Won) and says plainly that the app refuses rather than
    warns.
  - **§7** an unapproved estimate cannot be emailed, from either entry point.
  - **§8** rewritten: approve → file to Drive → send → *Mark Sent* → *Mark Signed* →
    *Record Deposit*, each recording who and when and refusing out of order. Deposit
    section covers evidence capture, partial payments, received-vs-cleared, the $10k
    instrument tier, and the certified-vs-cashier's distinction.
  - **§9** status table rewritten for the real values (New · Pending Approval · Approved —
    Awaiting Client · Won · Active · Closed · Lost · Closed — Deposit Retained), plus how
    to mark a job Won and the two different closeout outcomes.
  - **§11** the deposit gate alongside the team gate.
  - **§12** invoices now file to Drive per stage; stage advances off the recorded deposit.
  - **§15** retention table corrected — the signed agreement is **not** retained (no upload
    path until DocuSign), the client estimate and invoices now are.
  - **NEW §16a Win / Loss** — reads the client's decision, so jobs sitting at *Approved —
    Awaiting Client* are no longer counted as won. Expect the number to read lower and truer.
  - **§17** per-person PINs, and stated plainly that a PIN is attribution not security
    since the file is public.
  - **Also fixed a pre-existing defect:** the manual overflowed to 774px on a 390px phone
    (a wide table plus unbreakable `<code>` paths). It is a field document; it now has a
    `@media (max-width:820px)` block and measures clean at 390/768/1440.
- Prior pass **2026-07-29** — the working-supervisor pricing, job-team
  sign-off, labour-cost-rate and mobile/field builds are all folded in. What changed:
  - **§1** phone/field-use paragraph (scrolling nav, bottom-sheet dialogs, the three
    directories' search + tap-to-contact + Quick edit, Build Estimate as the desk-first
    exception).
  - **§2** now documents the two *pricing-policy* Settings groups — concierge production
    rate (α) and the four labour cost rates — plus the note that α is pinned per saved
    estimate and never reprices an existing quote.
  - **§3** workflow diagram carries **Staff the Job Team** between agreement-sent and signing.
  - **§4** the assigned concierge is marked **optional at intake**.
  - **§5b** per-room figures are hands-on only, with the *Project coordination & logistics*
    line reconciling them to the totals.
  - **§5c** rewritten: crew auto-sizing, the **"crew size moves the price"** warning (a
    bigger crew finishes sooner so the concierge bills less — the estimate goes DOWN; never
    carry a crew size between estimates), difficult access = work pool only, multiple heirs
    = coordination only, premium = flat +25 coordination hrs.
  - **§5f** dispositions add hours, split on-site/off-site by the comes-to-the-property vs
    goes-out-to-them rule, and on-site presence counts against the day target.
  - **NEW §5i "Hours, Crew Size & Timeline"** — the whole working-supervisor model in one
    place: the three engine outputs, the four formulas, a row-by-row map of the Estimate
    Summary panel, crew sizing + mobilization floors + the 7-hr crew day, the green/amber/red
    badge semantics, the 2-concierge load check, and a **core-team reach table** (2 PS hold
    the 10-day target to ~11,900 sqft Downsizing / 8,000 Cleanout / 5,400 Estate Settlement /
    4,700 Probate / 3,600 Contested — computed from the live engine constants, not estimated;
    recheck if `ENGINE_K`, `JOB_STEPS` PS coefficients, α, `TARGET_DAYS` or
    `PRODUCTIVE_HRS_PER_DAY` move).
  - **§11** new **"Staffing the job"** subsection (the gate, placeholders, locking, Revise
    team, one-person-one-role-per-date) and Log Hours rewritten — it is a per-date team sheet
    whose roles come from the roster, not the old "role (TC / PS / Specialty)" dropdown.
  - **NEW §12a Contractors** — the tab had no section at all, and it is now load-bearing for
    margin (a named person's own rate beats the Settings placeholder).
  - **§13 / §14** search, tap-to-contact, Quick edit / Full edit split.
  - **§16** split into *what we bill* and *what we pay*, incl. the founder-rate fallback for
    an unresolvable concierge.
  - Also fixed a pre-existing malformed `<div class="note">…</p>` in §2.
  Still thin / deferred until the app is fully built: **Win / Loss** tab, and the full
  labor-job Job Plan phase playbook detail.
- *Open question (discussed, NOT built — flagged rather than assumed):* should the Job Plan
  tab itself be gated on the agreement having been sent?
- Prior pass **2026-07-15** (estate documentation build, Phases 1–3:
  documentation-level switch at intake §4 + chain-of-custody now driven by it not the
  premium rate §11; §5b collapsible/launch-collapsed room sections; §5f vendor-mapped
  15-option disposition list; new §5g Vehicles & Watercraft (Saving → §5h); §10 item
  inventory capture on room cards + the 13-category taxonomy; new **§10a Estate Inventory**
  tab — manifest, estimate→inventory bridge, appraiser roster, $3k guardrail, valuation
  basis + §2032 alternate valuation date, asset-track, custody log, snapshots, and the
  Court Inventory / Disposition Ledger / Appraisal Worklist exports; §1 interface notes
  for sticky nav, scrollable modals, alphabetized dropdowns).
  Also built: the **Drive folder consolidation** (Photos + Asset Documentation merged into
  one shareable **Estate Inventory** subfolder) and **in-app counsel sharing** (named-viewer
  Share w/ Counsel + Revoke on the Inventory tab). §4/§15 Drive-folder docs updated to match.
  ~~ACTION REQUIRED: redeploy `apps-script/main-sync.gs` + `apps-script/saveInventory.gs`.~~
  **Redeployed 2026-07-28.** A backward-compat alias keeps any pre-merge job folders working.
  Prior pass 2026-07-14 (added §13a Category Group & Category taxonomy — group required and
  dictates category, self-serve new categories, group→estimate-menu/fee routing table;
  noted the data-driven "From directory" options in the §5d third-party-vendor and §6a Home
  Prep item dropdowns). Prior pass 2026-07-08 (Home Prep for Sale standalone + streamlined
  Job Plan, Referral Partners tab, Vendor Directory section, beds/full/half baths,
  referral-source linkage, nav order incl. Win/Loss first, Vendor + Referral Apps Script
  URLs in Settings).
- **The engine facts the manual now asserts** — if any of these change, §5i and §16 are wrong
  and need editing in the same commit: `JOB_STEPS` columns are *off-site coordination* and
  *hands-on work pool* (NOT TC hours and PS hours); the pool is cleared by `(n + α)` pairs of
  hands, so `H = W/(n+α) + fixed on-site`, billed PS = `n × W/(n+α)`, billed TC =
  `H + off-site`; duration is PS-gated off `H / PRODUCTIVE_HRS_PER_DAY`; collections on-site
  presence (`COLLECTION_HOURS.on`) is added to `H` flat and never divided; the 2nd concierge
  fires on `TC_DAY_CAP` (10 hrs/day, coordination spread over `COORD_SPREAD_DAYS`) and changes
  neither fee nor duration; the timeline badge is amber only when over target *with* crew
  headroom (`requiredPS < 6`); `COST_RATES` = founder TC $100 / contractor TC $60 / PS
  Standard $30 / Senior $35, with a named contractor's own `rate` taking precedence and the
  **founder** rate as the conservative fallback for an unresolvable concierge.

## Unearned revenue prerequisites — BUILT 2026-07-30
Full spec + line-verified findings: `UNEARNED_REVENUE_SPEC.md`. Only §10 steps 0-1 are built —
the QuickBooks posting layer is deliberately NOT, pending Laura's September chart of accounts.
- **The 20% expedited premium never reached the invoice.** `RUSH_PCT` was quoted, shown on the
  client estimate, persisted on the saved estimate and inside `est.havellinTotal` — but
  `renderInvoice` rebuilt `totalMidBasis`/`totalFinalBasis` from components and had **zero**
  references to rush. A rush job was deposited WITH the premium and billed WITHOUT it: on $100k
  of services the client agreed $120k and the invoices collected $100k. A third consequence hit
  the client's own document — `overUnder` compared a rush-exclusive actual against a
  rush-inclusive estimate, so every rush job landing exactly on budget printed *"came in under
  estimate by $20,000 — credit applied."* Now: rate **pinned per estimate** (`est.rushPct`, the
  way α is), amount trues up with each basis, excluded on fixed price (already in the flat fee),
  computed **before** `coTotal` so it never lands on change orders, and shown as its own line on
  both invoice bodies. **Don't "simplify" this back into a single total** — the pin and the
  pre-CO ordering are each load-bearing.
- **A negative final invoice is CORRECT and was left alone.** `_amtDueBox` already renders it as
  a green Credit and `overUnder` already says "came in under estimate". A job running far enough
  under estimate really did overcollect via the 75% taken by midpoint. Fixing rush reduces
  spurious negatives; it does not remove real ones, and it shouldn't.
- **Payments now carry a real stage.** `saveDeposit` hardcoded `stage:'deposit'`, so midpoint and
  final money was invoiced and never captured. New `PAYMENT_STAGES`, `stagePaidTotal(job,stage)`,
  `jobPaidTotal(job)`; `depositPaidTotal` is now an alias so no caller changed meaning.
  `isJobFunded` still reads **deposit only** — a midpoint cheque of any size must never fund a
  job (there's a test). The short-payment challenge stays deposit-only because it is the one
  stage whose target the app can derive; midpoint/final targets live in `renderInvoice` and
  duplicating that engine would just let the copies drift.
- **`midpointInvoiceSent` was never written by anything** — initialised false at `4633`, read by
  `defaultInvStage`. So every funded job pinned to the midpoint invoice and the final was
  unreachable. Same dead-flag shape as Wave 1's `markDepositReceived`. Stage now advances off
  recorded payments.
- **One transition map, finally.** `JOB_TRANSITIONS` + `jobActivationBlockers()` +
  `applyJobTransition()` replace the two hand-synced copies in `activateOrCycle`/`cycleStatus`.
  `closed` now cycles to **`active`** (the button always said *Re-open*), not `new` — a mis-tap
  used to throw a delivered job back to the start, and once recognition hangs off delivery that
  tap would un-recognize revenue. `lost`/`closed_retained` were missing from the map and fell
  through `|| 'new'`, silently **resurrecting a lost job as brand new**; they're terminal now.
- **`deliveredOn`/`deliveredAt`/`deliveredBy` stamped WRITE-ONCE** on first close. Reopen/reclose
  does not move it. This is the field revenue recognition will read; there was previously no
  record of delivery at all (`completionDate` is the intake *target*).
- Left alone on purpose: the `hvlId || String(jobId)` fallback at `9906` is a **court inventory**
  export where a blank ID cell is worse than a numeric one. The spec's fail-loud rule is for the
  GL path, which does not exist yet.
- ~~⚠️ **`manual.html` needs a reconciliation pass** — §8 (payment recording is now three stages,
  not deposit-only), §9 (Re-open resumes at Active; lost/retained are terminal), §12 (invoice
  stage advances off recorded payments; expedited-delivery line on midpoint + final).~~
  **Done 2026-07-31**, and re-verified in the 2026-08-01 pass. This flag outlived its fix by a
  day and read as outstanding work; clear these when the pass lands.

## Client lifecycle rebuild — Waves 1 + 2 BUILT 2026-07-30
- **Wave 1 shipped.** Per-person PINs (`MANAGER_PINS`, `resolvePin`) — Anthony `3010`,
  Ashley `4020`; approvals now record who actually typed the PIN instead of a constant.
  Attribution, NOT security — the file is public, so the PINs are readable in source.
  Unapproved estimates can no longer be emailed. Service type / sqft / premium freeze once
  the estimate is approved (contact edits in the same save still go through). Agreement
  stops filing blank templates on every render and files the approved one on approval;
  client estimate and every invoice now auto-file to Drive. Margin panel states what the
  50% deposit actually covers and warns in dollars when it does not cover cost — the 30%
  walk-away floor is deliberately left alone (pricing policy, §5a).
- **The deposit path was dead code**, worse than the audit found: `markDepositReceived`
  read `agr-job-select` (no such element — the picker is `agr-job`) so it always bailed,
  and its button's `display:none` was never cleared by anything. `depositReceived` could
  never become true while SEVEN sites read it, so `defaultInvStage` pinned every job to the
  deposit invoice forever and three blocker lists showed "Deposit not received" for life.
  Now three ordered steps — mark sent → mark signed → record deposit — each recording who
  and when, each refusing out of order. Deposit captures amount/date/method/reference/payer,
  prefills 50% of the approved total, asks before accepting anything short. Cheques leave
  `clearedOn` null; wire/card/cash set it. Personal cheque ≥ `LARGE_DEPOSIT_THRESHOLD`
  ($10k) is recorded and flagged `policyException`, never refused.
- **Also fixed:** `saveClientEdit` ended in `renderJobDetail()`, which does not exist — so
  every client edit threw after saving, and the drilldown never refreshed. Repointed at
  `renderClientDashboard`.
- **Wave 2 shipped — the `won` model.** The app had no concept of won: win/loss reporting
  counted `status==='active'||'closed'`, and `checkPin` set `active` the instant a MANAGER
  approved OUR OWN estimate. The win rate measured how often we approved our own work.
  Now `checkPin` sets **`approved`**, and a new **`won`** status is set by an explicit
  client decision (`openWonModal`/`confirmMarkWon`) capturing method (email/call/text/in
  person), date, the client's words, and who logged it — an undocumented phone call is
  challenged, since the note is the only record it happened. `isJobWon()` is the single
  reader and migrates legacy `active`/`closed`/`closed_retained` jobs as won.
- **Statuses now:** `new → pending → approved → won → active → closed`, plus `lost`
  (died before payment; also set when a won job withdraws — won-then-withdrawn is not a
  win) and `closed_retained` (died after the deposit; keeps `won=true` because it produced
  revenue). Both `activateOrCycle` and `cycleStatus` carry the transition map — they are
  duplicates, change both. `active` still requires signature + deposit via their existing
  blockers; `checkPin` used to bypass that entirely.
- **Gates now live:** staffing (`confirmJobTeam`) refuses an unwon job; the Job Plan
  withholds the staffing/hours section until won (it previously tested `estRec.approved` —
  the manager's PIN — so it looked like this rule while enforcing a different one).
- Remaining: Wave 3 (payment record → DocuSign → Stripe → QB), Wave 4 (hours gated on
  `funded`). 222 jsdom checks green.

## Client lifecycle rebuild (decided 2026-07-30, NOT yet built)
- Full findings + target state machine + build order: `LIFECYCLE_AUDIT.md`.
- Audit found **all three hard business rules unenforced**: no deposit check anywhere in the
  Job Plan/staffing/hours path; the Job Plan gate at `11244` tests the *manager's* PIN, not
  client approval; and there is no concept of *won*. 82 claimed hard gates tested, 66 refuted.
- **Decided:** acceptance is informal (email/call/text) so `won` and `contracted` stay separate
  statuses; DocuSign for the signature record; deposit is **NEVER** waived, so the `funded`
  gate is unconditional; `funded` is machine-observed via Stripe + QuickBooks and never keyed
  by hand; per-person PINs (Anthony, Ashley) replacing the literal `3010`; invoices always
  auto-filed to Drive; a job dying pre-payment is `lost`, post-payment is `closed_retained`
  with the deposit kept.
- **Cheques are the NORMAL payment path, not an edge case** — elderly clients in person, trust
  officers and law firms institutionally. So `funded` is **not** API-only: a founder or
  concierge may record a payment *with evidence* (amount, date, method, reference, payer, and a
  photo of the cheque, all attributed). The boolean `depositReceived` is replaced by a
  `job.payments[]` list, and `funded` fires when deposit payments sum to =50% of contract total
  — which handles partial and multiple cheques. Stripe sets `clearedOn` instantly for cards; QB
  reconciles afterwards and flags anything that never banked or banked short. Work starts on
  *received*, not *cleared* — waiting on clearing costs 3-5 days per job and collides with the
  scheduling pressure that drove staffing-ahead. See §6a-6d.
- **Large deposits tier the INSTRUMENT rather than delaying the job** (§6c). Above a threshold
  (start $10k, a Settings value not a constant) a personal cheque is not accepted: **wire
  preferred, cashier's cheque accepted**. Work still starts on received at every size. Three
  things to get right in the agreement language: a *certified* cheque (drawn on the client's
  account, bank secondarily liable) is NOT a *cashier's* cheque (drawn on the bank's own
  account, bank primarily liable) — name the latter; neither is bounce-proof, since counterfeit
  cashier's cheques are a common fraud and a bank can reverse weeks later on a forgery, so
  verify large ones by phoning the ISSUING bank on an independently looked-up number; and a
  wire beats both, being final on receipt — which is also what trust officers and law firms
  do routinely, so it is the easier ask of exactly the payers sending the largest amounts.
  The accepted methods must appear on the agreement AND the deposit invoice, or the tier never
  reaches the client before they go to the bank.
- **Build order is forced, not preferred** (§7a): correctness fixes → the `won` status model →
  DocuSign, then Stripe, then QB → *only then* the deposit gate. A hard gate with no override
  is unsafe until the field it reads is reliably populated; turning it on early would stall
  real jobs and the first workaround would hollow out the rule permanently.
- **Open, needs counsel:** the retained-deposit clause (§8.6). Model the state now; do not
  treat the money as earned until the agreement language exists.
- **RESOLVED 2026-07-30 — the 30% line stays, and it is a REFERENCE not a floor.** Anthony:
  the 30% is arbitrary, the panel is there so a discount does not quietly eat the profit, and
  in practice a job needing that discount is one to walk away from rather than price down to.
  So no hard change to the number — but the labels were actively inviting the discount they
  were meant to discourage, and contradicting the deposit-coverage line beside them:
  *Min Viable Quote* asserted that quoting at 30% is viable, and *Negotiation Room* framed the
  gap as budget to spend. Renamed to **Price at 30% Margin** and **Above Reference** (purely
  descriptive), badge reads "At or below the 30% reference — hold firm", and `manual.html` §16
  now states the panel is an indicative profitability readout with a flag, not a discounting
  tool. `walkAway` / `negotiationRoom` keep their variable names; only the framing changed.
- One correctness bug worth fixing regardless: `markDepositReceived` (`6420-6433`) sets
  `depositReceived` AND `agrSigned` from one button, and `6426` is the only `agrSigned` write
  site in the file. There is no `agrSent` field at all.

## QuickBooks Online — setup decisions (2026-07-30, account not yet created)
- Stripe is already set up. **Neither Stripe nor QBO is required to close the payment loop** —
  the manual payment record with evidence already funds a job, unlocks hours and advances
  invoicing. They add card acceptance and reconciliation, not the loop itself.
- **Deposits are a LIABILITY until the work is performed** (customer deposits / unearned
  revenue), not income on receipt. Anthony confirmed. Get the exact treatment signed off by
  the accountant — it depends on cash vs accrual.
- **Vendor work is PURE PASS-THROUGH.** The vendor bills the client directly; Havellin takes
  only the fee on top. So vendor money never touches Havellin's books — not as revenue, not
  as COGS. **The app already models this correctly**: `havellinTotal = tcFee + psFee +
  pkgCost + smf + gcFee + stagerGcFee + prepFee` and `calcVendorTotals()` returns
  `v.cost * 0.15` (the FEE, not the cost); vendor costs live only in `grandTotal`. Two things
  follow correctly from that and must not be "fixed": the deposit is 50% of Havellin's fee
  rather than of the vendors' money, and margin % is measured against Havellin revenue rather
  than inflated by pass-through.
- Chart of accounts that follows: **revenue** — concierge labour · specialist labour · moving
  materials · vendor management fee (15% SMF) · general contracting fee (30% GC) · home prep
  coordination fee. **Cost of services** — contractor labour (the 1099 spend) · materials
  purchased. **Liability** — customer deposits. Expect the P&L to read much smaller than the
  dollars moving through the jobs; that is correct.
- **The boundary that keeps pass-through clean:** never pay a vendor and rebill the client,
  even as a one-off convenience. That single transaction becomes gross revenue AND an expense
  and breaks the agent position. If it ever happens it needs its own account so the accountant
  can see it rather than having it buried in the management-fee line.
- Contractors need **1099 flags on their vendor records from day one**; retrofitting in
  January is miserable. Customers/jobs need setting up if P&L-by-job is wanted (it is — that
  is most of the reason to connect QBO at all).
- **Known defect to fix before anyone relies on it:** `generateStripeLink` posts with
  `mode:'no-cors'`, so the response is opaque and unreadable. It reports *"Stripe payment link
  generated and sent to billing@"* unconditionally — including when the Apps Script endpoint
  is missing or erroring. Nothing reads back from Stripe at all; there is no webhook and no
  write to `clearedOn`.

## Quo contact sync (started 2026-07-28)
- Bigin is being retired. Quo is the dialer directory, not a CRM — the app already
  holds the pipeline/status data. Calling from the office line with caller ID is the
  whole point; texting is deliberately out of scope (metered per segment, and cold SMS
  carries a TCPA/10DLC consent burden that calling does not).
- `syncQuoContacts` lives in `referral-partners-backend.gs`. One-way push, sheet is the
  source of truth. Partner `uid` → Quo `externalId`; the returned Quo id is written back
  to a new `quo_contact_id` column, and that local id is what decides POST vs PATCH.
- Endpoint constants **both confirmed 2026-07-28** from the Authentication curl example:
  host is `https://api.quo.com/v1` (it MOVED in the rebrand — `api.openphone.com` is
  dead) and the header carries the raw key with no `Bearer ` prefix. Either one wrong
  returns 401, which reads like a bad key.
- Run `testQuoAuth` before anything else — a read-only `GET /phone-numbers` that proves
  key + host without touching contacts, so auth failures don't masquerade as sync bugs.
- Also needs `QUO_API_KEY` in Script Properties. Not exposed over HTTP yet, by design:
  run `dryRunQuoSync` from the Apps Script editor first, then `pushQuoSync`.
- **The app's tap-to-call/text buttons stay on `tel:` / `sms:` — do NOT route them to
  Quo.** Decided 2026-07-28. In the field you're on a job and want your own cell: "hey,
  I'm on site, where are you?" Quo is the deliberate opposite move — open the Quo app to
  introduce yourself to a new vendor or partner from the office line and look official.
  Two tools, two moments; wiring the app buttons to Quo would collapse them.
- An id is reused only when the row's `quo_external_id` matches the identity being
  synced now. Without that, four partners coming off a shared switchboard onto direct
  dials would each PATCH the firm contact in turn, each overwriting the last. A contact
  the directory walks away from is reported once as an `orphan`, and `pruneQuoStaleConfirm`
  deletes it.
- **One Quo contact per NUMBER, not per partner.** A switchboard shared by several
  partners syncs as the firm (`externalId` `firm:+1…`, display name = firm, role
  "Main line") because naming it after one of them is wrong on most inbound calls.
  Members keep individual contacts whenever they have a direct line. If members of a
  shared number disagree on firm, it's reported as a conflict and left unsynced.
- **LIVE since 2026-07-29.** Partners first (63 contacts: 58 people + 5 firms), then
  the full push: 136 vendor contacts created and the 63 partners updated in place,
  0 failed. Verified from the Quo side, not just the log — the Comiter firm contact
  kept its id with createdAt 13:03 / updatedAt 13:35, so the re-push matched rather
  than duplicated. **199 contacts live.**
- **Retiring a vendor: mark `Do Not Use`, don't delete the row.** Both drop it from the
  sync identically, but the status keeps why-we-stopped in the app so nobody re-contacts
  them in six months. Deleting the row throws that away. Either way its Quo contact is
  reported `STALE` on the next run and removed with `pruneQuoStale(true)`.
- **DELETE works — verified 2026-07-29.** `testQuoDelete` returned HTTP 204 and the
  follow-up GET 404, so the contact is really gone rather than archived. That check is
  worth keeping: an API that 200s and only archives would otherwise look identical. With no argument it picks the first
  STALE contact itself, because **the Apps Script Run menu passes no arguments** — any
  entry point meant to be run from that menu has to work argument-free. Same reason
  `pruneQuoStale` previews and `pruneQuoStaleConfirm` is what deletes. Pruning is kept
  OUT of `pushQuoAll` on purpose: a push runs often and should never remove anything.
- **Stale contacts are reported.** Every run diffs what Quo holds under our sources
  against what the directories still produce; anything left over is logged as `STALE`
  with its contact id, and `pruneQuoStaleConfirm` removes them. Without that, a
  retired vendor's contact would sit in the dialer forever. This first
  showed up when the vendor sheet went 152 → 150 rows and the run reported `update=197`
  against 199 live contacts.
- Confirmed by that same check: a PATCH *does* honour a changed `source` — the partner
  contacts moved from the legacy `Havellin` to `Havellin Referral Partner` on update.
  Keep `QUO_SRC_LEGACY` in the read list anyway; it costs nothing and any contact
  created before the rename still resolves.
- **Now covers all three directories.** The sync moved OUT of `referral-partners-backend.gs`
  into `apps-script/quo-sync.gs`, which is added as a SECOND FILE (`Quo`) in the same
  Apps Script project — partners via the bound sheet, vendors and jobs via openById.
  One key, one project, one run. Never paste the old per-partner version back beside
  it: Apps Script shares global scope across a project's files and they collide.
- Grouping is **global across all three sources**, not per-sheet — a number in both the
  vendor and client sheets is still one number, and two contacts holding it would
  reintroduce the ambiguity the firm collapse exists to remove.
- **No write-back any more.** The run starts by reading Quo for everything under our
  sources and building externalId -> id. Derived state can't drift from what Quo holds,
  and nothing is written to a source sheet — which matters for jobs, whose fields live
  in a JSON blob owned by main-sync. `quo_contact_id`/`quo_external_id` in the Partners
  sheet are now historical.
- `source` is set per type (`Havellin Referral Partner` / `Vendor` / `Client`) because
  list-contacts filters on it. The old flat `Havellin` value is still matched on read so
  the original 63 update rather than duplicate.
- Vendors with status `Do Not Use` are excluded — a vendor you decided not to call does
  not belong in the dialer. Client names are split first/last, suffix-aware (`Pressly Jr.`,
  `Hennessey III` keep the suffix on the surname).
- **Clients are gated OFF** (`QUO_SYNC_CLIENTS = false`). Plumbed and tested, but the
  jobs sheet still holds dummy records while the app is tuned. Flip to true when real
  jobs are flowing — target October 2026. Nothing else needs changing.
- Vendor identity is the sheet's `UID` column (verified populated + distinct on all 152
  rows), not the row index — a cleared row that gets reused would otherwise inherit the
  previous vendor's contact.
- Verified against the real exported sheets 2026-07-29: 79 partners + 152 vendors →
  **199 contacts** (63 partner + 136 vendor), 20 skipped for no dialable phone, 2
  duplicate vendor rows, 1 conflict. No number appears in more than one source.
- **SUPERSEDED 2026-07-31 — a multi-trade vendor is now ONE row, categories separated by
  `;`.** `Art Appraiser; Antiques & Furniture Appraiser`. It used to be one category per
  row, so a firm doing two things was two rows — which meant two ratings, two statuses,
  two contact histories, and a call logged against one being invisible on the other.
  `category_group` stays a single value per row and is unchanged; only `category` went
  multi-value. **Semicolon, not comma:** `Specialty Vendor (art handler, etc.)` contains
  a comma, 11 category names contain `/` and 8 contain `&` — none contains `;` (checked
  against all 65 names the app references). Whitespace around it is trimmed.
  - App: `vendorCats(v)` splits, `vendorPrimaryCat(v, prefer)` picks the heading to file
    under. A job-plan dropdown files the vendor under **the category that slot asked
    for** and lists it **once** even when the slot maps to several of its categories; the
    Vendors tab tree lists it under **every** category, because that is a browse view and
    the whole point is finding it under either heading. Counts read the row array, so a
    multi-category vendor is not double-counted.
  - Quo: one row now yields one contact carrying every category as a tag, role joined
    with ` / ` (`Landscaper / Pest Inspection / Treatment`).
- **The row-merge path in `quo-sync.gs` is KEPT even so.** It still catches rows never
  merged in the sheet and the same firm reached through a second listing. Rows sharing a
  number and a name merge into one contact carrying every category, with the role naming
  all of them. An early version kept only the first row's category and called the rest a
  duplicate to clean up; that was wrong and threw away half of what those vendors do.
- **Vendors are keyed by ROW INDEX** (`vendorIdOf` returns `v._row`), so a job's saved
  vendor points at "row 7", not at a vendor. Deleting a row shifts every row beneath it
  and **re-sorting scrambles all of them** — either silently repoints an assignment at
  whoever now occupies that number. This happened for real on 2026-07-31 during the
  multi-category merge (rows deleted *and* re-sorted).
  - **Fixed by making the NAME the identity.** Every write site already stored
    `rec.vendorName` (plus contact/phone/pricing) at assignment time, so the row was only
    ever a hint. `resolveJobVendor(rec)` trusts the name when the two disagree, breaks a
    tie on phone, **repairs `rec.vendorId` in place** so it converges, and falls back to
    the stored name if the vendor has left the directory entirely. `_vendorRefLine` and
    all four Job Plan pickers go through it (`_selVendorId`).
  - **Money was never exposed**: `getVendorActuals` reads `rec.quote` and `rec.vendorName`
    off the job record and never looks a vendor up by row. A scrambled sheet could
    misreport a *contact*, never a cost.
  - `auditJobVendorRefs()` in the console lists any slot whose row no longer matches its
    stored name. Re-sorting the sheet is now safe.
  - Still worth doing eventually: key on the `uid` column like `quo-sync.gs` does. Less
    urgent now that resolution is name-first.
- **Several business names on one number also merge**, under the combined name, and are
  still reported — two genuinely unrelated businesses on one line is a data problem, and
  that report is where it shows. Better is to fix the sheet: O'Hara's two rows were
  renamed to one `O'Hara Landscape & Pest Control` on 2026-07-29, so it now syncs as a
  clean single contact with no conflict.
- **A shared number's role depends on who is behind it.** Partners on a switchboard get
  `Main line` — their individual titles ("Partner / Shareholder") say nothing useful
  about an incoming call. Vendors get their trades joined (`Landscaper / Pest Inspection
  / Treatment`), because there the rows are services rather than people, and that tells
  you what the call is about before you pick up.
- **Tag taxonomy** (built from closed-list fields only — `title` is deliberately NOT
  tagged: 54 distinct free-text values across 79 partners would be 54 unfilterable tags):
  partners get `Referral Partner` + `partner_type` title-cased (Estate Attorney 35,
  Wealth Manager 22, Trust Officer 21, Allied Vendor 1); vendors get `Vendor` +
  `category_group` (5 values) + `category` (42 values), giving a coarse and a precise
  filter without choosing between them; clients get `Client`. 53 distinct tags, max 3
  per contact. `role` stays as display text — it is free text and Quo cannot filter it.
- **Tags wired 2026-07-29.** The workspace "Tags" property is a multi-select custom
  field, key `6a6a05ce6910765c2ebc68b6` — an opaque id, NOT the display name, so
  renaming the property in the Quo app is safe. Blank `QUO_TAGS_FIELD_KEY` to turn
  tagging off without touching anything else.
- **A multi-select property only recognises values that exist as OPTIONS on it.** The
  API accepts and stores anything (HTTP 200, reads back fine), but the Quo app renders
  an unregistered value struck through. Typing the value into the field in the Quo app
  creates the option, and the struck-through chip then reads as valid. So the order is:
  create every option first, then re-run `pushQuoAll` — one run rewrites all 199 against
  a property that now recognises them, which beats fixing contacts by hand.
- 54 options are needed for the full taxonomy: 3 top-level (Referral Partner / Vendor /
  Client) + 4 partner types + 5 vendor groups + 42 vendor categories.
- The `customFields` payload shape is the only part not taken from the docs, so
  `testQuoTags` proves it on ONE already-synced vendor (real sync payload, defaultFields
  included so a replace-style PATCH can't blank a name) before 199 contacts depend on it.
  Run it before the first tagged `pushQuoAll`.

## Pricing & billing basis (decided 2026-07-30)
- **BUILT — T&M is the default on every service.** The concierge may quote an individual
  estimate as a firm flat fee instead, on any job **except probate and contested probate**,
  where the option is withheld outright: those expenses are court-reviewed and a flat fee
  that can't be tied back to logged time is what gets questioned. `isTMOnly(svcKey)` is the
  single source of that rule — the toggle is disabled, `calcAll` clears a stale checked box
  and reports it, and `toggleFixedPrice` guards the one entry point that writes a fee.
  Replaced a soft "confirm this is appropriate" warning that left the fee in place.
  **Estate Settlement is deliberately NOT on the list** — private engagement with a family
  or trustee, no court reviews the fee. It used to be lumped in via a `courtBilled` flag
  that conflated "estate work" with "court-supervised"; do not put it back.
  Nothing changed about the default — `e-fixed` is unchecked for every service.
- **BUILT — expedited delivery is a flat 20% premium on the TOTAL (`RUSH_PCT`), never a rate
  multiplier.** Do not "improve" this into a markup on the TC/PS hourly rates: rates outside
  NASMM norms read badly to a client comparing quotes, and a named line is clearer and easier
  to defend. A manual `e-rush` toggle, charged on the Havellin services total **after** the
  preferred-client discount (so the discount is never computed on the premium) and never on
  vendor costs. Held out of the `updateRefBox` comparison, or every rush job would read as
  above the range for its property size. Excluded on Home Prep for the same reason fixed
  price is — its whole staffing column is hidden, so the toggle isn't reachable.
  Independent of billing basis: rush applies on a T&M probate job too.
  A **sliding scale was considered and rejected** — fine brackets invite a client two days
  across a boundary to argue, and one flat number is what got chosen. If it ever gets tiered,
  key it to **compression** (natural vs requested duration) and not to runway.
  This **replaced** the runway-keyed `rushMultiplier` (1.00→1.50 over 90/60/45/30 days),
  which measured calendar distance rather than tightness — a 3-day condo with a 40-day runway
  was premiumed as a rush — and only ever reached `_fixedPriceSuggested`, so it did nothing
  on a job left hourly, i.e. every job by default. Don't reintroduce it alongside the flat
  premium; they would double-count.
- **NOT BUILT — the crew-compression discount.** Adding specialists without adding a
  concierge LOWERS the quote (~15% going 2→6 PS), because the fee depends on the **TC:PS
  ratio, not the absolute crew size** — billed hours = headcount × elapsed, and elapsed is
  inversely proportional to headcount, so scaling both sides is exactly fee-neutral while
  halving the calendar. Correctly priced (a 1:6 job really does have less concierge
  involvement) and it can't leak between jobs — a fresh job resets the slots to 2 and a
  saved estimate restores its own crew. Remaining gap: **a floor on `_fixedPriceSuggested`**,
  since the prefill is computed off the compressed solve, so toggling fixed-price *after*
  staffing up prefills the discounted number.
- **NOT BUILT — contractor concierges as real simultaneous coverage.** The highest-value
  item discussed. 2 TC + 4 PS bills identically to 1 TC + 2 PS (same fee, same hours) in
  **half the calendar**, and moves ~26 founder hours per mid-size estate onto a $60
  contractor. Three parts that must ship together: the solve has to let a 2nd concierge
  contribute production (`(n + tc·α)` — today `tcCount` is only a load check and never
  touches hours or duration), crew sizing has to scale both sides, and **the margin panel
  has to cost two engaged streams instead of one** or every dual-coverage job overstates
  margin by ~$1k.
- **NOT BUILT — α should decline with crew size.** It is a flat 50% at every crew size, which
  claims the concierge is half hands-on while directing six people. A declining curve is more
  honest and recovers roughly a third of the compression discount on its own.
- **REJECTED — a disposal-vendor offset against the `disposition` hours. Do not re-propose.**
  It looks like a double charge (disposition is 43% of the Home Cleanout pool, and haulers are
  billed at cost + 15% on top) but it is not: Havellin is the fiduciary who must review every
  item, the haulers only remove what they are told to, and Havellin often stages the discards
  by room or into the garage for pickup. Those hours are real Havellin labor. The premise also
  assumed a hoard-level volume score, and Havellin does not take hoards.

## Backlog / don't forget
- ~~Warm up the **estimate email language** — personal touch tying back to the in-home
  walkthrough. `buildEstimateMailto()`.~~ **Done 2026-07-08.**
- **Contractor tab — remaining directory upgrades.** Search, tap-to-contact, and a
  Quick/Full edit split shipped 2026-07-28. Still NOT ported from Vendors / Referral
  Partners: the status dropdown + rating under the name, the highlighted last-contact
  bar, Contacted-on-first-outreach auto-advance, edit-as-modal, and PIN-gated delete.
  Contractors live in the main sheet and the backend already has a `deleteContractor`
  action (`apps-script/main-sync.gs`), so a contractor delete is partly wired already.
- ~~ACTION REQUIRED — redeploy `vendor-directory-sync.gs` (`deleteVendor`) and
  `referral-partners-backend.gs` (`deletePartner`) for PIN-gated delete.~~
  **Redeployed 2026-07-28.** Both clear the row (not deleteRow), so row indices stay
  stable. Worth a live smoke test — first real execution was after this deploy.

## Mobile / field use (built 2026-07-28)
- A single `@media (max-width:820px)` block in `havellin.html` carries the mobile
  layout: scrolling nav strip, bottom-sheet modals, 16px inputs (stops iOS zoom-on-
  focus), stacked grids, thumb-sized buttons. It's additive and gated behind the
  breakpoint — desktop is unaffected. Put new mobile rules here rather than scattering
  breakpoints.
- **The grid trap:** `1fr` is `minmax(auto,1fr)` and that auto floor is min-content, so
  a column holding an unshrinkable child (a fixed-column table) grows wider than its
  grid and drags the whole document past the viewport. The symptom is a header/nav that
  render at viewport width against a wider scrolled page — a cut-off header with a blank
  gap. `.grid2>*,.grid3>*,.grid4>*{min-width:0}` fixes it; wrap the wide table in
  `.tbl-scroll` so it stays reachable. Reach for both together.
- Vendors, Referral Partners and Contractors all follow the same field pattern:
  free-text search (multi-word AND-ed, numeric queries match the digit-stripped phone)
  → tap-to-call/text/email → **Quick edit** (contact details only, diff-only patch,
  phones compared digit-wise) with a **Full edit** escape hatch. Keep new directories
  consistent with this.
- All 12 tabs verified at 390 / 768 / 1440px with zero horizontal overflow. Build
  Estimate is deliberately desk/iPad-first for data entry — its room tables scroll
  inside `.tbl-scroll` rather than being reflowed.
- **The dashboard drilldown was missed by the original sweep** (fixed 2026-07-28). The
  tab-level overflow check passes on an *empty* Client Dashboard — the drilldown only
  renders once you open a job, so none of its grids were ever measured. `.d-grid4` was
  still running four ~80px columns on a phone and the 8-step lifecycle strip ~42px a
  step, so labels overlapped outright. Now: `.d-grid4` → 2 columns, `.d-split2` (a new
  class replacing two inline `1fr 1fr` grids) → single-file, and the lifecycle strip +
  hours-log table scroll inside `.tbl-scroll`. **When measuring a tab, populate it and
  open its detail view first** — an empty state proves nothing.
- Two selectors in the phone block are load-bearing against everything else in it:
  `.card div{min-width:0}` and `.card div{flex-wrap:wrap}`. Anything that needs a real
  minimum width or a nowrap flex row has to out-specify them (`.tl-strip .tl-step`) or
  set it inline — a bare single-class rule silently loses.
- Not done: the table→card flip for the Client Dashboard client list (it sits in a
  sideways-scrolling container today). Invoices + Inventory were only measured from an
  empty state — re-check them with a populated job before calling them verified.
