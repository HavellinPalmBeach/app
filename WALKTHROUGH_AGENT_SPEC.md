# THE WALKTHROUGH AGENT: CHECK THE ESTIMATE, WRITE THE CREW PLAN

**Status: designed with Anthony on 2026-11-05 and built the same day on his go.** The rules as built are in `CLAUDE.md`
(Screens, *The walkthrough agent*, and Integrations) and the story in `BUILD_HISTORY.md`. It needs the Apps Script deployment
of `2026-11-05` (the action `agentWalkthroughReview`); §7's recommendations were built as written.

Anthony, after the first live walkthrough (a Home Editing client: heavy clutter, closets full, shelving to build, a jungle
gym in the back yard): *"To what extent could we get an agent involved in reviewing the estimate and helping us with a job
plan? … review the photos and come up either with an action plan or a more accurate estimate based on what we learned
during the walkthrough."* And the standing condition, said twice: *"I just want to make sure that whatever we do here does
not make this more complicated. That the agent saves time and requires the transition concierge to do less, to think about
less … I don't want it to create work or more tick boxes."*

---

## 1 · WHAT IT IS

One agent, one press, two answers:

| | |
|---|---|
| **Estimate check** | Where the walkthrough photos materially disagree with a room's scores or the vendor lines, a suggestion on that room's row. Scores and vendor lines only, never hours |
| **Crew plan** | About a page: the context the crew needs, the order of the work, its conditions and what to do instead when a condition is not met. Internal, editable, read and never ticked |

Its whole purpose is to take thinking off the concierge: the sequence and the context are worked out once, from what the
walkthrough recorded, and are there to read the night before and each morning.

---

## 2 · DECIDED (Anthony, 2026-11-05)

Each line is an answer he gave; where he took the recommendation the answer is the recommendation's words.

1. **Estimate check plus a room plan**, in one agent (*"I'm inclined to say estimate check, plus a room plan. I really like
   the room plan thing"*).
2. **Few things to accept.** A suggestion only where the photos materially disagree, and only on the rooms that matter;
   the photos decide which (*"I don't want a lot of tick boxes … only have things to accept for the more important
   rooms"*).
3. **Internal only.** Never on a client document, never sent.
4. **One press**, *Review walkthrough*, on Build Estimate.
5. **Scores and vendor lines only.** The check suggests a room's volume or complexity and a vendor line (the jungle gym's
   playset removal); it never suggests hours, which stay the engine's. Days appear only in the plan.
6. **It reads all the context**: every walkthrough photo, every room note, the private walkthrough note, the intake's
   notes and house questions, and the crew size on the estimate (*"it should have all the context"*).
7. **The plan states the context for the crew** (*"the woman gets tired in the afternoon … only do the sorting in the
   morning until 12 … this autistic son, if he's home, we're going to have to work around him … The job crew needs that.
   We need as much context and detail as possible, honestly."*). Written as facts and instructions, never as labels (§5).
8. **Suggestions sit on the room's row**: an amber line under the row it would change, with a **Use** button; ignoring it
   is fine.
9. **Every service.** On an estate the context is the family and access; on Home Prep the plan orders the trades and the
   declutter.
10. **No tick boxes, anywhere, and the plan never turns anything red.**
11. **Not a day-by-day schedule** (*"I'm just worried that we get locked into this plan and it's a day by day schedule of
    things to do, and the schedule just doesn't go smoothly. Something comes up. It's a rainy day"*). The plan is an order
    of work with conditions and what to do instead. The length is said once, as a rough figure for the crew the estimate
    carries (*"about 3 days with 3 of us, 4 to 5 with 2"*).
12. **The generic sorting block goes.** The Job Plan's *How the sorting runs* (generic advice, `PLAN_PROCEDURE`'s p1 block)
    is replaced on a job with a crew plan by the job's own **Next up** card; *Read Sorting a House* stays a tap away. The
    stage gets shorter, not longer.
13. **Each room's instructions sit inside the room** (the room workspace, where the room is shot), never on the room grid's
    cards. The grid stays as it is.
14. **The full plan opens behind a press**, like the Walkthrough page, never drawn open on the iPad in the house (the
    private note's own rule).
15. **Re-plan is an optional press** (*"if the situation changes, maybe running the agent again isn't a bad idea"*): type
    the new fact into the plan, press **Re-plan**, and the agent rewrites the order and conditions around it. Before the
    estimate is approved it may also suggest scores; after, the plan only (the price is locked). Never required; nothing
    asks for it.
16. **A re-run over a plan a person edited asks first**, then replaces (*Ask, then replace*). Cancel keeps the plan and, on
    Build Estimate, refreshes only the estimate check.
17. **Next up moves on the room statuses** a person already presses (locked, cleared): the card shows the next step in the
    order and the job-wide reminders always. Nothing new to press.
18. **A step that is not a room rides with the room it follows** (*after the garage: the donation run*), shows with it on
    the card and passes when that room is cleared; a vendor step also reads the vendor's Confirmed status on the Job Plan.
19. **One page at most.** Context first in a few lines, then the order, the conditions and what to do instead, a few lines
    per key room. Readable in five minutes before Day 1.

---

## 3 · HOW IT IS USED (the real day)

- **On site:** score the rooms, take the photos, save the estimate.
- **That evening, at home or the office:** press *Review walkthrough* at the top of Build Estimate. About a minute. Read
  the amber lines, press **Use** on the ones that are right, ignore the rest, read the plan, change what is wrong. Save the
  estimate as now.
- **Before Day 1:** open the full plan once and read it (five minutes). After that the concierge knows the job.
- **Each morning:** glance at **Next up** on In the house (three lines) and tell the crew in the driveway. Nobody reads the
  app standing in the house.
- **In the house:** tap a room to shoot it, as today; its instructions are there beside its walkthrough note and photos.
- **When something changes** (a specialist can't come, the son is home for two days, a call adds a fact): type it into the
  plan; press **Re-plan** if the order should change around it. Or don't: the plan is yours to edit.

---

## 4 · WHAT IT READS

All of it is already recorded; the agent asks for nothing new.

| Source | Where it lives |
|---|---|
| Walkthrough photos | Each room record's `photos` (`walkPhotosOf`, Drive *Walkthrough Photos*), read through the server like every agent photo |
| Room scores and notes | The estimate's rooms (volume, complexity, the dictated note) |
| The private walkthrough note | `privateNote` on the estimate (`_privateWalkNote`) |
| Intake | `job.notes`, the house questions (`HOUSE_FLAGS` rows and notes), must-finds, the destination, the service |
| The crew and the length | The estimate's concierge and specialist counts and `estWorkingDays`, for the one rough length |
| Vendor lines | The estimate's vendors, so it suggests a line only where none covers the thing |

---

## 5 · WHAT IT WRITES, AND HOW IT SAYS IT

**The estimate check** writes suggestions, never scores: at most one score and one vendor line per room (2026-11-05, decision 23),
`{room, field: 'vol' | 'cplx', to, why}` and `{room, field: 'vendor', vendor, why}`, each with its own reason, drawn as the amber line; **Use** writes the score or adds the vendor line through the same
controls a person uses, so calcAll prices it. A suggestion no longer true (the score already moved) is not drawn.

**The crew plan** is plain text in sections: *Context*, *Order of work* (each step naming its room, or the room it rides
with), *Conditions*, *If you can't*, *Length*, and a few lines per key room. It is written:

- as **facts and instructions, never labels**: *"Her son is sometimes home. The walkthrough had to stop at 15 minutes
  when he was. Confirm each morning that he's out before the crew goes in."*, never a diagnosis;
- practically and respectfully, because a crew member reads it;
- with no figure the client is billed, no hours, and nothing from a client document.

---

## 6 · ON THE JOB PLAN

- **Next up** card at the head of *In the house*, in place of *How the sorting runs*: the next one or two steps of the
  order (and anything riding with them), then the job-wide conditions, then **Open the full plan**. Where a job has no plan
  the generic block stays.
- **The room workspace** draws that room's lines under its brief, behind the same kind of press as its walkthrough
  photos.
- **The full plan** opens over the app (the Walkthrough page's viewer): every section, editable, with **Re-plan**.
- No tick box, chip, count or red line is added anywhere.

---

## 7 · FOR THE BUILD (recommendations, not decisions)

- **Where the plan lives:** on the job's plan record (`jobPlanStore`, which merges key by key on `plan.at`), never the
  estimate snapshot, which the approval locks and which merges whole. The suggestions live with the estimate draft and go
  when it is approved.
- **Who edited it:** a plan a person changed is marked (`by`, `at` per section) so a re-run knows to ask (§2, 16).
- **The backend:** one action, `agentWalkthroughReview`, under `_agModels` (a fourth task, `'walkthrough'`) with the same
  fallback, refusal fallback and demotion rules; a strict tool for the answer (`record_walkthrough_review`), a prose
  answer a failure. Photos are many (a house is 30 to 60): send them per room, at the walkthrough's 1,200 px, and time a
  full run against UrlFetchApp's limit with an editor probe (`testWalkthroughReview()`) before a client sees it.
- **Firearms:** a firearm in a walkthrough photo is named in the plan's conditions under the protocol's words (photograph
  in place, nobody carries it out) and never anything more.
- **Tests:** the suggestions' one-per-room rule, Use going through calcAll, the plan's sections, the Next up card's reading
  of the room statuses and the vendor's Confirmed status, the re-run's question over a person's edit, the private context
  never on a client document, and a browser step through the real presses.

---

## 8 · DECIDED LAST (Anthony, 2026-11-05)

20. **The context is written as instructions** (§5), never a label or a diagnosis: *"instructions are fine."*
21. **The plan is the concierges'.** Only the Transition Concierges carry an iPad, so nothing is built for a crew member's
    phone (*"TC's are the only people who will ever have an iPad, so nothing to do here"*).
22. **No photos, still a plan.** On a walkthrough with no photos the agent writes the plan from the notes alone and makes no
    estimate suggestions it cannot see; photos are the rule on every walkthrough (*"we are going to try and take photos on
    all walkthroughs so we get more accurate estimates"*).

23. **A score and a vendor line in one room** (after the first live probe, 2026-11-05, where the back yard's volume pushed its
    playset's hauler off the list: *Score + vendor*). Decision 2 stands: still only where the photos plainly disagree. And a
    playset, a hot tub or anything needing tools and a truck is a vendor's work in the plan too, never the crew's (Pricing's yard
    rule; the probe's plan had told the crew to bring a drill).

24. **The press is at the top of Build Estimate, beside Start over** (*"it's really kind of lost down here … it should be at the top,
    next to the start over button"*). The day as he sees it: walk the house, score it and take the photos, save on site; at home
    or the office that night, review the estimate and press **Review walkthrough**.

25. **The plan says only what the record says** (after the first live plan, which made up that the client sorts every room herself
    and rules about a son: *"where are we just making up these rules, or did you get that from somewhere?"*). Every context line and
    condition names its source (the notes, the house questions, a room's note, the photos, what changed, a plan a person edited, or
    for a condition the work itself), the server drops one the job does not have, and the plan shows none (*Check it, don't show
    it*). Nothing about the people unless the notes say it.
26. **The plan keeps to the service** (*"if we're just editing down the house … don't invent stuff and assume that we're moving
    everyone out … if it's a home edit and transition, obviously there's a move"*): Home Editing has no move and packs nothing out;
    a pod, a pack-out or a move out only where the notes or what changed say so (*"we're going to empty the whole house out and put
    it in a pod in the driveway"*), and then it is planned fully. No room is assumed emptied; where the notes are silent, its scope is
    confirmed with the client.
27. **What the concierge writes beats the agent's rules** (*"I was actually thinking of taking apart the swing set myself"*): a
    playset is the hauler's unless the notes or what changed say Havellin takes it down.

28. **The newest, first-hand note wins** (the second live plan followed an intake note's whole-house pack-out: *"that was in intake
    notes, and it's changed"*): what changed, then a plan a person edited, then the walkthrough and room notes, then the intake.
29. **No diagnosis repeated** (*"instructions are fine"*): the plan printed a house question's diagnosis word for word; it now says
    only what the crew does.
30. **Each thing once, and no presence rule** (2026-11-06, the third live plan: the kitchen said three times, and *"she is in the
    room for every sort"*, with two fallbacks built on it; Anthony: *"Not always"*): a condition never repeats the context, and
    nobody is said to be needed unless the notes say so. A step is kept to 400 characters (it was cut off at 200).

Nothing is left open in the design. It is built on Anthony's go.
