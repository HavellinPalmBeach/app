# Havellin Pricing & Job-Type Schema — LOCKED v3 (validated)

> Status: **validated and locked.** Bottom-up hours model cross-checked against the
> business's own top-down `PRICING_REF` bands (see §11). Build target for the estimator.
> **Source of truth:** Havellin's probate/estate documents + the live app's PM template.
> **[YOU SET]** = market judgment (only payroll for concierges not yet in the directory).

---

## 1. Job-type family (inheritance tree)

```
DISPOSAL spine ── Home Cleanout (living; dispose of everything; no documentation)
                   └─ + Documentation + Appraisal ──→ Estate Settlement (deceased)
                         └─ + Legal / chain-of-custody ──→ Probate
                               └─ + Multiple/contested heirs ──→ Contested Probate
MOVE spine ────── Downsizing (living; pack ALL keep; movers transport)
                   └─ + Move Day ──────────────────────→ Downsizing + Move Management
```
Each tier inherits the one below + a named, priced block of work, so the ranking is
correct by construction.

---

## 2. Size engine — square footage is the backbone

**Property type is a label, not a price driver. Square footage drives size.** Two homes
of equal sqft price the same regardless of what they're called.

1. **Baseline content load = under-air sqft × 0.0123** (units). This is the "average"
   home of that size.
2. **Volume slider scales the load** (how full *this* home is):
   1 → 0.65 · 2 → 0.82 · 3 → 1.00 (avg) · 4 → 1.22 · 5 → 1.45
3. **Complexity slider scales the *careful work*** (concierge triage/pack/documentation)
   **and feeds the classification** (appraisal/premium flags) — counted once, never a
   second multiplier:
   1 → 0.85 · 3 → 1.00 · 5 → 1.25
4. **Garage / patio / pool house / casita / storage = explicit add-ons** (outside the
   under-air sqft), ticked when present: garage ~$1.3K, others ~$0.8K each.

Net effect: same footprint swings **~0.6× (sparse/organized) to ~1.7× (packed/fragile)**
with the walkthrough.

---

## 3. Work steps = your Job Plan phases

The estimator prices the same phases the Job Plan runs. Each step has a concierge/
specialist rate **per content unit**; a job type activates only its steps.

| Work step (Job Plan phase) | Downsizing | Dsz+Move | Cleanout | Estate | Probate |
|---|---|---|---|---|---|
| Triage — sort keep/sell/donate/dispose (Ph1) | .50 / .05 | .50 / .05 | .40 / .10 | .40 / .10 | .40 / .10 |
| Pack — all keep; crew-led, concierge directs+valuables (Ph1/2) | .25 / .70 | .25 / .70 | .25 / .45 | .25 / .45 | .25 / .45 |
| Documentation — photo + itemize $500+ for executor (Ph5) | — | — | — | .95 / .05 | 1.15 / .05 |
| Disposition — auction/consign/dealer/sell/donate/dump/distribute (Ph7–10) | .05 / .15 | .05 / .15 | .18 / .60 | .18 / .60 | .18 / .60 |
| Legal / chain-of-custody (Ph12) | — | — | — | — | .30 / 0 |
| Move day — movers haul; TC supervises, **scales with size** (Ph3) | — | +(6 + L·.24) / (2 + L·.13) | — | — | — |

Where **L = total content load**. Move-day is a flat mobilization base plus a
size-scaling term, so a trophy-estate move carries proportionally more
move-management than a condo move.

- **Contested Probate** = Probate × **1.20 on concierge hours** — already the app's
  "Multiple decision-makers / heirs?" toggle (+20% TC).
- **Appraisal** is always a referral (ISA/ASA/AAA) — a billed vendor line, not Havellin
  labor beyond coordination (Collections module).
- Calibrated to your PM-template anchors: estate ≈ 160 hrs (96 TC/64 PS); downsizing ≈ 90.

---

## 4. Duration (calendar days)

```
days = max( concierge hrs ÷ 7,
            specialist hrs ÷ (crew × 7),
            logistics/mobilization floor )
```
Floors: downsizing 2 · downsizing+move 3 · cleanout/estate/probate 3 · contested 4.

- **Cleanout/disposal jobs** are gated by specialist + logistics (dumpster, donation,
  haul) — adding crew compresses them.
- **Estate/probate** are gated by the single concierge's documentation — adding crew
  does **not** shorten them (you can't parallelize one person cataloguing for the court).
- A downsizing flexes 3 days (organized) → 5 (average) → 8 (packed) with the sliders.

---

## 5. Rates & the single luxury lever

- **Standard:** Concierge **$150/hr**, Specialist **$100/hr**.
- **Premium Estate (one lever):** rate → **$185 / $125**, rate-only, hours unchanged.
  Lifts a job's price ~22%. The place to attach pricier credentialed labor for $30M+
  art-heavy homes. **No hours multiplier — ever.**
- Property value does **not** touch hours (retired).

---

## 6. Pricing structure

| Layer | Who sees it |
|---|---|
| 1. Estimated labor (hours × rate) | internal |
| 2. + 20% contingency buffer | internal (already `fixedPriceBuffer()`) |
| 3. **Client fixed price** = labor + buffer | **client** (single number + scope, no hourly) |
| 4. Margin (price − payroll cost) | internal — **already the live Margin panel** |
| + Vendor pass-throughs (appraiser, dumpster, movers, estate-sale, hazmat) | itemized, at cost + handling |
| + Exterior add-ons (garage, pool house, etc.) | added per §2 |

---

## 7. Final output grid (average scores, standard rates, pre-vendor)

**Client price** (billable + 20% buffer):

| Sqft | Downsizing | Dsz+Move | Cleanout | Estate | Probate | Contested |
|---|---|---|---|---|---|---|
| 1,200 | $3,800 | $6,100 | $4,400 | $7,000 | $8,300 | $9,500 |
| 2,500 | $7,900 | $10,900 | $9,000 | $14,300 | $17,200 | $19,700 |
| 4,500 | $14,100 | $18,600 | $16,000 | $25,900 | $30,900 | $35,400 |
| 6,000 | $18,700 | $24,300 | $21,400 | $34,400 | $41,100 | $47,000 |
| 8,000 | $24,900 | $32,100 | $28,400 | $46,000 | $54,800 | $62,900 |

**Duration (working days):**

| Sqft | Downsizing | Dsz+Move | Cleanout | Estate | Probate | Contested |
|---|---|---|---|---|---|---|
| 1,200 | 2 | 4 | 3 | 4 | 5 | 6 |
| 2,500 | 4 | 6 | 4 | 8 | 11 | 13 |
| 4,500 | 7 | 10 | 7 | 15 | 19 | 22 |
| 6,000 | 9 | 12 | 9 | 19 | 25 | 29 |
| 8,000 | 12 | 16 | 12 | 26 | 33 | 39 |

(Each cell × ~0.6 to ~1.7 with the walkthrough; Premium Estate adds ~22% to price.)

---

## 8. Estate/Probate compliance (build into the playbook)

From your documents — scope that justifies the hours:
60-day inventory deadline; 10-section documentation package (chain-of-custody log,
documents turned over, master inventory spreadsheet, items-for-appraisal tab,
exempt-property §732.402 tab, photo folder, PM certification); photograph $500+ before
moving; never dispose before PR/attorney sign-off; appraisal by referral only.

---

## 9. Already in the app (confirmed)

Margin panel (cost from contractor directory; 30% walk-away floor) · 20% buffer
(`fixedPriceBuffer`) · Premium Estate $185/$125 · "Multiple heirs" +20% TC toggle ·
auction/consign dispositions · property type simplified.

---

## 10. Validation against your own `PRICING_REF` (the BS-check)

Bottom-up hours vs. the business's independent top-down bands:

- **Downsizing, Downsizing+Move, Home Cleanout:** after crew-led packing (0.25/0.70)
  and a size-scaling move-day, **prices and days land inside the reference bands at
  every tier** — none below the floor. Two independent methods agree → validated.
- **Estate Settlement / Probate / Contested:** run **hotter** than the old reference,
  especially small sizes — the **expected** direction, because the old bands predated the
  documentation playbook and under-modeled it. **Decision (locked): trust the
  documentation-driven numbers.** They reflect the real §733.604 work.

---

## 11. Open items

- [ ] Payroll rates for concierges not yet in the contractor directory (default $60/hr).

Everything else is decided, built, or validated.

---

## 12. Build order

1. **Estimator engine** — sqft backbone + volume/complexity modulation + work-step model
   by job type (§2–3); retire property-value hours multiplier; Premium Estate = rate only.
2. **Duration** — `max(concierge, specialist-crew, logistics floor)` (§4).
3. **Pricing layers** — labor + 20% buffer → client fixed price; vendors + add-ons
   itemized; margin panel stays (§6).
4. **Estate/Probate/Contested Job Plan playbooks** — Phases 5, 6, 12 + documentation
   package, chain-of-custody, disposition records (§8).
5. Keep Agreement / Job Plan / Invoice in sync.

> Built on a branch, delivered via PR for review/testing, merged to `main` (live) only
> on your sign-off.
