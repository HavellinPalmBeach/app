# Inventory tab → the concierge's review workspace

Decided with Anthony 2026-09-01. This is the build spec; the reasoning that survives the
build moves into `CLAUDE.md`.

## The workflow this exists to serve

The Job Plan is the **field** surface: room by room, wide shot, then item by item —
object name, category, an optional disposition chip, photograph. Fast, one-handed, on a
phone, standing in the room.

The Inventory tab is the **desk** surface: that evening, at home or in the office, the
Transition Concierge opens the day's captures and *works* them — puts values on things
(read off one of the valuation apps, which return recent auction comps), moves items
between disposition channels, flags what a specialist has to see, ticks each line off as
reviewed, and produces the client's document.

It is deliberately **not** a field tab (`data-field` is absent) and that stays true.

## What was wrong with it

- It rendered a **29-column spreadsheet** and, because no one can read 29 columns, a row
  of buttons that swapped which slice was on screen (`INV_VIEWS` / `_invView`). Anthony,
  on those buttons: *"I don't really understand what happens at the bottom with all these
  squares or rectangles you tick."* A control that exists only to work around the width of
  the thing below it is a symptom, not a feature.
- **No grouping.** Items came out in capture order, so the tab could not answer either
  question the concierge actually has: *what still has no decision?* and *what is going to
  the auction house?*
- **No sense of a working session.** Nothing said "these forty came in today".
- **No progress and no completion.** Nothing recorded that a line had been looked at, so
  there was no way to know when the day's review was finished.
- **No client deliverable.** Three print documents exist (Court Inventory, Disposition
  Ledger, Appraisal Worklist), all court/vendor-facing, none of them the categorized
  photographic asset schedule the website promises. **No CSV at all.**

## What the website already promises (and the app must produce)

From havellinpalmbeach.com, the deliverables page. This is a commitment, not a wishlist —
each line below is a requirement on this build.

**02 · After Inventory** — *"A categorized asset schedule with description, location,
quantity, condition, date-of-death fair market value, and the valuation source stated. The
full photography set, reference-numbered and linked to the corresponding line. An appraisal
flag list showing which categories are flagged for formal valuation, which appraiser is
engaged for each, and expected turnaround. Homestead, exempt, and non-probate property
identified and carved out."*

→ Defines the Estate Inventory Report field set exactly. Two gaps it exposes:
  - **Expected turnaround does not exist as a field.** The appraiser roster records name,
    firm, credential, independence, effective date, report date — nothing about when the
    report is due back. Add `dueDate` to the appraiser record and print it on the flag list.
  - Homestead / exempt / non-probate carve-out is already modelled (`assetTrack` carries
    Probate · Trust · Non-probate · Homestead · Exempt, plus `flagExempt` for §732.402) but
    is not *carved out* in any client document. The report must separate it.

**03 · During Disposition** — *"Written approval requests, itemized item by item, before
anything of value leaves the property. Verbal approval is never accepted."*

→ **This document does not exist and it is the gate the whole engagement turns on.** The
app records `authBy` + `approvalDate` per item — the *result* of an approval — with nothing
that produces the *request*. A Release Approval Request is therefore part of this build:
select items, print/send an itemised request, record the signature back onto every item in
one action. Verbal approval is refused by the app, not just by the brochure.

## Locked decisions (Anthony, survey 2026-09-01)

| | Decision |
|---|---|
| Grouping | **Disposition → Room.** `Not yet decided` is a real bucket and sorts **first** — it is the worklist. |
| Editing | **Row + item panel.** Value and disposition edit on the row; the row expands to a panel carrying everything else. The 29-column table and the column-group buttons are **deleted**. |
| Review | Per-item **Reviewed** tick with a progress read-out. **Nothing is gated and nothing locks** — *"we may want to show in-progress work to clients during an engagement"*. An incomplete review instead **stamps every client document IN PROGRESS** with the count. |
| Client PDF | **Estate Inventory Report** — photo thumbnail per item, grouped by disposition, plus CSV of every column. |

The no-lock decision is load-bearing: an approval checkpoint that blocks the document is
exactly what stops a client being shown honest work-in-progress, and this business shows
work in progress on purpose. **Do not add a gate here later.** The honesty comes from the
stamp, not from withholding the document.

## Build

### 1. Data model (three new fields, one new sub-record)

On the inventory ref:
- `reviewed` (bool) · `reviewedAt` (ms) · `reviewedBy` (initials from the active concierge)
- `valNote` — free text beside the value: which app, which comps, what the range was.
  The valuation apps are external; this is where their answer is written down, and a value
  with no stated source is what the website promises never to hand over.

On the appraiser record: `dueDate` — expected turnaround.

Every one of these must be added to the `savePhotoRefs` whitelist or it is silently dropped
on save (there is a test walking every editable `INVENTORY_COLUMNS` key through a real
save/reload — extend it).

`reviewed` / `reviewedAt` / `reviewedBy` are **internal** and stay out of `INVENTORY_COLUMNS`,
so they never reach the client's Drive workbook. `valNote` **is** a column — the source of a
value belongs in the record. Adding a column to `INVENTORY_COLUMNS` is safe (the Apps Script
resolves by header name), but it widens the sheet, so re-check the letter helper.

### 2. Layout, top to bottom

1. **Working header** — estate name, job id, `N of M reviewed` progress bar, and the
   actions: `Estate Inventory PDF` · `CSV` · `Approval Request` · `More ▾` (Court Inventory,
   Disposition Ledger, Appraisal Worklist, Snapshot, Share w/ Counsel, Revoke) ·
   `+ Add line item`.
2. **Worklist strip** — clickable counts that are also filters: *Not yet decided · No value ·
   Needs appraiser · Firearms held · Disputed / Hold*. These are the reasons to open the tab.
3. **Filters** — `Today · Last 7 days · All` (defaults to Today when anything was captured
   today, else All), room, and a search box.
4. **Groups** — one section per disposition in fixed order: **Not yet decided**, Keep,
   Auction, Consign, Sell, Donate, Junk, Hold. Section header carries count, FMV subtotal,
   reviewed progress, and collapses. Inside, rooms as sub-headings in walkthrough order.
5. **Item row** — thumbnail · item # · object name · category · inline FMV · inline
   disposition · Reviewed tick · expand chevron.
6. **Item panel** — the photo, and every remaining field grouped by the `group` metadata
   already on `INVENTORY_COLUMNS` (`val` / `disp` / `flags`). This is why the column
   metadata survives the table's deletion: it is now the panel's section map, and the
   existing test that no visible column lacks a group keeps earning its keep.
7. **Bulk bar** — appears when rows are selected: set disposition, set room, set valuation
   source, mark reviewed, request approval for the selection.
8. Existing cards below, unchanged in behaviour: import panel, appraiser roster, appraisal
   guardrail, removed items, snapshots. **Summary card moves below and starts collapsed** —
   it is a read-out, not a workspace, and it was occupying the top of the tab.

### 3. Thumbnails — served by the Apps Script, not by the capturing device

**Corrected 2026-09-01 after Anthony pushed back on the first draft, which claimed a
thumbnail could only exist on the device that took the shot. That was wrong.**

Three facts, verified in the source:

1. **The upload already returns a Drive file id and the app throws it away.**
   `uploadFileToDrive` in `main-sync.gs` returns `{ ok, fileUrl, fileId }`; the client's
   `uploadToDrive` callback is `onDone(d.ok, d.fileUrl)`. So no inventory row holds a file
   id today. The id is embedded in the URL that *was* stored, so the existing backlog is
   recoverable by regex — no photo is stranded.
2. **A direct `<img src="https://drive.google.com/thumbnail?id=…">` is the WRONG path and
   must not be used.** `shareFolder` grants access with `folder.addViewer(email)` — named
   viewers only, never "anyone with the link" — so Drive requires an authenticated session.
   The app is served from GitHub Pages, making that a cross-site request, and Safari blocks
   third-party cookies by default. It would render on desktop Chrome and fail on the iPad,
   which is worse than failing everywhere: the failure would look like missing photos on
   exactly the device the work is done on.
3. **The Apps Script runs as the Havellin Google account and already has full Drive access.**
   That is the way in, and it needs no change to how anything is shared.

So: new `getThumbnails` action on `main-sync.gs`, taking a list of file ids and returning
base64 thumbnails (`DriveApp.getFileById(id).getThumbnail()`, falling back to the file blob
when Drive has not generated one). Every device sees every photo, signed in or not.

⚠️ **This requires an Apps Script redeploy.** `main-sync.gs` changes.

Client side:
- `uploadToDrive` keeps `fileId`; `_doPhotoUpload` stores `ref.driveFileId`; the field joins
  the `savePhotoRefs` whitelist or it is dropped on the next save.
- `_invFileId(ref)` reads `driveFileId`, falling back to a regex over `driveFileUrl`
  (`/file/d/<id>/`) so photos taken before this build resolve too.
- Fetched thumbnails are cached in `hav_media_thumb_<jobId>` keyed by file id — its **own**
  localStorage key, separate from the manifest, for the same reason `_photoRetryData` is
  separate: image bytes must never be able to crowd the manifest write out of the quota.
  A quota failure drops the cache, never the record.
- The capture path also writes a 160px thumbnail straight into that cache, so an item shot
  moments ago renders instantly instead of waiting on a round trip. That is an
  optimisation, not the source of truth.
- One batched fetch per job on tab open for whatever the cache is missing, never one
  request per photo.
- A thumbnail that cannot be resolved renders a category glyph — never an `<img>` with an
  empty `src`, and never a broken-image icon in front of a client.

### 4. Documents

- **Estate Inventory Report** (new, `printEstateInventoryReport`) — the website's §02 field
  set: description · location · quantity · condition · date-of-death FMV · valuation source,
  a thumbnail and its reference number per line, grouped by disposition. Homestead, exempt
  and non-probate are carved out into their own section. Appraisal flag list at the end
  naming the appraiser engaged and the expected turnaround. Stamped **IN PROGRESS** with the
  reviewed count when the review is incomplete.
- **Release Approval Request** (new, `printApprovalRequest`) — itemised, one line per item
  with its photo reference and value, a signature block for the representative, and the
  standing sentence that verbal approval is not accepted. Generated for the current
  selection or for a whole disposition group.
- **CSV** (new, `exportInventoryCSV`) — every `INVENTORY_COLUMNS` column, built off the same
  `buildInventoryPayload` rows the workbook uses so the two can never disagree. Blob
  download, RFC-4180 quoting.
- The three existing print documents are unchanged and move under `More`.

### 5. Deletions

`INV_VIEWS`, `_invView`, `setInvView`, `_invVisibleCols`, the wide-table branch of
`renderInventoryTab`, `_invCtrlMinW`'s table-width assumptions. `INVENTORY_COLUMNS` stays.

## Tests to add

- Grouping: order of buckets, `Not yet decided` first, empty buckets hidden, room ordering
  inside a bucket.
- `reviewed` round-trips through `savePhotoRefs`; `valNote` reaches the workbook payload.
- Every client document carries the IN PROGRESS stamp when `reviewed` is incomplete and
  drops it when complete — both directions.
- CSV: quoting a value containing a comma, a quote and a newline; column count equals
  `INVENTORY_COLUMNS.length + 1`.
- The approval request refuses to render with nothing selected, and names every selected
  item.
- Thumbnails: a missing thumbnail renders a glyph, not an `<img>` with an empty `src`.
- The column-group switcher is gone (no `setInvView` survives).
