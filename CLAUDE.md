# Havellin Palm Beach — App Notes

## Always on every commit
- Update the version timestamp in `havellin.html` line ~247:
  `2026.MM.DD · H:MMpm ET`
  Use the current date and approximate ET time.
  Format: `YYYY.MM.DD · H:MMpm ET`

## Git identity — set this at the start of every session
```
git config user.email noreply@anthropic.com && git config user.name Claude
```
Do NOT pass `--author` on commits — let the repo config set both author and committer.
If the stop hook fires anyway, run `git commit --amend --no-edit --reset-author` and force-push.

## Branches
- Active feature branch: `claude/zen-ride-v4x393`
- Push to `main` after every commit so GitHub Pages stays current:
  `git push origin claude/zen-ride-v4x393:main`
- Keep the feature branch in sync with main after each push.

## App
- Single-file app: `havellin.html` — all CSS, JS, HTML in one file
- Hosted on GitHub Pages from `main` branch
- No build process

## Docs / operations manual (`manual.html`)
- `manual.html` is the internal operations manual. It is **hand-maintained** and does
  NOT auto-sync with the app, so it drifts whenever the app changes.
- **Reminder:** after any significant rebuild (new/renamed/removed tabs, rate changes,
  dropdown/option changes, workflow changes), flag to the user that `manual.html` needs
  a reconciliation pass against the current app. Don't let it silently fall out of date.
- Last reconciled against the app: **2026-07-15** (estate documentation build, Phases 1–3:
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
  Still thin / deferred until the app is fully built: Win / Loss tab, and the full
  labor-job Job Plan phase playbook detail.
- **DRIFT SINCE LAST PASS (2026-07-28, working-supervisor pricing):** The hours engine no
  longer derives concierge hours from content volume. `JOB_STEPS` columns now mean
  *off-site coordination* and *hands-on work pool* — NOT TC hours and PS hours. The
  concierge is on site for every crew hour and works alongside the crew, so the pool is
  cleared by `(n + α)` pairs of hands: `H = W / (n + α)`, billed PS = `n × H`, billed TC =
  `H + off-site`. α (concierge production rate, default 50%) is a new Settings knob.
  Difficult access now lifts the work pool only; multiple-heirs lifts coordination only.
  The 2-concierge rule is no longer premium-gated — it fires on a load check
  (`TC_DAY_CAP`, 10 hrs/day, with coordination spread over `COORD_SPREAD_DAYS`). Duration
  is PS-gated; off-site coordination no longer stretches the calendar. The margin panel
  now costs the concierge at engaged hours, not billed hours. Estimate summary rows and
  the client-estimate concierge line were rewritten. **Needs a manual reconciliation pass
  — §11 rates/hours, the crew-sizing and timeline sections, and Settings.**
- **DRIFT SINCE LAST PASS (2026-07-29, job team sign-off):** Staffing is now an explicit
  step gating hours. Workflow: estimate → agreement out for signature → **while waiting on
  signature + deposit, staff the job** on the Job Plan (confirm availability, name each
  person) → **Save & Confirm Job Team** → only then does *Save Hours Entry* become
  available. Crew carries `confirmed` / `confirmedBy` / `confirmedAt`; confirming locks
  every named member, and empty slots stay open for a mid-job addition. **Revise team**
  reopens it, but anyone who has already logged hours stays locked — you can add to a team
  mid-job, never retroactively remove someone who worked. Unfilled planned slots are
  highlighted "needs a name" while staffing. **The concierge is no longer required at client
  intake** — intake often runs a fortnight ahead and nobody knows who is free that far out,
  so the TC is staffed on the Job Plan with everyone else (the intake field remains, marked
  optional). Legacy jobs that already have logged hours migrate to confirmed so a live job
  isn't blocked mid-flight. **Needs a manual pass — the Job Plan / Log Hours workflow and
  the intake required-field list.**
  *Open question:* should the Job Plan tab itself be gated on the agreement having been sent?
  Discussed but NOT built — flagged rather than assumed.
- **DRIFT SINCE LAST PASS (2026-07-29, labour cost rates + crew integrity):** Cost rates
  (what we PAY) are now a named `COST_RATES` block and four **Settings** knobs, separate from
  the client billing rates: founder TC $100, contractor TC $60, contractor PS Standard $30,
  Senior $35. Anthony Jr's directory rate corrected $75 → $60. The old hardcoded $25/$30
  placeholder PS rates and the silent $60 TC fallback are gone — an unresolvable concierge
  now costs at the **founder** rate (conservative, so the walk-away floor is never
  understated) and the margin panel says out loud that the number is an assumption. New
  "Contractor — TC" option on both concierge rows. The Log Hours form no longer shows a flat
  six PS slots: it renders the **approved estimate's** crew size (widened to cover anyone
  already assigned), with an explicit "+ Add a specialist beyond plan" and a *beyond plan*
  tag on those rows. A named person can no longer hold two roles on one date — taken names
  are omitted from the other selects, `saveLogEntry` refuses a duplicate outright, and
  `seedCrewFromEstimate` de-dupes real names while still allowing repeated placeholders
  ("Contractor TBD" / "Contractor — TC" legitimately repeat). **Needs a manual pass — §11
  rates, the crew-sizing section, Log Hours, and Settings.**
- **DRIFT SINCE LAST PASS (2026-07-28, mobile/field build):** Vendors, Referral Partners
  and Contractors each gained a **search box** and a **Quick edit / Full edit** split
  (Quick = contact details only; Full = the existing form). Vendor and partner cards and
  the Contractors tab gained tap-to-call/text/email. Job Plan vendor sourcing shows the
  assigned vendor's phone as a tap-to-dial link. Worth a reconciliation pass — the manual
  still describes a single "Edit" button on those tabs and no search.

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
- **A vendor on several rows is NOT a duplicate.** The directory carries one category
  per row, so two rows is how a vendor that does two things is expressed — Prestige
  Estate Services appraises antiques *and* art, Gander & White does storage *and*
  specialty packing. Rows sharing a number and a name merge into one contact carrying
  every category as a tag, with the role naming all of them. An earlier version kept
  only the first row's category and called the rest a duplicate to clean up; that was
  wrong and threw away half of what those vendors do.
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
