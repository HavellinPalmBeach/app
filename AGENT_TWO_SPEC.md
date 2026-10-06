# AGENT TWO — VALUE THE INVENTORY

**Status: spec, not built (2026-10-05).** Step 3 of the inventory pipeline Anthony scoped on 2026-09-19
(step 1 the two-pass field camera, step 2 Agent One, `AGENT_ONE_SPEC.md`). This file is the design
and the decisions behind it; nothing here is live. Build it as its own pack, after the `2026-10-05`
redeploy.

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
   (`valSource: 'Appraisal'`) wins; the agent's figure stays in the record as the prior estimate.
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

- A general estimate is a figure for the schedule, not research. *"Stainless flatware, service for 12,
  everyday brand, $40 to $60"* is the whole job.
- **A general estimate that comes back above `AGENT_GENERAL_CEILING`** (a starting figure, $250) is
  re-run as `comps` in the same pass: the lot is worth more than "ordinary".
- `general` lines are batched (about ten to a request); `comps` lines go one to a request, with the
  photo and its detail shots (the maker's mark is what makes a comp a match).

---

## 4 · SOURCES

| Source | Access | Use |
|---|---|---|
| **Claude web search** (`web_search_20260209`, with `web_fetch_20260209` to read a results page) | Server tool on the Messages API; about $10 per 1,000 searches plus tokens | Every line. The default |
| **WorthPoint** | Subscription only, no public API found. Browser automation ruled out: no server to run it on (Apps Script cannot drive a browser), the terms very likely forbid bots, and it breaks on every redesign | By hand on `comps` lines: the agent writes the lookup (§4a); a person pastes the best record back |
| **eBay** | Sold data is closed: Marketplace Insights is not open to new developers, `findCompletedItems` was shut down in February 2025, the Browse API returns active listings only, and the sold search now needs a login | None. An active listing is an asking price; the agent may cite one only as `asking` |
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
- A comp states `sold` or `asking`. An asking price never sets the point value alone; a line with no
  sold comp is `confidence:'low'` whatever else it found.
- The point value is the agent's reading of the sold comps adjusted for condition, and `valNote`
  says how in one sentence (*"Median of 4 sold, 2024–2026; chip to rim, low end"*).

---

## 5 · FIELDS, PROVENANCE AND RE-RUN

Written by the agent:

| Field | Meaning |
|---|---|
| `fmv` | The point value, to the cent (`roundCents`) |
| `valLow`, `valHigh` | The range |
| `valDate` | The valuation date: the date of death on an estate (`job.deathDate`), the day of the run on a living job (`_todayStr`) |
| `valSource` | `Auction comps`, `Online comps` or `General estimate` |
| `valNote` | One sentence of basis, as today (*Valuation Basis / Comps*) |
| `valComps` | `[{title, venue, saleDate, price, url, kind}]` |
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
  chip beside *Unnamed shots*, and **Accept** on the row.

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
| Model | `claude-opus-5-5` (`AGENT_VALUE_MODEL`, its own constant; measure before changing) |
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
      "basis": "Median of 4 sold sets of 8, 2025–2026, adjusted for one chipped rim",
      "comps": [ { "title": "Herend Rothschild Bird dinner plates, set of 8", "venue": "LiveAuctioneers",
                   "saleDate": "2026-03-11", "price": 700, "url": "https://...", "kind": "sold" } ],
      "lookup": "Herend Rothschild Bird dinner plate",
      "notices": [] } },
  "remaining": 42,
  "failed": { "7_r9_inventory_...": "no sold comparables found" } }
```

`failed` is per line and never fatal; the app re-asks for what is left. A line it could not value
stays unvalued with the reason on the row, never a guess.

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

Measure on the first real estate before tuning. Cost does not drive the model choice.

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
4. Desk: *Value the unvalued lines*, *Unreviewed values*, Accept, Re-value, the WorthPoint lookup and paste.
5. Tests and the browser step.
6. Manual §10a and the playbook; the counsel bundle (§8, and the client-facing basis wording).

---

## 12 · OPEN, FOR ANTHONY

1. ~~§8~~ Answered 2026-10-06: internal figures only where counsel values, used for routing and to recommend appraisals without a figure.
2. **Does an unreviewed agent value keep a schedule from reading FINAL?** Today a schedule is FINAL
   only with every line valued. Recommended: an unreviewed agent value counts as valued but the
   schedule says *N values not yet reviewed*, like the *IN PROGRESS* stamp, and nothing is withheld.
3. **Does the Court Inventory or Trust Schedule name the basis per line** (*auction comps*, *general
   estimate*)? Recommended yes: it is what makes the figure defensible, and the column exists.
4. **WorthPoint's answer** to the partnership inquiry, if it changes §4.
