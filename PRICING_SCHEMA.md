# Havellin Pricing & Job-Type Schema — Unified Spec (DRAFT v2)

> Status: **design document only — no app code changed.** Redline before we build.
> **Source of truth:** Havellin's own probate/estate documents (Florida Probate
> Documentation Checklist, Estate Inventory Operational Playbook, Probate & Estate
> Cleanout PM Template, April 2026). Per the PM template: *"This template feeds the
> Client Agreement, the Job Manager App checklist, and the final invoice package —
> all three must stay in sync."* The app is built to match these documents.
> **[YOU SET]** = needs your business judgment (market price bands, payroll cost).

---

## 1. The job-type family (inheritance tree)

Six service types, two families, each built by *adding* a block of work to a spine:

```
DISPOSAL spine ── Home Cleanout (living owner; dispose of everything; no documentation)
                   └─ + Documentation + Appraisal ──→ Estate Settlement (deceased)
                         └─ + Legal / chain-of-custody ──→ Probate
                               └─ + Multiple/contested heirs ──→ Contested Probate

MOVE spine ────── Downsizing (living owner; keep-pile packed; movers haul)
                   └─ + Move Day ──────────────────────→ Downsizing + Move Management
```

Because each tier inherits the one below it, a probate **cannot** price below an
estate, which cannot price below a cleanout — correct by construction. We define the
spine once; each tier just switches on a named, priced block of work.

---

## 2. The work the app prices = your real phases

The PM template's 13 phases collapse into the **work steps** the estimator prices.
The Job Plan tab already runs Phases 0–4 for downsizing/cleanout; estate & probate
add the rest (today they have *no* playbook — this fixes that).

| Work step (estimator) | PM template phase | Downsizing | Cleanout | Estate | Probate |
|---|---|:--:|:--:|:--:|:--:|
| Triage (sort keep/sell/donate/dispose) | Ph 5 sort | ✓ | ✓ | ✓ | ✓ |
| Pack | Ph 5 | ✓ | ✓ | ✓ | ✓ |
| **Documentation** (photo + itemize $500+ for executor) | Ph 5 inventory | — | — | ✓ | ✓ |
| **Appraisal coordination** (referral, billed vendor line) | Ph 6 | opt | opt | ✓ | ✓ |
| **Disposition** (auction / consign / dealer / sell / donate / dump / distribute) | Ph 7–10 | light ✓ | ✓ | ✓ | ✓ |
| **Move day** (movers haul; TC supervises load/unload) | Ph 3 | move only | — | — | — |
| **Legal / chain-of-custody** (Letters, 60-day inventory, COC) | Ph 12 | — | — | partial | ✓ |

Notes from your documents:
- **Appraisal is never in-house** — always a referral to ISA/ASA/AAA appraisers, a
  separately billed vendor line (your existing Collections module). Havellin's hours
  here are *coordination* only.
- **Disposition is four channels** (Ph 7 sales, 8 donation, 9 disposal, 10 family
  distribution), each = TC routing/coordination + PS physical execution.
- **Nothing is disposed before PR/attorney sign-off** (flagged CATASTROPHIC in your
  checklist) — this is a workflow gate, not a pricing item, but the estate/probate
  playbook must enforce it.

---

## 3. How hours are computed (once — no stacked multipliers)

```
room content load (walkthrough)  ×  the work-step rates the job type turns on
```

- **Content load** = one volume figure per room from the walkthrough sliders
  (how much stuff), adjusted by the square-footage factor. Captures size, clutter,
  and per-room asset density in one place.
- **Work-step rates** (concierge / specialist hours per content unit) are applied
  *once*, only for the steps that job type activates. No multiplier sits on top of
  another multiplier.

### Work-step rates (concierge / specialist hrs per content unit)

| Step | Downsizing | Cleanout | Estate | Probate |
|---|---|---|---|---|
| Triage | 0.50 / 0.05 | 0.40 / 0.10 | 0.40 / 0.10 | 0.40 / 0.10 |
| Pack | 0.45 / 0.45 | 0.25 / 0.45 | 0.25 / 0.45 | 0.25 / 0.45 |
| Documentation | — | — | 0.95 / 0.05 | 1.15 / 0.05 |
| Disposition | 0.05 / 0.15 (lightest) | 0.18 / 0.60 | 0.18 / 0.60 | 0.18 / 0.60 |
| Legal / COC | — | — | — | 0.30 / 0 |
| Move day (flat) | +12 / +4 (move mgmt only) | — | — | — |

> These are calibrated to your PM-template anchors (Phase 4.1: *estate ≈ 160 hrs =
> 96 TC + 64 PS; downsizing ≈ 90 hrs*). See §7.

### Per-room content load (mid walkthrough score)

| Room | Load | Room | Load |
|---|---|---|---|
| Entryway | 1.0 | Primary Suite | 2.0 |
| Living Room | 2.6 | Primary Bath | 1.0 |
| Formal Sitting | 1.8 | Bedroom (each) | 1.5 |
| Dining | 2.0 | Secondary Bath (each) | 0.5 |
| Family/Great | 2.4 | Wine Cellar | 2.5 |
| Kitchen | 3.5 | Garage (3+ car) | 4.5 |
| Butler's Pantry | 2.0 | Storage / Closets | 2.5 |
| Laundry | 0.8 | Furnished Patio | 2.2 |
| Home Office | 1.8 | Library | 2.5 |

Square-footage factor (on content load): <2k 0.85 · 2–3k 1.0 · 3–4k 1.12 ·
4–5.5k 1.25 · 5.5–7.5k 1.40 · 7.5–10k 1.60 · 10k+ 1.80.

---

## 4. Complexity Score — classification, NOT a price multiplier

Your PM template Phase 2 already defines a 7-factor score (each 1–3, total /21).
We adopt it **as a classification and escalation tool**, and explicitly **not** as a
blanket hours multiplier — because its factors (size, asset complexity, condition)
are *already* captured in the per-room content load. Multiplying again = the stacked
double-count we are eliminating.

| Score | Band | Action (operational) |
|---|---|---|
| 7–10 | Standard | Standard TC + PS team; normal intake |
| 11–15 | Complex Estate | Senior TC; legal review; flag Anthony Sr. |
| 16–21 | High-Risk / Ultra | Anthony Sr. oversight; counsel engaged; custom addendum |

The **only** score factors that add *hours* are the ones rooms don't capture, applied
as **discrete adders** (not a multiplier):

- **Family dynamics — contested/multiple heirs** → adds Phase 10 distribution +
  coordination time (proposed: +15% concierge on disposition only). This is the
  Contested-Probate tier.
- **Timeline pressure — emergency** → drives **crew size up** (more specialists to
  compress the calendar), not more hours.
- **Property condition — hoarder/biohazard** → triggers escalation + a hazmat vendor
  line; does not silently inflate room hours.

---

## 5. Rates & the single luxury lever

- **Standard:** Transition Concierge **$150/hr**, Property Specialist **$100/hr**.
- **Premium Estate (the one lever):** rate bump to **TC $185 / PS $125**, applied to
  the *rate only* — never stacked on hours. This is the easy way to test whether
  luxury/$30M+ estates are underpriced, and the place to attach more expensive,
  better-credentialed labor for art/antique-heavy homes.
- The retired property-value multiplier is **gone** — value no longer inflates hours.

---

## 6. Pricing structure — cost vs. client price

The client sees a **fixed price and scope**, never an hourly rate (resolves the
"disclosed $/hr is unjustifiable" problem). Four layers:

| Layer | Who sees it | Example (Estate, §7) |
|---|---|---|
| 1. Estimated labor (hours × rate) | internal | $20,900 |
| 2. Contingency buffer (+20%, fixed-price risk) | internal | ~$25,080 floor |
| 3. **Client fixed price** (anchored to market) | **client** | **[YOU SET]** |
| 4. Margin (price − payroll cost) | internal | [YOU SET payroll] |

Vendor lines (appraisers, dumpster, movers, hazmat, estate-sale) pass through at
cost + your standard handling fee, itemized separately — exactly as the PM template's
invoice package (Phase 13) specifies.

---

## 7. Four worked scenarios (calibrated to your anchors)

Representative **4,500 sqft estate**, standard rates, one concierge on-site
throughout (days = concierge hrs ÷ 7; specialists crewed to fit):

| Job type | Concierge | Specialist | Total hrs | Labor @ $150/$100 | vs. your anchor |
|---|---|---|---|---|---|
| Downsizing | 54 | 35 | **89** | $11,600 | doc: ~90 ✓ |
| Home Cleanout | 45 | 62 | 107 | $12,950 | — |
| **Estate Settlement** | **96** | **65** | **161** | $20,900 | doc: 160 (96/64) ✓ |
| Probate | 123 | 65 | 187 | $24,950 | — |
| Contested Probate | ~135 | ~75 | ~210 | ~$28,000 | + heir coordination |

The estate is concierge-dominant (96 vs 65) — documentation drives it, exactly as the
PM template's 96/64 split shows. Add **Premium Estate** and the same estate re-prices
at $185/$125 without changing a single hour.

---

## 8. Estate/Probate compliance baked into the playbook

When we build the estate/probate Job Plan (today they "fall through to room-docs-only"),
it must carry these from your documents — these are scope, and they justify the hours:

- **60-day inventory deadline** from Letters of Administration (plan backward).
- **Documentation package** (10-section): chain-of-custody log, documents turned over,
  master inventory spreadsheet (Category | Description | Location | Qty | Condition |
  Est. FMV | Source | Photo ID | Disposition), items-for-appraisal tab, exempt-property
  tab (§732.402), photo folder (Pre / Room / Items / Process / Post), PM certification.
- **Chain of custody**: cash, jewelry, firearms, documents never removed without
  PR/attorney sign-off; TC present for valuables pickup.
- **Photograph $500+ items before they move**; wide shots every room pre-cleanout.
- **Disposition records**: donation receipts, auction agreements, disposal manifests.
- **Appraisal = referral only** to credentialed ISA/ASA/AAA appraisers (billed line).

---

## 9. Already in the app (confirmed in code — not open questions)

- **Margin** — the Estimate tab has an *Internal Margin Analysis* panel (not on the
  client doc): TC cost defaults to $60/hr or pulls the assigned concierge's rate from
  the contractor directory; PS cost is blended from the actual specialist slots; it
  shows total cost, gross profit, margin %, a 30%-margin walk-away floor, and
  negotiation room. **No new margin work needed.**
- **20% buffer** — `fixedPriceBuffer()` already applies 20% standard (25% probate,
  35% contested). Leaving as-is per your instruction.
- **Premium Estate rates** — already wired: $185 TC / $125 PS (toggle label was stale
  at "$200/$140 + 0.5 hr"; **fixed** to "$185/$125 + 0.3 hr/room" to match the code).
- **Contested/multiple heirs** — already a toggle ("Multiple decision-makers /
  heirs?") that adds **+20% to concierge hours** (you suggested +15%; existing is +20%
  on all TC). Use the existing toggle rather than a new disposition-only adder.
- **Disposition venues** — Collections module already offers auction / consign /
  appraise / ebay / dealer / replacements; per-item inventory dispositions **now**
  include Auction and Consign (added to `INV_DISPOSITIONS`).

## 10. Open decisions for you

- [ ] Work-step rates in §3 — they hit 160/90; comfortable with the per-step split?
- [ ] Market price bands (§6) — the input only you have:

  | Job type | Condo/small | Home | Estate | Trophy estate |
  |---|---|---|---|---|
  | Downsizing / +Move | ? | ? | ? | ? |
  | Home Cleanout | ? | ? | ? | ? |
  | Estate Settlement | ? | ? | ? | ? |
  | Probate / Contested | ? | ? | ? | ? |

- [ ] Payroll rates for any concierges not yet in the contractor directory (margin
      math already works off the directory; default TC cost is $60/hr).

(Buffer, premium rates, contested-heirs toggle, and margin display are all already
in the app — see §9.)

---

## 11. Build order (once approved)

1. **Estimator**: replace `ROOMS` + service multiplier with content-load × work-step
   model (§3); retire the property-value hours multiplier; keep Premium Estate as the
   rate lever (§5).
2. **Pricing layers**: cost → buffer → fixed price → margin internally; client sees
   fixed price + scope only (§6).
3. **Job Plan playbooks for Estate / Probate / Contested** (Phases 5, 6, 12 +
   documentation package, chain-of-custody, disposition records) — §8.
4. Keep all three outputs (Agreement, Job Plan, Invoice) in sync, per the PM template.

> Nothing built yet. Redline this, fill the price bands, and we implement in §10 order,
> testing each step against a real estimate.
