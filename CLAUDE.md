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
- **DRIFT SINCE LAST PASS (2026-07-28, mobile/field build):** Vendors, Referral Partners
  and Contractors each gained a **search box** and a **Quick edit / Full edit** split
  (Quick = contact details only; Full = the existing form). Vendor and partner cards and
  the Contractors tab gained tap-to-call/text/email. Job Plan vendor sourcing shows the
  assigned vendor's phone as a tap-to-dial link. Worth a reconciliation pass — the manual
  still describes a single "Edit" button on those tabs and no search.

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
