# AGENT TWO — VALUE THE INVENTORY

**Status: built (P23, 2026-10-06); live once Apps Script `2026-10-06b` is deployed.** Step 3 of the
inventory pipeline Anthony scoped on 2026-09-19 (step 1 the two-pass field camera, step 2 Agent One,
`AGENT_ONE_SPEC.md`). This file is the design and the decisions behind it; §13 says where the build
departs from it. `CLAUDE.md` holds the rules as built.

Anthony, on what it is for: *"the whole point is to save time, not have a human re-enter numbers
where we don't have to."*

---

## 1 · WHAT IT IS

Agent One names the shots. Agent Two puts a value on every line it can, with the sales it rests on,
and the desk confirms. It writes the value fields Agent One was forbidden (`fmv`, `valDate`,
`valSource`, `valNote`) and nothing else a person owns.

| | |
|---|---|
| **Value** | A point value (`fmv`), a low and high range, the valuation date, the source and the comps |
| **Comps** | Each sale it relied on: title, venue, sale date, price, link, sold or asking |
| **Triage** | Notices for a person, never writes: *probably needs an appraiser*, *sell through a specialist*, *a WorthPoint check is worth it* |

### What it never writes

| Field | Why |
|---|---|
| `objectName`, `category`, `qty` | Agent One's and the desk's. A value that disagrees with the name is a notice, never a rename |
| `disposition`, `channel` | A sale channel is a suggestion on the desk; the disposition is a person's decision |
| `needsAppr` | Still derived (`invNeedsAppraisal`). The range feeds that rule (§6); a second writer is the drift this codebase keeps paying for |
| `flagBequest`, `flagDisputed`, `flagExempt`, `flagNFA`, `assetTrack` | Facts about the matter, not the market |
| `authBy`, `approvalDate`, `receiptDoc`, `gross`, `fees`, `itemNo` | Records of things that happened between people |
| A value on a line a person or an appraiser valued | §5: re-run skips it; a desk value is never overwritten |

A test holds the write path to the fields in §5 and fails on any key above.

---

## 2 · DECIDED (Anthony, 2026-10-05)

1. **Writes the number, flagged unreviewed.** Not a proposal queue. Same pattern as Agent One's names:
   `valuedBy:'agent'`, unreviewed, amber where confidence is low, and the desk corrects in place.
2. **Every line, on every job that disposes of property, estates and living clients alike.** Two
   depths (§3): sold comparables for anything worth researching, a general estimate for ordinary lots.
   This reverses the 2026-09-21 rule that a living job never enters values (`invNeedsAppraisal`'s
   comment); §8 says how, and the contract question it raises.
3. **The agent's number stands until an appraisal replaces it.** An appraisal linked to the line
   (`valSource: 'Appraisal'`) wins, and the agent's figures go with it (Anthony, 2026-10-06: the agent's
   value does not stay on the record): `valLow`, `valHigh`, `valComps`, `valLookup` and `valConf` are
   cleared and `valuedBy` becomes `'appraiser'`. The appraisal is the only figure the line carries.
4. **A range that crosses the appraisal threshold flags the item for an appraiser.** A $2,500 to $4,000
   range is an appraisal, whatever the point value says (§6).
5. **WorthPoint is the confirming source, by hand.** No public API (checked 2026-10-05); browser
   automation of a subscription is ruled out (§4). Anthony subscribes; the agent prepares each lookup;
   a partnership inquiry is drafted for Anthony to send.

---

## 3 · TWO DEPTHS

`agentValueMode(ref, job)`, DOM-free, one rule:

| Mode | Lines | What it does | Source written |
|---|---|---|---|
| **`comps`** | An intrinsic category (`invIsIntrinsic`: art, antiques, jewelry, silver, rugs, collectibles, firearms, wine, instruments); any line Agent One named with a maker, model, signature or mark (its `agentBasis` cites one); any line ticked *Appraise*; any line a person sends to it | Web search for sold results: auction prices realized, LiveAuctioneers and Invaluable results pages, auction house archives, dealer sales. Three or more sold comps where they exist | `Auction comps` or `Online comps` (whichever the comps are) |
| **`general`** | Everything else: the drawer of stainless flatware, the cabinet of Crate & Barrel plates, books, linens, kitchenware | One quick search for the going resale rate of that kind of lot, at its quantity and condition | `General estimate` (new) |

- A general estimate is a figure for the schedule, not research. *"Stainless flatware, everyday brand"*, Quantity 60,
  $40 to $60 for the lot, is the whole job (the name never carries the count: Agent One's rule since 2026-10-24).
- **A general estimate whose figure for one article (the figure over the line's Quantity, since 2026-10-26; the whole
  line's until then) comes back above `AGENT_GENERAL_CEILING`** (a starting figure, $250) is re-run as `comps` in the same
  pass: the lot is worth more than "ordinary". Anthony: *"One item's price"*.
- `general` lines are batched (about ten to a request); `comps` lines go one to a request, with the
  photo and its detail shots (the maker's mark is what makes a comp a match).

---

## 4 · SOURCES

| Source | Access | Use |
|---|---|---|
| **Claude web search** (`web_search_20260209`, with `web_fetch_20260209` to read a results page) | Server tool on the Messages API; about $10 per 1,000 searches plus tokens | Every line. The default |
| **WorthPoint** | Subscription only, no public API found. Browser automation ruled out: no server to run it on (Apps Script cannot drive a browser), the terms very likely forbid bots, and it breaks on every redesign | By hand on `comps` lines: the agent writes the lookup (§4a); a person pastes the best record back |
| **eBay** | Sold data is closed: Marketplace Insights is not open to new developers, `findCompletedItems` was shut down in February 2025, the Browse API returns active listings only, and the sold search now needs a login | None. An active listing is an asking price; the agent may cite one only as `asking`. Since 2026-10-27 ten or more close listings and no sale are a listing survey (§4b). A developer account was opened that day: the Browse API could hand the survey its count, but eBay's 2025 license restricts sending its data to an outside AI, so nothing is built on it until eBay confirms in writing that it may |
| **LiveAuctioneers, Invaluable** | No public API; third-party scrapers exist | Through web search only, on pages it can reach. Never a scraper: these numbers can end up in a court filing |

### 4a · The WorthPoint lookup

Every `comps` line carries `valLookup`: the search terms (maker, pattern, mark, form, period) the
agent would type into WorthPoint. The desk row shows it with a copy button and the photo link. A
person runs it, and **Use this sale** takes a pasted WorthPoint record (title, price, date, venue,
link) into the comps, sets `valSource: 'WorthPoint comps'` (new) and marks the value reviewed.

If WorthPoint opens partner or API access, the lookup becomes a call in the same place and nothing
else in this design moves.

### 4b · No invented sales

- **A comp must cite a URL the search actually returned.** The server reads the `web_search_tool_result`
  and `web_fetch_tool_result` blocks of the response and drops any comp whose link is not among them,
  then downgrades the confidence. A model asked for sources can invent plausible ones; this is the guard.
- A comp states `sold` or `asking`. A few asking prices never set the point value alone (since 2026-10-27, a listing
  survey of ten or more may: the bullet below); a line with no
  sold comp is `confidence:'low'` whatever else it found.
- **A listing survey counts (2026-10-27; Anthony: *"A listing survey counts"*).** Where research turns up no sale, the agent
  may count the close listings of the same thing still for sale and report them (`survey`: count, the lowest, middle and
  highest asking price for one article, and the page counted, which may be a results page). Listings are a ceiling. With
  `AGENT_VALUE_SURVEY_MIN` (10) or more on a page a tool returned, and one article's figure at or under the middle price, the
  line is `medium` at most (never `high`, never lifted from the model's own `low`) and its source *Listing survey*; anything
  less stays `low` and a *General estimate*. A sale found always decides.
- The point value is the agent's reading of the sold comps adjusted for condition, and `valNote`
  says how in one sentence (*"Median of 4 sold, 2024–2026; chip to rim, low end"*).

---

## 5 · FIELDS, PROVENANCE AND RE-RUN

Written by the agent:

| Field | Meaning |
|---|---|
| `fmv` | The point value: whole dollars each from $10 each, to the cent below it (`agentValueWhole`, §13; 2026-10-26b and 2026-10-27) |
| `valLow`, `valHigh` | The range |
| `valDate` | The valuation date: the date of death on an estate (`job.deathDate`), the day of the run on a living job (`_todayStr`) |
| `valSource` | `Auction comps`, `Online comps`, `General estimate` or (since 2026-10-27) `Listing survey` |
| `valNote` | One sentence of basis, as today (*Valuation Basis / Comps*) |
| `valComps` | `[{title, venue, saleDate, price, url, kind}]` |
| `valSurvey` | `{count, low, median, high, url}`: the close listings counted where no sale was found (§4b, 2026-10-27) |
| `valLookup` | The WorthPoint search terms (`comps` lines only) |
| `valuedBy` | `'agent'`, `'desk'` or `'appraiser'` |
| `valAgentAt`, `valConf` | When it ran; `high`, `medium` or `low` |
| `valNameAt` | The `objectName` the value was made against (§5a) |

- **Every new key goes on the `savePhotoRefs` whitelist**, or it is dropped on the next save (the
  failure this file's predecessor records three times). Whichever reach the workbook or the CSV go on
  `saveInventory.gs`'s list too, which means a redeploy.
- `valuedBy` is not sticky (`INV_STICKY_FIELDS`), for the reason `fmv` is not: a value is a judgement
  somebody revises.
- **A person typing a value takes ownership:** `valuedBy:'desk'`, `valConf` cleared, as a desk edit
  of the name sets `namedBy:'desk'` today.
- **Re-run skips every line that has a value**, from anybody. The button is *Value the unvalued
  lines*. A per-row **Re-value** handles a correction.
- **Review** is its own flag (`valReviewed`, with who and when), separate from the name's `reviewed`:
  a line can have a confirmed name and an unconfirmed value. The desk gets an *Unreviewed values*
  chip beside *Unnamed shots*, and **Accept** on the row. *(Built so in P23; since 2026-10-25b the line's
  one Reviewed tick sets both, and Accept, Accept values and the chip are gone; since 2026-10-26 a line with nothing
  flagged needs no tick at all, and its value stands as Agent Two left it: §13.)*

### 5a · A value made against a name that changed

The agent values whatever name the line carries, confirmed or not, so the desk is not held up
reviewing 500 names first. If the name is later edited, the value was made for something else:
`valNameAt` no longer matches, the row reads *value made for an earlier name* and the line is offered
for Re-value. A test drives the Banksy case: valued as an original, renamed *reproduction* at the
desk, flagged stale.

---

## 6 · THE APPRAISAL THRESHOLD AND THE OTHER RULES IT FEEDS

A value moves three rules that already exist, and each stays the one authority:

| Rule | What the agent's value does to it |
|---|---|
| `invNeedsAppraisal` ($3,000, or $500 on a disputed estate, `invAppraisalThreshold`) | **Decided (2):** reads `valHigh` where `valuedBy` is `'agent'`, so a range that crosses the threshold is an appraisal. One change inside the existing rule, not a second writer |
| `invLotSplitState` (§20.2031-6(a), no article in a lot over $100, 706 estates) | Reads `qty` and `fmv` as it does today. Lots it could not judge (*unvalued*) start being judged |
| `maivAggregate` (§20.2031-6(b), $3,000 of marked artistic value) | Same. Its floor becomes a figure once every line is valued |

**The agent is never told any threshold.** It values; the rules decide. Teaching it a figure is the
second copy (`AGENT_ONE_SPEC.md` §9 makes the same point about the lot cap).

On a living job `invNeedsAppraisal` stays the explicit tick (the 2026-09-21 reason holds: a count
that cannot go down). There, a range above the threshold raises a notice instead: *worth a specialist
or an auction house*.

---

## 7 · ARCHITECTURE AND WIRE

Same shape as Agent One: a backend action in `main-sync.gs`, `agentValue`, using the
`ANTHROPIC_API_KEY` already in Script Properties. **Requires a redeploy**: bump `BACKEND_VERSION`,
add the action to `BACKEND_ACTIONS` and the app's `BACKEND_NEEDS`, with its cost in
`BACKEND_FEATURE_COST` (*"the desk cannot value lines automatically"*). An editor-run
`testAgentValue()` first, argument-free, one known item, prints what came back.

| | |
|---|---|
| Model | Chosen by itself since 2026-10-26 (`_agModels('value')`, Agent One's rule: AGENT_ONE_SPEC §3): the newest top-tier model on Anthropic's model list first, today `claude-fable-5-1`, the newest Opus as the fallback, today `claude-opus-5-5`; `AGENT_MODEL_PIN` in Script Properties pins one. It was `claude-opus-5-5` (`AGENT_VALUE_MODEL`) until then |
| Effort | `medium` to start; sweep on one real estate |
| Tools | `web_search_20260209` (`max_uses` about 5 for `comps`, 1 for `general`), `web_fetch_20260209`; the answer through a `strict: true` tool, never parsed prose |
| Limits | Apps Script's six minutes: `UrlFetchApp.fetchAll` about eight requests at a time, stop on a budget and hand back `remaining`, as `agentIdentifyShots` does; handle `pause_turn` by continuing the request |

### Request (app → Apps Script)

```json
{ "action": "agentValue",
  "jobId": 7,
  "context": { "valuationDate": "2026-06-14", "estate": true, "region": "Palm Beach County, FL" },
  "items": [
    { "stableId": "7_r3_inventory_...", "mode": "comps",
      "name": "Herend Rothschild Bird dinner plates", "category": "Antiques", "qty": 8,
      "condition": "Good", "fieldNote": "", "agentBasis": "backstamp legible in detail frame",
      "fileId": "1AbC...", "details": [ { "fileId": "1XyZ..." } ] } ] }
```

### Response

```json
{ "ok": true,
  "results": {
    "7_r3_inventory_...": {
      "fmv": 640, "low": 480, "high": 800, "confidence": "medium",
      "source": "Auction comps",
      "basis": "Four sold comparables, 2025 to 2026; the median, less for one chipped rim",
      "comps": [ { "title": "Herend Rothschild Bird dinner plates, set of 8", "venue": "LiveAuctioneers",
                   "saleDate": "2026-03-11", "price": 700, "url": "https://...", "kind": "sold" } ],
      "lookup": "Herend Rothschild Bird dinner plate",
      "notices": [] } },
  "remaining": 42,
  "failed": { "7_r9_inventory_...": "cannot tell what it is from the photograph" },
  "retry":  { "7_r12_inventory_...": "the valuation took too long to come back" } }
```

`failed` is per line and never fatal; the app re-asks for what is left. A line it could not value
stays unvalued with the reason on the row, never a guess. Since 2026-10-26 (§13): `failed` is a verdict, and a best
estimate on thin evidence is a figure at confidence low, so a line is unvalued only when the model cannot tell what it is,
or it is papers; a passing failure (a request past UrlFetchApp's limit, a busy service, a line the model skipped) comes back
under `retry`, is asked again once in the run and is then left unstamped. The basis never carries the line's count.

---

## 8 · WHERE THE VALUE IS SHOWN

Decided (2): it runs on living jobs too. Decided (Anthony, 2026-10-06): **where the estate's attorney
values the property, Havellin does not.**

- The documentation tiers exist only on the three estate services. On *Contents list* and *None*
  (`docTierProduces(job, 'values')` false) the agreement gives the valuation to counsel, and the
  Contents List says Havellin *"states no opinion of value"*. Anthony: *"if an attorney doesn't want us
  to value things, we shouldn't."*
- **On those tiers the agent still runs, and its figure stays internal.** It writes `valLow`,
  `valHigh`, the comps, `valuedBy` and `valConf`, never `fmv`, `valDate` or `valSource`, and no client
  document, schedule, workbook or package prints them. The desk uses them for two things:
  - **Routing the sale** (auction house, online, estate sale, donate).
  - **Telling counsel what probably needs an appraisal**, by item and without a figure: *"we recommend
    a specialist appraisal for these items"*. Counsel arranges it on these tiers (`appraisalDuty`), so
    the desk raises it and counsel decides. The `invNeedsAppraisal` range read (§6) drives the list.
- On *Inventory with values* and *Inventory + appraisals*, it writes `fmv` and the documents print it,
  as above.
- Living clients have no tier: the agent writes `fmv`, and the client's own documents may show it.
  The valuation date is the day of the run; no date-of-death basis applies.
- A test holds it: on a no-values tier no `fmv` is written and no client builder prints an agent
  figure.

## 9 · COST

Opus 5.5 at $4 / $20 per million tokens, web search about $10 per 1,000.

| | Per line | 500-line estate, 80 `comps` lines |
|---|---|---|
| `comps` | about 5 searches ($0.05) + 30–60k tokens of results and the photos ($0.15–0.30) + answer and thinking ($0.05–0.10) ≈ **$0.25–0.45** | ≈ $20–36 |
| `general`, batched ten to a request | ≈ **$0.02–0.05** | ≈ $8–20 |
| **Per estate** | | **≈ $30–55**, against a $20k–$100k ticket |

Measure on the first real estate before tuning. Cost does not drive the model choice. Since 2026-10-26 the first choice
is the top tier (§7), about two and a half times Opus; Anthony accepted it (*"at most 1 to 5 a month"*, on $10,000 to
$40,000 jobs).

---

## 10 · TEST PLAN

- `tests/agent-value.test.js` drives the real `.gs` function against a stubbed `UrlFetchApp`: the
  request, batching and `remaining`, a per-line failure, `pause_turn`, a refusal, and **a comp whose
  URL the search never returned is dropped and the confidence falls**.
- The join, driven: a real response through the real writer, the manifest read back.
- The forbidden-field net (§1) and a whitelist round trip on every new field through `savePhotoRefs`.
- `invNeedsAppraisal` on a straddling range, estate and living; `invLotSplitState` and `maivAggregate`
  moving once values land; a desk edit taking ownership; re-run skipping valued lines; §5a's stale
  value; §8's tier rule (no `fmv` and nothing printed on a non-values tier).
- A browser step: the button, the chips, a row reading agent-valued and unreviewed with its comps,
  Accept, a WorthPoint paste, Re-value.
- Revert-verify every change.

---

## 11 · BUILD ORDER

1. `main-sync.gs`: `agentValue`, `testAgentValue()`, version bump. **Redeploy.**
2. App: `agentValueMode`, the caller, the writer, the whitelist, the provenance fields, §5a.
3. `invNeedsAppraisal`'s range read; the living notice.
4. Desk: *Value the unvalued lines*, *Unreviewed values*, Accept, Re-value, the WorthPoint lookup and paste
   (Accept and *Unreviewed values* went in 2026-10-25b: §13).
5. Tests and the browser step.
6. Manual §10a and the playbook; the counsel bundle (§8, and the client-facing basis wording).

---

## 12 · ANSWERED (Anthony, 2026-10-06)

1. **§8:** internal figures only where counsel values, used for routing and to recommend appraisals
   without a figure.
2. **An unreviewed agent value counts as valued** for FINAL; the schedule says *N values not yet
   reviewed*, as the *IN PROGRESS* stamp does, and nothing is withheld. (Since 2026-10-25b a value is
   reviewed by its line's one tick, and since 2026-10-26 a value on a line with nothing flagged stands without one: §13.)
3. **The Court Inventory and the Trust Schedule name the basis on each line** (*auction comps*,
   *general estimate*, *WorthPoint comps*, *appraisal*).
4. **An appraisal replaces the agent's figures** rather than sitting beside them (§2.3).

Still open: WorthPoint's answer to the partnership inquiry, if it changes §4.

---

## 13 · AS BUILT (P23, 2026-10-06)

Where the build settles something the spec left open, or departs from it. Each is held by `tests/agent-value.test.js`
and browser step 69.

- **Names.** Server: `agentValueLines` (action `agentValue`), `testAgentValue()`, `BACKEND_VERSION` `2026-10-06b`. App:
  `agentValueMode(ref)` (it needs no job: nothing in the rule reads one), `agentValueInternal(job)`, `_avWrite` (the one
  writer), `_avTakeValue` (who owns a figure), `agentValueUnreviewed`, `agentValueStale`, `agentValueSpecialistWorth`,
  `invValBasisWord`, `_avUnreviewedStamp`.
- **Two more fields than §5:** `valNotices` (the triage notices, kept on the line as Agent One keeps `agentNotices`) and
  `valFailed` (a line it could not value keeps the reason, §7: *"with the reason on the row"*). `valReviewedBy` and
  `valReviewedAt` record the acceptance. All on the `savePhotoRefs` whitelist; none sticky. No workbook or CSV column was
  added, so `saveInventory.gs` is unchanged.
- **The ceiling (§3) is read off the point value** (`fmv` above $250; one article's, `fmv` over `invLineQty`, since
  2026-10-26, below), and the re-run is the app's: the general answer is
  never written, the line is forced to research for the session, and it goes in the next call of the same run. The server
  values what it is asked, as asked.
- **Searches (§7).** Research: five searches and two page reads per line. Ordinary lots: eight to a request with up to
  eight searches. `max_uses` is constant per depth so the cached prompt is read back (the tool list renders first). Line
  labels are plain strings checked on the server, never an enum (an enum would change the tool on every request).
- **The URL guard (§4b)** reads links out of every tool *result* block (search results, fetched pages, and what the dynamic
  filter's code printed), never the model's own blocks (a fetch request carries a URL the model chose). A drop costs a level
  of confidence; research with no sold comparable left is `low`. An ordinary lot is not held to the sold rule.
  Since `2026-10-26b` a comparable is also one item's own page with the price that page shows (the first live
  `testAgentValue()` cited an eBay search page and a LiveAuctioneers price-results page whose price it had not seen):
  `_avResultsPage` and `AGENT_VALUE_NO_PRICE_RE` leave the rest out (`unfit`, no confidence lost, since a tool returned
  the page), so it never earns comps; the prompt's EVIDENCE rule and the `comps` field are the first net.
- **Refusal fallback.** `fallbacks: 'default'` with its beta header, per Anthropic's guidance for this model; a 400 that names
  the field is sent once more without it. `pause_turn` is continued twice at most; a request still paused is failed as
  unfinished.
- **Timeouts.** UrlFetchApp's own per-request limit (60 seconds is the commonly reported figure; the Google docs could not be
  read from the build environment) throws for the whole `fetchAll`, so a slice that throws fails its lines as *took too long*,
  nothing is written, and the run goes on (since 2026-10-26 the slice goes again on the fallback model, then comes back as
  `retry`: below). A slice is started only within 120 seconds of the call's start. Measure with
  `testAgentValue()`, which prints the elapsed time.
- **The desk.** *Value N lines* on the work bar, after *Name N shots*; *Unreviewed values* chip; *Accept value* under the
  figure; *Accept values* on the bulk bar (only lines with an unreviewed agent figure are touched; all three gone since
  2026-10-25b, below); the line's record carries
  the comparables, the WorthPoint search with Copy, *Use a WorthPoint sale* and Re-value, and nothing on a line Agent Two has
  not touched. Re-value researches one line and replaces only the agent's own figure.
- **The appraisal (§2.3)** takes the line when its source is set to Appraisal (on the line or the bulk bar), or when a figure
  is typed over the agent's on a line with an appraiser linked. Linking an appraiser alone changes nothing: the agent's number
  stands until the appraisal's figure lands.
- **§8 internal tiers:** nothing a document can print is written (`fmv`, `valDate`, `valSource`, `valNote`); a Re-value on a
  line whose earlier agent figure predates a tier change clears it. A source somebody recorded is left alone.
- **§12.2 and §12.3:** `_avUnreviewedStamp` on the Court Inventory, the Trust Schedule and the Estate Inventory PDF (it counts
  printed figures only); the Basis column lives in `_invScheduleSection`, the table both schedules share.
- **Agent Two confirms or corrects the name (2026-10-25):** Anthony, off the Ellison plates (Agent One's *likely
  Italian*, flagged *Name may be wrong* on every line): *"Why doesn't agent 1 guess and agent 2 confirm or update upon
  pricing. No need to flag inconsistencies. Just update the the best of their ability and if I see something that is
  off on the desk review, I'll change it."* `record_values` carries a required `name`, the name given or its correction
  under Agent One's naming rules; `_avRename` writes it with the figure (never without one) over a name that is still
  Agent One's and unreviewed, never over a name a person typed or ticked, keeps the replaced one as `valNameFrom` (the
  record reads *Name updated from "…"*), and the line stays unreviewed. §2.1's "it never renames" is overruled for that
  case only; the category and the quantity stay the line's. The notice kinds are `appraiser`, `specialist` and `other`:
  no notice for a name, unrecorded condition, an approximate count, a search that ran short, or a WorthPoint check (the
  row's confidence and the record's WorthPoint terms say it); at most one a line. Condition is read off the photograph
  on a research line and assumed ordinary on an ordinary lot; the count is valued as given. A mark Agent One could not
  read (*illegible*, *no visible maker's mark*) no longer sends a line to research (`AGENT_VALUE_NO_MARK_RE`). The list
  above the rows is one entry per line (*Agent Two noted N lines to look at*), and each line's record lists its notes,
  which the list's *N more* sentence had pointed to before any screen drew them.
- **The agents in a line, one look per item, and Each × Qty (2026-10-25b):** Anthony: *"we are supposed to be making this
  easy, with one review. not a multi tiered review"*; *"I want the two agents working in concert to get the best possible
  information first … I don't want them conflicting with each other and sending up a bunch of flags that need to be
  cleared"*; *"just figure out the best way for the agents to work together and to most accurately identify, describe,
  name, and price or value each item and minimize the work for the transition concierge."* Where the build departs from
  the spec above:
  - **It runs by itself** (§11's button is no longer the only way in): `agentValueAuto` follows a naming run with no room
    to check (`_agFinish`) and a room check that did not fail (`_arFinish`), on every photographed, named line with no
    figure that it has not already failed on (`_invHasPhoto`, `valFailed`). *Value N lines* and Re-value still send the
    rest. Since 2026-10-27 (P8 of the desk audit, ACC-02) neither the automatic run nor *Value N lines* sends the later line of
    a room-check pair both of whose lines the check read as plainly one thing, or a repeat of a photograph read twice
    (`agentValueWaiting`): it waits until a person presses Remove or Not duplicates, and then goes by itself (`_avDupReleased`),
    so one object is never researched twice and its two figures never both reach a schedule unsaid. A run's tail redraw waits while a box on the desk has focus, and keeps waiting as focus moves box to box
    (`_invRenderWhenIdle`).
  - **It researches Agent One's guesses:** `agentValueMode` sends a line Agent One named with low confidence, while the
    name is still Agent One's (`_avNameIsAgents`), to research, the depth that reads the photograph, so its correction of
    the name rests on sold comparables.
  - **A person's name is marked and given back:** `_avItemPayload` sends `nameChecked` on a name a person typed or
    reviewed; the line text says *Name checked by a person*, and the prompt asks for that name back exactly and the line
    valued as named (the Restoration Hardware mirror). §2.1's "never renames" now holds for those names in the prompt as
    well as in `_avRename`.
  - **A name changed on the desk is valued again by itself** (`agentValueAfterRename` from `_invEdit`, researched through
    `_avForceComps`; a run already out takes it at its tail, `_avAfter`), and a figure accepted for the old name is no
    longer accepted (§5a's badge stands only where the re-value cannot run). Anthony: *"maybe it's worth $1500 new, and then
    not $25 used, that's the point"*. A brand goes in the name (his answer: *"Type it in the name"*), and the prompt prices
    the brand on an ordinary lot; Agent One puts a maker the crew names into the name.
  - **One look per line:** §5's separate value review is gone. The line's Reviewed tick (`_invStampLineReviewed`, the
    row and the bulk bar's Mark reviewed) stamps `valReviewed` with the line's review, and `invLineReviewed` reads an
    unaccepted agent figure as not reviewed. *Accept value*, *Accept values* and the *Unreviewed values* chip are gone;
    the chip is *Not reviewed*. The schedules' *N values not yet reviewed* is unchanged (until the $100 line of 2026-10-25, and then the flagged-lines rule of 2026-10-26, below, took the values that stand out of it).
  - **One hint:** the row's *agent value* badge (and Agent One's *agent*) are gone; `invLineUnsure` marks *unsure* where
    Agent Two's figure is low confidence, or Agent One was unsure and Agent Two has not yet valued the line under that name.
  - **Each × Qty = Total:** the row's value is two boxes, Each and Total (`invUnitValue`, `unitVal` on the manifest's save
    list). The figure Agent Two writes stays the line's whole value at its Quantity (`fmv`), Each is read off it, and a
    count corrected at the desk carries Each across (`_invQtyCarriesValue`, the agent's range scaled with it; an appraised
    line never moved). The prompt says the desk reads one article's value as the line's over its Quantity.
- **The once-over (2026-10-26):** Anthony: *"do a once over on the two agents … as accurate as possible on the first pass …
  TC oversight minimized."* Apps Script `2026-10-26`, a redeploy owed (it carries `2026-10-25b`). Where the build departs from
  the spec above:
  - **The model chooses itself** (§7): `_agModels('value')`, the newest top-tier model on Anthropic's model list first (today
    `claude-fable-5-1`), the newest Opus behind it (today `claude-opus-5-5`); `AGENT_VALUE_MODEL` and
    `AGENT_VALUE_FALLBACK_BETA` are gone (`AGENT_FALLBACK_BETA` serves all three agent calls). A slice that throws, a busy
    service (429, 529, 5xx), an answer cut off at its ceiling and a request the first model rejects go again on the fallback
    (a paused turn is never replayed to another model); running long twice in a day (`_agSlow`), or a rejection the fallback
    answered (`_agDemote`), keeps the task on the fallback for the day. `AGENT_MODEL_PIN` pins one model. `testAgentValue()`
    prints the model beside each line and lists the lines to ask again; its probes carry no count in a name.
  - **A guessed name is looked at** (Anthony, 2026-10-25: *"agent 1 guess and agent 2 confirm or update upon pricing"*):
    `agentValueLooks(ref)` (the name still Agent One's, `_avNameIsAgents`, and hedged in its own words,
    `AGENT_VALUE_HEDGE_RE`: *appears to be*, *likely*, *possibly*, *probably*, *in the style of*, *attributed to*) sends an
    ordinary lot's photograph with it; `_avUserContent` labels it with the line and keeps the lot ordinary (no close-ups, no
    research). A photograph that cannot be read costs that lot its picture, never the batch its answer.
  - **What the photograph a line shares says** (`_avPhotoContext`): `room`; on a photograph several lines share, `photoNote`
    (the crew's note said over it, sent once as the photograph's, marked as possibly about another thing; the line's own
    `fieldNote` is then sent only on a split line) and, with a photograph, `alsoListed` (what else is listed off it) and
    `roomNote` (the walkthrough's note for the room). A name a person typed goes without `agentBasis` (the Restoration
    Hardware mirror went with *no visible maker's mark*). Research labels the main photograph and each close-up.
  - **The category, under the name's rule** (Anthony: *"Yes, same rule as the name"*): the categories ride the payload
    (`_avContext`'s `categories`, `INV_CATEGORIES`; the backend holds no copy, Agent One's rule), `record_values` then
    requires `category`, the server keeps it on a research line only (`_avLineResult`), and `_avWrite` writes it, before the
    rename, where `_avNameIsAgents` holds and the category is on the list. §2.1's "never the category" is overruled for that
    case only; the quantity stays the line's. On review (2026-10-26): never out of Firearms, the category that switches the
    firearm gates on (the server drops a change on a line filed Firearms, `_avWrite` refuses one; into Firearms only adds the
    protocol), and never over a category a person set across a selection (`catBy`, sent as `categoryChecked`).
  - **No sold comparable, no comps:** a research answer with no sold comparable kept is written `General estimate`
    (`_avLineResult`; it printed *auction comps* on the Court Inventory and the Estate Inventory Report); an unknown source on
    an ordinary lot is `General estimate`, never `Online comps` (`_avWrite`).
  - **A best estimate, marked unsure** (Anthony: *"Best estimate, marked unsure"*): `unvalued` is only for a line the model
    cannot identify, or papers and records; thin evidence is a figure at confidence `low`, which the row marks unsure. On an
    ordinary lot confidence measures how well the going rate for that kind of lot is known, not citations.
  - **The basis is printed** (`valNote`, on the Estate Inventory Report and the workbook): one plain sentence of evidence,
    about twenty words, never the line's count or its name, so it stays true when a person corrects Qty. An estate's figure
    is a problem understated as well as overstated.
  - **Brands and electronics:** retail and designer furniture and decor (Restoration Hardware, Pottery Barn, Crate & Barrel,
    Arhaus, Ethan Allen) at what it fetches second-hand, never the brand's retail page; modern electronics by model and age.
    Research searches where a thing sells (auction results and dealer sales for art, antiques, silver, jewellery and rugs;
    resale and consignment for branded furniture, decor and electronics). Ordinary lots of one kind in a batch share one
    search.
  - **The ceiling reads one article** (§3; Anthony: *"One item's price"*): `agentValueApply` tests `fmv / invLineQty`
    against `AGENT_VALUE_GENERAL_CEILING`, so 24 everyday plates at $12 each are no longer researched.
  - **`retry`, a passing failure:** the server answers a request past UrlFetchApp's limit (once the fallback has had it), a
    busy service and a line the model skipped under `retry`, never `failed`. `_avSendNext` sends each once more in the run
    (`st.retried`) and then leaves it with nothing written and nothing stamped (`st.later`: *N did not come back (slow or
    busy): they go with the next run, or press Value N lines*). `failed` stays the verdict (the model's own unvalued, a
    refusal, a cut-off on the fallback, prose) and is stamped `valFailed` as before.
  - **The run waits its turn:** `agentValueAuto` queues itself behind a run already out (`_avAutoAgain`, taken by
    `_avFinish`) instead of being skipped; *Value N lines* pressed then says a run is out. A naming run that named something
    before it failed still hands on, and a room check already out takes Agent Two at its own tail (`_agFinish`).
  - **A rename and a close-up:** `agentValueAgain(job, ref)` (queued in `_avAfter`, or forced while a run is out): the stale
    note reads *Agent Two is valuing it again for the new name* and `_avPanelHtml` withholds Re-value. `agentValueAfterCloseUp`
    (from `invAddCloseUp` and `invRetryCloseUp`, once the close-up is in Drive) researches the line over the agent's own figure
    or none, never a reviewed, typed or unphotographed line; `invLineCloseUps` sends the newest close-ups first (a split
    line's own before its photograph's), so one added at the desk to a line with four from the field is read.
    `agentValueAfterRename` skips a typed or unphotographed line.
  - **Notices and the hint:** `agentValueNotices` adds the app's *worth a specialist* only where Agent Two's own notes do not
    already say it, and the row's badge goes once the line is reviewed. `invLineUnsure(ref, job)` reads no agent figure where
    counsel values (`agentValueInternal`), and a guessed name is settled only by a figure made under it at medium or high
    confidence; the work bar's *Unsure* chip gathers them, third after *Unnamed shots* and *Not reviewed*: a filter on the
    row's hint, never a tick or a review of its own. *Mark reviewed* names the unsure and noted lines it swept, and says when
    Agent Two is still valuing lines on the job. Since 2026-10-27 (the merge's review) it names the lines a tick leaves open,
    unnamed or in a possible duplicate, in place of the duplicate pairs it swept past: since the flagged-lines rule (below) a
    tick never takes a line out of *Possible duplicates*.
  - **Walkthrough collections:** `collectionLineWithPhoto` clears the walkthrough's `fmv` once the line is photographed
    (unless a person or an appraisal owns it), and `collectionUseLine` carries it only when owned, so Agent Two values the
    collection and an appraiser's figure replaces Agent Two's when it lands (Anthony: *"a flagged collection will almost
    certainly go to an appraiser or specialty buyer … Good to know the value going in"*).
- **Anthony at the desk (2026-10-26b, Apps Script `2026-10-26b`):** off a client the earlier agents had valued.
  **Whole dollars each** (*"Do we say $10 or do we say $12?"*; he took *"Whole dollars each"*): `_avWrite` writes the figure
  and both ends of its range through `agentValueWhole(x, qty)`, one article's share to the nearest dollar times the count
  ($75 for seven plates is $11 each, $77), from `AGENT_VALUE_WHOLE_FROM` ($10) each, under it in cents; a typed figure stays
  as typed. (Between $1 and $10 each the rounding moved a group a long way, sixty forks at $1.25 becoming $60; asked, Anthony
  took *"From $10 each"* on 2026-10-27, and the threshold moved up from a dollar.)
  **Condition** (*"Agents grade it"*): `record_values` carries `condition` where the app sends its grades; the server keeps it
  only for a line whose photograph the request carried (`unit.saw`), and `_avItemPayload` sends a line nobody has graded with
  its photograph (`agentValueGradesCondition`), still an ordinary lot. **Re-value across a selection** (`invBulkRevalue`, *"Re-value
  on the bulk bar"*): the record's rule, each line at its own depth. **A comparable is one item's own page with its price**
  (above, §4b). **A note ends on a whole sentence** (`_avClip`): one had stopped at *Check whether this is*; a note is asked
  for in under forty words.
- **Only flagged lines take a tick (2026-10-26, Q106; it replaced the $100 line of 2026-10-25, Q99, and carries Q100
  to Q105):** Anthony: *"we will be obviously going back to the office and looking over the entire inventory list
  ourselves to make sure everything looks right … this is our job at night. The agent identifies everything and then
  values it. And then we go back and we go over the list and we make sure it makes sense. And we verify it with what
  we saw on site"*; he took *"Only flagged lines"*. There is no value limit: `INV_REVIEW_FLOOR`, `invLineUnderFloor`
  and `_invFloorStampWords` are gone. One predicate, `invLineAccepted(ref, fc)` (`!invLineHold(ref, fc)`, below),
  asked first by `invLineReviewed`, with the job-wide facts in `fc` (`invAcceptCtx(job, all)`: the job, every line in
  an open `agentDuplicateGroups` group, and the lines by id, `byId`; the desk's paint reads its cached index and lines
  through `_invAcceptCtxOf`, `_agDupSet` and `_agDupById`; with no context no line stands): a live line with a name, a
  destination (not Undecided, not Hold) and a figure, Agent Two's (`_avHasFigure`, the range alone only where counsel
  values, `agentValueInternal`; where the papers state values `_invHasValue`), the desk's (`valuedBy` desk with a
  value, Q105) or an appraisal's typed from the report (`valuedBy` appraiser and `invAppraised`), stands with no tick
  unless it is flagged: any line on a disputed estate (`gateDispute`, Q102; a line named and decided on the desk is
  reviewed by that act there too); a firearm, `flagNFA` or ammunition in the name or in `valNameFrom`
  (`INV_ACCEPT_AMMO_RE`, rewritten 2026-10-26 in the second review: a calibre or a gauge with a round, a shell or the
  calibre's own suffix, *22 LR*, *45 ACP*, *300 Win Mag*, *6.5 Creedmoor*, and the words ammunition, ammo, shotshells,
  shotgun shells, gunpowder, black and smokeless powder, buckshot, birdshot, rimfire, centerfire, percussion caps,
  reloading supplies and named primers; black powder-coated furniture, gunpowder tea, paint primers, sea shells and a
  bare gauge, as on a brad nailer or an extension cord, stand; the lists that must hold and must stand are in
  `tests/review-flagged.test.js`); a figure with no owner (`unowned`: a value with no `valuedBy`, such as a
  walkthrough collection's); `agentValueStale`; Agent One's name and Agent Two's figure both low (Q101; either alone
  stands, and `invLineUnsure`'s hint still shows on it, Q108, below); `needsAppr`, `apprId`, `invNeedsAppraisal(ref,
  job)` (the appraisal threshold in any category; an intrinsic category with no value) or `agentValueSpecialistWorth`
  (living work), until the appraisal's figure is on the line or the appraisal is waived (`apprWaived`;
  `waiveAppraisal` repaints the row's box, its group and the work bar through `_invReviewRepaint`); `flagBequest`,
  `flagDisputed`; its own `agentNotices` while not quiet (`agentNoticeQuiet`), its `valNotices` while the figure is
  Agent Two's, or an Agent One note still open on its photograph's line (`_invPhotoNoteOpen`, which reads that line
  from `fc.byId`, else from the manifest, removed or not: any note on it not yet quiet holds every line off the
  photograph until each is reviewed, a *Look at this* going quiet once every line still listed off the photograph is
  reviewed, a *Must find* once every must-find is found, a *Firearm* or *Possible NFA item* never; a removed photograph
  line's notes, all of them, ride on the first line still listed off it, `agentNoticesOn`, so the list above the rows and
  that line's record show what holds the lines); an open duplicate group (`fc.dup`; a tick never
  answers one, since `_agDupEligible` no longer leaves out reviewed lines, and since the second review a rename or a
  category change does not either: `_agWrite` keeps Agent One's own reading as `agentName`, on `savePhotoRefs`' list
  and `collectionLineWithPhoto`'s drop list, and `agentDuplicateGroups` keys on `agentName`, else `valNameFrom`, else
  `objectName`; only Remove or Not duplicates, since 2026-10-27 recorded for the pair as `dupOKWith`, `agentDupCleared`); any `invReleaseCautions`. A lot over the Form 706 article cap
  is not a hold (a tick does not split a lot; *Lots to split* asks for it). The intrinsic categories and MAIV are no
  longer flags of their own (the $100 line's were). Sterling that looks like stainless is the photography guide's
  close-up of the mark (Q103), never a rule. Nothing is written to the line: `invLineAcceptedOnly` (accepted, Agent
  Two's figure, no `valReviewed`; on a paper that prints no values also no `reviewed` and not `namedBy` desk) is
  `_invReviewStats`' `accepted`, and every other reviewed line is "checked" (a tick before Agent Two's figure landed
  is not a look at the figure). `_invProgressStamp` prints *IN PROGRESS — 30 of 32 items checked; 158 accepted as
  valued* (*accepted as named* on the Contents List, the Disposition Ledger and the Contents Record; Q100) and, once
  the list is read, *REVIEWED — read by Anthony Graziano, October 26, 2026; 42 items checked; 158 accepted as valued*
  (Q107, below); `_avUnreviewedStamp` (§12.2's count) counts in *N values not yet reviewed* only unreviewed agent
  values on lines that do not stand (flagged, or not yet decided) and prints how many stand beside it on the Court
  Inventory and the Trust Schedule (Q104; `_avAcceptedPill`, bronze until the list is read, Q109, below; the Estate
  Inventory Report's own stamp names them, `noAccepted`). The row's box is ticked in grey and still pressable, and a
  press records the person's look (`_invStampLineReviewed`); the work bar reads *N of M reviewed · K accepted*. Agent
  Two is still never told a threshold, and no backend changed.
- **The list read, the hint on any guess, and the reason a line is held (2026-10-26, Q107 and Q108; restated the same
  day after the second review, with Q109):** the night's read is the review (Q106), and the app cannot witness a read
  it is not told of: with the agents finishing by themselves, a paper printed *REVIEWED* before anyone had opened the
  desk. Anthony took *"One 'List read' press"* (Q107): **✓ I've read the list** on the work bar runs
  `invMarkListRead(jobId)`, which records `job.invRead = {at, by, seen}` (`_invStampBy`) as a person's edit
  (`_saveJobEdit`). **The read is a fingerprint, never a time:** `invListSeen(jobId)` is `<count>:<FNV-1a hex>` over
  every inventory line in `_photoRefs` (label `inventory`, no `collId`, removed lines included and marked), sorted by
  `stableId`, of `INV_READ_FIELDS` (`objectName`, `category`, `qty`, `fmv`, `valLow`, `valHigh`, `valSource`,
  `disposition`, `channel`, `condition`, `roomIdx`), what the papers print of a line; `invListRead(job)` answers `{at,
  by, current}`, current while `seen` equals the fingerprint now. It replaced `invListChangedAt` (the newest
  `updatedAt` of any line against the press), under which a tick, or a room check that found nothing (`dupChkAt`),
  unread the list, and a change made on another device before the press but merged after it counted as read. Now a
  tick, `dupChkAt`, custody events, approvals, item numbers and notices never unread it; a merge from another device
  that changes a printed field, a removal or a restore, and Agent Two's own writes do, whatever the clocks. **Pressed
  only on a copy that has read the sheet:** `invListReadRefusal(jobId)` answers *the list is still loading from the
  sheet* while `_invManifestUnread(jobId)` and *the sheet is unreachable: this is this device’s copy* while
  `_invCloudFailed[jobId]`; the work bar then shows `<why>: the press waits for it` in place of the button, and
  `invMarkListRead` refuses with `Not recorded: <why>. Press it once the list has been read from the sheet.` and
  records nothing. `_invListReadHtml(job, st)` always draws the host `#inv-read-<jobId>` carrying `data-rk`
  (`_invReadKey(job, st)`), empty unless `st.accepted > 0` (a list every line of which a person checked asks no read),
  and `_invReadLineRepaint` redraws `#inv-workbar` whole when the key moved: after an edit (`_invEdit`), and after a
  sheet read that changed nothing (`_invRefreshFromCloud`, where the line still said *the list is still loading from the
  sheet*). Where any line stands as the agents left it
  (`accepted > 0`), `_invProgressStamp` prints *REVIEWED* only on a current read, naming it (`invListReadWords`: *read
  by Anthony Graziano, October 26, 2026*, or *read October 26, 2026* where no name was recorded; it read *read by the
  desk*); with every line checked or standing and no current read it prints *IN PROGRESS — 42 items checked; 158
  accepted as valued; the list not yet read* (*… since it last changed* where an older read exists) with the caveat
  *Every item needing a closer look has been checked; the list as a whole has not been read through* (it said *Every
  item is named and decided*, untrue over a ticked Undecided line and on the Contents List, which states no
  disposition). With nothing accepted and the review incomplete it reads *N of M items reviewed* (*0 of 1 item
  reviewed* on a list of one); where nothing stands the stamps read as before. **Bronze until read (Q109):** the Court
  Inventory and the Trust Schedule stay FINAL; `_avUnreviewedStamp` hands their count of standing values to
  `_avAcceptedPill(f, fc, pill)`, grey `#6b6b6b` *N accepted as valued · list read by …* once the list is read, else
  bronze `#8a6d3b` *N values as Agent Two left them; list not yet read by Havellin* (*1 value as Agent Two left it;
  …*), with *since it last changed* where an older read exists (`_avReadWords` is gone; a grey pill above the
  representative's signature line read as an approval). The work bar's sentence is drawn while `st.total &&
  (!st.complete || readOwed)`, `readOwed` being `st.accepted > 0` with no current read: *Client documents print with
  an IN PROGRESS stamp until every flagged item is checked and the list is read since its last change — they are never
  withheld.* (the second clause only while the read is owed), or, every flagged item checked, *… until the list is
  read since its last change — they are never withheld.* `probatePackageGaps` names *the list not yet read* (*… since
  it last changed*) where named live lines stand with no current read. Q108 (*"Show it, no tick"*):
  `invLineUnsure(ref, job)` asks `invLineReviewed(ref)` with no context (the job says only whether counsel values,
  above), so the bronze *unsure*, and the line's place under the *Unsure* chip, show wherever either agent was guessing,
  on a line that stands too, until a person's look; since the second review a person's
  figure on the line (`valuedBy` desk or appraiser with `_invHasValue`) is that look (Q105); the tick is still wanted
  only where both guessed. **The reasons:** `_invLineHolds(ref, fc, every, only)` is the one rule and
  `invLineHold(ref, fc)` its first reason (or `''`), in this order: `gone`, `nocontext`, `dispute`, `firearm`,
  `noname`, `nodest` (none or Undecided), `onhold` (Hold), `nofigure` or `unowned`, `stale`, `guess`, `appraisal`,
  `bequest`, `disputed`, `note`, `valnote`, `photonote`, `duplicate`, `caution`; `every` lists every reason, `only`
  asks only the reasons it names. `INV_HOLD_WORDS` words each. **What a tick cannot answer:** `INV_OPEN_HOLDS`
  (`noname`, `duplicate`) through `invLineOpen(ref, fc)`, so `invLineReviewed` answers false for such a line whatever
  its tick (after the accepted check; with no context as before); an Undecided or Hold line ticked is reviewed,
  deliberately (a state a person may leave a line in at night). The row's box (`_invRevBoxHtml`) names every reason:
  `Needs a look: <a>; <b>. Tick it once checked.`; an open line `Still open: <words>. A tick does not settle it.`
  (*these* for two), then `Also needs a look: <others>.` where any; a ticked open line is drawn checked in bronze,
  `Ticked by <who>, but still open: …`; a standing appraisal figure *Reviewed: the appraisal’s figure, nothing
  flagged*, a desk figure *Reviewed: a figure recorded on the desk, nothing flagged*. `_invEdit` repaints, through
  `_invReviewRepaint`, the box of every other line whose membership in `_agDupSet` the edit changed. No backend
  changed.
- **A listing survey counts (2026-10-27, Apps Script `2026-10-27`; Q110):** Anthony, off a new eBay developer account:
  *"if we see literally dozens of listings on eBay and Etsy, can't we use that to triangulate some sort of value even if we
  don't have true sold comps"*; he took *"A listing survey counts"*. Server: `record_values` on a research line requires
  `survey` (`count` an integer, `low`, `median`, `high` for one article, `url`; a count of 0 and an empty url where none was
  counted); `_avSurvey(s, seen)` keeps it only with a whole count of one or more, three prices in order and above nothing,
  and a URL a tool result returned (a results page allowed: counting one is the point); `_avLineResult(v, mode, seen, qty)`
  reads one article's figure (`fmv` over the line's `qty`, which `agentValueLines` passes) against the middle price, and
  with no sold comparable kept, `AGENT_VALUE_SURVEY_MIN` (10) or more and that figure at or under the middle price answers
  `medium` at most and source `Listing survey` (`AGENT_VALUE_SOURCES.survey`), after a dropped comparable has cost its level;
  otherwise `low` and `General estimate`, as before. A sold comparable decides over a survey, which still rides the answer.
  The prompt's EVIDENCE rule (*LISTINGS ARE A CEILING*) and the confidence scale read the constant; `testAgentValue()`
  prints a survey. App: `_avSurveyOf` checks it again and `_avWrite` writes `valSurvey` (removed by a Re-value that counted
  none; on `AGENT_VALUE_OWN`, so an appraisal takes it off; on `savePhotoRefs`' whitelist); *Listing survey* joins
  `INV_VAL_SOURCES` (the schedules' word *listing survey*) and the app's `AGENT_VALUE_SOURCES` (a desk figure typed over it
  drops it); `_avPanelHtml` draws *LISTED · N close listings for sale, $low to $high each, middle $median* with *the page
  counted*. `invLineUnsure` reads `valConf`, so a medium survey figure carries no *unsure*. `BACKEND_MIN_VERSION`
  `2026-10-27`. `tests/listing-survey.test.js`, browser step 115.
