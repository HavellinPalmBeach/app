# The desk: upgrade plan for Job Admin & Inv

Sources:
- The overnight audit of 26 to 27 October 2026: twelve lenses, 288 findings, each checked by an independent verifier, none refuted.
- Three gap audits run afterwards, each reproduced twice, 27 findings: the Ellison china against its own record (GAP1), the pour-over estate (GAP2), and the Snapshot wipe driven end to end (GAP3).
- Two red-team reviews: a Palm Beach trust and estates attorney, and a senior appraiser with a bank trust officer. Their points are professional judgement and are marked as such. Where one rests on a code fact, the fact was checked.
- The two research reports (R1 standards, R2 market and technology). Marks: [P] primary source seen, [S] secondary only, [U] unconfirmed.
- The recheck of 27 October: every fix-now finding run again on main at 7abc836, after two builds landed while the audit ran (only flagged lines keep a tick, Q99 to Q109; the estate's release request through DocuSign, backend 2026-10-26c).

Everything was checked against the frozen app at 3f25460, and every fix-now finding was rechecked against main at 7abc836 (section 1).

## 1. Verdict

**Rechecked on main at 7abc836 (27 October).** Two builds landed while the audit ran: only flagged lines keep a tick and the list is read once a night (your answers Q99 to Q109), and the estate's release request through DocuSign (backend 2026-10-26c). All 104 fix-now findings were run again on the new main:
- 2 are fixed: a tick no longer settles an open double (NEW-05, ROW-09).
- 3 changed: REVIEWED no longer prints over unnamed lines, but the blank lines still print and the Report's total is still not called a floor (NEW-01, AGT-01, ROW-01).
- 99 still stand, and three reach further: the open backend URL can send a DocuSign envelope once 2026-10-26c is deployed (RT-01), a press straight after a name edit is now lost too (SYN-12), and a double hidden by Not duplicates now stands with no tick at all (AGT-03).

Every pack below now follows your Q99 to Q109 answers. P26's DocuSign half is built; what it owes is the redeploy and one sandbox envelope.

The desk is ahead of anyone in Palm Beach on the record. One press of **Name N shots** names, room-checks and values a 300-photo house. **Send request** puts a letter in front of every fiduciary (on an estate, through DocuSign since 26 October), the iPad sign-out files its own PDF, and the schedules mostly call a floor a floor.

It is behind on the valuable few. In both reviewers' judgement this is where an estate's value and its disputes sit, and today nobody who values those items handles them.

For the Transition Concierge the automation is there, but the evening is slow and fragile:
- every tick redraws the whole desk;
- a row jumps screens away when you choose where it goes;
- the night's read is one press since 27 October, but nothing orders it so the lines that matter are seen first.

For a trust attorney the papers are not yet safe to hand over. The audits reproduced:
- a FINAL Court Inventory counting a painting twice;
- a basis citing sales that do not exist;
- approvals that survive a change of destination;
- a shotgun "cleared to carry" to Goodwill;
- the Ellison plates still printed as Italian on the FINAL Trust Schedule, with one of the two stacks missing.

Three risks sit above all of it:
- One **Snapshot** of a full house empties the Jobs sheet and then every device's copy. This was measured on the real code.
- The first new client after that deletes every other client's records.
- The backend answers anyone who holds its URL, and once 2026-10-26c is deployed that includes sending a DocuSign envelope from Havellin's account.

Living jobs are close. Most defects are on estates, and the worst are on the pour-over estate, the commonest Palm Beach matter, where the trust's property, signers and money are never told apart from the estate's.

Nothing yet measures the agents. The first measurement has to score values against real sales and independent appraisals, on houses the prompts have never seen.

In both reviewers' judgement, the model that wins Palm Beach is not agents beating a twenty-year appraiser on the top tenth of the house. It is Havellin cataloguing and researching every line, with its evidence on paper, and an independent appraiser reviewing that valuable tenth in days, with a better file than anyone gives them today.

Getting there is about 42 build days, one session at a time (45 before the DocuSign round trip and part of the review work were built):
- a week to lose nothing, lock the data and start measuring;
- about four weeks to make every paper true and defensible;
- two weeks on the agents;
- under two weeks on the evening and what the approvals still need.

## 2. Fix now

**Today, before any build**
1. **Do not press Snapshot on any client** (**More ▾** › **Snapshot**) until P1 lands. Any of these empties the Jobs tab, then every device:
   - a house of about 295 named lines;
   - a second snapshot of a house of 150 lines;
   - two devices snapshotting 180 to 200 lines each.
2. **Run the five-minute probe** (Appendix B) in a new, standalone Apps Script project. It tells us whether a failed write leaves the tab empty (variant A) or untouched (variant B). It needs no redeploy and touches nothing of Havellin's. Answered 2026-10-28: neither (DEFERRED, Appendix B).
3. **Keep the three Apps Script URLs on Havellin's own devices only** until P2 locks the backend. Today anyone holding the jobs URL can read every client, share any folder and trash any file. Once 2026-10-26c is deployed, the same URL can also send a DocuSign envelope from Havellin's account to any address, carrying any PDF.
4. **If the sheet empties before P1 lands:** nobody saves, nobody adds a client, and you follow the runbook in Appendix B. A device whose chip says "do not close the tab" should be closed. Restoring the whole file loses any client added since.
5. **On the Ellison test client**, if you want its record right:
   - restore #81 (the salad plates) from **Removed items**;
   - correct #73's name to Spanish by hand. Unticking it and pressing **Re-value** may no longer work: since 27 October a press on a grey tick records your look again, and **Re-value** leaves a ticked name locked;
   - **Re-value** #78 (the cabbage ware, still "online comps $75" on Etsy asking prices).
6. **Still owed from before:**
   - the 2026-10-26c redeploy (it carries 2026-10-26b), then one DocuSign sandbox envelope to two of your own addresses (P26);
   - the insurance figures;
   - when Higginbottom quotes, ask in writing whether the E&O covers valuation estimates relied on in court filings, and AI-assisted work (attorney's point).

Below are the confirmed defects that meet the triage bar: lost data, wrong money, wrong party or legal wording, a wrong or indefensible value or item on a paper, a stuck job or a dead press. Each line says what is wrong, then the fix, the finding ids and the pack that fixes it. Every item was rechecked on main at 7abc836: where tonight's builds changed one, it says so in a clause, and the rest stand as written.

**Data that can be lost**
1. **One Snapshot empties the Jobs sheet.** The client's record passes the sheet's 50,000-character cell limit in any of three ways:
   - a snapshot of about 295 named lines;
   - two snapshots of 150 lines;
   - two devices each snapshotting 180 to 200 lines, which the server merges past the cap although each record alone is under it.

   The server clears the tab before it writes, and then the write fails. This was driven end to end on the real code and the real page, at 450 and 360 lines. Fix: write over the rows and never clear first, and measure every cell after the merge, on the server. Keep snapshot lines off the record. VAL-01, INV-02, GAP3-01 → P1.
2. **An empty sheet tells every device that every client was deleted.** Two seconds after the press, the iPad that pressed Snapshot holds 0 clients under "All changes saved ✓". Every other device empties itself at first contact ("Loaded 0 jobs from Sheets ✓"), and no device's copy can then rebuild the sheet. Fix: an empty Jobs tab is unread, never "deleted", on the server and in the app. GAP3-02 → P1.
3. **The first new client after a wipe deletes everyone else's records.** One save for the new client swept every other client's estimate, plan, hours and 450-line inventory off the sheet. Fix: the sweep acts only on a deletion somebody recorded. GAP3-03 → P1.
4. **Photographs not yet in Drive are deleted with the client.** Fix: only a delete a person confirms removes them. GAP3-04 → P1.
5. **The failed write is retried for ever, and empties the sheet again once it is restored.** Meanwhile that device stops seeing anyone else's changes, and its chip says not to close the tab. Fix: a size refusal is named and blocked, never retried, and a queued save sends the list as it is now. GAP3-05, GAP3-06 → P1.
6. **Every store tab is cleared before it is written.** After one failed write, the next save leaves only what that device carried. Fix: write first, then clear only what is left over. GAP3-07 → P1.
7. **A cold desk records nothing as fact.** With the sheet unreachable, **Snapshot** recorded "Filed with court: 0 items, $0" while the sheet held 9 lines, and **+ Add line item** minted #1. Fix: until the sheet is read, these refuse by name. SYN-08 → P1.
8. **Two devices overwrite each other.** A stale Qty edit wiped another device's typed name, $1,250 figure, grade and review. A stale **Name 24 shots** brought back 8 removed lines carrying $3,540 of values. A deliberate clear of a wrong approval came back. Fix: read the sheet before every run, bulk act and paper; never write a line the sheet holds as removed; then per-field clocks. SYN-01, SYN-02, SYN-04, SYN-10 → P6, P18.
9. **Counsel's workbook comes from whichever device saved last.** A stale device rewrote #4 at $80 over $120 in the folder shared with counsel. Fix: build the workbook on the server from the merged list. SYN-07 → P18.
10. **Work is stranded on a device.** An edit made just before closing is never sent. A failed write is never resent after a reload. The chip says "1 unsaved change" whatever the number. Fix: count the changes, flush them, and resend from the stored copy. SYN-06, SYN-18 → P6.
11. **A timer redraw saves half a name.** "Mahogany secretary desk with glazed bo" was saved, sent to Agent Two and valued at $60. Fix: every redraw waits until the person leaves the box. SYN-05 → P6.
12. **Remove lines takes lines you cannot see.** The selection survives bulk actions and filters, so a three-line cleanup removed all 12 Move lines (they can be restored). Fix: clear the selection after each bulk action and each filter change. LIV-02 → P9.

**Who can reach the data**

13. **The backend answers anyone holding its URL.** No request carries a credential, and both reviewers raised it (checked in the code). Whoever has the jobs URL can:
    - read every client and every inventory;
    - share any Drive folder with any email address;
    - trash any file.

    Since 26 October it can also send a DocuSign envelope from Havellin's account, with whatever PDF, signers and copies the caller chooses (`esignSendRequest`, live once 2026-10-26c is deployed).

    Fix: a device key checked first on every request, with shares and trashes held to the client's own folder, and an envelope only for a request the app built for a recorded job. RT-01 → P2.

**Authority, firearms and who signed**

14. **An approval survives a change of destination, taker or value.** Both PRs approved a $2,400 painting for Kodner. Retyped to Cousin Pete at $24,000, it stayed approved and was offered for sign-out. The ledger then printed both names against a donation they never saw. The DocuSign route (26 October) now leaves a line unrecorded if its destination or taker moved before the envelope completed; once an approval is recorded, by any route, it still follows the line anywhere. Fix: record what each signature approved, and ask once when it changes. EST-01, REL-01, SYN-03 → P5.
15. **A line changed after the request went is recorded at its new terms.** On the DocuSign route a changed destination or taker is now caught, but a changed value is still recorded at the new figure; on the email route nothing is caught once **I've sent it** is pressed. Fix: keep checking each line against the request that was sent; changed lines start unticked in **Record the signed request**. REL-02 → P5.
16. **The bulk request takes Keep and already-approved lines,** and a Keep approval later authorised a Junk run. Fix: the bulk request takes only lines that need approval. REL-07 → P5.
17. **A typed name counts as written approval,** and the playbook says to type it. Fix: **Record approval** is the only way in, with **Correct…** and a reason. REL-05 → P5.
18. **A firearm is "cleared to carry" to a charity, a hauler, or the Job Plan's auction house as its "licensed dealer",** and the signed request says the fiduciaries named it. Fix: only a person names a dealer, and a firearm is never offered Donate or Junk. EST-02, FLD-01 → P4. **Fixed 2026-10-27 (P4).**
19. **A beneficiary's receipt says Havellin delivered her a revolver.** Fix: no Havellin receipt lists a firearm, and the dealer's receipt gets its own row. REL-03, REL-15 → P4. **Fixed 2026-10-27 (P4).**
20. **The custody dialog releases a held firearm to a relative in one press.** Fix: it asks what the sign-out asks, starting on "Choose…". REL-04 → P4. **Fixed 2026-10-27 (P4).**
21. **A firearm found on site that was not flagged at intake never lights the crew's banner.** Fix: one rule for "firearms on this job". FLD-07 → P4. **Fixed 2026-10-27 (P4).**
22. **An item out with the appraiser can be signed out to a beneficiary,** and then reads both gone and still out. Fix: it waits until it is checked back in. REL-06, NEW-03 → P16.
23. **The ledger the PRs sign as "the final record" hides a release made without written approval.** Close job asks only about rooms, so a living job closed with an unauthorised shotgun, undecided lines, no hours and an unsigned Contents Record. Fix: one close-readiness list, and the ledger prints "ratification owed". DOC-11, EST-14, REL-08, NEW-04, VAL-14 → P12.
24. **One signature passes for every fiduciary's on the ledger, and a Co-Trustee signs as "Successor Trustee".** Fix: record who signed each copy, and print each signer's own role. EST-13, DOC-13 → P12.

**The pour-over estate** (the commonest Palm Beach matter)

25. **One pending appraisal holds both schedules at DRAFT,** and each DRAFT reason counts items that are not on it. A trust painting out with the appraiser blocks the PR's 60-day §733.604 inventory. Fix: each schedule's guard reads only its own lines. GAP2-01 → P11.
26. **A PR who is also the successor trustee can be named on only one schedule.** Either the corporate co-trustee "receives" the Trust Schedule alone, or the Court Inventory's adoption line names nobody beside recorded Letters. Fix: a combined role that signs each schedule in that schedule's capacity. GAP2-06 → P11.
27. **The trust's sale money is folded into the estate's.** A statement paid to the estate that covers a trust lot "agrees", and the ledger has one Net. Fix: a Held by column with a Net per holder, and a flag on a mixed or misdirected statement. GAP2-07 → P11.
28. **The charity's paper names the estate as donor of the trust's piano,** and the receipt hedges "the estate or the trustees … as the property is held". Fix: each paper names the holder of its own lines. GAP2-09 → P11.
29. **The CSV and the workbook leave the asset track blank on 31 of 40 lines,** which the screen and the schedules read as Probate (or Trust). Fix: export the track the screen shows. GAP2-08 → P11.

**Values and items on the papers**

30. **A basis sentence cites sales that do not exist.** The server dropped four invented sales but kept "Four sold comparables at Christie's and Kodner" on the Estate Inventory Report. Fix: a basis never names more sales than were kept. ACC-01 → P7.
31. **An Etsy asking price prints as "online comps".** Etsy's /market/ search pages pass the comparable filter, one URL cited three times is kept as three comparables, and a model's "sold" tag on an Etsy or Replacements page counts as a sale. The Ellison cabbage ware still prints "online comps $75" on the FINAL Trust Schedule, resting on Etsy asking prices alone (a figure from before 26 October). Fix: those pages count as search pages, one URL counts once, and those sites are always "asking". GAP1-05 → P7.
32. **The Form 706 notice withholds "an expert appraisal must be filed".** The valued articles of marked artistic or intrinsic value already total $8,480, but the notice says the aggregate "cannot be tested yet". Articles under $3,000 each are never routed to the sworn appraisal. Fix: say "already over the $3,000 aggregate", and mark every such article as owed the appraisal (counsel confirms the reading). GAP2-02, RT-05 → P7.
33. **A FINAL, adoptable Court Inventory counts things twice:** a painting at $4,200 and again at $3,900, and the walkthrough coins and the car each twice, while Possible duplicates showed 0 groups. Fix: an open possible duplicate keeps the schedule DRAFT, and walkthrough collections and vehicles are matched to their photographs. ACC-02, INV-01, INV-03, INV-04, FLD-06, SYN-09 → P8.
34. **A stack of plates is missing from the FINAL Trust Schedule.** "One photograph named twice" showed four lines on four identical pictures with nothing pairing a repeat to its original. The three Removes took both salad-plate lines. Fix: pair each repeat with its original, and offer **Keep the first reading**. GAP1-03 → P8.
35. **Not duplicates hides every later double of that line.** Since 27 October a Reviewed tick no longer settles an open double: the flagged-only build keeps it open, in bronze, naming Remove and Not duplicates (ROW-09 and NEW-05 rechecked fixed). But a double found after **Not duplicates** is still never shown, and under the flagged-only rule both halves now stand with no tick at all once they have a destination, while the work bar says one is flagged. Fix: record Not duplicates per pair. INV-05, AGT-03 → P8.
36. **Blank lines print as items, and the Estate Inventory Report's total leaves out unvalued lines with no floor wording.** Since 27 October REVIEWED no longer prints over an unnamed line: a tick cannot settle one, so the stamp reads IN PROGRESS. But each "nothing to list" photograph still prints as a numbered item on the Report and the Contents Record, and keeps every paper at IN PROGRESS until it is removed or named. A ticked unvalued line counts as checked, so the Report printed "REVIEWED — all 9 items" over a $8,410 total that left out two lines with no value. Fix: empty photographs leave the papers in one press; the total is a floor when it is one. ROW-01, NEW-01, AGT-01, DOC-01, VAL-27 (with EST-09, LIV-08, DOC-19, INV-08, ROW-17) → P7, P9.
37. **One select turns Agent Two's guess into an "appraisal".** Fix: Appraisal takes only an appraiser's own figure. VAL-02 → P7.
38. **The worklist tells counsel no expert appraisal is needed, from unreviewed figures.** The points total $2,800, but the agent's own ranges reach $4,500. Fix: read the top of each range, and stamp the sentence as unreviewed. ACC-03 → P7.
39. **Agent Two's "appraisal advised" goes quiet with one tick** and never reaches the worklist. Fix: one press adds the line to the appraisal list. VAL-06, AGT-06 → P15.
40. **The value standard and date change with no revaluation.** Liquidation Value restated a §733.604 schedule under a column still headed FMV. The §2032 tick dated a schedule to a future day. Fix: ask first, offer **Re-value**, and allow §2032 only on a Form 706 estate. ACC-09, VAL-08, ACC-10, VAL-09 → P15.
41. **The request states values on tiers contracted for none.** The new DocuSign copy carries the same words and the same group-only initials. Fix: no values on the Contents and None tiers, while a valuable line still gets its own initial. VAL-03, VAL-17 → P7.
42. **Wrong legal words.** The worklist tells a living client's appraiser to value "as of date of death". The Report calls exempt property "carved out of the probate estate". Fix: use the job's own value date, and show exempt property as claimed inside the estate. DOC-07, DOC-02 → P14.
43. **Photographs are missing, and a claim on the paper is false.** A 300-line house printed 110 to 149 photographs and told counsel to "re-open this tab". The paper claims "Photographs are reference-numbered", with no number or link anywhere. Fix: papers fetch their own photographs and link each line to its Drive file, and the schedules get item numbers. EST-06, DOC-03, DOC-06, INV-10, ACC-20, VAL-13, DOC-05 → P13.
44. **The release request carries no review stamp, and its flagged lines no mark.** Since 27 October the Report, both schedules, the ledger and the Contents papers say how many items were checked, how many stand as the agents left them and whether the list was read. The request, and its new DocuSign copy, say none of it, while *The Evening Desk* now tells you papers print IN PROGRESS until every flagged item is checked. Fix: the same stamp in the same words (Q100, Q104, Q107, Q109), and a mark on each line still flagged. EST-04, NEW-02 → P10.
45. **A living client's ⚑ caution vanishes once Agent Two values the line.** Fix: keep it, saying only Havellin's estimate is on record. LIV-01 → P10.
46. **Agent Two never sees the first close-ups,** the ones the guide tells the crew to take most important first. Fix: one order for both agents. ACC-15, FLD-02 → P7.
47. **The package's gap question counts only named lines,** and the blank-package guard passes on the walkthrough collection's own line. Fix: count every gap the desk counts. INV-07, NEW-07 → P9.
48. **The worklist leaves out lines linked to an appraiser,** and those lines can be signed out to auction mid-appraisal. Fix: list them under their appraiser, and add an "appraisal in progress" caution. VAL-11 → P15.
49. **The Ellison plates still print "appear to be Italian majolica".** Agent Two read them as Spanish five times, but every correction sits on a removed line. The tick on #73 stops Agent Two correcting or noting the name, because a ticked name is "checked by a person" (2026-10-25b). Since 27 October #73, rebuilt from its record, needs no tick, but its box still takes one; a press there, or **Mark reviewed**, still locks the name, and **Re-value** does not unlock it. The fix revisits that rule, so it is your call (Ask 22). Until then, correct #73 by hand. GAP1-01 → Ask 22, then P22.

**Dead presses**

50. Each of these is a press that does nothing or does the wrong thing:
    - the search box keeps one letter (ROW-03);
    - the first figure typed over Agent Two's drops focus (ROW-04);
    - the first press after an edit does nothing (SYN-12; since 27 October after a name edit too, and **✓ I've read the list** sits in the bar the edit replaces);
    - a quick second tap under **Not reviewed** reviews a line nobody saw (ROW-08);
    - a stale second box writes an old name back (ROW-05).

    Fix: keep focus, run repaints after the press, hold a ticked row in place, and keep one box per value. → P9.

## 3. Best in class

**What "best in class" means here** (both reviewers' judgement). For marked artistic or intrinsic value, the legal requirement on a Form 706 (§20.2031-6(b) [P]) and the evidentiary standard in a dispute are a credentialed appraiser's examination in person, under oath. Agents that set out to beat that appraiser invite a comparison Havellin would lose in front of a judge.

What the agents can have that no appraiser has:
- every line, every photograph and every comparable link;
- done in days;
- with a measured error rate on the everyday nine-tenths of the house;
- and the valuable tenth handed to an independent appraiser in the first week, with a better file than anyone gives them today.

That is how Havellin outcompetes the spreadsheet and the twenty-year appraiser alike: the appraiser ends up working from Havellin's catalogue.

### (a) Identification and valuation accuracy

**The Ellison china: what the record shows (GAP1).** GAP1 read the whole Ellison record from the sheet and opened the three kitchen photographs still in Drive (the 2026-10-19 files are gone).

- **The record holds no Etsy listing for the plates.** No bird-plate line, live or removed, carries an Etsy link. Agent Two read Spanish from the pattern in the photograph (yellow bird, blue daisies, dotted cobalt ground, cobalt rim). It did so 5 times out of 5 when it was free to correct, and said each time that the mark was illegible. Its comparables were eBay asking prices.
- **"Italian" came from the crew's spoken note.** The note reads "Italian plates going to Katherine", and Agent One's prompt hedges a family's "where it is from" into the name. With no note, on 10-19, it still guessed Italian, Central European or Slovak. Agent One's origin was wrong 6 times out of 6.
- **The mark was taken, and it identifies nothing.** The underside was shot twice: a blurred close-up, then 5 seconds later a sharp shot on the main shutter, which became its own line (#74). The room check paired #74 with the plates, but the desk could only Remove it, and it was removed. The mark is a painter's monogram and "15": it names no maker, town or country.
- **The correction never reached the live line.** You ticked #73 five minutes after Agent Two's Spanish notes landed on the sibling lines. A ticked name goes to Agent Two as "checked by a person", so the 26 October **Re-value** kept "Italian" and searched "Italian majolica".
- **The trustee reads Italian, and one stack.** The FINAL Trust Schedule prints "appear to be Italian majolica … approx. 7 in stack". The salad-plate stack is on no paper.

**Right the first time.**
1. **Keep the mark that was taken.** The room check says when one photograph is a close-up of another's object, and one press makes it that line's close-up and values the line again (GAP1-02, P8). While the crew is in the house, **Close-ups wanted** asks for the marks each class needs, from a by-class list (RT-20, P19). A mark need not name the maker, as the Ellison mark shows. GAP1's blur test did not separate the blurred close-up from the sharp one, so no blur check at the camera is promised.
2. **Origin from evidence, with its source named.** An origin or maker heard from the crew or the family goes in the record as heard ("the crew said: Italian"), never in the name. A maker the crew read off the thing stays in the name (Q98). Agent One records whether an attribution was read, inferred or neither. An inferred one on decorated ceramics, glass, silver or textiles sends the photograph to Agent Two, whose basis begins "Identified from …" (GAP1-04, P22).
3. **An identification grade on every line** (appraiser's proposal, RT-21): mark read (quoted), reference match (named and linked), papers or provenance, or visual only. A flat maker or origin prints only on the first three. On visual only, the name stays hedged ("tin-glazed earthenware, Spanish or Italian").
4. **A pattern reference, for identity only.** For china, silver and crystal, use Replacements Ltd's pattern pages by agreement, never by scraping. Test them on the Ellison pájaro pattern before relying on them. Send both agents the makers already confirmed in this house (ACC-18).

**When the two agents disagree.** No new review tier, and no flag where a mark settles it (Q95):
- Agent One's first answer is kept for good (P3).
- Where Agent Two changes a maker, origin, material or period and the change rests on a mark it read or a reference match, the new name goes in silently, as Q95 intends.
- Where the change rests on neither, the line carries the existing *unsure* hint until a person ticks it or types a figure (Q108). The record shows both readings and the evidence for each (attorney's correction; P22).
- The score counts disagreements by identification grade, and who was right.
- Where a person typed or ticked the name, as on Ellison, Agent Two today must hand it back unchanged and may not note it. Ask 22 widens the draft's question from "typed" to "typed or ticked".

**Can an Etsy listing stand as evidence?**
- **Of value: no.** An Etsy listing is an asking price, at most a ceiling, never fair market value in front of a trust attorney. Appraisal practice uses sold prices (ISA's fair market value guidance, R1 B4 [S]), and asking prices are not completed sales (R2 A.2). Agent Two's prompt already says this, but the server still lets an Etsy page through as a sale (GAP1-05, fixed in P7).
- **Of identity: only as a lead.** A seller's attribution is the seller's guess, and listings misstate origin often (both reviewers). A listing points to a reference. It counts toward identity only when its own photographs show the same mark. Where a listing is Agent Two's only evidence, the basis says so and the line reads *unsure*.

**The evidence standard: a value Havellin can defend.**
- **Sold comparables only,** each on its own page (built 2026-10-26b). Each is labelled sold or asking, with whether its price includes the buyer's premium; hammer-only results such as LiveAuctioneers' are labelled as such or grossed up by the house's stated premium (R2 C).
- **"High" confidence needs three sold matches** on maker, pattern or model, size and condition. They must fall within a recency set by category (12 to 18 months for falling classes: china, crystal, brown furniture, figurines), or be time-adjusted with the adjustment stated. An eBay Best Offer sale counts as sold with the price not shown (appraiser's correction, ACC-11). Later, ranges calibrated on Havellin's own results by category (R2 D.2).
- **The right market, by class** (attorney's correction to the draft, which left the prompt's "not retail" standing):
  - auction, buyer's premium included, for art, antiques, silver and jewelry;
  - the used or resale market for branded furniture, decor and electronics.

  Each basis names its market. This follows Treas. Reg. 20.2031-1(b) and *Scull* [S]; counsel confirms the premium question for a non-tax Florida inventory (R1 D9; ACC-12, P15).
- **The value drivers:**
  - size for art, rugs and case pieces;
  - for silver and gold, a floor of the weighable precious metal by purity at a refiner's payout on the value date, never offered as the value (stainless blades, filled handles and weighted bases excluded; 800, 830 and coin silver are not sterling; appraiser's correction);
  - plated stamps (GF, EP, EPNS, plate) never read as solid;
  - model and serial for watches (ACC-16).
- **No earlier figure in the valuing prompt,** because models anchor on numbers they are shown (R2 D.1, D.2). Check what the collection ballpark and **Re-value** send.
- **Provenance on every figure:** model, backend version, depth and time (ACC-19).

**Escalation, so the valuable tenth reaches the right person early.**
- **A sleeper check before anything irreversible** (appraiser's proposal, RT-14, P20). Every photographed line goes to Agent Two with its photograph. Before a Donate, Junk or Remove line leaves, any line no agent has seen at research depth gets one look: "could this be worth more than $250 an article, or need a specialist?" A note appears only on a yes. Today one confident Agent One call decides whether research ever sees a photograph.
- **The Form 706 aggregate routes articles** (RT-05, P7). Once marked artistic or intrinsic articles pass $3,000 together, each one is owed the sworn appraisal, whatever its own figure.
- **Agent Two's "appraisal advised"** reaches the guardrail and the worklist (P15).
- **Authenticity routes by class, on every job, before anything irreversible.** That means signed fine art, fine jewelry (tested by a gemologist, never valued from a photograph), luxury watches and handbags, Asian works of art, bronzes and attributed period antiques. Models are near chance at telling genuine from close copies (R2 D.1). An agent names and estimates; it never attests (Ask 24).
- **A second opinion that is actually independent** (appraiser's correction, P23). Two models running the same searches anchor on the same top result, so the second pass is blind: other sources, no shared comparables, no first figure. On the top band, use the independent appraiser rather than another model (Ask 19).

**Data, licensed only** (R2 C and E5; check prices on the vendors' own pages):
- Havellin's own proceeds statements, once the buyer's premium is recorded beside them (RT-16, P21). They are the best data, and already recorded.
- eBay Marketplace Insights (sold items, by application) and a free spot-metal feed. On the Ellison pattern, five tries found no sale anywhere on the open web; eBay's sold data is the only listed source that would have (GAP1).
- For art, Artnet's business package or LiveArt's API. WatchCharts and Greysheet only if watches or coins recur.
- Ask Liquidity Services (which closed its purchase of Invaluable on 1 October 2026) and ATG (LiveAuctioneers) about internal-use licences. Ask Kodner about sharing realised results (ACC-22).
- Scraping stays ruled out (Decided). See Ask 25.

**The accuracy programme: how "better than anyone" becomes a number.** This was rebuilt on both reviewers' points.

1. **Two kinds of truth** (Ask 3).
   - Identity truth is settled by evidence, with its source recorded: the backstamp text, the reference page, or the appraiser. You and Ashley can settle this, along with counts, rooms and destinations.
   - Value truth is only realised arm's-length buyer's prices (Havellin's own sales with the premium added, adjusted to the valuation date), independent credentialed appraisals, and licensed post-cutoff public lots.
   - The founders' own values are never the answer key for value: the score would measure agreement with Havellin, not with the market.
2. **Develop on one set, test on another** (appraiser's point, code checked, RT-18).
   - Ellison is the development set and the smoke test. The valuing prompt's own worked example is the plates' answer ("likely Spanish, Puente del Arzobispo type", main-sync.gs:4452), and the mirror, shears and Herend probes are Ellison lines. A score there measures what the prompt remembers.
   - The test set comes from houses the prompts never saw: the next mock house, the scripted runs' houses, and the first live estates with consent. It is frozen and kept from whoever edits prompts. The log records which prompt version saw which item, and no test item ever goes into a prompt.
3. **The first case is the Ellison pájaro plates** (GAP1-07), using the three photographs still in Drive. Score each arm on its own:
   - Agent One, with and without the crew's note;
   - the room check over the eight kitchen photographs (expect the underside paired, and "close-up of" once P8 lands);
   - Agent Two with the name checked and unchecked, with and without the sharp underside as a close-up.
4. **Public lots, done properly.**
   - Photographs come under licence, or by hand within each site's terms.
   - A run is rejected if a comparable it kept is the lot itself on any site, or post-dates the valuation date.
   - Catalogue photographs and field photographs are scored apart, and only the field scores count.
5. **The harness.** A small tool in the repo, holding no client data. It lifts the real agent code at any commit, as the tests already do, along with the app's request builders. It runs the desk's chain (Agent One, the room check, Agent Two) with a key kept in the cloud environment, never in the repo. Because it can score any commit, the 3f25460 baseline stays available after the prompts change. Pin the model while measuring (Ask 2).
6. **Headline scores first** (appraiser's proposal, RT-19):
   - sleeper recall: the share of items truly worth over $1,000, and over $3,000, that reached research or an appraiser (target near 100%);
   - overclaim rate: flat, unhedged maker, origin or period calls that were wrong, and how often "likely" is right;
   - dollar-weighted error on the estate's total.

   Then the draft's scores: identification by field; median error; share within ±25% and ±50%; median ratio; price-related differential; range coverage; error by confidence word; declines; the comparable mix; disagreements and who was right; seconds and model per call.
7. **Targets only from enough data.** That means several hundred lines with realised prices, at least 30 per high-value class, and an interval printed beside every figure. Sixty to a hundred lines cannot carry a category-by-band target.
8. **A head-to-head with appraisers** (Ask 27). Two independent appraisers value the same 150 to 200 field-photographed lines from the same photographs and notes, and one also values a sample in person. Without the appraisers' own error beside the agents', "better than a twenty-year appraiser" stays a hope.
9. **When it runs:** on every backend change that touches an agent, and whenever a new top model appears. Results go to a private AgentScores sheet.
10. **What it buys, and what not to do with it** (both reviewers).
    - Measure internally first.
    - Show a figure outside Havellin only after an independent appraiser has reviewed a random sample and the head-to-head has run. It goes in counsel's words, with the sample size, the period, the definition of truth, and "estimates, not appraisals".
    - Never put it in the agreement or on a court paper. A published error rate is a representation a beneficiary's counsel will hold Havellin to.
11. **Consent.** Reusing a client's photographs and values to measure the agents needs a consent clause in both forms (counsel; RT-12). Until it is signed, only the Ellison test client is used, and never a contested matter's data.

Cost per scoring run (R2): about 1,500 searches for 300 researched lines, about $15 in search fees, plus tokens.

**Your first steps:**
1. Create a separate Anthropic key with a monthly spending cap. In this session's title bar, open the cloud environment menu, then **Edit**, and add it under **Network secrets** (labelled API credentials on an older app) for api.anthropic.com, or as an environment variable named ANTHROPIC_API_KEY. Never paste it into a chat. A new session picks it up.
2. Answer Ask 2 (pin the model while measuring) and Ask 3 (who settles the truth).
3. Settle the identity of the Ellison china and its counts. A cloud session then scores 3f25460 on Ellison as the development baseline, and builds the held-out test set as houses are shot.

### (b) The list: complete, nothing twice, nothing missed

**Prove it complete, room by room** (INV-06, P25). For each room in scope the desk shows:
- as-found shots and Items photographs;
- lines, unnamed lines and "nothing to list";
- not reviewed, and no value or no basis;
- undecided lines, the room check, open duplicates, and the room's status.

A locked room with nothing in it reads "nothing inventoriable, locked <day> by <who>". The same reader feeds a **Ready for counsel** card, the schedules' DRAFT reasons, the package's gap question and a printed rooms index, so an empty room is visibly empty rather than missing.

**Nothing twice.**
- Open duplicates hold the schedule at DRAFT (P8).
- Walkthrough collections and vehicles meet their photographs (INV-03, INV-04, FLD-05, FLD-06).
- **Not duplicates** is recorded per pair (INV-05).
- A photograph read twice pairs each repeat with its original (GAP1-03).
- A close-up shot on the wrong shutter becomes a close-up, not a duplicate to throw away (GAP1-02).
- Big rooms are read whole (AGT-08).
- Scored first: a whole-house pass for doubles across rooms, and for doubles far apart within one room. Today only 38% of photo pairs in a 40-photo room are ever read together (INV-13).

**Nothing missed.**
- Must-finds are tied to their line and listed in the package (INV-11).
- Two checks are tested on Ellison before they are built (Ask 26): things in frame that no line names (INV-12), and the as-found pass compared with the list (AGT-16, INV-23).
- The sleeper check before Donate or Junk (RT-14, P20).
- **Outside evidence** (attorney's proposal, RT-07, P25):
  - intake asks for the homeowner's scheduled-property rider and any prior appraisals, photographed as one paper;
  - the desk matches each scheduled item to a line, or records it "not found";
  - a short record of what was reported removed before Havellin arrived (who, what, when, who has it) prints on the As-Found Record, so the date of death and the date of entry are not confused.
- **Papers found in the house** (attorney's proposal, RT-08, P25): certificates, statements, policies, safe-deposit keys, prior appraisals and certificates of authenticity become a third Found on site kind, handed to counsel against a receipt the same day. A provenance paper is linked to its lines.
- A supplementary inventory after adoption (INV-15; §733.604(2) [P]).
- Make sure the intake's offsite-storage row is asked.

**Lots.**
- Show the $100 rule on the line itself (DOC-25, VAL-29).
- Mark group lines so the test can run (INV-09).
- Make **Itemise** and **Combine** one press each (INV-17, INV-19).

### (c) The papers to counsel and the trust officer

Every valued line on every paper should carry:
- item number, room, and its photograph linked to the Drive file;
- a description with any mark quoted, and its identification grade;
- the count in articles;
- condition;
- the value with its basis, market, standard and date;
- the appraiser, where it was appraised;
- where a value stands as Agent Two left it, the stamp's own words, bronze until the list is read (Q100, Q104, Q109).

Before any real estate receives a FINAL schedule (pulled forward on both reviewers' advice; P17):
- **A preparer's statement, signed once per schedule by a named principal** (Ask 17). It covers:
  - the scope and the dates the property was examined;
  - what was not examined (safe-deposit box, offsite storage, locked containers, things reported removed before entry);
  - the method, and the market for each class;
  - the valuation date and the AI assistance (Ask 16);
  - limiting conditions and extraordinary assumptions: authenticity not determined unless appraised; materials as marked; condition as photographed on a stated date and assumed unchanged since the date of death;
  - an independence certification: no interest in the property, no fee contingent on value, and which referral fees Havellin receives (Ask 18);
  - an attribution glossary (attributed to, manner of, after).

  Counsel words it. In a contested matter it gives counsel a person who can explain how the numbers were made; a model cannot testify, and the estate's expert in *Kollsman* could explain neither his comparables nor his figures [S].
- **A cover page:**
  - what is open;
  - the total, and the share resting on appraisal, sold comparables, going-rate estimates, a person's figure, and unvalued;
  - the top 20 lines, each with its basis (RT-22, DOC-18).
- **Valuation Support** for each researched, appraised or $500-plus line: the method, up to three stored comparables (sold or asking, premium basis, date, link), the confidence, and who reviewed it and when, or the appraiser and credential (EST-08, ACC-07, VAL-12, DOC-08). It answers a §733.604(3) request before it is made (R1 A5 [P]).
- **A per-beneficiary schedule** on a values tier: each beneficiary's lines, with value, basis, photograph link and totals. Many Palm Beach wills divide tangible property "as nearly equal as practicable", and §733.604(3)(b) limits a beneficiary to their own items. Havellin supplies the figures and never advises on equalising (RT-11).
- **Where the law puts each part:** totals stated as floors where they are floors, and exempt property and property outside the probate estate each in its place (DOC-01, DOC-02, DOC-16).
- **On a pour-over:** a Held by column, and each schedule signed in its own capacity (P11).
- **The referral-fee relationships** named on the Court Inventory, the Trust Schedule and the Report, as the ledger already names them (RT-04, per Ask 18).

Later, in P24:
- the marks quoted under each description;
- the As-Found Record and the signed papers linked in the package (EST-07);
- the Report as one table per group, with a summary by category;
- a **Send** for each paper.

For a trust, the ledger prints each line's inventory value beside its gross, fees and net, and leaves gain or loss to the accountant (R1 B2 [P]; Ask 21).

### (d) Approvals to executors and trust officers: one tight round trip

- **One round.** Built on 26 October (backend 2026-10-26c, waiting on its redeploy and one sandbox envelope): every fiduciary initials and signs in one envelope, and completion records each one's own day on every line the request carried and files the signed copy and the certificate. A line whose destination or taker moved while it was out is left unrecorded and named. Still to come: strikes recorded as declines (today a fiduciary signs the whole envelope or declines it; EST-05), approvals tied to their terms once recorded (P5), and the iPad for a fiduciary standing in the house (FLD-14, Ask 28). A round is now one press to send and none to record or file, where it cost 8 to 11 presses plus days each way.
- **What the fiduciary sees:**
  - the photographs (the folder shared, as the package already does);
  - each value with its basis, and the stamp the other papers carry (P10);
  - the sale price or reserve (EST-16, Ask 30);
  - the cautions, including a sale to a co-representative, which is the self-dealing case under §733.610 [P] (REL-09, DOC-10, Ask 29).
- **What must not leave yet** (both reviewers; counsel words it; P17). These are flags, never refusals:
  - household furnishings and up to two vehicles while a spouse's §732.402 exempt-property window is open (R1 A12 [P]);
  - on a Form 706 estate, the marked artistic or intrinsic classes before the §20.2031-6(c) notice and the sworn appraisal (R1 A16 [P]).
- **Who signs on a pour-over:** see Ask 10 (whether signers follow the track) and Ask 11 (whether the trustee's own paper is recorded).
- **Who speaks for a living client.** A guardian or an agent under a power of attorney is a fiduciary, and their word is not the client's (Ask 35).
- **What the record proves:**
  - each approval tied to what it approved (P5);
  - a paper for every leaving: junk loads, dealer receipts, and a pickup signed by a named person (P30);
  - the close naming anything still owed (P12).

### (e) Positioning in Palm Beach (R2)

- **Auction houses** (Freeman's | Hindman and Heritage in West Palm Beach; Sotheby's, Christie's, Bonhams, Doyle, Kodner) appraise the valuable part of a house, usually to win the consignment. In *Kollsman* the Tax Court rejected exactly such a specialist's values as conflicted [S].
- **Estate sale companies** quote 35% to 50% of gross (R2, HomeLight). Move managers do not value at all.
- **Winston Artory Group** (Palm Beach Gardens, over 50 million art sale records) is the technology threat, but for art only.
- **Nobody found publishes how accurate their values are.**

*Kollsman* cuts both ways. In both reviewers' judgement, a trust officer applies it to Havellin too: Havellin values a line, picks the channel, and is paid a referral fee by it. So say only what is true:
- Havellin never buys.
- Agent Two's request carries no destination field, but the crew's spoken note goes to it in full and can name one ("going to Katherine"; checked in the code).
- A concierge can retype a figure after the channel is chosen.

Ask 18 settles the referral fees. P21 dates each value before a selling disposition is chosen, and logs any later change with its reason.

Havellin's case, once this plan lands:
- the whole house, photographed and numbered room by room under the federal $100 rule, inside the 60 days;
- a basis, a market and evidence on every value;
- every line reconciled to where it went and what it brought;
- the valuable tenth in an independent appraiser's hands in the first week (Ask 19);
- an error rate measured against real sales.

Publish that rate only as section (a) step 10 allows.

## 4. The upgrade, pack by pack

**Every pack follows CLAUDE.md:**
- `npm test` passes, and each change is revert-checked;
- a new browser step through the real controls (numbered from 115, in build order: steps 113 and 114 went to the two builds of 26 and 27 October);
- the manual, the playbook (HTML and markdown) and any field guide updated in the same commit;
- `BACKEND_VERSION` bumped, and you told, whenever a .gs file changes;
- the rule recorded in CLAUDE.md and the story in BUILD_HISTORY.

**Triage labels:**
- *fix now:* lost data; wrong money, party or legal wording; a stuck job; a dead press.
- *fix if cheap:* friction on a full house.
- *freeze exception:* new behaviour, which is your call, as P24 and Q88 were.

**Order.** Data and access first, then the measurement, so the baseline exists before any prompt changes. Then every paper true, the attorney's read at the launch gate, the agents, and last the evening's speed.

### Phase 1: lose nothing, keep it private, start measuring (about 4 build days)

**P1. Nothing is lost: the Jobs sheet and every device's copy.** Fix now · L, two sessions · both .gs files redeployed.
- ✓ **Built 2026-10-27** (both sessions in one build; backend `2026-10-27b`, carried by P2's `2026-10-27c`; `BUILD_HISTORY.md`, 2026-10-27e). Owed: the redeploy of both files (the probe ran 2026-10-28: DEFERRED; CLAUDE.md under Backend). Until the redeploy, Snapshot refuses by name. Beyond the bullets below, the work bar and an empty list say what a cold copy is (the rest of SYN-08). **Reviewed the same day** (`BUILD_HISTORY.md`, 2026-10-27f): on the deployment live until the redeploy a device still lost its clients one save at a time after the tab emptied, so only a deletion the sheet records now takes a client off a device and Save Client refuses while the sheet's refusal stands; a client too large for a cell is held alone and every other client saves; a snapshot is recorded once its lines land; the manual's runbook restores the five stores on an older deployment, as Appendix B does.
- Goal: no press, failed write or empty sheet can delete a client anywhere, and a cold desk records nothing as fact.
- Session 1, the server:
  - **Never clear a tab before writing it.** Write the new rows over what is there, then clear only the rows past them. The same goes for every store tab and the ledger (GAP3-01, GAP3-07).
  - **Build the merged rows first and measure every cell before touching the sheet,** in the batch save and the one-client save. Refuse by name: "Estate of Walter Price is 81,554 characters; a sheet cell holds 50,000. Nothing was written." This has to happen on the server, because two devices' snapshots pass the cap only at the merge.
  - **An empty Jobs tab is unread, never "every client deleted".** Every job and job-keyed write is refused with "the Jobs tab is empty", and loadJobs answers the same, until a reset made in the editor stamps itself. Ids being restored are not counted as deleted (GAP3-02).
  - **The orphan sweep acts only on a deletion somebody recorded:** a delete, a reset or a prune writes it to the ledger. "Seen once and now absent" no longer counts (GAP3-03).
  - **Commit the probe** (Appendix B) as an editor-only function.
- Session 2, the app:
  - **Snapshot lines leave the job record.** A snapshot labelled *Filed with court* keeps count, room, condition, source and date for every line, plus a dated PDF of the schedule as it stood. **Compare** shows count, room and basis changes (VAL-01, INV-02, VAL-31, INV-14).
  - **The app never overwrites a cache holding clients with an empty list,** and never applies a "deleted" verdict covering every client it holds. It says "The sheet has no clients right now. Nothing on this device was changed. Tell Anthony." A refusal reads "refused by the sheet", never "deleted elsewhere", and never ends in "All changes saved" (GAP3-02).
  - **Photographs not yet in Drive are never deleted on a server's verdict.** A device still holding some says so (GAP3-04).
  - **The size refusal is blocked, never retried by itself.** The chip names the client and the size, and says closing the tab is safe. A queued save sends the list as it is now, not as it was when queued (GAP3-05).
  - **A blocked write no longer stops this device seeing others' changes** (GAP3-06).
  - **A cold desk refuses by name:** **Snapshot**, the papers, **CSV** and **+ Add line item** say "this device has not read the inventory yet" (SYN-08).
  - **The recovery runbook goes into the manual** (GAP3-08; Appendix B holds it until then).
- Closes: VAL-01, INV-02, SYN-08, VAL-31, INV-14, GAP3-01 to GAP3-09.
- Measured (GAP3, the real code over a fake sheet that enforces the cap, and the real page):
  - In variant A, the pressing iPad is at 0 clients 2.25 s after the press, under "All changes saved ✓".
  - Every other device empties at first contact.
  - The first new client sweeps a 450-line inventory off the sheet.
  - A device offline at its retry empties the restored tab again.
- Checks:
  - GAP3's rig becomes a test file covering both variants and the two-device merge;
  - a browser step presses **Snapshot** on a 450-line desk and finds the sheet and every device intact.
- Code: saveAllJobsToSheet, saveJobToSheet, _writeStoreBlob, _readStoreBlob, _jobRefusal, _deletedJobIds, _sweepDeletedJobKeys, loadJobs, refreshJobsFromCloud, _applyDroppedJobs, _purgeLocalJobRecords, _backendErrorKind, queuedPostSync, _syncWritesOutstanding, takeInventorySnapshot, _snapItemOf, _invManifestUnread.
- Rule to record: the ledger's "an id seen and now absent was deleted" no longer holds for an empty tab. Starting over goes through the editor's reset.
- Tell Anthony: two redeploys. Until both land, no **Snapshot**.

**P2. Only Havellin's devices reach the data.** Fix now (any holder of the URL can trash files and read every record) · M · main-sync.gs redeploy.
- Goal: the URL stops being the only key (both reviewers; code checked).
- TC:
  - Once per device, Settings takes a device key beside the three URLs, typed once like them. It is not a sign-in, so Q59 stands.
  - A device without it reads "this device has no key: ask Anthony".
- Server:
  - Every action in the jobs backend checks the key first, except the version probe. The key lives in Script Properties only, never in the public repo.
  - Anthony rotates it from the editor when a device is lost or a contractor leaves.
  - **shareFolder** works only on folders under the client's own folder, and only for an email recorded on that job.
  - **trashFile** works only on files under the root folder.
  - **esignSendRequest** (added 26 October) sends only a request the app built for a recorded job, to that job's recorded fiduciaries. Today the caller picks the PDF, the signers' names and emails, the copies and the subject.
  - Each share and each trash is logged.
- Reader: a one-page data-handling statement for trust departments' vendor reviews. It says where the photographs and values live, who can open them, the Anthropic API's retention terms (verify them) and how an incident is handled. It is drafted for you and counsel (RT-24; R1 A20).
- Not proposed: moving access codes off the item, which is Decided (Q72). Worth knowing: the sheet's version history keeps every code ever typed, wiped at close or not.
- Later, fix if cheap: the same key on the two directory backends, which hold no client data.
- Closes: RT-01, RT-24.
- ✓ **Built 2026-10-27** (backend `2026-10-27c`, carrying P1's `2026-10-27b`; `tests/p2-device-key.test.js`, browser step 118; `BUILD_HISTORY.md`, 2026-10-27g; the statement is `legal/Havellin_Data_Handling_Statement_v1.0.md`, counsel bundle G3). Live only once Anthony redeploys and sets `HAVELLIN_DEVICE_KEY` (the manual's *2026-10-27c* note gives the order, P1's redeploy folded into its step 1). The two directory backends are left as they were.
- Checks: a test that every dispatched action refuses without the key, derived from the action list as the version test is; the app sends the key on every request; a browser step.
- Code: doGet, doPost, shareFolder, unshareFolder, trashDriveFile, esignSendRequestEnvelope, BACKEND_ACTIONS, the Settings form.
- Tell Anthony: redeploy and type the key on every device the same day, or that device stops syncing. If you would rather use Google sign-in for the backend, say so first; it is a bigger change, and close to the login Q59 ruled out.

**P3. Measure the agents: the harness and the baseline.** Fix if cheap (nothing a person sees changes) · M.
- ✗ **Dropped 27 October** (Ask 3: *"let's not score the agents at this point. this is supposed to be helping us. we are not paying a appraiser to identify the whole mock set of values. stop with this line of upgrading."* Ask 2's pin is moot with it).
- Goal: a score for each agent before any prompt changes.
- Builds:
  - The harness and test sets as in 3(a), steps 1 to 7. It lifts the real agent code at any commit, with small stand-ins for UrlFetchApp, DriveApp and CacheService, and runs the app's own request builders.
  - Each line keeps the agents' first answers for good, never printed (ACC-05; Agent One's own name is already kept as `agentName` since 27 October, for the duplicate check, and the rest is still to do): Agent One's name and category; Agent Two's figure, range, confidence, source, depth, model, backend version and time (ACC-19).
  - Agent Two's batch answers are checked against the name sent before they are written (ACC-21, plausible).
- First run: the Ellison pájaro plates arm by arm (GAP1-07), then the 3f25460 baseline on Ellison as the development set.
- Closes: ACC-06, ACC-05, ACC-19, ACC-21, GAP1-07, RT-18, RT-19; RT-12 in part (Ellison only, until the consent clause is signed).
- Checks: the harness tested on a synthetic fixture; nothing from a client committed.
- Code: _avWrite, _agWrite, agentValueLines, agentIdentify, agentCheckRooms, _avItemPayload, _agShotPayload; tests/harness.js.
- Decide first: Ask 2, Ask 3. You add the key.

### Phase 2: make every paper true and defensible (about 18 build days)

**P4. Firearms go only to a licensed dealer.** Fix now · S to M. **Built 2026-10-27** (CLAUDE.md, Firearms; `tests/p4-firearms-dealer.test.js`, browser step 119). Its independent review the same day found two ways round it and four rough edges, all fixed before it landed (`BUILD_HISTORY.md` 2026-10-27j): the settle's clear was not stamped, so the merge put the Job Plan's vendor back on a firearm (FLD-01 again); **Use that line** put a firearm on the walkthrough's Donate; the dealer route was free text; an unread Vendor Directory read as "not a licensed dealer"; a living client's banner gave the crew's rule; and a firearm on Hold was told to press Record approval (LIV-05's dead end).
- TC:
  - A firearm offers Auction, Consign or Sell to a dealer, To a person through a dealer, Hold and Keep; never Donate or Junk.
  - The dealer is always a person's pick: a recorded dealer route, or a directory firm under *Firearms Dealer (FFL)*. The Job Plan's vendor never fills it.
  - The bulk bar skips firearms and says how many it skipped.
  - The custody dialog starts on "Choose…" and asks before *Released*.
  - A firearm found on site lights the banner in the house, in the room and in the desk's Urgent strip.
  - The row repaints when Firearms is chosen.
  - A living client's firearm on Keep reads "stays with the client" in grey.
- Reader:
  - The request reads "licensed dealer not named yet" until one is named.
  - No beneficiary receipt lists a firearm.
  - **File the dealer's receipt** has its own row on estate and living work alike.
- Closes: EST-02, FLD-01, REL-03, REL-04, REL-15, FLD-07, LIV-05, SYN-14.
- Measured: one bulk press put 4 shotguns on Donate with no flag. Goodwill, Haul-It and the plan's Kodner each read "Cleared to carry".
- Checks: every arm of the transport gate, the receipt groups and the custody gate; a browser step. The protocol's sentence for living work goes to counsel.
- Code: invTransportDealer, invFillPlanChannel, invReceiptGroups, addCustodyEvent, firearmsBannerHtml, _invEdit, _invBulkApply.
- Decide first: Ask 4.

**P5. An approval means what was signed.** Fix now · M · saveInventory.gs redeploy.
- ✓ **Built 2026-10-27** (backend `2026-10-27d`; `BUILD_HISTORY.md`, 2026-10-27k and l, P5; `tests/approval-pinned.test.js`, browser step 120). On Ask 5's answer: crossing $500 or the appraisal threshold, or a rise of more than 25%, on every route; a fall never. Owed: the redeploy of `saveInventory.gs` (with `main-sync.gs`). Until it lands, another device's older copy saved over a newer one can drop from the sheet what an approval approved, and a device that then loads the line from the sheet reads the approval as covering wherever it goes, until the device that recorded it saves again.
  - Its review, the same day (six findings, all fixed; `tests/approval-pinned.test.js` group M): two devices' approvals of different terms are never joined in the merge, the app's or the sheet's (one kept, the other set aside in the record); Record the signed request waits for the sheet and never pins a line the paper did not carry as it reads; the bulk bar's Record approval lists where each line goes and starts a line changed since the request went unticked; an approved line kept, held or undecided asks nothing and flags nothing (its approval is history); on a client's own home Record approval opens with the signer blank (REL-05's second half); and a firearm's dealer route is part of what its approval approved (recorded, changed or taken off after the signature, it holds the firearm: bundle C7's stricter reading).
  - Merged with P4 the same evening (`BUILD_HISTORY.md`, 2026-10-27m): the dealer an approval covers is P4's, a Vendor Directory firm under *Firearms Dealer (FFL)* that a person picked, on a sale as on a route, so a sale signed while its paper read *licensed dealer not named yet* is held once the name is listed as a dealer; the route's prompt refuses a name that is no dealer before the approval's question. Open: a request printed while the directory has not loaded (P4's third question to Anthony).
- Already built, on the DocuSign route only (26 October): a line whose destination or taker moved while the envelope was out is left unrecorded and named (`destSig`, `approvalEnvelopeChanged`). This pack takes that fingerprint to every route, and keeps it after the approval is recorded.
- TC:
  - Changing where an approved line goes, who takes it, or its value past the threshold asks once: "Approved Oct 12 by Thomas and Nora for Auction · Kodner Galleries: this change goes on the next request."
  - A line changed after the request went is flagged, and starts unticked in **Record the signed request**. The email draft's changed-lines check reads the same fingerprint, never two devices' clocks (`approvalRequestChanged` compares `updatedAt` with `draftedAt`; found by the flagged-only build's own review).
  - The bulk request and **Record approval** take only lines that need approval, and say what they left out.
  - **Authorized By** becomes read-only, with **Correct…** and a reason.
  - A date after today is refused; a date before the request went is flagged.
- Reader:
  - Sign-out sheets, the ledger and receipts print an approval only where the paper supports it.
  - A moved line reads "previously approved for Auction · Kodner Galleries" and goes on the next request.
- Closes: EST-01, REL-01, SYN-03, REL-02, REL-07, REL-05, REL-26.
- Measured: 0 confirms when an approved line was re-routed; a $2,400 approval raised to $24,000 stayed approved; 0 flags on a change made after **I've sent it**. Rechecked on 7abc836: unchanged, and on the new route a line approved through the envelope and then re-routed to Palm Beach Estate Buyers stayed approved and was offered for sign-out, and a value raised to $2,900 while the envelope was out was recorded with no notice.
- Checks: a pinning test; the manifest-merge test holds the new field equal on app and server; a browser step; the playbook row and the manual restated.
- Code: invApprovalComplete, invApplyApproval (the one approval writer since 2026-10-26c), invSaveApproval, approvalRequestSig, approvalRequestChanged, approvalEnvelopeChanged, invWrittenReleasePicked, INV_STICKY_FIELDS, _invMergeApprovals.
- Decide first: Ask 5, which now sets both routes. The DocuSign route (P26) is built; this pack is what makes its approvals hold once recorded.

**P6. Two devices: stop the losses now.** Fix now · M.
- ✓ **Built 2026-10-27** (no backend change; `BUILD_HISTORY.md`, 2026-10-27o; `tests/p6-two-devices.test.js`, two desks built from the real code over the sheet rig's real server merge; browser step 121, two pages). Every press on the list reads the sheet first and says what it left alone, or refuses by name (`invReadFirst`); the open desk reads again every minute and names what another device changed; what waits is sent as the page goes and the browser asks while it is out; what the sheet lacks is sent again from the device's copy, at the next read and at start-up (`hav_inv_owed`, ids only: the queue is still never persisted); the chip counts lines; every redraw the app makes on its own waits for the box to be left. The playbook and *The Evening Desk* say one person per client on the desk at a time. **Contained, not closed:** a row's own edit off a copy up to a minute old still wins an item whole (SYN-01's Qty case), and an agent's answer landing inside the minute can still bring back a line the other device removed: both wait on P18's per-field merge. **Its review, the same evening** (`BUILD_HISTORY.md`, 2026-10-27p; four must-fix and three should-fix): Record approval on the selection bar reads first and records only what its dialog showed, a line another device moved while it was open left unrecorded and named, as the sign-out and the proceeds statement now do (EST-01 had come back through the minute's read); every press made while a read is out goes, in order; a read that never answers lets go after 30 s; the minute's re-read never asks DocuSign; an owed client's copy is never reclaimed for space, and after a reload with the sheet still down it waits in the retry queue under the chip.
- Goal: until the merge itself is fixed (P18), nothing acts on a stale copy and nothing typed is lost.
- TC:
  - **Name N shots**, **Check N rooms**, **Value N lines**, **Mark reviewed**, **Remove lines**, every paper, **CSV** and **Snapshot** read the sheet first, and refuse by name when they cannot ("Named 16 of 16; 8 removed on the other device were left alone").
  - The open desk re-reads every 60 seconds when idle and names what changed.
  - Edits made just before closing are sent.
  - Failed writes are resent from the stored copy, so the retry queue is never persisted (Decided).
  - The chip counts lines not yet on the sheet.
  - Nothing redraws under typing, the DocuSign arrival's redraw (26 October) included.
- Closes: SYN-10, SYN-06, SYN-18, SYN-05, SYN-16. Contains SYN-01 and SYN-02 until P18.
- Checks: a two-device test (two sandboxes against the real server merge); a browser step with two browser contexts. The guides say "one person per client on the desk at a time" until P18. That sentence costs nothing and can go in today.
- Code: refreshPhotoRefs, _invRefreshFromCloud, _invCloudRetryArm, _pendingCount, _scheduleInventorySync, _invRenderWhenIdle.

**P7. No figure the evidence does not support.** Fix now · M, up to two sessions · main-sync.gs redeploy.
- ✓ **The critical part built 2026-10-27** (backend `2026-10-27e`, carrying P5's `2026-10-27d`; `tests/p7-evidence.test.js`, browser step 122; `BUILD_HISTORY.md`, 2026-10-27q; counsel bundle D22): sales that were not kept (a basis never names more sales than were kept; a figure whose sales were all dropped says it rests on no sale, the server's sentence, rather than going once more), asking prices are not sales (Etsy's market, category, shop and search pages and the shop pages of 1stDibs and Chairish are search pages, one URL counts once, the marketplaces and retail stores always ask), Appraisal means an appraiser's figure (asked first, the figure off, typed after; never on the bulk bar; *appraisal (appraiser not named)*), the §20.2031-6(b) sentence (the top of each range, the stamp's words), a floor is a floor (the Report by the Court Inventory's rule, the probate estate and outside property subtotalled, one helper for the three papers), and the Form 706 aggregate (already over whatever the rest are worth, every such article owed the sworn appraisal as a flag, articles counted). Owed: the redeploy of `main-sync.gs`. Not built here: VAL-04 and VAL-05 (Ask 7), the request's values on the Contents and None tiers (VAL-03, VAL-17), one close-up order (ACC-15, FLD-02), and the smaller fixes (NEW-19, DOC-21, DOC-22). The 706 readiness list the bullet below names does not exist yet: the articles owed are named on the worklist's aggregate block and the desk's Summary notice, and each joins its specialist's packet.
- **Sales that were not kept.** A basis never names more sales than were kept. A figure whose sales were all dropped is sent once more, or says it rests on no sale (ACC-01).
- **Asking prices are not sales** (GAP1-05; the first half of ACC-11):
  - Etsy's /market/, /c/ and /search pages, and the shop-search pages of 1stDibs and Chairish, count as search pages.
  - A URL already cited on the line counts once.
  - Etsy, 1stDibs, Chairish, Ruby Lane, Replacements and retail sites are always "asking", whatever the model says.
- **Appraisal means an appraiser's figure.** Appraisal as a source takes only the appraiser's own figure, typed after choosing it. The bulk menu drops Appraisal. Where no appraiser is recorded it prints "appraisal (appraiser not named)" (VAL-02).
- **The §20.2031-6(b) sentence** reads the top of each agent range and carries the stamp's words while its figures stand as the agents left them (ACC-03; Q104).
- **The Form 706 aggregate tells the truth** (GAP2-02, RT-05; counsel confirms the reading):
  - Once the valued articles pass $3,000, the worklist and the desk say "already over the $3,000 aggregate whatever the remaining N are worth: an expert appraisal must be filed with the return".
  - Every such article is marked as owed the sworn appraisal, joining the worklist and the 706 readiness list, as a flag.
  - The class table counts articles, not lines.
- **No values on the request on the Contents and None tiers.** A valuable line still earns its own initial there, from the internal range or ⚑, with no figure printed (VAL-03, VAL-17). This covers both copies: the email PDF and the DocuSign copy, where that line then gets an initials box for each fiduciary.
- **Pending appraisals hold the schedule.** A schedule stays DRAFT while an appraisal Havellin linked is still out, at every documentation level. "Appraisal · Carla Mendes (report to follow)" shows while no report is filed (VAL-04, VAL-05 wording; Ask 7).
- **A floor is a floor.** The Report states a floor when lines are unvalued, using the Court Inventory's own rule, with probate and outside property subtotalled (DOC-01, VAL-27).
- **Smaller fixes:**
  - the ratification section no longer totals an unvalued item as $0 (NEW-19);
  - no "expected back" for an appraisal already in (DOC-21);
  - the CSV fills Net, uses local times and prints "Yes" (DOC-22).
- **One close-up order for both agents:** close-ups added at the desk first, then the field's in the order taken; research reads six (ACC-15, FLD-02). The guide now also asks for a close-up of the mark on flatware and china (Q103), and its most-important-first order makes that the close-up Agent Two drops once a line has five.
- Closes: ACC-01, GAP1-05, VAL-02, ACC-03, GAP2-02, RT-05, VAL-03, VAL-17, VAL-04, VAL-05, DOC-01, VAL-27, NEW-19, DOC-21, DOC-22, ACC-15, FLD-02.
- Checks:
  - the basis rule on dropped and partial comparables;
  - the three stored Ellison #78 comparables give one asking or none;
  - the 706 statement over and under $3,000 with one unvalued article;
  - the request rendered on all four tiers, both copies;
  - one floor helper shared by both papers;
  - the photography-guide test still holds "Most important first";
  - a browser step.
- Code: _avLineResult, _avResultsPage, AGENT_VALUE_RESULTS_SEGMENTS, _avTakeValue, maivAggregate, maivStatement_, _maivWorklistBlock, invNeedsAppraisal, printApprovalRequest, invOwnInitial, printCourtInventory, printEstateInventoryReport, invLineCloseUps, _agDetailRefs, _invExportValue.
- Decide first: Ask 7. (Ask 6 was answered by Q109.)

**P8. Nothing counted twice, and no mark thrown away.** Fix now, except the close-up press (fix if cheap) · M to L, up to two sessions · main-sync.gs for the room check's new field.
- **Open duplicates hold the schedule.** An open possible duplicate prints on the Court Inventory, the Trust Schedule and the Report as "1 possible double count not yet decided: #1 and #2", and keeps them DRAFT. Agent Two waits on the later line of a high-confidence pair.
- **"One photograph named twice" pairs each repeat with its original** ("#87 repeats #73 · #88 repeats #81"), each picture cut to its own part of the photograph. It offers **Keep the first reading**, asked first, which removes only the matched repeats and keeps a line that is new in the second reading (GAP1-03).
- **A close-up on the wrong shutter stays a close-up.** The room check says when one photograph is a close-up of another's object ("#74 is a close-up of #73"), and the group offers **Make it #73's close-up**. That uploads nothing, removes #74 with that reason and spends its number, keeps what Agent One read on it, and then values #73 again. The same press sits in any Items line's record, with a line picker (GAP1-02).
- **Walkthrough collections and vehicles meet their photographs.** One photographed as an ordinary line comes up as "Is #20 the Coin collection? **Use that line** / **Not the same**", found through Agent One's context or a shared word in the name. Vehicles get **Use that line** too. A line never photographed prints "walkthrough estimate, not yet photographed".
- **One vehicle, one line.** A vehicle's line takes its id from the vehicle, so two devices make one line, and the import waits for the sheet.
- **Not duplicates** is recorded for that pair only. This matters more since 27 October: a double found after an earlier Not duplicates is never shown, and under the flagged-only rule both halves then stand with no tick once they have a destination, while the work bar says one is flagged (AGT-03).
- **The Reviewed tick on an open pair: done on 27 October**, in another form. A tick never settles an open possible duplicate; the box keeps it in bronze and names Remove and Not duplicates (ROW-09, NEW-05, rechecked fixed). Possible duplicates now key on Agent One's own reading (`agentName`), so a rename or a category change on one half does not answer one either.
- **Big rooms are read whole.** A room over 160 photographs is read in overlapping parts, and the picker no longer reads "#20 #20".
- Closes: ACC-02, INV-01, INV-03, INV-04, FLD-06, SYN-09, GAP1-02, GAP1-03, INV-05, AGT-03, NEW-20, INV-21, AGT-08. ROW-09 and NEW-05 were closed by the 27 October build.
- Measured: see Fix now 33 to 35. A 300-photo room was stamped checked after 160.
- Checks:
  - duplicate groups across all three kinds of evidence;
  - on the Ellison four, **Keep the first reading** keeps #73 and #81;
  - the close-up press puts #74's file among #73's close-ups and sends it to Agent Two;
  - a browser step; the playbook's duplicate sentence restated.

  Nothing is ever merged automatically (Decided).
- Code: agentDuplicateGroups, agentNamedTwice, _agDupHtml, agentDropDuplicate, agentNotDuplicate, _agDupEligible, _arDupEligible, record_doubles, collectionLinesEnsure, materializeVehicle, _agContext, _arWrite.
- ✓ **Critical part built 2026-10-27** (no backend change; `tests/p8-nothing-twice.test.js`, browser step 123; `BUILD_HISTORY.md`, 2026-10-27s, P8). An open possible duplicate keeps the Court Inventory and the Trust Schedule DRAFT (Anthony confirmed it, 2026-10-28: *"Yes, DRAFT"*), *1 possible double count not yet decided: #1 and #2*, its signature withheld and its lines and figures named under the total, and the Estate Inventory Report names it under its IN PROGRESS stamp (`invDoubleCounts`). Agent Two waits on the later line of a room-check pair both of whose lines read as plainly one thing, and on a repeat of a photograph read twice, until Remove or Not duplicates (`agentValueWaiting`, `_avDupReleased`). *One photograph named twice* pairs each repeat with its original, *#87 repeats #73 · #88 repeats #81*, by Agent One's crops (else its names' words), and offers **Keep the first reading**, asked first, which on the Ellison four keeps #73 and #81 and keeps a line not matched to the first reading. **Not duplicates** is recorded for the pair (`dupOKIn`, one id per press on every line of the group, `agentDupCleared`), and the room check counts only a double the block shows. Its review, the same evening (`BUILD_HISTORY.md`, 2026-10-27t): the readings matched once, removed lines included, and only the same words pairing lines the crops cannot place, so a second Keep never takes the salad plates the first kept; each room-check pair keeps its own sentence and confidence (`dupPairs`); a rename, a close-up or a press mid-chain no longer goes round the wait; a photograph read twice counts once per repeat on the papers; the estate package's question names an open double count. Closes ACC-02, INV-05, AGT-03; INV-01 and GAP1-03 in part. Left for a later build: the close-up press (GAP1-02), collections and vehicles meeting their photographs (INV-03, INV-04, FLD-06, and INV-01's other half), one vehicle one line (SYN-09), big rooms read whole (AGT-08, NEW-20, INV-21), and each picture cut to its own crop.

**P9. Every press lands, and empty photographs leave the list.** Fix now · M. Reduced on 27 October: the flagged-only build stopped a tick settling an unnamed line.
- **No Reviewed on a line with no name: done, in another form.** A tick no longer settles an unnamed line. The box keeps it in bronze, *Ticked by …, but still open: no name yet*, and every paper reads IN PROGRESS while one is on the list (ROW-01, NEW-01, AGT-01 rechecked). Left: **Mark reviewed** still writes that stuck tick onto blank lines, and takes their notes off the list while they stay open (a too-dark note left it). It should leave unnamed lines alone and keep their notes.
- **Empty photographs leave the list.** Photographs Agent One found nothing in get their own chip, **Nothing to list N**, and one press, **Remove the N with nothing to list**. The photographs are kept, and **Removed items** restores them. These lines leave Select all and every paper. Under the flagged-only rule each one keeps **Not reviewed** counting and every paper at IN PROGRESS until it is removed, so this press matters more than it did.
- **A frame too dark to read** says "could not be read: <the note>" and offers **+ Close-up**.
- **A ticked row stays put.** Under **Not reviewed** (since 27 October, the flagged lines) or **Unsure**, a ticked row stays in place, greyed, with **Undo**. Where the line that slides under the finger is unnamed, its tick is a bronze one that settles nothing, and the next click takes it off.
- **One box per value.** The line's record loses its second name box and its second recipient box.
- **The selection clears** after each bulk action and each filter change, and a press over hidden picks asks first.
- **The package's gap question** counts unnamed, nothing-to-list, open duplicates and flagged lines not yet ticked. It already names an unread list (27 October).
- **Dead presses:** search keeps its typing and focus (ROW-03), the first figure typed over Agent Two's keeps focus (ROW-04), and a press straight after an edit lands (SYN-12). Since 27 October a name edit and a figure edit each replace the whole work bar (once or twice), so the read's line and the counts repaint in place instead.
- Closes: EST-09, LIV-08, DOC-19, INV-08, ROW-17, AGT-02, ROW-08, ROW-05, LIV-02, INV-07, NEW-07, ROW-03, ROW-04, SYN-12; ROW-01, NEW-01 and AGT-01 in part (their stamp half closed on 27 October).
- Saves: about 25 nothing-to-list lines per 300 photographs, at 4 presses each (100 presses), become 2 presses.
- Checks: a browser step (Select all and Mark reviewed over blank lines, the paper, the double tap at 150 and 600 ms, typing in search at a normal pace, **✓ I've read the list** pressed straight after a name edit).
- Code: invLineReviewed, invLineOpen, _invStampLineReviewed, _invBulkApply, _invProgressStamp, agentApplyResult, INV_WORK_FLAGS, _invPanelCols, _invPicked, probatePackageGaps, _renderInvFilterRow, _invEdit, _invReadLineRepaint, _invReviewRepaint.

**P10. The release request carries the stamp the other papers carry.** Fix now · S to M. Rewritten on 27 October to your Q100, Q104, Q107 and Q109 answers.
- Reader:
  - **The request, both copies** (the email PDF and the DocuSign copy), the Donation Record and the living request print the same stamp as the Report and the ledger, in the same words: how many items were checked, how many stand as the agents left them, and whether the list was read (Q100, Q104, Q107), with the value pill bronze until it is (Q109). Today they print none, while *The Evening Desk* says papers print IN PROGRESS until every flagged item is checked (EST-04, NEW-02, VAL-28, LIV-22).
  - **A line still flagged is marked on its row** with what the desk's box names ("needs a look: a figure for an earlier name"). A line that stands carries no mark of its own (Q106); the stamp speaks for it (DOC-14).
  - Each request value shows its basis word (DOC-15).
  - A living ⚑ line keeps its caution ("only Havellin's estimate, $1,200, on record"). Since 27 October the line keeps its tick on the desk (an appraisal hold), but the client's papers still lose the badge (LIV-01).
  - On Formal, "N valued lines with no basis stated" becomes a DRAFT reason. That is a gap in the basis, not the read, which Q109 keeps FINAL.
- TC:
  - **Send request** and **Send through DocuSign** ask once, as the package already does, when the list is not read or a flagged line on the request is not yet checked, and offer to open those lines. Nothing asks for a tick on the rest.
  - A figure typed over Agent Two's drops the agent's stale range and opens a one-tap reason (per Ask 8). Q105 already makes that figure your look.
  - A **No basis** chip gathers the lines still without one.
- Closes: EST-04, NEW-02, VAL-28, LIV-22, DOC-14, DOC-15, LIV-01, VAL-07, ROW-10. VAL-15 (the Court Inventory FINAL beside an IN PROGRESS Report) is decided by Q109.
- Checks: one reader for every stamp, the request's two copies included; *The Evening Desk*'s sentence held to the request; a browser step in print media.
- Code: printApprovalRequest (`opt.esign` too), sendApprovalRequest, _invProgressStamp, _avUnreviewedStamp, _avAcceptedPill, invAcceptCtx, _invLineHolds, printDonationRecord, INV_RELEASE_CAUTIONS, _avTakeValue.
- Decide first: Ask 8. (Ask 6 was answered by Q109.)

**P11. The pour-over estate: each line on its own schedule, signer and holder.** Fix now for the first four; fix if cheap for the rest · M, up to two sessions · saveInventory.gs for the workbook.
- **Each schedule's DRAFT reasons count only its own lines.** A trust painting out for appraisal no longer holds the PR's 60-day inventory (GAP2-01). S.
- **One person, both offices.** A "Personal Representative and Successor Trustee" role signs each schedule in that schedule's capacity, and co-fiduciaries print their own role. On Both, Edit Client flags Letters recorded with no fiduciary named as a PR (GAP2-06). S.
- **Proceeds by holder.** A *Held by* column (Estate, Trust, Outside both) goes on the ledger, with a Net per holder on the ledger, the Summary and the workbook. A statement covering both tracks, or paid to the wrong holder, is flagged and never refused ("covers estate and trust property: the trust's share is $560"). Counsel confirms how a mixed settlement is split (GAP2-07). M.
- **Each paper names the holder of its own lines.** The charity's sheet and the Donation Record name the trustee for a trust line. A beneficiary's receipt names the estate or the trustee, plural only where several trustees are recorded. A sheet with lines on both tracks splits by holder. Counsel confirms the donor of record on a trust's gift (GAP2-09). M.
- **The export matches the screen.** The CSV and the workbook print each line's track as the screen shows it (GAP2-08). S.
- **Set track…** goes on the bulk bar, with a Track word on the row and Trust and Not on a schedule chips, on Both and trust matters only (GAP2-03). S. Saves 60 to 90 presses per 30 lines, and about 900 taps on a 300-line house.
- **The trustee's own attorney.** An optional trustee's attorney email on Both is copied on the package, and the email says what each schedule is for. Counsel says whether trust counsel is copied or addressed (GAP2-11). S.
- Closes: GAP2-01, GAP2-03, GAP2-06, GAP2-07, GAP2-08, GAP2-09, GAP2-11.
- Checks: each paper on probate, trust, Both (the representative as PR, as trustee, and as both) and neither; GAP2's 40-line pour-over seed with one mixed statement; a browser step.
- Code: printCourtInventory, printTrustSchedule, _invGuardrailItems, _invOnProbateSchedule, _invOnTrustSchedule, scheduleSigners, EXECUTOR_ROLES, proceedsReconciliation, dispositionLedger, estateProceedsHolder, signoutSheetHtml, printDonationRecord, invReceiptFrom, _invExportValue, _renderInvBulk, probatePackageRecipients.
- Decide first: Ask 9, Ask 10, Ask 11.

**P12. The close and the ledger tell the whole truth.** Fix now · M.
- TC: one close-readiness list feeds the Closing bar, the Close-out card and **Close job**'s question. Each item comes with its count and first item numbers:
  - lines with no disposition (Hold included on living work);
  - photographs not named;
  - leaving lines without the written approval they need, firearms first;
  - ratification owed;
  - receipts owed;
  - donations unreceipted;
  - signed approvals not filed;
  - sold lines on no statement, or on one that disagrees;
  - appraisals pending, or reports owed;
  - a schedule still DRAFT (the bar says so, rather than "not filed yet");
  - the ledger or Contents Record unsigned;
  - no hours logged on an hourly job;
  - the list not yet read (the package's question asks since 27 October; the close does not).

  All of these are flags; the refusals stay as they are.
- Reader:
  - The ledger's Authorized by reads "ratification owed", or "signed so far by …; still to sign …", with a gap line. The package's custody record lists the same.
  - "Left the property" appears only for what has left.
  - Signed copies record who signed, and go green only when every fiduciary has signed.
  - Each signer prints in their own role.
  - The Contents Record uses its no-values stamp.
- Closes: VAL-14, NEW-04, EST-14, REL-08, DOC-11, LIV-13, VAL-26, DOC-12, LIV-21, EST-13, DOC-13, LIV-11, DOC-27.
- Measured: the Ashworth close named 2 matters, while 3 undecided lines, 3 approvals owed, 1 pending appraisal and 3 sold lines on no statement went unmentioned.
- Checks: one DOM-free reader, with a count of its readers; a browser step (the Ashworth and Hale closes).
- Code: closeOpenWorkFlag, applyJobTransition, ledgerCloseFlag, dispositionLedger, ledgerSignedCopies, scheduleSignLines, deskFoldState.
- Decide first: Ask 12, Ask 13.

**P13. Every line traceable to its photograph and number.** Fix now · M · main-sync.gs for one prompt field.
- TC: the desk keeps the session's photographs (only the stored copy is trimmed), so rows stop turning into emoji after the first tick.
- Reader:
  - Every paper fetches its own lines' photographs before printing, uncapped, and links each line to its Drive file. "Re-open this tab" goes.
  - The Court Inventory and Trust Schedule gain Item # and Room columns, with one set of column widths, sorted by number. The footer says only what is true.
  - Lots print "(8 × $90)". A Form 706 lot over $100 an article is marked on its line. A group with no count reads "grouped, untested", since Agent One marks group lines.
  - A count left in a name gets a hint on the row.
  - Removals carry a reason, and a "Numbers not used" footnote explains gaps.
  - The summary counts both lines and articles.
- Closes: EST-06, DOC-03, ROW-02, ACC-20, VAL-13, DOC-05, DOC-06, INV-10, INV-16, INV-20, INV-09, DOC-25, VAL-29, INV-18.
- Measured: 110 to 149 photographs printed for 300 lines; 0 Drive links on five papers; 142 of 300 row photographs left after one tick.
- Checks: the print-only fetch writes nothing to localStorage; a browser step in print media.
- Code: _invPrintThumb, _invSaveThumbCache, _invEnsureThumbs, _invScheduleSection, invLotSplitState, _invTombstoneLine.
- Decide first: you approve the new footer sentence.

**P14. Each paper says the right thing for its matter.** Fix now · S each, about a day.
- **Exempt property** is shown as claimed inside the probate estate on the Report, with its subtotal. The manual is corrected, and the heading goes to counsel (DOC-02).
- **The worklist's value date** is the estate's, naming the alternate date when it is elected. Living work never shows a date of death, and its Values bar says "To a specialist" (DOC-07, VAL-24, NEW-14).
- **Trust-only papers** say "Inventory" and "the trust's Drive folder" (DOC-28).
- **The worklist states facts,** not app instructions (DOC-20).
- **The Court Inventory carries its own name,** and the email says what each attachment is for (DOC-17).
- **An appraiser's firm prints once** (VAL-30).
- **More ▾** offers each instrument only where the matter has it (EST-20).
- **On a Contents tier,** the guardrail says what counsel should have appraised (VAL-25).
- **The living CSV and its words follow the job** (LIV-16).
- Closes: DOC-02, DOC-07, VAL-24, NEW-14, DOC-28, DOC-20, DOC-17, VAL-30, EST-20, VAL-25, LIV-16.
- Checks: each paper rendered on probate, trust, both, neither, unanswered and living; manual parity.

**P15. The value follows the job's standard, market and date.** Fix now · M · main-sync.gs redeploy.
- TC:
  - Changing the basis asks first, names the agent figures made under the old basis, and offers **Re-value**. On the probate track or a 706 estate, only Fair Market Value is offered without a "counsel only" confirm.
  - The §2032 tick appears only on a 706 estate, and only once the alternate date has passed, and offers to re-date and re-value.
  - Agent Two's appraisal and specialist notes carry **Add to appraisal list** (**Send to a specialist** on living work). Advised lines count under **Needs appraiser** until linked or waived. Since 27 October such a note holds the line's tick, but one tick still drops it, and it still reaches neither the guardrail nor the worklist (VAL-06, AGT-06 rechecked).
  - The worklist groups lines by the appraiser they are linked to, with **Send worklist**.
  - **Waive** records who and when, can be undone, and prints.
  - An overdue report shows on the Values bar.
- Reader:
  - The column, the footer and the total are labelled by the basis.
  - A line's own date prints where it differs from the heading.
  - Agent Two's standard follows the regulation's rule by class, in place of today's "not retail": auction with the buyer's premium for art, antiques, silver and jewelry, and the used or resale market for branded furniture, decor and electronics. Each basis names its market, and hammer-only comparables are labelled as such or grossed up by the house's stated premium (attorney's correction; counsel confirms, R1 D9).
  - An "appraisal in progress" caution appears on sign-outs and the request.
- Closes: ACC-09, VAL-08, ACC-10, VAL-09, ACC-12, VAL-11, VAL-06, AGT-06, VAL-16, VAL-21.
- Checks: a browser step; the harness (P3) scores the market change before and after.
- Code: setValBasis, setEstateAVD, estateValueDate, _avSystem, _avTool, invNeedsAppraisal, agentValueNotices, printAppraisalWorklist, waiveAppraisal.
- Decide first: Ask 14.

**P16. Approvals agree everywhere.** Fix now for the first two items; fix if cheap for the rest · S each, about a day.
- **A line with the appraiser waits** on its leaving row ("check it back in first"); a line already gone leaves the hand-off (REL-06, NEW-03).
- **A co-representative recorded after the request went** reads "not on this request: send them their own" (REL-11).
- **Signing acts are kept per signer per day:** "Signed Oct 26 by Thomas Ashworth (1 of 2)" (EST-12, NEW-23). The DocuSign route already files one copy per signing day; the hand route is what is left (not rechecked).
- **The dashboard card** shows the desk's changed-draft warning (REL-12).
- **A line already gone** can still have its vendor's sheet filed, marked for ratification (REL-13).
- **The card counts ratification lines separately,** and offers **Send a reminder** rather than a second request (REL-19, NEW-26).
- **Removing a designated line** that is on a sent request says so (REL-25).
- **A custody event is voided with a reason,** never deleted (REL-24).
- **Row chips repaint** as a recipient, date or approval is typed (REL-16).
- **Wording slips** (EST-21, EST-22, REL-27, LIV-23).
- Closes: REL-06, NEW-03, EST-12, REL-11, REL-12, REL-13, REL-19, NEW-26, REL-25, REL-24, REL-16, NEW-23, EST-21, EST-22, REL-27, LIV-23.
- Checks: browser step 84 D moves with the plural fix; a new step covers the appraiser and beneficiary case.
- Decide first: Ask 15.

**P17. Who stands behind the schedule.** Freeze exception (Ask 1 recommends it in this phase) · L, two sessions · every sentence to counsel through the bundle.
- Goal: before any real estate receives a FINAL schedule, a named person, the method and the evidence stand behind it (both reviewers).
- Reader:
  - The preparer's statement, one per schedule, as in 3(c). It is signed once by a named principal before the schedule can read FINAL. There is one sign-off per paper and nothing per line, which fits "one paper per batch" (RT-03, DOC-23, ACC-08).
  - The one disclosure sentence on every valued paper, plus a short methodology page (Ask 16).
  - The cover page: open items, value by basis, and the top 20 lines (RT-22, DOC-18).
  - Valuation Support at its minimum, from the comparables already stored: method, up to three comparables, confidence, and the reviewer or the appraiser (EST-08, ACC-07, VAL-12, DOC-08).
  - The per-beneficiary schedule on a values tier (RT-11).
  - Two release cautions, flags only, in counsel's words (RT-06):
    - the §732.402 exempt-property window, on a probate-track estate where a surviving spouse is recorded or a claim is noted, until counsel records it waived or decided, or a date counsel supplies passes;
    - on a 706 estate, no sale of the marked artistic or intrinsic classes ahead of the §20.2031-6(c) notice and the sworn appraisal.
  - The referral-fee relationships named on the Court Inventory, the Trust Schedule and the Report, per Ask 18 (RT-04).
  - Where Ask 19 is yes, "values reviewed by …, ASA" on the schedule.
- TC: one press for the principal's sign-off. The cautions show on the row and the request.
- Closes: RT-03, RT-22, RT-11, RT-06, EST-08, ACC-07, VAL-12, DOC-08, ACC-08, DOC-23, DOC-18; RT-04 in part.
- Checks: the statement and the cautions rendered on every matter and tier; the cover's shares add to the total; a browser step in print media.
- Code: printCourtInventory, printTrustSchedule, printEstateInventoryReport, sendProbatePackage, probatePackageDocs, INV_RELEASE_CAUTIONS, EXEMPT_CAP_732_402, maivFilingApplies, referralFeeVendorsNote, dispositionLedger.
- Decide first: Ask 16, Ask 17, Ask 18, Ask 19.
- Counsel, through the bundle:
  - the statement;
  - the AI sentence;
  - the two cautions;
  - an engagement term in both forms (RT-02): what Havellin's values are, the intended users, no reliance by anyone else, the AI assistance, an optional route through counsel on a contested matter, and the consent to de-identified internal use (RT-12).

**P18. Two devices: the merge itself.** Fix now · L, two sessions · both .gs files redeployed. It can follow Phase 3 if "one person per client on the desk" holds.
- Session 1: per-field clocks on what a person owns, in both merges, held equal by a test. That covers name, category, count, Each and Total, source, basis, date, condition, destination, review, Not duplicates and removal.
  - A removal beats a later edit, except **Restore**, and a deliberate clear is a clock too.
  - Agent writes carry the time of their request, skip any field a person changed since, and never move the line's clock (CLAUDE.md's own rule).
- Session 2:
  - counsel's workbook built on the server from the merged list, found by the Shared Drive-safe lookup;
  - item numbers issued by the server under its lock, never moved once printed ("#— numbering" until then);
  - each job's list stored on its own, with saves timed in the editor.
- Also: a device whose copy predates a DocuSign envelope can still send a request, and its stamped record wins the whole-record merge (the DocuSign build's own known item; the agreement has the same exposure).
- Closes: SYN-01, SYN-02, SYN-04, SYN-07, SYN-11, SYN-17.
- Checks: the merge test on app and server, and the two-device step rerun. Then the "one person per client" sentence comes out of the guides.

**Launch gate before Phase 3.** The trust and estate attorney reads the package here, so counsel's changes land once (Road to launch).

### Phase 3: the agents right, and the reader's proof (about 11 build days)

**P19. Close-ups and naming while the crew is in the house.** Freeze exception · L, two sessions.
- Naming in the house: each room's Items photographs are named as they reach Drive (on the camera's **Done**, when online), and then the room check runs.
- **Close-ups wanted** appears on the room's brief and in the camera. It lists:
  - a mark too small to read;
  - a painting with no back shot;
  - a size wanted;
  - a line the agents disagree on with no mark read (once P22 records the identification grade).

  One press arms **Close-up** on that line. A guard stops two devices starting the same run.
- The by-class close-up list (appraiser's proposal, RT-20), in the camera and in *Photographing a House*:
  - silver: every hallmark and the underside, saying aloud "weighted" or "hollow handles";
  - gold and jewelry: the stamps on the clasp and shank, the maker, and any GIA inscription;
  - bronze and sculpture: the signature and foundry mark on the base;
  - Asian works of art: the base and foot rim;
  - furniture: a drawer side showing the joint, the underside and the back panel;
  - paintings: a low-angle shot of the surface to tell paint from print, and the canvas edge;
  - books: the title page and copyright page;
  - coins: both faces and the holder label;
  - a scale card in frame for art, rugs and case pieces.
- In the room:
  - Room tiles carry where it goes, ⚑ and **Close-up**.
  - A shot still on the iPad reads "held on Ashley Jerome's device", and no other device offers **Mark lost** for it.
  - Vehicles join the inventory by themselves, with VIN, mileage and title, and get a camera chip.
  - Failure lines name the next press, and batches go at the server's size.
- Closes: ACC-17, AGT-10, FLD-08, FLD-09, FLD-11, FLD-05, AGT-13, RT-20.
- Saves: the auditor estimates 40 to 45 minutes of agent time on a 300-photo house that today runs in an open tab at night (an estimate, not measured).
- Checks: a browser step in field mode; the photography-guide test holds each new row to the code.
- Decide first: Ask 20.

**P20. The sleeper check: nothing valuable leaves unseen.** Freeze exception · M · main-sync.gs redeploy.
- Goal: one confident naming never decides alone whether a valuable thing goes to Goodwill (appraiser's proposal).
- What changes:
  - Every photographed line goes to Agent Two with its photograph. You have said cost is not the concern.
  - Before a Donate, Junk or Remove line leaves (when the disposition is set, and again at sign-out), any line no agent has seen at research depth gets one photograph look: "could this be worth more than $250 an article, or need a specialist?"
  - A note appears only on a yes, and the line goes to research. There is no box and no new tier.
- Scored as sleeper recall in P3 before it is switched on.
- Closes: RT-14.
- Code: _avItemPayload, agentValueMode, agentValueLooks, signoutGroups, _invEdit.

**P21. Sales against values, at the buyer's price.** Freeze exception · M.
- **The buyer's premium is recorded.** Each auction vendor's premium goes in the Vendor Directory, and each sold line gets its buyer's price (hammer × (1 + premium)). In the appraiser's judgement, a consignor's gross without the premium makes correct values look high and an adopted sale understate the schedule by 20 to 30% (RT-16).
- **Sales sit beside values.** The proceeds dialog shows each lot's inventory value beside its buyer's price, and flags a gap over 50% and $500. The Closing bar adds "Sales against inventory value". Counsel can adopt an arm's-length buyer's price in one press, dated against the valuation date, with a note where the channel pays Havellin a referral fee. Estate-sale results are recorded as their own market (liquidation, not FMV).
- **Each value is dated before the channel.** Each line's value is stamped before a selling disposition is chosen, and any later change is logged with its reason (both reviewers, on independence).
- **The ledger shows both values.** It prints each line's inventory value and basis beside gross, fees and net on a values tier (Ask 21).
- These sales feed P3's value truth.
- Closes: VAL-10, RT-16, EST-15 (per Ask 21); RT-04 in part.
- Code: openProceedsStatement, proceedsReconciliation, dispositionLedger, vendorPaysReferral.
- Decide first: Ask 21.

**P22. Agents right the first time.** Freeze exception · M to L · main-sync.gs redeploy · each change scored before and after.
- **The server sets the confidence, not the model.** "High" follows the standard in 3(a). Comparables carry the number of articles covered, the market and the premium basis (ACC-11).
- **Attribution is recorded:**
  - Agent One returns whether an attribution was read, inferred or neither.
  - A heard origin or maker goes in the record as heard, never in the name. A maker the crew read off the thing stays in the name (Q98).
  - An inferred or missing attribution on decorated ceramics, glass, silver or textiles sends the photograph to Agent Two whatever its depth, replacing the hedge-word trigger.
  - Agent Two treats a heard origin as a claim to test against the photograph, and its basis begins "Identified from …" (GAP1-04). This revisits a prompt rule the build wrote in on 2026-10-26, not one of yours.
- **The identification grade on each line,** and the disagreement rule in 3(a). A flat maker or origin prints only on a mark, a reference or papers. A change resting on neither shows *unsure* until ticked (RT-21).
- **Agent Two's reading of a typed or ticked name,** per Ask 22 (GAP1-01).
- **Re-value unlocks nothing.** Its confirm says a tick on the old figure goes with it, but only the value's tick goes; the line's own tick stays, so a name ticked once is sent as checked by a person on every later Re-value (seen rechecking GAP1-01).
- **Replacements' pattern pages** identify china, silver and crystal, and never price them, by agreement. They are tested on the Ellison pattern first. Makers confirmed in this house go to both agents (ACC-18).
- **Value drivers** (ACC-16):
  - size from a scale card or said aloud;
  - the silver and gold floor as in 3(a);
  - GF, EP, EPNS and "plate" never named as gold or sterling;
  - serials sent for watches and instruments;
  - a short note per category in Agent Two's request.
- **Damage said aloud counts in the grade,** marked "said in the house" (FLD-04, plausible; scored on Ellison first).
- **Unsure is ordered by dollars at risk,** and any range $1,000 wide counts as unsure (ACC-13).
- Closes: ACC-11, ACC-16, FLD-04, ACC-18, ACC-13, GAP1-04, RT-21, GAP1-01.
- Decide first: Ask 22, Ask 23.

**P23. A second opinion where it matters, and licensed data.** Freeze exception · L · after P3 shows where the errors are.
- **A deep depth** for lines whose first figure tops $1,000, for low-confidence intrinsic lines, and for estate lines above a third of the appraisal threshold.
- **The second pass is blind and different:** other sources, licensed data where it exists, no shared comparables, no first figure. Within 25% the median is used; a wider spread reads *unsure*, with both figures and an appraisal note. On the top band the independent appraiser takes the place of another model, where Ask 19 is yes (ACC-14; appraiser's correction).
- **Licensed sources** are wired in, each scored before it is trusted (ACC-22).
- **Two checks scored before they are switched on:** the room check also names things in frame on no line, and a whole-house text pass looks for doubles (INV-12, INV-13).
- **Authenticity routing,** per Ask 24.
- Closes: ACC-14, ACC-22, INV-12, INV-13, RT-09 (per Ask 24).
- Decide first: Ask 24, Ask 25, Ask 26, Ask 27.

**P24. Valuation Support in full, and a package that proves itself.** Freeze exception · L, two sessions.
- **Valuation Support completed:** under **More ▾**, as an appendix to the Report and schedules, and in the package after the ledger. It carries each line's identification grade.
- **What Agent One read, on the page:** the marks it read are quoted under each description, and its basis and confidence show in the line's record (DOC-26, ROW-13).
- **The package proves itself:** it adds the As-Found Record and links the Signed Records (EST-07).
- **The Report is easier to read:** one table per group, with a Room column and a summary by category (DOC-24).
- **A Send for each paper** on the desk (the Estate Inventory PDF, each schedule, the Contents List and the worklist), recorded like the request (EST-10).
- Closes: DOC-26, ROW-13, EST-07, DOC-24, EST-10.

**P25. Ready for counsel: completeness room by room.** Freeze exception · L, two sessions.
- The completeness reader and card from 3(b), its printed rooms index, and the package question reading it (INV-06).
- Must-finds are tied to their line, with **This is it** on Agent One's notice (INV-11, AGT-15, FLD-13).
- The supplementary inventory after adoption (INV-15).
- Outside evidence: the scheduled-property rider and prior appraisals matched line by line, and the record of what was removed before entry (RT-07).
- Papers found on site, as a third Found on site kind with a receipt to counsel (RT-08).
- Closes: INV-06, INV-11, AGT-15, FLD-13, INV-15, RT-07, RT-08.

### Phase 4: the concierge's evening, approvals and living jobs (about 9 build days)

**P26. One round trip for approvals.** The DocuSign half is built (26 October, backend 2026-10-26c, on your "Yes, build it next"). Reduced to what it owes and what it left · M, one session, after P5.
- **Owed now, by you:**
  - the 2026-10-26c redeploy (it carries 2026-10-26b). Until it lands the card offers only **Send request**;
  - then one sandbox envelope to two of your own addresses, checking that the initials boxes land on their places, that each signer's own signing time comes back, and that the combined copy carries every initial. Production only after that.
- **What the build left, each still open:**
  - an approval tied to what it approved once recorded, by either route: after completion a re-routed line stays approved and is offered for sign-out (P5; built 27 Oct);
  - a value moved while the envelope is out is recorded at the new figure with no notice (Ask 5; built 27 Oct in P5: past the rule it is left unrecorded and named);
  - a strike: a fiduciary signs the whole envelope or declines it, so a struck line is not recorded as a decline (EST-05), and on the hand route **Record the signed request** still records no strike and asks nothing about initials (REL-10; neither rechecked);
  - the DocuSign copy prints no review stamp (P10), and states values on the Contents and None tiers with group-only initials (P7);
  - the new action answers anyone holding the URL (P2);
  - a device whose copy predates an envelope can still send, and its record wins the merge (P18);
  - the iPad for a fiduciary standing in the house (Ask 28);
  - a corporate trustee's signing officer and title recorded, and a representative with no fiduciary role flagged (EST-18);
  - what the request shows: the sale-to-a-fiduciary caution, partial staff names, property outside the probate estate in its own section (counsel), and an optional offer or reserve (Ask 29, Ask 30);
  - on a pour-over the envelope puts every fiduciary on every line (Ask 10).
- Closes: EST-19 (built). Still to close: REL-28, FLD-14, EST-05, REL-10, EST-16, EST-18, REL-09, DOC-10, DOC-16, REL-22.
- Saves: already won on the DocuSign route once it is deployed: one press to send and none to record or file, where a round cost 8 to 11 presses and days each way.
- Checks: the sandbox envelope above, with two signers, before production.

**P27. The night's read, the right lines first.** Freeze exception · L, two sessions. Rewritten on 27 October to Q106, Q107 and Q108: the read of the whole list is the review, so this pack orders it and never adds a tick.
- **Read mode**, opened from the work bar's read line and from the **Not reviewed** and **Unsure** chips, shows one line per screen with:
  - the large photograph and close-ups (a 1,200-pixel viewer; the server needs a size option);
  - name, count, category, condition, Each and Total, basis and identification grade, and where it goes;
  - Agent One's "Read:" and Agent Two's sales;
  - **Next**. A flagged line shows what its box names and takes its tick there; a line that stands takes none.

  Lines come flagged first, then *unsure* (Q108), then by value, so the lines that matter are seen first. The last screen is **✓ I've read the list** (Q107), with its own refusals.
- **A $500+ chip**, beside **Not reviewed** (which since 27 October gathers exactly the flagged lines) and **Unsure**.
- **The notes lists** fold to one line per kind.
- **A link straight to the Releases bar** on pickup day.
- **Faster selection:** Select all per room, and shift-click ranges.
- **Itemise** and **Combine**.
- **Approval chips** on estate jobs.
- Closes: ROW-12, ROW-27, AGT-11, ROW-24, ROW-11, NEW-15, ROW-29, INV-17, INV-19, NEW-16, REL-17. AGT-05 (confirming the confident lines in bulk) is answered by Q106: they stand with no tick.
- Saves:
  - folding a drawer goes from 13 presses to 3;
  - itemising a lot goes from about 30 presses to 2;
  - the first row, today 1,365 to 2,028 pixels down, comes to the top.
- Decide first: nothing. Ask 31 was answered by Q106 and Q108.

**P28. Fast, steady rows.** Fix if cheap · M.
- When a run lands under the cursor, the valuing line and the figures repaint.
- Group totals and the close-out count repaint.
- Each figure fits its column.
- **Reviewed**, the pick box and **Where it goes** repaint just their own row, with a test that the result matches a full redraw exactly.
- The notes carried off a removed photograph line are worked out once per paint, not per line (about a second a pass on a 600-line estate split drawer by drawer; found by the flagged-only build's own review).
- Closes: SYN-13, SYN-15, ROW-22, ROW-07, AGT-12, LIV-20, NEW-18.
- Saves: a tick, a selection, a ▾ or a destination change each takes about 0.9 s at 600 lines, and 2.5 to 4.3 s on a CPU slowed to stand in for an older iPad (measured). Since only flagged lines keep a tick (Q106), far fewer ticks are pressed than the 600 this figure first assumed; the saving is now mostly on selections, ▾ and destinations.
- Checks: a browser step times a tick at 600 lines.

**P29. Rows that stay put and explain themselves.** Fix if cheap · M.
- **A row whose destination changes stays put,** with its **Who takes it** box, until the next filter press.
- **Category and condition change in place** on the row, and condition shows there, so the night's read sees what the papers will print. It takes no tick of its own (Q106).
- **Tapping a chip unfolds its reason,** since an iPad has no hover. That includes the Reviewed box's *Needs a look* reasons, which since 27 October live in its tooltip.
- **Rows being valued say "valuing…"**, and a tick that a later figure does not cover says so on the row rather than vanishing (since 27 October a figure landing after a tick is not covered by it, by design). The list read already waits while an agent is at work (27 October). The recheck twice saw a box drawn ticked over a line that counts unchecked, after Agent Two re-valued a renamed line (not chased).
- **On a phone, More ▾ no longer covers ✓ I've read the list,** and closes once a paper opened from it is closed (found by the flagged-only build's own review).
- **Touch targets are 44 pixels** on touch screens, the Releases card included.
- **On the iPad, Each and Total share a cell,** so the name gets more room.
- Closes: ROW-06, ROW-16, ROW-15, NEW-11, ROW-14, AGT-04, ROW-19, NEW-12, ROW-21, REL-18, ROW-20.
- Saves: one scroll back of 3 to 10 screens per leaving line.
- Checks: a browser step at 1024 by 768, then a real iPad (headless Chromium cannot test touch).

**P30. Every leaving has its paper.** Fix if cheap; the iPad close-out papers need the freeze exception · M.
- **Junk loads** are signed on the glass, one sheet per load.
- **Pickups** are signed by a named person "for Kodner Galleries", with a For column and photographs.
- **The ledger, the Contents Record and adopted schedules** are signed on the iPad, with a copy emailed.
- **Donation papers** are dated from the signed sheet, and carry a $5,000 appraisal note and the goods-or-services sentence (counsel).
- **On living work, a large donation is flagged before it leaves.** A charity's group of similar items whose Havellin estimate exceeds $5,000 reads "a qualified appraisal is needed before it leaves if you will claim a deduction", and names the client's CPA as the one to decide. The attorney recalls a rule that the appraisal be made no earlier than 60 days before the gift; it is unconfirmed here, so counsel confirms it (RT-13).
- **iPad sign-outs** to a person or a charity write their custody event.
- **The living plan's line** says "named on everything leaving".
- Closes: EST-17, REL-14, EST-11, REL-23, VAL-22, LIV-09, LIV-10, NEW-09, REL-21, RT-13.
- Saves: print, sign, photograph and file per close-out paper becomes one signature.
- Decide first: Ask 32.

**P31. Appraisals and sales without retyping.** Freeze exception · L, two sessions.
- **Read the report** sits beside **File the report**. The agent matches item numbers and proposes each figure with its date, standard and credential, and the concierge confirms once.
- **Read it** works on a filed settlement statement too, with a phone layout of one lot per row.
- **Link to appraiser…** works across a selection.
- Closes: VAL-18, VAL-19, VAL-20.
- Saves:
  - N typed figures per report become 1 confirm;
  - 120 typed numbers for a 60-lot statement go;
  - 40 selects to link 40 lines become 3.

**P32. Living jobs: the rest.** Fix if cheap; three items need you · M.
- **Proceeds statements** on Home Transition and Home Editing.
- **The ledger card** says nobody signs it on living work, and the Contents Record card gets **Print**.
- **The desk uses the camera's words and order.**
- **A Move row** shows the new home's address as text.
- **Consign** takes the confirmed auction house.
- **The person the crew names** ("going to Karen") is matched against the roster and filled in "from the field note", confirmed by the tick.
- **Who acts for the client:** a guardian or an agent under a power of attorney, per Ask 35 (RT-23).
- Closes: LIV-04, LIV-12, NEW-13, LIV-14, ROW-28, NEW-25, LIV-15, ROW-23, LIV-24, AGT-14, FLD-03, FLD-12, FLD-16, LIV-19, RT-23 (per Ask 35).
- Decide first: Ask 33, Ask 34, Ask 35.

**P33. Words that match the app.** Fix if cheap · S.
- The confirms beside **Name N shots**, **Check N rooms**, **Value N lines** and **Re-value**.
- The playbook's stop box and its chip list.
- *The Evening Desk* on Agent Two's notes, waiting for values, "nothing to list", any rename re-valuing, the package button, and what the room check actually reaches.
- "Shoot the pile".
- Bar colours: red only where something needs doing now.
- Closes: AGT-09, LIV-17, NEW-10, ACC-24, VAL-23, AGT-18, NEW-22, NEW-21, INV-22, ROW-25, FLD-15, NEW-06, NEW-17.
- Each earlier pack updates the words it changes; this pack takes what is left.

## 5. Questions for Anthony

One at a time, in the order the build needs them. The recommended answer comes first.

**Ask 1. Which packs do you want built now, under the freeze?**
- ✓ **Answered 27 October:** Phases 1 and 2 now, under the triage bar, with P17 the one exception; Phase 3 waits, and you are asked before any of it.
- Phases 1 and 2 now under the triage bar, with P17 as the one exception; Phase 3 as an exception; the rest after the scripted runs pass (Recommended)
- Everything now, as with the desk (Q88)
- Phases 1 and 2 only, until the scripted runs pass

Why: the papers have to be true before more goes out for signature. The DocuSign route is already built (26 October), and P5 is what makes its approvals hold once recorded.

**Ask 2. Pin the agents' model while we measure them?** (P3; revisits 2026-10-26's automatic upgrade)
- ✓ **Moot, 27 October:** nothing that scores the agents is built (Ask 3), so nothing is pinned; the agents keep moving to the newest model (the 2026-10-26 rule).
- Pin it now to the model that answered the 26 October probes; a newer model takes over only once it scores at least as well (Recommended)
- Keep upgrading at once, as now, and score afterwards
- Pin it until you say otherwise

Why: scores taken on different models cannot be compared, and a worse model would go live unseen.

**Ask 3. Who settles the truth the agents are scored against?** (P3)
- ✓ **Answered 27 October, none of the three:** *"let's not score the agents at this point. this is supposed to be helping us. we are not paying a appraiser to identify the whole mock set of values. stop with this line of upgrading."* P3 is dropped.
- Split it: you and Ashley settle what each item is from its evidence (the mark, a reference page) and its count; values are scored only against real sales and independent appraisals (Recommended)
- Pay an appraiser for the whole Ellison set, identity and value
- You and Ashley settle identity and value, as first proposed

Why: a value Havellin sets measures how often the agents agree with Havellin, not with the market.

**Ask 4. A living client's own firearm going to the new home: who carries it?** (P4; LIV-05) **Answered 2026-10-27:** *"it's always safer for the client just to take it, but I'm not going to mandate that they take it in a locked case. I mean, they can put it in their trunk ... They put it in a backpack in their trunk. There's nothing wrong with that."*
- The client, in a locked case; Havellin and the movers never touch it; counsel words the protocol (Recommended)
- A licensed dealer transfers it, as on an estate
- Held until there is written authority, as on an estate

Why: the protocol covers only a deceased owner's firearms.

**Ask 5. When an approved line's value changes, when does it go back for approval?** (P5)
- When it crosses $500 or the appraisal threshold, or rises more than 25% (Recommended)
- Any change at all
- Only when it crosses $500 or the threshold
- Never; only the destination and the taker count

Why: a fiduciary who approved $2,400 did not approve $24,000. The DocuSign build treats a value moved while the envelope is out as no change, so your answer sets both routes.

**Answered 27 October:** *"When the value crosses $500 or the appraisal threshold, or rises more than 25%"*; *"Someone who approved $2,400 did not approve $24,000."* Built in P5, on both routes.

**Ask 6. Answered on 26 October (Q109).** A Court Inventory or Trust Schedule stays FINAL whether or not the list has been read; its value pill is bronze until it is. Nothing to ask. P8's open double count is a different reason, and still a proposal.

**Ask 7. An appraisal figure typed in before the report is filed: FINAL?** (P7; VAL-05)
- FINAL with "report to follow" on the line and above the signatures, except on a Form 706 estate, where the line reads "appraisal figure recorded; report not filed" and the 706 readiness list names it until it is filed (Recommended)
- DRAFT until the report is filed
- FINAL with "report to follow" everywhere

Why: Q93 made a missing report a flag, never a block; on a 706 estate the sworn appraisal itself goes with the return.

**Ask 8. A figure the concierge types: what basis prints?** (P10; DOC-09; revisits the 2026-10-08 rule)
- ✓ **Answered 28 October:** the one-tap reason as recommended: a reason picked as the figure is typed (a sale's link, Havellin's own sale, the going rate, a condition adjustment, an appraiser's verbal opinion), the person's name beside it; left unpicked, *Havellin estimate (staff)* under $500 and *basis not stated* in amber at $500 or more.
- A one-tap reason as the figure is typed (a sale's link, Havellin's own sale, the going rate, a condition adjustment, an appraiser's verbal opinion), with the person's name beside it. Left unpicked, it reads "Havellin estimate (staff)" under $500 and "basis not stated" in amber at $500 or more (Recommended)
- Always write "Havellin estimate · <name>" automatically
- "Not stated" in red until a reason is picked, with the new picker
- As now

Why: a name says who, not how, and §733.604(3) entitles a beneficiary to how (both reviewers). Q105 made a typed figure your look; this asks only what its basis says.

**Ask 9. On a pour-over estate, were the household contents assigned to the trust?** (P11; GAP2-04; revisits the Probate default)
- ✓ **Answered 28 October:** ask once at intake on Both, as recommended: Yes puts untracked lines on the Trust Schedule, No keeps them on the Court Inventory, Not known keeps them there with a DRAFT reason on both schedules until counsel confirms.
- Ask once at intake on Both: Yes, No or Not known. Yes puts untracked lines on the Trust Schedule. Not known keeps them on the Court Inventory, with a DRAFT reason on both schedules until counsel confirms (Recommended)
- Keep the Probate default; add only **Set track…** and an amber flag on the Court Inventory card
- As now

Why: many Palm Beach trust plans assign the contents to the trust, and today the whole house goes on an adopted §733.604 schedule. Counsel confirms the default reading.

**Ask 10. On a pour-over, must every fiduciary approve every line?** (P11, P26; GAP2-05; revisits P19's "every fiduciary approves")
- ✓ **Answered 28 October:** signers follow the track, as recommended: estate lines need the personal representatives, trust lines the trustees, two sections on the request and the ledger, and the DocuSign envelope to the right people for each; counsel confirms.
- Signers follow the track: estate lines need the PR and co-PRs, trust lines the trustees, with two sections on the request and the ledger; counsel confirms (Recommended)
- Every fiduciary on every line, but each line labelled with its holder, and a co-trustee called a co-trustee
- As now

Why: a corporate co-trustee approving the estate's donations can hold a pickup for weeks, and the paper says one fiduciary approved property outside their authority. The DocuSign envelope built on 26 October puts every fiduciary on every line, so your answer sets the envelope too.

**Ask 11. On a pour-over, record the trustee's own paper as well as the Letters?** (P11; GAP2-10; revisits estateAuthority on Both)
- ✓ **Answered 28 October:** record both, as recommended: a Certification of Trust chip beside the Letters on Both, and an amber flag on the Releases bar while a trust line leaves without it; never an activation gate.
- Yes: a Certification of Trust chip beside the Letters, and a flag on the Releases bar while a trust line leaves without it; never an activation gate (Recommended)
- Drop the Before Day 1 box on Both
- As now

Why: the plan asks the concierge to tick "read" for a paper the app never asks for or shows.

**Ask 12. A Disposition Ledger or Contents Record still marked IN PROGRESS: what does the sign-off say?** (P12; DOC-27, LIV-03)
- ✓ **Answered 28 October:** words that fit its state, as recommended: *approved as the record to date* while IN PROGRESS, *the final record* once every flagged line is checked and the list is read.
- Words that fit its state: "approved as the record to date" (Recommended)
- Withhold the sign-off until every flagged line is checked and the list is read; the page still prints
- As now: "the final record"

Why: a family signs a "final record" on what is still a working copy. Since 27 October the stamp above it says how many stood and whether the list was read, but the sign-off under it still says "the final record".

**Ask 13. An item that left before every fiduciary signed: what does the ledger say?** (P12; DOC-11; wording to counsel)
- ✓ **Answered 28 October:** print the gap, and the representatives' signature on the ledger at close ratifies it (a sentence above the sign-off, counsel words it). Anthony asked first whether this meant a DocuSign envelope for every release or ratification: no. One release request per round carries every line ready to leave and every line owed a ratification, in one envelope to every representative; the ledger, which each signs once at close anyway, is the backstop. Nothing adds an envelope.
- Print the gap, with a ratification sentence above the sign-off (Recommended)
- Withhold the sign-off until the ratification is recorded

Why: today it reads "Authorized by —" with no explanation.

**Ask 14. A WorthPoint sale far from the line's figure: what happens?** (P15; ACC-04; revisits the 2026-10-06 rule)
- ✓ **Answered 28 October:** ask once when the sale and the line's figure differ by more than 15%, as recommended: use the sale, or keep the figure and file the sale only.
- Ask once when they differ by more than 15%: use the sale, or keep the figure and file the sale only (Recommended)
- Always replace the figure with the sale
- As now: the figure is relabelled "WorthPoint comps"

Why: a $1,100 sale relabelled a $4,200 figure as if the sale supported it.

**Ask 15. "Receipt owed" while the item is still in the house?** (P16; REL-20, NEW-24; revisits P19)
- ✓ **Answered 28 October:** grey *ready to sign out* while the item is still in the house, amber *receipt owed* once it has left without a signed receipt, as recommended.
- Grey "ready to sign out" until it leaves, then amber "receipt owed" (Recommended)
- As now

Why: a flag that cannot be cleared tonight teaches the concierge to ignore flags.

**Ask 16. How do the papers say the estimates were researched with AI help?** (P17; ACC-08, DOC-23; counsel words it)
- One plain sentence on every valued paper, a methodology page, and the engagement term, all in counsel's words (Recommended)
- The engagement term and the methodology page only; the filed schedule says "Havellin's estimates"
- Leave the wording on the filed schedule entirely to counsel

Why: in both reviewers' judgement a fiduciary must know the method to review it (§736.0807), ASA recommends naming AI where it was relied on (R2 B [S]), and concealment found later costs more than disclosure.

**Ask 17. Who signs the preparer's statement on each schedule?** (P17; RT-03)
- You or Ashley, named, once per schedule before it can read FINAL (Recommended)
- The job's concierge
- Nobody named: "Prepared by Havellin Palm Beach, LLC", as now

Why: in a contested matter counsel needs a person who can explain the numbers, and one sign-off per paper stays "one paper per batch".

**Ask 18. Referral fees from the channels that sell estate property?** (P17, P21; RT-04; revisits Q62)
- Waive them on estate and trust jobs, and say so on the valued papers (Recommended)
- Credit each one to the estate or trust, shown on the ledger
- Keep them, recording each fee's amount per job and printing it on the ledger and every valued paper
- As now: the vendors named on the ledger and the Contents Record, with no amounts

Why: Havellin values the line, picks the channel and is paid by it, which is the *Kollsman* pattern both reviewers flag; waived, it becomes the clearest difference from an auction house's appraisal.

**Ask 19. Retain an independent appraiser to review each values-tier estate?** (P17, P23; RT-15; costs money)
- Yes: one or two ASA or ISA appraisers with no consignment, buying or referral ties, reviewing a random sample and every line over $1,000, priced as their own vendor line on the estimate (Q20) (Recommended)
- Only when counsel or the trustee asks
- No: Havellin's estimates, with appraisers by threshold as now

Why: both reviewers name this as the change that would make a trust attorney switch firms. The agents carry the nine-tenths, and the appraiser signs the valuable tenth.

**Ask 20. A tape, a gram scale and a loupe in the kit, with the crew saying size and weight aloud?** (P19, P22; ACC-16)
- Yes, for art, rugs, silver and jewelry only, with "weighted" or "hollow handles" said for silver (Recommended)
- Size only, no weighing
- No

Why: size and weight set the value of those classes; for everything else they add little.

**Ask 21. On a values tier, should the ledger carry each line's inventory value beside what it brought?** (P21; EST-15)
- Yes: the inventory value and its basis beside the gross, fees and net; gain or loss is left to the accountant (Recommended)
- Ask counsel first
- No

Why: both figures are already held, and a trust accounting asks for both (R1 B2 [P]); only a gain-or-loss column moves toward accounting.

**Ask 22. When Agent Two reads a line differently from a name a person typed or ticked?** (P22; GAP1-01; revisits 2026-10-25b)
- Show Agent Two's reading and what identified it in the line's record, with one press, **Use this name**; the name and the papers stay as they are until it is pressed (Recommended)
- Reopen the line and rename it, keeping the old name in the record
- Nothing, as now

Why: on Ellison your tick on "Italian" kept Agent Two from correcting it five times over, and the FINAL Trust Schedule still says Italian. Since 27 October #73, rebuilt from its record, needs no tick, but its box still takes one, and a press there or **Mark reviewed** locks the name just the same.

**Ask 23. When should a valued line go back to research by itself?** (P22, P27; AGT-07, LIV-07, ROW-26, ACC-23; revisits 2026-10-25b)
- When the name gains a maker, brand or model, when the line is intrinsic or ticked for appraisal, or when a set's count changes; a spelling fix re-values at the line's own depth (Recommended)
- As now: any name change goes to research
- Never on a rename

Why: thirty spelling fixes today send thirty research runs, each of which can move a figure the family has already seen.

**Ask 24. What goes to an appraiser whatever its figure?** (P23; RT-09, from R2 and both reviewers)
- On every job, before anything irreversible: signed fine art, fine jewelry (tested), luxury watches and handbags, Asian works of art, bronzes and attributed period antiques (Recommended)
- The same classes, on estates only
- Signed art, designer jewelry, watches and named makers, on estates (the draft's list)
- Only above the threshold, as now

Why: models are near chance at telling genuine from close copies (R2 D.1), "named makers" sweeps in every Pottery Barn lamp, and a living client's loss on a sale or a donation is Havellin's to explain.

**Ask 25. Which price data do we pay for first?** (P23; ACC-22)
- Apply for eBay's sold-items access and a spot-metal feed now; decide the rest after the first scores (Recommended)
- Add an art database now as well (Artnet business, or LiveArt)
- None until the first real estate

Why: the open web is thin on sold everyday goods. Five tries on the Ellison pattern found no sale anywhere; eBay's sold data is the only listed source that would have.

**Ask 26. Should the agents look for things photographed but never listed?** (P23, P25; AGT-16, INV-23 partly revisit 2026-09-30)
- Test both checks on the Ellison house first, then decide (Recommended)
- Yes: the room check names things in frame that no line names (Items photographs only)
- Yes, and also read the as-found photographs, as a flag only
- No

Why: a missed armoire is exactly what an attorney's own walk-through finds.

**Ask 27. Pay for a head-to-head between the agents and independent appraisers?** (P3, P23; RT-17; costs money)
- Yes: two appraisers value the same 150 to 200 field-photographed lines from the same photographs and notes, one also values a sample in person, and all are scored against realised prices (Recommended)
- One appraiser, desktop only
- Not until the first live estates are scored

Why: "better than a twenty-year appraiser" needs the appraisers' own error beside the agents'.

**Ask 28. Should a fiduciary standing in the house be able to sign the release on the iPad?** (P26; FLD-14)
- Yes, beside DocuSign: an initial per group and a signature each (Recommended)
- DocuSign only

Why: when the representative is on site, the release takes minutes instead of days.

**Ask 29. Which conflicts should the release request flag?** (P26; REL-09, DOC-10, REL-22; counsel words it)
- A sale to a co-representative or co-trustee, and junk or donations going to someone who works with Havellin (Recommended)
- The sale to a co-representative only
- As now

Why: a sale to a fiduciary is the self-dealing case under §733.610 [P].

**Ask 30. Should a sale on the request show its price?** (P26; EST-16)
- An optional offer or reserve, typed in or proposed by Agent Two (Recommended)
- No

Why: a trust officer approves a sale on its price.

**Ask 31. Answered on 26 October (Q106, Q108).** An unsure line needs no tick unless both agents guessed: the hint is a cue for the night's read, and a tick or your own figure takes it. **Mark reviewed** already names the unsure lines it swept. Nothing to ask.

**Ask 32. The iPad donation sheet: does it count as the charity's receipt?** (P30; NEW-08, LIV-10; revisits P28)
- Record it as "picked up by Goodwill"; the charity's own receipt is still owed (Recommended)
- Keep it as the receipt, adding the goods-or-services sentence (counsel)
- As now

Why: a deduction needs the charity's own acknowledgment carrying that sentence (R1 B5 [S]).

**Ask 33. Two auction houses or two charities confirmed: one camera chip for each?** (P32; FLD-12)
- Yes, one chip per confirmed vendor, never on a firearm (Recommended)
- One chip, with the vendor named at the desk

Why: the crew sorts the piles separately, and today every line says "name one".

**Ask 34. On a Home Transition, record which room in the new home each item goes to, and print a move list?** (P32; FLD-16, LIV-19)
- Yes: a short room list typed once, and a chip in the camera (Recommended)
- At the desk only, not in the camera
- No

Why: the movers, the family and any damage claim get one list with photographs and values.

**Ask 35. When a guardian or an agent under a power of attorney acts for a living client?** (P32; RT-23; counsel confirms the Chapter 744 duties)
- Ask at intake who acts for the client; where it is not the client, the written-release path and the values papers apply as on an estate (Recommended)
- Only for a court-appointed guardian
- No change: the client's word stands, as decided on 2026-10-26

Why: in the appraiser's and trust officer's judgement a guardian's or agent's word is not the client's, and a guardian files their own inventory (unverified here).

## 6. What works and should stay

**The agents and the desk**
- One press of **Name N shots** names, room-checks and values. Partial answers resume by themselves, and a naming call that fails part way still hands on the lines it named.
- A run's redraw waits until you leave the box you are typing in.
- Agent Two never writes over a figure a person or an appraiser recorded, and a name a person typed comes back as typed. The $250-an-article ceiling sends lots to research within the same run.
- The evidence guard: a comparable counts only if a tool returned its page, and eBay search and browse pages and sales with no price never count (it rejected every eBay search page the Ellison runs cited). A researched line with no sale left is low confidence and *General estimate*.
- Agent One states only what it can read, hedges the rest, keeps people's names out, and has clear background and drawer rules. On Ellison it said the blurred close-up "could not be read" rather than guess a maker.
- Given the photograph, Agent Two identified the Ellison pattern correctly 5 times out of 5. It never invented a mark, and told the desk what to look for on the back.
- The room check found the plates' underside shot on its own line and paired it with the plates.
- "One photograph named twice" caught the double reading of the stacks photograph.
- Agent Two's request has no destination or recipient field. The crew's note can still name one (see 3(e)).
- Item numbers are never reissued, and **Restore** brings a line back under its old number. Removal is a tombstone: every removed Ellison china line still holds its photograph and both agents' reads, so the salad plates can be restored.
- Keep the night's read as the review (Q106, Q107): one press for the whole list, and a tick only where the app flags something. A tick never settles an unnamed line or an open double (built 27 October; rechecked). Nothing in this plan adds a tick or a tier.

**Approvals, releases and sign-out**
- **Send request** is one press, reads as a letter in the matter's own words, and copies counsel. On an estate it now goes through DocuSign, and a line re-routed while the envelope is out is left unrecorded and named (rechecked on 7abc836).
- Partial approval and ratification read honestly everywhere. Grouped initials kept a 52-line request to 2 group rows, 8 own boxes and one firearms initial. A partial approval on a pour-over is recorded and named, never refused.
- On an estate the staff rule refuses at the write. Lines with nobody named are held off the request. The living narrowing works: only the firearm and the line going to a Havellin person needed writing.
- Sign-out on the glass offers only approved lines, refuses a mere tap, and files its PDF.

**The schedules and the package**
- The schedules refuse FINAL while a line is unvalued or an appraisal is pending, name the gaps by number, and call a floor a floor. The wrong instrument says so on its face.
- On a pour-over the arithmetic holds: Court Inventory $13,518 + Trust Schedule $3,650 + $4,100 outside both = the desk's $21,268. No line sits on both schedules, and each schedule counts what it left out.
- The Form 706 aggregate reads the whole gross estate and says so. The lot rule fires correctly on the worklist. The Form 706 date is computed and firm.
- The package is one press and one confirm naming the gaps. It is refused before activation, shares both photograph folders, and on Both carries both instruments.
- Proceeds reconcile to the cent, and the ledger links each filed receipt.
- The Q93 appraisal flow: typing the report's figure records the appraiser, and **File the report** clears its flag at once.

**The field**
- The camera stays open through repaints.
- A spoken note lands on the right shot, and a note said over a close-up lands on the item.
- One confirmed vendor fills the recipient.
- A collection chip fills its own line.

**Data and screens**
- A single-client write never clears anything.
- The orphan sweep stands down while the Jobs tab is empty, so the stores stay recoverable until a client exists again.
- A device that reloads posts nothing before the sheet answers, so reloading the device that pressed Snapshot cannot wipe the tab again.
- Once the rows are back with their own ids, the ledger needs nothing, and `previewDeletedJobs()` diagnoses a wipe in one run.
- On one device every surface agrees (9 items and $8,230 on six surfaces). The bars honour "loading…" and "sheet unreachable". Sends read the sheet first.
- No horizontal overflow at 1440, 1024 or 390 px, and no page errors in any run.

## 7. Appendix

### A. Every finding

Verdicts: **C** confirmed; **P** plausible (kept, and marked); **DC** conflicts with a decided rule (a question only, never a build); **DK** duplicate of a known item that showed new impact; **RT** a red-team point, professional judgement, kept where grounded (where it rests on a code fact, the fact was checked).

Severity is the verifier's re-rating, or the reviewer's for RT rows. Pack is one of:
- the pack that fixes it;
- "Ask N", for a decided rule put to you as a question;
- "counsel", for the bundle;
- "not built".

"6, 18" means contained by P6 and fixed by P18. Code is the first function or constant named in the finding, for the build session. Findings that were merged across lenses carry the same pack. Pack numbers are this plan's; the draft's P1 to P28 were renumbered in build order.

**Recheck** is the run of 27 October on main at 7abc836, after the flagged-only review (Q99 to Q109) and the DocuSign request (2026-10-26c) landed. Only the fix-now findings were rechecked, 104 of them: *still*, *fixed*, or *changed* (part of the finding left, as Fix now says), with *wider* or *worse* where the reach grew. A blank cell was not rechecked on the new main. Where tonight's builds settled a finding's pack, the Pack column says so (*built 27 Oct*, *built 26 Oct*, *decided (Q…)*); nothing was renumbered.

|Id|Kind|Sev|Ver|Recheck|Finding (shortened)|Pack|Code|
|---|---|---|---|---|---|---|---|
|EST-01|defect|fix-now|C|still|A written approval is not tied to what it approved: changing destination…|5 · built 27 Oct|invApprovalComplete|
|EST-02|defect|fix-now|C|still; fixed P4|A firearm set to Donate or Junk is 'Cleared to carry' to the charity or hauler…|4|_invFirearmPanelHtml|
|EST-03|accuracy|med|DC||The Court Inventory and Trust Schedule go FINAL, with an adoption block, over…|decided (Q109)|printCourtInventory|
|EST-04|accuracy|high|C|still|The Release Approval Request carries unreviewed agent names and values with no…|10|printApprovalRequest|
|EST-05|gap|high|C||A line a fiduciary strikes is not recorded: it returns unchanged on the next…|26|invRecordApproval|
|EST-06|accuracy|high|C|still|Photographs on the papers come from a capped device cache (124 of 300); no…|13|_invPrintThumb|
|EST-07|gap|med|C||The estate package never shows counsel the signed papers: approvals, pickup…|24|_pkgShareFolders|
|EST-08|gap|high|C||The valuation support (comparables, method, confidence, who reviewed) never…|17|printEstateInventoryReport|
|EST-09|accuracy|med|C|still|'Nothing to list' lines stay inventory items on every paper and keep the Court…|9|agentConf|
|EST-10|gap|med|C||The desk cannot send the inventory itself to the fiduciary or counsel; there is…|24|probatePackageCardHtml|
|EST-11|accuracy|med|C||The vendor pickup sheet is 'Signed by: Kodner Galleries' with no person's name…|30|openSignoutDialog|
|EST-12|inconsistency|med|C||Same-day signatures merge into one act: the header overstates who approved, and…|16|invApprovalBatches|
|EST-13|gap|med|C|still|The Disposition Ledger's signed copy records no signer, so one signature passes…|12|signedCopyControlHtml|
|EST-14|gap|med|C|still|Closing an estate does not name outstanding release paperwork (approvals…|12|closeOpenWorkFlag|
|EST-15|gap|low|C||On a values tier the Disposition Ledger carries no carrying value or gain/loss…|Ask 21, then 21|printDispositionLedger|
|EST-16|gap|med|C||Fiduciaries approve a sale with no price: there is no offer or reserve on a…|26|printApprovalRequest|
|EST-17|gap|low|C||Junk lines on an estate need written approval but have no sign-out, so nothing…|30|signoutLineKind|
|EST-18|accuracy|med|C||The approver can be someone with no fiduciary standing, and a corporate trustee…|26|EXECUTOR_ROLES|
|EST-19|automation|med|DK||To get a 40-line, two-fiduciary approval done in one round: the planned…|built 26 Oct (2026-10-26c)||
|EST-20|inconsistency|low|DK||The Trust Schedule is offered and prints 'Held in Trust' on probate-only…|14|printTrustSchedule|
|EST-21|inconsistency|low|C||Close-out ledger card says 'the client signs' on an estate|16||
|EST-22|inconsistency|low|C||The request email uses the build's word 'lines' where the paper says 'items'|16|_approvalEmailParas|
|REL-01|accuracy|fix-now|C|still|An approval stays recorded after the line's destination, recipient or value…|5 · built 27 Oct|invApprovalComplete|
|REL-02|defect|high|C|still|A line changed after the request was confirmed as sent is recorded as approved…|5 · built 27 Oct|approvalRequestChanged|
|REL-03|defect|fix-now|C|still; fixed P4|Havellin's beneficiary receipt prints a firearm as 'delivered to me by Havellin'|4|invReceiptGroups|
|REL-04|gap|high|C|still; fixed P4|The Chain of custody dialog records a held firearm as 'Released' to a relative…|4|addCustodyEvent|
|REL-05|accuracy|med|C|still|A name typed into Authorized By counts as written approval: the sign-out opens…|5 · built 27 Oct|_invEdit|
|REL-06|inconsistency|high|C|still|An item recorded as with the appraiser can be signed out to a beneficiary; it…|16|signoutGroups|
|REL-07|defect|high|C|still|The bulk bar's request and Record approval on an estate take Keep and…|5 · built 27 Oct|invWrittenReleasePicked|
|REL-08|gap|high|C|still|The Disposition Ledger and the close question say nothing about lines that left…|12|dispositionLedger|
|REL-09|accuracy|med|C||A co-trustee or co-representative receiving an item approves their own…|26|INV_RELEASE_CAUTIONS|
|REL-10|gap|med|C||Record the signed request never asks about the initials the paper asks for|26|invRecordApproval|
|REL-11|inconsistency|med|C||A co-representative recorded after a request went out is offered as a signer of…|16|approvalRequestCardHtml|
|REL-12|inconsistency|med|C||The dashboard's request card confirms a changed draft with no warning and no…|16|approvalRequestDashHtml|
|REL-13|inconsistency|med|C||A line that left without approval cannot have its vendor's pickup paper filed…|16|_leavingRowHtml|
|REL-14|gap|med|C||A Junk line on an estate has no sign-out row or paper: the hauler takes estate…|30|signoutLineKind|
|REL-15|gap|med|C|still; fixed P4|Firearms sold to a dealer, and any firearm on living work, have nowhere to file…|4|leavingGroups|
|REL-16|friction|med|C||Row chips do not repaint when a recipient, a disposition date or an approval is…|16|_invEdit|
|REL-17|friction|low|C||No row mark or filter for approval state on a 300-line estate|27|INV_WORK_FLAGS|
|REL-18|friction|med|C||On an iPad in landscape the Sign out and Void buttons are 21 px and 15 px tall|29|signedRecordLinksHtml|
|REL-19|inconsistency|low|C||The card counts ratification lines as 'await written approval' while the bar…|16|approvalRequestCardHtml|
|REL-20|inconsistency|low|DC||'Released to … no signed receipt' and 'receipt owed' appear the moment a line…|Ask 15|invReleasedToPerson|
|REL-21|docs|low|C||On living work the Job Plan's line is green and says 'everything that left'…|30||
|REL-22|gap|low|C||The staff rule matches whole names only, and a Junk line to a staff member…|26|invHavellinRecipient|
|REL-23|accuracy|low|C||The vendor's pickup sheet records the firm as the signer, not the person who…|30|openSignoutDialog|
|REL-24|accuracy|low|C||A custody event is removed with one tap on ✗, with no confirm and no reason|16|removeCustodyEvent|
|REL-25|friction|low|C||Removing a line that is matched to a bequest and sitting on a sent request asks…|16|invRemoveLine|
|REL-26|accuracy|low|C||Record approval accepts any date, including a future date or one before the…|5 · built 27 Oct|invSaveApproval|
|REL-27|docs|low|C||Smaller wording problems around approvals|16|_renderInvReleasesCard|
|REL-28|automation|low|C||Let the app read the signed request back from its photograph|26||
|VAL-01|defect|fix-now|C|still|One inventory snapshot of a full house pushes the job past the Sheets cell…|1 · built 27 Oct|takeInventorySnapshot|
|VAL-02|accuracy|high|C|still|Setting Valuation Source to 'Appraisal' turns Agent Two's guess into an…|7|_invBulkApply|
|VAL-03|inconsistency|high|C|still|On Contents and None tiers the Release Approval Request states values Havellin…|7|printApprovalRequest|
|VAL-04|accuracy|med|C||A Standard estate's Court Inventory goes FINAL while an appraisal the desk…|7|printCourtInventory|
|VAL-05|accuracy|med|C||Typing an appraisal figure makes the schedule FINAL while the report is not on…|7|printCourtInventory|
|VAL-06|accuracy|high|C|still|Agent Two's 'Appraisal advised' is silenced by the review tick and never…|15|_avNoticeKinds|
|VAL-07|accuracy|med|C||A figure the concierge types over Agent Two's prints 'not stated' in red, and…|10|_avTakeValue|
|VAL-08|accuracy|med|C|still|A probate schedule can be stated at Liquidation or Replacement Value, silently…|15|_renderValueSettings|
|VAL-09|accuracy|med|C|still|The §2032 date and the appraisers' value dates do not follow the job|15|setEstateAVD|
|VAL-10|gap|med|C||What a line sold for is never compared with its inventory value|21|proceedsReconciliation|
|VAL-11|inconsistency|high|C|still|The appraiser's packet leaves out lines linked to them; the hand-off sheet…|15|printAppraisalWorklist|
|VAL-12|gap|high|C||No paper shows the evidence or who stands behind a value|17|valComps|
|VAL-13|accuracy|med|C|still|The Court Inventory and Trust Schedule carry no item numbers|13|_invScheduleSection|
|VAL-14|gap|med|C|still|Close job asks about the midpoint and the ledger but not about the inventory…|12|applyJobTransition|
|VAL-15|inconsistency|med|C||The Court Inventory says FINAL while the Estate Inventory Report of the same…|decided (Q109)|printCourtInventory|
|VAL-16|gap|med|C||Waive records no who or when, cannot be undone, and never prints on the…|15|waiveAppraisal|
|VAL-17|gap|med|C|still|On Contents and None tiers no line can earn its own initial on the release…|7|invOwnInitial|
|VAL-18|automation|med|C||Appraisal reports are read and typed by hand; an agent could do it|31|_apprReportCellHtml|
|VAL-19|automation|med|C||Proceeds statements are typed lot by lot, and the phone layout shows little…|31|openProceedsStatement|
|VAL-20|friction|med|C||No way to link an appraiser across a selection|31||
|VAL-21|automation|low|C||Appraiser due dates are never chased, and the flag list prints a stale…|15|dueDate|
|VAL-22|automation|med|C||Close-out signatures are still print, sign, photograph, file|30|_renderLedgerCard|
|VAL-23|inconsistency|low|C||Agent Two's confirms say 'Nothing else on the line changes' but it rewrites…|33|agentValueRun|
|VAL-24|docs|low|C||Estate-only wording on living jobs: 'date of death' and 'reasonable estimates…|14|printAppraisalWorklist|
|VAL-25|inconsistency|low|DK||On a Contents-tier estate the Formal guardrail says appraisals are needed…|14|_renderAppraisalGuardrail|
|VAL-26|inconsistency|low|C||The Closing bar asks for an adopted Court Inventory while the schedule is still…|12|signedScheduleRows|
|VAL-27|inconsistency|low|C|still|The Estate Inventory Report presents a floor as the total|7|printEstateInventoryReport|
|VAL-28|accuracy|low|C||The release request and the Donation Record print unreviewed agent figures as…|10|_avUnreviewedStamp|
|VAL-29|inconsistency|low|C||Schedules say 'valued as a lot' and hide the per-article value the lot rule…|13|_invScheduleSection|
|VAL-30|friction|low|C||An appraiser picked from the directory with no contact prints the firm twice on…|14|_apprPickVendor|
|VAL-31|gap|med|C||A snapshot keeps too little to stand for the schedule it is labelled after|1 · built 27 Oct|_snapItemOf|
|ACC-01|accuracy|fix-now|C|still|A figure built on invented comparables is kept, and its basis sentence still…|7|_avLineResult|
|ACC-02|accuracy|fix-now|C|still|A FINAL, adoptable Court Inventory double counts a painting the room check…|8|printCourtInventory|
|ACC-03|accuracy|high|C|still|§20.2031-6(b) 'does not require an expert appraisal' is concluded from…|7|maivAggregate|
|ACC-04|accuracy|high|DC||Use a WorthPoint sale relabels Agent Two's figure as 'WorthPoint comps' even…|Ask 14|agentValueUseSale|
|ACC-05|gap|med|C||An appraiser's figure erases the agent's prediction, and a TC's correction…|3|_avTakeValue|
|ACC-06|gap|high|C||No measurement of the agents' accuracy, and the model upgrades itself with no…|3|testAgentIdentify|
|ACC-07|accuracy|high|C||The papers carry no evidence: comparables, dates, range, confidence, method and…|17|_invScheduleSection|
|ACC-08|inconsistency|med|C||The valued schedules never say who made the figures, or that they are estimates…|17|printApprovalRequest|
|ACC-09|accuracy|high|C|still|Changing the valuation basis relabels the schedule without revaluing, and the…|15|setValBasis|
|ACC-10|accuracy|high|C|still|The §2032 tick dates the schedule to a future day and leaves every line's date…|15|setEstateAVD|
|ACC-11|accuracy|med|C||Confidence is the model's own word: one old listing, or a comparable for a…|22|_avLineResult|
|ACC-12|accuracy|med|C||The standard of value in Agent Two's prompt says 'not retail' and is silent on…|15|_avSystem|
|ACC-13|friction|low|C||Review attention ignores the dollars at stake: a $20 box of books is 'unsure'…|22|invLineUnsure|
|ACC-14|automation|med|C||Every line gets the same shallow research and a single opinion, whatever it may…|23|agentValueMode|
|ACC-15|inconsistency|med|C|still|Agent Two reads the newest four close-ups while the field guide tells the crew…|7|invLineCloseUps|
|ACC-16|gap|med|C||The value drivers an appraiser records are never captured or sent: size…|22|_avItemPayload|
|ACC-17|automation|med|C||Agent One's 'mark too small to read' reaches only the evening desk, after the…|19|agentNotices|
|ACC-18|gap|med|C||Nothing learns from corrections, realised prices or the job's own confirmed…|22|_invEdit|
|ACC-19|accuracy|med|C||A figure does not record which model, prompt version or depth made it|3|agentValueLines|
|ACC-20|accuracy|med|C|still|The Court Inventory and Trust Schedule rows carry no item number, so the filed…|13|_invScheduleSection|
|ACC-21|accuracy|low|P||An ordinary batch of eight trusts the model's line labels: a swapped answer…|3|agentValueLines|
|ACC-22|gap|low|C||Agent Two's only evidence is the open web; licensed and Havellin-owned sources…|23|_avTools|
|ACC-23|accuracy|low|DC||Correcting the count on a researched set rescales linearly, and sets are not…|Ask 23|_invQtyCarriesValue|
|ACC-24|docs|low|C||The Value and Re-value confirmations promise 'researched against sold…|33|agentValueRun|
|DOC-01|accuracy|fix-now|C|still|Estate Inventory Report prints a 'total' that silently counts unvalued lines as…|7|printEstateInventoryReport|
|DOC-02|inconsistency|high|C|still|Exempt property is 'carved out of the probate estate' on the Report but 'listed…|14|printEstateInventoryReport|
|DOC-03|defect|high|C|still|On a full house only about 110 lines get a photograph on any paper, and the…|13|_invPrintThumb|
|DOC-04|accuracy|high|DC||A §733.604 or Chapter 736 schedule prints FINAL, with its adoption or receipt…|decided (Q109)|printCourtInventory|
|DOC-05|accuracy|high|C|still|The valued schedules give no item number, room or photograph per line, so a…|13|_invScheduleSection|
|DOC-06|accuracy|med|C|still|'Photographs are reference-numbered to the line items above' is false: file…|13|printEstateInventoryReport|
|DOC-07|defect|fix-now|C|still|The Appraisal Worklist tells the appraiser 'value as of date of death' on a…|14|printAppraisalWorklist|
|DOC-08|gap|high|C||The evidence behind a value never leaves the app: no comparables, range…|17|valComps|
|DOC-09|accuracy|med|DC||A figure the TC types prints 'not stated' in red on the court schedule, and the…|Ask 8|_avTakeValue|
|DOC-10|gap|med|C||Nothing flags a fiduciary receiving or buying estate or trust property|26|INV_RELEASE_CAUTIONS|
|DOC-11|accuracy|high|C|still|The ledger the PR signs 'as the final record' hides a release that left without…|12|printDispositionLedger|
|DOC-12|accuracy|med|C||The ledger says a line 'left the property with no recipient recorded' while the…|12|dispositionLedger|
|DOC-13|inconsistency|med|C|still|The schedules' signature lines print a fixed capacity: a Co-Trustee signs as…|12|scheduleSignLines|
|DOC-14|accuracy|med|C||Every value on a fiduciary's paper is unmarked as reviewed or not, so 'N values…|10|_avUnreviewedStamp|
|DOC-15|inconsistency|med|C||The request's footer says values are 'not appraisals unless an appraisal is…|10|printApprovalRequest|
|DOC-16|gap|med|C||Property outside the probate estate is put to the PRs for release, and onto the…|26|printApprovalRequest|
|DOC-17|inconsistency|low|C||Two inventory papers in one package with near-identical titles, different…|14|printCourtInventory|
|DOC-18|gap|med|C||The package goes out with no cover summary of what is open, and without the…|17|sendProbatePackage|
|DOC-19|automation|med|C|still|Photographs Agent One read as 'nothing to list' print as blank rows on the…|9|_jobInvRefs|
|DOC-20|inconsistency|low|C||The Appraisal Worklist, attached to every package, prints app instructions to…|14|printAppraisalWorklist|
|DOC-21|accuracy|med|C||The Report's Appraisal Flag List shows an appraisal 'expected back' after it…|7|printEstateInventoryReport|
|DOC-22|defect|med|C||The CSV handed to an attorney has an empty Net Proceeds column, UTC ISO…|7|_invExportValue|
|DOC-23|gap|med|C||No valuation methodology, standard definition or preparer statement on the…|17|printCourtInventory|
|DOC-24|friction|low|C||The Estate Inventory Report is long and hard to scan: 28 pages for 300 lines, a…|24|printEstateInventoryReport|
|DOC-25|accuracy|med|C||Grouped lots over $100 an article on a Form 706 estate are flagged only on the…|13|_invScheduleSection|
|DOC-26|gap|med|C||Marks and makers Agent One read off a photograph never reach a paper|24|agentBasis|
|DOC-27|inconsistency|med|C||Sign-off blocks are offered under an IN PROGRESS stamp that says values and…|12|printDispositionLedger|
|DOC-28|inconsistency|low|C||Trust-only packages still call the papers and folders 'Estate Inventory' and…|14|printEstateInventoryReport|
|INV-01|accuracy|fix-now|C|still|The Court Inventory and Trust Schedule print FINAL with adoption lines over a…|8|printCourtInventory|
|INV-02|defect|fix-now|C|still|One snapshot of a full house pushes the job record past the Jobs sheet's…|1 · built 27 Oct|takeInventorySnapshot|
|INV-03|accuracy|high|C|still|A walkthrough collection photographed as an ordinary item is on every paper…|8|collectionLinesEnsure|
|INV-04|defect|high|C|still|The walkthrough's vehicle Add makes a second line for a car already…|8|materializeVehicle|
|INV-05|accuracy|high|C|still|Not duplicates silences a line for good: a later real double of it is stamped…|8|agentNotDuplicate|
|INV-06|gap|high|C||No room-by-room completeness readout; a room with no lines disappears from the…|25|_invGroupItems|
|INV-07|defect|high|C|still|The package's gap question ignores unnamed lines: a house of 31 unnamed shots…|9|probatePackageGaps|
|INV-08|accuracy|med|C|still|A photograph Agent One found nothing in stays a live line: it prints as a blank…|9|agentApplyResult|
|INV-09|accuracy|med|C||On a Form 706 estate a mixed group at qty 1 escapes the $100 lot test, and the…|13|invLotSplitState|
|INV-10|accuracy|med|C|still|The Court Inventory and Trust Schedule carry no item number, room or photograph…|13|_invScheduleSection|
|INV-11|gap|med|C||Must-finds are ticked found without naming the item, and an unfound one is on…|25|toggleMustFound|
|INV-12|automation|med|C||The room check reads every photograph of a room with its lines, but is told not…|23|_arSystem|
|INV-13|accuracy|med|DK||KNOWN: the room check reads 38% of photo pairs in a 40-photo room, and the name…|23|_arWindows|
|INV-14|accuracy|med|C||A snapshot keeps only number, name, category, value and disposition, so a…|1 · built 27 Oct|_snapItemOf|
|INV-15|gap|med|C||Nothing records what the adopted Court Inventory covered or what has changed…|25|signedScheduleRows|
|INV-16|accuracy|low|C||Removals carry no reason, so the numbers on the Estate Inventory Report have…|13|_invTombstoneLine|
|INV-17|friction|med|C||Lots to split has no way to split a lot, and Agent One cannot help|27|INV_WORK_FLAGS|
|INV-18|inconsistency|low|C||A count in a name is never caught at the desk, and a corrected count then…|13|AGENT_COUNT_IN_NAME_RE|
|INV-19|friction|low|C||Folding an over-split drawer back into one group line takes 13 presses and a…|27|invBulkRemove|
|INV-20|inconsistency|low|C||The summary counts lines as items, and no paper or screen says how many…|13|_renderInventorySummary|
|INV-21|defect|low|C||The Use that line picker reads '#20 #20 Coin collection…'|8|_collPanelHtml|
|INV-22|docs|low|C||The playbook lists a Needs you count that is gone and leaves out three that…|33|CONCIERGE_GUIDE|
|INV-23|gap|low|DC||Nothing compares the as-found photographs with the list, the one check for a…|Ask 26|agentShotGroups|
|AGT-01|accuracy|fix-now|C|changed|Mark reviewed ticks 'nothing to list' lines, and the Estate Inventory prints…|9|invLineReviewed|
|AGT-02|accuracy|med|C||A photograph too dark to name is labelled 'nothing to list' and advised for…|9|agentApplyResult|
|AGT-03|accuracy|high|C|still, worse|'Not duplicates' makes a line immune to every later duplicate finding, while…|8|agentNotDuplicate|
|AGT-04|friction|med|C||Review cannot safely start until Agent Two finishes: earlier ticks are undone…|29|_avWrite|
|AGT-05|automation|high|C||No way to confirm the confident lines in bulk: a quarter need thought, they are…|answered (Q106)|INV_WORK_FLAGS|
|AGT-06|automation|high|C|still|Agent Two's 'Appraisal advised' and 'Worth a specialist' never reach the…|15|agentValueNotices|
|AGT-07|friction|med|DC||The TC's own small name fixes, and names typed onto blank lines, are sent to…|Ask 23|agentValueAfterRename|
|AGT-08|defect|low|C||A room of more than 160 photographs is stamped 'checked' although the server…|8|agentCheckRooms|
|AGT-09|inconsistency|med|C||Sentences beside the agents' buttons still describe the old pipeline (siblings…|33|agentValueRun|
|AGT-10|automation|med|C||The agents run only from one press in an open desk tab, one call at a time…|19|agentNameShots|
|AGT-11|friction|med|C||The notes lists and Possible duplicates push the first item to 2.5 screens down…|27|_agNoticesHtml|
|AGT-12|friction|med|C||Every Reviewed tick and every selection tick redraws the whole desk: 0.8–2 s a…|28|_invSetReviewed|
|AGT-13|friction|low|C||A failed room check leaves Agent Two unstarted with nothing saying the values…|19|_arFinish|
|AGT-14|automation|med|C||Who it goes to, said at the camera ('going to Karen'), stays in the note; the…|32|_agSystem|
|AGT-15|automation|low|C||A must-find sighting cannot be recorded from the notice that reports it|25|_agTool|
|AGT-16|gap|med|DC||Nothing checks the inventory against the as-found photographs, so a thing never…|Ask 26|agentShotGroups|
|AGT-17|automation|low|DC||On living work Agent Two researches Keep and New-home lines and flags their…|not built|agentValueAuto|
|AGT-18|docs|low|C||The Evening Desk says nothing of Agent Two's notes, or that a tick made before…|33||
|FLD-01|defect|fix-now|C|still; fixed P4|The Job Plan's auction house (or charity, or hauler) becomes a firearm's…|4|_captureShot|
|FLD-02|accuracy|high|C|still|With more than four close-ups, Agent Two never sees the first ones, which the…|7|invLineCloseUps|
|FLD-03|automation|med|C||Who gets it, said aloud in the house, is typed again for every line at the…|32|_avLineText|
|FLD-04|accuracy|high|P||Damage the crew names ('big tear on the back', 'one has a broken leg') is kept…|22|AGENT_CONDITION_TEXT|
|FLD-05|gap|high|C||Vehicles lose the VIN, mileage and title the walkthrough recorded, and can…|19|materializeVehicle|
|FLD-06|accuracy|high|C|still|A car photographed in the garage and the walkthrough's vehicle are two lines…|8|materializeVehicle|
|FLD-07|gap|high|C|still; fixed P4|A firearm found in the house but not flagged at intake never warns the crew…|4|firearmsBannerHtml|
|FLD-08|automation|med|C||Naming and the room check run only at the desk, so a blurred mark or a missing…|19|agentNameShots|
|FLD-09|friction|med|C||In the room, a shot can only be deleted: no changing where it goes, no ⚑, no…|19|_roomShotStripHtml|
|FLD-10|inconsistency|low|DC||On an estate the as-found camera says 'Next: Items' although the guide says the…|not built|_fieldCamPaint|
|FLD-11|defect|med|C||A shot still held on the iPad looks lost on the laptop, and Retry there says to…|19|retryPhotoUpload|
|FLD-12|automation|med|C||With two selling vendors (or charities) confirmed, every Sell line says 'name…|32|invPlanChannel|
|FLD-13|gap|low|C||'Found it' on a must-find is not tied to the item, so no paper can say which…|25|toggleMustFound|
|FLD-14|gap|med|C||The representative standing in the house cannot give the written release on the…|26|signPadInit|
|FLD-15|docs|low|C||The room's step text says 'shoot the pile', against the guide's one thing or…|33|_paintRoomWorkspace|
|FLD-16|gap|low|C||New-home lines on a Home Transition carry no room at the new home|32|FIELD_DISPOSITIONS|
|LIV-01|accuracy|high|C|still|The ⚑ 'flagged for appraisal, no value recorded' warning disappears from the…|10|INV_RELEASE_CAUTIONS|
|LIV-02|defect|high|C|still|The selection survives bulk actions and filter changes, so Remove lines removes…|9|_invPickGroup|
|LIV-03|inconsistency|med|DC||The Contents Record the client signs can carry 'IN PROGRESS … may still change'…|Ask 12|printContentsRecord|
|LIV-04|gap|med|C||Home Transition and Home Editing sell through auction houses but have no…|32|jobTakesProceedsStatements|
|LIV-05|defect|med|C|fixed P4|A living client's own firearm on Keep or Move is 'held' for good, and the way…|4|_renderInvRow|
|LIV-06|friction|low|DC||On living jobs, 'Unsure' flags sit on values for Keep, Move and Junk lines that…|not built|INV_WORK_FLAGS|
|LIV-07|inconsistency|low|DC||A name typed and decided at the desk is not reviewed, and correcting a name…|Ask 23|invLineReviewed|
|LIV-08|automation|med|C|still|Photographs Agent One found nothing in stay as lines in Unnamed shots and block…|9|INV_WORK_FLAGS|
|LIV-09|automation|low|C||The one paper a living client signs has no iPad signing and no send|30|_renderContentsCard|
|LIV-10|gap|med|C||The donation papers do not give a donor's CPA what a deduction needs|30|printDonationRecord|
|LIV-11|inconsistency|med|C||Hold lines print as 'not recorded' on the Contents Record, but the sign-off is…|12|printContentsRecord|
|LIV-12|inconsistency|low|C||On living jobs the Disposition Ledger card says the client signs it, then that…|32|_renderLedgerCard|
|LIV-13|gap|low|C||Closing a living job never mentions an unsigned or incomplete Contents Record|12|applyJobTransition|
|LIV-14|inconsistency|low|C||Living client papers print the desk's words 'Distribute' and 'Move'|32|invDispDocWord|
|LIV-15|inconsistency|low|C||A Move row's 'Who takes it' box looks empty, and typing in it replaces the new…|32|_invRecipientInput|
|LIV-16|inconsistency|low|C||Estate-only fields and wording leak into the living line record, the CSV and…|14|INVENTORY_COLUMNS|
|LIV-17|docs|med|C||The playbook and the manual still say nothing is valued on living work and…|33|CONCIERGE_GUIDE|
|LIV-18|automation|med|DC||The person the crew names at the camera for 'To a person' is typed again at the…|not built|_invEdit|
|LIV-19|gap|low|C||The Home Transition's move pile records no room in the new home and produces no…|32||
|LIV-20|friction|low|C||On the iPad the desk's controls are mouse-sized, and every disposition change…|28|_invEdit|
|LIV-21|accuracy|low|C||A mid-job Contents Record says items 'have left the property' when they are…|12|dispositionRecord|
|LIV-22|accuracy|low|C||Unreviewed Agent Two figures print on living client papers with no mark|10|printApprovalRequest|
|LIV-23|inconsistency|low|DK||Grammar on the request card: '1 line await written approval'|16|approvalRequestCardHtml|
|LIV-24|friction|low|C||A line set to Consign at the desk does not take the confirmed auction house|32|INV_PLAN_CHANNEL_KINDS|
|LIV-25|gap|low|C||Nothing records what a living client approved by word before it left, until the…|not built|invWrittenReleaseNeeded|
|ROW-01|accuracy|high|C|changed|Reviewed can be stamped on lines with no name and no destination, and the…|9|_renderInvRow|
|ROW-02|defect|high|C||After the first tick, three quarters of a full house's rows lose their…|13|_invSaveThumbCache|
|ROW-03|defect|high|C|still|The desk's search box keeps only the first letter typed at a normal pace, and…|9|_renderInvFilterRow|
|ROW-04|defect|high|C|still|The first figure typed over Agent Two's value drops focus, so the iPad keyboard…|9|_invEdit|
|ROW-05|defect|high|C|still|The name and the recipient each have two boxes (row and record) that disagree…|9|_invPanelCols|
|ROW-06|friction|high|C||Choosing where a line goes moves it about ten screens away, before its Who…|29|_invEdit|
|ROW-07|friction|high|C||Every tick, selection, ▾ and destination change redraws the whole desk: about a…|28|_invSetReviewed|
|ROW-08|accuracy|high|C|still|Under Not reviewed or Unsure, each tick slides the next line under the finger…|9|_invSetReviewed|
|ROW-09|accuracy|med|C|fixed|One tick on half of a same-name pair silently clears the duplicate warning, and…|built 27 Oct|_agDupEligible|
|ROW-10|accuracy|high|C||A value corrected on the row reaches the estate's papers as 'not stated', and…|10|_invEdit|
|ROW-11|gap|med|C||The desk cannot show a photograph big enough to check a count or read a mark|27|_invRowPhotoHtml|
|ROW-12|automation|high|C||No one-line-at-a-time review: the honest look costs about two presses per line…|27|_renderInvRow|
|ROW-13|accuracy|med|C||What Agent One read (its 'Read:' basis and its confidence) is nowhere on screen|24|agentBasis|
|ROW-14|friction|med|C||The row's explanations live in hover titles the iPad cannot show|29|_renderInvRow|
|ROW-15|inconsistency|med|C||The Reviewed tick confirms a condition the row never shows|29|_invCondIsAgents|
|ROW-16|friction|med|C||Correcting a category takes the record: 3 presses and 2 full redraws a line|29|_renderInvRow|
|ROW-17|automation|med|C|still|Photographs Agent One found nothing in stay on the list until removed one by one|9|_renderInvRow|
|ROW-18|accuracy|med|DC||Mark reviewed sweeps the unsure lines in without asking first|decided (Q106, Q108)|_invBulkApply|
|ROW-19|accuracy|low|C||A tick made while Agent Two re-values a renamed line is accepted on the old…|29|_invSetReviewed|
|ROW-20|friction|med|C||On the iPad's 1024 px a leaving row gives the item 110 px, so names run ten…|29|_invCtrlMinW|
|ROW-21|friction|med|C||iPad tap targets are 14 px, and a near-miss on the select box opens Drive in a…|29|_renderInvRow|
|ROW-22|defect|low|C||The Each box overflows its column and touches Total|28|_invCtrlMinW|
|ROW-23|inconsistency|low|C||A Move row shows a blank, borderless box under 'Who takes it'; the new home's…|32|_invRecipientInput|
|ROW-24|friction|low|C||The first row starts 1.5–2 screens down, and a big Possible duplicates group…|27|renderInventoryTab|
|ROW-25|docs|low|C||The Evening Desk says a maker added to a name reprices it; in fact any edit does|33|_agNameKey|
|ROW-26|friction|low|DC||A typo fix in a name sends the line for full research and reopens its review|Ask 23|agentValueAfterRename|
|ROW-27|automation|med|C||There is no way to look at the highest-value lines first|27|_renderInvFilterRow|
|ROW-28|inconsistency|low|C||A destination has three names: the camera's, the desk's and the papers'|32|_invInput|
|ROW-29|friction|low|C||Selection works only per destination group: no room-level Select all, no range…|27|_invPickGroup|
|NEW-01|accuracy|fix-now|C|changed|A line with no name and no value can be ticked Reviewed, and the inventory then…|9|invLineReviewed|
|NEW-02|accuracy|high|C|still|The release request the fiduciaries sign carries agent values nobody reviewed…|10|printApprovalRequest|
|NEW-03|defect|high|C|still|After a bequest awaiting appraisal is signed out to its beneficiary, the desk…|16|signoutGroups|
|NEW-04|gap|high|C|still|Close job's question leaves out most open work, and a living job closed with an…|12|applyJobTransition|
|NEW-05|accuracy|high|C|fixed|A room-check double can be ticked Reviewed on both lines and then prints…|built 27 Oct|_invSetReviewed|
|NEW-06|docs|med|C||Sending the inventory to the estate attorney cannot be found from the guide or…|33||
|NEW-07|inconsistency|low|C|still|The package's 'still being built' question counts only named lines, so it…|9|probatePackageGaps|
|NEW-08|accuracy|med|DC||A driver's signature on Havellin's Donation Release is recorded as the…|Ask 32|SIGNOUT_KINDS|
|NEW-09|docs|low|C||On a custody-mandatory estate, iPad sign-outs to a person or a charity write no…|30|_signoutAfterFile|
|NEW-10|inconsistency|med|C||The work bar's confirms and the playbook still describe the agents as they were…|33|CONCIERGE_GUIDE|
|NEW-11|accuracy|med|C||'One Reviewed tick covers it all' confirms a condition grade the row never shows|29|_renderInvRow|
|NEW-12|friction|low|C||A tick made while a re-value is out is silently undone when the new figure lands|29|agentValueAfterRename|
|NEW-13|inconsistency|low|C||Living Closing bar: the ledger card says the client signs it, then says they…|32|_renderLedgerCard|
|NEW-14|inconsistency|low|C||The living client's desk says an appraisal is 'usually the date of death', and…|14||
|NEW-15|friction|med|C||On a full house the pickup's Sign out button is 20 iPad screens below the top…|27|DESK_FOLDS|
|NEW-16|automation|low|C||A drawer shot piece by piece cannot be made into one line: only removed…|27||
|NEW-17|inconsistency|low|C||Bar colours do not mean what the guide says: red with nothing to do, amber for…|33|deskFoldState|
|NEW-18|friction|low|C||Every press on a row redraws the whole desk: about 0.35 s each at 300 lines|28|_invSetReviewed|
|NEW-19|accuracy|low|C||The ratification section totals an unvalued item as '$0'|7|printApprovalRequest|
|NEW-20|docs|low|C||The playbook says reviewing or renaming settles a possible duplicate; for a…|8|CONCIERGE_GUIDE|
|NEW-21|docs|low|C||The playbook's list of Needs you counts is stale|33|CONCIERGE_GUIDE|
|NEW-22|docs|low|C||The Evening Desk leaves out three things the first evening hits|33||
|NEW-23|inconsistency|low|C||Partly signed approvals are headed 'Approved', and the cards' counts are…|16||
|NEW-24|friction|low|DC||'No signed receipt' is flagged from the moment of approval, while the item is…|Ask 15|invReleasedToPerson|
|NEW-25|friction|low|C||Where it goes uses different words from the camera, in alphabetical order|32|_invDispOptions|
|NEW-26|friction|low|C||Send request is offered again straight after I've sent it, beside Record the…|16|approvalRequestCardHtml|
|SYN-01|defect|fix-now|C|still|A device with an old copy overwrites the other device's work on any line it…|6 · contained 27 Oct, 18|_invRefreshFromCloud|
|SYN-02|defect|high|C|still|Lines removed on one device come back named and valued when a device with an…|6 · contained 27 Oct, 18|agentShotGroups|
|SYN-03|accuracy|fix-now|C|still|A written approval stays complete after the line is sent somewhere else; the…|5 · built 27 Oct|invApprovalComplete|
|SYN-04|defect|high|C|still|A deliberate clear of a sticky field (a wrong approval, a wrong recipient) is…|18|invStickyValue|
|SYN-05|defect|high|C|still|When the sheet is slow or unreachable, the desk redraws on a timer and after…|6 · built 27 Oct|_invRefreshFromCloud|
|SYN-06|defect|high|C|still|Work can be stranded on a device: an edit within 2.5 s of closing or reloading…|6 · built 27 Oct|_pendingCount|
|SYN-07|accuracy|high|C|still|The client's Drive workbook in the counsel-shared Estate Inventory folder is…|18|_scheduleInventorySync|
|SYN-08|defect|high|C|still|A cold or unreachable desk claims none: '0 of 0 reviewed', 'No items yet. Open…|1 · built 27 Oct|_invManifestUnread|
|SYN-09|accuracy|med|DK|still|KNOWN: the vehicle import on a cold device creates a second line for the same…|8|_renderInventoryImportPanel|
|SYN-10|inconsistency|med|C|still|Papers and the snapshot print this device's copy without reading the sheet…|6 · built 27 Oct|printEstateInventoryReport|
|SYN-11|accuracy|med|C||Two devices issue the same next item number; the later-born line's number moves…|18|_invAssignItemNos|
|SYN-12|friction|med|C|still, wider|KNOWN: a press straight from a row's box is lost, and not only on the Releases…|9|_invEdit|
|SYN-13|inconsistency|med|C||When an agent run finishes while the cursor sits in a box, the desk keeps…|28|_avFinish|
|SYN-14|inconsistency|med|C|fixed P4|Firearms set in an item's record does not redraw the row: the 'Possible NFA…|4|_invEdit|
|SYN-15|inconsistency|low|C||The group heading's value total and the close-out vendor count go stale after…|28|_renderInvGroupHead|
|SYN-16|docs|med|C||The playbook promises 'two people working the same job keep both sets of…|6 · built 27 Oct||
|SYN-17|gap|low|C||Every manifest save reads and rewrites the whole MediaStore of every job ever…|18|saveMediaStore|
|SYN-18|friction|low|C|still|The offline chip says '1 unsaved change' for any number of desk edits|6 · built 27 Oct|updatePendingIndicator|
|GAP1-01|accuracy|high|C|still|The Ellison plates still read 'appear to be Italian majolica' on the FINAL Trust Schedule; every Spanish correction sits on a removed line, and the tick on #73 stops Agent Two correcting it|Ask 22, then 22|_avNameIsAgents|
|GAP1-02|gap|high|C||The sharp photograph of the plate's mark became its own line, was paired by the room check, and could only be removed|8|agentDropDuplicate|
|GAP1-03|defect|high|C|still|'One photograph named twice' pairs no repeat with its original; three Removes took both salad-plate lines, so one stack is on no paper|8|agentNamedTwice|
|GAP1-04|accuracy|med|C||A heard origin goes into the name: Agent One's origin wrong 6 of 6, Agent Two's right 5 of 5 from the photograph|22|_agSystem|
|GAP1-05|accuracy|med|C|still|Etsy /market/ pages pass the comparable filter, one URL counts three times, and a 'sold' tag on Etsy or Replacements counts as a sale|7|_avResultsPage|
|GAP1-06|docs|med|C||The draft misstated the Ellison case (Etsy; the mark not taken; the correction never reached the live line)|this plan, 3(a)|—|
|GAP1-07|automation|med|C||The Ellison china is a ready first case for the harness, as development, not test|3|agentIdentify|
|GAP2-01|defect|high|C|still|On Both, one pending appraisal holds both schedules DRAFT, and each DRAFT reason counts items not on it|11|printCourtInventory|
|GAP2-02|accuracy|high|C|still|The Form 706 aggregate says 'cannot be tested yet' while the valued articles alone already pass $3,000|7|maivStatement_|
|GAP2-03|friction|high|C||No Set track on the bulk bar: 30 lines to the Trust Schedule take 60 to 90 presses|11|_renderInvBulk|
|GAP2-04|gap|high|DC||On Both every untracked line goes on the Court Inventory, and nothing asks whether the contents were assigned to the trust|Ask 9|_invTrackDefault|
|GAP2-05|inconsistency|med|DC||On a pour-over every fiduciary must sign every line, whatever its track|Ask 10|invApprovalMissing|
|GAP2-06|defect|high|C|still|A PR who is also successor trustee can be named on only one schedule|11|scheduleSigners|
|GAP2-07|accuracy|high|C|still|The trust's sale proceeds are never told apart from the estate's; a statement paid to the estate covering a trust lot 'agrees'|11|proceedsReconciliation|
|GAP2-08|inconsistency|med|C|still|The CSV and the workbook leave Asset Track blank on every untracked line|11|_invExportValue|
|GAP2-09|accuracy|high|C|still|The charity's sheet names the estate as donor of the trust's piano; the receipt hedges 'the estate or the trustees'|11|signoutSheetHtml|
|GAP2-10|gap|med|DC||On Both only the Letters are asked, yet Before Day 1 asks to read a Certification nothing records|Ask 11|estateAuthority|
|GAP2-11|docs|low|C||On Both the package addresses only the estate attorney and speaks only of the filing|11|probatePackageAddressee|
|GAP3-01|defect|fix-now|C|still|One snapshot of a full estate empties the Jobs tab: the tab is cleared, then the oversized write fails|1 · built 27 Oct|saveAllJobsToSheet|
|GAP3-02|defect|fix-now|C|still|An empty Jobs tab reads as every client deleted; every device purges its own copy under a green tick|1 · built 27 Oct|_jobRefusal|
|GAP3-03|defect|fix-now|C|still|The first new client after a wipe sweeps every other client's estimates, plans, hours, inventories and change orders|1 · built 27 Oct|_sweepDeletedJobKeys|
|GAP3-04|defect|high|C|still|A 'deleted' answer from the server destroys photographs not yet in Drive|1 · built 27 Oct|_purgeLocalJobRecords|
|GAP3-05|defect|high|C|still|The cell-size failure retries for ever, and the device holding it empties a restored tab again|1 · built 27 Oct|_backendErrorKind|
|GAP3-06|defect|med|C|still|A device with a stuck job write stops seeing everyone else's changes|1 · built 27 Oct|_syncWritesOutstanding|
|GAP3-07|defect|med|C|still|Every store tab is cleared before it is written, and an empty store tab reads as an empty store|1 · built 27 Oct|_writeStoreBlob|
|GAP3-08|docs|high|C||No recovery runbook; the obvious recovery loses a client or empties the tab again|1 · built 27 Oct|MANUAL.md|
|GAP3-09|automation|med|C||One editor run on a throwaway sheet says whether a failed write leaves the tab empty|1 · built 27 Oct|probeClearThenOversizeWrite|
|RT-01|security|fix-now|RT|still, wider|The jobs backend answers anyone holding its URL: every client read, any folder shared, any file trashed (code checked)|2 · built 27 Oct|doGet|
|RT-02|legal|high|RT||No engagement term says what Havellin's values are, who may rely on them, and that AI helped; E&O cover for value opinions not yet asked|counsel; today (insurer)|—|
|RT-03|papers|high|RT||No named preparer and no scope-of-work statement (inspection dates, what was not examined, assumptions, market, independence, glossary)|17, Ask 17|printCourtInventory|
|RT-04|independence|high|RT||Havellin values, picks the channel and is paid by it; fees are named only on the ledger and Contents Record; the field note can tell Agent Two the destination (code checked)|Ask 18; 17, 21|referralFeeVendorsNote|
|RT-05|legal|high|RT|still|On a 706 estate past the $3,000 aggregate, articles under $3,000 each are never routed to the sworn appraisal|7|invNeedsAppraisal|
|RT-06|legal|med|RT||No caution for the §732.402 exempt-property window or the §20.2031-6(c) pre-sale rule|17 (counsel)|INV_RELEASE_CAUTIONS|
|RT-07|completeness|med|RT||Nothing checks the house against the insurance rider, prior appraisals or what was removed before entry|25|HOUSE_FLAGS|
|RT-08|completeness|med|RT||Significant papers found in the house have no hand-over record|25|SITE_FIND_KINDS|
|RT-09|accuracy|high|RT||Fine jewelry and precious metal are valued from a photograph, not tested|Ask 24, 23|INV_TAXONOMY|
|RT-10|measurement|med|RT||The model upgrades itself, so the baseline and later scores are not comparable|Ask 2|AGENT_MODEL_PIN|
|RT-11|papers|med|RT||No per-beneficiary distribution summary at inventory value|17|dispositionLedger|
|RT-12|legal|med|RT||No client consent for reusing photographs and values to measure the agents|counsel; 3|—|
|RT-13|legal|low|RT [U]||A living client's donation over $5,000 may need a qualified appraisal before it leaves (the 60-day rule is unconfirmed)|30|printDonationRecord|
|RT-14|accuracy|high|RT||No sleeper check: one confident naming decides whether research ever sees a photograph before Donate or Junk|20|_avItemPayload|
|RT-15|positioning|high|RT||No independent credentialed appraiser's name on the schedule|Ask 19|—|
|RT-16|accuracy|high|RT||The buyer's premium is never recorded, so sales compare and adopt at hammer, not at fair market value|21|openProceedsStatement|
|RT-17|measurement|med|RT||No head-to-head between the agents and independent appraisers|Ask 27|—|
|RT-18|measurement|high|RT||Ellison is the development set: the valuing prompt's own worked example is the plates' answer (code checked)|3|_avSystem|
|RT-19|measurement|med|RT||Lead the scores with sleeper recall, overclaim rate and dollar-weighted error|3|—|
|RT-20|field|med|RT||The close-up table leaves out silver, jewelry, sculpture, Asian works, coins and books|19|photography-guide.html|
|RT-21|accuracy|med|RT||No identification evidence grade, so a guess and an identification print alike|22|—|
|RT-22|papers|low|RT||No value-by-basis summary on the cover|17|printEstateInventoryReport|
|RT-23|legal|med|RT [U]||A guardian or an agent acting for a living client is treated as the client|Ask 35, 32|invWrittenReleaseNeeded|
|RT-24|security|med|RT|drafted 2026-10-27 (P2), with counsel|No data-handling statement a bank's vendor review can file|2|—|

**Not built, and not asked**
- **AGT-17, LIV-06** (living *Unsure* on Keep, Move and Junk): decided (P23 decision 2; Agent Two values by itself). Low; Read mode's order puts these lines last.
- **FLD-10** (an estate's as-found camera offers only **Next: Items**): decided (Q40). Low.
- **LIV-18** (Agent One returning who an item goes to): this would widen Agent One's decided write list. P32's roster match (AGT-14, FLD-03) comes first; ask only if names stay unmatched.
- **LIV-25** (a weekly email of what is leaving): confirmed, but it sits beside the 2026-10-26 decision on verbal approval on living work. Not built unless a family disputes a verbal yes.
- **Access codes kept out of the Jobs sheet** (attorney): Decided (Q72). Not proposed. P2 notes that the sheet's version history keeps every code.

**Red-team corrections adopted into the plan** (both reviewers unless named)
- The verdict now says the desk is ahead on the record and behind on handling the valuable few. "Beat a twenty-year appraiser" became "the appraiser works from Havellin's catalogue".
- The accuracy programme's truth is split:
  - identity is settled by evidence;
  - value is settled by realised sales and independent appraisals;
  - the founders never set the value truth (Ask 3).
- Ellison is the development set, and a held-out set is built from houses the prompts never saw. Targets wait for several hundred lines, with intervals.
- Public lots are licensed or taken by hand within each site's terms, self-matches are rejected, and catalogue and field scores are kept apart.
- Publishing the accuracy figure waits for independent review and counsel's words.
- Etsy is a lead to a reference, never identity evidence on its own, and never value.
- Agent Two's standard follows the regulation's market by class, in place of "not retail". The premium is included only where auction is the market (attorney).
- "High" confidence needs matching sales within a recency set by category, and an eBay Best Offer sale counts as the price not shown (appraiser).
- The silver and gold floor is the refiner's payout on weighable metal (appraiser).
- The two-model second opinion is blind and different (appraiser).
- Disagreements print as *unsure* unless a mark or a reference settles them.
- Ask 5 (now Ask 7) separates Form 706 estates.
- Ask 6 (now Ask 8) asks for a reason, not a name.
- Ask 16 (now Ask 24) routes by class and irreversibility on every job.
- Ask 19 (now Ask 16) offers only ways of disclosing.
- Ask 27 (now Ask 21) prints the inventory value without asking counsel first.
- The positioning drops "Agent Two is never told where an item is going", which the field note makes untrue.
- The order: P2 (the backend) and P3 (the measurement) come in the first week. P19 (the mark in the house) comes ahead of the agents' prompt work. The preparer's statement and minimal Valuation Support (P17) come before any FINAL schedule reaches a real estate. The attorney's read comes before Phase 3.

**Dropped:** none. No finding was refuted.
- The six duplicates of known items each showed new impact, and sit in their pack: EST-19, EST-20, INV-13, LIV-23, SYN-09 and VAL-25.
- GAP2's lot point on the schedules is DOC-25 (P13) and was not refiled.
- GAP1-03's crop drawing closes, for that group, the known item that a frame's lines all show the whole frame.
- Findings that appeared in several lenses are merged under one pack. For example: EST-01, REL-01 and SYN-03 in P5; ACC-02 and INV-01 in P8; EST-06, DOC-03 and ROW-02 in P13; VAL-01, INV-02 and GAP3-01 in P1.

### B. The cell-cap probe, and the runbook until P1 lands

*P1 landed on 2026-10-27 (backend `2026-10-27b`): the probe is committed in `apps-script/main-sync.gs` and runs from the jobs script's editor once that redeploy is live, and the runbook, rewritten for it, is in the manual (the note headed "If the client list empties: the runbook"). This appendix stays as written, for a deployment older than `2026-10-27b`.*

*The probe ran on 2026-10-28: DEFERRED. setValues did not throw; the flush did; the clear stayed; the cells before the long one were written, and it and the row after it were not. Neither variant below is what a deployment does: an older deployment's failed write cut the Jobs tab at that client, usually under an answer of ok, and the next estimate, plan, hours or inventory save swept the records of the clients cut off. The variant A runbook applies to a cut tab, with step 1 listing the clients cut off and step 3's stores restored wherever such a save reached the sheet after the cut.*

**The probe** (GAP3-09).
1. Paste the function below into a new standalone project (script.google.com › New project). Nothing of Havellin's is touched, and no redeploy is needed.
2. Run it once and read the log. It makes a throwaway spreadsheet, repeats the Jobs save's two calls on it, says which variant this account has, and trashes the file.
3. Record the answer in CLAUDE.md under Backend.

```javascript
function probeClearThenOversizeWrite() {
  var ss = SpreadsheetApp.create('Havellin cell-cap probe (safe to delete)');
  var sh = ss.getSheets()[0];
  sh.getRange(1, 1, 4, 2).setValues([['ID', 'Data JSON'], ['1', 'row one'], ['2', 'row two'], ['3', 'row three']]);
  SpreadsheetApp.flush();
  var big = new Array(50002).join('x');           // 50,001 characters
  var atCall = '', atFlush = '';
  try {
    var last = sh.getLastRow();
    if (last > 1) sh.getRange(2, 1, last - 1, sh.getLastColumn()).clearContent();
    sh.getRange(2, 1, 3, 2).setValues([['1', 'row one'], ['2', big], ['3', 'row three']]);
  } catch (e) { atCall = String(e); }
  try { SpreadsheetApp.flush(); } catch (e2) { atFlush = String(e2); }
  var left = sh.getLastRow() - 1, kept = left > 0 ? sh.getRange(2, 2, left, 1).getValues().map(function (r) { return String(r[0]).length; }) : [];
  var verdict = atCall
    ? (left === 0 ? 'VARIANT A: the clear stayed when setValues threw. One oversized client record empties the Jobs tab.'
                  : 'VARIANT B: the clear was undone when setValues threw (' + left + ' rows still there).')
    : (atFlush ? 'DEFERRED: setValues did not throw at the call; the flush did (' + atFlush + '). doPost would have answered ok.'
               : 'NO ERROR: a 50,001-character cell was accepted here; the cap is not where the code assumes.');
  Logger.log('setValues threw at the call: ' + (atCall || 'no'));
  Logger.log('flush threw: ' + (atFlush || 'no'));
  Logger.log('rows left after the failed write: ' + left + ' (cell lengths ' + JSON.stringify(kept) + ')');
  Logger.log(verdict);
  try { DriveApp.getFileById(ss.getId()).setTrashed(true); } catch (e3) { Logger.log('Trash the probe file by hand: ' + ss.getUrl()); }
  return verdict;
}
```

**If the client list empties (variant A)** (GAP3-08, checked against the real code over a fake sheet).
1. **Confirm it.** In the jobs script's editor, run previewDeletedJobs(). It will list every client as deleted.
2. **Freeze.**
   - Nobody adds a client or saves.
   - Keep any iPad holding "Not saved" photographs offline, with the app closed.
   - On the device that pressed Snapshot, close the tab if its red chip shows a change not saved. Nothing needs **This Device › Clear**.
3. **Restore.** Open File › Version history › See version history and pick the last version before the press.
   - If no client was added since, use **Restore this version**.
   - Otherwise use **Make a copy**, and paste the copy's Jobs rows (A2:L, every row) into the live Jobs tab, keeping any row added since.
   - If anyone saved for the new client, also bring back EstimateStore, JobPlanStore, LogStore, MediaStore and ChangeOrderStore from the copy: Copy to › existing spreadsheet, delete the live tab, and rename the copy to the exact name. Then have the device that made the new client save it again.
4. **Check the ledger.** Run previewDeletedJobs() again; it must list none.
   - A client still listed needs its row restored.
   - Or run allowJobRestoreConfirm with its id, then save from a tab that has been open since before the wipe. Opening the app does not work.
5. **Reload each device in turn.**
6. **Gone for good:**
   - the snapshot itself;
   - photographs a device still held unsent;
   - edits made between the wipe and each device's purge.

**Variant B:** nothing to restore. Close the tab on the device that pressed Snapshot, then reload it.
