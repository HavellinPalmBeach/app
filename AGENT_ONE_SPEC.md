# AGENT ONE — BUILD INVENTORY FROM THE PHOTOGRAPHS

**Status: specified, not built (2026-09-22).** Step 2 of the inventory pipeline Anthony scoped on
2026-09-19. Step 1 (the two-pass field camera) shipped that day; step 3 (Agent Two — Value) is a
separate build and this spec deliberately does not touch it.

Anthony, on what the field is for: *"the whole point is that we don't take the time to name objects
in the field. we just capture per room and the agent names."*

---

## 1 · WHAT IT IS

`_captureShot` already writes a blank line for every Items-pass shot:

```js
ref.objectName = '';                     // the desk names it
ref.category = INV_DEFAULT_CATEGORY;     // the desk files it
```

That is the whole opening Agent One exists to fill. It does **two** things and nothing else:

| | |
|---|---|
| **Split** | A frame holding several objects becomes N manifest lines. `invSplitItemN(jobId, stableId, n)` already exists, was written for this caller, caps at `INV_SPLIT_MAX` (200), and writes once per batch |
| **Name** | `objectName` (free text) and `category` (from the closed 13-entry `INV_TAXONOMY`) on every line |

Plus two read-only sweeps that produce **notices for a person**, never manifest writes: the
**must-find sweep** (§6) and **firearms recognition** (§7).

### ⚠ WHAT IT IS NOT, AND WHY EACH ONE IS A HARD NO

| Field | Why the agent may never write it |
|---|---|
| `fmv`, `valDate`, `valSource`, `valNote` | Agent Two's. And `docTierProduces(job,'values')` is **false** at the `contents` and `none` tiers, where the agreement says Havellin *"states no opinion of value"*. An agent writing FMV breaks a signed contract term |
| `disposition` | `Undecided` is the deliberate default. *Silence reading as Keep* is the defect that default exists to stop, and an agent guessing is silence wearing a name |
| `flagBequest`, `flagDisputed`, `flagExempt`, `assetTrack` | Facts about the will, the matter and the court. Not visible in a photograph, at any resolution |
| `flagNFA` | `invTransportBlocked`'s `nfa` arm has **no override** and no person with standing to clear it. A model must not write into a gate nobody can unlock. See §7 |
| `needsAppr` | Already **derived** from category by `invNeedsAppraisal`. Choosing the category correctly IS how the agent feeds that rule; a second writer is the two-copies drift this codebase keeps paying for |
| `authBy`, `approvalDate`, `channel`, `receiptDoc`, `gross`, `fees` | Records of things that happened between people |
| `itemNo` | Issued once by `_invAssignItemNos` and spent forever. Never an agent's to mint |

A test asserts the agent's write path touches **exactly** `objectName`, `category`, `qty`, and the
provenance fields in §8 — and that a schema carrying any key above fails.

---

## 2 · DECIDED (Anthony, 2026-09-22)

1. **Writes directly, flags unchecked.** Not a proposal queue. The agent writes `objectName` and
   `category`, stamps `namedBy:'agent'`, leaves `reviewed:false`. The review columns, the
   *IN PROGRESS — N of M items reviewed* stamp on every client document, and the *Unnamed shots*
   worklist chip all already exist, so this costs almost nothing and the desk corrects in place.
   **⚠ Review still gates nothing and locks nothing** — that rule is from the 2026-09-01 workspace
   build (*"we may want to show in-progress work to clients during an engagement"*) and Agent One
   does not get to change it.
2. **Firearms: category yes, `flagNFA` never.** §7.
3. **A button at the desk.** Job Admin & Inv, beside the *Unnamed shots* chip. Nothing fires from
   the field and nothing fires unattended.
4. **Lot by default, itemize what earns it.** §2a.
5. **As detailed as the photograph supports, hedged where it is inferring.** §2b.
6. **Low confidence is named, marked and painted amber.** §2c.

### 2a · LOT BY DEFAULT

A shelf of books, a drawer of flatware, a box of glassware is **one line with `qty:N`**, not thirty.

| | |
|---|---|
| **Lot** | books, flatware, glassware, linens, kitchenware, tools, ordinary household goods |
| **Itemize** | the nine `intrinsic:true` categories (Art & Décor, Antiques, Jewelry & Watches, Silver & Precious Metal, Rugs & Carpets, Collectibles, Firearms, Wine & Spirits, Musical Instruments), anything carrying a readable maker's mark or signature, anything visibly individual |

Target **300–600 lines** on a large estate rather than 3,000. That keeps the desk review human-sized,
the repaint near 350ms and the manifest well inside quota — the two critical-path items in §11 are
survivable at this scale and are not at ten lines a frame.

⚠ **The agent is still never told the $100-an-article threshold.** `invLotSplitState` stays the one
authority and catches a lot that is over the cap once Agent Two values it. §9.

### 2b · NAMING — AS DETAILED AS THE FRAME SUPPORTS

Anthony, overruling a more conservative first draft: *"i liked that the first run you were able to
guess that my speakers were B&O, because they are. and you flagged the banksy as likely a
reproduction, which it is. so get as detailed as possible. when we think there is something of value
we will go out of our way to photograph the artists signature, flip the china over to show the makers
mark, etc. we can always edit at desk, but more detail is helpful and we will confirm, which is our
job."*

- Name the **maker, model, period, material and pattern** whenever the frame supports it. A generic
  name is a wasted line; the desk cannot add detail it was never shown.
- **⚠ HEDGE IN THE WORDS WHEN INFERRING, AND THAT IS THE WHOLE SAFETY MECHANISM IN THE TEXT ITSELF.**
  *"Bang & Olufsen Beolab speakers"* when the badge is legible; *"appears to be Bang & Olufsen"* when
  it is the form. *"Banksy print, likely a reproduction."* **Both of Anthony's own examples were
  hedged, and the hedge is what made them useful rather than reckless.** A flat assertion is reserved
  for what is readable in the photograph.
- The confirming is Havellin's job and the app already carries the state for it: `namedBy:'agent'`
  plus `reviewed:false` plus the *IN PROGRESS — N of M items reviewed* stamp on every client
  document. An attribution nobody has confirmed is visibly unconfirmed.

**⚠⚠ THIS MAKES THE DETAIL SHOT A BUILD REQUIREMENT, AND IT IS THE THING THE FIRST DRAFT MISSED.**
The crew already flips the china over and shoots the maker's mark — `label:'detail'` with a `groupId`
pointing at its parent, excluded from `_jobInvRefs` so it never becomes its own line. **Agent One must
be handed those detail frames grouped with the item they belong to**, in the same request, or the one
photograph in the house that proves the attribution is the one it never sees. The `shots` payload
in §4 carries a `details: []` array per item for exactly this.

### 2c · LOW CONFIDENCE

Named anyway, `confidence:'low'`, row painted amber on the desk. A blank is indistinguishable from a
row the agent never reached, and it would leave the *Unnamed shots* chip permanently non-zero.

---

## 3 · ARCHITECTURE — WHY IT RUNS IN APPS SCRIPT

⚠⚠ **THE API KEY CANNOT LIVE IN `havellin.html`.** One public file, served from GitHub Pages. This
file already records the same lesson twice: a Google client secret pasted into a chat on 2026-09-08,
and the DocuSign private key that had to go to Script Properties because *"a private key in a
View-Source-able page is not a secret."*

So the model call is a **new backend action in `main-sync.gs`**, `ANTHROPIC_API_KEY` in Script
Properties, identical in shape to `esignSend` / `stripeLink` / `htmlToPdf`.

- **⚠️ REQUIRES AN APPS SCRIPT REDEPLOY.** Bump `BACKEND_VERSION`, add `agentIdentify` to
  `BACKEND_ACTIONS` (the dispatch-parity test fails otherwise) and to the app's `BACKEND_NEEDS`,
  with its consequence in `BACKEND_FEATURE_COST` (*"the desk cannot name shots automatically"*).
- **The image bytes never reach the browser for this.** `getDriveThumbnails` already proves the
  path: Apps Script runs as the Havellin account and can read a Shared Drive file directly.
  **⚠ Use `getBlob()`, never `getContentText()`** — the latter decodes bytes as UTF-8 and is lossy,
  the trap `_dsFetchBlob` was written to avoid.
- **⚠ `DriveApp.File.getThumbnail()` IS NOT A THUMBNAIL.** Measured on a real Havellin photo it
  returned the whole 130KB image. Agent One wants the **full** image anyway (a thumbnail cannot be
  named from), so take `getBlob()` and size-check it, but do not reuse the thumbnail chain.

### The model

| | |
|---|---|
| Model | `claude-opus-5` |
| Thinking | `{type: 'adaptive'}` |
| Effort | `output_config: {effort: 'medium'}` — identification is **perception, not reasoning**, and high effort buys little here. Sweep low/medium/high on one real room and measure before fixing it |
| Output | Structured, via a `strict: true` tool or `output_config.format`. Never free text parsed with a regex |
| Caching | `cache_control` on the system prompt + taxonomy block. It is byte-identical across every photo on the job |

---

## 4 · THE WIRE

### Request (app → Apps Script)

```json
{ "action": "agentIdentify",
  "jobId": 7,
  "context": {
    "matterType": "trust",            // from matterTypeOf(job) — affects nothing the agent writes,
                                      // but tells it whether this is a decedent estate
    "fiduciary": true,                // invFiduciaryMode(job)
    "categories": ["Antiques", "..."],// ⚠ SENT, never held server-side. The 6-against-13 drift
    "mustFind": ["cash in the study", "..."]
  },
  "shots": [
    { "stableId": "7_r3_inventory_...", "fileId": "1AbC...", "room": "Kitchen",
      "roomNote": "Family very sensitive about the study",   // walkthrough note, if any
      "fieldNote": "top shelf is the good china",            // hold-to-talk note, if any
      // ⚠ THE DETAIL FRAMES RIDE WITH THEIR PARENT (§2b). These are the maker's mark, the
      // signature, the hallmark — the one photograph that turns a guess into a reading. Sent
      // as extra images in the SAME request, never as shots of their own: _jobInvRefs excludes
      // label:'detail' by design and a detail frame must never mint a line.
      "details": [ { "fileId": "1XyZ..." } ] }
  ] }
```

⚠ **`categories` RIDES THE PAYLOAD AND THE SERVER HOLDS NO COPY.** `saveInventory.gs` once held its
own category list and it drifted to **6 against 13**, silently dropping seven categories off the
client's workbook. Same rule here.

### Response (Apps Script → app)

```json
{ "ok": true,
  "results": {
    "7_r3_inventory_...": {
      "objects": [
        { "name": "Bang & Olufsen Beolab 8000 speakers, pair",
          "category": "Electronics & Appliances",
          "qty": 2,
          "confidence": "high",           // high | medium | low
          "basis": "badge legible in detail frame",  // why it named what it named — read by the
                                                     // desk, never printed on a client document
          "crop": [0.12, 0.30, 0.55, 0.88] // x0,y0,x1,y1 normalised — CAPTURED, NOT YET RENDERED
        }
      ],
      "notices": [
        { "kind": "mustfind", "text": "A wall safe is visible behind the painting, left of frame." }
      ]
    }
  },
  "done": ["7_r3_inventory_..."],
  "remaining": 118,
  "failed": { "7_r9_inventory_...": "Drive file not found" } }
```

- **`objects: []` is a legal answer** and means *nothing inventoriable in this frame* — an empty
  room, a wall, a misfire. `invSplitItemN` already handles an explicit `0` by minting nothing:
  *"a real answer from an identifying agent, and minting a blank line for it would be inventing an
  object."*
- **`failed` is per shot, never fatal to the batch.** A Drive file that has not landed yet is
  ordinary and the app re-asks later.

---

## 5 · BATCHING, RESUME AND FAILURE

Apps Script's ceiling is a **6-minute execution limit**, and a vision call runs 10–30s.

- `UrlFetchApp.fetchAll()`, ~10 photographs in flight at a time.
- **Stop on a budget and hand back `remaining`** — exactly what `getDriveThumbnails` does today
  (*"Stop before the response gets too large rather than failing the whole batch. The app asks
  again for whatever it still does not have."*). Target ~100 shots per invocation.
- App side copies `_invEnsureThumbs`: batch, **mark tried BEFORE the request** so a failure cannot
  be re-fired by the next render, then re-fire while `remaining` is non-zero. A named failure on
  screen, never a silent one.
- ⚠ **NOT the Batch API.** It halves the cost and adds up to 24 hours. The desk wants tonight's
  shots named tonight, and the saving is ~$3.

---

## 6 · THE MUST-FIND SWEEP

⚠ **This is the highest-stakes thing in the build and nothing in the app does it today.**

Intake asks *"is there anything you want us to find?"* (`mustFindItems(job)`). Nothing has ever read
those answers **against the photographs**. Agent One looks at every frame in the house, so it is the
best-placed thing in the business to spot the item.

- It reads **as-found frames too** (`label:'before'`), which is where a safe or a filing cabinet is
  visible. It **never creates a manifest line from one** — `_jobInvRefs` filters to
  `label === 'inventory'` by design and an as-found shot is evidence, not an item.
- Output is a **notice on the desk**, never a tick. `toggleMustFound` writes `mustFound[key]` with a
  human name and a date frozen at the tick; an agent writing that would put a person's name against
  a finding they did not make.
- A notice names the shot and the room so somebody can go and look.

---

## 7 · FIREARMS AND NFA

The firearms protocol's own stated risk: *"a suppressor reads as a plain metal tube, so the risk was
never mishandling it, it was never categorised as a firearm at all."* That is a perception problem,
which is what this agent is for.

| | |
|---|---|
| Category `Firearms` | **Yes, written.** It routes the FFL appraiser and fires the intrinsic rule |
| `flagNFA` | **Never written.** Amber notice only: *"possible NFA item — confirm before anything moves"* |
| Transport | Untouched. `invTransportBlocked`'s `nfa` arm stays exactly as it is |

A test drives a suppressor-shaped frame and asserts the category lands, the notice renders and
`flagNFA` is still false.

---

## 8 · PROVENANCE, REVIEW AND RE-RUN

New manifest fields: **`namedBy`** (`'agent'` | `'desk'`), **`agentAt`**, **`agentConf`**, **`crop`**.

⚠⚠ **ALL FOUR GO ON THE `savePhotoRefs` WHITELIST OR THEY ARE DROPPED SILENTLY ON EVERY SAVE.**
This file records that exact failure three separate times (`fieldNote`/`groupId`, `serial`,
`clearedAt`). It is four words in one object literal and it is the thing that bites.

- `_invTouch` stamps `updatedAt` so the per-item merge carries the name across devices.
- **`namedBy` is NOT sticky.** A desk edit sets `namedBy:'desk'` and that must be able to overwrite.
  `INV_STICKY_FIELDS` is for records of things that happened (a signed release, a Drive id); a name
  is a judgement somebody revises, which is the same reason `fmv` is deliberately not sticky.
- **Re-run skips any row that already has an `objectName`**, agent-named or desk-named. The button
  is *Name the unnamed shots*. Re-running over a desk correction would undo human work, which is the
  worst outcome available. A per-row **Re-identify** control handles the correction case.

---

## 9 · WHAT THE SPLIT MUST RESPECT

`invSplitItemN` is called as-is. Two things ride on top:

- **⚠ The agent is never told the §20.2031-6(a) threshold.** `invLotSplitState(ref, job)` is the one
  authority on whether a lot is over the $100-an-article cap, it is gated on `maivFilingApplies(job)`
  (the 706 answer, never the documentation level), and it reads `qty` and `fmv`. Agent One sets
  `qty`; `fmv` is Agent Two's, so the readout correctly says *unvalued* until then. **Teaching the
  agent a floor would be the second copy this codebase just spent a build removing.**
- **`qty` is the agent's when it keeps something as a lot** — "30 forks" is one line with `qty:30`,
  and that is what makes the cap testable later.

---

## 10 · COST, MEASURED

Shots are compressed to 900px at 0.72 before upload, so ~800–1,450 tokens a photograph
(`tokens ≈ w × h / 750`). A large estate is ~300 photographs.

| | Opus 5 ($5 / $25 per MTok) |
|---|---|
| Input, 300 × ~1,200 | ~360k tokens = **$1.80** |
| Output incl. adaptive thinking, ~500 each | ~150k tokens = **$3.75** |
| **Per estate** | **~$6, call it $5–15 depending on effort** |

Against a $20k–$100k ticket. **Cost does not constrain this build and must not drive the model
choice.** Thinking tokens are the variable, which is the real argument for effort `medium`.

---

## 11 · WHAT THIS MOVES ONTO THE CRITICAL PATH

Both were deferred in this file *"until Agent One is scoped"*. Agent One is what makes them bite.

1. **The repaint.** `invSplitItemClick` rebuilds the whole tab through `innerHTML`: measured
   **123 / 327 / 1,420 ms** at 301 / 1,001 / 3,001 rows. Agent One is what produces 3,000 rows. The
   three in-place refreshers (`_invRefreshSummary`, `_invRefreshFlagStrip`, `_invRefreshGuardrail`)
   are the pattern to copy.
2. **The quota wall.** A fully named 3,290-line manifest measures **2.48MB** against a ~5MB origin
   quota shared with the 2MB thumbnail cache. Agent One naming everything is what gets there, and it
   arrives on the **first** big estate rather than the third. `_invReclaimSpace` means it degrades
   rather than fails, but it will fire and the badge will say so.

Neither blocks the build. Both want doing in the same stretch.

---

## 12 · TEST PLAN

- **New suite `tests/agent-inventory.test.js`**, driving the **real `.gs` function** against a
  stubbed `UrlFetchApp` — the pattern `esign-docusign.test.js` and `stripe-payments.test.js`
  already use. The request shape, the batch-and-resume, a per-shot failure, a refusal.
- **The join, driven, not grepped.** A build that computes the right answer and writes it nowhere
  contains every string a source check looks for. Hand a real response to the real writer and read
  the manifest back.
- **The forbidden-field net**, per §1, stated as a rule rather than today's key list.
- **A whitelist round-trip** on all four new fields through a real `savePhotoRefs`.
- **`tests/browser/step11.js`** — the button, the chip going to zero, a row reading agent-named and
  unreviewed, a desk correction flipping `namedBy`, and the re-run skipping it.
- Revert-verify every change individually, per the house sweep.

---

## 13 · BUILD ORDER

1. `main-sync.gs`: `agentIdentify`, Script Property, `BACKEND_VERSION` bump. **Redeploy.**
2. `testAgentIdentify()` — argument-free, editor-run, one photo, prints what came back. The
   `testEsignAuth` / `testDriveThumbnails` pattern, so an auth failure can never masquerade as a
   naming bug.
3. App side: the caller, the whitelist, the provenance fields.
4. The desk button, the notices panel, the agent-named filter.
5. Tests + browser step 11.
6. Manual §10a and playbook §e.

---

## 14 · OPEN

Nothing blocking. Three things to settle by measurement on the first real room rather than by
argument, and none of them changes the shape of the build:

- **Effort.** Sweep `low` / `medium` / `high` on one room and compare naming quality against cost.
  `medium` is the starting guess because identification is perception, not reasoning.
- **The crop box.** Captured from day one because re-running 300 photographs to add it later is the
  expensive mistake, and it costs a handful of output tokens. **Not rendered yet** — Claude's
  bounding boxes are coarse, so measure them on real frames before `_invThumbHTML` depends on one.
- **Whether an unconfirmed attribution should be marked on the printed Court Inventory** as well as
  on the desk. The app already stamps *IN PROGRESS — N of M items reviewed* on every client
  document, so the state is disclosed; the question is only whether the individual line wants it
  too. Cheap either way, and it is what makes *"we will confirm"* enforceable rather than
  aspirational.
