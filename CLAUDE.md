# Havellin Palm Beach — App Notes

## Always on every commit
- **Run `tools/stamp-build.sh`. Do not edit the stamp any other way, and above all do not
  write a regex against `hdr-ver`.** It reads the ET clock itself, anchors on the span's
  full opening tag, and refuses to write if the `</style>` count or the file size moves.
  Pass an explicit stamp as `$1` only if you have a reason to.
- **READ THE CLOCK — do not increment the stamp you found in the file.** The container runs
  UTC, so get ET with `TZ=America/New_York date '+%Y.%m.%d · %-I:%M%P ET'`. On 2026-08-03
  five commits shipped with invented times (7:05pm → 11:05pm) against a real 4:17pm, because
  the stamp already in the file was treated as a counter to bump. The point of the stamp is
  telling which build is on the phone; a made-up time makes it useless and a stamp in the
  future makes it actively misleading.

### ⚠⚠ THE STAMP REGEX DELETED 368 LINES OF CSS AND SHIPPED IT THREE TIMES (2026-09-10)
`re.sub(r'(hdr-ver[^>]*>)[^<]+(<)', …, count=1)`. **`hdr-ver` occurs TWICE** — first as the
CSS rule `.hdr-ver{…}` at line 381, then as the markup span at line 770. `count=1` took the
CSS one; `[^>]*` ran on to the next `>` fourteen lines below (`.hdr>*`) and `[^<]+` then
swallowed **everything up to the `<` of `</style>`**. Commits `8185a7e`, `de7ceb7` and
`deae778` each ran it again on the already-broken file and each pushed to `main`.
- **What was gone, measured in a headless browser on the shipped build, not guessed:**
  **793px of horizontal overflow at 390px** (the phone header and nav render at viewport
  width against a page half again as wide); **field mode did nothing** — 12 tabs visible
  instead of 4; **`#print-target` rendered inline at `display:block` with ZERO `@media print`
  rules parsed**, so printing a client estimate, invoice, agreement or signing packet would
  have printed the whole app UI. 227 CSS rules against 265.
- **⚠ THE STAMP NEVER MOVED, WHICH IS HOW IT RAN FOR TWO HOURS.** All three builds kept
  reading `10:20am ET` — the regex wrote the new stamp *into the stylesheet*. Anthony sent a
  screenshot of the header to ask why his phone looked stale; that screenshot is the only
  reason it was found at all.
- **⚠ AND ALL 1606 TESTS WERE GREEN THROUGH EVERY ONE OF THEM.** The harness lifts JavaScript
  out of `havellin.html` by source text and drives it in a `vm`; **nothing in the suite had
  ever read the CSS**. A single-file app whose stylesheet no test looks at is a stylesheet
  that can be deleted silently. `tests/page-shell.test.js` is the tripwire now — the block's
  line count, the first and last rule of what was eaten, field mode, both print blocks, both
  phone breakpoints, and *no build stamp inside `<style>`*. **Revert-verified by re-running
  the original regex: 12 of the 19 checks fail.**
- **The lesson, and it is not "be careful with regexes":** the damage was invisible to the
  thing I was checking. I verified the change I *meant* to make (1606 green, the JS behaviour
  driven in Chromium) and never looked at what the edit *tool* had done to the file. **A
  scripted edit to a 1.2 MB file needs a diff read, not just a passing suite** — `git diff
  --stat` alone said `-374 +7` on a commit that was supposed to touch prose.

## Git identity — set this at the start of every session
```
git config user.email noreply@anthropic.com && git config user.name Claude
```
Do NOT pass `--author` on commits — let the repo config set both author and committer.
If the stop hook fires anyway, run `git commit --amend --no-edit --reset-author` and force-push.

## Branches
- Active feature branch: `claude/hopeful-hamilton-5sw4wm`
  (was `claude/eloquent-ptolemy-cagox5`, then `claude/trusting-edison-jh2sht`, then `claude/editable-job-type-estimates-90hbj5`, then `claude/ecstatic-feynman-b3j90u`, before that `claude/eager-euler-u5lt65`, then `claude/kind-hawking-j7iugr`, then `claude/home-transition-terminology-elllih`, then `claude/estate-settlement-pricing-3wmldo`, then `claude/vendor-save-error-pa0kib`, then `claude/box-formatting-alignment-c3z6h7`, then `claude/code-audit-document-review-jilk87`, then `claude/app-build-status-testing-mf5nq2`, then
  `claude/photo-sync-google-drive-69ykub`, then
  `claude/master-suite-cleaning-hours-g62ink`, then
  `claude/home-prep-sale-consolidation-13yxt9`; before that
  `claude/field-app-formatting-9eu5ff` and `claude/zen-ride-v4x393`, deleted from the
  remote — don't chase either.)
- Push to `main` after every commit so GitHub Pages stays current:
  `git push origin claude/hopeful-hamilton-5sw4wm:main`
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

## ⚠️ THE HISTORICAL TEST COUNTS ARE STILL NOT RUNNABLE — but there is a harness now (2026-08-24)
**A committed harness finally exists: `tests/harness.js`, `tests/run.js`, `tests/inventory.test.js`,
and `npm test` / `node tests/run.js`.** 43 checks, zero dependencies, running against the real
source. Everything below about the *older* counts still stands — those tests remain lost — but the
"nothing is committed" state that this section was written to describe is over. **Add to the
committed suite rather than starting a new scratchpad harness; that habit is what this section
exists to break.**
- The harness uses exactly the technique described below: it pulls `function NAME(` blocks and
  top-level `var` declarations out of `havellin.html` **by source text** and runs them in a `vm`
  sandbox with a minimal DOM/localStorage stub. The code under test is the real code, so a test
  cannot drift from the app. `tests/harness.js` carries the brace scanner that makes this work
  (it has to skip strings, comments and regex literals — the file is mostly HTML built in quoted
  strings, so a naive depth counter goes wrong within a few hundred bytes).
- **It earns its keep already.** Writing the firearms gate, the first version filtered the
  awaiting-authority report through `invNeedsAppraisal`. The test caught that a $900 shotgun —
  below the $3,000 threshold, so never on the worklist — was therefore reported nowhere at all.
  That is precisely the silent-failure class this section warns about, and it was found in the
  same hour it was written rather than on a job.

**The older counts — 382 across eight suites, 230, 222, 138, 136, 112, 94, 77, 50, 47, 46, 40 —
are NOT in the repository and were never committed.** Every one of those harnesses was written
into a session scratchpad and died with the session that wrote it.
- **Read those counts as a record of what WAS checked once, not as coverage you have.** They are
  still worth keeping — they say which claims were verified and how hard — but a green count
  beside a section is not a safety net, and no change you make today will be caught by any of them.
- **This has already cost real work, and the evidence is in this file.** The `MANUAL.md` /
  `CONCIERGE_GUIDE.md` converter is scratchpad-only by the same habit, and the fourth docs pass
  records it plainly: *"the converter is not in this session's scratchpad — so the four files were
  diffed for parity afterwards."* A pass that should have been a regeneration became hand-editing
  four files and diffing them. The harnesses will bite the same way, only more expensively — the
  things they caught (the licence claim surviving in two agreement footers, the `idx`-first restore
  silently repointing saved rooms, the tenure double-count) are all **silent** failures that no one
  notices by clicking around.
- **The fix is committing them, not rewriting them from scratch.** Anything reconstructed should
  land in the repo with a runner, in the same commit as the change it verifies. **The runner now
  exists** (`tests/run.js`), so there is no longer an excuse to write one into a scratchpad —
  reconstruct into `tests/` and it survives. The pricing engine and the client documents are still
  the two unguarded areas and still the reason to be careful there specifically.
- **Keep the harness technique — it is non-obvious and was arrived at the hard way.** Booting the
  whole 1.2 MB file in jsdom **times out**, so the working harnesses pull `function NAME(` blocks
  out by source text and drive them in a `vm` sandbox. Some suites (the intake-decedent one) do run
  real markup in jsdom, but against extracted fragments rather than the whole document. Anyone
  starting from `jsdom.fromFile('havellin.html')` will conclude the app is untestable and be wrong.
- Related and smaller: the `.md` converters for the manual and the playbook belong in the repo for
  the same reason. `manual.html` and `concierge-guide.html` stay the source; the markdown is
  generated and must be regenerated in the same commit as any edit, which is only reliable if the
  generator still exists.

## The fullness preset only ever reached the rooms already ticked (FIXED 2026-09-10)
*"when you score an entire home, how full is the house … it only scores the rooms that you have
already ticked. and when you tick new rooms as you walk through the house, they default to
whatever the defaults are … it needs to apply to any rooms that don't already have a hard coded
reference number."* App-only, no redeploy. Three more off the same pass, below.

- **⚠ THE CHIP WAS A ONE-SHOT SWEEP AND THE WALKTHROUGH IS NOT A ONE-SHOT ACTIVITY.**
  `applyVolPreset` walked `ROOMS`, skipped anything not `in` scope, and stopped. Rooms are
  ticked **as you walk**, so on the natural order — stand in the first room, say the place is
  packed, then work through the house — every room ticked after the press took
  `setRoomState`'s bare `roomDefault(rname).vol` instead. The estimator had told the app the
  property was packed and the app had agreed about the first four rooms.
- **⚠ AND IT IS INVISIBLE, WHICH IS WHY IT SURVIVED SINCE 2026-08-03.** A room sitting at 3
  because the preset never reached it is indistinguishable from a room at 3 somebody meant.
  Worse, the damage does not stay local: **volume is averaged over the rooms scored and applied
  to the whole sqft**, so a handful of unreached rooms moves the price of the **entire job**.
  Nothing on any screen could have shown it. Same silent-misprice shape as the room-coverage
  badge two sections down, and the same reason it matters more than it looks.
- **`volPresetSeed(name)` IS THE ONE DEFINITION AND `setRoomState` READS IT.** That is the whole
  fix: the preset became a **standing setting** rather than an event. Pressing it with nothing
  ticked is now the sensible opening move, so the feedback **reports rather than warns** — the
  old *"No rooms are in scope yet — tick the rooms first"* was telling people to do it in the
  order that produced the bug. A test asserts the `roomDefault(x).vol + shift` arithmetic exists
  in **exactly one place**; two copies of it is precisely how the two paths came to disagree.
- **⚠ A ROOM SCORED BY HAND IS NEVER OVERWRITTEN — Anthony's *"hard coded reference number"*,
  and it is the half that makes the standing setting safe.** `_volHandSet[id]` is set at exactly
  one site, `onVolInput` — the estimator's own keystroke — and `applyVolPreset` skips those
  rooms and re-bases everything else around them. **A typed number is a direct observation, a
  person standing in the room looking at it; the chip is a guess about the property as a whole.
  The guess does not get to flatten the observation.** Without this the fix would have been a
  downgrade: a standing preset that also overwrote hand-scores would wipe the estimator's own
  work every time they changed their mind about the house.
  - **The escape hatch is untick / re-tick, and it is why the flag is cleared in `setRoomState`'s
    `else` branch rather than anywhere else.** That branch is where the *value* is cleared, so
    the flag and the number it describes can never disagree. A flag outliving its value would
    hold a preset off a room on the strength of a score that no longer exists.
  - **The feedback says what it did NOT touch** — *"2 rooms set to Seasonal — 1 scored by hand
    left as it is"* — because a silent skip is indistinguishable from a dead button.
- **⚠ IT RIDES THE SAVED ROOM AS `volSet`, NEVER A MAP KEYED BY ROW ID.** Row ids are positional
  (`r0`, `r7`), and this file already records what trusting `idx` across a `ROOMS` insert costs:
  a saved estimate restores its scores onto whatever row inherited the number. `volSet` travels
  on the room record, so it restores through the same **section+name** matching every other
  per-room field uses. A test asserts no `volHandSet:` map reaches the snapshot.
  - **An estimate saved before today carries no `volSet`, so nothing in it reads as hand-scored
    and a preset re-bases the lot — which is exactly how that estimate behaved on the day it was
    priced.** Nothing to migrate.
- **Complexity is still untouched, and a test asserts `applyVolPreset` never mentions it.**
  Unchanged from the original build and for the same reason: *how careful* and *how much* are
  two questions, and collapsing them costs you "ordinary house, everything fragile".
- **⚠ FOUND ON THE WAY, AND THE FIX CREATED IT: `_volPreset` LEAKED ACROSS A JOB SWITCH.**
  `neutralizeEstimateView` exists because *"a Home Prep estimate bled into an unrelated Estate
  Settlement job"*, and it already drops `_estimateAlphaPin`, `_estimateCostPin` and
  `_estimateDocScope` for that reason — but not the preset, **because until today the preset
  changed no number after it was pressed.** A stale `_volPreset` only lit the wrong chip. The
  moment `setRoomState` began seeding from it, opening a fresh job after a packed estate and
  ticking a room opened it at **default+2**, priced off the previous property's answer.
  `clearAllRooms` already took the hand-set flags with it (they clear in `setRoomState`'s `off`
  branch); the preset itself now resets on the same line as the α pin, and
  `restoreEstimateToUI` re-pins it from the saved record exactly as α is.
  **The thing to take from it: a change that gives an existing variable a new reader can turn a
  harmless stale value into a pricing one, and the leak is in code you did not touch.** Same
  shape as the `assignedTCContact` fallback on 2026-09-09 — an untouched line whose blast radius
  moved underneath it.

### The tab now asks for vendors AFTER the walkthrough
*"we should move the third party vendor box … below notable collections. it makes way more sense
to assign third party vendors after you've added any notable collections because then you know
you need auction houses or appraisers or whatever … it doesn't work at the top when you haven't
even walked through the house to determine what you need yet."*

- **The card was promoted to the top of the build column on the reasoning that vendors are the
  common case on a walkthrough. True, and beside the point — you cannot know WHICH vendors until
  you have been through the house.** It is the collections and the vehicles that say there is an
  auction house, a gemologist or a boat appraiser on this job at all, so the question was being
  asked at the one moment nobody could answer it. Order is now rooms → collections + vehicles →
  vendors → materials.
- **⚠ THE PREP SHUTTLE HAD TO STOP ANCHORING ON AN ORDINAL.** `applyEstimateServiceMode` moves
  the card into `est-job-grid` on a standalone prep job and puts it back afterwards — with
  `buildCol.insertBefore(vendCard, buildCol.firstChild)`. **A position expressed as "first child"
  cannot describe a position that has moved**, so the shuttle would have dragged the card back to
  the top on the first prep job. It anchors on `est-materials-card` now; if that card is ever
  removed, `insertBefore(…, null)` appends, which still leaves the vendors below the collections.
  The degradation is the safe one. A test asserts the old expression is gone.

### "Nothing is assessed from a photograph" was not true
*"in section two, sorting, we say nothing is assessed from a photograph, and that's not
technically true. we will probably take photographs of things on-site and email them to
appraisers to determine whether or not it's even worth the appraiser coming on-site."*

- **The claim was absolute and the practice is the opposite.** The stage now says we photograph
  a piece and send it ahead **so an on-site appraisal is only booked where the item warrants
  one** — which is a client benefit, not a caveat: it is what stops them paying a call-out fee
  on something that does not need one. The promise that actually matters survives untouched:
  **anything of consequence is valued in person.** Anthony picked this over simply deleting the
  claim, and it is the better answer — the sentence now earns its place instead of denying
  something nobody asked about.
- It renders only on a job that has a valuing specialist on it; a job with none says nothing
  about photographs at all. A test asserts both directions and that the old sentence is **gone
  from the file**.

### Four presentation fixes off the same screenshots
- **⚠ THE VEHICLES CARD SAT 43px DEEPER THAN NOTABLE COLLECTIONS BESIDE IT, AND THE CAUSE IS A
  TRAP THIS FILE ALREADY RECORDS ONCE.** `new-veh-desc` carried `flex:1 1 100%`, so it claimed
  the whole tfoot row and the wrapping container pushed **+ Add** onto a second line. The two
  cards sit in `.est-pair`, whose columns are `repeat(2,minmax(0,1fr))` — **already equal
  width, measured at 618px each** — so the mismatched height was the only thing breaking the
  pair. **⚠ `flex:1 1 auto` DOES NOT FIX IT, and that is the whole lesson: the global
  `input,select,textarea{width:100%}` rule makes an auto basis resolve to the full row.**
  Measured in Chromium — basis `auto` left the input at 554px and the button still wrapped.
  **Basis 0** is the fix: the input takes what is left after the button (498px). Same rule that
  paints a bare checkbox full-width; see `.hf-tick`.
  - The card's trailing *"Add each below, then fill in its details."* went with it — an input
    and a **+ Add** button sit directly beneath it, so it described what the reader can see.
  - **Heights measured before → after, at six widths:** Δ was 43 / 26 / 43 / 43 / 43 / 43px and
    is now **-4 / -4 / 13 / 13 / 13 / 13**. The residual 13 at ≥1440px is the vehicles blurb
    still running to two lines where the collections blurb fits on one; at the widths where
    both wrap, vehicles is 4px *shallower*. Not chased further — the remaining copy is real
    guidance (KBB/NADA, collector routing) and the pair is top-aligned anyway.
  - **Noted, NOT introduced, NOT fixed: the tab overflows 63px at 1120px.** Identical before and
    after the change (checked against the stashed tree). `.est-pair` collapses at ≤1100px, so it
    is a narrow band between breakpoints and belongs to a layout pass rather than this one.
- **⚠ THE TWO DISPOSITION TABLES ON THE CLIENT ESTIMATE DID NOT LINE UP.** *"let's line up the
  auction house, appraise, flagged for disposition, flagged for disposition so they look like
  they are in one column."* Notable Collections and Vehicles & Watercraft are separate tables
  under separate bands and a reader takes their right-hand columns as **one list of answers** —
  but with default auto layout each sized its first column to its OWN content, so a short
  *Asian Art* put the disposition at 44% of the page while *Mercedes convertible* over a spec
  line pushed the one below it to 58%. `.ce-disp-tbl` (`table-layout:fixed` + a shared
  `td:first-child{width:55%}`) holds them in one column whatever the rows contain. **Set once in
  CSS, not inlined on either table** — a test asserts both tables carry the class and that no
  `width:55%` literal survives in `renderClientEstimate`. Verified in Chromium: all four values
  share an x at 1400 / 780 / 390px, zero overflow.
- **The estimate's Terms bullet *"Havellin Palm Beach is insured and bonded."* is CUT.** It
  restated the footer of the same document seven lines below, and Terms is for commercial rules
  rather than standing facts about the firm. See the licence section for the important half:
  **the footers are untouched, and whether Havellin currently holds either is an open question
  Anthony raised and has not answered.**

### The vendor figures say they are good faith, above the numbers
*"in the estimate itself for third party vendors, we need to flag at the top that these are good
faith estimates and that actuals may vary. But, obviously, these are directly billed to the
client. So the client will see the actual bill from the third party vendor."*

- **⚠ THE TWO HALVES MUST NOT BE SEPARATED, AND A TEST ASSERTS THE ORDER.** *"These may move"*
  alone is a hedge. It only reads as straight dealing beside *"and you will see the real invoice
  yourself"* — which is already true of this engagement, since every vendor bills the client
  directly. `vendorEstimateNote(opts)` is DOM-free and read by **all three** vendor surfaces
  (the third-party band, the bundled Home Prep band, the standalone prep body), because six
  client-facing surfaces each stating the vendor rule in their own words is a defect this file
  has already paid for once.
- **`.ce-lead` exists because `.ce-note` is shaped to CLOSE a table** (rounded bottom, a margin
  under it). A caveat read after the total has already been taken as a price has arrived too
  late to do its job, so this one butts onto the band above and the table below.
  - **⚠ AND THE FIRST TEST OF IT COULD NOT FAIL.** `has(src, '.ce-lead{')` also matches the phone
    override, so deleting the base rule left the check green. Caught by reverting, not by
    reading — the fourth time in this file. It asserts the **declaration** now. A stylesheet no
    test can notice the loss of is the exact shape of the regex that ate 368 lines this morning.
- **`feeTruesUp` is passed on the BUNDLED prep band and not on the standalone form**, because
  that is where the documents differ: the standalone prep Terms state it twice already
  (`vendorFeeNote(feeAlreadyStated)` plus the vendor-quote bullet), and the bundled job takes the
  T&M or fixed-price Terms arm, which never says it. The rate is **read from `prepFeeRate()`**,
  never typed — a test asserts no `'30%'` literal in the function.
- **The standalone prep form's below-table `.ce-note` is DELETED, not left beside it.** It
  restated the Terms almost word for word; the one fact it carried that is stated nowhere else
  is that the amounts are estimates, and that is what survives, moved above the table.
- **1954 committed checks** (`tests/estimate-walkthrough.test.js`, 88 new). **All twenty
  changes revert-verified individually** — every one turns the suite red on its own, including
  the two CSS rules, the prep shuttle's anchor, the job-switch reset, the vehicle input's flex
  basis and the cut Terms bullet.
- **Verified end to end in headless Chromium on the real page**, not asserted on source: the
  build column renders `est-rooms-card · .est-pair · est-vendors-card · est-materials-card`;
  pressing **Packed** with nothing ticked then ticking three rooms opens them at 5 / 3 / 5;
  hand-scoring the kitchen to 2 and pressing **Seasonal** lands 1 / 1 / **2** with the feedback
  reading *"2 rooms set to Seasonal — 1 scored by hand left as it is"*; untick + re-tick returns
  the kitchen to 1; a job switch through the real `neutralizeEstimateView` drops the preset back
  to Normal with an empty hand-set map, so the next room ticked opens at **3** rather than 5;
  both `.ce-lead` blocks render between their `.ce-band` and their `<table>`,
  the prep one carrying the fee sentence; the sorting stage prints the new photograph wording;
  390px overflow is 0. **No page errors.**
- **⚠ A PRE-EXISTING TEST ASSERTED TWO ADJACENT SOURCE LINES AND BROKE ON A TRUE CHANGE.**
  `doc-scope.test.js` pinned `"_volPreset = 'normal'; paintVolPreset();\n  _estimateDocScope =
  'full';"` — a byte sequence, not a requirement — so adding `_volHandSet = {}` beside it failed
  a check about the documentation scope. Rewritten against `resetEstimate`'s **body**. A true
  statement about a requirement should not break because a line moved.
- Manual **§5 layout map · §5b** (two new notes) **· §5d · §7** (two new notes); playbook
  **Step 2** (the standing rule and the hand-score rule in field language) **· Step 3** (the
  good-faith flag and what to say when a client asks about photographs) and **five**
  symptom→cause rows. Both `.md` copies hand-edited and **21 claims parity-checked** across the
  four files; tag balance verified on both HTML files (`manual.html`'s `<code>` delta is still
  the documented false positive at 1).

## Intake asks what is in the house, and the crew is told (BUILT 2026-09-10)
*"instead of a simple 'Notes' field, i want Two questions to ask on every intake call"* — is
there anything you need us to **find**, and anything we need to know for **safety** or that
needs special handling — over a ticked list of seven things, *"Firearms & ammunition — flag
red … This one prints on the crew brief automatically."* App-only, no redeploy: the Jobs sheet
stores `JSON.stringify(job)` in its Data column, so a nested `houseFlags` object rides the
existing sync untouched. **This is not `savePhotoRefs` — there is no column whitelist to add to.**

- **⚠ THERE WAS NO CREW BRIEF. What there was, and had been for months, is a Phase 0 checkbox
  reading *"Standing job flags read aloud to the crew"* with NOTHING ANYWHERE PRODUCING ANY
  FLAGS.** That checkbox is the whole design brief for this build and it is what the panel is
  named after. The Job Plan tab IS the crew's surface — it is what a phone has open in the
  house — and `printJobPlan` prints `#job-plan-header` along with the content, so injecting the
  panel into the HEADER (not the phase content) is what puts it on paper. Both headers get it:
  `renderJobPlan` and `renderPrepJobPlan`. **A prep job runs vendors through the same house;
  an alarm code and a loaded gun safe do not care which service was sold.**
- **THE REQUIREMENT IS NOT "intake stores an answer", IT IS "the answer reaches the crew".**
  Asking a widow on the phone where her husband kept the cash and then not telling the two
  people emptying the house is **worse than never asking**, because the person who asked
  believes it was passed on. Every test in the suite is pointed at that sentence.
- **`HOUSE_FLAGS` IS ONE CATALOGUE READ BY FOUR SURFACES** — Client Intake, Edit Client, the
  Job Plan brief and the dashboard. Intake's rows are *rendered from it* (`buildHouseFlagInputs`
  at INIT into `#i-houseflags`), not typed into the markup, and Edit Client calls the same
  `houseFlagInputsHtml('ec', job)`. **A test asserts each row's prompt and detail text appears
  in the file exactly once**, so a hand-written second copy fails the suite.
  - **⚠ The uniqueness check is on the row's PROSE, not its label, and that is not laziness.**
    Two labels are ordinary English the app already uses — *Cash* is a payment method on the
    deposit recorder and an inventory line, *Valuables* is the estate agreement's §4.3 heading.
    A label count is a false positive on those two and proves nothing on the rest.
- **⚠ `severity:'err'` IS FIREARMS ONLY. Do not paint a second row red.** Red on the brief means
  stop and do not touch — the same rule `invReleaseBlocked` already enforces on the item itself.
  A second red row costs the first one its meaning. Firearms also **sorts to the top** (the brief
  is read top-down by somebody about to open a door) and carries a `crewRule` printed under its
  note: *nothing moves without written authority, photograph it where it lies, tell the concierge
  the same day, let nobody carry one out — family included.*
- **⚠ THE RESET LEAK, AND IT IS THE ONE PLACE A STALE VALUE IS DANGEROUS RATHER THAN MERELY
  WRONG.** `resetIntakeFields` walks `INTAKE_FIELDS` setting `.value = ''`, which does **nothing
  to a checkbox**. Without `clearHouseFlagInputs('i')` the next client created in the same
  session inherits the last one's firearms tick — the exact shape of the leak the `INTAKE_FIELDS`
  comment above it already exists to describe, on the exact field where it would matter most.
  Verified in a browser: after a save, every box is unticked, every note blank, every row
  collapsed and repainted.
- **A ROW TICKED WITH NO NOTE STILL PRINTS, AND SAYS SO** — *"Ticked at intake, no detail
  recorded — ask the client before Day 1."* Silence there is indistinguishable from never having
  asked, and the panel carries its own fix the way every other blocker panel in the app does.
  **A job with nothing recorded renders NO panel**, not an empty one; every job created before
  today is that job.
- **`standingFlagLines(job)` IS DOM-FREE ON PURPOSE**, the same reason `_svcChangeConsequences`
  and `_agrScopeServices` are — the tests read the real wording rather than grepping rendered
  HTML. **Labels are PLAIN TEXT and every renderer calls `esc()`**; storing `&amp;` and escaping
  again is what printed `&amp;amp;` on a client's screen in the estimate email. A test asserts
  the contract at source, and the suite lifts the REAL `esc` rather than the harness stub, which
  does not escape apostrophes.
- **Notes survives, demoted — Anthony's call when asked.** Three surfaces read `job.notes`
  (client list, dashboard, Edit Client); dropping it from intake would leave all three reading
  *None* forever on every new job, and the two questions cover the house but not family
  dynamics, urgency or who actually decides.
- **1865 committed checks** (`tests/intake-house-flags.test.js`, 186 new). **All 17 changes
  revert-verified individually** — every one turns the suite red on its own, including the
  reset leak, both Job Plan headers, the escaping, and the CSS checkbox width.
- **Verified end to end in headless Chromium on the real page**, not asserted on source: seven
  rows render from the catalogue, the checkbox is 15×15 rather than full-width, ticking reveals
  the note and repaints the row `rgb(252,232,232)`, a full Estate Settlement intake saves with
  `mustFind`/`safetyNotes`/`houseFlags` intact, the form is blank for the next client, the real
  `renderJobPlan` writes the panel into `#job-plan-header`, **`printJobPlan` carries it onto the
  page with the firearms rule and the must-find answer**, the prep plan carries it, a flagless
  job renders nothing, Edit Client round-trips a newly-ticked row, and 390px has zero overflow.
  No page errors.
- **⚠ The global `input,select,textarea{width:100%}` rule paints a bare checkbox full-width**
  with its label stranded beside it. `.hf-tick input[type=checkbox]` scopes a size the way
  `.rtable` already does — **the phone block's `input[type=checkbox]{width:auto}` only applies
  under 820px and is not a substitute.**
- Manual **§4** (a new subsection with the row table and four notes) and **§11** (the panel on
  the plan header); playbook **Step 1** (the questions verbatim, the table, a `.stop`) and
  **Step 10** (a `.stop` on reading it to the crew) plus **four** symptom→cause rows. Both `.md`
  copies hand-edited and **22 claims parity-checked** across the four files; tag balance verified
  on both HTML files (`manual.html`'s `<code>` delta is still the documented false positive at 1).

## A room marked OUT OF SCOPE is accounted for, not missing (FIXED 2026-09-10)
*"since this is primarily a home prep, we are not cleaning out every room. so we are specifically
excluding the guest beds and baths, as well as kitchen, laundry room and half bath. the notice
i have screenshotted should pick up rooms that are out of scope, and not think that they have
not been considered in the walkthrough."* Then, minutes later: *"it does block saving the
estimate b/c we haven't scored every room. that is another bug."* App-only, no redeploy.

- **⚠ THE SCOPE TOGGLE HAS THREE STATES AND FOUR READERS HAD COLLAPSED IT TO TWO.** `roomState`
  returns `off` / `in` / `excl` and `cycleRoom` walks blank → ✓ → ✕ → blank. `excl` is a real,
  deliberate answer — `setRoomState`'s own comment says notes and media stay live on an excluded
  row *"so the crew can record WHY it's out of scope"* — and `calcAll` already collects it into
  `excludedMeta` and pins it on the snapshot at `vol:0, cplx:0, excluded:true` so it prints at $0
  on the client estimate and the job plan. **Everything downstream then read `excluded` as
  `off`.** That is the whole bug, twice over.
- **THE BADGE.** `renderCoverageBadge` was handed `roomMeta` alone, so a room marked ✕ counted
  identically to one nobody had opened. On a mostly-Home-Prep job — the guest wing, kitchen and
  laundry legitimately the client's own — it read *"Walkthrough looks incomplete"* at a finished
  walkthrough, and **the only way to clear it was to price rooms Havellin is not touching.**
  `roomCoverage(scored, excluded)` now returns `{scored, excluded, accounted}` per kind and the
  intake count is tested against `accounted`.
  - **The confirmation must never claim an excluded room was walked.** Zero exclusions keeps the
    old sentence (*"every bedroom and bath on record has been scored"* — still exactly true); any
    exclusions get *"is accounted for (2 scored, 5 out of scope)"*. Two branches, because one
    sentence covering both would have to lie in one of them.
  - **Red (`a-err`), not amber, on Anthony's call** — *"this warning should be in red font to
    look like an actual warning."* Right for the failure it describes: a half-scored house
    **misprices** rather than under-counts, since volume and complexity are averaged over the
    rooms scored and applied to the whole sqft.
  - **The empty-state guard had to learn it too.** `!scoredNames.length` alone would go silent on
    an all-excluded walkthrough — exactly the job this change is about. It tests both lists now.
  - The warning **carries the fix** (*"mark it ✕ (out of scope) in the Scope column and it counts
    here"*), per the standing rule that a panel reporting a blocker must say how to clear it.
- **⚠ AND THE SAME BLINDNESS WAS A HARD DEADLOCK ON SAVE. THE RULE EXISTED IN THREE PLACES AND
  THEY DISAGREED.** `checkPin` (manager approval) filtered `!r.excluded`; `saveEstimateAndPreview`
  and `submitForApproval` did not. So a walkthrough with any ✕ room **could be approved but never
  saved or submitted** — and it was unsatisfiable, not merely annoying, because `setRoomState`
  **disables and clears** `vol`/`cplx` on an excluded row. The app demanded a 1–5 score in a field
  it had greyed out, naming the seven rooms Anthony had deliberately excluded.
  - **`unscoredRoomNames(est)` is the one definition now**, read by all three. A test counts the
    call sites at exactly 3 and asserts no inlined copy survives. **Do not re-inline it** — three
    copies is what produced a gate only one of them enforced correctly, and the correct one was
    the last anybody reaches.
  - The excluded row's `vol:0/cplx:0` is **the record of a decision, not a gap.** Any gate reading
    it as unscored has the three states collapsed again.
- **1679 committed checks** (`tests/room-coverage.test.js`, 54 new — the first committed coverage
  of this badge at all; it had none). **All six changes revert-verified individually**: dropping
  the excluded list from `roomCoverage` fails 16, the call site 3, the red class 2, the
  empty-state guard 3, the `!r.excluded` filter 2, and re-inlining Save's copy 2.
- **Verified end to end in headless Chromium on the real page**, not asserted on source: the ✕
  toggle → `calcAll` → `excludedMeta` → badge path produces the exact seven-room excluded list
  from Anthony's screenshot, `unscoredRoomNames` returns `[]`, the badge reads *"2 scored, 5 out
  of scope"* in `a-ok`, the incomplete case renders `a-err` at computed `rgb(121,31,31)`, and
  **pressing Save really saves** — *"Saved: 10 rooms · 51.0 TC hrs · 74.0 PS hrs · $15,050"* with
  the record landing in `estimateStore`. No page errors.
- Manual **§5b** (badge table rewritten + two notes); playbook **Step 2** (badge table, a `.stop`
  on the three states, the note-why-it-is-excluded line) and **four** symptom→cause rows. Both
  `.md` copies hand-edited and parity-checked; tag balance verified on both HTML files
  (`manual.html`'s `<code>` delta is still the documented false positive at 1).

## Re-typing a job on the walkthrough + bundled prep flips to the 30% fee (BUILT 2026-09-10)
*"we need to be able to change the job type in an estimate … if we get a home prep client at
intake and then we show up on-site to do a walkthrough, it might turn out that they actually
need some editing … at the estimate stage we make that editable until the final estimate is
locked."* App-only, no redeploy.

- **THE LOCK LADDER HE ASKED ME TO CONFIRM, because his guess was off by one step in his own
  favour.** It is not the agreement stage. Draft → editable · **submitted** → hard-locked on
  every device (only the manager moves it) · **approved** → still editable via *Edit Estimate* /
  *Offer Discount*, which un-approve and **revoke the agreement's approval with them** · **sent
  to the client** → same · **`agrSigned`** → Change Order only. Agreement *approval* is not a
  lock: `editEstimateFromCE` revokes it and re-approval re-files a fresh Exhibit A. The client's
  signature is the lock, which is the right place for it and is exactly the price-pushback
  flexibility he described.
- **⚠ THE RULE IS WITHIN A FAMILY, NEVER ACROSS ONE — and it is Anthony's, not mine.** I offered
  any→any with a completeness gate; he answered *"living jobs should be editable into other
  living jobs and the jobs after death should be edited with other jobs after death … we could
  enter an estate settlement and all of a sudden somebody could contest the will."* That is
  better, and it **deletes the hard part**: `toggleIntakeFields` shows the authorized-rep block,
  the probate case fields and the deceased name/phone handling on the decedent three and on
  nothing else, so a move inside a family cannot leave a required field unasked and needs no
  gate at all. A move across one always would — a living job re-typed as an Estate Settlement
  has no representative, no date of death, and a phone number belonging to someone who is dead.
  That is a different client, not a re-priced job, and it stays on Client Intake / Edit Client.
- **`SVC_ORDER` + `svcFamily` + `svcFamilyOptions`, and the family is DERIVED from
  `DECEDENT_SERVICES` rather than listed a second time.** Two copies of this taxonomy is the
  one thing that would make the feature dangerous — the picker would offer a decedent service
  inside the living list. A test asserts the two agree key by key in both directions.
  `estate` (the retired alias) is placed as decedent but never offered, so a legacy job gets the
  right picker and switching off it quietly repairs the key.
- **⚠ IT WRITES `job.svc`, NOT A SECOND COPY ON THE ESTIMATE.** `job.svc` is what the dashboard,
  the invoice header, the approval email, the agreement routing and `isDecedentJob` all read;
  leaving it behind would price the estimate as one service under an agreement drawn for
  another. `est.svc` stays the record of what was **priced**, and `restoreEstimateToUI` now takes
  the JOB's key first — a job re-typed while an estimate sat in draft would otherwise go on
  quoting a service it no longer is. The divergence prints in the picker's own note, not a
  toast: `applyOpenedEstimate` fires *"Estimate loaded"* one call later and would wipe it.
- **The picker needed no new lock.** `applyEstimateLock` already disables every `input, select,
  textarea, button` in `panel-estimate` except `e-job` and the nav, so a `<select>` added there
  is locked by construction in both the submitted and approved states. A test asserts the
  exemption list has not grown. `agrSigned || depositReceived` is checked in the handler as
  defence in depth, as is the family test.
- **`_svcChangeConsequences(prev, next, job)` is DOM-free** so the tests read the real wording
  rather than grepping a substring — same reason `_pendingChipCopy` and `_agrScopeServices` are
  separate functions. It says only what actually moves, and a move that changes none of them
  says nothing rather than padding the dialog.

### The prep fee flipped, and it is real money
*"does the estimator currently estimate transition concierge hours for home prep when it's
bundled … we don't wanna double count … I'm leaning towards taking out any concierge hours
relegated to home prep when it's part of another job and just simply charge the 30%."*

- **THERE WAS NEVER A DOUBLE COUNT — the two arms were already strictly either/or**, which is
  what made this a straight choice rather than a fix. `prepTCHrs = (prepEnabled && !isPrep) ?
  getPrepTCHrs() : 0` on one side and `prepFeeRate(svc) { return svc === 'prep' ? 0.30 :
  SMF_PCT }` on the other: standalone charged the fee and no hours, bundled charged hours and no
  fee. **Bundled was the wrong half.** A realistic Palm Beach package (paint · deep clean ·
  landscaper · handyman · pressure wash · staging · carpet) is 16 touches → **8.0 hrs → $1,200**
  at $150, against **$13,500** on a $45,000 package. ~11×.
- **ONE RULE NOW: prep vendors carry 30% wherever they appear and book ZERO coordination hours
  anywhere.** `prepFeeRate()` takes no argument; `prepTCHrs` is 0 unconditionally. **⚠ THE TWO
  MUST MOVE TOGETHER** — charging the fee *and* the hours is the double charge that took
  `SMF_PCT` to 0, and it would be invisible, because those hours land inside `coordTC` beside
  every other coordination figure.
- **Every surface that stated the old rule was corrected in the same commit, because a contract
  clause and an invoice that disagree is the defect this file already records once.**
  - `getVendorActuals` held **its own `standalonePrep` branch and its own hardcoded `0.30`** —
    two copies of one rule. Both read the function now, and prep is out of the SMF base
    unconditionally (moot at `SMF_PCT` 0, not moot the day it comes back).
  - The client estimate's fee row **moved out of the *Moving Materials & Vendor Coordination*
    band into the Home Prep section**, under the spend it is charged on — the same misfiling
    this renderer already made once, and CLAUDE.md records it.
  - **Agreement §3.5 has THREE arms now.** The plain *Vendor Coordination* clause says Havellin
    adds no fee to vendor invoices — true of a job with no prep and false of one with it, which
    would have told a Home Editing client exactly the wrong thing over an Exhibit A charging 30%
    on the painter. `_agrHasPrepVendors(est)` branches on the **estimate**, not the service key,
    because a bundled prep IS a Home Editing job. The probate fee table gains a matching row on
    the same condition. `_pctWords` spells the rate for contract prose.
  - The Property Preparation **card footer** advertised `+8.0 hrs concierge`; it states the fee
    now, ungated on the service. The vendors-card subtitle carves prep out of *"Havellin adds no
    fee"* — it sat directly above the one card that is the exception.
  - `getPrepTCHrs` is deleted rather than left dead; `prepLineTCHrs` survives at its one real
    reader.
- **⚠ AN ESTIMATE SAVED BEFORE 2026-09-10 WAS QUOTED THE OTHER WAY**, so reopening it reprices
  and the total moves **up**. Both documents say to re-send after re-approval rather than let the
  invoice arrive above the quote. `coordHrsRollup`'s fallback still re-derives prep touches for a
  record with no `prepTCHrs` field, which is correct — that estimate really did price them.

### The no-markup claim, swept (same day, on Anthony's challenge)
*"30% should be the number, it's an industry standard general contractor … is that updated on
our estimate document as well as the agreement document — I just wanna make sure we don't make
claims of not putting a fee on top of other vendors."* He was right to ask, and **four of six
client-facing surfaces were wrong.**

- **30% IS A CONSTANT, NOT A DIAL — asked and answered.** No per-job override. What that makes
  load-bearing instead is that no document hardcodes the digits, or the day it moves they
  disagree. A test walks `renderClientEstimate`, `renderInvoice`, `renderAgreement`,
  `renderProbateAgreement` and `buildPrepEstimateBody` and fails on a `(30%)` literal in any of
  them. It found **three** on the first run: the invoice's deposit-stage prep row (a SECOND fee
  row I had missed while fixing the final-stage one), and the standalone prep agreement's §1.2,
  which spelled *thirty percent (30%)* by hand.
- **⚠ SIX SURFACES EACH STATED THE VENDOR-FEE RULE IN THEIR OWN WORDS.** The estimate's Terms
  (three arms), the HTML email, the plain-text email, the invoice's closing note, and both
  agreement forms. Four went false or incomplete the moment bundled prep charged 30%:
  - The estimate's **T&M Terms arm** — the one a bundled prep job actually hits — said *"Third-party
    vendor costs are estimated and billed at cost"* and stopped, never mentioning the fee shown in
    its own table two inches above.
  - The **fixed-price arm** said *"Havellin's coordination of those vendors is included in the fixed
    fee"*, which is wrong for prep — that carries its own 30% on top of the flat fee.
  - The **HTML email** printed a flat *"Havellin adds no markup to their work"* whenever any vendor
    cost existed, prep included.
  - The **plain-text email** was the worst of them: it named *"third-party vendor AND HOME-PREP
    costs … Havellin does not mark them up"*, explicitly, in the one document some clients read
    end to end, and never mentioned the fee at all.
  - The **invoice's** note pointed at *"the Service Management Fee shown above"* — a line that has
    not existed since `SMF_PCT` went to 0 on 2026-08-02. Wrong before this change, too.
- **`vendorFeeNote(e, opts)` is the one sentence now, DOM-free, read by all four.**
  **⚠ THE DISTINCTION IT CARRIES IS REAL AND MUST NOT BE COLLAPSED IN EITHER DIRECTION:** the
  VENDOR'S OWN INVOICE is never marked up — the client pays the painter exactly what the painter
  charges — and Havellin's 30% is a **separate, disclosed line** for managing that trade. Both
  are true at once. Saying only the first misleads about the second, which is what four documents
  did; saying only the second invites "so you mark up my painter", which is false. `opts
  .feeAlreadyStated` is for the fee-only estimate, whose Terms state the 30% one bullet above —
  there the sentence draws the distinction instead of restating the rate, per the client-copy rule.
  `_invVendorFeeSentence(smf, prepFee)` is kept separate on purpose: the invoice is past tense and
  answers a different question ("which line here IS the fee?"), and one sentence serving both
  tenses would serve neither.
- The probate fee table's *Havellin adds no markup* row is scoped once a Home Sale Preparation row
  sits under it — on a court-reviewed matter the table must not state both without reconciling them.
- **⚠ AND A TEST NEEDLE TRIPPED ON MY OWN COMMENT, TWICE IN ONE SESSION** — first `standalonePrep`,
  then the quoted phrase *"Havellin does not mark them up"* inside the comment explaining why it was
  removed. A `lacks()` over an extracted function body sees comments. Reword the comment; do not
  weaken the assertion.
- **THE MODEL, IN ANTHONY'S OWN WORDS, IS NOW A TEST** — *"if a painter comes in at ten thousand
  dollars, we pass through the ten thousand dollar bill to the client, and the client pays the
  painter directly. We just charge a thirty percent management fee on top."* `$10,000` through
  the real `getVendorActuals`: passes through at `10000`, markup `0`, fee `3000`, SMF `0`, client
  out `13000`. A deliberate second case beside the $45,000 one — this is the stated rule at its
  simplest and the one to read first if this area ever needs re-deriving.
- **1573 committed checks** (44 more). All seven of these revert-verified individually. The real
  rendered wording was read out of a headless browser rather than asserted on source — the bundled
  sentence, the fee-only variant, both invoice branches, and §3.5 off a rendered agreement.
- Manual **§7** note; playbook **one symptom row** — the answer to give when a client asks
  outright whether we mark the vendors up.

### Found on the way: Edit Client hid the fields it was about to save
- **`ecToggleProbate` tested plain `probate` for the case block and omitted `contested_probate`
  from the rep block, while `showEditClient`'s initial render tested both correctly and
  `saveClientEdit` read every one of those fields back out.** So opening Edit Client on a
  contested matter was fine, and **switching the service type to Contested Probate hid the case
  number, the §733.604 deadline, the attorney of record AND the authorized representative** —
  with the save still reading them out of the hidden div. Nothing was lost (a hidden input keeps
  its value); there was simply no way to enter or correct any of it, **on exactly the transition
  Anthony named**. Four sites read `ecIsProbateSvc` / `ecIsEstateSvc` now.
- **Not fixed, and worth knowing: `isDecedentJob({svc:'estate'})` returns FALSE.** `estate` is a
  legacy alias for `cleanout` that `SVC_LABELS` and three `isEstate` expressions still resolve,
  but the predicate does not — so such a job would take the living-client agreement form.
  Unreachable through the UI (nothing offers the key) and changing the predicate would move
  agreement routing for any job still carrying it, so it is flagged rather than altered.
  `svcFamily` places it correctly and the picker repairs it on the next change.
- **1566 committed checks** (`tests/service-change.test.js`, 188 new). **All ten fixes
  revert-verified individually** — every one turns the suite red on its own, including the two
  that are pure source assertions. Verified in headless Chromium end to end with no page errors:
  the picker offers four living services on the prep job and three decedent ones on the estate
  job, prep → Home Editing opens the room grid and crew sizing, the same $45,000 of prep vendors
  books **$13,500 on the bundled job where it booked $0 before**, `prepTCHrs` reads 0, the client
  estimate prints the fee under the prep vendors, Estate Settlement → Contested Probate lands and
  withdraws fixed price, and Edit Client keeps the case fields visible across the switch.
- Manual **§4 · §5 · §5d · §5e · §8 · §11 · §13a · §16**; playbook **Step 1 · Step 2 · Step 10 ·
  quick reference** and **seven** symptom→cause rows. Both `.md` copies hand-edited and
  parity-checked; tag balance verified on both HTML files (`manual.html`'s `<code>` delta is
  still the documented false positive at 1).

## Prelaunch cleanup — the retired `estate` key and five fields that were always zero (2026-09-10)
*"we have no existing clients. this is all prelaunch. so let's make sure we clean up everything
that needs cleaning up, and don't worry that there's some sort of legacy agreement or estimate
that's gonna be messed up at this point because there it's not."* App-only, no redeploy.

- **⚠ THE LINE THIS SWEEP DREW, AND IT IS THE MOST IMPORTANT THING IN THIS SECTION.**
  **Client jobs and estimates did not exist**, so their compatibility code went. **The VENDOR
  DIRECTORY (152 rows), the REFERRAL PARTNERS (79) and the CONTRACTOR ROSTER are real data**
  that has been accumulating since July and lives on Anthony's and Ashley's devices — their
  legacy columns, their retired statuses and `migrateRetiredNames` / `samePerson` /
  `canonPersonName` are **not** dead code. A future pass grepping for the word *legacy* would
  take them. **There is a test group, `⚠ WHAT THE PRELAUNCH SWEEP MUST NEVER TAKE`, that fails
  if any of the six is removed** — verified by reverting one.
- **THE `estate` KEY WAS NOT REDUNDANT ANY MORE, IT WAS WRONG — three opinions of one key.**
  `SVC_LABELS` printed *Estate Settlement*; `PRICING_REF` called it **Probate**; and
  `isDecedentJob` **did not know it at all**. So a job on that key would have taken the
  **living-client agreement form**, the living-owner estimate voice (*"your home"*, *"decisions
  room by room"* — to an executor), and **never tripped the 706 / Strict Mode gate**, which is
  ANDed with `isDecedentJob`. All three silent. It surfaced only because `svcFamily` (built the
  same day) placed it as decedent and therefore disagreed with `isDecedentJob` out loud.
  - **Deleted outright rather than taught to a fifth predicate.** Six sites: `SVC_LABELS`,
    `PRICING_REF`, `svcFamily`, the client estimate's fee-table sub-header, the Win/Loss filter,
    both agreement service maps and `ecIsEstateSvc`. `cleanout` **is** Estate Settlement and
    always was.
  - **The test states the requirement, not the absence:** every predicate answering *"is this a
    decedent job"* — `svcFamily`, `isDecedentJob`, `ecIsEstateSvc` — now selects **exactly the
    same set** over `SVC_ORDER`, asserted pairwise. A key one of them knows and another does not
    is the entire defect class, and that is what is now impossible.
- **`coordDays` · `vendorTotal` · `gcFee` · `stagerCost` · `stagerGcFee` were declared 0 in BOTH
  `calcAll` and `renderInvoice` and reassigned by nothing, anywhere.** They summed into
  `havellinTotal` and `grandTotal` as literal `+0`, rode the estimate snapshot as 0, and gated a
  **"GC / Site Management Fee" row on the client's invoice that could never render**. Nothing
  read one of them back. Residue of a fee model that came out.
  - **The test asserts them by NAME, not by checking a total** — the whole point is that they
    changed no total, so a value test could not have detected them. `havellinTotal` is now
    `tcFee + psFee + pkgCost + smf + prepFee` in both functions, and a test asserts the two
    agree term for term.
- **Two migrations that could never run:** `normalizeLegacyRoomKeys` (a `csH` → `psH` room-key
  rename predating every record) and the `havellin_est_v3` single-estimate migration, plus a
  reset writing to `e-stager-cost`, an element that does not exist.
  - **⚠ The v3 localStorage key is still REMOVED by the device clear, deliberately.** The
    migration read it on load; the clear deletes it. A phone or iPad that ran an old build may
    hold a stale v3 blob against a ~5MB origin quota, and the manifest write is the one that
    must never fail. The test asserts on `getItem`, not on the string.
- **Settings stopped caveating a promise nothing can break.** *"Estimates saved before
  2026-09-02 … are still costed at whatever these say today"* named an exception class with no
  members left. **The existing test asserted that sentence was PRESENT**, so it failed on the
  removal — correctly — and now asserts the reverse: the promise is stated without a caveat.
  The α and cost-rate null-guards themselves **survive**; a malformed record must still render.
  The line held throughout: **remove dead code and wrong claims, keep cheap null-guards.**
- **1606 committed checks** (26 more). **All eight removals revert-verified individually**,
  including the vendor-directory fallback, which turns the suite red if a later sweep takes it.
  Verified in headless Chromium with no page errors: an Estate Settlement job resolves decedent
  and renders the **estate** agreement form, and the invoice still bills prep at 30% with the
  mover passing through at cost. **No document changed** — nothing removed was user-facing, so
  the manual and playbook needed no pass.

## Deleted clients came back from a stale laptop — the sheet now keeps a job ledger (BUILT 2026-09-08)
**⚠️ REQUIRES AN APPS SCRIPT REDEPLOY** — `main-sync.gs` and `saveInventory.gs` both changed.
*"if a computer has clients stored in its local memory, that pushes those locally stored clients
back … into the job sync sheet even if I've gone in and deleted all of the jobs in the sheet
itself … when she added a new client, it pushed the new client plus three old clients back."*

- **What happened, exactly.** `saveJobs()` posts the WHOLE `jobs` array on every save, and
  `saveAllJobsToSheet` unions by id and never drops a job missing from the payload — the fix
  for the 2026-07 disappearing-client bug, and correct for two devices that each hold a client
  the other has not seen. Anthony cleared the Jobs sheet **by hand**. Ashley's laptop still had
  the app **open from before** — `loadJobs` overwrites the local list from the sheet on every
  page load, so a reload would have cleared it, but a tab that never reloaded still held the
  three old clients in memory. She added one; the save carried four; the merge took all four.
  The merge could not tell "a client this device added" from "a client the sheet deliberately no
  longer has". Estimates, plans, logs and manifests would have come back the same way — each
  store merges per key.
- **`JobLedger` — a store of every job id the sheet has ever written** (`{ since, seen: {id:
  firstSeen}, restore }`). The rule is one function, `_jobRefusal`: an id the ledger has **seen**
  and the Jobs sheet **no longer holds** was deleted — by `deleteJob`, by
  `resetAllJobDataConfirm`, **or by deleting the row in the spreadsheet** — and is refused, not
  merged. An id never seen is new and goes in. **A ledger of what was seen, not tombstones
  written by `deleteJob`, because nothing runs when a row is deleted by hand** — a tombstone
  would not exist for exactly the case that was reported.
  - **`since` closes the bootstrap gap.** The ledger seeds itself from the Jobs sheet on first
    use, so a job deleted BEFORE the redeploy is in neither the sheet nor `seen`. Job ids are
    creation timestamps (`id: Date.now()`), so a never-seen job created before the ledger
    existed that the sheet does not hold is refused too. That loses nothing: the sheet
    overwrites the device's list on every reload, so such a job was already gone from every
    device that had reloaded.
  - **Every job-keyed write refuses the same way** — `saveAllJobs`, the per-record `job`,
    `saveAllEstimates`, `saveAllJobPlans`, `saveAllLogs`, `saveAllChangeOrders` (by `co.jobId`)
    and `saveMedia`. A new job's estimate can land BEFORE its job row (the outbox sends one
    write at a time), so "not present yet" is never by itself a reason to refuse; only
    seen-and-absent or predates-the-ledger is. Tested.
  - **The response carries `dropped: [ids]`** (`_okWithDrops`; absent when empty, so every other
    response is byte-identical to before). The app's `_applyDroppedJobs` removes them from
    `jobs` and every local store **without calling `saveJobs()`** — that would post them
    straight back — redraws, and says *"N clients deleted elsewhere — removed from this device
    too"*. `loadJobs` also returns `deletedJobs` so a reload purges the local estimates/plans/
    logs for jobs that are gone (`_purgeLocalJobRecords`, now shared with `hardDeleteJob`).
  - **`resetAllJobDataConfirm` marks every id it is about to clear as seen FIRST**, from the Jobs
    sheet and all five stores. `JobLedger` is deliberately NOT in `RESET_JOB_STORES` — it is the
    memory of the reset. The reset's closing advice no longer orders a device sweep as the only
    defence; *Settings → This Device → Clear* still tidies a device straight away.
  - **The escape hatch: `allowJobRestoreConfirm(['<id>'])`**, run from the editor with the id
    pasted in (argument-taking on purpose — the Run menu passes none, so it cannot fire by
    accident). Single-use: spent the moment a device writes the job. `previewDeletedJobs()`
    lists what the ledger will refuse. Before the ledger a mistaken row deletion was silently
    undone by whichever stale device saved next; now it needs a decision, which is the point.
- **What this does NOT change:** the merge still never drops a job merely absent from a
  payload — two devices adding different clients is still safe. Nothing on the client refreshes
  before saving; the server is the right layer, since a refresh-then-save still races.
- Manual **§2** note; playbook **two symptom→cause rows**. Both `.md` copies hand-edited.
- **861 committed checks** (`tests/deleted-jobs.test.js`, 83 new — drives the real `.gs`
  functions against a fake spreadsheet, and the app's receiving side out of the real source).

## Orphaned records: five estimates against one job, and nothing ever swept them (FIXED 2026-09-09)
**⚠️ REQUIRES AN APPS SCRIPT REDEPLOY** — `main-sync.gs` and `saveInventory.gs` both changed.
Off an export of the sync sheet: *"does the app write to all of the tabs in here? i feel like some
are missing info always"*, then *"why do they ever stay there? these are all dummy jobs. shouldn't
we just fix this for now and forever?"*

- **What the export actually showed.** Seven tabs. `Jobs` held **one** client; `EstimateStore` held
  **five** estimates ($32,950 · $14,650 · $83,250 · $22,850 plus the live one). Four July/August
  practice clients had been cleared out of the Jobs tab **by hand**; their estimates stayed.
  `MediaStore` and `JobPlanStore` were headers-only, `LogStore` and `ChangeOrderStore` did not exist
  at all (a store tab is created by its first write, so absent ≠ lost), and `Estimates` / `Hours`
  are the fossil tabs this file already documents.
- **⚠ THE ORPHANS ARE INVISIBLE FROM BOTH ENDS, WHICH IS WHY THEY RAN SIX WEEKS.** In the sheet they
  live inside a **45,000-character JSON cell** (`EstimateStore!B2`, spilling into B3), so Sheets
  shows a truncated preview and no amount of looking reveals the keys — Anthony's *"i don't see
  that"* was the correct reading of what is on screen. In the app they render nowhere: `loadJobs`
  rebuilds the client list from the Jobs tab, and an estimate with no job row has nothing to hang
  off. **When a store looks fuller than the client list, diff the keys; do not look at the tab.**
- **THREE HOLES, and the first is the one that surprised me.** `_stripRefusedJobKeys` refuses a
  deleted job's record on the way **IN** — that shipped with the ledger on 2026-09-08 and works.
  Nothing removed a record **already sitting in a store** when its row went.
  - **`deleteJobFromSheet` purged three of the five stores.** `MediaStore` and `ChangeOrderStore`
    were missed, so deleting a client through the app kept their **entire photo manifest** — refs,
    custody log, appraisal-waiver reasons — and every change order, forever. Its own comment
    described the symptom (*"that is how the sheet ends up holding more estimates than the app has
    jobs"*) while the function under it was two stores short. **`_purgeJobFromStores` is now the ONE
    list of job-keyed stores**; a test asserts `deleteJobFromSheet` keeps no private copy and that
    the list agrees with `RESET_JOB_STORES`. Add a store there, not in five places.
  - **A row deleted BY HAND ran nothing at all** — the same gap the ledger exists for.
    `_sweepDeletedJobKeys` now runs on every job-keyed save, over the **merged result**, sharing the
    one Jobs read via `_jobRefusalCtx()` so the slowest part of the write does not double.
  - **The pre-ledger leftovers get `previewOrphanRecords()` / `pruneOrphanRecordsConfirm()`** —
    preview + confirm, out of `doGet`/`doPost` like every other destructive action. One-off: from
    2026-09-09 the ledger has seen everything, so the automatic sweep covers it from here.
- **⚠ THE SWEEP ACTS ON THE `deleted` VERDICT ONLY, NEVER `predates`. Do not "simplify" that away.**
  `deleted` rests on a **positive record** — the ledger watched that id go into the sheet and the
  sheet no longer has it. `predates` is an **inference from absence**, and an inference is not
  something to act on automatically on every save. **And the sweep stands down entirely against an
  empty Jobs sheet**, because with no jobs present every seen id looks deleted: one bad read would
  take the whole store with it. `pruneOrphanRecordsConfirm` refuses the same case and names
  `resetAllJobDataConfirm()` as the deliberate way to clear everything (`true` overrides).
  A blast radius worth stating plainly: an incoming-strip can at worst refuse one write; a sweep can
  empty every estimate the business has. That asymmetry is why the guards are there.
- **The ordering rule from the ledger build still holds and is tested**: a new job's estimate can
  land BEFORE its job row, so *not present yet* is never by itself a reason to remove anything.
- **The client NAME is not recoverable.** It lived on the Jobs row; the estimate snapshot carries
  only `svc` and the money, so `previewOrphanRecords` prints those. `previewDeletedJobs()` does
  **not** list these four — it reads `ledger.seen`, and the ledger's `since` (2026-09-09 15:12 ET)
  postdates them. Two different rules, two different listings.
- **1374 committed checks** (`tests/orphan-records.test.js`, 63 new — drives the real `.gs`
  functions against a fake spreadsheet seeded from the real export). **Every fix revert-verified
  individually against the real file**: drop the sweep and the hand-deleted job keeps its estimate;
  drop MediaStore from the purge and the manifest survives the delete; drop the empty-Jobs guard and
  one bad read wipes every estimate. The ledger-mark inside the prune is **belt-and-braces, not
  load-bearing** (a `deleted` orphan is already seen; a `predates` one is refused either way) and
  the test says so rather than pretending otherwise — this file records three separate times a test
  here could not fail.
- Manual **§2** two notes (which tabs the app writes, which are dead, and the new cleanup);
  playbook **two symptom→cause rows**. Both `.md` copies hand-edited; tag balance checked (the
  `<code>` delta in `manual.html` is unchanged at 1, the documented false positive).

## A vendor in two categories already worked — what did NOT was the appraiser who buys (2026-09-09)
*"we want to be able to put vendors into two or more categories. some vendors do jewelry
appraisal and buy jewelry for example. or appraisers do multiple categories that we have broken
out."* **The feature shipped 2026-07-31 and works** — one row, `;`-separated, `vendorCats(v)`
splits it, the control is a text input labelled *separate several with ;*. It had almost no
committed coverage, and auditing it found four real defects around it. **Do not "add"
multi-category vendors again.**

- **⚠ THE ONE THAT MATTERS: AN APPRAISER WHO ALSO BUYS WAS RECORDED "INDEPENDENT", IN GREEN.**
  Anthony's own example. `_apprPickerHtml` filtered the option label through
  `APPRAISER_DIR_CATEGORIES`, so on a row reading *Jewelry & Watch Appraiser; Jewelry & Watch
  Buyer* **it printed the appraisal trade and dropped the buying one** — the single fact that
  decides whether the appraisal is defensible was the exact thing the option did not say. And
  `<input id="appr-indep" checked>` ships pre-checked with nothing ever unticking it.
  - `APPRAISER_CONFLICT_CATEGORIES` is the acquiring trades — the outright buyers **plus**
    Auction House / Online Auction House / Estate Sale Company, because a percentage of the sale
    price means a higher appraisal pays them more. `apprConflictCats(v)` returns the ones a row
    carries; the label appends *⚠ also …* and `_apprPickVendor` unticks Independent and prints
    the reason.
  - **IT FLAGS AND EXPLAINS; IT MUST NEVER REFUSE.** A family wanting the jeweller who has known
    them thirty years to look at the jewellery is making a decision that is theirs, and on an
    estate filing no 706 there may be no conflict rule to breach. The box stays editable. What
    must never happen again is the app *asserting* independence over a firm its own directory
    says buys the property.
  - Blast radius is narrower than it looks and worth knowing: `a.independent` has exactly ONE
    reader (the in-app roster badge) and reaches no client or court document. It is still the
    field a concierge trusts when handing a valuation to counsel.
- **⚠ A DATALIST MATCHES ITS OPTIONS AGAINST THE WHOLE INPUT VALUE, NOT THE WORD BEING TYPED.**
  So once the field read `Art Appraiser; Antiq` **nothing matched and the suggestions went
  silent** — on precisely the segment that is the point of the feature. These are long
  punctuated names (*Antiques & Furniture Appraiser*, *Pest Inspection / Treatment*) and a typo
  does not fail: it mints a new category that then appears in every picker built from the
  directory, forever. `refreshVendorCategoryList` now **prefixes each option with everything up
  to the last `;`** so the whole-value match succeeds, and runs on `oninput` because the prefix
  changes per keystroke. **Group scoping is kept for the FIRST category only** — a firm whose
  trades cross groups is the case that most needs a suggestion for its second.
- **`canonVendorCategories` on the way in** — trims, drops blanks, dedupes case-insensitively,
  and snaps a case-variant onto the spelling already in the directory. `art appraiser` beside
  `Art Appraiser` is two headings in the Vendors tree and two entries in every picker. Quo
  already deduped its tags this way; the app did not. **It deliberately does NOT correct a
  misspelling** — inventing a category nobody typed is worse than storing the one they did, and
  a genuinely new trade must stay creatable by typing it. Tested both ways.
- **The group header counted a firm once PER TRADE.** The buckets deliberately hold the same
  object under every category so the tree can list it under either heading; concatenating them
  made a three-trade appraiser read as *3 vendors* in its group. Deduped by record identity.
  **The per-CATEGORY counts were already right** and are untouched — there the firm really is
  one of N.
- **⚠ OPEN, AND IT IS ANTHONY'S CALL, NOT MINE: `category_group` HOLDS EXACTLY ONE VALUE.**
  The group is what routes a vendor to a Build Estimate card and to a fee, so an estate sale
  company that also hauls junk is filed under one group and its other trade lands on that same
  card. **Anthony's literal jewelry example is unaffected** — both trades are Asset Liquidation
  & Valuation. Documented as a limitation with the advice to file under the work you engage the
  firm for most; do not build multi-group without asking, it touches `GROUP_JOB_MENU`, the fee
  routing and `vendorGroupOfLine`.
- **⚠ AND THE FIRST TEST PASS COULD NOT FAIL — caught by reverting, not by reading.** The 35
  checks written first covered `vendorCats` and friends and asserted **nothing** about any of the
  four fixes: reverting the picker label left the suite green. That is the third time in this
  file. **Every one of the five is now revert-verified individually** (1309/1310 passed with
  each one backed out), and both category lists are pulled from the real source rather than
  stubbed — a stub of `_cePhases` that did not match source is what hid the `&amp;amp;` defect
  the same week.
- **1311 committed checks** (`tests/vendor-categories.test.js`). Verified in headless Chromium:
  the option reads *⚠ also Jewelry & Watch Buyer*, picking it unticks Independent and names the
  trade, the clean appraiser ticks it back, the datalist completes past the semicolon and
  crosses groups there but not on the first trade, and a three-trade firm reads *3 vendors ·
  5 categories* in its group header. No page errors.
- Manual **§13a** rewritten (it said "a **Category**", singular, which has been wrong since
  2026-07-31) with the one-group limitation and the appraiser-conflict note; playbook the
  one-row rule on Step 2, a `.stop` on the appraiser roster, and **five** symptom→cause rows.
  Both `.md` copies hand-edited and parity-checked.

## ⚠⚠ THE APPS SCRIPT WAS BEING COPIED FROM A DEAD BRANCH SIX WEEKS STALE (FOUND 2026-09-09)
**The single most expensive defect in this project's history, and it was not in the code.**
Anthony pasted the deployed `main-sync.gs` and it was missing `htmlToPdf`, `getThumbnails`,
`saveMedia`, the whole `JobLedger`, and carried the pre-Shared-Drive `uploadHtmlToDrive`.
The next screenshot showed the browser address bar:
`github.com/HavellinPalmBeach/app/blob/claude/concierge-hours-pricing-3dv2gq/apps-script/main-sync.gs`
— a branch whose last commit is **2026-07-29**.

- **HE WAS DEPLOYING CORRECTLY THE WHOLE TIME.** The procedure was never wrong; the *source*
  was. Every "⚠️ REQUIRES AN APPS SCRIPT REDEPLOY" note in this file since 2026-08-24 was
  faithfully applied to July's code. **Ask what someone is copying FROM before explaining how
  to deploy** — and when a redeploy "does not take" more than once, that is the question.
- **Three features shipped against a backend that never had them, each read as an app bug:**
  `saveMedia` (2026-08-24 — the inventory manifest silently never synced, and the
  "forever-retrying" chip of that same day was this, correctly diagnosed and then mis-attributed
  to a bad paste), `htmlToPdf` (2026-09-08 — **no PDF on any client email, reported three
  separate times**), and the Shared-Drive `uploadHtmlToDrive` fix (2026-09-09 — duplicate
  estimates in Drive). Days of work chasing MIME, base64 and URL encodings, all of it
  downstream of a URL nobody looked at.
- **THE FIX IS THAT THE DEPLOYMENT NOW SAYS WHO IT IS.** `BACKEND_VERSION` +
  `BACKEND_ACTIONS` / `BACKEND_TYPES` in `main-sync.gs`, served by `doGet?action=version`;
  an old deployment has no such action and answers *Unknown action*, **which is itself the
  answer**. `checkBackendVersion()` runs 1.2s after load and draws a banner naming the
  vintage, what is broken **by consequence** (*"client emails go out with no PDF attached"*,
  not *"htmlToPdf missing"*), a link to the file **on `main`**, and the two other ways a
  redeploy looks done when it is not: Save does not change what `/exec` serves, and
  *New deployment* mints a **different URL** Settings is not pointed at.
  - **It is a READ and it fails quiet.** No POST, no queued write, silent when the backend is
    unreachable — a probe must not make things worse on the deployment already misbehaving,
    and must not accuse anyone when the network is simply down. Tested on all three.
  - **A test asserts `BACKEND_ACTIONS`/`TYPES` match the `doPost` dispatch in BOTH
    directions**, so the declared list cannot drift from what the file can really do. A list
    that over-claims would be worse than no list — the banner would stay silent on a
    deployment that is genuinely stale. Reverting one dispatch line fails it.
  - `BACKEND_NEEDS` names what the APP calls; a test asserts every entry exists in the
    backend's declared list, so the banner cannot cry wolf against a current deployment.
- **⚠ BUMP `BACKEND_VERSION` IN THE SAME COMMIT AS ANY `main-sync.gs` CHANGE.**
- **Process note, and it is the real lesson:** when the same symptom survives three rounds of
  fixes, stop fixing and ask what is actually running. I verified the MIME with a real parser
  (correct) and the URL encoding (twice, both wrong) before anyone asked the cheap question —
  *is the code I am debugging the code that is executing?*
- **1242 committed checks.** Verified in headless Chromium against three stubbed backends:
  the old one raises the banner with the right consequences, a current one raises nothing,
  and an unreachable one stays silent.

## "Still no PDF" three times — the app never said why (FIXED 2026-09-09)
*"i saw the drafts, but they still don't have PDFs attached on any of them."* Third report of
the same sentence, and the reason it took three is that **the app's answer contained no cause**.

- **⚠ THE MIME WAS SOUND — MEASURED, NOT ASSUMED, AND THAT IS WHAT NARROWED IT.** After the
  bare-LF fix the obvious suspect was still the message assembly. So the real
  `buildMimeMessage` was driven with a realistic 400KB PDF and the output parsed with
  **Python's `email` module** — a spec-compliant parser, deliberately not my own reading of
  the bytes. Result: `multipart/mixed` → `multipart/alternative` (plain + html) → the
  `application/pdf` part, **zero defects at every level**, filename intact, payload
  round-tripping byte for byte. That eliminates the entire class in one measurement and
  leaves exactly one possibility: **`pdfBase64` arrives empty**, so the `if (o.pdfBase64)`
  block never runs and there is no attachment part to drop. **Reach for a real parser before
  re-reading your own generator; it is minutes, and it settles the question.**
- **So the PDF is never BUILT — and the app was throwing away the one string that says why.**
  `estimatePdfBase64` collapsed every failure to *"The PDF conversion failed."* A sentence
  with no cause in it means each report comes back carrying nothing new, which is precisely
  how the same symptom survived three rounds.
- **The likely cause, and the app can now name it: a deployment that predates `htmlToPdf`.**
  `doPost` falls past every `action` test to `data.type`, which is `undefined`, and answers
  **`Unknown type: undefined`** — which `_backendErrorKind` **already** classified as `stale`.
  The diagnosis existed and was never wired to this path. **A redeploy that was Saved but not
  Deployed → New version leaves the live URL on the old code**, which looks done and is not.
- **`_pdfFailAdvice(kind)` prescribes only what the error entitles it to** — the same rule
  `_backendErrorKind` was built for. `stale` gets the exact redeploy steps *including the
  saving-is-not-deploying trap*; `crash` gets the workaround and no instruction; anything
  unclassified gets *Print / Save PDF and attach it by hand*. **Provenance is still
  required** — `clientError` is passed through, so a fetch that never landed cannot read as
  a stale deployment and send someone to redeploy a script that was never asked anything.
- **The server's own words are printed under the buttons**, in the persistent strip rather
  than a feedback line that scrolls away — the same lesson the sync chip already carries.
- **The agreement email got the same treatment and had no strip at all**, so a signing packet
  that failed to build was reported in a toast and nowhere else. `_showDraftLink` now takes
  the host element id and serves both tabs.
- **1229 committed checks.** Verified in headless Chromium: the stale branch renders the
  redeploy steps and the server's words, the crash branch prescribes nothing, and the success
  branch says the PDF is attached.

## Endless Drive duplicates, and a draft link Gmail could not resolve (FIXED 2026-09-09)
**⚠️ REQUIRES AN APPS SCRIPT REDEPLOY** — `main-sync.gs` `uploadHtmlToDrive` changed, and until
it is redeployed the duplicates keep accumulating.
*"it looks like save to drive creates dupes endlessly if you keep hitting it. should a button
even be there or do we automatically save estimates to drive in the background? also, the HTML
email generator now goes to a screen that says 'your account is not available' … and there is
still no PDF attached."*

- **⚠ THE DUPLICATES: `folder.getFilesByName()` ANSWERS EMPTY ON A SHARED DRIVE.**
  `uploadHtmlToDrive` deleted the previous copy with that call before creating the new one. Every
  estate folder is on a **Shared Drive**, where the lookup can return nothing for files that are
  plainly sitting in the folder — so the removal loop ran **zero times** and every save created
  another file. Silently, because `createFile` always succeeds. **This is the same failure this
  file already records one section down**: *"`drive.files.get` answered *File not found* for a
  file `DriveApp` opens fine — because the estate folders live in a Shared Drive, and the Drive
  API needs `supportsAllDrives: true`."* Same root cause, a different method, a year of hindsight
  not applied. **When a Drive read comes back empty against a folder you believe has files, the
  Shared Drive flags are the first thing to check, not the last.**
  - `_filesNamedInFolder` asks **both** sources and unions by id: `DriveApp` for the ordinary
    case, and `Drive.Files.list` with **`supportsAllDrives` AND `includeItemsFromAllDrives`** —
    a test asserts both flags on every call, because either one missing answers empty again.
  - **It updates the existing file IN PLACE** (`Drive.Files.update`), so the file keeps its id.
    That matters: `job.estimateDriveUrl` is stamped with it and counsel may already hold the
    link. Trash-and-create would leave every previously-sent link pointing at a trashed file.
    No update permission falls back to trash-then-create rather than duplicating.
  - **Extra copies are TRASHED, never deleted** — Drive's 30-day undo, the same rule
    `trashJobFoldersConfirm` follows. So **the first save after the redeploy collapses a folder
    that already accumulated duplicates back to one file**, and the badge says how many it
    cleared. The fix cleans up the mess it is fixing.
  - The **oldest** copy is the one kept and refreshed — that is the id anyone was given a link
    to. `previewFolderDuplicates(folderId)` / `dedupeFolderConfirm(folderId)` clean a folder by
    hand, split preview/confirm and out of `doGet`/`doPost` like every other destructive action.
- **THE DESIGN HALF, and it is the better answer: the estimate ALREADY files itself.** `checkPin`
  has called `saveFolderEstimate(true)` on approval since 2026-08-03, and `editEstimateFromCE`
  clears the stamp so re-approval re-files. So on the normal path there was nothing for a person
  to press, and the button could only ever produce the same document again. It is now shown
  **only when `job.estimateDriveAt` is absent** — the retry for a filing that failed — and
  disappears the moment one succeeds. The banner's *📁 Filed to Drive · when · Open* is the
  confirmation. **Do not restore an unconditional show**; a test asserts none survives.
- **⚠ THE GMAIL DEAD END: THE MAILBOX ADDRESS IN THE URL. GOT WRONG TWICE — DO NOT TRY A
  THIRD SPELLING.** `/mail/u/<address>/` was shipped percent-encoded (*"Your account is not
  available"*) and then, as the fix for that, with a literal `@` — which Anthony hit the same
  day: *"i have to sign into my havellin google account, fine, but then i get this error"*,
  **Temporary Error (404)**. Two spellings of one idea, two dead-end error pages.
  - **The premise was wrong, not the encoding.** What that path segment resolves against is
    the **browser's** Google session list — invisible from the app, different on every device
    — and authorising the OAuth popup grants a **token, not a Gmail session**, so the account
    can be authorised and still absent from the path lookup.
  - **`/mail/u/0/` is the only form that cannot fail**, and that is what ships. Its weakness
    (account 0 is whichever Google account signed in first) is answered **on screen instead**:
    `_showDraftLink` names the mailbox the draft was created in and says to switch with
    Gmail's own avatar menu. **A named mailbox plus a working page beats a URL that guesses.**
  - **⚠ AND THE TEST WAS GREEN THROUGH BOTH.** v1 asserted the `%40` form; v2, written as the
    fix, asserted the literal `@`. Each **described what the function returned rather than
    what had to be true**, so each locked in the bug it was written beside. It now asserts the
    requirement — the URL resolves, carries no address in any spelling, and still deep-links —
    across every value `_gmailUserEmail` can hold. **When a test is rewritten to match a fix,
    check it states the requirement; that is twice this one did not.**
  - **A created draft is never a dead end now.** `window.open` is wrapped and the strip is
    always printed — a blocked popup on an iPad, an error page, or the wrong account must not
    lose a draft that was successfully created. The draft was created on every one of these
    failures; only the link opening it was broken.
- **The "no PDF" report is most likely the stale draft again.** He could not open a new draft at
  all (the link errored), so what he was reading was the pre-fix one. **A Gmail draft is a
  snapshot and never updates itself** — this is the second report of the same shape, so the app
  now says *"WITHOUT the PDF, attach a printed copy"* in the success line and in the draft-link
  strip whenever the conversion failed, rather than only in a feedback line that scrolls away.
  If a fresh draft still has none, the failure is loud and names itself.
- **1206 committed checks** (`tests/drive-overwrite.test.js`, 22 new — drives the real `.gs`
  functions against a fake Drive whose `getFilesByName` answers empty exactly as a Shared Drive
  does). **Reverting the lookup fails 14 of them**, the first being "ten saves, one file".
  Verified in headless Chromium: the button shows unfiled and hides once filed, the banner
  carries the Filed line, and the draft URL carries a literal `@`.
- Manual **§7** three notes; playbook the approving-files-it paragraph and **four** symptom→cause
  rows (button gone · folder already has duplicates · the account-not-available page · no PDF).
  Both `.md` copies hand-edited.

## "Sr" removed — and a NAME is this app's only person key (BUILT 2026-09-09)
*"lets remove 'Sr' everywhere. i do not want that anywhere."* One sentence, and a data
migration rather than a relabelling.

- **THERE IS NO PERSON ID ANYWHERE IN THIS APP. The name IS the key.** `job.tc`,
  `approvedBy`, `preparedBy`, `agrApprovedBy`, `lockedBy`, `wonBy`, `deliveredBy`, the
  staffing rosters and every hour-log `members[].name` all store the string, and **eight
  lookups compared it with `===`**. Rename the source and every record written before
  today points at a person who no longer exists — and every one of those failures is
  **silent**: an estimate prints no preparer block, an approval loses its approver, and
  `getTCCostRate` falls through to the **founder rate**, which is close enough to look
  right on a margin panel and wrong on every job that person is actually staffed on.
- **⚠ AND THE RENAME UNDOES ITSELF WITHOUT A MIGRATION — `loadContractors` is why.** It
  restores the built-in team from `havellin_defaults_v3` **and** from the ContractorStore
  **by id**, with `Object.assign`. A stored old name is therefore copied straight back
  over the renamed source **on every page load**. Reading the source would show the new
  name and the screen would show the old one, with nothing to explain the difference.
  That is the single most important line in this section.
- **Two halves, and both are needed.** `canonPersonName` / `samePerson` are **read-time**,
  so a comparison between a stored old name and a live new one still matches; every
  `c.name === <stored name>` site goes through `samePerson` now. `migrateRetiredNames` is
  a **deep walk** applied to each store as it lands, so what is DISPLAYED is current
  whatever the record holds.
  - **A deep walk, deliberately, not a list of fields.** The name is stored under at least
    seven keys plus inside roster and hour-log arrays; enumerating them is how one gets
    missed. Cycle-guarded and depth-capped — an estimate snapshot pinned onto a job can
    point back, and an unguarded walk hangs the page on load.
  - **⚠ `Anthony Graziano Jr` MUST NOT ALIAS.** He is a different person with his own cost
    rate ($60 against $100) and his own mailbox. An alias that swallowed him would reprice
    every job he is staffed on and send his mail to his father. Tested explicitly.
- **NOTHING IS WRITTEN BACK, on purpose.** A store is normalised on read and re-saved only
  when the user changes something. A load-time rewrite that also saved would push one
  device's opinion of everybody's records up as a side effect of opening the app — the
  same shape as the stale-laptop bug the job ledger exists to stop. A test asserts no
  `postSyncBadge` in the load paths.
- **Wired into both arms of every load path** — localStorage for the instant render and
  the cloud copy that overwrites it: `loadJobs`, `loadEstimateState`, `loadLogData`,
  `loadJobPlanData`, `loadContractors` (three sites). Migrating only one arm leaves the
  name flickering back on sync.
- **⚠ A TEST THAT COULD NOT FAIL, caught by reverting the fix rather than by reading it.**
  The end-to-end `assignedTCContact` check asserted the name and mailbox that come back
  for a pre-rename job — but that function's own **fallback IS the managing partner**, so
  it passed whether the lookup resolved or fell through. It stayed green with `samePerson`
  reverted. The roster in that test now carries a phone the fallback does not, so only a
  real match can produce it. **Revert the fix and watch the test fail** is the only way to
  know a test is doing anything; three of them do now.
- Also renamed: the escalation copy on two pricing-reference rows (*Escalate to Anthony*),
  the `COST_RATES_DEFAULT` comment, the standard agreement's Primary Contact and incident
  report clause, both agreement signature blocks, the intake and referral-owner dropdowns,
  `MANAGER_PINS`, `DEFAULT_CONTRACTORS`, and `manual.html` / `MANUAL.md`.
- **1177 committed checks** (`tests/person-names.test.js`, 83 new). **Verified in headless
  Chromium** against a localStorage seeded with pre-rename jobs, logs and a stored roster:
  the restored roster reads the new name, the job and the log member migrate, Junior on
  the row beside him does not, `assignedTCContact` resolves off the roster, and the
  rendered DOM contains no `Graziano Sr` — with no page errors.

## The estimate's save / file / email path — four reports off one dummy client (BUILT 2026-09-08)
**⚠️ REQUIRES AN APPS SCRIPT REDEPLOY** — `main-sync.gs` gains `htmlToPdf`.
**⚠️ NEEDS A GOOGLE CLOUD OAUTH CLIENT** before the HTML email works; until then the button
falls back to the old `mailto:` and says so.

- **THE SAVE BUTTON ALREADY PUSHED A PDF AND ALREADY FIRED AUTOMATICALLY — the answer to
  Anthony's first question was "it does".** `uploadHtmlToDrive` in `main-sync.gs` renames
  `.html` → `.pdf` and runs `htmlBlob.getAs('application/pdf')`, so *everything* the app
  files is a PDF whatever the app-side function names say; and `checkPin` has fired
  `saveFolderEstimate(true)` on approval since 2026-08-03. **Do not "add" either again.**
- **⚠ WHAT WAS ACTUALLY WRONG: TWO DOCUMENTS, ONE FILENAME, AND A RACE DECIDED WHICH ONE THE
  CLIENT GOT.** `exportEstimateToDrive` (the internal worksheet — room scores, TC/PS hours,
  per-room dollars, walkthrough notes) and `saveFolderEstimate` (the client document) both
  wrote `<hvlId>_Estimate.html` into the same `Estimate` subfolder, and on approval both fire
  400ms apart. The Apps Script trashes by name then creates, and a cold Apps Script start is
  seconds — so the landing order was not the send order and roughly half the time the client's
  folder held our cost breakdown. `estimateDocNames(job)` is now the ONE namer for all three
  surfaces (Drive, printed PDF, email attachment); the worksheet is `… - Estimate Worksheet
  (INTERNAL)` and carries a red *not a client document* line on its face. **Keep the names
  distinct.** The Drive names carry **no date** on purpose — overwrite-by-filename is what
  makes a re-file replace rather than accumulate; only the client-facing name is dated.
- **Naming: `Havellin Service Estimate - 1234 Ocean Blvd - Sep 8 2026.pdf`.** Was
  `Ellsworth-HVL-0007.pdf`, which is a database key on a document going to a client.
- **⚠ HOME PREP BILLS NO HOURS AND THE TERMS PROMISED THEM ANYWAY.** *"the terms and conditions
  for a home prep job need to change in the estimate because there are no hours. So we can't
  have a change order for being fifteen percent over hours or the rectifying the final bill
  based on final hours because that doesn't exist."* Correct on all three. The prep branch
  replaces only the fee table, so the shared Terms printed *"Final charges reflect actual hours
  worked"*, *"if actual hours exceed the estimate by more than 15%…"* and a *25% materials
  handling fee* — on an engagement where `computeEngineV3` zeroes `baseTCHrs`/`basePSHrs`/
  `coordTC` and `loadJobPlanTab` hides the hours log outright. **The INVOICE already knew
  (`_feeOnly`); the estimate had no equivalent.** New `estimateIsFeeOnly(e, job)` is the same
  test — the service key OR a saved estimate with both hour totals at zero — and both surfaces
  read it. Payment schedule gets prep's real milestones (acceptance · vendor schedule booked ·
  show-ready handover) instead of a "project midpoint" that does not exist.
- **⚠ THE AGREEMENT'S TRIGGER IS THE CLIENT'S YES, and it had no such gate.** *"it looks like
  an agreement gets pushed into Google Drive before an estimate is even approved."* Two holes:
  - `checkAgrPin` required only that the ESTIMATE was approved — an internal event that says
    nothing about the client. Approving is what **files the agreement and the signing packet
    into the client's Drive folder**. New `agrApprovalBlocker(jobId)` returns
    `nojob`/`estimate`/`notwon`/`''`, and `updateAgrUI` and `checkAgrPin` both read it rather
    than keeping their own copies. **The draft still RENDERS at all times** — reading the
    contract you are about to talk through is free; approving is what commits.
  - `editEstimateFromCE` cleared `estimateApproved`, `job.approved` and even the estimate's
    Drive stamp, and **never touched `job.agrApproved`** — so the tab still read *Approved for
    Sending* with the PDF button live over an Exhibit A that no longer existed in approved
    form. It now revokes, records `agrRevokedBy:'estimate-edited'`, syncs, and says so.
  - **`_agrExported`/`_packetExported` were bare session booleans, so the re-approval carrying
    the correction was suppressed and Drive kept the stale copy.** Both key on
    `_agrExportKey(job)` (approval stamp + approver) now: a new approval re-files, a redraw
    does not.
- **⚠ THE AGREEMENT'S "EMAIL TO CLIENT" BUTTON HAD NEVER WORKED, AND agreements@ HAD NEVER
  BEEN COPIED ON ANYTHING (fixed same day).** *"do we cc estimates and agreements @havellin
  like before? that's important."* The estimate always has (`cc: DEPT_EMAILS.estimates`, on the
  Gmail draft AND the mailto) and invoices CC `billing@`. The agreement never did: `btn-mailto-agr`
  appeared **exactly once in the whole file** — the markup, `display:none` — and nothing set its
  href or showed it. Same dead-control shape as `markDepositReceived` before 2026-07-30, and
  both the manual and the playbook documented it as working.
  - `emailAgreementToClient` mirrors the estimate's: Gmail draft, **CC `DEPT_EMAILS.agreements`**,
    `_agreementEmailFallback` to a mailto that carries the same CC.
  - **IT ATTACHES THE SIGNING PACKET, NOT THE AGREEMENT ALONE.** Both forms incorporate the
    Estimate as Exhibit A and the estate form says the agreement is not valid without it —
    emailing the bare agreement would reopen exactly what the packet was built to close.
  - **The button follows `btnPdf` in every branch of `updateAgrUI`**, so it cannot become a way
    past the approval gates. A test counts the show sites and the hide sites and asserts both
    match `btnPdf` exactly — that is the assertion to keep if a branch is ever added.
  - The body carries the payment schedule off `approvedEstimateFor`; **no approved estimate
    prints no schedule**, rather than a schedule of zeroes.
- **⚠ AND THE INTERNAL WORKSHEET WAS BLANK ON A FEE-ONLY JOB.** Anthony sent the document:
  *"what is this file? it was in the client folder, estimates"* — a Home Prep worksheet whose
  room table was one `Job-level work · 0.0 TC / 0.0 PS` row above a $4,560 total. **It is the
  live proof of the filename race above**: the worksheet had won and was sitting in the client's
  Estimate folder. Splitting the names stops it reaching the client; `_feeOnlyWs` stops it being
  useless to us — a fee-only estimate's working paper is the **prep vendor lines with their scope
  notes and costs**, footed with the vendor spend and `prepFeeRate` (read, never a literal 30).
  Room-based jobs are untouched.
- **The HTML estimate email — a Gmail DRAFT in the signed-in user's own mailbox.**
  *"right now it generates an email from the person who is logged into the havellin email, so
  we want to keep that. if ashley generates, the email comes from ashley … i want to see it,
  potentially edit it, and send it myself, not automatically."*
  - **⚠ `mailto:` CANNOT DO THIS AND NO AMOUNT OF WORK ON `buildEstimateMailto` WILL FIX IT.**
    RFC 6068 carries a plain-text body and nothing else: no HTML, no attachment. That is why
    the old email ended by instructing the *sender* to attach the PDF by hand. Gmail's own
    `?view=cm` compose URL has the same two limits.
  - **⚠ AND IT IS NOT SENT SERVER-SIDE.** Apps Script could `MailApp.sendEmail` an HTML body
    with an attachment in one call, but always as the deploying account — the exact opposite
    of the requirement. So: Google Identity Services in the browser, scope
    **`gmail.compose`** (create a draft; it deliberately CANNOT send), `users/me/drafts`, then
    deep-link to the draft. **Never add `gmail.send`** — a person pressing send is the feature.
  - **The token is memory-only** (`_gmailToken`, never localStorage): a bearer token on a
    mailbox, on a public origin, on a shared iPad. `GMAIL_CLIENT_ID` is also a Settings value,
    in `LOCAL_KEEP_KEYS` so a device clear does not force a retype.
  - **⚠ THE CLIENT ID IS BAKED IN AS `GMAIL_CLIENT_ID_DEFAULT` AND THAT IS CORRECT.** A browser
    OAuth client id is **public by design** — it is in the page source of every site using one —
    and the **authorized JavaScript origin** is what protects it, not secrecy. Shipping it means
    a new iPad works on first load instead of needing a string typed into Settings, which is the
    pain this file already records about the Apps Script URLs. Settings still overrides per
    device; clearing that field restores the default rather than disabling Gmail.
  - **⚠ AND THERE IS NO CLIENT SECRET. Never add one.** Google issues one beside the id and it
    is for SERVER-side flows; `initTokenClient` does not take it, and a secret in a
    View-Source-able page is not a secret. Anthony pasted one into chat on 2026-09-08 and was
    told to reset it — the app was unaffected because it never wanted it. A test asserts the
    `GOCSPX-` prefix appears nowhere, and **builds that prefix by concatenation** so the test
    file does not itself trip a secret scan of the repo (the first version did).
  - **The consent screen's Audience is the thing to check, not the API enablement.**
    `gmail.compose` is a Google **restricted** scope. On a Workspace-owned project the screen is
    *Internal* and nothing further is needed. On an *External* project, production use needs
    Google review **plus a paid third-party security assessment**, and everyone sees an
    unverified-app warning until then; Testing mode (100 named users) is the workable interim,
    and the 7-day refresh-token expiry does not bite because the token flow issues none.
  - **⚠ THE BODY IS A COVER NOTE, NOT THE WHOLE ESTIMATE, AND THAT IS THE DESIGN.** Mail
    clients strip `<style>` and do not support CSS custom properties at all, so
    `ce-page-content` renders as unstyled text in Gmail — email HTML has to be tables and
    inline literals (`EMAIL_BRAND`). And rebuilding all eight sections a second way would be
    the second-renderer drift this file records over and over. So the body carries the summary
    and the **complete document is the attached PDF**, produced by the SAME server-side
    conversion that writes the Drive copy — only one thing renders the estimate. The stage
    list reads `_cePhases`, so the email cannot promise a stage the estimate did not price.
  - **New `htmlToPdf` Apps Script action returns the PDF bytes and writes nothing to Drive.**
    Reading the filed copy back instead would need a Drive scope and a signed-in user who can
    see that Shared Drive; this runs as the Havellin account and needs neither. A test asserts
    the function never touches `DriveApp`.
  - **⚠ FOUR THINGS FOUND ON THE FIRST REAL SEND (2026-09-09), and two were defects.**
    *"email to client fired to my drafts … the full contents of an estimate were not in there
    and there is no attached PDF."*
    - **THE PDF DID NOT ATTACH BECAUSE OF TEN BARE LINE FEEDS.** `buildMimeMessage` wrapped the
      base64 parts at 76 chars with `\n` while joining the structure with `\r\n`. Every line
      break in a MIME message is CRLF, base64 bodies included; Gmail took the body and dropped
      the attachment. **The tests looked right and caught nothing** — they asserted CRLF was
      *present* and that no line exceeded 998 chars, and neither notices a `\n` inside an
      otherwise well-formed message. `_b64Wrap` now does it, and a test COUNTS bare LFs.
    - **`&amp;amp;` on the client's screen.** `_cePhases` writes its titles as HTML literals
      that already carry entities (*Scoping &amp; Sourcing*), and the email ran them through
      `_emHtml` a second time. They are app constants, never user input, so they go in raw.
      **The test's own `_cePhases` stub returned a bare `&`, which is what hid it** — a stub
      that does not match the real source is worse than no stub. A test now asserts the CONTRACT at
      source — every `_cePhases` title is already entity-escaped — rather than normalising at
      runtime; one rule, checked, beats two encodings each guessing what the other did.
      **A Gmail draft is a snapshot and does not update itself**, so the first report after a
      fix here is usually a stale draft: delete it and press the button again.
    - **The draft opened in the wrong mailbox.** `/mail/u/0/` is whichever Google account
      signed in FIRST in that browser. `userinfo.email` (non-sensitive) is now requested
      alongside `gmail.compose`, `gmailResolveUser` reads the address off the token, and the
      link names the mailbox — Gmail accepts an address in that slot. Best effort: a failed
      lookup falls back to `/u/0/` rather than blocking the draft.
    - **The *Plain email* button is gone from the tab.** Two email buttons side by side invite
      sending the plain one by mistake, which loses the attachment. The anchor stays in the DOM
      (`updateApprovalUI` still sets its href) and `_estimateEmailFallback` still reaches it
      automatically. **Reached in code, never offered as a choice.**
  - **The `mailto:` path SURVIVES as `_estimateEmailFallback` and must not be deleted** —
    unconfigured client id, cancelled popup, failed draft. A plain compose window that opens
    beats a button that reports an error. A failed PDF still produces the draft, and says so.
  - **Verified in headless Chromium**, not just asserted: the email renders at 390/600/900px
    with no overflow (`width:100%` + `max-width:600px`; a fixed 600 does not shrink), the prep
    variant mentions neither hours nor 15%, and a fixed-price one drops the hourly threshold.
    *Note for next time: Playwright's option is `viewport`, not `viewportSize` — the wrong one
    silently leaves the page at the 1280px default and every width measurement is a lie.*
- **1044 committed checks** (`tests/estimate-delivery.test.js`, 183 new). The harness gained
  `btoa`/`atob`/`unescape`/`escape` — real browser globals the app uses, whose absence read as
  a bug in the code under test.
- Manual **§2** (the Cloud setup steps), **§6b** (prep terms + the fee-only worksheet), **§7**
  (naming, the two Drive files, the email) and **§8** (both gates + the agreement email);
  playbook **Step 3/4/6** and **ten** new symptom→cause rows. Both `.md` copies hand-edited and parity-checked claim by claim.

## Office line vs personal mobile — both on every client document (BUILT 2026-09-09)
*"our office number is (561) 652-5522 and we should include both office and mobile … these
should be included depending on who is sending the email."*

- **⚠ THE OFFICE NUMBER WAS SITTING IN ANTHONY'S CONTRACTOR RECORD AS HIS `phone`**, and
  written out as a literal in five client documents. So the firm's line was presented as one
  person's number, **Ashley and Anthony Jr had no number at all**, and changing it meant five
  edits. The old number `(561) 370-4700` was also wrong.
- **THE SPLIT, and keep it: the office line belongs to the FIRM, `phone` on a contractor row
  is that PERSON'S MOBILE.** `HAVELLIN_OFFICE_PHONE` is the one constant every footer and
  signature reads. Anthony (617) 650-6588 and Ashley (978) 857-5374 are on their own rows;
  Anthony Jr has none and correctly renders office-only rather than an empty label.
- **`conciergePhones(c)` is the single renderer** — office first (it is the line answered when
  the concierge is inside somebody's house with their hands full), mobile second when present.
  `conciergePhonesText` for the plain-text parts and the estimate's *Questions about this
  estimate?* line, `_emPhoneLines` for the HTML emails with `tel:` links.
- **⚠ `NON_MOBILE_NUMBERS` holds the current office line AND the retired one.** A contractor
  row copied from Anthony's old record would otherwise print `(561) 370-4700` on a client
  document **labelled as a mobile** — a dead number, presented as the direct line to the person
  running their estate. Matched on **digits**, so `561-370-4700` and `5613704700` are caught
  too. **Keep a retired firm number on that list rather than deleting it**; that is the whole
  point of it.
- **⚠ AND THE CHANGE MADE AN OLD FALLBACK DANGEROUS — fixed the same day.** `assignedTCContact`
  ended `phone: tc.phone || fallback.phone` / `email: tc.email || fallback.email`, so a
  RESOLVED concierge with a blank field inherited the managing partner's. That was survivable
  while `fallback.phone` was the OFFICE line and stopped being survivable the moment contractor
  `phone` meant a personal mobile: a concierge with none recorded would have had **Anthony's
  personal number printed under their own name**, on a client document, as the direct line to
  the person running that estate. Both are `|| ''` now — `conciergePhones` renders office-only
  for a blank mobile, which is the honest answer, and both signatures guard the `mailto:`
  against a blank address. **The fallback identity is for a job with NO concierge assigned**;
  it is not a source of spare parts for one who is.
  *A raised severity on an existing line is the thing to look for after any change like this —
  the fallback was not touched, its blast radius was.*
- **Editing a founder's row persists correctly and needs no code change.** `saveContractor`
  mutates `DEFAULT_CONTRACTORS` in place for a built-in, `saveContractors` writes it to
  `havellin_defaults_v3` AND pushes it to the sheet as `defaults`, and `loadContractors`
  restores newest-wins on `updatedAt`. `assignedTCContact` reads `DEFAULT_CONTRACTORS` first,
  so an edited row wins. The hardcoded numbers in source are only the seed for a fresh device.
  **The one thing that silently breaks it: the match is `c.name === job.tc`**, so renaming a
  concierge on their Contractors row orphans every job that names the old spelling.
- Six signature sites read it (two HTML emails, two text parts, two mailto bodies) plus the
  estimate and invoice contact lines; `prepPhone` is deleted. A test asserts **no bare
  single-number signature survives** and that the retired literal appears **exactly once** in
  the file — inside the guard list.
- **1086 committed checks.** Manual §7 note; playbook two symptom→cause rows (*your mobile is
  not on the estimate* → add it on your Contractors row; *a number that rings nowhere* →
  a document generated before today, regenerate it). Both `.md` copies hand-edited.

## The signing packet — the agreement with its Exhibit A actually attached (BUILT 2026-09-08)
*"so there are basically two versions of the agreement? then the specifics are all in the
estimate, which is attached?"* Two forms, yes; attached, no — until now.

- **Both forms incorporate the Estimate as Exhibit A and the estate form says the agreement
  is not valid without it, but the app filed them as two documents in two subfolders and
  nothing stapled them together.** A client sent the agreement alone was signing against an
  exhibit they did not have. `buildSigningPacketHtml(agrHtml, estHtml, job)` is the packet:
  the agreement page, then the **approved** client estimate under an *Exhibit A* band on a
  new page (`.packet-exhibit{break-before:page}`, in the print block AND on screen so the
  exported HTML carries it too). **It re-renders nothing in a second way** — the two existing
  renderers are reused verbatim, so the packet cannot disagree with either document.
- **`_approvedEstimateHtml(jobId)` borrows the Client Estimate tab and gives it back.**
  `renderClientEstimate` reads three globals and writes one element, so they are swapped in
  and restored in a `finally`, including the tab's HTML and `updateApprovalUI()`. Do not
  "simplify" this into a call that leaves the tab showing another job's estimate.
- **Print Signing Packet** sits beside *Print / Save PDF*, toggles with it in `updateAgrUI`
  (a test asserts no bare `btnPdf` toggle survives), gates on `agrApproved` like
  `printAgreement`, and goes through `_printDocument` — the ONE print path. Named
  `<Last>-<HVL>-Signing-Packet` the way the estimate PDF is named.
- **Filed on approval**, 900ms after the agreement, as `<HVL-ID>_Signing_Packet.html` in the
  same `Agreement` subfolder (`exportSigningPacketToDrive`, same once-per-job guard shape as
  `_agrExported`).
- **⚠ FOUND AND FIXED ON THE WAY: both agreements read `currentEstimate`, not the approved
  estimate.** `var est = (currentEstimate && currentEstimate.jobId === jobId) ? currentEstimate
  : null` — so an agreement opened after building a *different* client's estimate fell back to
  `job.havellinEst`, which carries **no rates, no fixed-price flag and no documentation
  scope**: default rates printed against a total that had come from somewhere else. New
  `approvedEstimateFor(jobId)` reads the store record's snapshot while it is approved, and
  both forms read it first. `checkPin` already refuses to approve an agreement whose estimate
  is not approved, so the fallback is now genuinely the blank-template case only.
- §1.1 on both standard-form arms now says the Estimate is *"attached as Exhibit A and
  incorporated by reference"* — true now, and the estate form already said it.
- Manual **§8** note; playbook **Step 6** row (*send the packet, not the agreement alone*)
  and one symptom→cause row (*the client asks where Exhibit A is*). Both `.md` copies
  hand-edited.
- **Verified in headless Chromium**: the packet renders both pages for a Home Transition job
  and a probate job, the exhibit band carries the job id, and the Client Estimate tab is
  byte-identical before and after the borrow.

## The agreements promised a fee the invoice stopped billing five weeks earlier (FIXED 2026-09-08)
*"the one i see in gdrive still has 15% fee on vendors, which we have stricken in the app."*
He was reading a hand-maintained Google Doc template, not an app copy — but the app's own
agreements had the same defect.

- **`SMF_PCT` went to 0 on 2026-08-02 and the estimate, the invoice and the Terms all stopped
  charging it that day. Neither agreement did.** The standard form's **§3.5** stated *"15% of
  vendor invoices for Estate Settlement and Downsizing engagements"* outright, and the probate
  form's fee table carried a *Vendor Management Fee — 15% of vendor invoice* row. Every
  agreement generated between 2026-08-02 and 2026-09-08 promised a fee the invoice never bills.
  A contract clause and an invoice that disagree is worse than either alone.
- **Both read `SMF_PCT` now, the way the estimate footnote always did.** Standard §3.5 is
  *Vendor Coordination* — no fee or markup on vendor invoices; the concierge time is billed
  under §3.3 (hourly, or inside the fixed fee — §3.3 is both, so one sentence covers both). The
  estate fee table names third-party vendors *At cost — no fee*. **Standalone Home Prep keeps
  its 30% under its own §3.5 arm** (that engagement bills no hours; `prepFeeRate`). If the fee
  is ever switched back on, both print `Math.round(SMF_PCT*100)+'%'` rather than a literal.
- The client estimate's SMF row was already gated on the amount but printed a literal `15%`;
  it prints the constant now. A test asserts **no `15% of vendor` literal survives** in the file.
- **Where the app's agreements actually live:** `exportAgreementToDrive` files
  `<HVL-ID>_Agreement.html` into the job folder's `Agreement` subfolder on the Havellin Drive
  (`main-sync.gs` `createJobFolder`). The Drive connector in this session is on the personal
  account and cannot see those; the `Client Agreement Templates` folder it can see holds the
  older Google Doc templates, which are NOT what the app generates and still say 15%.
- Manual **§8** carries the note (and the instruction to re-generate anything issued in the
  window; a signed one is governed by the invoice, which charges less); playbook gained **one
  symptom→cause row**. Both `.md` copies hand-edited.
- **749 committed checks** (`tests/agreement-fees.test.js`, 14 new).
- **The Google Doc templates are retired IN PLACE (2026-09-08, after the Drive connector was
  reconnected on the Havellin account).** `08_Clients` was confirmed empty — no app-generated
  agreement exists on Drive yet. In `02_Legal / Client Agreement Templates`:
  *Havellin_Client_Agreement_Estate Transition & Downsizing* is renamed **RETIRED …** and
  *Havellin_Probate_Professional_Services_Package* is renamed **NEEDS REWRITE …** — the latter
  is a cover letter + 13-phase overview + attorney-facing fee schedule + agreement, and only
  the agreement part is superseded; the rest still says 15% VMF, *"licensed"*, the old tagline
  and a *Phase 5* midpoint trigger. A `READ ME` text file in the folder says agreements come
  from the app and to send the signing packet. **Moving either doc to `10_Havellin Legacy
  Documents` was refused** (*The caller does not have permission* — the connector can rename
  but not re-parent on the Shared Drive), so they stay in the folder under the retired names.

## Downsizing → HOME EDITING · Downsizing & Move Management → HOME TRANSITION (RENAMED 2026-09-08)
*"we have changed downsizing & move management to 'home transition' … also, i think 'downsizing'
on its own should be 'Home Editing'. all we are really doing in a downsizing with no move
management, is editing what a couple will take to their new home."*

- **The KEYS did not move: `downsizing` and `downsizing_move` are still the keys.** They are
  stored on every job, estimate and snapshot, and `JOB_STEPS`, `PRICING_REF`, `isDecedentJob`,
  the Win/Loss filter and the stage-copy branches all key on them. Renaming a key would strand
  every saved record and re-route nothing usefully. So the variable names (`isDownsizing`,
  `downsizingPSReduct`, `downsizing-dest-fields`) and the code comments still say downsizing,
  and that is fine — they are not read by anyone outside the file. **The names live in
  `SVC_LABELS` and every label site reads it.** `PRICING_REF` and the agreement's `svcMap`
  carry their own copies, and a test asserts they agree.
- **⚠ THE EDIT CLIENT MODAL HAD ITS OWN HARDCODED SERVICE LIST**, `sel([{v:'downsizing',
  l:'Downsizing'},…])` at the `ec-svc` field, and the first pass missed it — the new test's
  *no `'Downsizing'` literal survives* check is what found it. It reads `SVC_LABELS` now. The
  comment above `SVC_LABELS` has said *"the single source of truth for every place that
  renders a service name"* since it was written, and this was the second copy anyway.
- **`job.svcLabel` is stored at intake, so a job saved before the rename carried
  *Downsizing* on the dashboard, the invoice header, the approval email and the agreement
  email forever.** Six readers of the stored label are routed through `svcLabelOf(job)` —
  catalogue first, stored text only for a key the catalogue no longer has. A test asserts no
  bare `(job.svcLabel||…)` reader survives, so the next rename cannot leave a stale one.
- **What was renamed:** intake and Edit Client dropdowns · the Move Destination hint · the
  reference bands · the Build Estimate service badge and its missing-sqft warning · the
  client estimate's fee-table sub-header (*Onsite Home Editing Services* / *Onsite Home
  Transition Services*) and the home-editing narrative · the Win/Loss filter button (one
  button, both keys, now *Home Editing / Transition*) · the materials tiers (*Downsizing
  Basic/Standard/Premium* → *Home Editing / Transition Basic/Standard/Premium*, because
  `pkgLabel` prints on the client estimate and the invoice) · the standard agreement's §1.1
  Services list and §3.5 SMF clause and its header map · the α hint copy in Settings and on
  Build Estimate.
- **What deliberately kept its name:** the **Move Management** card on Build Estimate and the
  *Move Management — Destination Setup* fee-table band. Those describe the move-day WORK
  inside a Home Transition, not the service, and "Home Transition — Destination Setup" would
  say less. The probate agreement's map never listed either service (decedent-only) and is
  untouched.
- **Nothing behavioural moved** — pricing, stage copy, agreement routing and `isDecedentJob`
  are all keyed and all unchanged; the doc-scope tests that price `'downsizing'` still pass.
- **Not touched:** `PRICING_SCHEMA.md` and the other spec files, which are historical.
- Manual **§4** carries the rename note (what changed, what kept its name, old jobs show the
  new name); playbook gained **one symptom→cause row** for someone hunting *Downsizing* in the
  dropdown. Both `.md` copies hand-edited to match.
- **735 committed checks** (`tests/service-labels.test.js`, 27 new).

## Pricing an estate job WITH or WITHOUT the paperwork (BUILT 2026-09-04)
*"we don't quite know yet if when we get an estate settlement job, the attorneys are going to
want us to do all that work to support their workflow or if they're just going to delegate to a
junior associate or paralegal … I want to be flexible in the ability to price with and without
paperwork."* Then: *"i guess the agreement language needs to be updated as well then. not just
the estimate tab and pricing."* He was right on both.

- **The `document` step was hard-wired to the service type and is a third to two-fifths of the
  ticket.** Measured with the real engine on a 3,500 sqft home at Normal, 2 specialists:
  Estate Settlement $18,650 → $12,300 without it (34%), Probate $21,850 → $13,250 (39%),
  Contested $31,350 → $18,550 (41%). A Home Cleanout on the same house is $12,600 — **an estate
  job with the paperwork stripped is a home cleanout in price**, with the estate voice, the
  written-authority gate and the heavier disposition coefficients kept. That is the honest
  floor if counsel keeps the inventory in-house.
- **`DOC_SCOPES` — `full` / `capture` / `none`, a PER-ESTIMATE control on Build Estimate under
  the concierge hands-on share, pinned on the snapshot as `est.docScope` exactly the way
  `tcAlpha` is** (`_estimateDocScope` / `activeDocScope()` / `setEstimateDocScope`; restored in
  `restoreEstimateToUI`, cleared at the three α-reset sites and in `resetEstimate`). **NOT a
  service type** — three shadow services would triple the reference bands and the agreement
  routing for one dial, and `isDecedentJob` still decides who we write to. **NOT a Settings
  value** — whether the attorney's office keeps the inventory is decided job by job.
  - `effectiveJobSteps(svc, scope)` is the only thing that touches the coefficients and it
    returns a COPY; `JOB_STEPS` is never mutated, so every reader asking "does this SERVICE
    price documentation" (`svcHasDocStep`) keeps reading the catalogue. `computeEngineV3` takes
    the scope as a sixth argument that defaults to `full`, so every pre-existing caller prices
    exactly as before; `calcAll` passes the pin.
  - **`capture` is half the document pool and NONE of its coordination** (`DOC_CAPTURE_POOL_SHARE`
    = 0.5). The coordination column pays for appraiser scheduling, and on a capture-only job
    that moves to counsel. **The 50% is a starting coefficient Anthony agreed to tune on the
    first real job** — it is not measured. Capture is the tier I expect attorneys to actually
    ask for: a paralegal can build a schedule from our photographed list but cannot walk the house.
  - Services with no document step ignore the scope and hide the control; `estimateDocScope(e)`
    answers `none` for them whatever the field says, and `full` for a snapshot saved before
    2026-09-04 (no field), because that is what it was priced at.
- **⚠ THE CLIENT ESTIMATE AND THE AGREEMENT READ THE PIN, NOT THE CATALOGUE.** `_cePhases`'
  `hasDoc` now comes from `estimateDocScope(e)`. The `isDeceased && !hasDoc` arm deleted on
  2026-08-03 as unreachable **is reachable again and is back** — three decedent arms now:
  *Sorting, Documentation & Inventory* / *Sorting, Photography & Listing* / *Sorting &
  Set-Aside*. The records list drops the valued inventory and the appraisals on the reduced
  scopes; the court-grade records survive only on `full`; the close-out §733.604 sentence
  branches. **The standing rule against explaining an absence yields here, once, in the stage**:
  *"Valuation is not part of this engagement"* / *"The inventory and valuation of the estate are
  being handled by counsel"*. This absence shifts a responsibility, and a reader who skipped the
  line would assume Havellin carries it. A test asserts each carve-out appears exactly once.
- **The estate agreement had three places selling the inventory** — the Scope of Services
  paragraph, the §5.2 compliance list (*"Havellin will prepare a documented asset inventory…"*,
  *"Havellin will coordinate professional appraisals…"*) and the midpoint-payment trigger
  (*"Phase 5 (Asset Inventory)"*, on a job that may have no such phase). Pulled into
  `_agrScopeServices` / `_agrProbateCompliance` / `_agrMidpointTrigger` so the tests drive
  them without a DOM; the §5.3 appraisal row becomes *Admit an appraiser engaged by counsel*.
  `renderProbateAgreement` reads the scope off the estimate it attaches, and the blank
  template (no estimate yet) reads as the full form it always was.
- **Found in passing, not fixed: `svc-mult-badge` does not exist in the DOM.** `calcAll` writes
  the service badge into it behind a null guard, so the *"Estate Settlement: adds full item
  documentation"* wording has been dead for some time. The wording now follows the scope
  anyway, so it is correct if the element is ever put back.
- **Verified in headless Chromium, not just asserted on source**: the control shows on an estate
  job and hides on a downsizing, the total moves $19,900 → $15,950 → $13,150 on a five-room
  probate, the Estimate Summary relabels the halved step *Photograph & list (counsel values)*,
  and both the rendered client estimate and the rendered agreement change their stage title,
  midpoint trigger and appraisal row with the pin.
- **Intake asks the question and SEEDS the estimate; it does not price (same day).** *"Should we
  build that drop down into the client intake tab as well?"* Yes, as a seed, not a second dial —
  two controls both claiming to decide it is the two-copies-drift bug this file records twice.
  `i-docscope` (*Who builds the inventory?*) sits in the estate block after the documentation
  gates, saves as `job.docScope`, and Edit Client offers it on every estate service (the first
  draft saved it inside the probate-only branch, so an Estate Settlement edit dropped it — a
  test now asserts the `isEstateEdit` placement). `seedDocScopeFromJob(job)` is read at the
  fresh-build site ONLY; `restoreEstimateToUI` reads the snapshot's own pin, so changing the
  intake answer never restates an estimate already priced. `_docScopeIntakeNote` prints
  *"Intake recorded None; this estimate is priced at Full"* under the dropdown when they differ
  — not a warning, overriding on the walkthrough is legitimate, but the attorney was told one
  of the two and they must never silently disagree. Verified in Chromium: hidden on a
  downsizing intake, resets to Full, a fresh estimate opens at the job's answer, the note
  appears on override. Manual §4 and playbook Step 1 plus one symptom row.
- **708 committed checks** (`tests/doc-scope.test.js`, 155 new). Manual §4/§5c/§7/§8 and playbook
  Step 1/2/3/6 plus four symptom→cause rows, both `.md` copies hand-edited to match.

## The production rate moved onto the estimate; the cost card was never pinned (BUILT 2026-09-02)
*"why are these now in app setting? … if they are set across the app, they will apply to all
jobs and that is not correct. these look like 'per job' settings, don't you think?"* Half
right, and the half that was wrong is what found the worse bug.

- **The production rate (α) is a judgement about the PROPERTY, and its own help text proved
  it** — *"Dial it down on trophy estates where the concierge is mostly directing; up on
  straightforward downsizings"*. A per-job instruction attached to a firm-wide control. To
  follow it you edited Settings, built the estimate and changed it back, which works until
  the day you forget. It is a field on **Build Estimate under the crew counts** now
  (`setEstimateAlpha` / `resetEstimateAlpha`), with Settings holding the DEFAULT a fresh
  estimate starts at. The pinning machinery already existed — `est.tcAlpha` and the readout
  when Settings has moved since — so only the control relocated.
- **⚠ THE FOUR COST RATES STAY FIRM-WIDE, and do not "fix" this later.** A **named**
  contractor is already paid their own rate from the Contractors directory; these four only
  ever covered the founders and the unnamed placeholder slots. What you pay someone does not
  change because the house is bigger, and a per-job cost override is an invitation to fudge
  margin job by job — which is the one thing the walk-away floor exists to stop.
- **⚠ BUT SETTINGS WAS LYING: *"Saved estimates keep the crew cost they were priced with"*
  was FALSE.** α was pinned; the cost card was not. `getPSCostRate` / `getTCCostRate` read
  the `COST_RATES` globals on every render, so raising contractor PS from $30 to $35
  retroactively moved the margin, the walk-away floor and the deposit-coverage warning on
  **every estimate ever saved**. The screen made a promise the code did not keep, and it took
  a question about where a control lives to surface it.
  - `costRates` is stamped on the snapshot beside `tcAlpha`; `_estimateCostPin` /
    `activeCostRates()` mirror `_estimateAlphaPin` / `activeAlpha()` exactly.
  - **A named contractor still wins over the pin** — tested, because that is the rule the
    whole cost model rests on.
  - **An estimate saved before 2026-09-02 has no `costRates` and falls back to live.** There
    is nothing honest to invent for it, and Settings now names that exception rather than
    implying the figure is historical.
  - `resetEstimateAlpha` deliberately does NOT clear the cost pin — resetting the production
    rate says nothing about what the crew cost. A blanket edit clipped that and a test caught it.
- **`.lbl-hint` was scoped to `.vform .fld label`** while the comment above it offered it as
  general, so the first use elsewhere inherited the label's uppercase and read as one run-on
  heading. General now.
- **The four cost rates are relabelled to say what they are.** *"we have all contractor
  pricing pinned to individual contractors, including the founders. what is going on with
  that? that seems the most accurate way to price jobs."* It IS, and it already happens:
  Anthony $100, Ashley $100, Anthony Jr $60 all sit in `DEFAULT_CONTRACTORS` with their own
  rate, and a named person always wins. **The four only fire before a name exists — which at
  ESTIMATE time is normally the whole specialist crew**, because Build Estimate takes a
  headcount and naming is Job Plan work once Won. So they price the margin on an estimate and
  the real rates take over as the crew is staffed. *Founder concierge* → **Concierge not yet
  assigned**, *Contractor PS Standard/Senior* → **Specialist slot**, and the heading
  *Labour Cost Rates — what we pay* → **Assumed Crew Cost — before anyone is named**. Nothing
  behavioural changed; the labels were describing a parallel rate card that does not exist.
- **One empty state for the five job-selecting tabs (`.tab-empty`).** *"let's standardize the
  look of these three screens to match Client Estimate."* Four tabs had four answers to the
  same moment — Inventory and Job Plan printed bare grey text on cream, Invoices a 780px
  centred sheet, Client Estimate a full-width white band. Two traps found doing it:
  - **The Inventory picker was not misplaced; the blurb was too long.** The header is
    `flex-wrap:wrap`, so a long left-hand block pushes the select onto its own row. Shortening
    the copy fixed the layout — reach for that before touching the flex rules.
  - **The document tabs frame a 780px sheet on a white band**, so a bordered card inside that
    rendered as a box inside a box. `:has(> .tab-empty)` stands both down when the page holds
    nothing but the message, and a loaded document is untouched (verified: still 780px, still
    on its band). **`#inv-page-content` had its width INLINE**, which beats the stylesheet, so
    the stand-down could never win there — moved into CSS.
- **553 committed checks.**

## Clearing the practice data (BUILT 2026-09-02)
*"how do i delete all of my dummy clients and their inventories, estimates, etc"* — asked
before the first real jobs. `previewReset()` / `resetAllJobDataConfirm()` /
`trashJobFoldersConfirm()` in `main-sync.gs`.

- **Two steps, the same shape as `pruneQuoStale` / `pruneQuoStaleConfirm`**: the preview
  names every row and folder that would go, and a differently-named function is the only
  thing that removes anything. **None of them is in `doGet` or `doPost`**, so no HTTP
  request can reach them — a destructive action must not be one malformed URL away.
- **⚠ `Estimates` AND `Hours` ARE FOSSIL TABS, and they mislead anyone clearing by hand.**
  The app posts `type:'job'` plus the `saveAll*` blobs and **nothing else**. `type:'estimate'`
  → `saveEstimateToSheet` and `type:'hours'` → `saveHoursToSheet` still exist server-side with
  no caller. `Estimates` was written by an OLDER build and the comment in `saveEstimateState`
  records the decision to stop: one authoritative write, not *"a second, differently-shaped
  'estimate' write that could diverge"*. `Hours` usually does not exist at all, because
  nothing ever called the function that creates it — **so do not read a missing `Hours` tab as
  data loss.**
  - **The real estimates are the `EstimateStore` blob; the real hours are `LogStore`.** Both are
    one JSON string in **column B**, chunked across rows — column A carries only a timestamp on
    row 2, so a glance at the left of the sheet looks empty either way.
  - Anthony hit both halves within minutes: *"i looked in the estimate tab of that sheet and
    there was no information in it"*, then *"there is an EstimateStore tab and nothing writes to
    it."* The second is not true — `saveEstimateState()` posts `saveAllEstimates` on every
    estimate save — but the sheet gives a reader no way to tell.
- **What it clears:** `Jobs` / `Estimates` / `Hours` sheets (headers kept — the app writes
  against those column names) and the `EstimateStore` · `JobPlanStore` · `ChangeOrderStore` ·
  `LogStore` · `MediaStore` blobs.
- **What it deliberately does NOT touch.** The Vendor Directory and Referral Partners are
  **separate spreadsheets** with 150+ rows of real work — nothing here opens them.
  `ContractorStore` is the crew, not practice clients, so it survives unless you pass `true`.
  Drive is a separate function again, and it **trashes rather than deletes** — the photographs
  are the one thing that cannot be re-typed, so they get Drive's 30-day undo.
- **⚠ THE ORDERING USED TO BITE: clear every DEVICE too, or the wipe undid itself.** The stores
  merge by record id and union, so a browser still holding the old jobs pushed them straight
  back up on its next save and the sheet repopulated with what you just deleted. **This
  happened for real on 2026-09-08 and the sheet now refuses it — see the job-ledger section
  above.** Clearing a device is still the way to make it stop SHOWING the old clients before
  its next save or reload. Per device, keeping Settings and the cached directories:
  **Settings → This Device → “Clear this device & reload from the sheet”** (`clearLocalJobData`).
  **⚠ The version suffix is part of every key** — `havellin_jobs_v3`, `havellin_est_v4`,
  `havellin_jobplan_v1`. The first `LOCAL_JOB_DATA_KEYS` anchored on `_v$` and matched
  **nothing**, so the button announced "nothing to clear" on a device holding every dummy
  client. A false all-clear is worse than no button. A test now walks every
  `localStorage.setItem` key in the file and fails on one that is neither cleared nor
  deliberately kept, so a new store cannot be added and quietly missed.
  - Worth knowing about the re-push risk: **jobs, job plans, logs and change orders are
    overwritten wholesale from the cloud on load**, so those self-heal. **Estimates merge per
    key** (a local record for a job the sheet does not know survives) and the **inventory
    unions per item**, so those two really do come back from a stale device.
  It has to be a button rather than a console snippet because the devices are an iPad and a
  phone, where there is no console to paste into. `hav_sheets_url` / `hav_vendor_url` / `hav_referral_url` / `hav_tc_alpha` /
  `havellin_defaults_v` and the two `_dir` caches are left alone on purpose — otherwise the
  first thing after a reset is re-typing three Apps Script URLs on a phone.

## Three rows numbered #1, and a panel that could not explain itself (BUILT 2026-09-02)
*"seems like double counting here, multiple times. and how can both be true?"* — off a
screenshot of the Removed items panel showing two tombstones both reading **#1** beside a live
row also on #1.

- **The live list was NOT double counting.** Each object appeared once; the same names appear
  again in *Removed items*, which is the undo buffer. Delete an import, bring it in again, and
  both are true at once — the panel simply never said so. It now stamps the removal date and
  marks a row whose object is on the list again: *"already back on the list"*. Its header says
  plainly that nothing in it is counted, valued or printed anywhere.
- **⚠ THE REAL DEFECT: the collision pass ran over `_jobInvRefs`, which HIDES tombstones.**
  So duplicate numbers among removed rows were never resolved, and a tombstone could sit on a
  LIVE row's number indefinitely. Press Restore and you have two live items numbered the same
  — the exact failure the numbering exists to prevent, since a receipt, an approval request
  and a court inventory all cite that number. Reproduced before fixing: three rows on #1.
  - It now runs over **every** inventory row, live and tombstoned.
  - **LIVE ROWS RESOLVE FIRST AND A TOMBSTONE NEVER DISPLACES ONE.** A live item's number may
    already be printed and in somebody's hands; a removed one's is not. Within each pass the
    earliest-created row keeps the number, ties on `stableId`, so devices converge. Tested for
    idempotence — a second pass must not churn.
- **`restoreInventoryItem` checks before it promises.** *"Restore keeps the original item
  number"* holds only while that number is free; a merge from another device can have put it
  on a different object. It now issues the next free number in that case **and says so** —
  renumbering silently is worse than the collision, because the person restoring is the one
  who might have the old number written down.
- **"2025 2025 Mercedes E63" in the panel is pre-2026-08-24 history**, from before
  `_vehicleLineName` fixed the year+description join. New rows read correctly; the tombstones
  are left as they were, because rewriting history in an undo buffer is not a fix.
- **462 committed checks.**

## The Inventory tab became the concierge's review desk (BUILT 2026-09-01)
**⚠️ REQUIRES AN APPS SCRIPT REDEPLOY** — `main-sync.gs` gains `getThumbnails`.

Anthony: *"after working on a job all day and using the job plan tab in each room … the
transition concierge will be at home or in the office, and they will transition from the job
plan, which is what they use in the field, to reviewing the inventory tab … maybe it should be
grouped by disposition channel. And then within that, by room."* Plus, on the column-group
buttons: *"I don't really understand what happens at the bottom with all these squares or
rectangles you tick."* Full spec: `INVENTORY_WORKSPACE_SPEC.md`.

- **THE TWO TABS ARE TWO SURFACES AND THE SPLIT IS THE WHOLE DESIGN.** Job Plan is the FIELD
  (a phone, in the room, one item at a time); Inventory is the DESK (that evening, the day's
  captures worked over). Inventory is not a `data-field` tab and must not become one.
- **The 29-column table is deleted, and so is the switcher above it.** `INV_VIEWS` / `_invView`
  / `setInvView` / `_invVisibleCols` are gone. **A control that exists only to work around the
  width of the thing below it is a symptom, not a feature.** The column `group` metadata
  SURVIVES as the item panel's four sections (`_invPanelSection`), so there is still one
  definition of what a column is — and the old test that no visible column lacks a group still
  earns its keep, now against the panel. The export never changed: workbook and CSV carry all 30.
- **Grouping is Disposition → Room, and `INV_GROUP_ORDER` is not alphabetical on purpose.**
  Not yet decided · Keep · Auction · Consign · Sell · Donate · Junk · Hold — the order decisions
  are made in. **The empty bucket sorts FIRST because it is the worklist**; the field chip is
  optional, so most items arrive with no disposition. Rooms inside run in walkthrough order
  (the estimate's `idx`), so the review retraces the day. A disposition not on the list still
  renders — dropping it would hide real property from the person reviewing the estate.
- **⚠ REVIEW GATES NOTHING AND LOCKS NOTHING. DO NOT ADD A GATE HERE LATER.** Anthony, deciding
  it: *"we may want to show in-progress work to clients during an engagement so this should not
  be locked until complete."* An approval checkpoint that withholds the document is precisely
  what stops a client being shown honest work-in-progress, and this business does that on
  purpose. `_invProgressStamp` stamps **IN PROGRESS — N of M items reviewed** on every client
  document instead. There is a test asserting no document function consults `_invReviewStats`
  to decide whether to run.
- **THE WEBSITE IS A SPEC.** The published deliverables page commits to documents the app could
  not produce. Read it before building anything client-facing.
  - **`printEstateInventoryReport`** — §02's field set exactly: description · location · qty ·
    condition · date-of-death FMV · **the valuation source stated**, a thumbnail and reference
    number per line, homestead/exempt/non-probate **carved out** into their own schedule. A line
    with a value and no source prints **not stated** in red rather than a blank — that promise
    is the reason `valNote` (Valuation Basis / Comps) exists as a column at all.
  - **`printApprovalRequest`** — §03: *"written approval requests, itemized item by item, before
    anything of value leaves the property. Verbal approval is never accepted."* The app recorded
    the RESULT of an approval (`authBy`/`approvalDate`) and had nothing that produced the
    REQUEST. **`INV_RELEASE_DISPOSITIONS` excludes Keep and Hold by definition** — nothing is
    leaving, so there is nothing to ask for. `invRecordApproval` writes the signature across
    every selected item in ONE action; typing it row by row is how a signed approval ends up
    recorded against three items out of twenty.
  - **Appraiser `dueDate`** — §02 promises "expected turnaround" and nothing recorded it.
- **`exportInventoryCSV` is built off `buildInventoryPayload`**, the same rows the Drive workbook
  is written from, so the file emailed to an attorney cannot disagree with the workbook shared
  with counsel. **The BOM is not decoration** — without it Excel reads UTF-8 as Windows-1252 and
  every § and é in a category arrives mangled on the attorney's screen.
- **⚠ PHOTOS DO NOT COME FROM `drive.google.com`, AND MUST NOT.** The first draft of this claimed
  a thumbnail could only exist on the device that took the shot; Anthony pushed back —
  *"everything that is photographed in the job plan tab gets pushed to Google Drive, so I don't
  know why you couldn't pull thumbnails back"* — and he was right that they can. But not directly:
  `shareFolder` grants access with `addViewer(email)`, named viewers only, never "anyone with the
  link", so Drive demands an authenticated session; the app is served from GitHub Pages, making
  that cross-site; **Safari blocks third-party cookies by default**. It would render on desktop
  Chrome and fail on the iPad — failing on one device only is worse than failing on all of them.
  The Apps Script runs AS the Havellin account, so `getDriveThumbnails` hands the bytes back.
  A test asserts no such URL survives in code (as a comment, yes; in code, never).
  - **Every upload has ALWAYS returned `fileId` and the app discarded it** (`onDone(d.ok,
    d.fileUrl)`). Kept now; `_invFileId` regexes it back out of `driveFileUrl` for the backlog.
  - **`_invThumbHTML` renders the PLACEHOLDER ONLY** and `_invPaintThumbs` fills images in after.
    Inlining base64 per row would put megabytes of data URI into the HTML on every re-render, and
    this tab re-renders on every disposition change and every review tick. The PRINT path inlines,
    because there is no second pass there.
  - Thumbnails cache under their own `hav_media_thumb_<jobId>` key — same reason `_photoRetryData`
    is separate: image bytes must never crowd the manifest write out of the quota. **That was a
    comment and not a rule until `INV_THUMB_CACHE_MAX` (2MB) enforced it.** localStorage is ~5MB
    for the whole origin and the MANIFEST shares it; a 300-item estate at ~21KB of base64 a
    thumbnail is 6MB, so an uncapped photo cache does not just fail to save itself, it starves
    the one write that must never fail. Oldest-first eviction, and a cache that still will not
    fit is removed outright rather than left half-written. Thumbnails are refetchable; the
    record is not.
  - **Measured on the real Havellin folder: 16KB via `thumbnailLink` against a 130KB photo.**
  - **⚠ `DriveApp.File.getThumbnail()` IS NOT A THUMBNAIL AND MUST NOT BE TRUSTED BY NAME.**
    On a real Havellin photo it returned `null` on one run and the **whole 130KB image** on
    the next. The first build put it first in the chain and fell through to `file.getBlob()`
    when it was null, so both paths shipped the archival photograph. Anthony's own
    verification run is what caught it — *"OK — thumbnail returned, 177379 chars of base64"*,
    then *"OK - 130 KB, via getThumbnail"*. The app compresses to 900px before upload, so
    ~130KB IS the archival image; at 300 items that is 40MB, past the Apps Script response
    limit, past localStorage, and far too much to repaint on every review tick.
  - **`drive.files.get` answered *File not found* for a file `DriveApp` opens fine** — because
    the estate folders live in a **Shared Drive**, and the Drive API needs
    `supportsAllDrives: true` to see one. Passed on both the v3 and v2 call shapes now.
    A "not found" from that API against an id that plainly exists means this, essentially
    every time; do not go looking for a bad id.
  - **`_thumbViaEndpoint` is the fallback that needs no advanced service at all** —
    `drive.google.com/thumbnail?id=…&sz=w240` fetched by `UrlFetchApp` with the script's OAuth
    token. **Note the asymmetry, it is the whole point:** the BROWSER must never point an
    `<img>` at that URL (cookies, cross-site, Safari — see `_invThumbHTML`), but the SERVER
    holding a Bearer token can. `_fetchThumbUrl` rejects a non-`image/*` content type, because
    an auth wall comes back as a 200 with an HTML body and would otherwise cache as a photo.
  - **THE RULE: trust the measurement, not the method name.** Every candidate goes through
    `_thumbAccept` and is rejected above `THUMB_MAX_BYTES` (60KB) whatever produced it. The
    Drive API's **`thumbnailLink` at `=s240`** is FIRST because it is the only source whose
    dimensions we control (needs the advanced Drive service + one UrlFetchApp authorisation);
    `getThumbnail()` and the raw file follow, both size-checked. `THUMB_BUDGET` stops a batch
    mid-way rather than failing it whole; the app re-asks for the remainder.
  - **`testDriveThumbnails` probes all three sources and prints the size of each.** *Which
    source, and how big* is the only useful question when this path misbehaves, and a single
    cheerful OK line let 130KB through twice.
- **The `savePhotoRefs` whitelist is still the thing that bites.** `reviewed` / `reviewedAt` /
  `reviewedBy` / `valNote` / `driveFileId` all had to be added or they are dropped on the next
  save, silently.
- **Also fixed: the test harness's brace scanner.** It read a regex literal after `return` as the
  start of a string (`return /[",\n\r]/` — the char before `/` is `n`, which looks like the end
  of an identifier) and ran off the end of the function. `REGEX_OK_AFTER` now tracks the preceding
  *word*, and whitespace does not clear it. That bug had been latent since the harness was written.
- **The bulk bar looked broken and was two-thirds right (FIXED same day).** *"these dropdowns
  don't seem to work or hold values."* Disposition and valuation source were writing correctly;
  what was missing was any evidence of it. Applying a disposition **moves the item into another
  section**, the select reset itself to a placeholder, and the only confirmation was a toast in
  the opposite corner of the screen — indistinguishable from a control that does nothing.
  - **The selects now show the value the selection SHARES** (`_invBulkCommon`), and the
    placeholder only when the picked items disagree. A bulk control showing one item's answer
    while three others hold another is worse than showing nothing.
  - **The room menu was displaying a lie.** `_invRoomOptions(jid, undefined)` marks
    *Unassigned / estate-wide* `selected` for a blank value, so the control read as though a
    room were already set. It builds its own options now, and **`__none` is an explicit,
    selectable destination** — "estate-wide" and "nothing picked" are different answers and
    only one of them is a move.
  - **Selecting the placeholder is now a no-op.** Before, `value === ''` on `roomIdx` would
    have unassigned every selected item.
  - The bar says what it did, in the bar — *"Auction set on 2 items — they are now under the
    Auction section"* — and, when the change pushes items out of the active filter, that they
    have gone from the screen and how to get them back.
  - **`.btn-s` is `background:none` with grey text**, so on the dark bar the buttons rendered
    as disabled-looking ghosts; they are painted explicitly now. And the global
    `input,select,textarea{width:100%}` rule was stacking the three selects one per row.
- **451 committed checks**, and the tab was driven end to end in a real headless browser
  (grouping, panel, bulk edits, CSV quoting, both new documents) — not just asserted on source text.

## "Apps Script needs redeploying" on a deployment nobody had touched (BUILT 2026-09-01)
*"got this error when saving a new vendor. we haven't changed the apps script for a re-deploy
i dont think."* He was right to doubt it — the chip was overstating what it knew.

- **`_isBackendStaleError` was reading OUR errors as a verdict on the SERVER.** It matched
  `unknown type|unknown action|is not defined|not a function` against whatever text reached
  `_enqueueWrite`, and two of the three call sites hand it a **client-side** message: the
  `.catch` in `_flushOutbox` (a fetch failure, or any TypeError thrown in our own promise
  chain) and `queuedDirectoryWrite`, whose callback cannot distinguish a parsed
  `{ok:false,error}` from `_appsScriptPost`'s catch. So a TypeError in `havellin.html` was
  announced as a stale Apps Script — a diagnosis pointing at the one component that was fine.
  - Now `_backendErrorKind(errText, fromServer)`, and **provenance is required**: only text
    the server sent back inside `{ok:false, error}` may diagnose the server. Every call site
    passes `fromServer` explicitly and `_appsScriptPost` tags its catch path `clientError:true`.
    A test asserts no bare call survives — the default is falsy, so it fails safe, but a bare
    one is how the misdiagnosis creeps back.
- **AND "is not defined" IS NOT PROOF OF STALENESS.** A half-applied paste throws it; so does
  a live bug on a perfectly current deployment, and the two are indistinguishable from here.
  Three outcomes now, not two: **`stale`** (`Unknown type/action` — the server saying it has
  no dispatch line for this write, which *is* proof) keeps *"Apps Script needs redeploying"*;
  **`crash`** reads *"the Apps Script returned an error"*, still held rather than hammered,
  but prescribing nothing; **`''`** retries as before. **Don't fold `crash` back into `stale`
  to simplify the wording** — sending someone to redeploy a script they never changed costs
  more than saying "it errored, here is the error".
- **The reason was still unreadable, on the device it happens on.** The 2026-08-24 build moved
  the server's error out of a 4-second toast and into the chip's `title` — **a phone has no
  hover**, and tapping the chip cleared the blocked flag and re-flushed, so on a phone the one
  identifying detail could never be read at all. Tapping now **opens** a panel naming each
  write, which backend it was bound for, and the server's own words, with **Try again** as a
  deliberate button. `_pendingChipCopy()` derives the wording from the queue with no DOM, so
  it is driven end to end in the tests rather than grepped for.
- **`flushPendingWrites` never re-read its verdict.** `blocked`/`lastError` were whatever the
  FIRST failure said, so a write that only became blocked on a later attempt was retried
  forever and one whose error had changed still showed the old reason. Each attempt now
  reclassifies, and a queue holding nothing but blocked writes stops scheduling retries —
  before, "held, not hammered" quietly stopped applying the moment you pressed the chip.
- **What it was NOT: `addVendor` is still never queued** and never reached this chip.
  It is excluded from `IDEMPOTENT_DIR_WRITES` on purpose (an append cannot be re-sent), so the
  stuck write was something else in the session — which is exactly what the chip could not say
  and now can.
- **391 committed checks.**

## Two off the Add Vendor form: a dropped control and a duplicated row (BUILT 2026-08-27)
*"slight formatting error here with the boxes way below where they should be"* and, minutes
later, *"when i saved a new vendor the card never cleared (it said 'saving' and never appeared
to save), so i hit save again and two versions of the same vendor were saved."*

- **A five-line note under one input dropped its two neighbours' selects 101px below their own
  labels.** Measured, not eyeballed: COI on file and Reciprocity had a 101px label→control gap
  before, 18px after (the 18 is correct — it is the one extra line the two-line Category label
  runs to, which is what `margin-top:auto` exists to absorb). Every cell in a `.vform` row
  stretches to the tallest one and `.vform .fld` pushes its control to the BOTTOM of that
  height, so anything a cell carries UNDER its control drags the whole row's controls down with
  it. **The Last contacted cell was already made `.fld-wide` to escape this exact trap** and the
  comment on it says so — the same trap was simply reintroduced one cell over.
  - **THE RULE: guidance that runs to more than a few words goes in its own full-width
    `.vform .fld-note` row, never inside the cell.** Short hints ride on the label
    (`.lbl-hint`); a caption that must sit between label and control is `.eg`. A test parses the
    real markup and asserts **no `.fld` cell carries rendered content after its control**, so
    the next one is caught rather than reported off a screenshot. (`<datalist>` is exempt — it
    is `display:none` and cannot stretch anything.)
  - The note also stopped repeating `separate several with ;`, which the label already says.
- **⚠ NOTHING DOWNSTREAM CATCHES A SECOND PRESS OF SAVE, AND THAT IS DELIBERATE.** `addVendor`
  is excluded from `IDEMPOTENT_DIR_WRITES` on purpose — an append cannot be re-sent, because a
  failed POST never reveals whether it reached Google — so it is not queued and not retried.
  The consequence nobody had drawn: **the button was the only guard, and there wasn't one.**
  Apps Script can take several seconds on a cold start, the button sat there enabled and
  unchanged, and a second press appended the row again. Verified in a headless browser against
  a 3-second endpoint: **two `addVendor` POSTs before, one after.**
  - `_vendorSaveBusy` + `_setVendorSaveBusy` disable the button and repaint it to *Saving…* —
    the button is where the eyes are after a press, not the status line beside it (the same
    lesson as the Save-to-Drive repaint).
  - **`_vendorByName` refuses an ADD of a name already in the directory**, and this is a
    correctness rule rather than tidiness: `resolveJobVendor` identifies a vendor **by name**
    because the row index is not stable, so two rows under one name make every later lookup pick
    between them at random. Normalised on case and whitespace — the second entry is typed, not
    pasted. The guard is inside `if (!editId)`; an edit legitimately keeps its name.
  - **A 45-second watchdog re-enables the button rather than leaving the form stuck** (a `fetch`
    has no timeout), and when it fires it says the row may already have been written and reloads
    the directory — so the name check above has the truth to test against before anyone presses
    again. **Never re-enable silently: that is the exact moment a second press duplicates.**
  - **A failed append now says what is actually unknown** — "the row may still have reached the
    sheet — reload and check before pressing Save again" — instead of just *Failed*, which is
    what invited the duplicating press in the first place.
  - A test asserts `addVendor`/`addPartner` are still NOT in `IDEMPOTENT_DIR_WRITES`. "Fixing" a
    failed save by queuing it would duplicate rows automatically, with no person to blame it on.
- **364 committed checks.** `manual.html` §13 and the playbook's symptom table (two new rows)
  carry the one-press-one-row rule; the four doc files were hand-edited and tag-balance checked.

## Four things reported off one screenshot (BUILT 2026-08-24)
*"there are an insane number of columns here and scrolling right is not ideal … if Marie
Wayland is attached to the coin collection, do i need a drop down for valuation source? …
do we need the company name twice?"*
- **The manifest shows ONE SLICE at a time.** 29 columns is not a table anybody reads.
  `INVENTORY_COLUMNS` entries carry `pin` or a `group` — **Valuation · Disposition ·
  Flags & Track · Everything** — and Item # / Object Name / Category are pinned in every
  view. **The EXPORT is untouched: the workbook always carries all 29.** A test asserts no
  visible column is missing a group, or it becomes unreachable in the UI.
- **Linking an appraiser sets Valuation Source to *Appraisal* by itself.** Anthony's
  question was the right one — a credentialed appraiser on the row IS the answer to "where
  did this value come from". It never overwrites a source chosen deliberately, and
  **unlinking clears it**, because *Appraisal* with no appraiser behind it is exactly the
  unsupported claim the guardrail exists to catch.
- **The firm was named twice on the appraiser row** — once in the directory dropdown and
  again in the Firm box below it. Picking a vendor now hides that box (the input stays in
  the DOM, `addAppraiser` still reads it) and the Name field becomes *Contact at &lt;firm&gt;*.
  Clearing the picker brings it back for a genuine one-off.
- **⚠ RESTORE. A tombstone keeps every value on the row and nothing offered it back.**
  That design exists for merge correctness — absence is not deletion — and it means an
  accidental delete is fully recoverable. Nothing surfaced it, so a **$500,000 line with a
  linked appraiser was lost to a mis-click** with a perfect copy sitting in the store. A
  *Removed items* card now lists them with **Restore**, which returns the row with its
  **original item number** and stamps `updatedAt` so the undelete beats the tombstone on
  every device. Do not "clean up" tombstones — they are the undo buffer.
- **338 committed checks.**

## Item numbers collided across a merge (BUILT 2026-08-24)
The load fix worked and pulled the server's copy back — onto a device that had re-imported
the same estimate lines while the manifest looked empty. Six rows numbered **1,2,1,2,3,1**.
- **`_invAssignItemNos` only ever assigned to rows WITHOUT a number.** It could not see a
  collision between two rows that each already had one. Numbers are issued off a **local**
  high-water mark, so two sessions on one estate both issue 1, 2, 3 and the per-item merge
  unions them. **A duplicate number defeats the entire point of having one** — a receipt
  citing "item 2" has to identify a single object.
  - The **earliest-created row keeps its number**; later copies are reissued above the
    high-water mark. Ties break on `stableId` so **every device resolves a collision
    identically and they converge instead of fighting**. A second pass is a no-op; tested.
  - This does not weaken *a number, once issued, is spent forever* — the reissued row is
    the one that was never legitimately entitled to that number.
- **The duplicate ROWS are surfaced, never auto-merged.** The app cannot know which copy
  carries the edits somebody made. `_invDuplicateImports` groups vehicles by
  `sourceVehId` and collections by `sourceCollId` **plus object name** — an ITEMISED
  collection is legitimately many rows off one estimate line and must not be reported.
- **`materializeVehicle` / `materializeCollection` now refuse a second import.** The panel
  already filtered, but it filters on the manifest — which is exactly what was empty.
- **`_importedSourceSet` reads live rows only.** It walked `_photoRefs` directly, counting
  tombstones, so deleting every copy of an import locked that estimate line out forever.
- **301 committed checks.**

## The Inventory tab never loaded the manifest it was drawing (BUILT 2026-08-24)
Reported as *"all of the items i added from the estimate walkthrough are now back in the
'from the estimate walkthrough' section … it doesn't seem to be saving."* **Nothing was
failing to save.** Both copies were intact. The tab was reading neither.
- **`loadPhotoRefs` was called from exactly ONE place in the whole app** — `loadJobPlanTab`.
  So selecting a client on the Inventory tab after a page reload, without opening that
  client's Job Plan first, rendered an EMPTY manifest against a perfectly good
  localStorage — and `_importedSourceSet` reads the same empty array, so the import panel
  re-offered every collection and vehicle already brought in. `_invEnsureLoaded(jobId)`
  now hydrates once per session, inside `renderInventoryTab`.
- **`_invRefreshFromCloud` ran on TAB OPEN only** — where the picker is still on *Select
  client*, so it took its `if (!jobId) return`. The one moment a job actually became
  current, the select's `onchange`, only redrew. Now `onInventoryJobChange()`.
- **⚠ THE TWO SYNC WRITES HAVE DIFFERENT BLAST RADII AND ONLY ONE IS SAFE ON A PARTIAL VIEW.**
  `saveMedia` **merges per item** server-side, so an incomplete list loses nothing.
  `saveInventory` **rebuilds the workbook sheet** from the rows it is handed, so an
  incomplete list silently truncates the document that goes to the attorney. That happened
  for real within minutes of the load bug: a three-item manifest rendered as one, and the
  next edit rewrote the client's workbook with **one row**. The workbook write now waits on
  `_invCloudSeen[jobId]` — this device having actually read the server's copy — and says
  *"Workbook held"* rather than skipping silently. **The record is never gated; only the
  projection is.** Do not gate `saveMedia`, and do not un-gate `saveInventory`.
- `_pushInvLine` now stamps `updatedAt` at birth rather than leaning on the `ts` fallback.
- **286 committed checks.**

## A blank printout, and money that could never show a dollar sign (BUILT 2026-08-24)
Two reports minutes apart, both real, both older than anything built this week.
- **`_printDocument(html)` — ONE print path, and do not hand-roll the sequence again.**
  Reported as *"i hit appraisal worklist and a blank doc comes up to print."* Five printers
  did `pt.innerHTML = html; window.print(); pt.innerHTML = '';` **on one tick**. On any
  browser that defers the dialog by a frame, the target is already empty when the page
  renders. **`printAgreement` has always done it correctly and carried the reason in a
  comment** — deactivate the panels, show the target, `setTimeout` before `print()`, clear
  in a nested timeout — and five copies beside it ignored it. All five route through the
  shared helper now, which also **refuses to open an empty dialog** rather than printing
  nothing. The harness stubs it synchronously; the deferral is asserted on the source text.
- **`<input type="number">` cannot display a `$` or a thousands separator.** Reported as
  *"the FMV items do not carry $ or any currency formatting"* — it was never a styling
  choice, the control rejects any non-numeric character in its value. Now a text input with
  `formatMoneyInput` as you type.
  - **The trap this walks past, which already cost a commit on the prep card:**
    `formatMoneyInput` rewrites the field to `$8,000`, so any reader doing `parseFloat` on
    it gets `NaN` and stores **0**, silently, while the field goes on showing the number.
    `_invEdit` converts `fmv`/`gross`/`fees` with `moneyToNumber`.
  - **AND A CLEARED FIELD MUST STAY BLANK.** `moneyToNumber('')` returns 0, and "no value
    recorded" is a different state from zero — it is what *Items Awaiting Valuation* counts,
    what keeps an item on the appraisal worklist, and what makes the §20.2031-6(b) aggregate
    untestable. Storing 0 would silently assert the item is worth nothing. Tested.
- `_invRoomName` printed **"Room undefined"** beside every manual line item on the worklist
  handed to an appraiser. Now *Unassigned / estate-wide*, the wording the room picker uses.
- **275 committed checks.**

## The guardrail offered the escape hatch and not the fix (BUILT 2026-08-24)
Reported as *"what does this mean? and i can't assign an appraiser to the coin collection as
far as i can tell."* He was right, and the panel's own wording was sending him the wrong way.
- **`_renderAppraisalGuardrail` offered exactly one action per row: Waive.** The heading said
  *"link each to an appraiser above"* — where **above** is the roster, which is where appraisers
  are ADDED, not where they are linked. The only linking control in the app was the
  **Appraisal Doc** cell: column fifteen of twenty-nine, reachable only by scrolling a wide
  table sideways. So the panel named the problem, named the item, and the one action within
  reach was the one you should not take. **A panel that reports a blocker must carry the fix.**
- The picker is now on the row. An **empty roster says so** rather than rendering a dropdown
  with nothing in it.
- **`_invSetAppraiser` now redraws the whole tab**, because the link can be made from either
  surface and each must reflect the other. It also stamps `_invTouch` now — it did not, so a
  link could be lost to the per-item merge.
- **A SECOND copy of the vehicle naming rule** was still joining year + desc in
  `_renderInventoryImportPanel`, so the import panel printed *1960 1960 Corvette Stingray*
  beside a manifest row that read correctly. Both call `_vehicleLineName` now, and a test
  asserts neither join survives. Two copies of one rule is how these drift.
- **260 committed checks.**

## Two things found in a real client workbook (BUILT 2026-08-24)
Anthony redeployed and sent a screenshot of the synced Inventory sheet. The columns landed
correctly — which is the evidence the header-lookup fix works — and two defects were visible
in the data itself.
- **`2025 2025 Mercedes E63`.** `materializeVehicle` did `[veh.year, veh.desc].join(' ')`, and
  people fill in the year field AND type the whole thing into the description. Now
  `_vehicleLineName(veh)`, extracted so it is testable on its own. **The year is matched at the
  START of the description only** — a `1965 Mustang, restored 2019` must not lose its model year
  because the description mentions another one.
- **A quantity beside a value, with nothing saying which the value is.** `Coin Collection`,
  qty `10000`, FMV `$500,000`. Every accumulator in the app reads **fmv as the LINE TOTAL** and
  never multiplies by qty — that is consistent and correct — but the Court Inventory printed
  `(qty 10000)` next to `$500,000` and a reader can take it either way. **The two readings differ
  by four orders of magnitude on a court filing.** The row now reads `(10,000 items, valued as a
  lot)` and the column header is `FMV (total)`.
- **249 committed checks.**

## MAIV — the $3,000 that is an AGGREGATE, not a per-item test (BUILT 2026-08-24)
**⚠ REQUIRES AN APPS SCRIPT REDEPLOY** — `saveInventory.gs` changed, and the change fixes a bug
that is live right now (see the last bullet). Treas. Reg. §20.2031-6(b), the SOP's number one.

- **The app already had a $3,000 and it was the wrong one.** `invNeedsAppraisal` asks whether ONE
  object is worth enough for a specialist. The regulation asks whether the estate's articles of
  marked artistic or intrinsic value, **added up**, exceed $3,000 — in which case an expert's
  appraisal **under oath** must be filed with the Form 706. **Do not collapse these into one test.**
  - **The case that motivated it: thirty $500 pieces of silver.** Not one is near the per-item
    threshold and every one carries a recorded value, so nothing is flagged, the Appraisal
    Worklist has **no groups on it at all**, and the estate owes an expert appraisal on $15,000
    of silverware. The app said nothing. Same silent-omission shape as the $900 shotgun.
  - So `_maivWorklistBlock` renders **whether or not anything made the per-item cut**, and the
    "nothing is flagged" message now says it answers the per-item test only.
- **`invIsMAIV` is tri-state and overrides in BOTH directions.** Fires by default on the nine
  intrinsic categories (Anthony's call). `'no'` forces out a $40 mass-produced print sitting in
  Art & Décor — carrying it in overstates the estate. `'yes'` forces in a **fur coat** or a
  **rare book library**, which the regulation names by name and the app has no category for.
  **That is why `maivCat` is its own field and not a pure derivation** — don't "simplify" it away.
- **The aggregate spans the GROSS ESTATE, not the probate track.** The reg says "included in the
  gross estate" and a revocable trust's contents are in it. **Do not reuse `_invIsProbateAsset`
  here** — on Palm Beach estates, where nearly everything is in trust, that would understate the
  aggregate to near zero. There is a test.
- **`settled` is the guard against the failure this exists to prevent.** An unvalued MAIV article
  makes the total a **floor**. While anything is blank the app says "at least $X … cannot be
  tested yet" and refuses to conclude — a partial sum landing under $3,000 is not an estate under
  $3,000, and printing "under the aggregate" against it reads as a clearance. Tested both ways.
- **`maivFilingApplies` reads the 706 answer, NOT `isFormalDoc`.** A recorded dispute forces
  Strict Mode without making a federal return due. Reading `isFormalDoc` would assert a federal
  filing requirement on an estate that files nothing. On a no-706 estate the aggregate still
  prints — useful as a read on where the value sits — but as a guide, never as a requirement.
- **Context from Anthony that raises the stakes:** most of his estates are over the $15M
  exemption, and portability makes many of the rest file anyway. So **Strict Mode is the normal
  operating mode, not the exception** ($100 itemisation, not $1,000), and MAIV fires on nearly
  every job. Volume — the rate card, the grouping validator — is the binding constraint.
- **⚠ `_writeInventorySheet` in `saveInventory.gs` had HARDCODED COLUMN NUMBERS and they were
  already wrong.** The Summary sheet was converted to header lookup on 2026-08-24; this function
  was not. The moment `flagNFA` was inserted, the Net formula was being written into the **Fees**
  column and the currency formats onto Approval Date / Gross / Fees — on the workbook that goes
  to the attorney, over the field recording who authorised a firearms release. Now resolved by
  header like the Summary, and a test drives the real `.gs` function against the real app column
  list. **Never reintroduce a literal column index there.** The manifest is 30 columns wide now
  (A..AD), so the letter helper's multi-letter path is live too.
- **`savePhotoRefs` is a WHITELIST, and a new column not added to it is dropped silently on
  every save.** `flagMAIV`/`maivCat` were exactly that risk. The new test walks **every editable
  `INVENTORY_COLUMNS` key** through a real save/reload, so the next column is caught too.
- **240 committed checks.**

## Strict Mode says what it costs (BUILT 2026-08-24)
Reported as *"do these strict mode flags make sense to you? i'm confused."* Three fixes, no
change to the escalate-only rule.
- **`docStandardEffect(job)` names the two numbers the level moves** — the individual-listing
  threshold and the specialist threshold — and every branch of the readout carries it. Standard
  $1,000 / $3,000 · Strict $100 / $3,000 · Strict with a dispute $100 / $500. **A level asserted
  without its consequences is a label, not an explanation**; that is what drew the complaint.
- **Amber is scoped to the unanswered 706.** The question defaults to Unknown and unknown counts
  as yes, so EVERY new estate job opens in Strict Mode — and was drawing an amber alert on a form
  nobody had filled in yet. A filed 706, a recorded dispute and contested probate are settled,
  correct states and now read as information.
- The dispute hint said *"Drops the specialist-appraisal threshold to $500"* even with **No**
  selected, which reads as a claim about the current threshold. Now *"Ticking it drops …"*.

## Firearms authority · exempt subtotal · permanent item numbers (BUILT 2026-08-24)
First commit off the Estate Job Operational Spec / Contents Valuation SOP audit. Three things
that were wrong in the app rather than missing from it, plus the test harness this repo has
wanted for a month.

- **A firearm never moves on Havellin's say-so, and the app was printing an instruction saying
  it could.** `printAppraisalWorklist` grouped flagged firearms under a Firearms Specialist (FFL)
  and produced a handover packet **on day one**, with nothing in front of it.
  - **AUTHORITY and CUSTODY are different questions and must stay apart.** Authority is the PR's,
    on counsel's advice — that is what "route it to the attorney" means, route the *decision*.
    Custody is the FFL's, because nobody else may lawfully take possession and move it. Havellin
    never transports; the dealer collects from the property. **So FFL routing is correct and
    stays** — the SOP's "never to a Havellin vendor" reads as forbidding it, but an attorney is
    not a firearms custodian and the instruction is not executable as written.
  - `invIsFirearm` / `invFirearmAuthorized` / `invReleaseBlocked`. Authority is recorded on the
    item with fields that already existed — **Authorized By + Approval Date**, dealer in
    **Channel / Recipient**. No schema change.
  - **`_apprWithheld` deliberately does NOT filter through `invNeedsAppraisal`, and the test is
    what found that.** The first version did. `invNeedsAppraisal` answers a *valuation* question
    (intrinsic category, no value yet or ≥ $3,000), so a **$900 shotgun with a value recorded is
    not on the worklist at all** — and was therefore reported nowhere. The cheap ordinary firearm
    is the one most likely to get picked up without a second thought. Don't re-narrow this.
  - The worklist *says* what it is holding and why, rather than silently omitting it.
  - ⚠️ **Still open, for counsel: NFA items.** Suppressors, SBRs and machine guns are a different
    transfer path (ATF Form 5 to the estate) where a mistake is a felony, not paperwork. There is
    no NFA sub-flag yet and a Palm Beach gun safe can easily hold a suppressor.
- **Exempt property had no subtotal, so the §732.402 claim could not be tested from the document
  that reports it.** `printCourtInventory` ran ONE accumulator across both sections, folding
  exempt property into "Total tangible personal property" with no exempt figure anywhere.
  `section()` now returns `{html, total}`; the exempt section carries its own total and a cap
  check against `EXEMPT_CAP_732_402` (20000).
  - **The cap notice is a PROMPT TO CHECK, never an assertion the claim fails.** The allowance is
    for household furniture, furnishings and appliances; motor vehicles are separate; the app
    cannot tell which flagged items fall in that class. The wording says so — keep it that way.
  - **Also fixed: an item on the Trust track AND ticked exempt fell between the two tests.** The
    exempt section filtered on `flagExempt` alone, so it rendered inside the *probate* schedule
    it is excluded from; and the "excluded" note tested `!isProbateAsset && !flagExempt`, so it
    was left out of that count as well. Nothing on the page disclosed it. Non-probate is now out
    of the schedule entirely, exempt or not, and counted in the excluded note.
- **"Item #" was the render position, not an ID.** Recomputed on every draw and every workbook
  sync, so removing one manual line renumbered everything below it — in the app, in the client's
  workbook, and against any receipt, photo caption or email that had cited a number. Receipts
  point AT these numbers. `_invAssignItemNos` assigns once, stores `itemNo`, never reassigns;
  `savePhotoRefs` persists it; snapshots carry it so two snapshots diff by identity rather than
  by object name. **Gaps after a deletion are correct** — a missing number means an item was
  removed, which is what a reader should be able to see.
- **NFA sub-flag added the same day**, on Anthony's call. `flagNFA`, offered **only on Firearms rows**
  (`_invColEditable` returns false elsewhere — an NFA tick on a sofa describes nothing). It is
  **not a second gate**: every firearm waits for authority either way. Anthony's challenge was fair —
  *"we are not transporting any of it, so not really sure it matters"* — and he is right that it
  protects Havellin from nothing. Write down what it IS for so nobody removes it as redundant:
  **(1)** not every dealer may take an NFA item, so an unannounced one is a wasted collection trip;
  **(2)** Form 5 to the estate runs in **months**, so it is a closing-timeline item the PR and counsel
  need on day two; **(3)** **recognition** — a suppressor reads as a plain metal tube, so the real
  risk is that it is never categorised as a firearm at all and the authority gate never fires.
  Reason 3 is why the Phase 1 crew checklist now names these items **by appearance, not by law**.
- **Training material, not just a flag.** Anthony: *"we also have to have training materials around
  firearms and what NFA even means to people and what they should do."* Playbook **Step 10f** is the
  field procedure (never touch · photograph in place · tell the TC same day · nothing moves without
  written authority · what a suppressor looks like · the scripted line for a beneficiary who asks),
  with two `.stop` blocks and four new symptom→cause rows. Manual **§10a** carries the mechanics.
  A flag nobody understands is worse than no flag — it looks like coverage.
- **⚠️ `MANUAL.md` / `CONCIERGE_GUIDE.md` were hand-edited again, and the converter STILL is not in
  the repo.** One was written this session and **abandoned**: a regex HTML→MD converter did not
  converge (192 lines of drift, then 915 after a "fix"), and shipping one that silently truncates
  is worse than none — a lazy `<div ...>([\s\S]*?)</div>` stops at the first nested close, and
  `manual.html` already contains one such note. If this is attempted again: the `<h4>` in
  `manual.html` is **fine** (it carries an inline `style`), so do not "fix" it; and the real
  problem is that the committed `.md` files were themselves hand-edited inconsistently, so there
  is no faithful target to converge on. Consider regenerating BOTH from scratch and accepting a
  large one-time diff, rather than trying to match what is there.
- **48 committed checks** (`node tests/run.js` / `npm test`). See the harness section at the top.


## The manifest lives off the device + workbook rollups un-stale (BUILT 2026-08-24)
Second commit off the audit. **⚠️ REQUIRES AN APPS SCRIPT REDEPLOY** — both `main-sync.gs` and
`saveInventory.gs` changed; they are one project and one deployment.

- **The inventory manifest was in one browser and nothing ever read it back.** `savePhotoRefs`
  wrote `hav_media_<jobId>` to localStorage, `loadPhotoRefs` read only localStorage, and the one
  outbound path regenerated the client's Drive workbook from whatever that device held. Two
  people on two devices held two different manifests of the same estate and the last sync
  overwrote the other wholesale; clearing site data destroyed the record (photos survive in
  Drive, the account of what they are did not).
  - **New `MediaStore` blob in the MAIN sheet**, beside jobs and estimates — `saveMedia` /
    `loadMedia`, reusing `_readStoreBlob` / `_writeStoreBlob`.
  - **NOT in the job's Drive folder, and this is the reason:** `shareInventoryWithCounsel` grants
    read-only access to the whole Estate Inventory folder, and the manifest carries custody logs,
    appraisal-waiver reasons and upload state. A test asserts `saveMediaStore` never touches
    `DriveApp`. The workbook still goes to Drive; it is 26 display columns and no internals.
  - **The merge is PER ITEM, not per job. Do not "simplify" it to `_mergeStoreByKey`.** That
    helper keeps the newer whole entry, so two people editing *different items on the same job*
    still clobber each other. Every mutation stamps `updatedAt` (`_invTouch`) and the merge
    resolves item by item. There is a test that fails on exactly that scenario.
  - **Removal writes a `deletedAt` tombstone instead of splicing.** Absence is indistinguishable
    from "the other device hasn't seen it yet", so a union merge resurrected everything anyone
    had ever deleted. `_jobInvRefs` hides tombstones; the row stays in `_photoRefs`.
  - **The tombstone broke item numbering and a test caught it.** `_invAssignItemNos` took its
    high-water mark from `_jobInvRefs`, which now hides tombstones — so a deleted item's number
    was handed to the next one and a receipt citing "item 2" pointed at a different object. The
    max is now taken over every inventory row including tombstoned ones. **A number, once
    issued, is spent forever.**
  - `mergeMediaItems` (app) and `_mergeMediaItems` (`.gs`) are the same rule twice. A test drives
    **both off their real source** and asserts identical output on six cases — two copies of a
    merge rule that drift is how the rollups below got six categories against thirteen.
- **The client workbook's Summary dropped the seven categories estate value sits in.**
  `saveInventory.gs` held hardcoded copies of the app's lists — **6 categories against 13, 5
  dispositions against 7** — under a comment asserting they matched. Antiques, Silver & Precious
  Metal, Rugs & Carpets, Firearms, Wine & Spirits, Musical Instruments and Vehicles & Watercraft
  were all absent from *FMV by Category*, and the rows silently failed to sum to the Total FMV
  printed directly above them, on the document that goes to the attorney.
  - **The app now SENDS `categories` and `dispositions` in the payload.** They cannot drift again.
    The literals survive only as `*_FALLBACK` for a payload from a pre-2026-08-24 app build.
  - **Summary formulas resolve columns by HEADER NAME** (`_invColLetter`), not hardcoded letters.
    This was live risk the moment `flagNFA` was inserted into `INVENTORY_COLUMNS`.
  - **Both blocks are laid out sequentially.** They started at fixed rows 3 and 12, which was only
    safe while the category list was six long; at thirteen the categories ran through the
    disposition heading. A *Total (should equal B14)* row was added under the categories so a
    reader can see the breakdown reconcile.
- **89 committed checks.**

## Intake gates + Strict Mode — escalate-only (BUILT 2026-08-24)
Off the Contents Valuation SOP §1. Anthony's call: **only escalate.** App-only, no redeploy.

- **The documentation level was a pure judgment call whose own hint named the real trigger** —
  *"a large estate that may owe estate tax"*. That is a FACT somebody knows, not an opinion, so
  it is asked as a fact at intake and the level is computed from the answer.
- **TWO gates, not four.** `gate706` and `gateDispute`. The SOP lists seven; date of death and
  attorney of record already existed, matter type **stays the service type** (do not add Summary
  administration or Guardianship to the catalogue casually — the service type IS the price), and
  the separate-writing and exempt-claim questions were **built and then removed the same hour**.
  Anthony: *"we have probate and contested probate as job types, so is some of that needed?"* He
  was right. Both had **zero readers** — two more questions on an already-long intake form that
  changed nothing. **Do not re-add them until something consumes them**; the per-item `flagBequest`
  and `flagExempt` already do the real work, and the §732.402 cap check reads the latter.
- **`gateDispute` is largely redundant with Contested Probate and is kept anyway, for one case.**
  `gateDispute()` returns true for `contested_probate` without the box being ticked, so on that
  service type the field does nothing. It earns its slot on the job that turns contested
  **mid-engagement**: changing the service type would re-price a signed job, so this tightens
  documentation without touching the price. The field hint says exactly that.
- **`docLevelFloor(job)` is what the gates impose; `resolveDocLevel` applies escalate-only.**
  The manual dropdown may raise the level above the floor and can NEVER lower it — you are always
  allowed to be stricter and never looser, the same logic that makes an unknown 706 count as a yes.
  - **The control disables itself when the gates force Formal, and says why.** A dropdown that
    appears to lower it and silently does not is worse than no dropdown.
  - `docLevelFloorReason` states the cause in words, so nobody reverse-engineers it from a
    greyed-out control. The 706 reason names **Form 706**, matching the question that set it.
- **G2 is decedent-work only.** `_gate706` is ANDed with `isDecedentJob` — a downsizing cannot owe
  estate tax and must not be dragged into Strict Mode by an unanswered question.
- **`INV_APPRAISAL_THRESHOLD` is no longer a constant.** G6 drops it to **$500**, so
  `invAppraisalThreshold(job)` is the only legitimate reader and `invNeedsAppraisal(ref, job)`
  takes the job. **A call site that omits it silently evaluates a disputed estate at $3,000** and
  under-flags precisely the estate where under-flagging is least affordable — there is a test
  asserting no single-argument call survives.
- **`invListingThreshold(job)` — $100 in Strict Mode, $1,000 otherwise.** Nothing consumes it yet;
  the tiering build does. It lives here so there is one definition when it does. The reasoning:
  Treas. Reg. 20.2031-6(a) caps a room-grouped lot at $100 an article, but it governs what is
  filed WITH a 706 — on an estate filing none, §733.604 asks for "reasonable detail" instead.
- **The service field is `i-svc`, not `i-service`.** The first draft guessed and would have left
  `draft.svc` empty, so `isDecedentJob` returned false and G2 never fired — a silently disabled
  gate. A test now asserts the readout reads the real field.
- **Two layout fixes on the same block, reported off a screenshot.** `.fb` is doing two
  unrelated jobs — it is the Win/Loss filter **button** class (13 of them, all with text) and it
  is also borrowed by `#i-deadline-fb` as a feedback line. The button styling carries a border and
  padding, so with no feedback to show it drew an **empty bordered box** under the §733.604
  deadline field. `.fb:empty{display:none}` — safe because every filter button has text.
- **And the two gate controls did not line up.** `.row>*>select` carries `margin-top:auto`, which
  pushes the control to the BOTTOM of its cell — so with a hint div *after* the select, the
  select's position depends on how many lines that hint runs to. A two-line label beside a
  one-line label, with hints of different lengths, put the two selects at different heights. New
  `.gate-cell` reserves two lines for the label and drops the auto margin. **Reach for this on any
  future two-column row that carries hints under its controls.**
- **155 committed checks.**

## A permanent sync error retried forever and never said why (BUILT 2026-08-24)
Reported minutes after the Apps Script redeploy: *"green check in the lower right, but a red flag
on the left saying 1 unsaved change - retrying. it never resolves."*

- **Two writes fire on an inventory change** — `saveInventory` (the client's Drive workbook) and
  `saveMedia` (the durable manifest). The workbook one landed, which is the green check. The
  manifest one hit a backend that did not know the action.
- **A stale backend answers with a perfectly well-formed failure**, not a network error:
  `{ok:false, error:'Unknown type: saveMedia'}`, or a `ReferenceError` when the dispatch line is
  present but the handler it names is not — a half-applied paste. `_flushOutbox` treats any
  `ok:false` as retryable, so it went into the backoff queue **forever**.
- **And the reason was unreadable.** `_enqueueWrite` put the server's error into a `showSyncBadge`
  toast that is gone in four seconds; the persistent chip said only *"1 unsaved change — retrying…"*.
  The single piece of information identifying the problem was the one piece nobody could see, which
  is why this arrived as a question rather than a fix.
- `_isBackendStaleError` classifies `unknown type|unknown action|is not defined|not a function`.
  Such a write is **held, not hammered**: it stays queued so a later redeploy picks it up, but no
  retry is scheduled, and the chip reads **"Apps Script needs redeploying"** with the server's own
  error in the tooltip. Tapping the chip clears the blocked flag — that is the user saying they
  have fixed the deployment.
- **Keep the transient cases out of that pattern.** A network drop, and Apps Script's login/HTML
  interstitial (which genuinely does work on the next attempt), must stay retryable. There are
  tests on both directions.
- **124 committed checks.**

## The iPad bug: an empty estimateStore meant two things (BUILT 2026-08-24)
Reported from a real device: *"on my ipad the job plan is not loading at all for clients, but I
can see them on my desktop."* Plus three smaller things found in the same pass. App-only — no
Apps Script redeploy.

- **`loadEstimateState` hydrates from localStorage SYNCHRONOUSLY and then fetches.** On a machine
  that has used the app before, the local cache is warm and every gate reads a populated store
  immediately. On one with a **cold cache** — a new iPad, cleared data, or Safari's routine
  eviction of storage for a site not visited in a week — `estimateStore` is `{}` at the moment
  the Job Plan renders. The gate then said *"Job Plan generates once the estimate is approved
  and locked."* **The estimate is not unapproved. It is unread.** Those are different states.
  - **And it never corrected itself.** The fetch landed and called `rebuildDropdowns()` alone,
    so the tab stayed wrong until you navigated away and back. **Exactly the same shape as the
    `loadPhotoRefs` bug of 2026-08-03** — render before the data, never re-render after.
  - New `_estStoreState` (`loading` / `ready` / `offline`) and `_estStoreLanded()`, which
    re-renders the Job Plan or Inventory tab if either is open. **The failure path resolves the
    flag too** — a silent `catch` leaves the UI stuck on "loading" forever, which is how the
    original bug felt.
  - The gate is now four honest states: loading · unreachable · no estimate · not approved.
  - **Do not collapse these back into one test.** A falsy `estimateStore[jobId]` says nothing
    about approval and never did.
- **Vehicles and collections from the estimate are NOT items, and nothing said so.** A job with
  three vehicles on the estimate showed nothing on the Job Plan and nothing on the Inventory tab.
  That is by design — `materializeVehicle` imports with a blank disposition precisely so the JOB
  decides, not the estimate — but the only thing offering the import was a panel on the Inventory
  tab, which renders nothing when there is nothing to import **and nothing when the store is
  cold**. The Job Plan now carries a banner naming what is pending and where to add it.
- **Appraisers now populate from the Vendor Directory.** The roster was pure free text, so you
  retyped a firm that already existed two tabs over — and that copy could not be rated, could not
  be kept current, and never reached the Quo dialer. `_appraiserVendors()` filters the directory
  to the six appraiser categories, **excludes `Do Not Use`** (we walked away for a reason), and
  matches on a vendor's SECOND listed category too. The picker prefills name / firm / credential
  from `license_cert`; the free-text fields survive for a genuine one-off.
- **Two cosmetics.** The Inventory subtitle still said *"valuation & disposition detail comes in
  the next build"* — that shipped in Build 2, and the columns were right underneath it. And the
  summary's `hdrRow` had no shrink floor, so a long label (*§733.604 Inventory Deadline*) starved
  the value beside it and *"— (date of death)"* wrapped to three lines.
- **Field mode note, worth knowing:** the four `data-field` tabs are Intake, Build Estimate, Job
  Plan and Vendors. **Inventory is NOT among them**, so it is hidden in field mode. That was not
  the cause of this report, but it will look like a missing tab to somebody on an iPad.
- **104 committed checks.**

## LIVING client vs DECEASED client — the SERVICE TYPE decides, always (2026-08-03)
**Anthony: "there should be a rule about the language for projects when the client is alive
versus when the client is deceased… applied to estimates and engagement agreements
accordingly."** Then, correcting the first build: **"Home cleanout is by definition for a live
client, whereas an estate settlement is for a deceased client."** It is one predicate,
`isDecedentJob(job, svcKey)`, and it is a **pure service-type lookup**.

| LIVING | DECEASED |
|---|---|
| Home Editing (`downsizing`) · Home Transition (`downsizing_move`) · **Home Cleanout** · Home Prep for Sale | **Estate Settlement** (`cleanout`) · Probate (`probate`) · Contested Probate (`contested_probate`) |

| | LIVING owner | DECEASED owner |
|---|---|---|
| Who we address | the owner | the **representative** — executor, PR, trustee, attorney |
| The property | *"your home"* | *"the property"* — never theirs |
| What sets the pace | their decisions, room by room | our cataloguing; they need not attend |
| What governs disposition | preference | the **will**, via the representative |
| Before anything moves | a confirmed keep list | **written authority**, after they read the inventory |
| Heirs on site | they are the client | courtesy, and **no instruction taken from them** |

- **The catalogue was already split down this line and nothing needed adding.** The key names
  mislead: `cleanout` is **Estate Settlement** (deceased) and `home_cleanout` is **Home Cleanout**
  (living). Reading `home_cleanout` as "might be a just-died house" is the mistake — that job is
  an Estate Settlement, a different engagement at a different price.
- **`DECEDENT_SERVICES` and `JOB_STEPS[svc].document` select exactly the same three services**, and
  that is not a coincidence: documentation is what a decedent engagement sells. They stay separate
  tests because they answer different questions — `document` is what the client is **charged** for,
  `isDecedentJob` is **who we write to** — and the first catalogue change could split them.
  A test asserts the partition both ways.
- **DO NOT ADD FALLBACKS ON `job.deathDate` OR `job.executor`. They were both there for one commit
  and both came out; do not re-propose them.**
  - Neither is **reachable**: `toggleIntakeFields` shows the date-of-death field and the rep block
    only on the three services that already answer *deceased*.
  - The executor one is **wrong as a death signal**. The role list offers **Power of Attorney** and
    **Family Member**, and a POA acts for a **living** person — it terminates on death. A POA
    managing a living parent's downsizing is ordinary work here. That fallback would have silently
    reclassified those jobs the moment the rep block was offered on a living-client service.
  - **The lesson, and it cost a whole commit:** the first build added a `home_cleanout` tick box
    ("This is the property of someone who has died") to make the unreachable fallbacks reachable.
    It was scaffolding under a premise that was simply false, and it invited the worse error —
    ticking a box instead of picking Estate Settlement, which mis-prices the job while making the
    documents read as estate work. **When a rule needs a manual override to work, check the rule
    before building the override.**
- **KEEP VOICE SEPARATE FROM PRICING.** `JOB_STEPS[svc].document` answers *does a documentation
  stage exist* — what the client is being charged for. `isDecedentJob` answers *who are we writing
  to*. The stage-2 title is `hasDoc ? 'Sorting, Documentation & Inventory' : 'Sorting & Decisions'`
  — **two arms, not three**. A middle `isDeceased && !hasDoc` arm was there for a decedent job
  pricing no documentation step, and no such job exists.
- **THE AGREEMENT ROUTING CHANGED, and it is a real behaviour change.** It named four service types,
  one of which was the plain `home_cleanout` — so a **Home Cleanout got the estate-form agreement**
  despite being living-owner work, while `cleanout` (Estate Settlement) was routed correctly. It now
  reads the predicate, so the estimate and the agreement cannot disagree about who the client is.
  ⚠️ **Any cleanout agreement issued before 2026-08-03 is worth re-reading.**
- `showEditClient` keeps its own service-type expression rather than calling the predicate, because
  it also accepts a legacy `'estate'` key.
- 37 checks on the predicate, the catalogue partition and both consumers, plus 45 driving the real
  `toggleIntakeFields` against the real intake markup in jsdom (`intake-decedent-dom.js`).
  **382 across eight suites.**

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
- **⚠ THAT TERMS LINE IS GONE AS OF 2026-09-10, ON ANTHONY'S CALL — the FOOTERS ARE NOT.**
  It restated the estimate's own footer seven lines below it, and Terms is where a
  **commercial** rule belongs (what is charged, what is at cost, how long the quote stands),
  not a standing fact about the firm. A test asserts the claim now appears **exactly once**
  in `renderClientEstimate`. **Do not read this as the claim being retired** — the footer on
  all four client documents still carries *Insured & Bonded*, deliberately and untouched.
  ⚠ Anthony's words when he asked for the cut were *"i don't think it is either"*, i.e. he is
  not certain Havellin currently holds either. **That is a live question about the FOOTERS and
  it is his and counsel's, not a judgement call** — it was raised back to him rather than acted
  on, because stripping a standing claim from four client documents is not what "cut this
  duplicate bullet" asked for.
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
- ~~⚠️ **`manual.html` + `concierge-guide.html` need a pass** — the capture gate moved from
  *active* to *won*, three refusals that were silent now speak, and the playbook's symptom→cause
  table has no row for "took photos and nothing happened." Not done here.~~
  **Done in the eighth pass, same day** — manual §10 carries the gate correction and the three
  refusals, the playbook's Step 10a has the `.stop`, and the symptom row exists ("took photos and
  nothing happened"). Verified again 2026-08-11.

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
- Last reconciled against the app: **2026-09-10 (twenty-second pass)** — both documents, against the
  fullness preset becoming a standing setting, the vendor card moving below the collections, the
  photograph correction and the good-faith vendor flag. Manual **§5 layout map · §5b** (the standing
  rule and the hand-scored rule, both marked ⚠ because an estimate priced the old way is under-scored)
  **· §5d · §7** (the good-faith line above both vendor tables, and the photograph correction);
  playbook **Step 2 · Step 3** and **five** symptom→cause rows, including the one for somebody who
  priced a job on the old build. Both `.md` copies hand-edited and 21 claims parity-checked; tag
  balance verified on both HTML files.
- Prior pass **2026-09-10 (twenty-first pass)** — both documents, against the
  intake "what's in the house" questions. Manual **§4** gained a new subsection (the seven-row table,
  where the answers surface, the firearms-is-the-only-red rule, the ticked-with-no-note wording, and
  that Notes survives demoted) and **§11** a note on the standing-flags panel; playbook **Step 1**
  gained the two questions in Anthony's own words, the tick→write table and a `.stop`, **Step 10** a
  `.stop` on reading the flags to the crew before anyone starts, and **four** symptom→cause rows.
  Both `.md` copies hand-edited and 22 claims parity-checked; tag balance verified on both HTML files.
- Prior pass **2026-09-10 (twentieth pass)** — both documents, against the
  editable service type and the bundled-prep fee flip. This pass **corrects eight standing claims**
  rather than only adding: every "30% GC fee applies only to a standalone Home Prep engagement"
  statement in either document is now false, and they sat in §5d, §5e, §8 (twice), §11, §13a and
  §16 of the manual plus Step 2, Step 10 and the quick reference of the playbook. Manual §4 gained
  the within-family rule and §5's layout map now calls the service type a dropdown; playbook Step 1's
  `.stop` says what can and cannot be fixed later, Step 2 gained a `.stop` for the walkthrough
  re-type, and **seven** symptom→cause rows landed. Both `.md` copies hand-edited and
  parity-checked claim by claim; tag balance verified on both HTML files.
- Prior pass **2026-09-09 (nineteenth pass)** — manual **§13a** against the
  multi-category vendor audit (the section described a single category per vendor, wrong since
  2026-07-31); playbook Step 2, the appraiser-roster `.stop` and five symptom→cause rows. Both
  `.md` copies hand-edited and parity-checked.
- Prior pass **2026-09-08 (eighteenth pass, same day)** — manual **§2/§6b/§7/§8**
  against the estimate delivery path; playbook **Step 3/4/6** and eight symptom→cause rows. Both
  `.md` copies hand-edited and parity-checked. *Note: `manual.html` has an unbalanced `<code>`
  count, and it is a FALSE POSITIVE — the extra one is prose inside a CSS comment in the phone
  block. Do not "fix" it.*
- Prior pass **2026-09-08 (seventeenth pass, same day)** — manual **§2** gained
  the job-ledger note; playbook two symptom→cause rows. Both `.md` copies hand-edited.
- Prior pass **2026-09-08 (sixteenth pass, same day)** — manual **§8** gained the
  signing-packet note; playbook a Step 6 row and one symptom→cause row. Both `.md` copies hand-edited.
- Prior pass **2026-09-08 (fifteenth pass, same day)** — manual **§8** gained the
  vendor-fee-clause note; playbook one symptom→cause row. Both `.md` copies hand-edited.
- Prior pass **2026-09-08 (fourteenth pass)** — both documents, against the
  service rename. Manual **§4** gained the rename note; playbook **one symptom→cause row**; every
  service-list and prose mention of *Downsizing* in both documents now reads *Home Editing* /
  *Home Transition*. Both `.md` files hand-edited to match; tag balance verified on both HTML files.
- Prior pass **2026-09-04 (thirteenth pass)** — both documents, against the
  documentation-scope control. Manual **§4** gained the intake question and the seed-not-price
  rule, **§5c** the control with the three settings and the
  numbers, **§7** a note that the stages promise what the estimate priced, **§8** a note on the
  three agreement clauses that follow it and the instruction to regenerate an agreement approved
  before the scope was set. Playbook **Step 2** gained the table row (with the intake question to
  ask the attorney), **Step 1** the intake question, **Step 3** and **Step 6** a `.stop` each, and
  **four new symptom→cause rows**.
  Both `.md` files hand-edited to match; tag balance verified on both HTML files.
- Prior pass **2026-09-01 (twelfth pass)** — both documents, against the
  Inventory tab rebuild. Manual **§10a** gained *What this tab is for* (the field/desk split, the
  grouping, the worklist strip, the bulk bar, and the note that the column buttons are gone and
  why), *Release approval*, *Photographs on the manifest* (with the do-not-use-drive.google.com
  reasoning and the redeploy warning), the `Due back` field, the `Valuation Basis / Comps` field
  with the not-stated rule, and three new exports. **§10** now says captured items land in
  *Not yet decided*. Playbook **Step 10e** rewritten as a numbered how-to-work-it, with a red
  `.stop` on the approval request (verbal approval is never accepted, Keep/Hold are left off,
  never type approvals row by row) and **seven new symptom→cause rows**. Both `.md` files
  hand-edited to match and parity-checked claim by claim; tag balance verified on both HTML files.
- Prior pass **2026-08-03 (eleventh pass, same day)** — both documents, against
  the estate-playbook stage rewrite and the living/deceased rule. **This pass is also where the rule
  got corrected**, which is the argument for doing them properly: writing up "a date of death or a
  representative also settles it" sent me to check where those fields are entered, they were hidden
  on exactly the service the sentence was about, and Anthony's answer to the gap was that the gap is
  not real — a Home Cleanout is a living client and a deceased owner's house is an Estate Settlement.
  Both documents now state the split as the service catalogue, not as a question anyone answers.
  - Manual **§4** states the service type IS the decision and that picking the wrong one mis-prices
    the job as well as mis-addressing the document. **§7** gained four notes: **the rule** (the two
    halves of the catalogue named in full, and the do-not-add-fallbacks instruction with the POA
    reasoning), **the stages branching on job family** (estate stage 2 catalogues and removes
    nothing, stage 3 gates on written authority, downsizing keeps decision-paced language, Home
    Cleanout keeps a simpler living-owner version), **never ask for the will** (ask for the Letters
    and the designated-items list — checked against §11 Phase 0/1 rather than invented), and **who
    stage 1 says we work for**. **§8** states which of the two agreement forms a job gets and that
    the routing changed.
  - Playbook **Step 1** leads with Home-Cleanout-vs-Estate-Settlement and a red `.stop` naming both
    consequences of getting it wrong; **Step 3** three `.stop` blocks (which version and why, how the
    estate document differs plus the two on-job commitments it makes, never ask for the will);
    **Step 6** a `.stop` on the two agreement forms. **Eight new symptom→cause rows**, including one
    for the reader hunting a "client is deceased" tick box that deliberately does not exist.
  - **Two things corrected mid-pass:** the will note went into `manual.html` as `class="stop"`, a
    class the manual does not define — it would have rendered as an unstyled div (the manual's
    vocabulary is `.note`; `.stop` is the playbook's). And every doc block describing the tick box
    was rewritten when the tick box came out. Both HTML files tag-balance checked after.
- Prior pass **2026-08-03 (tenth pass, same day)** — both documents, against
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
- ~~Remaining: Wave 3 (payment record → DocuSign → Stripe → QB), Wave 4 (hours gated on
  `funded`).~~ 222 jsdom checks green.
  **Wave 4 IS BUILT — do not rebuild it.** `buildLogTeamRows` disables the whole hours form on
  `fundedOK` and `saveLogEntry` refuses outright, naming the outstanding balance
  (`13114` / `13281`). It is the one gate in the app with no override, which is only safe because
  the deposit is never waived. Staffing deliberately stays allowed from `won`, before the money —
  the team gate and the money gate are separate on purpose.
  **Wave 3 is the part still open, and only in pieces:** the payment record is built (three stages,
  evidence capture, cheque handling). **DocuSign does not exist** — zero references in the file;
  sent and signed are marked by hand. **Stripe is one-way** — `generateStripeLink` now reports
  failure honestly instead of claiming success on an opaque response, but nothing reads BACK: no
  webhook, no `clearedOn` write, no auto-populated payment, and `copyStripeLink` is still a message
  stub. **QuickBooks is deliberately not built**, pending Laura's September chart of accounts.
  *This line said "Wave 4 remaining" for over a week after it shipped and read as outstanding work —
  the same way the unearned-revenue flag above it did. Clear these when the work lands.*

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
- **HELD, ON PURPOSE — delete `saveEstimateToSheet` / `saveHoursToSheet` from `main-sync.gs`
  with the NEXT real backend change.** Both are dead: the app posts `saveAllEstimates` and
  `saveAllLogs`, and posts neither `type:'estimate'` nor `type:'hours'` anywhere (verified
  2026-09-10 — zero such posts in `havellin.html`). They are held rather than removed only
  because taking them out costs a paste-and-redeploy, and that is not worth spending on
  housekeeping alone. **Bundle, don't deploy twice.**
  - **⚠ THEY ARE WHAT CREATES THE FOSSIL `Estimates` AND `Hours` TABS, AND THAT IS THE WHOLE
    REASON TO REMOVE THEM.** A reader looking at the sheet sees an empty `Estimates` tab and
    an absent `Hours` tab and reads it as lost hours. Anthony asked exactly that on
    2026-09-10 — *"are we not keeping hours any more for jobs?"* — which is the correct
    reading of what is on screen and the wrong conclusion. **The real hours are `LogStore`;
    the real estimates are `EstimateStore`**, both one JSON string in column B, so the sheet
    gives a reader no way to tell. Removing the writers is what stops the question recurring.
  - **It is four edits, not two, and a partial removal fails the suite — which is correct.**
    The two `function` bodies, their two `doPost` dispatch lines, and `'estimate'` / `'hours'`
    out of `BACKEND_TYPES`. A test asserts `BACKEND_TYPES` matches the dispatch in BOTH
    directions, so dropping the functions and leaving the list over-claiming is caught.
    **And bump `BACKEND_VERSION` in the same commit**, or the banner cannot tell the new
    deployment from the old one.
  - Nothing client-side reads either path, so no manual or playbook pass is needed.
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
